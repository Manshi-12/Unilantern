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

export const profileUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200).optional(),
    grade: z.number().int().min(9).max(12).optional(),
    graduation_year: z
      .number()
      .int()
      .min(currentYear, `graduation_year must be >= ${currentYear}`)
      .max(currentYear + 6, `graduation_year must be <= ${currentYear + 6}`)
      .optional(),
    high_school_name: z.string().trim().min(1).max(300).optional(),
    state: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const extracurricularCreateSchema = z.object({
  activity_name: z.string().trim().min(1).max(250),
  activity_type: z.enum(['club', 'sport', 'job', 'family', 'project', 'research', 'other']),
  years_involved: z.enum(['less_than_1', '1', '2', '3', '4_plus']),
  involvement_level: z.enum(['explored', 'consistent', 'key_contributor', 'leader_founder']),
  activity_description: z.string().trim().min(1).max(400),
  impact_text: z.string().trim().min(1).max(300),
  impact_level: z.enum(['participation_only', 'contributed', 'measurable', 'created_scaled']),
  hours_per_week: z.enum(['under_2', '2_to_5', '6_to_10', '11_to_20', '20_plus']),
  experience_duration_weeks: z.number().int().min(1).max(52).optional(),
  selective_acceptance_toggle: z.boolean().optional().default(false),
  external_org_toggle: z.boolean().optional().default(false),
  travel_or_residency_toggle: z.boolean().optional().default(false),
  people_impacted: z.number().int().min(0).optional().default(0),
  funds_raised: z.number().int().min(0).optional().default(0),
  users_acquired: z.number().int().min(0).optional().default(0),
  hours_delivered: z.number().int().min(0).optional().default(0),
  competition_top_10_pct_toggle: z.boolean().optional().default(false),
  finalist_or_winner_toggle: z.boolean().optional().default(false),
  publication_or_presented_toggle: z.boolean().optional().default(false),
  policy_or_partnership_toggle: z.boolean().optional().default(false),
  structured_deliverable_toggle: z.boolean().optional().default(false),
  language_or_skill_cert_toggle: z.boolean().optional().default(false),
  formal_selection_toggle: z.boolean().optional().default(false),
  documented_real_world_output_toggle: z.boolean().optional().default(false),
});

export const extracurricularUpdateSchema = extracurricularCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" }
);

export const extracurricularReorderSchema = z.object({
  activities: z.array(
    z.object({
      activity_id: z.string(),
      display_order: z.number().int().min(1),
    })
  ).min(1),
});

export const extracurricularListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});

export function computeAge(dobIso: string): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
