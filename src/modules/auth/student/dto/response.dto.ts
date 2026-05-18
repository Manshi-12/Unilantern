export interface StudentRegisterInitResponseDto {
  otp_sent: true;
  phone_masked: string;
  expires_in_seconds: number;
}

export interface StudentAuthResponseDto {
  access_token: string;
  student_id: string;
  role: "student";
  account_status: "independent" | "school_linked" | "deletion_pending" | "purge_scheduled" | "permanently_deleted";
  school_id: string | null;
  email: string | null;
  full_name: string;
}

export interface StudentRegisterVerifyResponseDto {
  student_id: string;
  access_token: string;
  refresh_token: string;
  account_status: "independent" | "school_linked" | "deletion_pending" | "purge_scheduled" | "permanently_deleted";
  consents_recorded: string[];
}

// ── New APIs (1.1 – 1.8) ──────────────────────────────────────────────────

export interface OtpSentResponseDto {
  otp_sent: true;
  phone_masked: string;
  expires_in_seconds: number;
}

export interface OtpVerifyResponseDto {
  verified: true;
  phone_number: string;
  purpose: "signup" | "login";
  phone_verify_token: string;
  expires_in_seconds: number;
}

export interface ValidateInviteResponseDto {
  valid: boolean;
  school_id: string | null;
  school_name: string | null;
}

export interface TokenPairResponseDto extends StudentAuthResponseDto {
  refresh_token: string;
  refresh_token_expires_at: string;
}

export interface RefreshTokenResponseDto {
  access_token: string;
  refresh_token: string;
  refresh_token_expires_at: string;
}

export interface MeResponseDto {
  student_id: string;
  full_name: string;
  email: string | null;
  phone_masked: string;
  role: "student";
  account_status: "independent" | "school_linked" | "deletion_pending" | "purge_scheduled" | "permanently_deleted";
  school_id: string | null;
  is_active: boolean;
  phone_verified: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface LogoutResponseDto {
  success: true;
  message: string;
}
