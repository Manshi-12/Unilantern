// ─── Actual DB row — school_academic_calibration ──────────────────────────────
export interface CalibrationRow {
    calibration_id:          number;
    school_id:               number;
    gpa_band_override:       string | null;  // stored as JSON string e.g. '{"min":2.5,"max":4.0}'
    rigor_override:          string | null;
    sat_benchmark_override:  string | null;
    act_benchmark_override:  string | null;
    is_active:               boolean;
    set_by_admin_id:         number;
    updated_at:              string;
  }
  
  // ─── Parsed band shape (in/out of the JSON columns) ───────────────────────────
  export interface BandRange {
    min: number | null;
    max: number | null;
  }
  
  // ─── GET /calibration response ────────────────────────────────────────────────
  export interface CalibrationResponse {
    school_id:       number;
    is_overridden:   boolean;
    calibration: {
      gpa:   BandRange;
      rigor: BandRange;
      sat:   BandRange;
      act:   BandRange;
    };
    set_by_admin_id: number | null;
    updated_at:      string | null;
  }




