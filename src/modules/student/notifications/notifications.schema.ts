import { z } from "zod";

// ── Query params: GET /students/me/notifications ─────────────────────────────
export const listNotificationsQuerySchema = z.object({
  is_read: z
    .enum(["true", "false"])
    .optional(),
  type: z
    .string()
    .trim()
    .max(60)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .optional()
    .default("20"),
  cursor: z
    .string()
    .trim()
    .optional(),
});

// ── Path param: PATCH /students/me/notifications/:id/read ────────────────────
export const notificationIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Notification ID must be a positive integer"),
});

// ── Body: PUT /students/me/notifications/preferences ─────────────────────────
export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        notification_type: z
          .string()
          .trim()
          .min(1, "notification_type is required")
          .max(60),
        delivery_channel: z.enum(["in_app", "push", "email"]),
        enabled: z.boolean(),
      }),
    )
    .min(1, "At least one preference must be provided")
    .max(50, "Cannot update more than 50 preferences at once"),
});
