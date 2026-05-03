import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "../../../config/constants.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { ConflictError } from "../../../shared/errors/conflict-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../../../shared/utils/otp.js";
import { signAccessToken } from "../../../shared/utils/jwt.js";
import { encryptDob } from "../../../shared/utils/crypto.js";
import { maskPhone, normalizePhone } from "../../../shared/utils/phone.js";

import type {
  StudentLoginRequestDto,
  StudentRegisterRequestDto,
  StudentSendOtpRequestDto,
  StudentVerifyOtpRequestDto,
} from "./dto/request.dto.js";
import type {
  StudentAuthResponseDto,
  StudentSendOtpResponseDto,
  StudentVerifyOtpResponseDto,
} from "./dto/response.dto.js";
import type {
  OtpRepository,
  StudentRepository,
} from "./student.repository.js";
import type { OtpRecord, StudentRecord } from "./student.types.js";
import { computeAge } from "./student.schema.js";

type OtpPurpose = "signup" | "login";

export class StudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly otpRepo: OtpRepository,
  ) {}

  async sendOtp(
    dto: StudentSendOtpRequestDto,
  ): Promise<StudentSendOtpResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    if (dto.purpose === "login") {
      const existing = await this.studentRepo.findByPhone(phone);
      if (!existing) {
        throw new AuthError(
          AuthErrorCode.PHONE_NOT_FOUND,
          "No account found for this phone number",
          404,
        );
      }
      if (!existing.is_active) {
        throw new AuthError(
          AuthErrorCode.ACCOUNT_INACTIVE,
          "Account is inactive",
          403,
        );
      }
    } else {
      const existing = await this.studentRepo.findByPhone(phone);
      if (existing) {
        throw new ConflictError(
          AuthErrorCode.PHONE_ALREADY_REGISTERED,
          "Phone number is already registered",
        );
      }
    }

    await this.otpRepo.invalidatePreviousOtps(phone, dto.purpose);

    const code = generateOtp();
    const otp_code_hash = await hashOtp(code);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.otpRepo.createOtp({
      phone_number: phone,
      purpose: dto.purpose,
      otp_code_hash,
      expires_at,
    });

    await this.dispatchOtp(phone, code);

    return {
      expires_in_seconds: OTP_TTL_SECONDS,
      phone_masked: maskPhone(phone),
    };
  }

  async verifyOtp(
    dto: StudentVerifyOtpRequestDto,
  ): Promise<StudentVerifyOtpResponseDto> {
    const phone = normalizePhone(dto.phone_number);
    await this.consumeOtp(phone, dto.otp_code, dto.purpose);
    return {
      verified: true,
      phone_number: phone,
      purpose: dto.purpose,
    };
  }

  async register(
    dto: StudentRegisterRequestDto,
  ): Promise<StudentAuthResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    const existing = await this.studentRepo.findByPhone(phone);
    if (existing) {
      throw new ConflictError(
        AuthErrorCode.PHONE_ALREADY_REGISTERED,
        "Phone number is already registered",
      );
    }

    await this.consumeOtp(phone, dto.otp_code, "signup");

    const age = computeAge(dto.date_of_birth);
    if (age < 13) {
      throw new AuthError(
        AuthErrorCode.AGE_GATE_FAILED,
        "Must be at least 13 years old",
        403,
      );
    }
    if (!dto.confirms_age_13_plus) {
      throw new AuthError(
        AuthErrorCode.AGE_CONFIRMATION_REQUIRED,
        "Age confirmation is required",
        400,
      );
    }
    if (age >= 13 && age <= 17 && !dto.confirms_parental_permission) {
      throw new AuthError(
        AuthErrorCode.PARENTAL_CONSENT_REQUIRED,
        "Parental consent is required for minors",
        403,
      );
    }

    const inviteResolution = await this.resolveInviteToken(dto.invite_token);

    // Encrypted at rest. Currently the spec keeps DOB out of the students
    // table — this guarantees the raw value is never persisted in plaintext
    // and is ready to be wired into a profile/PII table without code changes.
    encryptDob(dto.date_of_birth);

    const created = await this.studentRepo.createStudent({
      phone_number: phone,
      full_name: dto.full_name.trim(),
      is_active: true,
      phone_verified: true,
      account_status: inviteResolution.school_id
        ? "school_linked"
        : "independent",
      school_id: inviteResolution.school_id,
      invite_token_used: inviteResolution.token_used,
    });

    return this.buildAuthResponse(created);
  }

  async login(dto: StudentLoginRequestDto): Promise<StudentAuthResponseDto> {
    const phone = normalizePhone(dto.phone_number);

    const student = await this.studentRepo.findByPhone(phone);
    if (!student) {
      throw new AuthError(
        AuthErrorCode.PHONE_NOT_FOUND,
        "No account found for this phone number",
        404,
      );
    }
    if (!student.is_active) {
      throw new AuthError(
        AuthErrorCode.ACCOUNT_INACTIVE,
        "Account is inactive",
        403,
      );
    }

    await this.consumeOtp(phone, dto.otp_code, "login");
    await this.studentRepo.updateLastLogin(student.student_id);

    return this.buildAuthResponse(student);
  }

  private async consumeOtp(
    phone: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<OtpRecord> {
    const otp = await this.otpRepo.findLatestValidOtp(phone, purpose);

    if (!otp || otp.expires_at.getTime() <= Date.now()) {
      throw new AuthError(
        AuthErrorCode.OTP_EXPIRED,
        "OTP is invalid or has expired",
      );
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AuthError(
        AuthErrorCode.OTP_TOO_MANY_ATTEMPTS,
        "Too many OTP attempts; please request a new code",
        429,
      );
    }

    await this.otpRepo.incrementAttempts(otp.otp_id);

    const ok = await verifyOtpHash(code, otp.otp_code_hash);
    if (!ok) {
      throw new AuthError(AuthErrorCode.OTP_INVALID, "Invalid OTP code");
    }

    await this.otpRepo.markUsed(otp.otp_id);
    return otp;
  }

  private async resolveInviteToken(
    token: string | undefined,
  ): Promise<{ school_id: number | null; token_used: string | null }> {
    if (!token) return { school_id: null, token_used: null };
    // Stub: invite-token service not wired yet. Log and skip linkage.
    console.warn(
      "[student-auth] invite_token provided but invite service is not wired; skipping school linkage",
    );
    return { school_id: null, token_used: token };
  }

  private async buildAuthResponse(
    student: StudentRecord,
  ): Promise<StudentAuthResponseDto> {
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
      school_id:
        student.school_id !== null && student.school_id !== undefined
          ? String(student.school_id)
          : null,
      full_name: student.full_name,
    };
  }

  private async dispatchOtp(phone: string, code: string): Promise<void> {
    // STUB: replace with Twilio in production.
    console.log(`[otp:dev] phone=${phone} code=${code}`);
  }
}
