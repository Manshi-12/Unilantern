// ── Step 1: Initiate deletion ────────────────────────────────────────────────
export interface InitiateDeletionDto {
  confirm_deletion: boolean;
  reason?: string;
}

// ── Step 2: Confirm deletion with OTP ────────────────────────────────────────
export interface ConfirmDeletionDto {
  confirmation_code: string;
}

// ── Step 3: Reactivate during cooldown ───────────────────────────────────────
export interface ReactivateAccountDto {
  confirm_reactivation: boolean;
}
