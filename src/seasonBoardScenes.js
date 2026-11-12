import { RUNTIME_CATALOG } from './data/runtimeCatalog.generated.js';
import { talentTreeIcon } from './ingameUiAssets.js';
import { pactPointStyle, renderPactConnections } from './ingameLayout.js';
import { seasonTalentBoards, seasonTalentNodes, seasonSpiritOptions, selectedSeasonSpirit } from './seasonNativeSelections.js';
import { SS14_DESTINY } from './data/ss14Destiny.generated.js';
import { seasonDestinyOptions, pactNodeActive, validFateLayout, pactRingOrder as ringOrder, pactAllocationKeys, activeExtraSlot } from './seasonDestiny.js';
import { ringArt } from './data/ss14RingArt.generated.js';

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
const points = (b,n) => n.core ? Number(!!b?.coreTalentIds?.includes(n.id)) : b?.nodePoints?.[n.id] ?? 0;
export function renderTalentScene(s,{button,esc,select,icon}) {
  const i=s.talentIndex??0, boards=s.document.targetBuild.talents?.boards??[], board=boards[i], options=seasonTalentBoards();
  const nodes=seasonTalentNodes(board?.treeSlug), {cells,extra,cores}=talentSceneLayout(board?.treeSlug,nodes);
  const active=nodes.find(n=>n.id===s.talentNode)??cells.find(c=>points(board,c.node)>0)?.node??cells[0]?.node??nodes[0];
  const rail=[0,1,2].map(j=>{
    const item=options.find(o=>o.id===boards[j]?.treeSlug), art=talentTreeIcon({slug:item?.id});
    return button(`${art?`<img src="${esc(art)}" alt="">`:'<b>◇</b>'}<span><small>패널 ${j+1}</small>${esc(item?.name??'패널 선택')}</span>`,'talent-slot',`data-index="${j}" aria-pressed="${j===i}"`);
  }).join('');
  const nodeButton=(n,style='',compact=false)=>button(`${icon(n.id)}${compact?'':`<span>${esc(n.name)}</span>`}<small>${points(board,n)}/${n.max}</small>`,'talent-inspect',
    `data-id="${esc(n.id)}" style="${style}" class="tree-point${points(board,n)?' allocated':''}" aria-pressed="${active?.id===n.id}" aria-label="${esc(n.name+' · '+n.detail+' · '+points(board,n)+'/'+n.max)}" title="${esc(n.detail)}"`);
  const paths=cells.filter(c=>c.prerequisite && cells.some(p=>p.x===c.prerequisite.x&&p.y===c.prerequisite.y)).map(c=>
    `<line x1="${c.prerequisite.x+.5}" y1="${c.prerequisite.y+.5}" x2="${c.x+.5}" y2="${c.y+.5}"/>`).join('');
  const count=active?points(board,active):0;
  return `<div class="ss-board-scene tree-scene"><nav class="tree-rail" aria-label="재능 패널">${rail}</nav><div class="tree-stage"><div class="board-picker">${select('재능 패널 '+(i+1),'scene-tree','talent-board',board?.treeSlug,options,`data-slot="${i}"`)}<b>${Object.values(board?.nodePoints??{}).reduce((a,b)=>a+b,0)} 포인트</b></div>
    ${nodes.length?`<div class="tree-thresholds" aria-label="열별 필요 포인트">${Array.from({length:7},(_,x)=>`<span>${cells.find(c=>c.x===x)?.node.required??'·'}</span>`).join('')}</div><div class="tree-map" role="group" aria-label="재능 노드"><svg viewBox="0 0 7 5" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>${cells.map(({node,x,y})=>nodeButton(node,`grid-area:${y+1}/${x+1}`,true)).join('')}</div>
    ${extra.length?`<div class="tree-extra">${extra.map(n=>nodeButton(n)).join('')}</div>`:''}${cores.length?`<div class="tree-core"><h3>핵심 재능</h3>${cores.map(n=>nodeButton(n)).join('')}</div>`:''}`:'<p class="board-empty">패널을 선택하면 재능을 배분할 수 있습니다.</p>'}</div>
    ${active?`<aside class="board-inspector"><header>${icon(active.id)}<h3>${esc(active.name)}</h3></header><p>${esc(active.detail)}</p><small>필요 포인트 ${active.required}</small><div class="points-stepper">${[-1,0,1].map(d=>d?button(d<0?'−':'+','talent-step',`data-index="${i}" data-id="${esc(active.id)}" data-step="${d}" aria-label="포인트 ${d<0?'회수':'투자'}"${count+d<0||count+d>active.max?' disabled':''}`):`<output>${count} / ${active.max}</output>`).join('')}</div></aside>`:''}</div>`;
}
export function renderPactScene(s,{button,esc,select,icon}) {
  const i=s.pactIndex??0, slots=s.document.targetBuild.pact?.slots??[], options=seasonSpiritOptions();
  const option=j=>selectedSeasonSpirit(slots[j]?.spirit?.spiritId,options);
  const o=option(i), slot=slots[i], ring=o?.korean.parsed.rings.find(r=>r.slotId===s.pactRing);
  if(s.pactRoster?.index===i) {
    const candidate=selectedSeasonSpirit(s.pactRoster.id,options);
    const card=p=>button(`${icon(p.id)}<span>${esc(p.name)}</span>`,'pact-roster',
      `data-spirit-name="${esc(p.name)}"${s.pactRoster.query&&!p.name.includes(s.pactRoster.query)?' hidden':''} data-index="${i}" data-id="${esc(p.id)}" aria-pressed="${p.id===candidate?.id}"`);
    return `<div class="ss-board-scene pact-roster"><div><h3>정령 목록</h3><div class="pact-cards" role="group" aria-label="정령 목록"><label>정령 검색<input type="search" data-spirit-filter value="${esc(s.pactRoster.query??'')}" aria-label="정령 이름 검색"></label>${options.map(card).join('')}</div></div>
      <aside class="board-inspector"><header>${candidate?icon(candidate.id):''}<h3>${esc(candidate?.name??'정령 선택')}</h3></header>
      ${candidate?`<p>${esc(candidate.korean.parsed.levelAffixes.find(r=>r.level===(candidate.id===o?.id?slot.spirit.level:candidate.levels[0]))?.affixes.join('\n'))}</p>${button('정령 '+(i+1)+'에 장착','pact-roster-apply')}`:''}
      ${button('계약판으로','pact-inspect',`data-index="${i}"`)}</aside></div>`;
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
      const name=r.iconUrl?.split('/').pop();
      const art=ringArt.has(name)?`<img src="./assets/ingame-ui/pact-rings/${esc(name)}" alt="">`:'<i aria-hidden="true"></i>';
      return button(installed?icon(installed.destinyId):art,'pact-inspect',`${attrs} data-index="${j}" data-key="${key}" aria-pressed="${j===i&&ring?.slotId===key}" aria-label="정령 ${j+1} · ${esc(r.name)} · ${esc(r.category)} ${key.at(-1)}" title="${esc(r.name)}"`);
    }).join('');
  }).join('');
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
    return `<h4>미정 숙명 · ${children.length}/5칸</h4><p>아이템에 표시된 순서대로 슬롯 크기를 선택하세요.</p>
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
    ${o?`<div class="pact-board-actions"><details data-role="pact-overview"><summary>개요</summary>${[0,1,2].map(j=>{
      const spirit=option(j);if(!spirit)return '';
      const keys=pactAllocationKeys(slots[j]);
      const extras=validFateLayout(slots[j].undeterminedFate)?slots[j].undeterminedFate.slots:[];
      const equipped=ringOrder.filter(key=>slots[j].rings?.[key]?.installedDestiny).length+extras.filter(c=>c.installedDestiny||c.destiny).length;
      return `<p>${esc(spirit.name)} · ${slots[j].spirit.level}레벨 · 투자 ${keys.filter(key=>pactNodeActive(slots[j],key)).length}/${keys.length} · 장착 운명 ${equipped}개</p>`;
    }).join('')}</details>${o.drop?'':sequence+turn('이 정령 전체 활성','all',1)+turn('이 정령 포인트 초기화','all',0)}</div>`:''}
    ${ringList?`<div class="pact-ring-list" role="group" aria-label="링과 장착 운명">${ringList}${button('외환 효과 · '+esc(o.korean.parsed.mainAffix.name),'pact-inspect',`data-index="${i}" data-key="outer" aria-pressed="${!!outer}"`)}</div>`:''}</div>`;
}
