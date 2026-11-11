import { CATALOG_METADATA } from "../catalog.js";

// Pinned legacy editor model. The SS14 entry uses seasonBuild/seasonWorkspace;
// changing these constants would relabel old formulas and saved snapshots.
export const CALCULATION_MODEL_VERSION = "tlidb-ss13-v1";
export const LIVE_BASELINE_SEASON = "SS13";
export const PREVIEW_OVERLAY_SEASON = "SS13";
export const PREVIEW_OVERLAY_STATE = "official-db-active";

export const PATCH_SNAPSHOT_FIELDS = Object.freeze([
  "season",
  "baselineSeason",
  "overlaySeason",
  "overlayState",
  "overlayApplicationComplete",
  "structuralReferenceVersion",
  "dataGeneratedAt",
  "calculationModel",
]);

export const CURRENT_PATCH_SNAPSHOT = Object.freeze({
  season: LIVE_BASELINE_SEASON,
  baselineSeason: LIVE_BASELINE_SEASON,
  overlaySeason: PREVIEW_OVERLAY_SEASON,
  overlayState: PREVIEW_OVERLAY_STATE,
  overlayApplicationComplete: false,
  structuralReferenceVersion: String(CATALOG_METADATA.version ?? "unknown"),
  dataGeneratedAt: String(CATALOG_METADATA.generatedAt ?? ""),
  calculationModel: CALCULATION_MODEL_VERSION,
});

export function normalizePatchSnapshot(input) {
  if (!input || typeof input !== "object") return { ...CURRENT_PATCH_SNAPSHOT };

  return {
    season: typeof input.season === "string" && input.season ? input.season : CURRENT_PATCH_SNAPSHOT.season,
    baselineSeason:
      typeof input.baselineSeason === "string" && input.baselineSeason
        ? input.baselineSeason
        : CURRENT_PATCH_SNAPSHOT.baselineSeason,
    overlaySeason:
      typeof input.overlaySeason === "string" && input.overlaySeason
        ? input.overlaySeason
        : CURRENT_PATCH_SNAPSHOT.overlaySeason,
    overlayState:
      typeof input.overlayState === "string" && input.overlayState
        ? input.overlayState
        : CURRENT_PATCH_SNAPSHOT.overlayState,
    overlayApplicationComplete:
      typeof input.overlayApplicationComplete === "boolean"
        ? input.overlayApplicationComplete
        : CURRENT_PATCH_SNAPSHOT.overlayApplicationComplete,
    structuralReferenceVersion:
      typeof input.structuralReferenceVersion === "string" && input.structuralReferenceVersion
        ? input.structuralReferenceVersion
        : CURRENT_PATCH_SNAPSHOT.structuralReferenceVersion,
    dataGeneratedAt:
      typeof input.dataGeneratedAt === "string" ? input.dataGeneratedAt : CURRENT_PATCH_SNAPSHOT.dataGeneratedAt,
    calculationModel:
      typeof input.calculationModel === "string" && input.calculationModel
        ? input.calculationModel
        : CURRENT_PATCH_SNAPSHOT.calculationModel,
  };
}

export function patchSnapshotsMatch(left, right) {
  if (
    !left
    || !right
    || typeof left !== "object"
    || typeof right !== "object"
    || Array.isArray(left)
    || Array.isArray(right)
  ) return false;
  return PATCH_SNAPSHOT_FIELDS.every((field) => left[field] === right[field]);
}

export function isCurrentPatchSnapshot(input) {
  const normalized = normalizePatchSnapshot(input);
  return patchSnapshotsMatch(normalized, CURRENT_PATCH_SNAPSHOT);
}
