import { SS14_PREVIEW_SOURCES } from "./data/ss14PreviewSources.generated.js";
import { normalizeUpgradeCost } from "./upgradeCost.js";
import { renderSeasonBuildResearch } from "./seasonBuildView.js";
import { renderUpgradeProbabilityResearch } from "./upgradeProbabilityView.js";
import { normalizeWeightResearch } from "./upgradeProbability.js";
import { formatAppDateTime } from "./dateTimePresentation.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/gu,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const metricLabels = { dps: "초당 대미지", life: "HP", mana: "MP", shield: "보호막" };
const slotLabels = ["메인 무기", "서브 무기", "머리", "흉갑", "목걸이", "장갑", "벨트", "왼쪽 반지", "오른쪽 반지", "신발"];
const configurationLabel = (value) => `제작 ${value?.craftCount ?? 0}개 · 침식 효과 ${value?.corrosionCount ?? 0}개`;
const costNumber = (value) => Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : "미지원";

function renderManaBudget(budget) {
  if (!budget) return "";
  const mp = (value) => Number.isFinite(value) ? value.toLocaleString("ko-KR", { maximumFractionDigits: 12 }) : "미지원";
  return `<section data-role="advisor-mana-budget" aria-label="MP 봉인·1회 소모량">
    <h4>MP 봉인·1회 소모량</h4>
    <p>MP가 가득 찼다고 가정한 1회 비용 비교입니다. 회복·연속 시전·다른 시전 조건은 포함하지 않습니다.</p>
    ${budget.status === "complete" ? `<p>최대 MP ${mp(budget.maximum)} − 봉인 ${mp(budget.reserved)} (${mp(budget.percent)}%) = 가용 MP ${mp(budget.available)}</p>`
      : `<p>가용 MP: 미지원</p><ul>${budget.blockers.map((reason) => `<li>${escape(reason)}</li>`).join("")}</ul>`}
    ${budget.rows.length ? `<table><caption>스킬별 MP 비교</caption><thead><tr><th scope="col">스킬 위치</th><th scope="col">1회 MP</th><th scope="col">사용 후 여유 MP</th><th scope="col">판정</th></tr></thead>
      <tbody>${budget.rows.map((row) => `<tr><th scope="row">${escape(Number.isInteger(row.rowIndex) ? row.rowIndex + 1 : "선택")}번 스킬</th><td>${mp(row.cost)}</td><td>${mp(row.remaining)}</td><td>${row.status === "sufficient" ? "1회 비용 충족" : row.status === "insufficient" ? "MP 부족" : "미지원"}</td></tr>`).join("")}</tbody></table>` : ""}
    <a href="${escape(budget.sourceUrl)}" target="_blank" rel="noreferrer">MP 봉인 규칙 원문</a>
  </section>`;
}

function costFields(id, quote) {
  const scenario = normalizeUpgradeCost(quote.costScenario);
  return `<details${scenario.mode === "attempt" ? " open" : ""}><summary>제작·침식 확률 가정과 기대비용</summary>
    <p>게임의 목표 옵션 확률표는 미확보입니다. 공개 가중치만으로 전체 성공확률을 확정하지 않습니다. 여러 효과를 모두 만족하는 최종 목표의 확률을 직접 입력하세요. 이 가정 계산은 모든 시도에 새 동등 장비 비용을 포함하며, 개별 장비의 재침식 규칙은 반영하지 않습니다.</p>
    <label>비용 계산 방식<select data-advisor-cost="${escape(id)}" data-cost-field="mode"><option value="purchase"${scenario.mode === "purchase" ? " selected" : ""}>구매 가격</option><option value="attempt"${scenario.mode === "attempt" ? " selected" : ""}>확률 가정의 기대비용</option></select></label>
    <label>시도 종류<select data-advisor-cost="${escape(id)}" data-cost-field="kind"><option value="craft"${scenario.kind === "craft" ? " selected" : ""}>제작</option><option value="corrosion"${scenario.kind === "corrosion" ? " selected" : ""}>침식</option></select></label>
    ${[["successPercent", "목표 완성 확률 (%)"], ["basePrice", "매 시도 새 장비 준비 비용"], ["materialPrice", "매 시도 재료비"]].map(([key, label]) => `<label>${label}<input type="number" min="0" ${key === "successPercent" ? 'max="100"' : ""} step="any" data-advisor-cost="${escape(id)}" data-cost-field="${key}" value="${escape(scenario[key])}" /></label>`).join("")}
    <label><input type="checkbox" data-advisor-cost="${escape(id)}" data-cost-field="confirmed"${scenario.confirmed ? " checked" : ""} />사용자 확률 가정·독립 시도·매 시도 새 장비·회수금 없음 조건 확인</label>
  </details>`;
}

export function renderSeasonSkillComparison(report) {
  if (!report) return "";
  return `<section data-role="season-skill-comparison" aria-label="스킬 자체 시즌 수치 비교">
    <h4>SS13 → SS14 스킬 자체 수치</h4>
    <p>${report.limitations.map(escape).join(" ")}</p>
    ${report.rows.length ? report.rows.map((row) => `<h5>${escape(row.name)} · ${escape(row.level)}레벨</h5>
      <table><caption>${escape(row.name)}의 시즌별 기본 수치</caption><thead><tr><th scope="col">항목</th><th scope="col">SS13</th><th scope="col">SS14</th><th scope="col">차이</th></tr></thead>
      <tbody>${row.metrics.map((metric) => `<tr><th scope="row">${escape(metric.label)}</th><td>${metric.supported ? escape(metric.before) : "미지원"}</td><td>${metric.supported ? escape(metric.after) : "미지원"}</td><td>${metric.supported ? escape(`${metric.delta > 0 ? "+" : ""}${metric.delta}`) : "미지원"}</td></tr>`).join("")}</tbody></table>
      <p>${[...new Set([...row.before.blockers, ...row.after.blockers])].map(escape).join(" ")}</p>
      <p>${[row.before, row.after].filter((side) => side.receipt).map((side) => `<a href="${escape(side.receipt.sourceUrl)}" target="_blank" rel="noreferrer">${escape(side.season)} 계산 원문</a>`).join(" · ")}</p>`).join("") : "<p>비교할 메인 스킬을 선택하세요.</p>"}
  </section>`;
}

export function renderBuildAdvisor({ records = [], savedBuilds = [], preferences, diagnosis, comparison, result, stale = false, error = "", itemName, showSeasonPreview = false, showWeightResearch = false, seasonImpact = null, savedSeasonComparison = null, seasonResearch = {} }) {
  const gear = records.filter((record) => record.kind === "gear");
  return `<div class="build-advisor" data-role="build-advisor">
    <h3>빌드 도우미</h3>
    <p>입력 문제와 계산 미지원을 구분하고, 검증된 범위에서 변경을 비교합니다.</p>
    ${renderUpgradeProbabilityResearch(preferences.weightResearch, preferences.weightResearchRequested, showWeightResearch)}
    <details open><summary>구성 안내·오류 진단</summary>
      <p>히어로 → 메인 스킬·보조 → 장비·자원 → 전투 조건 순으로 구성하세요.</p>
      <button type="button" data-action="advisor-diagnose">현재 빌드 진단</button>
      ${diagnosis ? `<ul data-role="advisor-diagnostics" tabindex="-1">${diagnosis.issues.map((issue) => `<li>
        <strong>${issue.kind === "input" ? "입력 확인" : issue.kind === "condition" ? "조건 확인" : "지원 제한"}</strong> ${escape(issue.message)}
        <button type="button" data-action="${issue.section === "conditions" ? "advisor-conditions" : issue.section === "research" ? "advisor-evidence" : "jump-planner-section"}" data-section="${escape(issue.section)}">${escape(issue.action)}</button>
      </li>`).join("") || "<li>등록된 검사에서 문제를 찾지 못했습니다. 전체 계산 지원을 뜻하지는 않습니다.</li>"}</ul>` : ""}
      ${renderManaBudget(diagnosis?.manaBudget)}
    </details>
    <details${comparison ? " open" : ""}><summary>시즌·저장 빌드 비교</summary>
      <p>현재 계산: SS13</p>
      <label for="advisorCompareBuild">비교할 저장 빌드</label>
      <select id="advisorCompareBuild"><option value="">선택하세요</option>${savedBuilds.map((build) => `<option value="${escape(build.id)}" ${preferences.compareId === build.id ? "selected" : ""}>${escape(build.name || "이름 없는 빌드")}</option>`).join("")}</select>
      <button type="button" data-action="advisor-compare">변경 비교</button>
      ${comparison ? comparison.metrics.length ? `<ul data-role="advisor-comparison">${comparison.metrics.map((metric) => `<li>${metricLabels[metric.key]}: ${metric.supported ? `${metric.before} → ${metric.after} (${metric.delta > 0 ? "+" : ""}${metric.delta})` : "미지원"}</li>`).join("")}</ul>` : `<p role="status">${escape(comparison.reason)}</p>` : ""}
    </details>
    <button type="button" data-action="advisor-toggle-season-preview" aria-expanded="${showSeasonPreview}" aria-controls="advisor-season-preview">다음 시즌 참고 자료 ${showSeasonPreview ? "닫기" : "보기"}</button>
    ${showSeasonPreview ? `<section id="advisor-season-preview" aria-label="다음 시즌 참고 자료" tabindex="-1">
      <h4>다음 시즌 참고 자료</h4>
      <p>SS14: 스킬 자체 수치 비교 지원 · 전체 빌드 계산 미지원</p>
      <ul>${SS14_PREVIEW_SOURCES.sources.map((source) => `<li><a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.title)}</a>${source.koreanTextVerified ? "" : " · 한국어 원문 미확인"}</li>`).join("")}</ul>
      <p>SS14 미완료: ${SS14_PREVIEW_SOURCES.blockers.map(escape).join(" · ")}</p>
      ${renderSeasonBuildResearch(seasonResearch)}
      <button type="button" data-action="advisor-season-impact">내 빌드의 다음 시즌 변경 확인</button>
      ${seasonImpact ? `<div data-role="advisor-season-impact" role="status" tabindex="-1">
        <p>선택 항목 ${seasonImpact.counts.total}개 · 원문 변경 ${seasonImpact.counts.changed}개 · 원문 동일 ${seasonImpact.counts.unchanged}개 · 미검증 ${seasonImpact.counts.unverified}개</p>
        <p>${seasonImpact.limitations.map(escape).join(" ")}</p>
        <p>자료 수집: ${escape(seasonImpact.generatedAt || "미수집")} · 현재 빌드는 변경하지 않습니다.</p>
        ${renderSeasonSkillComparison(seasonImpact.skillComparison)}
        <button type="button" data-action="advisor-save-season">현재 시즌 비교 저장</button>
        ${seasonImpact.items.map((item) => `<details><summary>${escape(item.name)} · ${item.status === "text-changed" ? "원문 변경" : item.status === "text-unchanged" ? "원문 동일" : "미검증"}</summary>
          ${item.reason ? `<p>${escape(item.reason)}</p>` : ""}
          ${["before", "after"].map((side) => item[side] ? `<h5>${side === "before" ? "SS13 보존 원문" : "SS14 후보 원문"}</h5>
            <a href="${escape(item[side].sourceUrl)}" target="_blank" rel="noreferrer">출처 보기</a><pre>${escape(item[side].text)}</pre>` : "").join("")}
        </details>`).join("")}
      </div>` : ""}
      ${savedSeasonComparison ? `<details data-role="saved-season-comparison"><summary>저장된 시즌 비교 · ${escape(savedSeasonComparison.build.name || "이름 없는 빌드")}</summary>
        <p>저장 시각: ${escape(savedSeasonComparison.savedAt)} · 저장 당시 결과입니다. 현재 빌드에 적용하지 않습니다.</p>
        ${renderSeasonSkillComparison(savedSeasonComparison.report)}</details>` : ""}
    </section>` : ""}
    <details${result ? " open" : ""}><summary>예산·보유 장비로 다음 강화 찾기</summary>
      <p>보관함 장비를 한 부위씩 비교합니다. 예정 후보는 보유 표시를 끄고 구매 가격 또는 사용자 확률 가정의 기대비용을 선택하세요. 금액은 같은 통화로 입력합니다. 기대비용이 예산 이하여도 성공을 보장하지 않습니다. 다른 부위는 고정됩니다.</p>
      <div class="advisor-fields"><label>예산<input id="advisorBudget" type="number" min="0" step="any" value="${escape(preferences.budget)}" /></label>
      <label>통화<input id="advisorCurrency" maxlength="30" value="${escape(preferences.currency)}" /></label>
      <label>교체할 부위<select id="advisorSlot">${slotLabels.map((label, index) => `<option value="${index}" ${preferences.slotIndex === index ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
      ${gear.length ? `<div class="advisor-quotes">${gear.map((record) => {
        const quote = preferences.quotes[record.id] ?? { owned: true, price: "" };
        return `<fieldset><legend>${escape(record.label || itemName(record.data.itemId))} · ${configurationLabel({ craftCount: Object.keys(record.data.gearCrafts ?? {}).length, corrosionCount: record.data.gearLegendaryDraft?.corrodedSlotIds?.length ?? (record.data.gearCorrupted ? 1 : 0) })}</legend>
          <label><input type="checkbox" data-advisor-owned="${escape(record.id)}" ${quote.owned ? "checked" : ""} />보유 장비</label>
          <label>구매 가격<input type="number" min="0" step="any" data-advisor-price="${escape(record.id)}" value="${escape(quote.price ?? "")}" /></label>
          <small>가격 출처: 사용자 입력 · ${quote.updatedAt ? escape(formatAppDateTime(quote.updatedAt)) : "입력 시각 미기록"}</small>
          ${costFields(record.id, quote)}</fieldset>`;
      }).join("")}</div>` : "<p>보관함에 장비를 먼저 등록하세요.</p>"}
      <button type="button" data-action="open-overlay" data-overlay="inventory">보관함 열기</button>
      <button type="button" data-action="advisor-recommend">후보 평가</button>
      ${result ? `<div data-role="advisor-recommendation" role="status" tabindex="-1"><p>${result.status === "baseline-unverified" ? "현재 빌드의 계산이 미완료여서 추천 순위를 보류합니다." : "탐색 범위 내 결과입니다. 전체 최적해가 아닙니다."}
        검토 ${result.scope.candidateCount}개 · 순위 ${result.ranked.length}개 · 제외 ${result.excluded.length}개</p>
        ${stale ? "<p>빌드 또는 조건이 바뀌었습니다. 다시 평가하세요.</p>" : ""}
        ${result.ranked.length ? `<p>${(result.baseline?.advisorSupport?.limitations ?? []).map(escape).join(" ")}</p>` : ""}
        <ol>${result.ranked.map((candidate) => `<li>${escape(candidate.label)} · ${configurationLabel(candidate.configuration)} · ${candidate.costEstimate?.status === "assumption" ? "기대비용" : "비용"} ${costNumber(candidate.cost)} ${escape(preferences.currency)} · 초당 대미지 +${candidate.deltaDps} · HP ${candidate.deltaLife ?? "미지원"} · MP ${candidate.deltaMana ?? "미지원"} · 보호막 ${candidate.deltaShield ?? "미지원"}
        ${candidate.costEstimate?.status === "assumption" ? `<p>사용자 확률 가정 · 매 시도 비용 ${costNumber(candidate.costEstimate.attemptCost)} · 평균 ${costNumber(candidate.costEstimate.expectedAttempts)}회 · 예산 내 ${candidate.costEstimate.budgetAttempts}회 · 예산 내 성공확률 ${costNumber(candidate.costEstimate.successWithinBudget * 100)}%<br />${escape(candidate.costEstimate.caveat)}</p>` : ""}
        <button type="button" data-action="advisor-save-candidate" data-candidate="${escape(candidate.id)}" ${stale ? "disabled" : ""}>후보를 사본으로 저장</button></li>`).join("")}</ol>
        <ul>${result.excluded.map((candidate) => `<li>${escape(candidate.label || "장비 후보")}: ${escape(candidate.reason)}</li>`).join("")}</ul></div>` : ""}
    </details>
    ${error ? `<p role="alert">${escape(error)}</p>` : ""}
  </div>`;
}

export function loadAdvisorPreferences(storage) {
  let value;
  try { value = JSON.parse(storage.getItem("tob.advisor.v1")); } catch { value = null; }
  const quotes = Object.fromEntries(Object.entries(value?.quotes ?? {}).filter(([, quote]) => quote && typeof quote === "object")
    .map(([id, quote]) => [id, { owned: quote.owned === true,
      price: typeof quote.price === "number" && Number.isFinite(quote.price) && quote.price >= 0 ? quote.price : "",
      updatedAt: typeof quote.updatedAt === "string" && Number.isFinite(Date.parse(quote.updatedAt)) ? quote.updatedAt : null,
      costScenario: normalizeUpgradeCost(quote.costScenario) }]));
  return { budget: typeof value?.budget === "number" && Number.isFinite(value.budget) && value.budget >= 0 ? value.budget : 0,
    currency: typeof value?.currency === "string" ? value.currency.slice(0, 30) : "사용자 지정 통화",
    slotIndex: Number.isInteger(value?.slotIndex) && value.slotIndex >= 0 && value.slotIndex < 10 ? value.slotIndex : 2,
    compareId: typeof value?.compareId === "string" ? value.compareId : "", quotes,
    weightResearch: normalizeWeightResearch(value?.weightResearch), weightResearchRequested: value?.weightResearchRequested === true,
    seasonImpactRequested: value?.seasonImpactRequested === true };
}
