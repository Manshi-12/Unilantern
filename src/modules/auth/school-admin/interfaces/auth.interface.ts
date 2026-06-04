// ── DB row shapes (returned from repository) ──────────────────────────────────

export interface SchoolRow {
  school_id: number;
  school_name: string;
  address: string;
  school_type: 'public' | 'private' | 'charter';
  state: string;
  city: string;
  email_domain: string;
  registration_status: string;
  created_at: Date;
}

export interface AdminRow {
  admin_id: number;
  school_id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  job_title: string | null;
  password_hash: string | null;
  registration_status: string;
  admin_status: string;
  created_at: Date;
  last_login_at: Date | null;
}

export interface VerificationTokenRow {
  token_id: number;
  registration_id: number;
  token: string;
  token_type: string;
  status: 'pending' | 'used' | 'expired';
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface PasswordResetTokenRow {
  token_id: number;
  admin_id: number;
  token: string;
  token_type: 'password_reset';
  consumed_at: Date | null;
  expires_at: Date;
  created_at: Date;
}

export interface SessionRow {
  session_id: number;
  admin_id: number;
  school_id: number;
  refresh_token_hash: string;
  ip_address: string | null;
  device_info: string | null;
  created_at: Date;
  last_active_at: Date;
  invalidated_at: Date | null;
}

export interface AuditLogRow {
  audit_id: number;
  event_type: string;
  admin_id: number | null;
  school_id: number | null;
  ip_address: string;
  device_info: string;
  description: string;
  occurred_at: Date;
}

// ── 1.1 Submit School Details (Step 1) ────────────────────────────────────────

export interface RegisterStep1Input {
  school_name: string;
  address: string;
  school_type: 'public' | 'private' | 'charter';
  state: string;
  city: string;
  email_domain: string;
}

export interface RegisterStep1Result {
  registration_id: number;
  registration_status: 'pending_verification';
  next_step: 'step2';
}

// ── 1.2 Submit Admin Details + Send Email Verification (Step 2) ───────────────

export interface RegisterStep2Input {
  registration_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  job_title?: string;
}

export interface RegisterStep2Result {
  email_sent: boolean;
  masked_email: string;
  token_expires_in: number; // always 86400
  admin_status: 'pending';
}

// ── 1.3 Validate Email Token ──────────────────────────────────────────────────

export interface VerifyEmailResult {
  verified: true;
  registration_id: number;
  next_step: 'step3';
  token_consumed_at: string; // ISO 8601
}

// ── 1.4 Set Password + Complete Registration (Step 3) ─────────────────────────

export interface RegisterStep3Input {
  registration_id: number;
  password: string;
  confirm_password: string;
}

export interface RegisterStep3Result {
  admin_id: number;
  school_id: number;
  registration_status: 'active';
  access_token_issued: true;
}

// ── 1.5 Login ─────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginMeta {
  ip_address: string;
  device_info: string;
}

export interface LoginResult {
  admin_id: number;
  school_id: number;
  full_name: string;
  role: 'school_admin';
  school_name: string;
  registration_status: 'active';
  last_login_at: string | null; // ISO 8601 or null on first login
}

// ── 1.6 Logout ────────────────────────────────────────────────────────────────

export interface LogoutResult {
  logged_out: true;
}

// ── 1.7 Refresh Access Token ──────────────────────────────────────────────────

export interface RefreshResult {
  access_token_refreshed: true;
  expires_in: number; // always 900
}

// ── 1.8 Change Password ───────────────────────────────────────────────────────

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResult {
  changed: true;
  other_sessions_revoked: true;
}

// ── 1.9 Forgot Password ■ MUST CREATE ────────────────────────────────────────

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordResult {
  email_sent: true;
  masked_email: string;
  expires_in: number; // always 3600
}

// ── 1.10 Reset Password ■ MUST CREATE ────────────────────────────────────────

export interface ResetPasswordInput {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordResult {
  reset: true;
  all_sessions_revoked: true;
}

// ── Repository contract (for type-checking the implementation) ────────────────

export interface IAuthRepository {
  findSchoolByDomain(email_domain: string): Promise<{ school_id: number } | null>;
  createSchool(data: RegisterStep1Input): Promise<number>;
  findRegistrationById(registration_id: number): Promise<{
    registration_id: number;
    registration_status: string;
    email_domain: string;
    email_verified: boolean;
  } | null>;
  findAdminByEmail(email: string): Promise<{ admin_id: number } | null>;
  createAdminDetails(data: RegisterStep2Input): Promise<void>;
  updateRegistrationStatus(registration_id: number, status: string): Promise<void>;
  createEmailVerificationToken(registration_id: number, token: string, expires_at: Date): Promise<void>;
  findEmailVerificationToken(token: string): Promise<{
    token_id: number;
    registration_id: number;
    consumed_at: Date | null;
    expires_at: Date;
  } | null>;
  consumeEmailVerificationToken(token_id: number): Promise<Date>;
  setAdminPassword(registration_id: number, password_hash: string): Promise<{ admin_id: number; school_id: number }>;
  findActiveAdminByEmail(email: string): Promise<{
    admin_id: number;
    school_id: number;
    full_name: string;
    school_name: string;
    registration_status: string;
    password_hash: string;
    last_login_at: Date | null;
  } | null>;
  createSession(data: {
    admin_id: number;
    school_id: number;
    ip_address: string;
    device_info: string;
    refresh_token_hash: string;
  }): Promise<{ session_id: number }>;
  updateLastLogin(admin_id: number): Promise<void>;
  findSessionByRefreshTokenHash(hash: string): Promise<{
    session_id: number;
    admin_id: number;
    school_id: number;
    invalidated_at: Date | null;
  } | null>;
  invalidateSession(session_id: number): Promise<void>;
  invalidateAllSessionsExceptCurrent(admin_id: number, current_session_id: number): Promise<void>;
  invalidateAllSessions(admin_id: number): Promise<void>;
  rotateRefreshToken(session_id: number, new_hash: string): Promise<void>;
  getAdminPasswordHash(admin_id: number): Promise<string | null>;
  updateAdminPassword(admin_id: number, new_hash: string): Promise<void>;
  findAdminByEmailForReset(email: string): Promise<{ admin_id: number; registration_status: string } | null>;
  createPasswordResetToken(admin_id: number, token: string, expires_at: Date): Promise<void>;
  findPasswordResetToken(token: string): Promise<{
    token_id: number;
    admin_id: number;
    consumed_at: Date | null;
    expires_at: Date;
  } | null>;
  consumePasswordResetToken(token_id: number): Promise<void>;
  writeAuditLog(data: {
    event_type: string;
    admin_id: number | null;
    school_id: number | null;
    ip_address: string;
    device_info: string;
    description: string;
  }): Promise<void>;
}






