import { UPGRADE_WEIGHTS } from "./data/upgradeWeights.generated.js";

export function normalizeWeightResearch(input = {}, data = UPGRADE_WEIGHTS) {
  const number = (value, fallback) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  const rawId = typeof input.targetId === "string" ? input.targetId : "1:1";
  const targetId = data.legacyTargetIds?.[rawId] ?? rawId;
  const categoryId = typeof input.categoryId === "string" ? input.categoryId
    : data.tables.find((table) => table.rows.some((row) => row.id === targetId))?.categoryId ?? "Necklace";
  return { categoryId, targetId,
    itemLevel: input.itemLevel === undefined ? 100 : number(input.itemLevel, ""), attemptCost: number(input.attemptCost, "") };
}

// Conditional on the supplied table being the eligible pool. Not a game-rate registry.
// No affix exclusion, roll-value distribution, outcome-type chance, or season inferred.
export function evaluateWeightResearch(input, data = UPGRADE_WEIGHTS) {
  const { categoryId, targetId, itemLevel, attemptCost } = normalizeWeightResearch(input, data);
  const table = data.tables.find((entry) => (entry.categoryId ?? "Necklace") === categoryId && entry.rows.some((row) => row.id === targetId));
  const target = table?.rows.find((row) => row.id === targetId);
  const unavailable = (reason) => ({ status: "unavailable", reason, gameProbability: null, expectedGameCost: null });
  if (!target) return unavailable("목표 옵션을 선택하세요.");
  if (target.ambiguous) return unavailable("같은 원문 행이 중복되어 목표를 확정할 수 없습니다. 이 행은 계산하지 않습니다.");
  if (!Number.isInteger(itemLevel) || itemLevel < 1 || itemLevel > 100) return unavailable("아이템 레벨은 1부터 100 사이 정수로 입력하세요.");
  if (target.level > itemLevel) return unavailable("목표 옵션의 필요 레벨보다 아이템 레벨이 낮습니다.");
  const pool = table.rows.filter((row) => row.level <= itemLevel && row.library === target.library);
  if (pool.some((row) => row.ambiguous && row.weight > 0)) return unavailable("추첨 풀에 양수 가중치의 중복 행이 있어 확률을 확정할 수 없습니다.");
  if (pool.some((row) => !Number.isSafeInteger(row.weight) || row.weight < 0)) return unavailable("원문 가중치 검증이 필요합니다.");
  const totalWeight = pool.reduce((sum, row) => sum + row.weight, 0);
  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) return unavailable("선택한 표에 유효한 가중치가 없습니다.");
  const conditionalProbability = target.weight / totalWeight;
  const conditionalCost = table.kind === "craft" && target.weight > 0 && attemptCost !== "" ? attemptCost / conditionalProbability : null;
  return { status: "conditional-table", table, target, pool, totalWeight, conditionalProbability,
    expectedDraws: target.weight > 0 ? totalWeight / target.weight : null,
    conditionalCost: Number.isFinite(conditionalCost) ? conditionalCost : null,
    gameProbability: null, expectedGameCost: null, season: data.season,
    reason: target.weight === 0 ? "표의 가중치가 0입니다. 이 추첨 경로로 획득한다고 계산하지 않습니다. 승급·침식 경로의 불가능을 뜻하지는 않습니다."
      : table.kind === "craft" ? "레벨 이하의 같은 옵션 풀 전체를 추첨 대상으로 삼은 조건부 계산입니다. 실제 제외 규칙·시즌·수치 굴림 분포는 미검증입니다."
        : "이 기본 옵션 표에서 추첨된다는 조건의 비율입니다. 해당 침식 결과가 먼저 선택될 확률은 포함하지 않습니다.",
  };
}
