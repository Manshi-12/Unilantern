export interface ExtracurricularListResponseDto {
  activities: ExtracurricularResponseDto[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ExtracurricularResponseDto {
  activity_id: string;
  activity_name: string;
  activity_type: 'club' | 'sport' | 'job' | 'family' | 'project' | 'research' | 'other';
  years_involved: 'less_than_1' | '1' | '2' | '3' | '4_plus';
  involvement_level: 'explored' | 'consistent' | 'key_contributor' | 'leader_founder';
  activity_description: string;
  impact_text: string;
  impact_level: 'participation_only' | 'contributed' | 'measurable' | 'created_scaled';
  hours_per_week: 'under_2' | '2_to_5' | '6_to_10' | '11_to_20' | '20_plus';
  experience_duration_weeks: number | null;
  selective_acceptance_toggle: boolean;
  external_org_toggle: boolean;
  travel_or_residency_toggle: boolean;
  people_impacted: number;
  funds_raised: number;
  users_acquired: number;
  hours_delivered: number;
  competition_top_10_pct_toggle: boolean;
  finalist_or_winner_toggle: boolean;
  publication_or_presented_toggle: boolean;
  policy_or_partnership_toggle: boolean;
  structured_deliverable_toggle: boolean;
  language_or_skill_cert_toggle: boolean;
  formal_selection_toggle: boolean;
  documented_real_world_output: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExtracurricularCreateResponseDto {
  activity_id: string;
  display_order: number;
  score_recalc_queued: boolean;
  created_at: string;
}

export interface ExtracurricularUpdateResponseDto {
  activity_id: string;
  updated_fields: string[];
  score_recalc_queued: boolean;
  updated_at: string;
}

export interface ExtracurricularReorderResponseDto {
  updated_count: number;
  score_recalc_queued: boolean;
}
