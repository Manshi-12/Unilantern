import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────
const majorSelectivityEnum = z.enum(["standard", "competitive", "highly_competitive"]);
const savedCollegeStatusEnum = z.enum(["saved", "applied", "admitted"]);

/** Map legacy `major` → `intended_major` before strict parse (doc uses intended_major only). */
function mapMajorAliasToIntendedMajor(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if ("major" in o && !("intended_major" in o)) {
    o.intended_major = o.major;
    delete o.major;
  }
  return o;
}

const saveCollegeBodySchema = z
  .object({
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
  })
  .strict();

// ── POST /students/me/colleges/saved — no `status` (use PATCH for lifecycle) ─
export const saveCollegeSchema = z.preprocess(mapMajorAliasToIntendedMajor, saveCollegeBodySchema);

const updateSavedCollegeBodySchema = z
  .object({
    status: savedCollegeStatusEnum.optional(),

    intended_major: z
      .string()
      .trim()
      .max(250)
      .nullable()
      .optional(),

    major_selectivity: majorSelectivityEnum.nullable().optional(),

    is_in_state: z.boolean().nullable().optional(),
  })
  .strict();

// ── PATCH /students/me/colleges/saved/:saved_id ──────────────────────────────
export const updateSavedCollegeSchema = z.preprocess(mapMajorAliasToIntendedMajor, updateSavedCollegeBodySchema);

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
