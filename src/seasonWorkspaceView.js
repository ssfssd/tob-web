import { calculateSeasonBuild } from "./seasonBuild.js";
import { seasonCalculationIssues, seasonDpsStatusLabel } from './seasonCalculationIssues.js';
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";
import { SS14_GEAR_EN } from "./data/ss14Gear.en.generated.js";
import { parseTlidbGearTooltip } from "./tlidbGearTooltipCalculation.js";
import { normalizeBuild } from "./engine.js";
import { findItemById } from "./catalog.js";
import { getSeasonSelectionOptions, getSeasonSelectionRecord, SEASON_GEAR_SLOT_LABELS } from "./seasonSelections.js";
import { exportSeasonWorkspace } from "./seasonWorkspace.js";
import { SEASON_CONFIGURATION_GROUPS, compareSeasonConfigurations } from "./seasonConfiguration.js";
import { seasonSupportOptions } from "./seasonSupport.js";
import { formatAppDateTime } from "./dateTimePresentation.js";
import { SEASON_COMPONENT_LABELS } from "./seasonComponents.js";
import { SEASON_CHARACTER_INPUTS } from "./seasonCharacter.js";
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS, seasonDpsSkillFieldKeys } from "./seasonDps.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { SEASON_HERO_COMBAT_FIELDS } from "./seasonMechanicInputs.js";
import { seasonSlateOptions } from "./seasonDivinity.js";
import { seasonGameCritical, validGameCriticalBinding } from "./seasonGameData.js";
import { SEASON_BLESSINGS, blessingLabel, blessingConditionValue } from "./seasonBlessings.js";
import { recommendSeasonWorkspaces, SEASON_ADVISOR_METRICS } from "./seasonAdvisor.js";
import { seasonTheaOptions, THEA_SS14_ID, EMPTY_TRAIT_MEMORY, canMarkTraitMemoryEmpty } from "./seasonHeroSelection.js";
import { isThea, hasRevelation, revelationBoardOptions, revelationNodeOptions } from "./seasonTheaRevelation.js";
import { THEA_EVENT_FIELDS } from "./seasonTheaEvents.js";
import { theaCombatKeys } from "./seasonTheaCombatInputs.js";
import { logReviewRows } from "./seasonLogReview.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/gu,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const number = (value) => Number.isFinite(value) ? value.toLocaleString("ko-KR", { maximumFractionDigits: 5 }) : "미지원";
const sourceLink = (receipt) => /^https:\/\/tlidb\.com\/(?:en|ko)\//u.test(receipt?.sourceUrl ?? "")
  ? `<a href="${escape(receipt.sourceUrl)}" target="_blank" rel="noreferrer">SS14 원문</a>` : "";
const koreanRecord = (id) => {
  const record = SS14_CARDS.records[id] ?? SS14_SUPPORTS.records[id];
  return record?.season === "SS14" && record.koreanTextVerified ? record : null;
};
const name = (id) => koreanRecord(id)?.name ?? "한국어 이름 미제공";
export { selectionControls, supportControls, rollControls, componentControls, memoryControls, destinyControls,
  extensionControls, characterControls, characterResults, blessingControls, offenseControls, theaControls, dpsControls, dpsResults, componentResults };

function selectionSearch(id, label) {
  return `<label class="season-selection-search">이름 검색<input type="search" data-season-filter="${id}" aria-label="${escape(label)} 이름 검색" placeholder="이름으로 찾기" autocomplete="off" aria-controls="${id}" /></label>
    <p class="season-search-count" data-season-filter-status="${id}" role="status" hidden></p>`;
}

function slotIcon(id) {
  const item = findItemById(id);
  const path = item?.localIconPath || item?.iconUrl;
  return typeof path === "string" && /^\/?assets\/[\w./-]+$/u.test(path)
    ? `<img src="${escape(path)}" width="40" height="40" alt="" loading="lazy" />`
    : `<span class="season-slot-empty" aria-hidden="true">+</span>`;
}

function selectionControls(document, report, formValues) {
  const normalized = normalizeBuild(document.targetBuild);
  return `<details data-role="season-selection-editor"><summary>SS14 스킬·장비 구성 교체</summary>
    <p>장비를 교체하면 해당 칸의 옵션을 다시 선택해야 합니다.</p>
    ${["skills", "gear"].map((category) => `<fieldset class="season-slot-grid"><legend>${category === "skills" ? "스킬 구성" : "장비 구성"}</legend>${Array.from({ length: category === "gear" ? 10 : 9 }, (_, index) => {
      const current = category === "gear" ? normalized.gear.slots[index]?.itemId : normalized.selections.skills[index];
      const options = getSeasonSelectionOptions(category, index);
      const label = category === "gear" ? SEASON_GEAR_SLOT_LABELS[index] : `${index < 5 ? "액티브" : "패시브"} 스킬 ${index < 5 ? index + 1 : index - 4}`;
      const id = `season-choice-${category}-${index}`;
      const component = report.components.find(row => row.category === category && row.id === current);
      const entry = component?.calculations?.find(row => (category === "gear" ? row.slotIndex : row.rowIndex) === index);
      return `<details class="season-slot" data-role="season-slot-${category}-${index}"><summary>${slotIcon(current)}<span><small>${label}</small><strong>${current ? escape(name(current)) : "빈 슬롯"}</strong></span></summary>
        ${selectionSearch(id, label)}
        <div class="season-selection-row"><label>${label}<select id="${id}" aria-label="SS14 ${label}">
        <option value=""${!current ? " selected" : ""}>비우기</option>
        ${current && !options.some((row) => row.id === current) ? `<option value="${escape(current)}" selected>${escape(name(current))} · 이전 입력 보존</option>` : ""}
        ${options.map((row) => `<option value="${escape(row.id)}"${row.id === current ? " selected" : ""}>${escape(row.name)}</option>`).join("")}</select></label>
        <button type="button" data-action="advisor-select-workspace-item" data-category="${category}" data-index="${index}" aria-label="SS14 ${label} 교체 적용">교체 적용</button></div>
        ${entry && category === "skills" ? `<label>${escape(name(current))} · 칸 ${index + 1} 레벨<input type="number" min="1" max="100" step="1" data-season-edit="skill-level" data-row="${index}" value="${escape(formValues[`skill-level:${index}`] ?? entry.level)}" /></label>` : ""}
        ${entry && category === "gear" ? `${rollControls(component, entry, formValues)}${entry.reasons.length ? `<p>${entry.reasons.map(escape).join(" · ")}</p>` : ""}` : ""}
      </details>`;
    }).join("")}</fieldset>`).join("")}
    ${supportControls(document, formValues)}</details>`;
}

function configurationControls(document, currentBuild, transfer) {
  const changes = compareSeasonConfigurations(document.sourceBuild, document.targetBuild);
  return `<details data-role="season-configuration-transfer"${transfer ? " open" : ""}><summary>기존 편집기의 전체 구성 이전</summary>
    <p>히어로·보조·재능·신격·정령·전투 조건은 기존 편집기에서 구성한 뒤 여기서 선택해 반영하세요. 이전 시즌 입력의 복사이며 SS14 수치 검증을 뜻하지 않습니다. 선택하지 않은 구성과 최초 원본은 유지됩니다.</p>
    <p>현재 편집 빌드: ${escape(currentBuild?.name ?? "없음")}</p>
    <fieldset><legend>다시 이전할 구성</legend>${SEASON_CONFIGURATION_GROUPS.map((group) => `<label><input type="checkbox" data-season-transfer-group="${group.id}"${transfer?.groups.includes(group.id) ? " checked" : ""} />${escape(group.label)} <small>${changes.find((row) => row.id === group.id).changed ? "최초 원본과 다름" : "최초 원본 보존"}</small></label>`).join("")}</fieldset>
    <button type="button" data-action="advisor-review-configuration"${!currentBuild ? " disabled" : ""}>선택 구성 이전 검토</button>
    <button type="button" data-action="advisor-review-all-configurations"${!currentBuild ? " disabled" : ""}>모든 구성 이전 검토</button>
    ${transfer ? `<section role="status" tabindex="-1" data-role="season-configuration-preview"><h6>${escape(transfer.sourceName)}에서 가져올 구성</h6><ul>${transfer.changes.map((row) => `<li>${escape(row.label)}: ${row.changed ? "현재 SS14 입력 교체" : "구성 동일"}</li>`).join("")}</ul>
      <p>스킬·장비를 선택하면 해당 범위의 SS14 편집값이 교체됩니다. 연결되지 않은 수치는 추정하지 않습니다. 적용 후 별도로 저장해야 합니다.</p>
      ${transfer.resetInputs?.length ? `<p>교체·초기화되어 다시 확인할 SS14 입력: ${transfer.resetInputs.map((r) => escape(r.label)).join(" · ")}. 현재 조건이 새 구성에도 맞는지 다시 입력하세요.</p>` : "<p>기존 SS14 추가 확인 입력을 유지합니다.</p>"}
      <button type="button" data-action="advisor-apply-configuration">검토한 구성 적용</button><button type="button" data-action="advisor-cancel-configuration">이전 검토 취소</button></section>` : ""}
  </details>`;
}

function heroSelectionControls(document, report, formValues) {
  const selected = document.targetBuild.ss14Inputs.heroSelection;
  const options = seasonTheaOptions();
  return `<details data-role="season-hero-selection"><summary>SS14 히어로·특성 선택</summary>
    <details><summary>티아1 빌드 새로 만들기</summary><button type="button" data-action="advisor-create-thea-workspace">티아1·얼음 송곳 SS14 사본 만들기</button>
    <p>장비·재능·석판을 이어받고 히어로 추억·특성·발동 조건은 새로 선택합니다.</p></details>
    ${selected?.heroId === THEA_SS14_ID ? `<p>신들의 위대한 지혜 · 티아1</p>${[1, 45, 60, 75].map(level => `<div class="season-selection-row"><label>${level}레벨 특성<select id="season-hero-choice-${level}" aria-label="SS14 ${level}레벨 특성">
      <option value="">미정</option>${canMarkTraitMemoryEmpty(document.targetBuild, level) ? `<option value="${EMPTY_TRAIT_MEMORY}"${selected.choices[level] === EMPTY_TRAIT_MEMORY ? " selected" : ""}>추억 미장착</option>` : ""}${options.filter(o => o.level === level).map(o => `<option value="${escape(o.key)}"${selected.choices[level] === o.key ? " selected" : ""}>${escape(o.name)}</option>`).join("")}</select></label>
      <button type="button" data-action="advisor-select-hero-choice" data-level="${level}" aria-label="SS14 ${level}레벨 특성 적용">특성 적용</button></div>`).join("")}` : ""}
    ${componentControls(report, formValues)}${memoryControls(report, formValues)}</details>`;
}

function supportControls(document, formValues) {
  const build = normalizeBuild(document.targetBuild);
  const options = seasonSupportOptions();
  return `<details data-role="season-support-editor"><summary>SS14 보조 구성·레벨</summary><p>현재 열린 보조 칸에만 연결할 수 있습니다. 칸 개수는 기존 스킬 편집기에서 변경한 뒤 구성 이전으로 반영하세요. 확인된 20레벨 원문과 호환 조건으로 계산하며 그 밖의 레벨·효과는 미지원입니다.</p>
    ${[...build.skills.active, ...build.skills.passive].map((slot, row) => !slot.skillId ? "" : `<fieldset><legend>${escape(name(slot.skillId))} · 스킬 칸 ${row + 1}</legend>
      ${Array.from({ length: 5 }, (_, column) => {
        const current = slot.supports?.[column];
        if (column >= slot.unlockedSupportCount && !current) return "";
        const label = `스킬 칸 ${row + 1} 보조 ${column + 1}`;
        return `${selectionSearch(`season-support-${row}-${column}`, label)}<div class="season-selection-row"><label>${label}<select id="season-support-${row}-${column}" aria-label="SS14 ${label}"><option value="">비우기</option>
          ${current && !options.some((option) => option.id === current.supportId) ? `<option value="${escape(current.supportId)}" selected>이전 보조 보존 · SS14 원문 미확보</option>` : ""}
          ${options.map((option) => `<option value="${escape(option.id)}"${current?.supportId === option.id ? " selected" : ""}>${escape(option.name)}</option>`).join("")}</select></label>
          <button type="button" data-action="advisor-select-workspace-support" data-row="${row}" data-support="${column}" aria-label="SS14 ${label} 적용">보조 적용</button></div>
          ${current && options.some((option) => option.id === current.supportId) && column < slot.unlockedSupportCount ? `<label>${label} 레벨<input type="number" min="1" max="100" step="1" data-season-edit="support-level" data-row="${row}" data-support="${column}" value="${escape(formValues[`support-level:${row}:${column}`] ?? current.level)}" /></label>` : ""}`;
      }).join("")}</fieldset>`).join("")}</details>`;
}

function rollControls(row, entry, formValues) {
  const ko = koreanRecord(row.id);
  const en = SS14_GEAR_EN.records[row.id];
  const koreanEffects = ko && en?.sourceRecordKey === ko.sourceRecordKey ? parseTlidbGearTooltip({ id: row.id,
    tlidbText: { ko: { ...ko, sourcePageVersion: "SS14", sourceFieldStatus: { detail: "exact" },
      sourceSeasonEvidence: en.sourceSeasonEvidence } } }, { locale: "ko", season: "SS14" }).effects : [];
  const seen = new Set();
  return (entry.controls ?? []).filter((control) => {
    const key = control.key.startsWith("log:") ? control.key : JSON.stringify([control.sourceText, control.min, control.max]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map((control, index) => {
    const matching = koreanEffects.filter((effect) => effect.stat === control.stat
      && effect.roll?.min === control.min && effect.roll?.max === control.max);
    const label = control.label ?? (matching.length === 1 && !/\p{Script=Han}/u.test(matching[0].sourceText)
      ? matching[0].sourceText : `옵션 ${index + 1} · 한국어 원문 미제공`);
    return `<div class="native-roll-option"><label>${escape(label)}<input type="number" step="any" min="${control.min}" max="${control.max}"
      aria-label="장비 칸 ${entry.slotIndex + 1} ${escape(label)}" data-season-edit="gear-roll" data-slot="${entry.slotIndex}"
      data-roll="${escape(control.key)}" value="${escape(formValues[`gear-roll:${entry.slotIndex}:${control.key}`] ?? control.value)}" /><small>SS14 선택 범위 ${number(control.min)}~${number(control.max)}</small></label>
      <details class="native-option-source" data-role="roll-source-${entry.slotIndex}-${index}"><summary>옵션 출처</summary><p>${escape(SEASON_GEAR_SLOT_LABELS[entry.slotIndex])} · ${escape(name(row.id))}</p><p>선택 범위: TLIDB SS14 · 현재 값: ${control.key.startsWith("log:") ? "가져온 수치 또는 직접 입력" : "직접 입력"}</p>${sourceLink(ko ?? en)}</details></div>`;
  }).join("");
}

function componentControls(report, formValues) {
  const rows = report.componentProjection.rows.filter((row) => row.control);
  return rows.length ? `<fieldset><legend>SS14 히어로 특성 단계</legend><p>새 단계는 자동 추정하지 않습니다. 원문에 있는 최종 적용 단계를 선택한 뒤 다시 계산하세요.</p>${rows.map((row, index) => {
    const control = row.control; const value = formValues[`hero-tier:${control.choiceId}`] ?? control.tier;
    return `<label>${escape(control.name)} · 특성 ${index + 1}<select data-season-edit="hero-tier" data-choice="${escape(control.choiceId)}" aria-label="SS14 특성 ${index + 1} 단계">
      <option value=""${value === "" ? " selected" : ""}>단계 선택 필요</option>${Array.from({ length: control.maxTier }, (_, i) => i + 1).map((tier) => `<option value="${tier}"${Number(value) === tier ? " selected" : ""}>${tier}단계</option>`).join("")}</select></label>`;
  }).join("")}</fieldset>` : "";
}

function memoryControls(report, formValues) {
  const rows = report.componentProjection.rows.filter((r) => r.memoryControl);
  const ranges = report.componentProjection.rows.filter((r) => r.memoryRollControls?.length);
  return rows.length || ranges.length ? `<fieldset><legend>SS14 추억 수치 확인</legend><p id="season-memory-scope">강화 단계의 자동 환산은 미검증입니다. 현재 게임 카드에서 확인한 기본 옵션을 선택하세요. 목록에 없으면 미확인으로 남기세요. 고정·랜덤 일반 옵션은 동일 ID의 SS14 표를 사용하며 부활 배율은 지원하지 않습니다. 범위 옵션은 현재 값을 직접 입력해야 하며 SS13 저장 수치를 자동 대입하지 않습니다.</p>${rows.map((r) => {
    const c = r.memoryControl; const value = formValues[`memory-base:${c.key}`] ?? c.value;
    return `<label>${escape(r.name)}<select data-season-edit="memory-base" data-key="${escape(c.key)}" aria-label="SS14 추억 ${Number(c.key) + 1} 기본 수치" aria-describedby="season-memory-scope"><option value=""${value === "" ? " selected" : ""}>수치 확인 필요</option>${c.options.map((o) => `<option value="${o.value}"${Number(value) === o.value ? " selected" : ""}>${escape(o.label)}</option>`).join("")}</select></label>`;
  }).join("")}${ranges.map((r, optionIndex) => `<p>${escape(r.name)} · ${escape(r.detail)} ${sourceLink(r.receipt)}</p>${r.memoryRollControls.map((c, index) => {
    const value = formValues[`memory-roll:${c.key}`] ?? c.value;
    const label = `SS14 추억 ${c.index + 1} ${c.kind === "fixed" ? "고정" : "랜덤"} 옵션 ${optionIndex + 1} 수치 ${index + 1}`;
    return `<label>${label} (${c.min}~${c.max})<input type="number" min="${c.min}" max="${c.max}" step="any" data-season-edit="memory-roll" data-key="${escape(c.key)}" aria-label="${label}" aria-describedby="season-memory-scope" value="${escape(value)}" /></label>`;
  }).join("")}`).join("")}</fieldset>` : "";
}

function componentResults(report) {
  const projection = report.componentProjection;
  return `<section data-role="season-component-calculation"><h5>히어로·재능·신격·정령 계산 내역</h5><p>${escape(projection.limitation)}</p>
    <p>선택 효과 묶음 ${projection.counts.selected}개 · 모든 문장 해석 ${projection.counts.mapped}개 · 해석한 수치 효과 ${projection.counts.effects}개</p>
    ${Object.entries(SEASON_COMPONENT_LABELS).filter(([group]) => projection.rows.some(row => row.group === group)).map(([group, label]) => `<details><summary>${label} · ${projection.rows.filter((row) => row.group === group).length}개</summary>
      ${projection.rows.filter((row) => row.group === group).map((row) => `<article><h6>${escape(row.name)}${row.selectionCount > 1 ? ` · ${row.selectionCount}포인트` : ""}</h6>
        <p>${row.status === "mapped" ? "선택 원문 수치 해석됨" : "일부 또는 전체 효과 미지원"} · 수치 효과 ${row.effects.length}개</p>
        <p>${escape(row.detail).replaceAll("\n", "<br/>")}</p>
        ${row.effects.length ? `<p>선택 포인트 반영 수치: ${row.effects.map((effect) => `${number(effect.value)}${effect.unit === "percent" ? "%" : ""}`).join(" · ")}</p>` : ""}
        ${row.minionEffects?.length ? `<p>이 모듈 소환체 전용 보정: ${row.minionEffects.map(e => `${number(e.value)}${e.unit === "percent" ? "%" : ""}`).join(" · ")} · 플레이어 수치와 분리, 소환체 DPS 미지원</p>` : ""}
        ${row.charging ? `<p>재료 충전 기여: 발동당 ${number(row.charging.perProc)} × 관측 초당 ${number(row.charging.rate)}회 = 초당 ${number(row.charging.perSecond)} · 효과 배율 미적용, 자동 유지율 아님</p>` : ""}
    ${row.placementPreview ? `<p>배치 확인 가정: 3×3 범위 ${row.placementPreview.coordinates.length}칸 · 영향을 받는 선택 하위 재능 ${row.placementPreview.affected.length}개 · 합계 ${row.placementPreview.affected.reduce((n, a) => n + a.points, 0)}포인트. 프리즘 칸의 원래 효과는 제외합니다. 재능 좌표는 기존 편집기 기준이며 SS14 자동 검증이 아닙니다. ${sourceLink(row.placementPreview.areaReceipt)}</p>` : ""}
        ${row.blockers.length ? `<p>${[...new Set(row.blockers.map((entry) => entry.reason))].map(escape).join(" · ")}</p>` : ""}
        ${row.inactive.length ? `<p>입력 조건 미충족으로 제외한 효과 ${row.inactive.length}개</p>` : ""}
        ${sourceLink(row.receipt)}</article>`).join("") || "<p>계산에 연결된 선택 항목이 없습니다. 원본 구성과 아래 미지원 내역을 확인하세요.</p>"}</details>`).join("")}</section>`;
}

function destinyControls(report, formValues) {
  const rows = report.componentProjection.rows.filter((r) => r.destinyRollControls?.length);
  if (!rows.length) return "";
  return `<fieldset><legend>SS14 운명 수치 확인</legend><p id="season-destiny-scope">기본 링과 미정 숙명 추가 슬롯에 장착한 운명의 수치를 입력하세요.</p>${rows.map((r, index) =>
    `<p>${escape(r.name)} · ${escape(r.detail)} ${sourceLink(r.receipt)}</p>${r.destinyRollControls.map((c, n) => {
      const label = `SS14 정령 ${c.index + 1} 운명 ${index + 1} 수치 ${n + 1}`;
      return `<label>${label} (${c.min}~${c.max})<input type="number" min="${c.min}" max="${c.max}" step="any" data-season-edit="destiny-roll" data-key="${escape(c.key)}" aria-label="${label}" aria-describedby="season-destiny-scope" value="${escape(formValues[`destiny-roll:${c.key}`] ?? c.value)}" /></label>`;
    }).join("")}`).join("")}</fieldset>`;
}

function extensionControls(report, formValues) {
  const controls = report.componentProjection.rows.flatMap((r) => r.extensionControls ?? [])
    .filter((c, i, all) => all.findIndex((x) => x.key === c.key) === i);
  if (!controls.length) return "";
  return `<fieldset><legend>영약·모듈·제작 조건</legend><p id="season-extension-scope">효과 배율 1은 기본 효과입니다. 현재 상태를 선택하세요. 자동 은총 계산의 영약 사용 간격·지속 시간은 아래 전투 시간표에서 입력합니다.</p>${controls.map((c) => {
    const value = formValues[`extension-input:${c.key}`] ?? c.value;
    const label = `SS14 ${c.label}`;
    return c.kind === "boolean" ? `<label>${escape(c.label)}<select data-season-edit="extension-input" data-key="${c.key}" aria-label="${escape(label)}" aria-describedby="season-extension-scope">${[["", "확인 필요"], [0, "아니요"], [1, "예"]].map(([v, t]) => `<option value="${v}"${String(value) === String(v) ? " selected" : ""}>${t}</option>`).join("")}</select></label>`
      : `<label>${escape(c.label)} (${c.min}~${c.max})<input type="number" min="${c.min}" max="${c.max}" step="any" data-season-edit="extension-input" data-key="${c.key}" aria-label="${escape(label)}" aria-describedby="season-extension-scope" value="${escape(value)}" /></label>`;
  }).join("")}</fieldset>`;
}

function characterControls(document, report, formValues) {
  const allConditions = report.componentProjection.rows.flatMap((row) => row.conditionControls.map((c) => ({ ...c, name: row.name, detail: row.detail })));
  const conditions = allConditions.filter(c => !c.automatic).filter((c, i, list) => list.findIndex((other) => other.conditionGroup === c.conditionGroup) === i)
    .filter((c) => !report.blessings.enabled || blessingConditionValue(c, { Focus: 0, Agility: 0, Tenacity: 0 }) === undefined);
  return `<fieldset><legend>SS14 자원·방어 기본 입력</legend><p>선택 장비·재능 등의 효과를 더하기 전 힘·민첩·지혜를 입력하세요. 게임 기본값으로 자동 추정하지 않습니다. 기존 SS13 전투 조건은 보존하되 이 입력과 섞지 않습니다.</p>
    ${Object.entries(SEASON_CHARACTER_INPUTS).map(([key, field]) => `<label>${field.label}<input type="number" min="${field.min}" max="${field.max}" step="${key === "enemyLevel" ? 1 : "any"}" data-season-edit="character-input" data-key="${key}" aria-label="SS14 ${field.label}" value="${escape(formValues[`character-input:${key}`] ?? document.targetBuild.ss14Inputs.character?.[key] ?? "")}" /></label>`).join("")}</fieldset>
    ${conditions.length ? `<fieldset><legend>SS14 선택 효과의 조건 확인</legend><p>아래 원문의 조건이 현재 상황에서 충족되는지 직접 선택하세요. 미입력은 미지원이며 자동 발동·유지 시간·전체 전투 평균을 가정하지 않습니다. 같은 상태의 입력은 함께 반영됩니다.</p><p id="season-stack-scope">아래 축복 조건만 입력하면 선택 옵션의 기여만 계산합니다. 축복 자체의 기본 효과까지 연결하려면 별도의 축복 현재 중첩 입력 3종을 확인하세요. 몰락은 해당 원문의 0~60 범위입니다. 낮은 HP 여부는 자동 추정하지 않습니다.</p>${conditions.map((c, index) => {
      const value = formValues[`component-condition:${c.key}`] ?? c.value;
      const description=c.label?`<details><summary>${escape(c.name)} 원문</summary><p>${escape(c.detail)}</p></details>`:`<p>${escape(c.name)} · ${escape(c.detail)}</p>`;
      if (c.kind === "count") return `${description}<label>${escape(c.label??`조건 ${index + 1} 중첩 수`)} (0~${c.max})<input type="number" min="0" max="${c.max}" step="1" data-season-edit="component-condition" data-key="${escape(c.key)}" aria-label="SS14 조건 ${index + 1} 중첩 수" aria-describedby="season-stack-scope" value="${escape(value)}" /></label>`;
      return `${description}<label>${escape(c.label??`조건 ${index + 1}`)}<select data-season-edit="component-condition" data-key="${escape(c.key)}" aria-label="SS14 조건 ${index + 1} 충족 여부">${[["", "확인 필요"], [0, "미충족"], [1, "충족"]].map(([n, text]) => `<option value="${n}"${String(value) === String(n) ? " selected" : ""}>${text}</option>`).join("")}</select></label>`;
    }).join("")}</fieldset>` : ""}`;
}

function blessingControls(document, report, formValues) {
  if (document.targetBuild.ss14Inputs.theaCycle?.mode === "automatic") return "<p>축복 중첩은 자동 은총 주기에서 계산합니다. 현재 상태 직접 설정으로 전환하면 저장된 수동 중첩을 다시 편집할 수 있습니다.</p>";
  return `<fieldset><legend>SS14 축복 현재 중첩 입력</legend><p id="season-blessing-help">게임에서 확인한 현재 중첩 3종을 모두 입력하면 기본 효과와 선택 옵션의 축복 조건이 함께 계산됩니다. 0은 축복 없음, 빈칸은 확인 필요입니다. 기존 SS13 조건에서 자동 추정하지 않습니다.</p>
    ${SEASON_BLESSINGS.map((key) => `<label>${escape(blessingLabel(key))} (최대 ${report.blessings.caps[key]})<input type="number" min="0" max="${report.blessings.caps[key]}" step="1" data-season-edit="blessing-input" data-key="${key}" aria-label="SS14 ${escape(blessingLabel(key))} 현재 중첩" aria-describedby="season-blessing-help" value="${escape(formValues[`blessing-input:${key}`] ?? document.targetBuild.ss14Inputs.blessings?.[key] ?? "")}" /></label>`).join("")}</fieldset>
    <section aria-label="SS14 축복 기본 효과"><h5>SS14 축복 기본 효과</h5><p>${escape(report.blessings.limitation)}</p>
      <p>${report.blessings.enabled ? report.blessings.supported ? "현재 중첩을 계산·비교에 반영했습니다." : "중첩 또는 원문 확인 필요 · 결합 대미지 계산 중단" : "기본 효과 미연결 · 현재 중첩 3종을 입력하세요."}</p>
      <table><caption>축복 기본 효과 기여</caption><thead><tr><th scope="col">대미지 추가 배율</th><th scope="col">공격·시전 속도 증가 (%)</th><th scope="col">받는 대미지 배율</th></tr></thead><tbody><tr><td>${number(report.blessings.damageMultiplier)}</td><td>${number(report.blessings.speedIncrease)}</td><td>${number(report.blessings.damageTakenMultiplier)}</td></tr></tbody></table>
      <ul>${report.blessings.blockers.map((s) => `<li>${escape(s)}</li>`).join("")}</ul>
      <details><summary>축복 효과 원문과 근거</summary><ul>${report.blessings.rows.map((r) => `<li>${escape(r.detail)} · ${sourceLink(r.source)}</li>`).join("")}</ul></details></section>`;
}

function characterResults(report) {
  const character = report.character; const allocation = report.componentProjection.allocation;
  const labels = { strength: "힘", dexterity: "민첩", intelligence: "지혜", life: "최대 HP", mana: "최대 MP", shield: "최대 보호막",
    armor: "아머", evasion: "회피", armorReduction: "물리 아머 감면율 (%)", nonPhysicalArmorReduction: "비물리 아머 감면율 (%)", evadeChance: "공격 명중 회피 확률 (%)",
    spellEvadeChance: "주술 명중 회피 확률 (%)", attackBlockChance: "공격 막기 확률 (%)", spellBlockChance: "주술 막기 확률 (%)",
    blockRatio: "적용 막기 비율 (%)", damageTakenMultiplier: "확인된 받는 대미지 추가 배율",
    lifeRegenerationGranted: "선택 옵션의 HP 자연 회복 기여 (초당)", manaRegenerationGranted: "선택 옵션의 MP 자연 회복 기여 (초당)",
    manaRegeneration: "기본 회복 포함 MP 자연 회복 (초당)", shieldRechargePerSecond: "보호막 충전 속도 (초당)", shieldRechargeDelay: "보호막 충전 대기 (초)",
    shieldBypassPercent: "보호막을 통과하는 대미지 (%)", minionTransferPercent: "소환체에 이전하는 대미지 (%)", blurAvoidancePercent: "방황의 대미지 면역 확률 (%)",
    elementalAilmentAvoidancePercent: "원소 이상 회피 확률 (%)", injuryBufferPercent: "대미지 완충 (%)", elementalDamageTakenMultiplier: "받는 원소 대미지 배율",
    cooldownRecoveryBonus: "쿨타임 회복 속도 보너스 (%)", frostbiteMaximumBonus: "최대 빙결 수치 보너스" };
  return `<section aria-label="SS14 자원·방어 계산"><h5>SS14 자원·방어 계산</h5><p>${escape(character.limitation)}</p>
    <table><caption>확인된 효과만 반영한 자원·방어 참고값</caption><thead><tr><th scope="col">항목</th><th scope="col">계산값</th></tr></thead><tbody>${Object.entries(labels).map(([key, label]) => `<tr><th scope="row">${label}</th><td>${number(character.values[key])}</td></tr>`).join("")}</tbody></table>
    <p>${escape(character.survival.limitation)}</p>
    <table><caption>저항과 원문 상한 충돌</caption><thead><tr><th scope="col">항목</th><th scope="col">상한 적용 전 (%)</th><th scope="col">적용 저항 (%)</th><th scope="col">캐릭터 도움말 해석 (%)</th><th scope="col">저항 도움말 해석 (%)</th></tr></thead><tbody>${Object.entries({ fire: "화염", cold: "냉기", lightning: "번개", erosion: "부식" }).map(([key, name]) => `<tr><th scope="row">${name} 저항</th><td>${number(character.resistances[key].raw)}</td><td>${number(character.resistances[key].effective)}</td>${character.resistances[key].scenarios.map((v) => `<td>${number(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <details data-role="season-rule-scenarios"><summary>충돌하는 공식의 결과 비교</summary><p>아래 해석 중 하나를 현행 공식으로 확정하지 않습니다. 같은 값이 나와도 전체 빌드 지원을 뜻하지 않습니다.</p><p>아머의 두 식은 적 레벨 90 이상에서 분모가 같아집니다. 이는 수학적 일치이며, 더 낮은 레벨에서 어느 설명을 적용할지와 저항·막기 원문 충돌은 아직 미검증입니다.</p>
      <table><caption>원문별 방어·회복 참고값</caption><thead><tr><th scope="col">항목</th><th scope="col">출처·해석</th><th scope="col">값</th></tr></thead><tbody>${[["물리 아머 감면율 (%)", character.armorScenarios], ["막기 비율 (%)", character.survival.blockScenarios], ["MP 자연 회복 (초당)", character.survival.manaScenarios]].flatMap(([label, rows]) => rows.map((r) => `<tr><th scope="row">${label}</th><td>${escape(r.label)}</td><td>${number(r.value)}</td></tr>`)).join("")}</tbody></table></details>
    <ul>${character.blockers.map((reason) => `<li>${escape(reason)}</li>`).join("")}</ul><p>미해석 선택 묶음 ${character.omittedEffectCount}개 · 조건별 근거와 제외 사유는 구성 내역에서 확인하세요.</p>
    <details><summary>기본 공식 원문</summary><ul>${character.receipts.map((r) => `<li>${escape(({ Character_Build: "캐릭터 도움말", Armor: "아머 도움말", Resistance: "저항 도움말", Strength: "힘 도움말", Dexterity: "민첩 도움말", Intelligence: "지혜 도움말", Block: "막기 도움말" })[r.slug] ?? "계산 도움말")} · ${sourceLink(r)}</li>`).join("")}</ul></details></section>
    <section aria-label="SS14 배치 검증"><h5>SS14 배치 검증</h5><p>${escape(allocation.limitation)}</p><ul>${allocation.checks.map((r) => `<li>${escape(r.label)}: ${r.status === "passed" ? "확인 범위 통과" : "배치 오류"}</li>`).join("")}${allocation.issues.map((r) => `<li>${escape(r.reason)}</li>`).join("")}</ul></section>`;
}

function offenseControls(document, report, formValues) {
  const supported = report.coupledSkills.rows.filter((r) => getSeasonSelectionRecord("skills", r.id));
  const weapon = seasonWeaponProfile(document.targetBuild);
  return `<fieldset><legend>스킬 기본 크리티컬</legend><p id="season-critical-input-help">공격 스킬은 선택 무기의 수치를 자동 반영합니다. 주술은 해당 스킬의 보정 전 기본 수치를 사용합니다. 수동 입력은 확률(%)이나 최종 수치가 아닙니다.</p>
    ${supported.map((r) => weapon.enabled && getSeasonSelectionRecord('skills', r.id)?.tags?.includes('Attack')
      ? `<p>${escape(name(r.id))} · 칸 ${r.rowIndex + 1} · 무기에서 자동 반영: <output data-role="weapon-critical">${weapon.supported ? number(weapon.values.baseCriticalRating) : '미확인'}</output></p>`
      : `<label>${escape(name(r.id))} · 칸 ${r.rowIndex + 1}<input type="number" min="0" max="100000" step="any" data-season-edit="offense-input" data-key="${r.rowIndex}"
      aria-label="SS14 스킬 칸 ${r.rowIndex + 1} 기본 크리티컬 수치" aria-describedby="season-critical-input-help" value="${escape(formValues[`offense-input:${r.rowIndex}`] ?? document.targetBuild.ss14Inputs.offense?.[r.rowIndex]?.baseCriticalRating ?? "")}" /></label>
      ${gameCriticalControl(document, r)}`).join("") || "<p>현재 원문이 연결된 선택 스킬 없음</p>"}
    ${supported.length < report.coupledSkills.rows.length ? "<p>현재 원문이 연결되지 않은 스킬의 크리티컬 계산은 미지원입니다. 다른 확인 입력은 저장할 수 있습니다.</p>" : ""}</fieldset>`;
}

export function weaponSummary(build, slotIndex = 0) {
  const weapon = seasonWeaponProfile(build, slotIndex);
  if (!weapon.enabled || !findItemById(weapon.itemId)?.tags?.includes('mainHand')) return '';
  const v = weapon.values, value = n => Number.isFinite(n) ? number(n) : '미확인';
  return `<section class="season-weapon-summary" aria-label="무기 자동 수치"><h5>무기 수치 · 자동 반영</h5>
    <p>${Object.entries({physical:'물리',fire:'화염',cold:'냉기',lightning:'번개',erosion:'부식'}).filter(([type]) => type === 'physical' || v[`weapon${type}Max`] > 0)
      .map(([type,label]) => `${label} 대미지 <strong>${value(v[`weapon${type}Min`])}–${value(v[`weapon${type}Max`])}</strong>`).join(' · ')} · 초당 공격 <strong>${value(v.weaponSpeed)}</strong> · 크리티컬 <strong>${value(v.baseCriticalRating)}</strong></p>
    <small>선택한 무기 자체 옵션까지 반영한 값입니다. 공격 스킬에 적용하며 주술 기본 수치는 유지합니다.</small>
    ${weapon.blockers.map(reason => `<p>${escape(reason)}</p>`).join('')}
    <details><summary>SS14 수치 출처</summary>${weapon.receipts.map(sourceLink).join(' · ')}</details></section>`;
}

function gameCriticalControl(document, row) {
  const data = seasonGameCritical(getSeasonSelectionRecord("skills", row.id));
  if (!data) return "";
  const binding = document.targetBuild.ss14Inputs.offense?.[row.rowIndex];
  const applied = binding?.gameDataReceipt && validGameCriticalBinding(binding);
  return `<div><button type="button" data-action="advisor-apply-game-critical" data-row="${row.rowIndex}">${escape(name(row.id))} 게임 기본값 ${data.baseCriticalRating} 적용</button>
    <p>${applied ? "설치 게임 근거로 적용됨" : "설치 게임에서 확인한 기본 크리티컬 수치"}: ${data.baseCriticalRating} · SS14 · 패치 ${data.patchVersion}.</p>
    <details><summary>설치 게임 수치 근거</summary><p>스킬 기본값만 적용합니다. 캐릭터 힘·민첩·지혜와 특성 단계·전투 조건은 별도 확인이 필요합니다.</p>
      <p>REA 정적 확인 · 아이템 ${data.itemBaseId} · 스킬 ${data.skillStoneId} · ${escape(data.table)}</p>
      <p>파일 SHA-256: ${data.tableSha256}</p><p>보존 근거: ${data.receiptSha256}</p></details></div>`;
}

function offenseResults(report) {
  const labels = { strength: "힘", dexterity: "민첩", intelligence: "지혜" };
  return `<section aria-label="SS14 속성·크리티컬 결합 계산"><h5>SS14 속성·크리티컬 결합 계산</h5><p>${escape(report.offense.limitation)}</p>
    ${report.offense.rows.map((r) => `<article><h6>${escape(name(r.id))} · 스킬 칸 ${r.rowIndex + 1}</h6><p>카드 주 속성: ${r.mainStats.map((k) => labels[k]).join(" · ") || "미확인"}</p>
      <table><caption>직접 명중의 속성·크리티컬 참고값</caption><thead><tr><th scope="col">항목</th><th scope="col">계산값</th></tr></thead><tbody>
        ${Object.entries({ attributeMultiplier: "주 속성 합산 배율", attributedDps: "주 속성 반영 DPS (크리티컬 제외)", criticalRating: "확인된 보정 포함 크리티컬 수치",
          criticalDamage: "크리티컬 대미지 (%)", criticalChance: "행운 적용 전 크리티컬 확률 (%)", effectiveCriticalChance: "행운·불운 적용 크리티컬 확률 (%)",
          doubleDamageChance: "확인된 더블 대미지 확률 (%)", quadrupleDamageChance: "쿼드러플 전환 확률 (%)", doubleDamageMultiplier: "더블 대미지 기대 배율 (쿼드러플 전환 포함)", expectedDps: "속성·크리티컬·더블·쿼드러플 대미지 기대 DPS" })
          .map(([key, label]) => `<tr><th scope="row">${label}</th><td>${number(r.values[key])}</td></tr>`).join("")}</tbody></table>
      <p>${escape(r.assumption)}</p><ul>${r.blockers.map((b) => `<li>${escape(b)}</li>`).join("")}</ul>
      <details><summary>속성·크리티컬 계산 근거</summary>${[...new Map(r.receipts.map((p) => [p.sourceUrl, p])).values()].map(sourceLink).join(" · ")}</details></article>`).join("")}</section>`;
}

function theaControls(document, report, formValues) {
  const build = document.targetBuild;
  if (!isThea(build)) return "";
  const cycle = build.ss14Inputs.theaCycle ?? { mode: "snapshot", seconds: 300, warmup: 0 };
  const mode = formValues["thea-mode:mode"] ?? Number(cycle.mode === "automatic");
  const board = build.talents?.boards?.[3];
  const eventKeys = [...new Set(report.componentProjection.rows.flatMap(r => r.mechanics ?? []).filter(m => m.kind === "thea-event-input").map(m => m.key))];
  for (const key of ["combatMode", ...theaCombatKeys(build, report.componentProjection.rows.flatMap(r => r.mechanics ?? []))]) if (!eventKeys.includes(key)) eventKeys.push(key);
  if (build.ss14Inputs.theaEvents?.hitRate !== undefined && !eventKeys.includes("hitRate")) eventKeys.push("hitRate");
  if (build.ss14Inputs.theaEvents?.projectileRate !== undefined && !eventKeys.includes("projectileRate")) eventKeys.push("projectileRate");
  return `<details data-role="season-thea-controls"><summary>티아1 · 계시 재능과 자동 은총</summary>
    <fieldset><legend>은총 계산 방식</legend><label>계산 방식<select data-season-edit="thea-mode" data-key="mode" aria-label="SS14 은총 계산 방식">
      <option value="0"${Number(mode) === 0 ? " selected" : ""}>현재 상태 직접 설정</option><option value="1"${Number(mode) === 1 ? " selected" : ""}>자동 주기 평균</option></select></label>
      ${[["seconds", "측정 시간", 1], ["warmup", "측정 전 준비 시간", 0]].map(([key, label, min]) => `<label>${label} (초)<input type="number" min="${min}" max="1800" step="any" data-season-edit="thea-cycle-input" data-key="${key}" aria-label="SS14 은총 ${label}" value="${escape(formValues[`thea-cycle-input:${key}`] ?? cycle[key])}" /></label>`).join("")}
      <p>자동 계산은 축복·은총이 없는 전투 시작 상태에서 출발합니다. 준비 시간 이후의 상태별 최종 DPS를 평균내며, 현재 중첩과 은총 적용 여부를 직접 입력할 필요가 없습니다. 측정 시간을 바꾸면 초반 준비 구간의 영향도 달라집니다.</p>
      <p>적 상태·스킬 사용 비율은 전체 DPS 전투 입력에서 선택하세요. 추가 발동은 아래에서 지정한 일정한 간격으로 발생하며, 첫 발동은 한 간격 뒤입니다. 발생하지 않는 행동은 0으로 선택하세요.</p></fieldset>
    ${eventKeys.length ? `<fieldset><legend>추가 축복 획득·소모 조건</legend>${eventKeys.map(key => {
      const field = THEA_EVENT_FIELDS[key]; const v = formValues[`thea-event:${key}`] ?? build.ss14Inputs.theaEvents?.[key] ?? "";
      return `<label>${escape(field.label)}${field.boolean || field.choices ? `<select data-season-edit="thea-event" data-key="${key}" aria-label="SS14 ${escape(field.label)}">${[["", "선택 필요"], ...(field.choices ? field.choices.map(n => [n, String(n)]) : [[0, "아니요"], [1, "예"]])].map(([n, label]) => `<option value="${n}"${String(v) === String(n) ? " selected" : ""}>${label}</option>`).join("")}</select>` : `<input type="number" min="0" max="${field.max}" step="${field.integer ? "1" : "any"}" data-season-edit="thea-event" data-key="${key}" aria-label="SS14 ${escape(field.label)}" value="${escape(v)}" />`}</label>`;
    }).join("")}<p>복합 계산에서는 아래 전투 입력의 스킬별 시전 횟수를 사용합니다. 점화 기본값은 명중 대미지와 별개이며, 추가 점화 증가에는 현재 문서에 이미 연결한 증가를 중복 입력하지 마세요. 스코치 저항 감소는 적용 환경의 20% 또는 30%를 선택합니다. 연속 공격은 공격 스킬에만 적용합니다. 확률은 128회 모의 계산의 추정 평균으로 표시합니다.</p></fieldset>` : ""}
    ${hasRevelation(build) ? `<fieldset><legend>계시의 예언 · 4번째 활성화 보드</legend>
      <label>4번째 보드<select id="season-thea-board" aria-label="SS14 계시의 예언 4번째 보드"><option value="">패널 선택</option>${revelationBoardOptions().map(o => `<option value="${escape(o.slug)}"${board?.treeSlug === o.slug ? " selected" : ""}>${escape(o.name)}</option>`).join("")}</select></label>
      <button type="button" data-action="advisor-select-thea-board">4번째 보드 선택</button>
      <p>다른 패널을 선택하면 이 사본의 4번째 보드 포인트가 초기화됩니다. 아래 설명은 계시로 바뀐 효과이며, 변환 전 재능은 중복 합산하지 않습니다. 해금 포인트가 부족하면 계산을 보류합니다.</p>
      ${board?.treeSlug ? `<details><summary>4번째 보드 재능 포인트 편집</summary>${revelationNodeOptions(build).map(n => {
        const value = formValues[`thea-node:${n.id}`] ?? (n.core ? Number(board.coreTalentIds?.includes(n.id)) : board.nodePoints?.[n.id] ?? 0);
        return `<label>${escape(n.name)}${n.replacement ? " · 계시 변환" : ""} · 해금 ${n.required}점<input type="number" min="0" max="${n.max}" step="1" data-season-edit="thea-node" data-key="${escape(n.id)}" aria-label="SS14 4번째 보드 ${n.sourceId} 포인트" value="${escape(value)}" /></label><p>${escape(n.detail)}</p>`;
      }).join("")}</details>` : ""}</fieldset>` : "<p>60레벨 특성에서 계시의 예언과 단계를 선택하면 4번째 보드 편집이 열립니다.</p>"}
    ${report.theaAverage ? report.theaAverage.supported ? `<p>자동 은총 유지율${report.theaAverage.estimated ? " (128회 추정 평균)" : ""}: ${number(report.theaAverage.uptime)}% · 두 은총 동시 유지율: ${number(report.theaAverage.doubleUptime)}%</p>` : "<p>자동 은총 유지율: 미지원 · 전체 DPS 아래의 입력·효과 확인 항목을 먼저 해결하세요.</p>" : ""}
    </details>`;
}

function dpsControls(document, report, formValues) {
  const build = document.targetBuild;
  const input = document.targetBuild.ss14Inputs.dps;
  const field = (key, definition, value) => {
    const selected = formValues[`dps-input:${key}`] ?? value ?? "";
    const attributes = `data-season-edit="dps-input" data-key="${key}" aria-label="SS14 DPS ${key.startsWith("enemy:") ? "" : `스킬 칸 ${Number(key.split(":")[0]) + 1} `}${escape(definition.label)}"`;
    return `<label>${escape(definition.label)}${definition.choices
      ? `<select ${attributes}><option value="">미정</option>${definition.choices.map(([v, label]) => `<option value="${v}"${selected !== "" && Number(selected) === v ? " selected" : ""}>${escape(label)}</option>`).join("")}</select>`
      : `<input type="number" min="${definition.min}" max="${definition.max}" step="${definition.integer ? 1 : "any"}" ${attributes} value="${escape(selected)}" />`}</label>`;
  };
  return `<details data-role="season-dps-input"><summary>전체 DPS 전투 입력</summary>
    ${logReviewRows(build).length ? `<fieldset><legend>로그에 없는 구성 확인</legend><p>각 메뉴에서 실제 구성으로 편집한 뒤 확인하세요. 비어 있는 구성도 직접 확인해야 합니다. 구성을 바꾸면 다시 확인합니다.</p>${logReviewRows(build).map(r => `<label>${escape(r.label)}<select data-season-edit="log-review" data-key="${r.key}" aria-label="${escape(r.label)} 구성 확인"><option value="0"${!r.confirmed ? " selected" : ""}>확인 필요</option><option value="1"${r.confirmed ? " selected" : ""}>현재 구성 확인</option></select><button type="button" data-action="advisor-open-section" data-section="${r.key}">편집</button></label>`).join("")}</fieldset>` : ""}
    <p>적 한 명을 기준으로 입력하세요. 적 저항은 상한 적용 후, 관통 적용 전의 유효 저항입니다. 쓰이지 않는 대미지 유형의 저항은 비워둘 수 있습니다. 시전 시간 배분 합계는 100% 이하이며, 비어 있는 값을 0으로 계산하지 않습니다.</p>
    <fieldset><legend>대상 방어</legend>${Object.entries(SEASON_DPS_ENEMY_FIELDS).map(([key, def]) => field(`enemy:${key}`, def, input?.enemy?.[key])).join("")}</fieldset>
    ${report.componentProjection.rows.filter(r => r.slateControls?.length).map(r => `<fieldset><legend>${escape(r.name)} · SS14 석판 옵션</legend>
      ${r.slateControls.map(c => `<label>${c.index + 1}번째 옵션<select data-season-edit="slate-affix" data-key="${escape(c.key)}" aria-label="SS14 ${escape(r.name)} 옵션 ${c.index + 1}"><option value="">옵션 선택 필요</option>
        ${seasonSlateOptions(c.type).map(o => `<option value="${escape(o.id)}"${(formValues[`slate-affix:${c.key}`] ?? c.value) === o.id ? " selected" : ""}>${escape(o.name)} · ${escape(o.detail)}</option>`).join("")}</select></label>`).join("")}</fieldset>`).join("")}
    ${report.componentProjection.rows.some(r => r.heroControls?.length) ? `<fieldset><legend>히어로 발동·현재 상태</legend>
      <p>${document.targetBuild.ss14Inputs.heroSelection?.heroId === THEA_SS14_ID
        ? "현재 상태 계산에서는 적용 중인 은총의 소모 중첩을 입력하세요. 자동 주기 평균을 선택하면 은총 상태와 축복 중첩은 시간에 따라 계산됩니다."
        : "0은 미적용, 1은 적용입니다. 발동 횟수는 무료 발동을 포함한 실제 횟수입니다. 창의 오버로드가 충전을 바꾸므로, 사용 중에는 일반 매직 버스트 횟수도 직접 입력합니다."}</p>
      ${[...new Set(report.componentProjection.rows.flatMap(r => r.heroControls ?? []))].map(key => {
        const d = SEASON_HERO_COMBAT_FIELDS[key];
        const value = formValues[`hero-combat:${key}`] ?? document.targetBuild.ss14Inputs.heroCombat?.[key] ?? "";
        const attributes = `data-season-edit="hero-combat" data-key="${key}" aria-label="SS14 ${escape(d.label)}"`;
        const control = d.min === 0 && d.max === 1 && d.integer
          ? `<select ${attributes}><option value=""${value === "" ? " selected" : ""}>미정</option><option value="0"${value !== "" && Number(value) === 0 ? " selected" : ""}>미적용</option><option value="1"${Number(value) === 1 ? " selected" : ""}>적용</option></select>`
          : `<input type="number" ${attributes} min="${d.min}" max="${d.max}" step="${d.integer ? 1 : "any"}" value="${escape(value)}" />`;
        return `<label>${escape(d.label)}${control}</label>`;
      }).join("")}</fieldset>` : ""}
    ${report.coupledSkills.rows.some(r => getSeasonSelectionRecord('skills', r.id)?.tags?.includes('Attack')) ? weaponSummary(build) : ''}
    ${report.coupledSkills.rows.map(r => {
      const entry = report.components.filter(c => c.category === "skills").flatMap(c => c.calculations ?? []).find(c => c.rowIndex === r.rowIndex);
      return `<fieldset><legend>${escape(name(r.id))} · 스킬 칸 ${r.rowIndex + 1}</legend>${Object.entries(SEASON_DPS_SKILL_FIELDS)
        .filter(([key]) => seasonDpsSkillFieldKeys(entry, r.id, build).includes(key))
        .map(([key, def]) => field(`${r.rowIndex}:${key}`, def, input?.skills?.[r.rowIndex]?.[key])).join("")}
        ${entry?.mechanics?.filter(m => m.limitation).map(m => `<p>${escape(m.limitation)}${m.kind === "ice-ring-on-kill" ? " 단일 보스에게 재발동 적중이 없으면 0을 입력하세요." : ""} ${sourceLink(m)}</p>`).join("") ?? ""}</fieldset>`;
    }).join("")}
    <p>적중률과 시전 시간 배분은 자원 소모·이동을 고려한 입력입니다. 복합 계산은 첫 매직 버스트 충전도 포함합니다. ${seasonWeaponProfile(build).enabled ? '무기 수치는 선택한 장비에서 자동 반영합니다.' : '무기 대미지는 무기 자체 수치로 입력하세요.'} 추가 번개는 스킬 계수 적용 전 수치이며 다른 증가 보정은 중복 입력하지 마세요. 점화·마취 입력은 주력 스킬에 적용됩니다.</p>
  </details>`;
}

function dpsResults(report) {
  const r = report.fullDps;
  const blockers = [...new Set(r.blockers)];
  const joint = report.theaAverage?.combat && report.theaAverage.supported ? report.theaAverage : null;
  const repeated = r.rows.filter(row => row.shotgun?.hits > 1);
  return `<section aria-label="SS14 전체 DPS" data-role="season-full-dps" tabindex="-1"><h5>SS14 전체 DPS</h5>
    <p class="season-dps-value"><strong>${r.supported ? number(r.dps) : seasonDpsStatusLabel(report)}</strong></p>
    ${joint?.projectileTie ? `<p data-role="season-projectile-order">같은 시각에 겹친 후속타의 처리 순서는 게임에서 미확인입니다. 먼저 시전한 투사체 우선 ${number(joint.projectileTie.arrivalsFirstDps)} DPS · 새 시전 우선 ${joint.projectileTie.newCastFirstDps === null ? '계산 불가' : number(joint.projectileTie.newCastFirstDps) + ' DPS'}</p>` : ''}
    <p>${r.supported ? report.theaAverage ? report.theaAverage.estimated ? "자동 은총 추정 평균" : "자동 은총 주기 평균" : "입력한 전투 조건 기준" : `입력·효과 ${blockers.length}건 확인 필요`}</p>
    ${blockers.length ? `<details data-role="season-dps-blockers"><summary>계산에 필요한 입력·효과 확인 (${blockers.length})</summary>${seasonCalculationIssues(report).map(group=>`<section data-cause="${group.cause}"><h6>${group.label} (${group.reasons.length})</h6><ul>${group.reasons.map(b=>`<li>${escape(b)}</li>`).join('')}</ul></section>`).join('')}
      <button type="button" data-action="advisor-open-section" data-section="combat">전투 조건 편집</button><button type="button" data-action="advisor-open-section" data-section="hero">히어로 특성 편집</button></details>` : ""}
    <details data-role="season-dps-breakdown"><summary>스킬별 DPS·계산 조건</summary>
    ${report.theaAverage?.supported ? `<p>측정 ${number(report.theaAverage.seconds)}초 · 준비 ${number(report.theaAverage.warmup)}초 · 은총 유지율 ${number(report.theaAverage.uptime)}% · 은총 지속 ${number(report.theaAverage.duration)}초 · 재사용 대기 ${number(report.theaAverage.cooldown)}초</p>` : ""}
    ${report.theaAverage?.supported && report.theaAverage.estimated ? `<p>확률 소모 128회 반복 · 평균 DPS의 표준오차 ${number(report.theaAverage.standardError)}. 같은 입력은 같은 결과를 재현합니다. 실제 전투 오차 범위를 뜻하지 않습니다.</p>` : ""}
    ${report.theaAverage?.supported && report.theaAverage.combat ? `<p>점화 DPS ${number(r.rows.reduce((n, row) => n + row.values.igniteDps, 0))} · 스코치 DPS ${number(r.rows.reduce((n, row) => n + row.values.scorchDps, 0))} (지속 합계에 포함) · 스코치 유지율 ${number(report.theaAverage.scorchUptime)}% · 평균 마취 ${number(report.theaAverage.numbedAverage)}중첩</p>` : ""}
    <p>${escape(r.limitation)}</p>
    ${repeated.map(row => `<p data-role="season-shotgun-result">${escape(name(row.id))} · 같은 적 ${row.shotgun.hits}회 적중 · 첫 적중 이후 감쇠 ${number(row.shotgun.falloff * 100)}% · ${joint ? `첫 적중 후 ${row.shotgun.delaysMs.slice(1).map(number).join(' / ')} ms. 대상 적중률은 선택한 경로 전체에 적용합니다.` : `적중 합산 ×${number(row.shotgun.multiplier)}. ${escape(row.shotgun.limitation)}`}</p>`).join('')}
    ${joint && repeated.length ? `<p>준비 시간 포함 평균 · 전체 적중 ${number(joint.counts.hits)}회 (후속 ${number(joint.counts.followupHits)}회) · 추가 효과로 획득한 축복 ${number(Object.values(joint.extraBlessings.gained).reduce((a,b)=>a+b,0))}중첩 · 소모한 축복 ${number(Object.values(joint.extraBlessings.consumed).reduce((a,b)=>a+b,0))}중첩</p>` : ''}
    <div class="season-dps-table-scroll" tabindex="0" role="region" aria-label="스킬별 DPS 표"><table><caption>스킬별 전투 DPS 내역</caption><thead><tr><th scope="col">스킬</th><th scope="col">일반 시전</th><th scope="col">매직 버스트</th><th scope="col">추가 발동</th><th scope="col">히어로 발동</th><th scope="col">지속</th><th scope="col">소환</th><th scope="col">합계</th></tr></thead>
      <tbody>${r.rows.map(row => `<tr><th scope="row">${escape(name(row.id))} · 칸 ${row.rowIndex + 1}</th>${["manualDps", "spellBurstDps", "repeatDps", "heroDps", "dotDps", "minionDps", "dps"].map(k => `<td>${number(row.values[k] ?? (row.supported && k === "minionDps" ? 0 : null))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    ${r.rows.some(row => row.values.specialDps > 0) ? `<p>오멘 DPS ${number(r.rows.reduce((sum,row) => sum + (row.values.specialDps ?? 0), 0))} (전체 합계 포함)</p>` : ""}
    ${r.rows.filter(row => row.minionUtility?.length || row.utilityMechanics?.length).map(row => `<details><summary>${escape(name(row.id))} · 소환체 효과</summary><ul>${row.minionUtility.map(e => `<li>${escape(({ armor: "아머", evasion: "회피", max_energy_shield: "최대 보호막", elemental_resistance: "원소 저항", elemental_damage_taken: "받는 원소 대미지", elemental_ailment_avoidance: "원소 이상 회피", block_chance: "공격·주술 막기 확률", knockback_chance: "넉백 확률", elemental_ailment_chance: "원소 이상 확률", cooldown_recovery_speed: "쿨타임 회복 속도", injury_buffer: "대미지 완충", deterioration_chance: "악화 확률", physical_as_random_elemental: "물리 대미지의 랜덤 원소 추가", ailment_damage: "상태 이상 대미지", max_frostbite_rating: "최대 빙결 수치 보너스" })[e.stat] ?? e.stat)} ${e.operation === "more" ? "추가 " : ""}${number(e.value)}${e.operation === "add" ? "" : "%"}</li>`).join("")}${(row.utilityMechanics ?? []).map(m => `<li>${m.kind === "module-taunt-on-block" ? "막기 성공 시 적 도발" : "넉백 성공 시 적에게 마비 부여"}</li>`).join("")}</ul></details>`).join("")}
    ${(r.heroMechanics ?? []).filter(m => m.kind === "execute").map(m => `<p>도태: 대상 HP ${number(m.threshold)}% 미만, ${m.radius}m 이내, ${m.delay}초 지연. 지속 DPS에 곱하지 않고 처치 조건으로 구분합니다.</p>`).join("")}
    ${!r.supported ? "<p>스킬 행에 수치가 있어도 빌드 전체의 미해석 효과가 남아 있으면 전체 DPS로 사용할 수 없습니다.</p>" : ""}
    <details><summary>SS14 전투 공식 근거</summary>${r.receipts.map(sourceLink).join(" · ")}</details>
    </details></section>`;
}

function recommendationControls(document, documents, metric, inputStale) {
  const result = metric && !inputStale ? recommendSeasonWorkspaces(document, documents, metric) : null;
  return `<details data-role="season-advisor"${metric ? " open" : ""}><summary>저장된 SS14 후보 비교·추천</summary>
    <p>현재 문서를 기준으로 같은 최초 원본에서 만든 후보를 비교합니다. 수치를 편집·재계산한 뒤 후보 사본을 저장하고 기준 문서를 복원하세요. 다른 전투 조건, 달라진 미해석 효과, 원문이 연결되지 않은 제작 옵션·침식 장비는 추천에서 제외합니다. 제작 옵션 비교는 확인된 수치 기여만의 비교입니다.</p>
    <label>SS14 후보 비교 지표<select id="seasonAdvisorMetric" aria-label="SS14 후보 비교 지표">${Object.entries(SEASON_ADVISOR_METRICS).map(([key, label]) => `<option value="${key}"${(metric || "life") === key ? " selected" : ""}>${label}</option>`).join("")}</select></label>
    <button type="button" data-action="advisor-copy-workspace-candidate"${inputStale ? " disabled" : ""}>현재 SS14 입력을 후보 사본으로 저장</button>
    <button type="button" data-action="advisor-recommend-workspaces"${inputStale ? " disabled" : ""}>저장된 SS14 후보 평가</button>
    ${inputStale ? "<p>입력이 바뀌어 이전 추천을 숨겼습니다. 다시 계산하세요.</p>" : ""}
    ${result ? `<section role="status" tabindex="-1" data-role="season-advisor-result"><h6>확인된 효과 범위의 후보 비교</h6><p>${escape(result.limitation)}</p>
      <p>기준 ${escape(SEASON_ADVISOR_METRICS[result.metric])}: ${number(result.baseValue)} · 비교 ${result.rows.length}개 · 제외 ${result.rows.filter((r) => r.reasons.length).length}개</p>
      ${result.baselineReasons.map((r) => `<p>${escape(r)}</p>`).join("")}
      <table><caption>저장된 SS14 입력 후보별 차이</caption><thead><tr><th scope="col">후보</th><th scope="col">참고값</th><th scope="col">차이</th><th scope="col">판정</th><th scope="col">입력 확인</th></tr></thead><tbody>${result.rows.filter((r) => !r.reasons.length).sort((a, b) => b.value - a.value).map((r) => `<tr><th scope="row">${escape(r.name)}</th><td>${number(r.value)}</td><td>${r.delta > 0 ? "+" : ""}${number(r.delta)}</td><td>${result.best.includes(r.id) ? "이 지표의 확인된 효과 범위 내 1순위" : r.delta > 0 ? "이 지표 증가" : r.delta === 0 ? "이 지표 동일" : "이 지표 감소"}</td><td><button type="button" data-action="advisor-open-workspace" data-copy="${escape(r.id)}">후보 입력 열기</button></td></tr>`).join("")}</tbody></table>
      ${result.rows.some((r) => r.reasons.length) ? `<details><summary>추천에서 제외한 문서 ${result.rows.filter((r) => r.reasons.length).length}개</summary><ul>${result.rows.filter((r) => r.reasons.length).map((r) => `<li>${escape(r.name)}: ${r.reasons.map(escape).join(" · ")}</li>`).join("")}</ul></details>` : ""}
      ${!result.best.length ? "<p>비교 가능한 후보에서 기준보다 증가한 결과가 없습니다.</p>" : ""}
      <p>게임 제작·침식 성공확률과 전체 기대비용은 미지원입니다. 후보 저장은 획득 가능성이나 게임 내 성능 검증을 뜻하지 않습니다.</p></section>` : ""}</details>`;
}

export function renderSeasonWorkspace({ documents = [], document = null, error = "", dirty = false, inputStale = false, formValues = {}, importText = "", currentBuild = null, configurationDraft = null, recommendationMetric = null } = {}) {
  const report = document ? calculateSeasonBuild(document.targetBuild, { sourceBuild: document.sourceBuild }) : null;
  return `<section class="season-workspace" aria-label="SS14 빌드 편집">
    ${error ? `<p role="alert">${escape(error)}</p>` : ""}
    <div class="season-file-actions">
    ${documents.length ? `<details data-role="season-workspace-list"><summary>저장된 빌드 (${documents.length})</summary><ul>${documents.map((row) => `<li>${escape(row.targetBuild.name)}
      <button type="button" data-action="advisor-open-workspace" data-copy="${escape(row.id)}">SS14 편집 열기</button></li>`).join("")}</ul></details>` : ""}
    <details data-role="season-workspace-transfer"><summary>가져오기·내보내기</summary><p>가져온 빌드는 새 사본으로 저장합니다.</p>
      ${document && !dirty && !inputStale ? `<label>저장된 SS14 문서 내보내기<textarea readonly rows="4" aria-label="저장된 SS14 문서 내보내기">${escape(exportSeasonWorkspace(document))}</textarea></label>` : "<p>내보내려면 SS14 문서를 열고 변경을 저장하세요.</p>"}
      <label>SS14 문서 붙여넣기<textarea id="seasonWorkspaceImport" rows="4" maxlength="2000000">${escape(importText)}</textarea></label>
      <button type="button" data-action="advisor-import-workspace">새 SS14 문서로 가져오기</button>
    </details>
    </div>
    ${document ? `<div data-role="season-workspace-editor" tabindex="-1">
      <header class="season-editor-header">
        <label>빌드 이름<input type="text" aria-label="SS14 빌드 이름" data-season-edit="name" maxlength="160" value="${escape(formValues.name ?? document.targetBuild.name)}" /></label>
        <p data-role="season-workspace-status" role="status">${inputStale ? "입력이 바뀌었습니다. 다시 계산해야 합니다." : dirty ? "재계산됨 · 저장하지 않은 변경이 있습니다." : `저장됨 · ${escape(formatAppDateTime(document.updatedAt))}`}</p>
      </header>
        <div class="season-editor-actions" role="group" aria-label="빌드 계산·저장"><button type="button" data-action="advisor-update-workspace">SS14 입력으로 다시 계산</button>
        <button type="button" data-action="advisor-save-workspace">SS14 변경 저장</button>
        <button type="button" data-action="advisor-reset-workspace">저장한 SS14 입력 복원</button></div>
      <div class="season-workspace-grid">
      <aside class="season-results" aria-label="빌드 계산 결과">
        <p data-role="season-result-stale" role="status"${inputStale ? "" : " hidden"}>입력이 변경되었습니다. 다시 계산하면 전체 DPS가 표시됩니다.</p>
        <div data-role="season-workspace-result"${inputStale ? " hidden" : ""}>
        ${dpsResults(report)}
        <details data-role="season-calculation-details"><summary>세부 수치·계산 근거</summary>
        <h5>선택 구성의 확인된 직접 효과 결합</h5>
        ${report.coupledSkills.limitations.map((text) => `<p>${escape(text)}</p>`).join("")}
        <table><caption>SS14 직접 효과만 계산한 부분 결과</caption><thead><tr><th scope="col">선택 스킬</th><th scope="col">스킬 자체 DPS</th><th scope="col">확인된 구성 효과 포함 DPS</th></tr></thead><tbody>
          ${report.coupledSkills.rows.map((row) => `<tr><th scope="row">${escape(name(row.id))} · ${row.level}레벨</th><td>${number(row.values.unmodifiedDps)}</td><td>${number(row.values.dps)}${row.blockers.length ? `<br/><small>${row.blockers.map(escape).join(" · ")}</small>` : ""}</td></tr>`).join("")}</tbody></table>
        <p>전체 빌드 HP·MP·보호막 완전 계산은 미지원입니다.</p>
        ${offenseResults(report)}
        ${report.elixirAverage ? `<section data-role="season-elixir-average"><h5>영약 유지율 부분 계산</h5><p>${escape(report.elixirAverage.limitation)}</p>
          <p>관측 유지율: ${number(report.elixirAverage.uptime)}% · 활성 DPS: ${number(report.elixirAverage.activeDps)} · 비활성 DPS: ${number(report.elixirAverage.inactiveDps)} · 유지율 평균 DPS: ${number(report.elixirAverage.expectedDps)}</p>
          ${report.elixirAverage.blockers.map(s => `<p>${escape(s)}</p>`).join("")}</section>` : ""}
        ${characterResults(report)}
        ${componentResults(report)}
        <details><summary>보존한 전체 구성·남은 계산 연결 ${report.blockers.length}건</summary><ul>${report.blockers.map((row) => `<li>${escape(row.label)}: ${escape(row.reason)}</li>`).join("")}</ul>
          <ul>${report.components.map((row) => `<li>${escape(row.label)} · ${escape(name(row.id))} · ${row.status === "mapped" ? "SS14 카드 연결됨" : "미지원"}
            ${sourceLink(row.sourceReceipt)}
            ${(row.calculations ?? []).map((entry) => sourceLink(entry.receipt)).join(" ")}</li>`).join("")}</ul></details></details>
        </div>
      </aside>
      <section class="season-editor-groups" aria-label="빌드 편집 항목" tabindex="-1">
        <h4>계산 조건</h4>
        <p class="season-selected-skills">${report.coupledSkills.rows.map(row => `${escape(name(row.id))} · ${row.level}레벨`).join(" / ") || "스킬을 선택하세요."}</p>
        ${selectionControls(document, report, formValues)}
        ${heroSelectionControls(document, report, formValues)}
        ${theaControls(document, report, formValues)}
        <details data-role="season-character-editor"><summary>기본 속성·크리티컬</summary>${characterControls(document, report, formValues)}${offenseControls(document, report, formValues)}</details>
        ${dpsControls(document, report, formValues)}
        <details data-role="season-effects-editor"><summary>정령·추가 효과 조건</summary>${destinyControls(report, formValues)}${extensionControls(report, formValues)}${blessingControls(document, report, formValues)}</details>
      </section>
      </div>
      ${recommendationControls(document, documents, recommendationMetric, inputStale)}
      <details data-role="season-workspace-tools"><summary>원본·구성 이전</summary>
        <p>원본: ${escape(document.sourceBuild.name)} · ${escape(document.sourceBuild.patchSnapshot.season)} 보존됨</p>
        ${configurationControls(document, currentBuild, configurationDraft)}
      </details>
    </div>` : ""}
  </section>`;
}
