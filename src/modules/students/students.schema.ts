import { z } from "zod";

const currentYear = new Date().getUTCFullYear();

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
