import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { loginRequestSchema, type SessionResponse, type SessionUser } from '@tsuki/types'
import { loadEnv } from '../config/env'
import { authenticate, sessionCookieOptions } from '../plugins/auth'

const ADMIN: SessionUser = { id: 'admin', role: 'admin' }

/** Length-independent, timing-safe string comparison via fixed-size digests. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv()

  app.post('/auth/login', async (request, reply): Promise<SessionResponse> => {
    const body = loginRequestSchema.parse(request.body)

    if (!safeEqual(body.password, env.AUTH_PASSWORD)) {
      return reply.status(401).send({ message: 'Invalid password' })
    }

    const token = await reply.jwtSign(ADMIN)
    reply.setCookie(env.COOKIE_NAME, token, sessionCookieOptions())
    return { user: ADMIN }
  })

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(env.COOKIE_NAME, sessionCookieOptions())
    return { ok: true }
  })

  app.get('/auth/me', { preHandler: authenticate }, async (request): Promise<SessionResponse> => ({
    user: { id: request.user.id, role: request.user.role },
  }))
}
