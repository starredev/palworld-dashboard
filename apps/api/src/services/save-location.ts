import type { Vec3 } from '@tsuki/types'

/**
 * Recursively find the first value stored under `key` anywhere in the parsed
 * save tree. palworld-save-tools nests properties as `{ value: {...}, type }`,
 * and the exact parent path to `LastTransform` inside a player .sav isn't
 * pinned down by the tool docs — so we locate it defensively by name.
 */
export function deepFind(node: unknown, key: string): unknown {
  if (!node || typeof node !== 'object') return undefined
  const obj = node as Record<string, unknown>
  if (key in obj) return obj[key]
  for (const v of Object.values(obj)) {
    const found = deepFind(v, key)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * The mutable `{x,y,z}` Vector inside a player's `LastTransform.Translation`.
 * Returns a reference INTO `json`, so callers can read or assign through it.
 * `null` when the field is absent or malformed — callers must handle that
 * rather than silently writing to nothing.
 */
export function locateTranslation(json: unknown): Vec3 | null {
  const lastTransform = deepFind(json, 'LastTransform') as
    { value?: { Translation?: { value?: unknown } } } | undefined
  const vec = lastTransform?.value?.Translation?.value as Partial<Vec3> | undefined
  if (vec && typeof vec.x === 'number' && typeof vec.y === 'number' && typeof vec.z === 'number') {
    return vec as Vec3
  }
  return null
}

/** Read a player's world position, or `null` if the save has no LastTransform. */
export function readLocation(json: unknown): Vec3 | null {
  const vec = locateTranslation(json)
  return vec ? { x: vec.x, y: vec.y, z: vec.z } : null
}

/**
 * Set a player's world position in-place. Throws when the field is missing so a
 * bad save or a shape change surfaces loudly instead of silently no-op'ing.
 */
export function setLocation(json: unknown, coords: Vec3): void {
  const vec = locateTranslation(json)
  if (!vec) throw new Error('Player save has no LastTransform.Translation to write')
  vec.x = coords.x
  vec.y = coords.y
  vec.z = coords.z
}
