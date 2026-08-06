import { z } from 'zod'

/** Public, runtime app configuration served by the API to the browser. */
export const appConfigSchema = z.object({
  /** Absolute URL of the live-map to embed, or null to fall back to :3001. */
  liveMapUrl: z.string().nullable(),
  /** Optional Palworld map image URL for the built-in coordinate map background. */
  mapImageUrl: z.string().nullable(),
  /** World bounds of that image: [xTopLeft, yTopLeft, xBottomRight, yBottomRight]. */
  mapBounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  /** Optional banner image shown across the top bar to brand the panel. */
  headerImageUrl: z.string().nullable(),
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

// ---- Config profiles & scheduled events (e.g. a "Double EXP weekend") ----

/** A named snapshot of the OptionSettings body, applied with one click. */
export const configProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  /** The OptionSettings body (contents inside the outer parentheses). */
  body: z.string().min(1),
  /** Optional broadcast sent when this profile is applied. */
  announce: z.string().max(500).default(''),
})
export type ConfigProfile = z.infer<typeof configProfileSchema>

/** Create/replace payload — no id (assigned server-side, replaced by name). */
export const configProfileInputSchema = configProfileSchema.omit({ id: true })
export type ConfigProfileInput = z.infer<typeof configProfileInputSchema>

const hhmm = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .nullable()
  .default(null)
const dayIdx = z.number().int().min(0).max(6).nullable().default(null) // 0 = Sunday

/**
 * A scheduled event: activate `profileId`, then revert to `revertProfileId`.
 * `once` uses fixed start/end datetimes; `weekly` recurs every week within a
 * day+time window (which may wrap the week, e.g. Fri 18:00 → Mon 06:00). Both
 * transitions force-restart + announce.
 */
export const configEventSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  profileId: z.string(),
  revertProfileId: z.string(),
  recurrence: z.enum(['once', 'weekly']).default('once'),
  // once
  startsAt: z.string().datetime().nullable().default(null),
  endsAt: z.string().datetime().nullable().default(null),
  activated: z.boolean().default(false),
  reverted: z.boolean().default(false),
  // weekly
  startDay: dayIdx,
  startTime: hhmm,
  endDay: dayIdx,
  endTime: hhmm,
  active: z.boolean().default(false), // weekly: currently inside its window
})
export type ConfigEvent = z.infer<typeof configEventSchema>

export const configEventInputSchema = z
  .object({
    name: z.string().min(1).max(60),
    profileId: z.string(),
    revertProfileId: z.string(),
    recurrence: z.enum(['once', 'weekly']).default('once'),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    startDay: z.number().int().min(0).max(6).nullable().optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    endDay: z.number().int().min(0).max(6).nullable().optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
  })
  .refine(
    (v) =>
      v.recurrence === 'weekly'
        ? v.startDay != null && !!v.startTime && v.endDay != null && !!v.endTime
        : !!v.startsAt && !!v.endsAt,
    { message: 'Fill in the schedule fields' },
  )
export type ConfigEventInput = z.infer<typeof configEventInputSchema>

/** Event with a derived lifecycle status, for display. */
export const configEventViewSchema = configEventSchema.extend({
  status: z.enum(['upcoming', 'active', 'done']),
})
export type ConfigEventView = z.infer<typeof configEventViewSchema>

export const configProfilesStateSchema = z.object({
  profiles: z.array(configProfileSchema),
  events: z.array(configEventViewSchema),
})
export type ConfigProfilesState = z.infer<typeof configProfilesStateSchema>
