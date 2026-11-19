import {seasonPrismChoices} from './seasonPrismPlacement.js';

export function prismForm(input={}) {
  const items=seasonPrismChoices().items;
  const item=items.find(i=>i.slug===input.slug)??items[0];
  if(!item)return null;
  const rarity=item.supportedRarities.includes(input.rarity)?input.rarity:item.supportedRarities[0];
  const options=seasonPrismChoices(item.slug,rarity);
  const draft={slug:item.slug,rarity};
  for(const key of ['base','area','rare','legendary'])
    draft[key]=options[key].find(o=>o.id===input[key])?.id??options[key][0]?.id??'';
  return {options,draft};
}

export function renderPrismEditor(s,index,active,{esc,button}) {
  if(s.boardOverview||!index)return '';
  const form=s.overlay?.prism;
  if(!form)return button('제노 프리즘','prism-open','aria-expanded="false"');
  const {talents}=s.document.targetBuild, inventory=talents.prismInventory??[], placed=talents.placedPrism;
  const equipped=placed?.boardIndex===index;
  const picker=(key,label,options,value)=>`<label>${label}<select aria-label="${label}" data-prism-field="${key}">${options.map(o=>`<option value="${esc(o.id)}"${o.id===value?' selected':''}>${esc(o.name)}</option>`).join('')}</select></label>`;
  const catalog=prismForm(form);
  if(!catalog)return '';
  const {draft,options}=catalog;
  const selected=inventory.find(i=>(i.instanceId??i.id)===form.selected)??inventory.find(i=>(i.instanceId??i.id)===placed?.instanceId)??inventory[0];
  const instance=selected?.instanceId??selected?.id;
  const selectedOptions=selected&&seasonPrismChoices(selected.prismItemSlug,selected.rarity);
  const details=selectedOptions?[[selectedOptions.base,selected.baseAffixModifierId],[selectedOptions.area,selected.areaAffixModifierId],
    [selectedOptions.rare,selected.rareRandomAffixModifierId],[selectedOptions.legendary,selected.legendaryRandomAffixModifierId]]
    .filter(([,id])=>id).map(([list,id])=>list.find(o=>o.id===id)?.name??'한국어 원문 미제공'):[];
  const itemLabel=(item,n)=>`${options.items.find(i=>i.slug===item.prismItemSlug)?.name??'제노 프리즘'} · ${item.rarity==='legendary'?'레전드':'레어'} #${n+1}`;
  const placedIndex=inventory.findIndex(item=>(item.instanceId??item.id)===placed?.instanceId);
  const placedLabel=equipped&&placed?.instanceId!==instance&&placedIndex>=0?itemLabel(inventory[placedIndex],placedIndex)+' · ':'';
  const control=s.report.componentProjection.rows.find(r=>r.path==='talents.placedPrism')?.extensionControls?.find(c=>c.key==='prism:layout');
  const occupied=equipped&&placed.nodeId===active?.id || talents.boards[index]?.nodePoints?.[active?.id]>0;
  const inventoryUi=inventory.length?`${picker('selected','보관함',inventory.map((item,n)=>({id:item.instanceId??item.id,name:itemLabel(item,n)})),instance)}
    ${details.length?`<details><summary>프리즘 옵션</summary><ul>${details.map(text=>'<li>'+esc(text)+'</li>').join('')}</ul></details>`:''}
    <div class="prism-actions">${button(placed?.instanceId===instance?'선택한 칸으로 이동':'선택한 칸에 배치','prism-place',`data-id="${esc(instance)}" data-node="${esc(active?.id??'')}"${!active||active.core||occupied||placed&&placed.instanceId!==instance?' disabled':''}`)}
    ${equipped?button('배치 해제','prism-remove',`data-id="${esc(placed.instanceId)}"`):''}
    ${placed?.instanceId!==instance?button('보관함에서 제거','prism-discard',`data-id="${esc(instance)}"`):''}</div>`:'';
  const craft=form.craft?`${picker('slug','종류',options.items.map(i=>({id:i.slug,name:i.name})),draft.slug)}
    ${picker('rarity','등급',options.item.supportedRarities.map(id=>({id,name:id==='rare'?'레어':'레전드'})),draft.rarity)}
    ${[['base','기본 옵션'],['area','범위'],['rare','프리즘 룰러-레어'],['legendary','프리즘 룰러-레전드']].filter(([key])=>key!=='legendary'||draft.rarity==='legendary').map(([key,label])=>picker(key,label,options[key],draft[key])).join('')}
    ${button('제작해 보관','prism-create')}`:'';
  return `<section class="prism-workbench" aria-label="제노 프리즘"><header><b>제노 프리즘</b>${button('닫기','prism-close','aria-label="프리즘 닫기"')}</header>
    ${inventoryUi}${equipped?`<small>${esc(placedLabel)}배치 위치 · ${placed.x+1}열 ${placed.y+1}행</small>`:''}
    ${equipped&&control?`<label><input type="checkbox" data-prism-layout ${control.value===1?'checked':''}>게임과 배치 일치 확인</label>`:''}
    ${button(form.craft?'제작 접기':'프리즘 제작','prism-craft')}${craft}</section>`;
}
