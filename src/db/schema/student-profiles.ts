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
    profile_complete    BIT NOT NULL DEFAULT 0,
    created_at          DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at          DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );
END;
`;
