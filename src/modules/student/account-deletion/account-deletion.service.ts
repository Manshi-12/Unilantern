import { createHash } from "node:crypto";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../../../shared/utils/otp.js";
import { maskPhone } from "../../../shared/utils/phone.js";

import type { AccountDeletionRepository } from "./account-deletion.repository.js";
import type { InitiateDeletionDto, ConfirmDeletionDto, ReactivateAccountDto } from "./dto/request.dto.js";
import type {
  InitiateDeletionResponseDto,
  ConfirmDeletionResponseDto,
  ReactivateAccountResponseDto,
  DeletionStatusResponseDto,
} from "./dto/response.dto.js";

// ── Constants ────────────────────────────────────────────────────────────────
const COOLDOWN_HOURS = 48;
const CONFIRMATION_WINDOW_MINUTES = 30;

export class AccountDeletionService {
  constructor(private readonly repo: AccountDeletionRepository) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Initiate Deletion  —  DELETE /students/me/account
  // ═══════════════════════════════════════════════════════════════════════════

  async initiateDeletion(
    studentId: number,
    dto: InitiateDeletionDto,
  ): Promise<InitiateDeletionResponseDto> {
    const student = await this.repo.findStudentForDeletion(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Student not found", 404);
    }

    // Can only initiate from active states
    if (student.account_status !== "independent" && student.account_status !== "school_linked") {
      throw new AuthError(
        AuthErrorCode.DELETION_ALREADY_INITIATED,
        "Account already has a pending deletion request or is not eligible",
        400,
      );
    }

    if (!dto.confirm_deletion) {
      throw new AuthError(
        AuthErrorCode.INVALID_CONFIRMATION_FLAG,
        "confirm_deletion must be true",
        400,
      );
    }

    // Generate OTP confirmation code
    const code = generateOtp();
    const codeHash = await hashOtp(code);

    // Mark account as deletion_pending
    await this.repo.initiateDeletion(studentId, codeHash, dto.reason ?? null);

    // Dispatch OTP (dev stub — logs to console)
    await this.dispatchDeletionOtp(student.phone_number, code);

    const now = new Date();
    const confirmationDeadline = new Date(now.getTime() + CONFIRMATION_WINDOW_MINUTES * 60_000);
    const reactivationDeadline = new Date(
      confirmationDeadline.getTime() + COOLDOWN_HOURS * 3600_000,
    );

    return {
      deletion_status: "pending_confirmation",
      message: "Deletion request initiated. Check your SMS for confirmation code.",
      confirmation_method: "sms",
      confirmation_deadline: confirmationDeadline.toISOString(),
      reactivation_window_hours: 48,
      details: {
        account_marked_as: "deletion_pending",
        data_remains_intact: true,
        can_reactivate_until: reactivationDeadline.toISOString(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Confirm Deletion  —  POST /students/me/account/confirm-deletion
  // ═══════════════════════════════════════════════════════════════════════════

  async confirmDeletion(
    studentId: number,
    dto: ConfirmDeletionDto,
  ): Promise<ConfirmDeletionResponseDto> {
    const student = await this.repo.findStudentForDeletion(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Student not found", 404);
    }

    if (student.account_status !== "deletion_pending") {
      throw new AuthError(
        AuthErrorCode.NO_PENDING_DELETION,
        "Account has no pending deletion request",
        400,
      );
    }

    // Check confirmation window
    if (
      !student.deletion_confirmation_expires_at ||
      student.deletion_confirmation_expires_at.getTime() < Date.now()
    ) {
      throw new AuthError(
        AuthErrorCode.CODE_EXPIRED,
        "Confirmation code has expired. Please initiate deletion again.",
        400,
      );
    }

    // Verify confirmation code
    if (!student.deletion_confirmation_token) {
      throw new AuthError(
        AuthErrorCode.NO_PENDING_DELETION,
        "No confirmation token found. Please initiate deletion again.",
        400,
      );
    }

    const isValid = await verifyOtpHash(dto.confirmation_code, student.deletion_confirmation_token);
    if (!isValid) {
      throw new AuthError(
        AuthErrorCode.CODE_INVALID,
        "Confirmation code does not match",
        400,
      );
    }

    // Confirm deletion — sets deletion_confirmed_at, clears token, sets 48h countdown
    await this.repo.confirmDeletion(studentId);

    const reactivationDeadline = new Date(Date.now() + COOLDOWN_HOURS * 3600_000);

    return {
      status: "confirmed",
      message: "Deletion confirmed. You can reactivate your account within 48 hours.",
      reactivation_deadline: reactivationDeadline.toISOString(),
      next_steps:
        "If you don't reactivate, your account will be permanently deleted after 48 hours.",
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Reactivate  —  POST /students/me/account/reactivate
  // ═══════════════════════════════════════════════════════════════════════════

  async reactivateAccount(
    studentId: number,
    dto: ReactivateAccountDto,
  ): Promise<ReactivateAccountResponseDto> {
    const student = await this.repo.findStudentForDeletion(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Student not found", 404);
    }

    if (student.account_status !== "deletion_pending") {
      throw new AuthError(
        AuthErrorCode.NO_PENDING_DELETION,
        "Account is not in deletion_pending state",
        400,
      );
    }

    if (!dto.confirm_reactivation) {
      throw new AuthError(
        AuthErrorCode.INVALID_CONFIRMATION_FLAG,
        "confirm_reactivation must be true",
        400,
      );
    }

    // Check if cooldown has expired (only if deletion was already confirmed)
    if (
      student.deletion_confirmed_at &&
      student.scheduled_hard_delete_at &&
      student.scheduled_hard_delete_at.getTime() < Date.now()
    ) {
      throw new AuthError(
        AuthErrorCode.REACTIVATION_WINDOW_CLOSED,
        "48-hour reactivation window has closed. Account cannot be reactivated.",
        400,
      );
    }

    // Determine original status
    const previousStatus = student.school_id !== null ? "school_linked" : "independent";

    await this.repo.reactivateAccount(studentId, previousStatus);

    return {
      status: "reactivated",
      message: "Your account is now active. Account deletion has been cancelled.",
      account_status: previousStatus,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Deletion Status  —  GET /students/me/account/deletion-status
  // ═══════════════════════════════════════════════════════════════════════════

  async getDeletionStatus(studentId: number): Promise<DeletionStatusResponseDto> {
    const student = await this.repo.findStudentForDeletion(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Student not found", 404);
    }

    return {
      account_status: student.account_status,
      deletion_pending: student.account_status === "deletion_pending",
      deletion_requested_at: student.deletion_requested_at?.toISOString() ?? null,
      deletion_confirmed_at: student.deletion_confirmed_at?.toISOString() ?? null,
      reactivation_deadline: student.scheduled_hard_delete_at?.toISOString() ?? null,
      scheduled_hard_delete_at: student.scheduled_hard_delete_at?.toISOString() ?? null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cron Job Helpers (called from scheduled jobs)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Job 1: Clear expired confirmation tokens (every 15 min) */
  async clearExpiredConfirmations(): Promise<number> {
    const count = await this.repo.clearExpiredConfirmations();
    if (count > 0) {
      console.log(`[cron:deletion] Cleared ${count} expired confirmation tokens`);
    }
    return count;
  }

  /** Job 2: Transition past-cooldown accounts to purge_scheduled (every 30 min) */
  async transitionPastCooldown(): Promise<number> {
    const accounts = await this.repo.findAccountsPastCooldown();
    let processed = 0;

    for (const account of accounts) {
      try {
        // Build purge manifest
        const manifest = JSON.stringify([
          { table: "student_profiles", student_id: account.student_id },
          { table: "student_academics", student_id: account.student_id },
          { table: "extracurricular_activities", student_id: account.student_id },
          { table: "honors_awards", student_id: account.student_id },
          { table: "student_essays", student_id: account.student_id },
          { table: "student_scores", student_id: account.student_id },
          { table: "student_score_history", student_id: account.student_id },
          { table: "student_saved_colleges", student_id: account.student_id },
          { table: "student_saved_scholarships", student_id: account.student_id },
          { table: "student_consents", student_id: account.student_id },
          { table: "notifications", student_id: account.student_id },
          { table: "notification_preferences", student_id: account.student_id },
        ]);

        await this.repo.enqueueForPurge(
          account.student_id,
          account.deletion_requested_at!,
          account.deletion_confirmed_at!,
          manifest,
        );

        processed++;
        console.log(`[cron:deletion] Enqueued student ${account.student_id} for purge`);
      } catch (err) {
        console.error(
          `[cron:deletion] Failed to enqueue student ${account.student_id}:`,
          err,
        );
      }
    }

    return processed;
  }

  /** Job 3: Execute hard deletes for purge-ready accounts (daily at 2 AM) */
  async executeHardDeletes(): Promise<number> {
    const entries = await this.repo.findQueueEntriesReadyForPurge();
    let completed = 0;

    for (const entry of entries) {
      try {
        await this.repo.markPurgeStarted(entry.deletion_queue_id);

        // Get student data for archival before deletion
        const student = await this.repo.findStudentForDeletion(entry.student_id);
        if (!student) {
          console.warn(
            `[cron:deletion] Student ${entry.student_id} not found, skipping hard delete`,
          );
          continue;
        }

        // Compute anonymized values
        const phoneHash = createHash("sha256")
          .update(student.phone_number)
          .digest("hex");
        const lastFour = student.phone_number.slice(-4);
        const anonymizedName = `Student_XXXX${lastFour}`;

        await this.repo.executeHardDelete(
          entry.student_id,
          entry.deletion_queue_id,
          phoneHash,
          anonymizedName,
          student.school_id,
          entry.deletion_initiated_at,
          entry.deletion_confirmed_at,
          student.deletion_reason,
        );

        completed++;
        console.log(
          `[cron:deletion] Hard delete completed for student ${entry.student_id}`,
        );
      } catch (err) {
        console.error(
          `[cron:deletion] Hard delete failed for queue entry ${entry.deletion_queue_id}:`,
          err,
        );
        // Do NOT retry automatically — requires manual intervention
      }
    }

    return completed;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async dispatchDeletionOtp(phone: string, code: string): Promise<void> {
    // STUB: replace with Twilio/SMS provider in production
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [deletion-otp:dev] phone=${maskPhone(phone)} code=${code}`;

    console.log("\n" + "🗑️".repeat(40));
    console.log(message);
    console.log("🗑️".repeat(40) + "\n");

    process.stdout.write(`\n🗑️ DELETION OTP: phone=${phone} code=${code}\n\n`);
  }
}
