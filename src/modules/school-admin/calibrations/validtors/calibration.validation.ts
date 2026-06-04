import { z } from 'zod';

// Reusable nullable range — both fields optional; if both present, max >= min
const bandSchema = z.object({
  min: z.number().nonnegative().nullable().optional(),
  max: z.number().nonnegative().nullable().optional(),
}).refine(
  data => {
    if (data.min != null && data.max != null) return data.max >= data.min;
    return true;
  },
  { message: 'max must be greater than or equal to min' },
);

// ─── PUT /v1/school-admin/calibration ────────────────────────────────────────
export const saveCalibrationSchema = z.object({
  gpa:   bandSchema.optional(),
  rigor: bandSchema.optional(),
  sat:   bandSchema.optional(),
  act:   bandSchema.optional(),
}).refine(
  data => data.gpa || data.rigor || data.sat || data.act,
  { message: 'At least one band (gpa, rigor, sat, act) must be provided.' },
);

export type SaveCalibrationDto = z.infer<typeof saveCalibrationSchema>;




