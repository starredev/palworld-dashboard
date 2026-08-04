import type { FastifyInstance } from 'fastify'
import type { MetricsHistoryResponse } from '@tsuki/types'
import { authenticate } from '../plugins/auth'

/** In-memory metrics history for the Insights charts. */
export async function historyRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/metrics/history',
    { preHandler: authenticate },
    async (): Promise<MetricsHistoryResponse> => {
      return { samples: app.realtime.getHistory() }
    },
  )
}
