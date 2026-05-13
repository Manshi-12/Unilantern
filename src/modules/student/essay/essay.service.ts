import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { EssayRepository } from "./essay.repository.js";
import type { AcademicsRepository } from "../academics/academics.repository.js";
import type { ScoresRepository } from "../academics/scores.repository.js";
import type {
  SaveContentRequestDto,
  AdvanceStatusRequestDto,
  ConfirmReviewerRequestDto,
} from "./dto/request.dto.js";
import type { EssayStateResponseDto } from "./dto/response.dto.js";
import type { EssayRecord, EssayStatus } from "./essay.types.js";
import {
  countWords,
  detectRepetition,
  checkEssayQualification,
  isMajorEdit,
  calcReflectionLockUntil,
  isReflectionLockSatisfied,
  calcEssayScores,
} from "./essay.scorer.js";

// Grades 9–10: essay module not available for input, but scored with neutral default
const ESSAY_AVAILABLE_FROM_GRADE = 11;

const STATUS_ORDER: EssayStatus[] = ["not_started", "drafted", "revised", "reviewed", "finalized"];

function statusIndex(s: EssayStatus): number {
  return STATUS_ORDER.indexOf(s);
}

export class EssayService {
  constructor(
    private readonly essayRepo:    EssayRepository,
    private readonly academicsRepo: AcademicsRepository,
    private readonly scoresRepo:   ScoresRepository,
  ) {}

  // 7.1 GET /students/me/essay
  async getState(studentId: number): Promise<EssayStateResponseDto> {
    const grade = await this.academicsRepo.findStudentGrade(studentId);
    if (grade !== null && grade < ESSAY_AVAILABLE_FROM_GRADE) {
      throw new AuthError(
        AuthErrorCode.ESSAY_NOT_AVAILABLE,
        "Essay module is available for Grade 11 and 12 only",
        403,
      );
    }

    const record = await this.essayRepo.findByStudentId(studentId);
    if (!record) {
      return this.emptyState();
    }
    return this.toDto(record);
  }

  // 7.2 PUT /students/me/essay/content
  async saveContent(
    studentId: number,
    dto: SaveContentRequestDto,
  ): Promise<EssayStateResponseDto> {
    await this.ensureEssayAvailable(studentId);

    // Ensure the row exists before updating
    await this.essayRepo.ensureExists(studentId);
    const existing = await this.essayRepo.findWithContentByStudentId(studentId);
    if (!existing) throw new Error("Essay row missing after ensureExists");

    // Reject content saves for finalized essays
    if (existing.essay_status === "finalized") {
      throw new AuthError(
        AuthErrorCode.ESSAY_ALREADY_FINALIZED,
        "Cannot edit a finalized essay",
        422,
      );
    }

    const newWordCount  = countWords(dto.essay_text);
    const prevWordCount = existing.word_count;
    const isFirstSave   = existing.draft_saved_at === null;

    const repetitionDetected = detectRepetition(dto.essay_text);

    // Major edit detection (≥50 word net change)
    const majorEdit = !isFirstSave && isMajorEdit(newWordCount, prevWordCount);
    const now        = new Date();
    const lastMajorEditAt    = majorEdit ? now : existing.last_major_edit_at;
    const reflectionLockUntil = majorEdit
      ? calcReflectionLockUntil(now)
      : existing.reflection_lock_until;

    // edit_session_count increments on every save AFTER the first
    const editSessionCount = isFirstSave
      ? existing.edit_session_count
      : existing.edit_session_count + 1;

    // draft_saved_at: set on first save
    const draftSavedAt = existing.draft_saved_at ?? now;

    // Re-evaluate status and reason based on current content
    const { qualified, not_started_reason } = checkEssayQualification(
      dto.essay_text,
      newWordCount,
      draftSavedAt,
      repetitionDetected,
    );

    // Status can only advance forward — if currently drafted or beyond, keep status
    let newStatus: EssayStatus = existing.essay_status;
    if (!qualified && statusIndex(existing.essay_status) < statusIndex("drafted")) {
      newStatus = "not_started";
    }

    const record = await this.essayRepo.saveContent(studentId, {
      essay_text:            dto.essay_text,
      essay_prompt:          dto.essay_prompt,
      word_count:            newWordCount,
      repetition_detected:   repetitionDetected,
      previous_word_count:   prevWordCount,
      edit_session_count:    editSessionCount,
      last_major_edit_at:    lastMajorEditAt,
      reflection_lock_until: reflectionLockUntil,
      draft_saved_at:        draftSavedAt,
      essay_status:          newStatus,
      not_started_reason:    qualified ? null : not_started_reason,
    });

    setImmediate(() => {
      this.runAsyncScoring(studentId, record.essay_status).catch((err) => {
        console.error(`[EssayService] async scoring failed for student ${studentId}:`, err);
      });
    });

    return { ...this.toDto(record), score_recalc_queued: true };
  }

  // 7.3 POST /students/me/essay/status/advance
  async advanceStatus(
    studentId: number,
    dto: AdvanceStatusRequestDto,
  ): Promise<EssayStateResponseDto> {
    await this.ensureEssayAvailable(studentId);

    const record = await this.essayRepo.findByStudentId(studentId);
    if (!record) {
      throw new AuthError(
        AuthErrorCode.ESSAY_PREREQ_NOT_MET,
        "No essay content saved yet",
        422,
      );
    }

    const target = dto.target_status;
    const current = record.essay_status;

    // Must advance exactly one step forward
    if (statusIndex(target) !== statusIndex(current) + 1) {
      throw new AuthError(
        AuthErrorCode.ESSAY_STATUS_INVALID,
        `Cannot advance from '${current}' to '${target}'`,
        422,
      );
    }

    this.assertPrerequisites(record, target);

    const now = new Date();
    const updated = await this.essayRepo.advanceStatus(studentId, {
      essay_status:       target,
      not_started_reason: null,
      draft_saved_at:     target === "drafted"  ? (record.draft_saved_at ?? now) : undefined,
      revised_at:         target === "revised"  ? now : undefined,
      reviewed_at:        target === "reviewed" ? now : undefined,
    });

    setImmediate(() => {
      this.runAsyncScoring(studentId, updated.essay_status).catch((err) => {
        console.error(`[EssayService] async scoring failed for student ${studentId}:`, err);
      });
    });

    return { ...this.toDto(updated), score_recalc_queued: true };
  }

  // 7.4 POST /students/me/essay/reviewer-confirm
  async confirmReviewer(
    studentId: number,
    dto: ConfirmReviewerRequestDto,
  ): Promise<EssayStateResponseDto> {
    await this.ensureEssayAvailable(studentId);

    const record = await this.essayRepo.findByStudentId(studentId);
    if (!record) {
      throw new AuthError(AuthErrorCode.ESSAY_PREREQ_NOT_MET, "No essay content saved yet", 422);
    }

    if (statusIndex(record.essay_status) < statusIndex("revised")) {
      throw new AuthError(
        AuthErrorCode.ESSAY_PREREQ_NOT_MET,
        "Essay must be in 'revised' status before confirming a reviewer",
        422,
      );
    }
    if (record.essay_status === "finalized") {
      throw new AuthError(AuthErrorCode.ESSAY_ALREADY_FINALIZED, "Essay is already finalized", 422);
    }

    const updated = await this.essayRepo.confirmReviewer(studentId, {
      reviewer_type:      dto.reviewer_type,
      reviewer_confirmed: true,
    });

    return this.toDto(updated);
  }

  // 7.5 POST /students/me/essay/finalize
  async finalizeEssay(studentId: number): Promise<EssayStateResponseDto> {
    await this.ensureEssayAvailable(studentId);

    const record = await this.essayRepo.findByStudentId(studentId);
    if (!record) {
      throw new AuthError(AuthErrorCode.ESSAY_PREREQ_NOT_MET, "No essay content saved yet", 422);
    }
    if (record.essay_status === "finalized") {
      throw new AuthError(AuthErrorCode.ESSAY_ALREADY_FINALIZED, "Essay is already finalized", 422);
    }
    if (record.essay_status !== "reviewed") {
      throw new AuthError(
        AuthErrorCode.ESSAY_PREREQ_NOT_MET,
        "Essay must be in 'reviewed' status before finalizing",
        422,
      );
    }

    const now = new Date();
    const updated = await this.essayRepo.finalize(studentId, {
      finalization_confirmed: true,
      essay_status:           "finalized",
      finalized_at:           now,
      not_started_reason:     null,
    });

    setImmediate(() => {
      this.runAsyncScoring(studentId, "finalized").catch((err) => {
        console.error(`[EssayService] async scoring failed for student ${studentId}:`, err);
      });
    });

    return { ...this.toDto(updated), score_recalc_queued: true };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async ensureEssayAvailable(studentId: number): Promise<void> {
    const grade = await this.academicsRepo.findStudentGrade(studentId);
    if (grade !== null && grade < ESSAY_AVAILABLE_FROM_GRADE) {
      throw new AuthError(
        AuthErrorCode.ESSAY_NOT_AVAILABLE,
        "Essay module is available for Grade 11 and 12 only",
        403,
      );
    }
  }

  private assertPrerequisites(record: EssayRecord, target: EssayStatus): void {
    switch (target) {
      case "drafted":
        if (record.word_count < 250 || !record.draft_saved_at) {
          throw new AuthError(
            AuthErrorCode.ESSAY_PREREQ_NOT_MET,
            "Essay must have at least 250 words and be saved before advancing to drafted",
            422,
          );
        }
        if (record.repetition_detected) {
          throw new AuthError(
            AuthErrorCode.ESSAY_PREREQ_NOT_MET,
            "Essay was flagged for repetitive content (REPETITIVE)",
            422,
          );
        }
        break;

      case "revised":
        if (record.essay_status !== "drafted") {
          throw new AuthError(AuthErrorCode.ESSAY_STATUS_INVALID, "Essay must be drafted first", 422);
        }
        if (record.edit_session_count < 1) {
          throw new AuthError(
            AuthErrorCode.ESSAY_PREREQ_NOT_MET,
            "At least one edit session is required after drafting",
            422,
          );
        }
        if (record.last_major_edit_at === null) {
          throw new AuthError(
            AuthErrorCode.ESSAY_PREREQ_NOT_MET,
            "At least one major edit (≥50 word change) is required before revising",
            422,
          );
        }
        break;

      case "reviewed":
        if (record.essay_status !== "revised") {
          throw new AuthError(AuthErrorCode.ESSAY_STATUS_INVALID, "Essay must be revised first", 422);
        }
        if (!record.reviewer_type || !record.reviewer_confirmed) {
          throw new AuthError(
            AuthErrorCode.ESSAY_PREREQ_NOT_MET,
            "Reviewer must be confirmed before advancing to reviewed",
            422,
          );
        }
        if (!isReflectionLockSatisfied(record.reflection_lock_until)) {
          throw new AuthError(
            AuthErrorCode.ESSAY_REFLECTION_LOCKED,
            "Essay is still within the 48-hour reflection lock period",
            422,
          );
        }
        break;
    }
  }

  private async runAsyncScoring(studentId: number, status: EssayStatus): Promise<void> {
    const grade = await this.academicsRepo.findStudentGrade(studentId);
    const effectiveGrade = grade ?? 11;
    const scores = calcEssayScores(status, effectiveGrade);
    await this.scoresRepo.upsertEssayScores(studentId, scores);
  }

  private emptyState(): EssayStateResponseDto {
    return {
      has_data:               false,
      essay_status:           "not_started",
      word_count:             0,
      reviewer_type:          null,
      reviewer_confirmed:     false,
      reflection_lock_until:  null,
      reflection_lock_active: false,
      draft_saved_at:         null,
      revised_at:             null,
      reviewed_at:            null,
      finalized_at:           null,
      finalization_confirmed: false,
      edit_session_count:     0,
      not_started_reason:     null,
    };
  }

  private toDto(record: EssayRecord): EssayStateResponseDto {
    const lockActive =
      record.reflection_lock_until !== null && !isReflectionLockSatisfied(record.reflection_lock_until);

    return {
      has_data:               true,
      essay_status:           record.essay_status,
      word_count:             record.word_count,
      reviewer_type:          record.reviewer_type,
      reviewer_confirmed:     record.reviewer_confirmed,
      reflection_lock_until:  record.reflection_lock_until?.toISOString() ?? null,
      reflection_lock_active: lockActive,
      draft_saved_at:         record.draft_saved_at?.toISOString()  ?? null,
      revised_at:             record.revised_at?.toISOString()      ?? null,
      reviewed_at:            record.reviewed_at?.toISOString()     ?? null,
      finalized_at:           record.finalized_at?.toISOString()    ?? null,
      finalization_confirmed: record.finalization_confirmed,
      edit_session_count:     record.edit_session_count,
      not_started_reason:     record.not_started_reason,
    };
  }
}
