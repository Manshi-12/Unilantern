/**
 * `extracurricular_activities` table — MSSQL / Azure SQL.
 *
 * NOTE: drizzle-orm's MSSQL adapter is still experimental, so this file declares
 * the table name + column metadata as plain constants. Repositories below use
 * the `mssql` driver directly with parameterised queries. When drizzle's MSSQL
 * adapter stabilises, swap these to drizzle's `mssqlTable(...)` builders without
 * changing repository call-sites.
 */

export const EXTRACURRICULAR_ACTIVITIES_TABLE = "extracurricular_activities";

export const extracurricularActivitiesColumns = {
  activity_id: "activity_id",
  student_id: "student_id",
  activity_name: "activity_name",
  activity_type: "activity_type",
  years_involved: "years_involved",
  involvement_level: "involvement_level",
  activity_description: "activity_description",
  impact_text: "impact_text",
  impact_level: "impact_level",
  hours_per_week: "hours_per_week",
  experience_duration_weeks: "experience_duration_weeks",
  selective_acceptance_toggle: "selective_acceptance_toggle",
  external_org_toggle: "external_org_toggle",
  travel_or_residency_toggle: "travel_or_residency_toggle",
  people_impacted: "people_impacted",
  funds_raised: "funds_raised",
  users_acquired: "users_acquired",
  hours_delivered: "hours_delivered",
  competition_top_10_pct_toggle: "competition_top_10_pct_toggle",
  finalist_or_winner_toggle: "finalist_or_winner_toggle",
  publication_or_presented_toggle: "publication_or_presented_toggle",
  policy_or_partnership_toggle: "policy_or_partnership_toggle",
  structured_deliverable_toggle: "structured_deliverable_toggle",
  language_or_skill_cert_toggle: "language_or_skill_cert_toggle",
  formal_selection_toggle: "formal_selection_toggle",
  documented_real_world_output: "documented_real_world_output",
  display_order: "display_order",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const EXTRACURRICULAR_ACTIVITIES_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'extracurricular_activities')
BEGIN
  CREATE TABLE extracurricular_activities (
    activity_id                      INT IDENTITY(1,1) PRIMARY KEY,
    student_id                       INT NOT NULL,
    activity_name                    VARCHAR(250) NOT NULL,
    activity_type                    VARCHAR(10) NOT NULL
                                      CHECK (activity_type IN ('club','sport','work','volunteer','other')),
    years_involved                   VARCHAR(15) NOT NULL,
    involvement_level                VARCHAR(20) NOT NULL
                                      CHECK (involvement_level IN ('leadership','active','participant')),
    activity_description             VARCHAR(400) NOT NULL,
    impact_text                      VARCHAR(300) NOT NULL,
    impact_level                     VARCHAR(20) NOT NULL
                                      CHECK (impact_level IN ('high','medium','low')),
    hours_per_week                   VARCHAR(10) NOT NULL,
    experience_duration_weeks        SMALLINT NULL,
    selective_acceptance_toggle      BIT NOT NULL DEFAULT 0,
    external_org_toggle              BIT NOT NULL DEFAULT 0,
    travel_or_residency_toggle       BIT NOT NULL DEFAULT 0,
    people_impacted                  INT NOT NULL DEFAULT 0,
    funds_raised                     INT NOT NULL DEFAULT 0,
    users_acquired                   INT NOT NULL DEFAULT 0,
    hours_delivered                  INT NOT NULL DEFAULT 0,
    competition_top_10_pct_toggle    BIT NOT NULL DEFAULT 0,
    finalist_or_winner_toggle        BIT NOT NULL DEFAULT 0,
    publication_or_presented_toggle  BIT NOT NULL DEFAULT 0,
    policy_or_partnership_toggle     BIT NOT NULL DEFAULT 0,
    structured_deliverable_toggle    BIT NOT NULL DEFAULT 0,
    language_or_skill_cert_toggle    BIT NOT NULL DEFAULT 0,
    formal_selection_toggle          BIT NOT NULL DEFAULT 0,
    documented_real_world_output     BIT NOT NULL DEFAULT 0,
    display_order                    SMALLINT NOT NULL,
    created_at                       DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at                       DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE (student_id, display_order)
  );

END;`;