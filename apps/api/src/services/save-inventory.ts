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
import { isSaveEditorAvailable, jsonToSav, readSaveJson } from './save-editor'
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
    return JSON.parse(await readFile(out, 'utf8'))
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

/**
 * Add `count` of `staticId` to the container with GUID `guidHex`. Stacks onto an
 * existing slot of that item, else fills an empty ("None") slot in place. Throws
 * if the container isn't found or is full. Returns the mutated levelJson.
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
  for (const slot of slots) {
    const raw = slotRaw(slot)
    if (raw && raw.item.static_id === 'None') {
      raw.item.static_id = staticId
      raw.count = count
      return
    }
  }
  throw new Error('Inventory is full (no free slot)')
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
      const json = JSON.parse(await readFile(jsonPath, 'utf8'))
      mutate(json)
      await writeFile(jsonPath, JSON.stringify(json))
      await jsonToSav(jsonPath) // default convert re-encodes decoded slots via our encode
    } finally {
      if (existsSync(jsonPath)) rmSync(jsonPath)
    }
  } finally {
    app.log.info('inventory edit: starting the game container')
    await startContainer()
  }
}

/** Give a player `count` of `staticId` (their common inventory container). */
export async function giveItem(
  app: FastifyInstance,
  uid: string,
  staticId: string,
  count: number,
): Promise<void> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  const inv = deepFind(await readSaveJson(path), 'InventoryInfo')
  const guid = hex(dig(inv, 'value', 'CommonContainerId', 'value', 'ID', 'value'))
  if (!guid) throw new Error('Could not resolve the player inventory container')
  await editLevelWithItems(app, (json) => addItemToContainer(json, guid, staticId, count))
}
