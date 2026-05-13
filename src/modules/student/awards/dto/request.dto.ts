export type AwardLevel = "school" | "district" | "state" | "national";
export type AwardFrequency = "one_time" | "multiple_years" | "annual_since";

export interface CreateAwardRequestDto {
  award_name: string;
  award_level: AwardLevel;
  frequency: AwardFrequency;
  annual_since_grade?: number | null;
  display_order?: number;
}

export interface UpdateAwardRequestDto {
  award_name?: string;
  award_level?: AwardLevel;
  frequency?: AwardFrequency;
  annual_since_grade?: number | null;
  display_order?: number;
}
