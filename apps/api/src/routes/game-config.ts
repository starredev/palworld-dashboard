import type { FastifyInstance } from 'fastify'
import { gameConfigUpdateSchema, type GameConfig } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { isConfigAvailable, readConfigFile, writeConfigFile } from '../services/game-config'

/** Read/write the server's real PalWorldSettings.ini (when a volume is mounted). */
export async function gameConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/server/config', { preHandler: authenticate }, async (): Promise<GameConfig> => {
    return { available: isConfigAvailable(), content: readConfigFile() }
  })

  app.put('/server/config', { preHandler: authenticate }, async (req, reply) => {
    if (!isConfigAvailable()) {
      return reply.status(503).send({ message: 'PalWorldSettings.ini is not mounted' })
    }
    const parsed = gameConfigUpdateSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ message: 'A config body is required' })

    try {
      const path = writeConfigFile(parsed.data.body)
      return { ok: true, path }
    } catch (error) {
      reply.log.error(error)
      return reply.status(500).send({ message: 'Failed to write config' })
    }
  })
}
