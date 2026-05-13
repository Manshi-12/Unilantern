import { sql, getPool } from "../../../db/client.js";
import { NOTIFICATIONS_TABLE } from "../../../db/schema/notifications.js";
import { NOTIFICATION_PREFERENCES_TABLE } from "../../../db/schema/notification-preferences.js";
import type {
  NotificationRecord,
  NotificationPreferenceRecord,
  NotificationChannel,
  RecipientRole,
} from "./notifications.types.js";

// ── Raw row types from MSSQL (actual DB column names) ────────────────────────

type RawNotificationRow = {
  notification_id: number;
  recipient_id: number;         // actual DB column name
  recipient_role: string;
  notification_type: string;
  title: string;
  message: string;
  delivery_channel: string;
  is_read: boolean;
  is_critical: boolean;
  read_at: Date | null;
  metadata: string | null;
  created_at: Date;
  updated_at: Date | null;
};

type RawPreferenceRow = {
  preference_id: number;
  recipient_id: number;
  recipient_role: string;
  notification_type: string;
  delivery_channel: string;
  enabled: boolean;
  is_critical: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: Date | null;
  updated_at: Date | null;
};

// Map DB rows to application-level types (normalises column name differences)
function mapNotification(row: RawNotificationRow): NotificationRecord {
  return {
    notification_id: row.notification_id,
    recipient_user_id: row.recipient_id,   // normalise to interface name
    recipient_role: row.recipient_role as RecipientRole,
    notification_type: row.notification_type,
    title: row.title,
    message: row.message,
    delivery_channel: row.delivery_channel as NotificationChannel,
    is_read: row.is_read,
    is_critical: row.is_critical,
    read_at: row.read_at,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

function mapPreference(row: RawPreferenceRow): NotificationPreferenceRecord {
  return {
    preference_id: row.preference_id,
    recipient_id: row.recipient_id,
    recipient_role: row.recipient_role as RecipientRole,
    notification_type: row.notification_type,
    delivery_channel: row.delivery_channel as NotificationChannel,
    enabled: row.enabled,
    is_critical: row.is_critical ?? false,
    quiet_hours_start: row.quiet_hours_start,
    quiet_hours_end: row.quiet_hours_end,
    created_at: row.created_at ?? new Date(),
    updated_at: row.updated_at ?? new Date(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Repository
// ═════════════════════════════════════════════════════════════════════════════

export class NotificationsRepository {

  // ── Insert a new notification ────────────────────────────────────────────

  async insertNotification(data: {
    recipient_user_id: number;
    recipient_role: RecipientRole;
    notification_type: string;
    title: string;
    message: string;
    delivery_channel: NotificationChannel;
    is_read: boolean;
    is_critical: boolean;
    metadata: string | null;
  }): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("recipient_id", sql.Int, data.recipient_user_id)
      .input("recipient_role", sql.VarChar(30), data.recipient_role)
      .input("notification_type", sql.VarChar(60), data.notification_type)
      .input("title", sql.VarChar(300), data.title)
      .input("message", sql.NVarChar(sql.MAX), data.message)
      .input("delivery_channel", sql.VarChar(20), data.delivery_channel)
      .input("is_read", sql.Bit, data.is_read)
      .input("is_critical", sql.Bit, data.is_critical)
      .input("metadata", sql.NVarChar(sql.MAX), data.metadata)
      .query<{ notification_id: number }>(
        `INSERT INTO ${NOTIFICATIONS_TABLE}
            (recipient_id, recipient_role, notification_type,
             title, message, delivery_channel, is_read, is_critical, metadata)
         OUTPUT INSERTED.notification_id
         VALUES
            (@recipient_id, @recipient_role, @notification_type,
             @title, @message, @delivery_channel, @is_read, @is_critical, @metadata);`,
      );
    return result.recordset[0].notification_id;
  }

  // ── List notifications (cursor-based pagination) ─────────────────────────

  async listNotifications(
    recipientId: number,
    recipientRole: RecipientRole,
    options: {
      isRead?: boolean;
      type?: string;
      limit: number;
      cursor?: string;
    },
  ): Promise<{ rows: NotificationRecord[]; hasMore: boolean }> {
    const pool = await getPool();
    const request = pool.request();
    request.input("recipient_id", sql.Int, recipientId);
    request.input("recipient_role", sql.VarChar(30), recipientRole);

    let where = `WHERE recipient_id = @recipient_id AND recipient_role = @recipient_role`;

    if (options.isRead !== undefined) {
      request.input("is_read", sql.Bit, options.isRead);
      where += ` AND is_read = @is_read`;
    }

    if (options.type) {
      request.input("type_filter", sql.VarChar(60), options.type);
      where += ` AND notification_type = @type_filter`;
    }

    if (options.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, "base64").toString("utf-8");
        const [, timestamp] = decoded.split(":");
        if (timestamp) {
          request.input("cursor_ts", sql.DateTimeOffset, new Date(timestamp));
          where += ` AND created_at < @cursor_ts`;
        }
      } catch {
        // Invalid cursor — ignore
      }
    }

    const fetchCount = options.limit + 1;
    request.input("fetch_count", sql.Int, fetchCount);

    const result = await request.query<RawNotificationRow>(
      `SELECT TOP (@fetch_count)
          notification_id, recipient_id, recipient_role,
          notification_type, title, message, delivery_channel,
          is_read, is_critical, read_at, metadata, created_at, updated_at
       FROM ${NOTIFICATIONS_TABLE}
       ${where}
       ORDER BY created_at DESC;`,
    );

    const hasMore = result.recordset.length > options.limit;
    const rows = result.recordset.slice(0, options.limit).map(mapNotification);
    return { rows, hasMore };
  }

  // ── Get unread count ─────────────────────────────────────────────────────

  async getUnreadCount(recipientId: number, recipientRole: RecipientRole): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("recipient_id", sql.Int, recipientId)
      .input("recipient_role", sql.VarChar(30), recipientRole)
      .query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt
         FROM ${NOTIFICATIONS_TABLE}
         WHERE recipient_id = @recipient_id
           AND recipient_role = @recipient_role
           AND is_read = 0;`,
      );
    return result.recordset[0]?.cnt ?? 0;
  }

  // ── Find a single notification (ownership check) ─────────────────────────

  async findNotificationById(notificationId: number): Promise<NotificationRecord | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("notification_id", sql.Int, notificationId)
      .query<RawNotificationRow>(
        `SELECT TOP 1
            notification_id, recipient_id, recipient_role,
            notification_type, title, message, delivery_channel,
            is_read, is_critical, read_at, metadata, created_at, updated_at
         FROM ${NOTIFICATIONS_TABLE}
         WHERE notification_id = @notification_id;`,
      );
    const row = result.recordset[0];
    return row ? mapNotification(row) : null;
  }

  // ── Mark single notification as read ─────────────────────────────────────

  async markAsRead(notificationId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("notification_id", sql.Int, notificationId)
      .query(
        `UPDATE ${NOTIFICATIONS_TABLE}
         SET is_read    = 1,
             read_at    = SYSDATETIMEOFFSET(),
             updated_at = SYSDATETIMEOFFSET()
         WHERE notification_id = @notification_id;`,
      );
  }

  // ── Mark all notifications as read ───────────────────────────────────────

  async markAllAsRead(recipientId: number, recipientRole: RecipientRole): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("recipient_id", sql.Int, recipientId)
      .input("recipient_role", sql.VarChar(30), recipientRole)
      .query(
        `UPDATE ${NOTIFICATIONS_TABLE}
         SET is_read    = 1,
             read_at    = SYSDATETIMEOFFSET(),
             updated_at = SYSDATETIMEOFFSET()
         WHERE recipient_id = @recipient_id
           AND recipient_role = @recipient_role
           AND is_read = 0;`,
      );
    return result.rowsAffected[0] ?? 0;
  }

  // ── List notification preferences ────────────────────────────────────────

  async listPreferences(
    recipientId: number,
    recipientRole: RecipientRole,
  ): Promise<NotificationPreferenceRecord[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("recipient_id", sql.Int, recipientId)
      .input("recipient_role", sql.VarChar(30), recipientRole)
      .query<RawPreferenceRow>(
        `SELECT preference_id, recipient_id, recipient_role,
                notification_type, delivery_channel, enabled,
                is_critical, quiet_hours_start, quiet_hours_end,
                created_at, updated_at
         FROM ${NOTIFICATION_PREFERENCES_TABLE}
         WHERE recipient_id = @recipient_id
           AND recipient_role = @recipient_role
         ORDER BY notification_type, delivery_channel;`,
      );
    return result.recordset.map(mapPreference);
  }

  // ── Upsert a preference ──────────────────────────────────────────────────

  async upsertPreference(data: {
    recipient_id: number;
    recipient_role: RecipientRole;
    notification_type: string;
    delivery_channel: NotificationChannel;
    enabled: boolean;
  }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("recipient_id", sql.Int, data.recipient_id)
      .input("recipient_role", sql.VarChar(30), data.recipient_role)
      .input("notification_type", sql.VarChar(60), data.notification_type)
      .input("delivery_channel", sql.VarChar(20), data.delivery_channel)
      .input("enabled", sql.Bit, data.enabled)
      .query(
        `MERGE ${NOTIFICATION_PREFERENCES_TABLE} AS target
         USING (SELECT @recipient_id  AS rid,
                       @recipient_role AS rrole,
                       @notification_type AS ntype,
                       @delivery_channel  AS dchan) AS source
         ON target.recipient_id       = source.rid
            AND target.recipient_role = source.rrole
            AND target.notification_type = source.ntype
            AND target.delivery_channel  = source.dchan
         WHEN MATCHED THEN
           UPDATE SET enabled = @enabled, updated_at = SYSDATETIMEOFFSET()
         WHEN NOT MATCHED THEN
           INSERT (recipient_id, recipient_role, notification_type, delivery_channel, enabled)
           VALUES (@recipient_id, @recipient_role, @notification_type, @delivery_channel, @enabled);`,
      );
  }

  // ── Check if preference is critical ──────────────────────────────────────

  async isPreferenceCritical(recipientId: number, notificationType: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("recipient_id", sql.Int, recipientId)
      .input("notification_type", sql.VarChar(60), notificationType)
      .query<{ is_critical: boolean }>(
        `SELECT TOP 1 is_critical
         FROM ${NOTIFICATION_PREFERENCES_TABLE}
         WHERE recipient_id = @recipient_id
           AND notification_type = @notification_type;`,
      );
    return result.recordset[0]?.is_critical === true;
  }

  // ── Get preference for a specific channel ────────────────────────────────

  async getChannelPreference(
    recipientId: number,
    recipientRole: RecipientRole,
    channel: NotificationChannel,
  ): Promise<{ enabled: boolean } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("recipient_id", sql.Int, recipientId)
      .input("recipient_role", sql.VarChar(30), recipientRole)
      .input("delivery_channel", sql.VarChar(20), channel)
      .query<{ enabled: boolean }>(
        `SELECT TOP 1 enabled
         FROM ${NOTIFICATION_PREFERENCES_TABLE}
         WHERE recipient_id = @recipient_id
           AND recipient_role = @recipient_role
           AND delivery_channel = @delivery_channel;`,
      );
    return result.recordset[0] ?? null;
  }

  // ── Check consent gating (student_consents table) ────────────────────────

  async checkStudentConsent(studentId: number, consentType: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .input("consent_type", sql.VarChar(60), consentType)
      .query<{ status: string }>(
        `SELECT TOP 1 status
         FROM student_consents
         WHERE student_id = @student_id
           AND consent_type = @consent_type;`,
      );
    return result.recordset.length > 0 && result.recordset[0].status === "granted";
  }

  // ── Check if duplicate notification already sent today ───────────────────

  async hasDuplicateToday(
    recipientId: number,
    notificationType: string,
    metadataKey?: string,
    metadataValue?: string,
  ): Promise<boolean> {
    const pool = await getPool();
    const request = pool.request();
    request.input("recipient_id", sql.Int, recipientId);
    request.input("notification_type", sql.VarChar(60), notificationType);

    let query = `
      SELECT TOP 1 1 as exists_flag
      FROM ${NOTIFICATIONS_TABLE}
      WHERE recipient_id = @recipient_id
        AND notification_type = @notification_type
        AND CAST(created_at AS DATE) = CAST(SYSDATETIMEOFFSET() AS DATE)`;

    if (metadataKey && metadataValue) {
      request.input("meta_value", sql.NVarChar(500), metadataValue);
      query += ` AND JSON_VALUE(metadata, '$.${metadataKey}') = @meta_value`;
    }

    const result = await request.query<{ exists_flag: number }>(query);
    return result.recordset.length > 0;
  }
}
