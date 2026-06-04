import { AdminProfile, SessionRow } from '../types/profile.types';

// ── #53 GET /profile ───────────────────────────────────────────────────────────
export type GetProfileResult = AdminProfile;

// ── #54 PUT /profile ───────────────────────────────────────────────────────────
export interface UpdateProfileInput {
  admin_id:  number;
  school_id: number;
  full_name?: string;
  email?:     string;
}
export type UpdateProfileResult = AdminProfile;

// ── #55 GET /sessions ──────────────────────────────────────────────────────────
export type ListSessionsResult = SessionRow[];

// ── #56 DELETE /sessions/:sessionId ───────────────────────────────────────────
export interface RevokeSessionInput {
  admin_id:           number;
  school_id:          number;
  session_id:         number;
  current_session_id: number;
}

// ── #57 DELETE /sessions ───────────────────────────────────────────────────────
export interface RevokeAllSessionsInput {
  admin_id:           number;
  school_id:          number;
  current_session_id: number;
}

// ── Repository contract ────────────────────────────────────────────────────────
export interface IProfileRepository {
  getProfile(admin_id: number): Promise<AdminProfile | null>;
  updateProfile(admin_id: number, full_name?: string, email?: string): Promise<AdminProfile | null>;
  listSessions(admin_id: number): Promise<SessionRow[]>;
  findSessionById(session_id: number, admin_id: number): Promise<SessionRow | null>;
  revokeSession(session_id: number, admin_id: number): Promise<void>;
  revokeAllExceptCurrent(admin_id: number, current_session_id: number): Promise<void>;
}




