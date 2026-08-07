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
const str = (s: unknown): string | null => (typeof s === 'string' ? s : null)
// A real (shared) guild has players[] + a leader; an IndependentGuild is one
// player's personal guild (player_uid + guild_name_2, no admin/players).
const GUILD = 'EPalGroupType::Guild'
const INDEPENDENT = 'EPalGroupType::IndependentGuild'
const isGuildLike = (raw: Dict): boolean =>
  raw['group_type'] === GUILD || raw['group_type'] === INDEPENDENT

function member(uid: string, name: unknown, last: unknown, isAdmin: boolean): SaveGuildMember {
  return {
    uid: uid.toUpperCase(),
    name: str(name),
    // Palworld stores FILETIME-like ticks; expose ISO when it looks valid.
    lastOnline: ticksToIso(typeof last === 'number' ? last : null),
    isAdmin,
  }
}

/** Pure: list every guild (shared + personal) in the save with members + leader. */
export function parseGuilds(levelJson: unknown): SaveGuild[] {
  const out: SaveGuild[] = []
  for (const raw of groupRaws(levelJson)) {
    if (!isGuildLike(raw)) continue
    const id = normUid(raw['group_id']).toUpperCase()
    if (!id) continue
    const solo = raw['group_type'] === INDEPENDENT

    let adminUid: string | null
    let members: SaveGuildMember[]
    if (solo) {
      // One owner; no admin_player_uid — the sole member owns it.
      const uid = normUid(raw['player_uid']).toUpperCase()
      adminUid = uid || null
      members = uid
        ? [
            member(
              uid,
              dig(raw, 'player_info', 'player_name'),
              dig(raw, 'player_info', 'last_online_real_time'),
              true,
            ),
          ]
        : []
    } else {
      adminUid = normUid(raw['admin_player_uid']).toUpperCase() || null
      const players = Array.isArray(raw['players']) ? raw['players'] : []
      members = players.map((p) => {
        const uid = normUid(dig(p, 'player_uid')).toUpperCase()
        return member(
          uid,
          dig(p, 'player_info', 'player_name'),
          dig(p, 'player_info', 'last_online_real_time'),
          adminUid !== null && uid === adminUid,
        )
      })
    }

    const handles = Array.isArray(raw['individual_character_handle_ids'])
      ? raw['individual_character_handle_ids'].length
      : 0
    out.push({
      id,
      name:
        str(raw['guild_name']) ||
        str(raw['guild_name_2']) ||
        str(raw['group_name']) ||
        'Unnamed Guild',
      adminUid,
      solo,
      baseCount: Array.isArray(raw['base_ids']) ? raw['base_ids'].length : 0,
      // Handles cover players + pals; subtract the member count for a pal estimate.
      palCount: Math.max(0, handles - members.length),
      members,
    })
  }
  // Shared guilds first, then by member count.
  return out.sort((a, b) => Number(a.solo) - Number(b.solo) || b.members.length - a.members.length)
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
  const raw = groupRaws(levelJson).find((r) => isGuildLike(r) && normUid(r['group_id']) === want)
  if (!raw) throw new Error('Guild not found in the save')
  return raw
}

export function renameGuildMutate(levelJson: unknown, guildId: string, name: string): void {
  const raw = findGuild(levelJson, guildId)
  // The in-game name can live in several fields depending on the group type —
  // only overwrite the ones that already exist so encode stays positional-safe.
  raw['group_name'] = name
  if ('guild_name' in raw) raw['guild_name'] = name
  if ('guild_name_2' in raw) raw['guild_name_2'] = name
}

export function setGuildLeaderMutate(levelJson: unknown, guildId: string, memberUid: string): void {
  const raw = findGuild(levelJson, guildId)
  if (raw['group_type'] === INDEPENDENT) {
    throw new Error('A personal guild has only one member — no leader to change')
  }
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
  if (raw['group_type'] === INDEPENDENT) {
    throw new Error('A personal guild has only one member and cannot be kicked')
  }
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
