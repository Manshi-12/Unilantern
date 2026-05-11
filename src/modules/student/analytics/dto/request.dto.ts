export type AnalyticsEventName = "bottom_tab_click" | "bottom_tab_default_view" | "screen_view";
export type AnalyticsTabName = "Profile" | "Search" | "Saved" | "Improve" | "Financial";
export type AnalyticsPlatform = "ios" | "android" | "web";

export interface AnalyticsEventDto {
  event_name: AnalyticsEventName;
  tab_name?: AnalyticsTabName;
  platform: AnalyticsPlatform;
  session_id?: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsEventBatchRequestDto {
  events: AnalyticsEventDto[];
}
