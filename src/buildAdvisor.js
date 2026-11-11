import { calculateBuild, normalizeBuild } from "./engine.js";
import { CURRENT_PATCH_SNAPSHOT, patchSnapshotsMatch } from "./calculation/patchSnapshot.js";
import { findItemById } from "./catalog.js";
import { getCompatibleGearSlotIndices } from "./gearSlotInference.js";
import { applyUnifiedInventoryRecord } from "./storage.js";
import { advisorGearAcquisitionBlocker, inspectAdvisorCalculationSupport } from "./advisorCalculationSupport.js";
import { getSkillEnergyUsage } from "./skillRuntimeModel.js";
import { evaluateUpgradeCost } from "./upgradeCost.js";
import { inspectSkillManaBudget } from "./skillManaBudget.js";

export function diagnoseBuild(build, calculation = calculateBuild(build), options = {}) {
  const normalized = normalizeBuild(build);
  const issues = [];
  const add = (id, kind, section, message, action) => issues.push({ id, kind, section, message, action });
  if (!normalized.selections?.hero?.length && !normalized.hero?.branchId) {
    add("hero-missing", "input", "hero", "히어로가 선택되지 않았습니다.", "히어로 선택하기");
  }
  const damageRows = (calculation.skillRows ?? []).filter((row) => row.calculationApplicable !== false);
  const energy = getSkillEnergyUsage(normalized.skills);
  if (energy.over > 0) add("energy-over", "input", "skills",
    `설정한 에너지 한도를 ${energy.over} 초과했습니다. 보조 슬롯 개수와 에너지 입력을 확인하세요.`, "보조 슬롯 확인하기");
  if (!damageRows.length) add("skill-missing", "input", "skills", "대미지를 계산할 메인 스킬이 없습니다.", "스킬 구성하기");
  if (calculation.provenance?.summary?.patchMismatch) {
    add("season-mismatch", "unsupported", "research", "저장 빌드와 현재 계산 데이터의 버전이 다릅니다. 시즌 간 수치 비교는 보류됩니다.", "빌드 버전 확인하기");
  }
  const duplicateRows = [];
  const passives = new Map();
  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    const id = normalized.selections.skills?.[rowIndex];
    if (rowIndex >= 5 && id) {
      if (passives.has(id)) {
        duplicateRows.push(rowIndex, passives.get(id));
        add(`passive-duplicate:${rowIndex}`, "input", "skills", `${passives.get(id) - 4}번과 ${rowIndex - 4}번 패시브에 같은 스킬이 있습니다. 같은 패시브는 하나만 장착할 수 있습니다.`, "패시브 구성 확인하기");
      } else passives.set(id, rowIndex);
    }
    const seen = new Set();
    const duplicates = normalized.selections.supports.slice(rowIndex * 5, rowIndex * 5 + 5).some((supportId) => {
      if (!supportId) return false;
      if (seen.has(supportId)) return true;
      seen.add(supportId);
      return false;
    });
    if (duplicates) {
      duplicateRows.push(rowIndex);
      add(`support-duplicate:${rowIndex}`, "input", "skills", `${rowIndex + 1}번 스킬 묶음에 같은 보조가 중복되어 있습니다. 같은 묶음에는 하나만 장착할 수 있습니다.`, "보조 구성 확인하기");
    }
  }
  const manaBudget = inspectSkillManaBudget(normalized, calculation, { ...options, duplicateRows });
  if (manaBudget.over) add("mana-seal-over", "input", "skills", `MP 봉인 합계가 ${manaBudget.percent}%로 100%를 초과합니다. 모든 패시브를 함께 활성화할 수 없습니다.`, "봉인 구성 확인하기");
  if (manaBudget.status !== "complete" && damageRows.length) add("mana-budget-unsupported", "unsupported", "skills",
    "봉인 후 가용 MP를 확정할 수 없어 1회 소모량 충족 여부를 판정하지 않습니다.", "MP 봉인 근거 확인하기");
  for (const row of damageRows) {
    const position = Number.isInteger(row.rowIndex) ? row.rowIndex + 1 : "선택";
    if (!row.calculationSupported) add(`skill:${row.rowIndex}`, "unsupported", "skills",
      `${position}번 스킬의 효과를 모두 계산할 수 없습니다. 사용자 입력 오류와 별개인 지원 제한입니다.`, "스킬 근거 확인하기");
    if (manaBudget.rows.find((entry) => entry.rowIndex === row.rowIndex)?.status === "insufficient" && !manaBudget.over) {
      add(`mana:${row.rowIndex}`, "input", "skills", `${position}번 스킬의 1회 MP 소모가 봉인 후 가용 MP보다 큽니다.`, "MP 소모 확인하기");
    }
    const incompatible = (row.excluded ?? []).filter((effect) => effect.reason === "incompatible-support");
    if (incompatible.length) add(`support:${row.rowIndex}`, "input", "skills",
      `${position}번 스킬과 호환되지 않는 보조가 ${incompatible.length}개 있습니다.`, "보조 연결 확인하기");
    if (row.manaCost && row.manaCost.status !== "complete") add(`mana-support:${row.rowIndex}`, "unsupported", "skills",
      `${position}번 스킬의 MP 소모를 확인할 수 없어 자원 충족 여부를 판정하지 않습니다.`, "MP 소모 근거 확인하기");
  }
  const unmetConditions = (calculation.effects ?? []).filter((effect) => effect.applied === false
    && ["tlidb-effect-condition-unmet", "tlidb-gear-condition-unmet"].includes(effect.inactiveReason));
  if (unmetConditions.length) add("conditions-inactive", "condition", "conditions",
    `현재 전투 조건에서 비활성인 효과가 ${unmetConditions.length}개 있습니다. 의도한 조건인지 확인하세요.`, "전투 조건 확인하기");
  const unsupported = (calculation.provenance?.sources ?? []).filter((source) => source.evidence === "unsupported");
  if (unsupported.length) add("unsupported-effects", "unsupported", "research",
    `계산 근거에서 미지원 ${unsupported.length}건이 확인됐습니다. 미지원 효과를 0으로 판단하거나 완전한 빌드로 추천하지 않습니다.`, "계산 근거 확인하기");
  const slots = normalized.gear?.slots ?? [];
  const used = new Set();
  slots.forEach((slot, index) => {
    if (!slot?.itemId) return;
    if (!getCompatibleGearSlotIndices(slot.itemId).includes(index)) add(`gear-slot:${index}`, "input", "gear", `${index + 1}번 장비의 착용 부위를 확인하세요.`, "장비 편집하기");
    if (slot.instanceId && used.has(slot.instanceId)) add(`gear-instance:${index}`, "input", "gear", "같은 장비 인스턴스가 중복 장착돼 있습니다.", "장비 편집하기");
    used.add(slot.instanceId);
  });
  const unresolvedInputs = (calculation.effects ?? []).filter((effect) => effect.applied === false
    && (effect.categoryId === "gear" || effect.sourceId?.startsWith("gear-"))
    && ["tlidb-roll-selection-required", "tlidb-roll-selection-out-of-range"].includes(effect.inactiveReason));
  if (unresolvedInputs.length) add("gear-rolls-missing", "input", "gear",
    `옵션 수치가 없거나 원문 범위를 벗어난 효과가 ${unresolvedInputs.length}개 있습니다.`, "옵션 수치 입력하기");
  return { issues, manaBudget, inputCount: issues.filter((issue) => issue.kind === "input").length,
    unsupportedCount: issues.filter((issue) => issue.kind === "unsupported").length,
    conditionCount: issues.filter((issue) => issue.kind === "condition").length };
}

export function compareBuildVersions(before, after, {
  calculate = calculateBuild,
  isUnsupported = (calculation, key) => calculation.traces?.[key]?.status === "unsupported",
} = {}) {
  if (!patchSnapshotsMatch(before?.patchSnapshot, after?.patchSnapshot)
    || !patchSnapshotsMatch(before?.patchSnapshot, CURRENT_PATCH_SNAPSHOT)) {
    return { status: "season-engine-unavailable", metrics: [], reason: "각 시즌의 검증된 계산 엔진이 필요합니다. 현재 엔진으로 과거·SS14 수치를 대신 계산하지 않습니다." };
  }
  const left = calculate(before);
  const right = calculate(after);
  const metrics = ["dps", "life", "mana", "shield"].map((key) => {
    const traceLeft = left.traces?.[key];
    const traceRight = right.traces?.[key];
    const comparable = Boolean(traceLeft && traceRight)
      && traceLeft.status !== "unsupported" && traceRight.status !== "unsupported"
      && !isUnsupported(left, key) && !isUnsupported(right, key)
      && Number.isFinite(left.summary?.[key]) && Number.isFinite(right.summary?.[key]);
    return { key, supported: comparable, before: comparable ? left.summary[key] : null,
      after: comparable ? right.summary[key] : null, delta: comparable ? right.summary[key] - left.summary[key] : null };
  });
  return { status: "same-version", metrics };
}

function rankable(calculation) {
  const provenance = calculation.provenance?.summary;
  const rows = (calculation.skillRows ?? []).filter((row) => row.calculationApplicable !== false);
  return (calculation.advisorSupport ? calculation.advisorSupport.dps === true : provenance?.confidence === "verified") && provenance.patchMismatch === false
    && rows.length > 0 && rows.every((row) => row.calculationSupported === true)
    && Number.isFinite(calculation.summary?.dps);
}

export function rankBudgetCandidates({ baseline, candidates, budget, maxChanges = 1, fixedSlots = [] }) {
  if (typeof budget !== "number" || !Number.isFinite(budget) || budget < 0) throw new Error("예산은 0 이상의 숫자여야 합니다.");
  if (!Number.isInteger(maxChanges) || maxChanges < 1) throw new Error("최대 변경 개수를 확인하세요.");
  const excluded = [];
  const ranked = [];
  for (const candidate of candidates) {
    let reason = "";
    const cost = candidate.owned === true ? 0 : candidate.price;
    if (!rankable(baseline) || !rankable(candidate.calculation)) reason = "계산 미지원·미검증";
    else if (candidate.costEstimate?.status === "unavailable") reason = candidate.costEstimate.reason;
    else if (!patchSnapshotsMatch(baseline.provenance.patchSnapshot, candidate.calculation.provenance.patchSnapshot)) reason = "계산 버전 불일치";
    else if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) reason = "가격 미입력·잘못된 가격";
    else if (cost > budget) reason = "예산 초과";
    else if (!candidate.changedSlots?.length || candidate.changedSlots.length > maxChanges) reason = "변경 개수 초과·변경 없음";
    else if (candidate.changedSlots.some((slot) => fixedSlots.includes(slot))) reason = "고정 장비 변경";
    else if (new Set(candidate.instanceIds ?? []).size !== (candidate.instanceIds ?? []).length) reason = "장비 인스턴스 중복";
    else if (candidate.calculation.summary.dps <= baseline.summary.dps) reason = "대미지 증가 없음";
    if (reason) { excluded.push({ id: candidate.id, label: candidate.label, reason }); continue; }
    const resourceDelta = (key) => baseline.advisorSupport?.resources !== false && candidate.calculation.advisorSupport?.resources !== false
      && Number.isFinite(baseline.summary[key]) && Number.isFinite(candidate.calculation.summary[key])
      ? candidate.calculation.summary[key] - baseline.summary[key] : null;
    ranked.push({ ...candidate, cost, deltaDps: candidate.calculation.summary.dps - baseline.summary.dps,
      deltaLife: resourceDelta("life"), deltaMana: resourceDelta("mana"), deltaShield: resourceDelta("shield"),
      efficiency: cost > 0 ? (candidate.calculation.summary.dps - baseline.summary.dps) / cost : null });
  }
  ranked.sort((a, b) => b.deltaDps - a.deltaDps || a.cost - b.cost || a.id.localeCompare(b.id));
  return { status: rankable(baseline) ? "evaluated" : "baseline-unverified", ranked, excluded,
    scope: { candidateCount: candidates.length, rankedCount: ranked.length, excludedCount: excluded.length, maxChanges, globalOptimal: false } };
}

export function recommendInventoryUpgrades(build, records, { budget, slotIndex, quotes = {}, fixedSlots = [] }) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 9) throw new Error("장비 위치를 선택하세요.");
  const normalized = normalizeBuild(build);
  const baseline = calculateBuild(normalized);
  baseline.advisorSupport = inspectAdvisorCalculationSupport(normalized, baseline);
  const invalid = [];
  const candidates = records.filter((record) => record.kind === "gear").map((record) => {
    const acquisitionReason = advisorGearAcquisitionBlocker(findItemById(record.data.itemId), record.data.gearCrafts);
    if (acquisitionReason) {
      invalid.push({ id: record.id, label: record.label, reason: acquisitionReason });
      return null;
    }
    if (!getCompatibleGearSlotIndices(record.data.itemId).includes(slotIndex)) {
      invalid.push({ id: record.id, label: record.label, reason: "착용 부위 불일치" });
      return null;
    }
    if (record.instanceId && normalized.gear.slots.some((slot, index) => index !== slotIndex && slot?.instanceId === record.instanceId)) {
      invalid.push({ id: record.id, label: record.label, reason: "장비 인스턴스 중복" });
      return null;
    }
    const nextBuild = applyUnifiedInventoryRecord(normalized, record, { slotIndex });
    const quote = quotes[record.id] ?? { owned: true };
    const costEstimate = evaluateUpgradeCost(quote, budget);
    const calculation = calculateBuild(nextBuild);
    calculation.advisorSupport = inspectAdvisorCalculationSupport(nextBuild, calculation);
    return { id: record.id, label: record.label || findItemById(record.data.itemId)?.tlidbText?.ko?.name || "장비 후보",
      configuration: { craftCount: Object.keys(record.data.gearCrafts ?? {}).length,
        corrosionCount: record.data.gearLegendaryDraft?.corrodedSlotIds?.length ?? (record.data.gearCorrupted ? 1 : 0) },
      owned: quote.owned === true, price: costEstimate.cost, costEstimate, changedSlots: [slotIndex], nextBuild,
      instanceIds: (nextBuild.gear.slots ?? []).filter(Boolean).map((slot) => slot.instanceId).filter(Boolean),
      calculation };
  }).filter(Boolean);
  const result = rankBudgetCandidates({ baseline, candidates, budget, fixedSlots, maxChanges: 1 });
  return { ...result, excluded: [...result.excluded, ...invalid],
    scope: { ...result.scope, candidateCount: candidates.length + invalid.length, excludedCount: result.excluded.length + invalid.length },
    buildKey: JSON.stringify(normalized), baseline };
}
