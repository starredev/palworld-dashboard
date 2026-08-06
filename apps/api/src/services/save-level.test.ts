import { describe, expect, it } from 'vitest'
import { parseLevelSummary, parsePlayerStats } from './save-level'

// palworld-save-tools-shaped Level.sav CharacterSaveParameterMap entry.
function entry(opts: {
  playerUid?: string
  ownerUid?: string
  isPlayer?: boolean
  nick?: string
  level?: number
  species?: string
  hpMilli?: number
  hunger?: number
}) {
  const params: Record<string, unknown> = {}
  if (opts.isPlayer) params.IsPlayer = { value: true, type: 'BoolProperty' }
  if (opts.nick !== undefined) params.NickName = { value: opts.nick, type: 'StrProperty' }
  if (opts.level !== undefined)
    params.Level = { value: { value: opts.level, type: 'ByteProperty' }, type: 'ByteProperty' }
  if (opts.species !== undefined) params.CharacterID = { value: opts.species, type: 'NameProperty' }
  if (opts.hpMilli !== undefined)
    params.Hp = { value: { Value: { value: opts.hpMilli } }, struct_type: 'FixedPoint64' }
  if (opts.hunger !== undefined) params.FullStomach = { value: opts.hunger, type: 'FloatProperty' }
  if (opts.ownerUid) params.OwnerPlayerUId = { value: opts.ownerUid, struct_type: 'Guid' }
  return {
    key: { PlayerUId: { value: opts.playerUid ?? '00000000-0000-0000-0000-000000000000' } },
    value: { RawData: { value: { object: { SaveParameter: { value: params } } } } },
  }
}

const MELVIN = '75F676E0000000000000000000000000'
const MELVIN_GUID = '75f676e0-0000-0000-0000-000000000000'

function levelJson(entries: unknown[]) {
  return {
    properties: { worldSaveData: { value: { CharacterSaveParameterMap: { value: entries } } } },
  }
}

describe('parsePlayerStats', () => {
  it('extracts the matching player and their pals', () => {
    const json = levelJson([
      entry({
        isPlayer: true,
        playerUid: MELVIN_GUID,
        nick: 'Melvin265',
        level: 21,
        hpMilli: 4500_000,
        hunger: 88,
      }),
      entry({
        isPlayer: true,
        playerUid: 'a87a257d-0000-0000-0000-000000000000',
        nick: 'Invisiouz',
        level: 24,
      }),
      entry({ species: 'Foxparks', nick: 'Sparky', level: 10, ownerUid: MELVIN_GUID }),
      entry({ species: 'Lamball', level: 5, ownerUid: MELVIN_GUID }),
      entry({ species: 'Cattiva', level: 3, ownerUid: 'a87a257d-0000-0000-0000-000000000000' }),
    ])
    const s = parsePlayerStats(json, MELVIN)
    expect(s.found).toBe(true)
    expect(s.nickName).toBe('Melvin265')
    expect(s.level).toBe(21)
    expect(s.hp).toBe(4500) // milli-HP → HP
    expect(s.hunger).toBe(88)
    expect(s.pals.map((p) => p.species)).toEqual(['Foxparks', 'Lamball']) // sorted by level desc
    expect(s.pals[0].nickname).toBe('Sparky')
  })

  it('matches by the leading 8 hex when the full GUID differs', () => {
    const json = levelJson([
      entry({ isPlayer: true, playerUid: MELVIN_GUID, nick: 'Melvin265', level: 21 }),
    ])
    // caller passes a differently-formatted but same-id uid
    expect(parsePlayerStats(json, '75F676E0FFFFFFFFFFFFFFFFFFFFFFFF').found).toBe(true)
  })

  it('reports found:false when no player matches', () => {
    const json = levelJson([
      entry({ isPlayer: true, playerUid: 'deadbeef-0000-0000-0000-000000000000' }),
    ])
    expect(parsePlayerStats(json, MELVIN).found).toBe(false)
  })
})

describe('parseLevelSummary', () => {
  it('counts players and pals', () => {
    const json = levelJson([
      entry({ isPlayer: true, playerUid: MELVIN_GUID }),
      entry({ species: 'Foxparks', ownerUid: MELVIN_GUID }),
      entry({ species: 'Lamball', ownerUid: MELVIN_GUID }),
    ])
    expect(parseLevelSummary(json)).toEqual({ players: 1, pals: 2 })
  })
})
