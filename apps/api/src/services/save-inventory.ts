import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import type { FastifyInstance } from 'fastify'
import type { InventoryResponse } from '@tsuki/types'
import { loadEnv } from '../config/env'
import { createBackup } from './backups'
import { startContainer, stopContainer } from './container-control'
import { isSaveEditAvailable } from './save-edit'
import {
  isSaveEditorAvailable,
  jsonToSav,
  parseSaveJson,
  readSaveJson,
  stringifySaveJson,
  tempJsonPath,
} from './save-editor'
import { deepFind } from './save-location'
import { findWorldSaveDir, playerSavePath } from './save-teleport'

const run = promisify(execFile)

// The player file stores container GUIDs; the items live in Level.sav. These are
// the player's inventory containers (label shown in the UI).
const CONTAINERS: [key: string, label: string][] = [
  ['CommonContainerId', 'Inventory'],
  ['EssentialContainerId', 'Key items'],
  ['WeaponLoadOutContainerId', 'Weapons'],
  ['PlayerEquipArmorContainerId', 'Armor'],
  ['FoodEquipContainerId', 'Food'],
]

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

function convertScript(): string {
  return join(loadEnv().SAVE_TOOLS_DIR, 'convert_with_items.py')
}
function levelSavPath(): string {
  return join(findWorldSaveDir(), 'Level.sav')
}

/** Inventory read needs the save editor AND the item-slot convert script. */
export function isInventoryAvailable(): boolean {
  return isSaveEditorAvailable() && existsSync(convertScript())
}

/** Decode Level.sav with the item-slot decoder enabled (read-only, isolated). */
async function readLevelWithItems(): Promise<unknown> {
  const env = loadEnv()
  // Unique output: concurrent inventory reads must not share (and delete) a file.
  const out = tempJsonPath(levelSavPath(), 'inv')
  await run(env.PYTHON_BIN, [convertScript(), levelSavPath(), out], {
    cwd: env.SAVE_TOOLS_DIR,
    maxBuffer: 256 * 1024 * 1024,
  })
  try {
    return parseSaveJson(await readFile(out, 'utf8'))
  } finally {
    if (existsSync(out)) rmSync(out)
  }
}

/** Read a player's inventory: player-file container GUIDs → Level.sav slots. */
export async function readInventory(uid: string): Promise<Omit<InventoryResponse, 'available'>> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')

  const inv = deepFind(await readSaveJson(path), 'InventoryInfo')
  const guidFor = (key: string) => hex(dig(inv, 'value', key, 'value', 'ID', 'value'))

  const levelJson = await readLevelWithItems()
  const slotsByGuid = new Map<string, unknown[]>()
  const entries = dig(deepFind(levelJson, 'ItemContainerSaveData'), 'value')
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const g = hex(dig(entry, 'key', 'ID', 'value'))
      const slots = dig(entry, 'value', 'Slots', 'value', 'values')
      if (g && Array.isArray(slots)) slotsByGuid.set(g, slots)
    }
  }

  const containers = CONTAINERS.map(([key, label]) => {
    const items: { id: string; count: number }[] = []
    for (const slot of slotsByGuid.get(guidFor(key)) ?? []) {
      const raw = dig(slot, 'RawData', 'value')
      const id = dig(raw, 'item', 'static_id')
      const count = dig(raw, 'count')
      if (typeof id === 'string' && id && id !== 'None' && typeof count === 'number' && count > 0) {
        items.push({ id, count })
      }
    }
    return { name: label, items }
  }).filter((c) => c.items.length > 0)

  return { containers }
}

// ---- Give items (write) ----

const ZERO_GUID = '00000000-0000-0000-0000-000000000000'

interface SlotRaw {
  count: number
  item: { static_id: string }
}
function slotRaw(slot: unknown): SlotRaw | null {
  const raw = dig(slot, 'RawData', 'value')
  return raw && typeof raw === 'object' && typeof (raw as SlotRaw).count === 'number'
    ? (raw as SlotRaw)
    : null
}

interface DynamicRef {
  created: string
  local: string
}

/** A decoded slot value (matches encode_bytes' fields). Static items keep the
 *  zero dynamic id; equipment links to its DynamicItemSaveData record. */
function packedValue(
  slotIndex: number,
  staticId: string,
  count: number,
  trailingLen: number,
  dynamic?: DynamicRef,
) {
  return {
    slot_index: slotIndex,
    count,
    item: {
      static_id: staticId,
      dynamic_id: {
        created_world_id: dynamic?.created ?? ZERO_GUID,
        local_id_in_created_world: dynamic?.local ?? ZERO_GUID,
      },
    },
    trailing_bytes: new Array(Math.max(0, trailingLen)).fill(0) as number[],
  }
}

/** The target container's entry + mutable Slots array. */
function containerEntry(
  levelJson: unknown,
  guidHex: string,
): { entry: unknown; slots: unknown[] } {
  const entries = dig(deepFind(levelJson, 'ItemContainerSaveData'), 'value')
  const entry = Array.isArray(entries)
    ? entries.find((e) => hex(dig(e, 'key', 'ID', 'value')) === guidHex)
    : undefined
  const slots = dig(entry, 'value', 'Slots', 'value', 'values')
  if (!Array.isArray(slots)) throw new Error('Inventory container not found')
  return { entry, slots }
}

/** Lowest slot index below SlotNum not taken by an occupied slot (-1 = none). */
function freeSlotIndex(entry: unknown, slots: unknown[]): number {
  const slotNum = dig(entry, 'value', 'SlotNum', 'value')
  if (typeof slotNum !== 'number') return -1
  const used = new Set(
    slots
      .map((s) => dig(s, 'RawData', 'value', 'slot_index'))
      .filter((n): n is number => typeof n === 'number'),
  )
  for (let i = 0; i < slotNum; i++) if (!used.has(i)) return i
  return -1
}

/** Clone a structural template and append a new occupied slot at `free`. */
function appendSlot(
  levelJson: unknown,
  slots: unknown[],
  free: number,
  staticId: string,
  count: number,
  dynamic?: DynamicRef,
): boolean {
  const template = anySlotTemplate(levelJson, slots)
  const clone: unknown = template ? JSON.parse(JSON.stringify(template)) : null
  const rawData = dig(clone, 'RawData') as Record<string, unknown> | undefined
  if (!clone || !rawData || typeof rawData !== 'object') return false
  const prev = dig(rawData, 'value', 'trailing_bytes')
  rawData.value = packedValue(free, staticId, count, Array.isArray(prev) ? prev.length : 0, dynamic)
  // Old-format slots also carry an outer SlotIndex property — keep it in sync
  // or two slots claim the same index and the game drops the new one.
  const outer = (clone as Record<string, unknown>)['SlotIndex']
  if (outer && typeof outer === 'object' && 'value' in outer) {
    ;(outer as { value: unknown }).value = free
  }
  slots.push(clone)
  return true
}

/** Any occupied slot in the level, to clone as a structural template for a new
 *  slot (carries the exact RawData/CustomVersionData property shape to re-encode).
 *  Prefers the target container's own slots; falls back to any other container. */
function anySlotTemplate(levelJson: unknown, preferred: unknown[]): unknown {
  if (preferred.length) return preferred[0]
  const entries = dig(deepFind(levelJson, 'ItemContainerSaveData'), 'value')
  if (Array.isArray(entries)) {
    for (const e of entries) {
      const s = dig(e, 'value', 'Slots', 'value', 'values')
      if (Array.isArray(s) && s.length) return s[0]
    }
  }
  return null
}

/**
 * Add `count` of `staticId` to the container with GUID `guidHex`.
 *
 * 1. Stacks onto an existing slot of that item.
 * 2. Fills a placeholder empty slot in place if the save stores any (a decoded
 *    "None" item, or empty/null RawData) — older save formats.
 * 3. Otherwise appends a NEW slot at a free index. Post-"memory optimisation"
 *    saves store ONLY occupied slots, so free space shows up as `Slots` being
 *    shorter than the container's `SlotNum` (capacity) — there are no empty slots
 *    to fill, so a new one must be cloned from an existing slot and appended.
 *
 * Throws if the container isn't found or is genuinely full.
 */
export function addItemToContainer(
  levelJson: unknown,
  guidHex: string,
  staticId: string,
  count: number,
): void {
  const { entry, slots } = containerEntry(levelJson, guidHex)

  for (const slot of slots) {
    const raw = slotRaw(slot)
    if (raw && raw.item.static_id === staticId) {
      raw.count += count
      return
    }
  }
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const rawData = dig(slot, 'RawData') as Record<string, unknown> | undefined
    if (!rawData || typeof rawData !== 'object') continue
    const raw = slotRaw(slot)
    if (raw && raw.item.static_id === 'None') {
      raw.item.static_id = staticId
      raw.count = count
      return
    }
    if (rawData.value == null) {
      const idx = dig(slot, 'SlotIndex', 'value')
      rawData.value = packedValue(typeof idx === 'number' ? idx : i, staticId, count, 0)
      return
    }
  }

  // Append into spare capacity (needs SlotNum to know the container's size).
  const free = freeSlotIndex(entry, slots)
  if (free < 0 || !appendSlot(levelJson, slots, free, staticId, count)) {
    throw new Error('Inventory is full (no free slot)')
  }
}

// ---- Equipment (weapons / armor): one slot per copy + a dynamic-item record ----

export type EquipKind = 'weapon' | 'armor' | 'single'

// Generous flat durability — the game caps the bar at the item's own max.
const EQUIP_DURABILITY = 10_000

/** The DynamicItemSaveData values array (each entry wraps a decoded RawData). */
function dynamicItemValues(levelJson: unknown): unknown[] | null {
  const values = dig(deepFind(levelJson, 'DynamicItemSaveData'), 'value', 'values')
  return Array.isArray(values) ? values : null
}

/** Occupy an emptied ('None') slot in place, or append at a free index. */
function placeSingle(
  levelJson: unknown,
  entry: unknown,
  slots: unknown[],
  staticId: string,
  dynamic?: DynamicRef,
): void {
  const none = slots.map(slotRaw).find((r) => r && r.item.static_id === 'None')
  if (none) {
    none.item.static_id = staticId
    none.count = 1
    ;(none.item as { dynamic_id?: unknown }).dynamic_id = {
      created_world_id: dynamic?.created ?? ZERO_GUID,
      local_id_in_created_world: dynamic?.local ?? ZERO_GUID,
    }
    return
  }
  const free = freeSlotIndex(entry, slots)
  if (free < 0 || !appendSlot(levelJson, slots, free, staticId, 1, dynamic)) {
    throw new Error('Inventory is full (no free slot)')
  }
}

/**
 * Give equipment: `count` copies, ONE per slot. 'weapon'/'armor' also append a
 * DynamicItemSaveData record (durability etc.) linked via the slot's
 * dynamic_id — without it the game shows a dead item it can't equip. 'single'
 * places per-slot copies without a record (accessories carry no dynamic data).
 */
export function addEquipmentToContainer(
  levelJson: unknown,
  guidHex: string,
  staticId: string,
  count: number,
  kind: EquipKind,
): void {
  const { entry, slots } = containerEntry(levelJson, guidHex)
  const dyn = kind === 'single' ? null : dynamicItemValues(levelJson)
  if (kind !== 'single' && (!dyn || !dyn.length)) {
    throw new Error('No dynamic item data in the save to clone from')
  }
  for (let n = 0; n < count; n++) {
    let dynamic: DynamicRef | undefined
    if (dyn) {
      // Clone an existing record for the exact struct shape, then replace the
      // decoded payload. created_world_id must match this world's id, so reuse
      // the template's.
      const template = JSON.parse(JSON.stringify(dyn[0])) as Record<string, unknown>
      const tRaw = dig(template, 'RawData') as Record<string, unknown> | undefined
      if (!tRaw || typeof tRaw !== 'object') throw new Error('Unrecognised dynamic item shape')
      const tCreated = dig(tRaw, 'value', 'id', 'created_world_id')
      const created = typeof tCreated === 'string' ? tCreated : ZERO_GUID
      const local = randomUUID()
      const id = { created_world_id: created, local_id_in_created_world: local, static_id: staticId }
      tRaw.value =
        kind === 'weapon'
          ? {
              id,
              type: 'weapon',
              durability: EQUIP_DURABILITY,
              remaining_bullets: 0,
              passive_skill_list: [],
            }
          : { id, type: 'armor', durability: EQUIP_DURABILITY }
      dyn.push(template)
      dynamic = { created, local }
    }
    placeSingle(levelJson, entry, slots, staticId, dynamic)
  }
}

/**
 * Move `count` pieces of equipment between players, slot by slot, PRESERVING
 * each piece's dynamic_id link (durability etc. live in DynamicItemSaveData,
 * keyed by that id — a count-based transfer would sever it).
 */
export function transferEquipmentMutate(
  levelJson: unknown,
  fromGuids: string[],
  toGuid: string,
  staticId: string,
  count: number,
): void {
  const entries = dig(deepFind(levelJson, 'ItemContainerSaveData'), 'value')
  if (!Array.isArray(entries)) throw new Error('Inventory container not found')
  const wanted = new Set(fromGuids)
  const sources: SlotRaw[] = []
  for (const entry of entries) {
    if (!wanted.has(hex(dig(entry, 'key', 'ID', 'value')))) continue
    const slots = dig(entry, 'value', 'Slots', 'value', 'values')
    if (!Array.isArray(slots)) continue
    for (const slot of slots) {
      const raw = slotRaw(slot)
      if (raw && raw.item.static_id === staticId) sources.push(raw)
    }
  }
  if (sources.length < count) {
    throw new Error(`Not enough of that item to transfer (have ${sources.length}, need ${count})`)
  }
  const { entry: target, slots: targetSlots } = containerEntry(levelJson, toGuid)
  for (let n = 0; n < count; n++) {
    const src = sources[n]
    const dynId = (
      src.item as {
        dynamic_id?: { created_world_id?: string; local_id_in_created_world?: string }
      }
    ).dynamic_id
    const dynamic =
      dynId?.local_id_in_created_world && dynId.local_id_in_created_world !== ZERO_GUID
        ? { created: dynId.created_world_id ?? ZERO_GUID, local: dynId.local_id_in_created_world }
        : undefined
    placeSingle(levelJson, target, targetSlots, staticId, dynamic)
    src.item.static_id = 'None'
    ;(src.item as { dynamic_id?: unknown }).dynamic_id = {
      created_world_id: ZERO_GUID,
      local_id_in_created_world: ZERO_GUID,
    }
    src.count = 0
  }
}

/**
 * Remove `count` of `staticId` spread across the given containers (by GUID).
 * Sums the item across every matching slot first and throws if the player
 * doesn't have enough — so nothing is mutated on a shortfall. Otherwise it
 * decrements slots in order, emptying a slot ("None", 0) once it hits zero.
 */
export function removeItemFromContainers(
  levelJson: unknown,
  guidHexes: string[],
  staticId: string,
  count: number,
): void {
  const entries = dig(deepFind(levelJson, 'ItemContainerSaveData'), 'value')
  if (!Array.isArray(entries)) throw new Error('Inventory container not found')
  const wanted = new Set(guidHexes)
  const matching: SlotRaw[] = []
  for (const entry of entries) {
    if (!wanted.has(hex(dig(entry, 'key', 'ID', 'value')))) continue
    const slots = dig(entry, 'value', 'Slots', 'value', 'values')
    if (!Array.isArray(slots)) continue
    for (const slot of slots) {
      const raw = slotRaw(slot)
      if (raw && raw.item.static_id === staticId) matching.push(raw)
    }
  }
  const total = matching.reduce((n, r) => n + r.count, 0)
  if (total < count) {
    throw new Error(`Not enough of that item to transfer (have ${total}, need ${count})`)
  }
  let remaining = count
  for (const raw of matching) {
    if (remaining <= 0) break
    const take = Math.min(raw.count, remaining)
    raw.count -= take
    remaining -= take
    if (raw.count <= 0) {
      raw.item.static_id = 'None'
      raw.count = 0
    }
  }
}

/**
 * Move `count` of `staticId` from a source player's containers into a target
 * container (their main inventory). Removal is validated up front, so a
 * shortfall throws before the target is touched.
 */
export function transferItemMutate(
  levelJson: unknown,
  fromGuids: string[],
  toGuid: string,
  staticId: string,
  count: number,
): void {
  removeItemFromContainers(levelJson, fromGuids, staticId, count)
  addItemToContainer(levelJson, toGuid, staticId, count)
}

/**
 * Edit Level.sav with the item-slot decoder/encoder ENABLED (so item slots can
 * be changed), through the safe pipeline: stop → backup → decode → mutate →
 * re-encode → start. Only for item writes; other writes leave slots raw.
 */
async function editLevelWithItems(
  app: FastifyInstance,
  mutate: (levelJson: unknown) => void,
): Promise<void> {
  if (!isInventoryAvailable() || !isSaveEditAvailable()) {
    throw new Error('Inventory editing needs the converter and Docker container control')
  }
  const env = loadEnv()
  const sav = levelSavPath()
  const jsonPath = `${sav}.json`

  app.log.info('inventory edit: stopping the game container')
  await stopContainer()
  try {
    createBackup('pre-edit')
    if (existsSync(jsonPath)) rmSync(jsonPath)
    await run(env.PYTHON_BIN, [convertScript(), sav, jsonPath], {
      cwd: env.SAVE_TOOLS_DIR,
      maxBuffer: 256 * 1024 * 1024,
    })
    try {
      const json = parseSaveJson(await readFile(jsonPath, 'utf8'))
      mutate(json)
      await writeFile(jsonPath, stringifySaveJson(json))
      await jsonToSav(jsonPath) // default convert re-encodes decoded slots via our encode
    } finally {
      if (existsSync(jsonPath)) rmSync(jsonPath)
    }
  } finally {
    app.log.info('inventory edit: starting the game container')
    await startContainer()
  }
}

/** The GUID of a player's main (Common) inventory container, from their save. */
export async function commonContainerGuid(uid: string): Promise<string> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  const inv = deepFind(await readSaveJson(path), 'InventoryInfo')
  const guid = hex(dig(inv, 'value', 'CommonContainerId', 'value', 'ID', 'value'))
  if (!guid) throw new Error('Could not resolve the player inventory container')
  return guid
}

/** All of a player's inventory container guids (bag/key items/weapons/armor/food). */
export async function playerContainerGuids(uid: string): Promise<string[]> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  const inv = deepFind(await readSaveJson(path), 'InventoryInfo')
  const guids: string[] = []
  for (const [key] of CONTAINERS) {
    const g = hex(dig(inv, 'value', key, 'value', 'ID', 'value'))
    if (g) guids.push(g)
  }
  if (!guids.length) throw new Error('Could not resolve the player inventory containers')
  return guids
}

/** A player's Pal Box (deposit storage) container guid, from their player file. */
export async function palBoxContainerGuid(uid: string): Promise<string> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  const node = deepFind(await readSaveJson(path), 'PalStorageContainerId')
  const guid = hex(dig(node, 'value', 'ID', 'value'))
  if (!guid) throw new Error('Could not resolve the player pal box container')
  return guid
}

/** Give a player `count` of `staticId` (their common inventory container). */
export async function giveItem(
  app: FastifyInstance,
  uid: string,
  staticId: string,
  count: number,
  equip?: EquipKind,
): Promise<void> {
  const guid = await commonContainerGuid(uid)
  await editLevelWithItems(app, (json) =>
    equip
      ? addEquipmentToContainer(json, guid, staticId, count, equip)
      : addItemToContainer(json, guid, staticId, count),
  )
}
