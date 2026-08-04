import { describe, expect, it } from 'vitest'
import { buildApp } from '../app'

async function login(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { password: 'admin' },
  })
  return res.cookies.find((c) => c.name === 'tsuki_session')!.value
}

describe('server routes (no Palworld configured)', () => {
  it('reports unconfigured status', async () => {
    const app = await buildApp()
    const token = await login(app)
    const res = await app.inject({
      method: 'GET',
      url: '/api/server/status',
      cookies: { tsuki_session: token },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ configured: false, reachable: false, source: 'none' })
    await app.close()
  })

  it('returns 503 for metrics when unconfigured', async () => {
    const app = await buildApp()
    const token = await login(app)
    const res = await app.inject({
      method: 'GET',
      url: '/api/server/metrics',
      cookies: { tsuki_session: token },
    })
    expect(res.statusCode).toBe(503)
    await app.close()
  })

  it('requires auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/server/status' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})
