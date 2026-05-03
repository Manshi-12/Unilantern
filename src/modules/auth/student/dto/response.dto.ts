export interface StudentSendOtpResponseDto {
  expires_in_seconds: number;
  phone_masked: string;
}

export interface StudentAuthResponseDto {
  access_token: string;
  student_id: string;
  role: "student";
  account_status: "independent" | "school_linked";
  school_id?: string | null;
  full_name: string;
}

export interface StudentVerifyOtpResponseDto {
  verified: boolean;
  phone_number: string;
  purpose: "signup" | "login";
}
