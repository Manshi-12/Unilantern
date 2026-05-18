export interface StudentProfileResponseDto {
  student_id: number;
  full_name: string;
  grade: number | null;
  graduation_year: number;
  high_school_name: string | null;
  school_id: number | null;
  account_status:
    | "independent"
    | "school_linked"
    | "deletion_pending"
    | "purge_scheduled"
    | "permanently_deleted";
  state: string | null;
  city: string | null;
  is_profile_complete: boolean;
  profile_completion_pct: number;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileUpdateResponseDto {
  student_id: string;
  updated_fields: string[];
  score_recalc_queued: boolean;
  updated_at: string;
}
