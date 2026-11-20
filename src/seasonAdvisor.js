import { calculateSeasonBuild } from "./seasonBuild.js";
import { ASSUMED_DPS_IGNORED_DEFENSE_FIELDS, SEASON_UPTIME_INPUTS, calculateEditorSeasonBuild } from './seasonAssumedDps.js';
import { normalizeBuild } from "./engine.js";
import { exportSeasonWorkspace } from "./seasonWorkspace.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { ADDED_FIELDS, WEAPON_FIELDS } from './seasonWeaponInputs.js';
import { getSeasonSelectionRecord } from './seasonSelections.js';
import { boundSeasonConditionGroups, exclusiveResourceStates, incompatibleNearbyEnemyStates } from './seasonEffectConditions.js';
import { isAuraActivationControl } from './seasonNetherModifiers.js';
import { theaCombatEnabled, theaCombatInputValues, theaCombatKeys } from './seasonTheaCombatInputs.js';
import { hasPeriodicBurstSupport, readPeriodicBurstUptime } from './seasonSkillInputs.js';
import { theaElixirTimingKeys } from './seasonTheaEvents.js';
import { isThea } from './seasonTheaRevelation.js';
import { observedSkillCostFields } from './seasonDps.js';

export const SEASON_ADVISOR_METRICS = {
  fullDps: "동일 전투 조건의 전체 DPS",
  assumedDps: "방어 전 DPS",
  life: "최대 HP 참고값", mana: "최대 MP 참고값", shield: "최대 보호막 참고값",
  lifeRegenerationGranted: "HP 자연 회복 기여", shieldRechargePerSecond: "보호막 충전 속도",
  directDps: "첫 액티브 스킬의 직접 효과 DPS",
  expectedHitDps: "첫 액티브 스킬의 속성·크리티컬·더블 대미지 기대 DPS",
  elixirAverageDps: "영약 관측 유지율을 반영한 첫 스킬 부분 DPS",
};
export function preferredSeasonDpsMetric(report) {
  return !report.fullDps.supported && report.assumedDps?.supported ? 'assumedDps' : 'fullDps';
}
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

function extensionEncounterValues(build, report) {
  const entries = new Map();
  for (const row of report?.componentProjection?.rows ?? []) for (const control of row.extensionControls ?? []) {
    const {key, value} = control;
    if (value === '' || !/^(?:module:|elixir:|ingredient:.*:(?:minion|rate)$)/u.test(key)) continue;
    const presence = /^module:([0-4]):active$/u.exec(key);
    const owner = presence ? build.skills?.active?.[Number(presence[1])]?.skillId : `${row.path}:${row.itemId}`;
    entries.set(`${key}:${owner}:${control.sourcePageSha256}`, control);
  }
  return entries;
}

export function seasonExtensionEncounterChanges(left, right, leftReport, rightReport) {
  const current=extensionEncounterValues(right,rightReport);
  return [...extensionEncounterValues(left,leftReport)].flatMap(([identity,old])=>{
    const control=current.get(identity);
    return control && old.value!==control.value ? [{control,a:old.value,b:control.value}] : [];
  });
}

export function sameObservedSkillCostBasis(before, after, index, metric) {
  const observation = report => (report?.[metric] ?? report?.fullDps)?.rows?.find(row=>row.rowIndex===index)?.castCostObservation;
  const a=observation(before), b=observation(after);
  return a?.status==='applied' && b?.status==='applied' && a.basis===b.basis;
}

const independentTheaElixirTiming = (left, right) => [0, 1].flatMap(index => {
  const old = left.skills?.elixirs?.[index]?.skillId;
  return old && old === right.skills?.elixirs?.[index]?.skillId ? [] : theaElixirTimingKeys(index);
});

export function seasonTheaEncounterChanges(left, right, leftReport, rightReport, metric) {
  const relevantKeys = (build, report) => {
    const mechanics = report.componentProjection.rows.flatMap(row => row.mechanics ?? []);
    return new Set([...theaCombatKeys(build, mechanics, report),
      ...mechanics.filter(m => m.kind === 'thea-event-input').map(m => m.key)]);
  };
  const oldKeys = relevantKeys(left, leftReport), newKeys = relevantKeys(right, rightReport);
  const a = { ...theaCombatInputValues(left, leftReport), combatMode: Number(theaCombatEnabled(left)) };
  const b = { ...theaCombatInputValues(right, rightReport), combatMode: Number(theaCombatEnabled(right)) };
  const independentElixirTiming = independentTheaElixirTiming(left, right);
  // Retained inputs matter only while both builds actually use the effect.
  const shared = [...newKeys].filter(key => key !== 'combatMode' && oldKeys.has(key) && !independentElixirTiming.includes(key)
    && !(metric === 'assumedDps' && key === 'scorchResistance'));
  return ['combatMode', ...shared].flatMap(key => a[key] === b[key] ? [] : [{ key, a: a[key], b: b[key] }]);
}

export function seasonSharedSkillInputChanges(before, after, singleSkill) {
  return [['hitChance',100],['useShare',singleSkill?100:undefined]].flatMap(([key,fallback])=>{
    const a=before[key]??fallback, b=after[key]??fallback;
    return a===b ? [] : [{key,a,b}];
  });
}

const skillSlotId = (build,index) => (index<5 ? build.skills?.active?.[index] : build.skills?.passive?.[index-5])?.skillId;
const usesTimedCombat = build => theaCombatEnabled(build) && build.ss14Inputs.theaCycle?.mode==='automatic';
const dedicatedSkillInputs = new Set(['itemId','sourcePageSha256','hitChance','useShare','dotWindows','fissureTimes',
  'channelCostTimes','periodicBurstUptime','observedSkillCostBasis','moonBaseManaCostBasis',...Object.keys(WEAPON_FIELDS)]);

export function seasonSlotObservationChanges(left,right,leftReport,rightReport,index,metric) {
  const a=left.ss14Inputs.dps?.skills?.[index]??{}, b=right.ss14Inputs.dps?.skills?.[index]??{};
  const id=a.itemId??skillSlotId(left,index);
  if (!id || id!==(b.itemId??skillSlotId(right,index))) return [];
  const sameSource=!a.itemId||!b.itemId||a.sourcePageSha256===b.sourcePageSha256;
  const timed=usesTimedCombat(left);
  const compareObservedCosts=sameSource&&sameObservedSkillCostBasis(leftReport,rightReport,index,metric);
  const leftSchedule=timed?seasonTimedSkillInputs(leftReport,index,metric):{};
  const rightSchedule=timed?seasonTimedSkillInputs(rightReport,index,metric):{};
  return Object.keys(a).flatMap(key=>{
    if (dedicatedSkillInputs.has(key)||!Object.hasOwn(b,key)||a[key]===b[key]) return [];
    if (!compareObservedCosts&&observedSkillCostFields.includes(key)) return [];
    if (key==='moonBaseManaCost'&&(!sameSource||!Number.isFinite(a.moonBaseManaCostBasis)
      ||a.moonBaseManaCostBasis!==b.moonBaseManaCostBasis||a.moonBaseManaCostBasis!==leftReport?.character?.values?.mana
      ||b.moonBaseManaCostBasis!==rightReport?.character?.values?.mana)) return [];
    if (sameSource&&(SEASON_UPTIME_INPUTS.includes(key)||Object.hasOwn(ADDED_FIELDS,key))) return [];
    if (timed&&key==='fissureHits'||sameSource&&leftSchedule.channelCostTimes&&rightSchedule.channelCostTimes&&key==='channelCostRate') return [];
    if (sameSource&&leftSchedule.reapingTimes&&rightSchedule.reapingTimes&&['reapingTimes','reapingRate','reapingMode'].includes(key)) return [];
    return [{key,a:a[key],b:b[key]}];
  });
}

// Build choices (hero, memories, skill identity and base rating) belong to the
// compared build. Only shared encounter assumptions constrain a full-DPS diff.
export function sameSeasonEncounter(left, right, leftReport, rightReport, metric = 'fullDps') {
  const target = build => {
    const enemy=build.ss14Inputs.dps?.enemy;
    return metric==='assumedDps' ? Object.fromEntries(Object.entries(enemy??{}).filter(([key])=>
      !ASSUMED_DPS_IGNORED_DEFENSE_FIELDS.includes(key))) : enemy;
  };
  const independentElixirTiming = independentTheaElixirTiming(left, right);
  const compareTheaEvents = isThea(left) && isThea(right) && leftReport && rightReport;
  const encounter = build => ({ character:Object.fromEntries(
    Object.entries(build.ss14Inputs.character??{}).filter(([key])=>key!=='observedManaRecovery')), enemy:target(build),
    blessings:build.ss14Inputs.blessings, heroCombat:build.ss14Inputs.heroCombat,
    theaCycle:build.ss14Inputs.theaCycle, theaEvents:compareTheaEvents ? undefined : Object.fromEntries(
      Object.entries(build.ss14Inputs.theaEvents??{}).filter(([key])=>!independentElixirTiming.includes(key)
        && !(metric==='assumedDps'&&key==='scorchResistance'))),
    conditions:build.conditions, calculation:build.calculation });
  if (stable(encounter(left)) !== stable(encounter(right))) return false;
  if (compareTheaEvents && seasonTheaEncounterChanges(left, right, leftReport, rightReport, metric).length) return false;
  const leftBurst=readPeriodicBurstUptime(left.ss14Inputs.dps),rightBurst=readPeriodicBurstUptime(right.ss14Inputs.dps);
  if(metric!=='assumedDps'&&leftBurst!==undefined&&rightBurst!==undefined&&leftBurst!==rightBurst
    && hasPeriodicBurstSupport(leftReport?.components)&&hasPeriodicBurstSupport(rightReport?.components))return false;
  const leftInputs = left.ss14Inputs.dps?.skills ?? {}, rightInputs = right.ss14Inputs.dps?.skills ?? {};
  const timed = usesTimedCombat(left);
  const singleSkill = leftReport?.coupledSkills?.rows.length === 1 && rightReport?.coupledSkills?.rows.length === 1;
  for (const index of new Set([...Object.keys(leftInputs), ...Object.keys(rightInputs)])) {
    const a = leftInputs[index] ?? {}, b = rightInputs[index] ?? {};
    const leftId = a.itemId ?? skillSlotId(left, Number(index)), rightId = b.itemId ?? skillSlotId(right, Number(index));
    if (leftId && rightId && seasonSharedSkillInputChanges(a,b,singleSkill).length) return false;
    // Replacement requires its own source-bound observations, including cast rate.
    if (leftId!==rightId) continue;
    const sameSkill = leftId && (!a.itemId || !b.itemId || a.sourcePageSha256 === b.sourcePageSha256);
    // An absent optional flat-damage input supplies no damage. Entering a
    // positive value on the same skill changes the encounter assumption.
    if (sameSkill && Object.keys(ADDED_FIELDS).some(key => (a[key] ?? 0) !== (b[key] ?? 0))) return false;
    const leftSchedule=timed?seasonTimedSkillInputs(leftReport,Number(index),metric):{};
    const rightSchedule=timed?seasonTimedSkillInputs(rightReport,Number(index),metric):{};
    if (sameSkill&&timed&&stable(leftSchedule)!==stable(rightSchedule)) return false;
    if (sameSkill&&seasonUptimeInputChanges(left,right,leftReport,rightReport,Number(index),metric).length) return false;
    if (seasonSlotObservationChanges(left,right,leftReport,rightReport,Number(index),metric).length) return false;
  }
  // A shared manual state can move between item or board sources. An
  // automatic state follows the gear and is part of the build change.
  const encounterCondition=(row,control)=>!isAuraActivationControl(row,control);
  const leftConditions = boundSeasonConditionGroups(leftReport?.componentProjection, left.ss14Inputs.componentConditions,encounterCondition);
  const rightConditions = boundSeasonConditionGroups(rightReport?.componentProjection, right.ss14Inputs.componentConditions,encounterCondition);
  for (const [group, a] of leftConditions) {
    const b = rightConditions.get(group);
    if (b && (a.size !== b.size || [...a].some(value => !b.has(value)))) return false;
  }
  if (exclusiveResourceStates.some(([low,full]) => (leftConditions.get(low)?.has(1) && rightConditions.get(full)?.has(1))
    || (rightConditions.get(low)?.has(1) && leftConditions.get(full)?.has(1)))) return false;
  if (incompatibleNearbyEnemyStates(leftConditions,rightConditions)) return false;
  for (const [key, a] of Object.entries(left.ss14Inputs.supports ?? {})) {
    const b = right.ss14Inputs.supports?.[key];
    if (!b || a.itemId !== b.itemId || a.sourcePageSha256 !== b.sourcePageSha256) continue;
    for (const [condition, value] of Object.entries(a.conditions ?? {})) {
      if (Object.hasOwn(b.conditions ?? {}, condition) && value !== b.conditions[condition]) return false;
    }
  }
  return !seasonExtensionEncounterChanges(left,right,leftReport,rightReport).length;
}
export function seasonTimedSkillInputs(report, index, metric) {
  const row=report?.fullDps?.rows?.find(r=>r.rowIndex===index);
  const reaping=(report?.[metric]?.rows??report?.fullDps?.rows)?.find(r=>r.rowIndex===index)?.reaping;
  return {dotWindows:row?.dotWindows, fissureTimes:row?.fissure?.times,
    channelCostTimes:row?.channelCost?.times??(row?.channelCost?.rate===0?[]:undefined), reapingTimes:reaping?.times};
}
export function seasonUptimeInputChanges(left,right,leftReport,rightReport,index,metric) {
  const read=(build,report)=>metric==='assumedDps'&&report?.assumedDps?.uptimeInputs
    ? report.assumedDps.uptimeInputs[index]??{} : build.ss14Inputs.dps?.skills?.[index]??{};
  const a=read(left,leftReport), b=read(right,rightReport);
  const timed=theaCombatEnabled(left)&&left.ss14Inputs.theaCycle?.mode==='automatic';
  const windowed=timed&&seasonTimedSkillInputs(leftReport,index,metric).dotWindows&&seasonTimedSkillInputs(rightReport,index,metric).dotWindows;
  return SEASON_UPTIME_INPUTS.flatMap(key=>{
    if ((windowed&&(key==='dotUptime'||key==='permafrostUptime')) || (timed&&key==='reapingOverlap')) return [];
    return Number.isFinite(a[key])&&Number.isFinite(b[key])&&a[key]!==b[key]?[{key,a:a[key],b:b[key]}]:[];
  });
}
const metricValue = (report, metric) => metric === "fullDps" || metric === 'assumedDps' ? report[metric]?.dps ?? null : metric === "elixirAverageDps" ? report.elixirAverage?.expectedDps : metric === "directDps"
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
export function compareSeasonDpsSnapshots(before, after, metric = 'fullDps') {
  const reasons = [];
  let encounterMatches = null;
  const labelForMetric = metric === 'assumedDps' ? '방어 전 DPS' : '전체 DPS';
  for (const [label, snapshot] of [['기준', before], ['현재', after]]) {
    if (!snapshot?.document || !snapshot.report) { reasons.push(`${label} 계산 결과가 없습니다.`); continue; }
    reasons.push(...validationReasons(snapshot.document, snapshot.report).map(r => `${label}: ${r}`));
    const result = snapshot.report[metric];
    if (!result?.supported || !Number.isFinite(result.dps)) {
      const blockers = result?.blockers ?? [];
      reasons.push(...(blockers.length ? blockers : [labelForMetric+' 미지원']).map(r => `${label}: ${r}`));
    }
  }
  if (before?.document && after?.document && before.report && after.report) {
    if (stable(before.document.sourceBuild) !== stable(after.document.sourceBuild)) reasons.push('원래 빌드가 서로 다릅니다.');
    encounterMatches = sameSeasonEncounter(before.document.targetBuild, after.document.targetBuild, before.report, after.report, metric);
    if (!encounterMatches) reasons.push('전투 조건이 달라 빌드 변경만의 차이를 비교할 수 없습니다.');
  }
  const baseValue = before?.report?.[metric]?.supported ? before.report[metric].dps : null;
  const value = after?.report?.[metric]?.supported ? after.report[metric].dps : null;
  const supported = reasons.length === 0;
  const delta = supported ? value - baseValue : null;
  return {supported, encounterMatches, baseValue, value, delta, percent: supported && baseValue !== 0 ? delta / baseValue * 100 : null,
    reasons: [...new Set(reasons)]};
}

// An explicitly bounded comparison of saved inputs, never a full-build or cost
// optimizer. Unknown changes and different combat scenarios cannot be ranked.
export function recommendSeasonWorkspaces(document, candidates, metric = "life", { baselineReport, describeDpsChange, describeEncounterChanges } = {}) {
  if (!Object.hasOwn(SEASON_ADVISOR_METRICS, metric)) throw new Error("비교할 SS14 지표를 선택하세요.");
  exportSeasonWorkspace(document);
  const dpsMetric = metric === 'fullDps' || metric === 'assumedDps';
  const calculate = metric === 'assumedDps' || dpsMetric && describeDpsChange ? calculateEditorSeasonBuild : calculateSeasonBuild;
  const baseline = baselineReport ?? calculate(document.targetBuild, { sourceBuild: document.sourceBuild });
  const baseValue = metricValue(baseline, metric);
  const baselineReasons = validationReasons(document, baseline);
  if (!Number.isFinite(baseValue)) baselineReasons.push("기준 문서의 선택 지표가 미지원입니다.");
  const seen = new Set([document.id]);
  const rows = candidates.filter((c) => c.id !== document.id).map((candidate) => {
    const reasons = [...baselineReasons];
    const row = { id: candidate.id, name: candidate.targetBuild?.name ?? "문서 확인 필요", value: null, delta: null, reasons };
    if (seen.has(candidate.id)) reasons.push("중복 후보 문서입니다.");
    seen.add(candidate.id);
    let report;
    try {
      exportSeasonWorkspace(candidate);
      report = calculate(candidate.targetBuild, { sourceBuild: candidate.sourceBuild });
      reasons.push(...validationReasons(candidate, report));
      if (stable(document.sourceBuild) !== stable(candidate.sourceBuild)) reasons.push("최초 SS13 원본이 서로 다릅니다.");
      if (dpsMetric ? !sameSeasonEncounter(document.targetBuild,candidate.targetBuild,baseline,report,metric)
        : scenario(document.targetBuild) !== scenario(candidate.targetBuild)) {
        reasons.push("기본 속성·전투 조건이 서로 다릅니다.");
        if (dpsMetric && describeEncounterChanges) row.encounterChanges=describeEncounterChanges(
          {document,report:baseline},{document:candidate,report},metric);
      }
      if (!dpsMetric && unresolved(baseline) !== unresolved(report)) reasons.push("미해석 효과 또는 근거가 달라 우열을 확정할 수 없습니다.");
      if (["directDps", "expectedHitDps", "elixirAverageDps"].includes(metric) && baseline.coupledSkills.rows.find((r) => r.rowIndex === 0)?.id
        !== report.coupledSkills.rows.find((r) => r.rowIndex === 0)?.id) reasons.push("서로 다른 스킬의 직접 DPS는 비교하지 않습니다.");
      row.value = metricValue(report, metric);
      if (!Number.isFinite(row.value)) reasons.push("후보의 선택 지표가 미지원입니다.");
    } catch { reasons.push("SS14 후보 문서 형식 검증 실패"); }
    if (!reasons.length) {
      row.delta = row.value - baseValue;
      if (dpsMetric && describeDpsChange) row.changes=describeDpsChange(baseline,report,metric);
    }
    return row;
  });
  const eligible = rows.filter((r) => !r.reasons.length).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const best = eligible[0]?.delta > 0 ? eligible.filter((r) => r.value === eligible[0].value).map((r) => r.id) : [];
  return { metric, baseValue, baselineReasons, rows, best, fullBuildSupported: false,
    scope: "saved-ss14-documents-confirmed-subset", gameProbability: null, expectedGameCost: null,
    limitation: "저장된 후보의 확인된 효과만 비교합니다. 미해석 효과가 같아도 전체 성능 우열을 보장하지 않으며 전체 빌드·최적해·제작 기대비용 추천이 아닙니다." };
}
