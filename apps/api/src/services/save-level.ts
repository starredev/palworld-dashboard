import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type {
  LevelSummary,
  PaldeckOwner,
  PalEditInput,
  PlayerStats,
  PlayerStatsInput,
  SavePlayer,
  StatusPoints,
} from '@tsuki/types'
import { readSaveJson, isSaveEditorAvailable } from './save-editor'
import { editSaveFile } from './save-edit'
import { deepFind } from './save-location'
import { findWorldSaveDir } from './save-teleport'

// Player + pal records both live in Level.sav's CharacterSaveParameterMap, at
// entry.value.RawData.value.object.SaveParameter.value. Values are wrapped as
// { value, type } (sometimes doubly, e.g. ByteProperty/FixedPoint64).

export function levelSavPath(): string {
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
const hex = (s: unknown): string => (typeof s === 'string' ? normUid(s) : '')
/** Match a save GUID to a player uid — full hex, or the leading 8 (the id part). */
function uidMatches(guid: unknown, uid: string): boolean {
  if (typeof guid !== 'string') return false
  const a = normUid(guid)
  const b = normUid(uid)
  if (!a || !b) return false
  return a === b || (a.length >= 8 && b.length >= 8 && a.slice(0, 8) === b.slice(0, 8))
}

// The player's allocated stat points are stored under Japanese status names.
const STATUS_JP: Record<keyof StatusPoints, string> = {
  health: '最大HP',
  stamina: '最大SP',
  attack: '攻撃力',
  weight: '所持重量',
  captureRate: '捕獲率',
  workSpeed: '作業速度',
}

function readStatusPoints(params: Record<string, unknown>): StatusPoints | null {
  const arr = dig(params['GotStatusPointList'], 'value', 'values')
  if (!Array.isArray(arr)) return null
  const byJp: Record<string, number> = {}
  for (const e of arr) {
    const nm = dig(e, 'StatusName', 'value')
    const pt = dig(e, 'StatusPoint', 'value')
    if (typeof nm === 'string' && typeof pt === 'number') byJp[nm] = pt
  }
  const out = {} as StatusPoints
  let any = false
  for (const k of Object.keys(STATUS_JP) as (keyof StatusPoints)[]) {
    const v = byJp[STATUS_JP[k]]
    out[k] = typeof v === 'number' ? ((any = true), v) : null
  }
  return any ? out : null
}

type Stats = Pick<
  PlayerStats,
  'nickName' | 'level' | 'exp' | 'hp' | 'hunger' | 'sanity' | 'statusPoints'
>

/** Pure: extract a player's stats + owned pals from parsed Level.sav JSON. */
export function parsePlayerStats(levelJson: unknown, uid: string): Omit<PlayerStats, 'available'> {
  const empty: Stats = {
    nickName: null,
    level: null,
    exp: null,
    hp: null,
    hunger: null,
    sanity: null,
    statusPoints: null,
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
          statusPoints: readStatusPoints(params),
        }
      }
    } else if (uidMatches(dig(params['OwnerPlayerUId'], 'value'), uid)) {
      const inst = dig(entry, 'key', 'InstanceId', 'value')
      const rare = params['IsRarePal']
      pals.push({
        species: strVal(params['CharacterID']) ?? 'Unknown',
        nickname: strVal(params['NickName']),
        level: byteVal(params['Level']) ?? 1,
        gender: enumVal(params['Gender'])?.split('::').pop() ?? null,
        instanceId: typeof inst === 'string' ? inst : null,
        talentHp: byteVal(params['Talent_HP']),
        talentShot: byteVal(params['Talent_Shot']),
        talentDefense: byteVal(params['Talent_Defense']),
        lucky: isVN(rare) && rare.value === true,
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
export function findPlayerParamsRef(
  levelJson: unknown,
  uid: string,
): Record<string, unknown> | null {
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

/** Set one allocated stat point (matched by its Japanese status name). */
function setStatusPoint(
  params: Record<string, unknown>,
  key: keyof StatusPoints,
  value: number,
): void {
  const jp = STATUS_JP[key]
  const arr = dig(params['GotStatusPointList'], 'value', 'values')
  if (!Array.isArray(arr)) return
  for (const e of arr) {
    if (dig(e, 'StatusName', 'value') === jp) {
      const sp = (e as Record<string, unknown>)['StatusPoint']
      if (isVN(sp)) sp.value = value
      return
    }
  }
}

/** Apply a player stats edit in place (level/exp/nickname + stat points). */
export function setPlayerStats(params: Record<string, unknown>, input: PlayerStatsInput): void {
  if (input.level !== undefined) setPlayerLevel(params, input.level)
  if (input.exp !== undefined) {
    const n = params['Exp']
    if (isVN(n)) n.value = input.exp
  }
  if (input.nickName !== undefined) {
    const n = params['NickName']
    if (isVN(n)) n.value = input.nickName
  }
  const stats: (keyof StatusPoints)[] = [
    'health',
    'stamina',
    'attack',
    'weight',
    'captureRate',
    'workSpeed',
  ]
  for (const k of stats) {
    const v = input[k]
    if (v !== undefined) setStatusPoint(params, k, v)
  }
}

export function editPlayerStatsInLevel(
  app: FastifyInstance,
  uid: string,
  input: PlayerStatsInput,
): Promise<void> {
  return editPlayerInLevel(app, uid, (params) => setPlayerStats(params, input))
}

// ---- Pal edits (Level.sav) ----

/**
 * Set a ByteProperty's value. If the key is absent (the game drops some fields,
 * e.g. Level on a level-1 pal), deep-clone a sibling ByteProperty and overwrite
 * its value — this avoids hardcoding the exact struct shape.
 */
export function ensureByte(
  params: Record<string, unknown>,
  key: string,
  value: number,
  siblings: string[],
): void {
  const node = params[key]
  if (isVN(node) && isVN(node.value)) {
    node.value.value = value
    return
  }
  for (const s of siblings) {
    const sib = params[s]
    if (isVN(sib) && isVN(sib.value)) {
      const clone = JSON.parse(JSON.stringify(sib)) as { value: { value: number } }
      clone.value.value = value
      params[key] = clone
      return
    }
  }
  throw new Error(`Cannot set ${key}: no sibling ByteProperty to clone from`)
}

/** Fully heal a pal: top HP/hunger/sanity and clear sickness/revive timers. */
function healPal(params: Record<string, unknown>): void {
  const hp = dig(params['Hp'] ?? params['HP'], 'value', 'Value')
  if (isVN(hp)) hp.value = 100_000_000
  const fs = params['FullStomach']
  if (isVN(fs)) fs.value = 500
  const san = params['SanityValue']
  if (isVN(san)) san.value = 100
  for (const k of ['PalReviveTimer', 'WorkerSick', 'PhysicalHealth', 'HungerType']) delete params[k]
}

/** Apply an edit to a pal's SaveParameter in place. */
export function applyPalEdit(params: Record<string, unknown>, input: PalEditInput): void {
  if (input.level !== undefined)
    ensureByte(params, 'Level', input.level, ['Rank', 'Talent_HP', 'Talent_Shot', 'Talent_Defense'])
  if (input.talentHp !== undefined)
    ensureByte(params, 'Talent_HP', input.talentHp, ['Talent_Shot', 'Talent_Defense'])
  if (input.talentShot !== undefined)
    ensureByte(params, 'Talent_Shot', input.talentShot, ['Talent_HP', 'Talent_Defense'])
  if (input.talentDefense !== undefined)
    ensureByte(params, 'Talent_Defense', input.talentDefense, ['Talent_HP', 'Talent_Shot'])
  if (input.heal) healPal(params)
}

const hexOnly = (s: string) => s.replace(/[^0-9a-fA-F]/g, '').toLowerCase()

/** Find a specific pal by owner uid + its InstanceId (a ref into json). */
export function findPalRef(
  levelJson: unknown,
  uid: string,
  instanceId: string,
): Record<string, unknown> | null {
  const target = hexOnly(instanceId)
  for (const entry of characterEntries(levelJson)) {
    const params = saveParam(entry)
    if (!params || isPlayerParams(params)) continue
    if (!uidMatches(dig(params['OwnerPlayerUId'], 'value'), uid)) continue
    const inst = dig(entry, 'key', 'InstanceId', 'value')
    if (typeof inst === 'string' && hexOnly(inst) === target) return params
  }
  return null
}

/** Edit one of a player's pals via the safe pipeline. */
export function editPalInLevel(
  app: FastifyInstance,
  uid: string,
  instanceId: string,
  input: PalEditInput,
): Promise<void> {
  return editSaveFile(app, levelSavPath(), (json) => {
    const params = findPalRef(json, uid, instanceId)
    if (!params) throw new Error('Pal not found in Level.sav')
    applyPalEdit(params, input)
  })
}

// ---- Clone / duplicate a pal (spawn a new record) ----

const ZERO_GUID = '00000000-0000-0000-0000-000000000000'
function setV(node: unknown, value: unknown): void {
  if (isVN(node)) node.value = value
}
function arrOf(json: unknown, key: string): unknown[] {
  const m = deepFind(json, key)
  return isVN(m) && Array.isArray(m.value) ? m.value : []
}

/**
 * Duplicate one of a player's pals into a free Pal-box slot: deep-clone the map
 * entry (inherits owner/guild/struct layout, incl. correct CharacterID casing),
 * give it a fresh InstanceId, register that id in the box container slot AND the
 * guild handle list (all three ids must agree). Mutates `json` in place.
 */
export function clonePalMutate(
  json: unknown,
  uid: string,
  sourceInstanceId: string,
  level?: number,
): void {
  const target = sourceInstanceId.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
  const entries = arrOf(json, 'CharacterSaveParameterMap')
  const source = entries.find((e) => {
    const p = saveParam(e)
    return (
      p &&
      !isPlayerParams(p) &&
      uidMatches(dig(p, 'OwnerPlayerUId', 'value'), uid) &&
      String(dig(e, 'key', 'InstanceId', 'value'))
        .replace(/[^0-9a-fA-F]/g, '')
        .toLowerCase() === target
    )
  })
  if (!source) throw new Error('Source pal not found')

  const clone: unknown = JSON.parse(JSON.stringify(source))
  const newId = randomUUID()
  setV(dig(clone, 'key', 'InstanceId'), newId)
  setV(dig(clone, 'key', 'PlayerUId'), ZERO_GUID)

  const cp = saveParam(clone)
  if (!cp) throw new Error('Clone has no SaveParameter')
  if (level !== undefined) ensureByte(cp, 'Level', level, ['Rank', 'Talent_HP', 'Talent_Shot'])

  // Reserve a free Pal-box slot (container is the clone's SlotID.ContainerId).
  const containerGuid = hex(dig(cp['SlotID'], 'value', 'ContainerId', 'value', 'ID', 'value'))
  const container = arrOf(json, 'CharacterContainerSaveData').find(
    (c) => hex(dig(c, 'key', 'ID', 'value')) === containerGuid,
  )
  const slots = dig(container, 'value', 'Slots', 'value', 'values')
  if (!Array.isArray(slots) || slots.length === 0) throw new Error('Pal box container not found')
  const slotNum = numVal(dig(container, 'value', 'SlotNum')) ?? slots.length + 1
  const used = new Set(slots.map((s) => dig(s, 'SlotIndex', 'value')))
  let free = -1
  for (let i = 0; i < slotNum; i++)
    if (!used.has(i)) {
      free = i
      break
    }
  if (free < 0) throw new Error('Pal box is full')
  setV(dig(cp['SlotID'], 'value', 'SlotIndex'), free)

  const newSlot: unknown = JSON.parse(JSON.stringify(slots[0]))
  setV(dig(newSlot, 'SlotIndex'), free)
  const sraw = dig(newSlot, 'RawData', 'value') as Record<string, unknown> | undefined
  if (sraw && typeof sraw === 'object') {
    sraw['instance_id'] = newId
    sraw['player_uid'] = ZERO_GUID
    sraw['permission_tribe_id'] = 0
  }
  slots.push(newSlot)

  // Register the pal in its guild's handle list (group_id inherited from source).
  const groupId = hex(dig(clone, 'value', 'RawData', 'value', 'group_id'))
  const group = arrOf(json, 'GroupSaveDataMap').find(
    (g) => hex(dig(g, 'key', 'value')) === groupId || hex(dig(g, 'key')) === groupId,
  )
  const handles = dig(group, 'value', 'RawData', 'value', 'individual_character_handle_ids')
  if (Array.isArray(handles) && handles.length) {
    const h: unknown = JSON.parse(JSON.stringify(handles[0]))
    ;(h as Record<string, unknown>)['guid'] = ZERO_GUID
    ;(h as Record<string, unknown>)['instance_id'] = newId
    handles.push(h)
  }

  entries.push(clone)
}

export function clonePalInLevel(
  app: FastifyInstance,
  uid: string,
  sourceInstanceId: string,
  level?: number,
): Promise<void> {
  return editSaveFile(app, levelSavPath(), (json) =>
    clonePalMutate(json, uid, sourceInstanceId, level),
  )
}

/** Decode Level.sav and count players/pals — cheap validation of the decode path. */
export async function readLevelSummary(): Promise<Omit<LevelSummary, 'available'>> {
  return parseLevelSummary(await readSaveJson(levelSavPath()))
}
