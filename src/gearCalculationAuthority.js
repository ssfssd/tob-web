import { SS13_GEAR_CALCULATION_ALLOWLIST } from "./data/ss13GearCalculationAllowlist.generated.js";
import { TLIDB_GEAR_LOCALES_SS13_ACTIVE } from "./data/tlidbGearLocales.ss13.active.generated.js";
import { TLIDB_GEAR_NETWORK_RECEIPTS } from "./data/tlidbGearNetworkReceipts.generated.js";

const EXPECTED_GEAR_COUNT = 458;
const EXPECTED_PARTIAL_COUNT = 444;
const FIELD_SEPARATOR = "\u0000";

export const SS13_GEAR_CALCULATION_TARGETS = Object.freeze([
  "life",
  "mana",
  "strength",
  "dexterity",
  "intelligence",
  "fireResist",
  "coldResist",
  "lightningResist",
  "erosionResist",
]);

const TARGET_SET = new Set(SS13_GEAR_CALCULATION_TARGETS);

function fieldKey(affixId, tierId, rollKey) {
  return `${affixId}${FIELD_SEPARATOR}${tierId}${FIELD_SEPARATOR}${rollKey}`;
}

function legendaryFieldKey(itemId, slotId, variantName, rollKey) {
  return [itemId, slotId, variantName, rollKey].join(FIELD_SEPARATOR);
}

function blocker(code, scope, count = 1) {
  return Object.freeze({ code, scope, count });
}

function sameStructuredRoll(left, right) {
  return left.key === right.key
    && Number(left.min) === Number(right.min)
    && Number(left.max) === Number(right.max)
    && Number(left.precision ?? 0) === Number(right.precision ?? 0)
    && Number(left.step ?? 1) === Number(right.step ?? 1);
}

function collectRuntimeCraftFields(gear) {
  const fields = new Map();
  const fieldKeysByItemId = new Map();

  for (const item of gear) {
    const itemFieldKeys = new Set();
    for (const affix of item.craftAffixes ?? []) {
      for (const tier of affix.tierOptions ?? []) {
        for (const roll of tier.rollDefs ?? []) {
          const key = fieldKey(affix.affixId, tier.tierId, roll.key);
          itemFieldKeys.add(key);
          const candidate = {
            affix,
            tier,
            roll,
            itemIds: new Set([item.id]),
            conflict: false,
          };
          const prior = fields.get(key);
          if (!prior) {
            fields.set(key, candidate);
            continue;
          }
          prior.itemIds.add(item.id);
          if (
            prior.tier.activeLocaleAliases?.tier !== tier.activeLocaleAliases?.tier
            || prior.tier.activeLocaleAliases?.rolls?.[roll.key] !== tier.activeLocaleAliases?.rolls?.[roll.key]
            || !sameStructuredRoll(prior.roll, roll)
          ) {
            prior.conflict = true;
          }
        }
      }
    }
    fieldKeysByItemId.set(item.id, itemFieldKeys);
  }

  return { fields, fieldKeysByItemId };
}

function invalidField(field, code) {
  return Object.freeze({
    code,
    affixId: field.affixId,
    tierId: field.tierId,
    rollKey: field.rollKey,
    sourceRecordKey: field.sourceRecordKey,
  });
}

function validateAllowlistField({ field, runtime, registry, localeSource, networkReceipts }) {
  if (!TARGET_SET.has(field.targetKey) || field.operation !== "add") {
    return { error: invalidField(field, "target-operation-not-allowlisted") };
  }
  if (!runtime || runtime.conflict) {
    return { error: invalidField(field, runtime ? "runtime-structured-roll-conflict" : "runtime-structured-roll-missing") };
  }
  const sourceAlias = runtime.tier.activeLocaleAliases?.tier;
  const rollAlias = runtime.tier.activeLocaleAliases?.rolls?.[runtime.roll.key];
  if (sourceAlias !== field.sourceAlias || rollAlias !== field.rollAlias) {
    return { error: invalidField(field, "stable-alias-mismatch") };
  }
  const sourceRecordKey = registry.refs?.[sourceAlias];
  const rollRecordKey = registry.refs?.[rollAlias];
  const record = sourceRecordKey ? registry.records?.[sourceRecordKey] : undefined;
  if (
    sourceRecordKey !== field.sourceRecordKey
    || rollRecordKey !== field.sourceRecordKey
    || record?.status !== "exact"
    || String(record.sourceModifierId ?? "") !== field.sourceModifierId
  ) {
    return { error: invalidField(field, "stable-record-mismatch") };
  }
  if (
    runtime.roll.key !== field.rollKey
    || Number(runtime.roll.min) !== field.min
    || Number(runtime.roll.max) !== field.max
    || Number(runtime.roll.precision ?? 0) !== field.precision
    || Number(runtime.roll.step ?? 1) !== field.step
  ) {
    return { error: invalidField(field, "structured-roll-value-mismatch") };
  }
  const sourceRef = record.ko?.sourceRef;
  const sourceEvidence = sourceRef ? localeSource.sources?.[sourceRef] : undefined;
  if (
    sourceEvidence?.sourceMethod !== "tlidb-current-ss13-data-modifier-id"
    || sourceEvidence?.sourceFieldStatus?.text !== "exact"
    || sourceEvidence.sourceUrl !== field.receiptUrl
    || sourceEvidence.sourcePageSha256 !== field.receiptSha256
  ) {
    return { error: invalidField(field, "direct-source-evidence-mismatch") };
  }
  const receipt = networkReceipts.receipts?.[field.receiptUrl];
  if (receipt?.success !== true || receipt?.status !== 200) {
    return { error: invalidField(field, "direct-receipt-unavailable") };
  }
  if (receipt.contentSha256 !== field.receiptSha256) {
    return { error: invalidField(field, "direct-receipt-hash-mismatch") };
  }

  return {
    value: Object.freeze({
      sourceKind: field.sourceKind,
      affixId: field.affixId,
      tierId: field.tierId,
      rollKey: field.rollKey,
      sourceAlias: field.sourceAlias,
      rollAlias: field.rollAlias,
      sourceRecordKey: field.sourceRecordKey,
      sourceModifierId: field.sourceModifierId,
      targetKey: field.targetKey,
      operation: field.operation,
      unit: field.unit,
      min: field.min,
      max: field.max,
      precision: field.precision,
      step: field.step,
      receiptUrl: field.receiptUrl,
      receiptSha256: field.receiptSha256,
    }),
  };
}

function validateLegendaryAllowlistField({ field, item, networkReceipts }) {
  if (!TARGET_SET.has(field.targetKey) || field.operation !== "add") {
    return { error: invalidField(field, "target-operation-not-allowlisted") };
  }
  if (!item || item.id !== field.itemId) {
    return { error: invalidField(field, "legendary-item-identity-mismatch") };
  }
  const affix = (item.legendaryAffixes ?? []).find(({ slotId }) => slotId === field.slotId);
  const variant = affix?.[field.variantName];
  const roll = variant?.rollDefs?.find(({ key }) => key === field.rollKey);
  const authority = variant?.activeDirectSourceAuthority;
  if (
    !variant
    || !roll
    || authority?.status !== "exact-direct-current-tlidb-modifier-id"
    || authority.sourceRecordKey !== field.sourceRecordKey
    || authority.sourceModifierId !== field.sourceModifierId
    || authority.sourceUrl !== field.receiptUrl
    || authority.sourcePageSha256 !== field.receiptSha256
    || variant.sourceMethod !== "tlidb-data-modifier-id"
    || variant.sourceFieldStatus?.text !== "exact"
    || variant.sourceFieldStatus?.renderTemplate !== "exact"
    || variant.sourceFieldStatus?.rollFragments !== "exact-mechanical-from-source-row"
  ) {
    return { error: invalidField(field, "legendary-stable-record-mismatch") };
  }
  if (
    Number(roll.min) !== field.min
    || Number(roll.max) !== field.max
    || Number(roll.precision ?? 0) !== field.precision
    || Number(roll.step ?? 1) !== field.step
  ) {
    return { error: invalidField(field, "legendary-structured-roll-value-mismatch") };
  }
  const receipt = item.sourceEvidence?.ss13Gear?.localeReceipts?.ko;
  const locale = item.tlidbText?.ko;
  if (
    receipt?.sourceUrl !== field.receiptUrl
    || receipt?.sourcePageSha256 !== field.receiptSha256
    || receipt?.sourcePageVersion !== "SS13"
    || receipt?.sourceSeasonEvidence?.actualSeason !== 13
    || receipt?.sourceSeasonEvidence?.verificationComplete !== true
    || locale?.sourceUrl !== receipt.sourceUrl
    || locale?.sourcePageSha256 !== receipt.sourcePageSha256
    || locale?.sourcePageVersion !== "SS13"
  ) {
    return { error: invalidField(field, "legendary-direct-source-evidence-mismatch") };
  }
  const latestReceipt = networkReceipts.receipts?.[field.receiptUrl];
  if (latestReceipt && (
    latestReceipt.success !== true
    || latestReceipt.status !== 200
    || latestReceipt.contentSha256 !== field.receiptSha256
  )) {
    return { error: invalidField(field, "legendary-direct-receipt-hash-mismatch") };
  }
  return {
    value: Object.freeze({
      sourceKind: field.sourceKind,
      itemId: field.itemId,
      slotId: field.slotId,
      variantName: field.variantName,
      rollKey: field.rollKey,
      sourceRecordKey: field.sourceRecordKey,
      sourceModifierId: field.sourceModifierId,
      targetKey: field.targetKey,
      operation: field.operation,
      unit: field.unit,
      min: field.min,
      max: field.max,
      precision: field.precision,
      step: field.step,
      receiptUrl: field.receiptUrl,
      receiptSha256: field.receiptSha256,
    }),
  };
}

function sourceIdentity(item) {
  const stableKeys = [
    item.tlidbStableKey,
    ...(item.tlidbStableKeys ?? []),
    item.baseEvidence?.stableKey,
    item.baseEvidence?.sourceStableKey,
  ].filter((value) => typeof value === "string" && value);
  return Object.freeze({
    status: stableKeys.length ? "available" : "unavailable",
    stableKeys: Object.freeze([...new Set(stableKeys)]),
  });
}

function variantHasCurrentReceipt(item, variant, networkReceipts) {
  const direct = variant.activeDirectSourceAuthority;
  const flatReceipt = item.sourceEvidence?.ss13Gear?.localeReceipts?.ko;
  if (
    direct?.status === "exact-direct-current-tlidb-modifier-id"
    && direct.sourceUrl === variant.sourceUrl
    && direct.sourcePageSha256 === variant.sourcePageSha256
    && flatReceipt?.sourceUrl === variant.sourceUrl
    && flatReceipt?.sourcePageSha256 === variant.sourcePageSha256
    && flatReceipt?.sourcePageVersion === "SS13"
    && flatReceipt?.sourceSeasonEvidence?.actualSeason === 13
    && flatReceipt?.sourceSeasonEvidence?.verificationComplete === true
  ) return true;
  const receipt = networkReceipts.receipts?.[variant.sourceUrl];
  return receipt?.success === true
    && receipt?.status === 200
    && receipt.contentSha256 === variant.sourcePageSha256;
}

function legendaryBlockers(item, networkReceipts, supportedLegendaryFields) {
  const variants = (item.legendaryAffixes ?? []).flatMap((affix) => (
    ["normal", "corroded"].flatMap((variantName) => (
      affix[variantName] ? [{ ...affix[variantName], slotId: affix.slotId, variantName }] : []
    ))
  ));
  if (!variants.length) return [];

  const authorizedVariants = new Set(supportedLegendaryFields.map(({ slotId, variantName }) => (
    `${slotId}${FIELD_SEPARATOR}${variantName}`
  )));
  const unverifiedVariants = variants.filter(({ slotId, variantName }) => (
    !authorizedVariants.has(`${slotId}${FIELD_SEPARATOR}${variantName}`)
  ));
  const numericVariants = variants.filter((variant) => (variant.rollDefs ?? []).length > 0);
  const receiptMismatches = numericVariants.filter((variant) => (
    !variantHasCurrentReceipt(item, variant, networkReceipts)
  )).length;
  return [
    ...(unverifiedVariants.length
      ? [blocker("legendary-calculation-unverified", "legendary", unverifiedVariants.length)]
      : []),
    ...(receiptMismatches
      ? [blocker("legendary-structured-value-receipt-mismatch", "legendary", receiptMismatches)]
      : []),
  ];
}

function createItemAudit({
  item,
  validFields,
  validLegendaryFields,
  itemRuntimeFieldKeys,
  networkReceipts,
}) {
  const supportedFields = Object.freeze(
    [...itemRuntimeFieldKeys]
      .map((key) => validFields.get(key))
      .filter(Boolean),
  );
  const supportedLegendaryFields = Object.freeze([...(validLegendaryFields.get(item.id) ?? [])]);
  const supportedFieldCount = supportedFields.length + supportedLegendaryFields.length;
  const structuredCraftRolls = itemRuntimeFieldKeys.size;
  const unsupportedCraftRolls = Math.max(0, structuredCraftRolls - supportedFields.length);
  const coverage = item.craftRuntimeCoverage;
  const identity = sourceIdentity(item);
  const blockers = [
    blocker("base-stat-structured-authority-unavailable", "base-stats"),
    ...(identity.status === "unavailable"
      ? [blocker("stable-item-identity-unavailable", "identity")]
      : []),
    ...(!coverage
      ? [blocker("craft-runtime-structure-unavailable", "craft")]
      : [
          ...(coverage.omitted?.affixes > 0
            ? [blocker("craft-affix-coverage-incomplete", "craft-affix", coverage.omitted.affixes)]
            : []),
          ...(coverage.omitted?.tiers > 0
            ? [blocker("craft-tier-coverage-incomplete", "craft-tier", coverage.omitted.tiers)]
            : []),
          ...(coverage.omitted?.rolls > 0
            ? [blocker("craft-roll-coverage-incomplete", "craft-roll", coverage.omitted.rolls)]
            : []),
        ]),
    ...(unsupportedCraftRolls
      ? [blocker("craft-effect-semantics-unallowlisted", "craft-roll", unsupportedCraftRolls)]
      : []),
    ...legendaryBlockers(item, networkReceipts, supportedLegendaryFields),
    ...(supportedFieldCount === 0
      ? [blocker("no-authorized-calculation-field", "calculation")]
      : []),
  ];

  return Object.freeze({
    itemId: item.id,
    sourceIdentity: identity,
    supportLevel: supportedFieldCount ? "partial" : "unsupported",
    supportedFields,
    supportedLegendaryFields,
    blockers: Object.freeze(blockers),
    structuredFieldCounts: Object.freeze({
      craftRolls: structuredCraftRolls,
      authorizedCraftRolls: supportedFields.length,
      unauthorizedCraftRolls: unsupportedCraftRolls,
      authorizedLegendaryRolls: supportedLegendaryFields.length,
      legendaryVariants: (item.legendaryAffixes ?? []).reduce(
        (count, affix) => count + Number(Boolean(affix.normal)) + Number(Boolean(affix.corroded)),
        0,
      ),
      baseStats: 0,
    }),
  });
}

export function createCurrentSs13GearCalculationAuthority({
  gear,
  registry,
  localeSource = TLIDB_GEAR_LOCALES_SS13_ACTIVE,
  networkReceipts = TLIDB_GEAR_NETWORK_RECEIPTS,
  allowlist = SS13_GEAR_CALCULATION_ALLOWLIST,
} = {}) {
  if (!Array.isArray(gear) || gear.length !== EXPECTED_GEAR_COUNT) {
    throw new Error(`current SS13 gear calculation audit requires ${EXPECTED_GEAR_COUNT} items`);
  }
  if (registry?.metadata?.targetSeason !== 13 || localeSource?.metadata?.targetSeason !== 13) {
    throw new Error("current SS13 gear calculation audit requires current TLIDB SS13 locale authority");
  }
  if (
    allowlist?.schemaVersion !== 1
    || allowlist.metadata?.season !== "SS13"
    || allowlist.metadata?.catalogItems !== EXPECTED_GEAR_COUNT
    || allowlist.metadata?.authorizedCraftFields !== (allowlist.fields ?? []).length
    || allowlist.metadata?.authorizedLegendaryFields !== (allowlist.legendaryFields ?? []).length
  ) {
    throw new Error("current SS13 gear calculation allowlist metadata mismatch");
  }

  const runtime = collectRuntimeCraftFields(gear);
  const itemById = new Map(gear.map((item) => [item.id, item]));
  const validFields = new Map();
  const validLegendaryFieldsByKey = new Map();
  const validLegendaryFieldsByItem = new Map();
  const invalidAllowlistFields = [];
  for (const field of allowlist.fields ?? []) {
    const key = fieldKey(field.affixId, field.tierId, field.rollKey);
    const validated = validateAllowlistField({
      field,
      runtime: runtime.fields.get(key),
      registry,
      localeSource,
      networkReceipts,
    });
    if (validated.error) invalidAllowlistFields.push(validated.error);
    else validFields.set(key, validated.value);
  }
  for (const field of allowlist.legendaryFields ?? []) {
    const key = legendaryFieldKey(field.itemId, field.slotId, field.variantName, field.rollKey);
    if (validLegendaryFieldsByKey.has(key)) {
      invalidAllowlistFields.push(invalidField(field, "legendary-stable-field-conflict"));
      continue;
    }
    const validated = validateLegendaryAllowlistField({
      field,
      item: itemById.get(field.itemId),
      networkReceipts,
    });
    if (validated.error) {
      invalidAllowlistFields.push(validated.error);
      continue;
    }
    validLegendaryFieldsByKey.set(key, validated.value);
    const itemFields = validLegendaryFieldsByItem.get(field.itemId) ?? [];
    itemFields.push(validated.value);
    validLegendaryFieldsByItem.set(field.itemId, itemFields);
  }

  const items = Object.freeze(gear.map((item) => createItemAudit({
    item,
    validFields,
    validLegendaryFields: validLegendaryFieldsByItem,
    itemRuntimeFieldKeys: runtime.fieldKeysByItemId.get(item.id) ?? new Set(),
    networkReceipts,
  })));
  const summary = Object.freeze({
    total: items.length,
    complete: items.filter(({ supportLevel }) => supportLevel === "complete").length,
    partial: items.filter(({ supportLevel }) => supportLevel === "partial").length,
    unsupported: items.filter(({ supportLevel }) => supportLevel === "unsupported").length,
    authorizedFields: validFields.size + validLegendaryFieldsByKey.size,
    authorizedCraftFields: validFields.size,
    authorizedLegendaryFields: validLegendaryFieldsByKey.size,
    authorizedTargets: Object.freeze([...new Set(
      [
        ...validFields.values(),
        ...validLegendaryFieldsByKey.values(),
      ].map(({ targetKey }) => targetKey),
    )].sort()),
  });
  if (
    invalidAllowlistFields.length === 0
    && (summary.complete !== 0 || summary.partial !== EXPECTED_PARTIAL_COUNT)
  ) {
    throw new Error("current SS13 gear calculation audit classification mismatch");
  }
  const itemFieldKeys = new Map(items.map((itemAudit) => [
    itemAudit.itemId,
    new Set(itemAudit.supportedFields.map((field) => fieldKey(field.affixId, field.tierId, field.rollKey))),
  ]));
  const itemLegendaryFieldCounts = new Map(items.map((itemAudit) => [
    itemAudit.itemId,
    itemAudit.supportedLegendaryFields.length,
  ]));

  return Object.freeze({
    audit: Object.freeze({
      season: "SS13",
      sourceAuthority: "tlidb-current-ss13-direct-receipt-stable-id-structured-roll",
      complete: false,
      summary,
      invalidAllowlistFields: Object.freeze(invalidAllowlistFields),
      items,
    }),
    networkReceipts,
    getCraftField(affixId, tierId, rollKey) {
      return validFields.get(fieldKey(affixId, tierId, rollKey)) ?? null;
    },
    itemHasSupportedFields(itemId) {
      return (itemFieldKeys.get(itemId)?.size ?? 0) > 0
        || (itemLegendaryFieldCounts.get(itemId) ?? 0) > 0;
    },
    getSelectedCraftContributions(item, selectedCrafts = {}) {
      const allowedForItem = itemFieldKeys.get(item.id) ?? new Set();
      const contributions = [];
      for (const affix of item.craftAffixes ?? []) {
        const selected = selectedCrafts[affix.affixId];
        if (!selected) continue;
        const tier = affix.tierOptions?.find(({ tierId }) => tierId === selected.tierId);
        if (!tier) continue;
        for (const roll of tier.rollDefs ?? []) {
          const key = fieldKey(affix.affixId, tier.tierId, roll.key);
          if (!allowedForItem.has(key)) continue;
          const field = validFields.get(key);
          if (!field) continue;
          const requested = Number(selected.rolls?.[roll.key] ?? field.max);
          const value = Number.isFinite(requested)
            ? Math.max(field.min, Math.min(field.max, requested))
            : field.max;
          contributions.push({
            affixId: field.affixId,
            tierId: field.tierId,
            rollKey: field.rollKey,
            stat: field.targetKey,
            value,
            authority: field,
          });
        }
      }
      return contributions;
    },
    getAuthorizedLegendaryRolls(item, legendaryDraft, legacyCorroded = false) {
      const hasExplicitDraft = legendaryDraft
        && typeof legendaryDraft === "object"
        && Array.isArray(legendaryDraft.corrodedSlotIds);
      const corrodedSlotIds = new Set(hasExplicitDraft ? legendaryDraft.corrodedSlotIds : []);
      const rolls = [];
      for (const affix of item?.legendaryAffixes ?? []) {
        const variantName = corrodedSlotIds.has(affix.slotId)
          || (!hasExplicitDraft && legacyCorroded === true)
          ? "corroded"
          : "normal";
        const variant = affix[variantName];
        if (!variant) continue;
        for (const roll of variant.rollDefs ?? []) {
          const field = validLegendaryFieldsByKey.get(legendaryFieldKey(
            item.id,
            affix.slotId,
            variantName,
            roll.key,
          ));
          if (!field) continue;
          rolls.push(Object.freeze({
            id: `legendary:${affix.slotId}:${variantName}:${roll.key}`,
            stat: field.targetKey,
            min: field.min,
            max: field.max,
            defaultValue: field.max,
            isPercent: field.unit === "percentage-point",
            authority: field,
          }));
        }
      }
      return Object.freeze(rolls);
    },
  });
}
