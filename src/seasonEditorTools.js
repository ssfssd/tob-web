const fmt=n=>n.toLocaleString('ko-KR',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+fmt(n);
export function renderGearPreview(p,labels){
  const line=(label,a,b)=>`<li>${label} · ${fmt(a)} → ${fmt(b)} (${signed(b-a)})</li>`;
  const sums=effects=>{
    const map=new Map();
    for(const e of effects){
      if(!['add','add_percent'].includes(e.operation))continue;
      const k=JSON.stringify([e.stat,e.operation,e.unit]);
      map.set(k,(map.get(k)??0)+e.value);
    }
    return map;
  };
  const a=sums(p.before),b=sums(p.after);
  const contributions=[...new Set([...a.keys(),...b.keys()])].filter(k=>a.get(k)!==b.get(k)).map(k=>{
    const [stat,op,unit]=JSON.parse(k);
    return Object.hasOwn(labels,stat)?line(labels[stat]+(unit==='percent'||op==='add_percent'?' (%)':''),a.get(k)??0,b.get(k)??0):'';
  }).join('');
  return `<section aria-label="장착 전 수치 비교"><h4>장착 전 → 장착 후</h4><ul>${p.assumed?.every(Number.isFinite)?line('가동률 100% · 방어 적용 전 DPS',...p.assumed):''}${p.comparison.supported?line('입력 조건 전체 DPS',p.comparison.baseValue,p.comparison.value):'<li>전체 DPS 비교 보류</li>'}${p.stats.map(v=>line(v.label,v.a,v.b)).join('')}</ul>${contributions?'<p>확인된 장비 옵션 기여</p><ul>'+contributions+'</ul>':''}</section>`;
}
export function shelfTools(kind,index,filled,button){
  const attrs=`data-kind="${kind}" data-index="${index}"`;
  const create = kind === 'gear' || kind === 'memory' ? button(kind === 'gear' ? '장비 제작' : '추억 제작', 'workshop-open', attrs) : '';
  return `<div class="native-slot-actions">${create}${button('보관함 열기','shelf-open',attrs)}${filled?button('보관함에 저장','shelf-save',attrs):''}</div>`;
}
export function mobileDpsBar(s){
  const assumed=s.report.assumedDps, delta=s.editComparison?.assumedDelta;
  if(assumed) return `<a href="#native-dps-summary" class="mobile-dps-bar" aria-label="전체 DPS 상세 보기"><span>방어 전 DPS<br>가동률 100%</span><b data-mobile-dps>${s.pending.size?'입력 적용 대기':assumed.supported?fmt(assumed.dps):'확인 필요'}</b><small data-mobile-delta>${!s.pending.size&&Number.isFinite(delta)?'직전 '+signed(delta):''}</small><span>상세 보기</span></a>`;
  const d=s.report.fullDps,p=s.editComparison?.previous;
  return `<a href="#native-dps-summary" class="mobile-dps-bar" aria-label="전체 DPS 상세 보기"><span>전체 DPS</span><b data-mobile-dps>${s.pending.size?'입력 적용 대기':d.supported?fmt(d.dps):'확인 필요'}</b><small data-mobile-delta>${s.pending.size?'':p?.supported?'직전 '+signed(p.delta):p?'비교 보류':''}</small><span>상세 보기</span></a>`;
}
