import { CATALOG, CATALOG_METADATA } from "./catalog.js";
import { loadActiveRuntimeDataset } from "./activeRuntimeData.js";
import { attachActiveRuntimeDatasetLocaleRefs } from "./activeRuntimeLocaleData.js";
import {
  getExactRuntimeLocalePayload,
  getRuntimeDisplayLocalePayload,
  tlidbPageSlug,
} from "./runtimeLocale.js";
import { HERO_MEMORY_TYPE_IDENTITIES } from "./heroMemoryIdentity.js";
import {
  TLIDB_HERO_MEMORY_LOCALE_REF_OVERLAY,
} from "./data/tlidbHeroMemoryLocaleRefOverlay.generated.js";
import { TLIDB_RUNTIME_LOCALES as CURRENT_RUNTIME_LOCALES } from "./data/tlidbRuntimeLocales.ss13.generated.js";

const DATASET_NAME = "hero_memory_catalog";
const CURRENT_FLAT_AUTHORITY = Object.freeze({
  itemCount: 60,
  stableIdCount: 80,
  verifiedRemovedGroupCount: 30,
});
const PROFILE_LEVELS = Object.freeze([20, 30, 40, 50]);
let activeHeroMemoryPromise;

function payloadText(payload) {
  for (const field of ["text", "name", "title", "description", "detail"]) {
    const value = payload?.[field] ?? payload?.fields?.[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function payloadTemplate(payload) {
  const value = payload?.renderTemplate ?? payload?.fields?.renderTemplate;
  return typeof value === "string" && value.trim() ? value : payloadText(payload);
}

function normalizedSourceText(value) {
  return String(value ?? "")
    .replace(/\s+/gu, " ")
    .replace(/[()]/gu, "")
    .trim();
}

function localizedKoPayload(registry, record) {
  if (!record?.localeRef) return null;
  const exact = getExactRuntimeLocalePayload(registry, record.localeRef, "ko");
  if (exact) return {
    payload: exact,
    localeAuthority: "tlidb-current-ss13-exact-ko",
    numericAuthority: "tlidb-current-ss13-direct-row",
  };
  const semantic = getRuntimeDisplayLocalePayload(registry, record.localeRef, "ko");
  return semantic ? {
    payload: semantic,
    localeAuthority: "tlidb-current-ss13-semantic-template-ko",
    numericAuthority: "91tob-structural-unverified",
  } : null;
}

function directTierStructureConflicts(tier, payload) {
  return ["requiredLevel", "weight"].filter((field) => {
    if (tier?.[field] == null || payload?.[field] == null) return false;
    const runtimeValue = Number(tier[field]);
    const sourceValue = Number(payload[field]);
    return Number.isFinite(runtimeValue)
      && Number.isFinite(sourceValue)
      && runtimeValue !== sourceValue;
  });
}

function sanitizeTier(registry, tier) {
  const localized = localizedKoPayload(registry, tier);
  if (!localized) return null;
  const structuralConflictFields = localized.localeAuthority === "tlidb-current-ss13-exact-ko"
    ? directTierStructureConflicts(tier, localized.payload)
    : [];
  const selectionAuthorityConflictFields = structuralConflictFields.filter(
    (field) => field === "weight",
  );
  const numericAuthorityConflictFields = structuralConflictFields.filter(
    (field) => field !== "weight",
  );
  return {
    ...tier,
    text: payloadText(localized.payload),
    renderTemplate: payloadTemplate(localized.payload),
    rollDefs: (tier.rollDefs ?? []).map(({ label: _sourceLabel, ...roll }) => ({
      ...roll,
      label: "",
      localeVerifiedByTier: localized.localeAuthority === "tlidb-current-ss13-exact-ko",
    })),
    localeAuthority: localized.localeAuthority,
    numericAuthority: numericAuthorityConflictFields.length > 0
      ? "runtime-structure-conflict-unverified"
      : localized.numericAuthority,
    numericAuthorityConflictFields,
    selectionAuthorityConflictFields,
  };
}

function filterAffixGroups(registry, groups, ownerFlatCatalogId) {
  const report = {
    sourceGroups: groups.length,
    exactKoGroups: 0,
    semanticTemplateKoGroups: 0,
    selectableGroups: 0,
    sourceTiers: 0,
    exactKoTiers: 0,
    semanticTemplateKoTiers: 0,
    directTextCalculationConflictTiers: 0,
    selectionWeightConflictTiers: 0,
    selectableTiers: 0,
    omittedGroupIds: [],
    omittedTierIds: [],
  };
  const selectable = [];

  for (const group of groups) {
    const localizedGroup = localizedKoPayload(registry, group);
    const sourceTiers = Array.isArray(group.tierOptions) ? group.tierOptions : [];
    report.sourceTiers += sourceTiers.length;
    const tierOptions = sourceTiers.map((tier) => {
      const exact = sanitizeTier(registry, tier);
      if (exact?.localeAuthority === "tlidb-current-ss13-exact-ko") report.exactKoTiers += 1;
      else if (exact) report.semanticTemplateKoTiers += 1;
      else report.omittedTierIds.push(tier.tierId);
      if (exact?.numericAuthority === "runtime-structure-conflict-unverified") {
        report.directTextCalculationConflictTiers += 1;
      }
      if (exact?.selectionAuthorityConflictFields?.includes("weight")) {
        report.selectionWeightConflictTiers += 1;
      }
      return exact;
    }).filter(Boolean);
    report.selectableTiers += tierOptions.length;

    if (localizedGroup?.localeAuthority === "tlidb-current-ss13-exact-ko") report.exactKoGroups += 1;
    else if (localizedGroup) report.semanticTemplateKoGroups += 1;
    if (!localizedGroup || !tierOptions.length) {
      report.omittedGroupIds.push(group.id);
      continue;
    }

    report.selectableGroups += 1;
    selectable.push({
      ...group,
      previewText: payloadText(localizedGroup.payload),
      templateText: payloadTemplate(localizedGroup.payload),
      tierOptions,
      ownerFlatCatalogId,
      localeAuthority: localizedGroup.localeAuthority,
      numericAuthority: localizedGroup.numericAuthority,
    });
  }

  return { selectable, report };
}

function filterBaseGroups(registry, groups, ownerFlatCatalogId) {
  const report = {
    sourceGroups: groups.length,
    exactKoGroups: 0,
    semanticTemplateKoGroups: 0,
    selectableGroups: 0,
    sourceEnhancementValues: 0,
    exactKoEnhancementValues: 0,
    semanticTemplateKoEnhancementValues: 0,
    selectableEnhancementValues: 0,
    omittedGroupIds: [],
    omittedEnhancementValueIds: [],
  };
  const selectable = [];

  for (const group of groups) {
    const localizedGroup = localizedKoPayload(registry, group);
    const sourceValues = Array.isArray(group.enhancementValues) ? group.enhancementValues : [];
    report.sourceEnhancementValues += sourceValues.length;
    const enhancementValues = sourceValues.map((value) => {
      const localized = localizedKoPayload(registry, value);
      if (!localized) {
        report.omittedEnhancementValueIds.push(`${group.id}:${value.enhancementLevel}`);
        return null;
      }
      if (localized.localeAuthority === "tlidb-current-ss13-exact-ko") {
        report.exactKoEnhancementValues += 1;
      } else {
        report.semanticTemplateKoEnhancementValues += 1;
      }
      return {
        ...value,
        text: payloadText(localized.payload),
        localeAuthority: localized.localeAuthority,
        numericAuthority: localized.numericAuthority,
      };
    }).filter(Boolean);
    report.selectableEnhancementValues += enhancementValues.length;

    if (localizedGroup?.localeAuthority === "tlidb-current-ss13-exact-ko") report.exactKoGroups += 1;
    else if (localizedGroup) report.semanticTemplateKoGroups += 1;
    if (!localizedGroup || !enhancementValues.length) {
      report.omittedGroupIds.push(group.id);
      continue;
    }

    report.selectableGroups += 1;
    selectable.push({
      ...group,
      previewText: payloadText(localizedGroup.payload),
      enhancementValues,
      ownerFlatCatalogId,
      selectableProfileLevels: PROFILE_LEVELS.filter((level) => (
        enhancementValues.some(({ enhancementLevel }) => enhancementLevel === level)
      )),
      localeAuthority: localizedGroup.localeAuthority,
      numericAuthority: localizedGroup.numericAuthority,
    });
  }

  return { selectable, report };
}

function countLocaleRefs(dataset, registry) {
  let total = 0;
  let directExactKoreanRefs = 0;
  let semanticTemplateKoreanRefs = 0;
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.localeRef === "string" && value.localeRef) {
      total += 1;
      if (getExactRuntimeLocalePayload(registry, value.localeRef, "ko")) {
        directExactKoreanRefs += 1;
      } else if (getRuntimeDisplayLocalePayload(registry, value.localeRef, "ko")) {
        semanticTemplateKoreanRefs += 1;
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(dataset);
  return {
    total,
    directExactKoreanRefs,
    semanticTemplateKoreanRefs,
    koreanUnavailableRefs: total - directExactKoreanRefs - semanticTemplateKoreanRefs,
  };
}

function classifyMissingLocaleRefs(dataset, registry) {
  let semanticTemplateKoreanRefs = 0;
  let numericUnverifiedRefs = 0;
  let koreanUnavailableRefs = 0;
  const byDerivation = {};
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.localeRef === "string" && value.localeRef) {
      const exact = getExactRuntimeLocalePayload(registry, value.localeRef, "ko");
      const display = getRuntimeDisplayLocalePayload(registry, value.localeRef, "ko");
      const record = registry.records[value.localeRef];
      if (!exact && display) {
        const derivation = record?.derivation?.kind ?? "unclassified";
        semanticTemplateKoreanRefs += 1;
        if (record?.numericAuthority === "91tob-structural-unverified") numericUnverifiedRefs += 1;
        byDerivation[derivation] = (byDerivation[derivation] ?? 0) + 1;
      } else if (!display) {
        koreanUnavailableRefs += 1;
      }
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(dataset);
  return Object.freeze({
    recoveredExactKoRefAliases:
      TLIDB_HERO_MEMORY_LOCALE_REF_OVERLAY.counts.ambiguousLiteralCandidatesResolved,
    semanticTemplateKoreanRefs,
    numericUnverifiedRefs,
    koreanUnavailableRefs,
    sourceCollectionGap: koreanUnavailableRefs,
    sourceCollectionComplete: koreanUnavailableRefs === 0,
    byDerivation: Object.freeze(Object.fromEntries(
      Object.entries(byDerivation).sort(([left], [right]) => left.localeCompare(right)),
    )),
  });
}

function sumTypeReport(typeReports, section, field) {
  return typeReports.reduce((total, report) => total + report[section][field], 0);
}

function heroMemoryCoverageBlockers(typeReports) {
  const definitions = [
    {
      code: "base-enhancement-ko-unavailable",
      section: "base",
      sourceField: "sourceEnhancementValues",
      exactField: "selectableEnhancementValues",
    },
    {
      code: "fixed-affix-group-ko-unavailable",
      section: "fixed",
      sourceField: "sourceGroups",
      exactField: "selectableGroups",
    },
    {
      code: "fixed-affix-tier-ko-unavailable",
      section: "fixed",
      sourceField: "sourceTiers",
      exactField: "selectableTiers",
    },
    {
      code: "random-affix-group-ko-unavailable",
      section: "random",
      sourceField: "sourceGroups",
      exactField: "selectableGroups",
    },
    {
      code: "random-affix-tier-ko-unavailable",
      section: "random",
      sourceField: "sourceTiers",
      exactField: "selectableTiers",
    },
  ];
  return definitions.map(({ code, section, sourceField, exactField }) => {
    const source = sumTypeReport(typeReports, section, sourceField);
    const exact = sumTypeReport(typeReports, section, exactField);
    return Object.freeze({
      code,
      classification: "current-tlidb-korean-display-unavailable",
      omitted: source - exact,
      source,
    });
  }).filter(({ omitted }) => omitted > 0);
}

function currentRevivalSourceConflictAudit(mappedFlatModifierIds) {
  const metadata = CURRENT_RUNTIME_LOCALES?.metadata;
  const reconciliation = metadata?.memoryRefReconciliation;
  const issues = Array.isArray(reconciliation?.issues) ? reconciliation.issues : [];
  const currentSourceConflictCount =
    reconciliation?.counts?.sourceConflictRevivalTiers ?? issues.length;
  const flatConflictItems = CATALOG.heroMemory.filter((item) => item?.sourceConflict);
  const collectedAt = Date.parse(metadata?.collectedAt ?? "");
  const mappedFlatConflictMarkerCount = flatConflictItems.filter(({ id }) => (
    mappedFlatModifierIds.has(id)
  )).length;
  const supersededFlatConflictMarkerCount = flatConflictItems.filter((item) => {
    const checkedAt = Date.parse(item?.sourceConflict?.sourceCheckedAt ?? "");
    return (
      mappedFlatModifierIds.has(item.id)
      && Number.isFinite(checkedAt)
      && Number.isFinite(collectedAt)
      && checkedAt < collectedAt
    );
  }).length;
  const currentComparisonComplete = (
    metadata?.targetSeason === 13
    && metadata?.complete === true
    && metadata?.verificationComplete === true
    && reconciliation?.complete === true
    && issues.length === 0
    && currentSourceConflictCount === 0
  );
  const flatConflictMarkerReclassificationComplete = (
    currentComparisonComplete
    && mappedFlatConflictMarkerCount === flatConflictItems.length
    && supersededFlatConflictMarkerCount === flatConflictItems.length
  );
  return Object.freeze({
    structuralReferenceVersion: reconciliation?.runtimeDataset?.manifestVersion ?? null,
    currentTlidbCollectedAt: metadata?.collectedAt ?? null,
    currentDirectGroupCount: reconciliation?.counts?.directRevivalGroups ?? 0,
    currentDirectTierCount: reconciliation?.counts?.directRevivalTiers ?? 0,
    currentSourceConflictCount,
    currentConflictIssueCount: issues.length,
    supersededFlatConflictMarkerCount,
    mappedFlatConflictMarkerCount,
    currentComparisonComplete,
    flatConflictMarkerReclassificationComplete,
    verificationComplete:
      currentComparisonComplete && flatConflictMarkerReclassificationComplete,
  });
}

function verifiedKoFlatName(item) {
  const locale = item?.tlidbText?.ko;
  if (
    (locale?.sourcePageVersion ?? locale?.sourceSeasonEvidence?.sourcePageVersion) !== "SS13"
    || locale?.sourceSeasonEvidence?.verificationComplete !== true
    || locale?.sourceFieldStatus?.name !== "exact"
    || typeof locale?.name !== "string"
    || !locale.name.trim()
  ) return "";
  return locale.name;
}

function assertCurrentFlatAuthority() {
  const refresh = CATALOG_METADATA?.ss13Refresh;
  const finalization = CATALOG_METADATA?.ss13FlatFinalization;
  const structural = finalization?.structural;
  const structuralCounts = structural?.counts;
  const memoryComposition = structural?.memoryComposition;
  if (
    CATALOG_METADATA?.tlidbSeason !== 13
    || CATALOG_METADATA?.activeSeason !== "SS13"
    || refresh?.sameRunFingerprintVerified !== true
    || refresh?.integrityVerificationComplete !== true
    || CATALOG.heroMemory.length !== CURRENT_FLAT_AUTHORITY.itemCount
    || finalization?.counts?.heroMemory !== CURRENT_FLAT_AUTHORITY.itemCount
    || structuralCounts?.memoryStableIds !== CURRENT_FLAT_AUTHORITY.stableIdCount
    || structuralCounts?.memoryCoveredStableIds !== CURRENT_FLAT_AUTHORITY.stableIdCount
    || structuralCounts?.memoryItems !== CURRENT_FLAT_AUTHORITY.itemCount
    || structuralCounts?.memoryVerifiedRemovedGroups !== CURRENT_FLAT_AUTHORITY.verifiedRemovedGroupCount
    || structural?.verifiedRemoved?.length !== CURRENT_FLAT_AUTHORITY.verifiedRemovedGroupCount
    || memoryComposition?.partialExistingGroups !== 0
    || memoryComposition?.verifiedRemovedGroups !== CURRENT_FLAT_AUTHORITY.verifiedRemovedGroupCount
    || memoryComposition?.totalItems !== CURRENT_FLAT_AUTHORITY.itemCount
  ) throw new Error("Verified TLIDB SS13 hero-memory flat authority is required");

  const removedStableIds = new Set();
  for (const removal of structural.verifiedRemoved) {
    if (
      removal?.category !== "heroMemory"
      || removal?.evidence?.sourcePath !== "Memory_Revival"
      || removal?.evidence?.localeStableIdParityComplete !== true
      || removal?.evidence?.currentStableIdCount !== CURRENT_FLAT_AUTHORITY.stableIdCount
      || !Array.isArray(removal?.stableIds)
      || removal.stableIds.length === 0
    ) throw new Error("Verified TLIDB SS13 hero-memory removal evidence is required");
    for (const stableId of removal.stableIds) {
      if (removedStableIds.has(String(stableId))) {
        throw new Error(`Duplicate verified hero-memory removal stable ID: ${stableId}`);
      }
      removedStableIds.add(String(stableId));
    }
  }
  for (const item of CATALOG.heroMemory) {
    if (!verifiedKoFlatName(item)) {
      throw new Error(`Missing exact TLIDB SS13 Korean hero-memory item: ${item.id}`);
    }
  }
  return removedStableIds;
}

function assertCurrentRuntimeRemovalEvidence(flatRemovedStableIds) {
  const revival = CURRENT_RUNTIME_LOCALES?.metadata?.ss13RuntimeCatalogOverlay?.revivalCatalog;
  const groups = revival?.verifiedRemovedGroups;
  const stableIds = new Set((groups ?? []).flatMap(({ sourceDataIds }) => sourceDataIds ?? []).map(String));
  const addedRows = new Set((revival?.addedRows ?? []).map(String));
  if (
    CURRENT_RUNTIME_LOCALES?.metadata?.targetSeason !== 13
    || CURRENT_RUNTIME_LOCALES?.metadata?.complete !== true
    || CURRENT_RUNTIME_LOCALES?.metadata?.verificationComplete !== true
    || revival?.verificationComplete !== true
    || revival?.sourceRows !== CURRENT_FLAT_AUTHORITY.stableIdCount
    || revival?.priorSourceRows !== revival?.priorRows + stableIds.size
    || revival?.sourceRows !== revival?.priorRows + addedRows.size
    || addedRows.size !== (revival?.addedRows ?? []).length
    || revival?.verifiedRemovedRows !== stableIds.size
    || groups?.length !== CURRENT_FLAT_AUTHORITY.verifiedRemovedGroupCount
    || stableIds.size !== flatRemovedStableIds.size
    || [...stableIds].some((stableId) => !flatRemovedStableIds.has(stableId))
  ) throw new Error("Verified TLIDB SS13 runtime hero-memory removal evidence is required");
  return { groupCount: groups.length, stableIds };
}

function createActiveHeroMemoryDataset(sourceDataset, registry) {
  const verifiedRemovedStableIds = assertCurrentFlatAuthority();
  const runtimeRemovalEvidence = assertCurrentRuntimeRemovalEvidence(verifiedRemovedStableIds);
  const localeRefAudit = countLocaleRefs(sourceDataset, registry);
  const localeGapClassification = classifyMissingLocaleRefs(sourceDataset, registry);
  const typeItems = new Map();

  for (const identity of HERO_MEMORY_TYPE_IDENTITIES) {
    const item = CATALOG.heroMemory.find(({ id }) => id === identity.flatCatalogId);
    if (
      !item
      || tlidbPageSlug(item.sourceUrl) !== identity.sourcePath
      || verifiedKoFlatName(item) === ""
    ) throw new Error(`Missing current flat hero-memory identity: ${identity.runtimeId}`);
    typeItems.set(identity.runtimeId, item);
  }

  const flatModifierItems = CATALOG.heroMemory.filter(({ id }) => (
    !HERO_MEMORY_TYPE_IDENTITIES.some(({ flatCatalogId }) => flatCatalogId === id)
  ));
  const flatModifierByKo = new Map(flatModifierItems.map((item) => [
    normalizedSourceText(verifiedKoFlatName(item)),
    item,
  ]));
  const expectedModifierCount = CURRENT_FLAT_AUTHORITY.itemCount - HERO_MEMORY_TYPE_IDENTITIES.length;
  if (flatModifierItems.length !== expectedModifierCount || flatModifierByKo.size !== expectedModifierCount) {
    throw new Error(`TLIDB SS13 hero-memory modifier authority must contain ${expectedModifierCount} unique rows`);
  }

  const typeReports = [];
  const memoryTypes = sourceDataset.memoryTypes.map((memoryType) => {
    const typeItem = typeItems.get(memoryType.slotId);
    const typePayload = localizedKoPayload(registry, memoryType)?.payload;
    if (!typeItem || payloadText(typePayload) !== verifiedKoFlatName(typeItem)) {
      throw new Error(`Hero-memory type is not anchored to current TLIDB Korean: ${memoryType.slotId}`);
    }
    const base = filterBaseGroups(registry, memoryType.baseAttributeGroups ?? [], typeItem.id);
    const fixed = filterAffixGroups(registry, memoryType.fixedAffixGroups ?? [], typeItem.id);
    const random = filterAffixGroups(registry, memoryType.randomAffixGroups ?? [], typeItem.id);
    typeReports.push({ runtimeId: memoryType.slotId, base: base.report, fixed: fixed.report, random: random.report });
    return {
      ...memoryType,
      runtimeSlotId: memoryType.slotId,
      legacySlotIds: [memoryType.slotId],
      flatCatalogId: typeItem.id,
      memoryType: verifiedKoFlatName(typeItem),
      baseAttributeGroups: base.selectable,
      fixedAffixGroups: fixed.selectable,
      randomAffixGroups: random.selectable,
      localeAuthority: "tlidb-current-ss13-exact-ko",
    };
  });

  const mappedFlatModifierIds = new Set();
  const excludedRemovedStableIds = new Set();
  let verifiedRemovedRuntimeGroupCount = 0;
  const revivalReports = {};
  const sections = Object.fromEntries(Object.entries(sourceDataset.revivalCatalog?.sections ?? {}).map(
    ([sectionName, groups]) => {
      const mappedGroups = groups.flatMap((group) => {
        const sourceDataIds = (group.sourceDataIds ?? []).map(String);
        const removedCount = sourceDataIds.filter((stableId) => verifiedRemovedStableIds.has(stableId)).length;
        if (removedCount > 0 && removedCount !== sourceDataIds.length) {
          throw new Error(`Partially removed hero-memory runtime group: ${group.id}`);
        }
        if (removedCount === sourceDataIds.length && sourceDataIds.length > 0) {
          for (const stableId of sourceDataIds) {
            if (excludedRemovedStableIds.has(stableId)) {
              throw new Error(`Duplicate removed hero-memory runtime stable ID: ${stableId}`);
            }
            excludedRemovedStableIds.add(stableId);
          }
          verifiedRemovedRuntimeGroupCount += 1;
          return [];
        }
        const koText = payloadText(getExactRuntimeLocalePayload(registry, group.localeRef, "ko"));
        const item = flatModifierByKo.get(normalizedSourceText(koText));
        if (!item || mappedFlatModifierIds.has(item.id)) {
          throw new Error(`Hero-memory revival row is not uniquely anchored to current flat data: ${group.id}`);
        }
        mappedFlatModifierIds.add(item.id);
        return [{ ...group, flatCatalogId: item.id }];
      });
      const filtered = filterAffixGroups(registry, mappedGroups, null);
      revivalReports[sectionName] = filtered.report;
      return [sectionName, filtered.selectable.map((group) => ({
        ...group,
        ownerFlatCatalogId: group.flatCatalogId,
      }))];
    },
  ));
  if (verifiedRemovedRuntimeGroupCount !== CURRENT_FLAT_AUTHORITY.verifiedRemovedGroupCount) {
    if (verifiedRemovedRuntimeGroupCount !== 0) {
      throw new Error("Not every verified removed SS13 hero-memory group was excluded from runtime selection");
    }
    for (const stableId of runtimeRemovalEvidence.stableIds) excludedRemovedStableIds.add(stableId);
    verifiedRemovedRuntimeGroupCount = runtimeRemovalEvidence.groupCount;
  }
  if (excludedRemovedStableIds.size !== verifiedRemovedStableIds.size) {
    throw new Error("Not every verified removed SS13 hero-memory stable ID was excluded from runtime selection");
  }
  if (mappedFlatModifierIds.size !== flatModifierItems.length) {
    throw new Error("Not every current TLIDB SS13 hero-memory modifier was mapped");
  }

  const sourceConflictAudit = currentRevivalSourceConflictAudit(mappedFlatModifierIds);
  if (!sourceConflictAudit.verificationComplete) {
    throw new Error("Current TLIDB SS13 hero-memory source conflict audit is incomplete");
  }
  const blockers = heroMemoryCoverageBlockers(typeReports);
  const directTextCalculationConflictRefs = [
    ...typeReports.map(({ fixed, random }) => (
      fixed.directTextCalculationConflictTiers + random.directTextCalculationConflictTiers
    )),
    ...Object.values(revivalReports).map(({ directTextCalculationConflictTiers }) => (
      directTextCalculationConflictTiers
    )),
  ].reduce((total, count) => total + count, 0);
  const selectionWeightConflictRefs = [
    ...typeReports.map(({ fixed, random }) => (
      fixed.selectionWeightConflictTiers + random.selectionWeightConflictTiers
    )),
    ...Object.values(revivalReports).map(({ selectionWeightConflictTiers }) => (
      selectionWeightConflictTiers
    )),
  ].reduce((total, count) => total + count, 0);

  const report = Object.freeze({
    schemaVersion: 1,
    activeSeason: "SS13",
    flatAuthorityCount: CATALOG.heroMemory.length,
    mappedFlatAuthorityCount: typeItems.size + mappedFlatModifierIds.size,
    verifiedRemovedRuntimeGroupCount,
    verifiedRemovedStableIdCount: excludedRemovedStableIds.size,
    localeRefs: localeRefAudit,
    localeGapClassification,
    numericAuthority: Object.freeze({
      semanticTemplateUnverifiedRefs: localeGapClassification.numericUnverifiedRefs,
      directTextCalculationConflictRefs,
      selectionWeightConflictRefs,
      runtimeCalculationComplete: false,
    }),
    sourceConflictAudit,
    selectionFilteringComplete: true,
    sourceCollectionComplete: localeGapClassification.sourceCollectionComplete,
    sourceCoverageComplete: blockers.length === 0,
    typeReports,
    revivalReports,
    blockers: Object.freeze(blockers),
  });

  if (
    localeRefAudit.total !== 2481
    || localeRefAudit.directExactKoreanRefs !== 1898
    || localeRefAudit.semanticTemplateKoreanRefs !== 583
    || localeRefAudit.koreanUnavailableRefs !== 0
    || localeGapClassification.semanticTemplateKoreanRefs !== 583
    || localeGapClassification.numericUnverifiedRefs !== 583
    || localeGapClassification.koreanUnavailableRefs !== 0
    || localeGapClassification.sourceCollectionGap !== 0
    || directTextCalculationConflictRefs !== 0
    || selectionWeightConflictRefs !== 3
    || report.mappedFlatAuthorityCount !== CURRENT_FLAT_AUTHORITY.itemCount
  ) throw new Error("Unexpected TLIDB SS13 hero-memory source coverage");

  return {
    dataset: {
      ...sourceDataset,
      memoryTypes,
      revivalCatalog: {
        ...sourceDataset.revivalCatalog,
        sections,
      },
      activeHeroMemoryReport: report,
    },
    sourceDataset,
    registry,
    report,
  };
}

export function loadActiveHeroMemoryDataset() {
  activeHeroMemoryPromise ??= loadActiveRuntimeDataset(DATASET_NAME)
    .then((dataset) => attachActiveRuntimeDatasetLocaleRefs(DATASET_NAME, dataset))
    .then(({ dataset, registry }) => createActiveHeroMemoryDataset(dataset, registry));
  return activeHeroMemoryPromise;
}
