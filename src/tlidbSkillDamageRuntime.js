import { resolveTlidbTooltipEffects } from "./tlidbTooltipEffectRuntime.js";
import {
  TLIDB_HELP_CALCULATION_SOURCES,
  getTlidbAfflictionDamageMultiplier,
  getTlidbArmorHitDamageMultiplier,
  getTlidbEffectiveResistance,
  getTlidbLuckyDamageExpectedValue,
  getTlidbMonsterArmorDamageReduction,
  getTlidbPenetratedResistance,
  getTlidbReapingDamage,
  getTlidbResistanceDamageMultiplier,
  getTlidbSpellBurstCadence,
} from "./tlidbHelpCalculationRuntime.js";

const DAMAGE_TYPES = Object.freeze(["physical", "fire", "cold", "lightning", "erosion"]);
const DAMAGE_TYPE_SET = new Set(DAMAGE_TYPES);
const ELEMENTAL_DAMAGE_TYPE_SET = new Set(["fire", "cold", "lightning"]);

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rounded(value) {
  if (!Number.isFinite(value)) return value;
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12;
}

function emptyHit() {
  return {
    min: 0,
    max: 0,
    average: 0,
    rate: 0,
    projectileHits: 1,
    dpsMin: 0,
    dpsMax: 0,
    dps: 0,
  };
}

function emptyDot() {
  return { min: 0, max: 0, average: 0, dps: 0 };
}

function range(value) {
  const direct = finiteNumber(value);
  if (direct !== null) return { min: direct, max: direct };
  const minimum = finiteNumber(value?.min);
  const maximum = finiteNumber(value?.max);
  if (minimum === null || maximum === null || minimum > maximum) return null;
  return { min: minimum, max: maximum };
}

function damagePools(input, fallbackType = "physical") {
  const direct = range(input);
  if (direct) return { [fallbackType]: direct };
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const pools = {};
  for (const type of DAMAGE_TYPES) {
    if (!Object.hasOwn(input, type)) continue;
    const typed = range(input[type]);
    if (!typed) return null;
    pools[type] = typed;
  }
  return Object.keys(pools).length ? pools : null;
}

function scaledPools(pools, multiplier) {
  return Object.fromEntries(Object.entries(pools).map(([type, values]) => [
    type,
    { min: values.min * multiplier, max: values.max * multiplier },
  ]));
}

function component(kind, pools, tags = [], origin = "base") {
  return {
    kind,
    pools,
    tags: new Set(tags),
    origin,
    increase: 0,
    more: 1,
    takenIncrease: 0,
    takenMore: 1,
    typeIncrease: {},
    typeMore: {},
    typeTakenIncrease: {},
    typeTakenMore: {},
    boundIncrease: { min: 0, max: 0 },
    boundMore: { min: 1, max: 1 },
  };
}

function poolValueAtStage(entry, type, value, stage, bound = null) {
  if (stage === "base") return value;
  const increased = value * (1 + (
    entry.increase
    + (entry.typeIncrease[type] ?? 0)
    + (bound ? entry.boundIncrease[bound] : 0)
  ) / 100);
  if (stage === "increase") return increased;
  const additional = increased
    * entry.more
    * (entry.typeMore[type] ?? 1)
    * (bound ? entry.boundMore[bound] : 1);
  if (stage === "additional") return additional;
  return additional * (1 + (
    entry.takenIncrease + (entry.typeTakenIncrease[type] ?? 0)
  ) / 100) * entry.takenMore * (entry.typeTakenMore[type] ?? 1);
}

function componentRange(entry) {
  return Object.entries(entry.pools).reduce((total, [type, values]) => ({
    min: total.min + poolValueAtStage(entry, type, values.min, "taken", "min"),
    max: total.max + poolValueAtStage(entry, type, values.max, "taken", "max"),
  }), { min: 0, max: 0 });
}

function componentAverageAtStage(entry, stage) {
  return Object.entries(entry.pools).reduce((total, [type, values]) => (
    total + (
      poolValueAtStage(entry, type, values.min, stage, "min")
      + poolValueAtStage(entry, type, values.max, stage, "max")
    ) / 2
  ), 0);
}

function componentsAverageAtStage(entries, stage, origin = null) {
  return rounded(entries.reduce((total, entry) => {
    if (origin && entry.origin !== origin) return total;
    return total + componentAverageAtStage(entry, stage);
  }, 0));
}

function componentRangeAfterEnemyMitigation(entry, {
  enemyArmor = 0,
  enemyResistances = {},
  armorDamageMitigationPenetration = 0,
  resistancePenetration = 0,
  elementalResistancePenetration = 0,
  applyArmor = false,
} = {}) {
  return Object.entries(entry.pools).reduce((total, [damageType, values]) => {
    const resolved = poolRangeAfterEnemyMitigation(entry, damageType, values, {
      enemyArmor,
      enemyResistances,
      armorDamageMitigationPenetration,
      resistancePenetration,
      elementalResistancePenetration,
      applyArmor,
    });
    return {
      min: total.min + resolved.min,
      max: total.max + resolved.max,
    };
  }, { min: 0, max: 0 });
}

function poolRangeAfterEnemyMitigation(entry, damageType, values, {
  enemyArmor = 0,
  enemyResistances = {},
  armorDamageMitigationPenetration = 0,
  resistancePenetration = 0,
  elementalResistancePenetration = 0,
  applyArmor = false,
} = {}) {
  const armorMultiplier = applyArmor
    ? getTlidbArmorHitDamageMultiplier(
        enemyArmor,
        damageType,
        armorDamageMitigationPenetration,
      )
    : 1;
  const resistanceMultiplier = damageType === "physical"
    ? 1
    : getTlidbResistanceDamageMultiplier(
        enemyResistances[damageType] ?? 0,
        60,
        resistancePenetration
          + (ELEMENTAL_DAMAGE_TYPE_SET.has(damageType) ? elementalResistancePenetration : 0),
      );
  const enemyMultiplier = armorMultiplier * resistanceMultiplier;
  return {
    min: poolValueAtStage(entry, damageType, values.min, "taken", "min") * enemyMultiplier,
    max: poolValueAtStage(entry, damageType, values.max, "taken", "max") * enemyMultiplier,
  };
}

function damageComponentTags(context) {
  if (context?.damageTags instanceof Set) return [...context.damageTags];
  return Array.isArray(context?.damageTags) ? context.damageTags : [];
}

function buildConditionState(context) {
  const supplied = context?.conditions && typeof context.conditions === "object"
    ? context.conditions
    : {};
  const automatic = supplied.automatic && typeof supplied.automatic === "object"
    ? supplied.automatic
    : {};
  return {
    schemaVersion: 1,
    automatic: {
      ...automatic,
      charges: { ...(automatic.charges ?? {}), ...(context?.charges ?? {}) },
      heroStacks: { ...(automatic.heroStacks ?? {}), ...(context?.stacks ?? {}) },
      statuses: { ...(automatic.statuses ?? {}), ...(context?.statuses ?? {}) },
      blessings: { ...(automatic.blessings ?? {}), ...(context?.blessings ?? {}) },
      buffs: { ...(automatic.buffs ?? {}), ...(context?.buffs ?? {}) },
      debuffs: { ...(automatic.debuffs ?? {}), ...(context?.debuffs ?? {}) },
    },
    overrides: supplied.overrides ?? {},
  };
}

function runtimeStats(context) {
  const stats = { ...(context?.stats ?? {}) };
  for (const key of [
    "life",
    "mana",
    "attackSpeed",
    "castSpeed",
    "movementSpeed",
    "projectileQuantity",
    "minionSkillArea",
  ]) {
    if (Object.hasOwn(context ?? {}, key)) stats[key] = context[key];
  }
  return stats;
}

function potentialDamageEffect(effect) {
  const stat = effect?.stat ?? "";
  return stat === "cast-time"
    || stat === "cooldown"
    || stat === "reaping-repeat-chance"
    || stat === "added-damage-effectiveness"
    || stat.includes("damage-coefficient")
    || stat.includes("damage-conversion")
    || stat.includes("damage-per-second")
    || /(?:^|-)damage(?:-|$)/u.test(stat)
    || /critical-strike-rating$/u.test(stat)
    || /(?:attack|cast)-speed$/u.test(stat)
    || /cooldown-recovery-speed$/u.test(stat)
    || /max-spell-burst$/u.test(stat)
    || /projectile-quantity$/u.test(stat);
}

function knownInactiveReason(reason) {
  return reason === "tlidb-effect-condition-unmet";
}

function damageTypeFromText(text) {
  const match = String(text ?? "").match(/\b(Physical|Fire|Cold|Lightning|Erosion)\b/iu);
  return match ? match[1].toLowerCase() : null;
}

function hitGroupKind(stat) {
  if (stat === "weapon-attack-damage-coefficient") return { kind: "weapon", type: null };
  let match = stat.match(/^(attack|spell)-(physical|fire|cold|lightning|erosion)-base-damage-coefficient$/u);
  if (match) return { kind: `${match[1]}-base`, type: match[2] };
  match = stat.match(/^spell-(physical|fire|cold|lightning|erosion)-damage-(min|max)$/u);
  if (match) return { kind: "spell-flat", type: match[1], bound: match[2] };
  match = stat.match(/^spell-(physical|fire|cold|lightning|erosion)-damage$/u);
  if (match) return { kind: "spell-fixed", type: match[1] };
  return null;
}

function dotKind(stat) {
  let match = stat.match(/^persistent-(physical|fire|cold|lightning|erosion)-damage-per-second$/u);
  if (match) return { kind: "persistent-flat", type: match[1] };
  match = stat.match(/^spell-(physical|fire|cold|lightning|erosion)-damage-per-second$/u);
  if (match) return { kind: "spell-flat", type: match[1] };
  match = stat.match(/^persistent-(physical|fire|cold|lightning|erosion)-base-damage-per-second$/u);
  if (match) return { kind: "persistent-base", type: match[1] };
  return null;
}

function conversionKind(stat) {
  const match = stat.match(/^(?:skill|supported-skill|minion)-(physical|fire|cold|lightning|erosion)-damage-conversion$/u);
  return match ? match[1] : null;
}

function gainedAsExtraKind(stat) {
  const match = stat.match(/^skill-(physical|fire|cold|lightning|erosion|non-erosion)-damage-as-(physical|fire|cold|lightning|erosion)$/u);
  return match ? { sourceType: match[1], targetType: match[2] } : null;
}

function addedDamageKind(stat) {
  const match = stat.match(/^supported-skill-added-(physical|fire|cold|lightning|erosion)-damage-(min|max)$/u);
  return match ? { type: match[1], bound: match[2] } : null;
}

function modifierTarget(effect, context) {
  if (!effect || !["add", "more"].includes(effect.operation)) return null;
  let stat = effect.stat;
  let scope = "skill";
  if (stat.startsWith("supported-skill-")) {
    scope = "supported-skill";
    stat = stat.slice("supported-skill-".length);
  } else if (stat.startsWith("skill-")) {
    stat = stat.slice("skill-".length);
  } else if (stat.startsWith("minion-")) {
    scope = "minion";
    stat = stat.slice("minion-".length);
  }
  if (scope === "minion" && context?.target !== "minion") return { unsupportedTarget: true };
  if (stat === "damage") return { kind: "all" };
  if (stat === "hit-damage") return { kind: "hit" };
  if (stat === "damage-over-time") return { kind: "dot" };
  if (stat === "spell-damage") return { tag: "spell" };
  if (stat === "attack-damage") return { tag: "attack" };
  if (stat === "projectile-damage") return { tag: "projectile" };
  if (stat === "attack-horizontal-projectile-damage") {
    return { tags: ["attack", "projectile", "horizontal"] };
  }
  if (stat === "combo-skill-damage") return { tag: "combo" };
  if (stat === "area-damage") return { tag: "area" };
  if (stat === "melee-damage") return { tag: "melee" };
  if (stat === "minimum-damage") return { kind: "all", bound: "min" };
  if (stat === "maximum-damage") return { kind: "all", bound: "max" };
  if (stat === 'maximum-lightning-damage') return { type: 'lightning', bound: 'max' };
  let match = stat.match(/^(physical|fire|cold|lightning|erosion)-damage(?:-taken)?$/u);
  if (match) return { type: match[1] };
  if (stat === "elemental-damage") return { types: ["fire", "cold", "lightning"] };
  if (stat === "minion-damage" && context?.target === "minion") return { kind: "all" };
  return null;
}

function targetComponents(target, components) {
  if (!target || target.unsupportedTarget) return [];
  if (target.kind === "all") return components.map((entry) => ({
    entry,
    types: null,
    bound: target.bound ?? null,
  }));
  if (target.kind) return components
    .filter(({ kind }) => kind === target.kind)
    .map((entry) => ({ entry, types: null }));
  if (target.tag) return components
    .filter(({ tags }) => tags.has(target.tag))
    .map((entry) => ({ entry, types: null }));
  if (target.tags) return components
    .filter(({ tags }) => target.tags.every((tag) => tags.has(tag)))
    .map((entry) => ({ entry, types: null }));
  if (target.type) return components
    .filter(({ pools }) => Object.hasOwn(pools, target.type))
    .map((entry) => ({ entry, types: [target.type], ...(target.bound ? {bound:target.bound} : {}) }));
  if (target.types) {
    return components.flatMap((entry) => {
      const types = target.types.filter((type) => Object.hasOwn(entry.pools, type));
      return types.length ? [{ entry, types }] : [];
    });
  }
  return [];
}

function speedKind(stat) {
  if (/^(?:skill|supported-skill|minion)-attack-speed$/u.test(stat)) return "attack";
  if (/^(?:skill|supported-skill|minion)-cast-speed$/u.test(stat)) return "spell";
  return null;
}

function cooldownRecovery(stat) {
  return /^(?:skill|supported-skill|minion)-cooldown-recovery-speed$/u.test(stat);
}

function traceEntry(effect, inputIndex, stage, details = {}) {
  return {
    inputIndex,
    stage,
    stat: effect?.stat ?? null,
    operation: effect?.operation ?? null,
    sourceText: effect?.sourceText ?? "",
    value: finiteNumber(effect?.value),
    ...details,
  };
}

function invalidLevelResult(effects, level) {
  return {
    level,
    complete: false,
    hit: emptyHit(),
    dot: emptyDot(),
    totalDps: null,
    expectedHitDps: null,
    expectedTotalDps: null,
    spellBurst: null,
    critical: null,
    luckyDamage: null,
    applied: [],
    excluded: effects.map((effect, inputIndex) => traceEntry(effect, inputIndex, "input", {
      reason: "invalid-skill-level",
    })),
  };
}

/**
 * Evaluates parsed TLIDB skill effects without inventing missing base damage,
 * hit selection, projectile overlap, charge, or stack inputs.
 */
export function evaluateTlidbSkillDamage(input = {}) {
  const effects = Array.isArray(input?.effects) ? input.effects : [];
  const level = input?.level ?? 20;
  const context = input?.context && typeof input.context === "object" ? input.context : {};
  if (!Number.isInteger(level) || level < 1 || level > 100) return invalidLevelResult(effects, level);

  const traced = Array(effects.length).fill(null);
  const applied = [];
  const excluded = [];
  const syntheticExcluded = [];
  const resolved = Array(effects.length).fill(null);
  let incomplete = false;

  function apply(index, stage, details = {}) {
    if (traced[index]) throw new Error(`TLIDB skill effect ${index} was traced twice`);
    const entry = traceEntry(effects[index], index, stage, details);
    traced[index] = entry;
    applied.push(entry);
  }

  function exclude(index, stage, reason, affectsCompletion = false, details = {}) {
    if (traced[index]) throw new Error(`TLIDB skill effect ${index} was traced twice`);
    const entry = traceEntry(effects[index], index, stage, { reason, affectsCompletion, ...details });
    traced[index] = entry;
    excluded.push(entry);
    if (affectsCompletion) incomplete = true;
  }

  function synthetic(stage, reason, affectsCompletion = true, details = {}) {
    syntheticExcluded.push({
      inputIndex: null,
      stage,
      stat: null,
      operation: null,
      sourceText: "",
      value: null,
      reason,
      affectsCompletion,
      ...details,
    });
    if (affectsCompletion) incomplete = true;
  }

  const resolutionOptions = {
    conditions: buildConditionState(context),
    stats: runtimeStats(context),
    rollValues: context.rollValues,
  };
  for (const [index, effect] of effects.entries()) {
    const result = resolveTlidbTooltipEffects([effect], resolutionOptions);
    if (result.applied.length) {
      resolved[index] = result.applied[0];
      continue;
    }
    const reason = result.excluded[0]?.inactiveReason ?? "tlidb-effect-resolution-failed";
    exclude(
      index,
      "resolve",
      reason,
      potentialDamageEffect(effect) && !knownInactiveReason(reason),
    );
  }

  const groupMap = new Map();
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index]) continue;
    const info = hitGroupKind(effect.stat);
    if (!info) continue;
    const key = info.kind === "spell-flat"
      ? `${effect.sourceText}\u0000${info.type}`
      : `${index}`;
    const group = groupMap.get(key) ?? {
      kind: info.kind,
      type: info.type,
      sourceText: effect.sourceText,
      entries: [],
    };
    group.entries.push({ index, effect, bound: info.bound });
    groupMap.set(key, group);
  }
  const hitGroups = [...groupMap.values()];
  let selectedGroups = [];
  if (hitGroups.length <= 1) {
    selectedGroups = hitGroups;
  } else if (context.hitMode === "sum") {
    selectedGroups = hitGroups;
  } else if (Array.isArray(context.hitSourceTexts)) {
    const selectedSources = new Set(context.hitSourceTexts);
    selectedGroups = hitGroups.filter(({ sourceText }) => selectedSources.has(sourceText));
    for (const group of hitGroups.filter((candidate) => !selectedGroups.includes(candidate))) {
      for (const { index } of group.entries) exclude(index, "base-hit", "hit-component-not-selected");
    }
    if (!selectedGroups.length) synthetic("base-hit", "hit-component-selection-did-not-match");
  } else {
    for (const group of hitGroups) {
      for (const { index } of group.entries) {
        exclude(index, "base-hit", "hit-component-selection-required", true);
      }
    }
  }

  const hitComponents = [];
  const selectedHitGroupCount = selectedGroups.length;
  for (const group of selectedGroups) {
    let pools = null;
    let tags = [];
    if (group.kind === "weapon") {
      const source = damagePools(context.weaponDamage, context.weaponDamageType ?? "physical");
      if (source) pools = scaledPools(source, group.entries[0].effect.value / 100);
      tags = ["attack"];
      if (!source) {
        for (const { index } of group.entries) {
          exclude(index, "base-hit", "weapon-base-damage-unavailable", true);
        }
        continue;
      }
    } else if (group.kind === "attack-base") {
      const source = damagePools(
        context.attackBaseDamage ?? context.weaponDamage,
        group.type ?? context.weaponDamageType ?? "physical",
      );
      if (source) pools = scaledPools(source, group.entries[0].effect.value / 100);
      tags = ["attack"];
      if (!source) {
        for (const { index } of group.entries) {
          exclude(index, "base-hit", "attack-base-damage-unavailable", true);
        }
        continue;
      }
    } else if (group.kind === "spell-base") {
      const source = damagePools(context.spellBaseDamage, group.type);
      if (source) pools = scaledPools(source, group.entries[0].effect.value / 100);
      tags = ["spell"];
      if (!source) {
        for (const { index } of group.entries) {
          exclude(index, "base-hit", "spell-base-damage-unavailable", true);
        }
        continue;
      }
    } else if (group.kind === "spell-flat") {
      const minimum = group.entries.find(({ bound }) => bound === "min");
      const maximum = group.entries.find(({ bound }) => bound === "max");
      if (!minimum || !maximum || minimum.effect.value > maximum.effect.value) {
        for (const { index } of group.entries) {
          exclude(index, "base-hit", "spell-damage-range-incomplete", true);
        }
        continue;
      }
      pools = { [group.type]: { min: minimum.effect.value, max: maximum.effect.value } };
      tags = ["spell"];
    } else if (group.kind === "spell-fixed") {
      const value = group.entries[0].effect.value;
      pools = { [group.type]: { min: value, max: value } };
      tags = ["spell"];
    }

    const entry = component("hit", pools, [
      ...tags,
      ...damageComponentTags(context),
      ...Object.keys(pools),
    ]);
    hitComponents.push(entry);
    const contribution = componentRange(entry);
    for (const { index, effect } of group.entries) {
      apply(index, "base-hit", { resolvedValue: effect.value, contribution });
    }
  }

  const dotComponents = [];
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index]) continue;
    const info = dotKind(effect.stat);
    if (!info) continue;
    let pools;
    if (info.kind === "persistent-base") {
      const source = damagePools(context.spellBaseDamage, info.type);
      if (!source) {
        exclude(index, "base-dot", "persistent-base-damage-unavailable", true);
        continue;
      }
      pools = scaledPools(source, effect.value / 100);
    } else {
      pools = { [info.type]: { min: effect.value, max: effect.value } };
    }
    const tags = info.kind === "spell-flat" ? ["spell", info.type] : ["persistent", info.type];
    const entry = component("dot", pools, [...tags, ...damageComponentTags(context)]);
    dotComponents.push(entry);
    apply(index, "base-dot", { resolvedValue: effect.value, contribution: componentRange(entry) });
  }

  const addedDamageGroupMap = new Map();
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index]) continue;
    const info = addedDamageKind(effect.stat);
    if (!info) continue;
    const key = `${effect.sourceText}\u0000${info.type}`;
    const group = addedDamageGroupMap.get(key) ?? {
      type: info.type,
      sourceText: effect.sourceText,
      entries: [],
    };
    group.entries.push({ index, effect, bound: info.bound });
    addedDamageGroupMap.set(key, group);
  }
  const addedDamageGroups = [];
  for (const group of addedDamageGroupMap.values()) {
    const minimums = group.entries.filter(({ bound }) => bound === "min");
    const maximums = group.entries.filter(({ bound }) => bound === "max");
    if (
      minimums.length !== 1
      || maximums.length !== 1
      || minimums[0].effect.value > maximums[0].effect.value
    ) {
      for (const { index } of group.entries) {
        exclude(index, "added-damage", "supported-added-damage-range-incomplete", true);
      }
      continue;
    }
    addedDamageGroups.push({
      ...group,
      minimum: minimums[0],
      maximum: maximums[0],
    });
  }

  const effectiveness = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => effect?.stat === "added-damage-effectiveness" && !traced[index]);
  if (effectiveness.length > 1) {
    for (const { index } of effectiveness) {
      exclude(index, "added-damage", "added-damage-effectiveness-ambiguous", true);
    }
    for (const group of addedDamageGroups) {
      for (const { index } of group.entries) {
        exclude(index, "added-damage", "added-damage-effectiveness-ambiguous", true);
      }
    }
  } else if (effectiveness.length === 0 && addedDamageGroups.length) {
    for (const group of addedDamageGroups) {
      for (const { index } of group.entries) {
        exclude(index, "added-damage", "added-damage-effectiveness-unavailable", true);
      }
    }
  } else if (effectiveness.length === 1) {
    const { effect, index } = effectiveness[0];
    const added = damagePools(context.addedDamage, context.addedDamageType ?? "physical");
    if (!hitComponents.length) {
      exclude(index, "added-damage", "added-damage-hit-target-unavailable", hitGroups.length > 0);
      for (const group of addedDamageGroups) {
        for (const { index: addedIndex } of group.entries) {
          exclude(addedIndex, "added-damage", "added-damage-hit-target-unavailable", true);
        }
      }
    } else if (!added) {
      exclude(index, "added-damage", "added-damage-context-unavailable", true);
      for (const group of addedDamageGroups) {
        for (const { index: addedIndex } of group.entries) {
          exclude(addedIndex, "added-damage", "added-damage-context-unavailable", true);
        }
      }
    } else {
      const nonZeroAdded = Object.values(added).some(({ min, max }) => min !== 0 || max !== 0)
        || addedDamageGroups.some(({ minimum, maximum }) => (
          minimum.effect.value !== 0 || maximum.effect.value !== 0
        ));
      if (selectedHitGroupCount > 1 && nonZeroAdded) {
        exclude(index, "added-damage", "added-damage-multi-component-allocation-unavailable", true);
        for (const group of addedDamageGroups) {
          for (const { index: addedIndex } of group.entries) {
            exclude(addedIndex, "added-damage", "added-damage-multi-component-allocation-unavailable", true);
          }
        }
      } else {
        const tags = hitComponents.some(({ tags: componentTags }) => componentTags.has("attack"))
          ? ["attack"]
          : ["spell"];
        const pools = scaledPools(added, effect.value / 100);
        const entry = component("hit", pools, [
          ...tags,
          ...damageComponentTags(context),
          ...Object.keys(pools),
        ], "added");
        hitComponents.push(entry);
        let contribution = componentRange(entry);
        for (const group of addedDamageGroups) {
          const addedPools = scaledPools({
            [group.type]: {
              min: group.minimum.effect.value,
              max: group.maximum.effect.value,
            },
          }, effect.value / 100);
          const addedEntry = component("hit", addedPools, [
            ...tags,
            ...damageComponentTags(context),
            group.type,
          ], "added");
          hitComponents.push(addedEntry);
          const addedContribution = componentRange(addedEntry);
          contribution = {
            min: contribution.min + addedContribution.min,
            max: contribution.max + addedContribution.max,
          };
          for (const { index: addedIndex, effect: addedEffect } of group.entries) {
            apply(addedIndex, "added-damage", {
              resolvedValue: addedEffect.value,
              effectiveness: effect.value,
              contribution: addedContribution,
            });
          }
        }
        apply(index, "added-damage", { resolvedValue: effect.value, contribution });
      }
    }
  }

  const allComponents = [...hitComponents, ...dotComponents];
  const gainedAsExtraEffects = resolved
    .map((effect, index) => ({ effect, index, kind: gainedAsExtraKind(effect?.stat ?? "") }))
    .filter(({ effect, index, kind }) => effect && kind && !traced[index]);
  for (const { effect, index, kind: { sourceType, targetType } } of gainedAsExtraEffects) {
    if (effect.operation !== "add" || effect.value < 0) {
      exclude(index, "gained-as-extra", "gained-as-extra-effect-invalid", true);
      continue;
    }
    let gained = false;
    const ratio = effect.value / 100;
    for (const entry of allComponents) {
      const sourceTypes = sourceType === "non-erosion"
        ? DAMAGE_TYPES.filter((type) => type !== "erosion")
        : [sourceType];
      const sourcePools = sourceTypes.map((type) => entry.pools[type]).filter(Boolean);
      if (!sourcePools.length) continue;
      const source = sourcePools.reduce((sum, pool) => ({
        min: sum.min + pool.min,
        max: sum.max + pool.max,
      }), { min: 0, max: 0 });
      const extra = { min: source.min * ratio, max: source.max * ratio };
      const target = entry.pools[targetType] ?? { min: 0, max: 0 };
      target.min += extra.min;
      target.max += extra.max;
      entry.pools[targetType] = target;
      entry.tags.add(targetType);
      gained = true;
    }
    if (!gained) {
      exclude(index, "gained-as-extra", "gained-as-extra-source-damage-unavailable");
    } else {
      apply(index, "gained-as-extra", { resolvedValue: effect.value, sourceType, targetType });
    }
  }

  const conversions = resolved
    .map((effect, index) => ({ effect, index, targetType: conversionKind(effect?.stat ?? "") }))
    .filter(({ effect, index, targetType }) => effect && targetType && !traced[index]);
  for (const { effect, index, targetType } of conversions) {
    const sourceType = damageTypeFromText(effect.sourceDependency);
    if (!sourceType || !DAMAGE_TYPE_SET.has(sourceType)) {
      exclude(index, "conversion", "conversion-source-type-unavailable", true);
      continue;
    }
    if (effect.value < 0 || effect.value > 100) {
      exclude(index, "conversion", "conversion-percent-out-of-range", true);
      continue;
    }
    let converted = false;
    const ratio = effect.value / 100;
    for (const entry of allComponents) {
      const source = entry.pools[sourceType];
      if (!source) continue;
      const moved = { min: source.min * ratio, max: source.max * ratio };
      source.min -= moved.min;
      source.max -= moved.max;
      const target = entry.pools[targetType] ?? { min: 0, max: 0 };
      target.min += moved.min;
      target.max += moved.max;
      entry.pools[targetType] = target;
      entry.tags.add(targetType);
      converted = true;
    }
    if (!converted) {
      exclude(index, "conversion", "conversion-source-damage-unavailable", true);
    } else {
      apply(index, "conversion", { resolvedValue: effect.value, sourceType, targetType });
    }
  }

  const quantityEffects = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => /projectile-quantity$/u.test(effect?.stat ?? "") && !traced[index]);
  let projectileHits = 1;
  const projectileContextRequested = context.usesProjectiles === true || context.projectiles !== undefined;
  if (projectileContextRequested) {
    hitComponents.forEach(({ tags }) => tags.add("projectile"));
    const base = finiteNumber(context.projectiles?.base);
    if (base === null || base < 0) {
      for (const { index } of quantityEffects) {
        exclude(index, "projectile", "projectile-context-unavailable", true);
      }
      synthetic("projectile", "projectile-context-unavailable");
    } else {
      let quantity = base;
      for (const { effect, index } of quantityEffects) {
        if (effect.operation !== "add") {
          exclude(index, "projectile", "projectile-quantity-operation-unsupported", true);
          continue;
        }
        quantity += effect.value;
        apply(index, "projectile", { resolvedValue: effect.value, projectileQuantity: quantity });
      }
      const explicitHits = finiteNumber(context.projectiles?.hitCount);
      if (explicitHits !== null) {
        if (explicitHits < 0 || explicitHits > quantity) {
          synthetic("projectile", "projectile-hit-count-out-of-range");
        } else {
          projectileHits = explicitHits;
        }
      } else if (context.projectiles?.allHit === true) {
        projectileHits = quantity;
      } else {
        synthetic("projectile", "projectile-hit-count-unavailable");
      }
    }
  } else if (quantityEffects.length) {
    for (const { index } of quantityEffects) {
      exclude(index, "projectile", "projectile-context-unavailable", true);
    }
  }

  const modifierEffects = resolved
    .map((effect, index) => ({ effect, index, target: modifierTarget(effect, context) }))
    .filter(({ effect, index, target }) => effect && target && !traced[index]);
  for (const { effect, index, target } of modifierEffects) {
    if (target.unsupportedTarget) {
      exclude(index, "damage-modifier", "damage-modifier-target-unsupported");
      continue;
    }
    const targets = targetComponents(target, allComponents);
    if (!targets.length) {
      const affectsCompletion = !(
        effect.nonBlockingWhenDamageTargetUnavailable === true
        || (
          effect.nonBlockingWhenDamageTypeUnavailable === true
          && (target.type || target.types)
        )
      );
      exclude(
        index,
        "damage-modifier",
        "damage-modifier-target-unavailable",
        affectsCompletion,
      );
      continue;
    }
    if (effect.operation === "more" && effect.value < -100) {
      exclude(index, "damage-modifier", "damage-more-value-out-of-range", true);
      continue;
    }
    const damageTakenModifier = /-damage-taken$/u.test(effect.stat);
    for (const { entry, types, bound } of targets) {
      if (bound && effect.operation === "add") {
        entry.boundIncrease[bound] += effect.value;
      } else if (bound) {
        entry.boundMore[bound] *= 1 + (effect.value / 100);
      } else if (types) {
        for (const type of types) {
          if (damageTakenModifier && effect.operation === "add") {
            entry.typeTakenIncrease[type] = (entry.typeTakenIncrease[type] ?? 0) + effect.value;
          } else if (damageTakenModifier) {
            entry.typeTakenMore[type] = (entry.typeTakenMore[type] ?? 1)
              * (1 + (effect.value / 100));
          } else if (effect.operation === "add") {
            entry.typeIncrease[type] = (entry.typeIncrease[type] ?? 0) + effect.value;
          } else {
            entry.typeMore[type] = (entry.typeMore[type] ?? 1) * (1 + (effect.value / 100));
          }
        }
      } else if (damageTakenModifier && effect.operation === "add") {
        entry.takenIncrease += effect.value;
      } else if (damageTakenModifier) {
        entry.takenMore *= 1 + (effect.value / 100);
      } else if (effect.operation === "add") {
        entry.increase += effect.value;
      } else {
        entry.more *= 1 + (effect.value / 100);
      }
    }
    apply(index, "damage-modifier", {
      resolvedValue: effect.value,
      targetCount: targets.length,
      targetPoolCount: targets.reduce((count, { entry, types }) => (
        count + (types?.length ?? Object.keys(entry.pools).length)
      ), 0),
    });
  }

  const hasEnemyAfflictionInput = Object.hasOwn(context, "enemyAffliction");
  const enemyAfflictionInput = hasEnemyAfflictionInput
    ? finiteNumber(context.enemyAffliction)
    : 0;
  if (hasEnemyAfflictionInput && (enemyAfflictionInput === null || enemyAfflictionInput < 0)) {
    synthetic("affliction", "enemy-affliction-input-invalid");
  }
  const afflictionRating = enemyAfflictionInput !== null && enemyAfflictionInput >= 0
    ? Math.min(100, enemyAfflictionInput)
    : 0;
  let afflictionEffectIncrease = 0;
  let afflictionEffectMore = 1;
  let afflictionInflictedPerSecond = 0;
  let hasAfflictionEffect = false;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index]) continue;
    if (effect.stat === "affliction-effect") {
      if (!dotComponents.length) {
        exclude(index, "affliction", "no-dot-affliction-not-applied");
        continue;
      }
      if (effect.operation === "add") {
        afflictionEffectIncrease += effect.value;
      } else if (effect.operation === "more" && effect.value >= -100) {
        afflictionEffectMore *= 1 + effect.value / 100;
      } else {
        exclude(index, "affliction", "affliction-effect-operation-unsupported", true);
        continue;
      }
      hasAfflictionEffect = true;
      apply(index, "affliction", { resolvedValue: effect.value });
      continue;
    }
    if (effect.stat !== "affliction-inflicted-per-second") continue;
    if (!dotComponents.length) {
      exclude(index, "affliction", "no-dot-affliction-not-applied");
      continue;
    }
    if (effect.operation !== "add" || effect.value < 0) {
      exclude(index, "affliction", "affliction-rate-effect-invalid", true);
      continue;
    }
    afflictionInflictedPerSecond += effect.value;
    hasAfflictionEffect = true;
    apply(index, "affliction", { resolvedValue: effect.value });
  }
  if (
    !Number.isFinite(afflictionEffectIncrease)
    || !Number.isFinite(afflictionEffectMore)
    || afflictionEffectIncrease < -100
    || afflictionEffectMore < 0
  ) {
    synthetic("affliction", "affliction-effect-result-invalid");
  }
  const safeAfflictionEffectIncrease = Number.isFinite(afflictionEffectIncrease)
    && afflictionEffectIncrease >= -100
    ? afflictionEffectIncrease
    : 0;
  const safeAfflictionEffectMore = Number.isFinite(afflictionEffectMore)
    && afflictionEffectMore >= 0
    ? afflictionEffectMore
    : 1;
  const afflictionDamageMultiplier = getTlidbAfflictionDamageMultiplier(afflictionRating, {
    effectIncrease: safeAfflictionEffectIncrease,
    effectMore: safeAfflictionEffectMore,
  });
  const affliction = dotComponents.length && (hasEnemyAfflictionInput || hasAfflictionEffect)
    ? {
        rating: rounded(afflictionRating),
        effectIncrease: rounded(safeAfflictionEffectIncrease),
        effectMore: rounded(safeAfflictionEffectMore),
        effectiveRating: rounded((afflictionDamageMultiplier - 1) * 100),
        damageMultiplier: afflictionDamageMultiplier,
        inflictedPerSecond: rounded(afflictionInflictedPerSecond),
        sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.affliction.sourceUrl,
        sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.affliction.sourceRecordKey,
      }
    : null;

  let reapingBaseDurationSeconds = null;
  let reapingDurationIncrease = 0;
  let reapingDurationMore = 1;
  let hasReapingDurationEffect = false;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index] || effect.stat !== "reaping-duration") continue;
    if (!dotComponents.length) {
      exclude(index, "reaping", "no-dot-reaping-duration-not-applied");
      continue;
    }
    if (effect.operation === "set" && finiteNumber(effect.value) !== null && effect.value >= 0) {
      if (reapingBaseDurationSeconds !== null) {
        exclude(index, "reaping", "multiple-reaping-base-durations", true);
        continue;
      }
      reapingBaseDurationSeconds = effect.value;
    } else if (effect.operation === "add") {
      reapingDurationIncrease += effect.value;
    } else if (effect.operation === "more" && effect.value >= -100) {
      reapingDurationMore *= 1 + effect.value / 100;
    } else {
      exclude(index, "reaping", "reaping-duration-operation-unsupported", true);
      continue;
    }
    hasReapingDurationEffect = true;
    apply(index, "reaping", { resolvedValue: effect.value });
  }
  if (
    !Number.isFinite(reapingDurationIncrease)
    || !Number.isFinite(reapingDurationMore)
    || reapingDurationIncrease < -100
    || reapingDurationMore < 0
  ) {
    synthetic("reaping", "reaping-duration-result-invalid");
  }
  const safeReapingDurationIncrease = Number.isFinite(reapingDurationIncrease)
    && reapingDurationIncrease >= -100
    ? reapingDurationIncrease
    : 0;
  const safeReapingDurationMore = Number.isFinite(reapingDurationMore)
    && reapingDurationMore >= 0
    ? reapingDurationMore
    : 1;

  let reapingBaseRecoverySeconds = null;
  const reapingRecoveryTimeEffects = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => effect?.stat === "effect-cooldown" && !traced[index]);
  if (reapingBaseDurationSeconds !== null && dotComponents.length) {
    if (reapingRecoveryTimeEffects.length === 1) {
      const [{ effect, index }] = reapingRecoveryTimeEffects;
      if (effect.operation !== "set" || finiteNumber(effect.value) === null || effect.value <= 0) {
        exclude(index, "reaping", "reaping-recovery-time-invalid", true);
      } else {
        reapingBaseRecoverySeconds = effect.value;
        apply(index, "reaping", { resolvedValue: effect.value });
      }
    } else if (reapingRecoveryTimeEffects.length > 1) {
      reapingRecoveryTimeEffects.forEach(({ index }) => (
        exclude(index, "reaping", "multiple-reaping-recovery-times", true)
      ));
    }
  }

  let reapingRecoverySpeedIncrease = 0;
  let reapingRecoverySpeedMore = 1;
  let hasReapingRecoverySpeedEffect = false;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index] || effect.stat !== "reaping-recovery-speed") continue;
    if (!dotComponents.length || !hasReapingDurationEffect) {
      exclude(index, "reaping", "no-dot-reaping-recovery-speed-not-applied");
      continue;
    }
    if (effect.operation === "add") {
      reapingRecoverySpeedIncrease += effect.value;
    } else if (effect.operation === "more" && effect.value >= -100) {
      reapingRecoverySpeedMore *= 1 + effect.value / 100;
    } else {
      exclude(index, "reaping", "reaping-recovery-speed-operation-unsupported", true);
      continue;
    }
    hasReapingRecoverySpeedEffect = true;
    apply(index, "reaping", { resolvedValue: effect.value });
  }
  if (
    !Number.isFinite(reapingRecoverySpeedIncrease)
    || !Number.isFinite(reapingRecoverySpeedMore)
    || reapingRecoverySpeedIncrease < -100
    || reapingRecoverySpeedMore < 0
  ) {
    synthetic("reaping", "reaping-recovery-speed-result-invalid");
  }
  if (hasReapingRecoverySpeedEffect && reapingBaseRecoverySeconds === null) {
    synthetic("reaping", "reaping-recovery-time-unavailable");
  }
  const safeReapingRecoverySpeedIncrease = Number.isFinite(reapingRecoverySpeedIncrease)
    && reapingRecoverySpeedIncrease >= -100
    ? reapingRecoverySpeedIncrease
    : 0;
  const safeReapingRecoverySpeedMore = Number.isFinite(reapingRecoverySpeedMore)
    && reapingRecoverySpeedMore >= 0
    ? reapingRecoverySpeedMore
    : 1;

  let actionRate = hitComponents.length ? null : 0;
  const castTimeEffects = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => effect?.stat === "cast-time" && !traced[index]);
  const cadenceKinds = new Set(hitComponents.flatMap(({ tags }) => (
    ["attack", "spell"].filter((tag) => tags.has(tag))
  )));
  let cadenceKind = context.cadenceKind;
  if (!cadenceKind && cadenceKinds.size === 1) cadenceKind = [...cadenceKinds][0];
  if (hitComponents.length && !["attack", "spell"].includes(cadenceKind)) {
    castTimeEffects.forEach(({ index }) => exclude(index, "cadence", "cadence-kind-unavailable", true));
    synthetic("cadence", "cadence-kind-unavailable");
  } else if (hitComponents.length) {
    const contextTime = finiteNumber(cadenceKind === "attack" ? context.attackTime : context.castTime);
    const tooltipTime = castTimeEffects.length === 1 ? castTimeEffects[0].effect.value : null;
    const baseTime = contextTime ?? tooltipTime;
    if (!Number.isFinite(baseTime) || baseTime <= 0) {
      castTimeEffects.forEach(({ index }) => exclude(index, "cadence", "action-time-unavailable", true));
      synthetic("cadence", "action-time-unavailable");
    } else {
      if (contextTime !== null) {
        castTimeEffects.forEach(({ index }) => exclude(index, "cadence", "context-action-time-used"));
      } else if (castTimeEffects.length === 1) {
        apply(castTimeEffects[0].index, "cadence", {
          resolvedValue: castTimeEffects[0].effect.value,
          actionTime: baseTime,
        });
      }

      const inheritedSpeedIncrease = finiteNumber(
        cadenceKind === "attack" ? context.attackSpeedIncrease : context.castSpeedIncrease,
      );
      const inheritedSpeedMore = finiteNumber(
        cadenceKind === "attack" ? context.attackSpeedMore : context.castSpeedMore,
      );
      let speedIncrease = inheritedSpeedIncrease ?? 0;
      let speedMore = inheritedSpeedMore ?? 1;
      if (inheritedSpeedIncrease !== null && inheritedSpeedIncrease < -100) {
        synthetic("cadence", "inherited-speed-increase-out-of-range");
      }
      if (inheritedSpeedMore !== null && inheritedSpeedMore < 0) {
        synthetic("cadence", "inherited-speed-more-out-of-range");
      }
      for (const [index, effect] of resolved.entries()) {
        if (!effect || traced[index]) continue;
        const kind = speedKind(effect.stat);
        if (!kind) continue;
        if (kind !== cadenceKind) {
          exclude(index, "cadence", "cadence-speed-kind-not-selected");
          continue;
        }
        if (effect.operation === "add") speedIncrease += effect.value;
        else if (effect.operation === "more") speedMore *= 1 + (effect.value / 100);
        else {
          exclude(index, "cadence", "cadence-speed-operation-unsupported", true);
          continue;
        }
        apply(index, "cadence", { resolvedValue: effect.value });
      }
      const speedFactor = (1 + (speedIncrease / 100)) * speedMore;
      if (!Number.isFinite(speedFactor) || speedFactor < 0) {
        synthetic("cadence", "cadence-speed-result-invalid");
      } else {
        actionRate = speedFactor / baseTime;
        // Season callers supply an evidenced cap; historical callers retain
        // their original cadence. This limits actions, not hits or burst procs.
        if (context.actionRateCap !== undefined) {
          if (!Number.isFinite(context.actionRateCap) || context.actionRateCap <= 0) {
            synthetic('cadence', 'action-rate-cap-unverified');
          } else {
            actionRate = Math.min(actionRate, context.actionRateCap);
          }
        }
      }

      const cooldownEffects = resolved
        .map((effect, index) => ({ effect, index }))
        .filter(({ effect, index }) => effect?.stat === "cooldown" && !traced[index]);
      if (!cooldownEffects.length && context.ignoreInapplicableCooldown === true) {
        for (const [index, effect] of resolved.entries()) if (effect && !traced[index] && cooldownRecovery(effect.stat)
          && ['add', 'more'].includes(effect.operation)) exclude(index, 'cooldown', 'skill-has-no-cooldown');
      } else if (cooldownEffects.length > 1) {
        cooldownEffects.forEach(({ index }) => exclude(index, "cooldown", "cooldown-value-ambiguous", true));
      } else if (cooldownEffects.length === 1) {
        const cooldownEntry = cooldownEffects[0];
        let recoveryIncrease = 0;
        let recoveryMore = 1;
        for (const [index, effect] of resolved.entries()) {
          if (!effect || traced[index] || !cooldownRecovery(effect.stat)) continue;
          if (effect.operation === "add") recoveryIncrease += effect.value;
          else if (effect.operation === "more") recoveryMore *= 1 + (effect.value / 100);
          else {
            exclude(index, "cooldown", "cooldown-recovery-operation-unsupported", true);
            continue;
          }
          apply(index, "cooldown", { resolvedValue: effect.value });
        }
        const recoveryFactor = (1 + (recoveryIncrease / 100)) * recoveryMore;
        const effectiveCooldown = cooldownEntry.effect.value / recoveryFactor;
        if (!Number.isFinite(effectiveCooldown) || effectiveCooldown <= 0) {
          exclude(cooldownEntry.index, "cooldown", "effective-cooldown-invalid", true);
        } else {
          actionRate = Math.min(actionRate, 1 / effectiveCooldown);
          apply(cooldownEntry.index, "cooldown", {
            resolvedValue: cooldownEntry.effect.value,
            effectiveCooldown,
          });
        }
      }
    }
  } else {
    castTimeEffects.forEach(({ index }) => exclude(index, "cadence", "no-hit-cadence-not-applied"));
    for (const [index, effect] of resolved.entries()) {
      if (!effect || traced[index]) continue;
      if (speedKind(effect.stat) || effect.stat === "cooldown" || cooldownRecovery(effect.stat)) {
        exclude(index, "cadence", "no-hit-cadence-not-applied");
      }
    }
  }

  let spellBurst = null;
  const spellBurstEffects = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => (
      /^(?:skill|supported-skill|minion)-max-spell-burst$/u.test(effect?.stat ?? "")
      && !traced[index]
    ));
  if (spellBurstEffects.length) {
    const hasCooldown = resolved.some((effect) => effect?.stat === "cooldown");
    const spellBurstIneligibleTags = new Set([
      "summon",
      "sentry",
      "channel",
      "channeled",
      "channeling",
      "trigger",
      "triggered",
    ]);
    const hasIneligibleTag = hitComponents.some(({ tags }) => (
      [...tags].some((tag) => spellBurstIneligibleTags.has(String(tag).toLowerCase()))
    ));
    if (!hitComponents.length || cadenceKind !== "spell" || hasCooldown || hasIneligibleTag) {
      spellBurstEffects.forEach(({ index }) => {
        exclude(index, "spell-burst", "spell-burst-skill-ineligible");
      });
    } else {
      let maximumStacks = 0;
      let maximumStacksMultiplier = 1;
      let hasBaseMaximumStacks = false;
      const maximumStackModifiers = [];
      for (const { effect, index } of spellBurstEffects) {
        if (
          effect.operation === "add"
          && Number.isInteger(effect.value)
          && effect.value > 0
        ) {
          maximumStacks += effect.value;
          hasBaseMaximumStacks = true;
          apply(index, "spell-burst", { resolvedValue: effect.value });
          continue;
        }
        if (effect.operation === "more" && effect.value >= -100) {
          maximumStacksMultiplier *= 1 + effect.value / 100;
          maximumStackModifiers.push({ effect, index });
          continue;
        }
        {
          exclude(index, "spell-burst", "spell-burst-stack-effect-invalid", true);
        }
      }
      if (!hasBaseMaximumStacks) {
        maximumStackModifiers.forEach(({ index }) => {
          exclude(index, "spell-burst", "spell-burst-base-maximum-unavailable");
        });
      } else if (Number.isFinite(actionRate) && actionRate > 0) {
        maximumStackModifiers.forEach(({ effect, index }) => {
          apply(index, "spell-burst", { resolvedValue: effect.value });
        });
        const effectiveMaximumStacks = Math.floor(maximumStacks * maximumStacksMultiplier);
        const cadence = getTlidbSpellBurstCadence(actionRate, effectiveMaximumStacks, {
          chargeSpeedIncrease: context.spellBurstChargeSpeedIncrease,
          chargeSpeedMore: context.spellBurstChargeSpeedMore,
        });
        actionRate = cadence.effectiveActionRate;
        spellBurst = {
          ...cadence,
          sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.spellBurst.sourceUrl,
          sourcePageSha256: TLIDB_HELP_CALCULATION_SOURCES.spellBurst.sourcePageSha256,
        };
      }
    }
  }

  const baseCriticalRating = finiteNumber(context.criticalStrikeRating);
  let criticalRatingFlat = 0;
  let criticalRatingIncrease = 0;
  let criticalRatingMore = 1;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index] || !/^(?:skill|supported-skill|minion)-critical-strike-rating$/u.test(effect.stat)) {
      continue;
    }
    if (!hitComponents.length) {
      exclude(index, "critical", "no-hit-critical-rating-not-applied");
      continue;
    }
    if (effect.operation === "add" && effect.unit === "flat") {
      criticalRatingFlat += effect.value;
    } else if (effect.operation === "add") {
      criticalRatingIncrease += effect.value;
    } else if (effect.operation === "more" && effect.value >= -100) {
      criticalRatingMore *= 1 + effect.value / 100;
    } else {
      exclude(index, "critical", "critical-strike-rating-operation-unsupported", true);
      continue;
    }
    apply(index, "critical", { resolvedValue: effect.value });
  }
  const criticalRatingFactor = (1 + criticalRatingIncrease / 100) * criticalRatingMore;
  if (!Number.isFinite(criticalRatingFactor) || criticalRatingFactor < 0) {
    synthetic("critical", "critical-strike-rating-modifier-invalid");
  }
  const effectiveCriticalRating = baseCriticalRating === null
    ? null
    : rounded((baseCriticalRating + criticalRatingFlat) * (
        Number.isFinite(criticalRatingFactor) && criticalRatingFactor >= 0
          ? criticalRatingFactor
          : 1
      ));

  const baseCriticalDamage = finiteNumber(context.criticalStrikeDamage);
  let criticalDamageBonus = 0;
  let hasCriticalDamageBonus = false;
  for (const [index, effect] of resolved.entries()) {
    if (
      !effect
      || traced[index]
      || !/^(?:skill|supported-skill|minion)-critical-strike-damage$/u.test(effect.stat)
    ) {
      continue;
    }
    if (!hitComponents.length) {
      exclude(index, "critical", "no-hit-critical-strike-damage-not-applied");
      continue;
    }
    if (effect.operation !== "add" || finiteNumber(effect.value) === null) {
      exclude(index, "critical", "critical-strike-damage-operation-unsupported", true);
      continue;
    }
    criticalDamageBonus += effect.value;
    hasCriticalDamageBonus = true;
    apply(index, "critical", { resolvedValue: effect.value });
  }
  if (hasCriticalDamageBonus && baseCriticalDamage === null) {
    synthetic("critical", "critical-strike-damage-context-unavailable");
  }
  const effectiveCriticalDamage = baseCriticalDamage === null
    ? null
    : rounded(baseCriticalDamage + criticalDamageBonus);

  let conditionalCriticalDamageMultiplier = 1;
  let hasConditionalCriticalDamage = false;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index] || effect.stat !== "critical-hit-damage") continue;
    if (!hitComponents.length) {
      exclude(index, "critical", "no-hit-critical-damage-not-applied");
      continue;
    }
    if (effect.operation !== "more" || finiteNumber(effect.value) === null || effect.value < -100) {
      exclude(index, "critical", "critical-hit-damage-effect-invalid", true);
      continue;
    }
    conditionalCriticalDamageMultiplier *= 1 + effect.value / 100;
    hasConditionalCriticalDamage = true;
    apply(index, "critical", { resolvedValue: effect.value });
  }
  if (!Number.isFinite(conditionalCriticalDamageMultiplier) || conditionalCriticalDamageMultiplier < 0) {
    synthetic("critical", "critical-hit-damage-result-invalid");
  }
  const safeConditionalCriticalDamageMultiplier = Number.isFinite(conditionalCriticalDamageMultiplier)
    && conditionalCriticalDamageMultiplier >= 0
    ? conditionalCriticalDamageMultiplier
    : 1;
  if (
    hasConditionalCriticalDamage
    && (effectiveCriticalRating === null || effectiveCriticalDamage === null)
  ) {
    synthetic("critical", "critical-hit-damage-context-unavailable");
  }

  let tripleDamageChanceInput = null;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index] || effect.stat !== "attack-triple-damage-chance") continue;
    if (!hitComponents.length) {
      exclude(index, "triple-damage", "no-hit-triple-damage-not-applied");
      continue;
    }
    if (
      effect.operation !== "add"
      || finiteNumber(effect.value) === null
      || Number(effect.damageMultiplier) !== 3
    ) {
      exclude(index, "triple-damage", "triple-damage-effect-invalid", true);
      continue;
    }
    tripleDamageChanceInput = (tripleDamageChanceInput ?? 0) + Number(effect.value);
    apply(index, "triple-damage", { resolvedValue: Number(effect.value) });
  }

  let doubleDamageChanceFromEffects = 0;
  let hasDoubleDamageChanceEffect = false;
  for (const [index, effect] of resolved.entries()) {
    if (
      !effect
      || traced[index]
      || !/^(?:skill|supported-skill|minion)-double-damage-chance$/u.test(effect.stat)
    ) continue;
    if (!hitComponents.length) {
      exclude(index, "double-damage", "no-hit-double-damage-not-applied");
      continue;
    }
    if (effect.operation !== "add" || finiteNumber(effect.value) === null) {
      exclude(index, "double-damage", "double-damage-effect-invalid", true);
      continue;
    }
    doubleDamageChanceFromEffects += Number(effect.value);
    hasDoubleDamageChanceEffect = true;
    apply(index, "double-damage", { resolvedValue: Number(effect.value) });
  }

  let elementalResistancePenetration = 0;
  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index] || effect.stat !== "skill-elemental-resistance-penetration") continue;
    if (effect.operation !== "add" || finiteNumber(effect.value) === null || effect.value < 0) {
      exclude(
        index,
        "elemental-resistance-penetration",
        "elemental-resistance-penetration-effect-invalid",
        true,
      );
      continue;
    }
    const hasElementalDamage = allComponents.some((entry) => (
      [...ELEMENTAL_DAMAGE_TYPE_SET].some((damageType) => Object.hasOwn(entry.pools, damageType))
    ));
    if (!hasElementalDamage) {
      exclude(
        index,
        "elemental-resistance-penetration",
        "elemental-resistance-penetration-target-unavailable",
      );
      continue;
    }
    elementalResistancePenetration += Number(effect.value);
    apply(index, "elemental-resistance-penetration", {
      resolvedValue: Number(effect.value),
      elementalResistancePenetration,
    });
  }

  let armorPenetrationFromEffects = 0;
  for (const [index, effect] of resolved.entries()) {
    if (
      !effect
      || traced[index]
      || !/^(?:skill|supported-skill|minion)-armor-damage-mitigation-penetration$/u.test(effect.stat)
    ) continue;
    if (effect.stat.startsWith("minion-") && context?.target !== "minion") {
      exclude(
        index,
        "armor-damage-mitigation-penetration",
        "armor-damage-mitigation-penetration-target-unavailable",
      );
      continue;
    }
    if (!hitComponents.length) {
      exclude(
        index,
        "armor-damage-mitigation-penetration",
        "no-hit-armor-damage-mitigation-penetration-not-applied",
      );
      continue;
    }
    if (effect.operation !== "add" || finiteNumber(effect.value) === null || effect.value < 0) {
      exclude(
        index,
        "armor-damage-mitigation-penetration",
        "armor-damage-mitigation-penetration-effect-invalid",
        true,
      );
      continue;
    }
    armorPenetrationFromEffects += Number(effect.value);
    apply(index, "armor-damage-mitigation-penetration", {
      resolvedValue: Number(effect.value),
      armorDamageMitigationPenetration: armorPenetrationFromEffects,
    });
  }

  for (const [index, effect] of resolved.entries()) {
    if (!effect || traced[index]) continue;
    const stat = effect.stat ?? "";
    if (["damage-lucky", "reaping-repeat-chance"].includes(stat)) continue;
    const nonDamage = stat === "mana-cost"
      || stat === "mana-cost-multiplier"
      || stat === "sealed-mana"
      || /duration$/u.test(stat)
      || /(?:skill-area|chance|quantity|stacks)$/u.test(stat)
      || stat === "self-true-damage-percent-per-second";
    exclude(
      index,
      "classify",
      nonDamage ? "non-offensive-dps-effect" : "skill-damage-effect-unsupported",
      !nonDamage && potentialDamageEffect(effect),
    );
  }

  const invalidComponentMultiplier = allComponents.some((entry) => (
    !Number.isFinite(entry.increase)
    || !Number.isFinite(entry.more)
    || !Number.isFinite(entry.boundIncrease.min)
    || !Number.isFinite(entry.boundIncrease.max)
    || !Number.isFinite(entry.boundMore.min)
    || !Number.isFinite(entry.boundMore.max)
    || (1 + (entry.increase / 100)) < 0
    || entry.more < 0
    || (1 + (entry.boundIncrease.min / 100)) < 0
    || (1 + (entry.boundIncrease.max / 100)) < 0
    || entry.boundMore.min < 0
    || entry.boundMore.max < 0
  ));
  if (invalidComponentMultiplier) synthetic("damage-modifier", "damage-modifier-result-invalid");

  const hasArmorPenetrationInput = Object.hasOwn(context, "armorDamageMitigationPenetration");
  const armorPenetrationInput = hasArmorPenetrationInput
    ? finiteNumber(context.armorDamageMitigationPenetration)
    : null;
  if (hasArmorPenetrationInput && (armorPenetrationInput === null || armorPenetrationInput < 0)) {
    synthetic("armor-damage-mitigation-penetration", "armor-penetration-input-invalid");
  }
  const safeArmorPenetrationInput = armorPenetrationInput !== null && armorPenetrationInput >= 0
    ? armorPenetrationInput
    : 0;
  const safeArmorPenetration = safeArmorPenetrationInput + armorPenetrationFromEffects;
  const hasEffectiveArmorPenetration = (
    (hasArmorPenetrationInput && armorPenetrationInput !== null && armorPenetrationInput >= 0)
    || armorPenetrationFromEffects > 0
  );

  const hasResistancePenetrationInput = Object.hasOwn(context, "resistancePenetration");
  const resistancePenetrationInput = hasResistancePenetrationInput
    ? finiteNumber(context.resistancePenetration)
    : null;
  if (
    hasResistancePenetrationInput
    && (resistancePenetrationInput === null || resistancePenetrationInput < 0)
  ) {
    synthetic("resistance-penetration", "resistance-penetration-input-invalid");
  }
  const safeResistancePenetration = resistancePenetrationInput !== null
    && resistancePenetrationInput >= 0
    ? resistancePenetrationInput
    : 0;

  const hasEnemyArmorInput = Object.hasOwn(context, "enemyArmor");
  const enemyArmorInput = hasEnemyArmorInput ? finiteNumber(context.enemyArmor) : null;
  if (hasEnemyArmorInput && (enemyArmorInput === null || enemyArmorInput < 0)) {
    synthetic("enemy-armor", "enemy-armor-input-invalid");
  }
  const safeEnemyArmor = enemyArmorInput !== null && enemyArmorInput >= 0 ? enemyArmorInput : 0;
  const armorReduction = getTlidbMonsterArmorDamageReduction(safeEnemyArmor);
  const enemyArmor = hasEnemyArmorInput && enemyArmorInput !== null && enemyArmorInput >= 0
    ? {
        value: safeEnemyArmor,
        physicalReductionPercent: rounded(armorReduction * 100),
        nonPhysicalReductionPercent: rounded(armorReduction * 0.6 * 100),
        ...(hasEffectiveArmorPenetration ? {
          penetration: safeArmorPenetration,
          penetratedPhysicalReductionPercent: rounded(armorReduction * 100 - safeArmorPenetration),
          penetratedNonPhysicalReductionPercent: rounded(armorReduction * 0.6 * 100 - safeArmorPenetration),
          penetrationSourceUrl: TLIDB_HELP_CALCULATION_SOURCES.armorDamageMitigationPenetration.sourceUrl,
          penetrationSourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.armorDamageMitigationPenetration.sourceRecordKey,
        } : {}),
        sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.armor.sourceUrl,
        sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.armor.sourceRecordKey,
      }
    : null;

  const hasEnemyResistanceInput = Object.hasOwn(context, "enemyResistances");
  const enemyResistanceInput = context.enemyResistances;
  const validEnemyResistanceObject = enemyResistanceInput
    && typeof enemyResistanceInput === "object"
    && !Array.isArray(enemyResistanceInput);
  if (hasEnemyResistanceInput && !validEnemyResistanceObject) {
    synthetic("enemy-resistance", "enemy-resistance-input-invalid");
  }
  const safeEnemyResistances = {};
  if (validEnemyResistanceObject) {
    for (const damageType of ["fire", "cold", "lightning", "erosion"]) {
      if (!Object.hasOwn(enemyResistanceInput, damageType)) continue;
      const value = finiteNumber(enemyResistanceInput[damageType]);
      if (value === null) {
        synthetic("enemy-resistance", "enemy-resistance-input-invalid", true, { damageType });
        continue;
      }
      safeEnemyResistances[damageType] = value;
    }
  }
  const componentDamageTypes = new Set(allComponents.flatMap((entry) => Object.keys(entry.pools)));
  const enemyResistances = validEnemyResistanceObject
    ? {
        sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.resistance.sourceUrl,
        sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.resistance.sourceRecordKey,
        ...Object.fromEntries(
          ["fire", "cold", "lightning", "erosion"]
            .filter((damageType) => componentDamageTypes.has(damageType))
            .map((damageType) => {
              const value = safeEnemyResistances[damageType] ?? 0;
              const effectiveValue = getTlidbEffectiveResistance(value);
              const hasGlobalPenetration = hasResistancePenetrationInput
                && resistancePenetrationInput !== null
                && resistancePenetrationInput >= 0;
              const hasElementalPenetration = ELEMENTAL_DAMAGE_TYPE_SET.has(damageType)
                && elementalResistancePenetration > 0;
              const penetration = safeResistancePenetration
                + (hasElementalPenetration ? elementalResistancePenetration : 0);
              return [damageType, {
                value,
                effectiveValue,
                ...(hasGlobalPenetration || hasElementalPenetration ? {
                    penetration,
                    penetratedValue: getTlidbPenetratedResistance(
                      value,
                      penetration,
                    ),
                  } : {}),
                damageMultiplier: getTlidbResistanceDamageMultiplier(
                  value,
                  60,
                  penetration,
                ),
              }];
            }),
        ),
        ...((hasResistancePenetrationInput
          && resistancePenetrationInput !== null
          && resistancePenetrationInput >= 0)
          || elementalResistancePenetration > 0 ? {
            penetrationSourceUrl: TLIDB_HELP_CALCULATION_SOURCES.resistancePenetration.sourceUrl,
            penetrationSourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.resistancePenetration.sourceRecordKey,
          } : {}),
      }
    : null;

  const baseHitAverage = componentsAverageAtStage(hitComponents, "base", "base");
  const addedHitAverage = componentsAverageAtStage(hitComponents, "base", "added");
  const hitAfterIncrease = componentsAverageAtStage(hitComponents, "increase");
  const hitAfterAdditional = componentsAverageAtStage(hitComponents, "additional");
  const hitAfterTaken = componentsAverageAtStage(hitComponents, "taken");
  const baseDotAverage = componentsAverageAtStage(dotComponents, "base");
  const dotAfterIncrease = componentsAverageAtStage(dotComponents, "increase");
  const dotAfterAdditional = componentsAverageAtStage(dotComponents, "additional");
  const dotAfterTaken = componentsAverageAtStage(dotComponents, "taken");
  const dotAfterAffliction = rounded(dotAfterTaken * afflictionDamageMultiplier);

  const hitPoolRanges = hitComponents.flatMap((entry) => (
    Object.entries(entry.pools).map(([damageType, values]) => (
      poolRangeAfterEnemyMitigation(entry, damageType, values, {
        enemyArmor: safeEnemyArmor,
        enemyResistances: safeEnemyResistances,
        armorDamageMitigationPenetration: safeArmorPenetration,
        resistancePenetration: safeResistancePenetration,
        elementalResistancePenetration,
        applyArmor: true,
      })
    ))
  ));
  const hitRange = hitPoolRanges.reduce((total, values) => {
    return { min: total.min + values.min, max: total.max + values.max };
  }, { min: 0, max: 0 });
  const variableHitPoolCount = hitPoolRanges.filter(({ min, max }) => (
    Math.abs(max - min) > 1e-12
  )).length;
  const dotRangeBeforeAffliction = dotComponents.reduce((total, entry) => {
    const values = componentRangeAfterEnemyMitigation(entry, {
      enemyResistances: safeEnemyResistances,
      resistancePenetration: safeResistancePenetration,
      elementalResistancePenetration,
    });
    return { min: total.min + values.min, max: total.max + values.max };
  }, { min: 0, max: 0 });
  const dotRange = {
    min: dotRangeBeforeAffliction.min * afflictionDamageMultiplier,
    max: dotRangeBeforeAffliction.max * afflictionDamageMultiplier,
  };
  const hitAfterMitigation = rounded((hitRange.min + hitRange.max) / 2);
  const dotAfterMitigation = rounded((dotRange.min + dotRange.max) / 2);

  const dotInstances = context.dotInstances === undefined ? 1 : finiteNumber(context.dotInstances);
  const dotUptime = context.dotUptime === undefined ? 1 : finiteNumber(context.dotUptime);
  if (dotComponents.length && (dotInstances === null || dotInstances < 0)) {
    synthetic("dot", "dot-instance-count-invalid");
  }
  if (dotComponents.length && (dotUptime === null || dotUptime < 0 || dotUptime > 1)) {
    synthetic("dot", "dot-uptime-invalid");
  }
  const safeDotInstances = dotInstances !== null && dotInstances >= 0 ? dotInstances : 0;
  const safeDotUptime = dotUptime !== null && dotUptime >= 0 && dotUptime <= 1 ? dotUptime : 0;
  const safeRate = Number.isFinite(actionRate) && actionRate >= 0 ? actionRate : 0;
  const hitMin = rounded(hitRange.min * projectileHits);
  const hitMax = rounded(hitRange.max * projectileHits);
  const hitAverage = rounded((hitMin + hitMax) / 2);
  const dpsMin = rounded(hitMin * safeRate);
  const dpsMax = rounded(hitMax * safeRate);
  const hitDps = rounded((dpsMin + dpsMax) / 2);
  const luckyDamageEntries = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => effect && !traced[index] && effect.stat === "damage-lucky");
  let luckyDamage = null;
  let hitAfterLuckyDps = hitDps;
  if (luckyDamageEntries.length) {
    const invalid = luckyDamageEntries.filter(({ effect }) => (
      effect.operation !== "set" || ![1, true].includes(effect.value)
    ));
    if (invalid.length) {
      for (const { index } of luckyDamageEntries) {
        exclude(index, "lucky-damage", "lucky-damage-effect-invalid", true);
      }
    } else if (!hitComponents.length) {
      for (const { index } of luckyDamageEntries) {
        exclude(index, "lucky-damage", "lucky-damage-hit-range-unavailable", true);
      }
    } else if (variableHitPoolCount > 1) {
      for (const { index } of luckyDamageEntries) {
        exclude(index, "lucky-damage", "lucky-damage-roll-dependency-unverified", true, {
          variableHitPoolCount,
        });
      }
    } else {
      const expectedHit = getTlidbLuckyDamageExpectedValue(hitMin, hitMax);
      if (expectedHit === null) {
        for (const { index } of luckyDamageEntries) {
          exclude(index, "lucky-damage", "lucky-damage-hit-range-invalid", true);
        }
      } else {
        hitAfterLuckyDps = rounded(expectedHit * safeRate);
        for (const { effect, index } of luckyDamageEntries) {
          apply(index, "lucky-damage", {
            resolvedValue: effect.value,
            rollCount: TLIDB_HELP_CALCULATION_SOURCES.luckyDamage.rollCount,
            ordinaryHitDps: hitDps,
            expectedHitDps: hitAfterLuckyDps,
          });
        }
        luckyDamage = {
          rollCount: TLIDB_HELP_CALCULATION_SOURCES.luckyDamage.rollCount,
          ordinaryHitDps: hitDps,
          expectedHitDps: hitAfterLuckyDps,
          expectedMultiplier: hitDps > 0 ? hitAfterLuckyDps / hitDps : 1,
          sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.luckyDamage.sourceUrl,
          sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.luckyDamage.sourceRecordKey,
          sourcePageSha256: TLIDB_HELP_CALCULATION_SOURCES.luckyDamage.sourcePageSha256,
        };
      }
    }
  }
  const dotMin = rounded(dotRange.min * safeDotInstances * safeDotUptime);
  const dotMax = rounded(dotRange.max * safeDotInstances * safeDotUptime);
  const dotAverage = rounded((dotMin + dotMax) / 2);

  const hasReapingDurationInput = Object.hasOwn(context, "reapingDurationSeconds");
  const hasReapingEventsInput = Object.hasOwn(context, "reapingEventsPerSecond");
  const reapingDurationInput = hasReapingDurationInput
    ? finiteNumber(context.reapingDurationSeconds)
    : reapingBaseDurationSeconds ?? 0;
  const reapingEventsInput = hasReapingEventsInput
    ? finiteNumber(context.reapingEventsPerSecond)
    : null;
  if (hasReapingDurationInput && (reapingDurationInput === null || reapingDurationInput < 0)) {
    synthetic("reaping", "reaping-duration-input-invalid");
  }
  if (hasReapingEventsInput && (reapingEventsInput === null || reapingEventsInput < 0)) {
    synthetic("reaping", "reaping-events-per-second-input-invalid");
  }
  const validReapingInputs = (
    (!hasReapingDurationInput || (reapingDurationInput !== null && reapingDurationInput >= 0))
    && (!hasReapingEventsInput || (reapingEventsInput !== null && reapingEventsInput >= 0))
  );
  const reapingCalculation = dotComponents.length
    && validReapingInputs
    && (hasReapingDurationInput || hasReapingEventsInput || hasReapingDurationEffect)
    ? getTlidbReapingDamage(dotAverage, {
        durationSeconds: reapingDurationInput,
        durationIncrease: safeReapingDurationIncrease,
        durationMore: safeReapingDurationMore,
        ...(hasReapingEventsInput ? { eventsPerSecond: reapingEventsInput } : {}),
        ...(reapingBaseRecoverySeconds !== null ? {
          baseRecoverySeconds: reapingBaseRecoverySeconds,
          recoverySpeedIncrease: safeReapingRecoverySpeedIncrease,
          recoverySpeedMore: safeReapingRecoverySpeedMore,
        } : {}),
      })
    : null;
  const reapingRepeatEntries = resolved
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect, index }) => (
      effect && !traced[index] && effect.stat === "reaping-repeat-chance"
    ));
  let reapingRepeatChance = null;
  if (reapingRepeatEntries.length && !reapingCalculation) {
    reapingRepeatEntries.forEach(({ index }) => {
      exclude(index, "reaping-repeat", "no-reaping-repeat-chance-not-applied");
    });
  } else if (reapingRepeatEntries.length > 1) {
    reapingRepeatEntries.forEach(({ index }) => {
      exclude(index, "reaping-repeat", "multiple-reaping-repeat-chance-effects", true);
    });
  } else if (reapingRepeatEntries.length === 1) {
    const [{ effect, index }] = reapingRepeatEntries;
    const chance = finiteNumber(effect.value);
    if (effect.operation !== "add" || chance === null || chance < 0 || chance > 100) {
      exclude(index, "reaping-repeat", "reaping-repeat-chance-effect-invalid", true);
    } else {
      reapingRepeatChance = chance;
      apply(index, "reaping-repeat", { resolvedValue: chance });
    }
  }
  const reapingExpectedRepeatMultiplier = reapingRepeatChance === null
    ? null
    : rounded(1 + reapingRepeatChance / 100);
  const reaping = reapingCalculation ? {
    ...reapingCalculation,
    ...(reapingExpectedRepeatMultiplier !== null ? {
      baseDps: reapingCalculation.dps,
      repeatChance: rounded(reapingRepeatChance),
      expectedRepeatMultiplier: reapingExpectedRepeatMultiplier,
      dps: rounded(reapingCalculation.dps * reapingExpectedRepeatMultiplier),
    } : {}),
    sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.reaping.sourceUrl,
    sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.reaping.sourceRecordKey,
    ...(reapingCalculation.baseRecoverySeconds !== undefined ? {
      recoveryFormulaSourceUrl: TLIDB_HELP_CALCULATION_SOURCES.reaping.recoveryFormulaSourceUrl,
      recoveryFormulaSourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.reaping.recoveryFormulaSourceRecordKey,
    } : {}),
  } : null;
  const baseReapingDps = reaping?.baseDps ?? reaping?.dps ?? 0;
  const reapingDps = reaping?.dps ?? 0;

  const criticalRating = effectiveCriticalRating;
  const criticalDamage = effectiveCriticalDamage;
  let critical = null;
  let expectedHitDps = hitAfterLuckyDps;
  if (criticalRating !== null || criticalDamage !== null) {
    if (criticalRating === null || criticalRating < 0) {
      synthetic("critical", "critical-strike-rating-invalid");
    } else if (criticalDamage === null || criticalDamage < 100) {
      synthetic("critical", "critical-strike-damage-invalid");
    } else {
      const chance = Math.min(100, criticalRating / 100);
      const criticalHitMultiplier = (criticalDamage / 100)
        * safeConditionalCriticalDamageMultiplier;
      const expectedMultiplier = 1 + (chance / 100) * (criticalHitMultiplier - 1);
      expectedHitDps = rounded(expectedHitDps * expectedMultiplier);
      critical = {
        rating: criticalRating,
        chance: rounded(chance),
        damage: criticalDamage,
        ...(hasConditionalCriticalDamage ? {
          conditionalDamageMultiplier: rounded(safeConditionalCriticalDamageMultiplier),
        } : {}),
        expectedMultiplier: rounded(expectedMultiplier),
      };
    }
  }
  const hitAfterCriticalDps = expectedHitDps;

  const baseDoubleDamageChance = finiteNumber(
    context.doubleDamageChance ?? context.stats?.doubleDamageChance,
  );
  const doubleDamageInput = baseDoubleDamageChance === null && !hasDoubleDamageChanceEffect
    ? null
    : (baseDoubleDamageChance ?? 0) + doubleDamageChanceFromEffects;
  let doubleDamage = null;
  if (doubleDamageInput !== null) {
    const chance = Math.min(100, Math.max(0, doubleDamageInput));
    const expectedMultiplier = 1 + chance / 100;
    expectedHitDps = rounded(expectedHitDps * expectedMultiplier);
    doubleDamage = {
      chance: rounded(chance),
      expectedMultiplier: rounded(expectedMultiplier),
    };
  }
  const hitAfterDoubleDamageDps = expectedHitDps;

  let tripleDamage = null;
  if (tripleDamageChanceInput !== null) {
    const chance = Math.min(100, Math.max(0, tripleDamageChanceInput));
    const damageMultiplier = 3;
    const expectedMultiplier = 1 + (chance / 100) * (damageMultiplier - 1);
    tripleDamage = {
      chance: rounded(chance),
      damageMultiplier,
      expectedMultiplier: rounded(expectedMultiplier),
    };
    if (chance > 0 && (doubleDamage?.chance ?? 0) > 0) {
      synthetic("triple-damage", "double-triple-damage-interaction-unverified", true);
    } else {
      expectedHitDps = rounded(expectedHitDps * expectedMultiplier);
    }
  }
  const hitAfterTripleDamageDps = expectedHitDps;

  const orderedExcluded = [...excluded, ...syntheticExcluded];
  const complete = !incomplete;
  const totalDps = complete ? rounded(hitDps + dotAverage + baseReapingDps) : null;
  const expectedTotalDps = complete ? rounded(expectedHitDps + dotAverage + reapingDps) : null;
  return {
    level,
    complete,
    hit: {
      min: hitMin,
      max: hitMax,
      average: hitAverage,
      rate: rounded(safeRate),
      projectileHits: rounded(projectileHits),
      dpsMin,
      dpsMax,
      dps: hitDps,
      // Keep separate rolls: Lucky over a sum is not Lucky per summand.
      ...(input.includeDamagePools === true ? { pools: hitComponents.flatMap(entry => Object.entries(entry.pools).map(([type, values]) => ({
        type, min: poolValueAtStage(entry, type, values.min, "taken", "min"),
        max: poolValueAtStage(entry, type, values.max, "taken", "max"),
      }))) } : {}),
    },
    dot: { min: dotMin, max: dotMax, average: dotAverage, dps: dotAverage,
      ...(input.includeDamagePools === true ? { pools: dotComponents.flatMap(entry => Object.entries(entry.pools).map(([type, values]) => ({
        type, min: poolValueAtStage(entry, type, values.min, "taken", "min"), max: poolValueAtStage(entry, type, values.max, "taken", "max"),
      }))) } : {}) },
    totalDps,
    expectedHitDps: complete ? expectedHitDps : null,
    expectedTotalDps,
    spellBurst,
    damageStages: {
      baseHitAverage,
      addedHitAverage,
      hitAfterIncrease,
      hitAfterAdditional,
      hitAfterTaken,
      hitAfterMitigation,
      hitRate: rounded(safeRate),
      projectileHits: rounded(projectileHits),
      hitDps,
      ...(luckyDamage ? { hitAfterLuckyDps } : {}),
      hitAfterCriticalDps,
      hitAfterDoubleDamageDps,
      hitAfterTripleDamageDps,
      baseDotAverage,
      dotAfterIncrease,
      dotAfterAdditional,
      dotAfterTaken,
      dotAfterAffliction,
      dotAfterMitigation,
      dotInstances: rounded(safeDotInstances),
      dotUptime: rounded(safeDotUptime),
      dotDps: dotAverage,
      reapingDurationSeconds: reaping?.durationSeconds ?? 0,
      reapingEffectiveDurationSeconds: reaping?.effectiveDurationSeconds ?? 0,
      reapingBaseRecoverySeconds: reaping?.baseRecoverySeconds ?? 0,
      reapingEffectiveRecoverySeconds: reaping?.effectiveRecoverySeconds ?? 0,
      reapingDamagePerEvent: reaping?.damagePerEvent ?? 0,
      reapingEventsPerSecond: reaping?.eventsPerSecond ?? 0,
      ...(reaping?.expectedRepeatMultiplier !== undefined ? {
        reapingBaseDps: reaping.baseDps,
        reapingRepeatChance: reaping.repeatChance,
        reapingExpectedRepeatMultiplier: reaping.expectedRepeatMultiplier,
      } : {}),
      reapingDps,
      totalAfterReapingDps: complete ? rounded(expectedHitDps + dotAverage + reapingDps) : null,
      totalDps,
      expectedTotalDps,
    },
    critical,
    luckyDamage,
    doubleDamage,
    tripleDamage,
    enemyArmor,
    enemyResistances,
    affliction,
    reaping,
    applied,
    excluded: orderedExcluded,
  };
}
