import { z } from 'zod'

/**
 * Whether the save-file editor is usable. Gated on the palworld-save-tools
 * converter being vendored in the api image AND the save dir being mounted.
 * `canWrite` additionally needs Docker container control (stop/start).
 */
export const saveEditorStatusSchema = z.object({
  available: z.boolean(),
  canWrite: z.boolean(),
  saveDir: z.string(),
})
export type SaveEditorStatus = z.infer<typeof saveEditorStatusSchema>

/** A world-space position in Unreal units (cm) — same space as the map x/y. */
export const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})
export type Vec3 = z.infer<typeof vec3Schema>

/** Read-only current location of a player, from their `Players/<uid>.sav`. */
export const playerLocationSchema = z.object({
  available: z.boolean(),
  location: vec3Schema.nullable(),
})
export type PlayerLocation = z.infer<typeof playerLocationSchema>

/** Teleport target coordinates (all three required — Z avoids fall/clip). */
export const teleportInputSchema = vec3Schema
export type TeleportInput = z.infer<typeof teleportInputSchema>
