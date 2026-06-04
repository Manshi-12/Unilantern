import { Router } from 'express';
import { validate }          from '../../../../middlewares/validate.middleware';
import { verifyJWT }         from '../../../../middlewares/verifyJWT.middleware';
import { RoleGuard }         from '../../../../middlewares/roleGuard.middleware';
import {
  registerRateLimiter,
  verifyEmailRateLimiter,
  loginRateLimiter,
  logoutRateLimiter,
  refreshRateLimiter,
  changePasswordRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from '../../../../middlewares/rateLimiter.middleware';
import {
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validation';
import {
  step1,
  step2,
  verifyEmail,
  step3,
  login,
  logout,
  refresh,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';

const router = Router();

// ─── 3-Step Registration (public, no JWT) ─────────────────────────────────────

// 1.1 — POST /v1/auth/school-admin/register/step1
// Middleware: rateLimiter | Rate Limit: 5 per IP per hour
router.post(
  '/register/step1',
  registerRateLimiter,
  validate(registerStep1Schema),
  step1,
);

// 1.2 — POST /v1/auth/school-admin/register/step2
// Middleware: rateLimiter | Rate Limit: 5 per IP per hour
router.post(
  '/register/step2',
  registerRateLimiter,
  validate(registerStep2Schema),
  step2,
);

// 1.3 — GET /v1/auth/school-admin/verify-email/:token
// Middleware: rateLimiter | Rate Limit: 20 per IP per hour
router.get(
  '/verify-email/:token',
  verifyEmailRateLimiter,
  verifyEmail,
);

// 1.4 — POST /v1/auth/school-admin/register/step3
// Middleware: rateLimiter | Rate Limit: 5 per IP per hour
router.post(
  '/register/step3',
  registerRateLimiter,
  validate(registerStep3Schema),
  step3,
);

// ─── Session Endpoints ────────────────────────────────────────────────────────

// 1.5 — POST /v1/auth/school-admin/login
// Middleware: rateLimiter | Audit: ADMIN_LOGIN | Rate Limit: 10 per email per hour
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  login,
);

// 1.6 — POST /v1/auth/school-admin/logout
// Middleware: rateLimiter → verifyJWT | Audit: ADMIN_LOGOUT
router.post(
  '/logout',
  logoutRateLimiter,
  verifyJWT,
  logout,
);

// 1.7 — POST /v1/auth/school-admin/refresh
// Middleware: rateLimiter | Auth: JWT (refresh cookie) | Rate Limit: 30 per admin per hour
// Note: verifyJWT is NOT used here — refresh reads the refresh cookie directly
router.post(
  '/refresh',
  refreshRateLimiter,
  refresh,
);

// 1.8 — POST /v1/auth/school-admin/change-password
// Middleware: rateLimiter → verifyJWT → RoleGuard(school_admin)
// Audit: PASSWORD_CHANGED | Rate Limit: 5 per admin per day
router.post(
  '/change-password',
  changePasswordRateLimiter,
  verifyJWT,
  RoleGuard('school_admin'),
  validate(changePasswordSchema),
  changePassword,
);

// ─── Password Recovery (MUST CREATE — §1.9 & §1.10) ─────────────────────────

// 1.9 — POST /v1/auth/school-admin/forgot-password  ■ MUST CREATE
// Middleware: rateLimiter | Auth: None — public | Rate Limit: 5 per email per hour
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);

// 1.10 — POST /v1/auth/school-admin/reset-password  ■ MUST CREATE
// Middleware: rateLimiter | Auth: None — public | Rate Limit: 10 per IP per hour
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  validate(resetPasswordSchema),
  resetPassword,
);

export default router;






