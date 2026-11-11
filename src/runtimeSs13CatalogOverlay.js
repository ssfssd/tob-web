export function applySs13RuntimeCatalogOverlay(runtimeCatalog, overlay) {
  if (!overlay?.verificationComplete || overlay.targetSeason !== 13) return runtimeCatalog;
  const result = structuredClone(runtimeCatalog);
  const revivalOverlay = overlay.revivalCatalog ?? (overlay.sections ? overlay : null);
  const elixirOverlay = overlay.elixirSkillCatalog ?? null;
  const heroOverlay = overlay.heroCatalog ?? null;
  if (revivalOverlay?.verificationComplete && result.datasets?.hero_memory_catalog?.revivalCatalog) {
    result.datasets.hero_memory_catalog.revivalCatalog.sections = structuredClone(revivalOverlay.sections);
    if (result.categories?.heroes?.hero_memory_catalog?.revivalCatalog) {
      result.categories.heroes.hero_memory_catalog.revivalCatalog.sections = structuredClone(revivalOverlay.sections);
    }
  }
  if (elixirOverlay?.verificationComplete && result.datasets?.skill_elixir_catalog) {
    result.datasets.skill_elixir_catalog.skills = structuredClone(elixirOverlay.skills);
    if (result.categories?.skills?.skill_elixir_catalog) {
      result.categories.skills.skill_elixir_catalog.skills = structuredClone(elixirOverlay.skills);
    }
  }
  if (heroOverlay?.verificationComplete) {
    for (const heroCatalog of [
      result.datasets?.hero_catalog,
      result.categories?.heroes?.hero_catalog,
    ].filter(Boolean)) {
      const activeHeroes = (heroCatalog.heroes ?? []).filter((hero) => (
        Object.hasOwn(heroOverlay.sourceUrlsBySourcePath ?? {}, hero.sourcePath)
      ));
      if (activeHeroes.length !== heroOverlay.expectedHeroes) {
        throw new Error("TLIDB SS13 active hero set does not match the verified runtime overlay");
      }
      for (const hero of activeHeroes) {
        const sourceUrl = heroOverlay.sourceUrlsBySourcePath?.[hero.sourcePath];
        if (sourceUrl) hero.sourceUrl = sourceUrl;
      }
      heroCatalog.heroes = activeHeroes;
    }
  }
  result.metadata = {
    ...(result.metadata ?? {}),
    activeSeason: "SS13",
    tlidbSs13RuntimeOverlay: {
      schemaVersion: overlay.schemaVersion ?? 1,
      sourcePath: revivalOverlay?.sourcePath ?? overlay.sourcePath ?? "TLIDB_SS13_Runtime",
      priorRows: revivalOverlay?.priorRows ?? 0,
      priorSourceRows: revivalOverlay?.priorSourceRows ?? revivalOverlay?.priorRows ?? 0,
      addedRows: revivalOverlay?.addedRows ?? [],
      verifiedRemovedRows: revivalOverlay?.verifiedRemovedRows ?? 0,
      verifiedRemovedGroups: structuredClone(revivalOverlay?.verifiedRemovedGroups ?? []),
      sourceRows: revivalOverlay?.sourceRows ?? 0,
      ...(elixirOverlay ? { elixirSkillCatalog: structuredClone(elixirOverlay) } : {}),
      ...(heroOverlay ? { heroCatalog: structuredClone(heroOverlay) } : {}),
      verificationComplete: true,
    },
  };
  return result;
}
