import {
  BUILD_DOCUMENT_SCHEMA_VERSION,
  createBuildDocument,
  normalizeBuildDocument as normalizeCoreBuildDocument,
} from "./buildDocumentCore.js";

export { BUILD_DOCUMENT_SCHEMA_VERSION, createBuildDocument };

const GEAR_COMPATIBILITY_PROJECTIONS = Object.freeze([
  Object.freeze(["gearAffixes", "affixText"]),
  Object.freeze(["gearRolls", "rolls"]),
  Object.freeze(["gearCrafts", "crafts"]),
  Object.freeze(["gearCorruptions", "corrupted"]),
  Object.freeze(["gearLegendaryDrafts", "legendaryDraft"]),
]);

function sameSerializableValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameSerializableValue(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  const keys = [...new Set([...leftKeys, ...rightKeys])];
  return keys.every((key) => {
    if (!Object.hasOwn(left, key) || !Object.hasOwn(right, key)) {
      const present = Object.hasOwn(left, key) ? left[key] : right[key];
      return present && typeof present === "object" && Object.keys(present).length === 0;
    }
    return sameSerializableValue(left[key], right[key]);
  });
}

function removeStaleGearCompatibilityProjection(input) {
  const priorSelection = input?.selectionProjection?.gear;
  const nextSelection = input?.selections?.gear;
  const sourceSlots = input?.gear?.slots;
  if (
    !Array.isArray(priorSelection)
    || !Array.isArray(nextSelection)
    || !Array.isArray(sourceSlots)
    || sameSerializableValue(priorSelection, nextSelection)
  ) return input;

  let prepared = input;
  for (const [mapField, slotField] of GEAR_COMPATIBILITY_PROJECTIONS) {
    const incoming = input?.[mapField];
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) continue;

    const priorProjection = {};
    for (const slot of sourceSlots) {
      if (slot?.itemId && Object.hasOwn(slot, slotField)) {
        priorProjection[slot.itemId] = slot[slotField];
      }
    }
    const staleKeys = Object.keys(priorProjection).filter((itemId) => (
      // Unequipped items retain their editor settings for a later selection.
      // Equipped instances still discard the shared projection to avoid copying
      // one duplicate item's settings over another slot's independent values.
      nextSelection.includes(itemId)
      && Object.hasOwn(incoming, itemId)
      && sameSerializableValue(incoming[itemId], priorProjection[itemId])
    ));
    if (!staleKeys.length) continue;

    const nextMap = { ...incoming };
    for (const itemId of staleKeys) delete nextMap[itemId];
    if (prepared === input) prepared = { ...input };
    prepared[mapField] = nextMap;
  }
  return prepared;
}

export function normalizeBuildDocument(input) {
  return normalizeCoreBuildDocument(removeStaleGearCompatibilityProjection(input));
}

export function cloneBuildDocument(input) {
  return normalizeBuildDocument(input);
}

export function serializeBuildDocument(input) {
  return JSON.stringify(normalizeBuildDocument(input), null, 2);
}

export function deserializeBuildDocument(text) {
  return normalizeBuildDocument(JSON.parse(text));
}
