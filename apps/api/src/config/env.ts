import { z } from 'zod'

/** Coerce empty-string env values (as Compose injects) to `undefined`. */
function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === '' ? undefined : v), schema)
}

const envSchema = z.object({
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ---- Auth (single-admin session) ----
  AUTH_PASSWORD: z.string().min(1).default('admin'),
  JWT_SECRET: z.string().min(16).default('dev-insecure-secret-change-me-please'),
  COOKIE_NAME: z.string().default('tsuki_session'),
  SESSION_TTL: z.string().default('7d'),
  // Force the session cookie's `Secure` flag. Defaults to on in production.
  // Set to `false` when serving the compose demo over plain http://localhost.
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),

  // ---- Palworld server connection (packages/sdk) ----
  // Compose injects empty strings for unset vars; treat "" as absent.
  PALWORLD_REST_URL: emptyToUndefined(z.string().url().optional()),
  PALWORLD_REST_USERNAME: z.string().default('admin'),
  PALWORLD_REST_PASSWORD: emptyToUndefined(z.string().optional()),
  PALWORLD_RCON_HOST: emptyToUndefined(z.string().optional()),
  PALWORLD_RCON_PORT: z.coerce.number().int().positive().default(25575),
  PALWORLD_RCON_PASSWORD: emptyToUndefined(z.string().optional()),

  // ---- Dashboard runtime config (served to the browser via /api/config) ----
  // Absolute URL of the live-map to embed. Empty => dashboard falls back to :3001.
  LIVEMAP_URL: emptyToUndefined(z.string().url().optional()),
  // Optional full Palworld (Palpagos) map image for the built-in map background.
  MAP_IMAGE_URL: emptyToUndefined(z.string().url().optional()),
  // World-coordinate bounds of that image as "xTopLeft,yTopLeft,xBottomRight,yBottomRight".
  // Default = the palworld-live-map palpagos.jpg bounds. Tweak to calibrate.
  MAP_BOUNDS: z.string().default('349400,724400,-1099400,-724400'),

  // ---- Live PalWorldSettings.ini editing (optional) ----
  // Path INSIDE the api container to the server's ini. Mount the Palworld data
  // dir to make it available; if the file is absent the feature stays hidden.
  PALWORLD_INI_PATH: z
    .string()
    .default('/palworld-data/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini'),

  // ---- Backups (optional) ----
  // Save games dir (inside the mounted data volume) and where zips are stored.
  PALWORLD_SAVE_DIR: z.string().default('/palworld-data/Pal/Saved/SaveGames'),
  BACKUP_DIR: z.string().default('/backups'),
  // Auto-backup every N hours (0 = disabled), keeping the newest N auto-backups.
  BACKUP_SCHEDULE_HOURS: z.coerce.number().nonnegative().default(0),
  BACKUP_RETENTION: z.coerce.number().int().positive().default(7),

  // ---- Logs viewer (optional) ----
  PALWORLD_LOG_PATH: z.string().default('/palworld-data/Pal/Saved/Logs/Pal.log'),

  // ---- Scheduled ini-safe restart (configured from the panel, persisted here) ----
  // Lives on the writable backups volume by default so it survives redeploys.
  RESTART_SCHEDULE_PATH: z.string().default('/backups/tsuki-restart-schedule.json'),

  // ---- Guilds & Pals via the live-map's GameData API (optional) ----
  GAMEDATA_URL: emptyToUndefined(z.string().url().optional()),
  GAMEDATA_STATE_PATH: z.string().default('/api/state'),
  GAMEDATA_OBJECTS_PATH: z.string().default('/api/objects'),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

/** Parse and validate `process.env` once, throwing on invalid configuration. */
export function loadEnv(): Env {
  if (cached) return cached

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }

  cached = parsed.data
  return cached
}
