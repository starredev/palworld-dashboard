import type { Guild, GuildMember, Pal } from '@tsuki/types'
import { loadEnv } from '../config/env'

export interface RawPlayer {
  id: string
  name: string
  guildKey?: string
  guildName?: string
  level?: number
  online?: boolean
  lastSeenAt?: string
  captureTotal?: number
  paldeckUnlocked?: number
}
export interface RawObject {
  id: string
  kind: string
  name?: string
  detail?: string
  baseId?: string
  guildKey?: string
  level?: number
}

export function isGameDataConfigured(): boolean {
  return Boolean(loadEnv().GAMEDATA_URL)
}

async function fetchJson<T>(path: string): Promise<T> {
  const env = loadEnv()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${env.GAMEDATA_URL}${path}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`GameData ${path} -> ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch the live-map endpoints and derive guilds + pals. */
export async function getGameData(): Promise<{ guilds: Guild[]; pals: Pal[] }> {
  const env = loadEnv()
  const [state, objectsRes] = await Promise.all([
    fetchJson<{ players?: RawPlayer[] }>(env.GAMEDATA_STATE_PATH),
    fetchJson<{ objects?: RawObject[] }>(env.GAMEDATA_OBJECTS_PATH),
  ])
  return deriveGameData(state.players ?? [], objectsRes.objects ?? [])
}

/** Pure transform of raw live-map data into guilds + pals (unit-testable). */
export function deriveGameData(
  players: RawPlayer[],
  objects: RawObject[],
): { guilds: Guild[]; pals: Pal[] } {
  const guilds = buildGuilds(players, objects)
  return { guilds, pals: buildPals(objects, guilds) }
}

function buildGuilds(players: RawPlayer[], objects: RawObject[]): Guild[] {
  const map = new Map<string, Omit<Guild, 'memberCount'> & { members: GuildMember[] }>()
  const ensure = (key: string, name?: string) => {
    let g = map.get(key)
    if (!g) {
      g = { key, name: name || 'Unnamed Guild', baseCount: 0, palCount: 0, members: [] }
      map.set(key, g)
    } else if ((!g.name || g.name === 'Unnamed Guild') && name) g.name = name
    return g
  }

  for (const p of players) {
    if (!p.guildKey) continue
    ensure(p.guildKey, p.guildName).members.push({
      id: p.id,
      name: p.name,
      level: p.level ?? null,
      online: Boolean(p.online),
      lastSeenAt: p.lastSeenAt ?? null,
      captureTotal: p.captureTotal ?? null,
      paldeckUnlocked: p.paldeckUnlocked ?? null,
    })
  }
  for (const o of objects) {
    if (!o.guildKey) continue
    const g = ensure(o.guildKey, o.kind === 'bases' ? o.name : undefined)
    if (o.kind === 'bases') g.baseCount++
    else if (o.kind === 'workers') g.palCount++
  }

  return [...map.values()]
    .map((g) => ({ ...g, memberCount: g.members.length }))
    .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name))
}

function buildPals(objects: RawObject[], guilds: Guild[]): Pal[] {
  const nameByKey = new Map(guilds.map((g) => [g.key, g.name]))
  return objects
    .filter((o) => o.kind === 'workers')
    .map((o) => ({
      id: o.id,
      name: o.name ?? 'Pal',
      species: o.detail ?? null,
      level: o.level ?? null,
      guildKey: o.guildKey ?? null,
      guildName: o.guildKey ? (nameByKey.get(o.guildKey) ?? null) : null,
    }))
    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
}
