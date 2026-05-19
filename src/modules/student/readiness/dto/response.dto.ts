export type ReadinessBandEnum = "foundational" | "developing" | "competitive" | "strongly_competitive" | "exceptional";
export type CategoryStatusEnum = "needs_attention" | "developing" | "on_track" | "strong";

export interface CategoryStatusesDto {
  academics: CategoryStatusEnum;
  extracurriculars: CategoryStatusEnum;
  essay: CategoryStatusEnum | null;
  awards: CategoryStatusEnum;
  service: CategoryStatusEnum;
}

export interface ReadinessPublicResponseDto {
  readiness_band: ReadinessBandEnum;
  band_description: string;
  on_track_status: "on_track" | "ahead" | null;
  grade_aware_message: string;
  category_statuses: CategoryStatusesDto;
  primary_limiter: string | null;
  primary_limiter_description: string | null;
  trend_direction: "improving" | "declining" | "stable" | null;
  last_calculated_at: string;
  profile_complete_enough: boolean;
}

export interface ReadinessHistoryItemDto {
  snapshot_term: string;
  grade_at_snapshot: number;
  readiness_band: ReadinessBandEnum;
  academics_band: ReadinessBandEnum;
  ec_band: ReadinessBandEnum;
  essay_band: ReadinessBandEnum | null;
  awards_band: ReadinessBandEnum;
  service_band: ReadinessBandEnum;
  trend_direction: "improving" | "declining" | "stable" | null;
  primary_limiter: string | null;
  snapshot_at: string;
}

export interface ReadinessHistoryResponseDto {
  data: ReadinessHistoryItemDto[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ImprovementRecommendationsResponseDto {
  primary_focus: string;
  primary_action: string;
  secondary_actions: string[];
  band_transition_guidance: string;
  next_band: ReadinessBandEnum | null;
  grade_specific_tips: string[];
}

export interface RecalculateResponseDto {
  recalculation_queued: boolean;
  queued_at: string;
}
