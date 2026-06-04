import { getPool, sql }     from '../../../../database/db';
import {
  AdvisorRecord,
  ConsentCoverageRow,
  AuditLogRow,
} from '../types/governance.types';
import { IGovernanceRepository } from '../interfaces/governance.interface';

export class GovernanceRepository implements IGovernanceRepository {

  async listAdvisors(school_id: number): Promise<AdvisorRecord[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          aa.access_id, aa.advisor_user_id, aa.school_id,
          aa.status, aa.can_export, aa.invited_by,
          aa.last_invited_at, aa.invite_resent_count,
          aa.created_at, aa.revoked_at, aa.invited_email,
          sa.full_name, sa.email
        FROM advisor_access aa
        LEFT JOIN school_admins sa ON sa.admin_id = aa.advisor_user_id
        WHERE aa.school_id = @school_id
        ORDER BY aa.created_at DESC
      `);
    return result.recordset.map(row => ({
      ...row,
      can_export: row.can_export === true || row.can_export === 1,
    }));
  }

  async findExistingAccess(invited_email: string, school_id: number): Promise<{ access_id: number; status: string } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('invited_email', sql.VarChar(255), invited_email)
      .input('school_id',     sql.Int,          school_id)
      .query(`
        SELECT TOP 1 access_id, status
        FROM advisor_access
        WHERE invited_email = @invited_email AND school_id = @school_id
      `);
    return result.recordset[0] ?? null;
  }

  async insertAdvisorAccess(data: {
    invited_email:           string;
    school_id:               number;
    invited_by:              number;
    invite_token_hash:       string;
    invite_token_expires_at: Date;
  }): Promise<{ access_id: number }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('invited_email',           sql.VarChar(255), data.invited_email)
      .input('school_id',               sql.Int,          data.school_id)
      .input('invited_by',              sql.Int,          data.invited_by)
      .input('invite_token_hash',       sql.VarChar(64),  data.invite_token_hash)
      .input('invite_token_expires_at', sql.DateTime,     data.invite_token_expires_at)
      .query(`
        INSERT INTO advisor_access
          (advisor_user_id, invited_email, school_id, status, can_export,
           invited_by, last_invited_at, invite_resent_count, created_at,
           invite_token_hash, invite_token_expires_at)
        OUTPUT INSERTED.access_id
        VALUES (NULL, @invited_email, @school_id, 'pending', 0, @invited_by, GETDATE(), 0, GETDATE(),
                @invite_token_hash, @invite_token_expires_at)
      `);
    return { access_id: result.recordset[0].access_id };
  }

  async findAccessById(access_id: number, school_id: number): Promise<{
    access_id:           number;
    advisor_user_id:     number | null;
    status:              string;
    can_export:          boolean;
    invite_resent_count: number;
    invited_email:       string;
  } | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('access_id', sql.Int, access_id)
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1
          access_id, advisor_user_id, status,
          can_export, invite_resent_count, invited_email
        FROM advisor_access
        WHERE access_id = @access_id AND school_id = @school_id
      `);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return { ...row, can_export: row.can_export === true || row.can_export === 1 };
  }

  async checkAndIncrementDailyResend(access_id: number): Promise<void> {
    const pool = await getPool();
    const result = await pool.request()
      .input('access_id', sql.Int, access_id)
      .query(`
        SELECT daily_resend_count, daily_resend_date
        FROM advisor_access
        WHERE access_id = @access_id
      `);

    const row   = result.recordset[0];
    const today = new Date().toISOString().slice(0, 10);
    const isToday = row?.daily_resend_date
      ? new Date(row.daily_resend_date).toISOString().slice(0, 10) === today
      : false;
    const count = isToday ? row.daily_resend_count : 0;

    if (count >= 5) {
      const err: any = new Error('Maximum daily resend limit of 5 reached for this advisor.');
      err.statusCode = 429; err.code = 'ADVISOR_INVITE_DAILY_LIMIT';
      throw err;
    }

    await pool.request()
      .input('access_id', sql.Int,  access_id)
      .input('count',     sql.Int,  count + 1)
      .input('today',     sql.Date, new Date())
      .query(`
        UPDATE advisor_access
        SET daily_resend_count = @count,
            daily_resend_date  = @today
        WHERE access_id = @access_id
      `);
  }

  async updateResendInvite(
    access_id:               number,
    invite_token_hash:       string,
    invite_token_expires_at: Date,
  ): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('access_id',               sql.Int,         access_id)
      .input('invite_token_hash',       sql.VarChar(64), invite_token_hash)
      .input('invite_token_expires_at', sql.DateTime,    invite_token_expires_at)
      .query(`
        UPDATE advisor_access
        SET invite_resent_count     = invite_resent_count + 1,
            last_invited_at         = GETDATE(),
            invite_token_hash       = @invite_token_hash,
            invite_token_expires_at = @invite_token_expires_at
        WHERE access_id = @access_id
      `);
  }

  async revokeAccess(access_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('access_id', sql.Int, access_id)
      .query(`UPDATE advisor_access SET status = 'revoked', revoked_at = GETDATE() WHERE access_id = @access_id`);
  }

  async updateExportPermission(access_id: number, can_export: boolean): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('access_id',  sql.Int, access_id)
      .input('can_export', sql.Bit, can_export ? 1 : 0)
      .query(`UPDATE advisor_access SET can_export = @can_export WHERE access_id = @access_id`);
  }

  async getConsentCoverage(school_id: number): Promise<ConsentCoverageRow[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT coverage_id, school_id, consent_type,
               granted_count, revoked_count, pending_count, updated_at
        FROM school_consent_coverage
        WHERE school_id = @school_id
        ORDER BY consent_type ASC
      `);
    return result.recordset;
  }

  async getAuditLog(school_id: number, limit: number, cursor?: number): Promise<AuditLogRow[]> {
    const pool    = await getPool();
    const request = pool.request()
      .input('school_id', sql.Int, school_id)
      .input('limit',     sql.Int, limit + 1);

    if (cursor) request.input('cursor', sql.Int, cursor);

    const result = await request.query(`
      SELECT TOP (@limit)
        log_id, actor_admin_id, actor_role, school_id,
        action_type, target_resource, actioned_at, metadata
      FROM admin_audit_logs
      WHERE school_id = @school_id
        ${cursor ? 'AND log_id < @cursor' : ''}
      ORDER BY log_id DESC
    `);
    return result.recordset;
  }

  async getSchoolExportPolicy(school_id: number): Promise<{ admin_can_export: boolean; advisor_export_enabled: boolean }> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT
          MAX(CASE WHEN aa.invited_by = aa.advisor_user_id THEN aa.can_export ELSE 0 END)  AS admin_can_export,
          MAX(CASE WHEN aa.invited_by != aa.advisor_user_id THEN aa.can_export ELSE 0 END) AS advisor_export_enabled
        FROM advisor_access aa
        WHERE aa.school_id = @school_id AND aa.status = 'active'
      `);
    const row = result.recordset[0];
    return {
      admin_can_export:       row?.admin_can_export       === 1,
      advisor_export_enabled: row?.advisor_export_enabled === 1,
    };
  }
}




