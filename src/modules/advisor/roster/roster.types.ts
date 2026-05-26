export interface RosterStudent {
    student_id: number
    full_name: string
  
    readiness_band: string | null
    primary_gap: string | null
    trend: '↑' | '↓' | '→'
  
    saved_colleges: number
  
    last_active: Date | null
    low_engagement: boolean
  }
  
  export interface RosterFilters {
    readiness_band?: string
    needs_intervention?: boolean
    saved_selective?: boolean
    low_engagement?: boolean
  
    page: number
    limit: number
  }
  
  export type PriorityLabel =
    | 'Urgent'
    | 'Needs Review'
    | 'Monitor'
  
  export interface PriorityStudent {
    student_id: number
    full_name: string
  
    readiness_band: string | null
  
    priority_label: PriorityLabel
  
    flags: string[]
  }