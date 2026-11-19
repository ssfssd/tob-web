import { getSeasonPickerOptions, getSeasonSelectionRecord, isTwoHandedWeapon, SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';
import { seasonSupportOptions, supportFitsSocket } from './seasonSupport.js';
import { editSeasonWorkspace, openSharedSeasonBuild, resetSeasonWorkspace, shareableSeasonBuild } from './seasonWorkspace.js';
import { seasonGearSlotRollEntry } from './seasonBuild.js';
import { SS14_MINITORCH_ROLL_MAP } from './data/ss14MinitorchRollMap.generated.js';
import { SS14_MINITORCH_HERO_MAP } from './data/ss14MinitorchHeroMap.generated.js';
import { seasonHeroOptions } from './seasonHeroSelection.js';
import { importIngameMemories } from './seasonIngameMemories.js';
import { importIngameTalents } from './seasonIngameTalents.js';

const skillSlots = ['a1','a2','a3','a4','a5','p1','p2','p3','p4'];
const gearSlots = ['weapon1','weapon2','helmet','chest','neck','glove','belt','ring1','ring2','boots'];
const object = value => value && typeof value==='object' && !Array.isArray(value);
const slotLabel = (id,index) => index===0 ? '주력' : `${id[0]==='a'?'액티브':'패시브'} ${id[1]}`;
const readName = entry => {
  const name = entry?.n ?? entry?.name;
  return typeof name==='string' && name.length<=100 ? name.trim() : '';
};

function matchSkill(entry,options) {
  const name=readName(entry);
  if(!name || typeof entry.h==='string')throw new Error('스킬의 이름을 SS14 도감과 연결하지 못했습니다.');
  const ids=[...new Set(options.filter(o=>o.name===name).map(o=>o.id))];
  if(ids.length!==1)throw new Error(`${name}의 SS14 항목을 하나로 확인하지 못했습니다.`);
  const level=typeof entry.l==='string'&&/^\d{1,2}$/u.test(entry.l)?Number(entry.l):entry.l;
  if(!Number.isInteger(level)||level<1||level>99)throw new Error(`${name}의 실제 레벨이 없습니다.`);
  if([entry.so,entry.pr,entry.proto].some(values=>Array.isArray(values)&&values.length))
    throw new Error(`${name}의 추가 옵션을 아직 가져올 수 없습니다.`);
  return {id:ids[0],name,level};
}

function importHero(copy,identity,selections,rows) {
  if(identity==null && selections==null)return copy;
  const mapping=Array.isArray(identity)&&identity.length===2
    ? SS14_MINITORCH_HERO_MAP.find(([hero,branch])=>hero===identity[0]&&branch===identity[1]) : null;
  const hero=mapping&&seasonHeroOptions().find(o=>o.id===mapping[2]&&o.sourcePageSha256===mapping[3]);
  if(!hero){
    rows.push({label:'히어로',reason:'히어로 분기를 SS14 도감과 연결하지 못했습니다.'});
    return copy;
  }
  copy=editSeasonWorkspace(copy,{kind:'hero-selection',value:hero.id});
  rows.push({label:'히어로',name:`${hero.name.split('|').at(-1)} · ${hero.title}`});
  if(selections==null)return copy;
  if(!object(selections)||Object.keys(selections).length>6){
    rows.push({label:'히어로 특성',reason:'선택 특성 목록의 형식을 확인할 수 없습니다.'});
    return copy;
  }
  const choices=[];
  for(const [position,name] of Object.entries(selections)){
    const node=mapping[4].find(row=>row[0]===position&&row[1]===name);
    if(node)choices.push(node);
    else rows.push({label:'히어로 특성',reason:'SS14에서 확인하지 못한 선택 특성이 있습니다.'});
  }
  const applied=new Set();
  for(const [,name,level,choiceIndex,value,parent] of choices.sort((a,b)=>a[2]-b[2]||a[3]-b[3])){
    const label=`${level}레벨 특성`;
    if(choices.filter(row=>row[2]===level && row[3]===choiceIndex).length!==1 || parent && !applied.has(parent)){
      rows.push({label,reason:`${name}의 선행 특성 또는 선택 칸을 확인할 수 없습니다.`});
      continue;
    }
    copy=editSeasonWorkspace(copy,{kind:'hero-choice',key:level,choiceIndex,value});
    applied.add(name);
    rows.push({label,name});
  }
  return copy;
}

function importSkills(copy,source,rows) {
  if(source==null)return copy;
  if(!object(source)){
    rows.push({label:'스킬',reason:'스킬 목록의 형식을 확인할 수 없습니다.'});
    return copy;
  }
  for(const [rowIndex,slot] of skillSlots.entries()){
    const entries=source[slot];
    if(entries==null || Array.isArray(entries)&&!entries.some(entry=>entry!=null))continue;
    const label=slotLabel(slot,rowIndex);
    try {
      if(!Array.isArray(entries)||entries.length>6||!entries[0])throw new Error('스킬과 보조 칸 구성을 확인할 수 없습니다.');
      const main=matchSkill(entries[0],getSeasonPickerOptions('skills',rowIndex));
      const host=getSeasonSelectionRecord('skills',main.id);
      const supports=entries.slice(1).flatMap((entry,supportIndex)=>entry==null?[]:[{
        ...matchSkill(entry,seasonSupportOptions().filter(o=>supportFitsSocket(o.id,host,rowIndex,supportIndex))),supportIndex,
      }]);
      let next=editSeasonWorkspace(copy,{kind:'skill-selection',rowIndex,value:main.id});
      next=editSeasonWorkspace(next,{kind:'skill-level',rowIndex,value:main.level});
      if(supports.length)next=editSeasonWorkspace(next,{kind:'support-count',rowIndex,value:supports.at(-1).supportIndex+1});
      for(const {id,level,supportIndex} of supports){
        next=editSeasonWorkspace(next,{kind:'support-selection',rowIndex,supportIndex,value:id});
        next=editSeasonWorkspace(next,{kind:'support-level',rowIndex,supportIndex,value:level});
      }
      copy=next;
      rows.push({label,name:main.name,level:main.level,supports});
    } catch(error){ rows.push({label,reason:error.message}); }
  }
  if(Object.keys(source).some(key=>!skillSlots.includes(key)))
    rows.push({label:'추가 스킬 칸',reason:'지원 범위 밖의 스킬 칸이 있습니다.'});
  return copy;
}

function matchGear(entry,index) {
  const name=readName(entry);
  if(!object(entry) || entry.k!=='i')throw new Error('제작·블러드 장비는 아직 적용할 수 없습니다.');
  if(!name || name.startsWith('#'))throw new Error('장비 이름을 SS14 도감과 연결하지 못했습니다.');
  const ids=[...new Set(getSeasonPickerOptions('gear',index).filter(o=>o.name===name).map(o=>o.id))];
  if(ids.length!==1)throw new Error(`${name}의 SS14 장비와 부위를 확인하지 못했습니다.`);
  return {id:ids[0],name};
}

function hasExtraGearOptions(entry) {
  return Object.entries(entry).some(([key,value])=>{
    if(['k','n','name','p','ro'].includes(key))return false;
    if(['rd','ot'].includes(key) && object(value))return Object.keys(value).length>0;
    if(['eb','er'].includes(key) && Array.isArray(value))return value.length>0;
    return value!=null && value!=='';
  });
}

function readGearRolls(gear,card,raw) {
  if(!card?.controls)throw new Error(`${gear.name}의 SS14 옵션을 확인할 수 없습니다.`);
  const hasValues=Array.isArray(raw)&&raw.some(part=>part!=null && (!Array.isArray(part) || part.length));
  if(!card.controls.length&&!hasValues&&(raw==null||Array.isArray(raw)))return [];
  const mapping=SS14_MINITORCH_ROLL_MAP[gear.id];
  if(!mapping || mapping[0]!==card.receipt.sourcePageSha256)
    throw new Error(`${gear.name}의 실제 옵션 수치를 확인해야 합니다.`);
  const [,optionCount,bindings]=mapping;
  const positions=new Set(bindings.map(([index])=>index));
  if(!Array.isArray(raw)||raw.length>optionCount||raw.some((part,index)=>!positions.has(index)&&part!=null&&(!Array.isArray(part)||part.length)))
    throw new Error(`${gear.name}의 실제 옵션 수치를 확인해야 합니다.`);
  return bindings.map(([index,suffix])=>{
    const key=`tlidb-gear-tooltip:${gear.id}:${suffix}`;
    const control=card.controls.find(row=>row.key===key);
    const part=raw[index];
    if(!control||!Array.isArray(part)||part.length!==1||!Number.isFinite(part[0])||part[0]<control.min||part[0]>control.max)
      throw new Error(`${gear.name}의 옵션 수치가 비어 있거나 SS14 원문 범위를 벗어났습니다.`);
    return {key,value:part[0]};
  });
}

function importGear(copy,source,rows) {
  if(source==null)return copy;
  if(!object(source)){
    rows.push({label:'장비',reason:'장비 목록의 형식을 확인할 수 없습니다.'});
    return copy;
  }
  let weaponConflict=false;
  if(source.weapon1!=null && source.weapon2!=null){
    try { weaponConflict=isTwoHandedWeapon(matchGear(source.weapon1,0).id); } catch { /* report the unmatched weapon below */ }
  }
  for(const [slotIndex,slot] of gearSlots.entries()){
    const entry=source[slot];
    if(entry==null)continue;
    const label=SEASON_GEAR_SLOT_LABELS[slotIndex];
    try {
      if(slotIndex<2 && weaponConflict)
        throw new Error('인게임 데이터의 양손 무기와 서브 무기가 서로 충돌합니다.');
      const gear=matchGear(entry,slotIndex);
      if(hasExtraGearOptions(entry))throw new Error(`${gear.name}의 굴림값·침식 또는 추가 옵션을 아직 확인할 수 없습니다.`);
      let next=editSeasonWorkspace(copy,{kind:'gear-selection',slotIndex,value:gear.id});
      const rolls=readGearRolls(gear,seasonGearSlotRollEntry(next.targetBuild,slotIndex),entry.ro);
      for(const {key,value} of rolls)next=editSeasonWorkspace(next,{kind:'gear-roll',slotIndex,key,value});
      copy=next;
      rows.push({label,name:gear.name,rollCount:rolls.length});
    }catch(error){ rows.push({label,reason:error.message}); }
  }
  if(Object.keys(source).some(key=>!gearSlots.includes(key)))
    rows.push({label:'추가 장비 칸',reason:'지원 범위 밖의 장비 칸이 있습니다.'});
  return copy;
}

export function prepareIngameBuildImport(result,current) {
  const rows=[];
  if(result.season!=='SS14')return {rows,document:null,reason:'시즌이 SS14로 확인되는 빌드만 사본으로 열 수 있습니다.'};
  const empty=openSharedSeasonBuild(shareableSeasonBuild(resetSeasonWorkspace(current)));
  const hero=importHero(empty,result.payload.hr,result.payload.hn,rows);
  const equipped=importIngameMemories(hero,result.payload,rows);
  const skills=importSkills(equipped,result.payload.sk,rows);
  const gear=importGear(skills,result.payload.slots,rows);
  const copy=importIngameTalents(gear,result.payload,rows);
  const name=`${(result.title||'인게임 빌드').slice(0,140)} · 인게임 사본`;
  return {rows,document:rows.some(row=>!row.reason)?editSeasonWorkspace(copy,{kind:'name',value:name}):null,
    reason:rows.length?'':'가져올 구성이 없습니다.'};
}
