import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
import { ApiResponse }  from '../../../../shared/responses/ApiResponse';
import * as ExportService from '../services/export.service';
import { ExportStatus } from '../types/export.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function getDeviceInfo(req: Request): string {
  const ua = req.headers['user-agent'];
  return Array.isArray(ua) ? ua[0] ?? 'unknown' : ua ?? 'unknown';
}

// ─── #31 POST /v1/school-admin/exports ────────────────────────────────────────

export const triggerExport = asyncHandler(async (req: Request, res: Response) => {
  const { adminId, school_id } = (req as any).jwtPayload;

  const data = await ExportService.triggerExport(req.body, {
    admin_id:    adminId,
    school_id:   school_id,
    ip_address:  getIp(req),
    device_info: getDeviceInfo(req),
  });

  ApiResponse.success(res, data, 202);
});

// ─── #32 GET /v1/school-admin/exports ─────────────────────────────────────────

export const listExports = asyncHandler(async (req: Request, res: Response) => {
  const { school_id } = (req as any).jwtPayload;

  const query = {
    status: typeof req.query.status === 'string' ? req.query.status as ExportStatus : undefined,
    limit:  typeof req.query.limit  === 'string' ? Number(req.query.limit)           : undefined,
    cursor: typeof req.query.cursor === 'string' ? req.query.cursor                  : undefined,
  };

  const data = await ExportService.listExports(query, { school_id: school_id });

  ApiResponse.success(res, data, 200);
});

// ─── #33 GET /v1/school-admin/exports/:exportId/download ──────────────────────

export const downloadExport = asyncHandler(async (req: Request, res: Response) => {
  const { adminId, school_id } = (req as any).jwtPayload;
  const exportId = req.params.exportId;

  const { filePath, fileName } = await ExportService.getExportDownload(String(exportId), {
    admin_id:    adminId,
    school_id:   school_id,
    ip_address:  getIp(req),
    device_info: getDeviceInfo(req),
  });

  // DEV: stream the local CSV file directly
  // PROD: replace with `res.json({ download_url: sasUrl, expires_in: 3600 })`
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.download(filePath, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({
        error: {
          code:    'DOWNLOAD_FAILED',
          message: 'Failed to stream export file.',
          details: {},
        },
      });
    }
  });
});




