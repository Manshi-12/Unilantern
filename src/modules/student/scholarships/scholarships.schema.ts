import { z } from "zod";

export const scholarshipsListQuerySchema = z.object({
  type: z.enum(["merit", "need", "athletic", "demographic", "major", "project", "other"]).optional(),
  college_id: z.coerce.number().int().positive().optional(),
  general_only: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  sort: z.enum(["deadline_asc", "deadline_desc", "amount_desc"]).optional().default("deadline_asc"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
  cursor: z.string().optional(),
});

export const saveScholarshipSchema = z.object({
  scholarship_id: z.number().int().positive(),
});
