import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import { SS14_THEA_EFFECTS } from "./data/ss14TheaEffects.generated.js";
import { SS14_UTILITY_LEVELS } from "./data/ss14UtilityLevels.generated.js";
import "./seasonCurrentDatabase.js";
import { SEASON_GEAR_LEVEL_STATS, validSeasonGearEffects } from './seasonGearEffects.js';

const growth = SS14_THEA_EFFECTS.levelGrowth;
const overlevelSource = 'SS14 스킬 초과 레벨 별도 대미지';
const effectivenessLine = /^Effectiveness of added damage ([\d.]+)%\n/u;
const effectivenessLines = /^(?:Effectiveness of added damage [\d.]+%\n)+/u;
export function seasonOverlevelDamageMultiplier(level) {
  return (1 + growth.firstTierMore / 100) ** Math.max(0, Math.min(growth.firstTierEnd, level) - growth.baseCap)
    * (1 + growth.laterMore / 100) ** Math.max(0, level - growth.firstTierEnd);
}

// Resolve a whole, explicit progression row before parsing effects. Never
// interpolate damage ranges or replace a changed affix with its level-20 value.
export function resolveSeasonSkillLevel(item, level) {
  const locale = item?.tlidbText?.en;
  const utility = SS14_UTILITY_LEVELS[item?.id];
  const table = utility ?? SS14_LOG_COMPLETION.levels[item?.id];
  const displayedLevel = locale?.cardLevel ?? 20;
  if (level === displayedLevel && !table) return { item, parserLevel: 20, blockers: [] };
  const overflow = !utility && item?.categoryId === 'skills' && displayedLevel === growth.baseCap && level > growth.baseCap;
  const row = table?.rows.find(row => Number(row[0]) === (overflow ? Math.min(40, level) : level));
  const fail = () => ({ item, parserLevel: level, blockers: [{ reason: "ss14-level-row-unavailable",
    sourceText: `SS14 ${level}레벨의 정확한 스킬 수치가 필요합니다.` }] });
  if (!Number.isInteger(level) || level < 1 || level > 100 || locale?.sourcePageVersion !== "SS14" || table?.season !== "SS14" || !row
    || locale.sourceUrl !== table.sourceUrl || !table.acceptedCards?.some(c => c.hash === locale.sourcePageSha256 && c.detail === locale.detail)) return fail();
  const receipt = { season: "SS14", level, sourceUrl: table.sourceUrl, sourcePageSha256: table.sourcePageSha256 };
  const hasSecondCoefficient = ['Groundshaker','Moon_Strike'].includes(locale.sourceRecordKey);
  const secondCoefficient = text => hasSecondCoefficient ? effectivenessLine.exec(text.replace(effectivenessLine,'')) : null;
  const extraEffects = overflow ? [{ stat: "skill-damage", operation: "more", unit: "percent",
    value: (seasonOverlevelDamageMultiplier(level) - 1) * 100,
    sourceText: overlevelSource, sourceUrl: growth.sourceUrl, sourcePageSha256: growth.sourcePageSha256 }] : [];
  // The verified displayed level already separates hit/DoT descriptions. Some
  // tables flatten multiple effectiveness columns into ambiguous consecutive
  // lines; do not replace the valid displayed card with that flattened text.
  if (level === displayedLevel) return { item, parserLevel: 20, receipt, blockers: [],
    secondaryEffectiveness: Number(secondCoefficient(row.at(-1))?.[1]) };
  let body = row.at(-1);
  let header = table.baseDetail.split(/\n(?:Simple|Details)\n/u)[0];
  let coefficient = body.match(effectivenessLine);
  let persistentOnly = false;
  let missingAddedDamageEffectiveness = false;
  if (overflow) {
    const base = table.rows.find(row => Number(row[0]) === growth.baseCap)?.at(-1);
    if (SS14_THEA_EFFECTS.season !== 'SS14' || !base) return fail();
    const baseCoefficient = base.match(effectivenessLine);
    const coefficientBlock = base.match(effectivenessLines)?.[0];
    // Multi-form tables can omit the entire coefficient block above Lv.20.
    // When the exact row still has every original description, preserve the
    // verified card's form boundaries and let its existing mechanic parser run.
    if (!coefficient && coefficientBlock?.trimEnd().includes('\n')
      && !hasSecondCoefficient && body === base.slice(coefficientBlock.length)) {
      const last = Number(row[0]);
      const constantRows = level === last || Array.from({ length: last - growth.baseCap }, (_, index) =>
        table.rows.find(row => Number(row[0]) === growth.baseCap + index + 1)?.at(-1)).every(text => text === body);
      if (constantRows) return { item, parserLevel: 20, receipt, blockers: [], extraEffects };
    }
    const description = text => {
      const afterFirst = text.replace(effectivenessLine, '');
      return hasSecondCoefficient ? afterFirst.replace(effectivenessLine, '') : afterFirst;
    };
    const sameDescription = description(base) === description(body);
    // A missing coefficient can only be recovered from the identical base row.
    // Explicit progression remains authoritative for options that change after 20.
    if (level > Number(row[0]) && (!sameDescription || coefficient && (coefficient[1] !== baseCoefficient?.[1]
      || secondCoefficient(base)?.[1] !== secondCoefficient(body)?.[1]))) return fail();
    if (!coefficient && sameDescription && baseCoefficient) {
      body = base;
      coefficient = baseCoefficient;
    }
    const removeEuphoriaRoll = text => description(text).replace(
      /^(You deal \+ )[\d.]+( % additional Damage Over Time to enemies in the Black Hole for every 10 Affliction they have for 4 s\.)$/mu,
      '$1$2');
    // Black Hole's verified progression row changes only the DoT buff.
    // There is no outgoing hit for the omitted added-damage coefficient.
    persistentOnly = !coefficient && locale.sourceRecordKey === 'Black_Hole'
      && body.startsWith('Black Hole:\nDeals 249-249 Persistent Erosion Damage.\n')
      && removeEuphoriaRoll(body) === removeEuphoriaRoll(base);
    missingAddedDamageEffectiveness = !coefficient && !persistentOnly && level === Number(row[0])
      && Boolean(baseCoefficient && baseCoefficient[0] === coefficientBlock
        && /(?:^|\n)Effectiveness of added damage\n([\d.]+)%(?:\n|$)/u.exec(header)?.[1] === baseCoefficient[1]);
  }
  if (header.includes("Effectiveness of added damage")) {
    if (coefficient) header = header.replace(/(Effectiveness of added damage\n)[\d.]+%/u, `$1${coefficient[1]}%`);
    else if (persistentOnly || missingAddedDamageEffectiveness) header = header.replace(/\nEffectiveness of added damage\n[\d.]+%/u, '');
    else return fail();
  } else if (coefficient) {
    header += `\nEffectiveness of added damage\n${coefficient[1]}%`;
  }
  const secondary = secondCoefficient(body);
  if (coefficient) body = body.slice(coefficient[0].length + (secondary?.[0].length ?? 0));
  return { item: { ...item, tlidbText: { ...item.tlidbText, en: { ...locale,
    detail: `${header}\nDetails\n${body}`, progressionReceipt: receipt } } },
    // The parser receives an already resolved card, not a request to extrapolate
    // its level-20 display. Runtime effects still carry the actual skill level.
    parserLevel: 20, receipt, blockers: [], secondaryEffectiveness: Number(secondary?.[1]), extraEffects,
    missingAddedDamageEffectiveness };
}

export function seasonSupportManaMultiplier(effects) {
  return effects.some(e=>e.stat==='support_mana_multiplier_fixed' && e.operation==='set' && e.unit==='percent' && e.value===95
    && !e.condition && !e.conditionRequirements && !e.target && !e.per) ? 95 : undefined;
}

export function seasonEffectLevelBonus(effects, record, support = false, rowIndex = 0) {
  const tags = new Set((record?.tags ?? []).map(t=>t.toLowerCase()));
  const matches = stat => {
    if(stat==='all_skill_levels')return true;
    if(stat==='support_skill_levels')return support;
    if(support)return false;
    if(stat==='main_skill_levels')return rowIndex===0;
    if(stat==='active_skill_levels')return rowIndex<5;
    if(stat==='passive_skill_levels')return rowIndex>=5;
    const type=stat.replace(/_skill_levels$/u,'');
    if(type==='minion')return ['summon','synthetic troop','spirit magus'].some(t=>tags.has(t));
    return type.split('_').every(t=>tags.has(t));
  };
  return effects
    .filter(e => !e.condition && !e.conditionRequirements && !e.target && !e.per && e.operation === "add" && Number.isInteger(e.value)
      && SEASON_GEAR_LEVEL_STATS.has(e.stat) && matches(e.stat))
    .reduce((n, e) => n + e.value, 0);
}

export function seasonGearLevelBonus(components, record, support = false, rowIndex = 0) {
  return seasonEffectLevelBonus(components.filter(c=>c.category==='gear').flatMap(c=>c.calculations??[]).flatMap(validSeasonGearEffects),record,support,rowIndex);
}

export function seasonSkillLevelState(entry, base = entry?.baseLevel ?? entry?.level) {
  const bonus = entry?.levelBonus ?? 0;
  const level = Number.isInteger(base) ? base + bonus : null;
  const verifiedLevel = entry?.progressionReceipt?.season === 'SS14' && entry.progressionReceipt.level === level;
  return { base, level, bonus, confirmed: entry?.level === level && !entry?.bindingChanged
    && !entry?.levelUnavailable && (verifiedLevel || !entry?.blockers?.length) };
}

export function seasonRevelationLevelBonus(build, rows, record) {
  if (build.ss14Inputs?.theaEffectsReceipt !== SS14_THEA_EFFECTS.receiptSha256) return 0;
  return rows.flatMap(row => row.mechanics ?? []).filter(effect => effect.kind === 'thea-skill-level' && record?.tags?.includes(effect.tag))
    .reduce((sum, effect) => sum + effect.value, 0);
}

export function seasonSkillSlotCalculation(report, rowIndex, supportIndex) {
  const support = Number.isInteger(supportIndex);
  for (const component of report.components) {
    if (component.category !== (support ? 'supports' : 'skills')) continue;
    const entry = component.calculations?.find(row => row.rowIndex === rowIndex && (!support || row.supportIndex === supportIndex));
    if (entry) return entry;
  }
}

export function seasonSkillCalculationLevel(report, rowIndex) {
  const entry = seasonSkillSlotCalculation(report,rowIndex);
  const state = seasonSkillLevelState(entry);
  const coupled = report.coupledSkills.rows.find(row=>row.rowIndex===rowIndex);
  const hands = coupled?.offenseBasis?.weaponHands ?? [];
  const [main, off] = hands;
  const sharedGrowth = hands.length===2 && main.levelGrowthMultiplier===off.levelGrowthMultiplier
    ? main.levelGrowthMultiplier : null;
  const moonStrike = entry?.mechanics?.find(m=>m.kind==='moon-strike-forms');
  const moonGrowth = moonStrike?.level === state.level ? moonStrike?.growthMultiplier : null;
  const minion = report.fullDps?.rows.find(row=>row.rowIndex===rowIndex&&row.id===entry?.itemId);
  const minionGrowth = minion?.minionLevel === state.level && minion.minionLevelMultiplier > 1
    ? minion.minionLevelMultiplier : null;
  const growthMultiplier = seasonAppliedOverlevelMultiplier(coupled?.trace) ?? sharedGrowth ?? moonGrowth ?? minionGrowth;
  return {...state,unavailable:entry?.levelUnavailable===true,growthMultiplier:state.confirmed ? growthMultiplier : null};
}

export function seasonAppliedOverlevelMultiplier(trace) {
  const growth = trace?.find(effect=>effect.stage==='damage-modifier' && effect.sourceText===overlevelSource
    && Number.isFinite(effect.resolvedValue));
  return growth ? 1+growth.resolvedValue/100 : null;
}
