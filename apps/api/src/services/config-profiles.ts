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
  const event: ConfigEvent = { id: randomUUID(), activated: false, reverted: false, ...input }
  persist({ ...state, events: [...state.events, event] })
  return event
}

export function deleteEvent(id: string): void {
  const state = load()
  persist({ ...state, events: state.events.filter((e) => e.id !== id) })
}

/** Persist activation/revert progress so an API restart doesn't re-fire an event. */
export function markEvent(
  id: string,
  patch: Partial<Pick<ConfigEvent, 'activated' | 'reverted'>>,
): void {
  const state = load()
  persist({ ...state, events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
}

export function eventStatus(event: ConfigEvent, now: Date): 'upcoming' | 'active' | 'done' {
  const t = now.getTime()
  if (t < new Date(event.startsAt).getTime()) return 'upcoming'
  if (t >= new Date(event.endsAt).getTime()) return 'done'
  return 'active'
}
