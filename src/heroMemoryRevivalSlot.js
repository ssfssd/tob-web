import {
  diagnoseActiveHeroMemoryInstance,
  normalizeActiveHeroMemoryInstance,
} from "./activeHeroMemoryModel.js";
import {
  createHeroMemoryInstance,
  getHeroMemoryEnhancementProfile,
} from "./heroMemoryModel.js";

export const HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID = "revival_base_trait";

const QUALITY_RANK = Object.freeze({
  magic: 1,
  rare: 2,
  excellent: 3,
  supreme: 4,
});

const DYNAMIC_SLOT_GROUPS = Object.freeze({
  "memory-revival-revival-5efac9f230": Object.freeze({
    targetCatalogSlotId: "memory_3",
    tiers: Object.freeze({
      "memory-revival-revival-5efac9f230-tier-1": "excellent",
      "memory-revival-revival-5efac9f230-ss13-500101701": "rare",
    }),
  }),
  "memory-revival-revival-4c19df79ff": Object.freeze({
    targetCatalogSlotId: "memory_2",
    tiers: Object.freeze({
      "memory-revival-revival-4c19df79ff-tier-1": "excellent",
      "memory-revival-revival-4c19df79ff-ss13-500101801": "rare",
    }),
  }),
  "memory-revival-revival-b5ef9050b1": Object.freeze({
    targetCatalogSlotId: "memory_1",
    tiers: Object.freeze({
      "memory-revival-revival-b5ef9050b1-tier-1": "excellent",
      "memory-revival-revival-b5ef9050b1-ss13-500101601": "rare",
    }),
  }),
});

const FIXED_SLOT_GROUPS = Object.freeze({
  "memory-revival-moon-phase-73c130d355": Object.freeze({
    targetCatalogSlotId: "memory_3",
    tierId: "memory-revival-moon-phase-73c130d355-tier-0",
    maxQuality: "supreme",
    valueModifierPercent: -60,
  }),
  "memory-revival-moon-phase-408a7d79cc": Object.freeze({
    targetCatalogSlotId: "memory_2",
    tierId: "memory-revival-moon-phase-408a7d79cc-tier-0",
    maxQuality: "supreme",
    valueModifierPercent: -60,
  }),
  "memory-revival-moon-phase-8d65e8ea54": Object.freeze({
    targetCatalogSlotId: "memory_1",
    tierId: "memory-revival-moon-phase-8d65e8ea54-tier-0",
    maxQuality: "supreme",
    valueModifierPercent: -60,
  }),
});

export const HERO_MEMORY_REVIVAL_SLOT_GROUP_IDS = Object.freeze([
  ...Object.keys(DYNAMIC_SLOT_GROUPS),
  ...Object.keys(FIXED_SLOT_GROUPS),
]);

function allRevivalGroups(dataset) {
  return Object.values(dataset?.revivalCatalog?.sections ?? {}).flatMap((groups) => (
    Array.isArray(groups) ? groups : []
  ));
}

function targetMemoryType(dataset, slotId) {
  return dataset?.memoryTypes?.find((memoryType) => (
    memoryType.slotId === slotId || memoryType.runtimeSlotId === slotId
  )) ?? null;
}

function validRollValue(value, roll) {
  const numeric = Number(value);
  const minimum = Number(roll?.min);
  const maximum = Number(roll?.max);
  const step = Number(roll?.step ?? 1);
  if (!Number.isFinite(numeric)
    || !Number.isFinite(minimum)
    || !Number.isFinite(maximum)
    || !Number.isFinite(step)
    || step <= 0
    || numeric < minimum
    || numeric > maximum) return false;
  return Math.abs(((numeric - minimum) / step) - Math.round((numeric - minimum) / step)) < 1e-8;
}

export function getHeroMemoryRevivalSlotEffect(memory, dataset) {
  if (!memory?.revivalAffixId) return null;
  const diagnosis = diagnoseActiveHeroMemoryInstance(memory, dataset);
  if (!diagnosis.valid || !diagnosis.normalized) return null;
  const normalized = diagnosis.normalized;
  const groupId = normalized.revivalAffixId;
  const config = normalized.affixRolls?.[groupId];
  const group = allRevivalGroups(dataset).find(({ id }) => id === groupId);
  const tier = group?.tierOptions?.find(({ tierId }) => tierId === config?.tierId);
  if (!group || !tier) return null;

  const fixed = FIXED_SLOT_GROUPS[groupId];
  if (fixed) {
    if (tier.tierId !== fixed.tierId) return null;
    return {
      slotId: HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID,
      sourceGroupId: groupId,
      sourceTierId: tier.tierId,
      targetCatalogSlotId: fixed.targetCatalogSlotId,
      maxQuality: fixed.maxQuality,
      valueModifierPercent: fixed.valueModifierPercent,
    };
  }

  const dynamic = DYNAMIC_SLOT_GROUPS[groupId];
  const maxQuality = dynamic?.tiers?.[tier.tierId];
  const valueRoll = tier?.rollDefs?.find(({ key }) => key === "roll_3");
  const valueModifierPercent = config?.rolls?.roll_3;
  if (!dynamic || !maxQuality || !valueRoll || !validRollValue(valueModifierPercent, valueRoll)) {
    return null;
  }
  return {
    slotId: HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID,
    sourceGroupId: groupId,
    sourceTierId: tier.tierId,
    targetCatalogSlotId: dynamic.targetCatalogSlotId,
    maxQuality,
    valueModifierPercent: Number(valueModifierPercent),
  };
}

export function createHeroMemoryRevivalSlotInstance(
  effect,
  dataset,
  instanceId = `memory-${HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID}-${Date.now()}`,
) {
  const memoryType = targetMemoryType(dataset, effect?.targetCatalogSlotId);
  if (!memoryType || effect?.slotId !== HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID) return null;
  return {
    ...createHeroMemoryInstance(memoryType.slotId, dataset, instanceId),
    valueModifierPercent: effect.valueModifierPercent,
  };
}

function slotIssue(code, path) {
  return { code, path };
}

export function diagnoseHeroMemoryRevivalSlotInstance(memory, effect, dataset) {
  const issues = [];
  if (!effect || effect.slotId !== HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID) {
    issues.push(slotIssue("revival-slot-effect-missing", "effect"));
    return { valid: false, normalized: null, issues };
  }
  const diagnosis = diagnoseActiveHeroMemoryInstance(memory, dataset);
  issues.push(...diagnosis.issues);
  const normalized = diagnosis.normalized;
  const memoryType = targetMemoryType(dataset, effect.targetCatalogSlotId);
  const normalizedType = targetMemoryType(dataset, normalized?.memoryTypeId);
  if (!memoryType || !normalizedType || normalizedType.slotId !== memoryType.slotId) {
    issues.push(slotIssue("revival-slot-memory-type-invalid", "memoryTypeId"));
  }
  if (memory?.profitLoss !== false) {
    issues.push(slotIssue("revival-slot-profit-loss-invalid", "profitLoss"));
  }
  if (memory?.revivalAffixId != null) {
    issues.push(slotIssue("revival-slot-affix-invalid", "revivalAffixId"));
  }
  if (typeof memory?.valueModifierPercent !== "number"
    || !Number.isFinite(memory.valueModifierPercent)
    || memory.valueModifierPercent !== Number(effect.valueModifierPercent)) {
    issues.push(slotIssue("revival-slot-value-modifier-invalid", "valueModifierPercent"));
  }
  const profile = getHeroMemoryEnhancementProfile(memory?.enhancement);
  if ((QUALITY_RANK[profile.qualityId] ?? Number.POSITIVE_INFINITY)
    > (QUALITY_RANK[effect.maxQuality] ?? Number.NEGATIVE_INFINITY)) {
    issues.push(slotIssue("revival-slot-quality-invalid", "enhancement"));
  }
  if (Number(memory?.traitLevelBonus) !== profile.traitLevelBonus) {
    issues.push(slotIssue("revival-slot-trait-level-invalid", "traitLevelBonus"));
  }
  if ((memory?.fixedAffixIds?.length ?? 0) !== profile.affixLimit) {
    issues.push(slotIssue("revival-slot-fixed-count-invalid", "fixedAffixIds"));
  }
  return {
    valid: issues.length === 0,
    normalized: normalized
      ? { ...normalized, valueModifierPercent: Number(effect.valueModifierPercent) }
      : null,
    issues,
  };
}

export function reconcileHeroMemoryRevivalSlot(memories, revivalMemory, dataset) {
  if (!revivalMemory) return null;
  const effects = (Array.isArray(memories) ? memories : [])
    .map((memory) => getHeroMemoryRevivalSlotEffect(memory, dataset))
    .filter(Boolean);
  if (effects.length !== 1) return null;
  const diagnosis = diagnoseHeroMemoryRevivalSlotInstance(revivalMemory, effects[0], dataset);
  return diagnosis.valid ? diagnosis.normalized : null;
}

export function getHeroMemoryRevivalSlotTargetType(effect, dataset) {
  return targetMemoryType(dataset, effect?.targetCatalogSlotId);
}
