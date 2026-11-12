import { blessingConditionValue, blessingLabel } from './seasonBlessings.js';

export const uptimeFields = {
  dotUptime: ['지속 대미지', '효과가 끝나기 전에 같은 대상에게 다시 적용하면 100%를 유지할 수 있습니다. 지속 대미지 DPS에 유지율을 곱합니다.'],
  minionUptime: ['소환체 공격', '대상을 소환체의 공격 범위 안에 유지하세요. 측정 시간 중 소환체가 공격할 수 있는 비율을 소환체 DPS에 반영합니다.'],
  moduleIgniteUptime: ['모듈 점화', '대상에게 소환체의 점화가 남아 있는 시간을 잽니다. 모듈 점화 DPS에 유지율을 곱합니다.'],
  coreUptime: ['클락워크 코어', '코어가 작동하는 시간을 잽니다. 초당 코어 발동 횟수에 유지율을 곱합니다.'],
  periodicBurstUptime: ['간헐적 폭발', '보조 효과가 활성화되는 구간에 시전 속도 보너스를 적용합니다.'],
};

const percent = v => Number.isFinite(v) ? v.toLocaleString('ko-KR',{maximumFractionDigits:2})+'%' : '미입력';
const onOff = v => v === 1 ? '활성' : v === 0 ? '비활성' : '미입력';
const korean = v => typeof v === 'string' && /[가-힣]/u.test(v) && !/\p{Script=Han}/u.test(v);
function damageContribution(report, field) {
  if (!report.fullDps.supported) return '';
  const values=report.fullDps.rows.map(row=>row.values?.[field]).filter(Number.isFinite);
  return values.length ? ' 방어 전 DPS 중 '+values.reduce((sum,value)=>sum+value,0).toLocaleString('ko-KR',{maximumFractionDigits:2})+' DPS.' : '';
}

export function describeUptime(build, report, estimate, skills) {
  const lines = skills.map(({name, field, saved}) => ({
    name:name+' · '+uptimeFields[field][0], setting:percent(saved), assumed:'100%', method:uptimeFields[field][1]
  }));
  const originals = new Map(report.componentProjection.rows.flatMap(row=>(row.conditionControls??[]).map(c=>[c.key,c])));
  const heroes = new Set();
  for (const row of estimate.componentProjection.rows) {
    for (const c of row.conditionControls ?? []) {
      if (c.kind !== 'boolean') continue;
      const dynamic = estimate.theaAverage && blessingConditionValue(c,{Focus:0,Tenacity:0,Agility:0}) !== undefined;
      const method = [c.sourceText, row.detail, c.label].find(korean) ?? '한국어 원문 미제공';
      lines.push({name:row.name, setting:dynamic?'축복 주기':onOff(originals.get(c.key)?.value),
        assumed:dynamic?'축복 주기':c.automatic?'장착·중첩 조건에 따라 '+onOff(c.value):onOff(c.value),
        method:method+' · 조건이 충족된 동안 이 옵션을 계산합니다.'});
    }
    if (row.elixirState) {
      const saved=report.componentProjection.rows.find(r=>r.path===row.path)?.elixirState;
      lines.push({name:row.name, setting:report.theaAverage?.combat?'전투 시간표':onOff(saved?.enabled), assumed:'활성 가정',
        method:'영약 효과가 끝나기 전에 갱신하면 유지됩니다. 방어 전 계산은 활성 상태의 효과 배율을 사용합니다.'});
    }
    for (const key of row.heroControls ?? []) {
      if (heroes.has(key)) continue;
      const method={signal:'대상에게 기발 시그널이 적용된 동안 해당 특성 효과를 반영합니다.',
        boonActive:'첫 은총이 유지되는 동안 소모한 축복에 따른 효과를 반영합니다.',
        boonActiveSecond:'두 번째 은총이 유지되는 동안 소모한 축복에 따른 효과를 반영합니다.'}[key];
      if (!method || key !== 'signal' && estimate.theaAverage) continue;
      heroes.add(key);
      lines.push({name:row.name, setting:onOff(build.ss14Inputs.heroCombat?.[key]), assumed:'활성 가정', method});
    }
  }
  const cycle=estimate.theaAverage;
  if (cycle) {
    const value=v=>Number.isFinite(v)?percent(v):'계산 보류';
    const timing=Number.isFinite(cycle.duration)&&Number.isFinite(cycle.cooldown)
      ? ' 지속 '+cycle.duration.toLocaleString('ko-KR')+'초, 쿨타임 '+cycle.cooldown.toLocaleString('ko-KR')+'초.'+
        (cycle.cooldown>cycle.duration?' 즉시 재발동해도 '+(cycle.cooldown-cycle.duration).toLocaleString('ko-KR')+'초의 공백이 생깁니다.':' 다음 은총을 지속 시간 안에 발동하면 연속 유지됩니다.') : '';
    lines.push({name:'신의 은총', setting:value(report.theaAverage?.uptime), assumed:value(cycle.uptime),
      method:blessingLabel('Focus')+' 최대 중첩'+(Number.isFinite(cycle.caps?.Focus)?'('+cycle.caps.Focus+'개)':'')+'을 모으면 쿨타임이 끝난 뒤 축복을 소모해 발동합니다.'+timing+
        ' 준비 '+build.ss14Inputs.theaCycle.warmup+'초 뒤 '+build.ss14Inputs.theaCycle.seconds+'초 동안 은총 상태별 대미지를 합산합니다.'});
    if (cycle.maxBoons===2) lines.push({name:'은총 동시 유지',setting:value(report.theaAverage?.doubleUptime),assumed:value(cycle.doubleUptime),
      method:'두 은총의 지속 시간이 겹치는 구간에 양쪽 효과를 적용합니다.'});
    if (build.ss14Inputs.theaEvents?.igniteEnabled && Number.isFinite(cycle.igniteUptime))
      lines.push({name:'점화',setting:value(report.theaAverage?.igniteUptime),assumed:value(cycle.igniteUptime),
        method:'점화를 부여한 뒤 만료 전에 다시 부여하면 유지됩니다. 적용 중인 점화의 대미지를 시간에 따라 합산합니다.'+
          damageContribution(estimate,'igniteDps')});
    if (build.ss14Inputs.theaEvents?.numbedEnabled && Number.isFinite(cycle.numbedUptime))
      lines.push({name:'마취',setting:value(report.theaAverage?.numbedUptime),assumed:value(cycle.numbedUptime),
        method:'마취를 부여하고 만료 전에 갱신합니다. 각 번개 대미지에 그 시점의 마취 효과를 반영합니다.'});
    if (estimate.componentProjection.rows.some(r=>r.mechanics?.some(m=>m.kind==='thea-scorch'||m.kind==='elixir-scorch')) && Number.isFinite(cycle.scorchUptime))
      lines.push({name:'스코치',setting:value(report.theaAverage?.scorchUptime),assumed:value(cycle.scorchUptime),
        method:'스코치를 부여하는 효과가 유지되는 시간을 계산합니다. 스코치의 저항 감소는 입력 조건 DPS에만 반영합니다.'+damageContribution(estimate,'scorchDps')});
  }
  return lines;
}
