import { z } from "zod";

export const schoolSearchSchema = z.object({
  q: z.string().trim().min(2).max(300),
  state: z.string().trim().min(2).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

export const linkSchoolSchema = z.object({
  school_id: z.coerce.number().int().positive(),
  school_email: z.string().trim().email().max(320).optional(),
});

export const mergeConfirmSchema = z.object({
  confirmed_student_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive(),
});
