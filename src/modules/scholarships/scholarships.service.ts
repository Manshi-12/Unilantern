import { AuthError } from "../../shared/errors/auth-error.js";
import { ConflictError } from "../../shared/errors/conflict-error.js";
import { AuthErrorCode } from "../../shared/response/error-codes.js";
import type { ScholarshipsFilterRequestDto, SaveScholarshipRequestDto } from "./dto/request.dto.js";
import type {
  SaveScholarshipResponseDto,
  ScholarshipListResponseDto,
  ScholarshipPublicResponseDto,
  UnsaveScholarshipResponseDto,
} from "./dto/response.dto.js";
import type { ScholarshipsRepository } from "./scholarships.repository.js";
import type { ScholarshipRecord } from "./scholarships.types.js";

export class ScholarshipsService {
  constructor(private readonly scholarshipsRepo: ScholarshipsRepository) {}

  async list(studentId: number, dto: ScholarshipsFilterRequestDto): Promise<ScholarshipListResponseDto> {
    const graduationYear = await this.scholarshipsRepo.getGraduationYear(studentId);
    const page = await this.scholarshipsRepo.list({
      student_id: studentId,
      graduation_year: graduationYear,
      type: dto.type,
      college_id: dto.college_id,
      general_only: dto.general_only ?? false,
      sort: dto.sort,
      limit: dto.limit,
      cursor: dto.cursor,
    });

    return {
      data: page.scholarships.map((scholarship) => this.mapScholarship(scholarship)),
      next_cursor: page.nextCursor,
      has_more: page.hasMore,
      total: page.total,
    };
  }

  async getDetail(studentId: number, scholarshipId: number): Promise<ScholarshipPublicResponseDto> {
    const scholarship = await this.scholarshipsRepo.findActiveById(scholarshipId, studentId);
    if (!scholarship) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Scholarship not found or inactive", 404);
    }
    return this.mapScholarship(scholarship);
  }

  async save(studentId: number, dto: SaveScholarshipRequestDto): Promise<SaveScholarshipResponseDto> {
    const scholarship = await this.scholarshipsRepo.findActiveById(dto.scholarship_id, studentId);
    if (!scholarship) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Scholarship not found", 404);
    }

    if (await this.scholarshipsRepo.isSaved(studentId, dto.scholarship_id)) {
      throw new ConflictError("ALREADY_SAVED", "Scholarship already saved");
    }

    const saved = await this.scholarshipsRepo.save(studentId, dto.scholarship_id);
    return {
      saved_scholarship_id: saved.saved_scholarship_id,
      scholarship_id: saved.scholarship_id,
      saved_at: saved.saved_at.toISOString(),
    };
  }

  async unsave(studentId: number, savedId: number): Promise<UnsaveScholarshipResponseDto> {
    const deleted = await this.scholarshipsRepo.deleteSaved(studentId, savedId);
    if (deleted === 0) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Saved scholarship not found", 404);
    }
    return { deleted: true };
  }

  private mapScholarship(scholarship: ScholarshipRecord): ScholarshipPublicResponseDto {
    return {
      scholarship_id: scholarship.scholarship_id,
      scholarship_name: scholarship.scholarship_name,
      provider: scholarship.provider,
      college_id: scholarship.college_id,
      eligibility_summary: scholarship.eligibility_summary,
      deadline: scholarship.deadline ? scholarship.deadline.toISOString().slice(0, 10) : null,
      award_amount: scholarship.award_amount,
      application_link: scholarship.application_link,
      scholarship_type: scholarship.scholarship_type,
      is_saved: scholarship.is_saved,
    };
  }
}
