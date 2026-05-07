/**
 * `student_consents` table — MSSQL / Azure SQL.
 */

export const STUDENT_CONSENTS_TABLE = "student_consents";

export const studentConsentsColumns = {
  consent_id: "consent_id",
  student_id: "student_id", // Changed from user_id
  consent_type: "consent_type",
  status: "status",
  granted_at: "granted_at",
  revoked_at: "revoked_at",
  source: "source",
  version: "version",
  created_at: "created_at",
} as const;

export const STUDENT_CONSENTS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_consents')
BEGIN
  CREATE TABLE student_consents (
    consent_id              INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,
    consent_type            VARCHAR(60)         NOT NULL,
    status                  VARCHAR(20)         NOT NULL,   -- granted | revoked
    source                  VARCHAR(30)         NOT NULL,   -- signup | settings | admin
    version                 SMALLINT            NOT NULL    DEFAULT 1, -- policy version
    granted_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    revoked_at              DATETIMEOFFSET      NULL,       -- NULL until revoked
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT pk_student_consents PRIMARY KEY (consent_id),
    CONSTRAINT uq_consent_student_type
        UNIQUE (student_id, consent_type),
    CONSTRAINT chk_sc_status
        CHECK (status IN ('granted', 'revoked')),
    CONSTRAINT chk_sc_source
        CHECK (source IN ('signup', 'settings', 'admin')),
    CONSTRAINT chk_sc_revoked_at
        CHECK (status = 'granted' OR revoked_at IS NOT NULL)
  );

  CREATE INDEX idx_consents_student_type_status ON student_consents(student_id, consent_type, status);
END;
`;
