import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";

const COOLDOWN_FORMULA_SOURCE = Object.freeze({
  sourceUrl: "https://tlidb.com/ko/Cooldown",
  sourceRecordKey: "Cooldown",
  sourcePageSha256: "580ce84e2bdec5bf4293e8b1bc59e6fb4a3a9f08db6c2440683500376f8b520f",
});

function round(value) {
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12;
}

function receipt(sourceId, kind, effect, authority) {
  return Object.freeze({
    sourceId,
    kind,
    operation: effect.operation,
    value: Number(effect.value),
    sourceUrl: authority.sourceUrl,
  });
}

function unsupported(blockers, receipts = []) {
  return Object.freeze({
    status: "unsupported",
    baseSeconds: null,
    recoveryIncreasePercent: null,
    recoveryAdditionalMultiplier: null,
    recoveryMultiplier: null,
    effectiveSeconds: null,
    formulaSource: COOLDOWN_FORMULA_SOURCE,
    receipts: Object.freeze(receipts),
    blockers: Object.freeze(blockers.map((blocker) => Object.freeze({ ...blocker }))),
  });
}

function hasDynamicInput(effect) {
  return Boolean(
    effect?.condition
    || effect?.conditionRequirements?.length
    || effect?.per
    || effect?.roll,
  );
}

function relevantRecoveryEffects(authority, sourceKind, minion) {
  const acceptedStats = sourceKind === "skill"
    ? new Set(["skill-cooldown-recovery-speed"])
    : new Set([
        "supported-skill-cooldown-recovery-speed",
        ...(minion ? ["minion-cooldown-recovery-speed"] : []),
      ]);
  return (authority?.parsedEffects ?? []).filter(({ stat }) => acceptedStats.has(stat));
}

/**
 * Resolves the current TLIDB Cooldown formula independently from DPS cadence.
 * Skills without a Cooldown header return null; missing or ambiguous authority
 * for a present Cooldown fails closed instead of producing a numeric value.
 */
export function evaluateTlidbActiveSkillCooldown({
  skill,
  level = 20,
  supports = [],
  globalRecoveryIncreasePercent = 0,
} = {}) {
  const skillAuthority = getTlidbCalculationAuthority(skill, { level });
  if (!skillAuthority) return null;

  const cooldownEffects = skillAuthority.parsedEffects.filter(({ stat }) => stat === "cooldown");
  if (cooldownEffects.length === 0) return null;
  if (cooldownEffects.length !== 1) {
    return unsupported([{
      sourceId: skill?.id ?? null,
      reason: "active-skill-cooldown-header-ambiguous",
    }]);
  }

  const cooldownEffect = cooldownEffects[0];
  const baseSeconds = Number(cooldownEffect.value);
  if (
    cooldownEffect.operation !== "set"
    || !Number.isFinite(baseSeconds)
    || baseSeconds <= 0
    || hasDynamicInput(cooldownEffect)
  ) {
    return unsupported([{
      sourceId: skill?.id ?? null,
      reason: "active-skill-cooldown-header-unavailable",
    }]);
  }

  const globalIncrease = Number(globalRecoveryIncreasePercent);
  if (!Number.isFinite(globalIncrease)) {
    return unsupported([{
      sourceId: "current-build",
      reason: "cooldown-recovery-speed-input-invalid",
    }]);
  }

  const receipts = [receipt(skill.id, "base-cooldown", cooldownEffect, skillAuthority)];
  const blockers = [];
  const minion = (skill?.tags ?? []).some((tag) => ["minion", "summon"].includes(String(tag).toLowerCase()));
  let recoveryIncreasePercent = globalIncrease;
  let recoveryAdditionalMultiplier = 1;

  const sources = [{
    sourceId: skill.id,
    sourceKind: "skill",
    authority: skillAuthority,
  }];
  for (const support of supports) {
    if (!support?.item || support.compatible === false) continue;
    const authority = getTlidbCalculationAuthority(support.item, {
      level: support.level ?? level,
    });
    if (!authority) {
      blockers.push({
        sourceId: support.item.id,
        reason: "support-cooldown-authority-unavailable",
      });
      continue;
    }
    sources.push({
      sourceId: support.item.id,
      sourceKind: "support",
      authority,
    });
  }

  for (const source of sources) {
    for (const effect of relevantRecoveryEffects(source.authority, source.sourceKind, minion)) {
      const value = Number(effect.value);
      if (
        !Number.isFinite(value)
        || hasDynamicInput(effect)
        || !["add", "more"].includes(effect.operation)
      ) {
        blockers.push({
          sourceId: source.sourceId,
          reason: "cooldown-recovery-speed-effect-unsupported",
        });
        continue;
      }
      if (effect.operation === "add") recoveryIncreasePercent += value;
      else recoveryAdditionalMultiplier *= 1 + (value / 100);
      receipts.push(receipt(
        source.sourceId,
        "cooldown-recovery-speed",
        effect,
        source.authority,
      ));
    }
  }

  const recoveryMultiplier = (1 + (recoveryIncreasePercent / 100))
    * recoveryAdditionalMultiplier;
  if (blockers.length || !Number.isFinite(recoveryMultiplier) || recoveryMultiplier <= 0) {
    if (!blockers.length) {
      blockers.push({
        sourceId: skill.id,
        reason: "cooldown-recovery-result-invalid",
      });
    }
    return unsupported(blockers, receipts);
  }

  return Object.freeze({
    status: "complete",
    baseSeconds,
    recoveryIncreasePercent: round(recoveryIncreasePercent),
    recoveryAdditionalMultiplier: round(recoveryAdditionalMultiplier),
    recoveryMultiplier: round(recoveryMultiplier),
    effectiveSeconds: round(baseSeconds / recoveryMultiplier),
    formulaSource: COOLDOWN_FORMULA_SOURCE,
    receipts: Object.freeze(receipts),
    blockers: Object.freeze([]),
  });
}
