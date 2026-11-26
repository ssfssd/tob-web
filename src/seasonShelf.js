import {normalizeBuild} from './engine.js';
import {captureSeasonConfiguration} from './seasonConfiguration.js';
import {getSeasonSelectionOptions} from './seasonSelections.js';
import {seasonMemoryOptions,seasonTalentNodes} from './seasonNativeSelections.js';
import {editSeasonPrism,savedSeasonPrismNode} from './seasonPrismPlacement.js';
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
const slatePath=(boardId,instanceId)=>`divinity.${boardId}.${instanceId}`;
const matchesSlatePath=(key,path)=>key.startsWith(path+'.')||key.startsWith(path+':');
function gearCraftRolls(entry){
  return Object.entries(entry.craftRolls??{}).map(([key,roll])=>{
    const match=/^craft:([0-9]):(\d+:[1-9]\d*)$/u.exec(key);
    if(!match||Number(match[1])!==entry.index)throw Error('제작 옵션의 장비 칸을 확인하세요.');
    return [match[2],roll];
  });
}
export function shelfGearComparisonKey(entry){
  const {instanceId,...item}=entry.item;
  return JSON.stringify([item,entry.bindings||null,gearCraftRolls(entry)]);
}
export function captureShelf(build,kind,index){
  const inputs=build.ss14Inputs;
  let item, bindings, name, slateConditions;
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
    slateConditions=subset(inputs.componentConditions,key=>item?.slateInventory.some(s=>matchesSlatePath(key,slatePath(item.boardId,s.instanceId))));
  }else if(kind==='prism'){
    const placement=build.talents?.placedPrism;
    if(placement?.boardIndex!==index)throw Error('이 패널에 배치한 프리즘을 선택하세요.');
    item=build.talents?.prismInventory?.find(p=>(p.instanceId??p.id)===placement?.instanceId);
    const tree=build.talents?.boards?.[placement?.boardIndex]?.treeSlug;
    if(item&&tree){name=build.name+' · 프리즘';bindings={placement,tree};}
  }
  if(!name)throw Error('보관할 항목을 먼저 장착하거나 배치하세요.');
  const craftRolls = kind === 'gear' ? subset(inputs.extensionInputs, k => k.startsWith('craft:'+index+':')) : undefined;
  return structuredClone({id:crypto.randomUUID(),name,kind,index,item,bindings,...(craftRolls ? {craftRolls} : {}),
    ...(slateConditions?{slateConditions}:{})});
}
export function applyShelf(target,entry,index,{newSlatePage=false}={}){
  const {kind,item,bindings,slateConditions}=structuredClone(entry), inputs=target.ss14Inputs;
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
    for(const [key,roll] of gearCraftRolls(entry))remaining['craft:'+index+':'+key]=structuredClone(roll);
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
    const old=newSlatePage?null:target.divinity.boards.find(b=>b.boardId===target.divinity.activeBoardId);
    const others=target.divinity.boards.filter(b=>b!==old);
    const occupied=new Set(others.flatMap(board=>board.slateInventory.map(s=>s.instanceId)));
    const reserved=new Set([...occupied,...item.slateInventory.map(s=>s.instanceId)]);
    const oldIds=new Set(old?.slateInventory.map(s=>s.instanceId));
    const idMap=new Map();
    const fromBoard=item.boardId;
    let toBoard=old?.boardId??fromBoard;
    for(let serial=1;others.some(board=>board.boardId===toBoard);serial++)toBoard=`${fromBoard}-copy-${serial}`;
    for(const slate of item.slateInventory){
      const source=slate.instanceId;
      if(idMap.has(source))throw Error('보관한 석판 식별자가 중복되었습니다.');
      let id=source;
      if(occupied.has(source))
        for(let serial=1;reserved.has(id);serial++)id=`${source}-copy-${serial}`;
      idMap.set(source,id);
      reserved.add(id);
      slate.instanceId=id;
    }
    for(const cell of item.cells){
      const mapped=idMap.get(cell.slateInstanceId);
      if(!mapped)throw Error('보관한 석판 배치를 확인하세요.');
      cell.slateInstanceId=mapped;
    }
    item.boardId=toBoard;
    target.divinity.boards=old?target.divinity.boards.map(b=>b===old?item:b):[...others,item];
    target.divinity.activeBoardId=item.boardId;
    inputs.slateSelections=subset(inputs.slateSelections,key=>!oldIds.has(key));
    for(const [source, binding] of Object.entries(bindings??{})){
      if(!idMap.has(source))throw Error('보관한 석판 옵션을 확인하세요.');
      inputs.slateSelections[idMap.get(source)]=binding;
    }
    if(Object.keys(slateConditions??{}).length||inputs.componentConditions){
      const previous=inputs.componentConditions;
      const replaced=`divinity.${toBoard}.`;
      inputs.componentConditions=subset(previous,key=>!key.startsWith(replaced));
      for(const [source,id] of idMap){
        const path=slatePath(fromBoard,source),next=slatePath(toBoard,id);
        const conditions=slateConditions??previous;
        const prefix=slateConditions===undefined?next:path;
        for(const [key,binding] of Object.entries(conditions??{}))if(matchesSlatePath(key,prefix))
          inputs.componentConditions[next+key.slice(prefix.length)]=binding;
      }
    }
    inputs.mechanicReceipts=seasonMechanicPins();
  }else if(kind==='prism'){
    group='talents';
    if(!bindings?.tree||!bindings.placement||!Number.isInteger(index)||index<1||index>3||target.talents?.boards?.[index]?.treeSlug!==bindings.tree)
      throw Error('보관할 때와 같은 재능 패널에 적용하세요.');
    const nodeId=savedSeasonPrismNode(bindings.tree,bindings.placement);
    if(!seasonTalentNodes(bindings.tree).some(node=>!node.core&&node.id===nodeId))
      throw Error('보관한 프리즘의 재능 칸을 확인하세요.');
    const {placedPrism}=target.talents;
    const inventory=[...target.talents.prismInventory??[]];
    const existing=inventory.find(p=>JSON.stringify({...p,instanceId:null,id:null})===JSON.stringify({...item,instanceId:null,id:null}));
    const id=existing?.instanceId??existing?.id??crypto.randomUUID();
    if(!existing)inventory.push({...item,instanceId:id});
    if(placedPrism?.instanceId===id&&placedPrism.boardIndex===index&&placedPrism.nodeId===nodeId)return;
    const draft={talents:{...target.talents,prismInventory:inventory}};
    if(placedPrism&&placedPrism.instanceId!==id)
      editSeasonPrism(draft,{kind:'prism-remove',slotIndex:placedPrism.boardIndex,key:placedPrism.instanceId});
    editSeasonPrism(draft,{kind:'prism-place',slotIndex:index,key:id,value:nodeId});
    target.talents=draft.talents;
  }else throw Error('보관함 유형을 확인하세요.');
  (inputs.configurations??={})[group]=captureSeasonConfiguration(target,group);
  inputs.componentReceipts={...inputs.componentReceipts,...pinSeasonComponentReceipts(target,[group])};
}
