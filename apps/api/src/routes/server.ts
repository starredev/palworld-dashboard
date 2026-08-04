import type { FastifyInstance, FastifyReply } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
import type { PalServerInfo, PalServerMetrics, PalStatus } from '@tsuki/types'
import { authenticate } from '../plugins/auth'

/** Map SDK errors to sensible HTTP responses. */
async function guarded<T>(reply: FastifyReply, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof PalworldNotConfiguredError) {
      await reply.status(503).send({ message: 'No Palworld server configured' })
    } else {
      reply.log.error(error)
      await reply.status(502).send({ message: 'Palworld server unreachable' })
    }
    return undefined
  }
}

export async function serverRoutes(app: FastifyInstance): Promise<void> {
  app.get('/server/status', { preHandler: authenticate }, async (): Promise<PalStatus> => {
    return app.palworld.getStatus()
  })

  app.get('/server/info', { preHandler: authenticate }, async (_req, reply) => {
    return guarded<PalServerInfo>(reply, () => app.palworld.getInfo())
  })

  app.get('/server/metrics', { preHandler: authenticate }, async (_req, reply) => {
    return guarded<PalServerMetrics>(reply, () => app.palworld.getMetrics())
  })
}
