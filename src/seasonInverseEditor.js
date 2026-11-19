import {inverseFields,inverseGeometry} from './seasonInverseImage.js';

export function mirroredTalentCells(build,index,cells,nodes) {
  const geometry=inverseGeometry(build,index);
  if(!geometry)return cells;
  const grid=new Map(cells.map(c=>[c.node.id,c]));
  const catalog=new Map(nodes.map(n=>[n.id,n]));
  return geometry.nodes.flatMap(n=>{
    if(!n.isReflected)return grid.has(n.flatItemId)?[grid.get(n.flatItemId)]:[];
    const source=catalog.get(n.flatItemId);
    if(!source)return [];
    return [{x:n.x,y:n.y,prerequisite:null,node:{...source,name:'거울 반사 · '+source.name,id:n.storageNodeId,sourceId:source.id,bonus:n.inverseImageEffect,required:cells.find(c=>c.x===n.x)?.node.required}}];
  });
}

export function renderInverseEditor(s,index,active,cells,{button,esc}) {
  if(s.boardOverview||!index)return '';
  const form=s.overlay?.inverse;
  if(!form)return button('역상','inverse-open','aria-expanded="false"');
  const t=s.document.targetBuild.talents, p=t.placedInverseImage, inv=t.inverseImageInventory??[], b=t.boards[index];
  const key=i=>i.instanceId??i.id, selected=inv.find(i=>key(i)===form.selected)??inv.find(i=>key(i)===p?.instanceId)??inv[0];
  const id=selected&&key(selected),here=p?.boardIndex===index;
  const cell=cells.find(c=>c.node===active||c.node.id===active?.id);
  const outer=cell&&!cell.node.sourceId&&(cell.x<=1||cell.x>=5||cell.y===0||cell.y===4);
  const spent=b=>Object.values(b?.nodePoints??{}).some(Boolean)||Object.values(b?.reflectedNodePoints??{}).some(Boolean)||b?.coreTalentIds?.length||b?.selectedNodeIds?.length;
  const needsRefund=spent(b)||p&&spent(t.boards[p.boardIndex]);
  const control=s.report.componentProjection.rows.find(r=>r.path==='talents.placedInverseImage')?.extensionControls.find(c=>c.key==='inverse:layout');
  return `<section class="prism-workbench" aria-label="역상"><header><b>역상</b>${button('닫기','inverse-close','aria-label="역상 닫기"')}</header>
    ${selected?`<label>보관함<select aria-label="역상 보관함" data-inverse-select>${inv.map((i,n)=>`<option value="${esc(key(i))}"${key(i)===id?' selected':''}>역상 #${n+1}${key(i)===p?.instanceId?' · 패널 '+(p.boardIndex+1):''}</option>`).join('')}</select></label>
    <small>${inverseFields.map(([key,label])=>label+' '+esc(selected[key]??'미입력')+'%').join(' · ')}</small>
    <div class="prism-actions">${button(p?.instanceId===id?'선택한 칸으로 이동':'선택한 칸에 배치','inverse-place',`data-node="${esc(active?.id??'')}" data-id="${esc(id)}"${!outer||needsRefund||t.placedPrism?.boardIndex===index||p&&(p.instanceId!==id||here&&p.nodeId===active?.id)?' disabled':''}`)}
    ${here?button('배치 해제','inverse-remove',`data-id="${esc(p.instanceId)}"${needsRefund?' disabled':''}`):''}
    ${p?.instanceId!==id?button('보관함에서 제거','inverse-discard',`data-id="${esc(id)}"`):''}</div>
    ${needsRefund?'<small>배치를 바꾸려면 패널 포인트를 회수하세요.</small>':!outer?'<small>외곽 재능 칸을 선택하세요.</small>':''}`:''}
    ${here?`<small>배치 위치 · ${p.x+1}열 ${p.y+1}행</small>`:''}
    ${here&&control?`<label><input type="checkbox" data-inverse-layout${control.value===1?' checked':''}>게임과 거울 구역 일치 확인</label>`:''}
    ${button(form.craft?'제작 접기':'역상 제작','inverse-craft')}
    ${form.craft?inverseFields.map(([key,label,max])=>`<label>${label} (%)<input aria-label="${label}" data-inverse-value="${key}" type="number" min="-100" max="${max}" step="any" value="${esc(form[key]??-100)}"></label>`).join('')+button('제작해 보관','inverse-create'):''}</section>`;
}
