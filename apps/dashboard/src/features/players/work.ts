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
