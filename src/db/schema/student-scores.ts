export const STUDENT_SCORES_TABLE = "student_scores";

export const STUDENT_SCORES_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_scores')
BEGIN
  CREATE TABLE student_scores (
    score_id    INT IDENTITY(1,1) NOT NULL,
    student_id  INT               NOT NULL
                   REFERENCES students(student_id) ON DELETE CASCADE,

    -- Academic sub-scores (Module 1 — 50 pts)
    gpa_norm              DECIMAL(5,4) NULL,
    rigor_norm            DECIMAL(5,4) NULL,
    test_norm             DECIMAL(5,4) NULL,
    test_present          BIT          NULL,
    gpa_contrib           DECIMAL(6,2) NULL,
    rigor_contrib         DECIMAL(6,2) NULL,
    test_contrib          DECIMAL(6,2) NULL,
    academics_contrib     DECIMAL(6,2) NULL,
    academics_cap_applied BIT          NULL,

    -- Awards sub-scores (Module 2A — 5 pts)
    awards_raw     DECIMAL(6,4) NULL,
    awards_norm    DECIMAL(5,4) NULL,
    awards_contrib DECIMAL(6,2) NULL,

    -- Community service sub-scores (Module 2B — 5 pts)
    service_norm    DECIMAL(5,4) NULL,
    service_contrib DECIMAL(6,2) NULL,

    -- Essay sub-scores (Module 3 — 15 pts)
    essay_norm    DECIMAL(5,4) NULL,
    essay_contrib DECIMAL(6,2) NULL,

    -- Aggregate (populated by full readiness engine — future modules)
    total_score    DECIMAL(6,2) NULL,
    readiness_band VARCHAR(30)  NULL,

    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_student_scores        PRIMARY KEY (score_id),
    CONSTRAINT uq_student_scores_student UNIQUE (student_id)
  );
END;
`;
