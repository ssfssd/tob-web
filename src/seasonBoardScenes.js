import { RUNTIME_CATALOG } from './data/runtimeCatalog.generated.js';
import { talentTreeIcon } from './ingameUiAssets.js';
import { pactPointStyle, renderPactConnections } from './ingameLayout.js';
import { seasonTalentBoards, seasonTalentNodes, seasonSpiritOptions } from './seasonNativeSelections.js';
import { seasonDestinyOptions } from './seasonDestiny.js';
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
const ringOrder = ['innerRing1','innerRing2','midRing1','innerRing3','innerRing4','midRing2','innerRing5','innerRing6','midRing3'];
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
  const option=j=>options.find(o=>o.id===slots[j]?.spirit?.spiritId);
  const o=option(i), slot=slots[i], ring=o?.korean.parsed.rings.find(r=>r.slotId===s.pactRing);
  const branches=[0,1,2].map(j=>{
    const spirit=slots[j]?.spirit, opt=option(j);
    return button(spirit?icon(spirit.spiritId):'＋','pact-inspect',`class="pact-hub" style="${pactPointStyle(j,-1)}" data-index="${j}" aria-label="정령 ${j+1} · ${esc(opt?.name??'선택')}" title="${esc(opt?.name??'정령 선택')}" aria-pressed="${j===i&&!ring}"`)
    +ringOrder.map((key,k)=>{
      const r=opt?.korean.parsed.rings.find(r=>r.slotId===key), installed=slots[j]?.rings?.[key]?.installedDestiny;
      const attrs=`class="pact-gem ${key.startsWith('mid')?'medium':''}" style="${pactPointStyle(j,k)}"`;
      if(!r) return `<span ${attrs} aria-hidden="true"></span>`;
      const name=r.iconUrl?.split('/').pop();
      const art=ringArt.has(name)?`<img src="./assets/ingame-ui/pact-rings/${esc(name)}" alt="">`:'<i aria-hidden="true"></i>';
      return button(installed?icon(installed.destinyId):art,'pact-inspect',`${attrs} data-index="${j}" data-key="${key}" aria-pressed="${j===i&&ring?.slotId===key}" aria-label="정령 ${j+1} · ${esc(r.name)} · ${esc(r.category)} ${key.at(-1)}" title="${esc(r.name)}"`);
    }).join('');
  }).join('');
  const installed=slot?.rings?.[ring?.slotId]?.installedDestiny?.destinyId;
  const choices=ring?seasonDestinyOptions(ring.slotId):[], destiny=choices.find(d=>d.id===installed);
  return `<div class="ss-board-scene contract-scene"><div class="contract-stage"><div class="contract-wheel" role="group" aria-label="정령 계약 경로">${renderPactConnections()}${branches}</div></div>
    <aside class="board-inspector"><header>${slot?.spirit?icon(slot.spirit.spiritId):''}<h3>정령 ${i+1}${o?' · '+esc(o.name):''}</h3></header>${ring?`<h4>${esc(destiny?.name??ring.name)}</h4><p>${esc(installed?(destiny?.detail??'이전 선택 · 효과 확인 필요'):ring.effect)}</p>${select(ring.name+' 운명','scene-destiny','destiny-selection',installed,choices,`data-slot="${i}" data-key="${esc(ring.slotId)}"`,true)}${button('정령으로','pact-inspect',`data-index="${i}"`)}`:
    `${select('정령 '+(i+1),'scene-spirit','spirit-selection',slot?.spirit?.spiritId,options,`data-slot="${i}"`,true)}${o?select('정령 레벨','scene-level','spirit-level',slot.spirit.level,o.levels.map(n=>({id:n,name:n+'레벨'})),`data-slot="${i}"`):''}${o?`<p>${esc(o.korean.parsed.levelAffixes.find(l=>l.level===slot.spirit.level)?.affixes.join('\n'))}</p>`:''}`}</aside></div>`;
}
