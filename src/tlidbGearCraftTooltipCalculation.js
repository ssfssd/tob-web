import { parseTlidbGearTooltip } from "./tlidbGearTooltipCalculation.js";

const FIELD_SEPARATOR = "\u0000";
const CURRENT_SOURCE_TRACK = "tlidb-current-ss13";
const ROLL_PLACEHOLDER_RE = /\{\{(roll_\d+)\}\}/gu;

export function tlidbGearCraftRollFieldKey(affixId, tierId, rollKey) {
  return [affixId, tierId, rollKey].join(FIELD_SEPARATOR);
}

function tierFieldKey(affixId, tierId) {
  return [affixId, tierId].join(FIELD_SEPARATOR);
}

function sourceLines(value) {
  return String(value ?? "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function placeholders(template) {
  return [...String(template ?? "").matchAll(ROLL_PLACEHOLDER_RE)].map((match) => match[1]);
}

function sameRoll(left, right) {
  return left?.key === right?.key
    && Number(left?.min) === Number(right?.min)
    && Number(left?.max) === Number(right?.max)
    && Number(left?.precision ?? 0) === Number(right?.precision ?? 0)
    && Number(left?.step ?? 1) === Number(right?.step ?? 1);
}

function sameTier(left, right) {
  if (
    left?.activeLocaleAliases?.tier !== right?.activeLocaleAliases?.tier
    || left?.renderTemplate !== right?.renderTemplate
    || left?.text !== right?.text
    || (left?.rollDefs?.length ?? 0) !== (right?.rollDefs?.length ?? 0)
  ) return false;
  return (left.rollDefs ?? []).every((roll, index) => sameRoll(roll, right.rollDefs[index]));
}

function collectRuntime(gear) {
  const tiers = new Map();
  const affixIds = new Set();
  let itemsWithCraft = 0;
  let affixInstances = 0;
  let tierInstances = 0;
  let rollInstances = 0;

  for (const item of gear) {
    if (item.craftAffixes?.length) itemsWithCraft += 1;
    for (const affix of item.craftAffixes ?? []) {
      affixInstances += 1;
      affixIds.add(affix.affixId);
      for (const tier of affix.tierOptions ?? []) {
        tierInstances += 1;
        rollInstances += tier.rollDefs?.length ?? 0;
        const key = tierFieldKey(affix.affixId, tier.tierId);
        const prior = tiers.get(key);
        if (!prior) {
          tiers.set(key, {
            key,
            affix,
            tier,
            itemIds: new Set([item.id]),
            conflict: false,
          });
          continue;
        }
        prior.itemIds.add(item.id);
        if (!sameTier(prior.tier, tier)) prior.conflict = true;
      }
    }
  }

  return {
    tiers,
    affixIds,
    itemsWithCraft,
    affixInstances,
    tierInstances,
    rollInstances,
  };
}

function exactSyntheticItem(id, detail) {
  return {
    id,
    sourceKind: "equipment",
    tlidbText: {
      en: {
        detail,
        sourcePageVersion: "SS13",
        sourceSeasonEvidence: { verificationComplete: true },
        sourceFieldStatus: { detail: "exact" },
      },
    },
  };
}

function parseCraftSpecificLine(sourceText, renderTemplate) {
  const addedDamage = renderTemplate.match(
    /^Adds\s+\{\{(roll_\d+)\}\}\s*[-–—~]\s*\{\{(roll_\d+)\}\}\s+(Physical|Fire|Cold|Lightning|Erosion|Elemental)\s+Damage\s+to\s+(Attacks|Minions)$/iu,
  );
  if (addedDamage) {
    const damageType = addedDamage[3].toLocaleLowerCase("en-US");
    const target = addedDamage[4].toLocaleLowerCase("en-US") === "attacks" ? "attack" : "minion";
    return {
      effects: [
        {
          stat: `${target}_${damageType}_damage_min`,
          operation: "add",
          value: null,
          unit: "damage",
          sourceText,
          rollKeyHint: addedDamage[1],
        },
        {
          stat: `${target}_${damageType}_damage_max`,
          operation: "add",
          value: null,
          unit: "damage",
          sourceText,
          rollKeyHint: addedDamage[2],
        },
      ],
      blockers: [],
    };
  }

  const semantic = parseTlidbGearTooltip(exactSyntheticItem(`craft-line:${sourceText}`, sourceText));
  return {
    effects: semantic.effects.map((effect) => ({ ...effect })),
    blockers: semantic.blockers.map((blocker) => ({ ...blocker })),
  };
}

function rollMatchesEffect(roll, semanticEffect) {
  if (semanticEffect.roll) {
    return Number(roll.min) === Number(semanticEffect.roll.min)
      && Number(roll.max) === Number(semanticEffect.roll.max);
  }
  return Number.isFinite(semanticEffect.value)
    && Number(roll.min) === Number(semanticEffect.value)
    && Number(roll.max) === Number(semanticEffect.value);
}

function pickRollKey(semanticEffect, placeholderKeys, rollByKey) {
  if (semanticEffect.rollKeyHint && placeholderKeys.includes(semanticEffect.rollKeyHint)) {
    return semanticEffect.rollKeyHint;
  }
  const candidates = placeholderKeys.filter((rollKey) => {
    const roll = rollByKey.get(rollKey);
    return roll && rollMatchesEffect(roll, semanticEffect);
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1 && semanticEffect.stat.endsWith("_min")) return candidates[0];
  if (candidates.length > 1 && semanticEffect.stat.endsWith("_max")) return candidates.at(-1);
  if (placeholderKeys.length === 1 && rollByKey.has(placeholderKeys[0])) return placeholderKeys[0];
  return "";
}

function actualRoll(affixId, tierId, roll) {
  return {
    key: tlidbGearCraftRollFieldKey(affixId, tierId, roll.key),
    rollKey: roll.key,
    min: Number(roll.min),
    max: Number(roll.max),
    precision: Number(roll.precision ?? 0),
    step: Number(roll.step ?? 1),
  };
}

function craftEffect({
  affixId,
  tierId,
  semanticEffect,
  renderTemplate,
  sourceRecordKey,
  sourceModifierId,
  roll,
}) {
  const result = {
    affixId,
    tierId,
    stat: semanticEffect.stat,
    operation: semanticEffect.operation,
    value: roll && Number(roll.min) !== Number(roll.max) ? null : semanticEffect.value,
    unit: semanticEffect.unit,
    sourceText: semanticEffect.sourceText,
    renderTemplate,
    sourceRecordKey,
    sourceModifierId: String(sourceModifierId ?? ""),
  };
  if (semanticEffect.condition !== undefined) result.condition = semanticEffect.condition;
  if (roll) result.roll = actualRoll(affixId, tierId, roll);
  return result;
}

function craftBlocker({
  affixId,
  tierId,
  sourceText,
  reason,
  roll,
  details,
}) {
  const result = { affixId, tierId, sourceText: String(sourceText ?? ""), reason };
  if (roll) {
    result.rollKey = roll.key;
    result.fieldKey = tlidbGearCraftRollFieldKey(affixId, tierId, roll.key);
  }
  if (details) result.details = details;
  return result;
}

function conditionPlaceholder(template, rollKey) {
  const placeholderIndex = template.indexOf(`{{${rollKey}}}`);
  if (placeholderIndex < 0) return false;
  const conditionMatch = template.match(/\b(?:when|while|if|per|for every|up to)\b/iu);
  return Boolean(conditionMatch && placeholderIndex > conditionMatch.index);
}

function conditionRoll(sourceText, roll) {
  const conditionMatch = String(sourceText ?? "").match(
    /\b(?:when|while|if|per|for every|up to)\b(?<condition>.*)$/iu,
  );
  if (!conditionMatch?.groups?.condition) return false;
  const values = [...conditionMatch.groups.condition.matchAll(
    /[+\-]?\s*\(?\s*(\d+(?:\.\d+)?)\s*(?:[-–—~]\s*(\d+(?:\.\d+)?))?\s*\)?/gu,
  )];
  return values.some((match) => {
    const minimum = Number(match[1]);
    const maximum = Number(match[2] ?? match[1]);
    return minimum === Number(roll.min) && maximum === Number(roll.max);
  });
}

function assertCurrentAuthority(registry) {
  if (
    registry?.metadata?.targetSeason !== 13
    || registry?.metadata?.activeSourceTrack !== CURRENT_SOURCE_TRACK
    || !registry?.records
    || !registry?.refs
  ) {
    throw new Error("current TLIDB SS13 gear locale authority is required");
  }
}

function increment(object, key, amount = 1) {
  object[key] = (object[key] ?? 0) + amount;
}

export function createTlidbGearCraftTooltipCalculation({ gear, registry } = {}) {
  if (!Array.isArray(gear)) throw new TypeError("gear must be an array");
  assertCurrentAuthority(registry);

  const runtime = collectRuntime(gear);
  const effects = [];
  const blockers = [];
  const parsedRollKeys = new Set();
  const blockedRollKeys = new Set();
  const accountedTierKeys = new Set();
  const tierStates = new Map();
  let exactAuthorityTiers = 0;
  let exactAuthorityRolls = 0;
  let authorityBlockedTiers = 0;
  let authorityBlockedRolls = 0;

  function stateFor(candidate) {
    let state = tierStates.get(candidate.key);
    if (!state) {
      state = { effects: 0, blockers: 0, rolls: candidate.tier.rollDefs?.length ?? 0 };
      tierStates.set(candidate.key, state);
    }
    return state;
  }

  function pushEffect(candidate, parsedEffect) {
    effects.push(parsedEffect);
    stateFor(candidate).effects += 1;
    accountedTierKeys.add(candidate.key);
    if (parsedEffect.roll) parsedRollKeys.add(parsedEffect.roll.key);
  }

  function pushBlocker(candidate, blocker) {
    blockers.push(blocker);
    stateFor(candidate).blockers += 1;
    accountedTierKeys.add(candidate.key);
    if (blocker.fieldKey) blockedRollKeys.add(blocker.fieldKey);
  }

  for (const candidate of runtime.tiers.values()) {
    const { affix, tier } = candidate;
    const tierAlias = tier.activeLocaleAliases?.tier;
    const sourceRecordKey = tierAlias ? registry.refs[tierAlias] : "";
    const record = sourceRecordKey ? registry.records[sourceRecordKey] : null;
    const rolls = tier.rollDefs ?? [];

    if (candidate.conflict) {
      pushBlocker(candidate, craftBlocker({
        affixId: affix.affixId,
        tierId: tier.tierId,
        sourceText: tier.text,
        reason: "runtime-tier-structure-conflict",
      }));
      for (const roll of rolls) {
        pushBlocker(candidate, craftBlocker({
          affixId: affix.affixId,
          tierId: tier.tierId,
          sourceText: tier.text,
          reason: "runtime-tier-structure-conflict",
          roll,
        }));
      }
      continue;
    }

    if (record?.status !== "exact") {
      authorityBlockedTiers += 1;
      authorityBlockedRolls += rolls.length;
      pushBlocker(candidate, craftBlocker({
        affixId: affix.affixId,
        tierId: tier.tierId,
        sourceText: record?.en?.text ?? record?.ko?.text ?? tier.text,
        reason: "source-value-authority-not-exact-current-ss13",
      }));
      for (const roll of rolls) {
        pushBlocker(candidate, craftBlocker({
          affixId: affix.affixId,
          tierId: tier.tierId,
          sourceText: record?.en?.text ?? record?.ko?.text ?? tier.text,
          reason: "source-value-authority-not-exact-current-ss13",
          roll,
        }));
      }
      continue;
    }

    exactAuthorityTiers += 1;
    exactAuthorityRolls += rolls.length;
    const sourceText = record.en?.text;
    if (typeof sourceText !== "string" || !sourceText.trim()) {
      pushBlocker(candidate, craftBlocker({
        affixId: affix.affixId,
        tierId: tier.tierId,
        sourceText: "",
        reason: "exact-source-text-unavailable",
      }));
      for (const roll of rolls) {
        pushBlocker(candidate, craftBlocker({
          affixId: affix.affixId,
          tierId: tier.tierId,
          sourceText: "",
          reason: "exact-source-text-unavailable",
          roll,
        }));
      }
      continue;
    }

    const sourceTextLines = sourceLines(sourceText);
    const templateLines = sourceLines(record.en?.renderTemplate ?? sourceText);
    const rollByKey = new Map(rolls.map((roll) => [roll.key, roll]));
    const validRollKeys = new Set();
    const templateByRollKey = new Map();

    for (const [lineIndex, templateLine] of templateLines.entries()) {
      for (const rollKey of placeholders(templateLine)) {
        templateByRollKey.set(rollKey, templateLine);
        const roll = rollByKey.get(rollKey);
        const rollAlias = tier.activeLocaleAliases?.rolls?.[rollKey];
        if (roll && rollAlias && registry.refs[rollAlias] === sourceRecordKey) {
          validRollKeys.add(rollKey);
          continue;
        }
        if (roll) {
          pushBlocker(candidate, craftBlocker({
            affixId: affix.affixId,
            tierId: tier.tierId,
            sourceText: sourceTextLines[lineIndex] ?? sourceText,
            reason: "exact-roll-alias-mismatch",
            roll,
          }));
        }
      }
    }

    for (const [lineIndex, line] of sourceTextLines.entries()) {
      const templateLine = templateLines[lineIndex] ?? line;
      const lineRollKeys = [...new Set(placeholders(templateLine))].filter((rollKey) => (
        validRollKeys.has(rollKey)
      ));
      const semantic = parseCraftSpecificLine(line, templateLine);
      for (const semanticBlocker of semantic.blockers) {
        pushBlocker(candidate, craftBlocker({
          affixId: affix.affixId,
          tierId: tier.tierId,
          sourceText: line,
          reason: semanticBlocker.reason,
        }));
      }
      for (const semanticEffect of semantic.effects) {
        const rollKey = pickRollKey(semanticEffect, lineRollKeys, rollByKey);
        const roll = rollKey ? rollByKey.get(rollKey) : null;
        if (lineRollKeys.length > 0 && !roll) {
          pushBlocker(candidate, craftBlocker({
            affixId: affix.affixId,
            tierId: tier.tierId,
            sourceText: line,
            reason: "effect-roll-mapping-unresolved",
          }));
          continue;
        }
        pushEffect(candidate, craftEffect({
          affixId: affix.affixId,
          tierId: tier.tierId,
          semanticEffect,
          renderTemplate: templateLine,
          sourceRecordKey,
          sourceModifierId: record.sourceModifierId,
          roll,
        }));
      }
    }

    for (const roll of rolls) {
      const fieldKey = tlidbGearCraftRollFieldKey(affix.affixId, tier.tierId, roll.key);
      if (parsedRollKeys.has(fieldKey) || blockedRollKeys.has(fieldKey)) continue;
      const templateLine = templateByRollKey.get(roll.key) ?? record.en?.renderTemplate ?? sourceText;
      pushBlocker(candidate, craftBlocker({
        affixId: affix.affixId,
        tierId: tier.tierId,
        sourceText,
        reason: conditionRoll(sourceText, roll) || conditionPlaceholder(templateLine, roll.key)
          ? "condition-roll-runtime-required"
          : "roll-to-effect-mapping-unresolved",
        roll,
      }));
    }

    if (stateFor(candidate).effects === 0 && stateFor(candidate).blockers === 0) {
      pushBlocker(candidate, craftBlocker({
        affixId: affix.affixId,
        tierId: tier.tierId,
        sourceText,
        reason: "tier-semantics-unaccounted",
      }));
    }
  }

  const uniqueRolls = [...runtime.tiers.values()].reduce(
    (count, candidate) => count + (candidate.tier.rollDefs?.length ?? 0),
    0,
  );
  const blockerReasons = {};
  for (const blocker of blockers) increment(blockerReasons, blocker.reason);
  let fullyParsedTiers = 0;
  let partiallyParsedTiers = 0;
  let blockedTiers = 0;
  for (const state of tierStates.values()) {
    if (state.effects > 0 && state.blockers === 0) fullyParsedTiers += 1;
    else if (state.effects > 0) partiallyParsedTiers += 1;
    else blockedTiers += 1;
  }
  const accountedRollKeys = new Set([...parsedRollKeys, ...blockedRollKeys]);
  const audit = {
    season: "SS13",
    sourceAuthority: "exact-current-tlidb-active-gear-stable-tier-and-roll-alias",
    items: gear.length,
    itemsWithCraft: runtime.itemsWithCraft,
    affixInstances: runtime.affixInstances,
    tierInstances: runtime.tierInstances,
    rollInstances: runtime.rollInstances,
    uniqueAffixes: runtime.affixIds.size,
    uniqueTiers: runtime.tiers.size,
    uniqueRolls,
    exactAuthorityTiers,
    exactAuthorityRolls,
    authorityBlockedTiers,
    authorityBlockedRolls,
    fullyParsedTiers,
    partiallyParsedTiers,
    blockedTiers,
    parsedRolls: parsedRollKeys.size,
    blockedRolls: blockedRollKeys.size,
    accountedTiers: accountedTierKeys.size,
    accountedRolls: accountedRollKeys.size,
    effects: effects.length,
    blockers: blockers.length,
    blockerReasons,
    accountingComplete: accountedTierKeys.size === runtime.tiers.size
      && accountedRollKeys.size === uniqueRolls,
    calculationComplete: blockers.length === 0,
  };

  return { effects, blockers, audit };
}

export const parseTlidbGearCraftTooltips = createTlidbGearCraftTooltipCalculation;
