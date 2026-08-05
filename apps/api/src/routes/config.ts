import type { FastifyInstance } from 'fastify'
import type { AppConfig } from '@tsuki/types'
import { loadEnv } from '../config/env'

/** Public runtime config for the browser. No secrets — just deploy-time URLs. */
export async function configRoutes(app: FastifyInstance): Promise<void> {
  app.get('/config', async (): Promise<AppConfig> => {
    const env = loadEnv()
    const b = env.MAP_BOUNDS.split(',').map(Number)
    const mapBounds: AppConfig['mapBounds'] =
      b.length === 4 && b.every(Number.isFinite)
        ? [b[0], b[1], b[2], b[3]]
        : [349400, 724400, -1099400, -724400]
    return {
      liveMapUrl: env.LIVEMAP_URL ?? null,
      mapImageUrl: env.MAP_IMAGE_URL ?? null,
      mapBounds,
      headerImageUrl: env.HEADER_IMAGE_URL ?? null,
    }
  })
}
