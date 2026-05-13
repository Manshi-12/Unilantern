// ── PUT /students/me/college-data-sharing — Response ─────────────────────────
export interface UpdateCollegeDataSharingResponseDto {
  college_data_sharing_enabled: boolean;
  updated_at: string;
}
