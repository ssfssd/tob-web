import { manualResourceBalance } from './seasonDps.js';
import { ELIXIR_OVERLAP_KEY } from './seasonExtensions.js';

// Legacy first-skill recommendation metric. Full-build uptime is evaluated
// separately, with an observed overlap whenever both elixirs vary.
export function calculateElixirAverage(build, projection, calculateState) {
  const rows = projection.rows.filter(r => r.elixirState);
  const result = { supported: false, uptime: null, activeDps: null, inactiveDps: null, expectedDps: null, blockers: [],
    limitation: "영약 하나의 관측 유지율로 활성·비활성 상태의 최종 부분 DPS를 평균냅니다. 자동 충전 시뮬레이션·전체 빌드 DPS가 아니며 나머지 조건은 두 상태에서 같다고 가정합니다." };
  if (!rows.length) { result.blockers.push("선택 영약이 없습니다."); return result; }
  if (rows.length !== 1 || (build.skills?.elixirs ?? []).filter(s => s?.skillId).length !== 1) { result.blockers.push("여러 영약의 동시 활성 시간 분포를 알 수 없어 평균내지 않습니다."); return result; }
  const row = rows[0]; const state = row.elixirState;
  if (state.uptime === "" || state.enabled === "" || state.scale === "") result.blockers.push("영약의 활성 상태·효과 배율·관측 유지율을 확인하세요.");
  if (row.blockers.length || projection.rows.some(r => r.path.startsWith(`${row.path}.`) && r.blockers.length)) result.blockers.push("선택 영약 또는 재료의 미해석 효과가 있어 유지율 평균은 미지원입니다.");
  if (result.blockers.length) return result;
  result.uptime = state.uptime;
  for (const enabled of [0, 1]) {
    const input = structuredClone(build);
    input.ss14Inputs.extensionInputs[`elixir:${state.index}:active`].value = enabled;
    const report = calculateState(input);
    if (report.componentProjection.rows.some(r => (r.path === row.path || r.path.startsWith(`${row.path}.`)) && r.blockers.length))
      result.blockers.push("활성·비활성 상태의 영약·재료 조건을 모두 확인해야 합니다.");
    const value = report.offense.rows.find(r => r.rowIndex === 0)?.values.expectedDps;
    if (!Number.isFinite(value)) result.blockers.push("활성·비활성 상태 중 계산할 수 없는 DPS가 있습니다.");
    else result[enabled ? "activeDps" : "inactiveDps"] = value;
  }
  result.supported = !result.blockers.length;
  if (result.supported) result.expectedDps = result.activeDps * state.uptime / 100 + result.inactiveDps * (1 - state.uptime / 100);
  return result;
}

const damageFields=['dps','manualDps','spellBurstDps','repeatDps','heroDps','dotDps','reapingDps','netherDps','minionDps','fixedNumbedHitDps','fixedNumbedDotDps'];
const weighted=(states,read)=>states.every(({value})=>Number.isFinite(read(value)))
  ? states.reduce((sum,{value,weight})=>sum+read(value)*weight,0) : null;

function observedStates(varying) {
  if(!varying.length)return {times:[{active:[],weight:1}]};
  const a=varying[0].elixirState.uptime;
  if(varying.length===1)return {times:[{active:[0],weight:1-a/100},{active:[1],weight:a/100}]};
  const b=varying[1].elixirState.uptime;
  const field=varying[0].extensionControls.find(c=>c.key===ELIXIR_OVERLAP_KEY);
  const overlap=field?.value,{min,max}=field?.observedRange??{};
  if(!Number.isFinite(overlap)||overlap<min-1e-8||overlap>max+1e-8)
    return {reason:'두 영약 동시 활성 시간 비율 (%)을 허용 범위에서 입력하세요.'};
  // Observed joint uptime partitions the same measurement into four states.
  const joint=Math.min(max,Math.max(min,overlap));
  const shares=[[0,0,100-(a+b-joint)],[1,0,a-joint],[0,1,b-joint],[1,1,joint]];
  return {times:shares.filter(([, ,percent])=>percent>0).map(([left,right,percent])=>
    ({active:[left,right],weight:percent/100})),overlap:joint};
}

export function applyObservedElixirUptime(build,report,calculateState) {
  const observed=report.componentProjection.rows.filter(row=>Number.isFinite(row.elixirState?.uptime));
  if(!observed.length)return;
  const varying=observed.filter(({elixirState})=>elixirState.uptime>0&&elixirState.uptime<100);
  const original=report.fullDps;
  const {times,overlap,reason}=observedStates(varying);
  if(reason){
    report.fullDps={...original,supported:false,dps:null,rows:original.rows.map(row=>({...row,supported:false,
      values:{...row.values,...Object.fromEntries(damageFields.map(key=>[key,null]))}})),manualResources:null,
      blockers:[...new Set([...original.blockers,reason])]};
    return;
  }
  const states=times.map(({active,weight})=>{
    const input=structuredClone(build);
    for(const row of observed){
      const {index,uptime}=row.elixirState,key=`elixir:${index}:active`;
      const control=row.extensionControls.find(c=>c.key===key);
      (input.ss14Inputs.extensionInputs??={})[key]={value:active[varying.indexOf(row)]??Number(uptime===100),
        sourcePageSha256:control.sourcePageSha256,sourceFingerprint:control.sourceFingerprint};
    }
    return {value:calculateState(input).fullDps,weight,active};
  });
  const first=states[0].value;
  const sameRows=states.every(({value})=>value.rows.length===first.rows.length&&first.rows.every(row=>
    value.rows.some(r=>r.rowIndex===row.rowIndex&&r.id===row.id)));
  const supported=sameRows&&states.every(({value})=>value.supported);
  const rows=first.rows.map(row=>{
    const samples=states.map(({value,weight})=>({value:value.rows.find(r=>r.rowIndex===row.rowIndex&&r.id===row.id),weight}));
    const stable=(key)=>samples.every(({value})=>value?.[key]===row[key])?row[key]:null;
    return {...row,supported,blockers:[...new Set(samples.flatMap(({value})=>value?.blockers??[]))],
      manaPerUse:stable('manaPerUse'),lifePerUse:stable('lifePerUse'),
      manualManaPerSecond:weighted(samples,r=>r?.manualManaPerSecond),
      manualLifePerSecond:weighted(samples,r=>r?.manualLifePerSecond),
      values:{...row.values,manualRate:weighted(samples,r=>r?.values.manualRate),
        ...Object.fromEntries(damageFields.map(key=>[key,supported?weighted(samples,r=>r?.values[key]??0):null]))}};
  });
  const recovery=(first.manualResources?.recovery??[]).map(r=>({...r,value:weighted(states,
    value=>value.manualResources?.recovery.find(row=>row.id===r.id)?.value)}));
  report.fullDps={...first,supported,rows,dps:supported?weighted(states,value=>value.dps):null,
    scope:'ss14-observed-elixir-uptime',
    blockers:[...new Set(states.flatMap(({value})=>value.blockers).concat(sameRows?[]:['영약 상태에 따라 공격 스킬 구성이 달라 전체 DPS를 평균낼 수 없습니다.']))],
    manualResources:manualResourceBalance(rows,recovery,build.ss14Inputs.dps?.skills)};
  report.elixirUptime={supported,rows:observed.map(row=>({path:row.path,name:row.name,uptime:row.elixirState.uptime})),
    ...(varying.length===1&&{activeDps:states[1].value.dps,inactiveDps:first.dps}),
    ...(varying.length===2&&{overlap,states:states.map(({active,weight,value})=>
      ({active,uptime:100*weight,dps:value.dps,manaPerSecond:value.manualResources?.manaPerSecond}))})};
}
