// ── Step 1: Initiate deletion response ───────────────────────────────────────
export interface InitiateDeletionResponseDto {
  deletion_status: "pending_confirmation";
  message: string;
  confirmation_method: "sms";
  confirmation_deadline: string;
  reactivation_window_hours: 48;
  details: {
    account_marked_as: "deletion_pending";
    data_remains_intact: true;
    can_reactivate_until: string;
  };
}

// ── Step 2: Confirm deletion response ────────────────────────────────────────
export interface ConfirmDeletionResponseDto {
  status: "confirmed";
  message: string;
  reactivation_deadline: string;
  next_steps: string;
}

// ── Step 3: Reactivate response ──────────────────────────────────────────────
export interface ReactivateAccountResponseDto {
  status: "reactivated";
  message: string;
  account_status: "independent" | "school_linked";
}

// ── Deletion status check response ───────────────────────────────────────────
export interface DeletionStatusResponseDto {
  account_status: string;
  deletion_pending: boolean;
  deletion_requested_at: string | null;
  deletion_confirmed_at: string | null;
  reactivation_deadline: string | null;
  scheduled_hard_delete_at: string | null;
}
