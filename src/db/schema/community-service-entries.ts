export const COMMUNITY_SERVICE_ENTRIES_TABLE = "community_service_entries";

export const communityServiceEntriesColumns = {
  service_id: "service_id",
  student_id: "student_id",
  total_hours_range: "total_hours_range",
  action_type: "action_type",
  is_leadership: "is_leadership",
  duration_months: "duration_months",
  display_order: "display_order",
  description: "description",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

export const COMMUNITY_SERVICE_ENTRIES_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'community_service_entries')
BEGIN
  CREATE TABLE community_service_entries (
    service_id        INT IDENTITY(1,1) PRIMARY KEY,
    student_id        INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    total_hours_range VARCHAR(10) NULL CHECK (total_hours_range IN ('under_50','50_100','100_200','200_plus')),
    action_type       VARCHAR(15) NULL CHECK (action_type IN ('direct_service','organizing','teaching','fundraising','independent')),
    is_leadership     BIT NOT NULL DEFAULT 0,
    duration_months   SMALLINT NULL CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 120),
    display_order     SMALLINT NOT NULL DEFAULT 0,
    description       VARCHAR(400) NULL,
    created_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at        DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );

  CREATE INDEX idx_service_student ON community_service_entries(student_id, display_order);
END;`;
