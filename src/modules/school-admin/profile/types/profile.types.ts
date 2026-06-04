// ─── Admin profile ────────────────────────────────────────────────────────────
export interface AdminProfile {
    admin_id:   number;
    school_id:  number;
    full_name:  string;
    email:      string;
    admin_role: string;
    can_export: boolean;
    is_active:  boolean;
    created_at: string;
    updated_at: string;
  }
  
  // ─── Session row ──────────────────────────────────────────────────────────────
  export interface SessionRow {
    session_id:      number;
    admin_id:        number;
    ip_address:      string | null;
    device_info:     string | null;
    created_at:      string;
    expires_at:      string;
    invalidated_at:  string | null;
  }




