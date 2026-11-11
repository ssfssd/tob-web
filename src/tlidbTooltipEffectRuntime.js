import { diagnoseConditions, resolveConditionValues } from "./conditionModel.js";

const OPERATION_ALIASES = Object.freeze({
  add: "add",
  flat: "add",
  increase: "increase",
  increased: "increase",
  more: "more",
  additional: "more",
  set: "set",
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readPath(record, path) {
  if (typeof path !== "string" || !path) return undefined;
  let value = record;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

function normalizeRequirements(effect) {
  if (Array.isArray(effect.conditionRequirements)) return effect.conditionRequirements;
  if (effect.condition && typeof effect.condition === "object") return [effect.condition];
  return [];
}

function resolveRangeValue(effect, rollValues) {
  const direct = finiteNumber(effect.value);
  if (direct !== null) return { value: direct };
  const range = effect.roll ?? effect.range;
  if (!range || typeof range !== "object") return { reason: "tlidb-effect-value-unavailable" };
  const key = effect.rollKey ?? range.key ?? effect.id;
  const chosen = finiteNumber(rollValues?.[key]);
  if (chosen === null) return { reason: "tlidb-roll-selection-required" };
  const minimum = finiteNumber(range.min);
  const maximum = finiteNumber(range.max);
  if (minimum === null || maximum === null || chosen < minimum || chosen > maximum) {
    return { reason: "tlidb-roll-selection-out-of-range" };
  }
  return { value: chosen };
}

function resolvePerUnitValue(effect, baseValue, resolvedConditions) {
  const per = effect.per;
  if (!per || typeof per !== "object") return { value: baseValue };
  const actual = finiteNumber(readPath(resolvedConditions, per.path));
  const divisor = finiteNumber(per.divisor ?? 1);
  if (actual === null || divisor === null || divisor <= 0) {
    return { reason: "tlidb-per-unit-input-unavailable" };
  }
  const mode = per.rounding ?? "floor";
  const rawUnits = actual / divisor;
  let units = mode === "none" ? rawUnits : mode === "ceil" ? Math.ceil(rawUnits) : Math.floor(rawUnits);
  const maxUnits = finiteNumber(per.maxUnits);
  if (maxUnits !== null) units = Math.min(units, maxUnits);
  let value = baseValue * units;
  const cap = finiteNumber(per.cap);
  if (cap !== null) value = baseValue >= 0 ? Math.min(value, cap) : Math.max(value, cap);
  return { value };
}

function inactive(effect, reason) {
  return Object.freeze({ ...effect, applied: false, inactiveReason: reason });
}

export function resolveTlidbTooltipEffects(effects, options = {}) {
  const conditionState = options.conditions;
  const resolvedConditions = resolveConditionValues(conditionState);
  const runtimeContext = options.context
    && typeof options.context === "object"
    && !Array.isArray(options.context)
    ? options.context
    : {};
  const runtimeValues = {
    ...resolvedConditions,
    ...runtimeContext,
    stats: options.stats && typeof options.stats === "object" ? options.stats : {},
  };
  const applied = [];
  const excluded = [];

  for (const rawEffect of Array.isArray(effects) ? effects : []) {
    const effect = rawEffect && typeof rawEffect === "object" ? rawEffect : {};
    const operation = OPERATION_ALIASES[effect.operation];
    if (!effect.stat || !operation) {
      excluded.push(inactive(effect, "tlidb-effect-target-or-operation-unsupported"));
      continue;
    }
    if (effect.condition && typeof effect.condition !== "object") {
      excluded.push(inactive(effect, "tlidb-condition-input-unmapped"));
      continue;
    }
    const requirements = normalizeRequirements(effect);
    if (effect.condition && requirements.some((requirement) => (
      !requirement || typeof requirement !== "object" || typeof requirement.path !== "string"
    ))) {
      excluded.push(inactive(effect, "tlidb-condition-input-unmapped"));
      continue;
    }
    if (requirements.length) {
      const diagnosis = diagnoseConditions(conditionState, requirements);
      if (diagnosis.unsupported.length) {
        excluded.push(inactive(effect, diagnosis.unsupported[0].unsupportedReason));
        continue;
      }
      if (diagnosis.unmet.length) {
        excluded.push(inactive(effect, "tlidb-effect-condition-unmet"));
        continue;
      }
    }
    const ranged = resolveRangeValue(effect, options.rollValues);
    if (ranged.reason) {
      excluded.push(inactive(effect, ranged.reason));
      continue;
    }
    const scaled = resolvePerUnitValue(effect, ranged.value, runtimeValues);
    if (scaled.reason) {
      excluded.push(inactive(effect, scaled.reason));
      continue;
    }
    applied.push(Object.freeze({ ...effect, operation, value: scaled.value, applied: true }));
  }
  return Object.freeze({ applied: Object.freeze(applied), excluded: Object.freeze(excluded) });
}

export function aggregateTlidbTooltipEffects(effects, options = {}) {
  const resolution = resolveTlidbTooltipEffects(effects, options);
  const byStat = {};
  for (const effect of resolution.applied) {
    const bucket = byStat[effect.stat] ?? { add: 0, increase: 0, more: 1, set: null };
    if (effect.operation === "add") bucket.add += effect.value;
    else if (effect.operation === "increase") bucket.increase += effect.value;
    else if (effect.operation === "more") bucket.more *= 1 + effect.value / 100;
    else if (effect.operation === "set") bucket.set = effect.value;
    byStat[effect.stat] = bucket;
  }
  return Object.freeze({
    ...resolution,
    byStat: Object.freeze(Object.fromEntries(Object.entries(byStat).map(([key, value]) => [
      key,
      Object.freeze(value),
    ]))),
  });
}
