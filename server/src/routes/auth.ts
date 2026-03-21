import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db/index.js';
import {
  accounts,
  refreshTokens,
  passwordResetTokens,
  clients,
  clientSsoConfigs,
  userClientMemberships,
  integratorClientAssignments,
  clientProfileUsers,
  clientProfiles,
} from '../db/schema.js';
import { eq, and, isNull, or } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { signAccessToken, signTempToken, verifyTempToken } from '../lib/jwt.js';
import type { JwtPayload } from '../lib/jwt.js';
import { validatePassword } from '../lib/password-policy.js';
import { decrypt, encrypt } from '../lib/encryption.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import {
  discovery,
  randomState,
  randomNonce,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  fetchUserInfo,
  skipSubjectCheck,
  ClientSecretPost,
} from 'openid-client';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * For client_user: if they have exactly 1 profile, return its ID.
 * If 0 or 2+, return undefined (they'll need to select manually).
 */
async function getAutoProfileId(userId: string): Promise<string | undefined> {
  const profiles = await db
    .select({ profileId: clientProfileUsers.profileId })
    .from(clientProfileUsers)
    .innerJoin(clientProfiles, eq(clientProfileUsers.profileId, clientProfiles.id))
    .where(and(
      eq(clientProfileUsers.userId, userId),
      isNull(clientProfileUsers.deletedAt),
      eq(clientProfiles.isArchived, false)
    ));

  return profiles.length === 1 ? profiles[0].profileId : undefined;
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
    .select({
      id: accounts.id,
      email: accounts.email,
      persona: accounts.persona,
      passwordHash: accounts.passwordHash,
      failedLoginAttempts: accounts.failedLoginAttempts,
      lockedUntil: accounts.lockedUntil,
      totpEnabled: accounts.totpEnabled,
    })
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);

  const reqIp = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const reqUserAgent = c.req.header('user-agent');

  if (!account) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'auth_login_failure',
      email: parsed.data.email,
      reason: 'account_not_found',
      ip: reqIp,
      user_agent: reqUserAgent,
    }));
    return c.json({ error: 'Identifiants invalides' }, 401);
  }

  // Check account lockout
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    const secondsRemaining = Math.ceil((account.lockedUntil.getTime() - Date.now()) / 1000);
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'auth_login_failure',
      email: parsed.data.email,
      user_id: account.id,
      reason: 'account_locked',
      ip: reqIp,
      user_agent: reqUserAgent,
    }));
    return c.json(
      { error: 'Compte temporairement verrouillé', retry_after: secondsRemaining },
      423
    );
  }

  if (!account.passwordHash) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'auth_login_failure',
      email: parsed.data.email,
      user_id: account.id,
      reason: 'no_password_sso_only',
      ip: reqIp,
      user_agent: reqUserAgent,
    }));
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'auth_login_failure',
      email: parsed.data.email,
      user_id: account.id,
      reason: 'invalid_credentials',
      ip: reqIp,
      user_agent: reqUserAgent,
    }));
    return c.json({ error: 'Identifiants invalides' }, 401);
  }

  // Successful login: reset lockout counters
  await db
    .update(accounts)
    .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(accounts.id, account.id));

  // 2FA check for admin/integrators
  const requires2fa = account.persona === 'admin_delta' ||
    account.persona === 'integrator_delta' ||
    account.persona === 'integrator_external';

  if (requires2fa) {
    const tempToken = await signTempToken({
      sub: account.id,
      email: account.email,
      persona: account.persona,
    });

    if (!account.totpEnabled) {
      return c.json({
        requires_2fa_setup: true,
        temp_token: tempToken,
      });
    }

    return c.json({
      requires_2fa: true,
      temp_token: tempToken,
    });
  }

  // No 2FA needed (client_user) — issue tokens directly
  // Auto-select profile if user has exactly 1
  const autoProfileId = account.persona === 'client_user'
    ? await getAutoProfileId(account.id)
    : undefined;

  const accessToken = await signAccessToken({
    sub: account.id,
    email: account.email,
    persona: account.persona,
    activeProfileId: autoProfileId,
  });

  const refreshToken = await createRefreshToken(account.id);

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'auth_login_success',
    email: parsed.data.email,
    user_id: account.id,
    ip: reqIp,
    user_agent: reqUserAgent,
  }));

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
    .select({
      id: accounts.id,
      email: accounts.email,
      persona: accounts.persona,
    })
    .from(accounts)
    .where(eq(accounts.id, result.userId))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Compte introuvable' }, 401);
  }

  // Preserve profile: auto-select if only 1
  const refreshAutoProfileId = account.persona === 'client_user'
    ? await getAutoProfileId(account.id)
    : undefined;

  const accessToken = await signAccessToken({
    sub: account.id,
    email: account.email,
    persona: account.persona,
    activeProfileId: refreshAutoProfileId,
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
    .select({
      id: accounts.id,
      passwordHash: accounts.passwordHash,
    })
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

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.sub));

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
    .select({ id: accounts.id })
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
  // NOTE: Token is NOT logged — even in dev mode — to prevent sensitive data leakage
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
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
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

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, stored.userId));

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
      .where(and(eq(integratorClientAssignments.userId, account.id), isNull(integratorClientAssignments.deletedAt)));
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
// GET /me/profiles  (authenticated, client_user)
// ---------------------------------------------------------------------------

router.get('/me/profiles', authMiddleware, async (c) => {
  const user = c.get('user');

  const results = await db
    .select({
      id: clientProfiles.id,
      clientId: clientProfiles.clientId,
      name: clientProfiles.name,
      description: clientProfiles.description,
      isArchived: clientProfiles.isArchived,
    })
    .from(clientProfileUsers)
    .innerJoin(clientProfiles, eq(clientProfileUsers.profileId, clientProfiles.id))
    .where(
      and(
        eq(clientProfileUsers.userId, user.sub),
        eq(clientProfiles.isArchived, false),
        isNull(clientProfileUsers.deletedAt)
      )
    )
    .orderBy(clientProfiles.name);

  return c.json(results.map((r) => ({
    id: r.id,
    client_id: r.clientId,
    name: r.name,
    description: r.description,
  })));
});

// ---------------------------------------------------------------------------
// POST /select-profile  (authenticated, client_user)
// ---------------------------------------------------------------------------

const selectProfileSchema = z.object({
  profile_id: z.string().uuid(),
});

router.post('/select-profile', authMiddleware, async (c) => {
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const body = await c.req.json();
  const parsed = selectProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const profileId = parsed.data.profile_id;

  // Verify the profile belongs to the user and is not archived
  const [assignment] = await db
    .select({ profileId: clientProfileUsers.profileId })
    .from(clientProfileUsers)
    .innerJoin(clientProfiles, eq(clientProfileUsers.profileId, clientProfiles.id))
    .where(
      and(
        eq(clientProfileUsers.userId, user.sub),
        eq(clientProfileUsers.profileId, profileId),
        eq(clientProfiles.isArchived, false),
        isNull(clientProfileUsers.deletedAt)
      )
    )
    .limit(1);

  if (!assignment) {
    return c.json({ error: 'Profil introuvable ou non attribué' }, 404);
  }

  // Issue a new access token with the active profile
  const accessToken = await signAccessToken({
    sub: user.sub,
    email: user.email,
    persona: user.persona,
    activeProfileId: profileId,
  });

  return c.json({ access_token: accessToken, token_type: 'Bearer' });
});

// ---------------------------------------------------------------------------
// GET /sso/callback  — registered BEFORE /sso/:clientId to avoid param capture
// ---------------------------------------------------------------------------

router.get('/sso/callback', async (c) => {
  // 1. Get state from cookie
  const ssoStateCookie = getCookie(c, 'sso_state');
  if (!ssoStateCookie) return c.json({ error: 'Session SSO expirée' }, 400);
  const { state: savedState, nonce: savedNonce, clientId } = JSON.parse(ssoStateCookie);

  // 2. Fetch SSO config
  const [ssoConfig] = await db
    .select({
      clientSecret: clientSsoConfigs.clientSecret,
      issuerUrl: clientSsoConfigs.issuerUrl,
      clientIdOidc: clientSsoConfigs.clientIdOidc,
    })
    .from(clientSsoConfigs)
    .where(and(eq(clientSsoConfigs.clientId, clientId), eq(clientSsoConfigs.isEnabled, true)));
  if (!ssoConfig) return c.json({ error: 'SSO non configuré' }, 400);

  // 3. Create OIDC configuration
  const clientSecret = decrypt(ssoConfig.clientSecret);
  const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/auth/sso/callback`;
  const config = await discovery(
    new URL(ssoConfig.issuerUrl),
    ssoConfig.clientIdOidc,
    { redirect_uris: [redirectUri] },
    ClientSecretPost(clientSecret),
  );

  // 4. Exchange code for tokens
  const currentUrl = new URL(c.req.url);
  const tokenSet = await authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: undefined,
    expectedState: savedState,
    expectedNonce: savedNonce,
  });

  // 5. Get user info
  const sub = tokenSet.claims()?.sub;
  if (!sub) return c.json({ error: 'Subject manquant dans le token' }, 400);
  const userinfo = await fetchUserInfo(config, tokenSet.access_token!, skipSubjectCheck);
  const email = userinfo.email;
  if (!email) return c.json({ error: 'Email non fourni par le provider SSO' }, 400);

  // 6. Find or create account
  let [account] = await db
    .select({ id: accounts.id, email: accounts.email, persona: accounts.persona })
    .from(accounts)
    .where(eq(accounts.email, email.toLowerCase()));

  if (!account) {
    [account] = await db
      .insert(accounts)
      .values({
        email: email.toLowerCase(),
        firstName: (userinfo.given_name as string | undefined) ?? null,
        lastName: (userinfo.family_name as string | undefined) ?? null,
        persona: 'client_user',
      })
      .returning({ id: accounts.id, email: accounts.email, persona: accounts.persona });
  }

  // 7. Ensure membership
  const [membership] = await db
    .select({ id: userClientMemberships.id })
    .from(userClientMemberships)
    .where(
      and(
        eq(userClientMemberships.userId, account.id),
        eq(userClientMemberships.clientId, clientId),
      ),
    );

  if (!membership) {
    await db.insert(userClientMemberships).values({
      userId: account.id,
      clientId,
      isActive: true,
      activatedAt: new Date(),
    });
  }

  // 8. Generate tokens — auto-select profile if only 1
  const ssoAutoProfileId = await getAutoProfileId(account.id);
  const accessToken = await signAccessToken({
    sub: account.id,
    email: account.email,
    persona: account.persona,
    activeProfileId: ssoAutoProfileId,
  });
  const refreshTokenValue = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
  await db.insert(refreshTokens).values({
    userId: account.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // 9. Set refresh token cookie and clear SSO state cookie
  setCookie(c, 'refresh_token', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
  deleteCookie(c, 'sso_state', { path: '/api/auth' });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'auth_sso_login_success',
    email: account.email,
    user_id: account.id,
    client_id: clientId,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    user_agent: c.req.header('user-agent'),
  }));

  // 10. Redirect to frontend with access token
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return c.redirect(`${frontendUrl}/auth/sso/callback?access_token=${accessToken}`);
});

// ---------------------------------------------------------------------------
// GET /sso/:clientId  (redirect to OIDC provider)
// ---------------------------------------------------------------------------

router.get('/sso/:clientId', async (c) => {
  const clientId = c.req.param('clientId');

  // 1. Fetch client SSO config
  const [ssoConfig] = await db
    .select({
      clientSecret: clientSsoConfigs.clientSecret,
      issuerUrl: clientSsoConfigs.issuerUrl,
      clientIdOidc: clientSsoConfigs.clientIdOidc,
    })
    .from(clientSsoConfigs)
    .where(and(eq(clientSsoConfigs.clientId, clientId), eq(clientSsoConfigs.isEnabled, true)));
  if (!ssoConfig) return c.json({ error: 'SSO non configuré pour ce client' }, 404);

  // 2. Discover the OIDC provider and create configuration
  const clientSecret = decrypt(ssoConfig.clientSecret);
  const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/auth/sso/callback`;
  const configWithSecret = await discovery(
    new URL(ssoConfig.issuerUrl),
    ssoConfig.clientIdOidc,
    { redirect_uris: [redirectUri] },
    ClientSecretPost(clientSecret),
  );

  // 3. Generate state and nonce
  const state = randomState();
  const nonce = randomNonce();

  // 4. Store state + nonce + clientId in a cookie
  setCookie(c, 'sso_state', JSON.stringify({ state, nonce, clientId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/api/auth',
    maxAge: 600, // 10 minutes
  });

  // 5. Redirect to authorization URL
  const authUrl = buildAuthorizationUrl(configWithSecret, {
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
    nonce,
  });

  return c.redirect(authUrl.toString());
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

// ---------------------------------------------------------------------------
// POST /2fa/setup  (temp_token required)
// ---------------------------------------------------------------------------

router.post('/2fa/setup', rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const tempToken = body?.temp_token;
  if (!tempToken) return c.json({ error: 'temp_token requis' }, 400);

  let user: JwtPayload;
  try {
    user = await verifyTempToken(tempToken);
  } catch {
    return c.json({ error: 'Token invalide ou expiré' }, 401);
  }

  // Generate TOTP secret
  const { TOTP, Secret } = await import('otpauth');
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: 'Delta RM',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUri = totp.toString();

  // Generate QR code as data URL
  const QRCode = await import('qrcode');
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  // Store the secret temporarily (encrypted) — not yet activated
  const encryptedSecret = encrypt(secret.base32);
  await db
    .update(accounts)
    .set({ totpSecret: encryptedSecret, updatedAt: new Date() })
    .where(eq(accounts.id, user.sub));

  return c.json({
    secret: secret.base32,
    qr_code_url: qrCodeDataUrl,
    otpauth_uri: otpauthUri,
  });
});

// ---------------------------------------------------------------------------
// POST /2fa/setup/confirm  (temp_token required)
// ---------------------------------------------------------------------------

const setup2faConfirmSchema = z.object({
  temp_token: z.string().min(1),
  code: z.string().length(6),
});

router.post('/2fa/setup/confirm', rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = setup2faConfirmSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'temp_token et code requis' }, 400);

  let user: JwtPayload;
  try {
    user = await verifyTempToken(parsed.data.temp_token);
  } catch {
    return c.json({ error: 'Token invalide ou expiré' }, 401);
  }

  // Get the stored secret
  const [account] = await db
    .select({ totpSecret: accounts.totpSecret })
    .from(accounts)
    .where(eq(accounts.id, user.sub))
    .limit(1);

  if (!account?.totpSecret) {
    return c.json({ error: 'Aucun secret TOTP configuré. Appelez /2fa/setup d\'abord.' }, 400);
  }

  const secretBase32 = decrypt(account.totpSecret);

  // Verify the code
  const { TOTP, Secret } = await import('otpauth');
  const totp = new TOTP({
    issuer: 'Delta RM',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: parsed.data.code, window: 1 });
  if (delta === null) {
    return c.json({ error: 'Code invalide' }, 401);
  }

  // Activate 2FA
  await db
    .update(accounts)
    .set({ totpEnabled: true, updatedAt: new Date() })
    .where(eq(accounts.id, user.sub));

  // Issue real tokens
  const accessToken = await signAccessToken({
    sub: user.sub,
    email: user.email,
    persona: user.persona,
  });

  const refreshToken = await createRefreshToken(user.sub);

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  });

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
  });
});

// ---------------------------------------------------------------------------
// POST /2fa/verify  (temp_token required)
// ---------------------------------------------------------------------------

const verify2faSchema = z.object({
  temp_token: z.string().min(1),
  code: z.string().length(6),
});

router.post('/2fa/verify', rateLimit(5, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verify2faSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'temp_token et code requis' }, 400);

  let user: JwtPayload;
  try {
    user = await verifyTempToken(parsed.data.temp_token);
  } catch {
    return c.json({ error: 'Token invalide ou expiré' }, 401);
  }

  const [account] = await db
    .select({ totpSecret: accounts.totpSecret, totpEnabled: accounts.totpEnabled })
    .from(accounts)
    .where(eq(accounts.id, user.sub))
    .limit(1);

  if (!account?.totpSecret || !account.totpEnabled) {
    return c.json({ error: '2FA non configuré pour ce compte' }, 400);
  }

  const secretBase32 = decrypt(account.totpSecret);

  const { TOTP, Secret } = await import('otpauth');
  const totp = new TOTP({
    issuer: 'Delta RM',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: parsed.data.code, window: 1 });
  if (delta === null) {
    return c.json({ error: 'Code invalide' }, 401);
  }

  const accessToken = await signAccessToken({
    sub: user.sub,
    email: user.email,
    persona: user.persona,
  });

  const refreshToken = await createRefreshToken(user.sub);

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  });

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'auth_2fa_verify_success',
    email: user.email,
    user_id: user.sub,
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    user_agent: c.req.header('user-agent'),
  }));

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
  });
});

// ---------------------------------------------------------------------------
// POST /check-auth-method  (public)
// ---------------------------------------------------------------------------

const checkAuthMethodSchema = z.object({
  email: z.string().email().optional(),
  hostname: z.string().min(1).optional(),
}).refine((data) => data.email || data.hostname, {
  message: 'email ou hostname requis',
});

router.post('/check-auth-method', rateLimit(10, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = checkAuthMethodSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'email ou hostname requis' }, 400);
  }

  const { email, hostname } = parsed.data;

  let clientRow: { id: string; name: string } | undefined;

  if (hostname) {
    // Try to find client by subdomain or custom_hostname
    [clientRow] = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(
        and(
          eq(clients.isActive, true),
          or(
            eq(clients.subdomain, hostname),
            eq(clients.customHostname, hostname)
          )
        )
      )
      .limit(1);
  } else if (email) {
    // Find the user's account, then their client via membership
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, email.toLowerCase()))
      .limit(1);

    if (account) {
      // Check user_client_memberships first (client_user)
      const [membership] = await db
        .select({ clientId: userClientMemberships.clientId })
        .from(userClientMemberships)
        .where(
          and(
            eq(userClientMemberships.userId, account.id),
            eq(userClientMemberships.isActive, true)
          )
        )
        .limit(1);

      if (membership) {
        [clientRow] = await db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(and(eq(clients.id, membership.clientId), eq(clients.isActive, true)))
          .limit(1);
      }
    }
    // If account not found or no membership, clientRow stays undefined → returns 'password'
    // This doesn't leak whether the email exists (always returns a valid response)
  }

  if (!clientRow) {
    return c.json({ method: 'password' });
  }

  // Check if this client has SSO enabled
  const [ssoConfig] = await db
    .select({ provider: clientSsoConfigs.provider })
    .from(clientSsoConfigs)
    .where(
      and(
        eq(clientSsoConfigs.clientId, clientRow.id),
        eq(clientSsoConfigs.isEnabled, true)
      )
    )
    .limit(1);

  if (!ssoConfig) {
    return c.json({ method: 'password' });
  }

  return c.json({
    method: 'sso',
    provider: ssoConfig.provider,
    client_id: clientRow.id,
    client_name: clientRow.name,
  });
});

export default router;
