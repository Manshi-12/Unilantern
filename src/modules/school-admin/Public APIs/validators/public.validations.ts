import { z } from 'zod';

// ── 61. GET /v1/colleges — query params ──────────────────────────────────────

export const getCollegesSchema = z.object({
  search: z.string().max(200).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});




