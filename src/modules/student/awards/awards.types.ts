import type { AwardLevel, AwardFrequency } from "./dto/request.dto.js";

export interface AwardRecord {
  award_id: number;
  student_id: number;
  award_name: string;
  award_level: AwardLevel;
  frequency: AwardFrequency;
  annual_since_grade: number | null;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAwardData {
  student_id: number;
  award_name: string;
  award_level: string;
  frequency: string;
  annual_since_grade: number | null;
  display_order: number;
}

export interface UpdateAwardData {
  award_name?: string;
  award_level?: string;
  frequency?: string;
  annual_since_grade?: number | null;
  display_order?: number;
}
