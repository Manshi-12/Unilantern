import { Request, Response }        from 'express';
import { asyncHandler }             from '../../../../shared/utils/asyncHandler';
import { ApiResponse }              from '../../../../shared/responses/ApiResponse';
import { auditLogQuerySchema }      from '../validators/governance.validation';
import { InviteAdvisorDto }         from '../dto/invite-advisor.dto';
import { ToggleExportPermissionDto } from '../dto/toggle-export-permission.dto';
import * as GovernanceService       from '../services/governance.service';

const getIds = (req: Request) => ({
  school_id: (req as any).jwtPayload.school_id as number,
  admin_id:  (req as any).jwtPayload.adminId   as number,
});

// ─── #23 GET /advisors ────────────────────────────────────────────────────────

export const listAdvisors = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  ApiResponse.success(res, await GovernanceService.listAdvisors(school_id));
});

// ─── #24 POST /advisors/invite ────────────────────────────────────────────────

export const inviteAdvisor = asyncHandler(async (req: Request, res: Response) => {
  const { school_id, admin_id } = getIds(req);
  const body = req.body as InviteAdvisorDto;
  const result = await GovernanceService.inviteAdvisor(school_id, admin_id, body.email);
  ApiResponse.success(res, result, 201);
});

// ─── #25 POST /advisors/:advisorId/resend-invite ──────────────────────────────

export const resendInvite = asyncHandler(async (req: Request, res: Response) => {
  const { school_id, admin_id } = getIds(req);
  const advisor_id = Number(req.params.advisorId);
  await GovernanceService.resendInvite(school_id, admin_id, advisor_id);
  ApiResponse.success(res, { message: 'Invite resent successfully.' });
});

// ─── #26 DELETE /advisors/:advisorId/access ───────────────────────────────────

export const revokeAccess = asyncHandler(async (req: Request, res: Response) => {
  const { school_id, admin_id } = getIds(req);
  const advisor_id = Number(req.params.advisorId);
  await GovernanceService.revokeAccess(school_id, admin_id, advisor_id);
  ApiResponse.success(res, { message: 'Advisor access revoked.' });
});

// ─── #27 PUT /advisors/:advisorId/export-permission ──────────────────────────

export const toggleExportPermission = asyncHandler(async (req: Request, res: Response) => {
  const { school_id, admin_id } = getIds(req);
  const advisor_id = Number(req.params.advisorId);
  const body = req.body as ToggleExportPermissionDto;
  await GovernanceService.toggleExportPermission(school_id, admin_id, advisor_id, body.can_export);
  ApiResponse.success(res, { message: 'Export permission updated.' });
});

// ─── #28 GET /consent-coverage ────────────────────────────────────────────────

export const getConsentCoverage = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  ApiResponse.success(res, await GovernanceService.getConsentCoverage(school_id));
});

// ─── #29 GET /audit-log ───────────────────────────────────────────────────────

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  const parsed = auditLogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code:       'VALIDATION_ERROR',
        message:    'Invalid query parameters.',
        request_id: (req as any).requestId,
        details:    {},
      },
    });
  }
  const { cursor, limit } = parsed.data;
  ApiResponse.success(res, await GovernanceService.getAuditLog(school_id, limit, cursor));
});

// ─── #30 GET /export-permissions ─────────────────────────────────────────────

export const getExportPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  ApiResponse.success(res, await GovernanceService.getExportPermissions(school_id));
});




