export const SCHOLARSHIPS_TABLE = "scholarships";

export const scholarshipsColumns = {
  scholarship_id: "scholarship_id",
  college_id: "college_id",
  scholarship_name: "scholarship_name",
  provider: "provider",
  eligibility_summary: "eligibility_summary",
  deadline: "deadline",
  award_amount: "award_amount",
  application_link: "application_link",
  scholarship_type: "scholarship_type",
  applicable_grad_years: "applicable_grad_years",
  data_source: "data_source",
  last_data_refresh: "last_data_refresh",
  is_active: "is_active",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const SCHOLARSHIPS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'scholarships')
BEGIN
  CREATE TABLE scholarships (
    scholarship_id        INT IDENTITY(1,1) PRIMARY KEY,
    college_id            INT NULL REFERENCES colleges(college_id) ON DELETE SET NULL,
    scholarship_name      VARCHAR(300) NOT NULL,
    provider              VARCHAR(300) NULL,
    eligibility_summary   NVARCHAR(MAX) NULL,
    deadline              DATE NULL,
    award_amount          VARCHAR(120) NULL,
    application_link      VARCHAR(500) NULL,
    scholarship_type      VARCHAR(50) NULL,
    applicable_grad_years NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    data_source           VARCHAR(100) NULL,
    last_data_refresh     DATETIMEOFFSET NULL,
    is_active             BIT NOT NULL DEFAULT 1,
    created_at            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );

  CREATE INDEX idx_scholarships_active_deadline ON scholarships(is_active, deadline);
END;`;
