import { z } from 'zod'

export const guildMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int().nonnegative().nullable(),
  online: z.boolean(),
  lastSeenAt: z.string().nullable(),
  captureTotal: z.number().int().nonnegative().nullable(),
  paldeckUnlocked: z.number().int().nonnegative().nullable(),
})
export type GuildMember = z.infer<typeof guildMemberSchema>

export const guildSchema = z.object({
  key: z.string(),
  name: z.string(),
  memberCount: z.number().int().nonnegative(),
  baseCount: z.number().int().nonnegative(),
  palCount: z.number().int().nonnegative(),
  members: z.array(guildMemberSchema),
})
export type Guild = z.infer<typeof guildSchema>

export const guildsResponseSchema = z.object({
  available: z.boolean(),
  guilds: z.array(guildSchema),
})
export type GuildsResponse = z.infer<typeof guildsResponseSchema>

/** A base-assigned (captured) Pal. */
export const palSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: z.string().nullable(),
  level: z.number().int().nonnegative().nullable(),
  guildKey: z.string().nullable(),
  guildName: z.string().nullable(),
})
export type Pal = z.infer<typeof palSchema>

export const palsResponseSchema = z.object({
  available: z.boolean(),
  pals: z.array(palSchema),
})
export type PalsResponse = z.infer<typeof palsResponseSchema>

/** A positioned entity for the built-in coordinate map. */
export const mapPointKindSchema = z.enum(['player', 'base', 'pal', 'wild', 'npc'])
export type MapPointKind = z.infer<typeof mapPointKindSchema>

export const mapPointSchema = z.object({
  id: z.string(),
  kind: mapPointKindSchema,
  name: z.string(),
  detail: z.string().nullable(),
  level: z.number().int().nonnegative().nullable(),
  guildName: z.string().nullable(),
  online: z.boolean().nullable(),
  x: z.number(),
  y: z.number(),
})
export type MapPoint = z.infer<typeof mapPointSchema>

export const mapResponseSchema = z.object({
  available: z.boolean(),
  points: z.array(mapPointSchema),
})
export type MapResponse = z.infer<typeof mapResponseSchema>
