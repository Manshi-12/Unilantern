export interface StudentRegisterInitResponseDto {
  otp_sent: true;
  phone_masked: string;
  expires_in_seconds: number;
}

export interface StudentAuthResponseDto {
  access_token: string;
  student_id: string;
  role: "student";
  account_status: "independent" | "school_linked";
  school_id: string | null;
  email: string | null;
  full_name: string;
}
