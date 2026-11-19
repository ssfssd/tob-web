import { compareSeasonDpsSnapshots, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { compareSeasonResourceCosts } from './seasonGearPicker.js';

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
      const compare = metric => {
        const compared=compareSeasonDpsSnapshots(baseline,current,metric);
        const resources=changed && compared.encounterMatches===true
          && compareSeasonResourceCosts(baseline.report,current.report,metric);
        return {baseline:compared,previous:previous?compareSeasonDpsSnapshots(previous,current,metric):null,
          ...(resources && {resources:{...resources,dpsBasis:metric,
            manaObservationStale:resources.manaObservationStale&&!baseline.report.character.survival?.manaObservationStale}})};
      };
      const assumed=preferredSeasonDpsMetric(current.report)==='assumedDps'?compare('assumedDps'):null;
      return {changed,...compare('fullDps'),assumed};
    },
  };
}
