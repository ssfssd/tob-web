import {normalizeBuild} from './engine.js';
import {getSeasonSelectionOptions, SEASON_GEAR_SLOT_LABELS} from './seasonSelections.js';
import {seasonTalentNodes, selectedSeasonSpirit} from './seasonNativeSelections.js';
import {memoryQuality} from './seasonMemoryQuality.js';
import {editSeasonWorkspace, exportSeasonWorkspace, importSeasonWorkspace} from './seasonWorkspace.js';
import {calculateEditorSeasonBuild} from './seasonAssumedDps.js';
import {compareSeasonDpsSnapshots} from './seasonAdvisor.js';
import {labeledGearRolls} from './seasonWorkspaceView.js';
import {gearFilters} from './seasonGearPicker.js';

function optionCandidates(document,report){
  const build=normalizeBuild(document.targetBuild), rows=[];
  function change(label,edit,current,value){
    rows.push({label,detail:current+' → '+value,edits:[{...edit,value}]});
  }
  function roll(label,edit,c){
    if(!Number.isFinite(c.value))return;
    for(const end of [c.min,c.max]){
      if(!Number.isFinite(end)||end===c.value)continue;
      const value=Number((c.value+Math.sign(end-c.value)*Math.min(1,Math.abs(end-c.value))).toFixed(8));
      change(label,edit,c.value,value);
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
      {kind:'extension-input',key:c.key},c);
  }
  for(const [rowIndex,row] of [...build.skills.active,...build.skills.passive].entries()){
    if(row.skillId && row.level<100)change('스킬 '+(rowIndex+1)+' 레벨',{kind:'skill-level',rowIndex},row.level,row.level+1);
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

function gearCandidates(document,slot,shelf){
  const gear=normalizeBuild(document.targetBuild).gear.slots, rows=[];
  for(const [slotIndex,name] of SEASON_GEAR_SLOT_LABELS.entries()){
    if(slot!=='all' && Number(slot)!==slotIndex)continue;
    const choices=new Map(getSeasonSelectionOptions('gear',slotIndex).map(o=>[o.id,o.name]));
    const current=gear[slotIndex]?.itemId;
    const before=current?(choices.get(current)??'현재 장비'):'미장착';
    const fits=id=>!(slotIndex===0 && gear[1]?.itemId && gearFilters(id).includes('양손')
      ||slotIndex===1 && gear[0]?.itemId && gearFilters(gear[0].itemId).includes('양손'));
    for(const [id,title] of choices){
      if(id!==current && fits(id))rows.push({label:name+' · '+title,detail:before+' → '+title+' (도감)',catalog:true,edits:[{kind:'gear-selection',slotIndex,value:id}]});
    }
    for(const item of shelf)if(item.kind==='gear'&&choices.has(item.item?.itemId)&&fits(item.item.itemId))
      rows.push({label:name+' · '+item.name,detail:before+' → '+item.name+' (보관함 저장 수치)',edits:[{kind:'shelf-apply',slotIndex,value:item}]});
  }
  return rows;
}

const calculate=document=>calculateEditorSeasonBuild(document.targetBuild,{sourceBuild:document.sourceBuild});
export async function rankSeasonUpgrades(document,report,{mode='options',slot='all',shelf=[],active=()=>true,progress=()=>{}}={}){
  const base={document,report},baseline=compareSeasonDpsSnapshots(base,base);
  const result={rows:[],checked:0,blocked:0,total:0,reasons:baseline.reasons,base:baseline.baseValue};
  if(!baseline.supported)return result;
  const candidates=mode==='gear'?gearCandidates(document,slot,shelf):optionCandidates(document,report);
  result.total=candidates.length;
  let tick=0;
  for(const candidate of candidates){
    if(performance.now()-tick>55){
      progress(result.checked,result.total);
      await new Promise(resolve=>setTimeout(resolve,0));
      tick=performance.now();
    }
    if(!active())return null;
    result.checked++;
    let next;
    try{next=editSeasonWorkspace(document,candidate.edits[0]);}
    catch{result.blocked++;continue;}
    let after=calculate(next);
    if(candidate.catalog){
      const edit=candidate.edits[0],group=after.components.find(c=>c.category==='gear'&&c.id===edit.value);
      const entry=group?.calculations?.find(r=>r.slotIndex===edit.slotIndex);
      const rolls=entry?labeledGearRolls(group,entry).filter(c=>!Number.isFinite(c.value)&&Number.isFinite(c.max)):[];
      try{
        for(const c of rolls){
          const roll={kind:'gear-roll',slotIndex:edit.slotIndex,key:c.key,value:c.max};
          next=editSeasonWorkspace(next,roll);
          candidate.edits.push(roll);
        }
      }catch{result.blocked++;continue;}
      if(rolls.length){
        after=calculate(next);
        candidate.detail+=' · '+rolls.map(c=>c.label+' '+c.max).join(' / ');
      }
    }
    const comparison=compareSeasonDpsSnapshots(base,{document:next,report:after});
    if(!comparison.supported){result.blocked++;continue;}
    if(comparison.delta>0){
      result.rows.push({...candidate,value:comparison.value,delta:comparison.delta,percent:comparison.percent});
      result.rows.sort((a,b)=>b.delta-a.delta||a.label.localeCompare(b.label,'ko'));
      if(result.rows.length>20)result.rows.pop();
    }
  }
  return result;
}

export function copySeasonUpgrade(document,report,row){
  let copy=importSeasonWorkspace(exportSeasonWorkspace(document));
  for(const edit of row.edits)copy=editSeasonWorkspace(copy,edit);
  copy=editSeasonWorkspace(copy,{kind:'name',value:(document.targetBuild.name.slice(0,65)+' · '+row.label.slice(0,65)+' 사본')});
  const check=compareSeasonDpsSnapshots({document,report},{document:copy,report:calculate(copy)});
  if(!check.supported||check.value!==row.value||check.delta!==row.delta)throw Error('빌드가 바뀌었습니다. 추천을 다시 계산하세요.');
  return copy;
}
