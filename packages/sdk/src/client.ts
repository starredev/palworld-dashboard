import type {
  PalServerInfo,
  PalServerMetrics,
  PalSource,
  PalStatus,
  PlayersResponse,
} from '@tsuki/types'
import { PalworldRestClient } from './rest/client'
import { PalworldRconClient } from './rcon/client'
import { PalworldNotConfiguredError, type PalworldClientOptions } from './types'

/**
 * Unified Palworld client. Prefers the REST API (richer data) and falls back to
 * RCON when REST is unavailable or not configured.
 */
export class PalworldClient {
  private readonly rest: PalworldRestClient | null
  private readonly rcon: PalworldRconClient | null

  constructor(options: PalworldClientOptions) {
    this.rest = options.rest ? new PalworldRestClient(options.rest) : null
    this.rcon = options.rcon ? new PalworldRconClient(options.rcon) : null
  }

  get configured(): boolean {
    return this.rest !== null || this.rcon !== null
  }

  /** Report whether a server is configured and currently reachable. */
  async getStatus(): Promise<PalStatus> {
    if (!this.configured) return { configured: false, reachable: false, source: 'none' }
    if (this.rest && (await this.rest.ping())) {
      return { configured: true, reachable: true, source: 'rest' }
    }
    if (this.rcon && (await this.rcon.ping())) {
      return { configured: true, reachable: true, source: 'rcon' }
    }
    return { configured: true, reachable: false, source: 'none' }
  }

  async getInfo(): Promise<PalServerInfo> {
    return (
      await this.prefer(
        (r) => r.getInfo(),
        (c) => c.getInfo(),
      )
    ).value
  }

  async getMetrics(): Promise<PalServerMetrics> {
    return (
      await this.prefer(
        (r) => r.getMetrics(),
        (c) => rconMetrics(c),
      )
    ).value
  }

  async getPlayers(): Promise<PlayersResponse> {
    const { value, source } = await this.prefer(
      (r) => r.getPlayers(),
      (c) => c.getPlayers(),
    )
    return { source, players: value }
  }

  announce(message: string): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.announce(message),
      (c) => c.broadcast(message.replace(/\s+/g, '_')).then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  kick(userId: string): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.kick(userId),
      (c) => c.kick(userId).then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  ban(userId: string): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.ban(userId),
      (c) => c.ban(userId).then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  unban(userId: string): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.unban(userId),
      (c) => c.unban(userId).then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  save(): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.save(),
      (c) => c.save().then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  shutdown(seconds: number, message: string): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.shutdown(seconds, message),
      (c) => c.shutdown(seconds, message).then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  /** Force-stop the server (no graceful save — leaves PalWorldSettings.ini intact). */
  stop(): Promise<{ source: PalSource }> {
    return this.prefer(
      (r) => r.stop(),
      (c) => c.stop().then(() => undefined),
    ).then(({ source }) => ({ source }))
  }

  /** Run a REST op, falling back to an RCON op; report which source answered. */
  private async prefer<T>(
    restFn: (rest: PalworldRestClient) => Promise<T>,
    rconFn: (rcon: PalworldRconClient) => Promise<T>,
  ): Promise<{ value: T; source: PalSource }> {
    if (this.rest) {
      try {
        return { value: await restFn(this.rest), source: 'rest' }
      } catch (error) {
        if (!this.rcon) throw error
      }
    }
    if (this.rcon) {
      return { value: await rconFn(this.rcon), source: 'rcon' }
    }
    throw new PalworldNotConfiguredError()
  }
}

/** Derive a partial metrics snapshot from RCON (player count only). */
async function rconMetrics(rcon: PalworldRconClient): Promise<PalServerMetrics> {
  const players = await rcon.getPlayers()
  return {
    fps: null,
    frameTime: null,
    players: players.length,
    maxPlayers: null,
    uptime: null,
    days: null,
  }
}

export function createPalworldClient(options: PalworldClientOptions): PalworldClient {
  return new PalworldClient(options)
}
