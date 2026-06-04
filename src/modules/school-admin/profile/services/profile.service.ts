import { ProfileRepository }   from '../repositories/profile.repository';
import { AuthRepository }      from '../../../auth/school-admin/repositories/auth.repository';
import { AdminProfile, SessionRow } from '../types/profile.types';
import { UpdateProfileDto }    from '../dto/update-profile.dto';
import {
  GetProfileResult,
  UpdateProfileResult,
  ListSessionsResult,
} from '../interfaces/profile.interfaces';

const repo     = new ProfileRepository();
const authRepo = new AuthRepository();

// ─── #53 GET /profile ─────────────────────────────────────────────────────────

export const getProfile = async (admin_id: number): Promise<GetProfileResult> => {
  const profile = await repo.getProfile(admin_id);
  if (!profile) {
    const err: any = new Error('Admin profile not found.');
    err.statusCode = 404; err.code = 'PROFILE_NOT_FOUND';
    throw err;
  }
  return profile;
};

// ─── #54 PUT /profile ─────────────────────────────────────────────────────────

export const updateProfile = async (
  admin_id:  number,
  school_id: number,
  body:      UpdateProfileDto,
): Promise<UpdateProfileResult> => {
  const updated = await repo.updateProfile(admin_id, body.full_name, body.email);
  if (!updated) {
    const err: any = new Error('Admin profile not found.');
    err.statusCode = 404; err.code = 'PROFILE_NOT_FOUND';
    throw err;
  }
  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'PROFILE_UPDATED',
    target_resource: 'school_admins',
    metadata:        { updated_fields: Object.keys(body), email_changed: !!body.email },
  });
  return updated;
};

// ─── #55 GET /sessions ────────────────────────────────────────────────────────

export const listSessions = async (admin_id: number): Promise<ListSessionsResult> => {
  return repo.listSessions(admin_id);
};

// ─── #56 DELETE /sessions/:sessionId ─────────────────────────────────────────

export const revokeSession = async (
  admin_id:           number,
  school_id:          number,
  session_id:         number,
  current_session_id: number,
): Promise<void> => {
  if (session_id === current_session_id) {
    const err: any = new Error('Cannot revoke current session. Use logout instead.');
    err.statusCode = 400; err.code = 'CANNOT_REVOKE_CURRENT_SESSION';
    throw err;
  }
  const session = await repo.findSessionById(session_id, admin_id);
  if (!session) {
    const err: any = new Error('Session not found.');
    err.statusCode = 404; err.code = 'SESSION_NOT_FOUND';
    throw err;
  }
  if (session.invalidated_at) {
    const err: any = new Error('Session is already invalidated.');
    err.statusCode = 400; err.code = 'SESSION_ALREADY_INVALIDATED';
    throw err;
  }
  await repo.revokeSession(session_id, admin_id);
  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'SESSION_REVOKED',
    target_resource: 'admin_sessions',
    metadata:        { session_id },
  });
};

// ─── #57 DELETE /sessions — revoke all except current ────────────────────────

export const revokeAllSessions = async (
  admin_id:           number,
  school_id:          number,
  current_session_id: number,
): Promise<void> => {
  await repo.revokeAllExceptCurrent(admin_id, current_session_id);
  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'ALL_SESSIONS_REVOKED',
    target_resource: 'admin_sessions',
    metadata:        { current_session_id },
  });
};




