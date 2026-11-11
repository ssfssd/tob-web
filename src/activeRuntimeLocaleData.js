import { attachRuntimeLocaleRefs, createRuntimeLocaleRegistry } from "./runtimeLocale.js";
import { applyHeroMemoryLocaleRefOverlay } from "./heroMemoryLocaleRefOverlay.js";
import {
  TLIDB_HERO_MEMORY_LOCALE_REF_OVERLAY,
} from "./data/tlidbHeroMemoryLocaleRefOverlay.generated.js";

let activeRuntimeLocaleRegistryPromise;

function activeDatasetRefs(datasetName, dataset, refs) {
  if (datasetName !== "hero_catalog") return refs;
  if (
    dataset?.heroes?.length !== 26
    || dataset.heroes[25]?.sourcePath !== "Licorice_Note"
  ) throw new Error("Verified TLIDB SS13 hero locale ref layout is required");

  return Object.fromEntries(Object.entries(refs).map(([path, localeRef]) => [
    path.replace(/^hero_catalog\.heroes\[26\]/u, "hero_catalog.heroes[25]"),
    localeRef,
  ]));
}

export function loadActiveRuntimeLocaleRegistry() {
  activeRuntimeLocaleRegistryPromise ??= import(
    "./data/tlidbRuntimeLocales.ss13.generated.js"
  ).then(({ TLIDB_RUNTIME_LOCALES }) => {
    const metadata = TLIDB_RUNTIME_LOCALES?.metadata;
    if (
      metadata?.targetSeason !== 13
      || metadata?.complete !== true
      || metadata?.verificationComplete !== true
      || metadata?.counts?.records !== Object.keys(TLIDB_RUNTIME_LOCALES.records ?? {}).length
      || metadata?.counts?.refs !== Object.keys(TLIDB_RUNTIME_LOCALES.refs ?? {}).length
    ) throw new Error("Verified TLIDB SS13 runtime locale registry is required");
    return createRuntimeLocaleRegistry(applyHeroMemoryLocaleRefOverlay(
      TLIDB_RUNTIME_LOCALES,
      TLIDB_HERO_MEMORY_LOCALE_REF_OVERLAY,
    ));
  });
  return activeRuntimeLocaleRegistryPromise;
}

export async function attachActiveRuntimeDatasetLocaleRefs(datasetName, dataset) {
  const registry = await loadActiveRuntimeLocaleRegistry();
  return {
    dataset: attachRuntimeLocaleRefs(
      datasetName,
      dataset,
      activeDatasetRefs(datasetName, dataset, registry.refs),
    ),
    registry,
  };
}
