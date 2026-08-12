import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import { auditEntrySchema, type AuditEntry } from '@tsuki/types'
import { z } from 'zod'
import { loadEnv } from '../config/env'

const MAX_ENTRIES = 2000
const logSchema = z.array(auditEntrySchema)

function logPath(): string {
  return loadEnv().AUDIT_LOG_PATH
}

let cache: AuditEntry[] | null = null

function load(): AuditEntry[] {
  if (cache) return cache
  const path = logPath()
  if (existsSync(path)) {
    try {
      const parsed = logSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
      if (parsed.success) {
        cache = parsed.data
        return cache
      }
    } catch {
      // Corrupt file — start a fresh log rather than crash.
    }
  }
  cache = []
  return cache
}

export interface AuditInput {
  actorId: string
  actorName: string
  action: string
  summary: string
}

/** Append an entry (newest last on disk), trimming to the most recent MAX_ENTRIES. */
export function recordAudit(input: AuditInput): AuditEntry {
  const entry: AuditEntry = { id: randomUUID(), at: new Date().toISOString(), ...input }
  const entries = [...load(), entry].slice(-MAX_ENTRIES)
  const path = logPath()
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(entries, null, 2), 'utf8')
    cache = entries
  } catch {
    // Never let logging break the action it describes — keep it in memory only.
    cache = entries
  }
  return entry
}

/** The most recent entries, newest first. */
export function listAudit(limit = 200): AuditEntry[] {
  return load().slice(-limit).reverse()
}

/**
 * Map a mutating HTTP route to a stable slug + friendly summary. Returns null
 * for routes that shouldn't be logged.
 */
export function describeAction(
  method: string,
  routeUrl: string,
): { action: string; summary: string } | null {
  const key = `${method.toUpperCase()} ${routeUrl}`
  const map: Record<string, { action: string; summary: string }> = {
    'POST /api/commands/broadcast': { action: 'server.broadcast', summary: 'Broadcast a message' },
    'POST /api/commands/save': { action: 'server.save', summary: 'Saved the world' },
    'POST /api/commands/shutdown': { action: 'server.shutdown', summary: 'Restarted the server' },
    'POST /api/players/:userId/kick': { action: 'player.kick', summary: 'Kicked a player' },
    'POST /api/players/:userId/ban': { action: 'player.ban', summary: 'Banned a player' },
    'POST /api/players/:userId/unban': { action: 'player.unban', summary: 'Unbanned a player' },
    'PUT /api/server/config': { action: 'config.edit', summary: 'Edited the server config' },
    'POST /api/server/config/apply': {
      action: 'config.apply',
      summary: 'Applied config & restarted',
    },
    'PUT /api/server/restart-schedule': {
      action: 'schedule.restart',
      summary: 'Updated the restart schedule',
    },
    'POST /api/server/config/profiles': {
      action: 'profile.save',
      summary: 'Saved a config profile',
    },
    'DELETE /api/server/config/profiles/:id': {
      action: 'profile.delete',
      summary: 'Deleted a config profile',
    },
    'POST /api/server/config/profiles/:id/apply': {
      action: 'profile.apply',
      summary: 'Applied a config profile',
    },
    'POST /api/server/config/events': { action: 'event.create', summary: 'Scheduled an event' },
    'DELETE /api/server/config/events/:id': {
      action: 'event.delete',
      summary: 'Deleted a scheduled event',
    },
    'POST /api/save/batch/apply': {
      action: 'save.batchApply',
      summary: 'Applied the save-edit batch & restarted',
    },
    'POST /api/backups': { action: 'backup.create', summary: 'Created a backup' },
    'POST /api/backups/:name/restore': { action: 'backup.restore', summary: 'Restored a backup' },
    'DELETE /api/backups/:name': { action: 'backup.delete', summary: 'Deleted a backup' },
  }
  return map[key] ?? null
}
