import { describe, expect, it } from 'vitest'
import { deriveGameData, type RawObject, type RawPlayer } from './gamedata'

const players: RawPlayer[] = [
  {
    id: 'p1',
    name: 'Invisiouz',
    guildKey: 'g1',
    guildName: 'Unnamed Guild',
    level: 13,
    online: false,
  },
  {
    id: 'p2',
    name: 'Melvin265',
    guildKey: 'g1',
    guildName: 'Unnamed Guild',
    level: 16,
    online: true,
  },
]
const objects: RawObject[] = [
  { id: 'b1', kind: 'bases', name: 'Unnamed Guild', guildKey: 'g1' },
  { id: 'b2', kind: 'bases', name: 'Unnamed Guild', guildKey: 'g1' },
  { id: 'w1', kind: 'workers', name: 'Vixy', detail: 'CuteFox BOSS', guildKey: 'g1', level: 12 },
  { id: 'w2', kind: 'workers', name: 'Digtoise', detail: 'DrillGame', guildKey: 'g1', level: 20 },
  { id: 'n1', kind: 'npcs', name: 'Syndicate Thug' },
  { id: 'wp1', kind: 'wild-pals', name: 'Caprity' },
]

describe('deriveGameData', () => {
  it('builds a guild with members, base and pal counts', () => {
    const { guilds } = deriveGameData(players, objects)
    expect(guilds).toHaveLength(1)
    const [g] = guilds
    expect(g.memberCount).toBe(2)
    expect(g.baseCount).toBe(2)
    expect(g.palCount).toBe(2)
    expect(g.members.map((m) => m.name)).toEqual(['Invisiouz', 'Melvin265'])
  })

  it('lists only worker pals, sorted by level, with guild name', () => {
    const { pals } = deriveGameData(players, objects)
    expect(pals.map((p) => p.name)).toEqual(['Digtoise', 'Vixy'])
    expect(pals[0]).toMatchObject({ species: 'DrillGame', level: 20, guildName: 'Unnamed Guild' })
  })

  it('excludes npcs and wild pals from the pal list', () => {
    const { pals } = deriveGameData(players, objects)
    expect(pals.every((p) => p.name !== 'Syndicate Thug' && p.name !== 'Caprity')).toBe(true)
  })
})
