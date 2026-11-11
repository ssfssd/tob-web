import { calculateSeasonBuild } from "./seasonBuild.js";
import { normalizeBuild } from "./engine.js";
import { exportSeasonWorkspace } from "./seasonWorkspace.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { WEAPON_FIELDS } from './seasonWeaponInputs.js';
import { getSeasonSelectionRecord } from './seasonSelections.js';

export const SEASON_ADVISOR_METRICS = {
  fullDps: "동일 전투 조건의 전체 DPS",
  life: "최대 HP 참고값", mana: "최대 MP 참고값", shield: "최대 보호막 참고값",
  lifeRegenerationGranted: "HP 자연 회복 기여", shieldRechargePerSecond: "보호막 충전 속도",
  directDps: "첫 액티브 스킬의 직접 효과 DPS",
  expectedHitDps: "첫 액티브 스킬의 속성·크리티컬·더블 대미지 기대 DPS",
  elixirAverageDps: "영약 관측 유지율을 반영한 첫 스킬 부분 DPS",
};
const stable = (value) => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v);
const scenario = (build) => {
  const offense = structuredClone(build.ss14Inputs.offense ?? {}), dps = structuredClone(build.ss14Inputs.dps);
  if (seasonWeaponProfile(build).enabled) {
    for (const [index, id] of normalizeBuild(build).selections.skills.entries()) {
      if (!getSeasonSelectionRecord('skills', id)?.tags?.includes('Attack')) continue;
      delete offense[index];
      for (const key of Object.keys(WEAPON_FIELDS)) if (dps?.skills?.[index]) delete dps.skills[index][key];
    }
  }
  return stable({ hero: build.hero, heroLevel: build.heroLevel,
  character: build.ss14Inputs.character, offense, conditions: build.ss14Inputs.componentConditions,
  blessings: build.ss14Inputs.blessings,
  dps,
  heroCombat: build.ss14Inputs.heroCombat,
  theaCycle: build.ss14Inputs.theaCycle, theaEvents: build.ss14Inputs.theaEvents,
  combat: build.conditions, calculation: build.calculation, seals: build.skillSeals, custom: build.customAffixes });
};

// Build choices (hero, memories, skill identity and base rating) belong to the
// compared build. Only shared encounter assumptions constrain a full-DPS diff.
export function sameSeasonEncounter(left, right) {
  const encounter = build => ({ character:build.ss14Inputs.character, enemy:build.ss14Inputs.dps?.enemy,
    blessings:build.ss14Inputs.blessings, heroCombat:build.ss14Inputs.heroCombat,
    theaCycle:build.ss14Inputs.theaCycle, theaEvents:build.ss14Inputs.theaEvents,
    conditions:build.conditions, calculation:build.calculation });
  if (stable(encounter(left)) !== stable(encounter(right))) return false;
  for (const [index, a] of Object.entries(left.ss14Inputs.dps?.skills ?? {})) {
    const b = right.ss14Inputs.dps?.skills?.[index];
    if (!b) continue;
    for (const key of Object.keys(a)) {
      if (['itemId','sourcePageSha256',...Object.keys(WEAPON_FIELDS)].includes(key)) continue;
      if (Object.hasOwn(b,key) && a[key] !== b[key]) return false;
    }
  }
  // New or removed item conditions have no effect on the other build; a
  // changed shared condition is a different encounter and remains blocked.
  for (const [key,a] of Object.entries(left.ss14Inputs.componentConditions ?? {})) {
    const b=right.ss14Inputs.componentConditions?.[key];
    if (b && a.value !== b.value) return false;
  }
  return true;
}
const metricValue = (report, metric) => metric === "fullDps" ? report.fullDps.dps : metric === "elixirAverageDps" ? report.elixirAverage?.expectedDps : metric === "directDps"
  ? report.coupledSkills.rows.find((r) => r.rowIndex === 0)?.values.dps ?? null : metric === "expectedHitDps"
    ? report.offense.rows.find((r) => r.rowIndex === 0)?.values.expectedDps ?? null : report.character.values[metric];
const unresolved = (report) => stable([
  ...report.componentProjection.rows.filter((r) => r.blockers.length).map((r) =>
    [r.path, r.itemId, r.receipt, r.selectionCount, r.blockers, r.comparisonFingerprint]),
  ...report.components.filter((r) => r.status !== "mapped" && !resolvedTalentReference(report, r)).map((r) => [r.id, r.paths, r.reasons,
    r.calculations?.map((c) => [c.receipt, c.effectBlockers, c.blockers])]),
]);
function resolvedTalentReference(report, component) {
  // Flat talent references may retain their generic "unmapped" label even
  // after the selected board/node is resolved by the SS14 projection.
  if (component.category !== 'talents' || component.calculations?.length) return false;
  const rows = report.componentProjection.rows.filter(r => r.group === 'talents' && r.itemId === component.id);
  return rows.length > 0 && rows.every(r => r.status === 'mapped' && !r.blockers.length && r.receipt?.season === 'SS14');
}
function validationReasons(document, report) {
  const reasons = [];
  reasons.push(...report.blessings.blockers);
  try { exportSeasonWorkspace(document); } catch { reasons.push("SS14 문서 형식 검증 실패"); }
  if (report.componentProjection.allocation.issues.length) reasons.push("배치 오류가 있어 비교에서 제외합니다.");
  const gear = normalizeBuild(document.targetBuild).gear.slots;
  if (gear.some((g, i) => {
    if (!g) return false;
    if (g.corrupted || g.legendaryDraft?.corrodedSlotIds?.length || g.affixText?.trim()) return true;
    const count = Object.keys(g.crafts ?? {}).length;
    const rows = report.componentProjection.rows.filter((r) => r.path.startsWith(`gear.slots.${i}.crafts.`));
    return count && (rows.length !== count || rows.some((r) => r.blockers.length));
  })) {
    reasons.push("제작·침식·사용자 장비 옵션의 SS14 수치가 미확인입니다. 확인한 제작 수치만 부분 지표 비교가 가능하며 획득 확률·비용 추천은 별도 미지원입니다.");
  }
  return reasons;
}

// Compare results already produced by the SS14 engine; editing must not run a
// second simulation or write either document just to display its delta.
export function compareSeasonDpsSnapshots(before, after) {
  const reasons = [];
  for (const [label, snapshot] of [['기준', before], ['현재', after]]) {
    if (!snapshot?.document || !snapshot.report) { reasons.push(`${label} 계산 결과가 없습니다.`); continue; }
    reasons.push(...validationReasons(snapshot.document, snapshot.report).map(r => `${label}: ${r}`));
    if (!snapshot.report.fullDps.supported || !Number.isFinite(snapshot.report.fullDps.dps)) {
      const blockers = snapshot.report.fullDps.blockers ?? [];
      reasons.push(...(blockers.length ? blockers : ['전체 DPS 미지원']).map(r => `${label}: ${r}`));
    }
  }
  if (before?.document && after?.document && before.report && after.report) {
    if (stable(before.document.sourceBuild) !== stable(after.document.sourceBuild)) reasons.push('원래 빌드가 서로 다릅니다.');
    if (!sameSeasonEncounter(before.document.targetBuild, after.document.targetBuild)) reasons.push('전투 조건이 달라 빌드 변경만의 차이를 비교할 수 없습니다.');
  }
  const baseValue = before?.report?.fullDps?.supported ? before.report.fullDps.dps : null;
  const value = after?.report?.fullDps?.supported ? after.report.fullDps.dps : null;
  const supported = reasons.length === 0;
  const delta = supported ? value - baseValue : null;
  return {supported, baseValue, value, delta, percent: supported && baseValue !== 0 ? delta / baseValue * 100 : null,
    reasons: [...new Set(reasons)]};
}

// An explicitly bounded comparison of saved inputs, never a full-build or cost
// optimizer. Unknown changes and different combat scenarios cannot be ranked.
export function recommendSeasonWorkspaces(document, candidates, metric = "life") {
  if (!Object.hasOwn(SEASON_ADVISOR_METRICS, metric)) throw new Error("비교할 SS14 지표를 선택하세요.");
  exportSeasonWorkspace(document);
  const baseline = calculateSeasonBuild(document.targetBuild, { sourceBuild: document.sourceBuild });
  const baseValue = metricValue(baseline, metric);
  const baselineReasons = validationReasons(document, baseline);
  if (!Number.isFinite(baseValue)) baselineReasons.push("기준 문서의 선택 지표가 미지원입니다.");
  const seen = new Set([document.id]);
  const rows = candidates.filter((c) => c.id !== document.id).map((candidate) => {
    const reasons = [...baselineReasons];
    const row = { id: candidate.id, name: candidate.targetBuild?.name ?? "문서 확인 필요", value: null, delta: null, reasons };
    if (seen.has(candidate.id)) reasons.push("중복 후보 문서입니다.");
    seen.add(candidate.id);
    try {
      exportSeasonWorkspace(candidate);
      const report = calculateSeasonBuild(candidate.targetBuild, { sourceBuild: candidate.sourceBuild });
      reasons.push(...validationReasons(candidate, report));
      if (stable(document.sourceBuild) !== stable(candidate.sourceBuild)) reasons.push("최초 SS13 원본이 서로 다릅니다.");
      if (metric === 'fullDps' ? !sameSeasonEncounter(document.targetBuild,candidate.targetBuild)
        : scenario(document.targetBuild) !== scenario(candidate.targetBuild)) reasons.push("기본 속성·전투 조건이 서로 다릅니다.");
      if (metric !== 'fullDps' && unresolved(baseline) !== unresolved(report)) reasons.push("미해석 효과 또는 근거가 달라 우열을 확정할 수 없습니다.");
      if (["directDps", "expectedHitDps", "elixirAverageDps"].includes(metric) && baseline.coupledSkills.rows.find((r) => r.rowIndex === 0)?.id
        !== report.coupledSkills.rows.find((r) => r.rowIndex === 0)?.id) reasons.push("서로 다른 스킬의 직접 DPS는 비교하지 않습니다.");
      row.value = metricValue(report, metric);
      if (!Number.isFinite(row.value)) reasons.push("후보의 선택 지표가 미지원입니다.");
      if (!reasons.length) row.delta = row.value - baseValue;
    } catch { reasons.push("SS14 후보 문서 형식 검증 실패"); }
    return row;
  });
  const eligible = rows.filter((r) => !r.reasons.length).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const best = eligible[0]?.delta > 0 ? eligible.filter((r) => r.value === eligible[0].value).map((r) => r.id) : [];
  return { metric, baseValue, baselineReasons, rows, best, fullBuildSupported: false,
    scope: "saved-ss14-documents-confirmed-subset", gameProbability: null, expectedGameCost: null,
    limitation: "저장된 후보의 확인된 효과만 비교합니다. 미해석 효과가 같아도 전체 성능 우열을 보장하지 않으며 전체 빌드·최적해·제작 기대비용 추천이 아닙니다." };
}
