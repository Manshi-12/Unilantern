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
      device_id: dto.device_id,
      push_token: dto.push_token,
      platform: dto.platform,
      device_name: dto.device_name ?? null,
    });

    console.log(
      `[PushTokensService] Registered push token #${pushTokenId} (${dto.platform}, device_id=${dto.device_id}) for student ${studentId}`,
    );

    return {
      push_token_id: pushTokenId,
      device_id: dto.device_id,
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
    const removed = await this.repo.deregisterToken(studentId, "student", dto.device_id);

    if (!removed) {
      throw new AuthError(
        AuthErrorCode.NOT_FOUND,
        "Push token not found or already deregistered",
        404,
      );
    }

    console.log(
      `[PushTokensService] Deregistered push token device_id=${dto.device_id} for student ${studentId}`,
    );

    return {
      deregistered: true,
      device_id: dto.device_id,
    };
  }
}
