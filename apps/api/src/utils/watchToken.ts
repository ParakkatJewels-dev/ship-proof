import crypto from "crypto";

/**
 * The secret in a customer watch link. 32 random bytes (256 bits) cannot be guessed. Only the SHA-256
 * hash is stored, so a leaked database does not hand out working video links.
 */
export function createWatchToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashWatchToken(token) };
}

export function hashWatchToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** A link token has exactly this shape; anything else is rejected before touching the database. */
export const isWellFormedToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);
