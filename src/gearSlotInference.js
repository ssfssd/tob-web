import {
  GEAR_SLOT_KEYS,
  getGearFilterForSlot,
  getGearItemsForFilter,
} from "./catalog.js";

export function inferGearSlotIndex(itemId) {
  return getCompatibleGearSlotIndices(itemId)[0] ?? 0;
}

export function getCompatibleGearSlotIndices(itemId) {
  const indices = [];
  for (let index = 0; index < GEAR_SLOT_KEYS.length; index += 1) {
    const filter = getGearFilterForSlot(GEAR_SLOT_KEYS[index]);
    const matchesSlot = getGearItemsForFilter(filter).some((item) => item.id === itemId);

    if (matchesSlot) indices.push(index);
  }

  return indices;
}

export function inferUniqueGearSlotIndex(itemId) {
  const indices = getCompatibleGearSlotIndices(itemId);
  return indices.length === 1 ? indices[0] : -1;
}
