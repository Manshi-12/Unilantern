// ── POST /students/me/push-token — Register push token ───────────────────────
export interface RegisterPushTokenDto {
  push_token: string;
  platform: "ios" | "android" | "web";
  device_id: string;
  device_name?: string;
}

// ── DELETE /students/me/push-token — Deregister push token ───────────────────
export interface DeregisterPushTokenDto {
  device_id: string;
}
