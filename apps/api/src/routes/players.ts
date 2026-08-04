import type { FastifyInstance } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
import type { PlayersResponse } from '@tsuki/types'
import { authenticate } from '../plugins/auth'

export async function playerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/players', { preHandler: authenticate }, async (_req, reply) => {
    try {
      return await app.palworld.getPlayers()
    } catch (error) {
      if (error instanceof PalworldNotConfiguredError) {
        return reply.status(503).send({ message: 'No Palworld server configured' })
      }
      reply.log.error(error)
      return reply.status(502).send({ message: 'Palworld server unreachable' })
    }
  })

  app.post<{ Params: { userId: string } }>(
    '/players/:userId/kick',
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        return await app.palworld.kick(req.params.userId)
      } catch (error) {
        if (error instanceof PalworldNotConfiguredError) {
          return reply.status(503).send({ message: 'No Palworld server configured' })
        }
        reply.log.error(error)
        return reply.status(502).send({ message: 'Action failed' })
      }
    },
  )
}

export type { PlayersResponse }
