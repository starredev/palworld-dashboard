import { describe, expect, it } from 'vitest'
import {
  applyPalEdit,
  clonePalMutate,
  copyPalMutate,
  ensureByte,
  findPalRef,
  parseAllPals,
  parseLevelPlayers,
  parseLevelSummary,
  parsePaldeck,
  parsePlayerStats,
  refuelPlayer,
  setPlayerLevel,
  setPlayerStats,
  setWorkSuitability,
} from './save-level'

// palworld-save-tools-shaped PalWorkSuitabilityInfo struct array (CraftSpeeds
// and GotWorkSuitabilityAddRankList share this exact shape).
function workList(name: string, items: [string, number][]) {
  return {
    array_type: 'StructProperty',
    id: null,
    value: {
      prop_name: name,
      prop_type: 'StructProperty',
      values: items.map(([k, r]) => ({
        WorkSuitability: {
          id: null,
          type: 'EnumProperty',
          value: { type: 'EPalWorkSuitability', value: `EPalWorkSuitability::${k}` },
        },
        Rank: { id: null, type: 'IntProperty', value: r },
      })),
      type_name: 'PalWorkSuitabilityInfo',
      id: '00000000-0000-0000-0000-000000000000',
    },
    type: 'ArrayProperty',
  }
}

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
  craftSpeeds?: [string, number][]
  addRanks?: [string, number][]
  slotContainer?: string
}) {
  const params: Record<string, unknown> = {}
  if (opts.craftSpeeds) params.CraftSpeeds = workList('CraftSpeeds', opts.craftSpeeds)
  if (opts.addRanks)
    params.GotWorkSuitabilityAddRankList = workList('GotWorkSuitabilityAddRankList', opts.addRanks)
  if (opts.isPlayer) params.IsPlayer = { value: true, type: 'BoolProperty' }
  if (opts.nick !== undefined) params.NickName = { value: opts.nick, type: 'StrProperty' }
  if (opts.level !== undefined)
    params.Level = { value: { value: opts.level, type: 'ByteProperty' }, type: 'ByteProperty' }
  if (opts.species !== undefined) params.CharacterID = { value: opts.species, type: 'NameProperty' }
  if (opts.hpMilli !== undefined)
    params.Hp = { value: { Value: { value: opts.hpMilli } }, struct_type: 'FixedPoint64' }
  if (opts.hunger !== undefined) params.FullStomach = { value: opts.hunger, type: 'FloatProperty' }
  if (opts.ownerUid) params.OwnerPlayerUId = { value: opts.ownerUid, struct_type: 'Guid' }
  if (opts.slotContainer)
    params.SlotID = {
      value: { ContainerId: { value: { ID: { value: opts.slotContainer } } } },
      type: 'StructProperty',
    }
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

  it('writes condensation stars as Rank = stars + 1 (4 stars → Rank 5)', () => {
    const params: Record<string, unknown> = { Rank: byteNode(1) }
    applyPalEdit(params, { stars: 4 })
    expect((params.Rank as { value: { value: number } }).value.value).toBe(5)
  })

  it('creates a Rank byte from a sibling when the pal has none', () => {
    const params: Record<string, unknown> = { Talent_HP: byteNode(50) }
    applyPalEdit(params, { stars: 2 })
    expect((params.Rank as { value: { value: number }; type: string }).value.value).toBe(3)
    expect((params.Rank as { type: string }).type).toBe('ByteProperty')
  })

  it('creates a PassiveSkillList node when the pal has none, deduped + capped at 4', () => {
    const params: Record<string, unknown> = { Level: byteNode(10) }
    applyPalEdit(params, {
      passives: ['MoveSpeed_up_3', 'MoveSpeed_up_3', 'Rare', 'Brave', 'Deffence_up1', 'Extra'],
    })
    const node = params.PassiveSkillList as {
      array_type: string
      type: string
      value: { values: string[] }
    }
    expect(node.type).toBe('ArrayProperty')
    expect(node.array_type).toBe('NameProperty')
    expect(node.value.values).toEqual(['MoveSpeed_up_3', 'Rare', 'Brave', 'Deffence_up1'])
  })

  it('overwrites an existing PassiveSkillList in place', () => {
    const params: Record<string, unknown> = {
      PassiveSkillList: {
        array_type: 'NameProperty',
        id: null,
        value: { values: ['Old'] },
        type: 'ArrayProperty',
      },
    }
    applyPalEdit(params, { passives: ['MoveSpeed_up_2'] })
    expect((params.PassiveSkillList as { value: { values: string[] } }).value.values).toEqual([
      'MoveSpeed_up_2',
    ])
  })

  it('souls: writes the four Rank_* bytes, cloning a sibling when absent', () => {
    const params: Record<string, unknown> = { Rank_HP: byteNode(2), Talent_HP: byteNode(50) }
    applyPalEdit(params, { soulHp: 20, soulAttack: 10, soulDefense: 0, soulCraftSpeed: 5 })
    expect((params.Rank_HP as { value: { value: number } }).value.value).toBe(20)
    expect((params.Rank_Attack as { value: { value: number } }).value.value).toBe(10)
    expect((params.Rank_Defence as { value: { value: number } }).value.value).toBe(0)
    expect((params.Rank_CraftSpeed as { value: { value: number } }).value.value).toBe(5)
    expect((params.Rank_Attack as { type: string }).type).toBe('ByteProperty')
  })

  it('skills: equips max 3 with prefix and unions them into MasteredWaza', () => {
    const params: Record<string, unknown> = {
      MasteredWaza: {
        array_type: 'EnumProperty',
        id: null,
        value: { values: ['EPalWazaID::WaterGun'] },
        type: 'ArrayProperty',
      },
    }
    applyPalEdit(params, { equippedSkills: ['DragonMeteor', 'Apocalypse', 'HyperBeam'] })
    const equip = params.EquipWaza as { array_type: string; value: { values: string[] } }
    expect(equip.array_type).toBe('EnumProperty')
    expect(equip.value.values).toEqual([
      'EPalWazaID::DragonMeteor',
      'EPalWazaID::Apocalypse',
      'EPalWazaID::HyperBeam',
    ])
    expect((params.MasteredWaza as { value: { values: string[] } }).value.values).toEqual([
      'EPalWazaID::WaterGun',
      'EPalWazaID::DragonMeteor',
      'EPalWazaID::Apocalypse',
      'EPalWazaID::HyperBeam',
    ])
  })

  it('skills: creates both waza nodes on a pal without any', () => {
    const params: Record<string, unknown> = {}
    applyPalEdit(params, { equippedSkills: ['EPalWazaID::AirCanon'] })
    expect((params.EquipWaza as { value: { values: string[] } }).value.values).toEqual([
      'EPalWazaID::AirCanon',
    ])
    expect((params.MasteredWaza as { value: { values: string[] } }).value.values).toEqual([
      'EPalWazaID::AirCanon',
    ])
  })

  it('craftSpeed: updates in place or creates the IntProperty', () => {
    const params: Record<string, unknown> = {
      CraftSpeed: { id: null, value: 100, type: 'IntProperty' },
    }
    applyPalEdit(params, { craftSpeed: 500 })
    expect((params.CraftSpeed as { value: number }).value).toBe(500)
    const fresh: Record<string, unknown> = {}
    applyPalEdit(fresh, { craftSpeed: 250 })
    expect((fresh.CraftSpeed as { value: number; type: string }).value).toBe(250)
    expect((fresh.CraftSpeed as { type: string }).type).toBe('IntProperty')
  })

  it('alpha: adds the BOSS_ prefix to CharacterID', () => {
    const params: Record<string, unknown> = {
      CharacterID: { value: 'Foxparks', type: 'NameProperty' },
    }
    applyPalEdit(params, { alpha: true })
    expect((params.CharacterID as { value: string }).value).toBe('BOSS_Foxparks')
    // Already alpha → unchanged (no double prefix).
    applyPalEdit(params, { alpha: true })
    expect((params.CharacterID as { value: string }).value).toBe('BOSS_Foxparks')
  })

  it('alpha: strips the BOSS_ prefix when turned off', () => {
    const params: Record<string, unknown> = {
      CharacterID: { value: 'BOSS_Foxparks', type: 'NameProperty' },
    }
    applyPalEdit(params, { alpha: false })
    expect((params.CharacterID as { value: string }).value).toBe('Foxparks')
  })

  it('alpha: throws when the pal has no CharacterID', () => {
    expect(() => applyPalEdit({}, { alpha: true })).toThrow(/CharacterID/)
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

describe('clonePalMutate', () => {
  const BOX = 'bbbb2222-0000-0000-0000-000000000000'
  const GROUP = 'cccc3333-0000-0000-0000-000000000000'
  const INST = 'dddd4444-0000-0000-0000-000000000000'

  function world() {
    return {
      properties: {
        worldSaveData: {
          value: {
            CharacterSaveParameterMap: {
              value: [
                {
                  key: { InstanceId: { value: INST }, PlayerUId: { value: '00000000' } },
                  value: {
                    RawData: {
                      value: {
                        object: {
                          SaveParameter: {
                            value: {
                              CharacterID: { value: 'SheepBall' },
                              OwnerPlayerUId: { value: MELVIN_GUID, struct_type: 'Guid' },
                              SlotID: {
                                value: {
                                  ContainerId: { value: { ID: { value: BOX } } },
                                  SlotIndex: { value: 0 },
                                },
                              },
                            },
                          },
                        },
                        group_id: GROUP,
                      },
                    },
                  },
                },
              ],
            },
            CharacterContainerSaveData: {
              value: [
                {
                  key: { ID: { value: BOX } },
                  value: {
                    SlotNum: { value: 30 },
                    Slots: {
                      value: {
                        values: [
                          {
                            SlotIndex: { value: 0 },
                            RawData: {
                              value: { player_uid: '0', instance_id: INST, permission_tribe_id: 0 },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
            GroupSaveDataMap: {
              value: [
                {
                  key: { value: GROUP },
                  value: {
                    RawData: {
                      value: {
                        individual_character_handle_ids: [{ guid: '0', instance_id: INST }],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    }
  }

  it('adds a pal entry, a box slot, and a guild handle — all with a new matching id', () => {
    const json = world()
    clonePalMutate(json, MELVIN, INST)
    const w = json.properties.worldSaveData.value
    const chars = w.CharacterSaveParameterMap.value
    expect(chars).toHaveLength(2)
    const newId = chars[1].key.InstanceId.value as string
    expect(newId).not.toBe(INST)
    const slots = w.CharacterContainerSaveData.value[0].value.Slots.value.values
    expect(slots).toHaveLength(2)
    expect(slots[1].SlotIndex.value).toBe(1)
    expect(slots[1].RawData.value.instance_id).toBe(newId)
    const handles = w.GroupSaveDataMap.value[0].value.RawData.value.individual_character_handle_ids
    expect(handles).toHaveLength(2)
    expect(handles[1].instance_id).toBe(newId)
  })

  it('throws when the source pal is not found', () => {
    expect(() => clonePalMutate(world(), MELVIN, 'ffffffff')).toThrow(/not found/i)
  })
})

describe('copyPalMutate', () => {
  const A = MELVIN
  const A_GUID = MELVIN_GUID
  const B = '99998888000000000000000000000000'
  const B_GUID = '99998888-0000-0000-0000-000000000000'
  const A_BOX = 'aaaa1111-0000-0000-0000-000000000000'
  const B_BOX = 'bbbb2222-0000-0000-0000-000000000000'
  const A_GROUP = 'a0a0a0a0-0000-0000-0000-000000000000'
  const B_GROUP = 'b0b0b0b0-0000-0000-0000-000000000000'
  const SRC = 'dddd4444-0000-0000-0000-000000000000'

  function palEntry(inst: string, ownerGuid: string, box: string, group: string) {
    return {
      key: { InstanceId: { value: inst }, PlayerUId: { value: '00000000' } },
      value: {
        RawData: {
          value: {
            object: {
              SaveParameter: {
                value: {
                  CharacterID: { value: 'SheepBall' },
                  OwnerPlayerUId: { value: ownerGuid, struct_type: 'Guid' },
                  OldOwnerPlayerUIds: { value: { values: [ownerGuid] } },
                  SlotID: {
                    value: {
                      ContainerId: { value: { ID: { value: box } } },
                      SlotIndex: { value: 0 },
                    },
                  },
                },
              },
            },
            group_id: group,
          },
        },
      },
    }
  }
  function container(id: string) {
    return {
      key: { ID: { value: id } },
      value: {
        SlotNum: { value: 30 },
        Slots: {
          value: {
            values: [
              {
                SlotIndex: { value: 0 },
                RawData: { value: { player_uid: '0', instance_id: SRC } },
              },
            ],
          },
        },
      },
    }
  }
  function world() {
    return {
      properties: {
        worldSaveData: {
          value: {
            CharacterSaveParameterMap: {
              value: [
                // Target player B (IsPlayer) so its owner GUID can be resolved.
                {
                  key: { InstanceId: { value: 'ee' }, PlayerUId: { value: B_GUID } },
                  value: {
                    RawData: {
                      value: {
                        object: { SaveParameter: { value: { IsPlayer: { value: true } } } },
                      },
                    },
                  },
                },
                palEntry(SRC, A_GUID, A_BOX, A_GROUP),
              ],
            },
            CharacterContainerSaveData: { value: [container(A_BOX), container(B_BOX)] },
            GroupSaveDataMap: {
              value: [
                {
                  key: { value: B_GROUP },
                  value: {
                    RawData: {
                      value: {
                        group_id: B_GROUP,
                        players: [{ player_uid: B_GUID }],
                        individual_character_handle_ids: [{ guid: '0', instance_id: 'ee' }],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    }
  }

  it('re-owns the copy to the target: owner, box container, group + handle', () => {
    const json = world()
    copyPalMutate(json, A, SRC, B, B_BOX)
    const w = json.properties.worldSaveData.value
    const chars = w.CharacterSaveParameterMap.value
    expect(chars).toHaveLength(3)
    const copy = chars[2] as ReturnType<typeof palEntry>
    const cp = copy.value.RawData.value.object.SaveParameter.value
    // New owner + history + fresh instance id, placed in B's box + group.
    expect(cp.OwnerPlayerUId.value).toBe(B_GUID)
    expect(cp.OldOwnerPlayerUIds.value.values).toEqual([B_GUID])
    expect(cp.SlotID.value.ContainerId.value.ID.value).toBe(B_BOX)
    expect(copy.value.RawData.value.group_id).toBe(B_GROUP)
    const newId = copy.key.InstanceId.value
    expect(newId).not.toBe(SRC)
    // Slot added to B's box (index 1), not A's.
    const bBox = w.CharacterContainerSaveData.value[1].value.Slots.value.values
    expect(bBox).toHaveLength(2)
    expect(bBox[1].RawData.value.instance_id).toBe(newId)
    expect(w.CharacterContainerSaveData.value[0].value.Slots.value.values).toHaveLength(1)
    // Handle registered in B's group.
    const handles = w.GroupSaveDataMap.value[0].value.RawData.value.individual_character_handle_ids
    expect(handles).toHaveLength(2)
    expect(handles[1].instance_id).toBe(newId)
  })

  it('throws when the target player is missing', () => {
    const json = world()
    json.properties.worldSaveData.value.CharacterSaveParameterMap.value.splice(0, 1) // drop player B
    expect(() => copyPalMutate(json, A, SRC, B, B_BOX)).toThrow(/target player/i)
  })
})

describe('parseAllPals', () => {
  it('lists every owned pal with its owner resolved; skips wild/unowned records', () => {
    const json = levelJson([
      entry({ isPlayer: true, playerUid: MELVIN_GUID, nick: 'Melvin265' }),
      entry({
        isPlayer: true,
        playerUid: 'a87a257d-0000-0000-0000-000000000000',
        nick: 'Invisiouz',
      }),
      entry({
        species: 'Foxparks',
        level: 10,
        ownerUid: MELVIN_GUID,
        craftSpeeds: [['EmitFlame', 2]],
        addRanks: [['EmitFlame', 1]],
      }),
      entry({
        species: 'Cattiva',
        level: 12,
        ownerUid: 'a87a257d-0000-0000-0000-000000000000',
      }),
      entry({ species: 'WildLamball', level: 3 }), // no owner — excluded
    ])
    const pals = parseAllPals(json)
    expect(pals.map((p) => p.species)).toEqual(['Cattiva', 'Foxparks']) // level desc
    expect(pals[0].ownerName).toBe('Invisiouz')
    expect(pals[0].ownerUid).toBe('A87A257D000000000000000000000000')
    expect(pals[1].ownerName).toBe('Melvin265')
    expect(pals[1].ownerUid).toBe(MELVIN)
    expect(pals[1].workSuitabilities).toEqual([{ type: 'EmitFlame', rank: 2, add: 1 }])
  })

  it('includes base workers (no owner, slotted in a base container) as BASE', () => {
    const BASE_CONT = 'cccc1111-0000-0000-0000-000000000000'
    const json = levelJson([
      entry({ species: 'Anubis', level: 45, slotContainer: BASE_CONT }),
      entry({ species: 'WildLamball', level: 3 }), // no owner, no base slot — excluded
    ]) as { properties: { worldSaveData: { value: Record<string, unknown> } } }
    json.properties.worldSaveData.value.BaseCampSaveData = {
      value: [
        {
          key: 'b-1',
          value: {
            RawData: { value: { group_id_belong_to: 'abcd0001-0000-0000-0000-000000000000' } },
            WorkerDirector: { value: { RawData: { value: { container_id: BASE_CONT } } } },
          },
        },
      ],
    }
    json.properties.worldSaveData.value.GroupSaveDataMap = {
      value: [
        {
          value: {
            RawData: {
              value: {
                group_id: 'abcd0001-0000-0000-0000-000000000000',
                group_type: 'EPalGroupType::Guild',
                guild_name: 'Tsuki',
              },
            },
          },
        },
      ],
    }
    const pals = parseAllPals(json)
    expect(pals.map((p) => p.species)).toEqual(['Anubis'])
    expect(pals[0].ownerUid).toBe('BASE')
    expect(pals[0].ownerName).toBe('Base · Tsuki')
  })
})

describe('findPalRef', () => {
  it('finds a base worker via the BASE sentinel; owner uids still guard', () => {
    const e = entry({ species: 'Anubis', level: 45 })
    e.key = { PlayerUId: { value: '00000000-0000-0000-0000-000000000000' } } as never
    ;(
      e.value.RawData.value.object.SaveParameter.value as Record<string, unknown>
    ).CharacterID ??= { value: 'Anubis', type: 'NameProperty' }
    const json = levelJson([e])
    const entries = (
      json as { properties: { worldSaveData: { value: { CharacterSaveParameterMap: { value: unknown[] } } } } }
    ).properties.worldSaveData.value.CharacterSaveParameterMap.value
    const inst = 'aaaa2222-0000-0000-0000-000000000000'
    ;(entries[0] as { key: Record<string, unknown> }).key.InstanceId = { value: inst }
    expect(findPalRef(json, 'BASE', inst)).not.toBeNull()
    expect(findPalRef(json, MELVIN, inst)).toBeNull()
  })
})

describe('setWorkSuitability', () => {
  it('writes the bonus rank into the add list; CraftSpeeds (when present) untouched', () => {
    const params: Record<string, unknown> = {
      CraftSpeeds: workList('CraftSpeeds', [['Handcraft', 2]]),
    }
    setWorkSuitability(params, { Handcraft: 4 })
    const node = params.GotWorkSuitabilityAddRankList as {
      type: string
      array_type: string
      value: { type_name: string; values: unknown[] }
    }
    expect(node.type).toBe('ArrayProperty')
    expect(node.array_type).toBe('StructProperty')
    expect(node.value.type_name).toBe('PalWorkSuitabilityInfo')
    const item = node.value.values[0] as {
      WorkSuitability: { value: { value: string } }
      Rank: { value: number }
    }
    expect(item.WorkSuitability.value.value).toBe('EPalWorkSuitability::Handcraft')
    expect(item.Rank.value).toBe(4) // bonus written verbatim
    // Base CraftSpeeds rank is left alone (the game derives it from the species).
    const base = (params.CraftSpeeds as ReturnType<typeof workList>).value.values[0]
    expect(base.Rank.value).toBe(2)
  })

  it('updates an existing bonus entry in place', () => {
    const params: Record<string, unknown> = {
      GotWorkSuitabilityAddRankList: workList('GotWorkSuitabilityAddRankList', [['Handcraft', 1]]),
    }
    setWorkSuitability(params, { Handcraft: 4 })
    const vals = (params.GotWorkSuitabilityAddRankList as ReturnType<typeof workList>).value.values
    expect(vals).toHaveLength(1)
    expect(vals[0].Rank.value).toBe(4)
  })

  it('removes the bonus entry when the bonus is 0', () => {
    const params: Record<string, unknown> = {
      GotWorkSuitabilityAddRankList: workList('GotWorkSuitabilityAddRankList', [
        ['Mining', 2],
        ['Handcraft', 1],
      ]),
    }
    setWorkSuitability(params, { Mining: 0 })
    const vals = (params.GotWorkSuitabilityAddRankList as ReturnType<typeof workList>).value.values
    expect(vals).toHaveLength(1)
    expect(vals[0].WorkSuitability.value.value).toBe('EPalWorkSuitability::Handcraft')
  })

  it('grants a suitability the pal has no lists for at all', () => {
    const params: Record<string, unknown> = {
      CraftSpeeds: workList('CraftSpeeds', [['EmitFlame', 2]]),
    }
    setWorkSuitability(params, { Watering: 3 })
    const vals = (params.GotWorkSuitabilityAddRankList as ReturnType<typeof workList>).value.values
    expect(vals[0].WorkSuitability.value.value).toBe('EPalWorkSuitability::Watering')
    expect(vals[0].Rank.value).toBe(3)
  })

  it('creates the add list from scratch when the pal has neither list', () => {
    const params: Record<string, unknown> = {}
    setWorkSuitability(params, { Handcraft: 2 })
    const node = params.GotWorkSuitabilityAddRankList as {
      value: { prop_name: string; values: { Rank: { value: number } }[] }
    }
    expect(node.value.prop_name).toBe('GotWorkSuitabilityAddRankList')
    expect(node.value.values[0].Rank.value).toBe(2)
  })

  it('rejects an unknown suitability key', () => {
    expect(() => setWorkSuitability({}, { Hacking: 5 })).toThrow(/unknown work suitability/i)
  })

  it('routes through applyPalEdit', () => {
    const params: Record<string, unknown> = {}
    applyPalEdit(params, { workSuitability: { Handcraft: 3 } })
    const vals = (params.GotWorkSuitabilityAddRankList as ReturnType<typeof workList>).value.values
    expect(vals[0].Rank.value).toBe(3)
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
