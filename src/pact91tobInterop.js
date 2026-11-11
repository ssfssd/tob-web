import {
  createDestinyInstance,
  createUndeterminedDestinyInstance,
  diagnoseDestinyInstance,
  diagnoseUndeterminedDestinyInstance,
  getPactRingSlotType,
} from "./pactDestinyModel.js";
import { TOB91_DESTINY_INTEROP_RECEIPT } from "./data/91tobDestinyInterop.ss13_4.generated.js";

const DESTINY_RANGE_PATTERN = /\(\s*(-?\d+(?:\.\d+)?)\s*[-\u2013\u2014~\uFF5E]\s*(-?\d+(?:\.\d+)?)\s*\)/gu;
const SUPPORTED_DESTINY_IDS = new Set(TOB91_DESTINY_INTEROP_RECEIPT.supportedDestinyIds);
const UNDETERMINED_FATE_CONTRACT = TOB91_DESTINY_INTEROP_RECEIPT.undeterminedFate;
const EXPECTED_SOURCE_DESTINY_IDS = new Set([
  ...TOB91_DESTINY_INTEROP_RECEIPT.supportedDestinyIds,
  UNDETERMINED_FATE_CONTRACT.destiny.id,
  ...Object.values(TOB91_DESTINY_INTEROP_RECEIPT.unsupportedDestinyIds).flat(),
]);

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

function sameKeys(value, expectedKeys) {
  return isPlainObject(value)
    && Object.keys(value).length === expectedKeys.length
    && expectedKeys.every((key) => Object.hasOwn(value, key));
}

function issue(code, path) {
  return { code, path };
}

function destinyShapeValid(value) {
  return allowedKeys(value, [
    "destiny_id",
    "destiny_name",
    "destiny_type",
    "resolved_affix_text",
  ], ["roll_values"])
    && typeof value.destiny_id === "string"
    && Boolean(value.destiny_id)
    && typeof value.destiny_name === "string"
    && Boolean(value.destiny_name)
    && typeof value.destiny_type === "string"
    && Boolean(value.destiny_type)
    && typeof value.resolved_affix_text === "string"
    && (!Object.hasOwn(value, "roll_values") || isPlainObject(value.roll_values));
}

export function tob91PactRingShapeValid(value) {
  return allowedKeys(value, [], ["installed_destiny"])
    && (!Object.hasOwn(value, "installed_destiny") || destinyShapeValid(value.installed_destiny));
}

export function tob91PactUndeterminedFateShapeValid(value) {
  return allowedKeys(value, ["destiny", "slot_layout_id", "slots"])
    && destinyShapeValid(value.destiny)
    && typeof value.slot_layout_id === "string"
    && Boolean(value.slot_layout_id)
    && Array.isArray(value.slots)
    && value.slots.every((slot) => (
      allowedKeys(slot, ["slot_type"], ["installed_destiny"])
      && (slot.slot_type === "micro" || slot.slot_type === "medium")
      && (!Object.hasOwn(slot, "installed_destiny") || destinyShapeValid(slot.installed_destiny))
    ));
}

export function has91TobOrdinaryPactDestinyPayload(slots) {
  return isPlainObject(slots) && Object.values(slots).some((slot) => (
    isPlainObject(slot?.rings) && Object.values(slot.rings).some((ring) => (
      isPlainObject(ring) && Object.hasOwn(ring, "installed_destiny")
    ))
  ));
}

export function has91TobUndeterminedPactDestinyPayload(slots) {
  return isPlainObject(slots) && Object.values(slots).some((slot) => (
    isPlainObject(slot) && Object.hasOwn(slot, "undetermined_fate")
  ));
}

function decimalPlaces(value) {
  const text = String(value);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

function deriveRollPlan(affixText) {
  const rollDefs = [];
  let rollIndex = 0;
  const renderTemplate = String(affixText ?? "").replace(
    DESTINY_RANGE_PATTERN,
    (token, first, second) => {
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
      });
      return `{{${key}}}`;
    },
  );
  return { renderTemplate, rollDefs };
}

function sourceIdentityRecords(sourceDataset) {
  return sourceDataset.destinies.map((record) => ({
    id: record.id,
    name: record.name,
    destiny_type: record.destiny_type,
    slot_type: record.slot_type,
    affix_text: record.affix_text,
  })).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

function sameRollStructure(sourceRollDefs, localRollDefs) {
  return sourceRollDefs.length === localRollDefs.length
    && sourceRollDefs.every((sourceRoll, index) => {
      const localRoll = localRollDefs[index];
      return sourceRoll.key === localRoll?.key
        && sourceRoll.min === Number(localRoll.min)
        && sourceRoll.max === Number(localRoll.max)
        && sourceRoll.step === Number(localRoll.step)
        && sourceRoll.precision === Number(localRoll.precision);
    });
}

function sameSlotTypes(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((slotType, index) => slotType === expected[index]);
}

function sourceLayoutsMatch(sourceLayouts) {
  const expected = UNDETERMINED_FATE_CONTRACT.catalogLayouts;
  return Array.isArray(sourceLayouts)
    && sourceLayouts.length === expected.length
    && sourceLayouts.every((layout, index) => (
      isPlainObject(layout)
      && layout.id === expected[index].id
      && layout.label === expected[index].label
      && sameSlotTypes(layout.slots, expected[index].slots)
    ));
}

function modelLayoutsMatch(modelLayouts) {
  const expected = UNDETERMINED_FATE_CONTRACT.layouts;
  return Array.isArray(modelLayouts)
    && modelLayouts.length === expected.length
    && modelLayouts.every((layout, index) => (
      layout?.id === expected[index].id
      && sameSlotTypes(layout?.slots, expected[index].slots)
    ));
}

function contextCatalogs(context) {
  const model = context?.pactModel;
  const sourceDataset = context?.pactDestinySourceCatalog;
  if (!model || !Array.isArray(model.destinies) || !isPlainObject(sourceDataset)) return null;
  if (sourceDataset.catalog_version !== TOB91_DESTINY_INTEROP_RECEIPT.catalogVersion
    || sourceDataset.fingerprint !== TOB91_DESTINY_INTEROP_RECEIPT.catalogFingerprint
    || !Array.isArray(sourceDataset.destinies)
    || sourceDataset.destinies.length !== EXPECTED_SOURCE_DESTINY_IDS.size
    || sourceDataset.destinies.some((record) => !isPlainObject(record))
    || !sourceLayoutsMatch(sourceDataset.undetermined_fate_layouts)
    || !modelLayoutsMatch(model.undeterminedLayouts)) return null;

  const identityJson = JSON.stringify(sourceIdentityRecords(sourceDataset));
  if (identityJson.length !== TOB91_DESTINY_INTEROP_RECEIPT.sourceIdentityJsonLength
    || fnv1a64(identityJson) !== TOB91_DESTINY_INTEROP_RECEIPT.sourceIdentityFnv1a64) return null;

  const sourceById = new Map();
  for (const source of sourceDataset.destinies) {
    if (!EXPECTED_SOURCE_DESTINY_IDS.has(source?.id) || sourceById.has(source.id)) return null;
    sourceById.set(source.id, source);
  }
  if (sourceById.size !== EXPECTED_SOURCE_DESTINY_IDS.size) return null;

  const activeById = new Map();
  for (const active of model.destinies) {
    if (!active?.id || activeById.has(active.id)) return null;
    activeById.set(active.id, active);
  }
  for (const sourceId of SUPPORTED_DESTINY_IDS) {
    const source = sourceById.get(sourceId);
    const active = activeById.get(sourceId);
    const sourceRollPlan = deriveRollPlan(source?.affix_text);
    if (!source
      || !active
      || active.structureSupported === false
      || active.displayOnly === true
      || source.destiny_type !== active.destinyType
      || source.slot_type !== active.slotType
      || !sameRollStructure(sourceRollPlan.rollDefs, active.rollDefs ?? [])) return null;
  }
  const undeterminedSource = sourceById.get(UNDETERMINED_FATE_CONTRACT.destiny.id);
  const undeterminedActive = activeById.get(UNDETERMINED_FATE_CONTRACT.destiny.id);
  if (!undeterminedSource
    || !undeterminedActive
    || undeterminedSource.name !== UNDETERMINED_FATE_CONTRACT.destiny.name
    || undeterminedSource.destiny_type !== UNDETERMINED_FATE_CONTRACT.destiny.destinyType
    || undeterminedSource.slot_type !== UNDETERMINED_FATE_CONTRACT.destiny.slotType
    || undeterminedSource.affix_text !== UNDETERMINED_FATE_CONTRACT.destiny.resolvedAffixText
    || undeterminedActive.destinyType !== UNDETERMINED_FATE_CONTRACT.destiny.destinyType
    || undeterminedActive.slotType !== UNDETERMINED_FATE_CONTRACT.destiny.slotType
    || undeterminedActive.structureSupported === false
    || undeterminedActive.displayOnly === true
    || (undeterminedActive.rollDefs ?? []).length !== 0) return null;
  return {
    model,
    sourceById,
    activeById,
    undeterminedSource,
    undeterminedActive,
    undeterminedLayoutsById: new Map(model.undeterminedLayouts.map((layout) => [layout.id, layout])),
  };
}

function rollValueValid(value, definition) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < definition.min || value > definition.max) return false;
  const stepped = definition.min
    + Math.round((value - definition.min) / definition.step) * definition.step;
  return Number(stepped.toFixed(definition.precision)) === value;
}

function renderSourceAffix(source, rollPlan, rollValues) {
  const rollByKey = new Map(rollPlan.rollDefs.map((roll) => [roll.key, roll]));
  return rollPlan.renderTemplate.replace(/\{\{([^}]+)\}\}/gu, (_, key) => {
    const roll = rollByKey.get(key);
    const value = rollValues?.[key];
    if (!roll || !Number.isFinite(value)) return "";
    return roll.precision > 0 ? value.toFixed(roll.precision) : String(value);
  }) || source.name;
}

function validateSourceDestiny(value, expectedSlotType, catalogs, path) {
  const sourceId = value.destiny_id;
  if (!SUPPORTED_DESTINY_IDS.has(sourceId)) {
    return { ok: false, issue: issue("91tob-pact-destiny-unresolved", path) };
  }
  const source = catalogs.sourceById.get(sourceId);
  const active = catalogs.activeById.get(sourceId);
  if (!source || !active) {
    return { ok: false, issue: issue("91tob-pact-destiny-unresolved", path) };
  }
  if (source.slot_type !== expectedSlotType || active.slotType !== expectedSlotType) {
    return { ok: false, issue: issue("91tob-pact-destiny-slot-mismatch", path) };
  }
  if (value.destiny_name !== source.name || value.destiny_type !== source.destiny_type) {
    return { ok: false, issue: issue("91tob-pact-destiny-identity-invalid", path) };
  }

  const rollPlan = deriveRollPlan(source.affix_text);
  const rollKeys = rollPlan.rollDefs.map(({ key }) => key);
  if (rollKeys.length === 0) {
    if (Object.hasOwn(value, "roll_values")) {
      return { ok: false, issue: issue("91tob-pact-destiny-roll-invalid", path) };
    }
  } else if (!sameKeys(value.roll_values, rollKeys)
    || rollPlan.rollDefs.some((roll) => !rollValueValid(value.roll_values[roll.key], roll))) {
    return { ok: false, issue: issue("91tob-pact-destiny-roll-invalid", path) };
  }
  const rollValues = rollKeys.length > 0 ? value.roll_values : {};
  if (value.resolved_affix_text !== renderSourceAffix(source, rollPlan, rollValues)) {
    return { ok: false, issue: issue("91tob-pact-destiny-snapshot-invalid", path) };
  }

  const instance = createDestinyInstance(catalogs.model, active.id, `91tob-import-${path}`);
  instance.rolls = { ...rollValues };
  const diagnosis = diagnoseDestinyInstance(catalogs.model, instance, expectedSlotType);
  if (!diagnosis.valid) {
    return { ok: false, issue: issue("91tob-pact-destiny-roll-invalid", path) };
  }
  return { ok: true, instance, source, active };
}

function validateUndeterminedSourceDestiny(value, catalogs, path) {
  const expected = UNDETERMINED_FATE_CONTRACT.destiny;
  if (value.destiny_id !== expected.id
    || value.destiny_name !== expected.name
    || value.destiny_type !== expected.destinyType
    || value.resolved_affix_text !== expected.resolvedAffixText
    || Object.hasOwn(value, "roll_values")) {
    return { ok: false, issue: issue("91tob-pact-undetermined-identity-invalid", path) };
  }
  const instance = createDestinyInstance(
    catalogs.model,
    catalogs.undeterminedActive.id,
    `91tob-import-${path}`,
  );
  const diagnosis = diagnoseDestinyInstance(catalogs.model, instance, "undetermined");
  if (!diagnosis.valid) {
    return { ok: false, issue: issue("91tob-pact-undetermined-identity-invalid", path) };
  }
  return { ok: true, instance };
}

export function import91TobOrdinaryPactDestinies(section, pact, context) {
  const slots = section?.slots;
  if (!has91TobOrdinaryPactDestinyPayload(slots)) {
    return { ok: true, issues: [], mappedPaths: [], mappings: [] };
  }
  if (section.destiny_catalog_fingerprint !== TOB91_DESTINY_INTEROP_RECEIPT.catalogFingerprint) {
    return {
      ok: false,
      issues: [issue("91tob-pact-destiny-catalog-invalid", "pactspirits.destiny_catalog_fingerprint")],
      mappedPaths: [],
      mappings: [],
    };
  }
  const catalogs = contextCatalogs(context);
  if (!catalogs) {
    return {
      ok: false,
      issues: [issue("validation-context-unavailable", "pactspirits")],
      mappedPaths: [],
      mappings: [],
    };
  }

  const issues = [];
  const mappedPaths = ["pactspirits.destiny_catalog_fingerprint"];
  const mappings = [];
  for (const slotId of TOB91_DESTINY_INTEROP_RECEIPT.slotOrder) {
    const sourceSlot = slots[slotId];
    const localSlot = pact.slots.find((slot) => slot?.slotId === slotId);
    for (const ringId of TOB91_DESTINY_INTEROP_RECEIPT.ringOrder) {
      const sourceDestiny = sourceSlot.rings[ringId].installed_destiny;
      if (!sourceDestiny) continue;
      const path = `pactspirits.slots.${slotId}.rings.${ringId}.installed_destiny`;
      if (!localSlot?.spirit) {
        issues.push(issue("91tob-pact-destiny-without-spirit", path));
        continue;
      }
      const result = validateSourceDestiny(
        sourceDestiny,
        getPactRingSlotType(ringId),
        catalogs,
        path,
      );
      if (!result.ok) {
        issues.push(result.issue);
        continue;
      }
      localSlot.rings[ringId].installedDestiny = result.instance;
      mappedPaths.push(path);
      mappings.push({
        slotId,
        ringId,
        sourceDestinyId: result.source.id,
        localDestinyId: result.active.id,
      });
    }
  }
  return { ok: issues.length === 0, issues, mappedPaths, mappings };
}

export function import91TobUndeterminedPactDestinies(section, pact, context) {
  const slots = section?.slots;
  if (!has91TobUndeterminedPactDestinyPayload(slots)) {
    return { ok: true, issues: [], mappedPaths: [], mappings: [] };
  }
  if (section.destiny_catalog_fingerprint !== TOB91_DESTINY_INTEROP_RECEIPT.catalogFingerprint) {
    return {
      ok: false,
      issues: [issue("91tob-pact-destiny-catalog-invalid", "pactspirits.destiny_catalog_fingerprint")],
      mappedPaths: [],
      mappings: [],
    };
  }
  const catalogs = contextCatalogs(context);
  if (!catalogs) {
    return {
      ok: false,
      issues: [issue("validation-context-unavailable", "pactspirits")],
      mappedPaths: [],
      mappings: [],
    };
  }

  const issues = [];
  const mappedPaths = ["pactspirits.destiny_catalog_fingerprint"];
  const mappings = [];
  for (const slotId of TOB91_DESTINY_INTEROP_RECEIPT.slotOrder) {
    const sourceFate = slots[slotId]?.undetermined_fate;
    if (!sourceFate) continue;
    const path = `pactspirits.slots.${slotId}.undetermined_fate`;
    const localSlot = pact.slots.find((slot) => slot?.slotId === slotId);
    if (!localSlot?.spirit) {
      issues.push(issue("91tob-pact-undetermined-without-spirit", path));
      continue;
    }
    const core = validateUndeterminedSourceDestiny(
      sourceFate.destiny,
      catalogs,
      `${path}.destiny`,
    );
    if (!core.ok) {
      issues.push(core.issue);
      continue;
    }
    const layout = catalogs.undeterminedLayoutsById.get(sourceFate.slot_layout_id);
    if (!layout
      || sourceFate.slots.length !== layout.slots.length
      || sourceFate.slots.some((slot, index) => slot.slot_type !== layout.slots[index])) {
      issues.push(issue("91tob-pact-undetermined-layout-invalid", path));
      continue;
    }

    const instance = createUndeterminedDestinyInstance(
      catalogs.model,
      layout.id,
      `91tob-import-${slotId}-undetermined`,
    );
    const childDestinyIds = [];
    const slotIssueCount = issues.length;
    for (const [childIndex, sourceSlot] of sourceFate.slots.entries()) {
      const sourceDestiny = sourceSlot.installed_destiny;
      if (!sourceDestiny) continue;
      const childPath = `${path}.slots.${childIndex}.installed_destiny`;
      const child = validateSourceDestiny(
        sourceDestiny,
        layout.slots[childIndex],
        catalogs,
        childPath,
      );
      if (!child.ok) {
        issues.push(child.issue);
        continue;
      }
      instance.slots[childIndex].installedDestiny = child.instance;
      childDestinyIds.push(child.source.id);
      mappedPaths.push(childPath);
    }
    if (issues.length !== slotIssueCount) continue;
    instance.destiny = core.instance;
    localSlot.undeterminedFate = instance;
    mappedPaths.push(path);
    mappings.push({
      slotId,
      layoutId: layout.id,
      sourceDestinyId: catalogs.undeterminedSource.id,
      localDestinyId: catalogs.undeterminedActive.id,
      childDestinyIds,
    });
  }
  return { ok: issues.length === 0, issues, mappedPaths, mappings };
}

export function export91TobOrdinaryPactDestiny(instance, expectedSlotType, context, path) {
  const catalogs = contextCatalogs(context);
  if (!catalogs) {
    return { ok: false, issue: issue("validation-context-unavailable", "validationContext") };
  }
  const localId = instance?.destinyId;
  if (!SUPPORTED_DESTINY_IDS.has(localId)) {
    return { ok: false, issue: issue("91tob-export-pact-destiny-invalid", path) };
  }
  const source = catalogs.sourceById.get(localId);
  const active = catalogs.activeById.get(localId);
  if (!source || !active || active.slotType !== expectedSlotType) {
    return { ok: false, issue: issue("91tob-export-pact-destiny-invalid", path) };
  }
  const diagnosis = diagnoseDestinyInstance(catalogs.model, instance, expectedSlotType);
  if (!diagnosis.valid) {
    return { ok: false, issue: issue("91tob-export-pact-destiny-invalid", path) };
  }
  const rollPlan = deriveRollPlan(source.affix_text);
  const rollValues = Object.fromEntries(rollPlan.rollDefs.map(({ key }) => [key, instance.rolls[key]]));
  if (rollPlan.rollDefs.some((roll) => !rollValueValid(rollValues[roll.key], roll))) {
    return { ok: false, issue: issue("91tob-export-pact-destiny-invalid", path) };
  }
  return {
    ok: true,
    value: {
      destiny_id: source.id,
      destiny_name: source.name,
      destiny_type: source.destiny_type,
      ...(rollPlan.rollDefs.length > 0 ? { roll_values: rollValues } : {}),
      resolved_affix_text: renderSourceAffix(source, rollPlan, rollValues),
    },
  };
}

export function export91TobUndeterminedPactDestiny(instance, context, path) {
  const catalogs = contextCatalogs(context);
  if (!catalogs) {
    return { ok: false, issue: issue("validation-context-unavailable", "validationContext") };
  }
  const diagnosis = diagnoseUndeterminedDestinyInstance(catalogs.model, instance);
  const layout = catalogs.undeterminedLayoutsById.get(instance?.slotLayoutId ?? instance?.layoutId);
  if (!diagnosis.valid
    || !layout
    || instance.destiny?.destinyId !== catalogs.undeterminedActive.id
    || instance.slots.length !== layout.slots.length
    || instance.slots.some((slot, index) => slot.slotType !== layout.slots[index])) {
    return { ok: false, issue: issue("91tob-export-pact-undetermined-fate-invalid", path) };
  }

  const slots = [];
  for (const [childIndex, slot] of instance.slots.entries()) {
    if (!slot.installedDestiny) {
      slots.push({ slot_type: layout.slots[childIndex] });
      continue;
    }
    const child = export91TobOrdinaryPactDestiny(
      slot.installedDestiny,
      layout.slots[childIndex],
      context,
      `${path}.slots.${childIndex}.installedDestiny`,
    );
    if (!child.ok) return child;
    slots.push({
      slot_type: layout.slots[childIndex],
      installed_destiny: child.value,
    });
  }
  const core = UNDETERMINED_FATE_CONTRACT.destiny;
  return {
    ok: true,
    value: {
      destiny: {
        destiny_id: core.id,
        destiny_name: core.name,
        destiny_type: core.destinyType,
        resolved_affix_text: core.resolvedAffixText,
      },
      slot_layout_id: layout.id,
      slots,
    },
  };
}
