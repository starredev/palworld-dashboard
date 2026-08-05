import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import type { SessionUser } from '@tsuki/types'
import { loadEnv } from '../config/env'

/** Register cookie + JWT support. Tokens are read from an HTTP-only cookie. */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  const env = loadEnv()

  await app.register(cookie)
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: env.COOKIE_NAME, signed: false },
    sign: { expiresIn: env.SESSION_TTL },
  })
}

/** preHandler that rejects requests without a valid session cookie. */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    await reply.status(401).send({ message: 'Unauthorized' })
  }
}

/**
 * preHandler for mutating endpoints: must be signed in AND an admin. Viewers get
 * 403 so read-only accounts can browse but never change or restart the server.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    await reply.status(401).send({ message: 'Unauthorized' })
    return
  }
  if (request.user.role !== 'admin') {
    await reply.status(403).send({ message: 'Admins only' })
  }
}

/** Options for the session cookie, derived from the current environment. */
export function sessionCookieOptions() {
  const env = loadEnv()
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    path: '/',
  }
}

export type { SessionUser }
