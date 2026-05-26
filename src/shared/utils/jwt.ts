import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import type { JWTPayload } from "jose";
import { env } from "../../config/env.js";
import { PHONE_VERIFY_TOKEN_TTL_SECONDS } from "../../config/constants.js";
import { AuthError } from "../errors/auth-error.js";
import { AuthErrorCode } from "../response/error-codes.js";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PAYLOAD INTERFACE
//
// Both student and advisor tokens use this shape.
//   - sub       : student_id (number as string) OR advisor_id (number as string)
//   - role      : "student" | "advisor"
//   - school_id : linked school (both user types can have one, null if none)
//   - email     : ADVISOR ONLY — not present in student tokens
// ─────────────────────────────────────────────────────────────────────────────
export interface AccessTokenPayload {
  sub: string;
  role: string;
  school_id?: number | null;
  email?: string; // optional — only set for advisor tokens
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS TOKEN  (used by BOTH student and advisor)
// ─────────────────────────────────────────────────────────────────────────────

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    role: payload.role,
    school_id: payload.school_id ?? null,
    // Only embed email when it is explicitly provided (advisor path).
    // Student tokens will never carry this claim.
    ...(payload.email !== undefined && { email: payload.email }),
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALG] });
    return payload;
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new AuthError(AuthErrorCode.JWT_EXPIRED, "Access token expired");
    }
    throw new AuthError(AuthErrorCode.JWT_INVALID, "Invalid access token");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE VERIFY TOKEN  (STUDENT ONLY — OTP / phone-based auth flow)
// ─────────────────────────────────────────────────────────────────────────────

const PHONE_VERIFY_TYP = "phone_verify" as const;

export async function signPhoneVerifyToken(
  phone: string,
  purpose: "signup" | "login",
): Promise<string> {
  return new SignJWT({
    typ: PHONE_VERIFY_TYP,
    purpose,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(phone)
    .setIssuedAt()
    .setExpirationTime(`${PHONE_VERIFY_TOKEN_TTL_SECONDS}s`)
    .sign(secretKey);
}

export async function verifyPhoneVerifyToken(
  token: string,
): Promise<{ phone: string; purpose: "signup" | "login" }> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALG] });
    if (payload.typ !== PHONE_VERIFY_TYP) {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Invalid phone verification token");
    }
    if (payload.purpose !== "signup" && payload.purpose !== "login") {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Invalid phone verification token");
    }
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Invalid phone verification token");
    }
    return { phone: sub, purpose: payload.purpose };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof joseErrors.JWTExpired) {
      throw new AuthError(AuthErrorCode.JWT_EXPIRED, "Phone verification token expired", 401);
    }
    throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Invalid phone verification token", 401);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN  (ADVISOR ONLY — cookie-based session refresh)
// ─────────────────────────────────────────────────────────────────────────────

export async function signRefreshToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    role: payload.role,
    school_id: payload.school_id ?? null,
    ...(payload.email !== undefined && { email: payload.email }),
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: [ALG] });
    return payload;
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new AuthError(AuthErrorCode.JWT_EXPIRED, "Refresh token expired");
    }
    throw new AuthError(AuthErrorCode.JWT_INVALID, "Invalid refresh token");
  }
}