import { RUNTIME_DATASET_NAMES } from "./runtimeCatalog.js";
import { applyVerifiedRuntimeMappingOverlay } from "./runtimeMappingOverlay.js";

const runtimeDatasetNames = new Set(RUNTIME_DATASET_NAMES);
let runtimeCatalogPromise;

export function loadRuntimeCatalog() {
  runtimeCatalogPromise ??= Promise.all([
    import("./data/runtimeCatalog.generated.js"),
    import("./data/tlidbRuntimeMappingOverlay.generated.js"),
  ]).then(([{ RUNTIME_CATALOG }, { TLIDB_RUNTIME_MAPPING_OVERLAY }]) => (
    applyVerifiedRuntimeMappingOverlay(RUNTIME_CATALOG, TLIDB_RUNTIME_MAPPING_OVERLAY)
  ));
  return runtimeCatalogPromise;
}

export async function loadRuntimeDataset(datasetName) {
  if (!runtimeDatasetNames.has(datasetName)) {
    throw new RangeError(`Unknown 91TOB runtime dataset: ${datasetName}`);
  }

  const catalog = await loadRuntimeCatalog();
  if (!Object.hasOwn(catalog.datasets, datasetName)) {
    throw new Error(`Missing 91TOB runtime dataset: ${datasetName}`);
  }
  return catalog.datasets[datasetName];
}

export async function getRuntimeDataIdentity() {
  const catalog = await loadRuntimeCatalog();
  return {
    version: catalog.manifest.version,
    generatedAt: catalog.manifest.generatedAt,
    datasetCount: Object.keys(catalog.datasets).length,
    complete: catalog.datasetReport.complete,
  };
}
