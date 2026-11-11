import { getCatalogItems } from "./catalog.js";
import { TOB91_GEAR_INTEROP_RECEIPT } from "./data/91tobGearInterop.ss13_4.generated.js";

const SLOT_ORDER = TOB91_GEAR_INTEROP_RECEIPT.slotOrder;
const BUCKET_ORDER = Object.freeze([
  "base_implicit",
  "base_explicit",
  "corrosion",
  "dream",
  "nightmare",
  "craft_prefix",
  "craft_suffix",
  "legendary",
  "special",
]);
const BASE_STAT_KEYS = Object.freeze([
  "min_damage",
  "max_damage",
  "attack_speed",
  "crit_rating",
  "base_armor",
  "base_evasion",
  "base_energy_shield",
]);
const ITEM_KEYS = Object.freeze([
  "item_id",
  "equip_slot",
  "editor_kind",
  "item_class",
  "base_type_id",
  "base_type_name",
  "name",
  "rarity",
  "item_level",
  "quality_value",
  "state_flags",
  "base_stats",
  "editor_state",
  "affix_buckets",
  "active_affix_order",
]);
const AFFIX_KEYS = Object.freeze([
  "affix_id",
  "owner_id",
  "owner_kind",
  "owner_slot",
  "source_domain",
  "source_system",
  "source_subtype",
  "slot_id",
  "group_id",
  "option_id",
  "variant",
  "tier_id",
  "tier",
  "raw_text",
  "normalized_text",
  "render_template",
  "rolls",
  "activation_rule",
  "state_flags",
  "enabled",
  "tags",
  "bucket",
  "position",
]);
const LOCAL_GEAR_SLOT_KEYS = Object.freeze([
  "instanceId",
  "itemId",
  "affixText",
  "rolls",
  "crafts",
  "corrupted",
  "legendaryDraft",
]);
const WEAPON_BASE_TYPE_IDS = Object.freeze({
  "weapon-claw": "claw",
  "weapon-dagger": "dagger",
  "weapon-one-handed-sword": "one_handed_sword",
  "weapon-one-handed-hammer": "one_handed_hammer",
  "weapon-one-handed-axe": "one_handed_axe",
  "weapon-wand": "wand",
  "weapon-rod": "rod",
  "weapon-scepter": "scepter",
  "weapon-cane": "cane",
  "weapon-pistol": "pistol",
  "weapon-two-handed-sword": "two_handed_sword",
  "weapon-two-handed-hammer": "two_handed_hammer",
  "weapon-two-handed-axe": "two_handed_axe",
  "weapon-tin-staff": "staff",
  "weapon-cudgel": "cudgel",
  "weapon-bow": "bow",
  "weapon-crossbow": "crossbow",
  "weapon-musket": "musket",
  "weapon-fire-cannon": "fire_cannon",
});

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sameKeys(value, expectedKeys) {
  return isPlainObject(value)
    && Object.keys(value).length === expectedKeys.length
    && expectedKeys.every((key) => Object.hasOwn(value, key));
}

function allowedKeys(value, allowed) {
  return isPlainObject(value) && Object.keys(value).every((key) => allowed.includes(key));
}

function sameSerializableValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((entry, index) => sameSerializableValue(entry, right[index]));
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

function issue(code, path = "gear") {
  return { code, path };
}

function canonicalSourceUrl(value) {
  try {
    const url = new URL(value);
    const slug = decodeURIComponent(url.pathname.split("/").pop() ?? "")
      .replace(/['’]/gu, "");
    return `${url.origin}/${slug}`;
  } catch {
    return "";
  }
}

function sourceRollDefsMatch(source, local) {
  const sourceRolls = source?.rollDefs ?? [];
  const localRolls = local?.rollDefs ?? [];
  return sourceRolls.length === localRolls.length
    && sourceRolls.every((roll, index) => (
      roll.key === localRolls[index]?.key
      && Number(roll.min) === Number(localRolls[index]?.min)
      && Number(roll.max) === Number(localRolls[index]?.max)
      && Number(roll.precision ?? 0) === Number(localRolls[index]?.precision ?? 0)
    ));
}

function sourceVariantMatches(source, local) {
  if (!source || !local) return source == null && local == null;
  return (!local.sourceModifierId || source.modifierIds.includes(local.sourceModifierId))
    && sourceRollDefsMatch(source, local);
}

function sourceAffixSlotsMatch(source, local) {
  return Array.isArray(local)
    && source.length === local.length
    && source.every((slot, index) => (
      slot.slotId === local[index]?.slotId
      && Number(slot.order) === Number(local[index]?.order)
      && sourceVariantMatches(slot.normal, local[index]?.normal)
      && sourceVariantMatches(slot.corroded, local[index]?.corroded)
    ));
}

function allowedSlotsForLocalItem(item, sourceCategoryId) {
  const tags = new Set(item?.tags ?? []);
  if (sourceCategoryId.startsWith("helmet-")) return ["helmet"];
  if (sourceCategoryId.startsWith("chest-")) return ["chest"];
  if (sourceCategoryId.startsWith("gloves-")) return ["gloves"];
  if (sourceCategoryId.startsWith("boots-")) return ["boots"];
  if (sourceCategoryId === "trinket-necklace") return ["necklace"];
  if (sourceCategoryId === "trinket-belt") return ["belt"];
  if (sourceCategoryId === "trinket-ring" || sourceCategoryId === "trinket-spirit-ring") {
    return ["ring-left", "ring-right"];
  }
  if (sourceCategoryId.startsWith("shield-")) return tags.has("offHand") ? ["weapon-off"] : [];
  if (sourceCategoryId.startsWith("weapon-")) {
    return [
      ...(tags.has("mainHand") ? ["weapon-main"] : []),
      ...(tags.has("oneHand") || tags.has("offHand") ? ["weapon-off"] : []),
    ];
  }
  return [];
}

function bindCurrentCatalog() {
  const currentById = new Map(getCatalogItems("gear").map((item) => [item.id, item]));
  const byLocalItemId = new Map();
  const byPublicItemId = new Map();
  const bySourceSlug = new Map();
  for (const mapping of TOB91_GEAR_INTEROP_RECEIPT.supportedItems) {
    const current = currentById.get(mapping.localItemId);
    if (!current
      || current.sourceSeason !== "SS13"
      || current.tlidbStableKey !== mapping.localStableKey
      || current.tlidbText?.cn?.sourceUrl !== mapping.localCnSourceUrl
      || current.tlidbText?.cn?.sourcePageSha256 !== mapping.localCnSourcePageSha256
      || canonicalSourceUrl(current.tlidbText?.cn?.sourceUrl)
        !== canonicalSourceUrl(mapping.sourceUrl)
      || !sameSerializableValue(
        allowedSlotsForLocalItem(current, mapping.sourceCategoryId),
        mapping.allowedSlots,
      )
      || !sourceAffixSlotsMatch(mapping.affixSlots, current.legendaryAffixes ?? [])
      || byLocalItemId.has(mapping.localItemId)
      || byPublicItemId.has(mapping.publicItemId)
      || bySourceSlug.has(mapping.sourceSlug)) {
      return null;
    }
    const bound = Object.freeze({ mapping, current });
    byLocalItemId.set(mapping.localItemId, bound);
    byPublicItemId.set(mapping.publicItemId, bound);
    bySourceSlug.set(mapping.sourceSlug, bound);
  }
  return Object.freeze({ byLocalItemId, byPublicItemId, bySourceSlug });
}

const CURRENT_CATALOG = bindCurrentCatalog();

function stringOrNullShapeValid(value) {
  return value === null || typeof value === "string";
}

function affixShapeValid(value, bucket, position) {
  return sameKeys(value, AFFIX_KEYS)
    && typeof value.affix_id === "string"
    && typeof value.owner_id === "string"
    && value.owner_kind === "item"
    && typeof value.owner_slot === "string"
    && value.source_domain === "equipment"
    && typeof value.source_system === "string"
    && typeof value.source_subtype === "string"
    && stringOrNullShapeValid(value.slot_id)
    && stringOrNullShapeValid(value.group_id)
    && stringOrNullShapeValid(value.option_id)
    && stringOrNullShapeValid(value.variant)
    && stringOrNullShapeValid(value.tier_id)
    && (value.tier === null || Number.isFinite(value.tier))
    && typeof value.raw_text === "string"
    && typeof value.normalized_text === "string"
    && typeof value.render_template === "string"
    && isPlainObject(value.rolls)
    && Object.values(value.rolls).every(Number.isFinite)
    && sameKeys(value.activation_rule, ["kind", "payload"])
    && typeof value.activation_rule.kind === "string"
    && isPlainObject(value.activation_rule.payload)
    && isPlainObject(value.state_flags)
    && typeof value.enabled === "boolean"
    && Array.isArray(value.tags)
    && value.tags.every((tag) => typeof tag === "string")
    && value.bucket === bucket
    && value.position === position;
}

function itemShapeValid(value) {
  return sameKeys(value, ITEM_KEYS)
    && typeof value.item_id === "string"
    && typeof value.equip_slot === "string"
    && typeof value.editor_kind === "string"
    && typeof value.item_class === "string"
    && typeof value.base_type_id === "string"
    && typeof value.base_type_name === "string"
    && typeof value.name === "string"
    && typeof value.rarity === "string"
    && Number.isInteger(value.item_level)
    && (value.quality_value === null || Number.isFinite(value.quality_value))
    && sameKeys(value.state_flags, ["corroded", "dreamed", "nightmared", "bound"])
    && Object.values(value.state_flags).every((flag) => typeof flag === "boolean")
    && sameKeys(value.base_stats, BASE_STAT_KEYS)
    && BASE_STAT_KEYS.every((key) => Number.isFinite(value.base_stats[key]))
    && sameKeys(value.editor_state, [
      "source_item_id",
      "category_id",
      "source_url",
      "legendary_slug",
    ])
    && typeof value.editor_state.source_item_id === "string"
    && typeof value.editor_state.category_id === "string"
    && typeof value.editor_state.source_url === "string"
    && typeof value.editor_state.legendary_slug === "string"
    && sameKeys(value.affix_buckets, BUCKET_ORDER)
    && BUCKET_ORDER.every((bucket) => (
      Array.isArray(value.affix_buckets[bucket])
      && value.affix_buckets[bucket].every((affix, index) => affixShapeValid(affix, bucket, index))
    ))
    && Array.isArray(value.active_affix_order)
    && value.active_affix_order.every((affixId) => typeof affixId === "string");
}

export function tob91GearSectionShapeValid(value) {
  return sameKeys(value, ["slot_order", "equipped_slots", "items"])
    && Array.isArray(value.slot_order)
    && sameSerializableValue(value.slot_order, SLOT_ORDER)
    && isPlainObject(value.equipped_slots)
    && Object.entries(value.equipped_slots).every(([slotId, itemId]) => (
      SLOT_ORDER.includes(slotId) && typeof itemId === "string" && Boolean(itemId)
    ))
    && isPlainObject(value.items)
    && Object.values(value.items).every(itemShapeValid);
}

export function has91TobGearPayload(value) {
  return isPlainObject(value?.equipped_slots)
    && Object.keys(value.equipped_slots).length > 0;
}

export function getVerified91TobGearCorrosionLimit(localItemId) {
  const limit = CURRENT_CATALOG?.byLocalItemId.get(localItemId)?.mapping?.corrosionLimit;
  return Number.isInteger(limit) && limit >= 0 ? limit : null;
}

function rollValueValid(value, definition) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < Number(definition.min) || value > Number(definition.max)) return false;
  const precision = Math.max(0, Number(definition.precision) || 0);
  return Number(value.toFixed(precision)) === value;
}

function renderedNumber(value, precision) {
  const fixed = Number(value).toFixed(Math.max(0, Number(precision) || 0));
  return Number(precision) > 0 ? fixed.replace(/\.?0+$/u, "") : fixed;
}

function renderVariant(variant, rolls) {
  if (!variant.rollDefs.length) return variant.text;
  return variant.rollDefs.reduce((text, definition) => (
    text.split(`{{${definition.key}}}`).join(renderedNumber(
      rolls[definition.key],
      definition.precision,
    ))
  ), variant.renderTemplate);
}

function splitLines(value) {
  return String(value ?? "")
    .replace(/\r\n/gu, "\n")
    .replace(/\r/gu, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchingLines(value, expected) {
  const lines = splitLines(value);
  return lines.length === expected.length ? lines : expected;
}

function pushAffix(item, bucket, source) {
  const rawLines = splitLines(source.raw_text);
  if (rawLines.length <= 1) {
    const affix = { ...source, bucket, position: item.affix_buckets[bucket].length };
    item.affix_buckets[bucket].push(affix);
    item.active_affix_order.push(affix.affix_id);
    return;
  }
  const normalizedLines = matchingLines(source.normalized_text, rawLines);
  const templateLines = matchingLines(source.render_template, rawLines);
  for (const [index, rawText] of rawLines.entries()) {
    const affix = {
      ...source,
      affix_id: index === 0 ? source.affix_id : `${source.affix_id}:line:${index + 1}`,
      raw_text: rawText,
      normalized_text: normalizedLines[index] ?? rawText,
      render_template: templateLines[index] ?? source.render_template,
      bucket,
      position: item.affix_buckets[bucket].length,
    };
    item.affix_buckets[bucket].push(affix);
    item.active_affix_order.push(affix.affix_id);
  }
}

function isPublicBaseStat(value) {
  const text = String(value ?? "").trim();
  return /^([+-]?\d+(?:\.\d+)?)\s*-\s*([+-]?\d+(?:\.\d+)?)\s*物理伤害$/u.test(text)
    || /^([+-]?\d+(?:\.\d+)?)\s*暴击值$/u.test(text)
    || /^([+-]?\d+(?:\.\d+)?)\s*攻击速度$/u.test(text)
    || /^([+-]?\d+(?:\.\d+)?)\s*护甲$/u.test(text)
    || /^([+-]?\d+(?:\.\d+)?)\s*(?:闪避|闪避值)$/u.test(text)
    || /^([+-]?\d+(?:\.\d+)?)\s*(?:能量护盾|护盾)$/u.test(text);
}

function baseType(mapping, equipSlot) {
  if (equipSlot === "weapon-main" || equipSlot === "weapon-off") {
    const shield = mapping.sourceCategoryId.startsWith("shield-");
    return {
      editor_kind: "weapon",
      item_class: shield ? "shield" : "weapon",
      base_type_id: shield
        ? "shield"
        : WEAPON_BASE_TYPE_IDS[mapping.sourceCategoryId]
          ?? mapping.sourceCategoryId.replace(/-/gu, "_"),
      base_type_name: "传奇装备",
    };
  }
  return {
    editor_kind: "equipment",
    item_class: "equipment",
    base_type_id: equipSlot,
    base_type_name: "传奇装备",
  };
}

function emptyBuckets() {
  return Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, []]));
}

function projectPublicItem(mapping, equipSlot, state) {
  const itemId = `item.${equipSlot}`;
  const type = baseType(mapping, equipSlot);
  const item = {
    item_id: itemId,
    equip_slot: equipSlot,
    ...type,
    name: mapping.sourceName,
    rarity: "legendary",
    item_level: mapping.itemLevel,
    quality_value: null,
    state_flags: {
      corroded: state.corrodedSlotIds.length > 0,
      dreamed: false,
      nightmared: false,
      bound: false,
    },
    base_stats: { ...mapping.baseStats },
    editor_state: {
      source_item_id: mapping.publicItemId,
      category_id: mapping.sourceCategoryId,
      source_url: mapping.sourceUrl,
      legendary_slug: mapping.sourceSlug,
    },
    affix_buckets: emptyBuckets(),
    active_affix_order: [],
  };
  for (const property of mapping.baseProperties) {
    if (isPublicBaseStat(property.text)) continue;
    const index = item.affix_buckets.base_implicit.length;
    pushAffix(item, "base_implicit", {
      affix_id: `affix.item.${equipSlot}.base_implicit.${index}`,
      owner_id: itemId,
      owner_kind: "item",
      owner_slot: equipSlot,
      source_domain: "equipment",
      source_system: "legendary_detail",
      source_subtype: "base_implicit",
      slot_id: null,
      group_id: null,
      option_id: null,
      variant: null,
      tier_id: null,
      tier: null,
      raw_text: property.text,
      normalized_text: property.text,
      render_template: property.renderTemplate,
      rolls: {},
      activation_rule: { kind: "always_on", payload: {} },
      state_flags: {},
      enabled: true,
      tags: [...property.modifierIds],
    });
  }
  const corroded = new Set(state.corrodedSlotIds);
  for (const slot of mapping.affixSlots) {
    const isCorroded = corroded.has(slot.slotId);
    const variantName = isCorroded ? "corroded" : "normal";
    const variant = slot[variantName];
    if (!variant) return null;
    const rolls = state.rollValuesBySlot[slot.slotId] ?? {};
    const rendered = renderVariant(variant, rolls);
    const index = item.affix_buckets.legendary.length;
    pushAffix(item, "legendary", {
      affix_id: `affix.item.${equipSlot}.legendary.${index}`,
      owner_id: itemId,
      owner_kind: "item",
      owner_slot: equipSlot,
      source_domain: "equipment",
      source_system: "legendary_detail",
      source_subtype: isCorroded ? "legendary_corroded" : "legendary_normal",
      slot_id: slot.slotId,
      group_id: slot.slotId,
      option_id: null,
      variant: variantName,
      tier_id: null,
      tier: null,
      raw_text: rendered,
      normalized_text: rendered,
      render_template: variant.renderTemplate,
      rolls: { ...rolls },
      activation_rule: { kind: "always_on", payload: {} },
      state_flags: { corroded: isCorroded },
      enabled: true,
      tags: [...variant.modifierIds],
    });
  }
  return item;
}

function publicStateFromItem(item, mapping) {
  const rows = item.affix_buckets.legendary;
  const expectedSlotIds = new Set(mapping.affixSlots.map(({ slotId }) => slotId));
  if (rows.some(({ slot_id: slotId }) => !expectedSlotIds.has(slotId))) return null;
  const corrodedSlotIds = [];
  const rollValuesBySlot = {};
  for (const slot of mapping.affixSlots) {
    const slotRows = rows.filter(({ slot_id: slotId }) => slotId === slot.slotId);
    if (!slotRows.length) return null;
    const variantName = slotRows[0].variant;
    if (variantName !== "normal" && variantName !== "corroded") return null;
    const variant = slot[variantName];
    if (!variant || slotRows.some((row) => (
      row.variant !== variantName
      || row.option_id !== null
      || !sameSerializableValue(row.rolls, slotRows[0].rolls)
    ))) return null;
    const expectedRollKeys = variant.rollDefs.map(({ key }) => key).sort();
    const actualRollKeys = Object.keys(slotRows[0].rolls).sort();
    if (!sameSerializableValue(expectedRollKeys, actualRollKeys)
      || variant.rollDefs.some((definition) => (
        !rollValueValid(slotRows[0].rolls[definition.key], definition)
      ))) return null;
    if (variantName === "corroded") corrodedSlotIds.push(slot.slotId);
    rollValuesBySlot[slot.slotId] = { ...slotRows[0].rolls };
  }
  if (corrodedSlotIds.length > mapping.corrosionLimit) return null;
  return { corrodedSlotIds, rollValuesBySlot };
}

function exactBoundMapping(item) {
  if (!CURRENT_CATALOG) return null;
  const byPublicId = CURRENT_CATALOG.byPublicItemId.get(item.editor_state.source_item_id);
  const bySlug = CURRENT_CATALOG.bySourceSlug.get(item.editor_state.legendary_slug);
  if (byPublicId && bySlug && byPublicId !== bySlug) return null;
  return byPublicId ?? bySlug ?? null;
}

export function inspect91TobGearSection(section) {
  if (!tob91GearSectionShapeValid(section)) {
    return { status: "invalid", mapped: false, entries: [] };
  }
  const equippedEntries = Object.entries(section.equipped_slots);
  const referencedItemIds = equippedEntries.map(([, itemId]) => itemId);
  if (new Set(referencedItemIds).size !== referencedItemIds.length
    || Object.keys(section.items).length !== referencedItemIds.length
    || Object.keys(section.items).some((itemId) => !referencedItemIds.includes(itemId))) {
    return { status: "invalid", mapped: false, entries: [] };
  }
  const entries = [];
  for (const [equipSlot, itemId] of equippedEntries) {
    const item = section.items[itemId];
    if (!item || item.item_id !== itemId || item.equip_slot !== equipSlot) {
      return { status: "invalid", mapped: false, entries: [] };
    }
    const bound = exactBoundMapping(item);
    if (!bound) return { status: "unsupported", mapped: false, entries: [] };
    const { mapping } = bound;
    if (!mapping.allowedSlots.includes(equipSlot)) {
      return { status: "invalid", mapped: false, entries: [] };
    }
    const state = publicStateFromItem(item, mapping);
    const expected = state ? projectPublicItem(mapping, equipSlot, state) : null;
    if (!state || !expected || !sameSerializableValue(item, expected)) {
      return { status: "invalid", mapped: false, entries: [] };
    }
    const rolls = {};
    for (const slot of mapping.affixSlots) {
      const variantName = state.corrodedSlotIds.includes(slot.slotId) ? "corroded" : "normal";
      for (const definition of slot[variantName].rollDefs) {
        rolls[`legendary:${slot.slotId}:${variantName}:${definition.key}`]
          = state.rollValuesBySlot[slot.slotId][definition.key];
      }
    }
    entries.push({ equipSlot, itemId, bound, state, rolls });
  }
  return { status: "valid", mapped: entries.length > 0, entries };
}

function localStateFromSlot(slot, mapping) {
  const affixText = slot?.affixText ?? "";
  const rolls = slot?.rolls ?? {};
  const crafts = slot?.crafts ?? {};
  const corrupted = slot?.corrupted ?? false;
  if (!allowedKeys(slot, LOCAL_GEAR_SLOT_KEYS)
    || typeof slot.instanceId !== "string"
    || !slot.instanceId
    || slot.itemId !== mapping.localItemId
    || affixText !== ""
    || !isPlainObject(rolls)
    || !isPlainObject(crafts)
    || Object.keys(crafts).length > 0
    || (slot.legendaryDraft !== null
      && slot.legendaryDraft !== undefined
      && !sameKeys(slot.legendaryDraft, ["corrodedSlotIds"]))
    || (slot.legendaryDraft?.corrodedSlotIds !== undefined
      && !Array.isArray(slot.legendaryDraft.corrodedSlotIds))) return null;
  const corrodedSlotIds = slot.legendaryDraft?.corrodedSlotIds ?? [];
  if (corrodedSlotIds.some((slotId) => typeof slotId !== "string")
    || new Set(corrodedSlotIds).size !== corrodedSlotIds.length
    || corrodedSlotIds.length > mapping.corrosionLimit
    || corrodedSlotIds.some((slotId) => !mapping.affixSlots.some((entry) => (
      entry.slotId === slotId && entry.corroded
    )))
    || Boolean(corrupted) !== (corrodedSlotIds.length > 0)) return null;
  const activeRollKeys = new Set();
  const rollValuesBySlot = {};
  for (const affixSlot of mapping.affixSlots) {
    const variantName = corrodedSlotIds.includes(affixSlot.slotId) ? "corroded" : "normal";
    const variant = affixSlot[variantName];
    if (!variant) return null;
    const values = {};
    for (const definition of variant.rollDefs) {
      const key = `legendary:${affixSlot.slotId}:${variantName}:${definition.key}`;
      activeRollKeys.add(key);
      const value = Object.hasOwn(rolls, key) ? rolls[key] : Number(definition.max);
      if (!rollValueValid(value, definition)) return null;
      values[definition.key] = value;
    }
    rollValuesBySlot[affixSlot.slotId] = values;
  }
  if (Object.keys(rolls).some((key) => !activeRollKeys.has(key))) return null;
  return { corrodedSlotIds: [...corrodedSlotIds], rollValuesBySlot };
}

function emptySection() {
  return {
    slot_order: [...SLOT_ORDER],
    equipped_slots: {},
    items: {},
  };
}

export function export91TobGearSection(gear) {
  if (!CURRENT_CATALOG) {
    return {
      ok: false,
      issues: [issue("validation-context-unavailable")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  if (!isPlainObject(gear)
    || !Array.isArray(gear.slots)
    || !Array.isArray(gear.inventory)) {
    return {
      ok: false,
      issues: [issue("91tob-export-gear-state-invalid")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  if (gear.inventory.length > 0 || gear.slots.slice(SLOT_ORDER.length).some(Boolean)) {
    return {
      ok: false,
      issues: [issue("91tob-export-gear-unsupported")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  const section = emptySection();
  const mappings = [];
  for (const [index, equipSlot] of SLOT_ORDER.entries()) {
    const slot = gear.slots[index];
    if (!slot) continue;
    const bound = CURRENT_CATALOG.byLocalItemId.get(slot.itemId);
    if (!bound || !bound.mapping.allowedSlots.includes(equipSlot)) {
      return {
        ok: false,
        issues: [issue("91tob-export-gear-unsupported")],
        section: null,
        mapped: false,
        mappings: [],
      };
    }
    const state = localStateFromSlot(slot, bound.mapping);
    const item = state ? projectPublicItem(bound.mapping, equipSlot, state) : null;
    if (!state || !item) {
      return {
        ok: false,
        issues: [issue("91tob-export-gear-state-invalid")],
        section: null,
        mapped: false,
        mappings: [],
      };
    }
    section.equipped_slots[equipSlot] = item.item_id;
    section.items[item.item_id] = item;
    mappings.push({
      equipSlot,
      publicItemId: bound.mapping.publicItemId,
      localItemId: bound.mapping.localItemId,
    });
  }
  return {
    ok: true,
    issues: [],
    section,
    mapped: mappings.length > 0,
    mappings,
  };
}

export function import91TobGearSection(section) {
  if (!CURRENT_CATALOG) {
    return {
      ok: false,
      issues: [issue("validation-context-unavailable")],
      gear: null,
      mapped: false,
      mappings: [],
      mappedPaths: [],
    };
  }
  const inspection = inspect91TobGearSection(section);
  if (inspection.status !== "valid") {
    return {
      ok: false,
      issues: [issue(
        inspection.status === "unsupported"
          ? "91tob-gear-mapping-unavailable"
          : "91tob-gear-document-invalid",
      )],
      gear: null,
      mapped: false,
      mappings: [],
      mappedPaths: [],
    };
  }
  const slots = Array(SLOT_ORDER.length).fill(null);
  const mappings = [];
  const mappedPaths = [];
  for (const entry of inspection.entries) {
    const index = SLOT_ORDER.indexOf(entry.equipSlot);
    slots[index] = {
      instanceId: `91tob-gear-${entry.equipSlot}`,
      itemId: entry.bound.mapping.localItemId,
      affixText: "",
      rolls: entry.rolls,
      crafts: {},
      corrupted: entry.state.corrodedSlotIds.length > 0,
      legendaryDraft: { corrodedSlotIds: [...entry.state.corrodedSlotIds] },
    };
    mappings.push({
      equipSlot: entry.equipSlot,
      publicItemId: entry.bound.mapping.publicItemId,
      localItemId: entry.bound.mapping.localItemId,
    });
    mappedPaths.push(
      `gear.equipped_slots.${entry.equipSlot}`,
      `gear.items.${entry.itemId}`,
    );
  }
  return {
    ok: true,
    issues: [],
    gear: { slots, inventory: [] },
    mapped: mappings.length > 0,
    mappings,
    mappedPaths,
  };
}
