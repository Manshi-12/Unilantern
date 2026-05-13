// ── POST /students/me/push-token — Register push token ───────────────────────
export interface RegisterPushTokenDto {
  device_token: string;
  platform: "ios" | "android" | "web";
  device_name?: string;
}

// ── DELETE /students/me/push-token — Deregister push token ───────────────────
export interface DeregisterPushTokenDto {
  device_token: string;
}
