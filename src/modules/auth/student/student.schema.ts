import { z } from "zod";

const phoneRegex = /^\+[1-9]\d{7,14}$/;
const otpRegex = /^\d{6}$/;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const phoneNumber = z
  .string()
  .regex(phoneRegex, "Invalid E.164 format (e.g. +12125551234)");

const emailAddress = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(320, "Email must be 320 characters or fewer");

const otpCode = z
  .string()
  .regex(otpRegex, "OTP must be a 6-digit numeric string");

const currentYear = new Date().getUTCFullYear();

export const registerInitSchema = z.object({
  phone_number: phoneNumber,
  email: emailAddress,
  full_name: z.string().trim().min(1, "Full name is required").max(200),
  graduation_year: z
    .number()
    .int()
    .min(currentYear, `graduation_year must be >= ${currentYear}`)
    .max(currentYear + 6, `graduation_year must be <= ${currentYear + 6}`),
  date_of_birth: z
    .string()
    .regex(isoDateRegex, "date_of_birth must be YYYY-MM-DD")
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Invalid date")
    .refine((v) => computeAge(v) >= 13, "Must be at least 13 years old"),
  high_school_name: z.string().trim().min(1).max(200),
  state_of_residence: z.string().trim().min(1).max(100),
  confirms_age_13_plus: z
    .boolean()
    .refine((v) => v === true, "confirms_age_13_plus must be true"),
  confirms_parental_permission: z.boolean(),
  invite_token: z.string().nullish().transform((v) => v ?? undefined),
  college_data_share: z.boolean().optional().default(true),
});

export const registerVerifySchema = z.object({
  phone_number: phoneNumber,
  otp_code: otpCode,
});

export const loginSendOtpSchema = z.object({
  phone_number: phoneNumber,
});

export const loginVerifySchema = z.object({
  phone_number: phoneNumber,
  otp_code: otpCode,
});

export function computeAge(dobIso: string): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
