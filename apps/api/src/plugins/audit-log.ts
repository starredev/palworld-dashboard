import type { FastifyInstance } from 'fastify'
import type { SessionUser } from '@tsuki/types'
import { describeAction, recordAudit } from '../services/audit'

/**
 * Record every successful mutating request (who did what) in one place, so we
 * don't have to sprinkle logging across route handlers. Scheduled/system
 * actions call recordAudit() directly instead.
 */
export async function registerAuditLog(app: FastifyInstance): Promise<void> {
  app.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode >= 400) return
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return

    const routeUrl = request.routeOptions?.url
    if (!routeUrl) return
    const described = describeAction(request.method, routeUrl)
    if (!described) return

    const user = request.user as SessionUser | undefined
    recordAudit({
      actorId: user?.id ?? 'unknown',
      actorName: user?.name ?? 'Unknown',
      action: described.action,
      summary: described.summary,
    })
  })
}
