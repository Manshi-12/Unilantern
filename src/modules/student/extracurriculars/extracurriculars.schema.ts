import { z } from "zod";

export const extracurricularCreateSchema = z.object({
  activity_name: z.string().trim().min(1).max(250),
  activity_type: z.enum(['club', 'sport', 'job', 'family_responsibility', 'project', 'research', 'other']),
  years_involved: z.enum(['less_than_1', '1', '2', '3', '4_plus']),
  involvement_level: z.enum(['explored', 'consistent', 'key_contributor', 'leader_founder']),
  activity_description: z.string().trim().min(1).max(300),
  impact_text: z.string().trim().min(1).max(200),
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

function normalizeExtracurricularReorderBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if ("activities" in o && !("order" in o)) {
    o.order = o.activities;
    delete o.activities;
  }
  if (Array.isArray(o.order)) {
    o.order = (o.order as Record<string, unknown>[]).map((row) => {
      const r = { ...row };
      if ("activity_id" in r && !("ec_id" in r)) {
        r.ec_id = r.activity_id;
        delete r.activity_id;
      }
      return r;
    });
  }
  return o;
}

const reorderItemSchema = z.object({
  ec_id: z.coerce.number().int().positive(),
  display_order: z.number().int().min(1),
});

export const extracurricularReorderSchema = z.preprocess(
  normalizeExtracurricularReorderBody,
  z.object({ order: z.array(reorderItemSchema).min(1) }).strict(),
);

export const extracurricularListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
});
