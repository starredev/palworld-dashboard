import type { BaseCamp } from '@tsuki/types'
import { readSaveJson } from './save-editor'
import { parseGuilds } from './save-guild'
import { isLevelAvailable, levelSavPath } from './save-level'
import { deepFind } from './save-location'

function dig(node: unknown, ...keys: string[]): unknown {
  let cur = node
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}
const hex = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/[^0-9a-fA-F]/g, '').toLowerCase() : ''
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** Base reading/editing works on Level.sav's BaseCampSaveData (default decode). */
export function isBasesAvailable(): boolean {
  return isLevelAvailable()
}

/** BaseCampSaveData is a MapProperty → its value is the array of base entries. */
function baseEntries(levelJson: unknown): unknown[] {
  const val = dig(deepFind(levelJson, 'BaseCampSaveData'), 'value')
  return Array.isArray(val) ? val : []
}

/**
 * Every base camp with its owning guild + build-area radius. `entry.value.RawData`
 * (decoded by the default converter) holds id / area_range / transform /
 * group_id_belong_to. Guild names come from the same decode via parseGuilds.
 */
export function parseBases(levelJson: unknown): BaseCamp[] {
  const nameByGuild = new Map(parseGuilds(levelJson).map((g) => [g.id.toLowerCase(), g.name]))
  const bases: BaseCamp[] = []
  for (const e of baseEntries(levelJson)) {
    const rd = dig(e, 'value', 'RawData', 'value')
    const id = String(dig(e, 'key') ?? dig(rd, 'id') ?? '')
    if (!id) continue
    const gid = hex(dig(rd, 'group_id_belong_to'))
    const tr = dig(rd, 'transform', 'translation')
    const ar = dig(rd, 'area_range')
    bases.push({
      id,
      guildId: gid ? gid.toUpperCase() : null,
      guildName: gid ? (nameByGuild.get(gid) ?? null) : null,
      areaRange: typeof ar === 'number' ? ar : 0,
      location: { x: num(dig(tr, 'x')), y: num(dig(tr, 'y')), z: num(dig(tr, 'z')) },
    })
  }
  return bases
}

/** Read all base camps straight from Level.sav (decode once). */
export async function readBases(): Promise<BaseCamp[]> {
  return parseBases(await readSaveJson(levelSavPath()))
}

/**
 * Set a base camp's build-area radius (area_range, in cm) in place. Mutates the
 * parsed Level.sav JSON; throws when the base or its area_range field is absent.
 */
export function setBaseAreaMutate(levelJson: unknown, baseId: string, areaRange: number): void {
  const want = hex(baseId)
  for (const e of baseEntries(levelJson)) {
    const rd = dig(e, 'value', 'RawData', 'value') as Record<string, unknown> | undefined
    const id = hex(dig(e, 'key')) || hex(dig(rd, 'id'))
    if (id !== want) continue
    if (!rd || typeof rd !== 'object' || typeof rd.area_range !== 'number') {
      throw new Error('Base has no editable area_range')
    }
    rd.area_range = areaRange
    return
  }
  throw new Error('Base not found')
}
