import {
  createDivinityBoard,
  placeSlate,
} from "./divinityBoardModel.js";
import {
  addDivinitySlateToBoard,
  canAddDivinitySlate,
  createDivinitySlateInstance,
  getDivinitySlateTemplate,
  projectDivinitySlateOverview,
  setDivinitySlotSelection,
} from "./divinitySlateModel.js";
import {
  TOB91_DIVINITY_INTEROP_RECEIPT,
} from "./data/91tobDivinityInterop.ss13_4.generated.js";
import {
  HADES_COPY_CAPABILITIES_SS13_4,
  HADES_COPYABLE_TALENT_CONTRACTS_SS13_4,
} from "./data/hadesCopyContract.ss13_4.generated.js";
import { koreanGameTerm } from "./koreanGameTerminology.js";

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SUPPORTED_VALUE_TYPES = new Set(TOB91_DIVINITY_INTEROP_RECEIPT.supportedValueTypes);
const CORE_TALENT_SNAPSHOT = TOB91_DIVINITY_INTEROP_RECEIPT.coreTalentSnapshot;
const EXCLUDED_CORE_TALENT_SOURCE_IDS = new Set(
  CORE_TALENT_SNAPSHOT.excludedBindings.map(({ sourceId }) => sourceId),
);
const TEMPLATE_RECEIPT_BY_ID = new Map(
  TOB91_DIVINITY_INTEROP_RECEIPT.supportedTemplates.map((record) => [record.catalogId, record]),
);
const COPYING_SLOT_CONTRACT_BY_KEY = (() => {
  const contracts = new Map();
  for (const templateContract of TOB91_DIVINITY_INTEROP_RECEIPT.copyingTemplateContracts) {
    const template = getDivinitySlateTemplate(templateContract.catalogId);
    if (!template) return new Map();
    for (const slotContract of templateContract.slots) {
      const slot = template.slotDefinitions.find(({ key }) => key === slotContract.slotKey);
      if (!slot) return new Map();
      const localValues = slotContract.valueType === "special_effect"
        ? (slot.specialEffectOptions ?? []).map(({ id, direction, text }) => ({ id, direction, text }))
        : slot.copyRule
          ? [{
            id: slot.key,
            direction: slot.copyRule.direction,
            copyType: slot.copyRule.copyType,
          }]
          : [];
      if (JSON.stringify(localValues) !== JSON.stringify(slotContract.values)) return new Map();
      contracts.set(`${templateContract.catalogId}:${slotContract.slotKey}`, slotContract);
    }
  }
  return contracts;
})();
const HADES_SECTION_KEYS = Object.freeze([
  "hades_judgment",
  "hades_infusion",
  "hades_banishment",
]);
const HADES_VARIANT_BY_KEY = new Map(
  TOB91_DIVINITY_INTEROP_RECEIPT.hadesVariants.map((record) => (
    [`${record.sectionKey}:${record.variantId}`, record]
  )),
);
const HADES_VARIANT_BY_SHAPE_ID = new Map(
  TOB91_DIVINITY_INTEROP_RECEIPT.hadesVariants.map((record) => [record.shapeId, record]),
);
const HADES_TALENT_BY_SOURCE_ID = new Map(
  TOB91_DIVINITY_INTEROP_RECEIPT.hadesTalentIdentityGroups.flatMap((group) => (
    group.localStableIds.map((localStableId, index) => [
      `${group.sourcePrefix}${String(index + 1).padStart(3, "0")}`,
      { localStableId, localCategory: group.localCategory },
    ])
  )),
);
const HADES_AUTHORITY_BY_SOURCE_ID = new Map(
  TOB91_DIVINITY_INTEROP_RECEIPT.hadesAuthorityMappings.map((record) => (
    [record.sourceId, record]
  )),
);
const HADES_SOURCE_ID_BY_LOCAL_STABLE_ID = new Map(
  [...HADES_TALENT_BY_SOURCE_ID.entries()].map(([sourceId, identity]) => (
    [identity.localStableId, sourceId]
  )),
);
const INFUSION_FRONTEND_MECHANIC_BY_STABLE_ID = new Map([
  ["92000001", { id: "infusion_projection_all_bonus", increase: 0.12, scope: "all" }],
  ["92000002", { id: "infusion_projection_genealogy_bonus", increase: 1, scope: "genealogy" }],
  ["92000003", { id: "infusion_projection_stars_fall_bonus", increase: 0.5, scope: "stars_fall" }],
  ["92000004", { id: "infusion_projection_corner_bonus", increase: 0.3, scope: "corner_of_divinity" }],
  ["92000005", { id: "infusion_projection_regular_slate_bonus", increase: 0.3, scope: "regular" }],
  ["92000006", { id: "infusion_projection_vacancy_bonus", increase: 0.3, scope: "vacancy" }],
]);
const INFUSION_DIAGONAL_STABLE_ID = "92000007";
const INFUSION_DIAGONAL_MECHANIC_ID = "infusion_projection_diagonal_enabled";
const HADES_COPYING_TALENT_BY_SOURCE_ID = (() => {
  const contracts = new Map();
  if (
    TOB91_DIVINITY_INTEROP_RECEIPT.hadesCopyingTalentContracts
    !== HADES_COPYABLE_TALENT_CONTRACTS_SS13_4
  ) return contracts;
  for (const record of HADES_COPYABLE_TALENT_CONTRACTS_SS13_4) {
    const identity = HADES_TALENT_BY_SOURCE_ID.get(record?.sourceId);
    if (
      !identity
      || contracts.has(record.sourceId)
      || identity.localStableId !== record.localStableId
      || identity.localCategory !== record.localCategory
      || record.localCategory !== "common_imprint"
      || !Array.isArray(record.copyCapabilities)
      || record.copyCapabilities !== HADES_COPY_CAPABILITIES_SS13_4
      || typeof record.sourceText !== "string"
      || record.sourceText.length === 0
      || record.sourceText.length > 4096
    ) return new Map();
    contracts.set(record.sourceId, record);
  }
  return contracts.size === TOB91_DIVINITY_INTEROP_RECEIPT.hadesDataset.copyableTalentCount
    ? contracts
    : new Map();
})();
const HADES_AUTHORITY_BY_LOCAL_ARCHETYPE = new Map(
  TOB91_DIVINITY_INTEROP_RECEIPT.hadesAuthorityMappings.map((record) => (
    [record.localArchetype, record]
  )),
);
const INVENTORY_REQUIRED_KEYS = Object.freeze([
  "id",
  "catalog_id",
  "shape_id",
  "rotation",
  "flipped_h",
  "flipped_v",
  "slot_selections_by_key",
  "created_order",
]);
const INVENTORY_OPTIONAL_KEYS = Object.freeze(["god_slug"]);
const SNAPSHOT_REQUIRED_KEYS = Object.freeze([
  "affix_id",
  "slate_id",
  "slot_key",
  "source_type",
  "value_type",
  "text",
  "raw_text",
  "value_id",
  "created_order",
]);
const SNAPSHOT_OPTIONAL_KEYS = Object.freeze([
  "max_divinity_effect_count",
  "divinity_effect_limit_key",
  "core_talent_data_id",
  "season_key",
  "catalog_version",
  "raw_text_hash",
]);
const FRONTEND_SNAPSHOT_OPTIONAL_KEYS = Object.freeze([
  ...SNAPSHOT_OPTIONAL_KEYS,
  "divinity_effect_multiplier",
  "divinity_effect_multiplier_source",
  "divinity_effect_resolved_by",
]);
const HADES_SNAPSHOT_OPTIONAL_KEYS = Object.freeze([
  ...SNAPSHOT_OPTIONAL_KEYS,
  "divinity_effect_multiplier",
  "divinity_effect_multiplier_source",
  "divinity_effect_resolved_by",
  "hades_judgment_mechanic_id",
  "hades_banishment_mechanic_id",
  "hades_infusion_mechanic_ids",
]);
const SAFE_SNAPSHOT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,511}$/u;

const FRONTEND_SCALE_COOLDOWN_PATTERNS = Object.freeze([
  /(\d+(?:\.\d+)?)\s*秒\s*(?:冷却|间隔)/gu,
  /(?:冷却|间隔)\s*(?:时间|为)?\s*(\d+(?:\.\d+)?)\s*秒/gu,
  /每隔\s*(\d+(?:\.\d+)?)\s*秒/gu,
]);
const FRONTEND_SCALE_LIMIT_PATTERN = /[（(]\s*神格生效上限[:：]\s*\d+(?:\.\d+)?\s*[)）]/gu;
const FRONTEND_SCALE_LEVEL_PATTERN = /^([+-]?\d+(?:\.\d+)?)\s*(冰冷|火焰|闪电|攻击|法术|持续|物理|腐蚀|被动|主动|全部|贯注|智械|防护|召唤召唤物(?:的)?|魔灵)\s*技能等级(?:\s*[（(].*)?$/u;
const FRONTEND_SCALE_BLESSING_CAP_PATTERNS = Object.freeze([
  /^([+-]?\d+(?:\.\d+)?)\s*聚能祝福层数上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*灵动祝福层数上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*坚韧祝福层数上限(?:\s*[（(].*)?$/u,
]);
const FRONTEND_SCALE_INTEGER_PATTERNS = Object.freeze([
  /^([+-]?\d+(?:\.\d+)?)\s*引导层数上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*幻影数量(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*弹射次数(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*抛射投射物分裂数量(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*直射投射物穿透次数(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*智械召唤物数量上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*充能点数上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*魔灵最大数量上限(?:\s*[（(].*)?$/u,
  /^([+-]?\d+(?:\.\d+)?)\s*一次能够放置的哨卫数量(?:\s*[（(].*)?$/u,
  /^法术迸发上限\s*([+-]?\d+(?:\.\d+)?)(?:\s*[（(].*)?$/u,
]);
const FRONTEND_SCALE_ALL_NUMBER_IDS = new Set([
  "divinity-talent-33", "divinity-talent-165", "divinity-talent-208",
  "divinity-talent-239", "divinity-talent-240", "divinity-talent-241",
  "divinity-talent-310", "divinity-talent-375", "divinity-talent-445",
  "divinity-talent-447", "divinity-talent-612", "divinity-talent-645",
  "divinity-talent-914", "divinity-talent-945", "divinity-talent-1015",
]);
const FRONTEND_SCALE_PRESERVE_LINE_PATTERNS = Object.freeze([
  /持续时间/u,
  /(?:生命|护盾)?返还间隔/u,
  /护盾充能间隔/u,
  /免疫/u,
  /转化为/u,
  /受到的伤害转移至/u,
  /(?:不能|无法|不再|替换)/u,
  /(?:获得|失去)\s*(?:一|[+\-]?\d+(?:\.\d+)?)?\s*层/u,
  /施加\s*[+\-]?\d+(?:\.\d+)?\s*层/u,
  /额外造成\s*[+\-]?\d+(?:\.\d+)?\s*层/u,
  /几率获得(?:坚韧祝福|灵动祝福|聚能祝福|强硬|迷踪|邪祟|折磨|攻击激进|法术激进|迅捷)/u,
  /几率(?:标记敌人|使[^，,]*(?:虚弱|瘫痪)|造成(?:减速|致盲|伤害型异常状态))/u,
  /施加(?:冰结|麻痹|瘫痪|创伤|点燃|凋零|软弱|迟缓|诅咒|标记)/u,
  /淘汰生命值低于/u,
  /(?:立即)?开启护盾充能/u,
  /额外\s+-\d+(?:\.\d+)?%\s*(?:魔灵技能|哨卫)伤害/u,
]);
const FRONTEND_SCALE_PROTECTED_PATTERNS = Object.freeze([
  /(?:最近|近)\s*\d+(?:\.\d+)?\s*秒/gu,
  /持续\s*\d+(?:\.\d+)?\s*秒/gu,
  /(?:最多|至多)(?:叠加)?\s*[+\-]?\d+(?:\.\d+)?%?\s*(?:层|次|个|名)?/gu,
  /(?:间隔|每隔|冷却(?:时间)?(?:为)?)\s*\d+(?:\.\d+)?\s*秒/gu,
  /\d+(?:\.\d+)?\s*秒\s*(?:冷却|间隔)/gu,
  /消耗\s*[+\-]?\d+(?:\.\d+)?%?[^，,]*/gu,
]);

function frontendRoundInteger(value) {
  if (Math.abs(value) <= 1e-12) return 0;
  const sign = value > 0 ? 1 : -1;
  const absolute = Math.abs(value);
  return sign * (Math.trunc(absolute) + (absolute % 1 >= 0.5 - 1e-12 ? 1 : 0));
}

function frontendIntegerLine(value) {
  const text = String(value ?? "").trim();
  return FRONTEND_SCALE_LEVEL_PATTERN.test(text)
    || FRONTEND_SCALE_BLESSING_CAP_PATTERNS.some((pattern) => pattern.test(text))
    || FRONTEND_SCALE_INTEGER_PATTERNS.some((pattern) => pattern.test(text));
}

function scaleFrontendNumbers(value, multiplier) {
  const text = String(value ?? "").trim();
  const scale = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
  if (!text || Math.abs(scale - 1) <= 1e-12) return text;
  if (frontendIntegerLine(text)) {
    const match = text.match(/([+-]?)(\d+(?:\.\d+)?)/u);
    if (match) {
      const number = Number.parseFloat(`${match[1] ?? ""}${match[2] ?? ""}`);
      if (Number.isFinite(number)) {
        const scaled = frontendRoundInteger(number * scale);
        return text.replace(/([+-]?)(\d+(?:\.\d+)?)/u, `${scaled >= 0 ? "+" : "-"}${Math.abs(scaled)}`);
      }
    }
  }
  const protectedRanges = [];
  for (const pattern of FRONTEND_SCALE_COOLDOWN_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match.index !== undefined) protectedRanges.push([match.index, match.index + match[0].length]);
    }
  }
  for (const match of text.matchAll(FRONTEND_SCALE_LIMIT_PATTERN)) {
    if (match.index !== undefined) protectedRanges.push([match.index, match.index + match[0].length]);
  }
  for (const match of text.matchAll(/(每(?:有|拥有|获得)?\s*[+\-]?\d+(?:\.\d+)?\s*(?:层|点|个|米|秒)?[^，,\n]*[，,])/gu)) {
    if (match.index !== undefined) protectedRanges.push([match.index, match.index + match[0].length]);
  }
  return text.replace(/([+-]?)(\d+(?:\.\d+)?)/gu, (match, sign, digits, offset) => {
    if (protectedRanges.some(([start, end]) => start <= offset && offset < end)) return match;
    const number = Number.parseFloat(digits);
    if (!Number.isFinite(number)) return match;
    const scaled = number * scale;
    const rendered = digits.includes(".")
      ? scaled.toFixed(digits.split(".", 2)[1]?.length ?? 0)
      : Math.abs(scaled - Math.round(scaled)) <= 1e-9
        ? String(Math.round(scaled))
        : scaled.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "");
    return `${sign ?? ""}${rendered}`;
  });
}

function frontendSpecialInteger(value, multiplier) {
  const match = String(value).match(/^([+\-]?)(\d+(?:\.\d+)?)$/u);
  if (!match) return value;
  const number = Number.parseFloat(`${match[1]}${match[2]}`);
  const scaled = Math.sign(number) * Math.floor(Math.abs(number * multiplier) + 0.5 + 1e-12);
  return `${scaled < 0 ? "-" : match[1] === "+" ? "+" : ""}${Math.abs(scaled)}`;
}

function scale91TobDivinityText(value, multiplier, sourceId) {
  const text = String(value ?? "").trim();
  const lines = text.split("\n");
  if (FRONTEND_SCALE_ALL_NUMBER_IDS.has(sourceId)) {
    return lines.map((line) => scaleFrontendNumbers(line, multiplier)).join("\n");
  }
  if (["divinity-talent-72", "divinity-talent-123"].includes(sourceId)) {
    return lines.map((line) => line.replace(/([+\-]?)(\d+(?:\.\d+)?)/u, (match) => (
      frontendSpecialInteger(match, multiplier)
    ))).join("\n");
  }
  if (sourceId === "divinity-talent-98") {
    return lines.map((line) => line.replace(
      /(获得\s*)([+\-]?)(\d+(?:\.\d+)?)(\s*层坚韧祝福)/u,
      (match, prefix, sign, number, suffix) => `${prefix}${frontendSpecialInteger(`${sign}${number}`, multiplier)}${suffix}`,
    )).join("\n");
  }
  if (sourceId === "divinity-talent-142") {
    return lines.map((line) => line.replace(
      /(额外造成\s*)([+\-]?)(\d+(?:\.\d+)?)(\s*层点燃)/u,
      (match, prefix, sign, number, suffix) => `${prefix}${frontendSpecialInteger(`${sign}${number}`, multiplier)}${suffix}`,
    )).join("\n");
  }
  if (sourceId === "divinity-talent-980") {
    return lines.map((line, index) => index === 0 ? scaleFrontendNumbers(line, multiplier) : line).join("\n");
  }
  return lines.map((line) => {
    if (
      FRONTEND_SCALE_PRESERVE_LINE_PATTERNS.some((pattern) => pattern.test(line))
      || (!/[，,]/u.test(line.replace(FRONTEND_SCALE_LIMIT_PATTERN, ""))
        && /(?:层数|次数|数量|上限|阈值)/u.test(line))
    ) return line;
    const protectedText = [];
    const protect = (input, pattern) => input.replace(pattern, (match) => {
      const marker = String.fromCharCode(0xe000 + protectedText.length);
      protectedText.push(match);
      return marker;
    });
    let scalable = line;
    if (!/^\s*[+\-]?\d/u.test(scalable)) scalable = protect(scalable, /^\s*[^，,]*[，,]/u);
    for (const pattern of FRONTEND_SCALE_PROTECTED_PATTERNS) scalable = protect(scalable, pattern);
    scalable = scaleFrontendNumbers(scalable, multiplier);
    return scalable.replace(/[\ue000-\uf8ff]/gu, (marker) => (
      protectedText[marker.charCodeAt(0) - 0xe000] ?? marker
    ));
  }).join("\n");
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function allowedKeys(value, requiredKeys, optionalKeys = []) {
  if (!isPlainObject(value)) return false;
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  return requiredKeys.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function failure(code, path) {
  return { ok: false, issues: [{ code, path }] };
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function coreTalentSourceIdentity(activeBySourceId, sourceById) {
  return [...activeBySourceId.entries()]
    .flatMap(([sourceId, matches]) => matches
      .filter(({ valueType }) => valueType === "core_talent")
      .map((local) => {
        const source = sourceById.get(sourceId);
        return {
          sourceId,
          localId: local.id,
          sourceDataIds: Array.isArray(local.sourceDataIds)
            ? local.sourceDataIds.map(String)
            : [],
          sourceName: source?.name,
          sourceText: source?.text,
          sourceValueType: source?.valueType,
          localValueType: local.valueType,
        };
      }))
    .sort((left, right) => {
      if (left.sourceId !== right.sourceId) return left.sourceId < right.sourceId ? -1 : 1;
      if (left.localId !== right.localId) return left.localId < right.localId ? -1 : 1;
      return 0;
    });
}

function verifiedCoreTalentMappings(activeBySourceId, sourceById) {
  const identity = coreTalentSourceIdentity(activeBySourceId, sourceById);
  const identityJson = JSON.stringify(identity);
  if (
    identity.length !== CORE_TALENT_SNAPSHOT.candidateCount
    || identityJson.length !== CORE_TALENT_SNAPSHOT.sourceIdentityJsonLength
    || fnv1a64(identityJson) !== CORE_TALENT_SNAPSHOT.sourceIdentityFnv1a64
  ) return new Map();

  const mappings = new Map();
  for (const record of identity) {
    if (EXCLUDED_CORE_TALENT_SOURCE_IDS.has(record.sourceId)) continue;
    const activeMatches = activeBySourceId.get(record.sourceId) ?? [];
    const activeRecord = activeMatches.length === 1 ? activeMatches[0] : null;
    const sourceRecord = sourceById.get(record.sourceId);
    if (
      !activeRecord
      || !sourceRecord
      || sourceRecord.valueType !== "core_talent"
      || activeRecord.valueType !== "core_talent"
      || !Array.isArray(activeRecord.sourceDataIds)
      || activeRecord.sourceDataIds.length !== 1
    ) return new Map();
    mappings.set(record.sourceId, {
      sourceRecord,
      activeRecord,
      coreTalentDataId: String(activeRecord.sourceDataIds[0]),
    });
  }
  return mappings.size === CORE_TALENT_SNAPSHOT.supportedCount ? mappings : new Map();
}

function contextCatalogs(context) {
  const active = context?.divinityModel?.selectionCatalog;
  const source = context?.divinitySourceCatalog;
  if (!Array.isArray(active) || !Array.isArray(source)) return null;

  const activeBySourceId = new Map();
  const activeByLocalId = new Map();
  const activeHadesByStableId = new Map();
  for (const record of active) {
    if (!record?.id || activeByLocalId.has(record.id)) return null;
    activeByLocalId.set(record.id, record);
    if (record.structuralSourceKind === "hades" && record.hadesCategory) {
      const stableIds = [
        ...(Array.isArray(record.sourceDataIds) ? record.sourceDataIds : []),
        record.sourceRecordKey,
        record.id,
      ].map((value) => String(value ?? "").match(/9\d{7}$/u)?.[0]).filter(Boolean);
      const stableId = [...new Set(stableIds)][0];
      if (!stableId || activeHadesByStableId.has(stableId)) return null;
      activeHadesByStableId.set(stableId, record);
    }
    if (!record?.legacyRuntimeId) continue;
    const matches = activeBySourceId.get(record.legacyRuntimeId) ?? [];
    matches.push(record);
    activeBySourceId.set(record.legacyRuntimeId, matches);
  }
  const sourceById = new Map();
  for (const record of source) {
    if (!record?.id || sourceById.has(record.id)) return null;
    sourceById.set(record.id, record);
  }
  const coreBySourceId = verifiedCoreTalentMappings(activeBySourceId, sourceById);
  return {
    activeBySourceId,
    activeByLocalId,
    activeHadesByStableId,
    sourceById,
    coreBySourceId,
  };
}

function hadesTalentMapping(sourceId, catalogs) {
  const identity = HADES_TALENT_BY_SOURCE_ID.get(sourceId);
  if (!identity) return null;
  const activeRecord = catalogs.activeHadesByStableId.get(identity.localStableId);
  if (!activeRecord || activeRecord.hadesCategory !== identity.localCategory) return null;
  return { sourceId, ...identity, activeRecord };
}

function hadesImprintTalentMapping(sourceId, catalogs) {
  const hades = hadesTalentMapping(sourceId, catalogs);
  if (hades) return hades;
  const generic = sourceSelectionMapping({
    value_type: "talent_affix",
    value_id: sourceId,
  }, catalogs);
  return generic ? { sourceId, ...generic } : null;
}

function hadesStableId(record) {
  const candidates = [
    ...(Array.isArray(record?.sourceDataIds) ? record.sourceDataIds : []),
    record?.sourceRecordKey,
    record?.id,
  ];
  for (const candidate of candidates) {
    const stableId = String(candidate ?? "").match(/9\d{7}$/u)?.[0];
    if (stableId) return stableId;
  }
  return null;
}

function sourceHadesSelectionMapping(value, catalogs, slotKey) {
  if (!allowedKeys(value, ["value_type", "value_id"]) || value.value_type !== "talent_affix") {
    return null;
  }
  return slotKey.startsWith("imprint_")
    ? hadesImprintTalentMapping(value.value_id, catalogs)
    : hadesTalentMapping(value.value_id, catalogs);
}

function sourceIdForActiveHadesRecord(record) {
  const stableId = hadesStableId(record);
  return stableId ? HADES_SOURCE_ID_BY_LOCAL_STABLE_ID.get(stableId) ?? null : null;
}

function importHadesSidecar(input, board, catalogs) {
  const presentSections = HADES_SECTION_KEYS.filter((key) => Object.hasOwn(input, key));
  if (!presentSections.length) {
    return { ok: true, board, mappedPaths: [], mappings: [] };
  }
  if (presentSections.length !== 1) {
    return failure("91tob-divinity-hades-conflict", "divinity");
  }

  const sectionKey = presentSections[0];
  const source = input[sectionKey];
  const authorityAllowed = sectionKey === "hades_banishment";
  if (!allowedKeys(
    source,
    ["enabled", "variant_id", "fixed_talent_ids", "imprint_talent_ids"],
    authorityAllowed ? ["authority_talent_id"] : [],
  ) || source.enabled !== true || typeof source.variant_id !== "string") {
    return failure("91tob-divinity-hades-invalid", `divinity.${sectionKey}`);
  }
  const variant = HADES_VARIANT_BY_KEY.get(`${sectionKey}:${source.variant_id}`);
  if (
    !variant
    || !Array.isArray(source.fixed_talent_ids)
    || source.fixed_talent_ids.length > 2
    || !Array.isArray(source.imprint_talent_ids)
    || source.imprint_talent_ids.length > variant.imprintSlotKeys.length
    || source.fixed_talent_ids.some((id) => !HADES_TALENT_BY_SOURCE_ID.has(id))
    || source.imprint_talent_ids.some((id) => !hadesImprintTalentMapping(id, catalogs))
  ) return failure("91tob-divinity-hades-invalid", `divinity.${sectionKey}`);

  const authority = Object.hasOwn(source, "authority_talent_id")
    ? HADES_AUTHORITY_BY_SOURCE_ID.get(source.authority_talent_id)
    : null;
  if (Object.hasOwn(source, "authority_talent_id") && !authority) {
    return failure("91tob-divinity-hades-invalid", `divinity.${sectionKey}.authority_talent_id`);
  }

  const instanceId = `91tob-${sectionKey.replaceAll("_", "-")}`;
  let instance;
  try {
    instance = createDivinitySlateInstance({
      instanceId,
      templateId: variant.templateId,
      shapeId: variant.shapeId,
      rotation: 0,
      flippedH: false,
      flippedV: false,
      createdOrder: board.slateInventory.reduce(
        (maximum, candidate) => Math.max(maximum, candidate.createdOrder ?? 0),
        0,
      ) + 1,
      ...(authority ? {
        hadesAuthorityConfig: { banishmentArchetype: authority.localArchetype },
      } : {}),
    });
  } catch {
    return failure("91tob-divinity-hades-invalid", `divinity.${sectionKey}`);
  }

  const selectionMappings = [];
  const applySelections = (sourceIds, slotKeys, field, mappingForSourceId) => {
    for (const [index, sourceId] of sourceIds.entries()) {
      const path = `divinity.${sectionKey}.${field}[${index}]`;
      const mapping = mappingForSourceId(sourceId, catalogs);
      if (!mapping) return failure("91tob-divinity-hades-selection-invalid", path);
      try {
        instance = setDivinitySlotSelection(instance, slotKeys[index], mapping.activeRecord);
      } catch {
        return failure("91tob-divinity-hades-selection-invalid", path);
      }
      selectionMappings.push({
        sourceSlotKey: slotKeys[index],
        sourceValueId: sourceId,
        localValueId: mapping.activeRecord.id,
      });
    }
    return null;
  };
  const fixedFailure = applySelections(
    source.fixed_talent_ids,
    ["fixed_1", "fixed_2"],
    "fixed_talent_ids",
    hadesTalentMapping,
  );
  if (fixedFailure) return fixedFailure;
  const imprintFailure = applySelections(
    source.imprint_talent_ids,
    variant.imprintSlotKeys,
    "imprint_talent_ids",
    hadesImprintTalentMapping,
  );
  if (imprintFailure) return imprintFailure;

  const existingHades = board.slateInventory.filter((candidate) => (
    HADES_VARIANT_BY_SHAPE_ID.get(candidate.shapeId)?.templateId === candidate.slateId
  ));
  if (existingHades.length > 1) {
    return failure("91tob-divinity-hades-conflict", "divinity.inventory");
  }
  if (existingHades.length === 1) {
    const existing = existingHades[0];
    if (
      existing.slateId !== variant.templateId
      || existing.shapeId !== variant.shapeId
      || existing.rotation !== 0
      || existing.flippedH !== false
      || existing.flippedV !== false
      || existing.anchor?.x !== variant.fixedPosition.x
      || existing.anchor?.y !== variant.fixedPosition.y
      || !sameJson(existing.slotSelectionsByKey, instance.slotSelectionsByKey)
    ) return failure("91tob-divinity-hades-conflict", `divinity.${sectionKey}`);
    instance = createDivinitySlateInstance({
      instanceId: existing.instanceId,
      templateId: existing.slateId,
      shapeId: existing.shapeId,
      rotation: existing.rotation,
      flippedH: existing.flippedH,
      flippedV: existing.flippedV,
      affixIds: existing.affixIds,
      slotSelectionsByKey: existing.slotSelectionsByKey,
      ...(authority ? {
        hadesAuthorityConfig: { banishmentArchetype: authority.localArchetype },
      } : {}),
      createdOrder: existing.createdOrder,
      anchor: existing.anchor,
    });
    board = {
      ...board,
      slateInventory: board.slateInventory.map((candidate) => (
        candidate.instanceId === existing.instanceId ? instance : candidate
      )),
    };
  } else {
    try {
      board = addDivinitySlateToBoard(board, instance);
      board = placeSlate(board, instanceId, variant.fixedPosition);
    } catch {
      return failure("91tob-divinity-hades-placement-invalid", `divinity.${sectionKey}`);
    }
  }

  return {
    ok: true,
    board,
    mappedPaths: [
      `divinity.${sectionKey}.enabled`,
      `divinity.${sectionKey}.variant_id`,
      ...source.fixed_talent_ids.map((_, index) => (
        `divinity.${sectionKey}.fixed_talent_ids[${index}]`
      )),
      ...source.imprint_talent_ids.map((_, index) => (
        `divinity.${sectionKey}.imprint_talent_ids[${index}]`
      )),
      ...(authority ? [`divinity.${sectionKey}.authority_talent_id`] : []),
    ],
    mappings: [{
      sourceSectionKey: sectionKey,
      sourceVariantId: source.variant_id,
      localSlateId: instance.slateId,
      selections: selectionMappings,
      ...(authority ? {
        sourceAuthorityTalentId: authority.sourceId,
        localBanishmentArchetype: authority.localArchetype,
      } : {}),
    }],
  };
}

function sourceSelectionMapping(value, catalogs) {
  if (!allowedKeys(value, ["value_type", "value_id"])) return null;
  if (!SUPPORTED_VALUE_TYPES.has(value.value_type) || !SAFE_ID_PATTERN.test(value.value_id)) {
    return null;
  }
  if (value.value_type === "core_talent") {
    return catalogs.coreBySourceId.get(value.value_id) ?? null;
  }
  const sourceRecord = catalogs.sourceById.get(value.value_id);
  const activeMatches = catalogs.activeBySourceId.get(value.value_id) ?? [];
  if (
    !sourceRecord
    || sourceRecord.valueType !== value.value_type
    || activeMatches.length !== 1
    || activeMatches[0].valueType !== value.value_type
  ) return null;
  return { sourceRecord, activeRecord: activeMatches[0] };
}

function structuralSelectionMapping(value, template, slotKey) {
  if (!allowedKeys(value, ["value_type", "value_id"])) return null;
  const slot = template?.slotDefinitions?.find(({ key }) => key === slotKey);
  const contract = COPYING_SLOT_CONTRACT_BY_KEY.get(`${template?.id}:${slotKey}`);
  if (
    !slot
    || !contract
    || contract.valueType !== value.value_type
    || !SAFE_ID_PATTERN.test(value.value_id)
  ) return null;
  if (value.value_type === "special_effect") {
    const contractValue = contract.values.find(({ id }) => id === value.value_id);
    const option = slot.specialEffectOptions?.find(({ id }) => id === value.value_id);
    if (
      !contractValue
      || !option
      || option.direction !== contractValue.direction
      || option.text !== contractValue.text
    ) return null;
    return option ? {
      sourceRecord: { ...option, valueType: "special_effect" },
      activeRecord: { ...option, valueType: "special_effect" },
    } : null;
  }
  if (value.value_type === "copy_slot") {
    const contractValue = contract.values.find(({ id }) => id === value.value_id);
    return slot.copyRule
      && contractValue
      && value.value_id === slot.key
      && slot.copyRule.direction === contractValue.direction
      && slot.copyRule.copyType === contractValue.copyType ? {
      sourceRecord: { id: slot.key, valueType: "copy_slot", text: slot.label },
      activeRecord: { id: slot.key, valueType: "copy_slot", text: slot.label },
    } : null;
  }
  return null;
}

function sourceDirectSelectionMapping(value, catalogs, template, slotKey) {
  return sourceSelectionMapping(value, catalogs)
    ?? structuralSelectionMapping(value, template, slotKey);
}

function snapshotCap(rawText) {
  const match = String(rawText ?? "").match(/（神格生效上限：(\d+)）$/u);
  if (!match) return null;
  return {
    count: Number(match[1]),
    key: rawText.replace(/（神格生效上限：\d+）$/u, "").replace(/\s+/gu, " ").trim(),
  };
}

function hashCoreTalentRawText(value) {
  let hash = 2166136261;
  for (const character of String(value ?? "").trim().replace(/[\s\u3000]+/gu, "")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function snapshotDisplayText(sourceRecord) {
  return sourceRecord.valueType === "core_talent" ? sourceRecord.name : sourceRecord.text;
}

function directSnapshotEntry({
  slateId,
  slotKey,
  sourceRecord,
  coreTalentDataId,
  createdOrder,
  sourceType = "talent",
}) {
  const cap = snapshotCap(sourceRecord.text);
  const displayText = snapshotDisplayText(sourceRecord);
  return {
    affix_id: `${slateId}:${slotKey}:${sourceRecord.id}`,
    slate_id: slateId,
    slot_key: slotKey,
    source_type: sourceType,
    value_type: sourceRecord.valueType,
    text: displayText,
    raw_text: displayText,
    value_id: sourceRecord.id,
    ...(sourceRecord.valueType === "core_talent" ? {
      core_talent_data_id: coreTalentDataId,
      season_key: CORE_TALENT_SNAPSHOT.seasonKey,
      catalog_version: CORE_TALENT_SNAPSHOT.catalogVersion,
      raw_text_hash: hashCoreTalentRawText(sourceRecord.text),
    } : {}),
    created_order: createdOrder,
    ...(cap ? {
      max_divinity_effect_count: cap.count,
      divinity_effect_limit_key: cap.key,
    } : {}),
  };
}

function copiedSnapshotSourceRecord(affix, activeRecord, catalogs) {
  if (activeRecord?.legacyRuntimeId) {
    return catalogs.sourceById.get(activeRecord.legacyRuntimeId) ?? null;
  }
  const sourceId = sourceIdForActiveHadesRecord(activeRecord);
  const contract = sourceId ? HADES_COPYING_TALENT_BY_SOURCE_ID.get(sourceId) : null;
  if (
    !contract
    || contract.localStableId !== hadesStableId(activeRecord)
    || contract.localCategory !== activeRecord.hadesCategory
    || activeRecord.valueType !== "talent_affix"
    || !contract.copyCapabilities.includes(affix.copyType)
  ) return null;
  return {
    id: contract.sourceId,
    valueType: "talent_affix",
    text: contract.sourceText,
  };
}

function copiedSnapshotEntries(board, catalogs) {
  const overview = projectDivinitySlateOverview(board, {
    talentCatalog: [...catalogs.activeByLocalId.values()],
  });
  const entries = [];
  for (const affix of overview.effectiveAffixes) {
    if (affix.affixKind !== "copied") continue;
    const activeRecord = catalogs.activeByLocalId.get(affix.valueId);
    const sourceRecord = copiedSnapshotSourceRecord(affix, activeRecord, catalogs);
    const target = board.slateInventory.find(({ instanceId }) => (
      instanceId === affix.targetInstanceId
    ));
    if (
      !sourceRecord
      || sourceRecord.valueType !== activeRecord.valueType
      || !target
      || !SAFE_ID_PATTERN.test(affix.sourceInstanceId)
      || !SAFE_ID_PATTERN.test(affix.sourceSlotKey)
      || !SAFE_SNAPSHOT_ID_PATTERN.test(affix.targetSlotKey)
    ) return null;
    const entry = directSnapshotEntry({
      slateId: affix.targetInstanceId,
      slotKey: affix.targetSlotKey,
      sourceRecord,
      createdOrder: target.createdOrder,
      sourceType: "copied",
    });
    entry.affix_id = [
      affix.targetInstanceId,
      affix.targetSlotKey,
      affix.sourceInstanceId,
      affix.sourceSlotKey,
      sourceRecord.id,
      "copied",
    ].join(":");
    entries.push(entry);
  }
  return entries;
}

function judgmentFrontendResolutionByAffixId(board, catalogs) {
  const overview = projectDivinitySlateOverview(board, {
    talentCatalog: [...catalogs.activeByLocalId.values()],
  });
  const resolutions = new Map();
  for (const affix of overview.effectiveAffixes) {
    if (
      affix.affixKind !== "talent"
      || affix.effectMultiplierSource?.type !== "hades_judgment_affix_effect"
      || !Number.isFinite(Number(affix.effectMultiplier))
      || Number(affix.effectMultiplier) <= 1
    ) continue;
    const activeRecord = catalogs.activeByLocalId.get(affix.valueId);
    const sourceRecord = activeRecord?.legacyRuntimeId
      ? catalogs.sourceById.get(activeRecord.legacyRuntimeId)
      : null;
    if (!sourceRecord || sourceRecord.valueType !== "talent_affix") continue;
    const multiplier = Number(affix.effectMultiplier);
    const rawText = snapshotDisplayText(sourceRecord);
    const text = scale91TobDivinityText(rawText, multiplier, sourceRecord.id);
    if (text === rawText) continue;
    resolutions.set(`${affix.instanceId}:${affix.slotKey}:${sourceRecord.id}`, {
      text,
      rawText,
      multiplier,
      source: "hades_judgment_connection",
      resolvedBy: "frontend",
    });
  }
  return resolutions;
}

function applyJudgmentFrontendResolution(entry, resolution) {
  if (!resolution) return entry;
  return {
    ...entry,
    text: resolution.text,
    raw_text: resolution.rawText,
    divinity_effect_multiplier: resolution.multiplier,
    divinity_effect_multiplier_source: resolution.source,
    divinity_effect_resolved_by: resolution.resolvedBy,
  };
}

function boardHasVacantCell(board) {
  const occupied = new Set((board?.cells ?? []).map(({ x, y }) => `${x}:${y}`));
  return (board?.mask ?? []).some((row, x) => row.some((cell, y) => (
    cell === 1 && !occupied.has(`${x}:${y}`)
  )));
}

function infusionMechanicApplies(mechanic, board, targetInstance) {
  if (mechanic.scope === "all") return true;
  if (mechanic.scope === "genealogy") return targetInstance.slateId === "genealogy";
  if (mechanic.scope === "stars_fall") return targetInstance.slateId === "stars_fall";
  if (mechanic.scope === "corner_of_divinity") {
    return targetInstance.slateId === "corner_of_divinity";
  }
  if (mechanic.scope === "regular") {
    return getDivinitySlateTemplate(targetInstance.slateId)?.group === "regular";
  }
  return mechanic.scope === "vacancy" && boardHasVacantCell(board);
}

function projectedSnapshotSourceRecord(affix, catalogs) {
  const activeRecord = catalogs.activeByLocalId.get(affix.valueId);
  if (activeRecord?.legacyRuntimeId) {
    return catalogs.sourceById.get(activeRecord.legacyRuntimeId) ?? null;
  }
  const sourceId = sourceIdForActiveHadesRecord(activeRecord);
  const contract = sourceId ? HADES_COPYING_TALENT_BY_SOURCE_ID.get(sourceId) : null;
  return contract ? {
    id: contract.sourceId,
    valueType: "talent_affix",
    text: contract.sourceText,
  } : null;
}

function infusionProjectedSnapshotEntries(board, catalogs) {
  const overview = projectDivinitySlateOverview(board, {
    talentCatalog: [...catalogs.activeByLocalId.values()],
  });
  const sourceFact = overview.hades?.instances?.find(({ type }) => type === "contamination");
  if (!sourceFact?.contamination?.effectActive) return [];
  const sourceInstance = board.slateInventory.find(({ instanceId }) => (
    instanceId === sourceFact.instanceId
  ));
  const variant = HADES_VARIANT_BY_SHAPE_ID.get(sourceInstance?.shapeId);
  if (!sourceInstance || variant?.sectionKey !== "hades_infusion") return null;

  const selectedStableIds = variant.imprintSlotKeys.map((slotKey) => (
    hadesStableId(catalogs.activeByLocalId.get(sourceInstance.slotSelectionsByKey?.[slotKey]?.valueId))
  ));
  const selectedStableIdSet = new Set(selectedStableIds);
  const diagonalTargets = new Set(
    sourceFact.contamination.diagonalOnlyTargetSlateInstanceIds ?? [],
  );
  const allProjected = [
    ...(overview.effectiveAffixes ?? []),
    ...(overview.suppressedAffixes ?? []),
  ].filter(({ affixKind }) => affixKind === "contamination_projected");
  const entries = [];
  for (const affix of allProjected) {
    const activeRecord = catalogs.activeByLocalId.get(affix.valueId);
    const stableId = hadesStableId(activeRecord);
    if (/^9200000[1-7]$/u.test(stableId ?? "")) continue;
    const sourceRecord = projectedSnapshotSourceRecord(affix, catalogs);
    const sourceIndex = variant.imprintSlotKeys.indexOf(affix.sourceSlotKey);
    const targetInstance = board.slateInventory.find(({ instanceId }) => (
      instanceId === affix.instanceId
    ));
    if (!sourceRecord || sourceIndex < 0 || !targetInstance) return null;
    if (/神格生效上限[:：]\s*1/u.test(sourceRecord.text)) continue;

    let multiplier = 0.2;
    const mechanicIds = [];
    for (const [stableId, mechanic] of INFUSION_FRONTEND_MECHANIC_BY_STABLE_ID) {
      if (
        !selectedStableIdSet.has(stableId)
        || !infusionMechanicApplies(mechanic, board, targetInstance)
      ) continue;
      multiplier += mechanic.increase;
      mechanicIds.push(mechanic.id);
    }
    if (
      diagonalTargets.has(targetInstance.instanceId)
      && selectedStableIdSet.has(INFUSION_DIAGONAL_STABLE_ID)
    ) mechanicIds.push(INFUSION_DIAGONAL_MECHANIC_ID);
    multiplier = Number(multiplier.toFixed(10));
    if (Number(affix.effectMultiplier) !== multiplier) return null;

    const rawText = snapshotDisplayText(sourceRecord);
    const text = scale91TobDivinityText(rawText, multiplier, sourceRecord.id);
    entries.push({
      affix_id: `${targetInstance.instanceId}:hades:${sourceIndex}:${sourceRecord.id}:projected`,
      slate_id: targetInstance.instanceId,
      slot_key: `projected:hades:${sourceIndex}`,
      source_type: "projected",
      value_type: sourceRecord.valueType,
      text,
      raw_text: rawText,
      value_id: sourceRecord.id,
      created_order: targetInstance.createdOrder,
      divinity_effect_multiplier: multiplier,
      divinity_effect_multiplier_source: "hades_infusion_projection",
      divinity_effect_resolved_by: "frontend",
      hades_infusion_mechanic_ids: mechanicIds,
    });
  }
  return entries;
}

const PUBLIC_SNAPSHOT_SOURCE_ORDER = Object.freeze({
  talent: 0,
  special_effect: 1,
  copied: 2,
  projected: 3,
});

function comparePublicSnapshotEntries(left, right) {
  const sourceOrder = (PUBLIC_SNAPSHOT_SOURCE_ORDER[left.source_type] ?? 99)
    - (PUBLIC_SNAPSHOT_SOURCE_ORDER[right.source_type] ?? 99);
  if (sourceOrder !== 0) return sourceOrder;
  if (left.created_order !== right.created_order) {
    return left.created_order - right.created_order;
  }
  return left.affix_id < right.affix_id ? -1 : left.affix_id > right.affix_id ? 1 : 0;
}

function hadesSnapshotContract(input) {
  const selectedValueIds = new Set();
  const slateIds = new Set(["hades-judgment", "hades-infusion", "hades-banishment"]);
  let enabled = false;
  for (const sectionKey of HADES_SECTION_KEYS) {
    const section = input[sectionKey];
    if (!isPlainObject(section)) continue;
    enabled = true;
    for (const field of ["fixed_talent_ids", "imprint_talent_ids"]) {
      for (const valueId of section[field] ?? []) selectedValueIds.add(valueId);
    }
    if (typeof section.authority_talent_id === "string") {
      selectedValueIds.add(section.authority_talent_id);
    }
  }
  for (const sourceInstance of input.inventory ?? []) {
    if (typeof sourceInstance?.id === "string") slateIds.add(sourceInstance.id);
    const variant = HADES_VARIANT_BY_SHAPE_ID.get(sourceInstance?.shape_id);
    if (variant?.templateId !== sourceInstance?.catalog_id) continue;
    enabled = true;
    for (const selection of Object.values(sourceInstance.slot_selections_by_key ?? {})) {
      if (typeof selection?.value_id === "string") selectedValueIds.add(selection.value_id);
    }
  }
  return { enabled, selectedValueIds, slateIds };
}

function validOptionalHadesSnapshotFields(entry) {
  const hasCap = Object.hasOwn(entry, "max_divinity_effect_count")
    || Object.hasOwn(entry, "divinity_effect_limit_key");
  if (hasCap && (
    !Number.isSafeInteger(entry.max_divinity_effect_count)
    || entry.max_divinity_effect_count < 0
    || typeof entry.divinity_effect_limit_key !== "string"
    || entry.divinity_effect_limit_key.length > 1024
  )) return false;

  const frontendKeys = [
    "divinity_effect_multiplier",
    "divinity_effect_multiplier_source",
    "divinity_effect_resolved_by",
  ];
  const frontendCount = frontendKeys.filter((key) => Object.hasOwn(entry, key)).length;
  if (frontendCount !== 0 && (
    frontendCount !== frontendKeys.length
    || !Number.isFinite(entry.divinity_effect_multiplier)
    || entry.divinity_effect_multiplier <= 0
    || entry.divinity_effect_multiplier > 100
    || typeof entry.divinity_effect_multiplier_source !== "string"
    || !SAFE_SNAPSHOT_ID_PATTERN.test(entry.divinity_effect_multiplier_source)
    || entry.divinity_effect_resolved_by !== "frontend"
  )) return false;
  if (entry.source_type === "projected" && frontendCount !== frontendKeys.length) return false;

  for (const key of ["hades_judgment_mechanic_id", "hades_banishment_mechanic_id"]) {
    if (Object.hasOwn(entry, key) && (
      typeof entry[key] !== "string" || !SAFE_SNAPSHOT_ID_PATTERN.test(entry[key])
    )) return false;
  }
  if (Object.hasOwn(entry, "hades_infusion_mechanic_ids") && (
    !Array.isArray(entry.hades_infusion_mechanic_ids)
    || entry.hades_infusion_mechanic_ids.length > 16
    || new Set(entry.hades_infusion_mechanic_ids).size !== entry.hades_infusion_mechanic_ids.length
    || entry.hades_infusion_mechanic_ids.some((value) => (
      typeof value !== "string" || !SAFE_SNAPSHOT_ID_PATTERN.test(value)
    ))
  )) return false;
  return true;
}

function validateHadesDerivedSnapshotEntry(entry, contract) {
  if (
    !contract.enabled
    || !allowedKeys(entry, SNAPSHOT_REQUIRED_KEYS, HADES_SNAPSHOT_OPTIONAL_KEYS)
    || !SAFE_SNAPSHOT_ID_PATTERN.test(entry.affix_id)
    || !contract.slateIds.has(entry.slate_id)
    || !SAFE_SNAPSHOT_ID_PATTERN.test(entry.slot_key)
    || !["talent", "projected"].includes(entry.source_type)
    || entry.value_type !== "talent_affix"
    || typeof entry.text !== "string"
    || typeof entry.raw_text !== "string"
    || entry.text.length > 4096
    || entry.raw_text.length > 4096
    || !SAFE_SNAPSHOT_ID_PATTERN.test(entry.value_id)
    || !Number.isSafeInteger(entry.created_order)
    || entry.created_order < 0
    || entry.created_order > 1_000_000
    || !validOptionalHadesSnapshotFields(entry)
  ) return false;
  if (contract.selectedValueIds.has(entry.value_id)) return true;
  for (const key of ["hades_judgment_mechanic_id", "hades_banishment_mechanic_id"]) {
    if (typeof entry[key] === "string" && entry.value_id.startsWith(`${entry[key]}:`)) return true;
  }
  return false;
}

function validateSnapshot(
  snapshot,
  expected,
  hadesContract,
  frontendResolutionByAffixId,
  frontendDerivedEntries,
) {
  if (!Array.isArray(snapshot) || snapshot.length > 512) return false;
  const expectedByAffixId = new Map(expected.map((entry) => [entry.affixId, entry]));
  if (expectedByAffixId.size !== expected.length) return false;
  const frontendDerivedByAffixId = new Map(
    frontendDerivedEntries.map((entry) => [entry.affix_id, entry]),
  );
  if (frontendDerivedByAffixId.size !== frontendDerivedEntries.length) return false;
  const observedAffixIds = new Set();

  for (const entry of snapshot) {
    if (!isPlainObject(entry) || observedAffixIds.has(entry.affix_id)) return false;
    observedAffixIds.add(entry.affix_id);
    const target = expectedByAffixId.get(entry.affix_id);
    if (!target) {
      const frontendDerived = frontendDerivedByAffixId.get(entry.affix_id);
      if (frontendDerived) {
        if (!sameJson(entry, frontendDerived)) return false;
        frontendDerivedByAffixId.delete(entry.affix_id);
        continue;
      }
      if (
        entry.source_type === "projected"
        || Object.hasOwn(entry, "divinity_effect_multiplier")
        || Object.hasOwn(entry, "divinity_effect_multiplier_source")
        || Object.hasOwn(entry, "divinity_effect_resolved_by")
        || Object.hasOwn(entry, "hades_infusion_mechanic_ids")
      ) return false;
      if (!validateHadesDerivedSnapshotEntry(entry, hadesContract)) return false;
      continue;
    }
    const frontendResolution = frontendResolutionByAffixId.get(target.affixId);
    if (!allowedKeys(
      entry,
      SNAPSHOT_REQUIRED_KEYS,
      frontendResolution ? FRONTEND_SNAPSHOT_OPTIONAL_KEYS : SNAPSHOT_OPTIONAL_KEYS,
    )) return false;
    if (
      entry.slate_id !== target.slateId
      || entry.slot_key !== target.slotKey
      || entry.source_type !== (target.sourceType ?? "talent")
      || entry.value_type !== target.sourceRecord.valueType
      || entry.value_id !== target.sourceRecord.id
      || entry.text !== (frontendResolution?.text ?? snapshotDisplayText(target.sourceRecord))
      || entry.raw_text !== (frontendResolution?.rawText ?? snapshotDisplayText(target.sourceRecord))
      || entry.created_order !== target.createdOrder
    ) return false;
    if (frontendResolution && (
      entry.divinity_effect_multiplier !== frontendResolution.multiplier
      || entry.divinity_effect_multiplier_source !== frontendResolution.source
      || entry.divinity_effect_resolved_by !== frontendResolution.resolvedBy
    )) return false;

    const coreKeys = [
      "core_talent_data_id",
      "season_key",
      "catalog_version",
      "raw_text_hash",
    ];
    if (target.sourceRecord.valueType === "core_talent") {
      if (
        entry.core_talent_data_id !== target.coreTalentDataId
        || entry.season_key !== CORE_TALENT_SNAPSHOT.seasonKey
        || entry.catalog_version !== CORE_TALENT_SNAPSHOT.catalogVersion
        || entry.raw_text_hash !== hashCoreTalentRawText(target.sourceRecord.text)
      ) return false;
    } else if (coreKeys.some((key) => Object.hasOwn(entry, key))) return false;

    const cap = snapshotCap(target.sourceRecord.text);
    if (cap) {
      if (
        entry.max_divinity_effect_count !== cap.count
        || entry.divinity_effect_limit_key !== cap.key
      ) return false;
    } else if (
      Object.hasOwn(entry, "max_divinity_effect_count")
      || Object.hasOwn(entry, "divinity_effect_limit_key")
    ) return false;

    expectedByAffixId.delete(entry.affix_id);
  }
  return expectedByAffixId.size === 0 && frontendDerivedByAffixId.size === 0;
}

function placedSlateRecordValid(value) {
  return allowedKeys(value, ["slate_id", "position"])
    && SAFE_ID_PATTERN.test(value.slate_id)
    && allowedKeys(value.position, ["row", "col"])
    && Number.isInteger(value.position.row)
    && Number.isInteger(value.position.col);
}

export function import91TobDivinitySection(input, context = {}) {
  if (!isPlainObject(input)) return failure("91tob-divinity-invalid", "divinity");
  if (
    input.board_mask_version !== TOB91_DIVINITY_INTEROP_RECEIPT.boardMaskVersion
    || input.divinity_catalog_fingerprint !== TOB91_DIVINITY_INTEROP_RECEIPT.catalogFingerprint
  ) return failure("91tob-divinity-receipt-mismatch", "divinity");
  if (!Array.isArray(input.inventory) || !Array.isArray(input.placed_slates)) {
    return failure("91tob-divinity-invalid", "divinity");
  }
  const catalogs = contextCatalogs(context);
  if (!catalogs) return failure("validation-context-unavailable", "divinity");

  let board = createDivinityBoard({ boardId: "91tob-divinity-board" });
  const sourceInstances = new Map();
  const expectedSnapshot = [];
  const mappings = [];
  const mappedPaths = [
    "divinity.board_mask_version",
    "divinity.divinity_catalog_fingerprint",
  ];

  for (const [index, sourceInstance] of input.inventory.entries()) {
    const path = `divinity.inventory[${index}]`;
    if (!allowedKeys(sourceInstance, INVENTORY_REQUIRED_KEYS, INVENTORY_OPTIONAL_KEYS)) {
      return failure("91tob-divinity-invalid", path);
    }
    const templateReceipt = TEMPLATE_RECEIPT_BY_ID.get(sourceInstance.catalog_id);
    const hadesVariant = HADES_VARIANT_BY_SHAPE_ID.get(sourceInstance.shape_id);
    const isHades = hadesVariant?.templateId === sourceInstance.catalog_id;
    const template = getDivinitySlateTemplate(sourceInstance.catalog_id);
    const templateContractValid = templateReceipt
      ? template
        && template.requiresGodSelection === templateReceipt.requiresGodSelection
        && template.maxPlacedCount === templateReceipt.maxPlacedCount
        && Boolean(template.orientationLocked) === Boolean(templateReceipt.orientationLocked)
        && templateReceipt.allowedShapeIds.includes(sourceInstance.shape_id)
        && (!templateReceipt.orientationLocked || (
          sourceInstance.rotation === 0
          && sourceInstance.flipped_h === false
          && sourceInstance.flipped_v === false
        ))
      : isHades
        && template
        && template.maxPlacedCount === 1
        && sourceInstance.rotation === 0
        && sourceInstance.flipped_h === false
        && sourceInstance.flipped_v === false
        && !Object.hasOwn(sourceInstance, "god_slug");
    if (
      !SAFE_ID_PATTERN.test(sourceInstance.id)
      || sourceInstances.has(sourceInstance.id)
      || !templateContractValid
      || !template.allowedShapeIds.includes(sourceInstance.shape_id)
      || !Number.isInteger(sourceInstance.rotation)
      || sourceInstance.rotation < 0
      || sourceInstance.rotation > 3
      || typeof sourceInstance.flipped_h !== "boolean"
      || typeof sourceInstance.flipped_v !== "boolean"
      || !Number.isSafeInteger(sourceInstance.created_order)
      || sourceInstance.created_order < 0
      || !isPlainObject(sourceInstance.slot_selections_by_key)
      || (Object.hasOwn(sourceInstance, "god_slug")
        && typeof sourceInstance.god_slug !== "string")
    ) return failure("91tob-divinity-invalid", path);

    let localInstance;
    if (!canAddDivinitySlate(board, sourceInstance.catalog_id)) {
      return failure("91tob-divinity-invalid", path);
    }
    try {
      localInstance = createDivinitySlateInstance({
        instanceId: sourceInstance.id,
        templateId: sourceInstance.catalog_id,
        shapeId: sourceInstance.shape_id,
        ...(sourceInstance.god_slug ? { godSlug: sourceInstance.god_slug } : {}),
        rotation: sourceInstance.rotation,
        flippedH: sourceInstance.flipped_h,
        flippedV: sourceInstance.flipped_v,
        createdOrder: sourceInstance.created_order,
      });
    } catch {
      return failure("91tob-divinity-invalid", path);
    }

    const selectionMappings = [];
    for (const [slotKey, sourceSelection] of Object.entries(sourceInstance.slot_selections_by_key)) {
      const selectionPath = `${path}.slot_selections_by_key.${slotKey}`;
      const mapping = isHades
        ? sourceHadesSelectionMapping(sourceSelection, catalogs, slotKey)
        : sourceDirectSelectionMapping(sourceSelection, catalogs, template, slotKey);
      if (!mapping) return failure("91tob-divinity-selection-invalid", selectionPath);
      try {
        localInstance = setDivinitySlotSelection(localInstance, slotKey, mapping.activeRecord);
      } catch {
        return failure("91tob-divinity-selection-invalid", selectionPath);
      }
      selectionMappings.push({
        sourceSlotKey: slotKey,
        sourceValueId: isHades ? mapping.sourceId : mapping.sourceRecord.id,
        localValueId: mapping.activeRecord.id,
      });
      if (!isHades && mapping.sourceRecord.valueType !== "copy_slot") {
        expectedSnapshot.push({
          affixId: `${sourceInstance.id}:${slotKey}:${mapping.sourceRecord.id}`,
          slateId: sourceInstance.id,
          slotKey,
          sourceRecord: mapping.sourceRecord,
          sourceType: mapping.sourceRecord.valueType === "special_effect"
            ? "special_effect"
            : "talent",
          ...(mapping.coreTalentDataId ? { coreTalentDataId: mapping.coreTalentDataId } : {}),
          createdOrder: sourceInstance.created_order,
        });
      }
      mappedPaths.push(selectionPath);
    }

    try {
      board = addDivinitySlateToBoard(board, localInstance);
    } catch {
      return failure("91tob-divinity-invalid", path);
    }
    sourceInstances.set(sourceInstance.id, sourceInstance);
    mappings.push({
      sourceSlateId: sourceInstance.id,
      sourceCatalogId: sourceInstance.catalog_id,
      localSlateId: localInstance.slateId,
      selections: selectionMappings,
    });
    mappedPaths.push(
      `${path}.id`,
      `${path}.catalog_id`,
      `${path}.shape_id`,
      `${path}.rotation`,
      `${path}.flipped_h`,
      `${path}.flipped_v`,
      `${path}.created_order`,
    );
    if (Object.hasOwn(sourceInstance, "god_slug")) mappedPaths.push(`${path}.god_slug`);
  }

  const placedIds = new Set();
  for (const [index, placed] of input.placed_slates.entries()) {
    const path = `divinity.placed_slates[${index}]`;
    if (!placedSlateRecordValid(placed) || placedIds.has(placed.slate_id)) {
      return failure("91tob-divinity-placement-invalid", path);
    }
    if (!sourceInstances.has(placed.slate_id)) {
      return failure("91tob-divinity-placement-invalid", path);
    }
    try {
      board = placeSlate(board, placed.slate_id, {
        x: placed.position.row,
        y: placed.position.col,
      });
    } catch {
      return failure("91tob-divinity-placement-invalid", path);
    }
    const placedCells = board.cells.filter(({ slateInstanceId }) => (
      slateInstanceId === placed.slate_id
    ));
    if (placedCells.some(({ x, y }) => board.mask?.[x]?.[y] !== 1)) {
      return failure("91tob-divinity-placement-invalid", path);
    }
    placedIds.add(placed.slate_id);
    mappedPaths.push(`${path}.slate_id`, `${path}.position.row`, `${path}.position.col`);
  }
  if (placedIds.size !== sourceInstances.size) {
    return failure("91tob-divinity-placement-invalid", "divinity.placed_slates");
  }
  const hades = importHadesSidecar(input, board, catalogs);
  if (!hades.ok) return hades;
  board = hades.board;
  mappedPaths.push(...hades.mappedPaths);
  mappings.push(...hades.mappings);

  const copiedSnapshot = copiedSnapshotEntries(board, catalogs);
  if (!copiedSnapshot) {
    return failure("91tob-divinity-snapshot-invalid", "divinity.resolved_affix_snapshot");
  }
  expectedSnapshot.push(...copiedSnapshot.map((entry) => ({
    affixId: entry.affix_id,
    slateId: entry.slate_id,
    slotKey: entry.slot_key,
    sourceRecord: {
      id: entry.value_id,
      valueType: entry.value_type,
      text: entry.raw_text,
    },
    sourceType: "copied",
    createdOrder: entry.created_order,
  })));

  const frontendResolutionByAffixId = judgmentFrontendResolutionByAffixId(board, catalogs);
  const frontendDerivedEntries = infusionProjectedSnapshotEntries(board, catalogs);
  if (!frontendDerivedEntries) {
    return failure("91tob-divinity-snapshot-invalid", "divinity.resolved_affix_snapshot");
  }

  if (!validateSnapshot(
    input.resolved_affix_snapshot,
    expectedSnapshot,
    hadesSnapshotContract(input),
    frontendResolutionByAffixId,
    frontendDerivedEntries,
  )) {
    return failure("91tob-divinity-snapshot-invalid", "divinity.resolved_affix_snapshot");
  }
  mappedPaths.push("divinity.resolved_affix_snapshot");

  return {
    ok: true,
    issues: [],
    divinity: {
      boards: [board],
      activeBoardId: board.boardId,
    },
    mappedPaths,
    mappings,
  };
}

function emptyDivinitySection() {
  return {
    board_mask_version: "",
    divinity_catalog_fingerprint: "",
    inventory: [],
    placed_slates: [],
    preset_name: "",
    resolved_affix_snapshot: [],
  };
}

function divinityHasPayload(divinity) {
  return Array.isArray(divinity?.boards) && divinity.boards.length > 0;
}

function sameJson(left, right) {
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
    );
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export function export91TobDivinitySection(divinity, context = {}) {
  if (!divinityHasPayload(divinity)) {
    if (divinity?.activeBoardId) {
      return failure("91tob-export-divinity-unsupported", "divinity.activeBoardId");
    }
    return {
      ok: true,
      issues: [],
      mapped: false,
      section: emptyDivinitySection(),
      mappings: [],
    };
  }
  if (
    divinity.boards.length !== 1
    || divinity.activeBoardId !== divinity.boards[0]?.boardId
  ) return failure("91tob-export-divinity-unsupported", "divinity");
  const catalogs = contextCatalogs(context);
  if (!catalogs) return failure("validation-context-unavailable", "divinity");

  const board = divinity.boards[0];
  const expectedBoard = createDivinityBoard({ boardId: board.boardId });
  if (
    board.width !== 6
    || board.height !== 6
    || !sameJson(board.mask, expectedBoard.mask)
    || !Array.isArray(board.slateInventory)
    || !Array.isArray(board.cells)
  ) return failure("91tob-export-divinity-unsupported", "divinity.boards[0]");

  const inventory = [];
  const placedSlates = [];
  const resolvedAffixSnapshot = [];
  const mappings = [];
  const instanceIds = new Set();
  const templateCounts = new Map();
  const hadesSidecars = {};

  for (const [index, instance] of board.slateInventory.entries()) {
    const path = `divinity.boards[0].slateInventory[${index}]`;
    const templateReceipt = TEMPLATE_RECEIPT_BY_ID.get(instance?.slateId);
    const hadesVariant = HADES_VARIANT_BY_SHAPE_ID.get(instance?.shapeId);
    const isHades = hadesVariant?.templateId === instance?.slateId;
    const template = getDivinitySlateTemplate(instance?.slateId);
    const authorityConfig = instance?.hadesAuthorityConfig;
    const authority = isHades && instance.slateId === "hades_banishment"
      && isPlainObject(authorityConfig)
      && Object.keys(authorityConfig).length === 1
      && typeof authorityConfig.banishmentArchetype === "string"
      ? HADES_AUTHORITY_BY_LOCAL_ARCHETYPE.get(authorityConfig.banishmentArchetype)
      : null;
    const authorityConfigValid = !Object.hasOwn(instance ?? {}, "hadesAuthorityConfig")
      || (isHades && instance.slateId === "hades_banishment" && Boolean(authority));
    const templateContractValid = templateReceipt
      ? template
        && template.requiresGodSelection === templateReceipt.requiresGodSelection
        && template.maxPlacedCount === templateReceipt.maxPlacedCount
        && Boolean(template.orientationLocked) === Boolean(templateReceipt.orientationLocked)
        && templateReceipt.allowedShapeIds.includes(instance.shapeId)
        && (!templateReceipt.orientationLocked || (
          instance.rotation === 0
          && instance.flippedH === false
          && instance.flippedV === false
        ))
      : isHades
        && template
        && template.maxPlacedCount === 1
        && instance.rotation === 0
        && instance.flippedH === false
        && instance.flippedV === false
        && !instance.godSlug
        && instance.anchor?.x === hadesVariant.fixedPosition.x
        && instance.anchor?.y === hadesVariant.fixedPosition.y;
    if (
      !SAFE_ID_PATTERN.test(instance?.instanceId)
      || instanceIds.has(instance.instanceId)
      || !templateContractValid
      || !Number.isInteger(instance.rotation)
      || instance.rotation < 0
      || instance.rotation > 3
      || typeof instance.flippedH !== "boolean"
      || typeof instance.flippedV !== "boolean"
      || !Number.isSafeInteger(instance.createdOrder)
      || instance.createdOrder < 0
      || !instance.anchor
      || !Number.isInteger(instance.anchor.x)
      || !Number.isInteger(instance.anchor.y)
      || !isPlainObject(instance.slotSelectionsByKey)
      || (Array.isArray(instance.affixIds) && instance.affixIds.length > 0)
      || !authorityConfigValid
    ) return failure("91tob-export-divinity-unsupported", path);
    const nextTemplateCount = (templateCounts.get(instance.slateId) ?? 0) + 1;
    if (
      (isHades && nextTemplateCount > 1)
      || (!isHades
        && templateReceipt.maxPlacedCount !== null
        && nextTemplateCount > templateReceipt.maxPlacedCount)
    ) return failure("91tob-export-divinity-unsupported", path);
    templateCounts.set(instance.slateId, nextTemplateCount);

    const sourceSelections = {};
    const selectionMappings = [];
    for (const [slotKey, stored] of Object.entries(instance.slotSelectionsByKey)) {
      if (
        !isPlainObject(stored)
        || !SUPPORTED_VALUE_TYPES.has(stored.valueType)
        || Object.hasOwn(stored, "config")
      ) {
        return failure("91tob-export-divinity-selection-unsupported", `${path}.slotSelectionsByKey.${slotKey}`);
      }
      const structuralMapping = structuralSelectionMapping({
        value_type: stored.valueType,
        value_id: stored.valueId,
      }, template, slotKey);
      const activeRecord = structuralMapping?.activeRecord
        ?? catalogs.activeByLocalId.get(stored.valueId);
      const sourceRecord = structuralMapping?.sourceRecord
        ?? (activeRecord?.legacyRuntimeId
          ? catalogs.sourceById.get(activeRecord.legacyRuntimeId)
          : null);
      const coreMapping = stored.valueType === "core_talent" && sourceRecord
        ? catalogs.coreBySourceId.get(sourceRecord.id)
        : null;
      const hadesSourceId = isHades ? sourceIdForActiveHadesRecord(activeRecord) : null;
      const sourceValueId = isHades ? hadesSourceId ?? sourceRecord?.id : sourceRecord?.id;
      if (
        !activeRecord
        || !sourceValueId
        || (!isHades && sourceRecord.valueType !== stored.valueType)
        || activeRecord.valueType !== stored.valueType
        || (stored.valueType === "core_talent" && coreMapping?.activeRecord !== activeRecord)
      ) {
        return failure(
          "91tob-export-divinity-selection-unsupported",
          `${path}.slotSelectionsByKey.${slotKey}`,
        );
      }
      let checked;
      try {
        checked = setDivinitySlotSelection(
          createDivinitySlateInstance({
            instanceId: instance.instanceId,
            templateId: instance.slateId,
            shapeId: instance.shapeId,
            ...(instance.godSlug ? { godSlug: instance.godSlug } : {}),
          }),
          slotKey,
          activeRecord,
        );
      } catch {
        return failure(
          "91tob-export-divinity-selection-unsupported",
          `${path}.slotSelectionsByKey.${slotKey}`,
        );
      }
      if (checked.slotSelectionsByKey[slotKey]?.valueId !== stored.valueId) {
        return failure(
          "91tob-export-divinity-selection-unsupported",
          `${path}.slotSelectionsByKey.${slotKey}`,
        );
      }
      sourceSelections[slotKey] = {
        value_type: stored.valueType,
        value_id: sourceValueId,
      };
      if (!isHades && sourceRecord.valueType !== "copy_slot") {
        resolvedAffixSnapshot.push(directSnapshotEntry({
          slateId: instance.instanceId,
          slotKey,
          sourceRecord,
          ...(coreMapping ? { coreTalentDataId: coreMapping.coreTalentDataId } : {}),
          createdOrder: instance.createdOrder,
          sourceType: sourceRecord.valueType === "special_effect"
            ? "special_effect"
            : "talent",
        }));
      }
      selectionMappings.push({
        sourceSlotKey: slotKey,
        sourceValueId,
        localValueId: activeRecord.id,
      });
    }

    if (isHades) {
      if (Object.hasOwn(hadesSidecars, hadesVariant.sectionKey)) {
        return failure("91tob-export-divinity-unsupported", path);
      }
      const selectedSourceId = (slotKey) => sourceSelections[slotKey]?.value_id;
      hadesSidecars[hadesVariant.sectionKey] = {
        enabled: true,
        variant_id: hadesVariant.variantId,
        fixed_talent_ids: ["fixed_1", "fixed_2"].map(selectedSourceId).filter(Boolean),
        imprint_talent_ids: hadesVariant.imprintSlotKeys.map(selectedSourceId).filter(Boolean),
        ...(authority ? { authority_talent_id: authority.sourceId } : {}),
      };
    }

    inventory.push({
      id: instance.instanceId,
      catalog_id: instance.slateId,
      shape_id: instance.shapeId,
      ...(instance.godSlug ? { god_slug: instance.godSlug } : {}),
      rotation: instance.rotation,
      flipped_h: instance.flippedH,
      flipped_v: instance.flippedV,
      slot_selections_by_key: sourceSelections,
      created_order: instance.createdOrder,
    });
    placedSlates.push({
      slate_id: instance.instanceId,
      position: { row: instance.anchor.x, col: instance.anchor.y },
    });
    mappings.push({
      sourceSlateId: instance.instanceId,
      sourceCatalogId: instance.slateId,
      localSlateId: instance.slateId,
      selections: selectionMappings,
    });
    instanceIds.add(instance.instanceId);
  }

  const frontendResolutionByAffixId = judgmentFrontendResolutionByAffixId(board, catalogs);
  for (const [index, entry] of resolvedAffixSnapshot.entries()) {
    resolvedAffixSnapshot[index] = applyJudgmentFrontendResolution(
      entry,
      frontendResolutionByAffixId.get(entry.affix_id),
    );
  }

  const copiedSnapshot = copiedSnapshotEntries(board, catalogs);
  if (!copiedSnapshot) {
    return failure("91tob-export-divinity-selection-unsupported", "divinity.boards[0]");
  }
  resolvedAffixSnapshot.push(...copiedSnapshot);
  const frontendDerivedEntries = infusionProjectedSnapshotEntries(board, catalogs);
  if (!frontendDerivedEntries) {
    return failure("91tob-export-divinity-selection-unsupported", "divinity.boards[0]");
  }
  resolvedAffixSnapshot.push(...frontendDerivedEntries);
  resolvedAffixSnapshot.sort(comparePublicSnapshotEntries);

  const section = {
    board_mask_version: TOB91_DIVINITY_INTEROP_RECEIPT.boardMaskVersion,
    divinity_catalog_fingerprint: TOB91_DIVINITY_INTEROP_RECEIPT.catalogFingerprint,
    inventory,
    placed_slates: placedSlates,
    preset_name: `TOB ${koreanGameTerm("divinitySlate")}`,
    resolved_affix_snapshot: resolvedAffixSnapshot,
    ...hadesSidecars,
  };
  const verification = import91TobDivinitySection(section, context);
  if (!verification.ok) return failure("91tob-export-divinity-invalid", "divinity");
  const restored = verification.divinity.boards[0];
  if (
    !sameJson(restored.cells, board.cells)
    || !sameJson(restored.slateInventory, board.slateInventory)
  ) return failure("91tob-export-divinity-lossy", "divinity");

  return {
    ok: true,
    issues: [],
    mapped: true,
    section,
    mappings,
  };
}
