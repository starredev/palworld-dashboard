import {
  healthResponseSchema,
  palServerInfoSchema,
  palServerMetricsSchema,
  palStatusSchema,
  playersResponseSchema,
  sessionResponseSchema,
  type HealthResponse,
  type PalServerInfo,
  type PalServerMetrics,
  type PalStatus,
  type PlayersResponse,
  type SessionResponse,
} from '@tsuki/types'
import { apiFetch } from './http'

/**
 * Thin, typed facade over the backend HTTP endpoints. The frontend only ever
 * talks to `apps/api` — never to the Palworld server or RCON directly.
 */
export const api = {
  getHealth(): Promise<HealthResponse> {
    return apiFetch('/health', { schema: healthResponseSchema })
  },

  login(password: string): Promise<SessionResponse> {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      schema: sessionResponseSchema,
    })
  },

  logout(): Promise<void> {
    return apiFetch('/auth/logout', { method: 'POST' })
  },

  getSession(): Promise<SessionResponse> {
    return apiFetch('/auth/me', { schema: sessionResponseSchema })
  },

  getServerStatus(): Promise<PalStatus> {
    return apiFetch('/server/status', { schema: palStatusSchema })
  },

  getServerInfo(): Promise<PalServerInfo> {
    return apiFetch('/server/info', { schema: palServerInfoSchema })
  },

  getServerMetrics(): Promise<PalServerMetrics> {
    return apiFetch('/server/metrics', { schema: palServerMetricsSchema })
  },

  getPlayers(): Promise<PlayersResponse> {
    return apiFetch('/players', { schema: playersResponseSchema })
  },
}
