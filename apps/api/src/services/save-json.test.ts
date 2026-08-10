import { describe, expect, it } from 'vitest'
import { parseSaveJson, stringifySaveJson } from './save-editor'

describe('parseSaveJson / stringifySaveJson', () => {
  it('parses the converter output that contains bare NaN', () => {
    const json = parseSaveJson<{ a: { damage_by_sec: unknown }; b: number }>(
      '{"a": {"damage_by_sec": NaN}, "b": 5}',
    )
    expect(json.b).toBe(5)
    // The non-finite float is held as a sentinel, not a real NaN, so it survives.
    expect(typeof json.a.damage_by_sec).toBe('string')
  })

  it('round-trips NaN / Infinity / -Infinity back to bare tokens for Python', () => {
    const text = '{"n": NaN, "p": Infinity, "m": -Infinity, "ok": 1.5}'
    const out = stringifySaveJson(parseSaveJson(text))
    expect(out).toContain('"n":NaN')
    expect(out).toContain('"p":Infinity')
    expect(out).toContain('"m":-Infinity')
    expect(out).toContain('"ok":1.5')
    // No sentinel leaks into what Python re-reads.
    expect(out).not.toContain('TSUKI')
  })

  it('leaves ordinary strings (even ones mentioning nan) untouched', () => {
    const out = stringifySaveJson(parseSaveJson('{"name": "Banana", "x": 2}'))
    expect(out).toContain('"name":"Banana"')
    expect(out).toContain('"x":2')
  })

  it('mutations to real fields persist through the round-trip', () => {
    const json = parseSaveJson<{ count: number; rate: unknown }>('{"count": 1, "rate": NaN}')
    json.count = 99
    const out = stringifySaveJson(json)
    expect(out).toContain('"count":99')
    expect(out).toContain('"rate":NaN')
  })
})
