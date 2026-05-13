import type { AwardLevel, AwardFrequency } from "./request.dto.js";

export interface AwardResponseDto {
  award_id: string;
  award_name: string;
  award_level: AwardLevel;
  frequency: AwardFrequency;
  annual_since_grade: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AwardsListResponseDto {
  awards: AwardResponseDto[];
  total: number;
}
