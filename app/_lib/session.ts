import crypto from 'crypto';

const SESSION_COOKIE = 'barter_session';


export type SessionPayload = {
  xUserId: string;
  username: string;
  agentId: string;
};

type CookieStore = {
  get: (name: string) => { value?: string } | undefined;
  set: (name: string, value: string, options?: Record<string, any>) => void;
};

function getSecret(): string {
  const secret = process.env.X_AUTH_SECRET;
  if (!secret) {
    throw new Error('X_AUTH_SECRET is required');
  }
  return secret;
}

export function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySession(value: string | undefined): SessionPayload | null {
  if (!value) return null;
  const [data, signature] = value.split('.');
  if (!data || !signature) return null;
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64url');
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function clearSessionCookie(cookies: CookieStore) {
  cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
}

export function setSessionCookie(cookies: CookieStore, payload: SessionPayload) {
  const isProduction = process.env.NODE_ENV === 'production';
  cookies.set(SESSION_COOKIE, signSession(payload), {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site OAuth in production
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  });
}

export function getSessionCookie(cookies: CookieStore): SessionPayload | null {
  const value = cookies.get(SESSION_COOKIE)?.value;
  return verifySession(value);
}
