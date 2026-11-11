import { renderSeasonWorkspace } from "./seasonWorkspaceView.js";
import { formatAppDateTime } from "./dateTimePresentation.js";

const escape = (value) => String(value ?? "").replace(/[&<>"']/gu,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const sectionFor = (path) => ({ hero: "hero", skills: "skills", supports: "skills", gear: "gear", talents: "talents", pact: "spirits", spirits: "spirits", destiny: "spirits", divinity: "slates", slates: "slates" })[path?.replace(/^selections\./u, "").split(".")[0]];
const number = (value, unit) => Number.isFinite(value) ? `${value.toLocaleString("ko-KR", { maximumFractionDigits: 5 })}${unit === "percent" ? "%" : ""}` : "미지원";

function gearComparisons(calculations = []) {
  return calculations.filter((entry) => entry.comparison?.scope === "gear-card-contributions-only").map((entry) => `<section data-role="season-gear-comparison">
    <h6>장비 칸 ${entry.slotIndex + 1} · 선택 수치 시즌 비교</h6>
    <p>장비 카드의 개별 효과만 비교합니다. 원문 옵션은 SS13 기준이며, 캐릭터 전체 속성·DPS·획득 확률이 아닙니다. 범위가 바뀐 선택값은 자동 이전하지 않습니다.</p>
    <table><caption>선택 장비의 SS13 → SS14 개별 효과</caption><thead><tr><th scope="col">SS13 원문 옵션</th><th scope="col">SS13 선택값</th><th scope="col">SS14 연결값</th><th scope="col">차이</th></tr></thead>
    <tbody>${entry.comparison.rows.map((row) => `<tr><th scope="row">${escape(row.label)}</th><td>${number(row.before, row.unit)}</td><td>${number(row.after, row.unit)}</td><td>${number(row.delta, row.unit)}${row.reason ? `<br/><small>${escape(row.reason)}</small>` : ""}</td></tr>`).join("")}</tbody></table>
  </section>`).join("");
}

export function renderSeasonBuildResearch({ draft = null, copies = [], storageError = "", stale = false, workspace = {} } = {}) {
  return `<section class="season-build-research" aria-label="시즌 이전 검토">
    <h4>SS14 전체 구성 점검·이전 검토</h4>
    <p>원본의 모든 입력을 보존한 연구용 사본입니다. 전체 빌드 계산과 현재 편집기로의 SS14 적용은 미지원입니다. 기존 SS13 빌드와 저장 목록은 바꾸지 않습니다.</p>
    <button type="button" data-action="advisor-prepare-migration">현재 빌드의 SS14 이전 검토</button>
    ${storageError ? `<p role="alert">${escape(storageError)}</p>` : ""}
    ${copies.length ? `<details data-role="season-research-copies"><summary>저장된 이전 검토 사본 ${copies.length}개</summary><ul>${copies.map((copy) => `<li>${escape(copy.targetBuild.name)} · ${escape(formatAppDateTime(copy.createdAt))}
      <button type="button" data-action="advisor-open-migration" data-copy="${escape(copy.id)}">저장 입력 다시 점검</button></li>`).join("")}</ul></details>` : ""}
    ${draft ? `<div data-role="season-build-review" tabindex="-1">
      <h5>${escape(draft.targetBuild.name)}</h5><p>전체 빌드 DPS·HP·MP·보호막: 미지원</p>
      <p>선택 항목 ${draft.report.counts.total}개 · 개별 카드 해석 ${draft.report.counts.mapped}개 · 미완료 점검 ${draft.report.counts.blocked}건</p>
      <p>${escape(draft.report.limitation)}</p>
      ${stale && !draft.saved ? '<p role="alert">원본 입력이 바뀌었습니다. 저장 전에 이전 검토를 다시 준비하세요.</p>' : ""}
      ${draft.sourcesChanged ? '<p>자료 수집 버전이 바뀌어 저장된 입력으로 다시 점검했습니다. 저장 당시 결과와 다를 수 있습니다.</p>' : ""}
      ${draft.saved ? '<p>저장한 입력으로 다시 점검한 결과입니다. 현재 편집 중인 빌드는 그대로 유지됩니다.</p>' : ""}
      <ul>${draft.report.blockers.map((row) => `<li><strong>${escape(row.label)}</strong>: ${escape(row.reason)}${sectionFor(row.path) ? ` <button type="button" data-action="jump-planner-section" data-section="${sectionFor(row.path)}">원본 구성 확인</button>` : ""}</li>`).join("")}</ul>
      <details><summary>선택 항목별 원문 연결</summary>${draft.report.components.map((row) => `<details><summary>${escape(row.label)} · ${escape(row.name)} · ${row.status === "mapped" ? "개별 카드 해석" : "미지원"}</summary>
        <p>${row.reasons?.map(escape).join(" · ") || "개별 카드만 해석했으며 전체 빌드 계산에 합산하지 않습니다."}</p>
        ${row.sourceReceipt && /^https:\/\/tlidb\.com\/(en|ko)\//u.test(row.sourceReceipt.sourceUrl) ? `<a href="${escape(row.sourceReceipt.sourceUrl)}" target="_blank" rel="noreferrer">SS14 구성 원문</a>` : ""}
        ${gearComparisons(row.calculations)}
        ${(row.calculations ?? []).map((entry) => entry.receipt && /^https:\/\/tlidb\.com\/(en|ko)\//u.test(entry.receipt.sourceUrl) ? `<a href="${escape(entry.receipt.sourceUrl)}" target="_blank" rel="noreferrer">SS14 해당 카드 원문</a>` : "").join(" ")}</details>`).join("") || "<p>선택한 항목이 없습니다.</p>"}</details>
      ${draft.saved ? "" : `<button type="button" data-action="advisor-save-migration"${stale ? " disabled" : ""}>원본을 보존하고 검토 사본 저장</button>`}
      <button type="button" data-action="advisor-create-workspace"${stale && !draft.saved ? " disabled" : ""}>SS14 편집 사본으로 이전</button>
      <button type="button" data-action="advisor-cancel-migration">${draft.saved ? "검토 닫기" : "검토 취소"}</button>
    </div>` : ""}
    ${renderSeasonWorkspace(workspace)}
  </section>`;
}
