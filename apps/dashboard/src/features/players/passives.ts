// Player-facing Palworld passive skills (internal id → display), sourced from
// the game's DT_PassiveSkill_Main table (ids via palmods.gg, effects via
// paldb.cc, game v1.0.x). Ids are case-sensitive and must match the game data
// verbatim — note baked-in quirks like "Deffence", "Noukin" and
// "Test_PalEgg_HatchingSpeed_Up". Restricting the picker to this list avoids
// writing an unknown id (which shows as a blank passive in-game).
// Deliberately excluded: per-boss BossDefeatReward_* duplicates, equipment-only
// (_Otomo_Only_Equip) and accessory (_ACC_) effects, and internal entries.

export type PassiveKind =
  | 'speed'
  | 'attack'
  | 'defense'
  | 'work'
  | 'element'
  | 'trainer'
  | 'utility'
  | 'negative'

export interface PassiveDef {
  id: string
  name: string
  effect: string
  kind: PassiveKind
}

export const PASSIVES: PassiveDef[] = [
  // Movement speed (incl. mount/fly speed) — Legend also boosts mounts.
  { id: 'MoveSpeed_up_3', name: 'Swift', effect: 'Movement speed +30%', kind: 'speed' },
  { id: 'MoveSpeed_up_2', name: 'Runner', effect: 'Movement speed +20%', kind: 'speed' },
  { id: 'MoveSpeed_up_1', name: 'Nimble', effect: 'Movement speed +10%', kind: 'speed' },
  { id: 'Legend', name: 'Legend', effect: 'Attack +20%, Defense +20%, Move speed +20%', kind: 'speed' },
  { id: 'SwimSpeed_up_3', name: 'King of the Waves', effect: 'Water movement speed +50%', kind: 'speed' },
  { id: 'SwimSpeed_up_2', name: 'Ace Swimmer', effect: 'Water movement speed +40%', kind: 'speed' },
  { id: 'SwimSpeed_up_1', name: 'Sleek Stroke', effect: 'Water movement speed +30%', kind: 'speed' },
  { id: 'RideJumpCount_Increase2', name: 'Skymarcher', effect: 'Mounted jump count +2', kind: 'speed' },
  { id: 'RideJumpCount_Increase1', name: 'Lightfooted', effect: 'Mounted jump count +1', kind: 'speed' },
  // Attack
  { id: 'PAL_ALLAttack_up3', name: 'Demon God', effect: 'Attack +30%, Defense +5%', kind: 'attack' },
  { id: 'PAL_ALLAttack_up2', name: 'Ferocious', effect: 'Attack +20%', kind: 'attack' },
  { id: 'PAL_ALLAttack_up1', name: 'Brave', effect: 'Attack +10%', kind: 'attack' },
  { id: 'Noukin', name: 'Musclehead', effect: 'Attack +30%, Work speed −50%', kind: 'attack' },
  { id: 'PAL_rude', name: 'Hooligan', effect: 'Attack +15%, Work speed −10%', kind: 'attack' },
  { id: 'PAL_sadist', name: 'Sadist', effect: 'Attack +15%, Defense −15%', kind: 'attack' },
  { id: 'PAL_oraora', name: 'Aggressive', effect: 'Attack +10%, Defense −10%', kind: 'attack' },
  { id: 'Vampire', name: 'Vampiric', effect: 'Heals 5% of damage dealt; works at night', kind: 'attack' },
  { id: 'CoolTimeReduction_Up_1', name: 'Serenity', effect: 'Skill cooldown −30%, Attack +10%', kind: 'attack' },
  { id: 'CoolTimeReduction_Up_2', name: 'Impatient', effect: 'Skill cooldown −15%', kind: 'attack' },
  { id: 'Nushi', name: 'Lunker', effect: 'Water/Ice attack +20%, Defense +20%', kind: 'attack' },
  // Defense
  { id: 'Deffence_up3', name: 'Diamond Body', effect: 'Defense +30%, flinch/knockback immunity', kind: 'defense' },
  { id: 'Deffence_up2', name: 'Burly Body', effect: 'Defense +20%, flinch immunity', kind: 'defense' },
  { id: 'Deffence_up2_2', name: 'Heavyweight', effect: 'Defense +20%, knockback immunity', kind: 'defense' },
  { id: 'Deffence_up1', name: 'Hard Skin', effect: 'Defense +10%', kind: 'defense' },
  { id: 'PAL_masochist', name: 'Masochist', effect: 'Defense +15%, Attack −15%', kind: 'defense' },
  { id: 'Alien', name: 'Otherworldly Cells', effect: 'Attack +10%, Fire/Electric damage taken −15%', kind: 'defense' },
  { id: 'MutationPal_ExplosionResist', name: 'Heavily Armored', effect: 'Explosion damage immunity', kind: 'defense' },
  { id: 'MutationPal_Mutant', name: 'Idiosyncratic', effect: 'HP regen +50%, Defense +25%, poison/burn immunity', kind: 'defense' },
  { id: 'MutationPal_Immortal', name: 'Immortality', effect: 'Heals 100% of damage dealt, HP regen +100%, Attack +15%', kind: 'defense' },
  // Work
  { id: 'CraftSpeed_up3', name: 'Remarkable Craftsmanship', effect: 'Work speed +75%', kind: 'work' },
  { id: 'CraftSpeed_up2', name: 'Artisan', effect: 'Work speed +50%', kind: 'work' },
  { id: 'CraftSpeed_up1', name: 'Serious', effect: 'Work speed +20%', kind: 'work' },
  { id: 'PAL_CorporateSlave', name: 'Work Slave', effect: 'Work speed +30%, Attack −30%', kind: 'work' },
  { id: 'PAL_conceited', name: 'Conceited', effect: 'Work speed +10%, Defense −10%', kind: 'work' },
  { id: 'WorkSuitabilityAddRank_MonsterFarm_2', name: 'Ranch Master', effect: 'Farming suitability +2', kind: 'work' },
  { id: 'WorkSuitabilityAddRank_MonsterFarm_1', name: 'Farmhand', effect: 'Farming suitability +1', kind: 'work' },
  { id: 'Nocturnal', name: 'Insomnia', effect: 'Keeps working at night (never sleeps)', kind: 'work' },
  { id: 'Test_PalEgg_HatchingSpeed_Up', name: 'Philanthropist', effect: 'Breeding speed +100%', kind: 'work' },
  { id: 'MutationPal_Babysitter', name: 'Babysitter', effect: 'Egg production & incubation speed +30%', kind: 'work' },
  // Element: attack boosts (lv2 "Emperor/Lord" tier, then lv1)
  { id: 'ElementBoost_Normal_2_PAL', name: 'Celestial Emperor', effect: 'Neutral attack +30%', kind: 'element' },
  { id: 'ElementBoost_Fire_2_PAL', name: 'Flame Emperor', effect: 'Fire attack +30%', kind: 'element' },
  { id: 'ElementBoost_Aqua_2_PAL', name: 'Lord of the Sea', effect: 'Water attack +30%', kind: 'element' },
  { id: 'ElementBoost_Thunder_2_PAL', name: 'Lord of Lightning', effect: 'Electric attack +30%', kind: 'element' },
  { id: 'ElementBoost_Leaf_2_PAL', name: 'Spirit Emperor', effect: 'Grass attack +30%', kind: 'element' },
  { id: 'ElementBoost_Ice_2_PAL', name: 'Ice Emperor', effect: 'Ice attack +30%', kind: 'element' },
  { id: 'ElementBoost_Earth_2_PAL', name: 'Earth Emperor', effect: 'Ground attack +30%', kind: 'element' },
  { id: 'ElementBoost_Dark_2_PAL', name: 'Lord of the Underworld', effect: 'Dark attack +30%', kind: 'element' },
  { id: 'ElementBoost_Dragon_2_PAL', name: 'Divine Dragon', effect: 'Dragon attack +30%', kind: 'element' },
  { id: 'EternalFlame', name: 'Eternal Flame', effect: 'Fire & Electric attack +30%', kind: 'element' },
  { id: 'Witch', name: 'Siren of the Void', effect: 'Dark & Ice attack +30%', kind: 'element' },
  { id: 'Invader', name: 'Invader', effect: 'Dark & Dragon attack +30%', kind: 'element' },
  { id: 'Salvation', name: 'Savior', effect: 'Neutral & Grass attack +30%', kind: 'element' },
  { id: 'ElementBoost_Normal_1_PAL', name: 'Spirit of Zen', effect: 'Neutral attack +10%', kind: 'element' },
  { id: 'ElementBoost_Fire_1_PAL', name: 'Pyromaniac', effect: 'Fire attack +10%', kind: 'element' },
  { id: 'ElementBoost_Aqua_1_PAL', name: 'Hydromaniac', effect: 'Water attack +10%', kind: 'element' },
  { id: 'ElementBoost_Thunder_1_PAL', name: 'Capacitor', effect: 'Electric attack +10%', kind: 'element' },
  { id: 'ElementBoost_Leaf_1_PAL', name: 'Fragrant Foliage', effect: 'Grass attack +10%', kind: 'element' },
  { id: 'ElementBoost_Ice_1_PAL', name: 'Coldblooded', effect: 'Ice attack +10%', kind: 'element' },
  { id: 'ElementBoost_Earth_1_PAL', name: 'Power of Gaia', effect: 'Ground attack +10%', kind: 'element' },
  { id: 'ElementBoost_Dark_1_PAL', name: 'Veil of Darkness', effect: 'Dark attack +10%', kind: 'element' },
  { id: 'ElementBoost_Dragon_1_PAL', name: 'Blood of the Dragon', effect: 'Dragon attack +10%', kind: 'element' },
  // Element: damage-taken resists
  { id: 'ElementResist_Normal_1_PAL', name: 'Abnormal', effect: 'Neutral damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Fire_1_PAL', name: 'Suntan Lover', effect: 'Fire damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Aqua_1_PAL', name: 'Waterproof', effect: 'Water damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Thunder_1_PAL', name: 'Insulated Body', effect: 'Electric damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Leaf_1_PAL', name: 'Botanical Barrier', effect: 'Grass damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Ice_1_PAL', name: 'Heated Body', effect: 'Ice damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Earth_1_PAL', name: 'Earthquake Resistant', effect: 'Ground damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Dark_1_PAL', name: 'Cheery', effect: 'Dark damage taken −10%', kind: 'element' },
  { id: 'ElementResist_Dragon_1_PAL', name: 'Dragonkiller', effect: 'Dragon damage taken −10%', kind: 'element' },
  // Trainer buffs (affect the owning player while the pal is in the party)
  { id: 'TrainerATK_UP_1', name: 'Vanguard', effect: 'Player attack +10%', kind: 'trainer' },
  { id: 'TrainerDEF_UP_1', name: 'Stronghold Strategist', effect: 'Player defense +10%', kind: 'trainer' },
  { id: 'TrainerWorkSpeed_UP_1', name: 'Motivational Leader', effect: 'Player work speed +25%', kind: 'trainer' },
  { id: 'TrainerMining_up1', name: 'Mine Foreman', effect: 'Player mining efficiency +25%', kind: 'trainer' },
  { id: 'TrainerLogging_up1', name: 'Logging Foreman', effect: 'Player logging efficiency +25%', kind: 'trainer' },
  { id: 'AutoHPRegeneRate_Passive', name: 'Healing Coach', effect: 'Player HP regen +5%', kind: 'trainer' },
  { id: 'PlayerSP_DecreaseRate_Passive', name: 'Wellness Watcher', effect: 'Player stamina drain −5%', kind: 'trainer' },
  { id: 'ReloadSpeedUp_Passive', name: 'Reload Master', effect: 'Player reload speed +4%', kind: 'trainer' },
  // Utility (Lucky, SAN/hunger/stamina, drops, sale price)
  { id: 'Rare', name: 'Lucky', effect: 'Attack +15%, Defense +15%, Work speed +20%', kind: 'utility' },
  { id: 'PAL_Sanity_Down_3', name: 'Heart of the Immovable King', effect: 'Sanity drop −20%', kind: 'utility' },
  { id: 'PAL_Sanity_Down_2', name: 'Workaholic', effect: 'Sanity drop −15%', kind: 'utility' },
  { id: 'PAL_Sanity_Down_1', name: 'Positive Thinker', effect: 'Sanity drop −10%', kind: 'utility' },
  { id: 'PAL_FullStomach_Down_3', name: 'Mastery of Fasting', effect: 'Hunger drain −20%', kind: 'utility' },
  { id: 'PAL_FullStomach_Down_2', name: 'Diet Lover', effect: 'Hunger drain −15%', kind: 'utility' },
  { id: 'PAL_FullStomach_Down_1', name: 'Dainty Eater', effect: 'Hunger drain −10%', kind: 'utility' },
  { id: 'Stamina_Up_3', name: 'Eternal Engine', effect: 'Max stamina +75% (rideable)', kind: 'utility' },
  { id: 'Stamina_Up_1', name: 'Infinite Stamina', effect: 'Max stamina +50% (rideable)', kind: 'utility' },
  { id: 'Stamina_Up_2', name: 'Fit as a Fiddle', effect: 'Max stamina +25% (rideable)', kind: 'utility' },
  { id: 'SelfDeathAddItemDrop_up_3', name: 'Lavish Hospitality', effect: 'Item drops +100%', kind: 'utility' },
  { id: 'SelfDeathAddItemDrop_up_2', name: 'Service-Minded', effect: 'Item drops +50%', kind: 'utility' },
  { id: 'SalePrice_Up_1', name: 'Noble', effect: 'Sell price up', kind: 'utility' },
  { id: 'SalePrice_Up_2', name: 'Fine Furs', effect: 'Sell price up', kind: 'utility' },
  { id: 'NonKilling', name: 'Mercy Hit', effect: 'Attacks never drop enemies below 1 HP', kind: 'utility' },
  // World Tree traits (strong upside + drawback)
  { id: 'WorldTree_ATK_DEF', name: 'God of Destruction', effect: 'Attack +40%, Defense +20%, Max HP −50%', kind: 'utility' },
  { id: 'WorldTree_ATK', name: 'Twin-Edged Holy Blade', effect: 'Attack +50%, Defense −30%', kind: 'utility' },
  { id: 'WorldTree_DEF', name: 'Sanctified Meat Shield', effect: 'Defense +50%, Attack −30%', kind: 'utility' },
  { id: 'WorldTree_CraftSpeed', name: "Demon's Hand", effect: 'Work speed +90%, sanity drains faster', kind: 'utility' },
  { id: 'WorldTree_MoveSpeed', name: 'Dimensional Leap', effect: 'Move speed +50%, hunger drains faster', kind: 'utility' },
  { id: 'WorldTree_Sanity', name: 'Hermit Sage', effect: 'Sanity drop −50%, Work speed −20%', kind: 'utility' },
  { id: 'WorldTree_FullStomach', name: 'World Tree Seedbed', effect: 'Hunger drain −50%, HP −20%', kind: 'utility' },
  // Negative
  { id: 'PAL_ALLAttack_down1', name: 'Coward', effect: 'Attack −10%', kind: 'negative' },
  { id: 'PAL_ALLAttack_down2', name: 'Pacifist', effect: 'Attack −20%', kind: 'negative' },
  { id: 'Deffence_down1', name: 'Downtrodden', effect: 'Defense −10%', kind: 'negative' },
  { id: 'Deffence_down2', name: 'Brittle', effect: 'Defense −20%', kind: 'negative' },
  { id: 'CraftSpeed_down1', name: 'Clumsy', effect: 'Work speed −10%', kind: 'negative' },
  { id: 'CraftSpeed_down2', name: 'Slacker', effect: 'Work speed −30%', kind: 'negative' },
  { id: 'PAL_FullStomach_Up_1', name: 'Glutton', effect: 'Hunger drain +10%', kind: 'negative' },
  { id: 'PAL_FullStomach_Up_2', name: 'Bottomless Stomach', effect: 'Hunger drain +15%', kind: 'negative' },
  { id: 'PAL_Sanity_Up_1', name: 'Unstable', effect: 'Sanity drop +10%', kind: 'negative' },
  { id: 'PAL_Sanity_Up_2', name: 'Destructive', effect: 'Sanity drop +15%', kind: 'negative' },
  { id: 'CoolTimeReduction_Down_1', name: 'Easygoing', effect: 'Skill cooldown +15%', kind: 'negative' },
  { id: 'Stamina_Down_1', name: 'Sickly', effect: 'Max stamina −25% (rideable)', kind: 'negative' },
  { id: 'SalePrice_Down_1', name: 'Shabby', effect: 'Sell price −10%', kind: 'negative' },
  { id: 'NightOwl', name: 'Night Owl', effect: 'Naps during the day', kind: 'negative' },
]

const BY_ID = new Map(PASSIVES.map((p) => [p.id, p]))

/** Display name for an id — falls back to the raw id for unknown passives. */
export function passiveName(id: string): string {
  return BY_ID.get(id)?.name ?? id
}
export function passiveDef(id: string): PassiveDef | undefined {
  return BY_ID.get(id)
}

export const KIND_ORDER: PassiveKind[] = [
  'speed',
  'attack',
  'defense',
  'work',
  'element',
  'trainer',
  'utility',
  'negative',
]

export const KIND_LABEL: Record<PassiveKind, string> = {
  speed: 'Speed',
  attack: 'Attack',
  defense: 'Defense',
  work: 'Work',
  element: 'Elemental',
  trainer: 'Trainer buffs',
  utility: 'Utility & special',
  negative: 'Negative',
}

export const KIND_COLOR: Record<PassiveKind, string> = {
  speed: '#38bdf8',
  attack: '#f87171',
  defense: '#818cf8',
  work: '#4ade80',
  element: '#c084fc',
  trainer: '#fb923c',
  utility: '#facc15',
  negative: '#94a3b8',
}
