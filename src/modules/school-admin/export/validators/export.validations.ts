import { z } from 'zod';

const ALLOWED_SCOPES = [
  'readiness_distribution',
  'engagement_metrics',
  'improvement_trends',
  'college_intent',
  'trajectory',
  'senior_risk',
  'counseling_capacity',
] as const;

const ALLOWED_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;

// ─── #31 POST body ─────────────────────────────────────────────────────────

export const triggerExportSchema = z.object({
  scope:   z.enum(ALLOWED_SCOPES),
  format:  z.literal('csv'),
  filters: z.object({
    grade_levels: z
      .array(z.number().int().min(9).max(12))
      .max(4)
      .optional(),
    term: z.string().max(100).optional(),
  })
  .passthrough()   // allow additional filter keys without failing validation
  .optional()
  .default({}),
});

// ─── #32 GET query params ─────────────────────────────────────────────────

export const listExportsSchema = z.object({
  status: z.enum(ALLOWED_STATUSES).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 20))
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().uuid().optional(),
});




