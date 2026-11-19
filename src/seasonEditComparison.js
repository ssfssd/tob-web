import { compareSeasonDpsSnapshots, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { compareSeasonDamageBreakdown, compareSeasonResourceCosts, compareSeasonSkillLevels } from './seasonGearPicker.js';
import { ASSUMED_DPS_IGNORED_DEFENSE_FIELDS } from './seasonAssumedDps.js';
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDpsEnemyFieldDefinition } from './seasonDps.js';

function encounterInputChanges(before, after, metric) {
  const old=before.document.targetBuild, current=after.document.targetBuild;
  const changes=[];
  const add=(label,a,b,edit,key,tab,unit='')=>{
    if (a!==b) changes.push({label,a,b,edit,key,tab,unit});
  };
  const oldInputs=old.ss14Inputs, inputs=current.ss14Inputs;
  for(const key of Object.keys(SEASON_DPS_ENEMY_FIELDS)) {
    if(metric==='assumedDps'&&ASSUMED_DPS_IGNORED_DEFENSE_FIELDS.includes(key))continue;
    const label=seasonDpsEnemyFieldDefinition(current,key).label;
    add(label,oldInputs.dps?.enemy?.[key],inputs.dps?.enemy?.[key],'dps-input',`enemy:${key}`,
      key!=='numbedStacks'?'conditions':null,label.endsWith('(%)')?'%':'');
  }
  if(oldInputs.theaCycle?.mode==='automatic'&&inputs.theaCycle?.mode==='automatic'){
    for(const [key,label] of [['seconds','측정 시간'],['warmup','측정 전 준비 시간']])
      add(label,oldInputs.theaCycle[key],inputs.theaCycle[key],'thea-cycle-input',key,null,'초');
  }
  const single=before.report.coupledSkills.rows.length===1&&after.report.coupledSkills.rows.length===1;
  current.skills.active.forEach((slot,index)=>{
    if(!slot?.skillId||slot.skillId!==old.skills.active[index]?.skillId)return;
    const a=oldInputs.dps?.skills?.[index]??{}, b=inputs.dps?.skills?.[index]??{};
    for(const [key,fallback] of [['hitChance',100],['useShare',single?100:undefined]]) {
      const label=SEASON_DPS_SKILL_FIELDS[key].label;
      add(`${index+1}번 칸 · ${label}`,a[key]??fallback,b[key]??fallback,'dps-input',`${index}:${key}`,'conditions','%');
    }
  });
  return changes;
}

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
        const resourceBaseline=compared.supported ? baseline : previousCompared?.supported ? previous
          : compared.encounterMatches===true ? baseline : previousCompared?.encounterMatches===true ? previous : null;
        const resources=changed && resourceBaseline && compareSeasonResourceCosts(resourceBaseline.report,current.report,metric,{allActive:true});
        const breakdown=changed && (compared.supported || previousCompared?.supported)
          && compareSeasonDamageBreakdown(resourceBaseline.report,current.report,metric);
        const fromPrevious=resourceBaseline!==baseline && resourceBaseline===previous;
        return {baseline:compared,previous:previousCompared,
          ...(changed && {levelChanges:compareSeasonSkillLevels((resourceBaseline??baseline).report,current.report),levelsFromPrevious:fromPrevious}),
          ...(breakdown && {breakdown:{...breakdown,dpsBasis:metric,previous:fromPrevious}}),
          ...(compared.encounterMatches===false && {encounterChanges:encounterInputChanges(baseline,current,metric)}),
          ...(previousCompared?.encounterMatches===false && {previousEncounterChanges:encounterInputChanges(previous,current,metric)}),
          ...(resources && {resources:{...resources,dpsBasis:metric,
            previous:fromPrevious,
            manaObservationStale:resources.manaObservationStale&&!resourceBaseline.report.character.survival?.manaObservationStale}})};
      };
      const assumed=preferredSeasonDpsMetric(current.report)==='assumedDps'?compare('assumedDps'):null;
      return {changed,...compare('fullDps'),assumed};
    },
  };
}
