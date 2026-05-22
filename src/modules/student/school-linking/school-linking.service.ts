import { AppError } from "../../../shared/errors/app-error.js";
import type { SchoolLinkingRepository } from "./school-linking.repository.js";
import type { LinkSchoolRequestDto, MergeConfirmRequestDto, SchoolSearchRequestDto } from "./dto/request.dto.js";
import type {
  LinkedSchoolResponseDto,
  LinkSchoolResponseDto,
  MergeCandidateDto,
  MergeConfirmResponseDto,
  SchoolSearchResultDto,
} from "./dto/response.dto.js";

interface PendingMerge {
  school_id: number;
  candidate_ids: number[];
  school_email?: string;
}

const pendingMerges = new Map<number, PendingMerge>();

const normalizeStatus = (status: string | null | undefined): string => status?.toLowerCase() ?? "";

export class SchoolLinkingService {
  constructor(private readonly schoolLinkingRepo: SchoolLinkingRepository) {}

  async searchSchools(dto: SchoolSearchRequestDto): Promise<SchoolSearchResultDto[]> {
    const schools = await this.schoolLinkingRepo.searchSchools(dto.q, dto.state, dto.limit ?? 10);
    return schools.map((school) => ({
      school_id: school.school_id,
      school_name: school.school_name,
      state: school.state,
      school_type: school.school_type,
      email_domain: school.email_domain,
    }));
  }

  async linkSchool(studentId: number, dto: LinkSchoolRequestDto): Promise<LinkSchoolResponseDto> {
    const [student, school] = await Promise.all([
      this.schoolLinkingRepo.findStudentForLinking(studentId),
      this.schoolLinkingRepo.findSchoolById(dto.school_id),
    ]);

    if (!student) throw new AppError("STUDENT_NOT_FOUND", "Student account not found", 404);
    if (!school || !school.is_active || normalizeStatus(school.school_status) !== "active") {
      throw new AppError("SCHOOL_NOT_ACTIVE", "Target school is not an active UniLantern partner", 400);
    }
    const accountStatus = normalizeStatus(student.account_status);
    if (accountStatus === "school_linked" && student.school_id !== dto.school_id) {
      throw new AppError("ALREADY_LINKED", "Student is already linked to a school", 409);
    }
    if (accountStatus === "school_linked" && student.school_id === dto.school_id) {
      return this.linkedResponse(school);
    }
    if (dto.school_email && !this.matchesSchoolDomain(dto.school_email, school.email_domain)) {
      return {
        link_status: "conflict",
        account_status: "independent",
        school_id: null,
        school_name: null,
        conflict_details: "School email domain does not match the selected school.",
        confirmation_required: false,
        merge_candidates: null,
      };
    }

    const candidates = await this.schoolLinkingRepo.findMergeCandidates({
      studentId,
      schoolId: dto.school_id,
      schoolEmail: dto.school_email,
      fullName: student.full_name,
      graduationYear: student.graduation_year,
    });

    if (candidates.length > 0) {
      const mergeCandidates = candidates.map<MergeCandidateDto>((candidate) => ({
        student_id: candidate.student_id,
        full_name: candidate.full_name,
        graduation_year: candidate.graduation_year,
        high_school_name: candidate.high_school_name,
      }));

      pendingMerges.set(studentId, {
        school_id: dto.school_id,
        candidate_ids: mergeCandidates.map((candidate) => candidate.student_id),
        school_email: dto.school_email,
      });

      return {
        link_status: "pending_confirmation",
        account_status: "independent",
        school_id: null,
        school_name: null,
        conflict_details: null,
        confirmation_required: true,
        merge_candidates: mergeCandidates,
      };
    }

    await this.schoolLinkingRepo.linkStudentToSchool(studentId, dto.school_id, dto.school_email);
    return this.linkedResponse(school);
  }

  async confirmMerge(studentId: number, dto: MergeConfirmRequestDto): Promise<MergeConfirmResponseDto> {
    const pending = pendingMerges.get(studentId);
    if (!pending || pending.school_id !== dto.school_id) {
      throw new AppError("NO_PENDING_MERGE", "No pending merge request for this student", 400);
    }
    if (!pending.candidate_ids.includes(dto.confirmed_student_id)) {
      throw new AppError("INVALID_CONFIRMATION", "Confirmed student is not in the merge candidate list", 400);
    }

    const school = await this.schoolLinkingRepo.findSchoolById(dto.school_id);
    if (!school || !school.is_active || normalizeStatus(school.school_status) !== "active") {
      throw new AppError("SCHOOL_NOT_ACTIVE", "Target school is not an active UniLantern partner", 400);
    }

    await this.schoolLinkingRepo.linkStudentToSchool(studentId, dto.school_id, pending.school_email);
    pendingMerges.delete(studentId);

    return {
      merged: true,
      account_status: "school_linked",
      school_id: dto.school_id,
      data_preserved: true,
    };
  }

  async getLinkedSchool(studentId: number): Promise<LinkedSchoolResponseDto> {
    const student = await this.schoolLinkingRepo.findStudentForLinking(studentId);
    if (!student || normalizeStatus(student.account_status) !== "school_linked" || student.school_id === null) {
      throw new AppError("NOT_LINKED", "Student is not currently linked to any school", 404);
    }

    const school = await this.schoolLinkingRepo.findSchoolById(student.school_id);
    if (!school) throw new AppError("NOT_LINKED", "Linked school no longer exists", 404);

    return {
      school_id: school.school_id,
      school_name: school.school_name,
      state: school.state,
      school_type: school.school_type,
      advisor_visibility_enabled: Boolean(school.dashboard_enabled),
    };
  }

  private linkedResponse(school: { school_id: number; school_name: string }): LinkSchoolResponseDto {
    return {
      link_status: "linked",
      account_status: "school_linked",
      school_id: school.school_id,
      school_name: school.school_name,
      conflict_details: null,
      confirmation_required: false,
      merge_candidates: null,
    };
  }

  private matchesSchoolDomain(email: string, domain: string | null): boolean {
    if (!domain) return true;
    return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
  }
}
