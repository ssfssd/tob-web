import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";

const EXACT_STATUS = new Set(["exact", "exact-structural"]);
const PASSIVE_HEADER_STATS = new Set(["sealed-mana", "cast-time"]);
const PANEL_AURA_STAT_MAP = Object.freeze({
  "skill-life-regeneration": Object.freeze(["lifeRegenPerSecond"]),
  "skill-mana-regeneration": Object.freeze(["manaRegenPerSecond"]),
  "skill-energy-shield-regeneration": Object.freeze(["shieldRegenPerSecond"]),
  "skill-evasion": Object.freeze(["evasion"]),
  "skill-max-energy-shield": Object.freeze(["shield"]),
  "skill-movement-speed": Object.freeze(["movementSpeedBonus"]),
  "skill-armor": Object.freeze(["armor"]),
  "skill-elemental-resistance": Object.freeze([
    "fireResist",
    "coldResist",
    "lightningResist",
  ]),
});

export const TLIDB_PASSIVE_SKILL_HELP_SOURCES = Object.freeze({
  seal: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Seal",
    sourceRecordKey: "Seal",
  }),
  sealedManaCompensation: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Sealed_Mana_Compensation",
    sourceRecordKey: "Sealed_Mana_Compensation",
  }),
  skillType: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Skill_Type",
    sourceRecordKey: "Skill_Type",
  }),
  aura: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Aura",
    sourceRecordKey: "Aura",
  }),
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function exactCurrentEnglishTags(item) {
  const locale = item?.tlidbText?.en;
  if (
    locale?.sourcePageVersion !== "SS13"
    || locale?.sourceSeasonEvidence?.verificationComplete !== true
    || !EXACT_STATUS.has(locale?.sourceFieldStatus?.tags)
    || !Array.isArray(locale.tags)
  ) return new Set();
  return new Set(locale.tags.map((tag) => String(tag).trim().toLowerCase()));
}

function blocker(reason, sourceId, sourceText = "", details = {}) {
  return Object.freeze({
    reason,
    sourceId: sourceId ?? null,
    sourceText,
    affectsCompletion: true,
    ...details,
  });
}

function auraBlockerTargetStats(sourceText) {
  const text = String(sourceText ?? "");
  if (/Life Regeneration/iu.test(text)) return ["lifeRegenPerSecond"];
  if (/Mana Regeneration/iu.test(text)) return ["manaRegenPerSecond"];
  if (/Energy Shield Regeneration/iu.test(text)) return ["shieldRegenPerSecond"];
  if (/Max(?:imum)? Energy Shield/iu.test(text)) return ["shield"];
  if (/\bEvasion\b/iu.test(text)) return ["evasion"];
  if (/\bArmor\b/iu.test(text)) return ["armor"];
  if (/Elemental Resistance/iu.test(text)) {
    return ["fireResist", "coldResist", "lightningResist"];
  }
  if (/Movement Speed/iu.test(text)) return ["movementSpeedBonus"];
  return [];
}

function auraBlockerScope(tags, sourceText) {
  const text = String(sourceText ?? "");
  const skillTypes = tags.has("attack") || /\bAttack\b/iu.test(text)
    ? ["attack"]
    : tags.has("spell") || /\bSpell\b/iu.test(text)
      ? ["spell"]
      : ["all"];
  const skillTags = [
    ["melee", /\bMelee\b/iu],
    ["projectile", /\bProjectile/iu],
    ["area", /\bArea Skills?\b/iu],
  ].filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  return {
    actor: tags.has("minion") || /\bMinions?|Spirit Magi\b/iu.test(text) ? "minion" : "self",
    skillTypes,
    ...(skillTags.length ? { skillTags } : {}),
  };
}

function scaleAuraValue(value, nonAdditionalPercent, additionalMultipliers) {
  const base = finiteNumber(value);
  if (base === null) return null;
  const nonAdditional = finiteNumber(nonAdditionalPercent);
  if (nonAdditional === null) return null;
  const factor = (1 + nonAdditional / 100) * additionalMultipliers;
  if (!Number.isFinite(factor) || factor < 0) return null;
  return base * factor;
}

export function calculateTlidbActualSealedManaPercent({
  initialPercent,
  manaMultiplierPercent = 100,
  compensationPercent = 0,
} = {}) {
  const initial = finiteNumber(initialPercent);
  const manaMultiplier = finiteNumber(manaMultiplierPercent);
  const compensation = finiteNumber(compensationPercent);
  if (
    initial === null
    || initial < 0
    || manaMultiplier === null
    || manaMultiplier < 0
    || compensation === null
    || compensation <= -100
  ) return null;
  const actual = initial * (manaMultiplier / 100) / (1 + compensation / 100);
  return Number.isFinite(actual) && actual >= 0 ? actual : null;
}

export function calculateTlidbAuraPositiveEffectValue({
  baseValue,
  auraEffectPercent = 0,
  additionalAuraEffectPercentages = [],
} = {}) {
  let additionalMultiplier = 1;
  for (const value of additionalAuraEffectPercentages) {
    const percentage = finiteNumber(value);
    if (percentage === null || percentage < -100) return null;
    additionalMultiplier *= 1 + percentage / 100;
  }
  return scaleAuraValue(baseValue, auraEffectPercent, additionalMultiplier);
}

function supportRuntime(support, fallbackLevel) {
  const item = support?.item;
  if (!item) return null;
  return {
    item,
    level: Math.max(1, Math.round(Number(support.level) || fallbackLevel)),
    compatible: support.compatible !== false,
  };
}

function mappedAuraEffect(effect, scaledValue, tags) {
  const panelStats = PANEL_AURA_STAT_MAP[effect.stat];
  if (panelStats) {
    return {
      panelEffects: panelStats.map((stat) => ({ ...effect, stat, value: scaledValue })),
      skillEffects: [],
    };
  }
  if (/^skill-(?:.+-)?damage(?:-.+)?$/u.test(String(effect.stat ?? ""))) {
    const minion = effect.stat === "skill-minion-damage";
    return {
      panelEffects: [],
      skillEffects: [{
        ...effect,
        stat: minion ? "minion-damage" : effect.stat,
        value: scaledValue,
        scope: {
          actor: minion || tags.has("minion") ? "minion" : "self",
          skillTypes: tags.has("attack")
            ? ["attack"]
            : tags.has("spell")
              ? ["spell"]
              : ["all"],
        },
      }],
    };
  }
  return null;
}

export function evaluateTlidbPassiveSkill(input = {}) {
  const skill = input.skill;
  const level = Math.max(1, Math.round(Number(input.level) || 1));
  const tags = exactCurrentEnglishTags(skill);
  const isAura = tags.has("aura");
  const authority = getTlidbCalculationAuthority(skill, { level });
  const sealBlockers = [];
  const auraBlockers = [];
  const excludedSupports = [];
  const supportReceipts = [];

  if (!authority || skill?.categoryId !== "skills" || skill?.type !== "passive") {
    const unavailable = blocker("passive-skill-calculation-authority-unavailable", skill?.id);
    return Object.freeze({
      status: unavailable.reason,
      complete: false,
      seal: Object.freeze({ complete: false, actualPercent: null, blockers: [unavailable] }),
      aura: Object.freeze({ active: isAura, complete: false, panelEffects: [], skillEffects: [], blockers: [unavailable] }),
      blockers: Object.freeze([unavailable]),
      excludedSupports: Object.freeze([]),
      supportReceipts: Object.freeze([]),
    });
  }

  const sealedManaEffects = authority.parsedEffects.filter(({ stat, operation }) => (
    stat === "sealed-mana" && operation === "set"
  ));
  const initialSeal = sealedManaEffects.length === 1
    ? finiteNumber(sealedManaEffects[0].value)
    : null;
  if (initialSeal === null || initialSeal < 0 || sealedManaEffects.length !== 1) {
    sealBlockers.push(blocker(
      "passive-sealed-mana-header-unavailable",
      skill.id,
      sealedManaEffects.map(({ sourceText }) => sourceText).filter(Boolean).join("\n"),
      { targetStats: ["sealedManaPercent"] },
    ));
  }

  let manaMultiplier = 1;
  let localSealCompensation = 0;
  let localSealCompensationMore = 1;
  let localAuraEffect = 0;
  const localAuraEffectMore = [];

  for (const rawSupport of Array.isArray(input.supports) ? input.supports : []) {
    const support = supportRuntime(rawSupport, level);
    if (!support) continue;
    if (!support.compatible) {
      excludedSupports.push(Object.freeze({
        sourceId: support.item.id,
        reason: "incompatible-support",
        affectsCompletion: false,
      }));
      continue;
    }
    const supportAuthority = getTlidbCalculationAuthority(support.item, { level: support.level });
    if (!supportAuthority) {
      sealBlockers.push(blocker(
        "passive-support-calculation-authority-unavailable",
        support.item.id,
        "",
        { targetStats: ["sealedManaPercent"] },
      ));
      if (isAura) auraBlockers.push(blocker(
        "passive-support-aura-authority-unavailable",
        support.item.id,
      ));
      continue;
    }

    const multiplierEffects = supportAuthority.parsedEffects.filter(({ stat, operation }) => (
      stat === "mana-cost-multiplier" && operation === "set"
    ));
    const multiplier = multiplierEffects.length === 1
      ? finiteNumber(multiplierEffects[0].value)
      : null;
    if (multiplier === null || multiplier < 0 || multiplierEffects.length !== 1) {
      sealBlockers.push(blocker(
        "passive-support-mana-multiplier-unavailable",
        support.item.id,
        multiplierEffects.map(({ sourceText }) => sourceText).filter(Boolean).join("\n"),
        { targetStats: ["sealedManaPercent"] },
      ));
    } else {
      manaMultiplier *= multiplier / 100;
      supportReceipts.push(Object.freeze({
        sourceId: support.item.id,
        manaMultiplierPercent: multiplier,
        sourceUrl: supportAuthority.sourceUrl,
        sourceRecordKey: supportAuthority.sourceRecordKey,
      }));
    }

    for (const effect of supportAuthority.parsedEffects.filter(
      ({ stat }) => stat === "supported-skill-sealed-mana-compensation",
    )) {
      const value = finiteNumber(effect.value);
      if (value === null) {
        sealBlockers.push(blocker(
          "passive-support-seal-compensation-value-unavailable",
          support.item.id,
          effect.sourceText,
          { targetStats: ["sealedManaPercent"] },
        ));
      } else if (effect.operation === "add") {
        localSealCompensation += value;
      } else if (effect.operation === "more" && value >= -100) {
        localSealCompensationMore *= 1 + value / 100;
      } else {
        sealBlockers.push(blocker(
          "passive-support-seal-compensation-operation-unsupported",
          support.item.id,
          effect.sourceText,
          { targetStats: ["sealedManaPercent"] },
        ));
      }
    }

    for (const effect of supportAuthority.parsedEffects.filter(
      ({ stat }) => stat === "supported-skill-aura-effect",
    )) {
      const value = finiteNumber(effect.value);
      if (value === null) {
        auraBlockers.push(blocker(
          "passive-support-aura-effect-value-unavailable",
          support.item.id,
          effect.sourceText,
        ));
      } else if (effect.operation === "add") {
        localAuraEffect += value;
      } else if (effect.operation === "more" && value >= -100) {
        localAuraEffectMore.push(value);
      } else {
        auraBlockers.push(blocker(
          "passive-support-aura-effect-operation-unsupported",
          support.item.id,
          effect.sourceText,
        ));
      }
    }

    for (const parserBlocker of supportAuthority.parserBlockers) {
      const sourceText = String(parserBlocker.sourceText ?? "");
      if (/Sealed Mana|Mana Cost Multiplier|Replaces? Sealed Mana/iu.test(sourceText)) {
        sealBlockers.push(blocker(
          parserBlocker.reason || "passive-support-seal-effect-unresolved",
          support.item.id,
          sourceText,
          { targetStats: ["sealedManaPercent"] },
        ));
      }
      if (isAura && /Aura Effect/iu.test(sourceText)) {
        auraBlockers.push(blocker(
          parserBlocker.reason || "passive-support-aura-effect-unresolved",
          support.item.id,
          sourceText,
        ));
      }
    }
  }

  const globalSealCompensation = finiteNumber(input.manaSealCompensationPercent);
  const compensationPercent = globalSealCompensation === null
    ? null
    : (globalSealCompensation + localSealCompensation) * localSealCompensationMore;
  const actualSeal = sealBlockers.length
    ? null
    : calculateTlidbActualSealedManaPercent({
        initialPercent: initialSeal,
        manaMultiplierPercent: manaMultiplier * 100,
        compensationPercent,
      });
  if (actualSeal === null && !sealBlockers.length) {
    sealBlockers.push(blocker(
      "passive-sealed-mana-formula-input-invalid",
      skill.id,
      "",
      { targetStats: ["sealedManaPercent"] },
    ));
  }

  const panelEffects = [];
  const skillEffects = [];
  if (isAura) {
    const globalAuraEffect = finiteNumber(input.auraEffectPercent);
    if (globalAuraEffect === null) {
      auraBlockers.push(blocker("passive-aura-effect-input-invalid", skill.id));
    }
    for (const effect of authority.parsedEffects.filter(({ stat }) => !PASSIVE_HEADER_STATS.has(stat))) {
      const scaledValue = calculateTlidbAuraPositiveEffectValue({
        baseValue: effect.value,
        auraEffectPercent: (globalAuraEffect ?? 0) + localAuraEffect,
        additionalAuraEffectPercentages: localAuraEffectMore,
      });
      const mapped = scaledValue === null ? null : mappedAuraEffect(effect, scaledValue, tags);
      if (!mapped) {
        auraBlockers.push(blocker(
          scaledValue === null
            ? "passive-aura-effect-value-unavailable"
            : "passive-aura-effect-runtime-unavailable",
          skill.id,
          effect.sourceText,
          { targetStats: auraBlockerTargetStats(effect.sourceText) },
        ));
        continue;
      }
      panelEffects.push(...mapped.panelEffects);
      skillEffects.push(...mapped.skillEffects);
    }
    for (const parserBlocker of authority.parserBlockers) {
      auraBlockers.push(blocker(
        parserBlocker.reason || "passive-aura-tooltip-effect-unresolved",
        skill.id,
        parserBlocker.sourceText,
        {
          targetStats: auraBlockerTargetStats(parserBlocker.sourceText),
          scope: auraBlockerScope(tags, parserBlocker.sourceText),
        },
      ));
    }
  }

  const nonAuraEffects = authority.parsedEffects.filter(({ stat }) => !PASSIVE_HEADER_STATS.has(stat));
  const nonAuraBlockers = isAura
    ? []
    : [
        ...nonAuraEffects.map((effect) => blocker(
          "non-aura-passive-effect-runtime-unavailable",
          skill.id,
          effect.sourceText,
        )),
        ...authority.parserBlockers.map((entry) => blocker(
          entry.reason || "non-aura-passive-effect-runtime-unavailable",
          skill.id,
          entry.sourceText,
        )),
      ];
  const allBlockers = [...sealBlockers, ...auraBlockers, ...nonAuraBlockers];
  const seal = Object.freeze({
    complete: sealBlockers.length === 0,
    initialPercent: initialSeal,
    manaMultiplierPercent: manaMultiplier * 100,
    compensationPercent,
    actualPercent: actualSeal,
    blockers: Object.freeze(sealBlockers),
  });
  const aura = Object.freeze({
    active: isAura,
    complete: isAura ? auraBlockers.length === 0 : nonAuraBlockers.length === 0,
    auraEffectPercent: (finiteNumber(input.auraEffectPercent) ?? 0) + localAuraEffect,
    panelEffects: Object.freeze(panelEffects),
    skillEffects: Object.freeze(skillEffects),
    blockers: Object.freeze(isAura ? auraBlockers : nonAuraBlockers),
  });
  return Object.freeze({
    status: allBlockers.length ? "partial" : "complete",
    complete: seal.complete && aura.complete,
    seal,
    aura,
    blockers: Object.freeze(allBlockers),
    excludedSupports: Object.freeze(excludedSupports),
    supportReceipts: Object.freeze(supportReceipts),
    sourceUrl: authority.sourceUrl,
    sourceRecordKey: authority.sourceRecordKey,
    receipt: authority.receipt,
  });
}
