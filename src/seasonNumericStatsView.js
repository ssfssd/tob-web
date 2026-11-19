const esc = v => String(v ?? "").replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const number = v => Number.isFinite(v) ? v.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "확인 필요";
const safeName = v => v && !/\p{Script=Han}/u.test(v) ? v : "한국어 이름 미제공";
const link = r => /^https:\/\/tlidb\.com\/(en|ko)\//u.test(r?.sourceUrl ?? "")
  ? `<a href="${esc(r.sourceUrl)}" target="_blank" rel="noreferrer">SS14 근거</a>` : "";
const cell = (label, value, key, suffix = "") => `<div class="native-stat-cell"><dt>${label}</dt><dd data-stat="${key}">${number(value)}${Number.isFinite(value) ? suffix : ""}</dd></div>`;
const activeSlotLabel = index => index === 0 ? '주력 스킬' : '액티브 '+(index+1);
function renderElixirRestoration(rows) {
  if (!rows?.length) return '';
  return `<details data-role="elixir-restoration"><summary>회복 영약</summary><table aria-label="영약 1회 회복량">
    <thead><tr><th scope="col">영약</th><th scope="col">1회 회복량</th><th scope="col">기본 회복 시간</th></tr></thead><tbody>
    ${rows.map(({name,resource,percent,baseDuration,receipt,level,perUse}) => {
      const unit=resource==='mana'?'MP':'HP';
      const amount=Number.isFinite(perUse) ? `${number(perUse)} ${unit}` : '확인 필요';
      return `<tr><th scope="row">${esc(safeName(name))} · Lv.${number(level)} ${link(receipt)}</th><td>${amount}${Number.isFinite(percent)?` (최대 ${unit}의 ${number(percent)}%)`:''}</td><td>${number(baseDuration)}초</td></tr>`;
    }).join('')}</tbody></table><p class="native-stat-note">표시량은 최대 HP·MP와 영약 효과 배율 기준입니다. 전투 중 실제 회복량은 사용 시점과 자원 잔량에 따라 달라집니다.</p></details>`;
}
function skillCosts(cost, key) {
  if(cost?.manaPerUse==null)return '';
  const values=[];
  if(cost.manaPerUse>0||!cost.lifePerUse)values.push(['MP','mana',cost.manaPerUse,cost.manualManaPerSecond]);
  if(cost.lifePerUse>0)values.push(['HP','life',cost.lifePerUse,cost.manualLifePerSecond]);
  return values.map(([label,resource,perUse,perSecond])=>cell(`시전당 ${label}`,perUse,`${key}-${resource}-per-use`)
    +(perSecond!=null?cell(`수동 시전 ${label}`,perSecond,`${key}-${resource}-per-second`,'/초'):'')).join('');
}
function manaBalance(budget, measured, assumed, otherBudget, survival, costs, excluded, timedCombat) {
  const observe = '<button type="button" data-ss14-action="requirement" data-section="combat" data-field="character-input" data-field-key="observedManaRecovery">관측 MP 회복 입력</button>';
  const staleObservation = survival?.manaObservationStale;
  const staleNote = staleObservation ? '<p data-role="stale-mana-observation">MP 회복 조건이 바뀌어 새 관측값이 필요합니다.</p>' : '';
  if(!budget)return staleNote ? staleNote+observe : '';
  const net=value=>!Number.isFinite(value)?'확인 필요':`${value<0?'부족':value>0?'여유':'균형'} ${number(Math.abs(value))}`;
  const channels=budget.channels??[];
  const hasChargeTimes=channels.some(row=>row.observed&&row.valid&&row.times);
  const hasAverageCharges=channels.some(row=>row.observed&&row.valid&&!row.times);
  const editChannel=(rowIndex, byTime)=>`<button type="button" data-ss14-action="result-tab" data-tab="conditions"
    data-field="dps-input" data-field-key="${rowIndex}:${byTime?'channelCostTimes':'channelCostRate'}">스킬 ${rowIndex+1} ${byTime?'차감 시각':'비용 횟수'} 입력</button>`;
  const unknown=budget.unresolvedRows.filter(index=>!channels.some(row=>row.rowIndex===index));
  const observed=budget.recovery.find(row=>row.id==='observed');
  const inputRecovery=assumed && otherBudget?.recovery.find(row=>row.id==='observed');
  const inputObserved=assumed && (Number.isFinite(inputRecovery?.value) ? inputRecovery
    : survival?.manaScenarios?.find(row=>row.id==='observed'));
  const basisRows=observed?[observed]:budget.recovery;
  const assumptions=observed?budget.recovery.filter(row=>row!==observed):[];
  const otherMana=otherBudget?.manaPerSecond;
  const compareMana=Number.isFinite(otherMana)&&otherMana!==budget.manaPerSecond;
  const hasLife=costs.some(row=>row.lifePerSecond>0);
  const skillCosts=costs.length?`<details data-role="manual-costs-by-skill"><summary>스킬별 초당 소모</summary>
    <table><thead><tr><th scope="col">스킬</th><th scope="col">MP/초</th>${hasLife?'<th scope="col">HP/초</th>':''}</tr></thead><tbody>
    ${costs.map(row=>`<tr><th scope="row">${esc(row.name)} · ${activeSlotLabel(row.rowIndex)}</th><td>${number(row.manaPerSecond)}</td>${hasLife?`<td>${number(row.lifePerSecond)}</td>`:''}</tr>`).join('')}</tbody></table></details>`:'';
  const table=(rows, inputOnly=false)=>`<table aria-label="${inputOnly?'입력 조건의 관측 MP 수지':'초당 MP 자연 회복과 차이'}"><thead><tr><th scope="col">${measured && !inputOnly ? '측정 구간 평균 자연 회복' : '자연 회복'}</th><th scope="col">MP/초</th><th scope="col">소모 대비</th></tr></thead><tbody>
    ${rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th><td>${number(row.value)}</td><td data-stat="mana-balance-${esc(row.id)}">${net(row.balance)}</td></tr>`).join('')}</tbody></table>`;
  return `<section aria-label="수동 시전 자원 수급"><h3>수동 시전 자원 수급</h3><dl class="native-stat-list">
    ${cell('MP 소모',budget.manaPerSecond,'manual-mana-total','/초')}${compareMana?cell(assumed?'입력 조건 MP 소모':'방어 전 MP 소모',otherMana,'manual-mana-other','/초'):''}${budget.lifePerSecond>0?cell('HP 소모',budget.lifePerSecond,'manual-life-total','/초'):''}</dl>
    ${skillCosts}${excluded.length?`<p class="native-stat-note">시전 소모 미집계 · ${excluded.map(name=>esc(name)).join(' · ')}</p>`:''}
    ${budget.shareOverflow?`<p>시전 배분 ${number(budget.shareOverflow)}% / 최대 100%</p><button type="button" data-ss14-action="result-tab" data-tab="conditions">시전 배분 확인</button>`:''}
    ${unknown.length?`<p class="native-stat-note">스킬 ${unknown.map(row=>row+1).join('·')}의 비용 또는 시전 횟수를 확인하세요.</p>`:''}
    ${channels.map(({rowIndex,rate,max,valid,variable})=>valid?'':Number.isFinite(rate)&&Number.isFinite(max)&&rate<=max&&variable
      ? `<p class="native-stat-note">스킬 ${rowIndex+1}의 비용이 전투 중 바뀌어 평균 차감 횟수로는 소모량을 확정할 수 없습니다.${timedCombat?' '+editChannel(rowIndex,true):''}</p>`
      : `<p class="native-stat-note">${rate===null?'채널링 비용 차감 횟수가 비어 있습니다.':Number.isFinite(max)?`채널링 비용 차감은 최대 ${number(max)}회/초입니다.`:'채널링 비용 차감의 상한을 확인할 수 없습니다.'} ${editChannel(rowIndex,false)}${timedCombat?' '+editChannel(rowIndex,true):''}</p>`).join('')}
    ${inputObserved?table([{...inputObserved,label:'입력 조건 · 관측 자연 회복'}],true):''}
    ${table(basisRows)}
    ${assumptions.length?`<details data-role="mana-formula-alternatives"><summary>공식별 회복값</summary>${table(assumptions)}</details>`:''}
    ${staleNote}${observe}
    <p class="native-stat-note">${budget.manaStatus==='deficit'?'표시 DPS를 유지하려면 부족한 MP를 보충해야 합니다. ':''}${budget.manaStatus==='mixed'?'회복 공식에 따라 소모 충당 여부가 달라집니다. ':''}${hasChargeTimes?'차감 시각을 입력한 채널링은 측정 구간에 포함된 차감만 집계합니다. ':''}${hasAverageCharges?(hasChargeTimes?'나머지 ':'')+'채널링 소모는 입력한 평균 차감 횟수로 계산합니다. ':''}자동 발동과 즉시 회복은 제외합니다.</p></section>`;
}
function manaReservationRows(rows) {
  if (!rows?.length) return '';
  const percent = value => Number.isFinite(value) ? number(value)+'%' : '확인 필요';
  const sourceLabel=rows.some(row=>Number.isInteger(row.supportIndex))?'스킬·보조':'오라';
  return `<table aria-label="${sourceLabel}별 MP 봉인"><thead><tr><th scope="col">${sourceLabel}</th><th scope="col">기본 봉인</th><th scope="col">적용 봉인</th></tr></thead><tbody>
    ${rows.map(row=>`<tr data-role="mana-reservation-${row.rowIndex}${Number.isInteger(row.supportIndex)?'-support-'+row.supportIndex:''}"><th scope="row">${esc(safeName(row.name))}</th><td>${row.active===false?'—':percent(row.base)}</td><td>${row.blocked?'확인 필요':row.active===false?'꺼짐':percent(row.applied)}</td></tr>`).join('')}</tbody></table>`;
}
const signed = v => `${v > 0 ? "+" : ""}${number(v)}`;
function sourceValue(source, stat) {
  if (stat === "mana-cost-multiplier") return `×${number(source.value / 100)}`;
  return `${source.operation === "set" ? number(source.value) : signed(source.value)}${source.unit === "percent" || ["add_percent", "more", "more_percent"].includes(source.operation) ? "%" : ""}${["more", "more_percent"].includes(source.operation) ? " 별도" : source.operation === "set" ? " 고정" : ""}`;
}
export function formatSeasonOptionTotals(row) {
  if (row.conflict) return "고정값 충돌";
  return [row.flat === null ? "" : signed(row.flat), row.increased === null ? "" : `${signed(row.increased)}% 증가`,
    row.more === null ? "" : `×${row.more.toLocaleString("ko-KR", { maximumFractionDigits: 6 })} 별도`, row.fixed === null ? "" : `${number(row.fixed)} 고정`].filter(Boolean).join(" · ");
}

export function describeSeasonOptionChange({before,after}) {
  const from=before?formatSeasonOptionTotals(before):'—';
  const to=after?formatSeasonOptionTotals(after):'—';
  return from===to?'':`${(after??before).label} · ${from} → ${to}`;
}

export function renderSeasonNumericStats(report) {
  const stats = report.numericStats;
  if (!stats) return "";
  const c = report.character, unavailable = stats.unresolved.length + stats.excluded.length;
  const assumed = !report.fullDps.supported && report.assumedDps?.supported ? report.assumedDps : null;
  const displayedDps = assumed ?? report.fullDps;
  const activeStats=stats.skills.filter(skill=>skill.rowIndex<5).sort((a,b)=>a.rowIndex-b.rowIndex);
  const skillBySlot=new Map(activeStats.map(skill=>[skill.rowIndex,skill]));
  const activeRows=displayedDps.rows.filter(row=>row.rowIndex<5);
  const summarySkill=activeStats.find(skill=>activeRows.some(row=>
    row.rowIndex===skill.rowIndex&&row.id===skill.id&&(row.rowIndex===0||row.supported)))
    ?? activeStats.find(skill=>skill.rowIndex===0);
  const summaryLabel=summarySkill?activeSlotLabel(summarySkill.rowIndex):'';
  const mana = assumed?.manaReservation ?? c.values;
  const manaReservations = assumed?.manaReservations ?? c.manaReservations;
  const summaryCalculation = assumed?.rows.find(row => row.rowIndex === summarySkill?.rowIndex);
  const summaryRate = assumed ? summaryCalculation?.useRate : summarySkill?.values.rate;
  const summaryCritical = assumed ? summaryCalculation?.detail?.critical?.effectiveCriticalChance : summarySkill?.values.criticalChance;
  const averaged = assumed ? assumed.measuredResources : report.theaAverage?.supported;
  const elixirUptime=assumed?assumed.elixirUptime:report.elixirUptime;
  const averagedElixir=elixirUptime?.supported&&elixirUptime.rows.some(r=>r.uptime>0&&r.uptime<100);
  const budget = displayedDps.manualResources;
  const costs=activeRows.flatMap(row=>{
    const skill=skillBySlot.get(row.rowIndex);
    if(!skill||row.manualManaPerSecond===0&&row.manualLifePerSecond===0
      || row.manualManaPerSecond==null&&row.manualLifePerSecond==null&&!budget?.unresolvedRows.includes(row.rowIndex))return [];
    return [{rowIndex:row.rowIndex,name:safeName(skill.name),manaPerSecond:row.manualManaPerSecond,lifePerSecond:row.manualLifePerSecond}];
  }).sort((a,b)=>a.rowIndex-b.rowIndex);
  const excluded=report.components.filter(c=>c.category==='skills').flatMap(c=>c.calculations??[])
    .filter(entry=>entry.rowIndex<5&&entry.mechanics?.some(m=>m.kind==='utility-skill'&&m.utility!=='restoration'))
    .map(entry=>safeName(skillBySlot.get(entry.rowIndex)?.name));
  const otherBudget=(assumed?report.fullDps:report.assumedDps)?.manualResources;
  const manaStatus=Number.isFinite(mana.unreservedMana)?budget?.manaStatus:null;
  const resources = [
    ['최대 HP', c.values.life, 'life'], ['최대 보호막', c.values.shield, 'shield'],
    ['사용 가능 MP', mana.unreservedMana, 'available-mana'],
  ].filter(([,value]) => Number.isFinite(value));
  const defense = [['아머', c.values.armor, 'armor'], ['회피', c.values.evasion, 'evasion']]
    .filter(([,value]) => Number.isFinite(value));
  const resistances = Object.entries({ fire: "화염", cold: "냉기", lightning: "번개", erosion: "부식" });
  const visibleResistances = resistances.filter(([key]) => Number.isFinite(c.resistances[key].effective ?? c.resistances[key].raw));
  const hasRawResistance = visibleResistances.some(([key]) => !Number.isFinite(c.resistances[key].effective));
  const defenseRows = defense.map(([label,value,key]) => cell(label,value,key)).join('') +
    visibleResistances.map(([key,label]) => {
      const resistance = c.resistances[key];
      return cell(label + ' 저항' + (Number.isFinite(resistance.effective) ? '' : ' *'), resistance.effective ?? resistance.raw, 'resistance-' + key, '%');
    }).join('');
  return `<section class="native-numeric-stats" data-role="native-numeric-stats" aria-label="SS14 수치 계산">
    ${summarySkill ? `<button type="button" class="native-stat-link" data-ss14-action="result-tab" data-tab="calculation" data-index="${summarySkill.rowIndex}" aria-label="${summaryLabel} ${esc(safeName(summarySkill.name))} 계산 보기"><strong>${esc(safeName(summarySkill.name))}</strong><span aria-hidden="true">›</span></button>
      <dl class="native-stat-list" aria-label="${averaged?'전투 시작 시 ':''}${summaryLabel} 수치">${Number.isFinite(summaryRate) ? cell(summarySkill.rateLabel, summaryRate, "primary-rate", "회/초") : ''}${Number.isFinite(summaryCritical) ? cell("크리티컬 확률", summaryCritical, "primary-critical-chance", "%") : ''}</dl>` : '<button type="button" data-ss14-action="section" data-section="skills">주력 스킬 선택</button>'}
    ${resources.length ? `<dl class="native-stat-list" aria-label="캐릭터 자원">${resources.map(([label,value,key]) => cell(label,value,key)).join('')}</dl>` : ''}
    ${defenseRows ? `<details class="native-numeric-detail" data-role="numeric-defense-overview"><summary>방어·저항</summary><dl class="native-stat-list native-defense-overview" aria-label="캐릭터 방어">${defenseRows}</dl>
      ${hasRawResistance ? '<small class="native-stat-note">* 상한 적용 전</small>' : ''}</details>` : ''}
    <details class="native-numeric-detail"><summary>상세 수치</summary>
    ${Number.isFinite(mana.mana)||budget?`<details data-role="numeric-mana"><summary data-role="numeric-mana-summary">MP 상세${assumed?' · 방어 전 DPS 기준':''}${averagedElixir?' · 영약 유지율 평균':''}${manaStatus==='deficit'?' · 자연 회복 부족':manaStatus==='mixed'?' · 회복 기준별 차이':''}</summary>
      <dl class="native-stat-list">${cell("최대 MP", mana.mana, "mana")}${cell("봉인 MP", mana.reservedManaPercent, "reserved-mana", "%")}${cell("봉인 MP 보상", mana.sealedManaCompensation, "seal-compensation", "%")}</dl>
      ${manaReservationRows(manaReservations)}
      ${mana.reservedManaPercent===null?`<button type="button" data-ss14-action="result-tab" data-tab="conditions">${manaReservations?.some(row=>Number.isInteger(row.supportIndex))?'봉인 조건 확인':'오라 조건 확인'}</button>`:''}
      ${manaBalance(budget, averaged, assumed, otherBudget, c.survival, costs, [...new Set(excluded)],
        displayedDps.scope==='ss14-thea-joint-combat')}</details>`:''}
    ${renderElixirRestoration(stats.elixirRestoration)}
    <details data-role="numeric-character"><summary>속성·에너지</summary>
    <dl class="native-stat-list">${Object.entries({ strength: "힘", dexterity: "민첩", intelligence: "지혜" }).map(([key, label]) => cell(label,c.values[key],key)).join("")}
      <div class="native-stat-cell"><dt>스킬 에너지</dt><dd data-stat="skill-energy">${number(report.energy?.used)} / ${number(report.energy?.maximum)}</dd></div>
    </dl>
    <details data-role="numeric-resistances"><summary>저항 상한 상세</summary><dl class="native-stat-list">${resistances.map(([key,label]) => cell(`${label} · 캐릭터 도움말`, c.resistances[key].scenarios[0], `character-cap-${key}`, "%") + cell(`${label} · 저항 도움말`, c.resistances[key].scenarios[1], `resistance-cap-${key}`, "%")).join("")}</dl></details>
    <details data-role="numeric-recovery"><summary>회복·방어 수치</summary><dl class="native-stat-grid">
      ${cell("옵션 HP 자연 회복", c.values.lifeRegenerationGranted, "life-regeneration", "/초")}${cell("옵션 MP 자연 회복", c.values.manaRegenerationGranted, "mana-regeneration", "/초")}
      ${cell("보호막 충전", c.values.shieldRechargePerSecond, "shield-recharge", "/초")}${cell("보호막 충전 대기", c.values.shieldRechargeDelay, "shield-delay", "초")}
      ${cell("원소 이상 회피", c.values.elementalAilmentAvoidancePercent, "elemental-ailment-avoidance", "%")}${cell("받는 원소 대미지 배율", c.values.elementalDamageTakenMultiplier, "elemental-damage-taken", "배")}
      </dl><p>자연 회복은 확인된 옵션의 기여도이며, 충전은 시작 후의 속도입니다. 받는 대미지 배율에는 아머·저항·회피·막기가 포함되지 않습니다.</p></details>
    <button type="button" data-ss14-action="requirement" data-section="combat" data-focus-role="season-character-input">기본 속성 입력</button></details>
    ${stats.skills.length ? `<details data-role="numeric-skills"><summary>스킬 수치</summary>${stats.skills.map(skill => {
      const costs=skillCosts(displayedDps.rows.find(row=>row.rowIndex===skill.rowIndex),`skill-${skill.rowIndex}`);
      return `<article class="native-numeric-skill">
      <h3>${esc(safeName(skill.name))} · Lv.${number(skill.level)}</h3>
      <dl class="native-stat-grid">${cell("기본 1회 명중", skill.values.averageHit, `skill-${skill.rowIndex}-base-hit`)}${cell("기본 시전 시간", skill.values.castTime, `skill-${skill.rowIndex}-cast-time`, "초")}${cell("기본 MP 소모", skill.values.manaCost, `skill-${skill.rowIndex}-mana`)}</dl>
      ${costs?`<dl class="native-stat-grid">${costs}</dl>`:''}
      ${Number.isFinite(skill.values.minHit) ? `<p class="native-hit-range">옵션 반영 명중 <strong>${number(skill.values.minHit)}–${number(skill.values.maxHit)}</strong></p><p class="native-stat-note">주 속성·크리티컬·적 방어 적용 전</p>` : ""}
      <details data-role="numeric-skill-${skill.rowIndex}"><summary>속도·크리티컬</summary><dl class="native-stat-grid">${cell("초당 공격·시전", skill.values.rate, `skill-${skill.rowIndex}-rate`)}${cell("크리티컬 수치", skill.values.criticalRating, `skill-${skill.rowIndex}-critical-rating`)}${cell("크리티컬 확률", skill.values.criticalChance, `skill-${skill.rowIndex}-critical-chance`, "%")}${cell("크리티컬 대미지", skill.values.criticalDamage, `skill-${skill.rowIndex}-critical-damage`, "%")}</dl>${link(skill.receipt)}
      ${skill.blockers.length ? `<ul>${skill.blockers.map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>` : ""}</details></article>`;
    }).join("")}</details>` : ''}
    ${stats.options.length ? `<details data-role="numeric-options"><summary>옵션 합계</summary>
      <label>항목·출처 검색<input type="search" data-numeric-filter aria-label="옵션 합계 검색" /></label>
      ${stats.options.map(row => `<details class="native-numeric-option" data-numeric-row data-role="numeric-option-${esc(row.key)}"><summary><span>${esc(row.label)}${row.scope !== "global" ? ` · ${esc(row.scopeLabel)}` : ""}</span><strong>${formatSeasonOptionTotals(row)}</strong></summary>
        ${/damage_reflection$/u.test(row.stat) ? "<p>반사 기본 수치 합계입니다. 피격 횟수와 최종 반사 DPS는 포함하지 않습니다.</p>" : ""}
        <ul>${row.sources.map(source => `<li><span>${esc(source.origin)} · ${esc(safeName(source.name))}</span><b>${sourceValue(source, row.stat)}</b> ${link(source.receipt)}</li>`).join("")}</ul></details>`).join("")}</details>` : ''}
    ${unavailable ? `<details data-role="numeric-unresolved"><summary>효과 확인</summary><ul>${stats.unresolved.map(r => `<li>${esc(r.label ?? "선택 효과")}: ${esc(r.reason)}</li>`).join("")}${stats.excluded.map(r => `<li>${esc(r.origin)} · ${esc(safeName(r.name))}: ${esc(r.reason)}</li>`).join("")}</ul></details>` : ""}
    </details>
  </section>`;
}
