// Browser mutations hold a Web Lock; the receipt also protects interrupted
// multi-key writes and synchronous non-browser storage adapters.
export const INVENTORY_STORAGE_KEYS = {
  unified: "tob.inventory.v1",
  gear: "tob.gearInventory.v1",
  heroMemory: "tob.heroMemoryInventory.v1",
};
export const INVENTORY_TRANSACTION_KEY = "tob.inventoryTransaction.v1";
const fields = Object.keys(INVENTORY_STORAGE_KEYS);
const owner = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
let browserWriteDepth = 0;

export class InventoryStorageConflictError extends Error {
  name = "InventoryStorageConflictError";
}
export class InventoryStorageUnavailableError extends Error {
  name = "InventoryStorageUnavailableError";
}

const isBrowser = () => Boolean(globalThis.window?.document);
export const canWriteInventoryStorage = () => !isBrowser() || browserWriteDepth > 0;

export function runInventoryStorageMutation(callback) {
  if (!isBrowser()) return callback();
  if (!globalThis.navigator?.locks?.request) {
    throw new InventoryStorageUnavailableError("exclusive inventory storage unavailable");
  }
  return globalThis.navigator.locks.request("tob.inventory.v1.write", () => {
    browserWriteDepth += 1;
    try { return callback(); }
    finally { browserWriteDepth -= 1; }
  });
}

function removeKey(storage, key) {
  if (storage.removeItem) storage.removeItem(key);
  else storage.setItem(key, "");
}

function clearReceipt(storage, receipt) {
  if (storage.getItem(INVENTORY_TRANSACTION_KEY) === receipt) removeKey(storage, INVENTORY_TRANSACTION_KEY);
}

function readValues(storage) {
  return Object.fromEntries(fields.map((field) => [field, storage.getItem(INVENTORY_STORAGE_KEYS[field])]));
}

function validValues(value) {
  return value && fields.every((field) => value[field] === null || typeof value[field] === "string");
}

function restore(storage, transaction, receipt) {
  for (const field of [...fields].reverse()) {
    if (storage.getItem(INVENTORY_TRANSACTION_KEY) !== receipt) {
      throw new InventoryStorageConflictError("inventory recovery changed");
    }
    const key = INVENTORY_STORAGE_KEYS[field];
    const current = storage.getItem(key);
    if (current === transaction.before[field]) continue;
    if (current !== transaction.after[field]) {
      throw new InventoryStorageConflictError("inventory changed during recovery");
    }
    if (transaction.before[field] === null) removeKey(storage, key);
    else storage.setItem(key, transaction.before[field]);
  }
  clearReceipt(storage, receipt);
}

export function readInventoryStorageSnapshot(storage) {
  if (!storage) throw new InventoryStorageUnavailableError("inventory storage unavailable");
  const values = readValues(storage);
  const receipt = storage.getItem(INVENTORY_TRANSACTION_KEY);
  if (!receipt) return values;
  let transaction;
  try { transaction = JSON.parse(receipt); } catch {
    throw new InventoryStorageUnavailableError("invalid inventory recovery receipt");
  }
  if (transaction?.version !== 1 || !validValues(transaction.before) || !validValues(transaction.after)
    || typeof transaction.owner !== "string" || !Number.isFinite(transaction.expiresAt)) {
    throw new InventoryStorageUnavailableError("invalid inventory recovery receipt");
  }
  if (fields.every((field) => values[field] === transaction.after[field])) {
    if (canWriteInventoryStorage()) {
      try { clearReceipt(storage, receipt); } catch { /* A committed receipt can be cleared later. */ }
    }
    return values;
  }
  // An acquired browser lock proves the previous writer no longer holds it.
  // Synchronous adapters still need the lease because they have no Web Lock.
  const waitingForOwner = !isBrowser() && transaction.owner !== owner && transaction.expiresAt > Date.now();
  if (!canWriteInventoryStorage() || waitingForOwner) {
    return { ...transaction.before, recoveryPending: true };
  }
  try {
    restore(storage, transaction, receipt);
    return transaction.before;
  } catch {
    // The original bytes remain in the durable receipt if rollback is denied.
    return { ...transaction.before, recoveryPending: true };
  }
}

export function writeInventoryStorage(storage, changes, expected) {
  if (!canWriteInventoryStorage()) {
    throw new InventoryStorageUnavailableError("inventory write requires an exclusive lock");
  }
  const before = readInventoryStorageSnapshot(storage);
  if (before.recoveryPending) throw new InventoryStorageConflictError("inventory recovery or another writer pending");
  if (fields.some((field) => before[field] !== expected[field])) {
    throw new InventoryStorageConflictError("inventory changed before save");
  }
  const after = { ...before, ...changes };
  const changed = fields.filter((field) => before[field] !== after[field]);
  if (!changed.length) return after;
  const transaction = { version: 1, owner, expiresAt: Date.now() + 15000, before, after };
  const receipt = JSON.stringify(transaction);
  // Reserve backup space before touching any inventory document.
  storage.setItem(INVENTORY_TRANSACTION_KEY, receipt);
  try {
    if (storage.getItem(INVENTORY_TRANSACTION_KEY) !== receipt
      || fields.some((field) => storage.getItem(INVENTORY_STORAGE_KEYS[field]) !== before[field])) {
      throw new InventoryStorageConflictError("inventory changed during save");
    }
    for (const field of changed) {
      if (storage.getItem(INVENTORY_TRANSACTION_KEY) !== receipt) {
        throw new InventoryStorageConflictError("inventory writer changed");
      }
      storage.setItem(INVENTORY_STORAGE_KEYS[field], after[field]);
    }
  } catch (error) {
    try { restore(storage, transaction, receipt); } catch { /* Retain the backup for later recovery. */ }
    throw error;
  }
  try { clearReceipt(storage, receipt); } catch { /* A committed receipt is safe to retain. */ }
  return after;
}
