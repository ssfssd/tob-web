import { createDefaultBuild, normalizeBuild } from "./engine.js";
import {
  BUILD_DOCUMENT_SCHEMA_VERSION,
  deserializeBuildDocument,
  serializeBuildDocument,
} from "./buildDocument.js";
import { createDivinityBoard } from "./divinityBoardModel.js";
import { migratePrivateBing2ResearchBuild } from "./guideBuilds.js";
import {
  diagnoseCurrentPactRingSlotAvailability,
  diagnosePactDestinyState,
} from "./pactDestinyModel.js";
import { normalizePatchSnapshot } from "./calculation/patchSnapshot.js";
import { readBuildStorage, writeBuildStorage } from "./buildStorageTransaction.js";
import {
  canWriteInventoryStorage,
  InventoryStorageConflictError,
  InventoryStorageUnavailableError,
  readInventoryStorageSnapshot,
  runInventoryStorageMutation,
  writeInventoryStorage,
} from "./inventoryStorageTransaction.js";
export { InventoryStorageConflictError, InventoryStorageUnavailableError, runInventoryStorageMutation } from "./inventoryStorageTransaction.js";
export { BuildStorageConflictError, BuildStorageUnavailableError } from "./buildStorageTransaction.js";

const CURRENT_KEY = "tob.currentBuild.v2";
const SAVED_KEY = "tob.savedBuilds.v2";
const LEGACY_CURRENT_KEY = "tob.currentBuild.v1";
const LEGACY_SAVED_KEY = "tob.savedBuilds.v1";
const GEAR_INVENTORY_KEY = "tob.gearInventory.v1";
const HERO_MEMORY_INVENTORY_KEY = "tob.heroMemoryInventory.v1";
const UNIFIED_INVENTORY_KEY = "tob.inventory.v1";
export const UNIFIED_INVENTORY_SCHEMA_VERSION = 1;
const storageWarnings = [];
const buildStorageRevisions = new WeakMap();

export class PactStorageInvariantError extends TypeError {}

function recordStorageWarning(code, scope) {
  storageWarnings.push({ code, scope });
}

export function consumeStorageWarnings() {
  return storageWarnings.splice(0, storageWarnings.length);
}

function clonePlain(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sameJson(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameJson(value, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && sameJson(left[key], right[key]));
}

function assertPactStorageInvariant(build, pactModel) {
  const receiptDiagnosis = diagnoseCurrentPactRingSlotAvailability(build?.pact);
  const modelDiagnosis = pactModel ? diagnosePactDestinyState(pactModel, build?.pact) : null;
  if ([...(receiptDiagnosis.issues ?? []), ...(modelDiagnosis?.issues ?? [])]
    .some(({ code }) => code === "pact-spirit-ring-slot-unavailable")) {
    throw new PactStorageInvariantError("invalid pact state for storage");
  }
}

function normalizeStoredResearch(input) {
  return {
    season: typeof input?.season === "string" ? input.season.trim().slice(0, 20) : "",
    sources: Array.isArray(input?.sources)
      ? input.sources
          .filter((source) => typeof source === "string" && source.trim())
          .map((source) => source.trim())
          .slice(0, 20)
      : [],
    notes: typeof input?.notes === "string" ? input.notes : "",
  };
}

function trimEmptySlots(itemIds) {
  let end = itemIds.length;
  while (end > 0 && !itemIds[end - 1]) end -= 1;
  return itemIds.slice(0, end);
}

function getBrowserStorage() {
  return globalThis.window?.localStorage;
}

function readInventoryStorage(key, scope) {
  try {
    const storage = getBrowserStorage();
    if (!storage) return null;
    const snapshot = readInventoryStorageSnapshot(storage);
    if (snapshot.recoveryPending) recordStorageWarning("build-storage-recovery-pending", scope);
    const field = key === GEAR_INVENTORY_KEY ? "gear" : key === HERO_MEMORY_INVENTORY_KEY ? "heroMemory" : "unified";
    return snapshot[field];
  }
  catch {
    recordStorageWarning("build-storage-unavailable", scope);
    return null;
  }
}

export function getBuildStorageRevision(build) {
  return buildStorageRevisions.get(build);
}

function rememberBuildStorageRevision(build, storage, revision) {
  buildStorageRevisions.set(build, { storage, ...revision });
  return build;
}

function expectedBuildRevision(build, storage, expectedRevision) {
  const revision = expectedRevision ?? getBuildStorageRevision(build);
  if (revision?.storage !== storage) return {};
  return revision.unreadable ? { unreadable: true } : { current: revision.current };
}

function readBuildStorageForLoad(scope) {
  let storage;
  try {
    storage = getBrowserStorage();
    if (!storage) return { storage, current: null, saved: null };
    const revision = readBuildStorage(storage);
    if (revision.recoveryPending) recordStorageWarning("build-storage-recovery-pending", scope);
    return { storage, ...revision };
  } catch {
    recordStorageWarning("build-storage-unavailable", scope);
    return { storage, unreadable: true };
  }
}

function tryPersistRecovery(storage, changes, revision, scope) {
  try { return { storage, ...writeBuildStorage(storage, changes, revision) }; }
  catch {
    recordStorageWarning("build-storage-recovery-write-failed", scope);
    return revision;
  }
}

function normalizeSlotIndex(value) {
  return Math.max(0, Math.min(9, Math.round(Number(value) || 0)));
}

function hasValidGearInstanceIdentity(build) {
  const slots = build?.gear?.slots;
  const inventory = build?.gear?.inventory;
  if (!Array.isArray(slots) || !Array.isArray(inventory)) return false;

  const instanceIds = new Set();
  for (const gear of [...slots, ...inventory]) {
    if (gear === null) continue;
    if (!isPlainObject(gear) || typeof gear.instanceId !== "string" || !gear.instanceId) {
      return false;
    }
    if (instanceIds.has(gear.instanceId)) return false;
    instanceIds.add(gear.instanceId);
  }
  return true;
}

const CURRENT_BUILD_OBJECT_FIELDS = Object.freeze([
  "patchSnapshot",
  "research",
  "skillSeals",
  "gearAffixes",
  "gearRolls",
  "gearCrafts",
  "gearCorruptions",
  "gearLegendaryDrafts",
  "selections",
  "selectionProjection",
  "hero",
  "skills",
  "gear",
  "talents",
  "divinity",
  "pact",
  "conditions",
  "calculation",
]);

function hasCurrentBuildDocumentShape(input) {
  return isPlainObject(input)
    && input.schemaVersion === BUILD_DOCUMENT_SCHEMA_VERSION
    && typeof input.id === "string" && Boolean(input.id)
    && typeof input.name === "string" && Boolean(input.name.trim())
    && typeof input.updatedAt === "string" && Number.isFinite(Date.parse(input.updatedAt))
    && typeof input.customAffixes === "string"
    && sameJson(normalizeStoredResearch(input.research), input.research)
    && sameJson(normalizePatchSnapshot(input.patchSnapshot), input.patchSnapshot)
    && Number.isFinite(input.heroLevel)
    && Array.isArray(input.skillLevels)
    && CURRENT_BUILD_OBJECT_FIELDS.every((field) => isPlainObject(input[field]));
}

function normalizeSavedBuildRecord(input, { allowLegacy = false } = {}) {
  if (!isPlainObject(input)
    || typeof input.id !== "string" || !input.id
    || typeof input.name !== "string" || !input.name.trim()) {
    throw new TypeError("invalid saved build record");
  }
  if (!allowLegacy && !hasCurrentBuildDocumentShape(input)) {
    throw new TypeError("invalid current build document shape");
  }
  const migrated = migratePrivateBing2ResearchBuild(input);
  const normalized = normalizeBuild(migrated);
  if (!hasValidGearInstanceIdentity(normalized)) {
    throw new TypeError("invalid saved build semantics");
  }
  return { migrated, normalized };
}

export function loadCurrentBuild() {
  let revision = readBuildStorageForLoad("current");
  const { storage } = revision;
  if (revision.unreadable) return rememberBuildStorageRevision(createDefaultBuild(), storage, revision);
  for (const key of [CURRENT_KEY, LEGACY_CURRENT_KEY]) {
    let raw;
    try { raw = key === CURRENT_KEY ? revision.current : storage?.getItem(key); }
    catch {
      recordStorageWarning("build-storage-unavailable", "legacy-current");
      return rememberBuildStorageRevision(createDefaultBuild(), storage, { ...revision, unreadable: true });
    }
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const { migrated, normalized } = normalizeSavedBuildRecord(parsed, {
        allowLegacy: key === LEGACY_CURRENT_KEY,
      });
      if (key === LEGACY_CURRENT_KEY || migrated !== parsed) {
        revision = tryPersistRecovery(storage, { current: JSON.stringify(normalized) }, revision, "current");
      }
      return rememberBuildStorageRevision(normalized, storage, revision);
    } catch {
      recordStorageWarning("current-build-corrupt", key === CURRENT_KEY ? "current" : "legacy-current");
      // 손상된 현재 키는 이전 버전 복구본을 계속 확인한다.
    }
  }
  return rememberBuildStorageRevision(createDefaultBuild(), storage, revision);
}

export function persistCurrentBuild(build, { pactModel = null, expectedRevision } = {}) {
  const normalized = normalizeBuild({ ...build, updatedAt: new Date().toISOString() });
  assertPactStorageInvariant(normalized, pactModel);
  const storage = getBrowserStorage();
  const revision = writeBuildStorage(storage, { current: JSON.stringify(normalized) },
    expectedBuildRevision(build, storage, expectedRevision));
  rememberBuildStorageRevision(build, storage, revision);
  return rememberBuildStorageRevision(normalized, storage, revision);
}

export function loadSavedBuilds() {
  let revision = readBuildStorageForLoad("saved");
  const { storage } = revision;
  if (revision.unreadable) return rememberBuildStorageRevision([], storage, revision);
  for (const key of [SAVED_KEY, LEGACY_SAVED_KEY]) {
    let raw;
    try { raw = key === SAVED_KEY ? revision.saved : storage?.getItem(key); }
    catch {
      recordStorageWarning("build-storage-unavailable", "legacy-saved");
      return rememberBuildStorageRevision([], storage, { ...revision, unreadable: true });
    }
    if (raw === null || raw === undefined) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        recordStorageWarning("saved-builds-invalid-shape", key === SAVED_KEY ? "saved" : "legacy-saved");
        continue;
      }
      let migratedAny = false;
      let corruptRecordFound = false;
      const normalized = [];
      for (const build of parsed) {
        try {
          const { migrated, normalized: normalizedBuild } = normalizeSavedBuildRecord(build, {
            allowLegacy: key === LEGACY_SAVED_KEY,
          });
          if (migrated !== build) migratedAny = true;
          normalized.push(normalizedBuild);
        } catch {
          corruptRecordFound = true;
        }
      }
      if (corruptRecordFound) {
        recordStorageWarning("saved-build-record-corrupt", key === SAVED_KEY ? "saved" : "legacy-saved");
      }
      if (key === LEGACY_SAVED_KEY || migratedAny || corruptRecordFound) {
        revision = tryPersistRecovery(storage, { saved: JSON.stringify(normalized) }, revision, "saved");
      }
      if (normalized.length || parsed.length === 0) return rememberBuildStorageRevision(normalized, storage, revision);
    } catch {
      recordStorageWarning("saved-builds-corrupt", key === SAVED_KEY ? "saved" : "legacy-saved");
      // 손상된 현재 키는 이전 버전 복구본을 계속 확인한다.
    }
  }
  return rememberBuildStorageRevision([], storage, revision);
}

export function saveBuildSnapshot(build, { pactModel = null, expectedRevision } = {}) {
  const normalized = normalizeBuild({ ...build, updatedAt: new Date().toISOString() });
  assertPactStorageInvariant(normalized, pactModel);
  const saved = loadSavedBuilds();
  const withoutSameId = saved.filter((candidate) => candidate.id !== normalized.id);
  const next = [normalized, ...withoutSameId].slice(0, 12);
  const storage = getBrowserStorage();
  const revision = writeBuildStorage(storage, { current: JSON.stringify(normalized), saved: JSON.stringify(next) }, {
    ...expectedBuildRevision(build, storage, expectedRevision),
    saved: getBuildStorageRevision(saved).saved,
    ...(getBuildStorageRevision(saved).unreadable ? { unreadable: true } : {}),
  });
  rememberBuildStorageRevision(build, storage, revision);
  rememberBuildStorageRevision(normalized, storage, revision);
  return next;
}

export function saveBuildAs(build, name, { pactModel = null, makeCurrent = true, originalBuild = build, expectedRevision } = {}) {
  const validatedSource = normalizeBuild(build);
  assertPactStorageInvariant(validatedSource, pactModel);
  const saved = loadSavedBuilds();
  const occupiedIds = new Set(saved.map((candidate) => candidate.id));
  if (typeof build?.id === "string" && build.id) occupiedIds.add(build.id);

  const baseId = `build-${Date.now()}`;
  let id = baseId;
  let suffix = 1;
  while (occupiedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const requestedName = typeof name === "string" ? name.trim() : "";
  const normalized = normalizeBuild({
    ...build,
    id,
    name: requestedName || build?.name,
    updatedAt: new Date().toISOString(),
  });
  assertPactStorageInvariant(normalized, pactModel);
  const originalSnapshot = saved.find((candidate) => candidate.id === build?.id)
    ?? normalizeBuild(originalBuild);
  const otherSnapshots = saved.filter((candidate) => candidate.id !== originalSnapshot.id);
  const next = [normalized, originalSnapshot, ...otherSnapshots].slice(0, 12);
  const storage = getBrowserStorage();
  const revision = writeBuildStorage(storage, {
    saved: JSON.stringify(next),
    ...(makeCurrent ? { current: JSON.stringify(normalized) } : {}),
  }, {
    ...(makeCurrent ? expectedBuildRevision(build, storage, expectedRevision) : {}),
    saved: getBuildStorageRevision(saved).saved,
    ...(getBuildStorageRevision(saved).unreadable ? { unreadable: true } : {}),
  });
  if (makeCurrent) rememberBuildStorageRevision(normalized, storage, revision);
  return { build: normalized, savedBuilds: next };
}

export function deleteSavedBuild(buildId) {
  const next = loadSavedBuilds().filter((build) => build.id !== buildId);
  getBrowserStorage()?.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

function createHeroMemoryInventoryId() {
  return createUnifiedInventoryId("hero-memory");
}

export function normalizeHeroMemoryInventoryRecord(input) {
  const id = typeof input?.id === "string" && input.id
    ? input.id
    : createHeroMemoryInventoryId();
  const instanceId = typeof input?.instanceId === "string" && input.instanceId
    ? input.instanceId
    : `inventory-${id}`;
  const memory = clonePlain(input?.memory, {});
  return {
    id,
    instanceId,
    label: typeof input?.label === "string" ? input.label : "",
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
    memory: {
      ...memory,
      instanceId,
    },
  };
}

export function createHeroMemoryInventoryRecord(memory, label = "") {
  return normalizeHeroMemoryInventoryRecord({ memory, label });
}

export function loadHeroMemoryInventory() {
  return loadLegacyInventory("heroMemory");
}

export function saveHeroMemoryInventoryRecord(record) {
  const normalized = normalizeHeroMemoryInventoryRecord({
    ...record,
    updatedAt: new Date().toISOString(),
  });
  saveUnifiedInventoryRecord(unifiedRecordFromLegacy("heroMemory", normalized));
  return loadHeroMemoryInventory();
}

export function deleteHeroMemoryInventoryRecord(recordId) {
  deleteUnifiedInventoryRecord(recordId, "heroMemory");
  return loadHeroMemoryInventory();
}

export function normalizeGearInventoryRecord(input) {
  const itemId = typeof input?.itemId === "string" ? input.itemId : "";
  const id = typeof input?.id === "string" && input.id ? input.id : createUnifiedInventoryId("gear");
  return {
    id,
    instanceId:
      typeof input?.instanceId === "string" && input.instanceId
        ? input.instanceId
        : `inventory-${id}`,
    itemId,
    slotIndex: normalizeSlotIndex(input?.slotIndex),
    label: typeof input?.label === "string" ? input.label : "",
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
    gearAffix: typeof input?.gearAffix === "string" ? input.gearAffix : "",
    gearRolls: clonePlain(input?.gearRolls, {}),
    gearCrafts: clonePlain(input?.gearCrafts, {}),
    gearCorrupted: Boolean(input?.gearCorrupted),
    gearLegendaryDraft: clonePlain(input?.gearLegendaryDraft, null),
  };
}

export function createGearInventoryRecord(build, itemId, slotIndex = 0, label = "") {
  const normalized = normalizeBuild(build);
  const normalizedSlotIndex = normalizeSlotIndex(slotIndex);
  const nestedSlot = normalized.gear?.slots?.[normalizedSlotIndex];
  const matchingSlot = nestedSlot?.itemId === itemId ? nestedSlot : null;
  const sharedValues = matchingSlot
    && normalized.gear.slots.filter((slot) => slot?.itemId === itemId).length > 1
    ? {}
    : normalized;
  return normalizeGearInventoryRecord({
    itemId,
    slotIndex: normalizedSlotIndex,
    label,
    instanceId: matchingSlot?.instanceId,
    gearAffix:
      typeof matchingSlot?.affixText === "string"
        ? matchingSlot.affixText
        : sharedValues.gearAffixes?.[itemId] ?? "",
    gearRolls: matchingSlot?.rolls ?? sharedValues.gearRolls?.[itemId] ?? {},
    gearCrafts: matchingSlot?.crafts ?? sharedValues.gearCrafts?.[itemId] ?? {},
    gearCorrupted: matchingSlot && Object.hasOwn(matchingSlot, "corrupted")
      ? Boolean(matchingSlot.corrupted)
      : Boolean(sharedValues.gearCorruptions?.[itemId]),
    gearLegendaryDraft: matchingSlot && Object.hasOwn(matchingSlot, "legendaryDraft")
      ? matchingSlot.legendaryDraft
      : sharedValues.gearLegendaryDrafts?.[itemId] ?? null,
  });
}

export function applyGearInventoryRecord(build, record, targetSlotIndex = record?.slotIndex) {
  const normalized = normalizeBuild(build);
  const normalizedRecord = normalizeGearInventoryRecord(record);
  if (!normalizedRecord.itemId) return normalized;

  const slotIndex = normalizeSlotIndex(targetSlotIndex);
  const currentGear = [...(normalized.selections.gear ?? [])];
  const nextGear = Array.from({ length: 10 }, (_, index) => currentGear[index] ?? null);
  nextGear[slotIndex] = normalizedRecord.itemId;
  const nestedGearSlots = Array.from(
    { length: 10 },
    (_, index) => normalized.gear?.slots?.[index] ?? null,
  );
  const currentNestedSlot = nestedGearSlots[slotIndex];
  nestedGearSlots[slotIndex] = {
    ...(currentNestedSlot ?? {}),
    instanceId: normalizedRecord.instanceId,
    itemId: normalizedRecord.itemId,
    affixText: normalizedRecord.gearAffix,
    rolls: normalizedRecord.gearRolls,
    crafts: normalizedRecord.gearCrafts,
    corrupted: normalizedRecord.gearCorrupted,
    legendaryDraft: normalizedRecord.gearLegendaryDraft,
  };

  // The legacy item map represents the last populated field for an item ID.
  // Writing the restored record directly would look like an explicit edit to
  // every equipped copy when a different copy remains in a later slot.
  const projectedSlot = Object.assign({}, ...nestedGearSlots.filter(
    (slot) => slot?.itemId === normalizedRecord.itemId,
  ));

  return normalizeBuild({
    ...normalized,
    gear: {
      ...(normalized.gear ?? {}),
      slots: nestedGearSlots,
    },
    selections: {
      ...normalized.selections,
      gear: trimEmptySlots(nextGear),
    },
    gearAffixes: {
      ...(normalized.gearAffixes ?? {}),
      [normalizedRecord.itemId]: projectedSlot.affixText,
    },
    gearRolls: {
      ...(normalized.gearRolls ?? {}),
      [normalizedRecord.itemId]: projectedSlot.rolls,
    },
    gearCrafts: {
      ...(normalized.gearCrafts ?? {}),
      [normalizedRecord.itemId]: projectedSlot.crafts,
    },
    gearCorruptions: {
      ...(normalized.gearCorruptions ?? {}),
      [normalizedRecord.itemId]: projectedSlot.corrupted,
    },
    gearLegendaryDrafts: {
      ...(normalized.gearLegendaryDrafts ?? {}),
      [normalizedRecord.itemId]: projectedSlot.legendaryDraft,
    },
  });
}

export function loadGearInventory() {
  return loadLegacyInventory("gear");
}

export function saveGearInventoryRecord(record) {
  const normalized = normalizeGearInventoryRecord({ ...record, updatedAt: new Date().toISOString() });
  saveUnifiedInventoryRecord(unifiedRecordFromLegacy("gear", normalized));
  return loadGearInventory();
}

export function deleteGearInventoryRecord(recordId) {
  deleteUnifiedInventoryRecord(recordId, "gear");
  return loadGearInventory();
}

const UNIFIED_INVENTORY_KINDS = new Set([
  "gear",
  "heroMemory",
  "divinitySlate",
  "prism",
]);

function createUnifiedInventoryId(kind) {
  // New copies must stay distinct across tabs and restarts, even with a frozen clock.
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return `${kind}-record-${crypto.randomUUID()}`;
  if (typeof crypto?.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return `${kind}-record-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  throw new InventoryStorageUnavailableError("secure inventory identity unavailable");
}

function normalizeUnifiedInventoryKind(value) {
  const aliases = {
    slate: "divinitySlate",
    hero_memory: "heroMemory",
  };
  const kind = aliases[value] ?? value;
  return UNIFIED_INVENTORY_KINDS.has(kind) ? kind : null;
}

function stringValue(value) {
  return typeof value === "string" && value ? value : null;
}

function inventoryEnvelope(input, source, kind) {
  const id = stringValue(input?.id) ?? stringValue(source?.id) ?? createUnifiedInventoryId(kind);
  return {
    schemaVersion: UNIFIED_INVENTORY_SCHEMA_VERSION,
    id,
    kind,
    label: typeof input?.label === "string"
      ? input.label
      : typeof source?.label === "string" ? source.label : "",
    updatedAt: typeof input?.updatedAt === "string"
      ? input.updatedAt
      : typeof source?.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
  };
}

export function normalizeUnifiedInventoryRecord(input) {
  if (!isPlainObject(input)) return null;
  const kind = normalizeUnifiedInventoryKind(input.kind ?? input.type);
  if (!kind) return null;
  const source = isPlainObject(input.data) ? input.data : input;
  const envelope = inventoryEnvelope(input, source, kind);

  if (kind === "gear") {
    const instanceId = stringValue(input.instanceId) ?? stringValue(source.instanceId);
    const gear = normalizeGearInventoryRecord({
      ...source,
      id: envelope.id,
      ...(instanceId ? { instanceId } : {}),
      label: envelope.label,
      updatedAt: envelope.updatedAt,
    });
    if (!gear.itemId) return null;
    return {
      ...envelope,
      instanceId: gear.instanceId,
      data: {
        itemId: gear.itemId,
        slotIndex: gear.slotIndex,
        gearAffix: gear.gearAffix,
        gearRolls: gear.gearRolls,
        gearCrafts: gear.gearCrafts,
        gearCorrupted: gear.gearCorrupted,
        gearLegendaryDraft: gear.gearLegendaryDraft,
      },
    };
  }

  if (kind === "heroMemory") {
    const memorySource = isPlainObject(source.memory)
      ? source.memory
      : isPlainObject(input.memory) ? input.memory : null;
    if (!memorySource) return null;
    const instanceId = stringValue(input.instanceId)
      ?? stringValue(source.instanceId)
      ?? stringValue(memorySource.instanceId)
      ?? `inventory-${envelope.id}`;
    const slotIndex = Number(source.slotIndex ?? input.slotIndex);
    return {
      ...envelope,
      instanceId,
      data: {
        memory: {
          ...clonePlain(memorySource, {}),
          instanceId,
        },
        ...(Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex <= 2 ? { slotIndex } : {}),
      },
    };
  }

  if (kind === "divinitySlate") {
    const slateSource = isPlainObject(source.slate)
      ? source.slate
      : stringValue(source.slateId) ? source : null;
    if (!slateSource || !stringValue(slateSource.slateId)) return null;
    const instanceId = stringValue(input.instanceId)
      ?? stringValue(source.instanceId)
      ?? stringValue(slateSource.instanceId)
      ?? `inventory-${envelope.id}`;
    return {
      ...envelope,
      instanceId,
      data: {
        slate: {
          ...clonePlain(slateSource, {}),
          instanceId,
        },
        sourceBoardId: stringValue(source.sourceBoardId ?? input.sourceBoardId),
      },
    };
  }

  const prismSource = isPlainObject(source.prism)
    ? source.prism
    : (stringValue(source.prismItemSlug) || stringValue(source.prismId)) ? source : null;
  if (!prismSource) return null;
  const instanceId = stringValue(input.instanceId)
    ?? stringValue(source.instanceId)
    ?? stringValue(prismSource.instanceId)
    ?? `inventory-${envelope.id}`;
  return {
    ...envelope,
    instanceId,
    data: {
      prism: {
        ...clonePlain(prismSource, {}),
        id: instanceId,
        instanceId,
      },
    },
  };
}

function unifiedRecordFromLegacy(kind, record) {
  return normalizeUnifiedInventoryRecord({
    kind,
    id: record?.id,
    instanceId: record?.instanceId,
    label: record?.label,
    updatedAt: record?.updatedAt,
    data: record,
  });
}

function unifiedRecordKey(record) {
  return `${record.kind}:${record.id}`;
}

function recordTimestamp(record) {
  const timestamp = Date.parse(record?.updatedAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function stableInventoryJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableInventoryJson).join(",")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${stableInventoryJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

// A reproducible provisional ID makes read-only selection safe before migration.
// The digest is not used to merge records: reserved IDs and occurrence suffixes
// disambiguate even a digest collision. Persist the assignment in the same receipt.
function migratedInventoryId(entry, reserved) {
  const text = stableInventoryJson([entry.field, entry.raw]);
  let left = 2166136261, right = 2246822507;
  for (let index = 0; index < text.length; index += 1) {
    left = Math.imul(left ^ text.charCodeAt(index), 16777619);
    right = Math.imul(right ^ text.charCodeAt(index), 3266489909);
  }
  const base = `${entry.kind}-legacy-${(left >>> 0).toString(16)}${(right >>> 0).toString(16)}`;
  let id = base, suffix = 1;
  while (reserved.has(`${entry.kind}:${id}`)) id = `${base}-${suffix++}`;
  reserved.add(`${entry.kind}:${id}`);
  return id;
}

function normalizeStoredInventoryEntry(entry, id) {
  const raw = { ...entry.raw, id };
  // Missing historical timestamps must not turn into a new edit on every read.
  const source = entry.field === "unified" && isPlainObject(raw.data) ? raw.data : raw;
  raw.updatedAt = stringValue(raw.updatedAt) ?? stringValue(source.updatedAt) ?? "1970-01-01T00:00:00.000Z";
  if (entry.field === "unified") return normalizeUnifiedInventoryRecord(raw);
  return unifiedRecordFromLegacy(entry.kind, entry.kind === "gear"
    ? normalizeGearInventoryRecord(raw) : normalizeHeroMemoryInventoryRecord(raw));
}

function sameInventoryMirror(left, right) {
  const comparable = (record) => {
    // Legacy memories do not store the optional application target slot.
    const copy = record.kind === "heroMemory" ? legacyHeroMemoryRecord(record) : record;
    const { updatedAt, ...content } = copy;
    return content;
  };
  return sameJson(comparable(left), comparable(right));
}

function reconcileInventoryEntries(entries) {
  const reserved = new Set(entries.filter(({ id }) => id).map(({ kind, id }) => `${kind}:${id}`));
  const merged = new Map();
  for (const entry of entries) {
    let record = normalizeStoredInventoryEntry(entry, entry.id ?? migratedInventoryId(entry, reserved));
    if (!record) continue;
    let key = unifiedRecordKey(record);
    const existing = merged.get(key);
    // Only identical copies in different storage documents are mirrors. Rows
    // within one document and differing payloads must remain separate copies.
    if (existing && !existing.fields.has(entry.field) && sameInventoryMirror(existing.record, record)) {
      existing.fields.add(entry.field);
      if (recordTimestamp(record) > recordTimestamp(existing.record)) existing.record.updatedAt = record.updatedAt;
    } else {
      if (existing) {
        record = normalizeStoredInventoryEntry(entry, migratedInventoryId(entry, reserved));
        key = unifiedRecordKey(record);
      }
      merged.set(key, { record, fields: new Set([entry.field]) });
    }
    entry.record = record;
  }
  return [...merged.values()].map(({ record }) => record);
}

function serializeUnifiedInventory(records) {
  return JSON.stringify({
    schemaVersion: UNIFIED_INVENTORY_SCHEMA_VERSION,
    records,
  });
}

function parseInventorySnapshot(snapshot, { strict = false } = {}) {
  const raw = snapshot.unified;
  const entries = [];
  let valid = !snapshot.recoveryPending;
  const invalid = (code, scope) => {
    valid = false;
    recordStorageWarning(code, scope);
  };

  if (raw !== null && raw !== undefined) {
    try {
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed) || !Array.isArray(parsed.records)) {
        invalid("unified-inventory-invalid-shape", "unified-inventory");
      } else if (parsed.schemaVersion !== UNIFIED_INVENTORY_SCHEMA_VERSION) {
        invalid("unified-inventory-unsupported-version", "unified-inventory");
      } else {
        for (const item of parsed.records) {
          const kind = normalizeUnifiedInventoryKind(item?.kind ?? item?.type);
          const source = isPlainObject(item?.data) ? item.data : item;
          const entry = { field: "unified", kind, raw: item, id: stringValue(item?.id) ?? stringValue(source?.id) };
          if (!isPlainObject(item) || !kind || !normalizeStoredInventoryEntry(entry, entry.id ?? "validate")) {
            invalid("unified-inventory-record-invalid", "unified-inventory");
          } else entries.push(entry);
        }
      }
    } catch {
      invalid("unified-inventory-corrupt", "unified-inventory");
    }
  }

  function legacy(field, scope, isValid) {
    if (snapshot[field] === null) return [];
    try {
      const parsed = JSON.parse(snapshot[field]);
      if (!Array.isArray(parsed) || parsed.some((item) => !isValid(item))) {
        invalid(`${scope}-invalid-shape`, scope);
        return [];
      }
      const rows = parsed.map((item) => ({ field, kind: field, raw: item, id: stringValue(item.id) }));
      entries.push(...rows);
      return rows;
    } catch {
      invalid(`${scope}-corrupt`, scope);
      return [];
    }
  }
  const gearEntries = legacy("gear", "gear-inventory",
    (item) => isPlainObject(item) && typeof item.itemId === "string" && Boolean(item.itemId));
  const memoryEntries = legacy("heroMemory", "hero-memory-inventory",
    (item) => isPlainObject(item) && isPlainObject(item.memory));
  const records = reconcileInventoryEntries(entries);
  const migrationChanges = {};
  for (const [field, rows] of [["gear", gearEntries], ["heroMemory", memoryEntries]]) {
    if (rows.some((entry) => entry.raw.id !== entry.record.id)) {
      // Retain unknown historical fields instead of rewriting the whole payload.
      migrationChanges[field] = JSON.stringify(rows.map((entry) => ({ ...entry.raw, id: entry.record.id })));
    }
  }
  if (strict && !valid) {
    if (snapshot.recoveryPending) throw new InventoryStorageConflictError("inventory write or recovery pending");
    throw new InventoryStorageUnavailableError("unreadable inventory document");
  }
  function legacyView(kind, rows, convert) {
    const historical = new Map(rows.map((entry) => [entry.record.id, entry.raw]));
    // Older writers could truncate the legacy mirror. Include every reconciled
    // copy while retaining fields known only to the historical document.
    return records.filter((record) => record.kind === kind)
      .map((record) => ({ ...historical.get(record.id), ...convert(record) }));
  }
  return { valid, records, migrationChanges,
    legacyRecords: [...gearEntries, ...memoryEntries].map((entry) => entry.record),
    gear: legacyView("gear", gearEntries, legacyGearRecord),
    heroMemory: legacyView("heroMemory", memoryEntries, legacyHeroMemoryRecord),
  };
}

function loadLegacyInventory(field) {
  const scope = field === "gear" ? "gear-inventory" : "hero-memory-inventory";
  try {
    const storage = getBrowserStorage();
    if (!storage) return [];
    const snapshot = readInventoryStorageSnapshot(storage);
    if (snapshot.recoveryPending) recordStorageWarning("build-storage-recovery-pending", scope);
    return parseInventorySnapshot(snapshot)[field];
  } catch {
    recordStorageWarning("build-storage-unavailable", scope);
    return [];
  }
}

// Startup and inventory re-entry recover under the same lock as saves/deletes.
// Keep ordinary synchronous reads read-only in browsers.
export async function recoverUnifiedInventory() {
  try {
    return await runInventoryStorageMutation(loadUnifiedInventory);
  } catch {
    recordStorageWarning("build-storage-unavailable", "unified-inventory");
    return loadUnifiedInventory();
  }
}

export function loadUnifiedInventory() {
  const scope = "unified-inventory";
  try {
    const storage = getBrowserStorage();
    if (!storage) return [];
    const snapshot = readInventoryStorageSnapshot(storage);
    if (snapshot.recoveryPending) recordStorageWarning("build-storage-recovery-pending", scope);
    const state = parseInventorySnapshot(snapshot);
    const serialized = serializeUnifiedInventory(state.records);
    // Browsers migrate only inside the same Web Lock as explicit writes.
    if (state.valid && canWriteInventoryStorage() && state.legacyRecords.length
      && (serialized !== snapshot.unified || Object.keys(state.migrationChanges).length)) {
      try { writeInventoryStorage(storage, { unified: serialized, ...state.migrationChanges }, snapshot); }
      catch { recordStorageWarning("build-storage-recovery-write-failed", scope); }
    }
    return state.records;
  } catch {
    recordStorageWarning("build-storage-unavailable", scope);
    return [];
  }
}

function legacyGearRecord(record) {
  return normalizeGearInventoryRecord({
    id: record.id,
    instanceId: record.instanceId,
    label: record.label,
    updatedAt: record.updatedAt,
    ...record.data,
  });
}

function legacyHeroMemoryRecord(record) {
  return normalizeHeroMemoryInventoryRecord({
    id: record.id,
    instanceId: record.instanceId,
    label: record.label,
    updatedAt: record.updatedAt,
    memory: record.data.memory,
  });
}

function legacyInventoryChanges(state, record) {
  if (record.kind === "gear") {
    const legacy = { ...state.gear.find(({ id }) => id === record.id), ...legacyGearRecord(record) };
    const next = [legacy, ...state.gear.filter(({ id }) => id !== legacy.id)];
    return { gear: JSON.stringify(next) };
  }
  if (record.kind === "heroMemory") {
    const legacy = { ...state.heroMemory.find(({ id }) => id === record.id), ...legacyHeroMemoryRecord(record) };
    const next = [legacy, ...state.heroMemory.filter(({ id }) => id !== legacy.id)];
    return { heroMemory: JSON.stringify(next) };
  }
  return {};
}

function inventoryForWrite() {
  const storage = getBrowserStorage();
  const snapshot = readInventoryStorageSnapshot(storage);
  return { storage, snapshot, state: parseInventorySnapshot(snapshot, { strict: true }) };
}

export function saveUnifiedInventoryRecord(record) {
  const normalized = normalizeUnifiedInventoryRecord({
    ...record,
    updatedAt: new Date().toISOString(),
  });
  if (!normalized) {
    recordStorageWarning("unified-inventory-record-invalid", "unified-inventory");
    throw new InventoryStorageUnavailableError("invalid inventory record");
  }
  const { storage, snapshot, state } = inventoryForWrite();
  const next = [
    normalized,
    ...state.records.filter((candidate) => unifiedRecordKey(candidate) !== unifiedRecordKey(normalized)),
  ];
  writeInventoryStorage(storage, {
    unified: serializeUnifiedInventory(next), ...state.migrationChanges, ...legacyInventoryChanges(state, normalized),
  }, snapshot);
  return next;
}

export function deleteUnifiedInventoryRecord(recordId, kind = null) {
  const normalizedKind = kind === null ? null : normalizeUnifiedInventoryKind(kind);
  const { storage, snapshot, state } = inventoryForWrite();
  const current = state.records;
  const removed = current.filter((record) => (
    record.id === recordId && (normalizedKind === null || record.kind === normalizedKind)
  ));
  const next = current.filter((record) => !removed.includes(record));
  const changes = { unified: serializeUnifiedInventory(next), ...state.migrationChanges };
  if (removed.some((record) => record.kind === "gear")) {
    changes.gear = JSON.stringify(state.gear.filter(({ id }) => id !== recordId));
  }
  if (removed.some((record) => record.kind === "heroMemory")) {
    changes.heroMemory = JSON.stringify(state.heroMemory.filter(({ id }) => id !== recordId));
  }
  writeInventoryStorage(storage, changes, snapshot);
  return next;
}

export function createUnifiedGearInventoryRecord(
  build,
  itemId,
  slotIndex = 0,
  label = "",
  options = {},
) {
  const legacy = createGearInventoryRecord(build, itemId, slotIndex, label);
  return normalizeUnifiedInventoryRecord({
    kind: "gear",
    id: options.id ?? legacy.id,
    instanceId: options.instanceId ?? legacy.instanceId,
    label,
    data: {
      ...legacy,
      instanceId: options.instanceId ?? legacy.instanceId,
    },
  });
}

export function createUnifiedHeroMemoryInventoryRecord(memory, label = "", options = {}) {
  const legacy = createHeroMemoryInventoryRecord(memory, label);
  return normalizeUnifiedInventoryRecord({
    kind: "heroMemory",
    id: options.id ?? legacy.id,
    instanceId: options.instanceId ?? legacy.instanceId,
    label,
    data: {
      ...legacy,
      ...(Number.isInteger(options.slotIndex) ? { slotIndex: options.slotIndex } : {}),
      memory: {
        ...legacy.memory,
        instanceId: options.instanceId ?? legacy.instanceId,
      },
    },
  });
}

export function createUnifiedDivinitySlateInventoryRecord(
  build,
  instanceId,
  label = "",
  options = {},
) {
  const normalized = normalizeBuild(build);
  const board = normalized.divinity?.boards?.find((candidate) => (
    candidate?.slateInventory?.some((slate) => slate?.instanceId === instanceId)
  ));
  const slate = board?.slateInventory?.find((candidate) => candidate?.instanceId === instanceId);
  if (!slate) return null;
  const recordId = options.id ?? createUnifiedInventoryId("divinitySlate");
  const storedInstanceId = options.instanceId ?? `inventory-${recordId}`;
  return normalizeUnifiedInventoryRecord({
    kind: "divinitySlate",
    id: recordId,
    instanceId: storedInstanceId,
    label,
    data: {
      sourceBoardId: board.boardId,
      slate: {
        ...slate,
        instanceId: storedInstanceId,
      },
    },
  });
}

export function createUnifiedPrismInventoryRecord(
  build,
  instanceId,
  label = "",
  options = {},
) {
  const normalized = normalizeBuild(build);
  const prism = normalized.talents?.prismInventory?.find((candidate) => (
    candidate?.instanceId === instanceId || candidate?.id === instanceId
  ));
  if (!prism) return null;
  const recordId = options.id ?? createUnifiedInventoryId("prism");
  const storedInstanceId = options.instanceId ?? `inventory-${recordId}`;
  return normalizeUnifiedInventoryRecord({
    kind: "prism",
    id: recordId,
    instanceId: storedInstanceId,
    label,
    data: {
      prism: {
        ...prism,
        id: storedInstanceId,
        instanceId: storedInstanceId,
      },
    },
  });
}

function applyUnifiedHeroMemoryRecord(build, record, options) {
  const slotIndex = Number(options.slotIndex ?? record.data.slotIndex);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2) return build;
  const memory = {
    ...clonePlain(record.data.memory, {}),
    instanceId: record.instanceId,
  };
  const memories = Array.from({ length: 3 }, (_, index) => build.hero?.memories?.[index] ?? null);
  memories[slotIndex] = memory;
  const heroMemorySelections = Array.from(
    { length: 3 },
    (_, index) => build.selections?.heroMemory?.[index] ?? null,
  );
  heroMemorySelections[slotIndex] = memory.memoryTypeId ?? null;
  return normalizeBuild({
    ...build,
    hero: { ...build.hero, memories },
    selections: { ...build.selections, heroMemory: trimEmptySlots(heroMemorySelections) },
  });
}

function applyUnifiedDivinitySlateRecord(build, record, options) {
  const instanceId = record.instanceId;
  let boards = (build.divinity?.boards ?? []).map((board) => ({
    ...board,
    cells: Array.isArray(board?.cells)
      ? board.cells.filter((cell) => cell?.slateInstanceId !== instanceId)
      : [],
    slateInventory: Array.isArray(board?.slateInventory)
      ? board.slateInventory.filter((slate) => slate?.instanceId !== instanceId)
      : [],
  }));
  const targetBoardId = stringValue(options.boardId)
    ?? stringValue(build.divinity?.activeBoardId)
    ?? stringValue(boards[0]?.boardId)
    ?? "inventory-divinity-board";
  let targetIndex = boards.findIndex((board) => board.boardId === targetBoardId);
  if (targetIndex < 0) {
    boards = [...boards, createDivinityBoard({ boardId: targetBoardId })];
    targetIndex = boards.length - 1;
  }
  const slate = {
    ...clonePlain(record.data.slate, {}),
    instanceId,
    anchor: null,
  };
  boards[targetIndex] = {
    ...boards[targetIndex],
    slateInventory: [slate, ...(boards[targetIndex].slateInventory ?? [])],
  };
  return normalizeBuild({
    ...build,
    divinity: { boards, activeBoardId: targetBoardId },
  });
}

function applyUnifiedPrismRecord(build, record) {
  const prism = {
    ...clonePlain(record.data.prism, {}),
    id: record.instanceId,
    instanceId: record.instanceId,
  };
  const prismInventory = [
    prism,
    ...(build.talents?.prismInventory ?? []).filter((candidate) => (
      candidate?.instanceId !== record.instanceId && candidate?.id !== record.instanceId
    )),
  ];
  const placedPrism = build.talents?.placedPrism?.instanceId === record.instanceId
    ? null
    : build.talents?.placedPrism ?? null;
  return normalizeBuild({
    ...build,
    talents: { ...build.talents, prismInventory, placedPrism },
  });
}

export function applyUnifiedInventoryRecord(build, input, options = {}) {
  const normalizedBuild = normalizeBuild(build);
  const record = normalizeUnifiedInventoryRecord(input);
  if (!record) return normalizedBuild;
  if (record.kind === "gear") {
    return applyGearInventoryRecord(
      normalizedBuild,
      legacyGearRecord(record),
      options.slotIndex ?? record.data.slotIndex,
    );
  }
  if (record.kind === "heroMemory") {
    return applyUnifiedHeroMemoryRecord(normalizedBuild, record, options);
  }
  if (record.kind === "divinitySlate") {
    return applyUnifiedDivinitySlateRecord(normalizedBuild, record, options);
  }
  return applyUnifiedPrismRecord(normalizedBuild, record);
}

export function exportBuild(build, { pactModel = null } = {}) {
  const normalized = normalizeBuild(build);
  assertPactStorageInvariant(normalized, pactModel);
  return serializeBuildDocument(normalized);
}

export function importBuild(text) {
  return normalizeBuild(deserializeBuildDocument(text));
}
