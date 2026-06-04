import { z } from 'zod';

// ─── GET /notifications — cursor pagination + is_read filter ──────────────────
export const listNotificationsSchema = z.object({
  cursor:  z.coerce.number().int().positive().optional(),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  is_read: z.enum(['true', 'false']).optional(),
});

// ─── PUT /notification-preferences/bulk ───────────────────────────────────────
export const bulkUpdatePreferencesSchema = z.object({
  preferences: z.array(z.object({
    notification_type: z.string().min(1),
    enabled:           z.boolean(),
    delivery_channel:  z.enum(['in_app', 'email']),  // push removed — not for school admin
  })).min(1),
});

// ─── PUT /notification-preferences/:type ──────────────────────────────────────
export const updateSinglePreferenceSchema = z.object({
  enabled:          z.boolean(),
  delivery_channel: z.enum(['in_app', 'email']),  // push removed — not for school admin
});

export type ListNotificationsDto      = z.infer<typeof listNotificationsSchema>;
export type BulkUpdatePreferencesDto  = z.infer<typeof bulkUpdatePreferencesSchema>;
export type UpdateSinglePreferenceDto = z.infer<typeof updateSinglePreferenceSchema>;




