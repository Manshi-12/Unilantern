import { getPool, sql } from '../../../../database/db';
import { ExportStatus, ExportScope, ExportFormat } from '../types/export.types';
import { ExportJobRow, IExportRepository } from '../interfaces/export.interface';

/**
 * ExportRepository — all MSSQL queries for the exports module.
 *
 * Tables used:
 *   export_jobs        — export_id (UNIQUEIDENTIFIER), school_id, admin_id, scope,
 *                        format, status, filters (NVARCHAR MAX), row_count,
 *                        file_size_bytes, error_message, requested_at, completed_at
 *   admin_audit_logs   — shared audit table (same shape as auth module)
 */
export class ExportRepository implements IExportRepository {

  // ─── export_jobs ─────────────────────────────────────────────────────────

  async createExportJob(data: {
    export_id:  string;
    school_id:  number;
    admin_id:   number;
    scope:      ExportScope;
    format:     ExportFormat;
    filters:    Record<string, unknown>;
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('export_id',  sql.UniqueIdentifier, data.export_id)
      .input('school_id',  sql.Int,              data.school_id)
      .input('admin_id',   sql.Int,              data.admin_id)
      .input('scope',      sql.VarChar(100),     data.scope)
      .input('format',     sql.VarChar(20),      data.format)
      .input('filters',    sql.NVarChar(sql.MAX), JSON.stringify(data.filters))
      .query(`
        INSERT INTO export_jobs
          (export_id, school_id, admin_id, scope, format, status, filters, requested_at)
        VALUES
          (@export_id, @school_id, @admin_id, @scope, @format, 'pending', @filters, GETDATE())
      `);
  }

  async findExportById(export_id: string, school_id: number): Promise<ExportJobRow | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('export_id', sql.UniqueIdentifier, export_id)
      .input('school_id', sql.Int,              school_id)
      .query(`
        SELECT TOP 1
          export_id, school_id, admin_id, scope, format, status,
          filters, row_count, file_size_bytes, error_message,
          requested_at, completed_at
        FROM export_jobs
        WHERE export_id = @export_id
          AND school_id = @school_id
      `);
    if (!result.recordset[0]) return null;
    return this._mapRow(result.recordset[0]);
  }

  async listExportsBySchool(
    school_id: number,
    opts: { status?: ExportStatus; limit: number; cursor?: string },
  ): Promise<ExportJobRow[]> {
    const pool    = await getPool();
    const request = pool.request()
      .input('school_id', sql.Int, school_id)
      .input('limit',     sql.Int, opts.limit + 1); // fetch one extra to determine has_more

    let whereClause = 'WHERE ej.school_id = @school_id';

    if (opts.status) {
      request.input('status', sql.VarChar(20), opts.status);
      whereClause += ' AND ej.status = @status';
    }

    if (opts.cursor) {
      // Cursor is the requested_at of the last seen row — keyset pagination
      // We fetch the requested_at of the cursor export_id first, then use it
      request.input('cursor_id', sql.UniqueIdentifier, opts.cursor);
      whereClause += `
        AND ej.requested_at < (
          SELECT TOP 1 requested_at FROM export_jobs
          WHERE export_id = @cursor_id AND school_id = @school_id
        )
      `;
    }

    const result = await request.query(`
      SELECT TOP (@limit)
        ej.export_id, ej.school_id, ej.admin_id, ej.scope, ej.format, ej.status,
        ej.filters, ej.row_count, ej.file_size_bytes, ej.error_message,
        ej.requested_at, ej.completed_at
      FROM export_jobs ej
      ${whereClause}
      ORDER BY ej.requested_at DESC
    `);

    return result.recordset.map(this._mapRow);
  }

  async markProcessing(export_id: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('export_id', sql.UniqueIdentifier, export_id)
      .query(`
        UPDATE export_jobs
        SET status = 'processing'
        WHERE export_id = @export_id
      `);
  }

  async markCompleted(data: {
    export_id:       string;
    row_count:       number;
    file_size_bytes: number;
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('export_id',       sql.UniqueIdentifier, data.export_id)
      .input('row_count',       sql.Int,              data.row_count)
      .input('file_size_bytes', sql.Int,              data.file_size_bytes)
      .query(`
        UPDATE export_jobs
        SET status          = 'completed',
            row_count       = @row_count,
            file_size_bytes = @file_size_bytes,
            completed_at    = GETDATE()
        WHERE export_id = @export_id
      `);
  }

  async markFailed(export_id: string, error_message: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('export_id',     sql.UniqueIdentifier, export_id)
      .input('error_message', sql.NVarChar(1000),   error_message)
      .query(`
        UPDATE export_jobs
        SET status        = 'failed',
            error_message = @error_message,
            completed_at  = GETDATE()
        WHERE export_id = @export_id
      `);
  }

  // ─── admin_audit_logs ────────────────────────────────────────────────────

  async writeAuditLog(data: {
    event_type:  string;
    admin_id:    number;
    school_id:   number;
    description: string;
    ip_address:  string;
    device_info: string;
  }): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('actor_admin_id',  sql.Int,              data.admin_id)
      .input('actor_role',      sql.VarChar(50),       'school_admin')
      .input('school_id',       sql.Int,               data.school_id)
      .input('action_type',     sql.VarChar(100),      data.event_type)
      .input('target_resource', sql.VarChar(255),      'export_jobs')
      .input('metadata',        sql.NVarChar(sql.MAX), JSON.stringify({
        description: data.description,
        ip_address:  data.ip_address,
        device_info: data.device_info,
      }))
      .query(`
        INSERT INTO admin_audit_logs
          (actor_admin_id, actor_role, school_id, action_type, target_resource, actioned_at, metadata)
        VALUES
          (@actor_admin_id, @actor_role, @school_id, @action_type, @target_resource, GETDATE(), @metadata)
      `);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _mapRow(row: any): ExportJobRow {
    return {
      export_id:       row.export_id,
      school_id:       row.school_id,
      admin_id:        row.admin_id,
      scope:           row.scope,
      format:          row.format,
      status:          row.status,
      filters:         row.filters,
      row_count:       row.row_count   ?? null,
      file_size_bytes: row.file_size_bytes ?? null,
      error_message:   row.error_message  ?? null,
      requested_at:    row.requested_at,
      completed_at:    row.completed_at   ?? null,
    };
  }
}




