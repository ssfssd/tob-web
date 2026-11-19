import { findItemById } from './catalog.js';
import { inspectSeasonAllocation } from './seasonAllocation.js';
import { buildTraitSlots } from './seasonHeroSelection.js';
import { seasonTalentBoards, seasonTalentNodes } from './seasonNativeSelections.js';
import { hasRevelation, revelationNodeOptions } from './seasonTheaRevelation.js';
import { editSeasonWorkspace } from './seasonWorkspace.js';

let catalog;
function boardCatalog(){
  if(catalog)return catalog;
  catalog=new Map();
  for(const board of seasonTalentBoards()){
    const nodes=seasonTalentNodes(board.id).map(node=>({...node,sourceId:
      findItemById(node.id)?.tlidbText?.en?.sourceRecordKey?.match(/^data-(?:talent-)?id:(\d{8}):/u)?.[1]}));
    const codes=new Set(nodes.filter(node=>!node.core&&node.sourceId).map(node=>node.sourceId.slice(0,2)));
    if(codes.size===1)catalog.set([...codes][0],{...board,nodes});
  }
  return catalog;
}

function decodeCore(entry,boards){
  const option=entry?.e===undefined?entry?.v:entry;
  if(option?.r||option?.v?.length)return null;
  const name=typeof option?.e==='string'&&option.e.match(/^\[([^\]]+)\]/u)?.[1];
  const choices=[...boards].flatMap(([code,board])=>board.name===option?.t||board.name===option?.s
    ? board.nodes.filter(node=>node.core&&node.name===name).map(node=>({code,node})):[]);
  return choices.length===1&&(entry?.c===undefined||entry.c===1)?choices[0]:null;
}

function boardOrder(present,order){
  const rank=code=>order.includes(code)?order.indexOf(code):order.length;
  const sorted=[...present].sort((a,b)=>rank(a)-rank(b));
  const gods=sorted.filter(code=>code.endsWith('0'));
  if(gods.length>1)throw new Error('첫 번째 신 재능 보드를 하나로 확인할 수 없습니다.');
  const god=gods[0]??(sorted[0]?`${sorted[0][0]}0`:null);
  const sub=sorted.find(code=>code!==god&&code[0]===god?.[0])??null;
  return [god,sub,...sorted.filter(code=>code!==god&&code!==sub)];
}

export function importIngameTalents(copy,payload,rows){
  const {gb,go,tal,gp,gp2}=payload;
  if(gb==null&&go==null&&tal==null&&gp==null&&gp2==null)return copy;
  if(gb!=null&&(!Array.isArray(gb)||gb.length>200)||tal!=null&&(!Array.isArray(tal)||tal.length>100)){
    rows.push({label:'재능',reason:'재능 목록의 형식을 확인할 수 없습니다.'});
    return copy;
  }
  const order=typeof go==='string'&&go.length<=20 ? go.trim().split(/\s+/u).filter(Boolean) : [];
  if(go!=null && (typeof go!=='string'||go.length>20||order.length>4||new Set(order).size!==order.length||order.some(code=>!/^\d{2}$/u.test(code)))){
    rows.push({label:'재능',reason:'재능 보드 순서를 확인할 수 없습니다.'});
    return copy;
  }
  const boards=boardCatalog();
  const cores=(tal??[]).map(entry=>decodeCore(entry,boards));
  const coreOrder=[...new Set(cores.filter(Boolean).map(core=>core.code))];
  if(cores.includes(null))rows.push({label:'핵심 재능',reason:'보드나 원문을 확인할 수 없는 핵심 재능이 있습니다.'});
  const transforms=[gp,gp2].filter(value=>value!=null);
  const blocked=new Set(transforms.map(value=>Array.isArray(value)&&/^\d{2}$/u.test(value[0])?String(value[0]):null));
  if(blocked.has(null)){
    rows.push({label:'재능',reason:'프리즘·역상의 대상 보드를 확인할 수 없습니다.'});
    return copy;
  }
  const nodes=new Map();
  for(const entry of gb??[]){
    const fields=typeof entry==='string'&&entry.match(/^(\d{8}):(\d{1,2})(?::\d{1,2}:\d{1,2}:(\d{1,2}))?$/u);
    if(!fields){
      rows.push({label:'재능',reason:'재능 노드 ID 또는 포인트 형식을 확인할 수 없습니다.'});
      return copy;
    }
    const [,id,points,flags]=fields,code=id.slice(0,2);
    if(Number(flags))blocked.add(code);
    const boardNodes=nodes.get(code)??new Map();
    if(boardNodes.has(id))blocked.add(code);
    boardNodes.set(id,Number(points));
    nodes.set(code,boardNodes);
  }
  const present=new Set([...nodes.keys(),...order,...coreOrder,...blocked]);
  if(!present.size)return copy;
  let arranged;
  try { arranged=boardOrder(present,order.length?order:coreOrder); }
  catch(error){ rows.push({label:'재능',reason:error.message}); return copy; }
  if(arranged.length>4){
    rows.push({label:'재능',reason:'네 칸을 초과하는 재능 보드 순서를 확인할 수 없습니다.'});
    return copy;
  }
  for(const [slotIndex,code] of arranged.entries()){
    if(!code)continue;
    const label=`재능 보드 ${slotIndex+1}`,board=boards.get(code);
    try {
      if(!board)throw new Error('SS14에서 확인되지 않은 재능 보드입니다.');
      if(blocked.has(code))throw new Error(`${board.name}의 프리즘·역상 또는 중복 노드 정보를 확인해야 합니다.`);
      const revelation=slotIndex===3&&hasRevelation(copy.targetBuild);
      if(slotIndex===3&&!revelation&&buildTraitSlots(copy.targetBuild,60).some(id=>id.includes('ui_yuenv062')))
        throw new Error('계시의 예언을 적용할 추억의 특성 단계를 확인해야 합니다.');
      let next=editSeasonWorkspace(copy,{kind:revelation?'thea-board':'talent-board',slotIndex,value:board.id});
      const options=revelation?revelationNodeOptions(next.targetBuild):board.nodes;
      const kind=revelation?'thea-node':'talent-node';
      let total=0;
      for(const [sourceId,value] of nodes.get(code)??[]){
        const node=options.find(row=>!row.core&&row.sourceId===sourceId);
        if(!node||value>node.max)throw new Error(`${board.name}의 재능 노드 또는 포인트를 확인할 수 없습니다.`);
        if(value){next=editSeasonWorkspace(next,{kind,slotIndex,key:node.id,value});total+=value;}
      }
      const occupied=new Set();
      for(const {node:source} of cores.filter(core=>core?.code===code)){
        const node=options.find(row=>row.core&&row.id===source.id);
        if(!node||occupied.has(node.required))throw new Error(`${board.name}의 핵심 재능 선택이 충돌합니다.`);
        next=editSeasonWorkspace(next,{kind,slotIndex,key:node.id,value:1});
        occupied.add(node.required);
      }
      const issue=inspectSeasonAllocation(next.targetBuild).issues.find(issue=>issue.path===`talents.boards.${slotIndex}`);
      if(issue)throw new Error(issue.reason);
      copy=next;
      rows.push({label,name:`${board.name} · ${total}포인트${occupied.size?` · 핵심 ${occupied.size}개`:''}`});
    }catch(error){ rows.push({label,reason:error.message}); }
  }
  return copy;
}
