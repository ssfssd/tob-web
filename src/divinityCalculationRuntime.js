import { ACTIVE_DIVINITY_MODEL } from "./activeDivinityData.js";
import { CATALOG } from "./catalog.js";
import { projectDivinitySlateOverview } from "./divinitySlateModel.js";

export const DIVINITY_CALCULATION_REFERENCE = Object.freeze({
  appVersion: "Beta 1.1.0",
  activeSeason: "SS13",
  sourceRole: "current-value-with-structural-reference",
  structuralReferenceVersion: "SS13.2",
  valueAuthority: true,
  valueAuthoritySource: "CATALOG.slates",
  mappedFlatItemCount: ACTIVE_DIVINITY_MODEL.metadata.counts.activeSelectionItems,
  sourceOnlyFlatItemCount: ACTIVE_DIVINITY_MODEL.metadata.counts.sourceOnlyItems,
  bundleUrl: "https://91tob.com/assets/App-BfJTsflU.js",
  localModelPath: "divinitySlateModel.projectDivinitySlateOverview",
  affixOrder: Object.freeze(["talent", "special_effect", "copied"]),
  capPolicy: "first-effective-affix-in-source-order",
});

export const DIVINITY_CALCULATION_CATALOG = Object.freeze([
  ...ACTIVE_DIVINITY_MODEL.selectionCatalog,
]);

const CURRENT_SLATE_BY_ID = new Map(CATALOG.slates.map((item) => [item.id, item]));

function currentSourceReceipt(sourceItemId) {
  const ko = CURRENT_SLATE_BY_ID.get(sourceItemId)?.tlidbText?.ko;
  const sourcePageVersion = ko?.sourceSeasonEvidence?.sourcePageVersion ?? ko?.sourcePageVersion;
  if (
    typeof ko?.sourceUrl !== "string"
    || typeof ko?.sourceRecordKey !== "string"
    || typeof ko?.sourcePageSha256 !== "string"
    || typeof sourcePageVersion !== "string"
  ) return null;

  return Object.freeze({
    sourceUrl: ko.sourceUrl,
    sourceMethod: ko.sourceMethod ?? "",
    sourceRecordKey: ko.sourceRecordKey,
    sourcePageSha256: ko.sourcePageSha256,
    sourcePageVersion,
    sourceCheckedAt: ko.sourceCheckedAt ?? "",
  });
}

function sourceProvenance(sourceItemId, source = {}) {
  const flatKo = CURRENT_SLATE_BY_ID.get(sourceItemId)?.tlidbText?.ko;
  const receipt = source.receipt ?? currentSourceReceipt(sourceItemId);
  return {
    sourceUrl: source.sourceUrl ?? flatKo?.sourceUrl ?? "",
    sourceRecordKey: source.sourceRecordKey ?? flatKo?.sourceRecordKey ?? "",
    ...(receipt ? { receipt } : {}),
  };
}

const DIVINITY_EFFECT_CAP_SUFFIX = /(?:（神格生效上限：\d+）|\(신격 유효 한도:\s*\d+\))$/u;
const VALUE_FIRST_DIRECT_STAT = /^([+-]\d+(?:\.\d+)?)\s*(%)?\s*(\S(?:.*\S)?)$/u;
const LABEL_FIRST_DIRECT_STAT = /^(\S(?:.*\S)?)\s*([+-]\d+(?:\.\d+)?)\s*(%)?$/u;

const DIRECT_STAT_KEYS = new Map([
  ["damage", "damage"],
  ["dps", "damage"],
  ["피해", "damage"],
  ["대미지", "damage"],
  ["伤害", "damage"],
  ["attackspeed", "speed"],
  ["castspeed", "speed"],
  ["speed", "speed"],
  ["공격속도", "speed"],
  ["시전속도", "speed"],
  ["攻速", "speed"],
  ["攻击速度", "speed"],
  ["crit", "crit"],
  ["치명", "crit"],
  ["크리티컬", "crit"],
  ["暴击", "crit"],
  ["暴击值", "crit"],
  ["life", "life"],
  ["hp", "life"],
  ["최대hp", "life"],
  ["생명", "life"],
  ["生命", "life"],
  ["最大生命", "life"],
  ["mana", "mana"],
  ["mp", "mana"],
  ["최대mp", "mana"],
  ["마나", "mana"],
  ["魔力", "mana"],
  ["魔法", "mana"],
  ["最大魔力", "mana"],
  ["shield", "shield"],
  ["보호막", "shield"],
  ["护盾", "shield"],
  ["最大护盾", "shield"],
  ["strength", "strength"],
  ["힘", "strength"],
  ["力量", "strength"],
  ["dexterity", "dexterity"],
  ["민첩", "dexterity"],
  ["敏捷", "dexterity"],
  ["intelligence", "intelligence"],
  ["지혜", "intelligence"],
  ["智慧", "intelligence"],
  ["fireresist", "fireResist"],
  ["fireresistance", "fireResist"],
  ["화염저항", "fireResist"],
  ["火焰抗性", "fireResist"],
  ["coldresist", "coldResist"],
  ["coldresistance", "coldResist"],
  ["냉기저항", "coldResist"],
  ["冰冷抗性", "coldResist"],
  ["lightningresist", "lightningResist"],
  ["lightningresistance", "lightningResist"],
  ["번개저항", "lightningResist"],
  ["闪电抗性", "lightningResist"],
  ["erosionresist", "erosionResist"],
  ["erosionresistance", "erosionResist"],
  ["부식저항", "erosionResist"],
  ["腐蚀抗性", "erosionResist"],
  ["energy", "energy"],
  ["에너지", "energy"],
  ["能量", "energy"],
  ["最大能量值", "energy"],
  ["liferegain", "lifeRegainPercent"],
  ["hp반환", "lifeRegainPercent"],
  ["shieldregain", "shieldRegainPercent"],
  ["energyshieldregain", "shieldRegainPercent"],
  ["보호막반환", "shieldRegainPercent"],
]);

const PERCENT_VALUE_STATS = new Set([
  "damage",
  "speed",
  "crit",
  "fireResist",
  "coldResist",
  "lightningResist",
  "erosionResist",
  "lifeRegainPercent",
  "shieldRegainPercent",
]);

function compactText(value) {
  return String(value ?? "").trim().replace(/ /gu, "").replace(/　/gu, "");
}

function entryKeyPart(value) {
  return String(value ?? "unknown").trim().replace(/\s+/gu, "-");
}

function normalizedStatLabel(value) {
  return String(value ?? "").toLocaleLowerCase("en-US").replace(/\s+/gu, "");
}

export function parseDivinityCalculationText(text) {
  const parserText = String(text ?? "").replace(DIVINITY_EFFECT_CAP_SUFFIX, "").trim();
  const valueFirst = parserText.match(VALUE_FIRST_DIRECT_STAT);
  const labelFirst = parserText.match(LABEL_FIRST_DIRECT_STAT);
  if (!valueFirst && !labelFirst) {
    return { modelingStatus: "unsupported-text", parserText: "", stats: {} };
  }

  const value = Number(valueFirst?.[1] ?? labelFirst?.[2]);
  const percent = Boolean(valueFirst?.[2] ?? labelFirst?.[3]);
  const label = valueFirst?.[3] ?? labelFirst?.[1];
  const stat = DIRECT_STAT_KEYS.get(normalizedStatLabel(label));
  if (!Number.isFinite(value) || !stat) {
    return { modelingStatus: "unsupported-text", parserText: "", stats: {} };
  }
  if (percent && !PERCENT_VALUE_STATS.has(stat)) {
    return { modelingStatus: "unsupported-percent-stat", parserText: "", stats: {} };
  }
  const statKey = stat === "damage" ? (percent ? "moreDps" : "dps") : stat;
  return {
    modelingStatus: "candidate",
    parserText,
    stats: { [statKey]: value },
  };
}

function activeEditableBoard(divinity) {
  if (!Array.isArray(divinity?.boards) || typeof divinity?.activeBoardId !== "string") return null;
  const board = divinity.boards.find(({ boardId }) => boardId === divinity.activeBoardId);
  return Array.isArray(board?.slateInventory) ? board : null;
}

function catalogById(catalog) {
  const records = new Map();
  for (const record of Array.isArray(catalog) ? catalog : []) {
    if (record?.id) records.set(record.id, record);
    if (record?.legacyRuntimeId) records.set(record.legacyRuntimeId, record);
  }
  return records;
}

function selectionId(selection) {
  return selection?.valueId ?? selection?.id ?? "";
}

function affixSourceText(affix) {
  return typeof affix?.calculationText === "string"
    ? affix.calculationText
    : typeof affix?.text === "string"
    ? affix.text
    : typeof affix?.rawText === "string"
      ? affix.rawText
      : "";
}

function affixOrigin(affix) {
  if (affix.affixKind === "copied") return "divinity_copied_affix";
  if (affix.affixKind === "special_effect") return "divinity_special_effect";
  return "divinity_talent_affix";
}

function isCurrentHadesSemanticSelection(sourceItemId) {
  return /^slates-tlidb-data-id-9\d{7}$/u.test(String(sourceItemId ?? ""));
}

function affixMetadata(boardId, affix, origin) {
  return {
    divinity_board_id: boardId,
    divinity_instance_id: affix.instanceId ?? null,
    divinity_slot_key: affix.slotKey ?? null,
    divinity_affix_kind: affix.affixKind ?? null,
    divinity_entry_origin: origin,
    divinity_value_type: affix.valueType ?? null,
    ...(affix.sourceInstanceId ? { divinity_source_instance_id: affix.sourceInstanceId } : {}),
    ...(affix.sourceSlotKey ? { divinity_source_slot_key: affix.sourceSlotKey } : {}),
    ...(Number.isInteger(affix.effectLimit) ? { divinity_effect_limit: affix.effectLimit } : {}),
    ...(affix.effectLimitKey ? { divinity_effect_limit_key: affix.effectLimitKey } : {}),
    ...(Number.isFinite(Number(affix.effectMultiplier)) ? {
      divinity_effect_multiplier: Number(affix.effectMultiplier),
    } : {}),
    ...(affix.effectMultiplierSource ? {
      divinity_effect_multiplier_source: affix.effectMultiplierSource,
    } : {}),
  };
}

function projectEffectiveAffix(boardId, affix, affixIndex) {
  const sourceText = affixSourceText(affix);
  const rawLines = sourceText.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (!rawLines.length) rawLines.push("");
  const structural = affix.affixKind === "special_effect"
    || affix.valueType === "special_effect"
    || affix.valueType === "copy_slot";
  const origin = affixOrigin(affix);
  const sourceItemId = selectionId(affix) || null;
  const provenance = sourceProvenance(sourceItemId, affix);
  const configuredMultiplier = Number(affix.effectMultiplier ?? affix.multiplier ?? 1);
  const multiplier = Number.isFinite(configuredMultiplier) && configuredMultiplier >= 0
    ? configuredMultiplier
    : 1;

  return rawLines.map((rawText, lineIndex) => {
    const parsed = structural
      ? { modelingStatus: "unsupported-structural-effect", parserText: "", stats: {} }
      : isCurrentHadesSemanticSelection(sourceItemId)
        ? { modelingStatus: "hades-semantic-runtime", parserText: "", stats: {} }
      : parseDivinityCalculationText(rawText);
    const metadata = affixMetadata(boardId, affix, origin);
    return {
      id: `divinity:board:${entryKeyPart(boardId)}:${origin}:${entryKeyPart(affix.instanceId)}:${entryKeyPart(affix.slotKey)}:${entryKeyPart(sourceItemId)}:${lineIndex}:${affixIndex}`,
      boardId,
      instanceId: affix.instanceId ?? null,
      slotKey: affix.slotKey ?? null,
      affixKind: affix.affixKind ?? null,
      origin,
      sourceItemId,
      ...provenance,
      sourceLabel: affix.name || rawText || sourceItemId || origin,
      rawText,
      parserText: parsed.parserText,
      multiplier,
      scaledText: rawText,
      modelingStatus: parsed.modelingStatus,
      stats: Object.fromEntries(
        Object.entries(parsed.stats).map(([stat, value]) => [stat, value * multiplier]),
      ),
      metadata,
      requestEntry: {
        raw_text: compactText(rawText),
        parser_text: compactText(parsed.parserText),
        metadata,
      },
    };
  });
}

function unsupportedAffixRule(boardId, affix, index) {
  const origin = "divinity_effect_cap";
  const inactiveReason = affix.reason || "divinity_effect_cap_reached";
  const sourceItemId = selectionId(affix) || null;
  return {
    id: `divinity:board:${entryKeyPart(boardId)}:${origin}:${entryKeyPart(affix.instanceId)}:${entryKeyPart(affix.slotKey)}:${entryKeyPart(sourceItemId)}:${index}`,
    categoryId: "slates",
    origin,
    status: "suppressed-cap",
    boardId,
    instanceId: affix.instanceId ?? null,
    slotKey: affix.slotKey ?? null,
    sourceItemId,
    ...sourceProvenance(sourceItemId, affix),
    sourceLabel: affix.name || sourceItemId || origin,
    rawText: affixSourceText(affix),
    applied: false,
    inactiveReason,
  };
}

function unplacedSlateRules(boardId, instance, talentById, index) {
  const selections = Object.entries(instance.slotSelectionsByKey ?? {});
  const rows = selections.length ? selections : [["slate", null]];
  return rows.map(([slotKey, stored], selectionIndex) => {
    const sourceItemId = selectionId(stored) || null;
    const record = talentById.get(sourceItemId);
    const origin = "divinity_unplaced_slate";
    return {
      id: `divinity:board:${entryKeyPart(boardId)}:${origin}:${entryKeyPart(instance.instanceId)}:${entryKeyPart(slotKey)}:${entryKeyPart(sourceItemId ?? instance.slateId)}:${index}:${selectionIndex}`,
      categoryId: "slates",
      origin,
      status: "unplaced-slate",
      boardId,
      instanceId: instance.instanceId,
      slotKey,
      sourceItemId,
      ...sourceProvenance(sourceItemId, record),
      sourceLabel: record?.name ?? sourceItemId ?? instance.slateId,
      rawText: record?.text ?? "",
      slateId: instance.slateId,
      applied: false,
      inactiveReason: "divinity_slate_unplaced",
    };
  });
}

function currentSourceUnsupportedRules(boardId, board, talentById, sourceOnlyById) {
  const placedInstanceIds = new Set(
    (board.cells ?? []).map((cell) => cell?.slateInstanceId).filter(Boolean),
  );
  return board.slateInventory
    .filter((instance) => placedInstanceIds.has(instance.instanceId))
    .flatMap((instance, instanceIndex) => (
      Object.entries(instance.slotSelectionsByKey ?? {}).flatMap(([slotKey, stored], selectionIndex) => {
        const sourceItemId = selectionId(stored);
        if (
          !sourceItemId
          || stored?.valueType === "special_effect"
          || stored?.valueType === "copy_slot"
          || talentById.has(sourceItemId)
        ) return [];

        const sourceOnly = sourceOnlyById.get(sourceItemId);
        const origin = sourceOnly
          ? "divinity_current_source_only"
          : "divinity_removed_current_source";
        const status = sourceOnly ? "source-only-display" : "removed-from-current-ss13";
        const inactiveReason = sourceOnly
          ? "divinity_source_only_display_only"
          : "divinity_item_removed_in_ss13";
        return [{
          id: `divinity:board:${entryKeyPart(boardId)}:${origin}:${entryKeyPart(instance.instanceId)}:${entryKeyPart(slotKey)}:${entryKeyPart(sourceItemId)}:${instanceIndex}:${selectionIndex}`,
          categoryId: "slates",
          origin,
          status,
          boardId,
          instanceId: instance.instanceId,
          slotKey,
          sourceItemId,
          ...sourceProvenance(sourceItemId, sourceOnly),
          sourceLabel: sourceOnly?.name ?? sourceItemId,
          rawText: sourceOnly?.text ?? "",
          applied: false,
          inactiveReason,
        }];
      })
    ));
}

function contributorFromEntry(entry) {
  const applied = entry.modelingStatus === "candidate";
  return {
    id: entry.id,
    label: entry.sourceLabel,
    categoryId: "slates",
    evidence: applied ? "structured" : "unsupported",
    applied,
    ...sourceProvenance(entry.sourceItemId, entry),
    ...(applied ? {} : { inactiveReason: entry.modelingStatus }),
  };
}

function contributorFromRule(rule) {
  return {
    id: rule.id,
    label: rule.sourceLabel || rule.origin,
    categoryId: "slates",
    evidence: "unsupported",
    applied: false,
    ...sourceProvenance(rule.sourceItemId, rule),
    inactiveReason: rule.inactiveReason || rule.status,
  };
}

function emptyOverview() {
  return {
    effectivePlacedSlateIds: [],
    suppressedPlacedSlates: [],
    effectiveAffixes: [],
    suppressedAffixes: [],
  };
}

export function projectDivinityCalculation(
  divinity,
  {
    talentCatalog = DIVINITY_CALCULATION_CATALOG,
    sourceOnlyCatalog = ACTIVE_DIVINITY_MODEL.sourceOnlyCatalog,
  } = {},
) {
  const board = activeEditableBoard(divinity);
  if (!board) {
    return {
      reference: DIVINITY_CALCULATION_REFERENCE,
      active: false,
      activeBoardId: null,
      overview: emptyOverview(),
      entries: [],
      rules: [],
      contributors: [],
    };
  }

  const overview = projectDivinitySlateOverview(board, { talentCatalog });
  const entries = overview.effectiveAffixes.flatMap((affix, index) => (
    projectEffectiveAffix(board.boardId, affix, index)
  ));
  const placedIds = new Set([
    ...overview.effectivePlacedSlateIds,
    ...overview.suppressedPlacedSlates.map((slate) => (
      typeof slate === "string" ? slate : slate?.instanceId
    )).filter(Boolean),
  ]);
  const talentById = catalogById(talentCatalog);
  const sourceOnlyById = catalogById(sourceOnlyCatalog);
  const rules = [
    ...overview.suppressedAffixes.map((affix, index) => (
      unsupportedAffixRule(board.boardId, affix, index)
    )),
    ...currentSourceUnsupportedRules(board.boardId, board, talentById, sourceOnlyById),
    ...board.slateInventory
      .filter((instance) => !placedIds.has(instance.instanceId))
      .flatMap((instance, index) => (
        unplacedSlateRules(board.boardId, instance, talentById, index)
      )),
  ];
  return {
    reference: DIVINITY_CALCULATION_REFERENCE,
    active: board.slateInventory.length > 0,
    activeBoardId: board.boardId,
    overview,
    entries,
    rules,
    contributors: [
      ...entries.map(contributorFromEntry),
      ...rules.map(contributorFromRule),
    ],
  };
}
