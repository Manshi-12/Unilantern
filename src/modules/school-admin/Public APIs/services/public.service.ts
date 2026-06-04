import { PublicRepository } from '../repositories/public.repository';
import { ApiError } from '../../../../shared/errors/ApiError';
import {
  GetSchoolResult,
  GetReadinessDistributionResult,
  GetCollegesResult,
  GetCollegeResult,
} from '../interfaces/public.interfaces';

const repo = new PublicRepository();

// ─── 59. GET /v1/schools/:schoolId ───────────────────────────────────────────

export const getSchool = async (schoolId: number): Promise<GetSchoolResult> => {
  const school = await repo.findPublicSchoolById(schoolId);
  if (!school) throw ApiError.notFound('SCHOOL_NOT_FOUND', 'School not found.');

  return {
    school_id:    school.school_id,
    school_name:  school.school_name,
    state:        school.state,
    email_domain: school.email_domain,
  };
};

// ─── 60. GET /v1/readiness/school/:schoolId/distribution ─────────────────────

export const getReadinessDistribution = async (
  schoolId: number,
): Promise<GetReadinessDistributionResult> => {
  // Verify school exists and is active
  const school = await repo.findPublicSchoolById(schoolId);
  if (!school) throw ApiError.notFound('SCHOOL_NOT_FOUND', 'School not found.');

  const rows = await repo.findReadinessDistributionBySchoolId(schoolId);

  const distribution = rows.map((row) => ({
    grade_level:                row.grade_level,
    foundational_count:         row.foundational_count,
    developing_count:           row.developing_count,
    competitive_count:          row.competitive_count,
    strongly_competitive_count: row.strongly_competitive_count,
    exceptional_count:          row.exceptional_count,
    total_students:             row.total_students,
    pct_improved:               row.pct_improved,
    snapshot_date:              row.snapshot_date.toISOString(),
  }));

  return {
    school_id: schoolId,
    distribution,
  };
};

// ─── 61. GET /v1/colleges ─────────────────────────────────────────────────────

export const getColleges = async (params: {
  search?: string;
  page: number;
  limit: number;
}): Promise<GetCollegesResult> => {
  const offset = (params.page - 1) * params.limit;

  const { data, total } = await repo.findColleges({
    search: params.search,
    offset,
    limit:  params.limit,
  });

  return {
    data,
    pagination: {
      total,
      page:        params.page,
      limit:       params.limit,
      total_pages: Math.ceil(total / params.limit),
    },
  };
};

// ─── 62. GET /v1/colleges/:collegeId ─────────────────────────────────────────

export const getCollege = async (collegeId: number): Promise<GetCollegeResult> => {
  const college = await repo.findCollegeById(collegeId);
  if (!college) throw ApiError.notFound('COLLEGE_NOT_FOUND', 'College not found.');

  return {
    college_id: college.college_id,
    name:       college.name,
    state:      college.state,
    city:       college.city,
    type:       college.type,
    website:    college.website,
    created_at: college.created_at.toISOString(),
  };
};




