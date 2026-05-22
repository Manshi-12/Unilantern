// ── Internal record types for college module ────────────────────────────────

export type FitClassification = "safety" | "match" | "reach";
export type SavedCollegeStatus = "saved" | "applied" | "admitted";
export type MajorSelectivity = "standard" | "competitive" | "highly_competitive";

/**
 * Row shape returned from the `colleges` table.
 */
export interface CollegeRecord {
  college_id: number;
  name: string;
  state: string | null;
  region: string | null;
  institution_type: string | null;
  is_public: boolean | null;
  website_url: string | null;
  acceptance_rate: number | null;
  is_test_optional: boolean;
  gpa_25th: number | null;
  gpa_75th: number | null;
  sat_25th: number | null;
  sat_75th: number | null;
  act_25th: number | null;
  act_75th: number | null;
  logo_url: string | null;
  data_source: string | null;
  last_data_refresh: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Row shape returned from the `student_saved_colleges` table.
 */
export interface SavedCollegeRecord {
  saved_college_id: number;
  student_id: number;
  college_id: number;
  status: SavedCollegeStatus;
  fit_classification: FitClassification | null;
  intended_major: string | null;
  major_selectivity: MajorSelectivity | null;
  is_in_state: boolean | null;
  readiness_band_at_save: string | null;
  saved_at: Date;
  updated_at: Date;
}

/**
 * Joined shape: saved college + college details.
 */
export interface SavedCollegeWithDetails extends SavedCollegeRecord {
  college_name: string;
  college_state: string | null;
  college_website_url: string | null;
  college_logo_url: string | null;
  college_acceptance_rate: number | null;
}

/**
 * Data shape for inserting a college from external API.
 */
export interface UpsertCollegeData {
  name: string;
  state: string | null;
  website_url: string | null;
  acceptance_rate: number | null;
  is_test_optional: boolean;
  is_public: boolean | null;
  logo_url: string | null;
  data_source: string;
  sat_25th: number | null;
  sat_75th: number | null;
  act_25th: number | null;
  act_75th: number | null;
}

/**
 * Data shape for saving a college for a student.
 */
export interface SaveCollegeData {
  student_id: number;
  college_id: number;
  intended_major: string | null;
  major_selectivity: MajorSelectivity | null;
  is_in_state: boolean | null;
  fit_classification: FitClassification | null;
  readiness_band_at_save: string | null;
}

/**
 * Data shape for updating a saved college.
 */
export interface UpdateSavedCollegeData {
  status?: SavedCollegeStatus;
  intended_major?: string | null;
  major_selectivity?: MajorSelectivity | null;
  is_in_state?: boolean | null;
  fit_classification?: FitClassification | null;
}
