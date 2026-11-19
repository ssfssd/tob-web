import {buildTraitSlots, EMPTY_TRAIT_MEMORY, seasonHeroOptions, seasonHeroTraitOptions} from './seasonHeroSelection.js';
import {getSeasonSelectionOptions} from './seasonSelections.js';
import {seasonSupportOptions} from './seasonSupport.js';
import {seasonEffectSources} from './seasonEffectSources.js';
import {presentGameText} from './gameTextPresentation.js';
import {SS14_CARDS} from './data/ss14Cards.generated.js';
import {SS14_SUPPORTS} from './data/ss14Supports.generated.js';

export const SUPPORT_CATEGORIES = {heroes:'히어로', traits:'특성', skills:'스킬', supports:'보조'};
export const supportSearchKey = value => String(value).normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/gu,'');
const safeKo = value => typeof value==='string' && /[가-힣]/u.test(value) && !/\p{Script=Han}/u.test(value);
const esc = value => String(value??'').replace(/[&<>"']/gu,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const unique = rows => [...new Set(rows)];

let catalog;
function supportCatalog() {
  if (catalog) return catalog;
  const heroes=seasonHeroOptions().map(hero=>({id:hero.id,name:hero.name,meta:hero.title,
    detail:hero.description,source:`https://tlidb.com/ko/${hero.sourcePath}`}));
  const traits=heroes.flatMap(hero=>seasonHeroTraitOptions(hero.id).map(trait=>({id:trait.key,heroId:hero.id,
    level:trait.level,name:trait.name,meta:`${hero.name} · ${trait.level}레벨`,detail:trait.sourceDescription,source:hero.source})));
  const skills=[...new Map([0,5].flatMap(index=>getSeasonSelectionOptions('skills',index))
    .map(skill=>[skill.id,skill])).values()];
  const cardRows=(rows,cards)=>rows.map(({id,name})=>({id,name:safeKo(name)?name:'한국어 원문 미제공',
    detail:cards[id]?.detail,source:cards[id]?.sourceUrl}));
  catalog={heroes,traits,skills:cardRows(skills,SS14_CARDS.records),supports:cardRows(seasonSupportOptions(),SS14_SUPPORTS.records)};
  return catalog;
}

function summarize(sources, dpsRows) {
  const labels=[];
  if (dpsRows.some(row=>row.supported)) labels.push('스킬 DPS 계산됨');
  if (sources.some(row=>row.status==='direct')) labels.push('직접 대미지 반영');
  if (sources.some(row=>row.status==='blocked') || dpsRows.some(row=>!row.supported)) labels.push('확인 필요');
  if (!labels.length && sources.some(row=>['selected','mechanic'].includes(row.status))) labels.push('효과 연결됨');
  if (!labels.length && sources.some(row=>row.status==='inactive')) labels.push('효과 비활성');
  return {labels:labels.length?labels:['선택됨'],
    reasons:unique([...sources.map(row=>row.reason),...dpsRows.flatMap(row=>row.blockers??[])].filter(Boolean))};
}

export function seasonSupportMatrix(build, report, category, {selectedOnly=false}={}) {
  const slots=[...build.skills.active,...build.skills.passive];
  const currentHero=build.hero.branchId;
  const selectedTraits=new Set([1,45,60,75].flatMap(level=>buildTraitSlots(build,level)).filter(key=>key!==EMPTY_TRAIT_MEMORY));
  const effects=new Map(), dpsRows=new Map(), ownedSkills=new Set(), ownedSupports=new Set();
  for (const slot of slots) {
    if (slot.skillId) ownedSkills.add(slot.skillId);
    for (const support of slot.supports) if (support?.supportId) ownedSupports.add(support.supportId);
  }
  for (const effect of seasonEffectSources(report)) {
    let keys=[];
    if (effect.group==='hero' && (effect.path==='hero'||effect.path.startsWith('hero.traitSelections.'))) {
      keys=[effect.itemId];
      const trait=effect.control?.recordKey ?? effect.path.match(/^hero\.traitSelections\.\d+\.(.+)$/u)?.[1];
      if (trait) keys.push(trait);
    } else if (['skills','supports'].includes(effect.group)) keys=[effect.itemId];
    for (const key of keys) {
      if (!effects.has(key)) effects.set(key,[]);
      effects.get(key).push(effect);
    }
  }
  for (const row of report.fullDps?.rows??[]) {
    if (!dpsRows.has(row.id)) dpsRows.set(row.id,[]);
    dpsRows.get(row.id).push(row);
  }
  const selected = {heroes:row=>row.id===currentHero,traits:row=>row.heroId===currentHero&&selectedTraits.has(row.id),
    skills:row=>ownedSkills.has(row.id),supports:row=>ownedSupports.has(row.id)}[category];
  return (supportCatalog()[category]??[]).map(row=>{
    const inBuild=selected(row);
    const status=inBuild?summarize(effects.get(row.id)??[],dpsRows.get(row.id)??[]):{labels:['미선택'],reasons:[]};
    return {...row,inBuild,...status,search:supportSearchKey([row.name,row.meta].filter(Boolean).join(' '))};
  }).filter(row=>!selectedOnly||row.inBuild).sort((a,b)=>Number(b.inBuild)-Number(a.inBuild)||a.name.localeCompare(b.name,'ko'));
}

export function renderSeasonSupportMatrix(s) {
  const {category='heroes',query='',selectedOnly=false}=s.supportMatrix??{};
  const key=supportSearchKey(query);
  const rows=seasonSupportMatrix(s.document.targetBuild,s.report,category,{selectedOnly});
  const count=rows.filter(row=>row.search.includes(key)).length;
  const categories=Object.entries(SUPPORT_CATEGORIES).map(([id,label])=>
    `<button type="button" data-ss14-action="support-matrix-category" data-category="${id}" aria-pressed="${id===category}">${label}</button>`).join('');
  return `<div class="ss14-support-matrix"><div class="support-matrix-controls">
    <nav aria-label="지원표 분류">${categories}</nav>
    <div><input type="search" data-support-matrix-search data-role="support-matrix-search" aria-label="지원표 검색" placeholder="이름 검색" value="${esc(query)}" />
    <button type="button" data-ss14-action="support-matrix-selected" aria-pressed="${selectedOnly}" data-role="support-matrix-selected">현재 빌드만</button></div>
    <output role="status" data-support-matrix-count>${count}개</output></div>
    <table><thead><tr><th scope="col">이름</th><th scope="col">한국어 원문</th><th scope="col">현재 빌드</th></tr></thead><tbody>${rows.map(row=>{
      const detail=presentGameText(row.detail);
      const hasText=safeKo(detail)&&detail!=='한국어 원문 미제공';
      const source=/^https:\/\/tlidb\.com\/ko\/[\w%-]+$/u.test(row.source)?` <a href="${esc(row.source)}" target="_blank" rel="noopener noreferrer">TLIDB</a>`:'';
      const provenance=hasText?`<details><summary>원문 보기</summary><p>${esc(detail)}</p>${source}</details>`:`<span>한국어 원문 미제공</span>${source}`;
      const state=row.reasons.length?`<details><summary>${row.labels.join(' · ')}</summary><ul>${row.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul></details>`:row.labels.join(' · ');
      return `<tr data-support-matrix-row="${esc(row.search)}"${row.search.includes(key)?'':' hidden'}><th scope="row">${esc(row.name)}${row.meta?`<small>${esc(row.meta)}</small>`:''}</th><td>${provenance}</td><td>${state}</td></tr>`;
    }).join('')}</tbody></table><p data-support-matrix-empty${count?' hidden':''}>일치하는 항목이 없습니다.</p></div>`;
}
