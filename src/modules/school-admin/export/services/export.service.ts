import fs   from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExportRepository }     from '../repositories/export.repository';
import { processExportJob }     from '../utils/export.devProcressor';
import { ApiError }             from '../../../../shared/errors/ApiError';
import {
  TriggerExportInput,
  TriggerExportResult,
  ListExportsQuery,
  ListExportsResult,
  ExportJobSummary,
  DownloadExportResult,
} from '../interfaces/export.interface';

const repo = new ExportRepository();

const EXPORT_DIR   = process.env.EXPORT_DIR    ?? './tmp/exports';
const APP_BASE_URL = process.env.APP_BASE_URL  ?? 'http://localhost:3000';

// ─── #31 POST /v1/school-admin/exports ────────────────────────────────────────
// Trigger an async export job.

export const triggerExport = async (
  body:    TriggerExportInput,
  context: { admin_id: number; school_id: number; ip_address: string; device_info: string },
): Promise<TriggerExportResult> => {
  const export_id = uuidv4();

  await repo.createExportJob({
    export_id,
    school_id: context.school_id,
    admin_id:  context.admin_id,
    scope:     body.scope,
    format:    body.format,
    filters:   body.filters ?? {},
  });

  // Audit — EXPORT_REQUESTED
  await repo.writeAuditLog({
    event_type:  'EXPORT_REQUESTED',
    admin_id:    context.admin_id,
    school_id:   context.school_id,
    description: `Export requested: scope=${body.scope}, format=${body.format}`,
    ip_address:  context.ip_address,
    device_info: context.device_info,
  });

  // Kick off processing after the response is sent.
  // DEV:  setImmediate → in-process CSV generator (export.dev.processor.ts)
  // PROD: Replace with `await exportQueue.add('process-export', { export_id, scope, filters })`
  setImmediate(() => {
    processExportJob({
      export_id,
      scope:   body.scope,
      filters: body.filters ?? {},
      school_id: context.school_id,
    });
  });

  return {
    export_id,
    status:       'pending',
    scope:        body.scope,
    format:       body.format,
    requested_at: new Date().toISOString(),
    message:      `Export job queued. Poll GET /v1/school-admin/exports/${export_id} to track status.`,
  };
};

// ─── #32 GET /v1/school-admin/exports ─────────────────────────────────────────
// List past export jobs with cursor-based pagination.

export const listExports = async (
  query:   ListExportsQuery,
  context: { school_id: number },
): Promise<ListExportsResult> => {
  const limit = Math.min(query.limit ?? 20, 100);

  // Fetch one extra row to detect has_more
  const rows = await repo.listExportsBySchool(context.school_id, {
    status: query.status,
    limit:  limit + 1,
    cursor: query.cursor,
  });

  const has_more   = rows.length > limit;
  const pageRows   = has_more ? rows.slice(0, limit) : rows;
  const nextCursor = has_more ? pageRows[pageRows.length - 1].export_id : null;

  const exports: ExportJobSummary[] = pageRows.map((row) => ({
    export_id:       row.export_id,
    status:          row.status,
    scope:           row.scope,
    format:          row.format,
    requested_at:    row.requested_at.toISOString(),
    completed_at:    row.completed_at ? row.completed_at.toISOString() : null,
    row_count:       row.row_count,
    file_size_bytes: row.file_size_bytes,
  }));

  return {
    exports,
    pagination: {
      limit,
      next_cursor: nextCursor,
      has_more,
    },
  };
};

// ─── #33 GET /v1/school-admin/exports/:exportId/download ──────────────────────
// Stream the completed export file (DEV) or return signed Azure Blob SAS URL (PROD).

export const getExportDownload = async (
  exportId: string,
  context:  { admin_id: number; school_id: number; ip_address: string; device_info: string },
): Promise<DownloadExportResult> => {
  const job = await repo.findExportById(exportId, context.school_id);

  if (!job) {
    throw ApiError.notFound('EXPORT_NOT_FOUND', 'Export job not found or does not belong to your school.');
  }

  if (job.status === 'pending' || job.status === 'processing') {
    throw ApiError.conflict('EXPORT_NOT_READY', 'Export is still being processed. Please try again shortly.');
  }

  if (job.status === 'failed') {
    throw ApiError.badRequest('EXPORT_FAILED', 'This export job failed during processing and cannot be downloaded.');
  }

  // status === 'completed' at this point
  const fileName = `${exportId}.csv`;
  const filePath = path.join(EXPORT_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('EXPORT_FILE_MISSING', 'Export file no longer exists on disk. Please re-trigger the export.');
  }

  // Audit — EXPORT_DOWNLOADED
  await repo.writeAuditLog({
    event_type:  'EXPORT_DOWNLOADED',
    admin_id:    context.admin_id,
    school_id:   context.school_id,
    description: `Export downloaded: export_id=${exportId}, scope=${job.scope}`,
    ip_address:  context.ip_address,
    device_info: context.device_info,
  });

  return { filePath, fileName };
};




