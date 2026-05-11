export type ServiceHoursRange = "under_50" | "50_100" | "100_200" | "200_plus";
export type ServiceActionType = "direct_service" | "organizing" | "teaching" | "fundraising" | "independent";

export interface CreateServiceRequestDto {
  total_hours_range: ServiceHoursRange;
  action_type: ServiceActionType;
  is_leadership?: boolean;
  duration_months?: number;
}

export interface UpdateServiceRequestDto {
  total_hours_range?: ServiceHoursRange;
  action_type?: ServiceActionType;
  is_leadership?: boolean;
  duration_months?: number;
}
