import { describe, expect, it } from 'vitest'

process.env.DISCORD_GUILD_ID = 'guild1'
process.env.DISCORD_ADMIN_ROLE_IDS = 'role_admin'
process.env.DISCORD_ALLOWED_ROLE_IDS = 'role_staff'

const { authorizeDiscordUser, toSessionUser } = await import('./discord-auth')

const user = (id: string) => ({ id, username: 'x', global_name: 'X', avatar: null })
const member = (roles: string[]) => ({ isMember: true, roles })

describe('authorizeDiscordUser (role-based)', () => {
  it('grants admin to a member with the admin role', () => {
    expect(authorizeDiscordUser(user('u1'), member(['role_staff', 'role_admin']))).toEqual({
      allowed: true,
      role: 'admin',
    })
  })

  it('grants viewer to a member with only the allowed (staff) role', () => {
    expect(authorizeDiscordUser(user('u2'), member(['role_staff']))).toEqual({
      allowed: true,
      role: 'viewer',
    })
  })

  it('refuses a guild member lacking the required allowed role', () => {
    expect(authorizeDiscordUser(user('u3'), member(['role_random'])).allowed).toBe(false)
  })

  it('refuses a non-member', () => {
    expect(authorizeDiscordUser(user('u4'), { isMember: false, roles: [] }).allowed).toBe(false)
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
