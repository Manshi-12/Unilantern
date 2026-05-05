export const STUDENT_SAVED_SCHOLARSHIPS_TABLE = "student_saved_scholarships";

export const studentSavedScholarshipsColumns = {
  saved_scholarship_id: "saved_scholarship_id",
  student_id: "student_id",
  scholarship_id: "scholarship_id",
  is_flagged_by_advisor: "is_flagged_by_advisor",
  saved_at: "saved_at",
} as const;

export const STUDENT_SAVED_SCHOLARSHIPS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'student_saved_scholarships')
BEGIN
  CREATE TABLE student_saved_scholarships (
    saved_scholarship_id  INT IDENTITY(1,1) PRIMARY KEY,
    student_id            INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    scholarship_id        INT NOT NULL REFERENCES scholarships(scholarship_id),
    is_flagged_by_advisor BIT NOT NULL DEFAULT 0,
    saved_at              DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_student_scholarship UNIQUE(student_id, scholarship_id)
  );

  CREATE INDEX idx_saved_scholarships_student ON student_saved_scholarships(student_id, saved_at DESC);
END;`;
