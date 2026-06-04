import { z } from 'zod';

// ─── PUT /profile ─────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  email:     z.string().email().optional(),
}).refine(
  data => data.full_name || data.email,
  { message: 'At least one field (full_name or email) must be provided.' },
);

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;




