import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  loginRequestSchema,
  type AuthConfig,
  type SessionResponse,
  type SessionUser,
} from '@tsuki/types'
import { loadEnv } from '../config/env'
import { authenticate, sessionCookieOptions } from '../plugins/auth'
import {
  authorizeDiscordUser,
  buildAuthorizeUrl,
  discordEnabled,
  exchangeCode,
  fetchDiscordUser,
  fetchGuildMembership,
  toSessionUser,
} from '../services/discord-auth'

const ADMIN: SessionUser = {
  id: 'admin',
  name: 'Admin',
  role: 'admin',
  avatar: null,
  via: 'password',
}
const STATE_COOKIE = 'tsuki_oauth_state'

/** Length-independent, timing-safe string comparison via fixed-size digests. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

async function issueSession(reply: FastifyReply, user: SessionUser): Promise<void> {
  const token = await reply.jwtSign(user)
  reply.setCookie(loadEnv().COOKIE_NAME, token, sessionCookieOptions())
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv()

  app.get('/auth/config', async (): Promise<AuthConfig> => ({
    passwordLogin: true,
    discord: discordEnabled(),
  }))

  app.post('/auth/login', async (request, reply): Promise<SessionResponse> => {
    const body = loginRequestSchema.parse(request.body)
    if (!safeEqual(body.password, env.AUTH_PASSWORD)) {
      return reply.status(401).send({ message: 'Invalid password' })
    }
    await issueSession(reply, ADMIN)
    return { user: ADMIN }
  })

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(env.COOKIE_NAME, sessionCookieOptions())
    return { ok: true }
  })

  app.get('/auth/me', { preHandler: authenticate }, async (request): Promise<SessionResponse> => {
    const { id, name, role, avatar, via } = request.user
    return { user: { id, name, role, avatar, via } }
  })

  // ---- Discord OAuth ----
  app.get('/auth/discord', async (_request, reply) => {
    if (!discordEnabled())
      return reply.status(404).send({ message: 'Discord login is not enabled' })
    const state = randomBytes(16).toString('hex')
    reply.setCookie(STATE_COOKIE, state, { ...sessionCookieOptions(), maxAge: 600 })
    return reply.redirect(buildAuthorizeUrl(state))
  })

  app.get('/auth/discord/callback', async (request, reply) => {
    if (!discordEnabled())
      return reply.status(404).send({ message: 'Discord login is not enabled' })

    const { code, state } = request.query as { code?: string; state?: string }
    const expected = request.cookies[STATE_COOKIE]
    reply.clearCookie(STATE_COOKIE, sessionCookieOptions())
    if (!code || !state || !expected || state !== expected) {
      return reply.redirect('/login?error=state')
    }

    try {
      const accessToken = await exchangeCode(code)
      const user = await fetchDiscordUser(accessToken)
      const membership = env.DISCORD_GUILD_ID
        ? await fetchGuildMembership(accessToken, env.DISCORD_GUILD_ID)
        : { isMember: false, roles: [] }
      const { allowed, role } = authorizeDiscordUser(user, membership)
      if (!allowed) return reply.redirect('/login?error=forbidden')

      await issueSession(reply, toSessionUser(user, role))
      return reply.redirect('/')
    } catch (error) {
      request.log.error({ err: error }, 'Discord OAuth callback failed')
      return reply.redirect('/login?error=discord')
    }
  })
}
