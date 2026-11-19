import { enhancedMemoryBase, memoryQualities } from './seasonMemoryQuality.js';
import { seasonMemoryOptions } from './seasonNativeSelections.js';
import { seasonMemoryRows } from './seasonMemories.js';
import { editSeasonWorkspace } from './seasonWorkspace.js';

const parts=['근원의 추억','자기 수호의 추억','진격의 추억'];
const grades=['normal','magic','rare','elite','abs'];
const canonical=text=>text.normalize('NFC').replace(/\s/gu,'');
const effect=entry=>typeof entry?.e==='string'&&entry.e.length<=500 ? canonical(entry.e) : '';
const object=value=>value && typeof value==='object' && !Array.isArray(value);

function confirmedBase(entry,options,quality){
  let text=effect(entry);
  const number=/\+([0-9]+(?:\.[0-9]+)?)(%?)$/u;
  if(entry?.s!=null&&entry.s!==options.name || !number.test(text))return null;
  if(entry.v!=null){
    const roll=entry.v;
    if(!Array.isArray(roll)||roll.length!==1||!Number.isFinite(roll[0]) || roll[0]<=0 || entry.r===1&&Number(number.exec(text)[1])!==roll[0])return null;
    text=text.replace(number,(_,old,suffix)=>`+${roll[0]}${suffix}`);
  }else if(entry.r!==1)return null;
  const matches=options.baseGroups.flatMap(group=>Array.from({length:quality.maxLevel},(_,i)=>{
    const level=i+1, base=enhancedMemoryBase(group,quality.id,level);
    return base&&canonical(base.ko)===text?{id:group.id,level,text:base.ko}:null;
  }).filter(Boolean));
  return matches.length===1?matches[0]:null;
}

function confirmedAffix(entry,options,kind){
  const text=effect(entry);
  if(!text || entry.s!=null&&entry.s!==options.name)return null;
  const tier=kind==='fixed'?entry.ut??'1':entry.mt??'0';
  const matches=options.affixes.filter(row=>row.kind===kind&&canonical(row.name)===text);
  const target=matches.filter(row=>row.tier===tier);
  if(target.length===1)return target[0];
  // MiniTorch stores the T0 wording plus a separate selected random tier.
  const base=matches.filter(row=>row.tier==='0');
  if(kind!=='random'||entry.r===1||target.length||base.length!==1)return null;
  return options.affixes.find(row=>row.kind===kind&&row.groupId===base[0].groupId&&row.tier===tier)??null;
}

export function importIngameMemories(copy,payload,rows){
  if(payload.rv!=null)rows.push({label:'부활 추억',reason:'부활 및 추가 추억은 아직 가져올 수 없습니다.'});
  const memories=payload.mem;
  if(memories==null)return copy;
  if(!object(memories)){
    rows.push({label:'추억',reason:'추억 목록의 형식을 확인할 수 없습니다.'});
    return copy;
  }
  for(const [slotIndex,label] of parts.entries()){
    const data=memories[label];
    if(data==null)continue;
    try {
      const quality=memoryQualities[grades.indexOf(payload.mg?.[label])];
      const options=seasonMemoryOptions(slotIndex);
      if(!copy.targetBuild.hero?.branchId)throw new Error('히어로를 먼저 확인해야 추억을 적용할 수 있습니다.');
      if(!quality)throw new Error('추억의 실제 희귀도가 없습니다.');
      const base=Array.isArray(data.b)&&data.b.length===1&&confirmedBase(data.b[0],options,quality);
      if(!base)throw new Error('기본 옵션의 실제 수치로 강화 단계를 확인할 수 없습니다.');
      let next=editSeasonWorkspace(copy,{kind:'memory-selection',slotIndex,value:base.id,enhancedBase:true});
      next=editSeasonWorkspace(next,{kind:'memory-quality',slotIndex,value:quality.id,enhancedBase:true});
      next=editSeasonWorkspace(next,{kind:'memory-enhancement',slotIndex,value:base.level,enhancedBase:true});
      const affixes=new Set();
      for(const [kind,entries,max] of [['fixed',data.u??[],2],['random',data.r??[],quality.randomLimit]]){
        if(!Array.isArray(entries)||entries.length>max)throw new Error('희귀도에 맞는 추억 옵션 칸을 확인할 수 없습니다.');
        for(const entry of entries){
          const affix=confirmedAffix(entry,options,kind);
          if(!affix||affixes.has(affix.groupId))throw new Error('추억 옵션 또는 티어를 SS14 도감에서 확인할 수 없습니다.');
          affixes.add(affix.groupId);
          next=editSeasonWorkspace(next,{kind:'memory-affix',slotIndex,key:affix.id,value:1});
          const path=`hero.memories.${slotIndex}.${kind}.${affix.groupId}`;
          const row=seasonMemoryRows(next.targetBuild).find(row=>row.path===path);
          if(!row?.record)throw new Error('추억 옵션의 SS14 원문을 확인할 수 없습니다.');
          const controls=row?.memoryRollControls??[];
          if(controls.length===1&&Array.isArray(entry.v)&&entry.v.length===1)
            next=editSeasonWorkspace(next,{kind:'memory-roll',key:controls[0].key,value:entry.v[0]});
          else if(controls.length||entry.v!=null)throw new Error('추억 옵션의 실제 굴림값을 확인할 수 없습니다.');
        }
      }
      copy=next;
      rows.push({label,name:`${quality.name} +${base.level} · ${base.text}`});
    } catch(error){ rows.push({label,reason:error.message}); }
  }
  if(Object.keys(memories).some(key=>!parts.includes(key)))rows.push({label:'추가 추억',reason:'지원 범위 밖의 추억 칸이 있습니다.'});
  return copy;
}
