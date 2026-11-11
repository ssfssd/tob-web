import {
  GEAR_SLOT_KEYS,
  findItemById,
  getGearFilterForSlot,
  getGearItemsForFilter,
} from "./catalog.js";
import {
  calculateBuild,
  hasCompleteCurrentSs13GearCalculation,
  normalizeBuild,
} from "./engine.js";

export const SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES = Object.freeze([2, 3, 4, 5, 6, 7, 8, 9]);

export const GLOBAL_DPS_MARGINAL_PROBES = Object.freeze([
  ["damage-percent", "marginalProbeDamage", "+1% 대미지", "percent"],
  ["attack-cast-speed", "marginalProbeAttackCastSpeed", "+1% 공격 속도", "percent"],
  ["critical-strike-chance", "marginalProbeCriticalChance", "+1% 크리티컬 확률", "percentage-point"],
  ["critical-strike-damage", "marginalProbeCriticalDamage", "+1% 크리티컬 대미지", "percentage-point"],
  ["double-damage-chance", "marginalProbeDoubleDamage", "+1% 이중 대미지 확률", "percentage-point"],
  ["strength", "marginalProbeStrength", "+1 힘", "point"],
  ["dexterity", "marginalProbeDexterity", "+1 민첩", "point"],
  ["intelligence", "marginalProbeIntelligence", "+1 지혜", "point"],
  ["life", "marginalProbeLife", "+1 HP", "point"],
  ["mana", "marginalProbeMana", "+1 MP", "point"],
  ["shield", "marginalProbeShield", "+1 보호막", "point"],
  ["energy", "marginalProbeEnergy", "+1 에너지", "point"],
  ["fire-resistance", "marginalProbeFireResistance", "+1% 화염 저항", "percentage-point"],
  ["cold-resistance", "marginalProbeColdResistance", "+1% 냉기 저항", "percentage-point"],
  ["lightning-resistance", "marginalProbeLightningResistance", "+1% 번개 저항", "percentage-point"],
  ["erosion-resistance", "marginalProbeErosionResistance", "+1% 부식 저항", "percentage-point"],
  ["movement-speed", "marginalProbeMovementSpeed", "+1% 이동 속도", "percent"],
  ["armor", "marginalProbeArmor", "+1 아머", "point"],
  ["evasion", "marginalProbeEvasion", "+1 회피", "point"],
  ["block-chance", "marginalProbeBlockChance", "+1% 막기 확률", "percentage-point"],
  ["damage-reduction", "marginalProbeDamageReduction", "+1% 대미지 감면", "percentage-point"],
  ["life-regeneration", "marginalProbeLifeRegeneration", "+1 1초당 HP 회복", "point"],
].map(([id, labelKey, inputLine, unit]) => Object.freeze({ id, labelKey, inputLine, unit })));

const GLOBAL_DPS_MARGINAL_LIMIT = 20;

const SUPPORTED_SLOT_INDEX_SET = new Set(SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES);

function trimEmptySlots(itemIds) {
  let end = itemIds.length;
  while (end > 0 && !itemIds[end - 1]) end -= 1;
  return itemIds.slice(0, end);
}

function compareItemIds(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function summarizeCalculation(calculation) {
  const summary = calculation.provenance.summary;
  return {
    dps: calculation.summary.dps,
    confidence: summary.confidence,
    unsupportedSourceCount: summary.counts.unsupported,
    inactiveSourceCount: summary.inactiveSources,
    patchMismatch: summary.patchMismatch,
    patchSnapshot: { ...calculation.provenance.patchSnapshot },
  };
}

function createScope(slotIndex, slotKey = "") {
  return {
    slotIndex,
    slotKey,
    maxChanges: 1,
    exhaustive: false,
    evaluatedCandidateCount: 0,
    improvementCandidateCount: 0,
    skippedCandidateCount: 0,
  };
}

function createMarginalScope() {
  return {
    metricKey: "dps",
    resultLimit: GLOBAL_DPS_MARGINAL_LIMIT,
    probeCount: GLOBAL_DPS_MARGINAL_PROBES.length,
    evaluatedProbeCount: 0,
    improvementProbeCount: 0,
    skippedProbeCount: 0,
    exhaustive: false,
  };
}

function createGearSlotMarginalScope(slotIndex, slotKey = "", currentItemId = null) {
  return {
    metricKey: "dps",
    slotIndex,
    slotKey,
    currentItemId,
    maxChanges: 1,
    evaluatedScenarioCount: 0,
    skippedScenarioCount: 0,
  };
}

function hasCompleteSkillRows(calculation) {
  const rows = Array.isArray(calculation.skillRows)
    ? calculation.skillRows.filter((row) => row.calculationApplicable !== false)
    : [];
  return rows.length > 0
    && rows.every((row) => (
      row.calculationSupported === true && Number.isFinite(row.dps)
    ));
}

function withMarginalInput(build, inputLine) {
  const existing = String(build.customAffixes ?? "").trim();
  return normalizeBuild({
    ...build,
    customAffixes: [existing, inputLine].filter(Boolean).join("\n"),
  });
}

export function findGlobalDpsMarginals(build) {
  const normalized = normalizeBuild(build);
  const baselineCalculation = calculateBuild(normalized);
  const baseline = summarizeCalculation(baselineCalculation);
  const scope = createMarginalScope();

  if (!baselineCalculation.skillRows?.length) {
    scope.skippedProbeCount = scope.probeCount;
    return { status: "no-skill", baseline, scope, candidates: [] };
  }
  if (!hasCompleteSkillRows(baselineCalculation)) {
    scope.skippedProbeCount = scope.probeCount;
    return { status: "calculation-coverage-incomplete", baseline, scope, candidates: [] };
  }
  if (!Number.isFinite(baseline.dps)) {
    scope.skippedProbeCount = scope.probeCount;
    return { status: "unevaluable", baseline, scope, candidates: [] };
  }

  const candidates = [];
  for (const probe of GLOBAL_DPS_MARGINAL_PROBES) {
    const calculation = calculateBuild(withMarginalInput(normalized, probe.inputLine));
    const afterDps = calculation.summary.dps;
    if (!hasCompleteSkillRows(calculation) || !Number.isFinite(afterDps)) {
      scope.skippedProbeCount += 1;
      continue;
    }
    const deltaDps = afterDps - baseline.dps;
    if (!Number.isFinite(deltaDps)) {
      scope.skippedProbeCount += 1;
      continue;
    }
    scope.evaluatedProbeCount += 1;
    if (deltaDps > 0) scope.improvementProbeCount += 1;
    candidates.push({
      probeId: probe.id,
      labelKey: probe.labelKey,
      unit: probe.unit,
      inputValue: 1,
      afterDps,
      deltaDps,
      relativeGainPercent: baseline.dps > 0
        ? Math.round((deltaDps / baseline.dps) * 1_000_000) / 10_000
        : null,
    });
  }

  candidates.sort((left, right) => {
    if (left.deltaDps !== right.deltaDps) return right.deltaDps - left.deltaDps;
    return compareItemIds(left.probeId, right.probeId);
  });
  scope.exhaustive = scope.skippedProbeCount === 0;

  if (scope.evaluatedProbeCount === 0) {
    return { status: "calculation-coverage-incomplete", baseline, scope, candidates: [] };
  }
  return {
    status: "ready",
    baseline,
    scope,
    candidates: candidates.slice(0, GLOBAL_DPS_MARGINAL_LIMIT),
  };
}

export function findSkillDpsMarginals(build, target) {
  const normalized = normalizeBuild(build);
  const targetRowIndex = Number(target?.rowIndex);
  const targetSkillId = typeof target?.skillId === "string" ? target.skillId : "";
  const scope = {
    ...createMarginalScope(),
    metricKey: "skill-row-dps",
    rowIndex: targetRowIndex,
    skillId: targetSkillId,
  };
  const baselineCalculation = calculateBuild(normalized);
  const baselineRow = baselineCalculation.skillRows?.find((row) => (
    row.rowIndex === targetRowIndex && row.skillId === targetSkillId
  ));
  const baseline = {
    dps: Number.isFinite(baselineRow?.finalDps) ? baselineRow.finalDps : null,
    rowIndex: targetRowIndex,
    skillId: targetSkillId,
    level: baselineRow?.level ?? null,
  };

  if (!baselineRow) {
    scope.skippedProbeCount = scope.probeCount;
    return { status: "skill-not-found", baseline, scope, candidates: [] };
  }
  if (baselineRow.calculationSupported !== true || !Number.isFinite(baselineRow.finalDps)) {
    scope.skippedProbeCount = scope.probeCount;
    return { status: "calculation-coverage-incomplete", baseline, scope, candidates: [] };
  }

  const candidates = [];
  for (const probe of GLOBAL_DPS_MARGINAL_PROBES) {
    const calculation = calculateBuild(withMarginalInput(normalized, probe.inputLine));
    const afterRow = calculation.skillRows?.find((row) => (
      row.rowIndex === targetRowIndex && row.skillId === targetSkillId
    ));
    const afterDps = afterRow?.finalDps;
    if (afterRow?.calculationSupported !== true || !Number.isFinite(afterDps)) {
      scope.skippedProbeCount += 1;
      continue;
    }
    const deltaDps = afterDps - baselineRow.finalDps;
    if (!Number.isFinite(deltaDps)) {
      scope.skippedProbeCount += 1;
      continue;
    }
    scope.evaluatedProbeCount += 1;
    if (deltaDps > 0) scope.improvementProbeCount += 1;
    candidates.push({
      probeId: probe.id,
      labelKey: probe.labelKey,
      unit: probe.unit,
      inputValue: 1,
      afterDps,
      deltaDps,
      relativeGainPercent: baselineRow.finalDps > 0
        ? Math.round((deltaDps / baselineRow.finalDps) * 1_000_000) / 10_000
        : null,
    });
  }

  candidates.sort((left, right) => {
    if (left.deltaDps !== right.deltaDps) return right.deltaDps - left.deltaDps;
    return compareItemIds(left.probeId, right.probeId);
  });
  scope.exhaustive = scope.skippedProbeCount === 0;

  if (scope.evaluatedProbeCount === 0) {
    return { status: "calculation-coverage-incomplete", baseline, scope, candidates: [] };
  }
  return {
    status: "ready",
    baseline,
    scope,
    candidates: candidates.slice(0, GLOBAL_DPS_MARGINAL_LIMIT),
  };
}

export function findGearSlotDpsMarginal(build, slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || !SUPPORTED_SLOT_INDEX_SET.has(normalizedSlotIndex)) {
    return {
      status: "unsupported-slot",
      baseline: null,
      withoutItem: null,
      scope: createGearSlotMarginalScope(normalizedSlotIndex),
      deltaDps: null,
      relativeContributionPercent: null,
    };
  }

  const normalized = normalizeBuild(build);
  const slotKey = GEAR_SLOT_KEYS[normalizedSlotIndex];
  const currentGear = Array.from(
    { length: GEAR_SLOT_KEYS.length },
    (_, index) => normalized.selections.gear?.[index] ?? null,
  );
  const currentItemId = currentGear[normalizedSlotIndex];
  const scope = createGearSlotMarginalScope(normalizedSlotIndex, slotKey, currentItemId);
  const baselineCalculation = calculateBuild(normalized);
  const baseline = summarizeCalculation(baselineCalculation);
  const blocked = (status, skippedScenarioCount = 0) => {
    scope.skippedScenarioCount = skippedScenarioCount;
    return {
      status,
      baseline,
      withoutItem: null,
      scope,
      deltaDps: null,
      relativeContributionPercent: null,
    };
  };

  if (!currentItemId) return blocked("empty-slot");

  const selectedGearComplete = currentGear
    .filter(Boolean)
    .every((itemId) => hasCompleteCurrentSs13GearCalculation(itemId));
  if (!selectedGearComplete) return blocked("calculation-coverage-incomplete", 1);
  if (!baselineCalculation.skillRows?.length) return blocked("no-skill", 1);
  if (!hasCompleteSkillRows(baselineCalculation)) {
    return blocked("calculation-coverage-incomplete", 1);
  }
  if (!Number.isFinite(baseline.dps)) return blocked("unevaluable", 1);

  const nextGear = [...currentGear];
  nextGear[normalizedSlotIndex] = null;
  const nextBuild = normalizeBuild({
    ...normalized,
    selections: {
      ...normalized.selections,
      gear: trimEmptySlots(nextGear),
    },
  });
  const withoutItemCalculation = calculateBuild(nextBuild);
  if (!hasCompleteSkillRows(withoutItemCalculation)) {
    return blocked("calculation-coverage-incomplete", 1);
  }
  const withoutItem = summarizeCalculation(withoutItemCalculation);
  if (!Number.isFinite(withoutItem.dps)) return blocked("unevaluable", 1);

  const deltaDps = baseline.dps - withoutItem.dps;
  if (!Number.isFinite(deltaDps)) return blocked("unevaluable", 1);
  scope.evaluatedScenarioCount = 1;
  return {
    status: "ready",
    baseline,
    withoutItem,
    scope,
    deltaDps,
    relativeContributionPercent: baseline.dps > 0
      ? Math.round((deltaDps / baseline.dps) * 1_000_000) / 10_000
      : null,
  };
}

export function findGearSlotUpgrades(build, slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || !SUPPORTED_SLOT_INDEX_SET.has(normalizedSlotIndex)) {
    return {
      status: "unsupported-slot",
      baseline: null,
      scope: createScope(normalizedSlotIndex),
      candidates: [],
    };
  }

  const normalized = normalizeBuild(build);
  const baselineCalculation = calculateBuild(normalized);
  const baseline = summarizeCalculation(baselineCalculation);
  const slotKey = GEAR_SLOT_KEYS[normalizedSlotIndex];
  const scope = createScope(normalizedSlotIndex, slotKey);

  const currentGear = Array.from(
    { length: GEAR_SLOT_KEYS.length },
    (_, index) => normalized.selections.gear?.[index] ?? null,
  );
  const currentItemId = currentGear[normalizedSlotIndex];
  const selectedElsewhere = new Set(
    currentGear.filter((itemId, index) => index !== normalizedSlotIndex && itemId),
  );
  const filter = getGearFilterForSlot(slotKey);
  const eligibleItems = getGearItemsForFilter(filter).filter(
    (item) => item.id !== currentItemId && !selectedElsewhere.has(item.id),
  );
  const candidates = [];

  const currentItem = currentItemId ? findItemById(currentItemId) : null;
  if (currentItem && !hasCompleteCurrentSs13GearCalculation(currentItem.id)) {
    scope.skippedCandidateCount = eligibleItems.length;
    return {
      status: "calculation-coverage-incomplete",
      baseline,
      scope,
      candidates,
    };
  }

  if (!Number.isFinite(baseline.dps)) {
    return {
      status: "unevaluable",
      baseline,
      scope,
      candidates: [],
    };
  }

  for (const item of eligibleItems) {
    if (!hasCompleteCurrentSs13GearCalculation(item.id)) {
      scope.skippedCandidateCount += 1;
      continue;
    }
    const nextGear = [...currentGear];
    nextGear[normalizedSlotIndex] = item.id;
    const nextBuild = normalizeBuild({
      ...normalized,
      selections: {
        ...normalized.selections,
        gear: trimEmptySlots(nextGear),
      },
    });
    const nextCalculation = calculateBuild(nextBuild);
    const afterDps = nextCalculation.summary.dps;
    const deltaDps = afterDps - baseline.dps;
    scope.evaluatedCandidateCount += 1;

    if (!Number.isFinite(afterDps) || !Number.isFinite(deltaDps)) {
      scope.skippedCandidateCount += 1;
      continue;
    }
    if (deltaDps <= 0) continue;

    const calculationSummary = summarizeCalculation(nextCalculation);
    candidates.push({
      itemId: item.id,
      nextBuild,
      afterDps,
      deltaDps,
      confidence: calculationSummary.confidence,
      unsupportedSourceCount: calculationSummary.unsupportedSourceCount,
      inactiveSourceCount: calculationSummary.inactiveSourceCount,
      patchMismatch: calculationSummary.patchMismatch,
    });
  }

  candidates.sort((left, right) => {
    if (left.deltaDps !== right.deltaDps) return right.deltaDps - left.deltaDps;
    return compareItemIds(left.itemId, right.itemId);
  });
  scope.improvementCandidateCount = candidates.length;
  scope.exhaustive = scope.skippedCandidateCount === 0;

  if (scope.evaluatedCandidateCount === 0 && scope.skippedCandidateCount > 0) {
    return {
      status: "calculation-coverage-incomplete",
      baseline,
      scope,
      candidates,
    };
  }

  return {
    status: "ready",
    baseline,
    scope,
    candidates,
  };
}
