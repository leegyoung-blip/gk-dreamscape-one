import "server-only";
import {
  createCipheriv,
  createHash,
  randomBytes,
  randomInt,
} from "node:crypto";

export function createRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptSensitiveValue(value: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
  last4: string;
} {
  const encodedKey = process.env.AFFILIATE_PAYOUT_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("AFFILIATE_PAYOUT_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error(
      "AFFILIATE_PAYOUT_ENCRYPTION_KEY must decode to exactly 32 bytes",
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value.trim(), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const compact = value.replace(/\s+/g, "");

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    last4: compact.slice(-4),
  };
}

export function buildReferralCode(seed: string): string {
  const prefix = seed
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);

  const safePrefix = prefix.length >= 3 ? prefix : "DREAM";
  return `${safePrefix}${randomInt(1000, 10000)}`;
}
