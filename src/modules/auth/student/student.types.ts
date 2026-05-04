export interface StudentRecord {
  student_id: number;
  school_id: number | null;
  role: "student";
  account_status: "independent" | "school_linked";
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
  account_status: "independent" | "school_linked";
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

export interface ExtracurricularRecord {
  activity_id: number;
  student_id: number;
  activity_name: string;
  activity_type: 'club' | 'sport' | 'job' | 'family' | 'project' | 'research' | 'other';
  years_involved: 'less_than_1' | '1' | '2' | '3' | '4_plus';
  involvement_level: 'explored' | 'consistent' | 'key_contributor' | 'leader_founder';
  activity_description: string;
  impact_text: string;
  impact_level: 'participation_only' | 'contributed' | 'measurable' | 'created_scaled';
  display_order: number;
  hours_per_week: 'under_2' | '2_to_5' | '6_to_10' | '11_to_20' | '20_plus';
  experience_duration_weeks: number | null;
  selective_acceptance_toggle: boolean;
  external_org_toggle: boolean;
  travel_or_residency_toggle: boolean;
  people_impacted: number;
  funds_raised: number;
  users_acquired: number;
  hours_delivered: number;
  competition_top_10_pct_toggle: boolean;
  finalist_or_winner_toggle: boolean;
  publication_or_presented_toggle: boolean;
  policy_or_partnership_toggle: boolean;
  structured_deliverable_toggle: boolean;
  language_or_skill_cert_toggle: boolean;
  documented_real_world_output: boolean;
  formal_selection_toggle: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExtracurricularData {
  student_id: number;
  activity_name: string;
  activity_type: 'club' | 'sport' | 'job' | 'family' | 'project' | 'research' | 'other';
  years_involved: 'less_than_1' | '1' | '2' | '3' | '4_plus';
  involvement_level: 'explored' | 'consistent' | 'key_contributor' | 'leader_founder';
  activity_description: string;
  impact_text: string;
  impact_level: 'participation_only' | 'contributed' | 'measurable' | 'created_scaled';
  hours_per_week: 'under_2' | '2_to_5' | '6_to_10' | '11_to_20' | '20_plus';
  experience_duration_weeks?: number;
  selective_acceptance_toggle?: boolean;
  external_org_toggle?: boolean;
  travel_or_residency_toggle?: boolean;
  people_impacted?: number;
  funds_raised?: number;
  users_acquired?: number;
  hours_delivered?: number;
  competition_top_10_pct_toggle?: boolean;
  finalist_or_winner_toggle?: boolean;
  publication_or_presented_toggle?: boolean;
  policy_or_partnership_toggle?: boolean;
  structured_deliverable_toggle?: boolean;
  language_or_skill_cert_toggle?: boolean;
  formal_selection_toggle?: boolean;
  documented_real_world_output_toggle?: boolean;
}

export interface UpdateExtracurricularData {
  activity_name?: string;
  activity_type?: 'club' | 'sport' | 'job' | 'family' | 'project' | 'research' | 'other';
  years_involved?: 'less_than_1' | '1' | '2' | '3' | '4_plus';
  involvement_level?: 'explored' | 'consistent' | 'key_contributor' | 'leader_founder';
  activity_description?: string;
  impact_text?: string;
  impact_level?: 'participation_only' | 'contributed' | 'measurable' | 'created_scaled';
  hours_per_week?: 'under_2' | '2_to_5' | '6_to_10' | '11_to_20' | '20_plus';
  experience_duration_weeks?: number;
  selective_acceptance_toggle?: boolean;
  external_org_toggle?: boolean;
  travel_or_residency_toggle?: boolean;
  people_impacted?: number;
  funds_raised?: number;
  users_acquired?: number;
  hours_delivered?: number;
  competition_top_10_pct_toggle?: boolean;
  finalist_or_winner_toggle?: boolean;
  publication_or_presented_toggle?: boolean;
  policy_or_partnership_toggle?: boolean;
  structured_deliverable_toggle?: boolean;
  language_or_skill_cert_toggle?: boolean;
  formal_selection_toggle?: boolean;
  documented_real_world_output_toggle?: boolean;
}

export interface ExtracurricularReorderData {
  activity_id: number;
  display_order: number;
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
  email: string;
  full_name: string;
  is_active: boolean;
  phone_verified: boolean;
  account_status: "independent" | "school_linked";
  school_id: number | null;
  invite_token_used: string | null;
  // profile fields
  graduation_year: number;
  date_of_birth: string;
  high_school_name: string;
  state_of_residence: string;
  // consent flags
  confirms_age_13_plus: boolean;
  confirms_parental_permission: boolean;
  college_data_share: boolean;
}

export interface CreateOtpData {
  phone_number: string;
  purpose: "signup" | "login" | "phone_change";
  otp_code_hash: string;
  expires_at: Date;
}
