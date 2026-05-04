import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "../../../config/constants.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { ConflictError } from "../../../shared/errors/conflict-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../../../shared/utils/otp.js";
import { signAccessToken } from "../../../shared/utils/jwt.js";
import { maskPhone, normalizePhone } from "../../../shared/utils/phone.js";
import { computeAge } from "./student.schema.js";

import type {
  StudentRegisterInitDto,
  StudentRegisterVerifyDto,
  StudentLoginSendOtpDto,
  StudentLoginVerifyDto,
} from "./dto/request.dto.js";
import type {
  StudentRegisterInitResponseDto,
  StudentAuthResponseDto,
} from "./dto/response.dto.js";
import type { OtpRepository, StudentRepository } from "./student.repository.js";
import type { OtpRecord, StudentRecord } from "./student.types.js";

// Pending registrations: phone → profile data, expires after OTP window
interface PendingRegistration {
  email: string;
  full_name: string;
  graduation_year: number;
  date_of_birth: string;
  high_school_name: string;
  state_of_residence: string;
  confirms_age_13_plus: boolean;
  confirms_parental_permission: boolean;
  invite_token?: string;
  college_data_share: boolean;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly otpRepo: OtpRepository,
  ) {}

  // ── REGISTRATION: Step 1 ─────────────────────────────────────────────────
  // Accept all profile data, validate it, store temporarily, send OTP
  async registerInit(dto: StudentRegisterInitDto): Promise<StudentRegisterInitResponseDto> {
    const phone = normalizePhone(dto.phone_number);
    const email = normalizeEmail(dto.email);

    const existing = await this.studentRepo.findByPhone(phone);
    if (existing) {
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

    // Store profile data temporarily until OTP is verified
    pendingRegistrations.set(phone, {
      email,
      full_name: dto.full_name.trim(),
      graduation_year: dto.graduation_year,
      date_of_birth: dto.date_of_birth,
      high_school_name: dto.high_school_name,
      state_of_residence: dto.state_of_residence,
      confirms_age_13_plus: dto.confirms_age_13_plus,
      confirms_parental_permission: dto.confirms_parental_permission,
      invite_token: dto.invite_token,
      college_data_share: dto.college_data_share ?? true,
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
  // Verify OTP → insert student + profile + consents → return JWT
  async registerVerify(dto: StudentRegisterVerifyDto): Promise<StudentAuthResponseDto> {
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
      account_status: inviteResolution.school_id ? "school_linked" : "independent",
      school_id: inviteResolution.school_id,
      invite_token_used: inviteResolution.token_used,
      graduation_year: pending.graduation_year,
      date_of_birth: pending.date_of_birth,
      high_school_name: pending.high_school_name,
      state_of_residence: pending.state_of_residence,
      confirms_age_13_plus: pending.confirms_age_13_plus,
      confirms_parental_permission: pending.confirms_parental_permission,
      college_data_share: pending.college_data_share,
    });

    return this.buildAuthResponse(created);
  }

  // ── LOGIN: Step 1 ─────────────────────────────────────────────────────────
  // Check account exists → send OTP
  async loginSendOtp(dto: StudentLoginSendOtpDto): Promise<StudentRegisterInitResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    const existing = await this.studentRepo.findByPhone(phone);
    if (!existing) {
      throw new AuthError(AuthErrorCode.PHONE_NOT_FOUND, "No account found for this phone number", 404);
    }
    if (!existing.is_active) {
      throw new AuthError(AuthErrorCode.ACCOUNT_INACTIVE, "Account is inactive", 403);
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
      throw new AuthError(AuthErrorCode.ACCOUNT_INACTIVE, "Account is inactive", 403);
    }

    await this.consumeOtp(phone, dto.otp_code, "login");
    await this.studentRepo.updateLastLogin(student.student_id);

    return this.buildAuthResponse(student);
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
    console.warn("[student-auth] invite_token provided but invite service is not wired; skipping school linkage");
    return { school_id: null, token_used: token };
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

  private async dispatchOtp(phone: string, code: string): Promise<void> {
    // STUB: replace with Twilio/SMS provider in production
    console.log(`[otp:dev] phone=${phone} code=${code}`);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
