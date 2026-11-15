import { findItemById } from './catalog.js';
import { SS14_GEAR_EN } from './data/ss14Gear.en.generated.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { SS14_CURRENT_DATABASE } from './data/ss14CurrentDatabase.generated.js';

export const LAW_OF_GREED_ID='gear-tlidb-com-cn-law-of-greed';
const slotIndex=4, path='gear.slots.4.lawOfGreedReservation';
const normal='Seals 10 % Max Mana. Gains Insatiable Greed';
const old={
  en:['ce540a42e7c48f35dd623a4a3a95febfd8e032df1c68f4582a0c3c8a59ce4be1',normal],
  ko:['6accbec0c80b8de5c4cc3428acda70db5f49240849d6c5d9d4a779156a25aacb','최대 MP의 10 % 를 봉인하고, 끝없는 탐욕 을 획득한다.'],
};
const live={
  en:'fe413edf5034492310290548512d8436f0b32a3af37ba3e4f9383bdb0fd12cec',
  ko:'75998a695e7e72bb682d50578538763d16c5aaf2c117815547510dc408ef37f5',
};
const url=l=>'https://tlidb.com/'+l+'/Law_of_Greed';
const exactStock=(r,l)=>r?.itemId===LAW_OF_GREED_ID && r.sourceRecordKey==='Law_of_Greed' &&
  r.category==='gear' && r.season==='SS14' && r.status==='collected-preview' && r.locale===l && r.sourceUrl===url(l) &&
  r.sourcePageSha256===old[l][0] && r.sourceSeasonEvidence?.verificationComplete===true &&
  r.sourceSeasonEvidence.actualSeason===14 && r.detail?.split('\n').filter(line=>line===old[l][1]).length===1;
const inventory=SS14_CURRENT_DATABASE.inventory.find(r=>r.runtimeId===LAW_OF_GREED_ID);
const exactSource=()=>{
  const a=findItemById(LAW_OF_GREED_ID)?.legendaryAffixes?.find(s=>s.slotId==='slot-4'&&s.order===4);
  return exactStock(SS14_GEAR_EN.records[LAW_OF_GREED_ID],'en') && exactStock(SS14_CARDS.records[LAW_OF_GREED_ID],'ko') &&
    inventory?.slug==='Law_of_Greed' && inventory?.indexes.includes('Necklace') && inventory.indexes.includes('Legendary_Gear') &&
    ['en','ko'].every(l=>inventory.source[l]?.url===url(l)&&inventory.source[l]?.sha256===live[l]) &&
    a?.normal?.sourceModifierId==='51528461' && a?.corroded?.sourceModifierId==='51528460' &&
    a.normal.text===old.ko[1] && a.corroded.text==='최대 MP의 (1–5) % 를 봉인하고, 끝없는 탐욕 을 획득한다.';
};
const object=x=>x!=null && typeof x==='object' && !Array.isArray(x);
const only=(x,keys)=>object(x) && Object.keys(x).every(k=>keys.includes(k));
const hasKeys=x=>Object.keys(x??{}).length>0;
function normalBound(slot,binding){
  return slot?.itemId===LAW_OF_GREED_ID && binding?.itemId===LAW_OF_GREED_ID
    && binding.sourcePageSha256===old.en[0] && only(binding,['itemId','sourcePageSha256','rolls'])
    && only(binding.rolls,Object.keys(binding.rolls??{})) && !slot.affixText?.trim()
    && !hasKeys(slot.crafts) && !hasKeys(slot.rolls) && slot.corrupted===false
    && !hasKeys(slot.legendaryDraft?.corrodedSlotIds) && exactSource();
}
function isolated(build,rows,gearEffects,compensation){
  const i=build.ss14Inputs,g=build.gear?.slots,s=build.skills;
  if(!only(i,['schemaVersion','gear','skills','supports','componentReceipts','ruleReceipts','selections','selectionMode',
      'supportSelections','configurations','componentConditions','character','offense','offenseRuleReceipts'])||
    !Array.isArray(g)||g.length!==10||g.some((item,index)=>item!=null&&index!==slotIndex)||
    !only(i.gear,[String(slotIndex)])||compensation!==0||
    gearEffects.some(e=>/seal|reserv/u.test(e.stat))||
    rows.some(r=>r.effects?.some(e=>/compensation|sealed_mana_percent/u.test(e.stat)&&e.stat!=='sealed_mana_percent'))||
    build.customAffixes?.trim()||hasKeys(build.conditions)||hasKeys(build.calculation)||build.skillSeals?.life||build.skillSeals?.mana||
    hasKeys(i.supports)||Object.values(i.supportSelections??{}).some(Boolean)||
    ['gearAffixes','gearRolls','gearCrafts','gearCorruptions','gearLegendaryDrafts'].some(k=>hasKeys(build[k]))||
    ['hero','heroMemory','talents','spirits','slates','destiny'].some(k=>build.selections?.[k]?.some(Boolean))||
    build.hero?.branchId||build.hero?.traitSelections?.some(Boolean)||build.hero?.memories?.some(Boolean)||build.hero?.revivalMemory||
    build.talents?.placedPrism||build.talents?.placedInverseImage||build.talents?.boards?.some(b=>
      b?.boardId||b?.treeSlug||hasKeys(b?.nodePoints)||hasKeys(b?.reflectedNodePoints)||b?.selectedNodeIds?.some(Boolean)||
      b?.coreTalentIds?.some(Boolean)||b?.prismSlots?.some(Boolean)||b?.inverseImageSlots?.some(Boolean))||
    build.divinity?.activeBoardId||build.divinity?.boards?.length||build.pact?.slots?.some(p=>
      p?.spirit||p?.undeterminedFate||Object.values(p?.rings??{}).some(r=>r?.installedDestiny))||
    s?.elixir||s?.elixirs?.some(Boolean)||s?.active?.length!==5||s?.passive?.length!==4||
    s.active.some(a=>a?.skillId)||
    [...s.active,...s.passive].some(a=>a?.sealedMana||a?.sealedLife||a?.modularization||a?.supports?.some(Boolean)))return false;
  return s.passive.every((p,n)=>!p?.skillId||rows.some(r=>r.buffSkill===n+5&&r.itemId===p.skillId&&
    r.receipt?.tags?.includes('Aura')&&r.receipt?.sourceSeasonEvidence?.verificationComplete&&!r.blockers.length&&
    r.conditionControls?.some(c=>c.value===0||c.value===1&&r.effects.some(e=>e.stat==='sealed_mana_percent'))&&
    r.receipt.sourceSeasonEvidence.actualSeason===14&&r.receipt.sourcePageSha256===i.skills?.[n+5]?.sourcePageSha256&&
    i.skills[n+5].itemId===p.skillId));
}
function manaRollKnown(binding,gearEffects){
  const prefix='tlidb-gear-tooltip:'+LAW_OF_GREED_ID+':1:';
  const value=binding.rolls[prefix+'max_mana'];
  return Number.isInteger(value)&&value>=20&&value<=30&&
    ['max_life','max_mana','max_energy_shield'].every(k=>binding.rolls[prefix+k]===value)&&
    gearEffects.some(e=>e.stat==='intelligence'&&e.value===5&&e.sourceText==='+5 Intelligence')&&
    gearEffects.some(e=>e.stat==='max_mana'&&e.operation==='add_percent'&&e.value===value&&e.roll?.key===prefix+'max_mana');
}
export function appendGreedReservation(rows,build,gearEffects,compensation){
  if(build.patchSnapshot?.season!=='SS14')return;
  const g=build.gear?.slots??[], inputs=build.ss14Inputs??{}, binding=inputs.gear?.[slotIndex];
  const positions=new Set();
  g.forEach((s,n)=>{if(s?.itemId===LAW_OF_GREED_ID)positions.add(n);});
  for(const [key,b] of Object.entries(inputs.gear??{}))if(b?.itemId===LAW_OF_GREED_ID)positions.add(Number(key));
  build.selections?.gear?.forEach((id,n)=>{if(id===LAW_OF_GREED_ID)positions.add(n);});
  if(!positions.size)return;
  const exact=positions.size===1&&positions.has(slotIndex)&&normalBound(g[slotIndex],binding);
  const receipt=exact?{season:'SS14',sourceUrl:url('en'),sourcePageSha256:live.en,
    sourceRecordKey:'Law_of_Greed#modifier:51528461',modifierId:'51528461'}:null;
  const row={path,itemId:LAW_OF_GREED_ID,group:'gear',name:'탈법 · 최대 MP 봉인',receipt,effects:[],blockers:[],inactive:[],conditionControls:[],mechanics:[],status:'partial'};
  if(exact&&isolated(build,rows,gearEffects,compensation)){
    row.status='mapped';
    row.effects.push({stat:'sealed_mana_percent',operation:'add',unit:'flat',value:10,path,receipt,group:'gear',sourceText:normal});
    row.mechanics.push({kind:'direct-install-reservation',base:10,receipt});
    if(!manaRollKnown(binding,gearEffects))row.mechanics.push({kind:'unresolved-reservation-max-mp'});
  }else{
    row.blockers.push({reason:'탈법의 장비·봉인·침식 또는 타 효과와의 조합을 확인하기 전에는 합계를 계산하지 않습니다.'});
    row.mechanics.push({kind:'unresolved-law-of-greed-reservation'});
  }
  rows.push(row);
}
