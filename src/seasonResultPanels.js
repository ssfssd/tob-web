import { SEASON_ADVISOR_METRICS, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDpsSkillFieldKeys, seasonDpsSkillFieldDefinition, hasSeasonDpsConditionOverrides } from './seasonDps.js';
import { labeledGearRolls, renderNearbyEnemyField, renderSeasonDpsField, renderFixedNumbedField, usesTargetNumbedInput, SEASON_DPS_PARTS } from './seasonWorkspaceView.js';
import { nearbyEnemyGroups } from './seasonEffectConditions.js';
import { blessingConditionValue, boundBlessingStacks } from './seasonBlessings.js';
import { inputDestinations } from './seasonInputRequirements.js';
import { renderTrainingDummyPicker } from './seasonTrainingDummy.js';
import { SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';
import { UPGRADE_GROUPS, GEAR_UPGRADE_SOURCES } from './seasonUpgradeRanking.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { seasonSupportKoreanCard } from './seasonSupport.js';
import { normalizeBuild } from './engine.js';
import { effectSourceLabel, excludedSeasonHitRoutes } from './seasonEffectSources.js';
import { seasonSkillCalculationLevel, seasonSkillSlotCalculation } from './seasonSkillLevels.js';
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { DUAL_WIELD_ATTACK_SOURCE } from './seasonWeaponInputs.js';
import { seasonWeaponRestrictionIssue } from './seasonWeaponRestrictions.js';
import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { SEASON_STAT_LABELS } from './seasonNumericStats.js';
import { renderResourceChanges } from './seasonEditorTools.js';
import { hasPeriodicBurstSupport, PERIODIC_BURST_INPUT, readPeriodicBurstUptime } from './seasonSkillInputs.js';

const esc = v => String(v ?? '').replace(/[&<>"']/gu, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const number = v => Number.isFinite(v) ? v.toLocaleString('ko-KR', { maximumFractionDigits:2 }) : '미지원';
const button = (label, action, attrs = '') => `<button type="button" data-ss14-action="${action}" ${attrs}>${label}</button>`;
const edit = (label, role) => button(label, 'requirement', `data-section="combat" data-focus-role="${role}"`);
export const RESULT_TABS = [['stats','수치'], ['calculation','계산'], ['conditions','조건'], ['analysis','분석']];

const deltaText = r => `${r.delta > 0 ? '+' : ''}${number(r.delta)}${r.percent === null ? '' : ` (${r.percent > 0 ? '+' : ''}${number(r.percent)}%)`}`;
export function renderReasons(s,reasons,dps=s.report.fullDps) {
  const unique=new Map();
  for(const text of reasons){
    const match=/^(기준|현재): (.*)$/u.exec(text);
    const reason=match?.[2]??text;
    if(!unique.has(reason))unique.set(reason,new Set());
    unique.get(reason).add(match?.[1]??'');
  }
  const inputs=new Map(),rest=[];
  for(const [reason,sides] of unique){
    const links=sides.size===1&&sides.has('기준')?[]:inputDestinations(s.report,reason,dps);
    if(links.some(link=>Number.isInteger(link.supportIndex))&&[...unique].some(([other,scope])=>
      other.endsWith(': '+reason)&&scope.size===sides.size&&[...scope].every(side=>sides.has(side))))continue;
    const side=sides.size===1&&!sides.has('')?[...sides][0]+' · ':'';
    let message=reason;
    const rollLink=links.find(link=>link.edit==='gear-roll');
    if(rollLink&&reason.startsWith('장비 옵션 수치를 입력하세요: ')){
      for(const component of s.report.components.filter(row=>row.category==='gear')){
        const entry=component.calculations?.find(row=>row.slotIndex===rollLink.index);
        const roll=entry&&labeledGearRolls(component,entry).find(row=>row.key===rollLink.key);
        if(roll){message=roll.label+' 수치를 입력하세요.';break;}
      }
    }
    const text=side+message;
    if (!links.length) {rest.push(`<li>${esc(text)}</li>`);continue;}
    const key=JSON.stringify(links.map(l=>JSON.stringify([l.section,l.index,l.supportIndex,l.type,l.role,l.edit,l.key])).sort());
    if(!inputs.has(key))inputs.set(key,{links,messages:new Set()});
    inputs.get(key).messages.add(text);
  }
  const items=[...inputs.values()].map(({links,messages})=>{
    const [first,...other]=messages;
    const actions=links.map(l=>l.tab ? button(esc(l.label),'result-tab',`data-tab="${esc(l.tab)}" data-focus-role="${esc(l.role)}" data-field="${esc(l.edit)}" data-field-key="${esc(l.key)}"`)
      : button(esc(l.label),'requirement',`data-section="${esc(l.section??'hero')}" data-index="${l.index??''}" data-support="${l.supportIndex??''}" data-type="${esc(l.type)}" data-focus-role="${esc(l.role)}" data-field="${esc(l.edit)}" data-field-key="${esc(l.key)}"`)).join('');
    const details=other.length?`<details><summary>같은 입력과 관련된 사유</summary><ul>${other.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></details>`:'';
    return `<li>${esc(first)} ${actions}${details}</li>`;
  });
  return `${items.length?`<ul aria-label="입력할 항목">${items.join('')}</ul>`:''}${rest.length?`<details><summary>추가 확인 ${rest.length}건</summary><ul>${rest.join('')}</ul></details>`:''}`;
}
export function renderEditDpsComparison(s, compact = false) {
  const comparison = s.editComparison;
  if (!comparison || compact && !comparison.changed) return '';
  if (s.pending.size) return '<section data-role="native-edit-comparison" hidden></section>';
  const assumed = preferredSeasonDpsMetric(s.report)==='assumedDps' && comparison.assumed;
  const {baseline,previous} = assumed || comparison;
  const metricLabel = assumed ? '방어 전 DPS' : 'DPS';
  const comparisonText = value => value.supported ? deltaText(value)
    : value.encounterMatches === false ? '전투 조건 변경' : '비교 보류';
  if (compact && baseline.supported && Math.abs(baseline.delta) < 0.005) return '';
  if(compact && !baseline.supported && !previous?.supported) {
    const hasDps = s.report.fullDps.supported || Number.isFinite(baseline.value) || Number.isFinite(baseline.baseValue) || Number.isFinite(previous?.baseValue)
      || baseline.encounterMatches===false && s.report.assumedDps?.supported;
    return hasDps ? `<section class="native-edit-comparison is-compact" data-role="native-edit-comparison" aria-label="편집 전후 DPS 비교">${button(baseline.encounterMatches===false?'전투 조건 변경':'비교 보류 이유', 'result-tab', 'data-tab="analysis" data-show-reasons="true"')}</section>` : '';
  }
  return `<section class="native-edit-comparison${compact ? ' is-compact' : ''}" data-role="native-edit-comparison" aria-label="편집 전후 DPS 비교"${s.pending.size ? ' hidden' : ''}>
    ${compact ? '' : '<h2>편집 전후 자동 비교</h2>'}
    ${comparison.changed ? `<p>기준 대비 <strong class="${baseline.supported ? baseline.delta > 0 ? 'is-increase' : baseline.delta < 0 ? 'is-decrease' : '' : ''}">${comparisonText(baseline)}</strong></p>
      ${!compact && previous ? `<p class="native-stat-note">직전 변경 ${comparisonText(previous)}</p>` : ''}` : ''}
    ${compact ? (!baseline.supported ? button('비교 보류 이유', 'result-tab', 'data-tab="analysis" data-show-reasons="true"') : '')
      : `<dl class="native-condition-values"><div><dt>기준 ${metricLabel}</dt><dd>${number(baseline.baseValue)}</dd></div><div><dt>현재 ${metricLabel}</dt><dd>${number(baseline.value)}</dd></div></dl>
        ${!baseline.supported ? `<details${s.showComparisonReasons?' open':''}><summary>기준 비교 보류 이유</summary>${renderReasons(s,baseline.reasons)}</details>` : ''}
        ${previous && !previous.supported && JSON.stringify(previous.reasons)!==JSON.stringify(baseline.reasons) ? `<details><summary>직전 변경 비교 보류 이유</summary>${renderReasons(s,previous.reasons)}</details>` : ''}
        ${button('현재 빌드를 비교 기준으로', 'reset-comparison')}
        <details><summary>비교 기준</summary><p>빌드를 열었을 때의 구성이 기준입니다. 저장해도 유지되며, 빌드를 다시 열면 새 기준이 됩니다.</p></details>`}
  </section>`;
}

function effectConditionFields(s) {
  const fields = [];
  const automaticFields = [];
  const nearby = [];
  const componentFields = new Map();
  const stacks = boundBlessingStacks(s.document.targetBuild);
  const targetNumbed=usesTargetNumbedInput(s.document.targetBuild,s.report);
  function add(control, owner, kind, attrs, automatic, detail, sources = []) {
    const value = control.value ?? '';
    const expression = /[가-힣]/u.test(control.expression ?? '') && !/\p{Script=Han}/u.test(control.expression) ? control.expression : '';
    const lifeState = { 'self-low-life': '위중 상태', 'at Full Life': '최대 HP 상태' }[control.conditionGroup];
    const label = control.label?.replace(' (0: 미충족, 1: 충족)', '') || (lifeState ? lifeState + (control.inverted ? ' 아님' : '') : '')
      || expression || (control.kind === 'count' ? '수량' : '조건 충족 여부');
    const description = detail && /[가-힣]/u.test(detail) && !/\p{Script=Han}/u.test(detail) ? detail : '';
    const grouped = sources.length > 1;
    const attributes = `data-season-edit="${kind}" data-key="${esc(control.key)}" ${attrs} aria-label="${esc(grouped ? label : owner + ' · ' + label)}"`;
    const boolean = control.kind === 'boolean';
    const options = [['','미입력'],[0,'미충족'],[1,'충족']];
    const text = boolean ? options.find(([v]) => v === value)?.[1] : value;
    const heading = grouped
      ? `<details><summary>${esc(label)}</summary><ul>${sources.map(({owner,path,group})=>`<li>${esc(effectSourceLabel(path,group))} · ${esc(owner)}</li>`).join('')}</ul></details>`
      : `<strong>${esc(owner)}</strong>${description ? `<details><summary>${esc(label)}</summary><p>${esc(description)}</p></details>` : `<small>${esc(label)}</small>`}`;
    (automatic ? automaticFields : fields).push(`<div class="dock-effect-condition"><div>${heading}</div>
      ${automatic ? `<output>${control.timedNumbed?(control.numbedMinimum>1?`마취 ${control.numbedMinimum}중첩 이상에서 적용`:'마취 중 적용'):control.observedNumbed!==undefined?`마취 ${control.observedNumbed}중첩 · ${esc(text)}`:'자동 · '+esc(text === '' || text == null ? '미입력' : text)}</output>`
        : boolean ? `<select ${attributes}>${options.map(([v,t])=>`<option value="${v}"${v === value ? ' selected' : ''}>${t}</option>`).join('')}</select>`
        : `<input type="number" ${attributes} min="${control.allowZero ? 0 : control.min ?? 0}" max="${control.max}" step="${control.integer === false ? 'any' : 1}" value="${esc(value)}" placeholder="미입력">`}</div>`);
  }
  for (const row of s.report.componentProjection.rows) {
    for (const c of row.conditionControls ?? []) {
      if(targetNumbed&&c.numbedMinimum>0&&c.value==='')continue;
      const automatic = c.automatic || blessingConditionValue(c, stacks) !== undefined;
      if(!automatic && nearbyEnemyGroups.includes(c.conditionGroup)){
        nearby.push(c);
        continue;
      }
      // The component editor already updates all bindings in a condition group.
      // Keep different answers, ranges and opposite predicates separately editable.
      const key = JSON.stringify([c.conditionGroup ?? c.key, !!c.inverted, !!automatic, c.kind,
        c.min, c.max, c.allowZero, c.integer, c.value, automatic ? row.path : null]);
      if (!componentFields.has(key)) componentFields.set(key,{control:c,row,automatic,sources:new Map()});
      componentFields.get(key).sources.set(row.path,{owner:row.name,path:row.path,group:row.group});
    }
  }
  for (const {control,row,automatic,sources} of componentFields.values())
    add(control,row.name,'component-condition','',automatic,row.detail,[...sources.values()]);
  if(nearby.length)fields.unshift(renderNearbyEnemyField(nearby));
  for (const component of s.report.components.filter(c => c.category === 'supports')) {
    for (const entry of component.calculations ?? []) {
      for (const c of entry.conditionControls ?? []) {
        add(c, `${component.name} · 스킬 ${entry.rowIndex+1} / 보조 ${entry.supportIndex+1}`, 'support-condition',
          `data-row="${entry.rowIndex}" data-support="${entry.supportIndex}"`, c.automatic);
      }
    }
  }
  return fields.length || automaticFields.length ? `<section class="dock-effect-conditions">${fields.length?'<h2>효과 조건</h2>':''}${fields.join('')}
    ${automaticFields.length ? `<details data-role="automatic-effect-conditions"><summary>자동 적용 효과</summary>${automaticFields.join('')}</details>` : ''}</section>` : '';
}

function skillConditionKeys(s, index, id) {
  if (index >= 5 || !s.report.coupledSkills.rows.some(row => row.rowIndex === index && row.id === id)) return [];
  const entry = seasonSkillSlotCalculation(s.report,index);
  if (!entry || entry.mechanics?.some(m => m.kind === 'utility-skill')) return [];
  return seasonDpsSkillFieldKeys(entry,id,s.document.targetBuild).filter(key => SEASON_DPS_SKILL_FIELDS[key]);
}

export function renderResultConditions(s) {
  const inputs = s.document.targetBuild.ss14Inputs;
  const build = s.document.targetBuild;
  const hasManualConditions = hasSeasonDpsConditionOverrides(inputs.dps)
    || Object.keys(inputs.componentConditions ?? {}).length > 0
    || Object.values(inputs.supports ?? {}).some(binding => Object.keys(binding.conditions ?? {}).length > 0);
  const shareOverflow=s.report.fullDps.manualResources?.shareOverflow;
  const periodicBurst=hasPeriodicBurstSupport(s.report.components);
  const sharedDots=s.report.fullDps.dotAllocationGroups??[];
  const sharedReaping=s.report.fullDps.reapingAllocationGroups??[];
  const allocations=sharedDots.map(({id,total,slots,overflow})=>{
    const name=SS14_CARDS.records[id]?.name??'같은 지속 대미지';
    const applied=slots.filter(slot=>slot.uptime>0);
    const incomplete=slots.some(slot=>slot.uptime===null);
    const confirmed=!overflow&&!incomplete&&applied.length>1&&applied.every(slot=>slot.confirmed);
    return `<fieldset><legend>${esc(name)} · 슬롯별 유지율</legend><p tabindex="-1" data-role="dot-allocation-${esc(id)}">${incomplete?'입력된 ':''}합계 ${number(total)}% / 최대 100%${confirmed?' · 배정 확인됨':''}</p>
      ${slots.map(({rowIndex,itemId,field,uptime})=>renderSeasonDpsField(`${rowIndex}:${field}`,{...SEASON_DPS_SKILL_FIELDS[field],
        label:`${rowIndex+1}번 칸 · ${SS14_CARDS.records[itemId]?.name??name} 유지율 (%)`},uptime??'','지속 대미지 배정')).join('')}
      ${confirmed||applied.length<2?'':button('겹친 시간을 한 칸에만 배정했어요','confirm-dot-allocation',`data-key="${esc(id)}"${overflow||incomplete?' disabled':''}`)}</fieldset>`;
  }).join('');
  const reapingAllocations=sharedReaping.map(({id,total,slots})=>{
    const name=SS14_CARDS.records[id]?.name??'같은 지속 대미지';
    const incomplete=slots.some(slot=>slot.issue);
    return `<fieldset><legend>${esc(name)} · 슬롯별 수확 비율</legend><p tabindex="-1" data-role="reaping-allocation-${esc(id)}">${incomplete?'확인된 비율 ':''}합계 ${number(total)}% / 최대 100%</p>
      ${slots.map(({rowIndex,itemId,overlap})=>renderSeasonDpsField(`${rowIndex}:reapingOverlap`,{...SEASON_DPS_SKILL_FIELDS.reapingOverlap,
        label:`${rowIndex+1}번 칸 · ${SS14_CARDS.records[itemId]?.name??name} 수확 시 적용 비율 (%)`},overlap??'','수확 배정')).join('')}</fieldset>`;
  }).join('');
  const skillFields = s.report.coupledSkills.rows.filter(row => row.rowIndex < 5).map(row => {
    const component = s.report.components.find(c => c.category === 'skills' && c.id === row.id);
    const keys = skillConditionKeys(s,row.rowIndex,row.id).filter(key=>!sharedDots.some(group=>
      group.slots.some(slot=>slot.rowIndex===row.rowIndex&&(key===slot.field||key==='dotExclusive')))
      && !(key==='reapingOverlap'&&sharedReaping.some(group=>group.slots.some(slot=>slot.rowIndex===row.rowIndex))));
    if (!keys.length) return '';
    const minionMaximum = s.report.fullDps.rows.find(entry => entry.rowIndex === row.rowIndex)?.minionMaximum;
    const sharedCommand = s.report.fullDps.observedCommandRow === row.rowIndex;
    const expanded=shareOverflow&&inputs.dps?.skills?.[row.rowIndex]?.useShare>0;
    return `<details data-role="dock-skill-conditions-${row.rowIndex}"${expanded?' open':''}><summary>${row.rowIndex === 0 ? '주력' : '액티브 ' + (row.rowIndex+1)} · ${esc(component.name)}</summary>
      ${keys.map(key=>renderSeasonDpsField(`${row.rowIndex}:${key}`, seasonDpsSkillFieldDefinition(row.id,key,row.terraChargeMaximum), inputs.dps?.skills?.[row.rowIndex]?.[key], '조건 탭', {minionMaximum,sharedCommand})).join('')}
      ${button('스킬 계산 보기','result-tab',`data-tab="calculation" data-index="${row.rowIndex}" data-focus-role="calculation-skill"`)}</details>`;
  }).join('');
  return `<section class="native-result-conditions" aria-label="적용 중인 전투 조건">
    ${hasManualConditions ? button('대상·스킬·효과 조건 초기화','clear-combat-conditions') : ''}
    ${renderTrainingDummyPicker(inputs.dps?.enemy)}
    ${Number.isFinite(s.report.fullDps.fixedErosionResistance)?`<p>대상 부식 저항 ${number(s.report.fullDps.fixedErosionResistance)}% 고정 적용 중</p>`:''}
    <details data-role="dock-enemy-defense"><summary>아머·저항 직접 입력</summary><dl class="native-condition-values">${Object.entries(SEASON_DPS_ENEMY_FIELDS).filter(([key])=>key!=='numbedStacks').map(([key, def]) =>
      `<div><dt><label for="dock-enemy-${key}">${esc(def.label)}</label></dt><dd><input id="dock-enemy-${key}" type="number" step="any" min="${def.min}" max="${def.max}" data-season-edit="dps-input" data-key="enemy:${key}" value="${esc(inputs.dps?.enemy?.[key])}" placeholder="미입력"></dd></div>`).join('')}</dl></details>
    ${renderFixedNumbedField(build,s.report,inputs.dps?.enemy?.numbedStacks)}
    ${periodicBurst ? renderSeasonDpsField(PERIODIC_BURST_INPUT,SEASON_DPS_SKILL_FIELDS.periodicBurstUptime,readPeriodicBurstUptime(inputs.dps),'조건 탭') : ''}
    ${allocations}
    ${reapingAllocations}
    ${skillFields ? `${shareOverflow?`<p role="status">시전 배분 ${number(shareOverflow)}% / 최대 100%</p>`:''}<details data-role="dock-skill-conditions"${shareOverflow?' open':''}><summary>스킬 조건</summary>${skillFields}</details>` : ''}${effectConditionFields(s)}
    <details data-role="dock-more-conditions"><summary>추가 전투 조건</summary>
    ${edit('대상·스킬 조건 전체', 'season-dps-input')}${edit('기본 속성', 'season-character-input')}${edit('기본 크리티컬', 'native-critical-input')}${edit('축복 중첩', 'native-blessing-input')}
    ${inputs.theaCycle || s.report.theaAverage ? `<h2>티아1 은총</h2><p>${inputs.theaCycle?.mode === 'automatic' ? `자동 주기 평균 · ${number(inputs.theaCycle.seconds)}초` : '현재 상태 직접 설정'}</p>
      ${s.report.theaAverage ? `<p>은총 유지율: ${s.report.theaAverage.supported ? `${number(s.report.theaAverage.uptime)}%` : '미지원'}</p>` : ''}
      ${edit('은총·추가 발동 조건 편집', 'season-thea-controls')}` : ''}
    ${edit('영약·특수 효과', 'native-extension-input')}</details>
  </section>`;
}

function renderUpgradeRanking(s){
  const job=s.pending.size?null:s.upgrades;
  const group=s.upgradeGroup??'all';
  const replacement=group==='replacement';
  const equipment=replacement||group==='legendary';
  const source=s.upgradeSource??'all';
  const slots=(selected)=>[['all','전체 부위'],...SEASON_GEAR_SLOT_LABELS.map((n,i)=>[String(i),n])].map(([v,n])=>`<option value="${v}"${v===selected?' selected':''}>${esc(n)}</option>`).join('');
  const active=s.document.targetBuild.skills?.active??[];
  const damageRows=s.report[preferredSeasonDpsMetric(s.report)]?.rows;
  const skillReplacement=group==='skillReplacement';
  const skillAnalysis=group==='skills'||skillReplacement;
  const skillOptions=skillAnalysis?active.flatMap((row,i)=>
    row?.skillId&&damageRows?.some(d=>d.rowIndex===i&&d.id===row.skillId)
      ? [{id:String(i),label:`${i===0?'주력':'액티브 '+(i+1)} · ${s.report.components.find(c=>c.category==='skills'&&c.id===row.skillId)?.name??'한국어 이름 미제공'}`}]
      : []):[];
  const chosenSkill=skillOptions.some(row=>row.id===s.upgradeSkill);
  const skillUnavailable=skillReplacement?!chosenSkill:group==='skills'&&s.upgradeSkill!=null&&s.upgradeSkill!=='all'&&!chosenSkill;
  let content='';
  if(job?.busy)content=`<p role="status">계산 중 <span data-upgrade-progress>${job.checked} / ${job.total}</span></p>${button('계산 중지','rank-cancel')}`;
  else if(job?.error)content=`<p role="alert">${esc(job.error)}</p>`;
  else if(job?.reasons?.length)content=`<details data-role="analysis-ranking-blockers" open><summary>${group==='skills'&&s.upgradeSkill&&s.upgradeSkill!=='all'?'선택 스킬 분석 보류':'전체 DPS 비교 보류'}</summary>${renderReasons(s,job.reasons)}</details>`;
  else if(job?.impacts) {
    const metricLabel=job.metric==='assumedDps'?'방어 전 DPS':'전체 DPS';
    content=job.impacts.length?`<p>장착 중 ${metricLabel} <strong>${number(job.base)}</strong></p><ul class="upgrade-ranking">${job.impacts.map(row=>
      `<li>${button(esc(row.label+(row.name?' · '+row.name:'')),'inspect-gear',`data-index="${row.slotIndex}"`)}
      ${row.reasons.length?`<details><summary>비교 보류</summary>${renderReasons(s,row.reasons)}</details>`:
        `<div>해제 시 ${number(row.value)} · 기여 <strong>${row.delta>0?'+':''}${number(row.delta)} DPS</strong></div>`}</li>`).join('')}</ul>`:'<p>비교할 장착 방어구·장신구가 없습니다.</p>';
  }
  else if(job){
    const metricLabel=job.metric==='assumedDps'?'방어 전 DPS':'전체 DPS';
    const skillMetricLabel=job.metric==='assumedDps'?'선택 스킬 방어 전 DPS':'선택 스킬 DPS';
    const signed=n=>(n>0?'+':'')+number(n);
    const candidate=(r,index,label)=>`<strong>${esc(r.label)}</strong>${r.detail?`<div>${esc(r.detail)}</div>`:''}
      ${r.optionChanges?.length?`<details><summary>변경 ${r.optionChanges.length}건</summary><ul>${r.optionChanges.map(change=>`<li>${esc(change)}</li>`).join('')}</ul></details>`:''}
      ${r.skillImpact?`<div>${skillMetricLabel} ${number(r.skillImpact.base)} → <b>${number(r.skillImpact.value)}</b></div>
      <strong class="native-comparison-delta">${signed(r.skillImpact.delta)} DPS</strong>
      <div class="native-stat-note">${metricLabel} ${number(job.base)} → ${number(r.value)} (${signed(r.delta)})</div>`:
        `<div>${metricLabel} ${number(job.base)} → <b>${number(r.value)}</b></div><strong class="native-comparison-delta">+${number(r.delta)} DPS${r.percent==null?'':' (+'+number(r.percent)+'%)'}</strong>`}
      ${r.hypothetical?'':r.saved?(s.dirty?'사본 저장됨':button('저장된 사본 열기','open',`data-id="${esc(r.saved)}"`)):button('사본에 적용','rank-copy',`data-index="${index}" aria-label="${label} 사본에 적용"`)}`;
    const rows=job.rows.map((r,i)=>`<li>${candidate(r,i,(i+1)+'위')}</li>`).join('');
    const blockedSkills=job.blockedSkills?.map((row,index)=>`<li data-blocked-skill-name="${esc(row.label)}"><details><summary>${esc(row.label)}</summary>
      <ul>${row.reasons.map(reason=>`<li>${esc(reason.replace(/^현재: /u,''))}</li>`).join('')}</ul>
      ${row.canOpen?button('시험 사본 열기','rank-skill-trial',`data-index="${index}" aria-label="${esc(row.label)} 시험 사본 열기"`):''}</details></li>`).join('');
    const resources=job.resources?.map(r=>`<li><span>${esc(r.label)} · ${r.from} → ${r.to}<br><small>${metricLabel} ${number(r.fromDps)} → ${number(r.toDps)}</small></span><b>${signed(r.delta)} DPS</b></li>`).join('');
    const empty=equipment&&job.assembled?'한 부위만 바꿔 DPS가 오르는 후보 없음'
      :job.checked===0?'선택한 대상에 비교할 후보 없음':job.checked===job.blocked?'비교 가능한 후보 없음':(job.skillIndex!=null?skillMetricLabel:metricLabel)+'가 오르는 후보 없음';
    content=`<h3>${UPGRADE_GROUPS[group]} Top 20</h3>
      ${rows?'<ol class="upgrade-ranking">'+rows+'</ol>':`<p>${empty}</p>`}
      ${job.assembled?`<article class="upgrade-combination">${candidate(job.assembled,'assembled','옵션 조합')}</article>`:''}
      ${resources?`<details><summary>자원 1단위당 DPS</summary><ul class="upgrade-resource-list">${resources}</ul></details>`:''}
      ${job.blockedReasons?.length?`<details data-role="ranking-exclusions"><summary>비교 보류 ${job.blocked}건</summary>
      ${blockedSkills?`<label>보류 스킬 검색<input type="search" data-blocked-skill-filter></label><p data-blocked-skill-empty role="status" hidden>검색 결과 없음</p>
      <ul class="upgrade-blocked-skills" aria-label="보류 스킬">${blockedSkills}</ul>`:''}
      <ul>${job.blockedReasons.map(r=>`<li>${esc(r.reason)} · ${r.count}건</li>`).join('')}</ul></details>`:''}`;
  }
  return `<section aria-label="전체 DPS 추천"><h2>DPS 분석</h2>
    <label>분석 유형<select data-upgrade-group>${Object.entries(UPGRADE_GROUPS).map(([key,label])=>`<option value="${key}"${key===group?' selected':''}>${label}</option>`).join('')}</select></label>
    ${equipment||group==='gear'||group==='craft'?`<label>장비 부위<select ${replacement?'data-replacement-slot':'data-upgrade-slot'}>${slots((replacement?s.replacementSlot:s.upgradeSlot)??'all')}</select></label>`:''}
    ${equipment?`<label>후보 출처<select data-upgrade-source>${Object.entries(GEAR_UPGRADE_SOURCES).map(([key,label])=>`<option value="${key}"${key===source?' selected':''}>${label}</option>`).join('')}</select></label>`:''}
    ${replacement&&source==='shelf'&&(s.replacementSlot??'all')==='all'?`<label class="analysis-roll-toggle"><input type="checkbox" data-assemble-equipment${s.assembleEquipment?' checked':''}>보관함 장비 조합도 비교</label>`:''}
    ${group==='gear'?`<label class="analysis-roll-toggle"><input type="checkbox" data-assemble-rolls${s.assembleRolls?' checked':''}>현재 옵션의 범위 조합 비교</label>`:''}
    ${group==='craft'&&s.upgradeSlot&&s.upgradeSlot!=='all'?`<label class="analysis-roll-toggle"><input type="checkbox" data-assemble-craft${s.assembleCraft?' checked':''}>제작 옵션 조합도 비교</label>`:''}
    ${skillAnalysis?`<label>액티브 스킬<select data-upgrade-skill><option value="all"${skillReplacement?' disabled':''}${chosenSkill?'':' selected'}>${skillReplacement?'교체할 스킬 칸 선택':'전체 액티브'}</option>${skillOptions.map(({id,label})=>`<option value="${id}"${id===s.upgradeSkill?' selected':''}>${esc(label)}</option>`).join('')}${skillUnavailable&&!skillReplacement?`<option value="" selected disabled>분석할 스킬을 다시 선택하세요</option>`:''}</select></label>`:''}
    ${button('분석 시작',replacement?'rank-gear':'rank-options',job?.busy||skillUnavailable?'disabled':'')}
    <div data-upgrade-results>${content}</div>
    <details><summary>분석 기준</summary><p>${skillReplacement?'같은 칸에서 기본 레벨, 시전 시간 배분, 적중률을 유지하고 전체 빌드 DPS를 비교합니다. 연결할 수 없는 보조는 해제됩니다.':group==='unit'?'SS14에서 확인한 옵션을 하나씩 1단위 추가해 계산합니다.':equipment?'도감은 옵션 범위 상한, 보관함은 저장된 수치를 사용합니다.':group==='gearImpact'?'방어구·장신구를 한 부위씩 해제해 장착 중 DPS와 비교합니다.':group==='gear'?'옵션 수치를 한 단위씩 바꿉니다. 범위 조합은 양 끝값을 차례로 비교합니다.':group==='craft'?'제작창의 T1 기본값을 사용합니다. 한 부위의 조합은 가장 큰 상승을 주는 변경부터 한 칸씩 적용해 다시 비교합니다.':'선택한 수치나 레벨을 한 단계 바꿔 DPS를 비교합니다.'}</p></details></section>`;
}
const damageTypes={physical:'물리',fire:'화염',cold:'냉기',lightning:'번개',erosion:'부식'};

function calcRows(entries) {
  return '<dl>'+entries.map(([label,value,source])=>`<div><dt>${esc(label)}${source?`<small class="skill-calc-source">${esc(source)}</small>`:''}</dt><dd>${esc(value)}</dd></div>`).join('')+'</dl>';
}
function conversionSource({path,itemId,name}={}) {
  if(!path)return name??'';
  const card=SS14_CARDS.records[itemId]??seasonSupportKoreanCard(itemId);
  const slot=effectSourceLabel(path);
  if(name) return name===slot ? slot : `${slot} · ${name}`;
  return card?.season==='SS14'&&card.koreanTextVerified ? `${slot} · ${card.name}` : slot;
}
function calcGroup(label,value,body,role='') {
  return `<details${role?` data-role="${esc(role)}"`:''}><summary><span>${esc(label)}</span>${value?`<b>${esc(value)}</b>`:''}</summary>${body}</details>`;
}
function resistanceRows(r) {
  return r?[[r.fixed?'고정 저항':'대상 저항',number(r.base)+'%'],
    ...(r.scorch?[['스코치 저항 감소',number(r.scorch)+'%p']]:[]),
    ...(r.penetration?[['저항 관통',number(r.penetration)+'%p']]:[]),
    ...(r.spell?[['주술 원소 저항 관통',number(r.spell)+'%p']]:[]),
    ['유효 저항',number(r.effective)+'%']]:[];
}
function renderDotDefense(defense,elapsed) {
  if(!defense)return '';
  const body=d=>calcRows([['대상 심화',number(d.affliction)],['심화 대미지 배율','×'+number(d.afflictionMultiplier)]])
    +d.resistances.map(r=>calcGroup(damageTypes[r.type]??'기타','',calcRows(resistanceRows(r)))).join('');
  const states=defense.states;
  if(states&&elapsed?.states?.length!==states.length)return '';
  const detail=states ? elapsed.states.map(({active,uptime},i)=>calcGroup(
    active.map((on,j)=>on?elapsed.rows[j].name:'').filter(Boolean).join(' · ')||'영약 비활성',number(uptime)+'%',body(states[i]))).join('') : body(defense);
  return detail?calcGroup('저항·심화 계산 근거','',detail,'dot-mitigation-breakdown'):'';
}
function hitModifierSources(trace, operation) {
  return (trace??[]).filter(e=>e.stage==='damage-modifier'&&e.appliesToHit&&e.operation===operation
    && Number.isFinite(e.resolvedValue)&&e.resolvedValue!==0&&!/-damage-taken$/u.test(e.stat)).map(e=>{
    const stat=e.stat.replace(/^(?:supported-)?skill-/u,'').replaceAll('-','_');
    const value=operation==='more'?'×'+number(1+e.resolvedValue/100):(e.resolvedValue>0?'+':'')+number(e.resolvedValue)+'%';
    return [SEASON_STAT_LABELS[e.effectSource?.stat]??SEASON_STAT_LABELS[stat]??'적용 대미지 옵션',value,
      conversionSource(e.effectSource??undefined)];
  });
}
export function renderSkillConversion(trace,index) {
  const conversions=(trace??[]).filter(e=>e.stage==='conversion'&&e.effectivePercent>0&&damageTypes[e.sourceType]&&damageTypes[e.targetType]);
  const route=e=>`${damageTypes[e.sourceType]} → ${damageTypes[e.targetType]}`;
  const percent=e=>number(e.effectivePercent)+'%';
  const moved=e=>{
    const {min,max}=e.movedBaseDamage??{};
    return Number.isFinite(min)&&Number.isFinite(max)
      ? ' · 보정 전 전환량 '+number(min)+(min===max?'':'–'+number(max))
      : '';
  };
  const converted=conversions.length?calcGroup('대미지 전환',conversions.length===1?`${route(conversions[0])} ${percent(conversions[0])}`:'',
    calcRows(conversions.map(e=>[[e.actionName,route(e)].filter(Boolean).join(' · '),percent(e)+(Math.abs(e.effectivePercent-e.resolvedValue)>1e-8?` (원래 ${number(e.resolvedValue)}%)`:'')+moved(e),conversionSource(e.effectSource??undefined)])),`skill-conversion-${index}`):'';
  const gains=(trace??[]).filter(e=>e.stage==='gained-as-extra'&&e.resolvedValue>0
    && (damageTypes[e.sourceType]||e.sourceType==='non-erosion')&&damageTypes[e.targetType]);
  const gainedLabel=e=>`${damageTypes[e.sourceType]??'부식 이외'} → ${damageTypes[e.targetType]} +${number(e.resolvedValue)}%`;
  const extra=gains.length?calcGroup('대미지 추가 획득',gains.length===1?gainedLabel(gains[0]):'',
    calcRows(gains.map(e=>[gainedLabel(e),'',conversionSource(e.effectSource??undefined)])),`skill-gain-${index}`):'';
  return converted+extra;
}
function renderExcludedHitRoutes(effects) {
  if (!effects?.length) return '';
  const bySource=new Map();
  for (const effect of effects) {
    const kind=effect.stage==='conversion'?'대미지 전환':'대미지 추가 획득';
    const source=conversionSource(effect.effectSource??undefined);
    const key=JSON.stringify([kind,source]);
    const entry=bySource.get(key)??{kind,source,count:0};
    entry.count++;
    bySource.set(key,entry);
  }
  return calcGroup('미적용 전환·추가 획득',effects.length+'개',
    calcRows([...bySource.values()].map(({kind,source,count})=>[kind,'기준 적중 대미지 없음'+(count>1?' · '+count+'개':''),source])),
    'selected-skill-excluded-hit-routes');
}

export function renderElixirDamageRoutes(routes,index) {
  if (!routes) return '';
  const empty='<p>적용된 전환·추가 획득 없음</p>';
  const bodies=routes.states.map((state,i)=>state.groups.map(({slotIndex,trace})=>
    ({slotIndex,body:renderSkillConversion(trace,`${index}-elixir-${i}-${slotIndex??'all'}`)})));
  if (!bodies.some(state=>state.some(group=>group.body))) return '';
  return calcGroup('영약 상태별 대미지 전환·추가 획득','',routes.states.map(({active,uptime},i)=>
    calcGroup(routes.names.map((name,j)=>name+' '+(active[j]?'활성':'비활성')).join(' · '),
      number(uptime)+'%',bodies[i].map(({slotIndex,body})=>slotIndex===undefined?body:
        `<h4>${slotIndex===0?'메인 무기':'서브 무기'}</h4>${body||empty}`).join('')||empty,
      `selected-skill-elixir-route-${index}-${i}`)).join(''),
    `selected-skill-elixir-damage-routes-${index}`);
}
export function renderSkillElixirDps(phases,index) {
  if (!phases?.states.length) return '';
  const rows=phases.states.map(({active,uptime,dps,weightedDps})=>
    `<tr><th scope="row">${esc(phases.names.map((name,j)=>name+' '+(active[j]?'활성':'비활성')).join(' · '))}</th><td>${number(uptime)}%</td><td>${number(dps)}</td><td>${number(weightedDps)}</td></tr>`).join('');
  return calcGroup('영약 상태별 스킬 DPS','',
    `<table class="slot-dps-table"><thead><tr><th scope="col">영약</th><th scope="col">시간 비중</th><th scope="col">상태 DPS</th><th scope="col">반영 DPS</th></tr></thead><tbody>${rows}</tbody></table>`,
    `skill-elixir-dps-${index}`);
}
function renderMoonStrikeForms(build, entry, row) {
  const forms = entry?.mechanics?.find(m => m.kind === 'moon-strike-forms');
  if (!forms || entry.bindingChanged) return '';
  const rows = [['휘두르기 무기 공격 대미지',number(forms.sweep)+'%'],
    ['슬래시 무기 공격 대미지',number(forms.slash)+'%'], ['스킬 자체 슬래시 확률',`+${number(forms.baseSlashChance)}%`]];
  const rainbow = row?.supported && row.moonStrike?.rainbowSourceUrl ? row.moonStrike : null;
  const lunar = row?.supported ? row.moonStrike?.lunarEclipse : null;
  const ring = row?.supported ? row.moonStrike?.lunarRing : null;
  const wax = row?.supported ? row.moonStrike?.waxAndWane : null;
  if (rainbow) rows.push(['무지개로 추가된 슬래시 확률',`+${number(rainbow.rainbowBonus)}%`],
    ['적용 슬래시 확률',number(rainbow.slashChance)+'%']);
  if (row?.supported && row.moonStrike) rows.push(['두 형태의 평균 대미지 계수',number(row.moonStrike.averageCoefficient)+'%'],
    ['최대 MP에 따른 추가 대미지',`+${number(row.moonStrike.manaBonus)}%`]);
  if (lunar) rows.push(['월식에 적용한 MP 봉인량',number(lunar.sealedMana)],
    ['월식 레벨에 따른 추가 대미지',`+${number(lunar.fixedBonus)}%`],
    ['월식 봉인량에 따른 추가 대미지',`+${number(lunar.bonus)}%`]);
  if (ring) rows.push(['문링 레벨에 따른 추가 대미지',`+${number(ring.fixedBonus)}%`],
    ['슬래시가 환형 공격으로 바뀔 확률',number(ring.slashChance)+'%'],
    ['전체 공격 중 환형 공격 비율',number(ring.castChance)+'%'],
    ['환형 공격 적중률',number(ring.hitChance)+'%']);
  if (wax) rows.push(['달의 운동 레벨에 따른 추가 대미지',`+${number(wax.fixedBonus)}%`],
    ['달의 운동 매직 버스트 추가 적중 대미지',row.values?.burstActivationRate>0?`+${number(wax.burstBonus)}%`:'미발동']);
  if (row?.supported && row.moonStrike?.waxWeaponShares) {
    const {normal,burst}=row.moonStrike.waxWeaponShares;
    if (row.values.manualRate>row.values.burstActivationRate) rows.push(['일반 공격의 메인 무기 비중',`${number(normal*100)}%`]);
    rows.push(['매직 버스트의 메인 무기 비중',`${number(burst*100)}%`]);
  }
  const record = SS14_CARDS_EN.records[entry.itemId];
  if (record && !seasonWeaponRestrictionIssue(build,record)) {
    const hands = [0,1].map(index => seasonWeaponProfile(build,index,{individual:true}));
    for (const [index, label] of ['메인 무기','서브 무기'].entries()) {
      const {values,supported} = hands[index];
      if (supported) for (const [type,name] of Object.entries(damageTypes)) {
        if (type === 'physical' || values[`weapon${type}Max`] > 0) rows.push([
          `${label} ${name} 대미지`,`${number(values[`weapon${type}Min`])}–${number(values[`weapon${type}Max`])}`]);
      }
      if (Number.isFinite(values.baseCriticalRating)) rows.push([`${label} 기본 크리티컬 수치`,number(values.baseCriticalRating)]);
      if (values.weaponSpeed > 0) rows.push([`${label} 초당 공격 횟수`,number(values.weaponSpeed)]);
    }
    if (hands.every(hand => hand.values.weaponSpeed > 0))
      rows.push(['쌍수 기본 초당 공격 횟수',number((hands[0].values.weaponSpeed+hands[1].values.weaponSpeed)/2)]);
  }
  return calcGroup('문 스트라이크 기본 수치',`Lv.${forms.level}`,calcRows(rows)
    + (row?.supported && row.manaPerUse===null ? '<p>MP 소모 1%의 기준량 미확인. 보정 전 소모량을 조건에 입력하면 MP 수급을 계산합니다.</p>' : '')
    + `<p><a href="${esc(forms.sourceUrl)}" target="_blank" rel="noopener noreferrer">스킬 원문</a> · <a href="https://tlidb.com/ko/Attack" target="_blank" rel="noopener noreferrer">공격 도움말</a>${rainbow ? ` · <a href="${esc(rainbow.rainbowSourceUrl)}" target="_blank" rel="noopener noreferrer">무지개 원문</a>` : ''}${lunar ? ` · <a href="${esc(lunar.sourceUrl)}" target="_blank" rel="noopener noreferrer">월식 원문</a>` : ''}${wax ? ` · <a href="${esc(wax.sourceUrl)}" target="_blank" rel="noopener noreferrer">달의 운동 원문</a>` : ''}</p>`,
  'selected-skill-moon-strike');
}

function renderSkillResourceCosts(row, averaged) {
  if (!row || (!row.channelCost && !['manaPerUse','lifePerUse','manualManaPerSecond','manualLifePerSecond'].some(key=>Number.isFinite(row[key])))) return '';
  const costs = [];
  for (const [label,perUse,perSecond] of [
    ['MP',row.manaPerUse,row.manualManaPerSecond], ['HP',row.lifePerUse,row.manualLifePerSecond],
  ]) {
    if (label==='HP' && !(perUse>0 || perSecond>0)) continue;
    if (Number.isFinite(perUse)) costs.push([averaged?'시작 시 1회 '+label:'1회 '+label,number(perUse)]);
    costs.push([averaged?'평균 '+label+'/초':label+'/초',Number.isFinite(perSecond)?number(perSecond):'확인 필요']);
  }
  if (row.channelCost?.valid)
    costs.push(['관측 차감 횟수',number(row.channelCost.rate)+'회/초']);
  const channel=row.channelCost;
  const needsRate=channel&&!channel.valid;
  const channelDetails=needsRate
    ? `<p>${channel.variable?'상태마다 차감 비용이 달라 평균 횟수만으로는 초당 소모를 확정할 수 없습니다.'
      : Number.isFinite(channel.max)?`관측한 초당 차감 횟수를 입력하세요. 현재 상한은 ${number(channel.max)}회/초입니다.`:'차감 횟수의 상한을 확인할 수 없습니다.'}</p>`
      +button('차감 횟수 입력','result-tab',`data-tab="conditions" data-field="dps-input" data-field-key="${row.rowIndex}:channelCostRate"`):'';
  const total = [row.manualManaPerSecond,row.manualLifePerSecond]
    .map((value,i)=>Number.isFinite(value)&&(i===0||value>0) ? number(value)+(i===0?' MP/초':' HP/초') : '').filter(Boolean).join(' · ');
  return calcGroup('수동 시전 소모',total,calcRows(costs)+channelDetails
    +button('전체 MP 수급 보기','result-tab','data-tab="stats" data-focus-role="numeric-mana-summary"'),'selected-skill-resource-cost');
}

function renderSkillNumbedContribution(dps,row) {
  if(!dps?.supported||!row?.supported)return '';
  const dynamic=dps.scope==='ss14-thea-joint-combat';
  const prefix=dynamic?'numbed':'fixedNumbed';
  const entries=[['번개 적중','HitDps'],['번개 지속 대미지','DotDps'],['번개 수확','ReapingDps']]
    .map(([label,key])=>[label,row.values[prefix+key]]).filter(([,value])=>Number.isFinite(value)&&value>0);
  if(!entries.length)return '';
  const total=entries.reduce((sum,[,value])=>sum+value,0);
  return calcGroup('이 스킬의 마취 기여','+'+number(total)+' DPS',calcRows(entries.map(([label,value])=>[label,'+'+number(value)+' DPS']))
    +'<p>스킬 DPS에 이미 반영된 수치입니다.</p>','selected-skill-numbed');
}

export function renderSkillCalculation(s) {
  const report=s.report,rows=report.fullDps.rows;
  const assumed=preferredSeasonDpsMetric(report)==='assumedDps';
  const skills=normalizeBuild(s.document.targetBuild).skills;
  const slots=[...skills.active,...skills.passive].flatMap((skill,index)=>{
    const row=rows.find(entry=>entry.rowIndex===index);
    if(!row && (index>=skills.active.length || seasonSkillSlotCalculation(report,index)?.mechanics?.some(m=>m.kind==='utility-skill')))return [];
    const id=row?.id??skill.skillId;
    if(!id)return [];
    const card=SS14_CARDS.records[id];
    const name=card?.koreanTextVerified&&card.season==='SS14'?card.name:'한국어 이름 미제공';
    const slotName=index===0?'주력':index<skills.active.length?'액티브 '+(index+1):'패시브 '+(index-skills.active.length+1);
    return [{index,id,row,name,slotName}];
  });
  if(!slots.length)return button('주력 스킬 선택','inspect-calculation-skill','data-index="0" data-role="edit-calculation-skill"');
  const selected=slots.find(slot=>slot.index===s.calculationIndex)??slots[0];
  const {id,index,row}=selected;
  const displayRow=assumed?report.assumedDps.rows.find(entry=>entry.rowIndex===index):row;
  const numbed=renderSkillNumbedContribution(assumed?report.assumedDps:report.fullDps,displayRow);
  const moonStrike=renderMoonStrikeForms(s.document.targetBuild,seasonSkillSlotCalculation(report,index),displayRow);
  const direct=assumed ? null : report.coupledSkills.rows.find(r=>r.rowIndex===index&&r.id===id);
  const detail=assumed ? displayRow?.detail : {
    damageStages:direct?.damageStages, hasHitPools:direct?.offenseBasis?.pools?.some(p=>p.min||p.max),
    critical:report.offense.rows.find(r=>r.rowIndex===index&&r.id===id)?.values, pools:row?.pools, takenMultiplier:row?.takenMultiplier,
    skillLevel:seasonSkillCalculationLevel(report,index), excludedHitRoutes:excludedSeasonHitRoutes(direct), hitModifierTrace:direct?.trace,
  };
  const {damageStages:stages, hasHitPools, critical, pools, takenMultiplier, skillLevel, excludedHitRoutes,hitModifierTrace}=detail??{};
  const v=displayRow?.values??{};
  const averaged=assumed?report.assumedDps.measuredResources:!!report.theaAverage;
  const slotTitle=slot=>`${slot.slotName} · ${esc(slot.name)}${Number.isInteger(slot.row?.minionLevel)?' · Lv.'+slot.row.minionLevel:''}`;
  const selector=slots.length===1 ? `<h2 data-role="calculation-skill" tabindex="-1">${slotTitle(selected)}</h2>`
    : `<select aria-label="계산할 스킬" data-calculation-skill data-role="calculation-skill">${slots.map(slot=>`<option value="${slot.index}"${slot.index===index?' selected':''}>${slotTitle(slot)}</option>`).join('')}</select>`;
  const levelDetails=Number.isInteger(skillLevel?.level)&&(skillLevel.bonus||skillLevel.growthMultiplier) ? calcGroup(
    skillLevel.confirmed?'적용 스킬 레벨':'스킬 레벨 확인 필요',`Lv.${skillLevel.level}`,calcRows([
      ['기본 레벨',String(skillLevel.base)],
      ...(skillLevel.bonus?[['레벨 보너스',(skillLevel.bonus>0?'+':'')+skillLevel.bonus]]:[]),
      ...(skillLevel.growthMultiplier?[['20레벨 이후 누적 대미지 배율','×'+number(skillLevel.growthMultiplier)]]:[]),
    ]),'selected-skill-level') : '';
  const actions=`<div class="skill-calc-actions">${button('스킬 편집','inspect-calculation-skill',`data-index="${index}" data-role="edit-calculation-skill"`)}
    ${skillConditionKeys(s,index,id).length?button('스킬 조건','result-tab',`data-tab="conditions" data-focus-role="dock-skill-conditions-${index}"`):''}</div>`;
  const minionDeterioration = v.minionDeteriorationDps ?? 0;
  const amounts=SEASON_DPS_PARTS.flatMap(([key,label])=>{
    if (!Number.isFinite(v[key]) || v[key]===0) return [];
    if (key==='minionDps' && minionDeterioration>0)
      return [[label,number(v[key]-minionDeterioration)],['소환체 악화',number(minionDeterioration)]];
    return [[label,number(v[key])]];
  });
  const skillDps=displayRow?.supported&&Number.isFinite(v.dps)?number(v.dps):'계산 보류';
  const reap=displayRow?.reaping;
  const fissure=displayRow?.fissure;
  if(displayRow?.supported&&fissure) amounts.push(['파괴 충전 간격',number(fissure.interval)+'초'],['균열 후속 적중',number(fissure.hits)+'/초']);
  if(v.igniteReapingDps>0) amounts.push(['점화·연소 수확',number(v.igniteReapingDps)+' DPS']);
  if(v.reapingDps>0 && reap) amounts.push(['수확 시간',number(reap.duration)+'초'],['수확 쿨타임',number(reap.cooldown)+'초'],['수확 횟수',number(reap.rate)+'/초']);
  if(v.reapingDps>0 && reap?.beamCount>1) amounts.push(['생성 광선 수',number(reap.beamCount)]);
  const globalIssues=new Set(report.fullDps.blockers);
  const issues=(row?.blockers??[]).filter(reason=>!globalIssues.has(reason));
  const dpsLabel=assumed?'스킬 방어 전 DPS':'스킬 DPS';
  const total=amounts.length&&displayRow?.supported?calcGroup(dpsLabel,skillDps,calcRows(amounts),'selected-skill-dps'):
    `<p class="skill-calc-total" data-role="selected-skill-dps"><span>${dpsLabel}</span><b>${skillDps}</b></p>`;
  const hitOnly=!displayRow?.supported && Number.isFinite(row?.permafrostHitDps)
    ? calcRows([['얼음 송곳 적중 DPS',number(row.permafrostHitDps)],['동토의 지속 대미지','계산 보류']]) : '';
  const elapsed=assumed?report.assumedDps.elixirUptime:report.elixirUptime;
  const averagedElixir=elapsed?.supported&&elapsed.rows.some(r=>r.uptime>0&&r.uptime<100);
  const frost=displayRow?.permafrostBreakdown;
  const frostDetails=frost?calcGroup('동토 지속 대미지 계산',number(v.permafrostDps)+' DPS',calcRows([
    [averagedElixir?'활성 중 평균 DPS':'활성 중 DPS',number(frost.active)],['적용 가동률',number(frost.uptime)+'%'],
    ['소모한 지면 에너지 축적',number(frost.charge)+'회'],
  ])+(!averaged?renderDotDefense(displayRow.frostDefense,elapsed):''),'permafrost-dps-breakdown'):'';
  const dot=displayRow?.supported&&(!averaged||averagedElixir)?displayRow.dotBreakdown:null;
  const dotDetails=dot?calcGroup('지속 대미지 적용',number(v.dotDps)+' DPS',calcRows([
    [averagedElixir?'활성 중 평균 DPS':'활성 중 DPS',number(dot.active)],
    ['적용 가동률',number(dot.uptime)+'%'],['가동률 반영 DPS',number(v.dotDps)],
  ])+(!averaged?renderDotDefense(displayRow.dotDefense,elapsed):''),'skill-dot-breakdown'):'';
  const costs=renderSkillResourceCosts(index<skills.active.length?displayRow:null,averaged||averagedElixir);
  if(averagedElixir)
    return `<section class="skill-calculation" aria-label="선택 스킬 계산">${selector}${total}${levelDetails}${moonStrike}${frostDetails}${dotDetails}${numbed}${costs}${actions}${renderSkillElixirDps(displayRow?.elixirDpsStates,index)}${renderElixirDamageRoutes(displayRow?.elixirDamageRoutes,index)}</section>`;
  const useRate=assumed?displayRow?.useRate:direct?.offenseBasis?.rate;
  const criticalChance=critical?.effectiveCriticalChance;
  const summary=displayRow?.supported?[
    ...(!averaged&&Number.isFinite(v.averageLandedHit)?[[displayRow.moonStrike?.waxWeaponShares?'기본 교대 적중 평균':'1회 평균 명중',number(v.averageLandedHit)]]:[]),
    ...(useRate>0?[[averaged?'시작 시 사용 속도':'사용 속도',number(useRate)+'/초']]:[]),
    ...(Number.isFinite(criticalChance)&&Number.isFinite(v.averageLandedHit)?[[averaged?'시작 시 크리티컬 확률':'크리티컬 확률',number(criticalChance)+'%']]:[]),
  ]:[];
  let steps='';
  const minionTypes = Object.entries(displayRow?.minionDamageByType ?? {})
    .filter(([type, dps]) => damageTypes[type] && Number.isFinite(dps) && dps > 0);
  let minionDamage = '';
  if (displayRow?.supported && !averaged && minionTypes.length) {
    const sum = minionTypes.reduce((total, [, dps]) => total + dps, 0);
    minionDamage = calcGroup(assumed ? '소환체 스킬의 유형별 방어 전 DPS' : '소환체 스킬의 유형별 DPS', number(sum),
      calcRows(minionTypes.map(([type, dps]) => [damageTypes[type], number(dps)])), 'selected-skill-minion-damage');
  }
  if (displayRow?.weaponHands) steps+=calcGroup('쌍수 교대 공격','',displayRow.weaponHands.map(hand=>{
    const label=hand.slotIndex===0?'메인 무기':'서브 무기';
    return calcRows([[`${label} 적중당 평균 대미지`,number(hand.landedHit)],
      [`${label} 크리티컬 확률`,number(hand.effectiveCriticalChance)+'%']])
      + renderSkillConversion(hand.conversionTrace,`${index}-weapon-${hand.slotIndex}`);
  }).join('')+`<p><a href="${DUAL_WIELD_ATTACK_SOURCE}" target="_blank" rel="noopener noreferrer">쌍수 공격 도움말</a></p>`,'selected-skill-dual-wield');
  const trace=assumed?displayRow?.conversionTrace:row?.conversionTrace??direct?.trace;
  const conversion=renderSkillConversion(trace,index);
  const excluded=renderExcludedHitRoutes(excludedHitRoutes);
  if(stages && hasHitPools) {
    const types=Object.entries(stages.byType??{}).filter(([,v])=>v.base||v.added||v.taken);
    let prior=stages.baseHitAverage+stages.addedHitAverage;
    steps+=calcGroup('기본·추가 적중 대미지',number(prior),calcRows([['기본 평균',number(stages.baseHitAverage)],['추가 평균',number(stages.addedHitAverage)],
      ...types.map(([type,v])=>[(damageTypes[type]??'기타')+' 기본 / 추가',number(v.base)+' / '+number(v.added)])]));
    for(const [key,label,stage,previous] of [['hitAfterIncrease','비율 증가','increase','base'],['hitAfterAdditional','추가 증가','additional','increase']]){
      const next=stages[key];
      if(!Number.isFinite(next))continue;
      const factor=(before,after)=>before>0?(stage==='increase'?number((after/before-1)*100)+'%':'×'+number(after/before)):'—';
      const options=hitModifierSources(hitModifierTrace,stage==='increase'?'add':'more');
      steps+=calcGroup(label,factor(prior,next),calcRows([['적용 전 평균',number(prior)],['적용 후 평균',number(next)],
        ...types.map(([type,v])=>[damageTypes[type]??'기타',factor(previous==='base'?v.base+v.added:v[previous],v[stage])])])
        +(options.length?calcGroup('적용 옵션과 출처','',calcRows(options),`hit-${stage}-sources`):''));
      prior=next;
    }
    if(displayRow?.supported && Number.isFinite(takenMultiplier)){
      const received=types.flatMap(([type,v])=>{
        const matching=pools.filter(pool=>pool.type===type);
        if(!matching.length)return [];
        return [{type,pools:matching,before:v.additional,after:v.taken*takenMultiplier*matching[0].receivedMultiplier}];
      });
      const ratio=(before,after)=>before>0?'×'+number(after/before):'—';
      const after=received.reduce((sum,p)=>sum+p.after,0);
      const numbed=(assumed ? report.assumedDps : report.componentProjection).fixedNumbed;
      steps+=calcGroup('받는 대미지 보정',ratio(stages.hitAfterAdditional,after),calcRows([['아머·저항 적용 전 평균',number(after)],
        ...received.map(p=>[damageTypes[p.type]??'기타',ratio(p.before,p.after)]),
        ...(numbed?.stacks>0&&received.some(p=>p.type==='lightning')?[['마취로 받는 번개 대미지','+'+number(numbed.bonus)+'%']]:[])]));
      if(received.length)steps+=calcGroup(assumed?'방어 전 대미지 범위':'대상 보정 후 대미지 범위','',calcRows(received.flatMap(({type,pools})=>{
        const label=damageTypes[type]??'기타';
        const bound=key=>number(pools.reduce((sum,p)=>sum+p[key],0)*takenMultiplier);
        const bounds=[label,bound('min')+' – '+bound('max')];
        return assumed ? [bounds] : [bounds,[label+' 아머 / 저항 배율','×'+number(pools[0].armorMultiplier)+' / ×'+number(pools[0].resistanceMultiplier)]];
      }))+(!assumed&&received.some(({pools})=>pools[0].defense)?calcGroup('아머·저항 계산 근거','',received.map(({type,pools})=>{
        const d=pools[0].defense;
        if(!d)return '';
        const percent=value=>number(value)+'%';
        const points=value=>number(value)+'%p';
        return calcGroup(damageTypes[type]??'기타','',calcRows([
          ['대상 아머',number(d.armor)],['관통 전 아머 감면',percent(d.armorReduction*100)],
          ...(d.armorPenetration?[['아머 감면 관통',points(d.armorPenetration)]]:[]),
          ...(d.projectilePen?[['투사체 아머 관통',points(d.projectilePen)]]:[]),
          ...resistanceRows(d.resistance),
        ]));
      }).join(''),'target-mitigation-breakdown'):''));
    }
    if(Number.isFinite(criticalChance))steps+=calcGroup('크리티컬',number(criticalChance)+'%',calcRows([['크리티컬 수치',number(critical.criticalRating)],['기본 판정 확률',number(critical.criticalChance)+'%'],['유효 확률',number(criticalChance)+'%'],['크리티컬 대미지',number(critical.criticalDamage)+'%']]));
  }
  const hit=displayRow?.supported&&!averaged?displayRow.hitBreakdown:null;
  if(hit&&Number.isFinite(v.averageHit))steps+=calcGroup('적중 판정 1회 기대값',number(v.averageHit),calcRows([
    [assumed?'방어 전 범위 평균':'대상 보정 후 범위 평균',number(hit.mitigatedMean)],
    ...(hit.rollMean!==hit.mitigatedMean?[['행운·불운 반영 평균',number(hit.rollMean)]]:[]),
    ['주 속성 배율','×'+number(hit.attributeMultiplier)],
    ['명중 시 평균 (크리티컬 포함)',number(v.averageLandedHit)],
    ['대상 적중률',number(hit.hitChance)+'%'],
    ['적중률 반영 기대값',number(v.averageHit)],
  ]),'selected-skill-expected-hit');
  steps+=dotDetails;
  if(Number.isFinite(useRate)&&useRate>0){
    const rates=[['초당 사용 가능 횟수',number(useRate)]];
    if(displayRow?.supported&&Number.isFinite(v.manualRate))rates.push(['초당 일반 시전',number(v.manualRate)]);
    steps+=calcGroup('사용 속도',number(useRate)+'/초',calcRows(rates));
  }
  if(steps)steps=calcGroup(averaged?'전투 시작 상태의 계산 단계':assumed?'방어 전 계산 단계':'대미지 계산 단계','',steps);
  const details = conversion + minionDamage + excluded + steps;
  return `<section class="skill-calculation" aria-label="선택 스킬 계산">${selector}${total}${hitOnly}${summary.length?`<div data-role="skill-combat-summary">${calcRows(summary)}</div>`:''}${levelDetails}${moonStrike}${frostDetails}${numbed}${costs}${actions}${!row?.supported&&issues.length?calcGroup('계산 보류 이유','',renderReasons(s,issues)):''}${details?calcGroup('세부 계산','',details,'selected-skill-details'):''}</section>`;
}

export function renderNumbedCalculation(s) {
  const report=s.report;
  const assumed=preferredSeasonDpsMetric(report)==='assumedDps';
  const dps=assumed?report.assumedDps:report.fullDps;
  const contribution=key=>dps?.supported ? dps.rows.reduce((sum,row)=>sum+(row.values[key]??0),0) : 0;
  const dotContributions=(dot,reaping)=>[
    ...(dot>0?[['플레이어 번개 지속 대미지의 마취 기여','+'+number(dot)+' DPS']]:[]),
    ...(reaping>0?[['플레이어 번개 수확의 마취 기여','+'+number(reaping)+' DPS']]:[]),
  ];
  const fixed=(assumed?report.assumedDps:report.componentProjection).fixedNumbed;
  if(fixed) {
    const fixedContribution=key=>dps?.scope==='ss14-thea-joint-combat'?0:contribution(key);
    const hit=fixedContribution('fixedNumbedHitDps');
    return calcGroup('마취',number(fixed.stacks)+'중첩',calcRows([
      ['입력한 중첩',number(fixed.stacks)],['번개 대미지 보정','+'+number(fixed.bonus)+'%'],
      ...(hit>0?[['플레이어 번개 적중의 마취 기여','+'+number(hit)+' DPS']]:[]),
      ...dotContributions(fixedContribution('fixedNumbedDotDps'),fixedContribution('fixedNumbedReapingDps')),
    ])+(report.coupledSkills.rows.some(row=>row.voltageJolt)?'<p class="native-stat-note">혼비백산을 사용한 전투에서 관측한 대상 중첩을 적용합니다.</p>':'')
      +button('마취 조건 편집','requirement',`data-section="combat" data-field="${fixed.sourceKey?'component-condition':'dps-input'}" data-field-key="${esc(fixed.sourceKey??'enemy:numbedStacks')}"`),'numeric-numbed');
  }
  const cycle=report.theaAverage;
  const stats=assumed?report.assumedDps.numbed:{
    uptime:cycle?.numbedUptime, stacks:cycle?.numbedAverage, effect:cycle?.numbedEffectAverage, duration:cycle?.playerNumbedDuration,
    playerHits:cycle?.playerNumbedHits,
  };
  if (!Number.isFinite(stats?.effect)) return '';
  return calcGroup('마취',number(stats.uptime)+'%',calcRows([
    ['유지율',number(stats.uptime)+'%'],['평균 중첩',number(stats.stacks)],
    ...(Number.isFinite(stats.duration)?[['플레이어 마취 지속 시간',number(stats.duration)+'초']]:[]),
    ['시간 평균 번개 대미지 보정','+'+number(stats.effect)+'%'],
    ...(stats.playerHits?[
      ['마취가 적용된 플레이어 번개 적중',`${number(stats.playerHits.boostedHits)} / ${number(stats.playerHits.lightningHits)}회`],
      ['플레이어 번개 적중의 마취 기여',`+${number(stats.playerHits.bonusDps)} DPS`],
    ]:[]),
    ...dotContributions(contribution('numbedDotDps'),contribution('numbedReapingDps')),
  ])+
    button('마취 조건 편집','requirement','data-section="combat" data-field="thea-event" data-field-key="numbedEnabled"'),'numeric-numbed');
}

function skillContributions(s) {
  const metric=preferredSeasonDpsMetric(s.report);
  const dps=s.report[metric];
  const metricLabel=metric==='assumedDps'?'방어 전 DPS':'전체 DPS';
  const rows=dps?.rows??[];
  const {active,passive}=s.document.targetBuild.skills;
  const bySlot=new Map(rows.map(row=>[row.rowIndex,row]));
  const slots=[...active,...passive].flatMap(({skillId,supports},index)=>{
    const row=bySlot.get(index),hasSupport=supports?.some(support=>support?.supportId);
    return row||skillId&&hasSupport?[{index,id:row?.id??skillId,row,hasSupport}]:[];
  });
  if(s.pending.size||!slots.length)return '';
  const total=dps.dps;
  const reconciled=dps.supported && total>0 && rows.every(r=>r.supported&&Number.isFinite(r.values.dps)&&r.values.dps>=0)
    && Math.abs(rows.reduce((sum,r)=>sum+r.values.dps,0)-total)<Math.max(0.000001,total*1e-8);
  const nameFor=card=>card?.season==='SS14'&&card.koreanTextVerified?esc(card.name):'한국어 이름 미제공';
  return `<section class="skill-contributions" aria-label="스킬별 DPS"><h2>스킬별 DPS</h2><table><thead><tr><th scope="col">스킬</th><th scope="col">${metric==='assumedDps'?metricLabel:'DPS'}</th>${reconciled?'<th scope="col">비중</th>':''}</tr></thead><tbody>${slots.map(({index,id,row,hasSupport})=>{
    const label=nameFor(SS14_CARDS.records[id]);
    const slotName=index===0?'주력':index<active.length?'액티브 '+(index+1):'패시브 '+(index-active.length+1);
    const expanded=s.supportImpact?.rowIndex===index;
    const share=reconciled&&row?100*row.values.dps/total:null;
    const actions=button(`${label} <small>· ${slotName}</small>`,row?'inspect-contribution-skill':'inspect-skill',`data-index="${index}" class="contribution-skill"`);
    const compare=hasSupport?button('보조 비교','compare-support-impact',`data-index="${index}" data-role="support-impact-${index}" aria-label="${label} ${slotName} 보조 비교" aria-expanded="${expanded}"`):'';
    const linkRows=expanded?s.supportImpact.rows.map(({supportIndex,id,comparison,resources})=>{
      const {supported,value,delta,reasons}=comparison;
      const result=supported?`<strong>${number(value)}</strong><small>${delta>0?'+':''}${number(delta)} DPS</small>`
        :`<details><summary>비교 보류</summary>${renderReasons(s,reasons)}</details>`;
      const edit=button(`${supportIndex+1} · ${nameFor(seasonSupportKoreanCard(id))}`,'inspect-support-impact',
        `data-row="${index}" data-index="${supportIndex}" data-role="support-impact-edit-${index}-${supportIndex}" class="contribution-skill"`);
      const cost=resources?renderResourceChanges(resources,esc):'';
      return `<li>${edit}<div>${result}</div>${cost?`<section class="support-impact-cost">${cost}</section>`:''}</li>`;
    }).join(''):'';
    return `<tr><th scope="row">${actions}${compare}</th><td>${row?.supported?number(row.values.dps):row?'보류':'—'}</td>${reconciled?`<td>${share===null?'—':`${number(share)}%<meter aria-label="${label} 비중" min="0" max="100" value="${Math.min(100,share)}"></meter>`}</td>`:''}</tr>${linkRows?`<tr class="support-impact"><td colspan="${reconciled?3:2}"><strong>보조 해제 시 ${metricLabel}</strong><ul>${linkRows}</ul></td></tr>`:''}`;
  }).join('')}</tbody></table></section>`;
}
export function renderResultAnalysis(s) {
  const result = s.pending.size ? null : s.analysis;
  const metric = s.analysisMetric ?? preferredSeasonDpsMetric(s.report);
  const dpsMetrics = ['fullDps', 'assumedDps'];
  const metricOptions = keys => keys.map(key => `<option value="${key}"${metric === key ? ' selected' : ''}>${esc(SEASON_ADVISOR_METRICS[key])}</option>`).join('');
  const comparisonBasis = metric === 'assumedDps'
    ? '적 아머와 저항은 비교 기준에서 제외합니다. 적중률과 나머지 전투 조건이 같은 빌드를 비교합니다.'
    : '같은 원본에서 만든 빌드 중 전투 조건이 같은 빌드를 비교합니다.';
  const baselineReasons = new Set(result?.baselineReasons ?? []);
  const rows = [...(result?.rows ?? [])].sort((a,b) => Number(!!a.reasons.length) - Number(!!b.reasons.length) || (b.delta ?? 0) - (a.delta ?? 0));
  return `<section class="native-result-analysis" aria-label="빌드 분석">
    ${skillContributions(s)}
    ${renderUpgradeRanking(s)}
    ${renderEditDpsComparison(s)}
    <details data-role="saved-build-comparison"${result?' open':''}><summary>저장 빌드 비교</summary>
    <label>비교 지표<select data-analysis-metric data-role="saved-comparison-metric" aria-label="비교 지표"><optgroup label="DPS">${metricOptions(dpsMetrics)}</optgroup><optgroup label="세부 수치">${metricOptions(Object.keys(SEASON_ADVISOR_METRICS).filter(key => !dpsMetrics.includes(key)))}</optgroup></select></label>
    <div class="native-result-actions">${button('저장 빌드와 비교', 'compare-builds')}${button('비교용 사본 만들기', 'copy')}</div>
    <div data-role="native-analysis-result"${s.pending.size ? ' hidden' : ''}>${result ? `<p>기준 · ${esc(SEASON_ADVISOR_METRICS[result.metric])} <strong>${number(result.baseValue)}</strong></p>
      ${result.baselineReasons.length ? `<ul>${result.baselineReasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>` : ''}
      ${rows.map(row => {
        const reasons = row.reasons.filter(reason => !baselineReasons.has(reason));
        return `<article class="native-comparison-row"><h3>${esc(row.name)}</h3>${row.reasons.length
        ? `<strong>비교 보류</strong>${reasons.length ? `<details><summary>이유 확인</summary><ul>${reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul></details>` : ''}`
        : `<strong>${number(row.value)}</strong><p class="native-comparison-delta">기준 대비 ${row.delta > 0 ? '+' : ''}${number(row.delta)}${result.baseValue ? ` (${row.delta > 0 ? '+' : ''}${number(row.delta / result.baseValue * 100)}%)` : ''}</p>`}
        ${button('이 빌드 열기', 'open', `data-id="${esc(row.id)}" aria-label="${esc(row.name)} 열기"`)}</article>`;
      }).join('') || '<p>다른 저장 빌드가 없습니다. 비교용 사본을 만들어 편집하세요.</p>'}
      ` : ''}</div>
    <details class="native-stat-note"><summary>비교 기준</summary><p>${comparisonBasis}</p></details></details>
  </section>`;
}
