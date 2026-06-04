import {
    RosterUpload,
    InviteLink,
    StudentTransfer,
  } from '../types/students.types';
  
  // ── Roster uploads ─────────────────────────────────────────────────────────────
  export type ListRosterUploadsResult  = RosterUpload[];
  export type GetRosterUploadResult    = RosterUpload;
  export interface RosterUploadErrorsResult {
    error_summary: string | null;
  }
  
  // ── Invite links ───────────────────────────────────────────────────────────────
  export interface CreateInviteLinkInput {
    school_id:  number;
    admin_id:   number;
    max_uses:   number;
    expires_at: string;
  }
  export type ListInviteLinksResult = InviteLink[];
  
  // ── Transfers ──────────────────────────────────────────────────────────────────
  export interface CreateTransferInput {
    school_id:        number;
    admin_id:         number;
    student_id:       number;
    to_school_id:     number;
    transfer_reason?: string;
  }
  export type ListTransfersResult = StudentTransfer[];
  
  // ── Repository contract ────────────────────────────────────────────────────────
  export interface IStudentsRepository {
    createRosterUpload(school_id: number, uploaded_by: number, file_name: string, total_rows: number): Promise<RosterUpload>;
    listRosterUploads(school_id: number): Promise<RosterUpload[]>;
    findRosterUploadById(upload_id: number, school_id: number): Promise<RosterUpload | null>;
    findRosterUploadErrors(upload_id: number, school_id: number): Promise<{ error_summary: string | null } | null>;
    createInviteLink(school_id: number, created_by: number, token: string, max_uses: number, expires_at: Date): Promise<InviteLink>;
    listInviteLinks(school_id: number): Promise<InviteLink[]>;
    findInviteLinkById(invite_id: number, school_id: number): Promise<InviteLink | null>;
    revokeInviteLink(invite_id: number, school_id: number): Promise<void>;
    createTransfer(student_id: number, from_school_id: number, to_school_id: number, requested_by: number, transfer_reason: string | null): Promise<StudentTransfer>;
    listTransfers(school_id: number): Promise<StudentTransfer[]>;
    findTransferById(transfer_id: number, school_id: number): Promise<StudentTransfer | null>;
    updateTransferStatus(transfer_id: number, status: 'approved' | 'rejected', approved_by: number): Promise<StudentTransfer>;
  }




