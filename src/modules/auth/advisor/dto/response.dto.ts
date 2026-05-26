export interface ValidateInviteResponseDto {

  valid: boolean;

  invited_email: string;

  school_name: string;

  school_id: number;

  expires_at: Date | null;
}

export interface RegisterAdvisorResponseDto {

  message: string;

  redirect: string;
}

export interface LoginAdvisorResponseDto {

  advisor_id: number;

  full_name: string;

  school_id: number;

  school_name: string;

  role: string;
}

export interface RefreshTokenResponseDto {

  advisor_id: number;

  school_id: number;

  role: string;

  email: string;
}

export interface ChangePasswordResponseDto {

  message: string;
}