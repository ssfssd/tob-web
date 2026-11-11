import {
  findHeroTraitBranch,
  normalizeHeroTraitState,
} from "./heroTraitModel.js";
import {
  diagnoseActiveHeroMemoryInstance,
  normalizeActiveHeroMemoryInstance,
} from "./activeHeroMemoryModel.js";
import { getHeroMemoryEnhancementProfile } from "./heroMemoryModel.js";
import {
  HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID,
  HERO_MEMORY_REVIVAL_SLOT_GROUP_IDS,
  diagnoseHeroMemoryRevivalSlotInstance,
  getHeroMemoryRevivalSlotEffect,
} from "./heroMemoryRevivalSlot.js";
import {
  createPactSpiritInstance,
  diagnosePactDestinyState,
} from "./pactDestinyModel.js";
import {
  export91TobOrdinaryPactDestiny,
  export91TobUndeterminedPactDestiny,
  has91TobOrdinaryPactDestinyPayload,
  has91TobUndeterminedPactDestinyPayload,
  import91TobOrdinaryPactDestinies,
  import91TobUndeterminedPactDestinies,
  tob91PactRingShapeValid,
  tob91PactUndeterminedFateShapeValid,
} from "./pact91tobInterop.js";
import {
  normalizeConditionState,
  resolveConditionValues,
} from "./conditionModel.js";
import {
  getSkillEnergyUsage,
  isModularizationSkill,
  normalizeSkillState,
  normalizeSupportRuntimeConfig,
} from "./skillRuntimeModel.js";
import { getIrisSpiritHeroMode } from "./irisSpiritSkillRuntime.js";
import {
  TOB91_ACTIVE_DEBUFF_KEYS as VERIFIED_ACTIVE_DEBUFF_KEYS,
  TOB91_BOOLEAN_DEBUFF_KEYS as VERIFIED_BOOLEAN_DEBUFF_KEYS,
  TOB91_DEBUFF_DISPLAY_KEYS as VERIFIED_DEBUFF_DISPLAY_KEYS,
  TOB91_DEBUFF_BOOLEAN_PATHS as VERIFIED_DEBUFF_BOOLEAN_PATHS,
  TOB91_ENEMY_DISTANCE_BANDS,
  TOB91_ENEMY_STATE_KEYS as VERIFIED_ENEMY_STATE_KEYS,
  TOB91_ETERNAL_STACK_KEYS as VERIFIED_ETERNAL_STACK_KEYS,
  TOB91_PLAYER_RESOURCE_KEYS as VERIFIED_PLAYER_RESOURCE_KEYS,
  TOB91_PLAYER_STATE_KEYS as VERIFIED_PLAYER_STATE_KEYS,
  TOB91_RECENT_COUNT_KEYS as VERIFIED_RECENT_COUNT_KEYS,
  TOB91_RECENT_FLAG_KEYS as VERIFIED_RECENT_FLAG_KEYS,
} from "./tob91CombatConditionSchema.js";
import { TOB91_ELIXIR_INTEROP_RECEIPT } from "./data/91tobElixirInterop.ss13_4.generated.js";
import {
  TOB91_MODULARIZATION_INTEROP_RECEIPT,
} from "./data/91tobModularizationInterop.ss13_4.generated.js";
import {
  TOB91_IRIS_SPIRIT_INTEROP_RECEIPT,
} from "./data/91tobIrisSpiritInterop.ss13_4.generated.js";
import {
  TOB91_HERO_MEMORY_MODIFIER_RECEIPT,
} from "./data/91tobHeroMemoryInterop.ss13_4.generated.js";
import {
  TOB91_DIVINITY_INTEROP_RECEIPT,
} from "./data/91tobDivinityInterop.ss13_4.generated.js";
import {
  TOB91_DESTINY_INTEROP_RECEIPT,
} from "./data/91tobDestinyInterop.ss13_4.generated.js";
import { TOB91_GEAR_INTEROP_RECEIPT } from "./data/91tobGearInterop.ss13_4.generated.js";
import { TOB91_TALENT_INTEROP_RECEIPT } from "./data/91tobTalentInterop.ss13_4.generated.js";
import {
  export91TobDivinitySection,
  import91TobDivinitySection,
} from "./divinity91tobInterop.js";
import {
  export91TobGearSection,
  has91TobGearPayload,
  import91TobGearSection,
  inspect91TobGearSection,
  tob91GearSectionShapeValid,
} from "./gear91tobInterop.js";
import {
  export91TobTalentSection,
  import91TobTalentSection,
  inspect91TobTalentSection,
  tob91TalentSectionShapeValid,
} from "./talent91tobInterop.js";

export const TOB91_BUILD_DOCUMENT_SCHEMA_VERSION = "bd_document_v1";
export const TOB91_BUILD_DOCUMENT_FORMAT = TOB91_BUILD_DOCUMENT_SCHEMA_VERSION;

const OBSERVED_TOP_LEVEL_FIELDS = Object.freeze([
  "schema_version",
  "meta",
  "module_versions",
  "character",
  "hero",
  "skills",
  "gear",
  "talents",
  "pactspirits",
  "divinity",
  "custom",
  "combat",
  "options",
  "extensions",
]);

const VERIFIED_TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "meta",
  "module_versions",
  "character",
  "hero",
  "skills",
  "gear",
  "talents",
  "divinity",
  "pactspirits",
  "combat",
  "custom",
  "options",
  "extensions",
]);

const VERIFIED_META_KEYS = Object.freeze([
  "build_id",
  "build_name",
  "client",
  "client_version",
  "engine_target",
  "exported_at",
  "notes",
]);
const VERIFIED_MODULE_KEYS = Object.freeze([
  "divinity_slate",
  "equipment",
  "hero_trait",
  "talent_board",
]);
const VERIFIED_PACT_SLOT_ORDER = TOB91_DESTINY_INTEROP_RECEIPT.slotOrder;
const VERIFIED_PACT_RING_KEYS = TOB91_DESTINY_INTEROP_RECEIPT.ringOrder;
const VERIFIED_ENEMY_DISTANCE_BANDS = new Set(TOB91_ENEMY_DISTANCE_BANDS);
const VERIFIED_CUSTOM_SOURCE_KEYS = Object.freeze([
  "enabled",
  "mod_texts",
  "source_id",
  "source_name",
]);
const VERIFIED_HERO_MEMORY_SLOTS = Object.freeze(["memory_1", "memory_2", "memory_3"]);
const VERIFIED_HERO_MEMORY_PROFIT_LOSS_PERCENT =
  TOB91_HERO_MEMORY_MODIFIER_RECEIPT.profitLossBaseAttributeModifierPercent;
const VERIFIED_91TOB_UNAVAILABLE_REVIVAL_GROUP_IDS = new Set([
  "memory-revival-revival-478b9909a2",
  "memory-revival-revival-0eaf9699a3",
  "memory-revival-moon-phase-ss13-500204600",
  "memory-revival-moon-phase-ss13-500204700",
]);
const VERIFIED_91TOB_UNAVAILABLE_REVIVAL_TIER_IDS = new Set([
  "memory-revival-revival-5efac9f230-ss13-500101701",
  "memory-revival-revival-4c19df79ff-ss13-500101801",
  "memory-revival-revival-b5ef9050b1-ss13-500101601",
  "memory-revival-revival-bab0f1a729-ss13-500101201",
  "memory-revival-revival-bab0f1a729-ss13-500101202",
  "memory-revival-revival-60c9a18e36-tier-1",
  "memory-revival-revival-60c9a18e36-tier-3",
]);
const VERIFIED_HERO_MEMORY_KEYS = Object.freeze([
  "affixes",
  "base_attribute",
  "catalog_slot_id",
  "enhancement_level",
  "fixed_affixes",
  "memory_id",
  "memory_type",
  "name",
  "quality",
  "random_affixes",
  "slot_id",
  "source_url",
  "trait_level_bonus",
]);
const VERIFIED_HERO_MEMORY_BASE_KEYS = Object.freeze([
  "enhancement_level",
  "group_id",
  "is_extrapolated",
  "source_tier_index",
  "text",
]);
const VERIFIED_HERO_MEMORY_AFFIX_KEYS = Object.freeze([
  "group_id",
  "render_template",
  "required_level",
  "roll_values",
  "text",
  "tier_id",
  "tier_index",
  "weight",
]);
const VERIFIED_HERO_MEMORY_REVIVAL_AFFIX_KEYS = Object.freeze([
  ...VERIFIED_HERO_MEMORY_AFFIX_KEYS,
  "preview_text",
  "source_url",
]);
const VERIFIED_HERO_MEMORY_REVIVAL_EFFECT_KEYS = Object.freeze([
  "max_quality",
  "slot_id",
  "target_catalog_slot_id",
  "target_memory_type",
  "value_modifier_percent",
]);
const VERIFIED_HERO_MEMORY_QUALITY_LABELS = Object.freeze({
  magic: "魔法",
  rare: "稀有",
  excellent: "卓越",
  supreme: "至臻",
});
export const TOB91_HERO_MEMORY_INTEROP_RECEIPT = Object.freeze({
  ...TOB91_HERO_MEMORY_MODIFIER_RECEIPT,
  revivalExtraSlotId: HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID,
  standardSlotIds: VERIFIED_HERO_MEMORY_SLOTS,
  derivedEffectGroupIds: HERO_MEMORY_REVIVAL_SLOT_GROUP_IDS,
  currentTlidbGroupsUnavailableInPublicDataset: Object.freeze([
    ...VERIFIED_91TOB_UNAVAILABLE_REVIVAL_GROUP_IDS,
  ]),
  currentTlidbTiersUnavailableInPublicDataset: Object.freeze([
    ...VERIFIED_91TOB_UNAVAILABLE_REVIVAL_TIER_IDS,
  ]),
});
const VERIFIED_UNLOCKED_SUPPORT_COUNTS = Object.freeze({
  "active-slot-1": 1,
  "active-slot-2": 1,
  "active-slot-3": 1,
  "active-slot-4": 1,
  "active-slot-5": 1,
  "passive-slot-1": 0,
  "passive-slot-2": 0,
  "passive-slot-3": 0,
  "passive-slot-4": 0,
});
const VERIFIED_91TOB_SUPPORT_KIND_BY_LOCAL_KIND = Object.freeze({
  regular: "support",
  activation: "activation_medium",
  magnificent: "magnificent",
  noble: "noble",
});
const VERIFIED_91TOB_SUPPORT_KINDS = new Set(
  Object.values(VERIFIED_91TOB_SUPPORT_KIND_BY_LOCAL_KIND),
);

const REQUIRED_OBJECT_SECTIONS = Object.freeze([
  "meta",
  "module_versions",
  "character",
  "hero",
  "skills",
  "gear",
  "talents",
  "divinity",
  "pactspirits",
  "combat",
  "custom",
  "options",
  "extensions",
]);

export const TOB91_BUILD_DOCUMENT_INTEROP = Object.freeze({
  format: TOB91_BUILD_DOCUMENT_FORMAT,
  schemaVersion: TOB91_BUILD_DOCUMENT_SCHEMA_VERSION,
  sourceArtifact: "https://91tob.com/assets/App-Bp8Ow0pk.js",
  publicImportPipeline: Object.freeze([
    "JSON.parse",
    "hm validation",
    "cOe compatibility",
    "up normalize",
    "B_ projection",
    "j_ build",
  ]),
  observedEnvelopeFields: OBSERVED_TOP_LEVEL_FIELDS,
  actualExportStructureVerified: true,
  actualExportFixtureVerified: false,
  heroMemoryInteropReceiptVerified: true,
  heroMemoryInteropReceipt: TOB91_HERO_MEMORY_INTEROP_RECEIPT,
  elixirIdentityReceiptVerified: true,
  elixirIdentityReceipt: TOB91_ELIXIR_INTEROP_RECEIPT,
  modularizationIdentityReceiptVerified: true,
  modularizationIdentityReceipt: TOB91_MODULARIZATION_INTEROP_RECEIPT,
  irisSpiritIdentityReceiptVerified: true,
  irisSpiritIdentityReceipt: TOB91_IRIS_SPIRIT_INTEROP_RECEIPT,
  divinityInteropReceiptVerified: true,
  divinityInteropReceipt: TOB91_DIVINITY_INTEROP_RECEIPT,
  destinyInteropReceiptVerified: true,
  destinyInteropReceipt: TOB91_DESTINY_INTEROP_RECEIPT,
  gearInteropReceiptVerified: true,
  gearInteropReceipt: TOB91_GEAR_INTEROP_RECEIPT,
  semanticComplete: false,
  importSupported: true,
  importCoverage: "verified-safe-subset",
  exportSupported: true,
  exportCoverage: "verified-safe-subset",
  blockReason: null,
});

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]));
  }
  return value;
}

function sameKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function allowedKeys(value, requiredKeys, optionalKeys = []) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  return requiredKeys.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function sameStringArray(value, expected) {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((entry, index) => entry === expected[index]);
}

function allStringFields(value, keys) {
  return isPlainObject(value) && keys.every((key) => typeof value[key] === "string");
}

function hadesDivinitySelectionShapeValid(value, { authority = false } = {}) {
  const required = ["enabled", "variant_id", "fixed_talent_ids", "imprint_talent_ids"];
  const optional = authority ? ["authority_talent_id"] : [];
  return allowedKeys(value, required, optional)
    && value.enabled === true
    && typeof value.variant_id === "string"
    && Boolean(value.variant_id)
    && Array.isArray(value.fixed_talent_ids)
    && value.fixed_talent_ids.length <= 2
    && value.fixed_talent_ids.every((id) => typeof id === "string" && Boolean(id))
    && Array.isArray(value.imprint_talent_ids)
    && value.imprint_talent_ids.length <= 3
    && value.imprint_talent_ids.every((id) => typeof id === "string" && Boolean(id))
    && (!authority
      || !Object.hasOwn(value, "authority_talent_id")
      || (typeof value.authority_talent_id === "string" && Boolean(value.authority_talent_id)));
}

function skillStateShapeValid(stateFlags) {
  return sameKeys(stateFlags, [
    "max_support_energy",
    "remaining_support_energy",
    "unlocked_support_count_by_slot_id",
    "used_support_energy",
  ])
    && Number.isSafeInteger(stateFlags.max_support_energy)
    && stateFlags.max_support_energy > 0
    && Number.isSafeInteger(stateFlags.remaining_support_energy)
    && stateFlags.remaining_support_energy >= 0
    && Number.isSafeInteger(stateFlags.used_support_energy)
    && stateFlags.used_support_energy >= 0
    && sameKeys(
      stateFlags.unlocked_support_count_by_slot_id,
      Object.keys(VERIFIED_UNLOCKED_SUPPORT_COUNTS),
    )
    && Object.values(stateFlags.unlocked_support_count_by_slot_id)
      .every((value) => Number.isInteger(value) && value >= 0 && value <= 5);
}

function modularizationRuntimeConfigShapeValid(config) {
  return allowedKeys(config, ["modularization_skill_id"], ["module_option_ids", "summon_count"])
    && typeof config.modularization_skill_id === "string"
    && Boolean(config.modularization_skill_id)
    && (!Object.hasOwn(config, "module_option_ids")
      || (Array.isArray(config.module_option_ids)
        && config.module_option_ids.length <= 3
        && config.module_option_ids.every((value) => typeof value === "string" && Boolean(value))))
    && (!Object.hasOwn(config, "summon_count")
      || (Number.isFinite(config.summon_count) && config.summon_count >= 0));
}

function skillRuntimeConfigShapeValid(config) {
  return allowedKeys(config, ["elixir_ingredient_ids"], ["modularization"])
    && Array.isArray(config.elixir_ingredient_ids)
    && config.elixir_ingredient_ids.every((value) => typeof value === "string")
    && (!Object.hasOwn(config, "modularization")
      || modularizationRuntimeConfigShapeValid(config.modularization));
}

function supportSkillRowShapeValid(row) {
  return allowedKeys(row, [
    "description",
    "effect_roll_overrides",
    "level",
    "role",
    "skill_id",
    "skill_name",
    "skill_types",
    "slot_id",
    "slot_index",
    "support_kind",
  ], [
    "activation_distance_meters",
    "activation_interval_seconds",
    "required_support_slot",
    "source_url",
    "special_level",
    "special_tier",
  ])
    && typeof row.description === "string"
    && isPlainObject(row.effect_roll_overrides)
    && Object.entries(row.effect_roll_overrides).every(([key, value]) => (
      Boolean(key.trim()) && Number.isFinite(value)
    ))
    && Number.isInteger(row.level)
    && row.level >= 1
    && row.level <= 21
    && row.role === "support"
    && typeof row.skill_id === "string"
    && Boolean(row.skill_id)
    && typeof row.skill_name === "string"
    && Boolean(row.skill_name)
    && Array.isArray(row.skill_types)
    && row.skill_types.every((value) => typeof value === "string")
    && typeof row.slot_id === "string"
    && Number.isInteger(row.slot_index)
    && row.slot_index >= 1
    && row.slot_index <= 5
    && typeof row.support_kind === "string"
    && (!Object.hasOwn(row, "activation_distance_meters")
      || Number.isFinite(row.activation_distance_meters))
    && (!Object.hasOwn(row, "activation_interval_seconds")
      || Number.isFinite(row.activation_interval_seconds))
    && (!Object.hasOwn(row, "required_support_slot")
      || (Number.isInteger(row.required_support_slot)
        && row.required_support_slot >= 1
        && row.required_support_slot <= 5))
    && (!Object.hasOwn(row, "source_url") || typeof row.source_url === "string")
    && (!Object.hasOwn(row, "special_level")
      || (Number.isInteger(row.special_level) && row.special_level >= 1 && row.special_level <= 5))
    && (!Object.hasOwn(row, "special_tier")
      || ["T0", "T1", "T2"].includes(row.special_tier));
}

function spiritHostSkillRowShapeValid(row) {
  return sameKeys(row, [
    "description",
    "level",
    "skill_id",
    "skill_name",
    "skill_types",
    "source_url",
    "support_skills",
  ])
    && typeof row.description === "string"
    && Number.isInteger(row.level)
    && row.level >= 1
    && row.level <= 21
    && typeof row.skill_id === "string"
    && Boolean(row.skill_id)
    && typeof row.skill_name === "string"
    && Boolean(row.skill_name)
    && Array.isArray(row.skill_types)
    && row.skill_types.every((value) => typeof value === "string")
    && typeof row.source_url === "string"
    && Boolean(row.source_url)
    && Array.isArray(row.support_skills)
    && row.support_skills.length <= 5
    && row.support_skills.every(supportSkillRowShapeValid);
}

function mainSkillRowShapeValid(row) {
  return allowedKeys(row, [
    "description",
    "level",
    "role",
    "skill_id",
    "skill_name",
    "skill_types",
    "slot_id",
    "slot_index",
    "support_skills",
  ], [
    "equipped",
    "runtime_config",
    "source_url",
    "spirit_host_skill",
  ])
    && typeof row.description === "string"
    && Number.isInteger(row.level)
    && row.level >= 1
    && row.level <= 21
    && (row.role === "active" || row.role === "passive")
    && typeof row.skill_id === "string"
    && Boolean(row.skill_id)
    && typeof row.skill_name === "string"
    && Boolean(row.skill_name)
    && Array.isArray(row.skill_types)
    && row.skill_types.every((value) => typeof value === "string")
    && typeof row.slot_id === "string"
    && Number.isInteger(row.slot_index)
    && row.slot_index >= 1
    && row.slot_index <= 5
    && Array.isArray(row.support_skills)
    && row.support_skills.length <= 5
    && row.support_skills.every(supportSkillRowShapeValid)
    && (!Object.hasOwn(row, "equipped") || typeof row.equipped === "boolean")
    && (!Object.hasOwn(row, "runtime_config") || skillRuntimeConfigShapeValid(row.runtime_config))
    && (!Object.hasOwn(row, "source_url") || typeof row.source_url === "string")
    && (!Object.hasOwn(row, "spirit_host_skill")
      || spiritHostSkillRowShapeValid(row.spirit_host_skill));
}

function pactSlotShapeValid(slot) {
  return allowedKeys(slot, ["level", "rings"], ["pactspirit_slug", "undetermined_fate"])
    && Number.isInteger(slot.level)
    && (!Object.hasOwn(slot, "pactspirit_slug") || typeof slot.pactspirit_slug === "string")
    && sameKeys(slot.rings, VERIFIED_PACT_RING_KEYS)
    && Object.values(slot.rings).every(tob91PactRingShapeValid)
    && (!Object.hasOwn(slot, "undetermined_fate")
      || tob91PactUndeterminedFateShapeValid(slot.undetermined_fate));
}

function selectedTraitNodeShapeValid(node) {
  return sameKeys(node, [
    "description",
    "option_id",
    "option_name",
    "required_level",
    "selection_key",
    "stage_level",
    "tier",
  ])
    && typeof node.description === "string"
    && typeof node.option_id === "string"
    && typeof node.option_name === "string"
    && Number.isInteger(node.required_level)
    && typeof node.selection_key === "string"
    && typeof node.stage_level === "string"
    && Number.isInteger(node.tier);
}

function optionalBooleanFieldsShapeValid(value, allowed) {
  return isPlainObject(value)
    && Object.keys(value).length > 0
    && Object.keys(value).every((key) => allowed.includes(key))
    && Object.values(value).every((entry) => typeof entry === "boolean");
}

function combatShapeValid(combat) {
  const player = combat?.player;
  const mechanics = player?.mechanics;
  const recent = player?.recent;
  const eternalStacks = mechanics?.eternal_stacks;
  const enemy = combat?.enemy;
  const debuffs = enemy?.debuffs;
  const recentKeys = [
    "has_moved_recently",
    "has_used_warcry_recently",
    "recent_move_distance_m",
  ];
  const recentShapeValid = allowedKeys(
    recent,
    recentKeys,
    [...VERIFIED_RECENT_COUNT_KEYS, ...VERIFIED_RECENT_FLAG_KEYS],
  )
    && typeof recent.has_moved_recently === "boolean"
    && typeof recent.has_used_warcry_recently === "boolean"
    && Number.isFinite(recent.recent_move_distance_m)
    && recent.recent_move_distance_m >= 0
    && recent.recent_move_distance_m <= Number.MAX_SAFE_INTEGER
    && VERIFIED_RECENT_COUNT_KEYS.every((key) => (
      !Object.hasOwn(recent, key)
      || (Number.isSafeInteger(recent[key]) && recent[key] > 0)
    ))
    && VERIFIED_RECENT_FLAG_KEYS.every((key) => (
      !Object.hasOwn(recent, key) || typeof recent[key] === "boolean"
    ));
  const playerStatesShapeValid = !Object.hasOwn(player ?? {}, "states")
    || optionalBooleanFieldsShapeValid(player.states, VERIFIED_PLAYER_STATE_KEYS);
  const playerResourcesShapeValid = !Object.hasOwn(player ?? {}, "resources")
    || optionalBooleanFieldsShapeValid(player.resources, VERIFIED_PLAYER_RESOURCE_KEYS);
  const debuffsShapeValid = debuffs === undefined || (
    allowedKeys(debuffs, [], [
      ...VERIFIED_ACTIVE_DEBUFF_KEYS,
      ...VERIFIED_BOOLEAN_DEBUFF_KEYS,
      "frostbite",
      "wither_stack_count",
      "paralysis_stacks",
    ])
    && VERIFIED_ACTIVE_DEBUFF_KEYS.every((key) => (
      !Object.hasOwn(debuffs, key)
      || (sameKeys(debuffs[key], ["active"])
        && typeof debuffs[key].active === "boolean")
    ))
    && VERIFIED_BOOLEAN_DEBUFF_KEYS.every((key) => (
      !Object.hasOwn(debuffs, key) || typeof debuffs[key] === "boolean"
    ))
    && (!Object.hasOwn(debuffs, "frostbite") || (
      allowedKeys(debuffs.frostbite, [], ["can_inflict", "is_frozen"])
      && Object.keys(debuffs.frostbite).length > 0
      && Object.values(debuffs.frostbite).every((value) => typeof value === "boolean")
    ))
    && (!Object.hasOwn(debuffs, "wither_stack_count") || (
      Number.isSafeInteger(debuffs.wither_stack_count) && debuffs.wither_stack_count > 0
    ))
    && (!Object.hasOwn(debuffs, "paralysis_stacks") || (
      Number.isSafeInteger(debuffs.paralysis_stacks)
      && debuffs.paralysis_stacks > 0
      && debuffs.paralysis_stacks <= 10
      && sameKeys(debuffs.numbed, ["active"])
      && debuffs.numbed.active === true
    ))
  );
  const enemyShapeValid = enemy === undefined || (
    allowedKeys(enemy, [], ["distance", "debuffs", ...VERIFIED_ENEMY_STATE_KEYS])
    && (!Object.hasOwn(enemy, "distance") || VERIFIED_ENEMY_DISTANCE_BANDS.has(enemy.distance))
    && VERIFIED_ENEMY_STATE_KEYS.every((key) => (
      !Object.hasOwn(enemy, key) || typeof enemy[key] === "boolean"
    ))
    && debuffsShapeValid
  );
  return allowedKeys(combat, ["player"], ["debug", "enemy"])
    && (!Object.hasOwn(combat, "debug") || sameKeys(combat.debug, []))
    && enemyShapeValid
    && allowedKeys(player, ["mechanics", "recent"], ["states", "resources"])
    && playerStatesShapeValid
    && playerResourcesShapeValid
    && sameKeys(mechanics, ["eternal_stacks"])
    && sameKeys(eternalStacks, VERIFIED_ETERNAL_STACK_KEYS)
    && Object.values(eternalStacks).every((value) => (
      Number.isSafeInteger(value) && value >= 0
    ))
    && recentShapeValid;
}

function observedSparseShapeIssues(input) {
  const issues = [];
  const add = (condition, code, path) => {
    if (!condition) issues.push(issue(code, path));
  };

  add(sameKeys(input, VERIFIED_TOP_LEVEL_KEYS), "91tob-top-level-shape-invalid", "document");
  add(
    sameKeys(input.meta, VERIFIED_META_KEYS)
      && allStringFields(input.meta, VERIFIED_META_KEYS)
      && validIsoTimestamp(input.meta.exported_at),
    "91tob-section-shape-invalid",
    "meta",
  );
  add(
    input.meta?.client === "fe-editor"
      && input.meta?.client_version === "0.1.0"
      && input.meta?.engine_target === "PythonSrc/Engine",
    "91tob-client-version-unsupported",
    "meta",
  );
  add(
    sameKeys(input.module_versions, VERIFIED_MODULE_KEYS)
      && VERIFIED_MODULE_KEYS.every((key) => input.module_versions[key] === "beta_0.6"),
    "91tob-module-version-unsupported",
    "module_versions",
  );
  add(
    sameKeys(input.character, ["level"]) && Number.isInteger(input.character.level),
    "91tob-section-shape-invalid",
    "character",
  );
  add(
    sameKeys(input.hero, [
      "memories_by_slot",
      "selected_hero_id",
      "selected_hero_name",
      "selected_trait_nodes",
      "selected_trait_option_ids_by_key",
    ])
      && isPlainObject(input.hero.memories_by_slot)
      && typeof input.hero.selected_hero_id === "string"
      && typeof input.hero.selected_hero_name === "string"
      && Array.isArray(input.hero.selected_trait_nodes)
      && input.hero.selected_trait_nodes.every(selectedTraitNodeShapeValid)
      && isPlainObject(input.hero.selected_trait_option_ids_by_key),
    "91tob-section-shape-invalid",
    "hero",
  );
  add(
    sameKeys(input.skills, ["active_skills", "core_skill", "passive_skills", "state_flags"])
      && Array.isArray(input.skills.active_skills)
      && input.skills.active_skills.length <= 4
      && input.skills.active_skills.every(mainSkillRowShapeValid)
      && Array.isArray(input.skills.passive_skills)
      && input.skills.passive_skills.length <= 4
      && input.skills.passive_skills.every(mainSkillRowShapeValid)
      && (input.skills.core_skill === null || mainSkillRowShapeValid(input.skills.core_skill))
      && skillStateShapeValid(input.skills.state_flags),
    "91tob-section-shape-invalid",
    "skills",
  );
  add(
    tob91GearSectionShapeValid(input.gear),
    "91tob-section-shape-invalid",
    "gear",
  );
  add(
    tob91TalentSectionShapeValid(input.talents),
    "91tob-section-shape-invalid",
    "talents",
  );
  add(
    allowedKeys(input.divinity, [
      "board_mask_version",
      "divinity_catalog_fingerprint",
      "inventory",
      "placed_slates",
      "preset_name",
      "resolved_affix_snapshot",
    ], [
      "hades_judgment",
      "hades_infusion",
      "hades_banishment",
    ])
      && typeof input.divinity.board_mask_version === "string"
      && typeof input.divinity.divinity_catalog_fingerprint === "string"
      && typeof input.divinity.preset_name === "string"
      && Array.isArray(input.divinity.inventory)
      && Array.isArray(input.divinity.placed_slates)
      && Array.isArray(input.divinity.resolved_affix_snapshot)
      && (!Object.hasOwn(input.divinity, "hades_judgment")
        || hadesDivinitySelectionShapeValid(input.divinity.hades_judgment))
      && (!Object.hasOwn(input.divinity, "hades_infusion")
        || hadesDivinitySelectionShapeValid(input.divinity.hades_infusion))
      && (!Object.hasOwn(input.divinity, "hades_banishment")
        || hadesDivinitySelectionShapeValid(input.divinity.hades_banishment, { authority: true })),
    "91tob-section-shape-invalid",
    "divinity",
  );
  add(
    sameKeys(input.pactspirits, [
      "destiny_catalog_fingerprint",
      "pactspirit_catalog_fingerprint",
      "slot_order",
      "slots",
    ])
      && typeof input.pactspirits.destiny_catalog_fingerprint === "string"
      && typeof input.pactspirits.pactspirit_catalog_fingerprint === "string"
      && sameStringArray(input.pactspirits.slot_order, VERIFIED_PACT_SLOT_ORDER)
      && sameKeys(input.pactspirits.slots, VERIFIED_PACT_SLOT_ORDER)
      && Object.values(input.pactspirits.slots).every(pactSlotShapeValid),
    "91tob-section-shape-invalid",
    "pactspirits",
  );
  add(combatShapeValid(input.combat), "91tob-section-shape-invalid", "combat");
  add(
    sameKeys(input.custom, ["sources"]) && Array.isArray(input.custom.sources),
    "91tob-section-shape-invalid",
    "custom",
  );
  add(
    sameKeys(input.options, ["skill_panels"]) && isPlainObject(input.options.skill_panels),
    "91tob-section-shape-invalid",
    "options",
  );
  add(isPlainObject(input.extensions), "91tob-section-shape-invalid", "extensions");
  return issues;
}

function issue(code, path) {
  return Object.freeze({ code, path });
}

function inspectionResult({
  candidate,
  envelopeValid = false,
  schemaVerified = false,
  reason = null,
  issues = [],
}) {
  return Object.freeze({
    candidate,
    format: candidate ? TOB91_BUILD_DOCUMENT_FORMAT : null,
    envelopeValid,
    schemaVerified,
    semanticVerified: false,
    importSupported: envelopeValid && schemaVerified,
    reason,
    issues: Object.freeze(issues),
  });
}

/**
 * Recognizes the real 91TOB export discriminator. Semantic support remains a
 * verified subset and is decided separately by convert91TobBuildDocument.
 */
export function inspect91TobBuildDocumentEnvelope(input) {
  if (!isPlainObject(input) || Object.hasOwn(input, "schemaVersion")) {
    return inspectionResult({ candidate: false, reason: "not-91tob-envelope" });
  }

  const meta = isPlainObject(input.meta) ? input.meta : null;
  const hasExternalVersion = Object.hasOwn(input, "schema_version");
  const hasLegacyEnvelopeMarker = Boolean(meta && Object.hasOwn(meta, "build_id"));
  if (!hasExternalVersion && !hasLegacyEnvelopeMarker) {
    return inspectionResult({ candidate: false, reason: "not-91tob-envelope" });
  }

  if (!hasExternalVersion) {
    return inspectionResult({
      candidate: true,
      reason: "schema-version-missing",
      issues: [issue("91tob-schema-version-missing", "schema_version")],
    });
  }

  if (input.schema_version !== TOB91_BUILD_DOCUMENT_SCHEMA_VERSION) {
    return inspectionResult({
      candidate: true,
      reason: "unsupported-schema-version",
      issues: [issue("91tob-schema-version-unsupported", "schema_version")],
    });
  }

  const buildIdValid = typeof meta?.build_id === "string" && meta.build_id.trim().length > 0;
  if (!buildIdValid) {
    return inspectionResult({
      candidate: true,
      schemaVerified: true,
      reason: "invalid-export-envelope",
      issues: [issue("91tob-envelope-invalid", "meta.build_id")],
    });
  }

  return inspectionResult({
    candidate: true,
    envelopeValid: true,
    schemaVerified: true,
  });
}

function meaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(meaningfulValue);
  if (isPlainObject(value)) return Object.values(value).some(meaningfulValue);
  return false;
}

function hasSkillPayload(skills) {
  return (Array.isArray(skills?.active_skills) && skills.active_skills.length > 0)
    || (Array.isArray(skills?.passive_skills) && skills.passive_skills.length > 0)
    || skills?.core_skill != null;
}

function hasDivinityPayload(divinity) {
  return (Array.isArray(divinity?.inventory) && divinity.inventory.length > 0)
    || (Array.isArray(divinity?.placed_slates) && divinity.placed_slates.length > 0)
    || (Array.isArray(divinity?.resolved_affix_snapshot)
      && divinity.resolved_affix_snapshot.length > 0)
    || ["hades_judgment", "hades_infusion", "hades_banishment"]
      .some((key) => Object.hasOwn(divinity ?? {}, key));
}

function skillStateMatchesSparseDefaults(stateFlags) {
  return stateFlags.max_support_energy === 525
    && stateFlags.used_support_energy === 0
    && stateFlags.remaining_support_energy === 525
    && Object.entries(VERIFIED_UNLOCKED_SUPPORT_COUNTS).every(([slotId, expected]) => (
      stateFlags.unlocked_support_count_by_slot_id[slotId] === expected
  ));
}

function sourceMainSkillRows(skills) {
  return [
    ...(skills?.core_skill ? [{ row: skills.core_skill, path: "skills.core_skill" }] : []),
    ...(skills?.active_skills ?? []).map((row, index) => ({
      row,
      path: `skills.active_skills[${index}]`,
    })),
    ...(skills?.passive_skills ?? []).map((row, index) => ({
      row,
      path: `skills.passive_skills[${index}]`,
    })),
  ];
}

function verifiedCustomAffixLines(custom) {
  const sources = custom?.sources;
  if (!Array.isArray(sources) || sources.length !== 1) return null;
  const source = sources[0];
  if (!sameKeys(source, VERIFIED_CUSTOM_SOURCE_KEYS)
    || source.source_id !== "user_custom"
    || source.source_name !== "自定义词条"
    || source.enabled !== true
    || !Array.isArray(source.mod_texts)
    || source.mod_texts.length === 0
    || source.mod_texts.some((line) => (
      typeof line !== "string"
      || !line
      || line !== line.trim()
      || /[\r\n]/u.test(line)
    ))) {
    return null;
  }
  return [...source.mod_texts];
}

function unsupportedGameplayIssues(input, context) {
  const issues = [];
  for (const { row, path } of sourceMainSkillRows(input.skills)) {
    if (row.equipped !== true) {
      issues.push(issue("91tob-skill-equipped-state-unavailable", path));
      break;
    }
  }
  if (sourceMainSkillRows(input.skills).some(({ row }) => (
    row.support_skills.some((support) => !VERIFIED_91TOB_SUPPORT_KINDS.has(support.support_kind))
  ))) {
    issues.push(issue("91tob-support-kind-mapping-unavailable", "skills"));
  }
  if (has91TobGearPayload(input.gear)
    && inspect91TobGearSection(input.gear).status === "unsupported") {
    issues.push(issue("91tob-gear-mapping-unavailable", "gear"));
  }
  if (inspect91TobTalentSection(input.talents, context?.talentModel).status === "unsupported") {
    issues.push(issue("91tob-talent-mapping-unavailable", "talents"));
  }
  if (isPlainObject(input.pactspirits?.slots)
    && Object.values(input.pactspirits.slots).some((slot) => (
      !slot.pactspirit_slug && slot.level !== 1
    ))) {
    issues.push(issue("91tob-pact-empty-slot-state-unavailable", "pactspirits.slots"));
  }
  if (Array.isArray(input.custom?.sources)
    && input.custom.sources.length > 0
    && !verifiedCustomAffixLines(input.custom)) {
    issues.push(issue("91tob-custom-source-mapping-unavailable", "custom.sources"));
  }
  if (isPlainObject(input.options?.skill_panels)
    && Object.keys(input.options.skill_panels).length > 0) {
    issues.push(issue("91tob-option-mapping-unavailable", "options"));
  }
  if (isPlainObject(input.extensions) && Object.keys(input.extensions).length > 0) {
    issues.push(issue("91tob-extension-mapping-unavailable", "extensions"));
  }
  return issues;
}

function sameSerializableValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameSerializableValue(value, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => (
      key === rightKeys[index]
      && sameSerializableValue(left[key], right[key])
    ));
}

function tob91CatalogId(record, role = record?.role) {
  if (typeof record?.tob91SourceId === "string" && record.tob91SourceId) {
    return record.tob91SourceId;
  }
  const sourceUrl = String(record?.url ?? "").trim();
  const name = String(record?.name ?? "").trim();
  const identity = sourceUrl.includes("/ss13pn")
    ? `${sourceUrl}#skill=${name}`
    : sourceUrl || name;
  return identity && role ? `${role}:${encodeURIComponent(identity)}` : "";
}

function tob91CatalogById(records, role) {
  const result = new Map();
  for (const record of records ?? []) {
    const sourceId = tob91CatalogId(record, role);
    if (!sourceId) continue;
    result.set(sourceId, [...(result.get(sourceId) ?? []), record]);
  }
  return result;
}

function sourceRowMatchesRecord(row, record) {
  const sourceUrl = String(record?.url ?? "");
  return row.skill_name === record?.name
    && (sourceUrl
      ? row.source_url === sourceUrl
      : !Object.hasOwn(row, "source_url"));
}

function mappedSupportConfig(row, support, issues, path) {
  const input = {
    effectRollOverrides: cloneJson(row.effect_roll_overrides),
    ...(Object.hasOwn(row, "special_tier") ? { specialTier: row.special_tier } : {}),
    ...(Object.hasOwn(row, "special_level") ? { specialLevel: row.special_level } : {}),
    ...(Object.hasOwn(row, "activation_interval_seconds")
      ? { activationIntervalSeconds: row.activation_interval_seconds }
      : {}),
    ...(Object.hasOwn(row, "activation_distance_meters")
      ? { activationDistanceMeters: row.activation_distance_meters }
      : {}),
  };
  const normalized = normalizeSupportRuntimeConfig(input, support);
  const expected = {
    ...(normalized ?? {}),
    effectRollOverrides: normalized?.effectRollOverrides ?? {},
  };
  if (!sameSerializableValue(input, expected)) {
    issues.push(issue("91tob-support-config-invalid", path));
    return undefined;
  }
  return normalized;
}

function mapSupportSkills(row, hostSlot, supportById, issues, path) {
  const supports = Array(5).fill(null);
  const seenIndexes = new Set();
  for (const [sourceIndex, sourceSupport] of row.support_skills.entries()) {
    const supportPath = `${path}.support_skills[${sourceIndex}]`;
    const slotIndex = sourceSupport.slot_index;
    if (sourceSupport.slot_id !== `${row.slot_id}:support:${slotIndex}`
      || seenIndexes.has(slotIndex)
      || slotIndex > hostSlot.unlockedSupportCount) {
      issues.push(issue("91tob-support-slot-invalid", supportPath));
      continue;
    }
    seenIndexes.add(slotIndex);
    const matches = (supportById.get(sourceSupport.skill_id) ?? [])
      .filter((record) => sourceRowMatchesRecord(sourceSupport, record));
    if (matches.length !== 1) {
      issues.push(issue("91tob-support-id-unresolved", supportPath));
      continue;
    }
    const support = matches[0];
    const expectedKind = VERIFIED_91TOB_SUPPORT_KIND_BY_LOCAL_KIND[support.supportKind];
    const expectedRequiredSlot = Number.isInteger(support.requiredSlot)
      ? support.requiredSlot
      : null;
    const sourceRequiredSlot = Object.hasOwn(sourceSupport, "required_support_slot")
      ? sourceSupport.required_support_slot
      : null;
    if (sourceSupport.support_kind !== expectedKind
      || sourceRequiredSlot !== expectedRequiredSlot
      || sourceSupport.level > Number(support.maxLevel ?? 21)) {
      issues.push(issue("91tob-support-metadata-invalid", supportPath));
      continue;
    }
    const config = mappedSupportConfig(sourceSupport, support, issues, supportPath);
    supports[slotIndex - 1] = {
      supportId: support.id,
      level: sourceSupport.level,
      ...(config ? { config } : {}),
    };
  }
  return supports;
}

function resolveModularizationMainSkill(row, model, issues, path, receipts) {
  const receipt = TOB91_MODULARIZATION_INTEROP_RECEIPT;
  const runtimeConfig = row.runtime_config;
  const modularization = runtimeConfig?.modularization;
  const directMappings = receipt.skills.filter(({ sourceSkillId }) => sourceSkillId === row.skill_id);
  const legacyRoot = row.skill_id === receipt.rootSkill.sourceSkillId;
  if (!modularization && directMappings.length === 0 && !legacyRoot) {
    return { handled: false, skill: null, config: null, mappedPaths: [] };
  }
  if (!isPlainObject(modularization)) {
    issues.push(issue("91tob-modularization-config-invalid", path));
    return { handled: true, skill: null, config: null, mappedPaths: [] };
  }

  const mappings = directMappings.length
    ? directMappings.filter(({ sourceModularizationSkillId }) => (
      sourceModularizationSkillId === modularization.modularization_skill_id
    ))
    : receipt.skills.filter(({ sourceModularizationSkillId }) => (
      legacyRoot && sourceModularizationSkillId === modularization.modularization_skill_id
    ));
  if (mappings.length !== 1
    || runtimeConfig.elixir_ingredient_ids.length !== 0
    || row.role !== "active"
    || row.skill_name !== receipt.rootSkill.sourceName
    || row.source_url !== receipt.rootSkill.sourceUrl) {
    issues.push(issue("91tob-modularization-config-invalid", path));
    return { handled: true, skill: null, config: null, mappedPaths: [] };
  }

  const mapping = mappings[0];
  const localSkills = model.active.filter((skill) => (
    skill.id === mapping.localMainSkillId
    && skill.raw?.id === mapping.sourceModularizationSkillId
    && skill.url === receipt.rootSkill.sourceUrl
    && isModularizationSkill(skill)
  ));
  if (localSkills.length !== 1) {
    issues.push(issue("91tob-modularization-identity-receipt-mismatch", path));
    return { handled: true, skill: null, config: null, mappedPaths: [] };
  }

  const moduleOptionIds = modularization.module_option_ids ?? [];
  const optionReceiptById = new Map(receipt.options.map((option) => [
    option.sourceModuleOptionId,
    option,
  ]));
  const localOptionBySourceId = new Map((model.supports?.modular ?? []).map((support) => [
    support.raw?.id,
    support,
  ]));
  if (new Set(moduleOptionIds).size !== moduleOptionIds.length
    || moduleOptionIds.length > receipt.moduleOptionLimit
    || moduleOptionIds.some((sourceId) => {
      const optionReceipt = optionReceiptById.get(sourceId);
      const localOption = localOptionBySourceId.get(sourceId);
      return !optionReceipt
        || !localOption
        || localOption.id !== optionReceipt.localSupportId
        || localOption.supportKind !== "modular";
    })) {
    issues.push(issue("91tob-modularization-option-invalid", path));
    return { handled: true, skill: null, config: null, mappedPaths: [] };
  }

  const config = {
    modularizationSkillId: mapping.sourceModularizationSkillId,
    moduleOptionIds: [...moduleOptionIds],
    ...(Object.hasOwn(modularization, "summon_count")
      ? { summonCount: modularization.summon_count }
      : {}),
  };
  receipts.push({
    sourcePath: path,
    sourceSkillId: row.skill_id,
    sourceModularizationSkillId: mapping.sourceModularizationSkillId,
    localMainSkillId: localSkills[0].id,
    moduleOptionIds: [...moduleOptionIds],
  });
  return {
    handled: true,
    skill: localSkills[0],
    config,
    mappedPaths: [
      `${path}.runtime_config.modularization.modularization_skill_id`,
      ...(Object.hasOwn(modularization, "module_option_ids")
        ? [`${path}.runtime_config.modularization.module_option_ids`]
        : []),
      ...(Object.hasOwn(modularization, "summon_count")
        ? [`${path}.runtime_config.modularization.summon_count`]
        : []),
    ],
  };
}

function mapElixirConfig(row, skill, skillState, model, issues, path, receipts) {
  const identityMappings = TOB91_ELIXIR_INTEROP_RECEIPT.skills.filter((candidate) => (
    candidate.sourceSkillId === row.skill_id
  ));
  const bottleMappings = TOB91_ELIXIR_INTEROP_RECEIPT.bottleMappings.filter((candidate) => (
    candidate.sourceSlotId === row.slot_id && candidate.sourceSlotIndex === row.slot_index
  ));
  const hasRuntimeConfig = Object.hasOwn(row, "runtime_config");
  if (identityMappings.length === 0) {
    if (hasRuntimeConfig && !Object.hasOwn(row.runtime_config, "modularization")) {
      issues.push(issue("91tob-elixir-config-invalid", path));
    }
    return [];
  }
  if (identityMappings.length !== 1
    || bottleMappings.length !== 1
    || !TOB91_ELIXIR_INTEROP_RECEIPT.skillAllowedSourceSlotIds.includes(row.slot_id)
    || !hasRuntimeConfig) {
    issues.push(issue("91tob-elixir-config-invalid", path));
    return [];
  }

  const identity = identityMappings[0];
  const bottleMapping = bottleMappings[0];
  const bottles = model.elixir.bottles.filter(({ id }) => id === bottleMapping.localBottleId);
  const elixirSkills = model.elixir.skills.filter(({ id }) => id === identity.localElixirSkillId);
  const bottle = bottles[0];
  const elixirSkill = elixirSkills[0];
  const bottleIndex = model.elixir.bottles.indexOf(bottle);
  if (bottles.length !== 1
    || elixirSkills.length !== 1
    || bottle.slotId !== bottleMapping.sourceSlotId
    || bottle.baseIngredientCapacity !== bottleMapping.ingredientCapacity
    || skill.id !== identity.localMainSkillId
    || skill.url !== identity.sourceUrl
    || !elixirSkill
    || elixirSkill.url !== identity.sourceUrl) {
    issues.push(issue("91tob-elixir-identity-receipt-mismatch", path));
    return [];
  }
  const ingredientIds = row.runtime_config.elixir_ingredient_ids;
  const ingredientById = new Map(model.elixir.ingredients.map((ingredient) => [
    ingredient.id,
    ingredient,
  ]));
  const uniqueIngredientIds = new Set(ingredientIds);
  if (uniqueIngredientIds.size !== ingredientIds.length
    || ingredientIds.length > bottle.baseIngredientCapacity
    || ingredientIds.some((ingredientId) => (
      !ingredientById.get(ingredientId)?.allowedBottleIds.includes(bottle.id)
    ))) {
    issues.push(issue("91tob-elixir-config-invalid", path));
    return [];
  }

  skillState.elixirs[bottleIndex] = {
    bottleId: bottle.id,
    skillId: elixirSkill.id,
    ingredientIds: [...ingredientIds],
  };
  receipts.push({
    sourcePath: path,
    sourceSkillId: row.skill_id,
    sourceSlotId: row.slot_id,
    sourceSlotIndex: row.slot_index,
    localMainSkillId: skill.id,
    localElixirSkillId: elixirSkill.id,
    localBottleId: bottle.id,
  });
  return [
    `${path}.slot_id`,
    `${path}.slot_index`,
    `${path}.runtime_config.elixir_ingredient_ids`,
  ];
}

function resolveIrisSpiritSkillRow(
  row,
  skill,
  model,
  heroIdentifier,
  issues,
  path,
  receipts,
) {
  const mode = getIrisSpiritHeroMode(heroIdentifier);
  const directIdentities = TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.directActiveSkills.filter((identity) => (
    identity.sourceSkillId === row.skill_id
      && identity.localActiveSkillId === skill.id
      && identity.sourceName === row.skill_name
      && identity.sourceUrl === row.source_url
  ));
  if (directIdentities.length > 0 || skill.irisSpiritActive === true) {
    if (mode !== "growing-breeze"
      || directIdentities.length !== 1
      || skill.irisSpiritActive !== true
      || Object.hasOwn(row, "spirit_host_skill")) {
      issues.push(issue("91tob-iris-spirit-config-invalid", path));
      return { valid: false, supportRow: row, supportPath: path, spiritHost: null };
    }
    const identity = directIdentities[0];
    receipts.push({
      sourcePath: path,
      kind: "direct-active",
      sourceSkillId: identity.sourceSkillId,
      localActiveSkillId: skill.id,
    });
    return { valid: true, supportRow: row, supportPath: path, spiritHost: null };
  }

  const mappings = TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.mappings.filter((mapping) => (
    mapping.sourceActiveSkillId === row.skill_id
      && mapping.localActiveSkillId === skill.id
      && mapping.sourceActiveName === row.skill_name
      && mapping.sourceActiveUrl === row.source_url
  ));
  if (!mode || mappings.length === 0) {
    if (Object.hasOwn(row, "spirit_host_skill")) {
      issues.push(issue("91tob-iris-spirit-config-invalid", path));
      return { valid: false, supportRow: row, supportPath: path, spiritHost: null };
    }
    return { valid: true, supportRow: row, supportPath: path, spiritHost: null };
  }
  if (mappings.length !== 1 || !Object.hasOwn(row, "spirit_host_skill")) {
    issues.push(issue("91tob-iris-spirit-config-invalid", path));
    return { valid: false, supportRow: row, supportPath: path, spiritHost: null };
  }

  const mapping = mappings[0];
  const nested = row.spirit_host_skill;
  const hosts = model.passive.filter((record) => (
    record.id === mapping.localSpiritHostSkillId
      && record.name === mapping.sourceSpiritHostName
      && record.url === mapping.sourceSpiritHostUrl
  ));
  const host = hosts[0];
  if (hosts.length !== 1
    || row.support_skills.length !== 0
    || nested.skill_id !== mapping.sourceSpiritHostSkillId
    || nested.skill_name !== mapping.sourceSpiritHostName
    || nested.source_url !== mapping.sourceSpiritHostUrl
    || nested.level !== row.level
    || nested.description !== (typeof host?.description === "string" ? host.description : "")
    || !sameStringArray(nested.skill_types, host?.tags ?? [])) {
    issues.push(issue("91tob-iris-spirit-config-invalid", path));
    return { valid: false, supportRow: row, supportPath: path, spiritHost: null };
  }
  receipts.push({
    sourcePath: path,
    kind: "nested-host",
    sourceSkillId: mapping.sourceActiveSkillId,
    sourceSpiritHostSkillId: mapping.sourceSpiritHostSkillId,
    localActiveSkillId: skill.id,
    localSpiritHostSkillId: host.id,
  });
  return {
    valid: true,
    supportRow: {
      slot_id: row.slot_id,
      support_skills: nested.support_skills,
    },
    supportPath: `${path}.spirit_host_skill`,
    spiritHost: {
      skillId: host.id,
      shared: mode === "vigilant-breeze",
    },
  };
}

function mapSkills(
  input,
  build,
  context,
  issues,
  mappedPaths,
  elixirReceipts,
  modularizationReceipts,
  irisSpiritReceipts,
) {
  const sourceHasPayload = hasSkillPayload(input.skills);
  const stateHasPayload = !skillStateMatchesSparseDefaults(input.skills.state_flags);
  if (!sourceHasPayload && !stateHasPayload) return false;
  if (!context.skillModel) {
    issues.push(issue("validation-context-unavailable", "skills"));
    return false;
  }

  const unlocked = input.skills.state_flags.unlocked_support_count_by_slot_id;
  const skillState = {
    active: build.skills.active.map((slot, index) => ({
      ...cloneJson(slot),
      skillId: null,
      level: 20,
      unlockedSupportCount: unlocked[`active-slot-${index + 1}`],
      supports: Array(5).fill(null),
      sealedLife: 0,
      sealedMana: 0,
    })),
    passive: build.skills.passive.map((slot, index) => ({
      ...cloneJson(slot),
      skillId: null,
      level: 20,
      unlockedSupportCount: unlocked[`passive-slot-${index + 1}`],
      supports: Array(5).fill(null),
      sealedLife: 0,
      sealedMana: 0,
    })),
    energyMax: input.skills.state_flags.max_support_energy,
    elixirs: context.skillModel.elixir.bottles.map(() => null),
  };
  const activeById = tob91CatalogById([
    ...context.skillModel.active,
    ...(context.skillModel.irisSpiritActive ?? []),
  ], "active");
  const passiveById = tob91CatalogById(context.skillModel.passive, "passive");
  const supportById = tob91CatalogById(context.skillModel.allSupports, "support");
  const occupiedSlots = new Set();

  for (const { row, path } of sourceMainSkillRows(input.skills)) {
    let collection;
    let rowIndex;
    let expectedRole;
    if (path === "skills.core_skill") {
      collection = "active";
      rowIndex = 0;
      expectedRole = "active";
      if (row.slot_id !== "active-slot-1" || row.slot_index !== 1) {
        issues.push(issue("91tob-main-skill-slot-invalid", path));
        continue;
      }
    } else if (path.startsWith("skills.active_skills")) {
      const match = /^active-slot-([2-5])$/u.exec(row.slot_id);
      collection = "active";
      rowIndex = match ? Number(match[1]) - 1 : -1;
      expectedRole = "active";
      if (!match || row.slot_index !== Number(match[1])) {
        issues.push(issue("91tob-main-skill-slot-invalid", path));
        continue;
      }
    } else {
      const match = /^passive-slot-([1-4])$/u.exec(row.slot_id);
      collection = "passive";
      rowIndex = match ? Number(match[1]) - 1 : -1;
      expectedRole = "passive";
      if (!match || row.slot_index !== Number(match[1])) {
        issues.push(issue("91tob-main-skill-slot-invalid", path));
        continue;
      }
    }
    const occupiedKey = `${collection}:${rowIndex}`;
    if (occupiedSlots.has(occupiedKey) || row.role !== expectedRole) {
      issues.push(issue("91tob-main-skill-slot-invalid", path));
      continue;
    }
    occupiedSlots.add(occupiedKey);
    const modularizationResult = resolveModularizationMainSkill(
      row,
      context.skillModel,
      issues,
      path,
      modularizationReceipts,
    );
    const catalog = collection === "active" ? activeById : passiveById;
    const matches = modularizationResult.handled
      ? modularizationResult.skill ? [modularizationResult.skill] : []
      : (catalog.get(row.skill_id) ?? []).filter((record) => sourceRowMatchesRecord(row, record));
    if (matches.length !== 1) {
      if (modularizationResult.handled) continue;
      issues.push(issue("91tob-main-skill-id-unresolved", path));
      continue;
    }
    if (expectedRole === "active" && row.level < 20) {
      issues.push(issue("91tob-main-skill-level-invalid", path));
      continue;
    }
    const target = skillState[collection][rowIndex];
    target.skillId = matches[0].id;
    target.level = row.level;
    if (expectedRole !== "active" && Object.hasOwn(row, "spirit_host_skill")) {
      issues.push(issue("91tob-iris-spirit-config-invalid", path));
      continue;
    }
    const irisSpiritResult = expectedRole === "active"
      ? resolveIrisSpiritSkillRow(
          row,
          matches[0],
          context.skillModel,
          build.hero?.branchId ?? build.selections?.hero?.[0] ?? "",
          issues,
          path,
          irisSpiritReceipts,
        )
      : { valid: true, supportRow: row, supportPath: path };
    if (!irisSpiritResult.valid) continue;
    target.supports = mapSupportSkills(
      irisSpiritResult.supportRow,
      target,
      supportById,
      issues,
      irisSpiritResult.supportPath,
    );
    if (irisSpiritResult.spiritHost) target.spiritHost = irisSpiritResult.spiritHost;
    if (modularizationResult.config) target.modularization = modularizationResult.config;
    const elixirMappedPaths = mapElixirConfig(
      row,
      matches[0],
      skillState,
      context.skillModel,
      issues,
      path,
      elixirReceipts,
    );
    mappedPaths.push(
      `${path}.skill_id`,
      `${path}.level`,
      ...modularizationResult.mappedPaths,
      ...elixirMappedPaths,
      ...(irisSpiritResult.spiritHost ? [
        `${path}.spirit_host_skill.skill_id`,
        `${path}.spirit_host_skill.level`,
      ] : []),
      ...irisSpiritResult.supportRow.support_skills.flatMap((support, supportIndex) => [
        `${irisSpiritResult.supportPath}.support_skills[${supportIndex}].skill_id`,
        `${irisSpiritResult.supportPath}.support_skills[${supportIndex}].level`,
        `${irisSpiritResult.supportPath}.support_skills[${supportIndex}].effect_roll_overrides`,
      ]),
    );
  }

  const normalized = normalizeSkillState(context.skillModel, skillState, { build });
  const energy = getSkillEnergyUsage(normalized);
  if (!sameSerializableValue(skillState, normalized)) {
    issues.push(issue("91tob-skill-normalization-mismatch", "skills"));
  }
  if (input.skills.state_flags.max_support_energy <= 0
    || energy.maximum !== input.skills.state_flags.max_support_energy
    || energy.used !== input.skills.state_flags.used_support_energy
    || energy.remaining !== input.skills.state_flags.remaining_support_energy
    || energy.over > 0) {
    issues.push(issue("91tob-skill-energy-state-invalid", "skills.state_flags"));
  }
  if (issues.some((entry) => entry.path.startsWith("skills"))) return false;

  build.skills = {
    ...normalized,
    elixir: normalized.elixirs[0] ?? null,
  };
  mappedPaths.push(
    "skills.state_flags.max_support_energy",
    "skills.state_flags.used_support_energy",
    "skills.state_flags.remaining_support_energy",
    "skills.state_flags.unlocked_support_count_by_slot_id",
  );
  return true;
}

function mapCombatConditions(input, build, mappedPaths) {
  if (!meaningfulValue(input.combat)) return false;
  const recent = input.combat.player.recent;
  const eternalStacks = input.combat.player.mechanics.eternal_stacks;
  const conditions = normalizeConditionState(build.conditions);
  conditions.automatic.recent = {
    ...conditions.automatic.recent,
    moved: recent.has_moved_recently,
    usedWarcry: recent.has_used_warcry_recently,
    moveDistanceMeters: recent.recent_move_distance_m,
    ...(Object.hasOwn(recent, "recent_kill_stack")
      ? { killStack: recent.recent_kill_stack }
      : {}),
    ...(Object.hasOwn(recent, "recent_warcry_skill_use")
      ? { warcrySkillUseCount: recent.recent_warcry_skill_use }
      : {}),
    ...(Object.hasOwn(recent, "spell_burst_activated_recently")
      ? { spellBurstActivationCount: recent.spell_burst_activated_recently }
      : {}),
  };
  conditions.automatic.recentFlags = {
    ...conditions.automatic.recentFlags,
    ...Object.fromEntries(
      VERIFIED_RECENT_FLAG_KEYS
        .filter((key) => Object.hasOwn(recent, key))
        .map((key) => [key, recent[key]]),
    ),
  };
  if (input.combat.player.states) {
    conditions.automatic.playerStates = {
      ...conditions.automatic.playerStates,
      ...input.combat.player.states,
    };
  }
  if (input.combat.player.resources) {
    conditions.automatic.playerResources = {
      ...conditions.automatic.playerResources,
      ...input.combat.player.resources,
    };
  }
  conditions.automatic.heroStacks = {
    ...conditions.automatic.heroStacks,
    ...Object.fromEntries(
      VERIFIED_ETERNAL_STACK_KEYS.map((key) => [key, eternalStacks[key]]),
    ),
  };
  const enemy = input.combat.enemy;
  if (enemy) {
    conditions.automatic.enemy = {
      ...conditions.automatic.enemy,
      ...(Object.hasOwn(enemy, "distance") ? { distanceBand: enemy.distance } : {}),
      ...(Object.hasOwn(enemy.debuffs ?? {}, "wither_stack_count")
        ? { witherStacks: enemy.debuffs.wither_stack_count }
        : {}),
      ...(Object.hasOwn(enemy.debuffs ?? {}, "paralysis_stacks")
        ? { paralysisStacks: enemy.debuffs.paralysis_stacks }
        : {}),
    };
    conditions.automatic.enemyStates = {
      ...conditions.automatic.enemyStates,
      ...Object.fromEntries(
        VERIFIED_ENEMY_STATE_KEYS
          .filter((key) => Object.hasOwn(enemy, key))
          .map((key) => [key, enemy[key]]),
      ),
    };
    const mappedDebuffs = Object.fromEntries(
      VERIFIED_DEBUFF_BOOLEAN_PATHS.flatMap(([rootKey, nestedKey, targetKey]) => {
        if (!Object.hasOwn(enemy.debuffs ?? {}, rootKey)) return [];
        const source = enemy.debuffs[rootKey];
        if (nestedKey !== null && !Object.hasOwn(source, nestedKey)) return [];
        return [[targetKey, nestedKey === null ? source : source[nestedKey]]];
      }),
    );
    if (Object.keys(mappedDebuffs).length) {
      conditions.automatic.debuffs = {
        ...conditions.automatic.debuffs,
        ...mappedDebuffs,
      };
    }
  }
  build.conditions = normalizeConditionState(conditions);
  mappedPaths.push(
    "combat.player.recent.has_moved_recently",
    "combat.player.recent.has_used_warcry_recently",
    "combat.player.recent.recent_move_distance_m",
    "combat.player.mechanics.eternal_stacks",
  );
  for (const key of [...VERIFIED_RECENT_COUNT_KEYS, ...VERIFIED_RECENT_FLAG_KEYS]) {
    if (Object.hasOwn(recent, key)) mappedPaths.push(`combat.player.recent.${key}`);
  }
  if (input.combat.player.states) mappedPaths.push("combat.player.states");
  if (input.combat.player.resources) mappedPaths.push("combat.player.resources");
  if (input.combat.enemy) {
    if (Object.hasOwn(input.combat.enemy, "distance")) mappedPaths.push("combat.enemy.distance");
    if (input.combat.enemy.debuffs) mappedPaths.push("combat.enemy.debuffs");
    for (const key of VERIFIED_ENEMY_STATE_KEYS) {
      if (Object.hasOwn(input.combat.enemy, key)) mappedPaths.push(`combat.enemy.${key}`);
    }
  }
  return true;
}

function validIsoTimestamp(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function exactHeroBranch(model, sourceId) {
  if (typeof sourceId !== "string" || !sourceId) return null;
  const matches = (model?.branches ?? []).filter((branch) => (
    branch.rawId === sourceId || branch.flatHeroId === sourceId
  ));
  return matches.length === 1 ? matches[0] : null;
}

function exactHeroMemoryTypeBySlot(dataset, slotId) {
  const matches = (dataset?.memoryTypes ?? []).filter((memoryType) => memoryType.slotId === slotId);
  return matches.length === 1 ? matches[0] : null;
}

function exactHeroMemoryTypeForLocal(dataset, memoryTypeId) {
  const matches = (dataset?.memoryTypes ?? []).filter((memoryType) => (
    memoryType.slotId === memoryTypeId
    || memoryType.flatCatalogId === memoryTypeId
    || memoryType.legacySlotIds?.includes(memoryTypeId)
  ));
  return matches.length === 1 ? matches[0] : null;
}

function sourceHeroMemoryNumber(value, precision = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const fixed = number.toFixed(Math.max(0, Number(precision) || 0));
  return Number(precision) > 0 ? fixed.replace(/\.?0+$/u, "") : fixed;
}

function adjustSignedHeroMemoryText(text, modifierPercent) {
  if (modifierPercent == null || modifierPercent === 0) return String(text ?? "");
  return String(text ?? "").replace(/([+\-])(\d+(?:\.\d+)?)/gu, (match, sign, rawValue) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) return match;
    const precision = rawValue.includes(".") ? rawValue.split(".")[1].length : 0;
    const adjusted = Math.abs(numericValue * (1 + modifierPercent / 100));
    return `${sign}${sourceHeroMemoryNumber(adjusted, precision)}`;
  });
}

function sourceHeroMemoryAffixText(tier, rolls, modifierPercent) {
  if ((tier?.rollDefs ?? []).length > 0 && modifierPercent != null && modifierPercent !== 0) {
    const adjustedRolls = Object.fromEntries(tier.rollDefs.map((roll) => [
      roll.key,
      Number(rolls?.[roll.key]) * (1 + modifierPercent / 100),
    ]));
    if (Object.values(adjustedRolls).some((value) => !Number.isFinite(value))) return "";
    return String(tier?.renderTemplate ?? tier?.text ?? "").replace(
      /\{\{([^}]+)\}\}/gu,
      (_, key) => sourceHeroMemoryNumber(
        adjustedRolls[key],
        tier.rollDefs.find((roll) => roll.key === key)?.precision,
      ),
    );
  }
  const rendered = String(tier?.renderTemplate ?? tier?.text ?? "").replace(
    /\{\{([^}]+)\}\}/gu,
    (_, key) => String(rolls?.[key] ?? ""),
  );
  return adjustSignedHeroMemoryText(rendered, modifierPercent);
}

function sourceHeroMemoryBaseText(base, value, valueModifierPercent, baseModifierPercent) {
  if ((valueModifierPercent == null || valueModifierPercent === 0)
    && (baseModifierPercent == null || baseModifierPercent === 0)) return value?.text ?? "";
  const numericValue = Number(value?.numericValue);
  if (!Number.isFinite(numericValue) || typeof base?.renderTemplate !== "string") return "";
  const adjusted = numericValue
    * (1 + (Number(valueModifierPercent) || 0) / 100)
    * (1 + (Number(baseModifierPercent) || 0) / 100);
  return base.renderTemplate.replace(
    "{value}",
    sourceHeroMemoryNumber(adjusted, base.precision),
  );
}

function compact91TobHeroMemoryText(value) {
  return String(value ?? "")
    .replace(/[\t\f\v \u00a0]+/gu, "")
    .replace(/[–—]/gu, "-")
    .trim();
}

function sourceHeroMemoryRevivalGroups(dataset) {
  const sections = dataset?.revivalCatalog?.sections ?? {};
  return [
    ...(sections.revivalAffixGroups ?? []),
    ...(sections.moonPhaseAffixGroups ?? []),
  ].filter(({ id }) => !VERIFIED_91TOB_UNAVAILABLE_REVIVAL_GROUP_IDS.has(id));
}

function publicHeroMemoryRevivalRollPlan(tier) {
  const variableRolls = (tier?.rollDefs ?? []).filter((roll) => (
    Number.isFinite(Number(roll?.min))
    && Number.isFinite(Number(roll?.max))
    && Number(roll.min) !== Number(roll.max)
  ));
  let renderTemplate = compact91TobHeroMemoryText(tier?.text);
  const mappings = [];
  for (const [index, roll] of variableRolls.entries()) {
    const minimum = sourceHeroMemoryNumber(roll.min, roll.precision);
    const maximum = sourceHeroMemoryNumber(roll.max, roll.precision);
    const range = `(${minimum}-${maximum})`;
    const offset = renderTemplate.indexOf(range);
    if (offset < 0) return null;
    const publicKey = `roll_${index + 1}`;
    renderTemplate = `${renderTemplate.slice(0, offset)}{{${publicKey}}}${renderTemplate.slice(offset + range.length)}`;
    mappings.push({ publicKey, localKey: roll.key, roll });
  }
  return { mappings, renderTemplate };
}

function renderPublicHeroMemoryRevivalTier(tier, values = {}) {
  const plan = publicHeroMemoryRevivalRollPlan(tier);
  if (!plan) return null;
  const rollValues = {};
  let text = plan.renderTemplate;
  for (const { publicKey, localKey, roll } of plan.mappings) {
    const value = Number(values[localKey]);
    if (!Number.isFinite(value)) return null;
    const rendered = sourceHeroMemoryNumber(value, roll.precision);
    text = text.replace(`{{${publicKey}}}`, rendered);
    rollValues[publicKey] = value;
  }
  return { ...plan, rollValues, text };
}

function publicHeroMemoryRevivalPreview(group) {
  const tier = (group?.tierOptions ?? []).find(({ tierId }) => (
    !VERIFIED_91TOB_UNAVAILABLE_REVIVAL_TIER_IDS.has(tierId)
  ));
  const plan = publicHeroMemoryRevivalRollPlan(tier);
  if (!tier || !plan) return null;
  let previewText = plan.renderTemplate;
  for (const { publicKey, roll } of plan.mappings) {
    const midpoint = (Number(roll.min) + Number(roll.max)) / 2;
    previewText = previewText.replace(
      `{{${publicKey}}}`,
      sourceHeroMemoryNumber(midpoint, roll.precision),
    );
  }
  return previewText;
}

function projectHeroMemoryRevivalAffix(group, config) {
  if (!group || VERIFIED_91TOB_UNAVAILABLE_REVIVAL_GROUP_IDS.has(group.id)) return null;
  const tier = group.tierOptions?.find(({ tierId }) => tierId === config?.tierId);
  if (!tier || VERIFIED_91TOB_UNAVAILABLE_REVIVAL_TIER_IDS.has(tier.tierId)) return null;
  const rendered = renderPublicHeroMemoryRevivalTier(tier, config?.rolls);
  const previewText = publicHeroMemoryRevivalPreview(group);
  if (!rendered || previewText == null) return null;
  return {
    group_id: group.id,
    tier_id: tier.tierId,
    tier_index: tier.tierIndex,
    text: rendered.text,
    render_template: rendered.renderTemplate,
    roll_values: rendered.rollValues,
    required_level: tier.requiredLevel,
    weight: tier.weight,
    preview_text: previewText,
    source_url: group.sourceUrl,
  };
}

function projectHeroMemoryAffix(group, config, modifierPercent = undefined) {
  const tier = group?.tierOptions?.find(({ tierId }) => tierId === config?.tierId);
  if (!tier) return null;
  const rolls = isPlainObject(config?.rolls) ? cloneJson(config.rolls) : {};
  return {
    group_id: group.id,
    tier_id: tier.tierId,
    tier_index: tier.tierIndex,
    text: sourceHeroMemoryAffixText(tier, rolls, modifierPercent),
    render_template: tier.renderTemplate,
    roll_values: rolls,
    required_level: tier.requiredLevel,
    weight: tier.weight,
  };
}

function projectHeroMemory(memory, localizedDataset, sourceDataset, options = {}) {
  const localizedType = exactHeroMemoryTypeForLocal(localizedDataset, memory?.memoryTypeId);
  const catalogSlotId = localizedType?.runtimeSlotId ?? localizedType?.slotId;
  const outputSlotId = options.slotId ?? catalogSlotId;
  const sourceType = exactHeroMemoryTypeBySlot(sourceDataset, catalogSlotId);
  if (!localizedType || !sourceType) return null;
  const diagnosis = diagnoseActiveHeroMemoryInstance(memory, localizedDataset);
  if (!diagnosis.valid || !diagnosis.normalized) return null;
  const isRevivalExtraSlot = outputSlotId === HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID;
  const revivalSlotDiagnosis = isRevivalExtraSlot
    ? diagnoseHeroMemoryRevivalSlotInstance(memory, options.effect, localizedDataset)
    : null;
  if ((isRevivalExtraSlot && revivalSlotDiagnosis?.valid !== true)
    || (!isRevivalExtraSlot && Object.hasOwn(diagnosis.normalized, "valueModifierPercent"))) {
    return null;
  }
  const normalized = revivalSlotDiagnosis?.normalized ?? diagnosis.normalized;
  const valueModifierPercent = isRevivalExtraSlot
    ? Number(options.effect?.valueModifierPercent)
    : undefined;
  const profile = getHeroMemoryEnhancementProfile(normalized.enhancement);
  if (![20, 30, 40, 50].includes(normalized.enhancement)
    || profile.enhancement !== normalized.enhancement
    || normalized.traitLevelBonus !== profile.traitLevelBonus) {
    return null;
  }
  const base = sourceType.baseAttributeGroups?.find(({ id }) => id === normalized.baseAttributeId);
  const baseValue = base?.enhancementValues?.find(
    ({ enhancementLevel }) => enhancementLevel === normalized.enhancement,
  );
  if (!base || !baseValue) return null;
  const fixedById = new Map((sourceType.fixedAffixGroups ?? []).map((group) => [group.id, group]));
  const randomById = new Map((sourceType.randomAffixGroups ?? []).map((group) => [group.id, group]));
  const fixedAffixes = normalized.fixedAffixIds.map((affixId) => (
    projectHeroMemoryAffix(fixedById.get(affixId), normalized.affixRolls[affixId])
  ));
  const randomAffixes = normalized.randomAffixIds.map((affixId) => (
    projectHeroMemoryAffix(
      randomById.get(affixId),
      normalized.affixRolls[affixId],
      valueModifierPercent,
    )
  ));
  if (fixedAffixes.some((entry) => !entry) || randomAffixes.some((entry) => !entry)) return null;
  const profitLossPercent = normalized.profitLoss
    ? VERIFIED_HERO_MEMORY_PROFIT_LOSS_PERCENT
    : undefined;
  const baseText = sourceHeroMemoryBaseText(
    base,
    baseValue,
    valueModifierPercent,
    profitLossPercent,
  );
  if (!baseText) return null;
  const revivalGroup = normalized.revivalAffixId
    ? sourceHeroMemoryRevivalGroups(sourceDataset).find(({ id }) => id === normalized.revivalAffixId)
    : null;
  const revivalAffix = normalized.revivalAffixId
    ? projectHeroMemoryRevivalAffix(
      revivalGroup,
      normalized.affixRolls[normalized.revivalAffixId],
    )
    : null;
  if (normalized.revivalAffixId && !revivalAffix) return null;
  const localRevivalEffect = revivalAffix
    ? getHeroMemoryRevivalSlotEffect(normalized, localizedDataset)
    : null;
  const targetSourceType = localRevivalEffect
    ? exactHeroMemoryTypeBySlot(sourceDataset, localRevivalEffect.targetCatalogSlotId)
    : null;
  const revivalEffect = localRevivalEffect && targetSourceType
    ? {
        slot_id: HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID,
        target_catalog_slot_id: localRevivalEffect.targetCatalogSlotId,
        target_memory_type: targetSourceType.memoryType,
        max_quality: localRevivalEffect.maxQuality,
        value_modifier_percent: localRevivalEffect.valueModifierPercent,
      }
    : undefined;
  const quality = profile.qualityId;
  const qualityLabel = VERIFIED_HERO_MEMORY_QUALITY_LABELS[quality];
  if (!qualityLabel || typeof normalized.instanceId !== "string" || !normalized.instanceId) return null;
  return {
    memory_id: normalized.instanceId,
    slot_id: outputSlotId,
    catalog_slot_id: catalogSlotId,
    name: `${sourceType.memoryType}·${qualityLabel}·强化${normalized.enhancement}`,
    memory_type: sourceType.memoryType,
    quality,
    enhancement_level: normalized.enhancement,
    trait_level_bonus: normalized.traitLevelBonus,
    base_attribute: {
      group_id: base.id,
      text: baseText,
      enhancement_level: normalized.enhancement,
      is_extrapolated: baseValue.isExtrapolated,
      source_tier_index: baseValue.sourceTierIndex ?? null,
    },
    fixed_affixes: fixedAffixes,
    random_affixes: randomAffixes,
    affixes: [
      `基础属性：${baseText}`,
      ...(normalized.traitLevelBonus > 0
        ? [`英雄特性等级：+${normalized.traitLevelBonus}`]
        : []),
      ...(revivalAffix ? [`复苏词缀：${revivalAffix.text}`] : []),
      ...fixedAffixes.map(({ text }) => `固有词缀：${text}`),
      ...randomAffixes.map(({ text }) => `随机词缀：${text}`),
    ],
    source_url: sourceType.sourceUrl,
    ...(profitLossPercent !== undefined
      ? { base_attribute_modifier_percent: profitLossPercent }
      : {}),
    ...(revivalAffix ? { revival_affix: revivalAffix } : {}),
    ...(revivalEffect
      ? { revival_base_trait_slot_effect: cloneJson(revivalEffect) }
      : {}),
    ...(isRevivalExtraSlot
      ? { value_modifier_percent: valueModifierPercent }
      : {}),
  };
}

function sourceHeroMemoryAffixConfig(row, groups) {
  if (!sameKeys(row, VERIFIED_HERO_MEMORY_AFFIX_KEYS) || !isPlainObject(row.roll_values)) return null;
  const group = groups.find(({ id }) => id === row.group_id);
  const tier = group?.tierOptions?.find(({ tierId }) => tierId === row.tier_id);
  if (!group || !tier) return null;
  return {
    id: group.id,
    config: { tierId: tier.tierId, rolls: cloneJson(row.roll_values) },
  };
}

function sourceHeroMemoryRevivalConfig(row, sourceDataset) {
  if (!isPlainObject(row)
    || !sameKeys(row, VERIFIED_HERO_MEMORY_REVIVAL_AFFIX_KEYS)
    || !isPlainObject(row.roll_values)) return null;
  const group = sourceHeroMemoryRevivalGroups(sourceDataset).find(({ id }) => id === row.group_id);
  const tier = group?.tierOptions?.find(({ tierId }) => tierId === row.tier_id);
  if (!group || !tier || VERIFIED_91TOB_UNAVAILABLE_REVIVAL_TIER_IDS.has(tier.tierId)) return null;
  const plan = publicHeroMemoryRevivalRollPlan(tier);
  if (!plan || !sameKeys(row.roll_values, plan.mappings.map(({ publicKey }) => publicKey))) return null;
  const rolls = Object.fromEntries((tier.rollDefs ?? []).map((roll) => [
    roll.key,
    Number.isFinite(Number(roll.defaultValue))
      ? Number(roll.defaultValue)
      : (Number(roll.min) + Number(roll.max)) / 2,
  ]));
  for (const { publicKey, localKey } of plan.mappings) {
    const value = row.roll_values[publicKey];
    if (!Number.isFinite(Number(value))) return null;
    rolls[localKey] = Number(value);
  }
  return {
    id: group.id,
    config: { tierId: tier.tierId, rolls },
  };
}

function importHeroMemory(source, slotId, localizedDataset, sourceDataset, options = {}) {
  const isRevivalExtraSlot = slotId === HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID;
  const catalogSlotId = isRevivalExtraSlot
    ? options.effect?.targetCatalogSlotId
    : slotId;
  const optionalKeys = [
    "base_attribute_modifier_percent",
    "revival_affix",
    "revival_base_trait_slot_effect",
    "value_modifier_percent",
  ];
  if (!allowedKeys(source, VERIFIED_HERO_MEMORY_KEYS, optionalKeys)
    || (Object.hasOwn(source, "base_attribute_modifier_percent")
      && source.base_attribute_modifier_percent !== VERIFIED_HERO_MEMORY_PROFIT_LOSS_PERCENT)
    || (!isRevivalExtraSlot && Object.hasOwn(source, "value_modifier_percent"))
    || (isRevivalExtraSlot && (
      Number(source.value_modifier_percent) !== Number(options.effect?.valueModifierPercent)
      || Object.hasOwn(source, "base_attribute_modifier_percent")
      || Object.hasOwn(source, "revival_affix")
      || Object.hasOwn(source, "revival_base_trait_slot_effect")
    ))
    || (Object.hasOwn(source, "revival_affix") && !isPlainObject(source.revival_affix))
    || (Object.hasOwn(source, "revival_base_trait_slot_effect")
      && !isPlainObject(source.revival_base_trait_slot_effect))
    || !sameKeys(source.base_attribute, VERIFIED_HERO_MEMORY_BASE_KEYS)
    || !Array.isArray(source.fixed_affixes)
    || !Array.isArray(source.random_affixes)
    || !Array.isArray(source.affixes)
    || typeof source.memory_id !== "string"
    || !source.memory_id
    || source.slot_id !== slotId
    || source.catalog_slot_id !== catalogSlotId) {
    return null;
  }
  const localizedType = exactHeroMemoryTypeBySlot(localizedDataset, catalogSlotId);
  const sourceType = exactHeroMemoryTypeBySlot(sourceDataset, catalogSlotId);
  if (!localizedType || !sourceType) return null;
  const fixed = source.fixed_affixes.map((row) => (
    sourceHeroMemoryAffixConfig(row, sourceType.fixedAffixGroups ?? [])
  ));
  const random = source.random_affixes.map((row) => (
    sourceHeroMemoryAffixConfig(row, sourceType.randomAffixGroups ?? [])
  ));
  if (fixed.some((entry) => !entry) || random.some((entry) => !entry)) return null;
  const revival = source.revival_affix
    ? sourceHeroMemoryRevivalConfig(source.revival_affix, sourceDataset)
    : null;
  if (source.revival_affix && !revival) return null;
  const memory = normalizeActiveHeroMemoryInstance({
    instanceId: source.memory_id,
    memoryTypeId: localizedType.flatCatalogId ?? localizedType.slotId,
    baseAttributeId: source.base_attribute.group_id,
    enhancement: source.enhancement_level,
    traitLevelBonus: source.trait_level_bonus,
    profitLoss: source.base_attribute_modifier_percent === VERIFIED_HERO_MEMORY_PROFIT_LOSS_PERCENT,
    ...(isRevivalExtraSlot
      ? { valueModifierPercent: Number(source.value_modifier_percent) }
      : {}),
    revivalAffixId: revival?.id ?? null,
    fixedAffixIds: fixed.map(({ id }) => id),
    randomAffixIds: random.map(({ id }) => id),
    affixRolls: Object.fromEntries(
      [...fixed, ...random, ...(revival ? [revival] : [])]
        .map(({ id, config }) => [id, config]),
    ),
  }, localizedDataset);
  if (!memory || !diagnoseActiveHeroMemoryInstance(memory, localizedDataset).valid) return null;
  const expected = projectHeroMemory(memory, localizedDataset, sourceDataset, options);
  return expected && sameSerializableValue(source, expected) ? memory : null;
}

function importHeroMemories(sourceBySlot, context, issues) {
  if (!isPlainObject(sourceBySlot)) return null;
  if (!context?.heroMemoryDataset || !context?.heroMemorySourceDataset) {
    if (Object.keys(sourceBySlot).length > 0) {
      issues.push(issue("validation-context-unavailable", "hero.memories_by_slot"));
    }
    return { memories: [], revivalMemory: null };
  }
  const sourceEntries = Object.entries(sourceBySlot);
  if (sourceEntries.some(([slotId]) => (
    !VERIFIED_HERO_MEMORY_SLOTS.includes(slotId)
    && slotId !== HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID
  ))) return null;
  const memories = Array(VERIFIED_HERO_MEMORY_SLOTS.length).fill(null);
  const instanceIds = new Set();
  let revivalAffixCount = 0;
  for (const slotId of VERIFIED_HERO_MEMORY_SLOTS) {
    const source = sourceBySlot[slotId];
    if (source === undefined) continue;
    const memory = importHeroMemory(
      source,
      slotId,
      context.heroMemoryDataset,
      context.heroMemorySourceDataset,
    );
    if (!memory || instanceIds.has(memory.instanceId)) return null;
    instanceIds.add(memory.instanceId);
    if (memory.revivalAffixId) revivalAffixCount += 1;
    if (revivalAffixCount > 1) return null;
    memories[VERIFIED_HERO_MEMORY_SLOTS.indexOf(slotId)] = memory;
  }
  let revivalMemory = null;
  if (Object.hasOwn(sourceBySlot, HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID)) {
    const effects = memories
      .map((memory) => getHeroMemoryRevivalSlotEffect(memory, context.heroMemoryDataset))
      .filter(Boolean);
    if (effects.length !== 1) return null;
    revivalMemory = importHeroMemory(
      sourceBySlot[HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID],
      HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID,
      context.heroMemoryDataset,
      context.heroMemorySourceDataset,
      { slotId: HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID, effect: effects[0] },
    );
    if (!revivalMemory || instanceIds.has(revivalMemory.instanceId)) return null;
  }
  return { memories, revivalMemory };
}

function mapHero(input, build, context, level, issues, mappedPaths) {
  const source = input.hero;
  const sourceHeroId = source.selected_hero_id;
  const optionMap = source.selected_trait_option_ids_by_key;
  const traitNodes = source.selected_trait_nodes;
  const importedMemories = importHeroMemories(source.memories_by_slot, context, issues);
  if (importedMemories === null) {
    issues.push(issue("91tob-hero-memory-invalid", "hero.memories_by_slot"));
    return;
  }
  const { memories, revivalMemory } = importedMemories;

  if (sourceHeroId == null || sourceHeroId === "") {
    if (meaningfulValue(optionMap)
      || meaningfulValue(traitNodes)
      || memories.some(Boolean)
      || revivalMemory) {
      issues.push(issue("91tob-hero-id-missing", "hero.selected_hero_id"));
    }
    return;
  }
  if (!context.heroTraitModel) {
    issues.push(issue("validation-context-unavailable", "hero"));
    return;
  }

  const branch = exactHeroBranch(context.heroTraitModel, sourceHeroId);
  if (!branch) {
    issues.push(issue("91tob-hero-id-unresolved", "hero.selected_hero_id"));
    return;
  }
  if (!isPlainObject(optionMap) || !Array.isArray(traitNodes)) {
    issues.push(issue("91tob-hero-trait-shape-invalid", "hero"));
    return;
  }

  const requestedValues = Object.values(optionMap);
  if (requestedValues.some((value) => typeof value !== "string" || !value)) {
    issues.push(issue("91tob-hero-trait-shape-invalid", "hero.selected_trait_option_ids_by_key"));
    return;
  }
  if (new Set(requestedValues).size !== requestedValues.length) {
    issues.push(issue("91tob-hero-trait-duplicate", "hero.selected_trait_option_ids_by_key"));
    return;
  }

  const allOptions = branch.stages.flatMap((stage) => (
    stage.options.map((option) => ({ stage, option }))
  ));
  const requestedSelections = [];
  for (const requestedValue of requestedValues) {
    const matches = allOptions.filter(({ option }) => (
      option.id === requestedValue || option.sourceId === requestedValue
    ));
    if (matches.length !== 1) {
      issues.push(issue("91tob-hero-trait-unresolved", "hero.selected_trait_option_ids_by_key"));
      continue;
    }
    const [{ stage, option }] = matches;
    const groupMatches = stage.selectionGroups.filter((group) => (
      group.options.some((candidate) => candidate.id === option.id)
    ));
    if (groupMatches.length !== 1) {
      issues.push(issue("91tob-hero-trait-unresolved", "hero.selected_trait_option_ids_by_key"));
      continue;
    }
    requestedSelections.push({ stageId: stage.id, optionId: option.id });
  }
  if (issues.some(({ path }) => path === "hero.selected_trait_option_ids_by_key")) return;

  const requestedOptionIds = new Set(requestedSelections.map(({ optionId }) => optionId));
  const requestedChoiceTiers = new Map();
  for (const node of traitNodes) {
    const matchingOption = allOptions.find(({ option }) => (
        requestedOptionIds.has(option.id)
        && (option.id === node.option_id || option.sourceId === node.option_id)
    ));
    if (!matchingOption
      || optionMap[node.selection_key] !== node.option_id
      || node.required_level !== matchingOption.stage.requiredLevel) {
      issues.push(issue("91tob-hero-trait-conflict", "hero.selected_trait_nodes"));
      return;
    }
    const previousTier = requestedChoiceTiers.get(matchingOption.option.id);
    if (previousTier !== undefined && previousTier !== node.tier) {
      issues.push(issue("91tob-hero-trait-conflict", "hero.selected_trait_nodes"));
      return;
    }
    requestedChoiceTiers.set(matchingOption.option.id, node.tier);
  }

  const requestedByStage = new Map();
  for (const selection of requestedSelections) {
    const accumulated = requestedByStage.get(selection.stageId) ?? {
      choiceIds: [],
      choiceTiers: {},
    };
    accumulated.choiceIds.push(selection.optionId);
    if (requestedChoiceTiers.has(selection.optionId)) {
      accumulated.choiceTiers[selection.optionId] = requestedChoiceTiers.get(selection.optionId);
    }
    requestedByStage.set(selection.stageId, accumulated);
  }
  const canonicalHeroId = branch.flatHeroId ?? branch.rawId;
  const hero = normalizeHeroTraitState(context.heroTraitModel, {
    branchId: canonicalHeroId,
    level,
    traitSelections: [...requestedByStage].map(([stageId, selection]) => ({
      stageId,
      choiceIds: selection.choiceIds,
      ...(Object.keys(selection.choiceTiers).length > 0
        ? { choiceTiers: selection.choiceTiers }
        : {}),
    })),
    memories: [],
  });
  const normalizedOptionIds = new Set(hero.traitSelections.flatMap(({ choiceIds }) => choiceIds));
  const normalizedChoiceTiers = new Map(hero.traitSelections.flatMap((selection) => (
    Object.entries(selection.choiceTiers ?? {})
  )));
  if (normalizedOptionIds.size !== requestedOptionIds.size
    || [...requestedOptionIds].some((optionId) => !normalizedOptionIds.has(optionId))
    || normalizedChoiceTiers.size !== requestedChoiceTiers.size
    || [...requestedChoiceTiers].some(([optionId, tier]) => (
      normalizedChoiceTiers.get(optionId) !== tier
    ))) {
    issues.push(issue("91tob-hero-trait-normalization-mismatch", "hero.selected_trait_option_ids_by_key"));
    return;
  }

  build.hero = { ...hero, memories, revivalMemory };
  build.heroLevel = level;
  build.selections.hero = [canonicalHeroId];
  build.selections.heroMemory = memories.flatMap((memory) => (
    memory
      ? [exactHeroMemoryTypeForLocal(
        context.heroMemoryDataset,
        memory.memoryTypeId,
      )?.flatCatalogId].filter(Boolean)
      : []
  ));
  mappedPaths.push(
    "character.level",
    "hero.selected_hero_id",
    "hero.selected_trait_option_ids_by_key",
  );
  if (requestedChoiceTiers.size > 0) mappedPaths.push("hero.selected_trait_nodes[].tier");
  if (memories.some(Boolean) || revivalMemory) mappedPaths.push("hero.memories_by_slot");
}

function mapPactSpirits(
  input,
  build,
  context,
  issues,
  mappedPaths,
  pactDestinyMappingReceipts,
) {
  const sourceSlots = input.pactspirits.slots;
  if (!isPlainObject(sourceSlots)) {
    issues.push(issue("91tob-pact-shape-invalid", "pactspirits.slots"));
    return;
  }
  if (!context.pactModel) {
    if (Object.values(sourceSlots).some((slot) => meaningfulValue(slot?.pactspirit_slug))
      || has91TobOrdinaryPactDestinyPayload(sourceSlots)
      || has91TobUndeterminedPactDestinyPayload(sourceSlots)) {
      issues.push(issue("validation-context-unavailable", "pactspirits"));
    }
    return;
  }

  const slotIds = Array.isArray(context.pactModel.spiritSlotIds)
    ? context.pactModel.spiritSlotIds
    : build.pact.slots.map(({ slotId }) => slotId);
  for (const [slotIndex, slotId] of slotIds.entries()) {
    const sourceSlot = sourceSlots[slotId];
    if (sourceSlot == null) continue;
    if (!isPlainObject(sourceSlot)) {
      issues.push(issue("91tob-pact-shape-invalid", `pactspirits.slots.${slotId}`));
      continue;
    }
    const sourceSpiritId = sourceSlot.pactspirit_slug;
    if (sourceSpiritId == null || sourceSpiritId === "") continue;
    const matches = context.pactModel.spirits.filter((spirit) => (
      spirit.id === sourceSpiritId || spirit.slug === sourceSpiritId
    ));
    if (matches.length !== 1) {
      issues.push(issue("91tob-pact-spirit-unresolved", `pactspirits.slots.${slotId}`));
      continue;
    }
    const level = Number(sourceSlot.level);
    if (!Number.isInteger(level) || level < 1 || level > 6) {
      issues.push(issue("91tob-pact-level-invalid", `pactspirits.slots.${slotId}.level`));
      continue;
    }
    const spirit = createPactSpiritInstance(
      context.pactModel,
      matches[0].id,
      `91tob-import-${slotId}`,
    );
    spirit.level = level;
    build.pact.slots[slotIndex] = {
      ...build.pact.slots[slotIndex],
      spirit,
    };
    build.selections.spirits = [
      ...(build.selections.spirits ?? []),
      matches[0].id,
    ];
    mappedPaths.push(
      `pactspirits.slots.${slotId}.pactspirit_slug`,
      `pactspirits.slots.${slotId}.level`,
    );
  }
  const destinyResult = import91TobOrdinaryPactDestinies(
    input.pactspirits,
    build.pact,
    context,
  );
  issues.push(...destinyResult.issues);
  mappedPaths.push(...destinyResult.mappedPaths);
  pactDestinyMappingReceipts.push(...destinyResult.mappings);
  const undeterminedResult = import91TobUndeterminedPactDestinies(
    input.pactspirits,
    build.pact,
    context,
  );
  issues.push(...undeterminedResult.issues);
  mappedPaths.push(...undeterminedResult.mappedPaths);
  pactDestinyMappingReceipts.push(...undeterminedResult.mappings);
}

function exportFailure(reason, issues) {
  return { ok: false, reason, issues, document: null, exportedSections: [] };
}

function localPactHasUnsupportedOrdinaryPayload(pact) {
  return meaningfulValue(pact?.legacyUnassigned)
    || meaningfulValue(pact?.sourceOnlyDestinyIds);
}

function localElixirHasUnsupportedPayload(elixirs) {
  return (elixirs ?? []).some((elixir) => elixir && (
    meaningfulValue(elixir.supports)
    || meaningfulValue(elixir.sealedLife)
    || meaningfulValue(elixir.sealedMana)
  ));
}

function nonInteropConditionPaths(values) {
  const paths = [];
  const enemy = values.enemy;
  const recent = values.recent;
  const defaults = {
    type: "normal",
    isBoss: false,
    level: 90,
    armor: 0,
    affliction: 0,
    distance: 0,
    resistances: { fire: 0, cold: 0, lightning: 0, erosion: 0 },
  };
  for (const [key, expected] of Object.entries(defaults)) {
    if (key === "resistances") {
      for (const [resistance, resistanceDefault] of Object.entries(expected)) {
        if (enemy.resistances?.[resistance] !== resistanceDefault) {
          paths.push(`conditions.enemy.resistances.${resistance}`);
        }
      }
    } else if (enemy[key] !== expected) {
      paths.push(`conditions.enemy.${key}`);
    }
  }
  if (Object.hasOwn(enemy, "ailmentCount")) {
    paths.push("conditions.enemy.ailmentCount");
  }
  for (const key of ["acted", "killed", "wasHit", "consumed"]) {
    if (recent[key] !== false) paths.push(`conditions.recent.${key}`);
  }
  if (values.reaping.durationSeconds !== 0) paths.push("conditions.reaping.durationSeconds");
  if (values.reaping.eventsPerSecond !== 0) paths.push("conditions.reaping.eventsPerSecond");
  for (const key of ["charges", "blessings", "statuses", "buffs"]) {
    if (meaningfulValue(values[key])) paths.push(`conditions.${key}`);
  }
  const allowedMaps = [
    ["heroStacks", VERIFIED_ETERNAL_STACK_KEYS],
    ["recentFlags", VERIFIED_RECENT_FLAG_KEYS],
    ["playerStates", VERIFIED_PLAYER_STATE_KEYS],
    ["playerResources", VERIFIED_PLAYER_RESOURCE_KEYS],
    ["enemyStates", VERIFIED_ENEMY_STATE_KEYS],
    ["debuffs", VERIFIED_DEBUFF_DISPLAY_KEYS],
  ];
  for (const [mapKey, allowedKeys] of allowedMaps) {
    const allowed = new Set(allowedKeys);
    if (Object.keys(values[mapKey] ?? {}).some((key) => !allowed.has(key))) {
      paths.push(`conditions.${mapKey}`);
    }
  }
  if (enemy.paralysisStacks > 0 && values.debuffs.paralyzed !== true) {
    paths.push("conditions.enemy.paralysisStacks");
  }
  return paths;
}

function localExportIssues(build, context) {
  const issues = [];
  if (!isPlainObject(build)) return [issue("91tob-export-build-invalid", "build")];
  if (!context?.skillModel
    || !context?.heroTraitModel
    || !context?.talentModel
    || !context?.pactModel) {
    issues.push(issue("validation-context-unavailable", "validationContext"));
  }
  if ((build.hero?.memories ?? []).some(Boolean)
    && (!context?.heroMemoryDataset || !context?.heroMemorySourceDataset)) {
    issues.push(issue("validation-context-unavailable", "hero.memories"));
  }
  if (localPactHasUnsupportedOrdinaryPayload(build.pact)) {
    issues.push(issue("91tob-export-pact-destiny-unsupported", "pact"));
  }
  if (context?.pactModel) {
    for (const pactIssue of diagnosePactDestinyState(context.pactModel, build.pact).issues) {
      if (pactIssue.code !== "pact-spirit-ring-slot-unavailable") continue;
      issues.push(issue("91tob-export-pact-topology-invalid", `pact.${pactIssue.path}`));
    }
  }
  const skillSlots = [...(build.skills?.active ?? []), ...(build.skills?.passive ?? [])];
  if (skillSlots.some((slot) => meaningfulValue(slot?.sealedLife) || meaningfulValue(slot?.sealedMana))) {
    issues.push(issue("91tob-export-skill-seal-unsupported", "skills"));
  }
  for (const [collection, slots] of [
    ["active", build.skills?.active ?? []],
    ["passive", build.skills?.passive ?? []],
  ]) {
    const scenarioIndex = slots.findIndex((slot) => Object.hasOwn(
      slot?.modularization ?? {},
      "elementalProtocolDamageType",
    ));
    if (scenarioIndex >= 0) {
      issues.push(issue(
        "91tob-export-modularization-scenario-unsupported",
        `skills.${collection}.${scenarioIndex}.modularization.elementalProtocolDamageType`,
      ));
      break;
    }
  }
  if (localElixirHasUnsupportedPayload(build.skills?.elixirs)) {
    issues.push(issue("91tob-export-elixir-payload-unsupported", "skills.elixirs"));
  }
  const conditionPaths = nonInteropConditionPaths(resolveConditionValues(build.conditions));
  if (conditionPaths.length) {
    issues.push(issue("91tob-export-condition-unsupported", conditionPaths[0]));
  }
  return issues;
}

function exportHeroMemories(build, context, issues) {
  if (build.hero?.memories !== undefined && !Array.isArray(build.hero.memories)) {
    issues.push(issue("91tob-export-hero-memory-invalid", "hero.memories"));
    return null;
  }
  const sourceMemories = build.hero?.memories ?? [];
  if (sourceMemories.slice(VERIFIED_HERO_MEMORY_SLOTS.length).some(Boolean)) {
    issues.push(issue("91tob-export-hero-memory-invalid", "hero.memories"));
    return null;
  }
  const result = {};
  const instanceIds = new Set();
  const revivalAffixCount = sourceMemories
    .slice(0, VERIFIED_HERO_MEMORY_SLOTS.length)
    .filter((memory) => memory?.revivalAffixId)
    .length;
  if (revivalAffixCount > 1) {
    issues.push(issue("91tob-export-hero-memory-revival-duplicate", "hero.memories"));
    return result;
  }
  for (const [index, memory] of sourceMemories.slice(0, VERIFIED_HERO_MEMORY_SLOTS.length).entries()) {
    if (!memory) continue;
    const localizedType = exactHeroMemoryTypeForLocal(context.heroMemoryDataset, memory.memoryTypeId);
    const slotId = localizedType?.runtimeSlotId ?? localizedType?.slotId;
    if (slotId !== VERIFIED_HERO_MEMORY_SLOTS[index]
      || typeof memory.instanceId !== "string"
      || !memory.instanceId
      || instanceIds.has(memory.instanceId)) {
      issues.push(issue("91tob-export-hero-memory-invalid", `hero.memories.${index}`));
      continue;
    }
    const projected = projectHeroMemory(
      memory,
      context.heroMemoryDataset,
      context.heroMemorySourceDataset,
    );
    if (!projected) {
      issues.push(issue("91tob-export-hero-memory-invalid", `hero.memories.${index}`));
      continue;
    }
    instanceIds.add(memory.instanceId);
    result[slotId] = projected;
  }
  const revivalMemory = build.hero?.revivalMemory;
  if (revivalMemory != null) {
    const effects = sourceMemories
      .slice(0, VERIFIED_HERO_MEMORY_SLOTS.length)
      .map((memory) => getHeroMemoryRevivalSlotEffect(memory, context.heroMemoryDataset))
      .filter(Boolean);
    const effect = effects.length === 1 ? effects[0] : null;
    const diagnosis = effect
      ? diagnoseHeroMemoryRevivalSlotInstance(
        revivalMemory,
        effect,
        context.heroMemoryDataset,
      )
      : { valid: false };
    const projected = diagnosis.valid
      ? projectHeroMemory(
        revivalMemory,
        context.heroMemoryDataset,
        context.heroMemorySourceDataset,
        { slotId: HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID, effect },
      )
      : null;
    if (!projected
      || typeof revivalMemory.instanceId !== "string"
      || !revivalMemory.instanceId
      || instanceIds.has(revivalMemory.instanceId)) {
      issues.push(issue("91tob-export-hero-memory-invalid", "hero.revivalMemory"));
    } else {
      result[HERO_MEMORY_REVIVAL_EXTRA_SLOT_ID] = projected;
    }
  }
  return result;
}

function exportHero(build, model, context, issues) {
  const level = Number(build.heroLevel ?? build.hero?.level);
  if (!Number.isInteger(level) || level < 1 || level > 100) {
    issues.push(issue("91tob-export-hero-level-invalid", "hero.level"));
  }
  const branchId = build.hero?.branchId;
  if (!branchId) {
    if ((build.hero?.memories ?? []).some(Boolean) || build.hero?.revivalMemory) {
      issues.push(issue("91tob-export-hero-memory-without-hero", "hero.memories"));
    }
    return {
      selected_hero_id: "",
      selected_hero_name: "",
      selected_trait_option_ids_by_key: {},
      selected_trait_nodes: [],
      memories_by_slot: {},
    };
  }
  const branch = findHeroTraitBranch(model, branchId);
  if (!branch) {
    issues.push(issue("91tob-export-hero-unresolved", "hero.branchId"));
    return null;
  }
  const normalized = normalizeHeroTraitState(model, {
    ...build.hero,
    level,
    memories: [],
  });
  if (!sameSerializableValue(normalized.traitSelections, build.hero?.traitSelections ?? [])) {
    issues.push(issue("91tob-export-hero-normalization-mismatch", "hero.traitSelections"));
    return null;
  }
  const memoriesBySlot = exportHeroMemories(build, context, issues);
  if (!memoriesBySlot) return null;

  const optionIdsByKey = {};
  const traitNodes = [];
  const usedKeys = new Set();
  for (const selection of normalized.traitSelections) {
    const stage = branch.stages.find(({ id }) => id === selection.stageId);
    if (!stage) {
      issues.push(issue("91tob-export-hero-selection-unresolved", "hero.traitSelections"));
      continue;
    }
    for (const choiceId of selection.choiceIds) {
      const group = stage.selectionGroups.find((candidate) => (
        candidate.options.some(({ id }) => id === choiceId)
      ));
      const option = group?.options.find(({ id }) => id === choiceId);
      if (!group || !option?.sourceId) {
        issues.push(issue("91tob-export-hero-selection-unresolved", "hero.traitSelections"));
        continue;
      }
      const preferredKey = option.selectionKey || `${stage.id}:${group.id}`;
      const selectionKey = usedKeys.has(preferredKey)
        ? `${preferredKey}:${group.id}`
        : preferredKey;
      usedKeys.add(selectionKey);
      optionIdsByKey[selectionKey] = option.sourceId;
      if (Object.hasOwn(selection.choiceTiers ?? {}, choiceId)) {
        const tier = selection.choiceTiers[choiceId];
        if (!Number.isInteger(tier)) {
          issues.push(issue("91tob-export-hero-tier-invalid", "hero.traitSelections"));
          continue;
        }
        traitNodes.push({
          selection_key: selectionKey,
          stage_level: stage.level || `Lv.${stage.requiredLevel}`,
          option_id: option.sourceId,
          option_name: option.name || "",
          tier,
          description: option.description || "",
          required_level: stage.requiredLevel,
        });
      }
    }
  }
  return {
    selected_hero_id: branch.rawId,
    selected_hero_name: branch.name || "",
    selected_trait_option_ids_by_key: optionIdsByKey,
    selected_trait_nodes: traitNodes,
    memories_by_slot: memoriesBySlot,
  };
}

function exportSupportRow(hostSlotId, supportIndex, supportSlot, model, issues) {
  const matches = model.allSupports.filter(({ id }) => id === supportSlot.supportId);
  if (matches.length !== 1) {
    issues.push(issue("91tob-export-support-unresolved", `skills.${hostSlotId}.supports`));
    return null;
  }
  const support = matches[0];
  const supportKind = VERIFIED_91TOB_SUPPORT_KIND_BY_LOCAL_KIND[support.supportKind];
  if (!supportKind) {
    issues.push(issue("91tob-export-support-kind-unsupported", `skills.${hostSlotId}.supports`));
    return null;
  }
  const config = normalizeSupportRuntimeConfig(supportSlot.config, support) ?? {};
  if (Object.hasOwn(config, "activationMediumTier")
    || Object.hasOwn(config, "activationMediumTierByClause")) {
    issues.push(issue("91tob-export-support-config-unsupported", `skills.${hostSlotId}.supports`));
    return null;
  }
  return {
    effect_roll_overrides: { ...(config.effectRollOverrides ?? {}) },
    slot_id: `${hostSlotId}:support:${supportIndex + 1}`,
    slot_index: supportIndex + 1,
    skill_id: tob91CatalogId(support, "support"),
    skill_name: support.name,
    role: "support",
    level: supportSlot.level,
    support_kind: supportKind,
    ...(Number.isInteger(support.requiredSlot)
      ? { required_support_slot: support.requiredSlot }
      : {}),
    ...(Object.hasOwn(config, "specialTier") ? { special_tier: config.specialTier } : {}),
    ...(Object.hasOwn(config, "specialLevel") ? { special_level: config.specialLevel } : {}),
    ...(Object.hasOwn(config, "activationIntervalSeconds")
      ? { activation_interval_seconds: config.activationIntervalSeconds }
      : {}),
    ...(Object.hasOwn(config, "activationDistanceMeters")
      ? { activation_distance_meters: config.activationDistanceMeters }
      : {}),
    description: typeof support.description === "string" ? support.description : "",
    skill_types: [...(support.tags ?? [])],
    ...(support.url ? { source_url: support.url } : {}),
  };
}

function exportMainSkillRow({
  collection,
  rowIndex,
  slot,
  slotId,
  model,
  elixirs,
  usedElixirIndexes,
  issues,
}) {
  const records = collection === "active"
    ? [...model.active, ...(model.irisSpiritActive ?? [])]
    : model.passive;
  const matches = records.filter(({ id }) => id === slot.skillId);
  if (matches.length !== 1) {
    issues.push(issue("91tob-export-main-skill-unresolved", `skills.${slotId}`));
    return null;
  }
  const skill = matches[0];
  const supportSkills = slot.supports.flatMap((supportSlot, supportIndex) => {
    if (!supportSlot) return [];
    const row = exportSupportRow(slotId, supportIndex, supportSlot, model, issues);
    return row ? [row] : [];
  });
  const row = {
    slot_id: slotId,
    slot_index: rowIndex + 1,
    equipped: true,
    role: collection,
    skill_id: tob91CatalogId(skill, collection),
    skill_name: skill.name,
    level: slot.level,
    description: typeof skill.description === "string" ? skill.description : "",
    skill_types: [...(skill.tags ?? [])],
    ...(skill.url ? { source_url: skill.url } : {}),
    support_skills: supportSkills,
  };

  if (skill.irisSpiritActive === true) {
    const identities = TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.directActiveSkills.filter((identity) => (
      identity.localActiveSkillId === skill.id
        && identity.sourceSkillId === row.skill_id
        && identity.sourceName === skill.name
        && identity.sourceUrl === skill.url
    ));
    if (collection !== "active" || identities.length !== 1 || slot.spiritHost) {
      issues.push(issue("91tob-export-iris-spirit-config-invalid", `skills.${slotId}`));
      return null;
    }
    return row;
  }

  if (slot.spiritHost) {
    const mappings = TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.mappings.filter((mapping) => (
      mapping.localActiveSkillId === skill.id
        && mapping.sourceActiveSkillId === row.skill_id
        && mapping.sourceActiveName === skill.name
        && mapping.sourceActiveUrl === skill.url
        && mapping.localSpiritHostSkillId === slot.spiritHost.skillId
    ));
    const mapping = mappings[0];
    const hosts = model.passive.filter((record) => (
      record.id === mapping?.localSpiritHostSkillId
        && record.name === mapping?.sourceSpiritHostName
        && record.url === mapping?.sourceSpiritHostUrl
    ));
    const host = hosts[0];
    if (collection !== "active" || mappings.length !== 1 || hosts.length !== 1) {
      issues.push(issue("91tob-export-iris-spirit-config-invalid", `skills.${slotId}`));
      return null;
    }
    row.support_skills = [];
    row.spirit_host_skill = {
      skill_id: mapping.sourceSpiritHostSkillId,
      skill_name: host.name,
      level: slot.level,
      description: typeof host.description === "string" ? host.description : "",
      skill_types: [...(host.tags ?? [])],
      source_url: host.url,
      support_skills: supportSkills,
    };
    return row;
  }

  if (isModularizationSkill(skill)) {
    const receipt = TOB91_MODULARIZATION_INTEROP_RECEIPT;
    const mappings = receipt.skills.filter(({ localMainSkillId, sourceModularizationSkillId }) => (
      localMainSkillId === skill.id && sourceModularizationSkillId === skill.raw?.id
    ));
    const config = slot.modularization;
    const optionReceiptById = new Map(receipt.options.map((option) => [
      option.sourceModuleOptionId,
      option,
    ]));
    const localOptionBySourceId = new Map((model.supports?.modular ?? []).map((support) => [
      support.raw?.id,
      support,
    ]));
    if (mappings.length !== 1
      || !config
      || config.modularizationSkillId !== skill.raw.id
      || new Set(config.moduleOptionIds).size !== config.moduleOptionIds.length
      || config.moduleOptionIds.length > receipt.moduleOptionLimit
      || config.moduleOptionIds.some((sourceId) => {
        const optionReceipt = optionReceiptById.get(sourceId);
        const localOption = localOptionBySourceId.get(sourceId);
        return !optionReceipt
          || !localOption
          || localOption.id !== optionReceipt.localSupportId
          || localOption.supportKind !== "modular";
      })
      || (Object.hasOwn(config, "summonCount")
        && (!Number.isFinite(config.summonCount)
          || config.summonCount < receipt.minimumSummonCount))) {
      issues.push(issue("91tob-export-modularization-config-invalid", `skills.${slotId}`));
      return null;
    }
    const mapping = mappings[0];
    const summonNames = Array.isArray(skill.raw?.summon_skill_names)
      ? skill.raw.summon_skill_names.filter((value) => typeof value === "string" && Boolean(value))
      : [];
    const sourceTags = Array.isArray(skill.raw?.skill_types_cn)
      ? skill.raw.skill_types_cn.filter((value) => typeof value === "string" && Boolean(value))
      : [];
    row.skill_id = mapping.sourceSkillId;
    row.skill_name = receipt.rootSkill.sourceName;
    row.source_url = receipt.rootSkill.sourceUrl;
    row.description = [
      typeof skill.raw?.summary === "string" ? skill.raw.summary : "",
      summonNames.length ? `召唤：${summonNames.join("、")}` : "",
    ].filter(Boolean).join(" ");
    row.skill_types = [...new Set([...sourceTags, "modularization", "模组"])];
    row.runtime_config = {
      elixir_ingredient_ids: [],
      modularization: {
        modularization_skill_id: config.modularizationSkillId,
        ...(config.moduleOptionIds.length
          ? { module_option_ids: [...config.moduleOptionIds] }
          : {}),
        ...(Object.hasOwn(config, "summonCount")
          ? { summon_count: config.summonCount }
          : {}),
      },
    };
    return row;
  }

  const identityMappings = TOB91_ELIXIR_INTEROP_RECEIPT.skills.filter(({ localMainSkillId }) => (
    localMainSkillId === skill.id
  ));
  if (!identityMappings.length) return row;
  const bottleMappings = TOB91_ELIXIR_INTEROP_RECEIPT.bottleMappings.filter((mapping) => (
    mapping.sourceSlotId === slotId && mapping.sourceSlotIndex === rowIndex + 1
  ));
  if (identityMappings.length !== 1 || bottleMappings.length !== 1) {
    issues.push(issue("91tob-export-elixir-slot-unsupported", `skills.${slotId}`));
    return null;
  }
  const identity = identityMappings[0];
  const bottleMapping = bottleMappings[0];
  const bottleIndex = model.elixir.bottles.findIndex(({ id }) => id === bottleMapping.localBottleId);
  const bottle = model.elixir.bottles[bottleIndex];
  const elixir = elixirs[bottleIndex];
  const ingredientById = new Map(model.elixir.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  if (!bottle
    || !elixir
    || identity.sourceSkillId !== row.skill_id
    || elixir.bottleId !== bottle.id
    || elixir.skillId !== identity.localElixirSkillId
    || new Set(elixir.ingredientIds).size !== elixir.ingredientIds.length
    || elixir.ingredientIds.length > bottle.baseIngredientCapacity
    || elixir.ingredientIds.some((ingredientId) => (
      !ingredientById.get(ingredientId)?.allowedBottleIds.includes(bottle.id)
    ))) {
    issues.push(issue("91tob-export-elixir-config-invalid", `skills.${slotId}`));
    return null;
  }
  usedElixirIndexes.add(bottleIndex);
  row.runtime_config = { elixir_ingredient_ids: [...elixir.ingredientIds] };
  return row;
}

function exportSkills(build, model, issues) {
  const normalized = normalizeSkillState(model, build.skills, { build });
  const originalRows = [...(build.skills?.active ?? []), ...(build.skills?.passive ?? [])];
  const normalizedRows = [...normalized.active, ...normalized.passive];
  for (const [index, original] of originalRows.entries()) {
    if (!original?.skillId) {
      if ((original?.supports ?? []).some(Boolean)) {
        issues.push(issue("91tob-export-skill-normalization-mismatch", "skills"));
      }
      continue;
    }
    if (!sameSerializableValue(original, normalizedRows[index])) {
      issues.push(issue("91tob-export-skill-normalization-mismatch", "skills"));
    }
  }
  if (Number(build.skills?.energyMax) !== normalized.energyMax) {
    issues.push(issue("91tob-export-skill-energy-invalid", "skills.energyMax"));
  }
  const energy = getSkillEnergyUsage(normalized);
  if (energy.over > 0) issues.push(issue("91tob-export-skill-energy-invalid", "skills.energyMax"));

  const usedElixirIndexes = new Set();
  const activeRows = normalized.active.map((slot, rowIndex) => {
    if (!slot.skillId) return null;
    return exportMainSkillRow({
      collection: "active",
      rowIndex,
      slot,
      slotId: `active-slot-${rowIndex + 1}`,
      model,
      elixirs: normalized.elixirs,
      usedElixirIndexes,
      issues,
    });
  });
  const passiveRows = normalized.passive.map((slot, rowIndex) => {
    if (!slot.skillId) return null;
    return exportMainSkillRow({
      collection: "passive",
      rowIndex,
      slot,
      slotId: `passive-slot-${rowIndex + 1}`,
      model,
      elixirs: normalized.elixirs,
      usedElixirIndexes,
      issues,
    });
  });
  if (normalized.elixirs.some((elixir, index) => elixir && !usedElixirIndexes.has(index))) {
    issues.push(issue("91tob-export-elixir-config-invalid", "skills.elixirs"));
  }
  return {
    core_skill: activeRows[0],
    active_skills: activeRows.slice(1).filter(Boolean),
    passive_skills: passiveRows.filter(Boolean),
    state_flags: {
      max_support_energy: energy.maximum,
      used_support_energy: energy.used,
      remaining_support_energy: energy.remaining,
      unlocked_support_count_by_slot_id: {
        ...Object.fromEntries(normalized.active.map((slot, index) => [
          `active-slot-${index + 1}`,
          slot.unlockedSupportCount,
        ])),
        ...Object.fromEntries(normalized.passive.map((slot, index) => [
          `passive-slot-${index + 1}`,
          slot.unlockedSupportCount,
        ])),
      },
    },
  };
}

function exportPactSpirits(build, context, issues) {
  const model = context.pactModel;
  const localSlots = build.pact?.slots ?? [];
  return {
    destiny_catalog_fingerprint: TOB91_DESTINY_INTEROP_RECEIPT.catalogFingerprint,
    pactspirit_catalog_fingerprint: "",
    slot_order: [...VERIFIED_PACT_SLOT_ORDER],
    slots: Object.fromEntries(VERIFIED_PACT_SLOT_ORDER.map((slotId, slotIndex) => {
      const localSlot = localSlots.find((slot) => slot?.slotId === slotId) ?? localSlots[slotIndex];
      const source = {
        level: 1,
        rings: Object.fromEntries(VERIFIED_PACT_RING_KEYS.map((ringId) => {
          const installed = localSlot?.rings?.[ringId]?.installedDestiny;
          if (!installed) return [ringId, {}];
          if (!localSlot?.spirit) {
            issues.push(issue(
              "91tob-export-pact-destiny-invalid",
              `pact.${slotId}.rings.${ringId}`,
            ));
            return [ringId, {}];
          }
          const result = export91TobOrdinaryPactDestiny(
            installed,
            ringId.startsWith("innerRing") ? "micro" : "medium",
            context,
            `pact.${slotId}.rings.${ringId}`,
          );
          if (!result.ok) {
            issues.push(result.issue);
            return [ringId, {}];
          }
          return [ringId, { installed_destiny: result.value }];
        })),
      };
      if (localSlot?.undeterminedFate) {
        if (!localSlot.spirit) {
          issues.push(issue(
            "91tob-export-pact-undetermined-fate-invalid",
            `pact.${slotId}.undeterminedFate`,
          ));
        } else {
          const result = export91TobUndeterminedPactDestiny(
            localSlot.undeterminedFate,
            context,
            `pact.${slotId}.undeterminedFate`,
          );
          if (!result.ok) issues.push(result.issue);
          else source.undetermined_fate = result.value;
        }
      }
      if (!localSlot?.spirit) return [slotId, source];
      const matches = model.spirits.filter(({ id }) => id === localSlot.spirit.spiritId);
      const level = Number(localSlot.spirit.level);
      if (matches.length !== 1 || !Number.isInteger(level) || level < 1 || level > 6) {
        issues.push(issue("91tob-export-pact-spirit-invalid", `pact.${slotId}`));
        return [slotId, source];
      }
      return [slotId, {
        ...source,
        pactspirit_slug: matches[0].slug ?? matches[0].id,
        level,
      }];
    })),
  };
}

function exportCombat(build) {
  const values = resolveConditionValues(build.conditions);
  const recent = {
    recent_move_distance_m: values.recent.moveDistanceMeters,
    has_moved_recently: values.recent.moved,
    has_used_warcry_recently: values.recent.usedWarcry,
    ...(values.recent.killStack > 0 ? { recent_kill_stack: values.recent.killStack } : {}),
    ...(values.recent.warcrySkillUseCount > 0
      ? { recent_warcry_skill_use: values.recent.warcrySkillUseCount }
      : {}),
    ...(values.recent.spellBurstActivationCount > 0
      ? { spell_burst_activated_recently: values.recent.spellBurstActivationCount }
      : {}),
    ...Object.fromEntries(VERIFIED_RECENT_FLAG_KEYS.flatMap((key) => (
      Object.hasOwn(values.recentFlags, key) ? [[key, values.recentFlags[key]]] : []
    ))),
  };
  const player = {
    mechanics: {
      eternal_stacks: Object.fromEntries(VERIFIED_ETERNAL_STACK_KEYS.map((key) => [
        key,
        values.heroStacks[key] ?? 0,
      ])),
    },
    recent,
    ...(Object.keys(values.playerStates).length ? { states: { ...values.playerStates } } : {}),
    ...(Object.keys(values.playerResources).length
      ? { resources: { ...values.playerResources } }
      : {}),
  };
  const debuffs = {};
  for (const [rootKey, nestedKey, targetKey] of VERIFIED_DEBUFF_BOOLEAN_PATHS) {
    if (!Object.hasOwn(values.debuffs, targetKey)) continue;
    if (nestedKey === null) debuffs[rootKey] = values.debuffs[targetKey];
    else debuffs[rootKey] = {
      ...(isPlainObject(debuffs[rootKey]) ? debuffs[rootKey] : {}),
      [nestedKey]: values.debuffs[targetKey],
    };
  }
  if (values.enemy.witherStacks > 0) debuffs.wither_stack_count = values.enemy.witherStacks;
  if (values.enemy.paralysisStacks > 0) {
    debuffs.numbed = { active: true };
    debuffs.paralysis_stacks = values.enemy.paralysisStacks;
  }
  const enemy = {
    ...(values.enemy.distanceBand ? { distance: values.enemy.distanceBand } : {}),
    ...Object.fromEntries(VERIFIED_ENEMY_STATE_KEYS.flatMap((key) => (
      Object.hasOwn(values.enemyStates, key) ? [[key, values.enemyStates[key]]] : []
    ))),
    ...(Object.keys(debuffs).length ? { debuffs } : {}),
  };
  return { debug: {}, enemy, player };
}

function exportCustomSources(value) {
  const lines = String(value ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? [{
    source_id: "user_custom",
    source_name: "自定义词条",
    enabled: true,
    mod_texts: lines,
  }] : [];
}

/**
 * Projects the exact 91TOB public serializer subset that TOB can preserve in
 * both directions. Any populated gameplay domain outside that contract is
 * rejected instead of being silently dropped from the downloaded document.
 */
export function export91TobBuildDocument(build, context, options = {}) {
  const issues = localExportIssues(build, context);
  const gear = export91TobGearSection(build?.gear);
  if (!gear.ok) issues.push(...gear.issues);
  const talents = export91TobTalentSection(build?.talents, context?.talentModel);
  if (!talents.ok) issues.push(...talents.issues);
  if (issues.some(({ code }) => code === "validation-context-unavailable")) {
    return exportFailure("context-unavailable", issues);
  }
  if (issues.length) return exportFailure("91tob-export-unsupported", issues);

  const exportedAt = typeof options.exportedAt === "string"
    ? options.exportedAt
    : new Date().toISOString();
  if (!validIsoTimestamp(exportedAt)) {
    return exportFailure("91tob-export-invalid", [
      issue("91tob-export-timestamp-invalid", "meta.exported_at"),
    ]);
  }
  const hero = exportHero(build, context.heroTraitModel, context, issues);
  const skills = exportSkills(build, context.skillModel, issues);
  const pactspirits = exportPactSpirits(build, context, issues);
  const divinity = export91TobDivinitySection(build.divinity, context);
  if (!divinity.ok) issues.push(...divinity.issues);
  if (issues.some(({ code }) => code === "validation-context-unavailable")) {
    return exportFailure("context-unavailable", issues);
  }
  if (issues.length) return exportFailure("91tob-export-invalid", issues);

  const buildId = typeof build.id === "string" && build.id.trim()
    ? build.id.trim()
    : `tob-export-${Date.parse(exportedAt)}`;
  const document = {
    schema_version: TOB91_BUILD_DOCUMENT_SCHEMA_VERSION,
    meta: {
      build_id: buildId,
      build_name: typeof build.name === "string" && build.name.trim()
        ? build.name.trim()
        : "TOB 빌드",
      client: "fe-editor",
      client_version: "0.1.0",
      engine_target: "PythonSrc/Engine",
      exported_at: exportedAt,
      notes: typeof build.research?.notes === "string" ? build.research.notes : "",
    },
    module_versions: Object.fromEntries(VERIFIED_MODULE_KEYS.map((key) => [key, "beta_0.6"])),
    character: { level: build.heroLevel },
    hero,
    skills,
    gear: gear.section,
    talents: talents.section,
    pactspirits,
    divinity: divinity.section,
    custom: { sources: exportCustomSources(build.customAffixes) },
    combat: exportCombat(build),
    options: { skill_panels: {} },
    extensions: {},
  };
  const shapeIssues = observedSparseShapeIssues(document);
  const unsupportedIssues = unsupportedGameplayIssues(document, context);
  if (shapeIssues.length || unsupportedIssues.length) {
    return exportFailure("91tob-export-invalid", [...shapeIssues, ...unsupportedIssues]);
  }
  return {
    ok: true,
    reason: null,
    issues: [],
    document,
    exportedSections: [
      "character",
      "hero",
      "pactspirits",
      "skills",
      ...(gear.mapped ? ["gear"] : []),
      ...(talents.mapped ? ["talents"] : []),
      ...(divinity.mapped ? ["divinity"] : []),
      "conditions",
      "custom",
    ],
  };
}

export function serialize91TobBuildDocument(build, context, options = {}) {
  const result = export91TobBuildDocument(build, context, options);
  if (!result.ok) {
    const codes = result.issues.map(({ code }) => code).join(",");
    throw new Error(`${result.reason}:${codes}`);
  }
  return JSON.stringify(result.document, null, 2);
}

function fail(reason, issues) {
  return { ok: false, reason, issues, build: null };
}

/**
 * Converts only identities and state whose semantics are exact in both models.
 * Unsupported gameplay sections fail closed. Unmapped source payload is never
 * copied into the local build; provenance stores only verified path labels.
 */
export function convert91TobBuildDocument(input, context, baseBuild) {
  const inspection = inspect91TobBuildDocumentEnvelope(input);
  if (!inspection.candidate) return fail("not-91tob-document", []);
  if (!inspection.importSupported) {
    const reason = inspection.reason === "unsupported-schema-version"
      ? "unsupported-external-schema-version"
      : "external-format-invalid";
    return fail(reason, inspection.issues);
  }

  const shapeIssues = REQUIRED_OBJECT_SECTIONS
    .filter((section) => !isPlainObject(input[section]))
    .map((section) => issue("91tob-section-invalid", section));
  if (shapeIssues.length) return fail("external-format-invalid", shapeIssues);
  const observedShapeIssues = observedSparseShapeIssues(input);
  if (observedShapeIssues.length) return fail("external-format-invalid", observedShapeIssues);

  const gearInspection = inspect91TobGearSection(input.gear);
  if (gearInspection.status === "invalid") {
    return fail("external-format-invalid", [issue("91tob-gear-document-invalid", "gear")]);
  }
  const talentInspection = inspect91TobTalentSection(input.talents, context?.talentModel);
  if (talentInspection.status === "invalid") {
    return fail("external-format-invalid", [issue("91tob-talent-document-invalid", "talents")]);
  }
  if (talentInspection.status === "unavailable") {
    return fail("context-unavailable", [issue("validation-context-unavailable", "talents")]);
  }

  const unsupported = unsupportedGameplayIssues(input, context);
  if (unsupported.length) return fail("external-format-unsupported", unsupported);
  if (!isPlainObject(baseBuild)) {
    return fail("context-unavailable", [issue("validation-context-unavailable", "baseBuild")]);
  }

  const level = input.character.level;
  if (!Number.isInteger(level) || level < 1 || level > 100) {
    return fail("external-format-invalid", [
      issue("91tob-character-level-invalid", "character.level"),
    ]);
  }

  const build = cloneJson(baseBuild);
  const mappedPaths = [];
  const elixirMappingReceipts = [];
  const modularizationMappingReceipts = [];
  const irisSpiritMappingReceipts = [];
  const divinityMappingReceipts = [];
  const pactDestinyMappingReceipts = [];
  const gearMappingReceipts = [];
  const talentMappingReceipts = [];
  const mappingIssues = [];
  const sourceName = typeof input.meta.build_name === "string" ? input.meta.build_name.trim() : "";
  if (sourceName) build.name = sourceName;
  if (validIsoTimestamp(input.meta.exported_at)) build.updatedAt = input.meta.exported_at;
  build.research = {
    ...(build.research ?? {}),
    season: typeof input.talents.season_label === "string" ? input.talents.season_label : "",
    sources: ["https://91tob.com/"],
    notes: typeof input.meta.notes === "string" ? input.meta.notes : "",
  };
  mappedPaths.push("meta.build_name", "meta.exported_at", "meta.notes");

  build.heroLevel = level;
  build.hero = { ...build.hero, level };
  mapHero(input, build, context, level, mappingIssues, mappedPaths);
  mapPactSpirits(
    input,
    build,
    context,
    mappingIssues,
    mappedPaths,
    pactDestinyMappingReceipts,
  );
  const mappedSkills = mapSkills(
    input,
    build,
    context,
    mappingIssues,
    mappedPaths,
    elixirMappingReceipts,
    modularizationMappingReceipts,
    irisSpiritMappingReceipts,
  );
  const mappedCombat = mapCombatConditions(input, build, mappedPaths);
  const gearResult = import91TobGearSection(input.gear);
  let mappedGear = false;
  if (!gearResult.ok) mappingIssues.push(...gearResult.issues);
  else {
    build.gear = gearResult.gear;
    build.selections = {
      ...(build.selections ?? {}),
      gear: gearResult.gear.slots.map((slot) => slot?.itemId ?? null),
    };
    build.gearAffixes = {};
    build.gearRolls = {};
    build.gearCrafts = {};
    build.gearCorruptions = {};
    build.gearLegendaryDrafts = {};
    mappedPaths.push(...gearResult.mappedPaths);
    gearMappingReceipts.push(...gearResult.mappings);
    mappedGear = gearResult.mapped;
  }
  const talentResult = import91TobTalentSection(input.talents, context.talentModel);
  let mappedTalent = false;
  if (!talentResult.ok) mappingIssues.push(...talentResult.issues);
  else {
    build.talents = talentResult.talents;
    mappedPaths.push(...talentResult.mappedPaths);
    talentMappingReceipts.push(...talentResult.mappings);
    mappedTalent = talentResult.mapped;
  }
  let mappedDivinity = false;
  if (hasDivinityPayload(input.divinity)) {
    const divinityResult = import91TobDivinitySection(input.divinity, context);
    if (!divinityResult.ok) mappingIssues.push(...divinityResult.issues);
    else {
      build.divinity = divinityResult.divinity;
      mappedPaths.push(...divinityResult.mappedPaths);
      divinityMappingReceipts.push(...divinityResult.mappings);
      mappedDivinity = true;
    }
  }
  const customAffixLines = verifiedCustomAffixLines(input.custom);
  if (customAffixLines) {
    build.customAffixes = customAffixLines.join("\n");
    mappedPaths.push("custom.sources[0].mod_texts");
  }
  if (mappingIssues.some(({ code }) => code === "validation-context-unavailable")) {
    return fail("context-unavailable", mappingIssues);
  }
  if (mappingIssues.length) return fail("external-format-invalid", mappingIssues);

  const mappedSections = ["character"];
  if (mappedPaths.some((path) => path.startsWith("hero."))) mappedSections.push("hero");
  if (mappedPaths.some((path) => path.startsWith("pactspirits."))) mappedSections.push("pactspirits");
  if (mappedSkills) mappedSections.push("skills");
  if (mappedGear) mappedSections.push("gear");
  if (mappedTalent) mappedSections.push("talents");
  if (mappedCombat) mappedSections.push("conditions");
  if (mappedDivinity) mappedSections.push("divinity");
  if (mappedPaths.some((path) => path.startsWith("custom."))) mappedSections.push("custom");
  const provenanceKey = "91tob-bd_document_v1";
  build.calculation = {
    ...(build.calculation ?? {}),
    externalImportProvenance: {
      ...(build.calculation?.externalImportProvenance ?? {}),
      [provenanceKey]: {
        sourceFormat: TOB91_BUILD_DOCUMENT_FORMAT,
        schemaVersion: TOB91_BUILD_DOCUMENT_SCHEMA_VERSION,
        sourceExportedAt: input.meta.exported_at,
        mappingPolicy: "verified-exact-mappings-fail-closed-gameplay",
        mappedPaths,
        elixirIdentityReceiptSha256: TOB91_ELIXIR_INTEROP_RECEIPT.identitySha256,
        elixirMappings: elixirMappingReceipts,
        modularizationIdentityReceiptSha256:
          TOB91_MODULARIZATION_INTEROP_RECEIPT.identitySha256,
        modularizationMappings: modularizationMappingReceipts,
        irisSpiritIdentityReceiptSha256:
          TOB91_IRIS_SPIRIT_INTEROP_RECEIPT.identitySha256,
        irisSpiritMappings: irisSpiritMappingReceipts,
        divinityInteropReceiptSha256: TOB91_DIVINITY_INTEROP_RECEIPT.identitySha256,
        divinityMappings: divinityMappingReceipts,
        pactDestinyIdentityReceiptSha256: TOB91_DESTINY_INTEROP_RECEIPT.identitySha256,
        pactDestinyMappings: pactDestinyMappingReceipts,
        gearInteropReceiptSha256: TOB91_GEAR_INTEROP_RECEIPT.identitySha256,
        gearMappings: gearMappingReceipts,
        talentInteropReceiptSha256: TOB91_TALENT_INTEROP_RECEIPT.identitySha256,
        talentMappings: talentMappingReceipts,
        verifiedSparseDefaults: [
          ...(mappedSkills ? [] : ["skills"]),
          ...(mappedGear ? [] : ["gear"]),
          ...(mappedTalent ? [] : ["talents"]),
          ...(mappedDivinity ? [] : ["divinity"]),
          ...(mappedCombat ? [] : ["combat"]),
          ...(customAffixLines ? [] : ["custom"]),
          "options",
          "extensions",
        ],
        ignoredMetadataPaths: [
          "meta.build_id",
          "meta.client",
          "meta.client_version",
          "meta.engine_target",
          "module_versions",
          "hero.selected_hero_name",
          "hero.selected_trait_nodes[].description",
          "hero.selected_trait_nodes[].option_name",
          "hero.selected_trait_nodes[].selection_key",
          "hero.selected_trait_nodes[].stage_level",
          "hero.selected_trait_nodes[].option_id",
          "hero.selected_trait_nodes[].required_level",
          ...(mappedSkills ? [
            "skills.core_skill.description",
            "skills.core_skill.skill_types",
            "skills.active_skills[].description",
            "skills.active_skills[].skill_types",
            "skills.passive_skills[].description",
            "skills.passive_skills[].skill_types",
            "skills.*.support_skills[].description",
            "skills.*.support_skills[].skill_types",
          ] : ["skills.state_flags"]),
          "gear.slot_order",
          ...(mappedTalent ? [] : [
            "talents.catalog_version",
            "talents.season_label",
            "talents.talent_catalog_fingerprint",
          ]),
          ...(mappedDivinity ? [] : [
            "divinity.board_mask_version",
            "divinity.divinity_catalog_fingerprint",
          ]),
          "divinity.preset_name",
          ...(pactDestinyMappingReceipts.length > 0
            ? []
            : ["pactspirits.destiny_catalog_fingerprint"]),
          "pactspirits.pactspirit_catalog_fingerprint",
          ...(mappedCombat ? [
            "combat.debug",
            "combat.enemy",
          ] : []),
          ...(customAffixLines ? [
            "custom.sources[0].source_id",
            "custom.sources[0].source_name",
            "custom.sources[0].enabled",
          ] : []),
        ],
      },
    },
  };

  return {
    ok: true,
    reason: null,
    issues: [],
    build,
    sourceFormat: provenanceKey,
    mappedSections,
    preservedSections: [],
  };
}
