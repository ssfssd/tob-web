const DAMAGE_TYPES = Object.freeze(["physical", "fire", "cold", "lightning", "erosion"]);
const ELEMENTAL_DAMAGE_TYPES = new Set(["fire", "cold", "lightning"]);

const DEFAULT_REQUIREMENTS = Object.freeze({
  weaponDamage: true,
  attackTime: true,
  criticalStrikeRating: true,
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rounded(value) {
  if (!Number.isFinite(value)) return value;
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12;
}

function normalizedEffects(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.effects)) return value.effects;
  return [];
}

function conditionSelectionKey(effect) {
  return effect?.conditionKey
    ?? effect?.id
    ?? (typeof effect?.sourceText === "string" && effect.sourceText ? effect.sourceText : null);
}

export function getTlidbGearConditionSelectionKey(effect) {
  return conditionSelectionKey(effect);
}

function classifyEffect(effect, scope) {
  const stat = String(effect?.stat ?? "");
  let match = stat.match(/^gear_(physical|fire|cold|lightning|erosion|elemental)_damage_(min|max)$/u);
  if (match) {
    return scope === "weapon"
      ? { kind: "weapon-damage-bound", type: match[1], bound: match[2] }
      : { kind: "not-applicable", reason: "tlidb-local-stat-belongs-to-other-gear" };
  }

  match = stat.match(/^(?:main|off)_hand_weapon_(physical|fire|cold|lightning|erosion|elemental)_damage_(min|max)$/u);
  if (match) return { kind: "weapon-damage-bound", type: match[1], bound: match[2] };

  match = stat.match(/^gear_(physical|fire|cold|lightning|erosion|elemental)_damage$/u);
  if (match) {
    return scope === "weapon"
      ? { kind: "weapon-damage-modifier", type: match[1] }
      : { kind: "not-applicable", reason: "tlidb-local-stat-belongs-to-other-gear" };
  }

  match = stat.match(/^(added|attack|attack_and_spell|spell)_(physical|fire|cold|lightning|erosion|elemental)_damage_(min|max)$/u);
  if (match) {
    return {
      kind: "added-damage-bound",
      target: match[1],
      type: match[2],
      bound: match[3],
    };
  }

  if (stat === "attack_speed" && effect?.operation === "set") {
    return { kind: "attack-speed-set", fixed: /\bfixed\b/iu.test(effect?.sourceText ?? "") };
  }
  if (stat === "gear_attack_speed") {
    return scope === "weapon" || effect?.operation === "set"
      ? { kind: effect?.operation === "set" ? "attack-speed-set" : "attack-speed-modifier", fixed: true }
      : { kind: "not-applicable", reason: "tlidb-local-stat-belongs-to-other-gear" };
  }
  if (stat === "main_hand_weapon_attack_speed") return { kind: "attack-speed-modifier" };
  if (stat === "attack_speed" || stat === "additional_attack_speed") {
    return { kind: "attack-speed-modifier" };
  }

  if (stat === "critical_strike_rating" && effect?.operation === "set") {
    return { kind: "critical-rating-set", fixed: /\bfixed\b/iu.test(effect?.sourceText ?? "") };
  }
  if ([
    "critical_strike_rating",
    "attack_critical_strike_rating",
    "gear_attack_critical_strike_rating",
    "main_hand_weapon_critical_strike_rating",
    "off_hand_weapon_critical_strike_rating",
  ].includes(stat)) {
    if (stat === "gear_attack_critical_strike_rating" && scope !== "weapon") {
      return { kind: "not-applicable", reason: "tlidb-local-stat-belongs-to-other-gear" };
    }
    return { kind: "critical-rating-modifier" };
  }

  return { kind: "not-applicable", reason: "tlidb-gear-combat-stat-not-applicable" };
}

function emptyBounds() {
  return { min: { set: [], add: [] }, max: { set: [], add: [] } };
}

function emptyModifier() {
  return { increase: 0, more: 1 };
}

function traceBase(reference, effect) {
  return {
    scope: reference.scope,
    inputIndex: reference.inputIndex,
    stat: effect?.stat ?? null,
    operation: effect?.operation ?? null,
    sourceText: effect?.sourceText ?? "",
    ...(effect?.sourceId ? { sourceId: effect.sourceId } : {}),
  };
}

function uniqueNumbers(values) {
  return [...new Set(values.map(({ value }) => value))];
}

function pairRange(entries, label, block) {
  const values = {};
  let present = false;
  let invalid = false;
  for (const bound of ["min", "max"]) {
    const bucket = entries[bound];
    const setValues = uniqueNumbers(bucket.set);
    if (setValues.length > 1) {
      block("tlidb-gear-set-value-ambiguous", {
        stage: label,
        bound,
        values: setValues,
      });
      invalid = true;
      continue;
    }
    if (bucket.set.length || bucket.add.length) present = true;
    values[bound] = (setValues[0] ?? 0) + bucket.add.reduce((sum, entry) => sum + entry.value, 0);
  }
  if (!present) return null;
  if (invalid) return null;
  const minPresent = entries.min.set.length || entries.min.add.length;
  const maxPresent = entries.max.set.length || entries.max.add.length;
  if (!minPresent || !maxPresent) {
    block("tlidb-gear-damage-range-incomplete", { stage: label });
    return null;
  }
  if (values.min > values.max) {
    block("tlidb-gear-damage-range-invalid", { stage: label, ...values });
    return null;
  }
  return { min: values.min, max: values.max };
}

function damagePoolFromBounds(boundsByType, modifiersByType, block) {
  const pool = {};
  for (const type of DAMAGE_TYPES) {
    const raw = pairRange(boundsByType[type], `weapon-${type}-damage`, block);
    if (!raw) continue;
    const typed = modifiersByType[type];
    const elemental = ELEMENTAL_DAMAGE_TYPES.has(type) ? modifiersByType.elemental : emptyModifier();
    const increase = typed.increase + elemental.increase;
    const more = typed.more * elemental.more;
    const factor = (1 + (increase / 100)) * more;
    if (!Number.isFinite(factor) || factor < 0) {
      block("tlidb-gear-damage-modifier-result-invalid", {
        stage: `weapon-${type}-damage`,
        increase,
        more,
      });
      continue;
    }
    pool[type] = {
      min: rounded(raw.min * factor),
      max: rounded(raw.max * factor),
    };
  }
  return Object.keys(pool).length ? pool : null;
}

function addedDamagePool(entriesByType, label, block) {
  const pool = {};
  for (const type of DAMAGE_TYPES) {
    const values = pairRange(entriesByType[type], `${label}-${type}`, block);
    if (values) pool[type] = { min: rounded(values.min), max: rounded(values.max) };
  }
  return Object.keys(pool).length ? pool : null;
}

function resolveSet(entries, label, block) {
  const fixed = uniqueNumbers(entries.filter((entry) => entry.fixed));
  const base = uniqueNumbers(entries.filter((entry) => !entry.fixed));
  if (fixed.length > 1 || (!fixed.length && base.length > 1)) {
    block("tlidb-gear-set-value-ambiguous", {
      stage: label,
      values: fixed.length ? fixed : base,
    });
    return null;
  }
  return fixed[0] ?? base[0] ?? null;
}

function requirementFlags(value) {
  if (value === false) return { weaponDamage: false, attackTime: false, criticalStrikeRating: false };
  return { ...DEFAULT_REQUIREMENTS, ...(value && typeof value === "object" ? value : {}) };
}

/**
 * Builds the exact gear-owned combat inputs consumed by the TLIDB skill runtime.
 * Ranged rolls and conditional effects are applied only after an explicit selection.
 */
export function buildTlidbGearCombatContext(input = {}) {
  const weaponEffects = normalizedEffects(input.weaponEffects ?? input.weapon);
  const externalEffects = normalizedEffects(input.externalEffects ?? input.external);
  const rollValues = input.rollValues && typeof input.rollValues === "object" ? input.rollValues : {};
  const conditionValues = input.conditionValues && typeof input.conditionValues === "object"
    ? input.conditionValues
    : {};
  const requirements = requirementFlags(input.requirements);
  const applied = [];
  const excluded = [];
  const blockers = [];

  function exclude(reference, effect, reason, affectsCompletion, details = {}) {
    const entry = {
      ...traceBase(reference, effect),
      applied: false,
      reason,
      affectsCompletion,
      ...details,
    };
    excluded.push(entry);
    if (affectsCompletion) blockers.push(entry);
  }

  function syntheticBlock(reason, details = {}) {
    const entry = {
      scope: "synthetic",
      inputIndex: null,
      stat: null,
      operation: null,
      sourceText: "",
      applied: false,
      reason,
      affectsCompletion: true,
      ...details,
    };
    excluded.push(entry);
    blockers.push(entry);
  }

  function resolve(reference, effect) {
    if (effect?.condition) {
      const key = conditionSelectionKey(effect);
      if (!key || !Object.hasOwn(conditionValues, key)) {
        exclude(reference, effect, "tlidb-gear-condition-selection-required", true, { conditionKey: key });
        return null;
      }
      if (typeof conditionValues[key] !== "boolean") {
        exclude(reference, effect, "tlidb-gear-condition-selection-invalid", true, { conditionKey: key });
        return null;
      }
      if (!conditionValues[key]) {
        exclude(reference, effect, "tlidb-gear-condition-unmet", false, { conditionKey: key });
        return null;
      }
    }

    let value = finiteNumber(effect?.value);
    if (value === null && effect?.roll && typeof effect.roll === "object") {
      const key = effect.roll.key ?? effect.rollKey ?? effect.id;
      value = finiteNumber(rollValues[key]);
      if (value === null) {
        exclude(reference, effect, "tlidb-gear-roll-selection-required", true, { rollKey: key ?? null });
        return null;
      }
      const minimum = finiteNumber(effect.roll.min);
      const maximum = finiteNumber(effect.roll.max);
      if (minimum === null || maximum === null || value < minimum || value > maximum) {
        exclude(reference, effect, "tlidb-gear-roll-selection-out-of-range", true, {
          rollKey: key ?? null,
          selectedValue: value,
          minimum,
          maximum,
        });
        return null;
      }
    }
    if (value === null) {
      exclude(reference, effect, "tlidb-gear-effect-value-unavailable", true);
      return null;
    }
    return value;
  }

  const weaponBounds = Object.fromEntries([...DAMAGE_TYPES, "elemental"].map((type) => [type, emptyBounds()]));
  const weaponModifiers = Object.fromEntries([...DAMAGE_TYPES, "elemental"].map((type) => [type, emptyModifier()]));
  const attackAddedBounds = Object.fromEntries([...DAMAGE_TYPES, "elemental"].map((type) => [type, emptyBounds()]));
  const spellAddedBounds = Object.fromEntries([...DAMAGE_TYPES, "elemental"].map((type) => [type, emptyBounds()]));
  const attackSpeedSets = [];
  const criticalRatingSets = [];
  const attackSpeedModifier = emptyModifier();
  const criticalRatingModifier = emptyModifier();

  const references = [
    ...weaponEffects.map((effect, inputIndex) => ({ scope: "weapon", inputIndex, effect })),
    ...externalEffects.map((effect, inputIndex) => ({ scope: "external", inputIndex, effect })),
  ];

  for (const reference of references) {
    const { effect } = reference;
    const classified = classifyEffect(effect, reference.scope);
    if (classified.kind === "not-applicable") {
      exclude(reference, effect, classified.reason, false);
      continue;
    }
    const value = resolve(reference, effect);
    if (value === null) continue;
    const operation = effect?.operation;
    let target = classified.kind;

    if (classified.kind === "weapon-damage-bound") {
      if (classified.type === "elemental") {
        exclude(reference, effect, "tlidb-elemental-flat-damage-type-ambiguous", true);
        continue;
      }
      if (!["set", "add"].includes(operation)) {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      weaponBounds[classified.type][classified.bound][operation].push({ value, reference });
      target = `weaponDamage.${classified.type}.${classified.bound}`;
    } else if (classified.kind === "weapon-damage-modifier") {
      if (!["add_percent", "more_percent"].includes(operation)) {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      const bucket = weaponModifiers[classified.type];
      if (operation === "add_percent") bucket.increase += value;
      else bucket.more *= 1 + (value / 100);
      target = `weaponDamage.${classified.type}`;
    } else if (classified.kind === "added-damage-bound") {
      if (classified.type === "elemental") {
        exclude(reference, effect, "tlidb-elemental-flat-damage-type-ambiguous", true);
        continue;
      }
      if (operation !== "add") {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      const entry = { value, reference };
      if (["added", "attack", "attack_and_spell"].includes(classified.target)) {
        attackAddedBounds[classified.type][classified.bound].add.push(entry);
      }
      if (["added", "spell", "attack_and_spell"].includes(classified.target)) {
        spellAddedBounds[classified.type][classified.bound].add.push(entry);
      }
      target = `${classified.target}Damage.${classified.type}.${classified.bound}`;
    } else if (classified.kind === "attack-speed-set") {
      if (operation !== "set" || value <= 0) {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      attackSpeedSets.push({ value, fixed: classified.fixed, reference });
      target = "attackSpeed";
    } else if (classified.kind === "attack-speed-modifier") {
      if (operation === "add_percent") attackSpeedModifier.increase += value;
      else if (operation === "more_percent") attackSpeedModifier.more *= 1 + (value / 100);
      else {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      target = "attackSpeed";
    } else if (classified.kind === "critical-rating-set") {
      if (operation !== "set" || value < 0) {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      criticalRatingSets.push({ value, fixed: classified.fixed, reference });
      target = "criticalStrikeRating";
    } else if (classified.kind === "critical-rating-modifier") {
      if (operation === "add") {
        exclude(reference, effect, "tlidb-flat-critical-rating-formula-unverified", true);
        continue;
      }
      if (operation === "add_percent") criticalRatingModifier.increase += value;
      else if (operation === "more_percent") criticalRatingModifier.more *= 1 + (value / 100);
      else {
        exclude(reference, effect, "tlidb-gear-combat-operation-unsupported", true);
        continue;
      }
      target = "criticalStrikeRating";
    }

    applied.push({
      ...traceBase(reference, effect),
      applied: true,
      value,
      target,
    });
  }

  function block(reason, details) {
    syntheticBlock(reason, details);
  }

  if (weaponBounds.elemental.min.set.length
    || weaponBounds.elemental.min.add.length
    || weaponBounds.elemental.max.set.length
    || weaponBounds.elemental.max.add.length) {
    syntheticBlock("tlidb-elemental-flat-damage-type-ambiguous", { stage: "weapon-elemental-damage" });
  }
  if (attackAddedBounds.elemental.min.add.length || attackAddedBounds.elemental.max.add.length) {
    syntheticBlock("tlidb-elemental-flat-damage-type-ambiguous", { stage: "attack-added-elemental-damage" });
  }
  if (spellAddedBounds.elemental.min.add.length || spellAddedBounds.elemental.max.add.length) {
    syntheticBlock("tlidb-elemental-flat-damage-type-ambiguous", { stage: "spell-added-elemental-damage" });
  }

  const weaponDamage = damagePoolFromBounds(weaponBounds, weaponModifiers, block);
  const addedAttackDamage = addedDamagePool(attackAddedBounds, "attack-added-damage", block);
  const addedSpellDamage = addedDamagePool(spellAddedBounds, "spell-added-damage", block);

  const baseAttackSpeed = resolveSet(attackSpeedSets, "attack-speed", block);
  const attackSpeedFactor = (1 + (attackSpeedModifier.increase / 100)) * attackSpeedModifier.more;
  let uncappedAttackSpeed = null;
  let attackSpeed = null;
  let attackTime = null;
  if (baseAttackSpeed !== null) {
    if (!Number.isFinite(attackSpeedFactor) || attackSpeedFactor <= 0) {
      syntheticBlock("tlidb-gear-attack-speed-result-invalid", {
        increase: attackSpeedModifier.increase,
        more: attackSpeedModifier.more,
      });
    } else {
      uncappedAttackSpeed = rounded(baseAttackSpeed * attackSpeedFactor);
      attackSpeed = rounded(Math.min(30, uncappedAttackSpeed));
      attackTime = rounded(1 / attackSpeed);
    }
  }

  const baseCriticalStrikeRating = resolveSet(criticalRatingSets, "critical-strike-rating", block);
  const criticalRatingFactor = (1 + (criticalRatingModifier.increase / 100)) * criticalRatingModifier.more;
  let criticalStrikeRating = null;
  if (baseCriticalStrikeRating !== null) {
    if (!Number.isFinite(criticalRatingFactor) || criticalRatingFactor < 0) {
      syntheticBlock("tlidb-gear-critical-rating-result-invalid", {
        increase: criticalRatingModifier.increase,
        more: criticalRatingModifier.more,
      });
    } else {
      criticalStrikeRating = rounded(baseCriticalStrikeRating * criticalRatingFactor);
    }
  }

  if (requirements.weaponDamage && !weaponDamage) {
    syntheticBlock("tlidb-weapon-base-damage-unavailable", { requirement: "weaponDamage" });
  }
  if (requirements.attackTime && attackTime === null) {
    syntheticBlock("tlidb-weapon-attack-time-unavailable", { requirement: "attackTime" });
  }
  if (requirements.criticalStrikeRating && criticalStrikeRating === null) {
    syntheticBlock("tlidb-weapon-critical-strike-rating-unavailable", {
      requirement: "criticalStrikeRating",
    });
  }

  return {
    complete: blockers.length === 0,
    weaponDamage,
    addedAttackDamage,
    addedSpellDamage,
    baseAttackSpeed,
    uncappedAttackSpeed,
    attackSpeed,
    attackTime,
    baseCriticalStrikeRating,
    criticalStrikeRating,
    criticalStrikeChance: criticalStrikeRating === null ? null : rounded(criticalStrikeRating / 100),
    applied,
    excluded,
    blockers,
  };
}

export const createTlidbGearCombatContext = buildTlidbGearCombatContext;
