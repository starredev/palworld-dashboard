import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import type { LevelSummary, PaldeckOwner, PlayerStats, SavePlayer } from '@tsuki/types'
import { readSaveJson, isSaveEditorAvailable } from './save-editor'
import { editSaveFile } from './save-edit'
import { deepFind } from './save-location'
import { findWorldSaveDir } from './save-teleport'

// Player + pal records both live in Level.sav's CharacterSaveParameterMap, at
// entry.value.RawData.value.object.SaveParameter.value. Values are wrapped as
// { value, type } (sometimes doubly, e.g. ByteProperty/FixedPoint64).

function levelSavPath(): string {
  return join(findWorldSaveDir(), 'Level.sav')
}

/** Level.sav reads need the converter, the save dir, and Level.sav present. */
export function isLevelAvailable(): boolean {
  if (!isSaveEditorAvailable()) return false
  try {
    return existsSync(levelSavPath())
  } catch {
    return false
  }
}

interface ValueNode {
  value: unknown
}
function isVN(n: unknown): n is ValueNode {
  return typeof n === 'object' && n !== null && 'value' in n
}
/** Walk a chain of plain object keys, tolerating any missing hop. */
function dig(node: unknown, ...keys: string[]): unknown {
  let cur = node
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

const numVal = (n: unknown): number | null =>
  isVN(n) && typeof n.value === 'number' ? n.value : null
const strVal = (n: unknown): string | null =>
  isVN(n) && typeof n.value === 'string' ? n.value : null
// ByteProperty / EnumProperty nest twice: { value: { value: X } }
const byteVal = (n: unknown): number | null => {
  const v = dig(n, 'value', 'value')
  return typeof v === 'number' ? v : null
}
const enumVal = (n: unknown): string | null => {
  const v = dig(n, 'value', 'value')
  return typeof v === 'string' ? v : null
}
// FixedPoint64 HP is stored ×1000: { value: { Value: { value: milliHp } } }
function hpVal(params: Record<string, unknown>): number | null {
  const milli = dig(params['Hp'] ?? params['HP'], 'value', 'Value', 'value')
  return typeof milli === 'number' ? Math.round(milli / 1000) : null
}

function characterEntries(levelJson: unknown): unknown[] {
  const map = deepFind(levelJson, 'CharacterSaveParameterMap')
  const arr = isVN(map) ? map.value : undefined
  return Array.isArray(arr) ? arr : []
}
function saveParam(entry: unknown): Record<string, unknown> | null {
  const sp = deepFind(entry, 'SaveParameter')
  return isVN(sp) && sp.value && typeof sp.value === 'object'
    ? (sp.value as Record<string, unknown>)
    : null
}
function isPlayerParams(params: Record<string, unknown>): boolean {
  const p = params['IsPlayer']
  return isVN(p) && p.value === true
}

function normUid(s: string): string {
  return s.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
}
/** Match a save GUID to a player uid — full hex, or the leading 8 (the id part). */
function uidMatches(guid: unknown, uid: string): boolean {
  if (typeof guid !== 'string') return false
  const a = normUid(guid)
  const b = normUid(uid)
  if (!a || !b) return false
  return a === b || (a.length >= 8 && b.length >= 8 && a.slice(0, 8) === b.slice(0, 8))
}

type Stats = Pick<PlayerStats, 'nickName' | 'level' | 'exp' | 'hp' | 'hunger' | 'sanity'>

/** Pure: extract a player's stats + owned pals from parsed Level.sav JSON. */
export function parsePlayerStats(levelJson: unknown, uid: string): Omit<PlayerStats, 'available'> {
  const empty: Stats = {
    nickName: null,
    level: null,
    exp: null,
    hp: null,
    hunger: null,
    sanity: null,
  }
  let stats: Stats | null = null
  const pals: PlayerStats['pals'] = []

  for (const entry of characterEntries(levelJson)) {
    const params = saveParam(entry)
    if (!params) continue
    if (isPlayerParams(params)) {
      if (!stats && uidMatches(dig(entry, 'key', 'PlayerUId', 'value'), uid)) {
        stats = {
          nickName: strVal(params['NickName']),
          level: byteVal(params['Level']) ?? 1,
          exp: numVal(params['Exp']) ?? 0,
          hp: hpVal(params),
          hunger: numVal(params['FullStomach']),
          sanity: numVal(params['SanityValue']),
        }
      }
    } else if (uidMatches(dig(params['OwnerPlayerUId'], 'value'), uid)) {
      pals.push({
        species: strVal(params['CharacterID']) ?? 'Unknown',
        nickname: strVal(params['NickName']),
        level: byteVal(params['Level']) ?? 1,
        gender: enumVal(params['Gender'])?.split('::').pop() ?? null,
      })
    }
  }

  pals.sort((a, b) => b.level - a.level)
  return { found: stats !== null, ...(stats ?? empty), pals }
}

/** Pure: count player vs pal records in parsed Level.sav JSON. */
export function parseLevelSummary(levelJson: unknown): Omit<LevelSummary, 'available'> {
  let players = 0
  let pals = 0
  for (const entry of characterEntries(levelJson)) {
    const params = saveParam(entry)
    if (!params) continue
    if (isPlayerParams(params)) players++
    else pals++
  }
  return { players, pals }
}

/** Read a player's stats + pals from Level.sav (decodes the whole file). */
export async function readPlayerStats(uid: string): Promise<Omit<PlayerStats, 'available'>> {
  return parsePlayerStats(await readSaveJson(levelSavPath()), uid)
}

/**
 * Pure: every player in the save (online or not), with the uid in save-file
 * form (32-hex uppercase). PlayerUId GUIDs are `<id>` + all-zero groups, so the
 * plain hex equals the `Players/<uid>.sav` filename.
 */
export function parseLevelPlayers(levelJson: unknown): SavePlayer[] {
  const players: SavePlayer[] = []
  for (const entry of characterEntries(levelJson)) {
    const params = saveParam(entry)
    if (!params || !isPlayerParams(params)) continue
    const guid = dig(entry, 'key', 'PlayerUId', 'value')
    if (typeof guid !== 'string') continue
    players.push({
      uid: normUid(guid).toUpperCase(),
      name: strVal(params['NickName']),
      level: byteVal(params['Level']) ?? 1,
    })
  }
  return players.sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
}

/** List all players from Level.sav (drives the save editor for offline players). */
export async function readLevelPlayers(): Promise<SavePlayer[]> {
  return parseLevelPlayers(await readSaveJson(levelSavPath()))
}

/** Strip runtime prefixes so a CharacterID matches the paldeck dataset codename. */
function baseSpecies(id: string): string {
  return id.replace(/^(BOSS_|PREDATOR_|GYM_|SUMMON_)/i, '')
}

/** Pure: which species (deduped) each player owns — for the Paldeck page. */
export function parsePaldeck(levelJson: unknown): PaldeckOwner[] {
  const names = new Map<string, string | null>()
  const owned = new Map<string, Set<string>>()
  for (const entry of characterEntries(levelJson)) {
    const params = saveParam(entry)
    if (!params) continue
    if (isPlayerParams(params)) {
      const g = dig(entry, 'key', 'PlayerUId', 'value')
      if (typeof g === 'string') names.set(normUid(g).toUpperCase(), strVal(params['NickName']))
    } else {
      const g = dig(params['OwnerPlayerUId'], 'value')
      const species = strVal(params['CharacterID'])
      if (typeof g === 'string' && species) {
        const uid = normUid(g).toUpperCase()
        if (!owned.has(uid)) owned.set(uid, new Set())
        owned.get(uid)!.add(baseSpecies(species))
      }
    }
  }
  const owners: PaldeckOwner[] = []
  for (const [uid, name] of names) owners.push({ uid, name, species: [...(owned.get(uid) ?? [])] })
  return owners.sort((a, b) => b.species.length - a.species.length)
}

/** Owned species per player, from Level.sav (frontend joins with the dex data). */
export async function readPaldeck(): Promise<PaldeckOwner[]> {
  return parsePaldeck(await readSaveJson(levelSavPath()))
}

// ---- Writes (mutate the parsed Level.sav in place; run via editSaveFile) ----

/** Locate the mutable SaveParameter dict of the matching player (a ref into json). */
function findPlayerParamsRef(levelJson: unknown, uid: string): Record<string, unknown> | null {
  for (const entry of characterEntries(levelJson)) {
    const params = saveParam(entry)
    if (
      params &&
      isPlayerParams(params) &&
      uidMatches(dig(entry, 'key', 'PlayerUId', 'value'), uid)
    )
      return params
  }
  return null
}

/** Restore hunger + sanity to full. Fields are set only if present in the save. */
export function refuelPlayer(params: Record<string, unknown>): void {
  const fs = params['FullStomach']
  if (isVN(fs)) fs.value = 150
  const san = params['SanityValue']
  if (isVN(san)) san.value = 100
}

/** Set a player's level in place (requires an existing Level field). */
export function setPlayerLevel(params: Record<string, unknown>, level: number): void {
  const inner = isVN(params['Level']) ? (params['Level'] as ValueNode).value : undefined
  if (!isVN(inner)) throw new Error('Player has no Level field to set')
  inner.value = level
}

/** Run a mutation against the matching player's record via the safe pipeline. */
async function editPlayerInLevel(
  app: FastifyInstance,
  uid: string,
  mutate: (params: Record<string, unknown>) => void,
): Promise<void> {
  await editSaveFile(app, levelSavPath(), (json) => {
    const params = findPlayerParamsRef(json, uid)
    if (!params) throw new Error('Player not found in Level.sav')
    mutate(params)
  })
}

export function refuelPlayerInLevel(app: FastifyInstance, uid: string): Promise<void> {
  return editPlayerInLevel(app, uid, refuelPlayer)
}
export function setPlayerLevelInLevel(
  app: FastifyInstance,
  uid: string,
  level: number,
): Promise<void> {
  return editPlayerInLevel(app, uid, (params) => setPlayerLevel(params, level))
}

/** Decode Level.sav and count players/pals — cheap validation of the decode path. */
export async function readLevelSummary(): Promise<Omit<LevelSummary, 'available'>> {
  return parseLevelSummary(await readSaveJson(levelSavPath()))
}
