import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";

const SKILL_TYPE_FORMULA_SOURCE = Object.freeze({
  sourceUrl: "https://tlidb.com/ko/Skill_Type",
  sourceRecordKey: "Skill_Type",
  sourcePageSha256: "67471debd800170ceeb58646e1f079dec0992ccb709d21549b93a9b573925506",
});

function round(value) {
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12;
}

function singleFiniteHeaderEffect(authority, stat) {
  const effects = (authority?.parsedEffects ?? []).filter((effect) => (
    effect.stat === stat
    && effect.operation === "set"
    && Number.isFinite(Number(effect.value))
  ));
  return effects.length === 1 ? effects[0] : null;
}

function receipt(sourceId, kind, value, authority) {
  return Object.freeze({
    sourceId,
    kind,
    value,
    sourceUrl: authority.sourceUrl,
  });
}

function unsupported(blockers, receipts = []) {
  return Object.freeze({
    status: "unsupported",
    base: null,
    multiplierPercent: null,
    final: null,
    formulaSource: SKILL_TYPE_FORMULA_SOURCE,
    receipts: Object.freeze(receipts),
    blockers: Object.freeze(blockers.map((blocker) => Object.freeze({ ...blocker }))),
  });
}

/**
 * Calculates an active skill's final MP cost from exact current TLIDB headers.
 * TLIDB Skill Type defines the interface: base MP cost multiplied by every
 * linked support's MP multiplier. Missing or ambiguous headers fail closed.
 */
export function evaluateTlidbActiveSkillManaCost({ skill, level = 20, supports = [] } = {}) {
  const skillAuthority = getTlidbCalculationAuthority(skill, { level });
  const baseEffect = singleFiniteHeaderEffect(skillAuthority, "mana-cost");
  if (!baseEffect || Number(baseEffect.value) < 0) {
    return unsupported([{
      sourceId: skill?.id ?? null,
      reason: "active-skill-mana-cost-header-unavailable",
    }]);
  }

  const base = Number(baseEffect.value);
  const receipts = [receipt(skill.id, "base-mana-cost", base, skillAuthority)];
  let multiplier = 1;
  const blockers = [];

  for (const support of supports) {
    if (!support?.item || support.compatible === false) continue;
    const authority = getTlidbCalculationAuthority(
      support.item,
      { level: support.level ?? level },
    );
    const effect = singleFiniteHeaderEffect(authority, "mana-cost-multiplier");
    const value = Number(effect?.value);
    if (!effect || value < 0) {
      blockers.push({
        sourceId: support.item.id,
        reason: "support-mana-cost-multiplier-header-unavailable",
      });
      continue;
    }
    multiplier *= value / 100;
    receipts.push(receipt(
      support.item.id,
      "mana-cost-multiplier",
      value,
      authority,
    ));
  }

  if (blockers.length) return unsupported(blockers, receipts);
  return Object.freeze({
    status: "complete",
    base,
    multiplierPercent: round(multiplier * 100),
    final: round(base * multiplier),
    formulaSource: SKILL_TYPE_FORMULA_SOURCE,
    receipts: Object.freeze(receipts),
    blockers: Object.freeze([]),
  });
}
