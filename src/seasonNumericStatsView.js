const esc = v => String(v ?? "").replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const number = v => Number.isFinite(v) ? v.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "확인 필요";
const safeName = v => v && !/\p{Script=Han}/u.test(v) ? v : "한국어 이름 미제공";
const link = r => /^https:\/\/tlidb\.com\/(en|ko)\//u.test(r?.sourceUrl ?? "")
  ? `<a href="${esc(r.sourceUrl)}" target="_blank" rel="noreferrer">SS14 근거</a>` : "";
const cell = (label, value, key, suffix = "") => `<div class="native-stat-cell"><dt>${label}</dt><dd data-stat="${key}">${number(value)}${Number.isFinite(value) ? suffix : ""}</dd></div>`;
const signed = v => `${v > 0 ? "+" : ""}${number(v)}`;
function sourceValue(source, stat) {
  if (stat === "mana-cost-multiplier") return `×${number(source.value / 100)}`;
  return `${source.operation === "set" ? number(source.value) : signed(source.value)}${source.unit === "percent" || ["add_percent", "more", "more_percent"].includes(source.operation) ? "%" : ""}${["more", "more_percent"].includes(source.operation) ? " 별도" : source.operation === "set" ? " 고정" : ""}`;
}
function optionValue(row) {
  if (row.conflict) return "고정값 충돌";
  return [row.flat === null ? "" : signed(row.flat), row.increased === null ? "" : `${signed(row.increased)}% 증가`,
    row.more === null ? "" : `×${row.more.toLocaleString("ko-KR", { maximumFractionDigits: 6 })} 별도`, row.fixed === null ? "" : `${number(row.fixed)} 고정`].filter(Boolean).join(" · ");
}

export function renderSeasonNumericStats(report) {
  const stats = report.numericStats;
  if (!stats) return "";
  const c = report.character, unavailable = stats.unresolved.length + stats.excluded.length;
  return `<section class="native-numeric-stats" data-role="native-numeric-stats" aria-label="SS14 수치 계산">
    <h2>캐릭터 수치</h2><p class="native-stat-note">확인된 옵션 기준${report.theaAverage ? " · 전투 시작 상태" : ""}</p>
    <dl class="native-stat-grid">${Object.entries({ strength: "힘", dexterity: "민첩", intelligence: "지혜", life: "최대 HP", mana: "최대 MP", shield: "최대 보호막", armor: "아머", evasion: "회피" }).map(([key, label]) => cell(label, c.values[key], key)).join("")}</dl>
    <details data-role="numeric-resistances"><summary>저항</summary><dl class="native-stat-grid">${Object.entries({ fire: "화염", cold: "냉기", lightning: "번개", erosion: "부식" }).map(([key, label]) => cell(`${label} 저항 합계`, c.resistances[key].raw, `resistance-${key}`, "%")).join("")}</dl>
      <p>레벨 감점 포함·상한 적용 전입니다. 적용 저항은 자원·방어 상세에서 확인하세요.</p></details>
    <button type="button" data-ss14-action="requirement" data-section="combat" data-focus-role="season-character-input">기본 속성 입력</button>
    <details data-role="numeric-recovery"><summary>회복·방어 수치</summary><dl class="native-stat-grid">
      ${cell("옵션 HP 자연 회복", c.values.lifeRegenerationGranted, "life-regeneration", "/초")}${cell("옵션 MP 자연 회복", c.values.manaRegenerationGranted, "mana-regeneration", "/초")}
      ${cell("보호막 충전", c.values.shieldRechargePerSecond, "shield-recharge", "/초")}${cell("보호막 충전 대기", c.values.shieldRechargeDelay, "shield-delay", "초")}
      ${cell("원소 이상 회피", c.values.elementalAilmentAvoidancePercent, "elemental-ailment-avoidance", "%")}${cell("받는 원소 대미지 배율", c.values.elementalDamageTakenMultiplier, "elemental-damage-taken", "배")}
      </dl><p>자연 회복은 확인된 옵션의 기여도이며, 충전은 시작 후의 속도입니다. 받는 대미지 배율에는 아머·저항·회피·막기가 포함되지 않습니다.</p></details>
    <details data-role="numeric-skills" open><summary>스킬 수치</summary>${stats.skills.map(skill => `<article class="native-numeric-skill">
      <h3>${esc(safeName(skill.name))} · Lv.${number(skill.level)}</h3>
      <dl class="native-stat-grid">${cell("기본 1회 명중", skill.values.averageHit, `skill-${skill.rowIndex}-base-hit`)}${cell("기본 시전 시간", skill.values.castTime, `skill-${skill.rowIndex}-cast-time`, "초")}${cell("기본 MP 소모", skill.values.manaCost, `skill-${skill.rowIndex}-mana`)}</dl>
      ${Number.isFinite(skill.values.minHit) ? `<p class="native-hit-range">옵션 반영 명중 <strong>${number(skill.values.minHit)}–${number(skill.values.maxHit)}</strong></p><p class="native-stat-note">주 속성·크리티컬·적 방어 적용 전</p>` : ""}
      <details data-role="numeric-skill-${skill.rowIndex}"><summary>속도·크리티컬</summary><dl class="native-stat-grid">${cell("초당 공격·시전", skill.values.rate, `skill-${skill.rowIndex}-rate`)}${cell("크리티컬 수치", skill.values.criticalRating, `skill-${skill.rowIndex}-critical-rating`)}${cell("크리티컬 확률", skill.values.criticalChance, `skill-${skill.rowIndex}-critical-chance`, "%")}${cell("크리티컬 대미지", skill.values.criticalDamage, `skill-${skill.rowIndex}-critical-damage`, "%")}</dl>${link(skill.receipt)}
      ${skill.blockers.length ? `<ul>${skill.blockers.map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>` : ""}</details></article>`).join("") || "<p>스킬을 선택하면 기본 수치가 표시됩니다.</p>"}</details>
    <details data-role="numeric-options"><summary>옵션 합계 · ${stats.options.length}항목</summary><p>동일 항목의 고정 수치·증가율·별도 배율입니다. 서로 다른 대미지 종류나 적용 대상은 따로 표시합니다.</p>
      <label>항목·출처 검색<input type="search" data-numeric-filter aria-label="옵션 합계 검색" /></label>
      ${stats.options.map(row => `<details class="native-numeric-option" data-numeric-row data-role="numeric-option-${esc(row.key)}"><summary><span>${esc(row.label)}${row.scope !== "global" ? ` · ${esc(row.scopeLabel)}` : ""}</span><strong>${optionValue(row)}</strong></summary>
        ${/damage_reflection$/u.test(row.stat) ? "<p>반사 기본 수치 합계입니다. 피격 횟수와 최종 반사 DPS는 포함하지 않습니다.</p>" : ""}
        <ul>${row.sources.map(source => `<li><span>${esc(source.origin)} · ${esc(safeName(source.name))}</span><b>${sourceValue(source, row.stat)}</b> ${link(source.receipt)}</li>`).join("")}</ul></details>`).join("") || "<p>합산할 옵션이 없습니다.</p>"}</details>
    ${unavailable ? `<details data-role="numeric-unresolved"><summary>미반영·확인 필요 ${unavailable}건</summary><ul>${stats.unresolved.map(r => `<li>${esc(r.label ?? "선택 효과")}: ${esc(r.reason)}</li>`).join("")}${stats.excluded.map(r => `<li>${esc(r.origin)} · ${esc(safeName(r.name))}: ${esc(r.reason)}</li>`).join("")}</ul></details>` : ""}
  </section>`;
}
