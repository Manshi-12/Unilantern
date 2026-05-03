-- =============================================================================
-- UNILANTERN — PRODUCTION DATABASE SCHEMA (SQL SERVER / T-SQL CONVERSION)
-- FILE 1 OF 2 : Tables 1–15
-- Auth (4 separate role tables) · OTP · Invite
-- Student Profile · Scoring Engine · Score History
-- Database   : Microsoft SQL Server 2019+ / Azure SQL Database
-- Converted from PostgreSQL 15+ by Senior Database Architect
-- =============================================================================
-- ARCHITECTURE DECISION (Tech Lead Directive):
--   Each role has its OWN dedicated auth table with a FIXED role column.
--   There is NO shared users table.
--   FK references in student-owned tables → students(student_id)
--   FK references in advisor-owned tables → advisor_auth(advisor_id)
--   FK references in school-admin-owned → school_admin_auth(school_admin_id)
--
-- Auth tables:
--   students              role = 'student'         (phone + OTP login)
--   advisor_auth          role = 'advisor'          (email + password login)
--   school_admin_auth     role = 'school_admin'     (email + password login)
--   unilantern_admin_auth role = 'unilantern_admin' (email + password login)
-- =============================================================================
-- CONVERSION NOTES:
--   • SERIAL            → INT IDENTITY(1,1)
--   • BIGSERIAL         → BIGINT IDENTITY(1,1)
--   • BOOLEAN           → BIT
--   • TIMESTAMPTZ       → DATETIMEOFFSET
--   • TIMESTAMP         → DATETIME2
--   • NOW()             → SYSDATETIMEOFFSET()
--   • JSONB             → NVARCHAR(MAX)
--   • INET              → VARCHAR(50)
--   • TEXT              → NVARCHAR(MAX)
--   • ENUM types        → VARCHAR with CHECK constraints
--   • PostgreSQL extensions (pgcrypto, pg_trgm, btree_gin) → removed
--   • GIN/GiST indexes  → standard SQL Server indexes (or omitted where N/A)
--   • Partial indexes (WHERE) → standard indexes
--   • COMMENT ON        → removed (not supported in SQL Server)
--   • Row Level Security → removed (implement via application layer or SQL Server RLS policies separately)
--   • INT[] arrays      → NVARCHAR(MAX) (store as JSON array)
--   • SMALLINT[]        → NVARCHAR(MAX) (store as JSON array)
--   • BEFORE UPDATE triggers using fn_set_updated_at → per-table AFTER UPDATE triggers in T-SQL
--   • DECIMAL(3,2)/DECIMAL(4,2) etc. → preserved exactly
-- =============================================================================
-- EXECUTION ORDER (strict — respect FK dependencies):
--   1.  schools                    2.  students
--   3.  advisor_auth               4.  school_admin_auth
--   5.  unilantern_admin_auth      6.  otp_verifications
--   7.  invite_tokens              8.  student_profiles
--   9.  student_academics         10.  extracurricular_activities
--  11.  honors_awards             12.  community_service_entries
--  13.  student_essays            14.  student_scores
--  15.  student_score_history
-- Run FILE 2 only AFTER this file completes without errors.
-- =============================================================================

SET NOCOUNT ON;
GO

-- =============================================================================
-- TABLE 1 — schools
-- Purpose : Master registry of registered school entities.
--           Students can exist WITHOUT a row here — they store a free-text
--           high_school_name in student_profiles.
--           A schools row is required only when advisor dashboards are enabled.
-- =============================================================================
CREATE TABLE schools (
    -- ── Identity ──────────────────────────────────────────────────────────────
    school_id               INT IDENTITY(1,1)               NOT NULL,

    -- ── Core identification ───────────────────────────────────────────────────
    school_name             VARCHAR(300)        NOT NULL,
    address                 VARCHAR(400)        NULL,
    city                    VARCHAR(150)        NULL,
    state                   VARCHAR(100)        NULL,   -- includes 'District of Columbia'
    zip_code                VARCHAR(20)         NULL,
    district                VARCHAR(300)        NULL,
    website_url             VARCHAR(500)        NULL,

    -- ── Registration & lifecycle ──────────────────────────────────────────────
    -- school_type: public | private | charter
    school_type             VARCHAR(10)         NULL
                                                CONSTRAINT chk_schools_school_type
                                                CHECK (school_type IN ('public', 'private', 'charter')),
    email_domain            VARCHAR(150)        NULL,   -- e.g. north.k12.edu (no @ prefix)
    -- school_status: trial | active | inactive
    school_status           VARCHAR(10)         NOT NULL    DEFAULT 'trial'
                                                CONSTRAINT chk_schools_school_status
                                                CHECK (school_status IN ('trial', 'active', 'inactive')),
    dashboard_enabled       BIT                 NOT NULL    DEFAULT 0,

    -- ── School-level band calibration (admin-controlled; all changes audit-logged) ─
    gpa_band_offset         DECIMAL(3,2)        NULL        DEFAULT 0.00,
    -- rigor_expectation: standard | some_advanced | heavy_advanced | most_rigorous
    rigor_expectation       VARCHAR(20)         NULL
                                                CONSTRAINT chk_schools_rigor_expectation
                                                CHECK (rigor_expectation IN ('standard', 'some_advanced', 'heavy_advanced', 'most_rigorous')),
    sat_benchmark           SMALLINT            NULL,
    act_benchmark           SMALLINT            NULL,

    -- ── Flags ─────────────────────────────────────────────────────────────────
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_schools PRIMARY KEY (school_id),
    CONSTRAINT chk_schools_gpa_offset
        CHECK (gpa_band_offset BETWEEN -0.50 AND 0.50)
);
GO

CREATE UNIQUE INDEX uidx_schools_email_domain
    ON schools (email_domain)
    WHERE email_domain IS NOT NULL;

CREATE INDEX idx_schools_status_active
    ON schools (school_status, is_active);

CREATE INDEX idx_schools_state
    ON schools (state);

-- NOTE: GIN trigram index (idx_schools_name_trgm) not supported in SQL Server.
-- Use SQL Server Full-Text Search on school_name for fuzzy/search functionality.
GO

-- Trigger to maintain updated_at on schools
CREATE TRIGGER trg_schools_upd
ON schools
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE schools
    SET updated_at = SYSDATETIMEOFFSET()
    FROM schools s
    INNER JOIN inserted i ON s.school_id = i.school_id;
END;
GO


-- =============================================================================
-- TABLE 2 — students
-- Purpose : Authentication table for STUDENTS ONLY.
--           Role is permanently fixed as 'student' — enforced by CHECK.
--           Phone number is the primary unique login identifier.
--           OTP-verified via otp_verifications. No email/password login.
-- =============================================================================
CREATE TABLE students (
    -- ── Identity ──────────────────────────────────────────────────────────────
    student_id              INT IDENTITY(1,1)               NOT NULL,

    -- ── School association (nullable until school-linked) ─────────────────────
    school_id               INT                             NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE SET NULL,

    -- ── Fixed role — NEVER changes ────────────────────────────────────────────
    role                    VARCHAR(10)         NOT NULL    DEFAULT 'student'
                                                CONSTRAINT chk_students_role
                                                CHECK (role = 'student'),

    -- ── Account lifecycle ─────────────────────────────────────────────────────
    -- account_status: independent | school_linked
    account_status          VARCHAR(15)         NOT NULL    DEFAULT 'independent'
                                                CONSTRAINT chk_students_account_status
                                                CHECK (account_status IN ('independent', 'school_linked')),
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Primary login credential (phone + OTP — no password) ─────────────────
    phone_number            VARCHAR(25)         NOT NULL,   -- E.164 e.g. +14155552671
    phone_verified          BIT                 NOT NULL    DEFAULT 0,

    -- ── Display ───────────────────────────────────────────────────────────────
    full_name               VARCHAR(200)        NOT NULL,

    -- ── Onboarding tracking ───────────────────────────────────────────────────
    invite_token_used       VARCHAR(500)        NULL,       -- token string used at sign-up
    last_login_at           DATETIMEOFFSET      NULL,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_students PRIMARY KEY (student_id),
    CONSTRAINT uq_students_phone UNIQUE (phone_number)
);
GO

CREATE INDEX idx_students_school
    ON students (school_id)
    WHERE school_id IS NOT NULL;

CREATE INDEX idx_students_status
    ON students (account_status, is_active);

CREATE INDEX idx_students_last_login
    ON students (last_login_at DESC)
    WHERE last_login_at IS NOT NULL;
GO

CREATE TRIGGER trg_students_upd
ON students
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE students
    SET updated_at = SYSDATETIMEOFFSET()
    FROM students s
    INNER JOIN inserted i ON s.student_id = i.student_id;
END;
GO


-- =============================================================================
-- TABLE 3 — advisor_auth
-- Purpose : Authentication table for ADVISORS / COUNSELORS ONLY.
--           Role is permanently fixed as 'advisor'.
--           Login: email + password (bcrypt/argon2). No phone/OTP.
--           Always scoped to exactly one school.
-- =============================================================================
CREATE TABLE advisor_auth (
    -- ── Identity ──────────────────────────────────────────────────────────────
    advisor_id              INT IDENTITY(1,1)               NOT NULL,

    -- ── School scope (mandatory — advisors always belong to one school) ───────
    school_id               INT                 NOT NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE NO ACTION,   -- ON DELETE RESTRICT equivalent

    -- ── Fixed role ────────────────────────────────────────────────────────────
    role                    VARCHAR(10)         NOT NULL    DEFAULT 'advisor'
                                                CONSTRAINT chk_advisor_auth_role
                                                CHECK (role = 'advisor'),

    -- ── Account lifecycle ─────────────────────────────────────────────────────
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Login credentials ─────────────────────────────────────────────────────
    email                   VARCHAR(320)        NOT NULL,   -- RFC 5321 max
    password_hash           VARCHAR(255)        NOT NULL,   -- bcrypt cost>=12 or argon2id

    -- ── Display ───────────────────────────────────────────────────────────────
    full_name               VARCHAR(200)        NOT NULL,

    -- ── Session tracking ──────────────────────────────────────────────────────
    last_login_at           DATETIMEOFFSET      NULL,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_advisor_auth PRIMARY KEY (advisor_id),
    CONSTRAINT uq_advisor_auth_email UNIQUE (email)
);
GO

CREATE INDEX idx_advisor_auth_school
    ON advisor_auth (school_id, is_active);

CREATE INDEX idx_advisor_auth_email
    ON advisor_auth (email);
GO

CREATE TRIGGER trg_advisor_auth_upd
ON advisor_auth
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE advisor_auth
    SET updated_at = SYSDATETIMEOFFSET()
    FROM advisor_auth aa
    INNER JOIN inserted i ON aa.advisor_id = i.advisor_id;
END;
GO


-- =============================================================================
-- TABLE 4 — school_admin_auth
-- Purpose : Authentication table for SCHOOL ADMINS ONLY.
--           Role is permanently fixed as 'school_admin'.
--           Login: email + password. Manages advisors, roster, and school config.
--           Always scoped to exactly one school.
-- =============================================================================
CREATE TABLE school_admin_auth (
    -- ── Identity ──────────────────────────────────────────────────────────────
    school_admin_id         INT IDENTITY(1,1)               NOT NULL,

    -- ── School scope (mandatory) ──────────────────────────────────────────────
    school_id               INT                 NOT NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE NO ACTION,   -- ON DELETE RESTRICT equivalent

    -- ── Fixed role ────────────────────────────────────────────────────────────
    role                    VARCHAR(20)         NOT NULL    DEFAULT 'school_admin'
                                                CONSTRAINT chk_school_admin_auth_role
                                                CHECK (role = 'school_admin'),

    -- ── Account lifecycle ─────────────────────────────────────────────────────
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Login credentials ─────────────────────────────────────────────────────
    email                   VARCHAR(320)        NOT NULL,
    password_hash           VARCHAR(255)        NOT NULL,

    -- ── Display ───────────────────────────────────────────────────────────────
    full_name               VARCHAR(200)        NOT NULL,

    -- ── Session tracking ──────────────────────────────────────────────────────
    last_login_at           DATETIMEOFFSET      NULL,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_school_admin_auth PRIMARY KEY (school_admin_id),
    CONSTRAINT uq_school_admin_auth_email UNIQUE (email)
);
GO

CREATE INDEX idx_school_admin_auth_school
    ON school_admin_auth (school_id, is_active);
GO

CREATE TRIGGER trg_school_admin_auth_upd
ON school_admin_auth
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE school_admin_auth
    SET updated_at = SYSDATETIMEOFFSET()
    FROM school_admin_auth sa
    INNER JOIN inserted i ON sa.school_admin_id = i.school_admin_id;
END;
GO


-- =============================================================================
-- TABLE 5 — unilantern_admin_auth
-- Purpose : Authentication table for UNILANTERN INTERNAL ADMINS ONLY.
--           Role is permanently fixed as 'unilantern_admin'.
--           Login: email + password. Not school-scoped. Platform-wide access.
--           MFA should be enforced at the application layer for this role.
-- =============================================================================
CREATE TABLE unilantern_admin_auth (
    -- ── Identity ──────────────────────────────────────────────────────────────
    admin_id                INT IDENTITY(1,1)               NOT NULL,

    -- ── Fixed role ────────────────────────────────────────────────────────────
    role                    VARCHAR(25)         NOT NULL    DEFAULT 'unilantern_admin'
                                                CONSTRAINT chk_unilantern_admin_auth_role
                                                CHECK (role = 'unilantern_admin'),

    -- ── Account lifecycle ─────────────────────────────────────────────────────
    is_active               BIT                 NOT NULL    DEFAULT 1,
    mfa_enabled             BIT                 NOT NULL    DEFAULT 0, -- enforce in production

    -- ── Login credentials ─────────────────────────────────────────────────────
    email                   VARCHAR(320)        NOT NULL,
    password_hash           VARCHAR(255)        NOT NULL,

    -- ── Display ───────────────────────────────────────────────────────────────
    full_name               VARCHAR(200)        NOT NULL,

    -- ── Session tracking ──────────────────────────────────────────────────────
    last_login_at           DATETIMEOFFSET      NULL,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_unilantern_admin_auth PRIMARY KEY (admin_id),
    CONSTRAINT uq_unilantern_admin_auth_email UNIQUE (email)
);
GO

CREATE INDEX idx_unilantern_admin_active
    ON unilantern_admin_auth (is_active);
GO

CREATE TRIGGER trg_unilantern_admin_upd
ON unilantern_admin_auth
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE unilantern_admin_auth
    SET updated_at = SYSDATETIMEOFFSET()
    FROM unilantern_admin_auth ua
    INNER JOIN inserted i ON ua.admin_id = i.admin_id;
END;
GO


-- =============================================================================
-- TABLE 6 — otp_verifications
-- Purpose : Server-side OTP records for student SMS phone verification.
--           Specific to students — advisors/admins use email+password only.
--           OTPs MUST be persisted so the server can compare the submitted code.
--           Nightly job purges rows where expires_at < SYSDATETIMEOFFSET() OR is_used = 1.
-- =============================================================================
CREATE TABLE otp_verifications (
    -- ── Identity ──────────────────────────────────────────────────────────────
    otp_id                  INT IDENTITY(1,1)               NOT NULL,

    -- ── Target phone ──────────────────────────────────────────────────────────
    phone_number            VARCHAR(25)         NOT NULL,   -- E.164 format
    -- purpose: signup | login | password_reset | phone_change
    purpose                 VARCHAR(15)         NOT NULL
                                                CONSTRAINT chk_otp_purpose
                                                CHECK (purpose IN ('signup', 'login', 'password_reset', 'phone_change')),

    -- ── Code (store hash — never plaintext) ───────────────────────────────────
    otp_code_hash           VARCHAR(255)        NOT NULL,   -- bcrypt of 6-digit code

    -- ── State & rate-limiting ──────────────────────────────────────────────────
    is_used                 BIT                 NOT NULL    DEFAULT 0,
    attempts                SMALLINT            NOT NULL    DEFAULT 0, -- block API after 5

    -- ── Expiry ────────────────────────────────────────────────────────────────
    expires_at              DATETIMEOFFSET      NOT NULL,   -- SYSDATETIMEOFFSET() + 10 minutes

    -- ── Audit ─────────────────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_otp_verifications PRIMARY KEY (otp_id),
    CONSTRAINT chk_otp_attempts CHECK (attempts >= 0)
);
GO

-- Partial index equivalent: only active (unused, unexpired) OTPs need fast lookup
-- SQL Server supports filtered indexes with WHERE clause
CREATE INDEX idx_otp_phone_expires
    ON otp_verifications (phone_number, expires_at)
    WHERE is_used = 0;
GO


-- =============================================================================
-- TABLE 7 — invite_tokens
-- Purpose : Tokens generated by school_admin_auth accounts to enforce
--           invite-only student sign-up.
--           max_uses = 1  → per-student CSV token (schema default; correct)
--           max_uses = 300–500 → school-wide link (set by application code)
-- =============================================================================
CREATE TABLE invite_tokens (
    -- ── Identity ──────────────────────────────────────────────────────────────
    token_id                INT IDENTITY(1,1)               NOT NULL,

    -- ── Ownership ─────────────────────────────────────────────────────────────
    school_id               INT                 NOT NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE CASCADE,
    created_by_school_admin_id INT              NULL
                                                REFERENCES school_admin_auth (school_admin_id)
                                                ON DELETE SET NULL,

    -- ── Token ─────────────────────────────────────────────────────────────────
    token                   VARCHAR(500)        NOT NULL,   -- generated UUID text

    -- ── Usage control ─────────────────────────────────────────────────────────
    max_uses                INT                 NOT NULL    DEFAULT 1,
    times_used              INT                 NOT NULL    DEFAULT 0,
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Expiry ────────────────────────────────────────────────────────────────
    expires_at              DATETIMEOFFSET      NULL,       -- NULL = no expiry

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_invite_tokens PRIMARY KEY (token_id),
    CONSTRAINT uq_invite_tokens_token UNIQUE (token),
    CONSTRAINT chk_invite_usage  CHECK (times_used <= max_uses),
    CONSTRAINT chk_invite_max    CHECK (max_uses BETWEEN 1 AND 10000)
);
GO

CREATE INDEX idx_invite_tokens_school_active
    ON invite_tokens (school_id, is_active);

CREATE INDEX idx_invite_tokens_expires
    ON invite_tokens (expires_at)
    WHERE expires_at IS NOT NULL AND is_active = 1;
GO

CREATE TRIGGER trg_invite_tokens_upd
ON invite_tokens
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE invite_tokens
    SET updated_at = SYSDATETIMEOFFSET()
    FROM invite_tokens it
    INNER JOIN inserted i ON it.token_id = i.token_id;
END;
GO


-- =============================================================================
-- TABLE 8 — student_profiles
-- Purpose : Core demographic record for each student.
--           high_school_name stores free-text entry for independent students
--           and is match key #3 in the account-linking flow.
--           school_id stays NULL until the student is formally linked.
--           References students(student_id).
-- NOTE: previous_school_ids stored as NVARCHAR(MAX) JSON array (e.g. '[1,2,3]')
--       because SQL Server does not have native integer array types.
-- =============================================================================
CREATE TABLE student_profiles (
    -- ── Identity ──────────────────────────────────────────────────────────────
    profile_id              INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── School association ────────────────────────────────────────────────────
    school_id               INT                 NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE SET NULL,
    high_school_name        VARCHAR(300)        NULL,       -- free-text; independent students

    -- ── Grade & graduation ────────────────────────────────────────────────────
    grade                   SMALLINT            NULL,       -- 9 | 10 | 11 | 12
    graduation_year         SMALLINT            NOT NULL,

    -- ── Location ──────────────────────────────────────────────────────────────
    state_of_residence      VARCHAR(100)        NULL,       -- includes 'District of Columbia'

    -- ── Consent data (age-gate only — NEVER in any API response) ──────────────
    date_of_birth           DATE                NULL,

    -- ── Onboarding progress ───────────────────────────────────────────────────
    profile_complete        BIT                 NOT NULL    DEFAULT 0,
    onboarding_step         SMALLINT            NOT NULL    DEFAULT 0,

    -- ── Transfer history ──────────────────────────────────────────────────────
    -- Stored as JSON array string, e.g. '[1,2,3]' (replaces PostgreSQL INT[])
    previous_school_ids     NVARCHAR(MAX)       NOT NULL    DEFAULT '[]',

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_profiles PRIMARY KEY (profile_id),
    CONSTRAINT uq_student_profiles_student UNIQUE (student_id),
    CONSTRAINT chk_sp_grade       CHECK (grade BETWEEN 9 AND 12),
    CONSTRAINT chk_sp_grad_year   CHECK (graduation_year BETWEEN 2020 AND 2040)
);
GO

CREATE INDEX idx_student_profiles_school
    ON student_profiles (school_id)
    WHERE school_id IS NOT NULL;

CREATE INDEX idx_student_profiles_grade
    ON student_profiles (grade, graduation_year);

-- NOTE: GIN trigram index (idx_student_profiles_hs_trgm) not supported in SQL Server.
-- Use SQL Server Full-Text Search on high_school_name for fuzzy search.
GO

CREATE TRIGGER trg_student_profiles_upd
ON student_profiles
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE student_profiles
    SET updated_at = SYSDATETIMEOFFSET()
    FROM student_profiles sp
    INNER JOIN inserted i ON sp.profile_id = i.profile_id;
END;
GO


-- =============================================================================
-- TABLE 9 — student_academics
-- Purpose : GPA, course rigor, and test score inputs for the scoring engine.
--           One record per student. Any UPDATE re-triggers score recalculation.
--           References students(student_id).
-- =============================================================================
CREATE TABLE student_academics (
    -- ── Identity ──────────────────────────────────────────────────────────────
    academics_id            INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── GPA ───────────────────────────────────────────────────────────────────
    unweighted_gpa          DECIMAL(4,2)        NULL,       -- 0.00–4.00

    -- ── Course rigor ──────────────────────────────────────────────────────────
    -- course_rigor: standard | some_advanced | heavy_advanced | most_rigorous
    course_rigor            VARCHAR(20)         NULL
                                                CONSTRAINT chk_sa_course_rigor
                                                CHECK (course_rigor IN ('standard', 'some_advanced', 'heavy_advanced', 'most_rigorous')),

    -- ── Standardised tests ────────────────────────────────────────────────────
    -- test_status: no_test | sat | act
    test_status             VARCHAR(10)         NULL
                                                CONSTRAINT chk_sa_test_status
                                                CHECK (test_status IN ('no_test', 'sat', 'act')),
    sat_score               SMALLINT            NULL,       -- 400–1600; NULL if not sat
    act_score               SMALLINT            NULL,       -- 1–36;    NULL if not act

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_academics PRIMARY KEY (academics_id),
    CONSTRAINT uq_student_academics_student UNIQUE (student_id),
    CONSTRAINT chk_sa_gpa               CHECK (unweighted_gpa  BETWEEN 0.00 AND 4.00),
    CONSTRAINT chk_sa_sat               CHECK (sat_score        BETWEEN 400  AND 1600),
    CONSTRAINT chk_sa_act               CHECK (act_score        BETWEEN 1    AND 36),
    CONSTRAINT chk_sa_sat_needs_status  CHECK (sat_score IS NULL OR test_status = 'sat'),
    CONSTRAINT chk_sa_act_needs_status  CHECK (act_score IS NULL OR test_status = 'act')
);
GO

CREATE TRIGGER trg_student_academics_upd
ON student_academics
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE student_academics
    SET updated_at = SYSDATETIMEOFFSET()
    FROM student_academics sa
    INNER JOIN inserted i ON sa.academics_id = i.academics_id;
END;
GO


-- =============================================================================
-- TABLE 10 — extracurricular_activities
-- Purpose : Student activity entries. Unlimited allowed; scored depth-first.
--
--   STUDENT-VISIBLE fields (return in student APIs):
--     activity_name, activity_type, years_involved, involvement_level,
--     activity_description, impact_text, impact_level, display_order
--
--   INTERNAL ONLY fields (NEVER in student-facing API responses):
--     hours_per_week, experience_duration_weeks, all *_toggle columns,
--     people_impacted, funds_raised, users_acquired, hours_delivered,
--     company_or_institution_count
-- =============================================================================
CREATE TABLE extracurricular_activities (
    -- ── Identity ──────────────────────────────────────────────────────────────
    activity_id                         INT IDENTITY(1,1)   NOT NULL,
    student_id                          INT                 NOT NULL
                                                                REFERENCES students (student_id)
                                                                ON DELETE CASCADE,

    -- ── Student-visible: core ─────────────────────────────────────────────────
    activity_name                       VARCHAR(250)        NOT NULL,
    -- activity_type: club | sport | job | family | project | research | other
    activity_type                       VARCHAR(10)         NOT NULL    DEFAULT 'other'
                                                                CONSTRAINT chk_ec_activity_type
                                                                CHECK (activity_type IN ('club', 'sport', 'job', 'family', 'project', 'research', 'other')),
    -- years_involved: less_than_1 | 1 | 2 | 3 | 4_plus
    years_involved                      VARCHAR(15)         NULL
                                                                CONSTRAINT chk_ec_years_involved
                                                                CHECK (years_involved IN ('less_than_1', '1', '2', '3', '4_plus')),
    -- involvement_level: explored | consistent | key_contributor | leader_founder
    involvement_level                   VARCHAR(20)         NULL
                                                                CONSTRAINT chk_ec_involvement_level
                                                                CHECK (involvement_level IN ('explored', 'consistent', 'key_contributor', 'leader_founder')),
    activity_description                VARCHAR(400)        NOT NULL,   -- 300-char UI limit + buffer
    impact_text                         VARCHAR(300)        NOT NULL,   -- 200-char UI limit + buffer
    -- impact_level: participation_only | contributed | measurable | created_scaled
    impact_level                        VARCHAR(20)         NULL
                                                                CONSTRAINT chk_ec_impact_level
                                                                CHECK (impact_level IN ('participation_only', 'contributed', 'measurable', 'created_scaled')),
    display_order                       SMALLINT            NOT NULL    DEFAULT 0,

    -- ── INTERNAL: time commitment — EXCLUDE from all student APIs ─────────────
    -- hours_per_week: under_2 | 2_to_5 | 6_to_10 | 11_to_20 | 20_plus
    hours_per_week                      VARCHAR(10)         NULL
                                                                CONSTRAINT chk_ec_hours_per_week
                                                                CHECK (hours_per_week IN ('under_2', '2_to_5', '6_to_10', '11_to_20', '20_plus')),

    -- ── INTERNAL: Path C duration guardrail ──────────────────────────────────
    experience_duration_weeks           SMALLINT            NULL,       -- 1–52; ongoing → 52

    -- ── INTERNAL: intensity_flag inputs (Path C qualification) ───────────────
    selective_acceptance_toggle         BIT                 NOT NULL    DEFAULT 0,
    external_org_toggle                 BIT                 NOT NULL    DEFAULT 0,
    travel_or_residency_toggle          BIT                 NOT NULL    DEFAULT 0,

    -- ── INTERNAL: Path B measurable outcome thresholds ───────────────────────
    people_impacted                     INT                 NOT NULL    DEFAULT 0,
    funds_raised                        INT                 NOT NULL    DEFAULT 0,
    users_acquired                      INT                 NOT NULL    DEFAULT 0,
    hours_delivered                     INT                 NOT NULL    DEFAULT 0,
    company_or_institution_count        SMALLINT            NOT NULL    DEFAULT 0,

    -- ── INTERNAL: Boolean outcome signals (Path B + C) ────────────────────────
    competition_top_10_pct_toggle       BIT                 NOT NULL    DEFAULT 0,
    finalist_or_winner_toggle           BIT                 NOT NULL    DEFAULT 0,
    publication_or_presented_toggle     BIT                 NOT NULL    DEFAULT 0,
    policy_or_partnership_toggle        BIT                 NOT NULL    DEFAULT 0,
    structured_deliverable_toggle       BIT                 NOT NULL    DEFAULT 0,
    language_or_skill_cert_toggle       BIT                 NOT NULL    DEFAULT 0,
    documented_real_world_output        BIT                 NOT NULL    DEFAULT 0,
    formal_selection_toggle             BIT                 NOT NULL    DEFAULT 0,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at                          DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at                          DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_extracurricular_activities PRIMARY KEY (activity_id),
    CONSTRAINT chk_ec_duration
        CHECK (experience_duration_weeks BETWEEN 1 AND 52)
);
GO

CREATE INDEX idx_ec_student_order
    ON extracurricular_activities (student_id, display_order);

CREATE INDEX idx_ec_involvement_impact
    ON extracurricular_activities (student_id, involvement_level, impact_level);
GO

CREATE TRIGGER trg_ec_upd
ON extracurricular_activities
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE extracurricular_activities
    SET updated_at = SYSDATETIMEOFFSET()
    FROM extracurricular_activities ea
    INNER JOIN inserted i ON ea.activity_id = i.activity_id;
END;
GO


-- =============================================================================
-- TABLE 11 — honors_awards
-- Purpose : Awards with prestige base scores and frequency multipliers.
--           Top 6 scored with diminishing-return weights.
--           Hard cap: AWARDS_RAW_MAX = 10.0 in the scoring engine.
-- =============================================================================
CREATE TABLE honors_awards (
    -- ── Identity ──────────────────────────────────────────────────────────────
    award_id                INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── Award details ─────────────────────────────────────────────────────────
    award_name              VARCHAR(350)        NOT NULL,
    -- award_level: school | district | state | national
    award_level             VARCHAR(10)         NOT NULL
                                                CONSTRAINT chk_ha_award_level
                                                CHECK (award_level IN ('school', 'district', 'state', 'national')),
    -- frequency: one_time | multiple_years | annual_since
    frequency               VARCHAR(20)         NOT NULL    DEFAULT 'one_time'
                                                CONSTRAINT chk_ha_frequency
                                                CHECK (frequency IN ('one_time', 'multiple_years', 'annual_since')),
    annual_since_grade      SMALLINT            NULL,       -- required when frequency = annual_since
    display_order           SMALLINT            NOT NULL    DEFAULT 0,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_honors_awards PRIMARY KEY (award_id),
    CONSTRAINT chk_ha_annual_since_grade
        CHECK (annual_since_grade IS NULL OR annual_since_grade BETWEEN 9 AND 12),
    CONSTRAINT chk_ha_annual_since_required
        CHECK (frequency <> 'annual_since' OR annual_since_grade IS NOT NULL)
);
GO

CREATE INDEX idx_awards_student_level
    ON honors_awards (student_id, award_level, display_order);
GO

CREATE TRIGGER trg_awards_upd
ON honors_awards
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE honors_awards
    SET updated_at = SYSDATETIMEOFFSET()
    FROM honors_awards ha
    INNER JOIN inserted i ON ha.award_id = i.award_id;
END;
GO


-- =============================================================================
-- TABLE 12 — community_service_entries
-- Purpose : Service entries. Top 2 action scores averaged; up to 3 scored.
--           duration_months guards against short-term inflation:
--           hours >= 200 AND duration_months < 6 → cap hours_norm at 0.85.
-- =============================================================================
CREATE TABLE community_service_entries (
    -- ── Identity ──────────────────────────────────────────────────────────────
    service_id              INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── Service details ───────────────────────────────────────────────────────
    -- total_hours_range: under_50 | 50_100 | 100_200 | 200_plus
    total_hours_range       VARCHAR(10)         NULL
                                                CONSTRAINT chk_cs_total_hours_range
                                                CHECK (total_hours_range IN ('under_50', '50_100', '100_200', '200_plus')),
    -- action_type: direct_service | organizing | teaching | fundraising | independent
    action_type             VARCHAR(15)         NULL
                                                CONSTRAINT chk_cs_action_type
                                                CHECK (action_type IN ('direct_service', 'organizing', 'teaching', 'fundraising', 'independent')),
    is_leadership           BIT                 NOT NULL    DEFAULT 0, -- +0.10 bonus
    duration_months         SMALLINT            NULL,                   -- inflation guardrail
    display_order           SMALLINT            NOT NULL    DEFAULT 0,

    -- ── Optional description (PENDING product confirmation) ───────────────────
    description             VARCHAR(400)        NULL,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_community_service_entries PRIMARY KEY (service_id),
    CONSTRAINT chk_cs_duration
        CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 120)
);
GO

CREATE INDEX idx_service_student
    ON community_service_entries (student_id, display_order);
GO

CREATE TRIGGER trg_service_upd
ON community_service_entries
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE community_service_entries
    SET updated_at = SYSDATETIMEOFFSET()
    FROM community_service_entries cs
    INNER JOIN inserted i ON cs.service_id = i.service_id;
END;
GO


-- =============================================================================
-- TABLE 13 — student_essays
-- Purpose : Full anti-gaming essay pipeline.
--           Rules enforced server-side:
--           • word_count >= 250 before any status advance
--           • 48-hr reflection lock after any >= 50-word net change
--           • reviewer_type + reviewer_confirmed required for Reviewed status
--           • essay_text NEVER returned without advisor_essay consent = granted
-- =============================================================================
CREATE TABLE student_essays (
    -- ── Identity ──────────────────────────────────────────────────────────────
    essay_id                INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── Content ───────────────────────────────────────────────────────────────
    essay_prompt            NVARCHAR(MAX)       NULL,
    essay_text              NVARCHAR(MAX)       NULL,       -- CONSENT-GATED; see comment
    word_count              INT                 NOT NULL    DEFAULT 0,

    -- ── Status pipeline ───────────────────────────────────────────────────────
    -- essay_status: not_started | drafted | revised | reviewed | finalized
    essay_status            VARCHAR(15)         NOT NULL    DEFAULT 'not_started'
                                                CONSTRAINT chk_se_essay_status
                                                CHECK (essay_status IN ('not_started', 'drafted', 'revised', 'reviewed', 'finalized')),
    -- not_started_reason: too_short | not_saved | repetitive | empty
    not_started_reason      VARCHAR(15)         NULL
                                                CONSTRAINT chk_se_not_started_reason
                                                CHECK (not_started_reason IN ('too_short', 'not_saved', 'repetitive', 'empty')),

    -- ── Milestone timestamps ──────────────────────────────────────────────────
    drafted_at              DATETIMEOFFSET      NULL,
    revised_at              DATETIMEOFFSET      NULL,
    reviewed_at             DATETIMEOFFSET      NULL,
    finalized_at            DATETIMEOFFSET      NULL,

    -- ── Anti-gaming: reflection lock ──────────────────────────────────────────
    last_major_edit_at      DATETIMEOFFSET      NULL,       -- reset on >= 50-word net delta
    reflection_lock_until   DATETIMEOFFSET      NULL,       -- = last_major_edit_at + 48h
    major_edit_word_delta   INT                 NOT NULL    DEFAULT 0,
    total_edit_sessions     INT                 NOT NULL    DEFAULT 0,
    edits_since_draft       INT                 NOT NULL    DEFAULT 0,

    -- ── Reviewer confirmation ─────────────────────────────────────────────────
    -- reviewer_type: peer | teacher | counselor | tutor | parent | other
    reviewer_type           VARCHAR(10)         NULL
                                                CONSTRAINT chk_se_reviewer_type
                                                CHECK (reviewer_type IN ('peer', 'teacher', 'counselor', 'tutor', 'parent', 'other')),
    reviewer_confirmed      BIT                 NOT NULL    DEFAULT 0,

    -- ── Finalization ──────────────────────────────────────────────────────────
    finalized_confirmed     BIT                 NOT NULL    DEFAULT 0,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_essays PRIMARY KEY (essay_id),
    CONSTRAINT uq_student_essays_student UNIQUE (student_id),
    CONSTRAINT chk_se_word_count    CHECK (word_count >= 0)
);
GO

CREATE TRIGGER trg_essays_upd
ON student_essays
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE student_essays
    SET updated_at = SYSDATETIMEOFFSET()
    FROM student_essays se
    INNER JOIN inserted i ON se.essay_id = i.essay_id;
END;
GO


-- =============================================================================
-- TABLE 14 — student_scores
-- Purpose : Complete internal scoring record. One row per student.
--
--   INTERNAL ONLY — NEVER expose outside UniLantern internal systems:
--     total_score, *_norm, *_contrib, *_raw, *_cap_applied, *_gate_met,
--     *_floor_applied, has_* columns
--
--   ADVISOR-VISIBLE (qualitative labels / enums ONLY — no numbers):
--     readiness_band, *_band, primary_limiter, on_track_status
-- =============================================================================
CREATE TABLE student_scores (
    -- ── Identity ──────────────────────────────────────────────────────────────
    score_id                    INT IDENTITY(1,1)           NOT NULL,
    student_id                  INT                 NOT NULL
                                                        REFERENCES students (student_id)
                                                        ON DELETE CASCADE,

    -- ── INTERNAL: Academic component ─────────────────────────────────────────
    gpa_norm                    DECIMAL(7,4)        NULL,
    rigor_norm                  DECIMAL(7,4)        NULL,
    test_norm                   DECIMAL(7,4)        NULL,
    test_present                BIT                 NULL,
    gpa_contrib                 DECIMAL(6,2)        NULL,   -- out of 28
    rigor_contrib               DECIMAL(6,2)        NULL,   -- out of 12
    test_contrib                DECIMAL(6,2)        NULL,   -- out of 10
    academics_contrib           DECIMAL(6,2)        NULL,   -- out of 50
    academics_cap_applied       BIT                 NOT NULL    DEFAULT 0,

    -- ── INTERNAL: Extracurricular component ──────────────────────────────────
    ec_norm                     DECIMAL(7,4)        NULL,
    ec_contrib                  DECIMAL(6,2)        NULL,   -- out of 25
    ec_early_strength_bonus     DECIMAL(7,4)        NOT NULL    DEFAULT 0.0000, -- 0–0.06 §4.4

    -- ── INTERNAL: Essay component ─────────────────────────────────────────────
    essay_norm                  DECIMAL(7,4)        NULL,
    essay_contrib               DECIMAL(6,2)        NULL,   -- out of 15

    -- ── INTERNAL: Awards component ────────────────────────────────────────────
    awards_raw                  DECIMAL(8,2)        NULL,
    awards_norm                 DECIMAL(7,4)        NULL,
    awards_contrib              DECIMAL(6,2)        NULL,   -- out of 5

    -- ── INTERNAL: Community service component ────────────────────────────────
    service_norm                DECIMAL(7,4)        NULL,
    service_contrib             DECIMAL(6,2)        NULL,   -- out of 5

    -- ── INTERNAL: Grand total — NEVER expose outside internal systems ─────────
    total_score                 DECIMAL(6,2)        NULL,   -- 0–100  INTERNAL ONLY

    -- ── EXTERNAL: What students / advisors / schools actually see ─────────────
    -- readiness_band: foundational | developing | competitive | strongly_competitive | exceptional
    readiness_band              VARCHAR(25)         NULL
                                                        CONSTRAINT chk_ss_readiness_band
                                                        CHECK (readiness_band IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),
    on_track_status             VARCHAR(20)         NULL,   -- on_track | ahead | NULL

    -- ── EXTERNAL: Per-category qualitative bands ──────────────────────────────
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

    -- ── INTERNAL: Gate & floor flags ─────────────────────────────────────────
    exceptional_gate_met        BIT                 NOT NULL    DEFAULT 0,
    foundational_floor_applied  BIT                 NOT NULL    DEFAULT 0,
    developing_floor_applied    BIT                 NOT NULL    DEFAULT 0,

    -- ── EXTERNAL: Advisor-visible label only ─────────────────────────────────
    primary_limiter             VARCHAR(60)         NULL,

    -- ── INTERNAL: Exceptional gate standout signals ───────────────────────────
    has_standout_awards         BIT                 NOT NULL    DEFAULT 0,
    has_founder_ec              BIT                 NOT NULL    DEFAULT 0,
    has_academic_strength       BIT                 NOT NULL    DEFAULT 0,
    has_independent_impact      BIT                 NOT NULL    DEFAULT 0,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    calculated_at               DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at                  DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_scores PRIMARY KEY (score_id),
    CONSTRAINT uq_student_scores_student UNIQUE (student_id),
    CONSTRAINT chk_ss_total_score
        CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100),
    CONSTRAINT chk_ss_ec_bonus
        CHECK (ec_early_strength_bonus BETWEEN 0.0000 AND 0.0600)
);
GO

CREATE INDEX idx_scores_band_student
    ON student_scores (readiness_band, student_id);

CREATE INDEX idx_scores_limiter
    ON student_scores (primary_limiter)
    WHERE primary_limiter IS NOT NULL;

CREATE INDEX idx_scores_calculated
    ON student_scores (calculated_at DESC);
GO

CREATE TRIGGER trg_scores_upd
ON student_scores
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE student_scores
    SET updated_at = SYSDATETIMEOFFSET()
    FROM student_scores ss
    INNER JOIN inserted i ON ss.score_id = i.score_id;
END;
GO


-- =============================================================================
-- TABLE 15 — student_score_history
-- Purpose : Periodic band snapshots per student per term.
--           Powers trend_direction and longitudinal analytics.
-- =============================================================================
CREATE TABLE student_score_history (
    -- ── Identity ──────────────────────────────────────────────────────────────
    history_id              INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── Snapshot context ──────────────────────────────────────────────────────
    snapshot_term           VARCHAR(30)         NOT NULL,   -- e.g. 'Fall_2025'
    grade_at_snapshot       SMALLINT            NOT NULL,

    -- ── INTERNAL: Numeric snapshot ────────────────────────────────────────────
    total_score             DECIMAL(6,2)        NULL,       -- INTERNAL ONLY

    -- ── External: band values at snapshot ────────────────────────────────────
    -- readiness_band: foundational | developing | competitive | strongly_competitive | exceptional
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

    -- ── Trend ─────────────────────────────────────────────────────────────────
    primary_limiter         VARCHAR(60)         NULL,
    -- trend_direction: improving | declining | stable
    trend_direction         VARCHAR(10)         NULL
                                                CONSTRAINT chk_sh_trend_direction
                                                CHECK (trend_direction IN ('improving', 'declining', 'stable')),

    -- ── Timestamp ─────────────────────────────────────────────────────────────
    snapshot_at             DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_score_history PRIMARY KEY (history_id),
    CONSTRAINT chk_sh_grade
        CHECK (grade_at_snapshot BETWEEN 9 AND 12),
    CONSTRAINT chk_sh_total_score
        CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100)
);
GO

CREATE INDEX idx_score_history_student_snap
    ON student_score_history (student_id, snapshot_at DESC);

CREATE INDEX idx_score_history_band_term
    ON student_score_history (readiness_band, snapshot_term);
GO


-- =============================================================================
-- END OF FILE 1/2 — continue with unilantern_sqlserver_part2_tables16to25.sql
-- File 2 covers: Tables 16–25
-- colleges · student_saved_colleges · scholarships · student_saved_scholarships
-- student_consents · notifications · notification_preferences
-- feedback_submissions · analytics_events · audit_logs
-- =============================================================================
