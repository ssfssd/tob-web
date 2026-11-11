import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import { SS14_THEA_EFFECTS } from "./data/ss14TheaEffects.generated.js";
import "./seasonCurrentDatabase.js";
import { SEASON_GEAR_LEVEL_STATS } from './seasonGearEffects.js';

// Resolve a whole, explicit progression row before parsing effects. Never
// interpolate damage ranges or reuse a level-20 row with missing coefficients.
export function resolveSeasonSkillLevel(item, level) {
  const locale = item?.tlidbText?.en;
  const table = SS14_LOG_COMPLETION.levels[item?.id];
  if (level === (locale?.cardLevel ?? 20) && !table) return { item, parserLevel: 20, blockers: [] };
  const overflow = item?.id === "skills-tlidb-com-cn-ice-lances" && Number.isInteger(level) && level > 20 && level <= 100;
  const row = table?.rows.find(row => Number(row[0]) === (overflow ? 20 : level));
  const fail = () => ({ item, parserLevel: level, blockers: [{ reason: "ss14-level-row-unavailable",
    sourceText: `SS14 ${level}레벨의 정확한 스킬 수치가 필요합니다.` }] });
  if (locale?.sourcePageVersion !== "SS14" || table?.season !== "SS14" || !row
    || locale.sourceUrl !== table.sourceUrl || !table.acceptedCards?.some(c => c.hash === locale.sourcePageSha256 && c.detail === locale.detail)) return fail();
  const receipt = { season: "SS14", level, sourceUrl: table.sourceUrl, sourcePageSha256: table.sourcePageSha256 };
  // The verified displayed level already separates hit/DoT descriptions. Some
  // tables flatten multiple effectiveness columns into ambiguous consecutive
  // lines; do not replace the valid displayed card with that flattened text.
  if (level === (locale.cardLevel ?? 20)) return { item, parserLevel: 20, receipt, blockers: [] };
  let body = row.at(-1);
  let header = table.baseDetail.split(/\n(?:Simple|Details)\n/u)[0];
  const coefficient = body.match(/^Effectiveness of added damage ([\d.]+)%\n/u);
  if (header.includes("Effectiveness of added damage")) {
    if (!coefficient) return fail();
    header = header.replace(/(Effectiveness of added damage\n)[\d.]+%/u, `$1${coefficient[1]}%`);
  } else if (coefficient) {
    header += `\nEffectiveness of added damage\n${coefficient[1]}%`;
  }
  if (coefficient) body = body.slice(coefficient[0].length);
  return { item: { ...item, tlidbText: { ...item.tlidbText, en: { ...locale,
    detail: `${header}\nDetails\n${body}`, progressionReceipt: receipt } } },
    // The parser receives an already resolved card, not a request to extrapolate
    // its level-20 display. Runtime effects still carry the actual skill level.
    parserLevel: 20, receipt, blockers: [], extraEffects: overflow ? [{ stat: "skill-damage", operation: "more", unit: "percent",
      value: ((1 + SS14_THEA_EFFECTS.levelGrowth.firstTierMore / 100) ** Math.min(10, level - 20)
        * (1 + SS14_THEA_EFFECTS.levelGrowth.laterMore / 100) ** Math.max(0, level - 30) - 1) * 100,
      sourceText: "SS14 스킬 초과 레벨 별도 대미지", sourceUrl: SS14_THEA_EFFECTS.levelGrowth.sourceUrl,
      sourcePageSha256: SS14_THEA_EFFECTS.levelGrowth.sourcePageSha256 }] : [] };
}

export function seasonEffectLevelBonus(effects, record, support = false, rowIndex = 0) {
  const tags = new Set((record?.tags ?? []).map(t=>t.toLowerCase()));
  const matches = stat => {
    if(stat==='all_skill_levels')return true;
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
  return seasonEffectLevelBonus(components.filter(c=>c.category==='gear').flatMap(c=>c.calculations??[]).flatMap(c=>c.rawEffects??[]),record,support,rowIndex);
}
