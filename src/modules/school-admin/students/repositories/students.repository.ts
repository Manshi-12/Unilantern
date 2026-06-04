import { getPool, sql } from '../../../../database/db';
import {
  RosterUpload,
  InviteLink,
  StudentTransfer,
} from '../types/students.types';
import { IStudentsRepository } from '../interfaces/students.interface';

export class StudentsRepository implements IStudentsRepository{
  // ─── Roster Uploads ───────────────────────────────────────────

  async createRosterUpload(
    school_id: number,
    uploaded_by: number,
    file_name: string,
    total_rows: number, 
  ): Promise<RosterUpload> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .input('uploaded_by', sql.Int, uploaded_by)
      .input('file_name', sql.VarChar, file_name)
      .input('total_rows',   sql.Int, total_rows)
      .query(`
        INSERT INTO student_roster_uploads 
          (school_id, uploaded_by, file_name, status, total_rows, successful_rows, failed_rows)
        OUTPUT INSERTED.*
        VALUES (@school_id, @uploaded_by, @file_name, 'processing', @total_rows, 0, 0)      `);
    return result.recordset[0];
  }

  async listRosterUploads(school_id: number): Promise<RosterUpload[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT upload_id, school_id, uploaded_by, file_name, total_rows,
               successful_rows, failed_rows, error_summary, status,
               uploaded_at, completed_at
        FROM student_roster_uploads
        WHERE school_id = @school_id
        ORDER BY uploaded_at DESC
      `);
    return result.recordset;
  }

  async findRosterUploadById(
    upload_id: number,
    school_id: number
  ): Promise<RosterUpload | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('upload_id', sql.Int, upload_id)
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT upload_id, school_id, uploaded_by, file_name, total_rows,
               successful_rows, failed_rows, error_summary, status,
               uploaded_at, completed_at
        FROM student_roster_uploads
        WHERE upload_id = @upload_id AND school_id = @school_id
      `);
    return result.recordset[0] ?? null;
  }

  async findRosterUploadErrors(
    upload_id: number,
    school_id: number
  ): Promise<{ error_summary: string | null } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('upload_id', sql.Int, upload_id)
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT error_summary
        FROM student_roster_uploads
        WHERE upload_id = @upload_id AND school_id = @school_id
      `);
    return result.recordset[0] ?? null;
  }

  // ─── Invite Links ─────────────────────────────────────────────

  async createInviteLink(
    school_id: number,
    created_by: number,
    token: string,
    max_uses: number,
    expires_at: Date
  ): Promise<InviteLink> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .input('created_by', sql.Int, created_by)
      .input('token', sql.VarChar, token)
      .input('max_uses', sql.Int, max_uses)
      .input('expires_at', sql.DateTime, expires_at)
      .query(`
        INSERT INTO student_invite_links
          (school_id, created_by, token, status, max_uses, use_count, expires_at)
        OUTPUT INSERTED.*
        VALUES (@school_id, @created_by, @token, 'active', @max_uses, 0, @expires_at)
      `);
    return result.recordset[0];
  }

  async listInviteLinks(school_id: number): Promise<InviteLink[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT invite_id, school_id, created_by, token, status,
               max_uses, use_count, expires_at, created_at, revoked_at
        FROM student_invite_links
        WHERE school_id = @school_id
        ORDER BY created_at DESC
      `);
    return result.recordset;
  }

  async findInviteLinkById(
    invite_id: number,
    school_id: number
  ): Promise<InviteLink | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('invite_id', sql.Int, invite_id)
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT invite_id, school_id, created_by, token, status,
               max_uses, use_count, expires_at, created_at, revoked_at
        FROM student_invite_links
        WHERE invite_id = @invite_id AND school_id = @school_id
      `);
    return result.recordset[0] ?? null;
  }

  async revokeInviteLink(
    invite_id: number,
    school_id: number
  ): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('invite_id', sql.Int, invite_id)
      .input('school_id', sql.Int, school_id)
      .query(`
        UPDATE student_invite_links
        SET status = 'revoked', revoked_at = GETUTCDATE()
        WHERE invite_id = @invite_id AND school_id = @school_id
      `);
  }

  // ─── Transfers ────────────────────────────────────────────────

  async createTransfer(
    student_id: number,
    from_school_id: number,
    to_school_id: number,
    requested_by: number,
    transfer_reason: string | null
  ): Promise<StudentTransfer> {
    const pool = await getPool();
    const result = await pool.request()
      .input('student_id', sql.Int, student_id)
      .input('from_school_id', sql.Int, from_school_id)
      .input('to_school_id', sql.Int, to_school_id)
      .input('requested_by', sql.Int, requested_by)
      .input('transfer_reason', sql.VarChar, transfer_reason ?? null)
      .query(`
        INSERT INTO student_school_transfers
          (student_id, from_school_id, to_school_id, requested_by, status, transfer_reason)
        OUTPUT INSERTED.*
        VALUES (@student_id, @from_school_id, @to_school_id, @requested_by, 'pending', @transfer_reason)
      `);
    return result.recordset[0];
  }

  async listTransfers(school_id: number): Promise<StudentTransfer[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT transfer_id, student_id, from_school_id, to_school_id,
               requested_by, status, transfer_reason, approved_by,
               requested_at, completed_at
        FROM student_school_transfers
        WHERE from_school_id = @school_id OR to_school_id = @school_id
        ORDER BY requested_at DESC
      `);
    return result.recordset;
  }

  async findTransferById(
    transfer_id: number,
    school_id: number
  ): Promise<StudentTransfer | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('transfer_id', sql.Int, transfer_id)
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT transfer_id, student_id, from_school_id, to_school_id,
               requested_by, status, transfer_reason, approved_by,
               requested_at, completed_at
        FROM student_school_transfers
        WHERE transfer_id = @transfer_id
          AND (from_school_id = @school_id OR to_school_id = @school_id)
      `);
    return result.recordset[0] ?? null;
  }

  async updateTransferStatus(
    transfer_id: number,
    status: 'approved' | 'rejected',
    approved_by: number
  ): Promise<StudentTransfer> {
    const pool = await getPool();
    const result = await pool.request()
      .input('transfer_id', sql.Int, transfer_id)
      .input('status', sql.VarChar, status)
      .input('approved_by', sql.Int, approved_by)
      .query(`
        UPDATE student_school_transfers
        SET status = @status,
            approved_by = @approved_by,
            completed_at = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE transfer_id = @transfer_id
      `);
    return result.recordset[0];
  }
}




