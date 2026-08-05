import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import type { Vec3 } from '@tsuki/types'
import { loadEnv } from '../config/env'
import { readSaveJson } from './save-editor'
import { editSaveFile } from './save-edit'
import { readLocation, setLocation } from './save-location'

// Player save filenames are the 32-char hex PlayerUId (e.g. 75F676E0...000).
const UID_RE = /^[0-9A-Fa-f]{32}$/

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * The world save folder is `SaveGames/<serverId>/<worldGuid>/` — the dir that
 * actually contains `Level.sav` (and `Players/`). Scan up to two levels deep
 * to find it, tolerating either layout.
 */
export function findWorldSaveDir(): string {
  const root = loadEnv().PALWORLD_SAVE_DIR
  const levels = [root, ...safeChildren(root).flatMap((a) => [a, ...safeChildren(a)])]
  const match = levels.find((dir) => existsSync(join(dir, 'Level.sav')))
  if (!match) throw new Error('No world save (Level.sav) found under the save dir')
  return match
}

function safeChildren(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map((name) => join(dir, name))
      .filter(isDir)
  } catch {
    return []
  }
}

/** Absolute path to a player's `.sav`, with the uid validated against traversal. */
export function playerSavePath(uid: string): string {
  if (!UID_RE.test(uid)) throw new Error('Invalid player UID')
  return join(findWorldSaveDir(), 'Players', `${uid.toUpperCase()}.sav`)
}

/** Read a player's current world position (read-only; server can stay up). */
export async function readPlayerLocation(uid: string): Promise<Vec3 | null> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  return readLocation(await readSaveJson(path))
}

/**
 * Teleport a player by rewriting their save's LastTransform. Runs through the
 * safe pipeline (stop → backup → edit → start). Works for Xbox/Game Pass
 * players too, since it never touches the Steam-only RCON teleport command.
 */
export async function teleportPlayer(
  app: FastifyInstance,
  uid: string,
  coords: Vec3,
): Promise<void> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  await editSaveFile(app, path, (json) => setLocation(json, coords))
}
