/**
 * Server-only invitation token encryption. Store the SHA-256 hash for
 * authentication and AES-256-GCM ciphertext for sending expiring reminders.
 * Never expose this key to NEXT_PUBLIC_ variables or to browser code.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.FOUNDING50_INVITE_ENCRYPTION_KEY;
  if (!raw) throw new Error("FOUNDING50_INVITE_ENCRYPTION_KEY missing");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) throw new Error("Invitation encryption key must be 32 base64-decoded bytes");
  return bytes;
}

export function encryptInviteToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptInviteToken(packed: string): string {
  const [version, iv, ciphertext, tag, extra] = packed.split(".");
  if (version !== "v1" || !iv || !ciphertext || !tag || extra) throw new Error("Malformed invitation ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function publicOrigin(): string {
  const raw = process.env.FOUNDING50_PUBLIC_ORIGIN;
  if (!raw) throw new Error("FOUNDING50_PUBLIC_ORIGIN missing");
  const origin = new URL(raw);
  const isDev = process.env.NODE_ENV !== "production" && origin.hostname === "localhost";
  if (origin.protocol !== "https:" && !(isDev && origin.protocol === "http:")) {
    throw new Error("Founding 50 public origin must use HTTPS");
  }
  return origin.origin;
}
