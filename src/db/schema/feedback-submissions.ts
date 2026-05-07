/**
 * `feedback_submissions` table — MSSQL / Azure SQL.
 */

export const FEEDBACK_SUBMISSIONS_TABLE = "feedback_submissions";

export const feedbackSubmissionsColumns = {
  feedback_id: "feedback_id",
  submitter_id: "submitter_id",     // Changed from user_id
  submitter_role: "submitter_role", // Changed from user_role
  school_id: "school_id",
  feedback_type: "feedback_type",
  message: "message",
  screenshot_url: "screenshot_url",
  contact_consent: "contact_consent",
  page_or_screen: "page_or_screen",
  app_version: "app_version",
  device_type: "device_type",
  platform: "platform",
  status: "status",
  created_at: "created_at",
} as const;

export const FEEDBACK_SUBMISSIONS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'feedback_submissions')
BEGIN
  CREATE TABLE feedback_submissions (
    feedback_id             INT IDENTITY(1,1)               NOT NULL,
    submitter_id            INT                 NOT NULL,
    submitter_role          VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_fb_submitter_role
                                                CHECK (submitter_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),
    school_id               INT                 NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE SET NULL,
    feedback_type           VARCHAR(30)         NOT NULL,   -- bug | feature_request | confusing | other
    message                 NVARCHAR(MAX)       NOT NULL,
    screenshot_url          VARCHAR(500)        NULL,
    contact_consent         BIT                 NOT NULL    DEFAULT 0,
    page_or_screen          VARCHAR(150)        NULL,
    app_version             VARCHAR(50)         NULL,
    device_type             VARCHAR(80)         NULL,
    platform                VARCHAR(20)         NULL,       -- ios | android | web
    status                  VARCHAR(30)         NOT NULL    DEFAULT 'new',  -- new | in_review | planned | resolved
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT pk_feedback_submissions PRIMARY KEY (feedback_id),
    CONSTRAINT chk_fb_type
        CHECK (feedback_type IN ('bug', 'feature_request', 'confusing', 'other')),
    CONSTRAINT chk_fb_status
        CHECK (status IN ('new', 'in_review', 'planned', 'resolved')),
    CONSTRAINT chk_fb_platform
        CHECK (platform IS NULL OR platform IN ('ios', 'android', 'web'))
  );

  CREATE INDEX idx_feedback_submitter ON feedback_submissions(submitter_id, submitter_role, created_at DESC);
END;
`;
