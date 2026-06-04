import { getPool, sql } from '../../../../database/db';

/**
 * AuthRepository — all MSSQL queries for the auth module.
 *
 * Tables used (owned by this module):
 *   school_admins            — admin_id, school_id, full_name, email, password_hash,
 *                              admin_role, can_export, is_active, created_at, updated_at
 *   email_verification_tokens — token_id, email, full_name, token, school_id, status, expires_at, created_at
 *   admin_sessions           — session_id, admin_id, token_hash, ip_address, device_info,
 *                              created_at, expires_at, invalidated_at
 *   admin_audit_logs         — log_id, actor_admin_id, actor_role, school_id, action_type,
 *                              target_resource, actioned_at, metadata
 *
 * Tables read/written (schools):
 *   schools                  — school_id, school_name, address, school_type, state, city,
 *                              email_domain, registration_status, dashboard_enabled,
 *                              created_at, updated_at
 */
export class AuthRepository {

  // ─── Schools ───────────────────────────────────────────────────────────────

  async findSchoolByDomain(email_domain: string): Promise<{
    school_id: number;
    school_name: string;
    email_domain: string;
    registration_status: string;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('email_domain', sql.VarChar(255), email_domain)
      .query(`
        SELECT TOP 1 school_id, school_name, email_domain, registration_status
        FROM schools
        WHERE email_domain = @email_domain
      `);
    return result.recordset[0] ?? null;
  }

  async findSchoolById(school_id: number): Promise<{
    school_id: number;
    school_name: string;
    email_domain: string;
    registration_status: string;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1 school_id, school_name, email_domain, registration_status
        FROM schools
        WHERE school_id = @school_id
      `);
    return result.recordset[0] ?? null;
  }

  async createSchool(data: {
    school_name: string;
    address: string;
    school_type: string;
    state: string;
    city: string;
    email_domain: string;
  }): Promise<{
    school_id: number;
    school_name: string;
    registration_status: string;
  }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_name',  sql.NVarChar(300), data.school_name)
      .input('address',      sql.NVarChar(500), data.address)
      .input('school_type',  sql.VarChar(50),   data.school_type)
      .input('state',        sql.VarChar(100),  data.state)
      .input('city',         sql.NVarChar(150), data.city)
      .input('email_domain', sql.VarChar(255),  data.email_domain)
      .query(`
        INSERT INTO schools (school_name, address, school_type, state, city, email_domain)
        OUTPUT INSERTED.school_id, INSERTED.school_name, INSERTED.registration_status
        VALUES (@school_name, @address, @school_type, @state, @city, @email_domain)
      `);
    return result.recordset[0];
  }

  async activateSchool(school_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        UPDATE schools
        SET registration_status = 'active',
            updated_at          = GETDATE()
        WHERE school_id = @school_id
      `);
  }

  // ─── Pending email lookup ──────────────────────────────────────────────────

  async findPendingEmailBySchoolId(school_id: number): Promise<{
    email: string;
    full_name: string;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1 email, full_name
        FROM email_verification_tokens
        WHERE school_id = @school_id
          AND status = 'used'
        ORDER BY created_at DESC
      `);
    return result.recordset[0] ?? null;
  }

  // ─── school_admins ─────────────────────────────────────────────────────────

  async findAdminByEmail(email: string): Promise<{
    admin_id: number;
    school_id: number;
    full_name: string;
    email: string;
    password_hash: string;
    admin_role: string;
    is_active: boolean;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.VarChar(255), email)
      .query(`
        SELECT TOP 1
          admin_id, school_id, full_name, email,
          password_hash, admin_role, is_active
        FROM school_admins
        WHERE email = @email
      `);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return { ...row, is_active: row.is_active === true || row.is_active === 1 };
  }

  async findAdminById(admin_id: number): Promise<{
    admin_id: number;
    school_id: number;
    full_name: string;
    email: string;
    password_hash: string;
    admin_role: string;
    is_active: boolean;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        SELECT TOP 1
          admin_id, school_id, full_name, email,
          password_hash, admin_role, is_active
        FROM school_admins
        WHERE admin_id = @admin_id
      `);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return { ...row, is_active: row.is_active === true || row.is_active === 1 };
  }

  async createAdmin(data: {
    school_id: number;
    full_name: string;
    email: string;
    password_hash: string;
    admin_role?: string;
  }): Promise<{ admin_id: number }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id',     sql.Int,         data.school_id)
      .input('full_name',     sql.VarChar(255), data.full_name)
      .input('email',         sql.VarChar(255), data.email)
      .input('password_hash', sql.VarChar(512), data.password_hash)
      .input('admin_role',    sql.VarChar(50),  data.admin_role ?? 'principal')
      .query(`
        INSERT INTO school_admins
          (school_id, full_name, email, password_hash, admin_role, can_export, is_active, created_at, updated_at)
        OUTPUT INSERTED.admin_id
        VALUES
          (@school_id, @full_name, @email, @password_hash, @admin_role, 0, 1, GETDATE(), GETDATE())
      `);
    return { admin_id: result.recordset[0].admin_id };
  }

  async updateAdminPassword(admin_id: number, new_hash: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('admin_id', sql.Int,         admin_id)
      .input('new_hash', sql.VarChar(512), new_hash)
      .query(`
        UPDATE school_admins
        SET password_hash = @new_hash,
            updated_at    = GETDATE()
        WHERE admin_id = @admin_id
      `);
  }

  async getAdminPasswordHash(admin_id: number): Promise<string | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        SELECT TOP 1 password_hash
        FROM school_admins
        WHERE admin_id = @admin_id
      `);
    return result.recordset[0]?.password_hash ?? null;
  }

  // ─── email_verification_tokens ─────────────────────────────────────────────

  async createEmailVerificationToken(data: {
    email: string;
    school_id: number;
    full_name: string;
    token: string;
    expires_at: Date;
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('email',      sql.VarChar(255),  data.email)
      .input('school_id',  sql.Int,           data.school_id)
      .input('full_name',  sql.NVarChar(200), data.full_name)
      .input('token',      sql.VarChar(512),  data.token)
      .input('expires_at', sql.DateTime,      data.expires_at)
      .query(`
        INSERT INTO email_verification_tokens
          (email, school_id, full_name, token, status, expires_at, created_at)
        VALUES
          (@email, @school_id, @full_name, @token, 'pending', @expires_at, GETDATE())
      `);
  }

  async findEmailVerificationToken(token: string): Promise<{
    token_id: number;
    email: string;
    school_id: number;
    status: string;
    expires_at: Date;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('token', sql.VarChar(512), token)
      .query(`
        SELECT TOP 1 token_id, email, school_id, status, expires_at
        FROM email_verification_tokens
        WHERE token = @token
      `);
    return result.recordset[0] ?? null;
  }

  async consumeEmailVerificationToken(token_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('token_id', sql.Int, token_id)
      .query(`
        UPDATE email_verification_tokens
        SET status = 'used'
        WHERE token_id = @token_id
      `);
  }

  // ─── password_reset_tokens ─────────────────────────────────────────────────

  async createPasswordResetToken(data: {
    email: string;
    school_id: number;
    token: string;
    expires_at: Date;
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('email',      sql.VarChar(255), data.email)
      .input('school_id',  sql.Int,          data.school_id)
      .input('token',      sql.VarChar(512), data.token)
      .input('expires_at', sql.DateTime,     data.expires_at)
      .query(`
        INSERT INTO email_verification_tokens
          (email, school_id, token, status, expires_at, created_at)
        VALUES
          (@email, @school_id, @token, 'pending', @expires_at, GETDATE())
      `);
  }

  async findPasswordResetToken(token: string): Promise<{
    token_id: number;
    email: string;
    school_id: number;
    status: string;
    expires_at: Date;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('token', sql.VarChar(512), token)
      .query(`
        SELECT TOP 1 token_id, email, school_id, status, expires_at
        FROM email_verification_tokens
        WHERE token  = @token
          AND status = 'pending'
      `);
    return result.recordset[0] ?? null;
  }

  async consumePasswordResetToken(token_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('token_id', sql.Int, token_id)
      .query(`
        UPDATE email_verification_tokens
        SET status = 'used'
        WHERE token_id = @token_id
      `);
  }

  // ─── admin_sessions ────────────────────────────────────────────────────────




  async createSession(data: {
    admin_id: number;
    token_hash: string;
    ip_address: string;
    device_info: string;
    expires_at: Date;
  }): Promise<{ session_id: number }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('admin_id',    sql.Int,          data.admin_id)
      .input('token_hash',  sql.VarChar(512), data.token_hash)
      .input('ip_address',  sql.VarChar(64),  data.ip_address)
      .input('device_info', sql.VarChar(255), data.device_info)
      .input('expires_at',  sql.DateTime,     data.expires_at)
      .query(`
        INSERT INTO admin_sessions
          (admin_id, token_hash, ip_address, device_info, created_at, expires_at)
        OUTPUT INSERTED.session_id
        VALUES
          (@admin_id, @token_hash, @ip_address, @device_info, GETDATE(), @expires_at)
      `);
    return { session_id: result.recordset[0].session_id };
  }

  async findSessionByTokenHash(token_hash: string): Promise<{
    session_id: number;
    admin_id: number;
    expires_at: Date;
    invalidated_at: Date | null;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('token_hash', sql.VarChar(512), token_hash)
      .query(`
        SELECT TOP 1 session_id, admin_id, expires_at, invalidated_at
        FROM admin_sessions
        WHERE token_hash = @token_hash
      `);
    return result.recordset[0] ?? null;
  }

  async invalidateSession(session_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('session_id', sql.Int, session_id)
      .query(`
        UPDATE admin_sessions
        SET invalidated_at = GETDATE()
        WHERE session_id = @session_id
      `);
  }

  async invalidateAllSessionsExceptCurrent(admin_id: number, current_session_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('admin_id',           sql.Int, admin_id)
      .input('current_session_id', sql.Int, current_session_id)
      .query(`
        UPDATE admin_sessions
        SET invalidated_at = GETDATE()
        WHERE admin_id       =  @admin_id
          AND session_id     != @current_session_id
          AND invalidated_at IS NULL
      `);
  }

  async invalidateAllSessions(admin_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('admin_id', sql.Int, admin_id)
      .query(`
        UPDATE admin_sessions
        SET invalidated_at = GETDATE()
        WHERE admin_id       = @admin_id
          AND invalidated_at IS NULL
      `);
  }

  async rotateSessionToken(session_id: number, new_token_hash: string, new_expires_at: Date): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('session_id',     sql.Int,          session_id)
      .input('new_token_hash', sql.VarChar(512), new_token_hash)
      .input('new_expires_at', sql.DateTime,     new_expires_at)
      .query(`
        UPDATE admin_sessions
        SET token_hash = @new_token_hash,
            expires_at = @new_expires_at
        WHERE session_id = @session_id
      `);
  }



  async consumeLatestPendingVerificationToken(email: string): Promise<void> {
    const pool = await getPool();
  
    await pool.request()
      .input('email', sql.VarChar(255), email)
      .query(`
        UPDATE email_verification_tokens
        SET status = 'used'
        WHERE token_id = (
          SELECT TOP 1 token_id
          FROM email_verification_tokens
          WHERE email = @email
            AND status = 'pending'
          ORDER BY created_at DESC
        )
      `);
  }

  // ─── admin_audit_logs ──────────────────────────────────────────────────────

  async writeAuditLog(data: {
    actor_admin_id: number | null;
    actor_role: string;
    school_id: number | null;
    action_type: string;
    target_resource: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('actor_admin_id',  sql.Int,               data.actor_admin_id)
      .input('actor_role',      sql.VarChar(50),        data.actor_role)
      .input('school_id',       sql.Int,                data.school_id)
      .input('action_type',     sql.VarChar(100),       data.action_type)
      .input('target_resource', sql.VarChar(255),       data.target_resource)
      .input('metadata',        sql.NVarChar(sql.MAX),  JSON.stringify(data.metadata))
      .query(`
        INSERT INTO admin_audit_logs
          (actor_admin_id, actor_role, school_id, action_type, target_resource, actioned_at, metadata)
        VALUES
          (@actor_admin_id, @actor_role, @school_id, @action_type, @target_resource, GETDATE(), @metadata)
      `);
  }
}





