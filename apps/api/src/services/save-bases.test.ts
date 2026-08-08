import { describe, expect, it } from 'vitest'
import { parseBases, setBaseAreaMutate } from './save-bases'

// Level.sav shape: worldSaveData.value.BaseCampSaveData is a MapProperty whose
// value is a list of { key: <base guid>, value: { RawData: { value: {...} } } }.
function baseEntry(id: string, areaRange: number, guildId: string, x = 0, y = 0) {
  return {
    key: id,
    value: {
      RawData: {
        value: {
          id,
          area_range: areaRange,
          group_id_belong_to: guildId,
          transform: { translation: { x, y, z: 0 } },
        },
      },
    },
  }
}
function levelJson(bases: unknown[], groups: unknown[] = []) {
  return {
    properties: {
      worldSaveData: {
        value: {
          BaseCampSaveData: { value: bases },
          GroupSaveDataMap: { value: groups },
        },
      },
    },
  }
}
function guild(groupId: string, name: string) {
  return {
    value: {
      RawData: {
        value: {
          group_type: 'EPalGroupType::Guild',
          group_id: groupId,
          guild_name: name,
          admin_player_uid: '11111111-0000-0000-0000-000000000000',
          players: [],
        },
      },
    },
  }
}

const G = '49b8f25e-444f-586a-e07d-19b7d2f010d9'

describe('parseBases', () => {
  it('lists bases with radius, location and joined guild name', () => {
    const json = levelJson(
      [baseEntry('aaaa-1111', 3500, G, -353000, 271000)],
      [guild(G, 'The Testers')],
    )
    const bases = parseBases(json)
    expect(bases).toHaveLength(1)
    expect(bases[0]).toMatchObject({
      id: 'aaaa-1111',
      areaRange: 3500,
      guildName: 'The Testers',
      location: { x: -353000, y: 271000 },
    })
    expect(bases[0].guildId).toBe(G.replace(/-/g, '').toUpperCase())
  })
})

describe('setBaseAreaMutate', () => {
  it('sets the base area_range in place', () => {
    const json = levelJson([baseEntry('aaaa-1111', 3500, G), baseEntry('bbbb-2222', 3500, G)])
    setBaseAreaMutate(json, 'aaaa1111', 7000)
    const bases = json.properties.worldSaveData.value.BaseCampSaveData.value as ReturnType<
      typeof baseEntry
    >[]
    expect(bases[0].value.RawData.value.area_range).toBe(7000)
    expect(bases[1].value.RawData.value.area_range).toBe(3500) // untouched
  })

  it('matches base ids irrespective of dashes/case', () => {
    const json = levelJson([baseEntry('AAAA-BBBB', 3500, G)])
    setBaseAreaMutate(json, 'aaaabbbb', 5000)
    const bases = json.properties.worldSaveData.value.BaseCampSaveData.value as ReturnType<
      typeof baseEntry
    >[]
    expect(bases[0].value.RawData.value.area_range).toBe(5000)
  })

  it('throws when the base id is not found', () => {
    const json = levelJson([baseEntry('aaaa-1111', 3500, G)])
    expect(() => setBaseAreaMutate(json, 'deadbeef', 7000)).toThrow(/not found/i)
  })
})
