import { describe, expect, it } from 'vitest'
import { parseInfo, parsePlayers } from './parse'

describe('parseInfo', () => {
  it('extracts version and name', () => {
    expect(parseInfo('Welcome to Pal Server[v0.1.5.0] MyServer')).toEqual({
      name: 'MyServer',
      version: 'v0.1.5.0',
      description: null,
    })
  })

  it('falls back gracefully with no bracket', () => {
    const info = parseInfo('Some Server')
    expect(info.version).toBeNull()
    expect(info.name).toBe('Some Server')
  })
})

describe('parsePlayers', () => {
  it('parses CSV rows into players', () => {
    const raw = 'name,playerid,steamid\nAlice,123,765611\nBob,456,765612'
    expect(parsePlayers(raw)).toEqual([
      { name: 'Alice', playerId: '123', userId: '765611', level: null, ping: null, location: null },
      { name: 'Bob', playerId: '456', userId: '765612', level: null, ping: null, location: null },
    ])
  })

  it('returns empty when only the header is present', () => {
    expect(parsePlayers('name,playerid,steamid')).toEqual([])
  })
})
