import crypto from 'crypto';

export function generateCodeVerifier(): string {
  return base64Url(crypto.randomBytes(32));
}

export function generateState(): string {
  return base64Url(crypto.randomBytes(16));
}

export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64Url(hash);
}

export function xClientRequiresSecret(clientId: string): boolean {
  try {
    const decoded = Buffer.from(clientId, 'base64url').toString('utf8');
    return decoded.endsWith(':ci');
  } catch {
    return false;
  }
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
