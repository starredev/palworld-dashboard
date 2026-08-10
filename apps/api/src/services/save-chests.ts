import { execFile } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { LockedChest } from '@tsuki/types'
import { loadEnv } from '../config/env'
import { isSaveEditorAvailable, parseSaveJson, tempJsonPath } from './save-editor'
import { deepFind } from './save-location'
import { findWorldSaveDir } from './save-teleport'

const run = promisify(execFile)

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

function convertFullScript(): string {
  return join(loadEnv().SAVE_TOOLS_DIR, 'convert_full.py')
}
function levelSavPath(): string {
  return join(findWorldSaveDir(), 'Level.sav')
}

/** Reading/editing chest locks needs the save editor AND the full-decode script. */
export function isChestsAvailable(): boolean {
  return isSaveEditorAvailable() && existsSync(convertFullScript())
}

/** Decode Level.sav with ALL custom decoders enabled (map objects included). */
async function readLevelFull(): Promise<unknown> {
  const env = loadEnv()
  // Unique output so concurrent full-decode reads don't clobber each other.
  const out = tempJsonPath(levelSavPath(), 'full')
  await run(env.PYTHON_BIN, [convertFullScript(), levelSavPath(), out], {
    cwd: env.SAVE_TOOLS_DIR,
    maxBuffer: 256 * 1024 * 1024,
  })
  try {
    return parseSaveJson(await readFile(out, 'utf8'))
  } finally {
    if (existsSync(out)) rmSync(out)
  }
}

// Friendly names for the buildable storage chests; unknown kinds fall back to a
// prettified MapObjectId.
const CHEST_LABELS: Record<string, string> = {
  ItemChest: 'Wooden Chest',
  ItemChest_02: 'Chest',
  ItemChest_03: 'Refined Chest',
}
const prettyKind = (kind: string): string => kind.replace(/_/g, ' ')

/** The `worldSaveData.value` object, located defensively. */
function worldOf(levelJson: unknown): unknown {
  return dig(deepFind(levelJson, 'worldSaveData'), 'value')
}

/** map-object entries array (MapObjectSaveData is an ArrayProperty → .value.values). */
function mapObjectEntries(world: unknown): unknown[] {
  const val = dig(world, 'MapObjectSaveData', 'value')
  const entries = Array.isArray(val) ? val : dig(val, 'values')
  return Array.isArray(entries) ? entries : []
}

/** A map-object's PasswordLock module RawData ({lock_state, password, ...}) or null. */
function passwordLock(entry: unknown): Record<string, unknown> | null {
  const modules = dig(entry, 'ConcreteModel', 'value', 'ModuleMap', 'value')
  if (!Array.isArray(modules)) return null
  for (const kv of modules) {
    if (String(dig(kv, 'key')).endsWith('PasswordLock')) {
      const raw = dig(kv, 'value', 'RawData', 'value')
      return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    }
  }
  return null
}

/** uid(lower) → nickname, from Level.sav's CharacterSaveParameterMap. */
function playerNames(world: unknown): Map<string, string | null> {
  const names = new Map<string, string | null>()
  const chars = dig(world, 'CharacterSaveParameterMap', 'value')
  if (Array.isArray(chars)) {
    for (const e of chars) {
      const p = dig(e, 'value', 'RawData', 'value', 'object', 'SaveParameter', 'value')
      if (p && dig(p, 'IsPlayer', 'value') === true) {
        const uid = hex(dig(e, 'key', 'PlayerUId', 'value'))
        const nn = dig(p, 'NickName', 'value')
        if (uid) names.set(uid, typeof nn === 'string' ? nn : null)
      }
    }
  }
  return names
}

/**
 * Every password-locked storage chest in the save, optionally filtered to one
 * owner (the player who built it). "Locked" means its PasswordLock module holds
 * a non-empty password.
 */
export async function readLockedChests(ownerUid?: string): Promise<LockedChest[]> {
  const world = worldOf(await readLevelFull())
  const names = playerNames(world)
  const nameOf = (uid: string): string | null => {
    if (!uid || /^0+$/.test(uid)) return null
    return names.get(uid) ?? uid.slice(0, 8)
  }
  const target = ownerUid ? hex(ownerUid) : null

  const chests: LockedChest[] = []
  for (const entry of mapObjectEntries(world)) {
    const lock = passwordLock(entry)
    const password = typeof lock?.password === 'string' ? lock.password : ''
    if (!password) continue // only chests with an actual password set

    const model = dig(entry, 'Model', 'value', 'RawData', 'value')
    const ownerHex = hex(dig(model, 'build_player_uid'))
    if (target && ownerHex !== target) continue

    const id = String(dig(model, 'instance_id') ?? '')
    if (!id) continue
    const kind = String(dig(entry, 'MapObjectId', 'value') ?? '')
    const infos = Array.isArray(lock?.player_infos) ? (lock.player_infos as unknown[]) : []
    const tr = dig(model, 'initital_transform_cache', 'translation')

    chests.push({
      id,
      kind,
      label: CHEST_LABELS[kind] ?? prettyKind(kind),
      ownerUid: ownerHex || null,
      ownerName: nameOf(ownerHex),
      password,
      access: infos.map((i) => nameOf(hex(dig(i, 'player_uid')))).filter((n): n is string => !!n),
      location: { x: num(dig(tr, 'x')), y: num(dig(tr, 'y')), z: num(dig(tr, 'z')) },
    })
  }
  return chests
}

/**
 * Clear a chest's password lock in the parsed (full-decode) Level.sav JSON:
 * empties the password + unlock list and resets `lock_state` to the value an
 * un-locked chest carries. Mutates in place. Throws when the chest or its lock
 * module isn't found.
 */
export function unlockChestMutate(levelJson: unknown, chestId: string): void {
  const want = hex(chestId)
  for (const entry of mapObjectEntries(worldOf(levelJson))) {
    if (hex(dig(entry, 'Model', 'value', 'RawData', 'value', 'instance_id')) !== want) continue
    const lock = passwordLock(entry)
    if (!lock) throw new Error('Chest has no password lock')
    lock.lock_state = 1
    lock.password = ''
    lock.player_infos = []
    return
  }
  throw new Error('Chest not found')
}
