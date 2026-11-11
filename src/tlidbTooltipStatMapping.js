const DIRECT_STAT_MAP = Object.freeze({
  strength: ["strength"],
  dexterity: ["dexterity"],
  intelligence: ["intelligence"],
  all_stats: ["strength", "dexterity", "intelligence"],
  all_attributes: ["strength", "dexterity", "intelligence"],
  max_life: ["life"],
  maxLife: ["life"],
  max_mana: ["mana"],
  maxMana: ["mana"],
  max_energy_shield: ["shield"],
  maxEnergyShield: ["shield"],
  max_shield: ["shield"],
  gear_energy_shield: ["shield"],
  gear_armor: ["armor"],
  armor: ["armor"],
  armor_to_barrier_absorption_percent: ["armorToBarrierAbsorptionPercent"],
  tenacity_blessing_stacks_gained_on_regain: ["tenacityBlessingStacksGainedOnRegain"],
  agility_blessing_gain_interval: ["agilityBlessingGainIntervalSeconds"],
  agility_blessing_stacks_gained_while_moving: ["agilityBlessingStacksGainedWhileMoving"],
  focus_blessing_stacks_gained_on_non_main_skill_use: [
    "focusBlessingStacksGainedOnNonMainSkillUse",
  ],
  gear_evasion: ["evasion"],
  evasion: ["evasion"],
  damage_immunity_chance: ["damageImmunityChance"],
  fire_resistance: ["fireResist"],
  fireResistance: ["fireResist"],
  cold_resistance: ["coldResist"],
  coldResistance: ["coldResist"],
  lightning_resistance: ["lightningResist"],
  lightningResistance: ["lightningResist"],
  erosion_resistance: ["erosionResist"],
  erosionResistance: ["erosionResist"],
  max_fire_resistance: ["maxFireResist"],
  max_cold_resistance: ["maxColdResist"],
  max_lightning_resistance: ["maxLightningResist"],
  max_erosion_resistance: ["maxErosionResist"],
  max_elemental_resistance: ["maxFireResist", "maxColdResist", "maxLightningResist"],
  elemental_resistance: ["fireResist", "coldResist", "lightningResist"],
  all_resistance: ["fireResist", "coldResist", "lightningResist", "erosionResist"],
  attack_speed: ["attackSpeedIncrease"],
  attackSpeed: ["attackSpeedIncrease"],
  cast_speed: ["castSpeedIncrease"],
  castSpeed: ["castSpeedIncrease"],
  attack_and_cast_speed: ["speed"],
  "skill-attack-speed": ["speed"],
  "skill-cast-speed": ["speed"],
  "supported-skill-attack-speed": ["speed"],
  "supported-skill-cast-speed": ["speed"],
  movement_speed: ["movementSpeedBonus"],
  movementSpeed: ["movementSpeedBonus"],
  elixir_charge_progress_per_second: ["elixirChargeProgressPerSecond"],
  projectile_speed: ["projectileSpeedBonus"],
  projectile_duration: ["projectileDurationBonus"],
  attack_horizontal_projectile_speed: ["attackHorizontalProjectileSpeedBonus"],
  critical_strike_damage: ["critDamage"],
  criticalStrikeDamage: ["critDamage"],
  life_regeneration: ["lifeRegenPerSecond"],
  lifeRegeneration: ["lifeRegenPerSecond"],
  life_regeneration_rate: ["lifeRegenerationRateBonus"],
  life_recovery_on_defeat: ["lifeRecoveryOnDefeatPercent"],
  energy_shield_recovery_on_defeat: ["shieldRecoveryOnDefeatPercent"],
  mana_regeneration: ["manaRegenPerSecond"],
  manaRegeneration: ["manaRegenPerSecond"],
  energy_shield_regeneration: ["shieldRegenPerSecond"],
  shieldRegeneration: ["shieldRegenPerSecond"],
  block_chance: ["blockChance"],
  blockChance: ["blockChance"],
  attack_block_chance: ["attackBlockChance"],
  spell_block_chance: ["spellBlockChance"],
  block_ratio: ["blockRatio"],
  shield_recharge_speed: ["shieldChargeSpeedBonus"],
  additional_energy_shield_charge_interval: ["shieldChargeIntervalSeconds"],
  projectile_quantity: ["projectileCount"],
  "supported-skill-projectile-quantity": ["projectileCount"],
  terra_skill_duration: ["terraSkillDurationBonus"],
  terra_skill_area: ["terraSkillAreaBonus"],
  terra_charge_recovery_speed: ["terraChargeRecoverySpeedBonus"],
  skill_area: ["skillAreaBonus"],
  curse_skill_area: ["curseSkillAreaBonus"],
  "supported-skill-area": ["skillAreaBonus"],
  aura_effect: ["auraEffect"],
  warcry_effect: ["warcryEffectBonus"],
  magic_burst_charge_speed: ["spellBurstChargeSpeedBonus"],
  damage_taken_additional: ["damageTakenAdditionalPercent"],
  distinct_destiny_damage_taken_reduction: ["distinctDestinyDamageTakenReductionPercent"],
  defense_bonus_percent: ["defenseBonusPercent"],
  demolisher_charge_restoration_speed: ["demolisherChargeRestorationSpeedBonus"],
  smart_weapon_minion_physique: ["smartWeaponMinionPhysiqueBonus"],
  smart_weapon_minion_double_damage_chance: ["smartWeaponMinionDoubleDamageChance"],
  infusion_speed: ["infusionSpeed"],
  curse_effect: ["curseEffect"],
  paralysis_effect: ["paralysisEffect"],
  received_curse_effect: ["receivedCurseEffect"],
  received_numbed_effect: ["receivedNumbedEffect"],
  received_slow_effect: ["receivedSlowEffect"],
  received_paralysis_effect: ["receivedParalysisEffect"],
  received_weaken_effect: ["receivedWeakenEffect"],
  chance_to_multistrike: ["multistrikeChance"],
  chanceToMultistrike: ["multistrikeChance"],
  multistrike_damage_increment: ["multistrikeDamageIncrementPercent"],
  aggravation_chance: ["aggravationChance"],
  ignite_chance: ["igniteChance"],
  ignite_duration: ["igniteDurationAdditionalPercent"],
  ignite_limit: ["igniteLimit"],
  steep_strike_chance: ["steepStrikeChance"],
  steep_strike_damage: ["steepStrikeDamageAdditionalPercent"],
  deterioration_duration: ["aggravationDurationBonus"],
  received_ignite_damage_additional: ["receivedIgniteDamageAdditionalPercent"],
  received_ignite_effect: ["receivedIgniteEffectPercent"],
  received_wilt_damage: ["receivedWiltDamagePercent"],
  received_trauma_damage: ["receivedTraumaDamagePercent"],
  trauma_wilt_ignite_immunity: ["traumaImmunity", "wiltImmunity", "igniteImmunity"],
  elemental_ailment_immunity: ["elementalAilmentImmunity"],
  control_immunity: ["controlImmunity"],
  gain_fortitude_on_melee_skill_use: ["gainFortitudeOnMeleeSkillUse"],
  max_fortitude_stacks: ["maxFortitudeStacksBonus"],
  shadow_tracking_area: ["shadowTrackingAreaBonus"],
  shadow_strike_skill_area: ["shadowStrikeSkillAreaBonus"],
  blind_immunity: ["blindImmunity"],
  blind_nearby_enemies_on_attack_projectile_use: ["blindNearbyEnemiesOnAttackProjectileUse"],
  sentry_freezes_nearby_enemies: ["sentryFreezesNearbyEnemies"],
  command_per_second: ["commandPerSecond"],
  spirit_magus_initial_growth: ["spiritMagusInitialGrowth"],
  rock_magus_origin_effect_level: ["rockMagusOriginEffectLevel"],
  fire_magus_origin_effect_level: ["fireMagusOriginEffectLevel"],
  thunder_magus_origin_effect_level: ["thunderMagusOriginEffectLevel"],
  frost_magus_origin_effect_level: ["frostMagusOriginEffectLevel"],
  erosion_magus_origin_effect_level: ["erosionMagusOriginEffectLevel"],
  spirit_magus_core_effect: ["spiritMagusCoreEffect"],
  precise_acuteness_focus_buff_level: ["preciseAcutenessFocusBuffLevel"],
  precise_corrosion_focus_buff_level: ["preciseCorrosionFocusBuffLevel"],
  precise_regeneration_buff_level: ["preciseRegenerationBuffLevel"],
  focus_buff_effect: ["focusBuffEffectBonus"],
  all_skill_levels: ["allSkillLevelBonus"],
  current_life_and_shield_loss_on_skill_cast_percent: [
    "currentLifeAndShieldLossOnSkillCastPercent",
  ],
  defensive_skill_level: ["defensiveSkillLevelBonus"],
  defensive_skill_effect: ["defensiveSkillEffectBonus"],
  combo_finisher_charge: ["comboFinisherChargeBonus"],
  combo_sequence_reset_time: ["comboSequenceResetTimeSeconds"],
  combo_starter_reverse_knockback_radius: ["comboStarterReverseKnockbackRadiusMeters"],
  combo_starter_reverse_knockback_distance: ["comboStarterReverseKnockbackDistanceMeters"],
  combo_starter_reverse_knockback_radius_affected_by_skill_area: [
    "comboStarterReverseKnockbackAffectedBySkillArea",
  ],
  recent_combo_finisher_knockback_distance_per_stack: [
    "recentComboFinisherKnockbackDistancePerStackPercent",
  ],
  recent_combo_finisher_knockback_max_stacks: ["recentComboFinisherKnockbackMaxStacks"],
  omen_trigger_nearby_non_elite_enemy_count: ["omenTriggerNearbyNonEliteEnemyCount"],
  omen_infliction_stacks_per_enemy: ["omenInflictionStacksPerEnemy"],
  blazing_sun: ["blazingSunActive"],
  resurrection_warcry_on_hit: ["resurrectionWarcryOnHitActive"],
  resurrection_warcry_trigger_level: ["resurrectionWarcryTriggerLevel"],
  resurrection_warcry_trigger_interval: ["resurrectionWarcryTriggerIntervalSeconds"],
  alternating_delayed_pain_and_frost_shield: ["alternatingDelayedPainAndFrostShieldActive"],
  delayed_pain_level: ["delayedPainLevel"],
  frost_shield_level: ["frostShieldLevel"],
  alternating_buff_interval: ["alternatingBuffIntervalSeconds"],
  alternating_buff_duration: ["alternatingBuffDurationSeconds"],
  max_deflection: ["maxDeflectionBonus"],
  void_ghost_sphere_gain_interval: ["voidGhostSphereGainIntervalSeconds"],
  max_void_ghost_sphere_stacks: ["maxVoidGhostSphereStacks"],
  spirit_magus_enhanced_skill_chance: ["spiritMagusEnhancedSkillChance"],
  spirit_magus_damage_per_owned_magus: ["spiritMagusDamagePerOwnedMagusAdditionalPercent"],
  intimidated_on_hit_chance: ["intimidatedOnHitChance"],
  skill_effect_duration: ["skillEffectDurationBonus"],
  minion_max_life: ["minionMaxLifeBonus"],
  spirit_magus_cooldown_recovery_speed: ["spiritMagusCooldownRecoverySpeedBonus"],
  critical_damage_reduction: ["criticalDamageReduction"],
  damage_reduction: ["damageReduction"],
  max_synthetic_troop_quantity: ["maxSyntheticTroopQuantity"],
  max_summonable_synthetic_troops: ["maxSyntheticTroopQuantity"],
  max_tangle_quantity: ["maxTangleQuantity"],
  tangle_duration: ["tangleDurationBonus"],
  sentry_cast_frequency: ["sentrySkillCastFrequencyAdditionalPercent"],
  sentry_duration: ["sentryDurationBonus"],
  sentry_cast_speed: ["sentrySkillCastSpeedAdditionalPercent"],
  max_sentry_count: ["maxSentryCount"],
  max_curses: ["additionalCurseCapacity"],
  damage_taken_from_mana_before_life_percent: ["damageTakenFromManaBeforeLifePercent"],
  sealed_mana_compensation: ["manaSealCompensation"],
  mana_sealed_compensation: ["manaSealCompensation"],
  aura_skill_level: ["auraSkillLevelBonus"],
  max_bond_stacks: ["maxBondStacks"],
  bond_gain_speed: ["bondGainSpeedBonus"],
  reaping_trigger_delay: ["reapingTriggerDelaySeconds"],
  double_damage_chance: ["doubleDamageChance"],
  life_regain: ["lifeRegainPercent"],
  life_return: ["lifeRegainPercent"],
  energy_shield_regain: ["shieldRegainPercent"],
  shield_regain: ["shieldRegainPercent"],
  shield_return: ["shieldRegainPercent"],
  life_regain_interval: ["lifeRegainIntervalSeconds"],
  shield_regain_interval: ["shieldRegainIntervalSeconds"],
  regain_interval: ["lifeRegainIntervalSeconds", "shieldRegainIntervalSeconds"],
  elemental_and_erosion_resistance_penetration: ["elementalAndErosionResistancePenetration"],
  armor_damage_mitigation_penetration: ["armorDamageMitigationPenetration"],
  cooldown_recovery_speed: ["cooldownRecoverySpeedBonus"],
  maximum_frostbite_rating: ["maximumFrostbiteRating"],
  injury_buffer: ["damageReduction"],
  minion_kill_explosion_chance_percent: ["minionKillExplosionChancePercent"],
  minion_kill_explosion_enemy_max_life_damage_percent: [
    "minionKillExplosionEnemyMaxLifeDamagePercent",
  ],
  minion_kill_explosion_radius_meters: ["minionKillExplosionRadiusMeters"],
  cursed_enemy_kill_explosion_chance_percent: ["cursedEnemyKillExplosionChancePercent"],
  cursed_enemy_kill_explosion_enemy_max_life_true_damage_percent: [
    "cursedEnemyKillExplosionEnemyMaxLifeTrueDamagePercent",
  ],
  cursed_enemy_kill_explosion_radius_meters: ["cursedEnemyKillExplosionRadiusMeters"],
  damage: ["dps"],
  dps: ["dps"],
  attack_damage: ["dps"],
  spell_damage: ["dps"],
  physical_damage: ["dps"],
  fire_damage: ["dps"],
  cold_damage: ["dps"],
  lightning_damage: ["dps"],
  erosion_damage: ["dps"],
  projectile_damage: ["dps"],
  attack_horizontal_projectile_damage: ["dps"],
  damage_over_time: ["dps"],
  minion_damage: ["dps"],
  "skill-damage": ["dps"],
  "supported-skill-damage": ["dps"],
  combo_skill_damage: ["dps"],
  "persistent-physical-damage-per-second": ["dps"],
  "persistent-fire-damage-per-second": ["dps"],
  "persistent-cold-damage-per-second": ["dps"],
  "persistent-lightning-damage-per-second": ["dps"],
  "persistent-erosion-damage-per-second": ["dps"],
});

export const TLIDB_REGAIN_PER_HIT_CAPABILITY = "tlidb-regain-per-hit";
export const TLIDB_REGAIN_INTERVAL_CAPABILITY = "tlidb-regain-interval";
export const TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT = "lifeRegenPercentPerSecond";
export const TLIDB_MANA_REGEN_PERCENT_PER_SECOND_STAT = "manaRegenPercentPerSecond";

const TLIDB_REGAIN_SOURCE_STATS = new Set([
  "life_regain",
  "life_return",
  "energy_shield_regain",
  "shield_regain",
  "shield_return",
]);
const TLIDB_REGAIN_INTERVAL_SOURCE_STATS = new Set([
  "life_regain_interval",
  "shield_regain_interval",
  "regain_interval",
]);

const OPERATION_MAP = Object.freeze({
  add: "add",
  set: "set",
  increase: "increase",
  increased: "increase",
  add_percent: "increase",
  more: "more",
  additional: "more",
  more_percent: "more",
  regenerate: "add",
});

const PERCENT_POINT_STATS = new Set([
  "fire_resistance",
  "fireResistance",
  "cold_resistance",
  "coldResistance",
  "lightning_resistance",
  "lightningResistance",
  "erosion_resistance",
  "erosionResistance",
  "max_fire_resistance",
  "max_cold_resistance",
  "max_lightning_resistance",
  "max_erosion_resistance",
  "max_elemental_resistance",
  "elemental_resistance",
  "all_resistance",
  "attack_speed",
  "attackSpeed",
  "cast_speed",
  "castSpeed",
  "skill-attack-speed",
  "skill-cast-speed",
  "supported-skill-attack-speed",
  "supported-skill-cast-speed",
  "attack_and_cast_speed",
  "movement_speed",
  "movementSpeed",
  "projectile_speed",
  "projectile_duration",
  "attack_horizontal_projectile_speed",
  "bond_gain_speed",
  "critical_strike_damage",
  "criticalStrikeDamage",
  "life_regeneration_rate",
  "skill_area",
  "terra_skill_duration",
  "terra_skill_area",
  "terra_charge_recovery_speed",
  "curse_skill_area",
  "shadow_tracking_area",
  "shadow_strike_skill_area",
  "attack_block_chance",
  "spell_block_chance",
  "block_ratio",
  "shield_recharge_speed",
  "aura_effect",
  "warcry_effect",
  "magic_burst_charge_speed",
  "damage_taken_additional",
  "defense_bonus_percent",
  "demolisher_charge_restoration_speed",
  "smart_weapon_minion_physique",
  "smart_weapon_minion_double_damage_chance",
  "infusion_speed",
  "curse_effect",
  "paralysis_effect",
  "received_curse_effect",
  "received_numbed_effect",
  "received_slow_effect",
  "received_paralysis_effect",
  "received_weaken_effect",
  "chance_to_multistrike",
  "chanceToMultistrike",
  "multistrike_damage_increment",
  "aggravation_chance",
  "ignite_chance",
  "spirit_magus_enhanced_skill_chance",
  "skill_effect_duration",
  "deterioration_duration",
  "received_ignite_damage_additional",
  "received_ignite_effect",
  "received_wilt_damage",
  "received_trauma_damage",
  "spirit_magus_core_effect",
  "focus_buff_effect",
  "defensive_skill_effect",
  "minion_max_life",
  "spirit_magus_cooldown_recovery_speed",
  "critical_damage_reduction",
  "tangle_duration",
  "sentry_duration",
  "damage_taken_from_mana_before_life_percent",
  "sealed_mana_compensation",
  "mana_sealed_compensation",
  "double_damage_chance",
  "life_regain",
  "life_return",
  "energy_shield_regain",
  "shield_regain",
  "shield_return",
  "elemental_and_erosion_resistance_penetration",
  "armor_damage_mitigation_penetration",
  "cooldown_recovery_speed",
]);

const PERCENT_BONUS_OPERATIONS = new Set(["add_percent", "increase", "increased"]);
const CONFIGURATION_ADDITIONAL_PERCENT_STATS = new Set([
  "ignite_duration",
  "magic_burst_charge_speed",
  "projectile_speed",
  "sentry_cast_frequency",
  "sentry_cast_speed",
  "steep_strike_damage",
  "spirit_magus_damage_per_owned_magus",
]);

const DPS_PREFIXES = Object.freeze(["additional_"]);

function mappedStats(effect) {
  const stat = effect?.stat;
  if (
    TLIDB_REGAIN_SOURCE_STATS.has(stat)
    && effect?.calculationCapability !== TLIDB_REGAIN_PER_HIT_CAPABILITY
  ) return [];
  if (
    TLIDB_REGAIN_INTERVAL_SOURCE_STATS.has(stat)
    && effect?.calculationCapability !== TLIDB_REGAIN_INTERVAL_CAPABILITY
  ) return [];
  if (
    ["life_regeneration", "lifeRegeneration"].includes(stat)
    && ["percent_per_second", "percent_max_per_second"].includes(effect?.unit)
  ) {
    return [TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT];
  }
  if (DIRECT_STAT_MAP[stat]) return DIRECT_STAT_MAP[stat];
  if (DPS_PREFIXES.some((prefix) => stat?.startsWith(prefix) && stat.endsWith("_damage"))) {
    return ["dps"];
  }
  return [];
}

function mappedOperation(effect) {
  const operation = OPERATION_MAP[effect.operation];
  if (CONFIGURATION_ADDITIONAL_PERCENT_STATS.has(effect.stat) && operation === "more") {
    return "add";
  }
  if (PERCENT_POINT_STATS.has(effect.stat) && PERCENT_BONUS_OPERATIONS.has(effect.operation)) {
    return "add";
  }
  return operation;
}

export function mapTlidbTooltipEffect(effect) {
  if (!effect || typeof effect !== "object") {
    return { effects: [], blocker: { reason: "tlidb-effect-invalid" } };
  }
  if (["attack_speed", "attackSpeed"].includes(effect.stat) && effect.operation === "set") {
    return {
      effects: [],
      blocker: {
        sourceText: effect.sourceText,
        reason: "tlidb-effect-local-base-stat",
        stat: effect.stat,
        operation: effect.operation,
      },
    };
  }
  const stats = mappedStats(effect);
  const operation = mappedOperation(effect);
  if (!stats.length) {
    return {
      effects: [],
      blocker: { sourceText: effect.sourceText, reason: "tlidb-effect-stat-unmapped", stat: effect.stat },
    };
  }
  if (!operation) {
    return {
      effects: [],
      blocker: { sourceText: effect.sourceText, reason: "tlidb-effect-operation-unmapped", operation: effect.operation },
    };
  }
  return {
    effects: stats.map((stat, index) => ({
      ...effect,
      id: effect.id ?? `${effect.stat}:${effect.operation}:${index}`,
      stat,
      operation,
    })),
    blocker: null,
  };
}

export function mapTlidbTooltipEffects(effects) {
  const mapped = [];
  const blockers = [];
  for (const effect of Array.isArray(effects) ? effects : []) {
    const result = mapTlidbTooltipEffect(effect);
    mapped.push(...result.effects);
    if (result.blocker) blockers.push(result.blocker);
  }
  return Object.freeze({ effects: Object.freeze(mapped), blockers: Object.freeze(blockers) });
}
