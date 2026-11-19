import {talentModel} from './seasonPrismPlacement.js';
import {getTalentBoardRuntime,placeInverseImage,moveInverseImage,unplaceInverseImage} from './talentBoardModel.js';
import {SS14_COMPONENTS} from './data/ss14Components.generated.js';
import {SS14_RULES} from './data/ss14Rules.generated.js';

// https://tlidb.com/ko/Temper and the SS14 Inverse Image card.
export const inverseFields=[
  ['microTalentEffect','하위 재능 효과',200,'Micro Talent'],
  ['mediumTalentEffect','중위 재능 효과',100,'Medium Talent'],
  ['legendaryTalentEffect','레전드 중위 재능 효과',50,'Legendary Medium Talent']
];
const indexOfItem=i=>i.instanceId??i.id;
const validValues=item=>item&&inverseFields.every(([key,,max])=>Number.isFinite(item[key])&&item[key]>=-100&&item[key]<=max);
export function inverseGeometry(build,index) {
  const t=build?.talents, p=t?.placedInverseImage;
  if(!p||p.boardIndex!==index||!t.boards?.[index]?.treeSlug)return null;
  return getTalentBoardRuntime(talentModel(),t,index);
}
export function editInverse(build,edit) {
  const t=build.talents,index=edit.slotIndex,b=t?.boards?.[index],p=t?.placedInverseImage;
  if(!Number.isInteger(index)||index<1||index>3||!b?.treeSlug)throw Error('전문 재능 패널을 선택하세요.');
  if(edit.kind==='inverse-create'){
    if(!validValues(edit.value)||typeof edit.key!=='string'||!edit.key.trim()||[...(t.inverseImageInventory??[]),...(t.prismInventory??[])].some(i=>indexOfItem(i)===edit.key))
      throw Error('역상 효과 수치와 보관함 항목을 확인하세요.');
    const values=Object.fromEntries(inverseFields.map(([key])=>[key,edit.value[key]]));
    (t.inverseImageInventory??=[]).unshift({instanceId:edit.key,id:edit.key,name:'역상',...values});
    return;
  }
  if(t.boards.some(b=>b?.placedPrism||b?.placedInverseImage||b?.prismSlots?.some(Boolean)||b?.inverseImageSlots?.some(Boolean)))
    throw Error('기존 패널의 배치 정보를 확인하세요.');
  const invested=b=>Object.values(b?.nodePoints??{}).some(Boolean)||Object.values(b?.reflectedNodePoints??{}).some(Boolean)||b?.coreTalentIds?.length||b?.selectedNodeIds?.length;
  if(invested(b)||p&&invested(t.boards[p.boardIndex]))throw Error('패널의 재능 포인트를 먼저 회수하세요.');
  if(edit.kind==='inverse-remove'&&(p?.boardIndex!==index||p?.instanceId!==edit.key))throw Error('이 패널의 역상을 선택하세요.');
  if(p&&p.instanceId!==edit.key)throw Error('배치된 역상을 먼저 해제하세요.');
  const model=talentModel(), result=edit.kind==='inverse-remove'?unplaceInverseImage(model,t,edit.key):
    p?moveInverseImage(model,t,edit.key,index,edit.value):placeInverseImage(model,t,index,edit.key,edit.value);
  if(!['unplaced','placed','moved'].includes(result.status))throw Error(result.status==='prism-on-board'?'같은 패널의 프리즘을 먼저 해제하세요.':'역상을 놓을 수 있는 외곽 재능 칸을 선택하세요.');
  t.placedInverseImage=result.state.placedInverseImage;
}
export function inversePlan(build, item) {
  const t=build.talents,p=t.placedInverseImage,index=p.boardIndex,board=t.boards?.[index],geo=inverseGeometry(build,index);
  const fail=reason=>({reason});
  if(!validValues(item)||!geo||index<1||index>3||t.placedPrism?.boardIndex===index||board.placedPrism||board.placedInverseImage||board.prismSlots?.some(Boolean)||board.inverseImageSlots?.some(Boolean))
    return fail('역상 배치와 세 효과 수치를 확인하세요.');
  const known=['id','instanceId','name','createdAt','summary','inverseImageId',...inverseFields.map(([key])=>key)];
  if(Object.keys(item).some(key=>!known.includes(key)))return fail('추가 옵션이 있는 역상의 효과는 미확정입니다.');
  const en=SS14_COMPONENTS.pages['https://tlidb.com/en/'+board.treeSlug],rules=SS14_RULES.talents[board.treeSlug];
  const anchor=geo.nodes.find(n=>n.hasPlacedInverseImage);
  if(!anchor||anchor.flatItemId!==p.nodeId||anchor.points||!(anchor.y===0||anchor.y===4||anchor.x<=1||anchor.x>=5)||!rules||rules.sourcePageSha256!==en?.sourcePageSha256)
    return fail('역상 배치 칸과 SS14 패널을 확인하세요.');
  const reflected=geo.nodes.filter(n=>n.isReflected);
  for(const [id,v] of Object.entries(board.nodePoints??{}))if(v&&!geo.nodes.some(n=>!n.isReflected&&n.flatItemId===id))
    return fail('거울 구역이 덮어쓴 칸에 기존 포인트가 남아 있습니다.');
  const selections=[];
  for(const [key,points] of Object.entries(board.reflectedNodePoints??{})){
    if(points===0)continue;
    const node=reflected.find(n=>n.storageNodeId===key),id=node?.flatItemId?.replace(/^talents-/,''),rule=rules.nodes[id];
    const entries=en.parsed.entries.filter(e=>e.id===id);
    const effect=inverseFields.find(([, , ,name])=>entries.length&&entries.every(e=>e.name===name));
    if(!effect||!Number.isInteger(points)||points<1||points>rule?.maxPoints||!rule)
      return fail('거울 재능의 SS14 종류와 포인트를 확인하세요.');
    if(node.flatItemId===p.nodeId)return fail('역상 자체 위치의 복제 효과는 미확정입니다.');
    selections.push({key,id:node.flatItemId,points,scale:1+item[effect[0]]/100});
  }
  return {index,selections, fingerprint:JSON.stringify([p,board.treeSlug,en.sourcePageSha256,reflected.map(n=>[n.storageNodeId,n.flatItemId])])};
}
