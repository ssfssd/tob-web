// Scenario arithmetic, not a game probability table. Each independent attempt
// starts with a fresh equivalent item; failed items have no assumed resale value.
const numeric = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function normalizeUpgradeCost(input) {
  const number = (value) => numeric(value) ? value : "";
  return { mode: input?.mode === "attempt" ? "attempt" : "purchase",
    kind: input?.kind === "corrosion" ? "corrosion" : "craft",
    successPercent: number(input?.successPercent), basePrice: number(input?.basePrice),
    materialPrice: number(input?.materialPrice), confirmed: input?.confirmed === true };
}

export function evaluateUpgradeCost(quote, budget) {
  if (quote?.owned === true) return { status: "owned", cost: 0 };
  const scenario = normalizeUpgradeCost(quote?.costScenario);
  if (scenario.mode !== "attempt") return { status: numeric(quote?.price) ? "purchase" : "unavailable", cost: quote?.price,
    reason: numeric(quote?.price) ? null : "가격 미입력·잘못된 가격" };
  const unavailable = (reason) => ({ status: "unavailable", cost: null, reason });
  if (!scenario.confirmed) return unavailable("확률 가정과 매 시도 새 장비 준비 조건을 확인하세요.");
  if (!numeric(scenario.successPercent) || scenario.successPercent <= 0 || scenario.successPercent > 100) {
    return unavailable("목표 완성 확률은 0 초과 100 이하로 입력하세요. 미확보 확률은 자동 추정하지 않습니다.");
  }
  if (!numeric(scenario.basePrice) || !numeric(scenario.materialPrice)) return unavailable("장비 준비 비용과 시도 재료비를 모두 입력하세요.");
  if (!numeric(budget)) return unavailable("예산은 0 이상의 숫자여야 합니다.");
  const attemptCost = scenario.basePrice + scenario.materialPrice;
  if (!Number.isFinite(attemptCost) || attemptCost <= 0) return unavailable("한 번의 총 시도 비용은 0보다 커야 합니다.");
  const probability = scenario.successPercent / 100;
  const expectedAttempts = 1 / probability;
  const cost = attemptCost / probability;
  if (!Number.isFinite(cost) || !Number.isFinite(expectedAttempts)) return unavailable("입력 범위가 계산 한도를 벗어났습니다.");
  const budgetAttempts = Math.floor(budget / attemptCost);
  if (!Number.isSafeInteger(budgetAttempts)) return unavailable("예산 내 시도 횟수가 계산 한도를 벗어났습니다.");
  const successWithinBudget = budgetAttempts === 0 ? 0 : probability === 1 ? 1 : -Math.expm1(budgetAttempts * Math.log1p(-probability));
  return { status: "assumption", kind: scenario.kind, cost, attemptCost, expectedAttempts, probability,
    budgetAttempts, successWithinBudget, source: "사용자 입력 가정 · 게임 확률 미검증",
    model: "independent-fresh-item-attempts-v1",
    caveat: "동일한 목표 완성 확률의 독립 시도이며, 매 시도 새 동등 장비를 준비한다고 가정합니다. 실패 장비의 회수금은 0으로 가정합니다. 기대비용은 보장 비용이 아닙니다." };
}
