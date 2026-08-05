import type { FastifyInstance } from 'fastify'
import type { AuditResponse } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { listAudit } from '../services/audit'

/** The activity log — who did what. Readable by any signed-in user. */
export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/audit', { preHandler: authenticate }, async (request): Promise<AuditResponse> => {
    const raw = Number((request.query as { limit?: string }).limit)
    const limit = Math.min(Number.isFinite(raw) && raw > 0 ? raw : 200, 1000)
    return { entries: listAudit(limit) }
  })
}
