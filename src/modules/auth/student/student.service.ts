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
import type { StudentProfileUpdateDto } from "./dto/profile.request.dto.js";
import type {
  StudentProfileResponseDto,
  StudentProfileUpdateResponseDto,
} from "./dto/profile.response.dto.js";
import type {
  ExtracurricularCreateDto,
  ExtracurricularUpdateDto,
  ExtracurricularReorderDto,
} from "./dto/extracurricular.request.dto.js";
import type {
  ExtracurricularListResponseDto,
  ExtracurricularResponseDto,
  ExtracurricularCreateResponseDto,
  ExtracurricularUpdateResponseDto,
  ExtracurricularReorderResponseDto,
} from "./dto/extracurricular.response.dto.js";
import type { OtpRepository, StudentRepository } from "./student.repository.js";
import type {
  OtpRecord,
  StudentProfileRecord,
  StudentRecord,
  UpdateStudentProfileData,
  ExtracurricularRecord,
  CreateExtracurricularData,
  UpdateExtracurricularData,
  ExtracurricularReorderData,
} from "./student.types.js";

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

  // ── PROFILE: Get full student profile ──────────────────────────────────────
  async getProfile(studentId: number): Promise<StudentProfileResponseDto> {
    const profile = await this.studentRepo.getStudentProfileByStudentId(studentId);
    if (!profile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }
    return this.mapProfile(profile);
  }

  // ── PROFILE: Update student profile ───────────────────────────────────────
  async updateProfile(
    studentId: number,
    dto: StudentProfileUpdateDto,
  ): Promise<StudentProfileUpdateResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new AuthError(AuthErrorCode.VALIDATION_ERROR, "At least one field is required", 400);
    }

    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student not found", 500);
    }

    const profile = await this.studentRepo.getStudentProfileByStudentId(studentId);
    if (!profile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }

    const updatedFields: string[] = [];
    if (dto.full_name && dto.full_name !== student.full_name) {
      await this.studentRepo.updateStudentFullName(studentId, dto.full_name);
      updatedFields.push("full_name");
    }

    const profileUpdates: UpdateStudentProfileData = {};
    if (dto.grade !== undefined && dto.grade !== profile.grade) {
      profileUpdates.grade = dto.grade;
      updatedFields.push("grade");
    }
    if (dto.graduation_year !== undefined && dto.graduation_year !== profile.graduation_year) {
      profileUpdates.graduation_year = dto.graduation_year;
      updatedFields.push("graduation_year");
    }
    if (
      dto.high_school_name !== undefined &&
      dto.high_school_name !== profile.high_school_name
    ) {
      profileUpdates.high_school_name = dto.high_school_name;
      updatedFields.push("high_school_name");
    }
    if (
      dto.state !== undefined &&
      dto.state !== profile.state_of_residence
    ) {
      profileUpdates.state_of_residence = dto.state;
      updatedFields.push("state");
    }

    if (updatedFields.length === 0) {
      throw new AuthError(AuthErrorCode.VALIDATION_ERROR, "No changes detected", 400);
    }

    if (Object.keys(profileUpdates).length > 0) {
      await this.studentRepo.updateStudentProfile(studentId, profileUpdates);
    }

    const scoreQueued = await this.enqueueScoreRecalc(studentId, !!dto.grade);
    const updatedProfile = await this.studentRepo.getStudentProfileByStudentId(studentId);
    if (!updatedProfile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }

    return {
      student_id: String(studentId),
      updated_fields: updatedFields,
      score_recalc_queued: scoreQueued,
      updated_at: updatedProfile.updated_at.toISOString(),
    };
  }

  private mapProfile(profile: StudentProfileRecord): StudentProfileResponseDto {
    const completionPct = this.computeProfileCompletionPct(profile);
    return {
      student_id: profile.student_id,
      full_name: profile.full_name,
      grade: profile.grade,
      graduation_year: profile.graduation_year,
      high_school_name: profile.high_school_name,
      school_id: profile.school_id,
      account_status: profile.account_status,
      state: profile.state_of_residence,
      city: null,
      is_profile_complete: profile.profile_complete || completionPct === 100,
      profile_completion_pct: completionPct,
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString(),
    };
  }

  private computeProfileCompletionPct(profile: StudentProfileRecord): number {
    const fields = [
      profile.grade !== null,
      profile.graduation_year !== null,
      !!profile.high_school_name,
      !!profile.state_of_residence,
    ];

    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }

  private async enqueueScoreRecalc(studentId: number, gradeChanged: boolean): Promise<boolean> {
    console.log(
      `[student-profile] queued readiness recalculation for student_id=${studentId} grade_changed=${gradeChanged}`,
    );
    return true;
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

  // ── EXTRACURRICULAR ACTIVITIES ──────────────────────────────────────────

  async getExtracurriculars(
    studentId: number,
    limit: number,
    cursor?: string
  ): Promise<ExtracurricularListResponseDto> {
    const { activities, hasMore, nextCursor } = await this.studentRepo.getExtracurricularsByStudentId(
      studentId,
      limit,
      cursor
    );

    return {
      activities: activities.map(activity => this.mapExtracurricular(activity)),
      has_more: hasMore,
      next_cursor: nextCursor,
    };
  }

  async getExtracurricular(activityId: number, studentId: number): Promise<ExtracurricularResponseDto> {
    const isOwner = await this.studentRepo.validateExtracurricularOwnership(activityId, studentId);
    if (!isOwner) {
      throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
    }

    const activity = await this.studentRepo.getExtracurricularById(activityId);
    if (!activity) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Extracurricular activity not found", 404);
    }

    return this.mapExtracurricular(activity);
  }

  async createExtracurricular(
    studentId: number,
    dto: ExtracurricularCreateDto
  ): Promise<ExtracurricularCreateResponseDto> {
    const data: CreateExtracurricularData = {
      student_id: studentId,
      activity_name: dto.activity_name,
      activity_type: dto.activity_type,
      years_involved: dto.years_involved,
      involvement_level: dto.involvement_level,
      activity_description: dto.activity_description,
      impact_text: dto.impact_text,
      impact_level: dto.impact_level,
      hours_per_week: dto.hours_per_week,
      experience_duration_weeks: dto.experience_duration_weeks,
      selective_acceptance_toggle: dto.selective_acceptance_toggle,
      external_org_toggle: dto.external_org_toggle,
      travel_or_residency_toggle: dto.travel_or_residency_toggle,
      people_impacted: dto.people_impacted,
      funds_raised: dto.funds_raised,
      users_acquired: dto.users_acquired,
      hours_delivered: dto.hours_delivered,
      competition_top_10_pct_toggle: dto.competition_top_10_pct_toggle,
      finalist_or_winner_toggle: dto.finalist_or_winner_toggle,
      publication_or_presented_toggle: dto.publication_or_presented_toggle,
      policy_or_partnership_toggle: dto.policy_or_partnership_toggle,
      structured_deliverable_toggle: dto.structured_deliverable_toggle,
      language_or_skill_cert_toggle: dto.language_or_skill_cert_toggle,
      formal_selection_toggle: dto.formal_selection_toggle,
      documented_real_world_output_toggle: dto.documented_real_world_output_toggle,
    };

    const activity = await this.studentRepo.createExtracurricular(data);
    const scoreQueued = await this.enqueueScoreRecalc(studentId, false);

    return {
      activity_id: String(activity.activity_id),
      display_order: activity.display_order,
      score_recalc_queued: scoreQueued,
      created_at: activity.created_at.toISOString(),
    };
  }

  async updateExtracurricular(
    activityId: number,
    studentId: number,
    dto: ExtracurricularUpdateDto
  ): Promise<ExtracurricularUpdateResponseDto> {
    const isOwner = await this.studentRepo.validateExtracurricularOwnership(activityId, studentId);
    if (!isOwner) {
      throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
    }

    const data: UpdateExtracurricularData = {};
    const updatedFields: string[] = [];

    if (dto.activity_name !== undefined) {
      data.activity_name = dto.activity_name;
      updatedFields.push("activity_name");
    }
    if (dto.activity_type !== undefined) {
      data.activity_type = dto.activity_type;
      updatedFields.push("activity_type");
    }
    if (dto.years_involved !== undefined) {
      data.years_involved = dto.years_involved;
      updatedFields.push("years_involved");
    }
    if (dto.involvement_level !== undefined) {
      data.involvement_level = dto.involvement_level;
      updatedFields.push("involvement_level");
    }
    if (dto.activity_description !== undefined) {
      data.activity_description = dto.activity_description;
      updatedFields.push("activity_description");
    }
    if (dto.impact_text !== undefined) {
      data.impact_text = dto.impact_text;
      updatedFields.push("impact_text");
    }
    if (dto.impact_level !== undefined) {
      data.impact_level = dto.impact_level;
      updatedFields.push("impact_level");
    }
    if (dto.hours_per_week !== undefined) {
      data.hours_per_week = dto.hours_per_week;
      updatedFields.push("hours_per_week");
    }
    if (dto.experience_duration_weeks !== undefined) {
      data.experience_duration_weeks = dto.experience_duration_weeks;
      updatedFields.push("experience_duration_weeks");
    }
    if (dto.selective_acceptance_toggle !== undefined) {
      data.selective_acceptance_toggle = dto.selective_acceptance_toggle;
      updatedFields.push("selective_acceptance_toggle");
    }
    if (dto.external_org_toggle !== undefined) {
      data.external_org_toggle = dto.external_org_toggle;
      updatedFields.push("external_org_toggle");
    }
    if (dto.travel_or_residency_toggle !== undefined) {
      data.travel_or_residency_toggle = dto.travel_or_residency_toggle;
      updatedFields.push("travel_or_residency_toggle");
    }
    if (dto.people_impacted !== undefined) {
      data.people_impacted = dto.people_impacted;
      updatedFields.push("people_impacted");
    }
    if (dto.funds_raised !== undefined) {
      data.funds_raised = dto.funds_raised;
      updatedFields.push("funds_raised");
    }
    if (dto.users_acquired !== undefined) {
      data.users_acquired = dto.users_acquired;
      updatedFields.push("users_acquired");
    }
    if (dto.hours_delivered !== undefined) {
      data.hours_delivered = dto.hours_delivered;
      updatedFields.push("hours_delivered");
    }
    if (dto.competition_top_10_pct_toggle !== undefined) {
      data.competition_top_10_pct_toggle = dto.competition_top_10_pct_toggle;
      updatedFields.push("competition_top_10_pct_toggle");
    }
    if (dto.finalist_or_winner_toggle !== undefined) {
      data.finalist_or_winner_toggle = dto.finalist_or_winner_toggle;
      updatedFields.push("finalist_or_winner_toggle");
    }
    if (dto.publication_or_presented_toggle !== undefined) {
      data.publication_or_presented_toggle = dto.publication_or_presented_toggle;
      updatedFields.push("publication_or_presented_toggle");
    }
    if (dto.policy_or_partnership_toggle !== undefined) {
      data.policy_or_partnership_toggle = dto.policy_or_partnership_toggle;
      updatedFields.push("policy_or_partnership_toggle");
    }
    if (dto.structured_deliverable_toggle !== undefined) {
      data.structured_deliverable_toggle = dto.structured_deliverable_toggle;
      updatedFields.push("structured_deliverable_toggle");
    }
    if (dto.language_or_skill_cert_toggle !== undefined) {
      data.language_or_skill_cert_toggle = dto.language_or_skill_cert_toggle;
      updatedFields.push("language_or_skill_cert_toggle");
    }
    if (dto.formal_selection_toggle !== undefined) {
      data.formal_selection_toggle = dto.formal_selection_toggle;
      updatedFields.push("formal_selection_toggle");
    }
    if (dto.documented_real_world_output_toggle !== undefined) {
      data.documented_real_world_output_toggle = dto.documented_real_world_output_toggle;
      updatedFields.push("documented_real_world_output_toggle");
    }

    if (updatedFields.length === 0) {
      throw new AuthError(AuthErrorCode.VALIDATION_ERROR, "No changes detected", 400);
    }

    await this.studentRepo.updateExtracurricular(activityId, data);
    const scoreQueued = await this.enqueueScoreRecalc(studentId, false);

    const activity = await this.studentRepo.getExtracurricularById(activityId);
    if (!activity) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Extracurricular activity not found after update", 500);
    }

    return {
      activity_id: String(activityId),
      updated_fields: updatedFields,
      score_recalc_queued: scoreQueued,
      updated_at: activity.updated_at.toISOString(),
    };
  }

  async deleteExtracurricular(activityId: number, studentId: number): Promise<void> {
    const isOwner = await this.studentRepo.validateExtracurricularOwnership(activityId, studentId);
    if (!isOwner) {
      throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
    }

    await this.studentRepo.deleteExtracurricular(activityId);
    await this.enqueueScoreRecalc(studentId, false);
  }

  async reorderExtracurriculars(
    studentId: number,
    dto: ExtracurricularReorderDto
  ): Promise<ExtracurricularReorderResponseDto> {
    const orders: ExtracurricularReorderData[] = dto.activities.map(activity => ({
      activity_id: parseInt(activity.activity_id),
      display_order: activity.display_order,
    }));

    // Validate all activities belong to the student
    for (const order of orders) {
      const isOwner = await this.studentRepo.validateExtracurricularOwnership(order.activity_id, studentId);
      if (!isOwner) {
        throw new AuthError(AuthErrorCode.FORBIDDEN, "Access denied", 403);
      }
    }

    const updatedCount = await this.studentRepo.reorderExtracurriculars(studentId, orders);
    const scoreQueued = await this.enqueueScoreRecalc(studentId, false);

    return {
      updated_count: updatedCount,
      score_recalc_queued: scoreQueued,
    };
  }

  private mapExtracurricular(activity: ExtracurricularRecord): ExtracurricularResponseDto {
    return {
      activity_id: String(activity.activity_id),
      activity_name: activity.activity_name,
      activity_type: activity.activity_type,
      years_involved: activity.years_involved,
      involvement_level: activity.involvement_level,
      activity_description: activity.activity_description,
      impact_text: activity.impact_text,
      impact_level: activity.impact_level,
      hours_per_week: activity.hours_per_week,
      experience_duration_weeks: activity.experience_duration_weeks,
      selective_acceptance_toggle: activity.selective_acceptance_toggle,
      external_org_toggle: activity.external_org_toggle,
      travel_or_residency_toggle: activity.travel_or_residency_toggle,
      people_impacted: activity.people_impacted,
      funds_raised: activity.funds_raised,
      users_acquired: activity.users_acquired,
      hours_delivered: activity.hours_delivered,
      competition_top_10_pct_toggle: activity.competition_top_10_pct_toggle,
      finalist_or_winner_toggle: activity.finalist_or_winner_toggle,
      publication_or_presented_toggle: activity.publication_or_presented_toggle,
      policy_or_partnership_toggle: activity.policy_or_partnership_toggle,
      structured_deliverable_toggle: activity.structured_deliverable_toggle,
      language_or_skill_cert_toggle: activity.language_or_skill_cert_toggle,
      formal_selection_toggle: activity.formal_selection_toggle,
      documented_real_world_output: activity.documented_real_world_output,
      display_order: activity.display_order,
      created_at: activity.created_at.toISOString(),
      updated_at: activity.updated_at.toISOString(),
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
