import { TLIDB_SS13_PACT_SPIRIT_STRUCTURE } from "./data/tlidbPactSpiritStructure.ss13.generated.js";
import { SS13_PACT_DIRECT_STAT_AUTHORITY } from "./data/ss13PactDirectStatAuthority.generated.js";

const EXPECTED_PACT_SPIRIT_COUNT = 108;
const EXPECTED_DESTINY_COUNTS = Object.freeze({
  total: 192,
  micro: 50,
  medium: 141,
  undetermined: 1,
});
const EXPECTED_UNDETERMINED_LAYOUT_COUNT = 9;
const EXPECTED_S13_ADDITIONAL_DESTINIES = 8;
const EXPECTED_DESTINY_TYPE_COUNTS = Object.freeze({
  micro_fate: 50,
  medium_fate: 41,
  kismet: 46,
  dual_kismet: 54,
  undetermined_fate: 1,
});
const DESTINY_TYPE_SLOT = Object.freeze({
  micro_fate: "micro",
  medium_fate: "medium",
  kismet: "medium",
  dual_kismet: "medium",
  undetermined_fate: "undetermined",
});

const CURRENT_SS13_PACT_RING_SLOTS_BY_SPIRIT_ID = new Map(
  TLIDB_SS13_PACT_SPIRIT_STRUCTURE.records.map(({ catalogId, ringSlotOrder }) => [
    catalogId,
    new Set(ringSlotOrder),
  ]),
);

const CURRENT_SS13_STANDALONE_DESTINY_STRUCTURE_CONTRACTS = Object.freeze([
  Object.freeze({
    catalogId: "destiny-tlidb-ss13-350025",
    stableKey: "ItemBase/350025",
    sourceDataId: "350025",
    sourceUrl: "https://tlidb.com/ko/Micro_Fate%3A_Terra_Charge_Recovery_Speed",
    sourceRecordKey: "Micro_Fate:_Terra_Charge_Recovery_Speed",
    sourcePageSha256: "efae54cfc5eb728a235890cef692d06e4fe3fd6eba6148c296452c1ac31db757",
    name: "하위 숙명: 지면 에너지 축적 회복 속도",
    affixText: "지면 에너지 회복 속도 +(20–25) %",
    detail: "지면 에너지 회복 속도 +(20–25) %\n장착 후 하위 재능 포인트를 1개 바꾼다.\n제거 시 추가 아이템을 소모해야 한다.",
    installLine: "장착 후 하위 재능 포인트를 1개 바꾼다.",
    destinyType: "micro_fate",
    slotType: "micro",
    rollDefs: Object.freeze([Object.freeze({ min: 20, max: 25, precision: 0 })]),
  }),
  Object.freeze({
    catalogId: "destiny-tlidb-ss13-350325",
    stableKey: "ItemBase/350325",
    sourceDataId: "350325",
    sourceUrl: "https://tlidb.com/ko/Medium_Fate%3A_Terra_Charge_Recovery_Speed",
    sourceRecordKey: "Medium_Fate:_Terra_Charge_Recovery_Speed",
    sourcePageSha256: "a33e572acec306b131e964b6ae032f1ba64984e959ed1548907544bb47aa4b4d",
    name: "중위 숙명: 지면 에너지 축적 회복 속도",
    affixText: "지면 에너지 회복 속도 +(40–50) %",
    detail: "지면 에너지 회복 속도 +(40–50) %\n장착 후 중위 재능 포인트를 1개 바꾼다.\n제거 시 추가 아이템을 소모해야 한다.",
    installLine: "장착 후 중위 재능 포인트를 1개 바꾼다.",
    destinyType: "medium_fate",
    slotType: "medium",
    rollDefs: Object.freeze([Object.freeze({ min: 40, max: 50, precision: 0 })]),
  }),
  Object.freeze({
    catalogId: "destiny-tlidb-ss13-350760",
    stableKey: "ItemBase/350760",
    sourceDataId: "350760",
    sourceUrl: "https://tlidb.com/ko/Dual_Kismet%3A_Ribbon",
    sourceRecordKey: "Dual_Kismet:_Ribbon",
    sourcePageSha256: "acc3b01729a0d2448503e22a787fa1faf0840b0c36fe8666fdf7a24386c48a61",
    name: "이중 천명: 리본",
    affixText: "유대 최대 중첩 수 +1\n유대 획득 속도 +50 %",
    detail: "장착 완료:\n0/2\n계약 보드에 해당 천명이 2개 있는 경우 다음 효과 활성화:\n유대 최대 중첩 수 +1\n유대 획득 속도 +50 %\n장착 후 중위 재능 포인트를 1개 바꾼다.\n제거 시 추가 아이템을 소모해야 한다.",
    installLine: "장착 후 중위 재능 포인트를 1개 바꾼다.",
    requiredLines: Object.freeze([
      "0/2",
      "계약 보드에 해당 천명이 2개 있는 경우 다음 효과 활성화:",
    ]),
    destinyType: "dual_kismet",
    slotType: "medium",
    pairKey: "destiny-tlidb-ss13-350760",
    rollDefs: Object.freeze([]),
  }),
]);

const CURRENT_SS13_DESTINY_VALUE_STRUCTURE_OVERRIDE_CONTRACTS = Object.freeze([
  Object.freeze({
    runtimeId: "kismet_screw",
    catalogId: "destiny-kismet-screw",
    stableKey: "ItemBase/350513",
    sourceDataId: "350513",
    sourceUrl: "https://tlidb.com/ko/Kismet%3A_Screw",
    sourceRecordKey: "Kismet:_Screw",
    sourcePageSha256: "e76efd15994bc2b18987f47b5a538d0ac1a1e91902bff6404268b1e91b3778a4",
    name: "천명: 나사",
    affixText: "소환체 크리티컬 수치 +(100–120)",
    destinyType: "kismet",
    slotType: "medium",
    rollDefs: Object.freeze([Object.freeze({ min: 100, max: 120, precision: 0 })]),
  }),
  Object.freeze({
    runtimeId: "kismet_growth_ring",
    catalogId: "destiny-kismet-growth-ring",
    stableKey: "ItemBase/350520",
    sourceDataId: "350520",
    sourceUrl: "https://tlidb.com/ko/Kismet%3A_Growth_Ring",
    sourceRecordKey: "Kismet:_Growth_Ring",
    sourcePageSha256: "df3c4463ad6b18e482024006f16f60cf89de16e979b64d34da2cf6d8eede8cc9",
    name: "천명: 연륜",
    affixText: "지면 스킬 지속 시간 +(10–15) %\n지면 스킬 범위 +(20–25) %\n지면 에너지 회복 속도 +(30–35) %",
    destinyType: "kismet",
    slotType: "medium",
    rollDefs: Object.freeze([
      Object.freeze({ min: 10, max: 15, precision: 0 }),
      Object.freeze({ min: 20, max: 25, precision: 0 }),
      Object.freeze({ min: 30, max: 35, precision: 0 }),
    ]),
  }),
]);

export const PACT_TOPOLOGY_VERSION = "91tob-beta-1.1.0-ss13.2";
export const PACT_SPIRIT_SLOT_IDS = Object.freeze(["slot1", "slot2", "slot3"]);
export const PACT_RING_SLOT_ORDER = Object.freeze([
  "innerRing1",
  "innerRing2",
  "midRing1",
  "innerRing3",
  "innerRing4",
  "midRing2",
  "innerRing5",
  "innerRing6",
  "midRing3",
]);
export const PACT_INNER_RING_SLOT_ORDER = Object.freeze(
  PACT_RING_SLOT_ORDER.filter((ringSlotId) => ringSlotId.startsWith("innerRing")),
);
const CURRENT_SS13_PACT_RING_TOPOLOGIES = Object.freeze({
  "full-nine": PACT_RING_SLOT_ORDER,
  "inner-six": PACT_INNER_RING_SLOT_ORDER,
});
export const PACT_BASE_DESTINY_CAPACITY = Object.freeze({ micro: 9, medium: 4 });
export const PACT_MAX_UNDETERMINED_CHILD_SLOTS = 5;

export function getPactRingSlotType(ringSlotId) {
  return typeof ringSlotId === "string" && ringSlotId.startsWith("innerRing")
    ? "micro"
    : "medium";
}
const DESTINY_RANGE_PATTERN = /\(\s*(-?\d+(?:\.\d+)?)\s*[-\u2013\u2014~\uFF5E]\s*(-?\d+(?:\.\d+)?)\s*\)/g;

export const PACT_CALCULATION_REFERENCE = Object.freeze({
  appVersion: "Beta 1.1.0",
  sourceRole: "structural-reference",
  structuralReferenceVersion: "SS13.2",
  valueAuthority: false,
  bundleUrl: "https://91tob.com/assets/App-BfJTsflU.js",
  runtimePath: Object.freeze([
    "CC",
    "OX",
    "Jk",
    "KX",
    "ks",
    "Kl",
    "Fx",
    "jc",
    "ENe",
    "M9e",
    "q5",
    "dee",
    "GS",
    "zee",
  ]),
});

const PACT_VALUE_AUTHORITY_BLOCKERS = Object.freeze({
  "current-pact-spirit-topology-unavailable": Object.freeze({
    categoryId: "spirits",
    reason: "TLIDB SS13 current 원문은 있으나 활성 데이터에 정령 레벨·링 효과 구조가 수집·연결되지 않음",
  }),
  "current-pact-spirit-level-semantics-unverified": Object.freeze({
    categoryId: "spirits",
    reason: "활성 데이터에 TLIDB SS13 current 레벨별 행과 stat key·연산·조건 의미가 함께 구조화되어 있지 않음",
  }),
  "current-destiny-topology-unavailable": Object.freeze({
    categoryId: "destiny",
    reason: "TLIDB SS13 current 원문은 있으나 활성 데이터에 운명 슬롯·이중 천명 구조가 수집·연결되지 않음",
  }),
  "current-destiny-roll-structure-mismatch": Object.freeze({
    categoryId: "destiny",
    reason: "TLIDB SS13 current roll 범위와 구조 참조의 roll 범위가 일치하지 않음",
  }),
  "current-destiny-effect-semantics-unverified": Object.freeze({
    categoryId: "destiny",
    reason: "TLIDB SS13 current 원문과 roll 범위는 있으나 stat key·연산·조건 의미가 구조화되어 있지 않음",
  }),
});

const PACT_DIRECT_STAT_AUTHORITY_ID = "tlidb-current-ss13-exact-direct-stat-roll";

if (
  SS13_PACT_DIRECT_STAT_AUTHORITY.schemaVersion !== 3
  || SS13_PACT_DIRECT_STAT_AUTHORITY.targetSeason !== "SS13"
  || SS13_PACT_DIRECT_STAT_AUTHORITY.authorityId !== PACT_DIRECT_STAT_AUTHORITY_ID
) {
  throw new Error("Current SS13 pact direct-stat authority dataset changed");
}

const PACT_EFFECT_FRAGMENT_SEPARATOR = /\r?\n|[；;]/u;
const PACT_CONDITIONAL_PATTERN = /如果|若|当|时|每|最近|存在|拥有|受到|击中|使用|释放|触发|获得|消耗|施加|目标|敌人|周围|近处|远处|濒危|健康|低于|高于|至少|至多|随|期间|之后|之前/u;
const PACT_UNMODELED_CONTEXT_PATTERN = /召唤物|魔灵|技能|攻击伤害|法术伤害|投射物|持续伤害|异常伤害|元素伤害|物理伤害|火焰伤害|冰冷伤害|闪电伤害|腐蚀伤害|暴击伤害|暴击值|伤害减免|收割|加剧|诅咒|创伤|点燃|凋零|防御值|护甲值|闪避值|格挡|回复|封印|范围|持续时间|冷却|上限/u;
const PACT_PERCENT_RESOURCE_PATTERN = /生命|魔力|护盾|力量|敏捷|智慧|能量/u;

const S13_UNVERIFIED_SCOPE = Object.freeze({
  kind: "destiny",
  expectedAdditionalCount: EXPECTED_S13_ADDITIONAL_DESTINIES,
  status: "current-topology-structural-reference-gap",
  reason: "SS13 추가 운명 8개는 current TLIDB 범위와 91TOB 구조 참조 간 topology 대응이 완료되지 않음",
});

const SS13_REMOVED_DESTINY_EVIDENCE = Object.freeze({
  dualkismetdestinysbetrayal: Object.freeze({
    runtimeId: "dual_kismet_destiny_27s_betrayal",
    tlidbStableKey: "ItemBase/350753",
  }),
  dualkismetpendulum: Object.freeze({
    runtimeId: "dual_kismet_pendulum",
    tlidbStableKey: "ItemBase/350728",
  }),
});

function cloneJson(value) {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]));
  }
  return value;
}

function preserveUnresolvedInstance(input, idField) {
  if (
    input === null
    || typeof input !== "object"
    || Array.isArray(input)
    || typeof input[idField] !== "string"
    || !input[idField]
  ) return null;
  return { ...cloneJson(input), unresolved: true };
}

function addIssue(issues, code, path) {
  issues.push({ code, path });
}

function hasStringFields(value, fields, allowEmpty = false) {
  return value !== null
    && typeof value === "object"
    && fields.every((field) => (
      typeof value[field] === "string" && (allowEmpty || value[field].length > 0)
    ));
}

function decimalPlaces(value) {
  const text = String(value);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

function deriveDestinyRolls(affixText) {
  const text = String(affixText ?? "");
  const rollDefs = [];
  let rollIndex = 0;
  const renderTemplate = text.replace(DESTINY_RANGE_PATTERN, (token, first, second) => {
    rollIndex += 1;
    const firstValue = Number(first);
    const secondValue = Number(second);
    const precision = Math.max(decimalPlaces(first), decimalPlaces(second));
    const key = `roll_${rollIndex}`;
    rollDefs.push({
      key,
      min: Math.min(firstValue, secondValue),
      max: Math.max(firstValue, secondValue),
      step: 10 ** -precision,
      precision,
      sourceToken: token,
      sourceStatus: "derived-from-exact-source-range",
    });
    return `{{${key}}}`;
  });
  return { renderTemplate, rollDefs };
}

function normalizePactSpiritSource(spirit, ringOrder) {
  return {
    id: spirit.slug,
    slug: spirit.slug,
    name: spirit.name,
    type: spirit.type,
    rarity: spirit.rarity,
    overview: spirit.overview,
    iconUrl: spirit.icon_url,
    sourceUrl: spirit.source_url,
    sourceStatus: "exact-source",
    rings: ringOrder.map((slotId) => ({
      slotId,
      ...cloneJson(spirit.rings?.[slotId]),
    })),
    mainAffix: cloneJson(spirit.main_affix),
    levelAffixes: Array.from({ length: 6 }, (_, index) => ({
      level: index + 1,
      affixes: cloneJson(spirit.level_affixes?.[String(index + 1)] ?? []),
    })),
    defaultUndeterminedFateAffix: spirit.default_undetermined_fate_affix,
    defaultUndeterminedFateIconUrl: spirit.default_undetermined_fate_icon_url,
  };
}

function normalizeDestinySource(destiny) {
  const derived = deriveDestinyRolls(destiny.affix_text);
  return {
    id: destiny.id,
    name: destiny.name,
    destinyType: destiny.destiny_type,
    slotType: destiny.slot_type,
    affixText: destiny.affix_text,
    iconUrl: destiny.icon_url,
    sourceUrl: destiny.source_url,
    pairKey: destiny.pair_key,
    primaryCategoryId: destiny.primary_category_id,
    categoryIds: cloneJson(destiny.category_ids ?? []),
    sourceStatus: "exact-source",
    ...derived,
  };
}

function createUndeterminedLayouts(sourceLayouts) {
  const layouts = sourceLayouts.map((layout) => ({
    id: layout.id,
    label: layout.label,
    slots: [...(layout.slots ?? [])],
    sourceStatus: "exact-source",
  }));
  const signatures = new Set(layouts.map(({ slots }) => slots.join(",")));
  for (let size = 1; size <= PACT_MAX_UNDETERMINED_CHILD_SLOTS; size += 1) {
    for (let microCount = 0; microCount <= size; microCount += 1) {
      const mediumCount = size - microCount;
      const slots = [
        ...Array.from({ length: microCount }, () => "micro"),
        ...Array.from({ length: mediumCount }, () => "medium"),
      ];
      const signature = slots.join(",");
      if (signatures.has(signature)) continue;
      signatures.add(signature);
      layouts.push({
        id: `generated_m${microCount}_d${mediumCount}`,
        label: `micro:${microCount},medium:${mediumCount}`,
        slots,
        sourceStatus: "generated-by-91tob-BX",
      });
    }
  }
  return layouts;
}

export function createPactDestinyModel(pactDataset, destinyDataset) {
  const ringOrder = Array.isArray(pactDataset?.ring_slot_order)
    ? [...pactDataset.ring_slot_order]
    : [];
  return {
    topologyVersion: PACT_TOPOLOGY_VERSION,
    spiritSlotIds: [...PACT_SPIRIT_SLOT_IDS],
    sourceVersions: {
      pactSpirit: pactDataset?.catalog_version ?? null,
      destiny: destinyDataset?.catalog_version ?? null,
    },
    ringOrder,
    spirits: (pactDataset?.pactspirits ?? []).map((spirit) => (
      normalizePactSpiritSource(spirit, ringOrder)
    )),
    destinies: (destinyDataset?.destinies ?? []).map(normalizeDestinySource),
    undeterminedLayouts: createUndeterminedLayouts(destinyDataset?.undetermined_fate_layouts ?? []),
    unverifiedScope: [cloneJson(S13_UNVERIFIED_SCOPE)],
  };
}

function canonicalTlidbSourceKey(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
    return slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  } catch {
    return "";
  }
}

function getExactSs13KoRecord(item, categoryId) {
  const ko = item?.tlidbText?.ko;
  if (
    item?.sourceSeason !== "SS13"
    || ko?.sourcePageVersion !== "SS13"
    || ko?.sourceFieldStatus?.name !== "exact"
    || ko?.sourceFieldStatus?.summary !== "exact"
    || ko?.sourceFieldStatus?.detail !== "exact"
    || !ko?.sourceUrl
    || !ko?.name
  ) {
    throw new Error(`Exact TLIDB SS13 Korean ${categoryId} record is required: ${item?.id ?? "unknown"}`);
  }
  return ko;
}

function activeCurrentSs13PactSpiritRecord(flatItem, currentStructure) {
  const ko = getExactSs13KoRecord(flatItem, "spirit");
  const currentKo = currentStructure?.locales?.ko;
  const expectedRingSlotOrder = CURRENT_SS13_PACT_RING_TOPOLOGIES[currentStructure?.ringTopology];
  const currentLocales = Object.values(currentStructure?.locales ?? {});
  const expectedProgressionProfile = currentStructure?.progressionProfile;
  const validProgressionProfile = expectedProgressionProfile === "explicit-level-1-through-6"
    || expectedProgressionProfile === "verified-empty-base-level";
  const hasVerifiedEmptyBaseLevel = expectedProgressionProfile !== "verified-empty-base-level"
    || currentLocales.every(({ levelAffixes }) => (
      levelAffixes?.[0]?.level === 1
      && levelAffixes[0].sourceStatus === "verified-no-promotion-reward-row"
      && Array.isArray(levelAffixes[0].affixes)
      && levelAffixes[0].affixes.length === 0
    ));
  if (
    currentStructure?.catalogId !== flatItem.id
    || currentStructure?.structureAuthority !== "tlidb-current-ss13-page"
    || currentStructure?.valueAuthority !== false
    || currentStructure?.calculationApplication !== false
    || currentKo?.sourceUrl !== ko.sourceUrl
    || currentKo?.sourcePageVersion !== "SS13"
    || currentKo?.sourcePageSha256 !== ko.sourcePageSha256
    || !expectedRingSlotOrder
    || JSON.stringify(currentStructure?.ringSlotOrder) !== JSON.stringify(expectedRingSlotOrder)
    || currentLocales.length < 2
    || currentLocales.some(({ rings, levelAffixes }) => (
      JSON.stringify(rings?.map(({ slotId }) => slotId)) !== JSON.stringify(expectedRingSlotOrder)
      || JSON.stringify(levelAffixes?.map(({ level }) => level)) !== JSON.stringify([1, 2, 3, 4, 5, 6])
    ))
    || currentKo?.levelAffixes?.length !== 6
    || !validProgressionProfile
    || !hasVerifiedEmptyBaseLevel
  ) {
    throw new Error(`Verified TLIDB current SS13 pact structure is required: ${flatItem.id}`);
  }
  const rings = currentKo.rings.map(({ iconUrl, ...ring }) => ({
    ...cloneJson(ring),
    icon_url: iconUrl,
  }));
  const mainAffix = currentKo.mainAffix ? {
    ...cloneJson(currentKo.mainAffix),
    icon_url: currentKo.mainAffix.iconUrl,
  } : null;
  return {
    id: flatItem.id,
    slug: null,
    name: ko.name,
    type: "",
    rarity: "",
    overview: ko.summary,
    detail: ko.detail,
    iconUrl: flatItem.iconUrl || flatItem.sourceIconUrl || "",
    sourceUrl: ko.sourceUrl,
    sourceLocale: "ko",
    sourceStatus: "exact-tlidb-ss13-ko-with-current-page-structure",
    sourceSeason: "SS13",
    catalogId: flatItem.id,
    catalogItem: flatItem,
    tlidbStableKey: flatItem.tlidbStableKey,
    tlidbStableKeys: [...(flatItem.tlidbStableKeys ?? [])],
    ringTopology: currentStructure.ringTopology,
    ringSlotOrder: [...currentStructure.ringSlotOrder],
    currentProgressionProfile: currentStructure.progressionProfile,
    rings,
    mainAffix,
    levelAffixes: cloneJson(currentKo.levelAffixes),
    calculationMainAffix: null,
    calculationLevelAffixes: currentKo.levelAffixes.map(({ level }) => ({
      level,
      affixes: [],
      indexes: [],
    })),
    calculationLimitations: [],
    defaultUndeterminedFateAffix: null,
    defaultUndeterminedFateIconUrl: null,
    structureSupported: true,
    structureAuthority: currentStructure.structureAuthority,
    currentStructureEvidence: cloneJson(currentStructure.currentStructureEvidence),
    currentStructureReceipt: cloneJson(currentKo.receipt),
    currentStructureKnownLocaleGaps: cloneJson(currentStructure.knownLocaleGaps ?? []),
    calculationSupported: false,
    valueAuthority: false,
    valueAuthorityBlockerCode: "current-pact-spirit-level-semantics-unverified",
    displayOnly: false,
  };
}

function activePactSpiritRecord(flatItem, structuralRecord = null, currentStructure = null) {
  const ko = getExactSs13KoRecord(flatItem, "spirit");
  if (structuralRecord && currentStructure) {
    throw new Error(`Pact spirit cannot use two structural authorities: ${flatItem.id}`);
  }
  if (currentStructure) return activeCurrentSs13PactSpiritRecord(flatItem, currentStructure);
  if (!structuralRecord) {
    return {
      id: flatItem.id,
      slug: null,
      name: ko.name,
      type: "",
      rarity: "",
      overview: ko.summary,
      detail: ko.detail,
      iconUrl: flatItem.iconUrl || flatItem.sourceIconUrl || "",
      sourceUrl: ko.sourceUrl,
      sourceLocale: "ko",
      sourceStatus: "exact-tlidb-ss13-ko-source-only",
      sourceSeason: "SS13",
      catalogId: flatItem.id,
      catalogItem: flatItem,
      tlidbStableKey: flatItem.tlidbStableKey,
      tlidbStableKeys: [...(flatItem.tlidbStableKeys ?? [])],
      rings: [],
      mainAffix: null,
      levelAffixes: [],
      defaultUndeterminedFateAffix: null,
      defaultUndeterminedFateIconUrl: null,
      structureSupported: false,
      calculationSupported: false,
      valueAuthority: false,
      valueAuthorityBlockerCode: "current-pact-spirit-topology-unavailable",
      displayOnly: true,
    };
  }
  const cn = flatItem?.tlidbText?.cn;
  const cnLines = String(cn?.detail ?? "").split(/\r?\n/u);
  const koLines = String(ko.detail ?? "").split(/\r?\n/u);
  const exactLineLookup = new Map();
  if (cnLines.length === koLines.length) {
    for (let index = 0; index < cnLines.length; index += 1) {
      const sourceLine = cnLines[index];
      const localizedLine = koLines[index];
      if (!sourceLine || !localizedLine) continue;
      if (exactLineLookup.has(sourceLine) && exactLineLookup.get(sourceLine) !== localizedLine) {
        exactLineLookup.set(sourceLine, null);
      } else if (!exactLineLookup.has(sourceLine)) {
        exactLineLookup.set(sourceLine, localizedLine);
      }
    }
  }
  const exactLine = (value) => (
    typeof value === "string" ? exactLineLookup.get(value) || "" : ""
  );
  const hasExactLine = (value) => Boolean(exactLine(value));
  const exactTag = (value) => {
    const sourceTags = Array.isArray(cn?.tags) ? cn.tags : [];
    const localizedTags = Array.isArray(ko.tags) ? ko.tags : [];
    if (sourceTags.length !== localizedTags.length) return "";
    const index = sourceTags.indexOf(value);
    return index >= 0 ? localizedTags[index] ?? "" : "";
  };
  return {
    ...structuralRecord,
    name: ko.name,
    type: exactTag(structuralRecord.type),
    rarity: exactTag(structuralRecord.rarity),
    overview: exactLine(structuralRecord.overview),
    detail: ko.detail,
    rings: structuralRecord.rings.map((ring) => ({
      ...ring,
      name: exactLine(ring.name),
      effect: exactLine(ring.effect),
      category: exactLine(ring.category),
    })),
    mainAffix: structuralRecord.mainAffix ? {
      ...structuralRecord.mainAffix,
      name: exactLine(structuralRecord.mainAffix.name),
      effect: exactLine(structuralRecord.mainAffix.effect),
      category: exactLine(structuralRecord.mainAffix.category),
    } : null,
    levelAffixes: structuralRecord.levelAffixes.map(({ level, affixes }) => ({
      level,
      affixes: affixes.map(exactLine).filter(Boolean),
    })),
    calculationMainAffix: structuralRecord.mainAffix ? {
      ...structuralRecord.mainAffix,
      name: hasExactLine(structuralRecord.mainAffix.name) ? structuralRecord.mainAffix.name : "",
      effect: hasExactLine(structuralRecord.mainAffix.effect) ? structuralRecord.mainAffix.effect : "",
      category: hasExactLine(structuralRecord.mainAffix.category) ? structuralRecord.mainAffix.category : "",
    } : null,
    calculationLevelAffixes: structuralRecord.levelAffixes.map(({ level, affixes }) => ({
      level,
      affixes: affixes.filter(hasExactLine),
      indexes: affixes
        .map((affix, index) => hasExactLine(affix) ? index : null)
        .filter((index) => index !== null),
    })),
    calculationLimitations: structuralRecord.levelAffixes.flatMap(({ level, affixes }) => {
      const omittedIndexes = affixes
        .map((affix, index) => hasExactLine(affix) ? null : index)
        .filter((index) => index !== null);
      return omittedIndexes.length ? [{
        code: "ss13-pact-spirit-affix-unverified",
        level,
        omittedIndexes,
        omittedCount: omittedIndexes.length,
        sourceUrl: ko.sourceUrl,
        reason: "The structural affix has no exact matching line in the current TLIDB SS13 source",
      }] : [];
    }),
    iconUrl: flatItem.iconUrl || flatItem.sourceIconUrl || structuralRecord.iconUrl,
    sourceUrl: ko.sourceUrl,
    sourceLocale: "ko",
    sourceStatus: "exact-tlidb-ss13-ko-with-91tob-structure",
    sourceSeason: "SS13",
    catalogId: flatItem.id,
    catalogItem: flatItem,
    tlidbStableKey: flatItem.tlidbStableKey,
    tlidbStableKeys: [...(flatItem.tlidbStableKeys ?? [])],
    structureSupported: true,
    calculationSupported: true,
    valueAuthority: false,
    valueAuthorityBlockerCode: "current-pact-spirit-level-semantics-unverified",
    displayOnly: false,
  };
}

const DESTINY_NON_EFFECT_CN_LINES = new Set([
  "安装后替换一个小型天赋点",
  "安装后替换一个中型天赋点",
  "移除时需要消耗额外道具",
  "已安装：",
  "0/2",
  "如果契约板上存在两个该天命，激活以下效果：",
]);

function exactSs13DestinyAffixText(flatItem, ko) {
  const cnLines = String(flatItem?.tlidbText?.cn?.summary ?? "").split(/\r?\n/u);
  const koLines = String(ko.summary ?? "").split(/\r?\n/u);
  if (cnLines.length !== koLines.length) return "";
  return koLines.filter((line, index) => (
    line && !DESTINY_NON_EFFECT_CN_LINES.has(cnLines[index])
  )).join("\n");
}

function resolveCurrentSs13StandaloneDestinyStructure(flatItem, currentAffixText, currentDerived) {
  const contract = CURRENT_SS13_STANDALONE_DESTINY_STRUCTURE_CONTRACTS.find(({ catalogId }) => (
    catalogId === flatItem?.id
  ));
  if (!contract) return null;
  const ko = flatItem?.tlidbText?.ko;
  const currentRollRanges = currentDerived?.rollDefs?.map(({ min, max, precision }) => ({
    min,
    max,
    precision,
  }));
  if (
    flatItem?.tlidbStableKey !== contract.stableKey
    || flatItem?.sourceSeason !== "SS13"
    || ko?.sourcePageVersion !== "SS13"
    || ko?.sourceSeasonEvidence?.verificationComplete !== true
    || ko?.sourceFieldStatus?.name !== "exact"
    || ko?.sourceFieldStatus?.summary !== "exact"
    || ko?.sourceFieldStatus?.detail !== "exact"
    || ko?.name !== contract.name
    || ko?.summary !== contract.detail
    || ko?.detail !== contract.detail
    || !String(ko.detail).split(/\r?\n/u).includes(contract.installLine)
    || !(contract.requiredLines ?? []).every((line) => (
      String(ko.detail).split(/\r?\n/u).includes(line)
    ))
    || ko?.sourceUrl !== contract.sourceUrl
    || ko?.sourceRecordKey !== contract.sourceRecordKey
    || ko?.sourcePageSha256 !== contract.sourcePageSha256
    || !(ko?.sourceDataIds ?? []).map(String).includes(contract.sourceDataId)
    || currentAffixText !== contract.affixText
    || JSON.stringify(currentRollRanges) !== JSON.stringify(contract.rollDefs)
    || DESTINY_TYPE_SLOT[contract.destinyType] !== contract.slotType
  ) {
    throw new Error(`Verified TLIDB current SS13 destiny structure changed: ${flatItem?.id ?? "unknown"}`);
  }
  return {
    id: flatItem.id,
    name: contract.name,
    destinyType: contract.destinyType,
    slotType: contract.slotType,
    affixText: contract.affixText,
    iconUrl: flatItem.iconUrl || flatItem.sourceIconUrl || "",
    sourceUrl: contract.sourceUrl,
    pairKey: contract.pairKey ?? null,
    primaryCategoryId: "",
    categoryIds: [],
    structureAuthority: "tlidb-current-ss13-exact-install-line",
    rollDefs: contract.rollDefs.map((roll, index) => ({
      key: `roll_${index + 1}`,
      ...roll,
      step: 10 ** -roll.precision,
    })),
  };
}

function resolveCurrentSs13DestinyValueStructure(
  flatItem,
  structuralRecord,
  currentAffixText,
  currentDerived,
) {
  const contract = CURRENT_SS13_DESTINY_VALUE_STRUCTURE_OVERRIDE_CONTRACTS.find(({ runtimeId }) => (
    runtimeId === structuralRecord?.id
  ));
  if (!contract) return structuralRecord;
  const ko = flatItem?.tlidbText?.ko;
  const currentRollRanges = currentDerived?.rollDefs?.map(({ min, max, precision }) => ({
    min,
    max,
    precision,
  }));
  if (
    flatItem?.id !== contract.catalogId
    || flatItem?.tlidbStableKey !== contract.stableKey
    || flatItem?.sourceSeason !== "SS13"
    || structuralRecord?.destinyType !== contract.destinyType
    || structuralRecord?.slotType !== contract.slotType
    || ko?.sourcePageVersion !== "SS13"
    || ko?.sourceSeasonEvidence?.verificationComplete !== true
    || ko?.sourceFieldStatus?.name !== "exact"
    || ko?.sourceFieldStatus?.summary !== "exact"
    || ko?.sourceFieldStatus?.detail !== "exact"
    || ko?.name !== contract.name
    || ko?.sourceUrl !== contract.sourceUrl
    || ko?.sourceRecordKey !== contract.sourceRecordKey
    || ko?.sourcePageSha256 !== contract.sourcePageSha256
    || !(ko?.sourceDataIds ?? []).map(String).includes(contract.sourceDataId)
    || currentAffixText !== contract.affixText
    || JSON.stringify(currentRollRanges) !== JSON.stringify(contract.rollDefs)
  ) {
    throw new Error(`Verified TLIDB current SS13 destiny value structure changed: ${flatItem?.id ?? "unknown"}`);
  }
  return {
    ...structuralRecord,
    affixText: contract.affixText,
    ...currentDerived,
    structureAuthority: "tlidb-current-ss13-exact-value-structure",
  };
}

export function resolveCurrentSs13DestinyValueAuthority(
  flatItem,
  structuralRecord,
  currentAffixText,
  currentDerived,
) {
  const definition = SS13_PACT_DIRECT_STAT_AUTHORITY.records?.[flatItem?.id];
  const ko = flatItem?.tlidbText?.ko;
  const rollDefs = currentDerived?.rollDefs;
  const exactAffixLines = String(currentAffixText ?? "").split(/\r?\n/u);
  const authorityEffects = definition?.effects;
  const authoritySourceLineIndexes = Array.isArray(authorityEffects)
    ? authorityEffects.map((effect) => effect?.sourceLineIndex ?? effect?.fragmentIndex)
    : [];
  let matchedRollCount = 0;
  const effectsMatch = Array.isArray(authorityEffects)
    && authorityEffects.length > 0
    && new Set(authoritySourceLineIndexes).size === exactAffixLines.length
    && authorityEffects.every((effect, fragmentIndex) => {
      const sourceLineIndex = authoritySourceLineIndexes[fragmentIndex];
      const commonMatches = effect?.fragmentIndex === fragmentIndex
        && Number.isInteger(sourceLineIndex)
        && sourceLineIndex >= 0
        && sourceLineIndex < exactAffixLines.length
        && (fragmentIndex === 0 || sourceLineIndex >= authoritySourceLineIndexes[fragmentIndex - 1])
        && effect.exactAffixLine === exactAffixLines[sourceLineIndex]
        && typeof effect.statKey === "string"
        && effect.statKey.length > 0
        && typeof effect.parserLabel === "string"
        && effect.parserLabel.length > 0
        && ["flat", "percent", "boolean", "level", "seconds", "meters", "stacks"].includes(effect.parserUnit);
      if (!commonMatches) return false;
      if (typeof effect.fixedValue === "number" && Number.isFinite(effect.fixedValue)) {
        return effect.roll == null;
      }
      const roll = rollDefs?.[matchedRollCount];
      matchedRollCount += 1;
      return roll?.key === effect.roll?.key
        && roll?.min === effect.roll?.min
        && roll?.max === effect.roll?.max
        && roll?.precision === effect.roll?.precision
        && roll?.step === effect.roll?.step;
    })
    && matchedRollCount === rollDefs?.length;
  if (
    !definition
    || definition.catalogId !== flatItem?.id
    || definition.runtimeId !== structuralRecord?.id
    || definition.stableKey !== flatItem?.tlidbStableKey
    || definition.sourceDataId !== String(flatItem?.tlidbStableKey ?? "").split("/").at(-1)
    || definition.sourceUrl !== ko?.sourceUrl
    || definition.sourcePageSha256 !== ko?.sourcePageSha256
    || definition.sourceRecordKey !== ko?.sourceRecordKey
    || definition.exactAffixText !== currentAffixText
    || !effectsMatch
    || ko?.sourcePageVersion !== "SS13"
    || ko?.sourceSeasonEvidence?.verificationComplete !== true
    || ko?.sourceFieldStatus?.summary !== "exact"
    || ko?.sourceFieldStatus?.detail !== "exact"
    || !(ko?.sourceDataIds ?? []).map(String).includes(definition.sourceDataId)
  ) return null;
  return Object.freeze({
    authorityId: PACT_DIRECT_STAT_AUTHORITY_ID,
    ...cloneJson(definition),
  });
}

function activeDestinyRecord(flatItem, structuralRecord = null) {
  const ko = getExactSs13KoRecord(flatItem, "destiny");
  const currentAffixText = exactSs13DestinyAffixText(flatItem, ko);
  const currentDerived = deriveDestinyRolls(currentAffixText);
  const resolvedStructuralRecord = structuralRecord
    ? resolveCurrentSs13DestinyValueStructure(
      flatItem,
      structuralRecord,
      currentAffixText,
      currentDerived,
    )
    : resolveCurrentSs13StandaloneDestinyStructure(
      flatItem,
      currentAffixText,
      currentDerived,
    );
  if (!resolvedStructuralRecord) {
    return {
      id: flatItem.id,
      name: ko.name,
      detail: ko.detail,
      destinyType: null,
      slotType: null,
      affixText: currentAffixText,
      ...currentDerived,
      iconUrl: flatItem.iconUrl || flatItem.sourceIconUrl || "",
      sourceUrl: ko.sourceUrl,
      pairKey: null,
      primaryCategoryId: "",
      categoryIds: [],
      sourceLocale: "ko",
      sourceStatus: "exact-tlidb-ss13-ko-source-only",
      sourceSeason: "SS13",
      catalogId: flatItem.id,
      catalogItem: flatItem,
      tlidbStableKey: flatItem.tlidbStableKey,
      tlidbStableKeys: [...(flatItem.tlidbStableKeys ?? [])],
      structureSupported: false,
      calculationSupported: false,
      valueAuthority: false,
      valueAuthorityBlockerCode: "current-destiny-topology-unavailable",
      displayOnly: true,
    };
  }
  const referenceRollRanges = resolvedStructuralRecord.rollDefs.map(({ min, max, precision }) => ({
    min,
    max,
    precision,
  }));
  const currentRollRanges = currentDerived.rollDefs.map(({ min, max, precision }) => ({
    min,
    max,
    precision,
  }));
  const calculationSupported = JSON.stringify(referenceRollRanges) === JSON.stringify(currentRollRanges);
  const calculationValueAuthority = calculationSupported
    ? resolveCurrentSs13DestinyValueAuthority(
      flatItem,
      resolvedStructuralRecord,
      currentAffixText,
      currentDerived,
    )
    : null;
  return {
    ...resolvedStructuralRecord,
    name: ko.name,
    detail: ko.detail,
    affixText: currentAffixText,
    ...currentDerived,
    iconUrl: flatItem.iconUrl || flatItem.sourceIconUrl || resolvedStructuralRecord.iconUrl,
    sourceUrl: ko.sourceUrl,
    sourceLocale: "ko",
    sourceStatus: resolvedStructuralRecord.structureAuthority
      ? "exact-tlidb-ss13-ko-with-current-structure"
      : "exact-tlidb-ss13-ko-with-91tob-structure",
    sourceSeason: "SS13",
    catalogId: flatItem.id,
    catalogItem: flatItem,
    tlidbStableKey: flatItem.tlidbStableKey,
    tlidbStableKeys: [...(flatItem.tlidbStableKeys ?? [])],
    structureSupported: true,
    calculationSupported,
    valueAuthority: Boolean(calculationValueAuthority),
    valueAuthorityBlockerCode: calculationValueAuthority
      ? null
      : calculationSupported
        ? "current-destiny-effect-semantics-unverified"
        : "current-destiny-roll-structure-mismatch",
    calculationValueAuthority,
    calculationLimitation: calculationSupported ? null : {
      code: "ss13-destiny-value-structure-mismatch",
      reason: "TLIDB SS13 roll ranges do not match the 91TOB structural calculation reference",
      referenceRollRanges,
      currentRollRanges,
      sourceUrl: ko.sourceUrl,
    },
    displayOnly: false,
  };
}

function indexUniqueBySource(records, sourceField, label) {
  const index = new Map();
  for (const record of records) {
    const key = canonicalTlidbSourceKey(record?.[sourceField]);
    if (!key || index.has(key)) throw new Error(`Unique TLIDB source is required for ${label}: ${key}`);
    index.set(key, record);
  }
  return index;
}

export function auditActiveSs13PactValueAuthority(spirits, destinies) {
  const spiritRecords = Array.isArray(spirits) ? spirits : [];
  const destinyRecords = Array.isArray(destinies) ? destinies : [];
  const allRecords = [
    ...spiritRecords.map((record) => ({ categoryId: "spirits", record })),
    ...destinyRecords.map((record) => ({ categoryId: "destiny", record })),
  ];
  const blockerGroups = new Map();
  for (const { categoryId, record } of allRecords) {
    if (record?.valueAuthority === true) continue;
    const code = record?.valueAuthorityBlockerCode;
    const definition = PACT_VALUE_AUTHORITY_BLOCKERS[code];
    if (!definition || definition.categoryId !== categoryId) {
      throw new Error(`Every blocked SS13 pact record needs one typed value-authority blocker: ${record?.id ?? "unknown"}`);
    }
    const group = blockerGroups.get(code) ?? {
      code,
      categoryId,
      count: 0,
      ids: [],
      reason: definition.reason,
    };
    group.count += 1;
    group.ids.push(record.id);
    blockerGroups.set(code, group);
  }

  const structuredSpirits = spiritRecords.filter(({ structureSupported }) => structureSupported !== false);
  const structuredDestinies = destinyRecords.filter(({ structureSupported }) => structureSupported !== false);
  const exactCurrentSpiritAffixRows = structuredSpirits.reduce((total, spirit) => (
    total + (spirit.currentStructureEvidence?.exactCurrentAffixRows
      ?? spirit.calculationLevelAffixes.reduce(
        (levelTotal, { affixes }) => levelTotal + affixes.length,
        0,
      ))
  ), 0);
  const unmatchedCurrentSpiritAffixRows = structuredSpirits.reduce((total, spirit) => (
    total + (spirit.currentStructureEvidence?.unmatchedCurrentAffixRows
      ?? spirit.calculationLimitations.reduce(
        (levelTotal, limitation) => levelTotal + limitation.omittedCount,
        0,
      ))
  ), 0);
  const structuralSpiritAffixRows =
    exactCurrentSpiritAffixRows + unmatchedCurrentSpiritAffixRows;
  const currentDestinyRollStructureMatches = structuredDestinies.filter(
    ({ calculationSupported }) => calculationSupported !== false,
  ).length;
  const supportedSpirits = spiritRecords.filter(({ valueAuthority }) => valueAuthority === true).length;
  const supportedDestinies = destinyRecords.filter(({ valueAuthority }) => valueAuthority === true).length;
  const blockedCount = [...blockerGroups.values()].reduce((total, blocker) => total + blocker.count, 0);
  if (supportedSpirits + supportedDestinies + blockedCount !== allRecords.length) {
    throw new Error("SS13 pact value-authority audit does not cover every current record");
  }

  return {
    schemaVersion: 1,
    source: "TLIDB current SS13 exact locale rows",
    sourceRole: "value-authority-audit",
    complete: blockedCount === 0,
    denominator: {
      spirits: spiritRecords.length,
      destinies: destinyRecords.length,
      total: allRecords.length,
    },
    topology: {
      structuredSpirits: structuredSpirits.length,
      structuredDestinies: structuredDestinies.length,
      sourceOnlySpirits: spiritRecords.length - structuredSpirits.length,
      sourceOnlyDestinies: destinyRecords.length - structuredDestinies.length,
      currentDestinyRollStructureMatches,
      currentDestinyRollStructureMismatches:
        structuredDestinies.length - currentDestinyRollStructureMatches,
    },
    exactCurrentEvidence: {
      spiritRecords: spiritRecords.length,
      destinyRecords: destinyRecords.length,
      structuralSpiritAffixRows,
      exactCurrentSpiritAffixRows,
      unmatchedCurrentSpiritAffixRows,
      destinyAffixRows: destinyRecords.filter(({ affixText }) => Boolean(affixText)).length,
      exactDirectStatRollRows: supportedDestinies,
    },
    valueSupport: {
      spirits: supportedSpirits,
      destinies: supportedDestinies,
      total: supportedSpirits + supportedDestinies,
    },
    calculationApplication: {
      eligibleSpirits: supportedSpirits,
      eligibleDestinies: supportedDestinies,
      eligibleTotal: supportedSpirits + supportedDestinies,
      genericTooltipNumberInferenceAllowed: false,
    },
    blockerCounts: Object.fromEntries(
      [...blockerGroups].map(([code, blocker]) => [code, blocker.count]),
    ),
    blockers: [...blockerGroups.values()],
  };
}

export function createActiveSs13PactDestinyModel(
  pactDataset,
  destinyDataset,
  flatCatalog,
) {
  const structuralModel = createPactDestinyModel(pactDataset, destinyDataset);
  const flatSpirits = Array.isArray(flatCatalog?.spirits) ? flatCatalog.spirits : [];
  const flatDestinies = Array.isArray(flatCatalog?.destiny) ? flatCatalog.destiny : [];
  if (flatSpirits.length !== 175 || flatDestinies.length !== 193) {
    throw new Error("Verified TLIDB SS13 pact catalog must contain 175 spirits and 193 destinies");
  }

  const structuralSpiritBySource = indexUniqueBySource(
    structuralModel.spirits,
    "sourceUrl",
    "structural pact spirits",
  );
  const structuralDestinyBySource = indexUniqueBySource(
    structuralModel.destinies,
    "sourceUrl",
    "structural destinies",
  );
  const currentSpiritStructureByCatalogId = new Map(
    TLIDB_SS13_PACT_SPIRIT_STRUCTURE.records.map((record) => [record.catalogId, record]),
  );
  if (
    TLIDB_SS13_PACT_SPIRIT_STRUCTURE.schemaVersion !== 3
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.targetSeason !== "SS13"
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.candidateCount !== 67
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.activatedCount !== 67
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.blockedCount !== 0
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.knownLocaleGapCount !== 2
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.ringTopologyCounts?.["full-nine"] !== 46
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.ringTopologyCounts?.["inner-six"] !== 21
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.verifiedEmptyBaseLevelCount !== 1
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.valueAuthority !== false
    || TLIDB_SS13_PACT_SPIRIT_STRUCTURE.calculationApplication !== false
    || JSON.stringify(TLIDB_SS13_PACT_SPIRIT_STRUCTURE.ringSlotOrder) !== JSON.stringify(PACT_RING_SLOT_ORDER)
    || JSON.stringify(TLIDB_SS13_PACT_SPIRIT_STRUCTURE.ringTopologies) !== JSON.stringify({
      "full-nine": PACT_RING_SLOT_ORDER,
      "inner-six": PACT_INNER_RING_SLOT_ORDER,
    })
    || currentSpiritStructureByCatalogId.size !== 67
  ) {
    throw new Error("Verified TLIDB current SS13 pact spirit structure overlay changed");
  }
  const flatSpiritKeys = new Set(flatSpirits.map(({ sourceUrl }) => canonicalTlidbSourceKey(sourceUrl)));
  const flatDestinyKeys = new Set(flatDestinies.map(({ sourceUrl }) => canonicalTlidbSourceKey(sourceUrl)));
  const spirits = flatSpirits.map((item) => activePactSpiritRecord(
    item,
    structuralSpiritBySource.get(canonicalTlidbSourceKey(item.sourceUrl)),
    currentSpiritStructureByCatalogId.get(item.id),
  ));
  const destinies = flatDestinies.map((item) => activeDestinyRecord(
    item,
    structuralDestinyBySource.get(canonicalTlidbSourceKey(item.sourceUrl)),
  ));
  const removedRuntimeDestinies = structuralModel.destinies
    .filter(({ sourceUrl }) => !flatDestinyKeys.has(canonicalTlidbSourceKey(sourceUrl)))
    .map((record) => {
      const evidence = SS13_REMOVED_DESTINY_EVIDENCE[canonicalTlidbSourceKey(record.sourceUrl)];
      if (!evidence || evidence.runtimeId !== record.id) {
        throw new Error(`Unexpected SS13 removed runtime destiny: ${record.id}`);
      }
      return { ...evidence, sourceUrl: record.sourceUrl };
    });
  const unmatchedStructuralSpirits = structuralModel.spirits.filter(({ sourceUrl }) => (
    !flatSpiritKeys.has(canonicalTlidbSourceKey(sourceUrl))
  ));
  const sourceOnlySpirits = spirits.filter(({ displayOnly }) => displayOnly);
  const sourceOnlyDestinies = destinies.filter(({ displayOnly }) => displayOnly);
  const calculationUnsupportedStructuredDestinies = destinies.filter(({ structureSupported, calculationSupported }) => (
    structureSupported && !calculationSupported
  ));
  const valueAuthorityAudit = auditActiveSs13PactValueAuthority(spirits, destinies);
  if (
    unmatchedStructuralSpirits.length !== 0
    || spirits.filter(({ structureSupported }) => structureSupported).length !== 175
    || sourceOnlySpirits.length !== 0
    || destinies.filter(({ structureSupported }) => structureSupported).length !== 193
    || sourceOnlyDestinies.length !== 0
    || calculationUnsupportedStructuredDestinies.length !== 0
    || removedRuntimeDestinies.length !== 2
  ) {
    throw new Error("TLIDB SS13 pact structural reconciliation counts changed");
  }

  return {
    ...structuralModel,
    sourceVersions: {
      ...structuralModel.sourceVersions,
      activeFlat: "TLIDB-SS13",
    },
    spirits,
    destinies,
    sourceOnlySpirits,
    sourceOnlyDestinies,
    removedRuntimeDestinies,
    removedDestinyIds: removedRuntimeDestinies.map(({ runtimeId }) => runtimeId),
    activeAuthority: {
      season: "SS13",
      source: "TLIDB exact Korean flat catalog",
      spirits: 175,
      destinies: 193,
      structuredSpirits: 175,
      currentPageStructuredSpirits: 67,
      structuredDestinies: 193,
      currentPageStructuredDestinies: 3,
      rollStructureMatchingDestinies: 193,
      calculationUnsupportedStructuredDestinies: 0,
      displayOnlySpirits: 0,
      displayOnlyDestinies: 0,
      valueAuthority: valueAuthorityAudit,
    },
    unverifiedScope: [
      ...(calculationUnsupportedStructuredDestinies.length ? [{
        kind: "destiny-calculation-structure",
        count: calculationUnsupportedStructuredDestinies.length,
        ids: calculationUnsupportedStructuredDestinies.map(({ id }) => id),
        status: "calculation-unsupported-current-structure-mismatch",
        reason: "TLIDB SS13 current roll structure differs from the structural calculation reference",
      }] : []),
    ],
  };
}

function findPactSpirit(model, spiritId) {
  return model?.spirits?.find(({ id }) => id === spiritId);
}

export function getPactSpiritRingSlotOrder(spirit) {
  if (!spirit || spirit.structureSupported === false || !Array.isArray(spirit.rings)) return [];
  const ringSlotOrder = spirit.rings.map(({ slotId }) => slotId);
  const supported = Object.values(CURRENT_SS13_PACT_RING_TOPOLOGIES).some((candidate) => (
    JSON.stringify(candidate) === JSON.stringify(ringSlotOrder)
  ));
  return supported ? ringSlotOrder : [];
}

export function isPactSpiritRingSlotAvailable(spirit, ringSlotId) {
  return getPactSpiritRingSlotOrder(spirit).includes(ringSlotId);
}

function normalizeInteger(value, minimum, maximum, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(numeric)));
}

export function createPactSpiritInstance(model, spiritId, instanceId = `pact-spirit-${Date.now()}`) {
  const spirit = findPactSpirit(model, spiritId);
  if (!spirit) throw new RangeError(`Unknown pact spirit: ${spiritId}`);
  return {
    instanceId,
    spiritId: spirit.id,
    level: 1,
  };
}

export function normalizePactSpiritInstance(model, input) {
  const spirit = findPactSpirit(model, input?.spiritId);
  if (!spirit) return preserveUnresolvedInstance(input, "spiritId");
  return {
    instanceId: typeof input?.instanceId === "string" && input.instanceId
      ? input.instanceId
      : `pact-spirit-${Date.now()}`,
    spiritId: spirit.id,
    level: normalizeInteger(input?.level, 1, 6, 1),
  };
}

export function updatePactSpiritLevel(model, input, level) {
  if (!findPactSpirit(model, input?.spiritId)) {
    return normalizePactSpiritInstance(model, input);
  }
  return normalizePactSpiritInstance(model, { ...input, level });
}

export function diagnosePactSpiritInstance(model, input) {
  const issues = [];
  if (!findPactSpirit(model, input?.spiritId)) {
    addIssue(issues, "pact-spirit-id-invalid", "spiritId");
  }
  if (typeof input?.instanceId !== "string" || !input.instanceId) {
    addIssue(issues, "pact-spirit-instance-id-invalid", "instanceId");
  }
  if (!Number.isInteger(Number(input?.level)) || Number(input.level) < 1 || Number(input.level) > 6) {
    addIssue(issues, "pact-spirit-level-invalid", "level");
  }
  return {
    valid: issues.length === 0,
    issues,
    normalized: normalizePactSpiritInstance(model, input),
  };
}

export function getPactSpiritView(model, input) {
  const instance = normalizePactSpiritInstance(model, input);
  if (!instance) return null;
  const spirit = findPactSpirit(model, instance.spiritId);
  if (!spirit) return null;
  const selectedLevel = spirit.levelAffixes.find(({ level }) => level === instance.level);
  return {
    ...instance,
    name: spirit.name,
    type: spirit.type,
    rarity: spirit.rarity,
    overview: spirit.overview,
    detail: spirit.detail ?? spirit.overview,
    iconUrl: spirit.iconUrl,
    sourceUrl: spirit.sourceUrl,
    sourceLocale: spirit.sourceLocale ?? null,
    sourceStatus: spirit.sourceStatus,
    sourceSeason: spirit.sourceSeason ?? null,
    catalogId: spirit.catalogId ?? null,
    tlidbStableKey: spirit.tlidbStableKey ?? null,
    structureSupported: spirit.structureSupported !== false,
    calculationSupported: spirit.calculationSupported !== false,
    valueAuthority: spirit.valueAuthority === true,
    valueAuthorityBlockerCode: spirit.valueAuthorityBlockerCode ?? null,
    displayOnly: Boolean(spirit.displayOnly),
    rings: cloneJson(spirit.rings),
    mainAffix: cloneJson(
      spirit.structureSupported !== false && spirit.mainAffix === null
        ? { name: "", effect: "", category: "", icon_url: "" }
        : spirit.mainAffix,
    ),
    levelAffixes: cloneJson(selectedLevel?.affixes ?? []),
    calculationMainAffix: cloneJson(spirit.calculationMainAffix ?? spirit.mainAffix),
    calculationLevelAffixes: cloneJson(
      (spirit.calculationLevelAffixes ?? spirit.levelAffixes)
        .find(({ level }) => level === instance.level)?.affixes ?? [],
    ),
    calculationLevelAffixIndexes: cloneJson(
      (spirit.calculationLevelAffixes ?? spirit.levelAffixes)
        .find(({ level }) => level === instance.level)?.indexes
        ?? (selectedLevel?.affixes ?? []).map((_, index) => index),
    ),
    calculationLimitation: cloneJson(
      spirit.calculationLimitations?.find(({ level }) => level === instance.level) ?? null,
    ),
    defaultUndeterminedFateAffix: spirit.defaultUndeterminedFateAffix,
    defaultUndeterminedFateIconUrl: spirit.defaultUndeterminedFateIconUrl,
  };
}

function findDestiny(model, destinyId) {
  return model?.destinies?.find(({ id }) => id === destinyId);
}

function normalizeRollValue(value, roll) {
  const numeric = Number(value);
  const fallback = roll.min;
  const clamped = Math.min(roll.max, Math.max(roll.min, Number.isFinite(numeric) ? numeric : fallback));
  const stepped = roll.min + Math.round((clamped - roll.min) / roll.step) * roll.step;
  return Number(stepped.toFixed(roll.precision));
}

function defaultDestinyRolls(destiny) {
  return Object.fromEntries(destiny.rollDefs.map((roll) => [roll.key, roll.min]));
}

export function createDestinyInstance(model, destinyId, instanceId = `destiny-${Date.now()}`) {
  const destiny = findDestiny(model, destinyId);
  if (!destiny) throw new RangeError(`Unknown destiny: ${destinyId}`);
  return {
    instanceId,
    destinyId: destiny.id,
    rolls: defaultDestinyRolls(destiny),
  };
}

export function normalizeDestinyInstance(model, input, expectedSlotType = null) {
  const destiny = findDestiny(model, input?.destinyId);
  if (!destiny) {
    if (model?.removedDestinyIds?.includes(input?.destinyId)) return null;
    return preserveUnresolvedInstance(input, "destinyId");
  }
  if (expectedSlotType && destiny.slotType !== expectedSlotType) return null;
  const inputRolls = input?.rolls && typeof input.rolls === "object" && !Array.isArray(input.rolls)
    ? input.rolls
    : {};
  return {
    instanceId: typeof input?.instanceId === "string" && input.instanceId
      ? input.instanceId
      : `destiny-${Date.now()}`,
    destinyId: destiny.id,
    rolls: Object.fromEntries(destiny.rollDefs.map((roll) => [
      roll.key,
      normalizeRollValue(inputRolls[roll.key], roll),
    ])),
  };
}

export function updateDestinyRoll(model, input, rollKey, value, expectedSlotType = null) {
  const instance = normalizeDestinyInstance(model, input, expectedSlotType);
  if (!instance) return null;
  const destiny = findDestiny(model, instance.destinyId);
  if (!destiny) return instance;
  const roll = destiny.rollDefs.find(({ key }) => key === rollKey);
  if (!roll) return instance;
  instance.rolls[roll.key] = normalizeRollValue(value, roll);
  return instance;
}

export function diagnoseDestinyInstance(model, input, expectedSlotType = null) {
  const issues = [];
  const destiny = findDestiny(model, input?.destinyId);
  if (!destiny) addIssue(issues, "destiny-id-invalid", "destinyId");
  if (typeof input?.instanceId !== "string" || !input.instanceId) {
    addIssue(issues, "destiny-instance-id-invalid", "instanceId");
  }
  if (expectedSlotType && destiny && destiny.slotType !== expectedSlotType) {
    addIssue(issues, "destiny-slot-mismatch", "destinyId");
  }
  const inputRolls = input?.rolls && typeof input.rolls === "object" && !Array.isArray(input.rolls)
    ? input.rolls
    : {};
  if (input?.rolls !== undefined && inputRolls !== input.rolls) {
    addIssue(issues, "destiny-rolls-invalid", "rolls");
  }
  const rollByKey = new Map((destiny?.rollDefs ?? []).map((roll) => [roll.key, roll]));
  for (const roll of destiny?.rollDefs ?? []) {
    if (!Object.hasOwn(inputRolls, roll.key)) {
      addIssue(issues, "destiny-roll-required", `rolls.${roll.key}`);
    }
  }
  for (const [rollKey, value] of Object.entries(inputRolls)) {
    const roll = rollByKey.get(rollKey);
    if (!roll || !Number.isFinite(Number(value)) || normalizeRollValue(value, roll) !== Number(value)) {
      addIssue(issues, "destiny-roll-invalid", `rolls.${rollKey}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    normalized: normalizeDestinyInstance(model, input, expectedSlotType),
  };
}

function renderDestinyText(destiny, rolls) {
  const rollByKey = new Map(destiny.rollDefs.map((roll) => [roll.key, roll]));
  return destiny.renderTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const roll = rollByKey.get(key);
    const value = rolls?.[key];
    if (!roll || !Number.isFinite(Number(value))) return "";
    return roll.precision > 0 ? Number(value).toFixed(roll.precision) : String(Number(value));
  });
}

export function getDestinyView(model, input, expectedSlotType = null) {
  const instance = normalizeDestinyInstance(model, input, expectedSlotType);
  if (!instance) return null;
  const destiny = findDestiny(model, instance.destinyId);
  if (!destiny) return null;
  return {
    ...instance,
    name: destiny.name,
    detail: destiny.detail ?? destiny.affixText,
    destinyType: destiny.destinyType,
    slotType: destiny.slotType,
    affixText: destiny.affixText,
    text: renderDestinyText(destiny, instance.rolls),
    iconUrl: destiny.iconUrl,
    sourceUrl: destiny.sourceUrl,
    sourceLocale: destiny.sourceLocale ?? null,
    pairKey: destiny.pairKey,
    primaryCategoryId: destiny.primaryCategoryId,
    categoryIds: cloneJson(destiny.categoryIds),
    sourceStatus: destiny.sourceStatus,
    sourceSeason: destiny.sourceSeason ?? null,
    catalogId: destiny.catalogId ?? null,
    tlidbStableKey: destiny.tlidbStableKey ?? null,
    structureSupported: destiny.structureSupported !== false,
    calculationSupported: destiny.calculationSupported !== false,
    valueAuthority: destiny.valueAuthority === true,
    valueAuthorityBlockerCode: destiny.valueAuthorityBlockerCode ?? null,
    calculationValueAuthority: cloneJson(destiny.calculationValueAuthority ?? null),
    calculationLimitation: cloneJson(destiny.calculationLimitation ?? null),
    displayOnly: Boolean(destiny.displayOnly),
    rollDefs: cloneJson(destiny.rollDefs),
  };
}

function findUndeterminedLayout(model, layoutId) {
  return model?.undeterminedLayouts?.find(({ id }) => id === layoutId);
}

function findUndeterminedDestiny(model) {
  return model?.destinies?.find(({ slotType }) => slotType === "undetermined");
}

export function createUndeterminedDestinyInstance(
  model,
  layoutId,
  instanceId = `undetermined-destiny-${Date.now()}`,
) {
  const layout = findUndeterminedLayout(model, layoutId);
  if (!layout) throw new RangeError(`Unknown undetermined destiny layout: ${layoutId}`);
  const destiny = findUndeterminedDestiny(model);
  if (!destiny) throw new RangeError("Missing undetermined destiny source");
  return {
    instanceId,
    destiny: createDestinyInstance(model, destiny.id, `${instanceId}:destiny`),
    slotLayoutId: layout.id,
    slots: layout.slots.map((slotType, index) => ({
      slotId: `${instanceId}:slot:${index}`,
      slotType,
      installedDestiny: null,
    })),
  };
}

export function normalizeUndeterminedDestinyInstance(model, input) {
  const layout = findUndeterminedLayout(model, input?.slotLayoutId ?? input?.layoutId);
  if (!layout) {
    const layoutIdField = typeof input?.slotLayoutId === "string" && input.slotLayoutId
      ? "slotLayoutId"
      : "layoutId";
    return preserveUnresolvedInstance(input, layoutIdField);
  }
  const instanceId = typeof input?.instanceId === "string" && input.instanceId
    ? input.instanceId
    : `undetermined-destiny-${Date.now()}`;
  const undeterminedDestiny = findUndeterminedDestiny(model);
  if (!undeterminedDestiny) return null;
  const destiny = normalizeDestinyInstance(model, input?.destiny, "undetermined")
    ?? createDestinyInstance(model, undeterminedDestiny.id, `${instanceId}:destiny`);
  const inputSlots = Array.isArray(input?.slots) ? input.slots : [];
  return {
    instanceId,
    destiny,
    slotLayoutId: layout.id,
    slots: layout.slots.map((slotType, index) => {
      const inputSlot = inputSlots[index];
      const installedDestiny = inputSlot?.installedDestiny ?? inputSlot?.destiny;
      return {
        slotId: typeof inputSlot?.slotId === "string" && inputSlot.slotId
          ? inputSlot.slotId
          : `${instanceId}:slot:${index}`,
        slotType,
        installedDestiny: installedDestiny == null
          ? null
          : normalizeDestinyInstance(model, installedDestiny, slotType),
      };
    }),
  };
}

export function setUndeterminedDestinySlot(model, input, slotIndex, destinyInstance) {
  const instance = normalizeUndeterminedDestinyInstance(model, input);
  if (!instance || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= instance.slots.length) {
    return instance;
  }
  const slot = instance.slots[slotIndex];
  const destiny = destinyInstance == null
    ? null
    : normalizeDestinyInstance(model, destinyInstance, slot.slotType);
  if (destinyInstance != null && !destiny) return instance;
  instance.slots[slotIndex] = { ...slot, installedDestiny: destiny };
  return instance;
}

export function diagnoseUndeterminedDestinyInstance(model, input) {
  const issues = [];
  const layout = findUndeterminedLayout(model, input?.slotLayoutId ?? input?.layoutId);
  if (!layout) addIssue(issues, "undetermined-layout-invalid", "slotLayoutId");
  if (typeof input?.instanceId !== "string" || !input.instanceId) {
    addIssue(issues, "undetermined-instance-id-invalid", "instanceId");
  }
  addPrefixedIssues(
    issues,
    diagnoseDestinyInstance(model, input?.destiny, "undetermined"),
    "destiny",
  );
  const slots = Array.isArray(input?.slots) ? input.slots : [];
  if (!layout || slots.length !== layout.slots.length) {
    addIssue(issues, "undetermined-slots-invalid", "slots");
  }
  if (layout) {
    for (const [index, expectedSlotType] of layout.slots.entries()) {
      const slot = slots[index];
      if (!slot || slot.slotType !== expectedSlotType) {
        addIssue(issues, "undetermined-slot-type-invalid", `slots.${index}.slotType`);
      }
      if (typeof slot?.slotId !== "string" || !slot.slotId) {
        addIssue(issues, "undetermined-slot-id-invalid", `slots.${index}.slotId`);
      }
      const installedDestiny = slot?.installedDestiny ?? slot?.destiny;
      if (installedDestiny != null) {
        addPrefixedIssues(
          issues,
          diagnoseDestinyInstance(model, installedDestiny, expectedSlotType),
          `slots.${index}.installedDestiny`,
        );
      }
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    normalized: normalizeUndeterminedDestinyInstance(model, input),
  };
}

function addPrefixedIssues(target, diagnosis, prefix) {
  for (const issue of diagnosis.issues) {
    target.push({ ...issue, path: `${prefix}.${issue.path}` });
  }
}

export function createEmptyPactSpiritSlot(slotId) {
  const normalizedSlotId = PACT_SPIRIT_SLOT_IDS.includes(slotId) ? slotId : PACT_SPIRIT_SLOT_IDS[0];
  return {
    slotId: normalizedSlotId,
    spirit: null,
    rings: Object.fromEntries(PACT_RING_SLOT_ORDER.map((ringSlotId) => [
      ringSlotId,
      { installedDestiny: null },
    ])),
    undeterminedFate: null,
  };
}

function emptyLegacyUnassigned() {
  return {
    smallSlots: Array(9).fill(null),
    mediumSlots: Array(4).fill(null),
    undetermined: Array(5).fill(null),
  };
}

function hasLegacyUnassigned(value) {
  return ["smallSlots", "mediumSlots", "undetermined"].some((field) => (
    Array.isArray(value?.[field]) && value[field].some(Boolean)
  ));
}

function normalizeLegacyUnassigned(model, input) {
  const source = input ?? {};
  return {
    smallSlots: Array.from({ length: 9 }, (_, index) => {
      const value = source.smallSlots?.[index];
      return value == null ? null : normalizeDestinyInstance(model, value, "micro");
    }),
    mediumSlots: Array.from({ length: 4 }, (_, index) => {
      const value = source.mediumSlots?.[index];
      return value == null ? null : normalizeDestinyInstance(model, value, "medium");
    }),
    undetermined: Array.from({ length: 5 }, (_, index) => {
      const value = source.undetermined?.[index];
      return value == null ? null : normalizeUndeterminedDestinyInstance(model, value);
    }),
  };
}

function sourcePactSlot(input, slotId, slotIndex) {
  if (Array.isArray(input?.slots)) {
    return input.slots.find((slot) => slot?.slotId === slotId) ?? input.slots[slotIndex];
  }
  return input?.slots?.[slotId];
}

export function diagnoseCurrentPactRingSlotAvailability(input) {
  const issues = [];
  for (const [slotIndex, slotId] of PACT_SPIRIT_SLOT_IDS.entries()) {
    const rawSlot = sourcePactSlot(input, slotId, slotIndex);
    const availableRingSlotIds = CURRENT_SS13_PACT_RING_SLOTS_BY_SPIRIT_ID.get(
      rawSlot?.spirit?.spiritId,
    );
    if (!availableRingSlotIds) continue;
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      const rawRing = rawSlot?.rings?.[ringSlotId];
      const rawInstalledDestiny = rawRing?.installedDestiny ?? rawRing?.destiny ?? null;
      if (rawInstalledDestiny && !availableRingSlotIds.has(ringSlotId)) {
        addIssue(
          issues,
          "pact-spirit-ring-slot-unavailable",
          `slots.${slotIndex}.rings.${ringSlotId}.installedDestiny`,
        );
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

function normalizePactSpiritSlot(model, input, slotId, slotIndex) {
  const source = input ?? {};
  const originalSpirit = source.pactspiritSlug
    ? {
        instanceId: `pact-spirit-${slotId}-${source.pactspiritSlug}`,
        spiritId: source.pactspiritSlug,
        level: source.level,
      }
    : null;
  const spirit = normalizePactSpiritInstance(model, source.spirit ?? originalSpirit);
  const selectedSpirit = findPactSpirit(model, spirit?.spiritId);
  const structureSupported = selectedSpirit?.structureSupported !== false;
  const availableRingSlotIds = new Set(selectedSpirit
    ? getPactSpiritRingSlotOrder(selectedSpirit)
    : PACT_RING_SLOT_ORDER);
  const rings = Object.fromEntries(PACT_RING_SLOT_ORDER.map((ringSlotId) => {
    const ring = source.rings?.[ringSlotId];
    const installedDestiny = ring?.installedDestiny ?? ring?.destiny ?? null;
    return [ringSlotId, {
      installedDestiny: !structureSupported
        || !availableRingSlotIds.has(ringSlotId)
        || installedDestiny == null
        ? null
        : normalizeDestinyInstance(model, installedDestiny, getPactRingSlotType(ringSlotId)),
    }];
  }));
  return {
    slotId,
    spirit,
    rings,
    undeterminedFate: !structureSupported || source.undeterminedFate == null
      ? null
      : normalizeUndeterminedDestinyInstance(model, source.undeterminedFate),
  };
}

function normalizeSourceOnlyDestinyIds(model, input) {
  const allowedIds = new Set((model?.sourceOnlyDestinies ?? []).map(({ id }) => id));
  const sourceIds = Array.isArray(input?.sourceOnlyDestinyIds)
    ? input.sourceOnlyDestinyIds
    : [];
  return [...new Set(sourceIds.filter((id) => typeof id === "string" && allowedIds.has(id)))];
}

export function createDefaultPactDestinyState() {
  return {
    topologyVersion: PACT_TOPOLOGY_VERSION,
    slots: PACT_SPIRIT_SLOT_IDS.map(createEmptyPactSpiritSlot),
  };
}

export function normalizePactDestinyState(model, input) {
  const hasCanonicalSlots = Array.isArray(input?.slots)
    || (input?.slots !== null && typeof input?.slots === "object");
  const slots = PACT_SPIRIT_SLOT_IDS.map((slotId, slotIndex) => {
    if (hasCanonicalSlots) {
      return normalizePactSpiritSlot(model, sourcePactSlot(input, slotId, slotIndex), slotId, slotIndex);
    }
    const slot = createEmptyPactSpiritSlot(slotId);
    slot.spirit = normalizePactSpiritInstance(model, input?.spirits?.[slotIndex]);
    return slot;
  });
  const legacySource = hasCanonicalSlots ? input?.legacyUnassigned : input?.destiny;
  const legacyUnassigned = normalizeLegacyUnassigned(model, legacySource ?? emptyLegacyUnassigned());
  const sourceOnlyDestinyIds = normalizeSourceOnlyDestinyIds(model, input);
  return {
    topologyVersion: PACT_TOPOLOGY_VERSION,
    slots,
    ...(hasLegacyUnassigned(legacyUnassigned) ? { legacyUnassigned } : {}),
    ...(sourceOnlyDestinyIds.length ? { sourceOnlyDestinyIds } : {}),
  };
}

export function getPactDestinyCapacity(input) {
  const capacity = { ...PACT_BASE_DESTINY_CAPACITY };
  for (const slot of Array.isArray(input?.slots) ? input.slots : []) {
    for (const child of Array.isArray(slot?.undeterminedFate?.slots) ? slot.undeterminedFate.slots : []) {
      if (child?.slotType === "micro") capacity.micro += 1;
      if (child?.slotType === "medium") capacity.medium += 1;
    }
  }
  const legacyUndetermined = Array.isArray(input?.legacyUnassigned?.undetermined)
    ? input.legacyUnassigned.undetermined
    : [];
  for (const undetermined of legacyUndetermined) {
    for (const child of Array.isArray(undetermined?.slots) ? undetermined.slots : []) {
      if (child?.slotType === "micro") capacity.micro += 1;
      if (child?.slotType === "medium") capacity.medium += 1;
    }
  }
  return capacity;
}

function getPactDestinyUsage(input) {
  const usage = { micro: 0, medium: 0 };
  const count = (slotType, instance) => {
    if (instance && Object.hasOwn(usage, slotType)) usage[slotType] += 1;
  };
  for (const slot of Array.isArray(input?.slots) ? input.slots : []) {
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      count(getPactRingSlotType(ringSlotId), slot?.rings?.[ringSlotId]?.installedDestiny);
    }
    for (const child of Array.isArray(slot?.undeterminedFate?.slots) ? slot.undeterminedFate.slots : []) {
      count(child?.slotType, child?.installedDestiny ?? child?.destiny);
    }
  }
  for (const instance of input?.legacyUnassigned?.smallSlots ?? []) count("micro", instance);
  for (const instance of input?.legacyUnassigned?.mediumSlots ?? []) count("medium", instance);
  const legacyUndetermined = Array.isArray(input?.legacyUnassigned?.undetermined)
    ? input.legacyUnassigned.undetermined
    : [];
  for (const undetermined of legacyUndetermined) {
    for (const child of Array.isArray(undetermined?.slots) ? undetermined.slots : []) {
      count(child?.slotType, child?.installedDestiny ?? child?.destiny);
    }
  }
  return usage;
}

function collectOrdinaryStateInstances(state) {
  const entries = [];
  for (const [slotIndex, slot] of (state?.slots ?? []).entries()) {
    if (slot?.spirit) {
      entries.push({ path: `slots.${slotIndex}.spirit`, kind: "spirit", instance: slot.spirit });
    }
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      const instance = slot?.rings?.[ringSlotId]?.installedDestiny;
      if (instance) {
        entries.push({
          path: `slots.${slotIndex}.rings.${ringSlotId}.installedDestiny`,
          kind: "destiny",
          instance,
        });
      }
    }
    const undetermined = slot?.undeterminedFate;
    if (!undetermined) continue;
    entries.push({ path: `slots.${slotIndex}.undeterminedFate`, kind: "undetermined", instance: undetermined });
    if (undetermined.destiny) {
      entries.push({
        path: `slots.${slotIndex}.undeterminedFate.destiny`,
        kind: "undetermined-destiny",
        instance: undetermined.destiny,
      });
    }
    const children = Array.isArray(undetermined.slots) ? undetermined.slots : [];
    for (const [childIndex, child] of children.entries()) {
      const instance = child?.installedDestiny ?? child?.destiny;
      if (instance) {
        const instanceField = child?.installedDestiny ? "installedDestiny" : "destiny";
        entries.push({
          path: `slots.${slotIndex}.undeterminedFate.slots.${childIndex}.${instanceField}`,
          kind: "destiny",
          instance,
        });
      }
    }
  }
  for (const field of ["smallSlots", "mediumSlots"]) {
    for (const [index, instance] of (state?.legacyUnassigned?.[field] ?? []).entries()) {
      if (instance) entries.push({ path: `legacyUnassigned.${field}.${index}`, kind: "destiny", instance });
    }
  }
  for (const [index, undetermined] of (state?.legacyUnassigned?.undetermined ?? []).entries()) {
    if (!undetermined) continue;
    entries.push({ path: `legacyUnassigned.undetermined.${index}`, kind: "undetermined", instance: undetermined });
    if (undetermined.destiny) {
      entries.push({
        path: `legacyUnassigned.undetermined.${index}.destiny`,
        kind: "undetermined-destiny",
        instance: undetermined.destiny,
      });
    }
    const children = Array.isArray(undetermined.slots) ? undetermined.slots : [];
    for (const [childIndex, child] of children.entries()) {
      const instance = child?.installedDestiny ?? child?.destiny;
      if (instance) {
        const instanceField = child?.installedDestiny ? "installedDestiny" : "destiny";
        entries.push({
          path: `legacyUnassigned.undetermined.${index}.slots.${childIndex}.${instanceField}`,
          kind: "destiny",
          instance,
        });
      }
    }
  }
  return entries;
}

function pactProjectionRuntimeContext(state) {
  const distinctInstalledDestinyIds = [...new Set(
    collectOrdinaryStateInstances(state)
      .filter(({ kind }) => kind === "destiny" || kind === "undetermined-destiny")
      .map(({ instance }) => instance?.destinyId)
      .filter((destinyId) => typeof destinyId === "string" && destinyId.length > 0),
  )];
  return {
    distinctInstalledDestinyIds,
    distinctInstalledDestinyCount: distinctInstalledDestinyIds.length,
  };
}

export function diagnosePactDestinyState(model, input) {
  const issues = [];
  const normalized = normalizePactDestinyState(model, input);
  if (!Array.isArray(input?.slots) || input.slots.length !== PACT_SPIRIT_SLOT_IDS.length) {
    addIssue(issues, "pact-topology-migration-required", "slots");
  }
  for (const [slotIndex, slot] of normalized.slots.entries()) {
    if (slot.spirit) {
      addPrefixedIssues(issues, diagnosePactSpiritInstance(model, slot.spirit), `slots.${slotIndex}.spirit`);
    }
    const selectedSpirit = findPactSpirit(model, slot.spirit?.spiritId);
    const availableRingSlotIds = new Set(selectedSpirit
      ? getPactSpiritRingSlotOrder(selectedSpirit)
      : PACT_RING_SLOT_ORDER);
    const rawSlot = sourcePactSlot(input, slot.slotId, slotIndex);
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      const rawRing = rawSlot?.rings?.[ringSlotId];
      const rawInstalledDestiny = rawRing?.installedDestiny ?? rawRing?.destiny ?? null;
      if (rawInstalledDestiny && !availableRingSlotIds.has(ringSlotId)) {
        addIssue(
          issues,
          "pact-spirit-ring-slot-unavailable",
          `slots.${slotIndex}.rings.${ringSlotId}.installedDestiny`,
        );
      }
    }
    const hasAttachedDestiny = PACT_RING_SLOT_ORDER.some((ringSlotId) => (
      slot.rings[ringSlotId].installedDestiny
    )) || Boolean(slot.undeterminedFate);
    if (!slot.spirit && hasAttachedDestiny) {
      addIssue(issues, "pact-destiny-without-spirit", `slots.${slotIndex}`);
    }
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      const instance = slot.rings[ringSlotId].installedDestiny;
      if (instance) {
        addPrefixedIssues(
          issues,
          diagnoseDestinyInstance(model, instance, getPactRingSlotType(ringSlotId)),
          `slots.${slotIndex}.rings.${ringSlotId}.installedDestiny`,
        );
      }
    }
    if (slot.undeterminedFate) {
      addPrefixedIssues(
        issues,
        diagnoseUndeterminedDestinyInstance(model, slot.undeterminedFate),
        `slots.${slotIndex}.undeterminedFate`,
      );
    }
  }
  if (hasLegacyUnassigned(normalized.legacyUnassigned)) {
    addIssue(issues, "legacy-pact-assignment-unresolved", "legacyUnassigned");
  }
  const capacity = getPactDestinyCapacity(normalized);
  const usage = getPactDestinyUsage(normalized);
  for (const slotType of ["micro", "medium"]) {
    if (usage[slotType] <= capacity[slotType]) continue;
    issues.push({
      code: "pact-destiny-capacity-exceeded",
      path: `capacity.${slotType}`,
      slotType,
      usage: usage[slotType],
      capacity: capacity[slotType],
    });
  }
  const instanceIds = new Set();
  for (const { path, instance } of collectOrdinaryStateInstances(normalized)) {
    if (typeof instance?.instanceId !== "string" || !instance.instanceId) continue;
    if (instanceIds.has(instance.instanceId)) addIssue(issues, "instance-id-duplicate", `${path}.instanceId`);
    instanceIds.add(instance.instanceId);
  }
  return { valid: issues.length === 0, issues, normalized };
}

export function getActiveDualKismetPairs(model, input) {
  const grouped = new Map();
  const state = normalizePactDestinyState(model, input);
  for (const { kind, instance } of collectOrdinaryStateInstances(state)) {
    if (kind !== "destiny") continue;
    const destiny = findDestiny(model, instance.destinyId);
    if (destiny?.destinyType !== "dual_kismet") continue;
    const pairKey = destiny.pairKey || destiny.id;
    const existing = grouped.get(destiny.id) ?? {
      pairKey,
      destinyId: destiny.id,
      instanceIds: [],
      active: true,
    };
    if (!existing.instanceIds.includes(instance.instanceId)) existing.instanceIds.push(instance.instanceId);
    grouped.set(destiny.id, existing);
  }
  return [...grouped.values()].filter(({ instanceIds }) => instanceIds.length >= 2);
}

function splitPactEffectText(text) {
  return String(text ?? "")
    .split(PACT_EFFECT_FRAGMENT_SEPARATOR)
    .map((fragment) => fragment.trim())
    .filter(Boolean);
}

function classifyPactEffectText(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return "unsupported-empty";
  if (PACT_CONDITIONAL_PATTERN.test(normalized)) return "unsupported-conditional";
  if (PACT_UNMODELED_CONTEXT_PATTERN.test(normalized)) return "unsupported-context";
  const numbers = normalized.match(/[+-]?\d+(?:\.\d+)?/g) ?? [];
  if (numbers.length !== 1) return "unsupported-value-shape";
  if (normalized.includes("%") && PACT_PERCENT_RESOURCE_PATTERN.test(normalized)) {
    return "unsupported-percent-resource";
  }
  return "candidate";
}

function destinyRequestEntry(view) {
  return {
    destiny_id: view.destinyId,
    destiny_name: view.name,
    destiny_type: view.destinyType,
    ...(Object.keys(view.rolls ?? {}).length ? { roll_values: { ...view.rolls } } : {}),
    resolved_affix_text: view.text,
  };
}

function appendPactEffectEntries(entries, input) {
  const sourceFragments = splitPactEffectText(input.sourceRawText);
  const resolvedFragments = splitPactEffectText(input.resolvedText);
  const fragmentCount = Math.max(sourceFragments.length, resolvedFragments.length);
  for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex += 1) {
    const resolvedText = resolvedFragments[fragmentIndex] ?? sourceFragments[fragmentIndex] ?? "";
    const rawText = sourceFragments[fragmentIndex] ?? resolvedText;
    const authority = input.calculationValueAuthority;
    const matchedAuthorityEffects = authority?.effects?.filter((effect) => (
      (effect.sourceLineIndex ?? effect.fragmentIndex) === fragmentIndex
    )) ?? [];
    const entryAuthorityEffects = matchedAuthorityEffects.length
      ? matchedAuthorityEffects
      : [null];
    for (const authorityEffect of entryAuthorityEffects) {
      const authorityRoll = authorityEffect?.roll;
      const hasFixedAuthorityValue = typeof authorityEffect?.fixedValue === "number"
        && Number.isFinite(authorityEffect.fixedValue);
      const authorityValue = hasFixedAuthorityValue
        ? authorityEffect.fixedValue
        : input.calculationRolls?.[authorityRoll?.key];
      const authorityValueValid = hasFixedAuthorityValue || (
        Number.isFinite(Number(authorityValue))
        && Number(authorityValue) >= Number(authorityRoll?.min)
        && Number(authorityValue) <= Number(authorityRoll?.max)
      );
      const authorityParserText = authorityValueValid
        ? `${Number(authorityValue)}${authorityEffect.parserUnit === "percent" ? "%" : ""} ${authorityEffect.parserLabel}`
        : "";
      const modelingStatus = authorityParserText
        ? "candidate"
        : classifyPactEffectText(resolvedText);
      const authorityEffectSuffix = matchedAuthorityEffects.length > 1
        ? `:${authorityEffect.fragmentIndex}`
        : "";
      entries.push({
        id: `pact:${input.origin}:${input.locationKey}:${input.effectIndex}:${fragmentIndex}${authorityEffectSuffix}`,
        categoryId: input.categoryId,
        origin: input.origin,
        locationKey: input.locationKey,
        sourceDataId: input.sourceDataId,
        sourceItemId: input.sourceItemId,
        sourceUrl: input.sourceUrl,
        sourceLabel: input.sourceLabel,
        sourceRawText: input.sourceRawText,
        rawText,
        resolvedText,
        parserText: authorityParserText || (
          authority && modelingStatus === "candidate" ? resolvedText : ""
        ),
        modelingStatus,
        calculationValueAuthority: authorityParserText ? authority.authorityId : null,
        metadata: {
          ...input.metadata,
          pact_effect_fragment_index: fragmentIndex,
          ...(authorityEffect ? { pact_authority_effect_index: authorityEffect.fragmentIndex } : {}),
        },
        requestEntry: cloneJson(input.requestEntry),
      });
    }
  }
}

function collectDestinyProjectionLocations(model, state, rules, requests) {
  const locations = [];
  const capacity = getPactDestinyCapacity(state);
  const usage = { micro: 0, medium: 0 };
  const reserveCapacity = (expectedSlotType, metadata) => {
    if (!Object.hasOwn(usage, expectedSlotType)) return { applied: true, rule: null };
    usage[expectedSlotType] += 1;
    if (usage[expectedSlotType] <= capacity[expectedSlotType]) {
      return { applied: true, rule: null };
    }
    return {
      applied: false,
      rule: {
        id: `pact:rule:capacity:${metadata.locationKey}`,
        categoryId: "destiny",
        origin: "destiny_capacity",
        locationKey: metadata.locationKey,
        slotType: expectedSlotType,
        usage: usage[expectedSlotType],
        capacity: capacity[expectedSlotType],
        status: "inactive_over_capacity",
        applied: false,
        inactiveReason: "inactive_over_capacity",
      },
    };
  };
  const appendCalculationUnsupportedRule = (view, metadata) => {
    const valueUnverified = view.calculationSupported && !view.valueAuthority;
    rules.push({
      id: `pact:rule:ss13-structure-mismatch:${metadata.locationKey}:${view.destinyId}`,
      categoryId: "destiny",
      origin: valueUnverified
        ? "ss13_destiny_value_unverified"
        : "ss13_destiny_structure_mismatch",
      locationKey: metadata.locationKey,
      destinyId: view.destinyId,
      sourceDataId: view.catalogId || view.destinyId,
      sourceItemId: view.catalogId,
      sourceUrl: view.sourceUrl,
      status: "calculation_unsupported",
      applied: false,
      inactiveReason: valueUnverified
        ? view.valueAuthorityBlockerCode
        : view.calculationLimitation?.code
          ?? "tlidb-ss13-destiny-structure-unverified",
    });
  };
  const append = (instance, expectedSlotType, metadata, capacityReserved = false) => {
    const capacityDecision = capacityReserved
      ? { applied: true, rule: null }
      : reserveCapacity(expectedSlotType, metadata);
    if (!capacityDecision.applied) {
      rules.push(capacityDecision.rule);
      return;
    }
    const view = getDestinyView(model, instance, expectedSlotType);
    if (!view) return;
    if (!view.calculationSupported) {
      appendCalculationUnsupportedRule(view, metadata);
      return;
    }
    const location = {
      ...metadata,
      view,
      locationKey: metadata.locationKey,
      requestEntry: destinyRequestEntry(view),
    };
    locations.push(location);
    requests.push({
      id: `pact:request:destiny:${location.locationKey}`,
      categoryId: "destiny",
      origin: metadata.scope === "derived"
        ? "derived_destiny"
        : metadata.scope === "legacy_unassigned"
          ? "legacy_unassigned_destiny"
          : "ring_destiny",
      locationKey: location.locationKey,
      ...(metadata.spiritSlotId ? { spiritSlotId: metadata.spiritSlotId } : {}),
      ...(metadata.ringSlotId ? { ringSlotId: metadata.ringSlotId } : {}),
      requestEntry: cloneJson(location.requestEntry),
    });
  };

  const appendUndetermined = (undetermined, metadata) => {
    if (!undetermined) return;
    const layoutId = undetermined.slotLayoutId ?? undetermined.layoutId;
    const layout = findUndeterminedLayout(model, layoutId);
    if (!layout) {
      const rawSlots = Array.isArray(undetermined.slots) ? undetermined.slots : [];
      for (const [derivedIndex, child] of rawSlots.entries()) {
        const slotType = child?.slotType;
        const instance = child?.installedDestiny ?? child?.destiny;
        if (!instance || !Object.hasOwn(usage, slotType)) continue;
        const childMetadata = {
          ...metadata,
          scope: metadata.scope === "legacy_unassigned" ? "legacy_unassigned" : "derived",
          derivedIndex,
          slotType,
          layoutId,
          locationKey: `${metadata.locationKey}:derived:${derivedIndex}`,
        };
        const capacityDecision = reserveCapacity(slotType, childMetadata);
        if (!capacityDecision.applied) rules.push(capacityDecision.rule);
      }
      return;
    }
    const coreView = getDestinyView(model, undetermined.destiny, "undetermined");
    const locationKey = metadata.locationKey;
    const childDecisions = layout.slots.map((slotType, derivedIndex) => {
      const child = undetermined.slots[derivedIndex];
      const instance = child?.installedDestiny ?? child?.destiny;
      if (!instance) return null;
      const childMetadata = {
        ...metadata,
        scope: metadata.scope === "legacy_unassigned" ? "legacy_unassigned" : "derived",
        derivedIndex,
        slotType,
        layoutId: layout.id,
        locationKey: `${locationKey}:derived:${derivedIndex}`,
      };
      return {
        instance,
        metadata: childMetadata,
        capacityDecision: reserveCapacity(slotType, childMetadata),
      };
    });
    if (coreView?.calculationSupported) {
      const requestEntry = {
        destiny: destinyRequestEntry(coreView),
        slot_layout_id: layout.id,
        slots: layout.slots.map((slotType, childIndex) => {
          const decision = childDecisions[childIndex];
          const childView = decision?.capacityDecision.applied
            ? getDestinyView(model, decision.instance, slotType)
            : null;
          return {
            slot_type: slotType,
            ...(childView?.calculationSupported
              ? { installed_destiny: destinyRequestEntry(childView) }
              : {}),
          };
        }),
      };
      requests.push({
        id: `pact:request:undetermined:${locationKey}`,
        categoryId: "destiny",
        origin: "undetermined_fate_layout",
        locationKey,
        ...(metadata.spiritSlotId ? { spiritSlotId: metadata.spiritSlotId } : {}),
        requestEntry,
      });
      rules.push({
        id: `pact:rule:undetermined:${locationKey}:${layout.id}`,
        categoryId: "destiny",
        origin: "undetermined_fate_layout",
        locationKey,
        layoutId: layout.id,
        slotTypes: [...layout.slots],
        applied: true,
      });
    } else if (coreView) {
      appendCalculationUnsupportedRule(coreView, metadata);
    }
    for (const decision of childDecisions) {
      if (!decision) continue;
      if (!decision.capacityDecision.applied) {
        rules.push(decision.capacityDecision.rule);
        continue;
      }
      append(
        decision.instance,
        decision.metadata.slotType,
        decision.metadata,
        true,
      );
    }
  };

  for (const [spiritSlotIndex, spiritSlot] of state.slots.entries()) {
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      const instance = spiritSlot.rings[ringSlotId].installedDestiny;
      if (instance) append(instance, getPactRingSlotType(ringSlotId), {
        scope: "ring",
        spiritSlotIndex,
        spiritSlotId: spiritSlot.slotId,
        ringSlotId,
        slotType: getPactRingSlotType(ringSlotId),
        locationKey: `${spiritSlot.slotId}:ring:${ringSlotId}`,
      });
    }
    appendUndetermined(spiritSlot.undeterminedFate, {
      scope: "undetermined",
      spiritSlotIndex,
      spiritSlotId: spiritSlot.slotId,
      locationKey: `${spiritSlot.slotId}:undetermined`,
    });
  }

  for (const [slotIndex, instance] of (state.legacyUnassigned?.smallSlots ?? []).entries()) {
    if (instance) append(instance, "micro", {
      scope: "legacy_unassigned",
      slotKind: "small",
      slotIndex,
      locationKey: `legacy:small:${slotIndex}`,
    });
  }
  for (const [slotIndex, instance] of (state.legacyUnassigned?.mediumSlots ?? []).entries()) {
    if (instance) append(instance, "medium", {
      scope: "legacy_unassigned",
      slotKind: "medium",
      slotIndex,
      locationKey: `legacy:medium:${slotIndex}`,
    });
  }
  for (const [legacyIndex, undetermined] of (state.legacyUnassigned?.undetermined ?? []).entries()) {
    appendUndetermined(undetermined, {
      scope: "legacy_unassigned",
      legacyIndex,
      locationKey: `legacy:undetermined:${legacyIndex}`,
    });
  }
  if (hasLegacyUnassigned(state.legacyUnassigned)) {
    rules.push({
      id: "pact:rule:legacy-unassigned-mapping",
      categoryId: "destiny",
      origin: "legacy_unassigned_mapping",
      locationKey: "legacyUnassigned",
      status: "unresolved",
      applied: false,
      inactiveReason: "legacy-global-slot-has-no-spirit-ring-assignment",
    });
  }
  return locations;
}

function dualKismetStatuses(locations) {
  const statuses = new Map();
  const grouped = new Map();
  for (const location of locations) {
    if (location.view.destinyType !== "dual_kismet") continue;
    const group = grouped.get(location.view.destinyId) ?? [];
    group.push(location);
    grouped.set(location.view.destinyId, group);
  }
  for (const group of grouped.values()) {
    if (group.length < 2) {
      for (const location of group) statuses.set(location.locationKey, "inactive_unpaired");
      continue;
    }
    group.forEach((location, index) => {
      statuses.set(location.locationKey, index < 2 ? "active_paired" : "inactive_over_limit");
    });
  }
  return statuses;
}

export function projectPactDestinyCalculation(model, input) {
  const state = normalizePactDestinyState(model, input);
  const entries = [];
  const rules = [];
  const requests = [];
  let activeSpirits = false;

  for (const [slotIndex, spiritSlot] of state.slots.entries()) {
    const instance = spiritSlot.spirit;
    if (!instance) continue;
    const view = getPactSpiritView(model, instance);
    if (!view) continue;
    if (!view.calculationSupported) {
      const hasCurrentStructure = view.structureSupported;
      rules.push({
        id: `pact:rule:source-only-spirit:${spiritSlot.slotId}:${view.spiritId}`,
        categoryId: "spirits",
        origin: hasCurrentStructure
          ? "ss13_pact_spirit_value_unverified"
          : "source_only_pact_spirit",
        locationKey: `spirit:${spiritSlot.slotId}`,
        sourceDataId: view.catalogId || view.spiritId,
        sourceItemId: view.catalogId,
        sourceUrl: view.sourceUrl,
        status: "calculation_unsupported",
        applied: false,
        inactiveReason: hasCurrentStructure
          ? view.valueAuthorityBlockerCode
          : "tlidb-source-has-no-verified-pact-structure",
      });
      continue;
    }
    const locationKey = `spirit:${spiritSlot.slotId}`;
    const selectedAffixes = view.calculationLevelAffixes.length
      ? view.calculationLevelAffixes
      : [view.calculationMainAffix?.effect].filter(Boolean);
    const requestEntry = view.calculationLimitation
      ? null
      : { pactspirit_slug: view.spiritId, level: view.level };
    if (selectedAffixes.length) activeSpirits = true;
    if (view.calculationLimitation) {
      rules.push({
        id: `pact:rule:ss13-affix-unverified:${spiritSlot.slotId}:${view.spiritId}:${view.level}`,
        categoryId: "spirits",
        origin: "ss13_pact_spirit_affix_unverified",
        locationKey,
        sourceDataId: view.catalogId || view.spiritId,
        sourceItemId: view.catalogId,
        sourceUrl: view.sourceUrl,
        level: view.level,
        omittedIndexes: [...view.calculationLimitation.omittedIndexes],
        omittedCount: view.calculationLimitation.omittedCount,
        status: "calculation_partial_unsupported",
        applied: false,
        inactiveReason: view.calculationLimitation.code,
      });
    } else {
      requests.push({
        id: `pact:request:spirit:${spiritSlot.slotId}`,
        categoryId: "spirits",
        origin: "pact_spirit_slot",
        locationKey,
        spiritSlotId: spiritSlot.slotId,
        requestEntry,
      });
    }
    selectedAffixes.forEach((rawText, verifiedIndex) => {
      const effectIndex = view.calculationLevelAffixIndexes[verifiedIndex] ?? verifiedIndex;
      const origin = effectIndex === 0 ? "pact_spirit_main_affix" : "pact_spirit_level_affix";
      appendPactEffectEntries(entries, {
        categoryId: "spirits",
        origin,
        locationKey,
        effectIndex,
        sourceDataId: view.spiritId,
        sourceItemId: view.catalogId,
        sourceUrl: view.sourceUrl,
        sourceLabel: effectIndex === 0
          ? view.mainAffix?.name || view.name
          : `${view.name} Lv.${view.level}`,
        sourceRawText: rawText,
        resolvedText: rawText,
        metadata: {
          pact_spirit_slot_index: slotIndex,
          pact_spirit_slot_id: spiritSlot.slotId,
          pact_spirit_instance_id: view.instanceId,
          pact_spirit_slug: view.spiritId,
          pact_spirit_level: view.level,
          pact_spirit_level_affix_index: effectIndex,
          pact_spirit_main_affix_name: view.mainAffix?.name ?? "",
          pact_spirit_ring_slot_ids: [...model.ringOrder],
        },
        requestEntry,
      });
    });
  }

  for (const destinyId of state.sourceOnlyDestinyIds ?? []) {
    const destiny = findDestiny(model, destinyId);
    if (!destiny || destiny.calculationSupported !== false) continue;
    rules.push({
      id: `pact:rule:source-only-destiny:${destiny.id}`,
      categoryId: "destiny",
      origin: "source_only_destiny",
      locationKey: `source-only:${destiny.id}`,
      sourceDataId: destiny.catalogId || destiny.id,
      sourceItemId: destiny.catalogId,
      sourceUrl: destiny.sourceUrl,
      status: "calculation_unsupported",
      applied: false,
      inactiveReason: "tlidb-source-has-no-verified-destiny-slot-structure",
    });
  }

  const locations = collectDestinyProjectionLocations(model, state, rules, requests);
  const pairStatuses = dualKismetStatuses(locations);
  const emittedDualKismetDestinyIds = new Set();
  for (const location of locations) {
    const { view } = location;
    const pairStatus = view.destinyType === "dual_kismet"
      ? pairStatuses.get(location.locationKey) ?? "inactive_unpaired"
      : "not_applicable";
    if (view.destinyType === "dual_kismet") {
      const applied = pairStatus === "active_paired";
      rules.push({
        id: `pact:rule:dual:${location.locationKey}:${view.destinyId}`,
        categoryId: "destiny",
        origin: "dual_kismet_pair",
        locationKey: location.locationKey,
        pairKey: view.pairKey || view.destinyId,
        destinyId: view.destinyId,
        sourceItemId: view.catalogId,
        sourceUrl: view.sourceUrl,
        status: pairStatus,
        applied,
        inactiveReason: applied ? undefined : pairStatus,
      });
      if (!applied) continue;
      if (emittedDualKismetDestinyIds.has(view.destinyId)) continue;
      emittedDualKismetDestinyIds.add(view.destinyId);
    }
    appendPactEffectEntries(entries, {
      categoryId: "destiny",
      origin: location.scope === "derived"
        ? "derived_destiny_affix"
        : location.scope === "legacy_unassigned"
          ? "legacy_unassigned_destiny_affix"
          : "ring_destiny_affix",
      locationKey: location.locationKey,
      effectIndex: 0,
      sourceDataId: view.destinyId,
      sourceItemId: view.catalogId,
      sourceUrl: view.sourceUrl,
      sourceLabel: view.name,
      sourceRawText: view.affixText,
      resolvedText: view.text,
      calculationValueAuthority: view.calculationValueAuthority,
      calculationRolls: view.rolls,
      metadata: {
        pact_destiny_instance_id: view.instanceId,
        pact_destiny_id: view.destinyId,
        pact_destiny_type: view.destinyType,
        pact_destiny_slot_type: view.slotType,
        pact_destiny_scope: location.scope,
        pact_destiny_pair_status: pairStatus,
        ...(location.scope === "ring" ? {
          pact_spirit_slot_index: location.spiritSlotIndex,
          pact_spirit_slot_id: location.spiritSlotId,
          pact_ring_slot_id: location.ringSlotId,
        } : location.scope === "derived" ? {
          pact_spirit_slot_index: location.spiritSlotIndex,
          pact_spirit_slot_id: location.spiritSlotId,
          pact_derived_slot_index: location.derivedIndex,
          pact_undetermined_layout_id: location.layoutId,
        } : {
          pact_destiny_slot_kind: location.slotKind,
          pact_destiny_slot_index: location.slotIndex,
          pact_legacy_undetermined_index: location.legacyIndex,
          ...(location.derivedIndex !== undefined ? {
            pact_derived_slot_index: location.derivedIndex,
            pact_undetermined_layout_id: location.layoutId,
          } : {}),
        }),
      },
      requestEntry: location.requestEntry,
    });
  }

  const activeDestiny = locations.length > 0 || rules.some(({ origin }) => (
    origin === "undetermined_fate_layout"
  ));
  const hasCurrentValueAuthority = entries.some(({ calculationValueAuthority }) => (
    calculationValueAuthority === PACT_DIRECT_STAT_AUTHORITY_ID
  ));
  return {
    reference: hasCurrentValueAuthority
      ? Object.freeze({
        ...PACT_CALCULATION_REFERENCE,
        valueAuthority: true,
        valueAuthoritySource: "TLIDB current SS13 exact stable-ID direct-stat roll",
      })
      : PACT_CALCULATION_REFERENCE,
    active: activeSpirits || activeDestiny,
    activeCategories: { spirits: activeSpirits, destiny: activeDestiny },
    entries,
    rules,
    requests,
    runtimeContext: pactProjectionRuntimeContext(state),
    unverifiedScope: [
      ...cloneJson(model?.unverifiedScope ?? []),
      ...(hasLegacyUnassigned(state.legacyUnassigned) ? [{
        kind: "legacy-pact-ring-assignment",
        status: "unverified-position-preserved",
        reason: "이전 전역 슬롯 저장에는 정령·링 위치가 없어 선택과 계산은 보존하되 위치를 임의 배정하지 않음",
      }] : []),
    ],
  };
}

export function auditPactDestinyCatalog(pactDataset, destinyDataset) {
  const issues = [];
  const ringOrder = Array.isArray(pactDataset?.ring_slot_order)
    ? pactDataset.ring_slot_order
    : [];
  if (ringOrder.length !== 9 || new Set(ringOrder).size !== 9) {
    addIssue(issues, "pact-ring-order-invalid", "pactspirit_catalog.ring_slot_order");
  }

  const spirits = Array.isArray(pactDataset?.pactspirits) ? pactDataset.pactspirits : [];
  if (spirits.length !== EXPECTED_PACT_SPIRIT_COUNT) {
    addIssue(issues, "pact-spirit-count-invalid", "pactspirit_catalog.pactspirits");
  }
  const spiritIds = new Set();
  let levelAffixSets = 0;
  let pactSpiritRings = 0;
  let pactSpiritMainAffixes = 0;
  for (const [spiritIndex, spirit] of spirits.entries()) {
    const spiritPath = `pactspirit_catalog.pactspirits.${spiritIndex}`;
    if (typeof spirit?.slug !== "string" || !spirit.slug || spiritIds.has(spirit.slug)) {
      addIssue(issues, "pact-spirit-id-invalid", `${spiritPath}.slug`);
    }
    spiritIds.add(spirit?.slug);
    if (!hasStringFields(spirit, ["name", "type", "rarity", "overview", "icon_url", "source_url"])) {
      addIssue(issues, "pact-spirit-source-fields-invalid", spiritPath);
    }

    const ringKeys = spirit?.rings && typeof spirit.rings === "object"
      ? Object.keys(spirit.rings)
      : [];
    pactSpiritRings += ringKeys.length;
    if (
      ringKeys.length !== ringOrder.length
      || ringOrder.some((slotId) => {
        const ring = spirit?.rings?.[slotId];
        return !hasStringFields(ring, ["name", "effect", "category", "icon_url"]);
      })
    ) {
      addIssue(issues, "pact-spirit-rings-invalid", `${spiritPath}.rings`);
    }

    if (
      spirit?.main_affix
      && typeof spirit.main_affix === "object"
      && hasStringFields(spirit.main_affix, ["name", "effect", "category", "icon_url"])
    ) {
      pactSpiritMainAffixes += 1;
    } else {
      addIssue(issues, "pact-spirit-main-affix-invalid", `${spiritPath}.main_affix`);
    }

    const levels = spirit?.level_affixes && typeof spirit.level_affixes === "object"
      ? spirit.level_affixes
      : {};
    if (Object.keys(levels).sort().join(",") !== "1,2,3,4,5,6") {
      addIssue(issues, "pact-spirit-level-affixes-invalid", `${spiritPath}.level_affixes`);
    }
    for (let level = 1; level <= 6; level += 1) {
      const affixes = levels[String(level)];
      if (!Array.isArray(affixes) || affixes.length === 0 || affixes.some((text) => (
        typeof text !== "string" || text.length === 0
      ))) {
        addIssue(issues, "pact-spirit-level-affixes-invalid", `${spiritPath}.level_affixes.${level}`);
      } else {
        levelAffixSets += 1;
      }
    }
  }

  const destinies = Array.isArray(destinyDataset?.destinies) ? destinyDataset.destinies : [];
  if (destinies.length !== EXPECTED_DESTINY_COUNTS.total) {
    addIssue(issues, "destiny-count-invalid", "destiny_catalog.destinies");
  }
  const destinyIds = new Set();
  const slotCounts = { micro: 0, medium: 0, undetermined: 0 };
  const destinyTypeCounts = Object.fromEntries(
    Object.keys(EXPECTED_DESTINY_TYPE_COUNTS).map((destinyType) => [destinyType, 0]),
  );
  let variableRanges = 0;
  for (const [destinyIndex, destiny] of destinies.entries()) {
    const destinyPath = `destiny_catalog.destinies.${destinyIndex}`;
    if (typeof destiny?.id !== "string" || !destiny.id || destinyIds.has(destiny.id)) {
      addIssue(issues, "destiny-id-invalid", `${destinyPath}.id`);
    }
    destinyIds.add(destiny?.id);
    if (!hasStringFields(destiny, [
      "name",
      "destiny_type",
      "slot_type",
      "affix_text",
      "icon_url",
      "source_url",
      "primary_category_id",
    ], true) || !destiny.name || !destiny.icon_url || !destiny.source_url || !destiny.primary_category_id) {
      addIssue(issues, "destiny-source-fields-invalid", destinyPath);
    }
    if (!Object.hasOwn(destinyTypeCounts, destiny?.destiny_type)) {
      addIssue(issues, "destiny-type-invalid", `${destinyPath}.destiny_type`);
    } else {
      destinyTypeCounts[destiny.destiny_type] += 1;
    }
    if (!Object.hasOwn(slotCounts, destiny?.slot_type)) {
      addIssue(issues, "destiny-slot-type-invalid", `${destinyPath}.slot_type`);
    } else {
      slotCounts[destiny.slot_type] += 1;
    }
    const expectedSlotType = DESTINY_TYPE_SLOT[destiny?.destiny_type];
    if (expectedSlotType && destiny.slot_type !== expectedSlotType) {
      addIssue(issues, "destiny-type-slot-mismatch", `${destinyPath}.slot_type`);
    }
    if (typeof destiny?.affix_text !== "string") {
      addIssue(issues, "destiny-affix-text-invalid", `${destinyPath}.affix_text`);
    } else {
      variableRanges += deriveDestinyRolls(destiny.affix_text).rollDefs.length;
    }
    if (destiny?.destiny_type === "dual_kismet" && destiny.pair_key !== destiny.id) {
      addIssue(issues, "dual-kismet-pair-key-invalid", `${destinyPath}.pair_key`);
    } else if (destiny?.destiny_type !== "dual_kismet" && destiny?.pair_key != null) {
      addIssue(issues, "destiny-pair-key-invalid", `${destinyPath}.pair_key`);
    }
    if (!Array.isArray(destiny?.category_ids) || destiny.category_ids.some((categoryId) => (
      typeof categoryId !== "string" || !categoryId
    ))) {
      addIssue(issues, "destiny-category-ids-invalid", `${destinyPath}.category_ids`);
    }
  }
  for (const [slotType, expectedCount] of Object.entries(EXPECTED_DESTINY_COUNTS)) {
    if (slotType !== "total" && slotCounts[slotType] !== expectedCount) {
      addIssue(issues, "destiny-slot-count-invalid", `destiny_catalog.destinies.${slotType}`);
    }
  }
  for (const [destinyType, expectedCount] of Object.entries(EXPECTED_DESTINY_TYPE_COUNTS)) {
    if (destinyTypeCounts[destinyType] !== expectedCount) {
      addIssue(issues, "destiny-type-count-invalid", `destiny_catalog.destinies.${destinyType}`);
    }
  }

  const layouts = Array.isArray(destinyDataset?.undetermined_fate_layouts)
    ? destinyDataset.undetermined_fate_layouts
    : [];
  if (layouts.length !== EXPECTED_UNDETERMINED_LAYOUT_COUNT) {
    addIssue(issues, "undetermined-layout-count-invalid", "destiny_catalog.undetermined_fate_layouts");
  }
  const layoutIds = new Set();
  let layoutSlots = 0;
  for (const [layoutIndex, layout] of layouts.entries()) {
    const layoutPath = `destiny_catalog.undetermined_fate_layouts.${layoutIndex}`;
    if (typeof layout?.id !== "string" || !layout.id || layoutIds.has(layout.id)) {
      addIssue(issues, "undetermined-layout-id-invalid", `${layoutPath}.id`);
    }
    layoutIds.add(layout?.id);
    if (typeof layout?.label !== "string" || !layout.label) {
      addIssue(issues, "undetermined-layout-label-invalid", `${layoutPath}.label`);
    }
    const slots = Array.isArray(layout?.slots) ? layout.slots : [];
    layoutSlots += slots.length;
    if (
      slots.length < 1
      || slots.length > 3
      || slots.some((slotType) => slotType !== "micro" && slotType !== "medium")
    ) {
      addIssue(issues, "undetermined-layout-slots-invalid", `${layoutPath}.slots`);
    }
  }

  const unverifiedScope = [cloneJson(S13_UNVERIFIED_SCOPE)];
  return {
    valid: issues.length === 0,
    complete: issues.length === 0 && unverifiedScope.length === 0,
    counts: {
      pactSpirits: spirits.length,
      pactSpiritLevelAffixSets: levelAffixSets,
      pactSpiritRings,
      pactSpiritMainAffixes,
      destinies: destinies.length,
      microDestinies: slotCounts.micro,
      mediumDestinies: slotCounts.medium,
      undeterminedDestinies: slotCounts.undetermined,
      microFates: destinyTypeCounts.micro_fate,
      mediumFates: destinyTypeCounts.medium_fate,
      kismets: destinyTypeCounts.kismet,
      dualKismets: destinyTypeCounts.dual_kismet,
      undeterminedFates: destinyTypeCounts.undetermined_fate,
      undeterminedLayouts: layouts.length,
      undeterminedLayoutSlots: layoutSlots,
      destinyVariableRanges: variableRanges,
      s13UnverifiedDestinies: EXPECTED_S13_ADDITIONAL_DESTINIES,
    },
    issues,
    unverifiedScope,
  };
}
