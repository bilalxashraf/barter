import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  return crypto.createHash("sha256").update(trimmed).digest();
}

export function encryptSecret(plaintext: string, rawKey: string): string {
  const key = deriveKey(rawKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(ciphertext: string, rawKey: string): string {
  const [ivPart, authTagPart, payloadPart] = ciphertext.split(".");

  if (!ivPart || !authTagPart || !payloadPart) {
    throw new Error("Malformed encrypted secret");
  }

  const key = deriveKey(rawKey);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, "base64url")
  );

  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payloadPart, "base64url")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}

export function hashSessionToken(sessionToken: string): string {
  return crypto.createHash("sha256").update(sessionToken).digest("hex");
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
