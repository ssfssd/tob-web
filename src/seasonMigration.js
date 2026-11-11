import { calculateSeasonBuild, SS14_BUILD_MODEL } from "./seasonBuild.js";

export const SEASON_RESEARCH_STORAGE_KEY = "tob.season-build-research.v1";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const serialize = (value) => JSON.stringify(value);

// Older snapshots remain input evidence only. Never relabel their values SS13.
export const isSeasonMigrationSource = (build) => object(build)
  && /^(?:SS13|SS12|S12(?:\.\d+){0,2})$/u.test(build.patchSnapshot?.season ?? "");

function targetFor(source, id, name) {
  return { ...structuredClone(source), id, name,
    patchSnapshot: { season: "SS14", version: "preview", calculationModel: SS14_BUILD_MODEL },
  };
}

export function prepareSeasonMigration(build, { now = new Date(), id = globalThis.crypto.randomUUID() } = {}) {
  if (!isSeasonMigrationSource(build)) throw new Error("SS13 또는 SS12 원본 빌드에서만 이전 검토 사본을 만들 수 있습니다.");
  const sourceBuild = structuredClone(build);
  const report = calculateSeasonBuild(sourceBuild);
  return { schemaVersion: 1, id, createdAt: now.toISOString(), sourceBuild,
    targetBuild: targetFor(sourceBuild, id, `${sourceBuild.name || "빌드"} · SS14 이전 검토`),
    sourcesAtCreation: report.sourceGeneratedAt, report, saved: false,
  };
}

function validCopy(copy) {
  return object(copy) && copy.schemaVersion === 1 && typeof copy.id === "string" && copy.id.length > 0
    && Number.isFinite(Date.parse(copy.createdAt)) && isSeasonMigrationSource(copy.sourceBuild)
    && object(copy.targetBuild) && typeof copy.targetBuild.name === "string" && object(copy.sourcesAtCreation)
    && serialize(copy.targetBuild) === serialize(targetFor(copy.sourceBuild, copy.id, copy.targetBuild.name));
}

// Never load these preview documents into the SS13 editor. The exact source and
// target inputs are retained; calculated reports are regenerated, not trusted.
export function loadSeasonResearchCopies(storage) {
  try {
    const raw = storage.getItem(SEASON_RESEARCH_STORAGE_KEY);
    if (raw === null) return { copies: [], error: "" };
    const value = JSON.parse(raw);
    if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.copies)
      || !value.copies.every(validCopy) || new Set(value.copies.map((copy) => copy.id)).size !== value.copies.length) throw new Error("invalid");
    return { copies: value.copies, error: "" };
  } catch {
    return { copies: [], error: "저장된 시즌 검토 사본을 읽을 수 없습니다. 기존 저장 내용은 변경하지 않았습니다." };
  }
}

export function saveSeasonResearchCopy(storage, draft, currentBuild) {
  if (!validCopy(draft)) throw new Error("유효한 시즌 이전 검토를 먼저 준비하세요.");
  if (serialize(draft.sourceBuild) !== serialize(currentBuild)) throw new Error("원본 입력이 바뀌었습니다. 시즌 이전 검토를 다시 준비하세요.");
  const loaded = loadSeasonResearchCopies(storage);
  if (loaded.error) throw new Error(loaded.error);
  if (loaded.copies.some((copy) => copy.id === draft.id)) throw new Error("이미 저장된 검토 사본입니다.");
  const { report, saved, ...copy } = structuredClone(draft);
  const copies = [...loaded.copies, copy];
  // A single write commits the whole copy. Quota errors must propagate to UI.
  storage.setItem(SEASON_RESEARCH_STORAGE_KEY, serialize({ schemaVersion: 1, copies }));
  return { copies, error: "" };
}

export function reopenSeasonResearchCopy(copy) {
  if (!validCopy(copy)) throw new Error("저장된 시즌 검토 사본 형식을 확인할 수 없습니다.");
  const report = calculateSeasonBuild(copy.sourceBuild);
  return { ...structuredClone(copy), report, saved: true,
    sourcesChanged: serialize(copy.sourcesAtCreation) !== serialize(report.sourceGeneratedAt) };
}
