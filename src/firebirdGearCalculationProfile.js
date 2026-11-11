import { REGULAR_BARRIER_BURST_UNSUPPORTED_REASON } from "./barrierBurstMechanics.js";
import { TLIDB_GEAR_LOCALES_SS13_ACTIVE } from "./data/tlidbGearLocales.ss13.active.generated.js";
import { TLIDB_GEAR_NETWORK_RECEIPTS } from "./data/tlidbGearNetworkReceipts.generated.js";

export const FIREBIRD_CURRENT_SS13_ITEM_ID = "gear-tlidb-com-cn-necklace-of-firebird";
export const FIREBIRD_CURRENT_SS13_STABLE_ITEM_KEY = "ItemGold/113215";
export const FIREBIRD_CURRENT_SS13_SOURCE_URL = "https://tlidb.com/ko/Necklace_of_Firebird";
export const FIREBIRD_CURRENT_SS13_RECEIPT_SHA256 =
  "d7f9e9d32844232b10be0b3d754c35d26c288061a09aa9d0d402d8021bc5ffdd";

const AUTHORITY_STATUS = "current-tlidb-ss13-exact-active-alias";
const CURRENT_SOURCE_METHOD = "tlidb-current-ss13-data-modifier-id";
const PAGE_PATH = "Necklace_of_Firebird";

const RECORD_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "base-dexterity",
    alias: "legendary-base:Necklace_of_Firebird:1",
    recordKey: "Necklace_of_Firebird#modifier:640002",
    modifierId: "640002",
    text: "민첩 +8",
  }),
  Object.freeze({
    id: "slot-1-normal",
    alias: "legendary:Necklace_of_Firebird:slot-1:normal",
    recordKey: "Necklace_of_Firebird#modifier:51521511",
    modifierId: "51521511",
    text: "최대 HP와 최대 보호막 +(8–12) %",
    slotId: "slot-1",
    variant: "normal",
    roll: Object.freeze({ key: "roll_1", min: 8, max: 12 }),
  }),
  Object.freeze({
    id: "slot-1-corroded",
    alias: "legendary:Necklace_of_Firebird:slot-1:corroded",
    recordKey: "Necklace_of_Firebird#modifier:51521510",
    modifierId: "51521510",
    text: "최대 HP와 최대 보호막 +(14–16) %",
    slotId: "slot-1",
    variant: "corroded",
    roll: Object.freeze({ key: "roll_1", min: 14, max: 16 }),
  }),
  Object.freeze({
    id: "slot-2-normal",
    alias: "legendary:Necklace_of_Firebird:slot-2:normal",
    recordKey: "Necklace_of_Firebird#modifier:51521521",
    modifierId: "51521521",
    text: "원소 저항 (-25–-5) %\n이동 속도 -30 %",
    slotId: "slot-2",
    variant: "normal",
    roll: Object.freeze({ key: "roll_1", min: -25, max: -5 }),
  }),
  Object.freeze({
    id: "slot-2-corroded",
    alias: "legendary:Necklace_of_Firebird:slot-2:corroded",
    recordKey: "Necklace_of_Firebird#modifier:51521520",
    modifierId: "51521520",
    text: "원소 저항 (-20–5) %\n이동 속도 -30 %",
    slotId: "slot-2",
    variant: "corroded",
    roll: Object.freeze({ key: "roll_1", min: -20, max: 5 }),
  }),
  Object.freeze({
    id: "slot-3-normal",
    alias: "legendary:Necklace_of_Firebird:slot-3:normal",
    recordKey: "Necklace_of_Firebird#modifier:51521541",
    modifierId: "51521541",
    text: [
      "장벽 보유 시, 대미지를 받으면 메인 스킬이 발동되고, 그 후 장벽 이 제거된다.",
      "메인 스킬을 20레벨 장벽 폭발 로 교체합니다.",
    ].join("\n"),
    slotId: "slot-3",
    variant: "normal",
  }),
  Object.freeze({
    id: "slot-3-corroded",
    alias: "legendary:Necklace_of_Firebird:slot-3:corroded",
    recordKey: "Necklace_of_Firebird#modifier:51521540",
    modifierId: "51521540",
    text: [
      "장벽 보유 시, 대미지를 받으면 메인 스킬이 발동되고, 그 후 장벽 이 제거된다.",
      "메인 스킬을 25레벨 장벽 폭발 로 교체합니다.",
    ].join("\n"),
    slotId: "slot-3",
    variant: "corroded",
  }),
  Object.freeze({
    id: "slot-4-normal",
    alias: "legendary:Necklace_of_Firebird:slot-4:normal",
    recordKey: "Necklace_of_Firebird#modifier:51521551",
    modifierId: "51521551",
    text: "장벽 방어막 비율 별도 +20 %\n아머 수치 추가 -100 %",
    slotId: "slot-4",
    variant: "normal",
  }),
  Object.freeze({
    id: "slot-4-corroded",
    alias: "legendary:Necklace_of_Firebird:slot-4:corroded",
    recordKey: "Necklace_of_Firebird#modifier:51521550",
    modifierId: "51521550",
    text: "장벽 방어막 비율 별도 +(30–40) %\n아머 수치 추가 -100 %",
    slotId: "slot-4",
    variant: "corroded",
    roll: Object.freeze({ key: "roll_1", min: 30, max: 40 }),
  }),
]);

function freezeRecord(record) {
  return Object.freeze({ ...record });
}

function makeBlocker(type, id, expected, actual) {
  return Object.freeze({
    type,
    id,
    expected: expected ?? null,
    actual: actual ?? null,
  });
}

function variantFromItem(item, definition) {
  if (!definition.slotId) return null;
  return item?.legendaryAffixes
    ?.find(({ slotId }) => slotId === definition.slotId)
    ?.[definition.variant] ?? null;
}

function validateItem(item, blockers) {
  if (item?.id !== FIREBIRD_CURRENT_SS13_ITEM_ID) {
    blockers.push(makeBlocker(
      "item-id-mismatch",
      "firebird-item-id",
      FIREBIRD_CURRENT_SS13_ITEM_ID,
      item?.id,
    ));
  }
  if (
    item?.tlidbStableKey !== FIREBIRD_CURRENT_SS13_STABLE_ITEM_KEY
    || !item?.tlidbStableKeys?.includes(FIREBIRD_CURRENT_SS13_STABLE_ITEM_KEY)
  ) {
    blockers.push(makeBlocker(
      "stable-item-id-mismatch",
      "firebird-stable-item-id",
      FIREBIRD_CURRENT_SS13_STABLE_ITEM_KEY,
      item?.tlidbStableKey,
    ));
  }
  if (item?.sourceUrl !== FIREBIRD_CURRENT_SS13_SOURCE_URL) {
    blockers.push(makeBlocker(
      "item-source-url-mismatch",
      "firebird-source-url",
      FIREBIRD_CURRENT_SS13_SOURCE_URL,
      item?.sourceUrl,
    ));
  }
}

function validateReceipt(networkReceipts, blockers) {
  const receipt = networkReceipts?.receipts?.[FIREBIRD_CURRENT_SS13_SOURCE_URL];
  const receiptMatches = receipt?.success === true
    && receipt?.status === 200
    && receipt?.requestedUrl === FIREBIRD_CURRENT_SS13_SOURCE_URL
    && receipt?.responseUrl === FIREBIRD_CURRENT_SS13_SOURCE_URL
    && receipt?.contentSha256 === FIREBIRD_CURRENT_SS13_RECEIPT_SHA256;
  if (!receiptMatches) {
    blockers.push(makeBlocker(
      "source-receipt-mismatch",
      "firebird-ko-source-receipt",
      FIREBIRD_CURRENT_SS13_RECEIPT_SHA256,
      receipt?.contentSha256,
    ));
  }
  return receipt ?? null;
}

function validateRecord(definition, item, registry, localeSource, blockers) {
  const activeRef = registry?.refs?.[definition.alias];
  const sourceRef = localeSource?.refs?.[definition.alias];
  const rollAlias = definition.roll
    ? `legendary-roll:${PAGE_PATH}:${definition.slotId}:${definition.variant}:${definition.roll.key}`
    : null;
  const activeRollRef = rollAlias ? registry?.refs?.[rollAlias] : null;
  const sourceRollRef = rollAlias ? localeSource?.refs?.[rollAlias] : null;
  const record = registry?.records?.[definition.recordKey];
  const sourceRecord = localeSource?.records?.[definition.recordKey];
  const variant = variantFromItem(item, definition);

  if (activeRef !== definition.recordKey || sourceRef !== definition.recordKey) {
    blockers.push(makeBlocker(
      "active-alias-mismatch",
      definition.id,
      definition.recordKey,
      activeRef ?? sourceRef,
    ));
  }
  if (
    rollAlias
    && (activeRollRef !== definition.recordKey || sourceRollRef !== definition.recordKey)
  ) {
    blockers.push(makeBlocker(
      "active-roll-alias-mismatch",
      definition.id,
      definition.recordKey,
      activeRollRef ?? sourceRollRef,
    ));
  }
  if (
    !record
    || record.status !== "exact"
    || record.pagePath !== PAGE_PATH
    || record.sourceModifierId !== definition.modifierId
    || record.ko?.text !== definition.text
  ) {
    blockers.push(makeBlocker(
      "active-record-mismatch",
      definition.id,
      definition.recordKey,
      record?.sourceModifierId,
    ));
  }
  if (
    !sourceRecord
    || sourceRecord.status !== "exact"
    || sourceRecord.ko?.text !== definition.text
  ) {
    blockers.push(makeBlocker(
      "active-source-record-mismatch",
      definition.id,
      definition.recordKey,
      sourceRecord?.sourceModifierId,
    ));
  }

  const sourceEvidence = localeSource?.sources?.[sourceRecord?.ko?.sourceRef];
  if (
    !sourceEvidence
    || sourceEvidence.sourceUrl !== FIREBIRD_CURRENT_SS13_SOURCE_URL
    || sourceEvidence.sourceMethod !== CURRENT_SOURCE_METHOD
    || sourceEvidence.sourcePageSha256 !== FIREBIRD_CURRENT_SS13_RECEIPT_SHA256
    || sourceEvidence.sourceFieldStatus?.text !== "exact"
  ) {
    blockers.push(makeBlocker(
      "active-source-evidence-mismatch",
      definition.id,
      FIREBIRD_CURRENT_SS13_RECEIPT_SHA256,
      sourceEvidence?.sourcePageSha256,
    ));
  }

  if (definition.slotId) {
    if (
      variant?.sourceRecordKey !== definition.recordKey
      || variant?.sourceModifierId !== definition.modifierId
    ) {
      blockers.push(makeBlocker(
        "catalog-variant-identity-mismatch",
        definition.id,
        definition.recordKey,
        variant?.sourceRecordKey,
      ));
    }
    if (definition.roll) {
      const roll = variant?.rollDefs?.find(({ key }) => key === definition.roll.key);
      if (
        !roll
        || roll.min !== definition.roll.min
        || roll.max !== definition.roll.max
      ) {
        blockers.push(makeBlocker(
          "catalog-roll-range-mismatch",
          definition.id,
          `${definition.roll.min}:${definition.roll.max}`,
          roll ? `${roll.min}:${roll.max}` : null,
        ));
      }
    }
  }

  return freezeRecord({
    id: definition.id,
    alias: definition.alias,
    rollAlias,
    recordKey: definition.recordKey,
    sourceModifierId: definition.modifierId,
    sourceText: definition.text,
    sourcePageSha256: sourceEvidence?.sourcePageSha256 ?? null,
    status: (
      activeRef === definition.recordKey
      && (!rollAlias || activeRollRef === definition.recordKey)
      && record?.status === "exact"
      && sourceEvidence?.sourcePageSha256 === FIREBIRD_CURRENT_SS13_RECEIPT_SHA256
    ) ? AUTHORITY_STATUS : "unavailable",
  });
}

export function createCurrentSs13FirebirdGearCalculationProfile({
  item,
  registry,
  localeSource = TLIDB_GEAR_LOCALES_SS13_ACTIVE,
  networkReceipts = TLIDB_GEAR_NETWORK_RECEIPTS,
} = {}) {
  const blockers = [];
  validateItem(item, blockers);
  if (registry?.metadata?.targetSeason !== 13 || localeSource?.metadata?.targetSeason !== 13) {
    blockers.push(makeBlocker(
      "active-season-mismatch",
      "firebird-active-season",
      13,
      registry?.metadata?.targetSeason ?? localeSource?.metadata?.targetSeason,
    ));
  }
  validateReceipt(networkReceipts, blockers);
  const authorityRecords = RECORD_DEFINITIONS.map((definition) => (
    validateRecord(definition, item, registry, localeSource, blockers)
  ));
  const status = blockers.length === 0 ? "verified" : "unavailable";

  return Object.freeze({
    id: "firebird-current-ss13-calculation-profile",
    status,
    itemId: FIREBIRD_CURRENT_SS13_ITEM_ID,
    stableItemKey: FIREBIRD_CURRENT_SS13_STABLE_ITEM_KEY,
    sourceUrl: FIREBIRD_CURRENT_SS13_SOURCE_URL,
    sourcePageSha256: FIREBIRD_CURRENT_SS13_RECEIPT_SHA256,
    authorityStatus: status === "verified" ? AUTHORITY_STATUS : "unavailable",
    authorityRecords: Object.freeze(authorityRecords),
    blockers: Object.freeze(blockers),
  });
}

function getVariantBySlot(config, slotId) {
  const explicitSlots = Array.isArray(config?.legendaryDraft?.corrodedSlotIds)
    ? new Set(config.legendaryDraft.corrodedSlotIds)
    : null;
  return (explicitSlots ? explicitSlots.has(slotId) : config?.corrupted === true)
    ? "corroded"
    : "normal";
}

function getDefinition(slotId, variant) {
  return RECORD_DEFINITIONS.find(
    (definition) => definition.slotId === slotId && definition.variant === variant,
  );
}

function resolveRoll(config, definition) {
  const rollId = `legendary:${definition.slotId}:${definition.variant}:${definition.roll.key}`;
  const rawValue = config?.rolls?.[rollId];
  const hasExplicitRoll = Object.hasOwn(config?.rolls ?? {}, rollId)
    && Number.isFinite(Number(rawValue));
  const requestedValue = hasExplicitRoll ? Number(rawValue) : definition.roll.max;
  const value = Math.min(definition.roll.max, Math.max(definition.roll.min, requestedValue));
  return Object.freeze({
    rollId,
    value,
    requestedValue,
    valueOrigin: hasExplicitRoll ? "explicit-roll" : "planner-default",
    clamped: value !== requestedValue,
  });
}

function recordMetadata(profile, definition) {
  const authority = profile.authorityRecords.find(({ id }) => id === definition.id);
  return {
    authorityStatus: authority?.status ?? "unavailable",
    sourceAlias: authority?.alias ?? null,
    sourceRollAlias: authority?.rollAlias ?? null,
    sourceRecordKey: definition.recordKey,
    sourceModifierId: definition.modifierId,
  };
}

function createEntry(profile, definition, input) {
  return Object.freeze({
    id: input.id,
    semanticTargetKey: input.semanticTargetKey,
    calculationStatKey: input.calculationStatKey ?? null,
    unit: input.unit,
    value: input.value,
    valueOrigin: input.valueOrigin,
    slotId: definition.slotId ?? "base",
    variant: definition.variant ?? "base",
    rollId: input.rollId ?? null,
    requestedValue: input.requestedValue ?? input.value,
    clamped: input.clamped === true,
    ...recordMetadata(profile, definition),
  });
}

function createUnsupported(profile, definition, input) {
  return Object.freeze({
    id: input.id,
    semanticTargetKey: input.semanticTargetKey,
    status: "unsupported",
    value: null,
    unit: input.unit,
    reason: input.reason,
    dependency: input.dependency,
    slotId: definition.slotId,
    variant: definition.variant,
    ...recordMetadata(profile, definition),
  });
}

function frozenModifierValues(entries) {
  return Object.freeze(Object.fromEntries(
    entries.map(({ semanticTargetKey, value }) => [semanticTargetKey, value]),
  ));
}

export function projectCurrentSs13FirebirdGearCalculation(profile, config = {}) {
  if (profile?.status !== "verified") {
    return Object.freeze({
      active: false,
      status: "unsupported",
      itemId: FIREBIRD_CURRENT_SS13_ITEM_ID,
      authorityStatus: profile?.authorityStatus ?? "unavailable",
      entries: Object.freeze([]),
      unsupported: Object.freeze([]),
      modifierValues: Object.freeze({}),
      blockers: profile?.blockers ?? Object.freeze([]),
    });
  }

  const base = RECORD_DEFINITIONS[0];
  const variants = Object.freeze(Object.fromEntries(
    ["slot-1", "slot-2", "slot-3", "slot-4"].map((slotId) => [
      slotId,
      getVariantBySlot(config, slotId),
    ]),
  ));
  const slot1 = getDefinition("slot-1", variants["slot-1"]);
  const slot2 = getDefinition("slot-2", variants["slot-2"]);
  const slot3 = getDefinition("slot-3", variants["slot-3"]);
  const slot4 = getDefinition("slot-4", variants["slot-4"]);
  const slot1Roll = resolveRoll(config, slot1);
  const slot2Roll = resolveRoll(config, slot2);
  const slot4Roll = slot4.roll ? resolveRoll(config, slot4) : null;
  const barrierShieldValue = slot4Roll?.value ?? 20;
  const barrierShieldOrigin = slot4Roll?.valueOrigin ?? "source-exact-static";

  const entries = [
    createEntry(profile, base, {
      id: "firebird:base:dexterity",
      semanticTargetKey: "dexterity",
      calculationStatKey: "dexterity",
      unit: "flat",
      value: 8,
      valueOrigin: "source-exact-static",
    }),
    ...["maxLifePercent", "maxShieldPercent"].map((semanticTargetKey) => (
      createEntry(profile, slot1, {
        id: `firebird:${slot1.id}:${semanticTargetKey}`,
        semanticTargetKey,
        unit: "percent",
        value: slot1Roll.value,
        valueOrigin: slot1Roll.valueOrigin,
        rollId: slot1Roll.rollId,
        requestedValue: slot1Roll.requestedValue,
        clamped: slot1Roll.clamped,
      })
    )),
    ...[
      ["fireResistancePercent", "fireResist"],
      ["coldResistancePercent", "coldResist"],
      ["lightningResistancePercent", "lightningResist"],
    ].map(([semanticTargetKey, calculationStatKey]) => (
      createEntry(profile, slot2, {
        id: `firebird:${slot2.id}:${semanticTargetKey}`,
        semanticTargetKey,
        calculationStatKey,
        unit: "percent-point",
        value: slot2Roll.value,
        valueOrigin: slot2Roll.valueOrigin,
        rollId: slot2Roll.rollId,
        requestedValue: slot2Roll.requestedValue,
        clamped: slot2Roll.clamped,
      })
    )),
    createEntry(profile, slot2, {
      id: `firebird:${slot2.id}:movementSpeedPercent`,
      semanticTargetKey: "movementSpeedPercent",
      calculationStatKey: "movementSpeedBonus",
      unit: "percent-point",
      value: -30,
      valueOrigin: "source-exact-static",
    }),
    createEntry(profile, slot4, {
      id: `firebird:${slot4.id}:barrierShieldAdditionalPercent`,
      semanticTargetKey: "barrierShieldAdditionalPercent",
      unit: "additional-percent",
      value: barrierShieldValue,
      valueOrigin: barrierShieldOrigin,
      rollId: slot4Roll?.rollId,
      requestedValue: slot4Roll?.requestedValue,
      clamped: slot4Roll?.clamped,
    }),
    createEntry(profile, slot4, {
      id: `firebird:${slot4.id}:armorAdditionalPercent`,
      semanticTargetKey: "armorAdditionalPercent",
      calculationStatKey: "armorBonus",
      unit: "additional-percent",
      value: -100,
      valueOrigin: "source-exact-static",
    }),
  ];

  const unsupported = [
    createUnsupported(profile, slot4, {
      id: "firebird:unsupported:barrier-amount-absolute",
      semanticTargetKey: "barrierAmountAbsolute",
      unit: "absolute",
      dependency: "base-barrier-amount",
      reason: "base-barrier-amount-unavailable",
    }),
    createUnsupported(profile, slot3, {
      id: "firebird:unsupported:barrier-burst-trigger-cadence",
      semanticTargetKey: "barrierBurstTriggerCadence",
      unit: "events-per-second",
      dependency: "trigger-cooldown-or-cadence",
      reason: "trigger-cadence-unavailable",
    }),
    createUnsupported(profile, slot3, {
      id: "firebird:unsupported:barrier-burst-coefficient",
      semanticTargetKey: "barrierBurstCoefficient",
      unit: "percent-of-barrier",
      dependency: "regular-barrier-burst-coefficient",
      reason: REGULAR_BARRIER_BURST_UNSUPPORTED_REASON,
    }),
  ];
  const externalSkill = Object.freeze({
    id: "skill-firebird-barrier-burst",
    level: variants["slot-3"] === "corroded" ? 25 : 20,
    variant: variants["slot-3"],
    sourceRecordKey: slot3.recordKey,
    sourceModifierId: slot3.modifierId,
    coefficientStatus: "unsupported",
    coefficientReason: REGULAR_BARRIER_BURST_UNSUPPORTED_REASON,
    triggerCadenceStatus: "unsupported",
    triggerCadenceReason: "trigger-cadence-unavailable",
  });

  return Object.freeze({
    active: true,
    status: "partial",
    itemId: FIREBIRD_CURRENT_SS13_ITEM_ID,
    authorityStatus: profile.authorityStatus,
    sourceUrl: profile.sourceUrl,
    sourcePageSha256: profile.sourcePageSha256,
    variants,
    entries: Object.freeze(entries),
    unsupported: Object.freeze(unsupported),
    modifierValues: frozenModifierValues(entries),
    externalSkill,
    blockers: Object.freeze([]),
  });
}
