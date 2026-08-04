import type { FastifyInstance } from 'fastify'
import type { GuildsResponse, PalsResponse } from '@tsuki/types'
import { authenticate } from '../plugins/auth'
import { getGameData, isGameDataConfigured } from '../services/gamedata'

/** Guilds & Pals derived from the live-map GameData API. */
export async function gameDataRoutes(app: FastifyInstance): Promise<void> {
  app.get('/guilds', { preHandler: authenticate }, async (): Promise<GuildsResponse> => {
    if (!isGameDataConfigured()) return { available: false, guilds: [] }
    try {
      const { guilds } = await getGameData()
      return { available: true, guilds }
    } catch (error) {
      app.log.warn({ error }, 'gamedata fetch failed')
      return { available: false, guilds: [] }
    }
  })

  app.get('/pals', { preHandler: authenticate }, async (): Promise<PalsResponse> => {
    if (!isGameDataConfigured()) return { available: false, pals: [] }
    try {
      const { pals } = await getGameData()
      return { available: true, pals }
    } catch (error) {
      app.log.warn({ error }, 'gamedata fetch failed')
      return { available: false, pals: [] }
    }
  })
}
