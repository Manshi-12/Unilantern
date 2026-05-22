export interface ExtracurricularListResponseDto {
  activities: ExtracurricularResponseDto[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ExtracurricularResponseDto {
  activity_id: string;
  activity_name: string;
  activity_type: 'club' | 'sport' | 'job' | 'family_responsibility' | 'project' | 'research' | 'other';
  years_involved: 'less_than_1' | '1' | '2' | '3' | '4_plus';
  involvement_level: 'explored' | 'consistent' | 'key_contributor' | 'leader_founder';
  activity_description: string;
  impact_text: string;
  impact_level: 'participation_only' | 'contributed' | 'measurable' | 'created_scaled';
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
