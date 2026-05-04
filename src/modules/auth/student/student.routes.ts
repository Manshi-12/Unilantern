import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { RATE_LIMITS } from "../../../config/constants.js";
import { StudentRepository, OtpRepository } from "./student.repository.js";
import { StudentService } from "./student.service.js";
import { StudentController } from "./student.controller.js";

const router = Router();

const controller = new StudentController(
  new StudentService(new StudentRepository(), new OtpRepository()),
);

// ── Registration ──────────────────────────────────────────────────────────────
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

// ── Login ─────────────────────────────────────────────────────────────────────
// Step 1: Submit phone → OTP sent
router.post(
  "/login",
  rateLimiter("login_otp_send", RATE_LIMITS.OTP_SEND.limit, RATE_LIMITS.OTP_SEND.window),
  controller.loginSendOtp,
);

// Step 2: Verify OTP → JWT returned
router.post(
  "/login/verify",
  rateLimiter("login_verify", RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.window),
  controller.loginVerify,
);

export default router;
