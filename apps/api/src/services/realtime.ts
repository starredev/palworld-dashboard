import type { FastifyBaseLogger } from 'fastify'
import type { PalworldClient } from '@tsuki/sdk'
import type { RealtimeMessage } from '@tsuki/types'

/** Minimal surface of a WebSocket we need for broadcasting. */
export interface Broadcastable {
  send(data: string): void
  readyState: number
}

const OPEN = 1

/**
 * Polls the Palworld server once, centrally, and fans the results out to every
 * connected WebSocket — so browsers get live updates without each one polling.
 */
export class RealtimeBroadcaster {
  private readonly clients = new Set<Broadcastable>()
  private timer: ReturnType<typeof setInterval> | null = null
  private polling = false
  private readonly last = new Map<RealtimeMessage['type'], RealtimeMessage>()

  constructor(
    private readonly palworld: PalworldClient,
    private readonly log: FastifyBaseLogger,
    private readonly intervalMs = 5000,
  ) {}

  start(): void {
    if (this.timer) return
    void this.poll()
    this.timer = setInterval(() => void this.poll(), this.intervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  add(client: Broadcastable): void {
    this.clients.add(client)
    // Send the latest known snapshot immediately so new tabs aren't blank.
    for (const message of this.last.values()) this.sendTo(client, message)
  }

  remove(client: Broadcastable): void {
    this.clients.delete(client)
  }

  private async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true
    try {
      const status = await this.palworld.getStatus()
      this.emit({ type: 'status', data: status })
      if (!status.reachable) return

      await this.safe(async () =>
        this.emit({ type: 'metrics', data: await this.palworld.getMetrics() }),
      )
      await this.safe(async () => {
        const { players } = await this.palworld.getPlayers()
        this.emit({ type: 'players', data: players })
      })
    } catch (error) {
      this.log.debug({ error }, 'realtime poll failed')
    } finally {
      this.polling = false
    }
  }

  private async safe(fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (error) {
      this.log.debug({ error }, 'realtime sub-poll failed')
    }
  }

  private emit(message: RealtimeMessage): void {
    this.last.set(message.type, message)
    const payload = JSON.stringify(message)
    for (const client of this.clients) {
      if (client.readyState === OPEN) client.send(payload)
    }
  }

  private sendTo(client: Broadcastable, message: RealtimeMessage): void {
    if (client.readyState === OPEN) client.send(JSON.stringify(message))
  }
}
