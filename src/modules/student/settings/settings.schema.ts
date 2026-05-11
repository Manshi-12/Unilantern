import { z } from "zod";
import { FeedbackType } from "./settings.types.js";

export const submitFeedbackSchema = z.object({
  feedback_type: z.nativeEnum(FeedbackType),
  message: z.string().min(1).max(2000),
  contact_consent: z.boolean().optional().default(false),
  screenshot_url: z.string().url().optional(),
  page_or_screen: z.string().optional(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});
