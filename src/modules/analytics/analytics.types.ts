import type { AnalyticsEventName, AnalyticsPlatform, AnalyticsTabName } from "./dto/request.dto.js";

export interface AnalyticsEventRecord {
  actor_id: number;
  actor_role: "student";
  school_id: number | null;
  event_name: AnalyticsEventName;
  tab_name: AnalyticsTabName | null;
  grade_level: number | null;
  platform: AnalyticsPlatform;
  session_id: string | null;
  properties: Record<string, unknown>;
}
