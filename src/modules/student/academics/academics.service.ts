import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { AcademicsRepository } from "./academics.repository.js";
import type { ScoresRepository } from "./scores.repository.js";
import type { UpdateAcademicsRequestDto } from "./dto/request.dto.js";
import type { AcademicsResponseDto } from "./dto/response.dto.js";
import type { AcademicsRecord } from "./academics.types.js";
import { calcAcademicsScores } from "./academics.scorer.js";

export class AcademicsService {
  constructor(
    private readonly academicsRepo: AcademicsRepository,
    private readonly scoresRepo:    ScoresRepository,
  ) {}

  // 3.1 GET /students/me/academics
  async get(studentId: number): Promise<AcademicsResponseDto> {
    const record = await this.academicsRepo.findByStudentId(studentId);
    return this.toDto(record);
  }

  // 3.2 PUT /students/me/academics
  async update(
    studentId: number,
    dto: UpdateAcademicsRequestDto,
  ): Promise<AcademicsResponseDto> {
    const existing = await this.academicsRepo.findByStudentId(studentId);

    const merged = {
      student_id:     studentId,
      unweighted_gpa: "unweighted_gpa" in dto ? (dto.unweighted_gpa ?? null) : (existing?.unweighted_gpa ?? null),
      course_rigor:   "course_rigor"   in dto ? (dto.course_rigor   ?? null) : (existing?.course_rigor   ?? null),
      sat_score:      "sat_score" in dto ? (dto.sat_score ?? null) : (existing?.sat_score ?? null),
      act_score:      "act_score" in dto ? (dto.act_score ?? null) : (existing?.act_score ?? null),
    };

    // Post-merge cross-field validation: only one test score allowed (matches DB constraint).
    if (merged.sat_score != null && merged.act_score != null) {
      throw new AuthError(
        AuthErrorCode.VALIDATION_ERROR,
        "Only one test score allowed: provide either sat_score or act_score, not both",
        422,
      );
    }

    const record = await this.academicsRepo.upsert(merged);

    // Async scoring recalc — fire-and-forget, never blocks the HTTP response.
    // Errors are logged but do not affect the 200 response.
    setImmediate(() => {
      this.runAsyncScoring(studentId, record).catch((err) => {
        console.error(`[AcademicsService] async scoring failed for student ${studentId}:`, err);
      });
    });

    return { ...this.toDto(record), score_recalc_queued: true };
  }

  // Runs after the HTTP response is already sent.
  private async runAsyncScoring(studentId: number, record: AcademicsRecord): Promise<void> {
    const grade = await this.academicsRepo.findStudentGrade(studentId);

    // Need all inputs to produce meaningful scores; skip silently if any are missing.
    if (
      grade == null          ||
      record.unweighted_gpa  == null ||
      record.course_rigor    == null
    ) {
      return;
    }

    const scores = calcAcademicsScores(
      record.unweighted_gpa,
      record.course_rigor,
      record.sat_score,
      record.act_score,
      grade,
    );

    await this.scoresRepo.upsertAcademicsScores(studentId, scores);
  }

  private toDto(record: AcademicsRecord | null): AcademicsResponseDto {
    if (!record) {
      return {
        has_data:       false,
        academics_id:   null,
        unweighted_gpa: null,
        course_rigor:   null,
        sat_score:      null,
        act_score:      null,
        updated_at:     null,
      };
    }
    return {
      has_data:       true,
      academics_id:   String(record.academics_id),
      unweighted_gpa: record.unweighted_gpa,
      course_rigor:   record.course_rigor,
      sat_score:      record.sat_score,
      act_score:      record.act_score,
      updated_at:     record.updated_at.toISOString(),
    };
  }
}
