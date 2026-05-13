// ── Account status union (extended with deletion states) ─────────────────────
export type AccountStatus =
  | "independent"
  | "school_linked"
  | "deletion_pending"
  | "purge_scheduled"
  | "permanently_deleted";

// ── Student record as seen by this module (includes deletion columns) ────────
export interface StudentDeletionRecord {
  student_id: number;
  school_id: number | null;
  phone_number: string;
  full_name: string;
  account_status: AccountStatus;
  is_active: boolean;
  deletion_requested_at: Date | null;
  deletion_confirmed_at: Date | null;
  scheduled_hard_delete_at: Date | null;
  scheduled_permanent_delete_at: Date | null;
  deletion_confirmation_token: string | null;
  deletion_confirmation_expires_at: Date | null;
  deletion_reason: string | null;
}

// ── Deletion queue record ────────────────────────────────────────────────────
export interface DeletionQueueRecord {
  deletion_queue_id: number;
  student_id: number;
  account_status_snapshot: string;
  deletion_initiated_at: Date;
  deletion_confirmed_at: Date;
  scheduled_permanent_delete_at: Date;
  purge_manifest: string | null;
  purge_started_at: Date | null;
  purge_completed_at: Date | null;
  is_completed: boolean;
  purge_error_log: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── Deletion archive record ──────────────────────────────────────────────────
export interface DeletionArchiveRecord {
  archive_id: number;
  student_id: number;
  phone_number_hash: string;
  full_name_anonymized: string;
  school_id: number | null;
  deletion_initiated_at: Date;
  deletion_confirmed_at: Date;
  deletion_completed_at: Date;
  retention_period_days: number;
  retention_expires_at: Date;
  reason_provided: string | null;
  created_at: Date;
}
