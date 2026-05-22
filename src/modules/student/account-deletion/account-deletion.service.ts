import type { DeleteAccountRequestDto } from "./dto/request.dto.js";
import type { DeleteAccountResponseDto } from "./dto/response.dto.js";
import type { AccountDeletionRepository } from "./account-deletion.repository.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";

export class AccountDeletionService {
  constructor(private readonly repo: AccountDeletionRepository) {}

  async deleteAccount(
    userId: string,
    dto: DeleteAccountRequestDto,
  ): Promise<DeleteAccountResponseDto> {
    if (dto.confirmation !== "DELETE") {
      throw new AuthError(
        AuthErrorCode.CONFIRMATION_MISMATCH,
        "Confirmation must be exactly DELETE",
        400,
      );
    }

    const studentId = Number(userId);
    await this.repo.writeDeletionAuditLog(studentId);
    await this.repo.softDeleteUser(userId);
    await this.repo.revokeAllSessions(studentId);
    await this.repo.revokeAllActiveConsents(studentId);

    return {
      deleted: true,
      logout: true,
      message: "Your account has been deleted. You will be logged out.",
    };
  }
}
