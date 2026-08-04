import { z } from 'zod'
import { palServerMetricsSchema, palStatusSchema, palPlayerSchema } from './palworld'

/** A notable server occurrence, shown in the activity feed and sent to Discord. */
export const serverEventSchema = z.object({
  id: z.string(),
  kind: z.enum(['join', 'leave', 'online', 'offline']),
  message: z.string(),
  at: z.string().datetime(),
})
export type ServerEvent = z.infer<typeof serverEventSchema>
export type ServerEventKind = ServerEvent['kind']

/**
 * Messages pushed from the API over the WebSocket. A discriminated union on
 * `type` so the client can narrow safely.
 */
export const realtimeMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), data: palStatusSchema }),
  z.object({ type: z.literal('metrics'), data: palServerMetricsSchema }),
  z.object({ type: z.literal('players'), data: z.array(palPlayerSchema) }),
  z.object({ type: z.literal('event'), data: serverEventSchema }),
])

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>
export type RealtimeMessageType = RealtimeMessage['type']
