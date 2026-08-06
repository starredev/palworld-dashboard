import { describe, expect, it } from 'vitest'

const { buildApp } = await import('../app')

async function login(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { password: 'admin' },
  })
  return res.cookies.find((c) => c.name === 'tsuki_session')!.value
}

const UID = '75F676E0000000000000000000000000'

describe('save editor routes', () => {
  it('GET /save/status requires auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/save/status' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('GET /save/status reports unavailable when the converter is absent', async () => {
    const app = await buildApp()
    const token = await login(app)
    const res = await app.inject({
      method: 'GET',
      url: '/api/save/status',
      cookies: { tsuki_session: token },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ available: false, canWrite: false })
    await app.close()
  })

  it('POST teleport requires admin auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: `/api/save/players/${UID}/teleport` })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('POST teleport returns 503 when save editing is unavailable', async () => {
    const app = await buildApp()
    const token = await login(app)
    const res = await app.inject({
      method: 'POST',
      url: `/api/save/players/${UID}/teleport`,
      cookies: { tsuki_session: token },
      payload: { x: 1, y: 2, z: 3 },
    })
    expect(res.statusCode).toBe(503)
    await app.close()
  })
})
