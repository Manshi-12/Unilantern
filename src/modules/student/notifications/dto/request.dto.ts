// ── GET /students/me/notifications — Query parameters ────────────────────────
export interface ListNotificationsQuery {
  is_read?: string;         // "true" | "false"
  type?: string;            // notification_type filter
  limit?: string;           // default "20", max "100"
  cursor?: string;          // base64 encoded cursor
}

// ── PUT /students/me/notifications/preferences — Request body ────────────────
export interface UpdatePreferencesDto {
  preferences: Array<{
    notification_type: string;
    delivery_channel: "in_app" | "push" | "email";
    enabled: boolean;
  }>;
}
