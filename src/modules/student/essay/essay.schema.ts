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

export const confirmReviewerSchema = z.object({
  reviewer_type: z.enum(["advisor", "peer", "mentor"]),
});

export const finalizeSchema = z.object({
  confirmation: z.literal(true, { message: "confirmation must be true" }),
});

export type SaveContentSchema    = z.infer<typeof saveContentSchema>;
export type AdvanceStatusSchema  = z.infer<typeof advanceStatusSchema>;
export type ConfirmReviewerSchema = z.infer<typeof confirmReviewerSchema>;
export type FinalizeSchema       = z.infer<typeof finalizeSchema>;
