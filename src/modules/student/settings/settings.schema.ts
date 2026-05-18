import { z } from "zod";
import { FeedbackType } from "./settings.types.js";

function normalizeFeedbackSubmitBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if ("category" in o && !("feedback_type" in o)) {
    const c = String(o.category)
      .toLowerCase()
      .trim()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_");
    const alias: Record<string, string> = {
      bug: FeedbackType.BUG,
      feature_request: FeedbackType.FEATURE_REQUEST,
      featurerequest: FeedbackType.FEATURE_REQUEST,
      feature: FeedbackType.FEATURE_REQUEST,
      confusing: FeedbackType.CONFUSING,
      other: FeedbackType.OTHER,
    };
    const mapped = alias[c];
    if (mapped) o.feedback_type = mapped;
    delete o.category;
  }
  if ("rating" in o) delete o.rating;
  return o;
}

const submitFeedbackBodySchema = z
  .object({
    feedback_type: z.nativeEnum(FeedbackType),
    message: z.string().min(1).max(2000),
    contact_consent: z.boolean().optional().default(false),
    screenshot_url: z.string().url().optional(),
    page_or_screen: z.string().max(150).optional(),
  })
  .strict();

export const submitFeedbackSchema = z.preprocess(normalizeFeedbackSubmitBody, submitFeedbackBodySchema);
