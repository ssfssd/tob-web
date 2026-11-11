import { getCatalogItems } from "./catalog.js";
import { TOB91_TALENT_INTEROP_RECEIPT } from "./data/91tobTalentInterop.ss13_4.generated.js";
import {
  diagnoseTalentBoardState,
  getPrismBaseAffixes,
  getPrismLegendaryAffixes,
  getTalentBoardRuntime,
  normalizeTalentBoardState,
  projectTalentBoardCalculation,
  scaleTalentEffectText,
} from "./talentBoardModel.js";

const SLOT_ORDER = TOB91_TALENT_INTEROP_RECEIPT.serializerContract.slotOrder;
const COMPILED_SOURCE_KEYS =
  TOB91_TALENT_INTEROP_RECEIPT.serializerContract.compiledSourceKeys;
const SUPPORTED_TREE_SLUGS = new Set(TOB91_TALENT_INTEROP_RECEIPT.supportedTreeSlugs);
const SUPPORTED_NODE_IDS = new Set(TOB91_TALENT_INTEROP_RECEIPT.supportedNodeIds);
const SUPPORTED_CORE_IDS = new Set(TOB91_TALENT_INTEROP_RECEIPT.supportedCoreTalentIds);
const SUPPORTED_PRISM_AFFIX_IDS = new Set(
  TOB91_TALENT_INTEROP_RECEIPT.supportedPrismAffixIds ?? [],
);
const PRISM_BINDING_BY_PUBLIC_SLUG = new Map(
  (TOB91_TALENT_INTEROP_RECEIPT.prismItemBindings ?? [])
    .map((binding) => [binding.publicSlug, binding]),
);
const PRISM_BINDING_BY_LOCAL_SLUG = new Map(
  (TOB91_TALENT_INTEROP_RECEIPT.prismItemBindings ?? [])
    .map((binding) => [binding.localSlug, binding]),
);
const TALENT_ITEMS_BY_ID = new Map(getCatalogItems("talents").map((item) => [item.id, item]));
const BINDING_CACHE = new WeakMap();

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sameKeys(value, expected) {
  return isPlainObject(value)
    && Object.keys(value).length === expected.length
    && expected.every((key) => Object.hasOwn(value, key));
}

function allowedKeys(value, required, optional = []) {
  return isPlainObject(value)
    && required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
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

function issue(code, path = "talents") {
  return { code, path };
}

function fnv1a(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function compactWhitespace(value) {
  return String(value ?? "").trim().replace(/[\s\u3000]+/gu, "");
}

function compactEntryText(value) {
  return String(value ?? "").trim().replace(/ /gu, "").replace(/　/gu, "");
}

function sourceIdentity(model) {
  return {
    trees: TOB91_TALENT_INTEROP_RECEIPT.supportedTreeSlugs.map((slug) => {
      const tree = model.treeBySlug.get(slug);
      return {
        slug,
        name: tree?.name,
        kind: tree?.kind,
        coreTalentSlotCount: tree?.coreTalentSlotCount,
      };
    }),
    nodes: TOB91_TALENT_INTEROP_RECEIPT.supportedNodeIds.map((dataId) => {
      const node = model.nodeById.get(dataId);
      const flat = TALENT_ITEMS_BY_ID.get(node?.flatItemId);
      return {
        dataId,
        treeSlug: node?.treeSlug,
        x: node?.x,
        y: node?.y,
        nodeType: node?.nodeType,
        maxPoints: node?.maxPoints,
        cnDetail: flat?.tlidbText?.cn?.detail,
      };
    }),
    coreTalents: TOB91_TALENT_INTEROP_RECEIPT.supportedCoreTalentIds.map((dataId) => {
      const core = model.coreTalentById.get(dataId);
      const flat = TALENT_ITEMS_BY_ID.get(core?.flatItemId);
      return {
        dataId,
        treeSlug: core?.treeSlug,
        cnName: flat?.tlidbText?.cn?.name,
        cnDetail: flat?.tlidbText?.cn?.detail,
      };
    }),
    prisms: {
      items: model.prismItems,
      baseAffixes: model.baseAffixes,
      areaAffixes: model.areaAffixes,
      rareGaugeAffixes: model.rareGaugeAffixes,
      prismLegacyRareDisplayMappings: model.prismLegacyRareDisplayMappings,
      legendaryGaugeAffixes: model.legendaryGaugeAffixes,
      mutationAffixes: model.mutationAffixes,
      prismCoreTalentAliases: model.prismCoreTalentAliases,
    },
  };
}

function bindCurrentModel(model) {
  if (!model || typeof model !== "object") return null;
  if (BINDING_CACHE.has(model)) return BINDING_CACHE.get(model);
  if (!(model.treeBySlug instanceof Map)
    || !(model.nodeById instanceof Map)
    || !(model.coreTalentById instanceof Map)
    || fnv1a(JSON.stringify(sourceIdentity(model)))
      !== TOB91_TALENT_INTEROP_RECEIPT.runtimeIdentityFnv1a) {
    BINDING_CACHE.set(model, null);
    return null;
  }

  const nodeByTreeAndKey = new Map();
  const nodeByFlatItemId = new Map();
  for (const dataId of TOB91_TALENT_INTEROP_RECEIPT.supportedNodeIds) {
    const node = model.nodeById.get(dataId);
    const flatItem = TALENT_ITEMS_BY_ID.get(node.flatItemId);
    const bound = Object.freeze({ node, flatItem });
    nodeByTreeAndKey.set(`${node.treeSlug}:${node.x},${node.y}`, bound);
    nodeByFlatItemId.set(node.flatItemId, bound);
  }
  const coreByDataId = new Map();
  const coreByFlatItemId = new Map();
  for (const dataId of TOB91_TALENT_INTEROP_RECEIPT.supportedCoreTalentIds) {
    const core = model.coreTalentById.get(dataId);
    const flatItem = TALENT_ITEMS_BY_ID.get(core.flatItemId);
    const bound = Object.freeze({ core, flatItem });
    coreByDataId.set(dataId, bound);
    coreByFlatItemId.set(core.flatItemId, bound);
  }
  const binding = Object.freeze({
    model,
    nodeByTreeAndKey,
    nodeByFlatItemId,
    coreByDataId,
    coreByFlatItemId,
  });
  BINDING_CACHE.set(model, binding);
  return binding;
}

function pointMapShapeValid(value) {
  return isPlainObject(value)
    && Object.entries(value).every(([key, points]) => (
      /^\d+,\d+$/u.test(key)
      && Number.isInteger(points)
      && points > 0
    ));
}

function talentSlotShapeValid(slot) {
  const required = [
    "allocated_node_points_by_key",
    "allocated_reflected_node_points_by_key",
    "selected_core_talent_data_ids",
  ];
  return allowedKeys(slot, required, ["tree_slug"])
    && (!Object.hasOwn(slot, "tree_slug")
      || (typeof slot.tree_slug === "string" && Boolean(slot.tree_slug)))
    && pointMapShapeValid(slot.allocated_node_points_by_key)
    && pointMapShapeValid(slot.allocated_reflected_node_points_by_key)
    && Array.isArray(slot.selected_core_talent_data_ids)
    && slot.selected_core_talent_data_ids.every((dataId) => (
      typeof dataId === "string" && Boolean(dataId)
    ));
}

function compiledSourceShapeValid(source) {
  return sameKeys(source, ["entries"]) && Array.isArray(source.entries);
}

function exactString(value, { allowEmpty = false } = {}) {
  return typeof value === "string"
    && value === value.trim()
    && (allowEmpty || Boolean(value));
}

function prismInventoryItemShapeValid(item) {
  const required = [
    "id",
    "name",
    "prism_item_slug",
    "prism_item_name",
    "rarity",
    "base_affix_modifier_id",
    "area_affix_modifier_id",
    "rare_random_affix_modifier_id",
    "summary",
    "created_at",
  ];
  return allowedKeys(item, required, ["legendary_random_affix_modifier_id"])
    && exactString(item.id)
    && exactString(item.name, { allowEmpty: true })
    && exactString(item.prism_item_slug)
    && exactString(item.prism_item_name)
    && ["rare", "legendary"].includes(item.rarity)
    && exactString(item.base_affix_modifier_id)
    && exactString(item.area_affix_modifier_id)
    && exactString(item.rare_random_affix_modifier_id)
    && (item.rarity === "legendary"
      ? exactString(item.legendary_random_affix_modifier_id)
      : !Object.hasOwn(item, "legendary_random_affix_modifier_id"))
    && exactString(item.summary, { allowEmpty: true })
    && exactString(item.created_at);
}

function inverseImageInventoryItemShapeValid(item) {
  return sameKeys(item, [
    "id",
    "name",
    "micro_talent_effect",
    "medium_talent_effect",
    "legendary_talent_effect",
    "created_at",
  ])
    && exactString(item.id)
    && exactString(item.name, { allowEmpty: true })
    && Number.isFinite(item.micro_talent_effect)
    && Number.isFinite(item.medium_talent_effect)
    && Number.isFinite(item.legendary_talent_effect)
    && exactString(item.created_at);
}

function placementShapeValid(value, idKey) {
  return sameKeys(value, [idKey, "tree_slot_id", "position"])
    && exactString(value[idKey])
    && SLOT_ORDER.includes(value.tree_slot_id)
    && sameKeys(value.position, ["x", "y"])
    && Number.isInteger(value.position.x)
    && Number.isInteger(value.position.y);
}

export function tob91TalentSectionShapeValid(section) {
  const required = [
    "catalog_version",
    "compiled_sources",
    "inverse_image_inventory",
    "prism_inventory",
    "season_label",
    "slot_order",
    "slots",
    "talent_catalog_fingerprint",
  ];
  return allowedKeys(section, required, ["placed_prism", "placed_inverse_image"])
    && typeof section.catalog_version === "string"
    && typeof section.season_label === "string"
    && typeof section.talent_catalog_fingerprint === "string"
    && sameSerializableValue(section.slot_order, SLOT_ORDER)
    && sameKeys(section.slots, SLOT_ORDER)
    && Object.values(section.slots).every(talentSlotShapeValid)
    && sameKeys(section.compiled_sources, COMPILED_SOURCE_KEYS)
    && Object.values(section.compiled_sources).every(compiledSourceShapeValid)
    && Array.isArray(section.prism_inventory)
    && section.prism_inventory.every(prismInventoryItemShapeValid)
    && Array.isArray(section.inverse_image_inventory)
    && section.inverse_image_inventory.every(inverseImageInventoryItemShapeValid)
    && (!Object.hasOwn(section, "placed_prism")
      || placementShapeValid(section.placed_prism, "prism_id"))
    && (!Object.hasOwn(section, "placed_inverse_image")
      || placementShapeValid(section.placed_inverse_image, "inverse_image_id"));
}

function slotHasPayload(slot) {
  return Object.hasOwn(slot ?? {}, "tree_slug")
    || Object.keys(slot?.allocated_node_points_by_key ?? {}).length > 0
    || Object.keys(slot?.allocated_reflected_node_points_by_key ?? {}).length > 0
    || (slot?.selected_core_talent_data_ids ?? []).length > 0;
}

export function has91TobTalentPayload(section) {
  return Object.values(section?.slots ?? {}).some(slotHasPayload)
    || (section?.prism_inventory ?? []).length > 0
    || (section?.inverse_image_inventory ?? []).length > 0
    || Object.hasOwn(section ?? {}, "placed_prism")
    || Object.hasOwn(section ?? {}, "placed_inverse_image")
    || Object.values(section?.compiled_sources ?? {}).some((source) => (
      Array.isArray(source?.entries) && source.entries.length > 0
    ));
}

function emptyLocalBoard(slotIndex) {
  return {
    boardId: null,
    slotType: slotIndex === 0 ? "base" : "sub",
    treeSlug: null,
    nodePoints: {},
    reflectedNodePoints: {},
    selectedNodeIds: [],
    coreTalentIds: [],
  };
}

function emptyLocalState() {
  return {
    boards: SLOT_ORDER.map((_, index) => emptyLocalBoard(index)),
    prismInventory: [],
    inverseImageInventory: [],
    placedPrism: null,
    placedInverseImage: null,
  };
}

function metadataMatchesCurrentCatalog(section) {
  const contract = TOB91_TALENT_INTEROP_RECEIPT.serializerContract;
  return section.catalog_version === contract.catalogVersion
    && section.season_label === contract.seasonLabel
    && section.talent_catalog_fingerprint === contract.treeCatalogFingerprint;
}

function publicCoreHash(effect) {
  const normalized = String(effect ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("");
  return fnv1a(compactWhitespace(normalized));
}

function coreEntries(board, binding) {
  const tree = binding.model.treeBySlug.get(board.treeSlug);
  return board.coreTalentIds.map((flatItemId) => binding.coreByFlatItemId.get(flatItemId)).map((bound) => {
    const name = String(bound.flatItem.tlidbText.cn.name ?? "").trim();
    const effect = String(bound.flatItem.tlidbText.cn.detail ?? "");
    const text = compactEntryText(scaleTalentEffectText(name, 1));
    return {
      raw_text: text,
      parser_text: compactEntryText(name),
      metadata: {
        talent_node_type: "core",
        talent_core_data_id: bound.core.dataId,
        talent_core_name: name,
        talent_tree_slug: tree.slug,
        talent_tree_name: tree.name,
        talent_entry_origin: "selected_core_talent",
        season_key: TOB91_TALENT_INTEROP_RECEIPT.serializerContract.seasonLabel,
        catalog_version: TOB91_TALENT_INTEROP_RECEIPT.serializerContract.catalogVersion,
        raw_text_hash: publicCoreHash(effect),
      },
    };
  });
}

function compileSources(state, binding) {
  const projection = projectTalentBoardCalculation(binding.model, state);
  return Object.fromEntries(COMPILED_SOURCE_KEYS.map((sourceKey, index) => {
    const board = state.boards[index];
    const projected = projection.entries.filter((entry) => entry.boardIndex === index);
    const entries = [];
    let emittedSelectedCores = false;
    for (const entry of projected) {
      if (entry.origin === "selected_core_talent") {
        if (!emittedSelectedCores) entries.push(...coreEntries(board, binding));
        emittedSelectedCores = true;
        continue;
      }
      entries.push(entry.requestEntry);
    }
    return [sourceKey, {
      entries: board.treeSlug ? entries : [],
    }];
  }));
}

function publicPrismToLocal(item, model) {
  const prismBinding = PRISM_BINDING_BY_PUBLIC_SLUG.get(item.prism_item_slug);
  const definition = model.prismItemBySlug.get(prismBinding?.localSlug);
  if (!prismBinding
    || !definition
    || prismBinding.name !== item.prism_item_name
    || !prismBinding.supportedRarities.includes(item.rarity)
    || (prismBinding.baseAffixModifierId
      && prismBinding.baseAffixModifierId !== item.base_affix_modifier_id)
    || !SUPPORTED_PRISM_AFFIX_IDS.has(item.base_affix_modifier_id)
    || !SUPPORTED_PRISM_AFFIX_IDS.has(item.area_affix_modifier_id)
    || !SUPPORTED_PRISM_AFFIX_IDS.has(item.rare_random_affix_modifier_id)
    || !getPrismBaseAffixes(model, definition.slug)
      .some((affix) => affix.modifierId === item.base_affix_modifier_id)
    || !model.areaAffixes.some((affix) => affix.modifierId === item.area_affix_modifier_id)
    || !model.rareGaugeAffixes
      .some((affix) => affix.modifierId === item.rare_random_affix_modifier_id)) {
    return null;
  }
  if (item.rarity === "legendary") {
    if (!exactString(item.legendary_random_affix_modifier_id)
      || !SUPPORTED_PRISM_AFFIX_IDS.has(item.legendary_random_affix_modifier_id)
      || !getPrismLegendaryAffixes(model, definition.slug)
        .some((affix) => affix.modifierId === item.legendary_random_affix_modifier_id)) {
      return null;
    }
  } else if (Object.hasOwn(item, "legendary_random_affix_modifier_id")) {
    return null;
  }
  return {
    id: item.id,
    instanceId: item.id,
    name: item.name,
    prismItemSlug: definition.slug,
    prismItemName: definition.name,
    rarity: item.rarity,
    baseAffixModifierId: item.base_affix_modifier_id,
    areaAffixModifierId: item.area_affix_modifier_id,
    rareRandomAffixModifierId: item.rare_random_affix_modifier_id,
    legendaryRandomAffixModifierId: item.legendary_random_affix_modifier_id ?? null,
    summary: item.summary,
    createdAt: item.created_at,
  };
}

function publicInverseImageToLocal(item) {
  return {
    id: item.id,
    instanceId: item.id,
    name: item.name,
    microTalentEffect: item.micro_talent_effect,
    mediumTalentEffect: item.medium_talent_effect,
    legendaryTalentEffect: item.legendary_talent_effect,
    createdAt: item.created_at,
  };
}

function placementNode(binding, talents, placement, idKey, inventoryField) {
  const boardIndex = SLOT_ORDER.indexOf(placement.tree_slot_id);
  const board = talents.boards[boardIndex];
  if (boardIndex <= 0 || !board?.treeSlug) return null;
  if (!talents[inventoryField].some((item) => item.instanceId === placement[idKey])) return null;
  return binding.nodeByTreeAndKey.get(
    `${board.treeSlug}:${placement.position.x},${placement.position.y}`,
  )?.node ?? null;
}

export function inspect91TobTalentSection(section, model) {
  if (!tob91TalentSectionShapeValid(section)) {
    return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
  }
  const binding = bindCurrentModel(model);
  if (!binding) {
    return { status: "unavailable", mapped: false, talents: null, mappings: [], mappedPaths: [] };
  }
  const populated = has91TobTalentPayload(section);
  if (populated && !metadataMatchesCurrentCatalog(section)) {
    return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
  }

  const talents = emptyLocalState();
  const mappings = [];
  const mappedPaths = [];
  const seenTrees = new Set();
  for (const [slotIndex, slotId] of SLOT_ORDER.entries()) {
    const slot = section.slots[slotId];
    const treeSlug = slot.tree_slug ?? null;
    if (!treeSlug) {
      if (slotHasPayload(slot)) {
        return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
      }
      continue;
    }
    if (!SUPPORTED_TREE_SLUGS.has(treeSlug)) {
      return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
    }
    if (seenTrees.has(treeSlug)) {
      return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
    }
    seenTrees.add(treeSlug);
    const board = talents.boards[slotIndex];
    board.treeSlug = treeSlug;
    mappedPaths.push(`talents.slots.${slotId}.tree_slug`);
    mappings.push({ kind: "tree", slotId, treeSlug });

    for (const [nodeKey, points] of Object.entries(slot.allocated_node_points_by_key)) {
      const bound = binding.nodeByTreeAndKey.get(`${treeSlug}:${nodeKey}`);
      if (!bound || !SUPPORTED_NODE_IDS.has(String(bound.node.dataId))) {
        return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
      }
      board.nodePoints[bound.node.flatItemId] = points;
      board.selectedNodeIds.push(bound.node.flatItemId);
      mappedPaths.push(`talents.slots.${slotId}.allocated_node_points_by_key.${nodeKey}`);
      mappings.push({
        kind: "node",
        slotId,
        treeSlug,
        nodeKey,
        publicDataId: bound.node.dataId,
        localItemId: bound.node.flatItemId,
      });
    }
    if (new Set(slot.selected_core_talent_data_ids).size
      !== slot.selected_core_talent_data_ids.length) {
      return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
    }
    for (const [coreIndex, dataId] of slot.selected_core_talent_data_ids.entries()) {
      const bound = binding.coreByDataId.get(dataId);
      if (!bound || bound.core.treeSlug !== treeSlug || !SUPPORTED_CORE_IDS.has(dataId)) {
        return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
      }
      board.coreTalentIds.push(bound.core.flatItemId);
      mappedPaths.push(`talents.slots.${slotId}.selected_core_talent_data_ids.${coreIndex}`);
      mappings.push({
        kind: "core",
        slotId,
        treeSlug,
        publicDataId: dataId,
        localItemId: bound.core.flatItemId,
      });
    }
  }

  const prismInventory = section.prism_inventory.map((item) => publicPrismToLocal(item, model));
  if (prismInventory.some((item) => !item)) {
    return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
  }
  talents.prismInventory = prismInventory;
  talents.inverseImageInventory = section.inverse_image_inventory.map(publicInverseImageToLocal);
  for (const [index, item] of section.prism_inventory.entries()) {
    mappedPaths.push(`talents.prism_inventory.${index}`);
    mappings.push({ kind: "prism", instanceId: item.id, prismItemSlug: item.prism_item_slug });
  }
  for (const [index, item] of section.inverse_image_inventory.entries()) {
    mappedPaths.push(`talents.inverse_image_inventory.${index}`);
    mappings.push({ kind: "inverse-image", instanceId: item.id });
  }

  if (Object.hasOwn(section, "placed_prism")) {
    const placement = section.placed_prism;
    const boardIndex = SLOT_ORDER.indexOf(placement.tree_slot_id);
    const node = placementNode(binding, talents, placement, "prism_id", "prismInventory");
    if (!node) {
      return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
    }
    talents.placedPrism = {
      instanceId: placement.prism_id,
      boardIndex,
      nodeId: node.flatItemId,
      x: node.x,
      y: node.y,
    };
    mappedPaths.push("talents.placed_prism");
    mappings.push({ kind: "placed-prism", instanceId: placement.prism_id, slotId: placement.tree_slot_id });
  }
  if (Object.hasOwn(section, "placed_inverse_image")) {
    const placement = section.placed_inverse_image;
    const boardIndex = SLOT_ORDER.indexOf(placement.tree_slot_id);
    const node = placementNode(
      binding,
      talents,
      placement,
      "inverse_image_id",
      "inverseImageInventory",
    );
    if (!node || !(node.y === 0 || node.y === 4 || node.x <= 1 || node.x >= 5)) {
      return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
    }
    talents.placedInverseImage = {
      instanceId: placement.inverse_image_id,
      boardIndex,
      nodeId: node.flatItemId,
      x: node.x,
      y: node.y,
    };
    mappedPaths.push("talents.placed_inverse_image");
    mappings.push({
      kind: "placed-inverse-image",
      instanceId: placement.inverse_image_id,
      slotId: placement.tree_slot_id,
    });
  }

  for (const [slotIndex, slotId] of SLOT_ORDER.entries()) {
    const reflectedPoints = section.slots[slotId].allocated_reflected_node_points_by_key;
    if (!Object.keys(reflectedPoints).length) continue;
    if (talents.placedInverseImage?.boardIndex !== slotIndex) {
      return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
    }
    const runtime = getTalentBoardRuntime(model, talents, slotIndex);
    for (const [targetKey, points] of Object.entries(reflectedPoints)) {
      const reflected = runtime.nodes.find((node) => (
        node.isReflected && `${node.x},${node.y}` === targetKey
      ));
      if (!reflected || !binding.nodeByFlatItemId.has(reflected.sourceFlatItemId)) {
        return { status: "unsupported", mapped: false, talents: null, mappings: [], mappedPaths: [] };
      }
      talents.boards[slotIndex].reflectedNodePoints[reflected.storageNodeId] = points;
      mappedPaths.push(
        `talents.slots.${slotId}.allocated_reflected_node_points_by_key.${targetKey}`,
      );
      mappings.push({
        kind: "reflected-node",
        slotId,
        targetKey,
        localItemId: reflected.sourceFlatItemId,
      });
    }
  }

  if (diagnoseTalentBoardState(model, talents).valid !== true) {
    return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
  }
  const expectedCompiledSources = compileSources(talents, binding);
  if (!sameSerializableValue(section.compiled_sources, expectedCompiledSources)) {
    return { status: "invalid", mapped: false, talents: null, mappings: [], mappedPaths: [] };
  }
  if (populated) {
    mappedPaths.push(
      "talents.catalog_version",
      "talents.season_label",
      "talents.talent_catalog_fingerprint",
      "talents.compiled_sources",
    );
  }
  return {
    status: "valid",
    mapped: populated,
    talents,
    mappings,
    mappedPaths,
  };
}

function emptySlot() {
  return {
    allocated_node_points_by_key: {},
    allocated_reflected_node_points_by_key: {},
    selected_core_talent_data_ids: [],
  };
}

export function empty91TobTalentSection() {
  const contract = TOB91_TALENT_INTEROP_RECEIPT.serializerContract;
  return {
    catalog_version: contract.catalogVersion,
    season_label: contract.seasonLabel,
    slot_order: [...SLOT_ORDER],
    slots: Object.fromEntries(SLOT_ORDER.map((slotId) => [slotId, emptySlot()])),
    compiled_sources: Object.fromEntries(COMPILED_SOURCE_KEYS.map((key) => [key, { entries: [] }])),
    prism_inventory: [],
    inverse_image_inventory: [],
    talent_catalog_fingerprint: contract.treeCatalogFingerprint,
  };
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  return new Set(left).size === left.length && left.every((value) => right.includes(value));
}

export function export91TobTalentSection(talents, model) {
  const binding = bindCurrentModel(model);
  if (!binding) {
    return {
      ok: false,
      issues: [issue("validation-context-unavailable")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  if (!isPlainObject(talents)
    || !Array.isArray(talents.boards)
    || talents.boards.length !== SLOT_ORDER.length) {
    return {
      ok: false,
      issues: [issue("91tob-export-talent-state-invalid")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  const diagnosis = diagnoseTalentBoardState(model, talents);
  if (diagnosis.valid !== true) {
    return {
      ok: false,
      issues: [issue("91tob-export-talent-state-invalid")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  const state = normalizeTalentBoardState(model, talents);
  const section = empty91TobTalentSection();
  const mappings = [];
  for (const [slotIndex, slotId] of SLOT_ORDER.entries()) {
    const board = state.boards[slotIndex];
    if (!board.treeSlug) {
      if (Object.keys(board.nodePoints).length
        || board.selectedNodeIds.length
        || board.coreTalentIds.length) {
        return {
          ok: false,
          issues: [issue("91tob-export-talent-state-invalid")],
          section: null,
          mapped: false,
          mappings: [],
        };
      }
      continue;
    }
    if (!SUPPORTED_TREE_SLUGS.has(board.treeSlug)) {
      return {
        ok: false,
        issues: [issue("91tob-export-talent-unsupported")],
        section: null,
        mapped: false,
        mappings: [],
      };
    }
    const slot = section.slots[slotId];
    slot.tree_slug = board.treeSlug;
    mappings.push({ kind: "tree", slotId, treeSlug: board.treeSlug });
    for (const [flatItemId, points] of Object.entries(board.nodePoints)) {
      const bound = binding.nodeByFlatItemId.get(flatItemId);
      if (!bound || bound.node.treeSlug !== board.treeSlug) {
        return {
          ok: false,
          issues: [issue("91tob-export-talent-unsupported")],
          section: null,
          mapped: false,
          mappings: [],
        };
      }
      const nodeKey = `${bound.node.x},${bound.node.y}`;
      slot.allocated_node_points_by_key[nodeKey] = points;
      mappings.push({
        kind: "node",
        slotId,
        treeSlug: board.treeSlug,
        nodeKey,
        publicDataId: bound.node.dataId,
        localItemId: flatItemId,
      });
    }
    const runtime = getTalentBoardRuntime(model, state, slotIndex);
    for (const [storageNodeId, points] of Object.entries(board.reflectedNodePoints)) {
      const reflected = runtime.nodes.find((node) => (
        node.isReflected && node.storageNodeId === storageNodeId
      ));
      if (!reflected || !binding.nodeByFlatItemId.has(reflected.sourceFlatItemId)) {
        return {
          ok: false,
          issues: [issue("91tob-export-talent-unsupported")],
          section: null,
          mapped: false,
          mappings: [],
        };
      }
      const targetKey = `${reflected.x},${reflected.y}`;
      slot.allocated_reflected_node_points_by_key[targetKey] = points;
      mappings.push({
        kind: "reflected-node",
        slotId,
        targetKey,
        localItemId: reflected.sourceFlatItemId,
      });
    }
    if (!sameStringSet(board.selectedNodeIds, Object.keys(board.nodePoints))) {
      return {
        ok: false,
        issues: [issue("91tob-export-talent-state-invalid")],
        section: null,
        mapped: false,
        mappings: [],
      };
    }
    for (const flatItemId of board.coreTalentIds) {
      const bound = binding.coreByFlatItemId.get(flatItemId);
      if (!bound || bound.core.treeSlug !== board.treeSlug) {
        return {
          ok: false,
          issues: [issue("91tob-export-talent-unsupported")],
          section: null,
          mapped: false,
          mappings: [],
        };
      }
      slot.selected_core_talent_data_ids.push(bound.core.dataId);
      mappings.push({
        kind: "core",
        slotId,
        treeSlug: board.treeSlug,
        publicDataId: bound.core.dataId,
        localItemId: flatItemId,
      });
    }
  }
  section.prism_inventory = state.prismInventory.map((item) => {
    const prismBinding = PRISM_BINDING_BY_LOCAL_SLUG.get(item.prismItemSlug);
    return {
      id: item.instanceId,
      name: item.name,
      prism_item_slug: prismBinding?.publicSlug,
      prism_item_name: prismBinding?.name,
      rarity: item.rarity,
      base_affix_modifier_id: item.baseAffixModifierId,
      area_affix_modifier_id: item.areaAffixModifierId,
      rare_random_affix_modifier_id: item.rareRandomAffixModifierId,
      ...(item.rarity === "legendary" ? {
        legendary_random_affix_modifier_id: item.legendaryRandomAffixModifierId,
      } : {}),
      summary: item.summary,
      created_at: item.createdAt,
    };
  });
  section.inverse_image_inventory = state.inverseImageInventory.map((item) => ({
    id: item.instanceId,
    name: item.name,
    micro_talent_effect: item.microTalentEffect,
    medium_talent_effect: item.mediumTalentEffect,
    legendary_talent_effect: item.legendaryTalentEffect,
    created_at: item.createdAt,
  }));
  if (!section.prism_inventory.every(prismInventoryItemShapeValid)
    || !section.inverse_image_inventory.every(inverseImageInventoryItemShapeValid)) {
    return {
      ok: false,
      issues: [issue("91tob-export-talent-state-invalid")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  if (!section.prism_inventory.every((item) => (
    PRISM_BINDING_BY_PUBLIC_SLUG.get(item.prism_item_slug)
      ?.supportedRarities.includes(item.rarity)
      && Boolean(publicPrismToLocal(item, model))
  ))) {
    return {
      ok: false,
      issues: [issue("91tob-export-talent-unsupported")],
      section: null,
      mapped: false,
      mappings: [],
    };
  }
  mappings.push(...state.prismInventory.map((item) => ({
    kind: "prism",
    instanceId: item.instanceId,
    prismItemSlug: item.prismItemSlug,
  })));
  mappings.push(...state.inverseImageInventory.map((item) => ({
    kind: "inverse-image",
    instanceId: item.instanceId,
  })));

  if (state.placedPrism) {
    const slotId = SLOT_ORDER[state.placedPrism.boardIndex];
    const board = state.boards[state.placedPrism.boardIndex];
    const bound = binding.nodeByTreeAndKey.get(
      `${board?.treeSlug}:${state.placedPrism.x},${state.placedPrism.y}`,
    );
    if (!slotId || state.placedPrism.boardIndex === 0 || !bound
      || bound.node.flatItemId !== state.placedPrism.nodeId) {
      return {
        ok: false,
        issues: [issue("91tob-export-talent-unsupported")],
        section: null,
        mapped: false,
        mappings: [],
      };
    }
    section.placed_prism = {
      prism_id: state.placedPrism.instanceId,
      tree_slot_id: slotId,
      position: { x: state.placedPrism.x, y: state.placedPrism.y },
    };
    mappings.push({ kind: "placed-prism", instanceId: state.placedPrism.instanceId, slotId });
  }
  if (state.placedInverseImage) {
    const slotId = SLOT_ORDER[state.placedInverseImage.boardIndex];
    const board = state.boards[state.placedInverseImage.boardIndex];
    const bound = binding.nodeByTreeAndKey.get(
      `${board?.treeSlug}:${state.placedInverseImage.x},${state.placedInverseImage.y}`,
    );
    if (!slotId || state.placedInverseImage.boardIndex === 0 || !bound
      || bound.node.flatItemId !== state.placedInverseImage.nodeId) {
      return {
        ok: false,
        issues: [issue("91tob-export-talent-unsupported")],
        section: null,
        mapped: false,
        mappings: [],
      };
    }
    section.placed_inverse_image = {
      inverse_image_id: state.placedInverseImage.instanceId,
      tree_slot_id: slotId,
      position: { x: state.placedInverseImage.x, y: state.placedInverseImage.y },
    };
    mappings.push({
      kind: "placed-inverse-image",
      instanceId: state.placedInverseImage.instanceId,
      slotId,
    });
  }
  section.compiled_sources = compileSources(state, binding);
  return {
    ok: true,
    issues: [],
    section,
    mapped: has91TobTalentPayload(section),
    mappings,
  };
}

export function import91TobTalentSection(section, model) {
  const inspection = inspect91TobTalentSection(section, model);
  if (inspection.status !== "valid") {
    const code = inspection.status === "unavailable"
      ? "validation-context-unavailable"
      : inspection.status === "unsupported"
        ? "91tob-talent-mapping-unavailable"
        : "91tob-talent-document-invalid";
    return {
      ok: false,
      issues: [issue(code)],
      talents: null,
      mapped: false,
      mappings: [],
      mappedPaths: [],
    };
  }
  return {
    ok: true,
    issues: [],
    talents: inspection.talents,
    mapped: inspection.mapped,
    mappings: inspection.mappings,
    mappedPaths: inspection.mappedPaths,
  };
}
