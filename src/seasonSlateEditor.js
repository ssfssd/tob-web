import { createDivinityBoard, transformedShape, divinityCellIsOpen } from './divinityBoardModel.js';
import { nativeSlateOptions, nativeSlateShapes, nativeSlateDraft, canPlaceNativeSlate, nativeSlatePlacementIssue } from './seasonNativeDivinity.js';
import { seasonSlateTemplates, seasonSlateOptions, regularSlateFamilies, hasDuplicatePedigreeCore } from './seasonDivinity.js';
import { isSeasonNether, netherLayouts, netherQualityOptions } from './seasonNether.js';

const esc = value => String(value ?? '').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const button = (label,action,attrs='') => `<button type="button" data-ss14-action="${action}" ${attrs}>${label}</button>`;
const colors = ['#79b1ce','#b6a0d8','#c7aa74','#79b8a4','#d69287','#85a2d5','#b0bd7d','#c18eae'];
const labels = {'Regular Talent':'재능','Micro Talent':'미소 재능','Medium Talent':'중위 재능','Legendary Medium Talent':'레전드 중위 재능','Core Talent':'핵심 재능','Micro Talent or Medium Talent':'하위 또는 중위 재능','Medium Talent or Core Talent':'중위 또는 핵심 재능','Ultimate Nether King Talent Node':'명왕 재능','starfire':'복제 방향','void_gap':'복제 방향'};
const genericOptionNames = new Set(['재능','미소 재능','하위 재능','중위 재능','레전드 중위 재능','핵심 재능','명왕 재능']);
const slateSearchKey = value => value.replace(/[\s·]/gu,'').toLowerCase();
function renderSlateOptions(choices,control,query) {
  const groups = new Map();
  for (const option of choices) {
    const key=option.source && option.detail!=='한국어 원문 미제공' ? JSON.stringify([option.name,option.detail]) : option.id;
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(option);
  }
  const search = option => [option.name,option.detail,option.source].filter(Boolean).join(' ');
  const matches = option => slateSearchKey(search(option)).includes(slateSearchKey(query));
  const action = (option,label,accessible='') => button(label,'slate-option',`data-key="${esc(control.key)}" data-id="${esc(option.id)}" data-slate-option data-search="${esc(search(option))}" aria-pressed="${option.id===control.value}"${accessible?` aria-label="${esc(accessible)}"`:''}${matches(option)?'':' hidden'}`);
  const rows = [...groups.values()].map(group=>{
    const [first]=group;
    const effect=first.detail||first.name;
    if (group.length>1&&new Set(group.map(option=>option.source)).size===group.length) {
      const sources=group.map(option=>action(option,esc(option.source),`${effect} · ${option.source}`)).join('');
      return `<div class="slate-option-group" data-slate-option-group${group.some(matches)?'':' hidden'}><span>${esc(effect)}</span><div>${sources}</div></div>`;
    }
    return group.map(option=>{
      const detail=option.detail||option.name;
      const name=detail!==option.name&&!genericOptionNames.has(option.name)?`<small>${esc(option.name)}</small>`:'';
      const source=group.length>1?`<small>${esc(option.source)}</small>`:'';
      return action(option,`${name}<span>${esc(detail)}</span>${source}`);
    }).join('');
  }).join('');
  return `<div class="slate-option-list">${rows}</div><p data-slate-empty${choices.some(matches)?' hidden':''}>검색 결과 없음</p>`;
}
export function filterSlateOptions(picker,query) {
  const key=slateSearchKey(query);
  const options=[...picker.querySelectorAll('[data-slate-option]')];
  for (const option of options) option.hidden=!slateSearchKey(option.dataset.search).includes(key);
  for (const group of picker.querySelectorAll('[data-slate-option-group]')) group.hidden=!group.querySelector('[data-slate-option]:not([hidden])');
  const empty=picker.querySelector('[data-slate-empty]');
  if (empty) empty.hidden=options.some(option=>!option.hidden);
}
// Preview is transient UI; the same transformed cells and mask validate the drop.
export function showSlateFootprint(root,cell,drag) {
  const grid=root.querySelector?.('.slate-interactive-board');
  if(!grid)return;
  const hint=grid.nextElementSibling;
  if(hint?.matches('[data-slate-placement-hint]')){
    const message=cell&&grid.contains(cell)?cell.dataset.placementIssue||hint.dataset.slatePlacementHint:hint.dataset.slatePlacementHint;
    if(hint.textContent!==message)hint.textContent=message;
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
export function miniShape(shape, color='currentColor') {
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
function placementAnchors(board,piece,moving=false){
  if(!piece)return [];
  if(piece.layout){
    const anchor=piece.layout.anchor;
    return canPlaceNativeSlate(board,piece,anchor)?[anchor]:[];
  }
  const anchors=[];
  for(let y=0;y<board.height;y++)for(let x=0;x<board.width;x++){
    if(moving&&piece.anchor?.x===x&&piece.anchor.y===y)continue;
    const anchor={x,y};
    if(canPlaceNativeSlate(board,piece,anchor))anchors.push(anchor);
  }
  return anchors;
}
function selectControl(label,kind,value,options,attrs) {
  return `<label>${label}<select aria-label="${label}" data-season-edit="${kind}" ${attrs}>${options.map(o=>`<option value="${esc(o.id)}"${String(value)===String(o.id)?' selected':''}>${esc(o.name)}</option>`).join('')}</select></label>`;
}
export function renderSlateEditor(s,{compact=false,inspectorOnly=false,hideInspector=false,readOnly=false}={}) {
  const build=s.document.targetBuild,board=slateEditorBoard(build),ui=s.slateEditor??createSlateEditorState();
  const rows=seasonSlateTemplates(build,{requireBindings:false,includeUnplaced:true}),options=nativeSlateOptions();
  const selected=board.slateInventory.find(r=>r.instanceId===ui.selectedId) ?? (!ui.draft?board.slateInventory[0]:null);
  const row=rows.find(r=>r.slate.instanceId===selected?.instanceId);
  const preview=draftSlate(ui.draft),moving=ui.moving?selected:null,placing=preview??moving;
  const placed=new Set(board.cells.map(c=>c.slateInstanceId));
  const nameOf=slate=>{
    const family=regularSlateFamilies.find(f=>f.id===slate?.regularFamily);
    return family ? family.name+' · 일반 석판' : options.find(o=>o.id===slate?.slateId)?.name??'이전 석판 · 종류 확인 필요';
  };
  const optionLists=new Map();
  const optionsFor=type=>{
    if(!optionLists.has(type))optionLists.set(type,seasonSlateOptions(type));
    return optionLists.get(type);
  };
  const hints=new Map(rows.map(r=>{
    const effects=(r.controls??[]).filter(c=>c.value).map(c=>optionsFor(c.type).find(o=>o.id===c.value)?.detail).filter(Boolean);
    return [r.slate.instanceId,[nameOf(r.slate),...effects].join(' · ')];
  }));
  const anchors=placementAnchors(board,placing,!!moving);
  const validAnchors=new Set(anchors.map(({x,y})=>`${x}:${y}`));
  const placementHint=anchors.length?(preview?'배치할 칸 선택':'이동할 칸 선택'):(preview?'배치 가능한 칸 없음':'이동 가능한 칸 없음');
  const boardHtml=Array.from({length:board.width*board.height},(_,i)=>{
    const x=i%board.width,y=Math.floor(i/board.width),cell=board.cells.find(c=>c.x===x&&c.y===y);
    const index=board.slateInventory.findIndex(r=>r.instanceId===cell?.slateInstanceId),slate=board.slateInventory[index];
    const active=divinityCellIsOpen(board,x,y);
    const canPlace=validAnchors.has(`${x}:${y}`);
    if (!active&&!cell&&!canPlace) return '<span class="slate-board-void" aria-hidden="true"></span>';
    const chosen=!!slate&&slate.instanceId===selected?.instanceId;
    const corner=cell&&!board.cells.some(c=>c.slateInstanceId===cell.slateInstanceId&&(c.y<y||c.y===y&&c.x<x));
    const edges=cell?[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>board.cells.some(c=>c.x===x+dx&&c.y===y+dy&&c.slateInstanceId===cell.slateInstanceId)?'0px':'2px').join(' '):'1px';
    const issue=placing&&!canPlace?(nativeSlatePlacementIssue(board,placing,{x,y})||'현재 위치입니다.'):'';
    const label=`${x+1}열 ${y+1}행 · ${slate?`${index+1}. ${nameOf(slate)}`:'빈 칸'}${placing?(canPlace?' · 배치 가능':' · '+issue):''}`;
    const hint=!placing&&slate?hints.get(slate.instanceId):'';
    if(readOnly)return `<span class="slate-board-cell${slate?' is-filled':''}" style="--edges:${edges};--slate-color:${colors[Math.max(0,index)%colors.length]}"${corner?` role="img" aria-label="${esc(label)}" title="${esc(hint||label)}"`:' aria-hidden="true"'}>${corner?index+1:''}</span>`;
    return button(corner?String(index+1):'','slate-cell',`class="slate-board-cell ${cell?'is-filled':''} ${chosen?'is-selected':''} ${canPlace?'can-place':''} ${!active?'is-legacy':''}" ${compact&&!corner?'tabindex="-1"':''} data-role="slate-cell-${x}-${y}" data-x="${x}" data-y="${y}" data-slate-id="${esc(slate?.instanceId??'')}"${issue?` data-placement-issue="${esc(issue)}"`:''} style="--edges:${edges};--slate-color:${colors[Math.max(0,index)%colors.length]}" aria-label="${esc(label)}" aria-pressed="${!!chosen}" title="${esc(hint||label)}"${!compact&&cell&&!isSeasonNether(slate.slateId)?' draggable="true"'+(s.boardOverview?'':' aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Delete"'):''}`);
  }).join('');
  if(compact||readOnly)return `<div class="home-slate-grid" role="group" aria-label="신격 석판 배치" style="--slate-columns:${board.width}">${boardHtml}</div>`;
  const palette=options.map((o,i)=>{
    const shape=shapesFor(o.id).find(l=>l.shape.length===3)??shapesFor(o.id)[0];
    const count=board.slateInventory.filter(r=>placed.has(r.instanceId)&&r.slateId===o.id).length;
    return button(`${miniShape(shape?.shape,colors[i%colors.length])}<span>${esc(o.id==='six_gods'?'일반 석판':o.name)}</span><small>${count}${o.cap?`/${o.cap}`:''}</small>`,'slate-type',`data-id="${o.id}" aria-label="${esc(o.id==='six_gods'?'일반 석판':o.name)}" aria-pressed="${ui.draft?.type===o.id}"${o.cap&&count>=o.cap?' disabled':''}`);
  }).join('');
  let detail='';
  if (ui.draft) {
    const shapes=shapesFor(ui.draft.type),option=options.find(o=>o.id===ui.draft.type);
    const familyPicker=ui.draft.type==='six_gods' && !ui.draft.editingId ? `<div class="slate-families" role="group" aria-label="일반 석판의 신">${regularSlateFamilies.map(f=>button(esc(f.name),'slate-family',`data-id="${f.id}" aria-pressed="${ui.draft.regularFamily===f.id}"`)).join('')}</div>` : '';
    detail=`<header><h2>${esc(option?.name)}</h2><span>${ui.draft.editingId?'모양 변경':'새 석판'}</span></header>${familyPicker}<div class="slate-shapes" aria-label="석판 모양 선택">${shapes.map((shape,i)=>button(`${miniShape(shape.id===ui.draft.shape?transformedShape(shape.shape,ui.draft.rotation):shape.shape)}<span>${isSeasonNether(ui.draft.type)?esc(shape.name):`${shape.shape.length}칸 · 모양 ${i+1}`}</span>`,'slate-shape',`data-id="${shape.id}" aria-pressed="${ui.draft.shape===shape.id}"`)).join('')}</div><div class="native-slot-actions">${preview?.layout?button('이 배치로 놓기','slate-cell',`data-x="${preview.layout.anchor.x}" data-y="${preview.layout.anchor.y}"${canPlaceNativeSlate(board,preview,preview.layout.anchor)?'':' disabled'}`):''}${!isSeasonNether(ui.draft.type)&&!shapes.find(o=>o.id===ui.draft.shape)?.fixed?button('↻ 모양 회전','slate-draft-rotate'):''}${button(ui.draft.editingId?'변경 취소':'추가 취소','slate-cancel')}</div>`;
  } else if (selected) {
    const shape=transformedShape(selected.shape,selected.rotation,selected.flippedH,selected.flippedV),controls=row?.controls??[];
    const control=controls.find(c=>c.slot===ui.socket);
    const equipped=Object.fromEntries(controls.map(c=>[c.slot,c.value]));
    const choices=control?optionsFor(control.type).filter(option=>selected.slateId!=='genealogy'
      || !hasDuplicatePedigreeCore(selected.slateId,{...equipped,[control.slot]:option.id})):[];
    const fixed=isSeasonNether(selected.slateId)||nativeSlateShapes(selected.slateId).every(s=>s.fixed);
    const slateAttrs=`data-id="${esc(selected.instanceId)}"`;
    const placement=isSeasonNether(selected.slateId)
      ? (selected.anchor?'':button('다시 배치','slate-replace-nether',slateAttrs))
      : button(ui.moving?'배치 취소':selected.anchor?'이동':'배치','slate-move-mode',`${slateAttrs} aria-pressed="${ui.moving}"`)
        +(nativeSlateShapes(selected.slateId).length?button('모양 변경','slate-change-shape',slateAttrs):'');
    detail=`<header>${miniShape(shape,colors[board.slateInventory.indexOf(selected)%colors.length])}<h2>${esc(nameOf(selected))}</h2><span>${shape.length}칸</span></header>
      <div class="native-slot-actions">${!fixed&&selected.anchor?button('↻ 회전','rotate-slate',slateAttrs):''}${placement}${selected.anchor?button('배치 해제','slate-unplace',slateAttrs):button('석판 삭제','remove-slate',slateAttrs)}</div>
      ${row?.nether?selectControl('명왕 배치','nether-layout',selected.nether?.layout,netherLayouts(selected.slateId),`data-key="${esc(selected.instanceId)}"`):''}
      ${selected.slateId==='nether_banishment'?selectControl('추방 효과','nether-banishment',selected.nether?.banishment,[{id:'',name:'선택하기'},...['파괴','슬래시','그림자','버스트','오멘','수렁','투사','공양','부착','불멸'].map((name,i)=>({id:String(i+1),name}))],`data-key="${esc(selected.instanceId)}"`):''}
      <div class="slate-socket-heading"><h3>옵션 소켓</h3><span>${controls.filter(c=>c.value).length} / ${controls.length}</span></div>
      <div class="slate-sockets">${controls.map(c=>{
        const available=c.value?optionsFor(c.type):[],option=available.find(o=>o.id===c.value);
        const source=option?.source&&available.some(o=>o.id!==option.id&&o.detail===option.detail&&o.name===option.name);
        const effect=esc(option?.detail||(c.value?'이전 옵션 · 확인 필요':'옵션 선택'));
        return `<div>${row.nether?selectControl(`소켓 ${c.index+1} 색상`,'nether-quality',c.quality,netherQualityOptions,`data-key="${esc(selected.instanceId)}" data-slot="${c.index}"`):''}${button(`<small>${c.index+1}. ${esc(c.type.startsWith('regular:')?'재능':labels[c.type]??'명왕 재능')}</small><span>${effect}</span>${source?`<small>${esc(option.source)}</small>`:''}`,'slate-socket',`data-id="${esc(selected.instanceId)}" data-slot="${esc(c.slot)}" data-role="slate-socket-${esc(c.slot)}" class="slate-socket" aria-expanded="${control?.slot===c.slot}" aria-label="옵션 ${c.index+1} 선택"`)}</div>`;
      }).join('')}</div>
      ${!row?'<p>이전 석판의 종류를 확인할 수 없습니다. 배치와 저장된 옵션은 유지합니다.</p>':''}
      ${control?`<section class="slate-option-picker" aria-label="석판 옵션 선택"><header><input type="search" data-slate-search data-role="slate-option-search" value="${esc(ui.query)}" placeholder="이름·효과·출처 검색" aria-label="석판 옵션 검색" />${control.value?button('옵션 비우기','slate-option',`data-key="${esc(control.key)}" data-id=""`):''}</header>${renderSlateOptions(choices,control,ui.query)}</section>`:''}
      ${row?.detail?`<details class="native-option-source"><summary>석판 효과·출처</summary><p>${esc(row.detail)}</p>${/^https:\/\/tlidb\.com\/(ko|en)\//u.test(row.page?.sourceUrl??'')?`<a href="${esc(row.page.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문 보기</a>`:''}</details>`:''}`;
  } else detail='';
  const goToBoard=placing?`<div class="native-slot-actions">${button(preview||!moving.anchor?'배치 위치 보기':'이동 위치 보기','slate-find-placement',anchors.length?'':'disabled')}</div>`:'';
  const inspector=detail?`<section class="slate-detail-panel" aria-label="선택한 석판" data-role="slate-inspector" tabindex="-1">${detail}${goToBoard}</section>`:'';
  if(inspectorOnly)return inspector;
  const pages=s.document.targetBuild.divinity?.boards??[];
  const pageSelector=pages.length>1?`<select data-slate-page data-role="slate-page" aria-label="석판 페이지">${pages.map((page,i)=>
    `<option value="${esc(page.boardId)}"${page.boardId===board.boardId?' selected':''}>페이지 ${i+1}</option>`).join('')}</select>`:'';
  const copyPage=board.slateInventory.length?button('페이지 복제','slate-page-duplicate'):'';
  const pageActions=s.boardOverview?'':`<div class="native-slot-actions">${pageSelector}${button('새 페이지','slate-page-add','data-role="slate-page-add"')}${copyPage}</div>`;
  return `<section class="native-slate-editor${ui.draft?' is-placing':''}" aria-label="신격 석판 편집"><div class="slate-editor-heading">${pageActions}<span>석판 ${placed.size}개 · 사용 ${board.cells.length}칸 / ${board.mask.flat().filter(Boolean).length}칸</span></div>
    <div class="slate-editor-columns"><nav class="slate-library" aria-label="석판 목록"><h3>석판 목록</h3><div class="slate-palette">${palette}</div></nav><div class="slate-board-panel"><div class="slate-interactive-board" role="group" aria-label="신격 석판 보드" data-offsets="${slatePreviewOffsets(placing).map(p=>p.join(',')).join(';')}" style="--slate-columns:${board.width}">${boardHtml}</div>${placing?`<p class="slate-board-hint" role="status" data-slate-placement-hint="${placementHint}">${placementHint}</p>`:''}<details class="slate-help"><summary>조작 도움말</summary><p>방향키: 이동 · R: 회전 · Delete: 해제</p></details><div class="slate-placed-list" aria-label="페이지 석판">${board.slateInventory.map((slate,i)=>button(`<b>${i+1}</b><span>${esc(nameOf(slate))}</span><small>${placed.has(slate.instanceId)?'배치됨':'미배치'}</small>`,'slate-select',`data-id="${esc(slate.instanceId)}" aria-pressed="${selected?.instanceId===slate.instanceId}"`)).join('')}</div></div></div>${s.boardOverview||hideInspector?'':inspector}</section>`;
}

export function handleSlateEditorAction(api, action, data) {
  if (!action.startsWith('slate-')) return false;
  const state=api.state,ui=state.slateEditor??=createSlateEditorState(),build=()=>api.workingDocument?.().targetBuild??state.document.targetBuild,board=slateEditorBoard(build());
  if(action==='slate-page-add'||action==='slate-page-duplicate'){
    api.edit({kind:action});
    Object.assign(ui,createSlateEditorState());
    state.focusRole=(build().divinity?.boards?.length??0)>1?'slate-page':'slate-page-add';
  } else if (action==='slate-type') {
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
  else if(action==='slate-find-placement'){
    const piece=draftSlate(ui.draft)??(ui.moving?board.slateInventory.find(s=>s.instanceId===ui.selectedId):null);
    const [anchor]=placementAnchors(board,piece,ui.moving);
    if(anchor)state.focusRole=`slate-cell-${anchor.x}-${anchor.y}`;
  }
  else if (action==='slate-cancel') { ui.draft=null;ui.moving=false; }
  else if (action==='slate-select'||action==='slate-socket') {
    const open=action==='slate-socket'&&(ui.selectedId!==data.id||ui.socket!==data.slot);
    Object.assign(ui,{selectedId:data.id,draft:null,moving:false,socket:open?data.slot:null,query:''});
    if(action==='slate-socket')state.focusRole=open?'slate-option-search':'slate-socket-'+data.slot;
  }
  else if (action==='slate-move-mode') Object.assign(ui,{selectedId:data.id,draft:null,moving:!ui.moving});
  else if (action==='slate-unplace'||action==='slate-replace-nether'){
    const piece=board.slateInventory.find(s=>s.instanceId===data.id);
    if(!piece)throw Error('편집할 석판을 선택하세요.');
    api.edit(action==='slate-unplace'?{kind:'slate-unplace',key:data.id}
      :{kind:'nether-layout',key:data.id,value:piece.nether?.layout});
    Object.assign(ui,{selectedId:data.id,draft:null,moving:false,socket:null});
    state.focusRole='slate-inspector';
  }
  else if (action==='slate-option') {
    api.edit({kind:'slate-affix',key:data.key,value:data.id});
    if(ui.socket!==null)state.focusRole='slate-socket-'+ui.socket;
    Object.assign(ui,{socket:null,query:''});
  }
  else if (action==='slate-cell') {
    const anchor={x:Number(data.x),y:Number(data.y)};
    const placing=draftSlate(ui.draft)??(ui.moving?board.slateInventory.find(s=>s.instanceId===ui.selectedId):null);
    if(placing){
      const issue=nativeSlatePlacementIssue(board,placing,anchor);
      if(issue){state.focusRole=`slate-cell-${anchor.x}-${anchor.y}`;throw Error(issue);}
    }
    if (ui.draft) {
      const draft=ui.draft;
      api.edit({kind:draft.editingId?'slate-shape':'slate-add',value:draft.editingId?draft.shape:draft.type,key:draft.editingId??draft.shape,regularFamily:draft.regularFamily,layout:isSeasonNether(draft.type)?draft.shape:undefined,rotation:draft.rotation,anchor});
      Object.assign(ui,{selectedId:draft.editingId??slateEditorBoard(build()).slateInventory.at(-1).instanceId,draft:null,socket:null,query:''});
    } else if (ui.moving&&ui.selectedId) {
      api.edit({kind:'slate-move',key:ui.selectedId,value:anchor});ui.moving=false;
    } else if (data.slateId) Object.assign(ui,{selectedId:data.slateId,socket:null,query:''});
  } else return false;
  return true;
}
