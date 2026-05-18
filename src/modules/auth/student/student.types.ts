export interface StudentRecord {
  student_id: number;
  school_id: number | null;
  role: "student";
  account_status: "independent" | "school_linked" | "deletion_pending" | "purge_scheduled" | "permanently_deleted";
  is_active: boolean;
  phone_number: string;
  phone_verified: boolean;
  email: string | null;
  full_name: string;
  invite_token_used: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentProfileRecord {
  student_id: number;
  school_id: number | null;
  full_name: string;
  account_status: "independent" | "school_linked" | "deletion_pending" | "purge_scheduled" | "permanently_deleted";
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

export interface OtpRecord {
  otp_id: number;
  phone_number: string;
  purpose: "signup" | "login" | "phone_change";
  otp_code_hash: string;
  is_used: boolean;
  attempts: number;
  expires_at: Date;
  created_at: Date;
}

export interface CreateStudentData {
  phone_number: string;
  email: string | null;
  full_name: string;
  is_active: boolean;
  phone_verified: boolean;
  account_status: "independent" | "school_linked";
  school_id: number | null;
  invite_token_used: string | null;
  // profile fields
  graduation_year?: number;
  date_of_birth?: string;
  high_school_name?: string;
  state_of_residence?: string;
  // consent flags
  confirms_age_13_plus?: boolean;
  confirms_parental_permission?: boolean;
  college_data_share_consent?: boolean;
}

export interface CreateOtpData {
  phone_number: string;
  purpose: "signup" | "login" | "phone_change";
  otp_code_hash: string;
  expires_at: Date;
}

export interface SessionRecord {
  session_id: number;
  student_id: number;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface CreateSessionData {
  student_id: number;
  refresh_token_hash: string;
  expires_at: Date;
}
