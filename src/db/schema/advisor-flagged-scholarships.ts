export const ADVISOR_FLAGGED_SCHOLARSHIPS_TABLE = "advisor_flagged_scholarships";

export const advisorFlaggedScholarshipsColumns = {
  flag_id: "flag_id",
  advisor_id: "advisor_id",
  student_id: "student_id",
  scholarship_id: "scholarship_id",
  note: "note",
  flagged_at: "flagged_at",
} as const;
