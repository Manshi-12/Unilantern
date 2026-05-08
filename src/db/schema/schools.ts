export const SCHOOLS_TABLE = "schools";

export const schoolsColumns = {
  school_id: "school_id",
  school_name: "school_name",
  address: "address",
  city: "city",
  state: "state",
  school_type: "school_type",
  email_domain: "email_domain",
  school_status: "school_status",
  dashboard_enabled: "dashboard_enabled",
  website_url: "website_url",
  is_active: "is_active",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;
