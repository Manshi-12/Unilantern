// ── PUT /students/me/college-data-sharing — `enabled`: true = opted in (default semantics in DB) ────────
export interface UpdateCollegeDataSharingDto {
  enabled: boolean;
}
