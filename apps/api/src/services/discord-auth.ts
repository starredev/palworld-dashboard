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
    // guilds.members.read lets us read the user's roles in the configured guild.
    scope: 'identify guilds guilds.members.read',
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

export interface GuildMembership {
  isMember: boolean
  roles: string[]
}

/** The user's membership + role ids in a specific guild (via guilds.members.read). */
export async function fetchGuildMembership(
  accessToken: string,
  guildId: string,
): Promise<GuildMembership> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  // Not a member of that guild.
  if (res.status === 404 || res.status === 403) return { isMember: false, roles: [] }
  if (!res.ok) throw new Error(`Discord guild member lookup failed (${res.status})`)
  const json = (await res.json()) as { roles?: string[] }
  return { isMember: true, roles: json.roles ?? [] }
}

/**
 * Decide whether a Discord user may sign in and with what role — driven by their
 * Discord roles (ranks) in the guild, with optional user-id lists as extras.
 * Fails closed: with no guild and no id allowlist configured, nobody is allowed.
 */
export function authorizeDiscordUser(
  user: DiscordUser,
  membership: GuildMembership,
): { allowed: boolean; role: SessionUser['role'] } {
  const env = loadEnv()
  const gate = Boolean(env.DISCORD_GUILD_ID) || env.DISCORD_ALLOWED_IDS.length > 0
  if (!gate) return { allowed: false, role: 'viewer' }

  const roles = membership.roles
  const isAdmin =
    env.DISCORD_ADMIN_IDS.includes(user.id) ||
    env.DISCORD_ADMIN_ROLE_IDS.some((r) => roles.includes(r))
  const role: SessionUser['role'] = isAdmin ? 'admin' : 'viewer'

  const roleFilter = env.DISCORD_ALLOWED_ROLE_IDS
  const memberAllowed =
    membership.isMember && (roleFilter.length === 0 || roles.some((r) => roleFilter.includes(r)))
  const allowed = env.DISCORD_ALLOWED_IDS.includes(user.id) || memberAllowed
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
