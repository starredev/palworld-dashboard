import { describe, expect, it } from 'vitest'
import { demux } from './container-logs'

/** Build a Docker multiplexed frame: [stream, 0,0,0, size(BE32)] + payload. */
function frame(stream: number, text: string): Buffer {
  const payload = Buffer.from(text, 'utf8')
  const header = Buffer.alloc(8)
  header[0] = stream
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

describe('demux', () => {
  it('joins multiplexed stdout/stderr frames', () => {
    const buf = Buffer.concat([frame(1, 'hello\n'), frame(2, 'oops\n')])
    expect(demux(buf)).toBe('hello\noops\n')
  })

  it('returns raw text when the stream is not framed (TTY)', () => {
    expect(demux(Buffer.from('plain tty output\n', 'utf8'))).toBe('plain tty output\n')
  })
})
