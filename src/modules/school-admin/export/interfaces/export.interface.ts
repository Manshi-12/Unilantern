import { ExportScope, ExportFormat, ExportStatus } from '../types/export.types';

// ── DB row shape ─────────────────────────────────────────────────────────────

export interface ExportJobRow {
  export_id:       string;           // UUID
  school_id:       number;
  admin_id:        number;
  scope:           ExportScope;
  format:          ExportFormat;
  status:          ExportStatus;
  filters:         string;           // JSON blob stored as NVARCHAR(MAX)
  row_count:       number | null;
  file_size_bytes: number | null;
  error_message:   string | null;
  requested_at:    Date;
  completed_at:    Date | null;
}

// ── Service inputs / results ─────────────────────────────────────────────────

export interface TriggerExportInput {
  scope:   ExportScope;
  format:  ExportFormat;
  filters: Record<string, unknown>;
}

export interface TriggerExportResult {
  export_id:    string;
  status:       'pending';
  scope:        ExportScope;
  format:       ExportFormat;
  requested_at: string;   // ISO 8601
  message:      string;
}

export interface ListExportsQuery {
  status?: ExportStatus;
  limit?:  number;
  cursor?: string;        // export_id from last page
}

export interface ExportJobSummary {
  export_id:       string;
  status:          ExportStatus;
  scope:           ExportScope;
  format:          ExportFormat;
  requested_at:    string;
  completed_at:    string | null;
  row_count:       number | null;
  file_size_bytes: number | null;
}

export interface ListExportsResult {
  exports:    ExportJobSummary[];
  pagination: {
    limit:       number;
    next_cursor: string | null;
    has_more:    boolean;
  };
}

export interface DownloadExportResult {
  // DEV: caller streams CSV file directly
  // PROD: return signed Azure Blob SAS URL
  filePath: string;           // used in DEV processor
  fileName: string;
}

// ── Repository contract ──────────────────────────────────────────────────────

export interface IExportRepository {
  createExportJob(data: {
    export_id:  string;
    school_id:  number;
    admin_id:   number;
    scope:      ExportScope;
    format:     ExportFormat;
    filters:    Record<string, unknown>;
  }): Promise<void>;

  findExportById(export_id: string, school_id: number): Promise<ExportJobRow | null>;

  listExportsBySchool(
    school_id: number,
    opts: { status?: ExportStatus; limit: number; cursor?: string },
  ): Promise<ExportJobRow[]>;

  markProcessing(export_id: string): Promise<void>;

  markCompleted(data: {
    export_id:       string;
    row_count:       number;
    file_size_bytes: number;
  }): Promise<void>;

  markFailed(export_id: string, error_message: string): Promise<void>;

  writeAuditLog(data: {
    event_type:      string;
    admin_id:        number;
    school_id:       number;
    description:     string;
    ip_address:      string;
    device_info:     string;
  }): Promise<void>;
}




