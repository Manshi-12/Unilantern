export interface ValidateInviteRequestDto {

  token: string;
}

export interface RegisterAdvisorRequestDto {

  token: string;

  email: string;

  full_name: string;

  contact_no?: string;

  password: string;

  confirm_password: string;
}

export interface LoginAdvisorRequestDto {

  email: string;

  password: string;
}

export interface ChangePasswordRequestDto {

  current_password: string;

  new_password: string;

  confirm_password: string;
}