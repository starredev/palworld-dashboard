import 'fastify'
import type { PalworldClient } from '@tsuki/sdk'

declare module 'fastify' {
  interface FastifyInstance {
    /** Shared Palworld client (REST-preferred, RCON fallback). */
    palworld: PalworldClient
  }
}
