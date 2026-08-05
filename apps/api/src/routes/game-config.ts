import type { FastifyInstance } from 'fastify'
import { gameConfigUpdateSchema, type GameConfig } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { isConfigAvailable, readConfigFile, writeConfigFile } from '../services/game-config'
import { applyIniAndRestart } from '../services/config-apply'

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

  /**
   * Write the ini AND restart so the change actually takes effect.
   *
   * A running Palworld server rewrites PalWorldSettings.ini from memory on a
   * graceful shutdown, which silently reverts panel edits. So the only order
   * that survives is: save the world → write the ini → *force*-stop (no graceful
   * save, no rewrite) → let the container's restart policy read the new file.
   */
  app.post('/server/config/apply', { preHandler: authenticate }, async (req, reply) => {
    if (!isConfigAvailable()) {
      return reply.status(503).send({ message: 'PalWorldSettings.ini is not mounted' })
    }
    const parsed = gameConfigUpdateSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ message: 'A config body is required' })

    try {
      const { path, restarted } = await applyIniAndRestart(
        app,
        parsed.data.body,
        'Server restarting to apply new settings…',
      )
      return { ok: true, path, restarted }
    } catch (error) {
      reply.log.error(error)
      return reply.status(500).send({ message: 'Failed to write config' })
    }
  })
}
