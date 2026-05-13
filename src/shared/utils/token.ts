import crypto from "crypto";

/**
 * Generates a cryptographically secure random refresh token (32 bytes = 64 hex chars).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a refresh token with SHA-256 for secure storage.
 * This is intentionally NOT bcrypt — speed matters for token rotation,
 * and the token itself has sufficient entropy (256 bits).
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
