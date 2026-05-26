export interface CategoryBand {
    category: string
    band: string | null
    trend: '↑' | '↓' | '→' | null
  }
  
  export interface ReadinessCurrent {

    student_id: number
  
    readiness_band: string
  
    on_track_status: string | null
  
    trend_direction: string | null
  
    primary_limiter: string | null
  
    // ADD THESE
    academics_band: string | null
  
    ec_band: string | null
  
    essay_band: string | null
  
    awards_band: string | null
  
    service_band: string | null
  
    calculated_at: Date | null
  }
  
  export interface ReadinessSnapshot {
    snapshot_term: string
    grade_at_snapshot: number
    readiness_band: string
    academics_band: string | null
    ec_band: string | null
    essay_band: string | null
    awards_band: string | null
    service_band: string | null
    primary_limiter: string | null
    trend_direction: string | null
    snapshot_at: Date
  }
  
  export interface SchoolBandDistribution {
    band: string
    count: number
    percentage: number
  }