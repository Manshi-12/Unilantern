/**
 * `student_saved_colleges` table — student-saved college list with fit classification.
 * Source: unilantern_sqlserver_part2_tables16to25.sql TABLE 17
 * Status tracks application lifecycle (saved → applied → admitted).
 */

export const STUDENT_SAVED_COLLEGES_TABLE = "student_saved_colleges";

export const studentSavedCollegesColumns = {
  saved_college_id:      "saved_college_id",
  student_id:            "student_id",
  college_id:            "college_id",
  status:                "status",
  fit_classification:    "fit_classification",
  intended_major:        "intended_major",
  major_selectivity:     "major_selectivity",
  is_in_state:           "is_in_state",
  readiness_band_at_save:"readiness_band_at_save",
  saved_at:              "saved_at",
  updated_at:            "updated_at",
} as const;
