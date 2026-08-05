import { describe, expect, it } from 'vitest'
import { okOrThrow, parseRunning } from './container-control'

describe('okOrThrow', () => {
  it('accepts 2xx', () => {
    expect(() => okOrThrow(204, 'stop')).not.toThrow()
  })
  it('accepts 304 (already in the desired state)', () => {
    expect(() => okOrThrow(304, 'start')).not.toThrow()
  })
  it('throws on 4xx/5xx with the action name', () => {
    expect(() => okOrThrow(404, 'inspect')).toThrow(/inspect responded 404/)
    expect(() => okOrThrow(500, 'stop')).toThrow(/stop responded 500/)
  })
})

describe('parseRunning', () => {
  it('reads State.Running=true', () => {
    expect(parseRunning(Buffer.from(JSON.stringify({ State: { Running: true } })))).toBe(true)
  })
  it('reads State.Running=false', () => {
    expect(parseRunning(Buffer.from(JSON.stringify({ State: { Running: false } })))).toBe(false)
  })
  it('defaults to false when State is absent', () => {
    expect(parseRunning(Buffer.from(JSON.stringify({})))).toBe(false)
  })
})
