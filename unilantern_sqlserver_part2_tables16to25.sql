-- =============================================================================
-- UNILANTERN — PRODUCTION DATABASE SCHEMA (SQL SERVER / T-SQL CONVERSION)
-- FILE 2 OF 2 : Tables 16–25
-- Colleges · Consent · Notifications · Feedback · Analytics · Audit Log
-- Database   : Microsoft SQL Server 2019+ / Azure SQL Database
-- Converted from PostgreSQL 15+ by Senior Database Architect
-- Prerequisite: unilantern_sqlserver_part1_tables1to15.sql MUST be executed first.
-- =============================================================================
-- ARCHITECTURE NOTE (Tech Lead Directive):
--   All student-owned tables reference students(student_id).
--   Advisor-level references (notes, flags, audit) reference advisor_auth(advisor_id).
--   School admin references use school_admin_auth(school_admin_id).
--   audit_logs uses integer actor_id + actor_role VARCHAR — NOT a FK —
--   so records survive deletion of any auth row.
-- =============================================================================
-- CONVERSION NOTES (File 2 specific):
--   • SMALLINT[]  (applicable_grad_years) → NVARCHAR(MAX) stored as JSON array
--   • JSONB       (properties, metadata)  → NVARCHAR(MAX)
--   • INET        (ip_address)            → VARCHAR(50)
--   • BIGSERIAL   (log_id)               → BIGINT IDENTITY(1,1)
--   • GIN indexes on JSONB/arrays        → standard indexes (JSON path queries
--     must use JSON_VALUE / OPENJSON at query time in SQL Server)
--   • GIN trigram indexes (name)         → removed; use Full-Text Search
--   • Partial indexes with WHERE         → SQL Server filtered indexes (supported)
--   • COMMENT ON statements              → removed
--   • actor_role_enum ENUM               → VARCHAR(20) with CHECK constraint
--   • REVOKE ALL FROM PUBLIC             → preserved (SQL Server syntax compatible)
--   • Row Level Security                 → removed (implement separately via SQL Server RLS)
-- =============================================================================
-- EXECUTION ORDER:
--  16. colleges                   17. student_saved_colleges
--  18. scholarships               19. student_saved_scholarships
--  20. student_consents           21. notifications
--  22. notification_preferences   23. feedback_submissions
--  24. analytics_events           25. audit_logs
-- =============================================================================

SET NOCOUNT ON;
GO

-- =============================================================================
-- TABLE 16 — colleges
-- Purpose : College dataset powering the 8-step Academic Fit Classification.
--           Logo URLs are CDN-cached and lazy-loaded in lists.
--           Scheduled refresh jobs update acceptance_rate, GPA/test ranges,
--           and logo_url on a regular cadence.
-- =============================================================================
CREATE TABLE colleges (
    -- ── Identity ──────────────────────────────────────────────────────────────
    college_id              INT IDENTITY(1,1)               NOT NULL,

    -- ── Core identification ───────────────────────────────────────────────────
    name                    VARCHAR(300)        NOT NULL,
    state                   VARCHAR(100)        NULL,       -- includes 'District of Columbia'
    region                  VARCHAR(100)        NULL,       -- geographic region for analytics
    institution_type        VARCHAR(50)         NULL,       -- university | college | community
    is_public               BIT                 NULL,       -- drives in-state/out-of-state step
    website_url             VARCHAR(500)        NULL,

    -- ── Admissions data (8-step fit algorithm inputs) ─────────────────────────
    acceptance_rate         DECIMAL(5,2)        NULL,       -- e.g. 12.50 = 12.5%
    is_test_optional        BIT                 NOT NULL    DEFAULT 0,

    -- ── GPA percentile ranges ─────────────────────────────────────────────────
    gpa_25th                DECIMAL(4,2)        NULL,       -- buffer ±0.05 applied in fit logic
    gpa_75th                DECIMAL(4,2)        NULL,

    -- ── SAT percentile ranges ─────────────────────────────────────────────────
    sat_25th                SMALLINT            NULL,       -- buffer ±20 applied
    sat_75th                SMALLINT            NULL,

    -- ── ACT percentile ranges ─────────────────────────────────────────────────
    act_25th                SMALLINT            NULL,       -- buffer ±1 applied
    act_75th                SMALLINT            NULL,

    -- ── UI assets ─────────────────────────────────────────────────────────────
    logo_url                VARCHAR(500)        NULL,       -- CDN URL; NULL → fallback icon

    -- ── Data lineage ──────────────────────────────────────────────────────────
    data_source             VARCHAR(100)        NULL,
    last_data_refresh       DATETIMEOFFSET      NULL,
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_colleges PRIMARY KEY (college_id),
    CONSTRAINT chk_col_acceptance
        CHECK (acceptance_rate IS NULL OR acceptance_rate BETWEEN 0.01 AND 100.00),
    CONSTRAINT chk_col_gpa_range
        CHECK (gpa_25th IS NULL OR gpa_75th IS NULL OR gpa_25th <= gpa_75th),
    CONSTRAINT chk_col_sat_range
        CHECK (sat_25th IS NULL OR sat_75th IS NULL OR sat_25th <= sat_75th),
    CONSTRAINT chk_col_act_range
        CHECK (act_25th IS NULL OR act_75th IS NULL OR act_25th <= act_75th)
);
GO

CREATE INDEX idx_colleges_state
    ON colleges (state);

CREATE INDEX idx_colleges_acceptance
    ON colleges (acceptance_rate)
    WHERE acceptance_rate IS NOT NULL;

CREATE INDEX idx_colleges_active
    ON colleges (is_active);

-- NOTE: GIN trigram index (idx_colleges_name_trgm) not supported in SQL Server.
-- Use SQL Server Full-Text Search on name for fuzzy/search functionality.
GO

CREATE TRIGGER trg_colleges_upd
ON colleges
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE colleges
    SET updated_at = SYSDATETIMEOFFSET()
    FROM colleges c
    INNER JOIN inserted i ON c.college_id = i.college_id;
END;
GO


-- =============================================================================
-- TABLE 17 — student_saved_colleges
-- Purpose : Student-saved college list with full fit classification context.
--           status tracks the application lifecycle (saved → applied → admitted).
--           Advisor dashboard reads status + readiness_band_at_save for trend.
-- =============================================================================
CREATE TABLE student_saved_colleges (
    -- ── Identity ──────────────────────────────────────────────────────────────
    saved_college_id        INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,
    college_id              INT                 NOT NULL
                                                REFERENCES colleges (college_id)
                                                ON DELETE NO ACTION,   -- cascade would conflict; handled by app

    -- ── Application lifecycle ─────────────────────────────────────────────────
    status                  VARCHAR(20)         NOT NULL    DEFAULT 'saved',

    -- ── Fit classification (8-step algorithm; computed at save time) ──────────
    fit_classification      VARCHAR(20)         NULL,
    intended_major          VARCHAR(250)        NULL,
    major_selectivity       VARCHAR(30)         NULL,       -- standard | competitive | highly_competitive
    is_in_state             BIT                 NULL,       -- public university Step 6 input

    -- ── Trend baseline ────────────────────────────────────────────────────────
    -- readiness_band_at_save: foundational | developing | competitive | strongly_competitive | exceptional
    readiness_band_at_save  VARCHAR(25)         NULL
                                                CONSTRAINT chk_ssc_readiness_band_at_save
                                                CHECK (readiness_band_at_save IN ('foundational', 'developing', 'competitive', 'strongly_competitive', 'exceptional')),

    -- ── Timestamps ────────────────────────────────────────────────────────────
    saved_at                DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_saved_colleges PRIMARY KEY (saved_college_id),
    CONSTRAINT uq_student_college
        UNIQUE (student_id, college_id),
    CONSTRAINT chk_ssc_status
        CHECK (status IN ('saved', 'applied', 'admitted')),
    CONSTRAINT chk_ssc_fit
        CHECK (fit_classification IS NULL
            OR fit_classification IN ('safety', 'match', 'reach')),
    CONSTRAINT chk_ssc_major_sel
        CHECK (major_selectivity IS NULL
            OR major_selectivity IN ('standard', 'competitive', 'highly_competitive'))
);
GO

CREATE INDEX idx_saved_colleges_student_status
    ON student_saved_colleges (student_id, status);

CREATE INDEX idx_saved_colleges_college
    ON student_saved_colleges (college_id);

CREATE INDEX idx_saved_colleges_fit
    ON student_saved_colleges (student_id, fit_classification)
    WHERE fit_classification IS NOT NULL;
GO

CREATE TRIGGER trg_saved_colleges_upd
ON student_saved_colleges
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE student_saved_colleges
    SET updated_at = SYSDATETIMEOFFSET()
    FROM student_saved_colleges sc
    INNER JOIN inserted i ON sc.saved_college_id = i.saved_college_id;
END;
GO


-- =============================================================================
-- TABLE 18 — scholarships
-- Purpose : General and college-specific scholarships.
--           application_link is ALWAYS an external URL.
--           UniLantern NEVER hosts scholarship applications.
-- NOTE: applicable_grad_years stored as NVARCHAR(MAX) JSON array
--       (replaces PostgreSQL SMALLINT[] array type)
--       Example: '[2025, 2026]'
-- =============================================================================
CREATE TABLE scholarships (
    -- ── Identity ──────────────────────────────────────────────────────────────
    scholarship_id          INT IDENTITY(1,1)               NOT NULL,

    -- ── College association (NULL = general / national) ───────────────────────
    college_id              INT                 NULL
                                                REFERENCES colleges (college_id)
                                                ON DELETE SET NULL,

    -- ── Core details ──────────────────────────────────────────────────────────
    scholarship_name        VARCHAR(300)        NOT NULL,
    provider                VARCHAR(300)        NULL,
    eligibility_summary     NVARCHAR(MAX)       NULL,
    deadline                DATE                NULL,
    award_amount            VARCHAR(120)        NULL,       -- e.g. '$5,000' | 'Full tuition'
    application_link        VARCHAR(500)        NULL,       -- external URL ONLY
    scholarship_type        VARCHAR(50)         NULL,       -- merit | need | athletic | demographic | major | other

    -- ── Graduation year filter ─────────────────────────────────────────────────
    -- Stored as JSON array string, e.g. '[2025,2026]' (replaces PostgreSQL SMALLINT[])
    applicable_grad_years   NVARCHAR(MAX)       NOT NULL    DEFAULT '[]',

    -- ── Data lineage ──────────────────────────────────────────────────────────
    data_source             VARCHAR(100)        NULL,
    last_data_refresh       DATETIMEOFFSET      NULL,
    is_active               BIT                 NOT NULL    DEFAULT 1,

    -- ── Audit timestamps ──────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    CONSTRAINT pk_scholarships PRIMARY KEY (scholarship_id)
);
GO

CREATE INDEX idx_scholarships_college
    ON scholarships (college_id)
    WHERE college_id IS NOT NULL;

CREATE INDEX idx_scholarships_active_deadline
    ON scholarships (is_active, deadline);

-- NOTE: GIN index on applicable_grad_years (SMALLINT[] array) not applicable in SQL Server.
-- Query applicable_grad_years using OPENJSON or JSON_VALUE at the application layer.
GO

CREATE TRIGGER trg_scholarships_upd
ON scholarships
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE scholarships
    SET updated_at = SYSDATETIMEOFFSET()
    FROM scholarships s
    INNER JOIN inserted i ON s.scholarship_id = i.scholarship_id;
END;
GO


-- =============================================================================
-- TABLE 19 — student_saved_scholarships
-- Purpose : Student-saved scholarship records.
--           is_flagged_by_advisor is an advisor action stored here for Phase 1.
--           MUST be excluded from all student-facing API responses.
--           Future refactor: move to advisor_scholarship_flags table.
-- =============================================================================
CREATE TABLE student_saved_scholarships (
    -- ── Identity ──────────────────────────────────────────────────────────────
    saved_scholarship_id    INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,
    scholarship_id          INT                 NOT NULL
                                                REFERENCES scholarships (scholarship_id)
                                                ON DELETE NO ACTION,   -- avoid cascade conflict; handled by app

    -- ── Advisor flag (INTERNAL — exclude from all student-facing APIs) ────────
    is_flagged_by_advisor   BIT                 NOT NULL    DEFAULT 0,

    -- ── Timestamp ─────────────────────────────────────────────────────────────
    saved_at                DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_student_saved_scholarships PRIMARY KEY (saved_scholarship_id),
    CONSTRAINT uq_student_scholarship
        UNIQUE (student_id, scholarship_id)
);
GO

CREATE INDEX idx_saved_scholarships_student
    ON student_saved_scholarships (student_id, saved_at DESC);
GO


-- =============================================================================
-- TABLE 20 — student_consents
-- Purpose : Granular per-type consent records.
--           Multiple rows per student — one row per consent_type.
--           All consent checks are enforced server-side on every protected action.
--
--   Supported consent_type values:
--     age_13plus | parental_13_17 | advisor_essay | advisor_ec |
--     advisor_impact | advisor_background | school | college | feedback
-- =============================================================================
CREATE TABLE student_consents (
    -- ── Identity ──────────────────────────────────────────────────────────────
    consent_id              INT IDENTITY(1,1)               NOT NULL,
    student_id              INT                 NOT NULL
                                                REFERENCES students (student_id)
                                                ON DELETE CASCADE,

    -- ── Consent specification ─────────────────────────────────────────────────
    consent_type            VARCHAR(60)         NOT NULL,
    status                  VARCHAR(20)         NOT NULL,   -- granted | revoked
    source                  VARCHAR(30)         NOT NULL,   -- signup | settings | admin
    version                 SMALLINT            NOT NULL    DEFAULT 1, -- policy version

    -- ── Timestamps ────────────────────────────────────────────────────────────
    granted_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    revoked_at              DATETIMEOFFSET      NULL,       -- NULL until revoked
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
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
GO

CREATE INDEX idx_consents_student_type_status
    ON student_consents (student_id, consent_type, status);

CREATE INDEX idx_consents_status_type
    ON student_consents (status, consent_type);
GO


-- =============================================================================
-- TABLE 21 — notifications
-- Purpose : Role-based notification records for all user types.
--           Delivery per channel: one row per channel per event.
--           is_critical = 1 bypasses user preferences and cannot be disabled.
--
--   recipient_id + recipient_role together identify the actual auth row:
--     role=student            → students.student_id
--     role=advisor            → advisor_auth.advisor_id
--     role=school_admin       → school_admin_auth.school_admin_id
--     role=unilantern_admin   → unilantern_admin_auth.admin_id
--   (Not a FK so notifications survive auth table soft-deletes.)
-- =============================================================================
CREATE TABLE notifications (
    -- ── Identity ──────────────────────────────────────────────────────────────
    notification_id         INT IDENTITY(1,1)               NOT NULL,

    -- ── Recipient (role-keyed, not a FK — see design note above) ─────────────
    recipient_id            INT                 NOT NULL,
    -- recipient_role: student | advisor | school_admin | unilantern_admin
    recipient_role          VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_notif_recipient_role
                                                CHECK (recipient_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),

    -- ── Content ───────────────────────────────────────────────────────────────
    notification_type       VARCHAR(60)         NOT NULL,   -- band_update | recommendation | essay | reminder | gap | scholarship | critical
    title                   VARCHAR(300)        NOT NULL,
    message                 NVARCHAR(MAX)       NOT NULL,

    -- ── Delivery ──────────────────────────────────────────────────────────────
    delivery_channel        VARCHAR(20)         NOT NULL,   -- in_app | push | email
    is_critical             BIT                 NOT NULL    DEFAULT 0,

    -- ── State ─────────────────────────────────────────────────────────────────
    is_read                 BIT                 NOT NULL    DEFAULT 0,
    read_at                 DATETIMEOFFSET      NULL,

    -- ── Audit ─────────────────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_notifications PRIMARY KEY (notification_id),
    CONSTRAINT chk_notif_channel
        CHECK (delivery_channel IN ('in_app', 'push', 'email')),
    CONSTRAINT chk_notif_read_at
        CHECK (is_read = 0 OR read_at IS NOT NULL)
);
GO

-- Filtered index: only unread notifications need fast lookup
CREATE INDEX idx_notif_recipient_unread
    ON notifications (recipient_id, recipient_role, is_read, created_at DESC)
    WHERE is_read = 0;

CREATE INDEX idx_notif_recipient_type
    ON notifications (recipient_id, recipient_role, notification_type, created_at DESC);
GO


-- =============================================================================
-- TABLE 22 — notification_preferences
-- Purpose : Per-user, per-type, per-channel preferences for all roles.
--           UNIQUE constraint prevents duplicate preference rows.
--           All writes must use MERGE or UPDATE/INSERT (UPSERT pattern).
--           is_critical notifications always deliver regardless of enabled flag.
--
--   Same recipient_id + recipient_role design as notifications table.
-- =============================================================================
CREATE TABLE notification_preferences (
    -- ── Identity ──────────────────────────────────────────────────────────────
    preference_id           INT IDENTITY(1,1)               NOT NULL,

    -- ── Owner (role-keyed, not a FK) ──────────────────────────────────────────
    recipient_id            INT                 NOT NULL,
    -- recipient_role: student | advisor | school_admin | unilantern_admin
    recipient_role          VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_pref_recipient_role
                                                CHECK (recipient_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),

    -- ── Preference specification ──────────────────────────────────────────────
    notification_type       VARCHAR(60)         NOT NULL,
    delivery_channel        VARCHAR(20)         NOT NULL,   -- in_app | push | email
    enabled                 BIT                 NOT NULL    DEFAULT 1,
    is_critical             BIT                 NOT NULL    DEFAULT 0,    -- critical notifications always deliver

    -- ── Audit ─────────────────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),
    updated_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_notification_preferences PRIMARY KEY (preference_id),
    CONSTRAINT uq_pref_recipient_type_channel
        UNIQUE (recipient_id, recipient_role, notification_type, delivery_channel),
    CONSTRAINT chk_pref_channel
        CHECK (delivery_channel IN ('in_app', 'push', 'email'))
);
GO

CREATE INDEX idx_notif_prefs_recipient
    ON notification_preferences (recipient_id, recipient_role, notification_type);
GO

CREATE TRIGGER trg_notif_prefs_upd
ON notification_preferences
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE notification_preferences
    SET updated_at = SYSDATETIMEOFFSET()
    FROM notification_preferences np
    INNER JOIN inserted i ON np.preference_id = i.preference_id;
END;
GO


-- =============================================================================
-- TABLE 23 — feedback_submissions
-- Purpose : In-app feedback from any role (student, advisor, school_admin).
--           Metadata is auto-captured at submission time.
--           Status workflow managed in UniLantern internal dashboard.
--           Essays and scores NEVER appear in feedback records.
-- =============================================================================
CREATE TABLE feedback_submissions (
    -- ── Identity ──────────────────────────────────────────────────────────────
    feedback_id             INT IDENTITY(1,1)               NOT NULL,

    -- ── Submitter (role-keyed; same pattern as notifications) ─────────────────
    submitter_id            INT                 NOT NULL,
    -- submitter_role: student | advisor | school_admin | unilantern_admin
    submitter_role          VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_fb_submitter_role
                                                CHECK (submitter_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),

    -- ── School context (auto-captured from session) ────────────────────────────
    school_id               INT                 NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE SET NULL,

    -- ── Feedback content ──────────────────────────────────────────────────────
    feedback_type           VARCHAR(30)         NOT NULL,   -- bug | feature_request | confusing | other
    message                 NVARCHAR(MAX)       NOT NULL,
    screenshot_url          VARCHAR(500)        NULL,       -- CDN URL; web only

    -- ── Contact opt-in ────────────────────────────────────────────────────────
    contact_consent         BIT                 NOT NULL    DEFAULT 0,

    -- ── Auto-captured metadata ────────────────────────────────────────────────
    page_or_screen          VARCHAR(150)        NULL,
    app_version             VARCHAR(50)         NULL,
    device_type             VARCHAR(80)         NULL,
    platform                VARCHAR(20)         NULL,       -- ios | android | web

    -- ── Internal workflow ─────────────────────────────────────────────────────
    status                  VARCHAR(30)         NOT NULL    DEFAULT 'new',  -- new | in_review | planned | resolved

    -- ── Audit ─────────────────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_feedback_submissions PRIMARY KEY (feedback_id),
    CONSTRAINT chk_fb_type
        CHECK (feedback_type IN ('bug', 'feature_request', 'confusing', 'other')),
    CONSTRAINT chk_fb_status
        CHECK (status IN ('new', 'in_review', 'planned', 'resolved')),
    CONSTRAINT chk_fb_platform
        CHECK (platform IS NULL OR platform IN ('ios', 'android', 'web'))
);
GO

CREATE INDEX idx_feedback_status_type
    ON feedback_submissions (status, feedback_type, created_at DESC);

CREATE INDEX idx_feedback_submitter
    ON feedback_submissions (submitter_id, submitter_role, created_at DESC);

CREATE INDEX idx_feedback_school
    ON feedback_submissions (school_id, created_at DESC)
    WHERE school_id IS NOT NULL;
GO


-- =============================================================================
-- TABLE 24 — analytics_events
-- Purpose : Bottom-tab click events and screen views for all platforms.
--           tab_name is a DEDICATED INDEXED COLUMN — never parse JSON for it.
--           properties NVARCHAR(MAX) keeps the full event payload for future
--           ad hoc queries (use OPENJSON / JSON_VALUE in SQL Server).
--
--   Tab name values: Profile | Search | Saved | Improve | Financial
--   Events: bottom_tab_click | bottom_tab_default_view | screen_view
-- =============================================================================
CREATE TABLE analytics_events (
    -- ── Identity ──────────────────────────────────────────────────────────────
    event_id                INT IDENTITY(1,1)               NOT NULL,

    -- ── Actor (role-keyed; not a FK) ──────────────────────────────────────────
    actor_id                INT                 NOT NULL,
    -- actor_role: student | advisor | school_admin | unilantern_admin
    actor_role              VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_ae_actor_role
                                                CHECK (actor_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),

    -- ── School context ────────────────────────────────────────────────────────
    school_id               INT                 NULL
                                                REFERENCES schools (school_id)
                                                ON DELETE SET NULL,

    -- ── Event specification ───────────────────────────────────────────────────
    event_name              VARCHAR(60)         NOT NULL,
    tab_name                VARCHAR(60)         NULL,       -- dedicated column for fast queries
    grade_level             SMALLINT            NULL,       -- 9–12 (students only)

    -- ── Session & platform ────────────────────────────────────────────────────
    platform                VARCHAR(20)         NOT NULL,   -- ios | android | web
    session_id              VARCHAR(150)        NULL,

    -- ── Full payload ──────────────────────────────────────────────────────────
    -- Stored as NVARCHAR(MAX) JSON string (replaces PostgreSQL JSONB)
    -- Use OPENJSON / JSON_VALUE / JSON_QUERY for querying in SQL Server
    properties              NVARCHAR(MAX)       NOT NULL    DEFAULT '{}',

    -- ── Timestamp ─────────────────────────────────────────────────────────────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Constraints ───────────────────────────────────────────────────────────
    CONSTRAINT pk_analytics_events PRIMARY KEY (event_id),
    CONSTRAINT chk_ae_grade
        CHECK (grade_level IS NULL OR grade_level BETWEEN 9 AND 12),
    CONSTRAINT chk_ae_platform
        CHECK (platform IN ('ios', 'android', 'web')),
    CONSTRAINT chk_ae_tab
        CHECK (tab_name IS NULL
            OR tab_name IN ('Profile', 'Search', 'Saved', 'Improve', 'Financial'))
);
GO

-- Filtered index: only rows with a tab_name value
CREATE INDEX idx_analytics_tab_created
    ON analytics_events (tab_name, created_at DESC)
    WHERE tab_name IS NOT NULL;

CREATE INDEX idx_analytics_event_name
    ON analytics_events (event_name, created_at DESC);

CREATE INDEX idx_analytics_actor
    ON analytics_events (actor_id, actor_role, created_at DESC);

-- Filtered index: only rows with a school_id
CREATE INDEX idx_analytics_school
    ON analytics_events (school_id, created_at DESC)
    WHERE school_id IS NOT NULL;

CREATE INDEX idx_analytics_platform_grade
    ON analytics_events (platform, grade_level, created_at DESC);

-- NOTE: GIN index on JSONB properties not applicable in SQL Server.
-- Use OPENJSON / JSON_VALUE at query time for JSON property filtering.
-- Consider adding computed columns + indexes for frequently queried JSON keys.
GO


-- =============================================================================
-- TABLE 25 — audit_logs
-- Purpose : IMMUTABLE audit trail for ALL sensitive data access and changes.
--
--   SECURITY CONTRACT:
--   • NO DELETE privilege on this table for any application service account
--   • NO UPDATE privilege on this table for any application service account
--   • Only INSERT + SELECT permitted for the application DB role
--   • actor_id + actor_role are NOT a FK — records survive auth table deletion
--   • BIGINT IDENTITY because audit logs grow unbounded — plan for monthly partitioning
--   • Read-only access via UniLantern Admin UI only
--
--   actor_role + actor_id identify the auth row at event time:
--     student          → students.student_id
--     advisor          → advisor_auth.advisor_id
--     school_admin     → school_admin_auth.school_admin_id
--     unilantern_admin → unilantern_admin_auth.admin_id
-- =============================================================================
CREATE TABLE audit_logs (
    -- ── Identity ──────────────────────────────────────────────────────────────
    log_id                  BIGINT IDENTITY(1,1)            NOT NULL,

    -- ── Actor (NOT a FK — records survive auth row deletion) ──────────────────
    actor_id                INT                 NOT NULL,
    -- actor_role: student | advisor | school_admin | unilantern_admin
    actor_role              VARCHAR(20)         NOT NULL
                                                CONSTRAINT chk_al_actor_role
                                                CHECK (actor_role IN ('student', 'advisor', 'school_admin', 'unilantern_admin')),
    actor_school_id         INT                 NULL,       -- snapshot of school at event time

    -- ── Action ────────────────────────────────────────────────────────────────
    action_type             VARCHAR(80)         NOT NULL,
    target_resource         VARCHAR(150)        NULL,       -- e.g. 'student_profiles:42'

    -- ── Rich context ──────────────────────────────────────────────────────────
    -- Stored as NVARCHAR(MAX) JSON string (replaces PostgreSQL JSONB)
    metadata                NVARCHAR(MAX)       NOT NULL    DEFAULT '{}',
    -- Stored as VARCHAR(50) (replaces PostgreSQL INET — supports IPv4 + IPv6 text)
    ip_address              VARCHAR(50)         NULL,
    user_agent              NVARCHAR(MAX)       NULL,

    -- ── Timestamp (immutable — DEFAULT only; never updated by application) ────
    created_at              DATETIMEOFFSET      NOT NULL    DEFAULT SYSDATETIMEOFFSET(),

    -- ── Allowed action_type values (enforced at API layer) ────────────────────
    -- login | logout | signup | phone_verify
    -- password_change | account_link | account_merge
    -- profile_view | profile_update
    -- consent_grant | consent_revoke
    -- essay_save | essay_status_change
    -- advisor_view_student | advisor_view_essay | advisor_export
    -- school_admin_view | school_admin_export
    -- unilantern_admin_access | config_change
    -- invite_token_create | invite_token_use | invite_token_revoke
    -- dashboard_access | band_calibration_change

    CONSTRAINT pk_audit_logs PRIMARY KEY (log_id)
);
GO

CREATE INDEX idx_audit_actor_created
    ON audit_logs (actor_id, actor_role, created_at DESC);

CREATE INDEX idx_audit_action_created
    ON audit_logs (action_type, created_at DESC);

CREATE INDEX idx_audit_target
    ON audit_logs (target_resource, created_at DESC)
    WHERE target_resource IS NOT NULL;

CREATE INDEX idx_audit_role_created
    ON audit_logs (actor_role, created_at DESC);

CREATE INDEX idx_audit_school
    ON audit_logs (actor_school_id, created_at DESC)
    WHERE actor_school_id IS NOT NULL;

-- NOTE: GIN index on JSONB metadata not applicable in SQL Server.
-- Use OPENJSON / JSON_VALUE at query time for metadata filtering.
-- Consider adding computed columns + indexes for frequently queried metadata keys.
GO


-- =============================================================================
-- DATABASE-LEVEL PERMISSION GRANTS
-- Principle of least privilege. Apply to your named DB roles/users in SQL Server.
-- Uncomment and replace <role_name> with your actual SQL Server role names.
-- =============================================================================

-- audit_logs: application service account gets INSERT + SELECT only
REVOKE ALL ON audit_logs FROM PUBLIC;
-- GRANT INSERT, SELECT ON audit_logs TO app_service_role;

-- student_scores: internal values never exposed to student/advisor DB roles
REVOKE SELECT ON student_scores FROM PUBLIC;
-- GRANT SELECT ON student_scores TO app_service_role;
-- GRANT SELECT ON student_scores TO app_admin_role;

-- otp_verifications: restrict to auth service only
REVOKE ALL ON otp_verifications FROM PUBLIC;
-- GRANT SELECT, INSERT, UPDATE ON otp_verifications TO app_auth_role;
GO


-- =============================================================================
-- NIGHTLY MAINTENANCE JOBS (SQL Server Agent or Azure Elastic Jobs)
-- =============================================================================
-- 1. Purge expired/used OTPs:
--    DELETE FROM otp_verifications
--    WHERE expires_at < SYSDATETIMEOFFSET() OR is_used = 1;
--
-- 2. Deactivate expired invite tokens:
--    UPDATE invite_tokens SET is_active = 0
--    WHERE expires_at < SYSDATETIMEOFFSET() AND is_active = 1;
--
-- 3. Colleges data refresh from licensed API / scrape pipeline.
--
-- 4. Scholarships data refresh + deduplication.
--
-- 5. Recalculate student_scores for rows with stale calculated_at.
--
-- 6. Take student_score_history snapshots at term boundaries.


-- =============================================================================
-- TABLE PARTITIONING PLAN (implement when row counts exceed thresholds)
-- SQL Server uses PARTITION FUNCTION + PARTITION SCHEME on a filegroup.
-- =============================================================================
-- audit_logs        → PARTITION BY RANGE (created_at) — monthly  (>10M rows)
-- analytics_events  → PARTITION BY RANGE (created_at) — monthly  (>10M rows)
-- notifications     → PARTITION BY RANGE (created_at) — quarterly (>5M rows)
-- otp_verifications → always small; nightly purge is sufficient


-- =============================================================================
-- SUMMARY
-- =============================================================================
-- FILE 1: Tables 1–15
--  1  schools                    2  students
--   3  advisor_auth               4  school_admin_auth
--   5  unilantern_admin_auth      6  otp_verifications
--   7  invite_tokens              8  student_profiles
--   9  student_academics         10  extracurricular_activities
--  11  honors_awards             12  community_service_entries
--  13  student_essays            14  student_scores
--  15  student_score_history
--
-- FILE 2: Tables 16–25
--  16  colleges                  17  student_saved_colleges
--  18  scholarships              19  student_saved_scholarships
--  20  student_consents          21  notifications
--  22  notification_preferences  23  feedback_submissions
--  24  analytics_events          25  audit_logs
--
-- Total: 25 tables across 2 files
-- Auth architecture: 4 separate role-specific auth tables (Tech Lead directive)
-- =============================================================================
-- =============================================================================
-- TABLE 26 — push_tokens
-- Purpose : Stores FCM (Android) and APNs (iOS) device tokens for push notifications.
--           Tokens are marked inactive on delivery failure after 3 retries.
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'push_tokens')
BEGIN
  CREATE TABLE push_tokens (
    push_token_id  INT IDENTITY(1,1) PRIMARY KEY,
    user_id        INT NOT NULL,
    user_role      VARCHAR(30) NOT NULL CHECK (user_role IN ('student','advisor','school_admin','unilantern_admin')),
    device_id      VARCHAR(128) NULL,
    push_token     VARCHAR(500) NOT NULL,
    platform       VARCHAR(20) NOT NULL CHECK (platform IN ('ios','android','web')),
    device_name    NVARCHAR(200) NULL,
    is_active      BIT NOT NULL DEFAULT 1,
    last_used_at   DATETIMEOFFSET NULL,
    created_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at     DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

-- ── device_id (idempotent add for existing DBs) ─────────────────────────────
IF COL_LENGTH('dbo.push_tokens', 'device_id') IS NULL
BEGIN
  ALTER TABLE dbo.push_tokens ADD device_id VARCHAR(128) NULL;
END;

-- ── Unique: one row per logical device per user (filtered; NULL device_id = legacy rows) ─
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.push_tokens') AND name = 'uidx_push_tokens_user_device'
)
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX uidx_push_tokens_user_device
    ON dbo.push_tokens(user_id, user_role, device_id)
    WHERE device_id IS NOT NULL;
END;

-- ── Index for active token lookups ───────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.push_tokens') AND name = 'idx_push_tokens_active'
)
BEGIN
  CREATE INDEX idx_push_tokens_active
    ON dbo.push_tokens(user_id, user_role, is_active)
    WHERE is_active = 1;
END;
GO
