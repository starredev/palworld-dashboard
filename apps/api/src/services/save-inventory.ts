import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { InventoryResponse } from '@tsuki/types'
import { loadEnv } from '../config/env'
import { isSaveEditorAvailable, readSaveJson } from './save-editor'
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
