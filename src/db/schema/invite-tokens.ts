/**
 * `invite_tokens` table — MSSQL / Azure SQL.
 */

export const INVITE_TOKENS_TABLE = "invite_tokens";

export const inviteTokensColumns = {
  token_id: "token_id",
  school_id: "school_id",
  token: "token",
  max_uses: "max_uses",
  times_used: "times_used",
  is_active: "is_active",
  expires_at: "expires_at",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const INVITE_TOKENS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'invite_tokens')
BEGIN
  CREATE TABLE invite_tokens (
    token_id     INT IDENTITY(1,1) PRIMARY KEY,
    school_id    INT NOT NULL,
    token        VARCHAR(500) NOT NULL UNIQUE,
    max_uses     INT NOT NULL DEFAULT 1,
    times_used   INT NOT NULL DEFAULT 0,
    is_active    BIT NOT NULL DEFAULT 1,
    expires_at   DATETIMEOFFSET NULL,
    created_at   DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at   DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT FK_invite_tokens_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
  );
END;
`;
