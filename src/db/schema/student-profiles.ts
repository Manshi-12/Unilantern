export const STUDENT_PROFILES_TABLE = "student_profiles";

export const studentProfilesColumns = {
  profile_id: "profile_id",
  student_id: "student_id",
  school_id: "school_id",
  grade: "grade",
  graduation_year: "graduation_year",
  date_of_birth: "date_of_birth",
  high_school_name: "high_school_name",
  state_of_residence: "state_of_residence",
  onboarding_step: "onboarding_step",
  previous_school_ids: "previous_school_ids",
  profile_complete: "profile_complete",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const STUDENT_PROFILES_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_profiles')
BEGIN
  CREATE TABLE student_profiles (
    profile_id          INT IDENTITY(1,1) PRIMARY KEY,
    student_id          INT NOT NULL UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
    school_id           INT NULL,
    grade               TINYINT NULL CHECK (grade IN (9, 10, 11, 12)),
    graduation_year     SMALLINT NOT NULL,
    date_of_birth       DATE NULL,
    high_school_name    VARCHAR(255) NULL,
    state_of_residence  VARCHAR(100) NULL,
    onboarding_step     SMALLINT NOT NULL DEFAULT 1,
    previous_school_ids NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    profile_complete    BIT NOT NULL DEFAULT 0,
    created_at          DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at          DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;

-- Add missing columns if they don't exist
IF COL_LENGTH('dbo.student_profiles', 'onboarding_step') IS NULL
BEGIN
  ALTER TABLE dbo.student_profiles
    ADD onboarding_step SMALLINT NOT NULL DEFAULT 1;
END;

IF COL_LENGTH('dbo.student_profiles', 'previous_school_ids') IS NULL
BEGIN
  ALTER TABLE dbo.student_profiles
    ADD previous_school_ids NVARCHAR(MAX) NOT NULL DEFAULT '[]';
END;
`;
