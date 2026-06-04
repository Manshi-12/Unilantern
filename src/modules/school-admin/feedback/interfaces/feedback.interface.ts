// ── DB row ─────────────────────────────────────────────────────────────────────
export interface FeedbackRow {
    feedback_id:   number;
    admin_id:      number;
    school_id:     number | null;
    type:          string;
    message:       string;
    allow_contact: boolean;
    page_name:     string | null;
    app_version:   string | null;
    device_type:   string | null;
    status:        string;
    created_at:    string;
  }
  
  // ── #58 POST /v1/school-admin/feedback ────────────────────────────────────────
  export interface CreateFeedbackInput {
    admin_id:      number;
    school_id:     number;
    type:          string;
    message:       string;
    allow_contact: boolean;
    page_name:     string | null;
    app_version:   string | null;
    device_type:   string | null;
  }
  
  export interface CreateFeedbackResult {
    feedback_id: number;
    submitted:   true;
  }
  
  // ── Repository contract ────────────────────────────────────────────────────────
  export interface IFeedbackRepository {
    insertFeedback(data: CreateFeedbackInput): Promise<{ feedback_id: number }>;
  }




