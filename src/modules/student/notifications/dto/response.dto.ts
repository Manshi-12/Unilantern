// ── Notification item in list response ────────────────────────────────────────
export interface NotificationItemDto {
  notification_id: number;
  notification_type: string;
  title: string;
  message: string;
  delivery_channel: string;
  is_read: boolean;
  is_critical: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

// ── GET /students/me/notifications — Response ────────────────────────────────
export interface ListNotificationsResponseDto {
  notifications: NotificationItemDto[];
  unread_count: number;
  next_cursor: string | null;
  has_more: boolean;
}

// ── PATCH /students/me/notifications/:id/read — Response ─────────────────────
export interface MarkReadResponseDto {
  marked_read: true;
  notification_id: number;
}

// ── POST /students/me/notifications/mark-all-read — Response ─────────────────
export interface MarkAllReadResponseDto {
  marked_count: number;
}

// ── GET /students/me/notifications/unread-count — Response ───────────────────
export interface UnreadCountResponseDto {
  unread_count: number;
}

// ── Preference item ──────────────────────────────────────────────────────────
export interface PreferenceItemDto {
  notification_type: string;
  delivery_channel: string;
  enabled: boolean;
  is_critical: boolean;
}

// ── GET /students/me/notifications/preferences — Response ────────────────────
export interface ListPreferencesResponseDto {
  preferences: PreferenceItemDto[];
}

// ── PUT /students/me/notifications/preferences — Response ────────────────────
export interface UpdatePreferencesResponseDto {
  updated_count: number;
  skipped_critical: number;
}
