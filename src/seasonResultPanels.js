import { SEASON_ADVISOR_METRICS, preferredSeasonDpsMetric } from './seasonAdvisor.js';
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDpsEnemyFieldDefinition, seasonDpsSkillFieldKeys, seasonDpsSkillFieldDefinition, hasSeasonDpsConditionOverrides, hasSeasonSkillConditionOverrides, seasonNumbedDamageRows, observedSkillCostFields, SEASON_DPS_PARTS, seasonDamageComposition, seasonDamageTypeComposition, seasonDamageTypeParts, SEASON_DAMAGE_TYPE_LABELS as damageTypes, SEASON_DAMAGE_BREAKDOWN_LABELS, seasonDotWindowRepairs, seasonDotWindowRole } from './seasonDps.js';
import { labeledGearRolls, renderNearbyEnemyField, renderSeasonDpsField, renderFixedNumbedField, usesTargetNumbedInput, renderObservedManaInput } from './seasonWorkspaceView.js';
import { nearbyEnemyGroups } from './seasonEffectConditions.js';
import { blessingConditionValue, boundBlessingStacks } from './seasonBlessings.js';
import { inputDestinations, seasonConditionControlLabel } from './seasonInputRequirements.js';
import { matchingTrainingDummy, renderTrainingDummyPicker } from './seasonTrainingDummy.js';
import { SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';
import { UPGRADE_GROUPS, GEAR_UPGRADE_SOURCES, BLOCKED_CANDIDATE_PAGE_SIZE, RANKED_CANDIDATE_PAGE_SIZE, CRAFT_RANK_TIERS } from './seasonUpgradeRanking.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { seasonSupportKoreanCard } from './seasonSupport.js';
import { normalizeBuild } from './engine.js';
import { effectSourceLabel, excludedSeasonHitRoutes } from './seasonEffectSources.js';
import { seasonSkillCalculationLevel, seasonSkillSlotCalculation } from './seasonSkillLevels.js';
import { seasonWeaponProfile, WEAPON_PHYSICAL_BASE_UNVERIFIED } from './seasonWeaponProfile.js';
import { DUAL_WIELD_ATTACK_SOURCE } from './seasonWeaponInputs.js';
import { seasonWeaponRestrictionIssue } from './seasonWeaponRestrictions.js';
import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { SEASON_STAT_LABELS } from './seasonNumericStats.js';
import { BOARD_TITLES, renderBoardOptionChanges, renderDamageBreakdown, renderResourceChanges, renderSkillLevelChanges, pickerSearchMatcher } from './seasonEditorTools.js';
import { compactSeasonEditDelta } from './seasonEditComparison.js';
import { hasPeriodicBurstSupport, PERIODIC_BURST_INPUT, readPeriodicBurstUptime } from './seasonSkillInputs.js';
import { auraActivationControl } from './seasonNetherModifiers.js';

const esc = v => String(v ?? '').replace(/[&<>"']/gu, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const number = v => Number.isFinite(v) ? v.toLocaleString('ko-KR', { maximumFractionDigits:2 }) : '미지원';
const button = (label, action, attrs = '') => `<button type="button" data-ss14-action="${action}" ${attrs}>${label}</button>`;
const edit = (label, role) => button(label, 'requirement', `data-section="combat" data-focus-role="${role}"`);
export const RESULT_TABS = [['stats','수치'], ['calculation','계산'], ['conditions','조건'], ['analysis','분석']];

const deltaText = r => `${r.delta > 0 ? '+' : ''}${number(r.delta)}${r.percent === null ? '' : ` (${r.percent > 0 ? '+' : ''}${number(r.percent)}%)`}`;
export function renderReasons(s,reasons,dps=s.report.fullDps,skillIndex) {
  const belongsToSkill=link=>{
    if (!Number.isInteger(skillIndex)) return true;
    if (link.section==='skills'&&Number.isInteger(link.index)) return link.index===skillIndex;
    if (link.edit==='offense-input') return link.key===String(skillIndex);
    const slot=link.edit==='dps-input'?/^(\d+):/u.exec(link.key):null;
    return !slot||Number(slot[1])===skillIndex;
  };
  const unique=new Map();
  for(const text of reasons){
    const match=/^(기준|현재): (.*)$/u.exec(text);
    const reason=match?.[2]??text;
    if(!unique.has(reason))unique.set(reason,new Set());
    unique.get(reason).add(match?.[1]??'');
  }
  const inputs=new Map(),rest=[];
  for(const [reason,sides] of unique){
    const links=sides.size===1&&sides.has('기준')?[]:inputDestinations(s.report,reason,dps).filter(belongsToSkill);
    if(links.some(link=>Number.isInteger(link.supportIndex))&&[...unique].some(([other,scope])=>
      other.endsWith(': '+reason)&&scope.size===sides.size&&[...scope].every(side=>sides.has(side))))continue;
    const side=sides.size===1&&!sides.has('')?[...sides][0]+' · ':'';
    let message=reason===WEAPON_PHYSICAL_BASE_UNVERIFIED?'무기 기본 물리 대미지 원문 미확인':reason;
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
    const key=JSON.stringify(links.map(l=>JSON.stringify([l.section,l.tab,l.index,l.supportIndex,l.ring,l.type,l.role,l.edit,l.key])).sort());
    if(!inputs.has(key))inputs.set(key,{links,messages:new Set()});
    inputs.get(key).messages.add(text);
  }
  const items=[...inputs.values()].map(({links,messages})=>{
    const [first,...other]=messages;
    const actions=links.map(l=>l.tab ? button(esc(l.label),'result-tab',`data-tab="${esc(l.tab)}"${Number.isInteger(l.index)?` data-index="${l.index}"`:''} data-focus-role="${esc(l.role)}" data-field="${esc(l.edit)}" data-field-key="${esc(l.key)}"`)
      : button(esc(l.label),'requirement',`data-section="${esc(l.section??'hero')}" data-index="${l.index??''}" data-support="${l.supportIndex??''}"${l.ring?` data-ring="${esc(l.ring)}"`:''} data-type="${esc(l.type)}" data-focus-role="${esc(l.role)}" data-field="${esc(l.edit)}" data-field-key="${esc(l.key)}"`)).join('');
    const details=other.length?`<details><summary>같은 입력과 관련된 사유</summary><ul>${other.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></details>`:'';
    return `<li>${esc(first)} ${actions}${details}</li>`;
  });
  return `${items.length?`<ul aria-label="입력할 항목">${items.join('')}</ul>`:''}${rest.length?`<details><summary>추가 확인 ${rest.length}건</summary><ul>${rest.join('')}</ul></details>`:''}`;
}
function renderLoadoutChanges({gearChanges=[],boardChanges=[]},{before,after,id,scope}) {
  const editor=({type,index,label,key})=>{
    if(scope!=='edit'||!Number.isInteger(index)||index<0)return '';
    const role=`analysis-edit-${id}-${type}-${index}${type==='pact'&&key?'-'+key:''}`;
    return button('편집','edit-slot',`data-type="${type}" data-index="${index}"${key?` data-key="${esc(key)}"`:''} data-role="${esc(role)}" data-analysis-return="${esc(role)}" aria-label="${esc(label)} 편집"`);
  };
  const gear=gearChanges.length?`<details data-role="${scope}-gear-changes-${esc(id)}"><summary>장비·옵션 변화 · ${gearChanges.length}부위</summary><ul>${gearChanges.map(({label,before,after,replaced,options})=>
    `<li><strong>${esc(label)} · ${esc(replaced?`${before} → ${after}`:after)}</strong>${editor({type:'gear',index:SEASON_GEAR_SLOT_LABELS.indexOf(label),label})}${options.length?`<ul>${options.map(option=>`<li>${esc(option)}</li>`).join('')}</ul>`:''}</li>`).join('')}</ul></details>`:'';
  const boards=boardChanges.map(({section,rows})=>{
    const seen=new Set();
    return renderBoardOptionChanges(rows,esc,{
      before,after,label:(section==='hero'?'히어로·추억':BOARD_TITLES[section])+' 변화',role:`${scope}-board-changes-${section}-${id}`,
      renderAction:scope==='edit'?({editTarget})=>{
        if(!editTarget)return '';
        const key=`${editTarget.type}:${editTarget.index}:${editTarget.key??''}`;
        if(seen.has(key))return '';
        seen.add(key);
        return editor(editTarget);
      }:undefined,
    });
  }).join('');
  return gear+boards;
}
export function renderEditDpsComparison(s, compact = false) {
  const comparison = s.editComparison;
  if (!comparison?.changed) return '';
  if (s.pending.size) return '<section data-role="native-edit-comparison" hidden></section>';
  const assumed = preferredSeasonDpsMetric(s.report)==='assumedDps' && comparison.assumed;
  const selected=assumed||comparison;
  const {baseline,previous,previousDetails,encounterChanges,previousEncounterChanges} = selected;
  const metricLabel = assumed ? '방어 전 DPS' : 'DPS';
  const comparisonText = value => value.supported ? deltaText(value)
    : value.encounterMatches === false ? '전투 조건 변경' : '비교 보류';
  if (compact) {
    const change = compactSeasonEditDelta(assumed || comparison);
    if (change) return `<section class="native-edit-comparison is-compact" data-role="native-edit-comparison" aria-label="편집 전후 DPS 비교"><p>${change.previous?'직전 대비':'기준 대비'} <strong class="${change.value.delta>0?'is-increase':'is-decrease'}">${deltaText(change.value)}</strong></p></section>`;
    if (baseline.supported) return '';
    const hasComparison = encounterChanges?.length || s.report.fullDps.supported || Number.isFinite(baseline.value) || Number.isFinite(baseline.baseValue) || Number.isFinite(previous?.baseValue)
      || baseline.encounterMatches===false && s.report.assumedDps?.supported;
    return hasComparison ? `<section class="native-edit-comparison is-compact" data-role="native-edit-comparison" aria-label="편집 전후 DPS 비교">${button(baseline.encounterMatches===false?'전투 조건 변경':'비교 보류 이유', 'result-tab', 'data-tab="analysis" data-show-reasons="true"')}</section>` : '';
  }
  const loadout=comparison.loadoutChanges;
  const loadoutBaseline=loadout?renderLoadoutChanges(loadout.baseline,{before:'기준',after:'현재',scope:'edit',id:'baseline'}):'';
  const loadoutPrevious=loadout?.previous?renderLoadoutChanges(loadout.previous,{before:'직전',after:'현재',scope:'edit',id:'previous'}):'';
  const showPrevious=previous&&!previous.supported&&(JSON.stringify(previous.reasons)!==JSON.stringify(baseline.reasons)
    || previousEncounterChanges?.length&&JSON.stringify(previousEncounterChanges)!==JSON.stringify(encounterChanges));
  const renderDetails=({resources,breakdown,levelChanges,levelsFromPrevious},latest=false)=>{
    const labels={before:levelsFromPrevious?'직전':'기준',after:'현재'};
    const levels=renderSkillLevelChanges(levelChanges,esc,latest?{...labels,role:'edit-previous-levels'}:labels);
    const costs=resources?renderResourceChanges(resources,esc,{board:true}):'';
    const damage=breakdown?renderDamageBreakdown(breakdown,esc,labels)+renderDamageRouteChanges(breakdown.damageRoutes,
      latest?{...labels,role:'edit-previous-routes'}:labels):'';
    if(latest){
      const body=costs+levels+damage;
      return body?`<details data-role="edit-previous-details"><summary>직전 대비 변경 수치</summary>${body}</details>`:'';
    }
    return costs+levels+(damage?`<details data-role="edit-damage-breakdown"><summary>${breakdown.previous?'직전 대비':'기준 대비'} 변경 수치</summary>${damage}</details>`:'');
  };
  return `<section class="native-edit-comparison" data-role="native-edit-comparison" aria-label="편집 전후 DPS 비교">
    <h2>편집 전후 자동 비교</h2>
    ${comparison.changed ? `<p>기준 대비 <strong class="${baseline.supported ? baseline.delta > 0 ? 'is-increase' : baseline.delta < 0 ? 'is-decrease' : '' : ''}">${comparisonText(baseline)}</strong></p>
      ${previous ? `<p class="native-stat-note">직전 변경 ${comparisonText(previous)}</p>` : ''}` : ''}
    <dl class="native-condition-values"><div><dt>기준 ${metricLabel}</dt><dd>${number(baseline.baseValue)}</dd></div><div><dt>현재 ${metricLabel}</dt><dd>${number(baseline.value)}</dd></div></dl>
        ${loadoutBaseline}${loadoutPrevious?`<details data-role="edit-previous-loadout"><summary>직전 구성 변화</summary>${loadoutPrevious}</details>`:''}
        ${renderDetails(selected)}
        ${previousDetails?renderDetails(previousDetails,true):''}
        ${!baseline.supported ? `<details${s.showComparisonReasons?' open':''}><summary>기준 비교 보류 이유</summary>${renderEncounterChanges(encounterChanges,'baseline-encounter-changes',{editable:true})}${renderReasons(s,baseline.reasons)}</details>` : ''}
        ${showPrevious ? `<details><summary>직전 변경 비교 보류 이유</summary>${renderEncounterChanges(previousEncounterChanges,'previous-encounter-changes',{editable:true})}${renderReasons(s,previous.reasons)}</details>` : ''}
        ${button('현재 빌드를 비교 기준으로', 'reset-comparison')}
  </section>`;
}

function renderEncounterChanges(rows,role,{editable=false,savedId}={}){
  if(!rows?.length)return '';
  const value=(n,unit)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:6})+unit:typeof n==='string'?esc(n)+(n==='없음'?'':unit):'미입력';
  return `<ul aria-label="달라진 전투 조건" data-role="${role}">${rows.map(({label,a,b,edit,key,tab,unit,rowIndex,supportIndex})=>
    `<li>${esc(label.replace(/ \(%\)$/u,''))} <strong>${value(a,unit)} → ${value(b,unit)}</strong>
      ${editable&&edit?button('조건 수정',tab?'result-tab':'requirement',
        `${tab?'data-tab="conditions"':'data-section="combat"'} data-field="${esc(edit)}" data-field-key="${esc(key)}"${rowIndex===undefined?'':` data-row="${rowIndex}" data-support="${supportIndex}"`} aria-label="${esc(label)} 수정"`):''}
      ${savedId&&tab==='conditions'&&edit==='dps-input'?button('후보 조건 열기','open-saved-encounter-input',
        `data-id="${esc(savedId)}" data-field-key="${esc(key)}" aria-label="비교 빌드 ${esc(label)} 열기"`):''}</li>`).join('')}</ul>`;
}

function effectConditionFields(s, hasEffectOverrides) {
  const fields = [];
  const automaticFields = [];
  const nearby = [];
  const componentFields = new Map();
  const stacks = boundBlessingStacks(s.document.targetBuild);
  const targetNumbed=usesTargetNumbedInput(s.document.targetBuild,s.report);
  function add(control, owner, kind, attrs, automatic, detail, sources = [], aliases = []) {
    const value = control.value ?? '';
    const label = seasonConditionControlLabel(control) || (control.kind === 'count' ? '수량' : '조건 충족 여부');
    const description = detail && /[가-힣]/u.test(detail) && !/\p{Script=Han}/u.test(detail) ? detail : '';
    const grouped = sources.length > 1;
    const attributes = `data-season-edit="${kind}" data-key="${esc(control.key)}" ${attrs} aria-label="${esc(grouped ? label : owner + ' · ' + label)}"${aliases.length?` data-field-aliases="${esc(JSON.stringify(aliases))}"`:''}`;
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
      if (!componentFields.has(key)) componentFields.set(key,{control:c,row,automatic,sources:new Map(),aliases:new Set()});
      const field=componentFields.get(key);
      field.sources.set(row.path,{owner:row.name,path:row.path,group:row.group});
      if(c.key!==field.control.key)field.aliases.add(c.key);
    }
  }
  for (const {control,row,automatic,sources,aliases} of componentFields.values())
    add(control,row.name,'component-condition','',automatic,row.detail,[...sources.values()],[...aliases]);
  if(nearby.length)fields.unshift(renderNearbyEnemyField(nearby));
  for (const component of s.report.components.filter(c => c.category === 'supports')) {
    for (const entry of component.calculations ?? []) {
      for (const c of entry.conditionControls ?? []) {
        add(c, `${component.name} · 스킬 ${entry.rowIndex+1} / 보조 ${entry.supportIndex+1}`, 'support-condition',
          `data-row="${entry.rowIndex}" data-support="${entry.supportIndex}"`, c.automatic);
      }
    }
  }
  return fields.length || automaticFields.length || hasEffectOverrides ? `<section class="dock-effect-conditions">
    ${fields.length || hasEffectOverrides ? '<h2>효과 조건</h2>' : ''}
    ${hasEffectOverrides ? button('효과 조건 자동 복원','clear-effect-conditions') : ''}${fields.join('')}
    ${automaticFields.length ? `<details data-role="automatic-effect-conditions"><summary>자동 적용 효과</summary>${automaticFields.join('')}</details>` : ''}</section>` : '';
}

function skillConditionKeys(s, index, id) {
  if (index >= 5 || !s.report.coupledSkills.rows.some(row => row.rowIndex === index && row.id === id)) return [];
  const entry = seasonSkillSlotCalculation(s.report,index);
  if (!entry || entry.mechanics?.some(m => m.kind === 'utility-skill')) return [];
  return seasonDpsSkillFieldKeys(entry,id,s.document.targetBuild).filter(key => SEASON_DPS_SKILL_FIELDS[key]);
}

export function seasonCastShareSlots(s) {
  const shares=s.document.targetBuild.ss14Inputs.dps?.skills;
  const slots=s.report.coupledSkills.rows.filter(row=>skillConditionKeys(s,row.rowIndex,row.id).includes('useShare'))
    .map(({rowIndex,id})=>({rowIndex,id,value:shares?.[rowIndex]?.useShare}));
  if(slots.length<2)return slots;
  return slots.map(slot=>{
    const others=slots.filter(other=>other!==slot);
    if(others.some(({value})=>!Number.isFinite(value)))return slot;
    const remaining=Number((100-others.reduce((sum,{value})=>sum+value,0)).toFixed(9));
    if(remaining<0||(Number.isFinite(slot.value)&&Math.abs(remaining-slot.value)<=1e-8))return slot;
    return {...slot,remaining};
  });
}

export function renderResultConditions(s) {
  const inputs = s.document.targetBuild.ss14Inputs;
  const build = s.document.targetBuild;
  const hasEffectOverrides = Object.keys(inputs.componentConditions ?? {}).length > 0
    || Object.values(inputs.supports ?? {}).some(binding => Object.keys(binding.conditions ?? {}).length > 0);
  const hasManualConditions = hasSeasonDpsConditionOverrides(inputs.dps) || hasEffectOverrides;
  const shareOverflow=s.report.fullDps.manualResources?.shareOverflow??s.report.assumedDps?.manualResources?.shareOverflow;
  const shareSlots=seasonCastShareSlots(s);
  const showShares=shareSlots.length>1||Boolean(shareOverflow);
  const shareTotal=shareOverflow??shareSlots.reduce((sum,{value})=>sum+(Number.isFinite(value)?value:0),0);
  const missingShare=shareSlots.some(({value})=>!Number.isFinite(value));
  const castShares=showShares?`<fieldset><legend>스킬별 시전 시간 배분</legend>
    <p data-role="cast-share-allocation" tabindex="-1"${shareOverflow?' role="status"':''}>${missingShare?'입력된 ':''}시전 배분 ${number(shareTotal)}% / 최대 100%</p>
    ${shareSlots.map(({rowIndex,id,value,remaining})=>{
      const name=`${rowIndex+1}번 칸 · ${SS14_CARDS.records[id]?.name??'스킬'}`;
      const field=renderSeasonDpsField(`${rowIndex}:useShare`,{...SEASON_DPS_SKILL_FIELDS.useShare,
        label:name+' 시전 시간 배분 (%)'},value,'시전 배분');
      return field+(remaining===undefined?'':button(`${number(remaining)}%로 맞추기`,'balance-cast-share',
        `data-index="${rowIndex}" aria-label="${esc(name)} 시전 배분 ${number(remaining)}%로 맞추기"`));
    }).join('')}
    </fieldset>`:'';
  const periodicBurst=hasPeriodicBurstSupport(s.report.components);
  const sharedDots=s.report.fullDps.dotAllocationGroups??[];
  const sharedReaping=s.report.fullDps.reapingAllocationGroups??[];
  const sharedWindows=new Map();
  for(const group of [...s.report.fullDps.dotWindowGroups??[],...s.report.assumedDps?.dotWindowGroups??[]]) {
    const slots=sharedWindows.get(group.id)??new Map();
    for(const slot of group.slots)slots.set(slot.rowIndex,slot);
    sharedWindows.set(group.id,slots);
  }
  const groupedWindowRows=new Set();
  const windowInputs=[...sharedWindows].map(([id,slots])=>{
    const name=SS14_CARDS.records[id]?.name??'지속 대미지';
    const fields=[...slots.values()].sort((a,b)=>a.rowIndex-b.rowIndex).flatMap(({rowIndex,itemId})=>{
      if(groupedWindowRows.has(rowIndex))return [];
      groupedWindowRows.add(rowIndex);
      return [renderSeasonDpsField(`${rowIndex}:dotWindows`,{...SEASON_DPS_SKILL_FIELDS.dotWindows,
        label:`${rowIndex+1}번 칸 · ${SS14_CARDS.records[itemId]?.name??name} 적용 구간 (초)`},inputs.dps?.skills?.[rowIndex]?.dotWindows??'','지속 구간')];
    });
    return fields.length?`<fieldset data-role="dot-window-inputs-${esc(id)}"><legend>${esc(name)} · 슬롯별 적용 구간</legend>${fields.join('')}</fieldset>`:'';
  }).join('');
  const {overlaps,bounds:outOfBounds,sameSlot}=seasonDotWindowRepairs(s.report);
  const time=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:3});
  const windowAssignments=overlaps.map(({id,start,stop,slots})=>{
    const name=SS14_CARDS.records[id]?.name??'지속 대미지';
    return `<fieldset tabindex="-1" data-role="${esc(seasonDotWindowRole({id,start,stop}))}"><legend>${esc(name)} · ${time(start)}–${time(stop)}초 겹침</legend>
      <p>겹친 시간에 대미지를 준 슬롯을 선택하세요.</p>
      ${slots.map(index=>button(`${index+1}번 칸에 배정`,'assign-dot-window',`data-key="${esc(id)}" data-start="${start}" data-stop="${stop}" data-index="${index}"`)).join('')}</fieldset>`;
  }).join('');
  const windowBounds=[...new Set(outOfBounds.map(bound=>bound.rowIndex))].map(rowIndex=>{
    const ranges=outOfBounds.filter(bound=>bound.rowIndex===rowIndex);
    const {end}=ranges[0];
    const labels=ranges.map(({start,stop})=>`${time(start)}–${time(stop)}초`).join(', ');
    return `<div class="native-stat-note" tabindex="-1" data-role="dot-window-bound-${rowIndex}"><p>${rowIndex+1}번 칸 · ${labels} 구간이 측정 종료 ${time(end)}초를 넘습니다.</p>
      ${button('측정 종료까지만 유지','trim-dot-window',`data-index="${rowIndex}" data-end="${end}"`)}
      ${button('적용 구간 수정','result-tab',`data-tab="conditions" data-field="dps-input" data-field-key="${rowIndex}:dotWindows"`)}</div>`;
  }).join('');
  const windowMerges=sameSlot.map(rowIndex=>`<div tabindex="-1" data-role="dot-window-merge-${rowIndex}">
    ${button(`${rowIndex+1}번 칸의 겹친 구간 합치기`,'merge-dot-windows',`data-index="${rowIndex}"`)}
    ${button('적용 구간 수정','result-tab',`data-tab="conditions" data-field="dps-input" data-field-key="${rowIndex}:dotWindows"`)}</div>`).join('');
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
      ${slots.map(({rowIndex,itemId,overlap,fixed})=>renderSeasonDpsField(`${rowIndex}:reapingOverlap`,{...SEASON_DPS_SKILL_FIELDS.reapingOverlap,
        label:`${rowIndex+1}번 칸 · ${SS14_CARDS.records[itemId]?.name??name} 수확 시 적용 비율 (%)`},overlap??'','수확 배정',{fixedValue:fixed?'100% 자동':undefined})).join('')}</fieldset>`;
  }).join('');
  const skillFields = s.report.coupledSkills.rows.filter(row => row.rowIndex < 5).map(row => {
    const component = s.report.components.find(c => c.category === 'skills' && c.id === row.id);
    const keys = skillConditionKeys(s,row.rowIndex,row.id).filter(key=>!(key==='useShare'&&showShares)
      &&!(key==='dotWindows'&&groupedWindowRows.has(row.rowIndex))&&!sharedDots.some(group=>
      group.slots.some(slot=>slot.rowIndex===row.rowIndex&&(key===slot.field||key==='dotExclusive')))
      && !(key==='reapingOverlap'&&sharedReaping.some(group=>group.slots.some(slot=>slot.rowIndex===row.rowIndex))));
    const dpsRow=s.report.fullDps.rows.find(entry=>entry.rowIndex===row.rowIndex);
    const observation=dpsRow?.castCostObservation;
    const observedCosts=observation?`<fieldset data-role="observed-skill-cost-${row.rowIndex}"><legend>최종 소모 관측값</legend>
      <p>${observation.status==='stale'?'소모 조건이 바뀌었습니다. ':''}게임에서 한 번 사용할 때 소모하는 MP와 HP를 입력하세요. 소모하지 않는 자원은 0을 입력하세요.</p>
      ${observedSkillCostFields.map(key=>renderSeasonDpsField(`${row.rowIndex}:${key}`,SEASON_DPS_SKILL_FIELDS[key],
        observation.status==='stale'?'':inputs.dps?.skills?.[row.rowIndex]?.[key],'관측 소모')).join('')}</fieldset>`:'';
    if (!keys.length&&!observedCosts) return '';
    const minionMaximum = dpsRow?.minionMaximum;
    const sharedCommand = s.report.fullDps.observedCommandRow === row.rowIndex;
    return `<details data-role="dock-skill-conditions-${row.rowIndex}"><summary>${row.rowIndex === 0 ? '주력' : '액티브 ' + (row.rowIndex+1)} · ${esc(component.name)}</summary>
      ${keys.map(key=>renderSeasonDpsField(`${row.rowIndex}:${key}`, seasonDpsSkillFieldDefinition(row.id,key,row.terraChargeMaximum),
        key==='moonBaseManaCost'&&dpsRow?.moonCostStale?'':inputs.dps?.skills?.[row.rowIndex]?.[key], '조건 탭',
        {minionMaximum,sharedCommand,fixedValue:key==='reapingOverlap'&&dpsRow?.reapingOverlapFixed?'100% 자동':undefined})).join('')}
      ${observedCosts}
      <div class="native-slot-actions">${button('스킬 계산 보기','result-tab',`data-tab="calculation" data-index="${row.rowIndex}" data-focus-role="calculation-skill"`)}
      ${hasSeasonSkillConditionOverrides(inputs.dps,row.rowIndex)?button('이 스킬 조건 초기화','clear-skill-conditions',`data-index="${row.rowIndex}"`):''}</div></details>`;
  }).join('');
  const dummyComparison=s.pending?.size?null:s.dummyComparison;
  return `<section class="native-result-conditions" aria-label="적용 중인 전투 조건">
    ${renderTrainingDummyPicker(inputs.dps?.enemy)}
    ${dummyComparison?`<p class="native-stat-note" data-role="dummy-dps-comparison" role="status">허수아비 Lv.${dummyComparison.from} → Lv.${dummyComparison.to} · 전체 DPS <strong>${number(dummyComparison.before)} → ${number(dummyComparison.after)}</strong></p>`:''}
    ${Number.isFinite(s.report.fullDps.fixedErosionResistance)?`<p>대상 부식 저항 ${number(s.report.fullDps.fixedErosionResistance)}% 고정 적용 중</p>`:''}
    <details data-role="dock-enemy-defense"><summary>아머·저항·심화 직접 입력</summary><dl class="native-condition-values">${Object.keys(SEASON_DPS_ENEMY_FIELDS).filter(key=>key!=='numbedStacks').map(key => {
      const def = seasonDpsEnemyFieldDefinition(build, key);
      return `<div><dt><label for="dock-enemy-${key}">${esc(def.label)}</label></dt><dd><input id="dock-enemy-${key}" type="number" step="any" min="${def.min}" max="${def.max}" data-season-edit="dps-input" data-key="enemy:${key}" value="${esc(inputs.dps?.enemy?.[key])}" placeholder="미입력"></dd></div>`;
    }).join('')}</dl></details>
    ${renderFixedNumbedField(build,s.report,inputs.dps?.enemy?.numbedStacks)}
    <details data-role="dock-mana-observation"><summary>관측 MP 자연 회복</summary>${renderObservedManaInput(s.document,s.report)}</details>
    ${periodicBurst ? renderSeasonDpsField(PERIODIC_BURST_INPUT,SEASON_DPS_SKILL_FIELDS.periodicBurstUptime,readPeriodicBurstUptime(inputs.dps),'조건 탭') : ''}
    ${windowBounds}${windowMerges}${windowAssignments}${windowInputs}
    ${allocations}
    ${reapingAllocations}
    ${castShares}
    ${skillFields ? `<details data-role="dock-skill-conditions"><summary>스킬 조건</summary>${skillFields}</details>` : ''}${effectConditionFields(s,hasEffectOverrides)}
    <details data-role="dock-more-conditions"><summary>추가 전투 조건</summary>
    ${edit('대상·스킬 조건 전체', 'season-dps-input')}${edit('기본 속성', 'season-character-input')}${edit('기본 크리티컬', 'native-critical-input')}${edit('축복 중첩', 'native-blessing-input')}
    ${inputs.theaCycle || s.report.theaAverage ? `<h2>티아1 은총</h2><p>${inputs.theaCycle?.mode === 'automatic' ? `자동 주기 평균 · ${number(inputs.theaCycle.seconds)}초` : '현재 상태 직접 설정'}</p>
      ${s.report.theaAverage ? `<p>은총 유지율: ${s.report.theaAverage.supported ? `${number(s.report.theaAverage.uptime)}%` : '미지원'}</p>` : ''}
      ${edit('은총·추가 발동 조건 편집', 'season-thea-controls')}` : ''}
    ${edit('영약·특수 효과', 'native-extension-input')}
    ${hasManualConditions ? button('대상·스킬·효과 조건 초기화','clear-combat-conditions') : ''}</details>
  </section>`;
}

export function renderRemovedSkillSupports(removed){
  if(!removed?.length)return '';
  return `<div class="skill-removed-supports" data-role="skill-removed-supports"><strong>보조 해제 예정</strong><ul>${removed.map(({supportIndex,id,level})=>{
    const card=SS14_CARDS.records[id]??seasonSupportKoreanCard(id);
    const name=card?.season==='SS14'&&card.koreanTextVerified?card.name:'한국어 이름 미제공';
    return `<li>${supportIndex+1}번 · ${esc(name)} · Lv.${level}</li>`;
  }).join('')}</ul></div>`;
}

function renderUpgradeRanking(s,partial){
  const job=s.pending.size?null:s.upgrades;
  const group=s.upgradeGroup??'all';
  const manaReplacement=group==='manaReplacement';
  const replacement=group==='replacement'||manaReplacement;
  const equipment=replacement||group==='legendary';
  const source=s.upgradeSource??'all';
  const equipmentSlot=(replacement?s.replacementSlot:s.upgradeSlot)??'all';
  const canAssemble=replacement&&!manaReplacement&&s.upgradeResultDirection!=='nonImproving'&&source==='shelf'&&equipmentSlot==='all';
  const locked=s.lockedEquipmentSlots??[];
  const slots=(selected)=>[['all','전체 부위'],...SEASON_GEAR_SLOT_LABELS.map((n,i)=>[String(i),n])].map(([v,n])=>`<option value="${v}"${v===selected?' selected':''}>${esc(n)}</option>`).join('');
  const active=s.document.targetBuild.skills?.active??[];
  const damageRows=s.report[partial?'fullDps':preferredSeasonDpsMetric(s.report)]?.rows;
  const skillReplacement=group==='skillReplacement';
  const skillAnalysis=group==='skills'||skillReplacement;
  const skillOptions=skillAnalysis?active.flatMap((row,i)=>
    row?.skillId&&damageRows?.some(d=>d.rowIndex===i&&d.id===row.skillId&&(!partial||d.supported))
      ? [{id:String(i),label:`${i===0?'주력':'액티브 '+(i+1)} · ${s.report.components.find(c=>c.category==='skills'&&c.id===row.skillId)?.name??'한국어 이름 미제공'}`}]
      : []):[];
  const chosenSkill=skillOptions.some(row=>row.id===s.upgradeSkill);
  const skillUnavailable=skillReplacement?!chosenSkill:group==='skills'&&s.upgradeSkill!=null&&s.upgradeSkill!=='all'&&!chosenSkill;
  const rankingDetails=(row,labels,routeRole,summary)=>{
    const breakdown=row.breakdown?renderDamageBreakdown(row.breakdown,esc,labels)
      +renderDamageRouteChanges(row.breakdown.damageRoutes,{...labels,role:routeRole}):'';
    const details=breakdown+renderSkillLevelChanges(row.levels??[],esc,labels);
    return details?`<details data-role="ranking-damage-changes"><summary>${summary}</summary>${details}</details>`:'';
  };
  let content='';
  if(job?.busy)content=`<p role="status"><span data-upgrade-phase>${job.phase==='gear-combinations'?'장비 조합 계산 중':'계산 중'}</span> <span data-upgrade-progress>${job.checked} / ${job.total}</span></p>${button('계산 중지','rank-cancel')}`;
  else if(job?.error)content=`<p role="alert">${esc(job.error)}</p>`;
  else if(job?.reasons?.length)content=`<details data-role="analysis-ranking-blockers" open><summary>${group==='skills'&&s.upgradeSkill&&s.upgradeSkill!=='all'?'선택 스킬 분석 보류':partial?'부분 DPS 비교 보류':'전체 DPS 비교 보류'}</summary>${renderReasons(s,job.reasons)}</details>`;
  else if(job?.impacts) {
    const metricLabel=job.partial?'부분 DPS · 미지원 제외':job.metric==='assumedDps'?'방어 전 DPS':'전체 DPS';
    content=job.impacts.length?`<p>장착 중 ${metricLabel} <strong>${number(job.base)}</strong></p><ul class="upgrade-ranking">${job.impacts.map(row=>
      `<li>${button(esc(row.label+(row.name?' · '+row.name:'')),'inspect-gear',`data-index="${row.slotIndex}"`)}
      ${row.reasons.length?`<details><summary>비교 보류</summary>${renderReasons(s,row.reasons)}</details>`:
        `<div>해제 시 ${number(row.value)} · 기여 <strong>${row.delta>0?'+':''}${number(row.delta)} DPS</strong></div>
        ${rankingDetails(row,{before:'장착 중',after:'해제 후'},`gear-impact-damage-routes-${row.slotIndex}`,'해제 전후 상세')}
        ${row.resources?renderResourceChanges({...row.resources,dpsBasis:job.metric},esc,{board:true,action:'해제'}):''}`}
      ${button('교체 후보 비교','rank-slot-replacement',`data-index="${row.slotIndex}" data-from-impact aria-label="${esc(row.label)} 교체 후보 비교"${locked.includes(row.slotIndex)?' disabled':''}`)}</li>`).join('')}</ul>`:'<p>비교할 장착 장비가 없습니다.</p>';
  }
  else if(job){
    const metricLabel=job.partial?'부분 DPS · 미지원 제외':job.metric==='assumedDps'?'방어 전 DPS':'전체 DPS';
    const skillMetricLabel=job.metric==='assumedDps'?'선택 스킬 방어 전 DPS':'선택 스킬 DPS';
    const signed=n=>(n>0?'+':'')+number(n);
    const candidate=(r,index,label)=>{
      const options=r.optionChanges??[];
      const optionList=options.length?`<ul aria-label="교체 옵션 변화">${options.map(change=>`<li>${esc(change)}</li>`).join('')}</ul>`:'';
      const optionChanges=options.length>3?`<details><summary>옵션 변화 ${options.length}개</summary>${optionList}</details>`:optionList;
      return `<strong>${esc(r.label)}</strong>${r.detail?`<div>${esc(r.detail)}</div>`:''}
      ${optionChanges}${renderRemovedSkillSupports(r.removedSupports)}
      ${r.manaImpact?`<div>수동 시전 MP/초 ${number(r.manaImpact.base)} → <b>${number(r.manaImpact.value)}</b></div>
      <strong class="native-comparison-delta">−${number(r.manaImpact.saved)} MP/초</strong>
      <div class="native-stat-note">${metricLabel} ${number(job.base)} → ${number(r.value)} (${signed(r.delta)})</div>`:
      r.skillImpact?`<div>${skillMetricLabel} ${number(r.skillImpact.base)} → <b>${number(r.skillImpact.value)}</b></div>
      <strong class="native-comparison-delta">${signed(r.skillImpact.delta)} DPS</strong>
      <div class="native-stat-note">${metricLabel} ${number(job.base)} → ${number(r.value)} (${signed(r.delta)})</div>`:
        `<div>${metricLabel} ${number(job.base)} → <b>${number(r.value)}</b></div><strong class="native-comparison-delta">${signed(r.delta)} DPS${r.percent==null?'':' ('+signed(r.percent)+'%)'}</strong>`}
      ${rankingDetails(r,{before:'변경 전',after:'변경 후'},`ranking-damage-routes-${index}`,'대미지 변화')}
      ${r.resources?renderResourceChanges({...r.resources,dpsBasis:job.metric},esc,{board:true}):''}
      ${r.hypothetical?'':`<div class="native-slot-actions">${button(r.saved?'저장된 사본 열기':'사본 열기','rank-open-copy',`data-index="${index}" data-role="rank-open-copy-${index}" aria-label="${label} ${r.saved?'저장된 사본 열기':'사본 열기'}"`)}${r.saved?'':button('사본 저장','rank-copy',`data-index="${index}" aria-label="${label} 사본 저장"`)}</div>`}`;
    };
    const {query='',inputOnly=false,exclusionsOpen=false}=job.blockedFilter??{};
    const matches=pickerSearchMatcher(query,true);
    const rankedLabel=row=>[row.label,row.detail,...(row.optionChanges??[])].filter(Boolean).join(' ');
    const ranked=(job.rankedRows??job.rows).map((row,index)=>({row,index,label:rankedLabel(row)}));
    const matching=ranked.filter(({label})=>matches(label));
    const visibleRanked=matching.length>0;
    const rankedLimit=job.rankedLimit??RANKED_CANDIDATE_PAGE_SIZE;
    const nextRanked=matching[rankedLimit]?.index;
    const rows=matching.slice(0,rankedLimit).map(({row,index,label})=>`<li value="${index+1}" data-ranked-candidate="${esc(label)}" data-role="ranked-candidate-${index}" tabindex="-1">${candidate(row,index,(index+1)+'위')}</li>`).join('');
    const blockedType=skillReplacement?'스킬':'장비';
    const candidateReason=reason=>{
      const text=reason.replace(/^현재: /u,'');
      const effect=/^(조건·대상·수치 미확인|전체 공격 계산에 연결되지 않은 효과): (.+)$/su.exec(text);
      return effect&&(!/[가-힣]/u.test(effect[2])||/\p{Script=Han}/u.test(effect[2]))
        ? effect[1]+' · 한국어 원문 미제공' : text;
    };
    const blocked=(skillReplacement?job.blockedSkills:job.blockedGear)??[];
    const blockedLabel=row=>row.label+' '+(row.detail??'');
    const blockedVisible=row=>matches(blockedLabel(row))&&(!inputOnly||row.needsInput);
    const matchingBlocked=blocked.flatMap((row,index)=>blockedVisible(row)?[{row,index}]:[]);
    const blockedLimit=job.blockedLimit??BLOCKED_CANDIDATE_PAGE_SIZE;
    const nextBlocked=matchingBlocked[blockedLimit]?.index;
    const trialButtons=(row,index)=>{
      if(!row.canOpen)return '';
      const action=skillReplacement?'rank-skill-trial':'rank-gear-trial';
      const attrs=`data-index="${index}"`;
      return row.inputs?.length?`<div class="native-slot-actions">${row.inputs.map((input,i)=>button(esc(input.label),action,
        `${attrs} data-input="${i}" data-role="rank-blocked-trial-${index}${i?'-'+i:''}" aria-label="${esc(row.label+' · '+input.label)}"`)).join('')}</div>`
        :button('시험 사본 열기',action,`${attrs} data-role="rank-blocked-trial-${index}" aria-label="${esc(row.label)} 시험 사본 열기"`);
    };
    const blockedCandidates=matchingBlocked.slice(0,blockedLimit).map(({row,index})=>{
      const showInputs=row.needsInput&&(inputOnly||Boolean(query.trim())&&matchingBlocked.length===1);
      const actions=trialButtons(row,index);
      return `<li data-blocked-candidate-name="${esc(blockedLabel(row))}"${row.needsInput?' data-blocked-candidate-needs-input':''}><details${!showInputs&&index===job.openBlockedCandidate?' open':''}><summary data-role="rank-blocked-candidate-${index}">${esc(row.label)}${row.needsInput?' · 입력 필요':''}</summary>
        ${row.detail?`<p>${esc(row.detail)}</p>`:''}${renderRemovedSkillSupports(row.removedSupports)}
        <ul>${[...new Set(row.reasons.map(candidateReason))].map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>
        ${showInputs?'':actions}</details>${showInputs?actions:''}</li>`;
    }).join('');
    const resources=job.resources?.map((r,index)=>`<li><span>${esc(r.label)} · ${r.from} → ${r.to}<br><small>${metricLabel} ${number(r.fromDps)} → ${number(r.toDps)}</small></span><b>${signed(r.delta)} DPS</b>
      ${r.edit?button('입력','rank-resource-input',`data-index="${index}" aria-label="${esc(r.label)} 입력으로 이동"`):''}</li>`).join('');
    const reasons=job.blockedReasons?.length?`<ul>${job.blockedReasons.map(r=>`<li>${esc(r.reason)} · ${r.count}건</li>`).join('')}</ul>`:'';
    const empty=job.nonImproving?'DPS가 같거나 낮아지는 후보 없음':equipment&&job.assembled?'한 부위만 바꿔 DPS가 오르는 후보 없음'
      :job.checked===0?'선택한 대상에 비교할 후보 없음':job.checked===job.blocked?'비교 가능한 후보 없음':manaReplacement?'DPS를 유지하면서 MP 소모가 줄어드는 후보 없음':(job.skillIndex!=null?skillMetricLabel:metricLabel)+'가 오르는 후보 없음';
    const combination=job.assembled&&!job.nonImproving
      ? `<article class="upgrade-combination" aria-label="${esc(job.assembled.label)}">${candidate(job.assembled,'assembled',esc(job.assembled.label))}</article>` : '';
    const equipmentComparisons=job.equipmentComparisons;
    const combinationCount=equipmentComparisons?.checked
      ? `장비 조합 ${number(equipmentComparisons.checked-equipmentComparisons.blocked)}/${number(equipmentComparisons.checked)}건 비교` : '함께 바꿀 수 있는 장비 조합 없음';
    const comparisonScope=job.equipmentSearch&&job.equipmentSearch!=='exhaustive'
      ? ` · ${job.equipmentSearch==='triples'?'세':'두'} 부위까지 탐색, 이후 순차 비교` : '';
    const blockedLabelText=equipmentComparisons?.blocked
      ? `비교 보류 · 개별 ${number(job.blocked-equipmentComparisons.blocked)}건 · 조합 ${number(equipmentComparisons.blocked)}건`
      : `비교 보류 ${job.blocked}건`;
    content=`${combination}
      ${equipmentComparisons?`<p class="native-stat-note" data-role="equipment-comparison-count">${combinationCount}${comparisonScope}</p>`:''}
      <h3>${job.nonImproving?'DPS 동일·하락':UPGRADE_GROUPS[group]} ${query.trim()?'검색 결과':'Top 20'}</h3>
      ${ranked.length>1||blocked.length?`<label>결과 검색<input type="search" data-ranking-search value="${esc(query)}" data-role="ranking-search" placeholder="이름·옵션 검색"></label>`:''}
      ${query.trim()&&visibleRanked?`<p role="status">${matching.length}개 일치</p>`:''}
      ${rows?`<ol class="upgrade-ranking">${rows}</ol>`:`<p role="status">${ranked.length?'검색에 맞는 추천 없음':empty}</p>`}
      ${nextRanked!==undefined?button(`추천 더 보기 · ${rankedLimit}/${matching.length}`,'rank-more',`data-index="${nextRanked}"`):''}
      ${resources?`<details data-role="rank-resource-values"><summary>자원 1단위당 DPS</summary><ul class="upgrade-resource-list">${resources}</ul></details>`:''}
      ${reasons?`<details data-role="ranking-exclusions"${exclusionsOpen||inputOnly||Number.isInteger(job.openBlockedCandidate)||query.trim()&&!visibleRanked&&matchingBlocked.length?' open':''}><summary>${blockedLabelText}</summary>
      ${blocked.length?`<label class="analysis-roll-toggle"><input type="checkbox" data-role="ranking-input-only" data-blocked-candidate-input-only${inputOnly?' checked':''}>입력 가능한 후보만</label>
      ${blockedCandidates?`<ul class="upgrade-blocked-skills" aria-label="보류 ${blockedType}">${blockedCandidates}</ul>`:'<p role="status">검색 결과 없음</p>'}
      ${nextBlocked!==undefined?button(`더 보기 · ${blockedLimit}/${matchingBlocked.length}`,'rank-blocked-more',`data-index="${nextBlocked}"`):''}
      <details data-role="ranking-exclusion-reasons"><summary>사유별 집계</summary>${reasons}</details>`:reasons}</details>`:''}`;
  }
  return `<section aria-label="${partial?'부분 DPS 추천':'전체 DPS 추천'}"><h2 tabindex="-1" data-role="upgrade-ranking-heading">${partial?'부분 DPS 분석':'DPS 분석'}</h2>
    <div class="analysis-filters">
    <label>분석 유형<select data-upgrade-group>${Object.entries(UPGRADE_GROUPS).map(([key,label])=>`<option value="${key}"${key===group?' selected':''}>${label}</option>`).join('')}</select></label>
    ${equipment||group==='gear'||group==='craft'?`<label>장비 부위<select ${replacement?'data-replacement-slot':'data-upgrade-slot'}>${slots((replacement?s.replacementSlot:s.upgradeSlot)??'all')}</select></label>`:''}
    ${equipment?`<label>후보 출처<select data-upgrade-source>${Object.entries(GEAR_UPGRADE_SOURCES).map(([key,label])=>`<option value="${key}"${key===source?' selected':''}>${label}</option>`).join('')}</select></label>`:''}
    ${equipment?`<label>장비 이름<input type="search" data-upgrade-gear-name data-role="upgrade-gear-name" value="${esc(s.upgradeGearName??'')}" placeholder="전체 장비"></label>`:''}
    ${equipment&&!manaReplacement||skillReplacement?`<label>결과<select data-upgrade-result-direction data-role="upgrade-result-direction" aria-label="분석 결과 범위"><option value="improving">DPS 상승</option><option value="nonImproving"${s.upgradeResultDirection==='nonImproving'?' selected':''}>DPS 동일·하락</option></select></label>`:''}
    ${equipment&&source!=='shelf'?`<label class="analysis-roll-toggle"><input type="checkbox" data-upgrade-corrosion${s.includeUpgradeCorrosion?' checked':''}>침식 효과도 비교</label>`:''}
    ${canAssemble?`<label class="analysis-roll-toggle"><input type="checkbox" data-assemble-equipment${s.assembleEquipment?' checked':''}>보관함 장비 조합도 비교</label>`:''}
    ${equipment?`<details data-role="equipment-locks"><summary>유지할 장비 부위${locked.length?' · '+locked.length+'개':''}</summary>
      ${SEASON_GEAR_SLOT_LABELS.map((label,index)=>`<label class="analysis-roll-toggle"><input type="checkbox" data-role="locked-equipment-slot-${index}" data-lock-equipment-slot="${index}"${locked.includes(index)?' checked':''}>${esc(label)}</label>`).join('')}</details>`:''}
    ${group==='gear'?`<label class="analysis-roll-toggle"><input type="checkbox" data-assemble-rolls${s.assembleRolls?' checked':''}>현재 옵션의 범위 조합 비교</label>`:''}
    ${group==='craft'?`<label>제작 등급<select data-upgrade-craft-tier data-role="upgrade-craft-tier">${CRAFT_RANK_TIERS.map(tier=>`<option value="${tier}"${tier===(s.upgradeCraftTier??'1')?' selected':''}>T${tier}</option>`).join('')}</select></label>`:''}
    ${group==='craft'?`<label>제작 수치<select data-upgrade-craft-maximum data-role="upgrade-craft-maximum"><option value="default">제작 기본값</option><option value="maximum"${s.upgradeCraftMaximum?' selected':''}>범위 상한</option></select></label>`:''}
    ${group==='craft'&&s.upgradeSlot&&s.upgradeSlot!=='all'?`<label class="analysis-roll-toggle"><input type="checkbox" data-assemble-craft${s.assembleCraft?' checked':''}>제작 옵션 조합도 비교</label>`:''}
    ${skillAnalysis?`<label>액티브 스킬<select data-upgrade-skill><option value="all"${skillReplacement?' disabled':''}${chosenSkill?'':' selected'}>${skillReplacement?'교체할 스킬 칸 선택':'전체 액티브'}</option>${skillOptions.map(({id,label})=>`<option value="${id}"${id===s.upgradeSkill?' selected':''}>${esc(label)}</option>`).join('')}${skillUnavailable&&!skillReplacement?`<option value="" selected disabled>분석할 스킬을 다시 선택하세요</option>`:''}</select></label>`:''}
    ${button('분석 시작',replacement?'rank-gear':'rank-options',s.pending.size||job?.busy||skillUnavailable||equipment&&locked.length===SEASON_GEAR_SLOT_LABELS.length?'disabled':'')}
    </div>
    <div data-upgrade-results>${content}</div>
    <details><summary>분석 기준</summary><p>${manaReplacement?'DPS가 유지되거나 오르는 후보를 수동 시전 MP 절감량 순으로 표시합니다. HP 소모로 전환된 경우에는 초당 HP 변화도 확인할 수 있습니다.':skillReplacement?'같은 칸에서 기본 레벨, 시전 시간 배분, 적중률을 유지하고 전체 빌드 DPS를 비교합니다. 연결할 수 없는 보조는 해제됩니다.':group==='unit'?'SS14에서 확인한 옵션을 하나씩 1단위 추가해 계산합니다.':equipment?'도감은 옵션 범위 상한, 보관함은 저장된 수치를 사용합니다.':group==='gearImpact'?'장비를 한 부위씩 해제해 DPS와 MP·HP 변화를 비교합니다.':group==='gear'?'옵션 수치를 한 단위씩 바꿉니다. 범위 조합은 양 끝값을 차례로 비교합니다.':group==='craft'?'선택한 등급의 제작 기본값 또는 범위 상한을 씁니다. 상한 비교에는 장착 중인 같은 등급의 옵션도 포함됩니다. 조합은 DPS가 가장 많이 오르는 옵션부터 비교합니다.':'선택한 수치나 레벨을 한 단계 바꿔 DPS를 비교합니다.'}</p></details></section>`;
}

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
function renderHitTargetDefense(row, enemy, averaged) {
  const minion=row?.minionPools?.some(pool=>pool.defense);
  if(!row?.supported)return '';
  const distinct=new Map();
  for(const pool of minion?row.minionPools:row.pools??[]){
    if(!pool.defense)continue;
    const key=`${pool.weaponSlot??''}:${pool.type}`;
    if(!distinct.has(key))distinct.set(key,pool);
  }
  if(!distinct.size)return '';
  const percent=value=>number(value)+'%';
  const points=value=>number(value)+'%p';
  const pools=[...distinct.values()];
  const types=pools.map(pool=>{
    const d=pool.defense, type=damageTypes[pool.type]??'기타';
    const hand=pool.weaponSlot===0?'메인 무기':pool.weaponSlot===1?'서브 무기':'';
    const rows=calcRows([
      ['대상 아머',number(d.armor)],['관통 전 아머 감면',percent(d.armorReduction*100)],
      ...(d.armorPenetration?[['아머 감면 관통',points(d.armorPenetration)]]:[]),
      ...(d.projectilePen?[['투사체 아머 관통',points(d.projectilePen)]]:[]),
      ...((d.armorPenetration||d.projectilePen)?[['유효 아머 감면',percent((1-pool.armorMultiplier)*100)]]:[]),
      ...resistanceRows(d.resistance),
      [type+' 아머 / 저항 배율','×'+number(pool.armorMultiplier)+' / ×'+number(pool.resistanceMultiplier)],
    ]);
    return distinct.size===1?rows:calcGroup([hand,type].filter(Boolean).join(' · '),'',rows);
  }).join('');
  const dummy=matchingTrainingDummy(enemy);
  const poolTypes=new Set(pools.map(pool=>pool.type));
  const [onlyType]=poolTypes;
  const fixed=pools.some(pool=>pool.defense.resistance?.fixed);
  const field=poolTypes.size===1&&(onlyType==='physical'||fixed?'armor':onlyType);
  const destination=field&&Object.hasOwn(SEASON_DPS_ENEMY_FIELDS,field)?` data-field="dps-input" data-field-key="enemy:${field}"`:'';
  const edit=button('대상 방어 수정','result-tab',`data-tab="conditions" data-focus-role="dock-enemy-defense"${destination}`);
  const title=averaged?'전투 시작 시 적중 대상 방어':'적중 대상 방어';
  return calcGroup(minion?`소환체 ${title}`:title,dummy?`${dummy.level}레벨 허수아비`:'',types+edit,'target-mitigation-breakdown');
}
function renderDotDefense(defense,elapsed,{label,role,assumed}) {
  if(!defense)return '';
  const body=d=>calcRows([['대상 심화',number(d.affliction)],['심화 대미지 배율','×'+number(d.afflictionMultiplier)],
    ...(d.resistances.length===1?resistanceRows(d.resistances[0]).map(([label,value],i)=>
      [i===0?label.replace('저항',`${damageTypes[d.resistances[0].type]} 저항`):label,value]):[])])
    +(d.resistances.length>1?d.resistances.map(r=>calcGroup(damageTypes[r.type]??'기타','',calcRows(resistanceRows(r)))).join(''):'');
  const states=defense.states;
  if(states&&elapsed?.states?.length!==states.length)return '';
  const detail=states ? elapsed.states.map(({active,uptime},i)=>calcGroup(
    active.map((on,j)=>on?elapsed.rows[j].name:'').filter(Boolean).join(' · ')||'영약 비활성',number(uptime)+'%',body(states[i]))).join('') : body(defense);
  const resistances=(states??[defense]).flatMap(state=>state.resistances);
  const types=new Set(resistances.filter(r=>!r.fixed).map(r=>r.type));
  const [type]=types;
  const edit=(name,key)=>button(name,'result-tab',`data-tab="conditions" data-focus-role="dock-enemy-defense"${key?` data-field="dps-input" data-field-key="enemy:${key}"`:''}`);
  const resistanceEdit=types.size===1?edit(`${damageTypes[type]} 저항 수정`,type):types.size?edit('저항 수정',''):'';
  return detail?calcGroup(label,assumed?'방어 전 DPS':'',detail+`<div class="skill-calc-actions">${edit('심화 수정','affliction')}${resistanceEdit}</div>`,role):'';
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
function renderAddedHitSources(trace, directSources, hand, rolePrefix='') {
  const efficiency=trace?.find(e=>e.stage==='added-damage'&&e.stat==='added-damage-effectiveness');
  const addRow=(type,min,max,source)=>[`${damageTypes[type]} 추가 대미지 · 전환 전`,min===max?number(min):`${number(min)} – ${number(max)}`,conversionSource(source)];
  const sources=(trace??[]).flatMap(e=>{
    if(e.stage!=='added-damage')return [];
    const type=/^supported-skill-added-(physical|fire|cold|lightning|erosion)-damage-min$/u.exec(e.stat)?.[1];
    const {min,max}=e.contribution??{};
    if(!type||!Number.isFinite(min)||!Number.isFinite(max)||max<=0)return [];
    return [addRow(type,min,max,e.effectSource??undefined)];
  });
  const factor=Number.isFinite(efficiency?.resolvedValue)&&efficiency.contribution?.max>0;
  if(!factor&&!sources.length)return '';
  if(factor){
    const scale=efficiency.resolvedValue/100;
    sources.unshift(['추가 대미지 효율',number(efficiency.resolvedValue)+'%',conversionSource(efficiency.effectSource??undefined)]);
    for(const {type,min,max,source} of directSources??[]){
      if(Number.isFinite(min)&&Number.isFinite(max)&&min<=max&&max>0) sources.push(addRow(type,min*scale,max*scale,source));
    }
  }
  const title=hand===undefined?'추가 대미지 효율·출처':`${hand===0?'메인':'서브'} 무기 · 추가 대미지 효율·출처`;
  return calcGroup(title,'',calcRows(sources),rolePrefix+(hand===undefined?'hit-added-sources':`hit-added-sources-${hand}`));
}
function renderElixirAddedDamage(data) {
  if(!data)return '';
  const renderEntry=({groups,sources},prefix)=>groups.map(({slotIndex,trace})=>renderAddedHitSources(trace,sources,slotIndex,prefix)).join('');
  const entries=data.states.map(state=>renderEntry(state));
  if(!entries.some(Boolean))return '';
  if(entries.every(entry=>entry===entries[0]))
    return calcGroup('모든 영약 상태의 추가 적중 출처','',entries[0],'elixir-added-hit-sources');
  return calcGroup('영약 상태별 추가 적중 출처','',data.states.map(({active,uptime},index)=>
    calcGroup(data.names.map((name,j)=>name+' '+(active[j]?'활성':'비활성')).join(' · '),number(uptime)+'%',
      renderEntry(data.states[index],`elixir-phase-${index}-`)||'<p>적용된 추가 적중 없음</p>',`elixir-added-hit-phase-${index}`)).join(''),
    'elixir-added-hit-sources');
}
const damageRouteAmount = ({min,max}={}) => Number.isFinite(min)&&Number.isFinite(max)
  ? number(min)+(min===max?'':'–'+number(max)) : '';
export function renderSkillConversion(trace,index) {
  const conversions=(trace??[]).filter(e=>e.stage==='conversion'&&e.effectivePercent>0&&damageTypes[e.sourceType]&&damageTypes[e.targetType]);
  const route=e=>`${damageTypes[e.sourceType]} → ${damageTypes[e.targetType]}`;
  const percent=e=>number(e.effectivePercent)+'%';
  const moved=e=>e.movedBaseDamage?' · 보정 전 전환량 '+damageRouteAmount(e.movedBaseDamage):'';
  const converted=conversions.length?calcGroup('대미지 전환',conversions.length===1?`${route(conversions[0])} ${percent(conversions[0])}`:'',
    calcRows(conversions.map(e=>[[e.actionName,route(e)].filter(Boolean).join(' · '),percent(e)+(Math.abs(e.effectivePercent-e.resolvedValue)>1e-8?` (원래 ${number(e.resolvedValue)}%)`:'')+moved(e),conversionSource(e.effectSource??undefined)])),`skill-conversion-${index}`):'';
  const gains=(trace??[]).filter(e=>e.stage==='gained-as-extra'&&e.resolvedValue>0
    && (damageTypes[e.sourceType]||e.sourceType==='non-erosion')&&damageTypes[e.targetType]);
  const gainedLabel=e=>`${damageTypes[e.sourceType]??'부식 이외'} → ${damageTypes[e.targetType]} +${number(e.resolvedValue)}%`;
  const extra=gains.length?calcGroup('대미지 추가 획득',gains.length===1?gainedLabel(gains[0]):'',
    calcRows(gains.map(e=>[[e.actionName,gainedLabel(e)].filter(Boolean).join(' · '),
      e.gainedBaseDamage?'보정 전 획득량 '+damageRouteAmount(e.gainedBaseDamage):'',conversionSource(e.effectSource??undefined)])),`skill-gain-${index}`):'';
  return converted+extra;
}
function renderExcludedHitRoutes(effects, role='selected-skill-excluded-hit-routes') {
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
    role);
}

export function renderElixirDamageRoutes(routes,index) {
  if (!routes) return '';
  const empty='<p>적용된 전환·추가 획득 없음</p>';
  const bodies=routes.states.map((state,i)=>state.groups.map(({slotIndex,trace})=>
    ({slotIndex,body:renderSkillConversion(trace,`${index}-elixir-${i}-${slotIndex??'all'}`)})));
  if (!routes.measured&&!bodies.some((state,i)=>routes.states[i].variable||routes.states[i].excluded?.length||state.some(group=>group.body))) return '';
  return calcGroup('영약 상태별 대미지 전환·추가 획득','',routes.states.map(({active,uptime,variable,excluded},i)=>{
    const applied=bodies[i].map(({slotIndex,body})=>slotIndex===undefined?body:
      `<h4>${slotIndex===0?'메인 무기':'서브 무기'}</h4>${body||empty}`).join('');
    const detail=variable?'<p>이 구간의 다른 전투 효과에 따라 전환·추가 획득이 달라집니다.</p>'
      :applied+renderExcludedHitRoutes(excluded,`elixir-excluded-hit-routes-${index}-${i}`);
    return calcGroup(routes.names.map((name,j)=>name+' '+(active[j]?'활성':'비활성')).join(' · '),
      number(uptime)+'%',detail||empty,`selected-skill-elixir-route-${index}-${i}`);
  }).join(''),
    `selected-skill-elixir-damage-routes-${index}`);
}
export function renderWeaponDamageRoutes(hands,index) {
  const groups=hands?.map(({slotIndex,trace})=>({slotIndex,body:renderSkillConversion(trace,`${index}-weapon-${slotIndex}`)}));
  if(!groups?.some(group=>group.body))return '';
  return calcGroup('무기별 대미지 전환·추가 획득','',groups.map(({slotIndex,body})=>
    `<h4>${slotIndex===0?'메인 무기':'서브 무기'}</h4>${body||'<p>적용된 전환·추가 획득 없음</p>'}`).join(''),
    `weapon-damage-routes-${index}`);
}
function damageRouteAmountChanges(before,after,perWeapon=false) {
  if (!before || !after || !perWeapon && (!before.length || !after.length)) return null;
  const identity=({stage,sourceType,targetType,actionName,effectSource})=>
    JSON.stringify([stage,sourceType,targetType,actionName,effectSource]);
  const older=new Map(before.map(edge=>[identity(edge),edge]));
  const newer=new Map(after.map(edge=>[identity(edge),edge]));
  if (older.size!==before.length || newer.size!==after.length) return null;
  const rows=[...new Set([...newer.keys(),...older.keys()])].map(key=>{
    const previous=older.get(key), current=newer.get(key), edge=current??previous;
    const converted=edge.stage==='conversion';
    const amount=row=>damageRouteAmount(converted?row.movedBaseDamage:row.gainedBaseDamage);
    const percent=row=>(converted?'':'+')+number(converted?row.effectivePercent:row.resolvedValue)+'%'
      +(converted&&Math.abs(row.effectivePercent-row.resolvedValue)>1e-8?` (원래 ${number(row.resolvedValue)}%)`:'');
    const amountA=previous?amount(previous):'', amountB=current?amount(current):'';
    const percentA=previous?percent(previous):'', percentB=current?percent(current):'';
    const stable=percentA===percentB;
    const from=damageTypes[edge.sourceType]??(edge.sourceType==='non-erosion'?'부식 이외':'');
    const to=damageTypes[edge.targetType];
    if (!from || !to || previous&&!amountA || current&&!amountB) return null;
    const label=[edge.actionName,`${from} → ${to}${stable?' '+percentB:''}`,converted?'전환':'추가 획득'].filter(Boolean).join(' · ');
    const cell=(row,rate,value)=>!row?'미적용':stable?value:`${rate} · ${value}`;
    return {label,source:conversionSource(edge.effectSource??undefined),a:cell(previous,percentA,amountA),b:cell(current,percentB,amountB),
      matched:Boolean(previous&&current)};
  });
  if (rows.some(row=>!row)) return null;
  const changes=rows.filter(row=>row.a!==row.b);
  return perWeapon||changes.some(row=>row.matched)?changes:null;
}
export function renderDamageRouteChanges(rows,{before='장착 전',after='장착 후',role='damage-route-changes'}={}) {
  if(!rows?.length)return '';
  const route=(trace,states,hands,index)=>states?renderElixirDamageRoutes(states,index)
    :hands?renderWeaponDamageRoutes(hands,index):renderSkillConversion(trace,index);
  const name=id=>{
    if(id===null)return '빈 칸';
    const card=SS14_CARDS.records[id];
    return card?.season==='SS14'&&card.koreanTextVerified?card.name:'한국어 이름 미제공';
  };
  const table=(amounts, caption)=>`<table class="slot-dps-table" data-role="damage-route-amount-changes"><caption>${caption}</caption>
    <thead><tr><th scope="col">전환·획득</th><th scope="col">${esc(before)}</th><th scope="col">${esc(after)}</th></tr></thead>
    <tbody>${amounts.map(({label,source,a,b})=>`<tr><th scope="row">${esc(label)}${source?`<small>${esc(source)}</small>`:''}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`;
  return calcGroup('대미지 전환·추가 획득','',rows.map(({index,id,beforeId,previous,current,previousStates,currentStates,previousHands,currentHands})=>{
    const skill=beforeId!==undefined?`${name(beforeId)} → ${name(id)}`:name(id);
    if(beforeId===undefined&&previousHands?.length&&previousHands.length===currentHands?.length){
      const changes=currentHands.map(({slotIndex,trace})=>({slotIndex,
        amounts:damageRouteAmountChanges(previousHands.find(hand=>hand.slotIndex===slotIndex)?.trace,trace,true)}));
      if(changes.every(hand=>hand.amounts)&&changes.some(hand=>hand.amounts.length)){
        return `<section><h4>${esc(skill)} · ${index+1}번 칸</h4>${changes.filter(hand=>hand.amounts.length)
          .map(({slotIndex,amounts})=>table(amounts,`${slotIndex===0?'메인 무기':'서브 무기'} · 보정 전 대미지`)).join('')}</section>`;
      }
    }
    const amounts=beforeId===undefined&&damageRouteAmountChanges(previous,current);
    if(amounts?.length)return `<section><h4>${esc(skill)} · ${index+1}번 칸</h4>${table(amounts,'보정 전 대미지')}</section>`;
    const empty=' · 적용 없음';
    return `<section><h4>${esc(skill)} · ${index+1}번 칸</h4>
      <div><b>${esc(before)}</b>${route(previous,previousStates,previousHands,`${role}-before-${index}`)||empty}</div>
      <div><b>${esc(after)}</b>${route(current,currentStates,currentHands,`${role}-after-${index}`)||empty}</div></section>`;
  }).join(''),role);
}
export function renderSkillElixirDps(phases,index) {
  if (!phases?.states.length) return '';
  const {states,channelCostTotalOnly}=phases;
  const showCosts=channelCostTotalOnly||states.some(row=>row.manaPerSecond>0||row.lifePerSecond>0);
  const showLife=phases.lifePerSecond>0||states.some(row=>row.lifePerSecond>0);
  const cost=(mana,life)=>{
    const values=[['MP',mana],['HP',life]].filter(([label,value])=>Number.isFinite(value)&&(label==='MP'||showLife));
    return values.length?values.map(([label,value])=>`${number(value)} ${label}`).join(' · '):'—';
  };
  const rows=states.map(({active,uptime,dps,weightedDps,manaPerSecond,lifePerSecond,weightedManaPerSecond,weightedLifePerSecond})=>
    `<tr><th scope="row">${esc(phases.names.map((name,j)=>name+' '+(active[j]?'활성':'비활성')).join(' · '))}</th><td>${number(uptime)}%</td><td>${number(dps)}</td><td>${number(weightedDps)}</td>
      ${showCosts?`<td>${cost(manaPerSecond,lifePerSecond)}${Number.isFinite(weightedManaPerSecond)||Number.isFinite(weightedLifePerSecond)?`<small class="elixir-mp-contribution">반영 ${cost(weightedManaPerSecond,weightedLifePerSecond)}</small>`:''}</td>`:''}</tr>`).join('');
  const total=showCosts?`<tfoot><tr><th scope="row" colspan="4">평균 소모</th><td>${cost(phases.manaPerSecond,phases.lifePerSecond)}</td></tr></tfoot>`:'';
  const note=channelCostTotalOnly?'<p>집중 스킬의 관측 차감 횟수는 전체 측정 구간의 값입니다.</p>':'';
  return calcGroup(showCosts?'영약 상태별 스킬 DPS·소모':'영약 상태별 스킬 DPS','',
    `<table class="slot-dps-table"><thead><tr><th scope="col">영약</th><th scope="col">시간 비중</th><th scope="col">상태 DPS</th><th scope="col">반영 DPS</th>${showCosts?'<th scope="col">수동 소모/초</th>':''}</tr></thead><tbody>${rows}</tbody>${total}</table>${note}`,
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
    + (row?.supported && row.manaPerUse===null && !row.castCostObservation
      ? `<p>${row.moonCostStale?'저장된 소모량의 최대 MP 기준을 확인할 수 없습니다. 현재 최대 MP에서 보정 전 소모량을 다시 입력하세요.':'MP 소모 1%의 기준량 미확인. 보정 전 소모량을 조건에 입력하면 MP 수급을 계산합니다.'}</p>
        ${button('보정 전 MP 소모량 입력','result-tab',`data-tab="conditions" data-field="dps-input" data-field-key="${row.rowIndex}:moonBaseManaCost"`)}` : '')
    + `<p><a href="${esc(forms.sourceUrl)}" target="_blank" rel="noopener noreferrer">스킬 원문</a> · <a href="https://tlidb.com/ko/Attack" target="_blank" rel="noopener noreferrer">공격 도움말</a>${rainbow ? ` · <a href="${esc(rainbow.rainbowSourceUrl)}" target="_blank" rel="noopener noreferrer">무지개 원문</a>` : ''}${lunar ? ` · <a href="${esc(lunar.sourceUrl)}" target="_blank" rel="noopener noreferrer">월식 원문</a>` : ''}${wax ? ` · <a href="${esc(wax.sourceUrl)}" target="_blank" rel="noopener noreferrer">달의 운동 원문</a>` : ''}</p>`,
  'selected-skill-moon-strike');
}

function renderSkillResourceCosts(row, averaged, timedCombat) {
  if (!row || (!row.channelCost && !row.measuredManualUses && !['manaPerUse','lifePerUse','manualManaPerSecond','manualLifePerSecond'].some(key=>Number.isFinite(row[key])))) return '';
  const costs = row.castCostObservation?.status==='applied'?[['소모 기준','게임 관측값']]:[];
  for (const [label,perUse,perSecond] of [
    ['MP',row.manaPerUse,row.manualManaPerSecond], ['HP',row.lifePerUse,row.manualLifePerSecond],
  ]) {
    if (label==='HP' && !(perUse>0 || perSecond>0)) continue;
    if (Number.isFinite(perUse)) costs.push([averaged?'시작 시 1회 '+label:'1회 '+label,number(perUse)]);
    costs.push([averaged?'평균 '+label+'/초':label+'/초',Number.isFinite(perSecond)?number(perSecond):'확인 필요']);
  }
  if (row.channelCost?.valid)
    costs.push([row.channelCost.times?'측정 구간 차감 빈도':'관측 차감 횟수',number(row.channelCost.rate)+'회/초']);
  if (row.measuredManualUses) {
    const {count,seconds,rate,multistrikes}=row.measuredManualUses;
    costs.push(['측정 구간 수동 사용',`${number(count)}회 / ${number(seconds)}초 · ${number(rate)}회/초`]);
    if (multistrikes>0) costs.push(['측정 구간 연속 공격',`${number(multistrikes)}회 / ${number(seconds)}초`
      +(Number.isFinite(row.manualManaPerSecond)&&Number.isFinite(row.manualLifePerSecond)?' · 소모에 포함':'')]);
  }
  const channel=row.channelCost;
  const needsRate=channel&&!channel.valid;
  const channelDetails=needsRate
    ? `<p>${channel.variable?'상태마다 차감 비용이 달라 평균 횟수만으로는 초당 소모를 확정할 수 없습니다.'
      : Number.isFinite(channel.max)?`관측한 초당 차감 횟수를 입력하세요. 현재 상한은 ${number(channel.max)}회/초입니다.`:'차감 횟수의 상한을 확인할 수 없습니다.'}</p>`
      +(channel.variable&&timedCombat?'':button('차감 횟수 입력','result-tab',`data-tab="conditions" data-field="dps-input" data-field-key="${row.rowIndex}:channelCostRate"`)):'';
  const timesEdit = channel && timedCombat ? button('차감 시각 편집','result-tab',
    `data-tab="conditions" data-field="dps-input" data-field-key="${row.rowIndex}:channelCostTimes"`) : '';
  const total = [row.manualManaPerSecond,row.manualLifePerSecond]
    .map((value,i)=>Number.isFinite(value)&&(i===0||value>0) ? number(value)+(i===0?' MP/초':' HP/초') : '').filter(Boolean).join(' · ');
  return calcGroup('수동 시전 소모',total,calcRows(costs)+channelDetails+timesEdit
    +button('전체 MP 수급 보기','result-tab','data-tab="stats" data-focus-role="numeric-mana-summary"'),'selected-skill-resource-cost');
}

function renderSkillNumbedContribution(dps,row) {
  if(!dps?.supported||!row?.supported)return '';
  const entries=seasonNumbedDamageRows(dps.scope,row.values);
  if(!entries.length)return '';
  const total=entries.reduce((sum,[,value])=>sum+value,0);
  const details=entries.map(([label,value])=>[label,'+'+number(value)+' DPS']);
  const coverage=row.numbedDotCoverage;
  if(coverage)details.push(['마취가 적용된 지속 시간',`${number(coverage.seconds)}초 / ${number(coverage.activeSeconds)}초`]);
  return calcGroup('이 스킬의 마취 기여','+'+number(total)+' DPS',calcRows(details)
    +'<p>스킬 DPS에 이미 반영된 수치입니다.</p>','selected-skill-numbed');
}

function renderSkillCadence(cadence,trace, rates, weaponHands) {
  const speed=cadence.kind==='attack'?'공격':'시전';
  const fmt=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:4});
  const sourceRows=(trace??[]).filter(e=>/-(?:attack-speed|cast-speed|cooldown-recovery-speed)$/u.test(e.stat))
    .map(e=>[e.stage==='cooldown'?'쿨타임 회복 속도':speed+' 속도',
      e.operation==='more'?'×'+fmt(1+e.resolvedValue/100):fmt(e.resolvedValue)+'%',conversionSource(e.effectSource??undefined)]);
  return calcGroup(speed+' 속도 계산',fmt(cadence.rate)+'회/초',calcRows([
    ...(weaponHands??[]).map(hand=>[`${hand.slotIndex===0?'메인':'서브'} 무기 공격 속도`,
      (hand.weaponSpeedBase!==hand.weaponSpeed?fmt(hand.weaponSpeedBase)+' → ':'')+fmt(hand.weaponSpeed)+'회/초']),
    ...(weaponHands?.length?[['쌍수 기본 공격 속도',fmt(1/cadence.baseTime)+'회/초']]:[]),
    ['기본 '+speed+' 간격',fmt(cadence.baseTime)+'초'],
    [speed+' 속도 증가 합계',fmt(cadence.speedIncrease)+'%'],
    ...(cadence.speedMore!==1?[[speed+' 속도 추가 배율','×'+fmt(cadence.speedMore)]]:[]),
    ...(cadence.rateCap?[[speed+' 속도 상한',fmt(cadence.rateCap)+'회/초']]:[]),
    ...(cadence.effectiveCooldown?[['적용 쿨타임',fmt(cadence.effectiveCooldown)+'초']]:[]),
    ...sourceRows,
    ...rates,
  ]),'selected-skill-cadence');
}

export function selectedSkillInputIssues(dps,row) {
  if(row?.supported!==false)return [];
  const shared=new Set(dps.sharedBlockers);
  const issues=row.blockers.filter(reason=>!shared.has(reason));
  return issues.length>1?issues.filter(reason=>reason!=='이 스킬의 SS14 전투 입력을 다시 확인하세요.'):issues;
}

function renderUtilitySkillCalculation(report,{index,entry,utility,buff}) {
  const stats=entry?.values??{};
  const values=[];
  const level=buff?.level??entry?.level;
  if(Number.isInteger(level)) values.push(['적용 레벨',`Lv.${level}`]);
  if(utility?.utility==='restoration') values.push(
    ['기본 HP 회복',`최대 HP의 ${number(utility.lifePercent)}% · ${number(utility.lifeDuration)}초`],
    ['기본 MP 회복',`${number(utility.mana)} · ${number(utility.manaDuration)}초`]);
  for(const [label,value,unit] of [['기본 MP 소모',stats.manaCost,''],['기본 시전 시간',stats.castTime,'초'],
    ['기본 쿨타임',stats.cooldown,'초']]) {
    if(Number.isFinite(value)) values.push([label,number(value)+unit]);
  }
  const reservations=report.character.manaReservations?.filter(reservation=>reservation.rowIndex===index)??[];
  if(reservations.length) {
    const known=reservations.every(r=>!r.blocked&&(r.active===false||Number.isFinite(r.applied)));
    const total=known?reservations.reduce((sum,r)=>sum+(r.active===false?0:r.applied),0):null;
    values.push(['봉인 MP',known?number(total)+'%':'확인 필요']);
  }
  return `<div data-role="utility-skill-calculation">${calcRows(values)}</div>`;
}

export function renderSkillCalculation(s,{partial=false,showIssues=true,sharedSkillIssues}={}) {
  const report=s.report,rows=report.fullDps.rows;
  const assumed=!partial&&preferredSeasonDpsMetric(report)==='assumedDps';
  const skills=normalizeBuild(s.document.targetBuild).skills;
  const slots=[...skills.active,...skills.passive].flatMap((skill,index)=>{
    const row=rows.find(entry=>entry.rowIndex===index);
    const id=row?.id??skill.skillId;
    if(!id)return [];
    const entry=seasonSkillSlotCalculation(report,index);
    const utility=entry?.mechanics?.find(m=>m.kind==='utility-skill');
    const buff=report.componentProjection.rows.find(projected=>projected.buffSkill===index&&projected.itemId===id);
    if(!row && index>=skills.active.length && !buff && !utility)return [];
    const card=SS14_CARDS.records[id];
    const name=card?.koreanTextVerified&&card.season==='SS14'?card.name:'한국어 이름 미제공';
    const slotName=index===0?'주력':index<skills.active.length?'액티브 '+(index+1):'패시브 '+(index-skills.active.length+1);
    return [{index,id,row,name,slotName,entry,utility,buff}];
  });
  if(!slots.length)return button('주력 스킬 선택','inspect-calculation-skill','data-index="0" data-role="edit-calculation-skill"');
  const selected=slots.find(slot=>slot.index===s.calculationIndex)??slots[0];
  const {id,index,row}=selected;
  const slotTitle=slot=>`${slot.slotName} · ${esc(slot.name)}${Number.isInteger(slot.row?.minionLevel)?' · Lv.'+slot.row.minionLevel:''}`;
  const selector=slots.length===1 ? `<h2 data-role="calculation-skill" tabindex="-1">${slotTitle(selected)}</h2>`
    : `<select aria-label="계산할 스킬" data-calculation-skill data-role="calculation-skill">${slots.map(slot=>`<option value="${slot.index}"${slot.index===index?' selected':''}>${slotTitle(slot)}</option>`).join('')}</select>`;
  const activation=selected.buff?.isAura?auraActivationControl(report.componentProjection,index):null;
  const rankBasis=report[preferredSeasonDpsMetric(report)];
  const canRecommend=skills.active[index]?.skillId===id&&rankBasis?.supported
    &&rankBasis.rows.some(candidate=>candidate.rowIndex===index&&candidate.id===id&&candidate.supported);
  const actions=`<div class="skill-calc-actions">${button('스킬 편집','inspect-calculation-skill',`data-index="${index}" data-role="edit-calculation-skill"`)}
    ${skillConditionKeys(s,index,id).length?button('스킬 조건','result-tab',`data-tab="conditions" data-focus-role="dock-skill-conditions-${index}"`):''}
    ${activation&&!activation.automatic?button('효과 조건','result-tab',`data-tab="conditions" data-field="component-condition" data-field-key="${esc(activation.key)}"`):''}
    ${canRecommend?button('교체 추천','rank-skill-replacement',`data-index="${index}" aria-label="${esc(selected.slotName+' · '+selected.name)} 교체 추천"`):''}</div>`;
  if(!row&&(selected.utility||selected.buff)) {
    return `<section class="skill-calculation" aria-label="선택 스킬 계산">${selector}${renderUtilitySkillCalculation(report,selected)}${actions}</section>`;
  }
  const displayRow=assumed?report.assumedDps.rows.find(entry=>entry.rowIndex===index):row;
  const numbed=renderSkillNumbedContribution(assumed?report.assumedDps:report.fullDps,displayRow);
  const moonStrike=renderMoonStrikeForms(s.document.targetBuild,seasonSkillSlotCalculation(report,index),displayRow);
  const direct=assumed ? null : report.coupledSkills.rows.find(r=>r.rowIndex===index&&r.id===id);
  const detail=assumed ? displayRow?.detail : {
    damageStages:direct?.damageStages, hasHitPools:direct?.offenseBasis?.pools?.some(p=>p.min||p.max),
    critical:report.offense.rows.find(r=>r.rowIndex===index&&r.id===id)?.values, pools:row?.pools, takenMultiplier:row?.takenMultiplier,
    cadence:direct?.offenseBasis?.cadence, cadenceTrace:direct?.offenseBasis?.cadenceTrace,
    skillLevel:seasonSkillCalculationLevel(report,index), excludedHitRoutes:excludedSeasonHitRoutes(direct), hitModifierTrace:direct?.trace,
    addedDamageTrace:direct?.trace, addedDamageSources:direct?.addedDamageSources,
  };
  const {damageStages:stages, hasHitPools, critical, pools, takenMultiplier, excludedHitRoutes,hitModifierTrace,addedDamageTrace,addedDamageSources}=detail??{};
  const skillLevel=detail?.skillLevel??seasonSkillCalculationLevel(report,index);
  const v=displayRow?.values??{};
  const averaged=assumed?report.assumedDps.measuredResources:!!report.theaAverage;
  const levelDetails=Number.isInteger(skillLevel?.level)&&(skillLevel.bonus||skillLevel.growthMultiplier||skillLevel.unavailable) ? calcGroup(
    skillLevel.confirmed?'적용 스킬 레벨':'스킬 레벨 확인 필요',`Lv.${skillLevel.level}`,calcRows([
      ['기본 레벨',String(skillLevel.base)],
      ...(skillLevel.bonus?[['레벨 보너스',(skillLevel.bonus>0?'+':'')+skillLevel.bonus]]:[]),
      ...(skillLevel.growthMultiplier?[['20레벨 이후 누적 대미지 배율','×'+number(skillLevel.growthMultiplier)]]:[]),
    ]),'selected-skill-level') : '';
  const minionDeterioration = v.minionDeteriorationDps ?? 0;
  const amounts=SEASON_DPS_PARTS.flatMap(([key,label])=>{
    if (!Number.isFinite(v[key]) || v[key]===0) return [];
    if (key==='minionDps' && minionDeterioration>0)
      return [[label,number(v[key]-minionDeterioration)],['소환체 악화',number(minionDeterioration)]];
    return [[label,number(v[key])]];
  });
  const skillDps=displayRow?.supported&&Number.isFinite(v.dps)?number(v.dps):partial&&row?.supported===false?'DPS에서 제외':'계산 보류';
  const reap=displayRow?.reaping;
  const fissure=displayRow?.fissure;
  if(displayRow?.supported&&fissure) amounts.push(['파괴 충전 간격',number(fissure.interval)+'초'],['균열 후속 적중',number(fissure.hits)+'/초']);
  if(v.igniteReapingDps>0) amounts.push(['점화·연소 수확',number(v.igniteReapingDps)+' DPS']);
  if(v.reapingDps>0 && reap) amounts.push(['수확 시간',number(reap.duration)+'초'],['수확 쿨타임',number(reap.cooldown)+'초'],['수확 횟수',number(reap.rate)+'/초']);
  if(v.reapingDps>0 && reap?.beamCount>1) amounts.push(['생성 광선 수',number(reap.beamCount)]);
  const actionIssues=selectedSkillInputIssues(report.fullDps,row).filter(reason=>!sharedSkillIssues?.has(reason));
  const inputs=showIssues&&actionIssues.length&&!s.showDpsNotes
    ? renderReasons(s,actionIssues,report.fullDps,index) : '';
  const dpsLabel=assumed?'스킬 방어 전 DPS':'스킬 DPS';
  const total=amounts.length&&displayRow?.supported?calcGroup(dpsLabel,skillDps,calcRows(amounts),'selected-skill-dps'):
    !displayRow?.supported&&inputs
      ? calcGroup(dpsLabel,skillDps,inputs,'selected-skill-dps'):
    `<p class="skill-calc-total" data-role="selected-skill-dps"><span>${dpsLabel}</span><b>${skillDps}</b></p>`;
  const remainingInputs=assumed&&inputs?calcGroup('스킬 DPS에 필요한 입력','',inputs,'selected-skill-inputs'):'';
  const typedParts=seasonDamageTypeParts(displayRow);
  const skillTypes=typedParts?.filter(([,dps])=>dps>0);
  const typedDamage=!displayRow?.minionDamageByType&&skillTypes?.length>1
    ? calcGroup(assumed?'속성별 방어 전 DPS':'속성별 DPS',skillDps,
      calcRows(skillTypes.map(([type,dps])=>[damageTypes[type],number(dps)])),'selected-skill-damage-types') : '';
  const hitOnly=!displayRow?.supported && Number.isFinite(row?.permafrostHitDps)
    ? calcRows([['얼음 송곳 적중 DPS',number(row.permafrostHitDps)],['동토의 지속 대미지','계산 보류']]) : '';
  const elapsed=assumed?report.assumedDps.elixirUptime:report.elixirUptime;
  const averagedElixir=Boolean(displayRow?.elixirDpsStates?.states.length);
  const perSecond = value => value.toLocaleString('ko-KR',{maximumFractionDigits:4})+'회';
  const phases=averagedElixir?displayRow?.elixirDpsStates:null;
  const burstRatesByPhase=phases?.states.length&&phases.states.every(phase=>
    Number.isFinite(phase.burstActivationRate)&&Number.isFinite(phase.burstExtraRate))
    ? `<table class="slot-dps-table" aria-label="영약 상태별 초당 매직 버스트"><thead><tr><th scope="col">영약 상태</th><th scope="col">발동/초</th><th scope="col">추가 발동/초</th></tr></thead><tbody>${phases.states.map(phase=>{
      const state=phases.names.map((name,j)=>name+' '+(phase.active[j]?'활성':'비활성')).join(' · ');
      const contribution=rate=>`${perSecond(rate)}<small class="elixir-mp-contribution">반영 ${perSecond(rate*phase.uptime/100)}</small>`;
      return `<tr><th scope="row">${esc(state)}<small class="elixir-mp-contribution">${number(phase.uptime)}%</small></th><td>${contribution(phase.burstActivationRate)}</td><td>${contribution(phase.burstExtraRate)}</td></tr>`;
    }).join('')}</tbody></table>` : '';
  const burst=displayRow?.measuredBurst, manualUses=displayRow?.measuredManualUses;
  const burstCadence=burst&&manualUses ? calcGroup('측정 구간 매직 버스트',number(manualUses.seconds)+'초',calcRows([
    ['일반 시전',number(manualUses.count)+'회'],
    ...(burst.manualActivations>0?[
      ['그중 버스트가 발동한 시전',number(burst.manualActivations)+'회'],
      ['수동 시전으로 인한 추가 발동',number(burst.extraCasts)+'회'],
    ]:[]),
    ...(burst.automaticActivations>0?[
      ['추방 자동 버스트 발동',number(burst.automaticActivations)+'회'],
      ['추방으로 발생한 시전',number(burst.automaticCasts)+'회'],
    ]:[]),
  ]),'selected-skill-burst-cadence') : displayRow?.supported&&!averaged&&v.manualRate>0&&v.burstActivationRate>0&&Number.isFinite(v.burstExtraRate)
    ? calcGroup(averagedElixir?'매직 버스트 발동 · 영약 유지율 평균':'매직 버스트 발동',number(100*v.burstActivationRate/v.manualRate)+'%',calcRows([
      ...(!averagedElixir?[['초당 일반 시전',perSecond(v.manualRate)]]:[]),
      ['그중 버스트가 발동한 시전',perSecond(v.burstActivationRate)],
      ['초당 버스트 추가 발동',perSecond(v.burstExtraRate)],
    ])+burstRatesByPhase,'selected-skill-burst-cadence') : '';
  const elixirRoutes=renderElixirDamageRoutes(displayRow?.elixirDamageRoutes,index);
  const scope=(assumed?report.assumedDps:report.fullDps).scope;
  const cycleAverage=scope==='ss14-thea-cycle-full-dps';
  const frost=displayRow?.permafrostBreakdown;
  const frostDetails=frost?calcGroup('동토 지속 대미지 계산',number(v.permafrostDps)+' DPS',calcRows([
    [averagedElixir||cycleAverage?'활성 중 평균 DPS':'활성 중 DPS',number(frost.active)],['적용 가동률',number(frost.uptime)+'%'],
    ['소모한 지면 에너지 축적',number(frost.charge)+'회'],
  ]),'permafrost-dps-breakdown'):'';
  const dot=displayRow?.supported ? displayRow.dotBreakdown : null;
  const measuredDot=Number.isFinite(dot?.applied);
  const dotDps=measuredDot?dot.applied:v.dotDps;
  const dotDetails=dot&&(!averaged||cycleAverage||averagedElixir||measuredDot)?calcGroup('지속 대미지 적용',number(dotDps)+' DPS',calcRows([
    ...(Number.isFinite(dot.active)?[[averagedElixir||cycleAverage||measuredDot?'활성 중 평균 DPS':'활성 중 DPS',number(dot.active)]]:[]),
    [measuredDot?'측정 구간의 가동률':'적용 가동률',number(dot.uptime)+'%'],['가동률 반영 DPS',number(dotDps)],
  ]),'skill-dot-breakdown'):'';
  const dotDefense=!averaged&&displayRow?.supported
    ? renderDotDefense(displayRow.dotDefense,elapsed,{label:'지속 대미지 대상 저항·심화',role:'dot-mitigation-breakdown',assumed})
      +renderDotDefense(displayRow.frostDefense,elapsed,{label:'동토 대상 저항·심화',role:'frost-mitigation-breakdown',assumed}) : '';
  const scenario = s.document.targetBuild.ss14Inputs;
  const costs=renderSkillResourceCosts(index<skills.active.length?displayRow:null,averaged||averagedElixir,
    scenario?.theaCycle?.mode==='automatic' && scenario.theaEvents?.combatMode===1);
  const minionTypes = Object.entries(displayRow?.minionDamageByType ?? {})
    .filter(([type, dps]) => damageTypes[type] && Number.isFinite(dps) && dps > 0);
  const execution = typedParts?.find(([type]) => type === 'execute')?.[1];
  if (execution > 0) minionTypes.push(['execute', execution]);
  const measuredMinionDamage = ['ss14-thea-joint-combat','ss14-thea-cycle-full-dps'].includes(scope);
  let minionDamage = '';
  if (displayRow?.supported && (!averaged || measuredMinionDamage) && minionTypes.length) {
    const sum = minionTypes.reduce((total, [, dps]) => total + dps, 0);
    const metric = assumed ? '방어 전 DPS' : 'DPS';
    const coverage = execution > 0 ? '대미지·도태' : typedParts ? '유형별' : '확인된 속성의';
    minionDamage = calcGroup(`소환체 스킬의 ${coverage} ${averagedElixir || measuredMinionDamage ? '평균 ' : ''}${metric}`, number(sum),
      calcRows(minionTypes.map(([type, dps]) => [SEASON_DAMAGE_BREAKDOWN_LABELS[type], number(dps)])), 'selected-skill-minion-damage');
  }
  if(averagedElixir){
    const useRate=Number.isFinite(v.manualRate)
      ? calcRows([['영약 유지율 반영 사용 횟수',perSecond(v.manualRate)+'/초']]) : '';
    return `<section class="skill-calculation" aria-label="선택 스킬 계산">${selector}${total}${remainingInputs}${typedDamage}${dotDefense}${useRate}${levelDetails}${moonStrike}${frostDetails}${dotDetails}${numbed}${burstCadence}${costs}${actions}${minionDamage}${renderSkillElixirDps(displayRow?.elixirDpsStates,index)}${elixirRoutes}${renderElixirAddedDamage(displayRow?.elixirAddedDamage)}</section>`;
  }
  const useRate=assumed?displayRow?.useRate:direct?.offenseBasis?.rate;
  const criticalChance=critical?.effectiveCriticalChance;
  const summary=displayRow?.supported?[
    ...(!averaged&&Number.isFinite(v.averageLandedHit)?[[displayRow.moonStrike?.waxWeaponShares?'기본 교대 적중 평균':'1회 평균 명중',number(v.averageLandedHit)]]:[]),
    ...(useRate>0?[[averaged?'시작 시 사용 속도':'사용 속도',number(useRate)+'/초']]:[]),
    ...(Number.isFinite(criticalChance)&&Number.isFinite(v.averageLandedHit)?[[averaged?'시작 시 크리티컬 확률':'크리티컬 확률',number(criticalChance)+'%']]:[]),
  ]:[];
  let steps='';
  if (displayRow?.weaponHands) steps+=calcGroup('쌍수 교대 공격','',displayRow.weaponHands.map(hand=>{
    const label=hand.slotIndex===0?'메인 무기':'서브 무기';
    return calcRows([[`${label} 적중당 평균 대미지`,number(hand.landedHit)],
      [`${label} 크리티컬 확률`,number(hand.effectiveCriticalChance)+'%']])
      + renderSkillConversion(hand.conversionTrace,`${index}-weapon-${hand.slotIndex}`)
      + renderAddedHitSources(hand.addedDamageTrace,addedDamageSources,hand.slotIndex);
  }).join('')+`<p><a href="${DUAL_WIELD_ATTACK_SOURCE}" target="_blank" rel="noopener noreferrer">쌍수 공격 도움말</a></p>`,'selected-skill-dual-wield');
  const trace=assumed?displayRow?.conversionTrace:row?.conversionTrace??direct?.trace;
  const conversion=renderSkillElixirDps(displayRow?.elixirDpsStates,index)
    +(elixirRoutes||renderSkillConversion(trace,index));
  const excluded=elixirRoutes?'':renderExcludedHitRoutes(excludedHitRoutes);
  if(stages && hasHitPools) {
    const types=Object.entries(stages.byType??{}).filter(([,v])=>v.base||v.added||v.taken);
    let prior=stages.baseHitAverage+stages.addedHitAverage;
    steps+=calcGroup('기본·추가 적중 대미지',number(prior),calcRows([['기본 평균',number(stages.baseHitAverage)],['추가 평균',number(stages.addedHitAverage)],
      ...types.map(([type,v])=>[(damageTypes[type]??'기타')+' 기본 / 추가',number(v.base)+' / '+number(v.added)])])+renderAddedHitSources(addedDamageTrace,addedDamageSources));
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
        return [label,bound('min')+' – '+bound('max')];
      })));
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
  if(!averaged)steps+=dotDetails;
  if(Number.isFinite(useRate)&&useRate>0){
    const rates=[['초당 사용 가능 횟수',number(useRate)]];
    if(displayRow?.supported&&Number.isFinite(v.manualRate))rates.push(['초당 일반 시전',number(v.manualRate)]);
    steps+=!averaged&&displayRow?.supported&&detail?.cadence
      ? renderSkillCadence(detail.cadence,detail.cadenceTrace,rates,displayRow.weaponHands)
      : calcGroup('사용 속도',number(useRate)+'/초',calcRows(rates));
  }
  if(steps)steps=calcGroup(averaged?'전투 시작 상태의 계산 단계':assumed?'방어 전 계산 단계':'대미지 계산 단계','',steps);
  const details = conversion + minionDamage + (averaged?dotDetails:'') + excluded + steps;
  const defense=assumed?'':renderHitTargetDefense(displayRow,s.document.targetBuild.ss14Inputs?.dps?.enemy,averaged);
  return `<section class="skill-calculation" aria-label="선택 스킬 계산">${selector}${total}${remainingInputs}${typedDamage}${hitOnly}${summary.length?`<div data-role="skill-combat-summary">${calcRows(summary)}</div>`:''}${defense}${dotDefense}${levelDetails}${moonStrike}${frostDetails}${numbed}${burstCadence}${costs}${actions}${details?calcGroup('세부 계산','',details,'selected-skill-details'):''}</section>`;
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
  const minionContribution=key=>{
    const value=contribution(key);
    return value>0?[['소환체 번개 대미지의 마취 기여','+'+number(value)+' DPS']]:[];
  };
  const fixed=(assumed?report.assumedDps:report.componentProjection).fixedNumbed;
  if(fixed) {
    const fixedContribution=key=>dps?.scope==='ss14-thea-joint-combat'?0:contribution(key);
    const hit=fixedContribution('fixedNumbedHitDps');
    return calcGroup('마취',number(fixed.stacks)+'중첩',calcRows([
      ['입력한 중첩',number(fixed.stacks)],['번개 대미지 보정','+'+number(fixed.bonus)+'%'],
      ...(hit>0?[['플레이어 번개 적중의 마취 기여','+'+number(hit)+' DPS']]:[]),
      ...dotContributions(fixedContribution('fixedNumbedDotDps'),fixedContribution('fixedNumbedReapingDps')),
      ...minionContribution('fixedNumbedMinionDps'),
    ])+(report.coupledSkills.rows.some(row=>row.voltageJolt)?'<p class="native-stat-note">혼비백산을 사용한 전투에서 관측한 대상 중첩을 적용합니다.</p>':'')
      +(fixed.sourceKey?button('마취 조건 편집','requirement',`data-section="combat" data-field="component-condition" data-field-key="${esc(fixed.sourceKey)}"`)
        :button('마취 조건 편집','result-tab','data-tab="conditions" data-field="dps-input" data-field-key="enemy:numbedStacks"')),'numeric-numbed');
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
    ...minionContribution('numbedMinionDps'),
  ])+
    button('마취 조건 편집','requirement','data-section="combat" data-field="thea-event" data-field-key="numbedEnabled"'),'numeric-numbed');
}

function skillContributions(s,partial) {
  const metric=partial?'fullDps':preferredSeasonDpsMetric(s.report);
  const dps=s.report[metric];
  const metricLabel=partial?'부분 DPS · 미지원 제외':metric==='assumedDps'?'방어 전 DPS':'전체 DPS';
  const rows=dps?.rows??[];
  const {active,passive}=s.document.targetBuild.skills;
  const bySlot=new Map(rows.map(row=>[row.rowIndex,row]));
  const slots=[...active,...passive].flatMap(({skillId,supports},index)=>{
    const row=bySlot.get(index),hasSupport=supports?.some(support=>support?.supportId);
    return row||skillId&&hasSupport?[{index,id:row?.id??skillId,row,hasSupport}]:[];
  });
  if(s.pending.size||!slots.length)return '';
  const included=partial?rows.filter(row=>row.supported):rows;
  const total=partial?.dps??dps.dps;
  const reconciled=(partial||dps.supported) && total>0 && included.every(r=>r.supported&&Number.isFinite(r.values.dps)&&r.values.dps>=0)
    && Math.abs(included.reduce((sum,r)=>sum+r.values.dps,0)-total)<Math.max(0.000001,total*1e-8);
  const nameFor=card=>card?.season==='SS14'&&card.koreanTextVerified?esc(card.name):'한국어 이름 미제공';
  const shareCell=value=>`<td>${number(value/total*100)}%<meter aria-hidden="true" min="0" max="100" value="${Math.min(100,value/total*100)}"></meter></td>`;
  const bySkill = new Map();
  if (reconciled) for (const slot of slots) {
    if (!slot.row?.supported) continue;
    const group = bySkill.get(slot.id) ?? { first:slot.index, count:0, dps:0 };
    group.count++;
    group.dps += slot.row.values.dps;
    bySkill.set(slot.id,group);
  }
  if ([...bySkill.values()].some(group=>group.count>1))
    slots.sort((a,b)=>(bySkill.get(a.id)?.first??a.index)-(bySkill.get(b.id)?.first??b.index));
  const compositionBasis=partial?{scope:dps.scope,supported:true,dps:total,rows:included}:dps;
  const parts = reconciled ? (seasonDamageComposition(compositionBasis) ?? []).filter(part=>part.value>0) : [];
  const types = reconciled ? (seasonDamageTypeComposition(compositionBasis) ?? []).filter(part=>part.value>0) : [];
  const renderParts=(parts,role,label,column)=>parts.length>1
    ? `<details data-role="${role}"><summary>${label} ${metric==='assumedDps'?'방어 전 ':''}DPS 비중</summary>
      <table aria-label="${label} DPS 비중"><thead><tr><th scope="col">${column}</th><th scope="col">DPS</th><th scope="col">비중</th></tr></thead>
      <tbody>${parts.map(({label,type,value})=>`<tr><th scope="row">${label??SEASON_DAMAGE_BREAKDOWN_LABELS[type]}</th><td>${number(value)}</td>${shareCell(value)}</tr>`).join('')}</tbody></table></details>` : '';
  const includesExecution = types.some(part=>part.type==='execute');
  const composition=renderParts(parts,'analysis-damage-composition','발동 유형별','유형')
    +renderParts(types,'analysis-damage-types',includesExecution?'속성·도태':'속성별',includesExecution?'항목':'속성');
  const heading=partial?'스킬별 부분 DPS':'스킬별 DPS';
  return `<details data-role="analysis-skill-contributions"${s.supportImpact?' open':''}><summary>${heading}</summary><section class="skill-contributions" aria-label="${heading}"><table><thead><tr><th scope="col">스킬</th><th scope="col">${metric==='assumedDps'?metricLabel:'DPS'}</th>${reconciled?'<th scope="col">비중</th>':''}</tr></thead><tbody>${slots.map(({index,id,row,hasSupport})=>{
    const label=nameFor(SS14_CARDS.records[id]);
    const slotName=index===0?'주력':index<active.length?'액티브 '+(index+1):'패시브 '+(index-active.length+1);
    const compareSupport=hasSupport&&(!partial||row?.supported);
    const expanded=compareSupport&&s.supportImpact?.rowIndex===index&&!!s.supportImpact.partial===!!partial;
    const group=bySkill.get(id);
    const combined=group?.count>1&&group.first===index
      ? `<tr class="contribution-skill-total" data-role="analysis-skill-total"><th scope="row">${label} 합계 <small>· ${group.count}칸</small></th><td>${number(group.dps)}</td>${shareCell(group.dps)}</tr>` : '';
    const actions=button(`${label} <small>· ${slotName}</small>`,row?'inspect-contribution-skill':'inspect-skill',`data-index="${index}" class="contribution-skill"`);
    const compare=compareSupport?button('보조 비교','compare-support-impact',`data-index="${index}" data-role="support-impact-${index}" aria-label="${label} ${slotName} 보조 비교" aria-expanded="${expanded}"`):'';
    const linkRows=expanded?s.supportImpact.rows.map(({supportIndex,id,comparison,linkedSkillDps,resources,breakdown})=>{
      const {supported,value,delta,reasons}=comparison;
      const signed=n=>(n>0?'+':'')+number(n);
      const linked=linkedSkillDps&&Math.abs(linkedSkillDps.delta-delta)>=.005
        ? `<small data-role="support-impact-linked-dps">연결 스킬 ${number(linkedSkillDps.value)} DPS (${signed(linkedSkillDps.delta)})</small>`:'';
      const result=supported?`<strong>${number(value)}</strong><small>${signed(delta)} DPS</small>${linked}`
        :`<details><summary>비교 보류</summary>${renderReasons(s,reasons)}</details>`;
      const edit=button(`${supportIndex+1} · ${nameFor(seasonSupportKoreanCard(id))}`,'inspect-support-impact',
        `data-row="${index}" data-index="${supportIndex}" data-role="support-impact-edit-${index}-${supportIndex}" class="contribution-skill"`);
      const cost=resources?renderResourceChanges(resources,esc,{action:'해제'}):'';
      const labels={before:'해제 전',after:'해제 후'};
      const changes=breakdown?renderSkillLevelChanges(breakdown.skillLevels,esc,labels)
        +renderDamageBreakdown(breakdown,esc,labels)
        +renderDamageRouteChanges(breakdown.damageRoutes,{...labels,role:`support-impact-routes-${index}-${supportIndex}`}):'';
      const details=changes?`<details class="support-impact-detail" data-role="support-impact-detail-${index}-${supportIndex}"><summary>해제 전후 상세</summary>${changes}</details>`:'';
      return `<li>${edit}<div>${result}</div>${cost||details?`<section class="support-impact-cost">${cost}${details}</section>`:''}</li>`;
    }).join(''):'';
    return `${combined}<tr><th scope="row">${actions}${compare}</th><td>${row?.supported?number(row.values.dps):row?(partial?'제외':'보류'):'—'}</td>${reconciled?(row?.supported?shareCell(row.values.dps):'<td>—</td>'):''}</tr>${linkRows?`<tr class="support-impact"><td colspan="${reconciled?3:2}"><strong>보조 해제 시 ${metricLabel}</strong><ul>${linkRows}</ul></td></tr>`:''}`;
  }).join('')}</tbody></table>${composition}</section></details>`;
}
export function renderResultAnalysis(s,{partial=null}={}) {
  const result = s.pending.size ? null : s.analysis;
  const fallback = partial ? 'partialDps' : preferredSeasonDpsMetric(s.report);
  const metric = s.analysisMetric==='partialDps'&&!partial ? fallback : s.analysisMetric ?? fallback;
  const dpsMetrics = partial ? ['partialDps','fullDps','assumedDps'] : ['fullDps','assumedDps'];
  const metricLabel = key => key==='partialDps'?'부분 DPS · 미지원 제외':SEASON_ADVISOR_METRICS[key];
  const metricOptions = keys => keys.map(key => `<option value="${key}"${metric === key ? ' selected' : ''}>${esc(metricLabel(key))}</option>`).join('');
  const comparisonBasis = metric === 'assumedDps'
    ? '적 아머와 저항은 비교 기준에서 제외합니다. 적중률과 나머지 전투 조건이 같은 빌드를 비교합니다.'
    : metric === 'partialDps' ? '두 빌드 모두 확인한 제외 항목과 전투 조건이 같아야 합니다.'
    : metric === 'fullDps' ? (s.analysisUseBaselineEnemy
      ? '비교할 때만 기준 빌드의 대상 설정을 적용합니다. 나머지 전투 조건이 같은 빌드를 비교합니다.'
      : '전투 조건이 같은 SS14 빌드를 비교합니다.')
      : '같은 원본에서 만든 빌드 중 전투 조건이 같은 빌드를 비교합니다.';
  const baselineReasons = new Set(result?.baselineReasons ?? []);
  const baselineIssues=result?.baselineIssues??[];
  const generalBaselineReasons=[...baselineReasons].filter(reason=>!baselineIssues.length||reason!=='기준 문서의 선택 지표가 미지원입니다.');
  const rows = [...(result?.rows ?? [])].sort((a,b) => Number(!!a.reasons.length) - Number(!!b.reasons.length) || (b.delta ?? 0) - (a.delta ?? 0));
  const ranking=renderUpgradeRanking(s,partial)+(partial?'':renderEditDpsComparison(s));
  return `<section class="native-result-analysis" aria-label="빌드 분석">
    ${skillContributions(s,partial)}
    ${ranking}
    <details data-role="saved-build-comparison"${result?' open':''}><summary>저장 빌드 비교</summary>
    <label>비교 지표<select data-analysis-metric data-role="saved-comparison-metric" aria-label="비교 지표"><optgroup label="DPS">${metricOptions(dpsMetrics)}</optgroup><optgroup label="세부 수치">${metricOptions(Object.keys(SEASON_ADVISOR_METRICS).filter(key => !dpsMetrics.includes(key)))}</optgroup></select></label>
    ${metric==='fullDps'?`<label class="analysis-roll-toggle"><input type="checkbox" data-analysis-use-baseline-enemy data-role="saved-comparison-use-baseline-enemy"${s.analysisUseBaselineEnemy?' checked':''}>기준 빌드의 대상으로 비교</label>`:''}
    <div class="native-result-actions">${button('비교할 빌드 선택', 'choose-saved-comparison')}${button('전체 저장 빌드 비교', 'compare-builds')}${button('비교용 사본 만들기', 'copy')}</div>
    <div data-role="native-analysis-result"${s.pending.size ? ' hidden' : ''}>${result ? `<p>기준 · ${esc(metricLabel(result.metric))} <strong>${number(result.baseValue)}</strong> <small>${esc(s.document.targetBuild.name)}</small></p>
      ${result.excluded?.length?`<p>제외 · ${result.excluded.map(row=>{
        const card=SS14_CARDS.records[row.id];
        return `${row.rowIndex+1}번 칸 · ${card?.koreanTextVerified?esc(card.name):'스킬'}`;
      }).join(', ')}</p>`:''}
      ${generalBaselineReasons.length ? `<ul>${generalBaselineReasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>` : ''}
      ${baselineIssues.length?`<details><summary>기준 DPS 보류 이유</summary>${renderReasons(s,baselineIssues.flatMap(group=>group.reasons),s.report[result.metric])}</details>`:''}
      ${rows.map(row => {
        const issues=row.calculationIssues??[];
        const reasons=row.reasons.filter(reason=>!baselineReasons.has(reason)&&(!issues.length||reason!=='후보의 선택 지표가 미지원입니다.'));
        const needsInput=issues.some(group=>group.cause==='input');
        const issueDetails=issues.map(({label,reasons})=>`<details><summary>${esc(label)} ${reasons.length}건</summary><ul>${reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul></details>`).join('');
        const labels={before:'기준',after:'비교 빌드'};
        const change=row.changes;
        const skill=renderSkillLevelChanges(row.skillChanges??change?.levels,esc,{...labels,
          role:`saved-skill-levels-${row.id}`,...(!change&&{label:'스킬·보조 변화'})});
        const details=skill+(change?renderDamageBreakdown(change,esc,labels)+renderDamageRouteChanges(change.damageRoutes,labels)
          +renderResourceChanges(change,esc,{board:true}):'');
        const loadout=renderLoadoutChanges(row,{...labels,scope:'saved',id:row.id});
        return `<article class="native-comparison-row"><h3>${esc(row.name)}</h3>${row.reasons.length
        ? `<strong>비교 보류</strong>${renderEncounterChanges(row.encounterChanges,'saved-encounter-changes',{savedId:row.id})}${issueDetails}${reasons.length ? `<details><summary>이유 확인</summary><ul>${reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul></details>` : ''}`
        : `<strong>${number(row.value)}</strong><p class="native-comparison-delta">기준 대비 ${row.delta > 0 ? '+' : ''}${number(row.delta)}${result.baseValue ? ` (${row.delta > 0 ? '+' : ''}${number(row.delta / result.baseValue * 100)}%)` : ''}</p>`}
        ${loadout}${change&&details?`<details data-role="saved-build-change-details"><summary>변경 수치</summary>${details}</details>`:skill}
        ${button(needsInput?'입력 확인':'이 빌드 열기',needsInput?'open-saved-dps-input':'open',`data-id="${esc(row.id)}" aria-label="${esc(row.name)} ${needsInput?'입력 확인':'열기'}"`)}</article>`;
      }).join('') || '<p>다른 저장 빌드가 없습니다. 비교용 사본을 만들어 편집하세요.</p>'}
      ` : ''}</div>
    <details class="native-stat-note"><summary>비교 기준</summary><p>${comparisonBasis}</p></details></details>
  </section>`;
}
