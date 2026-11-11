import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";
import { parseTlidbOtherTooltipCalculation } from "./tlidbOtherTooltipCalculation.js";
import {
  TLIDB_REGAIN_INTERVAL_CAPABILITY,
  TLIDB_REGAIN_PER_HIT_CAPABILITY,
} from "./tlidbTooltipStatMapping.js";
import {
  getHadesTalentSemanticRecord,
  resolveHadesBanishmentProfile,
  resolveHadesTalent,
} from "./hadesCalculationRuntime.js";

const LOCALE_ORDER = Object.freeze(["ko", "en", "cn"]);
const EXACT_DETAIL_STATUSES = new Set(["exact", "exact-structural"]);
const TRACE_VERSION = "tlidb-divinity-projection-v1";

const TLIDB_DIVINITY_PAGE_SHA256 = (
  "cb4fbd049e85a9fa0489864c0e88ab49bc6d8639d0d2fa0d9260597ca61c69e9"
);
const LIFE_RETURN_STATS = Object.freeze(["life_return"]);
const SHIELD_RETURN_STATS = Object.freeze(["shield_return"]);
const LIFE_AND_SHIELD_RETURN_STATS = Object.freeze(["life_return", "shield_return"]);
const HADES_LIFE_AND_SHIELD_REGAIN_STATS = Object.freeze([
  "life_regain",
  "energy_shield_regain",
]);

function regainSourceContract(
  sourceItemId,
  sourceRecordKey,
  stats,
  sourcePageSha256 = TLIDB_DIVINITY_PAGE_SHA256,
) {
  return Object.freeze({
    sourceItemId,
    sourceRecordKey,
    sourcePageSha256,
    stats,
  });
}

const TLIDB_DIVINITY_REGAIN_SOURCE_CONTRACTS = Object.freeze([
  regainSourceContract("slates-divinity-talent-27", "data-id:10050200:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-32", "data-id:10060200:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-57", "data-id:11040200:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-62", "data-id:11050200:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-85", "data-id:12020400:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-90", "data-id:12030400:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-122", "data-id:13030300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-127", "data-id:13040300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-161", "data-id:14040300:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-196", "data-id:20060300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-193", "data-id:20070300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-258", "data-id:22030300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-263", "data-id:22040300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-296", "data-id:23030300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-297", "data-id:23040300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-301", "data-id:23060300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-369", "data-id:30050300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-365", "data-id:30060300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-397", "data-id:31040400:regular", SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-402", "data-id:31050400:regular", SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-427", "data-id:32030300:regular", SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-432", "data-id:32040300:regular", SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-491", "data-id:34040400:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-509", "data-id:34050400:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-543", "data-id:40060300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-546", "data-id:40070300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-606", "data-id:42050400:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-608", "data-id:42060400:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-662", "data-id:44030300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-667", "data-id:44040300:regular", LIFE_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-668", "data-id:44040400:regular", SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-733", "data-id:51040400:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-736", "data-id:51050400:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-930", "data-id:62030300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract("slates-divinity-talent-935", "data-id:62040300:regular", LIFE_AND_SHIELD_RETURN_STATS),
  regainSourceContract(
    "slates-tlidb-data-id-90000115",
    "data-talent-id:90000115",
    HADES_LIFE_AND_SHIELD_REGAIN_STATS,
    "2290b64b0fe75c17ccdabfb07de17e7d64ef6a9f4b1316d47d9a28963af21418",
  ),
]);

export const TLIDB_DIVINITY_REGAIN_CAPABILITY = Object.freeze({
  id: TLIDB_REGAIN_PER_HIT_CAPABILITY,
  sourceContracts: TLIDB_DIVINITY_REGAIN_SOURCE_CONTRACTS,
});

const TLIDB_DIVINITY_REGAIN_INTERVAL_SOURCE_CONTRACTS = Object.freeze([
  regainSourceContract(
    "slates-divinity-talent-165",
    "data-id:14050300:regular",
    Object.freeze(["life_regain_interval"]),
  ),
  regainSourceContract(
    "slates-divinity-talent-280",
    "data-id:23001300:core",
    Object.freeze(["regain_interval"]),
  ),
  regainSourceContract(
    "slates-divinity-talent-310",
    "data-id:23050200:regular",
    Object.freeze(["regain_interval"]),
  ),
  regainSourceContract(
    "slates-divinity-talent-402",
    "data-id:31050400:regular",
    Object.freeze(["shield_regain_interval"]),
  ),
]);

export const TLIDB_DIVINITY_REGAIN_INTERVAL_CAPABILITY = Object.freeze({
  id: TLIDB_REGAIN_INTERVAL_CAPABILITY,
  sourceContracts: TLIDB_DIVINITY_REGAIN_INTERVAL_SOURCE_CONTRACTS,
});

const TLIDB_DIVINITY_RECENT_REGAIN_CAPABILITY = "tlidb-divinity-recent-regain-condition";
const TLIDB_RECENT_REGAIN_CONDITION_REQUIREMENT = Object.freeze({
  id: "refund_recently",
  label: "최근 반환",
  path: "recentFlags.refund_recently",
  operator: "truthy",
  expected: true,
});
const TLIDB_DIVINITY_RECENT_REGAIN_EFFECT_CONTRACTS = Object.freeze([
  Object.freeze({
    sourceItemId: "slates-divinity-talent-299",
    sourceRecordKey: "data-id:23050100:regular",
    sourcePageSha256: TLIDB_DIVINITY_PAGE_SHA256,
    sourceText: "최근 8초 안에 반환이 존재했을 경우 대미지 +12 %",
    stat: "damage",
    operation: "increase",
    value: 12,
  }),
  Object.freeze({
    sourceItemId: "slates-divinity-talent-298",
    sourceRecordKey: "data-id:23060100:regular",
    sourcePageSha256: TLIDB_DIVINITY_PAGE_SHA256,
    sourceText: "최근 8초 안에 반환이 존재했을 경우 공격 대미지 +24 %",
    stat: "attack_damage",
    operation: "increase",
    value: 24,
  }),
  Object.freeze({
    sourceItemId: "slates-divinity-talent-302",
    sourceRecordKey: "data-id:23060200:regular",
    sourcePageSha256: TLIDB_DIVINITY_PAGE_SHA256,
    sourceText: "최근 8초 안에 반환이 존재했을 경우 주술 대미지 +24 %",
    stat: "spell_damage",
    operation: "increase",
    value: 24,
  }),
]);

const TLIDB_REGAIN_RESOURCE_BY_STAT = new Map([
  ["life_regain", "life"],
  ["life_return", "life"],
  ["energy_shield_regain", "shield"],
  ["shield_regain", "shield"],
  ["shield_return", "shield"],
]);
const TLIDB_REGAIN_INTERVAL_RESOURCE_BY_STAT = new Map([
  ["life_regain_interval", "life"],
  ["shield_regain_interval", "shield"],
  ["regain_interval", "both"],
]);

function affectedRegainStatsForText(value) {
  const text = String(value ?? "");
  return [
    ...(text.includes("HP 반환") ? ["life_return"] : []),
    ...(text.includes("보호막 반환") ? ["shield_return"] : []),
  ];
}

function freezeNested(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freezeNested));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, freezeNested(entry)]),
  ));
}

function freezeResult({
  effects,
  blockers,
  authorityTraceKeys,
  suppressedEntryIds,
  mechanics = [],
  hadesAccounting = [],
}) {
  const readyEffects = effects.filter(({ calculationReady }) => calculationReady);
  const unresolvedMechanicStatuses = new Set(["scenario", "source-conflict", "input-required"]);
  const mechanicCalculationComplete = mechanics.every((mechanic) => (
    mechanic.status === "inactive"
    || (
      mechanic.kind === "calculated-effects"
      && (mechanic.effects ?? []).length > 0
      && mechanic.effects.every(({ calculationReady }) => calculationReady === true)
    )
  ));
  const calculationComplete = blockers.length === 0
    && effects.every(({ calculationReady }) => calculationReady)
    && mechanics.every(({ status }) => !unresolvedMechanicStatuses.has(status))
    && mechanicCalculationComplete;
  const ruleCoverageComplete = hadesAccounting.every((entry) => (
    entry.ruleCoverageComplete === true
  ));
  return Object.freeze({
    complete: calculationComplete,
    effects: Object.freeze(effects.map(freezeNested)),
    readyEffects: Object.freeze(readyEffects.map(freezeNested)),
    blockers: Object.freeze(blockers.map(freezeNested)),
    mechanics: Object.freeze(mechanics.map(freezeNested)),
    hades: Object.freeze({
      active: hadesAccounting.length > 0,
      mechanics: Object.freeze(mechanics.map(freezeNested)),
      accounting: Object.freeze(hadesAccounting.map(freezeNested)),
    }),
    authorityTraceKeys: Object.freeze([...authorityTraceKeys]),
    suppressedDirectProjectionEntryIds: Object.freeze([...suppressedEntryIds]),
    audit: Object.freeze({
      projectedEffects: effects.length,
      readyEffects: readyEffects.length,
      blockers: blockers.length,
      semanticMechanics: mechanics.length,
      calculationComplete,
      ruleCoverageComplete,
      hadesAtomicSelections: hadesAccounting.length,
      suppressedDirectProjectionEntries: suppressedEntryIds.size,
    }),
  });
}

function outputBlocker(type, reason, entry, extra = {}) {
  const sourceInstanceId = extra.sourceInstanceId
    ?? entry?.sourceInstanceId
    ?? entry?.metadata?.divinity_source_instance_id
    ?? entry?.instanceId
    ?? null;
  const sourceSlotKey = extra.sourceSlotKey
    ?? entry?.sourceSlotKey
    ?? entry?.metadata?.divinity_source_slot_key
    ?? entry?.slotKey
    ?? null;
  return {
    type,
    reason,
    projectionEntryId: entry?.projectionEntryId ?? entry?.id ?? null,
    sourceItemId: entry?.sourceItemId ?? null,
    instanceId: entry?.instanceId ?? null,
    slotKey: entry?.slotKey ?? null,
    sourceInstanceId,
    sourceSlotKey,
    sourceText: String(extra.sourceText ?? entry?.rawText ?? "").trim(),
    ...extra,
  };
}

function enforceRegainCapability(effects, blockers) {
  return effects.map((effect) => {
    const resource = TLIDB_REGAIN_RESOURCE_BY_STAT.get(effect.stat);
    if (resource) {
      const authorized = isAuthorizedRegainSourceStat(
        effect.sourceItemId,
        effect.sourceRecordKey,
        effect.sourcePageSha256,
        effect.stat,
      );
      if (authorized) {
        return {
          ...effect,
          calculationCapability: TLIDB_DIVINITY_REGAIN_CAPABILITY.id,
          calculationCapabilityResource: resource,
        };
      }
      blockers.push(outputBlocker(
        "capability",
        "divinity-regain-source-not-authorized",
        effect,
        {
          projectionEntryId: effect.projectionEntryId ?? null,
          sourceRecordKey: effect.sourceRecordKey ?? null,
          sourceText: effect.sourceText ?? "",
          stat: effect.stat,
        },
      ));
      return { ...effect, calculationReady: false };
    }

    const intervalResource = TLIDB_REGAIN_INTERVAL_RESOURCE_BY_STAT.get(effect.stat);
    if (!intervalResource) return effect;
    const authorized = isAuthorizedRegainIntervalSourceStat(
      effect.sourceItemId,
      effect.sourceRecordKey,
      effect.sourcePageSha256,
      effect.stat,
    );
    if (authorized) {
      return {
        ...effect,
        calculationCapability: TLIDB_DIVINITY_REGAIN_INTERVAL_CAPABILITY.id,
        calculationCapabilityResource: intervalResource,
      };
    }
    blockers.push(outputBlocker(
      "capability",
      "divinity-regain-interval-source-not-authorized",
      effect,
      {
        projectionEntryId: effect.projectionEntryId ?? null,
        sourceRecordKey: effect.sourceRecordKey ?? null,
        sourceText: effect.sourceText ?? "",
        stat: effect.stat,
      },
    ));
    return { ...effect, calculationReady: false };
  });
}

function isAuthorizedRegainSourceStat(sourceItemId, sourceRecordKey, sourcePageSha256, stat) {
  return TLIDB_DIVINITY_REGAIN_CAPABILITY.sourceContracts.some((contract) => (
    sourceItemId === contract.sourceItemId
    && sourceRecordKey === contract.sourceRecordKey
    && sourcePageSha256 === contract.sourcePageSha256
    && contract.stats.includes(stat)
  ));
}

function isAuthorizedRegainIntervalSourceStat(
  sourceItemId,
  sourceRecordKey,
  sourcePageSha256,
  stat,
) {
  return TLIDB_DIVINITY_REGAIN_INTERVAL_CAPABILITY.sourceContracts.some((contract) => (
    sourceItemId === contract.sourceItemId
    && sourceRecordKey === contract.sourceRecordKey
    && sourcePageSha256 === contract.sourcePageSha256
    && contract.stats.includes(stat)
  ));
}

function recentRegainEffectContract(
  sourceItemId,
  sourceRecordKey,
  sourcePageSha256,
  sourceText,
  effect,
) {
  return TLIDB_DIVINITY_RECENT_REGAIN_EFFECT_CONTRACTS.find((contract) => (
    sourceItemId === contract.sourceItemId
    && sourceRecordKey === contract.sourceRecordKey
    && sourcePageSha256 === contract.sourcePageSha256
    && sourceText === contract.sourceText
    && effect?.stat === contract.stat
    && effect?.operation === contract.operation
    && Number(effect?.value) === contract.value
  )) ?? null;
}

function bindRecentRegainCondition(effect, contract) {
  if (!contract) return effect;
  return {
    ...effect,
    calculationCapability: TLIDB_DIVINITY_RECENT_REGAIN_CAPABILITY,
    condition: {
      ...TLIDB_RECENT_REGAIN_CONDITION_REQUIREMENT,
      text: contract.sourceText,
    },
    conditionText: contract.sourceText,
    conditionRequirements: [{ ...TLIDB_RECENT_REGAIN_CONDITION_REQUIREMENT }],
  };
}

function currentSs13Locale(record) {
  const evidence = record?.sourceSeasonEvidence;
  if (evidence?.verificationComplete !== true) return false;
  if (evidence?.actualSeason != null && Number(evidence.actualSeason) !== 13) return false;
  const versions = [
    record?.sourcePageVersion,
    evidence?.sourcePageVersion,
    record?.activeBaselineSeason,
    evidence?.activeBaselineSeason,
  ].filter((value) => typeof value === "string" && /^SS\d+(?:\.\d+)?$/u.test(value));
  if (versions.some((value) => value !== "SS13")) return false;
  return versions.includes("SS13") || Number(evidence?.actualSeason) === 13;
}

function completeLocaleReceipt(record, localeKey) {
  return record?.sourceUrl?.startsWith(`https://tlidb.com/${localeKey}/`)
    && typeof record?.sourceRecordKey === "string"
    && record.sourceRecordKey.length > 0
    && /^[a-f0-9]{64}$/iu.test(record?.sourcePageSha256 ?? "")
    && EXACT_DETAIL_STATUSES.has(record?.sourceFieldStatus?.detail)
    && typeof record?.detail === "string"
    && record.detail.trim().length > 0;
}

function resolveExactLocale(item) {
  for (const localeKey of LOCALE_ORDER) {
    const record = item?.tlidbText?.[localeKey];
    if (currentSs13Locale(record) && completeLocaleReceipt(record, localeKey)) {
      return { localeKey, record };
    }
  }
  return null;
}

function normalizedAuthorityItem(item) {
  const tlidbText = Object.fromEntries(Object.entries(item?.tlidbText ?? {}).map(([key, record]) => [
    key,
    record && typeof record === "object"
      ? {
          ...record,
          sourcePageVersion: record.sourcePageVersion
            ?? record.sourceSeasonEvidence?.sourcePageVersion,
        }
      : record,
  ]));
  return { ...item, categoryId: "slates", tlidbText };
}

function traceSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function createTlidbDivinityProjectionAuthorityTraceKey(
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

function selectionId(selection) {
  return String(selection?.valueId ?? selection?.sourceItemId ?? selection?.id ?? "").trim();
}

function selectionKey(selection) {
  return [
    selection?.instanceId ?? "",
    selection?.slotKey ?? "",
    selectionId(selection),
  ].join("\u0000");
}

function projectionEntryCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const id = String(entry?.id ?? "").trim();
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function effectiveSelectionIndex(projection) {
  const index = new Map();
  for (const selection of projection?.overview?.effectiveAffixes ?? []) {
    const key = selectionKey(selection);
    const bucket = index.get(key) ?? [];
    bucket.push(selection);
    index.set(key, bucket);
  }
  return index;
}

function itemIndex(slateItems) {
  const index = new Map();
  for (const item of slateItems ?? []) {
    if (item?.categoryId && item.categoryId !== "slates") continue;
    const id = String(item?.id ?? "").trim();
    if (!id) continue;
    const bucket = index.get(id) ?? [];
    bucket.push(item);
    index.set(id, bucket);
  }
  return index;
}

function pointCount(selection) {
  const values = [selection?.pointCount, selection?.points, selection?.point]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number);
  const distinct = [...new Set(values)];
  if (distinct.length > 1) return { reason: "divinity-selection-point-count-conflict" };
  const value = distinct[0] ?? 1;
  if (!Number.isInteger(value) || value <= 0) {
    return { reason: "divinity-selection-point-count-invalid", value };
  }
  return { value };
}

function selectionConfig(selection) {
  const config = selection?.config ?? selection?.pointConfig;
  if (config === null || config === undefined) return { value: {} };
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { reason: "divinity-selection-config-invalid" };
  }
  return { value: config };
}

function selectionEffectMultiplier(selection, entry) {
  const values = [selection?.effectMultiplier, entry?.multiplier]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return { reason: "divinity-effect-multiplier-invalid" };
  }
  const distinct = [...new Set(values)];
  if (distinct.length > 1) {
    return { reason: "divinity-effect-multiplier-conflict", values: distinct };
  }
  return { value: distinct[0] ?? 1 };
}

const HADES_ENGINE_READY_STATS = new Set([
  "strength",
  "dexterity",
  "intelligence",
  "armor",
  "evasion",
  "fire_resistance",
  "cold_resistance",
  "lightning_resistance",
  "erosion_resistance",
  "max_energy_shield",
  "attack_and_cast_speed",
  "movement_speed",
  "critical_strike_damage",
  "skill_area",
  "aura_effect",
  "sealed_mana_compensation",
  "double_damage_chance",
  "elemental_and_erosion_resistance_penetration",
  "armor_damage_mitigation_penetration",
  "life_regeneration",
  "affliction_effect",
  "affliction_inflicted_per_second",
]);

const HADES_ENGINE_SAFE_SCOPES = new Set([
  "",
  "self",
  "minions",
  "self-and-minions",
  "self-and-minions-attacks-and-spells",
  "precise-fearless-base-effect",
]);

function hadesStableId(value) {
  const match = String(value ?? "").match(/(?:slates-tlidb-data-id-)?(9\d{7})$/u);
  return match?.[1] ?? null;
}

function isHadesSemanticSourceItemId(value) {
  return Boolean(hadesStableId(value));
}

function hadesSemanticScope(effect) {
  const scope = String(effect?.scope ?? "");
  if (scope === "minions") {
    return { actor: "minion", actors: ["minion"], skillTypes: ["all"] };
  }
  if (scope === "self-and-minions-attacks-and-spells") {
    return {
      actor: "self-and-minion",
      actors: ["self", "minion"],
      skillTypes: ["attack", "spell"],
    };
  }
  if (scope === "self-and-minions") {
    return { actor: "self-and-minion", actors: ["self", "minion"], skillTypes: ["all"] };
  }
  return { actor: "self", actors: ["self"], skillTypes: ["all"] };
}

function hadesEffectCanReachEngine(effect) {
  if (effect?.calculationReady !== true || !Number.isFinite(Number(effect?.value))) return false;
  const stat = String(effect.stat ?? "");
  const scope = String(effect.scope ?? "");
  if (!HADES_ENGINE_READY_STATS.has(stat)) return false;
  if (!HADES_ENGINE_SAFE_SCOPES.has(scope)) return false;
  if (scope === "minions") return false;
  if (
    String(effect.unit ?? "") === "percent_max_per_second"
    && stat !== "life_regeneration"
  ) return false;
  if (
    effect.roll
    && String(effect.unit ?? "") === "flat"
    && /_damage$/u.test(String(effect.stat ?? ""))
  ) return false;
  return true;
}

function authorizedHadesRegainEffect(effect, semantic, hadesState) {
  return effect?.calculationReady === true
    && finiteNumber(effect?.value) !== null
    && effect?.operation === "increase"
    && effect?.unit === "percent"
    && hadesState?.structureAuthority === true
    && isAuthorizedRegainSourceStat(
      effect.sourceItemId,
      semantic?.source?.sourceRecordKey,
      semantic?.source?.sourcePageSha256,
      effect.stat,
    );
}

function hadesProjectionStatus(status) {
  if (status === "needs-input" || status === "input-required") return "input-required";
  if (status === "source-conflict") return "source-conflict";
  if (status === "scenario") return "scenario";
  if (status === "inactive") return "inactive";
  return "applied";
}

function scaledHadesEffect(effect, scale) {
  const appliedScale = effect?.effectScaleApplied === true ? 1 : scale;
  const numericValue = finiteNumber(effect?.value);
  const sourceRoll = effect?.roll && typeof effect.roll === "object"
    ? { ...effect.roll }
    : null;
  const scaleRollValue = (value) => {
    const numeric = finiteNumber(value);
    return numeric === null ? value : numeric * appliedScale;
  };
  const scaled = {
    ...effect,
    value: numericValue === null ? null : numericValue * appliedScale,
    ...(sourceRoll ? {
      roll: Object.fromEntries(
        Object.entries(sourceRoll).map(([key, value]) => [key, scaleRollValue(value)]),
      ),
      sourceRoll,
    } : {}),
  };
  return {
    ...scaled,
    calculationReady: finiteNumber(scaled.value) !== null && hadesEffectCanReachEngine(scaled),
  };
}

function expandedHadesEffectScopes(effect) {
  if (effect?.scope !== "self-and-minions" || effect?.stat !== "damage") return [effect];
  return [
    { ...effect, scope: "self", scopePart: "self" },
    { ...effect, stat: "minion_damage", scope: "minions", scopePart: "minions" },
  ];
}

function calculatedHadesMechanic(effects, status, sourceText) {
  const numericEffects = effects.filter(({ value }) => finiteNumber(value) !== null);
  if (!numericEffects.length) return null;
  return {
    kind: "calculated-effects",
    label: sourceText,
    sourceText,
    status: hadesProjectionStatus(status),
    effects: numericEffects.map((effect) => ({
      stat: effect.stat,
      operation: effect.operation,
      value: effect.value,
      calculationReady: effect.calculationReady,
      ...(effect.unit ? { unit: effect.unit } : {}),
      ...(effect.scope ? { scope: effect.scope } : {}),
      ...(effect.roll ? { roll: effect.roll, sourceRoll: effect.sourceRoll } : {}),
      ...(effect.sourceText ? { sourceText: effect.sourceText } : {}),
      ...(Number.isInteger(effect.sourceMechanicIndex) ? {
        sourceMechanicIndex: effect.sourceMechanicIndex,
      } : {}),
    })),
  };
}

function hadesFactsForSelection(projection, selection) {
  const hades = projection?.overview?.hades;
  const sourceInstanceId = selection?.sourceInstanceId ?? selection?.instanceId;
  const facts = hades?.instances?.find(({ instanceId }) => instanceId === sourceInstanceId)
    ?? hades?.active
    ?? null;
  if (!facts) return {};
  return {
    hadesType: facts.type,
    hadesInstanceId: facts.instanceId,
    structureStatus: facts.topology?.structureStatus ?? null,
    structureAuthority: facts.topology?.structureAuthority ?? null,
    structureSourceUrl: facts.topology?.sourceUrl ?? null,
    authorityConfig: facts.authorityConfig ?? null,
    authorityActive: facts.authorityActive === true,
    judgmentActive: facts.judgment?.effectActive === true,
    judgmentLineSlateCount: facts.judgment?.linkedSlateCount ?? 0,
    contaminationActive: facts.contamination?.effectActive === true,
    contaminationBaseProjectionPercent: facts.contamination?.projectionStrengthPercent ?? 20,
    contaminationTargetSlateCount: facts.contamination?.projectedTargetSlateInstanceIds?.length ?? 0,
    banishmentActive: facts.banishment?.effectActive === true,
    banishmentAdjacentSlateCount: facts.banishment?.adjacentSlateCount ?? 0,
    banishmentNonAdjacentSlateCount: facts.banishment?.nonAdjacentSlateCount ?? 0,
  };
}

function inferredTopologySelection(selection, entry) {
  const multiplierSource = selection?.effectMultiplierSource
    ?? entry?.metadata?.divinity_effect_multiplier_source
    ?? null;
  return entry?.affixKind === "contamination_projected"
    || selection?.affixKind === "contamination_projected"
    || multiplierSource?.structureAuthority === false;
}

function hadesSemanticNeedsTopologyScenario(semantic, hadesState, selection, entry) {
  if (hadesState?.structureAuthority === true) return false;
  return inferredTopologySelection(selection, entry)
    || ["contamination_imprint", "banishment_imprint", "judgment_imprint"]
      .includes(semantic?.category);
}

function topologyScenarioStatus(status, topologyScenario) {
  if (!topologyScenario) return status;
  return ["resolved", "applied"].includes(status) ? "scenario" : status;
}

function hadesBanishmentProfileConfig(projection, sourceInstanceId) {
  const authorityConfig = projection?.overview?.hades?.instances
    ?.find(({ instanceId }) => instanceId === sourceInstanceId)
    ?.authorityConfig;
  if (authorityConfig && typeof authorityConfig === "object" && !Array.isArray(authorityConfig)) {
    return Object.fromEntries(
      Object.entries(authorityConfig).filter(([key]) => key.startsWith("banishment")),
    );
  }
  const selections = projection?.overview?.effectiveAffixes ?? [];
  const profileSelection = selections.find((candidate) => (
    (candidate?.sourceInstanceId ?? candidate?.instanceId) === sourceInstanceId
    && candidate?.slotKey === "imprint_1"
  ));
  const config = profileSelection?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => key.startsWith("banishment")),
  );
}

function hadesEntryGroupKey(entry) {
  return [entry?.instanceId ?? "", entry?.slotKey ?? "", entry?.sourceItemId ?? ""].join("\u0000");
}

function scopeForStat(stat) {
  const normalized = String(stat ?? "").toLocaleLowerCase("en-US");
  let actors = ["self"];
  let unscoped = normalized;
  if (normalized.startsWith("self_and_minion_")) {
    actors = ["self", "minion"];
    unscoped = normalized.replace(/^self_and_minion_/u, "");
  } else if (normalized.startsWith("minion_")) {
    actors = ["minion"];
    unscoped = normalized.replace(/^minion_/u, "");
  }
  const skillTypes = [];
  if (/(?:^|_)attack_and_(?:spell|cast)(?:_|$)/u.test(unscoped)) {
    skillTypes.push("attack", "spell");
  } else {
    if (/(?:^|_)attack(?:_|$)/u.test(unscoped)) skillTypes.push("attack");
    if (/(?:^|_)(?:spell|cast)(?:_|$)/u.test(unscoped)) skillTypes.push("spell");
  }
  return {
    actor: actors.length === 2 ? "self-and-minion" : actors[0],
    actors,
    skillTypes: skillTypes.length ? skillTypes : ["all"],
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
    conditionMetadata: effect.conditionMetadata ?? null,
    per: effect.per ?? null,
  });
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function configuredRollValue(config, parsedEffect) {
  const stores = [config?.rollValues, config?.rolls].filter((value) => (
    value && typeof value === "object" && !Array.isArray(value)
  ));
  const keys = [parsedEffect.rollKey, parsedEffect.stat].filter(Boolean);
  for (const store of stores) {
    for (const key of keys) {
      if (Object.hasOwn(store, key)) return store[key];
    }
  }
  return undefined;
}

function resolveEffectValue(parsedEffect, points, config, multiplier = 1) {
  const direct = finiteNumber(parsedEffect.value);
  if (direct !== null) return { value: direct * points * multiplier, sourceValue: direct };
  const minimum = finiteNumber(parsedEffect.roll?.min);
  const maximum = finiteNumber(parsedEffect.roll?.max);
  if (minimum === null || maximum === null || minimum > maximum) {
    return { reason: "divinity-effect-value-unavailable" };
  }
  const configured = configuredRollValue(config, parsedEffect);
  const selected = configured === undefined && minimum === maximum
    ? minimum
    : finiteNumber(configured);
  if (selected === null) {
    return { reason: "divinity-effect-range-roll-required", minimum, maximum };
  }
  if (selected < minimum || selected > maximum) {
    return {
      reason: "divinity-effect-range-roll-out-of-range",
      selected,
      minimum,
      maximum,
    };
  }
  return { value: selected * points * multiplier, sourceValue: selected };
}

function runtimeBlockerReason(effect) {
  if (effect.per) return "divinity-effect-per-unit-input-required";
  if (effect.calculationCapability === TLIDB_DIVINITY_RECENT_REGAIN_CAPABILITY) return null;
  const metadata = effect.conditionMetadata;
  if (metadata?.perTrigger || metadata?.maxStacks || metadata?.requiredCount || metadata?.cap) {
    return "divinity-effect-stack-input-required";
  }
  if (
    effect.condition
    || effect.conditionText
    || effect.conditionRequirements?.length
    || metadata?.threshold
  ) return "divinity-effect-condition-input-required";
  const timingMetadataOnly = metadata
    && Object.keys(metadata).every((key) => key === "intervalSeconds");
  const unconditionalPerSecondRegeneration = [
    "life_regeneration",
    "mana_regeneration",
    "energy_shield_regeneration",
  ].includes(effect.stat)
    && ["flat_per_second", "percent_per_second", "percent_max_per_second"].includes(effect.unit)
    && metadata?.intervalSeconds === 1
    && timingMetadataOnly
    && !metadata?.durationSeconds;
  if (
    (metadata?.intervalSeconds || metadata?.durationSeconds)
    && !unconditionalPerSecondRegeneration
  ) {
    return "divinity-effect-timing-runtime-required";
  }
  if (unconditionalPerSecondRegeneration) return null;
  return metadata ? "divinity-effect-mechanic-input-required" : null;
}

function ruleBlocker(rule) {
  return outputBlocker(
    "topology",
    rule?.inactiveReason || rule?.status || "divinity-projection-rule-unresolved",
    {
      id: rule?.id ?? null,
      sourceItemId: rule?.sourceItemId ?? null,
      rawText: rule?.rawText ?? "",
    },
    {
      boardId: rule?.boardId ?? null,
      instanceId: rule?.instanceId ?? null,
      slotKey: rule?.slotKey ?? null,
    },
  );
}

/**
 * Replaces the legacy direct-stat slate projection with exact current TLIDB
 * tooltip effects. Effects with unresolved runtime inputs remain visible but
 * are excluded from readyEffects.
 */
export function adaptTlidbDivinityProjectionEffects(projection, slateItems) {
  const effects = [];
  const blockers = [];
  const mechanics = [];
  const hadesAccounting = [];
  const authorityTraceKeys = new Set();
  const suppressedEntryIds = new Set();
  if (projection?.active !== true) {
    return freezeResult({
      effects,
      blockers,
      mechanics,
      hadesAccounting,
      authorityTraceKeys,
      suppressedEntryIds,
    });
  }

  const entries = Array.isArray(projection?.entries) ? projection.entries : [];
  const counts = projectionEntryCounts(entries);
  const selectionIndex = effectiveSelectionIndex(projection);
  const slateById = itemIndex(slateItems);
  const duplicateEntryIdsReported = new Set();
  const emittedTraceKeys = new Set();
  const processedHadesGroups = new Set();
  const processedBanishmentProfiles = new Set();

  for (const rule of projection?.rules ?? []) blockers.push(ruleBlocker(rule));

  for (const entry of entries) {
    const entryId = String(entry?.id ?? "").trim();
    const sourceItemId = String(entry?.sourceItemId ?? "").trim();
    if (entryId) suppressedEntryIds.add(entryId);
    if (!entryId) {
      blockers.push(outputBlocker("matching", "divinity-projection-entry-id-missing", entry));
      continue;
    }
    if ((counts.get(entryId) ?? 0) > 1) {
      if (!duplicateEntryIdsReported.has(entryId)) {
        duplicateEntryIdsReported.add(entryId);
        blockers.push(outputBlocker("duplicate", "duplicate-divinity-projection-entry-id", entry));
      }
      continue;
    }
    if (!sourceItemId) {
      blockers.push(outputBlocker("matching", "divinity-projection-source-item-id-missing", entry));
      continue;
    }
    if (entry.affixKind === "special_effect" || entry.origin === "divinity_special_effect") {
      blockers.push(outputBlocker(
        "topology",
        "divinity-special-effect-structural-runtime-required",
        entry,
      ));
      continue;
    }

    const selected = selectionIndex.get(selectionKey({
      instanceId: entry.instanceId,
      slotKey: entry.slotKey,
      valueId: sourceItemId,
    })) ?? [];
    if (!selected.length) {
      blockers.push(outputBlocker("matching", "divinity-projection-entry-not-selected", entry));
      continue;
    }
    if (selected.length > 1) {
      blockers.push(outputBlocker("duplicate", "duplicate-divinity-effective-selection", entry, {
        candidateCount: selected.length,
      }));
      continue;
    }
    const selection = selected[0];
    const points = pointCount(selection);
    if (points.reason) {
      blockers.push(outputBlocker("config", points.reason, entry, {
        configuredPointCount: points.value ?? null,
      }));
      continue;
    }
    const config = selectionConfig(selection);
    if (config.reason) {
      blockers.push(outputBlocker("config", config.reason, entry));
      continue;
    }
    const multiplier = selectionEffectMultiplier(selection, entry);
    if (multiplier.reason) {
      blockers.push(outputBlocker("config", multiplier.reason, entry, {
        configuredMultipliers: multiplier.values ?? null,
      }));
      continue;
    }
    const topologyScenario = inferredTopologySelection(selection, entry);

    const candidates = slateById.get(sourceItemId) ?? [];
    if (!candidates.length) {
      blockers.push(outputBlocker("matching", "divinity-flat-source-item-not-found", entry));
      continue;
    }
    if (candidates.length > 1) {
      blockers.push(outputBlocker("duplicate", "duplicate-divinity-flat-source-item", entry, {
        candidateCount: candidates.length,
      }));
      continue;
    }
    const item = candidates[0];
    const locale = resolveExactLocale(item);
    if (!locale) {
      const parsed = parseTlidbOtherTooltipCalculation({ ...item, categoryId: "slates" });
      if (parsed.blockers.length) {
        for (const parsedBlocker of parsed.blockers) {
          blockers.push(outputBlocker("authority", parsedBlocker.reason, entry, {
            sourceText: parsedBlocker.sourceText,
          }));
        }
      } else {
        blockers.push(outputBlocker(
          "authority",
          "current-ss13-divinity-source-receipt-unavailable",
          entry,
        ));
      }
      continue;
    }

    if (isHadesSemanticSourceItemId(sourceItemId)) {
      const groupKey = hadesEntryGroupKey(entry);
      if (processedHadesGroups.has(groupKey)) continue;
      processedHadesGroups.add(groupKey);
      const groupEntries = entries.filter((candidate) => hadesEntryGroupKey(candidate) === groupKey);
      const semantic = getHadesTalentSemanticRecord(hadesStableId(sourceItemId));
      if (!semantic) {
        blockers.push(outputBlocker("authority", "hades-stable-id-not-found", entry));
        continue;
      }
      const displayLines = locale.record.detail
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean);
      if (
        displayLines.length !== groupEntries.length
        || semantic.sourceLines.length !== groupEntries.length
      ) {
        blockers.push(outputBlocker("matching", "hades-atomic-source-line-count-mismatch", entry, {
          projectedLineCount: groupEntries.length,
          displaySourceLineCount: displayLines.length,
          semanticSourceLineCount: semantic.sourceLines.length,
        }));
        continue;
      }
      const mismatchedLineIndex = groupEntries.findIndex((groupEntry, sourceLineIndex) => (
        String(groupEntry?.rawText ?? "").trim() !== displayLines[sourceLineIndex]
      ));
      if (mismatchedLineIndex >= 0) {
        blockers.push(outputBlocker("matching", "hades-atomic-source-line-mismatch", entry, {
          sourceLineIndex: mismatchedLineIndex,
          projectedSourceText: String(groupEntries[mismatchedLineIndex]?.rawText ?? "").trim(),
          exactSourceText: displayLines[mismatchedLineIndex],
        }));
        continue;
      }

      const groupTraceKeys = groupEntries.map((groupEntry, sourceLineIndex) => {
        const authorityTraceKey = createTlidbDivinityProjectionAuthorityTraceKey(
          groupEntry,
          item,
          semantic.source.sourceRecordKey,
          sourceLineIndex,
        );
        authorityTraceKeys.add(authorityTraceKey);
        return authorityTraceKey;
      });
      const hadesState = hadesFactsForSelection(projection, selection);
      const sourceInstanceId = selection?.sourceInstanceId ?? selection?.instanceId ?? null;
      const sourceSlotKey = selection?.sourceSlotKey ?? selection?.slotKey ?? null;
      const topologyScenario = hadesSemanticNeedsTopologyScenario(
        semantic,
        hadesState,
        selection,
        entry,
      );
      const resolvedConfig = { ...config.value };
      const scale = points.value * multiplier.value;
      const resolved = resolveHadesTalent({
        stableId: semantic.stableId,
        selection,
        hadesState,
        config: semantic.category === "banishment_imprint"
          ? { ...resolvedConfig, banishmentArchetype: "" }
          : resolvedConfig,
        effectScale: scale,
      });
      for (const blocker of resolved.blockers ?? []) {
        blockers.push(outputBlocker("hades-input", blocker.reason, entry, {
          sourceText: blocker.sourceText ?? semantic.source.detail,
          stableId: semantic.stableId,
          inputKey: blocker.inputKey ?? null,
          expectedType: blocker.expectedType ?? null,
          configuredValue: blocker.value ?? null,
          authorityTraceKeys: groupTraceKeys,
          sourceInstanceId,
          sourceSlotKey,
          hadesType: hadesState.hadesType ?? null,
        }));
      }

      const scaledSemanticEffects = (resolved.effects ?? [])
        .filter(({ value }) => finiteNumber(value) !== null)
        .flatMap(expandedHadesEffectScopes)
        .map((semanticEffect) => {
          const regainReady = authorizedHadesRegainEffect(
            semanticEffect,
            semantic,
            hadesState,
          );
          const scaled = scaledHadesEffect(semanticEffect, scale);
          return topologyScenario
            ? { ...scaled, calculationReady: false, topologyScenario: true }
            : { ...scaled, calculationReady: scaled.calculationReady || regainReady };
        });
      for (const [effectIndex, semanticEffect] of scaledSemanticEffects.entries()) {
        const matchedSourceLineIndex = semantic.sourceLines.findIndex((line) => (
          line === semanticEffect.sourceText
        ));
        const sourceLineIndex = Number.isInteger(semanticEffect.sourceLineIndex)
          ? semanticEffect.sourceLineIndex
          : matchedSourceLineIndex;
        if (sourceLineIndex < 0 || sourceLineIndex >= groupTraceKeys.length) {
          blockers.push(outputBlocker(
            "matching",
            "hades-semantic-effect-source-line-not-found",
            entry,
            {
              sourceText: semanticEffect.sourceText,
              stableId: semantic.stableId,
              stat: semanticEffect.stat,
              sourceInstanceId,
              sourceSlotKey,
            },
          ));
          continue;
        }
        const authorityTraceKey = groupTraceKeys[sourceLineIndex];
        const traceKey = [
          authorityTraceKey,
          `semantic-effect-${effectIndex}`,
          traceSegment(semanticEffect.stat),
          traceSegment(semanticEffect.operation),
        ].join(":");
        const value = finiteNumber(semanticEffect.value);
        const calculationReady = value !== null && semanticEffect.calculationReady === true;
        effects.push({
          ...semanticEffect,
          value,
          calculationReady,
          pointCount: points.value,
          effectMultiplier: multiplier.value,
          selectionConfig: resolvedConfig,
          selectionId: sourceItemId,
          scope: hadesSemanticScope(semanticEffect),
          projectionEntryId: entryId,
          projectionEntryIds: groupEntries.map(({ id }) => id),
          boardId: entry.boardId ?? projection.activeBoardId ?? null,
          instanceId: entry.instanceId ?? null,
          sourceInstanceId,
          hadesType: hadesState.hadesType ?? null,
          slotKey: entry.slotKey ?? null,
          sourceSlotKey,
          affixKind: entry.affixKind ?? null,
          origin: entry.origin ?? null,
          sourceItemId,
          sourceUrl: semantic.source.sourceUrl,
          sourceRecordKey: semantic.source.sourceRecordKey,
          sourcePageSha256: semantic.source.sourcePageSha256,
          sourceLineIndex,
          topologyScenario,
          structureStatus: hadesState.structureStatus,
          structureAuthority: hadesState.structureAuthority,
          authorityTraceKey,
          traceKey,
          mappedEffects: [],
          deduplication: {
            authority: "tlidb-current-ss13-hades-semantic-registry",
            authorityTraceKey,
            suppressesDirectProjection: true,
            directProjectionEntryId: entryId,
            directProjectionEntryIds: groupEntries.map(({ id }) => id),
            atomic: true,
          },
        });
      }
      const calculatedMechanic = calculatedHadesMechanic(
        scaledSemanticEffects,
        topologyScenarioStatus(resolved.status, topologyScenario),
        semantic.source.detail,
      );
      const semanticMechanics = [
        ...(resolved.mechanics ?? []).filter(({ kind }) => kind !== "numeric-effects"),
        ...(calculatedMechanic ? [calculatedMechanic] : []),
      ];
      mechanics.push(...semanticMechanics.map((mechanic) => ({
        ...mechanic,
        status: topologyScenarioStatus(mechanic.status, topologyScenario),
        boardId: entry.boardId ?? projection.activeBoardId ?? null,
        instanceId: entry.instanceId ?? null,
        sourceInstanceId,
        hadesType: hadesState.hadesType ?? null,
        slotKey: entry.slotKey ?? null,
        sourceSlotKey,
        sourceItemId,
        sourceUrl: semantic.source.sourceUrl,
        sourceUrlByLocale: semantic.source.sourceUrlByLocale,
        sourceRecordKey: semantic.source.sourceRecordKey,
        pointCount: points.value,
        effectMultiplier: multiplier.value,
        authorityTraceKeys: groupTraceKeys,
        sourceLineIndex: Number.isInteger(mechanic.sourceLineIndex)
          ? mechanic.sourceLineIndex
          : semantic.sourceLines.findIndex((line) => line === mechanic.sourceText),
        authorityTraceKey: Number.isInteger(mechanic.sourceLineIndex)
          ? groupTraceKeys[mechanic.sourceLineIndex] ?? null
          : groupTraceKeys[semantic.sourceLines.findIndex((line) => line === mechanic.sourceText)] ?? null,
        topologyScenario,
        structureStatus: hadesState.structureStatus,
        structureAuthority: hadesState.structureAuthority,
      })));
      hadesAccounting.push({
        ...resolved.accounting,
        stableId: semantic.stableId,
        sourceItemId,
        projectionEntryIds: groupEntries.map(({ id }) => id),
        ruleCoverageComplete: resolved.accounting?.recordAccounted === true
          && resolved.accounting?.sourceLineCount === resolved.accounting?.accountedLineCount,
      });

      if (
        hadesState.hadesType === "banishment"
        && hadesState.hadesInstanceId
        && !processedBanishmentProfiles.has(hadesState.hadesInstanceId)
      ) {
        processedBanishmentProfiles.add(hadesState.hadesInstanceId);
        const profile = resolveHadesBanishmentProfile({
          hadesState,
          config: hadesBanishmentProfileConfig(projection, hadesState.hadesInstanceId),
        });
        const profileSourceItemId = `hades-banishment-profile:${profile.archetypeId ?? "unselected"}`;
        const profileSourceInstanceId = hadesState.hadesInstanceId;
        const profileSourceSlotKey = "imprint_1";
        const profileTopologyScenario = hadesState.structureAuthority !== true;
        for (const blocker of profile.blockers ?? []) {
          blockers.push(outputBlocker("hades-input", blocker.reason, entry, {
            projectionEntryId: null,
            sourceItemId: profileSourceItemId,
            sourceText: profile.archetypeId ?? "Banishment",
            inputKey: blocker.inputKey ?? null,
            expectedType: blocker.expectedType ?? null,
            sourceInstanceId: profileSourceInstanceId,
            sourceSlotKey: profileSourceSlotKey,
            hadesType: hadesState.hadesType,
          }));
        }
        const profileStatus = topologyScenarioStatus(
          hadesProjectionStatus(profile.status),
          profileTopologyScenario,
        );
        const profileBlockerKeys = new Set(
          (profile.blockers ?? []).map(({ inputKey }) => inputKey).filter(Boolean),
        );
        const profileMechanicStatus = (mechanic) => {
          if (mechanic?.sourceConflict) return "source-conflict";
          if ((mechanic?.requiredInputKeys ?? []).some((key) => profileBlockerKeys.has(key))) {
            return "input-required";
          }
          if (profile.status === "source-conflict") return "source-conflict";
          if (mechanic?.inputResolved === true && mechanic?.active === false) return "inactive";
          if (!profile.active) return profileStatus;
          return topologyScenarioStatus("applied", profileTopologyScenario);
        };
        mechanics.push(...(profile.mechanics ?? []).map((mechanic) => ({
          ...mechanic,
          kind: mechanic.kind ?? "banishment-profile",
          status: profileMechanicStatus(mechanic),
          sourceItemId: profileSourceItemId,
          instanceId: hadesState.hadesInstanceId,
          sourceInstanceId: profileSourceInstanceId,
          hadesType: hadesState.hadesType,
          slotKey: "banishment-profile",
          sourceSlotKey: profileSourceSlotKey,
          sourceUrl: mechanic.sourceUrl ?? profile.sourceUrl,
          branches: mechanic.branches ?? profile.branches,
          topologyScenario: profileTopologyScenario,
          structureStatus: hadesState.structureStatus,
          structureAuthority: hadesState.structureAuthority,
        })));
        const scaledProfileEffects = (profile.effects ?? [])
          .flatMap(expandedHadesEffectScopes)
          .map((profileEffect) => {
            const scaled = scaledHadesEffect(profileEffect, 1);
            return profileTopologyScenario || profileEffect.sourceConflict
              ? { ...scaled, calculationReady: false, topologyScenario: profileTopologyScenario }
              : scaled;
          });
        for (const [profileEffectIndex, profileEffect] of scaledProfileEffects.entries()) {
          const value = finiteNumber(profileEffect.value);
          const sourceMechanic = profile.mechanics?.[profileEffect.sourceMechanicIndex] ?? null;
          effects.push({
            ...profileEffect,
            value,
            calculationReady: !profileTopologyScenario
              && profileEffect.sourceConflict !== true
              && value !== null
              && hadesEffectCanReachEngine({
                ...profileEffect,
                calculationReady: true,
              }),
            scope: hadesSemanticScope(profileEffect),
            projectionEntryId: null,
            boardId: entry.boardId ?? projection.activeBoardId ?? null,
            instanceId: hadesState.hadesInstanceId,
            sourceInstanceId: profileSourceInstanceId,
            hadesType: hadesState.hadesType,
            slotKey: "banishment-profile",
            sourceSlotKey: profileSourceSlotKey,
            affixKind: "hades-authority",
            origin: "hades_banishment_profile",
            sourceItemId: `hades-banishment-profile:${profile.archetypeId}`,
            sourceText: sourceMechanic?.sourceText ?? profileEffect.sourceText,
            sourceTextByLocale: sourceMechanic?.sourceTextByLocale,
            displayTextByLocale: sourceMechanic?.displayTextByLocale,
            sourceOriginalByLocale: sourceMechanic?.sourceOriginalByLocale,
            sourceLocaleStatus: sourceMechanic?.sourceLocaleStatus,
            sourceUrlByLocale: sourceMechanic?.sourceUrlByLocale,
            sourceLinks: sourceMechanic?.sourceLinks,
            sourceMechanicIndex: profileEffect.sourceMechanicIndex ?? null,
            sourceUrl: profileEffect.sourceUrl ?? sourceMechanic?.sourceUrl ?? profile.sourceUrl,
            sourceRecordKey: `banishment-profile:${profile.archetypeId}:mechanic-${profileEffect.sourceMechanicIndex ?? 0}`,
            traceKey: `hades-banishment-profile:${profile.archetypeId}:${profileEffectIndex}`,
            topologyScenario: profileTopologyScenario,
            structureStatus: hadesState.structureStatus,
            structureAuthority: hadesState.structureAuthority,
            mappedEffects: [],
          });
        }
        const profileEffectGroups = new Map();
        for (const profileEffect of scaledProfileEffects) {
          const sourceMechanicIndex = Number.isInteger(profileEffect.sourceMechanicIndex)
            ? profileEffect.sourceMechanicIndex
            : 0;
          const group = profileEffectGroups.get(sourceMechanicIndex) ?? [];
          group.push(profileEffect);
          profileEffectGroups.set(sourceMechanicIndex, group);
        }
        for (const [sourceMechanicIndex, profileEffects] of profileEffectGroups.entries()) {
          const sourceMechanic = profile.mechanics?.[sourceMechanicIndex] ?? null;
          const calculatedStatus = sourceMechanic?.sourceConflict
            || profileEffects.some(({ sourceConflict }) => sourceConflict)
            ? "source-conflict"
            : profileMechanicStatus(sourceMechanic);
          const profileCalculatedMechanic = calculatedHadesMechanic(
            profileEffects,
            calculatedStatus,
            sourceMechanic?.sourceText
              ?? (profile.archetypeId ? `Banishment: ${profile.archetypeId}` : "Banishment"),
          );
          if (!profileCalculatedMechanic) continue;
          mechanics.push({
            ...profileCalculatedMechanic,
            sourceItemId: `hades-banishment-profile:${profile.archetypeId ?? "unselected"}`,
            instanceId: hadesState.hadesInstanceId,
            sourceInstanceId: profileSourceInstanceId,
            hadesType: hadesState.hadesType,
            slotKey: "banishment-profile",
            sourceSlotKey: profileSourceSlotKey,
            displayNameByLocale: sourceMechanic?.displayNameByLocale,
            sourceTextByLocale: sourceMechanic?.sourceTextByLocale,
            displayTextByLocale: sourceMechanic?.displayTextByLocale,
            sourceOriginalByLocale: sourceMechanic?.sourceOriginalByLocale,
            sourceLocaleStatus: sourceMechanic?.sourceLocaleStatus,
            requiredInputKeys: sourceMechanic?.requiredInputKeys,
            sourceConflict: sourceMechanic?.sourceConflict === true,
            sourceUrlByLocale: sourceMechanic?.sourceUrlByLocale,
            sourceLinks: sourceMechanic?.sourceLinks,
            sourceUrl: sourceMechanic?.sourceUrl ?? profile.sourceUrl,
            sourceRecordKey: `banishment-profile:${profile.archetypeId ?? "unselected"}`,
            topologyScenario: profileTopologyScenario,
            structureStatus: hadesState.structureStatus,
            structureAuthority: hadesState.structureAuthority,
          });
        }
      }
      continue;
    }

    const authority = getTlidbCalculationAuthority(normalizedAuthorityItem(item));
    if (!authority) {
      const affectedStats = affectedRegainStatsForText(entry?.rawText);
      blockers.push(outputBlocker(
        "authority",
        "current-ss13-divinity-calculation-authority-unavailable",
        entry,
        affectedStats.length ? { affectedStats } : {},
      ));
      continue;
    }
    const sourceText = String(entry.rawText ?? "").trim();
    const lines = locale.record.detail.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    const lineMatches = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line === sourceText)
      .map(({ index }) => index);
    if (!lineMatches.length) {
      blockers.push(outputBlocker("matching", "divinity-projection-source-line-not-found", entry, {
        locale: locale.localeKey,
        sourceRecordKey: locale.record.sourceRecordKey,
      }));
      continue;
    }
    if (lineMatches.length > 1) {
      blockers.push(outputBlocker("duplicate", "duplicate-divinity-source-line-match", entry, {
        locale: locale.localeKey,
        sourceRecordKey: locale.record.sourceRecordKey,
        matchingLineIndexes: lineMatches,
      }));
      continue;
    }

    const sourceLineIndex = lineMatches[0];
    const parsedEffects = authority.parsedEffects
      .filter((effect) => effect.sourceText === sourceText)
      .map((effect) => bindRecentRegainCondition(
        effect,
        recentRegainEffectContract(
          sourceItemId,
          locale.record.sourceRecordKey,
          locale.record.sourcePageSha256,
          sourceText,
          effect,
        ),
      ));
    const recentRegainConditionAuthorized = parsedEffects.some(({ calculationCapability }) => (
      calculationCapability === TLIDB_DIVINITY_RECENT_REGAIN_CAPABILITY
    ));
    const parserBlockers = authority.parserBlockers.filter((candidate) => (
      candidate.sourceText === sourceText
      && !(
        recentRegainConditionAuthorized
        && candidate.reason === "partially-parsed-numeric-mechanic"
      )
    ));
    const mappingBlockers = authority.mappingBlockers.filter((candidate) => (
      candidate.sourceText === sourceText
      && !(
        candidate.reason === "tlidb-effect-stat-unmapped"
        && (
          isAuthorizedRegainSourceStat(
            sourceItemId,
            locale.record.sourceRecordKey,
            locale.record.sourcePageSha256,
            candidate.stat,
          )
          || isAuthorizedRegainIntervalSourceStat(
            sourceItemId,
            locale.record.sourceRecordKey,
            locale.record.sourcePageSha256,
            candidate.stat,
          )
        )
      )
    ));
    for (const parsedBlocker of parserBlockers) {
      const affectedStats = affectedRegainStatsForText(parsedBlocker.sourceText);
      blockers.push(outputBlocker("parser", parsedBlocker.reason, entry, {
        sourceText: parsedBlocker.sourceText,
        ...(affectedStats.length ? { affectedStats } : {}),
      }));
    }
    for (const mappingBlocker of mappingBlockers) {
      blockers.push(outputBlocker("mapping", mappingBlocker.reason, entry, {
        sourceText: mappingBlocker.sourceText,
        stat: mappingBlocker.stat ?? null,
      }));
    }
    if (!parsedEffects.length && !parserBlockers.length) {
      blockers.push(outputBlocker("matching", "divinity-projection-source-line-not-accounted", entry, {
        locale: locale.localeKey,
        sourceRecordKey: locale.record.sourceRecordKey,
        sourceLineIndex,
      }));
      continue;
    }

    const authorityTraceKey = createTlidbDivinityProjectionAuthorityTraceKey(
      entry,
      item,
      locale.record.sourceRecordKey,
      sourceLineIndex,
    );
    const fingerprints = new Set();
    for (const [effectIndex, parsedEffect] of parsedEffects.entries()) {
      const fingerprint = effectFingerprint(parsedEffect);
      if (fingerprints.has(fingerprint)) {
        blockers.push(outputBlocker("duplicate", "duplicate-divinity-projected-effect", entry, {
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
      if (emittedTraceKeys.has(traceKey)) {
        blockers.push(outputBlocker("duplicate", "duplicate-divinity-projected-effect-trace", entry, {
          authorityTraceKey,
          traceKey,
        }));
        continue;
      }
      emittedTraceKeys.add(traceKey);
      authorityTraceKeys.add(authorityTraceKey);

      const valueResolution = resolveEffectValue(
        parsedEffect,
        points.value,
        config.value,
        multiplier.value,
      );
      if (valueResolution.reason) {
        blockers.push(outputBlocker("range", valueResolution.reason, entry, {
          authorityTraceKey,
          traceKey,
          stat: parsedEffect.stat,
          sourceRollKey: parsedEffect.rollKey ?? null,
          selectedValue: valueResolution.selected ?? null,
          minimum: valueResolution.minimum ?? null,
          maximum: valueResolution.maximum ?? null,
        }));
      }
      const runtimeReason = runtimeBlockerReason(parsedEffect);
      if (runtimeReason) {
        blockers.push(outputBlocker(
          runtimeReason.includes("stack") ? "stack" : "condition",
          runtimeReason,
          entry,
          {
            authorityTraceKey,
            traceKey,
            stat: parsedEffect.stat,
          },
        ));
      }
      const mappedForLine = authority.effects.filter((effect) => (
        effect.sourceText === sourceText
        && effect.operation === parsedEffect.operation
        && String(effect.id ?? "").startsWith(`${parsedEffect.stat}:${parsedEffect.operation}:`)
      )).map((effect) => ({
        ...effect,
        value: valueResolution.value ?? null,
        pointCount: points.value,
      }));
      const calculationReady = !topologyScenario
        && !valueResolution.reason
        && !runtimeReason
        && parserBlockers.length === 0
        && mappingBlockers.every(({ stat }) => stat !== parsedEffect.stat);
      effects.push({
        ...parsedEffect,
        value: valueResolution.value ?? null,
        ...(parsedEffect.roll ? {
          roll: {
            min: Number(parsedEffect.roll.min) * points.value * multiplier.value,
            max: Number(parsedEffect.roll.max) * points.value * multiplier.value,
          },
          sourceRoll: { ...parsedEffect.roll },
          sourceRollKey: parsedEffect.rollKey,
          rollKey: `${authorityTraceKey}:roll:${effectIndex}`,
          selectedSourceValue: valueResolution.sourceValue ?? null,
        } : {}),
        pointCount: points.value,
        effectMultiplier: multiplier.value,
        selectionConfig: config.value,
        selectionId: sourceItemId,
        scope: scopeForStat(parsedEffect.stat),
        projectionEntryId: entryId,
        boardId: entry.boardId ?? projection.activeBoardId ?? null,
        instanceId: entry.instanceId ?? null,
        slotKey: entry.slotKey ?? null,
        affixKind: entry.affixKind ?? null,
        origin: entry.origin ?? null,
        sourceItemId,
        sourceUrl: locale.record.sourceUrl,
        sourceRecordKey: locale.record.sourceRecordKey,
        sourcePageSha256: locale.record.sourcePageSha256,
        sourceLineIndex,
        authorityTraceKey,
        traceKey,
        calculationReady,
        topologyScenario,
        structureStatus: topologyScenario ? "inferred-from-official-icon" : null,
        structureAuthority: topologyScenario ? false : null,
        mappedEffects: mappedForLine,
        deduplication: {
          authority: "tlidb-current-ss13-tooltip-effects",
          authorityTraceKey,
          suppressesDirectProjection: true,
          directProjectionEntryId: entryId,
          legacyModelingStatus: entry.modelingStatus ?? null,
        },
      });
    }
  }

  const capabilityCheckedEffects = enforceRegainCapability(effects, blockers);
  return freezeResult({
    effects: capabilityCheckedEffects,
    blockers,
    mechanics,
    hadesAccounting,
    authorityTraceKeys,
    suppressedEntryIds,
  });
}
