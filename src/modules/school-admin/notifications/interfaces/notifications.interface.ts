import {
    NotificationRow,
    NotificationPreferenceRow,
    PaginatedNotifications,
  } from '../types/notifications.types';
  
  // ── #45 List notifications ─────────────────────────────────────────────────────
  export interface ListNotificationsInput {
    admin_id: number;
    limit:    number;
    cursor?:  number;
    is_read?: boolean;
  }
  export type ListNotificationsResult = PaginatedNotifications;
  
  // ── #46 Unread count ───────────────────────────────────────────────────────────
  export interface UnreadCountResult {
    unread_count: number;
  }
  
  // ── #47 Mark as read ───────────────────────────────────────────────────────────
  export interface MarkAsReadInput {
    admin_id:        number;
    notification_id: number;
  }
  
  // ── #48 Mark all as read ───────────────────────────────────────────────────────
  export interface MarkAllAsReadInput {
    admin_id: number;
  }
  
  // ── #49 Delete notification ────────────────────────────────────────────────────
  export interface DeleteNotificationInput {
    admin_id:        number;
    notification_id: number;
  }
  
  // ── #50 Get preferences ────────────────────────────────────────────────────────
  export type GetPreferencesResult = NotificationPreferenceRow[];
  
  // ── #51 Bulk update preferences ────────────────────────────────────────────────
  export interface BulkUpdatePreferencesInput {
    admin_id:    number;
    preferences: {
      notification_type: string;
      enabled:           boolean;
      delivery_channel:  'in_app' | 'email';
    }[];
  }
  
  // ── #52 Update single preference ───────────────────────────────────────────────
  export interface UpdateSinglePreferenceInput {
    admin_id:          number;
    notification_type: string;
    enabled:           boolean;
    delivery_channel:  'in_app' | 'email';
  }
  
  // ── Repository contract ────────────────────────────────────────────────────────
  export interface INotificationsRepository {
    listNotifications(admin_id: number, limit: number, cursor?: number, is_read?: boolean): Promise<NotificationRow[]>;
    getUnreadCount(admin_id: number): Promise<number>;
    findById(notification_id: number, admin_id: number): Promise<NotificationRow | null>;
    markAsRead(notification_id: number, admin_id: number): Promise<void>;
    markAllAsRead(admin_id: number): Promise<void>;
    softDelete(notification_id: number, admin_id: number): Promise<void>;
    getPreferences(admin_id: number): Promise<NotificationPreferenceRow[]>;
    upsertPreference(admin_id: number, notification_type: string, enabled: boolean, delivery_channel: string): Promise<void>;
  }




