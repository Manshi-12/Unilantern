/**
 * `student_academics` table — one row per student.
 * Source: unilantern_sqlserver_part1_tables1to15.sql TABLE 9
 */

export const STUDENT_ACADEMICS_TABLE = "student_academics";

export const studentAcademicsColumns = {
  academics_id:    "academics_id",
  student_id:      "student_id",
  unweighted_gpa:  "unweighted_gpa",
  course_rigor:    "course_rigor",
  sat_score:       "sat_score",
  act_score:       "act_score",
  created_at:      "created_at",
  updated_at:      "updated_at",
} as const;

export const STUDENT_ACADEMICS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_academics')
BEGIN
  CREATE TABLE student_academics (
    academics_id    INT IDENTITY(1,1)  NOT NULL,
    student_id      INT                NOT NULL
                       REFERENCES students(student_id) ON DELETE CASCADE,

    unweighted_gpa  DECIMAL(4,2)       NULL,
    course_rigor    VARCHAR(20)        NULL
                       CONSTRAINT chk_sa_course_rigor
                       CHECK (course_rigor IN ('standard','some_advanced','heavy_advanced','most_rigorous')),
    sat_score       SMALLINT           NULL,
    act_score       SMALLINT           NULL,

    created_at      DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at      DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_student_academics         PRIMARY KEY (academics_id),
    CONSTRAINT uq_student_academics_student UNIQUE      (student_id),
    CONSTRAINT chk_sa_gpa                  CHECK (unweighted_gpa BETWEEN 0.00 AND 4.00),
    CONSTRAINT chk_sa_sat                  CHECK (sat_score      BETWEEN 400  AND 1600),
    CONSTRAINT chk_sa_act                  CHECK (act_score      BETWEEN 1    AND 36),
    CONSTRAINT chk_sa_one_test_only        CHECK (
        NOT (sat_score IS NOT NULL AND act_score IS NOT NULL)
    )
  );
END;
`;
