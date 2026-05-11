import type { ServiceActionType, ServiceHoursRange } from "./dto/request.dto.js";

export interface ServiceEntryRecord {
  service_id: number;
  student_id: number;
  total_hours_range: ServiceHoursRange;
  action_type: ServiceActionType;
  is_leadership: boolean;
  duration_months: number | null;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateServiceData {
  student_id: number;
  total_hours_range: ServiceHoursRange;
  action_type: ServiceActionType;
  is_leadership: boolean;
  duration_months?: number;
}

export interface UpdateServiceData {
  total_hours_range?: ServiceHoursRange;
  action_type?: ServiceActionType;
  is_leadership?: boolean;
  duration_months?: number;
}
