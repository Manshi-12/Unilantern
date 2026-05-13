// ── Push token platform ──────────────────────────────────────────────────────
export type PushTokenPlatform = "ios" | "android" | "web";

// ── Push token record from the database ──────────────────────────────────────
export interface PushTokenRecord {
  push_token_id: number;
  user_id: number;
  user_role: string;
  device_token: string;
  platform: PushTokenPlatform;
  device_name: string | null;
  is_active: boolean;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
