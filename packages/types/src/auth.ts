import { z } from 'zod'

/** Credentials submitted to `POST /auth/login` (bootstrap admin password). */
export const loginRequestSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

/** The authenticated panel operator. */
export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'viewer']),
  avatar: z.string().nullable().default(null),
  /** How they signed in — password (bootstrap admin) or Discord OAuth. */
  via: z.enum(['password', 'discord']),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

/** Response from `POST /auth/login` and `GET /auth/me`. */
export const sessionResponseSchema = z.object({
  user: sessionUserSchema,
})
export type SessionResponse = z.infer<typeof sessionResponseSchema>

/** Public auth capabilities, so the login page shows the right options. */
export const authConfigSchema = z.object({
  passwordLogin: z.boolean(),
  discord: z.boolean(),
})
export type AuthConfig = z.infer<typeof authConfigSchema>
