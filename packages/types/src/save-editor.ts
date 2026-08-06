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

/**
 * Read-only player detail sourced from the small `Players/<uid>.sav` file only
 * (no Level.sav decode). HP/level/stats/pals live in Level.sav and come later.
 */
export const playerDetailSchema = z.object({
  available: z.boolean(),
  techPoints: z.number().nullable(),
  bossTechPoints: z.number().nullable(),
  recipeCount: z.number().nullable(),
  lastOnline: z.string().nullable(),
})
export type PlayerDetail = z.infer<typeof playerDetailSchema>

/** A pal owned by a player, summarised from Level.sav. */
export const palSummarySchema = z.object({
  species: z.string(),
  nickname: z.string().nullable(),
  level: z.number(),
  gender: z.string().nullable(),
})
export type PalSummary = z.infer<typeof palSummarySchema>

/**
 * A player's in-world stats + owned pals, from Level.sav's
 * CharacterSaveParameterMap. `found` is false when no matching player record
 * exists (e.g. brand-new player). Reading this decodes the whole Level.sav.
 */
export const playerStatsSchema = z.object({
  available: z.boolean(),
  found: z.boolean(),
  nickName: z.string().nullable(),
  level: z.number().nullable(),
  exp: z.number().nullable(),
  hp: z.number().nullable(),
  hunger: z.number().nullable(),
  sanity: z.number().nullable(),
  pals: z.array(palSummarySchema),
})
export type PlayerStats = z.infer<typeof playerStatsSchema>

/** Count of player vs pal records in Level.sav — a cheap decode health check. */
export const levelSummarySchema = z.object({
  available: z.boolean(),
  players: z.number(),
  pals: z.number(),
})
export type LevelSummary = z.infer<typeof levelSummarySchema>

/** Set a player's technology points (at least one field required). */
export const techPointsInputSchema = z
  .object({
    technologyPoint: z.number().int().min(0).max(1_000_000).optional(),
    bossTechnologyPoint: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((v) => v.technologyPoint !== undefined || v.bossTechnologyPoint !== undefined, {
    message: 'Provide technologyPoint and/or bossTechnologyPoint',
  })
export type TechPointsInput = z.infer<typeof techPointsInputSchema>
