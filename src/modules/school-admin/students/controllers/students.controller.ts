import { Request, Response }    from 'express';
import { asyncHandler }         from '../../../../shared/utils/asyncHandler';
import { ApiResponse }          from '../../../../shared/responses/ApiResponse';
import { StudentsService }      from '../services/students.service';
import { CreateInviteLinkDto }  from '../dto/create-invite-link.dto';
import { CreateTransferDto }    from '../dto/create-transfer.dto';
import { validationResult }     from 'express-validator';

const studentsService = new StudentsService();

const getIds = (req: Request) => ({
  school_id: (req as any).jwtPayload.school_id as number,
  admin_id:  (req as any).jwtPayload.adminId   as number,
});

const handleValidation = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors.array() },
    });
    return false;
  }
  return true;
};

// ─── Roster Uploads ───────────────────────────────────────────────────────────

export const createRosterUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id, admin_id } = getIds(req);
  const upload = await studentsService.createRosterUpload(
    school_id,
    admin_id,
    req.file!.originalname,
    req.file!.buffer,
  );
  ApiResponse.success(res, { upload }, 201);
});

export const listRosterUploads = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  const uploads = await studentsService.listRosterUploads(school_id);
  ApiResponse.success(res, { uploads });
});

export const getRosterUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id } = getIds(req);
  const uploadId = parseInt(String(req.params.uploadId), 10);
  const upload   = await studentsService.getRosterUpload(uploadId, school_id);
  ApiResponse.success(res, { upload });
});

export const getRosterUploadErrors = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id } = getIds(req);
  const uploadId = parseInt(String(req.params.uploadId), 10);
  const result   = await studentsService.getRosterUploadErrors(uploadId, school_id);
  ApiResponse.success(res, result);
});

// ─── Invite Links ─────────────────────────────────────────────────────────────

export const createInviteLink = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id, admin_id } = getIds(req);
  const body   = req.body as CreateInviteLinkDto;
  const invite = await studentsService.createInviteLink(school_id, admin_id, body.max_uses, body.expires_at);
  ApiResponse.success(res, { invite }, 201);
});

export const listInviteLinks = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  const invites = await studentsService.listInviteLinks(school_id);
  ApiResponse.success(res, { invites });
});

export const revokeInviteLink = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id, admin_id } = getIds(req);
  const inviteId = parseInt(String(req.params.inviteId), 10);
  await studentsService.revokeInviteLink(inviteId, school_id, admin_id);
  ApiResponse.success(res, { message: 'Invite link revoked successfully.' });
});

// ─── Transfers ────────────────────────────────────────────────────────────────

export const createTransfer = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id, admin_id } = getIds(req);
  const body     = req.body as CreateTransferDto;
  const transfer = await studentsService.createTransfer(
    school_id, admin_id, body.student_id, body.to_school_id, body.transfer_reason,
  );
  ApiResponse.success(res, { transfer }, 201);
});

export const listTransfers = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = getIds(req);
  const transfers = await studentsService.listTransfers(school_id);
  ApiResponse.success(res, { transfers });
});

export const approveTransfer = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id, admin_id } = getIds(req);
  const transferId = parseInt(String(req.params.transferId), 10);
  const transfer   = await studentsService.approveTransfer(transferId, school_id, admin_id);
  ApiResponse.success(res, { transfer });
});

export const rejectTransfer = asyncHandler(async (req: Request, res: Response) => {
  if (!handleValidation(req, res)) return;
  const { school_id, admin_id } = getIds(req);
  const transferId = parseInt(String(req.params.transferId), 10);
  const transfer   = await studentsService.rejectTransfer(transferId, school_id, admin_id);
  ApiResponse.success(res, { transfer });
});




