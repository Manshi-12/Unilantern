/**
 * `audit_logs` table — MSSQL / Azure SQL.
 * IMMUTABLE audit trail for ALL sensitive data access and changes.
 */

export const AUDIT_LOGS_TABLE = "audit_logs";

export const auditLogsColumns = {
  log_id: "log_id",
  actor_id: "actor_id", // Changed from actor_user_id
  actor_role: "actor_role",
  actor_school_id: "actor_school_id",
  action_type: "action_type",
  target_resource: "target_resource",
  metadata: "metadata",
  ip_address: "ip_address",
  user_agent: "user_agent",
  created_at: "created_at",
} as const;

export const AUDIT_LOGS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_logs')
BEGIN
  CREATE TABLE audit_logs (
    log_id                  BIGINT IDENTITY(1,1)            NOT NULL,
    actor_id                INT                 NOT NULL,
    actor_role              VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_al_actor_role
                                                CHECK (actor_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),
    actor_school_id         INT                 NULL,       -- snapshot of school at event time
    action_type             VARCHAR(80)         NOT NULL,
    target_resource         VARCHAR(150)        NULL,       -- e.g. 'student_profiles:42'
    metadata                NVARCHAR(MAX)       NOT NULL    DEFAULT '{}',
    ip_address              VARCHAR(50)         NULL,
    user_agent              NVARCHAR(MAX)       NULL,
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT pk_audit_logs PRIMARY KEY (log_id)
  );

  CREATE INDEX idx_audit_actor_created ON audit_logs(actor_id, actor_role, created_at DESC);
END;
`;
