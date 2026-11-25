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
import { SEASON_DAMAGE_BREAKDOWN_LABELS, seasonDamageComposition, seasonDamageTypeComposition, seasonNumbedDamageRows } from './seasonDps.js';
import { compareSeasonUptimeChanges } from './seasonUptimeDetails.js';
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { findItemById } from './catalog.js';

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

function weaponComparisons(before, after, slots) {
  const profile = (build, index) => {
    const id = build.gear?.slots?.[index]?.itemId;
    const weapon = findItemById(id)?.tags?.includes('mainHand');
    return { id, weapon, values: weapon ? seasonWeaponProfile(build,index,{individual:true}).values : {} };
  };
  return slots.filter(index=>index<2).flatMap(index=>{
    const from=profile(before,index), to=profile(after,index);
    return from.weapon||to.weapon ? [{index,from,to}] : [];
  });
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
  const equippedAfter=new Map(afterDps.rows.map(row=>[row.rowIndex,row.id]));
  const indices=[...new Set([...equippedBefore.keys(),...equippedAfter.keys()])].sort((a,b)=>a-b);
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
  const applies=trace=>trace?.some(edge=>edge.stage==='conversion'?edge.effectivePercent>0:
    edge.stage==='gained-as-extra'&&edge.resolvedValue>0);
  const hasRoute=({states,hands,trace})=>applies(trace) || hands?.some(group=>applies(group.trace))
    || states?.states.some(phase=>phase.variable||phase.groups.some(group=>applies(group.trace)));
  const routeGroups=groups=>groups.map(({slotIndex,trace})=>({slotIndex,trace:routeEdges(trace)}));
  const comparableRoutes=({states,hands,trace})=>states?{...states,states:states.states.map(phase=>({...phase,groups:routeGroups(phase.groups)}))}
    :hands?routeGroups(hands):trace;
  const emptySlot=(report,dps,index)=>dps.supported&&report.components&&!report.components.some(component=>
    component.category==='skills'&&component.paths?.some(path=>path===`skills.rows.${index}`||path===`selections.skills.${index}`));
  for(const index of indices){
    const beforeId=equippedBefore.get(index)??null, id=equippedAfter.get(index)??null;
    const previous=beforeId?routes(before,beforeDps,index):emptySlot(before,beforeDps,index)?{trace:[]}:undefined;
    const current=id?routes(after,afterDps,index):emptySlot(after,afterDps,index)?{trace:[]}:undefined;
    if(!previous||!current||(!hasRoute(previous)&&!hasRoute(current)))continue;
    if(JSON.stringify(comparableRoutes(previous))===JSON.stringify(comparableRoutes(current)))continue;
    changes.push({index,id,...(beforeId!==id?{beforeId}:{}),previous:previous.trace,current:current.trace,
      previousStates:previous.states,currentStates:current.states,previousHands:previous.hands,currentHands:current.hands});
  }
  return changes;
}

export function compareSeasonSkillLevels(before,after) {
  const key=({entry})=>`${entry.rowIndex}:${entry.supportIndex??''}`;
  const slots=report=>{
    const entries=report.components.filter(({category})=>category==='skills'||category==='supports');
    const index=new Map(entries.flatMap(({id,calculations})=>(calculations??[]).map(entry=>[key({entry}),{id,entry}])));
    for (const {id,paths} of entries) for (const path of paths??[]) {
      const match=/^skills\.rows\.(\d+)(?:\.supports\.(\d+))?$/u.exec(path);
      if(!match)continue;
      const entry={rowIndex:Number(match[1]),supportIndex:match[2]===undefined?undefined:Number(match[2])};
      const slotKey=key({entry});
      if(!index.has(slotKey))index.set(slotKey,{id,entry});
    }
    return index;
  };
  const previousSlots=slots(before), currentSlots=slots(after);
  const changes=[];
  for (const slotKey of new Set([...previousSlots.keys(),...currentSlots.keys()])) {
    const previous=previousSlots.get(slotKey), current=currentSlots.get(slotKey);
    const {rowIndex,supportIndex}=(current??previous).entry;
    const id=current?.id??null, beforeId=previous?.id??null;
    const state=(report,slot)=>!slot?{level:null,confirmed:false}
      : Number.isInteger(supportIndex)?seasonSkillLevelState(slot.entry):seasonSkillCalculationLevel(report,rowIndex);
    const fromState=state(before,previous), toState=state(after,current);
    const {base:fromBase,level:from,confirmed:fromConfirmed,growthMultiplier:fromGrowth}=fromState;
    const {base:toBase,level:to,confirmed:toConfirmed,growthMultiplier:toGrowth}=toState;
    if (beforeId===id && from===to && fromBase===toBase && fromConfirmed===toConfirmed && fromGrowth===toGrowth) continue;
    changes.push({id,...(beforeId!==id&&{beforeId}),rowIndex,supportIndex,from,to,fromBase,toBase,fromConfirmed,toConfirmed,fromGrowth,toGrowth});
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
    const slots=new Map();
    for(const row of rows) {
      const parts=new Map(seasonNumbedDamageRows(scope,row.values));
      slots.set(row.rowIndex,{id:row.id,parts});
      for(const [label,value] of parts)
        totals.set(label,(totals.get(label)??0)+value);
    }
    return {totals,slots};
  };
  const a=collect(before), b=collect(after);
  const changes=(previous=new Map(),current=new Map())=>[...new Set([...previous.keys(),...current.keys()])].flatMap(label=>{
    const from=previous.get(label)??0, to=current.get(label)??0;
    return Math.abs(to-from)<0.005?[]:[{label,from,to}];
  });
  const indices=[...new Set([...a.slots.keys(),...b.slots.keys()])]
    .filter(index=>a.slots.get(index)?.parts.size||b.slots.get(index)?.parts.size).sort((left,right)=>left-right);
  return {numbedDamageChanges:changes(a.totals,b.totals),
    skillNumbedDamageChanges:indices.length<2?[]:indices.flatMap(index=>{
      const previous=a.slots.get(index), current=b.slots.get(index);
      return changes(previous?.parts,current?.parts).map(change=>({...change,index,beforeId:previous?.id,afterId:current?.id}));
    })};
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
  const beforeTypes=seasonDamageTypeComposition(before[metric]), afterTypes=seasonDamageTypeComposition(after[metric]);
  const damageTypeChanges=beforeTypes&&afterTypes&&beforeTypes.filter(({value},index)=>value>0||afterTypes[index].value>0).length>1
    ? beforeTypes.flatMap(({type,value:from},index)=>{
      const to=afterTypes[index].value;
      return from.toFixed(2)===to.toFixed(2)?[]:[{type,label:SEASON_DAMAGE_BREAKDOWN_LABELS[type],from,to}];
    }) : [];
  const manualUsageChanges=after[metric].rows.flatMap(row=>{
    const old=before[metric].rows.find(entry=>entry.rowIndex===row.rowIndex);
    const from=old?.measuredManualUses, to=row.measuredManualUses;
    if(!row.supported||!old?.supported||!from||!to||from.seconds!==to.seconds)return [];
    const fromMana=old.manualManaPerSecond, toMana=row.manualManaPerSecond;
    const fromLife=old.manualLifePerSecond, toLife=row.manualLifePerSecond;
    const display=value=>Number.isFinite(value)?value.toFixed(2):null;
    return display(from.count)!==display(to.count)||display(from.multistrikes??0)!==display(to.multistrikes??0)
      ||display(fromMana)!==display(toMana)||display(fromLife)!==display(toLife)
      ? [{index:row.rowIndex,id:row.id,...(old.id!==row.id&&{beforeId:old.id}),from,to,fromMana,toMana,fromLife,toLife}] : [];
  });
  const elixirPhaseChanges=after[metric].rows.flatMap(row=>{
    const old=before[metric].rows.find(entry=>entry.rowIndex===row.rowIndex&&entry.id===row.id);
    const from=old?.elixirDpsStates, to=row.elixirDpsStates;
    if(!row.supported||!old?.supported||!from||!to)return [];
    const observed=Boolean(from.observedSlots?.length&&to.observedSlots?.length);
    const sameElixirs=observed ? JSON.stringify(from.observedSlots)===JSON.stringify(to.observedSlots)
      : from.timeline&&to.timeline&&JSON.stringify(from.timeline)===JSON.stringify(to.timeline);
    if(!sameElixirs)return [];
    const matched=to.states.map(phase=>from.states.find(earlier=>earlier.active.join()===phase.active.join()&&Math.abs(earlier.uptime-phase.uptime)<1e-6));
    if(from.states.length!==to.states.length||matched.some(phase=>!phase))return [];
    const display=value=>Number.isFinite(value)?value.toFixed(2):null;
    return to.states.flatMap((phase,index)=>{
      const earlier=matched[index];
      const changes=[['반영 DPS','weightedDps'],['MP/초','weightedManaPerSecond'],['HP/초','weightedLifePerSecond']]
        .flatMap(([label,key])=>Number.isFinite(earlier[key])&&Number.isFinite(phase[key])&&display(earlier[key])!==display(phase[key])
          ? [{label,from:earlier[key],to:phase[key]}]:[]);
      if(!changes.length)return [];
      const name=to.names.map((elixir,i)=>elixir+' '+(phase.active[i]?'활성':'비활성')).join(' · ');
      return [{index:row.rowIndex,id:row.id,name,uptime:phase.uptime,changes,...(observed&&{observed})}];
    });
  });
  return {
    skillDpsChanges:skillDpsChanges(before[metric],after[metric]),
    damageCompositionChanges,damageTypeChanges,
    damageRoutes:damageRouteChanges(before,after,before[metric],after[metric]),
    skillSpeedChanges:skillSpeedChanges(before,after,metric),
    manualUsageChanges,elixirPhaseChanges,
    ...numbedDamageChanges(before[metric],after[metric]),
    numbedStateChanges:numbedStateChanges(before,after,metric),
    uptimeChanges:compareSeasonUptimeChanges(before,after,metric),
  };
}

export function compareSeasonResourceCosts(report,after,basis,{allActive=false,rowIndex}={}) {
  const beforeDps=report[basis],afterDps=after[basis];
  const bySlot=dps=>new Map(dps.rows.filter(row=>row.rowIndex<5).map(row=>[row.rowIndex,row]));
  const beforeRows=bySlot(beforeDps), afterRows=bySlot(afterDps);
  const slots=[...new Set([...beforeRows.keys(),...afterRows.keys()])].sort((a,b)=>a-b);
  const equippedId=(snapshot, row, index)=>row?.id??snapshot.components?.find(component=>
    component.category==='skills'&&component.paths?.includes(`skills.rows.${index}`))?.id;
  const changed=({a,b})=>Number.isFinite(a)&&Number.isFinite(b)
    ? Math.abs(a-b)>=0.005 : Number.isFinite(a)||Number.isFinite(b);
  const beforeMana = beforeDps.manaReservation ?? report.character.values;
  const afterMana = afterDps.manaReservation ?? after.character.values;
  const resourceChanges = [
    {label:'사용 가능 MP',a:beforeMana.unreservedMana,b:afterMana.unreservedMana},
    {label:'MP 봉인',a:beforeMana.reservedManaPercent,b:afterMana.reservedManaPercent,unit:'%'},
  ];
  const reservations=(snapshot,dps)=>new Map((dps.manaReservations??snapshot.character.manaReservations??[])
    .map(row=>[`${row.rowIndex}:${row.supportIndex??''}`,row]));
  const oldReservations=reservations(report,beforeDps), newReservations=reservations(after,afterDps);
  const manaReservationChanges=[...new Set([...oldReservations.keys(),...newReservations.keys()])].flatMap(key=>{
    const a=oldReservations.get(key), b=newReservations.get(key);
    if(a?.name===b?.name&&a?.active===b?.active&&a?.blocked===b?.blocked&&!changed({a:a?.applied,b:b?.applied}))return [];
    return [{a,b}];
  }).sort(({a,b},{a:left,b:right})=>(b??a).rowIndex-(right??left).rowIndex
    ||((b??a).supportIndex??-1)-((right??left).supportIndex??-1));
  const beforeResources=beforeDps.manualResources, afterResources=afterDps.manualResources;
  const recovery = (resources, fallback) => resources?.recovery ?? fallback ?? [];
  const beforeRecovery = recovery(beforeResources,report.character.survival?.manaScenarios);
  const afterRecovery = recovery(afterResources,after.character.survival?.manaScenarios);
  const recoveryRows = new Map(afterRecovery.map(row=>[row.id,row]));
  const formulas = beforeRecovery.filter(row=>row.id!=='observed');
  const observedRecovery = report => {
    const survival = report.character.survival;
    if (survival?.manaObservationStale) return null;
    const measured = report.fullDps.manualResources?.recovery?.find(row=>row.id==='observed');
    const recorded = survival?.manaScenarios?.find(row=>row.id==='observed');
    return Number.isFinite(measured?.value) ? measured : recorded;
  };
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
  if (previousObserved || nextObserved) {
    const prefix=basis==='assumedDps'?'입력 조건 · ':'';
    resourceRecovery.unshift(
      {label:prefix+'관측 MP 자연 회복',a:previousObserved?.value,b:nextObserved?.value,unit:'/초'},
      {label:prefix+'관측 MP 수지',a:previousObserved?.balance,b:manaObservationStale?null:nextObserved?.balance,unit:'/초'},
    );
  }
  const resourceCosts=[
    {label:'수동 시전 MP/초',a:beforeResources?.manaPerSecond,b:afterResources?.manaPerSecond},
    {label:'수동 시전 HP/초',a:beforeResources?.lifePerSecond,b:afterResources?.lifePerSecond},
  ];
  if (allActive || Number.isInteger(rowIndex)) {
    const indices=allActive?slots:[rowIndex];
    const perUse=indices.flatMap(index=>{
      const beforeRow=beforeRows.get(index), afterRow=afterRows.get(index);
      const aEmpty=Boolean(report.components&&!equippedId(report,beforeRow,index));
      const bEmpty=Boolean(after.components&&!equippedId(after,afterRow,index));
      const label=allActive?(index===0?'주력':'액티브 '+(index+1))+' · ':'';
      return [['MP','manaPerUse'],['HP','lifePerUse']].flatMap(([resource,key])=>{
        const a=beforeRow?.[key], b=afterRow?.[key];
        if ((aEmpty||bEmpty)&&(a??b)===0) return [];
        return [{label:label+'시전당 '+resource,a,b,...(aEmpty&&{aEmpty}),...(bEmpty&&{bEmpty})}];
      });
    });
    resourceCosts.unshift(...perUse);
  }
  const skillResourceChanges=slots.flatMap(index=>{
    const beforeRow=beforeRows.get(index), afterRow=afterRows.get(index);
    const beforeId=equippedId(report,beforeRow,index), afterId=equippedId(after,afterRow,index);
    return [['MP','manualManaPerSecond'],['HP','manualLifePerSecond']].flatMap(([resource,key])=>{
      const a=beforeRow?.[key], b=afterRow?.[key];
      if (!changed({a,b}) || (!beforeId||!afterId)&&(a??b)===0) return [];
      return [{index,beforeId,afterId,resource,a,b}];
    });
  });
  return {resourceChanges:resourceChanges.filter(changed),resourceCosts:resourceCosts.filter(changed),
    resourceRecovery:resourceRecovery.filter(changed),skillResourceChanges,manaReservationChanges,manaObservationStale};
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
    ...(slots.some(index=>index<2)&&{weaponComparisons:weaponComparisons(document.targetBuild,next.targetBuild,slots)}),
    ...(comparable?compareSeasonDamageBreakdown(report,after,dpsBasis):{skillDpsChanges:[],skillSpeedChanges:[],manualUsageChanges:[],numbedDamageChanges:[],uptimeChanges:[]}),
    ...compareSeasonResourceCosts(report,after,dpsBasis,{allActive:gear,rowIndex:skillEdit?edit.rowIndex:undefined}),
    ...(!comparable&&(gear||skillEdit)?{damageRoutes:damageRouteChanges(report,after,beforeDps,afterDps)}:{}),
    skillLevels:compareSeasonSkillLevels(report,after),
    ...(skill?{skill}:{}),
    ...(includeSnapshot?{candidate}:{})};
}
