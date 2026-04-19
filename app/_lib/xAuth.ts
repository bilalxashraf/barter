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

export function buildXBasicAuthHeader(clientId: string, clientSecret: string): string {
  const encodedClientId = formUrlEncode(clientId);
  const encodedClientSecret = formUrlEncode(clientSecret);
  const basic = Buffer.from(`${encodedClientId}:${encodedClientSecret}`).toString('base64');
  return `Basic ${basic}`;
}

export function fingerprintValue(value: string | undefined): string | null {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export function getXClientDiagnostics(clientId: string | undefined, clientSecret: string | undefined) {
  const decodedClientId = decodeXClientId(clientId);

  return {
    hasClientId: !!clientId,
    clientIdLength: clientId?.length ?? 0,
    clientIdFingerprint: fingerprintValue(clientId),
    decodedClientId,
    decodedClientIdFingerprint: fingerprintValue(decodedClientId ?? undefined),
    decodedClientIdHasConfidentialSuffix: decodedClientId?.endsWith(':ci') ?? false,
    hasClientSecret: !!clientSecret,
    clientSecretLength: clientSecret?.length ?? 0,
    clientSecretFingerprint: fingerprintValue(clientSecret),
    requiresClientSecret: clientId ? xClientRequiresSecret(clientId) : false,
  };
}

function formUrlEncode(value: string): string {
  const params = new URLSearchParams({ value });
  return params.toString().slice('value='.length);
}

function decodeXClientId(clientId: string | undefined): string | null {
  if (!clientId) return null;
  try {
    return Buffer.from(clientId, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
