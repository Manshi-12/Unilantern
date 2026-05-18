import { z } from "zod";

export const saveContentSchema = z.object({
  essay_text: z
    .string()
    .min(1, "essay_text is required"),

  essay_prompt: z
    .string()
    .min(1)
    .optional(),
});

export const advanceStatusSchema = z.object({
  target_status: z.enum(["drafted", "revised", "reviewed"]),
});

const mustBeTrue = (field: string) =>
  z.boolean().refine((v) => v === true, { message: `${field} must be true` });

export const confirmReviewerSchema = z.object({
  reviewer_type: z.enum(["peer", "teacher", "counselor", "tutor", "parent", "other"]),
  confirms_feedback_incorporated: mustBeTrue("confirms_feedback_incorporated"),
});

export const finalizeSchema = z.object({
  confirms_best_work: mustBeTrue("confirms_best_work"),
});

export type SaveContentSchema    = z.infer<typeof saveContentSchema>;
export type AdvanceStatusSchema  = z.infer<typeof advanceStatusSchema>;
export type ConfirmReviewerSchema = z.infer<typeof confirmReviewerSchema>;
export type FinalizeSchema       = z.infer<typeof finalizeSchema>;
