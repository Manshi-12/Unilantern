import { Request, Response }   from 'express';
import { asyncHandler }        from '../../../../shared/utils/asyncHandler';
import { ApiResponse }         from '../../../../shared/responses/ApiResponse';
import { UpdateProfileDto }    from '../dto/update-profile.dto';
import * as ProfileService     from '../services/profile.service';

const getIds = (req: Request) => ({
  admin_id:           (req as any).jwtPayload.adminId    as number,
  school_id:          (req as any).jwtPayload.school_id  as number,
  current_session_id: (req as any).jwtPayload.sessionId  as number,
});

// ─── #53 GET /profile ─────────────────────────────────────────────────────────

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const { admin_id } = getIds(req);
  ApiResponse.success(res, await ProfileService.getProfile(admin_id));
});

// ─── #54 PUT /profile ─────────────────────────────────────────────────────────

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { admin_id, school_id } = getIds(req);
  const body = req.body as UpdateProfileDto;
  ApiResponse.success(res, await ProfileService.updateProfile(admin_id, school_id, body));
});

// ─── #55 GET /sessions ────────────────────────────────────────────────────────

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const { admin_id } = getIds(req);
  ApiResponse.success(res, await ProfileService.listSessions(admin_id));
});

// ─── #56 DELETE /sessions/:sessionId ─────────────────────────────────────────

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const { admin_id, school_id, current_session_id } = getIds(req);
  const session_id = Number(req.params.sessionId);
  await ProfileService.revokeSession(admin_id, school_id, session_id, current_session_id);
  ApiResponse.success(res, { message: 'Session revoked successfully.' });
});

// ─── #57 DELETE /sessions — revoke all except current ────────────────────────

export const revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
  const { admin_id, school_id, current_session_id } = getIds(req);
  await ProfileService.revokeAllSessions(admin_id, school_id, current_session_id);
  ApiResponse.success(res, { message: 'All other sessions revoked successfully.' });
});




