import net from 'node:net'
import { decodePackets, encodePacket, RconPacketType, type RconPacket } from './protocol'

export interface RconConnectionOptions {
  host: string
  port: number
  password: string
  timeoutMs?: number
}

/**
 * A single authenticated RCON connection. Commands are serialized (one in
 * flight at a time) to sidestep Palworld's loose packet-id echoing.
 */
export class RconConnection {
  private socket: net.Socket | null = null
  private buffer: Buffer = Buffer.alloc(0)
  private nextId = 1
  private pending: { resolve: (body: string) => void; reject: (err: Error) => void } | null = null
  private readonly timeoutMs: number

  constructor(private readonly options: RconConnectionOptions) {
    this.timeoutMs = options.timeoutMs ?? 5000
  }

  async connect(): Promise<void> {
    await this.openSocket()
    await this.authenticate()
  }

  close(): void {
    this.socket?.destroy()
    this.socket = null
    this.pending?.reject(new Error('RCON connection closed'))
    this.pending = null
  }

  /** Send a command and resolve with the server's textual response. */
  exec(command: string): Promise<string> {
    if (!this.socket) return Promise.reject(new Error('RCON not connected'))
    if (this.pending) return Promise.reject(new Error('RCON command already in flight'))

    const id = this.nextId++
    return this.awaitResponse(() =>
      this.socket!.write(encodePacket(id, RconPacketType.ExecCommand, command)),
    )
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.options.host, port: this.options.port })
      socket.setTimeout(this.timeoutMs)
      socket.once('connect', () => {
        socket.setTimeout(0)
        this.socket = socket
        resolve()
      })
      socket.once('timeout', () => {
        socket.destroy()
        reject(new Error('RCON connection timed out'))
      })
      socket.once('error', reject)
      socket.on('data', (chunk) => this.onData(chunk))
    })
  }

  private authenticate(): Promise<void> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending = {
        resolve: () => resolve(),
        reject,
      }
      this.armTimeout()
      this.socket!.write(encodePacket(id, RconPacketType.Auth, this.options.password))
    })
  }

  private awaitResponse(send: () => void): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject }
      this.armTimeout()
      send()
    })
  }

  private armTimeout(): void {
    const timer = setTimeout(() => {
      this.pending?.reject(new Error('RCON command timed out'))
      this.pending = null
    }, this.timeoutMs)
    const original = this.pending!
    this.pending = {
      resolve: (body) => {
        clearTimeout(timer)
        original.resolve(body)
      },
      reject: (err) => {
        clearTimeout(timer)
        original.reject(err)
      },
    }
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    const { packets, rest } = decodePackets(this.buffer)
    this.buffer = rest
    for (const packet of packets) this.handlePacket(packet)
  }

  private handlePacket(packet: RconPacket): void {
    const pending = this.pending
    if (!pending) return
    // Auth failure is signalled by an id of -1.
    if (packet.id === -1) {
      this.pending = null
      pending.reject(new Error('RCON authentication failed'))
      return
    }
    this.pending = null
    pending.resolve(packet.body)
  }
}
