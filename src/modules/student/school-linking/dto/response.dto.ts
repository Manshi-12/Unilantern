export type SchoolType = "public" | "private" | "charter";

export interface SchoolSearchResultDto {
  school_id: number;
  school_name: string;
  city: string | null;
  state: string | null;
  school_type: SchoolType | null;
  email_domain: string | null;
}

export interface MergeCandidateDto {
  student_id: number;
  full_name: string;
  graduation_year: number | null;
  high_school_name: string | null;
}

export interface LinkSchoolResponseDto {
  link_status: "linked" | "conflict" | "pending_confirmation";
  account_status: "independent" | "school_linked";
  school_id: number | null;
  school_name: string | null;
  conflict_details: string | null;
  confirmation_required: boolean;
  merge_candidates: MergeCandidateDto[] | null;
}

export interface LinkedSchoolResponseDto {
  school_id: number;
  school_name: string;
  city: string | null;
  state: string | null;
  school_type: SchoolType | null;
  website_url: string | null;
  advisor_visibility_enabled: boolean;
}

export interface MergeConfirmResponseDto {
  merged: true;
  account_status: "school_linked";
  school_id: number;
  data_preserved: true;
}
