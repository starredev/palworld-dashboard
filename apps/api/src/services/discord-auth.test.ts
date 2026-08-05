import { describe, expect, it } from 'vitest'

process.env.DISCORD_GUILD_ID = 'guild1'
process.env.DISCORD_ALLOWED_IDS = 'u_allow'
process.env.DISCORD_ADMIN_IDS = 'u_admin'

const { authorizeDiscordUser, toSessionUser } = await import('./discord-auth')

const user = (id: string) => ({ id, username: 'x', global_name: 'X', avatar: null })

describe('authorizeDiscordUser', () => {
  it('admits + promotes an admin id in the guild', () => {
    expect(authorizeDiscordUser(user('u_admin'), ['guild1'])).toEqual({
      allowed: true,
      role: 'admin',
    })
  })

  it('admits an allowlisted id even outside the guild, as viewer', () => {
    expect(authorizeDiscordUser(user('u_allow'), [])).toEqual({ allowed: true, role: 'viewer' })
  })

  it('admits any guild member as viewer', () => {
    expect(authorizeDiscordUser(user('u_random'), ['guild1'])).toEqual({
      allowed: true,
      role: 'viewer',
    })
  })

  it('refuses a stranger outside the guild and allowlist', () => {
    expect(authorizeDiscordUser(user('u_random'), ['other']).allowed).toBe(false)
  })
})

describe('toSessionUser', () => {
  it('builds a discord-prefixed id, name, and avatar url', () => {
    const s = toSessionUser(
      { id: '42', username: 'bob', global_name: 'Bob', avatar: 'abc' },
      'admin',
    )
    expect(s.id).toBe('discord:42')
    expect(s.name).toBe('Bob')
    expect(s.via).toBe('discord')
    expect(s.avatar).toContain('/avatars/42/abc.png')
  })
})
