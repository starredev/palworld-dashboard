import { existsSync } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import type { PlayerDetail, TechPointsInput } from '@tsuki/types'
import { readSaveJson } from './save-editor'
import { editSaveFile } from './save-edit'
import { deepFind } from './save-location'
import { playerSavePath } from './save-teleport'

// palworld-save-tools wraps a value as `{ value: ..., type: '...' }`. These
// helpers read/guard that shape without asserting on the exact parent path.
interface ValueNode {
  value: unknown
}
function isValueNode(node: unknown): node is ValueNode {
  return typeof node === 'object' && node !== null && 'value' in node
}
function numFrom(node: unknown): number | null {
  return isValueNode(node) && typeof node.value === 'number' ? node.value : null
}

/** .NET ticks (100 ns since 0001-01-01) → ISO string. */
function ticksToIso(node: unknown): string | null {
  const ticks = isValueNode(node) ? node.value : null
  if (typeof ticks !== 'number' || ticks <= 0) return null
  // ms between 0001-01-01 and the Unix epoch, subtracted after converting ticks.
  const ms = ticks / 10_000 - 62_135_596_800_000
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function recipeCount(json: unknown): number | null {
  const node = deepFind(json, 'UnlockedRecipeTechnologyNames')
  const values = isValueNode(node) && isValueNode(node.value) ? node.value.value : null
  return Array.isArray(values) ? values.length : null
}

/** Read player detail from the small player file only (no Level.sav decode). */
export async function readPlayerDetail(uid: string): Promise<Omit<PlayerDetail, 'available'>> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  const json = await readSaveJson(path)
  return {
    techPoints: numFrom(deepFind(json, 'TechnologyPoint')),
    bossTechPoints: numFrom(deepFind(json, 'bossTechnologyPoint')),
    recipeCount: recipeCount(json),
    lastOnline: ticksToIso(deepFind(json, 'Timestamp')),
  }
}

/** Set tech points in-place; throws if a requested field is absent from the save. */
export function setTechPoints(json: unknown, input: TechPointsInput): void {
  const assign = (key: string, value: number) => {
    const node = deepFind(json, key)
    if (!isValueNode(node)) throw new Error(`Player save has no ${key} field`)
    node.value = value
  }
  if (input.technologyPoint !== undefined) assign('TechnologyPoint', input.technologyPoint)
  if (input.bossTechnologyPoint !== undefined)
    assign('bossTechnologyPoint', input.bossTechnologyPoint)
}

/** Give/set a player's tech points via the safe edit pipeline (player file only). */
export async function giveTechPoints(
  app: FastifyInstance,
  uid: string,
  input: TechPointsInput,
): Promise<void> {
  const path = playerSavePath(uid)
  if (!existsSync(path)) throw new Error('Player save not found')
  await editSaveFile(app, path, (json) => setTechPoints(json, input))
}
