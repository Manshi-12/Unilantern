// ── Request DTOs for College module ──────────────────────────────────────────

export type FitClassification = "safety" | "match" | "reach";
export type SavedCollegeStatus = "saved" | "applied" | "admitted";
export type MajorSelectivity = "standard" | "competitive" | "highly_competitive";

/** POST /students/me/colleges/saved */
export interface SaveCollegeRequestDto {
  college_id: number;
  intended_major?: string | null;
  major_selectivity?: MajorSelectivity | null;
  is_in_state?: boolean | null;
}

/** PATCH /students/me/colleges/saved/:saved_id */
export interface UpdateSavedCollegeRequestDto {
  status?: SavedCollegeStatus;
  intended_major?: string | null;
  major_selectivity?: MajorSelectivity | null;
  is_in_state?: boolean | null;
}

/** GET /colleges/search query params */
export interface SearchCollegesQueryDto {
  q?: string;
  state?: string;
  min_acceptance_rate?: number;
  max_acceptance_rate?: number;
  is_test_optional?: boolean;
  limit?: number;
  offset?: number;
}
