import { compareSeasonDpsSnapshots, preferredSeasonDpsMetric, seasonExtensionEncounterChanges, seasonHeroEncounterChanges, seasonSharedSkillInputChanges, seasonSlotObservationChanges, seasonSupportEncounterChanges, seasonTheaEncounterChanges, seasonTimedSkillInputs, seasonUptimeInputChanges } from './seasonAdvisor.js';
import { compareSeasonDamageBreakdown, compareSeasonResourceCosts, compareSeasonSkillLevels } from './seasonGearPicker.js';
import { ASSUMED_DPS_IGNORED_DEFENSE_FIELDS } from './seasonAssumedDps.js';
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDpsEnemyFieldDefinition, seasonDpsSkillFieldDefinition, seasonDpsSkillFieldKeys, observedSkillCostFields } from './seasonDps.js';
import { seasonSkillSlotCalculation } from './seasonSkillLevels.js';
import { hasPeriodicBurstSupport, PERIODIC_BURST_INPUT, readPeriodicBurstUptime } from './seasonSkillInputs.js';
import { ADDED_FIELDS } from './seasonWeaponInputs.js';
import { theaCombatEnabled } from './seasonTheaCombatInputs.js';
import { THEA_EVENT_FIELDS } from './seasonTheaEvents.js';
import { isThea } from './seasonTheaRevelation.js';
import { SEASON_CHARACTER_INPUTS } from './seasonCharacter.js';
import { SEASON_BLESSINGS, blessingConditionValue, blessingLabel } from './seasonBlessings.js';
import { boundSeasonConditions, matchingNearbyEnemyCounts, nearbyEnemyCountInput, nearbyEnemyCountLabel, nearbyEnemyGroups } from './seasonEffectConditions.js';
import { isAuraActivationControl } from './seasonNetherModifiers.js';
import { SEASON_HERO_COMBAT_FIELDS } from './seasonMechanicInputs.js';

export function encounterInputChanges(before, after, metric) {
  const old=before.document.targetBuild, current=after.document.targetBuild;
  const changes=[];
  const add=(label,a,b,edit,key,tab,unit='',position={})=>{
    if (a!==b) changes.push({label,a,b,edit,key,tab,unit,...position});
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
  const heroControls=new Set(after.report.componentProjection.rows.flatMap(row=>row.heroControls??[]));
  for (const {key,a,b} of seasonHeroEncounterChanges(old,current,before.report,after.report,metric)) {
    const {label,min,max,integer}=SEASON_HERO_COMBAT_FIELDS[key];
    const format=value=>value===undefined||min!==0||max!==1||!integer?value:value===1?'적용':'미적용';
    add(label.replace(/ \(0 또는 1\)$/u,''),format(a),format(b),
      heroControls.has(key)?'hero-combat':undefined,key);
  }
  for (const {rowIndex,supportIndex,key,a,b} of seasonSupportEncounterChanges(old,current,before.report,after.report)) {
    const component=after.report.components.find(row=>row.category==='supports'&&row.calculations?.some(
      entry=>entry.rowIndex===rowIndex&&entry.supportIndex===supportIndex));
    const entry=component?.calculations.find(row=>row.rowIndex===rowIndex&&row.supportIndex===supportIndex);
    const control=entry?.conditionControls?.find(control=>control.key===key);
    if (!control) continue;
    const label=`${rowIndex+1}번 스킬 · ${supportIndex+1}번 보조 · ${control.label}`;
    const {choices}=control;
    const format=value=>choices?.find(([id])=>id===value)?.[1]??value;
    add(label,format(a),format(b),control.automatic?undefined:'support-condition',key,'conditions','',{rowIndex,supportIndex});
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
  if (isThea(old)&&isThea(current)) {
    const title=mode=>mode==='automatic'?'자동 주기 평균':'현재 상태 직접 설정';
    add('은총 계산 방식',title(oldInputs.theaCycle?.mode),title(inputs.theaCycle?.mode),'thea-mode','mode');
    for (const {key,a,b} of seasonTheaEncounterChanges(old,current,before.report,after.report,metric)) {
      const {label,boolean}=THEA_EVENT_FIELDS[key];
      const format=value=>boolean&&Number.isInteger(value)?(value?'예':'아니요'):value;
      add(label.replace(/ \(초\)$/u,''),format(a),format(b),'thea-event',key,undefined,
        label.endsWith(' (%)')?'%':label.endsWith(' (초)')?'초':'');
    }
  }
  const extensions=new Set();
  for(const {control,a,b} of seasonExtensionEncounterChanges(old,current,before.report,after.report)) {
    if(extensions.has(control.key))continue;
    extensions.add(control.key);
    const text=value=>control.kind==='boolean'?(value?'예':'아니요'):value;
    add(control.label,text(a),text(b),'extension-input',control.key,undefined,control.label.endsWith(' (%)')?'%':'');
  }
  const single=before.report.coupledSkills.rows.length===1&&after.report.coupledSkills.rows.length===1;
  const timed=theaCombatEnabled(old)&&oldInputs.theaCycle?.mode==='automatic';
  current.skills.active.forEach((slot,index)=>{
    const oldId=old.skills.active[index]?.skillId;
    if(!slot?.skillId||!oldId)return;
    const a=oldInputs.dps?.skills?.[index]??{}, b=inputs.dps?.skills?.[index]??{};
    for(const {key,a:from,b:to} of seasonSharedSkillInputChanges(a,b,single)) {
      const label=SEASON_DPS_SKILL_FIELDS[key].label;
      add(`${index+1}번 칸 · ${label}`,from,to,'dps-input',`${index}:${key}`,'conditions','%');
    }
    if(slot.skillId!==oldId)return;
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
    const observations=seasonSlotObservationChanges(old,current,before.report,after.report,index,metric);
    if(observations.length) {
      const entry=seasonSkillSlotCalculation(after.report,index);
      const controls=seasonDpsSkillFieldKeys(entry,slot.skillId,current);
      for(const {key,a:from,b:to} of observations) {
        if(!SEASON_DPS_SKILL_FIELDS[key])continue;
        const {label,choices}=seasonDpsSkillFieldDefinition(slot.skillId,key);
        const text=value=>choices?.find(([id])=>id===value)?.[1]??value;
        const editable=controls.includes(key)||observedSkillCostFields.includes(key);
        add(`${index+1}번 칸 · ${label}`,text(from),text(to),editable?'dps-input':undefined,`${index}:${key}`,'conditions',label.endsWith(' (%)')?'%':'');
      }
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
