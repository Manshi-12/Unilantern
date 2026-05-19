import type { DeleteAccountRequestDto } from "./dto/request.dto.js";
import type { DeleteAccountResponseDto } from "./dto/response.dto.js";
import type { AccountDeletionRepository } from "./account-deletion.repository.js";

export class AccountDeletionService {
  constructor(private readonly repo: AccountDeletionRepository) {}

  async deleteAccount(
    userId: string,
    _dto: DeleteAccountRequestDto,
  ): Promise<DeleteAccountResponseDto> {
    await this.repo.softDeleteUser(userId);

    return {
      deleted: true,
      message: "Your account has been deleted. You will be logged out.",
    };
  }
}
