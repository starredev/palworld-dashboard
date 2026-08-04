/**
 * Presets are applied on top of the stock defaults — each is a partial set of
 * raw value overrides (already in ini format: floats to 6dp, True/False, etc.).
 */
export interface Preset {
  id: string
  label: string
  overrides: Record<string, string>
}

export const PRESETS: Preset[] = [
  { id: 'defaults', label: '1.0 Defaults', overrides: {} },
  {
    id: 'casual',
    label: 'Casual Co-op',
    overrides: {
      bIsMultiplay: 'True',
      ExpRate: '2.000000',
      PalCaptureRate: '1.500000',
      WorkSpeedRate: '1.500000',
      ItemWeightRate: '0.500000',
      PalEggDefaultHatchingTime: '0.500000',
      DeathPenalty: 'Item',
    },
  },
  {
    id: 'community',
    label: 'Community Server',
    overrides: {
      ServerPlayerMaxNum: '32',
      ExpRate: '1.500000',
      PalCaptureRate: '1.200000',
      WorkSpeedRate: '1.200000',
      bShowPlayerList: 'True',
      DeathPenalty: 'Item',
    },
  },
  {
    id: 'hardcore',
    label: 'Hardcore PvP',
    overrides: {
      bIsPvP: 'True',
      bEnablePlayerToPlayerDamage: 'True',
      bHardcore: 'True',
      bPalLost: 'True',
      DeathPenalty: 'All',
      PlayerDamageRateAttack: '1.500000',
      bEnableInvaderEnemy: 'True',
    },
  },
  {
    id: 'breeding',
    label: 'Breeding Farm',
    overrides: {
      PalEggDefaultHatchingTime: '0.000000',
      PalSpawnNumRate: '2.000000',
      WorkSpeedRate: '3.000000',
      ExpRate: '2.000000',
      PalCaptureRate: '2.000000',
      BaseCampWorkerMaxNum: '20',
    },
  },
]
