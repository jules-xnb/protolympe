import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db/index.js';
import {
  accounts,
  refreshTokens,
  passwordResetTokens,
  clientSsoConfigs,
  userClientMemberships,
  integratorClientAssignments,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { signAccessToken } from '../lib/jwt.js';
import { validatePassword } from '../lib/password-policy.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

const router = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createRefreshToken(userId: string): Promise<string> {
  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

  return token;
}

// ---------------------------------------------------------------------------
// POST /signin
// ---------------------------------------------------------------------------

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/signin', rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Email et mot de passe requis' }, 400);
  }

  const { email, password } = parsed.data;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Identifiants invalides' }, 401);
  }

  // Check account lockout
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const secondsRemaining = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 1000);
    return c.json(
      { error: 'Compte temporairement verrouillé', retry_after: secondsRemaining },
      423
    );
  }

  if (!account.passwordHash) {
    return c.json({ error: 'Connexion par mot de passe non disponible pour ce compte' }, 401);
  }

  const passwordValid = await bcrypt.compare(password, account.passwordHash);
  if (!passwordValid) {
    const newFailedAttempts = account.failedLoginAttempts + 1;
    const lockedUntil =
      newFailedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await db
      .update(accounts)
      .set({ failedLoginAttempts: newFailedAttempts, lockedUntil, updatedAt: new Date() })
      .where(eq(accounts.id, account.id));

    return c.json({ error: 'Identifiants invalides' }, 401);
  }

  // Successful login: reset lockout counters
  await db
    .update(accounts)
    .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(accounts.id, account.id));

  const accessToken = await signAccessToken({
    sub: account.id,
    email: account.email,
    persona: account.persona,
  });

  const refreshToken = await createRefreshToken(account.id);

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
  });
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

router.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');
  if (!refreshToken) return c.json({ error: 'Refresh token manquant' }, 401);

  const tokenHash = hashToken(refreshToken);

  // Atomically delete the old token and capture it — prevents race conditions
  const result = await db.transaction(async (tx) => {
    const [stored] = await tx
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .returning();

    if (!stored) return null;
    if (new Date() > stored.expiresAt) return null;

    const newToken = generateRefreshToken();
    const newTokenHash = hashToken(newToken);

    await tx.insert(refreshTokens).values({
      userId: stored.userId,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { userId: stored.userId, newRefreshToken: newToken };
  });

  if (!result) return c.json({ error: 'Token invalide ou expiré' }, 401);

  // Fetch account
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, result.userId))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Compte introuvable' }, 401);
  }

  const accessToken = await signAccessToken({
    sub: account.id,
    email: account.email,
    persona: account.persona,
  });

  setCookie(c, 'refresh_token', result.newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
  });
});

// ---------------------------------------------------------------------------
// POST /signout  (authenticated)
// ---------------------------------------------------------------------------

router.post('/signout', authMiddleware, async (c) => {
  const refreshToken = getCookie(c, 'refresh_token');

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
  }

  deleteCookie(c, 'refresh_token', { path: '/api/auth' });

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// PATCH /password  (authenticated)
// ---------------------------------------------------------------------------

const changePasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(1),
});

router.patch('/password', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'old_password et new_password requis' }, 400);
  }

  const { old_password, new_password } = parsed.data;

  // Validate password policy
  const policy = validatePassword(new_password);
  if (!policy.valid) {
    return c.json({ error: 'Mot de passe invalide', details: policy.errors }, 400);
  }

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, user.sub))
    .limit(1);

  if (!account || !account.passwordHash) {
    return c.json({ error: 'Compte introuvable ou connexion par mot de passe non disponible' }, 400);
  }

  const passwordValid = await bcrypt.compare(old_password, account.passwordHash);
  if (!passwordValid) {
    return c.json({ error: 'Ancien mot de passe incorrect' }, 401);
  }

  const newHash = await bcrypt.hash(new_password, 12);

  await db
    .update(accounts)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(accounts.id, user.sub));

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /forgot-password
// ---------------------------------------------------------------------------

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', rateLimit(3, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Email valide requis' }, 400);
  }

  const { email } = parsed.data;

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);

  if (!account) {
    // Don't leak whether the email exists
    return c.json({ success: true });
  }

  const token = generateRefreshToken(); // reuse same random bytes helper
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: account.id,
    tokenHash,
    expiresAt,
  });

  // In production: send email with token
  if (process.env.NODE_ENV !== 'production') console.log('DEV ONLY - Reset token:', token);
  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /reset-password
// ---------------------------------------------------------------------------

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(1),
});

router.post('/reset-password', rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'token et new_password requis' }, 400);
  }

  const { token, new_password } = parsed.data;

  // Validate password policy
  const policy = validatePassword(new_password);
  if (!policy.valid) {
    return c.json({ error: 'Mot de passe invalide', details: policy.errors }, 400);
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [stored] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored) {
    return c.json({ error: 'Token invalide' }, 400);
  }

  if (stored.expiresAt < now) {
    return c.json({ error: 'Token expiré' }, 400);
  }

  if (stored.usedAt !== null) {
    return c.json({ error: 'Token déjà utilisé' }, 400);
  }

  const newHash = await bcrypt.hash(new_password, 12);

  await db
    .update(accounts)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(accounts.id, stored.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, stored.id));

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /me  (authenticated)
// ---------------------------------------------------------------------------

router.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  const [account] = await db
    .select({
      id: accounts.id,
      email: accounts.email,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      persona: accounts.persona,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.id, user.sub))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Compte introuvable' }, 404);
  }

  let clientIds: string[] = [];

  if (account.persona === 'client_user') {
    const memberships = await db
      .select({ clientId: userClientMemberships.clientId })
      .from(userClientMemberships)
      .where(
        and(
          eq(userClientMemberships.userId, account.id),
          eq(userClientMemberships.isActive, true)
        )
      );
    clientIds = memberships.map((m) => m.clientId);
  } else if (
    account.persona === 'integrator_delta' ||
    account.persona === 'integrator_external'
  ) {
    const assignments = await db
      .select({ clientId: integratorClientAssignments.clientId })
      .from(integratorClientAssignments)
      .where(eq(integratorClientAssignments.userId, account.id));
    clientIds = assignments.map((a) => a.clientId);
  }

  return c.json({
    id: account.id,
    email: account.email,
    first_name: account.firstName,
    last_name: account.lastName,
    persona: account.persona,
    created_at: account.createdAt,
    client_ids: clientIds,
  });
});

// ---------------------------------------------------------------------------
// GET /sso/:clientId/check  (public)
// ---------------------------------------------------------------------------

router.get('/sso/:clientId/check', async (c) => {
  const clientId = c.req.param('clientId');

  const [config] = await db
    .select({
      provider: clientSsoConfigs.provider,
      isEnabled: clientSsoConfigs.isEnabled,
    })
    .from(clientSsoConfigs)
    .where(
      and(
        eq(clientSsoConfigs.clientId, clientId),
        eq(clientSsoConfigs.isEnabled, true)
      )
    )
    .limit(1);

  if (!config) {
    return c.json({ enabled: false, provider: null });
  }

  return c.json({ enabled: true, provider: config.provider });
});

export default router;
