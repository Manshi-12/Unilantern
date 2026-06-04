import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { ApiResponse } from '../../../../shared/responses/ApiResponse';
import * as AuthService from '../services/auth.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract client IP — respects X-Forwarded-For behind a proxy */
function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

/** Extract a readable device description from User-Agent */
function getDeviceInfo(req: Request): string {
  return req.headers['user-agent'] ?? 'unknown';
}

/** Set both JWT cookies on a response */
function setJwtCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, AuthService.ACCESS_COOKIE_OPTS);
  res.cookie('refresh_token', refreshToken, AuthService.REFRESH_COOKIE_OPTS);
}

/** Clear both JWT cookies */
function clearJwtCookies(res: Response) {
  res.clearCookie('access_token',  { httpOnly: true, secure: true, sameSite: 'strict' });
  res.clearCookie('refresh_token', { httpOnly: true, secure: true, sameSite: 'strict', path: '/v1/auth/school-admin/refresh' });
}

// ─── 1.1 Submit School Details (Step 1) ──────────────────────────────────────

export const step1 = asyncHandler(async (req: Request, res: Response) => {
  const data = await AuthService.registerStep1(req.body);
  ApiResponse.success(res, data, 201);
});

// ─── 1.2 Submit Admin Details + Send Email Verification (Step 2) ─────────────

export const step2 = asyncHandler(async (req: Request, res: Response) => {
  // Email dispatch injected as a dependency — replace with your actual mailer
  const sendVerificationEmail = async (to: string, token: string) => {
    // e.g. await mailer.sendTemplate('verify-email', to, { token, link: `${process.env.APP_URL}/verify?token=${token}` });
  };

  const data = await AuthService.registerStep2(req.body, sendVerificationEmail);
  ApiResponse.success(res, data, 200);
});

// ─── 1.3 Validate Email Token ─────────────────────────────────────────────────

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const data = await AuthService.verifyEmailToken(token);
  ApiResponse.success(res, data, 200);
});

// ─── 1.4 Set Password + Complete Registration (Step 3) ───────────────────────

export const step3 = asyncHandler(async (req: Request, res: Response) => {
  const data = await AuthService.registerStep3(
    req.body,
    (access, refresh) => setJwtCookies(res, access, refresh),
  );
  ApiResponse.success(res, data, 201);
});

// ─── 1.5 Login ────────────────────────────────────────────────────────────────

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await AuthService.login(
    req.body,
    { ip_address: getIp(req), device_info: getDeviceInfo(req) },
    (access, refresh) => setJwtCookies(res, access, refresh),
  );
  ApiResponse.success(res, data, 200);
});

// ─── 1.6 Logout ───────────────────────────────────────────────────────────────

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // admin & session injected by verifyJWT middleware onto req
  const { adminId, sessionId } = (req as any).jwtPayload;

  const data = await AuthService.logout(
    adminId,
    sessionId,
    { ip_address: getIp(req), device_info: getDeviceInfo(req) },
    () => clearJwtCookies(res),
  );
  ApiResponse.success(res, data, 200);
});

// ─── 1.7 Refresh Access Token ─────────────────────────────────────────────────

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  
  const refreshTokenRaw = req.cookies?.refresh_token;
  console.log(req.cookies);

  if (!refreshTokenRaw) {
    return res.status(401).json({
      error: { code: 'REFRESH_TOKEN_INVALID', message: 'Refresh cookie is missing.', request_id: (req as any).requestId, details: {} },
    });
  }

  const data = await AuthService.refreshAccessToken(
    refreshTokenRaw,
    (token) => res.cookie('access_token', token, AuthService.ACCESS_COOKIE_OPTS),
    (token) => res.cookie('refresh_token', token, AuthService.REFRESH_COOKIE_OPTS),
  );
  ApiResponse.success(res, data, 200);
});

// ─── 1.8 Change Password ──────────────────────────────────────────────────────

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { adminId, sessionId } = (req as any).jwtPayload;

  const data = await AuthService.changePassword(
    adminId,
    sessionId,
    req.body,
    { ip_address: getIp(req), device_info: getDeviceInfo(req) },
  );
  ApiResponse.success(res, data, 200);
});

// ─── 1.9 Forgot Password ■ MUST CREATE ───────────────────────────────────────

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const sendResetEmail = async (to: string, token: string) => {
    // e.g. await mailer.sendTemplate('reset-password', to, { token, link: `${process.env.APP_URL}/reset-password?token=${token}` });
  };

  const data = await AuthService.forgotPassword(req.body, sendResetEmail);
  // Always 200 — never reveals whether email is registered (§1.9)
  ApiResponse.success(res, data, 200);
});

// ─── 1.10 Reset Password ■ MUST CREATE ───────────────────────────────────────

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await AuthService.resetPassword(req.body);
  ApiResponse.success(res, data, 200);
});






