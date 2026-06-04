import { z } from 'zod';

// ─── POST /advisors/invite ────────────────────────────────────────────────────
export const inviteAdvisorSchema = z.object({
  email: z.string().email(),
});

// ─── PUT /advisors/:advisorId/export-permission ───────────────────────────────
export const toggleExportPermissionSchema = z.object({
  can_export: z.boolean(),
});

// ─── GET /audit-log — cursor pagination via query params ─────────────────────
export const auditLogQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export type InviteAdvisorDto          = z.infer<typeof inviteAdvisorSchema>;
export type ToggleExportPermissionDto = z.infer<typeof toggleExportPermissionSchema>;
export type AuditLogQueryDto          = z.infer<typeof auditLogQuerySchema>;




