import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { AwardsRepository } from "./awards.repository.js";
import type { ScoresRepository } from "../academics/scores.repository.js";
import type { CreateAwardRequestDto, UpdateAwardRequestDto } from "./dto/request.dto.js";
import type { AwardResponseDto, AwardsListResponseDto } from "./dto/response.dto.js";
import type { AwardRecord } from "./awards.types.js";
import { queueScoreRecalculation } from "../scoring/scoring.orchestrator.js";

export class AwardsService {
  constructor(
    private readonly awardsRepo: AwardsRepository,
    private readonly scoresRepo: ScoresRepository,
  ) {}

  // 5.1 GET /students/me/awards
  async list(studentId: number): Promise<AwardsListResponseDto> {
    const records = await this.awardsRepo.findAllByStudentId(studentId);
    return {
      awards: records.map(this.toDto),
      total:  records.length,
    };
  }

  // 5.2 POST /students/me/awards
  async create(
    studentId: number,
    dto: CreateAwardRequestDto,
  ): Promise<AwardResponseDto & { score_recalc_queued: true }> {
    const record = await this.awardsRepo.create({
      student_id:         studentId,
      award_name:         dto.award_name.trim(),
      award_level:        dto.award_level,
      frequency:          dto.frequency,
      annual_since_grade: dto.annual_since_grade ?? null,
      display_order:      dto.display_order ?? 0,
    });

    queueScoreRecalculation(studentId, "awards");

    return { ...this.toDto(record), score_recalc_queued: true };
  }

  // 5.3 PUT /students/me/awards/:award_id
  async update(
    studentId: number,
    awardId: number,
    dto: UpdateAwardRequestDto,
  ): Promise<AwardResponseDto & { score_recalc_queued: true }> {
    const existing = await this.awardsRepo.findByIdAndStudent(awardId, studentId);
    if (!existing) {
      throw new AuthError(
        AuthErrorCode.AWARD_NOT_FOUND,
        "Award not found",
        404,
      );
    }

    const effectiveFrequency = dto.frequency ?? existing.frequency;
    const effectiveGrade =
      "annual_since_grade" in dto
        ? (dto.annual_since_grade ?? null)
        : existing.annual_since_grade;

    if (effectiveFrequency === "annual_since" && effectiveGrade == null) {
      throw new AuthError(
        AuthErrorCode.VALIDATION_ERROR,
        "annual_since_grade is required when frequency is 'annual_since'",
        422,
      );
    }

    const record = await this.awardsRepo.update(awardId, studentId, {
      award_name:         dto.award_name?.trim(),
      award_level:        dto.award_level,
      frequency:          dto.frequency,
      annual_since_grade: "annual_since_grade" in dto
        ? (dto.annual_since_grade ?? null)
        : undefined,
      display_order: dto.display_order,
    });

    queueScoreRecalculation(studentId, "awards");

    return { ...this.toDto(record), score_recalc_queued: true };
  }

  // 5.4 DELETE /students/me/awards/:award_id
  async remove(studentId: number, awardId: number): Promise<void> {
    const deleted = await this.awardsRepo.delete(awardId, studentId);
    if (!deleted) {
      throw new AuthError(
        AuthErrorCode.AWARD_NOT_FOUND,
        "Award not found",
        404,
      );
    }

    queueScoreRecalculation(studentId, "awards");
  }

  private toDto(record: AwardRecord): AwardResponseDto {
    return {
      award_id:           String(record.award_id),
      award_name:         record.award_name,
      award_level:        record.award_level,
      frequency:          record.frequency,
      annual_since_grade: record.annual_since_grade,
      display_order:      record.display_order,
      created_at:         record.created_at.toISOString(),
      updated_at:         record.updated_at.toISOString(),
    };
  }
}
