export type ScholarshipType = "merit" | "need" | "athletic" | "demographic" | "major" | "other";
export type ScholarshipSort = "deadline_asc" | "deadline_desc" | "amount_desc";

export interface ScholarshipsFilterRequestDto {
  type?: ScholarshipType;
  college_id?: number;
  general_only?: boolean;
  sort: ScholarshipSort;
  limit: number;
  cursor?: string;
}

export interface SaveScholarshipRequestDto {
  scholarship_id: number;
}
