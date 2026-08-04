import type { PalPlayer, PalServerInfo, PalServerMetrics } from '@tsuki/types'
import { RestClient, type RestClientOptions } from './http'

const API_PREFIX = '/v1/api'

interface RawInfo {
  version?: string
  servername?: string
  description?: string
}
interface RawMetrics {
  serverfps?: number
  serverframetime?: number
  currentplayernum?: number
  maxplayernum?: number
  days?: number
  serveruptime?: number
}
interface RawPlayer {
  name?: string
  accountName?: string
  playerId?: string
  userId?: string
  ping?: number
  location_x?: number
  location_y?: number
  level?: number
}

/** Client for Palworld's official REST API (port 8212 by default). */
export class PalworldRestClient {
  private readonly http: RestClient

  constructor(options: RestClientOptions) {
    this.http = new RestClient({ ...options, baseUrl: options.baseUrl.replace(/\/$/, '') })
  }

  async getInfo(): Promise<PalServerInfo> {
    const info = await this.http.get<RawInfo>(`${API_PREFIX}/info`)
    return {
      name: info.servername ?? 'Palworld Server',
      version: info.version ?? null,
      description: info.description ?? null,
    }
  }

  async getMetrics(): Promise<PalServerMetrics> {
    const m = await this.http.get<RawMetrics>(`${API_PREFIX}/metrics`)
    return {
      fps: m.serverfps ?? null,
      frameTime: m.serverframetime ?? null,
      players: m.currentplayernum ?? 0,
      maxPlayers: m.maxplayernum ?? (await this.maxPlayers()),
      uptime: m.serveruptime ?? null,
      days: m.days ?? null,
    }
  }

  async getPlayers(): Promise<PalPlayer[]> {
    const data = await this.http.get<{ players?: RawPlayer[] }>(`${API_PREFIX}/players`)
    return (data.players ?? []).map((p) => ({
      name: p.name ?? 'Unknown',
      playerId: p.playerId ?? null,
      userId: p.userId ?? p.accountName ?? null,
      level: p.level ?? null,
      ping: p.ping ?? null,
      location:
        p.location_x != null && p.location_y != null ? { x: p.location_x, y: p.location_y } : null,
    }))
  }

  announce(message: string): Promise<void> {
    return this.http.post(`${API_PREFIX}/announce`, { message })
  }

  kick(userId: string, message = 'Kicked by admin'): Promise<void> {
    return this.http.post(`${API_PREFIX}/kick`, { userid: userId, message })
  }

  ban(userId: string, message = 'Banned by admin'): Promise<void> {
    return this.http.post(`${API_PREFIX}/ban`, { userid: userId, message })
  }

  save(): Promise<void> {
    return this.http.post(`${API_PREFIX}/save`)
  }

  async ping(): Promise<boolean> {
    try {
      await this.getInfo()
      return true
    } catch {
      return false
    }
  }

  /** Best-effort max player count from settings; null if unavailable. */
  private async maxPlayers(): Promise<number | null> {
    try {
      const settings = await this.http.get<Record<string, unknown>>(`${API_PREFIX}/settings`)
      const value = settings.ServerPlayerMaxNum
      return typeof value === 'number' ? value : null
    } catch {
      return null
    }
  }
}
