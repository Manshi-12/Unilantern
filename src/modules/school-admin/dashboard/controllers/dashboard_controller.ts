import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { ApiResponse } from '../../../../shared/responses/ApiResponse';
import * as DashboardService from '../services/dashboard_services';

const getSchoolId = (req: Request): number => (req as any).jwtPayload.school_id;

// 2.1 Section A
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getOverview(getSchoolId(req)), 200);
});

// 2.2 Section B
export const getCollegeIntent = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getCollegeIntent(getSchoolId(req)), 200);
});

// 2.3 Section C
export const getGapAnalysis = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getGapAnalysis(getSchoolId(req)), 200);
});

// 2.4 Section D
export const getEquityAccess = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getEquityAccess(getSchoolId(req)), 200);
});

// 2.5 Section F
export const getTrajectory = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getTrajectory(getSchoolId(req)), 200);
});

// 2.6 Section G
export const getEngagement = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getEngagement(getSchoolId(req)), 200);
});

// 2.7 Section H
export const getSeniorRisk = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getSeniorRisk(getSchoolId(req)), 200);
});

// 2.8 Section I
export const getCounselingCapacity = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getCounselingCapacity(getSchoolId(req)), 200);
});

// 2.9 Section J
export const getReadinessDrivers = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await DashboardService.getReadinessDrivers(getSchoolId(req)), 200);
});




