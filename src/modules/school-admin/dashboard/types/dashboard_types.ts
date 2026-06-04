// ─── Section A: Overview ──────────────────────────────────────────────────────
export interface OverviewSnapshot {
    school_id:              number;
    active_students_count:  number;
    competitive_plus_pct:   number;
    improved_last_term_pct: number;
    avg_colleges_saved:     number;
    total_schools_linked:   number;
    snapshot_generated_at:  string;
    data_as_of:             string;
  }
  
  // ─── Section B: College Intent ────────────────────────────────────────────────
  export interface CollegeIntentSnapshot {
    college_id:               number;
    save_count:               number;
    pct_competitive_or_higher: number;
    primary_limiting_category: string;
    trend_direction:           string;
    pct_saving_above_readiness: number;
    snapshot_date:             string;
  }
  
  export interface GeoIntentSnapshot {
    in_state_count:     number;
    out_of_state_count: number;
    pct_in_state:       number;
    snapshot_date:      string;
  }
  
  // ─── Section C: Gap Analysis ──────────────────────────────────────────────────
  export interface GapAnalysisRow {
    college_id:               number;
    save_count:               number;
    pct_competitive_or_higher: number;
    primary_limiting_category: string;
    trend_direction:           string;
    snapshot_date:             string;
  }
  
  // ─── Section D: Equity & Access ───────────────────────────────────────────────
  export interface ReadinessByGrade {
    grade_level:                 number;
    foundational_count:          number;
    developing_count:            number;
    competitive_count:           number;
    strongly_competitive_count:  number;
    exceptional_count:           number;
    total_students:              number;
    pct_improved:                number;
  }
  
  export interface EngagementByGrade {
    grade_level:            number;
    low_engagement_count:   number;
    flagged_needs_attention: number;
    dau:                    number;
    wau:                    number;
    mau:                    number;
  }
  
  // ─── Section F: Trajectory ────────────────────────────────────────────────────
  export interface TrajectoryByGrade {
    grade_level:      number;
    improving_count:  number;
    flat_count:       number;
    declining_count:  number;
    total_students:   number;
    snapshot_date:    string;
  }
  
  // ─── Section G: Engagement ────────────────────────────────────────────────────
  export interface EngagementSnapshot {
    grade_level:             number;
    dau:                     number;
    wau:                     number;
    mau:                     number;
    low_engagement_count:    number;
    flagged_needs_attention: number;
    snapshot_date:           string;
  }
  
  // ─── Section H: Senior Risk ───────────────────────────────────────────────────
  export interface SeniorRiskSnapshot {
    total_seniors:           number;
    pct_below_competitive:   number;
    pct_missing_match_or_safety: number;
    pct_missing_essay:       number;
    snapshot_date:           string;
  }
  
  // ─── Section I: Counseling Capacity ──────────────────────────────────────────
  export interface CounselingCapacity {
    active_advisors_count:    number;
    total_active_students:    number;
    needs_attention_count:    number;
    advisors_with_export:     number;
  }
  
  // ─── Section J: Readiness Drivers ────────────────────────────────────────────
  export interface ReadinessDriversSnapshot {
    grade_level:      number;
    improving_count:  number;
    flat_count:       number;
    declining_count:  number;
    total_students:   number;
    snapshot_date:    string;
    primary_limiting_category: string | null;
  }




