import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { saveOpSchema, type BatchApplyResult, type SaveOp, type SaveOpInput } from '@tsuki/types'
import { loadEnv } from '../config/env'
import { createBackup } from './backups'
import { startContainer, stopContainer } from './container-control'
import { isSaveEditAvailable } from './save-edit'
import { jsonToSav, savToJson } from './save-editor'
import { setLocation } from './save-location'
import { setTechPoints } from './save-player-fields'
import { playerSavePath } from './save-teleport'
import {
  applyPalEdit,
  clonePalMutate,
  copyPalMutate,
  findPalRef,
  findPlayerParamsRef,
  levelSavPath,
  refuelPlayer,
  setPlayerLevel,
  setPlayerStats,
} from './save-level'
import {
  addItemToContainer,
  commonContainerGuid,
  isInventoryAvailable,
  palBoxContainerGuid,
} from './save-inventory'
import { kickGuildMemberMutate, renameGuildMutate, setGuildLeaderMutate } from './save-guild'

const run = promisify(execFile)
const stateSchema = z.object({ ops: z.array(saveOpSchema).default([]) })

// teleport + tech points live in the per-player file; everything else in Level.sav.
const PLAYER_FILE_OPS = new Set(['teleport', 'techPoints'])

function statePath(): string {
  return loadEnv().SAVE_BATCH_PATH
}
function load(): SaveOp[] {
  const p = statePath()
  if (!existsSync(p)) return []
  try {
    return stateSchema.parse(JSON.parse(readFileSync(p, 'utf8'))).ops
  } catch {
    return []
  }
}
function persist(ops: SaveOp[]): void {
  const p = statePath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify({ ops }), 'utf8')
}

export function listOps(): SaveOp[] {
  return load()
}
export function addOp(input: SaveOpInput): SaveOp {
  const op = { ...input, id: randomUUID() } as SaveOp
  persist([...load(), op])
  return op
}
export function removeOp(id: string): void {
  persist(load().filter((o) => o.id !== id))
}
export function clearOps(): void {
  persist([])
}

/** Apply one Level.sav op to the parsed (items-enabled) Level.sav JSON. */
function applyLevelOp(
  json: unknown,
  op: SaveOp,
  guids: Record<string, string>,
  boxGuids: Record<string, string>,
): void {
  if (op.type === 'palClone') return clonePalMutate(json, op.uid, op.instanceId)
  if (op.type === 'palCopy') {
    const box = boxGuids[op.toUid]
    if (!box) throw new Error('Target Pal Box container not found')
    return copyPalMutate(json, op.fromUid, op.instanceId, op.toUid, box)
  }
  if (op.type === 'giveItem') {
    const g = guids[op.uid]
    if (!g) throw new Error('Inventory container not found')
    return addItemToContainer(json, g, op.item.staticId, op.item.count)
  }
  if (op.type === 'palEdit') {
    const p = findPalRef(json, op.uid, op.instanceId)
    if (!p) throw new Error('Pal not found')
    return applyPalEdit(p, op.input)
  }
  if (op.type === 'guildRename') return renameGuildMutate(json, op.guildId, op.name)
  if (op.type === 'guildLeader') return setGuildLeaderMutate(json, op.guildId, op.memberUid)
  if (op.type === 'guildKick') return kickGuildMemberMutate(json, op.guildId, op.memberUid)
  const params = findPlayerParamsRef(json, op.uid)
  if (!params) throw new Error('Player not found in Level.sav')
  if (op.type === 'playerLevel') setPlayerLevel(params, op.level)
  else if (op.type === 'refuel') refuelPlayer(params)
  else if (op.type === 'playerStats') setPlayerStats(params, op.input)
}

/**
 * Apply every queued edit in ONE stop → backup → edit → start cycle (instead of
 * a restart per edit). Player-file ops are grouped per player; Level.sav ops
 * share a single decode/re-encode (items-enabled if any give-item is queued).
 * Individual op failures are collected, not fatal; the queue is cleared after.
 */
export async function applyBatch(app: FastifyInstance): Promise<BatchApplyResult> {
  const ops = load()
  if (!ops.length) return { applied: 0, failed: [] }
  if (!isSaveEditAvailable()) {
    throw new Error('Save editing needs the converter and Docker container control')
  }

  const failed: { label: string; error: string }[] = []
  let applied = 0
  // teleport / tech points carry a `uid` (per-player file); guild ops don't.
  type PlayerFileOp = Extract<SaveOp, { type: 'teleport' | 'techPoints' }>
  const playerOps = ops.filter((o): o is PlayerFileOp => PLAYER_FILE_OPS.has(o.type))
  const levelOps = ops.filter((o) => !PLAYER_FILE_OPS.has(o.type))

  app.log.info(`batch: applying ${ops.length} save edit(s)`)
  await stopContainer()
  try {
    createBackup('pre-edit')

    // --- Per-player file edits (teleport / tech points) ---
    const byUid = new Map<string, PlayerFileOp[]>()
    for (const o of playerOps) {
      if (!byUid.has(o.uid)) byUid.set(o.uid, [])
      byUid.get(o.uid)!.push(o)
    }
    for (const [uid, uidOps] of byUid) {
      let jsonPath: string | null = null
      try {
        jsonPath = await savToJson(playerSavePath(uid))
        const json = JSON.parse(await readFile(jsonPath, 'utf8'))
        for (const o of uidOps) {
          try {
            if (o.type === 'teleport') setLocation(json, o.coords)
            else if (o.type === 'techPoints') setTechPoints(json, o.input)
            applied++
          } catch (e) {
            failed.push({ label: o.label, error: (e as Error).message })
          }
        }
        await writeFile(jsonPath, JSON.stringify(json))
        await jsonToSav(jsonPath)
      } catch (e) {
        for (const o of uidOps) failed.push({ label: o.label, error: (e as Error).message })
      } finally {
        if (jsonPath && existsSync(jsonPath)) rmSync(jsonPath)
      }
    }

    // --- Level.sav edits (one shared decode/re-encode) ---
    if (levelOps.length) {
      const needItems = levelOps.some((o) => o.type === 'giveItem')
      const guids: Record<string, string> = {}
      if (needItems) {
        if (!isInventoryAvailable()) throw new Error('Inventory editing is not available')
        for (const o of levelOps) {
          if (o.type === 'giveItem' && !guids[o.uid])
            guids[o.uid] = await commonContainerGuid(o.uid)
        }
      }
      // pal-copy needs each target's Pal Box container guid (from their player file).
      const boxGuids: Record<string, string> = {}
      for (const o of levelOps) {
        if (o.type === 'palCopy' && !boxGuids[o.toUid])
          boxGuids[o.toUid] = await palBoxContainerGuid(o.toUid)
      }
      const sav = levelSavPath()
      let jsonPath = `${sav}.json`
      const env = loadEnv()
      if (needItems) {
        if (existsSync(jsonPath)) rmSync(jsonPath)
        await run(
          env.PYTHON_BIN,
          [join(env.SAVE_TOOLS_DIR, 'convert_with_items.py'), sav, jsonPath],
          {
            cwd: env.SAVE_TOOLS_DIR,
            maxBuffer: 256 * 1024 * 1024,
          },
        )
      } else {
        jsonPath = await savToJson(sav)
      }
      try {
        const json = JSON.parse(await readFile(jsonPath, 'utf8'))
        for (const o of levelOps) {
          try {
            applyLevelOp(json, o, guids, boxGuids)
            applied++
          } catch (e) {
            failed.push({ label: o.label, error: (e as Error).message })
          }
        }
        await writeFile(jsonPath, JSON.stringify(json))
        await jsonToSav(jsonPath)
      } finally {
        if (existsSync(jsonPath)) rmSync(jsonPath)
      }
    }
  } finally {
    app.log.info('batch: starting the game container')
    await startContainer()
  }

  clearOps()
  return { applied, failed }
}
