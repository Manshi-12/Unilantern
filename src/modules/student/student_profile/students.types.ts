export interface StudentProfileRecord {
  student_id: number;
  school_id: number | null;
  full_name: string;
  account_status:
    | "independent"
    | "school_linked"
    | "deletion_pending"
    | "purge_scheduled"
    | "permanently_deleted";
  grade: number | null;
  graduation_year: number;
  high_school_name: string | null;
  state_of_residence: string | null;
  profile_complete: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateStudentProfileData {
  grade?: number;
  graduation_year?: number;
  high_school_name?: string;
  state_of_residence?: string;
}
