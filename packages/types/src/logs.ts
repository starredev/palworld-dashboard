import { z } from 'zod'

export const logsResponseSchema = z.object({
  available: z.boolean(),
  lines: z.array(z.string()),
})
export type LogsResponse = z.infer<typeof logsResponseSchema>
