// ── DB row shapes (returned from repository) ──────────────────────────────────

export interface SchoolPublicRow {
    school_id: number;
    school_name: string;
    state: string;
    email_domain: string;
  }
  
  export interface ReadinessSnapshotRow {
    snapshot_id: number;
    school_id: number;
    snapshot_date: Date;
    grade_level: number | null;
    foundational_count: number;
    developing_count: number;
    competitive_count: number;
    strongly_competitive_count: number;
    exceptional_count: number;
    total_students: number;
    pct_improved: number;
    created_at: Date;
  }
  
  export interface CollegeRow {
    college_id: number;
    name: string;
    state: string;
    city: string;
    type: string;
    website: string;
    created_at: Date;
  }
  
  // ── 59. GET /v1/schools/:schoolId ─────────────────────────────────────────────
  
  export interface GetSchoolResult {
    school_id: number;
    school_name: string;
    state: string;
    email_domain: string;
  }
  
  // ── 60. GET /v1/readiness/school/:schoolId/distribution ───────────────────────
  
  export interface ReadinessBandItem {
    grade_level: number | null;
    foundational_count: number;
    developing_count: number;
    competitive_count: number;
    strongly_competitive_count: number;
    exceptional_count: number;
    total_students: number;
    pct_improved: number;
    snapshot_date: string; // ISO 8601
  }
  
  export interface GetReadinessDistributionResult {
    school_id: number;
    distribution: ReadinessBandItem[];
  }
  
  // ── 61. GET /v1/colleges ──────────────────────────────────────────────────────
  
  export interface CollegeItem {
    college_id: number;
    name: string;
    state: string;
    city: string;
    type: string;
    website: string;
  }
  
  export interface GetCollegesResult {
    data: CollegeItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  }
  
  // ── 62. GET /v1/colleges/:collegeId ──────────────────────────────────────────
  
  export interface GetCollegeResult {
    college_id: number;
    name: string;
    state: string;
    city: string;
    type: string;
    website: string;
    created_at: string; // ISO 8601
  }




