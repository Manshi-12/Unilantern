import { getPool, sql } from '../../../../database/db';
import { AdminProfile, SessionRow } from '../types/profile.types';
import { IProfileRepository } from '../interfaces/profile.interfaces';
/**
 * ProfileRepository
 *
 * Tables used:
 *   school_admins  — admin_id, school_id, full_name, email, password_hash,
 *                    admin_role, can_export, is_active, created_at, updated_at
 *   admin_sessions — session_id, admin_id, token_hash, ip_address, device_info,
 *                    created_at, expires_at, invalidated_at
 *
 * Note: password_hash is NEVER returned in any query
 */
export class ProfileRepository implements IProfileRepository {

  // ─── #53 Get admin profile ────────────────────────────────────────────────

  async getProfile(admin_id: number): Promise<AdminProfile | null> {
    const pool   = await getPool();
    const result = await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        SELECT
          admin_id, school_id, full_name, email,
          admin_role, can_export, is_active,
          created_at, updated_at
        FROM school_admins
        WHERE admin_id = @admin_id
          AND is_active = 1
      `);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return {
      ...row,
      can_export: row.can_export === true || row.can_export === 1,
      is_active:  row.is_active  === true || row.is_active  === 1,
    };
  }

  // ─── #54 Update admin profile ─────────────────────────────────────────────

  async updateProfile(
    admin_id:  number,
    full_name?: string,
    email?:     string,
  ): Promise<AdminProfile | null> {
    const pool = await getPool();

    // Build dynamic SET clause — only update provided fields
    const setClauses: string[] = ['updated_at = GETDATE()'];
    const request = pool.request().input('admin_id', sql.Int, admin_id);

    if (full_name !== undefined) {
      setClauses.push('full_name = @full_name');
      request.input('full_name', sql.NVarChar(255), full_name);
    }
    if (email !== undefined) {
      setClauses.push('email = @email');
      request.input('email', sql.VarChar(255), email);
    }

    await request.query(`
      UPDATE school_admins
      SET ${setClauses.join(', ')}
      WHERE admin_id = @admin_id
        AND is_active = 1
    `);

    return this.getProfile(admin_id);
  }

  // ─── #55 List active sessions ─────────────────────────────────────────────

  async listSessions(admin_id: number): Promise<SessionRow[]> {
    const pool   = await getPool();
    const result = await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        SELECT
          session_id, admin_id, ip_address,
          device_info, created_at, expires_at, invalidated_at
        FROM admin_sessions
        WHERE admin_id       = @admin_id
          AND invalidated_at IS NULL
          AND expires_at     > GETDATE()
        ORDER BY created_at DESC
      `);
    return result.recordset;
  }

  // ─── Find session by ID + admin ───────────────────────────────────────────

  async findSessionById(
    session_id: number,
    admin_id:   number,
  ): Promise<SessionRow | null> {
    const pool   = await getPool();
    const result = await pool.request()
      .input('session_id', sql.Int, session_id)
      .input('admin_id',   sql.Int, admin_id)
      .query(`
        SELECT TOP 1
          session_id, admin_id, ip_address,
          device_info, created_at, expires_at, invalidated_at
        FROM admin_sessions
        WHERE session_id = @session_id
          AND admin_id   = @admin_id
      `);
    return result.recordset[0] ?? null;
  }

  // ─── #56 Revoke specific session ──────────────────────────────────────────

  async revokeSession(session_id: number, admin_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('session_id', sql.Int, session_id)
      .input('admin_id',   sql.Int, admin_id)
      .query(`
        UPDATE admin_sessions
        SET invalidated_at = GETDATE()
        WHERE session_id   = @session_id
          AND admin_id     = @admin_id
          AND invalidated_at IS NULL
      `);
  }

  // ─── #57 Revoke all sessions except current ───────────────────────────────

  async revokeAllExceptCurrent(
    admin_id:           number,
    current_session_id: number,
  ): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('admin_id',           sql.Int, admin_id)
      .input('current_session_id', sql.Int, current_session_id)
      .query(`
        UPDATE admin_sessions
        SET invalidated_at = GETDATE()
        WHERE admin_id         = @admin_id
          AND session_id       != @current_session_id
          AND invalidated_at   IS NULL
      `);
  }
}




