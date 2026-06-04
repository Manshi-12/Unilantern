import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../../config/env';

export interface JwtPayload {
  sub: string;           // admin_id
  role: 'school_admin';
  school_id: number;
  registration_status: string;
  iat?: number;
  exp?: number;
}

// ── Sign ──────────────────────────────────────────────────────────────────────

export const signAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });

export const signRefreshToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

// ── Verify ─────────────────────────────────────────────────────────────────────

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

// ── Cookie helpers ─────────────────────────────────────────────────────────────

const COOKIE_BASE = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie('access_token', accessToken, {
    ...COOKIE_BASE,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_BASE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', COOKIE_BASE);
  res.clearCookie('refresh_token', COOKIE_BASE);
};
