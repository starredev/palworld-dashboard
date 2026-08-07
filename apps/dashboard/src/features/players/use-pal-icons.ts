import { ref } from 'vue'

/**
 * Maps a save's pal `species` (e.g. "Sheepball", "BOSS_Sheepball") to a display
 * name + icon. Names come from the bundled Paldeck dataset; icons are hotlinked
 * from palworld.gg (same source the Paldeck page uses). Lazy-loaded once.
 */
export interface PalInfo {
  name: string
  element?: string
}

const nameByIdLower = ref<Record<string, PalInfo> | null>(null)
const broken = ref<Set<string>>(new Set())

async function ensureLoaded(): Promise<void> {
  if (nameByIdLower.value) return
  const data = (await import('@/features/paldeck/pals.json')).default as {
    pals: { id: string; name: string; elements?: string[] }[]
  }
  const map: Record<string, PalInfo> = {}
  for (const p of data.pals) {
    map[p.id.toLowerCase()] = { name: p.name, element: p.elements?.[0] }
  }
  nameByIdLower.value = map
}

/** Strip the boss/predator prefixes the save uses so it matches the Paldeck id. */
function baseId(species: string): string {
  return species.replace(/^(BOSS_|PREDATOR_|RAID_|SUMMON_)/i, '')
}

export function usePalIcons() {
  void ensureLoaded()

  const info = (species: string): PalInfo | undefined =>
    nameByIdLower.value?.[baseId(species).toLowerCase()]

  const displayName = (species: string, nickname?: string | null): string =>
    nickname || info(species)?.name || baseId(species)

  const iconUrl = (species: string): string | null => {
    const id = baseId(species)
    if (broken.value.has(id)) return null
    return `https://palworld.gg/images/full_palicon/T_${id}_icon_normal.png`
  }

  const onIconError = (species: string): void => {
    broken.value = new Set(broken.value).add(baseId(species))
  }

  const isBoss = (species: string): boolean => /^BOSS_/i.test(species)

  return { info, displayName, iconUrl, onIconError, isBoss, baseId }
}
