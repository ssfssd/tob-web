const EXACT_STATUS = new Set(["exact", "exact-structural"]);

const MAIN_STAT_KEYS = Object.freeze({
  Strength: "strength",
  Dexterity: "dexterity",
  Intelligence: "intelligence",
});

export const TLIDB_HELP_CALCULATION_SOURCES = Object.freeze({
  characterBuild: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Character_Build",
    rules: Object.freeze([
      "life-level-strength",
      "mana-level-intelligence",
      "shield-intelligence",
      "evasion-level-dexterity",
      "resistance-level-penalty",
      "damage-stacking",
      "skill-speed-stacking",
    ]),
  }),
  skillLevel: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Skill_Level",
    rules: Object.freeze(["skill-level-over-20-additional-damage"]),
  }),
  mainStats: Object.freeze({
    sourceUrls: Object.freeze({
      strength: "https://tlidb.com/en/Strength",
      dexterity: "https://tlidb.com/en/Dexterity",
      intelligence: "https://tlidb.com/en/Intelligence",
    }),
    rules: Object.freeze(["main-stat-additional-skill-damage"]),
  }),
  movementSpeed: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Movement_Speed",
    sourceRecordKey: "Movement_Speed",
    sourcePageSha256: "60e7c5c5d4305d5ae39f7e0fef285dccb963f275dc4455007fdcf69358510faa",
    rules: Object.freeze(["base-movement-speed", "movement-speed-stacking"]),
  }),
  luckyDamage: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Lucky",
    sourceRecordKey: "Lucky",
    sourcePageSha256: "cffcbd177203aa1001309a599d5b12bce6461fb882f9d6bc275477ebdb5cab1c",
    rollCount: 2,
    rules: Object.freeze([
      "roll-damage-twice",
      "keep-more-favorable-result",
      "single-authoritative-random-damage-range",
    ]),
  }),
  spellBurst: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Spell_Burst",
    sourceRecordKey: "Spell_Burst",
    sourcePageSha256: "f7220c762bbd063931f277c93ed95040283ef8a1490b0c63943dc2cacca1b5ef",
    baseFullChargeSeconds: 2,
    rules: Object.freeze([
      "fully-charged-spell-activates-burst",
      "consume-all-stacks-and-auto-cast-same-count",
      "full-charge-time",
      "discrete-next-eligible-cast",
      "cooldown-summon-sentry-channel-triggered-ineligible",
    ]),
  }),
  shieldCharge: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Shield",
    sourceRecordKey: "Shield",
    sourcePageSha256: "8cb3dc91461929504e066038f72104402f3ad1734ca9a263675fd5d049120c2e",
    baseIntervalSeconds: 2,
    basePercentPerSecond: 20,
    rules: Object.freeze([
      "charge-after-no-damage-interval",
      "charge-only-below-maximum-shield",
      "hero-base-shield-charge-per-second",
    ]),
  }),
  regain: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Regain",
    sourceRecordKey: "Regain",
    sourcePageSha256: "60f59160385abe155486f5e324124d3619984419954a416af13cb84c3115bfd5",
    baseIntervalSeconds: 0.5,
    maximumPercent: 30,
    rules: Object.freeze([
      "restore-missing-life-or-shield-on-hit",
      "life-and-shield-regain-capped-at-30-percent",
      "life-and-shield-regain-intervals-are-separate",
    ]),
  }),
  armor: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Armor",
    sourceRecordKey: "Armor",
    sourcePageSha256: "bbb87d6b603626f5b04a66a482df904190db20b859e41fd1fb71d563778c85d8",
    rules: Object.freeze([
      "monster-armor-damage-reduction",
      "non-physical-armor-reduction-ratio",
      "armor-damage-reduction-cap",
    ]),
  }),
  resistance: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Resistance",
    sourceRecordKey: "Resistance",
    sourcePageSha256: "5f5edf39887e3b71b44e354e5268f6f0cb58b894eb32f4a6ad1f8397dc7dfe79",
    rules: Object.freeze([
      "resistance-direct-damage-reduction",
      "default-max-resistance",
      "absolute-max-resistance-cap",
    ]),
  }),
  resistancePenetration: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Resistance_Penetration",
    sourceRecordKey: "Resistance_Penetration",
    rules: Object.freeze([
      "effective-resistance-penetration",
      "all-damage-form-penetration",
    ]),
  }),
  armorDamageMitigationPenetration: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Armor_DMG_Mitigation_Penetration",
    sourceRecordKey: "Armor_DMG_Mitigation_Penetration",
    rules: Object.freeze([
      "armor-reduction-percentage-point-penetration",
      "hit-only",
      "negative-mitigation",
    ]),
  }),
  affliction: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Amplified_Damage_Over_Time",
    sourceRecordKey: "Amplified_Damage_Over_Time",
    sourcePageSha256: "f139e1836c88f51d901d0bcd2d9430bd21dd3b2323618d5e2e95545d1ccf5e65",
    rules: Object.freeze([
      "affliction-rating-cap-100",
      "one-percent-additional-dot-taken-per-rating",
      "affliction-effect-scaling",
    ]),
  }),
  reaping: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Damage_Over_Time_Reaping",
    sourceRecordKey: "Damage_Over_Time_Reaping",
    sourcePageSha256: "ecdd76fc2b8196548b7b42eabb62395efb5ab1d5479bc9dc761f0f177e46570c",
    recoveryFormulaSourceUrl: "https://tlidb.com/ko/Cooldown",
    recoveryFormulaSourceRecordKey: "Cooldown",
    recoveryFormulaSourcePageSha256: "580ce84e2bdec5bf4293e8b1bc59e6fb4a3a9f08db6c2440683500376f8b520f",
    rules: Object.freeze([
      "settle-own-active-damage-over-time",
      "settled-duration-deals-equal-true-damage",
      "reaping-duration-scaling",
      "reaping-recovery-cadence",
    ]),
  }),
});

export const TLIDB_BASE_MOVEMENT_SPEED_METERS = 6.5;
export const TLIDB_DEFAULT_MAX_RESISTANCE = 60;
export const TLIDB_ABSOLUTE_MAX_RESISTANCE = 90;

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeTlidbLevel(value, maximum = 100) {
  return Math.max(1, Math.min(maximum, Math.round(finiteNumber(value) || 1)));
}

export function getTlidbHeroLevelBaseStats(level) {
  const normalizedLevel = normalizeTlidbLevel(level);
  const gainedLevels = normalizedLevel - 1;
  const penaltyCount = [48, 58, 80].filter((threshold) => normalizedLevel >= threshold).length;
  const resistancePenalty = penaltyCount === 0 ? 0 : -20 * penaltyCount;
  return Object.freeze({
    life: 50 + gainedLevels * 13,
    mana: 40 + gainedLevels * 5,
    evasion: gainedLevels * 3,
    fireResist: resistancePenalty,
    coldResist: resistancePenalty,
    lightningResist: resistancePenalty,
    erosionResist: resistancePenalty,
  });
}

export function getTlidbAttributeDerivedEffects(stats = {}) {
  const strength = finiteNumber(stats.strength);
  const dexterity = finiteNumber(stats.dexterity);
  const intelligence = finiteNumber(stats.intelligence);
  return Object.freeze([
    Object.freeze({ stat: "life", operation: "add", value: strength * 0.2, rule: "life-strength" }),
    Object.freeze({ stat: "mana", operation: "add", value: intelligence * 0.5, rule: "mana-intelligence" }),
    Object.freeze({ stat: "shield", operation: "increase", value: intelligence * 0.05, rule: "shield-intelligence" }),
    Object.freeze({ stat: "evasion", operation: "increase", value: dexterity * 0.02, rule: "evasion-dexterity" }),
  ]);
}

function exactCurrentSs13EnglishDetail(item) {
  const locale = item?.tlidbText?.en;
  if (
    locale?.sourcePageVersion !== "SS13"
    || locale?.sourceSeasonEvidence?.verificationComplete !== true
    || !EXACT_STATUS.has(locale?.sourceFieldStatus?.detail)
    || typeof locale.detail !== "string"
  ) return "";
  return locale.detail;
}

export function getTlidbSkillMainStats(item) {
  const detail = exactCurrentSs13EnglishDetail(item);
  if (!detail) return Object.freeze([]);
  const lines = detail.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const values = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^Main Stat\s*:/i.test(line)) continue;
    const inline = line.replace(/^Main Stat\s*:\s*/i, "");
    const candidates = inline ? [inline] : [lines[index + 1] ?? ""];
    for (const candidate of candidates) {
      for (const [label, stat] of Object.entries(MAIN_STAT_KEYS)) {
        if (new RegExp(`(?:^|[,/&+\\s])${label}(?:$|[,/&+\\s])`, "i").test(candidate)) values.push(stat);
      }
    }
  }
  return Object.freeze([...new Set(values)]);
}

export function getTlidbMainStatAdditionalDamagePercent(item, stats = {}) {
  return getTlidbSkillMainStats(item).reduce(
    (total, stat) => total + finiteNumber(stats[stat]) * 0.5,
    0,
  );
}

export function getTlidbSkillLevelAdditionalDamageMultiplier(level) {
  const normalizedLevel = normalizeTlidbLevel(level, Number.MAX_SAFE_INTEGER);
  const levels21To30 = Math.min(Math.max(normalizedLevel - 20, 0), 10);
  const levels31AndAbove = Math.max(normalizedLevel - 30, 0);
  return (1.1 ** levels21To30) * (1.08 ** levels31AndAbove);
}

export function getTlidbMovementSpeedMeters(nonAdditionalPercent = 0) {
  const percent = Number(nonAdditionalPercent);
  return TLIDB_BASE_MOVEMENT_SPEED_METERS * (1 + (Number.isNaN(percent) ? 0 : percent) / 100);
}

export function getTlidbLuckyDamageExpectedValue(minimum, maximum) {
  const min = Number(minimum);
  const max = Number(maximum);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
  const rollCount = TLIDB_HELP_CALCULATION_SOURCES.luckyDamage.rollCount;
  const expected = min + (max - min) * rollCount / (rollCount + 1);
  return Math.round((expected + Number.EPSILON) * 1e12) / 1e12;
}

export function getTlidbSpellBurstCadence(
  baseActionRate,
  maximumStacks,
  { chargeSpeedIncrease = 0, chargeSpeedMore = 1 } = {},
) {
  const actionRate = Math.max(0, finiteNumber(baseActionRate));
  const stacks = Math.max(0, Math.floor(finiteNumber(maximumStacks)));
  const increasedSpeed = Math.max(0, 1 + finiteNumber(chargeSpeedIncrease) / 100);
  const moreSpeed = Math.max(0, finiteNumber(chargeSpeedMore));
  const chargeSpeedMultiplier = increasedSpeed * moreSpeed;
  const fullChargeSeconds = chargeSpeedMultiplier > 0
    ? TLIDB_HELP_CALCULATION_SOURCES.spellBurst.baseFullChargeSeconds / chargeSpeedMultiplier
    : null;
  const castsBetweenActivations = actionRate > 0 && stacks > 0 && fullChargeSeconds !== null
    ? Math.max(1, Math.ceil(fullChargeSeconds * actionRate))
    : null;
  const activationRate = castsBetweenActivations === null ? 0 : actionRate / castsBetweenActivations;
  const extraCastRate = activationRate * stacks;
  const round = (value) => Math.round((value + Number.EPSILON) * 1e12) / 1e12;
  return Object.freeze({
    baseActionRate: round(actionRate),
    maximumStacks: stacks,
    fullChargeSeconds: fullChargeSeconds === null ? null : round(fullChargeSeconds),
    castsBetweenActivations,
    activationRate: round(activationRate),
    extraCastRate: round(extraCastRate),
    effectiveActionRate: round(actionRate + extraCastRate),
  });
}

export function getTlidbShieldChargePerSecond(
  maximumShield,
  { active = false, hasHero = false, chargeSpeedBonus = 0 } = {},
) {
  if (!active || !hasHero) return 0;
  const shield = Math.max(0, finiteNumber(maximumShield));
  const percent = TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.basePercentPerSecond
    * (1 + finiteNumber(chargeSpeedBonus) / 100);
  return Math.round((shield * percent / 100 + Number.EPSILON) * 1e12) / 1e12;
}

export function getTlidbRegainPerHit(missingResource, maximumResource, regainPercent) {
  const missing = Math.min(
    Math.max(0, finiteNumber(missingResource)),
    Math.max(0, finiteNumber(maximumResource)),
  );
  const percent = Math.min(
    TLIDB_HELP_CALCULATION_SOURCES.regain.maximumPercent,
    Math.max(0, finiteNumber(regainPercent)),
  );
  return Math.round((missing * percent / 100 + Number.EPSILON) * 1e12) / 1e12;
}

export function getTlidbRegainIntervalSeconds(additionalPercent = 0) {
  const multiplier = 1 + finiteNumber(additionalPercent) / 100;
  return Math.max(0, TLIDB_HELP_CALCULATION_SOURCES.regain.baseIntervalSeconds * multiplier);
}

export function getTlidbMonsterArmorDamageReduction(armor) {
  const value = Number(armor);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(0.8, value / (0.9 * value + 30_000));
}

export function getTlidbArmorHitDamageMultiplier(
  armor,
  damageType = "physical",
  armorDamageMitigationPenetration = 0,
) {
  const reduction = getTlidbMonsterArmorDamageReduction(armor);
  const appliedReduction = damageType === "physical" ? reduction : reduction * 0.6;
  const penetration = Number(armorDamageMitigationPenetration);
  const penetratedReduction = appliedReduction - (Number.isFinite(penetration) ? penetration : 0) / 100;
  return Math.round((1 - penetratedReduction) * 1e12) / 1e12;
}

export function normalizeTlidbMaximumResistance(maximumResistance) {
  const maximum = Number(maximumResistance);
  return Number.isFinite(maximum)
    ? Math.min(TLIDB_ABSOLUTE_MAX_RESISTANCE, Math.max(0, maximum))
    : TLIDB_DEFAULT_MAX_RESISTANCE;
}

export function getTlidbEffectiveResistance(
  resistance,
  maximumResistance = TLIDB_DEFAULT_MAX_RESISTANCE,
) {
  const value = Number(resistance);
  if (!Number.isFinite(value)) return 0;
  const safeMaximum = normalizeTlidbMaximumResistance(maximumResistance);
  return Math.min(value, safeMaximum);
}

export function getTlidbPenetratedResistance(
  resistance,
  resistancePenetration = 0,
  maximumResistance = TLIDB_DEFAULT_MAX_RESISTANCE,
) {
  const effectiveResistance = getTlidbEffectiveResistance(resistance, maximumResistance);
  const penetration = Number(resistancePenetration);
  return effectiveResistance - (Number.isFinite(penetration) ? penetration : 0);
}

export function getTlidbResistanceDamageMultiplier(
  resistance,
  maximumResistance = TLIDB_DEFAULT_MAX_RESISTANCE,
  resistancePenetration = 0,
) {
  const penetratedResistance = getTlidbPenetratedResistance(
    resistance,
    resistancePenetration,
    maximumResistance,
  );
  return Math.round((1 - penetratedResistance / 100) * 1e12) / 1e12;
}

export function getTlidbAfflictionDamageMultiplier(
  affliction,
  { effectIncrease = 0, effectMore = 1 } = {},
) {
  const ratingValue = Number(affliction);
  const increaseValue = Number(effectIncrease);
  const moreValue = Number(effectMore);
  const rating = Number.isFinite(ratingValue)
    ? Math.min(100, Math.max(0, ratingValue))
    : 0;
  const increase = Number.isFinite(increaseValue) ? increaseValue : 0;
  const more = Number.isFinite(moreValue) ? moreValue : 1;
  const effectiveRating = rating * (1 + increase / 100) * more;
  return Math.round((1 + effectiveRating / 100) * 1e12) / 1e12;
}

export function getTlidbReapingDamage(dotDps, options = {}) {
  const {
    durationSeconds = 0,
    durationIncrease = 0,
    durationMore = 1,
    baseRecoverySeconds = null,
    recoverySpeedIncrease = 0,
    recoverySpeedMore = 1,
  } = options;
  const safeDotDps = Math.max(0, finiteNumber(dotDps));
  const safeDuration = Math.max(0, finiteNumber(durationSeconds));
  const safeIncrease = Math.max(-100, finiteNumber(durationIncrease));
  const safeMore = Math.max(0, finiteNumber(durationMore));
  const hasRecoveryTime = baseRecoverySeconds !== null
    && baseRecoverySeconds !== undefined
    && baseRecoverySeconds !== ""
    && Number.isFinite(Number(baseRecoverySeconds))
    && Number(baseRecoverySeconds) > 0;
  const safeBaseRecovery = hasRecoveryTime ? Number(baseRecoverySeconds) : null;
  const safeRecoveryIncrease = Math.max(-100, finiteNumber(recoverySpeedIncrease));
  const safeRecoveryMore = Math.max(0, finiteNumber(recoverySpeedMore));
  const recoveryFactor = (1 + safeRecoveryIncrease / 100) * safeRecoveryMore;
  const effectiveRecoverySeconds = hasRecoveryTime && recoveryFactor > 0
    ? safeBaseRecovery / recoveryFactor
    : null;
  const hasManualEvents = Object.hasOwn(options, "eventsPerSecond");
  const safeEvents = hasManualEvents
    ? Math.max(0, finiteNumber(options.eventsPerSecond))
    : effectiveRecoverySeconds > 0
      ? 1 / effectiveRecoverySeconds
      : 0;
  const effectiveDurationSeconds = safeDuration * (1 + safeIncrease / 100) * safeMore;
  const damagePerEvent = safeDotDps * effectiveDurationSeconds;
  const dps = damagePerEvent * safeEvents;
  const rounded = (value) => Math.round((value + Number.EPSILON) * 1e12) / 1e12;
  return Object.freeze({
    baseDotDps: rounded(safeDotDps),
    durationSeconds: rounded(safeDuration),
    durationIncrease: rounded(safeIncrease),
    durationMore: rounded(safeMore),
    effectiveDurationSeconds: rounded(effectiveDurationSeconds),
    ...(hasRecoveryTime ? {
      baseRecoverySeconds: rounded(safeBaseRecovery),
      recoverySpeedIncrease: rounded(safeRecoveryIncrease),
      recoverySpeedMore: rounded(safeRecoveryMore),
      effectiveRecoverySeconds: effectiveRecoverySeconds === null
        ? null
        : rounded(effectiveRecoverySeconds),
    } : {}),
    eventsPerSecond: rounded(safeEvents),
    ...(hasRecoveryTime ? {
      cadenceSource: hasManualEvents ? "manual" : "recovery-time",
    } : {}),
    damagePerEvent: rounded(damagePerEvent),
    dps: rounded(dps),
  });
}
