function cloneJson(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]),
    );
  }

  return value;
}

export const RUNTIME_DATASET_NAMES = Object.freeze([
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
  "skill_elixir_catalog",
  "talent_catalog",
  "hero_catalog",
  "hero_memory_catalog",
  "pactspirit_catalog",
  "destiny_catalog",
  "divinity_talent_catalog",
  "hades_divinity_catalog",
]);

const DATASET_NAMES_BY_CATEGORY = Object.freeze({
  gear: Object.freeze([
    "gear_select_catalog",
    "gear_craft_affixes",
    "gear_graft_affixes",
    "gear_legendary_details",
  ]),
  skills: Object.freeze([
    "skill_active",
    "skill_passive",
    "skill_support",
    "skill_activation_medium",
    "skill_magnificent_support",
    "skill_noble_support",
    "skill_modularization_catalog",
    "skill_elixir_catalog",
  ]),
  talents: Object.freeze(["talent_catalog"]),
  heroes: Object.freeze(["hero_catalog", "hero_memory_catalog"]),
  pact: Object.freeze(["pactspirit_catalog", "destiny_catalog"]),
  divinity: Object.freeze(["divinity_talent_catalog", "hades_divinity_catalog"]),
});

function datasetsByCategory(datasets) {
  return Object.fromEntries(
    Object.entries(DATASET_NAMES_BY_CATEGORY).map(([category, names]) => [
      category,
      Object.fromEntries(
        names
          .filter((name) => Object.hasOwn(datasets, name))
          .map((name) => [name, datasets[name]]),
      ),
    ]),
  );
}

function createDatasetReport(datasets) {
  const missingDatasets = [];

  for (const [category, names] of Object.entries(DATASET_NAMES_BY_CATEGORY)) {
    for (const name of names) {
      if (!Object.hasOwn(datasets, name)) {
        missingDatasets.push({ name, category });
      }
    }
  }

  return {
    expectedCount: RUNTIME_DATASET_NAMES.length,
    presentCount: RUNTIME_DATASET_NAMES.length - missingDatasets.length,
    complete: missingDatasets.length === 0,
    missingDatasets,
  };
}

export function createRuntimeCatalog(manifest, datasets) {
  const clonedDatasets = cloneJson(datasets);

  return {
    manifest: cloneJson(manifest),
    datasets: clonedDatasets,
    categories: datasetsByCategory(clonedDatasets),
    datasetReport: createDatasetReport(clonedDatasets),
  };
}

export function runtimeCatalogToSource(catalog) {
  return {
    manifest: cloneJson(catalog.manifest),
    datasets: cloneJson(catalog.datasets),
  };
}
