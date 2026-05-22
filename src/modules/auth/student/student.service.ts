import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  PHONE_VERIFY_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../../../config/constants.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { ConflictError } from "../../../shared/errors/conflict-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../../../shared/utils/otp.js";
import { signAccessToken, signPhoneVerifyToken, verifyPhoneVerifyToken } from "../../../shared/utils/jwt.js";
import { maskPhone, normalizePhone } from "../../../shared/utils/phone.js";
import { generateRefreshToken, hashRefreshToken } from "../../../shared/utils/token.js";
import { computeAge } from "./student.schema.js";

import type {
  StudentRegisterInitDto,
  StudentRegisterVerifyDto,
  StudentLoginSendOtpDto,
  StudentLoginVerifyDto,
  SendOtpDto,
  VerifyOtpDto,
  ValidateInviteTokenDto,
  SignupDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
} from "./dto/request.dto.js";
import type {
  StudentRegisterInitResponseDto,
  StudentRegisterVerifyResponseDto,
  StudentAuthResponseDto,
  OtpSentResponseDto,
  OtpVerifyResponseDto,
  ValidateInviteResponseDto,
  TokenPairResponseDto,
  RefreshTokenResponseDto,
  MeResponseDto,
  LogoutResponseDto,
} from "./dto/response.dto.js";
import type { OtpRepository, StudentRepository } from "./student.repository.js";
import type { SessionRepository } from "./session.repository.js";
import type { OtpRecord, StudentRecord } from "./student.types.js";

// Pending registrations: phone -> signup data, expires after OTP window
interface PendingRegistration {
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
  college_data_share_consent: boolean;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly otpRepo: OtpRepository,
    private readonly sessionRepo: SessionRepository,
  ) {}

  // ── REGISTRATION: Step 1 ─────────────────────────────────────────────────
  // Accept basic signup data, validate it, store temporarily, send OTP
  async registerInit(dto: StudentRegisterInitDto): Promise<StudentRegisterInitResponseDto> {
    const phone = normalizePhone(dto.phone_number);
    const email = normalizeEmail(dto.email);

    const existing = await this.studentRepo.findByPhone(phone);
    if (existing) {
      if (!existing.is_active) {
        throw new ConflictError(
          AuthErrorCode.PHONE_UNAVAILABLE,
          "Unable to create account with this number.",
        );
      }
      throw new ConflictError(
        AuthErrorCode.PHONE_ALREADY_REGISTERED,
        "Phone number is already registered",
      );
    }

    const existingEmail = await this.studentRepo.findByEmail(email);
    if (existingEmail) {
      throw new ConflictError(
        AuthErrorCode.EMAIL_ALREADY_REGISTERED,
        "Email address is already registered",
      );
    }

    const age = computeAge(dto.date_of_birth);
    if (age < 13) {
      throw new AuthError(AuthErrorCode.AGE_GATE_FAILED, "Must be at least 13 years old", 403);
    }
    if (!dto.confirms_age_13_plus) {
      throw new AuthError(AuthErrorCode.AGE_CONFIRMATION_REQUIRED, "Age confirmation is required", 400);
    }
    if (age <= 17 && !dto.confirms_parental_permission) {
      throw new AuthError(AuthErrorCode.PARENTAL_CONSENT_REQUIRED, "Parental consent is required for minors", 403);
    }

    // Store signup data temporarily until OTP is verified
    pendingRegistrations.set(phone, {
      email,
      full_name: dto.full_name.trim(),
      grade: dto.grade,
      graduation_year: dto.graduation_year,
      date_of_birth: dto.date_of_birth,
      high_school_name: dto.high_school_name,
      state_of_residence: dto.state_of_residence,
      confirms_age_13_plus: dto.confirms_age_13_plus,
      confirms_parental_permission: dto.confirms_parental_permission,
      invite_token: dto.invite_token,
      college_data_share_consent: dto.college_data_share_consent ?? true,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
    });

    await this.otpRepo.invalidatePreviousOtps(phone, "signup");

    const code = generateOtp();
    const otp_code_hash = await hashOtp(code);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.otpRepo.createOtp({ phone_number: phone, purpose: "signup", otp_code_hash, expires_at });
    await this.dispatchOtp(phone, code);

    return {
      otp_sent: true,
      phone_masked: maskPhone(phone),
      expires_in_seconds: OTP_TTL_SECONDS,
    };
  }

  // ── REGISTRATION: Step 2 ─────────────────────────────────────────────────
  // Verify OTP -> insert student -> return JWT
  async registerVerify(dto: StudentRegisterVerifyDto): Promise<StudentRegisterVerifyResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    await this.consumeOtp(phone, dto.otp_code, "signup");

    const pending = pendingRegistrations.get(phone);
    if (!pending || Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(phone);
      throw new AuthError(AuthErrorCode.OTP_EXPIRED, "Registration session expired. Please start again.", 401);
    }
    pendingRegistrations.delete(phone);

    const existing = await this.studentRepo.findByPhone(phone);
    if (existing) {
      if (!existing.is_active) {
        throw new ConflictError(
          AuthErrorCode.PHONE_UNAVAILABLE,
          "Unable to create account with this number.",
        );
      }
      throw new ConflictError(AuthErrorCode.PHONE_ALREADY_REGISTERED, "Phone number is already registered");
    }

    const existingEmail = await this.studentRepo.findByEmail(pending.email);
    if (existingEmail) {
      throw new ConflictError(AuthErrorCode.EMAIL_ALREADY_REGISTERED, "Email address is already registered");
    }

    const inviteResolution = await this.resolveInviteToken(pending.invite_token);

    const created = await this.studentRepo.createStudent({
      phone_number: phone,
      email: pending.email,
      full_name: pending.full_name,
      is_active: true,
      phone_verified: true,
      account_status: inviteResolution.school_id !== null ? "school_linked" : "independent",
      school_id: inviteResolution.school_id,
      invite_token_used: inviteResolution.token_used,
      grade: pending.grade,
      graduation_year: pending.graduation_year,
      date_of_birth: pending.date_of_birth,
      high_school_name: pending.high_school_name,
      state_of_residence: pending.state_of_residence,
      confirms_age_13_plus: pending.confirms_age_13_plus,
      confirms_parental_permission: pending.confirms_parental_permission,
      college_data_share_consent: pending.college_data_share_consent,
    });

    return this.buildRegisterVerifyResponse(created, [
      ...(pending.confirms_age_13_plus ? ["age_13plus"] : []),
      ...(pending.confirms_parental_permission ? ["parental_13_17"] : []),
      ...(pending.college_data_share_consent ? ["college"] : []),
    ]);
  }

  // ── LOGIN: Step 1 ─────────────────────────────────────────────────────────
  // Check account exists → send OTP
  async loginSendOtp(dto: StudentLoginSendOtpDto): Promise<StudentRegisterInitResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    const existing = await this.studentRepo.findByPhone(phone);
    if (!existing || !existing.is_active) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DELETED,
        "This account has been deleted.",
        401,
      );
    }

    await this.otpRepo.invalidatePreviousOtps(phone, "login");

    const code = generateOtp();
    const otp_code_hash = await hashOtp(code);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.otpRepo.createOtp({ phone_number: phone, purpose: "login", otp_code_hash, expires_at });
    await this.dispatchOtp(phone, code);

    return {
      otp_sent: true,
      phone_masked: maskPhone(phone),
      expires_in_seconds: OTP_TTL_SECONDS,
    };
  }

  // ── LOGIN: Step 2 ─────────────────────────────────────────────────────────
  // Verify OTP → update last_login → return JWT
  async loginVerify(dto: StudentLoginVerifyDto): Promise<StudentAuthResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    const student = await this.studentRepo.findByPhone(phone);
    if (!student) {
      throw new AuthError(AuthErrorCode.PHONE_NOT_FOUND, "No account found for this phone number", 404);
    }
    if (!student.is_active) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DELETED,
        "This account has been deleted.",
        401,
      );
    }

    await this.consumeOtp(phone, dto.otp_code, "login");
    await this.studentRepo.updateLastLogin(student.student_id);

    return this.buildAuthResponse(student);
  }

  // ── New APIs (1.1 – 1.8) ──────────────────────────────────────────────────

  // 1.1 POST /otp/send — Send OTP to phone
  async sendOtp(dto: SendOtpDto): Promise<OtpSentResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    if (dto.purpose === "login") {
      const student = await this.studentRepo.findByPhone(phone);
      if (!student || !student.is_active) {
        throw new AuthError(
          AuthErrorCode.ACCOUNT_DELETED,
          "This account has been deleted.",
          401,
        );
      }
    } else {
      const existing = await this.studentRepo.findByPhone(phone);
      if (existing) {
        if (!existing.is_active) {
          throw new ConflictError(
            AuthErrorCode.PHONE_UNAVAILABLE,
            "Unable to create account with this number.",
          );
        }
        throw new ConflictError(AuthErrorCode.PHONE_ALREADY_REGISTERED, "Phone number is already registered");
      }
    }

    await this.otpRepo.invalidatePreviousOtps(phone, dto.purpose);

    const code = generateOtp();
    const otp_code_hash = await hashOtp(code);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.otpRepo.createOtp({ phone_number: phone, purpose: dto.purpose, otp_code_hash, expires_at });
    await this.dispatchOtp(phone, code);

    return { otp_sent: true, phone_masked: maskPhone(phone), expires_in_seconds: OTP_TTL_SECONDS };
  }

  // 1.2 POST /otp/verify — Verify OTP, consume it, return short-lived phone_verify_token for /signup or /login
  async verifyOtp(dto: VerifyOtpDto): Promise<OtpVerifyResponseDto> {
    const phone = normalizePhone(dto.phone_number);
    const otp = await this.otpRepo.findLatestValidOtp(phone, dto.purpose);

    if (!otp || otp.expires_at.getTime() <= Date.now()) {
      throw new AuthError(AuthErrorCode.OTP_EXPIRED, "OTP is invalid or has expired", 401);
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AuthError(AuthErrorCode.OTP_TOO_MANY_ATTEMPTS, "Too many attempts. Request a new OTP.", 429);
    }

    const ok = await verifyOtpHash(dto.otp_code, otp.otp_code_hash);
    if (!ok) {
      await this.otpRepo.incrementAttempts(otp.otp_id);
      throw new AuthError(AuthErrorCode.OTP_INVALID, "Invalid OTP code", 401);
    }

    await this.otpRepo.markUsed(otp.otp_id);
    const phone_verify_token = await signPhoneVerifyToken(phone, dto.purpose);

    return {
      verified: true,
      phone_number: phone,
      purpose: dto.purpose,
      phone_verify_token,
      expires_in_seconds: PHONE_VERIFY_TOKEN_TTL_SECONDS,
    };
  }

  // 1.3 POST /invite/validate — Validate invite token
  async validateInviteToken(dto: ValidateInviteTokenDto): Promise<ValidateInviteResponseDto> {
    const invite = await this.studentRepo.findValidInviteToken(dto.invite_token);
    return {
      valid: invite !== null,
      school_id: invite ? String(invite.school_id) : null,
      school_name: invite?.school_name ?? null,
    };
  }

  // 1.4 POST /signup — Complete signup using phone_verify_token from /otp/verify (OTP already consumed there)
  async signup(dto: SignupDto): Promise<TokenPairResponseDto> {
    const { phone: rawPhone, purpose } = await verifyPhoneVerifyToken(dto.phone_verify_token);
    if (purpose !== "signup") {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Phone verification token is not valid for signup", 400);
    }
    const phone = normalizePhone(rawPhone);

    const existing = await this.studentRepo.findByPhone(phone);
    if (existing) {
      if (!existing.is_active) {
        throw new ConflictError(
          AuthErrorCode.PHONE_UNAVAILABLE,
          "Unable to create account with this number.",
        );
      }
      throw new ConflictError(AuthErrorCode.PHONE_ALREADY_REGISTERED, "Phone number is already registered");
    }

    const age = computeAge(dto.date_of_birth);
    if (age < 13) {
      throw new AuthError(AuthErrorCode.AGE_GATE_FAILED, "Must be at least 13 years old", 403);
    }
    if (!dto.confirms_age_13_plus) {
      throw new AuthError(AuthErrorCode.AGE_CONFIRMATION_REQUIRED, "Age confirmation is required", 400);
    }
    if (age >= 13 && age <= 17 && !dto.confirms_parental_permission) {
      throw new AuthError(AuthErrorCode.PARENTAL_CONSENT_REQUIRED, "Parental consent is required for minors", 403);
    }

    const inviteResolution = await this.resolveInviteToken(dto.invite_token);

    const created = await this.studentRepo.createStudent({
      phone_number: phone,
      email: null,
      full_name: dto.full_name.trim(),
      is_active: true,
      phone_verified: true,
      account_status: inviteResolution.school_id !== null ? "school_linked" : "independent",
      school_id: inviteResolution.school_id,
      invite_token_used: inviteResolution.token_used,
      grade: dto.grade,
      graduation_year: dto.graduation_year,
      date_of_birth: dto.date_of_birth,
      high_school_name: dto.high_school_name,
      state_of_residence: dto.state_of_residence.trim(),
      confirms_age_13_plus: dto.confirms_age_13_plus,
      confirms_parental_permission: dto.confirms_parental_permission,
      college_data_share_consent: dto.college_data_share_consent,
    });

    return this.buildTokenPairResponse(created);
  }

  // 1.5 POST /login — Login with phone_verify_token from /otp/verify (OTP already consumed there)
  async login(dto: LoginDto): Promise<TokenPairResponseDto> {
    const { phone: rawPhone, purpose } = await verifyPhoneVerifyToken(dto.phone_verify_token);
    if (purpose !== "login") {
      throw new AuthError(AuthErrorCode.TOKEN_INVALID, "Phone verification token is not valid for login", 400);
    }
    const phone = normalizePhone(rawPhone);

    const student = await this.studentRepo.findByPhone(phone);
    if (!student) {
      throw new AuthError(AuthErrorCode.PHONE_NOT_FOUND, "No account found for this phone number", 404);
    }
    if (!student.is_active) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DELETED,
        "This account has been deleted.",
        401,
      );
    }

    await this.studentRepo.updateLastLogin(student.student_id);

    return this.buildTokenPairResponse(student);
  }

  // 1.6 POST /token/refresh — Rotate refresh token, issue new access token
  async refreshToken(dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    const tokenHash = hashRefreshToken(dto.refresh_token);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      throw new AuthError(AuthErrorCode.SESSION_NOT_FOUND, "Session not found or already revoked", 401);
    }
    if (session.expires_at.getTime() <= Date.now()) {
      await this.sessionRepo.revokeSession(session.session_id);
      throw new AuthError(AuthErrorCode.SESSION_EXPIRED, "Refresh token has expired, please log in again", 401);
    }

    const student = await this.studentRepo.findById(session.student_id);
    if (!student || !student.is_active) {
      await this.sessionRepo.revokeSession(session.session_id);
      throw new AuthError(
        AuthErrorCode.ACCOUNT_DELETED,
        "This account has been deleted.",
        401,
      );
    }

    const newRawToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.sessionRepo.rotateToken(session.session_id, newTokenHash, newExpiresAt);

    const access_token = await signAccessToken({
      sub: String(student.student_id),
      role: student.role,
      school_id: student.school_id,
    });

    return {
      access_token,
      refresh_token: newRawToken,
      refresh_token_expires_at: newExpiresAt.toISOString(),
    };
  }

  // 1.7 DELETE /logout — Revoke all sessions for this student
  async logout(_dto: LogoutDto, studentId: number): Promise<LogoutResponseDto> {
    await this.sessionRepo.revokeAllForStudent(studentId);
    return { success: true, message: "Logged out successfully" };
  }

  // 1.8 GET /me — Return current student profile from token
  async getMe(studentId: number): Promise<MeResponseDto> {
    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.PHONE_NOT_FOUND, "Student not found", 404);
    }
    return {
      student_id: String(student.student_id),
      full_name: student.full_name,
      email: student.email,
      phone_masked: maskPhone(student.phone_number),
      role: "student",
      account_status: student.account_status,
      school_id: student.school_id !== null ? String(student.school_id) : null,
      is_active: student.is_active,
      phone_verified: student.phone_verified,
      last_login_at: student.last_login_at ? student.last_login_at.toISOString() : null,
      created_at: student.created_at.toISOString(),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async consumeOtp(phone: string, code: string, purpose: "signup" | "login"): Promise<OtpRecord> {
    const otp = await this.otpRepo.findLatestValidOtp(phone, purpose);

    if (!otp || otp.expires_at.getTime() <= Date.now()) {
      throw new AuthError(AuthErrorCode.OTP_EXPIRED, "OTP is invalid or has expired", 401);
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AuthError(AuthErrorCode.OTP_TOO_MANY_ATTEMPTS, "Too many attempts. Request a new OTP.", 429);
    }

    await this.otpRepo.incrementAttempts(otp.otp_id);

    const ok = await verifyOtpHash(code, otp.otp_code_hash);
    if (!ok) {
      throw new AuthError(AuthErrorCode.OTP_INVALID, "Invalid OTP code", 401);
    }

    await this.otpRepo.markUsed(otp.otp_id);
    return otp;
  }

  private async resolveInviteToken(
    token: string | undefined,
  ): Promise<{ school_id: number | null; token_used: string | null }> {
    if (!token) return { school_id: null, token_used: null };
    const invite = await this.studentRepo.consumeInviteToken(token);
    if (!invite) {
      throw new AuthError(
        AuthErrorCode.INVITE_TOKEN_INVALID,
        "Invite token is invalid, expired, or used up",
        400,
      );
    }
    return { school_id: invite.school_id, token_used: token };
  }

  private async buildAuthResponse(student: StudentRecord): Promise<StudentAuthResponseDto> {
    const access_token = await signAccessToken({
      sub: String(student.student_id),
      role: student.role,
      school_id: student.school_id,
    });

    return {
      access_token,
      student_id: String(student.student_id),
      role: "student",
      account_status: student.account_status,
      school_id: student.school_id != null ? String(student.school_id) : null,
      email: student.email,
      full_name: student.full_name,
    };
  }

  private async buildRegisterVerifyResponse(
    student: StudentRecord,
    consentsRecorded: string[],
  ): Promise<StudentRegisterVerifyResponseDto> {
    const access_token = await signAccessToken({
      sub: String(student.student_id),
      role: student.role,
      school_id: student.school_id,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.sessionRepo.createSession({
      student_id: student.student_id,
      refresh_token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return {
      student_id: String(student.student_id),
      access_token,
      refresh_token: rawRefreshToken,
      account_status: student.account_status,
      consents_recorded: consentsRecorded,
    };
  }

  private async buildTokenPairResponse(student: StudentRecord): Promise<TokenPairResponseDto> {
    const access_token = await signAccessToken({
      sub: String(student.student_id),
      role: student.role,
      school_id: student.school_id,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.sessionRepo.createSession({
      student_id: student.student_id,
      refresh_token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return {
      access_token,
      student_id: String(student.student_id),
      role: "student",
      account_status: student.account_status,
      school_id: student.school_id !== null ? String(student.school_id) : null,
      email: student.email,
      full_name: student.full_name,
      refresh_token: rawRefreshToken,
      refresh_token_expires_at: expiresAt.toISOString(),
    };
  }

  private async dispatchOtp(phone: string, code: string): Promise<void> {
    // STUB: replace with Twilio/SMS provider in production
    console.info("\n================================================================================");
    console.info("🚨 DEVELOPMENT OTP GENERATED 🚨");
    console.info(`📱 Phone: ${phone}`);
    console.info(`🔑 Code:  ${code}`);
    console.info("================================================================================\n");
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
