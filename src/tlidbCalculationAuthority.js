import { parseTlidbGearTooltip } from "./tlidbGearTooltipCalculation.js";
import { parseTlidbOtherTooltipCalculation } from "./tlidbOtherTooltipCalculation.js";
import { parseTlidbSkillTooltipCalculation } from "./tlidbSkillTooltipCalculation.js";
import { mapTlidbTooltipEffects } from "./tlidbTooltipStatMapping.js";

const EXACT_STATUS = new Set(["exact", "exact-structural"]);
const DEFAULT_LEVEL = 20;
const defaultAuthorityCache = new WeakMap();

function exactCurrentSs13Locale(item) {
  for (const localeKey of ["ko", "en", "cn"]) {
    const locale = item?.tlidbText?.[localeKey];
    if (
      locale?.sourcePageVersion === "SS13"
      && locale?.sourceSeasonEvidence?.verificationComplete === true
      && EXACT_STATUS.has(locale?.sourceFieldStatus?.detail)
      && typeof locale.detail === "string"
    ) return locale;
  }
  return null;
}

function itemCategoryId(item) {
  if (typeof item?.categoryId === "string" && item.categoryId) return item.categoryId;
  const id = String(item?.id ?? "");
  for (const categoryId of [
    "heroMemory",
    "supports",
    "skills",
    "talents",
    "spirits",
    "slates",
    "destiny",
    "gear",
    "hero",
  ]) {
    const prefixes = categoryId === "heroMemory"
      ? ["heroMemory-", "hero-memory-"]
      : [`${categoryId}-`];
    if (prefixes.some((prefix) => id.startsWith(prefix))) return categoryId;
  }
  return "";
}

function parseTooltip(item, level) {
  const categoryId = itemCategoryId(item);
  const categorizedItem = item?.categoryId ? item : { ...item, categoryId };
  if (categoryId === "gear") return parseTlidbGearTooltip(categorizedItem, { locale: "en" });
  if (categoryId === "skills" || categoryId === "supports") {
    return parseTlidbSkillTooltipCalculation(categorizedItem, { level });
  }
  return parseTlidbOtherTooltipCalculation(categorizedItem);
}

function directStats(effects) {
  const stats = {};
  for (const effect of effects) {
    if (
      effect.condition
      || effect.conditionRequirements
      || effect.per
      || effect.roll
      || effect.value === null
      || effect.value === undefined
      || effect.value === ""
      || !Number.isFinite(Number(effect.value))
    ) continue;
    const value = Number(effect.value);
    if (effect.operation === "add") stats[effect.stat] = (stats[effect.stat] ?? 0) + value;
    else if (effect.operation === "set") stats[effect.stat] = value;
  }
  return stats;
}

function createAuthority(item, level) {
  const locale = exactCurrentSs13Locale(item);
  if (!locale) return null;
  const parsed = parseTooltip(item, level);
  if (!parsed.effects.length) return null;
  const mapped = mapTlidbTooltipEffects(parsed.effects);
  const parserBlockers = Object.freeze(parsed.blockers.map((blocker) => Object.freeze({ ...blocker })));
  const flavorLines = Object.freeze((parsed.flavorLines ?? []).map((line) => Object.freeze({
    ...line,
    evidence: line.evidence ? Object.freeze({ ...line.evidence }) : undefined,
  })));
  const mappingBlockers = Object.freeze(mapped.blockers.map((blocker) => Object.freeze({ ...blocker })));
  const blockers = Object.freeze([
    ...parserBlockers,
    ...mappingBlockers,
  ].map((blocker) => Object.freeze({ ...blocker })));
  return Object.freeze({
    status: "tlidb-current-ss13-tooltip-effects",
    sourceUrl: locale.sourceUrl,
    sourceRecordKey: locale.sourceRecordKey,
    receipt: Object.freeze({
      sourcePageVersion: locale.sourcePageVersion,
      sourcePageSha256: locale.sourcePageSha256,
      sourceFieldStatus: locale.sourceFieldStatus.detail,
    }),
    stats: Object.freeze(directStats(mapped.effects)),
    parsedEffects: parsed.effects,
    effects: mapped.effects,
    flavorLines,
    parserBlockers,
    mappingBlockers,
    blockers,
    parsedEffectCount: parsed.effects.length,
    calculableEffectCount: mapped.effects.length,
    blockedEffectCount: blockers.length,
  });
}

export function getTlidbCalculationAuthority(item, options = {}) {
  if (!item || typeof item !== "object") return null;
  const level = Math.max(1, Math.round(Number(options.level) || DEFAULT_LEVEL));
  if (level !== DEFAULT_LEVEL) return createAuthority(item, level);
  if (defaultAuthorityCache.has(item)) return defaultAuthorityCache.get(item);
  const authority = createAuthority(item, level);
  defaultAuthorityCache.set(item, authority);
  return authority;
}

export function hasTlidbCalculationAuthority(item) {
  const authority = getTlidbCalculationAuthority(item);
  return Boolean(authority?.effects.length);
}

export function hasTlidbParsedCalculationAuthority(item) {
  const authority = getTlidbCalculationAuthority(item);
  return Boolean(authority?.parsedEffects.length);
}
