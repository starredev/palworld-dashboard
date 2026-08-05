import { describe, expect, it } from 'vitest'
import { buildApp } from '../app'

describe('auth routes', () => {
  it('rejects a wrong password', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'nope' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('logs in, sets a cookie, and authorizes /auth/me', async () => {
    const app = await buildApp()

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { password: 'admin' },
    })
    expect(login.statusCode).toBe(200)
    const cookie = login.cookies.find((c) => c.name === 'tsuki_session')
    expect(cookie?.value).toBeTruthy()

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { tsuki_session: cookie!.value },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toEqual({
      user: { id: 'admin', name: 'Admin', role: 'admin', avatar: null, via: 'password' },
    })

    await app.close()
  })

  it('blocks /auth/me without a session', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
