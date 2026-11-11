import {
  createDefaultSkillState,
  getExternalMainSkillOverride,
  normalizeSkillState,
  updateMainSkill,
  updateMainSkillLevel,
  updateSkillSupport,
  updateSkillSupportLevel,
} from "./skillRuntimeModel.js";
import { getAllHeroMemoryRevivalAffixes } from "./heroMemoryModel.js";
import {
  normalizeTalentBoardState,
  selectTalentTree,
} from "./talentBoardModel.js";

function normalizeScreenshotText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]+/gu, "");
}

function screenshotNameMatches(name, compactTexts, compactLines) {
  const normalized = normalizeScreenshotText(name);
  if (!normalized) return false;
  const containsEastAsian = /[가-힣\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(normalized);
  const usualMinimum = containsEastAsian ? 3 : 5;
  if (normalized.length >= usualMinimum) return compactTexts.some((text) => text.includes(normalized));

  const shortMinimum = containsEastAsian ? 2 : 3;
  return normalized.length >= shortMinimum && compactLines.includes(normalized);
}

export function matchScreenshotCatalogItems(ocrText, candidates, { limit = 60 } = {}) {
  const texts = (Array.isArray(ocrText) ? ocrText : [ocrText]).map((text) => String(text ?? ""));
  const compactTexts = texts.map(normalizeScreenshotText).filter(Boolean);
  if (!compactTexts.length || !Array.isArray(candidates)) return [];
  const compactLines = texts.flatMap((text) => {
    const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    return lines.filter((_, index) => (
      // A sparse OCR pass can split "저항 >=5%" across lines. It is a
      // numeric option condition, not the two-character talent named 저항.
      !/^[<>=≤≥＝]+\s*[+\-−]?\d+(?:[.,]\d+)?\s*[%％]?$/u.test(lines[index + 1] ?? "")
    )).map(normalizeScreenshotText).filter(Boolean);
  });
  const normalizedLimit = Math.max(0, Math.trunc(Number(limit) || 0));
  if (!normalizedLimit) return [];

  const aliases = candidates.flatMap((candidate, candidateIndex) => (
    [...new Set((candidate?.names ?? []).filter((name) => typeof name === "string" && name.trim()))]
      .map((name) => ({
        itemId: candidate?.itemId,
        name,
        length: normalizeScreenshotText(name).length,
        candidateIndex,
      }))
  )).filter(({ itemId, length }) => typeof itemId === "string" && itemId && length > 0);
  aliases.sort((left, right) => right.length - left.length || left.candidateIndex - right.candidateIndex);

  const seen = new Set();
  const matches = [];
  for (const alias of aliases) {
    if (seen.has(alias.itemId)) continue;
    if (!screenshotNameMatches(alias.name, compactTexts, compactLines)) continue;
    seen.add(alias.itemId);
    matches.push(alias.itemId);
    if (matches.length >= normalizedLimit) break;
  }
  return matches;
}

function screenshotTalentTreeSlug(model, item) {
  return item?.talentTree?.slug
    ?? item?.talentPosition?.treeSlug
    ?? model?.coreTalentByFlatItemId?.get(item?.id)?.treeSlug
    ?? model?.nodeByFlatItemId?.get(item?.id)?.treeSlug
    ?? "";
}

function sameTalentBoard(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function getScreenshotTalentTargets(model, build, item) {
  const treeSlug = screenshotTalentTreeSlug(model, item);
  const tree = model?.treeBySlug?.get(treeSlug);
  if (!tree || tree.isSupported === false) return [];
  const state = normalizeTalentBoardState(model, build?.talents);

  return state.boards.flatMap((board, boardIndex) => {
    if (board.treeSlug && board.treeSlug !== treeSlug) return [];
    const result = selectTalentTree(model, state, boardIndex, treeSlug);
    if (!["selected", "unchanged"].includes(result.status)) return [];
    const changedOtherBoard = state.boards.some((candidate, index) => (
      index !== boardIndex && !sameTalentBoard(candidate, result.state.boards[index])
    ));
    return changedOtherBoard ? [] : [{ boardIndex, treeSlug }];
  });
}

export function applyScreenshotTalentMatch(build, model, item, boardIndex) {
  const target = getScreenshotTalentTargets(model, build, item)
    .find((candidate) => candidate.boardIndex === boardIndex);
  if (!target) return { status: "target-slot-unavailable", build };
  const result = selectTalentTree(model, build?.talents, boardIndex, target.treeSlug);
  if (!["selected", "unchanged"].includes(result.status)) {
    return { status: "target-slot-unavailable", build };
  }
  return {
    status: "applied",
    boardIndex,
    treeSlug: target.treeSlug,
    build: { ...build, talents: result.state },
  };
}

export function getScreenshotHeroMemoryTargets(dataset, itemId) {
  if (typeof itemId !== "string" || !itemId) return [];
  const memoryTypes = Array.isArray(dataset?.memoryTypes) ? dataset.memoryTypes : [];
  const memoryTypeIndex = memoryTypes.findIndex(({ flatCatalogId }) => flatCatalogId === itemId);
  if (memoryTypeIndex >= 0) {
    return [{ slotIndex: memoryTypeIndex, kind: "memory-type", affixId: null }];
  }

  const affix = getAllHeroMemoryRevivalAffixes(dataset)
    .find(({ flatCatalogId }) => flatCatalogId === itemId);
  return affix
    ? memoryTypes.map((_, slotIndex) => ({
        slotIndex,
        kind: "revival-affix",
        affixId: affix.id,
      }))
    : [];
}

function trimTrailingEmptySlots(slots) {
  const result = [...slots];
  while (result.length && result.at(-1) == null) result.pop();
  return result;
}

function nextGearInstanceId(build, itemId) {
  const used = new Set([
    ...(build.gear?.slots ?? []).map((slot) => slot?.instanceId),
    ...(build.gear?.inventory ?? []).map((slot) => slot?.instanceId),
  ].filter(Boolean));
  const safeItemId = String(itemId)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
  const prefix = `screenshot-gear-${safeItemId}`;
  let suffix = 1;
  while (used.has(`${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
}

export function applyScreenshotGearMatch(build, itemId, slotIndex, slotCount = 10) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slotCount) {
    return { status: "target-slot-unavailable", build };
  }

  const currentSelections = build.selections?.gear ?? [];
  const nextSelections = Array.from(
    { length: slotCount },
    (_, index) => currentSelections[index] ?? null,
  );
  nextSelections[slotIndex] = itemId;

  const currentSlots = build.gear?.slots ?? [];
  const nextSlots = Array.from(
    { length: slotCount },
    (_, index) => currentSlots[index] ?? null,
  );
  const previous = nextSlots[slotIndex];
  nextSlots[slotIndex] = previous?.itemId === itemId
    ? previous
    : { instanceId: nextGearInstanceId(build, itemId), itemId };

  return {
    status: "applied",
    build: {
      ...build,
      selections: {
        ...build.selections,
        gear: trimTrailingEmptySlots(nextSelections),
      },
      gear: {
        ...build.gear,
        slots: nextSlots,
      },
    },
  };
}

function screenshotSkillRecord(model, itemId, kind) {
  if (!model || !["active", "passive"].includes(kind)) return null;
  return model[kind]?.find((record) => (
    record?.id === itemId || record?.flatItemId === itemId
  )) ?? null;
}

function skillCompatibilitySelections(skills) {
  const slots = [...skills.active, ...skills.passive];
  return {
    skills: trimTrailingEmptySlots(slots.map((slot) => slot.skillId)),
    supports: trimTrailingEmptySlots(
      slots.flatMap((slot) => slot.supports.map((support) => support?.supportId ?? null)),
    ),
    skillLevels: trimTrailingEmptySlots(slots.map((slot) => (slot.skillId ? slot.level : null))),
  };
}

export function applyScreenshotSkillMatch(build, model, itemId, kind, rowIndex, level = null) {
  const record = screenshotSkillRecord(model, itemId, kind);
  if (!record) return { status: "skill-runtime-unavailable", build };
  const current = normalizeSkillState(
    model,
    build.skills ?? createDefaultSkillState(),
    { build },
  );
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= current[kind].length) {
    return { status: "target-slot-unavailable", build };
  }
  if (getExternalMainSkillOverride(model, build, kind, rowIndex)) {
    return { status: "target-slot-unavailable", build };
  }

  if (level !== null && (!Number.isInteger(level) || level < 1 || level > 21)) return { status: 'invalid-level', build };
  let skills = updateMainSkill(model, current, kind, rowIndex, record.id, { build });
  if (level !== null) skills = updateMainSkillLevel(model, skills, kind, rowIndex, level, { build });
  const compatibility = skillCompatibilitySelections(skills);
  return {
    status: "applied",
    build: {
      ...build,
      skills,
      skillLevels: compatibility.skillLevels,
      selections: {
        ...build.selections,
        skills: compatibility.skills,
        supports: compatibility.supports,
      },
    },
  };
}

export function applyScreenshotSupportMatch(
  build,
  model,
  itemId,
  kind,
  rowIndex,
  supportIndex,
  level = null,
) {
  const support = model?.allSupports?.find((record) => (
    record?.id === itemId || record?.flatItemId === itemId
  ));
  if (!support || !["active", "passive"].includes(kind)) {
    return { status: "support-runtime-unavailable", build };
  }
  if (level !== null && (!Number.isInteger(level) || level < 1 || level > (support.maxLevel ?? 21))) return { status: 'invalid-level', build };
  const current = normalizeSkillState(
    model,
    build.skills ?? createDefaultSkillState(),
    { build },
  );
  if (
    !Number.isInteger(rowIndex)
    || rowIndex < 0
    || rowIndex >= current[kind].length
    || !Number.isInteger(supportIndex)
  ) {
    return { status: "target-slot-unavailable", build };
  }
  const result = updateSkillSupport(
    model,
    current,
    kind,
    rowIndex,
    supportIndex,
    support.id,
    undefined,
    { build },
  );
  if (result.status !== "updated") return { status: "target-slot-unavailable", build };
  if (level !== null) result.state = updateSkillSupportLevel(model, result.state, kind, rowIndex, supportIndex, level, { build });

  const compatibility = skillCompatibilitySelections(result.state);
  return {
    status: "applied",
    build: {
      ...build,
      skills: result.state,
      skillLevels: compatibility.skillLevels,
      selections: {
        ...build.selections,
        skills: compatibility.skills,
        supports: compatibility.supports,
      },
    },
  };
}
