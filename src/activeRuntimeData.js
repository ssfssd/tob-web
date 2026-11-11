import { RUNTIME_DATASET_NAMES } from "./runtimeCatalog.js";
import { loadRuntimeCatalog } from "./runtimeData.js";
import { applySs13RuntimeCatalogOverlay } from "./runtimeSs13CatalogOverlay.js";

const runtimeDatasetNames = new Set(RUNTIME_DATASET_NAMES);
const directlyVerifiedOverlayScopes = Object.freeze([
  "hero_catalog.activeHeroes",
  "hero_memory_catalog.revivalCatalog",
  "skill_elixir_catalog.skills",
]);
const runtimeOverlayBlockers = Object.freeze([
  Object.freeze({
    code: "official-ss13-runtime-structure-overlay-partial",
    scope: "runtime-catalog",
    unresolvedDatasetScopes: Object.freeze([
      "gear_select_catalog",
      "gear_craft_affixes",
      "gear_graft_affixes",
      "gear_legendary_details",
      "skill_active",
      "skill_passive",
      "skill_support",
      "skill_activation_medium",
      "skill_magnificent_support",
      "skill_noble_support",
      "skill_modularization_catalog",
      "talent_catalog",
      "hero_memory_catalog.memoryTypes",
      "pactspirit_catalog",
      "destiny_catalog",
      "divinity_talent_catalog",
      "hades_divinity_catalog",
    ]),
  }),
]);
let activeRuntimeCatalogPromise;

export function loadActiveRuntimeCatalog() {
  activeRuntimeCatalogPromise ??= Promise.all([
    loadRuntimeCatalog(),
    import("./data/tlidbRuntimeLocales.ss13.generated.js"),
  ]).then(([runtimeCatalog, { TLIDB_RUNTIME_LOCALES }]) => {
    const metadata = TLIDB_RUNTIME_LOCALES?.metadata;
    if (
      metadata?.targetSeason !== 13
      || metadata?.complete !== true
      || metadata?.verificationComplete !== true
      || metadata?.ss13RuntimeCatalogOverlay?.verificationComplete !== true
    ) throw new Error("Verified TLIDB SS13 runtime dataset is required");
    const catalog = applySs13RuntimeCatalogOverlay(
      runtimeCatalog,
      metadata.ss13RuntimeCatalogOverlay,
    );
    if (catalog.metadata?.activeSeason !== "SS13") {
      throw new Error("TLIDB SS13 runtime catalog overlay was not applied");
    }
    return {
      ...catalog,
      runtimeSeasonReport: {
        schemaVersion: 1,
        activeSeason: "SS13",
        baselineVerificationComplete: true,
        overlayApplicationComplete: false,
        overlayAppliedScopes: directlyVerifiedOverlayScopes,
        sourcePageCount: metadata.inMemoryCollection?.pageCount ?? 0,
        sourceConflictCount: metadata.finalizationConflicts?.totalSourceConflicts
          ?? metadata.sourceConflicts?.length
          ?? metadata.conflicts?.length
          ?? 0,
        blockers: runtimeOverlayBlockers,
      },
    };
  });
  return activeRuntimeCatalogPromise;
}

export async function loadActiveRuntimeDataset(datasetName) {
  if (!runtimeDatasetNames.has(datasetName)) {
    throw new RangeError(`Unknown active runtime dataset: ${datasetName}`);
  }

  const catalog = await loadActiveRuntimeCatalog();
  if (!Object.hasOwn(catalog.datasets, datasetName)) {
    throw new Error(`Missing active runtime dataset: ${datasetName}`);
  }
  return catalog.datasets[datasetName];
}

export async function getActiveRuntimeDataIdentity() {
  const catalog = await loadActiveRuntimeCatalog();
  return {
    structuralReferenceVersion: catalog.manifest.version,
    activeSeason: catalog.runtimeSeasonReport.activeSeason,
    baselineVerificationComplete: catalog.runtimeSeasonReport.baselineVerificationComplete,
    overlayApplicationComplete: catalog.runtimeSeasonReport.overlayApplicationComplete,
    overlayBlockerCount: catalog.runtimeSeasonReport.blockers.length,
    datasetCount: Object.keys(catalog.datasets).length,
  };
}
