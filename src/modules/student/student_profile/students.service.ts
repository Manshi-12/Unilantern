import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { StudentProfileUpdateDto } from "./dto/request.dto.js";
import type {
  StudentProfileResponseDto,
  StudentProfileUpdateResponseDto,
} from "./dto/response.dto.js";
import type { StudentsRepository } from "./students.repository.js";
import type {
  StudentProfileRecord,
  UpdateStudentProfileData,
} from "./students.types.js";
import { queueScoreRecalculation } from "../scoring/scoring.orchestrator.js";

export class StudentsService {
  constructor(private readonly studentsRepo: StudentsRepository) {}

  // ── PROFILE: Get full student profile ──────────────────────────────────────
  async getProfile(studentId: number): Promise<StudentProfileResponseDto> {
    const profile = await this.studentsRepo.getStudentProfileByStudentId(studentId);
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

    const student = await this.studentsRepo.findById(studentId);
    if (!student) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student not found", 500);
    }

    const profile = await this.studentsRepo.getStudentProfileByStudentId(studentId);
    if (!profile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }

    const updatedFields: string[] = [];
    if (dto.full_name && dto.full_name !== student.full_name) {
      await this.studentsRepo.updateStudentFullName(studentId, dto.full_name);
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
    const currentDob = profile.date_of_birth ? profile.date_of_birth.toISOString().split("T")[0] : undefined;
    if (dto.date_of_birth !== undefined && dto.date_of_birth !== currentDob) {
      profileUpdates.date_of_birth = dto.date_of_birth;
      updatedFields.push("date_of_birth");
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
      await this.studentsRepo.updateStudentProfile(studentId, profileUpdates);
    }

    const scoreQueued = await this.enqueueScoreRecalc(studentId, !!dto.grade);
    const updatedProfile = await this.studentsRepo.getStudentProfileByStudentId(studentId);
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
      date_of_birth: profile.date_of_birth ? profile.date_of_birth.toISOString().split("T")[0] : null,
      school_id: profile.school_id,
      account_status: profile.account_status,
      state: profile.state_of_residence,
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
    return queueScoreRecalculation(studentId, "student-profile");
  }
}
