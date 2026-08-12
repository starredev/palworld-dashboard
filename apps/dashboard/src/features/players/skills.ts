// Palworld active skills (internal id → display), generated from the game's
// waza table (ids via palmods.gg, element/power/cooldown via paldb.cc &
// palpedia.com, game v1.0.x). Ids are the bare EPalWazaID values — the save
// stores them with an "EPalWazaID::" prefix, which the API strips/adds.
import raw from './skills.json'

export interface SkillDef {
  id: string
  name: string
  element: string
  power: number | null
  ct: number | null
  /** Pal-specific signature move (still equippable on any pal via the editor). */
  signature: boolean
}

export const SKILLS = raw as SkillDef[]

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]))

/** Display name for an id — falls back to the raw id for unknown skills. */
export function skillName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}
export function skillDef(id: string): SkillDef | undefined {
  return BY_ID.get(id)
}
