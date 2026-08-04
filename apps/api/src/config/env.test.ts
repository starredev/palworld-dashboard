import { afterEach, describe, expect, it, vi } from 'vitest'

describe('loadEnv', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('treats empty-string Palworld vars (as Compose injects) as unset', async () => {
    vi.stubEnv('PALWORLD_REST_URL', '')
    vi.stubEnv('PALWORLD_RCON_HOST', '')
    // Fresh import so the module-level cache doesn't leak between tests.
    const { loadEnv } = await import('./env')
    const env = loadEnv()
    expect(env.PALWORLD_REST_URL).toBeUndefined()
    expect(env.PALWORLD_RCON_HOST).toBeUndefined()
    vi.unstubAllEnvs()
  })
})
