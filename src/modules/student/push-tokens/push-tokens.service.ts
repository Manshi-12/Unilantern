import type { PushTokensRepository } from "./push-tokens.repository.js";
import type { RegisterPushTokenDto, DeregisterPushTokenDto } from "./dto/request.dto.js";
import type {
  RegisterPushTokenResponseDto,
  DeregisterPushTokenResponseDto,
} from "./dto/response.dto.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";

export class PushTokensService {
  constructor(private readonly repo: PushTokensRepository) {}

  // ── Register a push token ────────────────────────────────────────────────

  async registerToken(
    studentId: number,
    dto: RegisterPushTokenDto,
  ): Promise<RegisterPushTokenResponseDto> {
    const pushTokenId = await this.repo.registerToken({
      user_id: studentId,
      user_role: "student",
      device_token: dto.device_token,
      platform: dto.platform,
      device_name: dto.device_name ?? null,
    });

    console.log(
      `[PushTokensService] Registered push token #${pushTokenId} (${dto.platform}) for student ${studentId}`,
    );

    return {
      push_token_id: pushTokenId,
      platform: dto.platform,
      device_name: dto.device_name ?? null,
      registered: true,
    };
  }

  // ── Deregister a push token ──────────────────────────────────────────────

  async deregisterToken(
    studentId: number,
    dto: DeregisterPushTokenDto,
  ): Promise<DeregisterPushTokenResponseDto> {
    const removed = await this.repo.deregisterToken(
      studentId,
      "student",
      dto.device_token,
    );

    if (!removed) {
      throw new AuthError(
        AuthErrorCode.NOT_FOUND,
        "Push token not found or already deregistered",
        404,
      );
    }

    // Show only prefix for security
    const prefix = dto.device_token.slice(0, 8) + "...";

    console.log(
      `[PushTokensService] Deregistered push token ${prefix} for student ${studentId}`,
    );

    return {
      deregistered: true,
      device_token_prefix: prefix,
    };
  }
}
