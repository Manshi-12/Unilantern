// ── Delivery channel union ───────────────────────────────────────────────────
export type NotificationChannel = "in_app" | "push" | "email";

// ── Recipient role union ─────────────────────────────────────────────────────
export type RecipientRole = "student" | "advisor" | "school_admin" | "unilantern_admin";

// ── Notification type union ──────────────────────────────────────────────────
export type NotificationType =
  // Student notifications
  | "readiness_band_update"
  | "improvement_recommendation"
  | "essay_feedback_ready"
  | "essay_development_milestone"
  | "saved_college_gap_alert"
  | "scholarship_deadline_reminder"
  | "missing_section_reminder"
  | "senior_readiness_check"
  | "onboarding_progress"
  // Advisor notifications
  | "student_needs_attention"
  | "cohort_insight"
  | "low_engagement_alert"
  | "student_band_change"
  // School admin notifications
  | "school_onboarding_milestone"
  | "student_readiness_summary"
  | "consent_coverage_status"
  | "dashboard_access_enabled"
  // UniLantern admin notifications
  | "new_school_inquiry"
  | "school_onboarding_update"
  | "usage_anomaly"
  | "consent_coverage_issue"
  // System notifications
  | "cron_job_failure";

// ── Notification record as stored in the database ────────────────────────────
export interface NotificationRecord {
  notification_id: number;
  recipient_user_id: number;
  recipient_role: RecipientRole;
  notification_type: string;
  title: string;
  message: string;
  delivery_channel: NotificationChannel;
  is_read: boolean;
  is_critical: boolean;
  read_at: Date | null;
  metadata: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Notification preference record ───────────────────────────────────────────
export interface NotificationPreferenceRecord {
  preference_id: number;
  recipient_id: number;
  recipient_role: RecipientRole;
  notification_type: string;
  delivery_channel: NotificationChannel;
  enabled: boolean;
  is_critical: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Payload used to create a notification ────────────────────────────────────
export interface CreateNotificationPayload {
  recipientId: number;
  recipientRole: RecipientRole;
  notificationType: NotificationType;
  title: string;
  message: string;
  deliveryChannels: NotificationChannel[];
  isCritical: boolean;
  metadata?: Record<string, unknown>;
}
