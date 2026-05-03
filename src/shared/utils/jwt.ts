import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import type { JWTPayload } from "jose";
import { env } from "../../config/env.js";
import { AuthError } from "../errors/auth-error.js";
import { AuthErrorCode } from "../response/error-codes.js";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);
const ALG = "HS256";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  school_id?: number | null;
}

export async function signAccessToken(
  payload: AccessTokenPayload,
): Promise<string> {
  return new SignJWT({
    role: payload.role,
    school_id: payload.school_id ?? null,
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
