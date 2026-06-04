import {
  AdvisorRecord,
  ConsentCoverageRow,
  AuditLogRow,
  PaginatedAuditLog,
  ExportPermissionsResponse,
} from '../types/governance.types';

// ── #23 List advisors ──────────────────────────────────────────────────────────
export type ListAdvisorsResult = AdvisorRecord[];

// ── #24 Invite advisor ─────────────────────────────────────────────────────────
export interface InviteAdvisorInput {
  school_id: number;
  admin_id:  number;
  email:     string;
}
export interface InviteAdvisorResult {
  access_id: number;
}

// ── #25 Resend invite ──────────────────────────────────────────────────────────
export interface ResendInviteInput {
  school_id:  number;
  admin_id:   number;
  advisor_id: number;
}

// ── #26 Revoke access ──────────────────────────────────────────────────────────
export interface RevokeAccessInput {
  school_id:  number;
  admin_id:   number;
  advisor_id: number;
}

// ── #27 Toggle export permission ───────────────────────────────────────────────
export interface ToggleExportPermissionInput {
  school_id:  number;
  admin_id:   number;
  advisor_id: number;
  can_export: boolean;
}

// ── #28 Consent coverage ───────────────────────────────────────────────────────
export type GetConsentCoverageResult = ConsentCoverageRow[];

// ── #29 Audit log ──────────────────────────────────────────────────────────────
export interface GetAuditLogInput {
  school_id: number;
  limit:     number;
  cursor?:   number;
}
export type GetAuditLogResult = PaginatedAuditLog;

// ── #30 Export permissions ─────────────────────────────────────────────────────
export type GetExportPermissionsResult = ExportPermissionsResponse;

// ── Repository contract ────────────────────────────────────────────────────────
export interface IGovernanceRepository {
  listAdvisors(school_id: number): Promise<AdvisorRecord[]>;
  findExistingAccess(invited_email: string, school_id: number): Promise<{ access_id: number; status: string } | null>;
  insertAdvisorAccess(data: {
    invited_email:           string;
    school_id:               number;
    invited_by:              number;
    invite_token_hash:       string;
    invite_token_expires_at: Date;
  }): Promise<{ access_id: number }>;
  findAccessById(access_id: number, school_id: number): Promise<{
    access_id:           number;
    advisor_user_id:     number | null;
    status:              string;
    can_export:          boolean;
    invite_resent_count: number;
    invited_email:       string;
  } | null>;
  updateResendInvite(access_id: number, invite_token_hash: string, invite_token_expires_at: Date): Promise<void>;
  revokeAccess(access_id: number): Promise<void>;
  updateExportPermission(access_id: number, can_export: boolean): Promise<void>;
  getConsentCoverage(school_id: number): Promise<ConsentCoverageRow[]>;
  getAuditLog(school_id: number, limit: number, cursor?: number): Promise<AuditLogRow[]>;
  getSchoolExportPolicy(school_id: number): Promise<{ admin_can_export: boolean; advisor_export_enabled: boolean }>;
}




