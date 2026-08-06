import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import { z } from 'zod'
import {
  configEventSchema,
  configProfileSchema,
  type ConfigEvent,
  type ConfigEventInput,
  type ConfigProfile,
  type ConfigProfileInput,
} from '@tsuki/types'
import { loadEnv } from '../config/env'

const stateSchema = z.object({
  profiles: z.array(configProfileSchema).default([]),
  events: z.array(configEventSchema).default([]),
})
type State = z.infer<typeof stateSchema>

function statePath(): string {
  return loadEnv().CONFIG_PROFILES_PATH
}

let cache: State | null = null

function load(): State {
  if (cache) return cache
  const path = statePath()
  if (existsSync(path)) {
    try {
      const parsed = stateSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
      if (parsed.success) {
        cache = parsed.data
        return cache
      }
    } catch {
      // Corrupt file — start fresh rather than crash.
    }
  }
  cache = { profiles: [], events: [] }
  return cache
}

function persist(state: State): State {
  const path = statePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf8')
  cache = state
  return state
}

export function getProfiles(): ConfigProfile[] {
  return load().profiles
}

export function getProfile(id: string): ConfigProfile | undefined {
  return load().profiles.find((p) => p.id === id)
}

export function getEvents(): ConfigEvent[] {
  return load().events
}

/** Create a profile, or replace an existing one with the same (case-insensitive) name. */
export function upsertProfile(input: ConfigProfileInput): ConfigProfile {
  const state = load()
  const existing = state.profiles.find((p) => p.name.toLowerCase() === input.name.toLowerCase())
  const profile: ConfigProfile = { id: existing?.id ?? randomUUID(), ...input }
  const profiles = existing
    ? state.profiles.map((p) => (p.id === existing.id ? profile : p))
    : [...state.profiles, profile]
  persist({ ...state, profiles })
  return profile
}

export function deleteProfile(id: string): void {
  const state = load()
  persist({ ...state, profiles: state.profiles.filter((p) => p.id !== id) })
}

export function createEvent(input: ConfigEventInput): ConfigEvent {
  const state = load()
  // Parse through the schema so once/weekly fields get their defaults filled.
  const event = configEventSchema.parse({ id: randomUUID(), ...input })
  persist({ ...state, events: [...state.events, event] })
  return event
}

export function deleteEvent(id: string): void {
  const state = load()
  persist({ ...state, events: state.events.filter((e) => e.id !== id) })
}

/** Persist progress so an API restart doesn't re-fire an event. */
export function markEvent(
  id: string,
  patch: Partial<Pick<ConfigEvent, 'activated' | 'reverted' | 'active'>>,
): void {
  const state = load()
  persist({ ...state, events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
}

/**
 * Is `now` inside a weekly day+time window? The window may wrap the week
 * (start after end, e.g. Fri 18:00 → Mon 06:00). Uses local (container) time.
 */
export function inWeeklyWindow(
  now: Date,
  startDay: number,
  startTime: string,
  endDay: number,
  endTime: string,
): boolean {
  const toMin = (d: number, t: string): number => {
    const [h, m] = t.split(':').map(Number)
    return d * 1440 + h * 60 + m
  }
  const wk = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes()
  const s = toMin(startDay, startTime)
  const e = toMin(endDay, endTime)
  return s <= e ? wk >= s && wk < e : wk >= s || wk < e
}

export function eventStatus(event: ConfigEvent, now: Date): 'upcoming' | 'active' | 'done' {
  if (event.recurrence === 'weekly') {
    if (event.startDay == null || !event.startTime || event.endDay == null || !event.endTime)
      return 'upcoming'
    return inWeeklyWindow(now, event.startDay, event.startTime, event.endDay, event.endTime)
      ? 'active'
      : 'upcoming'
  }
  const t = now.getTime()
  if (!event.startsAt || t < new Date(event.startsAt).getTime()) return 'upcoming'
  if (!event.endsAt || t >= new Date(event.endsAt).getTime()) return 'done'
  return 'active'
}
