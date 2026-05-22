import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { AcademicsRepository } from "./academics.repository.js";
import type { ScoresRepository } from "./scores.repository.js";
import type { UpdateAcademicsRequestDto } from "./dto/request.dto.js";
import type { AcademicsResponseDto } from "./dto/response.dto.js";
import type { AcademicsRecord } from "./academics.types.js";
import { queueScoreRecalculation } from "../scoring/scoring.orchestrator.js";

export class AcademicsService {
  constructor(
    private readonly academicsRepo: AcademicsRepository,
    private readonly scoresRepo: ScoresRepository,
  ) {}

  async get(studentId: number): Promise<AcademicsResponseDto> {
    const record = await this.academicsRepo.findByStudentId(studentId);
    return this.toDto(record);
  }

  async update(
    studentId: number,
    dto: UpdateAcademicsRequestDto,
  ): Promise<AcademicsResponseDto> {
    const existing = await this.academicsRepo.findByStudentId(studentId);

    const merged = {
      student_id: studentId,
      unweighted_gpa: "unweighted_gpa" in dto ? (dto.unweighted_gpa ?? null) : (existing?.unweighted_gpa ?? null),
      course_rigor: "course_rigor" in dto ? (dto.course_rigor ?? null) : (existing?.course_rigor ?? null),
      sat_score: "sat_score" in dto ? (dto.sat_score ?? null) : (existing?.sat_score ?? null),
      act_score: "act_score" in dto ? (dto.act_score ?? null) : (existing?.act_score ?? null),
      test_status: dto.test_status ?? existing?.test_status ?? "no_test",
    };

    if (!("test_status" in dto)) {
      merged.test_status = merged.sat_score != null ? "sat" : merged.act_score != null ? "act" : "no_test";
    }

    if (merged.test_status === "no_test") {
      merged.sat_score = null;
      merged.act_score = null;
    }
    if (merged.test_status === "sat") {
      merged.act_score = null;
    }
    if (merged.test_status === "act") {
      merged.sat_score = null;
    }

    if (merged.sat_score != null && merged.act_score != null) {
      throw new AuthError(
        AuthErrorCode.VALIDATION_ERROR,
        "Only one test score allowed: provide either sat_score or act_score, not both",
        422,
      );
    }

    const record = await this.academicsRepo.upsert(merged);
    queueScoreRecalculation(studentId, "academics");

    return { ...this.toDto(record), score_recalc_queued: true };
  }

  private toDto(record: AcademicsRecord | null): AcademicsResponseDto {
    if (!record) {
      return {
        has_data: false,
        academics_id: null,
        unweighted_gpa: null,
        course_rigor: null,
        test_status: "no_test",
        sat_score: null,
        act_score: null,
        updated_at: null,
      };
    }
    return {
      has_data: true,
      academics_id: String(record.academics_id),
      unweighted_gpa: record.unweighted_gpa,
      course_rigor: record.course_rigor,
      test_status: record.test_status,
      sat_score: record.sat_score,
      act_score: record.act_score,
      updated_at: record.updated_at.toISOString(),
    };
  }
}
