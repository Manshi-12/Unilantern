export interface StudentScoresRecord {
  score_id: number;
  student_id: number;
  gpa_norm: number | null;
  rigor_norm: number | null;
  test_norm: number | null;
  test_present: boolean | null;
  gpa_contrib: number | null;
  rigor_contrib: number | null;
  test_contrib: number | null;
  academics_contrib: number | null;
  academics_cap_applied: boolean;
  ec_norm: number | null;
  ec_contrib: number | null;
  ec_early_strength_bonus: number;
  essay_norm: number | null;
  essay_contrib: number | null;
  awards_raw: number | null;
  awards_norm: number | null;
  awards_contrib: number | null;
  service_norm: number | null;
  service_contrib: number | null;
  total_score: number | null;
  readiness_band: string | null;
  on_track_status: string | null;
  academics_band: string | null;
  ec_band: string | null;
  essay_band: string | null;
  awards_band: string | null;
  service_band: string | null;
  exceptional_gate_met: boolean;
  foundational_floor_applied: boolean;
  developing_floor_applied: boolean;
  primary_limiter: string | null;
  has_standout_awards: boolean;
  has_founder_ec: boolean;
  has_academic_strength: boolean;
  has_independent_impact: boolean;
  calculated_at: Date;
  updated_at: Date;
}

export interface StudentScoreHistoryRecord {
  history_id: number;
  student_id: number;
  snapshot_term: string;
  grade_at_snapshot: number;
  total_score: number | null;
  readiness_band: string | null;
  academics_band: string | null;
  ec_band: string | null;
  essay_band: string | null;
  awards_band: string | null;
  service_band: string | null;
  primary_limiter: string | null;
  trend_direction: string | null;
  snapshot_at: Date;
}

export interface StudentProfileMinimal {
  student_id: number;
  grade: number | null;
  profile_complete: boolean;
}
