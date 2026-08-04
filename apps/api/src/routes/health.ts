import type { FastifyInstance } from 'fastify'
import type { HealthResponse } from '@tsuki/types'

const startedAt = process.hrtime.bigint()

function uptimeSeconds(): number {
  return Number(process.hrtime.bigint() - startedAt) / 1e9
}

/** Liveness endpoint consumed by the dashboard and container health checks. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      service: '@tsuki/api',
      version: process.env.npm_package_version ?? '0.0.0',
      uptime: uptimeSeconds(),
      timestamp: new Date().toISOString(),
    }
  })
}
