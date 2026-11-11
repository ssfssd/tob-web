import { createDivinityBoard, transformedShape } from './divinityBoardModel.js';
import { nativeSlateOptions, nativeSlateShapes, nativeSlateDraft, canPlaceNativeSlate } from './seasonNativeDivinity.js';
import { seasonSlateTemplates, seasonSlateOptions, regularSlateFamilies } from './seasonDivinity.js';
import { isSeasonNether, netherLayouts, netherQualityOptions } from './seasonNether.js';

const esc = value => String(value ?? '').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const button = (label,action,attrs='') => `<button type="button" data-ss14-action="${action}" ${attrs}>${label}</button>`;
const colors = ['#79b1ce','#b6a0d8','#c7aa74','#79b8a4','#d69287','#85a2d5','#b0bd7d','#c18eae'];
const labels = {'Regular Talent':'재능','Micro Talent':'미소 재능','Medium Talent':'중위 재능','Legendary Medium Talent':'레전드 중위 재능','Core Talent':'핵심 재능','Ultimate Nether King Talent Node':'명왕 재능','starfire':'복제 방향','void_gap':'복제 방향'};
// Preview is transient UI; the same transformed cells and mask validate the drop.
export function showSlateFootprint(root,cell,drag) {
  const grid=root.querySelector?.('.slate-interactive-board');
  if(!grid)return;
  const hint=root.querySelector('.slate-board-hint');
  if(hint) {
    hint.dataset.baseHint??=hint.textContent;
    const next=cell?.dataset.slateHint||hint.dataset.baseHint;
    if(hint.textContent!==next)hint.textContent=next;
  }
  const clear=()=>grid.querySelectorAll('[data-ghost]').forEach(b=>b.removeAttribute('data-ghost'));
  if(!cell||!grid.contains(cell)){clear();delete grid.dataset.preview;return;}
  const shape=drag?.offsets??(grid.dataset.offsets||'').split(';').filter(Boolean).map(p=>p.split(',').map(Number));
  if(!shape.length)return;
  const x=Number(cell.dataset.x)-(drag?.dx??0),y=Number(cell.dataset.y)-(drag?.dy??0);
  const signature=[x,y,drag?.id??''].join(':');
  if(grid.dataset.preview===signature)return;
  clear();grid.dataset.preview=signature;
  const cells=shape.map(([dx,dy])=>grid.querySelector(`[data-x="${x+dx}"][data-y="${y+dy}"]`));
  const valid=drag?cells.every(b=>b&&!b.classList.contains('is-legacy')&&(!b.dataset.slateId||b.dataset.slateId===drag.id)):cell.classList.contains('can-place');
  for(const b of cells)if(b)b.dataset.ghost=valid?'valid':'invalid';
}
export function slatePreviewOffsets(piece) {
  return piece ? transformedShape(piece.shape,piece.rotation,piece.flippedH,piece.flippedV).map(p=>[p.x,p.y]) : [];
}
export const createSlateEditorState = () => ({selectedId:null,draft:null,moving:false,socket:null,query:''});
export function slateEditorBoard(build) {
  return build.divinity?.boards?.find(b=>b.boardId===build.divinity.activeBoardId) ?? createDivinityBoard({boardId:'ss14-divinity'});
}
function shapesFor(type) {
  return isSeasonNether(type) ? netherLayouts(type) : nativeSlateShapes(type);
}
function miniShape(shape, color='currentColor') {
  if (!shape?.length) return '';
  const width=Math.max(...shape.map(p=>p.x))+1,height=Math.max(...shape.map(p=>p.y))+1;
  return `<svg class="slate-shape-icon" viewBox="0 0 ${width*10} ${height*10}" aria-hidden="true" style="color:${color}">${shape.map(p=>`<rect x="${p.x*10+1}" y="${p.y*10+1}" width="8" height="8" rx="1" fill="currentColor"/>`).join('')}</svg>`;
}
function draftSlate(draft) {
  if (!draft) return null;
  if (!isSeasonNether(draft.type)) return {...nativeSlateDraft(draft.type,draft.shape,draft.rotation),instanceId:draft.editingId??'slate-preview'};
  const layout=netherLayouts(draft.type).find(s=>s.id===draft.shape);
  return layout ? {instanceId:'slate-preview',shape:layout.shape,rotation:0,layout} : null;
}
function selectControl(label,kind,value,options,attrs) {
  return `<label>${label}<select aria-label="${label}" data-season-edit="${kind}" ${attrs}>${options.map(o=>`<option value="${esc(o.id)}"${String(value)===String(o.id)?' selected':''}>${esc(o.name)}</option>`).join('')}</select></label>`;
}
export function renderSlateEditor(s) {
  const build=s.document.targetBuild,board=slateEditorBoard(build),ui=s.slateEditor??createSlateEditorState();
  const rows=seasonSlateTemplates(build,{requireBindings:false}),options=nativeSlateOptions();
  const selected=board.slateInventory.find(r=>r.instanceId===ui.selectedId) ?? (!ui.draft?board.slateInventory[0]:null);
  const row=rows.find(r=>r.slate.instanceId===selected?.instanceId);
  const preview=draftSlate(ui.draft),moving=ui.moving?selected:null,placing=preview??moving;
  const placed=new Set(board.cells.map(c=>c.slateInstanceId));
  const nameOf=slate=>{
    const family=regularSlateFamilies.find(f=>f.id===slate?.regularFamily);
    return family ? family.name+' · 일반 석판' : options.find(o=>o.id===slate?.slateId)?.name??'이전 석판 · 종류 확인 필요';
  };
  const optionLists=new Map();
  const hints=new Map(rows.map(r=>{
    const effects=(r.controls??[]).filter(c=>c.value).map(c=>{
      if(!optionLists.has(c.type))optionLists.set(c.type,seasonSlateOptions(c.type));
      return optionLists.get(c.type).find(o=>o.id===c.value)?.detail;
    }).filter(Boolean);
    return [r.slate.instanceId,[nameOf(r.slate),...effects].join(' · ')];
  }));
  const validAnchor=anchor=>placing && (!preview?.layout || anchor.x===preview.layout.anchor.x&&anchor.y===preview.layout.anchor.y) && canPlaceNativeSlate(board,placing,anchor);
  const boardHtml=Array.from({length:board.width*board.height},(_,i)=>{
    const x=i%board.width,y=Math.floor(i/board.width),cell=board.cells.find(c=>c.x===x&&c.y===y);
    const index=board.slateInventory.findIndex(r=>r.instanceId===cell?.slateInstanceId),slate=board.slateInventory[index];
    const active=board.mask?.[y]?.[x]===1;
    if (!active&&!cell&&!validAnchor({x,y})) return '<span class="slate-board-void" aria-hidden="true"></span>';
    const chosen=!!slate&&slate.instanceId===selected?.instanceId,canPlace=validAnchor({x,y});
    const corner=cell&&!board.cells.some(c=>c.slateInstanceId===cell.slateInstanceId&&(c.y<y||c.y===y&&c.x<x));
    const edges=cell?[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>board.cells.some(c=>c.x===x+dx&&c.y===y+dy&&c.slateInstanceId===cell.slateInstanceId)?'0px':'2px').join(' '):'1px';
    const label=`${x+1}열 ${y+1}행 · ${slate?`${index+1}. ${nameOf(slate)}`:'빈 칸'}${placing?(canPlace?' · 배치 가능':' · 배치 불가'):''}`;
    const hint=!placing&&slate?hints.get(slate.instanceId):'';
    return button(corner?String(index+1):'','slate-cell',`class="slate-board-cell ${cell?'is-filled':''} ${chosen?'is-selected':''} ${canPlace?'can-place':''} ${!active?'is-legacy':''}" data-slate-hint="${esc(hint)}" data-x="${x}" data-y="${y}" data-slate-id="${esc(slate?.instanceId??'')}" style="--edges:${edges};--slate-color:${colors[Math.max(0,index)%colors.length]}" aria-label="${esc(label)}" aria-pressed="${!!chosen}" title="${esc(hint||label)}"${cell&&!isSeasonNether(slate.slateId)?' draggable="true"':''}`);
  }).join('');
  const palette=options.filter(o=>o.id!=='six_gods').map((o,i)=>{
    const shape=shapesFor(o.id).find(l=>l.shape.length===3)??shapesFor(o.id)[0];
    const count=board.slateInventory.filter(r=>placed.has(r.instanceId)&&r.slateId===o.id).length;
    return button(`${miniShape(shape?.shape,colors[i%colors.length])}<span>${esc(o.name)}</span><small>${count}${o.cap?`/${o.cap}`:''}</small>`,'slate-type',`data-id="${o.id}" aria-pressed="${ui.draft?.type===o.id}"${o.cap&&count>=o.cap?' disabled':''}`);
  }).join('');
  let detail='';
  if (ui.draft) {
    const shapes=shapesFor(ui.draft.type),option=options.find(o=>o.id===ui.draft.type);
    const familyPicker=ui.draft.type==='six_gods' && !ui.draft.editingId ? `<div class="slate-families" role="group" aria-label="일반 석판의 신">${regularSlateFamilies.map(f=>button(esc(f.name),'slate-family',`data-id="${f.id}" aria-pressed="${ui.draft.regularFamily===f.id}"`)).join('')}</div>` : '';
    detail=`<header><h2>${esc(option?.name)}</h2><span>${ui.draft.editingId?'모양 변경':'새 석판'}</span></header>${familyPicker}<p>모양을 고르고 보드의 강조된 위치를 누르세요.</p><div class="slate-shapes" aria-label="석판 모양 선택">${shapes.map((shape,i)=>button(`${miniShape(shape.id===ui.draft.shape?transformedShape(shape.shape,ui.draft.rotation):shape.shape)}<span>${isSeasonNether(ui.draft.type)?esc(shape.name):`${shape.shape.length}칸 · 모양 ${i+1}`}</span>`,'slate-shape',`data-id="${shape.id}" aria-pressed="${ui.draft.shape===shape.id}"`)).join('')}</div><div class="native-slot-actions">${preview?.layout?button('이 배치로 놓기','slate-cell',`data-x="${preview.layout.anchor.x}" data-y="${preview.layout.anchor.y}"${canPlaceNativeSlate(board,preview,preview.layout.anchor)?'':' disabled'}`):''}${!isSeasonNether(ui.draft.type)&&!shapes.find(o=>o.id===ui.draft.shape)?.fixed?button('↻ 모양 회전','slate-draft-rotate'):''}${button(ui.draft.editingId?'변경 취소':'추가 취소','slate-cancel')}</div>`;
  } else if (selected) {
    const shape=transformedShape(selected.shape,selected.rotation,selected.flippedH,selected.flippedV),controls=row?.controls??[];
    const control=controls.find(c=>c.slot===ui.socket),choices=control?seasonSlateOptions(control.type):[];
    const fixed=isSeasonNether(selected.slateId)||nativeSlateShapes(selected.slateId).every(s=>s.fixed);
    detail=`<header>${miniShape(shape,colors[board.slateInventory.indexOf(selected)%colors.length])}<h2>${esc(nameOf(selected))}</h2><span>${shape.length}칸</span></header>
      <div class="native-slot-actions">${!fixed?button('↻ 회전','rotate-slate',`data-id="${esc(selected.instanceId)}"`):''}${!isSeasonNether(selected.slateId)?`${button(ui.moving?'이동 취소':'이동','slate-move-mode',`data-id="${esc(selected.instanceId)}" aria-pressed="${ui.moving}"`)}${nativeSlateShapes(selected.slateId).length?button('모양 변경','slate-change-shape',`data-id="${esc(selected.instanceId)}"`):''}`:''}${button('석판 해제','remove-slate',`data-id="${esc(selected.instanceId)}"`)}</div>
      ${row?.nether?selectControl('명왕 배치','nether-layout',selected.nether?.layout,netherLayouts(selected.slateId),`data-key="${esc(selected.instanceId)}"`):''}
      ${selected.slateId==='nether_banishment'?selectControl('추방 효과','nether-banishment',selected.nether?.banishment,[{id:'',name:'선택하기'},...['파괴','슬래시','그림자','버스트','오멘','수렁','투사','공양','부착','불멸'].map((name,i)=>({id:String(i+1),name}))],`data-key="${esc(selected.instanceId)}"`):''}
      <div class="slate-socket-heading"><h3>옵션 소켓</h3><span>${controls.filter(c=>c.value).length} / ${controls.length}</span></div>
      <div class="slate-sockets">${controls.map(c=>{
        const option=seasonSlateOptions(c.type).find(o=>o.id===c.value);
        return `<div>${row.nether?selectControl(`소켓 ${c.index+1} 색상`,'nether-quality',c.quality,netherQualityOptions,`data-key="${esc(selected.instanceId)}" data-slot="${c.index}"`):''}${button(`<small>${c.index+1}. ${esc(c.type.startsWith('regular:')?'재능':labels[c.type]??'명왕 재능')}</small><span>${esc(option?.detail||(c.value?'이전 선택 보존 · SS14 원문 확인 필요':'비어 있음 · 옵션 선택'))}</span>`,'slate-socket',`data-id="${esc(selected.instanceId)}" data-slot="${esc(c.slot)}" class="slate-socket" aria-pressed="${control?.slot===c.slot}" aria-label="옵션 ${c.index+1} 선택"`)}</div>`;
      }).join('')}</div>
      ${!row?'<p>이전 석판의 종류를 확인할 수 없습니다. 배치와 저장된 옵션은 유지합니다.</p>':''}
      ${control?`<section class="slate-option-picker" aria-label="석판 옵션 선택"><header><label>이름·효과 검색<input type="search" data-slate-search value="${esc(ui.query)}" aria-label="석판 옵션 검색" /></label>${button('옵션 비우기','slate-option',`data-key="${esc(control.key)}" data-id=""`)}</header><div class="slate-option-list">${choices.map(o=>button(`<small>${esc(o.name)}</small><span>${esc(o.detail)}</span>`,'slate-option',`data-key="${esc(control.key)}" data-id="${esc(o.id)}" data-slate-option data-search="${esc(`${o.name} ${o.detail}`)}" aria-pressed="${o.id===control.value}"${`${o.name} ${o.detail}`.replace(/\s/gu,'').toLowerCase().includes(ui.query.replace(/\s/gu,'').toLowerCase())?'':' hidden'}`)).join('')}</div><p data-slate-empty${choices.some(o=>`${o.name} ${o.detail}`.replace(/\s/gu,'').toLowerCase().includes(ui.query.replace(/\s/gu,'').toLowerCase()))?' hidden':''}>일치하는 옵션이 없습니다.</p></section>`:''}
      ${row?.detail?`<details class="native-option-source"><summary>석판 효과·출처</summary><p>${esc(row.detail)}</p>${/^https:\/\/tlidb\.com\/(ko|en)\//u.test(row.page?.sourceUrl??'')?`<a href="${esc(row.page.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>`:''}</details>`:''}`;
  } else detail='<h2>석판 배치</h2><p>일반 석판 또는 특수·명왕 석판을 선택한 뒤 보드에 놓으세요.</p>';
  return `<section class="native-slate-editor${ui.draft?' is-placing':''}" aria-label="신격 석판 편집"><div class="slate-editor-heading"><strong>신격 석판 ${placed.size}개</strong><span>사용 ${board.cells.length}칸 / ${board.mask.flat().filter(Boolean).length}칸</span></div>
    <div class="slate-add-tools">${button('＋ 일반 석판 추가','slate-type',`class="regular-slate-add" data-id="six_gods" aria-pressed="${ui.draft?.type==='six_gods'}"`)}<details class="slate-inventory" data-role="slate-inventory"><summary>특수·명왕 석판 추가</summary><div class="slate-palette" aria-label="특수·명왕 석판">${palette}</div></details></div>
    <div class="slate-editor-columns"><div class="slate-board-panel"><div class="slate-interactive-board" role="group" aria-label="신격 석판 보드" data-offsets="${slatePreviewOffsets(placing).map(p=>p.join(',')).join(';')}" style="--slate-columns:${board.width}">${boardHtml}</div><p class="slate-board-hint" role="status">${preview?'강조된 위치를 누르면 새 석판을 놓습니다.':ui.moving?'강조된 위치를 누르면 선택한 석판을 옮깁니다.':'석판을 눌러 옵션 편집 · 끌어서 이동'}</p><div class="slate-placed-list" aria-label="배치된 석판">${board.slateInventory.map((slate,i)=>button(`<b>${i+1}</b><span>${esc(nameOf(slate))}</span><small>${placed.has(slate.instanceId)?'배치됨':'미배치'}</small>`,'slate-select',`data-id="${esc(slate.instanceId)}" aria-pressed="${selected?.instanceId===slate.instanceId}"`)).join('')}</div></div><section class="slate-detail-panel" aria-label="선택한 석판" data-role="slate-inspector" tabindex="-1">${detail}</section></div></section>`;
}

export function handleSlateEditorAction(api, action, data) {
  if (!action.startsWith('slate-')) return false;
  const state=api.state,ui=state.slateEditor??=createSlateEditorState(),board=slateEditorBoard(state.document.targetBuild);
  if (action==='slate-type') {
    const shapes=shapesFor(data.id),shape=shapes.find(l=>l.shape.length===3)??shapes[0];
    if (!shape) throw new Error('석판 모양을 확인할 수 없습니다.');
    Object.assign(ui,{draft:{type:data.id,shape:shape.id,rotation:0,regularFamily:data.id==='six_gods'?regularSlateFamilies[0].id:undefined},moving:false,socket:null,query:''});
  } else if (action==='slate-family') {
    if(ui.draft?.type==='six_gods' && regularSlateFamilies.some(f=>f.id===data.id))ui.draft.regularFamily=data.id;
  } else if (action==='slate-change-shape') {
    const slate=board.slateInventory.find(r=>r.instanceId===data.id),shape=shapesFor(slate?.slateId)[0];
    if(!shape)throw new Error('석판 모양을 확인할 수 없습니다.');
    Object.assign(ui,{selectedId:data.id,draft:{type:slate.slateId,shape:shape.id,rotation:0,editingId:data.id},moving:false,socket:null,query:''});
  } else if (action==='slate-shape') { ui.draft.shape=data.id;ui.draft.rotation=0; }
  else if (action==='slate-draft-rotate') ui.draft.rotation=(ui.draft.rotation+1)%4;
  else if (action==='slate-cancel') { ui.draft=null;ui.moving=false; }
  else if (action==='slate-select'||action==='slate-socket') Object.assign(ui,{selectedId:data.id,draft:null,moving:false,socket:action==='slate-socket'?data.slot:null,query:''});
  else if (action==='slate-move-mode') Object.assign(ui,{selectedId:data.id,draft:null,moving:!ui.moving});
  else if (action==='slate-option') api.edit({kind:'slate-affix',key:data.key,value:data.id});
  else if (action==='slate-cell') {
    const anchor={x:Number(data.x),y:Number(data.y)};
    if (ui.draft) {
      const draft=ui.draft;
      api.edit({kind:draft.editingId?'slate-shape':'slate-add',value:draft.editingId?draft.shape:draft.type,key:draft.editingId??draft.shape,regularFamily:draft.regularFamily,layout:isSeasonNether(draft.type)?draft.shape:undefined,rotation:draft.rotation,anchor});
      Object.assign(ui,{selectedId:draft.editingId??slateEditorBoard(state.document.targetBuild).slateInventory.at(-1).instanceId,draft:null,socket:null,query:''});
    } else if (ui.moving&&ui.selectedId) {
      api.edit({kind:'slate-move',key:ui.selectedId,value:anchor});ui.moving=false;
    } else if (data.slateId) Object.assign(ui,{selectedId:data.slateId,socket:null,query:''});
  } else return false;
  return true;
}
