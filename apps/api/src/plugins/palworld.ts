import type { FastifyInstance } from 'fastify'
import { PalworldClient, type PalworldClientOptions } from '@tsuki/sdk'
import { loadEnv } from '../config/env'

/** Build client options from env; each transport is included only if complete. */
export function buildPalworldOptions(): PalworldClientOptions {
  const env = loadEnv()
  const options: PalworldClientOptions = {}

  if (env.PALWORLD_REST_URL && env.PALWORLD_REST_PASSWORD) {
    options.rest = {
      baseUrl: env.PALWORLD_REST_URL,
      username: env.PALWORLD_REST_USERNAME,
      password: env.PALWORLD_REST_PASSWORD,
    }
  }

  if (env.PALWORLD_RCON_HOST && env.PALWORLD_RCON_PASSWORD) {
    options.rcon = {
      host: env.PALWORLD_RCON_HOST,
      port: env.PALWORLD_RCON_PORT,
      password: env.PALWORLD_RCON_PASSWORD,
    }
  }

  return options
}

/** Decorate the app with a shared PalworldClient. */
export async function registerPalworld(app: FastifyInstance): Promise<void> {
  const client = new PalworldClient(buildPalworldOptions())
  app.decorate('palworld', client)
  if (!client.configured) {
    app.log.warn(
      'No Palworld connection configured — server data endpoints will report unconfigured.',
    )
  }
}
