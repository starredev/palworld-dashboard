import type { PalPlayer, PalServerInfo } from '@tsuki/types'

/**
 * Parse the `Info` response, e.g. `Welcome to Pal Server[v0.1.5.0] MyServer`.
 */
export function parseInfo(raw: string): PalServerInfo {
  const text = raw.trim()
  const version = text.match(/\[(v[^\]]+)\]/)?.[1] ?? null
  // Name is whatever follows the version bracket.
  const afterBracket = text.split(']').slice(1).join(']').trim()
  const name = afterBracket || text || 'Palworld Server'
  return { name, version, description: null }
}

/**
 * Parse the `ShowPlayers` CSV response. Header row is `name,playerid,steamid`.
 * RCON only exposes name + ids; richer fields come from the REST API.
 */
export function parsePlayers(raw: string): PalPlayer[] {
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length <= 1) return []

  return lines.slice(1).map((line) => {
    const cols = line.split(',')
    const name = (cols[0] ?? '').trim()
    const playerId = (cols[1] ?? '').trim() || null
    const userId = (cols[2] ?? '').trim() || null
    return { name, playerId, userId, level: null, ping: null, location: null }
  })
}
