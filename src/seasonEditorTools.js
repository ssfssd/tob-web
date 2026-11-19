import { describeSeasonOptionChange } from './seasonNumericStatsView.js';
import { SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';

const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+fmt(n);
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

export function renderSlotPreview(p,esc,{showDps=true,extraDetails=''}={}){
  const line=(label,a,b)=>`<li>${label} · ${fmt(a)} → ${fmt(b)} (${signed(b-a)})</li>`;
  const contributions=p.options.map(describeSeasonOptionChange).filter(Boolean).map(change=>`<li>${esc(change)}</li>`).join('');
  const {supported,baseValue,value,reasons,encounterMatches}=p.comparison;
  const amount=n=>Number.isFinite(n)?fmt(n):'미확정';
  const resourceValue=(value,unit)=>amount(value)+(Number.isFinite(value)?unit:'');
  const resourceText=({label,a,b,unit=''})=>`${label} ${resourceValue(a,unit)} → ${resourceValue(b,unit)}`;
  const dpsRow=(label,from,to,comparable)=>`<tr><th scope="row">${label}</th><td>${amount(from)}</td><td>${amount(to)}</td><td>${comparable?signed(to-from):'—'}</td></tr>`;
  const blocked=!supported&&reasons.length?`<details><summary>${encounterMatches===false?'전투 조건 변경':'전체 DPS 비교 보류'}</summary><ul>${comparisonReasons(reasons,esc)}</ul></details>`:'';
  const {baseValue:assumedBefore,value:assumedAfter,supported:assumedSupported}=p.assumedComparison??{};
  const repeated=supported && Number.isFinite(assumedBefore) && Number.isFinite(assumedAfter)
    && fmt(baseValue)===fmt(assumedBefore) && fmt(value)===fmt(assumedAfter)
    && signed(value-baseValue)===signed(assumedAfter-assumedBefore);
  const assumed=(showDps||supported)&&Number.isFinite(assumedBefore)&&Number.isFinite(assumedAfter)&&!repeated
    ? dpsRow('방어 전',assumedBefore,assumedAfter,assumedSupported):'';
  const overall=showDps&&(Number.isFinite(baseValue)||Number.isFinite(value))?dpsRow('전체',baseValue,value,supported):'';
  const table=overall||assumed?`<table class="slot-dps-table" aria-label="장착 전후 DPS"><thead><tr><th scope="col">DPS</th><th scope="col">장착 전</th><th scope="col">장착 후</th><th scope="col">변화</th></tr></thead><tbody>${overall}${assumed}</tbody></table>`:'';
  const [firstResource,...moreResources]=[...(p.resourceChanges??[]),...(p.resourceCosts??[])];
  const resources=firstResource?(moreResources.length
    ? `<details data-role="slot-resource-preview"><summary>${esc(resourceText(firstResource))}</summary><ul>${moreResources.map(row=>`<li>${esc(resourceText(row))}</li>`).join('')}</ul></details>`
    : `<p data-role="slot-resource-preview">${esc(resourceText(firstResource))}</p>`):'';
  const changes=`${showDps?'':table}${p.stats.length?'<h4>캐릭터 수치</h4><ul>'+p.stats.map(v=>line(v.label,v.a,v.b)).join('')+'</ul>':''}${contributions?'<h4>옵션</h4><ul>'+contributions+'</ul>':''}${resources}${extraDetails}`;
  const details=changes?`<details><summary>변경 수치</summary>${changes}${showDps?'':blocked}</details>`:blocked;
  const body=`${p.offhandRemoved?'<p>서브 무기 해제 예정</p>':''}${showDps?table:''}${details}${showDps&&changes?blocked:''}`;
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
  const baseline=showAssumed?s.editComparison?.assumed?.baseline:s.editComparison?.baseline;
  const change=baseline?.supported?baseline.delta:null;
  return `<a href="#native-dps-summary" class="mobile-dps-bar" aria-label="DPS 상세 보기"><span>${showAssumed?SEASON_ADVISOR_METRICS.assumedDps:'전체 DPS'}</span><b data-mobile-dps>${s.pending.size?'입력 적용 대기':Number.isFinite(value)?fmt(value):'확인 필요'}</b><small data-mobile-delta>${!s.pending.size&&Number.isFinite(change)&&change!==0?signed(change):''}</small></a>`;
}
