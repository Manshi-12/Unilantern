import type { ScholarshipType } from "./request.dto.js";

export interface ScholarshipPublicResponseDto {
  scholarship_id: number;
  scholarship_name: string;
  provider: string | null;
  college_id: number | null;
  eligibility_summary: string | null;
  deadline: string | null;
  award_amount: string | null;
  application_link: string | null;
  scholarship_type: ScholarshipType | null;
  is_saved: boolean;
  is_flagged_by_advisor: boolean;
}

export interface ScholarshipListResponseDto {
  data: ScholarshipPublicResponseDto[];
  next_cursor: string | null;
  has_more: boolean;
  total: number;
}

export interface SavedScholarshipPublicResponseDto extends ScholarshipPublicResponseDto {
  saved_scholarship_id: number;
  saved_at: string;
}

export interface SavedScholarshipListResponseDto {
  data: SavedScholarshipPublicResponseDto[];
  total: number;
}

export interface FlaggedScholarshipPublicResponseDto extends ScholarshipPublicResponseDto {
  flag_id: number;
  advisor_id: number;
  note: string | null;
  flagged_at: string;
}

export interface FlaggedScholarshipListResponseDto {
  data: FlaggedScholarshipPublicResponseDto[];
  total: number;
}

export interface SaveScholarshipResponseDto {
  saved_scholarship_id: number;
  scholarship_id: number;
  saved_at: string;
}

export interface UnsaveScholarshipResponseDto {
  deleted: true;
}
