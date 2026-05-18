// ── POST /students/me/push-token — Response ──────────────────────────────────
export interface RegisterPushTokenResponseDto {
  push_token_id: number;
  device_id: string;
  platform: string;
  device_name: string | null;
  registered: true;
}

// ── DELETE /students/me/push-token — Response ────────────────────────────────
export interface DeregisterPushTokenResponseDto {
  deregistered: true;
  device_id: string;
}
