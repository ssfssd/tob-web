import { compareSeasonDpsSnapshots } from './seasonAdvisor.js';

// The comparison baseline lives only in this editor session. Document versions,
// persisted builds and the undo stack remain owned by their existing modules.
export function createSeasonEditComparison(document, report) {
  const capture = (document, report) => ({document: structuredClone(document), report});
  let baseline = capture(document, report), current = baseline, previous = null;
  let changed = false;
  const content = d => JSON.stringify({...d?.targetBuild, name: undefined});
  return {
    update(document, report) {
      const next = capture(document, report);
      if (content(current.document) !== content(document)) {
        previous = current;
        changed = true;
      }
      current = next;
      return this.result();
    },
    reset(document, report) {
      baseline = capture(document, report); current = baseline; previous = null; changed = false;
      return this.result();
    },
    result() {
      const a=previous?.report.assumedDps?.dps, b=current.report.assumedDps?.dps;
      return {changed, assumedDelta:Number.isFinite(a)&&Number.isFinite(b)?b-a:null, baseline: compareSeasonDpsSnapshots(baseline, current),
        previous: previous ? compareSeasonDpsSnapshots(previous, current) : null};
    },
  };
}
