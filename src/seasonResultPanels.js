import { SEASON_ADVISOR_METRICS } from './seasonAdvisor.js';
import { SEASON_DPS_ENEMY_FIELDS } from './seasonDps.js';
import { inputDestinations } from './seasonInputRequirements.js';
import { renderTrainingDummyPicker } from './seasonTrainingDummy.js';
import { SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';

const esc = v => String(v ?? '').replace(/[&<>"']/gu, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const number = v => Number.isFinite(v) ? v.toLocaleString('ko-KR', { maximumFractionDigits:2 }) : '미지원';
const button = (label, action, attrs = '') => `<button type="button" data-ss14-action="${action}" ${attrs}>${label}</button>`;
const edit = (label, role) => button(label, 'requirement', `data-section="combat" data-focus-role="${role}"`);
export const RESULT_TABS = [['stats','수치'], ['calculation','계산'], ['conditions','조건'], ['analysis','분석']];

const deltaText = r => `${r.delta > 0 ? '+' : ''}${number(r.delta)}${r.percent === null ? '' : ` (${r.percent > 0 ? '+' : ''}${number(r.percent)}%)`}`;
export function renderReasons(s,reasons) {
  const unique=new Map();
  for(const text of reasons){
    const match=/^(기준|현재): (.*)$/u.exec(text);
    const reason=match?.[2]??text;
    if(!unique.has(reason))unique.set(reason,new Set());
    if(match)unique.get(reason).add(match[1]);
  }
  const inputs=[],rest=[];
  for(const [reason,sides] of unique){
    const links=sides.size===1&&sides.has('기준')?[]:inputDestinations(s.report,reason);
    const side=sides.size===1?[...sides][0]+' · ':'';
    const actions=links.map(l=>button(esc(l.label),'requirement',`data-section="${esc(l.section??'hero')}" data-index="${l.index??''}" data-type="${esc(l.type)}" data-focus-role="${esc(l.role)}" data-field="${esc(l.edit)}" data-field-key="${esc(l.key)}"`)).join('');
    (links.length?inputs:rest).push(`<li>${side}${esc(reason)} ${actions}</li>`);
  }
  return [[inputs,'지금 입력 가능'],[rest,'계산 보류·적용 규칙']].filter(([rows])=>rows.length).map(([rows,label])=>`<h4>${label}</h4><ul>${rows.join('')}</ul>`).join('');
}
export function renderEditDpsComparison(s, compact = false) {
  const comparison = s.editComparison;
  if (!comparison || compact && !comparison.changed) return '';
  if (s.pending.size) return '<section data-role="native-edit-comparison" hidden></section>';
  const baseline = comparison.baseline;
  const previous = comparison.previous;
  return `<section class="native-edit-comparison${compact ? ' is-compact' : ''}" data-role="native-edit-comparison" aria-label="편집 전후 DPS 비교"${s.pending.size ? ' hidden' : ''}>
    ${compact ? '' : '<h2>편집 전후 자동 비교</h2>'}
    ${comparison.changed ? `<p>기준 대비 <strong class="${baseline.supported ? baseline.delta > 0 ? 'is-increase' : baseline.delta < 0 ? 'is-decrease' : '' : ''}">${baseline.supported ? deltaText(baseline) : '비교 보류'}</strong></p>
      ${previous ? `<p class="native-stat-note">직전 변경 ${previous.supported ? deltaText(previous) : '비교 보류'}</p>` : ''}` : '<p>장비·재능·옵션을 바꾸면 DPS 차이가 자동으로 표시됩니다.</p>'}
    ${compact ? (!baseline.supported ? button('비교 보류 이유', 'result-tab', 'data-tab="analysis"') : '')
      : `<dl class="native-condition-values"><div><dt>기준 DPS</dt><dd>${number(baseline.baseValue)}</dd></div><div><dt>현재 DPS</dt><dd>${number(baseline.value)}</dd></div></dl>
        ${baseline.supported && baseline.baseValue === 0 ? '<p class="native-stat-note">기준 DPS가 0이므로 증감률은 표시하지 않습니다.</p>' : ''}
        ${!baseline.supported ? `<details open><summary>기준 비교 보류 이유</summary>${renderReasons(s,baseline.reasons)}</details>` : ''}
        ${previous && !previous.supported && JSON.stringify(previous.reasons)!==JSON.stringify(baseline.reasons) ? `<details><summary>직전 변경 비교 보류 이유</summary>${renderReasons(s,previous.reasons)}</details>` : ''}
        ${button('현재 빌드를 비교 기준으로', 'reset-comparison')}
        <p class="native-stat-note">빌드를 열 때의 구성이 기준입니다. 저장해도 기준을 유지하며, 다른 빌드를 열거나 새로고침하면 새 기준으로 시작합니다.</p>`}
  </section>`;
}

export function renderResultConditions(s) {
  const inputs = s.document.targetBuild.ss14Inputs;
  return `<section class="native-result-conditions" aria-label="적용 중인 전투 조건">
    <h2>대상·스킬 조건</h2>${renderTrainingDummyPicker(inputs.dps?.enemy)}<dl class="native-condition-values">${Object.entries(SEASON_DPS_ENEMY_FIELDS).map(([key, def]) =>
      `<div><dt><label for="dock-enemy-${key}">${esc(def.label)}</label></dt><dd><input id="dock-enemy-${key}" type="number" step="any" min="${def.min}" max="${def.max}" data-season-edit="dps-input" data-key="enemy:${key}" value="${esc(inputs.dps?.enemy?.[key])}" placeholder="미입력"></dd></div>`).join('')}</dl>
    ${edit('대상 방어·스킬 사용 조건 편집', 'season-dps-input')}
    <h2>캐릭터·효과 조건</h2>${edit('기본 속성·효과 조건 편집', 'season-character-input')}${edit('기본 크리티컬 편집', 'native-critical-input')}${edit('축복 중첩 편집', 'native-blessing-input')}
    ${inputs.theaCycle || s.report.theaAverage ? `<h2>티아1 은총</h2><p>${inputs.theaCycle?.mode === 'automatic' ? `자동 주기 평균 · ${number(inputs.theaCycle.seconds)}초` : '현재 상태 직접 설정'}</p>
      ${s.report.theaAverage ? `<p>은총 유지율: ${s.report.theaAverage.supported ? `${number(s.report.theaAverage.uptime)}%` : '미지원'}</p>` : ''}
      ${edit('은총·추가 발동 조건 편집', 'season-thea-controls')}` : ''}
    ${edit('영약·특수 효과 조건 편집', 'native-extension-input')}
    <p class="native-stat-note">입력값을 적용하면 SS14 결과를 다시 계산합니다. 미입력은 0으로 간주하지 않습니다.</p>
  </section>`;
}

function renderUpgradeRanking(s){
  const job=s.pending.size?null:s.upgrades;
  let content='';
  if(job?.busy)content=`<p role="status">계산 중 <span data-upgrade-progress>${job.checked} / ${job.total}</span></p>${button('계산 중지','rank-cancel')}`;
  else if(job?.error)content=`<p role="alert">${esc(job.error)}</p>`;
  else if(job?.reasons?.length)content='<h3>전체 DPS 비교 보류</h3>'+renderReasons(s,job.reasons);
  else if(job){
    const rows=job.rows.map((r,i)=>`<li><strong>${esc(r.label)}</strong><div>${esc(r.detail)}</div>
      <div>전체 DPS ${number(job.base)} → <b>${number(r.value)}</b></div><strong class="native-comparison-delta">+${number(r.delta)} DPS${r.percent==null?'':' (+'+number(r.percent)+'%)'}</strong>
      ${r.saved?(s.dirty?'사본 저장됨':button('저장된 사본 열기','open',`data-id="${esc(r.saved)}"`)):button('사본에 적용','rank-copy',`data-index="${i}" aria-label="${i+1}위 사본에 적용"`)}</li>`).join('');
    content=`<h3>${job.mode==='gear'?'장비 추천':'한계효용'} Top 20</h3><p>비교한 후보 ${job.checked}개 · 계산 보류 ${job.blocked}개</p>
      ${rows?'<ol class="upgrade-ranking">'+rows+'</ol>':'<p>비교 가능한 후보 중 전체 DPS가 오르는 변경이 없습니다.</p>'}`;
  }
  return `<section aria-label="전체 DPS 추천"><h2>전체 DPS 추천</h2>
    <p>한계효용은 장착한 옵션 수치·레벨·강화·재능을 한 번에 한 단계씩 바꿔 비교합니다.</p>
    ${button('한계효용 Top 20','rank-options')}
    <label>장비 추천 부위<select data-upgrade-slot>${[['all','전체 부위'],...SEASON_GEAR_SLOT_LABELS.map((n,i)=>[String(i),n])].map(([v,n])=>`<option value="${v}"${v===(s.upgradeSlot??'all')?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
    ${button('장비 추천 계산','rank-gear')}
    <small>장비 한 부위를 교체합니다. 도감 장비의 빈 옵션 수치는 SS14 범위 상한, 보관함 장비는 저장값으로 계산합니다.</small>
    <div data-upgrade-results>${content}</div></section>`;
}
export function renderResultAnalysis(s) {
  const result = s.pending.size ? null : s.analysis;
  const metric = s.analysisMetric ?? 'fullDps';
  const rows = [...(result?.rows ?? [])].sort((a,b) => Number(!!a.reasons.length) - Number(!!b.reasons.length) || (b.delta ?? 0) - (a.delta ?? 0));
  return `<section class="native-result-analysis" aria-label="저장 빌드 비교">
    ${renderUpgradeRanking(s)}
    ${renderEditDpsComparison(s)}
    <h2>저장 빌드 비교</h2>
    <label>비교 지표<select data-analysis-metric aria-label="비교 지표">${Object.entries(SEASON_ADVISOR_METRICS).map(([key,label]) => `<option value="${key}"${metric === key ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
    <div class="native-result-actions">${button('저장 빌드와 비교', 'compare-builds')}${button('비교용 사본 만들기', 'copy')}</div>
    <div data-role="native-analysis-result"${s.pending.size ? ' hidden' : ''}>${result ? `<p>기준: <strong>${number(result.baseValue)}</strong></p>
      ${result.baselineReasons.length ? `<ul>${result.baselineReasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>` : ''}
      ${rows.map(row => `<article class="native-comparison-row"><h3>${esc(row.name)}</h3>${row.reasons.length
        ? `<strong>비교 보류</strong><details><summary>이유 확인</summary><ul>${row.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul></details>`
        : `<strong>${number(row.value)}</strong><p class="native-comparison-delta">기준 대비 ${row.delta > 0 ? '+' : ''}${number(row.delta)}${result.baseValue ? ` (${row.delta > 0 ? '+' : ''}${number(row.delta / result.baseValue * 100)}%)` : ''}</p>`}
        ${button('이 빌드 열기', 'open', `data-id="${esc(row.id)}" aria-label="${esc(row.name)} 열기"`)}</article>`).join('') || '<p>다른 저장 빌드가 없습니다. 비교용 사본을 만들어 편집하세요.</p>'}
      ${metric !== 'fullDps' ? '<p class="native-stat-note">선택 지표의 부분 비교입니다. 전체 DPS 순위가 아닙니다.</p>' : ''}` : '<p>비교를 실행하면 수치 차이와 비교할 수 없는 이유를 표시합니다.</p>'}</div>
    <details class="native-stat-note"><summary>비교 기준</summary><p>현재 편집 중인 빌드가 기준입니다. 사본에서 장비·재능·옵션을 바꿔 저장한 뒤 비교하세요. 다른 전투 조건이나 미확인 효과가 있으면 순위를 매기지 않습니다.</p></details>
  </section>`;
}
