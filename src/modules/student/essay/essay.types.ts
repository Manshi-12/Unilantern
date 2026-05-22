export type EssayStatus = "not_started" | "drafted" | "revised" | "reviewed" | "finalized";
export type NotStartedReason = "EMPTY" | "TOO_SHORT" | "NOT_SAVED" | "REPETITIVE";
export type ReviewerType = "peer" | "teacher" | "counselor" | "tutor" | "parent" | "other";

export interface EssayRecord {
  essay_id:               number;
  student_id:             number;
  essay_prompt:           string | null;
  essay_text:             string | null;
  word_count:             number;
  essay_status:           EssayStatus;
  not_started_reason:     NotStartedReason | null;
  reviewer_type:          ReviewerType | null;
  reviewer_confirmed:     boolean;
  last_major_edit_at:     Date | null;
  reflection_lock_until:  Date | null;
  draft_saved_at:         Date | null;
  revised_at:             Date | null;
  reviewed_at:            Date | null;
  finalized_at:           Date | null;
  finalization_confirmed: boolean;
  previous_word_count:    number;
  edit_session_count:     number;
  repetition_detected:    boolean;
  created_at:             Date;
  updated_at:             Date;
}

export interface SaveContentData {
  essay_text:             string;
  essay_prompt?:          string;
  word_count:             number;
  repetition_detected:    boolean;
  previous_word_count:    number;
  edit_session_count:     number;
  last_major_edit_at:     Date | null;
  reflection_lock_until:  Date | null;
  draft_saved_at:         Date | null;
  essay_status:           EssayStatus;
  not_started_reason:     NotStartedReason | null;
  reviewer_type?:          ReviewerType | null;
  reviewer_confirmed?:     boolean;
  finalization_confirmed?: boolean;
  finalized_at?:           Date | null;
}

export interface AdvanceStatusData {
  essay_status:       EssayStatus;
  draft_saved_at?:    Date;
  revised_at?:        Date;
  reviewed_at?:       Date;
  finalized_at?:      Date;
  not_started_reason: NotStartedReason | null;
}

export interface ConfirmReviewerData {
  reviewer_type:      ReviewerType;
  reviewer_confirmed: boolean;
}

export interface FinalizeData {
  finalization_confirmed: boolean;
  essay_status:           EssayStatus;
  finalized_at:           Date;
  not_started_reason:     null;
}
