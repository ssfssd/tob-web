import { UPGRADE_WEIGHTS } from "./data/upgradeWeights.generated.js";
import { evaluateWeightResearch, normalizeWeightResearch } from "./upgradeProbability.js";
import { SS14_RESEARCH } from "./data/ss14Research.generated.js";
import { SS14_RESEARCH_22 } from "./data/ss14Research22.generated.js";
const escape = (value) => String(value ?? "").replace(/[&<>"']/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const number = (value) => Number.isFinite(value) ? value.toLocaleString("ko-KR", { maximumFractionDigits: 5 }) : "미지원";

export function renderUpgradeProbabilityResearch(input, requested = false, open = false) {
  const toggle = `<button type="button" data-action="advisor-toggle-weight-research" aria-expanded="${open}" aria-controls="upgrade-weight-research">공개 제작·침식 가중치 조사와 계산 ${open ? "닫기" : "보기"}</button>`;
  if (!open) return toggle;
  const preferences = normalizeWeightResearch(input);
  const result = requested ? evaluateWeightResearch(preferences) : null;
  const tables = UPGRADE_WEIGHTS.tables.filter((table) => table.categoryId === preferences.categoryId);
  const validTarget = tables.some((table) => table.rows.some((row) => row.id === preferences.targetId));
  const rowCount = tables.reduce((count, table) => count + table.rows.length, 0);
  const latest = SS14_RESEARCH_22.sources.find((r) => r.sourceUrl === `https://tlidb.com/en/${preferences.categoryId}` && r.status === "read");
  const currentCategories = SS14_RESEARCH_22.sources.filter((r) => r.status === "read" && UPGRADE_WEIGHTS.categories.some((c) => r.sourceUrl === `https://tlidb.com/en/${c.id}`));
  return `${toggle}<section id="upgrade-weight-research" data-role="upgrade-weight-research" aria-label="공개 제작·침식 가중치 조사와 계산">
    <h4>공개 제작·침식 가중치 조사와 계산</h4>
    <p>장비 ${UPGRADE_WEIGHTS.categories.length}종의 공개 표 보관본입니다. 선택한 장비의 보관된 원문 표 ${tables.length}개·${rowCount}행입니다. 시즌 표기가 없는 자료이며, 현재 빌드의 확률·추천 비용에 자동 적용하지 않습니다.</p>
    <p>2026-10-15 재조사에서 지혜 신발·힘 흉갑·힘 방패의 현재 원문 표 구조가 보관본과 달라졌습니다. 아래 계산은 보관본 기준이며 현행 제작 확률로 검증되지 않았습니다.</p>
    <p>추가 조사 ${escape(SS14_RESEARCH_22.checkedAt.slice(0, 10))}: 장비 ${currentCategories.length}종을 직접 다시 읽었습니다. 이전 조사와 표 행수·가중치 합계가 달라진 장비 ${SS14_RESEARCH_22.changedWeightTables.length}종입니다. 이전 표를 현행 게임 확률로 사용할 수 없습니다. 아래 계산기는 보관본의 조건부 계산이며 최신 표의 추첨 확률이 아닙니다.</p>
    ${latest?.weightTables.length ? `<details data-role="upgrade-current-research"><summary>선택 장비의 최신 표 구조와 근거</summary><p>현재 확인한 표의 행 수와 합계만 표시합니다. 아래 보관본 계산과 다른 자료이며, 이 합계로 게임 전체 확률을 계산하지 않습니다.</p>
      <table><caption>최신 원문 표 구조</caption><thead><tr><th scope="col">표</th><th scope="col">행 수</th><th scope="col">가중치 합계</th></tr></thead><tbody>${latest.weightTables.map((r, i) => `<tr><th scope="row">표 ${i + 1}</th><td>${r.rowCount}</td><td>${number(r.totalWeight)}</td></tr>`).join("")}</tbody></table>
      <a href="${escape(latest.sourceUrl)}" target="_blank" rel="noreferrer">재확인한 장비 원문</a></details>` : latest ? "<p>이번에 읽은 원문에서 해석 가능한 가중치 표를 확인하지 못했습니다. 표가 없다고 확정하거나 과거 합계로 대체하지 않습니다.</p>" : "<p>이 장비는 이번 추가 재조사 범위에 포함되지 않았습니다.</p>"}
    <p>선택 옵션의 가중치 ÷ 필요 레벨 이하인 같은 표·같은 옵션 풀의 가중치 합계입니다. 기존 옵션에 따른 제외, 실제 추첨 단계와 수치의 최댓값 확률은 반영하지 않습니다.</p>
    <label for="upgradeWeightCategory">조사할 장비 종류</label><select id="upgradeWeightCategory">${UPGRADE_WEIGHTS.categories.map((category) => `<option value="${escape(category.id)}"${category.id === preferences.categoryId ? " selected" : ""}>${escape(category.koreanName || "한국어 원문 미제공")}</option>`).join("")}</select>
    <p>${UPGRADE_WEIGHTS.receipts.filter((receipt) => receipt.category === preferences.categoryId).map((receipt) => `<a href="${escape(receipt.sourceUrl)}" target="_blank" rel="noreferrer">${receipt.locale === "ko" ? "한국어" : "영문"} 가중치 원문</a>`).join(" · ")} · 확인 ${escape(UPGRADE_WEIGHTS.generatedAt.slice(0, 10))}</p>
    <label for="upgradeWeightTarget">조사할 목표 옵션</label><select id="upgradeWeightTarget"><option value=""${validTarget ? "" : " selected"}>목표 옵션을 선택하세요</option>${tables.map((table) => `<optgroup label="${escape(table.koreanHeading || "한국어 원문 미제공")}">${table.rows.map((row) => `<option value="${escape(row.id)}"${row.id === preferences.targetId ? " selected" : ""}>T${escape(row.tier)} · ${escape(row.koreanModifier || "한국어 원문 미제공")} ${row.koreanLibrary ? `· ${escape(row.koreanLibrary)}` : ""}</option>`).join("")}</optgroup>`).join("")}</select>
    <label>아이템 레벨<input id="upgradeWeightLevel" type="number" min="1" max="100" step="1" value="${escape(preferences.itemLevel)}" /></label>
    <label>표 기준 1회 제작 비용 (선택)<input id="upgradeWeightCost" type="number" min="0" step="any" value="${escape(preferences.attemptCost)}" /></label>
    <button type="button" data-action="advisor-weight-calculate">원문 가중치로 계산</button>
    ${result ? `<div data-role="upgrade-weight-result" role="status" tabindex="-1">
      ${result.status === "conditional-table" ? `<p>조건부 확률 ${number(result.conditionalProbability * 100)}% · 목표 가중치 ${result.target.weight} / 풀 합계 ${result.totalWeight} · 대상 ${result.pool.length}행</p>
      <p>동일 표 독립 추첨의 평균 ${number(result.expectedDraws)}회${result.conditionalCost !== null ? ` · 표 조건부 기대비용 ${number(result.conditionalCost)}` : ""}</p>` : ""}
      <p>${escape(result.reason)}</p><p>게임 1회 전체 성공확률·전체 기대비용: 미지원</p>
    </div>` : ""}
    <details><summary>확인된 규칙과 아직 없는 근거</summary><ul>
      <li>일반 제작은 비레전드 장비 대상입니다. 특수 제작은 적용 규칙을 별도 확인해야 합니다. <a href="https://torchlight.xd.com/us/ep8" target="_blank" rel="noreferrer">공식 제작 개편</a></li>
      <li>다음 시즌에는 재침식이 가능한 예외 장비가 있습니다. <a href="https://tlidb.com/en/First_Aember" target="_blank" rel="noreferrer">해당 장비 원문 (한국어 원문 미확인)</a></li>
      <li>침식 결과 종류의 확률·대상 옵션 선택 규칙·시즌별 적용 여부를 확인하기 전에는 전체 성공확률을 만들지 않습니다.</li>
      <li>침식 원문의 50%·100% 옵션 제거 수치는 특정 결과가 선택된 뒤의 설명입니다. 그 결과 자체의 출현 확률이나 목표 옵션 획득 확률로 사용하지 않습니다.</li>
      <li>침식 공통 페이지와 개별 장비 표의 옵션 목록이 서로 다릅니다. 합쳐서 하나의 추첨 풀로 만들지 않습니다. <a href="https://tlidb.com/en/Corrosion" target="_blank" rel="noreferrer">침식 공통 원문</a></li>
      ${SS14_RESEARCH.memoryRevival?.risingMoon20 && SS14_RESEARCH.memoryRevival?.waxAndWane20 ? `<li>별도 시스템인 히어로 추억 부활에서는 두 결과의 확률이 각각 30%에서 20%로 조정된 공식 근거를 확인했습니다. 이는 장비 침식 결과 확률이 아니며, 나머지 60%를 목표 성공확률로 추정하지 않습니다. <a href="${escape(SS14_RESEARCH.memoryRevival.sourceUrl)}" target="_blank" rel="noreferrer">공식 SS14 변경 안내</a></li>` : ""}
      ${SS14_RESEARCH.memoryRevival?.costSchedulePresent ? "<li>추억 부활 1~10회차의 두 재료 비용은 각각 20/30/30/40/40/50/50/60/70/80 및 2/3/3/4/4/5/5/6/7/8이며, 10회 이후 증가하지 않습니다. 목표 결과의 전체 확률표가 없어 성공까지의 기대비용은 미지원입니다.</li>" : ""}
    </ul></details>
  </section>`;
}
