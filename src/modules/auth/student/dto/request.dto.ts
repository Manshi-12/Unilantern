export interface StudentRegisterInitDto {
  phone_number: string;
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
