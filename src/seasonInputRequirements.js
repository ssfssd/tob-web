// Group repeated calculation diagnostics by the place where the user can act.
// Keep every original diagnostic; grouping never changes calculation support.
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDotWindowRepairs, seasonDotWindowRole } from './seasonDps.js';
import { SEASON_HERO_COMBAT_FIELDS } from './seasonMechanicInputs.js';
import { SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';
import { THEA_EVENT_FIELDS } from './seasonTheaEvents.js';
import { THEA_SS14_ID } from './seasonHeroSelection.js';
import { iceCorrosionConditionMissing, iceCorrosionCountMissing, isRecentDamageCondition, recentDamageConflict, recentDamageMissing, SEAL_CONVERSION_UNRESOLVED } from './seasonSupport.js';
import { matchingNearbyEnemyCounts, nearbyEnemyCountInput, nearbyEnemyGroups } from './seasonEffectConditions.js';
import { ADDED_LIGHTNING_RANGE_ISSUE } from './seasonWeaponInputs.js';
import { MISSING_DESTINY_ROLL } from './seasonDestiny.js';
import { MISSING_MEMORY_ROLL } from './seasonMemoryRolls.js';
import { NUMBED_DOT_WINDOW_REQUIRED, VARIABLE_DOT_WINDOW_REQUIRED, BLESSING_DOT_WINDOW_REQUIRED, REVELATION_NUMBED_REQUIRED } from './seasonTheaCombatInputs.js';
const customOptions={ id:'custom', label:'사용자 옵션', section:'combat', role:'custom-options', pattern:/사용자 옵션 \d+/u };
const routes = [
  customOptions,
  { id: 'shotgun', label: '보조 스킬·반복 적중 조건', section: 'skills', pattern: /같은 적에 적중|반복 적중마다 누적 점프|적중 전 점프 횟수|후속 적중까지 걸린 시간/u },
  { id: "gear", label: "장비 옵션 수치", section: "gear", pattern: /장비 옵션 수치를 입력/u },
  { id: "log-review", label: "로그에 없는 구성 확인", section: "combat", role: "season-dps-input", pattern: /로그에 없는/u },
  { id: "traits", label: "히어로 특성·단계", type: "traits", pattern: /특성.*(?:선택|단계)|기본 특성/u },
  { id: "slates", label: "석판 옵션", section: "divinity", pattern: /신성의 일각|추락하는 별빛|석판.*옵션/u },
  { id: "attributes", label: "캐릭터 기본 수치", section: "combat", role: "season-character-input", pattern: /주 속성 수치|기본 힘|기본 민첩|기본 지혜/u },
  { id: "elixirs", label: "영약 조건", section: "skills", type: "extensions", role: "native-extension-conditions", pattern: /영약|재료|방황|불길 저주|오멘/u },
  { id: "modules", label: "모듈·소환체 조건", section: "skills", type: "extensions", role: "native-extension-conditions", pattern: /모듈|소환체|오라 범위|처형 대상/u },
  { id: "combat", label: "스킬·대상 전투 조건", section: "combat", role: "season-dps-input", pattern: /전투 입력|시전 시간 배분|대상 적중률|적 아머|유효.*저항|지속 대미지 유지율|적 심화 수치|DPS 공식|전체 DPS(?:를)? 산출/u },
];
export function inputDestinations(report,reason,dps=report?.fullDps) {
  const links=[];
  const slateInputs=(report?.componentProjection?.slateOptionInputs??[]).filter(input=>input.reason===reason);
  if(slateInputs.length)return slateInputs.map(({key,label})=>({section:'divinity',type:'slate-option',role:'slate-option-search',key,label}));
  if(reason.endsWith(MISSING_MEMORY_ROLL)){
    const slots=new Map();
    for(const row of report?.componentProjection?.rows??[]){
      if(reason!==MISSING_MEMORY_ROLL&&reason!==`${row.name}: ${MISSING_MEMORY_ROLL}`)continue;
      if(!row.blockers?.some(blocker=>blocker.reason===MISSING_MEMORY_ROLL))continue;
      const missing=row.memoryRollControls?.find(control=>control.value==='');
      if(!missing||slots.has(missing.index))continue;
      const index=missing.index;
      slots.set(index,{section:'hero',type:'memory',index,edit:'memory-roll',key:missing.key,label:`${[45,60,75][index]}레벨 추억 수치 입력`});
    }
    return [...slots.values()];
  }
  if(reason.endsWith(MISSING_DESTINY_ROLL))
    return (report?.componentProjection?.rows??[]).flatMap(row=>{
      if(reason!==MISSING_DESTINY_ROLL&&reason!==`${row.name}: ${MISSING_DESTINY_ROLL}`)return [];
      if(!row.blockers?.some(blocker=>blocker.reason===MISSING_DESTINY_ROLL))return [];
      const location=/^pact\.slots\.([0-2])\.(?:rings\.(innerRing[1-6]|midRing[1-3])|undeterminedFate\.slots\.([0-4]))$/u.exec(row.path);
      const missing=row.destinyRollControls?.find(control=>control.value==='');
      if(!location||!missing)return [];
      const [,position,ring,extra]=location;
      const index=Number(position);
      const label=ring?`${ring.startsWith('inner')?'내환':'중환'} ${ring.at(-1)}`:`미정 숙명 ${Number(extra)+1}`;
      return [{section:'pact',index,ring:ring??`extra-${extra}`,edit:'destiny-roll',key:missing.key,label:`정령 ${index+1} · ${label} 수치 입력`}];
    });
  if (/고정 스킬 소모 감소와 소모량 배율|현재 1회 MP·HP 소모를 다시 입력/u.test(reason))
    return (dps?.rows??[]).filter(row=>row.castCostObservation&&row.blockers?.includes(reason))
      .map(row=>({section:'combat',tab:'conditions',label:`스킬 ${row.rowIndex+1} 관측 소모 입력`,edit:'dps-input',key:`${row.rowIndex}:observedFinalManaCost`}));
  if(customOptions.pattern.test(reason))return [customOptions];
  if(reason.startsWith('두 영약 동시 활성 시간 비율'))
    return [{section:'combat',label:'영약 동시 활성 비율 입력',edit:'extension-input',key:'elixir:overlap'}];
  if(reason.startsWith('자동 은총의 영약 가동률'))
    return [...(report?.componentProjection?.rows??[]).flatMap(({elixirState})=>elixirState&&elixirState.uptime!==0&&elixirState.uptime!==100
      ? [{section:'combat',label:`영약 ${elixirState.index+1} 가동률 입력`,edit:'extension-input',key:`elixir:${elixirState.index}:uptime`}] : []),
    {section:'combat',label:'복합 발동 설정',edit:'thea-event',key:'combatMode'}];
  if(reason==='영약의 최종 효과 배율을 선택하세요.')
    return (report?.componentProjection?.rows??[]).flatMap(({elixirState,extensionControls=[]})=>{
      if(elixirState?.scale!=='')return [];
      const index=elixirState.index;
      const control=['netherIncludes','netherOtherEffect','scale'].map(field=>extensionControls.find(c=>
        c.key===`elixir:${index}:${field}`&&c.value==='')).find(Boolean);
      return control?[{section:'combat',label:`영약 ${index+1} 효과 배율 입력`,edit:'extension-input',key:control.key}]:[];
    });
  if(reason === '간헐적 폭발의 현재 적용 여부를 선택하세요.')
    return [{section:'combat',label:'간헐적 폭발 상태 선택',edit:'dps-input',key:'0:periodicBurstUptime'}];
  if (reason === ADDED_LIGHTNING_RANGE_ISSUE) return (dps?.rows ?? [])
    .filter(row => Number.isInteger(row.rowIndex) && row.blockers?.includes(reason))
    .map(row => ({section:'combat',label:`스킬 ${row.rowIndex+1} 추가 번개 범위 입력`,edit:'dps-input',key:`${row.rowIndex}:addedLightningMin`}));
  if(reason.includes('자동 은총과 균열 후속 적중을 함께 계산하려면'))
    return [{section:'combat',label:'복합 발동 설정',edit:'thea-event',key:'combatMode'}];
  if(reason === REVELATION_NUMBED_REQUIRED)
    return [{section:'combat',label:'마취 계산 켜기',edit:'thea-event',key:'numbedEnabled'}];
  if (reason.startsWith('고압전기의 마취는') && report?.components?.some(row => row.category === 'hero' && row.id === THEA_SS14_ID))
    return [{section:'combat', role:'season-thea-controls', label:'복합 발동 설정'}];
  if(/스킬의 무기 제한/u.test(reason)&&/메인 무기|서브 무기/u.test(reason)){
    const off=reason.includes('서브 무기');
    return [{section:'gear',index:off?1:0,label:off?'서브 무기 바꾸기':'메인 무기 바꾸기'}];
  }
  const add=(section,label,edit,key,extra={})=>links.push({section,label,edit,key,...extra});
  if(reason.includes(recentDamageConflict)){
    for(const component of report?.components??[]) {
      if(component.category!=='supports')continue;
      for(const {rowIndex,supportIndex,conditionControls} of component.calculations??[]) {
        const control=conditionControls?.find(c=>isRecentDamageCondition(c.key));
        if(control)add('skills',`스킬 ${rowIndex+1} · 보조 ${supportIndex+1} 조건 확인`,'support-condition',control.key,{index:rowIndex,supportIndex});
      }
    }
    return links;
  }
  const isSupportRoll = reason.includes('보조 옵션 수치를 표시된 범위에서 선택하세요.');
  const isRepeatTiming = reason.includes('각 후속 적중까지 걸린 시간(ms)을 순서대로 입력하세요.');
  const conditionKey = reason.includes('같은 대상에 적용된 부식 광선 수를 입력') ? /^beamTargetCount$/u
    : reason.includes('같은 적에 적중하는 횟수를 선택') ? /^sameTargetHits$/u
    : reason.includes('적중하기 전 점프 횟수를 선택') ? /^jumpsBeforeHit$/u
    : reason.includes('반복 적중마다 누적 점프 횟수를 선택') ? /^repeatJump-/u
    : reason.includes('보조 효과의 조건 충족 여부 또는 적용 수량을 선택') ? /^snapshot-/u
    : reason.includes(recentDamageMissing) ? /^recentDamage-/u
    : reason.includes(iceCorrosionConditionMissing) ? /^frostTerra$/u
    : reason.includes(iceCorrosionCountMissing) ? /^frostTerraCount$/u : null;
  if(isSupportRoll || isRepeatTiming || conditionKey) {
    for(const component of report?.components??[]) {
      if(component.category!=='supports')continue;
      for(const entry of component.calculations??[]) {
        if(isRepeatTiming ? !dps?.rows?.some(row=>row.rowIndex===entry.rowIndex&&row.blockers.includes(reason))
          : !entry.blockers.some(blocker=>reason.includes(blocker))) continue;
        const controls=isSupportRoll ? entry.controls??[] : entry.conditionControls??[];
        const delays=entry.mechanics?.find(mechanic=>mechanic.kind==='ice-lances-rebound')?.delaysMs;
        const invalidDelay=isRepeatTiming ? delays?.findIndex((ms,i)=>!Number.isInteger(ms)||ms<0||ms<delays[i-1]) : -1;
        const control=controls.find(c=>isSupportRoll ? !Number.isFinite(c.value)||c.value<c.min||c.value>c.max
          : isRepeatTiming ? c.key===`repeatDelayMs-${invalidDelay}` : conditionKey.test(c.key)&&c.value==='');
        if(control) add('skills',`스킬 ${entry.rowIndex+1} · 보조 ${entry.supportIndex+1} ${isSupportRoll?'수치':'조건'} 입력`,
          isSupportRoll?'support-roll':'support-condition',control.key,{index:entry.rowIndex,supportIndex:entry.supportIndex});
      }
    }
    return links;
  }
  if(reason.includes('장비 효과의 적용 조건을 선택하세요')) {
    const rows=report?.componentProjection?.rows??[];
    const legacyNumbed=rows.some(r=>r.conditionControls.some(c=>c.conditionGroup==='nether-numbed-stacks'));
    for(const row of rows) if(row.group==='gear' && row.name && reason.includes(row.name))
      for(const control of row.conditionControls) if(control.value===''){
        if(control.numbedMinimum>0&&!legacyNumbed&&!control.timedNumbed)
          add('combat','마취 중첩 입력','dps-input','enemy:numbedStacks',{tab:'conditions'});
        else if(nearbyEnemyGroups.includes(control.conditionGroup)){
          if(!links.some(link=>link.key===nearbyEnemyCountInput))add('combat','주변 적 수 선택',nearbyEnemyCountInput,nearbyEnemyCountInput);
        }else add('combat',control.label??'장비 효과 조건 입력','component-condition',control.key);
      }
  }
  if(reason.includes('같은 상태의 조건·중첩 입력이 서로 충돌합니다')){
    const nearby=(report?.componentProjection?.rows??[]).flatMap(row=>row.conditionControls)
      .filter(c=>nearbyEnemyGroups.includes(c.conditionGroup));
    if(nearby.length && !matchingNearbyEnemyCounts(nearby).length)add('combat','주변 적 수 다시 선택',nearbyEnemyCountInput,nearbyEnemyCountInput);
  }
  if(/어둠의 문 발동 레벨을 입력|눈부신 꽃 적용 여부를 선택/u.test(reason)) {
    for(const row of report?.componentProjection?.rows??[]) if(row.group==='gear' && row.name==='영혼의 주입')
      for(const control of row.conditionControls) if(control.value==='' && /어둠의 문|눈부신 꽃/u.test(control.label??''))
        add('combat',control.label,'component-condition',control.key);
  }
  for(const c of report?.components??[])for(const row of c.category==='gear'?c.calculations??[]:[]){
    const control=row.controls?.find(v=>v.sourceText&&reason.includes(v.sourceText)&&(v.value==null||v.value===''));
    if(control)add('gear',SEASON_GEAR_SLOT_LABELS[row.slotIndex]+' 옵션 입력','gear-roll',control.key,{index:row.slotIndex});
  }
  if(links.length)return links;
  if(/기본 크리티컬 수치를 직접 입력/u.test(reason))
    for(const row of report?.offense?.rows??[])if(Number.isInteger(row.rowIndex)&&row.blockers?.some(t=>reason.includes(t)||t.includes(reason)))add('combat','스킬 '+(row.rowIndex+1)+' 크리티컬 입력','offense-input',String(row.rowIndex));
  if(links.length)return links;
  const theaInput = Object.entries(THEA_EVENT_FIELDS).find(([,field]) =>
    reason === `${field.label}: 프로그램에서 값을 선택하세요.`);
  if (theaInput) {
    const [key,field]=theaInput;
    const label=/^elixir[01](?:Interval|Start|Duration)$/u.test(key)
      ? field.label.replace(/ \(초\)$/u,'')+' 입력' : '발동 조건 입력';
    return [{section:'combat',label,edit:'thea-event',key}];
  }
  if(reason.endsWith(SEAL_CONVERSION_UNRESOLVED)) {
    for(const row of report?.componentProjection?.rows??[]) {
      if(!row.isAura||!row.blockers.some(blocker=>blocker.reason===SEAL_CONVERSION_UNRESOLVED))continue;
      const control=row.conditionControls.find(c=>c.conditionGroup===`nether-buff-${row.buffSkill}`);
      if(control) add('skills',row.name+' 오라 설정','component-condition',control.key,{index:row.buffSkill});
    }
    return links;
  }
  if(reason.startsWith('스킬 에너지 한도 초과'))
    return [{section:'skills',role:'skill-catalog-toggle',label:'스킬 연결판에서 보조 칸 조정'}];
  if(/시전 MP 부족|MP 봉인 합이 100%를 초과/u.test(reason)) {
    for(const row of report?.componentProjection?.rows??[])if(row.isAura&&row.effects.some(e=>e.stat==='sealed_mana_percent'&&e.value>0))
      for(const control of row.conditionControls.filter(c=>c.key.endsWith(`:nether-buff-${row.buffSkill}`)&&c.value===1))
        add('skills',row.name+' 오라 설정','component-condition',control.key,{index:row.buffSkill});
    for(const row of dps?.manaReservations??report?.character?.manaReservations??[]) {
      if(Number.isInteger(row.supportIndex)&&!row.blocked&&row.applied>0)
        add('skills',row.name+' 보조 편집',undefined,undefined,{index:row.rowIndex,supportIndex:row.supportIndex});
    }
    if (links.length) return links;
  }
  if (/시전 (?:MP|HP) 부족/u.test(reason)) {
    return (dps?.rows??[]).filter(row=>row.blockers?.includes(reason)).map(row=>({
      tab:'calculation',index:row.rowIndex,role:'selected-skill-resource-cost',label:'스킬 '+(row.rowIndex+1)+' 시전 비용 보기',
    }));
  }
  if (reason.startsWith('채널링의 MP 차감 시각') || reason.startsWith('채널링 MP 차감과 다른 행동')) {
    const times = (dps?.rows ?? []).filter(row=>row.channelCost && row.manaPerUse>0
      && (reason.startsWith('채널링의 MP 차감 시각') ? !row.channelCost.times && row.channelCost.rate!==0 : row.channelCost.times?.length))
      .map(row=>({tab:'conditions',label:`스킬 ${row.rowIndex+1} 채널링 차감 시각 입력`,edit:'dps-input',key:`${row.rowIndex}:channelCostTimes`}));
    return [...times,{section:'combat',label:'MP 소모율 입력',edit:'thea-event',key:'manaRate'}];
  }
  if(reason.includes('초당 MP 소모율을 입력하세요.')) return [{section:'combat',label:'MP 소모율 입력',edit:'thea-event',key:'manaRate'}];
  if(reason.startsWith('스킬 시전 시간 배분의 합이 100%를 초과'))
    return [{tab:'conditions',role:'cast-share-allocation',label:'스킬별 시전 배분 수정'}];
  if(/^자동 은총에서 (?:동일 지속 스킬의 중첩|동토의 적용 구간)/u.test(reason))
    return [{section:'combat',label:'복합 발동 설정',edit:'thea-event',key:'combatMode'}];
  if(reason.startsWith('같은 지속 스킬의 수확 겹침 비율 합계')||reason.includes(SEASON_DPS_SKILL_FIELDS.reapingOverlap.label)){
    const overflow=reason.startsWith('같은 지속 스킬의 수확 겹침 비율 합계');
    const groups=report?.fullDps?.reapingAllocationGroups?.filter(group=>overflow?group.overflow:group.slots.some(slot=>slot.issue==='missing'))??[];
    if(groups.length){
      const destinations=groups.map(group=>({tab:'conditions',role:`reaping-allocation-${group.id}`,label:'슬롯별 수확 비율 배정'}));
      const separate=dps?.rows?.filter(row=>row.blockers.includes(reason)&&!groups.some(group=>group.slots.some(slot=>slot.rowIndex===row.rowIndex)))??[];
      return [...destinations,...separate.map(row=>({section:'combat',label:`스킬 ${row.rowIndex+1} 수확 겹침 입력`,edit:'dps-input',key:`${row.rowIndex}:reapingOverlap`}))];
    }
  }
  if(reason.startsWith('같은 지속 스킬의 수확 겹침 비율 합계'))
    return (dps?.reapingOverlapOverflow??[]).map(i=>({
      section:'combat',label:`스킬 ${i+1} 수확 겹침 입력`,edit:'dps-input',key:`${i}:reapingOverlap`,
    }));
  if([NUMBED_DOT_WINDOW_REQUIRED,VARIABLE_DOT_WINDOW_REQUIRED,BLESSING_DOT_WINDOW_REQUIRED].includes(reason)
    ||/동일 지속 스킬의 (?:중첩|적용 구간)|^지속 대미지 적용 구간은|^심화가 변하는 전투에서는 지속 대미지 적용 구간/u.test(reason)) {
    if(reason.includes('적용 구간')) {
      const affected=dps?.dotWindowIssues?.[reason]??[];
      const routed=new Set();
      if(reason.includes('측정 종료 시각')){
        const {overlaps,bounds,sameSlot}=seasonDotWindowRepairs(report);
        for(const conflict of overlaps.filter(conflict=>conflict.slots.every(index=>affected.includes(index)))){
          links.push({tab:'conditions',role:seasonDotWindowRole(conflict),label:`${conflict.start}–${conflict.stop}초 · ${conflict.slots.map(index=>index+1).join('·')}번 칸 겹침 배정`});
          for(const index of conflict.slots)routed.add(index);
        }
        for(const index of new Set(bounds.map(bound=>bound.rowIndex)))if(affected.includes(index)){
          links.push({tab:'conditions',role:`dot-window-bound-${index}`,label:`${index+1}번 칸 측정 범위 수정`});
          routed.add(index);
        }
        for(const index of sameSlot)if(affected.includes(index)){
          links.push({tab:'conditions',role:`dot-window-merge-${index}`,label:`${index+1}번 칸 겹친 구간 합치기`});
          routed.add(index);
        }
      }
      return [...links,...affected.filter(index=>!routed.has(index)).map(rowIndex=>({
        section:'combat',tab:'conditions',label:`스킬 ${rowIndex+1} 적용 구간`,edit:'dps-input',key:`${rowIndex}:dotWindows`,
      }))];
    }
    const confirm = reason.endsWith('슬롯별 유지율 배정을 확인하세요.');
    const affected = confirm ? dps?.dotExclusiveUnconfirmed : dps?.dotUptimeOverflow;
    const groups=report?.fullDps?.dotAllocationGroups?.filter(group=>group.slots.some(slot=>affected?.includes(slot.rowIndex)))??[];
    if(groups.length)return groups.map(group=>({tab:'conditions',role:`dot-allocation-${group.id}`,label:'슬롯별 유지율 배정'}));
    return (affected ?? []).map(index => ({
      section: 'combat', label: `스킬 ${index + 1} ${confirm ? '중복 제외 확인' : '유지율 입력'}`,
      edit: 'dps-input', key: `${index}:${confirm ? 'dotExclusive' : dps?.dotUptimeFields?.[index] ?? 'dotUptime'}`,
    }));
  }
  if(/공식 원문|미확인|해석 미완료|주력 스킬은 일반 장벽 폭발/u.test(reason))return [];
  for(const row of report?.componentProjection?.rows??[]){
    if(row.name && reason.includes(row.name)&&reason.includes('기본 옵션 수치')&&row.memoryControl)
      add('hero',row.name+' 수치 입력','memory-base',String(row.memoryControl.key),{type:'memory',index:Number(row.memoryControl.key)});
    for(const key of row.heroControls??[])if(reason.includes(SEASON_HERO_COMBAT_FIELDS[key]?.label))add('combat','발동 조건 입력','hero-combat',key);
    for(const c of row.conditionControls??[])if(c.label && reason.includes(c.label)){
      if(row.isAura&&c.conditionGroup===`nether-buff-${row.buffSkill}`)
        add('skills',row.name+' 오라 설정','component-condition',c.key,{index:row.buffSkill});
      else add('combat','효과 조건 입력','component-condition',c.key);
    }
  }
  for(const [key,def] of Object.entries(SEASON_DPS_ENEMY_FIELDS))if(reason.includes(def.label)&&(key!=='numbedStacks'||!links.length))
    add('combat',key==='affliction'?'대상 심화 입력':key==='numbedStacks'?'마취 중첩 입력':'대상 조건 입력','dps-input','enemy:'+key,
      key==='numbedStacks'?{tab:'conditions'}:{});
  const commandRow = dps?.observedCommandRow;
  if(Number.isInteger(commandRow) && reason.includes('스마트 웨폰에 적용할 현재 통솔 수치'))
    add('combat','현재 통솔 수치 입력','dps-input',commandRow+':command');
  if(reason.startsWith('스마트 웨폰 소환체 수 합계가 맵 상한')) {
    for(const row of dps?.rows??[]) if(row.syntheticTroop && Number.isInteger(row.rowIndex))
      add('combat','스킬 '+(row.rowIndex+1)+' 소환체 수','dps-input',row.rowIndex+':minionCount');
  }
  const contextualKey = reason.includes('소환 스킬 시전 시간 배분을 입력') ? 'useShare'
    : reason.startsWith('아이스링 처치 재발동의 대상 적중 횟수를 확인') ? 'repeatHits'
    : reason.startsWith('복합 계산의 스킬별 일반 시전 횟수를 선택') || reason.startsWith('일반 시전 횟수가 시전 배분·속도로 가능한 횟수를 초과') ? 'castRate'
    : reason.includes('채널링 회차가 수확 쿨타임을 충족하는지 확인할 수 없습니다. 관측값 입력을 선택하세요.') ? 'reapingMode'
    : reason.includes('소환체 수량 상한') ? 'minionCount' : null;
  for(const row of dps?.rows??[])for(const [key,def] of Object.entries(SEASON_DPS_SKILL_FIELDS)) {
    if(!Number.isInteger(row.rowIndex)||!(reason.includes(def.label)||key===contextualKey)
      ||!row.blockers?.some(t=>reason.includes(t)))continue;
    const dot=(report?.fullDps?.dotAllocationGroups??[]).some(group=>group.slots.some(slot=>
      slot.rowIndex===row.rowIndex&&slot.field===key));
    const quickField=key==='useShare'?'시전 시간 배분':key==='hitChance'?'대상 적중률':null;
    const label=quickField??(key==='dotUptime'||key==='permafrostUptime'?'유지율':'조건');
    add('combat','스킬 '+(row.rowIndex+1)+' '+label+' 입력',
      'dps-input',row.rowIndex+':'+key,dot||quickField&&row.rowIndex<5?{tab:'conditions'}:{});
  }
  if(links.length)return links.filter((l,i)=>links.findIndex(v=>v.key===l.key&&v.index===l.index)===i);
  if(/주력 스킬을 선택/.test(reason))return [{section:'skills',index:0,label:'주력 스킬 선택'}];
  if(/기본 크리티컬.*입력/.test(reason))return [{section:'combat',role:'native-critical-input',label:'기본 크리티컬 입력'}];
  const route=routes.find(r=>r.pattern.test(reason));
  if(route&&/입력|선택|확인하세요/.test(reason))return [{...route}];
  return [];
}
export function seasonInputRequirements(report) {
  const groups = new Map();
  for (const diagnostic of new Set(report?.fullDps?.blockers ?? [])) {
    const route = routes.find(r => r.pattern.test(diagnostic)) ?? { id: "effects", label: "효과·조건 확인", section: "combat" };
    if (!groups.has(route.id)) groups.set(route.id, { ...route, diagnostics: [] });
    groups.get(route.id).diagnostics.push(diagnostic);
  }
  return [...groups.values()];
}
