import { z } from 'zod'

/** High-level state of the managed Palworld game server. */
export const serverStateSchema = z.enum(['online', 'offline', 'starting', 'stopping', 'unknown'])
export type ServerState = z.infer<typeof serverStateSchema>

/** Summary snapshot shown on the dashboard overview. */
export const serverSummarySchema = z.object({
  name: z.string(),
  state: serverStateSchema,
  version: z.string().nullable(),
  players: z.object({
    online: z.number().int().nonnegative(),
    max: z.number().int().positive(),
  }),
})

export type ServerSummary = z.infer<typeof serverSummarySchema>
