function exactKoreanPayload(record) {
  const payload = record?.locales?.ko;
  return payload && typeof payload.text === "string" && payload.text.trim() ? payload : null;
}

export function applyHeroMemoryLocaleRefOverlay(localeDataset, overlay) {
  if (overlay?.schemaVersion !== 1 || overlay?.baseEvidence?.targetSeason !== 13) {
    throw new Error("Hero-memory locale ref overlay requires verified SS13 evidence");
  }
  const entries = Object.entries(overlay.refOverrides ?? {});
  const records = localeDataset?.records ?? {};
  const refs = localeDataset?.refs ?? {};
  const baseEvidence = overlay.baseEvidence;
  if (
    entries.length !== overlay.counts?.refOverrides
    || entries.length !== overlay.counts?.ambiguousLiteralCandidatesResolved
  ) throw new Error("Hero-memory locale ref overlay count mismatch");
  if (
    localeDataset?.metadata?.targetSeason !== baseEvidence.targetSeason
    || localeDataset?.metadata?.collectedAt !== baseEvidence.collectedAt
    || (localeDataset?.metadata?.counts?.records ?? Object.keys(records).length) !== baseEvidence.records
    || (localeDataset?.metadata?.counts?.refs ?? Object.keys(refs).length) !== baseEvidence.refs
  ) throw new Error("Hero-memory locale ref overlay base evidence changed");

  const nextRefs = { ...refs };
  for (const [runtimePath, { anchorRef, sourceRef }] of entries) {
    if (refs[runtimePath] !== anchorRef) {
      throw new Error(`Hero-memory locale ref overlay base anchor changed: ${runtimePath}`);
    }
    const anchor = records[anchorRef];
    const sourceRecord = records[sourceRef];
    const candidateRefs = [...new Set(anchor?.candidateRefs ?? [])];
    const literalRefs = [...new Set(anchor?.tlidbEvidence?.literalTextMatchRefs ?? [])];
    if (
      anchor?.kind !== "runtime-source-anchor"
      || candidateRefs.length !== 1
      || candidateRefs[0] !== sourceRef
      || literalRefs.length < 1
      || !literalRefs.includes(sourceRef)
      || sourceRecord?.kind !== "memory-modifier"
      || sourceRecord.locales?.cn?.source !== anchor.tlidbEvidence?.ownerSource
      || !exactKoreanPayload(sourceRecord)
    ) throw new Error(`Hero-memory locale ref overlay evidence changed: ${runtimePath}`);
    nextRefs[runtimePath] = sourceRef;
  }

  return {
    ...localeDataset,
    refs: nextRefs,
    metadata: {
      ...localeDataset.metadata,
      heroMemoryLocaleRefOverlay: {
        schemaVersion: 1,
        applied: true,
        refOverrides: entries.length,
        authority: "current-tlidb-ss13-runtime-ref-audit",
      },
    },
  };
}
