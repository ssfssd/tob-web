import { mapTlidbTooltipEffect } from "./tlidbTooltipStatMapping.js";
import { tlidbGearCraftRollFieldKey } from "./tlidbGearCraftTooltipCalculation.js";

const CURRENT_SOURCE_AUTHORITY = "exact-current-tlidb-active-gear-stable-tier-and-roll-alias";
const TIER_SEPARATOR = "\u0000";

function tierKey(affixId, tierId) {
  return `${affixId}${TIER_SEPARATOR}${tierId}`;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCurrentCalculation(calculation) {
  return calculation?.audit?.season === "SS13"
    && calculation.audit.sourceAuthority === CURRENT_SOURCE_AUTHORITY
    && calculation.audit.accountingComplete === true
    && Array.isArray(calculation.effects)
    && Array.isArray(calculation.blockers);
}

function combatEffect(effect) {
  const stat = String(effect?.stat ?? "");
  return /^(?:gear|main_hand_weapon)_(?:physical|fire|cold|lightning|erosion|elemental)_damage(?:_(?:min|max))?$/u.test(stat)
    || /^(?:added|attack|attack_and_spell|spell)_(?:physical|fire|cold|lightning|erosion|elemental)_damage_(?:min|max)$/u.test(stat)
    || [
      "attack_speed",
      "additional_attack_speed",
      "gear_attack_speed",
      "main_hand_weapon_attack_speed",
      "critical_strike_rating",
      "attack_critical_strike_rating",
      "gear_attack_critical_strike_rating",
    ].includes(stat);
}

export function isTlidbGearCraftCombatEffect(effect) {
  return combatEffect(effect);
}

function indexCalculation(calculation) {
  const effects = new Map();
  const blockers = new Map();
  for (const effect of calculation.effects) {
    const key = tierKey(effect?.affixId, effect?.tierId);
    const bucket = effects.get(key) ?? [];
    bucket.push(effect);
    effects.set(key, bucket);
  }
  for (const blocker of calculation.blockers) {
    const key = tierKey(blocker?.affixId, blocker?.tierId);
    const bucket = blockers.get(key) ?? [];
    bucket.push(blocker);
    blockers.set(key, bucket);
  }
  return { effects, blockers };
}

function fieldAuthorityMatches(effect, affix, tier, roll) {
  if (!effect?.sourceRecordKey || !tier?.activeLocaleAliases?.tier) return false;
  if (!roll) return true;
  const expectedKey = tlidbGearCraftRollFieldKey(affix.affixId, tier.tierId, roll.key);
  return effect.roll?.key === expectedKey
    && effect.roll?.rollKey === roll.key
    && finiteNumber(effect.roll?.min) === finiteNumber(roll.min)
    && finiteNumber(effect.roll?.max) === finiteNumber(roll.max)
    && finiteNumber(effect.roll?.precision ?? 0) === finiteNumber(roll.precision ?? 0)
    && finiteNumber(effect.roll?.step ?? 1) === finiteNumber(roll.step ?? 1)
    && Boolean(tier.activeLocaleAliases?.rolls?.[roll.key]);
}

function selectedRollValue(value, roll) {
  const selected = finiteNumber(value);
  const minimum = finiteNumber(roll?.min);
  const maximum = finiteNumber(roll?.max);
  const precision = finiteNumber(roll?.precision ?? 0);
  const step = finiteNumber(roll?.step ?? 1);
  if (selected === null) return { reason: "craft-roll-selection-invalid" };
  if (
    minimum === null
    || maximum === null
    || precision === null
    || step === null
    || minimum > maximum
    || precision < 0
    || !Number.isInteger(precision)
    || step <= 0
  ) return { reason: "craft-roll-authority-range-invalid" };
  if (selected < minimum || selected > maximum) {
    return { reason: "craft-roll-selection-out-of-range", selected, minimum, maximum };
  }

  const scale = 10 ** precision;
  const scaledSelected = selected * scale;
  const scaledMinimum = minimum * scale;
  const scaledStep = step * scale;
  const roundedSelected = Math.round(scaledSelected);
  const roundedMinimum = Math.round(scaledMinimum);
  const roundedStep = Math.round(scaledStep);
  const tolerance = 1e-7;
  if (
    !Number.isSafeInteger(roundedSelected)
    || !Number.isSafeInteger(roundedMinimum)
    || !Number.isSafeInteger(roundedStep)
    || roundedStep <= 0
    || Math.abs(scaledSelected - roundedSelected) > tolerance
    || Math.abs(scaledMinimum - roundedMinimum) > tolerance
    || Math.abs(scaledStep - roundedStep) > tolerance
    || (roundedSelected - roundedMinimum) % roundedStep !== 0
  ) {
    return { reason: "craft-roll-selection-step-mismatch", selected, precision, step };
  }
  return { value: selected };
}

function outputBlocker(reason, context = {}) {
  return Object.freeze({ reason, ...context });
}

function stableEffectId(itemId, effect, index) {
  const rollKey = effect.roll?.rollKey ?? "fixed";
  return `tlidb-craft:${itemId}:${effect.affixId}:${effect.tierId}:${rollKey}:${effect.stat}:${index}`;
}

/**
 * Resolves persisted gear craft selections against the exact-current SS13 craft IR.
 * Missing or invalid values never fall back to tier maxima.
 */
export function resolveTlidbGearCraftSelections(input = {}) {
  const item = input.item;
  const selectedCrafts = input.selectedCrafts ?? input.crafts ?? {};
  const calculation = input.calculation;
  const effects = [];
  const genericEffects = [];
  const gearCombatEffects = [];
  const blockers = [];
  const trace = [];
  const rollValues = {};

  function block(reason, context = {}) {
    const blocker = outputBlocker(reason, {
      itemId: String(item?.id ?? ""),
      ...context,
    });
    blockers.push(blocker);
    trace.push(Object.freeze({ status: "blocked", ...blocker }));
    return blocker;
  }

  if (!item || typeof item.id !== "string" || !item.id) {
    block("craft-item-invalid");
    return finish();
  }
  if (!isCurrentCalculation(calculation)) {
    block("craft-ir-authority-not-exact-current-ss13");
    return finish();
  }
  if (!isObject(selectedCrafts)) {
    block("craft-selection-config-invalid");
    return finish();
  }

  const calculationIndex = indexCalculation(calculation);
  const affixes = new Map((item.craftAffixes ?? []).map((affix) => [affix.affixId, affix]));
  const seenAffixes = new Set();

  for (const [selectionKey, config] of Object.entries(selectedCrafts)) {
    if (!isObject(config)) {
      block("craft-affix-config-invalid", { affixId: selectionKey });
      continue;
    }
    const explicitAffixId = typeof config.affixId === "string" ? config.affixId : "";
    if (explicitAffixId && explicitAffixId !== selectionKey) {
      block("craft-affix-id-mismatch", {
        affixId: selectionKey,
        configuredAffixId: explicitAffixId,
      });
      continue;
    }
    const affixId = explicitAffixId || selectionKey;
    if (seenAffixes.has(affixId)) {
      block("craft-affix-selection-duplicate", { affixId });
      continue;
    }
    seenAffixes.add(affixId);
    const affix = affixes.get(affixId);
    if (!affix) {
      block("craft-affix-not-found-on-item", { affixId });
      continue;
    }
    const tierId = typeof config.tierId === "string" ? config.tierId : "";
    if (!tierId) {
      block("craft-tier-selection-required", { affixId, tierId: "" });
      continue;
    }
    const tier = affix.tierOptions?.find((candidate) => candidate.tierId === tierId);
    if (!tier) {
      block("craft-tier-not-found-on-affix", { affixId, tierId });
      continue;
    }
    const selectedRolls = isObject(config.rolls) ? config.rolls : null;
    if (!selectedRolls) {
      block("craft-rolls-config-invalid", { affixId, tierId });
    }
    if (affix.selectionSupported === false) {
      block("craft-affix-selection-not-authorized-current-ss13", { affixId, tierId });
    }
    if (!tier.activeLocaleAliases?.tier) {
      block("craft-tier-current-authority-alias-missing", { affixId, tierId });
    }

    const rollByKey = new Map((tier.rollDefs ?? []).map((roll) => [roll.key, roll]));
    const rollResolutions = new Map();
    for (const roll of tier.rollDefs ?? []) {
      const fieldKey = tlidbGearCraftRollFieldKey(affixId, tierId, roll.key);
      if (!selectedRolls || !Object.hasOwn(selectedRolls, roll.key)) {
        block("craft-roll-selection-required", {
          affixId,
          tierId,
          rollKey: roll.key,
          fieldKey,
        });
        rollResolutions.set(roll.key, null);
        continue;
      }
      const resolution = selectedRollValue(selectedRolls[roll.key], roll);
      if (resolution.reason) {
        block(resolution.reason, {
          affixId,
          tierId,
          rollKey: roll.key,
          fieldKey,
          selectedValue: selectedRolls[roll.key],
          ...(resolution.minimum === undefined ? {} : {
            minimum: resolution.minimum,
            maximum: resolution.maximum,
          }),
          ...(resolution.precision === undefined ? {} : {
            precision: resolution.precision,
            step: resolution.step,
          }),
        });
        rollResolutions.set(roll.key, null);
        continue;
      }
      rollResolutions.set(roll.key, resolution.value);
      rollValues[fieldKey] = resolution.value;
      trace.push(Object.freeze({
        status: "selected",
        itemId: item.id,
        affixId,
        tierId,
        rollKey: roll.key,
        fieldKey,
        value: resolution.value,
      }));
    }
    if (selectedRolls) {
      for (const rollKey of Object.keys(selectedRolls)) {
        if (!rollByKey.has(rollKey)) {
          block("craft-roll-key-not-found-on-tier", { affixId, tierId, rollKey });
        }
      }
    }

    const key = tierKey(affixId, tierId);
    const tierEffects = calculationIndex.effects.get(key) ?? [];
    const tierBlockers = calculationIndex.blockers.get(key) ?? [];
    if (!tierEffects.length && !tierBlockers.length) {
      block("craft-ir-tier-unaccounted", { affixId, tierId });
      continue;
    }

    for (const irBlocker of tierBlockers) {
      const rollKey = irBlocker.rollKey ?? "";
      block(irBlocker.reason || "craft-ir-blocker-untyped", {
        stage: "craft-ir",
        affixId,
        tierId,
        sourceText: String(irBlocker.sourceText ?? ""),
        ...(rollKey ? {
          rollKey,
          fieldKey: irBlocker.fieldKey
            ?? tlidbGearCraftRollFieldKey(affixId, tierId, rollKey),
          selectedValue: selectedRolls?.[rollKey],
        } : {}),
        ...(irBlocker.details === undefined ? {} : { details: irBlocker.details }),
      });
    }

    const accountedRollKeys = new Set(tierBlockers.map(({ rollKey }) => rollKey).filter(Boolean));
    for (const [effectIndex, irEffect] of tierEffects.entries()) {
      const rollKey = irEffect.roll?.rollKey ?? "";
      const roll = rollKey ? rollByKey.get(rollKey) : null;
      if (rollKey) accountedRollKeys.add(rollKey);
      if (rollKey && !roll) {
        block("craft-ir-roll-not-found-on-tier", {
          affixId,
          tierId,
          rollKey,
          sourceText: String(irEffect.sourceText ?? ""),
        });
        continue;
      }
      if (!fieldAuthorityMatches(irEffect, affix, tier, roll)) {
        block("craft-ir-field-authority-mismatch", {
          affixId,
          tierId,
          rollKey,
          sourceText: String(irEffect.sourceText ?? ""),
        });
        continue;
      }
      let value;
      if (roll) {
        value = rollResolutions.get(roll.key);
        if (value === null || value === undefined) continue;
      } else {
        value = finiteNumber(irEffect.value);
        if (value === null) {
          block("craft-effect-numeric-value-unavailable", {
            affixId,
            tierId,
            sourceText: String(irEffect.sourceText ?? ""),
            stat: String(irEffect.stat ?? ""),
          });
          continue;
        }
      }

      const resolved = Object.freeze({
        ...irEffect,
        id: stableEffectId(item.id, irEffect, effectIndex),
        itemId: item.id,
        value,
        selectedValue: value,
      });
      effects.push(resolved);
      const combat = combatEffect(resolved);
      if (combat) gearCombatEffects.push(resolved);
      const mapped = mapTlidbTooltipEffect(resolved);
      genericEffects.push(...mapped.effects.map((effect) => Object.freeze(effect)));
      if (mapped.blocker && !combat) {
        block(mapped.blocker.reason || "craft-generic-effect-unmapped", {
          stage: "generic-effect-mapping",
          affixId,
          tierId,
          rollKey,
          sourceText: String(resolved.sourceText ?? ""),
          stat: String(resolved.stat ?? ""),
          operation: String(resolved.operation ?? ""),
        });
      }
      trace.push(Object.freeze({
        status: "applied",
        itemId: item.id,
        affixId,
        tierId,
        rollKey,
        effectId: resolved.id,
        value,
        generic: mapped.effects.length > 0,
        gearCombat: combat,
      }));
    }

    for (const roll of tier.rollDefs ?? []) {
      if (!accountedRollKeys.has(roll.key)) {
        block("craft-ir-roll-unaccounted", {
          affixId,
          tierId,
          rollKey: roll.key,
          fieldKey: tlidbGearCraftRollFieldKey(affixId, tierId, roll.key),
        });
      }
    }
  }

  return finish();

  function finish() {
    return Object.freeze({
      complete: blockers.length === 0,
      itemId: String(item?.id ?? ""),
      effects: Object.freeze(effects),
      genericEffects: Object.freeze(genericEffects),
      gearCombatEffects: Object.freeze(gearCombatEffects),
      rollValues: Object.freeze({ ...rollValues }),
      blockers: Object.freeze(blockers),
      trace: Object.freeze(trace),
      audit: Object.freeze({
        selectedAffixes: isObject(selectedCrafts) ? Object.keys(selectedCrafts).length : 0,
        selectedRolls: Object.keys(rollValues).length,
        effects: effects.length,
        genericEffects: genericEffects.length,
        gearCombatEffects: gearCombatEffects.length,
        blockers: blockers.length,
        accountingComplete: trace.length === effects.length + Object.keys(rollValues).length + blockers.length,
      }),
    });
  }
}

export const resolveTlidbGearCraftSelection = resolveTlidbGearCraftSelections;
