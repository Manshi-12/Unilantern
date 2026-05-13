import { z } from "zod";

// ── POST /students/me/push-token — Register a device push token ──────────────
export const registerPushTokenSchema = z.object({
  device_token: z
    .string()
    .trim()
    .min(10, "device_token must be at least 10 characters")
    .max(500, "device_token must be at most 500 characters"),
  platform: z.enum(["ios", "android", "web"]),
  device_name: z
    .string()
    .trim()
    .max(200, "device_name must be 200 characters or fewer")
    .optional(),
});

// ── DELETE /students/me/push-token — Deregister a device push token ──────────
export const deregisterPushTokenSchema = z.object({
  device_token: z
    .string()
    .trim()
    .min(10, "device_token must be at least 10 characters")
    .max(500, "device_token must be at most 500 characters"),
});
