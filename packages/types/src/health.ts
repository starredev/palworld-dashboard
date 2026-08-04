import { z } from 'zod'

/** Health/status payload returned by `GET /health`. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  uptime: z.number().describe('Process uptime in seconds'),
  timestamp: z.string().datetime(),
})

export type HealthResponse = z.infer<typeof healthResponseSchema>
