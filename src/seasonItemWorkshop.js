import { createDefaultBuild } from './engine.js';
import { prepareSeasonMigration } from './seasonMigration.js';
import { createSeasonWorkspace, editSeasonWorkspace } from './seasonWorkspace.js';
import { captureShelf } from './seasonShelf.js';
import { craftFamilySlots, craftOptions, itemGearKind } from './seasonItemCraft.js';
import { projectSeasonComponents } from './seasonComponents.js';
import { getSeasonSelectionOptions } from './seasonSelections.js';
import { memoryQuality } from './seasonMemoryQuality.js';
import { calculateSeasonBuild } from './seasonBuild.js';

const emptyDocument = () => createSeasonWorkspace(prepareSeasonMigration(createDefaultBuild()));
function initializeWorkshopRolls(document,index,implicitOnly=false){
  const binding=document.targetBuild.ss14Inputs.gear[index];
  if(!binding)return document;
  const component=calculateSeasonBuild(document.targetBuild).components.find(c=>c.category==='gear'&&c.id===binding.itemId);
  const controls=component?.calculations?.find(c=>c.slotIndex===index)?.controls??[];
  let next=document;
  for(const c of controls){
    if(implicitOnly&&!c.implicit||Number.isFinite(next.targetBuild.ss14Inputs.gear[index].rolls[c.key]))continue;
    const scale=10**Math.max(...[c.min,c.max].map(v=>String(v).split('.')[1]?.length??0));
    const value=Math.round((c.min+c.max)*scale/2)/scale;
    next=editSeasonWorkspace(next,{kind:'gear-roll',slotIndex:index,key:c.key,value});
  }
  return next;
}
export function createItemWorkshop(kind, index) {
  if (!['memory','gear'].includes(kind) || !Number.isInteger(index) || index < 0 || index >= (kind === 'memory' ? 3 : 10))
    throw Error('제작할 슬롯을 선택하세요.');
  return { type:'workshop', kind, index, category:'base', name:'', document:emptyDocument(), pending:new Map() };
}
export function editItemWorkshop(draft, doc, edit) {
  const index = draft.index;
  if(edit.kind==='gear-corrosion-base'){
    const previous=doc.targetBuild.ss14Inputs.gear[index];
    const next=editSeasonWorkspace(doc,edit);
    if(!edit.value||previous?.corrosion?.implicit?.id===edit.value)return next;
    return initializeWorkshopRolls(next,index,true);
  }
  if (draft.kind === 'memory' && edit.kind === 'memory-preset') {
    const quality = memoryQuality(edit.value);
    if (!quality) throw Error('추억 희귀도를 선택하세요.');
    const memory = doc.targetBuild.hero.memories?.[index];
    if (memory) {
      const set = (document,kind,value) => editSeasonWorkspace(document,{kind,value,slotIndex:index,enhancedBase:true});
      if (memory.enhancement > quality.maxLevel) doc=set(doc,'memory-enhancement',quality.maxLevel);
      doc=set(doc,'memory-quality',quality.id);
      doc=set(doc,'memory-enhancement',quality.maxLevel);
    }
    draft.memoryPreset=quality.id;
    return doc;
  }
  if (draft.kind === 'memory' && edit.kind === 'memory-selection' && edit.value && draft.memoryPreset && !doc.targetBuild.hero.memories?.[index]) {
    const selected=editSeasonWorkspace(doc,{...edit,enhancedBase:true});
    return editItemWorkshop(draft,selected,{kind:'memory-preset',value:draft.memoryPreset});
  }
  if (edit.kind === 'gear-selection') {
    if (edit.value && (!getSeasonSelectionOptions('gear', index).some(r => r.id === edit.value) || itemGearKind(edit.value) !== draft.category))
      throw Error('선택한 슬롯과 장비 종류를 확인하세요.');
    return initializeWorkshopRolls(editSeasonWorkspace(emptyDocument(), edit),index);
  }
  if (['workshop-affix','workshop-remove','workshop-slot'].includes(edit.kind)) {
    const entry = captureShelf(doc.targetBuild, 'gear', index);
    const pool=craftOptions(entry.item.itemId);
    const crafts = entry.item.crafts ??= {};
    const available=pool.filter(o=>o.family===edit.family&&!crafts[o.affixId]);
    const option=edit.kind==='workshop-slot'&&!edit.value
      ? available.find(o=>o.tier==='1')??available[0] : pool.find(o=>o.key===edit.value);
    if (!option) throw Error('이 장비에 적용할 수 있는 SS14 제작 옵션을 선택하세요.');
    const slots=craftFamilySlots(crafts,option.family);
    const isSlot=edit.kind==='workshop-slot';
    if(isSlot && (edit.family!==option.family||!Number.isInteger(edit.position)||edit.position<0||edit.position>=3))
      throw Error('제작 옵션 칸을 확인하세요.');
    const previous=isSlot?slots[edit.position]:crafts[option.affixId];
    if(isSlot && crafts[option.affixId] && previous?.affixId!==option.affixId)throw Error('이미 선택한 옵션입니다.');
    if(isSlot && previous?.affixId===option.affixId && previous.tierId===option.tierId)return doc;
    slots.forEach((affix,i)=>{if(affix && i<3)affix.position=i;});
    if (previous) {
      const old = pool.find(o => o.affixId === previous.affixId && o.tierId === previous.tierId);
      if (old) for (const key of Object.keys(entry.craftRolls)) if (key.startsWith('craft:'+index+':'+old.modifierId+':')) delete entry.craftRolls[key];
      delete crafts[previous.affixId];
    }
    if (edit.kind !== 'workshop-remove') {
      const count = Object.keys(crafts).filter(id => id.split(':')[1] === option.family).length;
      if (!previous && count >= 3) throw Error('접두 옵션과 접미 옵션은 각각 3개까지 선택할 수 있습니다.');
      const position=isSlot?edit.position:previous?.position??slots.indexOf(null);
      crafts[option.affixId] = { affixId:option.affixId, tierId:option.tierId, position };
    }
    let next=editSeasonWorkspace(doc, { kind:'shelf-apply', slotIndex:index, value:entry });
    if(isSlot){
      const row=projectSeasonComponents(next.targetBuild).rows.find(r=>r.path===`gear.slots.${index}.crafts.${option.affixId}`);
      for(const c of row?.extensionControls??[]){
        const scale=10**Math.max(...[c.min,c.max].map(n=>String(n).split('.')[1]?.length??0));
        const value=Math.round((c.min+c.max)*scale/2)/scale;
        next=editSeasonWorkspace(next,{kind:'extension-input',key:c.key,value});
      }
    }
    return next;
  }
  return editSeasonWorkspace(doc, edit);
}
export function openGearWorkshop(index, build, candidate) {
  const draft=createItemWorkshop('gear',index);
  const worn=build.gear?.slots?.[index]?.itemId;
  const id=candidate || worn;
  const category=itemGearKind(id);
  if(!category)return draft;
  draft.category=category;
  draft.document=id===worn
    ? editSeasonWorkspace(draft.document,{kind:'shelf-apply',slotIndex:index,value:captureShelf(build,'gear',index)})
    : editItemWorkshop(draft,draft.document,{kind:'gear-selection',slotIndex:index,value:id});
  return draft;
}
export function finishedWorkshopItem(draft) {
  const entry = captureShelf(draft.document.targetBuild, draft.kind, draft.index);
  if (draft.name.trim()) entry.name = draft.name.trim();
  return entry;
}
