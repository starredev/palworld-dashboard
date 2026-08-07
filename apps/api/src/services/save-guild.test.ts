import { describe, expect, it } from 'vitest'
import {
  parseGuilds,
  renameGuildMutate,
  setGuildLeaderMutate,
  kickGuildMemberMutate,
} from './save-guild'

const ALICE = '11111111-0000-0000-0000-000000000000'
const BOB = '22222222-0000-0000-0000-000000000000'
const BOB_INSTANCE = 'BBBBBBBB-0000-0000-0000-000000000001'

/** A palworld-save-tools-shaped Level.sav with one guild (Alice=leader, Bob). */
function level() {
  return {
    worldSaveData: {
      value: {
        GroupSaveDataMap: {
          value: [
            {
              key: { value: 'AAAAAAAA-0000-0000-0000-000000000000' },
              value: {
                GroupType: { value: { value: 'EPalGroupType::Guild' } },
                RawData: {
                  value: {
                    group_type: 'EPalGroupType::Guild',
                    group_id: 'AAAAAAAA-0000-0000-0000-000000000000',
                    group_name: 'Old Name',
                    individual_character_handle_ids: [
                      { guid: ALICE, instance_id: 'AAAAAAAA-0000-0000-0000-0000000000AA' },
                      { guid: BOB, instance_id: BOB_INSTANCE },
                      { guid: '00000000-0000-0000-0000-000000000000', instance_id: 'PAL0-inst' },
                    ],
                    base_ids: ['base-1'],
                    base_camp_level: 3,
                    guild_name: 'Old Name',
                    admin_player_uid: ALICE,
                    players: [
                      {
                        player_uid: ALICE,
                        player_info: { last_online_real_time: 0, player_name: 'Alice' },
                      },
                      {
                        player_uid: BOB,
                        player_info: { last_online_real_time: 0, player_name: 'Bob' },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        CharacterSaveParameterMap: {
          value: [
            {
              key: { PlayerUId: { value: BOB }, InstanceId: { value: BOB_INSTANCE } },
              value: { SaveParameter: { value: { IsPlayer: { value: true } } } },
            },
          ],
        },
      },
    },
  }
}

function rawData(json: ReturnType<typeof level>) {
  return json.worldSaveData.value.GroupSaveDataMap.value[0].value.RawData.value
}

/** A personal guild (EPalGroupType::IndependentGuild) — one owner, no players[]. */
function soloLevel() {
  return {
    worldSaveData: {
      value: {
        GroupSaveDataMap: {
          value: [
            {
              key: { value: 'CCCCCCCC-0000-0000-0000-000000000000' },
              value: {
                GroupType: { value: { value: 'EPalGroupType::IndependentGuild' } },
                RawData: {
                  value: {
                    group_type: 'EPalGroupType::IndependentGuild',
                    group_id: 'CCCCCCCC-0000-0000-0000-000000000000',
                    group_name: 'Carol',
                    individual_character_handle_ids: [
                      { guid: '00000000-0000-0000-0000-000000000000', instance_id: 'c-1' },
                    ],
                    base_ids: [],
                    guild_name: 'Carol',
                    guild_name_2: 'Carol',
                    player_uid: '33333333-0000-0000-0000-000000000000',
                    player_info: { last_online_real_time: 0, player_name: 'Carol' },
                  },
                },
              },
            },
          ],
        },
      },
    },
  }
}

describe('parseGuilds', () => {
  it('reads the guild, members and leader', () => {
    const [g] = parseGuilds(level())
    expect(g.name).toBe('Old Name')
    expect(g.id).toBe('AAAAAAAA000000000000000000000000')
    expect(g.solo).toBe(false)
    expect(g.members.map((m) => m.name)).toEqual(['Alice', 'Bob'])
    const alice = g.members.find((m) => m.name === 'Alice')
    expect(alice?.isAdmin).toBe(true)
    expect(g.members.find((m) => m.name === 'Bob')?.isAdmin).toBe(false)
    // 3 handles − 2 members = 1 pal estimate.
    expect(g.palCount).toBe(1)
    expect(g.baseCount).toBe(1)
  })

  it('reads a personal (independent) guild as a solo, one-member guild', () => {
    const [g] = parseGuilds(soloLevel())
    expect(g.solo).toBe(true)
    expect(g.name).toBe('Carol')
    expect(g.members).toHaveLength(1)
    expect(g.members[0]).toMatchObject({ name: 'Carol', isAdmin: true })
    expect(g.adminUid).toBe('33333333000000000000000000000000')
  })

  it('renames an independent guild across all name fields', () => {
    const json = soloLevel()
    renameGuildMutate(json, 'CCCCCCCC000000000000000000000000', 'Carol Prime')
    const raw = json.worldSaveData.value.GroupSaveDataMap.value[0].value.RawData.value
    expect(raw.group_name).toBe('Carol Prime')
    expect(raw.guild_name).toBe('Carol Prime')
    expect(raw.guild_name_2).toBe('Carol Prime')
  })
})

describe('renameGuildMutate', () => {
  it('sets both group_name and guild_name', () => {
    const json = level()
    renameGuildMutate(json, 'AAAAAAAA000000000000000000000000', 'New Name')
    const raw = rawData(json)
    expect(raw.group_name).toBe('New Name')
    expect(raw.guild_name).toBe('New Name')
  })
})

describe('setGuildLeaderMutate', () => {
  it('points admin_player_uid at the new member (dashed form)', () => {
    const json = level()
    setGuildLeaderMutate(json, 'AAAAAAAA000000000000000000000000', BOB)
    expect(rawData(json).admin_player_uid).toBe(BOB)
  })
  it('rejects a non-member', () => {
    expect(() =>
      setGuildLeaderMutate(
        level(),
        'AAAAAAAA000000000000000000000000',
        '99999999-0000-0000-0000-000000000000',
      ),
    ).toThrow(/not a member/)
  })
})

describe('kickGuildMemberMutate', () => {
  it('removes the member and their own handle, keeping pals', () => {
    const json = level()
    kickGuildMemberMutate(json, 'AAAAAAAA000000000000000000000000', BOB)
    const raw = rawData(json)
    expect(
      raw.players.map((p: { player_info: { player_name: string } }) => p.player_info.player_name),
    ).toEqual(['Alice'])
    // Bob's own handle is gone; Alice's and the pal handle remain.
    const ids = raw.individual_character_handle_ids.map(
      (h: { instance_id: string }) => h.instance_id,
    )
    expect(ids).not.toContain(BOB_INSTANCE)
    expect(ids).toContain('PAL0-inst')
    expect(ids).toHaveLength(2)
  })
  it('refuses to kick the leader', () => {
    expect(() => kickGuildMemberMutate(level(), 'AAAAAAAA000000000000000000000000', ALICE)).toThrow(
      /leader/,
    )
  })
})
