import { NotificationsRepository }  from '../repositories/notifications.repository';
import {
  NotificationRow,
  NotificationPreferenceRow,
  PaginatedNotifications,
} from '../types/notifications.types';
import { BulkUpdatePreferencesDto }  from '../dto/bulk-update-preferences.dto';
import { UpdateSinglePreferenceDto } from '../dto/update-single-preference.dto';
import {
  ListNotificationsResult,
  UnreadCountResult,
  GetPreferencesResult,
} from '../interfaces/notifications.interface';

const repo = new NotificationsRepository();

const CRITICAL_TYPES = ['consent_change', 'security_alert'];

// ─── #45 List notifications ───────────────────────────────────────────────────

export const listNotifications = async (
  admin_id: number,
  limit:    number,
  cursor?:  number,
  is_read?: boolean,
): Promise<ListNotificationsResult> => {
  const rows        = await repo.listNotifications(admin_id, limit, cursor, is_read);
  const has_more    = rows.length > limit;
  const data        = has_more ? rows.slice(0, limit) : rows;
  const next_cursor = has_more ? data[data.length - 1].notification_id : null;
  return { data, next_cursor, has_more };
};

// ─── #46 Unread count ─────────────────────────────────────────────────────────

export const getUnreadCount = async (admin_id: number): Promise<UnreadCountResult> => {
  const unread_count = await repo.getUnreadCount(admin_id);
  return { unread_count };
};

// ─── #47 Mark single as read ──────────────────────────────────────────────────

export const markAsRead = async (admin_id: number, notification_id: number): Promise<void> => {
  const notification = await repo.findById(notification_id, admin_id);
  if (!notification) {
    const err: any = new Error('Notification not found.');
    err.statusCode = 404; err.code = 'NOTIFICATION_NOT_FOUND';
    throw err;
  }
  await repo.markAsRead(notification_id, admin_id);
};

// ─── #48 Mark all as read ─────────────────────────────────────────────────────

export const markAllAsRead = async (admin_id: number): Promise<void> => {
  await repo.markAllAsRead(admin_id);
};

// ─── #49 Delete notification (soft) ──────────────────────────────────────────

export const deleteNotification = async (admin_id: number, notification_id: number): Promise<void> => {
  const notification = await repo.findById(notification_id, admin_id);
  if (!notification) {
    const err: any = new Error('Notification not found.');
    err.statusCode = 404; err.code = 'NOTIFICATION_NOT_FOUND';
    throw err;
  }
  await repo.softDelete(notification_id, admin_id);
};

// ─── #50 Get preferences ──────────────────────────────────────────────────────

export const getPreferences = async (admin_id: number): Promise<GetPreferencesResult> => {
  return repo.getPreferences(admin_id);
};

// ─── #51 Bulk update preferences ─────────────────────────────────────────────

export const bulkUpdatePreferences = async (
  admin_id: number,
  body:     BulkUpdatePreferencesDto,
): Promise<NotificationPreferenceRow[]> => {
  for (const pref of body.preferences) {
    if (CRITICAL_TYPES.includes(pref.notification_type) && !pref.enabled) {
      const err: any = new Error(`Cannot disable critical notification: ${pref.notification_type}`);
      err.statusCode = 400; err.code = 'CRITICAL_NOTIFICATION_CANNOT_BE_DISABLED';
      throw err;
    }
    await repo.upsertPreference(admin_id, pref.notification_type, pref.enabled, pref.delivery_channel);
  }
  return repo.getPreferences(admin_id);
};

// ─── #52 Update single preference ────────────────────────────────────────────

export const updateSinglePreference = async (
  admin_id:          number,
  notification_type: string,
  body:              UpdateSinglePreferenceDto,
): Promise<NotificationPreferenceRow[]> => {
  if (CRITICAL_TYPES.includes(notification_type) && !body.enabled) {
    const err: any = new Error(`Cannot disable critical notification: ${notification_type}`);
    err.statusCode = 400; err.code = 'CRITICAL_NOTIFICATION_CANNOT_BE_DISABLED';
    throw err;
  }
  await repo.upsertPreference(admin_id, notification_type, body.enabled, body.delivery_channel);
  return repo.getPreferences(admin_id);
};




