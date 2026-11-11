import {
  HERO_MEMORY_ENHANCEMENT_PROFILES,
  diagnoseHeroMemoryInstance,
  getHeroMemoryPreview,
  normalizeHeroMemoryInstance,
  updateHeroMemoryProperties,
} from "./heroMemoryModel.js";
import { normalizeHeroMemoryTypeId } from "./heroMemoryIdentity.js";

function findMemoryType(dataset, memoryTypeId) {
  const canonicalId = normalizeHeroMemoryTypeId(memoryTypeId);
  return dataset?.memoryTypes?.find((memoryType) => (
    memoryType.slotId === memoryTypeId
    || normalizeHeroMemoryTypeId(memoryType.slotId) === canonicalId
    || memoryType.flatCatalogId === canonicalId
    || memoryType.legacySlotIds?.includes(memoryTypeId)
  ));
}

function runtimeInput(input, dataset) {
  const memoryType = findMemoryType(dataset, input?.memoryTypeId);
  if (!memoryType || !input || typeof input !== "object") return input;
  return input.memoryTypeId === memoryType.slotId
    ? input
    : { ...input, memoryTypeId: memoryType.slotId };
}

function baseSupportsEnhancement(memoryType, baseAttributeId, enhancement) {
  const groups = baseAttributeId
    ? (memoryType?.baseAttributeGroups ?? []).filter(({ id }) => id === baseAttributeId)
    : memoryType?.baseAttributeGroups ?? [];
  return groups.some((group) => (
    (group.enhancementValues ?? []).some(({ enhancementLevel }) => enhancementLevel === enhancement)
  ));
}

export function getSelectableHeroMemoryEnhancementProfiles(memoryType, baseAttributeId = null) {
  return HERO_MEMORY_ENHANCEMENT_PROFILES.filter(({ enhancement }) => (
    baseSupportsEnhancement(memoryType, baseAttributeId, enhancement)
  ));
}

export function normalizeActiveHeroMemoryInstance(input, dataset) {
  return normalizeHeroMemoryInstance(runtimeInput(input, dataset), dataset);
}

export function diagnoseActiveHeroMemoryInstance(input, dataset) {
  const prepared = runtimeInput(input, dataset);
  const diagnosis = diagnoseHeroMemoryInstance(prepared, dataset);
  const memoryType = findMemoryType(dataset, prepared?.memoryTypeId);
  const base = memoryType?.baseAttributeGroups?.find(({ id }) => id === prepared?.baseAttributeId);
  if (
    base
    && !baseSupportsEnhancement(memoryType, base.id, Number(prepared?.enhancement))
    && !diagnosis.issues.some(({ code }) => code === "base-enhancement-structure-invalid")
  ) {
    diagnosis.issues.push({
      code: "base-enhancement-structure-invalid",
      path: "enhancement",
    });
  }
  return { ...diagnosis, valid: diagnosis.issues.length === 0 };
}

export function getActiveHeroMemoryPreview(input, dataset) {
  const prepared = runtimeInput(input, dataset);
  const preview = getHeroMemoryPreview(prepared, dataset);
  const diagnosis = diagnoseActiveHeroMemoryInstance(prepared, dataset);
  return { ...preview, valid: diagnosis.valid, issues: diagnosis.issues };
}

export function updateActiveHeroMemoryProperties(input, updates, dataset) {
  const prepared = runtimeInput(input, dataset);
  const current = normalizeHeroMemoryInstance(prepared, dataset);
  if (!current) return null;
  const candidate = {
    ...current,
    ...(updates && Object.hasOwn(updates, "baseAttributeId")
      ? { baseAttributeId: updates.baseAttributeId }
      : {}),
    ...(updates && Object.hasOwn(updates, "enhancement")
      ? { enhancement: Math.round(Number(updates.enhancement)) }
      : {}),
  };
  const memoryType = findMemoryType(dataset, current.memoryTypeId);
  if (
    updates
    && (Object.hasOwn(updates, "baseAttributeId") || Object.hasOwn(updates, "enhancement"))
    && !baseSupportsEnhancement(
      memoryType,
      candidate.baseAttributeId,
      candidate.enhancement,
    )
  ) return current;
  return updateHeroMemoryProperties(prepared, updates, dataset);
}

export function getCanonicalHeroMemoryTypeId(input, dataset) {
  const memoryType = findMemoryType(dataset, input?.memoryTypeId ?? input);
  return memoryType?.flatCatalogId ?? normalizeHeroMemoryTypeId(input?.memoryTypeId ?? input);
}
