import type { FastifyInstance } from 'fastify'
import type { AppConfig } from '@tsuki/types'
import { loadEnv } from '../config/env'

/** Public runtime config for the browser. No secrets — just deploy-time URLs. */
export async function configRoutes(app: FastifyInstance): Promise<void> {
  app.get('/config', async (): Promise<AppConfig> => {
    const env = loadEnv()
    return { liveMapUrl: env.LIVEMAP_URL ?? null, mapImageUrl: env.MAP_IMAGE_URL ?? null }
  })
}
