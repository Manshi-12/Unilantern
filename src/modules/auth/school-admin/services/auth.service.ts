import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRepository } from '../repositories/auth.repository';
import { ApiError } from '../../../../shared/errors/ApiError';

const repo = new AuthRepository();

const BCRYPT_COST       = 12;
const ACCESS_TOKEN_TTL  = 24 * 60 * 60;           // 15 min (seconds)
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;  // 7 days (seconds)
const EMAIL_TOKEN_TTL   = 24 * 60 * 60;       // 24 hours (seconds)
const RESET_TOKEN_TTL   = 60 * 60;            // 1 hour (seconds)


// const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(payload: {
  sub: string;
  role: string;
  school_id: number;
  session_id: number;
}): string {
  const JWT_SECRET = process.env.JWT_SECRET!;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(payload: { sub: string; session_id: number }): string {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: ACCESS_TOKEN_TTL * 1000,
};

export const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: REFRESH_TOKEN_TTL * 1000,
  path: '/v1/auth/school-admin/refresh',
};

// ─── 1.1 Register School (Step 1) ─────────────────────────────────────────────

export const registerStep1 = async (body: {
  school_name: string;
  address: string;
  school_type: string;
  state: string;
  city: string;
  email_domain: string;
}) => {
  // Check if school with this domain already exists
  const existing = await repo.findSchoolByDomain(body.email_domain);

  if (existing) {
    if (existing.registration_status === 'active') {
      throw ApiError.conflict('SCHOOL_ALREADY_REGISTERED', 'This school already has an active admin account.');
    }
    // Exists but registration not yet complete — let them continue
    return {
      registration_id:     existing.school_id,
      school_name:         existing.school_name,
      registration_status: existing.registration_status,
      next_step:           'step2',
    };
  }

  // Create new school record
  const school = await repo.createSchool({
    school_name:  body.school_name,
    address:      body.address,
    school_type:  body.school_type,
    state:        body.state,
    city:         body.city,
    email_domain: body.email_domain,
  });

  return {
    registration_id:     school.school_id,
    school_name:         school.school_name,
    registration_status: school.registration_status,
    next_step:           'step2',
  };
};

// ─── 1.2 Submit Admin Details + Send Email Verification (Step 2) ──────────────

export const registerStep2 = async (
  body: {
    registration_id: number; // school_id from step 1
    full_name: string;
    email: string;
    phone_number?: string;
    job_title?: string;
  },
  sendVerificationEmail: (to: string, token: string) => Promise<void>,
) => {
  // Verify school exists
  const school = await repo.findSchoolById(body.registration_id);
  if (!school) throw ApiError.notFound('REGISTRATION_NOT_FOUND', 'Registration ID does not exist or has expired.');

  // Email domain must match school domain
  const emailDomain = body.email.split('@')[1];
  if (emailDomain !== school.email_domain) {
    throw ApiError.badRequest('EMAIL_DOMAIN_MISMATCH', 'Admin email domain does not match the school email domain.');
  }

  // Check email not already registered
  const existing = await repo.findAdminByEmail(body.email);
  if (existing) throw ApiError.conflict('EMAIL_ALREADY_REGISTERED', 'Email is already linked to an active admin account.');

  // Create verification token (valid 24h)
  const token = generateToken();

  const expires_at = new Date(
    Date.now() + EMAIL_TOKEN_TTL * 1000,
  );

  await repo.createEmailVerificationToken({
    email: body.email,
    school_id: body.registration_id,
    full_name: body.full_name,
    token,
    expires_at,
  });

  /*
  // Original production flow
  // Fire-and-forget — async retry handles failures
  sendVerificationEmail(body.email, token).catch(() => {});
  */

  // Development bypass — auto verify email
  if (process.env.NODE_ENV === 'development') {

    await repo.consumeLatestPendingVerificationToken(
      body.email,
    );

  } else {

    // Production flow
    sendVerificationEmail(body.email, token).catch(() => {});

  }
  return {
    email_sent:       true,
    masked_email:     maskEmail(body.email),
    token_expires_in: EMAIL_TOKEN_TTL,
    admin_status:     'pending',
  };
};

// ─── 1.3 Validate Email Token ─────────────────────────────────────────────────

export const verifyEmailToken = async (token: string) => {
  const record = await repo.findEmailVerificationToken(token);
  if (!record) throw ApiError.notFound('TOKEN_NOT_FOUND', 'Verification token does not exist.');
  if (record.status === 'used') throw ApiError.gone('TOKEN_ALREADY_USED', 'This verification token has already been used.');
  if (record.expires_at < new Date()) throw ApiError.gone('TOKEN_EXPIRED', 'Verification token has expired.');

  await repo.consumeEmailVerificationToken(record.token_id);

  return {
    verified:          true,
    registration_id:   record.school_id,
    next_step:         'step3',
    token_consumed_at: new Date().toISOString(),
  };
};

// ─── 1.4 Set Password + Complete Registration (Step 3) ────────────────────────

export const registerStep3 = async (
  body: { registration_id: number; full_name: string; password: string; confirm_password: string },
  setJwtCookies: (access: string, refresh: string) => void,
) => {
  const school = await repo.findSchoolById(body.registration_id);
  if (!school) throw ApiError.notFound('REGISTRATION_NOT_FOUND', 'Registration ID does not exist.');

  if (school.registration_status === 'active') {
    throw ApiError.conflict('REGISTRATION_ALREADY_COMPLETE', 'Admin account is already active.');
  }

  // Find the verified email for this school
  const record = await repo.findPendingEmailBySchoolId(body.registration_id);
  if (!record) throw ApiError.badRequest('EMAIL_NOT_VERIFIED', 'No verified email found for this registration. Please complete email verification first.');

  const password_hash = await bcrypt.hash(body.password, BCRYPT_COST);

  // Create admin record
  const { admin_id } = await repo.createAdmin({
    school_id:     body.registration_id,
    full_name:     body.full_name || record.full_name,
    email:         record.email,
    password_hash,
  });

  // Activate school
  await repo.activateSchool(body.registration_id);

  // Create session
  const refreshTokenRaw  = generateToken();
  const refreshTokenHash = hashToken(refreshTokenRaw); 
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  const { session_id } = await repo.createSession({
    admin_id,
    token_hash:  refreshTokenHash,
    ip_address:  '',
    device_info: '',
    expires_at,
  });

  const accessToken  = signAccessToken({ sub: String(admin_id), role: 'school_admin', school_id: body.registration_id, session_id });  const refreshToken = signRefreshToken({ sub: String(admin_id), session_id });
  setJwtCookies(accessToken, refreshTokenRaw);

  await repo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id:       body.registration_id,
    action_type:     'ADMIN_REGISTERED',
    target_resource: 'school_admins',
    metadata:        { email: record.email },
  });

  return {
    admin_id,
    school_id:           body.registration_id,
    registration_status: 'active',
    access_token_issued: true,
  };
};

// ─── 1.5 Login ────────────────────────────────────────────────────────────────

export const login = async (
  body: { email: string; password: string },
  meta: { ip_address: string; device_info: string },
  setJwtCookies: (access: string, refresh: string) => void,
) => {
  const admin = await repo.findAdminByEmail(body.email);

  // Constant-time protection — always compare even if not found
  const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000';
  const hashToCompare = admin ? admin.password_hash : dummyHash;
  const valid = await bcrypt.compare(body.password, hashToCompare);

  if (!admin || !valid) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Email or password is incorrect.');
  if (!admin.is_active) throw ApiError.forbidden('ACCOUNT_INACTIVE', 'Admin account is deactivated.');

  const school = await repo.findSchoolById(admin.school_id);

  const refreshTokenRaw  = generateToken();
  const refreshTokenHash = hashToken(refreshTokenRaw);
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  const { session_id } = await repo.createSession({
    admin_id:    admin.admin_id,
    token_hash:  refreshTokenHash,
    ip_address:  meta.ip_address,
    device_info: meta.device_info,
    expires_at,
  });

  await repo.writeAuditLog({
    actor_admin_id:  admin.admin_id,
    actor_role:      admin.admin_role,
    school_id:       admin.school_id,
    action_type:     'ADMIN_LOGIN',
    target_resource: 'admin_sessions',
    metadata:        { ip_address: meta.ip_address, device_info: meta.device_info },
  });

  const accessToken  = signAccessToken({ sub: String(admin.admin_id), role: 'school_admin', school_id: admin.school_id, session_id });  const refreshToken = signRefreshToken({ sub: String(admin.admin_id), session_id });

  setJwtCookies(accessToken, refreshTokenRaw);

  return {
    admin_id:            admin.admin_id,
    school_id:           admin.school_id,
    full_name:           admin.full_name,
    role:                'school_admin',
    school_name:         school?.school_name ?? '',
    registration_status: 'active',
    last_login_at:       null,
  };
};

// ─── 1.6 Logout ───────────────────────────────────────────────────────────────

export const logout = async (
  adminId: number,
  sessionId: number,
  meta: { ip_address: string; device_info: string },
  clearCookies: () => void,
) => {
  await repo.invalidateSession(sessionId);
  clearCookies();

  const admin = await repo.findAdminById(adminId);

  await repo.writeAuditLog({
    actor_admin_id:  adminId,
    actor_role:      admin?.admin_role ?? 'school_admin',
    school_id:       admin?.school_id ?? null,
    action_type:     'ADMIN_LOGOUT',
    target_resource: 'admin_sessions',
    metadata:        { session_id: sessionId, ip_address: meta.ip_address },
  });

  return { logged_out: true };
};

// ─── 1.7 Refresh Access Token ─────────────────────────────────────────────────

export const refreshAccessToken = async (
  refreshTokenRaw: string,
  setAccessCookie: (token: string) => void,
  setRefreshCookie: (token: string) => void,
) => {
  let payload: any;
  try {
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!; 
    payload = jwt.verify(refreshTokenRaw, JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('REFRESH_TOKEN_INVALID', 'Refresh token is missing, expired, or invalid.');
  }

  const tokenHash = hashToken(refreshTokenRaw);
  const session   = await repo.findSessionByTokenHash(tokenHash);

  if (!session || session.invalidated_at || session.expires_at < new Date()) {
    throw ApiError.unauthorized('REFRESH_TOKEN_INVALID', 'Session has been invalidated. Please log in again.');
  }

  const newRefreshRaw  = generateToken();
  const newRefreshHash = hashToken(newRefreshRaw);
  const newExpiresAt   = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await repo.rotateSessionToken(session.session_id, newRefreshHash, newExpiresAt);

  const admin = await repo.findAdminById(session.admin_id);
  const newAccess = signAccessToken({
    sub:        String(session.admin_id),
    role:       'school_admin',
    school_id:  admin?.school_id ?? payload.school_id,
    session_id: session.session_id,
  });

  setAccessCookie(newAccess);
  setRefreshCookie(newRefreshRaw);

  return {
    access_token_refreshed: true,
    expires_in:             ACCESS_TOKEN_TTL,
  };
};

// ─── 1.8 Change Password ──────────────────────────────────────────────────────

export const changePassword = async (
  adminId: number,
  sessionId: number,
  body: { current_password: string; new_password: string; confirm_password: string },
  meta: { ip_address: string; device_info: string },
) => {
  const currentHash = await repo.getAdminPasswordHash(adminId);
  if (!currentHash) throw ApiError.unauthorized('TOKEN_INVALID', 'Admin not found.');

  const valid = await bcrypt.compare(body.current_password, currentHash);
  if (!valid) throw ApiError.unauthorized('CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect.');

  const newHash = await bcrypt.hash(body.new_password, BCRYPT_COST);
  await repo.updateAdminPassword(adminId, newHash);

  await repo.invalidateAllSessionsExceptCurrent(adminId, sessionId);

  const admin = await repo.findAdminById(adminId);

  await repo.writeAuditLog({
    actor_admin_id:  adminId,
    actor_role:      admin?.admin_role ?? 'school_admin',
    school_id:       admin?.school_id ?? null,
    action_type:     'PASSWORD_CHANGED',
    target_resource: 'school_admins',
    metadata:        { ip_address: meta.ip_address },
  });

  return {
    changed:                true,
    other_sessions_revoked: true,
  };
};

// ─── 1.9 Forgot Password ─────────────────────────────────────────────────────

export const forgotPassword = async (
  body: { email: string },
  sendResetEmail: (to: string, token: string) => Promise<void>,
) => {
  // ALWAYS return 200 — prevents email enumeration
  const admin = await repo.findAdminByEmail(body.email);

  if (admin && admin.is_active) {
    const token      = generateToken();
    console.log("RESET TOKEN:", token);
    const expires_at = new Date(Date.now() + RESET_TOKEN_TTL * 1000);

    await repo.createPasswordResetToken({
      email:     body.email,
      school_id: admin.school_id,
      token,
      expires_at,
    });

    sendResetEmail(body.email, token).catch(() => {});

    await repo.writeAuditLog({
      actor_admin_id:  admin.admin_id,
      actor_role:      admin.admin_role,
      school_id:       admin.school_id,
      action_type:     'PASSWORD_RESET_REQUESTED',
      target_resource: 'email_verification_tokens',
      metadata:        { email: body.email },
    });
  }

  return {
    email_sent:   true,
    masked_email: maskEmail(body.email),
    expires_in:   RESET_TOKEN_TTL,
  };
};

// ─── 1.10 Reset Password ─────────────────────────────────────────────────────

export const resetPassword = async (
  body: { reset_token: string; new_password: string; confirm_password: string },
) => {
  const record = await repo.findPasswordResetToken(body.reset_token);
  if (!record) throw ApiError.notFound('TOKEN_NOT_FOUND', 'Reset token does not exist.');
  if (record.status === 'used') throw ApiError.gone('TOKEN_ALREADY_USED', 'This reset token has already been used.');
  if (record.expires_at < new Date()) throw ApiError.gone('TOKEN_EXPIRED', 'Reset token has expired.');

  const newHash = await bcrypt.hash(body.new_password, BCRYPT_COST);

  await repo.consumePasswordResetToken(record.token_id);

  const admin = await repo.findAdminByEmail(record.email);
  if (admin) {
    await repo.updateAdminPassword(admin.admin_id, newHash);
    await repo.invalidateAllSessions(admin.admin_id);

    await repo.writeAuditLog({
      actor_admin_id:  admin.admin_id,
      actor_role:      admin.admin_role,
      school_id:       admin.school_id,
      action_type:     'PASSWORD_RESET_COMPLETED',
      target_resource: 'school_admins',
      metadata:        { email: record.email },
    });
  }

  return {
    reset:                true,
    all_sessions_revoked: true,
  };
};





