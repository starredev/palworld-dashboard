import type { FastifyInstance } from 'fastify'
import {
  teleportInputSchema,
  techPointsInputSchema,
  playerLevelInputSchema,
  type LevelSummary,
  type PlayerDetail,
  type PlayerLocation,
  type PlayerStats,
  type PaldeckResponse,
  type SaveEditorStatus,
  type SavePlayersResponse,
} from '@tsuki/types'
import { authenticate, requireAdmin } from '../plugins/auth'
import { loadEnv } from '../config/env'
import { isSaveEditorAvailable } from '../services/save-editor'
import { isSaveEditAvailable } from '../services/save-edit'
import { readPlayerLocation, teleportPlayer } from '../services/save-teleport'
import { giveTechPoints, readPlayerDetail } from '../services/save-player-fields'
import {
  isLevelAvailable,
  readLevelPlayers,
  readLevelSummary,
  readPaldeck,
  readPlayerStats,
  refuelPlayerInLevel,
  setPlayerLevelInLevel,
} from '../services/save-level'

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

  // Read-only player detail from the small player file (tech points, recipes,
  // last-online). HP/level/stats/pals live in Level.sav and come later.
  app.get<{ Params: UidParams }>(
    '/save/players/:uid/detail',
    { preHandler: authenticate },
    async (req, reply): Promise<PlayerDetail> => {
      if (!isSaveEditorAvailable()) {
        return reply.status(503).send({ message: 'Save editor is not available' })
      }
      try {
        return { available: true, ...(await readPlayerDetail(req.params.uid)) }
      } catch (error) {
        reply.log.error(error)
        return reply.status(400).send({ message: (error as Error).message })
      }
    },
  )

  // Read-only: a player's in-world stats + owned pals from Level.sav. Heavier
  // (decodes the whole Level.sav) — the flashy inspector data.
  app.get<{ Params: UidParams }>(
    '/save/players/:uid/stats',
    { preHandler: authenticate },
    async (req, reply): Promise<PlayerStats> => {
      if (!isLevelAvailable()) {
        return reply.status(503).send({ message: 'Level.sav is not available' })
      }
      try {
        return { available: true, ...(await readPlayerStats(req.params.uid)) }
      } catch (error) {
        reply.log.error(error)
        return reply.status(400).send({ message: (error as Error).message })
      }
    },
  )

  // Read-only: every player in the save (online or not) with their save uid —
  // lets the inspector/teleport/edits target offline players too.
  app.get(
    '/save/players',
    { preHandler: authenticate },
    async (_req, reply): Promise<SavePlayersResponse> => {
      if (!isLevelAvailable()) {
        return reply.status(503).send({ message: 'Level.sav is not available' })
      }
      try {
        return { available: true, players: await readLevelPlayers() }
      } catch (error) {
        reply.log.error(error)
        return reply.status(400).send({ message: (error as Error).message })
      }
    },
  )

  // Read-only: which species each player owns (Paldeck page joins with the dex).
  app.get(
    '/save/paldeck',
    { preHandler: authenticate },
    async (_req, reply): Promise<PaldeckResponse> => {
      if (!isLevelAvailable()) {
        return reply.status(503).send({ message: 'Level.sav is not available' })
      }
      try {
        return { available: true, owners: await readPaldeck() }
      } catch (error) {
        reply.log.error(error)
        return reply.status(400).send({ message: (error as Error).message })
      }
    },
  )

  // Read-only: decode Level.sav and count players/pals — validates the decode
  // path (rawdata patches + perf) before we trust any Level.sav write.
  app.get(
    '/save/level/summary',
    { preHandler: authenticate },
    async (_req, reply): Promise<LevelSummary> => {
      if (!isLevelAvailable()) {
        return reply.status(503).send({ message: 'Level.sav is not available' })
      }
      try {
        return { available: true, ...(await readLevelSummary()) }
      } catch (error) {
        reply.log.error(error)
        return reply.status(400).send({ message: (error as Error).message })
      }
    },
  )

  // Write: set a player's technology points (player file only — safe/cheap).
  app.post<{ Params: UidParams }>(
    '/save/players/:uid/tech-points',
    { preHandler: requireAdmin },
    async (req, reply) => {
      if (!isSaveEditAvailable()) {
        return reply
          .status(503)
          .send({ message: 'Editing needs the converter and Docker container control' })
      }
      const parsed = techPointsInputSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ message: parsed.error.issues[0]?.message ?? 'Invalid body' })
      }
      try {
        await giveTechPoints(app, req.params.uid, parsed.data)
        return { ok: true }
      } catch (error) {
        reply.log.error(error)
        return reply.status(500).send({ message: (error as Error).message })
      }
    },
  )

  // Write (Level.sav): restore hunger + sanity to full for a player.
  app.post<{ Params: UidParams }>(
    '/save/players/:uid/refuel',
    { preHandler: requireAdmin },
    async (req, reply) => {
      if (!isSaveEditAvailable() || !isLevelAvailable()) {
        return reply.status(503).send({ message: 'Level.sav editing is not available' })
      }
      try {
        await refuelPlayerInLevel(app, req.params.uid)
        return { ok: true }
      } catch (error) {
        reply.log.error(error)
        return reply.status(500).send({ message: (error as Error).message })
      }
    },
  )

  // Write (Level.sav): set a player's level.
  app.post<{ Params: UidParams }>(
    '/save/players/:uid/level',
    { preHandler: requireAdmin },
    async (req, reply) => {
      if (!isSaveEditAvailable() || !isLevelAvailable()) {
        return reply.status(503).send({ message: 'Level.sav editing is not available' })
      }
      const parsed = playerLevelInputSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(400).send({ message: 'A level between 1 and 100 is required' })
      }
      try {
        await setPlayerLevelInLevel(app, req.params.uid, parsed.data.level)
        return { ok: true }
      } catch (error) {
        reply.log.error(error)
        return reply.status(500).send({ message: (error as Error).message })
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
