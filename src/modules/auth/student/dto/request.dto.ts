export interface StudentRegisterInitDto {
  phone_number: string;
  email: string;
  full_name: string;
  grade?: number;
  graduation_year: number;
  date_of_birth: string;
  high_school_name: string;
  state_of_residence: string;
  confirms_age_13_plus: boolean;
  confirms_parental_permission: boolean;
  invite_token?: string;
  college_data_share_consent?: boolean;
}

export interface StudentRegisterVerifyDto {
  phone_number: string;
  otp_code: string;
}

export interface StudentLoginSendOtpDto {
  phone_number: string;
}

export interface StudentLoginVerifyDto {
  phone_number: string;
  otp_code: string;
}

// ── New APIs (1.1 – 1.8) ──────────────────────────────────────────────────

export interface SendOtpDto {
  phone_number: string;
  purpose: "signup" | "login";
}

export interface VerifyOtpDto {
  phone_number: string;
  otp_code: string;
  purpose: "signup" | "login";
}

export interface ValidateInviteTokenDto {
  invite_token: string;
}

export interface SignupDto {
  phone_verify_token: string;
  invite_token?: string;
  full_name: string;
  grade?: number;
  graduation_year: number;
  date_of_birth: string;
  high_school_name: string;
  state_of_residence: string;
  confirms_age_13_plus: boolean;
  confirms_parental_permission: boolean;
  college_data_share_consent: boolean;
}

export interface LoginDto {
  phone_verify_token: string;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface LogoutDto {
  refresh_token?: string;
}
