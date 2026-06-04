// ─── Advisor row (joined advisor_access + school_admins) ──────────────────────
export interface AdvisorRecord {
    access_id:           number;
    advisor_user_id:     number | null;  // NULL until advisor self-registers
    school_id:           number;
    status:              'pending' | 'active' | 'revoked';
    can_export:          boolean;
    invited_by:          number;
    invited_email:       string;         // ← added
    last_invited_at:     string | null;
    invite_resent_count: number;
    created_at:          string;
    revoked_at:          string | null;
    full_name:           string | null;  // NULL until advisor self-registers
    email:               string | null;  // NULL until advisor self-registers
  }
  
  // ─── Consent coverage row ─────────────────────────────────────────────────────
  export interface ConsentCoverageRow {
    coverage_id:    number;
    school_id:      number;
    consent_type:   string;
    granted_count:  number;
    revoked_count:  number;
    pending_count:  number;
    updated_at:     string;
  }
  
  // ─── Audit log row ────────────────────────────────────────────────────────────
  export interface AuditLogRow {
    log_id:          number;
    actor_admin_id:  number | null;
    actor_role:      string;
    school_id:       number | null;
    action_type:     string;
    target_resource: string;
    actioned_at:     string;
    metadata:        string;
  }
  
  // ─── Paginated audit log response ─────────────────────────────────────────────
  export interface PaginatedAuditLog {
    data:        AuditLogRow[];
    next_cursor: number | null;
    has_more:    boolean;
  }
  
  // ─── Export permissions response ──────────────────────────────────────────────
  export interface ExportPermissionsResponse {
    school_id:          number;
    admin_can_export:   boolean;
    advisor_export_enabled: boolean;
  }




