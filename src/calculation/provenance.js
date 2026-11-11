import { patchSnapshotsMatch } from "./patchSnapshot.js";

const EVIDENCE_VALUES = new Set(["measured", "structured", "inferred", "unsupported"]);

export function createProvenanceSource(input = {}) {
  const id = typeof input.id === "string" && input.id ? input.id : "unknown";
  const applied = input.applied !== false;
  const source = {
    id,
    label: typeof input.label === "string" && input.label ? input.label : id,
    categoryId: typeof input.categoryId === "string" ? input.categoryId : "",
    evidence: EVIDENCE_VALUES.has(input.evidence) ? input.evidence : "unsupported",
    applied,
  };

  if (!applied && typeof input.inactiveReason === "string" && input.inactiveReason.trim()) {
    source.inactiveReason = input.inactiveReason.trim();
  }
  if (typeof input.sourceUrl === "string" && input.sourceUrl.trim()) {
    source.sourceUrl = input.sourceUrl.trim();
  }
  if (typeof input.sourceItemId === "string" && input.sourceItemId.trim()) {
    source.sourceItemId = input.sourceItemId.trim();
  }
  if (typeof input.sourceRecordKey === "string" && input.sourceRecordKey.trim()) {
    source.sourceRecordKey = input.sourceRecordKey.trim();
  }
  if (input.receipt && typeof input.receipt === "object" && !Array.isArray(input.receipt)) {
    source.receipt = { ...input.receipt };
  }

  return source;
}

function safeSnapshot(input) {
  return input && typeof input === "object" && !Array.isArray(input) ? input : {};
}

export function summarizeCalculationProvenance(
  patchSnapshot,
  sourceInputs = [],
  buildPatchSnapshot = patchSnapshot,
) {
  const safePatchSnapshot = safeSnapshot(patchSnapshot);
  const safeBuildPatchSnapshot = safeSnapshot(buildPatchSnapshot);
  const sources = sourceInputs.map(createProvenanceSource);
  const counts = {
    measured: 0,
    structured: 0,
    inferred: 0,
    unsupported: 0,
  };

  for (const source of sources) counts[source.evidence] += 1;

  const inactiveSources = sources.filter((source) => !source.applied).length;
  const patchMismatch = !patchSnapshotsMatch(safePatchSnapshot, safeBuildPatchSnapshot);
  const confidence =
    patchMismatch || counts.unsupported > 0
      ? "incomplete"
      : counts.inferred > 0 || inactiveSources > 0
        ? "mixed"
        : "verified";

  return {
    patchSnapshot: { ...safePatchSnapshot },
    buildPatchSnapshot: { ...safeBuildPatchSnapshot },
    sources,
    summary: {
      confidence,
      counts,
      inactiveSources,
      patchMismatch,
      totalSources: sources.length,
    },
  };
}
