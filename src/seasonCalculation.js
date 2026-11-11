import { findItemById } from "./catalog.js";
import { normalizeBuild } from "./engine.js";
import { parseSeasonSkillMechanics } from "./seasonSkillMechanics.js";
import { evaluateTlidbSkillDamage } from "./tlidbSkillDamageRuntime.js";
import { SS14_DPS_RULES } from "./data/ss14DpsRules.generated.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { inspectSeasonUtilitySkill } from "./seasonUtilitySkills.js";

export function seasonActionRateCap(season) {
  if (season !== 'SS14') return undefined;
  const page = SS14_DPS_RULES.pages['en/Character_Build'];
  return page?.season === 'SS14'
    && page.body.includes('Attack Speed is capped at 30 attacks per second.')
    && page.body.includes('Cast Speed is capped at 30 spells per second.') ? 30 : NaN;
}

const labels = { averageHit: "스킬 자체 평균 적중", baseDps: "스킬 자체 DPS (크리티컬 제외)", manaCost: "기본 MP 소모", castTime: "기본 시전 시간", cooldown: "기본 쿨타임" };
const round = (value) => Math.round(value * 1000) / 1000;

// This kernel consumes the requested season's own immutable card. It does not
// invoke calculateBuild, relabel SS13 outputs, or inherit SS13 profile values.
export function calculateSeasonSkill(itemId, level, season, { preview = SS14_CARDS_EN, damageContext = {} } = {}) {
  const item = findItemById(itemId);
  const record = preview.records?.[itemId];
  const locale = season === "SS13" ? item?.tlidbText?.en
    : season === "SS14" && record?.status === "collected-preview" && record.season === season
      ? { ...record, sourcePageVersion: record.season, sourceFieldStatus: { detail: "exact" } } : null;
  const result = { itemId, level, season, engine: `tlidb-${season?.toLowerCase()}-skill-card-v1`,
    scope: "unmodified-level-20-skill", values: {}, blockers: [], receipt: locale ? {
      sourceUrl: locale.sourceUrl, sourceRecordKey: locale.sourceRecordKey,
      sourcePageVersion: locale.sourcePageVersion, sourcePageSha256: locale.sourcePageSha256,
    } : null };
  if (season !== "SS14" && level !== 20) return { ...result, blockers: ["해당 시즌의 레벨별 수치 표 미확보: 현재 20레벨 카드만 계산합니다."] };
  if (!locale || locale.sourceRecordKey !== item?.tlidbText?.en?.sourceRecordKey) {
    return { ...result, blockers: ["동일 항목의 해당 시즌 계산 원문을 확보하지 못했습니다."] };
  }
  const utility = season === "SS14" && inspectSeasonUtilitySkill({ id: itemId, tlidbText: { en: locale } }, level);
  if (utility) return { ...result, ...utility, scope: "utility-skill-without-direct-hit-damage" };
  const parsed = parseSeasonSkillMechanics({ id: itemId, categoryId: "skills", tlidbText: { en: locale } }, { season, level });
  result.mechanics = parsed.mechanics;
  result.progressionReceipt = parsed.progressionReceipt ?? null;
  result.scope = "unmodified-skill-at-selected-level";
  if (parsed.blockers.some(b => b.reason === 'ss14-level-row-unavailable')) return { ...result, blockers: ['선택 레벨의 수치가 없어 확인된 20레벨 카드만 계산합니다.'], evidenceBlockers: parsed.blockers };
  if (!parsed.effects.length || parsed.blockers.length) return { ...result,
    blockers: ["원문에 아직 계산하지 못하는 효과 또는 수치가 있습니다."], evidenceBlockers: parsed.blockers };
  for (const [key, stat] of [["manaCost", "mana-cost"], ["castTime", "cast-time"], ["cooldown", "cooldown"]]) {
    const effects = parsed.effects.filter((effect) => effect.stat === stat);
    if (effects.length === 1 && Number.isFinite(effects[0].value) && !effects[0].condition
      && (key !== "manaCost" || effects[0].unit === "mana")) result.values[key] = effects[0].value;
  }
  const evaluation = evaluateTlidbSkillDamage({ effects: parsed.effects, level,
    context: { addedDamage: 0, criticalStrikeRating: 0, criticalStrikeDamage: 100,
      enemyArmor: 0, enemyResistances: {}, damageTags: [], target: "self", ...damageContext,
      actionRateCap: seasonActionRateCap(season) } });
  result.damageCapabilities = { hit: evaluation.complete && evaluation.hit?.average > 0,
    dot: evaluation.complete && evaluation.dot?.dps > 0 };
  if (evaluation.complete && Number.isFinite(evaluation.totalDps)) {
    result.values.baseDps = evaluation.totalDps;
    if (Number.isFinite(evaluation.hit?.average)) result.values.averageHit = evaluation.hit.average;
  } else {
    result.blockers.push("스킬 자체 대미지 계산 미지원: 무기·조건·추가 효과 입력이 필요하거나 해석이 미완료입니다.");
    result.evidenceBlockers = evaluation.excluded.filter((entry) => entry.affectsCompletion);
  }
  return result;
}

export function compareSeasonSkillValues(build, options = {}) {
  const normalized = normalizeBuild(build);
  const rows = normalized.selections.skills.flatMap((id, rowIndex) => {
    if (!id) return [];
    const item = findItemById(id);
    const level = normalized.skillLevels[rowIndex];
    const before = calculateSeasonSkill(id, level, "SS13", options);
    const after = calculateSeasonSkill(id, level, "SS14", options);
    const name = item?.tlidbText?.ko?.name;
    return [{ id, rowIndex, level, name: name && !/\p{Script=Han}/u.test(name) ? name : "한국어 이름 미제공", before, after,
      metrics: Object.entries(labels).map(([key, label]) => {
        const supported = normalized.patchSnapshot.season === "SS13"
          && Number.isFinite(before.values[key]) && Number.isFinite(after.values[key]);
        return { key, label, supported, before: supported ? round(before.values[key]) : null,
          after: supported ? round(after.values[key]) : null,
          delta: supported ? round(after.values[key] - before.values[key]) : null };
      }) }];
  });
  return { schemaVersion: 1, sourceSeason: normalized.patchSnapshot.season, targetSeason: "SS14",
    scope: "selected-skills-without-build-modifiers", fullBuildSupported: false, rows,
    sourceGeneratedAt: (options.preview ?? SS14_CARDS_EN).generatedAt,
    limitations: ["스킬 자체의 20레벨 수치 비교입니다. 장비·제작·침식·보조·히어로·재능·전투 조건은 이 표에 적용하지 않습니다.",
      "빌드 전체 SS14 DPS·HP·MP·보호막은 아직 미지원입니다. 구성 이전·저장은 별도 SS14 문서에서 지원하며, 아래 숫자는 전체 성능 변화가 아닙니다."] };
}

export function saveSeasonComparison(storage, build, report, now = new Date()) {
  const snapshot = { schemaVersion: 1, savedAt: now.toISOString(), build: structuredClone(build), report: structuredClone(report) };
  storage.setItem("tob.season-comparison.v1", JSON.stringify(snapshot));
  return snapshot;
}

export function loadSeasonComparison(storage) {
  try {
    const snapshot = JSON.parse(storage.getItem("tob.season-comparison.v1"));
    if (snapshot?.schemaVersion !== 1 || !snapshot.build || !Array.isArray(snapshot.report?.rows)
      || snapshot.report?.scope !== "selected-skills-without-build-modifiers"
      || !Array.isArray(snapshot.report.limitations)
      || !snapshot.report.rows.every((row) => Array.isArray(row?.metrics)
        && row.metrics.every((metric) => metric && typeof metric.label === "string"
          && typeof metric.supported === "boolean"
          && (!metric.supported || [metric.before, metric.after, metric.delta].every(Number.isFinite)))
        && [row.before, row.after].every((side) => side && Array.isArray(side.blockers)
          && (!side.receipt || /^https:\/\/tlidb\.com\/(?:en|ko)\//u.test(side.receipt.sourceUrl))))
      || !Number.isFinite(Date.parse(snapshot.savedAt))) return null;
    return snapshot;
  } catch { return null; }
}
