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

const fullName = z.string().trim().min(1, "Full name is required").max(200);

const requiredAgeConfirmation = z
  .boolean()
  .refine((v) => v === true, "confirms_age_13_plus must be true");

const inviteToken = z
  .string()
  .trim()
  .min(1, "invite_token cannot be empty")
  .max(500, "invite_token must be 500 characters or fewer")
  .nullish()
  .transform((v) => v ?? undefined);

const currentYear = new Date().getUTCFullYear();

export const registerInitSchema = z.object({
  phone_number: phoneNumber,
  email: emailAddress,
  full_name: fullName,
  graduation_year: z
    .number()
    .int()
    .min(currentYear - 20, `graduation_year must be >= ${currentYear - 20}`)
    .max(currentYear + 10, `graduation_year must be <= ${currentYear + 10}`),
  date_of_birth: z
    .string()
    .regex(isoDateRegex, "date_of_birth must be YYYY-MM-DD")
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Invalid date")
    .refine((v) => computeAge(v) >= 13, "Must be at least 13 years old"),
  high_school_name: z.string().trim().min(1).max(200),
  state_of_residence: z.string().trim().min(1).max(100),
  confirms_age_13_plus: requiredAgeConfirmation,
  confirms_parental_permission: z.boolean(),
  invite_token: inviteToken,
  college_data_share_consent: z.boolean().optional().default(true),
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

// ── New schemas for 1.1 – 1.8 ─────────────────────────────────────────────

export const sendOtpSchema = z.object({
  phone_number: phoneNumber,
  purpose: z.enum(["signup", "login"]),
});

export const verifyOtpSchema = z.object({
  phone_number: phoneNumber,
  otp_code: otpCode,
  purpose: z.enum(["signup", "login"]),
});

export const validateInviteTokenSchema = z.object({
  invite_token: z.string().trim().min(1, "invite_token is required").max(500),
});

export const signupSchema = z
  .object({
    phone_verify_token: z.string().trim().min(1, "phone_verify_token is required"),
    full_name: fullName,
    graduation_year: z
      .number()
      .int()
      .min(currentYear - 20, `graduation_year must be >= ${currentYear - 20}`)
      .max(currentYear + 10, `graduation_year must be <= ${currentYear + 10}`),
    date_of_birth: z
      .string()
      .regex(isoDateRegex, "date_of_birth must be YYYY-MM-DD")
      .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Invalid date")
      .refine((v) => computeAge(v) >= 13, "Must be at least 13 years old"),
    high_school_name: z.string().trim().min(1).max(200),
    state_of_residence: z.string().trim().min(1).max(100),
    confirms_age_13_plus: requiredAgeConfirmation,
    confirms_parental_permission: z.boolean(),
    invite_token: inviteToken,
    college_data_share_consent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const age = computeAge(data.date_of_birth);
    if (age >= 13 && age <= 17 && !data.confirms_parental_permission) {
      ctx.addIssue({
        code: "custom",
        message: "Parental consent is required for ages 13–17",
        path: ["confirms_parental_permission"],
      });
    }
  });

export const loginSchema = z.object({
  phone_verify_token: z.string().trim().min(1, "phone_verify_token is required"),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "refresh_token is required"),
});

export const logoutSchema = z.object({
  refresh_token: z.string().optional(),
});

export function computeAge(dobIso: string): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
