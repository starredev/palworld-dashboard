import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
  const out = `${levelSavPath()}.inv.json`
  if (existsSync(out)) rmSync(out)
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

/** A decoded slot value for a stackable item (matches encode_bytes' fields). */
function packedValue(slotIndex: number, staticId: string, count: number, trailingLen: number) {
  return {
    slot_index: slotIndex,
    count,
    item: {
      static_id: staticId,
      dynamic_id: { created_world_id: ZERO_GUID, local_id_in_created_world: ZERO_GUID },
    },
    trailing_bytes: new Array(Math.max(0, trailingLen)).fill(0) as number[],
  }
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
  const entries = dig(deepFind(levelJson, 'ItemContainerSaveData'), 'value')
  const entry = Array.isArray(entries)
    ? entries.find((e) => hex(dig(e, 'key', 'ID', 'value')) === guidHex)
    : undefined
  const slots = dig(entry, 'value', 'Slots', 'value', 'values')
  if (!Array.isArray(slots)) throw new Error('Inventory container not found')

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

  // Append into spare capacity. Only possible when SlotNum (capacity) is known;
  // pick the lowest slot index not already taken.
  const slotNum = dig(entry, 'value', 'SlotNum', 'value')
  if (typeof slotNum === 'number') {
    const used = new Set(
      slots
        .map((s) => dig(s, 'RawData', 'value', 'slot_index'))
        .filter((n): n is number => typeof n === 'number'),
    )
    let free = -1
    for (let i = 0; i < slotNum; i++)
      if (!used.has(i)) {
        free = i
        break
      }
    if (free >= 0) {
      // Deep-clone an existing slot (whole struct incl. CustomVersionData) so the
      // new slot re-encodes with the right property shape, then set its payload.
      const template = anySlotTemplate(levelJson, slots)
      const clone: unknown = template ? JSON.parse(JSON.stringify(template)) : null
      const rawData = dig(clone, 'RawData') as Record<string, unknown> | undefined
      if (clone && rawData && typeof rawData === 'object') {
        const prev = dig(rawData, 'value', 'trailing_bytes')
        rawData.value = packedValue(free, staticId, count, Array.isArray(prev) ? prev.length : 0)
        slots.push(clone)
        return
      }
    }
  }
  throw new Error('Inventory is full (no free slot)')
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
): Promise<void> {
  const guid = await commonContainerGuid(uid)
  await editLevelWithItems(app, (json) => addItemToContainer(json, guid, staticId, count))
}
