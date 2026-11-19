import { RUNTIME_CATALOG } from './data/runtimeCatalog.generated.js';
import { talentTreeIcon } from './ingameUiAssets.js';
import {renderPrismEditor} from './seasonPrismEditor.js';
import {mirroredTalentCells,renderInverseEditor} from './seasonInverseEditor.js';
import { pactPointStyle, renderPactConnections } from './ingameLayout.js';
import { talentPanelGroups, seasonTalentBoards, seasonTalentNodes, seasonSpiritOptions, selectedSeasonSpirit } from './seasonNativeSelections.js';
import { hasRevelation, revelationBoardOptions, revelationNodeOptions } from './seasonTheaRevelation.js';
import { SS14_DESTINY } from './data/ss14Destiny.generated.js';
import { seasonDestinyOptions, pactNodeActive, validFateLayout, pactRingOrder as ringOrder, pactAllocationKeys, activeExtraSlot } from './seasonDestiny.js';
import { ringArt } from './data/ss14RingArt.generated.js';
import { SPIRIT_PICKER_GROUPS, spiritPickerEntry, spiritPickerMatches } from './seasonSpiritPicker.js';

// The editor atlas supplies positions only. Membership, text, caps, and edits
// always come from the SS14 board; unknown positions remain selectable.
export function talentSceneLayout(slug, nodes = seasonTalentNodes(slug)) {
  const atlas = RUNTIME_CATALOG.datasets.talent_catalog.trees.find(t => t.slug === slug);
  const current = new Map(nodes.filter(n => !n.core).map(n => [n.id, n]));
  const cells = (atlas?.nodes ?? []).flatMap(({dataId,x,y,prerequisite}) => {
    const id = 'talents-' + dataId;
    if (!current.has(id)) return [];
    const node = current.get(id); current.delete(id);
    return [{node,x,y,prerequisite}];
  });
  return {cells, extra:[...current.values()], cores:nodes.filter(n => n.core)};
}
const points = (b,n) => n.core ? Number(!!b?.coreTalentIds?.includes(n.id)) : (n.sourceId?b?.reflectedNodePoints:b?.nodePoints)?.[n.id] ?? 0;
const treeEmblem = (url,esc) => `<span class="tree-emblem"><img src="${esc(url)}" alt=""></span>`;
export function boardTalentNodes(build,index) {
  return index===3&&hasRevelation(build)?revelationNodeOptions(build):seasonTalentNodes(build.talents?.boards?.[index]?.treeSlug);
}
export function pactRingImage(r,installed,icon) {
  if(installed)return icon(installed.destinyId);
  const name=r.iconUrl?.split('/').pop();
  return ringArt.has(name)?`<img src="./assets/ingame-ui/pact-rings/${encodeURIComponent(name)}" alt="">`:'<i aria-hidden="true">◇</i>';
}
export function renderTalentScene(s,{button,esc,icon},{inspectorOnly=false}={}) {
  const build=s.document.targetBuild, i=s.talentIndex??0, boards=build.talents?.boards??[], board=boards[i], options=seasonTalentBoards();
  const revelation=i===3&&hasRevelation(build);
  const nodes=boardTalentNodes(build,i);
  const layout=talentSceneLayout(board?.treeSlug,nodes), {extra,cores}=layout;
  const cells=mirroredTalentCells(build,i,layout.cells,nodes);
  const active=cells.find(c=>c.node.id===s.talentNode)?.node??[...extra,...cores].find(n=>n.id===s.talentNode)??cells.find(c=>points(board,c.node)>0)?.node??cells[0]?.node??nodes[0];
  const placed=build.talents?.placedPrism;
  const prismNode=placed?.boardIndex===i?placed.nodeId:null;
  const plan=prismNode?s.report?.componentProjection?.rows.find(r=>r.path==='talents.placedPrism')?.placementPreview:null;
  const inArea=new Set(cells.filter(c=>plan?.coordinates.some(p=>p.x===c.x&&p.y===c.y)).map(c=>c.node.id));
  const rail=[0,1,2,3].map(j=>{
    const item=options.find(o=>o.id===boards[j]?.treeSlug), art=talentTreeIcon({slug:item?.id});
    const locked=j===1&&!boards[0]?.treeSlug&&!item;
    return button(`${art?treeEmblem(art,esc):'<b>◇</b>'}<span><small>패널 ${j+1}</small>${esc(item?.name??(locked?'첫 패널 선택 필요':'패널 선택'))}</span>`,'talent-slot',`data-index="${j}" aria-pressed="${j===i}"${locked?' disabled':''}`);
  }).join('');
  const mirror=build.talents?.placedInverseImage;
  const mirrorNode=mirror?.boardIndex===i?mirror.nodeId:null;
  const occupied=active&&(active.id===mirrorNode||active.id===prismNode);
  const nodeButton=(n,style='',compact=false)=>button(`${icon(n.sourceId??n.id)}${compact?'':`<span>${esc(n.name)}</span>`}<small>${n.id===prismNode?'◆':n.id===mirrorNode?'역상':(n.sourceId?'◇ ':'')+points(board,n)+'/'+n.max}</small>${compact&&s.talentEffects?`<span class="tree-node-effect">${esc(n.detail)}</span>`:''}`,!s.boardOverview&&!n.core?'talent-allocate':'talent-inspect',
    `data-id="${esc(n.id)}" ${!s.boardOverview&&!n.core?`data-talent-node data-role="talent-node-${esc(n.id)}" aria-keyshortcuts="Enter Space Delete"`:''} style="${style}" class="tree-point${points(board,n)?' allocated':''}${inArea.has(n.id)?' prism-area':''}" aria-pressed="${active?.id===n.id}" aria-label="${esc(n.name+' · '+n.detail+' · '+(n.id===prismNode?'프리즘 배치됨':points(board,n)+'/'+n.max))}" title="${esc(n.detail+(s.boardOverview?'':'\n클릭·Enter: 1포인트 투자 · 우클릭·Delete: 1포인트 회수'))}"`);
  const paths=cells.filter(c=>c.prerequisite && cells.some(p=>p.x===c.prerequisite.x&&p.y===c.prerequisite.y)).map(c=>
    `<line x1="${c.prerequisite.x+.5}" y1="${c.prerequisite.y+.5}" x2="${c.x+.5}" y2="${c.y+.5}"/>`).join('');
  const count=active?points(board,active):0;
  const inspector=active&&!s.boardOverview&&!s.talentPicking?`<aside class="board-inspector" aria-label="선택한 재능" data-role="talent-inspector" tabindex="-1"><header>${icon(active.sourceId??active.id)}<h3>${esc(active.name)}</h3></header><p>${esc(active.detail)}</p>${active.sourceId&&Number.isFinite(active.bonus)?`<small>역상 효과 ${active.bonus>0?'+':''}${active.bonus}%</small>`:''}<small>필요 포인트 ${active.required??'미확인'}</small><div class="points-stepper">${[-1,0,1].map(d=>d?button(d<0?'−':'+','talent-step',`data-index="${i}" data-id="${esc(active.id)}" data-step="${d}" aria-label="포인트 ${d<0?'회수':'투자'}"${count+d<0||count+d>active.max||d>0&&occupied?' disabled':''}`):`<output>${count} / ${active.max}</output>`).join('')}</div>${active.max>1?`<div class="tree-quick-points">${[0,active.max].map(v=>button(v?'최대 투자':'모두 회수','talent-step',`data-index="${i}" data-id="${esc(active.id)}" data-target="${v}"${v===count||v>0&&occupied?' disabled':''}`)).join('')}</div>`:''}</aside>`:'';
  if(inspectorOnly)return inspector;
  const invested=b=>[...Object.values(b?.nodePoints??{}),...Object.values(b?.reflectedNodePoints??{})].reduce((a,b)=>a+b,0);
  const header=`<nav class="tree-rail" aria-label="재능 패널">${rail}</nav><div class="tree-points-total">총 투자 <strong>${boards.reduce((sum,b)=>sum+invested(b),0)}</strong> 포인트</div>`;
  const coreGroups=[...new Set(cores.map(n=>n.required))].sort((a,b)=>a-b);
  const corePicker=cores.length?`<nav class="tree-core-slots" aria-label="핵심 재능">${coreGroups.map(required=>{
    const selected=cores.find(n=>n.required===required&&board?.coreTalentIds?.includes(n.id));
    return button(`${selected?icon(selected.id):'＋'}<span><small>${required}포인트</small>${esc(selected?.name??'핵심 재능 선택')}</span>`,'talent-core-group',`data-value="${required}" aria-expanded="${s.talentCoreGroup===required}" aria-label="${required}포인트 핵심 재능 · ${esc(selected?.name??'선택')}"`);
  }).join('')}</nav>${!s.boardOverview&&coreGroups.includes(s.talentCoreGroup)?`<div class="tree-core" aria-label="핵심 재능 후보">${cores.filter(n=>n.required===s.talentCoreGroup).map(n=>button(`${icon(n.id)}<span>${esc(n.name)}</span>`,'talent-core-select',`data-index="${i}" data-id="${esc(n.id)}" aria-pressed="${!!board?.coreTalentIds?.includes(n.id)}" title="${esc(n.detail)}"`)).join('')}</div>`:''}`:'';
  if(!s.boardOverview && (!board?.treeSlug || s.talentPicking)){
    const allowed=revelation?new Set(revelationBoardOptions().map(o=>o.slug)):null;
    const groups=talentPanelGroups(build,i).map(({god,choices})=>{
      const cards=choices.filter(o=>!allowed||allowed.has(o.id)).map(o=>button(`${treeEmblem(talentTreeIcon({slug:o.id}),esc)}<span>${esc(o.name)}</span>`,'talent-choose',`data-id="${esc(o.id)}" data-index="${i}" aria-pressed="${o.id===board?.treeSlug}"`)).join('');
      return cards?`<section data-family="${esc(god.id)}">${i===0?'':`<h4>${treeEmblem(talentTreeIcon({slug:god.id}),esc)}${esc(god.name)}</h4>`}<div>${cards}</div></section>`:'';
    }).join('');
    return `<div class="ss-board-scene tree-scene">${header}<div class="tree-gallery${i===0?' tree-gods':''}" aria-label="재능 패널 후보">${groups}</div>${board?.treeSlug?button('현재 패널로 돌아가기','talent-picker-close'):''}</div>`;
  }
  return `<div class="ss-board-scene tree-scene">${header}<div class="tree-stage">${corePicker}<div class="board-picker">${s.boardOverview?'':button('패널 교체','talent-picker-open')}${board?.treeSlug&&!s.boardOverview?button('포인트 초기화','talent-reset',`data-index="${i}"${invested(board)||board.coreTalentIds?.length?'':' disabled'}`)+button('패널 해제','talent-choose',`data-id="" data-index="${i}"`):''}<b>패널 투자 ${invested(board)} 포인트</b></div>
    ${board?.treeSlug?renderPrismEditor(s,i,active,{esc,button})+renderInverseEditor(s,i,active,cells,{esc,button}):''}
    ${nodes.length?`${s.boardOverview?'':button('재능 효과 표시','talent-effects',`class="tree-effects-toggle" aria-pressed="${!!s.talentEffects}"`)}<div class="tree-map-scroll"><div class="tree-thresholds" aria-label="열별 필요 포인트">${Array.from({length:7},(_,x)=>`<span>${cells.find(c=>c.x===x)?.node.required??'·'}</span>`).join('')}</div><div class="tree-map${s.talentEffects?' show-effects':''}" role="group" aria-label="재능 노드"><svg viewBox="0 0 7 5" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>${cells.map(({node,x,y})=>nodeButton(node,`grid-area:${y+1}/${x+1}`,true)).join('')}</div></div>
    ${extra.length?`<div class="tree-extra">${extra.map(n=>nodeButton(n)).join('')}</div>`:''}`:''}</div>
    ${s.talentInspectorSeparated?'':inspector}</div>`;
}
export function renderPactRosterSelection(s,{button,esc,icon}) {
  const i=s.pactRoster?.index, candidate=selectedSeasonSpirit(s.pactRoster?.id);
  if(!Number.isInteger(i))return '';
  const slot=s.document.targetBuild.pact?.slots?.[i];
  const level=candidate&&candidate.id===slot?.spirit?.spiritId?slot.spirit.level:candidate?.levels[0];
  const effects=candidate?.korean.parsed.levelAffixes.find(r=>r.level===level)?.affixes;
  const inner=candidate ? spiritPickerEntry(candidate).effects : [];
  return `<section class="pact-roster-selection">${candidate?`<header>${icon(candidate.id)}<h3>${esc(candidate.name)}</h3></header>${effects?.length?`<div><h4>${level}레벨 효과</h4><ul>${effects.map(effect=>`<li>${esc(effect)}</li>`).join('')}</ul></div>`:''}${inner.length?`<details><summary>내환 효과</summary><ul>${inner.map(effect=>`<li>${esc(effect)}</li>`).join('')}</ul></details>`:''}${button(s.overlay?.type==='board'?'선택한 정령 설정':'정령 '+(i+1)+'에 장착','pact-roster-apply')}`:''}${button('계약판으로','pact-inspect',`data-index="${i}"`)}</section>`;
}
export function renderPactScene(s,{button,esc,select,icon}) {
  const i=s.pactIndex??0, slots=s.document.targetBuild.pact?.slots??[], options=seasonSpiritOptions();
  const option=j=>selectedSeasonSpirit(slots[j]?.spirit?.spiritId,options);
  const o=option(i), slot=slots[i], ring=o?.korean.parsed.rings.find(r=>r.slotId===s.pactRing);
  if(!s.boardOverview && s.pactRoster?.index===i) {
    const candidate=selectedSeasonSpirit(s.pactRoster.id,options);
    const entries=options.map(spiritPickerEntry),query=s.pactRoster.query??'',group=s.pactRoster.group??'all';
    const matches=e=>spiritPickerMatches(e,query,group),count=entries.filter(matches).length;
    const card=e=>button(`${icon(e.option.id)}<strong>${esc(e.option.name)}</strong>`,'pact-roster',
      `data-spirit-search="${esc(e.search)}" data-spirit-group-key="${e.group}"${matches(e)?'':' hidden'} data-index="${i}" data-id="${esc(e.option.id)}" aria-label="${esc(e.option.name)}" aria-pressed="${e.option.id===candidate?.id}"`);
    const groups=SPIRIT_PICKER_GROUPS.filter(([key])=>entries.some(e=>e.group===key));
    const sections=groups.map(([key,label])=>{
      const rows=entries.filter(e=>e.group===key),visible=rows.filter(matches).length;
      return `<section data-spirit-group="${key}"${visible?'':' hidden'}><h4>${label} <small data-spirit-group-count>${visible}</small></h4><div class="pact-card-grid">${rows.map(card).join('')}</div></section>`;
    }).join('');
    return `<div class="ss-board-scene pact-roster"><div class="pact-roster-catalog"><header><input type="search" data-spirit-filter value="${esc(query)}" aria-label="정령 이름·효과 검색" placeholder="이름·효과 검색"><output aria-label="검색된 정령 수"><span data-spirit-count>${count}</span>개</output></header><nav class="pact-roster-filters" aria-label="정령 효과 분류">${[['all','전체'],...groups].map(([key,label])=>button(label,'pact-roster-filter',`data-value="${key}" aria-pressed="${key===group}"`)).join('')}</nav><div class="pact-cards" role="group" aria-label="정령 목록">${sections}<p data-spirit-empty${count?' hidden':''}>검색 결과 없음</p></div></div>
      ${s.overlay?.type==='board'?'':`<aside class="board-inspector">${renderPactRosterSelection(s,{button,esc,icon})}</aside>`}</div>`;
  }
  const outer=o && s.pactRing==='outer';
  const extraIndex=/^extra-[0-4]$/u.test(s.pactRing) ? Number(s.pactRing.at(-1)) : -1;
  const fate=o && (s.pactRing==='undetermined' || extraIndex>=0);
  const shell=slot?.undeterminedFate;
  const children=validFateLayout(shell)?shell.slots:[];
  const extra=children[extraIndex];
  const fateRule=SS14_DESTINY.pages.ko.rows.find(row=>row.slug==='Undetermined_Fate');
  const turn=(label,key,value)=>button(label,'pact-allocation',`data-index="${i}" data-key="${key}" data-value="${value}"`);
  const nodeSwitch=key=>!o.drop ? turn(pactNodeActive(slot,key)?'포인트 회수':'포인트 추가',key,Number(!pactNodeActive(slot,key))):'';
  const branches=[0,1,2].map(j=>{
    const spirit=slots[j]?.spirit, opt=option(j);
    return button(spirit?icon(spirit.spiritId):'＋',spirit?'pact-inspect':'pact-roster',`class="pact-hub" style="${pactPointStyle(j,-1)}" data-index="${j}" aria-label="정령 ${j+1} · ${esc(opt?.name??'선택')}" title="${esc(opt?.name??'정령 선택')}" aria-pressed="${j===i&&!ring&&!outer&&!fate}"`)
    +(opt?button('<i aria-hidden="true"></i>','pact-inspect',`class="pact-gem outer ${pactNodeActive(slots[j],'outer')?'':'inactive'}" style="${pactPointStyle(j,-2)}" data-index="${j}" data-key="outer" title="${esc(opt.korean.parsed.mainAffix.name)}" aria-label="정령 ${j+1} 외환 효과" aria-pressed="${j===i&&!!outer}"`):'')
    +(opt&&fateRule?button('◇','pact-inspect',`class="pact-gem" style="${pactPointStyle(j,9)}" data-index="${j}" data-key="undetermined" aria-pressed="${j===i&&!!fate}" aria-label="정령 ${j+1} 미정 숙명"`):'')
    +ringOrder.map((key,k)=>{
      const r=opt?.korean.parsed.rings.find(r=>r.slotId===key), installed=slots[j]?.rings?.[key]?.installedDestiny;
      const attrs=`class="pact-gem ${key.startsWith('mid')?'medium':''} ${pactNodeActive(slots[j],key)?'':'inactive'}" style="${pactPointStyle(j,k)}"`;
      if(!r) return `<span ${attrs} aria-hidden="true"></span>`;
      return button(pactRingImage(r,installed,icon),'pact-inspect',`${attrs} data-index="${j}" data-key="${key}" aria-pressed="${j===i&&ring?.slotId===key}" aria-label="정령 ${j+1} · ${esc(r.name)} · ${esc(r.category)} ${key.at(-1)}" title="${esc(r.name)}"`);
    }).join('');
  }).join('');
  if(s.boardOverview) return `<div class="ss-board-scene pact-overview"><div class="contract-stage"><div class="contract-wheel" role="group" aria-label="정령 계약 경로">${renderPactConnections()}${branches}</div></div><nav class="board-slot-list" aria-label="장착한 정령">${[0,1,2].map(j=>button('<small>정령 '+(j+1)+'</small><strong>'+esc(option(j)?.name??'미장착')+'</strong>',option(j)?'pact-inspect':'pact-roster',`data-index="${j}" aria-haspopup="dialog"`)).join('')}</nav></div>`;
  const installed=slot?.rings?.[ring?.slotId]?.installedDestiny?.destinyId;
  const choices=ring?seasonDestinyOptions(ring.slotId):[], destiny=choices.find(d=>d.id===installed);
  const ringList=(o?.korean.parsed.rings??[]).map(r=>{
    const id=slot.rings?.[r.slotId]?.installedDestiny?.destinyId;
    const name=id?seasonDestinyOptions(r.slotId).find(d=>d.id===id)?.name??'이전 선택':r.name;
    return button(`<small>${esc(r.category)} ${r.slotId.at(-1)}</small><span>${esc(name)}</span>`,'pact-inspect',
      `data-index="${i}" data-key="${r.slotId}" aria-pressed="${ring?.slotId===r.slotId}"`);
  }).join('');
  const path=extra ? `pact.slots.${i}.undeterminedFate.slots.${extraIndex}` : ring ? `pact.slots.${i}.rings.${ring.slotId}` : '';
  const result=path && s.report.componentProjection.rows.find(r=>r.path===path);
  const rolls=(result?.destinyRollControls??[]).map((c,n)=>`<label>${esc(c.label||'운명 수치 '+(n+1))}<small>${c.min}~${c.max}</small><input type="number" min="${c.min}" max="${c.max}" step="any" data-season-edit="destiny-roll" data-key="${esc(c.key)}" value="${esc(c.value)}" /></label>`).join('');
  const levelText=o?.korean.parsed.levelAffixes.find(l=>l.level===slot.spirit.level)?.affixes.join('\n');
  function fateEditor() {
    if(o.drop || (shell && !validFateLayout(shell))) return '<p>이 정령의 미정 숙명 구성을 확인하세요.</p>';
    const sizeName=type=>type==='micro'?'하위':'중위';
    const slotAction=(label,value)=>button(label,'fate-slot',`data-index="${i}" data-value="${value}"`);
    const socketButtons=children.map((child,n)=>{
      const id=(child.installedDestiny??child.destiny)?.destinyId;
      const title= id ? SS14_DESTINY.identities.find(v=>v.id===id || v.catalogId===id)?.slug : '';
      const name=title && SS14_DESTINY.pages.ko.rows.find(r=>r.slug===title)?.name;
      return button(`<small>${n+1} · ${sizeName(child.slotType)}</small><strong>${esc(name||(id?'운명 확인 필요':'빈 슬롯'))}</strong>`,'pact-inspect',
        `data-index="${i}" data-key="extra-${n}" aria-pressed="${n===extraIndex}"`);
    }).join('');
    const selected=extra && (extra.installedDestiny??extra.destiny)?.destinyId;
    return `<h4 title="아이템에 표시된 순서대로 슬롯을 추가하세요.">미정 숙명 · ${children.length}/5칸</h4>
      <div class="pact-extra-list">${socketButtons}</div>
      ${extra?`${activeExtraSlot(slot,extraIndex)?'':'<p>선행 포인트를 투자하면 이 칸의 효과가 활성화됩니다.</p>'}${select(`추가 ${extraIndex+1}번 ${sizeName(extra.slotType)} 운명`,'scene-extra-destiny','destiny-selection',SS14_DESTINY.identities.find(v=>v.id===selected||v.catalogId===selected)?.catalogId,seasonDestinyOptions(extra.slotType==='micro'?'innerRing1':'midRing1'),`data-slot="${i}" data-key="extra-${extraIndex}"`,true)}`:''}
      ${result?`<p>${esc(result.detail)}</p><div class="pact-rolls">${rolls}</div>`:''}
      <div class="pact-extra-actions">${children.length<5?slotAction('＋ 하위 슬롯','micro')+slotAction('＋ 중위 슬롯','medium'):''}${children.length?slotAction('마지막 슬롯 제거','remove'):''}</div>`;
  }
  const settings=outer?`<h4>외환 효과 · ${esc(o.korean.parsed.mainAffix.name)}</h4><p>${esc(levelText)}</p>${nodeSwitch('outer')}${button('정령 설정으로','pact-inspect',`data-index="${i}"`)}`:ring?`<h4>${esc(ring.category)} ${ring.slotId.at(-1)} · ${esc(ring.name)}</h4><p>기본 효과 · ${esc(ring.effect||'없음')}</p>${nodeSwitch(ring.slotId)}
    ${select(ring.name+' 운명','scene-destiny','destiny-selection',installed,choices,`data-slot="${i}" data-key="${esc(ring.slotId)}"${pactNodeActive(slot,ring.slotId)?'':' disabled'}`,pactNodeActive(slot,ring.slotId))}
    ${installed?`<p>${esc(result?.detail||destiny?.detail||'효과 확인 필요')}</p><div class="pact-rolls">${rolls}</div>${button('운명 제거','pact-remove-destiny',`data-index="${i}" data-key="${ring.slotId}"`)}`:''}
    ${button('정령 설정으로','pact-inspect',`data-index="${i}"`)}`:
    fate?fateEditor():
    `${o?button('정령 교체','pact-roster',`data-index="${i}" data-id="${esc(o.id)}"`)+button('정령 해제','pact-clear',`data-index="${i}"`):'계약판에서 빈 정령 슬롯을 선택하세요.'}
    ${o?select('정령 레벨','scene-level','spirit-level',slot.spirit.level,o.levels.map(n=>({id:n,name:n+'레벨'})),`data-slot="${i}"`):''}
    ${o?`<h4>현재 레벨 효과</h4><p>${esc(o.korean.parsed.levelAffixes.find(l=>l.level===slot.spirit.level)?.affixes.join('\n'))}</p>${o.drop?'':button('미정 숙명 편집','pact-inspect',`data-index="${i}" data-key="undetermined"`)}`:''}`;
  const remaining=pactAllocationKeys(slot).filter(key=>!pactNodeActive(slot,key));
  const sequence=remaining.length ? `<label>투자할 포인트 <input id="pact-spend-count" type="number" min="1" max="${remaining.length}" step="1" value="1"></label>${button('이 정령에 순서대로 배분','pact-spend',`data-index="${i}"`)}` : '';
  return `<div class="ss-board-scene contract-scene">
    <div class="contract-stage"><div class="contract-wheel" role="group" aria-label="정령 계약 경로">${renderPactConnections()}${branches}</div></div>
    <aside class="board-inspector" data-role="pact-inspector" tabindex="-1"><header>${slot?.spirit?icon(slot.spirit.spiritId):''}<h3>정령 ${i+1}${o?' · '+esc(o.name):''}</h3></header>${settings}</aside>
    ${o?`<div class="pact-board-actions"><details data-role="pact-overview"><summary>장착 현황</summary>${[0,1,2].map(j=>{
      const spirit=option(j);if(!spirit)return '';
      const keys=pactAllocationKeys(slots[j]);
      const extras=validFateLayout(slots[j].undeterminedFate)?slots[j].undeterminedFate.slots:[];
      const equipped=ringOrder.filter(key=>slots[j].rings?.[key]?.installedDestiny).length+extras.filter(c=>c.installedDestiny||c.destiny).length;
      return `<p>${esc(spirit.name)} · ${slots[j].spirit.level}레벨 · 투자 ${keys.filter(key=>pactNodeActive(slots[j],key)).length}/${keys.length} · 장착 운명 ${equipped}개</p>`;
    }).join('')}</details>${o.drop?'':`<details data-role="pact-bulk-allocation"><summary>일괄 배분</summary>${sequence+turn('전체 활성','all',1)+turn('포인트 초기화','all',0)}</details>`}
    ${ringList?`<details data-role="pact-ring-selector"><summary>운명 슬롯 목록</summary><div class="pact-ring-list" role="group" aria-label="링과 장착 운명">${ringList}${button('외환 효과 · '+esc(o.korean.parsed.mainAffix.name),'pact-inspect',`data-index="${i}" data-key="outer" aria-pressed="${!!outer}"`)}</div></details>`:''}</div>`:''}</div>`;
}
