export interface StudentProfileRecord {
  student_id: number;
  school_id: number | null;
  full_name: string;
  account_status: "independent" | "school_linked";
  grade: number | null;
  graduation_year: number;
  high_school_name: string | null;
  state_of_residence: string | null;
  date_of_birth: Date | null;
  profile_complete: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateStudentProfileData {
  grade?: number;
  graduation_year?: number;
  high_school_name?: string;
  state_of_residence?: string;
  date_of_birth?: string;
}
