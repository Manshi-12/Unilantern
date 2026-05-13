/**
 * `student_essays` table — exactly ONE row per student (UNIQUE constraint).
 * Source: 03_ESSAY_MODULE.md §2
 * essay_text is stored here but NEVER returned in any GET response.
 * Status: not_started → drafted → revised → reviewed → finalized (forward-only)
 */

export const STUDENT_ESSAYS_TABLE = "student_essays";

export const studentEssaysColumns = {
  essay_id:               "essay_id",
  student_id:             "student_id",
  essay_prompt:           "essay_prompt",
  essay_text:             "essay_text",
  word_count:             "word_count",
  essay_status:           "essay_status",
  not_started_reason:     "not_started_reason",
  reviewer_type:          "reviewer_type",
  reviewer_confirmed:     "reviewer_confirmed",
  last_major_edit_at:     "last_major_edit_at",
  reflection_lock_until:  "reflection_lock_until",
  draft_saved_at:         "draft_saved_at",
  revised_at:             "revised_at",
  reviewed_at:            "reviewed_at",
  finalized_at:           "finalized_at",
  finalization_confirmed: "finalization_confirmed",
  previous_word_count:    "previous_word_count",
  edit_session_count:     "edit_session_count",
  repetition_detected:    "repetition_detected",
  created_at:             "created_at",
  updated_at:             "updated_at",
} as const;

export const STUDENT_ESSAYS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_essays')
BEGIN
  CREATE TABLE student_essays (
    essay_id                INT IDENTITY(1,1)  NOT NULL,
    student_id              INT                NOT NULL
                               REFERENCES students(student_id) ON DELETE CASCADE,

    essay_prompt            VARCHAR(MAX)       NULL,
    essay_text              VARCHAR(MAX)       NULL,

    word_count              INT                NOT NULL DEFAULT 0,

    essay_status            VARCHAR(20)        NOT NULL DEFAULT 'not_started'
                               CONSTRAINT chk_essay_status
                               CHECK (essay_status IN (
                                 'not_started','drafted','revised','reviewed','finalized'
                               )),

    not_started_reason      VARCHAR(20)        NULL
                               CONSTRAINT chk_not_started_reason
                               CHECK (not_started_reason IS NULL OR not_started_reason IN (
                                 'EMPTY','TOO_SHORT','NOT_SAVED','REPETITIVE'
                               )),

    reviewer_type           VARCHAR(10)        NULL
                               CONSTRAINT chk_reviewer_type
                               CHECK (reviewer_type IS NULL OR reviewer_type IN (
                                 'advisor','peer','mentor'
                               )),

    reviewer_confirmed      BIT                NOT NULL DEFAULT 0,

    last_major_edit_at      DATETIMEOFFSET     NULL,
    reflection_lock_until   DATETIMEOFFSET     NULL,
    draft_saved_at          DATETIMEOFFSET     NULL,
    revised_at              DATETIMEOFFSET     NULL,
    reviewed_at             DATETIMEOFFSET     NULL,
    finalized_at            DATETIMEOFFSET     NULL,

    finalization_confirmed  BIT                NOT NULL DEFAULT 0,
    previous_word_count     INT                NOT NULL DEFAULT 0,
    edit_session_count      INT                NOT NULL DEFAULT 0,
    repetition_detected     BIT                NOT NULL DEFAULT 0,

    created_at              DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET     NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_student_essays            PRIMARY KEY (essay_id),
    CONSTRAINT uq_student_essays_student    UNIQUE      (student_id)
  );

  CREATE INDEX idx_essay_student_status
    ON student_essays (student_id, essay_status);
END;
`;
