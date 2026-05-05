import type { ScholarshipSort, ScholarshipType } from "./dto/request.dto.js";

export interface ScholarshipRecord {
  scholarship_id: number;
  scholarship_name: string;
  provider: string | null;
  college_id: number | null;
  eligibility_summary: string | null;
  deadline: Date | null;
  award_amount: string | null;
  application_link: string | null;
  scholarship_type: ScholarshipType | null;
  is_saved: boolean;
}

export interface ScholarshipListFilters {
  student_id: number;
  graduation_year: number | null;
  type?: ScholarshipType;
  college_id?: number;
  general_only: boolean;
  sort: ScholarshipSort;
  limit: number;
  cursor?: string;
}

export interface ScholarshipPage {
  scholarships: ScholarshipRecord[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface SavedScholarshipRecord {
  saved_scholarship_id: number;
  scholarship_id: number;
  student_id: number;
  saved_at: Date;
}
