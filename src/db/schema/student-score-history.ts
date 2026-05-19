/**
 * `student_score_history` table — periodic readiness snapshots per student.
 * Source: unilantern_sqlserver_part1_tables1to15.sql TABLE 15
 */

export const STUDENT_SCORE_HISTORY_TABLE = "student_score_history";

export const studentScoreHistoryColumns = {
  history_id:              "history_id",
  student_id:              "student_id",
  snapshot_term:           "snapshot_term",
  grade_at_snapshot:       "grade_at_snapshot",
  total_score:             "total_score",
  readiness_band:          "readiness_band",
  academics_band:          "academics_band",
  ec_band:                 "ec_band",
  essay_band:              "essay_band",
  awards_band:             "awards_band",
  service_band:            "service_band",
  primary_limiter:         "primary_limiter",
  trend_direction:         "trend_direction",
  snapshot_at:             "snapshot_at",
} as const;

export const STUDENT_SCORE_HISTORY_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_score_history')
BEGIN
  CREATE TABLE student_score_history (
    history_id              INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    snapshot_term           VARCHAR(30)         NOT NULL,
    grade_at_snapshot       SMALLINT            NOT NULL,

    total_score             DECIMAL(6,2)        NULL,

    readiness_band          VARCHAR(25)         NULL
                                                CONSTRAINT chk_sh_readiness_band
                                                CHECK (readiness_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    academics_band          VARCHAR(25)         NULL
                                                CONSTRAINT chk_sh_academics_band
                                                CHECK (academics_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    ec_band                 VARCHAR(25)         NULL
                                                CONSTRAINT chk_sh_ec_band
                                                CHECK (ec_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    essay_band              VARCHAR(25)         NULL
                                                CONSTRAINT chk_sh_essay_band
                                                CHECK (essay_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    awards_band             VARCHAR(25)         NULL
                                                CONSTRAINT chk_sh_awards_band
                                                CHECK (awards_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    service_band            VARCHAR(25)         NULL
                                                CONSTRAINT chk_sh_service_band
                                                CHECK (service_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),

    primary_limiter         VARCHAR(60)         NULL,
    trend_direction         VARCHAR(10)         NULL
                                                CONSTRAINT chk_sh_trend_direction
                                                CHECK (trend_direction IN ('improving', 'declining', 'stable')),

    snapshot_at             DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_student_score_history PRIMARY KEY (history_id),
    CONSTRAINT chk_sh_grade
        CHECK (grade_at_snapshot BETWEEN 9 AND 12),
    CONSTRAINT chk_sh_total_score
        CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100)
  );
END;
`;
