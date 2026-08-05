import type { FastifyInstance } from 'fastify'
import { restartScheduleSchema, type RestartScheduleState } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { computeNextRun, getSchedule, saveSchedule } from '../services/restart-schedule'

function withNextRun(schedule: ReturnType<typeof getSchedule>): RestartScheduleState {
  const next = computeNextRun(schedule, new Date())
  return { ...schedule, nextRun: next ? next.toISOString() : null }
}

/** Read/write the panel-configured daily ini-safe restart. */
export async function restartScheduleRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/server/restart-schedule',
    { preHandler: authenticate },
    async (): Promise<RestartScheduleState> => withNextRun(getSchedule()),
  )

  app.put('/server/restart-schedule', { preHandler: authenticate }, async (req, reply) => {
    const parsed = restartScheduleSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ message: parsed.error.issues[0]?.message ?? 'Invalid schedule' })
    }
    try {
      return withNextRun(saveSchedule(parsed.data))
    } catch (error) {
      reply.log.error(error)
      return reply.status(500).send({ message: 'Failed to persist the schedule' })
    }
  })
}
