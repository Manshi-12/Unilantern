// ── Response DTOs for College module ─────────────────────────────────────────

import type { FitClassification, MajorSelectivity, SavedCollegeStatus } from "./request.dto.js";

/** Single college in search/list results */
export interface CollegeResponseDto {
  college_id: string;
  name: string;
  state: string | null;
  website: string | null;
  logo: string | null;
  acceptance_rate: number | null;
  is_test_optional: boolean;
  is_public: boolean | null;
}

/** GET /colleges/search response */
export interface CollegeSearchResponseDto {
  colleges: CollegeResponseDto[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /colleges/:college_id response */
export interface CollegeDetailResponseDto {
  college_id: string;
  name: string;
  state: string | null;
  region: string | null;
  institution_type: string | null;
  is_public: boolean | null;
  website: string | null;
  logo: string | null;
  acceptance_rate: number | null;
  is_test_optional: boolean;
  gpa_25th: number | null;
  gpa_75th: number | null;
  sat_25th: number | null;
  sat_75th: number | null;
  act_25th: number | null;
  act_75th: number | null;
}

/** Single saved college row */
export interface SavedCollegeResponseDto {
  saved_college_id: string;
  college_id: string;
  college_name: string;
  college_state: string | null;
  college_website: string | null;
  college_logo: string | null;
  college_acceptance_rate: number | null;
  status: SavedCollegeStatus;
  fit_classification: FitClassification | null;
  intended_major: string | null;
  major_selectivity: MajorSelectivity | null;
  is_in_state: boolean | null;
  readiness_band_at_save: string | null;
  saved_at: string;
  updated_at: string;
}

/** GET /students/me/colleges/saved response */
export interface SavedCollegesListResponseDto {
  saved_colleges: SavedCollegeResponseDto[];
  total: number;
}
