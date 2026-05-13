/**
 * `notification_preferences` table — MSSQL / Azure SQL.
 *
 * Stores per-user, per-type, per-channel notification preferences.
 * Critical notifications cannot be disabled by the user.
 */

export const NOTIFICATION_PREFERENCES_TABLE = "notification_preferences";

export const notificationPreferencesColumns = {
  preference_id: "preference_id",
  recipient_id: "recipient_id",
  recipient_role: "recipient_role",
  notification_type: "notification_type",
  delivery_channel: "delivery_channel",
  enabled: "enabled",
  is_critical: "is_critical",
  quiet_hours_start: "quiet_hours_start",
  quiet_hours_end: "quiet_hours_end",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const NOTIFICATION_PREFERENCES_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notification_preferences')
BEGIN
  CREATE TABLE notification_preferences (
    preference_id      INT IDENTITY(1,1) PRIMARY KEY,
    recipient_id       INT NOT NULL,
    recipient_role     VARCHAR(30) NOT NULL
                        CHECK (recipient_role IN (
                          'student','advisor','school_admin','unilantern_admin'
                        )),
    notification_type  VARCHAR(60) NOT NULL,
    delivery_channel   VARCHAR(20) NOT NULL
                        CHECK (delivery_channel IN ('in_app','push','email')),
    enabled            BIT NOT NULL DEFAULT 1,
    is_critical        BIT NOT NULL DEFAULT 0,
    quiet_hours_start  TIME NULL,
    quiet_hours_end    TIME NULL,
    created_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at         DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

-- ── Unique constraint: one preference per recipient/type/channel ─────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.notification_preferences')
    AND name = 'uidx_notif_pref_unique'
)
BEGIN
  CREATE UNIQUE INDEX uidx_notif_pref_unique
    ON dbo.notification_preferences(recipient_id, recipient_role, notification_type, delivery_channel);
END;
`;
