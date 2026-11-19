import { SS14_CORROSION_PAIRS, SS14_CORROSION_POOLS } from './data/ss14CorrosionPairs.generated.js';
import { SS14_LOG_GEAR } from './data/ss14LogGear.generated.js';
import { SS14_LOG_COMPLETION } from './data/ss14LogCompletion.generated.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { SS14_GEAR_EN } from './data/ss14Gear.en.generated.js';
import { parseTlidbGearTooltip } from './tlidbGearTooltipCalculation.js';

const cache=new Map();
const norm=s=>s.replace(/\s+/gu,'').replace(/[–—]/gu,'-');
function span(lines,text){
  const part=text.split('\n').map(norm);
  const hits=lines.flatMap((_,i)=>part.every((line,j)=>lines[i+j]===line)?[i]:[]);
  return hits.length===1?{start:hits[0],length:part.length}:null;
}
export function corrosionOptions(id){
  if(cache.has(id))return cache.get(id);
  const map=SS14_CORROSION_PAIRS[id], authority=SS14_LOG_COMPLETION.gear[id]??SS14_LOG_GEAR.records[id];
  const en=SS14_GEAR_EN.records[id],ko=SS14_CARDS.records[id];
  if(!map||!authority||authority.sourcePageSha256!==map.en||authority.ko?.sourcePageSha256!==map.ko
    ||authority.cardSha256!==en?.sourcePageSha256||!ko?.koreanTextVerified||ko.season!=='SS14'||ko.sourceRecordKey!==en.sourceRecordKey)return [];
  const enLines=en.detail.split('\n').map(norm),koLines=ko.detail.split('\n').map(norm);
  const result=[];
  for(const [base,variant] of map.pairs){
    const n=authority.normal.find(r=>r.id===base), c=authority.corroded.find(r=>r.id===variant);
    const kn=authority.ko.rows.find(r=>r.id===base),kc=authority.ko.rows.find(r=>r.id===variant);
    if(!n||!c||!kn||!kc||/\p{Script=Han}/u.test(kn.text+kc.text))continue;
    const english=span(enLines,n.text),korean=span(koLines,kn.text);
    if(english&&korean)result.push({base,variant,english,korean,normal:kn.text,original:n.text,corroded:kc.text,replacement:c.text});
  }
  cache.set(id,result);
  return result;
}
export function corrosionCard(record,binding,locale='en'){
  const state=binding?.corrosion;
  if(state===undefined)return record;
  const id=binding.itemId,map=SS14_CORROSION_PAIRS[id];
  if(!record||!map||!state||state.en!==map.en||state.ko!==map.ko||binding.logGear
    ||!Array.isArray(state.selected)||(!state.selected.length&&state.implicit===undefined)||new Set(state.selected).size!==state.selected.length
    ||binding.sourcePageSha256!==SS14_GEAR_EN.records[id]?.sourcePageSha256)return null;
  const opts=corrosionOptions(id),cuts=[];
  for(const base of state.selected){
    const o=opts.find(o=>o.base===base);
    if(!o)return null;
    cuts.push(locale==='ko'?{...o.korean,text:o.corroded}:{...o.english,text:o.replacement});
  }
  let implicitText='';
  if(state.implicit!==undefined){
    const pool=corrosionBasePool(id),picked=pool?.rows.find(r=>r.id===state.implicit?.id);
    if(!picked||state.implicit.en!==pool.en||state.implicit.ko!==pool.ko)return null;
    const spans=pool[locale==='ko'?'korean':'english'];
    implicitText=picked[locale];
    for(const cut of spans)if(cut.length)cuts.push({...cut,text:''});
  }
  const original=locale==='ko'?SS14_CARDS.records[id]:SS14_GEAR_EN.records[id];
  if(record.sourcePageSha256!==original.sourcePageSha256||record.detail!==original.detail)return null;
  const lines=record.detail.split('\n');
  let end=lines.length;
  for(const {start,length,text} of cuts.sort((a,b)=>b.start-a.start||b.length-a.length)){
    if(start+length>end)return null;
    lines.splice(start,length,...(text?[text]:[]));end=start;
  }
  if(implicitText)lines.unshift(implicitText);
  return {...record,detail:lines.join('\n'),implicitLines:implicitText.split('\n').filter(Boolean).length};
}
export function isImplicitRoll(record,key){
  return Number(key.split(':').at(-2))<(record.implicitLines??0);
}

const basePools=new Map();
export function corrosionBasePool(id){
  if(basePools.has(id))return basePools.get(id);
  const map=SS14_CORROSION_PAIRS[id],pool=SS14_CORROSION_POOLS[map?.slug];
  if(!pool||!corrosionOptions(id).length)return null;
  const authority=SS14_LOG_COMPLETION.gear[id]??SS14_LOG_GEAR.records[id];
  const findSpans=(card,rows)=>{
    const lines=card.detail.split('\n').map(norm);
    return map.baseIds.length ? map.baseIds.map(key=>{
      const matches=rows.filter(r=>r.id===key);
      return matches.length===1?span(lines,matches[0].text):null;
    }):[{start:0,length:0}];
  };
  const english=findSpans(SS14_GEAR_EN.records[id],authority.normal);
  const korean=findSpans(SS14_CARDS.records[id],authority.ko.rows);
  const verified=english.every(Boolean)&&korean.every(Boolean)?{...pool,english,korean,slug:map.slug}:null;
  basePools.set(id,verified);
  return verified;
}

export function setSeasonCorrosion(binding,base,enabled){
  const id=binding?.itemId, source=SS14_GEAR_EN.records[id],map=SS14_CORROSION_PAIRS[id];
  if(!map||binding.logGear||!corrosionOptions(id).some(o=>o.base===base))throw Error('이 장비에서 선택할 수 없는 침식 효과입니다.');
  const before=corrosionCard(source,binding),selected=new Set(binding.corrosion?.selected);
  if(!before)throw Error('저장된 침식 효과를 다시 선택하세요.');
  if(enabled===selected.has(base))return;
  if(enabled)selected.add(base);else selected.delete(base);
  if(selected.size||binding.corrosion?.implicit)binding.corrosion={...binding.corrosion,en:map.en,ko:map.ko,selected:[...selected].sort()};
  else delete binding.corrosion;
  preserveRolls(binding,before);
}

export function setSeasonCorrosionBase(binding,key){
  const id=binding?.itemId,pool=corrosionBasePool(id),map=SS14_CORROSION_PAIRS[id];
  if(!pool||binding.logGear||typeof key!=='string'||(key&&!pool.rows.some(r=>r.id===key)))throw Error('이 장비에 적용할 침식 기본 효과를 선택하세요.');
  if((binding.corrosion?.implicit?.id??'')===key)return;
  const before=corrosionCard(SS14_GEAR_EN.records[id],binding);
  if(!before)throw Error('저장된 침식 효과를 다시 선택하세요.');
  if(key){
    binding.corrosion??={en:map.en,ko:map.ko,selected:[]};
    binding.corrosion.implicit={id:key,en:pool.en,ko:pool.ko};
  }else{
    delete binding.corrosion.implicit;
    if(!binding.corrosion.selected.length)delete binding.corrosion;
  }
  preserveRolls(binding,before);
}
function preserveRolls(binding,before){
  const id=binding.itemId,source=SS14_GEAR_EN.records[id];
  const after=corrosionCard(source,binding);
  if(!after)throw Error('같은 효과에 침식을 두 번 적용할 수 없습니다.');
  const effects=record=>parseTlidbGearTooltip({id,categoryId:'gear',tlidbText:{en:{...record,sourcePageVersion:'SS14',sourceFieldStatus:{detail:'exact'}}}},
    {season:'SS14',flavorReceipt:record.flavorReceipt}).effects.filter(e=>e.roll).map(e=>({...e,implicit:isImplicitRoll(record,e.roll.key)}));
  const old=effects(before),current=effects(after),values=binding.rolls,next={};
  for(const e of current){
    const matches=v=>v.implicit===e.implicit&&v.sourceText===e.sourceText&&v.stat===e.stat&&v.operation===e.operation&&v.unit===e.unit&&v.roll.min===e.roll.min&&v.roll.max===e.roll.max;
    const same=old.filter(matches);
    if(same.length===1&&current.filter(matches).length===1&&Number.isFinite(values[same[0].roll.key]))next[e.roll.key]=values[same[0].roll.key];
  }
  binding.rolls=next;
}
