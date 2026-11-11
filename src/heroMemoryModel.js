const MAX_ENHANCEMENT = 50;
const MAX_TRAIT_LEVEL_BONUS = 3;

export const HERO_MEMORY_ENHANCEMENT_PROFILES = Object.freeze([
  Object.freeze({ enhancement: 20, traitLevelBonus: 1, qualityId: "magic", affixLimit: 1 }),
  Object.freeze({ enhancement: 30, traitLevelBonus: 2, qualityId: "rare", affixLimit: 1 }),
  Object.freeze({ enhancement: 40, traitLevelBonus: 2, qualityId: "excellent", affixLimit: 2 }),
  Object.freeze({ enhancement: 50, traitLevelBonus: 3, qualityId: "supreme", affixLimit: 2 }),
]);

function clampNumber(value, minimum, maximum, fallback = minimum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

export function getHeroMemoryEnhancementProfile(value) {
  const enhancement = clampNumber(value, 1, MAX_ENHANCEMENT, 20);
  return HERO_MEMORY_ENHANCEMENT_PROFILES.find((profile) => enhancement <= profile.enhancement)
    ?? HERO_MEMORY_ENHANCEMENT_PROFILES.at(-1);
}

function normalizeRollValue(value, roll) {
  const rawMinimum = Number(roll?.min);
  const rawMaximum = Number(roll?.max);
  const minimumValue = Number.isFinite(rawMinimum) ? rawMinimum : 0;
  const maximumValue = Number.isFinite(rawMaximum) ? rawMaximum : minimumValue;
  const minimum = Math.min(minimumValue, maximumValue);
  const maximum = Math.max(minimumValue, maximumValue);
  const precision = Math.round(clampNumber(roll?.precision, 0, 12, 0));
  const fallbackStep = 1 / (10 ** precision);
  const rawStep = Number(roll?.step);
  const step = Number.isFinite(rawStep) && rawStep > 0 ? rawStep : fallbackStep;
  const clamped = clampNumber(value, minimum, maximum, maximum);
  const snapped = minimum + Math.round((clamped - minimum) / step) * step;
  const factor = 10 ** precision;
  const rounded = Math.round((snapped + Number.EPSILON) * factor) / factor;
  return Math.max(minimum, Math.min(maximum, rounded));
}

function uniqueValidIds(input, validIds, limit = Number.POSITIVE_INFINITY) {
  const seen = new Set();
  const result = [];
  for (const id of Array.isArray(input) ? input : []) {
    if (typeof id !== "string" || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= limit) break;
  }
  return result;
}

function findMemoryType(dataset, memoryTypeId) {
  return dataset?.memoryTypes?.find((memoryType) => memoryType.slotId === memoryTypeId);
}

function revivalSections(dataset) {
  return dataset?.revivalCatalog?.sections ?? {};
}

const REVIVAL_SECTION_DEFS = Object.freeze([
  Object.freeze({ field: "revivalAffixGroups", kind: "revival", expectedCount: 21 }),
  Object.freeze({ field: "specialRandomAffixGroups", kind: "specialRandom", expectedCount: 19 }),
  Object.freeze({ field: "moonPhaseAffixGroups", kind: "moonPhase", expectedCount: 45 }),
]);

export function getAllHeroMemoryRevivalAffixes(dataset) {
  const sections = revivalSections(dataset);
  return REVIVAL_SECTION_DEFS.flatMap(({ field, kind }) => (
    Array.isArray(sections[field])
      ? sections[field].map((affix) => ({ ...affix, revivalKind: kind }))
      : []
  ));
}

function revivalAffixes(dataset) {
  return getAllHeroMemoryRevivalAffixes(dataset);
}

function auditIssue(issues, code, path, detail = {}) {
  issues.push({ code, path, ...detail });
}

export function auditHeroMemoryCatalog(dataset) {
  const issues = [];
  const memoryTypes = Array.isArray(dataset?.memoryTypes) ? dataset.memoryTypes : [];
  const baseGroups = memoryTypes.flatMap((memoryType) => (
    Array.isArray(memoryType?.baseAttributeGroups) ? memoryType.baseAttributeGroups : []
  ));
  const enhancementValues = baseGroups.flatMap((group) => (
    Array.isArray(group?.enhancementValues) ? group.enhancementValues : []
  ));
  const sections = revivalSections(dataset);
  const sectionGroups = Object.fromEntries(REVIVAL_SECTION_DEFS.map(({ field }) => [
    field,
    Array.isArray(sections[field]) ? sections[field] : [],
  ]));
  const allRevivalGroups = REVIVAL_SECTION_DEFS.flatMap(({ field }) => sectionGroups[field]);
  const revivalTiers = allRevivalGroups.flatMap((group) => (
    Array.isArray(group?.tierOptions) ? group.tierOptions : []
  ));
  const revivalRollDefs = revivalTiers.flatMap((tier) => (
    Array.isArray(tier?.rollDefs) ? tier.rollDefs : []
  ));

  if (memoryTypes.length !== 3) {
    auditIssue(issues, "memory-type-count", "memoryTypes", { expected: 3, actual: memoryTypes.length });
  }
  const baseIds = new Set();
  for (const [typeIndex, memoryType] of memoryTypes.entries()) {
    const groups = Array.isArray(memoryType?.baseAttributeGroups) ? memoryType.baseAttributeGroups : [];
    if (groups.length !== 5) {
      auditIssue(issues, "base-attribute-group-count", `memoryTypes.${typeIndex}.baseAttributeGroups`, {
        expected: 5,
        actual: groups.length,
      });
    }
    for (const [groupIndex, group] of groups.entries()) {
      const path = `memoryTypes.${typeIndex}.baseAttributeGroups.${groupIndex}`;
      if (typeof group?.id !== "string" || !group.id || baseIds.has(group.id)) {
        auditIssue(issues, "base-attribute-id-invalid", `${path}.id`);
      }
      if (group?.id) baseIds.add(group.id);
      const values = Array.isArray(group?.enhancementValues) ? group.enhancementValues : [];
      const levels = values.map(({ enhancementLevel }) => enhancementLevel);
      if (values.length !== 50 || levels.some((level, index) => level !== index + 1)) {
        auditIssue(issues, "enhancement-levels-invalid", `${path}.enhancementValues`, {
          expected: 50,
          actual: values.length,
        });
      }
      for (const [valueIndex, value] of values.entries()) {
        if (typeof value?.text !== "string" || !value.text || !Number.isFinite(Number(value.numericValue))) {
          auditIssue(issues, "enhancement-value-invalid", `${path}.enhancementValues.${valueIndex}`);
        }
      }
    }
  }

  const revivalIds = new Set();
  const tierIds = new Set();
  for (const { field, expectedCount } of REVIVAL_SECTION_DEFS) {
    const groups = sectionGroups[field];
    if (groups.length !== expectedCount) {
      auditIssue(issues, "revival-section-count", `revivalCatalog.sections.${field}`, {
        expected: expectedCount,
        actual: groups.length,
      });
    }
    for (const [groupIndex, group] of groups.entries()) {
      const groupPath = `revivalCatalog.sections.${field}.${groupIndex}`;
      if (typeof group?.id !== "string" || !group.id || revivalIds.has(group.id)) {
        auditIssue(issues, "revival-affix-id-invalid", `${groupPath}.id`);
      }
      if (group?.id) revivalIds.add(group.id);
      const tiers = Array.isArray(group?.tierOptions) ? group.tierOptions : [];
      if (!tiers.length) auditIssue(issues, "revival-tier-required", `${groupPath}.tierOptions`);
      for (const [tierIndex, tier] of tiers.entries()) {
        const tierPath = `${groupPath}.tierOptions.${tierIndex}`;
        if (typeof tier?.tierId !== "string" || !tier.tierId || tierIds.has(tier.tierId)) {
          auditIssue(issues, "revival-tier-id-invalid", `${tierPath}.tierId`);
        }
        if (tier?.tierId) tierIds.add(tier.tierId);
        if (!Number.isFinite(Number(tier?.weight)) || Number(tier.weight) < 0) {
          auditIssue(issues, "revival-tier-weight-invalid", `${tierPath}.weight`);
        }
        if (!Number.isInteger(Number(tier?.requiredLevel)) || Number(tier.requiredLevel) < 0) {
          auditIssue(issues, "revival-tier-level-invalid", `${tierPath}.requiredLevel`);
        }
        if (typeof tier?.text !== "string" || typeof tier?.renderTemplate !== "string") {
          auditIssue(issues, "revival-tier-text-invalid", tierPath);
        }
        const rolls = Array.isArray(tier?.rollDefs) ? tier.rollDefs : [];
        const rollKeys = new Set();
        for (const [rollIndex, roll] of rolls.entries()) {
          const rollPath = `${tierPath}.rollDefs.${rollIndex}`;
          const minimum = Number(roll?.min);
          const maximum = Number(roll?.max);
          const precision = Number(roll?.precision);
          const step = Number(roll?.step);
          if (typeof roll?.key !== "string" || !roll.key || rollKeys.has(roll.key)) {
            auditIssue(issues, "revival-roll-key-invalid", `${rollPath}.key`);
          }
          if (roll?.key) rollKeys.add(roll.key);
          if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum
            || !Number.isInteger(precision) || precision < 0 || !Number.isFinite(step) || step <= 0) {
            auditIssue(issues, "revival-roll-range-invalid", rollPath);
          }
        }
      }
    }
  }

  const counts = {
    memoryTypes: memoryTypes.length,
    baseAttributeGroups: baseGroups.length,
    enhancementValues: enhancementValues.length,
    revivalGroups: sectionGroups.revivalAffixGroups.length,
    specialRandomGroups: sectionGroups.specialRandomAffixGroups.length,
    moonPhaseGroups: sectionGroups.moonPhaseAffixGroups.length,
    allRevivalGroups: allRevivalGroups.length,
    revivalTiers: revivalTiers.length,
    weightedRevivalTiers: revivalTiers.filter((tier) => Number.isFinite(Number(tier?.weight))).length,
    revivalRollDefs: revivalRollDefs.length,
  };
  return { complete: issues.length === 0, counts, issues };
}

function allSelectableAffixes(memoryType, dataset) {
  return [
    ...(memoryType.fixedAffixGroups ?? []),
    ...(memoryType.randomAffixGroups ?? []),
    ...revivalAffixes(dataset),
  ];
}

function defaultTier(affix) {
  return Array.isArray(affix?.tierOptions) ? affix.tierOptions[0] : undefined;
}

function normalizeAffixConfig(input, affix) {
  const tiers = Array.isArray(affix?.tierOptions) ? affix.tierOptions : [];
  const tier = tiers.find(({ tierId }) => tierId === input?.tierId) ?? tiers[0];
  if (!tier) return { tierId: null, rolls: {} };

  const sourceRolls = input?.rolls && typeof input.rolls === "object" ? input.rolls : input ?? {};
  const rolls = Object.fromEntries(
    (tier.rollDefs ?? []).map((roll) => [
      roll.key,
      normalizeRollValue(sourceRolls[roll.key], roll),
    ]),
  );
  return { tierId: tier.tierId, rolls };
}

function selectedAffixIds(memory) {
  return [
    ...(memory.fixedAffixIds ?? []),
    ...(memory.randomAffixIds ?? []),
    ...(memory.revivalAffixId ? [memory.revivalAffixId] : []),
  ];
}

export function getHeroMemoryCatalogView(dataset) {
  const sections = revivalSections(dataset);
  return {
    types: Array.isArray(dataset?.memoryTypes) ? dataset.memoryTypes : [],
    revivalAffixGroups: sections.revivalAffixGroups ?? [],
    specialRandomAffixGroups: sections.specialRandomAffixGroups ?? [],
    moonPhaseAffixGroups: sections.moonPhaseAffixGroups ?? [],
    allRevivalAffixGroups: getAllHeroMemoryRevivalAffixes(dataset),
  };
}

export function createHeroMemoryInstance(memoryTypeId, dataset, instanceId = `memory-${memoryTypeId}-${Date.now()}`) {
  const memoryType = findMemoryType(dataset, memoryTypeId);
  if (!memoryType) throw new RangeError(`Unknown hero memory type: ${memoryTypeId}`);
  return {
    instanceId,
    memoryTypeId: memoryType.slotId,
    baseAttributeId: null,
    enhancement: 20,
    traitLevelBonus: getHeroMemoryEnhancementProfile(20).traitLevelBonus,
    profitLoss: false,
    revivalAffixId: null,
    fixedAffixIds: [],
    randomAffixIds: [],
    affixRolls: {},
  };
}

export function normalizeHeroMemoryInstance(input, dataset) {
  const memoryType = findMemoryType(dataset, input?.memoryTypeId);
  if (!memoryType) return null;
  const baseIds = new Set((memoryType.baseAttributeGroups ?? []).map(({ id }) => id));
  const fixedIds = new Set((memoryType.fixedAffixGroups ?? []).map(({ id }) => id));
  const randomIds = new Set((memoryType.randomAffixGroups ?? []).map(({ id }) => id));
  const revivalIds = new Set(revivalAffixes(dataset).map(({ id }) => id));
  const enhancement = Math.round(clampNumber(input?.enhancement, 1, MAX_ENHANCEMENT, 20));
  const enhancementProfile = getHeroMemoryEnhancementProfile(enhancement);
  const memory = {
    instanceId:
      typeof input?.instanceId === "string" && input.instanceId
        ? input.instanceId
        : `memory-${memoryType.slotId}-${Date.now()}`,
    memoryTypeId: memoryType.slotId,
    baseAttributeId: baseIds.has(input?.baseAttributeId) ? input.baseAttributeId : null,
    enhancement,
    traitLevelBonus: Math.round(clampNumber(
      input?.traitLevelBonus,
      0,
      MAX_TRAIT_LEVEL_BONUS,
      enhancementProfile.traitLevelBonus,
    )),
    profitLoss: input?.profitLoss === true,
    ...(Number.isFinite(Number(input?.valueModifierPercent))
      ? { valueModifierPercent: Number(input.valueModifierPercent) }
      : {}),
    revivalAffixId: revivalIds.has(input?.revivalAffixId) ? input.revivalAffixId : null,
    fixedAffixIds: uniqueValidIds(input?.fixedAffixIds, fixedIds, enhancementProfile.affixLimit),
    randomAffixIds: uniqueValidIds(input?.randomAffixIds, randomIds, enhancementProfile.affixLimit),
    affixRolls: {},
  };
  const affixById = new Map(allSelectableAffixes(memoryType, dataset).map((affix) => [affix.id, affix]));
  for (const affixId of selectedAffixIds(memory)) {
    memory.affixRolls[affixId] = normalizeAffixConfig(input?.affixRolls?.[affixId], affixById.get(affixId));
  }
  return memory;
}

export function changeHeroMemoryType(input, memoryTypeId, dataset) {
  const memoryType = findMemoryType(dataset, memoryTypeId);
  if (!memoryType) throw new RangeError(`Unknown hero memory type: ${memoryTypeId}`);
  const current = normalizeHeroMemoryInstance(input, dataset);
  if (current?.memoryTypeId === memoryType.slotId) return current;
  const instanceId = typeof input?.instanceId === "string" && input.instanceId
    ? input.instanceId
    : undefined;
  return createHeroMemoryInstance(memoryType.slotId, dataset, instanceId);
}

export function updateHeroMemoryProperties(input, updates, dataset) {
  const memory = normalizeHeroMemoryInstance(input, dataset);
  if (!memory) return null;
  const candidate = { ...memory };
  for (const field of ["baseAttributeId", "enhancement", "traitLevelBonus", "profitLoss"]) {
    if (updates && Object.hasOwn(updates, field)) candidate[field] = updates[field];
  }
  if (updates && Object.hasOwn(updates, "enhancement") && !Object.hasOwn(updates, "traitLevelBonus")) {
    candidate.traitLevelBonus = getHeroMemoryEnhancementProfile(updates.enhancement).traitLevelBonus;
  }
  return normalizeHeroMemoryInstance(candidate, dataset);
}

export function toggleHeroMemoryAffix(input, kind, affixId, dataset) {
  const memory = normalizeHeroMemoryInstance(input, dataset);
  if (!memory || (kind !== "fixed" && kind !== "random")) return { status: "invalid", memory };
  const memoryType = findMemoryType(dataset, memory.memoryTypeId);
  const field = kind === "fixed" ? "fixedAffixIds" : "randomAffixIds";
  const affixes = kind === "fixed" ? memoryType.fixedAffixGroups : memoryType.randomAffixGroups;
  const affix = affixes?.find(({ id }) => id === affixId);
  const affixLimit = getHeroMemoryEnhancementProfile(memory.enhancement).affixLimit;
  if (!affix) return { status: "invalid", memory };

  if (memory[field].includes(affixId)) {
    memory[field] = memory[field].filter((id) => id !== affixId);
    delete memory.affixRolls[affixId];
    return { status: "removed", memory };
  }
  if (memory[field].length >= affixLimit) return { status: "limit", memory };

  memory[field] = [...memory[field], affixId];
  memory.affixRolls[affixId] = normalizeAffixConfig({}, affix);
  return { status: "added", memory };
}

export function toggleHeroMemoryRevivalAffix(input, affixId, dataset) {
  const memory = normalizeHeroMemoryInstance(input, dataset);
  const affix = revivalAffixes(dataset).find(({ id }) => id === affixId);
  if (!memory || !affix) return { status: "invalid", memory };

  if (memory.revivalAffixId === affixId) {
    memory.revivalAffixId = null;
    delete memory.affixRolls[affixId];
    return { status: "removed", memory };
  }

  const previousAffixId = memory.revivalAffixId;
  if (previousAffixId) delete memory.affixRolls[previousAffixId];
  memory.revivalAffixId = affixId;
  memory.affixRolls[affixId] = normalizeAffixConfig({}, affix);
  return { status: previousAffixId ? "replaced" : "added", memory };
}

export function updateHeroMemoryAffixTier(input, affixId, tierId, dataset) {
  const memory = normalizeHeroMemoryInstance(input, dataset);
  if (!memory || !selectedAffixIds(memory).includes(affixId)) return memory;
  const memoryType = findMemoryType(dataset, memory.memoryTypeId);
  const affix = allSelectableAffixes(memoryType, dataset).find(({ id }) => id === affixId);
  const tier = affix?.tierOptions?.find((candidate) => candidate.tierId === tierId);
  if (!tier) return memory;

  memory.affixRolls[affixId] = normalizeAffixConfig({
    tierId: tier.tierId,
    rolls: memory.affixRolls[affixId]?.rolls,
  }, affix);
  return memory;
}

export function updateHeroMemoryAffixRoll(input, affixId, tierId, rollKey, value, dataset) {
  const memory = normalizeHeroMemoryInstance(input, dataset);
  if (!memory || !selectedAffixIds(memory).includes(affixId)) return memory;
  const memoryType = findMemoryType(dataset, memory.memoryTypeId);
  const affix = allSelectableAffixes(memoryType, dataset).find(({ id }) => id === affixId);
  const currentTierId = memory.affixRolls[affixId]?.tierId;
  const tier = affix?.tierOptions?.find((candidate) => candidate.tierId === tierId)
    ?? affix?.tierOptions?.find((candidate) => candidate.tierId === currentTierId);
  const roll = tier?.rollDefs?.find((candidate) => candidate.key === rollKey);
  if (!tier || !roll) return memory;

  const current = normalizeAffixConfig({
    tierId: tier.tierId,
    rolls: memory.affixRolls[affixId]?.rolls,
  }, affix);
  current.rolls[roll.key] = normalizeRollValue(value, roll);
  memory.affixRolls[affixId] = current;
  return memory;
}

function renderTier(tier, rolls) {
  return String(tier?.renderTemplate ?? tier?.text ?? "").replace(/\{\{([^}]+)\}\}/g, (_, key) =>
    String(rolls?.[key] ?? ""),
  );
}

export function applyHeroMemoryValueModifier(text, modifierPercent) {
  const modifier = Number(modifierPercent);
  if (!Number.isFinite(modifier) || modifier === 0) return String(text ?? "");
  return String(text ?? "").replace(/([+\-])(\d+(?:\.\d+)?)/gu, (match, sign, rawValue) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return match;
    const precision = rawValue.includes(".") ? rawValue.split(".")[1].length : 0;
    const adjusted = Math.abs(value * (1 + modifier / 100));
    const fixed = adjusted.toFixed(precision);
    const rendered = precision > 0 ? fixed.replace(/\.?0+$/u, "") : fixed;
    return `${sign}${rendered || "0"}`;
  });
}

export function getHeroMemoryPreview(input, dataset) {
  const memory = normalizeHeroMemoryInstance(input, dataset);
  const diagnosis = diagnoseHeroMemoryInstance(input, dataset);
  if (!memory) {
    return {
      memoryTypeId: null,
      baseAttributeId: null,
      baseAttributeText: "",
      enhancement: null,
      traitLevelBonus: null,
      profitLoss: false,
      affixes: [],
      affixTexts: [],
      valid: false,
      issues: diagnosis.issues,
    };
  }
  const memoryType = findMemoryType(dataset, memory.memoryTypeId);
  const base = memoryType.baseAttributeGroups?.find(({ id }) => id === memory.baseAttributeId);
  const baseAttributeValue = base?.enhancementValues?.find(
    ({ enhancementLevel }) => enhancementLevel === memory.enhancement,
  );
  const valueModifierPercent = Number.isFinite(Number(memory.valueModifierPercent))
    ? Number(memory.valueModifierPercent)
    : 0;
  const baseModifierPercent = ((1 + valueModifierPercent / 100)
    * (memory.profitLoss ? 1.3 : 1) - 1) * 100;
  const baseAttributeText = applyHeroMemoryValueModifier(
    baseAttributeValue?.text ?? "",
    baseModifierPercent,
  );
  const affixById = new Map(allSelectableAffixes(memoryType, dataset).map((affix) => [affix.id, affix]));
  const kindById = new Map([
    ...memory.fixedAffixIds.map((id) => [id, "fixed"]),
    ...memory.randomAffixIds.map((id) => [id, "random"]),
    ...(memory.revivalAffixId
      ? [[memory.revivalAffixId, affixById.get(memory.revivalAffixId)?.revivalKind ?? "revival"]]
      : []),
  ]);
  const affixes = selectedAffixIds(memory).map((affixId) => {
    const affix = affixById.get(affixId);
    const config = memory.affixRolls[affixId];
    const tier = affix?.tierOptions?.find(({ tierId }) => tierId === config?.tierId) ?? defaultTier(affix);
    return {
      id: affixId,
      kind: kindById.get(affixId),
      tierId: tier?.tierId ?? null,
      weight: tier?.weight ?? null,
      requiredLevel: tier?.requiredLevel ?? null,
      localeRef: tier?.localeRef ?? affix?.localeRef ?? "",
      rolls: { ...(config?.rolls ?? {}) },
      text: kindById.get(affixId) === "random"
        ? applyHeroMemoryValueModifier(renderTier(tier, config?.rolls), valueModifierPercent)
        : renderTier(tier, config?.rolls),
    };
  });
  return {
    memoryTypeId: memory.memoryTypeId,
    baseAttributeId: memory.baseAttributeId,
    baseAttributeText,
    baseAttributeLocaleRef: baseAttributeValue?.localeRef ?? base?.localeRef ?? "",
    enhancement: memory.enhancement,
    traitLevelBonus: memory.traitLevelBonus,
    profitLoss: memory.profitLoss,
    valueModifierPercent: Number.isFinite(Number(memory.valueModifierPercent))
      ? Number(memory.valueModifierPercent)
      : null,
    affixes,
    affixTexts: affixes.map(({ text }) => text),
    valid: diagnosis.valid,
    issues: diagnosis.issues,
  };
}

function addIssue(issues, code, path) {
  issues.push({ code, path });
}

function diagnoseSelectedIds(input, kind, validIds, limit, issues) {
  const field = kind === "fixed" ? "fixedAffixIds" : "randomAffixIds";
  const values = input?.[field];
  if (values !== undefined && !Array.isArray(values)) {
    addIssue(issues, `${kind}-affix-list-invalid`, field);
    return;
  }

  const seen = new Set();
  let validCount = 0;
  for (const [index, id] of (values ?? []).entries()) {
    if (!validIds.has(id)) {
      addIssue(issues, `${kind}-affix-invalid`, `${field}.${index}`);
      continue;
    }
    validCount += 1;
    if (seen.has(id)) addIssue(issues, `${kind}-affix-duplicate`, `${field}.${index}`);
    seen.add(id);
  }
  if (validCount > limit) addIssue(issues, `${kind}-affix-limit`, field);
  if (kind === "fixed" && validCount < limit) addIssue(issues, "fixed-affix-required", field);
}

function isValidIntegerRange(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number)
    && Number.isInteger(number)
    && number >= minimum
    && number <= maximum;
}

export function diagnoseHeroMemoryInstance(input, dataset) {
  const issues = [];
  const memoryType = findMemoryType(dataset, input?.memoryTypeId);
  const normalized = normalizeHeroMemoryInstance(input, dataset);
  if (!memoryType) {
    addIssue(issues, "memory-type-invalid", "memoryTypeId");
    return { valid: false, issues, normalized };
  }

  const baseIds = new Set((memoryType.baseAttributeGroups ?? []).map(({ id }) => id));
  if (input?.baseAttributeId == null || input.baseAttributeId === "") {
    addIssue(issues, "base-attribute-required", "baseAttributeId");
  } else if (!baseIds.has(input.baseAttributeId)) {
    addIssue(issues, "base-attribute-invalid", "baseAttributeId");
  }
  if (!isValidIntegerRange(input?.enhancement, 1, MAX_ENHANCEMENT)) {
    addIssue(issues, "enhancement-invalid", "enhancement");
  }
  if (!isValidIntegerRange(input?.traitLevelBonus, 0, MAX_TRAIT_LEVEL_BONUS)) {
    addIssue(issues, "trait-level-bonus-invalid", "traitLevelBonus");
  }
  if (typeof input?.profitLoss !== "boolean") {
    addIssue(issues, "profit-loss-invalid", "profitLoss");
  }
  if (Object.hasOwn(input ?? {}, "valueModifierPercent")
    && (typeof input.valueModifierPercent !== "number"
      || !Number.isFinite(input.valueModifierPercent))) {
    addIssue(issues, "value-modifier-invalid", "valueModifierPercent");
  }

  const fixedIds = new Set((memoryType.fixedAffixGroups ?? []).map(({ id }) => id));
  const randomIds = new Set((memoryType.randomAffixGroups ?? []).map(({ id }) => id));
  const revivalIds = new Set(revivalAffixes(dataset).map(({ id }) => id));
  const affixLimit = getHeroMemoryEnhancementProfile(input?.enhancement).affixLimit;
  diagnoseSelectedIds(input, "fixed", fixedIds, affixLimit, issues);
  diagnoseSelectedIds(input, "random", randomIds, affixLimit, issues);
  if (input?.revivalAffixId != null && !revivalIds.has(input.revivalAffixId)) {
    addIssue(issues, "revival-affix-invalid", "revivalAffixId");
  }

  const selectedIds = new Set(selectedAffixIds(normalized));
  const affixById = new Map(allSelectableAffixes(memoryType, dataset).map((affix) => [affix.id, affix]));
  const configs = input?.affixRolls && typeof input.affixRolls === "object" && !Array.isArray(input.affixRolls)
    ? input.affixRolls
    : {};
  if (input?.affixRolls !== undefined && configs !== input.affixRolls) {
    addIssue(issues, "affix-config-invalid", "affixRolls");
  }

  for (const [affixId, config] of Object.entries(configs)) {
    if (!selectedIds.has(affixId)) {
      addIssue(issues, "affix-config-unselected", `affixRolls.${affixId}`);
      continue;
    }
    const affix = affixById.get(affixId);
    const requestedTierId = config?.tierId;
    const tier = affix?.tierOptions?.find(({ tierId }) => tierId === requestedTierId)
      ?? defaultTier(affix);
    if (requestedTierId != null && requestedTierId !== tier?.tierId) {
      addIssue(issues, "affix-tier-invalid", `affixRolls.${affixId}.tierId`);
    }
    const rawRolls = config?.rolls && typeof config.rolls === "object" && !Array.isArray(config.rolls)
      ? config.rolls
      : {};
    if (config?.rolls !== undefined && rawRolls !== config.rolls) {
      addIssue(issues, "affix-rolls-invalid", `affixRolls.${affixId}.rolls`);
    }
    const rollByKey = new Map((tier?.rollDefs ?? []).map((roll) => [roll.key, roll]));
    for (const [rollKey, value] of Object.entries(rawRolls)) {
      const roll = rollByKey.get(rollKey);
      if (!roll || !Number.isFinite(Number(value)) || normalizeRollValue(value, roll) !== Number(value)) {
        addIssue(issues, "affix-roll-invalid", `affixRolls.${affixId}.rolls.${rollKey}`);
      }
    }
  }

  return { valid: issues.length === 0, issues, normalized };
}
