import {
  appConfigSchema,
  backupEntrySchema,
  backupsResponseSchema,
  commandResultSchema,
  guildsResponseSchema,
  palsResponseSchema,
  playersRosterResponseSchema,
  mapResponseSchema,
  metricsHistoryResponseSchema,
  logsResponseSchema,
  gameConfigSchema,
  gameConfigWriteResultSchema,
  gameConfigApplyResultSchema,
  restartScheduleStateSchema,
  configProfileSchema,
  configProfilesStateSchema,
  configEventSchema,
  authConfigSchema,
  auditResponseSchema,
  saveEditorStatusSchema,
  playerLocationSchema,
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
  type GameConfigApplyResult,
  type RestartSchedule,
  type RestartScheduleState,
  type ConfigProfile,
  type ConfigProfileInput,
  type ConfigProfilesState,
  type ConfigEvent,
  type ConfigEventInput,
  type GuildsResponse,
  type HealthResponse,
  type LogsResponse,
  type MapResponse,
  type MetricsHistoryResponse,
  type PalsResponse,
  type PlayersRosterResponse,
  type PalServerInfo,
  type PalServerMetrics,
  type PalStatus,
  type PlayersResponse,
  type SessionResponse,
  type AuthConfig,
  type AuditResponse,
  type SaveEditorStatus,
  type PlayerLocation,
  type Vec3,
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

  applyGameConfig(body: string): Promise<GameConfigApplyResult> {
    return apiFetch('/server/config/apply', {
      method: 'POST',
      body: JSON.stringify({ body }),
      schema: gameConfigApplyResultSchema,
    })
  },

  getRestartSchedule(): Promise<RestartScheduleState> {
    return apiFetch('/server/restart-schedule', { schema: restartScheduleStateSchema })
  },

  updateRestartSchedule(schedule: RestartSchedule): Promise<RestartScheduleState> {
    return apiFetch('/server/restart-schedule', {
      method: 'PUT',
      body: JSON.stringify(schedule),
      schema: restartScheduleStateSchema,
    })
  },

  getConfigProfiles(): Promise<ConfigProfilesState> {
    return apiFetch('/server/config/profiles', { schema: configProfilesStateSchema })
  },

  saveConfigProfile(input: ConfigProfileInput): Promise<ConfigProfile> {
    return apiFetch('/server/config/profiles', {
      method: 'POST',
      body: JSON.stringify(input),
      schema: configProfileSchema,
    })
  },

  deleteConfigProfile(id: string): Promise<unknown> {
    return apiFetch(`/server/config/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  applyConfigProfile(id: string): Promise<GameConfigApplyResult> {
    return apiFetch(`/server/config/profiles/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      schema: gameConfigApplyResultSchema,
    })
  },

  createConfigEvent(input: ConfigEventInput): Promise<ConfigEvent> {
    return apiFetch('/server/config/events', {
      method: 'POST',
      body: JSON.stringify(input),
      schema: configEventSchema,
    })
  },

  deleteConfigEvent(id: string): Promise<unknown> {
    return apiFetch(`/server/config/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
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

  getAuthConfig(): Promise<AuthConfig> {
    return apiFetch('/auth/config', { schema: authConfigSchema })
  },

  /** Full-page redirect into the Discord OAuth flow. */
  discordLoginUrl(): string {
    return apiUrl('/auth/discord')
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

  getPlayerRoster(): Promise<PlayersRosterResponse> {
    return apiFetch('/players/roster', { schema: playersRosterResponseSchema })
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

  unbanPlayer(userId: string): Promise<CommandResult> {
    return apiFetch(`/players/${encodeURIComponent(userId)}/unban`, {
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

  getGuilds(): Promise<GuildsResponse> {
    return apiFetch('/guilds', { schema: guildsResponseSchema })
  },

  getPals(): Promise<PalsResponse> {
    return apiFetch('/pals', { schema: palsResponseSchema })
  },

  getMapPoints(): Promise<MapResponse> {
    return apiFetch('/map', { schema: mapResponseSchema })
  },

  getMetricsHistory(): Promise<MetricsHistoryResponse> {
    return apiFetch('/metrics/history', { schema: metricsHistoryResponseSchema })
  },

  getLogs(lines = 1000): Promise<LogsResponse> {
    return apiFetch(`/logs?lines=${lines}`, { schema: logsResponseSchema })
  },

  getAudit(limit = 200): Promise<AuditResponse> {
    return apiFetch(`/audit?limit=${limit}`, { schema: auditResponseSchema })
  },

  getSaveStatus(): Promise<SaveEditorStatus> {
    return apiFetch('/save/status', { schema: saveEditorStatusSchema })
  },

  getPlayerSaveLocation(uid: string): Promise<PlayerLocation> {
    return apiFetch(`/save/players/${encodeURIComponent(uid)}/location`, {
      schema: playerLocationSchema,
    })
  },

  teleportPlayer(uid: string, coords: Vec3): Promise<{ ok: boolean }> {
    return apiFetch(`/save/players/${encodeURIComponent(uid)}/teleport`, {
      method: 'POST',
      body: JSON.stringify(coords),
    }) as Promise<{ ok: boolean }>
  },
}
