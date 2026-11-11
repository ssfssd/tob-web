export const CURRENT_BUILD_STORAGE_KEY = "tob.currentBuild.v2";
export const SAVED_BUILDS_STORAGE_KEY = "tob.savedBuilds.v2";
const TRANSACTION_KEY = "tob.buildTransaction.v1";
const transactionOwner = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class BuildStorageConflictError extends Error {}
export class BuildStorageUnavailableError extends Error {}

function requireStorage(storage) {
  if (!storage) throw new BuildStorageUnavailableError("build storage unavailable");
  return storage;
}

function removeKey(storage, key) {
  if (storage.removeItem) storage.removeItem(key);
  else storage.setItem(key, "");
}

function clearTransaction(storage, receipt) {
  try {
    if (storage.getItem(TRANSACTION_KEY) === receipt) removeKey(storage, TRANSACTION_KEY);
  } catch {
    // A retained receipt is resolved on the next read; it is not a failed commit.
  }
}

export function readBuildStorage(storage) {
  requireStorage(storage);
  const current = storage.getItem(CURRENT_BUILD_STORAGE_KEY);
  const saved = storage.getItem(SAVED_BUILDS_STORAGE_KEY);
  const receipt = storage.getItem(TRANSACTION_KEY);
  if (!receipt) return { current, saved };
  let transaction;
  try { transaction = JSON.parse(receipt); } catch {
    throw new BuildStorageUnavailableError("invalid build transaction");
  }
  if (transaction?.version !== 1 || !["beforeCurrent", "beforeSaved", "afterCurrent", "afterSaved"]
    .every((key) => transaction[key] === null || typeof transaction[key] === "string")) {
    throw new BuildStorageUnavailableError("invalid build transaction");
  }
  const committed = current === transaction.afterCurrent && saved === transaction.afterSaved;
  if (!committed && transaction.owner !== transactionOwner && transaction.expiresAt > Date.now()) {
    // A different tab may still be between its two synchronous writes.
    return { current: transaction.beforeCurrent, saved: transaction.beforeSaved, recoveryPending: true };
  }
  if (saved === transaction.beforeSaved && current === transaction.afterCurrent
    && current !== transaction.beforeCurrent) {
    try {
      if (transaction.beforeCurrent === null) removeKey(storage, CURRENT_BUILD_STORAGE_KEY);
      else storage.setItem(CURRENT_BUILD_STORAGE_KEY, transaction.beforeCurrent);
    } catch {
      // Keep the durable backup readable even if rollback writes are also denied.
      return { current: transaction.beforeCurrent, saved, recoveryPending: true };
    }
    clearTransaction(storage, receipt);
    return { current: transaction.beforeCurrent, saved };
  }
  // Both writes committed, neither started, or another tab has since changed them.
  // Never roll a newer external value back to this transaction's older snapshot.
  clearTransaction(storage, receipt);
  return { current, saved };
}

export function writeBuildStorage(storage, changes, expected = {}) {
  const before = readBuildStorage(storage);
  if (before.recoveryPending || expected.unreadable) {
    throw new BuildStorageUnavailableError("build storage recovery required");
  }
  for (const key of ["current", "saved"]) {
    if (Object.hasOwn(expected, key) && expected[key] !== before[key]) {
      throw new BuildStorageConflictError("build changed in another tab");
    }
  }
  const after = { ...before, ...changes };
  if (Object.hasOwn(changes, "current") && Object.hasOwn(changes, "saved")) {
    const receipt = JSON.stringify({
      version: 1,
      owner: transactionOwner,
      expiresAt: Date.now() + 5000,
      beforeCurrent: before.current,
      beforeSaved: before.saved,
      afterCurrent: after.current,
      afterSaved: after.saved,
    });
    // Reserve recovery space before modifying either user document.
    storage.setItem(TRANSACTION_KEY, receipt);
    try {
      if (storage.getItem(TRANSACTION_KEY) !== receipt
        || storage.getItem(CURRENT_BUILD_STORAGE_KEY) !== before.current
        || storage.getItem(SAVED_BUILDS_STORAGE_KEY) !== before.saved) {
        throw new BuildStorageConflictError("build changed during save");
      }
      storage.setItem(CURRENT_BUILD_STORAGE_KEY, after.current);
      storage.setItem(SAVED_BUILDS_STORAGE_KEY, after.saved);
    } catch (error) {
      try {
        if (storage.getItem(TRANSACTION_KEY) === receipt) readBuildStorage(storage);
      } catch { /* Preserve the recovery receipt and the original write error. */ }
      throw error;
    }
    clearTransaction(storage, receipt);
  } else {
    if (Object.hasOwn(changes, "current")) storage.setItem(CURRENT_BUILD_STORAGE_KEY, after.current);
    if (Object.hasOwn(changes, "saved")) storage.setItem(SAVED_BUILDS_STORAGE_KEY, after.saved);
  }
  return after;
}
