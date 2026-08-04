import { describe, expect, it } from 'vitest'
import { healthResponseSchema } from '@tsuki/types'
import { buildApp } from '../app'

describe('GET /api/health', () => {
  it('returns a valid health payload', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/health' })

    expect(res.statusCode).toBe(200)
    const parsed = healthResponseSchema.safeParse(res.json())
    expect(parsed.success).toBe(true)

    await app.close()
  })
})
