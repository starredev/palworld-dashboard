import type { FastifyInstance } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
import { authenticate } from '../plugins/auth'
import { runCommand } from './commands'

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
    (req, reply) => runCommand(reply, () => app.palworld.kick(req.params.userId)),
  )

  app.post<{ Params: { userId: string } }>(
    '/players/:userId/ban',
    { preHandler: authenticate },
    (req, reply) => runCommand(reply, () => app.palworld.ban(req.params.userId)),
  )

  app.post<{ Params: { userId: string } }>(
    '/players/:userId/unban',
    { preHandler: authenticate },
    (req, reply) => runCommand(reply, () => app.palworld.unban(req.params.userId)),
  )
}
