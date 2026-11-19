import {matchScreenshotCatalogItems} from './screenshotImportSelection.js';
import {getSeasonSelectionOptions, getSeasonSelectionRecord, isTwoHandedWeapon, SEASON_GEAR_SLOT_LABELS} from './seasonSelections.js';
import {seasonSupportItem,seasonSupportOptions,supportFitsSocket} from './seasonSupport.js';
import {seasonMemoryOptions,seasonTalentBoards,talentPanelGroups} from './seasonNativeSelections.js';
import {SS14_CARDS_EN} from './data/ss14Cards.en.generated.js';
import {SS14_SUPPORTS_EN} from './data/ss14Supports.en.generated.js';
import {calculateSeasonBuild} from './seasonBuild.js';
import {editSeasonWorkspace} from './seasonWorkspace.js';
import {labeledGearRolls} from './seasonWorkspaceView.js';
import {resolveSeasonSkillLevel} from './seasonSkillLevels.js';

export const screenshotGroups={gear:'장비',skills:'스킬',supports:'보조',talents:'재능',memories:'추억'};
const compactLine=text=>text.normalize('NFKC').replace(/[–—−~～]/gu,'-').replace(/\s+/gu,'');
const reEscape=text=>text.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const marketText=/검색\s*조건|거래\s*검색|search\s*(?:criteria|filters)|trade\s*search|[<>=≤≥＝]+\s*[+\-]?\d/iu;
const skillSlot=index=>index===0?'주력 1':index<5?`액티브 ${index+1}`:`패시브 ${index-4}`;
let candidates;
export function findSeasonScreenshotMatches(text) {
  if (!candidates) {
    const entries=[
      ...Array.from({length:10},(_,index)=>getSeasonSelectionOptions('gear',index)).flat().map(row=>({...row,group:'gear'})),
      ...[0,5].flatMap(index=>getSeasonSelectionOptions('skills',index)).map(row=>({...row,group:'skills'})),
      ...seasonSupportOptions().map(row=>({...row,group:'supports'})),
      ...seasonTalentBoards().map(row=>({...row,group:'talents'})),
      ...[0,1,2].map(index=>({id:`memory-${index}`,name:seasonMemoryOptions(index).name,group:'memories',index})),
    ];
    candidates=new Map(entries.filter(row=>row.name&&!row.name.includes('미제공')).map(row=>{
      const en=row.group==='supports'?SS14_SUPPORTS_EN.records[row.id]:getSeasonSelectionRecord(row.group,row.id);
      return [row.id,{...row,itemId:row.id,names:[row.name,en?.name]}];
    }));
  }
  return matchScreenshotCatalogItems(text,[...candidates.values()]).map(id=>candidates.get(id));
}

export function seasonScreenshotTargets(build,match) {
  const slots=[...build.skills.active,...build.skills.passive];
  const item=(index,label,edit)=>({id:String(index),label,edit});
  if (match.group==='gear') return build.gear.slots.flatMap((slot,index)=>{
    if (slot?.itemId || (index===0&&build.gear.slots[1]?.itemId&&isTwoHandedWeapon(match.id))
      || (index===1&&isTwoHandedWeapon(build.gear.slots[0]?.itemId))
      || !getSeasonSelectionOptions('gear',index).some(row=>row.id===match.id)) return [];
    return [item(index,SEASON_GEAR_SLOT_LABELS[index],{kind:'gear-selection',slotIndex:index,value:match.id})];
  });
  if (match.group==='skills') return slots.flatMap((row,index)=>row.skillId||
    !getSeasonSelectionOptions('skills',index).some(skill=>skill.id===match.id)?[]:
    [item(index,skillSlot(index),{kind:'skill-selection',rowIndex:index,value:match.id})]);
  if (match.group==='supports') return slots.flatMap((row,index)=>row.skillId?row.supports.flatMap((support,column)=>
    support||column>=row.unlockedSupportCount||!supportFitsSocket(match.id,SS14_CARDS_EN.records[row.skillId],index,column)?[]:
      [item(`${index}:${column}`,`${skillSlot(index)} · 보조 ${column+1}`,{kind:'support-selection',rowIndex:index,supportIndex:column,value:match.id})]):[]);
  if (match.group==='talents') return build.talents.boards.flatMap((board,index)=>
    board.treeSlug||!talentPanelGroups(build,index).some(group=>group.choices.some(choice=>choice.id===match.id))?[]:
      [item(index,`재능 패널 ${index+1}`,{kind:'talent-board',slotIndex:index,value:match.id})]);
  return Number.isInteger(match.index)?[item(match.index,`${45+15*match.index}레벨 추억 편집`,null)]:[];
}

export function findSeasonScreenshotGearValues(texts,matches,match,document,selection) {
  if(match?.group!=='gear'||selection?.kind!=='gear-selection'||selection.value!==match.id||
    matches.filter(row=>row.group==='gear').length!==1) return [];
  if(texts.some(text=>marketText.test(text)))return [];
  const name=compactLine(match.name);
  const lines=texts.flatMap(text=>{
    const rows=text.split(/\r?\n/u).map(compactLine);
    const title=rows.indexOf(name);
    return title<0?[]:rows.slice(title+1);
  });
  if(!lines.length)return [];
  const target=editSeasonWorkspace(document,selection);
  const component=calculateSeasonBuild(target.targetBuild).components.find(row=>row.id===match.id && row.category==='gear');
  const entry=component?.calculations?.find(row=>row.slotIndex===selection.slotIndex);
  if (!entry||entry.receipt?.season!=='SS14') return [];
  const candidateByLine=new Map();
  const controls=labeledGearRolls(component,entry).flatMap(control=>{
    const label=compactLine(control.label);
    const ranges=[...label.matchAll(/\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/gu)];
    if (ranges.length!==1||Number(ranges[0][1])!==control.min||Number(ranges[0][2])!==control.max) return [];
    const [before,after]=label.split(ranges[0][0]);
    const range=reEscape(ranges[0][0]);
    const pattern=new RegExp(`^${reEscape(before)}(\\d+(?:\\.\\d+)?)(?:${range})?${reEscape(after)}$`,'u');
    return [{control,pattern}];
  });
  for(const line of new Set(lines)) {
    const matched=controls.flatMap(({control,pattern})=>{
      const raw=pattern.exec(line)?.[1];
      if(raw===undefined) return [];
      return [{control,value:Number(raw)}];
    });
    if(matched.length!==1)continue;
    const {control,value}=matched[0];
    if(!candidateByLine.has(control.key))candidateByLine.set(control.key,{...control,values:new Set()});
    candidateByLine.get(control.key).values.add(value);
  }
  return [...candidateByLine.values()].flatMap(({values,...row})=>{
    const [value]=values;
    return values.size===1&&value>=row.min&&value<=row.max?[{key:row.key,label:row.label,value}]:[];
  });
}

export function findSeasonScreenshotSkillLevel(texts,match) {
  if(!['skills','supports'].includes(match?.group)||texts.some(text=>marketText.test(text)))return null;
  const record=match.group==='skills'?getSeasonSelectionRecord('skills',match.id):null;
  const item=record?{id:match.id,tlidbText:{en:{...record,sourcePageVersion:'SS14'}}}:seasonSupportItem(match.id);
  if (!item) return null;
  const names=[...new Set((match.names??[match.name]).filter(Boolean).map(name=>reEscape(compactLine(name))))].join('|');
  if(!names)return null;
  const name=`(?:${names})`;
  const level='(?:기본)?(?:레벨|lv\\.?|level):?(\\d{1,3})(?:\\+\\d{1,2}|\\(\\+\\d{1,2}\\))?';
  const trailing=new RegExp(`^${name}${level}$`,'iu'), leading=new RegExp(`^${level}${name}$`,'iu');
  const levels=new Set(texts.flatMap(text=>text.split(/\r?\n/u)).flatMap(line=>{
    const compact=compactLine(line);
    const value=(trailing.exec(compact)??leading.exec(compact))?.[1];
    return value===undefined?[]:[Number(value)];
  }));
  if(levels.size!==1)return null;
  const [value]=levels;
  return value>=1&&value<=100&&!resolveSeasonSkillLevel(item,value).blockers.length?value:null;
}
