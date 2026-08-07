// Curated, player-facing Palworld passive skills (internal id → display).
// Ids are case-sensitive and must match the game data verbatim (note the
// baked-in misspelling "Deffence"). Movement-speed passives come first — they
// also speed up flying mounts like Helzephyr. Restricting the picker to this
// list avoids writing an unknown id (which shows as a blank passive in-game).

export type PassiveKind = 'speed' | 'attack' | 'defense' | 'work' | 'utility'

export interface PassiveDef {
  id: string
  name: string
  effect: string
  kind: PassiveKind
}

export const PASSIVES: PassiveDef[] = [
  // Movement speed (incl. mount/fly speed)
  { id: 'MoveSpeed_up_3', name: 'Swift', effect: 'Movement speed +30%', kind: 'speed' },
  { id: 'MoveSpeed_up_2', name: 'Runner', effect: 'Movement speed +20%', kind: 'speed' },
  { id: 'MoveSpeed_up_1', name: 'Nimble', effect: 'Movement speed +10%', kind: 'speed' },
  { id: 'Legend', name: 'Legend', effect: 'Attack +20%, Defense +20%, Move +15%', kind: 'speed' },
  // Attack
  { id: 'PAL_ALLAttack_up2', name: 'Ferocious', effect: 'Attack +20%', kind: 'attack' },
  { id: 'PAL_ALLAttack_up1', name: 'Brave', effect: 'Attack +10%', kind: 'attack' },
  { id: 'Noukin', name: 'Muscle Head', effect: 'Attack +30%, Work speed −50%', kind: 'attack' },
  { id: 'Rare', name: 'Lucky', effect: 'Attack +15%, Work speed +15%', kind: 'utility' },
  // Defense
  { id: 'Deffence_up3', name: 'Diamond Body', effect: 'Defense +30%', kind: 'defense' },
  { id: 'Deffence_up2', name: 'Burly Body', effect: 'Defense +20%', kind: 'defense' },
  { id: 'Deffence_up1', name: 'Hard Skin', effect: 'Defense +10%', kind: 'defense' },
  // Work
  { id: 'CraftSpeed_up2', name: 'Artisan', effect: 'Work speed +50%', kind: 'work' },
  { id: 'CraftSpeed_up1', name: 'Serious', effect: 'Work speed +30%', kind: 'work' },
]

const BY_ID = new Map(PASSIVES.map((p) => [p.id, p]))

/** Display name for an id — falls back to the raw id for unknown passives. */
export function passiveName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}
export function passiveDef(id: string): PassiveDef | undefined {
  return BY_ID.get(id)
}

export const KIND_COLOR: Record<PassiveKind, string> = {
  speed: '#38bdf8',
  attack: '#f87171',
  defense: '#818cf8',
  work: '#4ade80',
  utility: '#facc15',
}
