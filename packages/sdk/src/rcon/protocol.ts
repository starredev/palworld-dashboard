/**
 * Source RCON wire protocol (used by Palworld).
 * Packet: int32 size | int32 id | int32 type | body (ASCII, NUL-terminated) | NUL
 */

export const RconPacketType = {
  Auth: 3,
  AuthResponse: 2,
  ExecCommand: 2,
  ResponseValue: 0,
} as const

export interface RconPacket {
  id: number
  type: number
  body: string
}

/** Encode a packet to its wire representation. */
export function encodePacket(id: number, type: number, body: string): Buffer {
  const bodyBuf = Buffer.from(body, 'utf8')
  // size = id(4) + type(4) + body + two trailing NULs
  const size = 4 + 4 + bodyBuf.length + 2
  const buf = Buffer.alloc(4 + size)
  buf.writeInt32LE(size, 0)
  buf.writeInt32LE(id, 4)
  buf.writeInt32LE(type, 8)
  bodyBuf.copy(buf, 12)
  buf.writeInt8(0, 12 + bodyBuf.length)
  buf.writeInt8(0, 12 + bodyBuf.length + 1)
  return buf
}

/**
 * Pull as many complete packets as are buffered. Returns the parsed packets and
 * the leftover bytes (an incomplete packet awaiting more data).
 */
export function decodePackets(buffer: Buffer): { packets: RconPacket[]; rest: Buffer } {
  const packets: RconPacket[] = []
  let offset = 0

  while (buffer.length - offset >= 4) {
    const size = buffer.readInt32LE(offset)
    if (buffer.length - offset - 4 < size) break // wait for more bytes

    const id = buffer.readInt32LE(offset + 4)
    const type = buffer.readInt32LE(offset + 8)
    const body = buffer.toString('utf8', offset + 12, offset + 4 + size - 2)
    packets.push({ id, type, body })
    offset += 4 + size
  }

  return { packets, rest: buffer.subarray(offset) }
}
