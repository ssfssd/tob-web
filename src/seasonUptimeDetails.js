import { blessingConditionValue, blessingLabel } from './seasonBlessings.js';
import { combatNumbedEnabled, theaCombatEnabled } from './seasonTheaCombatInputs.js';
import { isThea } from './seasonTheaRevelation.js';
import { seasonNumbedDamageRows } from './seasonDps.js';
import { PERIODIC_BURST_INPUT, periodicBurstLinks, readPeriodicBurstUptime } from './seasonSkillInputs.js';

export const uptimeFields = {
  dotUptime: ['지속 대미지', '효과가 끝나기 전에 같은 대상에게 다시 적용하면 100%를 유지할 수 있습니다. 지속 대미지 DPS에 유지율을 곱합니다.'],
  moduleDotUptime: ['모듈 지속 대미지', '대상이 지대 안에서 지속 대미지를 받는 시간 비율을 적용합니다. 여러 소환체는 대미지가 따로 적용되는 수만큼 반영합니다.'],
  minionUptime: ['소환체 공격', '대상을 소환체의 공격 범위 안에 유지하세요. 이 비율은 소환체의 직접 공격에 적용됩니다.'],
  moduleIgniteUptime: ['모듈 점화', '대상에게 소환체의 점화가 남아 있는 시간을 잽니다. 모듈 점화 DPS에 유지율을 곱합니다.'],
  coreUptime: ['클락워크 코어', '코어가 작동하는 시간을 잽니다. 초당 코어 발동 횟수에 유지율을 곱합니다.'],
};
const permafrostUptime = ['동토 지속 대미지', '동토가 대상에게 대미지를 준 시간의 비율을 적용합니다. 직접 시전한 한빙 지면과 겹친 시간은 한 번만 계산합니다.'];

const percent = v => Number.isFinite(v) ? v.toLocaleString('ko-KR',{maximumFractionDigits:2})+'%' : '미입력';
const count = v => v.toLocaleString('ko-KR',{maximumFractionDigits:2});
const onOff = v => v === 1 ? '활성' : v === 0 ? '비활성' : '미입력';
const korean = v => typeof v === 'string' && /[가-힣]/u.test(v) && !/\p{Script=Han}/u.test(v);
function damageContribution(report, field) {
  if (!report.fullDps.supported) return null;
  return report.fullDps.rows.reduce((sum,row)=>sum+(field==='numbed'
    ? seasonNumbedDamageRows(report.fullDps.scope,row.values).reduce((total,[,value])=>total+value,0)
    : row.values[field]??0),0);
}

export function compareSeasonUptimeChanges(before, after, metric) {
  const key=metric==='assumedDps'?'assumed':'setting';
  const damage=metric==='assumedDps'?'contribution':'inputContribution';
  const unit=(row)=>row.buffState?'state':row[key].endsWith('%')?'percent':row.timedReaping&&row[key].endsWith('회')?'count':null;
  const rows=(report)=>new Map((report.assumedDps?.uptimeDetails??[])
    .filter(row=>row.key).map(row=>[row.key,row]));
  const previous=rows(before), current=rows(after);
  return [...new Set([...current.keys(),...previous.keys()])].flatMap(id=>{
    const old=previous.get(id), row=current.get(id);
    if (!old||!row) {
      const present=old??row;
      const timedNumbed=id==='numbed'&&before[metric]?.scope==='ss14-thea-joint-combat'&&after[metric]?.scope==='ss14-thea-joint-combat';
      const reaping=id.startsWith('reaping:');
      const knownUptime=(id.startsWith('skill:')||timedNumbed)&&unit(present)==='percent';
      const hasKnownUptime=(knownUptime||reaping&&Number.isFinite(present[damage]))&&before[metric]?.supported&&after[metric]?.supported;
      if (!present.buffState&&!hasKnownUptime) return [];
      const absent=present.buffState?'미장착':'미적용';
      const missingDps=Number.isFinite(present[damage])?0:undefined;
      return [{name:present.name,from:old?.[key]??absent,to:row?.[key]??absent,
        fromDps:old?old[damage]:missingDps,toDps:row?row[damage]:missingDps,
        ...(present.buffState&&{buffState:true})}];
    }
    if (!unit(old)||unit(old)!==unit(row)) return [];
    const fromDps=old[damage], toDps=row[damage];
    const contributionChanged=Number.isFinite(fromDps)&&Number.isFinite(toDps)&&count(fromDps)!==count(toDps);
    return old[key]!==row[key]||contributionChanged ? [{name:row.name,from:old[key],to:row[key],fromDps,toDps,...(row.buffState&&{buffState:true})}] : [];
  });
}

export function describeUptime(build, report, estimate, skills, scenarioHeroCombat) {
  const windowUptime = (dps, row, fallback) => {
    if (!row?.dotWindows) return percent(fallback);
    if (Object.values(dps.dotWindowIssues??{}).some(indices=>indices.includes(row.rowIndex))) return '확인 필요';
    const {warmup,seconds}=build.ss14Inputs.theaCycle;
    const active=row.dotWindows.reduce((total,[start,stop])=>total+Math.max(0,Math.min(stop,warmup+seconds)-Math.max(start,warmup)),0);
    return percent(100*active/seconds);
  };
  const lines = skills.map(({name, rowIndex, actionIndex, actionName, field, saved, assumed, exclusive, duplicate}) => {
    const row = estimate.fullDps.rows.find(r=>r.rowIndex===rowIndex);
    const original = report.fullDps.rows.find(r=>r.rowIndex===rowIndex);
    const dot = field==='dotUptime';
    const permafrost = field==='permafrostUptime';
    const windowed = (dot || permafrost) && !!row?.dotWindows;
    const details = permafrost ? permafrostUptime : uptimeFields[field];
    const input=windowed?'dotWindows':field==='moduleDotUptime'?`moduleRate${actionIndex}`:field;
    const contribution = (scenario, entry) => {
      if (!scenario.fullDps.supported || !entry) return null;
      const {values}=entry;
      if (permafrost) return values.permafrostDps ?? null;
      if (dot && Number.isFinite(values.dotDps))
        return Math.max(0,values.dotDps-(values.igniteDps??0)-(values.scorchDps??0));
      if (field==='minionUptime') return values.minionHitDps ?? null;
      if (field==='moduleIgniteUptime') return values.moduleIgniteDps ?? null;
      if (field==='moduleDotUptime') return entry.moduleDotDpsByAction?.[actionIndex] ?? null;
      return null;
    };
    return {
      key:`skill:${rowIndex}:${row?.id}:${field}:${actionIndex??''}`,
      name:name+(duplicate?' · '+(rowIndex+1)+'번 칸':'')+' · '+(actionName?`${actionName} 유지율`:details[0]),
      setting:windowed?windowUptime(report.fullDps,original,saved):percent(saved),
      assumed:windowed?windowUptime(estimate.fullDps,row,assumed):percent(assumed),
      input:{edit:'dps-input',key:`${rowIndex}:${input}`},
      method:windowed?'측정 시간과 겹치는 적용 구간만 계산합니다.':duplicate&&assumed===undefined?'이 칸이 대미지를 준 시간의 비율을 입력하세요. 적용되지 않는 칸은 0%입니다.':exclusive?'겹친 시간을 실제 대미지가 적용된 한 칸에만 배정한 슬롯별 유지율을 사용합니다.':duplicate&&assumed===0?'중복 슬롯에 지정한 0%를 유지합니다.':details[1],
      contribution:contribution(estimate,row),
      inputContribution:contribution(report,original),
    };
  });
  const burst=periodicBurstLinks(estimate.components);
  if (burst.length) {
    const {interval,duration,value}=burst[0].mechanic;
    const state=selected=>selected===0?'미적용':selected!==100?'미정':burst.length>1?'중첩 확인 필요':`적용 · 공격·시전 속도 +${percent(value)}`;
    lines.push({key:'periodic-burst',name:'간헐적 폭발',buffState:true,
      setting:state(readPeriodicBurstUptime(build.ss14Inputs.dps)),assumed:state(100),
      input:{edit:'dps-input',key:PERIODIC_BURST_INPUT},
      method:`보조 대상 이동 스킬을 쓰면 ${count(interval)}초 간격으로 버프를 얻습니다. 다음 이동 스킬을 쓴 뒤 ${count(duration)}초 동안 속도가 증가합니다. DPS에는 선택한 순간의 속도를 반영합니다.`});
  }
  for (const row of estimate.fullDps.rows) {
    const original=report.fullDps.rows.find(item=>item.rowIndex===row.rowIndex);
    const timed=row.timedReaping||original?.timedReaping;
    if (!timed && row.reapingOverlap===undefined && original?.reapingOverlap===undefined) continue;
    const name=estimate.coupledSkills.rows.find(item=>item.rowIndex===row.rowIndex)?.name;
    if (!name) continue;
    const setting = entry => {
      const usage=entry?.timedReaping;
      if (usage) return `${count(usage.applied)}/${count(usage.events)}회`;
      return timed ? '확인 필요' : percent(entry?.reapingOverlap);
    };
    const contribution = (scenario,entry) => {
      if (!scenario.fullDps.supported || !Number.isFinite(entry?.values.reapingDps)) return null;
      return entry.values.reapingDps-(timed ? entry.values.igniteReapingDps??0 : 0);
    };
    lines.push({
      key:`reaping:${row.rowIndex}:${row.id}`,
      timedReaping:!!timed,
      name:`${name} · ${row.rowIndex+1}번 칸 · 수확 시 지속 대미지 적용`,
      setting:setting(original),
      assumed:setting(row),
      method:timed?'각 수확 시각에 적용 중인 스킬의 지속 대미지를 정산합니다. 횟수는 모의 계산 평균이며 점화·연소는 별도로 집계합니다.'
        :'수확에 성공한 횟수 중 이 지속 대미지도 적용 중이었던 비율입니다. 해당 효과의 수확 DPS에 이 비율을 곱합니다.',
      contribution:contribution(estimate,row),
      inputContribution:contribution(report,original),
    });
  }
  const originals = new Map(report.componentProjection.rows.flatMap(row=>(row.conditionControls??[]).map(c=>[c.key,c])));
  const heroes = new Set();
  for (const row of estimate.componentProjection.rows) {
    for (const c of row.conditionControls ?? []) {
      if (c.kind !== 'boolean') continue;
      if (c.timedNumbed) {
        const state=c.numbedMinimum>1?`마취 ${c.numbedMinimum}중첩 이상`:'마취 중';
        lines.push({name:row.name, setting:state, assumed:state,
          method:'대미지를 계산하는 시점의 마취 중첩으로 옵션 적용 여부를 판단합니다.'});
        continue;
      }
      const dynamic = estimate.theaAverage && blessingConditionValue(c,{Focus:0,Tenacity:0,Agility:0}) !== undefined;
      const method = [c.sourceText, row.detail, c.label].find(korean) ?? '한국어 원문 미제공';
      lines.push({name:row.name, setting:dynamic?'축복 주기':onOff(originals.get(c.key)?.value),
        assumed:dynamic?'축복 주기':c.automatic?'장착·중첩 조건에 따라 '+onOff(c.value):onOff(c.value),
        method:method+' · 조건이 충족된 동안 이 옵션을 계산합니다.'});
    }
    if (row.elixirState) {
      const automatic=isThea(build)&&build.ss14Inputs.theaCycle?.mode==='automatic';
      if(automatic&&theaCombatEnabled(build)){
        const timing=estimate.theaAverage?.elixirUptimes?.find(elixir=>elixir.i===row.elixirState.index);
        const original=report.theaAverage?.elixirUptimes?.find(elixir=>elixir.i===row.elixirState.index);
        lines.push({key:`elixir:${row.elixirState.index}:${row.itemId}`,name:row.name,setting:original?percent(original.uptime):'계산 보류',assumed:timing?percent(timing.uptime):'계산 보류',
          input:{edit:'thea-event',key:`elixir${row.elixirState.index}Interval`},
          method:(original?`${count(original.start)}초에 처음 사용하고 ${count(original.interval)}초마다 갱신합니다. 한 번 사용하면 ${count(original.duration)}초 동안 유지되며, 준비 시간을 뺀 측정 구간에서 활성 ${count(original.activeSeconds)}초를 반영합니다.`
            :'영약의 사용 간격, 첫 사용 시점, 지속 시간을 확인하세요.')
            +(timing?' 방어 전 DPS에는 측정 구간 내내 영약을 적용합니다.':'')});
        continue;
      }
      const original=report.componentProjection.rows.find(r=>r.path===row.path);
      const saved=original?.elixirState, key=`elixir:${row.elixirState.index}:uptime`;
      const fixedUptime=saved?.uptime===0||saved?.uptime===100;
      if(automatic){
        lines.push({key:`elixir:${row.elixirState.index}:${row.itemId}`,name:row.name,setting:percent(saved?.uptime),assumed:percent(row.elixirState.uptime),
          input:{edit:'extension-input',key},method:fixedUptime?'측정 구간 전체에 같은 영약 상태를 적용합니다.'
            :'측정 구간 중 일부에만 적용하려면 복합 발동에서 영약 시간표를 입력하세요.'});
        continue;
      }
      lines.push({key:`elixir:${row.elixirState.index}:${row.itemId}`,name:row.name, setting:Number.isFinite(saved?.uptime)?percent(saved.uptime):onOff(saved?.enabled), assumed:'활성 가정',
        ...(original?.extensionControls?.some(control=>control.key===key)&&{input:{edit:'extension-input',key}}),
        method:'영약 효과가 끝나기 전에 갱신하면 유지됩니다. 방어 전 계산은 활성 상태의 효과 배율을 사용합니다.'});
    }
    for (const key of row.heroControls ?? []) {
      if (heroes.has(key)) continue;
      const method={signal:'대상에게 기발 시그널이 적용된 동안 해당 특성 효과를 반영합니다.',
        boonActive:'첫 은총이 유지되는 동안 소모한 축복에 따른 효과를 반영합니다.',
        boonActiveSecond:'두 번째 은총이 유지되는 동안 소모한 축복에 따른 효과를 반영합니다.'}[key];
      if (!method || key !== 'signal' && build.ss14Inputs.theaCycle?.mode === 'automatic') continue;
      heroes.add(key);
      const active = scenarioHeroCombat?.[key];
      const name = key === 'signal' ? row.name : `신의 은총 · ${key === 'boonActive' ? '첫 번째' : '두 번째'}`;
      lines.push({name, setting:onOff(build.ss14Inputs.heroCombat?.[key]), assumed:active === 1 ? '활성 가정' : onOff(active), method});
    }
  }
  const cycle=estimate.theaAverage;
  if (cycle) {
    const value=v=>Number.isFinite(v)?percent(v):'계산 보류';
    const timing=Number.isFinite(cycle.duration)&&Number.isFinite(cycle.cooldown)
      ? ' 지속 '+cycle.duration.toLocaleString('ko-KR')+'초, 쿨타임 '+cycle.cooldown.toLocaleString('ko-KR')+'초.'+
        (cycle.cooldown>cycle.duration?' 즉시 재발동해도 '+(cycle.cooldown-cycle.duration).toLocaleString('ko-KR')+'초의 공백이 생깁니다.':' 다음 은총을 지속 시간 안에 발동하면 연속 유지됩니다.') : '';
    lines.push({key:'boon',name:'신의 은총', setting:value(report.theaAverage?.uptime), assumed:value(cycle.uptime),
      method:blessingLabel('Focus')+' 최대 중첩'+(Number.isFinite(cycle.caps?.Focus)?'('+cycle.caps.Focus+'개)':'')+'을 모으면 쿨타임이 끝난 뒤 축복을 소모해 발동합니다.'+timing+
        ' 준비 '+build.ss14Inputs.theaCycle.warmup+'초 뒤 '+build.ss14Inputs.theaCycle.seconds+'초 동안 은총 상태별 대미지를 합산합니다.'});
    if (cycle.maxBoons===2) lines.push({key:'double-boon',name:'은총 동시 유지',setting:value(report.theaAverage?.doubleUptime),assumed:value(cycle.doubleUptime),
      method:'두 은총의 지속 시간이 겹치는 구간에 양쪽 효과를 적용합니다.'});
    if (build.ss14Inputs.theaEvents?.igniteEnabled && Number.isFinite(cycle.igniteUptime))
      lines.push({key:'ignite',name:'점화',setting:value(report.theaAverage?.igniteUptime),assumed:value(cycle.igniteUptime),
        method:'점화를 부여한 뒤 만료 전에 다시 부여하면 유지됩니다. 적용 중인 점화의 대미지를 시간에 따라 합산합니다.',
        inputContribution:damageContribution(report,'igniteDps'),contribution:damageContribution(estimate,'igniteDps')});
    if (combatNumbedEnabled(build, estimate) && Number.isFinite(cycle.numbedUptime))
      lines.push({key:'numbed',name:'마취',setting:value(report.theaAverage?.numbedUptime),assumed:value(cycle.numbedUptime),
        method:'마취를 부여하고 만료 전에 갱신합니다. 각 번개 대미지에 그 시점의 마취 효과를 반영합니다.',
        inputContribution:damageContribution(report,'numbed'),contribution:damageContribution(estimate,'numbed')});
    if (estimate.componentProjection.rows.some(r=>r.mechanics?.some(m=>m.kind==='thea-scorch'||m.kind==='elixir-scorch')) && Number.isFinite(cycle.scorchUptime))
      lines.push({key:'scorch',name:'스코치',setting:value(report.theaAverage?.scorchUptime),assumed:value(cycle.scorchUptime),
        method:'스코치를 부여하는 효과가 유지되는 시간을 계산합니다. 스코치의 저항 감소는 입력 조건 DPS에만 반영합니다.',
        inputContribution:damageContribution(report,'scorchDps'),contribution:damageContribution(estimate,'scorchDps')});
  }
  return lines;
}
