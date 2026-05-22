// ── College Module Service ───────────────────────────────────────────────────
// Orchestrates college search, external API fetch, save/unsave, and fit calc.

import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { CollegesRepository } from "./colleges.repository.js";
import type { SavedCollegesRepository } from "./saved-colleges.repository.js";
import type {
  SaveCollegeRequestDto,
  UpdateSavedCollegeRequestDto,
  SearchCollegesQueryDto,
} from "./dto/request.dto.js";
import type {
  CollegeResponseDto,
  CollegeDetailResponseDto,
  CollegeSearchResponseDto,
  SavedCollegeResponseDto,
  SavedCollegesListResponseDto,
} from "./dto/response.dto.js";
import type {
  CollegeRecord,
  SavedCollegeWithDetails,
  FitClassification,
} from "./colleges.types.js";
import {
  fetchCollegesFromScorecard,
  type TransformedCollege,
} from "./scorecard.client.js";
import { classifyAcademicFit, type StudentFitInputs } from "./fit-classifier/classify-fit.js";
import { getPool, sql } from "../../../db/client.js";

export class CollegesService {
  constructor(
    private readonly collegesRepo: CollegesRepository,
    private readonly savedRepo: SavedCollegesRepository,
  ) {}

  // ── 9.1 GET /colleges/search ────────────────────────────────────────────────
  async search(params: SearchCollegesQueryDto): Promise<CollegeSearchResponseDto> {
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;

    const { records, total } = await this.collegesRepo.search({
      q: params.q,
      state: params.state,
      minAcceptanceRate: params.min_acceptance_rate,
      maxAcceptanceRate: params.max_acceptance_rate,
      isTestOptional: params.is_test_optional,
      limit,
      offset,
    });

    return {
      colleges: records.map(this.toCollegeDto),
      total,
      limit,
      offset,
    };
  }

  // ── 9.2 GET /colleges/:college_id ───────────────────────────────────────────
  async getById(collegeId: number): Promise<CollegeDetailResponseDto> {
    const record = await this.collegesRepo.findById(collegeId);
    if (!record) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "College not found", 404);
    }
    return this.toCollegeDetailDto(record);
  }

  // ── 9.3 GET /students/me/colleges/saved ─────────────────────────────────────
  async listSaved(studentId: number): Promise<SavedCollegesListResponseDto> {
    const records = await this.savedRepo.findAllByStudentId(studentId);
    return {
      saved_colleges: records.map(this.toSavedCollegeDto),
      total: records.length,
    };
  }

  // ── 9.4 POST /students/me/colleges/saved ────────────────────────────────────
  async saveCollege(
    studentId: number,
    dto: SaveCollegeRequestDto,
  ): Promise<SavedCollegeResponseDto & { fit_computed: boolean }> {
    // Verify college exists
    const college = await this.collegesRepo.findById(dto.college_id);
    if (!college) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "College not found", 404);
    }

    // Check for duplicates
    const already = await this.savedRepo.existsByStudentAndCollege(studentId, dto.college_id);
    if (already) {
      throw new AuthError(AuthErrorCode.COLLEGE_ALREADY_SAVED, "College already saved", 409);
    }

    // Compute fit classification (if student has academic data)
    let fitClassification: FitClassification | null = null;
    let readinessBandAtSave: string | null = null;
    let fitComputed = false;

    try {
      const studentData = await this.fetchStudentAcademicData(studentId);
      if (studentData) {
        const studentInputs: StudentFitInputs = {
          gpa: studentData.unweighted_gpa,
          test_status: studentData.sat_score
            ? "sat"
            : studentData.act_score
              ? "act"
              : "no_test",
          sat_score: studentData.sat_score,
          act_score: studentData.act_score,
          course_rigor: studentData.course_rigor as StudentFitInputs["course_rigor"],
          state: studentData.state_of_residence,
          readiness_band: studentData.readiness_band,
          intended_major_selectivity: dto.major_selectivity ?? null,
          in_state_for_application: dto.is_in_state ?? null,
        };

        fitClassification = classifyAcademicFit(studentInputs, college);
        readinessBandAtSave = studentData.readiness_band;
        fitComputed = true;
      }
    } catch (err) {
      // If fit calc fails, still allow save — fit = null
      console.error(`[CollegesService] Fit classification failed for student ${studentId}:`, err);
    }

    const record = await this.savedRepo.create({
      student_id: studentId,
      college_id: dto.college_id,
      intended_major: dto.intended_major ?? null,
      major_selectivity: dto.major_selectivity ?? null,
      is_in_state: dto.is_in_state ?? null,
      fit_classification: fitClassification,
      readiness_band_at_save: readinessBandAtSave,
    });

    return {
      ...this.toSavedCollegeDtoFromRecord(record, college),
      fit_computed: fitComputed,
    };
  }

  // ── 9.5 PATCH /students/me/colleges/saved/:saved_id ─────────────────────────
  async updateSaved(
    studentId: number,
    savedCollegeId: number,
    dto: UpdateSavedCollegeRequestDto,
  ): Promise<SavedCollegeResponseDto> {
    const existing = await this.savedRepo.findByIdAndStudent(savedCollegeId, studentId);
    if (!existing) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Saved college not found", 404);
    }

    // If major selectivity or in-state flag changed, recompute fit (8-step algorithm)
    const mergedSelectivity =
      dto.major_selectivity !== undefined ? dto.major_selectivity : existing.major_selectivity;
    const mergedInState = dto.is_in_state !== undefined ? dto.is_in_state : existing.is_in_state;

    let newFit: FitClassification | null | undefined;
    const selChanged =
      dto.major_selectivity !== undefined && dto.major_selectivity !== existing.major_selectivity;
    const inStateChanged =
      dto.is_in_state !== undefined && dto.is_in_state !== existing.is_in_state;

    if (selChanged || inStateChanged) {
      try {
        const college = await this.collegesRepo.findById(existing.college_id);
        const studentData = await this.fetchStudentAcademicData(studentId);
        if (college && studentData) {
          const studentInputs: StudentFitInputs = {
            gpa: studentData.unweighted_gpa,
            test_status: studentData.sat_score ? "sat" : studentData.act_score ? "act" : "no_test",
            sat_score: studentData.sat_score,
            act_score: studentData.act_score,
            course_rigor: studentData.course_rigor as StudentFitInputs["course_rigor"],
            state: studentData.state_of_residence,
            readiness_band: studentData.readiness_band,
            intended_major_selectivity: mergedSelectivity ?? null,
            in_state_for_application: mergedInState ?? null,
          };
          newFit = classifyAcademicFit(studentInputs, college);
        }
      } catch {
        // If recomputation fails, keep existing fit
      }
    }

    const record = await this.savedRepo.update(savedCollegeId, studentId, {
      status: dto.status,
      intended_major: dto.intended_major,
      major_selectivity: dto.major_selectivity,
      is_in_state: dto.is_in_state,
      ...(newFit !== undefined ? { fit_classification: newFit } : {}),
    });

    const college = await this.collegesRepo.findById(record.college_id);
    return this.toSavedCollegeDtoFromRecord(record, college!);
  }

  // ── 9.6 DELETE /students/me/colleges/saved/:saved_id ────────────────────────
  async unsaveCollege(studentId: number, savedCollegeId: number): Promise<void> {
    const deleted = await this.savedRepo.delete(savedCollegeId, studentId);
    if (!deleted) {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Saved college not found", 404);
    }
  }

  // ── Fetch from external API and store in DB ─────────────────────────────────
  async fetchAndStoreFromScorecard(
    apiKey: string,
    query?: string,
    count = 5,
  ): Promise<CollegeResponseDto[]> {
    const externalColleges = await fetchCollegesFromScorecard(apiKey, query, count);

    const stored: CollegeRecord[] = [];
    for (const ext of externalColleges) {
      const record = await this.upsertFromExternal(ext);
      stored.push(record);
    }

    return stored.map(this.toCollegeDto);
  }

  // ── Private: validate acceptance rate is within bounds (0.01–100.00 or null) ──
  private validateAcceptanceRate(rate: number | null): number | null {
    if (rate === null || rate === undefined) return null;
    if (rate < 0.01 || rate > 100.00) {
      console.warn(`[CollegesService] Skipping invalid acceptance_rate: ${rate}`);
      return null;
    }
    return rate;
  }

  // ── Private: upsert a college from external data ────────────────────────────
  private async upsertFromExternal(ext: TransformedCollege): Promise<CollegeRecord> {
    const validAcceptanceRate = this.validateAcceptanceRate(ext.acceptance_rate);

    const existing = await this.collegesRepo.findByName(ext.name);
    if (existing) {
      return this.collegesRepo.updateFromExternal(existing.college_id, {
        acceptance_rate: validAcceptanceRate,
        logo_url: ext.logo,
        website_url: ext.website,
        is_test_optional: ext.is_test_optional,
        sat_25th: ext.sat_25th,
        sat_75th: ext.sat_75th,
        act_25th: ext.act_25th,
        act_75th: ext.act_75th,
      });
    }

    return this.collegesRepo.create({
      name: ext.name,
      state: ext.state,
      website_url: ext.website,
      acceptance_rate: validAcceptanceRate,
      is_test_optional: ext.is_test_optional,
      is_public: ext.is_public,
      logo_url: ext.logo,
      data_source: "college_scorecard",
      sat_25th: ext.sat_25th,
      sat_75th: ext.sat_75th,
      act_25th: ext.act_25th,
      act_75th: ext.act_75th,
    });
  }

  // ── Private: fetch student academic + profile data for fit calc ──────────────
  private async fetchStudentAcademicData(studentId: number): Promise<{
    unweighted_gpa: number | null;
    sat_score: number | null;
    act_score: number | null;
    course_rigor: string | null;
    state_of_residence: string | null;
    readiness_band: string | null;
  } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("student_id", sql.Int, studentId)
      .query<{
        unweighted_gpa: number | null;
        sat_score: number | null;
        act_score: number | null;
        course_rigor: string | null;
        state_of_residence: string | null;
        readiness_band: string | null;
      }>(
        `SELECT
           sa.unweighted_gpa,
           sa.sat_score,
           sa.act_score,
           sa.course_rigor,
           sp.state_of_residence,
           ss.readiness_band
         FROM student_academics sa
         LEFT JOIN student_profiles sp ON sp.student_id = sa.student_id
         LEFT JOIN student_scores ss   ON ss.student_id = sa.student_id
         WHERE sa.student_id = @student_id;`,
      );
    return result.recordset[0] ?? null;
  }

  // ── DTO mappers ─────────────────────────────────────────────────────────────

  private toCollegeDto = (r: CollegeRecord): CollegeResponseDto => ({
    college_id: String(r.college_id),
    name: r.name,
    state: r.state,
    website: r.website_url,
    logo: r.logo_url,
    acceptance_rate: r.acceptance_rate,
    is_test_optional: r.is_test_optional,
    is_public: r.is_public,
  });

  private toCollegeDetailDto = (r: CollegeRecord): CollegeDetailResponseDto => ({
    college_id: String(r.college_id),
    name: r.name,
    state: r.state,
    region: r.region,
    institution_type: r.institution_type,
    is_public: r.is_public,
    website: r.website_url,
    logo: r.logo_url,
    acceptance_rate: r.acceptance_rate,
    is_test_optional: r.is_test_optional,
    gpa_25th: r.gpa_25th,
    gpa_75th: r.gpa_75th,
    sat_25th: r.sat_25th,
    sat_75th: r.sat_75th,
    act_25th: r.act_25th,
    act_75th: r.act_75th,
  });

  private toSavedCollegeDto = (r: SavedCollegeWithDetails): SavedCollegeResponseDto => ({
    saved_college_id: String(r.saved_college_id),
    college_id: String(r.college_id),
    college_name: r.college_name,
    college_state: r.college_state,
    college_website: r.college_website_url,
    college_logo: r.college_logo_url,
    college_acceptance_rate: r.college_acceptance_rate,
    status: r.status,
    fit_classification: r.fit_classification,
    intended_major: r.intended_major,
    major_selectivity: r.major_selectivity,
    is_in_state: r.is_in_state,
    readiness_band_at_save: r.readiness_band_at_save,
    saved_at: r.saved_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  });

  private toSavedCollegeDtoFromRecord = (
    r: import("./colleges.types.js").SavedCollegeRecord,
    c: CollegeRecord | null,
  ): SavedCollegeResponseDto => ({
    saved_college_id: String(r.saved_college_id),
    college_id: String(r.college_id),
    college_name: c?.name ?? "",
    college_state: c?.state ?? null,
    college_website: c?.website_url ?? null,
    college_logo: c?.logo_url ?? null,
    college_acceptance_rate: c?.acceptance_rate ?? null,
    status: r.status,
    fit_classification: r.fit_classification,
    intended_major: r.intended_major,
    major_selectivity: r.major_selectivity,
    is_in_state: r.is_in_state,
    readiness_band_at_save: r.readiness_band_at_save,
    saved_at: r.saved_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  });
}
