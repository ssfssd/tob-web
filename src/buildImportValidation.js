import {
  BUILD_DOCUMENT_SCHEMA_VERSION,
} from "./buildDocument.js";
import {
  convert91TobBuildDocument,
  inspect91TobBuildDocumentEnvelope,
} from "./build91tobInterop.js";
import {
  CATALOG,
  CATEGORY_DEFS,
  GEAR_SLOT_KEYS,
  findItemById,
  getCatalogItems,
  getGearFilterForSlot,
  getGearItemsForFilter,
} from "./catalog.js";
import { createDefaultBuild, normalizeBuild } from "./engine.js";
import {
  findSkillRuntimeRecord,
  findSupportRuntimeRecord,
  getEffectiveSupportCompatibilityHostSkill,
  getExternalMainSkillOverride,
  getSkillEnergyUsage,
  isSupportCompatible,
  normalizeSkillState,
  normalizeSupportRuntimeConfig,
} from "./skillRuntimeModel.js";
import {
  getIrisSpiritHeroMode,
  getIrisSpiritHostSkillForActiveSkill,
} from "./irisSpiritSkillRuntime.js";
import { normalizeHeroTraitState } from "./heroTraitModel.js";
import { diagnoseActiveHeroMemoryInstance } from "./activeHeroMemoryModel.js";
import {
  diagnoseHeroMemoryRevivalSlotInstance,
  getHeroMemoryRevivalSlotEffect,
} from "./heroMemoryRevivalSlot.js";
import { diagnoseTalentBoardState } from "./talentBoardModel.js";
import {
  PACT_RING_SLOT_ORDER,
  diagnoseDestinyInstance,
  diagnosePactDestinyState,
  diagnosePactSpiritInstance,
  diagnoseUndeterminedDestinyInstance,
  getPactRingSlotType,
} from "./pactDestinyModel.js";
import { importDivinitySlateBoard } from "./divinitySlateModel.js";
import { normalizeConditionState } from "./conditionModel.js";
import { normalizePatchSnapshot } from "./calculation/patchSnapshot.js";
import { loadActiveRuntimeDataset } from "./activeRuntimeData.js";
import { loadActiveHeroMemoryDataset } from "./activeHeroMemoryData.js";
import { createActiveSkillRuntimeModel } from "./activeSkillRuntimeModel.js";
import { createHeroTraitModel } from "./heroTraitModel.js";
import { partitionHeroCatalogBySeason } from "./heroSeasonScope.js";
import { createTalentBoardModel } from "./talentBoardModel.js";
import { createActiveSs13PactDestinyModel } from "./pactDestinyModel.js";
import { ACTIVE_DIVINITY_MODEL } from "./activeDivinityData.js";

const CURRENT_REQUIRED_OBJECTS = Object.freeze([
  "hero",
  "skills",
  "gear",
  "talents",
  "divinity",
  "pact",
]);
const SKILL_DATASET_IDS = Object.freeze([
  "skill_active",
  "skill_passive",
  "skill_support",
  "skill_activation_medium",
  "skill_magnificent_support",
  "skill_noble_support",
  "skill_modularization_catalog",
  "skill_elixir_catalog",
]);
let validationContextPromise;

export const BUILD_IMPORT_MAX_UTF8_BYTES = 5 * 1024 * 1024;
export const BUILD_IMPORT_MAX_NESTING_DEPTH = 64;

export function loadBuildImportValidationContext() {
  validationContextPromise ??= Promise.all([
    ...SKILL_DATASET_IDS.map((datasetId) => loadActiveRuntimeDataset(datasetId)),
    loadActiveRuntimeDataset("hero_catalog"),
    loadActiveHeroMemoryDataset(),
    loadActiveRuntimeDataset("talent_catalog"),
    loadActiveRuntimeDataset("pactspirit_catalog"),
    loadActiveRuntimeDataset("destiny_catalog"),
    loadActiveRuntimeDataset("divinity_talent_catalog"),
  ]).then((loaded) => {
    const skillDatasets = Object.fromEntries(
      SKILL_DATASET_IDS.map((datasetId, index) => [datasetId, loaded[index]]),
    );
    const heroCatalog = loaded[SKILL_DATASET_IDS.length];
    const heroMemory = loaded[SKILL_DATASET_IDS.length + 1];
    const talentCatalog = loaded[SKILL_DATASET_IDS.length + 2];
    const pactCatalog = loaded[SKILL_DATASET_IDS.length + 3];
    const destinyCatalog = loaded[SKILL_DATASET_IDS.length + 4];
    const divinitySourceCatalog = loaded[SKILL_DATASET_IDS.length + 5];
    const heroScope = partitionHeroCatalogBySeason(heroCatalog, getCatalogItems("hero"));
    return Object.freeze({
      catalogByCategory: CATALOG,
      skillModel: createActiveSkillRuntimeModel(skillDatasets, {
        skills: getCatalogItems("skills"),
        supports: getCatalogItems("supports"),
      }),
      heroTraitModel: createHeroTraitModel(heroScope.activeHeroCatalog, heroScope.activeFlatHeroes),
      heroMemoryDataset: heroMemory.dataset,
      heroMemorySourceDataset: heroMemory.sourceDataset,
      talentModel: createTalentBoardModel(talentCatalog, { talentItems: getCatalogItems("talents") }),
      pactModel: createActiveSs13PactDestinyModel(pactCatalog, destinyCatalog, {
        spirits: getCatalogItems("spirits"),
        destiny: getCatalogItems("destiny"),
      }),
      pactDestinySourceCatalog: destinyCatalog,
      divinityModel: ACTIVE_DIVINITY_MODEL,
      divinitySourceCatalog,
    });
  });
  return validationContextPromise;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const JSON_POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function inspectJsonEnvelopeLimits(text) {
  if (new TextEncoder().encode(text).byteLength > BUILD_IMPORT_MAX_UTF8_BYTES) {
    return issue("json-size-limit-exceeded", "document");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") {
      depth += 1;
      if (depth > BUILD_IMPORT_MAX_NESTING_DEPTH) {
        return issue("json-depth-limit-exceeded", "document");
      }
    } else if (character === "}" || character === "]") {
      depth -= 1;
    }
  }
  return null;
}

function inspectJsonObjectKeys(text) {
  let index = 0;
  let duplicateKey = false;
  let pollutionKey = false;

  const skipWhitespace = () => {
    while (index < text.length && /\s/u.test(text[index])) index += 1;
  };

  const parseString = () => {
    if (text[index] !== '"') throw new SyntaxError("string expected");
    const start = index;
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === "\\") {
        index += 2;
        continue;
      }
      index += 1;
      if (character === '"') return JSON.parse(text.slice(start, index));
    }
    throw new SyntaxError("unterminated string");
  };

  const parseValue = () => {
    skipWhitespace();
    if (text[index] === "{") {
      index += 1;
      skipWhitespace();
      const keys = new Set();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      while (index < text.length) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) duplicateKey = true;
        keys.add(key);
        if (JSON_POLLUTION_KEYS.has(key)) pollutionKey = true;
        skipWhitespace();
        if (text[index] !== ":") throw new SyntaxError("colon expected");
        index += 1;
        parseValue();
        skipWhitespace();
        if (text[index] === "}") {
          index += 1;
          return;
        }
        if (text[index] !== ",") throw new SyntaxError("comma expected");
        index += 1;
      }
      throw new SyntaxError("unterminated object");
    }
    if (text[index] === "[") {
      index += 1;
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      while (index < text.length) {
        parseValue();
        skipWhitespace();
        if (text[index] === "]") {
          index += 1;
          return;
        }
        if (text[index] !== ",") throw new SyntaxError("comma expected");
        index += 1;
      }
      throw new SyntaxError("unterminated array");
    }
    if (text[index] === '"') {
      parseString();
      return;
    }
    const start = index;
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) index += 1;
    if (index === start) throw new SyntaxError("value expected");
  };

  try {
    skipWhitespace();
    parseValue();
    skipWhitespace();
    if (index !== text.length) throw new SyntaxError("trailing input");
    return { scanComplete: true, duplicateKey, pollutionKey };
  } catch {
    return { scanComplete: false, duplicateKey, pollutionKey };
  }
}

function issue(code, path) {
  return { code, path };
}

function fail(reason, issues = []) {
  return { ok: false, reason, issues, build: null };
}

function sameJson(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((entry, index) => sameJson(entry, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => (
      key === rightKeys[index]
      && sameJson(left[key], right[key])
    ));
}

function normalizeResearchForImport(input) {
  return {
    season: typeof input?.season === "string" ? input.season.trim().slice(0, 20) : "",
    sources: Array.isArray(input?.sources)
      ? input.sources
          .filter((source) => typeof source === "string" && source.trim())
          .map((source) => source.trim())
          .slice(0, 20)
      : [],
    notes: typeof input?.notes === "string" ? input.notes : "",
  };
}

function validateDocumentMetadata(input, issues) {
  if (typeof input.customAffixes !== "string") {
    issues.push(issue("custom-affixes-invalid", "customAffixes"));
  }
  if (!isPlainObject(input.research)
    || !sameJson(normalizeResearchForImport(input.research), input.research)) {
    issues.push(issue("research-invalid", "research"));
  }
  if (typeof input.updatedAt !== "string" || !input.updatedAt || !Number.isFinite(Date.parse(input.updatedAt))) {
    issues.push(issue("updated-at-invalid", "updatedAt"));
  }
  if (!isPlainObject(input.patchSnapshot)
    || !sameJson(normalizePatchSnapshot(input.patchSnapshot), input.patchSnapshot)) {
    issues.push(issue("patch-snapshot-invalid", "patchSnapshot"));
  }
  if (!isPlainObject(input.calculation)) {
    issues.push(issue("calculation-invalid", "calculation"));
  }
}

function numericValueIsValid(value, definition) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;
  if (numeric < Number(definition.min) || numeric > Number(definition.max)) return false;
  const step = Number(definition.step) || 1;
  const precision = Number(definition.precision) || 0;
  const stepped = Number((Number(definition.min) + Math.round((numeric - Number(definition.min)) / step) * step)
    .toFixed(precision));
  return stepped === numeric;
}

function runtimeProjectionCategory(categoryId, itemId, context) {
  if (categoryId === "spirits" && context.pactModel?.spirits?.some((record) => (
    record.id === itemId || record.catalogId === itemId
  ))) return "spirits";
  if (categoryId === "destiny" && context.pactModel?.destinies?.some((record) => (
    record.id === itemId || record.catalogId === itemId
  ))) return "destiny";
  return null;
}

function validateSelectionProjection(input, context, issues, options = {}) {
  if (!isPlainObject(input)) {
    issues.push(issue("selections-invalid", "selections"));
    return;
  }
  for (const [categoryId, itemIds] of Object.entries(input)) {
    if (!Array.isArray(itemIds)) {
      issues.push(issue("selection-list-invalid", "selections"));
      continue;
    }
    const category = CATEGORY_DEFS.find((candidate) => candidate.id === categoryId);
    if (!category) {
      issues.push(issue("selection-category-unknown", "selections"));
      continue;
    }
    const expandedTalentProjection = categoryId === "talents"
      && options.allowExpandedTalentProjection === true;
    if (!expandedTalentProjection
      && itemIds.filter((itemId) => itemId !== null && itemId !== "").length
        > category.maxSelections) {
      issues.push(issue("selection-count-exceeded", `selections.${categoryId}`));
    }
    for (const [itemIndex, itemId] of itemIds.entries()) {
      const path = `selections.${categoryId}.${itemIndex}`;
      if (itemId === null || itemId === "") continue;
      if (typeof itemId !== "string") {
        issues.push(issue("selection-id-invalid", path));
        continue;
      }
      const runtimeCategory = runtimeProjectionCategory(categoryId, itemId, context);
      const item = runtimeCategory ? null : findItemById(itemId);
      if (!item) {
        if (runtimeCategory !== categoryId) issues.push(issue("selection-id-unknown", path));
      } else if (item.categoryId !== categoryId) {
        issues.push(issue("selection-category-mismatch", path));
      }
    }
  }
}

function gearFitsSlot(itemId, slotIndex) {
  const slotKey = GEAR_SLOT_KEYS[slotIndex];
  if (!slotKey) return false;
  const filter = getGearFilterForSlot(slotKey);
  return getGearItemsForFilter(filter).some((item) => item.id === itemId);
}

function validateRollMap(values, definitions, path, issues) {
  if (!isPlainObject(values)) {
    issues.push(issue("gear-rolls-invalid", path));
    return;
  }
  const definitionByKey = new Map((definitions ?? []).map((definition) => [definition.key ?? definition.id, definition]));
  for (const [rollKey, value] of Object.entries(values)) {
    const definition = definitionByKey.get(rollKey);
    if (!definition || !numericValueIsValid(value, definition)) {
      issues.push(issue("gear-roll-invalid", path));
    }
  }
}

function activeGearRollDefinitions(item, slot) {
  const definitions = [...(item.rolls ?? [])];
  if (!Array.isArray(item.legendaryAffixes) || item.legendaryAffixes.length === 0) {
    return definitions;
  }
  const draftedSlots = Array.isArray(slot.legendaryDraft?.corrodedSlotIds)
    ? new Set(slot.legendaryDraft.corrodedSlotIds)
    : null;
  const corrodedSlots = draftedSlots ?? (
    slot.corrupted
      ? new Set(item.legendaryAffixes.map((affix) => affix.slotId))
      : new Set()
  );
  for (const affix of item.legendaryAffixes) {
    const variantName = corrodedSlots.has(affix.slotId) ? "corroded" : "normal";
    const variant = affix[variantName];
    for (const definition of variant?.rollDefs ?? []) {
      definitions.push({
        ...definition,
        key: `legendary:${affix.slotId}:${variantName}:${definition.key}`,
      });
    }
  }
  return definitions;
}

function validateGearSlot(slot, slotIndex, issues, options = {}) {
  const path = options.path ?? `gear.slots.${slotIndex}`;
  if (!isPlainObject(slot)) {
    issues.push(issue("gear-slot-invalid", path));
    return;
  }
  const item = findItemById(slot.itemId);
  if (!item || item.categoryId !== "gear") {
    issues.push(issue("gear-id-unknown", `${path}.itemId`));
    return;
  }
  if (options.checkSlot !== false && !gearFitsSlot(item.id, slotIndex)) {
    issues.push(issue("gear-slot-mismatch", path));
  }
  if (typeof slot.instanceId !== "string" || !slot.instanceId) {
    issues.push(issue("gear-instance-id-invalid", path));
  }
  if (slot.rolls !== undefined) {
    validateRollMap(slot.rolls, activeGearRollDefinitions(item, slot), `${path}.rolls`, issues);
  }
  if (slot.corrupted !== undefined && typeof slot.corrupted !== "boolean") {
    issues.push(issue("gear-corruption-invalid", `${path}.corrupted`));
  }
  if (slot.crafts !== undefined) {
    if (!isPlainObject(slot.crafts)) {
      issues.push(issue("gear-crafts-invalid", `${path}.crafts`));
    } else {
      const affixById = new Map((item.craftAffixes ?? []).map((affix) => [affix.affixId, affix]));
      for (const craft of Object.values(slot.crafts)) {
        const affix = affixById.get(craft?.affixId) ?? affixById.get(
          Object.entries(slot.crafts).find(([, candidate]) => candidate === craft)?.[0],
        );
        const tier = affix?.tierOptions?.find((candidate) => candidate.tierId === craft?.tierId);
        if (!affix || !tier) {
          issues.push(issue("gear-craft-tier-invalid", `${path}.crafts`));
          continue;
        }
        validateRollMap(craft?.rolls ?? {}, tier.rollDefs ?? [], `${path}.crafts`, issues);
      }
    }
  }
  if (slot.legendaryDraft !== undefined && slot.legendaryDraft !== null) {
    if (!isPlainObject(slot.legendaryDraft) || !Array.isArray(slot.legendaryDraft.corrodedSlotIds)) {
      issues.push(issue("gear-legendary-draft-invalid", `${path}.legendaryDraft`));
    } else {
      const allowedSlotIds = new Set((item.legendaryAffixes ?? []).map((affix) => affix.slotId));
      const seen = new Set();
      for (const slotId of slot.legendaryDraft.corrodedSlotIds) {
        if (typeof slotId !== "string" || !allowedSlotIds.has(slotId) || seen.has(slotId)) {
          issues.push(issue("gear-corrosion-slot-invalid", `${path}.legendaryDraft`));
        }
        seen.add(slotId);
      }
    }
  }
}

function validateGear(input, issues) {
  if (!isPlainObject(input) || !Array.isArray(input.slots) || input.slots.length !== GEAR_SLOT_KEYS.length) {
    issues.push(issue("gear-state-invalid", "gear"));
    return;
  }
  const instanceIds = new Set();
  for (const [slotIndex, slot] of input.slots.entries()) {
    if (slot === null) continue;
    validateGearSlot(slot, slotIndex, issues);
    if (typeof slot?.instanceId !== "string" || !slot.instanceId) continue;
    if (instanceIds.has(slot.instanceId)) issues.push(issue("gear-instance-id-duplicate", "gear.slots"));
    instanceIds.add(slot.instanceId);
  }
  if (input.inventory !== undefined && !Array.isArray(input.inventory)) {
    issues.push(issue("gear-inventory-invalid", "gear.inventory"));
    return;
  }
  for (const [inventoryIndex, entry] of (input.inventory ?? []).entries()) {
    validateGearSlot(entry, null, issues, {
      path: `gear.inventory.${inventoryIndex}`,
      checkSlot: false,
    });
    if (typeof entry?.instanceId !== "string" || !entry.instanceId) continue;
    if (instanceIds.has(entry.instanceId)) {
      issues.push(issue("gear-instance-id-duplicate", "gear.inventory"));
    }
    instanceIds.add(entry.instanceId);
  }
}

function validateSupportConfig(supportSlot, support, path, issues) {
  if (!Number.isInteger(Number(supportSlot.level)) || Number(supportSlot.level) < 1
    || Number(supportSlot.level) > Number(support.maxLevel ?? 21)) {
    issues.push(issue("support-level-invalid", path));
  }
  if (supportSlot.config === undefined) return;
  const normalized = normalizeSupportRuntimeConfig(supportSlot.config, support);
  if (!sameJson(normalized, supportSlot.config)) issues.push(issue("support-config-invalid", path));
}

function validateSkillRow(model, build, row, kind, rowIndex, issues) {
  const path = `skills.${kind}.${rowIndex}`;
  if (!isPlainObject(row) || !Array.isArray(row.supports) || row.supports.length !== 5) {
    issues.push(issue("skill-row-invalid", path));
    return;
  }
  const minimumUnlocked = kind === "active" ? 1 : 0;
  if (!Number.isInteger(Number(row.unlockedSupportCount))
    || Number(row.unlockedSupportCount) < minimumUnlocked
    || Number(row.unlockedSupportCount) > 5) {
    issues.push(issue("support-unlock-count-invalid", path));
  }
  const external = getExternalMainSkillOverride(model, build, kind, rowIndex);
  const storedSkill = row.skillId ? findSkillRuntimeRecord(model, row.skillId) : null;
  const skill = external?.skill ?? storedSkill;
  const heroIdentifier = build.hero?.branchId ?? build.selections?.hero?.[0] ?? "";
  const spiritHostSkill = kind === "active"
    ? getIrisSpiritHostSkillForActiveSkill(model, storedSkill, heroIdentifier)
    : null;
  const expectedSpiritHost = spiritHostSkill
    ? {
        skillId: spiritHostSkill.id,
        shared: getIrisSpiritHeroMode(heroIdentifier) === "vigilant-breeze",
      }
    : undefined;
  if (!sameJson(row.spiritHost, expectedSpiritHost)) {
    issues.push(issue("skill-spirit-host-invalid", `${path}.spiritHost`));
  }
  if (row.skillId && (!storedSkill || storedSkill.role !== kind)) {
    issues.push(issue("skill-id-invalid", path));
  }
  if (storedSkill) {
    if (!Number.isInteger(Number(row.level)) || Number(row.level) < 1 || Number(row.level) > 21) {
      issues.push(issue("skill-level-out-of-range", `${path}.level`));
    }
  } else if (!Number.isInteger(Number(row.level)) || Number(row.level) < 0 || Number(row.level) > 21) {
    issues.push(issue("skill-level-out-of-range", `${path}.level`));
  }

  const supportRecords = row.supports.map((supportSlot, supportIndex) => {
    if (supportSlot === null) return null;
    if (!isPlainObject(supportSlot) || supportIndex >= Number(row.unlockedSupportCount)) {
      issues.push(issue("support-slot-invalid", path));
      return null;
    }
    const support = findSupportRuntimeRecord(model, supportSlot.supportId);
    if (!support) {
      issues.push(issue("support-id-unknown", `${path}.supports.${supportIndex}.supportId`));
      return null;
    }
    validateSupportConfig(supportSlot, support, path, issues);
    return support;
  });
  const equippedIds = new Set();
  for (const [supportIndex, support] of supportRecords.entries()) {
    if (!support) continue;
    if (equippedIds.has(support.id)) issues.push(issue("support-duplicate", path));
    equippedIds.add(support.id);
    if (!skill) continue;
    const otherSupports = supportRecords.filter((candidate, index) => index !== supportIndex && candidate);
    const effectiveHost = getEffectiveSupportCompatibilityHostSkill(
      spiritHostSkill ?? skill,
      otherSupports,
    );
    if (!isSupportCompatible(effectiveHost, support, supportIndex + 1)) {
      issues.push(issue("support-incompatible", `${path}.supports.${supportIndex}.supportId`));
    }
  }
}

function hasSkillPayload(input) {
  return [...(input?.active ?? []), ...(input?.passive ?? [])].some((row) => (
    Boolean(row?.skillId) || row?.supports?.some(Boolean)
  )) || (Array.isArray(input?.elixirs) && input.elixirs.some(Boolean));
}

function validateElixirs(input, build, model, issues) {
  const expectedLength = model.elixir.bottles.length;
  if (!Array.isArray(input.elixirs) || input.elixirs.length !== expectedLength) {
    issues.push(issue("elixir-state-invalid", "skills.elixirs"));
    return;
  }

  const normalizedElixirs = normalizeSkillState(model, input, { build }).elixirs;
  const runtimeElixirs = input.elixirs.map((elixir) => (
    isPlainObject(elixir)
      ? {
          bottleId: elixir.bottleId ?? null,
          skillId: elixir.skillId ?? null,
          ingredientIds: Array.isArray(elixir.ingredientIds) ? elixir.ingredientIds : [],
        }
      : elixir
  ));
  if (!sameJson(normalizedElixirs, runtimeElixirs)) {
    issues.push(issue("elixir-state-invalid", "skills.elixirs"));
  }
  if (!Object.hasOwn(input, "elixir")
    || !sameJson(input.elixir ?? null, input.elixirs[0] ?? null)) {
    issues.push(issue("elixir-projection-mismatch", "skills.elixir"));
  }
}

function validateSkills(input, build, context, issues) {
  if (!isPlainObject(input)
    || !Array.isArray(input.active) || input.active.length !== 5
    || !Array.isArray(input.passive) || input.passive.length !== 4) {
    issues.push(issue("skills-state-invalid", "skills"));
    return;
  }
  if (!context.skillModel) {
    if (hasSkillPayload(input)) issues.push(issue("validation-context-unavailable", "skills"));
    return;
  }
  input.active.forEach((row, index) => validateSkillRow(context.skillModel, build, row, "active", index, issues));
  input.passive.forEach((row, index) => validateSkillRow(context.skillModel, build, row, "passive", index, issues));
  validateElixirs(input, build, context.skillModel, issues);
  if (getSkillEnergyUsage(input).over > 0) issues.push(issue("skill-energy-exceeded", "skills"));
}

function validateHero(input, context, issues) {
  if (!isPlainObject(input)
    || !Number.isInteger(Number(input.level)) || Number(input.level) < 1 || Number(input.level) > 100
    || !Array.isArray(input.traitSelections) || !Array.isArray(input.memories)) {
    issues.push(issue("hero-state-invalid", "hero"));
    return;
  }
  if (input.branchId || input.traitSelections.length) {
    if (!context.heroTraitModel) {
      issues.push(issue("validation-context-unavailable", "hero"));
    } else {
      const normalized = normalizeHeroTraitState(context.heroTraitModel, input);
      if (normalized.branchId !== input.branchId
        || normalized.level !== Number(input.level)
        || !sameJson(normalized.traitSelections, input.traitSelections)) {
        issues.push(issue("hero-traits-invalid", "hero"));
      }
    }
  }
  if (input.memories.slice(3).some(Boolean)) {
    issues.push(issue("hero-memory-invalid", "hero.memories"));
  }
  if (input.memories.some(Boolean) || input.revivalMemory != null) {
    if (!context.heroMemoryDataset) {
      issues.push(issue("validation-context-unavailable", "hero.memories"));
    } else {
      for (const memory of input.memories.slice(0, 3)) {
        if (memory && (
          diagnoseActiveHeroMemoryInstance(memory, context.heroMemoryDataset).valid !== true
          || Object.hasOwn(memory, "valueModifierPercent")
        )) {
          issues.push(issue("hero-memory-invalid", "hero.memories"));
        }
      }
      if (input.revivalMemory != null) {
        const effects = input.memories.slice(0, 3)
          .map((memory) => getHeroMemoryRevivalSlotEffect(memory, context.heroMemoryDataset))
          .filter(Boolean);
        const diagnosis = effects.length === 1
          ? diagnoseHeroMemoryRevivalSlotInstance(
            input.revivalMemory,
            effects[0],
            context.heroMemoryDataset,
          )
          : { valid: false };
        const standardInstanceIds = new Set(input.memories.filter(Boolean).map(({ instanceId }) => instanceId));
        if (!isPlainObject(input.revivalMemory)
          || diagnosis.valid !== true
          || standardInstanceIds.has(input.revivalMemory.instanceId)) {
          issues.push(issue("hero-memory-revival-slot-invalid", "hero.revivalMemory"));
        }
      }
    }
  }
}

function validateHeroCompatibilityProjection(input, issues) {
  const selectedHeroId = Array.isArray(input?.selections?.hero)
    ? input.selections.hero.find((itemId) => typeof itemId === "string" && itemId)
    : null;
  const selectedHero = selectedHeroId ? findItemById(selectedHeroId) : null;
  const branchId = typeof input?.hero?.branchId === "string" && input.hero.branchId
    ? input.hero.branchId
    : null;
  if (
    (selectedHero?.categoryId === "hero" && branchId !== selectedHeroId)
    || (!selectedHeroId && branchId)
  ) {
    issues.push(issue("hero-selection-branch-mismatch", "hero.branchId"));
  }

  if (input?.heroLevel !== undefined) {
    const projectedLevel = Number(input.heroLevel);
    const nestedLevel = Number(input?.hero?.level);
    if (!Number.isInteger(projectedLevel) || projectedLevel !== nestedLevel) {
      issues.push(issue("hero-level-projection-mismatch", "heroLevel"));
    }
  }
}

function hasTalentPayload(input) {
  return (input?.boards ?? []).some((board) => (
    board?.treeSlug
      || Object.keys(board?.nodePoints ?? {}).length
      || Object.keys(board?.reflectedNodePoints ?? {}).length
      || board?.selectedNodeIds?.length
      || board?.coreTalentIds?.length
  )) || input?.prismInventory?.length || input?.inverseImageInventory?.length
    || input?.placedPrism || input?.placedInverseImage;
}

function validateTalents(input, context, issues) {
  if (!isPlainObject(input) || !Array.isArray(input.boards) || input.boards.length !== 4) {
    issues.push(issue("talent-state-invalid", "talents"));
    return;
  }
  if (!hasTalentPayload(input)) return;
  if (!context.talentModel) {
    issues.push(issue("validation-context-unavailable", "talents"));
    return;
  }
  if (diagnoseTalentBoardState(context.talentModel, input).valid !== true) {
    issues.push(issue("talent-state-invalid", "talents"));
  }
}

function isUnresolved(value) {
  return isPlainObject(value) && value.unresolved === true;
}

function validatePactRawInstances(input, model, issues) {
  for (const [slotIndex, slot] of input.slots.entries()) {
    if (slot?.spirit && !isUnresolved(slot.spirit)
      && diagnosePactSpiritInstance(model, slot.spirit).valid !== true) {
      issues.push(issue("pact-spirit-invalid", `pact.slots.${slotIndex}.spirit`));
    }
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      const instance = slot?.rings?.[ringSlotId]?.installedDestiny;
      if (instance && !isUnresolved(instance)
        && diagnoseDestinyInstance(model, instance, getPactRingSlotType(ringSlotId)).valid !== true) {
        issues.push(issue("pact-destiny-invalid", `pact.slots.${slotIndex}.rings`));
      }
    }
    if (slot?.undeterminedFate && !isUnresolved(slot.undeterminedFate)
      && diagnoseUndeterminedDestinyInstance(model, slot.undeterminedFate).valid !== true) {
      issues.push(issue("pact-undetermined-invalid", `pact.slots.${slotIndex}.undeterminedFate`));
    }
  }
}

function hasPactPayload(input) {
  return (input?.slots ?? []).some((slot) => (
    slot?.spirit
      || PACT_RING_SLOT_ORDER.some((ringSlotId) => slot?.rings?.[ringSlotId]?.installedDestiny)
      || slot?.undeterminedFate
  )) || input?.legacyUnassigned || input?.sourceOnlyDestinyIds?.length;
}

function validatePact(input, context, issues) {
  if (!isPlainObject(input) || !Array.isArray(input.slots) || input.slots.length !== 3) {
    issues.push(issue("pact-state-invalid", "pact"));
    return;
  }
  if (!hasPactPayload(input)) return;
  if (!context.pactModel) {
    issues.push(issue("validation-context-unavailable", "pact"));
    return;
  }
  validatePactRawInstances(input, context.pactModel, issues);
  const diagnosis = diagnosePactDestinyState(context.pactModel, input);
  const materialIssues = diagnosis.issues.filter((entry) => entry.code !== "legacy-pact-assignment-unresolved");
  if (materialIssues.length) issues.push(issue("pact-state-invalid", "pact"));
}

function comparableDivinityBoard(board) {
  // Cell order follows editing history; coordinates and ownership define the placement.
  return {
    ...board,
    cells: [...board.cells].sort((left, right) => left.x - right.x || left.y - right.y),
  };
}

function validateDivinity(input, issues) {
  if (!isPlainObject(input) || !Array.isArray(input.boards)) {
    issues.push(issue("divinity-state-invalid", "divinity"));
    return;
  }
  const boardIds = new Set();
  for (const board of input.boards) {
    try {
      const restored = importDivinitySlateBoard(board);
      if (boardIds.has(restored.boardId)) issues.push(issue("divinity-board-id-duplicate", "divinity.boards"));
      boardIds.add(restored.boardId);
      if (!Array.isArray(board.cells)
        || !sameJson(comparableDivinityBoard(restored), comparableDivinityBoard(board))) {
        issues.push(issue("divinity-board-invalid", "divinity.boards"));
      }
    } catch {
      issues.push(issue("divinity-board-invalid", "divinity.boards"));
    }
  }
  if (input.activeBoardId !== null && !boardIds.has(input.activeBoardId)) {
    issues.push(issue("divinity-active-board-invalid", "divinity.activeBoardId"));
  }
}

function validateConditions(input, issues) {
  if (!isPlainObject(input)) {
    issues.push(issue("conditions-invalid", "conditions"));
    return;
  }
  if (!Object.keys(input).length) return;
  const normalized = normalizeConditionState(input);
  if (!sameJson(normalized, input)) issues.push(issue("conditions-invalid", "conditions"));
}

function validateCurrentDocument(input, context) {
  const issues = [];
  const validBuildId = typeof input.id === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.id);
  if (!validBuildId || typeof input.name !== "string" || !input.name.trim()) {
    issues.push(issue("build-identity-invalid", "build"));
  }
  for (const field of CURRENT_REQUIRED_OBJECTS) {
    if (!isPlainObject(input[field])) issues.push(issue("build-section-invalid", field));
  }
  validateDocumentMetadata(input, issues);
  validateSelectionProjection(input.selections, context, issues, {
    allowExpandedTalentProjection: hasTalentPayload(input.talents),
  });
  if (isPlainObject(input.hero)) validateHero(input.hero, context, issues);
  validateHeroCompatibilityProjection(input, issues);
  if (isPlainObject(input.skills)) validateSkills(input.skills, input, context, issues);
  if (isPlainObject(input.gear)) validateGear(input.gear, issues);
  if (isPlainObject(input.talents)) validateTalents(input.talents, context, issues);
  if (isPlainObject(input.divinity)) validateDivinity(input.divinity, issues);
  if (isPlainObject(input.pact)) validatePact(input.pact, context, issues);
  validateConditions(input.conditions ?? {}, issues);
  return issues;
}

export function validateBuildImportText(text, context = {}) {
  if (typeof text !== "string") {
    return fail("invalid-json", [issue("json-invalid", "document")]);
  }
  const limitIssue = inspectJsonEnvelopeLimits(text);
  if (limitIssue) return fail("invalid-document", [limitIssue]);

  const jsonKeyInspection = inspectJsonObjectKeys(text);
  const jsonKeyIssues = [];
  if (jsonKeyInspection.duplicateKey) jsonKeyIssues.push(issue("json-duplicate-key", "document"));
  if (jsonKeyInspection.pollutionKey) jsonKeyIssues.push(issue("json-pollution-key", "document"));
  if (jsonKeyIssues.length) return fail("invalid-document", jsonKeyIssues);

  let input;
  try {
    input = JSON.parse(text);
  } catch {
    return fail("invalid-json", [issue("json-invalid", "document")]);
  }
  if (!jsonKeyInspection.scanComplete) {
    return fail("invalid-document", [issue("json-key-scan-incomplete", "document")]);
  }
  if (!isPlainObject(input) || Object.keys(input).length === 0) {
    return fail("invalid-document", [issue("document-shape-invalid", "document")]);
  }
  const externalDocument = inspect91TobBuildDocumentEnvelope(input);
  if (externalDocument.candidate) {
    const converted = convert91TobBuildDocument(input, context, createDefaultBuild("ko"));
    if (!converted.ok) return fail(converted.reason, converted.issues);
    if (!context.catalogByCategory || !context.skillModel) {
      return fail("context-unavailable", [issue("validation-context-unavailable", "validationContext")]);
    }
    const convertedIssues = validateCurrentDocument(converted.build, context);
    if (convertedIssues.some((entry) => entry.code === "validation-context-unavailable")) {
      return fail("context-unavailable", convertedIssues);
    }
    if (convertedIssues.length) return fail("semantic-invalid", convertedIssues);
    let candidate;
    try {
      candidate = normalizeBuild(converted.build);
    } catch {
      return fail("semantic-invalid", [issue("document-normalization-failed", "document")]);
    }
    const candidateIssues = validateCurrentDocument(candidate, context);
    if (candidateIssues.some((entry) => entry.code === "validation-context-unavailable")) {
      return fail("context-unavailable", candidateIssues);
    }
    if (candidateIssues.length) return fail("semantic-invalid", candidateIssues);
    return {
      ok: true,
      reason: null,
      issues: [],
      build: candidate,
      sourceFormat: converted.sourceFormat,
      mappedSections: converted.mappedSections,
      preservedSections: converted.preservedSections,
    };
  }
  const hasSchemaVersion = Object.hasOwn(input, "schemaVersion");
  if (hasSchemaVersion) {
    const version = input.schemaVersion;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      return fail("invalid-document", [issue("schema-version-invalid", "schemaVersion")]);
    }
    if (version > BUILD_DOCUMENT_SCHEMA_VERSION) {
      return fail("unsupported-schema-version", [issue("schema-version-unsupported", "schemaVersion")]);
    }
    if (version !== BUILD_DOCUMENT_SCHEMA_VERSION) {
      return fail("invalid-document", [issue("schema-version-invalid", "schemaVersion")]);
    }
  }

  if (!context.catalogByCategory || !context.skillModel) {
    return fail("context-unavailable", [issue("validation-context-unavailable", "validationContext")]);
  }

  if (!hasSchemaVersion) {
    if (!isPlainObject(input.selections) || Object.keys(input.selections).length === 0) {
      return fail("invalid-document", [issue("legacy-document-invalid", "document")]);
    }
    const legacyIssues = [];
    validateSelectionProjection(input.selections, context, legacyIssues);
    if (legacyIssues.length) return fail("semantic-invalid", legacyIssues);
    let candidate;
    try {
      candidate = normalizeBuild(input);
    } catch {
      return fail("semantic-invalid", [issue("document-normalization-failed", "document")]);
    }
    const candidateIssues = validateCurrentDocument(candidate, context);
    if (candidateIssues.some((entry) => entry.code === "validation-context-unavailable")) {
      return fail("context-unavailable", candidateIssues);
    }
    if (candidateIssues.length) return fail("semantic-invalid", candidateIssues);
    return { ok: true, reason: null, issues: [], build: candidate };
  }

  const issues = validateCurrentDocument(input, context);
  if (issues.some((entry) => entry.code === "validation-context-unavailable")) {
    return fail("context-unavailable", issues);
  }
  if (issues.length) return fail("semantic-invalid", issues);
  let candidate;
  try {
    candidate = normalizeBuild(input);
  } catch {
    return fail("semantic-invalid", [issue("document-normalization-failed", "document")]);
  }
  const candidateIssues = validateCurrentDocument(candidate, context);
  if (candidateIssues.some((entry) => entry.code === "validation-context-unavailable")) {
    return fail("context-unavailable", candidateIssues);
  }
  if (candidateIssues.length) return fail("semantic-invalid", candidateIssues);
  return { ok: true, reason: null, issues: [], build: candidate };
}
