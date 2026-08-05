import type { FastifyInstance } from 'fastify'
import { teleportInputSchema, type PlayerLocation, type SaveEditorStatus } from '@tsuki/types'
import { authenticate, requireAdmin } from '../plugins/auth'
import { loadEnv } from '../config/env'
import { isSaveEditorAvailable } from '../services/save-editor'
import { isSaveEditAvailable } from '../services/save-edit'
import { readPlayerLocation, teleportPlayer } from '../services/save-teleport'

interface UidParams {
  uid: string
}

/** Save-file editor: status, read a player's location, and teleport (write). */
export async function saveEditorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/save/status', { preHandler: authenticate }, async (): Promise<SaveEditorStatus> => {
    return {
      available: isSaveEditorAvailable(),
      canWrite: isSaveEditAvailable(),
      saveDir: loadEnv().PALWORLD_SAVE_DIR,
    }
  })

  // Read-only: convert the player's .sav and report their world position. Safe
  // to call while the server runs — verify it matches the map before teleporting.
  app.get<{ Params: UidParams }>(
    '/save/players/:uid/location',
    { preHandler: authenticate },
    async (req, reply): Promise<PlayerLocation> => {
      if (!isSaveEditorAvailable()) {
        return reply.status(503).send({ message: 'Save editor is not available' })
      }
      try {
        return { available: true, location: await readPlayerLocation(req.params.uid) }
      } catch (error) {
        reply.log.error(error)
        return reply.status(400).send({ message: (error as Error).message })
      }
    },
  )

  // Write: rewrite the player's LastTransform. Stops the server, backs up, edits,
  // restarts. Works for Xbox players (no Steam-only RCON teleport involved).
  app.post<{ Params: UidParams }>(
    '/save/players/:uid/teleport',
    { preHandler: requireAdmin },
    async (req, reply) => {
      if (!isSaveEditAvailable()) {
        return reply
          .status(503)
          .send({ message: 'Teleport needs the converter and Docker container control' })
      }
      const parsed = teleportInputSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({ message: 'x, y and z coordinates are required' })
      }
      try {
        await teleportPlayer(app, req.params.uid, parsed.data)
        return { ok: true }
      } catch (error) {
        reply.log.error(error)
        return reply.status(500).send({ message: (error as Error).message })
      }
    },
  )
}
