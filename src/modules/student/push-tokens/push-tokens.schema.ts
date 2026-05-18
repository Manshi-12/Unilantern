import { z } from "zod";

/** Map legacy client field names to doc-aligned names before strict parse. */
function normalizeRegisterPushBody(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if ("device_token" in o && !("push_token" in o)) {
    o.push_token = o.device_token;
    delete o.device_token;
  }
  const legacyPlatform = o.device_type ?? o.platform;
  if (legacyPlatform !== undefined && typeof legacyPlatform === "string") {
    let p = legacyPlatform.trim().toLowerCase();
    if (p === "iphone" || p === "ipad") p = "ios";
    o.platform = p;
  }
  delete o.device_type;
  return o;
}

// ── POST /students/me/push-token — Register a device push token ──────────────
export const registerPushTokenSchema = z.preprocess(
  normalizeRegisterPushBody,
  z
    .object({
      push_token: z
        .string()
        .trim()
        .min(10, "push_token must be at least 10 characters")
        .max(500, "push_token must be at most 500 characters"),
      platform: z.enum(["ios", "android", "web"]),
      device_id: z
        .string()
        .trim()
        .min(1, "device_id is required")
        .max(128, "device_id must be at most 128 characters"),
      device_name: z
        .string()
        .trim()
        .max(200, "device_name must be 200 characters or fewer")
        .optional(),
    })
    .strict(),
);

// ── DELETE /students/me/push-token — Deregister by logical device id ─────────
export const deregisterPushTokenSchema = z
  .object({
    device_id: z
      .string()
      .trim()
      .min(1, "device_id is required")
      .max(128, "device_id must be at most 128 characters"),
  })
  .strict();
