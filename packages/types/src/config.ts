import { z } from 'zod'

/** Public, runtime app configuration served by the API to the browser. */
export const appConfigSchema = z.object({
  /** Absolute URL of the live-map to embed, or null to fall back to :3001. */
  liveMapUrl: z.string().nullable(),
})

export type AppConfig = z.infer<typeof appConfigSchema>

/** The live PalWorldSettings.ini, when a data volume is mounted. */
export const gameConfigSchema = z.object({
  available: z.boolean(),
  content: z.string().nullable(),
})
export type GameConfig = z.infer<typeof gameConfigSchema>

export const gameConfigUpdateSchema = z.object({
  /** The OptionSettings body (contents inside the outer parentheses). */
  body: z.string().min(1),
})
export type GameConfigUpdate = z.infer<typeof gameConfigUpdateSchema>

export const gameConfigWriteResultSchema = z.object({
  ok: z.boolean(),
  path: z.string(),
})
export type GameConfigWriteResult = z.infer<typeof gameConfigWriteResultSchema>
