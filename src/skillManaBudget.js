const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0;
const round = (value) => Math.round(value * 1e12) / 1e12;
const UNKNOWN_CONFIGURATION = new Set([
  "input:hero-trait-config", "input:hero-memory-config", "input:skill-elixir-config", "input:skill-support-config",
]);

/** A full-MP, single-use budget. It does not model regeneration or casting eligibility. */
export function inspectSkillManaBudget(build, calculation, { isUnsupported = () => false, duplicateRows = [] } = {}) {
  const blockers = [];
  const add = (message) => { if (!blockers.includes(message)) blockers.push(message); };
  const { mana: maximum, sealedManaPercent: percent } = calculation.summary ?? {};
  if (!build.selections?.hero?.length && !build.hero?.branchId) add("히어로를 선택해야 최대 MP를 확인할 수 있습니다.");
  if (calculation.provenance?.summary?.patchMismatch !== false) add("저장 빌드와 계산 시즌이 일치하는지 확인할 수 없습니다.");
  for (const [key, label] of [["mana", "최대 MP"], ["sealedManaPercent", "MP 봉인"]]) {
    const trace = calculation.traces?.[key];
    if (!trace || trace.status === "unsupported" || trace.baseEvidence === "unsupported" || isUnsupported(calculation, key)) {
      add(`${label} 계산 근거가 완전하지 않습니다.`);
    }
    const targets = new Set([key, `flat:${key}`, `tlidb:increase:${key}`, `tlidb:more:${key}`]);
    if ((calculation.effects ?? []).some((effect) => effect.applied === false && targets.has(effect.targetKey)
      && ["unsupported", "unverified"].includes(effect.evidence))) add(`${label}에 미지원 효과가 있습니다.`);
  }
  if (!finiteNonnegative(maximum) || !finiteNonnegative(percent)) add("최대 MP 또는 봉인 비율을 확인할 수 없습니다.");
  const selectedPassives = (build.selections?.skills ?? []).slice(5, 9);
  selectedPassives.forEach((id, index) => {
    if (!id) return;
    const row = calculation.passiveRows?.find((entry) => entry.rowIndex === index + 5 && entry.skillId === id);
    if (row?.sealCalculationSupported !== true) add(`${index + 1}번 패시브의 MP 봉인 계산이 미지원입니다.`);
  });
  const slots = [...(build.skills?.active ?? []), ...(build.skills?.passive ?? [])];
  if (slots.some((slot) => slot?.sealedMana > 0 || slot?.sealedLife > 0)
    || build.skillSeals?.mana > 0 || build.skillSeals?.life > 0) add("수동 봉인 입력·HP 전환의 계산 근거가 미지원입니다.");
  if ((calculation.provenance?.sources ?? []).some((source) => source.applied === false
    && source.inactiveReason === "value-authority-unverified"
    && (UNKNOWN_CONFIGURATION.has(source.id) || (source.id.startsWith("reference:91tob:") && ["talents", "pact"].includes(source.categoryId))))) {
    add("선택 구성에 수치 근거가 확인되지 않은 효과가 있습니다.");
  }
  if (duplicateRows.some((index) => index >= 5)) add("패시브 또는 연결 보조가 중복되어 MP 봉인을 확정할 수 없습니다.");
  const supported = blockers.length === 0;
  const reserved = supported ? round(maximum * percent / 100) : null;
  const available = supported ? round(Math.max(0, maximum - reserved)) : null;
  const over = supported ? percent > 100 : null;
  const rows = (calculation.skillRows ?? []).filter((row) => row.calculationApplicable !== false).map((row) => {
    const cost = row.manaCost?.status === "complete" && finiteNonnegative(row.manaCost.final) && !duplicateRows.includes(row.rowIndex)
      ? row.manaCost.final : null;
    const remaining = supported && cost !== null ? round(available - cost) : null;
    return { rowIndex: row.rowIndex, skillId: row.skillId, cost, remaining,
      status: remaining === null ? "unsupported" : over || remaining < 0 ? "insufficient" : "sufficient",
      receipts: row.manaCost?.receipts ?? [] };
  });
  return { status: supported ? "complete" : "unsupported", maximum: supported ? maximum : null,
    percent: supported ? percent : null, reserved, available, over, blockers, rows,
    sourceUrl: "https://tlidb.com/en/Seal" };
}
