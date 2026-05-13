import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────
const majorSelectivityEnum = z.enum(["standard", "competitive", "highly_competitive"]);
const savedCollegeStatusEnum = z.enum(["saved", "applied", "admitted"]);

// ── POST /students/me/colleges/saved ─────────────────────────────────────────
export const saveCollegeSchema = z.object({
  college_id: z
    .number()
    .int()
    .positive("college_id must be a positive integer"),

  intended_major: z
    .string()
    .trim()
    .max(250, "intended_major must be 250 characters or fewer")
    .nullable()
    .optional(),

  major_selectivity: majorSelectivityEnum.nullable().optional(),

  is_in_state: z.boolean().nullable().optional(),
});

// ── PATCH /students/me/colleges/saved/:saved_id ──────────────────────────────
export const updateSavedCollegeSchema = z.object({
  status: savedCollegeStatusEnum.optional(),

  intended_major: z
    .string()
    .trim()
    .max(250)
    .nullable()
    .optional(),

  major_selectivity: majorSelectivityEnum.nullable().optional(),

  is_in_state: z.boolean().nullable().optional(),
});

// ── GET /colleges/search query params ────────────────────────────────────────
export const searchCollegesSchema = z.object({
  q: z.string().trim().max(200).optional(),

  state: z.string().trim().max(100).optional(),

  min_acceptance_rate: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional(),

  max_acceptance_rate: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional(),

  is_test_optional: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0),
});

export type SaveCollegeSchema = z.infer<typeof saveCollegeSchema>;
export type UpdateSavedCollegeSchema = z.infer<typeof updateSavedCollegeSchema>;
export type SearchCollegesSchema = z.infer<typeof searchCollegesSchema>;
