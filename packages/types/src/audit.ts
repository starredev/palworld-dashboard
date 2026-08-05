import { z } from 'zod'

/** One recorded admin action — who did what, and when. */
export const auditEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  /** Session id of the actor, or 'system' for scheduled actions. */
  actorId: z.string(),
  actorName: z.string(),
  /** Stable slug for the action, e.g. "config.apply". */
  action: z.string(),
  /** Human-readable one-liner shown in the activity feed. */
  summary: z.string(),
})
export type AuditEntry = z.infer<typeof auditEntrySchema>

export const auditResponseSchema = z.object({
  entries: z.array(auditEntrySchema),
})
export type AuditResponse = z.infer<typeof auditResponseSchema>
