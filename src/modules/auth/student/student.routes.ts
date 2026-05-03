import { Router } from "express";
import { rateLimiter } from "../../../shared/middleware/rate-limiter.js";
import { RATE_LIMITS } from "../../../config/constants.js";
import {
  OtpRepository,
  StudentRepository,
} from "./student.repository.js";
import { StudentService } from "./student.service.js";
import { StudentController } from "./student.controller.js";

const router = Router();

const controller = new StudentController(
  new StudentService(new StudentRepository(), new OtpRepository()),
);

router.post(
  "/otp/send",
  rateLimiter("otp_send", RATE_LIMITS.OTP_SEND.limit, RATE_LIMITS.OTP_SEND.window),
  controller.sendOtp,
);

router.post(
  "/otp/verify",
  rateLimiter("otp_verify", RATE_LIMITS.OTP_VERIFY.limit, RATE_LIMITS.OTP_VERIFY.window),
  controller.verifyOtp,
);

router.post(
  "/register",
  rateLimiter("signup", RATE_LIMITS.SIGNUP.limit, RATE_LIMITS.SIGNUP.window, {
    identifier: "ip",
  }),
  controller.register,
);

router.post(
  "/login",
  rateLimiter("login", RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.window, {
    identifier: "ip",
  }),
  controller.login,
);

export default router;
