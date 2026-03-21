import { SignJWT, jwtVerify } from 'jose';

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET environment variable is required');
}

const encodedSecret = new TextEncoder().encode(secret);

export interface JwtPayload {
  sub: string;
  email: string;
  persona: string;
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(encodedSecret);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, encodedSecret);
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    persona: payload.persona as string,
  };
}

/** Short-lived token (5 min) for 2FA flow — only grants access to /auth/2fa/* routes */
export async function signTempToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload, purpose: '2fa' } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(encodedSecret);
}

export async function verifyTempToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, encodedSecret);
  if (payload.purpose !== '2fa') {
    throw new Error('Invalid token purpose');
  }
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    persona: payload.persona as string,
  };
}
