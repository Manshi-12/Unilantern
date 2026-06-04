import { getPool, sql } from '../../../../database/db';
import {
  NotificationRow,
  NotificationPreferenceRow,
} from '../types/notifications.types';

import { INotificationsRepository } from '../interfaces/notifications.interface';

/**
 * NotificationsRepository
 *
 * Tables used:
 *   admin_notifications — notification_id, admin_id, type, title, message,
 *                         delivery_channel, is_read, created_at, deleted_at
 *   admin_notification_preferences — preference_id, admin_id, notification_type,
 *                                    enabled, delivery_channel, updated_at
 *
 * School Admin delivery channels: in_app | email (push is students only)
 * Soft-delete: all fetch queries filter WHERE deleted_at IS NULL
 */
export class NotificationsRepository implements INotificationsRepository {

  // ─── #45 List notifications — cursor-based pagination ─────────────────────

  async listNotifications(
    admin_id: number,
    limit:    number,
    cursor?:  number,
    is_read?: boolean,
  ): Promise<NotificationRow[]> {
    const pool    = await getPool();
    const request = pool.request()
      .input('admin_id', sql.Int, admin_id)
      .input('limit',    sql.Int, limit + 1);

    let whereClause = `WHERE admin_id = @admin_id AND deleted_at IS NULL`;

    if (cursor !== undefined) {
      request.input('cursor', sql.Int, cursor);
      whereClause += ` AND notification_id < @cursor`;
    }
    if (is_read !== undefined) {
      request.input('is_read', sql.Bit, is_read ? 1 : 0);
      whereClause += ` AND is_read = @is_read`;
    }

    const result = await request.query(`
      SELECT TOP (@limit)
        notification_id, admin_id, type, title, message,
        delivery_channel, is_read, created_at, deleted_at
      FROM admin_notifications
      ${whereClause}
      ORDER BY notification_id DESC
    `);

    return result.recordset.map(row => ({
      ...row,
      is_read: row.is_read === true || row.is_read === 1,
    }));
  }

  // ─── #46 Unread count ──────────────────────────────────────────────────────

  async getUnreadCount(admin_id: number): Promise<number> {
    const pool   = await getPool();
    const result = await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        SELECT COUNT(*) AS unread_count
        FROM admin_notifications
        WHERE admin_id   = @admin_id
          AND is_read    = 0
          AND deleted_at IS NULL
      `);
    return result.recordset[0].unread_count;
  }

  // ─── Find single notification ──────────────────────────────────────────────

  async findById(
    notification_id: number,
    admin_id:        number,
  ): Promise<NotificationRow | null> {
    const pool   = await getPool();
    const result = await pool.request()
      .input('notification_id', sql.Int, notification_id)
      .input('admin_id',        sql.Int, admin_id)
      .query(`
        SELECT TOP 1
          notification_id, admin_id, type, title, message,
          delivery_channel, is_read, created_at, deleted_at
        FROM admin_notifications
        WHERE notification_id = @notification_id
          AND admin_id        = @admin_id
          AND deleted_at      IS NULL
      `);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return { ...row, is_read: row.is_read === true || row.is_read === 1 };
  }

  // ─── #47 Mark single notification as read ─────────────────────────────────

  async markAsRead(notification_id: number, admin_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('notification_id', sql.Int, notification_id)
      .input('admin_id',        sql.Int, admin_id)
      .query(`
        UPDATE admin_notifications
        SET is_read = 1
        WHERE notification_id = @notification_id
          AND admin_id        = @admin_id
          AND deleted_at      IS NULL
      `);
  }

  // ─── #48 Mark all as read — scoped to admin_id ────────────────────────────

  async markAllAsRead(admin_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        UPDATE admin_notifications
        SET is_read = 1
        WHERE admin_id   = @admin_id
          AND is_read    = 0
          AND deleted_at IS NULL
      `);
  }

  // ─── #49 Soft delete single notification ──────────────────────────────────

  async softDelete(notification_id: number, admin_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('notification_id', sql.Int, notification_id)
      .input('admin_id',        sql.Int, admin_id)
      .query(`
        UPDATE admin_notifications
        SET deleted_at = GETDATE()
        WHERE notification_id = @notification_id
          AND admin_id        = @admin_id
          AND deleted_at      IS NULL
      `);
  }

  // ─── #50 Get notification preferences ─────────────────────────────────────

  async getPreferences(admin_id: number): Promise<NotificationPreferenceRow[]> {
    const pool   = await getPool();
    const result = await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        SELECT preference_id, admin_id, notification_type,
               enabled, delivery_channel, updated_at
        FROM admin_notification_preferences
        WHERE admin_id = @admin_id
        ORDER BY notification_type ASC
      `);
    return result.recordset.map(row => ({
      ...row,
      enabled: row.enabled === true || row.enabled === 1,
    }));
  }

  // ─── #51 & #52 Upsert single preference ───────────────────────────────────

  async upsertPreference(
    admin_id:          number,
    notification_type: string,
    enabled:           boolean,
    delivery_channel:  string,
  ): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('admin_id',          sql.Int,          admin_id)
      .input('notification_type', sql.VarChar(100),  notification_type)
      .input('enabled',           sql.Bit,           enabled ? 1 : 0)
      .input('delivery_channel',  sql.VarChar(50),   delivery_channel)
      .query(`
        MERGE admin_notification_preferences AS target
        USING (
          SELECT @admin_id AS admin_id,
                 @notification_type AS notification_type
        ) AS source
        ON target.admin_id           = source.admin_id
          AND target.notification_type = source.notification_type
        WHEN MATCHED THEN
          UPDATE SET
            enabled          = @enabled,
            delivery_channel = @delivery_channel,
            updated_at       = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (admin_id, notification_type, enabled, delivery_channel, updated_at)
          VALUES (@admin_id, @notification_type, @enabled, @delivery_channel, GETDATE());
      `);
  }
}




