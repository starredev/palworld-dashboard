import { z } from 'zod'

/** A player currently connected to the Palworld server. */
export const palPlayerSchema = z.object({
  name: z.string(),
  /** Palworld player id (hex). Null when the source can't provide it. */
  playerId: z.string().nullable(),
  /** Platform account id (Steam/Epic). */
  userId: z.string().nullable(),
  level: z.number().int().nonnegative().nullable(),
  ping: z.number().nonnegative().nullable(),
  location: z.object({ x: z.number(), y: z.number() }).nullable(),
})
export type PalPlayer = z.infer<typeof palPlayerSchema>

/** Static-ish information about the server. */
export const palServerInfoSchema = z.object({
  name: z.string(),
  version: z.string().nullable(),
  description: z.string().nullable(),
})
export type PalServerInfo = z.infer<typeof palServerInfoSchema>

/** Live runtime metrics. */
export const palServerMetricsSchema = z.object({
  fps: z.number().nullable(),
  frameTime: z.number().nullable(),
  players: z.number().int().nonnegative(),
  maxPlayers: z.number().int().positive().nullable(),
  uptime: z.number().nonnegative().nullable(),
  days: z.number().int().nonnegative().nullable(),
})
export type PalServerMetrics = z.infer<typeof palServerMetricsSchema>

/** Which backend the API used to answer, and whether it was reachable. */
export const palSourceSchema = z.enum(['rest', 'rcon', 'none'])
export type PalSource = z.infer<typeof palSourceSchema>

export const palStatusSchema = z.object({
  configured: z.boolean(),
  reachable: z.boolean(),
  source: palSourceSchema,
})
export type PalStatus = z.infer<typeof palStatusSchema>

export const playersResponseSchema = z.object({
  source: palSourceSchema,
  players: z.array(palPlayerSchema),
})
export type PlayersResponse = z.infer<typeof playersResponseSchema>
