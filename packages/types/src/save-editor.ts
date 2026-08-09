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
  /** Condensation stars (0–4). Stored as the `Rank` byte, which is stars + 1. */
  stars: z.number(),
  talentHp: z.number().nullable(),
  talentShot: z.number().nullable(),
  talentDefense: z.number().nullable(),
  lucky: z.boolean(),
  /** Passive skill internal ids (e.g. "MoveSpeed_up_3"). */
  passives: z.array(z.string()),
})
export type PalSummary = z.infer<typeof palSummarySchema>

/** Edit one pal (all fields optional; at least one required). */
export const palEditInputSchema = z
  .object({
    level: z.number().int().min(1).max(100).optional(),
    /** Condensation stars 0–4 (written as Rank = stars + 1). */
    stars: z.number().int().min(0).max(4).optional(),
    talentHp: z.number().int().min(0).max(100).optional(),
    talentShot: z.number().int().min(0).max(100).optional(),
    talentDefense: z.number().int().min(0).max(100).optional(),
    heal: z.boolean().optional(),
    /** Replace the pal's passive skills (internal ids). Max 4, deduped. */
    passives: z.array(z.string().min(1)).max(4).optional(),
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
  // High cap so gold (the `Money` item, effectively unbounded) can be topped up;
  // normal items just clamp to their own max stack in-game.
  count: z.number().int().min(1).max(9_999_999),
})
export type GiveItemInput = z.infer<typeof giveItemInputSchema>

/**
 * A password-locked storage chest, read from Level.sav's MapObjectSaveData
 * (the concrete model's `PasswordLock` module). `id` is the map-object instance
 * id used to target the chest for an unlock. `password` is only exposed on the
 * admin-gated read endpoint.
 */
export const lockedChestSchema = z.object({
  id: z.string(),
  /** Raw MapObjectId, e.g. "ItemChest_02". */
  kind: z.string(),
  /** Friendly label, e.g. "Wooden Chest". */
  label: z.string(),
  ownerUid: z.string().nullable(),
  ownerName: z.string().nullable(),
  password: z.string(),
  /** Names (or uid prefixes) of players who have unlocked it. */
  access: z.array(z.string()),
  location: vec3Schema,
})
export type LockedChest = z.infer<typeof lockedChestSchema>

export const lockedChestsResponseSchema = z.object({
  available: z.boolean(),
  chests: z.array(lockedChestSchema),
})
export type LockedChestsResponse = z.infer<typeof lockedChestsResponseSchema>

/**
 * A base camp from Level.sav's BaseCampSaveData. `areaRange` is the build-area
 * radius in Unreal units (cm) — divide by 100 for metres (3500 = 35 m default).
 */
export const baseCampSchema = z.object({
  id: z.string(),
  guildId: z.string().nullable(),
  guildName: z.string().nullable(),
  areaRange: z.number(),
  location: vec3Schema,
})
export type BaseCamp = z.infer<typeof baseCampSchema>

export const basesResponseSchema = z.object({
  available: z.boolean(),
  bases: z.array(baseCampSchema),
})
export type BasesResponse = z.infer<typeof basesResponseSchema>

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

/** A guild read straight from Level.sav's GroupSaveDataMap (editable source). */
export const saveGuildMemberSchema = z.object({
  uid: z.string(),
  name: z.string().nullable(),
  /** ISO timestamp of last online, when the save records it. */
  lastOnline: z.string().nullable(),
  isAdmin: z.boolean(),
})
export type SaveGuildMember = z.infer<typeof saveGuildMemberSchema>

export const saveGuildSchema = z.object({
  /** group_id (32-hex) — the handle used to target edits. */
  id: z.string(),
  name: z.string(),
  adminUid: z.string().nullable(),
  /** Personal/solo guild (EPalGroupType::IndependentGuild): one member, no leader/kick. */
  solo: z.boolean(),
  baseCount: z.number().int().nonnegative(),
  palCount: z.number().int().nonnegative(),
  members: z.array(saveGuildMemberSchema),
})
export type SaveGuild = z.infer<typeof saveGuildSchema>

export const saveGuildsResponseSchema = z.object({
  available: z.boolean(),
  guilds: z.array(saveGuildSchema),
})
export type SaveGuildsResponse = z.infer<typeof saveGuildsResponseSchema>

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
// Copy a pal from one player's storage into another player's Pal Box.
const palCopyOp = {
  type: z.literal('palCopy'),
  fromUid: z.string(),
  toUid: z.string(),
  label: z.string(),
  instanceId: z.string(),
}
const giveOp = {
  type: z.literal('giveItem'),
  uid: z.string(),
  label: z.string(),
  item: giveItemInputSchema,
}
// Move items from one player's inventory into another player's inventory.
const transferItemOp = {
  type: z.literal('transferItem'),
  fromUid: z.string(),
  toUid: z.string(),
  label: z.string(),
  item: giveItemInputSchema,
}
// Delete items from a player's inventory.
const removeItemOp = {
  type: z.literal('removeItem'),
  uid: z.string(),
  label: z.string(),
  item: giveItemInputSchema,
}
// Guild ops target a guild (group_id) rather than a player uid.
const guildRenameOp = {
  type: z.literal('guildRename'),
  guildId: z.string(),
  label: z.string(),
  name: z.string().min(1).max(64),
}
const guildLeaderOp = {
  type: z.literal('guildLeader'),
  guildId: z.string(),
  label: z.string(),
  memberUid: z.string(),
}
const guildKickOp = {
  type: z.literal('guildKick'),
  guildId: z.string(),
  label: z.string(),
  memberUid: z.string(),
}
// Clear a storage chest's password lock (MapObjectSaveData). `chestId` is the
// map-object instance id from the locked-chests read.
const chestUnlockOp = {
  type: z.literal('chestUnlock'),
  chestId: z.string(),
  label: z.string(),
}
// Set a base camp's build-area radius (BaseCampSaveData area_range, in cm).
// 500 cm (5 m) to 100000 cm (1000 m); default is 3500 (35 m).
const baseAreaOp = {
  type: z.literal('baseArea'),
  baseId: z.string(),
  areaRange: z.number().min(500).max(100_000),
  label: z.string(),
}

export const saveOpInputSchema = z.discriminatedUnion('type', [
  z.object(teleportOp),
  z.object(techOp),
  z.object(levelOp),
  z.object(refuelOp),
  z.object(statsOp),
  z.object(palEditOp),
  z.object(palCloneOp),
  z.object(palCopyOp),
  z.object(giveOp),
  z.object(transferItemOp),
  z.object(removeItemOp),
  z.object(guildRenameOp),
  z.object(guildLeaderOp),
  z.object(guildKickOp),
  z.object(chestUnlockOp),
  z.object(baseAreaOp),
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
  z.object({ ...palCopyOp, id: z.string() }),
  z.object({ ...giveOp, id: z.string() }),
  z.object({ ...transferItemOp, id: z.string() }),
  z.object({ ...removeItemOp, id: z.string() }),
  z.object({ ...guildRenameOp, id: z.string() }),
  z.object({ ...guildLeaderOp, id: z.string() }),
  z.object({ ...guildKickOp, id: z.string() }),
  z.object({ ...chestUnlockOp, id: z.string() }),
  z.object({ ...baseAreaOp, id: z.string() }),
])
export type SaveOp = z.infer<typeof saveOpSchema>

export const saveBatchSchema = z.object({ ops: z.array(saveOpSchema) })
export type SaveBatch = z.infer<typeof saveBatchSchema>

export const batchApplyResultSchema = z.object({
  applied: z.number(),
  failed: z.array(z.object({ label: z.string(), error: z.string() })),
})
export type BatchApplyResult = z.infer<typeof batchApplyResultSchema>
