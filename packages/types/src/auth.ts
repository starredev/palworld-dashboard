import { z } from 'zod'

/** Credentials submitted to `POST /auth/login`. */
export const loginRequestSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

/** The authenticated panel operator. Single-admin model for now. */
export const sessionUserSchema = z.object({
  id: z.string(),
  role: z.literal('admin'),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

/** Response from `POST /auth/login` and `GET /auth/me`. */
export const sessionResponseSchema = z.object({
  user: sessionUserSchema,
})
export type SessionResponse = z.infer<typeof sessionResponseSchema>
