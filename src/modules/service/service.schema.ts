import { z } from "zod";

export const serviceCreateSchema = z.object({
  total_hours_range: z.enum(["under_50", "50_100", "100_200", "200_plus"]),
  action_type: z.enum(["direct_service", "organizing", "teaching", "fundraising", "independent"]),
  is_leadership: z.boolean().optional().default(false),
  duration_months: z.number().int().min(1).max(120).optional(),
});

export const serviceUpdateSchema = serviceCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);
