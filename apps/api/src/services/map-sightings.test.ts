import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { MapPoint } from '@tsuki/types'
import { listSightings, recordSightings } from './map-sightings'

// Point SIGHTINGS_PATH at a throwaway file per test file run.
const dir = mkdtempSync(join(tmpdir(), 'sightings-'))
process.env.SIGHTINGS_PATH = join(dir, 'sightings.json')
afterEach(() => {
  /* keep the file; each test uses distinct species so state can accumulate */
})
process.on('exit', () => rmSync(dir, { recursive: true, force: true }))

function wild(detail: string, x: number, y: number): MapPoint {
  return {
    id: `${detail}-${x}-${y}`,
    kind: 'wild',
    name: detail,
    detail,
    level: 5,
    guildName: null,
    online: null,
    x,
    y,
  }
}

describe('recordSightings', () => {
  it('dedups nearby points into one grid cell but keeps distant ones', () => {
    // Two points within one 8k cell + one far away → 2 cells for this species.
    recordSightings(
      [wild('Aqua', 1000, 1000), wild('Aqua', 1200, 900), wild('Aqua', 90000, 90000)],
      1,
    )
    const s = listSightings().find((x) => x.species === 'Aqua')
    expect(s?.count).toBe(2)
  })

  it('ignores non-wild points and points without a species', () => {
    const player: MapPoint = {
      id: 'p',
      kind: 'player',
      name: 'Bob',
      detail: null,
      level: 1,
      guildName: null,
      online: true,
      x: 5,
      y: 5,
    }
    const changed = recordSightings([player, wild('', 10, 10)], 2)
    expect(changed).toBe(false)
    expect(listSightings().some((x) => x.species === '')).toBe(false)
  })

  it('reports the newest sighting time per species', () => {
    recordSightings([wild('Timed', 5000, 5000)], 1000)
    recordSightings([wild('Timed', 5100, 5100)], 5000) // same cell, newer
    const s = listSightings().find((x) => x.species === 'Timed')
    expect(s?.count).toBe(1)
    expect(new Date(s!.lastSeen).getTime()).toBe(5000)
  })
})
