export type FieldType = 'float' | 'int' | 'bool' | 'enum' | 'text' | 'password' | 'platforms'

export interface SliderRange {
  min: number
  max: number
  step: number
}

export interface ConfigField {
  key: string
  label: string
  type: FieldType
  group: string
  help?: string
  options?: string[]
  /** When set, a float/int field renders as a slider + number input. */
  slider?: SliderRange
}

export const GROUPS = [
  'Server Identity',
  'Network & Access',
  'Rates & Multipliers',
  'Combat & Difficulty',
  'Survival & Regen',
  'Bases & Guilds',
  'World & QoL',
] as const

const G = {
  identity: 'Server Identity',
  network: 'Network & Access',
  rates: 'Rates & Multipliers',
  combat: 'Combat & Difficulty',
  survival: 'Survival & Regen',
  bases: 'Bases & Guilds',
  world: 'World & QoL',
}

export const PLATFORM_OPTIONS = ['Steam', 'Xbox', 'PS5', 'Mac']

// prettier-ignore
const RAW_FIELDS: ConfigField[] = [
  { key: 'ServerName', label: 'Server name', type: 'text', group: G.identity, help: 'Shown in the community server browser.' },
  { key: 'ServerDescription', label: 'Description', type: 'text', group: G.identity, help: 'One-liner under your name in the browser.' },
  { key: 'AdminPassword', label: 'Admin password', type: 'password', group: G.identity, help: 'Needed for admin commands, RCON, and the REST API.' },
  { key: 'ServerPassword', label: 'Server password', type: 'password', group: G.identity, help: 'Leave empty for a public server.' },
  { key: 'ServerPlayerMaxNum', label: 'Max players', type: 'int', group: G.identity, help: 'Dedicated servers support up to 32.' },
  { key: 'bShowPlayerList', label: 'Show player list', type: 'bool', group: G.identity, help: 'Expose the online player list in-game.' },

  { key: 'PublicPort', label: 'Public port (UDP)', type: 'int', group: G.network, help: 'Default 8211, must be open to the internet.' },
  { key: 'CrossplayPlatforms', label: 'Crossplay platforms', type: 'platforms', group: G.network, help: 'Which platforms can join.' },
  { key: 'bAllowClientMod', label: 'Allow client mods', type: 'bool', group: G.network, help: 'Let players join with client-side mods.' },
  { key: 'RCONEnabled', label: 'RCON', type: 'bool', group: G.network, help: 'Remote console for admin tools.' },
  { key: 'RCONPort', label: 'RCON port', type: 'int', group: G.network },
  { key: 'RESTAPIEnabled', label: 'REST API', type: 'bool', group: G.network, help: 'HTTP admin API, used by panels and bots.' },
  { key: 'RESTAPIPort', label: 'REST API port', type: 'int', group: G.network },

  { key: 'ExpRate', label: 'EXP rate', type: 'float', group: G.rates, help: '1 = normal. 2–3 suits most community servers.' },
  { key: 'PalCaptureRate', label: 'Pal capture rate', type: 'float', group: G.rates, help: 'Sphere catch chance multiplier.' },
  { key: 'PalSpawnNumRate', label: 'Pal spawn number', type: 'float', group: G.rates, help: 'More wild Pals = more CPU load.' },
  { key: 'WorkSpeedRate', label: 'Work speed', type: 'float', group: G.rates, help: 'Base Pal crafting and building speed.' },
  { key: 'PalEggDefaultHatchingTime', label: 'Egg hatch time (hours)', type: 'float', group: G.rates, help: '0 hatches eggs instantly.' },
  { key: 'DayTimeSpeedRate', label: 'Day speed', type: 'float', group: G.rates },
  { key: 'NightTimeSpeedRate', label: 'Night speed', type: 'float', group: G.rates, help: 'Above 1 makes nights pass faster.' },
  { key: 'EnemyDropItemRate', label: 'Enemy drop rate', type: 'float', group: G.rates },
  { key: 'CollectionDropRate', label: 'Gather drop rate', type: 'float', group: G.rates, help: 'Ore, wood, berries and other gatherables.' },
  { key: 'CollectionObjectRespawnSpeedRate', label: 'Node respawn speed', type: 'float', group: G.rates },
  { key: 'ItemWeightRate', label: 'Item weight', type: 'float', group: G.rates, help: 'Below 1 lets players carry more.' },

  { key: 'Difficulty', label: 'Difficulty preset', type: 'enum', group: G.combat, options: ['None', 'Casual', 'Normal', 'Hard'], help: 'None means the rates below are used as-is.' },
  { key: 'DeathPenalty', label: 'Death penalty', type: 'enum', group: G.combat, options: ['None', 'Item', 'ItemAndEquipment', 'All'], help: 'What players drop on death.' },
  { key: 'PalDamageRateAttack', label: 'Pal damage dealt', type: 'float', group: G.combat },
  { key: 'PalDamageRateDefense', label: 'Pal damage taken', type: 'float', group: G.combat },
  { key: 'PlayerDamageRateAttack', label: 'Player damage dealt', type: 'float', group: G.combat },
  { key: 'PlayerDamageRateDefense', label: 'Player damage taken', type: 'float', group: G.combat },
  { key: 'bEnableInvaderEnemy', label: 'Base raids', type: 'bool', group: G.combat, help: 'Wild raids on your base camps.' },
  { key: 'EnablePredatorBossPal', label: 'Predator bosses', type: 'bool', group: G.combat },
  { key: 'bIsPvP', label: 'PvP mode', type: 'bool', group: G.combat },
  { key: 'bEnablePlayerToPlayerDamage', label: 'Player vs player damage', type: 'bool', group: G.combat },
  { key: 'bEnableFriendlyFire', label: 'Friendly fire', type: 'bool', group: G.combat },
  { key: 'bHardcore', label: 'Hardcore mode', type: 'bool', group: G.combat, help: 'Death is permanent for players.' },
  { key: 'bPalLost', label: 'Pal permadeath', type: 'bool', group: G.combat, help: 'Pals that die are lost forever.' },

  { key: 'PlayerStomachDecreaceRate', label: 'Player hunger drain', type: 'float', group: G.survival },
  { key: 'PlayerStaminaDecreaceRate', label: 'Player stamina drain', type: 'float', group: G.survival },
  { key: 'PlayerAutoHPRegeneRate', label: 'Player HP regen', type: 'float', group: G.survival },
  { key: 'PlayerAutoHpRegeneRateInSleep', label: 'Player sleep regen', type: 'float', group: G.survival },
  { key: 'PalStomachDecreaceRate', label: 'Pal hunger drain', type: 'float', group: G.survival },
  { key: 'PalStaminaDecreaceRate', label: 'Pal stamina drain', type: 'float', group: G.survival },
  { key: 'PalAutoHPRegeneRate', label: 'Pal HP regen', type: 'float', group: G.survival },
  { key: 'PalAutoHpRegeneRateInSleep', label: 'Pal sleep regen (Palbox)', type: 'float', group: G.survival },

  { key: 'BaseCampMaxNum', label: 'Max base camps', type: 'int', group: G.bases, help: 'Every extra active base adds server load.' },
  { key: 'BaseCampWorkerMaxNum', label: 'Workers per base', type: 'int', group: G.bases, help: '15 is the game default.' },
  { key: 'GuildPlayerMaxNum', label: 'Guild size', type: 'int', group: G.bases },
  { key: 'BaseCampMaxNumInGuild', label: 'Bases per guild', type: 'int', group: G.bases },
  { key: 'bAutoResetGuildNoOnlinePlayers', label: 'Auto-reset inactive guilds', type: 'bool', group: G.bases },
  { key: 'AutoResetGuildTimeNoOnlinePlayers', label: 'Inactive guild timer (hours)', type: 'float', group: G.bases },
  { key: 'BuildObjectDeteriorationDamageRate', label: 'Structure decay rate', type: 'float', group: G.bases, help: '0 disables decay outside base areas.' },
  { key: 'DropItemMaxNum', label: 'World item cap', type: 'int', group: G.bases, help: 'Lower helps performance.' },
  { key: 'bBuildAreaLimit', label: 'Restrict building to base areas', type: 'bool', group: G.bases },
  { key: 'bExistPlayerAfterLogout', label: 'Bodies stay after logout', type: 'bool', group: G.bases },

  { key: 'AutoSaveSpan', label: 'Auto-save interval (seconds)', type: 'float', group: G.world },
  { key: 'bEnableFastTravel', label: 'Fast travel', type: 'bool', group: G.world },
  { key: 'bIsStartLocationSelectByMap', label: 'Choose spawn on map', type: 'bool', group: G.world },
  { key: 'bEnableVoiceChat', label: 'Proximity voice chat', type: 'bool', group: G.world },
  { key: 'bAllowGlobalPalboxExport', label: 'Global Palbox export', type: 'bool', group: G.world },
  { key: 'bAllowGlobalPalboxImport', label: 'Global Palbox import', type: 'bool', group: G.world, help: 'Off keeps progression legit.' },
  { key: 'bIsUseBackupSaveData', label: 'Backup save data', type: 'bool', group: G.world },
]

// Slider ranges (min/max/step) for rate-style fields — rendered as slider + input.
const S5: SliderRange = { min: 0, max: 5, step: 0.1 }
const SLIDERS: Record<string, SliderRange> = {
  ExpRate: S5,
  PalCaptureRate: S5,
  PalSpawnNumRate: S5,
  WorkSpeedRate: S5,
  PalEggDefaultHatchingTime: S5,
  DayTimeSpeedRate: S5,
  NightTimeSpeedRate: S5,
  EnemyDropItemRate: S5,
  CollectionDropRate: S5,
  CollectionObjectRespawnSpeedRate: S5,
  ItemWeightRate: S5,
  PalDamageRateAttack: S5,
  PalDamageRateDefense: S5,
  PlayerDamageRateAttack: S5,
  PlayerDamageRateDefense: S5,
  PlayerStomachDecreaceRate: S5,
  PlayerStaminaDecreaceRate: S5,
  PlayerAutoHPRegeneRate: S5,
  PlayerAutoHpRegeneRateInSleep: S5,
  PalStomachDecreaceRate: S5,
  PalStaminaDecreaceRate: S5,
  PalAutoHPRegeneRate: S5,
  PalAutoHpRegeneRateInSleep: S5,
  AutoResetGuildTimeNoOnlinePlayers: { min: 0, max: 720, step: 1 },
  BuildObjectDeteriorationDamageRate: { min: 0, max: 10, step: 0.1 },
}

export const FIELDS: ConfigField[] = RAW_FIELDS.map((field) =>
  SLIDERS[field.key] ? { ...field, slider: SLIDERS[field.key] } : field,
)
