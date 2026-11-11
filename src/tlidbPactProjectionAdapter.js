import { diagnoseConditions } from "./conditionModel.js";
import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";
import { parseTlidbOtherTooltipCalculation } from "./tlidbOtherTooltipCalculation.js";

const LOCALE_ORDER = Object.freeze(["ko", "en", "cn"]);
const EXACT_DETAIL_STATUSES = new Set(["exact", "exact-structural"]);
const TRACE_VERSION = "tlidb-pact-projection-v1";
const PACT_BRANCH_MICRO_FATE_EFFECT_STAT = "pact_branch_micro_fate_effect";
const SCALABLE_MICRO_FATE_OPERATIONS = new Set(["add", "increase"]);

function freezeNested(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeNested));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, freezeNested(entry)]),
  ));
}

function freezeResult(
  effects,
  blockers,
  authorityTraceKeys,
  accounting,
  verifiedSourceIdentities,
  runtimeContext = {},
) {
  return Object.freeze({
    effects: Object.freeze(effects.map(freezeNested)),
    blockers: Object.freeze(blockers.map(freezeNested)),
    authorityTraceKeys: Object.freeze([...authorityTraceKeys]),
    accounting: freezeNested(accounting),
    verifiedSourceIdentities: freezeNested(verifiedSourceIdentities),
    runtimeContext: freezeNested(runtimeContext),
  });
}

export function getVerifiedPactProjectionSourceIdentity(
  effectProjection,
  sourceKind,
  sourceId,
) {
  const collection = sourceKind === "entry"
    ? effectProjection?.verifiedSourceIdentities?.entries
    : sourceKind === "rule"
      ? effectProjection?.verifiedSourceIdentities?.rules
      : [];
  const identityKey = sourceKind === "entry" ? "projectionEntryId" : "ruleId";
  const matches = (Array.isArray(collection) ? collection : []).filter((identity) => (
    identity?.[identityKey] === sourceId
  ));
  if (matches.length !== 1) return null;
  const [{ sourceItemId, sourceUrl }] = matches;
  if (!sourceItemId || !sourceUrl) return null;
  return { sourceItemId, sourceUrl };
}

function currentSs13Locale(record) {
  const evidence = record?.sourceSeasonEvidence;
  if (evidence?.verificationComplete !== true) return false;
  if (evidence?.actualSeason != null && Number(evidence.actualSeason) !== 13) return false;
  const declaredVersions = [
    record?.sourcePageVersion,
    evidence?.sourcePageVersion,
    record?.activeBaselineSeason,
    evidence?.activeBaselineSeason,
  ].filter((version) => typeof version === "string" && /^SS\d+(?:\.\d+)?$/u.test(version));
  if (declaredVersions.some((version) => version !== "SS13")) return false;
  return declaredVersions.includes("SS13") || Number(evidence?.actualSeason) === 13;
}

function hasCompleteReceipt(record, localeKey) {
  return record?.sourceUrl?.startsWith(`https://tlidb.com/${localeKey}/`)
    && typeof record?.sourceRecordKey === "string"
    && record.sourceRecordKey.length > 0
    && /^[a-f0-9]{64}$/iu.test(record?.sourcePageSha256 ?? "")
    && EXACT_DETAIL_STATUSES.has(record?.sourceFieldStatus?.detail)
    && typeof record?.detail === "string"
    && record.detail.trim().length > 0
    && currentSs13Locale(record);
}

function exactLocales(item) {
  return LOCALE_ORDER.flatMap((localeKey) => {
    const record = item?.tlidbText?.[localeKey];
    return hasCompleteReceipt(record, localeKey) ? [{ localeKey, record }] : [];
  });
}

function nonemptyLines(text) {
  return String(text ?? "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function traceSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function createTlidbPactProjectionAuthorityTraceKey(
  entry,
  item,
  sourceRecordKey,
  sourceLineIndex,
) {
  return [
    TRACE_VERSION,
    traceSegment(entry?.id),
    traceSegment(item?.id),
    traceSegment(sourceRecordKey),
    `line-${Number(sourceLineIndex)}`,
    `fragment-${Number(entry?.metadata?.pact_effect_fragment_index ?? 0)}`,
  ].join(":");
}

function blocker(type, reason, entry, extra = {}) {
  return {
    type,
    reason,
    projectionEntryId: entry?.id ?? null,
    categoryId: entry?.categoryId ?? null,
    runtimeSourceId: entry?.sourceDataId ?? null,
    locationKey: entry?.locationKey ?? null,
    sourceText: String(entry?.rawText ?? entry?.sourceRawText ?? "").trim(),
    ...extra,
  };
}

function blockerKey(value) {
  return JSON.stringify({
    type: value.type,
    reason: value.reason,
    projectionEntryId: value.projectionEntryId,
    ruleId: value.ruleId,
    sourceText: value.sourceText,
    rollKey: value.rollKey,
    traceKey: value.traceKey,
  });
}

function pushBlocker(blockers, seen, value) {
  const key = blockerKey(value);
  if (seen.has(key)) return;
  seen.add(key);
  blockers.push(value);
}

function roundedDerivedValue(value) {
  return Math.round(value * 1e12) / 1e12;
}

function resolvePactBranchMicroFateEffects(effects, blockers, blockerKeys) {
  const modifiers = effects.filter(({ stat }) => stat === PACT_BRANCH_MICRO_FATE_EFFECT_STAT);
  if (!modifiers.length) return effects;

  const targetEffects = effects.filter(({ stat }) => stat !== PACT_BRANCH_MICRO_FATE_EFFECT_STAT);
  const unresolvedModifiers = modifiers.filter(({ calculationReady }) => !calculationReady);
  const derivedEffects = [];

  for (const modifier of modifiers.filter(({ calculationReady }) => calculationReady)) {
    const sourceSlotId = modifier.selectionMetadata?.pact_spirit_slot_id;
    const sameBranchMicroEffects = targetEffects.filter((target) => (
      target.calculationReady
      && target.destinySlotType === "micro"
      && target.selectionMetadata?.pact_spirit_slot_id === sourceSlotId
    ));

    for (const target of sameBranchMicroEffects) {
      if (!SCALABLE_MICRO_FATE_OPERATIONS.has(target.operation)) {
        pushBlocker(blockers, blockerKeys, blocker(
          "operation",
          "pact-branch-micro-fate-operation-unverified",
          null,
          {
            projectionEntryId: modifier.projectionEntryId,
            categoryId: modifier.categoryId,
            runtimeSourceId: modifier.runtimeSourceId,
            flatCatalogItemId: modifier.flatCatalogItemId,
            locationKey: modifier.locationKey,
            sourceText: modifier.sourceText,
            sourceUrl: modifier.sourceUrl,
            stat: target.stat,
            operation: target.operation,
            targetProjectionEntryId: target.projectionEntryId,
          },
        ));
        continue;
      }

      const derivedValue = Number(target.value) * Number(modifier.value) / 100;
      if (!Number.isFinite(derivedValue)) {
        pushBlocker(blockers, blockerKeys, blocker(
          "value",
          "pact-branch-micro-fate-derived-value-unavailable",
          null,
          {
            projectionEntryId: modifier.projectionEntryId,
            categoryId: modifier.categoryId,
            runtimeSourceId: modifier.runtimeSourceId,
            flatCatalogItemId: modifier.flatCatalogItemId,
            locationKey: modifier.locationKey,
            sourceText: modifier.sourceText,
            sourceUrl: modifier.sourceUrl,
            stat: target.stat,
            targetProjectionEntryId: target.projectionEntryId,
          },
        ));
        continue;
      }

      derivedEffects.push({
        ...modifier,
        stat: target.stat,
        operation: target.operation,
        value: roundedDerivedValue(derivedValue),
        unit: target.unit,
        scope: target.scope,
        ...(target.skillDamageApplicability
          ? { skillDamageApplicability: target.skillDamageApplicability }
          : {}),
        ...(target.condition ? { condition: target.condition } : {}),
        ...(target.conditionRequirements
          ? { conditionRequirements: target.conditionRequirements }
          : {}),
        ...(target.conditionMetadata ? { conditionMetadata: target.conditionMetadata } : {}),
        ...(target.per ? { per: target.per } : {}),
        ...(target.equipmentRequirements
          ? { equipmentRequirements: target.equipmentRequirements }
          : {}),
        traceKey: `${modifier.traceKey}:micro-fate:${traceSegment(target.traceKey)}`,
        derivedFromProjectionEntryId: target.projectionEntryId,
        derivedFromRuntimeSourceId: target.runtimeSourceId,
        derivedFromTraceKey: target.traceKey,
        targetDestinyType: target.destinyType,
        targetDestinySlotType: target.destinySlotType,
        targetSelectionMetadata: { ...target.selectionMetadata },
        effectMultiplier: Number(modifier.value) / 100,
      });
    }
  }

  return [...targetEffects, ...unresolvedModifiers, ...derivedEffects];
}

function projectionEntryCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const id = String(entry?.id ?? "").trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function recordCandidates(model, entry) {
  const records = entry?.categoryId === "spirits"
    ? model?.spirits
    : entry?.categoryId === "destiny"
      ? model?.destinies
      : [];
  const sourceId = String(entry?.sourceDataId ?? "").trim();
  return (Array.isArray(records) ? records : []).filter(({ id }) => id === sourceId);
}

function verifiedRuleSourceIdentity(model, rule) {
  const records = rule?.categoryId === "spirits"
    ? model?.spirits
    : rule?.categoryId === "destiny"
      ? model?.destinies
      : [];
  const sourceItemId = String(rule?.sourceItemId ?? "").trim();
  const sourceUrl = String(rule?.sourceUrl ?? "").trim();
  if (!sourceItemId && !sourceUrl) return { provided: false, verified: false };
  const declaredRuntimeId = String(rule?.sourceDataId ?? rule?.destinyId ?? "").trim();
  const matches = (Array.isArray(records) ? records : []).filter((record) => (
    record?.catalogId === sourceItemId
    && record?.catalogItem?.id === sourceItemId
    && record?.sourceUrl === sourceUrl
    && (!declaredRuntimeId || [record.id, record.catalogId].includes(declaredRuntimeId))
  ));
  return matches.length === 1
    ? { provided: true, verified: true, flatCatalogItemId: sourceItemId, sourceUrl }
    : { provided: true, verified: false };
}

function validateRuntimeSelection(record, entry) {
  if (entry.categoryId === "spirits") {
    const runtimeId = entry?.metadata?.pact_spirit_slug;
    const requestRuntimeId = entry?.requestEntry?.pactspirit_slug;
    const level = Number(entry?.metadata?.pact_spirit_level);
    const requestLevel = Number(entry?.requestEntry?.level);
    if (
      runtimeId !== record.id
      || (entry?.requestEntry != null && requestRuntimeId !== record.id)
    ) {
      return "pact-spirit-runtime-id-mismatch";
    }
    if (
      !Number.isInteger(level)
      || level < 1
      || level > 6
      || (entry?.requestEntry != null && requestLevel !== level)
    ) {
      return "pact-spirit-level-selection-mismatch";
    }
    return null;
  }
  if (entry.categoryId === "destiny") {
    const runtimeId = entry?.metadata?.pact_destiny_id;
    const requestRuntimeId = entry?.requestEntry?.destiny_id;
    if (runtimeId !== record.id || requestRuntimeId !== record.id) {
      return "pact-destiny-runtime-id-mismatch";
    }
    return null;
  }
  return "unsupported-pact-projection-category";
}

function resolveSourceLine(item, entry, authority) {
  const candidateTexts = [...new Set([
    String(entry?.rawText ?? "").trim(),
    String(entry?.sourceRawText ?? "").trim(),
  ].filter(Boolean))];
  let matchedSourceText = "";
  let matches = [];
  for (const candidateText of candidateTexts) {
    const candidateMatches = exactLocales(item).flatMap(({ localeKey, record }) => (
      nonemptyLines(record.detail).flatMap((line, index) => (
        line === candidateText ? [{ localeKey, record, index }] : []
      ))
    ));
    if (!candidateMatches.length) continue;
    matchedSourceText = candidateText;
    matches = candidateMatches;
    break;
  }
  if (!matches.length) return { reason: "pact-projection-source-line-not-found" };
  const matchingIndexes = [...new Set(matches.map(({ index }) => index))];
  if (matchingIndexes.length !== 1) {
    return { reason: "duplicate-pact-source-line-position", matchingIndexes };
  }

  const authorityLocale = exactLocales(item).find(({ record }) => (
    record.sourceUrl === authority?.sourceUrl
  ));
  if (!authorityLocale) return { reason: "pact-authority-locale-receipt-unavailable" };
  const sourceLineIndex = matchingIndexes[0];
  const authorityLines = nonemptyLines(authorityLocale.record.detail);
  const authorityLine = authorityLines[sourceLineIndex];
  if (!authorityLine) return { reason: "pact-locale-line-topology-mismatch", sourceLineIndex };
  if (authorityLines.filter((line) => line === authorityLine).length !== 1) {
    return { reason: "duplicate-pact-authority-source-line", sourceLineIndex };
  }
  if (matches.some(({ record }) => record.sourceRecordKey !== authorityLocale.record.sourceRecordKey)) {
    return { reason: "pact-locale-source-record-mismatch", sourceLineIndex };
  }
  return {
    sourceLineIndex,
    authorityLine,
    authorityLocaleKey: authorityLocale.localeKey,
    authorityRecord: authorityLocale.record,
    matchedLocaleKeys: matches.map(({ localeKey }) => localeKey),
    matchedSourceText,
  };
}

function groupKey(entry) {
  return [
    entry?.categoryId,
    entry?.locationKey,
    entry?.sourceDataId,
    entry?.sourceRawText,
    entry?.metadata?.pact_spirit_instance_id ?? entry?.metadata?.pact_destiny_instance_id,
    entry?.metadata?.pact_spirit_level_affix_index ?? 0,
  ].join("\u0000");
}

function projectionGroups(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = groupKey(entry);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function selectFragmentEffects(group, entry, parsedEffects) {
  const fragments = group.map((candidate) => Number(
    candidate?.metadata?.pact_effect_fragment_index ?? 0,
  ));
  const authorityEffectIndexes = group.map((candidate) => Number(
    candidate?.metadata?.pact_authority_effect_index,
  ));
  const hasAuthorityEffectIndexes = authorityEffectIndexes.every((index) => (
    Number.isInteger(index) && index >= 0
  ));
  if (hasAuthorityEffectIndexes) {
    const authorityEffectKeys = new Set(group.map((candidate, index) => (
      `${fragments[index]}:${authorityEffectIndexes[index]}`
    )));
    if (authorityEffectKeys.size !== group.length) {
      return { reason: "duplicate-or-invalid-pact-authority-effect-index" };
    }
    if (group.length === 1) {
      return { selected: parsedEffects.map((effect, index) => ({ effect, parsedEffectIndex: index })) };
    }
    const uniqueAuthorityEffectIndexes = new Set(authorityEffectIndexes);
    const orderedAuthorityEffectIndexes = [...uniqueAuthorityEffectIndexes].sort((left, right) => left - right);
    const contiguousAuthorityEffectIndexes = orderedAuthorityEffectIndexes.every((value, index) => (
      index === 0 || value === orderedAuthorityEffectIndexes[index - 1] + 1
    ));
    if (
      new Set(fragments).size !== 1
      || parsedEffects.length !== group.length
      || uniqueAuthorityEffectIndexes.size !== group.length
      || !contiguousAuthorityEffectIndexes
    ) {
      return {
        reason: "pact-projection-authority-effect-cardinality-ambiguous",
        fragmentCount: group.length,
        parsedEffectCount: parsedEffects.length,
      };
    }
    const authorityEffectIndex = Number(entry.metadata.pact_authority_effect_index);
    const lineEffectIndex = orderedAuthorityEffectIndexes.indexOf(authorityEffectIndex);
    return {
      selected: [{
        effect: parsedEffects[lineEffectIndex],
        parsedEffectIndex: lineEffectIndex,
      }],
    };
  }
  const unique = new Set(fragments);
  if (unique.size !== fragments.length || fragments.some((index) => !Number.isInteger(index) || index < 0)) {
    return { reason: "duplicate-or-invalid-pact-effect-fragment-index" };
  }
  if (group.length === 1) {
    return { selected: parsedEffects.map((effect, index) => ({ effect, parsedEffectIndex: index })) };
  }
  const expected = Array.from({ length: group.length }, (_, index) => index);
  if (
    parsedEffects.length !== group.length
    || expected.some((index) => !unique.has(index))
  ) {
    return {
      reason: "pact-projection-fragment-effect-cardinality-ambiguous",
      fragmentCount: group.length,
      parsedEffectCount: parsedEffects.length,
    };
  }
  const fragmentIndex = Number(entry.metadata.pact_effect_fragment_index);
  return {
    selected: [{ effect: parsedEffects[fragmentIndex], parsedEffectIndex: fragmentIndex }],
  };
}

function effectFingerprint(effect) {
  return JSON.stringify({
    stat: effect.stat,
    operation: effect.operation,
    value: effect.value,
    roll: effect.roll ?? null,
    unit: effect.unit,
    condition: effect.condition ?? null,
    conditionText: effect.conditionText ?? null,
    conditionRequirements: effect.conditionRequirements ?? null,
    equipmentRequirements: effect.equipmentRequirements ?? null,
    skillDamageApplicability: effect.skillDamageApplicability ?? null,
    conditionMetadata: effect.conditionMetadata ?? null,
    per: effect.per ?? null,
  });
}

function effectScope(stat) {
  const normalized = String(stat ?? "").toLocaleLowerCase("en-US");
  const actor = normalized.startsWith("self_and_minion_")
    ? "self-and-minion"
    : normalized.startsWith("minion_")
      ? "minion"
      : "self";
  const unscoped = normalized.replace(/^(?:self_and_minion_|minion_)/u, "");
  const skillTypes = [];
  if (/(?:^|_)attack_and_(?:spell|cast)(?:_|$)/u.test(unscoped)) {
    skillTypes.push("attack", "spell");
  } else {
    if (/(?:^|_)attack(?:_|$)/u.test(unscoped)) skillTypes.push("attack");
    if (/(?:^|_)(?:spell|cast)(?:_|$)/u.test(unscoped)) skillTypes.push("spell");
  }
  const skillTags = [];
  if (/(?:^|_)melee(?:_|$)/u.test(unscoped)) skillTags.push("melee");
  if (/(?:^|_)projectile(?:_|$)/u.test(unscoped)) skillTags.push("projectile");
  if (/(?:^|_)horizontal(?:_|$)/u.test(unscoped)) skillTags.push("horizontal");
  if (/(?:^|_)sentry(?:_|$)/u.test(unscoped)) skillTags.push("sentry");
  if (/(?:^|_)combo(?:_|$)/u.test(unscoped)) skillTags.push("combo");
  return {
    actor,
    skillTypes: skillTypes.length ? skillTypes : ["all"],
    ...(skillTags.length ? { skillTags } : {}),
  };
}

function structuralSpiritCondition(effect) {
  const metadata = effect?.conditionMetadata;
  const keys = metadata && typeof metadata === "object" ? Object.keys(metadata) : [];
  return typeof effect?.condition === "string"
    && ["base", "promotion"].includes(metadata?.section)
    && !effect.condition.includes(";")
    && keys.every((key) => key === "section")
    && !effect?.conditionText
    && !effect?.conditionRequirements?.length
    && !effect?.per;
}

function normalizeSelectionCondition(effect) {
  if (!structuralSpiritCondition(effect)) return { effect: { ...effect }, resolved: false };
  const normalized = { ...effect };
  const text = normalized.condition;
  delete normalized.condition;
  normalized.selectionCondition = {
    text,
    section: normalized.conditionMetadata.section,
    resolution: "resolved-by-selected-pact-affix",
  };
  return { effect: normalized, resolved: true };
}

function structuralDualKismetCondition(effect, entry) {
  const metadata = effect?.conditionMetadata;
  const keys = metadata && typeof metadata === "object" ? Object.keys(metadata) : [];
  return entry?.categoryId === "destiny"
    && entry?.metadata?.pact_destiny_type === "dual_kismet"
    && entry?.metadata?.pact_destiny_pair_status === "active_paired"
    && typeof effect?.condition === "string"
    && /^(?:계약 보드에 해당 천명이|해당 천명이 계약 보드에)\s*2개(?:가| 있는| 있을| 있으면)[^:。.]*?(?:활성화|효과)[^:。.]*$/u.test(effect.condition)
    && metadata?.requiredCount === 2
    && keys.every((key) => key === "requiredCount")
    && !effect?.conditionText
    && !effect?.conditionRequirements?.length
    && (!effect?.per || effect.per.path === "pact.distinctInstalledDestinyCount");
}

function normalizeDualKismetCondition(effect, entry) {
  if (!structuralDualKismetCondition(effect, entry)) {
    return { effect: { ...effect }, resolved: false };
  }
  const normalized = { ...effect };
  const text = normalized.condition;
  delete normalized.condition;
  delete normalized.conditionMetadata;
  normalized.selectionCondition = {
    text,
    requiredCount: 2,
    resolution: "resolved-by-active-dual-kismet-pair",
  };
  return { effect: normalized, resolved: true };
}

function hasUnresolvedCondition(effect) {
  if (typeof effect?.condition === "string" || effect?.conditionText) return true;
  const requirements = Array.isArray(effect?.conditionRequirements)
    && effect.conditionRequirements.length
    ? effect.conditionRequirements
    : effect?.condition && typeof effect.condition === "object"
      ? [effect.condition]
      : [];
  if (!requirements.length) return Boolean(effect?.condition);
  if (requirements.some((requirement) => (
    !requirement
    || typeof requirement !== "object"
    || typeof requirement.path !== "string"
  ))) return true;
  return diagnoseConditions(undefined, requirements).unsupported.length > 0;
}

function projectionSelectedDestinyIds(projection) {
  const ids = new Set();
  const add = (value) => {
    if (typeof value === "string" && value) ids.add(value);
  };
  for (const request of projection?.requests ?? []) {
    const entry = request?.requestEntry;
    add(entry?.destiny_id);
    add(entry?.destiny?.destiny_id);
    for (const slot of entry?.slots ?? []) add(slot?.installed_destiny?.destiny_id);
  }
  for (const rule of projection?.rules ?? []) {
    if (["dual_kismet_pair", "ss13_destiny_value_unverified", "ss13_destiny_structure_mismatch"].includes(rule?.origin)) {
      add(rule?.destinyId ?? rule?.sourceDataId);
    }
  }
  for (const entry of projection?.entries ?? []) {
    if (entry?.categoryId === "destiny") add(entry?.sourceDataId);
  }
  return ids;
}

function hasVerifiedDistinctDestinyContext(projection) {
  const runtimeContext = projection?.runtimeContext;
  const ids = runtimeContext?.distinctInstalledDestinyIds;
  const count = runtimeContext?.distinctInstalledDestinyCount;
  if (
    !Array.isArray(ids)
    || ids.some((id) => typeof id !== "string" || !id)
    || new Set(ids).size !== ids.length
    || !Number.isInteger(count)
    || count !== ids.length
  ) return false;
  const selectedIds = projectionSelectedDestinyIds(projection);
  return selectedIds.size === ids.length && ids.every((id) => selectedIds.has(id));
}

function hasUnresolvedPerUnitInput(effect, projection) {
  if (!effect?.per) return false;
  if (typeof effect.per !== "object" || typeof effect.per.path !== "string") return true;
  if (effect.per.path === "pact.distinctInstalledDestinyCount") {
    return !hasVerifiedDistinctDestinyContext(projection);
  }
  return diagnoseConditions(undefined, [{
    path: effect.per.path,
    operator: "atLeast",
    expected: 0,
  }]).unsupported.length > 0;
}

function hasStackInput(effect) {
  const metadata = effect?.conditionMetadata;
  return Boolean(
    metadata?.maxStacks
    || metadata?.perTrigger
    || metadata?.stacks
  );
}

function exactSpiritBaseAffix(record, entry) {
  const base = String(record?.calculationMainAffix?.effect ?? "").trim();
  return Boolean(base) && base === String(entry?.sourceRawText ?? "").trim();
}

function rollValueIsValid(value, definition) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;
  if (numeric < Number(definition.min) || numeric > Number(definition.max)) return false;
  const step = Number(definition.step ?? 1);
  if (!Number.isFinite(step) || step <= 0) return false;
  const units = (numeric - Number(definition.min)) / step;
  return Math.abs(units - Math.round(units)) < 1e-8;
}

function rangeDefinition(record, parsedEffects, targetEffect) {
  const targetIndex = parsedEffects.indexOf(targetEffect);
  if (targetIndex < 0) return null;
  const rangeIndex = parsedEffects
    .slice(0, targetIndex + 1)
    .filter(({ roll }) => Boolean(roll)).length - 1;
  return rangeIndex >= 0 ? record?.rollDefs?.[rangeIndex] ?? null : null;
}

function validateDestinyRollKeys(record, entry, blockers, seen) {
  if (entry.categoryId !== "destiny") return;
  const expected = new Set((record?.rollDefs ?? []).map(({ key }) => key));
  const values = entry?.requestEntry?.roll_values;
  const actual = values && typeof values === "object" && !Array.isArray(values)
    ? Object.keys(values)
    : [];
  for (const key of expected) {
    if (!actual.includes(key)) {
      pushBlocker(blockers, seen, blocker(
        "range",
        "pact-destiny-roll-selection-required",
        entry,
        { rollKey: key },
      ));
    }
  }
  for (const key of actual) {
    if (!expected.has(key)) {
      pushBlocker(blockers, seen, blocker(
        "range",
        "pact-destiny-roll-key-unrecognized",
        entry,
        { rollKey: key },
      ));
    }
  }
}

function fallbackParsed(item, categoryId) {
  return parseTlidbOtherTooltipCalculation({ ...item, categoryId });
}

/**
 * Adapts actual pact-spirit/destiny projection entries to exact current TLIDB
 * tooltip effects. Runtime IDs, selected levels, instance rolls, actor/skill
 * scopes, and replacement metadata are retained. Unresolved semantics remain
 * visible as typed blockers and are never marked calculationReady.
 */
export function adaptTlidbPactProjectionEffects(projection, model) {
  const entries = Array.isArray(projection?.entries) ? projection.entries : [];
  const rules = Array.isArray(projection?.rules) ? projection.rules : [];
  const entryCounts = projectionEntryCounts(entries);
  const groups = projectionGroups(entries);
  const effects = [];
  const blockers = [];
  const blockerKeys = new Set();
  const authorityTraceKeys = new Set();
  const emittedTraceKeys = new Set();
  const consumedEntryIds = new Set();
  const directProjectionEntryIds = new Set();
  const duplicateEntryIdsReported = new Set();
  const parsedCache = new Map();
  const verifiedEntrySourceIdentities = [];
  const verifiedRuleSourceIdentities = [];

  for (const rule of rules) {
    const sourceIdentity = verifiedRuleSourceIdentity(model, rule);
    if (sourceIdentity.provided && !sourceIdentity.verified) {
      pushBlocker(blockers, blockerKeys, blocker(
        "authority",
        "pact-rule-source-identity-mismatch",
        null,
        {
          ruleId: rule.id ?? null,
          categoryId: rule.categoryId ?? null,
          runtimeSourceId: rule.sourceDataId ?? rule.destinyId ?? null,
          locationKey: rule.locationKey ?? null,
          sourceText: "",
        },
      ));
    }
    if (sourceIdentity.verified) {
      verifiedRuleSourceIdentities.push({
        ruleId: rule.id ?? null,
        sourceItemId: sourceIdentity.flatCatalogItemId,
        sourceUrl: sourceIdentity.sourceUrl,
      });
    }
    if (rule?.applied !== false) continue;
    pushBlocker(blockers, blockerKeys, blocker(
      "rule",
      rule.inactiveReason || rule.status || "pact-projection-rule-unresolved",
      null,
      {
        ruleId: rule.id ?? null,
        categoryId: rule.categoryId ?? null,
        runtimeSourceId: rule.sourceDataId ?? rule.destinyId ?? null,
        flatCatalogItemId: sourceIdentity.verified ? sourceIdentity.flatCatalogItemId : null,
        sourceUrl: sourceIdentity.verified ? sourceIdentity.sourceUrl : null,
        locationKey: rule.locationKey ?? null,
        origin: rule.origin ?? null,
        sourceText: "",
      },
    ));
  }

  for (const entry of entries) {
    const entryId = String(entry?.id ?? "").trim();
    if (!entryId) {
      pushBlocker(blockers, blockerKeys, blocker(
        "matching",
        "pact-projection-entry-id-missing",
        entry,
      ));
      continue;
    }
    if ((entryCounts.get(entryId) ?? 0) > 1) {
      if (!duplicateEntryIdsReported.has(entryId)) {
        duplicateEntryIdsReported.add(entryId);
        pushBlocker(blockers, blockerKeys, blocker(
          "duplicate",
          "duplicate-pact-projection-entry-id",
          entry,
        ));
      }
      continue;
    }
    if (!["spirits", "destiny"].includes(entry?.categoryId)) {
      pushBlocker(blockers, blockerKeys, blocker(
        "matching",
        "unsupported-pact-projection-category",
        entry,
      ));
      continue;
    }

    const candidates = recordCandidates(model, entry);
    if (!candidates.length) {
      pushBlocker(blockers, blockerKeys, blocker(
        "matching",
        "pact-runtime-source-record-not-found",
        entry,
      ));
      continue;
    }
    if (candidates.length > 1) {
      pushBlocker(blockers, blockerKeys, blocker(
        "duplicate",
        "duplicate-pact-runtime-source-record",
        entry,
        { candidateCount: candidates.length },
      ));
      continue;
    }
    const record = candidates[0];
    const item = record?.catalogItem;
    if (!item || !record.catalogId || item.id !== record.catalogId) {
      pushBlocker(blockers, blockerKeys, blocker(
        "matching",
        "pact-flat-catalog-record-not-found",
        entry,
        { catalogId: record?.catalogId ?? null },
      ));
      continue;
    }
    if (entry.sourceItemId !== item.id) {
      pushBlocker(blockers, blockerKeys, blocker(
        "authority",
        "pact-projection-source-item-id-mismatch",
        entry,
        { catalogId: item.id, declaredSourceItemId: entry.sourceItemId ?? null },
      ));
      continue;
    }
    if (record.sourceUrl !== entry.sourceUrl) {
      pushBlocker(blockers, blockerKeys, blocker(
        "authority",
        "pact-projection-source-url-mismatch",
        entry,
        { catalogId: item.id, catalogSourceUrl: record.sourceUrl },
      ));
      continue;
    }
    verifiedEntrySourceIdentities.push({
      projectionEntryId: entryId,
      sourceItemId: item.id,
      sourceUrl: record.sourceUrl,
    });
    const selectionProblem = validateRuntimeSelection(record, entry);
    if (selectionProblem) {
      pushBlocker(blockers, blockerKeys, blocker(
        "matching",
        selectionProblem,
        entry,
        { catalogId: item.id },
      ));
      continue;
    }
    if (entry.categoryId === "destiny" && record.valueAuthority !== true) {
      pushBlocker(blockers, blockerKeys, blocker(
        "authority",
        record.valueAuthorityBlockerCode || "current-destiny-effect-semantics-unverified",
        entry,
        { catalogId: item.id },
      ));
      continue;
    }

    const cacheKey = `${entry.categoryId}\u0000${item.id}`;
    let parsed = parsedCache.get(cacheKey);
    if (!parsed) {
      const authority = getTlidbCalculationAuthority({ ...item, categoryId: entry.categoryId });
      const fallback = authority ? null : fallbackParsed(item, entry.categoryId);
      parsed = {
        authority,
        effects: authority?.parsedEffects ?? fallback?.effects ?? [],
        blockers: authority?.parserBlockers ?? fallback?.blockers ?? [],
      };
      parsedCache.set(cacheKey, parsed);
    }
    if (!parsed.authority) {
      const relevant = parsed.blockers.filter(({ sourceText }) => (
        String(entry.sourceRawText ?? "").includes(sourceText)
        || String(entry.rawText ?? "") === sourceText
      ));
      for (const parsedBlocker of relevant) {
        pushBlocker(blockers, blockerKeys, blocker(
          "parser",
          parsedBlocker.reason,
          entry,
          { sourceText: parsedBlocker.sourceText },
        ));
      }
      if (!relevant.length) {
        pushBlocker(blockers, blockerKeys, blocker(
          "authority",
          "current-ss13-pact-source-authority-unavailable",
          entry,
          { catalogId: item.id },
        ));
      }
      continue;
    }

    const source = resolveSourceLine(item, entry, parsed.authority);
    if (source.reason) {
      pushBlocker(blockers, blockerKeys, blocker(
        "matching",
        source.reason,
        entry,
        {
          catalogId: item.id,
          matchingIndexes: source.matchingIndexes,
          sourceLineIndex: source.sourceLineIndex,
        },
      ));
      continue;
    }
    const lineEffects = parsed.effects.filter(({ sourceText }) => sourceText === source.authorityLine);
    const lineBlockers = parsed.blockers.filter(({ sourceText }) => sourceText === source.authorityLine);
    for (const parsedBlocker of lineBlockers) {
      pushBlocker(blockers, blockerKeys, blocker(
        "parser",
        parsedBlocker.reason,
        entry,
        {
          sourceText: parsedBlocker.sourceText,
          sourceLineIndex: source.sourceLineIndex,
        },
      ));
    }
    if (!lineEffects.length) {
      if (!lineBlockers.length) {
        pushBlocker(blockers, blockerKeys, blocker(
          "matching",
          "pact-projection-source-line-not-accounted",
          entry,
          {
            catalogId: item.id,
            sourceLineIndex: source.sourceLineIndex,
          },
        ));
      }
      continue;
    }

    let projectionGroup = groups.get(groupKey(entry)) ?? [entry];
    if (
      source.matchedSourceText === String(entry.rawText ?? "").trim()
      && String(entry.sourceRawText ?? "").trim() !== String(entry.rawText ?? "").trim()
    ) {
      projectionGroup = projectionGroup.filter((candidate) => (
        String(candidate.rawText ?? "").trim() === source.matchedSourceText
      ));
    }
    const fragment = selectFragmentEffects(projectionGroup, entry, lineEffects);
    if (fragment.reason) {
      pushBlocker(blockers, blockerKeys, blocker(
        "duplicate",
        fragment.reason,
        entry,
        {
          fragmentCount: fragment.fragmentCount,
          parsedEffectCount: fragment.parsedEffectCount,
        },
      ));
      continue;
    }

    consumedEntryIds.add(entryId);
    if (entry.calculationValueAuthority) directProjectionEntryIds.add(entryId);
    validateDestinyRollKeys(record, entry, blockers, blockerKeys);
    const authorityTraceKey = createTlidbPactProjectionAuthorityTraceKey(
      entry,
      item,
      source.authorityRecord.sourceRecordKey,
      source.sourceLineIndex,
    );
    const entryFingerprints = new Set();

    for (const { effect: parsedEffect, parsedEffectIndex } of fragment.selected) {
      const fingerprint = effectFingerprint(parsedEffect);
      if (entryFingerprints.has(fingerprint)) {
        pushBlocker(blockers, blockerKeys, blocker(
          "duplicate",
          "duplicate-pact-projected-effect",
          entry,
          { authorityTraceKey, stat: parsedEffect.stat, operation: parsedEffect.operation },
        ));
        continue;
      }
      entryFingerprints.add(fingerprint);
      const traceKey = [
        authorityTraceKey,
        `effect-${parsedEffectIndex}`,
        traceSegment(parsedEffect.stat),
        traceSegment(parsedEffect.operation),
      ].join(":");
      if (emittedTraceKeys.has(traceKey)) {
        pushBlocker(blockers, blockerKeys, blocker(
          "duplicate",
          "duplicate-pact-projected-effect-trace",
          entry,
          { authorityTraceKey, traceKey },
        ));
        continue;
      }
      emittedTraceKeys.add(traceKey);
      authorityTraceKeys.add(authorityTraceKey);

      const normalizedCondition = entry.categoryId === "spirits"
        ? normalizeSelectionCondition(parsedEffect)
        : normalizeDualKismetCondition(parsedEffect, entry);
      const output = normalizedCondition.effect;
      let calculationReady = lineBlockers.length === 0;
      let selectedRoll = null;
      let selectionRollKey = null;

      if (parsedEffect.roll) {
        const definition = rangeDefinition(record, parsed.effects, parsedEffect);
        if (
          !definition
          || Number(definition.min) !== Number(parsedEffect.roll.min)
          || Number(definition.max) !== Number(parsedEffect.roll.max)
        ) {
          calculationReady = false;
          pushBlocker(blockers, blockerKeys, blocker(
            "range",
            "pact-roll-range-authority-mismatch",
            entry,
            { authorityTraceKey, traceKey },
          ));
        } else {
          selectionRollKey = definition.key;
          const value = entry?.requestEntry?.roll_values?.[definition.key];
          if (!rollValueIsValid(value, definition)) {
            calculationReady = false;
            pushBlocker(blockers, blockerKeys, blocker(
              "range",
              value === undefined
                ? "pact-destiny-roll-selection-required"
                : "pact-destiny-roll-selection-invalid",
              entry,
              {
                authorityTraceKey,
                traceKey,
                rollKey: definition.key,
                roll: { min: definition.min, max: definition.max, step: definition.step },
              },
            ));
          } else {
            selectedRoll = Number(value);
            output.value = selectedRoll;
          }
        }
      } else if (output.value == null || !Number.isFinite(Number(output.value))) {
        calculationReady = false;
        pushBlocker(blockers, blockerKeys, blocker(
          "value",
          "pact-effect-value-unavailable",
          entry,
          { authorityTraceKey, traceKey, stat: output.stat },
        ));
      }

      if (entry.categoryId === "spirits" && !exactSpiritBaseAffix(record, entry)) {
        calculationReady = false;
        pushBlocker(blockers, blockerKeys, blocker(
          "level",
          record.valueAuthorityBlockerCode || "current-pact-spirit-level-semantics-unverified",
          entry,
          {
            authorityTraceKey,
            traceKey,
            pactLevel: entry.metadata.pact_spirit_level,
          },
        ));
      }
      if (hasUnresolvedCondition(output)) {
        calculationReady = false;
        pushBlocker(blockers, blockerKeys, blocker(
          "condition",
          "pact-effect-condition-input-required",
          entry,
          { authorityTraceKey, traceKey, stat: output.stat },
        ));
      }
      if (hasUnresolvedPerUnitInput(output, projection)) {
        calculationReady = false;
        pushBlocker(blockers, blockerKeys, blocker(
          "stack",
          "pact-effect-per-unit-input-required",
          entry,
          { authorityTraceKey, traceKey, stat: output.stat },
        ));
      }
      if (hasStackInput(output)) {
        calculationReady = false;
        pushBlocker(blockers, blockerKeys, blocker(
          "stack",
          "pact-effect-stack-input-required",
          entry,
          { authorityTraceKey, traceKey, stat: output.stat },
        ));
      }

      effects.push({
        ...output,
        calculationReady,
        scope: effectScope(output.stat),
        projectionEntryId: entryId,
        categoryId: entry.categoryId,
        origin: entry.origin ?? null,
        locationKey: entry.locationKey ?? null,
        runtimeSourceId: record.id,
        flatCatalogItemId: item.id,
        instanceId: entry.categoryId === "spirits"
          ? entry.metadata.pact_spirit_instance_id
          : entry.metadata.pact_destiny_instance_id,
        ...(entry.categoryId === "spirits" ? {
          pactLevel: entry.metadata.pact_spirit_level,
          pactLevelAffixIndex: entry.metadata.pact_spirit_level_affix_index,
        } : {
          destinyType: entry.metadata.pact_destiny_type,
          destinySlotType: entry.metadata.pact_destiny_slot_type,
          destinyScope: entry.metadata.pact_destiny_scope,
        }),
        ...(parsedEffect.rollKey ? { sourceRollKey: parsedEffect.rollKey } : {}),
        ...(selectionRollKey ? { selectionRollKey, selectedRoll } : {}),
        sourceUrl: source.authorityRecord.sourceUrl,
        sourceRecordKey: source.authorityRecord.sourceRecordKey,
        sourcePageSha256: source.authorityRecord.sourcePageSha256,
        sourceLineIndex: source.sourceLineIndex,
        sourceLocale: source.authorityLocaleKey,
        matchedSourceLocales: source.matchedLocaleKeys,
        selectionMetadata: { ...entry.metadata },
        selectionRequest: entry.requestEntry == null ? null : { ...entry.requestEntry },
        authorityTraceKey,
        traceKey,
        replacesProjectionEntry: true,
        replacesDirectStatAuthority: Boolean(entry.calculationValueAuthority),
      });
    }
  }

  const resolvedEffects = resolvePactBranchMicroFateEffects(effects, blockers, blockerKeys);
  const unaccountedEntryIds = entries
    .map(({ id }) => id)
    .filter((id) => id && !consumedEntryIds.has(id));
  const readyEffectCount = resolvedEffects.filter(({ calculationReady }) => calculationReady).length;
  return freezeResult(
    resolvedEffects,
    blockers,
    authorityTraceKeys,
    {
      projectionEntryCount: entries.length,
      consumedProjectionEntryIds: [...consumedEntryIds],
      replacesDirectProjectionEntryIds: [...directProjectionEntryIds],
      unaccountedProjectionEntryIds: [...new Set(unaccountedEntryIds)],
      readyEffectCount,
      blockedEffectCount: effects.length - readyEffectCount,
      preventsLegacyProjectionReapplication: true,
    },
    {
      entries: verifiedEntrySourceIdentities,
      rules: verifiedRuleSourceIdentities,
    },
    projection.runtimeContext,
  );
}
