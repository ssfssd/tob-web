import { createRuntimeLocaleRegistry } from "./runtimeLocale.js";
import { CATALOG, CATALOG_METADATA } from "./catalog.js";
import { applyCurrentSs13GearCraftData } from "./activeGearCraftData.js";
import { applySs13GraftCaptureAuthority } from "./ss13GraftCaptureAuthority.js";

const SS13_SEASON = 13;
const SS13_DANGLING_REF_COUNT = 659;
const SS13_LOCALIZED_NIGHTMARE_RECORD_COUNT = 1140;
const SS13_KOREAN_UNAVAILABLE_RECORD_COUNT = 0;
const LOCALIZED_NIGHTMARE_STATUS = "localized-current-tlidb-template";
const KOREAN_UNAVAILABLE_STATUS = "verified-absent-preserved-cn";

let activeGearLocaleRegistryPromise;

function requireCount(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function frozenLimitationEntries(entries) {
  return Object.freeze(entries.map(([ref, sourceRecordKey]) => Object.freeze({
    ref,
    sourceRecordKey,
  })));
}

export function createActiveGearLocaleRegistry(source) {
  if (source?.metadata?.targetSeason !== SS13_SEASON) {
    throw new Error("Active gear locale source is not the current TLIDB SS13 artifact");
  }

  const recordEntries = Object.entries(source.records ?? {});
  const refEntries = Object.entries(source.refs ?? {});
  requireCount("SS13 gear locale record metadata", source.metadata.counts?.records, recordEntries.length);
  requireCount("SS13 gear locale ref metadata", source.metadata.counts?.refs, refEntries.length);

  const danglingRefs = refEntries.filter(([, recordKey]) => !Object.hasOwn(source.records, recordKey));
  requireCount("SS13 gear locale dangling-ref metadata", source.metadata.danglingRefCount, SS13_DANGLING_REF_COUNT);
  requireCount("SS13 gear locale dangling refs", danglingRefs.length, SS13_DANGLING_REF_COUNT);

  const koreanUnavailableRecords = recordEntries.filter(([, record]) => (
    record?.status === KOREAN_UNAVAILABLE_STATUS
  ));
  const localizedNightmareRecords = recordEntries.filter(([, record]) => (
    record?.status === LOCALIZED_NIGHTMARE_STATUS
  ));
  requireCount(
    "SS13 gear locale Korean-unavailable metadata",
    source.metadata.counts?.verifiedAbsentRecords,
    SS13_KOREAN_UNAVAILABLE_RECORD_COUNT,
  );
  requireCount(
    "SS13 gear locale Korean-unavailable records",
    koreanUnavailableRecords.length,
    SS13_KOREAN_UNAVAILABLE_RECORD_COUNT,
  );
  requireCount(
    "SS13 gear locale localized-Nightmare metadata",
    source.metadata.counts?.localizedNightmareRecords,
    SS13_LOCALIZED_NIGHTMARE_RECORD_COUNT,
  );
  requireCount(
    "SS13 gear locale localized-Nightmare records",
    localizedNightmareRecords.length,
    SS13_LOCALIZED_NIGHTMARE_RECORD_COUNT,
  );
  requireCount(
    "SS13 gear locale localized-Nightmare audit",
    source.metadata.koreanExposureAudit?.localizedNightmareRecords,
    SS13_LOCALIZED_NIGHTMARE_RECORD_COUNT,
  );
  requireCount(
    "SS13 gear locale localized-Nightmare Han-script audit",
    source.metadata.koreanExposureAudit?.localizedNightmareRecordsWithHanText,
    0,
  );
  requireCount(
    "SS13 gear locale legacy preserved-CN audit",
    source.metadata.koreanExposureAudit?.legacyPreservedCnRecords,
    0,
  );
  requireCount(
    "SS13 gear locale unexpected Korean Han-script audit",
    source.metadata.koreanExposureAudit?.unexpectedHanInCurrentTlidbKoRecords,
    0,
  );

  const activeRefs = Object.fromEntries(
    refEntries.filter(([, recordKey]) => Object.hasOwn(source.records, recordKey)),
  );
  const runtimeRegistry = createRuntimeLocaleRegistry({
    records: source.records,
    refs: activeRefs,
  });
  const danglingRefEntries = frozenLimitationEntries(danglingRefs);
  const danglingRefLookup = Object.freeze(Object.fromEntries(
    danglingRefs.map(([ref]) => [ref, true]),
  ));
  const danglingRecordLookup = Object.freeze(Object.fromEntries(
    danglingRefs.map(([, recordKey]) => [recordKey, true]),
  ));

  return Object.freeze({
    ...runtimeRegistry,
    metadata: Object.freeze({
      ...source.metadata,
      complete: false,
      activeSourceTrack: "tlidb-current-ss13",
      activeCounts: Object.freeze({
        records: recordEntries.length,
        sourceRefs: refEntries.length,
        refs: Object.keys(activeRefs).length,
        isolatedRefs: danglingRefs.length,
        koreanLocaleUnavailableRecords: koreanUnavailableRecords.length,
        localizedNightmareRecords: localizedNightmareRecords.length,
        nightmareDirectValueAuthorityUnverifiedRecords: localizedNightmareRecords.length,
      }),
      sourceLimitations: Object.freeze({
        unresolvedCurrentSourceRefs: Object.freeze({
          status: "current-source-ref-unresolved",
          count: danglingRefs.length,
          refs: danglingRefEntries,
          refLookup: danglingRefLookup,
          sourceRecordLookup: danglingRecordLookup,
          userMessage: Object.freeze({
            ko: "현재 출처 참조 미연결",
            en: "Current source reference unresolved",
          }),
        }),
        koreanLocaleUnavailable: Object.freeze({
          status: "locale-unavailable",
          count: koreanUnavailableRecords.length,
          recordStatus: KOREAN_UNAVAILABLE_STATUS,
          behavior: "Legacy preserved-CN records remain blocked; the expected count is zero",
        }),
        nightmareDirectValueAuthorityUnverified: Object.freeze({
          status: "value-authority-unverified",
          count: localizedNightmareRecords.length,
          recordStatus: LOCALIZED_NIGHTMARE_STATUS,
          behavior: "Display current TLIDB Korean semantic templates; do not treat 91TOB Nightmare roll values as authoritative game data",
        }),
      }),
      unverifiedScope: Object.freeze([
        ...(source.metadata.unverifiedScope ?? []),
        `${SS13_DANGLING_REF_COUNT} current-source refs remain isolated because their active record references are unresolved`,
        "1140 Nightmare records have current TLIDB Korean semantic templates, but dedicated modifier IDs and direct roll-value authority remain unverified",
      ]),
    }),
  });
}

export function loadGearLocaleRegistry() {
  activeGearLocaleRegistryPromise ??= Promise.all([
    import("./data/tlidbGearLocales.ss13.active.generated.js"),
    import("./data/tlidbGearCraftOverlay.generated.js"),
  ]).then(([
    { TLIDB_GEAR_LOCALES_SS13_ACTIVE },
    { TLIDB_GEAR_CRAFT_OVERLAY },
  ]) => {
    const registry = createActiveGearLocaleRegistry(TLIDB_GEAR_LOCALES_SS13_ACTIVE);
    const applied = applyCurrentSs13GearCraftData({
      catalog: CATALOG,
      catalogMetadata: CATALOG_METADATA,
      overlay: TLIDB_GEAR_CRAFT_OVERLAY,
      registry,
    });
    const priorIds = CATALOG.gear.map(({ id }) => id);
    const nextIds = applied.catalog.gear.map(({ id }) => id);
    if (JSON.stringify(priorIds) !== JSON.stringify(nextIds)) {
      throw new Error("Current SS13 gear craft activation changed catalog identity or order");
    }
    const supplemented = applySs13GraftCaptureAuthority(applied.catalog, registry, TLIDB_GEAR_LOCALES_SS13_ACTIVE.sources);
    CATALOG.gear.splice(0, CATALOG.gear.length, ...supplemented.catalog.gear);
    return Object.freeze({
      ...supplemented.registry,
      metadata: Object.freeze({
        ...supplemented.registry.metadata,
        craftRuntime: applied.verification,
        unverifiedScope: Object.freeze([
          ...(registry.metadata.unverifiedScope ?? []),
          ...applied.verification.sourceLimitations,
        ]),
      }),
    });
  });
  return activeGearLocaleRegistryPromise;
}
