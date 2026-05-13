import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { authenticate } from "../../../shared/middleware/authenticate.js";
import { RATE_LIMITS } from "../../../config/constants.js";
import { StudentRepository, OtpRepository } from "./student.repository.js";
import { SessionRepository } from "./session.repository.js";
import { StudentService } from "./student.service.js";
import { StudentController } from "./student.controller.js";

const router = Router();

const controller = new StudentController(
  new StudentService(
    new StudentRepository(),
    new OtpRepository(),
    new SessionRepository(),
  ),
);

// ── Registration (LEGACY/Multi-step) ──────────────────────────────────────────
// Step 1: Submit profile details → OTP sent to phone
router.post(
  "/register",
  rateLimiter("signup", RATE_LIMITS.SIGNUP.limit, RATE_LIMITS.SIGNUP.window, { identifier: "ip" }),
  controller.registerInit,
);

// Step 2: Verify OTP → account created → JWT returned
router.post(
  "/register/verify",
  rateLimiter("otp_verify", RATE_LIMITS.OTP_VERIFY.limit, RATE_LIMITS.OTP_VERIFY.window),
  controller.registerVerify,
);

// ── Login (LEGACY/Multi-step) ─────────────────────────────────────────────────
// Step 1: Submit phone → OTP sent
router.post(
  "/login-legacy",
  rateLimiter("login_otp_send", RATE_LIMITS.OTP_SEND.limit, RATE_LIMITS.OTP_SEND.window),
  controller.loginSendOtp,
);

// Step 2: Verify OTP → JWT returned
router.post(
  "/login/verify-legacy",
  rateLimiter("login_verify", RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.window),
  controller.loginVerify,
);

// ── Modern Auth APIs (1.1 – 1.8) ───────────────────────────────────────────

// 1.1 POST /otp/send
router.post(
  "/otp/send",
  rateLimiter("otp_send", RATE_LIMITS.OTP_SEND.limit, RATE_LIMITS.OTP_SEND.window),
  controller.sendOtp,
);

// 1.2 POST /otp/verify
router.post(
  "/otp/verify",
  rateLimiter("otp_verify", RATE_LIMITS.OTP_VERIFY.limit, RATE_LIMITS.OTP_VERIFY.window),
  controller.verifyOtp,
);

// 1.3 POST /invite/validate
router.post(
  "/invite/validate",
  rateLimiter("validate_invite", 10, 3600, { identifier: "ip" }),
  controller.validateInviteToken,
);

// 1.4 POST /signup (Complete registration in one call)
router.post(
  "/signup",
  rateLimiter("signup", RATE_LIMITS.SIGNUP.limit, RATE_LIMITS.SIGNUP.window, { identifier: "ip" }),
  controller.signup,
);

// 1.5 POST /login (Complete login in one call)
router.post(
  "/login",
  rateLimiter("login", RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.window),
  controller.login,
);

// 1.6 — Refresh access token
router.post(
  "/token/refresh",
  rateLimiter("token_refresh", 20, 3600, { identifier: "ip" }),
  controller.refreshToken,
);

// 1.7 — Logout
router.delete(
  "/logout",
  authenticate,
  controller.logout,
);

// 1.8 — Get current session info (Me)
router.get(
  "/me",
  authenticate,
  controller.getMe,
);

export default router;
