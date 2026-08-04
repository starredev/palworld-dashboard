import { z } from 'zod'
import { palServerMetricsSchema } from './palworld'
import { palStatusSchema } from './palworld'
import { palPlayerSchema } from './palworld'

/**
 * Messages pushed from the API over the WebSocket. A discriminated union on
 * `type` so the client can narrow safely.
 */
export const realtimeMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('status'), data: palStatusSchema }),
  z.object({ type: z.literal('metrics'), data: palServerMetricsSchema }),
  z.object({ type: z.literal('players'), data: z.array(palPlayerSchema) }),
])

export type RealtimeMessage = z.infer<typeof realtimeMessageSchema>
export type RealtimeMessageType = RealtimeMessage['type']
