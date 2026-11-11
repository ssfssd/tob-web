// Actual Spell Burst activations only. An Overload cast, a barrier hit and a
// burst repeat are not themselves evidence of a charge-consuming activation.
const kinds=['normal','overload'];
const fields=['ms','source','charges','before'];
const valid=(k,v)=>v===null || (k==='source'?kinds.includes(v):Number.isSafeInteger(v)&&v>=0&&v<=({ms:86400000,charges:1000,before:100})[k]);
export function validBingEvents(v) {
  return v===undefined || Array.isArray(v)&&v.length<=100&&v.every(e=>e&&Object.keys(e).length===4&&fields.every(k=>Object.hasOwn(e,k)&&valid(k,e[k])));
}
export function editBingEvents(inputs, edit) {
  const rows=inputs.bingBurstEvents??=[];
  if(edit.kind==='bing-event-add' && rows.length<100){rows.push({ms:null,source:null,charges:null,before:null});return;}
  if(!Number.isInteger(edit.rowIndex)||!rows[edit.rowIndex])throw Error('확인할 발동을 선택하세요.');
  if(edit.kind==='bing-event-remove')rows.splice(edit.rowIndex,1);
  else {
    const value=edit.value===''?null:edit.value;
    if(!fields.includes(edit.key)||!valid(edit.key,value))throw Error('발동 시각·충전 소모·직전 자원량을 확인하세요.');
    rows[edit.rowIndex][edit.key]=value;
  }
  if(!rows.length)delete inputs.bingBurstEvents;
}
export function bingRecovery(rule,events=[]) {
  if(!rule)return null;
  const result={rows:[],total:null,credited:null};
  if(!validBingEvents(events)||!events.length)return result;
  if(events.some((e,i)=>e.ms===null||!e.source||e.charges===null||i>0&&e.ms<events[i-1].ms)){
    result.problem='발동 시각과 종류, 실제 소모 충전을 시간순으로 입력하세요.';return result;
  }
  let previous=null, lastPossibleGate=0;
  const lastConfirmedBonus=new Map();
  for(const [i,e] of events.entries()){
    // Times are relative to the beginning of observation. Without a full
    // quiet interval even the first event has no verified ready state.
    const ready=e.ms-lastPossibleGate>=rule.intervalMs;
    const knownLocked=e.ms-(lastConfirmedBonus.get(e.source)??-Infinity)<rule.intervalMs;
    const simultaneous=previous?.ms===e.ms || events[i+1]?.ms===e.ms;
    const odd=e.charges%rule.group!==0, groups=Math.floor(e.charges/rule.group);
    const base=ready&&!simultaneous?rule.base:null;
    let extra=null, reason='';
    if(simultaneous)reason='동시 발동 순서 미확인';
    else if(!ready)reason=previous&&previous.source!==e.source?'일반·오버로드 간 1초 제한 공유 미확인':'1초 안의 기본 회복 적용 여부 미확인';
    if(!simultaneous && e.charges===0)extra=0;
    else if(!simultaneous && knownLocked)extra=0;
    else if(ready && !simultaneous && !odd && groups===1)extra=rule.perGroup;
    else if(odd){reason ||= '홀수 충전 소모가 다음 발동으로 이월되는지 미확인';}
    else if(groups>1){reason ||= '동일 발동의 여러 충전 묶음에 대한 1초 제한 적용 방식 미확인';}
    // A solitary odd consumption cannot be resolved from a partial recording.
    // Even consumption does not depend on how the prior odd remainder was handled.
    const gross=base!==null&&extra!==null?base+extra:null;
    const credited=e.before!==null&&e.before===rule.cap?0:gross!==null&&e.before!==null&&rule.cap!=null?Math.min(rule.cap-e.before,gross):null;
    const row={...e,base,extra,groupAmount:groups*rule.perGroup,gross,credited,reason};
    if(!knownLocked)lastPossibleGate=e.ms;
    if(extra>0)lastConfirmedBonus.set(e.source,e.ms);
    result.rows.push(row);previous=row;
  }
  for(const [key,field] of [['total','gross'],['credited','credited']])if(result.rows.every(r=>r[field]!==null))result[key]=result.rows.reduce((n,r)=>n+r[field],0);
  return result;
}
