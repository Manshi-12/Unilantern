import type { ServiceActionType, ServiceHoursRange } from "./request.dto.js";

export interface ServiceEntryResponseDto {
  service_id: number;
  total_hours_range: ServiceHoursRange;
  action_type: ServiceActionType;
  is_leadership: boolean;
  duration_months: number | null;
  display_order: number;
  updated_at: string;
}

export interface ServiceListResponseDto {
  data: ServiceEntryResponseDto[];
}

export interface ServiceCreateResponseDto {
  service_id: number;
  score_recalc_queued: boolean;
  created_at: string;
}

export interface ServiceUpdateResponseDto {
  updated: true;
  score_recalc_queued: boolean;
}

export interface ServiceDeleteResponseDto {
  deleted: true;
  score_recalc_queued: boolean;
}
