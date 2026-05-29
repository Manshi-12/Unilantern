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
  rateLimiter("login", RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.window, { identifier: "phone_number" }),
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
