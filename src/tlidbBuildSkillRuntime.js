import { normalizeConditionState, resolveConditionValues } from "./conditionModel.js";
import { getSupportConditionAuthority } from "./conditionAuthorityMappings.js";
import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";
import { buildTlidbGearCombatContext } from "./tlidbGearCombatRuntime.js";
import { evaluateTlidbSkillDamage } from "./tlidbSkillDamageRuntime.js";

const OFFENSIVE_TEXT = /(?:damage|critical|attack|cast speed|cooldown|interval|projectile|wave|shotgun|hit the same enemy|frequency|multistrike|spell burst)/iu;
const SNAPSHOT_ONLY_TEXT = /(?:can't be spread|cannot be spread|costs life instead of mana)/iu;
const SUPPORT_COMPATIBILITY_TEXT = /^Supports\b.+\.?$/iu;

function canonicalExternalStat(value) {
  let stat = String(value ?? "").trim().toLowerCase().replaceAll("_", "-");
  if (stat === "deepening-effect") stat = "affliction-effect";
  if (stat === "harvest-duration") stat = "reaping-duration";
  if (stat === "harvest-recovery-speed") stat = "reaping-recovery-speed";
  if (stat.startsWith("additional-")) stat = stat.slice("additional-".length);
  if (stat === "attack-speed" || stat === "cast-speed" || stat === "cooldown-recovery-speed") {
    return [`skill-${stat}`];
  }
  if (stat === "mobility-skill-attack-speed") return ["skill-attack-speed"];
  if (stat === "attack-and-cast-speed") return ["skill-attack-speed", "skill-cast-speed"];
  if (stat === "minion-attack-and-cast-speed") return ["minion-attack-speed", "minion-cast-speed"];
  if (stat === "critical-rating") return ["skill-critical-strike-rating"];
  if (stat === "minion-critical-rating") return ["minion-critical-strike-rating"];
  if (stat === "critical-damage") return ["skill-critical-strike-damage"];
  if (stat === "melee-attack-critical-damage") return ["skill-critical-strike-damage"];
  if (stat === "minion-critical-damage") return ["minion-critical-strike-damage"];
  if (stat === "double-damage-chance") return ["skill-double-damage-chance"];
  if (stat === "persistent-damage") return ["skill-damage-over-time"];
  if (stat.startsWith("attack-and-spell-")) {
    const suffix = stat.slice("attack-and-spell-".length);
    return [`attack-${suffix}`, `spell-${suffix}`];
  }
  return [stat];
}

function canonicalExternalOperation(value) {
  if (["increase", "increased", "add-percent", "add_percent"].includes(value)) return "add";
  if (["more", "additional", "more-percent", "more_percent"].includes(value)) return "more";
  return value;
}

function externalRuntimeStatSupported(stat) {
  return stat === "attack-triple-damage-chance"
    || stat === "attack-horizontal-projectile-damage"
    || stat === "combo-skill-damage"
    || stat === "damage-lucky"
    || stat === "affliction-effect"
    || stat === "affliction-inflicted-per-second"
    || stat === "critical-hit-damage"
    || /^(?:skill|supported-skill|minion)-critical-strike-damage$/u.test(stat)
    || /^(?:skill|supported-skill|minion)-double-damage-chance$/u.test(stat)
    || stat === "reaping-duration"
    || stat === "effect-cooldown"
    || stat === "reaping-repeat-chance"
    || stat === "reaping-recovery-speed"
    || stat === "skill-elemental-resistance-penetration"
    || /^(?:skill|supported-skill|minion)-armor-damage-mitigation-penetration$/u.test(stat)
    || /^(?:skill|supported-skill|minion)-max-spell-burst$/u.test(stat)
    || /^(?:(?:supported-)?skill-|minion-)?(?:damage|minimum-damage|maximum-damage|hit-damage|damage-over-time|attack-damage|spell-damage|projectile-damage|area-damage|melee-damage|physical-damage|fire-damage|cold-damage|lightning-damage|erosion-damage|elemental-damage|attack-speed|cast-speed|cooldown-recovery-speed|critical-strike-rating|projectile-quantity)$/u.test(stat)
    || /^(?:skill|supported-skill|minion)-(?:physical|fire|cold|lightning|erosion)-damage-conversion$/u.test(stat)
    || /^skill-(?:physical|non-erosion)-damage-as-(?:fire|cold|lightning|erosion)$/u.test(stat);
}

function effectScopeMatches(effect, context) {
  const scope = effect?.scope;
  if (!scope || typeof scope !== "object") return true;
  if (scope.actor === "minion" && context.target !== "minion") return false;
  if (["self", "owner"].includes(scope.actor) && context.target === "minion") return false;
  const skillTypes = Array.isArray(scope.skillTypes) ? scope.skillTypes : ["all"];
  const skillTypeMatches = skillTypes.includes("all")
    || (context.attack && skillTypes.includes("attack"))
    || (context.spell && skillTypes.includes("spell"));
  if (!skillTypeMatches) return false;
  const skillTags = Array.isArray(scope.skillTags) ? scope.skillTags : [];
  return skillTags.length === 0 || skillTags.every((tag) => context.tags?.has(tag));
}

function effectEquipmentMatches(effect, context) {
  const requirements = effect?.equipmentRequirements;
  if (!requirements || typeof requirements !== "object") return true;
  const weaponTags = Array.isArray(requirements.weaponTags) ? requirements.weaponTags : [];
  return weaponTags.length === 0 || weaponTags.every((tag) => context.weaponTags?.has(tag));
}

function normalizeExternalEffects(input, context) {
  const effects = [];
  const metadata = [];
  const excluded = [];
  const blockers = [];
  for (const [inputIndex, raw] of (Array.isArray(input) ? input : []).entries()) {
    const effect = raw?.effect && typeof raw.effect === "object" ? raw.effect : raw;
    const sourceId = raw?.sourceId
      ?? effect?.sourceId
      ?? effect?.sourceItemId
      ?? effect?.flatCatalogItemId
      ?? effect?.projectionEntryId
      ?? null;
    const sourceKind = raw?.sourceKind ?? effect?.sourceKind ?? "external";
    if (effect?.skillDamageApplicability === "configuration-only") {
      excluded.push({
        sourceId,
        sourceKind,
        inputIndex,
        sourceText: effect?.sourceText ?? "",
        stat: effect?.stat ?? null,
        operation: effect?.operation ?? null,
        reason: "external-configuration-only-effect",
        affectsCompletion: false,
      });
      continue;
    }
    if (!effectScopeMatches(effect, context)) {
      excluded.push({
        sourceId,
        sourceKind,
        inputIndex,
        sourceText: effect?.sourceText ?? "",
        reason: "external-effect-scope-not-applicable",
        affectsCompletion: false,
      });
      continue;
    }
    if (!effectEquipmentMatches(effect, context)) {
      excluded.push({
        sourceId,
        sourceKind,
        inputIndex,
        sourceText: effect?.sourceText ?? "",
        reason: "external-effect-equipment-not-applicable",
        affectsCompletion: false,
      });
      continue;
    }
    const operation = canonicalExternalOperation(effect?.operation);
    const stats = canonicalExternalStat(effect?.stat);
    const supportedStats = stats.filter(externalRuntimeStatSupported);
    if (!supportedStats.length) {
      if (OFFENSIVE_TEXT.test(String(effect?.sourceText ?? effect?.stat ?? ""))) {
        blockers.push({
          sourceId,
          sourceKind,
          inputIndex,
          sourceText: effect?.sourceText ?? "",
          stat: effect?.stat ?? null,
          operation: effect?.operation ?? null,
          reason: "external-offensive-effect-runtime-unavailable",
          affectsCompletion: true,
        });
      } else {
        excluded.push({
          sourceId,
          sourceKind,
          inputIndex,
          sourceText: effect?.sourceText ?? "",
          stat: effect?.stat ?? null,
          operation: effect?.operation ?? null,
          reason: "external-effect-not-applicable-to-skill-damage",
          affectsCompletion: false,
        });
      }
      continue;
    }
    for (const stat of supportedStats) {
      effects.push({ ...effect, stat, operation });
      metadata.push({
        sourceId,
        sourceKind,
        sourceUrl: raw?.sourceUrl ?? effect?.sourceUrl,
        sourceRecordKey: raw?.sourceRecordKey ?? effect?.sourceRecordKey,
        externalInputIndex: inputIndex,
      });
    }
  }
  return { effects, metadata, excluded, blockers };
}

function exactTags(item) {
  for (const localeKey of ["en", "ko", "cn"]) {
    const locale = item?.tlidbText?.[localeKey];
    if (
      locale?.sourcePageVersion === "SS13"
      && locale?.sourceSeasonEvidence?.verificationComplete === true
      && locale?.sourceFieldStatus?.tags === "exact"
      && Array.isArray(locale.tags)
    ) return locale.tags;
  }
  return [];
}

function normalizedTags(item) {
  return new Set([
    ...exactTags(item),
    ...(item?.skillProfile?.tags ?? []),
    ...(item?.tags ?? []),
  ].map((tag) => String(tag).trim().toLowerCase()));
}

function isWeapon(item, slotIndex) {
  if (!item || ![0, 1].includes(slotIndex)) return false;
  const tags = new Set(item.tags ?? []);
  if (slotIndex === 0) return tags.has("mainHand");
  return tags.has("oneHand");
}

function authorityEffects(record, level = 20) {
  if (Array.isArray(record?.effects)) return record.effects;
  return getTlidbCalculationAuthority(record?.item, { level })?.parsedEffects ?? [];
}

function mergedRollValues(gear, supports) {
  return Object.assign(
    {},
    ...gear.map((record) => record?.rolls ?? {}),
    ...supports.map((record) => record?.config?.effectRollOverrides ?? {}),
  );
}

function gearEffectRecords(gear) {
  return gear.map((record) => ({
    ...record,
    effects: authorityEffects(record),
  }));
}

function gearContext(records, weaponRecord, input, requirements = false) {
  const weaponEffects = weaponRecord?.effects ?? [];
  const weaponSlot = weaponRecord?.slotIndex === 0 ? "main" : weaponRecord?.slotIndex === 1 ? "off" : "";
  const weaponLocalEffects = (Array.isArray(input.weaponExternalEffects)
    ? input.weaponExternalEffects
    : []).filter((effect) => effect?.weaponSlot === weaponSlot).map((effect) => ({
      ...effect,
      sourceId: effect.sourceId
        ?? effect.sourceItemId
        ?? effect.flatCatalogItemId
        ?? effect.projectionEntryId
        ?? null,
      operation: effect.operation === "increase" ? "add_percent" : effect.operation,
    }));
  const externalEffects = records
    .filter((record) => record !== weaponRecord)
    .flatMap((record) => record.effects)
    .concat(weaponLocalEffects);
  return buildTlidbGearCombatContext({
    weaponEffects,
    externalEffects,
    rollValues: input.rollValues,
    conditionValues: input.gearConditionValues,
    requirements,
  });
}

function parserBlockerAffectsDps(blocker, conditions) {
  if (blocker?.skillDamageApplicability === "affects-dps") return true;
  if (blocker?.skillDamageApplicability === "configuration-only") return false;
  const sourceText = String(blocker?.sourceText ?? "");
  if (
    !sourceText
    || SNAPSHOT_ONLY_TEXT.test(sourceText)
    || SUPPORT_COMPATIBILITY_TEXT.test(sourceText.trim())
  ) return false;
  if (
    /Demolisher Charge|buff/iu.test(sourceText)
    && Object.hasOwn(resolveConditionValues(conditions).heroStacks, "bonus")
  ) return false;
  if (/\bDamage Taken\b/iu.test(sourceText) && !/\bEnemies?|Targets?\b/iu.test(sourceText)) {
    return false;
  }
  if ([
    "range-value-requires-selected-roll",
    "requested-level-value-unavailable",
    "conditional-input-mapping-unavailable",
  ].includes(blocker?.reason)) return true;
  return OFFENSIVE_TEXT.test(sourceText);
}

function sourceEffects(item, level, sourceKind) {
  const authority = getTlidbCalculationAuthority(item, { level });
  if (!authority) return null;
  const conditionAuthority = sourceKind === "support"
    ? getSupportConditionAuthority(item)
    : { status: "unmapped", rule: null };
  const conditionRequirements = conditionAuthority.status === "verified"
    ? conditionAuthority.rule.conditionRequirements
    : [];
  const effects = authority.parsedEffects.map((effect) => {
    if (!conditionRequirements.length || !potentialSupportDamageEffect(effect)) return { ...effect };
    return {
      ...effect,
      conditionRequirements: [
        ...(effect.conditionRequirements ?? []),
        ...conditionRequirements,
      ],
    };
  });
  return {
    authority,
    effects,
    metadata: authority.parsedEffects.map(() => ({
      sourceId: item.id,
      sourceKind,
      sourceUrl: authority.sourceUrl,
      sourceRecordKey: authority.sourceRecordKey,
    })),
    conditionBlockers: conditionAuthority.status === "evidence-mismatch"
      ? [{
          sourceId: item.id,
          reason: "support-condition-authority-evidence-mismatch",
          affectsCompletion: true,
        }]
      : [],
  };
}

function potentialSupportDamageEffect(effect) {
  const stat = String(effect?.stat ?? "");
  return stat.includes("damage")
    || /(?:attack|cast)-speed$/u.test(stat)
    || /cooldown-recovery-speed$/u.test(stat)
    || /projectile-quantity$/u.test(stat);
}

function decorateTrace(entries, metadata) {
  return entries.map((entry) => ({
    ...entry,
    ...(Number.isInteger(entry.inputIndex) ? metadata[entry.inputIndex] : {}),
  }));
}

function averaged(values, path) {
  const numbers = values.map((value) => path(value)).filter(Number.isFinite);
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
}

function commonNumericValue(values, path) {
  const numbers = values.map((value) => path(value));
  if (!numbers.every(Number.isFinite)) return null;
  return numbers.every((value) => value === numbers[0]) ? numbers[0] : null;
}

function combineEvaluations(evaluations) {
  if (evaluations.length === 1) {
    const evaluation = evaluations[0];
    return {
      ...evaluation,
      rawDps: evaluation.totalDps,
      dps: evaluation.expectedTotalDps,
    };
  }
  const complete = evaluations.every((evaluation) => evaluation.complete);
  const first = evaluations[0];
  const damageStageKeys = Object.keys(first.damageStages ?? {});
  const damageStages = Object.fromEntries(damageStageKeys.map((key) => {
    const values = evaluations
      .map((entry) => entry.damageStages?.[key])
      .filter(Number.isFinite);
    return [key, values.length === evaluations.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null];
  }));
  const reaping = first.reaping ? {
    ...first.reaping,
    baseDotDps: averaged(evaluations, (entry) => entry.reaping?.baseDotDps),
    damagePerEvent: averaged(evaluations, (entry) => entry.reaping?.damagePerEvent),
    baseDps: averaged(evaluations, (entry) => entry.reaping?.baseDps ?? entry.reaping?.dps),
    dps: averaged(evaluations, (entry) => entry.reaping?.dps),
  } : null;
  const weaponCritical = evaluations.map((entry) => entry.critical);
  const criticalInputDps = Number.isFinite(damageStages.hitAfterLuckyDps)
    ? damageStages.hitAfterLuckyDps
    : damageStages.hitDps;
  const critical = {
    ...first.critical,
    rating: commonNumericValue(evaluations, (entry) => entry.critical?.rating),
    chance: commonNumericValue(evaluations, (entry) => entry.critical?.chance),
    damage: commonNumericValue(evaluations, (entry) => entry.critical?.damage),
    expectedMultiplier: criticalInputDps > 0
      ? damageStages.hitAfterCriticalDps / criticalInputDps
      : 1,
  };
  const luckyDamage = first.luckyDamage ? {
    ...first.luckyDamage,
    ordinaryHitDps: averaged(evaluations, (entry) => entry.luckyDamage?.ordinaryHitDps),
    expectedHitDps: averaged(evaluations, (entry) => entry.luckyDamage?.expectedHitDps),
    expectedMultiplier: damageStages.hitDps > 0
      ? damageStages.hitAfterLuckyDps / damageStages.hitDps
      : 1,
  } : null;
  return {
    complete,
    rawDps: complete ? averaged(evaluations, (entry) => entry.totalDps) : null,
    dps: complete ? averaged(evaluations, (entry) => entry.expectedTotalDps) : null,
    hit: {
      ...first.hit,
      min: averaged(evaluations, (entry) => entry.hit.min),
      max: averaged(evaluations, (entry) => entry.hit.max),
      average: averaged(evaluations, (entry) => entry.hit.average),
      dpsMin: averaged(evaluations, (entry) => entry.hit.dpsMin),
      dpsMax: averaged(evaluations, (entry) => entry.hit.dpsMax),
      dps: averaged(evaluations, (entry) => entry.hit.dps),
    },
    dot: {
      ...first.dot,
      min: averaged(evaluations, (entry) => entry.dot.min),
      max: averaged(evaluations, (entry) => entry.dot.max),
      average: averaged(evaluations, (entry) => entry.dot.average),
      dps: averaged(evaluations, (entry) => entry.dot.dps),
    },
    critical,
    luckyDamage,
    weaponCritical,
    reaping,
    damageStages,
    applied: evaluations.flatMap((entry) => entry.applied),
    excluded: evaluations.flatMap((entry) => entry.excluded),
  };
}

function runtimeStats(input = {}) {
  return {
    ...input,
    life: Number(input.life) || 0,
    mana: Number(input.mana) || 0,
    movementSpeed: Number(input.movementSpeed ?? input.movementSpeedBonus) || 0,
    projectileQuantity: Number(input.projectileQuantity ?? input.projectileCount) || 0,
    attackSpeed: Number(input.attackSpeed ?? input.speed) || 0,
    castSpeed: Number(input.castSpeed ?? input.speed) || 0,
  };
}

function conditionStateWithNumericDefaults(input, effects) {
  const state = normalizeConditionState(input);
  for (const effect of effects) {
    const match = String(effect?.per?.path ?? "").match(/^(charges|blessings|heroStacks)\.([^.]+)$/u);
    if (!match) continue;
    const [, group, key] = match;
    if (!Object.hasOwn(state.automatic[group], key) && !Object.hasOwn(state.overrides[group] ?? {}, key)) {
      state.automatic[group][key] = 0;
    }
  }
  return state;
}

function hasBaseDamageEffect(effects) {
  return effects.some(({ stat }) => (
    stat === "weapon-attack-damage-coefficient"
    || /^(?:attack|spell)-(?:physical|fire|cold|lightning|erosion)-(?:base-damage-coefficient|damage(?:-min|-max)?)$/u.test(stat)
    || /^(?:persistent|spell)-(?:physical|fire|cold|lightning|erosion)-(?:base-)?damage-per-second$/u.test(stat)
  ));
}

/**
 * Evaluates one selected skill row only when every offensive TLIDB input used by
 * the row is sourced or explicitly configured. Partial numeric results remain
 * available in `evaluations` for diagnostics but never become row DPS.
 */
export function evaluateTlidbBuildSkillRow(input = {}) {
  const skill = input.skill;
  const level = Math.max(1, Math.round(Number(input.level) || 1));
  const conditions = input.conditions;
  const supports = Array.isArray(input.supports) ? input.supports : [];
  const gear = gearEffectRecords(Array.isArray(input.gear) ? input.gear : []);
  const primary = sourceEffects(skill, level, "skill");
  const manualExcluded = [];
  const blockers = [];

  if (!primary) {
    return {
      status: "authority-unavailable",
      complete: false,
      dps: null,
      rawDps: null,
      linkedSupports: 0,
      weaponContexts: [],
      applied: [],
      excluded: [],
      blockers: [{ reason: "skill-calculation-authority-unavailable", sourceId: skill?.id ?? null }],
      evaluations: [],
    };
  }

  const effects = [...primary.effects];
  const metadata = [...primary.metadata];
  for (const blocker of primary.authority.parserBlockers ?? []) {
    if (parserBlockerAffectsDps(blocker, conditions)) {
      blockers.push({ ...blocker, sourceId: skill.id, affectsCompletion: true });
    }
  }

  let linkedSupports = 0;
  for (const support of supports) {
    if (!support?.item) continue;
    if (support.compatible === false) {
      manualExcluded.push({
        sourceId: support.item.id,
        sourceKind: "support",
        reason: "incompatible-support",
        affectsCompletion: false,
      });
      continue;
    }
    const parsed = sourceEffects(support.item, support.level ?? level, "support");
    if (!parsed) {
      blockers.push({
        sourceId: support.item.id,
        reason: "support-calculation-authority-unavailable",
        affectsCompletion: true,
      });
      continue;
    }
    linkedSupports += 1;
    effects.push(...parsed.effects);
    metadata.push(...parsed.metadata);
    blockers.push(...parsed.conditionBlockers);
    for (const blocker of parsed.authority.parserBlockers ?? []) {
      if (parserBlockerAffectsDps(blocker, conditions)) {
        blockers.push({ ...blocker, sourceId: support.item.id, affectsCompletion: true });
      }
    }
  }

  const tags = normalizedTags(skill);
  const attack = tags.has("attack") || effects.some(({ stat }) => (
    stat === "weapon-attack-damage-coefficient" || stat.startsWith("attack-")
  ));
  const spell = tags.has("spell") || effects.some(({ stat }) => stat.startsWith("spell-"));
  const target = tags.has("minion") || tags.has("summon") ? "minion" : "self";
  const weaponTags = new Set(gear
    .filter((record) => isWeapon(record.item, record.slotIndex))
    .flatMap((record) => record.item.tags ?? []));
  const external = normalizeExternalEffects(input.externalEffects, {
    attack,
    spell,
    target,
    tags,
    weaponTags,
  });
  effects.push(...external.effects);
  metadata.push(...external.metadata);
  manualExcluded.push(...external.excluded);
  blockers.push(...external.blockers);
  for (const blocker of Array.isArray(input.externalBlockers) ? input.externalBlockers : []) {
    if (blocker?.skillDamageApplicability === "configuration-only") continue;
    if (!effectScopeMatches(blocker, { attack, spell, target, tags, weaponTags })) continue;
    if (!effectEquipmentMatches(blocker, { weaponTags })) continue;
    if (!parserBlockerAffectsDps(blocker, conditions)) continue;
    blockers.push({ ...blocker, affectsCompletion: true });
  }
  if (!hasBaseDamageEffect(effects)) {
    blockers.push({
      sourceId: skill.id,
      reason: "skill-base-damage-effect-unavailable",
      affectsCompletion: true,
    });
  }

  const rollValues = mergedRollValues(gear, supports);
  const resolvedConditions = conditionStateWithNumericDefaults(conditions, effects);
  const resolvedConditionValues = resolveConditionValues(resolvedConditions);
  const gearInput = {
    rollValues,
    gearConditionValues: input.gearConditionValues ?? {},
    weaponExternalEffects: input.weaponExternalEffects ?? [],
  };
  const main = gear.find((record) => record.slotIndex === 0 && isWeapon(record.item, 0));
  const off = gear.find((record) => record.slotIndex === 1 && isWeapon(record.item, 1));
  const weaponContexts = attack
    ? [main, off].filter(Boolean).map((record) => gearContext(gear, record, gearInput, false))
    : [gearContext(gear, null, gearInput, false)];
  if (attack && !weaponContexts.length) weaponContexts.push(gearContext(gear, null, gearInput, false));

  const dualAttackSpeed = attack && weaponContexts.length === 2
    && weaponContexts.every(({ attackSpeed }) => Number.isFinite(attackSpeed) && attackSpeed > 0)
    ? (weaponContexts[0].attackSpeed + weaponContexts[1].attackSpeed) / 2
    : null;
  const stats = runtimeStats(input.stats);
  const criticalStrikeDamage = Number.isFinite(Number(input.criticalStrikeDamage))
    ? Number(input.criticalStrikeDamage)
    : 150 + (Number(stats.critDamage) || 0);
  const globalCriticalStrikeRating = (Number(stats.crit) || 0) * 100;
  const hasExplicitSpellCriticalStrikeRating = Number.isFinite(Number(input.spellCriticalStrikeRating));
  const spellBaseCriticalStrikeRating = hasExplicitSpellCriticalStrikeRating
    ? Number(input.spellCriticalStrikeRating)
    : 500;

  const evaluations = weaponContexts.map((weaponContext) => {
    const context = {
      conditions: resolvedConditions,
      stats,
      rollValues,
      addedDamage: attack
        ? weaponContext.addedAttackDamage ?? 0
        : spell
          ? weaponContext.addedSpellDamage ?? 0
          : 0,
      ...(attack ? {
        weaponDamage: weaponContext.weaponDamage,
        attackTime: dualAttackSpeed ? 1 / dualAttackSpeed : weaponContext.attackTime,
        attackSpeedIncrease: (Number(stats.speed) || 0) + (Number(stats.attackSpeedIncrease) || 0),
        criticalStrikeRating: Number.isFinite(weaponContext.criticalStrikeRating)
          ? weaponContext.criticalStrikeRating < 0
            ? weaponContext.criticalStrikeRating
            : Math.max(0, weaponContext.criticalStrikeRating + globalCriticalStrikeRating)
          : weaponContext.criticalStrikeRating,
        criticalStrikeDamage,
      } : {}),
      ...(spell ? {
        castSpeedIncrease: (Number(stats.speed) || 0) + (Number(stats.castSpeedIncrease) || 0),
        criticalStrikeRating: hasExplicitSpellCriticalStrikeRating && spellBaseCriticalStrikeRating < 0
          ? spellBaseCriticalStrikeRating
          : Math.max(0, spellBaseCriticalStrikeRating + globalCriticalStrikeRating),
        criticalStrikeDamage,
      } : {}),
      doubleDamageChance: Number(stats.doubleDamageChance) || 0,
      ...((Number(stats.elementalAndErosionResistancePenetration) || 0) > 0 ? {
        resistancePenetration: Number(stats.elementalAndErosionResistancePenetration),
      } : {}),
      ...((Number(stats.armorDamageMitigationPenetration) || 0) > 0 ? {
        armorDamageMitigationPenetration: Number(stats.armorDamageMitigationPenetration),
      } : {}),
      enemyArmor: Number(resolvedConditionValues.enemy?.armor) || 0,
      enemyResistances: { ...(resolvedConditionValues.enemy?.resistances ?? {}) },
      enemyAffliction: Number(resolvedConditionValues.enemy?.affliction) || 0,
      damageTags: target === "self" ? [...tags] : [],
      ...((Number(resolvedConditionValues.reaping?.durationSeconds) || 0) > 0
        || (Number(resolvedConditionValues.reaping?.eventsPerSecond) || 0) > 0 ? {
        reapingDurationSeconds: Number(resolvedConditionValues.reaping?.durationSeconds) || 0,
        reapingEventsPerSecond: Number(resolvedConditionValues.reaping?.eventsPerSecond) || 0,
      } : {}),
      ...(input.runtimeContext && typeof input.runtimeContext === "object" ? input.runtimeContext : {}),
      target,
    };
    const evaluation = evaluateTlidbSkillDamage({ effects, level, context });
    return {
      ...evaluation,
      applied: decorateTrace(evaluation.applied, metadata),
      excluded: decorateTrace(evaluation.excluded, metadata),
    };
  });
  const combined = combineEvaluations(evaluations);
  blockers.push(...evaluations.flatMap((evaluation) => (
    evaluation.excluded.filter(({ affectsCompletion }) => affectsCompletion)
  )));
  blockers.push(...weaponContexts.flatMap(({ blockers: entries }) => entries));
  const complete = combined.complete && blockers.length === 0;
  const weaponExternalApplied = weaponContexts.flatMap(({ applied: entries }) => (
    entries.filter(({ scope, sourceId }) => scope === "external" && sourceId)
  ));
  const damageStages = combined.damageStages ? {
    ...combined.damageStages,
    ...(!complete ? { totalDps: null, expectedTotalDps: null } : {}),
  } : null;

  return {
    status: complete ? "complete" : "blocked",
    complete,
    dps: complete ? combined.dps : null,
    rawDps: complete ? combined.rawDps : null,
    hit: combined.hit,
    dot: combined.dot,
    critical: combined.critical,
    luckyDamage: combined.luckyDamage ?? null,
    weaponCritical: combined.weaponCritical ?? [combined.critical],
    doubleDamage: evaluations[0]?.doubleDamage ?? null,
    tripleDamage: evaluations[0]?.tripleDamage ?? null,
    spellBurst: evaluations[0]?.spellBurst ?? null,
    enemyArmor: evaluations[0]?.enemyArmor ?? null,
    enemyResistances: evaluations[0]?.enemyResistances ?? null,
    affliction: evaluations[0]?.affliction ?? null,
    reaping: combined.reaping ?? null,
    damageStages,
    linkedSupports,
    weaponContexts,
    applied: [...combined.applied, ...weaponExternalApplied],
    excluded: [...combined.excluded, ...manualExcluded],
    blockers,
    evaluations,
  };
}
