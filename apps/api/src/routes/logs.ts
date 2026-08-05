import type { FastifyInstance } from 'fastify'
import type { LogsResponse } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { isLogAvailable, tailLog } from '../services/logs'
import { containerLogsAvailable, readContainerLogs } from '../services/container-logs'

export async function logRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { lines?: string } }>(
    '/logs',
    { preHandler: authenticate },
    async (req): Promise<LogsResponse> => {
      const requested = Number(req.query.lines)
      const lines = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 2000) : 500

      // Prefer `docker logs` when a container is configured (servers that log
      // only to stdout), falling back to a log file on disk.
      if (containerLogsAvailable()) {
        try {
          return { available: true, lines: await readContainerLogs(lines) }
        } catch (error) {
          req.log.error(error, 'reading container logs failed')
        }
      }
      return { available: isLogAvailable(), lines: tailLog(lines) }
    },
  )
}
