import { SS14_CURRENT_DATABASE } from './data/ss14CurrentDatabase.generated.js';
import { seasonGearSlotsForIndex } from './seasonGearSlots.js';
import { calculateEditorSeasonBuild } from './seasonAssumedDps.js';
import { editSeasonWorkspace } from './seasonWorkspace.js';
import { compareSeasonDpsSnapshots } from './seasonAdvisor.js';
import { itemGearKind } from './seasonItemCraft.js';

const indexes = new Map(SS14_CURRENT_DATABASE.inventory.filter(r=>r.category==='gear').map(r=>[r.runtimeId,r.indexes]));
const labels = {Claw:'클로',Dagger:'단검',Sword:'검',Axe:'도끼',Hammer:'해머',Wand:'마법 지팡이',Rod:'지팡이',Scepter:'지팡이',Cane:'지팡이',Pistol:'권총',Bow:'활',Crossbow:'석궁',Musket:'머스킷',Fire_Cannon:'화포',Tin_Staff:'주석 지팡이',Cudgel:'무사의 스틱',STR:'힘',DEX:'민첩',INT:'지혜',Legendary_Gear:'레전드',Craft:'제작'};
export function gearFilters(id) {
  const result=new Set();
  const kind=itemGearKind(id);
  if(kind)result.add(kind==='legendary'?'레전드':'제작');
  for(const slug of indexes.get(id)??[]) {
    if(slug==='Craft'||slug==='Legendary_Gear')continue;
    const slots=seasonGearSlotsForIndex(slug);
    if(slots.includes(0))result.add(slots.includes(1)?'한손':'양손');
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
  const next=editSeasonWorkspace(document,{kind:'gear-selection',slotIndex:index,value:id});
  const after=calculateEditorSeasonBuild(next.targetBuild,{sourceBuild:next.sourceBuild});
  const comparison=compareSeasonDpsSnapshots({document,report},{document:next,report:after});
  const stats=[];
  for(const [key,label] of Object.entries({strength:'힘',dexterity:'민첩',intelligence:'지혜',life:'최대 HP',mana:'최대 MP',shield:'최대 보호막',armor:'아머',evasion:'회피'})){
    const a=report.character.values[key], b=after.character.values[key];
    if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)stats.push({label,a,b});
  }
  const slotEffects=r=>(r.components.flatMap(c=>c.category==='gear'?c.calculations??[]:[]).find(e=>e.slotIndex===index)?.effects??[]);
  const effects=r=>slotEffects(r).filter(e=>e.applied&&Number.isFinite(e.value)&&!e.condition&&!e.per&&!e.conditionRequirements)
    .map(e=>({stat:e.stat,operation:e.operation,unit:e.unit,value:e.value}));
  return {comparison,assumed:[report.assumedDps?.dps,after.assumedDps?.dps],stats,before:effects(report),after:effects(after)};
}
