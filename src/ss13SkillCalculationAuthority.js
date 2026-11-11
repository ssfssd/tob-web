import {
  ADVANCED_BARRIER_BURST_MECHANIC,
  REGULAR_BARRIER_BURST_MECHANIC,
  getExactBarrierBurstMechanicLocale,
} from "./barrierBurstMechanics.js";

export const SS13_SUPPORT_DAMAGE_CALCULATION_AUTHORITY =
  "tlidb-current-ss13-supported-skill-more-damage-only";

const PROFILE_AUTHORITY = "tlidb-current-ss13-profile-values";
const LOCALES = Object.freeze(["ko", "en", "cn"]);
const EXPECTED_SKILL_COUNT = 277;
const EXPECTED_SUPPORT_COUNT = 490;

function frozenSpec(spec) {
  return Object.freeze({
    ...spec,
    compatibleTags: Object.freeze([...spec.compatibleTags]),
    moreDamageCurve: Object.freeze([...spec.moreDamageCurve]),
    outOfScopeReasonCodes: Object.freeze([...spec.outOfScopeReasonCodes]),
  });
}

function linearCurve(start, step) {
  return Array.from({ length: 40 }, (_, index) => (
    Number((start + step * index).toFixed(8))
  ));
}

export const SS13_SUPPORT_DAMAGE_CALCULATION_ALLOWLIST = Object.freeze({
  "supports-tlidb-com-cn-multiple-projectiles": frozenSpec({
    stableId: "7401",
    stableKey: "ItemBase/7401",
    sourceHeader: "7.4 % additional damage for the supported skill",
    compatibleTags: ["projectile"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: linearCurve(7.4, 0.4),
    outOfScopeReasonCodes: [
      "projectile-count-hit-model-unavailable",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
  "supports-tlidb-com-cn-increased-area": frozenSpec({
    stableId: "7407",
    stableKey: "ItemBase/7407",
    sourceHeader: "+16 % additional damage for the supported skill",
    compatibleTags: ["area"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: [
      16, 16.2, 16.4, 16.6, 16.8, 17, 17.2, 17.4, 17.6, 17.8,
      18, 18.2, 18.4, 18.6, 18.8, 19, 19.2, 19.4, 19.6, 19.8,
      20, 20.2, 20.4, 20.6, 20.8, 21, 21.2, 21.4, 21.6, 21.8,
      22, 22.2, 22.4, 22.6, 22.8, 23, 23.2, 23.4, 23.6, 23.8,
    ],
    outOfScopeReasonCodes: [
      "skill-area-effect-not-modeled",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
  "supports-tlidb-com-cn-control-spell": frozenSpec({
    stableId: "7434",
    stableKey: "ItemBase/7434",
    sourceHeader: "+28 % additional damage for the supported skill",
    compatibleTags: ["spell"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: linearCurve(28, 0.5),
    outOfScopeReasonCodes: [
      "critical-rating-penalty-dps-model-unavailable",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
  "supports-tlidb-com-cn-slow-projectile": frozenSpec({
    stableId: "7440",
    stableKey: "ItemBase/7440",
    sourceHeader: "19.5 % additional damage for the supported skill",
    compatibleTags: ["projectile"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: linearCurve(19.5, 0.5),
    outOfScopeReasonCodes: [
      "projectile-speed-damage-interaction-unavailable",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
  "supports-tlidb-com-cn-guard": frozenSpec({
    stableId: "7454",
    stableKey: "ItemBase/7454",
    sourceHeader: "15.5 % additional damage for the supported skill",
    compatibleTags: ["channeling"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: [
      15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20,
      20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25,
      25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30,
      30.5, 31, 31.5, 32, 32.5, 33, 33.5, 34, 34.5, 35,
    ],
    outOfScopeReasonCodes: [
      "barrier-grant-effect-not-modeled",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
  "supports-tlidb-com-cn-channel-preparation": frozenSpec({
    stableId: "7455",
    stableKey: "ItemBase/7455",
    sourceHeader: "+4 % additional damage for the supported skill",
    compatibleTags: ["channeling"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: linearCurve(4, 0.4),
    outOfScopeReasonCodes: [
      "minimum-channel-stacks-effect-not-modeled",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
  "supports-tlidb-com-cn-wind-projectiles": frozenSpec({
    stableId: "7469",
    stableKey: "ItemBase/7469",
    sourceHeader: "15.5 % additional damage for the supported skill",
    compatibleTags: ["projectile"],
    semanticClass: "unconditional-supported-skill-more-damage",
    moreDamageCurve: linearCurve(15.5, 0.5),
    outOfScopeReasonCodes: [
      "projectile-speed-damage-interaction-unavailable",
      "mana-cost-multiplier-not-modeled",
    ],
  }),
});

function sameStringList(left, right) {
  const a = [...(left ?? [])].map(String).sort();
  const b = [...(right ?? [])].map(String).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function exactCurveMatches(valuesByLevel, expectedCurve) {
  const keys = Object.keys(valuesByLevel ?? {});
  if (keys.length !== expectedCurve.length) return false;
  return expectedCurve.every((expected, index) => (
    Number(valuesByLevel?.[String(index + 1)]) === expected
  ));
}

function exactLocaleReceiptMatches(item, receipt, locale, stableId) {
  const record = item?.tlidbText?.[locale];
  return Boolean(
    record?.sourceUrl === receipt?.sourceUrl
    && record?.sourceUrl?.startsWith(`https://tlidb.com/${locale}/`)
    && record?.sourcePageSha256 === receipt?.sourcePageSha256
    && record?.sourcePageVersion === "SS13"
    && receipt?.sourcePageVersion === "SS13"
    && record?.sourceRecordKey === receipt?.sourceRecordKey
    && record?.sourceSeasonEvidence?.verificationComplete === true
    && record?.sourceSeasonEvidence?.actualSeason === 13
    && record?.sourceFieldStatus?.name === "exact"
    && record?.sourceFieldStatus?.summary === "exact"
    && record?.sourceFieldStatus?.detail === "exact"
    && record?.sourceFieldStatus?.tags === "exact"
    && sameStringList(record?.sourceDataIds, [stableId])
    && sameStringList(receipt?.sourceDataIds, [stableId])
  );
}

function allowlistEvidenceMatches(category, item, entry, spec) {
  return Boolean(
    category === "supports"
    && entry?.category === "supports"
    && entry?.profileField === "supportProfile"
    && entry?.authority === PROFILE_AUTHORITY
    && entry?.evidence?.sourceMethod === "tlidb-current-ss13-unconditional-support-level-table"
    && entry?.evidence?.sourceHeader === spec?.sourceHeader
    && entry?.evidence?.sourceLevelCount === 40
    && entry?.evidence?.calculationApplied === false
    && entry?.evidence?.calculationModelAuthority === "unverified"
    && item?.tlidbStableKey === spec?.stableKey
    && sameStringList(item?.tlidbStableKeys, [spec?.stableKey])
    && sameStringList(entry?.profile?.compatibleTags, spec?.compatibleTags)
    && (entry?.profile?.excludedTags?.length ?? 0) === 0
    && (entry?.profile?.oneOfTags?.length ?? 0) === 0
    && exactCurveMatches(entry?.profile?.moreDamageByLevel, spec?.moreDamageCurve)
    && exactCurveMatches(item?.supportProfile?.moreDamageByLevel, spec?.moreDamageCurve)
    && LOCALES.every((locale) => exactLocaleReceiptMatches(
      item,
      entry?.evidence?.localeReceipts?.[locale],
      locale,
      spec?.stableId,
    ))
  );
}

function freezeLocaleReceipts(receipts) {
  return Object.freeze(Object.fromEntries(LOCALES.map((locale) => [
    locale,
    Object.freeze({ ...(receipts?.[locale] ?? {}) }),
  ])));
}

export function applySs13SkillCalculationAuthority(category, item, entry) {
  const spec = SS13_SUPPORT_DAMAGE_CALCULATION_ALLOWLIST[item?.id];
  if (!spec || !allowlistEvidenceMatches(category, item, entry, spec)) return item;

  return {
    ...item,
    calculationValueAuthority: SS13_SUPPORT_DAMAGE_CALCULATION_AUTHORITY,
    calculationValueEvidence: Object.freeze({
      schemaVersion: 1,
      activeSeason: "SS13",
      authority: SS13_SUPPORT_DAMAGE_CALCULATION_AUTHORITY,
      sourceMethod: entry.evidence.sourceMethod,
      stableId: spec.stableId,
      stableKey: spec.stableKey,
      sourceHeader: spec.sourceHeader,
      sourceLevelCount: 40,
      semanticClass: spec.semanticClass,
      calculationScope: "supported-skill-more-damage-only",
      calculationCoverage: "partial",
      verifiedFields: Object.freeze([
        "supportProfile.moreDamageByLevel",
        "supportProfile.compatibleTags",
      ]),
      outOfScopeReasonCodes: spec.outOfScopeReasonCodes,
      localeReceipts: freezeLocaleReceipts(entry.evidence.localeReceipts),
    }),
    calculationModelAuthority: "partial-supported-skill-more-damage-only",
    calculationCoverage: "partial",
    calculationUnsupportedEffects: spec.outOfScopeReasonCodes,
  };
}

export function hasCurrentSs13SupportDamageAuthority(item) {
  const spec = SS13_SUPPORT_DAMAGE_CALCULATION_ALLOWLIST[item?.id];
  const evidence = item?.calculationValueEvidence;
  return Boolean(
    spec
    && item?.calculationValueAuthority === SS13_SUPPORT_DAMAGE_CALCULATION_AUTHORITY
    && item?.calculationModelAuthority === "partial-supported-skill-more-damage-only"
    && item?.calculationCoverage === "partial"
    && evidence?.authority === SS13_SUPPORT_DAMAGE_CALCULATION_AUTHORITY
    && evidence?.activeSeason === "SS13"
    && evidence?.stableId === spec.stableId
    && evidence?.stableKey === spec.stableKey
    && evidence?.sourceHeader === spec.sourceHeader
    && evidence?.sourceLevelCount === 40
    && evidence?.semanticClass === spec.semanticClass
    && evidence?.calculationScope === "supported-skill-more-damage-only"
    && evidence?.calculationCoverage === "partial"
    && exactCurveMatches(item?.supportProfile?.moreDamageByLevel, spec.moreDamageCurve)
  );
}

function appendReasonCount(reasonCounts, reason) {
  reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
}

function barrierBurstAudit() {
  const regularFailClosed = Boolean(
    REGULAR_BARRIER_BURST_MECHANIC.barrierDamagePercent === null
    && REGULAR_BARRIER_BURST_MECHANIC.ailmentDamageAdditionalPercent === null
    && REGULAR_BARRIER_BURST_MECHANIC.calculationSupported === false
    && REGULAR_BARRIER_BURST_MECHANIC.calculationApplied === false
    && REGULAR_BARRIER_BURST_MECHANIC.valueTransferFromAdvanced === "unverified-not-applied"
    && LOCALES.every((locale) => {
      const localized = getExactBarrierBurstMechanicLocale(
        REGULAR_BARRIER_BURST_MECHANIC,
        locale,
      );
      return Boolean(
        localized
        && !/400%|-60%/u.test(localized.detail)
        && !/removes the Barrier|스킬 레벨|技能等级/u.test(localized.detail)
      );
    })
  );
  const advancedIsolated = Boolean(
    ADVANCED_BARRIER_BURST_MECHANIC.barrierDamagePercent === 400
    && ADVANCED_BARRIER_BURST_MECHANIC.calculationSupported === false
    && ADVANCED_BARRIER_BURST_MECHANIC.calculationApplied === false
    && ADVANCED_BARRIER_BURST_MECHANIC.valueTransferToRegular === "unverified-not-applied"
  );
  return Object.freeze({
    regular: Object.freeze({
      id: REGULAR_BARRIER_BURST_MECHANIC.id,
      status: "blocked",
      reasonCode: REGULAR_BARRIER_BURST_MECHANIC.calculationUnsupportedReason,
      barrierDamagePercent: null,
      failClosed: regularFailClosed,
    }),
    advanced: Object.freeze({
      id: ADVANCED_BARRIER_BURST_MECHANIC.id,
      status: "isolated-not-selectable",
      reasonCode: ADVANCED_BARRIER_BURST_MECHANIC.calculationUnsupportedReason,
      barrierDamagePercent: 400,
      transferableToRegular: false,
      isolated: advancedIsolated,
    }),
    verificationComplete: regularFailClosed && advancedIsolated,
  });
}

export function auditSs13SkillCalculationAuthority(flatCatalog, profileArtifact) {
  const failures = [];
  const skillItems = flatCatalog?.catalog?.skills ?? [];
  const supportItems = flatCatalog?.catalog?.supports ?? [];
  const sourceEntries = profileArtifact?.entries ?? {};
  const sourceBlockers = new Map((profileArtifact?.report?.blockers ?? []).map((blocker) => [
    `${blocker.category}:${blocker.itemId}`,
    blocker,
  ]));
  const inheritedConflicts = new Set((profileArtifact?.report?.inheritedValueConflicts ?? []).map(
    ({ category, itemId }) => `${category}:${itemId}`,
  ));
  const seen = new Set();
  const items = [];
  const reasonCounts = {};

  if (skillItems.length !== EXPECTED_SKILL_COUNT) failures.push("skill-denominator-mismatch");
  if (supportItems.length !== EXPECTED_SUPPORT_COUNT) failures.push("support-denominator-mismatch");

  for (const [category, categoryItems] of [["skills", skillItems], ["supports", supportItems]]) {
    for (const item of categoryItems) {
      const key = `${category}:${item.id}`;
      if (seen.has(key)) failures.push(`duplicate-item:${key}`);
      seen.add(key);

      const entry = sourceEntries[item.id];
      const sourceBlocker = sourceBlockers.get(key);
      if (entry && sourceBlocker) failures.push(`profile-entry-and-blocker-overlap:${key}`);
      if (!entry && !sourceBlocker) failures.push(`profile-source-item-unaccounted:${key}`);

      const spec = SS13_SUPPORT_DAMAGE_CALCULATION_ALLOWLIST[item.id];
      const authorized = Boolean(spec && allowlistEvidenceMatches(
        category,
        { ...item, supportProfile: entry?.profile },
        entry,
        spec,
      ));
      const reasonCodes = [];

      if (authorized) {
        reasonCodes.push(...spec.outOfScopeReasonCodes);
      } else if (spec) {
        reasonCodes.push("allowlist-current-ss13-evidence-mismatch");
        failures.push(`allowlist-authority-evidence-mismatch:${item.id}`);
      } else if (category === "skills" && entry) {
        reasonCodes.push("skill-base-damage-hit-cadence-and-mechanic-model-unavailable");
      } else if (entry) {
        reasonCodes.push("support-profile-semantics-not-allowlisted");
      } else {
        reasonCodes.push(sourceBlocker?.reason ?? "profile-source-item-unaccounted");
      }
      if (inheritedConflicts.has(key)) {
        reasonCodes.push("inherited-profile-value-conflict-preserved");
      }
      for (const reason of reasonCodes) appendReasonCount(reasonCounts, reason);

      items.push(Object.freeze({
        category,
        itemId: item.id,
        status: authorized ? "authorized-partial" : "blocked",
        calculationScope: authorized ? "supported-skill-more-damage-only" : null,
        calculationCoverage: authorized ? "partial" : "none",
        calculationValueAuthority: authorized
          ? SS13_SUPPORT_DAMAGE_CALCULATION_AUTHORITY
          : null,
        profileAuthorityStatus: entry ? "exact-current-ss13-profile" : "blocked",
        sourceProfileBlocker: sourceBlocker?.reason ?? null,
        stableIds: Object.freeze([...(item?.tlidbText?.ko?.sourceDataIds ?? [])].map(String)),
        reasonCodes: Object.freeze(reasonCodes),
      }));
    }
  }

  const authorizedItems = items.filter(({ status }) => status === "authorized-partial");
  const barrierBurst = barrierBurstAudit();
  if (!barrierBurst.verificationComplete) failures.push("barrier-burst-fail-close-invalid");
  const denominator = items.length;
  if (denominator !== EXPECTED_SKILL_COUNT + EXPECTED_SUPPORT_COUNT) {
    failures.push("combined-denominator-mismatch");
  }

  return Object.freeze({
    schemaVersion: 1,
    activeSeason: "SS13",
    denominator,
    skillDenominator: skillItems.length,
    supportDenominator: supportItems.length,
    profileAuthorityCount: Object.keys(sourceEntries).length,
    authorizedSkillCount: authorizedItems.filter(({ category }) => category === "skills").length,
    authorizedSupportCount: authorizedItems.filter(({ category }) => category === "supports").length,
    authorizedPartialCount: authorizedItems.length,
    authorizedCompleteCount: 0,
    blockedCount: items.length - authorizedItems.length,
    authorizedItemIds: Object.freeze(authorizedItems.map(({ itemId }) => itemId)),
    reasonCounts: Object.freeze(reasonCounts),
    items: Object.freeze(items),
    barrierBurst,
    failures: Object.freeze(failures),
    artifactIntegrityVerified: failures.length === 0,
    auditComplete: items.length === EXPECTED_SKILL_COUNT + EXPECTED_SUPPORT_COUNT,
    coverageComplete: false,
    verificationComplete: false,
  });
}
