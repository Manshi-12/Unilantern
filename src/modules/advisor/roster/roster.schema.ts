import { z } from 'zod'

export const RosterQuerySchema = z.object({
  readiness_band: z.enum([
    'foundational',
    'developing',
    'competitive',
    'strongly_competitive',
    'exceptional',
  ]).optional(),

  needs_intervention: z.enum([
    'true',
    'false',
  ]).optional(),

  saved_selective: z.enum([
    'true',
    'false',
  ]).optional(),

  low_engagement: z.enum([
    'true',
    'false',
  ]).optional(),

  page: z.string()
    .optional()
    .default('1'),

  limit: z.string()
    .optional()
    .default('20'),
})

export type RosterQueryInput =
  z.infer<typeof RosterQuerySchema>