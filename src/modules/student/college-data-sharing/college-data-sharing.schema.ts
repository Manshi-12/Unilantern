import { z } from "zod";

// ── PUT /students/me/college-data-sharing ────────────────────────────────────
export const updateCollegeDataSharingSchema = z.object({
  enabled: z.boolean(),
});
