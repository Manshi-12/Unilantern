// ─── Notification row ─────────────────────────────────────────────────────────
export interface NotificationRow {
    notification_id:  number;
    admin_id:         number;
    type:             string;
    title:            string;
    message:          string;
    delivery_channel: 'in_app' | 'email';
    is_read:          boolean;
    created_at:       string;
    deleted_at:       string | null;
  }
  
  // ─── Notification preference row ──────────────────────────────────────────────
  export interface NotificationPreferenceRow {
    preference_id:     number;
    admin_id:          number;
    notification_type: string;
    enabled:           boolean;
    delivery_channel:  'in_app' | 'email';
    updated_at:        string;
  }
  
  // ─── Paginated notifications response ─────────────────────────────────────────
  export interface PaginatedNotifications {
    data:        NotificationRow[];
    next_cursor: number | null;
    has_more:    boolean;
  }




