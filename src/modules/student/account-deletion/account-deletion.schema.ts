import { z } from "zod";

// ── Step 1: DELETE /students/me/account — Initiate deletion ──────────────────
export const initiateDeletionSchema = z.object({
  confirm_deletion: z
    .boolean()
    .refine((v) => v === true, "confirm_deletion must be true"),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason must be 2000 characters or fewer")
    .optional(),
});

// ── Step 2: POST /students/me/account/confirm-deletion ───────────────────────
export const confirmDeletionSchema = z.object({
  confirmation_code: z
    .string()
    .regex(/^\d{6}$/, "Confirmation code must be a 6-digit numeric string"),
});

// ── Step 3: POST /students/me/account/reactivate ─────────────────────────────
export const reactivateAccountSchema = z.object({
  confirm_reactivation: z
    .boolean()
    .refine((v) => v === true, "confirm_reactivation must be true"),
});
