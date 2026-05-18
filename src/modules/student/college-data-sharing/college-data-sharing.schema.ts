import { z } from "zod";

export const updateCollegeDataSharingSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();
