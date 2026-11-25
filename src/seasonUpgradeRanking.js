import {normalizeBuild} from './engine.js';
import {getSeasonPickerOptions, getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS, isTwoHandedWeapon} from './seasonSelections.js';
import {seasonTalentNodes, selectedSeasonSpirit} from './seasonNativeSelections.js';
import {memoryQuality} from './seasonMemoryQuality.js';
import {editSeasonWorkspace, exportSeasonWorkspace, importSeasonWorkspace} from './seasonWorkspace.js';
import {calculateEditorSeasonBuild} from './seasonAssumedDps.js';
import {calculateSeasonBuild, seasonGearSlotRollEntry} from './seasonBuild.js';
import {compareSeasonDpsSnapshots, preferredSeasonDpsMetric} from './seasonAdvisor.js';
import {labeledGearRolls} from './seasonWorkspaceView.js';
import {craftFamilySlots, craftOptions, itemGearKind} from './seasonItemCraft.js';
import {corrosionBasePool,corrosionOptions} from './seasonCorrosion.js';
import {inputDestinations} from './seasonInputRequirements.js';
import {editItemWorkshop} from './seasonItemWorkshop.js';
import {captureShelf} from './seasonShelf.js';
import {boundBlessingStacks,blessingConditionValue} from './seasonBlessings.js';
import {theaState} from './seasonTheaState.js';
import {seasonUnitOptionLines} from './seasonComponents.js';
import {compareSeasonDamageBreakdown,compareSeasonResourceCosts,compareSeasonSkillLevels,gearOptionComparisons} from './seasonGearPicker.js';
import {describeSeasonOptionChange} from './seasonNumericStatsView.js';
import {FIXED_NUMBED_FIELD} from './seasonNetherModifiers.js';

export const UPGRADE_GROUPS = {all:'한계효용',unit:'가상 옵션 1단위',replacement:'장비 교체 추천',manaReplacement:'MP 소모 절감 장비',gearImpact:'장착 장비 기여',gear:'장비 옵션',craft:'제작 옵션 추천',talents:'재능',pact:'정령',memory:'추억',legendary:'레전드 장비',skills:'액티브 스킬 레벨·보조',skillReplacement:'액티브 스킬 교체 추천'};
export const GEAR_UPGRADE_SOURCES = {all:'도감·보관함',shelf:'보관함',catalog:'도감'};
function skillReplacementCandidates(document,report,rowIndex) {
  const {skillId,level}=normalizeBuild(document.targetBuild).skills.active[rowIndex];
  const current=report.components.find(c=>c.category==='skills'&&c.id===skillId)?.name??'장착 스킬';
  return getSeasonPickerOptions('skills',rowIndex,skillId).filter(option=>option.id!==skillId).map(option=>({
    label:option.name,detail:`${current} → ${option.name} · 기본 Lv.${level}`,
    edits:[{kind:'skill-selection',rowIndex,value:option.id},...(level===20?[]:[{kind:'skill-level',rowIndex,value:level}])],
  }));
}
const editGroups = {'gear-roll':'gear','extension-input':'gear','support-roll':'skills','skill-level':'skills','support-level':'skills','talent-node':'talents','spirit-level':'pact','memory-enhancement':'memory'};
function optionCandidates(document,report,group,slot,skill,rangeBounds=false){
  const build=normalizeBuild(document.targetBuild), rows=[];
  function change(label,edit,current,value,gearSlot=edit.slotIndex){
    if(group!=='all' && editGroups[edit.kind]!==group)return;
    if(group==='gear' && slot!=='all' && gearSlot!==Number(slot))return;
    if(group==='skills' && (edit.rowIndex>=build.skills.active.length || skill!=='all' && edit.rowIndex!==Number(skill)))return;
    rows.push({label,detail:current+' → '+value,edits:[{...edit,value}]});
  }
  function roll(label,edit,c,gearSlot=edit.slotIndex){
    if(!Number.isFinite(c.value))return;
    if(rangeBounds){
      if(group==='gear'&&editGroups[edit.kind]==='gear'&&(slot==='all'||gearSlot===Number(slot))&&c.min!==c.max)
        rows.push({label,edit,current:c.value,bounds:[c.min,c.max].filter(v=>Number.isFinite(v)&&v!==c.value)});
      return;
    }
    for(const end of [c.min,c.max]){
      if(!Number.isFinite(end)||end===c.value)continue;
      const value=Number((c.value+Math.sign(end-c.value)*Math.min(1,Math.abs(end-c.value))).toFixed(8));
      change(label,edit,c.value,value,gearSlot);
    }
  }
  for(const group of report.components){
    for(const item of group.calculations??[]){
      if(group.category==='gear'){
        for(const c of labeledGearRolls(group,item))roll(SEASON_GEAR_SLOT_LABELS[item.slotIndex]+' · '+c.label,
          {kind:'gear-roll',slotIndex:item.slotIndex,key:c.key},c);
      }else if(group.category==='supports'){
        for(const [i,c] of (item.controls??[]).entries())roll('스킬 '+(item.rowIndex+1)+' · 보조 '+(item.supportIndex+1)+' 옵션 '+(i+1),
          {kind:'support-roll',rowIndex:item.rowIndex,supportIndex:item.supportIndex,key:c.key},c);
      }
    }
  }
  for(const row of report.componentProjection.rows){
    const slot=row.path.match(/^gear\.slots\.(\d+)\.crafts\./u);
    if(slot)for(const [i,c] of (row.extensionControls??[]).entries())roll(SEASON_GEAR_SLOT_LABELS[Number(slot[1])]+' · '+(row.detail||row.name)+' · 수치 '+(i+1),
      {kind:'extension-input',key:c.key},c,Number(slot[1]));
  }
  for(const [rowIndex,row] of [...build.skills.active,...build.skills.passive].entries()){
    const label=report.components.find(c=>c.category==='skills'&&c.id===row.skillId)?.name??'스킬 '+(rowIndex+1);
    if(row.skillId && row.level<100)change(label+' · '+(rowIndex+1)+'번 칸 레벨',{kind:'skill-level',rowIndex},row.level,row.level+1);
    for(const [supportIndex,support] of (row.supports??[]).entries())if(support?.supportId && support.level<100)
      change('스킬 '+(rowIndex+1)+' · 보조 '+(supportIndex+1)+' 레벨',{kind:'support-level',rowIndex,supportIndex},support.level,support.level+1);
  }
  for(const [slotIndex,board] of (build.talents.boards??[]).entries()){
    const allocated=Object.values(board?.nodePoints??{}).reduce((sum,value)=>sum+value,0);
    for(const node of seasonTalentNodes(board?.treeSlug)){
      const value=board.nodePoints?.[node.id]??0;
      if(!node.core && value<node.max && allocated>=node.required)change('재능 '+(slotIndex+1)+' · '+node.detail,{kind:'talent-node',slotIndex,key:node.id},value,value+1);
    }
  }
  for(const [slotIndex,slot] of (build.pact.slots??[]).entries()){
    const spirit=slot?.spirit;
    if(spirit && selectedSeasonSpirit(spirit.spiritId)?.levels.includes(spirit.level+1))
      change('정령 '+(slotIndex+1)+' 레벨',{kind:'spirit-level',slotIndex},spirit.level,spirit.level+1);
  }
  for(const [slotIndex,m] of (document.targetBuild.hero?.memories??[]).entries()){
    if(m && m.enhancement<(memoryQuality(m.ss14Quality)?.maxLevel??50))
      change('추억 '+(slotIndex+1)+' 강화',{kind:'memory-enhancement',slotIndex,enhancedBase:true},m.enhancement,m.enhancement+1);
  }
  return rows;
}

function gearCandidates(document,slot,shelf,legendaryOnly,source,allowOffhand=false,includeCorrosion=false){
  const gear=normalizeBuild(document.targetBuild).gear.slots, rows=[];
  for(const [slotIndex,name] of SEASON_GEAR_SLOT_LABELS.entries()){
    if(slot!=='all' && Number(slot)!==slotIndex)continue;
    if(slotIndex===1 && !allowOffhand && isTwoHandedWeapon(gear[0]?.itemId))continue;
    const choices=new Map(getSeasonSelectionOptions('gear',slotIndex).map(o=>[o.id,o.name]));
    const current=gear[slotIndex]?.itemId;
    const before=current?(choices.get(current)??'현재 장비'):'미장착';
    if(source!=='shelf')for(const [id,title] of choices){
      if(legendaryOnly && itemGearKind(id)!=='legendary')continue;
      const selection={kind:'gear-selection',slotIndex,value:id};
      const detail=before+' → '+title+' (도감)';
      const label=name+' · '+title;
      if(id!==current)rows.push({label,detail,catalog:true,edits:[selection]});
      if(!includeCorrosion||itemGearKind(id)!=='legendary')continue;
      const binding=id===current?document.targetBuild.ss14Inputs?.gear?.[slotIndex]:null;
      if(binding?.logGear||id===current&&(gear[slotIndex].corrupted||gear[slotIndex].affixText?.trim()
        ||gear[slotIndex].legendaryDraft?.corrodedSlotIds?.length||Object.keys(gear[slotIndex].crafts??{}).length))continue;
      const variantDetail=id===current?'장착 중인 장비':detail;
      for(const option of corrosionOptions(id)){
        if(binding?.corrosion?.selected?.includes(option.base))continue;
        rows.push({label:label+' · 침식',detail:variantDetail+' · '+option.corroded.replace(/\s+/gu,' '),catalog:true,
          edits:[selection,{kind:'gear-corrosion',slotIndex,key:option.base,value:true}]});
      }
      for(const option of corrosionBasePool(id)?.rows??[]){
        if(binding?.corrosion?.implicit?.id===option.id)continue;
        rows.push({label:label+' · 침식 기본',detail:variantDetail+' · '+option.ko.replace(/\s+/gu,' '),catalog:true,
          edits:[selection,{kind:'gear-corrosion-base',slotIndex,value:option.id}]});
      }
    }
    if(source!=='catalog')for(const item of shelf)if(item.kind==='gear'&&choices.has(item.item?.itemId)&&(!legendaryOnly || itemGearKind(item.item.itemId)==='legendary'))
      rows.push({label:name+' · '+item.name,detail:before+' → '+item.name+' (보관함 저장 수치)',edits:[{kind:'shelf-apply',slotIndex,value:item}]});
  }
  return rows;
}

function* equipmentPairs(candidates, twoHanded) {
  for (const [index,{edits:[first],detail:firstDetail}] of candidates.entries()) {
    for (let next=index+1;next<candidates.length;next++) {
      const {edits:[second],detail:secondDetail}=candidates[next];
      if (first.slotIndex===second.slotIndex || first.value.id===second.value.id) continue;
      if (second.slotIndex===1 && isTwoHandedWeapon(first.value.item.itemId)) continue;
      if (first.slotIndex===1 && twoHanded) continue;
      yield {edits:[first,second],details:[firstDetail,secondDetail]};
    }
  }
}

const maxExhaustiveGearCombinations = 256;
function exactEquipmentCombinations(candidates, twoHanded) {
  const bySlot=new Map();
  for (const candidate of candidates) {
    const slot=candidate.edits[0].slotIndex;
    if(!bySlot.has(slot))bySlot.set(slot,[]);
    bySlot.get(slot).push(candidate);
  }
  const slots=[...bySlot.keys()].sort((a,b)=>a-b);
  const combinations=[], edits=[], details=[], items=new Set();
  function visit(position, mainTwoHanded) {
    if(position===slots.length) {
      if(edits.length<2)return true;
      if(combinations.length===maxExhaustiveGearCombinations)return false;
      combinations.push({edits:[...edits],details:[...details]});
      return true;
    }
    const slot=slots[position];
    const choices=slot===1&&mainTwoHanded?[]:bySlot.get(slot);
    for(const {edits:[edit],detail} of choices) {
      if(items.has(edit.value.id))continue;
      items.add(edit.value.id); edits.push(edit); details.push(detail);
      const nextTwoHanded=slot===0?isTwoHandedWeapon(edit.value.item.itemId):mainTwoHanded;
      if(!visit(position+1,nextTwoHanded))return false;
      items.delete(edit.value.id); edits.pop(); details.pop();
    }
    return visit(position+1,mainTwoHanded);
  }
  return visit(0,twoHanded)?combinations:null;
}

function wornGearCandidates(document, report) {
  return normalizeBuild(document.targetBuild).gear.slots.flatMap((item,slotIndex)=>{
    if(!item?.itemId)return [];
    const name=report.components.find(row=>row.category==='gear'&&row.id===item.itemId)?.name;
    return [{slotIndex,label:SEASON_GEAR_SLOT_LABELS[slotIndex],name,
      edits:[{kind:'gear-selection',slotIndex,value:''}]}];
  });
}

function sameGearOptionChanges(edit, document, before, after) {
  const id=edit.kind==='gear-selection'?edit.value:edit.value?.kind==='gear'?edit.value.item.itemId:null;
  if(!id||document.targetBuild.gear?.slots?.[edit.slotIndex]?.itemId!==id)return [];
  return gearOptionComparisons(before,after,[edit.slotIndex]).map(describeSeasonOptionChange).filter(Boolean);
}

function craftCandidates(document, slot) {
  return normalizeBuild(document.targetBuild).gear.slots.flatMap((item,slotIndex)=>{
    if (!item?.itemId || slot!=='all' && Number(slot)!==slotIndex
      || document.targetBuild.ss14Inputs?.gear?.[slotIndex]?.logGear) return [];
    const options=craftOptions(item.itemId);
    return ['craft_prefix','craft_suffix'].flatMap(family=>{
      const slots=craftFamilySlots(item.crafts,family);
      // Empty slots are equivalent. Keep the first and compare all occupied positions.
      const positions=slots.flatMap((affix,index)=>index<3&&(affix||index===slots.indexOf(null))?[index]:[]);
      const top=options.filter(o=>o.family===family && o.tier==='1');
      return positions.flatMap(position=>top.flatMap(option=>{
        const worn=item.crafts?.[option.affixId];
        if (worn && (slots[position]?.affixId!==option.affixId || worn.tierId===option.tierId)) return [];
        const current=slots[position]&&options.find(o=>o.affixId===slots[position].affixId&&o.tierId===slots[position].tierId);
        const prefix=family==='craft_prefix'?'접두':'접미';
        return [{label:`${SEASON_GEAR_SLOT_LABELS[slotIndex]} · ${prefix} ${position+1} · ${option.text}`,
          detail:current ? `교체 전 ${current.text}` : '빈 칸에 추가',
          craft:{slotIndex,family,position,value:option.key,affixId:option.affixId}}];
      }));
    });
  });
}

function applyCraftCandidate(document, candidate) {
  const {slotIndex,...option}=candidate.craft;
  return editItemWorkshop({kind:'gear',index:slotIndex},document,{kind:'workshop-slot',...option});
}

function craftCandidateDetail(candidate, report) {
  const {slotIndex,affixId}=candidate.craft;
  const row=report.componentProjection.rows.find(r=>r.path===`gear.slots.${slotIndex}.crafts.${affixId}`);
  const values=row?.extensionControls.map(c=>c.value).filter(Number.isFinite)??[];
  return `T1${values.length?' · 적용 수치 '+values.join(' / '):''}`;
}

const calculate=(document,metric)=>(metric==='assumedDps'?calculateEditorSeasonBuild:calculateSeasonBuild)
  (document.targetBuild,{sourceBuild:document.sourceBuild});
const skillDpsRow = (report, metric, index) => report[metric]?.rows?.find(row=>row.rowIndex===index);
function upgradeDetails(before,after,metric){
  const breakdown=compareSeasonDamageBreakdown(before,after,metric);
  const [only]=breakdown.skillDpsChanges;
  // The card already shows the full DPS pair when one unchanged skill accounts for all of it.
  if(breakdown.skillDpsChanges.length===1&&only.beforeId===only.afterId
    &&only.from.toFixed(2)===before[metric].dps.toFixed(2)&&only.to.toFixed(2)===after[metric].dps.toFixed(2))
    breakdown.skillDpsChanges=[];
  return {breakdown:{...breakdown,dpsBasis:metric},levels:compareSeasonSkillLevels(before,after),
    resources:compareSeasonResourceCosts(before,after,metric,{allActive:true})};
}
function resourceCandidates(document,report){
  const build=document.targetBuild, candidates=[], groups=new Set();
  const stacks=boundBlessingStacks(build);
  function add(label,edit,current,max){
    if(!Number.isInteger(current)||!Number.isInteger(max)||current<0||current>max||max<1)return;
    // At cap, compare the last attainable unit with the point immediately below it.
    const step=current===max?-1:1;
    candidates.push({label,edit:{...edit,value:current+step},current,step});
  }
  if(stacks&&!theaState(build)&&build.ss14Inputs.theaCycle?.mode!=='automatic'){
    for(const row of report.blessings.rows)add(row.name,{kind:'blessing-input',key:row.key},stacks[row.key],report.blessings.caps[row.key]);
  }
  const fixedNumbed=report.componentProjection.fixedNumbed;
  if(fixedNumbed && Object.hasOwn(build.ss14Inputs.dps?.enemy??{},'numbedStacks'))
    add('대상 마취 중첩',{kind:'dps-input',key:'enemy:numbedStacks'},fixedNumbed.stacks,FIXED_NUMBED_FIELD.max);
  for(const row of report.componentProjection.rows)for(const c of row.conditionControls??[]){
    if(c.kind!=='count'||c.automatic||blessingConditionValue(c,stacks)!==undefined||groups.has(c.conditionGroup))continue;
    groups.add(c.conditionGroup);
    add(row.name+' · '+(c.label??(/[가-힣]/u.test(c.expression??'')?c.expression:'수량')),{kind:'component-condition',key:c.key},c.value,c.max);
  }
  for(const component of report.components.filter(c=>c.category==='supports')){
    for(const entry of component.calculations??[])for(const control of entry.conditionControls??[]){
      if(control.kind!=='count'||control.automatic)continue;
      const {rowIndex,supportIndex}=entry;
      add(component.name+' · '+(rowIndex+1)+'번 칸 · '+control.label,
        {kind:'support-condition',key:control.key,rowIndex,supportIndex},control.value,control.max);
    }
  }
  return candidates;
}
export async function rankSeasonUpgrades(document,report,{mode='options',slot='all',group='all',skill='all',assemble=false,shelf=[],source='all',includeCorrosion=false,lockedSlots=[],active=()=>true,progress=()=>{}}={}){
  const metric=preferredSeasonDpsMetric(report);
  const base={document,report},baseline=compareSeasonDpsSnapshots(base,base,metric);
  const result={metric,rows:[],resources:[],checked:0,blocked:0,total:0,reasons:baseline.reasons,base:baseline.baseValue};
  const skillReplacement=group==='skillReplacement';
  const manaReplacement=group==='manaReplacement';
  const equipment=mode==='gear'||group==='replacement'||group==='legendary'||manaReplacement;
  if(skillReplacement)result.blockedSkills=[];
  if(equipment)result.blockedGear=[];
  const reasonCounts=new Map();
  function block(reasons,candidate=null,canOpen=false,needsInput=false){
    result.blocked++;
    const unique=[...new Set(reasons)];
    for(const reason of unique)reasonCounts.set(reason,(reasonCounts.get(reason)??0)+1);
    if(skillReplacement&&candidate)result.blockedSkills.push({...candidate,reasons:unique,canOpen});
    if(equipment&&candidate)result.blockedGear.push({...candidate,reasons:unique,canOpen,needsInput});
  }
  const selectedSkill=group==='skills'||skillReplacement?String(skill):'all';
  if(skillReplacement&&selectedSkill==='all'){
    result.reasons=['교체할 액티브 스킬 칸을 선택하세요.'];
    return result;
  }
  const selectedIndex=selectedSkill==='all'?null:Number(selectedSkill);
  const selectedRow=selectedIndex===null?null:skillDpsRow(report,metric,selectedIndex);
  if(selectedIndex!==null){
    const selectedSlot=/^[0-4]$/u.test(selectedSkill)?document.targetBuild.skills?.active?.[selectedIndex]:null;
    if(!selectedSlot?.skillId||selectedSlot.skillId!==selectedRow?.id){
      result.reasons=['선택한 액티브 스킬 칸에 비교할 DPS가 없습니다.'];
      return result;
    }
    if(!skillReplacement)result.skillIndex=selectedIndex;
    if(!selectedRow.supported||!Number.isFinite(selectedRow.values.dps)){
      result.reasons=[...new Set(['선택한 액티브 스킬의 DPS를 먼저 확인하세요.',...baseline.reasons])];
      return result;
    }
  }
  if(!baseline.supported)return result;
  const baseMana=report[metric].manualResources?.manaPerSecond;
  if(manaReplacement&&!Number.isFinite(baseMana)){
    result.reasons=['현재 수동 시전의 초당 MP 소모를 먼저 확인하세요.'];
    return result;
  }
  const impact = group==='gearImpact';
  const unit = group==='unit';
  if(impact)result.impacts=[];
  if(equipment&&!Object.hasOwn(GEAR_UPGRADE_SOURCES,source))throw Error('장비 추천의 후보 출처를 선택하세요.');
  const assembleShelf=equipment&&!manaReplacement&&assemble&&source==='shelf'&&slot==='all';
  const locked=new Set(assembleShelf?lockedSlots:[]);
  const previousOffhand=equipment && normalizeBuild(document.targetBuild).gear.slots[1]?.itemId;
  const canReplace=({edits:[edit]})=>!locked.has(edit.slotIndex)
    && !(previousOffhand&&locked.has(1)&&edit.slotIndex===0&&isTwoHandedWeapon(edit.value.item.itemId));
  const existingOptions=document.targetBuild.customAffixes?.trimEnd();
  const candidates=impact?wornGearCandidates(document,report)
    :unit?seasonUnitOptionLines().map(label=>({label,
      edits:[{kind:'custom-options',value:existingOptions?existingOptions+'\n'+label:label}]}))
    :equipment?gearCandidates(document,slot,shelf,group==='legendary',source,false,includeCorrosion).filter(canReplace)
    :group==='craft'?craftCandidates(document,slot)
    :skillReplacement?skillReplacementCandidates(document,report,selectedIndex)
    :optionCandidates(document,report,group,slot,selectedSkill);
  const resources=!equipment && group==='all'?resourceCandidates(document,report):[];
  const ranges=assemble&&group==='gear'&&!equipment?optionCandidates(document,report,group,slot,skill,true):[];
  result.total=candidates.length+resources.length+ranges.reduce((sum,r)=>sum+r.bounds.length,0);
  let tick=0;
  async function keepRunning(){
    if(performance.now()-tick>55){
      progress(result.checked,result.total);
      await new Promise(resolve=>setTimeout(resolve,0));
      tick=performance.now();
    }
    return active();
  }
  for(const candidate of [...candidates,...resources]){
    if(!await keepRunning())return null;
    result.checked++;
    if(candidate.edit){
      let changed;
      try{changed=editSeasonWorkspace(document,candidate.edit);}catch(error){block([error.message]);continue;}
      const snapshot={document:changed,report:calculate(changed,metric)};
      // Both snapshots must independently be valid. Here the single named
      // combat resource is deliberately varied and is never a gear upgrade.
      const check=compareSeasonDpsSnapshots(snapshot,snapshot,metric);
      if(!check.supported){block(check.reasons.map(reason=>reason.replace(/^(기준|현재): /u,'')));continue;}
      const low=candidate.step>0?baseline.value:check.value, high=candidate.step>0?check.value:baseline.value;
      result.resources.push({label:candidate.label,from:Math.min(candidate.current,candidate.edit.value),to:Math.max(candidate.current,candidate.edit.value),
        fromDps:low,toDps:high,delta:high-low});
      continue;
    }
    let next;
    try{
      if(candidate.craft){
        const {slotIndex}=candidate.craft;
        next=applyCraftCandidate(document,candidate);
        candidate.edits=[{kind:'shelf-apply',slotIndex,value:captureShelf(next.targetBuild,'gear',slotIndex)}];
      } else next=candidate.edits.reduce(editSeasonWorkspace,document);
    }
    catch(error){
      block([error.message],candidate);
      if(impact)result.impacts.push({...candidate,reasons:[error.message]});
      continue;
    }
    if(candidate.catalog){
      const edit=candidate.edits[0], entry=seasonGearSlotRollEntry(next.targetBuild,edit.slotIndex);
      const rolls=entry?labeledGearRolls({id:edit.value},entry).filter(c=>!Number.isFinite(c.value)&&Number.isFinite(c.max)):[];
      try{
        for(const c of rolls){
          const roll={kind:'gear-roll',slotIndex:edit.slotIndex,key:c.key,value:c.max};
          next=editSeasonWorkspace(next,roll);
          candidate.edits.push(roll);
        }
      }catch(error){block([error.message],candidate);continue;}
      if(rolls.length){
        candidate.detail+=' · '+rolls.map(c=>c.label+' '+c.max).join(' / ');
      }
    }
    const after=calculate(next,metric);
    if(candidate.craft)candidate.detail+=' · '+craftCandidateDetail(candidate,after);
    const comparison=compareSeasonDpsSnapshots(base,{document:next,report:after},metric);
    if(impact){
      const {supported,reasons,value}=comparison;
      result.impacts.push({...candidate,reasons,value,delta:supported ? baseline.value-value : null,
        ...(supported&&upgradeDetails(report,after,metric))});
      if(!supported)block(reasons);
      continue;
    }
    if(!comparison.supported){
      const needsInput=equipment&&comparison.reasons.some(reason=>reason.startsWith('현재: ')
        &&inputDestinations(after,reason.slice(4),after[metric]).some(link=>link.edit&&link.key));
      block(comparison.reasons,candidate,true,needsInput);
      continue;
    }
    let skillImpact;
    if(selectedRow&&!skillReplacement){
      const row=skillDpsRow(after,metric,selectedRow.rowIndex);
      if(!row?.supported||row.id!==selectedRow.id||!Number.isFinite(row.values.dps)||!Number.isFinite(selectedRow.values.dps)){
        block(['선택 스킬 DPS를 비교할 수 없습니다.']);continue;
      }
      skillImpact={id:row.id,index:row.rowIndex,base:selectedRow.values.dps,value:row.values.dps,
        delta:row.values.dps-selectedRow.values.dps};
    }
    const candidateMana=after[metric].manualResources?.manaPerSecond;
    const manaImpact=manaReplacement&&Number.isFinite(candidateMana)&&comparison.delta>=0&&candidateMana<baseMana
      ? {base:baseMana,value:candidateMana,saved:baseMana-candidateMana} : null;
    const rankDelta=row=>row.manaImpact?.saved??row.skillImpact?.delta??row.delta;
    if(manaReplacement ? manaImpact : (skillImpact?.delta??comparison.delta)>0){
      if(previousOffhand && candidate.edits[0].slotIndex===0 && !next.targetBuild.gear?.slots?.[1]?.itemId)candidate.detail+=' · 서브 무기 해제';
      const option = unit ? {label:candidate.label,hypothetical:true} : candidate;
      const optionChanges = equipment?sameGearOptionChanges(candidate.edits[0],document,report,after):[];
      result.rows.push({...option,metric,value:comparison.value,delta:comparison.delta,percent:comparison.percent,
        ...(!unit&&upgradeDetails(report,after,metric)),
        ...(optionChanges.length&&{optionChanges}),
        ...(manaImpact&&{manaImpact}),
        ...(skillImpact&&{skillImpact})});
      result.rows.sort((a,b)=>rankDelta(b)-rankDelta(a)||a.label.localeCompare(b.label,'ko'));
      if(result.rows.length>20)result.rows.pop();
    }
  }
  let combined=document,combinedValue=baseline.value,combinedReport=report;
  const edits=[],changes=[];
  for(const range of ranges){
    let best=null;
    for(const value of range.bounds){
      if(!await keepRunning())return null;
      result.checked++;
      const edit={...range.edit,value};
      let next;
      try{next=editSeasonWorkspace(combined,edit);}catch(error){block([error.message]);continue;}
      const after=calculate(next,metric);
      const check=compareSeasonDpsSnapshots(base,{document:next,report:after},metric);
      if(!check.supported){block(check.reasons);continue;}
      if(check.value>(best?.value??combinedValue))best={document:next,value:check.value,edit,after};
    }
    if(best){
      combined=best.document;combinedValue=best.value;combinedReport=best.after;edits.push(best.edit);
      changes.push(range.label+' '+range.current+' → '+best.edit.value);
    }
  }
  if(edits.length)result.assembled={label:'장비 옵션 조합',detail:changes.join(' / '),edits,metric,value:combinedValue,delta:combinedValue-baseline.value,
    ...upgradeDetails(report,combinedReport,metric)};
  if(assembleShelf){
    const [single]=result.rows;
    let seed=single && {edits:single.edits,details:[single.detail.replace(/ · 서브 무기 해제$/u,'')],value:single.value};
    const gear=normalizeBuild(document.targetBuild).gear.slots;
    const possible=gearCandidates(document,'all',shelf,group==='legendary','shelf',true).filter(canReplace);
    const twoHanded=isTwoHandedWeapon(gear[0]?.itemId);
    const exact=exactEquipmentCombinations(possible,twoHanded);
    const combinations=()=>exact??equipmentPairs(possible,twoHanded);
    result.equipmentSearch=exact?'exhaustive':'pairs';
    for(const combination of combinations())result.total++;
    for(const combination of combinations()){
      if(!await keepRunning())return null;
      result.checked++;
      let next;
      try{next=combination.edits.reduce(editSeasonWorkspace,document);}catch(error){block([error.message]);continue;}
      const after=calculate(next,metric);
      const check=compareSeasonDpsSnapshots(base,{document:next,report:after},metric);
      if(!check.supported){block(check.reasons);continue;}
      if(check.value>(seed?.value??baseline.value)
        || seed&&check.value===seed.value&&combination.edits.length<seed.edits.length)
        seed={...combination,next,after,value:check.value};
    }
    const combination=seed?[...seed.edits]:[];
    const selectedSlots=new Set(combination.map(edit=>edit.slotIndex));
    const selectedItems=new Set(combination.map(edit=>edit.value.id));
    combined=seed?.next??combination.reduce(editSeasonWorkspace,document);
    combinedReport=seed?.after??(seed?calculate(combined,metric):report);
    combinedValue=seed?.value??baseline.value;
    const details=combination.flatMap((edit,index)=>{
      const removedOffhand=edit.slotIndex===0 && gear[1]?.itemId && !combined.targetBuild.gear.slots[1]?.itemId;
      return [`${SEASON_GEAR_SLOT_LABELS[edit.slotIndex]} · ${seed.details[index]}${removedOffhand?' · 서브 무기 해제':''}`,
        ...sameGearOptionChanges(edit,document,report,combinedReport)];
    });
    while(!exact&&seed&&selectedSlots.size<SEASON_GEAR_SLOT_LABELS.length){
      const available=shelf.filter(item=>!selectedItems.has(item.id));
      const choices=gearCandidates(combined,'all',available,group==='legendary','shelf').filter(canReplace).filter(({edits:[edit]})=>
        !selectedSlots.has(edit.slotIndex) && !(edit.slotIndex===0 && selectedSlots.has(1) && isTwoHandedWeapon(edit.value.item.itemId)));
      result.total+=choices.length;
      let best;
      for(const {edits:[edit],detail} of choices){
        if(!await keepRunning())return null;
        result.checked++;
        let next;
        try{next=editSeasonWorkspace(combined,edit);}catch(error){block([error.message]);continue;}
        const after=calculate(next,metric);
        const check=compareSeasonDpsSnapshots(base,{document:next,report:after},metric);
        if(!check.supported){block(check.reasons);continue;}
        if(check.value>(best?.value??combinedValue))best={next,edit,detail,after,value:check.value};
      }
      if(!best)break;
      const removedOffhand=best.edit.slotIndex===0 && combined.targetBuild.gear.slots[1]?.itemId && !best.next.targetBuild.gear.slots[1]?.itemId;
      combination.push(best.edit);
      details.push(`${SEASON_GEAR_SLOT_LABELS[best.edit.slotIndex]} · ${best.detail}${removedOffhand?' · 서브 무기 해제':''}`);
      details.push(...sameGearOptionChanges(best.edit,combined,combinedReport,best.after));
      selectedSlots.add(best.edit.slotIndex);
      selectedItems.add(best.edit.value.id);
      combined=best.next;
      combinedReport=best.after;
      combinedValue=best.value;
    }
    if(combination.length>1)result.assembled={label:'보관함 장비 조합',optionChanges:details,edits:combination,
      metric,value:combinedValue,delta:combinedValue-baseline.value,
      ...upgradeDetails(report,combinedReport,metric)};
  }
  if(!equipment && group==='craft' && assemble && slot!=='all' && result.rows.length){
    const first=result.rows[0], slotIndex=first.craft.slotIndex;
    combined=editSeasonWorkspace(document,first.edits[0]);
    combinedValue=first.value;
    const position=({craft})=>`${craft.family}:${craft.position}`;
    const used=new Set([position(first)]);
    const details=[`${first.label} · ${first.detail}`];
    const crafts=[first.craft];
    while(used.size<6){
      const choices=craftCandidates(combined,slot).filter(candidate=>!used.has(position(candidate)));
      result.total+=choices.length;
      let best;
      for(const candidate of choices){
        if(!await keepRunning())return null;
        result.checked++;
        let next;
        try{next=applyCraftCandidate(combined,candidate);}catch(error){block([error.message]);continue;}
        const after=calculate(next,metric);
        const check=compareSeasonDpsSnapshots(base,{document:next,report:after},metric);
        if(!check.supported){block(check.reasons);continue;}
        if(check.value>(best?.value??combinedValue))best={candidate,next,after,value:check.value};
      }
      if(!best)break;
      combined=best.next;
      combinedValue=best.value;
      combinedReport=best.after;
      used.add(position(best.candidate));
      details.push(`${best.candidate.label} · ${craftCandidateDetail(best.candidate,best.after)}`);
      crafts.push(best.candidate.craft);
    }
    if(details.length>1)result.assembled={label:'제작 옵션 조합',optionChanges:details,
      edits:[{kind:'shelf-apply',slotIndex,value:captureShelf(combined.targetBuild,'gear',slotIndex)}],
      metric,value:combinedValue,delta:combinedValue-baseline.value,crafts,
      ...upgradeDetails(report,combinedReport,metric)};
  }
  result.blockedReasons=[...reasonCounts].sort((a,b)=>b[1]-a[1]).map(([reason,count])=>({reason,count}));
  return result;
}

function applyCandidateToCopy(document,row,suffix){
  let copy=importSeasonWorkspace(exportSeasonWorkspace(document));
  for(const edit of row.edits)copy=editSeasonWorkspace(copy,edit);
  return editSeasonWorkspace(copy,{kind:'name',value:document.targetBuild.name.slice(0,65)+' · '+row.label.slice(0,65)+suffix});
}

export function copySeasonSkillTrial(document,row){
  if(!row?.canOpen||row.edits[0]?.kind!=='skill-selection')throw Error('열 수 있는 스킬 후보를 선택하세요.');
  return applyCandidateToCopy(document,row,' 시험 사본');
}

export function copySeasonGearTrial(document,row){
  const selection=row?.edits[0];
  if(!row?.canOpen||(selection?.kind!=='gear-selection'&&!(selection?.kind==='shelf-apply'&&selection.value?.kind==='gear')))
    throw Error('열 수 있는 장비 후보를 선택하세요.');
  return applyCandidateToCopy(document,row,' 시험 사본');
}

export function copySeasonUpgrade(document,report,row){
  if(row.hypothetical)throw Error('가상 옵션은 빌드에 적용할 수 없습니다.');
  const copy=applyCandidateToCopy(document,row,' 사본');
  const copyReport=calculate(copy,row.metric);
  const check=compareSeasonDpsSnapshots({document,report},{document:copy,report:copyReport},row.metric);
  if(!check.supported||check.value!==row.value||check.delta!==row.delta)throw Error('빌드가 바뀌었습니다. 추천을 다시 계산하세요.');
  if(row.manaImpact&&(report[row.metric].manualResources?.manaPerSecond!==row.manaImpact.base
    ||copyReport[row.metric].manualResources?.manaPerSecond!==row.manaImpact.value))
    throw Error('MP 소모 기준이 바뀌었습니다. 추천을 다시 계산하세요.');
  if(row.resources){
    const resources=compareSeasonResourceCosts(report,copyReport,row.metric,{allActive:true});
    if(JSON.stringify(resources)!==JSON.stringify(row.resources))
      throw Error('MP·HP 비교 수치가 바뀌었습니다. 추천을 다시 계산하세요.');
  }
  if(row.skillImpact){
    const {index,id,base,value,delta}=row.skillImpact;
    const before=skillDpsRow(report,row.metric,index), after=skillDpsRow(copyReport,row.metric,index);
    if(before?.id!==id||after?.id!==id||before.values.dps!==base||after.values.dps!==value||value-base!==delta)
      throw Error('빌드가 바뀌었습니다. 추천을 다시 계산하세요.');
  }
  return copy;
}
