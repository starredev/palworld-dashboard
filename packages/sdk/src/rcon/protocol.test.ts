import { describe, expect, it } from 'vitest'
import { decodePackets, encodePacket, RconPacketType } from './protocol'

describe('rcon protocol', () => {
  it('round-trips a packet through encode/decode', () => {
    const buf = encodePacket(7, RconPacketType.ExecCommand, 'ShowPlayers')
    const { packets, rest } = decodePackets(buf)
    expect(rest.length).toBe(0)
    expect(packets).toEqual([{ id: 7, type: RconPacketType.ExecCommand, body: 'ShowPlayers' }])
  })

  it('decodes multiple packets from one buffer', () => {
    const buf = Buffer.concat([
      encodePacket(1, RconPacketType.ResponseValue, 'a'),
      encodePacket(2, RconPacketType.ResponseValue, 'b'),
    ])
    const { packets } = decodePackets(buf)
    expect(packets.map((p) => p.body)).toEqual(['a', 'b'])
  })

  it('leaves an incomplete trailing packet in rest', () => {
    const full = encodePacket(1, RconPacketType.ResponseValue, 'hello')
    const partial = full.subarray(0, full.length - 3)
    const { packets, rest } = decodePackets(partial)
    expect(packets).toHaveLength(0)
    expect(rest.length).toBe(partial.length)
  })
})
