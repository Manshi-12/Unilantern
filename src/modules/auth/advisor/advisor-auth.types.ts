export interface InviteRecord {

  invite_id: number;

  school_id: number;

  invited_email: string;

  token: string;

  status:
    | "pending"
    | "accepted"
    | "expired";

  expires_at:
    Date | null;

  created_at:
    Date;
}

export interface AdvisorRecord {

  advisor_id: number;

  school_id: number;

  full_name: string;

  email: string;

  password_hash: string;

  contact_no:
    string | null;

  role: string;

  is_active: boolean;

  is_email_verified: boolean;

  created_at: Date;

  updated_at: Date;
}

export interface SchoolRecord {

  school_id: number;

  school_name: string;
}