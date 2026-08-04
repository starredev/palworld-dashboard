import type { FastifyBaseLogger } from 'fastify'
import type { PalworldClient } from '@tsuki/sdk'
import type { PalPlayer, RealtimeMessage, ServerEvent, ServerEventKind } from '@tsuki/types'

export interface Broadcastable {
  send(data: string): void
  readyState: number
}

const OPEN = 1
const MAX_EVENTS = 50
const playerKey = (p: PalPlayer): string => p.userId ?? p.playerId ?? p.name

/**
 * Polls the Palworld server once, centrally, fans state out to every connected
 * WebSocket, and detects join/leave + online/offline events.
 */
export class RealtimeBroadcaster {
  private readonly clients = new Set<Broadcastable>()
  private timer: ReturnType<typeof setInterval> | null = null
  private polling = false
  private readonly last = new Map<RealtimeMessage['type'], RealtimeMessage>()
  private readonly recentEvents: ServerEvent[] = []
  private readonly eventListeners = new Set<(event: ServerEvent) => void>()

  private prevReachable: boolean | null = null
  private prevPlayers: Map<string, string> | null = null
  private eventSeq = 0

  constructor(
    private readonly palworld: PalworldClient,
    private readonly log: FastifyBaseLogger,
    private readonly intervalMs = 5000,
  ) {}

  get running(): boolean {
    return this.timer !== null
  }

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
    for (const message of this.last.values()) this.sendTo(client, message)
    for (const event of this.recentEvents) this.sendTo(client, { type: 'event', data: event })
  }

  remove(client: Broadcastable): void {
    this.clients.delete(client)
  }

  /** Subscribe to events (used by the Discord notifier). */
  onEvent(listener: (event: ServerEvent) => void): void {
    this.eventListeners.add(listener)
  }

  private async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true
    try {
      const status = await this.palworld.getStatus()
      this.emitState({ type: 'status', data: status })
      this.detectReachable(status.reachable)

      if (!status.reachable) {
        this.prevPlayers = null
        return
      }
      await this.safe(async () =>
        this.emitState({ type: 'metrics', data: await this.palworld.getMetrics() }),
      )
      await this.safe(async () => {
        const { players } = await this.palworld.getPlayers()
        this.detectPlayers(players)
        this.emitState({ type: 'players', data: players })
      })
    } catch (error) {
      this.log.debug({ error }, 'realtime poll failed')
    } finally {
      this.polling = false
    }
  }

  private detectReachable(reachable: boolean): void {
    if (this.prevReachable !== null && this.prevReachable !== reachable) {
      this.emitEvent(
        reachable ? 'online' : 'offline',
        `Server is ${reachable ? 'online' : 'offline'}`,
      )
    }
    this.prevReachable = reachable
  }

  private detectPlayers(players: PalPlayer[]): void {
    const current = new Map(players.map((p) => [playerKey(p), p.name]))
    if (this.prevPlayers) {
      for (const [key, name] of current) {
        if (!this.prevPlayers.has(key)) this.emitEvent('join', `${name} joined`)
      }
      for (const [key, name] of this.prevPlayers) {
        if (!current.has(key)) this.emitEvent('leave', `${name} left`)
      }
    }
    this.prevPlayers = current
  }

  private emitEvent(kind: ServerEventKind, message: string): void {
    const event: ServerEvent = {
      id: `${Date.now()}-${this.eventSeq++}`,
      kind,
      message,
      at: new Date().toISOString(),
    }
    this.recentEvents.push(event)
    if (this.recentEvents.length > MAX_EVENTS) this.recentEvents.shift()
    this.broadcast({ type: 'event', data: event })
    for (const listener of this.eventListeners) listener(event)
  }

  private async safe(fn: () => Promise<void>): Promise<void> {
    try {
      await fn()
    } catch (error) {
      this.log.debug({ error }, 'realtime sub-poll failed')
    }
  }

  private emitState(message: RealtimeMessage): void {
    this.last.set(message.type, message)
    this.broadcast(message)
  }

  private broadcast(message: RealtimeMessage): void {
    const payload = JSON.stringify(message)
    for (const client of this.clients) {
      if (client.readyState === OPEN) client.send(payload)
    }
  }

  private sendTo(client: Broadcastable, message: RealtimeMessage): void {
    if (client.readyState === OPEN) client.send(JSON.stringify(message))
  }
}
