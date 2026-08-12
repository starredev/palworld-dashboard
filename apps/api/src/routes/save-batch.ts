import type { FastifyInstance } from 'fastify'
import { saveOpInputSchema, type SaveBatch, type SessionUser } from '@tsuki/types'
import { authenticate, requireAdmin } from '../plugins/auth'
import { isSaveEditAvailable } from '../services/save-edit'
import { addOp, applyBatch, clearOps, listOps, removeOp } from '../services/save-batch'

/** Queue several save edits, then apply them all with a single server restart. */
export async function saveBatchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/save/batch', { preHandler: authenticate }, async (): Promise<SaveBatch> => {
    return { ops: listOps() }
  })

  app.post('/save/batch', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = saveOpInputSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ message: 'Invalid edit' })
    // Stamp who queued the edit — shown in the batch bar and the audit trail.
    const user = req.user as SessionUser | undefined
    return addOp(parsed.data, user?.name ?? null)
  })

  app.delete<{ Params: { id: string } }>(
    '/save/batch/:id',
    { preHandler: requireAdmin },
    async (req) => {
      removeOp(req.params.id)
      return { ok: true }
    },
  )

  app.delete('/save/batch', { preHandler: requireAdmin }, async () => {
    clearOps()
    return { ok: true }
  })

  app.post('/save/batch/apply', { preHandler: requireAdmin }, async (_req, reply) => {
    if (!isSaveEditAvailable()) {
      return reply.status(503).send({ message: 'Save editing is not available' })
    }
    try {
      return await applyBatch(app)
    } catch (error) {
      reply.log.error(error)
      return reply.status(500).send({ message: (error as Error).message })
    }
  })
}
