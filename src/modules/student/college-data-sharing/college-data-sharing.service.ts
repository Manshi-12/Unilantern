import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { CollegeDataSharingRepository } from "./college-data-sharing.repository.js";
import type { UpdateCollegeDataSharingDto } from "./dto/request.dto.js";
import type { UpdateCollegeDataSharingResponseDto } from "./dto/response.dto.js";

export class CollegeDataSharingService {
  constructor(private readonly repo: CollegeDataSharingRepository) {}

  async updatePreference(
    studentId: number,
    dto: UpdateCollegeDataSharingDto,
  ): Promise<UpdateCollegeDataSharingResponseDto> {
    const row = await this.repo.updatePreference(studentId, dto.enabled);
    if (!row) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Student not found", 404);
    }

    console.log(
      `[CollegeDataSharingService] Student ${studentId} set college_data_sharing_enabled=${dto.enabled}`,
    );

    return {
      college_data_sharing_enabled: row.college_data_sharing_enabled,
      updated_at: row.updated_at.toISOString(),
    };
  }
}
