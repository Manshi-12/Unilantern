export interface SchoolRecord {
  school_id: number;
  school_name: string;
  city: string | null;
  state: string | null;
  school_type: "public" | "private" | "charter" | null;
  email_domain: string | null;
  school_status: "trial" | "active" | "inactive";
  dashboard_enabled: boolean;
  website_url: string | null;
  is_active: boolean;
}

export interface StudentLinkRecord {
  student_id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  school_id: number | null;
  account_status: "independent" | "school_linked";
  graduation_year: number | null;
  high_school_name: string | null;
}
