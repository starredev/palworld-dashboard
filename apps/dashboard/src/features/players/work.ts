import { ref } from 'vue'

/**
 * Work suitabilities as stored in the save (short EPalWorkSuitability keys),
 * with display names matching the Paldeck dataset (`pals.json` `work[].k`) and
 * the same emoji used on the Paldeck pages. In-game display order.
 */
export interface WorkDef {
  /** Save enum key, e.g. "Handcraft". */
  key: string
  /** English display name, e.g. "Handiwork". */
  name: string
  icon: string
}

export const WORK_TYPES: WorkDef[] = [
  { key: 'EmitFlame', name: 'Kindling', icon: '🔥' },
  { key: 'Watering', name: 'Watering', icon: '💧' },
  { key: 'Seeding', name: 'Planting', icon: '🌱' },
  { key: 'GenerateElectricity', name: 'Generating Electricity', icon: '⚡' },
  { key: 'Handcraft', name: 'Handiwork', icon: '🔨' },
  { key: 'Collection', name: 'Gathering', icon: '🧺' },
  { key: 'Deforest', name: 'Lumbering', icon: '🪓' },
  { key: 'Mining', name: 'Mining', icon: '⛏️' },
  { key: 'OilExtraction', name: 'Oil Extracting', icon: '🛢️' },
  { key: 'ProductMedicine', name: 'Medicine Production', icon: '💊' },
  { key: 'Cool', name: 'Cooling', icon: '❄️' },
  { key: 'Transport', name: 'Transporting', icon: '📦' },
  { key: 'MonsterFarm', name: 'Farming', icon: '🌾' },
]

const byKey = new Map(WORK_TYPES.map((w) => [w.key, w]))
export const workDef = (key: string): WorkDef | undefined => byKey.get(key)
const keyByName = new Map(WORK_TYPES.map((w) => [w.name, w.key]))

// ---- Species base levels (from the bundled Paldeck dataset) ----
// Current saves no longer store a pal's base work ranks (only the
// condenser/book bonuses in GotWorkSuitabilityAddRankList), so the base
// levels come from the dex data and the save contributes the bonus on top.

const baseByIdLower = ref<Record<string, Record<string, number>> | null>(null)

async function ensureBasesLoaded(): Promise<void> {
  if (baseByIdLower.value) return
  const data = (await import('@/features/paldeck/pals.json')).default as {
    pals: { id: string; work?: { k: string; lv: number }[] }[]
  }
  const map: Record<string, Record<string, number>> = {}
  for (const p of data.pals) {
    const ranks: Record<string, number> = {}
    for (const w of p.work ?? []) {
      const key = keyByName.get(w.k)
      if (key) ranks[key] = w.lv
    }
    map[p.id.toLowerCase()] = ranks
  }
  baseByIdLower.value = map
}

/** Strip the runtime prefixes the save uses so species match the dex ids. */
const baseId = (species: string): string =>
  species.replace(/^(BOSS_|PREDATOR_|RAID_|SUMMON_|GYM_)/i, '')

/** Species base work ranks (enum-keyed), lazily loaded from the dex data. */
export function useSpeciesWork() {
  void ensureBasesLoaded()
  const baseRanks = (species: string): Record<string, number> =>
    baseByIdLower.value?.[baseId(species).toLowerCase()] ?? {}
  return { baseRanks }
}
