import { getCurrentTlidbSupportCompatibility } from "./tlidbSupportCompatibility.js";

const EXACT_DETAIL_STATUS = "exact";
const CURRENT_SEASON = "SS13";
const CURRENT_SEASON_NUMBER = 13;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const LOCALE_ORDER = Object.freeze(["en", "ko", "cn"]);
const LEVEL_ANNOTATION_PATTERN = /\s*\(Lv(\d+):([+-]?\d+(?:\.\d+)?)(?:\/([1-9]\d*(?:\.\d+)?))?\)/gu;
const CALCULATION_WORD_PATTERN = /(?:damage|speed|cooldown|mana|life|energy shield|interval|duration|stack|quantity|chance|convert|conversion|critical|armor|evasion|resistance|regeneration|affliction|focus|charge|projectile|sentry|terra)/iu;
const DIRECT_SPEED_ELIXIR_IDS = new Set([
  "skills-tlidb-com-cn-scorpion-stinger-distillate",
  "skills-tlidb-com-cn-white-rhino-distillate",
]);

const HEADER_SPECS = Object.freeze({
  en: Object.freeze({
    "Mana Cost": Object.freeze({ stat: "mana-cost", operation: "set", unit: "mana" }),
    "Mana Cost Multiplier": Object.freeze({ stat: "mana-cost-multiplier", operation: "set", unit: "percent" }),
    "Cast Speed": Object.freeze({ stat: "cast-time", operation: "set", unit: "seconds" }),
    Cooldown: Object.freeze({ stat: "cooldown", operation: "set", unit: "seconds" }),
    "Effectiveness of added damage": Object.freeze({ stat: "added-damage-effectiveness", operation: "set", unit: "percent" }),
    "Sealed Mana": Object.freeze({ stat: "sealed-mana", operation: "set", unit: "percent" }),
  }),
  ko: Object.freeze({
    "MP 소모": Object.freeze({ stat: "mana-cost", operation: "set", unit: "mana" }),
    "MP 소모 배율": Object.freeze({ stat: "mana-cost-multiplier", operation: "set", unit: "percent" }),
    "시전 속도": Object.freeze({ stat: "cast-time", operation: "set", unit: "seconds" }),
    쿨타임: Object.freeze({ stat: "cooldown", operation: "set", unit: "seconds" }),
    "대미지 배율": Object.freeze({ stat: "added-damage-effectiveness", operation: "set", unit: "percent" }),
    "봉인된 MP": Object.freeze({ stat: "sealed-mana", operation: "set", unit: "percent" }),
  }),
  cn: Object.freeze({
    魔力消耗: Object.freeze({ stat: "mana-cost", operation: "set", unit: "mana" }),
    魔力消耗倍率: Object.freeze({ stat: "mana-cost-multiplier", operation: "set", unit: "percent" }),
    施法速度: Object.freeze({ stat: "cast-time", operation: "set", unit: "seconds" }),
    冷却时间: Object.freeze({ stat: "cooldown", operation: "set", unit: "seconds" }),
    伤害倍率: Object.freeze({ stat: "added-damage-effectiveness", operation: "set", unit: "percent" }),
    封印魔力: Object.freeze({ stat: "sealed-mana", operation: "set", unit: "percent" }),
  }),
});

export const TLIDB_SKILL_TOOLTIP_KOREAN_SOURCE_LABELS = Object.freeze(
  Object.keys(HEADER_SPECS.ko),
);

function normalizeLine(line) {
  return line
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseNumber(value) {
  const match = String(value).trim().match(/^([+-]?\d+(?:\.\d+)?)(?:\/([1-9]\d*(?:\.\d+)?))?$/u);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = match[2] ? Number(match[2]) : 1;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

function rounded(value) {
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12;
}

function exactCurrentLocale(item, expectedSeason = CURRENT_SEASON) {
  if (!["SS13", "SS14"].includes(expectedSeason)) return null;
  const expectedSeasonNumber = Number(expectedSeason.slice(2));
  for (const localeKey of LOCALE_ORDER) {
    const locale = item?.tlidbText?.[localeKey];
    const season = locale?.sourceSeasonEvidence;
    if (
      locale?.sourceFieldStatus?.detail === EXACT_DETAIL_STATUS
      && locale?.sourcePageVersion === expectedSeason
      && season?.expectedSeason === expectedSeasonNumber
      && season?.actualSeason === expectedSeasonNumber
      && season?.collectionAllowed === true
      && season?.verificationComplete === true
      && typeof locale?.sourceUrl === "string"
      && locale.sourceUrl.startsWith(`https://tlidb.com/${localeKey}/`)
      && typeof locale?.sourceRecordKey === "string"
      && locale.sourceRecordKey.length > 0
      && SHA256_PATTERN.test(locale?.sourcePageSha256 ?? "")
      && typeof locale?.detail === "string"
      && locale.detail.trim().length > 0
    ) return { localeKey, locale };
  }
  return null;
}

function itemCategory(item) {
  if (item?.categoryId === "skills" || item?.categoryId === "supports") return item.categoryId;
  if (item?.supportProfile || item?.id?.startsWith("supports-")) return "supports";
  if (item?.skillProfile || item?.id?.startsWith("skills-")) return "skills";
  return null;
}

function fallbackSourceText(item) {
  for (const localeKey of LOCALE_ORDER) {
    const detail = item?.tlidbText?.[localeKey]?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }
  return typeof item?.id === "string" ? item.id : "unknown item";
}

function levelAnchors(sourceText) {
  const anchors = [];
  for (const match of sourceText.matchAll(LEVEL_ANNOTATION_PATTERN)) {
    const numerator = Number(match[2]);
    const denominator = match[3] ? Number(match[3]) : 1;
    anchors.push({ level: Number(match[1]), value: numerator / denominator });
  }
  return anchors.filter(({ level, value }) => Number.isInteger(level) && Number.isFinite(value));
}

function withoutLevelAnnotations(sourceText) {
  return sourceText.replace(LEVEL_ANNOTATION_PATTERN, "").trim();
}

function valueAtRequestedLevel(displayedValue, sourceText, level) {
  if (level === null) return displayedValue;
  const anchors = levelAnchors(sourceText).sort((left, right) => left.level - right.level);
  if (!anchors.length) return displayedValue;
  const exact = anchors.find((anchor) => anchor.level === level);
  if (exact) return rounded(exact.value);
  const lower = [...anchors].reverse().find((anchor) => anchor.level < level);
  const upper = anchors.find((anchor) => anchor.level > level);
  if (!lower || !upper) return null;
  const progress = (level - lower.level) / (upper.level - lower.level);
  return rounded(lower.value + ((upper.value - lower.value) * progress));
}

function strictProfileValue(item, localeKey, field, level, displayedValue) {
  if (item?.profileValueAuthority !== "tlidb-current-ss13-profile-values") return null;
  const evidence = item?.profileValueEvidence;
  if (!evidence?.verifiedFields?.includes(field)) return null;
  const receipt = evidence?.localeReceipts?.[localeKey];
  const locale = item?.tlidbText?.[localeKey];
  if (
    receipt?.sourcePageVersion !== CURRENT_SEASON
    || receipt?.sourceUrl !== locale?.sourceUrl
    || receipt?.sourcePageSha256 !== locale?.sourcePageSha256
    || receipt?.sourceRecordKey !== locale?.sourceRecordKey
  ) return null;

  if (field === "skillProfile.coefficientByLevel") {
    const values = item?.skillProfile?.coefficientByLevel;
    if (Number(values?.[20]) !== displayedValue) return null;
    const value = Number(values?.[level]);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function headerValue(valueText) {
  const normalized = normalizeLine(valueText);
  const match = normalized.match(/^([+-]?\d+(?:\.\d+)?)\s*(%|s|초|秒)?$/u);
  return match ? { value: Number(match[1]), suffix: match[2] ?? "" } : null;
}

function parseHeader(item, localeKey, header, valueText, level, season) {
  const spec = HEADER_SPECS[localeKey]?.[header];
  if (!spec) return null;
  const parsed = headerValue(valueText);
  const sourceText = `${header}\n${valueText}`;
  if (!parsed || !Number.isFinite(parsed.value)) {
    return { reason: "invalid-header-value", sourceText };
  }

  let value = parsed.value;
  if (spec.stat === "added-damage-effectiveness" && level !== null && level !== 20) {
    value = strictProfileValue(
      item,
      localeKey,
      "skillProfile.coefficientByLevel",
      level,
      parsed.value,
    );
    if (!Number.isFinite(value)) return { reason: "requested-level-value-unavailable", sourceText };
  }

  const unit = spec.stat === "mana-cost" && parsed.suffix === "%" ? "percent" : spec.unit;
  // SS14's card follows the shipped tooltip: Float2Point(1 / DoSpeed).
  // Its inherited "s" suffix is misleading; this number is casts per second.
  // Keep historical SS13 cards' time semantics unchanged.
  if (season === "SS14" && spec.stat === "cast-time") {
    if (!(value > 0)) return { reason: "invalid-cast-frequency", sourceText };
    return { effects: [{ ...spec, value: 1 / value, unit, sourceText,
      sourceValue: value, sourceUnit: "casts-per-second" }], sourceText };
  }
  return {
    effects: [{ ...spec, value, unit, sourceText }],
    sourceText,
  };
}

function scopedModifier(descriptor, category, scopeHint = null) {
  let text = descriptor.trim().replace(/[.]$/u, "");
  let scope = scopeHint ?? (category === "supports" ? "supported-skill" : "skill");

  if (/Minions? summoned by (?:the supported|this) skill/iu.test(text)) {
    scope = "minion";
    text = text.replace(/\s+(?:for|of|to) Minions? summoned by (?:the supported|this) skill/giu, "");
    text = text.replace(/^Minions? summoned by (?:the supported|this) skill(?:'s)?\s*/iu, "");
  }
  if (/(?:for|of|to) (?:the )?supported skill/iu.test(text)) {
    scope = "supported-skill";
    text = text.replace(/\s+(?:for|of|to) (?:the )?supported skill(?:'s)?\s*$/iu, "");
  }
  if (/(?:for|of|to) (?:this|the) skill/iu.test(text)) {
    scope = "skill";
    text = text.replace(/\s+(?:for|of|to) (?:this|the) skill(?:'s)?\s*$/iu, "");
  }

  text = text
    .replace(/^(?:the )?(?:supported|this) skill(?:'s)?\s+/iu, "")
    .replace(/^the skill(?:'s)?\s+/iu, "")
    .replace(/^the\s+/iu, "")
    .replace(/^additional\s+/iu, "")
    .trim();

  const lower = text.toLowerCase();
  if (lower === "attack and cast speed" || lower === "attack, cast, and movement speed") {
    const stats = [`${scope}-attack-speed`, `${scope}-cast-speed`];
    if (lower.includes("movement")) stats.push(`${scope}-movement-speed`);
    return stats;
  }
  if (lower === "attack speed") return [`${scope}-attack-speed`];
  if (lower === "cast speed") return [`${scope}-cast-speed`];
  if (lower === "warcry cast speed") return [`${scope}-warcry-cast-speed`];
  if (lower === "cooldown recovery speed") return [`${scope}-cooldown-recovery-speed`];
  if (lower === "movement speed") return [`${scope}-movement-speed`];
  if (lower === "aura effect") return [`${scope}-aura-effect`];
  if (lower === "critical strike rating") return [`${scope}-critical-strike-rating`];
  if (lower === "affliction effect") return ["affliction-effect"];
  if (lower === "elemental resistance") return [`${scope}-elemental-resistance`];
  if (lower === "elemental and erosion resistance") return [`${scope}-all-resistance`];
  if (lower === "life regeneration per second") return [`${scope}-life-regeneration`];
  if (lower === "mana regeneration per second") return [`${scope}-mana-regeneration`];
  if (lower === "energy shield regeneration per second") {
    return [`${scope}-energy-shield-regeneration`];
  }
  if (lower === "skill area") {
    if (scope === "skill") return ["skill-area"];
    if (scope === "supported-skill") return ["supported-skill-area"];
    return [`${scope}-skill-area`];
  }
  if (lower === "projectile quantity") return [`${scope}-projectile-quantity`];
  if (lower === "sealed mana compensation") return [`${scope}-sealed-mana-compensation`];
  if (lower === "duration") return [`${scope}-duration`];
  if (lower === "damage taken") return [`${scope}-damage-taken`];
  if (/^(?:physical|fire|cold|lightning|erosion) damage taken$/u.test(lower)) {
    return [`${scope}-${lower.replaceAll(" ", "-")}`];
  }
  if (lower === "damage") return [`${scope}-damage`];
  if (lower === "damage over time") return [`${scope}-damage-over-time`];
  const typedDamage = lower.match(/^(physical|fire|cold|lightning|erosion|elemental|hit|ailment|spell|attack|melee|projectile|area|minion) damage$/u);
  if (typedDamage) return [`${scope}-${typedDamage[1]}-damage`];
  if (/^[a-z][a-z -]* chance$/u.test(lower)) return [`${scope}-${lower.replace(/\s+/gu, "-")}`];
  if (/^(?:max )?(?:life|energy shield)$|^(?:armor|evasion)$/u.test(lower)) {
    return [`${scope}-${lower.replace(/\s+/gu, "-")}`];
  }
  return null;
}

function conditionSplit(sourceText) {
  const lower = sourceText.toLowerCase();
  const markers = [" when ", " while ", " if ", " against ", " upon ", " as the buff lasts"];
  const matches = markers
    .map((marker) => ({ marker, index: lower.indexOf(marker) }))
    .filter(({ index }) => index > 0)
    .sort((left, right) => left.index - right.index);
  if (!matches.length) return { clause: sourceText, condition: undefined };
  const { index } = matches[0];
  return {
    clause: sourceText.slice(0, index).trim(),
    condition: sourceText.slice(index + 1).trim().replace(/[.]$/u, ""),
  };
}

function modifierPrefix(prefix, category) {
  const match = prefix.match(/^(?:(This skill|The supported skill|Supported skill)\s+)?([+-]?\s*\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\s*%\s+(additional\s+)?(.+)$/iu);
  if (!match) return null;
  const value = parseNumber(match[2].replace(/\s+/gu, ""));
  const scopeHint = match[1]?.toLowerCase().includes("supported")
    ? "supported-skill"
    : match[1]
      ? "skill"
      : null;
  const stats = scopedModifier(match[4], category, scopeHint);
  if (!Number.isFinite(value) || !stats) return null;
  return { value, additional: Boolean(match[3]), stats };
}

function parsePersistentDamage(line) {
  let match = line.match(/^Deals\s+([+-]?\d+(?:\.\d+)?)\s+Persistent\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\s+(?:every|per)\s+second(?:\s+for\s+([+-]?\d+(?:\.\d+)?)\s*s)?\.?$/iu);
  if (match) {
    const type = match[2].toLowerCase();
    const effects = [{
      stat: `persistent-${type}-damage-per-second`,
      operation: "set",
      value: Number(match[1]),
      unit: "damage-per-second",
      sourceText: line,
    }];
    if (match[3]) effects.push({
      stat: `persistent-${type}-duration`,
      operation: "set",
      value: Number(match[3]),
      unit: "seconds",
      sourceText: line,
    });
    return effects;
  }

  match = line.match(/^Deals\s+Persistent\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\s+equal\s+to\s+([+-]?\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?Base Damage\s+every second\.?$/iu);
  if (match) return [{
    stat: `persistent-${match[1].toLowerCase()}-base-damage-per-second`,
    operation: "set",
    value: Number(match[2]),
    unit: "percent-of-base-damage-per-second",
    sourceText: line,
  }];

  match = line.match(/^Deals\s+([+-]?\d+(?:\.\d+)?)\s+Spell\s*(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\s+every second\.?$/iu);
  if (match) return [{
    stat: `spell-${match[2].toLowerCase()}-damage-per-second`,
    operation: "set",
    value: Number(match[1]),
    unit: "damage-per-second",
    sourceText: line,
  }];
  return null;
}

function pairedLevelRange(sourceText, displayedMin, displayedMax, level) {
  const anchors = levelAnchors(sourceText);
  const series = [];
  for (const anchor of anchors) {
    const current = series.at(-1);
    if (!current || anchor.level <= current.at(-1).level) series.push([anchor]);
    else current.push(anchor);
  }
  if (series.length !== 2 || series.some((entries) => entries.length === 0)) return null;

  const [minimums, maximums] = series;
  if (
    minimums.length !== maximums.length
    || minimums[0].value !== displayedMin
    || maximums[0].value !== displayedMax
  ) return null;
  for (let index = 0; index < minimums.length; index += 1) {
    if (
      minimums[index].level !== maximums[index].level
      || (index > 0 && minimums[index].level !== minimums[index - 1].level + 1)
      || minimums[index].value > maximums[index].value
    ) return null;
  }

  if (level === null) return { min: displayedMin, max: displayedMax };
  const index = minimums.findIndex((anchor) => anchor.level === level);
  if (index < 0) return { reason: "requested-level-value-unavailable" };
  return { min: minimums[index].value, max: maximums[index].value };
}

function parseSupportedAddedDamage(line, category, level, season) {
  if (category !== "supports") return null;
  const clause = withoutLevelAnnotations(line).replace(/[.]$/u, "");
  const match = clause.match(/^The supported skill adds\s+([+-]?\d+(?:\.\d+)?)\s*-\s*([+-]?\d+(?:\.\d+)?)\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage$/iu);
  if (!match) return null;
  const anchors = levelAnchors(line);
  if (!anchors.length && !(season === "SS14" && level === 20)) return null;
  const values = anchors.length ? pairedLevelRange(line, Number(match[1]), Number(match[2]), level)
    : { min: Number(match[1]), max: Number(match[2]) };
  if (!values) return { reason: "level-range-sequence-unverified" };
  if (values.reason) return values;
  const stat = `supported-skill-added-${match[3].toLowerCase()}-damage`;
  return {
    effects: [
      { stat: `${stat}-min`, operation: "set", value: values.min, unit: "damage", sourceText: line },
      { stat: `${stat}-max`, operation: "set", value: values.max, unit: "damage", sourceText: line },
    ],
  };
}

function parseDirectDamage(line) {
  let match = line.match(/^Deals\s+([+-]?\d+(?:\.\d+)?)\s*-\s*([+-]?\d+(?:\.\d+)?)\s+Spell\s*(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\.?$/iu);
  if (match) {
    const stat = `spell-${match[3].toLowerCase()}-damage`;
    return [
      { stat: `${stat}-min`, operation: "set", value: Number(match[1]), unit: "damage", sourceText: line },
      { stat: `${stat}-max`, operation: "set", value: Number(match[2]), unit: "damage", sourceText: line },
    ];
  }

  match = line.match(/^Deals\s+([+-]?\d+(?:\.\d+)?)\s+Spell\s*(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\.?$/iu);
  if (match) return [{
    stat: `spell-${match[2].toLowerCase()}-damage`,
    operation: "set",
    value: Number(match[1]),
    unit: "damage",
    sourceText: line,
  }];

  match = line.match(/^Deals\s+([+-]?\d+(?:\.\d+)?)\s*%\s+Weapon Attack Damage\.?$/iu);
  if (match) return [{
    stat: "weapon-attack-damage-coefficient",
    operation: "set",
    value: Number(match[1]),
    unit: "percent-of-weapon-damage",
    sourceText: line,
  }];

  match = line.match(/^([+-]?\d+(?:\.\d+)?)\s*%\s+Weapon Attack Damage\.?$/iu);
  if (match) return [{
    stat: "weapon-attack-damage-coefficient",
    operation: "set",
    value: Number(match[1]),
    unit: "percent-of-weapon-damage",
    sourceText: line,
  }];

  match = line.match(/^Deals\s+(Attack|Spell)\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\s+equal\s+to\s+([+-]?\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?Base Damage\.?$/iu);
  if (match) return [{
    stat: `${match[1].toLowerCase()}-${match[2].toLowerCase()}-base-damage-coefficient`,
    operation: "set",
    value: Number(match[3]),
    unit: "percent-of-base-damage",
    sourceText: line,
  }];
  return null;
}

function parseSelfDamage(line) {
  const match = line.match(/^You take True Damage equal to\s+([+-]?\d+(?:\.\d+)?)\s*%\s+of\s+(.+?)\s+every second\s+while\s+(.+)\.?$/iu);
  if (!match) return null;
  const requirement = {
    path: "statuses.skill_terra_active",
    operator: "truthy",
    expected: true,
  };
  return [{
    stat: "self-true-damage-percent-per-second",
    operation: "set",
    value: Number(match[1]),
    unit: "percent-per-second",
    sourceDependency: match[2],
    condition: requirement,
    conditionText: `while ${match[3].replace(/[.]$/u, "")}`,
    conditionRequirements: [requirement],
    sourceText: line,
  }];
}

function parseDurationOrInterval(line) {
  let match = line.match(/^Reaps enemies within the Beam Area, dealing ([+-]?\d+(?:\.\d+)?) s of Damage Over Time\.?$/iu);
  if (match) return [{
    stat: "reaping-duration",
    operation: "set",
    value: Number(match[1]),
    unit: "seconds",
    sourceText: line,
  }];

  match = line.match(/^(Cooldown|Effect Cooldown|Interval):\s*([+-]?\d+(?:\.\d+)?)\s*s\.?$/iu);
  if (match) return [{
    stat: match[1].toLowerCase() === "interval" ? "effect-interval" : "effect-cooldown",
    operation: "set",
    value: Number(match[2]),
    unit: "seconds",
    sourceText: line,
  }];

  match = line.match(/^Deals damage once every\s+([+-]?\d+(?:\.\d+)?)\s*s\.?$/iu);
  if (match) return [{
    stat: "damage-interval",
    operation: "set",
    value: Number(match[1]),
    unit: "seconds",
    sourceText: line,
  }];

  match = line.match(/^(The buff|The Sentry|[A-Za-z][A-Za-z -]*)\s+lasts(?: for)?\s+([+-]?\d+(?:\.\d+)?)\s*s\.?$/u);
  if (match) return [{
    stat: `${match[1].toLowerCase().replace(/^the\s+/u, "").replace(/\s+/gu, "-")}-duration`,
    operation: "set",
    value: Number(match[2]),
    unit: "seconds",
    sourceText: line,
  }];

  match = line.match(/^Lasts(?: for)?\s+([+-]?\d+(?:\.\d+)?)\s*s\.?$/iu);
  if (match) return [{
    stat: "skill-duration",
    operation: "set",
    value: Number(match[1]),
    unit: "seconds",
    sourceText: line,
  }];
  return null;
}

function parseRestoration(line, level) {
  const match = line.match(/^Restores\s+([+-]?\d+(?:\.\d+)?)\s*%\s+Max\s+(Life|Mana)\s+within\s+([+-]?\d+(?:\.\d+)?)\s*s(?:\s+.*)?$/iu);
  if (!match) return null;
  const value = valueAtRequestedLevel(Number(match[1]), line, level);
  const durationSeconds = Number(match[3]);
  if (!Number.isFinite(value)) return { reason: "requested-level-value-unavailable" };
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { reason: "restoration-duration-invalid" };
  }
  return {
    effects: [{
      stat: `skill-${match[2].toLowerCase()}-restoration`,
      operation: "add",
      value,
      unit: "percent-max-over-duration",
      durationSeconds,
      sourceText: line,
    }],
  };
}

function parseCappedMovementSpeed(line, category) {
  const match = line.match(/^([+-]?\d+(?:\.\d+)?)\s*%\s+Movement Speed,\s*up to\s+\+?([+-]?\d+(?:\.\d+)?)\s*%\.?$/iu);
  if (!match) return null;
  const [stat] = scopedModifier("Movement Speed", category) ?? [];
  if (!stat) return null;
  return {
    effects: [{
      stat,
      operation: "add",
      value: Number(match[1]),
      unit: "percent",
      maximumValue: Number(match[2]),
      sourceText: line,
    }],
  };
}

function parseElixirDirectEffect(line, item) {
  let match = line.match(/^Adds\s+([+-]?\d+(?:\.\d+)?)\s*%\s+of\s+Physical Damage\s+(?:as|to)\s+(Fire|Cold|Lightning) Damage\.?$/iu);
  if (match) return [{
    stat: `skill-physical-damage-as-${match[2].toLowerCase()}`,
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    sourceText: line,
  }];

  match = line.match(/^([+-]?\d+(?:\.\d+)?)\s*%\s+Elemental Resistance Penetration for Spell Skills\.?$/iu);
  if (match) return [{
    stat: "skill-elemental-resistance-penetration",
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    sourceText: line,
  }];

  match = line.match(/^\+?([+-]?\d+(?:\.\d+)?)\s*%\s+Max Elemental Resistance\.?$/iu);
  if (match) return [{
    stat: "skill-max-elemental-resistance",
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    sourceText: line,
  }];

  match = line.match(/^Adds\s+([+-]?\d+(?:\.\d+)?)\s*%\s+of\s+Max Life\s+to\s+Energy Shield\.?$/iu);
  if (match) return [{
    stat: "skill-max-life-to-energy-shield",
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    sourceText: line,
  }];

  if (!DIRECT_SPEED_ELIXIR_IDS.has(item?.id)) return null;

  match = line.match(/^\+?([+-]?\d+(?:\.\d+)?)\s*%\s+Projectile Speed\.?$/iu);
  if (match) return [{
    stat: "skill-projectile-speed",
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    sourceText: line,
  }];

  match = line.match(/^\+?([+-]?\d+(?:\.\d+)?)\s*%\s+Energy Shield Charge Speed\.?$/iu);
  if (match) return [{
    stat: "skill-energy-shield-charge-speed",
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    sourceText: line,
  }];
  return null;
}

function parseConversion(line, category) {
  const match = line.match(/^Converts?\s+([+-]?\d+(?:\.\d+)?)\s*%\s+of\s+(.+?)\s+to\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\.?$/iu);
  if (!match) return null;
  const scope = /Minions?|Sentr(?:y|ies)|Spirit Magi/iu.test(match[2])
    ? "minion"
    : /supported skill/iu.test(match[2])
    ? "supported-skill"
    : category === "supports"
      ? "supported-skill"
      : "skill";
  return [{
    stat: `${scope}-${match[3].toLowerCase()}-damage-conversion`,
    operation: "set",
    value: Number(match[1]),
    unit: "percent",
    sourceDependency: match[2],
    sourceText: line,
  }];
}

function parseInheritedCap(line, category) {
  const match = line.match(/^([+-]?\d+(?:\.\d+)?)\s*%\s+of\s+(.+?)\s+(?:is|are) also applied to\s+(.+?),\s*up to\s+\+?([+-]?\d+(?:\.\d+)?)\s*%\s+(.+)\.?$/iu);
  if (!match) return null;
  const targetStats = scopedModifier(match[3], category);
  const capStats = scopedModifier(match[5], category);
  if (!targetStats || !capStats || targetStats.length !== 1 || capStats[0] !== targetStats[0]) return null;
  const sourcePath = /Movement Speed/iu.test(match[2])
    ? "stats.movementSpeed"
    : /Attack Speed/iu.test(match[2])
      ? "stats.attackSpeed"
      : /Cast Speed/iu.test(match[2])
        ? "stats.castSpeed"
        : /Skill Area/iu.test(match[2])
          ? "stats.skillArea"
          : null;
  if (!sourcePath) return null;
  return [{
    stat: targetStats[0],
    operation: "add",
    value: Number(match[1]),
    unit: "percent",
    conditionText: `from ${match[2]}`,
    per: {
      path: sourcePath,
      divisor: 100,
      rounding: "none",
      cap: Number(match[4]),
    },
    sourceText: line,
  }];
}

function perMetadata(condition, percentCap, stackCap) {
  const lower = condition.toLowerCase();
  let path = null;
  if (/max life/iu.test(condition)) path = "stats.life";
  else if (/max mana/iu.test(condition)) path = "stats.mana";
  else if (/terra charge/iu.test(condition)) path = "charges.terra";
  else if (/bonus gained/iu.test(condition)) path = "heroStacks.bonus";
  else if (/enem(?:y|ies) affected/iu.test(condition)) path = "heroStacks.enemyAffected";
  else if (/command/iu.test(condition)) path = "heroStacks.command";
  else if (/projectile quantity/iu.test(condition)) path = "stats.projectileQuantity";
  else if (/fervor rating/iu.test(condition)) path = "heroStacks.fervor";
  else if (/frostbite rating/iu.test(condition)) path = "heroStacks.frostbite";
  else if (/type of ailment/iu.test(condition)) path = "heroStacks.ailmentTypes";
  else if (/sentr(?:y|ies)/iu.test(condition)) path = "heroStacks.sentry";
  else if (/critical strike landed by minions?/iu.test(condition)) {
    path = "heroStacks.minionCriticalStrikesRecently";
  } else if (/growth minions? .* have/iu.test(condition)) path = "heroStacks.minionGrowth";
  else if (/skill area of minions?/iu.test(condition)) path = "stats.minionSkillArea";
  else if (/(?:for every|for each|per)\s+(?:\+?\d+(?:\.\d+)?\s+)?minions?\b/iu.test(condition)) {
    path = "heroStacks.minion";
  }
  else if (/summon skill cast/iu.test(condition)) path = "heroStacks.summonSkillCasts";
  else if (/jump/iu.test(condition)) path = "heroStacks.jump";
  else if (/affliction/iu.test(condition)) path = "heroStacks.affliction";
  else if (/attack speed/iu.test(condition)) path = "stats.attackSpeed";
  if (!path) return null;

  const divisorMatch = lower.match(/(?:for every|for each|per)\s+\+?([0-9]+(?:\.[0-9]+)?)/u);
  const divisor = divisorMatch ? Number(divisorMatch[1]) : 1;
  return {
    path,
    divisor,
    ...(percentCap ? { cap: Number(percentCap[1]) } : {}),
    ...(stackCap ? { maxUnits: Number(stackCap[1]) } : {}),
  };
}

function parsePerUnitModifier(line, category, level) {
  const withoutLevels = withoutLevelAnnotations(line).replace(/[.]$/u, "");
  const lower = withoutLevels.toLowerCase();
  const markers = [" for every ", " for each ", " per "];
  const found = markers
    .map((marker) => ({ marker, index: lower.lastIndexOf(marker) }))
    .filter(({ index }) => index > 0)
    .sort((left, right) => right.index - left.index)[0];
  if (!found) return null;

  const prefix = withoutLevels.slice(0, found.index).trim();
  const condition = withoutLevels.slice(found.index + 1).trim();
  const modifier = modifierPrefix(prefix, category);
  if (!modifier) return null;

  const value = valueAtRequestedLevel(modifier.value, line, level);
  if (!Number.isFinite(value)) return { reason: "requested-level-value-unavailable" };
  const percentCap = condition.match(/(?:,\s*)?up to\s+\+?([+-]?\d+(?:\.\d+)?)\s*%/iu);
  const stackCap = condition.match(/(?:stacking\s+)?up to\s+(\d+)\s+time/iu);
  const per = perMetadata(condition, percentCap, stackCap);
  if (!per) return null;
  const operation = modifier.additional ? "more" : "add";
  const effects = modifier.stats.map((stat) => ({
    stat,
    operation,
    value,
    unit: "percent",
    conditionText: condition,
    per,
    sourceText: line,
  }));
  return { effects };
}

function typedCondition(condition) {
  const mappings = [
    [/critical strike.*recently/iu, "statuses.skill_critical_strike_recently"],
    [/while (?:the |this )?skill lasts/iu, "statuses.skill_active"],
    [/when (?:this |the )?skill is triggered|when this skill is triggered/iu, "statuses.skill_triggered"],
    [/frozen enem/iu, "statuses.target_frozen"],
    [/frostbitten enem/iu, "statuses.target_frostbitten"],
    [/at low life/iu, "statuses.minion_low_life"],
    [/while channeling|when (?:the |this )?skill is channeled/iu, "statuses.channeling"],
  ];
  const matched = mappings.find(([pattern]) => pattern.test(condition));
  if (!matched) return null;
  return {
    path: matched[1],
    operator: "truthy",
    expected: true,
  };
}

function parseDirectModifier(line, category, level) {
  const withoutLevels = withoutLevelAnnotations(line).replace(/[.]$/u, "");
  const { clause, condition } = conditionSplit(withoutLevels);
  const modifier = modifierPrefix(clause, category);
  if (!modifier) return null;
  const value = valueAtRequestedLevel(modifier.value, line, level);
  if (!Number.isFinite(value)) return { reason: "requested-level-value-unavailable" };
  const requirement = condition ? typedCondition(condition) : null;
  if (condition && !requirement) return { reason: "conditional-input-mapping-unavailable" };
  return {
    effects: modifier.stats.map((stat) => ({
      stat,
      operation: modifier.additional ? "more" : "add",
      value,
      unit: "percent",
      ...(condition ? {
        condition: requirement,
        conditionText: condition,
        conditionRequirements: [requirement],
      } : {}),
      sourceText: line,
    })),
  };
}

function parseFlatModifier(line, category) {
  const withoutLevels = withoutLevelAnnotations(line).replace(/[.]$/u, "");
  const match = withoutLevels.match(/^([+-]?\d+(?:\.\d+)?)\s+(.+)$/u);
  if (!match) return null;
  const stats = scopedModifier(match[2], category);
  if (!stats) return null;
  return {
    effects: stats.map((stat) => ({
      stat,
      operation: "add",
      value: Number(match[1]),
      unit: "flat",
      sourceText: line,
    })),
  };
}

function parseQuantityOrCap(line) {
  let match = line.match(/^Projectile Quantity of (?:the )?supported skill\s+([+-]\d+)\.?$/iu);
  if (match) return [{
    stat: "supported-skill-projectile-quantity",
    operation: "add",
    value: Number(match[1]),
    unit: "count",
    sourceText: line,
  }];

  match = line.match(/^(?:Channels up to|Max channeled stacks:)\s*(\d+)\s*(?:stacks?)?\.?$/iu);
  if (match) return [{
    stat: "max-channeled-stacks",
    operation: "set",
    value: Number(match[1]),
    unit: "count",
    sourceText: line,
  }];

  match = line.match(/^This skill's max base Terra quantity is\s+(\d+)\s*\.?$/iu);
  if (match) return [{
    stat: "skill-max-terra-quantity",
    operation: "set",
    value: Number(match[1]),
    unit: "count",
    sourceText: line,
  }];

  match = line.match(/^Stacks up to\s+(\d+)\s+time\(s\)\.?$/iu);
  if (match) return [{
    stat: "effect-stacks",
    operation: "set",
    value: Number(match[1]),
    unit: "count",
    sourceText: line,
  }];
  return null;
}

function parseClause(rawLine, category, level, item, season) {
  const line = normalizeLine(rawLine);
  const compatibility = category === "supports"
    ? getCurrentTlidbSupportCompatibility(item, { season })
    : null;
  if (compatibility?.sourceTexts.includes(line)) return {};
  const directParsers = [
    () => parsePersistentDamage(line),
    () => parseSupportedAddedDamage(line, category, level, season),
    () => parseDirectDamage(line),
    () => parseSelfDamage(line),
    () => parseDurationOrInterval(line),
    () => parseRestoration(line, level),
    () => parseCappedMovementSpeed(line, category),
    () => parseElixirDirectEffect(line, item),
    () => parseConversion(line, category),
    () => parseInheritedCap(line, category),
    () => parseQuantityOrCap(line),
  ];
  for (const parse of directParsers) {
    const outcome = parse();
    if (outcome) return Array.isArray(outcome) ? { effects: outcome } : outcome;
  }

  if (/^The Ignite inflicted is replaced with Scorch\.?$/iu.test(line)) {
    return { reason: "calculation-mechanic-without-structured-value" };
  }

  if (/\([+-]?\d+(?:\.\d+)?\s*-\s*[+-]?\d+(?:\.\d+)?\)/u.test(line)) {
    return { reason: "range-value-requires-selected-roll" };
  }

  const flatModifier = parseFlatModifier(line, category);
  if (flatModifier) return flatModifier;
  const perUnit = parsePerUnitModifier(line, category, level);
  if (perUnit) return perUnit;
  const modifier = parseDirectModifier(line, category, level);
  if (modifier) return modifier;

  if (/\bup to\b/iu.test(line)) return { reason: "capped-effect-pattern-unsupported" };
  if (/\b(?:for every|for each|per)\b/iu.test(line)) return { reason: "per-unit-effect-pattern-unsupported" };
  if (/\b(?:when|while|if|upon)\b/iu.test(line)) return { reason: "conditional-effect-pattern-unsupported" };
  if (levelAnchors(line).length) return { reason: "level-formula-pattern-unsupported" };
  if (/\d/u.test(line)) return { reason: "unsupported-numeric-tooltip-clause" };
  if (CALCULATION_WORD_PATTERN.test(line)) return { reason: "calculation-mechanic-without-structured-value" };
  return null;
}

function includedLineIndexes(lines) {
  const simple = lines.findIndex((line) => line.text === "Simple");
  const details = lines.findIndex((line) => line.text === "Details");
  const included = new Set();
  if (simple < 0) {
    lines.forEach(({ index }) => included.add(index));
    return included;
  }
  for (let index = 0; index < simple; index += 1) included.add(index);
  const start = details >= 0 ? details + 1 : simple + 1;
  for (let index = start; index < lines.length; index += 1) included.add(index);
  return included;
}

function activeEffects(effects, conditions) {
  if (!conditions || typeof conditions !== "object") return effects;
  return effects.filter(({ conditionText }) => (
    conditionText === undefined || conditions[conditionText] !== false
  ));
}

/**
 * Converts exact current TLIDB SS13 skill/support tooltip clauses into atomic
 * calculation effects. Optional conditions are keyed by the emitted conditionText
 * text; an explicit false value suppresses that conditional effect.
 */
export function parseTlidbSkillTooltipCalculation(item, options = {}) {
  const category = itemCategory(item);
  if (!category) return {
    effects: [],
    blockers: [{ sourceText: fallbackSourceText(item), reason: "unsupported-item-category" }],
  };

  const authority = exactCurrentLocale(item, options.season);
  if (!authority) return {
    effects: [],
    blockers: [{
      sourceText: fallbackSourceText(item),
      reason: `exact-current-${(options.season || "SS13").toLowerCase()}-locale-receipt-unavailable`,
    }],
  };

  const requestedLevel = options?.level ?? null;
  if (requestedLevel !== null && (!Number.isInteger(requestedLevel) || requestedLevel < 1)) {
    return {
      effects: [],
      blockers: [{ sourceText: authority.locale.detail, reason: "invalid-requested-level" }],
    };
  }

  const lines = authority.locale.detail.split(/\r?\n/u).map((raw, index) => ({
    index,
    raw: raw.trim(),
    text: normalizeLine(raw),
  }));
  const included = includedLineIndexes(lines);
  const consumed = new Set();
  const seenSources = new Set();
  const effects = [];
  const blockers = [];

  function record(outcome, sourceText) {
    if (!outcome || seenSources.has(sourceText)) return;
    seenSources.add(sourceText);
    if (outcome.effects) {
      effects.push(...activeEffects(outcome.effects, options?.conditions));
    } else if (outcome.reason) {
      blockers.push({ sourceText, reason: outcome.reason });
    }
  }

  for (const line of lines) {
    if (!included.has(line.index)) continue;
    const next = lines[line.index + 1];
    if (!next || !included.has(next.index)) continue;
    const outcome = parseHeader(
      item,
      authority.localeKey,
      line.text,
      next.text,
      requestedLevel,
      options.season,
    );
    if (!outcome) continue;
    consumed.add(line.index);
    consumed.add(next.index);
    record(outcome, outcome.sourceText);
  }

  for (const line of lines) {
    if (!included.has(line.index) || consumed.has(line.index) || !line.text) continue;
    if (line.text === "Simple" || line.text === "Details" || /:$/u.test(line.text)) continue;
    const outcome = parseClause(line.text, category, requestedLevel, item, options.season);
    record(outcome, line.text);
  }

  return { effects, blockers };
}
