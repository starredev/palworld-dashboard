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
  /** GUID that identifies this exact pal — needed to target it for edits. */
  instanceId: z.string().nullable(),
  talentHp: z.number().nullable(),
  talentShot: z.number().nullable(),
  talentDefense: z.number().nullable(),
  lucky: z.boolean(),
})
export type PalSummary = z.infer<typeof palSummarySchema>

/** Edit one pal (all fields optional; at least one required). */
export const palEditInputSchema = z
  .object({
    level: z.number().int().min(1).max(100).optional(),
    talentHp: z.number().int().min(0).max(100).optional(),
    talentShot: z.number().int().min(0).max(100).optional(),
    talentDefense: z.number().int().min(0).max(100).optional(),
    heal: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Nothing to change',
  })
export type PalEditInput = z.infer<typeof palEditInputSchema>

/**
 * A player's in-world stats + owned pals, from Level.sav's
 * CharacterSaveParameterMap. `found` is false when no matching player record
 * exists (e.g. brand-new player). Reading this decodes the whole Level.sav.
 */
/** Allocated stat points (the ones spent on level-up). Null when absent. */
export const statusPointsSchema = z.object({
  health: z.number().nullable(),
  stamina: z.number().nullable(),
  attack: z.number().nullable(),
  weight: z.number().nullable(),
  captureRate: z.number().nullable(),
  workSpeed: z.number().nullable(),
})
export type StatusPoints = z.infer<typeof statusPointsSchema>

export const playerStatsSchema = z.object({
  available: z.boolean(),
  found: z.boolean(),
  nickName: z.string().nullable(),
  level: z.number().nullable(),
  exp: z.number().nullable(),
  hp: z.number().nullable(),
  hunger: z.number().nullable(),
  sanity: z.number().nullable(),
  statusPoints: statusPointsSchema.nullable(),
  pals: z.array(palSummarySchema),
})
export type PlayerStats = z.infer<typeof playerStatsSchema>

/** Edit a player's stats (all optional; at least one required). */
export const playerStatsInputSchema = z
  .object({
    level: z.number().int().min(1).max(100).optional(),
    exp: z.number().int().min(0).optional(),
    nickName: z.string().min(1).max(64).optional(),
    health: z.number().int().min(0).max(9999).optional(),
    stamina: z.number().int().min(0).max(9999).optional(),
    attack: z.number().int().min(0).max(9999).optional(),
    weight: z.number().int().min(0).max(9999).optional(),
    captureRate: z.number().int().min(0).max(9999).optional(),
    workSpeed: z.number().int().min(0).max(9999).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nothing to change' })
export type PlayerStatsInput = z.infer<typeof playerStatsInputSchema>

/** A player's inventory, resolved from the save's item containers (read-only). */
export const inventoryItemSchema = z.object({ id: z.string(), count: z.number() })
export type InventoryItem = z.infer<typeof inventoryItemSchema>

export const inventoryContainerSchema = z.object({
  name: z.string(),
  items: z.array(inventoryItemSchema),
})
export const inventoryResponseSchema = z.object({
  available: z.boolean(),
  containers: z.array(inventoryContainerSchema),
})
export type InventoryResponse = z.infer<typeof inventoryResponseSchema>

/** Give an item to a player's inventory. */
export const giveItemInputSchema = z.object({
  staticId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_]+$/),
  count: z.number().int().min(1).max(9999),
})
export type GiveItemInput = z.infer<typeof giveItemInputSchema>

/** A player as listed from the save itself (works for offline players too). */
export const savePlayerSchema = z.object({
  uid: z.string(),
  name: z.string().nullable(),
  level: z.number().nullable(),
})
export type SavePlayer = z.infer<typeof savePlayerSchema>

export const savePlayersResponseSchema = z.object({
  available: z.boolean(),
  players: z.array(savePlayerSchema),
})
export type SavePlayersResponse = z.infer<typeof savePlayersResponseSchema>

/** A player and the (base) species they own — joined with the dex data client-side. */
export const paldeckOwnerSchema = z.object({
  uid: z.string(),
  name: z.string().nullable(),
  species: z.array(z.string()),
})
export type PaldeckOwner = z.infer<typeof paldeckOwnerSchema>

export const paldeckResponseSchema = z.object({
  available: z.boolean(),
  owners: z.array(paldeckOwnerSchema),
})
export type PaldeckResponse = z.infer<typeof paldeckResponseSchema>

/** Count of player vs pal records in Level.sav — a cheap decode health check. */
export const levelSummarySchema = z.object({
  available: z.boolean(),
  players: z.number(),
  pals: z.number(),
})
export type LevelSummary = z.infer<typeof levelSummarySchema>

/** Set a player's level (Palworld caps well under 100). */
export const playerLevelInputSchema = z.object({
  level: z.number().int().min(1).max(100),
})
export type PlayerLevelInput = z.infer<typeof playerLevelInputSchema>

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

// ---- Batch edits: queue several save edits, apply all with ONE restart ----
// `label` is a human description shown in the pending list; `uid` is the player.
// (Placed last so it can reference the input schemas declared above.)
const teleportOp = {
  type: z.literal('teleport'),
  uid: z.string(),
  label: z.string(),
  coords: vec3Schema,
}
const techOp = {
  type: z.literal('techPoints'),
  uid: z.string(),
  label: z.string(),
  input: techPointsInputSchema,
}
const levelOp = {
  type: z.literal('playerLevel'),
  uid: z.string(),
  label: z.string(),
  level: z.number().int().min(1).max(100),
}
const refuelOp = { type: z.literal('refuel'), uid: z.string(), label: z.string() }
const statsOp = {
  type: z.literal('playerStats'),
  uid: z.string(),
  label: z.string(),
  input: playerStatsInputSchema,
}
const palEditOp = {
  type: z.literal('palEdit'),
  uid: z.string(),
  label: z.string(),
  instanceId: z.string(),
  input: palEditInputSchema,
}
const palCloneOp = {
  type: z.literal('palClone'),
  uid: z.string(),
  label: z.string(),
  instanceId: z.string(),
}
const giveOp = {
  type: z.literal('giveItem'),
  uid: z.string(),
  label: z.string(),
  item: giveItemInputSchema,
}

export const saveOpInputSchema = z.discriminatedUnion('type', [
  z.object(teleportOp),
  z.object(techOp),
  z.object(levelOp),
  z.object(refuelOp),
  z.object(statsOp),
  z.object(palEditOp),
  z.object(palCloneOp),
  z.object(giveOp),
])
export type SaveOpInput = z.infer<typeof saveOpInputSchema>

export const saveOpSchema = z.discriminatedUnion('type', [
  z.object({ ...teleportOp, id: z.string() }),
  z.object({ ...techOp, id: z.string() }),
  z.object({ ...levelOp, id: z.string() }),
  z.object({ ...refuelOp, id: z.string() }),
  z.object({ ...statsOp, id: z.string() }),
  z.object({ ...palEditOp, id: z.string() }),
  z.object({ ...palCloneOp, id: z.string() }),
  z.object({ ...giveOp, id: z.string() }),
])
export type SaveOp = z.infer<typeof saveOpSchema>

export const saveBatchSchema = z.object({ ops: z.array(saveOpSchema) })
export type SaveBatch = z.infer<typeof saveBatchSchema>

export const batchApplyResultSchema = z.object({
  applied: z.number(),
  failed: z.array(z.object({ label: z.string(), error: z.string() })),
})
export type BatchApplyResult = z.infer<typeof batchApplyResultSchema>
