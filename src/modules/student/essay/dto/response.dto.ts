import type { EssayStatus, NotStartedReason, ReviewerType } from "../essay.types.js";

export interface EssayStateResponseDto {
  has_data:               boolean;
  essay_status:           EssayStatus;
  word_count:             number;
  reviewer_type:          ReviewerType | null;
  reviewer_confirmed:     boolean;
  reflection_lock_until:  string | null;
  reflection_lock_active: boolean;
  draft_saved_at:         string | null;
  revised_at:             string | null;
  reviewed_at:            string | null;
  finalized_at:           string | null;
  finalization_confirmed: boolean;
  edit_session_count:     number;
  not_started_reason:     NotStartedReason | null;
  score_recalc_queued?:   boolean;
}
