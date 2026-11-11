import { CATALOG, getSpecialDivinitySlateItems } from "./catalog.js";
import { RUNTIME_CATALOG } from "./data/runtimeCatalog.generated.js";
import { TLIDB_DIVINITY_TEMPLATE_KO_LOCALE } from "./data/tlidbDivinityTemplateKoLocale.js";
import { TLIDB_NETHER_KING_TALENTS_SS13 } from "./data/tlidbNetherKingTalents.ss13.generated.js";
import { containsHanScript, presentGameText } from "./gameTextPresentation.js";
import {
  auditHadesSs13FullCalculationSupport,
  getHadesTalentSemanticRecord,
} from "./hadesCalculationRuntime.js";

const HADES_CALCULATION_AUDIT = auditHadesSs13FullCalculationSupport();
if (!HADES_CALCULATION_AUDIT.ruleRegistrationComplete) {
  throw new Error("Current SS13 Nether King calculation-rule registry is incomplete");
}

const EXPECTED_COUNTS = Object.freeze({
  currentFlatItems: 1163,
  structuralItems: 1102,
  mappedStructuralItems: 1008,
  mappedCurrentHadesItems: 92,
  removedStructuralItems: 94,
  sourceOnlyItems: 63,
  sourceOnlyItemsWithoutSourceDetail: 0,
  sourceOnlyItemsWithMixedKoreanSource: 0,
  currentSpecialSlateItems: 7,
  mappedSpecialSlateTemplates: 7,
  sourceOnlySpecialSlateItems: 0,
});

export const DIVINITY_SOURCE_ONLY_REASON = (
  "현재 TLIDB SS13 항목에 배치 형상·슬롯·복사 규칙의 직접 출처가 없어 정보 표시만 지원합니다. 배치와 계산은 지원하지 않습니다."
);

export const SPECIAL_DIVINITY_SLATE_SOURCE_ONLY_REASON = (
  "배치 형상·복사 구조 미검증 · 배치·계산 미지원"
);

const SPECIAL_SLATE_TEMPLATE_BY_SOURCE_URL = new Map(
  Object.entries(TLIDB_DIVINITY_TEMPLATE_KO_LOCALE).map(([templateId, source]) => (
    [source.sourceUrl, templateId]
  )),
);

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function requireCount(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function structuralFlatId(record, sourceKind) {
  if (sourceKind === "divinity") {
    return Number.isInteger(record?.legacyId)
      ? `slates-divinity-talent-${record.legacyId}`
      : "";
  }
  return typeof record?.id === "string" && record.id
    ? `slates-${record.id}`
    : "";
}

function exactKoreanSource(flatItem, { detailRequired }) {
  const ko = flatItem?.tlidbText?.ko;
  const status = ko?.sourceFieldStatus;
  if (!ko || status?.name !== "exact" || !ko.name) {
    throw new Error(`Exact TLIDB SS13 Korean slate name is required: ${flatItem?.id ?? "unknown"}`);
  }
  if (detailRequired && (status?.detail !== "exact" || !ko.detail)) {
    throw new Error(`Exact TLIDB SS13 Korean slate detail is required: ${flatItem.id}`);
  }
  if (!detailRequired) {
    if (!["exact", "not-present", "source-language-mixed"].includes(status?.detail)) {
      throw new Error(`Unsupported TLIDB SS13 Korean slate detail status: ${flatItem.id}`);
    }
    if (
      status.detail === "source-language-mixed"
      && (!ko.detail || !containsHanScript(ko.detail))
    ) {
      throw new Error(`Invalid TLIDB SS13 mixed Korean slate detail evidence: ${flatItem.id}`);
    }
  }
  return ko;
}

function mappedRecord(flatItem, structuralRecord, sourceKind) {
  const ko = exactKoreanSource(flatItem, { detailRequired: true });
  if (flatItem.type !== structuralRecord.valueType) {
    throw new Error(`SS13 slate type conflicts with structural reference: ${flatItem.id}`);
  }
  return {
    ...structuralRecord,
    id: flatItem.id,
    flatItemId: flatItem.id,
    legacyRuntimeId: structuralRecord.id,
    activeSeason: "SS13",
    sourceStatus: "exact-current-flat-with-structural-reference",
    structuralSourceKind: sourceKind,
    name: ko.name,
    text: ko.detail,
    sourceUrl: ko.sourceUrl,
    sourceRecordKey: ko.sourceRecordKey,
    sourceDataIds: [...(ko.sourceDataIds ?? [])],
    iconUrl: flatItem.iconUrl ?? flatItem.sourceIconUrl ?? structuralRecord.iconUrl ?? "",
    selectionSupported: true,
    placementSupported: true,
    calculationSupported: true,
    displayOnly: false,
  };
}

function currentHadesRecord(flatItem, sourceRecord) {
  const semanticRecord = getHadesTalentSemanticRecord(sourceRecord.id);
  const tlidbText = sourceRecord.locales;
  const ko = tlidbText.ko;
  const koMixed = ko.sourceFieldStatus.detail === "source-language-mixed"
    || containsHanScript(ko.detail);
  const authority = koMixed ? tlidbText.en : ko;
  const text = presentGameText(ko.detail, { locale: "ko", optional: koMixed });
  if (!text || !authority?.detail) {
    throw new Error(`Current SS13 Nether King detail is required: ${flatItem.id}`);
  }
  return {
    id: flatItem.id,
    flatItemId: flatItem.id,
    activeSeason: "SS13",
    sourceStatus: "exact-current-nether-king-stable-id",
    structuralSourceKind: "hades",
    category: sourceRecord.category,
    hadesCategory: sourceRecord.category,
    valueType: sourceRecord.valueType,
    slotKind: sourceRecord.slotKind,
    name: presentGameText(ko.name, { locale: "ko" }),
    text,
    calculationText: authority.detail,
    sourceUrl: authority.sourceUrl,
    displaySourceUrl: ko.sourceUrl,
    sourceRecordKey: authority.sourceRecordKey,
    sourceDataIds: [...authority.sourceDataIds],
    receipt: {
      sourceUrl: authority.sourceUrl,
      sourceMethod: authority.sourceMethod,
      sourceRecordKey: authority.sourceRecordKey,
      sourcePageSha256: authority.sourcePageSha256,
      sourcePageVersion: authority.sourcePageVersion,
      sourceCheckedAt: authority.sourceCheckedAt,
    },
    iconUrl: flatItem.iconUrl ?? flatItem.sourceIconUrl ?? "",
    sourceDetailAvailable: !koMixed,
    sourceDetailPartiallyAvailable: koMixed,
    sourceDetailStatus: koMixed ? "source-language-mixed" : "exact",
    selectionSupported: true,
    placementSupported: true,
    calculationSupported: false,
    partialCalculationSupported: Boolean(semanticRecord),
    calculationRuleSupported: Boolean(semanticRecord),
    calculationSupportStatus: "structured-rules-with-result-level-gating",
    engineCalculationComplete: false,
    directVerificationComplete: false,
    displayOnly: false,
  };
}

function currentHadesAuthorityItem(flatItem, sourceRecord) {
  return {
    ...flatItem,
    tlidbText: sourceRecord.locales,
  };
}

function sourceOnlyRecord(flatItem) {
  const ko = exactKoreanSource(flatItem, { detailRequired: false });
  const detailAvailable = ko.sourceFieldStatus.detail === "exact" && Boolean(ko.detail);
  const detailContainsHan = Boolean(ko.detail) && containsHanScript(ko.detail);
  const mixedDetail = ko.sourceFieldStatus.detail === "source-language-mixed" || detailContainsHan;
  const displayDetail = (detailAvailable || mixedDetail) && ko.detail
    ? presentGameText(ko.detail, { locale: "ko", optional: mixedDetail })
    : "";
  return {
    id: flatItem.id,
    flatItemId: flatItem.id,
    activeSeason: "SS13",
    sourceStatus: "exact-current-flat-source-only",
    name: presentGameText(ko.name, { locale: "ko" }),
    text: displayDetail,
    typeLabel: presentGameText(ko.type ?? "", { locale: "ko", optional: true }),
    tags: (ko.tags ?? [])
      .map((tag) => presentGameText(tag, { locale: "ko", optional: true }))
      .filter(Boolean),
    sourceUrl: ko.sourceUrl,
    sourceRecordKey: ko.sourceRecordKey,
    sourceDataIds: [...(ko.sourceDataIds ?? [])],
    iconUrl: flatItem.iconUrl ?? flatItem.sourceIconUrl ?? "",
    sourceDetailAvailable: detailAvailable && !mixedDetail,
    sourceDetailPartiallyAvailable: mixedDetail,
    sourceDetailStatus: mixedDetail
      ? "source-language-mixed"
      : detailAvailable ? "exact" : "not-present",
    selectionSupported: false,
    placementSupported: false,
    calculationSupported: false,
    displayOnly: true,
    unsupportedReason: DIVINITY_SOURCE_ONLY_REASON,
  };
}

function addSourceOnlyDisplayDisambiguation(records) {
  const sameNameWithoutDetail = new Map();
  for (const record of records) {
    if (record.sourceDetailStatus !== "not-present") continue;
    const group = sameNameWithoutDetail.get(record.name) ?? [];
    group.push(record);
    sameNameWithoutDetail.set(record.name, group);
  }

  const ordinalById = new Map();
  for (const group of sameNameWithoutDetail.values()) {
    if (group.length < 2) continue;
    group.forEach((record, index) => {
      ordinalById.set(record.id, {
        kind: "same-name-app-ordinal",
        ordinal: index + 1,
        sameNameCount: group.length,
      });
    });
  }

  return records.map((record) => {
    const displayDisambiguation = ordinalById.get(record.id);
    return displayDisambiguation ? { ...record, displayDisambiguation } : record;
  });
}

function specialSlateRecord(flatItem) {
  const ko = exactKoreanSource(flatItem, { detailRequired: true });
  const templateId = SPECIAL_SLATE_TEMPLATE_BY_SOURCE_URL.get(ko.sourceUrl) ?? null;
  const mapped = Boolean(templateId);
  return {
    id: flatItem.id,
    flatItemId: flatItem.id,
    activeSeason: "SS13",
    sourceStatus: mapped
      ? "exact-current-special-slate-with-template"
      : "exact-current-special-slate-source-only",
    sourceCategory: "slates",
    catalogSourceCategory: "gear",
    sourceKind: "divinity-slate",
    name: ko.name,
    text: ko.detail,
    sourceUrl: ko.sourceUrl,
    sourceRecordKey: ko.sourceRecordKey,
    sourceDataIds: [...(ko.sourceDataIds ?? [])],
    iconUrl: flatItem.iconUrl ?? flatItem.sourceIconUrl ?? "",
    templateId,
    selectionSupported: mapped,
    placementSupported: mapped,
    calculationSupported: mapped,
    displayOnly: !mapped,
    ...(mapped ? {} : { unsupportedReason: SPECIAL_DIVINITY_SLATE_SOURCE_ONLY_REASON }),
  };
}

export function createActiveDivinityModel({
  currentFlatItems,
  divinityStructuralItems,
  hadesStructuralItems,
  currentSpecialSlateItems,
  currentHadesData = TLIDB_NETHER_KING_TALENTS_SS13,
} = {}) {
  const flatItems = Array.isArray(currentFlatItems) ? currentFlatItems : [];
  const specialSlateItems = Array.isArray(currentSpecialSlateItems) ? currentSpecialSlateItems : [];
  const structuralEntries = [
    ...(Array.isArray(divinityStructuralItems) ? divinityStructuralItems : [])
      .map((record) => ({ record, sourceKind: "divinity" })),
    ...(Array.isArray(hadesStructuralItems) ? hadesStructuralItems : [])
      .map((record) => ({ record, sourceKind: "hades" })),
  ];
  requireCount("SS13 current slate flat items", flatItems.length, EXPECTED_COUNTS.currentFlatItems);
  requireCount("91TOB divinity structural items", structuralEntries.length, EXPECTED_COUNTS.structuralItems);
  requireCount(
    "SS13 current special slate items",
    specialSlateItems.length,
    EXPECTED_COUNTS.currentSpecialSlateItems,
  );

  const flatById = new Map();
  for (const item of flatItems) {
    if (!item?.id || flatById.has(item.id)) throw new Error(`Duplicate SS13 slate flat ID: ${item?.id}`);
    flatById.set(item.id, item);
  }

  const currentHadesRecords = Array.isArray(currentHadesData?.records)
    ? currentHadesData.records
    : [];
  requireCount(
    "SS13 current Nether King stable-ID items",
    currentHadesRecords.length,
    EXPECTED_COUNTS.mappedCurrentHadesItems,
  );
  const currentHadesByFlatId = new Map();
  for (const record of currentHadesRecords) {
    if (!record?.flatItemId || currentHadesByFlatId.has(record.flatItemId)) {
      throw new Error(`Invalid or duplicate current Nether King flat identity: ${record?.flatItemId}`);
    }
    const flatItem = flatById.get(record.flatItemId);
    if (!flatItem || !flatItem.tlidbText?.ko?.sourceDataIds?.includes(record.id)) {
      throw new Error(`Current Nether King stable ID is absent from SS13 flat data: ${record.id}`);
    }
    currentHadesByFlatId.set(record.flatItemId, record);
  }

  const structuralByFlatId = new Map();
  const removedStructuralItems = [];
  for (const entry of structuralEntries) {
    const flatItemId = structuralFlatId(entry.record, entry.sourceKind);
    if (!flatItemId || structuralByFlatId.has(flatItemId)) {
      throw new Error(`Invalid or duplicate 91TOB divinity structural identity: ${flatItemId}`);
    }
    if (flatById.has(flatItemId)) structuralByFlatId.set(flatItemId, entry);
    else {
      removedStructuralItems.push({
        structuralId: entry.record.id,
        expectedFlatItemId: flatItemId,
        structuralSourceKind: entry.sourceKind,
        status: "removed-from-current-ss13-flat",
      });
    }
  }

  const selectionCatalog = [];
  const sourceOnlyRecords = [];
  for (const flatItem of flatItems) {
    const currentHades = currentHadesByFlatId.get(flatItem.id);
    if (currentHades) {
      selectionCatalog.push(currentHadesRecord(flatItem, currentHades));
      continue;
    }
    const structural = structuralByFlatId.get(flatItem.id);
    if (structural) {
      selectionCatalog.push(mappedRecord(flatItem, structural.record, structural.sourceKind));
    } else {
      sourceOnlyRecords.push(sourceOnlyRecord(flatItem));
    }
  }

  const sourceOnlyCatalog = addSourceOnlyDisplayDisambiguation(sourceOnlyRecords);
  const specialSlateCatalog = specialSlateItems.map(specialSlateRecord);
  const mappedSpecialSlateCatalog = specialSlateCatalog.filter((item) => item.templateId);
  const sourceOnlySpecialSlateCatalog = specialSlateCatalog.filter((item) => !item.templateId);

  const sourceOnlyItemsWithoutSourceDetail = sourceOnlyCatalog.filter((item) => (
    item.sourceDetailStatus === "not-present"
  ));
  const sourceOnlyItemsWithMixedKoreanSource = sourceOnlyCatalog.filter((item) => (
    item.sourceDetailStatus === "source-language-mixed"
  ));
  requireCount(
    "SS13 mapped divinity structural items",
    selectionCatalog.length - currentHadesRecords.length,
    EXPECTED_COUNTS.mappedStructuralItems,
  );
  requireCount(
    "SS13 removed divinity structural items",
    removedStructuralItems.length,
    EXPECTED_COUNTS.removedStructuralItems,
  );

  const calculationSourceCatalog = flatItems.map((flatItem) => {
    const currentHades = currentHadesByFlatId.get(flatItem.id);
    return currentHades ? currentHadesAuthorityItem(flatItem, currentHades) : flatItem;
  });
  requireCount(
    "SS13 source-only divinity items",
    sourceOnlyCatalog.length,
    EXPECTED_COUNTS.sourceOnlyItems,
  );
  requireCount(
    "SS13 source-only divinity source rows without a detail field",
    sourceOnlyItemsWithoutSourceDetail.length,
    EXPECTED_COUNTS.sourceOnlyItemsWithoutSourceDetail,
  );
  requireCount(
    "SS13 source-only divinity items with mixed TLIDB KO source",
    sourceOnlyItemsWithMixedKoreanSource.length,
    EXPECTED_COUNTS.sourceOnlyItemsWithMixedKoreanSource,
  );
  requireCount(
    "SS13 mapped special slate templates",
    mappedSpecialSlateCatalog.length,
    EXPECTED_COUNTS.mappedSpecialSlateTemplates,
  );
  requireCount(
    "SS13 source-only special slate items",
    sourceOnlySpecialSlateCatalog.length,
    EXPECTED_COUNTS.sourceOnlySpecialSlateItems,
  );

  return deepFreeze({
    metadata: {
      complete: false,
      activeSeason: "SS13",
      valueAuthority: "CATALOG.slates",
      valueAuthorityOverlay: "TLIDB current SS13 Nether_King stable IDs",
      structuralReference: "91TOB SS13.2",
      counts: {
        ...EXPECTED_COUNTS,
        activeSelectionItems: selectionCatalog.length,
        activeHadesSelectionItems: selectionCatalog.filter((item) => (
          item.structuralSourceKind === "hades"
        )).length,
      },
      hadesCalculation: HADES_CALCULATION_AUDIT,
      unverifiedScope: [
        `${sourceOnlyCatalog.length} current SS13 slate items have no directly sourced placement or calculation structure`,
        `${sourceOnlyItemsWithoutSourceDetail.length} current SS13 slate source rows have no detail/effect field in any TLIDB locale`,
        `${sourceOnlyItemsWithMixedKoreanSource.length} current SS13 slate item has mixed-language TLIDB KO source text`,
        `${sourceOnlySpecialSlateCatalog.length} current SS13 special slate item has no verified placement or copy structure`,
      ],
    },
    selectionCatalog,
    hadesSelectionCatalog: selectionCatalog.filter((item) => item.structuralSourceKind === "hades"),
    sourceOnlyCatalog,
    specialSlateCatalog,
    mappedSpecialSlateCatalog,
    sourceOnlySpecialSlateCatalog,
    removedStructuralItems,
    calculationSourceCatalog,
  });
}

export const ACTIVE_DIVINITY_MODEL = createActiveDivinityModel({
  currentFlatItems: CATALOG.slates,
  divinityStructuralItems: RUNTIME_CATALOG.datasets.divinity_talent_catalog,
  hadesStructuralItems: RUNTIME_CATALOG.datasets.hades_divinity_catalog,
  currentSpecialSlateItems: getSpecialDivinitySlateItems(),
});
