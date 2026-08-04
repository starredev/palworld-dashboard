import type { PalPlayer, PalServerInfo } from '@tsuki/types'
import { RconConnection, type RconConnectionOptions } from './connection'
import { parseInfo, parsePlayers } from './parse'

/**
 * Palworld RCON client. Opens a short-lived connection per call — simple and
 * robust for a management panel that polls infrequently.
 */
export class PalworldRconClient {
  constructor(private readonly options: RconConnectionOptions) {}

  private async run<T>(fn: (conn: RconConnection) => Promise<T>): Promise<T> {
    const conn = new RconConnection(this.options)
    try {
      await conn.connect()
      return await fn(conn)
    } finally {
      conn.close()
    }
  }

  getInfo(): Promise<PalServerInfo> {
    return this.run(async (c) => parseInfo(await c.exec('Info')))
  }

  getPlayers(): Promise<PalPlayer[]> {
    return this.run(async (c) => parsePlayers(await c.exec('ShowPlayers')))
  }

  broadcast(message: string): Promise<string> {
    // Palworld replaces spaces oddly; callers should pass a single token or use REST.
    return this.run((c) => c.exec(`Broadcast ${message}`))
  }

  kick(userId: string): Promise<string> {
    return this.run((c) => c.exec(`KickPlayer ${userId}`))
  }

  ban(userId: string): Promise<string> {
    return this.run((c) => c.exec(`BanPlayer ${userId}`))
  }

  save(): Promise<string> {
    return this.run((c) => c.exec('Save'))
  }

  /** Verify the connection + credentials are valid. */
  async ping(): Promise<boolean> {
    try {
      await this.getInfo()
      return true
    } catch {
      return false
    }
  }
}
