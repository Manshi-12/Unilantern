export interface StudentSendOtpRequestDto {
  phone_number: string;
  purpose: "signup" | "login";
}

export interface StudentVerifyOtpRequestDto {
  phone_number: string;
  otp_code: string;
  purpose: "signup" | "login";
}

export interface StudentRegisterRequestDto {
  phone_number: string;
  otp_code: string;
  full_name: string;
  graduation_year: number;
  date_of_birth: string;
  high_school_name: string;
  state_of_residence: string;
  confirms_age_13_plus: boolean;
  confirms_parental_permission: boolean;
  invite_token?: string;
  college_data_share?: boolean;
}

export interface StudentLoginRequestDto {
  phone_number: string;
  otp_code: string;
}
