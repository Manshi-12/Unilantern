import { Request, Response }       from 'express';
import { asyncHandler }            from '../../../../shared/utils/asyncHandler';
import { ApiResponse }             from '../../../../shared/responses/ApiResponse';
import * as CalibrationService     from '../services/calibration.service';
import { SaveCalibrationDto }      from '../dto/calibrations.dto';

const getIds = (req: Request) => ({
  school_id: (req as any).jwtPayload.school_id as number,
  admin_id:  (req as any).jwtPayload.adminId   as number,
});

// ─── 3.1 GET /v1/school-admin/calibration ─────────────────────────────────────

export const getCalibration = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  ApiResponse.success(res, await CalibrationService.getCalibration(school_id), 200);
});

// ─── 3.2 PUT /v1/school-admin/calibration ─────────────────────────────────────

export const saveCalibration = asyncHandler(async (req: Request, res: Response) => {
  const { school_id, admin_id } = getIds(req);
  const body = req.body as SaveCalibrationDto;
  ApiResponse.success(res, await CalibrationService.saveCalibration(school_id, admin_id, body), 200);
});

// ─── 3.3 PUT /v1/school-admin/calibration/restore-defaults ───────────────────

export const restoreDefaults = asyncHandler(async (req: Request, res: Response) => {
  const { school_id, admin_id } = getIds(req);
  ApiResponse.success(res, await CalibrationService.restoreDefaults(school_id, admin_id), 200);
});




