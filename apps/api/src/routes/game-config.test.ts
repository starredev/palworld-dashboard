import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Point the ini at a temp file BEFORE buildApp() (and thus loadEnv) runs.
const dir = mkdtempSync(join(tmpdir(), 'tsuki-ini-'))
const iniPath = join(dir, 'PalWorldSettings.ini')
process.env.PALWORLD_INI_PATH = iniPath

const { buildApp } = await import('../app')

async function login(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { password: 'admin' },
  })
  return res.cookies.find((c) => c.name === 'tsuki_session')!.value
}

describe('POST /api/server/config/apply', () => {
  it('requires auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/server/config/apply' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 503 when the ini is not mounted', async () => {
    if (existsSync(iniPath)) rmSync(iniPath)
    const app = await buildApp()
    const token = await login(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/server/config/apply',
      cookies: { tsuki_session: token },
      payload: { body: 'ExpRate=5.000000' },
    })
    expect(res.statusCode).toBe(503)
    await app.close()
  })

  it('writes the ini and reports restarted:false when no server is running', async () => {
    writeFileSync(
      iniPath,
      '[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(ExpRate=1.000000)\n',
    )
    const app = await buildApp()
    const token = await login(app)
    const res = await app.inject({
      method: 'POST',
      url: '/api/server/config/apply',
      cookies: { tsuki_session: token },
      payload: { body: 'ExpRate=5.000000' },
    })
    // No Palworld configured → the force-stop is a no-op, but the file is written.
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ ok: true, restarted: false })
    expect(readFileSync(iniPath, 'utf8')).toContain('ExpRate=5.000000')
    await app.close()
  })
})
