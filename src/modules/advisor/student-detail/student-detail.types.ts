export interface StudentSummary {
    student_id: number
    full_name: string
    grade: number | null
    school_name: string | null
    readiness_band: string | null
    on_track_status: string | null
    academics_band: string | null
    ec_band: string | null
    essay_band: string | null
    awards_band: string | null
    service_band: string | null
    primary_limiter: string | null
    trend_direction: string | null
    saved_colleges: number
    last_active_at: Date | null
  }
  
  export interface StudentAcademics {
    unweighted_gpa: number | null
    course_rigor: string | null
    test_status: string | null
    sat_score: number | null
    act_score: number | null
  }
  
  export interface StudentExtracurricular {
    activity_id: number
    activity_name: string
    activity_type: string
    years_involved: string | null
    involvement_level: string | null
    activity_description: string
    impact_text: string
    impact_level: string | null
    display_order: number
  }
  
  export interface StudentEssay {
    essay_status: string
    essay_prompt: string | null
    essay_text: string | null
    word_count: number
    reviewer_type: string | null
    last_major_edit_at: Date | null
    updated_at: Date
  }
  
  export interface StudentHonor {
    award_id: number
    award_name: string
    award_level: string
    frequency: string
    annual_since_grade: number | null
    display_order: number
  }
  
  export interface StudentService {
    service_id: number
    total_hours_range: string | null
    action_type: string | null
    is_leadership: boolean
    description: string | null
    display_order: number
  }
  
  export interface MissedOpportunity {

    category: string
  
    message: string
  
    priority:
      | 'high'
      | 'medium'
      | 'low'
  }