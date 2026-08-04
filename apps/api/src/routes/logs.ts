import type { FastifyInstance } from 'fastify'
import type { LogsResponse } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { isLogAvailable, tailLog } from '../services/logs'

export async function logRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { lines?: string } }>(
    '/logs',
    { preHandler: authenticate },
    async (req): Promise<LogsResponse> => {
      const requested = Number(req.query.lines)
      const lines = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 2000) : 500
      return { available: isLogAvailable(), lines: tailLog(lines) }
    },
  )
}
