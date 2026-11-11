import {
  DIVINITY_SHAPES,
  HADES_DIVINITY_SHAPE_METADATA,
  HADES_DIVINITY_SLATE_IDS,
  addSlateToInventory,
  createSlateInstance,
  exportDivinityBoard,
  getPlacedCells,
  importDivinityBoard,
  isCurrentHadesShapeInstance,
  transformedShape,
} from "./divinityBoardModel.js";
import {
  getHadesCopyableTalentContractSs13_4,
} from "./data/hadesCopyContract.ss13_4.generated.js";
import { HADES_KOREAN_PRESENTATION } from "./hadesKoreanPresentation.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const DIVINITY_GODS = deepFreeze([
  { slug: "might", name: "巨力之神", talentMainGodName: "巨力之神" },
  { slug: "hunting", name: "狩猎之神", talentMainGodName: "狩猎之神" },
  { slug: "knowledge", name: "知识之神", talentMainGodName: "知识之神" },
  { slug: "war", name: "征战之神", talentMainGodName: "征战之神" },
  { slug: "deception", name: "欺诈之神", talentMainGodName: "欺诈之神" },
  { slug: "machines", name: "机械之神", talentMainGodName: "机械之神" },
]);

export const DIVINITY_SLATE_TEMPLATES = deepFreeze([
  {
    id: "six_gods",
    name: "六神石板",
    shortName: "六神",
    description: "对应 TOB 常规神格石板，可选择具体神系，并从该神系的小型 / 中型 / 传奇中型词条中选择 5 条。",
    group: "regular",
    defaultShapeId: "a_4",
    allowedShapeIds: ["a_4", "a_2", "a_1", "a_3"],
    maxPlacedCount: null,
    hiddenFromLibrary: false,
    requiresGodSelection: true,
    allowAnyGod: false,
    slotDefinitions: Array.from({ length: 5 }, (_, index) => ({
      key: `slot_${index + 1}`,
      label: "小型 / 中型 / 传奇中型天赋",
      allowedKinds: ["small", "medium", "legendary"],
    })),
  },
  {
    id: "last_gods_tear",
    name: "末神泪珠",
    shortName: "泪珠",
    description: "旧版本地预设兼容占位项，当前不再作为可新增模板显示。",
    group: "legendary",
    defaultShapeId: "b_1",
    allowedShapeIds: ["b_1"],
    maxPlacedCount: null,
    hiddenFromLibrary: true,
    requiresGodSelection: false,
    allowAnyGod: false,
    slotDefinitions: [],
  },
  {
    id: "stars_fall",
    name: "群星辉陨",
    shortName: "辉陨",
    description: "对应 TOB 的 Fallen Starlight，使用 1x2 石板并提供 4 个混合槽位。",
    group: "legendary",
    defaultShapeId: "b_2",
    allowedShapeIds: ["b_2"],
    maxPlacedCount: 3,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    slotDefinitions: [
      { key: "slot_1", label: "小型天赋", allowedKinds: ["small"] },
      { key: "slot_2", label: "小型天赋", allowedKinds: ["small"] },
      { key: "slot_3", label: "小型 / 中型 / 传奇中型天赋", allowedKinds: ["small", "medium", "legendary"] },
      { key: "slot_4", label: "中型或传奇中型天赋", allowedKinds: ["medium", "legendary"] },
    ],
  },
  {
    id: "corner_of_divinity",
    name: "神性一角",
    shortName: "一角",
    description: "对应 TOB 的 A Corner of Divinity，使用 2 个传奇中型槽位。",
    group: "legendary",
    defaultShapeId: "c",
    allowedShapeIds: ["c"],
    maxPlacedCount: 3,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    slotDefinitions: [
      { key: "slot_1", label: "传奇中型天赋", allowedKinds: ["legendary"] },
      { key: "slot_2", label: "传奇中型天赋", allowedKinds: ["legendary"] },
    ],
  },
  {
    id: "starfire",
    name: "星星蛾火",
    shortName: "蛾火/鹅火/小蛾火/小鹅火",
    description: "对应 TOB 的 Sparks of Moth Fire，可选择 1 个方向复制相邻石板的最后一条非核心天赋。",
    group: "legendary",
    defaultShapeId: "d_1",
    allowedShapeIds: ["d_1"],
    maxPlacedCount: 3,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    slotDefinitions: [{
      key: "effect",
      label: "固定效果",
      allowedKinds: ["special_effect"],
      defaultValueId: "sparks_copy_up",
      specialEffectOptions: [
        {
          id: "sparks_copy_up",
          name: "复制上侧相邻石板",
          text: "复制上侧相邻石板的最后一条非核心天赋，无法复制核心天赋。",
          direction: "up",
        },
        {
          id: "sparks_copy_left",
          name: "复制左侧相邻石板",
          text: "复制左侧相邻石板的最后一条非核心天赋，无法复制核心天赋。",
          direction: "left",
        },
        {
          id: "sparks_copy_down",
          name: "复制下侧相邻石板",
          text: "复制下侧相邻石板的最后一条非核心天赋，无法复制核心天赋。",
          direction: "down",
        },
        {
          id: "sparks_copy_right",
          name: "复制右侧相邻石板",
          text: "复制右侧相邻石板的最后一条非核心天赋，无法复制核心天赋。",
          direction: "right",
        },
      ],
    }],
  },
  {
    id: "moth_fire",
    name: "蛾火燎原之刻",
    shortName: "蛾火",
    description: "对应 TOB 的 When Sparks Set the Prairie Ablaze，会同时复制四个方向相邻石板的最后一条非核心天赋。",
    group: "legendary",
    defaultShapeId: "d_2",
    allowedShapeIds: ["d_2"],
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    slotDefinitions: [{
      key: "effect",
      label: "固定效果",
      allowedKinds: ["special_effect"],
      defaultValueId: "prairie_copy_all",
      selectionLocked: true,
      specialEffectOptions: [{
        id: "prairie_copy_all",
        name: "复制全部相邻石板",
        text: "复制上下左右四个方向相邻石板的最后一条非核心天赋，无法复制核心天赋。",
        direction: "all",
      }],
    }],
  },
  {
    id: "void_gap",
    name: "寰空神隙",
    shortName: "神隙",
    description: "正式传奇石板“寰空神隙”，可复制相邻石板的中型或传奇中型天赋；旋转后复制方向会随朝向变化。",
    group: "legendary",
    defaultShapeId: "e",
    allowedShapeIds: ["e"],
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    slotDefinitions: [
      {
        key: "copy_left",
        label: "复制左侧相邻石板的中型或传奇中型天赋",
        allowedKinds: ["copy"],
        copyRule: { direction: "left", copyType: "medium_or_legendary" },
      },
      {
        key: "copy_right",
        label: "复制右侧相邻石板的中型或传奇中型天赋",
        allowedKinds: ["copy"],
        copyRule: { direction: "right", copyType: "medium_or_legendary" },
      },
    ],
  },
  {
    id: "residence_of_stars",
    name: "众星归所",
    shortName: "归所",
    description: "复制相邻石板的中型天赋到该石板，无法复制传奇中型天赋。",
    group: "legendary",
    defaultShapeId: "residence_of_stars",
    allowedShapeIds: ["residence_of_stars"],
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    orientationLocked: true,
    slotDefinitions: [{
      key: "effect",
      label: "固定效果",
      allowedKinds: ["special_effect"],
      defaultValueId: "residence_copy_all",
      selectionLocked: true,
      specialEffectOptions: [{
        id: "residence_copy_all",
        name: "复制全部相邻普通中型天赋",
        text: "复制相邻石板的中型天赋到该石板，无法复制传奇中型天赋。",
        direction: "all",
      }],
    }],
  },
  {
    id: "genealogy",
    name: "神之谱系",
    shortName: "谱系",
    description: "对应 TOB 的 Pedigree of Gods，不限制神系，可混搭小型 / 中型 / 传奇中型与核心天赋。",
    group: "legendary",
    defaultShapeId: "f",
    allowedShapeIds: ["f"],
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: true,
    slotDefinitions: [
      { key: "slot_1", label: "小型 / 中型 / 传奇中型天赋", allowedKinds: ["small", "medium", "legendary"] },
      { key: "slot_2", label: "小型 / 中型 / 传奇中型天赋", allowedKinds: ["small", "medium", "legendary"] },
      { key: "slot_3", label: "中型 / 传奇中型 / 核心天赋", allowedKinds: ["medium", "legendary", "core"] },
      { key: "slot_4", label: "核心天赋", allowedKinds: ["core"] },
    ],
  },
  {
    id: "hades_judgment",
    name: HADES_KOREAN_PRESENTATION.templates.hades_judgment.name,
    shortName: "심판",
    description: HADES_KOREAN_PRESENTATION.templates.hades_judgment.detail,
    group: "legendary",
    defaultShapeId: "hades_judgment_a",
    allowedShapeIds: [
      "hades_judgment_a",
      "hades_judgment_line",
    ],
    shapeLabels: {
      hades_judgment_a: HADES_KOREAN_PRESENTATION.templates.hades_judgment.completeShape,
      hades_judgment_line: HADES_KOREAN_PRESENTATION.templates.hades_judgment.incompleteShape,
    },
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    hadesType: "judgment",
    topologyMetadata: HADES_DIVINITY_SHAPE_METADATA,
    slotDefinitions: [
      { key: "fixed_1", label: "고정 옵션 슬롯 1", allowedKinds: ["small", "medium", "legendary"] },
      { key: "fixed_2", label: "고정 옵션 슬롯 2", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_1", label: "낙인 재능 슬롯 1", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_2", label: "낙인 재능 슬롯 2", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_3", label: "낙인 재능 슬롯 3", allowedKinds: ["small", "medium", "legendary"] },
    ],
  },
  {
    id: "hades_contamination",
    name: HADES_KOREAN_PRESENTATION.templates.hades_contamination.name,
    shortName: "인펙션",
    description: HADES_KOREAN_PRESENTATION.templates.hades_contamination.detail,
    group: "legendary",
    defaultShapeId: "hades_infusion_complete",
    allowedShapeIds: ["hades_infusion_complete", "hades_infusion_broken"],
    shapeLabels: {
      hades_infusion_complete: HADES_KOREAN_PRESENTATION.templates.hades_contamination.completeShape,
      hades_infusion_broken: HADES_KOREAN_PRESENTATION.templates.hades_contamination.incompleteShape,
    },
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    hadesType: "contamination",
    topologyMetadata: HADES_DIVINITY_SHAPE_METADATA,
    slotDefinitions: [
      { key: "fixed_1", label: "고정 옵션 슬롯 1", allowedKinds: ["small", "medium", "legendary"] },
      { key: "fixed_2", label: "고정 옵션 슬롯 2", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_1", label: "낙인 재능 슬롯 1", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_2", label: "낙인 재능 슬롯 2", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_3", label: "낙인 재능 슬롯 3", allowedKinds: ["small", "medium", "legendary"] },
    ],
  },
  {
    id: "hades_banishment",
    name: HADES_KOREAN_PRESENTATION.templates.hades_banishment.name,
    shortName: "추방",
    description: HADES_KOREAN_PRESENTATION.templates.hades_banishment.detail,
    group: "legendary",
    defaultShapeId: "hades_banishment_a",
    allowedShapeIds: [
      "hades_banishment_a",
      "hades_banishment_b",
      "hades_banishment_c",
      "hades_banishment_d",
    ],
    shapeLabels: {
      hades_banishment_a: "왼쪽 위",
      hades_banishment_b: "오른쪽 위",
      hades_banishment_c: "오른쪽 아래",
      hades_banishment_d: "왼쪽 아래",
    },
    maxPlacedCount: 1,
    hiddenFromLibrary: false,
    requiresGodSelection: false,
    allowAnyGod: false,
    hadesType: "banishment",
    topologyMetadata: HADES_DIVINITY_SHAPE_METADATA,
    slotDefinitions: [
      { key: "fixed_1", label: "고정 옵션 슬롯 1", allowedKinds: ["small", "medium", "legendary"] },
      { key: "fixed_2", label: "고정 옵션 슬롯 2", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_1", label: "낙인 재능 슬롯 1", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_2", label: "낙인 재능 슬롯 2", allowedKinds: ["small", "medium", "legendary"] },
      { key: "imprint_3", label: "낙인 재능 슬롯 3", allowedKinds: ["small", "medium", "legendary"] },
    ],
  },
]);

const TEMPLATE_BY_ID = new Map(DIVINITY_SLATE_TEMPLATES.map((template) => [template.id, template]));

export const DIVINITY_SLATE_TEMPLATE_IDS = deepFreeze(
  DIVINITY_SLATE_TEMPLATES.map((template) => template.id),
);

export function getDivinitySlateTemplate(templateId) {
  return TEMPLATE_BY_ID.get(templateId);
}

export function getVisibleDivinitySlateTemplates() {
  return DIVINITY_SLATE_TEMPLATES.filter((template) => !template.hiddenFromLibrary);
}

function requiredTemplate(templateId) {
  const template = getDivinitySlateTemplate(templateId);
  if (!template) throw new RangeError(`Unknown divinity slate template: ${templateId}`);
  return template;
}

function slotDefinition(template, slotKey) {
  return template?.slotDefinitions?.find((slot) => slot.key === slotKey);
}

function selectionId(selection) {
  return selection?.valueId ?? selection?.id;
}

function selectionValueType(selection) {
  if (selection?.valueType) return selection.valueType;
  if (selection?.category || selection?.hadesCategory) return "talent_affix";
  return undefined;
}

function selectionSlotKind(selection) {
  if (selection?.slotKind) return selection.slotKind;
  if (selection?.display_quality === "medium") return "medium";
  if (selection?.display_quality === "legendary" || selection?.display_quality === "supreme") {
    return "legendary";
  }
  if (selection?.display_quality) return "small";
  return undefined;
}

const DIVINITY_EFFECT_CAP_PATTERN = /(?:（神格生效上限：(\d+)）|\(신격 유효 한도:\s*(\d+)\))$/u;

function divinityEffectCap(selection) {
  if (selection?.projectionDoesNotConsumeEffectCap === true) return null;
  if (isContaminationAutocracy(selection)) {
    return { limit: 1, limitKey: "hades-contamination-autocracy" };
  }
  const storedLimit = Number(selection?.effectLimit);
  const storedKey = typeof selection?.effectLimitKey === "string" ? selection.effectLimitKey : "";
  if (Number.isInteger(storedLimit) && storedLimit >= 0 && storedKey) {
    return { limit: storedLimit, limitKey: storedKey };
  }

  const text = typeof selection?.text === "string" ? selection.text : "";
  const match = text.match(DIVINITY_EFFECT_CAP_PATTERN);
  if (!match) return null;
  const limit = Number(match[1] ?? match[2]);
  if (!Number.isInteger(limit) || limit < 0) return null;
  const normalizedText = text
    .replace(DIVINITY_EFFECT_CAP_PATTERN, "")
    .replace(/\s+/gu, " ")
    .trim();
  return {
    limit,
    limitKey: normalizedText || selectionId(selection) || text,
  };
}

const HADES_IMPRINT_CATEGORY_BY_TEMPLATE = Object.freeze({
  hades_judgment: "judgment_imprint",
  hades_contamination: "contamination_imprint",
  hades_banishment: "banishment_imprint",
});

function isHadesTemplateId(templateId) {
  return HADES_DIVINITY_SLATE_IDS.includes(templateId);
}

function allowedHadesCategories(templateId, slotKey) {
  if (slotKey.startsWith("imprint_")) {
    return new Set(["fixed", HADES_IMPRINT_CATEGORY_BY_TEMPLATE[templateId], "common_imprint"]);
  }
  return new Set(["fixed"]);
}

function isHadesSlotSelectionEligible(templateId, slotKey, selection) {
  if (selectionValueType(selection) !== "talent_affix") return false;
  const category = selection.category ?? selection.hadesCategory;
  if (allowedHadesCategories(templateId, slotKey).has(category)) return true;
  return slotKey.startsWith("imprint_")
    && selection.structuralSourceKind === "divinity";
}

export function getDivinitySlateActiveSlotDefinitions(templateOrId, shapeId) {
  const template = typeof templateOrId === "string"
    ? getDivinitySlateTemplate(templateOrId)
    : templateOrId;
  if (!template) return [];
  if (!isHadesTemplateId(template.id)) return [...template.slotDefinitions];
  const selectedShapeId = shapeId ?? template.defaultShapeId;
  const activeImprintSlotKeys = HADES_DIVINITY_SHAPE_METADATA
    .shapes[selectedShapeId]?.activeImprintSlotKeys;
  if (!Array.isArray(activeImprintSlotKeys)) return [...template.slotDefinitions];
  const activeKeys = new Set([
    "fixed_1",
    "fixed_2",
    ...activeImprintSlotKeys,
  ]);
  return template.slotDefinitions.filter((slot) => activeKeys.has(slot.key));
}

function hadesStableTalentId(selection) {
  const candidates = [
    selectionId(selection),
    selection?.sourceRecordKey,
    ...(Array.isArray(selection?.sourceDataIds) ? selection.sourceDataIds : []),
  ];
  for (const candidate of candidates) {
    const match = String(candidate ?? "").match(/9\d{7}$/u);
    if (match) return match[0];
  }
  return null;
}

function hasHadesStableTalentId(selection, stableId) {
  return hadesStableTalentId(selection) === stableId;
}

function isContaminationAutocracy(selection) {
  const category = selection?.category ?? selection?.hadesCategory;
  return category === "contamination_imprint"
    && [
      selectionId(selection),
      selection?.sourceRecordKey,
      ...(Array.isArray(selection?.sourceDataIds) ? selection.sourceDataIds : []),
    ].some((value) => /9200000[1-7]$/u.test(String(value ?? "")));
}

export function isDivinityShapeAllowed(templateId, shapeId) {
  const template = getDivinitySlateTemplate(templateId);
  return Boolean(template?.allowedShapeIds.includes(shapeId) && DIVINITY_SHAPES[shapeId]);
}

export function canAddDivinitySlate(board, templateId) {
  const template = getDivinitySlateTemplate(templateId);
  if (!template || template.hiddenFromLibrary) return false;
  if (
    isHadesTemplateId(templateId)
    && (board?.slateInventory ?? []).some((instance) => isHadesTemplateId(instance.slateId))
  ) return false;
  if (template.maxPlacedCount === null) return true;
  const count = (board?.slateInventory ?? []).filter((instance) => instance.slateId === templateId).length;
  return count < template.maxPlacedCount;
}

export function createDivinitySlateInstance({
  instanceId,
  templateId,
  shapeId,
  godSlug,
  slotSelectionsByKey = {},
  ...options
} = {}) {
  const template = requiredTemplate(templateId);
  const selectedShapeId = shapeId ?? template.defaultShapeId;
  if (!isDivinityShapeAllowed(templateId, selectedShapeId)) {
    throw new RangeError(`Shape ${selectedShapeId} is not allowed for ${templateId}`);
  }
  if (godSlug !== undefined && !DIVINITY_GODS.some((god) => god.slug === godSlug)) {
    throw new RangeError(`Unknown divinity god: ${godSlug}`);
  }

  const defaults = {};
  for (const slot of template.slotDefinitions) {
    if (slot.defaultValueId) {
      defaults[slot.key] = { valueType: "special_effect", valueId: slot.defaultValueId };
    }
  }
  if (templateId === "void_gap") {
    defaults.copy_left = { valueType: "copy_slot", valueId: "copy_left" };
  }

  const instance = createSlateInstance({
    ...options,
    instanceId,
    slateId: templateId,
    shapeId: selectedShapeId,
    slotSelectionsByKey: { ...defaults, ...slotSelectionsByKey },
  });
  return godSlug === undefined ? instance : { ...instance, godSlug };
}

export function addDivinitySlateToBoard(board, instance) {
  const template = requiredTemplate(instance?.slateId);
  if (!isDivinityShapeAllowed(template.id, instance.shapeId)) {
    throw new RangeError(`Shape ${instance.shapeId} is not allowed for ${template.id}`);
  }
  const nextBoard = addSlateToInventory(board, instance);
  if (!template.requiresGodSelection || instance.godSlug === undefined) return nextBoard;
  if (!DIVINITY_GODS.some((god) => god.slug === instance.godSlug)) {
    throw new RangeError(`Unknown divinity god: ${instance.godSlug}`);
  }
  return {
    ...nextBoard,
    slateInventory: nextBoard.slateInventory.map((stored) => (
      stored.instanceId === instance.instanceId ? { ...stored, godSlug: instance.godSlug } : stored
    )),
  };
}

export function isDivinitySlotSelectionEligible({
  templateId,
  shapeId,
  slotKey,
  selection,
  godSlug,
} = {}) {
  const template = getDivinitySlateTemplate(templateId);
  const slot = slotDefinition(template, slotKey);
  const valueId = selectionId(selection);
  if (!template || !slot || !valueId || !selection) return false;

  if (isHadesTemplateId(templateId)) {
    if (!getDivinitySlateActiveSlotDefinitions(template, shapeId).some(({ key }) => key === slotKey)) {
      return false;
    }
    return isHadesSlotSelectionEligible(templateId, slotKey, selection);
  }

  if (slot.copyRule) {
    return selectionValueType(selection) === "copy_slot" && valueId === slot.key;
  }

  if (slot.specialEffectOptions) {
    return selectionValueType(selection) === "special_effect"
      && slot.specialEffectOptions.some((option) => option.id === valueId);
  }

  const valueType = selectionValueType(selection);
  const kind = selectionSlotKind(selection);
  const kindEligible = valueType === "core_talent"
    ? slot.allowedKinds.includes("core")
    : valueType === "talent_affix" && slot.allowedKinds.includes(kind);
  if (!kindEligible) return false;
  if (!template.requiresGodSelection) return true;

  const god = DIVINITY_GODS.find((candidate) => candidate.slug === godSlug);
  return Boolean(god && selection.mainGodName === god.talentMainGodName);
}

export function setDivinitySlotSelection(instance, slotKey, selection) {
  const template = requiredTemplate(instance?.slateId);
  if (!slotDefinition(template, slotKey)) {
    throw new RangeError(`Unknown slot ${template.id}.${slotKey}`);
  }
  if (!getDivinitySlateActiveSlotDefinitions(template, instance.shapeId)
    .some(({ key }) => key === slotKey)) {
    throw new RangeError(`Slot ${template.id}.${slotKey} is not active for ${instance.shapeId}`);
  }

  const nextSelections = { ...(instance.slotSelectionsByKey ?? {}) };
  if (selection === null || selection === undefined) {
    delete nextSelections[slotKey];
    return { ...instance, slotSelectionsByKey: nextSelections };
  }

  const valueId = selectionId(selection);
  if (!isDivinitySlotSelectionEligible({
    templateId: template.id,
    shapeId: instance.shapeId,
    slotKey,
    selection,
    godSlug: instance.godSlug,
  })) {
    throw new RangeError(`Selection ${valueId ?? "unknown"} is not eligible for ${template.id}.${slotKey}`);
  }

  const valueType = selectionValueType(selection);
  if (template.id === "void_gap" && valueType === "copy_slot") {
    for (const key of Object.keys(nextSelections)) {
      if (nextSelections[key]?.valueType === "copy_slot") delete nextSelections[key];
    }
  }
  const slotKind = selectionSlotKind(selection);
  const hadesCategory = selection.category ?? selection.hadesCategory;
  const effectCap = divinityEffectCap(selection);
  const contaminationAutocracy = isContaminationAutocracy(selection);
  nextSelections[slotKey] = {
    valueType,
    valueId,
    ...(slotKind ? { slotKind } : {}),
    ...(hadesCategory ? { hadesCategory } : {}),
    ...(selection.config && typeof selection.config === "object"
      ? { config: { ...selection.config } }
      : {}),
    ...(effectCap ? { effectLimit: effectCap.limit, effectLimitKey: effectCap.limitKey } : {}),
    ...(contaminationAutocracy ? {
      effectLimit: 1,
      effectLimitKey: "hades-contamination-autocracy",
    } : {}),
  };
  return { ...instance, slotSelectionsByKey: nextSelections };
}

const DIRECTIONS = deepFreeze({
  up: [-1, 0],
  left: [0, -1],
  down: [1, 0],
  right: [0, 1],
});

function instanceOrder(board, instanceId) {
  return board.slateInventory.find((instance) => instance.instanceId === instanceId)?.createdOrder ?? 0;
}

export function findAdjacentDivinitySlates(board, targetInstanceId) {
  const targetCells = getPlacedCells(board, targetInstanceId);
  const cellOwner = new Map(
    board.cells.map((cell) => [`${cell.x}:${cell.y}`, cell.slateInstanceId]),
  );
  const adjacent = Object.fromEntries(
    Object.keys(DIRECTIONS).map((direction) => [direction, new Set()]),
  );

  for (const cell of targetCells) {
    for (const [direction, [deltaX, deltaY]] of Object.entries(DIRECTIONS)) {
      const owner = cellOwner.get(`${cell.x + deltaX}:${cell.y + deltaY}`);
      if (owner && owner !== targetInstanceId) adjacent[direction].add(owner);
    }
  }

  return Object.fromEntries(Object.entries(adjacent).map(([direction, ids]) => [
    direction,
    [...ids].sort((left, right) => (
      instanceOrder(board, left) - instanceOrder(board, right) || left.localeCompare(right)
    )),
  ]));
}

function templateHasCopyBehavior(template) {
  return template?.slotDefinitions.some((slot) => (
    Boolean(slot.copyRule) || slot.specialEffectOptions?.some((option) => option.direction)
  ));
}

function catalogMap(catalog) {
  if (catalog instanceof Map) return catalog;
  if (Array.isArray(catalog)) {
    const records = new Map();
    for (const record of catalog) {
      if (record?.id) records.set(record.id, record);
      if (record?.legacyRuntimeId) records.set(record.legacyRuntimeId, record);
    }
    return records;
  }
  if (catalog && typeof catalog === "object") return new Map(Object.entries(catalog));
  return new Map();
}

function normalizedDirectSelection(record, storedSelection, slotKey) {
  const valueId = selectionId(record) ?? selectionId(storedSelection);
  const category = record?.category ?? record?.hadesCategory;
  return {
    ...(record ?? {}),
    ...(storedSelection ?? {}),
    valueId,
    valueType: selectionValueType(record) ?? selectionValueType(storedSelection),
    slotKind: selectionSlotKind(record) ?? selectionSlotKind(storedSelection),
    ...(category ? { hadesCategory: category } : {}),
    slotKey,
  };
}

function directSelectionsFor(instance, directSelectionsByInstanceId, talentById) {
  const supplied = directSelectionsByInstanceId?.[instance.instanceId];
  if (Array.isArray(supplied)) {
    return supplied.map((record) => normalizedDirectSelection(record, record, record.slotKey));
  }

  const template = getDivinitySlateTemplate(instance.slateId);
  if (!template) return [];
  return template.slotDefinitions.flatMap((slot) => {
    if (slot.copyRule) return [];
    const stored = instance.slotSelectionsByKey?.[slot.key];
    if (!stored) return [];
    const valueId = selectionId(stored);
    const special = slot.specialEffectOptions?.find((option) => option.id === valueId);
    const record = special
      ? { ...special, valueType: "special_effect" }
      : talentById.get(valueId);
    if (!special && talentById.size > 0 && !record) return [];
    return [normalizedDirectSelection(record, stored, slot.key)];
  });
}

const HADES_TALENT_CATEGORIES = new Set([
  "fixed",
  "contamination_imprint",
  "common_imprint",
  "banishment_imprint",
  "judgment_imprint",
]);
const EMPTY_COPY_CAPABILITIES = new Set();

function netherKingCopyCapabilities(selection) {
  const category = selection?.category ?? selection?.hadesCategory;
  const stableId = hadesStableTalentId(selection) ?? "";
  const isNetherKingTalent = HADES_TALENT_CATEGORIES.has(category) || /^9\d{7}$/u.test(stableId);
  if (!isNetherKingTalent) return null;
  const contract = getHadesCopyableTalentContractSs13_4({
    localStableId: stableId,
    localCategory: category,
  });
  return contract ? new Set(contract.copyCapabilities) : EMPTY_COPY_CAPABILITIES;
}

function selectionSupportsCopyType(selection, copyType) {
  const capabilities = netherKingCopyCapabilities(selection);
  return capabilities === null ? null : capabilities.has(copyType);
}

function copyableSelections({
  board,
  sourceInstanceId,
  copyType,
  directSelectionsByInstanceId,
  talentById,
}) {
  const source = board.slateInventory.find((instance) => instance.instanceId === sourceInstanceId);
  if (!source || templateHasCopyBehavior(getDivinitySlateTemplate(source.slateId))) return [];
  const selections = directSelectionsFor(source, directSelectionsByInstanceId, talentById);
  if (copyType === "medium_or_legendary") {
    return selections.filter((selection) => (
      selectionSupportsCopyType(selection, copyType)
      ?? (selection.slotKind === "medium" || selection.slotKind === "legendary")
    ));
  }
  if (copyType === "medium") {
    return selections.filter((selection) => (
      selectionSupportsCopyType(selection, copyType) ?? selection.slotKind === "medium"
    ));
  }
  const nonCore = selections
    .filter((selection) => (
      selection.valueType !== "core_talent" && selection.valueType !== "special_effect"
    ))
    .filter((selection) => selectionSupportsCopyType(selection, copyType) ?? true);
  return nonCore.length ? [nonCore[nonCore.length - 1]] : [];
}

function copiedSelection(record, {
  sourceInstanceId,
  targetInstanceId,
  targetSlotKey,
  copyType,
  direction,
}) {
  return {
    ...record,
    sourceInstanceId,
    sourceSlotKey: record.slotKey,
    targetInstanceId,
    targetSlotKey,
    copyType,
    direction,
  };
}

function firstCopyableAdjacent(options, adjacentIds) {
  for (const sourceInstanceId of adjacentIds) {
    const records = copyableSelections({ ...options, sourceInstanceId });
    if (records.length) return { sourceInstanceId, records };
  }
  return undefined;
}

function specialEffectDirection(template, instance, slotKey) {
  const slot = slotDefinition(template, slotKey);
  const selectedId = selectionId(instance.slotSelectionsByKey?.[slotKey]) ?? slot?.defaultValueId;
  return slot?.specialEffectOptions?.find((option) => option.id === selectedId)?.direction;
}

function voidGapDirection(instance, activeSlotKey) {
  const shape = transformedShape(
    instance.shape,
    instance.rotation,
    instance.flippedH,
    instance.flippedV,
  );
  const rows = Math.max(...shape.map((cell) => cell.x)) + 1;
  const columns = Math.max(...shape.map((cell) => cell.y)) + 1;
  if (columns > rows) return activeSlotKey === "copy_left" ? "up" : "down";
  return activeSlotKey === "copy_left" ? "left" : "right";
}

export function resolveAdjacentDivinityCopies({
  board,
  targetInstanceId,
  talentCatalog = [],
  directSelectionsByInstanceId = {},
} = {}) {
  const target = board?.slateInventory?.find((instance) => instance.instanceId === targetInstanceId);
  const template = getDivinitySlateTemplate(target?.slateId);
  if (!target || !template) return [];

  const adjacent = findAdjacentDivinitySlates(board, targetInstanceId);
  const shared = {
    board,
    directSelectionsByInstanceId,
    talentById: catalogMap(talentCatalog),
  };

  if (template.id === "starfire") {
    const direction = specialEffectDirection(template, target, "effect");
    if (!direction || direction === "all") return [];
    const source = firstCopyableAdjacent({ ...shared, copyType: "last_non_core" }, adjacent[direction]);
    if (!source) return [];
    return source.records.map((record) => copiedSelection(record, {
      sourceInstanceId: source.sourceInstanceId,
      targetInstanceId,
      targetSlotKey: `effect:${direction}`,
      copyType: "last_non_core",
      direction,
    }));
  }

  if (template.id === "moth_fire") {
    const copied = [];
    const usedSources = new Set();
    for (const direction of ["up", "left", "down", "right"]) {
      const source = firstCopyableAdjacent({ ...shared, copyType: "last_non_core" }, adjacent[direction]);
      if (!source || usedSources.has(source.sourceInstanceId)) continue;
      usedSources.add(source.sourceInstanceId);
      copied.push(...source.records.map((record) => copiedSelection(record, {
        sourceInstanceId: source.sourceInstanceId,
        targetInstanceId,
        targetSlotKey: `effect:${direction}`,
        copyType: "last_non_core",
        direction,
      })));
    }
    return copied;
  }

  if (template.id === "void_gap") {
    const activeSlotKey = ["copy_left", "copy_right"].find((slotKey) => {
      const selection = target.slotSelectionsByKey?.[slotKey];
      return selection?.valueType === "copy_slot" && selection.valueId === slotKey;
    }) ?? "copy_left";
    const direction = voidGapDirection(target, activeSlotKey);
    return adjacent[direction].flatMap((sourceInstanceId) => (
      copyableSelections({
        ...shared,
        sourceInstanceId,
        copyType: "medium_or_legendary",
      }).map((record) => copiedSelection(record, {
        sourceInstanceId,
        targetInstanceId,
        targetSlotKey: activeSlotKey,
        copyType: "medium_or_legendary",
        direction,
      }))
    ));
  }

  if (template.id === "residence_of_stars") {
    const sourceInstanceIds = [...new Set(Object.values(adjacent).flat())]
      .sort((left, right) => (
        instanceOrder(board, left) - instanceOrder(board, right) || left.localeCompare(right)
      ));
    return sourceInstanceIds.flatMap((sourceInstanceId) => (
      copyableSelections({
        ...shared,
        sourceInstanceId,
        copyType: "medium",
      }).map((record) => copiedSelection(record, {
        sourceInstanceId,
        targetInstanceId,
        targetSlotKey: "effect:all",
        copyType: "medium",
        direction: "all",
      }))
    ));
  }

  return [];
}

function calculationSelectionId(selection) {
  const valueId = selectionId(selection);
  if (typeof valueId !== "string" || !valueId) return null;
  if (valueId.startsWith("slates-divinity-talent-") || valueId.startsWith("slates-hades-")) {
    return valueId;
  }
  if (valueId.startsWith("divinity-talent-") || valueId.startsWith("hades-")) {
    return `slates-${valueId}`;
  }
  return valueId;
}

function isCalculationSelection(selection) {
  const valueType = selectionValueType(selection);
  return valueType !== "special_effect" && valueType !== "copy_slot";
}

const DIVINITY_AFFIX_KIND_ORDER = Object.freeze({
  talent: 0,
  special_effect: 1,
  copied: 2,
  contamination_projected: 3,
});

function placedDivinitySlateInstances(board) {
  const placedInstanceIds = new Set(
    (board?.cells ?? [])
      .map((cell) => cell?.slateInstanceId)
      .filter((instanceId) => typeof instanceId === "string" && instanceId),
  );
  return (board?.slateInventory ?? [])
    .filter((instance) => instance?.instanceId && placedInstanceIds.has(instance.instanceId))
    .sort((left, right) => (
      (left.createdOrder ?? 0) - (right.createdOrder ?? 0)
      || left.instanceId.localeCompare(right.instanceId)
    ));
}

function overviewAffix(selection, instance, affixKind) {
  const copied = affixKind === "copied" || affixKind === "contamination_projected";
  return {
    ...selection,
    affixKind,
    instanceId: copied ? selection.targetInstanceId : instance.instanceId,
    slotKey: copied ? selection.targetSlotKey : selection.slotKey,
    createdOrder: instance.createdOrder ?? 0,
  };
}

function compareOverviewAffixes(left, right) {
  return (
    DIVINITY_AFFIX_KIND_ORDER[left.affixKind] - DIVINITY_AFFIX_KIND_ORDER[right.affixKind]
    || left.createdOrder - right.createdOrder
    || String(left.slotKey ?? "").localeCompare(String(right.slotKey ?? ""))
    || String(left.instanceId ?? "").localeCompare(String(right.instanceId ?? ""))
    || String(selectionId(left) ?? "").localeCompare(String(selectionId(right) ?? ""))
  );
}

const ORTHOGONAL_CELL_DELTAS = deepFreeze(Object.values(DIRECTIONS));
const DIAGONAL_CELL_DELTAS = deepFreeze([
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]);

export const HADES_DIVINITY_RUNTIME_METADATA = deepFreeze({
  sourceUrl: "https://tlidb.com/ko/Hyperlink",
  activeSeason: "SS13",
  sourceStatus: "current-tlidb-text",
  judgment: {
    sourceRecordKey: "심판",
    affixEffectIncreasePercent: 70,
    affixMultiplier: 1.7,
    appliesTo: "non-core-non-replicated-affixes-on-connector-slates",
  },
  contamination: {
    sourceRecordKey: "인펙션",
    projectionStrengthPercent: 20,
    baseAdjacency: "orthogonal",
    diagonalExtensionTalentId: "92000007",
    modifierFormula: "baseProjectionMultiplier + projectionEffectIncreasePercent / 100",
    modifierFormulaStatus: "verified-91tob-frontend",
  },
  banishment: {
    sourceRecordKey: "추방",
    minimumAdjacentSlateCount: 4,
    minimumNonAdjacentSlateCount: 4,
  },
});

function coordinateKey(cell) {
  return `${cell.x}:${cell.y}`;
}

function compareCoordinates(left, right) {
  return left.x - right.x || left.y - right.y;
}

function sortedOwnerIds(board, ownerIds) {
  return [...ownerIds].sort((left, right) => (
    instanceOrder(board, left) - instanceOrder(board, right) || left.localeCompare(right)
  ));
}

function cellOwnerMap(board) {
  return new Map((board?.cells ?? []).map((cell) => [coordinateKey(cell), cell.slateInstanceId]));
}

function ownerIdsAtCells(board, cells, excludedInstanceId) {
  const ownerByCell = cellOwnerMap(board);
  const owners = new Set();
  for (const cell of cells) {
    const owner = ownerByCell.get(coordinateKey(cell));
    if (owner && owner !== excludedInstanceId) owners.add(owner);
  }
  return sortedOwnerIds(board, owners);
}

function adjacentOwnerIds(board, offspringCells, excludedInstanceId, deltas) {
  const candidates = [];
  for (const cell of offspringCells) {
    for (const [deltaX, deltaY] of deltas) {
      candidates.push({ x: cell.x + deltaX, y: cell.y + deltaY });
    }
  }
  return ownerIdsAtCells(board, candidates, excludedInstanceId);
}

function judgmentConnectorCells(offspringCells) {
  const offspringKeys = new Set(offspringCells.map(coordinateKey));
  const candidates = new Map();
  for (const cell of offspringCells) {
    for (const [deltaX, deltaY] of ORTHOGONAL_CELL_DELTAS) {
      const candidate = { x: cell.x + deltaX, y: cell.y + deltaY };
      if (!offspringKeys.has(coordinateKey(candidate))) {
        candidates.set(coordinateKey(candidate), candidate);
      }
    }
  }
  return [...candidates.values()].filter((candidate) => (
    ORTHOGONAL_CELL_DELTAS.filter(([deltaX, deltaY]) => (
      offspringKeys.has(`${candidate.x + deltaX}:${candidate.y + deltaY}`)
    )).length >= 2
  )).sort(compareCoordinates);
}

function topologyCells(instance, key) {
  if (!isCurrentHadesShapeInstance(instance)) return [];
  const offsets = HADES_DIVINITY_SHAPE_METADATA.shapes[instance?.shapeId]?.[key];
  if (!Array.isArray(offsets) || !instance?.anchor) return [];
  return offsets.map(([x, y]) => ({
    x: instance.anchor.x + x,
    y: instance.anchor.y + y,
  })).sort(compareCoordinates);
}

function hadesSelectionFacts(instance, talentById) {
  const diagnosis = diagnoseHadesSelections(instance, talentById);
  return {
    complete: diagnosis.complete,
    authorityActive: diagnosis.authorityActive,
    fixedTalentIds: diagnosis.fixedTalentIds,
    imprintTalentIds: diagnosis.imprintTalentIds,
    diagnostics: diagnosis.diagnostics,
  };
}

function projectHadesInstanceFacts(board, instance, placedInstances, talentById) {
  const template = requiredTemplate(instance.slateId);
  const offspringCells = getPlacedCells(board, instance.instanceId).sort(compareCoordinates);
  const selectionFacts = hadesSelectionFacts(instance, talentById);
  const common = {
    instanceId: instance.instanceId,
    templateId: instance.slateId,
    type: template.hadesType,
    shapeId: instance.shapeId,
    authorityActive: selectionFacts.authorityActive,
    authorityConfig: instance.hadesAuthorityConfig
      && typeof instance.hadesAuthorityConfig === "object"
      ? { ...instance.hadesAuthorityConfig }
      : null,
    selection: selectionFacts,
    topology: {
      sourceRole: HADES_DIVINITY_SHAPE_METADATA.sourceRole,
      structureStatus: HADES_DIVINITY_SHAPE_METADATA.structureStatus,
      structureAuthority: HADES_DIVINITY_SHAPE_METADATA.structureAuthority,
      sourceUrl: HADES_DIVINITY_SHAPE_METADATA.sourceUrl,
      grid: HADES_DIVINITY_SHAPE_METADATA.grid,
      shape: isCurrentHadesShapeInstance(instance)
        ? HADES_DIVINITY_SHAPE_METADATA.shapes[instance.shapeId]
        : null,
      offspringCells,
    },
  };

  if (template.hadesType === "judgment") {
    const currentConnectorCells = topologyCells(instance, "connectorCellOffsets");
    const connectorCells = currentConnectorCells.length
      ? currentConnectorCells
      : judgmentConnectorCells(offspringCells);
    const linkedSlateInstanceIds = ownerIdsAtCells(board, connectorCells, instance.instanceId);
    return {
      ...common,
      judgment: {
        connectorCells,
        linkedSlateInstanceIds,
        linkedSlateCount: linkedSlateInstanceIds.length,
        effectActive: selectionFacts.authorityActive,
        affixEffectIncreasePercent: HADES_DIVINITY_RUNTIME_METADATA.judgment.affixEffectIncreasePercent,
        affixMultiplier: HADES_DIVINITY_RUNTIME_METADATA.judgment.affixMultiplier,
        sourceMetadata: HADES_DIVINITY_RUNTIME_METADATA,
      },
    };
  }

  if (template.hadesType === "contamination") {
    const orthogonalTargetSlateInstanceIds = adjacentOwnerIds(
      board,
      offspringCells,
      instance.instanceId,
      ORTHOGONAL_CELL_DELTAS,
    );
    const orthogonalSet = new Set(orthogonalTargetSlateInstanceIds);
    const diagonalTargetSlateInstanceIds = adjacentOwnerIds(
      board,
      offspringCells,
      instance.instanceId,
      DIAGONAL_CELL_DELTAS,
    );
    const diagonalOnlyTargetSlateInstanceIds = diagonalTargetSlateInstanceIds
      .filter((instanceId) => !orthogonalSet.has(instanceId));
    const diagonalExtensionSelected = Object.values(instance.slotSelectionsByKey ?? {})
      .some((selection) => hasHadesStableTalentId(selection, "92000007"));
    const targetSlateInstanceIds = sortedOwnerIds(board, new Set([
      ...orthogonalTargetSlateInstanceIds,
      ...(diagonalExtensionSelected ? diagonalOnlyTargetSlateInstanceIds : []),
    ]));
    return {
      ...common,
      contamination: {
        orthogonalTargetSlateInstanceIds,
        diagonalTargetSlateInstanceIds,
        diagonalOnlyTargetSlateInstanceIds,
        diagonalExtensionSelected,
        diagonalExtensionActive: selectionFacts.authorityActive && diagonalExtensionSelected,
        targetSlateInstanceIds,
        projectedTargetSlateInstanceIds: selectionFacts.authorityActive ? targetSlateInstanceIds : [],
        effectActive: selectionFacts.authorityActive,
        projectionStrengthPercent: HADES_DIVINITY_RUNTIME_METADATA.contamination.projectionStrengthPercent,
        sourceMetadata: HADES_DIVINITY_RUNTIME_METADATA,
      },
    };
  }

  const currentEffectCells = topologyCells(instance, "effectCellOffsets");
  const adjacentSlateInstanceIds = currentEffectCells.length
    ? ownerIdsAtCells(board, currentEffectCells, instance.instanceId)
    : adjacentOwnerIds(
      board,
      offspringCells,
      instance.instanceId,
      ORTHOGONAL_CELL_DELTAS,
    );
  const adjacentSet = new Set(adjacentSlateInstanceIds);
  const nonAdjacentSlateInstanceIds = placedInstances
    .filter((candidate) => (
      candidate.instanceId !== instance.instanceId && !adjacentSet.has(candidate.instanceId)
    ))
    .map((candidate) => candidate.instanceId);
  const topologyRequirementSatisfied = (
    adjacentSlateInstanceIds.length
      >= HADES_DIVINITY_RUNTIME_METADATA.banishment.minimumAdjacentSlateCount
    && nonAdjacentSlateInstanceIds.length
      >= HADES_DIVINITY_RUNTIME_METADATA.banishment.minimumNonAdjacentSlateCount
  );
  return {
    ...common,
    banishment: {
      effectCells: currentEffectCells,
      adjacentSlateInstanceIds,
      adjacentSlateCount: adjacentSlateInstanceIds.length,
      nonAdjacentSlateInstanceIds,
      nonAdjacentSlateCount: nonAdjacentSlateInstanceIds.length,
      topologyRequirementSatisfied,
      effectActive: selectionFacts.authorityActive && topologyRequirementSatisfied,
      sourceMetadata: HADES_DIVINITY_RUNTIME_METADATA,
    },
  };
}

function projectHadesBoardFactsFrom(board, placedInstances, talentById) {
  const instances = placedInstances
    .filter((instance) => isHadesTemplateId(instance.slateId))
    .map((instance) => projectHadesInstanceFacts(board, instance, placedInstances, talentById));
  return {
    sourceMetadata: HADES_DIVINITY_RUNTIME_METADATA,
    instances,
    conflict: instances.length > 1,
    active: instances[0] ?? null,
    judgment: instances.find((instance) => instance.type === "judgment")?.judgment ?? null,
    contamination: instances.find((instance) => instance.type === "contamination")?.contamination ?? null,
    banishment: instances.find((instance) => instance.type === "banishment")?.banishment ?? null,
  };
}

export function projectHadesBoardFacts(board, { talentCatalog = [] } = {}) {
  return projectHadesBoardFactsFrom(
    board,
    placedDivinitySlateInstances(board),
    catalogMap(talentCatalog),
  );
}

const CONTAMINATION_PROJECTION_MODIFIERS = deepFreeze({
  "92000001": { increasePercent: 12, scope: "all" },
  "92000002": { increasePercent: 100, scope: "genealogy" },
  "92000003": { increasePercent: 50, scope: "stars_fall" },
  "92000004": { increasePercent: 30, scope: "corner_of_divinity" },
  "92000005": { increasePercent: 30, scope: "regular" },
  "92000006": { increasePercent: 30, scope: "new_god_statue_empty_slot" },
});

function roundedMultiplier(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function contaminationModifierApplies(board, targetInstanceId, modifierSelection, modifier) {
  const target = board.slateInventory.find((instance) => instance.instanceId === targetInstanceId);
  const template = getDivinitySlateTemplate(target?.slateId);
  if (modifier.scope === "all") return true;
  if (modifier.scope === "genealogy") return template?.id === "genealogy";
  if (modifier.scope === "stars_fall") return template?.id === "stars_fall";
  if (modifier.scope === "corner_of_divinity") return template?.id === "corner_of_divinity";
  if (modifier.scope === "regular") return template?.group === "regular";
  const occupied = new Set((board?.cells ?? []).map(({ x, y }) => `${x}:${y}`));
  return (board?.mask ?? []).some((row, x) => row.some((cell, y) => (
    cell === 1 && !occupied.has(`${x}:${y}`)
  )));
}

function contaminationProjectionScenario(board, targetInstanceId, imprintSelections) {
  const baseMultiplier = HADES_DIVINITY_RUNTIME_METADATA.contamination.projectionStrengthPercent / 100;
  const modifierSelections = imprintSelections.flatMap((selection) => {
    const talentId = hadesStableTalentId(selection);
    const modifier = CONTAMINATION_PROJECTION_MODIFIERS[talentId];
    return modifier ? [{ selection, talentId, modifier }] : [];
  });
  if (!modifierSelections.length) {
    return {
      baseMultiplier,
      scenarioMultiplier: baseMultiplier,
      scenarioMultiplierBranches: [baseMultiplier],
      modifier: null,
      modifiers: [],
    };
  }
  const modifiers = modifierSelections.map(({ selection, talentId, modifier }) => {
    const applies = contaminationModifierApplies(
      board,
      targetInstanceId,
      selection,
      modifier,
    );
    return {
      talentId,
      sourceItemId: selectionId(selection),
      scope: modifier.scope,
      increasePercent: modifier.increasePercent,
      applies,
      formula: HADES_DIVINITY_RUNTIME_METADATA.contamination.modifierFormula,
      formulaStatus: HADES_DIVINITY_RUNTIME_METADATA.contamination.modifierFormulaStatus,
    };
  });
  const scenarioMultiplier = roundedMultiplier(
    baseMultiplier + modifiers.reduce((sum, modifier) => (
      sum + (modifier.applies ? modifier.increasePercent / 100 : 0)
    ), 0),
  );
  return {
    baseMultiplier,
    scenarioMultiplier,
    scenarioMultiplierBranches: [scenarioMultiplier],
    modifier: modifiers[0],
    modifiers,
  };
}

function contaminationProjectedAffixes({
  board,
  hades,
  directSelectionsByInstanceId,
}) {
  const sourceFact = hades.instances.find((instance) => instance.type === "contamination");
  if (!sourceFact?.authorityActive || !sourceFact.contamination?.effectActive) return [];
  const sourceInstance = board.slateInventory.find((instance) => (
    instance.instanceId === sourceFact.instanceId
  ));
  if (!sourceInstance) return [];
  const imprintSelections = (directSelectionsByInstanceId[sourceInstance.instanceId] ?? [])
    .filter((selection) => ["imprint_1", "imprint_2", "imprint_3"].includes(selection.slotKey));

  return sourceFact.contamination.projectedTargetSlateInstanceIds.flatMap((targetInstanceId) => {
    const scenario = contaminationProjectionScenario(board, targetInstanceId, imprintSelections);
    const targetInstance = board.slateInventory.find(({ instanceId }) => (
      instanceId === targetInstanceId
    ));
    if (!targetInstance) return [];
    return imprintSelections.map((selection) => overviewAffix({
      ...selection,
      sourceInstanceId: sourceInstance.instanceId,
      sourceSlotKey: selection.slotKey,
      targetInstanceId,
      targetSlotKey: `contamination:${selection.slotKey}`,
      copyType: "contamination_projection",
      recursiveProjection: false,
      projectionDoesNotConsumeEffectCap: true,
      baseEffectMultiplier: scenario.baseMultiplier,
      effectMultiplier: scenario.scenarioMultiplier ?? scenario.baseMultiplier,
      scenarioMultiplier: scenario.scenarioMultiplier,
      scenarioMultiplierBranches: scenario.scenarioMultiplierBranches,
      effectMultiplierSource: {
        type: "hades_contamination_projection",
        sourceMetadata: HADES_DIVINITY_RUNTIME_METADATA.contamination,
        structureStatus: HADES_DIVINITY_SHAPE_METADATA.structureStatus,
        structureAuthority: HADES_DIVINITY_SHAPE_METADATA.structureAuthority,
        structureSourceUrl: HADES_DIVINITY_SHAPE_METADATA.sourceUrl,
        sourceInstanceId: sourceInstance.instanceId,
        targetInstanceId,
        recursiveProjection: false,
        modifier: scenario.modifier,
        modifiers: scenario.modifiers,
      },
    }, targetInstance, "contamination_projected"));
  });
}

function judgmentMultiplierForTarget(board, targetInstanceId, sourceInstance) {
  const target = board.slateInventory.find((instance) => instance.instanceId === targetInstanceId);
  const template = getDivinitySlateTemplate(target?.slateId);
  const selectedStableIds = new Set(
    Object.values(sourceInstance?.slotSelectionsByKey ?? {}).map(hadesStableTalentId).filter(Boolean),
  );
  let coefficientIncreasePercent = 0;
  let modifierTalentId = null;
  if (
    selectedStableIds.has("92300004")
    && ["corner_of_divinity", "stars_fall"].includes(template?.id)
  ) {
    coefficientIncreasePercent = 25;
    modifierTalentId = "92300004";
  } else if (
    selectedStableIds.has("92300005")
    && template
    && template.group !== "legendary"
  ) {
    coefficientIncreasePercent = 20;
    modifierTalentId = "92300005";
  }
  const baseIncrease = HADES_DIVINITY_RUNTIME_METADATA.judgment.affixEffectIncreasePercent / 100;
  return {
    multiplier: roundedMultiplier(1 + baseIncrease + coefficientIncreasePercent / 100),
    coefficientIncreasePercent,
    modifierTalentId,
    targetTemplateId: template?.id ?? target?.slateId ?? null,
  };
}

function applyJudgmentAffixMultiplier(board, hades, affix) {
  const sourceFact = hades.instances.find((instance) => instance.type === "judgment");
  if (
    !sourceFact?.judgment?.effectActive
    || !sourceFact.judgment.linkedSlateInstanceIds.includes(affix.instanceId)
    || affix.affixKind !== "talent"
    || affix.valueType === "core_talent"
    || affix.replicated === true
    || affix.isReplicated === true
  ) return affix;
  const sourceInstance = board.slateInventory.find((instance) => (
    instance.instanceId === sourceFact.instanceId
  ));
  const judgment = judgmentMultiplierForTarget(board, affix.instanceId, sourceInstance);
  const existingMultiplier = Number(affix.effectMultiplier ?? 1);
  const effectMultiplier = roundedMultiplier(
    (Number.isFinite(existingMultiplier) ? existingMultiplier : 1) * judgment.multiplier,
  );
  return {
    ...affix,
    effectMultiplier,
    effectMultiplierSource: {
      type: "hades_judgment_affix_effect",
      sourceMetadata: HADES_DIVINITY_RUNTIME_METADATA.judgment,
      structureStatus: HADES_DIVINITY_SHAPE_METADATA.structureStatus,
      structureAuthority: HADES_DIVINITY_SHAPE_METADATA.structureAuthority,
      structureSourceUrl: HADES_DIVINITY_SHAPE_METADATA.sourceUrl,
      sourceInstanceId: sourceFact.instanceId,
      targetInstanceId: affix.instanceId,
      targetTemplateId: judgment.targetTemplateId,
      baseAffixMultiplier: HADES_DIVINITY_RUNTIME_METADATA.judgment.affixMultiplier,
      coefficientIncreasePercent: judgment.coefficientIncreasePercent,
      modifierTalentId: judgment.modifierTalentId,
      previousMultiplierSource: affix.effectMultiplierSource ?? null,
    },
  };
}

export function projectDivinitySlateOverview(board, { talentCatalog = [] } = {}) {
  const placedInstances = placedDivinitySlateInstances(board);
  const talentById = catalogMap(talentCatalog);
  const directSelectionsByInstanceId = Object.fromEntries(
    placedInstances.map((instance) => [
      instance.instanceId,
      directSelectionsFor(instance, {}, talentById),
    ]),
  );
  const hades = projectHadesBoardFactsFrom(board, placedInstances, talentById);
  const directAndCopiedAffixes = placedInstances.flatMap((instance) => {
    const direct = (directSelectionsByInstanceId[instance.instanceId] ?? []).map((selection) => (
      overviewAffix(
        selection,
        instance,
        selectionValueType(selection) === "special_effect" ? "special_effect" : "talent",
      )
    ));
    const copied = resolveAdjacentDivinityCopies({
      board,
      targetInstanceId: instance.instanceId,
      talentCatalog,
      directSelectionsByInstanceId,
    }).map((selection) => overviewAffix(selection, instance, "copied"));
    return [...direct, ...copied];
  });
  const projectedAffixes = contaminationProjectedAffixes({
    board,
    hades,
    directSelectionsByInstanceId,
  });
  const affixes = [...directAndCopiedAffixes, ...projectedAffixes]
    .map((affix) => applyJudgmentAffixMultiplier(board, hades, affix))
    .sort(compareOverviewAffixes);

  const effectiveAffixes = [];
  const suppressedAffixes = [];
  const effectiveCountByLimitKey = new Map();
  for (const affix of affixes) {
    const cap = divinityEffectCap(affix);
    const effectiveCount = cap ? (effectiveCountByLimitKey.get(cap.limitKey) ?? 0) : 0;
    if (cap && effectiveCount >= cap.limit) {
      suppressedAffixes.push({
        ...affix,
        effectLimit: cap.limit,
        effectLimitKey: cap.limitKey,
        reason: "divinity_effect_cap_reached",
      });
      continue;
    }
    effectiveAffixes.push(affix);
    if (cap) effectiveCountByLimitKey.set(cap.limitKey, effectiveCount + 1);
  }

  return {
    effectivePlacedSlateIds: placedInstances.map((instance) => instance.instanceId),
    suppressedPlacedSlates: [],
    effectiveAffixes,
    suppressedAffixes,
    hades,
  };
}

export function projectDivinitySlateCalculationIds(board, { talentCatalog = [] } = {}) {
  if (!Array.isArray(board?.slateInventory)) return [];
  return projectDivinitySlateOverview(board, { talentCatalog }).effectiveAffixes
    .filter(isCalculationSelection)
    .map(calculationSelectionId)
    .filter(Boolean);
}

export function diagnoseHadesSelections(instance, hadesCatalog = []) {
  if (!isHadesTemplateId(instance?.slateId)) {
    throw new TypeError("Hades diagnostics require a Hades divinity slate");
  }
  const catalog = catalogMap(hadesCatalog);
  const template = requiredTemplate(instance.slateId);
  const diagnostics = [];
  const validBySlot = new Map();
  const currentStructure = isCurrentHadesShapeInstance(instance);

  if (!currentStructure) {
    diagnostics.push({ code: "legacy_hades_shape_unverified", shapeId: instance.shapeId });
  }

  const activeSlots = getDivinitySlateActiveSlotDefinitions(template, instance.shapeId);
  const activeSlotKeys = new Set(activeSlots.map(({ key }) => key));
  for (const slot of activeSlots) {
    const stored = instance.slotSelectionsByKey?.[slot.key];
    const valueId = selectionId(stored);
    if (!valueId) {
      diagnostics.push({ code: "missing_selection", slotKey: slot.key });
      validBySlot.set(slot.key, false);
      continue;
    }
    const record = catalog.get(valueId);
    if (!record) {
      diagnostics.push({ code: "unknown_selection", slotKey: slot.key, valueId });
      validBySlot.set(slot.key, false);
      continue;
    }
    if (stored.valueType !== "talent_affix") {
      diagnostics.push({ code: "invalid_value_type", slotKey: slot.key, valueId });
      validBySlot.set(slot.key, false);
      continue;
    }
    if (!isHadesSlotSelectionEligible(template.id, slot.key, record)) {
      diagnostics.push({ code: "invalid_category", slotKey: slot.key, valueId });
      validBySlot.set(slot.key, false);
      continue;
    }
    validBySlot.set(slot.key, true);
  }

  for (const slot of template.slotDefinitions) {
    if (
      !activeSlotKeys.has(slot.key)
      && selectionId(instance.slotSelectionsByKey?.[slot.key])
    ) diagnostics.push({ code: "inactive_shape_slot_selection", slotKey: slot.key });
  }

  const selectedId = (slotKey) => selectionId(instance.slotSelectionsByKey?.[slotKey]);
  const fixedTalentIds = ["fixed_1", "fixed_2"].map(selectedId).filter(Boolean);
  const activeImprintSlotKeys = activeSlots
    .filter(({ key }) => key.startsWith("imprint_"))
    .map(({ key }) => key);
  const imprintTalentIds = activeImprintSlotKeys.map(selectedId).filter(Boolean);
  return {
    complete: diagnostics.length === 0,
    authorityActive: currentStructure && activeImprintSlotKeys
      .every((slotKey) => validBySlot.get(slotKey) === true),
    fixedTalentIds,
    imprintTalentIds,
    activeImprintSlotKeys,
    diagnostics,
  };
}

export function diagnoseHadesJudgmentSelections(instance, hadesCatalog = []) {
  if (instance?.slateId !== "hades_judgment") {
    throw new TypeError("Hades judgment diagnostics require a hades_judgment slate");
  }
  return diagnoseHadesSelections(instance, hadesCatalog);
}

export function exportDivinitySlateBoard(board) {
  return exportDivinityBoard(board);
}

export function importDivinitySlateBoard(serialized) {
  const source = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  const restored = importDivinityBoard(source, new Set(DIVINITY_SLATE_TEMPLATE_IDS));
  const sourceByInstanceId = new Map(
    (source?.slateInventory ?? []).map((instance) => [instance.instanceId, instance]),
  );
  return {
    ...restored,
    slateInventory: restored.slateInventory.map((instance) => {
      const sourceInstance = sourceByInstanceId.get(instance.instanceId);
      const template = getDivinitySlateTemplate(instance.slateId);
      const validGod = template?.requiresGodSelection
        && DIVINITY_GODS.some((god) => god.slug === sourceInstance?.godSlug);
      return validGod ? { ...instance, godSlug: sourceInstance.godSlug } : instance;
    }),
  };
}
