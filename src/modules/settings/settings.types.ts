export enum FeedbackType {
  BUG = "bug",
  FEATURE_REQUEST = "feature_request",
  CONFUSING = "confusing",
  OTHER = "other",
}

export enum FeedbackStatus {
  NEW = "new",
  IN_REVIEW = "in_review",
  PLANNED = "planned",
  RESOLVED = "resolved",
}

export interface FeedbackSubmission {
  feedback_id: number;
  submitter_id: number;
  school_id: number | null;
  feedback_type: FeedbackType;
  message: string;
  screenshot_url: string | null;
  contact_consent: boolean;
  submitter_role: string;
  page_or_screen: string | null;
  app_version: string | null;
  device_type: string | null;
  platform: string | null;
  status: FeedbackStatus;
  created_at: Date;
}
