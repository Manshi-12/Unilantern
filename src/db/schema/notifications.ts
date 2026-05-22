/**
 * `notifications` table — MSSQL / Azure SQL.
 *
 * Stores all in-app notification records. Every notification starts as in_app;
 * push/email dispatch is handled asynchronously by the NotificationService.
 */

export const NOTIFICATIONS_TABLE = "notifications";

export const notificationsColumns = {
  notification_id: "notification_id",
  recipient_id: "recipient_id",
  recipient_role: "recipient_role",
  notification_type: "notification_type",
  title: "title",
  message: "message",
  delivery_channel: "delivery_channel",
  is_read: "is_read",
  is_critical: "is_critical",
  read_at: "read_at",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const NOTIFICATIONS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notifications')
BEGIN
  CREATE TABLE notifications (
    notification_id    INT IDENTITY(1,1) PRIMARY KEY,
    recipient_id       INT NOT NULL,
    recipient_role     VARCHAR(30) NOT NULL
                        CHECK (recipient_role IN (
                          'student','advisor','school_admin','unilantern_admin'
                        )),
    notification_type  VARCHAR(60) NOT NULL,
    title              NVARCHAR(500) NOT NULL,
    message            NVARCHAR(MAX) NOT NULL,
    delivery_channel   VARCHAR(20) NOT NULL DEFAULT 'in_app'
                        CHECK (delivery_channel IN ('in_app','push','email')),
    is_read            BIT NOT NULL DEFAULT 0,
    is_critical        BIT NOT NULL DEFAULT 0,
    read_at            DATETIMEOFFSET NULL,
    created_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

-- ── Indexes for query performance ────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.notifications')
    AND name = 'idx_notifications_recipient'
)
BEGIN
  CREATE INDEX idx_notifications_recipient
    ON dbo.notifications(recipient_id, recipient_role, created_at DESC);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.notifications')
    AND name = 'idx_notifications_unread'
)
BEGIN
  CREATE INDEX idx_notifications_unread
    ON dbo.notifications(recipient_id, is_read)
    WHERE is_read = 0;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.notifications')
    AND name = 'idx_notifications_type'
)
BEGIN
  CREATE INDEX idx_notifications_type
    ON dbo.notifications(notification_type, created_at DESC);
END;
`;
