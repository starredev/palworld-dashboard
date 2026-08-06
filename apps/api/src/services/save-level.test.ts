import { describe, expect, it } from 'vitest'
import {
  applyPalEdit,
  ensureByte,
  parseLevelPlayers,
  parseLevelSummary,
  parsePaldeck,
  parsePlayerStats,
  refuelPlayer,
  setPlayerLevel,
  setPlayerStats,
} from './save-level'

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

describe('refuelPlayer', () => {
  it('sets hunger + sanity to full when present', () => {
    const params: Record<string, unknown> = {
      FullStomach: { value: 12, type: 'FloatProperty' },
      SanityValue: { value: 30, type: 'FloatProperty' },
    }
    refuelPlayer(params)
    expect((params.FullStomach as { value: number }).value).toBe(150)
    expect((params.SanityValue as { value: number }).value).toBe(100)
  })

  it('is a no-op for fields the save omits (never throws)', () => {
    const params: Record<string, unknown> = { FullStomach: { value: 5, type: 'FloatProperty' } }
    expect(() => refuelPlayer(params)).not.toThrow()
    expect((params.FullStomach as { value: number }).value).toBe(150)
  })
})

describe('setPlayerLevel', () => {
  it('sets the Level byte in place', () => {
    const params: Record<string, unknown> = {
      Level: { value: { value: 23, type: 'ByteProperty' }, type: 'ByteProperty' },
    }
    setPlayerLevel(params, 30)
    expect((params.Level as { value: { value: number } }).value.value).toBe(30)
  })

  it('throws when the Level field is absent', () => {
    expect(() => setPlayerLevel({}, 30)).toThrow(/Level/)
  })
})

describe('parseLevelPlayers', () => {
  it('lists players with the uid in save-file form (32-hex uppercase)', () => {
    const json = levelJson([
      entry({ isPlayer: true, playerUid: MELVIN_GUID, nick: 'Melvin265', level: 23 }),
      entry({
        isPlayer: true,
        playerUid: 'a87a257d-0000-0000-0000-000000000000',
        nick: 'Invisiouz',
        level: 24,
      }),
      entry({ species: 'Foxparks', ownerUid: MELVIN_GUID }), // pal — excluded
    ])
    const players = parseLevelPlayers(json)
    expect(players).toEqual([
      { uid: 'A87A257D000000000000000000000000', name: 'Invisiouz', level: 24 }, // sorted by level desc
      { uid: MELVIN, name: 'Melvin265', level: 23 },
    ])
  })
})

const byteNode = (v: number) => ({ value: { value: v, type: 'None' }, type: 'ByteProperty' })

describe('ensureByte', () => {
  it('sets an existing ByteProperty in place', () => {
    const params: Record<string, unknown> = { Level: byteNode(5) }
    ensureByte(params, 'Level', 40, ['Rank'])
    expect((params.Level as { value: { value: number } }).value.value).toBe(40)
  })

  it('clones a sibling to create an absent field (e.g. Level on a lvl-1 pal)', () => {
    const params: Record<string, unknown> = { Talent_HP: byteNode(70) }
    ensureByte(params, 'Level', 25, ['Talent_HP'])
    expect((params.Level as { value: { value: number }; type: string }).value.value).toBe(25)
    expect((params.Level as { type: string }).type).toBe('ByteProperty') // shape cloned
    expect((params.Talent_HP as { value: { value: number } }).value.value).toBe(70) // sibling intact
  })

  it('throws when there is no sibling ByteProperty to clone', () => {
    expect(() => ensureByte({}, 'Level', 10, ['Rank'])).toThrow(/clone/)
  })
})

describe('applyPalEdit', () => {
  it('applies level + talents together', () => {
    const params: Record<string, unknown> = {
      Level: byteNode(10),
      Talent_HP: byteNode(0),
      Talent_Shot: byteNode(0),
      Talent_Defense: byteNode(0),
    }
    applyPalEdit(params, { level: 50, talentHp: 100, talentShot: 90, talentDefense: 80 })
    expect((params.Level as { value: { value: number } }).value.value).toBe(50)
    expect((params.Talent_HP as { value: { value: number } }).value.value).toBe(100)
    expect((params.Talent_Shot as { value: { value: number } }).value.value).toBe(90)
    expect((params.Talent_Defense as { value: { value: number } }).value.value).toBe(80)
  })

  it('heals: clears sickness/revive and tops sanity', () => {
    const params: Record<string, unknown> = {
      SanityValue: { value: 20, type: 'FloatProperty' },
      WorkerSick: { value: 'x' },
      PalReviveTimer: { value: 1 },
    }
    applyPalEdit(params, { heal: true })
    expect((params.SanityValue as { value: number }).value).toBe(100)
    expect(params.WorkerSick).toBeUndefined()
    expect(params.PalReviveTimer).toBeUndefined()
  })
})

describe('setPlayerStats', () => {
  it('sets level/exp/nickname and allocated stat points (by Japanese name)', () => {
    const params: Record<string, unknown> = {
      Level: byteNode(20),
      Exp: { value: 5000, type: 'Int64Property' },
      NickName: { value: 'Old', type: 'StrProperty' },
      GotStatusPointList: {
        value: {
          values: [
            { StatusName: { value: '最大HP' }, StatusPoint: { value: 3 } },
            { StatusName: { value: '攻撃力' }, StatusPoint: { value: 1 } },
          ],
        },
      },
    }
    setPlayerStats(params, { level: 30, exp: 9999, nickName: 'New', health: 10, attack: 5 })
    expect((params.Level as { value: { value: number } }).value.value).toBe(30)
    expect((params.Exp as { value: number }).value).toBe(9999)
    expect((params.NickName as { value: string }).value).toBe('New')
    const list = (
      params.GotStatusPointList as { value: { values: { StatusPoint: { value: number } }[] } }
    ).value.values
    expect(list[0].StatusPoint.value).toBe(10) // 最大HP
    expect(list[1].StatusPoint.value).toBe(5) // 攻撃力
  })
})

describe('parsePaldeck', () => {
  it('groups deduped, prefix-stripped species per owner', () => {
    const json = levelJson([
      entry({ isPlayer: true, playerUid: MELVIN_GUID, nick: 'Melvin265' }),
      entry({ species: 'BOSS_KingAlpaca', ownerUid: MELVIN_GUID }), // BOSS_ stripped
      entry({ species: 'KingAlpaca', ownerUid: MELVIN_GUID }), // dedupes with the above
      entry({ species: 'Foxparks', ownerUid: MELVIN_GUID }),
    ])
    const owners = parsePaldeck(json)
    expect(owners).toHaveLength(1)
    expect(owners[0].uid).toBe(MELVIN)
    expect([...owners[0].species].sort()).toEqual(['Foxparks', 'KingAlpaca'])
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
