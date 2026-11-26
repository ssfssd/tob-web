// Store target content and optional replay context. Storage revisions and source
// snapshots are outside history, so undo after save cannot overwrite another tab.
export function createSeasonEditHistory(limit = 20) {
  const past = [], future = [];
  const copy = value => structuredClone(value);
  return {
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    record(before, after, context) {
      if (JSON.stringify(before) === JSON.stringify(after)) return false;
      past.push({target:copy(before),context});
      if (past.length > limit) past.shift();
      future.length = 0;
      return true;
    },
    undo(current, replay) {
      if (!past.length) return null;
      const entry=past.pop();
      future.push({target:copy(current),context:entry.context});
      replay?.(entry.context);
      return entry.target;
    },
    redo(current, replay) {
      if (!future.length) return null;
      const entry=future.pop();
      past.push({target:copy(current),context:entry.context});
      replay?.(entry.context);
      return entry.target;
    },
    clear() { past.length = 0; future.length = 0; },
  };
}
