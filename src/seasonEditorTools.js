import { describeSeasonOptionChange, formatSeasonManaBalance } from './seasonNumericStatsView.js';
import { SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';
import { compactSeasonEditDelta } from './seasonEditComparison.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { seasonSupportKoreanCard } from './seasonSupport.js';
import { SEASON_DAMAGE_TYPE_LABELS } from './seasonDps.js';
import { WEAPON_PHYSICAL_BASE_UNVERIFIED } from './seasonWeaponProfile.js';

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
  const summary=single&&Number.isInteger(single.from)&&Number.isInteger(single.to)&&single.from!==single.to
    ?` · ${single.from} → ${single.to}${single.toConfirmed?'':' (확인 필요)'}`:'';
  const value=(id,base,level,verified,growth)=>{
    if(!id)return '빈 칸';
    if(!Number.isInteger(level))return '레벨 미확인';
    return `Lv.${level}${verified?'':' (수치 미확인)'}${Number.isInteger(base)&&base!==level?`<small> · 기본 ${base}</small>`:''}${verified&&Number.isFinite(growth)?`<small> · 대미지 ×${fmt(growth)}</small>`:''}`;
  };
  const content=rows.map(({id,beforeId,rowIndex,supportIndex,from,to,fromBase,toBase,fromConfirmed,toConfirmed,fromGrowth,toGrowth})=>{
    const socket=Number.isInteger(supportIndex)?` · 보조 ${supportIndex+1}`:'';
    const oldId=beforeId===undefined?id:beforeId;
    const name=oldId&&id&&oldId!==id?`${skillName(oldId)} → ${skillName(id)}`:skillName(id??oldId);
    return `<tr><th scope="row">${esc(`${slotName(rowIndex)}${socket} · ${name}`)}</th><td>${value(oldId,fromBase,from,fromConfirmed,fromGrowth)}</td><td>${value(id,toBase,to,toConfirmed,toGrowth)}</td></tr>`;
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
  const composition=p.damageCompositionChanges?.length?`<table class="slot-dps-table" data-role="damage-composition-preview"><caption>발동 유형별 ${p.dpsBasis==='assumedDps'?'방어 전 ':''}DPS 변화</caption>
    <thead><tr><th scope="col">유형</th>${headers}<th scope="col">변화</th></tr></thead>
    <tbody>${p.damageCompositionChanges.map(({label,from,to})=>dpsRow(esc(label),from,to,true)).join('')}</tbody></table>`:'';
  const types=p.damageTypeChanges?.length?`<table class="slot-dps-table" data-role="damage-type-preview"><caption>${p.damageTypeChanges.some(row=>row.type==='execute')?'속성·도태':'속성별'} ${p.dpsBasis==='assumedDps'?'방어 전 ':''}DPS 변화</caption>
    <thead><tr><th scope="col">속성</th>${headers}<th scope="col">변화</th></tr></thead>
    <tbody>${p.damageTypeChanges.map(({label,from,to})=>dpsRow(esc(label),from,to,true)).join('')}</tbody></table>`:'';
  const speed=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:4});
  const speeds=p.skillSpeedChanges?.length?`<table class="slot-dps-table" data-role="skill-speed-preview"><caption>스킬 사용 가능 속도 · 회/초${p.dpsBasis==='assumedDps'?' · 방어 전 기준':''}</caption>
    <thead><tr><th scope="col">스킬</th>${headers}</tr></thead>
    <tbody>${p.skillSpeedChanges.map(({index,id,kind,from,to})=>
      `<tr><th scope="row">${esc(slotName(index)+' · '+skillName(id))} <small>${kind==='attack'?'공격':'시전'}</small></th><td>${speed(from)}</td><td>${speed(to)}</td></tr>`).join('')}</tbody></table>`:'';
  const usageValue=({count,seconds,multistrikes=0},mana,life,showLife,showMultistrikes)=>`${fmt(count)}회 / ${speed(seconds)}초`
    +(showMultistrikes?`<small> · 연속 공격 ${fmt(multistrikes)}회</small>`:'')
    +(Number.isFinite(mana)?`<small> · ${fmt(mana)} MP/초</small>`:'')+(showLife&&Number.isFinite(life)?`<small> · ${fmt(life)} HP/초</small>`:'');
  const usage=p.manualUsageChanges?.length?`<table class="slot-dps-table" data-role="manual-usage-preview"><caption>측정 구간 수동 사용</caption>
    <thead><tr><th scope="col">스킬</th>${headers}</tr></thead>
    <tbody>${p.manualUsageChanges.map(({index,id,beforeId,from,to,fromMana,toMana,fromLife,toLife})=>{
      const showLife=fromLife>0||toLife>0;
      const showMultistrikes=from.multistrikes>0||to.multistrikes>0;
      const name=beforeId?`${skillName(beforeId)} → ${skillName(id)}`:skillName(id);
      return `<tr><th scope="row">${esc(slotName(index)+' · '+name)}</th><td>${usageValue(from,fromMana,fromLife,showLife,showMultistrikes)}</td><td>${usageValue(to,toMana,toLife,showLife,showMultistrikes)}</td></tr>`;
    }).join('')}</tbody></table>`:'';
  const numbed=p.numbedDamageChanges?.length?`<table class="slot-dps-table" data-role="numbed-damage-preview"><caption>${p.dpsBasis==='assumedDps'?'마취 기여 · 방어 전 DPS':'마취 기여 DPS'}</caption>
    <thead><tr><th scope="col">대미지</th>${headers}<th scope="col">변화</th></tr></thead>
    <tbody>${p.numbedDamageChanges.map(({label,from,to})=>dpsRow(esc(label),from,to,true)).join('')}</tbody></table>`:'';
  const skillNumbed=p.skillNumbedDamageChanges?.length?`<details data-role="skill-numbed-damage-preview"><summary>스킬별 마취 기여 · ${p.dpsBasis==='assumedDps'?'방어 전 DPS':'DPS'}</summary>
    <table class="slot-dps-table"><thead><tr><th scope="col">스킬 · 대미지</th>${headers}<th scope="col">변화</th></tr></thead>
    <tbody>${p.skillNumbedDamageChanges.map(({index,beforeId,afterId,label,from,to})=>{
      const name=beforeId&&afterId&&beforeId!==afterId?`${skillName(beforeId)} → ${skillName(afterId)}`:skillName(afterId??beforeId);
      return dpsRow(esc(`${slotName(index)} · ${name} · ${label}`),from,to,true);
    }).join('')}</tbody></table></details>`:'';
  const numbedState=p.numbedStateChanges?.length?`<table class="slot-dps-table" data-role="numbed-state-preview"><caption>마취 적용 변화</caption>
    <thead><tr><th scope="col">수치</th>${headers}</tr></thead>
    <tbody>${p.numbedStateChanges.map(({label,from,to,unit})=>`<tr><th scope="row">${esc(label)}</th><td>${fmt(from)}${esc(unit)}</td><td>${fmt(to)}${esc(unit)}</td></tr>`).join('')}</tbody></table>`:'';
  const uptimeValue=(rate,dps)=>esc(rate)+(Number.isFinite(dps)?`<small> · ${fmt(dps)} DPS</small>`:'');
  const uptimeLabel=p.uptimeChanges?.some(row=>row.buffState)?'가동률·버프 상태 변화':'가동률 변화';
  const uptimeDpsLabel=p.uptimeChanges?.some(row=>Number.isFinite(row.fromDps)||Number.isFinite(row.toDps))
    ? ` · ${p.dpsBasis==='assumedDps'?'방어 전 DPS 기여':'DPS 기여'}`:'';
  const uptimes=p.uptimeChanges?.length?`<table class="slot-dps-table" data-role="uptime-change-preview"><caption>${uptimeLabel}${uptimeDpsLabel}</caption>
    <thead><tr><th scope="col">효과</th>${headers}</tr></thead>
    <tbody>${p.uptimeChanges.map(({name,from,to,fromDps,toDps})=>`<tr><th scope="row">${esc(name)}</th><td>${uptimeValue(from,fromDps)}</td><td>${uptimeValue(to,toDps)}</td></tr>`).join('')}</tbody></table>`:'';
  const phases=p.elixirPhaseChanges?.length?`<details data-role="elixir-phase-change-preview"><summary>영약 ${p.elixirPhaseChanges[0].observed?'상태별':'구간별'} 스킬 기여 변화</summary>
    <table class="slot-dps-table"><thead><tr><th scope="col">스킬 · 영약</th>${headers}</tr></thead>
    <tbody>${p.elixirPhaseChanges.map(({index,id,name,uptime,changes})=>{
      const values=key=>changes.map(change=>`<small>${esc(change.label)} ${fmt(change[key])}</small>`).join('');
      return `<tr><th scope="row">${esc(slotName(index)+' · '+skillName(id))}<small>${esc(name)} · ${fmt(uptime)}%</small></th><td>${values('from')}</td><td>${values('to')}</td></tr>`;
    }).join('')}</tbody></table></details>`:'';
  return skill+composition+types+speeds+usage+uptimes+phases+numbedState+numbed+skillNumbed;
}

export function renderResourceChanges(p,esc,{board=false,skill=false,action=board?'적용':'교체'}={}){
  const resourceValue=(value,unit,empty)=>empty?'미장착':amount(value)+(Number.isFinite(value)?unit:'');
  const resourceText=({label,a,b,unit='',aEmpty,bEmpty})=>`${label} ${resourceValue(a,unit,aEmpty)} → ${resourceValue(b,unit,bEmpty)}`;
  const rows=[...(p.resourceChanges??[]),...(p.resourceCosts??[]),...(p.resourceRecovery??[])];
  const castCosts=skill?rows.filter(row=>row.label==='시전당 MP'||row.label==='시전당 HP'):[];
  const [first,...rest]=castCosts.length?rows.filter(row=>!castCosts.includes(row)):rows;
  const manaNote=p.manaObservationStale?`<p>${p.previous?'직전 변경 · ':''}MP 회복 조건이 바뀌었습니다. ${esc(action)} 후 관측 MP 수지는 새 관측값이 필요합니다.</p>`:'';
  const perSkill=p.skillResourceChanges?.length?`<details data-role="slot-skill-resource-changes"><summary>스킬별 초당 소모 변화</summary>
    <table class="slot-dps-table"><thead><tr><th scope="col">스킬</th><th scope="col">${p.previous?'직전':'변경 전'}</th><th scope="col">변경 후</th></tr></thead>
    <tbody>${p.skillResourceChanges.map(({index,beforeId,afterId,resource,a,b})=>{
      const name=beforeId&&afterId&&beforeId!==afterId?`${skillName(beforeId)} → ${skillName(afterId)}`:skillName(afterId??beforeId);
      return `<tr><th scope="row">${esc(`${slotName(index)} · ${name} · ${resource}/초`)}</th><td>${resourceValue(a,'',!beforeId)}</td><td>${resourceValue(b,'',!afterId)}</td></tr>`;
    }).join('')}</tbody></table></details>`:'';
  const sealValue=row=>!row?'미장착':row.blocked?'확인 필요':row.active===false?'꺼짐':resourceValue(row.applied,'%');
  const sealName=row=>row.name&&/[가-힣]/u.test(row.name)&&!/\p{Script=Han}/u.test(row.name)?row.name:'한국어 이름 미제공';
  const reservations=p.manaReservationChanges?.length?`<details data-role="slot-mana-reservation-changes"><summary>오라·보조별 MP 봉인 변화</summary>
    <table class="slot-dps-table"><thead><tr><th scope="col">오라·보조</th><th scope="col">${p.previous?'직전':'변경 전'}</th><th scope="col">변경 후</th></tr></thead>
    <tbody>${p.manaReservationChanges.map(({a,b})=>{
      const {rowIndex,supportIndex}=b??a;
      const socket=Number.isInteger(supportIndex)?` · 보조 ${supportIndex+1}`:'';
      const name=a&&b&&a.name!==b.name?`${sealName(a)} → ${sealName(b)}`:sealName(b??a);
      return `<tr><th scope="row">${esc(`${slotName(rowIndex)}${socket} · ${name}`)}</th><td>${esc(sealValue(a))}</td><td>${esc(sealValue(b))}</td></tr>`;
    }).join('')}</tbody></table></details>`:'';
  const elixirMana=p.elixirManaBalanceChanges?.length?`<details data-role="slot-elixir-mana-changes"><summary>영약 상태별 MP 수지 변화</summary>
    <table class="slot-dps-table"><thead><tr><th scope="col">영약 · 자연 회복 기준</th><th scope="col">${p.previous?'직전':'변경 전'} MP/초</th><th scope="col">변경 후 MP/초</th></tr></thead>
    <tbody>${p.elixirManaBalanceChanges.map(({name,uptime,label,from,to})=>`<tr><th scope="row">${esc(name)} · ${fmt(uptime)}%<small>${esc(label)}</small></th><td>${formatSeasonManaBalance(from)}</td><td>${formatSeasonManaBalance(to)}</td></tr>`).join('')}</tbody></table></details>`:'';
  if(!first&&!castCosts.length)return manaNote+perSkill+reservations+elixirMana;
  const basisNote=board&&p.dpsBasis==='assumedDps'?'<p>관측 MP 회복·수지는 입력한 전투 조건 기준입니다. 나머지 수치는 방어 전 DPS와 같은 조건으로 계산합니다.</p>':'';
  const summary=castCosts.length?castCosts.map(resourceText).join(' · '):`${p.previous?'직전 변경 · ':''}${board?'MP·HP 변화 · ':''}${resourceText(first)}`;
  const detailRows=castCosts.length?[...(first?[first]:[]),...rest]:rest;
  return detailRows.length||manaNote||basisNote||perSkill||reservations||elixirMana
    ? `<details data-role="slot-resource-preview"><summary>${esc(summary)}</summary>${detailRows.length?`<ul>${detailRows.map(row=>`<li>${esc(resourceText(row))}</li>`).join('')}</ul>`:''}${basisNote}${manaNote}${elixirMana}${perSkill}${reservations}</details>`
    : `<p data-role="slot-resource-preview">${esc(summary)}</p>`;
}

function renderWeaponComparisons(comparisons, action) {
  const cell=(profile, keys)=>{
    if (!profile.weapon) return profile.id ? '해당 없음' : '미장착';
    const values=keys.map(key=>profile.values[key]);
    return values.every(Number.isFinite) ? values.map(fmt).join('–') : '미확인';
  };
  return (comparisons??[]).map(({index,from,to})=>{
    const damage=Object.entries(SEASON_DAMAGE_TYPE_LABELS).flatMap(([type,label])=>{
      const min=`weapon${type}Min`, max=`weapon${type}Max`;
      return type==='physical'||from.values[max]>0||to.values[max]>0 ? [[`${label} 대미지`,min,max]] : [];
    });
    const rows=[...damage,['초당 공격','weaponSpeed'],['크리티컬 수치','baseCriticalRating']];
    return `<table class="slot-dps-table" data-role="weapon-stat-comparison-${index}"><caption>${index===0?'메인':'서브'} 무기 수치</caption>
      <thead><tr><th scope="col">항목</th><th scope="col">${action} 전</th><th scope="col">${action} 후</th></tr></thead>
      <tbody>${rows.map(([label,...keys])=>`<tr><th scope="row">${label}</th><td>${cell(from,keys)}</td><td>${cell(to,keys)}</td></tr>`).join('')}</tbody></table>`;
  }).join('');
}

export function renderSlotPreview(p,esc,{showDps=true,showResourcesInline=false,extraDetails='',action='장착'}={}){
  const line=(label,a,b)=>`<li>${label} · ${fmt(a)} → ${fmt(b)} (${signed(b-a)})</li>`;
  const contributions=p.options.map(describeSeasonOptionChange).filter(Boolean).map(change=>`<li>${esc(change)}</li>`).join('');
  const {supported,baseValue,value,reasons,encounterMatches}=p.comparison;
  const missingWeaponBase=!supported&&!p.assumedComparison?.supported&&p.weaponComparisons?.length
    && reasons.includes('현재: '+WEAPON_PHYSICAL_BASE_UNVERIFIED);
  const isWeaponBaseReason=reason=>reason.replace(/^(?:기준|현재): /u,'')===WEAPON_PHYSICAL_BASE_UNVERIFIED;
  const otherReasons=missingWeaponBase?reasons.filter(reason=>!isWeaponBaseReason(reason)):reasons;
  const weaponBlocker=missingWeaponBase?`<p data-role="weapon-dps-blocker">${esc(WEAPON_PHYSICAL_BASE_UNVERIFIED)}</p>`:'';
  const blocked=!supported&&otherReasons.length?`<details><summary>${encounterMatches===false?'전투 조건 변경':'전체 DPS 비교 보류'}</summary><ul>${comparisonReasons(otherReasons,esc)}</ul></details>`:'';
  const {baseValue:assumedBefore,value:assumedAfter,supported:assumedSupported}=p.assumedComparison??{};
  const repeated=supported && Number.isFinite(assumedBefore) && Number.isFinite(assumedAfter)
    && fmt(baseValue)===fmt(assumedBefore) && fmt(value)===fmt(assumedAfter)
    && signed(value-baseValue)===signed(assumedAfter-assumedBefore);
  const assumed=(showDps||supported)&&Number.isFinite(assumedBefore)&&Number.isFinite(assumedAfter)&&!repeated
    ? dpsRow('방어 전',assumedBefore,assumedAfter,assumedSupported):'';
  const overall=showDps&&(Number.isFinite(baseValue)||Number.isFinite(value))?dpsRow('전체',baseValue,value,supported):'';
  const table=overall||assumed?`<table class="slot-dps-table" aria-label="${esc(action)} 전후 DPS"><thead><tr><th scope="col">DPS</th><th scope="col">${esc(action)} 전</th><th scope="col">${esc(action)} 후</th><th scope="col">변화</th></tr></thead><tbody>${overall}${assumed}</tbody></table>`:'';
  const resources=renderResourceChanges(p,esc,{skill:showResourcesInline,action:action==='장착'?'교체':action});
  const changes=`${showDps?'':table}${renderDamageBreakdown(p,esc,{before:`${action} 전`,after:`${action} 후`})}${p.stats.length?'<h4>캐릭터 수치</h4><ul>'+p.stats.map(v=>line(v.label,v.a,v.b)).join('')+'</ul>':''}${contributions?'<h4>옵션</h4><ul>'+contributions+'</ul>':''}${showResourcesInline?'':resources}${extraDetails}`;
  const details=changes?`<details><summary>변경 수치</summary>${changes}${showDps?'':blocked}</details>`:blocked;
  const body=`${p.offhandRemoved?'<p>서브 무기 해제 예정</p>':''}${weaponBlocker}${showDps?table:''}${renderWeaponComparisons(p.weaponComparisons,esc(action))}${showResourcesInline?resources:''}${details}${showDps&&changes?blocked:''}`;
  return body?`<section aria-label="${esc(action)} 전 수치 비교">${body}</section>`:'';
}
export function shelfTools(kind,index,filled,button,candidate=false){
  const attrs=`data-kind="${kind}" data-index="${index}"`;
  const wearable=kind==='gear'||kind==='memory';
  const create=candidate?button('후보만 보관','workshop-store',attrs):wearable?button(kind==='gear'?'장비 제작':'추억 제작','workshop-open',attrs):'';
  return `<div class="native-slot-actions">${create}${button(wearable?'보관함에서 장착':'보관함 열기','shelf-open',attrs)}${filled&&!candidate?button(wearable?'장착 중인 '+(kind==='gear'?'장비':'추억')+' 보관':'보관함에 저장','shelf-save',attrs):''}</div>`;
}
export function mobileDpsBar(s,blockedStatus='확인 필요'){
  const assumed=s.report.assumedDps;
  const d=s.report.fullDps;
  const showAssumed=!d.supported&&assumed?.supported;
  const value=showAssumed?assumed.dps:d.dps;
  const change=compactSeasonEditDelta(showAssumed?s.editComparison?.assumed:s.editComparison);
  const body=`<span>${showAssumed?SEASON_ADVISOR_METRICS.assumedDps:'전체 DPS'}</span><b data-mobile-dps>${s.pending.size?'입력 적용 대기':Number.isFinite(value)?fmt(value):blockedStatus}</b><small data-mobile-delta>${!s.pending.size&&change?(change.previous?'직전 ':'')+signed(change.value.delta):''}</small>`;
  const hasBlockers=d.blockers?.length||assumed?.blockers?.length;
  if (!s.pending.size&&!d.supported&&!showAssumed&&hasBlockers)
    return `<button type="button" class="mobile-dps-bar" aria-label="전체 DPS 보류 이유 보기" data-ss14-action="result-tab" data-tab="calculation" data-show-dps="true" data-focus-role="calculation-requirements">${body}</button>`;
  return `<a href="#native-dps-summary" class="mobile-dps-bar" aria-label="DPS 상세 보기">${body}</a>`;
}
