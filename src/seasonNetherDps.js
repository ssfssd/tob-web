import { netherSum, netherMore } from './seasonNetherRemaining.js';

// Returns only additions to the selected core. Other rows retain their own
// scope. Observed trigger rates never become ordinary cast-speed bonuses.
export function netherCorePlan(mechanics,{rowIndex,tags,eligibleBurst,maxBurst,burstChargeSpeed,hit,dotDps,combat,manualRate=0,cardDetail=''}) {
  const blockers=[],events=[];
  let dps=0;
  const core=rowIndex===0?mechanics.filter(m=>m.kind==='nether-core-trigger'&&m.rate>0):[];
  const automaticBurst=core.some(m=>m.trigger==='burst');
  for(const m of core) {
    if(m.trigger==='burst'&&(!eligibleBurst||!maxBurst)) {blockers.push('추방 버스트의 코어는 매직 버스트를 사용할 수 있는 주술이어야 합니다.');continue;}
    if(m.trigger==='burst'&&m.rate>burstChargeSpeed/2+1e-8) {blockers.push('코어 자동 발동 횟수가 버스트 충전 속도로 가능한 횟수를 넘습니다.');continue;}
    if(m.trigger==='shadow'&&!tags.includes('Shadow Strike')) {blockers.push('추방 그림자의 코어에 그림자 스킬을 선택하세요.');continue;}
    if(m.trigger==='steep') {blockers.push('추방 슬래시의 코어 슬래시와 일반 스윕 대미지 분리 모델이 필요합니다.');continue;}
    const count=m.trigger==='burst'?1+maxBurst:1;
    events.push({...m,count});
    dps+=hit*m.rate*count*m.multiplier;
  }
  const returns=mechanics.filter(m=>m.kind==='nether-return');
  for(const m of returns) {
    if(!tags.includes('Attack')||!tags.includes('Horizontal'))continue;
    if(/cannot return|cannot.*Return/u.test(cardDetail))continue;
    if(/Shotgun|explosion|Explosion/u.test(cardDetail)){blockers.push('귀환의 복수 투사체·폭발·산탄 대미지 분리는 아직 미지원입니다.');continue;}
    if(combat){blockers.push('귀환의 적중 시점과 연속 공격의 복합 시간표는 아직 미지원입니다.');continue;}
    dps+=hit*manualRate*m.chance*m.hitChance;
  }
  const pulse=rowIndex===0&&mechanics.find(m=>m.kind==='nether-scorching-pulse');
  if(pulse)blockers.push('작열 웨이브 1레벨 표는 확인했으나 재수확·화염 코어·2초 발동 제한의 결합 계산은 아직 미지원입니다.');
  // Execute changes time to kill; it is not a perpetual multiplier on a
  // fixed HP target. Report its threshold separately from damage per second.
  const execute=mechanics.find(m=>m.kind==='nether-dot-execute');
  return {dps,events,blockers,automaticBurst,execute:execute?{threshold:execute.threshold,requiresDot:true}:null};
}

export function netherDeterioration(effects,erosionHit,chance) {
  return erosionHit*.6*(1+netherSum(effects,'deterioration_damage')/100)*netherMore(effects,'deterioration_damage')*Math.min(1,chance/100);
}
