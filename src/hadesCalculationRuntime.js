import { TLIDB_NETHER_KING_TALENTS_SS13 } from "./data/tlidbNetherKingTalents.ss13.generated.js";
import { HADES_DIVINITY_SHAPE_METADATA } from "./divinityBoardModel.js";
import { HADES_KOREAN_PRESENTATION } from "./hadesKoreanPresentation.js";

const STRUCTURE_SOURCE_URL = "https://tlidb.com/en/Nether_Kings_Divinity";
const HYPERLINK_SOURCE_URL = "https://tlidb.com/en/Hyperlink";
const HYPERLINK_KO_SOURCE_URL = "https://tlidb.com/ko/Hyperlink";
const HADES_BASE_AUTHORITY_RULE_IDS = Object.freeze([
  "contamination-projection",
  "banishment-topology",
  "judgment-line",
]);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function engine(stat, operation, value, options = {}) {
  return { kind: "engine-effect", stat, operation, value, ...options };
}

function range(stat, min, max, options = {}) {
  return {
    kind: "engine-effect",
    stat,
    operation: "add",
    roll: { min, max },
    ...options,
  };
}

function mechanic(kind, options = {}) {
  return { kind, ...options };
}

function definition(options) {
  return {
    authorityStatus: "exact-current-source",
    inputs: [],
    rollInputs: [],
    effectTemplates: [],
    mechanicTemplates: [],
    branches: [],
    ...options,
  };
}

const SELF_AND_MINIONS = "self-and-minions";
const SELF_AND_MINIONS_ATTACK_SPELL = "self-and-minions-attacks-and-spells";

const SEMANTIC_DEFINITIONS = {
  "90000000": definition({
    effectTemplates: [engine("damage", "increase", 18, { unit: "percent", scope: "self" })],
  }),
  "90000001": definition({
    effectTemplates: [engine("minion_damage", "increase", 18, { unit: "percent", scope: "minions" })],
  }),
  "90000002": definition({
    effectTemplates: [range("physical_damage", 14, 16, { scope: SELF_AND_MINIONS_ATTACK_SPELL })],
    rollInputs: [{ key: "roll", type: "min-average-max-or-number", min: 14, max: 16 }],
  }),
  "90000003": definition({
    effectTemplates: [range("cold_damage", 13, 17, { scope: SELF_AND_MINIONS_ATTACK_SPELL })],
    rollInputs: [{ key: "roll", type: "min-average-max-or-number", min: 13, max: 17 }],
  }),
  "90000004": definition({
    effectTemplates: [range("fire_damage", 12, 18, { scope: SELF_AND_MINIONS_ATTACK_SPELL })],
    rollInputs: [{ key: "roll", type: "min-average-max-or-number", min: 12, max: 18 }],
  }),
  "90000005": definition({
    effectTemplates: [range("lightning_damage", 1, 29, { scope: SELF_AND_MINIONS_ATTACK_SPELL })],
    rollInputs: [{ key: "roll", type: "min-average-max-or-number", min: 1, max: 29 }],
  }),
  "90000006": definition({
    effectTemplates: [range("erosion_damage", 14, 16, { scope: SELF_AND_MINIONS_ATTACK_SPELL })],
    rollInputs: [{ key: "roll", type: "min-average-max-or-number", min: 14, max: 16 }],
  }),
  "90000007": definition({
    effectTemplates: [engine("critical_strike_rating", "increase", 30, { unit: "percent", scope: "self" })],
  }),
  "90000008": definition({
    effectTemplates: [engine("minion_critical_strike_rating", "increase", 30, { unit: "percent", scope: "minions" })],
  }),
  "90000009": definition({
    effectTemplates: [engine("critical_strike_damage", "add", 15, { unit: "percent", scope: "self" })],
  }),
  "90000010": definition({
    effectTemplates: [engine("minion_critical_strike_damage", "add", 15, { unit: "percent", scope: "minions" })],
  }),
  "90000011": definition({
    effectTemplates: [
      engine("attack_and_cast_speed", "increase", 6, { unit: "percent", scope: "self", sourceLineIndex: 0 }),
      engine("minion_attack_speed", "increase", 6, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
      engine("minion_cast_speed", "increase", 6, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
    ],
  }),
  "90000012": definition({
    effectTemplates: [
      engine("projectile_speed", "increase", 12, { unit: "percent", scope: "self", sourceLineIndex: 0 }),
      engine("minion_projectile_speed", "increase", 12, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
    ],
  }),
  "90000013": definition({
    effectTemplates: [
      engine("skill_area", "increase", 18, { unit: "percent", scope: "self", sourceLineIndex: 0 }),
      engine("minion_skill_area", "increase", 18, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
    ],
  }),
  "90000014": definition({ effectTemplates: [engine("armor", "add", 720, { unit: "flat" })] }),
  "90000015": definition({ effectTemplates: [engine("evasion", "add", 720, { unit: "flat" })] }),
  "90000016": definition({ effectTemplates: [engine("cold_resistance", "add", 7, { unit: "percent" })] }),
  "90000017": definition({ effectTemplates: [engine("fire_resistance", "add", 7, { unit: "percent" })] }),
  "90000018": definition({ effectTemplates: [engine("lightning_resistance", "add", 7, { unit: "percent" })] }),
  "90000019": definition({ effectTemplates: [engine("erosion_resistance", "add", 7, { unit: "percent" })] }),

  "90000100": definition({
    effectTemplates: [
      engine("elemental_and_erosion_resistance_penetration", "add", 6, { unit: "percent", scope: "self", sourceLineIndex: 0 }),
      engine("elemental_and_erosion_resistance_penetration", "add", 6, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
    ],
  }),
  "90000101": definition({
    effectTemplates: [
      engine("armor_damage_mitigation_penetration", "add", 6, { unit: "percent", scope: "self", sourceLineIndex: 0 }),
      engine("armor_damage_mitigation_penetration", "add", 6, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
    ],
  }),
  "90000102": definition({
    effectTemplates: [
      engine("double_damage_chance", "add", 8, { unit: "percent", scope: "self", sourceLineIndex: 0 }),
      engine("double_damage_chance", "add", 8, { unit: "percent", scope: "minions", sourceLineIndex: 1 }),
    ],
    mechanicTemplates: [mechanic("chance-cap", { stat: "double_damage_chance", min: 0, max: 100 })],
  }),
  "90000103": definition({
    effectTemplates: [engine("base_ignite_damage", "add", 5, { unit: "flat", scope: "self" })],
  }),
  "90000104": definition({
    effectTemplates: [engine("base_trauma_damage", "add", 5, { unit: "flat", scope: "self" })],
  }),
  "90000105": definition({
    effectTemplates: [engine("base_wilt_damage", "add", 5, { unit: "flat", scope: "self" })],
  }),
  "90000106": definition({ effectTemplates: [engine("movement_speed", "increase", 6, { unit: "percent" })] }),
  "90000107": definition({ effectTemplates: [engine("aura_effect", "increase", 6, { unit: "percent" })] }),
  "90000108": definition({ effectTemplates: [engine("sealed_mana_compensation", "add", 6, { unit: "percent" })] }),
  "90000109": definition({ effectTemplates: [engine("warcry_effect", "increase", 8, { unit: "percent" })] }),
  "90000110": definition({ effectTemplates: [engine("elixir_skill_effect", "increase", 8, { unit: "percent" })] }),
  "90000111": definition({ effectTemplates: [engine("strength", "add", 30, { unit: "flat" })] }),
  "90000112": definition({ effectTemplates: [engine("dexterity", "add", 30, { unit: "flat" })] }),
  "90000113": definition({ effectTemplates: [engine("intelligence", "add", 30, { unit: "flat" })] }),
  "90000114": definition({
    mechanicTemplates: [mechanic("incoming-damage-resource-routing", {
      resource: "life",
      operation: "additional-portion-applied",
      value: 6,
      unit: "percent",
    })],
  }),
  "90000115": definition({
    effectTemplates: [
      engine("life_regain", "increase", 10, { unit: "percent", sourceLineIndex: 0 }),
      engine("energy_shield_regain", "increase", 10, { unit: "percent", sourceLineIndex: 1 }),
    ],
  }),
  "90000116": definition({
    effectTemplates: [engine("life_regeneration", "add", 6, {
      unit: "percent_max_per_second",
      scope: "self",
      multiplierPerSecond: 0.06,
      formula: "maxLife * 0.06",
    })],
  }),
  "90000117": definition({
    effectTemplates: [engine("energy_shield_charge_speed", "increase", 30, { unit: "percent" })],
  }),

  "90000200": definition({
    effectTemplates: [engine("damage", "more", 12, { unit: "percent", scope: SELF_AND_MINIONS })],
  }),
  "90000201": definition({
    inputs: [{ key: "conditionActive", namedKeys: ["targetCursed"], type: "boolean", meaning: "target-is-cursed" }],
    effectTemplates: [engine("damage", "more", 12, {
      unit: "percent",
      scope: SELF_AND_MINIONS,
      conditionKey: "targetCursed",
      conditionInputKey: "conditionActive",
    })],
  }),
  "90000202": definition({
    mechanicTemplates: [mechanic("trigger", {
      trigger: "on-self-or-minion-deals-damage",
      skill: "Timid Curse",
      skillLevel: 1,
      cooldownSeconds: 0.2,
    })],
  }),
  "90000203": definition({
    mechanicTemplates: [mechanic("trigger", {
      trigger: "on-self-or-minion-deals-damage",
      skill: "Entangled Pain Curse",
      skillLevel: 1,
      cooldownSeconds: 0.2,
    })],
  }),
  "90000204": definition({
    mechanicTemplates: [mechanic("immunity", { statuses: ["paralysis", "slow"], scope: "self" })],
  }),
  "90000205": definition({
    mechanicTemplates: [mechanic("immunity", { statuses: ["blind", "weaken"], scope: "self" })],
  }),
  "90000206": definition({
    effectTemplates: [engine("attack_aggression_effect", "increase", 30, { unit: "percent", sourceLineIndex: 1 })],
    mechanicTemplates: [mechanic("grant-status", {
      grantedStatus: "attack-aggression",
      scope: SELF_AND_MINIONS,
      sourceLineIndex: 0,
      localeNote: "The mixed target line is presented only through the exact parallel 90000207 TLIDB row template and the target's exact Aggression term.",
    })],
  }),
  "90000207": definition({
    effectTemplates: [engine("spell_aggression_effect", "increase", 30, { unit: "percent", sourceLineIndex: 1 })],
    mechanicTemplates: [mechanic("grant-status", { grantedStatus: "spell-aggression", scope: SELF_AND_MINIONS, sourceLineIndex: 0 })],
  }),
  "90000208": definition({
    effectTemplates: [engine("ill_omen_cumulative_efficiency", "increase", 50, { unit: "percent" })],
  }),
  "90000209": definition({
    effectTemplates: [engine("damaging_ailment_chance", "add", 30, { unit: "percent" })],
  }),
  "90000210": definition({
    effectTemplates: [
      engine("attack_critical_strike_rating", "add", 100, { unit: "flat", sourceLineIndex: 0 }),
      engine("spell_critical_strike_rating", "add", 100, { unit: "flat", sourceLineIndex: 0 }),
      engine("elemental_damage", "more", -99, { unit: "percent", sourceLineIndex: 1 }),
      engine("erosion_damage", "more", -99, { unit: "percent", sourceLineIndex: 1 }),
    ],
  }),
  "90000211": definition({ effectTemplates: [engine("frostbite_effect", "increase", 30, { unit: "percent" })] }),
  "90000212": definition({
    inputs: [{ key: "conditionActive", namedKeys: ["dealtFireHitRecently"], type: "boolean", meaning: "dealt-fire-hit-recently" }],
    effectTemplates: [engine("affliction_effect", "increase", 50, {
      unit: "percent",
      conditionKey: "dealtFireHitRecently",
      conditionInputKey: "conditionActive",
    })],
  }),
  "90000213": definition({
    effectTemplates: [
      engine("numbed_effect", "increase", 30, { unit: "percent", sourceLineIndex: 0 }),
      engine("numbed_stacks_inflicted", "add", 2, { unit: "stack", sourceLineIndex: 1 }),
    ],
  }),
  "90000214": definition({ effectTemplates: [engine("deterioration_damage", "increase", 32, { unit: "percent" })] }),

  "92000001": definition({
    authorityStatus: "inference-scenario",
    inputs: [{ key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("contamination-projection-effect-increase", {
      appliesTo: "all-divinity-slates",
      value: 12,
      unit: "percent",
      effectLimit: 1,
    })],
  }),
  "92000002": definition({
    authorityStatus: "inference-scenario",
    inputs: [{ key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("contamination-projection-effect-increase", {
      appliesTo: "pedigree-of-gods",
      value: 100,
      unit: "percent",
      effectLimit: 1,
    })],
  }),
  "92000003": definition({
    authorityStatus: "inference-scenario",
    inputs: [{ key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("contamination-projection-effect-increase", {
      appliesTo: "fallen-starlight",
      value: 50,
      unit: "percent",
      effectLimit: 1,
    })],
  }),
  "92000004": definition({
    authorityStatus: "inference-scenario",
    inputs: [{ key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("contamination-projection-effect-increase", {
      appliesTo: "a-corner-of-divinity",
      value: 30,
      unit: "percent",
      effectLimit: 1,
    })],
  }),
  "92000005": definition({
    authorityStatus: "inference-scenario",
    inputs: [{ key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("contamination-projection-effect-increase", {
      appliesTo: "non-legendary-divinity-slate",
      value: 30,
      unit: "percent",
      effectLimit: 1,
    })],
  }),
  "92000006": definition({
    authorityStatus: "inference-scenario",
    inputs: [
      { key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" },
      { key: "statueHasEmptySlot", type: "boolean" },
    ],
    mechanicTemplates: [mechanic("contamination-projection-effect-increase", {
      appliesTo: "all-divinity-slates",
      value: 30,
      unit: "percent",
      conditionKey: "statueHasEmptySlot",
      effectLimit: 1,
    })],
  }),
  "92000007": definition({
    inputs: [{ key: "authorityActive", namedKeys: ["contaminationActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("contamination-adjacency-mode", {
      directOrthogonal: true,
      includeDiagonal: true,
      effectLimit: 1,
    })],
  }),

  "92100001": definition({
    inputs: [{ key: "conditionActive", namedKeys: ["preciseFearlessActive"], type: "boolean" }],
    effectTemplates: [engine("double_damage_chance", "add", 5, {
      unit: "percent",
      conditionKey: "preciseFearlessActive",
      conditionInputKey: "conditionActive",
      scope: "precise-fearless-base-effect",
    })],
  }),
  "92100002": definition({
    inputs: [{ key: "distanceMeters", type: "number", min: 0, threshold: { comparator: "at-most", value: 4 } }],
    effectTemplates: [engine("physical_damage", "more", 15, {
      unit: "percent",
      conditionKey: "enemyInProximity",
    })],
    mechanicTemplates: [mechanic("distance-condition", {
      conditionKey: "enemyInProximity",
      distanceMetersAtMost: 4,
      definitionSourceUrl: HYPERLINK_SOURCE_URL,
      definition: "Proximity",
    })],
  }),
  "92100003": definition({
    inputs: [{ key: "spellSkillLevelBonus", type: "integer", min: 0, cap: 10 }],
    mechanicTemplates: [mechanic("per-stack-stats", {
      inputKey: "spellSkillLevelBonus",
      cap: 10,
      outputs: [
        { stat: "spell_critical_strike_rating", operation: "add", valuePerStack: 5, unit: "flat" },
        { stat: "spell_critical_strike_rating", operation: "increase", valuePerStack: 10, unit: "percent" },
      ],
    })],
  }),
  "92100004": definition({
    inputs: [{ key: "sealedLifePercent", type: "number", min: 0, max: 100 }],
    mechanicTemplates: [mechanic("per-unit-stat", {
      inputKey: "sealedLifePercent",
      stat: "spell_damage",
      operation: "more",
      valuePerUnit: 0.14,
      unit: "percent",
    })],
  }),
  "92100005": definition({
    effectTemplates: [engine("attack_horizontal_projectile_return_chance", "add", 14, { unit: "percent" })],
  }),
  "92100006": definition({
    inputs: [{ key: "conditionActive", namedKeys: ["projectileCriticalStrike"], type: "boolean" }],
    effectTemplates: [
      engine("critical_strike_rating", "add", -20, { unit: "flat", sourceLineIndex: 0 }),
      engine("damage", "more", 16, {
        unit: "percent",
        scope: "projectile",
        conditionKey: "projectileCriticalStrike",
        conditionInputKey: "conditionActive",
        sourceLineIndex: 1,
      }),
    ],
  }),
  "92100007": definition({
    inputs: [{ key: "knockbackDistanceIncrease", type: "number", min: 0 }],
    mechanicTemplates: [mechanic("divisor-stack-stat", {
      inputKey: "knockbackDistanceIncrease",
      divisor: 6,
      floor: true,
      cap: 14,
      stat: "projectile_damage",
      operation: "more",
      valuePerStack: 1,
      unit: "percent",
    })],
  }),
  "92100008": definition({
    effectTemplates: [engine("damage_taken", "more", 2, { unit: "percent", scope: "enemy-with-ill-omen" })],
  }),
  "92100009": definition({
    effectTemplates: [
      engine("affliction_effect", "more", 8, { unit: "percent", sourceLineIndex: 0 }),
      engine("affliction_inflicted_per_second", "add", 48, { unit: "flat_per_second", sourceLineIndex: 1 }),
    ],
  }),
  "92100010": definition({
    inputs: [{ key: "reapingEventsPerSecond", type: "number", min: 0, optional: true }],
    mechanicTemplates: [mechanic("probabilistic-trigger", {
      event: "reaping",
      chancePercent: 20,
      skill: "Scorching Pulse",
      skillLevel: 1,
      minimumIntervalSeconds: 2,
      inputKey: "reapingEventsPerSecond",
      skillDamageAuthority: "not-in-nether-king-source",
    })],
  }),
  "92100011": definition({
    effectTemplates: [
      engine("minion_skill_level", "add", 1, { unit: "level", sourceLineIndex: 0, scope: "minions" }),
      engine("minion_damage", "more", 4, { unit: "percent", sourceLineIndex: 1, scope: "minions" }),
    ],
  }),
  "92100012": definition({
    inputs: [{ key: "activeMinions", type: "integer", min: 0, cap: 6 }],
    effectTemplates: [engine("minion_max_life", "increase", 15, {
      unit: "percent",
      scope: "minions",
      sourceLineIndex: 1,
    })],
    mechanicTemplates: [mechanic("per-stack-stat", {
      inputKey: "activeMinions",
      cap: 6,
      stat: "minion_damage",
      operation: "more",
      valuePerStack: 2,
      unit: "percent",
      sourceLineIndex: 0,
    })],
  }),
  "92100013": definition({
    authorityStatus: "locale-conflict-scenario",
    inputs: [{ key: "recentCount", fallbackKeys: ["stackCount"], type: "integer", min: 0, cap: 4 }],
    branches: [
      {
        id: "en-recent-critical-strikes",
        locales: ["en"],
        conditionEvent: "recent-critical-strike",
        stat: "critical_strike_damage",
        operation: "add",
        valuePerStack: 20,
        cap: 4,
      },
      {
        id: "ko-cn-recent-non-critical-strikes",
        locales: ["ko", "cn"],
        conditionEvent: "recent-non-critical-strike",
        stat: "critical_strike_damage",
        operation: "add",
        valuePerStack: 20,
        cap: 4,
      },
    ],
  }),
  "92100014": definition({ effectTemplates: [engine("all_skill_levels", "add", 1, { unit: "level" })] }),
  "92100015": definition({
    inputs: [{ key: "distanceMeters", type: "number", min: 0, threshold: { comparator: "at-most", value: 10 } }],
    effectTemplates: [engine("fire_damage_taken", "more", 14, {
      unit: "percent",
      scope: "enemy",
      conditionKey: "enemyWithin10m",
    })],
  }),
  "92100016": definition({
    effectTemplates: [engine("max_lightning_damage", "more", 14, {
      unit: "percent",
      endpoint: "maximum-only",
    })],
    mechanicTemplates: [mechanic("damage-range-endpoint-only", {
      damageType: "lightning",
      minimumMultiplier: 1,
      maximumMultiplier: 1.14,
    })],
  }),
  "92100017": definition({
    inputs: [{ key: "conditionActive", namedKeys: ["coldCriticalStrike"], type: "boolean" }],
    effectTemplates: [engine("cold_damage", "more", 14, {
      unit: "percent",
      conditionKey: "coldCriticalStrike",
      conditionInputKey: "conditionActive",
    })],
  }),
  "92100018": definition({
    inputs: [
      { key: "attackBlockChance", type: "number", min: 0, max: 100 },
      { key: "spellBlockChance", type: "number", min: 0, max: 100 },
    ],
    mechanicTemplates: [mechanic("received-status-effect-multiplier", {
      statuses: ["paralysis", "weaken", "slow"],
      multiplier: 0.5,
      condition: { attackBlockChanceAtLeast: 50, spellBlockChanceAtLeast: 50 },
    })],
  }),
  "92100019": definition({
    authorityStatus: "random-outcome-scenario",
    branches: [
      { id: "convert-to-fire", from: "erosion", to: "fire", percent: 27 },
      { id: "convert-to-cold", from: "erosion", to: "cold", percent: 27 },
      { id: "convert-to-lightning", from: "erosion", to: "lightning", percent: 27 },
    ],
    mechanicTemplates: [mechanic("incoming-damage-random-conversion", {
      from: "erosion",
      convertedPercent: 27,
      retainedPercent: 73,
      outcomes: ["fire", "cold", "lightning"],
      distributionAuthority: "not-present-in-source",
    })],
  }),
  "92100020": definition({
    inputs: [{
      key: "empowerDefensiveRecentCasts",
      fallbackKeys: ["recentCount", "stackCount"],
      type: "integer",
      min: 0,
      cap: 4,
    }],
    mechanicTemplates: [mechanic("per-stack-multiplicative-stat", {
      inputKey: "empowerDefensiveRecentCasts",
      cap: 4,
      stat: "damage",
      operation: "more",
      multiplierPerStack: 1.03,
    })],
  }),
  "92100021": definition({
    inputs: [{ key: "erosionHitStacks", fallbackKeys: ["stackCount"], type: "integer", min: 0, cap: 12 }],
    mechanicTemplates: [mechanic("timed-on-hit-stacks", {
      inputKey: "erosionHitStacks",
      cap: 12,
      durationSeconds: 3,
      stat: "erosion_damage",
      operation: "more",
      valuePerStack: 1,
      unit: "percent",
      stacking: "additive-per-stack",
    })],
  }),

  "92200001": definition({
    inputs: [{ key: "banishmentAdjacentSlateCount", type: "integer", min: 0 }, { key: "banishmentNonAdjacentSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("banishment-per-adjacent", { stat: "aura_effect", operation: "increase", valuePerSlate: 3, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92200002": definition({
    inputs: [{ key: "banishmentAdjacentSlateCount", type: "integer", min: 0 }, { key: "banishmentNonAdjacentSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("banishment-per-adjacent", { stat: "sealed_mana_compensation", operation: "add", valuePerSlate: 3, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92200101": definition({
    inputs: [{ key: "banishmentAdjacentSlateCount", type: "integer", min: 0 }, { key: "banishmentNonAdjacentSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("banishment-per-non-adjacent-multiplicative", { stat: "armor", multiplierPerSlate: 1.03, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92200102": definition({
    inputs: [{ key: "banishmentAdjacentSlateCount", type: "integer", min: 0 }, { key: "banishmentNonAdjacentSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("banishment-per-non-adjacent-multiplicative", { stat: "evasion", multiplierPerSlate: 1.03, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92200103": definition({
    inputs: [{ key: "banishmentAdjacentSlateCount", type: "integer", min: 0 }, { key: "banishmentNonAdjacentSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("banishment-per-non-adjacent-multiplicative", { stat: "max_energy_shield", multiplierPerSlate: 1.03, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92200104": definition({
    inputs: [{ key: "banishmentAdjacentSlateCount", type: "integer", min: 0 }, { key: "banishmentNonAdjacentSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("banishment-per-adjacent-elemental-max-resistance", { valuePerSlate: 1, unit: "percent", sourceLineIndex: 1 })],
  }),

  "92300001": definition({
    inputs: [{ key: "authorityActive", namedKeys: ["judgmentActive"], type: "boolean" }, { key: "judgmentLineSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("judgment-per-line-multiplicative", {
      stat: "damage",
      scope: SELF_AND_MINIONS,
      multiplierPerSlate: 1.03,
      unit: "percent",
      sourceLineIndex: 1,
    })],
  }),
  "92300002": definition({
    inputs: [{ key: "authorityActive", namedKeys: ["judgmentActive"], type: "boolean" }, { key: "judgmentLineSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("judgment-per-line", { stat: "aura_effect", operation: "increase", valuePerSlate: 3, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92300003": definition({
    inputs: [{ key: "authorityActive", namedKeys: ["judgmentActive"], type: "boolean" }, { key: "judgmentLineSlateCount", type: "integer", min: 0 }],
    mechanicTemplates: [mechanic("judgment-per-line", { stat: "origin_of_spirit_magus_effect", operation: "increase", valuePerSlate: 3, unit: "percent", sourceLineIndex: 1 })],
  }),
  "92300004": definition({
    inputs: [{ key: "authorityActive", namedKeys: ["judgmentActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("judgment-affix-effect-increase-multiplier", {
      appliesTo: ["a-corner-of-divinity", "fallen-starlight"],
      baseLineAffixEffectIncreasePercent: 70,
      increaseMultiplier: 1.25,
      resultingAffixMultiplier: 1.875,
      excludes: ["core-affix", "replicated-talent"],
      baseSourceUrl: STRUCTURE_SOURCE_URL,
    })],
  }),
  "92300005": definition({
    inputs: [{ key: "authorityActive", namedKeys: ["judgmentActive"], type: "boolean" }],
    mechanicTemplates: [mechanic("judgment-affix-effect-increase-multiplier", {
      appliesTo: ["non-legendary-divinity-slate"],
      baseLineAffixEffectIncreasePercent: 70,
      increaseMultiplier: 1.2,
      resultingAffixMultiplier: 1.84,
      excludes: ["core-affix", "replicated-talent"],
      baseSourceUrl: STRUCTURE_SOURCE_URL,
    })],
  }),
};

function sourceLines(record) {
  return String(record?.locales?.en?.detail ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function registryRecord(sourceRecord) {
  const semantic = SEMANTIC_DEFINITIONS[sourceRecord.id];
  const lines = sourceLines(sourceRecord);
  return deepFreeze({
    stableId: sourceRecord.id,
    flatItemId: sourceRecord.flatItemId,
    category: sourceRecord.category,
    slotKind: sourceRecord.slotKind,
    valueType: sourceRecord.valueType,
    atomic: true,
    atomicKey: `hades-ss13:${sourceRecord.id}`,
    source: {
      locale: "en",
      sourceUrl: sourceRecord.locales.en.sourceUrl,
      sourceUrlByLocale: Object.fromEntries(
        ["ko", "en", "cn"]
          .filter((locale) => sourceRecord.locales?.[locale]?.sourceUrl)
          .map((locale) => [locale, sourceRecord.locales[locale].sourceUrl]),
      ),
      sourceMethod: sourceRecord.locales.en.sourceMethod,
      sourceRecordKey: sourceRecord.locales.en.sourceRecordKey,
      sourcePageSha256: sourceRecord.locales.en.sourcePageSha256,
      sourceCheckedAt: sourceRecord.locales.en.sourceCheckedAt,
      detail: sourceRecord.locales.en.detail,
    },
    sourceLines: lines,
    lineOwnership: lines.map((text, lineIndex) => ({
      lineIndex,
      text,
      owner: `hades-ss13:${sourceRecord.id}`,
      atomic: true,
    })),
    ...semantic,
  });
}

export const HADES_SS13_SEMANTIC_REGISTRY = deepFreeze(
  TLIDB_NETHER_KING_TALENTS_SS13.records.map(registryRecord),
);

export const HADES_SS13_SEMANTIC_BY_ID = deepFreeze(Object.fromEntries(
  HADES_SS13_SEMANTIC_REGISTRY.map((record) => [record.stableId, record]),
));

export function getHadesTalentSemanticRecord(stableId) {
  const normalized = String(stableId ?? "").replace(/^slates-tlidb-data-id-/u, "");
  return HADES_SS13_SEMANTIC_BY_ID[normalized] ?? null;
}

export function auditHadesSs13SemanticRegistry() {
  const sourceIds = TLIDB_NETHER_KING_TALENTS_SS13.records.map(({ id }) => id);
  const registryIds = HADES_SS13_SEMANTIC_REGISTRY.map(({ stableId }) => stableId);
  const missingStableIds = sourceIds.filter((id) => !HADES_SS13_SEMANTIC_BY_ID[id]);
  const unexpectedStableIds = registryIds.filter((id) => !sourceIds.includes(id));
  const duplicateStableIds = registryIds.filter((id, index) => registryIds.indexOf(id) !== index);
  const unaccountedStableIds = HADES_SS13_SEMANTIC_REGISTRY
    .filter((record) => (
      !record.atomic
      || !record.sourceLines.length
      || record.lineOwnership.length !== record.sourceLines.length
      || (!record.effectTemplates.length && !record.mechanicTemplates.length && !record.branches.length)
    ))
    .map(({ stableId }) => stableId);
  const sourceLineCount = TLIDB_NETHER_KING_TALENTS_SS13.records
    .reduce((sum, record) => sum + sourceLines(record).length, 0);
  const accountedLineCount = HADES_SS13_SEMANTIC_REGISTRY
    .reduce((sum, record) => sum + record.lineOwnership.length, 0);

  return deepFreeze({
    sourceRecordCount: sourceIds.length,
    registryRecordCount: registryIds.length,
    sourceLineCount,
    accountedLineCount,
    unaccountedLineCount: Math.max(0, sourceLineCount - accountedLineCount),
    missingStableIds,
    unexpectedStableIds,
    duplicateStableIds,
    unaccountedStableIds,
    complete: sourceIds.length === 92
      && registryIds.length === 92
      && sourceLineCount === 116
      && accountedLineCount === 116
      && !missingStableIds.length
      && !unexpectedStableIds.length
      && !duplicateStableIds.length
      && !unaccountedStableIds.length,
  });
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function integer(value) {
  return Number.isInteger(value);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function namedConfig(config, key, fallbackKeys = []) {
  return firstDefined(config?.[key], ...fallbackKeys.map((fallback) => config?.[fallback]));
}

function conditionValue(config, namedKey) {
  return firstDefined(config?.conditionActive, config?.[namedKey], config?.conditions?.[namedKey]);
}

function topologyValue(hadesState, config, ...keys) {
  return firstDefined(
    ...keys.map((key) => hadesState?.[key]),
    ...keys.map((key) => config?.[key]),
  );
}

function sourceText(record, lineIndex) {
  return Number.isInteger(lineIndex)
    ? record.sourceLines[lineIndex] ?? record.source.detail
    : record.source.detail;
}

function resolvedEffect(record, template, value = template.value, overrides = {}) {
  return deepFreeze({
    stat: template.stat,
    operation: template.operation,
    value,
    sourceText: sourceText(record, template.sourceLineIndex),
    ...(template.unit ? { unit: template.unit } : {}),
    ...(template.scope ? { scope: template.scope } : {}),
    calculationReady: finiteNumber(value),
    stableId: record.stableId,
    sourceItemId: record.flatItemId,
    sourceUrl: record.source.sourceUrl,
    sourceUrlByLocale: record.source.sourceUrlByLocale,
    sourceRecordKey: record.source.sourceRecordKey,
    ...(Number.isInteger(template.sourceLineIndex) ? {
      sourceLineIndex: template.sourceLineIndex,
    } : {}),
    ...overrides,
  });
}

function renderableMechanics(record, resolved) {
  const renderStatuses = new Set([
    "applied",
    "inactive",
    "input-required",
    "source-conflict",
    "scenario",
  ]);
  const recordStatus = resolved.blockers.length
    ? "input-required"
    : record.authorityStatus === "locale-conflict-scenario"
      ? "source-conflict"
      : ["random-outcome-scenario", "inference-scenario"].includes(record.authorityStatus)
        ? "scenario"
        : null;
  const rows = resolved.mechanics.length
    ? resolved.mechanics
    : [{
      kind: resolved.effects.length ? "numeric-effects" : "semantic-record",
      effects: resolved.effects.map(({ stat, operation, value, unit, scope }) => ({
        stat,
        operation,
        value,
        ...(unit ? { unit } : {}),
        ...(scope ? { scope } : {}),
      })),
    }];
  const blockerInputs = resolved.blockers
    .map(({ inputKey, expectedType }) => inputKey ? ({ key: inputKey, expectedType }) : null)
    .filter(Boolean);

  return rows.map((entry) => {
    const status = renderStatuses.has(entry.status)
      ? entry.status
      : entry.kind === "inactive-condition"
      ? "inactive"
      : recordStatus ?? (entry.active === false ? "inactive" : "applied");
    const value = firstDefined(entry.computedValue, entry.value);
    return {
      sourceItemId: record.flatItemId,
      stableId: record.stableId,
      kind: entry.kind,
      label: record.source.detail,
      ...entry,
      status,
      ...(value !== undefined ? { value } : {}),
      ...(entry.unit ? { unit: entry.unit } : {}),
      ...((record.inputs.length || blockerInputs.length) ? {
        inputs: [
          ...record.inputs.map((input) => ({ ...input })),
          ...blockerInputs.filter(({ key }) => !record.inputs.some((input) => input.key === key)),
        ],
      } : {}),
      ...(record.branches.length && !entry.branches ? {
        branches: record.branches.map((branch) => ({ ...branch })),
      } : {}),
    };
  });
}

function inputBlocker(record, key, expectedType = "value") {
  return deepFreeze({
    reason: "hades-input-required",
    inputKey: key,
    expectedType,
    stableId: record.stableId,
    sourceText: record.source.detail,
  });
}

function invalidInputBlocker(record, key, value, expectedType) {
  return deepFreeze({
    reason: "hades-input-invalid",
    inputKey: key,
    value,
    expectedType,
    stableId: record.stableId,
    sourceText: record.source.detail,
  });
}

function inactiveMechanic(record, condition, facts = {}, sourceLineIndex) {
  return deepFreeze({
    kind: "inactive-condition",
    condition,
    active: false,
    facts,
    stableId: record.stableId,
    sourceText: sourceText(record, sourceLineIndex),
    ...(Number.isInteger(sourceLineIndex) ? { sourceLineIndex } : {}),
  });
}

function dynamicEffect(record, stat, operation, value, options = {}) {
  const { output, ...effectMetadata } = options;
  return resolvedEffect(
    record,
    { stat, operation, ...effectMetadata },
    value,
    { ...effectMetadata, ...(output ?? {}) },
  );
}

function rollValue(roll, min, max) {
  if (finiteNumber(roll) && roll >= min && roll <= max) return roll;
  if (roll === "min") return min;
  if (roll === "max") return max;
  if (roll === "average") return (min + max) / 2;
  return null;
}

function resolveStatic(record, config) {
  const effects = [];
  const blockers = [];
  const mechanics = record.mechanicTemplates.map((entry) => ({
    ...entry,
    stableId: record.stableId,
    sourceText: sourceText(record, entry.sourceLineIndex),
  }));

  for (const template of record.effectTemplates) {
    if (template.conditionKey) {
      const active = conditionValue(config, template.conditionKey);
      if (typeof active !== "boolean") {
        blockers.push(inputBlocker(record, template.conditionInputKey ?? template.conditionKey, "boolean"));
        continue;
      }
      if (!active) {
        mechanics.push(inactiveMechanic(record, template.conditionKey));
        continue;
      }
    }
    if (template.roll) {
      const selected = rollValue(config?.roll, template.roll.min, template.roll.max);
      if (selected == null) {
        effects.push(resolvedEffect(record, template, null, {
          roll: { ...template.roll },
          calculationReady: false,
        }));
        blockers.push(config?.roll == null
          ? inputBlocker(record, "roll", "min-average-max-or-number")
          : invalidInputBlocker(record, "roll", config.roll, "min-average-max-or-number"));
        mechanics.push({
          kind: "roll-scenarios",
          stableId: record.stableId,
          sourceText: record.source.detail,
          branches: [
            { id: "min", value: template.roll.min },
            { id: "average", value: (template.roll.min + template.roll.max) / 2 },
            { id: "max", value: template.roll.max },
          ],
        });
      } else {
        effects.push(resolvedEffect(record, template, selected, { roll: { ...template.roll, selected } }));
      }
      continue;
    }
    effects.push(resolvedEffect(record, template));
  }
  return { effects, blockers, mechanics };
}

function contaminationAuthority(record, hadesState, config) {
  const active = topologyValue(hadesState, config, "contaminationActive", "authorityActive");
  if (typeof active !== "boolean") return { blocker: inputBlocker(record, "authorityActive", "boolean") };
  return { active };
}

function resolveContamination(record, hadesState, config) {
  const authority = contaminationAuthority(record, hadesState, config);
  if (authority.blocker) return { effects: [], blockers: [authority.blocker], mechanics: [] };
  if (!authority.active) {
    return { effects: [], blockers: [], mechanics: [inactiveMechanic(record, "contamination-active")] };
  }

  const template = record.mechanicTemplates[0];
  if (template.conditionKey) {
    const condition = namedConfig(config, template.conditionKey);
    if (typeof condition !== "boolean") {
      return { effects: [], blockers: [inputBlocker(record, template.conditionKey, "boolean")], mechanics: [] };
    }
    if (!condition) {
      return { effects: [], blockers: [], mechanics: [inactiveMechanic(record, template.conditionKey)] };
    }
  }
  if (template.kind === "contamination-adjacency-mode") {
    return {
      effects: [],
      blockers: [],
      mechanics: [{
        ...template,
        active: true,
        authorityStatus: "exact-current-source",
        stableId: record.stableId,
        sourceText: record.source.detail,
      }],
    };
  }

  const baseProjectionPercent = firstDefined(
    hadesState?.contaminationBaseProjectionPercent,
    hadesState?.contaminationProjectionBasePercent,
    config?.contaminationBaseProjectionPercent,
    20,
  );
  const inferredProjectionPercent = Number(
    (baseProjectionPercent * (1 + template.value / 100)).toFixed(12),
  );
  return {
    effects: [],
    blockers: [],
    mechanics: [{
      ...template,
      active: true,
      baseProjectionPercent,
      inferredProjectionPercent,
      formula: "baseProjectionPercent * (1 + projectionEffectIncreasePercent / 100)",
      authorityStatus: "inference-scenario",
      inferenceReason: "The source supplies 20% base strength and a Projection Effect increase, but no worked numeric example.",
      stableId: record.stableId,
      sourceText: record.source.detail,
    }],
  };
}

function banishmentCounts(record, hadesState, config) {
  const adjacent = topologyValue(hadesState, config, "banishmentAdjacentSlateCount", "adjacentSlateCount");
  const nonAdjacent = topologyValue(hadesState, config, "banishmentNonAdjacentSlateCount", "nonAdjacentSlateCount");
  const blockers = [];
  if (!integer(adjacent) || adjacent < 0) blockers.push(
    adjacent == null
      ? inputBlocker(record, "banishmentAdjacentSlateCount", "non-negative-integer")
      : invalidInputBlocker(record, "banishmentAdjacentSlateCount", adjacent, "non-negative-integer"),
  );
  if (!integer(nonAdjacent) || nonAdjacent < 0) blockers.push(
    nonAdjacent == null
      ? inputBlocker(record, "banishmentNonAdjacentSlateCount", "non-negative-integer")
      : invalidInputBlocker(record, "banishmentNonAdjacentSlateCount", nonAdjacent, "non-negative-integer"),
  );
  return { adjacent, nonAdjacent, blockers };
}

function resolveBanishmentImprint(record, hadesState, config, effectScale = 1) {
  const explicitlyActive = topologyValue(hadesState, config, "banishmentActive", "authorityActive");
  if (typeof explicitlyActive !== "boolean") {
    return { effects: [], blockers: [inputBlocker(record, "authorityActive", "boolean")], mechanics: [] };
  }
  if (!explicitlyActive) {
    return {
      effects: [],
      blockers: [],
      mechanics: [inactiveMechanic(record, "banishment-active")],
    };
  }
  const counts = banishmentCounts(record, hadesState, config);
  if (counts.blockers.length) return { effects: [], blockers: counts.blockers, mechanics: [] };
  const active = counts.adjacent >= 4 && counts.nonAdjacent >= 4;
  const activation = {
    kind: "banishment-activation",
    active,
    adjacentSlateCount: counts.adjacent,
    nonAdjacentSlateCount: counts.nonAdjacent,
    rule: "adjacent >= 4 && nonAdjacent >= 4",
    sourceUrl: HYPERLINK_SOURCE_URL,
    stableId: record.stableId,
    sourceLineIndex: 0,
    sourceText: sourceText(record, 0),
  };
  if (!active) {
    return { effects: [], blockers: [], mechanics: [activation, inactiveMechanic(record, "banishment-active", counts, 0)] };
  }

  const template = record.mechanicTemplates[0];
  const effects = [];
  if (template.kind === "banishment-per-adjacent") {
    effects.push(dynamicEffect(record, template.stat, template.operation, template.valuePerSlate * counts.adjacent, {
      unit: "percent",
      scope: "self",
      sourceLineIndex: template.sourceLineIndex,
    }));
  } else if (template.kind === "banishment-per-non-adjacent-multiplicative") {
    const scaledStep = (template.multiplierPerSlate - 1) * effectScale;
    const multiplier = (1 + scaledStep) ** counts.nonAdjacent;
    effects.push(dynamicEffect(record, template.stat, "more", (multiplier - 1) * 100, {
      unit: "percent",
      sourceLineIndex: template.sourceLineIndex,
      effectScaleApplied: true,
      output: { multiplier, stackCount: counts.nonAdjacent, scaledStep },
    }));
  } else if (template.kind === "banishment-per-adjacent-elemental-max-resistance") {
    for (const stat of ["max_fire_resistance", "max_cold_resistance", "max_lightning_resistance"]) {
      effects.push(dynamicEffect(record, stat, "add", counts.adjacent * template.valuePerSlate, {
        unit: "percent",
        sourceLineIndex: template.sourceLineIndex,
      }));
    }
  }
  return {
    effects,
    blockers: [],
    mechanics: [{ ...activation }, {
      ...template,
      active: true,
      adjacentSlateCount: counts.adjacent,
      nonAdjacentSlateCount: counts.nonAdjacent,
      stableId: record.stableId,
      sourceText: sourceText(record, template.sourceLineIndex),
    }],
  };
}

function judgmentAuthority(record, hadesState, config) {
  const active = topologyValue(hadesState, config, "judgmentActive", "authorityActive");
  if (typeof active !== "boolean") return { blocker: inputBlocker(record, "authorityActive", "boolean") };
  return { active };
}

function judgmentLineCount(record, hadesState, config) {
  const count = topologyValue(hadesState, config, "judgmentLineSlateCount", "lineSlateCount");
  if (!integer(count) || count < 0) {
    return {
      blocker: count == null
        ? inputBlocker(record, "judgmentLineSlateCount", "non-negative-integer")
        : invalidInputBlocker(record, "judgmentLineSlateCount", count, "non-negative-integer"),
    };
  }
  return { count };
}

function resolveJudgment(record, hadesState, config, effectScale = 1) {
  const authority = judgmentAuthority(record, hadesState, config);
  if (authority.blocker) return { effects: [], blockers: [authority.blocker], mechanics: [] };
  if (!authority.active) {
    return { effects: [], blockers: [], mechanics: [inactiveMechanic(record, "judgment-active", {}, 0)] };
  }
  const template = record.mechanicTemplates[0];
  const activation = record.sourceLines.length > 1
    ? [{
        kind: "judgment-activation",
        active: true,
        stableId: record.stableId,
        sourceLineIndex: 0,
        sourceText: sourceText(record, 0),
      }]
    : [];
  if (template.kind === "judgment-affix-effect-increase-multiplier") {
    return {
      effects: [],
      blockers: [],
      mechanics: [...activation, {
        ...template,
        active: true,
        stableId: record.stableId,
        sourceText: record.source.detail,
        formula: `1 + (${template.baseLineAffixEffectIncreasePercent} / 100 * ${template.increaseMultiplier})`,
      }],
    };
  }

  const line = judgmentLineCount(record, hadesState, config);
  if (line.blocker) return { effects: [], blockers: [line.blocker], mechanics: [] };
  if (line.count === 0) {
    return {
      effects: [],
      blockers: [],
      mechanics: [...activation, {
        ...template,
        active: true,
        lineSlateCount: 0,
        computedValue: 0,
        stableId: record.stableId,
        sourceText: sourceText(record, template.sourceLineIndex),
      }],
    };
  }
  let effect;
  let computedValue;
  if (template.kind === "judgment-per-line-multiplicative") {
    const scaledStep = (template.multiplierPerSlate - 1) * effectScale;
    const multiplier = (1 + scaledStep) ** line.count;
    computedValue = (multiplier - 1) * 100;
    effect = dynamicEffect(record, template.stat, "more", computedValue, {
      unit: "percent",
      scope: template.scope,
      sourceLineIndex: template.sourceLineIndex,
      effectScaleApplied: true,
      output: { multiplier, stackCount: line.count, scaledStep },
    });
  } else {
    computedValue = template.valuePerSlate * line.count;
    effect = dynamicEffect(record, template.stat, template.operation, computedValue, {
      unit: "percent",
      sourceLineIndex: template.sourceLineIndex,
    });
  }
  return {
    effects: [effect],
    blockers: [],
    mechanics: [...activation, {
      ...template,
      active: true,
      lineSlateCount: line.count,
      computedValue,
      stableId: record.stableId,
      sourceText: sourceText(record, template.sourceLineIndex),
    }],
  };
}

function requiredNumber(record, config, key, fallbackKeys = [], { integerOnly = false } = {}) {
  const value = namedConfig(config, key, fallbackKeys);
  if (value == null) return { blocker: inputBlocker(record, key, integerOnly ? "non-negative-integer" : "number") };
  if (!finiteNumber(value) || (integerOnly && !integer(value)) || value < 0) {
    return { blocker: invalidInputBlocker(record, key, value, integerOnly ? "non-negative-integer" : "non-negative-number") };
  }
  return { value };
}

function resolveCommonDynamic(record, config, effectScale = 1) {
  const id = record.stableId;
  if (id === "92100002" || id === "92100015") {
    const threshold = id === "92100002" ? 4 : 10;
    const namedCondition = id === "92100002" ? "enemyInProximity" : "enemyWithin10m";
    const distance = config?.distanceMeters;
    let active;
    if (typeof config?.conditionActive === "boolean") active = config.conditionActive;
    else if (finiteNumber(distance) && distance >= 0) active = distance <= threshold;
    else return { effects: [], blockers: [inputBlocker(record, "distanceMeters", "non-negative-number")], mechanics: [] };
    if (!active) {
      return { effects: [], blockers: [], mechanics: [inactiveMechanic(record, namedCondition, { distanceMeters: distance, threshold })] };
    }
    const result = resolveStatic(record, { ...config, [namedCondition]: true });
    result.mechanics.push({
      kind: "distance-condition",
      active: true,
      distanceMeters: distance ?? null,
      distanceMetersAtMost: threshold,
      stableId: id,
      sourceText: record.source.detail,
    });
    return result;
  }

  if (id === "92100003") {
    const input = requiredNumber(record, config, "spellSkillLevelBonus", [], { integerOnly: true });
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    const stacks = Math.min(input.value, 10);
    return {
      effects: [
        dynamicEffect(record, "spell_critical_strike_rating", "add", 5 * stacks, { unit: "flat" }),
        dynamicEffect(record, "spell_critical_strike_rating", "increase", 10 * stacks, { unit: "percent" }),
      ],
      blockers: [],
      mechanics: [{ ...record.mechanicTemplates[0], stackCount: stacks, stableId: id, sourceText: record.source.detail }],
    };
  }
  if (id === "92100004") {
    const input = requiredNumber(record, config, "sealedLifePercent");
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    if (input.value > 100) return { effects: [], blockers: [invalidInputBlocker(record, "sealedLifePercent", input.value, "number-0-through-100")], mechanics: [] };
    const value = input.value * 0.14;
    return {
      effects: [dynamicEffect(record, "spell_damage", "more", value, { unit: "percent" })],
      blockers: [],
      mechanics: [{ ...record.mechanicTemplates[0], inputValue: input.value, computedValue: value, stableId: id, sourceText: record.source.detail }],
    };
  }
  if (id === "92100007") {
    const input = requiredNumber(record, config, "knockbackDistanceIncrease");
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    const stacks = Math.min(Math.floor(input.value / 6), 14);
    return {
      effects: stacks ? [dynamicEffect(record, "projectile_damage", "more", stacks, { unit: "percent" })] : [],
      blockers: [],
      mechanics: [{ ...record.mechanicTemplates[0], inputValue: input.value, stackCount: stacks, computedValue: stacks, stableId: id, sourceText: record.source.detail }],
    };
  }
  if (id === "92100010") {
    const events = config?.reapingEventsPerSecond;
    if (events != null && (!finiteNumber(events) || events < 0)) {
      return { effects: [], blockers: [invalidInputBlocker(record, "reapingEventsPerSecond", events, "non-negative-number")], mechanics: [] };
    }
    return {
      effects: [],
      blockers: [],
      mechanics: [{
        ...record.mechanicTemplates[0],
        ...(finiteNumber(events) ? { reapingEventsPerSecond: events } : {}),
        calculationState: "exact-trigger-rule-average-rate-unresolved",
        stableId: id,
        sourceText: record.source.detail,
      }],
    };
  }
  if (id === "92100012") {
    const input = requiredNumber(record, config, "activeMinions", [], { integerOnly: true });
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    const stacks = Math.min(input.value, 6);
    const result = resolveStatic(record, config);
    result.effects.push(dynamicEffect(record, "minion_damage", "more", 2 * stacks, {
      unit: "percent",
      scope: "minions",
      sourceLineIndex: 0,
    }));
    result.mechanics.push({ ...record.mechanicTemplates[0], stackCount: stacks, computedValue: 2 * stacks, stableId: id, sourceText: record.sourceLines[0] });
    return result;
  }
  if (id === "92100013") {
    const input = requiredNumber(record, config, "recentCount", ["stackCount"], { integerOnly: true });
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    const stacks = Math.min(input.value, 4);
    return {
      effects: [],
      blockers: [],
      mechanics: [{
        kind: "locale-conflict-branches",
        authorityStatus: "locale-conflict-scenario",
        stackCount: stacks,
        branches: record.branches.map((branch) => ({ ...branch, computedValue: branch.valuePerStack * stacks })),
        stableId: id,
        sourceText: record.source.detail,
      }],
    };
  }
  if (id === "92100018") {
    let active;
    const attack = config?.attackBlockChance;
    const spell = config?.spellBlockChance;
    if (typeof config?.conditionActive === "boolean") active = config.conditionActive;
    else {
      const invalidBlockers = [];
      if (attack != null && (!finiteNumber(attack) || attack < 0 || attack > 100)) {
        invalidBlockers.push(invalidInputBlocker(record, "attackBlockChance", attack, "number-0-through-100"));
      }
      if (spell != null && (!finiteNumber(spell) || spell < 0 || spell > 100)) {
        invalidBlockers.push(invalidInputBlocker(record, "spellBlockChance", spell, "number-0-through-100"));
      }
      if (invalidBlockers.length) return { effects: [], blockers: invalidBlockers, mechanics: [] };
      if (finiteNumber(attack) && finiteNumber(spell)) active = attack >= 50 && spell >= 50;
      else {
        const blockers = [];
        if (!finiteNumber(attack)) blockers.push(inputBlocker(record, "attackBlockChance", "number"));
        if (!finiteNumber(spell)) blockers.push(inputBlocker(record, "spellBlockChance", "number"));
        return { effects: [], blockers, mechanics: [] };
      }
    }
    if (!active) return { effects: [], blockers: [], mechanics: [inactiveMechanic(record, "attack-and-spell-block-at-least-50", { attackBlockChance: attack, spellBlockChance: spell })] };
    return {
      effects: [],
      blockers: [],
      mechanics: [{ ...record.mechanicTemplates[0], active: true, attackBlockChance: attack ?? null, spellBlockChance: spell ?? null, stableId: id, sourceText: record.source.detail }],
    };
  }
  if (id === "92100019") {
    return {
      effects: [],
      blockers: [],
      mechanics: [{
        ...record.mechanicTemplates[0],
        authorityStatus: "random-outcome-scenario",
        branches: record.branches.map((branch) => ({ ...branch })),
        stableId: id,
        sourceText: record.source.detail,
      }],
    };
  }
  if (id === "92100020") {
    const input = requiredNumber(record, config, "empowerDefensiveRecentCasts", ["recentCount", "stackCount"], { integerOnly: true });
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    const stacks = Math.min(input.value, 4);
    const scaledStep = 0.03 * effectScale;
    const multiplier = (1 + scaledStep) ** stacks;
    return {
      effects: stacks ? [dynamicEffect(record, "damage", "more", (multiplier - 1) * 100, {
        unit: "percent",
        effectScaleApplied: true,
        output: { multiplier, stackCount: stacks, scaledStep },
      })] : [],
      blockers: [],
      mechanics: [{ ...record.mechanicTemplates[0], stackCount: stacks, multiplier, stableId: id, sourceText: record.source.detail }],
    };
  }
  if (id === "92100021") {
    const input = requiredNumber(record, config, "erosionHitStacks", ["stackCount"], { integerOnly: true });
    if (input.blocker) return { effects: [], blockers: [input.blocker], mechanics: [] };
    const stacks = Math.min(input.value, 12);
    return {
      effects: stacks ? [dynamicEffect(record, "erosion_damage", "more", stacks, { unit: "percent" })] : [],
      blockers: [],
      mechanics: [{ ...record.mechanicTemplates[0], stackCount: stacks, computedValue: stacks, stableId: id, sourceText: record.source.detail }],
    };
  }
  return null;
}

export const HADES_BANISHMENT_PROFILE_REGISTRY = deepFreeze({
  demolisher: {
    id: "demolisher",
    name: "Banishment: Demolisher",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [
      { key: "banishmentConditionActive", fallbackKeys: ["conditionActive", "enemyParalyzed"], type: "boolean" },
      { key: "banishmentParalysisEffectBonus", fallbackKeys: ["paralysisEffectBonus"], type: "number", min: 0 },
    ],
    mechanics: [
      mechanic("apply-status-on-cast", { skillTag: "demolisher", status: "paralysis", radiusMeters: 15 }),
      mechanic("conditional-stat", { condition: "enemy-paralyzed", stat: "demolisher_skill_damage", operation: "more", value: 20, unit: "percent" }),
      mechanic("effect-inheritance", { sourceStat: "paralysis_effect", target: "conditional-damage-bonus" }),
    ],
  },
  steep_strike: {
    id: "steep_strike",
    name: "Banishment: Steep Strike",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentSteepStrikeChance", fallbackKeys: ["steepStrikeChance"], type: "number", min: 0 }],
    mechanics: [
      mechanic("chance-over-threshold", { threshold: 100, inputKey: "banishmentSteepStrikeChance", coreTriggerChancePerPercent: 1 }),
      mechanic("triggered-core-skill-bonus", { damageMore: 70, skillAreaIncrease: 70, unit: "percent" }),
    ],
  },
  shadow_strike: {
    id: "shadow_strike",
    name: "Banishment: Shadow Strike",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentConditionActive", fallbackKeys: ["conditionActive", "usedAttackMobilityRecently"], type: "boolean" }],
    mechanics: [
      mechanic("conditional-stat", { condition: "after-attack-mobility", durationSeconds: 4, stat: "shadow_strike_damage", operation: "more", value: 12, unit: "percent" }),
      mechanic("trigger-core-skills", { trigger: "cast-attack-mobility", count: 2, skillTag: "shadow-strike" }),
    ],
  },
  spell_burst: {
    id: "spell_burst",
    name: "Banishment: Spell Burst",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentSpellBurstAtCap", fallbackKeys: ["spellBurstAtCap"], type: "boolean" }],
    mechanics: [
      mechanic("stat", { scope: "spell-burst-cast-skill-on-hit", stat: "on_hit_damage", operation: "more", value: 28, unit: "percent" }),
      mechanic("trigger", { condition: "spell-burst-charges-at-cap", target: "nearest-enemy", radiusMeters: 25, action: "trigger-core-spell-and-attempt-spell-burst" }),
      mechanic("stat", { scope: "self", stat: "movement_speed", operation: "increase", value: -30, unit: "percent" }),
    ],
  },
  ill_omen: {
    id: "ill_omen",
    name: "Banishment: Ill Omen",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [
      { key: "banishmentConditionActive", fallbackKeys: ["conditionActive"], type: "boolean", meaning: "dealing-damage-over-time" },
      { key: "banishmentEnemyElite", fallbackKeys: ["enemyElite"], type: "boolean" },
      { key: "banishmentEnemyLifePercent", fallbackKeys: ["enemyLifePercent"], type: "number", min: 0, max: 100 },
    ],
    mechanics: [
      mechanic("minimum-status-stacks", { target: "nearby-elite", radiusMeters: 15, status: "ill-omen", minimumStacks: 4 }),
      mechanic("execute", { damageType: "damage-over-time", targetLifeBelowPercent: 20 }),
      mechanic("resource-loss-on-kill", { target: "elite", maxLifePercent: 3, maxEnergyShieldPercent: 3 }),
    ],
  },
  quagmire: {
    id: "quagmire",
    name: "Banishment: Quagmire",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentCurseEffectCount", fallbackKeys: ["curseEffectCount"], type: "integer", min: 0 }],
    activationAuthorityStatus: "source-conflict-scenario",
    activationBranches: [
      {
        id: "general-banishment-at-least-four",
        sourceUrl: HYPERLINK_SOURCE_URL,
        adjacent: { comparator: "at-least", value: 4 },
        nonAdjacent: { comparator: "at-least", value: 4 },
      },
      {
        id: "quagmire-exactly-four",
        sourceUrl: HYPERLINK_SOURCE_URL,
        adjacent: { comparator: "exactly", value: 4 },
        nonAdjacent: { comparator: "exactly", value: 4 },
      },
    ],
    mechanics: [mechanic("per-stack-stat", { inputKey: "banishmentCurseEffectCount", stat: "terra_skill_damage", operation: "more", valuePerStack: 20, unit: "percent" })],
  },
  projection: {
    id: "projection",
    name: "Banishment: Projection",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentProjectionStacks", fallbackKeys: ["stackCount"], type: "integer", min: 0, cap: 5 }],
    mechanics: [
      mechanic("timed-stacks", { trigger: "use-attack-horizontal-projectile", durationSeconds: 4, cap: 5, status: "nether-king-projection" }),
      mechanic("permanent-projectile-penetration-at-cap", { projectileKind: "horizontal" }),
      mechanic("per-stack-stats", { damageMorePerStack: 18, proximityEnemyDamageTakenMorePerStack: 6, unit: "percent" }),
    ],
  },
  provision: {
    id: "provision",
    name: "Banishment: Provision",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentMinionAffectedByElixir", fallbackKeys: ["minionAffectedByElixir"], type: "boolean" }],
    mechanics: [
      mechanic("redirect-skill-effect", { skillTag: "non-restoration-elixir", from: "self", to: "minions" }),
      mechanic("stat", { stat: "elixir_skill_effect", operation: "increase", value: 100, unit: "percent" }),
      mechanic("conditional-stat", { condition: "minion-affected-by-elixir", stat: "minion_damage", operation: "more", value: 15, unit: "percent" }),
    ],
  },
  tangle: {
    id: "tangle",
    name: "Banishment: Tangle",
    sourceUrl: HYPERLINK_SOURCE_URL,
    inputs: [{ key: "banishmentNearestSyntheticTroopMaxLife", fallbackKeys: ["nearestSyntheticTroopMaxLife"], type: "number", min: 0 }],
    mechanics: [
      mechanic("redirect-attachment", { mechanic: "tangle", from: "enemy", to: "minion" }),
      mechanic("divisor-stat", { inputKey: "banishmentNearestSyntheticTroopMaxLife", divisor: 40, cap: 260, stat: "tangle_damage", operation: "more", valuePerUnit: 1, unit: "percent" }),
    ],
  },
  indomitable: {
    id: "indomitable",
    name: "Banishment: Indomitable",
    sourceUrl: STRUCTURE_SOURCE_URL,
    inputs: [{ key: "banishmentConditionActive", fallbackKeys: ["conditionActive", "indomitableReadyOrTriggered"], type: "boolean" }],
    mechanics: [
      mechanic("fatal-damage-replacement", { temporaryLifePercent: 100, lossPercent: 100, lossDurationSeconds: 4, cooldownSeconds: 20 }),
      mechanic("conditional-stat", { condition: "ready-or-triggered", stat: "damage", scope: SELF_AND_MINIONS, operation: "more", value: 30, unit: "percent" }),
    ],
  },
});

const TANGLE_CAP_SOURCE_URL = "https://tlidb.com/cn/Effect%3A_Tangle";
const PROJECTION_DETAIL_SOURCE_URL = "https://tlidb.com/ko/Effect%3A_Projection";

const HADES_PROFILE_SOURCE_LINK = deepFreeze({
  role: "profile",
  urlByLocale: { ko: HYPERLINK_KO_SOURCE_URL, en: HYPERLINK_SOURCE_URL },
});

function officialBanishmentLocaleSupplement(profileId, mechanicIndex, {
  sourceLocaleStatus = "official-ss13-patch-note",
  additionalLocaleStatus = {},
  sourceLinks = [HADES_PROFILE_SOURCE_LINK],
} = {}) {
  const sourceSupplement = HADES_KOREAN_PRESENTATION.banishmentMechanics?.[profileId]?.[mechanicIndex];
  if (sourceSupplement?.verified !== true) {
    return {
      sourceLocaleStatus: { ko: "mixed-language-unavailable", en: "mixed-language-unavailable" },
    };
  }
  const verifiedConflicts = (sourceSupplement.conflicts ?? []).filter(({ verified }) => verified === true);
  return {
    sourceTextByLocale: sourceSupplement.sourceTextByLocale,
    sourceLocaleStatus: { ko: sourceLocaleStatus, en: sourceLocaleStatus, ...additionalLocaleStatus },
    sourceSupplement,
    ...(verifiedConflicts.length ? {
      sourceSupplementConflictTextByLocale: verifiedConflicts[0].sourceTextByLocale,
    } : {}),
    sourceLinks: [
      ...sourceLinks,
      { role: "official-patch-notes", url: sourceSupplement.sourceUrl },
      ...verifiedConflicts.map((conflict) => ({
        role: "official-patch-conflict",
        url: conflict.sourceUrl,
      })),
    ],
  };
}

const HADES_BANISHMENT_PROFILE_PRESENTATION = deepFreeze({
  demolisher: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.demolisher, en: "Banishment: Demolisher" },
    mechanics: [
      {},
      {
        requiredInputKeys: ["banishmentConditionActive", "banishmentParalysisEffectBonus"],
      },
      {},
    ],
  },
  steep_strike: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.steep_strike, en: "Banishment: Steep Strike" },
    mechanics: [
      {
        requiredInputKeys: ["banishmentSteepStrikeChance"],
        sourceOriginalByLocale: {
          ko: "释放核心斩击技能时，每拥有 1% 超过 100% 的斩击几率，+1% 几率触发一次核心斩击技能，并使该次触发的技能额外 +70% 伤害、+70% 技能范围",
          en: "释放核心斩击技能时，每拥有 1% 超过 100% 的斩击几率，+1% 几率触发一次核心斩击技能，并使该次触发的技能额外 +70% 伤害、+70% 技能范围",
        },
        ...officialBanishmentLocaleSupplement("steep_strike", 0),
      },
      {
        requiredInputKeys: ["banishmentSteepStrikeChance"],
        sourceOriginalByLocale: {
          ko: "释放核心斩击技能时，每拥有 1% 超过 100% 的斩击几率，+1% 几率触发一次核心斩击技能，并使该次触发的技能额外 +70% 伤害、+70% 技能范围",
          en: "释放核心斩击技能时，每拥有 1% 超过 100% 的斩击几率，+1% 几率触发一次核心斩击技能，并使该次触发的技能额外 +70% 伤害、+70% 技能范围",
        },
        ...officialBanishmentLocaleSupplement("steep_strike", 1),
      },
    ],
  },
  shadow_strike: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.shadow_strike, en: "Banishment: Shadow Strike" },
    mechanics: [
      { requiredInputKeys: ["banishmentConditionActive"] },
      {},
    ],
  },
  spell_burst: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.spell_burst, en: "Banishment: Spell Burst" },
    mechanics: [
      {
        sourceOriginalByLocale: { ko: "法术迸发 释放的技能额外 +28% 击中伤害", en: "法术迸发 释放的技能额外 +28% 击中伤害" },
        ...officialBanishmentLocaleSupplement("spell_burst", 0),
      },
      {
        requiredInputKeys: ["banishmentSpellBurstAtCap"],
        sourceOriginalByLocale: {
          ko: "法术迸发 充能达到上限时，对 25 米内最近的敌人触发核心法术技能，并尝试激活核心法术技能的 法术迸发",
          en: "法术迸发 充能达到上限时，对 25 米内最近的敌人触发核心法术技能，并尝试激活核心法术技能的 法术迸发",
        },
        ...officialBanishmentLocaleSupplement("spell_burst", 1),
      },
      {
        sourceOriginalByLocale: { ko: "-30% 移动速度", en: "-30% 移动速度" },
        ...officialBanishmentLocaleSupplement("spell_burst", 2, {
          sourceLocaleStatus: "source-conflict",
          sourceLinks: [
            {
              role: "conflict-line",
              urlByLocale: { ko: HYPERLINK_KO_SOURCE_URL, en: HYPERLINK_SOURCE_URL },
            },
            { role: "profile-omission", url: STRUCTURE_SOURCE_URL },
          ],
        }),
        sourceConflict: true,
        branches: [
          { id: "hyperlink-mixed-locale-line", value: -30, unit: "percent", locales: ["ko", "en"] },
          { id: "nether-king-profile-omission", active: false },
        ],
      },
    ],
  },
  ill_omen: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.ill_omen, en: "Banishment: Ill Omen" },
    mechanics: [
      {},
      { requiredInputKeys: ["banishmentConditionActive", "banishmentEnemyLifePercent"] },
      {
        sourceLocaleStatus: { ko: "source-conflict", en: "source-conflict" },
        sourceConflict: true,
        requiredInputKeys: ["banishmentEnemyElite"],
      },
    ],
  },
  quagmire: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.quagmire, en: "Banishment: Quagmire" },
    mechanics: [
      { requiredInputKeys: ["banishmentCurseEffectCount"] },
    ],
  },
  projection: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.projection, en: "Banishment: Projection" },
    mechanics: [
      { requiredInputKeys: ["banishmentProjectionStacks"] },
      { requiredInputKeys: ["banishmentProjectionStacks"] },
      {
        sourceLocaleStatus: { ko: "exact-linked-detail", en: "exact-linked-detail" },
        requiredInputKeys: ["banishmentProjectionStacks"],
        sourceUrl: PROJECTION_DETAIL_SOURCE_URL,
        sourceUrlByLocale: { ko: PROJECTION_DETAIL_SOURCE_URL, en: PROJECTION_DETAIL_SOURCE_URL },
        sourceLinks: [
          {
            role: "profile",
            urlByLocale: { ko: HYPERLINK_KO_SOURCE_URL, en: HYPERLINK_SOURCE_URL },
          },
          { role: "linked-detail", url: PROJECTION_DETAIL_SOURCE_URL },
        ],
      },
    ],
  },
  provision: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.provision, en: "Banishment: Provision" },
    mechanics: [
      {},
      {},
      { requiredInputKeys: ["banishmentMinionAffectedByElixir"] },
    ],
  },
  tangle: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.tangle, en: "Banishment: Tangle" },
    mechanics: [
      {
        sourceOriginalByLocale: { ko: "纠缠附着召唤物而不是敌人", en: "纠缠附着召唤物而不是敌人" },
        ...officialBanishmentLocaleSupplement("tangle", 0),
      },
      {
        sourceOriginalByLocale: {
          ko: "纠缠释放技能时，距离最近的一个智械召唤物每有 40 点最大生命，额外 +1% 纠缠伤害，最多额外 +260%",
          en: "纠缠释放技能时，距离最近的一个智械召唤物每有 40 点最大生命，额外 +1% 纠缠伤害，最多额外 +260%",
          cn: "纠缠释放技能时，距离最近的一个智械召唤物每有 40 点最大生命，额外 +1% 纠缠伤害，最多额外 +260%",
        },
        sourceUrl: TANGLE_CAP_SOURCE_URL,
        sourceUrlByLocale: { ko: HYPERLINK_KO_SOURCE_URL, en: HYPERLINK_SOURCE_URL, cn: TANGLE_CAP_SOURCE_URL },
        ...officialBanishmentLocaleSupplement("tangle", 1, {
          additionalLocaleStatus: { cn: "exact" },
          sourceLinks: [
            HADES_PROFILE_SOURCE_LINK,
            { role: "numeric-authority", url: TANGLE_CAP_SOURCE_URL },
          ],
        }),
        requiredInputKeys: ["banishmentNearestSyntheticTroopMaxLife"],
      },
    ],
  },
  indomitable: {
    name: { ko: HADES_KOREAN_PRESENTATION.banishmentNames.indomitable, en: "Banishment: Indomitable" },
    mechanics: [
      {},
      { requiredInputKeys: ["banishmentConditionActive"] },
    ],
  },
});

const HADES_BANISHMENT_PROFILE_RECEIPTS = TLIDB_NETHER_KING_TALENTS_SS13
  .banishmentProfileReceipts;
const HADES_BANISHMENT_PROFILE_RECEIPT_INDEX = new Map(
  (HADES_BANISHMENT_PROFILE_RECEIPTS?.profiles ?? []).map((profile) => [profile.id, profile]),
);

function banishmentProfileMechanicReceipt(profileId, mechanicIndex) {
  return HADES_BANISHMENT_PROFILE_RECEIPT_INDEX.get(profileId)?.mechanics?.[mechanicIndex] ?? null;
}

function completeBanishmentReceipt(receipt) {
  if (!receipt || !Number.isInteger(receipt.sourceLineIndex)) return false;
  return ["ko", "en", "cn"].every((locale) => {
    const localized = receipt.locales?.[locale];
    return localized?.sourceUrl === `https://tlidb.com/${locale}/Hyperlink`
      && localized.sourceRecordKey === `href:${receipt.sourceHref}`
      && localized.sourceField === "detail"
      && localized.sourceLineIndex === receipt.sourceLineIndex
      && /^[a-f0-9]{64}$/u.test(localized.sourcePageSha256 ?? "")
      && typeof localized.sourceCheckedAt === "string"
      && !Number.isNaN(Date.parse(localized.sourceCheckedAt))
      && typeof localized.sourceText === "string"
      && localized.sourceText.length > 0;
  });
}

function presentedBanishmentMechanics(profile, active) {
  const presentation = HADES_BANISHMENT_PROFILE_PRESENTATION[profile.id];
  return profile.mechanics.map((entry, index) => {
    const source = presentation?.mechanics?.[index] ?? {};
    const receipt = banishmentProfileMechanicReceipt(profile.id, index);
    const sourceLocaleStatus = source.sourceLocaleStatus ?? {
      ko: receipt?.locales?.ko?.sourceText ? "exact" : "unavailable",
      en: receipt?.locales?.en?.sourceText ? "exact" : "unavailable",
    };
    const sourceTextByLocale = Object.fromEntries(["ko", "en"].map((locale) => {
      if (["mixed-language-unavailable", "unavailable"].includes(sourceLocaleStatus[locale])) {
        return [locale, null];
      }
      return [locale, source.sourceSupplement?.verified === true
        ? source.sourceTextByLocale?.[locale] ?? null
        : receipt?.locales?.[locale]?.sourceText
          ?? source.sourceTextByLocale?.[locale]
        ?? null];
    }));
    const sourceOriginalByLocale = source.sourceOriginalByLocale
      ? Object.fromEntries(Object.keys(source.sourceOriginalByLocale).map((locale) => [
        locale,
        receipt?.locales?.[locale]?.sourceText ?? source.sourceOriginalByLocale[locale],
      ]))
      : null;
    const displayTextByLocale = source.displayTextByLocale ?? sourceTextByLocale;
    const sourceUrlByLocale = source.sourceUrlByLocale ?? {
      ko: HYPERLINK_KO_SOURCE_URL,
      en: HYPERLINK_SOURCE_URL,
    };
    const sourceLinks = source.sourceLinks ?? [{
      role: "profile",
      urlByLocale: sourceUrlByLocale,
    }];
    return {
      ...entry,
      active,
      displayNameByLocale: presentation?.name ?? { en: profile.name },
      sourceText: sourceTextByLocale.en ?? displayTextByLocale.en ?? profile.name,
      sourceTextByLocale,
      displayTextByLocale,
      ...(sourceOriginalByLocale ? { sourceOriginalByLocale } : {}),
      ...(source.sourceSupplement ? { sourceSupplement: source.sourceSupplement } : {}),
      ...(source.sourceSupplementConflictTextByLocale ? {
        sourceSupplementConflictTextByLocale: source.sourceSupplementConflictTextByLocale,
      } : {}),
      ...(source.branches ? { branches: source.branches } : {}),
      ...(source.requiredInputKeys ? { requiredInputKeys: source.requiredInputKeys } : {}),
      sourceUrlByLocale,
      sourceLinks,
      sourceLocaleStatus,
      ...(receipt ? {
        sourceReceiptByLocale: receipt.locales,
        sourceRecordKey: receipt.locales?.en?.sourceRecordKey,
        sourceField: receipt.locales?.en?.sourceField,
        sourceLineIndex: receipt.sourceLineIndex,
        sourcePageSha256: receipt.locales?.en?.sourcePageSha256,
        sourceCheckedAt: receipt.locales?.en?.sourceCheckedAt,
      } : {}),
      ...(source.sourceConflict ? { sourceConflict: true, status: "source-conflict" } : {}),
      sourceUrl: source.sourceUrl ?? sourceUrlByLocale.en ?? HYPERLINK_SOURCE_URL,
    };
  });
}

export function auditHadesSs13FullCalculationSupport() {
  const talents = auditHadesSs13SemanticRegistry();
  const profileIds = Object.keys(HADES_BANISHMENT_PROFILE_REGISTRY);
  const profileMechanicCount = profileIds.reduce((sum, profileId) => (
    sum + HADES_BANISHMENT_PROFILE_REGISTRY[profileId].mechanics.length
  ), 0);
  const profileSourceLineCount = new Set(
    (HADES_BANISHMENT_PROFILE_RECEIPTS?.profiles ?? []).flatMap(({ mechanics }) => (
      mechanics.map(({ sourceHref, sourceLineIndex }) => `${sourceHref}\u0000${sourceLineIndex}`)
    )),
  ).size;
  const profileMechanicSourceConflictCount = profileIds.reduce((sum, profileId) => (
    sum + (HADES_BANISHMENT_PROFILE_PRESENTATION[profileId]?.mechanics ?? [])
      .filter(({ sourceConflict }) => sourceConflict).length
  ), 0);
  const profileActivationSourceConflictCount = profileIds.filter((profileId) => (
    HADES_BANISHMENT_PROFILE_REGISTRY[profileId].activationAuthorityStatus
      === "source-conflict-scenario"
  )).length;
  const mixedLocaleMechanicCount = profileIds.reduce((sum, profileId) => (
    sum + (HADES_BANISHMENT_PROFILE_PRESENTATION[profileId]?.mechanics ?? [])
      .filter(({ sourceLocaleStatus }) => Object.values(sourceLocaleStatus ?? {})
        .includes("mixed-language-unavailable")).length
  ), 0);
  const officialLocaleSupplementMechanicCount = profileIds.reduce((sum, profileId) => (
    sum + (HADES_BANISHMENT_PROFILE_PRESENTATION[profileId]?.mechanics ?? [])
      .filter(({ sourceSupplement }) => sourceSupplement?.verified === true).length
  ), 0);
  const receiptProfiles = HADES_BANISHMENT_PROFILE_RECEIPTS?.profiles ?? [];
  const profileMechanicReceiptCount = receiptProfiles.reduce(
    (sum, profile) => sum + profile.mechanics.length,
    0,
  );
  const profileSourceReceiptCount = new Set(receiptProfiles.flatMap(({ mechanics }) => (
    mechanics.map(({ sourceHref, sourceLineIndex }) => `${sourceHref}\u0000${sourceLineIndex}`)
  ))).size;
  const profileSourceVerificationComplete = HADES_BANISHMENT_PROFILE_RECEIPTS
    ?.metadata?.verificationComplete === true
    && HADES_BANISHMENT_PROFILE_RECEIPTS.metadata.profileCount === profileIds.length
    && HADES_BANISHMENT_PROFILE_RECEIPTS.metadata.mechanicCount === profileMechanicCount
    && HADES_BANISHMENT_PROFILE_RECEIPTS.metadata.sourceLineCount === profileSourceReceiptCount
    && profileMechanicReceiptCount === profileMechanicCount
    && profileSourceReceiptCount === profileSourceLineCount
    && receiptProfiles.every(({ id, mechanics }) => (
      profileIds.includes(id)
      && mechanics.every(completeBanishmentReceipt)
    ));
  return deepFreeze({
    talents,
    baseAuthorityRuleCount: HADES_BASE_AUTHORITY_RULE_IDS.length,
    profileCount: profileIds.length,
    profileMechanicCount,
    profileSourceLineCount,
    profileMechanicReceiptCount,
    profileSourceReceiptCount,
    profileSourceVerificationComplete,
    profileMechanicSourceConflictCount,
    profileActivationSourceConflictCount,
    profileSourceConflictCount: profileMechanicSourceConflictCount
      + profileActivationSourceConflictCount,
    mixedLocaleMechanicCount,
    officialLocaleSupplementMechanicCount,
    ruleRegistrationComplete: talents.complete
      && profileIds.length === 10
      && profileIds.every((profileId) => (
        HADES_BANISHMENT_PROFILE_REGISTRY[profileId].mechanics.length
        === HADES_BANISHMENT_PROFILE_PRESENTATION[profileId].mechanics.length
      )),
    structureStatus: HADES_DIVINITY_SHAPE_METADATA.structureStatus,
    structureAuthority: HADES_DIVINITY_SHAPE_METADATA.structureAuthority,
    structureSourceUrl: HADES_DIVINITY_SHAPE_METADATA.sourceUrl,
    structureSourceSha256: HADES_DIVINITY_SHAPE_METADATA.sourceSha256,
    structureVerificationComplete: HADES_DIVINITY_SHAPE_METADATA.structureAuthority === true,
    directVerificationComplete: false,
  });
}

function normalizedArchetype(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US").replace(/[\s-]+/gu, "_");
}

function banishmentProfileInputBlocker(inputKey, value, expectedType, valid) {
  if (value == null) return { reason: "hades-input-required", inputKey, expectedType };
  if (!valid(value)) return { reason: "hades-input-invalid", inputKey, value, expectedType };
  return null;
}

function banishmentProfileResult(profile, {
  archetypeId,
  active = false,
  status,
  effects = [],
  blockers = [],
  mechanics = [],
  branches = [],
}) {
  const presentationMechanics = HADES_BANISHMENT_PROFILE_PRESENTATION[archetypeId]?.mechanics ?? [];
  const hasSourceConflict = presentationMechanics.some(({ sourceConflict }) => sourceConflict);
  const hasMixedLocale = presentationMechanics.some(({ sourceLocaleStatus }) => (
    Object.values(sourceLocaleStatus ?? {}).includes("mixed-language-unavailable")
  ));
  const hasOfficialLocaleSupplement = presentationMechanics.some(({ sourceSupplement }) => (
    sourceSupplement?.verified === true
  ));
  return deepFreeze({
    archetypeId,
    active,
    status,
    authorityStatus: archetypeId === "quagmire" || hasSourceConflict
      ? "source-conflict-scenario"
      : hasMixedLocale
        ? "mixed-locale-current-source"
        : hasOfficialLocaleSupplement
          ? "official-ss13-localization-supplement"
        : "exact-current-hyperlink-source",
    effects,
    blockers,
    mechanics,
    branches,
    sourceUrl: profile.sourceUrl,
  });
}

export function resolveHadesBanishmentProfile({ hadesState = {}, config = {} } = {}) {
  const archetypeId = normalizedArchetype(config.banishmentArchetype);
  if (!archetypeId) {
    return deepFreeze({
      archetypeId: null,
      active: false,
      status: "input-required",
      authorityStatus: "exact-current-structure-source",
      effects: [],
      blockers: [{ reason: "hades-input-required", inputKey: "banishmentArchetype", expectedType: "banishment-archetype" }],
      mechanics: [],
      branches: [],
      sourceUrl: STRUCTURE_SOURCE_URL,
    });
  }
  const profile = HADES_BANISHMENT_PROFILE_REGISTRY[archetypeId];
  if (!profile) {
    return deepFreeze({
      archetypeId,
      active: false,
      status: "input-required",
      authorityStatus: "exact-current-structure-source",
      effects: [],
      blockers: [{ reason: "hades-input-invalid", inputKey: "banishmentArchetype", value: config.banishmentArchetype, expectedType: "banishment-archetype" }],
      mechanics: [],
      branches: [],
      sourceUrl: STRUCTURE_SOURCE_URL,
    });
  }

  const inactiveMechanics = presentedBanishmentMechanics(profile, false);
  const authorityActive = topologyValue(hadesState, config, "banishmentActive", "authorityActive");
  if (typeof authorityActive !== "boolean") {
    return banishmentProfileResult(profile, {
      archetypeId,
      status: "input-required",
      blockers: [{ reason: "hades-input-required", inputKey: "authorityActive", expectedType: "boolean" }],
      mechanics: inactiveMechanics,
    });
  }
  if (!authorityActive) {
    return banishmentProfileResult(profile, {
      archetypeId,
      status: "inactive",
      mechanics: inactiveMechanics,
    });
  }

  const adjacent = topologyValue(hadesState, config, "banishmentAdjacentSlateCount", "adjacentSlateCount");
  const nonAdjacent = topologyValue(hadesState, config, "banishmentNonAdjacentSlateCount", "nonAdjacentSlateCount");
  const topologyBlockers = [];
  if (!integer(adjacent) || adjacent < 0) topologyBlockers.push({
    reason: adjacent == null ? "hades-input-required" : "hades-input-invalid",
    inputKey: "banishmentAdjacentSlateCount",
    expectedType: "non-negative-integer",
    ...(adjacent == null ? {} : { value: adjacent }),
  });
  if (!integer(nonAdjacent) || nonAdjacent < 0) topologyBlockers.push({
    reason: nonAdjacent == null ? "hades-input-required" : "hades-input-invalid",
    inputKey: "banishmentNonAdjacentSlateCount",
    expectedType: "non-negative-integer",
    ...(nonAdjacent == null ? {} : { value: nonAdjacent }),
  });
  if (topologyBlockers.length) {
    return banishmentProfileResult(profile, {
      archetypeId,
      status: "input-required",
      blockers: topologyBlockers,
      mechanics: inactiveMechanics,
    });
  }

  const generalActive = integer(adjacent) && integer(nonAdjacent) && adjacent >= 4 && nonAdjacent >= 4;
  const exactlyFourActive = adjacent === 4 && nonAdjacent === 4;
  const selectedProfileRaw = typeof config.banishmentActivationBranch === "string"
    ? config.banishmentActivationBranch
    : typeof config.banishmentProfile === "string"
      ? config.banishmentProfile
    : typeof config.banishmentProfile?.id === "string"
      ? config.banishmentProfile.id
      : null;
  const activationBranches = archetypeId === "quagmire"
    ? profile.activationBranches.map((branch) => ({
      ...branch,
      active: branch.id === "quagmire-exactly-four" ? exactlyFourActive : generalActive,
    }))
    : [];
  let active = generalActive;
  let sourceConflict = false;
  if (archetypeId === "quagmire") {
    const selectedProfile = selectedProfileRaw === "general"
      ? "general-banishment-at-least-four"
      : selectedProfileRaw;
    const validProfiles = new Set([
      "general-banishment-at-least-four",
      "quagmire-exactly-four",
    ]);
    if (selectedProfile && !validProfiles.has(selectedProfile)) {
      return banishmentProfileResult(profile, {
        archetypeId,
        status: "input-required",
        blockers: [{
          reason: "hades-input-invalid",
          inputKey: "banishmentProfile",
          value: selectedProfileRaw,
          expectedType: "banishment-profile",
        }],
        mechanics: inactiveMechanics,
        branches: activationBranches,
      });
    }
    if (selectedProfile === "quagmire-exactly-four") active = exactlyFourActive;
    else if (selectedProfile === "general-banishment-at-least-four") active = generalActive;
    else if (generalActive === exactlyFourActive) active = generalActive;
    else {
      active = false;
      sourceConflict = true;
    }
  }

  if (sourceConflict) {
    return banishmentProfileResult(profile, {
      archetypeId,
      status: "source-conflict",
      blockers: [{
        reason: "hades-source-conflict-branch-required",
        inputKey: "banishmentActivationBranch",
        expectedType: "banishment-activation-branch",
      }],
      mechanics: inactiveMechanics,
      branches: activationBranches,
    });
  }
  if (!active) {
    return banishmentProfileResult(profile, {
      archetypeId,
      status: "inactive",
      mechanics: inactiveMechanics,
      branches: activationBranches,
    });
  }

  const effects = [];
  const blockers = [];
  const mechanics = presentedBanishmentMechanics(profile, active);

  if (archetypeId === "demolisher") {
      const condition = firstDefined(
        config.banishmentConditionActive,
        config.enemyParalyzed,
        config.conditionActive,
      );
      const blocker = banishmentProfileInputBlocker(
        "banishmentConditionActive",
        condition,
        "boolean",
        (value) => typeof value === "boolean",
      );
      if (blocker) blockers.push(blocker);
      else {
        mechanics[1] = { ...mechanics[1], active: condition, inputResolved: true, stateValue: condition };
        mechanics[2] = { ...mechanics[2], active: condition, inputResolved: true, stateValue: condition };
      }
      if (!blocker && condition) {
        const paralysisEffectBonus = firstDefined(
          config.banishmentParalysisEffectBonus,
          config.paralysisEffectBonus,
        );
        const paralysisBlocker = banishmentProfileInputBlocker(
          "banishmentParalysisEffectBonus",
          paralysisEffectBonus,
          "non-negative-number",
          (value) => finiteNumber(value) && value >= 0,
        );
        if (paralysisBlocker) blockers.push(paralysisBlocker);
        else effects.push({
          stat: "demolisher_skill_damage",
          operation: "more",
          value: 20 * (1 + (paralysisEffectBonus / 100)),
          unit: "percent",
          sourceText: profile.name,
          sourceMechanicIndex: 1,
          scope: "demolisher-vs-paralyzed",
          calculationReady: true,
          output: { baseValue: 20, paralysisEffectBonus },
        });
      }
    } else if (archetypeId === "steep_strike") {
      const chance = firstDefined(config.banishmentSteepStrikeChance, config.steepStrikeChance);
      const blocker = banishmentProfileInputBlocker(
        "banishmentSteepStrikeChance",
        chance,
        "non-negative-number",
        (value) => finiteNumber(value) && value >= 0,
      );
      if (blocker) blockers.push(blocker);
      else {
        const triggerChance = Math.max(0, chance - 100);
        mechanics.push({
          ...mechanics[0],
          kind: "computed-core-trigger-chance",
          value: triggerChance,
          unit: "percent",
          active: triggerChance > 0,
          inputResolved: true,
          stateValue: triggerChance > 0,
          sourceText: profile.name,
          sourceMechanicIndex: 0,
        });
        effects.push({ stat: "core_steep_strike_trigger_chance", operation: "add", value: triggerChance, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 0, calculationReady: true });
        if (triggerChance > 0) {
          effects.push({ stat: "core_steep_strike_damage", operation: "more", value: 70, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 1, scope: "triggered-core-steep-strike", calculationReady: true });
          effects.push({ stat: "core_steep_strike_skill_area", operation: "increase", value: 70, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 1, scope: "triggered-core-steep-strike", calculationReady: true });
        }
      }
    } else if (archetypeId === "shadow_strike") {
      const condition = firstDefined(
        config.banishmentConditionActive,
        config.usedAttackMobilityRecently,
        config.conditionActive,
      );
      const blocker = banishmentProfileInputBlocker(
        "banishmentConditionActive",
        condition,
        "boolean",
        (value) => typeof value === "boolean",
      );
      if (blocker) blockers.push(blocker);
      else {
        mechanics[0] = { ...mechanics[0], active: condition, inputResolved: true, stateValue: condition };
        if (condition) effects.push({ stat: "shadow_strike_damage", operation: "more", value: 12, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 0, calculationReady: true });
      }
    } else if (archetypeId === "spell_burst") {
      effects.push({ stat: "on_hit_damage", operation: "more", value: 28, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 0, scope: "spell-burst-cast-skills", calculationReady: true });
      effects.push({
        stat: "movement_speed",
        operation: "increase",
        value: -30,
        unit: "percent",
        sourceText: profile.name,
        sourceMechanicIndex: 2,
        scope: "self",
        sourceConflict: true,
        calculationReady: false,
      });
      const atCap = firstDefined(config.banishmentSpellBurstAtCap, config.spellBurstAtCap);
      const blocker = banishmentProfileInputBlocker(
        "banishmentSpellBurstAtCap",
        atCap,
        "boolean",
        (value) => typeof value === "boolean",
      );
      if (blocker) blockers.push(blocker);
      else mechanics[1] = {
        ...mechanics[1],
        kind: "spell-burst-cap-trigger-state",
        active: atCap,
        inputResolved: true,
        stateValue: atCap,
        sourceText: profile.name,
        sourceMechanicIndex: 1,
      };
    } else if (archetypeId === "ill_omen") {
      const dealingDot = firstDefined(config.banishmentConditionActive, config.conditionActive);
      const enemyElite = firstDefined(config.banishmentEnemyElite, config.enemyElite);
      const enemyLifePercent = firstDefined(config.banishmentEnemyLifePercent, config.enemyLifePercent);
      for (const blocker of [
        banishmentProfileInputBlocker("banishmentConditionActive", dealingDot, "boolean", (value) => typeof value === "boolean"),
        banishmentProfileInputBlocker("banishmentEnemyElite", enemyElite, "boolean", (value) => typeof value === "boolean"),
        banishmentProfileInputBlocker("banishmentEnemyLifePercent", enemyLifePercent, "number-0-through-100", (value) => finiteNumber(value) && value >= 0 && value <= 100),
      ].filter(Boolean)) blockers.push(blocker);
      if (!blockers.some(({ inputKey }) => ["banishmentConditionActive", "banishmentEnemyElite", "banishmentEnemyLifePercent"].includes(inputKey))) {
        const executeActive = dealingDot && enemyLifePercent < 20;
        mechanics[1] = {
          ...mechanics[1],
          active: executeActive,
          inputResolved: true,
          stateValue: executeActive,
          executeActive,
        };
        mechanics.push({
          kind: "ill-omen-profile-state",
          active: executeActive,
          inputResolved: true,
          stateValue: executeActive,
          enemyElite,
          minimumIllOmenStacks: enemyElite ? 4 : null,
          dealingDamageOverTime: dealingDot,
          enemyLifePercent,
          executeActive,
          sourceText: profile.name,
        });
      }
    } else if (archetypeId === "quagmire") {
      const count = firstDefined(config.banishmentCurseEffectCount, config.curseEffectCount);
      const blocker = banishmentProfileInputBlocker(
        "banishmentCurseEffectCount",
        count,
        "non-negative-integer",
        (value) => integer(value) && value >= 0,
      );
      if (blocker) blockers.push(blocker);
      else effects.push({ stat: "terra_skill_damage", operation: "more", value: count * 20, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 0, calculationReady: true });
    } else if (archetypeId === "projection") {
      const count = firstDefined(config.banishmentProjectionStacks, config.stackCount);
      const blocker = banishmentProfileInputBlocker(
        "banishmentProjectionStacks",
        count,
        "non-negative-integer",
        (value) => integer(value) && value >= 0,
      );
      if (blocker) blockers.push(blocker);
      else {
        const stacks = Math.min(count, 5);
        const atCap = stacks === 5;
        effects.push({ stat: "attack_horizontal_projectile_damage", operation: "more", value: stacks * 18, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 2, calculationReady: true });
        effects.push({ stat: "damage_taken", operation: "more", value: stacks * 6, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 2, scope: "from-proximity-enemies", calculationReady: true });
        mechanics[1] = {
          ...mechanics[1],
          active: atCap,
          inputResolved: true,
          stateValue: atCap,
          atCap,
        };
        mechanics.push({
          ...mechanics[0],
          kind: "projection-stack-state",
          stackCount: stacks,
          atCap,
          inputResolved: true,
          stateValue: atCap,
          sourceText: profile.name,
          sourceMechanicIndex: 0,
        });
      }
    } else if (archetypeId === "provision") {
      effects.push({ stat: "elixir_skill_effect", operation: "increase", value: 100, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 1, calculationReady: true });
      const affected = firstDefined(config.banishmentMinionAffectedByElixir, config.minionAffectedByElixir);
      const blocker = banishmentProfileInputBlocker(
        "banishmentMinionAffectedByElixir",
        affected,
        "boolean",
        (value) => typeof value === "boolean",
      );
      if (blocker) blockers.push(blocker);
      else {
        mechanics[2] = { ...mechanics[2], active: affected, inputResolved: true, stateValue: affected };
        if (affected) effects.push({ stat: "minion_damage", operation: "more", value: 15, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 2, scope: "minions-affected-by-elixir", calculationReady: true });
      }
    } else if (archetypeId === "tangle") {
      const maxLife = firstDefined(
        config.banishmentNearestSyntheticTroopMaxLife,
        config.nearestSyntheticTroopMaxLife,
      );
      const blocker = banishmentProfileInputBlocker(
        "banishmentNearestSyntheticTroopMaxLife",
        maxLife,
        "non-negative-number",
        (value) => finiteNumber(value) && value >= 0,
      );
      if (blocker) blockers.push(blocker);
      else {
        const value = Math.min(Math.floor(maxLife / 40), 260);
        effects.push({ stat: "tangle_damage", operation: "more", value, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 1, calculationReady: true });
      }
    } else if (archetypeId === "indomitable") {
      const condition = firstDefined(
        config.banishmentConditionActive,
        config.indomitableReadyOrTriggered,
        config.conditionActive,
      );
      const blocker = banishmentProfileInputBlocker(
        "banishmentConditionActive",
        condition,
        "boolean",
        (value) => typeof value === "boolean",
      );
      if (blocker) blockers.push(blocker);
      else {
        mechanics[1] = { ...mechanics[1], active: condition, inputResolved: true, stateValue: condition };
        if (condition) effects.push({ stat: "damage", operation: "more", value: 30, unit: "percent", sourceText: profile.name, sourceMechanicIndex: 1, scope: SELF_AND_MINIONS, calculationReady: true });
      }
  }

  return banishmentProfileResult(profile, {
    archetypeId,
    active,
    status: blockers.length ? "input-required" : active ? "applied" : "inactive",
    effects,
    blockers,
    mechanics,
    branches: activationBranches,
  });
}

export function resolveHadesTalent({
  stableId,
  selection = null,
  hadesState = {},
  config = selection?.config ?? {},
  effectScale = 1,
} = {}) {
  const record = getHadesTalentSemanticRecord(stableId ?? selection?.valueId ?? selection?.id);
  if (!record) {
    return deepFreeze({
      stableId: String(stableId ?? selection?.valueId ?? selection?.id ?? ""),
      effects: [],
      blockers: [{ reason: "hades-stable-id-not-found" }],
      mechanics: [],
      accounting: { recordAccounted: false, sourceLineCount: 0, accountedLineCount: 0 },
    });
  }

  let resolved;
  if (record.category === "contamination_imprint") {
    resolved = resolveContamination(record, hadesState, config);
  } else if (record.category === "banishment_imprint") {
    resolved = resolveBanishmentImprint(record, hadesState, config, effectScale);
  } else if (record.category === "judgment_imprint") {
    resolved = resolveJudgment(record, hadesState, config, effectScale);
  } else if (record.category === "common_imprint") {
    resolved = resolveCommonDynamic(record, config, effectScale) ?? resolveStatic(record, config);
  } else {
    resolved = resolveStatic(record, config);
  }

  if (record.category === "banishment_imprint" && config?.banishmentArchetype) {
    const profile = resolveHadesBanishmentProfile({ hadesState, config });
    resolved.effects.push(...profile.effects);
    resolved.blockers.push(...profile.blockers);
    resolved.mechanics.push({ kind: "banishment-profile", ...profile });
  }

  const entirelyInactive = !resolved.effects.length
    && resolved.mechanics.length > 0
    && resolved.mechanics.every((entry) => entry.kind === "inactive-condition" || entry.active === false);
  const status = resolved.blockers.length
    ? "needs-input"
    : entirelyInactive
      ? "inactive"
      : ["locale-conflict-scenario", "random-outcome-scenario", "inference-scenario"].includes(record.authorityStatus)
        ? "scenario"
        : resolved.effects.length || resolved.mechanics.length
          ? "resolved"
          : "inactive";
  const mechanics = renderableMechanics(record, resolved);

  return deepFreeze({
    stableId: record.stableId,
    flatItemId: record.flatItemId,
    category: record.category,
    status,
    authorityStatus: record.authorityStatus,
    effects: resolved.effects,
    blockers: resolved.blockers,
    mechanics,
    accounting: {
      recordAccounted: true,
      atomic: true,
      atomicKey: record.atomicKey,
      sourceLineCount: record.sourceLines.length,
      accountedLineCount: record.lineOwnership.length,
      sourceRecordKey: record.source.sourceRecordKey,
      sourceUrl: record.source.sourceUrl,
    },
  });
}
