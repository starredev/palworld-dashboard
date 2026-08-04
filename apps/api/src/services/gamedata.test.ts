import { describe, expect, it } from 'vitest'
import { buildMapPoints, deriveGameData, type RawObject, type RawPlayer } from './gamedata'

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

describe('buildMapPoints', () => {
  it('maps object kinds and skips points without coordinates', () => {
    const pts = buildMapPoints(
      [
        {
          id: 'p1',
          name: 'Invisiouz',
          guildKey: 'g1',
          guildName: 'Unnamed Guild',
          online: true,
          x: -364710,
          y: 162587,
        },
      ],
      [
        { id: 'b1', kind: 'bases', name: 'Unnamed Guild', guildKey: 'g1', x: -353594, y: 270051 },
        {
          id: 'w1',
          kind: 'workers',
          name: 'Vixy',
          detail: 'CuteFox',
          guildKey: 'g1',
          level: 12,
          x: -385958,
          y: 234797,
        },
        { id: 'wp1', kind: 'wild-pals', name: 'Caprity', x: -299645, y: 210803 },
        { id: 'no', kind: 'workers', name: 'NoCoords', guildKey: 'g1' },
      ],
    )
    expect(pts.map((p) => p.kind)).toEqual(['player', 'base', 'pal', 'wild'])
    expect(pts.find((p) => p.kind === 'pal')).toMatchObject({
      name: 'Vixy',
      guildName: 'Unnamed Guild',
    })
    expect(pts.find((p) => p.kind === 'player')?.online).toBe(true)
  })
})
