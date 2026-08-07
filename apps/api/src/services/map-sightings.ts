import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import type { MapPoint, PalSighting } from '@tsuki/types'
import { loadEnv } from '../config/env'

/**
 * Accumulated wild-pal sighting locations, so the map can draw where a species
 * roams over time (the live GameData only reports what's currently spawned near
 * players). Positions are the same world coords the map already uses, so no
 * alignment is needed. Points are quantised to a grid and capped per species to
 * bound the file; the newest sighting in a cell wins.
 */

// ~1.45M-unit world span → an 8k grid gives ~180 cells across, plenty for zones.
const CELL = 8000
const MAX_CELLS_PER_SPECIES = 400

const cellSchema = z.object({ x: z.number(), y: z.number(), t: z.number() })
const stateSchema = z.object({
  species: z.record(z.string(), z.record(z.string(), cellSchema)).default({}),
})
type State = z.infer<typeof stateSchema>

let state: State | null = null

function path(): string {
  return loadEnv().SIGHTINGS_PATH
}
function load(): State {
  if (state) return state
  const p = path()
  if (existsSync(p)) {
    try {
      state = stateSchema.parse(JSON.parse(readFileSync(p, 'utf8')))
      return state
    } catch {
      /* fall through to empty */
    }
  }
  state = { species: {} }
  return state
}
function persist(): void {
  const p = path()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(state), 'utf8')
}

const cellKey = (x: number, y: number): string => `${Math.round(x / CELL)}:${Math.round(y / CELL)}`

/**
 * Record the current wild pals from a map snapshot. `now` is passed in so callers
 * control the clock (and tests stay deterministic). Returns true if anything
 * changed (a new cell appeared), so the caller can skip disk writes otherwise.
 */
export function recordSightings(points: MapPoint[], now: number): boolean {
  const s = load()
  let changed = false
  for (const p of points) {
    if (p.kind !== 'wild' || !p.detail) continue
    const species = (s.species[p.detail] ??= {})
    const key = cellKey(p.x, p.y)
    if (!(key in species)) changed = true
    // Newest-wins keeps the representative point + freshness for the cell.
    species[key] = { x: p.x, y: p.y, t: now }
  }
  // Enforce the per-species cap by evicting the oldest cells.
  for (const cells of Object.values(s.species)) {
    const keys = Object.keys(cells)
    if (keys.length > MAX_CELLS_PER_SPECIES) {
      keys
        .sort((a, b) => cells[a].t - cells[b].t)
        .slice(0, keys.length - MAX_CELLS_PER_SPECIES)
        .forEach((k) => delete cells[k])
      changed = true
    }
  }
  if (changed) persist()
  return changed
}

export function listSightings(): PalSighting[] {
  const s = load()
  return Object.entries(s.species)
    .map(([species, cells]) => {
      const entries = Object.values(cells)
      const lastSeen = entries.reduce((max, c) => Math.max(max, c.t), 0)
      return {
        species,
        points: entries.map((c) => ({ x: c.x, y: c.y })),
        count: entries.length,
        lastSeen: new Date(lastSeen).toISOString(),
      }
    })
    .sort((a, b) => b.count - a.count)
}
