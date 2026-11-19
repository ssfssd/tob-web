import { SS14_CURRENT_DATABASE } from './data/ss14CurrentDatabase.generated.js';
import { seasonGearSlotsForIndex } from './seasonGearSlots.js';
import { calculateEditorSeasonBuild } from './seasonAssumedDps.js';
import { editSeasonWorkspace } from './seasonWorkspace.js';
import { compareSeasonDpsSnapshots } from './seasonAdvisor.js';
import { itemGearKind } from './seasonItemCraft.js';
import { normalizeBuild } from './engine.js';
import { summarizeSeasonOptionSources } from './seasonNumericStats.js';
import { seasonSkillLevelState, seasonSkillSlotCalculation } from './seasonSkillLevels.js';

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

function gearDamageRouteChanges(before,after,beforeDps,afterDps) {
  const changes=[];
  const slots=new Map([...beforeDps.rows,...afterDps.rows].map(row=>[row.rowIndex,row.id]));
  const routes=(report,dps,index)=>skillDamageRoutes(report,dps,index)
    ?.filter(e=>e.stage==='conversion'||e.stage==='gained-as-extra')
    .map(({stage,sourceType,targetType,effectivePercent,resolvedValue,actionName,effectSource})=>({
      stage,sourceType,targetType,effectivePercent,resolvedValue,actionName,effectSource,
    }));
  for(const [index,id] of slots){
    const previous=routes(before,beforeDps,index),current=routes(after,afterDps,index);
    if(previous&&current&&JSON.stringify(previous)!==JSON.stringify(current))changes.push({index,id,previous,current});
  }
  return changes;
}

function gearSkillLevelChanges(before,after) {
  const changes=[];
  for (const {category,id,calculations} of after.components) {
    if (category!=='skills' && category!=='supports') continue;
    for (const entry of calculations ?? []) {
      const {rowIndex,supportIndex}=entry;
      const previous=seasonSkillSlotCalculation(before,rowIndex,supportIndex);
      if (!previous) continue;
      const {level:from,confirmed:fromConfirmed}=seasonSkillLevelState(previous);
      const {level:to,confirmed:toConfirmed}=seasonSkillLevelState(entry);
      if (!Number.isInteger(from) || !Number.isInteger(to) || from===to) continue;
      changes.push({ id, rowIndex, supportIndex, from, to, fromConfirmed, toConfirmed });
    }
  }
  return changes.sort((a,b)=>a.rowIndex-b.rowIndex||(a.supportIndex??-1)-(b.supportIndex??-1));
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
  const beforeDps = useAssumed ? report.assumedDps : report.fullDps;
  const afterDps = useAssumed ? after.assumedDps : after.fullDps;
  const beforeMana = beforeDps.manaReservation ?? report.character.values;
  const afterMana = afterDps.manaReservation ?? after.character.values;
  const resourceChanges = [
    {label:'사용 가능 MP',a:beforeMana.unreservedMana,b:afterMana.unreservedMana},
    {label:'MP 봉인',a:beforeMana.reservedManaPercent,b:afterMana.reservedManaPercent,unit:'%'},
  ];
  const beforeResources=beforeDps.manualResources, afterResources=afterDps.manualResources;
  const resourceCosts=[
    {label:'수동 시전 MP/초',a:beforeResources?.manaPerSecond,b:afterResources?.manaPerSecond},
    {label:'수동 시전 HP/초',a:beforeResources?.lifePerSecond,b:afterResources?.lifePerSecond},
  ];
  const skillEdit=edit.kind==='skill-selection' || edit.kind==='support-selection';
  if (gear || skillEdit) {
    const indices=gear?afterDps.rows.map(row=>row.rowIndex).filter(index=>index<5):[edit.rowIndex];
    const perUse=indices.flatMap(index=>{
      const beforeRow=beforeDps.rows.find(row=>row.rowIndex===index);
      const afterRow=afterDps.rows.find(row=>row.rowIndex===index);
      const label=gear?(index===0?'주력':'액티브 '+(index+1))+' · ':'';
      return [
        {label:label+'시전당 MP',a:beforeRow?.manaPerUse,b:afterRow?.manaPerUse},
        {label:label+'시전당 HP',a:beforeRow?.lifePerUse,b:afterRow?.lifePerUse},
      ];
    });
    resourceCosts.unshift(...perUse);
  }
  if (skillEdit) {
    const entry=seasonSkillSlotCalculation(after,edit.rowIndex,edit.kind==='support-selection'?edit.supportIndex:undefined);
    const removedSupports = [];
    if (edit.kind==='skill-selection') {
      const supports = build => {
        const {active,passive}=normalizeBuild(build).skills;
        return [...active,...passive][edit.rowIndex]?.supports ?? [];
      };
      const remaining=supports(next.targetBuild);
      supports(document.targetBuild).forEach((support,index)=>{
        if(support&&!remaining[index])removedSupports.push(support.supportId);
      });
    }
    skill={entry,conversion:skillDamageRoutes(after,afterDps,edit.rowIndex),removedSupports};
  }
  const changedResource = ({a,b}) => Number.isFinite(a) && Number.isFinite(b)
    ? Math.abs(a-b)>=0.005 : Number.isFinite(a) || Number.isFinite(b);
  return {comparison,offhandRemoved,assumedComparison,stats,options,
    resourceChanges:resourceChanges.filter(changedResource), resourceCosts:resourceCosts.filter(changedResource),
    ...(gear?{damageRoutes:gearDamageRouteChanges(report,after,beforeDps,afterDps),skillLevels:gearSkillLevelChanges(report,after)}:{}),
    ...(skill?{skill}:{}),
    ...(includeSnapshot?{candidate}:{})};
}
