/**
 * `push_tokens` table — MSSQL / Azure SQL.
 *
 * Stores FCM (Android) and APNs (iOS) device tokens for push notifications.
 * Tokens are marked inactive on delivery failure after 3 retries.
 */

export const PUSH_TOKENS_TABLE = "push_tokens";

export const pushTokensColumns = {
  push_token_id: "push_token_id",
  user_id: "user_id",
  user_role: "user_role",
  /** Stable app-reported device key (upsert key with user_id + user_role). */
  device_id: "device_id",
  push_token: "push_token",
  platform: "platform",
  device_name: "device_name",
  is_active: "is_active",
  last_used_at: "last_used_at",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const PUSH_TOKENS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'push_tokens')
BEGIN
  CREATE TABLE push_tokens (
    push_token_id  INT IDENTITY(1,1) PRIMARY KEY,
    user_id        INT NOT NULL,
    user_role      VARCHAR(30) NOT NULL
                    CHECK (user_role IN (
                      'student','advisor','school_admin','unilantern_admin'
                    )),
    device_id      VARCHAR(128) NULL,
    push_token     VARCHAR(500) NOT NULL,
    platform       VARCHAR(20) NOT NULL
                    CHECK (platform IN ('ios','android','web')),
    device_name    NVARCHAR(200) NULL,
    is_active      BIT NOT NULL DEFAULT 1,
    last_used_at   DATETIMEOFFSET NULL,
    created_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

-- ── push_token (rename from device_token if exists) ─────────────────────────
IF COL_LENGTH('dbo.push_tokens', 'device_token') IS NOT NULL
BEGIN
  EXEC sp_rename 'dbo.push_tokens.device_token', 'push_token', 'COLUMN';
END;

-- ── device_id (idempotent add for existing DBs) ─────────────────────────────
IF COL_LENGTH('dbo.push_tokens', 'device_id') IS NULL
BEGIN
  ALTER TABLE dbo.push_tokens ADD device_id VARCHAR(128) NULL;
END;

-- ── Legacy unique on token (drop when migrating to device_id upserts) ───────
IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.push_tokens')
    AND name = 'uidx_push_tokens_device'
)
BEGIN
  DROP INDEX uidx_push_tokens_device ON dbo.push_tokens;
END;

-- ── Unique: one row per logical device per user (filtered; NULL device_id = legacy rows) ─
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.push_tokens')
    AND name = 'uidx_push_tokens_user_device'
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX uidx_push_tokens_user_device
    ON dbo.push_tokens(user_id, user_role, device_id)
    WHERE device_id IS NOT NULL;
END;

-- ── Index for active token lookups ───────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.push_tokens')
    AND name = 'idx_push_tokens_active'
)
BEGIN
  CREATE INDEX idx_push_tokens_active
    ON dbo.push_tokens(user_id, user_role, is_active)
    WHERE is_active = 1;
END;
`;
