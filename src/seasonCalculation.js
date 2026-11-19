import { findItemById } from "./catalog.js";
import { normalizeBuild } from "./engine.js";
import { parseSeasonSkillMechanics } from "./seasonSkillMechanics.js";
import { evaluateTlidbSkillDamage } from "./tlidbSkillDamageRuntime.js";
import { SS14_DPS_RULES } from "./data/ss14DpsRules.generated.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { inspectSeasonUtilitySkill } from "./seasonUtilitySkills.js";
import { inspectSeasonMinionLevel, seasonMinionProfile } from './seasonMinions.js';
import { inspectSeasonModuleLevel, seasonModuleProfile } from './seasonModules.js';

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
  const minion = season === "SS14" && seasonMinionProfile(itemId, preview);
  const module = season === 'SS14' && seasonModuleProfile(itemId);
  if (minion || module) {
    const minionLevel = minion ? inspectSeasonMinionLevel(minion,level)
      : module.card.sourcePageSha256===locale.sourcePageSha256 ? inspectSeasonModuleLevel(module,level) : null;
    if (!minionLevel) return { ...result, levelUnavailable: true, blockers:["선택한 소환 스킬 레벨의 SS14 원문을 확인하세요."] };
    const mana = /^Mana Cost\n(\d+(?:\.\d+)?)$/mu.exec(locale.detail);
    const castTime = /^Cast Speed\n(\d+(?:\.\d+)?) s$/mu.exec(locale.detail);
    return { ...result, minionLevel, progressionReceipt:minionLevel.receipt, scope:'summon-skill',
      values:{ ...(mana ? {manaCost:Number(mana[1])} : {}), ...(castTime ? {castTime:Number(castTime[1])} : {}) } };
  }
  const utility = season === "SS14" && inspectSeasonUtilitySkill({ id: itemId, tlidbText: { en: locale } }, level);
  if (utility) return { ...result, ...utility, scope: "utility-skill-without-direct-hit-damage" };
  const parsed = parseSeasonSkillMechanics({ id: itemId, categoryId: "skills", tlidbText: { en: locale } }, { season, level });
  result.mechanics = parsed.mechanics;
  result.progressionReceipt = parsed.progressionReceipt ?? null;
  if (parsed.missingAddedDamageEffectiveness) result.missingAddedDamageEffectiveness = true;
  result.scope = "unmodified-skill-at-selected-level";
  if (parsed.blockers.some(b => b.reason === 'ss14-level-row-unavailable')) return { ...result, levelUnavailable: true, blockers: ['선택 레벨의 수치가 없어 스킬 대미지 계산을 보류합니다.'], evidenceBlockers: parsed.blockers };
  for (const [key, stat] of [["manaCost", "mana-cost"], ["castTime", "cast-time"], ["cooldown", "cooldown"]]) {
    if(parsed.blockers.length&&(season!=='SS14'||key!=='manaCost'))continue;
    const effects = parsed.effects.filter((effect) => effect.stat === stat);
    if (effects.length === 1 && Number.isFinite(effects[0].value) && !effects[0].condition
      && (key !== "manaCost" || effects[0].unit === "mana")) result.values[key] = effects[0].value;
  }
  if (!parsed.effects.length || parsed.blockers.length) return { ...result,
    blockers: ["원문에 아직 계산하지 못하는 효과 또는 수치가 있습니다."], evidenceBlockers: parsed.blockers };
  const { weaponHands, ...context } = damageContext;
  const evaluate = weaponDamage => evaluateTlidbSkillDamage({ effects: parsed.effects, level,
    context: { addedDamage: 0, criticalStrikeRating: 0, criticalStrikeDamage: 100,
      enemyArmor: 0, enemyResistances: {}, damageTags: [], target: "self", ...context, weaponDamage,
      ...(parsed.mechanics.some(m => m.kind === "wilting-beam-reaping") ? { reapingEventsPerSecond: 0 } : {}),
      actionRateCap: seasonActionRateCap(season), damageConversion: season === 'SS14' ? 'ss14' : undefined,
      missingAddedDamageEffectiveness: parsed.missingAddedDamageEffectiveness } });
  const evaluations = weaponHands ? weaponHands.map(hand=>evaluate(hand.weaponDamage)) : [evaluate(context.weaponDamage)];
  result.damageCapabilities = { hit: evaluations.every(e=>e.complete) && evaluations.some(e=>e.hit?.average > 0),
    dot: evaluations.every(e=>e.complete) && evaluations.some(e=>e.dot?.dps > 0) };
  const average = read => evaluations.reduce((sum,e)=>sum+read(e),0)/evaluations.length;
  if (evaluations.every(e=>e.complete && Number.isFinite(e.totalDps))) {
    result.values.baseDps = average(e=>e.totalDps);
    if (evaluations.every(e=>Number.isFinite(e.hit?.average))) result.values.averageHit = average(e=>e.hit.average);
  } else {
    result.evidenceBlockers = evaluations.flatMap(e=>e.excluded.filter(entry=>entry.affectsCompletion));
    result.blockers.push(result.evidenceBlockers.some(e=>e.reason==='added-damage-effectiveness-unavailable')
      ? '이 레벨의 추가 대미지 효율을 확인할 수 없습니다.'
      : '스킬 자체 대미지 계산 미지원: 무기·조건·추가 효과 입력이 필요하거나 해석이 미완료입니다.');
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
