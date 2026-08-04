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
