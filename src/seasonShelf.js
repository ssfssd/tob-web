import {normalizeBuild} from './engine.js';
import {captureSeasonConfiguration} from './seasonConfiguration.js';
import {getSeasonSelectionOptions} from './seasonSelections.js';
import {seasonMemoryOptions} from './seasonNativeSelections.js';
import {pinSeasonComponentReceipts} from './seasonComponents.js';
import {seasonMechanicPins} from './seasonMechanicInputs.js';
import {EMPTY_TRAIT_MEMORY} from './seasonHeroSelection.js';

export const SHELF_KEY='tob.ss14.itemShelf.v1';
export function readShelf(storage){
  const list=JSON.parse(storage.getItem(SHELF_KEY)??'[]');
  if(!Array.isArray(list)||!list.every(v=>v&&['gear','memory','divinity','prism'].includes(v.kind)&&typeof v.id==='string'&&typeof v.name==='string'&&v.item))throw Error('보관함을 읽을 수 없습니다.');
  return list;
}
const subset=(map,predicate)=>Object.fromEntries(Object.entries(map??{}).filter(([k])=>predicate(k)));
export function captureShelf(build,kind,index){
  const inputs=build.ss14Inputs;
  let item, bindings, name;
  if(kind==='gear'){
    item=normalizeBuild(build).gear.slots[index];
    name=getSeasonSelectionOptions('gear',index).find(o=>o.id===item?.itemId)?.name;
    bindings=inputs.gear[index]??null;
  }else if(kind==='memory'){
    item=build.hero?.memories?.[index];
    if(item)name=seasonMemoryOptions(index).name+' +'+item.enhancement;
    bindings={base:inputs.memoryBases?.[index],rolls:subset(inputs.memoryRolls,k=>k.startsWith('hero.memories.'+index+'.'))};
  }else if(kind==='divinity'){
    item=build.divinity?.boards?.find(b=>b.boardId===build.divinity.activeBoardId);
    if(item?.slateInventory?.length)name=build.name+' · 신격';
    bindings=subset(inputs.slateSelections,k=>item?.slateInventory.some(s=>s.instanceId===k));
  }else if(kind==='prism'){
    const placement=build.talents?.placedPrism;
    item=build.talents?.prismInventory?.find(p=>(p.instanceId??p.id)===placement?.instanceId);
    const tree=build.talents?.boards?.[placement?.boardIndex]?.treeSlug;
    if(item&&tree){name=build.name+' · 프리즘';bindings={placement,tree};}
  }
  if(!name)throw Error('보관할 항목을 먼저 장착하거나 배치하세요.');
  const craftRolls = kind === 'gear' ? subset(inputs.extensionInputs, k => k.startsWith('craft:'+index+':')) : undefined;
  return structuredClone({id:crypto.randomUUID(),name,kind,index,item,bindings,...(craftRolls ? {craftRolls} : {})});
}
export function applyShelf(target,entry,index){
  const {kind,item,bindings}=structuredClone(entry), inputs=target.ss14Inputs;
  let group;
  if(kind==='gear'){
    if(!getSeasonSelectionOptions('gear',index).some(o=>o.id===item.itemId))throw Error('이 슬롯에 장착할 수 없는 장비입니다.');
    group='gear';
    const normalized=normalizeBuild(target);
    target.gear={...target.gear,slots:normalized.gear.slots};
    target.gear.slots[index]={...item,instanceId:'ss14-shelf-gear-'+index};
    const ids=target.gear.slots.map(s=>s?.itemId??null);
    target.selections={...target.selections,gear:ids};
    target.selectionProjection={...target.selectionProjection,gear:[...ids]};
    if(inputs.selections?.gear)delete inputs.selections.gear[index];
    delete inputs.gear[index];
    if(bindings)inputs.gear[index]=bindings;
    const remaining = subset(inputs.extensionInputs, k => !k.startsWith('craft:'+index+':'));
    for (const [key, roll] of Object.entries(entry.craftRolls ?? {})) {
      const match = /^craft:([0-9]):(\d+:[1-9]\d*)$/u.exec(key);
      if (!match || Number(match[1]) !== entry.index) throw Error('제작 옵션의 장비 칸을 확인하세요.');
      remaining['craft:'+index+':'+match[2]] = structuredClone(roll);
    }
    if (inputs.extensionInputs || Object.keys(remaining).length) inputs.extensionInputs = remaining;
  }else if(kind==='memory'){
    if(index!==entry.index||!Number.isInteger(index)||index<0||index>2)throw Error('같은 종류의 추억 슬롯을 선택하세요.');
    group='hero';
    target.hero.memories??=[];
    while(target.hero.memories.length<index)target.hero.memories.push(null);
    target.hero.memories[index]=item;
    inputs.heroMemoryMode='configured-v1';
    inputs.equippedTraitLevels=(inputs.equippedTraitLevels??0)|(1<<index);
    const choices=inputs.heroSelection?.choices,level=[45,60,75][index];
    if(choices?.[level]===EMPTY_TRAIT_MEMORY)delete choices[level];
    if(Array.isArray(choices?.[level])&&choices[level].includes(EMPTY_TRAIT_MEMORY)){
      choices[level]=choices[level].map(v=>v===EMPTY_TRAIT_MEMORY?'':v);
      if(!choices[level].some(Boolean))delete choices[level];
    }
    if(inputs.memoryBases)delete inputs.memoryBases[index];
    if(bindings.base)(inputs.memoryBases??={})[index]=bindings.base;
    inputs.memoryRolls={...subset(inputs.memoryRolls,k=>!k.startsWith('hero.memories.'+index+'.')),...bindings.rolls};
  }else if(kind==='divinity'){
    group='divinity';
    target.divinity??={boards:[]};
    const old=target.divinity.boards.find(b=>b.boardId===target.divinity.activeBoardId);
    const others=target.divinity.boards.filter(b=>b!==old);
    if(others.some(b=>b.slateInventory.some(s=>item.slateInventory.some(t=>t.instanceId===s.instanceId))))throw Error('다른 신격 페이지와 석판 식별자가 겹칩니다.');
    item.boardId=old?.boardId??item.boardId;
    target.divinity.boards=old?target.divinity.boards.map(b=>b===old?item:b):[...others,item];
    target.divinity.activeBoardId=item.boardId;
    inputs.slateSelections={...subset(inputs.slateSelections,k=>!old?.slateInventory.some(s=>s.instanceId===k)),...bindings};
    inputs.mechanicReceipts=seasonMechanicPins();
  }else if(kind==='prism'){
    group='talents';
    if(!bindings.tree||target.talents?.boards?.[index]?.treeSlug!==bindings.tree)throw Error('보관할 때와 같은 재능 패널에 적용하세요.');
    const inventory=target.talents.prismInventory??=[];
    const existing=inventory.find(p=>JSON.stringify({...p,instanceId:null,id:null})===JSON.stringify({...item,instanceId:null,id:null}));
    const id=existing?.instanceId??existing?.id??crypto.randomUUID();
    if(!existing)inventory.push({...item,instanceId:id});
    target.talents.placedPrism={...bindings.placement,boardIndex:index,instanceId:id};
  }else throw Error('보관함 유형을 확인하세요.');
  (inputs.configurations??={})[group]=captureSeasonConfiguration(target,group);
  inputs.componentReceipts={...inputs.componentReceipts,...pinSeasonComponentReceipts(target,[group])};
}
