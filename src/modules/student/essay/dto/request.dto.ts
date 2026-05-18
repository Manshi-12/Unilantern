import type { ReviewerType } from "../essay.types.js";

export interface SaveContentRequestDto {
  essay_text:    string;
  essay_prompt?: string;
}

export interface AdvanceStatusRequestDto {
  target_status: "drafted" | "revised" | "reviewed";
}

export interface ConfirmReviewerRequestDto {
  reviewer_type: ReviewerType;
  confirms_feedback_incorporated: boolean;
}

export interface FinalizeRequestDto {
  confirms_best_work: boolean;
}
