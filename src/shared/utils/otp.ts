import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { BCRYPT_COST, OTP_CODE_LENGTH } from "../../config/constants.js";

export function generateOtp(): string {
  const max = 10 ** OTP_CODE_LENGTH;
  const code = randomInt(0, max);
  return code.toString().padStart(OTP_CODE_LENGTH, "0");
}

export function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_COST);
}

export function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
