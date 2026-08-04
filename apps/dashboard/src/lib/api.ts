import {
  appConfigSchema,
  backupEntrySchema,
  backupsResponseSchema,
  commandResultSchema,
  gameConfigSchema,
  gameConfigWriteResultSchema,
  healthResponseSchema,
  palServerInfoSchema,
  palServerMetricsSchema,
  palStatusSchema,
  playersResponseSchema,
  sessionResponseSchema,
  type AppConfig,
  type BackupEntry,
  type BackupsResponse,
  type CommandResult,
  type GameConfig,
  type GameConfigWriteResult,
  type HealthResponse,
  type PalServerInfo,
  type PalServerMetrics,
  type PalStatus,
  type PlayersResponse,
  type SessionResponse,
} from '@tsuki/types'
import { apiFetch, apiUrl } from './http'

/**
 * Thin, typed facade over the backend HTTP endpoints. The frontend only ever
 * talks to `apps/api` — never to the Palworld server or RCON directly.
 */
export const api = {
  getHealth(): Promise<HealthResponse> {
    return apiFetch('/health', { schema: healthResponseSchema })
  },

  getConfig(): Promise<AppConfig> {
    return apiFetch('/config', { schema: appConfigSchema })
  },

  getGameConfig(): Promise<GameConfig> {
    return apiFetch('/server/config', { schema: gameConfigSchema })
  },

  saveGameConfig(body: string): Promise<GameConfigWriteResult> {
    return apiFetch('/server/config', {
      method: 'PUT',
      body: JSON.stringify({ body }),
      schema: gameConfigWriteResultSchema,
    })
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

  broadcast(message: string): Promise<CommandResult> {
    return apiFetch('/commands/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message }),
      schema: commandResultSchema,
    })
  },

  save(): Promise<CommandResult> {
    return apiFetch('/commands/save', { method: 'POST', schema: commandResultSchema })
  },

  shutdown(input: { seconds: number; message: string }): Promise<CommandResult> {
    return apiFetch('/commands/shutdown', {
      method: 'POST',
      body: JSON.stringify(input),
      schema: commandResultSchema,
    })
  },

  kickPlayer(userId: string): Promise<CommandResult> {
    return apiFetch(`/players/${encodeURIComponent(userId)}/kick`, {
      method: 'POST',
      schema: commandResultSchema,
    })
  },

  banPlayer(userId: string): Promise<CommandResult> {
    return apiFetch(`/players/${encodeURIComponent(userId)}/ban`, {
      method: 'POST',
      schema: commandResultSchema,
    })
  },

  getBackups(): Promise<BackupsResponse> {
    return apiFetch('/backups', { schema: backupsResponseSchema })
  },

  createBackup(): Promise<BackupEntry> {
    return apiFetch('/backups', { method: 'POST', schema: backupEntrySchema })
  },

  restoreBackup(name: string): Promise<unknown> {
    return apiFetch(`/backups/${encodeURIComponent(name)}/restore`, { method: 'POST' })
  },

  deleteBackup(name: string): Promise<unknown> {
    return apiFetch(`/backups/${encodeURIComponent(name)}`, { method: 'DELETE' })
  },

  backupDownloadUrl(name: string): string {
    return apiUrl(`/backups/${encodeURIComponent(name)}/download`)
  },
}
