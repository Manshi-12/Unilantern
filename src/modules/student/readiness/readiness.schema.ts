import { z } from "zod";

export const getReadinessHistoryQuerySchema = z.object({
  limit: z
    .preprocess((val) => (val ? Number(val) : undefined), z.number().int().min(1).max(20))
    .default(8),
  cursor: z.string().optional(),
});

export type GetReadinessHistoryQuery = z.infer<typeof getReadinessHistoryQuerySchema>;
