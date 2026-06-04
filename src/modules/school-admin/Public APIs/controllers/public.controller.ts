import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { ApiResponse }  from '../../../../shared/responses/ApiResponse';
import * as PublicService from '../services/public.service';

// ─── 59. GET /v1/schools/:schoolId ───────────────────────────────────────────

export const getSchool = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = parseInt(String(req.params.schoolId), 10);
  const data = await PublicService.getSchool(schoolId);
  ApiResponse.success(res, data, 200);
});

// ─── 60. GET /v1/readiness/school/:schoolId/distribution ─────────────────────

export const getReadinessDistribution = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = parseInt(String(req.params.schoolId), 10);
  const data = await PublicService.getReadinessDistribution(schoolId);
  ApiResponse.success(res, data, 200);
});

// ─── 61. GET /v1/colleges ────────────────────────────────────────────────────

export const getColleges = asyncHandler(async (req: Request, res: Response) => {
  const { search, page, limit } = req.query as {
    search?: string;
    page:    string;
    limit:   string;
  };

  const data = await PublicService.getColleges({
    search,
    page:  parseInt(page,  10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  ApiResponse.success(res, data, 200);
});

// ─── 62. GET /v1/colleges/:collegeId ─────────────────────────────────────────

export const getCollege = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = parseInt(String(req.params.collegeId), 10);
  const data = await PublicService.getCollege(collegeId);
  ApiResponse.success(res, data, 200);
});




