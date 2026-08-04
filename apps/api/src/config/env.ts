import { z } from 'zod'

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
