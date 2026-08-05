import type { FastifyInstance } from 'fastify'
import { PalworldNotConfiguredError } from '@tsuki/sdk'
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

    // Best-effort: warn players and persist the world before we cut it down.
    try {
      await app.palworld.announce('Server restarting to apply new settings…')
      await app.palworld.save()
    } catch (error) {
      reply.log.warn({ err: error }, 'pre-restart announce/save failed (continuing)')
    }

    let path: string
    try {
      path = writeConfigFile(parsed.data.body)
    } catch (error) {
      reply.log.error(error)
      return reply.status(500).send({ message: 'Failed to write config' })
    }

    // Force-stop last, after the file is on disk. NOT a graceful shutdown.
    try {
      await app.palworld.stop()
    } catch (error) {
      // No server configured at all — the file is written and applies on next boot.
      if (error instanceof PalworldNotConfiguredError) {
        return { ok: true, path, restarted: false }
      }
      // The REST/RCON connection commonly drops as the process dies — that's success.
      reply.log.warn({ err: error }, 'force-stop errored (server likely shutting down)')
    }
    return { ok: true, path, restarted: true }
  })
}
