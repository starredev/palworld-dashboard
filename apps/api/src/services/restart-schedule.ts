import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { restartScheduleSchema, type RestartSchedule } from '@tsuki/types'
import { loadEnv } from '../config/env'

function schedulePath(): string {
  return loadEnv().RESTART_SCHEDULE_PATH
}

// Cache the parsed schedule so the scheduler tick doesn't hit disk every 20s
// and so a PUT is reflected immediately without a re-read.
let current: RestartSchedule | null = null

/** The active schedule — from disk on first read, then cached; defaults if absent. */
export function getSchedule(): RestartSchedule {
  if (current) return current
  const path = schedulePath()
  if (existsSync(path)) {
    try {
      const parsed = restartScheduleSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
      if (parsed.success) {
        current = parsed.data
        return current
      }
    } catch {
      // Corrupt file — fall through to defaults rather than crash the scheduler.
    }
  }
  current = restartScheduleSchema.parse({})
  return current
}

/** Persist a new schedule and update the cache. */
export function saveSchedule(next: RestartSchedule): RestartSchedule {
  const path = schedulePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(next, null, 2), 'utf8')
  current = next
  return current
}

/** The next fire time at or after `now`, or null when disabled. Local time. */
export function computeNextRun(schedule: RestartSchedule, now: Date): Date | null {
  if (!schedule.enabled) return null
  const [h, m] = schedule.time.split(':').map(Number)
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next
}
