import { parseTlidbOtherTooltipCalculation } from "./tlidbOtherTooltipCalculation.js";

const LOCALE_ORDER = Object.freeze(["ko", "en", "cn"]);
const EXACT_DETAIL_STATUSES = new Set(["exact", "exact-structural"]);
const TRACE_VERSION = "tlidb-talent-projection-v1";
const UNVERIFIED_STRUCTURAL_PROJECTION_REASON = /(?:value-authority-unverified|structural-transform-value-authority-unverified)/u;

function freezeNested(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeNested));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, freezeNested(entry)]),
  ));
}

function freezeResult(effects, blockers, authorityTraceKeys) {
  return Object.freeze({
    effects: Object.freeze(effects.map(freezeNested)),
    blockers: Object.freeze(blockers.map(freezeNested)),
    authorityTraceKeys: Object.freeze([...authorityTraceKeys]),
  });
}

function blocker(type, reason, entry, extra = {}) {
  return {
    type,
    reason,
    projectionEntryId: entry?.id ?? null,
    sourceItemId: entry?.sourceItemId ?? null,
    sourceText: String(entry?.rawText ?? "").trim(),
    ...extra,
  };
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
    && record.detail.trim().length > 0;
}

function resolveParserLocale(item) {
  for (const localeKey of LOCALE_ORDER) {
    const record = item?.tlidbText?.[localeKey];
    if (currentSs13Locale(record) && hasCompleteReceipt(record, localeKey)) {
      return { localeKey, record };
    }
  }
  return null;
}

function traceSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function createTlidbTalentProjectionAuthorityTraceKey(
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
  ].join(":");
}

function effectScope(stat) {
  const normalized = String(stat ?? "").toLocaleLowerCase("en-US");
  const actor = normalized.startsWith("minion_") ? "minion" : "self";
  const unscoped = normalized.replace(/^minion_/u, "");
  const skillTypes = [];
  if (/(?:^|_)attack_and_(?:spell|cast)(?:_|$)/u.test(unscoped)) {
    skillTypes.push("attack", "spell");
  } else {
    if (/(?:^|_)attack(?:_|$)/u.test(unscoped)) skillTypes.push("attack");
    if (/(?:^|_)(?:spell|cast)(?:_|$)/u.test(unscoped)) skillTypes.push("spell");
  }
  return {
    actor,
    skillTypes: skillTypes.length ? skillTypes : ["all"],
  };
}

function scaledRoll(roll, multiplier) {
  if (!roll) return null;
  const values = [Number(roll.min) * multiplier, Number(roll.max) * multiplier];
  if (!values.every(Number.isFinite)) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
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
    conditionMetadata: effect.conditionMetadata ?? null,
    per: effect.per ?? null,
  });
}

function hasCondition(effect) {
  return Boolean(
    effect.condition
    || effect.conditionText
    || effect.conditionRequirements?.length
    || effect.conditionMetadata
    || effect.per,
  );
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

function catalogItemIndex(talentItems) {
  const index = new Map();
  for (const item of talentItems ?? []) {
    if (item?.categoryId && item.categoryId !== "talents") continue;
    const id = String(item?.id ?? "").trim();
    if (!id) continue;
    const bucket = index.get(id) ?? [];
    bucket.push(item);
    index.set(id, bucket);
  }
  return index;
}

/**
 * Connects selected talent-board projection entries to exact current TLIDB flat
 * talent lines. It deliberately does not evaluate conditions or choose rolls.
 */
export function adaptTlidbTalentProjectionEffects(projection, talentItems) {
  if (projection?.active !== true) return freezeResult([], [], new Set());

  const entries = Array.isArray(projection?.entries) ? projection.entries : [];
  const selectedIds = new Set(
    (Array.isArray(projection?.selectionIds) ? projection.selectionIds : [])
      .map(String)
      .filter(Boolean),
  );
  const entryCounts = projectionEntryCounts(entries);
  const itemsById = catalogItemIndex(talentItems);
  const parseCache = new Map();
  const effects = [];
  const blockers = [];
  const authorityTraceKeys = new Set();
  const emittedEffectKeys = new Set();
  const duplicateEntryIdsReported = new Set();

  for (const entry of entries) {
    const entryId = String(entry?.id ?? "").trim();
    const sourceItemId = String(entry?.sourceItemId ?? "").trim();
    if (!entryId) {
      blockers.push(blocker("matching", "talent-projection-entry-id-missing", entry));
      continue;
    }
    if ((entryCounts.get(entryId) ?? 0) > 1) {
      if (!duplicateEntryIdsReported.has(entryId)) {
        duplicateEntryIdsReported.add(entryId);
        blockers.push(blocker("duplicate", "duplicate-talent-projection-entry-id", entry));
      }
      continue;
    }
    if (UNVERIFIED_STRUCTURAL_PROJECTION_REASON.test(
      String(entry?.calculationAuthorityReason ?? ""),
    )) {
      blockers.push(blocker(
        "authority",
        entry.calculationAuthorityReason,
        entry,
      ));
      continue;
    }
    if (!sourceItemId || !selectedIds.has(sourceItemId)) {
      blockers.push(blocker("matching", "talent-projection-entry-not-selected", entry));
      continue;
    }

    const candidates = itemsById.get(sourceItemId) ?? [];
    if (!candidates.length) {
      blockers.push(blocker("matching", "talent-flat-source-item-not-found", entry));
      continue;
    }
    if (candidates.length > 1) {
      blockers.push(blocker("duplicate", "duplicate-talent-flat-source-item", entry, {
        candidateCount: candidates.length,
      }));
      continue;
    }

    const item = candidates[0];
    const locale = resolveParserLocale(item);
    if (!locale) {
      const parsed = parseTlidbOtherTooltipCalculation({ ...item, categoryId: "talents" });
      for (const parsedBlocker of parsed.blockers) {
        blockers.push(blocker("authority", parsedBlocker.reason, entry, {
          sourceText: parsedBlocker.sourceText,
        }));
      }
      if (!parsed.blockers.length) {
        blockers.push(blocker("authority", "current-ss13-talent-source-receipt-unavailable", entry));
      }
      continue;
    }

    const sourceText = String(entry.rawText ?? "").trim();
    const sourceLines = locale.record.detail.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    const matchingLineIndexes = sourceLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line === sourceText)
      .map(({ index }) => index);
    if (!matchingLineIndexes.length) {
      blockers.push(blocker("matching", "talent-projection-source-line-not-found", entry, {
        locale: locale.localeKey,
        sourceRecordKey: locale.record.sourceRecordKey,
      }));
      continue;
    }
    if (matchingLineIndexes.length > 1) {
      blockers.push(blocker("duplicate", "duplicate-talent-source-line-match", entry, {
        locale: locale.localeKey,
        sourceRecordKey: locale.record.sourceRecordKey,
        matchingLineIndexes,
      }));
      continue;
    }

    const multiplier = Number(entry.multiplier);
    if (!Number.isFinite(multiplier) || multiplier < 0) {
      blockers.push(blocker("matching", "invalid-talent-projection-multiplier", entry, {
        multiplier: entry.multiplier ?? null,
      }));
      continue;
    }

    let parsed = parseCache.get(sourceItemId);
    if (!parsed) {
      parsed = parseTlidbOtherTooltipCalculation({ ...item, categoryId: "talents" });
      parseCache.set(sourceItemId, parsed);
    }
    const sourceLineIndex = matchingLineIndexes[0];
    const parsedEffects = parsed.effects.filter((effect) => effect.sourceText === sourceText);
    const parsedBlockers = parsed.blockers.filter((candidate) => candidate.sourceText === sourceText);
    for (const parsedBlocker of parsedBlockers) {
      blockers.push(blocker("parser", parsedBlocker.reason, entry, {
        sourceText: parsedBlocker.sourceText,
      }));
    }
    if (!parsedEffects.length && !parsedBlockers.length) {
      blockers.push(blocker("matching", "talent-projection-source-line-not-accounted", entry, {
        locale: locale.localeKey,
        sourceRecordKey: locale.record.sourceRecordKey,
        sourceLineIndex,
      }));
      continue;
    }

    const authorityTraceKey = createTlidbTalentProjectionAuthorityTraceKey(
      entry,
      item,
      locale.record.sourceRecordKey,
      sourceLineIndex,
    );
    const fingerprints = new Set();
    for (const [effectIndex, parsedEffect] of parsedEffects.entries()) {
      const fingerprint = effectFingerprint(parsedEffect);
      if (fingerprints.has(fingerprint)) {
        blockers.push(blocker("duplicate", "duplicate-talent-projected-effect", entry, {
          authorityTraceKey,
          stat: parsedEffect.stat,
          operation: parsedEffect.operation,
        }));
        continue;
      }
      fingerprints.add(fingerprint);

      const traceKey = [
        authorityTraceKey,
        `effect-${effectIndex}`,
        traceSegment(parsedEffect.stat),
        traceSegment(parsedEffect.operation),
      ].join(":");
      if (emittedEffectKeys.has(traceKey)) {
        blockers.push(blocker("duplicate", "duplicate-talent-projected-effect-trace", entry, {
          authorityTraceKey,
          traceKey,
        }));
        continue;
      }
      emittedEffectKeys.add(traceKey);
      authorityTraceKeys.add(authorityTraceKey);

      const roll = scaledRoll(parsedEffect.roll, multiplier);
      const effect = {
        ...parsedEffect,
        value: parsedEffect.value == null ? null : Number(parsedEffect.value) * multiplier,
        ...(parsedEffect.roll ? { roll } : {}),
        ...(parsedEffect.rollKey ? { sourceRollKey: parsedEffect.rollKey } : {}),
        ...(parsedEffect.roll ? { rollKey: `${authorityTraceKey}:roll:${effectIndex}` } : {}),
        multiplier,
        scope: effectScope(parsedEffect.stat),
        projectionEntryId: entryId,
        boardIndex: entry.boardIndex ?? null,
        origin: entry.origin ?? null,
        sourceItemId,
        sourceUrl: locale.record.sourceUrl,
        sourceRecordKey: locale.record.sourceRecordKey,
        sourcePageSha256: locale.record.sourcePageSha256,
        sourceLineIndex,
        authorityTraceKey,
        traceKey,
        replacesDirectStatAuthority: Boolean(entry.calculationValueAuthority),
      };
      effects.push(effect);

      if (hasCondition(parsedEffect)) {
        blockers.push(blocker("condition", "talent-effect-condition-input-required", entry, {
          authorityTraceKey,
          traceKey,
          stat: parsedEffect.stat,
        }));
      }
      if (parsedEffect.roll) {
        blockers.push(blocker("range", "talent-effect-range-roll-required", entry, {
          authorityTraceKey,
          traceKey,
          rollKey: effect.rollKey,
          roll,
        }));
      }
    }
  }

  return freezeResult(effects, blockers, authorityTraceKeys);
}
