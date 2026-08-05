import { z } from 'zod'

/** Public, runtime app configuration served by the API to the browser. */
export const appConfigSchema = z.object({
  /** Absolute URL of the live-map to embed, or null to fall back to :3001. */
  liveMapUrl: z.string().nullable(),
  /** Optional Palworld map image URL for the built-in coordinate map background. */
  mapImageUrl: z.string().nullable(),
  /** World bounds of that image: [xTopLeft, yTopLeft, xBottomRight, yBottomRight]. */
  mapBounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
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

/** Result of writing the ini AND force-restarting so the change takes effect. */
export const gameConfigApplyResultSchema = z.object({
  ok: z.boolean(),
  path: z.string(),
  /** True when a running server was force-stopped (restart policy brings it back). */
  restarted: z.boolean(),
})
export type GameConfigApplyResult = z.infer<typeof gameConfigApplyResultSchema>

/**
 * A daily, ini-safe automatic restart configured from the panel. The restart
 * uses a force-stop (never a graceful shutdown), so the server always reboots
 * with the current PalWorldSettings.ini instead of reverting it.
 */
export const restartScheduleSchema = z.object({
  enabled: z.boolean().default(false),
  /** Daily restart time, "HH:MM" in the API container's local timezone. */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour)')
    .default('04:00'),
  /** Warn players this many minutes before restarting (0 = no warning). */
  warnMinutes: z.coerce.number().int().min(0).max(60).default(5),
  /** Skip this occurrence if any players are online. */
  skipIfPlayersOnline: z.boolean().default(false),
})
export type RestartSchedule = z.infer<typeof restartScheduleSchema>

/** The schedule plus the next computed fire time (ISO), for display. */
export const restartScheduleStateSchema = restartScheduleSchema.extend({
  nextRun: z.string().nullable(),
})
export type RestartScheduleState = z.infer<typeof restartScheduleStateSchema>
