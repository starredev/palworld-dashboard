import { z } from 'zod'

/** A single point in the metrics history. */
export const metricsSampleSchema = z.object({
  t: z.number().describe('Unix ms timestamp'),
  fps: z.number().nullable(),
  players: z.number().int().nonnegative(),
})
export type MetricsSample = z.infer<typeof metricsSampleSchema>

export const metricsHistoryResponseSchema = z.object({
  samples: z.array(metricsSampleSchema),
})
export type MetricsHistoryResponse = z.infer<typeof metricsHistoryResponseSchema>
