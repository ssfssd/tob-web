import { compareSeasonDpsSnapshots, preferredSeasonDpsMetric, sameObservedSkillCostBasis, seasonTimedSkillInputs, seasonUptimeInputChanges } from './seasonAdvisor.js';
import { compareSeasonDamageBreakdown, compareSeasonResourceCosts, compareSeasonSkillLevels } from './seasonGearPicker.js';
import { ASSUMED_DPS_IGNORED_DEFENSE_FIELDS } from './seasonAssumedDps.js';
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDpsEnemyFieldDefinition, seasonDpsSkillFieldDefinition, observedSkillCostFields } from './seasonDps.js';
import { hasPeriodicBurstSupport, PERIODIC_BURST_INPUT, readPeriodicBurstUptime } from './seasonSkillInputs.js';
import { ADDED_FIELDS } from './seasonWeaponInputs.js';
import { theaCombatEnabled } from './seasonTheaCombatInputs.js';
import { SEASON_CHARACTER_INPUTS } from './seasonCharacter.js';
import { SEASON_BLESSINGS, blessingConditionValue, blessingLabel } from './seasonBlessings.js';
import { boundSeasonConditions, matchingNearbyEnemyCounts, nearbyEnemyCountInput, nearbyEnemyCountLabel, nearbyEnemyGroups } from './seasonEffectConditions.js';
import { isAuraActivationControl } from './seasonNetherModifiers.js';

function encounterInputChanges(before, after, metric) {
  const old=before.document.targetBuild, current=after.document.targetBuild;
  const changes=[];
  const add=(label,a,b,edit,key,tab,unit='')=>{
    if (a!==b) changes.push({label,a,b,edit,key,tab,unit});
  };
  const oldInputs=old.ss14Inputs, inputs=current.ss14Inputs;
  for (const [key,{label}] of Object.entries(SEASON_CHARACTER_INPUTS)) {
    if (key==='observedManaRecovery') continue;
    add(label,oldInputs.character?.[key],inputs.character?.[key],'character-input',key);
  }
  if (inputs.theaCycle?.mode!=='automatic') {
    for (const key of SEASON_BLESSINGS)
      add(`${blessingLabel(key)} 중첩`,oldInputs.blessings?.[key],inputs.blessings?.[key],'blessing-input',key);
  }
  const manualConditions=(report,bindings)=>{
    const groups=new Map();
    for (const entry of boundSeasonConditions(report.componentProjection,bindings,(row,control)=>!isAuraActivationControl(row,control))) {
      if (!groups.has(entry.group)) groups.set(entry.group,new Map());
      const values=groups.get(entry.group);
      if (!values.has(entry.value)) values.set(entry.value,entry);
    }
    return groups;
  };
  const oldConditions=manualConditions(before.report,oldInputs.componentConditions);
  const currentConditions=manualConditions(after.report,inputs.componentConditions);
  const nearbyCounts=groups=>matchingNearbyEnemyCounts(nearbyEnemyGroups.flatMap(group=>
    [...(groups.get(group)?.values()??[])].map(({control})=>control)));
  const oldCounts=nearbyCounts(oldConditions), counts=nearbyCounts(currentConditions);
  if (oldCounts.length && counts.length && !oldCounts.some(count=>counts.includes(count))) {
    add('주변 적 수',nearbyEnemyCountLabel(oldCounts),nearbyEnemyCountLabel(counts),nearbyEnemyCountInput,nearbyEnemyCountInput,'conditions');
  }
  for (const [group,values] of currentConditions) {
    if (nearbyEnemyGroups.includes(group)) continue;
    const oldValues=oldConditions.get(group);
    if (oldValues?.size!==1||values.size!==1) continue;
    const {control,row,value}=values.values().next().value;
    if (after.report.blessings.enabled && blessingConditionValue(control,{Focus:0,Agility:0,Tenacity:0})!==undefined) continue;
    const visible=value=>control.kind==='count'?value:Boolean(value)!==!!control.inverted?'충족':'미충족';
    add(control.label??`${row.name} 효과 조건`,visible(oldValues.keys().next().value),visible(value),'component-condition',control.key);
  }
  if (metric==='fullDps'&&hasPeriodicBurstSupport(before.report.components)&&hasPeriodicBurstSupport(after.report.components)) {
    const {label,choices}=SEASON_DPS_SKILL_FIELDS.periodicBurstUptime;
    const state=dps=>choices.find(([value])=>value===readPeriodicBurstUptime(dps))?.[1];
    add(label,state(oldInputs.dps),state(inputs.dps),'dps-input',PERIODIC_BURST_INPUT,'conditions');
  }
  for(const key of Object.keys(SEASON_DPS_ENEMY_FIELDS)) {
    if(metric==='assumedDps'&&ASSUMED_DPS_IGNORED_DEFENSE_FIELDS.includes(key))continue;
    const label=seasonDpsEnemyFieldDefinition(current,key).label;
    add(label,oldInputs.dps?.enemy?.[key],inputs.dps?.enemy?.[key],'dps-input',`enemy:${key}`,'conditions',label.endsWith('(%)')?'%':'');
  }
  if(oldInputs.theaCycle?.mode==='automatic'&&inputs.theaCycle?.mode==='automatic'){
    for(const [key,label] of [['seconds','측정 시간'],['warmup','측정 전 준비 시간']])
      add(label,oldInputs.theaCycle[key],inputs.theaCycle[key],'thea-cycle-input',key,null,'초');
  }
  const single=before.report.coupledSkills.rows.length===1&&after.report.coupledSkills.rows.length===1;
  const timed=theaCombatEnabled(old)&&oldInputs.theaCycle?.mode==='automatic';
  current.skills.active.forEach((slot,index)=>{
    if(!slot?.skillId||slot.skillId!==old.skills.active[index]?.skillId)return;
    const a=oldInputs.dps?.skills?.[index]??{}, b=inputs.dps?.skills?.[index]??{};
    for(const [key,fallback] of [['hitChance',100],['useShare',single?100:undefined]]) {
      const label=SEASON_DPS_SKILL_FIELDS[key].label;
      add(`${index+1}번 칸 · ${label}`,a[key]??fallback,b[key]??fallback,'dps-input',`${index}:${key}`,'conditions','%');
    }
    for(const [key,{label}] of Object.entries(ADDED_FIELDS))
      add(`${index+1}번 칸 · ${label}`,a[key]??0,b[key]??0,'dps-input',`${index}:${key}`,'conditions');
    for(const {key,a,b} of seasonUptimeInputChanges(old,current,before.report,after.report,index,metric)) {
      const {label}=seasonDpsSkillFieldDefinition(slot.skillId,key);
      add(`${index+1}번 칸 · ${label}`,a,b,'dps-input',`${index}:${key}`,'conditions',label.endsWith('(%)')?'%':'');
    }
    if(timed){
      const from=seasonTimedSkillInputs(before.report,index,metric), to=seasonTimedSkillInputs(after.report,index,metric);
      const text=values=>values?.length?values.map(v=>Array.isArray(v)?v.join('–'):v).join(', '):values?'없음':undefined;
      for(const key of Object.keys(from)) {
        const label=SEASON_DPS_SKILL_FIELDS[key].label.replace(/ \(초\)$/u,'');
        add(`${index+1}번 칸 · ${label}`,text(from[key]),text(to[key]),'dps-input',`${index}:${key}`,'conditions','초');
      }
    }
    if(sameObservedSkillCostBasis(before.report,after.report,index,metric)){
      for(const key of observedSkillCostFields)
        if(Number.isFinite(a[key])&&Number.isFinite(b[key]))
          add(`${index+1}번 칸 · ${SEASON_DPS_SKILL_FIELDS[key].label}`,a[key],b[key],'dps-input',`${index}:${key}`,'conditions');
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
        const details=(origin,comparable)=>{
          const fromPrevious=origin!==baseline && origin===previous;
          const levelChanges=compareSeasonSkillLevels((origin??baseline).report,current.report);
          const resources=origin&&compareSeasonResourceCosts(origin.report,current.report,metric,{allActive:true});
          const breakdown=comparable&&compareSeasonDamageBreakdown(origin.report,current.report,metric);
          return {levelChanges,levelsFromPrevious:fromPrevious,
            ...(breakdown && {breakdown:{...breakdown,dpsBasis:metric,previous:fromPrevious}}),
            ...(resources && {resources:{...resources,dpsBasis:metric,previous:fromPrevious,
              manaObservationStale:resources.manaObservationStale&&!origin.report.character.survival?.manaObservationStale}})};
        };
        const showPrevious=compared.supported&&previousCompared?.supported&&content(previous.document)!==content(baseline.document);
        return {baseline:compared,previous:previousCompared,
          ...(changed && details(resourceBaseline,compared.supported||previousCompared?.supported)),
          ...(showPrevious && {previousDetails:details(previous,true)}),
          ...(compared.encounterMatches===false && {encounterChanges:encounterInputChanges(baseline,current,metric)}),
          ...(previousCompared?.encounterMatches===false && {previousEncounterChanges:encounterInputChanges(previous,current,metric)})};
      };
      const assumed=preferredSeasonDpsMetric(current.report)==='assumedDps'?compare('assumedDps'):null;
      return {changed,...compare('fullDps'),assumed};
    },
  };
}
