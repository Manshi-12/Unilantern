export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type InviteStatus = 'active' | 'revoked' | 'expired';
export type TransferStatus = 'pending' | 'approved' | 'rejected';

export interface RosterUpload {
  upload_id: number;
  school_id: number;
  uploaded_by: number;
  file_name: string;
  total_rows: number | null;
  successful_rows: number | null;
  failed_rows: number | null;
  error_summary: string | null;
  status: UploadStatus;
  uploaded_at: Date;
  completed_at: Date | null;
}

export interface InviteLink {
  invite_id: number;
  school_id: number;
  created_by: number;
  token: string;
  status: InviteStatus;
  max_uses: number;
  use_count: number;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

export interface StudentTransfer {
  transfer_id: number;
  student_id: number;
  from_school_id: number;
  to_school_id: number;
  requested_by: number;
  status: TransferStatus;
  transfer_reason: string | null;
  approved_by: number | null;
  requested_at: Date;
  completed_at: Date | null;
}

export interface CreateRosterUploadInput {
  file_name: string;
}

export interface CreateInviteLinkInput {
  max_uses: number;
  expires_at: string;
}

export interface CreateTransferInput {
  student_id: number;
  to_school_id: number;
  transfer_reason?: string;
}




