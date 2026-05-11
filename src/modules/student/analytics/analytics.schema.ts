import { z } from "zod";

export const analyticsEventSchema = z.object({
  event_name: z.enum(["bottom_tab_click", "bottom_tab_default_view", "screen_view"]),
  tab_name: z.enum(["Profile", "Search", "Saved", "Improve", "Financial"]).optional(),
  platform: z.enum(["ios", "android", "web"]),
  session_id: z.string().trim().min(8).max(150).optional(),
  timestamp: z.string().datetime({ offset: true }),
  properties: z.record(z.string(), z.unknown()).optional().default({}),
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});
