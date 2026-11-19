import { compareSeasonDpsSnapshots, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { compareSeasonResourceCosts } from './seasonGearPicker.js';

export function compactSeasonEditDelta(comparison) {
  const baseline = comparison?.baseline;
  const value = baseline?.supported ? baseline : comparison?.previous;
  return value?.supported && Math.abs(value.delta) >= 0.005
    ? { value, previous: value !== baseline } : null;
}

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
        const previousCompared=previous?compareSeasonDpsSnapshots(previous,current,metric):null;
        const resourceBaseline=compared.encounterMatches===true ? baseline
          : previousCompared?.encounterMatches===true ? previous : null;
        const resources=changed && resourceBaseline && compareSeasonResourceCosts(resourceBaseline.report,current.report,metric);
        return {baseline:compared,previous:previousCompared,
          ...(resources && {resources:{...resources,dpsBasis:metric,
            previous:resourceBaseline===previous,
            manaObservationStale:resources.manaObservationStale&&!resourceBaseline.report.character.survival?.manaObservationStale}})};
      };
      const assumed=preferredSeasonDpsMetric(current.report)==='assumedDps'?compare('assumedDps'):null;
      return {changed,...compare('fullDps'),assumed};
    },
  };
}
