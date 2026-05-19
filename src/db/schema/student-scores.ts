export const STUDENT_SCORES_TABLE = "student_scores";

export const studentScoresColumns = {
  score_id:                   "score_id",
  student_id:                 "student_id",
  gpa_norm:                   "gpa_norm",
  rigor_norm:                 "rigor_norm",
  test_norm:                  "test_norm",
  test_present:               "test_present",
  gpa_contrib:                "gpa_contrib",
  rigor_contrib:              "rigor_contrib",
  test_contrib:               "test_contrib",
  academics_contrib:          "academics_contrib",
  academics_cap_applied:      "academics_cap_applied",
  ec_norm:                    "ec_norm",
  ec_contrib:                 "ec_contrib",
  ec_early_strength_bonus:    "ec_early_strength_bonus",
  essay_norm:                 "essay_norm",
  essay_contrib:              "essay_contrib",
  awards_raw:                 "awards_raw",
  awards_norm:                "awards_norm",
  awards_contrib:             "awards_contrib",
  service_norm:               "service_norm",
  service_contrib:            "service_contrib",
  total_score:                "total_score",
  readiness_band:             "readiness_band",
  on_track_status:            "on_track_status",
  academics_band:             "academics_band",
  ec_band:                    "ec_band",
  essay_band:                 "essay_band",
  awards_band:                "awards_band",
  service_band:               "service_band",
  exceptional_gate_met:       "exceptional_gate_met",
  foundational_floor_applied: "foundational_floor_applied",
  developing_floor_applied:   "developing_floor_applied",
  primary_limiter:            "primary_limiter",
  has_standout_awards:        "has_standout_awards",
  has_founder_ec:             "has_founder_ec",
  has_academic_strength:      "has_academic_strength",
  has_independent_impact:     "has_independent_impact",
  calculated_at:              "calculated_at",
  updated_at:                 "updated_at",
} as const;

export const STUDENT_SCORES_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_scores')
BEGIN
  CREATE TABLE student_scores (
    score_id                    INT IDENTITY(1,1)           NOT NULL,
    student_id                  INT                 NOT NULL
                                                        REFERENCES students (student_id)
                                                        ON DELETE CASCADE,

    gpa_norm                    DECIMAL(7,4)        NULL,
    rigor_norm                  DECIMAL(7,4)        NULL,
    test_norm                   DECIMAL(7,4)        NULL,
    test_present                BIT                 NULL,
    gpa_contrib                 DECIMAL(6,2)        NULL,
    rigor_contrib               DECIMAL(6,2)        NULL,
    test_contrib                DECIMAL(6,2)        NULL,
    academics_contrib           DECIMAL(6,2)        NULL,
    academics_cap_applied       BIT                 NOT NULL    DEFAULT 0,

    ec_norm                     DECIMAL(7,4)        NULL,
    ec_contrib                  DECIMAL(6,2)        NULL,
    ec_early_strength_bonus     DECIMAL(7,4)        NOT NULL    DEFAULT 0.0000,

    essay_norm                  DECIMAL(7,4)        NULL,
    essay_contrib               DECIMAL(6,2)        NULL,

    awards_raw                  DECIMAL(8,2)        NULL,
    awards_norm                 DECIMAL(7,4)        NULL,
    awards_contrib              DECIMAL(6,2)        NULL,

    service_norm                DECIMAL(7,4)        NULL,
    service_contrib             DECIMAL(6,2)        NULL,

    total_score                 DECIMAL(6,2)        NULL,

    readiness_band              VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_readiness_band
                                                        CHECK (readiness_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    on_track_status             VARCHAR(20)         NULL,

    academics_band              VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_academics_band
                                                        CHECK (academics_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    ec_band                     VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_ec_band
                                                        CHECK (ec_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    essay_band                  VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_essay_band
                                                        CHECK (essay_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    awards_band                 VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_awards_band
                                                        CHECK (awards_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    service_band                VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_service_band
                                                        CHECK (service_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),

    exceptional_gate_met        BIT                 NOT NULL    DEFAULT 0,
    foundational_floor_applied  BIT                 NOT NULL    DEFAULT 0,
    developing_floor_applied    BIT                 NOT NULL    DEFAULT 0,

    primary_limiter             VARCHAR(60)         NULL,

    has_standout_awards         BIT                 NOT NULL    DEFAULT 0,
    has_founder_ec              BIT                 NOT NULL    DEFAULT 0,
    has_academic_strength       BIT                 NOT NULL    DEFAULT 0,
    has_independent_impact      BIT                 NOT NULL    DEFAULT 0,

    calculated_at               DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at                  DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_student_scores PRIMARY KEY (score_id),
    CONSTRAINT uq_student_scores_student UNIQUE (student_id),
    CONSTRAINT chk_ss_total_score
        CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100),
    CONSTRAINT chk_ss_ec_bonus
        CHECK (ec_early_strength_bonus BETWEEN 0.0000 AND 0.0600)
  );
END;
`;
