/**
 * `honors_awards` table — multiple rows per student.
 * Source: unilantern_sqlserver_part1_tables1to15.sql TABLE 11
 * Top 6 scored with diminishing-return weights. Hard cap: AWARDS_RAW_MAX = 10.0
 */

export const HONORS_AWARDS_TABLE = "honors_awards";

export const honorsAwardsColumns = {
  award_id:           "award_id",
  student_id:         "student_id",
  award_name:         "award_name",
  award_level:        "award_level",
  frequency:          "frequency",
  annual_since_grade: "annual_since_grade",
  display_order:      "display_order",
  created_at:         "created_at",
  updated_at:         "updated_at",
} as const;

export const HONORS_AWARDS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'honors_awards')
BEGIN
  CREATE TABLE honors_awards (
    award_id            INT IDENTITY(1,1)  NOT NULL,
    student_id          INT                NOT NULL
                           REFERENCES students(student_id) ON DELETE CASCADE,

    award_name          VARCHAR(350)       NOT NULL,
    award_level         VARCHAR(10)        NOT NULL
                           CONSTRAINT chk_ha_award_level
                           CHECK (award_level IN ('school','district','state','national')),
    frequency           VARCHAR(20)        NOT NULL DEFAULT 'one_time'
                           CONSTRAINT chk_ha_frequency
                           CHECK (frequency IN ('one_time','multiple_years','annual_since')),
    annual_since_grade  SMALLINT           NULL,
    display_order       SMALLINT           NOT NULL DEFAULT 0,

    created_at          DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at          DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_honors_awards PRIMARY KEY (award_id),
    CONSTRAINT chk_ha_annual_since_grade
      CHECK (annual_since_grade IS NULL OR annual_since_grade BETWEEN 9 AND 12),
    CONSTRAINT chk_ha_annual_since_required
      CHECK (frequency <> 'annual_since' OR annual_since_grade IS NOT NULL)
  );

  CREATE INDEX idx_awards_student_level
    ON honors_awards (student_id, award_level, display_order);
END;
`;
