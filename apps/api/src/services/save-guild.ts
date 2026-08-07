import type { SaveGuild, SaveGuildMember } from '@tsuki/types'
import { deepFind } from './save-location'
import { levelSavPath, playerInstanceIds } from './save-level'
import { readSaveJson } from './save-editor'

/**
 * Guild editing works on Level.sav's `GroupSaveDataMap`. For a group of type
 * `EPalGroupType::Guild`, `entry.value.RawData.value` is a PLAIN dict (no
 * {value,type} wrapping) with these fields (verified against palworld-save-tools
 * v0.24.0 group.py):
 *   group_id, group_name, individual_character_handle_ids[{guid,instance_id}],
 *   base_ids, base_camp_level, guild_name, admin_player_uid,
 *   players[{ player_uid, player_info:{ last_online_real_time, player_name } }]
 * All uids/guids are dashed GUID strings. The in-game guild name lives in BOTH
 * group_name and guild_name, so a rename must set both. group.encode derives the
 * players count from the list length, so we can add/remove entries freely.
 */

type Dict = Record<string, unknown>

/** Plain dict at entry.value.RawData.value for every group in the map. */
function groupRaws(levelJson: unknown): Dict[] {
  const map = deepFind(levelJson, 'GroupSaveDataMap')
  const arr =
    map && typeof map === 'object' && 'value' in map ? (map as { value: unknown }).value : undefined
  if (!Array.isArray(arr)) return []
  const raws: Dict[] = []
  for (const entry of arr) {
    const raw = dig(entry, 'value', 'RawData', 'value')
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) raws.push(raw as Dict)
  }
  return raws
}

function dig(node: unknown, ...keys: string[]): unknown {
  let cur = node
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Dict)[k]
  }
  return cur
}
const normUid = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/[^0-9a-fA-F]/g, '').toLowerCase() : ''
const isGuild = (raw: Dict): boolean => raw['group_type'] === 'EPalGroupType::Guild'

/** Pure: list every guild in the save with members + leader. */
export function parseGuilds(levelJson: unknown): SaveGuild[] {
  const out: SaveGuild[] = []
  for (const raw of groupRaws(levelJson)) {
    if (!isGuild(raw)) continue
    const id = normUid(raw['group_id']).toUpperCase()
    if (!id) continue
    const adminUid = normUid(raw['admin_player_uid']).toUpperCase() || null
    const players = Array.isArray(raw['players']) ? raw['players'] : []
    const members: SaveGuildMember[] = players.map((p) => {
      const uid = normUid(dig(p, 'player_uid')).toUpperCase()
      const last = dig(p, 'player_info', 'last_online_real_time')
      return {
        uid,
        name: (dig(p, 'player_info', 'player_name') as string) ?? null,
        // Palworld stores FILETIME-like ticks; expose ISO when it looks valid.
        lastOnline: ticksToIso(typeof last === 'number' ? last : null),
        isAdmin: adminUid !== null && uid === adminUid,
      }
    })
    const handles = Array.isArray(raw['individual_character_handle_ids'])
      ? raw['individual_character_handle_ids'].length
      : 0
    out.push({
      id,
      name: (raw['guild_name'] as string) || (raw['group_name'] as string) || 'Unnamed Guild',
      adminUid,
      baseCount: Array.isArray(raw['base_ids']) ? raw['base_ids'].length : 0,
      // Handles cover players + pals; subtract the member count for a pal estimate.
      palCount: Math.max(0, handles - members.length),
      members,
    })
  }
  return out.sort((a, b) => b.members.length - a.members.length)
}

/** Palworld uses .NET-style 100ns ticks since year 1; 0 / bad values → null. */
function ticksToIso(ticks: number | null): string | null {
  if (!ticks || ticks <= 0) return null
  const ms = ticks / 10000 - 62135596800000 // ticks→ms, then epoch offset (0001→1970)
  if (!Number.isFinite(ms) || ms < 0) return null
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function findGuild(levelJson: unknown, guildId: string): Dict {
  const want = normUid(guildId)
  const raw = groupRaws(levelJson).find((r) => isGuild(r) && normUid(r['group_id']) === want)
  if (!raw) throw new Error('Guild not found in the save')
  return raw
}

export function renameGuildMutate(levelJson: unknown, guildId: string, name: string): void {
  const raw = findGuild(levelJson, guildId)
  // The in-game name lives in both fields — keep them in sync.
  raw['group_name'] = name
  raw['guild_name'] = name
}

export function setGuildLeaderMutate(levelJson: unknown, guildId: string, memberUid: string): void {
  const raw = findGuild(levelJson, guildId)
  const want = normUid(memberUid)
  const players = Array.isArray(raw['players']) ? raw['players'] : []
  const member = players.find((p) => normUid(dig(p, 'player_uid')) === want)
  if (!member) throw new Error('That player is not a member of this guild')
  // Reuse the member's exact stored player_uid string (dashed GUID form).
  raw['admin_player_uid'] = dig(member, 'player_uid')
}

export function kickGuildMemberMutate(
  levelJson: unknown,
  guildId: string,
  memberUid: string,
): void {
  const raw = findGuild(levelJson, guildId)
  const want = normUid(memberUid)
  if (normUid(raw['admin_player_uid']) === want) {
    throw new Error('Cannot kick the guild leader — hand leadership over first')
  }
  const players = Array.isArray(raw['players']) ? raw['players'] : []
  const idx = players.findIndex((p) => normUid(dig(p, 'player_uid')) === want)
  if (idx < 0) throw new Error('That player is not a member of this guild')
  players.splice(idx, 1)

  // Best-effort: drop the member's OWN character handle(s) (match on the player's
  // avatar instance id — never on guid, which isn't a reliable player-uid match).
  // Leaving them would only orphan a handle (still loads), so failure is non-fatal.
  const instances = new Set(playerInstanceIds(levelJson, memberUid))
  const handles = raw['individual_character_handle_ids']
  if (instances.size && Array.isArray(handles)) {
    raw['individual_character_handle_ids'] = handles.filter(
      (h) => !instances.has(normUid(dig(h, 'instance_id'))),
    )
  }
}

/** Read all guilds straight from Level.sav (decode once). */
export async function readGuildsFromSave(): Promise<SaveGuild[]> {
  return parseGuilds(await readSaveJson(levelSavPath()))
}
