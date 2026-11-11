// History owns target content only. Storage revisions and source snapshots are
// deliberately outside it, so undo after save cannot overwrite another tab.
export function createSeasonEditHistory(limit = 20) {
  const past = [], future = [];
  const copy = value => structuredClone(value);
  return {
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    record(before, after) {
      if (JSON.stringify(before) === JSON.stringify(after)) return false;
      past.push(copy(before));
      if (past.length > limit) past.shift();
      future.length = 0;
      return true;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(copy(current));
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(copy(current));
      return future.pop();
    },
    clear() { past.length = 0; future.length = 0; },
  };
}
