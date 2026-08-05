import type { SessionUser } from '@tsuki/types'
import { loadEnv } from '../config/env'

const DISCORD_API = 'https://discord.com/api'

export interface DiscordUser {
  id: string
  username: string
  global_name?: string | null
  avatar?: string | null
}

/** Discord login is available only when the client + secret + callback are set. */
export function discordEnabled(): boolean {
  const env = loadEnv()
  return Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.DISCORD_REDIRECT_URI)
}

/** The Discord consent URL to redirect the browser to. */
export function buildAuthorizeUrl(state: string): string {
  const env = loadEnv()
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID ?? '',
    redirect_uri: env.DISCORD_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: 'identify guilds',
    state,
    prompt: 'none',
  })
  return `${DISCORD_API}/oauth2/authorize?${params.toString()}`
}

async function postForm(path: string, body: URLSearchParams): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
}

/** Exchange an OAuth code for an access token. */
export async function exchangeCode(code: string): Promise<string> {
  const env = loadEnv()
  const res = await postForm(
    '/oauth2/token',
    new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID ?? '',
      client_secret: env.DISCORD_CLIENT_SECRET ?? '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI ?? '',
    }),
  )
  if (!res.ok) throw new Error(`Discord token exchange failed (${res.status})`)
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('Discord token exchange returned no access_token')
  return json.access_token
}

async function getJson<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Discord ${path} failed (${res.status})`)
  return (await res.json()) as T
}

export function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  return getJson<DiscordUser>('/users/@me', accessToken)
}

export function fetchDiscordGuildIds(accessToken: string): Promise<string[]> {
  return getJson<{ id: string }[]>('/users/@me/guilds', accessToken).then((gs) =>
    gs.map((g) => g.id),
  )
}

/**
 * Decide whether a Discord user may sign in and with what role. Fails closed:
 * if neither a guild nor an allowlist is configured, nobody is allowed.
 */
export function authorizeDiscordUser(
  user: DiscordUser,
  guildIds: string[],
): { allowed: boolean; role: SessionUser['role'] } {
  const env = loadEnv()
  const gate = Boolean(env.DISCORD_GUILD_ID) || env.DISCORD_ALLOWED_IDS.length > 0
  if (!gate) return { allowed: false, role: 'viewer' }

  const byGuild = env.DISCORD_GUILD_ID ? guildIds.includes(env.DISCORD_GUILD_ID) : false
  const byList = env.DISCORD_ALLOWED_IDS.includes(user.id)
  const allowed = byGuild || byList
  const role: SessionUser['role'] = env.DISCORD_ADMIN_IDS.includes(user.id) ? 'admin' : 'viewer'
  return { allowed, role }
}

/** Build the panel session user from a verified, authorized Discord identity. */
export function toSessionUser(user: DiscordUser, role: SessionUser['role']): SessionUser {
  return {
    id: `discord:${user.id}`,
    name: user.global_name || user.username,
    role,
    avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
    via: 'discord',
  }
}
