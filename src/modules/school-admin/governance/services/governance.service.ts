import { GovernanceRepository }  from '../repositories/governance.repository';
import { AuthRepository }        from '../../../auth/school-admin/repositories/auth.repository';
import { sendAdvisorInviteEmail } from '../utils/governance.email.service';
import crypto from 'crypto';
import { generateToken } from '../../../../shared/utils/token';
import {
  AdvisorRecord,
  ConsentCoverageRow,
  PaginatedAuditLog,
  ExportPermissionsResponse,
} from '../types/governance.types';
import {
  InviteAdvisorResult,
  GetAuditLogResult,
} from '../interfaces/governance.interface';

const repo     = new GovernanceRepository();
const authRepo = new AuthRepository();

// ─── #23 List advisors ────────────────────────────────────────────────────────

export const listAdvisors = async (school_id: number): Promise<AdvisorRecord[]> => {
  return repo.listAdvisors(school_id);
};

// ─── #24 Invite advisor ───────────────────────────────────────────────────────

export const inviteAdvisor = async (
  school_id: number,
  admin_id:  number,
  email:     string,
): Promise<InviteAdvisorResult> => {
  const rawToken    = generateToken();
  const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 day expirey time

  const existing = await repo.findExistingAccess(email, school_id);
  if (existing) {
    if (existing.status === 'active') {
      const err: any = new Error('Advisor already has active access to this school.');
      err.statusCode = 409; err.code = 'ADVISOR_ALREADY_ACTIVE';
      throw err;
    }
    if (existing.status === 'pending') {
      const err: any = new Error('Advisor already has a pending invite. Use resend instead.');
      err.statusCode = 409; err.code = 'ADVISOR_INVITE_PENDING';
      throw err;
    }
  }

  const { access_id } = await repo.insertAdvisorAccess({
    invited_email:           email,
    school_id,
    invited_by:              admin_id,
    invite_token_hash:       tokenHash,
    invite_token_expires_at: tokenExpiry,
  });

  sendAdvisorInviteEmail(email, email, rawToken).catch(console.error);

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'INVITE_ADVISOR',
    target_resource: 'advisor_access',
    metadata:        { invited_email: email, access_id },
  });

  return { access_id };
};

// ─── #25 Resend invite ────────────────────────────────────────────────────────

export const resendInvite = async (
  school_id:  number,
  admin_id:   number,
  advisor_id: number,
): Promise<void> => {

  const access = await repo.findAccessById(advisor_id, school_id);
  if (!access) {
    const err: any = new Error('Advisor access record not found.');
    err.statusCode = 404; err.code = 'ADVISOR_ACCESS_NOT_FOUND';
    throw err;
  }
  if (access.status === 'revoked') {
    const err: any = new Error('Cannot resend invite to a revoked advisor.');
    err.statusCode = 400; err.code = 'ADVISOR_ACCESS_REVOKED';
    throw err;
  }

  await repo.checkAndIncrementDailyResend(access.access_id);

  const rawToken    = generateToken();
  const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await repo.updateResendInvite(access.access_id, tokenHash, tokenExpiry);
  sendAdvisorInviteEmail(access.invited_email, access.invited_email, rawToken).catch(console.error);

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'RESEND_ADVISOR_INVITE',
    target_resource: 'advisor_access',
    metadata:        { access_id: advisor_id },
  });
};

// ─── #26 Revoke advisor access ────────────────────────────────────────────────

export const revokeAccess = async (
  school_id:  number,
  admin_id:   number,
  advisor_id: number,
): Promise<void> => {

  const access = await repo.findAccessById(advisor_id, school_id);
  if (!access) {
    const err: any = new Error('Advisor access record not found.');
    err.statusCode = 404; err.code = 'ADVISOR_ACCESS_NOT_FOUND';
    throw err;
  }
  if (access.status === 'revoked') {
    const err: any = new Error('Advisor access is already revoked.');
    err.statusCode = 400; err.code = 'ADVISOR_ALREADY_REVOKED';
    throw err;
  }

  await repo.revokeAccess(access.access_id);

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'REVOKE_ADVISOR_ACCESS',
    target_resource: 'advisor_access',
    metadata:        { access_id: advisor_id, advisor_user_id: access.advisor_user_id },
  });
};

// ─── #27 Toggle export permission ────────────────────────────────────────────

export const toggleExportPermission = async (
  school_id:  number,
  admin_id:   number,
  advisor_id: number,
  can_export: boolean,
): Promise<void> => {

  const access = await repo.findAccessById(advisor_id, school_id);
  if (!access) {
    const err: any = new Error('Advisor access record not found.');
    err.statusCode = 404; err.code = 'ADVISOR_ACCESS_NOT_FOUND';
    throw err;
  }
  if (access.status === 'revoked') {
    const err: any = new Error('Cannot update permissions for a revoked advisor.');
    err.statusCode = 400; err.code = 'ADVISOR_ACCESS_REVOKED';
    throw err;
  }

  await repo.updateExportPermission(access.access_id, can_export);

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'UPDATE_EXPORT_PERMISSIONS',
    target_resource: 'advisor_access',
    metadata:        { access_id: advisor_id, can_export },
  });
};

// ─── #28 Consent coverage ─────────────────────────────────────────────────────

export const getConsentCoverage = async (school_id: number): Promise<ConsentCoverageRow[]> => {
  return repo.getConsentCoverage(school_id);
};

// ─── #29 Audit log ────────────────────────────────────────────────────────────

export const getAuditLog = async (
  school_id: number,
  limit:     number,
  cursor?:   number,
): Promise<GetAuditLogResult> => {
  const rows        = await repo.getAuditLog(school_id, limit, cursor);
  const has_more    = rows.length > limit;
  const data        = has_more ? rows.slice(0, limit) : rows;
  const next_cursor = has_more ? data[data.length - 1].log_id : null;
  return { data, next_cursor, has_more };
};

// ─── #30 Export permissions ───────────────────────────────────────────────────

export const getExportPermissions = async (school_id: number): Promise<ExportPermissionsResponse> => {
  const policy = await repo.getSchoolExportPolicy(school_id);
  return { school_id, ...policy };
};




