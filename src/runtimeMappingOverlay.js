const SHA256 = /^[0-9a-f]{64}$/u;
const LOCALES = Object.freeze(["cn", "ko", "en"]);

function fail(code, path) {
  throw new Error(`${code}: ${path}`);
}

function runtimeDatasetEvidence(runtimeCatalog) {
  return runtimeCatalog?.manifest?.datasets?.find((entry) => entry.id === "skill_elixir_catalog");
}

function verifyOverlay(runtimeCatalog, overlay) {
  if (overlay?.schemaVersion !== 1) fail("runtime-mapping-overlay-schema", "schemaVersion");
  const runtimeDataset = runtimeDatasetEvidence(runtimeCatalog);
  if (
    !runtimeDataset
    || runtimeDataset.sha256 !== overlay.runtimeDataset?.sha256
    || runtimeDataset.url !== overlay.runtimeDataset?.url
    || runtimeDataset.bytes !== overlay.runtimeDataset?.bytes
  ) fail("runtime-mapping-overlay-dataset-mismatch", "runtimeDataset");
  if (!Array.isArray(overlay.patches) || overlay.patches.length !== 31) {
    fail("runtime-mapping-overlay-patch-count", "patches");
  }
  if (overlay.appliedMappingPatchCount !== overlay.patches.length) {
    fail("runtime-mapping-overlay-recorded-count", "appliedMappingPatchCount");
  }

  const paths = new Set();
  const pagesBySourceRef = new Map();
  for (const patch of overlay.patches) {
    if (paths.has(patch.runtimePath)) fail("runtime-mapping-overlay-duplicate-path", patch.runtimePath);
    paths.add(patch.runtimePath);
    if (!SHA256.test(patch.sourceEvidenceSha256 ?? "")) {
      fail("runtime-mapping-overlay-source-evidence", patch.runtimePath);
    }
    if (patch.runtimeDataset?.sha256 !== runtimeDataset.sha256) {
      fail("runtime-mapping-overlay-patch-dataset", patch.runtimePath);
    }
    for (const locale of LOCALES) {
      const page = patch.pages?.[locale];
      if (
        !String(page?.url ?? "").startsWith(`https://tlidb.com/${locale}/`)
        || !SHA256.test(page?.sha256 ?? "")
        || !String(page?.sourcePageRef ?? "").endsWith(`#${locale}`)
      ) fail("runtime-mapping-overlay-page-evidence", `${patch.runtimePath}:${locale}`);
    }
    const pageFingerprint = JSON.stringify(patch.pages);
    const previousPages = pagesBySourceRef.get(patch.sourceRef);
    if (previousPages && previousPages !== pageFingerprint) {
      fail("runtime-mapping-overlay-page-evidence", `${patch.runtimePath}:inconsistent-source-ref`);
    }
    pagesBySourceRef.set(patch.sourceRef, pageFingerprint);
  }
}

export function applyVerifiedRuntimeMappingOverlay(runtimeCatalog, overlay) {
  verifyOverlay(runtimeCatalog, overlay);
  const originalSkills = runtimeCatalog?.datasets?.skill_elixir_catalog?.skills;
  if (!Array.isArray(originalSkills)) fail("runtime-mapping-overlay-skills-missing", "skills");
  const skills = originalSkills.map((skill) => ({
    ...skill,
    effect_entries: Array.isArray(skill.effect_entries)
      ? skill.effect_entries.map((effect) => ({ ...effect }))
      : skill.effect_entries,
  }));

  for (const patch of overlay.patches) {
    const match = patch.runtimePath.match(
      /^skill_elixir_catalog\.skills\[(\d+)\]\.(?:(base_cooldown_sec|charge_progress_per_charge|url)|effect_entries\[(\d+)\]\.(kind))$/u,
    );
    if (!match) fail("runtime-mapping-overlay-path", patch.runtimePath);
    const skill = skills[Number(match[1])];
    const field = match[2] ?? match[4];
    if (!skill) fail("runtime-mapping-overlay-skill", patch.runtimePath);
    const target = match[3] == null ? skill : skill.effect_entries?.[Number(match[3])];
    if (!target) fail("runtime-mapping-overlay-target", patch.runtimePath);
    if (patch.expectedState === "absent") {
      if (Object.hasOwn(target, field)) fail("runtime-mapping-overlay-expected-absent", patch.runtimePath);
    } else if (patch.expectedState === "exact-value") {
      if (target[field] !== patch.expectedRuntimeValue) {
        fail("runtime-mapping-overlay-base-value", patch.runtimePath);
      }
    } else {
      fail("runtime-mapping-overlay-expected-state", patch.runtimePath);
    }
    target[field] = patch.value;
  }

  const skillElixirCatalog = {
    ...runtimeCatalog.datasets.skill_elixir_catalog,
    skills,
  };
  return {
    ...runtimeCatalog,
    datasets: {
      ...runtimeCatalog.datasets,
      skill_elixir_catalog: skillElixirCatalog,
    },
    categories: runtimeCatalog.categories ? {
      ...runtimeCatalog.categories,
      skills: {
        ...runtimeCatalog.categories.skills,
        skill_elixir_catalog: skillElixirCatalog,
      },
    } : runtimeCatalog.categories,
  };
}
