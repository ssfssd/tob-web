import { describeSeasonOptionChange } from './seasonNumericStatsView.js';
import { SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';
import { compactSeasonEditDelta } from './seasonEditComparison.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { seasonSupportKoreanCard } from './seasonSupport.js';

const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+fmt(n);
const amount=n=>Number.isFinite(n)?fmt(n):'미확정';
const dpsRow=(label,from,to,comparable)=>`<tr><th scope="row">${label}</th><td>${amount(from)}</td><td>${amount(to)}</td><td>${comparable?signed(to-from):'—'}</td></tr>`;
function comparisonReasons(reasons,esc) {
  const issues=new Map();
  for (const reason of reasons) {
    const match=/^(기준|현재): (.*)$/u.exec(reason);
    const text=match?.[2]??reason;
    if(!issues.has(text))issues.set(text,new Set());
    issues.get(text).add(match?.[1]??'');
  }
  const order=sides=>sides.size===1&&sides.has('현재')?0:sides.size===1&&sides.has('기준')?2:1;
  return [...issues].sort((a,b)=>order(a[1])-order(b[1])).map(([reason,sides])=>{
    const prefix=['장착 후 · ','','장착 전 · '][order(sides)];
    return `<li>${prefix}${esc(reason)}</li>`;
  }).join('');
}

const skillName=id=>{
  const card=SS14_CARDS.records[id]??seasonSupportKoreanCard(id);
  return card?.season==='SS14'&&card.koreanTextVerified ? card.name : '한국어 이름 미제공';
};
const slotName=index=>index===0?'주력':index<5?`액티브 ${index+1}`:`패시브 ${index-4}`;
export function renderSkillLevelChanges(rows,esc,{before='장착 전',after='장착 후',role='skill-level-changes'}={}) {
  if(!rows?.length)return '';
  const single=rows.length===1?rows[0]:null;
  const summary=single?` · ${single.from} → ${single.to}${single.toConfirmed?'':' (확인 필요)'}`:'';
  const value=(base,level,verified)=>`Lv.${level}${verified?'':' (수치 미확인)'}${base!==level?`<small> · 기본 ${base}</small>`:''}`;
  const content=rows.map(({id,rowIndex,supportIndex,from,to,fromBase,toBase,fromConfirmed,toConfirmed})=>{
    const socket=Number.isInteger(supportIndex)?` · 보조 ${supportIndex+1}`:'';
    return `<tr><th scope="row">${esc(`${slotName(rowIndex)}${socket} · ${skillName(id)}`)}</th><td>${value(fromBase,from,fromConfirmed)}</td><td>${value(toBase,to,toConfirmed)}</td></tr>`;
  }).join('');
  return `<details data-role="${esc(role)}"><summary>스킬 레벨${summary}</summary><table class="slot-dps-table"><thead><tr><th scope="col">스킬</th><th scope="col">${esc(before)}</th><th scope="col">${esc(after)}</th></tr></thead><tbody>${content}</tbody></table></details>`;
}
export function renderSkillDpsChanges(rows,basis,esc,{before='장착 전',after='장착 후'}={}){
  if(!rows.length)return '';
  const skillRows=rows.map(({index,beforeId,afterId,from,to})=>{
    const name=beforeId&&afterId&&beforeId!==afterId ? `${skillName(beforeId)} → ${skillName(afterId)}` : skillName(afterId??beforeId);
    return dpsRow(esc(`${slotName(index)} · ${name}`),from,to,true);
  }).join('');
  return `<table class="slot-dps-table"><caption>${basis==='assumedDps'?'스킬별 방어 전 DPS':'스킬별 DPS 변화'}</caption><thead><tr><th scope="col">스킬</th><th scope="col">${esc(before)}</th><th scope="col">${esc(after)}</th><th scope="col">변화</th></tr></thead><tbody>${skillRows}</tbody></table>`;
}

export function renderDamageBreakdown(p,esc,{before='장착 전',after='장착 후'}={}){
  const skill=renderSkillDpsChanges(p.skillDpsChanges??[],p.dpsBasis,esc,{before,after});
  const headers=`<th scope="col">${esc(before)}</th><th scope="col">${esc(after)}</th>`;
  const speed=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:4});
  const speeds=p.skillSpeedChanges?.length?`<table class="slot-dps-table" data-role="skill-speed-preview"><caption>스킬 사용 가능 속도 · 회/초${p.dpsBasis==='assumedDps'?' · 방어 전 기준':''}</caption>
    <thead><tr><th scope="col">스킬</th>${headers}</tr></thead>
    <tbody>${p.skillSpeedChanges.map(({index,id,kind,from,to})=>
      `<tr><th scope="row">${esc(slotName(index)+' · '+skillName(id))} <small>${kind==='attack'?'공격':'시전'}</small></th><td>${speed(from)}</td><td>${speed(to)}</td></tr>`).join('')}</tbody></table>`:'';
  const usageValue=({count,seconds},mana,life,showLife)=>`${fmt(count)}회 / ${speed(seconds)}초${Number.isFinite(mana)?`<small> · ${fmt(mana)} MP/초</small>`:''}${showLife&&Number.isFinite(life)?`<small> · ${fmt(life)} HP/초</small>`:''}`;
  const usage=p.manualUsageChanges?.length?`<table class="slot-dps-table" data-role="manual-usage-preview"><caption>측정 구간 수동 사용</caption>
    <thead><tr><th scope="col">스킬</th>${headers}</tr></thead>
    <tbody>${p.manualUsageChanges.map(({index,id,from,to,fromMana,toMana,fromLife,toLife})=>{
      const showLife=fromLife>0||toLife>0;
      return `<tr><th scope="row">${esc(slotName(index)+' · '+skillName(id))}</th><td>${usageValue(from,fromMana,fromLife,showLife)}</td><td>${usageValue(to,toMana,toLife,showLife)}</td></tr>`;
    }).join('')}</tbody></table>`:'';
  const numbed=p.numbedDamageChanges?.length?`<table class="slot-dps-table" data-role="numbed-damage-preview"><caption>${p.dpsBasis==='assumedDps'?'마취 기여 · 방어 전 DPS':'마취 기여 DPS'}</caption>
    <thead><tr><th scope="col">대미지</th>${headers}<th scope="col">변화</th></tr></thead>
    <tbody>${p.numbedDamageChanges.map(({label,from,to})=>dpsRow(esc(label),from,to,true)).join('')}</tbody></table>`:'';
  const uptimeValue=(rate,dps)=>esc(rate)+(Number.isFinite(dps)?`<small> · ${fmt(dps)} DPS</small>`:'');
  const uptimes=p.uptimeChanges?.length?`<table class="slot-dps-table" data-role="uptime-change-preview"><caption>가동률 변화 · ${p.dpsBasis==='assumedDps'?'방어 전 DPS 기여':'DPS 기여'}</caption>
    <thead><tr><th scope="col">효과</th>${headers}</tr></thead>
    <tbody>${p.uptimeChanges.map(({name,from,to,fromDps,toDps})=>`<tr><th scope="row">${esc(name)}</th><td>${uptimeValue(from,fromDps)}</td><td>${uptimeValue(to,toDps)}</td></tr>`).join('')}</tbody></table>`:'';
  return skill+speeds+usage+uptimes+numbed;
}

export function renderResourceChanges(p,esc,{board=false,skill=false}={}){
  const resourceValue=(value,unit)=>amount(value)+(Number.isFinite(value)?unit:'');
  const resourceText=({label,a,b,unit=''})=>`${label} ${resourceValue(a,unit)} → ${resourceValue(b,unit)}`;
  const rows=[...(p.resourceChanges??[]),...(p.resourceCosts??[]),...(p.resourceRecovery??[])];
  const castCosts=skill?rows.filter(row=>row.label==='시전당 MP'||row.label==='시전당 HP'):[];
  const [first,...rest]=castCosts.length?rows.filter(row=>!castCosts.includes(row)):rows;
  const manaNote=p.manaObservationStale?`<p>${p.previous?'직전 변경 · ':''}MP 회복 조건이 바뀌었습니다. ${board?'적용':'교체'} 후 관측 MP 수지는 새 관측값이 필요합니다.</p>`:'';
  if(!first&&!castCosts.length)return manaNote;
  const basisNote=board&&p.dpsBasis==='assumedDps'?'<p>관측 MP 수지는 입력한 전투 조건 기준입니다. 나머지 수치는 방어 전 DPS와 같은 조건으로 계산합니다.</p>':'';
  const summary=castCosts.length?castCosts.map(resourceText).join(' · '):`${p.previous?'직전 변경 · ':''}${board?'MP·HP 변화 · ':''}${resourceText(first)}`;
  const detailRows=castCosts.length?[...(first?[first]:[]),...rest]:rest;
  return detailRows.length||manaNote||basisNote
    ? `<details data-role="slot-resource-preview"><summary>${esc(summary)}</summary>${detailRows.length?`<ul>${detailRows.map(row=>`<li>${esc(resourceText(row))}</li>`).join('')}</ul>`:''}${basisNote}${manaNote}</details>`
    : `<p data-role="slot-resource-preview">${esc(summary)}</p>`;
}

export function renderSlotPreview(p,esc,{showDps=true,showResourcesInline=false,extraDetails=''}={}){
  const line=(label,a,b)=>`<li>${label} · ${fmt(a)} → ${fmt(b)} (${signed(b-a)})</li>`;
  const contributions=p.options.map(describeSeasonOptionChange).filter(Boolean).map(change=>`<li>${esc(change)}</li>`).join('');
  const {supported,baseValue,value,reasons,encounterMatches}=p.comparison;
  const blocked=!supported&&reasons.length?`<details><summary>${encounterMatches===false?'전투 조건 변경':'전체 DPS 비교 보류'}</summary><ul>${comparisonReasons(reasons,esc)}</ul></details>`:'';
  const {baseValue:assumedBefore,value:assumedAfter,supported:assumedSupported}=p.assumedComparison??{};
  const repeated=supported && Number.isFinite(assumedBefore) && Number.isFinite(assumedAfter)
    && fmt(baseValue)===fmt(assumedBefore) && fmt(value)===fmt(assumedAfter)
    && signed(value-baseValue)===signed(assumedAfter-assumedBefore);
  const assumed=(showDps||supported)&&Number.isFinite(assumedBefore)&&Number.isFinite(assumedAfter)&&!repeated
    ? dpsRow('방어 전',assumedBefore,assumedAfter,assumedSupported):'';
  const overall=showDps&&(Number.isFinite(baseValue)||Number.isFinite(value))?dpsRow('전체',baseValue,value,supported):'';
  const table=overall||assumed?`<table class="slot-dps-table" aria-label="장착 전후 DPS"><thead><tr><th scope="col">DPS</th><th scope="col">장착 전</th><th scope="col">장착 후</th><th scope="col">변화</th></tr></thead><tbody>${overall}${assumed}</tbody></table>`:'';
  const resources=renderResourceChanges(p,esc,{skill:showResourcesInline});
  const changes=`${showDps?'':table}${renderDamageBreakdown(p,esc)}${p.stats.length?'<h4>캐릭터 수치</h4><ul>'+p.stats.map(v=>line(v.label,v.a,v.b)).join('')+'</ul>':''}${contributions?'<h4>옵션</h4><ul>'+contributions+'</ul>':''}${showResourcesInline?'':resources}${extraDetails}`;
  const details=changes?`<details><summary>변경 수치</summary>${changes}${showDps?'':blocked}</details>`:blocked;
  const body=`${p.offhandRemoved?'<p>서브 무기 해제 예정</p>':''}${showDps?table:''}${showResourcesInline?resources:''}${details}${showDps&&changes?blocked:''}`;
  return body?`<section aria-label="장착 전 수치 비교">${body}</section>`:'';
}
export function shelfTools(kind,index,filled,button,candidate=false){
  const attrs=`data-kind="${kind}" data-index="${index}"`;
  const wearable=kind==='gear'||kind==='memory';
  const create=candidate?button('후보만 보관','workshop-store',attrs):wearable?button(kind==='gear'?'장비 제작':'추억 제작','workshop-open',attrs):'';
  return `<div class="native-slot-actions">${create}${button(wearable?'보관함에서 장착':'보관함 열기','shelf-open',attrs)}${filled&&!candidate?button(wearable?'장착 중인 '+(kind==='gear'?'장비':'추억')+' 보관':'보관함에 저장','shelf-save',attrs):''}</div>`;
}
export function mobileDpsBar(s){
  const assumed=s.report.assumedDps;
  const d=s.report.fullDps;
  const showAssumed=!d.supported&&assumed?.supported;
  const value=showAssumed?assumed.dps:d.dps;
  const change=compactSeasonEditDelta(showAssumed?s.editComparison?.assumed:s.editComparison);
  return `<a href="#native-dps-summary" class="mobile-dps-bar" aria-label="DPS 상세 보기"><span>${showAssumed?SEASON_ADVISOR_METRICS.assumedDps:'전체 DPS'}</span><b data-mobile-dps>${s.pending.size?'입력 적용 대기':Number.isFinite(value)?fmt(value):'확인 필요'}</b><small data-mobile-delta>${!s.pending.size&&change?(change.previous?'직전 ':'')+signed(change.value.delta):''}</small></a>`;
}
