import 'fastify'
import type { PalworldClient } from '@tsuki/sdk'
import type { RealtimeBroadcaster } from '../services/realtime'

declare module 'fastify' {
  interface FastifyInstance {
    /** Shared Palworld client (REST-preferred, RCON fallback). */
    palworld: PalworldClient
    /** Broadcasts live status/metrics/players to WebSocket clients. */
    realtime: RealtimeBroadcaster
  }
}
