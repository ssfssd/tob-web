import { SS14_CURRENT_DATABASE } from './data/ss14CurrentDatabase.generated.js';
import { seasonGearSlotsForIndex } from './seasonGearSlots.js';
import { calculateEditorSeasonBuild } from './seasonAssumedDps.js';
import { editSeasonWorkspace } from './seasonWorkspace.js';
import { compareSeasonDpsSnapshots } from './seasonAdvisor.js';
import { itemGearKind } from './seasonItemCraft.js';
import { normalizeBuild } from './engine.js';
import { summarizeSeasonOptionSources } from './seasonNumericStats.js';
import { seasonSkillCalculationLevel, seasonSkillLevelState, seasonSkillSlotCalculation } from './seasonSkillLevels.js';
import { getSkillEnergyUsage } from './skillRuntimeModel.js';
import { auraActivationControl } from './seasonNetherModifiers.js';
import { seasonDamageComposition, seasonNumbedDamageRows } from './seasonDps.js';
import { compareSeasonUptimeChanges } from './seasonUptimeDetails.js';

const indexes = new Map(SS14_CURRENT_DATABASE.inventory.filter(r=>r.category==='gear').map(r=>[r.runtimeId,r.indexes]));
const labels = {Claw:'클로',Dagger:'단검',Sword:'검',Axe:'도끼',Hammer:'해머',Wand:'마법 지팡이',Rod:'지팡이',Scepter:'지팡이',Cane:'지팡이',Pistol:'권총',Bow:'활',Crossbow:'석궁',Musket:'머스킷',Fire_Cannon:'화포',Tin_Staff:'주석 지팡이',Cudgel:'무사의 스틱',STR:'힘',DEX:'민첩',INT:'지혜',Legendary_Gear:'레전드',Craft:'제작'};
export function gearFilters(id, slotIndex, hand) {
  const result=new Set();
  const kind=itemGearKind(id);
  if(kind)result.add(kind==='legendary'?'레전드':'제작');
  for(const slug of indexes.get(id)??[]) {
    if(slug==='Craft'||slug==='Legendary_Gear')continue;
    const slots=seasonGearSlotsForIndex(slug);
    if (Number.isInteger(slotIndex) && !slots.includes(slotIndex)) continue;
    const weaponHand=slots.includes(0)?slots.includes(1)?'한손':'양손':null;
    if(hand && hand!==weaponHand)continue;
    if(weaponHand)result.add(weaponHand);
    const label=labels[slug]??labels[slug.replace(/^(One|Two)-Handed_/u,'')]??labels[slug.split('_')[0]];
    if(label){
      result.add(label);
      if(slug.startsWith('One-Handed_')||slug.startsWith('Two-Handed_'))result.add((slots.includes(1)?'한손':'양손')+label);
    }
  }
  return [...result];
}

// Run the same edit and calculation as equipping. Never publish the trial to history or storage.
export function previewSeasonGear(document,report,index,id) {
  return previewSlotEdit(document,report,{kind:'gear-selection',slotIndex:index,value:id});
}
function gearOptionsForSlots(report, slots) {
  const groups = new Map();
  if (!slots.length) return groups;
  for (const row of report.numericStats?.options ?? []) for (const source of row.sources) {
    const slot = /^gear\.slots\.(\d+)(?:\.|$)/u.exec(source.path)?.[1];
    if (!slots.includes(Number(slot)) || source.receipt?.season !== 'SS14') continue;
    const local = row.scope !== 'global';
    const key = local ? `${slot}:${row.stat}` : row.stat;
    const option = groups.get(key) ?? {stat:row.stat,label:local?`${source.origin} · ${row.label}`:row.label,sources:[]};
    option.sources.push(source);
    groups.set(key,option);
  }
  return new Map([...groups].map(([key,row])=>[key,{stat:row.stat,label:row.label,...summarizeSeasonOptionSources(row.stat,row.sources)}]));
}
export function gearOptionComparisons(before, after, slots) {
  const beforeOptions=gearOptionsForSlots(before,slots), afterOptions=gearOptionsForSlots(after,slots);
  return [...new Set([...beforeOptions.keys(),...afterOptions.keys()])].map(key=>({before:beforeOptions.get(key),after:afterOptions.get(key)}));
}
function skillDamageRoutes(report, dps, rowIndex) {
  const row=dps.rows.find(row=>row.rowIndex===rowIndex);
  if (row?.supported && row.conversionTrace) return row.conversionTrace;
  if (dps !== report.fullDps) return undefined;
  const direct=report.coupledSkills.rows.find(row=>row.rowIndex===rowIndex);
  return direct?.supported ? direct.trace : undefined;
}
const elixirDamageRoutes = (dps,index) => dps.rows.find(row=>row.rowIndex===index)?.elixirDamageRoutes;
const weaponDamageRoutes = (dps,index) => dps.rows.find(row=>row.rowIndex===index && row.supported)?.weaponHands
  ?.map(({slotIndex,conversionTrace})=>({slotIndex,trace:conversionTrace}));

function damageRouteChanges(before,after,beforeDps,afterDps) {
  const changes=[];
  const equippedBefore=new Map(beforeDps.rows.map(row=>[row.rowIndex,row.id]));
  const routeEdges=trace=>trace
    ?.filter(e=>e.stage==='conversion'||e.stage==='gained-as-extra')
    .map(({stage,sourceType,targetType,effectivePercent,resolvedValue,actionName,effectSource,movedBaseDamage,gainedBaseDamage})=>({
      stage,sourceType,targetType,effectivePercent,resolvedValue,actionName,effectSource,movedBaseDamage,gainedBaseDamage,
    }));
  const routes=(report,dps,index)=>{
    const states=elixirDamageRoutes(dps,index);
    if(states)return {states};
    const hands=weaponDamageRoutes(dps,index);
    if(hands?.length)return {hands};
    const trace=routeEdges(skillDamageRoutes(report,dps,index));
    return trace && {trace};
  };
  const applies=trace=>trace?.some(edge=>edge.stage==='conversion'?edge.effectivePercent>0:edge.resolvedValue>0);
  const hasRoute=({states,hands,trace})=>applies(trace) || hands?.some(group=>applies(group.trace))
    || states?.states.some(phase=>phase.groups.some(group=>applies(group.trace)));
  const routeGroups=groups=>groups.map(({slotIndex,trace})=>({slotIndex,trace:routeEdges(trace)}));
  const comparableRoutes=({states,hands,trace})=>states?{...states,states:states.states.map(phase=>({...phase,groups:routeGroups(phase.groups)}))}
    :hands?routeGroups(hands):trace;
  for(const {rowIndex:index,id} of afterDps.rows){
    if(equippedBefore.get(index)!==id)continue;
    const previous=routes(before,beforeDps,index),current=routes(after,afterDps,index);
    if(!previous||!current||(!hasRoute(previous)&&!hasRoute(current)))continue;
    if(JSON.stringify(comparableRoutes(previous))===JSON.stringify(comparableRoutes(current)))continue;
    changes.push({index,id,previous:previous.trace,current:current.trace,
      previousStates:previous.states,currentStates:current.states,previousHands:previous.hands,currentHands:current.hands});
  }
  return changes;
}

export function compareSeasonSkillLevels(before,after) {
  const slots=report=>report.components.filter(({category})=>category==='skills'||category==='supports')
    .flatMap(({id,calculations})=>(calculations??[]).map(entry=>({id,entry})));
  const key=({id,entry})=>`${entry.rowIndex}:${entry.supportIndex??''}:${id}`;
  const previousSlots=new Map(slots(before).map(slot=>[key(slot),slot.entry]));
  const changes=[];
  for (const slot of slots(after)) {
    const previous=previousSlots.get(key(slot));
    if (!previous) continue;
    const {id,entry}=slot, {rowIndex,supportIndex}=entry;
    const fromState=Number.isInteger(supportIndex)?seasonSkillLevelState(previous):seasonSkillCalculationLevel(before,rowIndex);
    const toState=Number.isInteger(supportIndex)?seasonSkillLevelState(entry):seasonSkillCalculationLevel(after,rowIndex);
    const {base:fromBase,level:from,confirmed:fromConfirmed,growthMultiplier:fromGrowth}=fromState;
    const {base:toBase,level:to,confirmed:toConfirmed,growthMultiplier:toGrowth}=toState;
    if (!Number.isInteger(from)||!Number.isInteger(to)||(from===to&&fromBase===toBase)) continue;
    changes.push({id,rowIndex,supportIndex,from,to,fromBase,toBase,fromConfirmed,toConfirmed,fromGrowth,toGrowth});
  }
  return changes.sort((a,b)=>a.rowIndex-b.rowIndex||(a.supportIndex??-1)-(b.supportIndex??-1));
}

export function skillDpsChanges(before,after) {
  const contributions = ({rows,dps,supported}) => {
    if (!supported || !Number.isFinite(dps) || !rows.every(row=>row.supported && Number.isFinite(row.values.dps) && row.values.dps>=0)) return null;
    const bySlot = new Map(rows.map(row=>[row.rowIndex,row]));
    const total = rows.reduce((sum,row)=>sum+row.values.dps,0);
    return bySlot.size===rows.length && Math.abs(total-dps)<Math.max(0.000001,dps*1e-8) ? bySlot : null;
  };
  const previous=contributions(before), current=contributions(after);
  if (!previous || !current) return [];
  const indices=[...new Set([...previous.keys(),...current.keys()])].sort((a,b)=>a-b);
  return indices.flatMap(index=>{
    const a=previous.get(index), b=current.get(index);
    const from=a?.values.dps??0, to=b?.values.dps??0;
    return Math.abs(to-from)<0.005 ? [] : [{index,beforeId:a?.id,afterId:b?.id,from,to}];
  });
}

function numbedDamageChanges(before, after) {
  const collect = ({scope,rows}) => {
    const totals=new Map();
    for(const row of rows)
      for(const [label,value] of seasonNumbedDamageRows(scope,row.values))
        totals.set(label,(totals.get(label)??0)+value);
    return totals;
  };
  const a=collect(before), b=collect(after);
  return [...new Set([...a.keys(),...b.keys()])].flatMap(label=>{
    const from=a.get(label)??0, to=b.get(label)??0;
    return Math.abs(to-from)<0.005?[]:[{label,from,to}];
  });
}

function numbedStateChanges(before, after, metric) {
  if(!before[metric].supported||!after[metric].supported||before[metric].scope!==after[metric].scope) return [];
  const timed=before[metric].scope==='ss14-thea-joint-combat';
  const state=report=>{
    if(metric==='assumedDps')return timed?report.assumedDps.numbed:report.assumedDps.fixedNumbed;
    const cycle=report.theaAverage;
    return timed?{duration:cycle?.playerNumbedDuration,stacks:cycle?.numbedAverage,effect:cycle?.numbedEffectAverage}
      :report.componentProjection.fixedNumbed;
  };
  const a=state(before), b=state(after);
  if(!a||!b)return [];
  const fields=timed?[['duration','지속 시간','초'],['stacks','평균 중첩',''],['effect','시간 평균 번개 대미지 보정','%']]
    :[['stacks','대상 중첩',''],['bonus','번개 대미지 보정','%']];
  return fields.flatMap(([key,label,unit])=>{
    const from=a[key], to=b[key];
    return Number.isFinite(from)&&Number.isFinite(to)&&from.toFixed(2)!==to.toFixed(2)?[{label,from,to,unit}]:[];
  });
}

function skillSpeedChanges(before, after, metric) {
  if ([before,after].some(report=>['ss14-observed-elixir-uptime','ss14-thea-joint-combat'].includes(report[metric].scope)
    || (metric==='fullDps'?report.theaAverage?.supported:report.assumedDps.measuredResources))) return [];
  const cadence=(report,row)=>metric==='assumedDps'?row.detail?.cadence
    : report.coupledSkills.rows.find(entry=>entry.rowIndex===row.rowIndex&&entry.id===row.id)?.offenseBasis?.cadence;
  return after[metric].rows.flatMap(row=>{
    const old=before[metric].rows.find(entry=>entry.rowIndex===row.rowIndex&&entry.id===row.id);
    if(!row.supported||!old?.supported)return [];
    const a=cadence(before,old), b=cadence(after,row);
    return a&&b&&a.kind===b.kind&&Number.isFinite(a.rate)&&Number.isFinite(b.rate)&&a.rate.toFixed(4)!==b.rate.toFixed(4)
      ? [{index:row.rowIndex,id:row.id,kind:b.kind,from:a.rate,to:b.rate}] : [];
  });
}

export function compareSeasonDamageBreakdown(before, after, metric) {
  const beforeParts = seasonDamageComposition(before[metric]);
  const afterParts = seasonDamageComposition(after[metric]);
  const mixed = beforeParts && afterParts && beforeParts.filter(({value}, index) => value>0 || afterParts[index].value>0).length>1;
  const damageCompositionChanges = mixed ? beforeParts.flatMap(({label,value:from}, index) => {
    const to = afterParts[index].value;
    return from.toFixed(2) === to.toFixed(2) ? [] : [{label,from,to}];
  }) : [];
  const manualUsageChanges=after[metric].rows.flatMap(row=>{
    const old=before[metric].rows.find(entry=>entry.rowIndex===row.rowIndex&&entry.id===row.id);
    const from=old?.measuredManualUses, to=row.measuredManualUses;
    if(!row.supported||!old?.supported||!from||!to||from.seconds!==to.seconds)return [];
    const fromMana=old.manualManaPerSecond, toMana=row.manualManaPerSecond;
    const fromLife=old.manualLifePerSecond, toLife=row.manualLifePerSecond;
    const display=value=>Number.isFinite(value)?value.toFixed(2):null;
    return display(from.count)!==display(to.count)||display(fromMana)!==display(toMana)||display(fromLife)!==display(toLife)
      ? [{index:row.rowIndex,id:row.id,from,to,fromMana,toMana,fromLife,toLife}] : [];
  });
  return {
    skillDpsChanges:skillDpsChanges(before[metric],after[metric]),
    damageCompositionChanges,
    damageRoutes:damageRouteChanges(before,after,before[metric],after[metric]),
    skillSpeedChanges:skillSpeedChanges(before,after,metric),
    manualUsageChanges,
    numbedDamageChanges:numbedDamageChanges(before[metric],after[metric]),
    numbedStateChanges:numbedStateChanges(before,after,metric),
    uptimeChanges:compareSeasonUptimeChanges(before,after,metric),
  };
}

export function compareSeasonResourceCosts(report,after,basis,{allActive=false,rowIndex}={}) {
  const beforeDps=report[basis],afterDps=after[basis];
  const beforeMana = beforeDps.manaReservation ?? report.character.values;
  const afterMana = afterDps.manaReservation ?? after.character.values;
  const resourceChanges = [
    {label:'사용 가능 MP',a:beforeMana.unreservedMana,b:afterMana.unreservedMana},
    {label:'MP 봉인',a:beforeMana.reservedManaPercent,b:afterMana.reservedManaPercent,unit:'%'},
  ];
  const beforeResources=beforeDps.manualResources, afterResources=afterDps.manualResources;
  const recovery = (resources, fallback) => resources?.recovery ?? fallback ?? [];
  const beforeRecovery = recovery(beforeResources,report.character.survival?.manaScenarios);
  const afterRecovery = recovery(afterResources,after.character.survival?.manaScenarios);
  const recoveryRows = new Map(afterRecovery.map(row=>[row.id,row]));
  const formulas = beforeRecovery.filter(row=>row.id!=='observed');
  const observedRecovery = report => recovery(report.fullDps.manualResources,report.character.survival?.manaScenarios)
    .find(row=>row.id==='observed');
  const previousObserved = observedRecovery(report);
  const nextObserved = observedRecovery(after);
  const manaObservationStale = Boolean(after.character.survival?.manaObservationStale);
  const resourceRecovery = formulas.flatMap(row=>{
    const next = recoveryRows.get(row.id);
    return [
      {label:'MP 회복 · '+row.label,a:row.value,b:next?.value,unit:'/초'},
      {label:'MP 수지 · '+row.label,a:row.balance,b:next?.balance,unit:'/초'},
    ];
  });
  if (previousObserved || nextObserved)
    resourceRecovery.unshift({label:basis==='assumedDps'?'입력 조건 · 관측 MP 수지':'관측 MP 수지',a:previousObserved?.balance,
      b:manaObservationStale?null:nextObserved?.balance,unit:'/초'});
  const resourceCosts=[
    {label:'수동 시전 MP/초',a:beforeResources?.manaPerSecond,b:afterResources?.manaPerSecond},
    {label:'수동 시전 HP/초',a:beforeResources?.lifePerSecond,b:afterResources?.lifePerSecond},
  ];
  if (allActive || Number.isInteger(rowIndex)) {
    const indices=allActive?afterDps.rows.map(row=>row.rowIndex).filter(index=>index<5):[rowIndex];
    const perUse=indices.flatMap(index=>{
      const beforeRow=beforeDps.rows.find(row=>row.rowIndex===index);
      const afterRow=afterDps.rows.find(row=>row.rowIndex===index);
      const label=allActive?(index===0?'주력':'액티브 '+(index+1))+' · ':'';
      return [
        {label:label+'시전당 MP',a:beforeRow?.manaPerUse,b:afterRow?.manaPerUse},
        {label:label+'시전당 HP',a:beforeRow?.lifePerUse,b:afterRow?.lifePerUse},
      ];
    });
    resourceCosts.unshift(...perUse);
  }
  const changed=({a,b})=>Number.isFinite(a)&&Number.isFinite(b)
    ? Math.abs(a-b)>=0.005 : Number.isFinite(a)||Number.isFinite(b);
  return {resourceChanges:resourceChanges.filter(changed),resourceCosts:resourceCosts.filter(changed),
    resourceRecovery:resourceRecovery.filter(changed),manaObservationStale};
}

export function previewSlotEdit(document,report,edit,{includeSnapshot=false,metric='fullDps'}={}) {
  const next=editSeasonWorkspace(document,edit);
  const after=calculateEditorSeasonBuild(next.targetBuild,{sourceBuild:next.sourceBuild});
  const baseline={document,report}, candidate={document:next,report:after};
  const comparison=compareSeasonDpsSnapshots(baseline,candidate,metric);
  const assumedComparison=metric==='assumedDps'?comparison:compareSeasonDpsSnapshots(baseline,candidate,'assumedDps');
  const stats=[];
  for(const [key,label] of Object.entries({strength:'힘',dexterity:'민첩',intelligence:'지혜',life:'최대 HP',mana:'최대 MP',shield:'최대 보호막',armor:'아머',evasion:'회피'})){
    const a=report.character.values[key], b=after.character.values[key];
    if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)stats.push({label,a,b});
  }
  const gear=edit.kind==='gear-selection'||(edit.kind==='shelf-apply'&&edit.value.kind==='gear');
  const offhandRemoved=gear && edit.slotIndex===0 && !!normalizeBuild(document.targetBuild).gear.slots[1]?.itemId && !next.targetBuild.gear?.slots?.[1]?.itemId;
  const slots = gear ? (offhandRemoved ? [edit.slotIndex,1] : [edit.slotIndex]) : [];
  const options = gearOptionComparisons(report,after,slots);
  let skill;
  const useAssumed = assumedComparison.supported && (metric==='assumedDps' || !comparison.supported);
  const dpsBasis = useAssumed ? 'assumedDps' : 'fullDps';
  const beforeDps=report[dpsBasis],afterDps=after[dpsBasis];
  const comparable = useAssumed ? assumedComparison.supported : metric==='fullDps' && comparison.supported;
  const skillEdit=edit.kind==='skill-selection' || edit.kind==='support-selection';
  if (skillEdit) {
    const entry=seasonSkillSlotCalculation(after,edit.rowIndex,edit.kind==='support-selection'?edit.supportIndex:undefined);
    const beforeSkills=normalizeBuild(document.targetBuild).skills;
    const afterSkills=normalizeBuild(next.targetBuild).skills;
    const beforeEnergy=getSkillEnergyUsage(beforeSkills), afterEnergy=getSkillEnergyUsage(afterSkills);
    const energyChanged=beforeEnergy.used!==afterEnergy.used||beforeEnergy.maximum!==afterEnergy.maximum;
    const removedSupports = [];
    if (edit.kind==='skill-selection') {
      const supports = ({active,passive}) => [...active,...passive][edit.rowIndex]?.supports ?? [];
      const remaining=supports(afterSkills);
      supports(beforeSkills).forEach((support,index)=>{
        if(support&&!remaining[index])removedSupports.push(support.supportId);
      });
    }
    const states=elixirDamageRoutes(afterDps,edit.rowIndex);
    const elixirDpsStates=afterDps.rows.find(row=>row.rowIndex===edit.rowIndex)?.elixirDpsStates;
    const activation=edit.kind==='skill-selection'?auraActivationControl(after.componentProjection,edit.rowIndex):undefined;
    const growthMultiplier=edit.kind==='skill-selection' ? seasonSkillCalculationLevel(after,edit.rowIndex).growthMultiplier : null;
    const hands=states?undefined:weaponDamageRoutes(afterDps,edit.rowIndex);
    skill={entry,activation,growthMultiplier,conversion:states||hands?.length?undefined:skillDamageRoutes(after,afterDps,edit.rowIndex),
      weaponDamageRoutes:hands,elixirDamageRoutes:states,elixirDpsStates,removedSupports,
      ...(energyChanged?{energyChange:{before:beforeEnergy,after:afterEnergy}}:{})};
  }
  return {comparison,offhandRemoved,assumedComparison,stats,options,dpsBasis,
    ...(comparable?compareSeasonDamageBreakdown(report,after,dpsBasis):{skillDpsChanges:[],skillSpeedChanges:[],manualUsageChanges:[],numbedDamageChanges:[],uptimeChanges:[]}),
    ...compareSeasonResourceCosts(report,after,dpsBasis,{allActive:gear,rowIndex:skillEdit?edit.rowIndex:undefined}),
    ...(!comparable&&gear?{damageRoutes:damageRouteChanges(report,after,beforeDps,afterDps)}:{}),
    ...(!skillEdit?{skillLevels:compareSeasonSkillLevels(report,after)}:{}),
    ...(skill?{skill}:{}),
    ...(includeSnapshot?{candidate}:{})};
}
