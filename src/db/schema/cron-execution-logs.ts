/**
 * `cron_execution_logs` table — MSSQL / Azure SQL.
 *
 * Immutable log of every cron job execution for observability and debugging.
 */

export const CRON_EXECUTION_LOGS_TABLE = "cron_execution_logs";

export const cronExecutionLogsColumns = {
  log_id: "log_id",
  job_name: "job_name",
  status: "status",
  duration_ms: "duration_ms",
  result_summary: "result_summary",
  error_message: "error_message",
  error_stack: "error_stack",
  executed_at: "executed_at",
} as const;

export const CRON_EXECUTION_LOGS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'cron_execution_logs')
BEGIN
  CREATE TABLE cron_execution_logs (
    log_id          INT IDENTITY(1,1) PRIMARY KEY,
    job_name        VARCHAR(100) NOT NULL,
    status          VARCHAR(20) NOT NULL
                     CHECK (status IN ('success','failed')),
    duration_ms     INT NULL,
    result_summary  NVARCHAR(MAX) NULL,
    error_message   NVARCHAR(MAX) NULL,
    error_stack     NVARCHAR(MAX) NULL,
    executed_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

-- ── Index for job health queries ─────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.cron_execution_logs')
    AND name = 'idx_cron_logs_job_name'
)
BEGIN
  CREATE INDEX idx_cron_logs_job_name
    ON dbo.cron_execution_logs(job_name, executed_at DESC);
END;
`;
