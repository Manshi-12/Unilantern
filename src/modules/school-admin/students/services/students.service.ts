import crypto from 'crypto';
import { StudentsRepository } from '../repositories/students.repository';
import { AuthRepository } from '../../../auth/school-admin/repositories/auth.repository';
import {
  RosterUpload,
  InviteLink,
  StudentTransfer,
} from '../types/students.types';

const studentsRepo = new StudentsRepository();
const authRepo = new AuthRepository();

export class StudentsService {
  // ─── Roster Uploads ───────────────────────────────────────────

  async createRosterUpload(
    school_id: number,
    adminId: number,
    file_name: string,
    fileBuffer: Buffer,       // ← actual CSV buffer
  ): Promise<RosterUpload> {
  
    // Count total rows from CSV (excluding header)
    const csvContent = fileBuffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    const total_rows = Math.max(0, lines.length - 1); // subtract header row
    console.log('CSV lines found:', lines.length, '| total_rows:', total_rows);

    const upload = await studentsRepo.createRosterUpload(
      school_id,
      adminId,
      file_name,
      total_rows,             // ← pass actual row count
    );
  
    await authRepo.writeAuditLog({
      actor_admin_id: adminId,
      actor_role: 'school_admin',
      school_id,
      action_type: 'UPLOAD_STUDENT_ROSTER',  // ← corrected to match API spec
      target_resource: `student_roster_uploads:${upload.upload_id}`,
      metadata: { file_name, upload_id: upload.upload_id, total_rows },
    });
  
    // TODO: enqueue BullMQ job when Redis is configured
    // await rosterQueue.add('process-roster', { upload_id: upload.upload_id, school_id });
  
    return upload;
  }
  async listRosterUploads(school_id: number): Promise<RosterUpload[]> {
    return studentsRepo.listRosterUploads(school_id);
  }

  async getRosterUpload(
    upload_id: number,
    school_id: number
  ): Promise<RosterUpload> {
    const upload = await studentsRepo.findRosterUploadById(upload_id, school_id);
    if (!upload) {
      const err: any = new Error('Roster upload not found');
      err.statusCode = 404;
      err.code = 'UPLOAD_NOT_FOUND';
      throw err;
    }
    return upload;
  }

  async getRosterUploadErrors(
    upload_id: number,
    school_id: number
  ): Promise<{ error_summary: string | null }> {
    const record = await studentsRepo.findRosterUploadErrors(upload_id, school_id);
    if (!record) {
      const err: any = new Error('Roster upload not found');
      err.statusCode = 404;
      err.code = 'UPLOAD_NOT_FOUND';
      throw err;
    }
    return record;
  }

  // ─── Invite Links ─────────────────────────────────────────────

  async createInviteLink(
    school_id: number,
    adminId: number,
    max_uses: number,
    expires_at: string
  ): Promise<InviteLink> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresDate = new Date(expires_at);

    const invite = await studentsRepo.createInviteLink(
      school_id,
      adminId,
      token,
      max_uses,
      expiresDate
    );

    await authRepo.writeAuditLog({
      actor_admin_id: adminId,
      actor_role: 'school_admin',
      school_id,
      action_type: 'INVITE_LINK_CREATED',
      target_resource: `student_invite_links:${invite.invite_id}`,
      metadata: { invite_id: invite.invite_id, max_uses, expires_at },
    });

    return invite;
  }

  async listInviteLinks(school_id: number): Promise<InviteLink[]> {
    return studentsRepo.listInviteLinks(school_id);
  }

  async revokeInviteLink(
    invite_id: number,
    school_id: number,
    adminId: number
  ): Promise<void> {
    const invite = await studentsRepo.findInviteLinkById(invite_id, school_id);
    if (!invite) {
      const err: any = new Error('Invite link not found');
      err.statusCode = 404;
      err.code = 'INVITE_NOT_FOUND';
      throw err;
    }
    if (invite.status === 'revoked') {
      const err: any = new Error('Invite link is already revoked');
      err.statusCode = 400;
      err.code = 'INVITE_ALREADY_REVOKED';
      throw err;
    }

    await studentsRepo.revokeInviteLink(invite_id, school_id);

    await authRepo.writeAuditLog({
      actor_admin_id: adminId,
      actor_role: 'school_admin',
      school_id,
      action_type: 'INVITE_LINK_REVOKED',
      target_resource: `student_invite_links:${invite_id}`,
      metadata: { invite_id },
    });
  }

  // ─── Transfers ────────────────────────────────────────────────

  async createTransfer(
    school_id: number,
    adminId: number,
    student_id: number,
    to_school_id: number,
    transfer_reason?: string
  ): Promise<StudentTransfer> {
    if (to_school_id === school_id) {
      const err: any = new Error('to_school_id cannot be the same as the current school');
      err.statusCode = 400;
      err.code = 'INVALID_TRANSFER';
      throw err;
    }

    const transfer = await studentsRepo.createTransfer(
      student_id,
      school_id,
      to_school_id,
      adminId,
      transfer_reason ?? null
    );

    await authRepo.writeAuditLog({
      actor_admin_id: adminId,
      actor_role: 'school_admin',
      school_id,
      action_type: 'TRANSFER_REQUESTED',
      target_resource: `student_school_transfers:${transfer.transfer_id}`,
      metadata: { transfer_id: transfer.transfer_id, student_id, to_school_id },
    });

    return transfer;
  }

  async listTransfers(school_id: number): Promise<StudentTransfer[]> {
    return studentsRepo.listTransfers(school_id);
  }

  async approveTransfer(
    transfer_id: number,
    school_id: number,
    adminId: number
  ): Promise<StudentTransfer> {
    const transfer = await studentsRepo.findTransferById(transfer_id, school_id);
    if (!transfer) {
      const err: any = new Error('Transfer not found');
      err.statusCode = 404;
      err.code = 'TRANSFER_NOT_FOUND';
      throw err;
    }
    if (transfer.status !== 'pending') {
      const err: any = new Error('Transfer is not in pending state');
      err.statusCode = 400;
      err.code = 'TRANSFER_NOT_PENDING';
      throw err;
    }

    const updated = await studentsRepo.updateTransferStatus(transfer_id, 'approved', adminId);

    await authRepo.writeAuditLog({
      actor_admin_id: adminId,
      actor_role: 'school_admin',
      school_id,
      action_type: 'TRANSFER_APPROVED',
      target_resource: `student_school_transfers:${transfer_id}`,
      metadata: { transfer_id },
    });

    return updated;
  }

  async rejectTransfer(
    transfer_id: number,
    school_id: number,
    adminId: number
  ): Promise<StudentTransfer> {
    const transfer = await studentsRepo.findTransferById(transfer_id, school_id);
    if (!transfer) {
      const err: any = new Error('Transfer not found');
      err.statusCode = 404;
      err.code = 'TRANSFER_NOT_FOUND';
      throw err;
    }
    if (transfer.status !== 'pending') {
      const err: any = new Error('Transfer is not in pending state');
      err.statusCode = 400;
      err.code = 'TRANSFER_NOT_PENDING';
      throw err;
    }

    const updated = await studentsRepo.updateTransferStatus(transfer_id, 'rejected', adminId);

    await authRepo.writeAuditLog({
      actor_admin_id: adminId,
      actor_role: 'school_admin',
      school_id,
      action_type: 'TRANSFER_REJECTED',
      target_resource: `student_school_transfers:${transfer_id}`,
      metadata: { transfer_id },
    });

    return updated;
  }
}




