import { CATALOG, CATEGORY_DEFS, findItemById } from "./catalog.js";
import { ACTIVE_DIVINITY_MODEL } from "./activeDivinityData.js";
import { loadGearLocaleRegistry } from "./activeGearLocaleData.js";
import { loadActiveHeroMemoryDataset } from "./activeHeroMemoryData.js";
import { createBuildDocument, normalizeBuildDocument } from "./buildDocument.js";
import { CALCULATION_TRACE_VERSION, createEffect } from "./calculation/effects.js";
import { createPanelAccumulator } from "./calculation/panelAccumulator.js";
import { CURRENT_PATCH_SNAPSHOT, normalizePatchSnapshot } from "./calculation/patchSnapshot.js";
import { createProvenanceSource, summarizeCalculationProvenance } from "./calculation/provenance.js";
import { getSupportConditionAuthority } from "./conditionAuthorityMappings.js";
import {
  diagnoseConditions,
  normalizeConditionState,
  resolveConditionValues,
} from "./conditionModel.js";
import { projectDivinityCalculation } from "./divinityCalculationRuntime.js";
import {
  TLIDB_DIVINITY_REGAIN_CAPABILITY,
  adaptTlidbDivinityProjectionEffects,
} from "./tlidbDivinityProjectionAdapter.js";
import { isSs13PreviewCatalogItem, isSs13PreviewHeroCatalogItem } from "./heroSeasonScope.js";
import { projectPactDestinyCalculation } from "./pactDestinyModel.js";
import { PACT_CALCULATION_MODEL } from "./pactCalculationRuntime.js";
import {
  adaptTlidbPactProjectionEffects,
  getVerifiedPactProjectionSourceIdentity,
} from "./tlidbPactProjectionAdapter.js";
import {
  adaptTlidbHeroTraitProjectionEffects,
  loadTlidbHeroTraitCalculationRuntime,
} from "./tlidbHeroTraitProjectionAdapter.js";
import { adaptTlidbHeroMemoryProjectionEffects } from "./tlidbHeroMemoryProjectionAdapter.js";
import { getExternalMainSkillOverride, getSkillEnergyUsage } from "./skillRuntimeModel.js";
import { hasCurrentSs13SupportDamageAuthority } from "./ss13SkillCalculationAuthority.js";
import {
  getTlidbCalculationAuthority,
  hasTlidbCalculationAuthority,
  hasTlidbParsedCalculationAuthority,
} from "./tlidbCalculationAuthority.js";
import { evaluateTlidbActiveSkillManaCost } from "./tlidbActiveSkillManaCostRuntime.js";
import { evaluateTlidbActiveSkillCooldown } from "./tlidbActiveSkillCooldownRuntime.js";
import { evaluateTlidbBuildSkillRow } from "./tlidbBuildSkillRuntime.js";
import { isCurrentTlidbSupportCompatible } from "./tlidbSupportCompatibility.js";
import {
  isTlidbElixirMainSkillId,
  projectTlidbElixirCalculation,
} from "./tlidbElixirCalculationRuntime.js";
import {
  projectTlidbBuildModularizationCalculation,
  projectTlidbModularizationCalculation,
} from "./tlidbModularizationCalculationRuntime.js";
import { evaluateTlidbPassiveSkill } from "./tlidbPassiveSkillRuntime.js";
import {
  isTlidbGearCraftCombatEffect,
  resolveTlidbGearCraftSelections,
} from "./tlidbGearCraftSelectionRuntime.js";
import { createTlidbGearCraftTooltipCalculation } from "./tlidbGearCraftTooltipCalculation.js";
import {
  TLIDB_ABSOLUTE_MAX_RESISTANCE,
  TLIDB_DEFAULT_MAX_RESISTANCE,
  TLIDB_HELP_CALCULATION_SOURCES,
  getTlidbAttributeDerivedEffects,
  getTlidbHeroLevelBaseStats,
  getTlidbMainStatAdditionalDamagePercent,
  getTlidbMovementSpeedMeters,
  normalizeTlidbMaximumResistance,
  getTlidbRegainIntervalSeconds,
  getTlidbRegainPerHit,
  getTlidbShieldChargePerSecond,
  getTlidbSkillLevelAdditionalDamageMultiplier,
} from "./tlidbHelpCalculationRuntime.js";
import { resolveTlidbTooltipEffects } from "./tlidbTooltipEffectRuntime.js";
import { getSelectedGearAuthority } from "./selectedGearAuthority.js";
import { projectTlidbGearTooltipRollValues } from "./tlidbGearTooltipCalculation.js";
import {
  TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT,
  TLIDB_MANA_REGEN_PERCENT_PER_SECOND_STAT,
  mapTlidbTooltipEffects,
} from "./tlidbTooltipStatMapping.js";
import { adaptTlidbTalentProjectionEffects } from "./tlidbTalentProjectionAdapter.js";
import { projectTalentBoardCalculation } from "./talentBoardModel.js";
import { TALENT_CALCULATION_MODEL } from "./talentCalculationRuntime.js";
import { TLIDB_SS13_FLAT_CHANGES } from "./data/tlidbSs13FlatChanges.generated.js";
import { createCurrentSs13GearCalculationAuthority } from "./gearCalculationAuthority.js";
import {
  FIREBIRD_CURRENT_SS13_ITEM_ID,
  createCurrentSs13FirebirdGearCalculationProfile,
  projectCurrentSs13FirebirdGearCalculation,
} from "./firebirdGearCalculationProfile.js";

// Craft definitions participate in calculation, so they must be active before
// any caller can calculate a saved build. Locale UI demand must not control it.
const activeGearLocaleRegistry = await loadGearLocaleRegistry();
const activeHeroTraitCalculationRuntime = await loadTlidbHeroTraitCalculationRuntime(CATALOG.hero);
const activeHeroMemoryCalculationRuntime = await loadActiveHeroMemoryDataset();
const currentGearCalculationAuthority = createCurrentSs13GearCalculationAuthority({
  gear: CATALOG.gear,
  registry: activeGearLocaleRegistry,
});
const currentTlidbGearCraftCalculation = createTlidbGearCraftTooltipCalculation({
  gear: CATALOG.gear,
  registry: activeGearLocaleRegistry,
});
export const CURRENT_FIREBIRD_GEAR_CALCULATION_PROFILE =
  createCurrentSs13FirebirdGearCalculationProfile({
    item: CATALOG.gear.find(({ id }) => id === FIREBIRD_CURRENT_SS13_ITEM_ID),
    registry: activeGearLocaleRegistry,
  });

export const CURRENT_GEAR_CALCULATION_AUDIT = currentGearCalculationAuthority.audit;
export const CURRENT_TLIDB_GEAR_CRAFT_CALCULATION_AUDIT =
  currentTlidbGearCraftCalculation.audit;

export function inspectSelectedGearCrafts(item, crafts = {}) {
  return resolveTlidbGearCraftSelections({ item, selectedCrafts: crafts, calculation: currentTlidbGearCraftCalculation });
}

const currentGearCalculationSupportLevelByItemId = new Map(
  CURRENT_GEAR_CALCULATION_AUDIT.items.map((item) => [item.itemId, item.supportLevel]),
);

export function hasCompleteCurrentSs13GearCalculation(itemId) {
  return currentGearCalculationSupportLevelByItemId.get(itemId) === "complete";
}

export const BASE_STATS = {
  dps: 0,
  speed: 0,
  crit: 0,
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  life: 0,
  mana: 0,
  shield: 0,
  energy: 0,
  fireResist: 0,
  coldResist: 0,
  lightningResist: 0,
  erosionResist: 0,
  maxFireResist: 0,
  maxColdResist: 0,
  maxLightningResist: 0,
  maxErosionResist: 0,
  manaSealCompensation: 0,
  auraEffect: 0,
  auraSkillLevelBonus: 0,
  maxBondStacks: 0,
  bondGainSpeedBonus: 0,
  reapingTriggerDelaySeconds: 0,
  warcryEffectBonus: 0,
  spellBurstChargeSpeedBonus: 0,
  damageTakenAdditionalPercent: 0,
  distinctDestinyDamageTakenReductionPercent: 0,
  defenseBonusPercent: 0,
  demolisherChargeRestorationSpeedBonus: 0,
  smartWeaponMinionPhysiqueBonus: 0,
  smartWeaponMinionDoubleDamageChance: 0,
  infusionSpeed: 0,
  curseEffect: 0,
  additionalCurseCapacity: 0,
  paralysisEffect: 0,
  receivedCurseEffect: 0,
  receivedNumbedEffect: 0,
  receivedSlowEffect: 0,
  receivedParalysisEffect: 0,
  receivedWeakenEffect: 0,
  multistrikeChance: 0,
  multistrikeDamageIncrementPercent: 0,
  aggravationChance: 0,
  igniteChance: 0,
  igniteDurationAdditionalPercent: 0,
  igniteLimit: 0,
  steepStrikeChance: 0,
  steepStrikeDamageAdditionalPercent: 0,
  aggravationDurationBonus: 0,
  receivedIgniteDamageAdditionalPercent: 0,
  receivedIgniteEffectPercent: 0,
  receivedWiltDamagePercent: 0,
  receivedTraumaDamagePercent: 0,
  traumaImmunity: 0,
  wiltImmunity: 0,
  igniteImmunity: 0,
  elementalAilmentImmunity: 0,
  controlImmunity: 0,
  gainFortitudeOnMeleeSkillUse: 0,
  maxFortitudeStacksBonus: 0,
  blindImmunity: 0,
  blindNearbyEnemiesOnAttackProjectileUse: 0,
  sentryFreezesNearbyEnemies: 0,
  tenacityBlessingStacksGainedOnRegain: 0,
  agilityBlessingGainIntervalSeconds: 0,
  agilityBlessingStacksGainedWhileMoving: 0,
  focusBlessingStacksGainedOnNonMainSkillUse: 0,
  commandPerSecond: 0,
  spiritMagusInitialGrowth: 0,
  rockMagusOriginEffectLevel: 0,
  fireMagusOriginEffectLevel: 0,
  thunderMagusOriginEffectLevel: 0,
  frostMagusOriginEffectLevel: 0,
  erosionMagusOriginEffectLevel: 0,
  spiritMagusCoreEffect: 0,
  preciseAcutenessFocusBuffLevel: 0,
  preciseCorrosionFocusBuffLevel: 0,
  preciseRegenerationBuffLevel: 0,
  focusBuffEffectBonus: 0,
  allSkillLevelBonus: 0,
  currentLifeAndShieldLossOnSkillCastPercent: 0,
  defensiveSkillLevelBonus: 0,
  defensiveSkillEffectBonus: 0,
  comboFinisherChargeBonus: 0,
  comboSequenceResetTimeSeconds: 0,
  comboStarterReverseKnockbackRadiusMeters: 0,
  comboStarterReverseKnockbackDistanceMeters: 0,
  comboStarterReverseKnockbackAffectedBySkillArea: 0,
  recentComboFinisherKnockbackDistancePerStackPercent: 0,
  recentComboFinisherKnockbackMaxStacks: 0,
  omenTriggerNearbyNonEliteEnemyCount: 0,
  omenInflictionStacksPerEnemy: 0,
  blazingSunActive: 0,
  resurrectionWarcryOnHitActive: 0,
  resurrectionWarcryTriggerLevel: 0,
  resurrectionWarcryTriggerIntervalSeconds: 0,
  alternatingDelayedPainAndFrostShieldActive: 0,
  delayedPainLevel: 0,
  frostShieldLevel: 0,
  alternatingBuffIntervalSeconds: 0,
  alternatingBuffDurationSeconds: 0,
  maxDeflectionBonus: 0,
  voidGhostSphereGainIntervalSeconds: 0,
  maxVoidGhostSphereStacks: 0,
  spiritMagusEnhancedSkillChance: 0,
  spiritMagusDamagePerOwnedMagusAdditionalPercent: 0,
  intimidatedOnHitChance: 0,
  skillEffectDurationBonus: 0,
  minionMaxLifeBonus: 0,
  spiritMagusCooldownRecoverySpeedBonus: 0,
  criticalDamageReduction: 0,
  maxSyntheticTroopQuantity: 0,
  maxTangleQuantity: 0,
  tangleDurationBonus: 0,
  sentrySkillCastFrequencyAdditionalPercent: 0,
  sentryDurationBonus: 0,
  sentrySkillCastSpeedAdditionalPercent: 0,
  maxSentryCount: 0,
  sealedManaPercent: 0,
  doubleDamageChance: 0,
  elementalAndErosionResistancePenetration: 0,
  armorDamageMitigationPenetration: 0,
  damageBonus: 0,
  mainHandAttackSpeed: 0,
  offHandAttackSpeed: 0,
  attackSpeedBonus: 0,
  attackSpeedMore: 0,
  mainHandAttackCrit: 0,
  attackCritDamage: 0,
  projectileCount: 0,
  projectileSpeedBonus: 0,
  projectileDurationBonus: 0,
  attackHorizontalProjectileSpeedBonus: 0,
  terraSkillDurationBonus: 0,
  terraSkillAreaBonus: 0,
  terraChargeRecoverySpeedBonus: 0,
  skillAreaBonus: 0,
  curseSkillAreaBonus: 0,
  shadowTrackingAreaBonus: 0,
  shadowStrikeSkillAreaBonus: 0,
  armor: 0,
  armorBonus: 0,
  armorToBarrierAbsorptionPercent: 0,
  barrierAbsorptionFromArmor: 0,
  evasion: 0,
  blockChance: 0,
  attackBlockChance: 0,
  spellBlockChance: 0,
  blockRatio: 0,
  damageReduction: 0,
  damageImmunityChance: 0,
  defenseBonusWhileBlurPercent: 0,
  illOmenCumulativeEfficiencyWhileBlurPercent: 0,
  damageTakenTransferredToRandomMinionPercent: 0,
  minionKillExplosionChancePercent: 0,
  minionKillExplosionEnemyMaxLifeDamagePercent: 0,
  minionKillExplosionRadiusMeters: 0,
  cursedEnemyKillExplosionChancePercent: 0,
  cursedEnemyKillExplosionEnemyMaxLifeTrueDamagePercent: 0,
  cursedEnemyKillExplosionRadiusMeters: 0,
  cooldownRecoverySpeedBonus: 0,
  maximumFrostbiteRating: 0,
  damageTakenFromManaBeforeLifePercent: 0,
  physicalDamageTakenConvertedToRandomElementPercent: 0,
  elixirChargeProgressOnCriticalStrike: 0,
  elixirChargeProgressOnReaping: 0,
  elixirChargeProgressPerSixMetersMoved: 0,
  elixirChargeProgressPerSecond: 0,
  overflowLifeRecoveryAppliedToShieldPercent: 0,
  maximumShieldPerSelfAndMinionDamageStep: 0,
  selfAndMinionDamageMorePerMaximumShieldStepPercent: 0,
  selfAndMinionDamageMoreFromMaximumShieldCapPercent: 0,
  selfAndMinionKillExplosionChancePercent: 0,
  selfAndMinionKillExplosionEnemyMaxLifeTrueDamagePercent: 0,
  selfAndMinionKillExplosionRadiusMeters: 0,
  selfAndMinionDamageMorePercent: 0,
  blockChanceAdditionalIncreasePercent: 0,
  blockedDamageTrueDamageTakenPercentPerSecond: 0,
  blockedDamageTrueDamageDurationSeconds: 0,
  lifeRegenerationRateBonus: 0,
  lifeRegenPerSecond: 0,
  lifeRecoveryOnDefeatPercent: 0,
  lifeRegainPercent: 0,
  lifeRegainPerHit: 0,
  lifeRegainIntervalSeconds: 0,
  shieldRegenPerSecond: 0,
  shieldRecoveryOnDefeatPercent: 0,
  shieldRegainPercent: 0,
  shieldRegainPerHit: 0,
  shieldRegainIntervalSeconds: 0,
  shieldChargeSpeedBonus: 0,
  shieldChargeIntervalSeconds: 0,
  manaRegenPerSecond: 0,
  physicalEhp: 0,
  fireEhp: 0,
  coldEhp: 0,
  lightningEhp: 0,
  erosionEhp: 0,
  physicalMaxHit: 0,
  fireMaxHit: 0,
  coldMaxHit: 0,
  lightningMaxHit: 0,
  erosionMaxHit: 0,
  movementSpeedBonus: 0,
  movementSpeedMeters: 0,
  calculationPanelDamage: 0,
};

const MAX_RESISTANCE_STAT_KEYS = new Set([
  "maxFireResist",
  "maxColdResist",
  "maxLightningResist",
  "maxErosionResist",
]);
const SHIELD_FROM_MAX_LIFE_PERCENT_STAT = "shieldFromMaxLifePercent";

const VERIFIED_SS13_DELETION_KEYS = new Set(
  (TLIDB_SS13_FLAT_CHANGES.verifiedDeletions ?? []).map(
    ({ category, itemId }) => `${category}:${itemId}`,
  ),
);

const CALCULATION_UNSUPPORTED_PACT_IDS = new Set(
  [
    ...(PACT_CALCULATION_MODEL.sourceOnlySpirits ?? []),
    ...(PACT_CALCULATION_MODEL.sourceOnlyDestinies ?? []),
  ].map(({ catalogId, id }) => catalogId ?? id),
);

// 91TOB 원본 실측 기본 상수 (2026-07-09, 어픽스 무관 값만).
// 측정 근거: docs/91tob-calibration-notes.md
const BASE_ATTACK_SPEED = 1.5; // 무기 없을 때 기본 공격 속도(초당)
const BASE_CRIT_CHANCE = 5; // 기본 치명타 확률(%)
const BASE_CRIT_DAMAGE = 150; // 기본 치명타 피해(%)
export const UNSUPPORTED_DEFENSIVE_STAT_KEYS = Object.freeze([
  "physicalEhp",
  "fireEhp",
  "coldEhp",
  "lightningEhp",
  "erosionEhp",
  "physicalMaxHit",
  "fireMaxHit",
  "coldMaxHit",
  "lightningMaxHit",
  "erosionMaxHit",
]);
const UNSUPPORTED_DEFENSIVE_STAT_KEY_SET = new Set(UNSUPPORTED_DEFENSIVE_STAT_KEYS);

function hasCurrentCalculationValueAuthority(item) {
  return item?.calculationValueAuthority === true
    || item?.calculationValueAuthority === "tlidb-current-ss13"
    || hasTlidbParsedCalculationAuthority(item)
    || hasTlidbCalculationAuthority(item)
    || hasCurrentSs13SupportDamageAuthority(item);
}

function getCalculationItemLabel(item, fallback = "") {
  const koNameStatus = item?.tlidbText?.ko?.sourceFieldStatus?.name;
  const exactKoName = typeof item?.tlidbText?.ko?.name === "string"
    && item.tlidbText.ko.name
    && (koNameStatus === "exact" || koNameStatus === undefined)
    ? item.tlidbText.ko.name
    : "";
  return exactKoName
    || item?.nameKo
    || (item?.displayLocale === "ko" ? item?.name : "")
    || fallback
    || item?.id
    || "TLIDB 항목";
}

function isUnverifiedSkillValueProfile(item) {
  const categoryId = item?.categoryId
    || (item?.id?.startsWith("skills-") ? "skills" : "")
    || (item?.id?.startsWith("supports-") ? "supports" : "");
  return (categoryId === "skills" || categoryId === "supports")
    && !hasCurrentCalculationValueAuthority(item);
}

function getCalculationUnsupportedReason(item) {
  if (isUnverifiedSkillValueProfile(item)) return "value-authority-unverified";
  return "unsupported-effect";
}

function getExternalSkillUnsupportedReason(externalMain) {
  return externalMain?.skill?.calculationUnsupportedReason || "source-conflict";
}

function isCalculationUnsupportedItem(item) {
  if (CALCULATION_UNSUPPORTED_PACT_IDS.has(item?.id)) return true;
  if (hasTlidbParsedCalculationAuthority(item) || hasTlidbCalculationAuthority(item)) return false;
  return item?.calculationSupported === false
    || isUnverifiedSkillValueProfile(item);
}

function getItemStats(item) {
  if (isCalculationUnsupportedItem(item)) return {};
  const tlidbAuthority = getTlidbCalculationAuthority(item);
  if (item.categoryId === "gear") return tlidbAuthority?.stats ?? {};
  if (item.stats && Object.keys(item.stats).length) return item.stats;
  if (tlidbAuthority) return tlidbAuthority.stats;
  return {};
}

function hasStructuredGearCalculationData(item) {
  return currentGearCalculationAuthority.itemHasSupportedFields(item?.id);
}

export function getItemCalcProfile(item) {
  if (isCalculationUnsupportedItem(item)) return "displayOnly";
  if (item.categoryId === "gear") {
    return hasStructuredGearCalculationData(item) || hasTlidbCalculationAuthority(item) ? "runtime" : "displayOnly";
  }
  if (item.skillProfile?.coefficientByLevel) return "runtime";
  if (item.supportProfile) return "runtime";
  if (hasTlidbParsedCalculationAuthority(item)) return "runtime";
  if (hasTlidbCalculationAuthority(item)) return "runtime";
  if (item.stats && Object.keys(item.stats).length) return "runtime";
  if (item.rolls?.length) return "runtime";
  return "displayOnly";
}

function valueAtLevel(valuesByLevel = {}, level = 1) {
  const target = Math.max(1, Math.round(Number(level) || 1));
  const exact = Number(valuesByLevel[String(target)]);
  if (Number.isFinite(exact)) return exact;

  const levels = Object.keys(valuesByLevel)
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const fallbackLevel = levels.findLast((candidate) => candidate <= target) ?? levels.at(-1);
  return Number(valuesByLevel[String(fallbackLevel)] ?? 0) || 0;
}

function getSkillRuntimeStats(item, level) {
  if (isCalculationUnsupportedItem(item)) return {};
  const tlidbAuthority = getTlidbCalculationAuthority(item, { level });
  if (tlidbAuthority && Object.keys(tlidbAuthority.stats).length) return tlidbAuthority.stats;
  const profile = item.skillProfile;
  if (!profile?.coefficientByLevel) return getItemStats(item);

  const coefficient = valueAtLevel(profile.coefficientByLevel, level || 1);
  const castTime = Number(profile.castTime) > 0 ? Number(profile.castTime) : 1;
  return {
    dps: Math.round((coefficient * 10) / castTime),
  };
}

function normalizedTags(item) {
  const exactTags = ["en", "ko", "cn"].flatMap((localeKey) => {
    const locale = item?.tlidbText?.[localeKey];
    return locale?.sourcePageVersion === "SS13"
      && locale?.sourceSeasonEvidence?.verificationComplete === true
      && locale?.sourceFieldStatus?.tags === "exact"
      && Array.isArray(locale.tags)
      ? locale.tags
      : [];
  });
  return new Set([
    ...exactTags,
    ...(item.skillProfile?.tags ?? []),
    ...(item.supportProfile?.tags ?? []),
    ...(item.tags ?? []),
  ].map((tag) => String(tag).trim().toLowerCase()));
}

function getCurrentStructuredDamageCapabilities(skill) {
  const authority = getTlidbCalculationAuthority(skill, { level: 20 });
  const damageEffects = (authority?.parsedEffects ?? []).filter((effect) => (
    effect?.operation === "set"
    && typeof effect?.stat === "string"
    && /damage/iu.test(effect.stat)
    && effect.stat !== "added-damage-effectiveness"
    && !/-damage-taken$/u.test(effect.stat)
  ));
  const canHit = damageEffects.some(({ stat }) => (
    !/(?:persistent|damage-over-time|damage-per-second|dot)/iu.test(stat)
  ));
  const canDealDamageOverTime = damageEffects.some(({ stat }) => (
    /(?:persistent|damage-over-time|damage-per-second|dot)/iu.test(stat)
  ));
  return {
    canDealDamage: damageEffects.length > 0,
    canHit,
    canAilmentOrDot: canHit || canDealDamageOverTime,
  };
}

function supportMatchesSkill(support, skill) {
  const profile = support?.supportProfile;
  if (!profile || !skill) return false;

  const skillTags = normalizedTags(skill);
  const compatibleTags = (profile.compatibleTags ?? []).map((tag) => String(tag).trim().toLowerCase());
  const excludedTags = (profile.excludedTags ?? []).map((tag) => String(tag).trim().toLowerCase());
  const oneOfTags = (profile.oneOfTags ?? []).map((tag) => String(tag).trim().toLowerCase());
  const capabilities = getCurrentStructuredDamageCapabilities(skill);
  const currentCompatibility = isCurrentTlidbSupportCompatible(support, {
    tags: [...skillTags],
    role: skill.type,
    ...capabilities,
    names: [skill.name, skill?.tlidbText?.en?.name],
  });
  if (currentCompatibility !== null) return currentCompatibility;
  if (excludedTags.some((tag) => skillTags.has(tag))) return false;
  if (compatibleTags.length && !compatibleTags.every((tag) => skillTags.has(tag))) return false;
  if (oneOfTags.length && !oneOfTags.some((tag) => skillTags.has(tag))) return false;
  return true;
}

function mergedConditionRequirements(...groups) {
  return groups.flatMap((group) => (Array.isArray(group) ? group : []));
}

function getSupportDamageEffects(support, level) {
  if (!support || isCalculationUnsupportedItem(support)) return [];
  const authority = getSupportConditionAuthority(support);
  const configuredRule = authority.rule;
  const authorityRule = authority.status === "verified" ? configuredRule : null;
  const profileValue = valueAtLevel(support.supportProfile?.moreDamageByLevel, level || 1);
  const primaryValue = configuredRule?.effectMode === "primary" && Number.isFinite(configuredRule.valueOverride)
    ? configuredRule.valueOverride
    : profileValue;
  const primaryRequirements = mergedConditionRequirements(
    support.conditionRequirements,
    authorityRule?.effectMode === "primary" ? authorityRule.conditionRequirements : [],
  );
  const effects = [];

  if (Number.isFinite(primaryValue) && primaryValue !== 0) {
    effects.push({
      id: "moreDps",
      value: primaryValue,
      conditionRequirements: primaryRequirements,
      ...(authority.status === "evidence-mismatch" && configuredRule.effectMode === "primary"
        ? { applied: false, inactiveReason: "unverified-condition-authority" }
        : {}),
    });
  }
  if (configuredRule?.effectMode === "additional" && Number.isFinite(configuredRule.valueOverride)) {
    effects.push({
      id: configuredRule.runtimeEffectId,
      value: configuredRule.valueOverride,
      conditionRequirements: mergedConditionRequirements(
        support.conditionRequirements,
        authorityRule?.conditionRequirements,
      ),
      ...(authority.status === "evidence-mismatch"
        ? { applied: false, inactiveReason: "unverified-condition-authority" }
        : {}),
    });
  }
  return effects;
}

function supportDamageEffectIsActive(effect, conditionState) {
  if (effect.applied === false) return false;
  if (!effect.conditionRequirements.length) return true;
  const diagnosis = diagnoseConditions(conditionState, effect.conditionRequirements);
  return diagnosis.unmet.length === 0 && diagnosis.unsupported.length === 0;
}

function inferStructuredStat(text = "", isPercent = false) {
  const lower = String(text).toLowerCase();
  if (/damage taken|받는 .*대미지|받는 .*피해|受到的.*伤害/.test(lower)) return "";
  if (/crit(?:ical)? (?:strike )?rating|크리티컬 수치|치명타 수치|暴击值|爆击值/.test(lower)) return "";
  if (/max life|life|hp|最大生命|生命/.test(lower)) return "life";
  if (/mana|最大魔力|魔力/.test(lower)) return "mana";
  if (/shield|护盾|護盾|能量护盾/.test(lower)) return "shield";
  if (/strength|力量/.test(lower)) return "strength";
  if (/dexterity|敏捷/.test(lower)) return "dexterity";
  if (/intelligence|智慧|智力/.test(lower)) return "intelligence";
  if (/fire resistance|fire resist|火焰抗性|火抗/.test(lower)) return "fireResist";
  if (/cold resistance|cold resist|冰冷抗性|冰抗/.test(lower)) return "coldResist";
  if (/lightning resistance|lightning resist|闪电抗性|雷抗/.test(lower)) return "lightningResist";
  if (/erosion resistance|erosion resist|腐蚀抗性|腐蚀/.test(lower)) return "erosionResist";
  if (/cast speed|attack speed|speed|攻击速度|施法速度/.test(lower)) return "speed";
  if (/crit|暴击|爆击/.test(lower)) return "crit";
  if (/damage|dps|伤害|攻擊傷害|攻击伤害/.test(lower)) return isPercent ? "moreDps" : "dps";
  return "";
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return max;
  return Math.max(Math.min(min, max), Math.min(Math.max(min, max), number));
}

function normalizeGearCrafts(input) {
  if (!input || typeof input !== "object") return {};

  return Object.fromEntries(
    Object.entries(input)
      .filter(([itemId, affixes]) => typeof itemId === "string" && affixes && typeof affixes === "object")
      .map(([itemId, affixes]) => [
        itemId,
        Object.fromEntries(
          Object.entries(affixes)
            .filter(([affixId, config]) => typeof affixId === "string" && config && typeof config === "object")
            .map(([affixId, config]) => [
              affixId,
              {
                tierId: typeof config.tierId === "string" ? config.tierId : "",
                rolls:
                  config.rolls && typeof config.rolls === "object"
                    ? Object.fromEntries(
                        Object.entries(config.rolls)
                          .map(([rollKey, value]) => [rollKey, Number(value)])
                          .filter(([, value]) => Number.isFinite(value)),
                      )
                    : {},
              },
            ])
            .filter(([, config]) => config.tierId),
        ),
      ])
      .filter(([, affixes]) => Object.keys(affixes).length),
  );
}

function normalizeBooleanMap(input) {
  if (!input || typeof input !== "object") return {};

  return Object.fromEntries(
    Object.entries(input)
      .filter(([itemId]) => typeof itemId === "string")
      .map(([itemId, value]) => [itemId, Boolean(value)]),
  );
}

function normalizeLegendaryDraftMap(input) {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([itemId, draft]) => typeof itemId === "string" && draft && typeof draft === "object")
      .map(([itemId, draft]) => [itemId, {
        ...draft,
        corrodedSlotIds: Array.isArray(draft.corrodedSlotIds)
          ? [...new Set(draft.corrodedSlotIds.filter((slotId) => typeof slotId === "string" && slotId))]
          : [],
      }]),
  );
}

function getLegendaryRolls(item, legendaryDraft, legacyCorroded = false) {
  return currentGearCalculationAuthority.getAuthorizedLegendaryRolls(
    item,
    legendaryDraft,
    legacyCorroded,
  );
}

function addStat(stats, key, value) {
  stats[key] = (stats[key] ?? 0) + value;
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

const CUSTOM_DAMAGE_INCREASE_RUNTIME_STATS = Object.freeze({
  physicalDamageIncrease: "physical-damage",
  fireDamageIncrease: "fire-damage",
  coldDamageIncrease: "cold-damage",
  lightningDamageIncrease: "lightning-damage",
  erosionDamageIncrease: "erosion-damage",
  elementalDamageIncrease: "elemental-damage",
  attackDamageIncrease: "attack-damage",
  spellDamageIncrease: "spell-damage",
  hitDamageIncrease: "hit-damage",
  damageOverTimeIncrease: "damage-over-time",
  projectileDamageIncrease: "projectile-damage",
  areaDamageIncrease: "area-damage",
  meleeDamageIncrease: "melee-damage",
});

const CUSTOM_DAMAGE_INCREASE_PATTERNS = Object.freeze([
  ["physicalDamageIncrease", /(?:physical damage|물리 (?:대미지|피해)|物理伤害)/iu],
  ["fireDamageIncrease", /(?:fire damage|화염 (?:대미지|피해)|火焰伤害)/iu],
  ["coldDamageIncrease", /(?:cold damage|냉기 (?:대미지|피해)|冰冷伤害)/iu],
  ["lightningDamageIncrease", /(?:lightning damage|번개 (?:대미지|피해)|闪电伤害)/iu],
  ["erosionDamageIncrease", /(?:erosion damage|부식 (?:대미지|피해)|腐蚀伤害)/iu],
  ["elementalDamageIncrease", /(?:elemental damage|원소 (?:대미지|피해)|元素伤害)/iu],
  ["attackDamageIncrease", /(?:attack damage|공격 (?:대미지|피해)|攻击伤害)/iu],
  ["spellDamageIncrease", /(?:spell damage|주술 (?:대미지|피해)|法术伤害)/iu],
  ["hitDamageIncrease", /(?:hit damage|적중 (?:대미지|피해)|击中伤害)/iu],
  ["damageOverTimeIncrease", /(?:damage over time|persistent damage|지속 (?:대미지|피해)|持续伤害)/iu],
  ["projectileDamageIncrease", /(?:projectile damage|투사체 (?:대미지|피해)|投射物伤害)/iu],
  ["areaDamageIncrease", /(?:area damage|범위 (?:대미지|피해)|范围伤害)/iu],
  ["meleeDamageIncrease", /(?:melee damage|근접 (?:대미지|피해)|近战伤害)/iu],
]);

const CUSTOM_DAMAGE_DOMAIN_MARKERS = Object.freeze([
  /(?:physical|물리|物理)/iu,
  /(?:fire|화염|火焰)/iu,
  /(?:cold|냉기|冰冷)/iu,
  /(?:lightning|번개|闪电)/iu,
  /(?:erosion|부식|腐蚀)/iu,
  /(?:elemental|원소|元素)/iu,
  /(?:attack|공격|攻击)/iu,
  /(?:spell|주술|法术)/iu,
  /(?:\bhit\b|적중|击中)/iu,
  /(?:damage over time|persistent|지속|持续)/iu,
  /(?:projectile|투사체|投射物)/iu,
  /(?:\barea\b|범위|范围)/iu,
  /(?:melee|근접|近战)/iu,
]);

const CUSTOM_DAMAGE_UNSUPPORTED_QUALIFIERS = /(?:additional|extra|taken|penetration|convert(?:ed|s|ing)?|conversion|\bif\b|\bwhen\b|\bwhile\b|\bafter\b|\bbefore\b|\bper\b|추가|받는|관통|전환|최근|경우|동안|이후|이전|당|额外|受到|穿透|转化|如果|当|期间|最近|每)/iu;

function classifyCustomDamageIncrease(line, isPercent) {
  const matches = CUSTOM_DAMAGE_INCREASE_PATTERNS.filter(([, pattern]) => pattern.test(line));
  if (!matches.length) return null;
  const domainCount = CUSTOM_DAMAGE_DOMAIN_MARKERS.filter((pattern) => pattern.test(line)).length;
  if (
    !isPercent
    || matches.length !== 1
    || domainCount !== 1
    || CUSTOM_DAMAGE_UNSUPPORTED_QUALIFIERS.test(line)
  ) {
    return { stat: null };
  }
  return { stat: matches[0][0] };
}

function customSkillDamageEffects(text) {
  const stats = parseCustomAffixes(text);
  return Object.entries(CUSTOM_DAMAGE_INCREASE_RUNTIME_STATS).flatMap(([statKey, runtimeStat]) => {
    const value = Number(stats[statKey] ?? 0);
    if (!Number.isFinite(value) || value === 0) return [];
    return [{
      sourceId: "custom:affixes",
      sourceKind: "custom",
      stat: runtimeStat,
      operation: "add",
      value,
      unit: "percent",
      nonBlockingWhenDamageTargetUnavailable: true,
      sourceText: "",
    }];
  });
}

export function parseCustomAffixes(text = "") {
  const stats = {};
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const numberMatch = line.match(/([+-]?\d+(?:\.\d+)?)\s*%?/);
    if (!numberMatch) continue;

    const value = Number(numberMatch[1]);
    const lower = line.toLowerCase();
    const isPercent = line.includes("%");
    const scopedDamage = classifyCustomDamageIncrease(line, isPercent);

    if (hasAny(lower, ["life regeneration per second", "life regen per second", "1초당 hp 회복", "hp 자연 회복", "초당 생명 회복", "每秒生命回复"])) {
      addStat(stats, "lifeRegenPerSecond", value);
    } else if (hasAny(lower, ["critical strike damage", "critical damage", "crit damage", "크리티컬 대미지", "치명타 피해", "크리티컬 피해", "暴击伤害"])) {
      addStat(stats, "critDamage", value);
    } else if (hasAny(lower, ["double damage chance", "double damage", "이중 대미지 확률", "이중 피해 확률", "双倍伤害几率"])) {
      addStat(stats, "doubleDamageChance", value);
    } else if (hasAny(lower, ["movement speed", "이동 속도", "移动速度"])) {
      addStat(stats, "movementSpeedBonus", value);
    } else if (hasAny(lower, ["block chance", "막기 확률", "格挡几率"])) {
      addStat(stats, "blockChance", value);
    } else if (hasAny(lower, ["damage reduction", "대미지 감면", "피해 감소", "대미지 감소", "伤害减免"])) {
      addStat(stats, "damageReduction", value);
    } else if (hasAny(lower, ["armor", "아머", "护甲"])) {
      addStat(stats, "armor", value);
    } else if (hasAny(lower, ["evasion", "회피", "闪避"])) {
      addStat(stats, "evasion", value);
    } else if (hasAny(lower, ["attack speed", "cast speed", "speed", "공격 속도", "시전 속도", "攻速", "攻击速度"])) {
      addStat(stats, "speed", value);
    } else if (hasAny(lower, ["crit", "치명", "크리티컬", "暴击"])) {
      addStat(stats, "crit", value);
    } else if (hasAny(lower, ["life", "생명", "hp", "生命"])) {
      addStat(stats, "life", value);
    } else if (hasAny(lower, ["mana", "마나", "mp", "魔力", "魔法"])) {
      addStat(stats, "mana", value);
    } else if (hasAny(lower, ["shield", "보호막", "护盾"])) {
      addStat(stats, "shield", value);
    } else if (hasAny(lower, ["strength", "힘", "力量"])) {
      addStat(stats, "strength", value);
    } else if (hasAny(lower, ["dexterity", "민첩", "敏捷"])) {
      addStat(stats, "dexterity", value);
    } else if (hasAny(lower, ["intelligence", "지혜", "智慧"])) {
      addStat(stats, "intelligence", value);
    } else if (hasAny(lower, ["fire resist", "fire resistance", "화염 저항", "火焰抗性"])) {
      addStat(stats, "fireResist", value);
    } else if (hasAny(lower, ["cold resist", "cold resistance", "냉기 저항", "冰冷抗性"])) {
      addStat(stats, "coldResist", value);
    } else if (hasAny(lower, ["lightning resist", "lightning resistance", "번개 저항", "闪电抗性"])) {
      addStat(stats, "lightningResist", value);
    } else if (hasAny(lower, ["erosion resist", "erosion resistance", "부식 저항", "腐蚀抗性"])) {
      addStat(stats, "erosionResist", value);
    } else if (hasAny(lower, ["energy", "에너지", "能量"])) {
      addStat(stats, "energy", value);
    } else if (scopedDamage?.stat) {
      addStat(stats, scopedDamage.stat, value);
    } else if (scopedDamage) {
      continue;
    } else if (hasAny(lower, ["damage", "dps", "피해", "대미지", "伤害"])) {
      addStat(stats, isPercent ? "moreDps" : "dps", value);
    }
  }

  return stats;
}

export function createDefaultBuild(locale = "ko") {
  const document = createBuildDocument(locale);
  return {
    ...document,
    patchSnapshot: { ...CURRENT_PATCH_SNAPSHOT },
    selections: Object.fromEntries(
      CATEGORY_DEFS.filter((category) => category.id !== "lobby").map((category) => [
        category.id,
        [],
      ]),
    ),
  };
}

const GEAR_COMPATIBILITY_PROJECTIONS = [
  ["gearAffixes", "affixText"],
  ["gearRolls", "rolls"],
  ["gearCrafts", "crafts"],
  ["gearCorruptions", "corrupted"],
];

function sameSerializableValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameSerializableValue(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => (
      key === rightKeys[index]
      && sameSerializableValue(left[key], right[key])
    ));
}

function prepareGearSelectionCompatibility(input) {
  const priorSelection = input?.selectionProjection?.gear;
  const nextSelection = input?.selections?.gear;
  const sourceSlots = input?.gear?.slots;
  if (
    !Array.isArray(priorSelection)
    || !Array.isArray(nextSelection)
    || !Array.isArray(sourceSlots)
    || sameSerializableValue(priorSelection, nextSelection)
  ) return input;

  let prepared = input;
  for (const [mapField, slotField] of GEAR_COMPATIBILITY_PROJECTIONS) {
    const incoming = input?.[mapField];
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) continue;
    const sourceProjection = {};
    for (const slot of sourceSlots) {
      if (slot?.itemId && Object.hasOwn(slot, slotField)) {
        sourceProjection[slot.itemId] = slot[slotField];
      }
    }
    const staleKeys = Object.keys(sourceProjection).filter((itemId) => (
      nextSelection.includes(itemId)
      && Object.hasOwn(incoming, itemId)
      && sameSerializableValue(incoming[itemId], sourceProjection[itemId])
    ));
    if (!staleKeys.length) continue;
    const nextMap = { ...incoming };
    for (const itemId of staleKeys) delete nextMap[itemId];
    if (prepared === input) prepared = { ...input };
    prepared[mapField] = nextMap;
  }
  return prepared;
}

function normalizeEngineBuildDocument(input) {
  const preparedInput = prepareGearSelectionCompatibility(input);
  const migrated = normalizeBuildDocument(preparedInput);
  if (Number.isFinite(Number(input?.schemaVersion))) return migrated;

  const nestedKeys = ["hero", "skills", "gear", "talents", "divinity", "pact", "conditions", "calculation"];
  const nestedOverrides = Object.fromEntries(
    nestedKeys.filter((key) => Object.hasOwn(input ?? {}, key)).map((key) => [key, input[key]]),
  );
  return Object.keys(nestedOverrides).length
    ? normalizeBuildDocument({ ...migrated, ...nestedOverrides })
    : migrated;
}

function quarantineUnavailableSelections(selections, calculation) {
  const unavailableByKey = new Map();
  const existing = Array.isArray(calculation?.unavailableSelections)
    ? calculation.unavailableSelections
    : [];

  for (const entry of existing) {
    const categoryId = typeof entry?.categoryId === "string" ? entry.categoryId : "";
    const itemId = typeof entry?.itemId === "string" ? entry.itemId : "";
    const slotIndex = Math.max(0, Math.round(Number(entry?.slotIndex) || 0));
    if (!categoryId || !itemId) continue;
    unavailableByKey.set(`${categoryId}:${slotIndex}:${itemId}`, {
      categoryId,
      slotIndex,
      itemId,
      reason: "removed-from-active-ss13-catalog",
    });
  }

  const activeSelections = Object.fromEntries(
    Object.entries(selections).map(([categoryId, itemIds]) => [
      categoryId,
      itemIds.map((itemId, slotIndex) => {
        if (!itemId) return null;
        if (!VERIFIED_SS13_DELETION_KEYS.has(`${categoryId}:${itemId}`)) return itemId;
        unavailableByKey.set(`${categoryId}:${slotIndex}:${itemId}`, {
          categoryId,
          slotIndex,
          itemId,
          reason: "removed-from-active-ss13-catalog",
        });
        return null;
      }),
    ]),
  );

  const unavailableSelections = [...unavailableByKey.values()];
  const nextCalculation = { ...(calculation ?? {}) };
  if (unavailableSelections.length) nextCalculation.unavailableSelections = unavailableSelections;
  else delete nextCalculation.unavailableSelections;
  return { selections: activeSelections, calculation: nextCalculation };
}

export function normalizeBuild(input) {
  const document = normalizeEngineBuildDocument(input);
  const fallback = createDefaultBuild();
  const selections = { ...fallback.selections };
  const nestedSelectionCategories = new Set(["gear", "heroMemory", "talents", "slates", "spirits", "destiny"]);
  const heroLevel = Math.max(1, Math.min(100, Math.round(Number(input?.heroLevel) || document.hero.level || 90)));

  for (const category of CATEGORY_DEFS) {
    if (category.id === "lobby") continue;
    const incoming = nestedSelectionCategories.has(category.id)
      ? document.selections?.[category.id]
      : Array.isArray(input?.selections?.[category.id])
      ? input.selections[category.id]
      : document.selections?.[category.id];
    const boundedIncoming = nestedSelectionCategories.has(category.id)
      ? incoming
      : incoming?.slice(0, category.maxSelections);
    selections[category.id] = Array.isArray(boundedIncoming)
      ? boundedIncoming
          .map((itemId) => (typeof itemId === "string" && itemId ? itemId : null))
      : [];
  }

  const activeSelectionState = quarantineUnavailableSelections(selections, document.calculation);

  return {
    ...document,
    hero: {
      ...document.hero,
      level: heroLevel,
    },
    patchSnapshot: normalizePatchSnapshot(document.patchSnapshot),
    research: {
      season: typeof document.research?.season === "string" ? document.research.season.trim().slice(0, 20) : "",
      sources: Array.isArray(document.research?.sources)
        ? document.research.sources
            .filter((source) => typeof source === "string" && source.trim())
            .map((source) => source.trim())
            .slice(0, 20)
        : [],
      notes: typeof document.research?.notes === "string" ? document.research.notes : "",
    },
    heroLevel,
    skillLevels: Array.isArray(document.skillLevels)
      ? document.skillLevels
          .slice(0, 9)
          .map((level) => Math.max(0, Math.min(100, Math.round(Number(level) || 0))))
      : [],
    skillSeals: {
      life: Math.max(0, Math.round(Number(document.skillSeals?.life) || 0)),
      mana: Math.max(0, Math.round(Number(document.skillSeals?.mana) || 0)),
    },
    gearAffixes:
      document.gearAffixes && typeof document.gearAffixes === "object"
        ? Object.fromEntries(
            Object.entries(document.gearAffixes)
              .filter(([itemId, value]) => typeof itemId === "string" && typeof value === "string")
              .map(([itemId, value]) => [itemId, value]),
          )
        : {},
    gearRolls:
      document.gearRolls && typeof document.gearRolls === "object"
        ? Object.fromEntries(
            Object.entries(document.gearRolls)
              .filter(([, values]) => values && typeof values === "object")
              .map(([itemId, values]) => [
                itemId,
                Object.fromEntries(
                  Object.entries(values)
                    .map(([rollId, value]) => [rollId, Number(value)])
                    .filter(([, value]) => Number.isFinite(value)),
                ),
              ]),
          )
        : {},
    gearCrafts: normalizeGearCrafts(document.gearCrafts),
    gearCorruptions: normalizeBooleanMap(document.gearCorruptions),
    gearLegendaryDrafts: normalizeLegendaryDraftMap(document.gearLegendaryDrafts),
    calculation: activeSelectionState.calculation,
    selections: activeSelectionState.selections,
    selectionProjection: activeSelectionState.selections,
  };
}

function getSelectedItemEntries(normalized) {
  return Object.entries(normalized.selections).flatMap(([categoryId, itemIds]) =>
    itemIds
      .map((itemId, selectionIndex) => ({ item: findActiveCatalogItemById(itemId), selectionIndex }))
      .filter(({ item }) => item)
      .map(({ item, selectionIndex }) => ({ item: { ...item, categoryId }, selectionIndex })),
  );
}

const EXACT_ONE_HAND_WEAPON_TYPE_TAGS = Object.freeze([
  "claw",
  "dagger",
  "oneHandSword",
  "oneHandMace",
  "oneHandAxe",
  "wand",
  "weapon-pistol",
]);

function exactOneHandWeaponType(item) {
  if (!item?.tags?.includes("oneHand")) return "";
  const matches = EXACT_ONE_HAND_WEAPON_TYPE_TAGS.filter((tag) => item.tags.includes(tag));
  return matches.length === 1 ? matches[0] : "";
}

function withAutomaticEquipmentConditions(normalized, selectedItemEntries) {
  const oneHandWeaponsBySlot = new Map(
    selectedItemEntries
      .filter(({ item, selectionIndex }) => (
        item.categoryId === "gear"
        && (selectionIndex === 0 || selectionIndex === 1)
        && item.tags?.includes("oneHand")
      ))
      .map(({ item, selectionIndex }) => [selectionIndex, item]),
  );
  const dualWielding = oneHandWeaponsBySlot.has(0) && oneHandWeaponsBySlot.has(1);
  const mainHandType = exactOneHandWeaponType(oneHandWeaponsBySlot.get(0));
  const offHandType = exactOneHandWeaponType(oneHandWeaponsBySlot.get(1));
  const wieldingShield = selectedItemEntries.some(({ item, selectionIndex }) => (
    item.categoryId === "gear"
    && selectionIndex === 1
    && item.tags?.some((tag) => tag === "shield" || tag.startsWith("shield-"))
  ));
  const wieldingMace = selectedItemEntries.some(({ item, selectionIndex }) => (
    item.categoryId === "gear"
    && (selectionIndex === 0 || selectionIndex === 1)
    && item.tags?.some((tag) => tag === "oneHandMace" || tag === "twoHandMace")
  ));
  const automatic = normalized.conditions?.automatic ?? {};
  return {
    ...normalized,
    conditions: {
      ...(normalized.conditions ?? {}),
      automatic: {
        ...automatic,
        statuses: {
          ...(automatic.statuses ?? {}),
          dual_wielding: dualWielding,
          wielding_shield: wieldingShield,
          wielding_mace: wieldingMace,
          dual_wielding_different_weapon_types: Boolean(
            dualWielding
            && mainHandType
            && offHandType
            && mainHandType !== offHandType
          ),
        },
      },
    },
  };
}

function withSelectedEffectStatusDefaults(normalized, effects) {
  const automatic = normalized.conditions?.automatic ?? {};
  const statuses = automatic.statuses ?? {};
  const missingDefaults = Object.fromEntries(
    (Array.isArray(effects) ? effects : [])
      .flatMap((effect) => Array.isArray(effect?.conditionRequirements)
        ? effect.conditionRequirements
        : [])
      .filter((requirement) => (
        requirement?.operator === "truthy"
        && requirement.expected === true
        && /^statuses\.[^.]+$/u.test(requirement.path)
      ))
      .map((requirement) => requirement.path.slice("statuses.".length))
      .filter((key) => !Object.hasOwn(statuses, key))
      .map((key) => [key, false]),
  );
  if (!Object.keys(missingDefaults).length) return normalized;
  return {
    ...normalized,
    conditions: {
      ...(normalized.conditions ?? {}),
      automatic: {
        ...automatic,
        statuses: {
          ...statuses,
          ...missingDefaults,
        },
      },
    },
  };
}

function getGearInstanceConfiguration(normalized, itemId, selectionIndex) {
  const slot = normalized.gear?.slots?.[selectionIndex];
  const useSlot = slot?.itemId === itemId;
  const slotValue = (field, compatibilityField, fallback) => {
    if (useSlot && Object.hasOwn(slot, field)) return slot[field];
    return normalized[compatibilityField]?.[itemId] ?? fallback;
  };
  const rolls = slotValue("rolls", "gearRolls", {});
  const crafts = slotValue("crafts", "gearCrafts", {});
  const legendaryDraft = slotValue("legendaryDraft", "gearLegendaryDrafts", null);

  return {
    affixText: String(slotValue("affixText", "gearAffixes", "") ?? ""),
    rolls: rolls && typeof rolls === "object" ? rolls : {},
    crafts: crafts && typeof crafts === "object" ? crafts : {},
    corrupted: Boolean(slotValue("corrupted", "gearCorruptions", false)),
    legendaryDraft: legendaryDraft && typeof legendaryDraft === "object" ? legendaryDraft : null,
  };
}

function resolveSelectedTlidbCrafts(normalized, selectedItemEntries) {
  return new Map(selectedItemEntries
    .filter(({ item }) => item.categoryId === "gear")
    .map(({ item, selectionIndex }) => {
      const config = getGearInstanceConfiguration(normalized, item.id, selectionIndex);
      return [selectionIndex, resolveTlidbGearCraftSelections({
        item,
        selectedCrafts: config.crafts,
        calculation: currentTlidbGearCraftCalculation,
      })];
    }));
}

function getSelectedFirebirdProjection(normalized, selectedItemEntries) {
  const selection = selectedItemEntries.find(
    ({ item }) => item.categoryId === "gear" && item.id === FIREBIRD_CURRENT_SS13_ITEM_ID,
  );
  if (!selection) {
    return Object.freeze({
      active: false,
      status: "inactive",
      itemId: FIREBIRD_CURRENT_SS13_ITEM_ID,
      entries: Object.freeze([]),
      unsupported: Object.freeze([]),
      modifierValues: Object.freeze({}),
      blockers: Object.freeze([]),
    });
  }

  const projection = projectCurrentSs13FirebirdGearCalculation(
    CURRENT_FIREBIRD_GEAR_CALCULATION_PROFILE,
    getGearInstanceConfiguration(normalized, selection.item.id, selection.selectionIndex),
  );
  return Object.freeze({
    ...projection,
    selectionIndex: selection.selectionIndex,
  });
}

function getFirebirdUnsupportedSourceId(semanticTargetKey) {
  return `${FIREBIRD_CURRENT_SS13_ITEM_ID}:unsupported:${semanticTargetKey}`;
}

function findActiveCatalogItemById(itemId) {
  const item = findItemById(itemId);
  return item && !isSs13PreviewCatalogItem(item) ? item : undefined;
}

function getSkillRowContext(normalized, rowIndex) {
  const externalMain = getExternalMainSkillOverride(null, normalized, "active", rowIndex);
  if (externalMain?.skill) {
    return {
      skill: externalMain.skill,
      level: externalMain.level,
      externalMain,
    };
  }

  const skill = findActiveCatalogItemById(normalized.selections.skills?.[rowIndex]);
  if (skill?.categoryId !== "skills") return null;
  const runtimeLevel = Number(getRuntimeSkillSlot(normalized, rowIndex)?.level);
  return {
    skill,
    level: Number.isInteger(runtimeLevel) && runtimeLevel > 0
      ? runtimeLevel
      : normalized.skillLevels[rowIndex] || 1,
    externalMain: null,
  };
}

function getSupportLevel(normalized, rowIndex, supportIndex, fallbackLevel) {
  const slot = rowIndex < 5
    ? normalized.skills?.active?.[rowIndex]
    : normalized.skills?.passive?.[rowIndex - 5];
  const selectedSupportId = normalized.selections.supports?.[rowIndex * 5 + supportIndex];
  const runtimeSupport = slot?.supports?.[supportIndex];
  const runtimeLevel = Number(runtimeSupport?.level);
  return runtimeSupport?.supportId === selectedSupportId && Number.isFinite(runtimeLevel) && runtimeLevel > 0
    ? runtimeLevel
    : fallbackLevel;
}

function getRuntimeSkillSlot(normalized, rowIndex) {
  return rowIndex < 5
    ? normalized.skills?.active?.[rowIndex]
    : normalized.skills?.passive?.[rowIndex - 5];
}

function getTlidbSkillRowSupports(normalized, rowIndex, skill, level) {
  const slot = getRuntimeSkillSlot(normalized, rowIndex);
  return Array.from({ length: 5 }, (_, supportIndex) => {
    const supportId = normalized.selections.supports?.[rowIndex * 5 + supportIndex];
    const support = findActiveCatalogItemById(supportId);
    if (!support || support.categoryId !== "supports") return null;
    const runtimeSupport = slot?.supports?.[supportIndex];
    const configured = runtimeSupport?.supportId === support.id;
    return {
      item: support,
      level: getSupportLevel(normalized, rowIndex, supportIndex, level),
      compatible: supportMatchesSkill(support, skill),
      config: configured ? runtimeSupport.config ?? {} : {},
      supportIndex,
    };
  }).filter(Boolean);
}

function getEffectiveAllSkillLevel(baseLevel, runtimeStats) {
  const normalizedBaseLevel = Number.isFinite(Number(baseLevel))
    ? Math.trunc(Number(baseLevel))
    : 1;
  const levelBonus = Number.isFinite(Number(runtimeStats?.allSkillLevelBonus))
    ? Math.trunc(Number(runtimeStats.allSkillLevelBonus))
    : 0;
  return Math.max(1, normalizedBaseLevel + levelBonus);
}

function getEffectiveSkillLevel(skill, baseLevel, runtimeStats) {
  const allSkillLevel = getEffectiveAllSkillLevel(baseLevel, runtimeStats);
  const auraSkillLevelBonus = skill?.tags?.includes("aura")
    && Number.isFinite(Number(runtimeStats?.auraSkillLevelBonus))
    ? Math.trunc(Number(runtimeStats.auraSkillLevelBonus))
    : 0;
  return Math.max(1, allSkillLevel + auraSkillLevelBonus);
}

function applyAllSkillLevelBonusToSupports(supports, runtimeStats) {
  return supports.map((support) => Object.freeze({
    ...support,
    baseLevel: support.level,
    level: getEffectiveAllSkillLevel(support.level, runtimeStats),
  }));
}

function getTlidbGearRuntimeRecords(normalized, selectedItemEntries, craftSelections) {
  return selectedItemEntries
    .filter(({ item }) => item.categoryId === "gear")
    .map(({ item, selectionIndex }) => {
      const config = getGearInstanceConfiguration(normalized, item.id, selectionIndex);
      const craft = craftSelections.get(selectionIndex);
      const authority = getSelectedGearAuthority(item, config);
      return {
        item,
        slotIndex: selectionIndex,
        rolls: {
          ...projectTlidbGearTooltipRollValues(item, config, authority),
          ...(craft?.rollValues ?? {}),
        },
        effects: [
          ...(authority?.parsedEffects ?? []),
          ...(craft?.effects ?? []),
        ],
      };
    });
}

const TLIDB_MINION_PANEL_STATS = new Set([
  "minion_max_life",
  "spirit_magus_cooldown_recovery_speed",
]);

function tlidbEffectNeedsSkillRowRuntime(effect) {
  if (effect?.skillDamageApplicability === "configuration-only") return false;
  if (isTlidbWeaponLocalExternalEffect(effect)) return true;
  const stat = String(effect?.stat ?? "").toLowerCase().replaceAll("-", "_");
  if (stat === "damage_lucky") return true;
  if (["attack_block_chance", "spell_block_chance"].includes(stat)) return false;
  const scope = effect?.scope;
  const skillTypes = Array.isArray(scope?.skillTypes) ? scope.skillTypes : ["all"];
  if (scope?.actor === "minion" && !TLIDB_MINION_PANEL_STATS.has(stat)) return true;
  if (!skillTypes.includes("all")) return true;
  if (Array.isArray(scope?.skillTags) && scope.skillTags.length) return true;
  if ([
    "affliction_effect",
    "affliction_inflicted_per_second",
    "deepening_effect",
    "critical_damage",
    "critical_rating",
    "skill_critical_strike_rating",
    "skill_critical_strike_damage",
    "harvest_duration",
    "reaping_duration",
    "effect_cooldown",
    "reaping_repeat_chance",
    "harvest_recovery_speed",
    "reaping_recovery_speed",
    "skill_max_spell_burst",
  ].includes(stat)) return true;
  if (!["add", "increase", "add_percent", "more", "more_percent", "additional"].includes(effect?.operation)) {
    return false;
  }
  if (["damage", "dps", "additional_damage"].includes(stat)) return false;
  return /(?:^|_)(?:attack|spell|projectile|area|physical|fire|cold|lightning|erosion|elemental|minion|hit|persistent|damage_over_time)(?:_|$)/u.test(stat)
    && /damage/u.test(stat);
}

function selectedTlidbExternalEffects(selectedItemEntries, extraEffects = [], normalized = null) {
  return [
    ...selectedItemEntries.flatMap(({ item, selectionIndex }) => {
      if (["skills", "supports", "talents", "slates"].includes(item.categoryId)) return [];
      const authority = item.categoryId === "gear" && normalized
        ? getSelectedGearAuthority(item, getGearInstanceConfiguration(normalized, item.id, selectionIndex))
        : getTlidbCalculationAuthority(item);
      return (authority?.parsedEffects ?? [])
        .filter((effect) => item.categoryId !== "gear" || !isTlidbGearCraftCombatEffect(effect))
        .filter(tlidbEffectNeedsSkillRowRuntime)
        .map((effect) => ({
        ...effect,
        sourceId: item.id,
        sourceKind: item.categoryId,
        sourceUrl: authority.sourceUrl,
        sourceRecordKey: authority.sourceRecordKey,
        }));
    }),
    ...extraEffects.filter(tlidbEffectNeedsSkillRowRuntime),
  ];
}

function selectedTlidbExternalBlockers(selectedItemEntries, extraBlockers = [], normalized = null) {
  return [
    ...selectedItemEntries.flatMap(({ item, selectionIndex }) => {
      if (["skills", "supports", "talents", "slates"].includes(item.categoryId)) return [];
      const authority = item.categoryId === "gear" && normalized
        ? getSelectedGearAuthority(item, getGearInstanceConfiguration(normalized, item.id, selectionIndex))
        : getTlidbCalculationAuthority(item);
      return (authority?.parserBlockers ?? []).map((blocker) => ({
        ...blocker,
        sourceId: item.id,
        sourceKind: item.categoryId,
      }));
    }),
    ...extraBlockers,
  ];
}

const MAIN_SKILL_ONLY_TEXT = /\bMain Skill\b/iu;

function externalEffectsForSkillRow(effects, rowIndex) {
  return effects.filter((effect) => (
    rowIndex === 0
    || !MAIN_SKILL_ONLY_TEXT.test(String(effect?.sourceText ?? ""))
  ));
}

function externalBlockersForSkillRow(blockers, rowIndex) {
  return blockers.filter((blocker) => (
    rowIndex === 0
    || !MAIN_SKILL_ONLY_TEXT.test(String(blocker?.sourceText ?? ""))
  ));
}

function isTlidbWeaponLocalExternalEffect(effect) {
  return ["main", "off"].includes(effect?.weaponSlot)
    && /^(?:main|off)_hand_weapon_/u.test(String(effect?.stat ?? ""));
}

function applyTlidbPassiveSkillRuntime(
  accumulator,
  normalized,
  provenance,
  nextOrder,
  externalEffects,
  externalBlockers,
) {
  const passiveRows = [];
  for (let rowIndex = 5; rowIndex < 9; rowIndex += 1) {
    const row = getSkillRowContext(normalized, rowIndex);
    if (!row || row.externalMain) continue;
    const runtimeStats = currentTlidbRuntimeStats(accumulator);
    const { skill, level: baseLevel } = row;
    const level = getEffectiveSkillLevel(skill, baseLevel, runtimeStats);
    const supports = applyAllSkillLevelBonusToSupports(
      getTlidbSkillRowSupports(normalized, rowIndex, skill, baseLevel),
      runtimeStats,
    );
    const evaluation = evaluateTlidbPassiveSkill({
      skill,
      level,
      supports,
      auraEffectPercent: runtimeStats.auraEffect,
      manaSealCompensationPercent: runtimeStats.manaSealCompensation,
    });
    const skillSource = getEffectSource(provenance, skill.id, {
      sourceLabel: getCalculationItemLabel(skill, skill.id),
      sourceIconUrl: skill.iconUrl,
      categoryId: "skills",
      sourceUrl: evaluation.sourceUrl,
      sourceRecordKey: evaluation.sourceRecordKey,
      receipt: evaluation.receipt,
      evidence: "structured",
    });

    if (evaluation.seal.complete) {
      accumulator.apply(createEffect({
        id: `${skill.id}:passive:${rowIndex}:sealed-mana`,
        ...skillSource,
        targetKey: rawStatKey("sealedManaPercent"),
        operation: "add",
        value: evaluation.seal.actualPercent,
        order: nextOrder.value++,
        sourceText: `Sealed Mana ${evaluation.seal.initialPercent}%`,
      }));
      for (const [supportIndex, receipt] of evaluation.supportReceipts.entries()) {
        const support = findItemById(receipt.sourceId);
        const supportSource = getEffectSource(provenance, receipt.sourceId, {
          sourceLabel: getCalculationItemLabel(support, receipt.sourceId),
          sourceIconUrl: support?.iconUrl,
          categoryId: "supports",
          sourceUrl: receipt.sourceUrl,
          sourceRecordKey: receipt.sourceRecordKey,
          evidence: "structured",
        });
        accumulator.apply(createEffect({
          id: `${skill.id}:passive:${rowIndex}:seal-support:${supportIndex}`,
          ...supportSource,
          targetKey: rawStatKey("sealedManaPercent"),
          operation: "add",
          value: 0,
          order: nextOrder.value++,
          sourceText: `Mana Cost Multiplier ${receipt.manaMultiplierPercent}%`,
        }));
      }
    }

    for (const [blockerIndex, blocker] of evaluation.seal.blockers.entries()) {
      const sourceItem = findItemById(blocker.sourceId);
      const source = getEffectSource(provenance, blocker.sourceId || skill.id, {
        sourceLabel: getCalculationItemLabel(sourceItem ?? skill, blocker.sourceId || skill.id),
        sourceIconUrl: sourceItem?.iconUrl || skill.iconUrl,
        categoryId: sourceItem?.categoryId || "skills",
        evidence: "unsupported",
      });
      accumulator.apply(createEffect({
        id: `${skill.id}:passive:${rowIndex}:seal-blocker:${blockerIndex}`,
        ...source,
        targetKey: rawStatKey("sealedManaPercent"),
        operation: "add",
        value: null,
        applied: false,
        inactiveReason: blocker.reason,
        order: nextOrder.value++,
        sourceText: blocker.sourceText,
      }));
    }

    for (const [effectIndex, effect] of evaluation.aura.panelEffects.entries()) {
      const targetKey = effect.operation === "increase"
        ? tlidbIncreaseKey(effect.stat)
        : effect.operation === "more"
          ? tlidbMoreKey(effect.stat)
          : rawStatKey(effect.stat);
      accumulator.apply(createEffect({
        id: `${skill.id}:passive:${rowIndex}:aura-panel:${effectIndex}:${effect.stat}`,
        ...skillSource,
        targetKey,
        operation: effect.operation === "increase" ? "add" : effect.operation,
        value: effect.value,
        order: nextOrder.value++,
        sourceText: effect.sourceText,
      }));
    }
    for (const [blockerIndex, blocker] of evaluation.aura.blockers.entries()) {
      for (const [targetIndex, targetStat] of (blocker.targetStats ?? []).entries()) {
        const sourceItem = findItemById(blocker.sourceId);
        const source = getEffectSource(provenance, blocker.sourceId || skill.id, {
          sourceLabel: getCalculationItemLabel(sourceItem ?? skill, blocker.sourceId || skill.id),
          sourceIconUrl: sourceItem?.iconUrl || skill.iconUrl,
          categoryId: sourceItem?.categoryId || "skills",
          evidence: "unsupported",
        });
        accumulator.apply(createEffect({
          id: `${skill.id}:passive:${rowIndex}:aura-blocker:${blockerIndex}:${targetIndex}`,
          ...source,
          targetKey: rawStatKey(targetStat),
          operation: "add",
          value: null,
          applied: false,
          inactiveReason: blocker.reason,
          order: nextOrder.value++,
          sourceText: blocker.sourceText,
        }));
      }
    }

    externalEffects.push(...evaluation.aura.skillEffects.map((effect) => ({
      ...effect,
      sourceId: skill.id,
      sourceKind: "skills",
      sourceUrl: evaluation.sourceUrl,
      sourceRecordKey: evaluation.sourceRecordKey,
    })));
    externalBlockers.push(...evaluation.aura.blockers.map((blocker) => ({
      ...blocker,
      sourceId: blocker.sourceId || skill.id,
      sourceKind: "skills",
    })));

    passiveRows.push(Object.freeze({
      kind: "passive",
      skillId: skill.id,
      rowIndex,
      ...(baseLevel !== level ? { baseLevel } : {}),
      level,
      calculationSupported: evaluation.complete,
      sealCalculationSupported: evaluation.seal.complete,
      auraCalculationSupported: evaluation.aura.complete,
      sealedManaPercent: evaluation.seal.actualPercent,
      auraEffectCount: evaluation.aura.panelEffects.length + evaluation.aura.skillEffects.length,
      blockers: evaluation.blockers,
      status: evaluation.status,
    }));
  }
  return Object.freeze(passiveRows);
}

export function getSelectedItems(build) {
  const normalized = normalizeBuild(build);

  return getSelectedItemEntries(normalized).map(({ item }) => item);
}

function hasModeledStatContribution(stats = {}) {
  return Object.entries(stats).some(
    ([key, value]) => (
      key === "moreDps"
      || Object.hasOwn(BASE_STATS, key)
      || Object.hasOwn(CUSTOM_DAMAGE_INCREASE_RUNTIME_STATS, key)
    ) && Number(value) !== 0,
  );
}

function getSelectedCraftContributions(item, selectedCrafts = {}) {
  return currentGearCalculationAuthority.getSelectedCraftContributions(item, selectedCrafts);
}

function hasModeledCraftContribution(item, selectedCrafts) {
  return getSelectedCraftContributions(item, selectedCrafts).some(
    ({ stat, value }) => (stat === "moreDps" || Object.hasOwn(BASE_STATS, stat)) && value !== 0,
  );
}

function getSelectedGearAffixText(normalized, selectedItemEntries) {
  return selectedItemEntries
    .filter(({ item }) => item.categoryId === "gear" && !isCalculationUnsupportedItem(item))
    .map(({ item, selectionIndex }) => (
      getGearInstanceConfiguration(normalized, item.id, selectionIndex).affixText
    ))
    .filter((value) => value.trim())
    .join("\n");
}

function hasActiveHeroSelection(normalized) {
  return normalized.selections.hero?.some((itemId) => {
    if (!itemId) return false;
    const item = findItemById(itemId);
    return item?.categoryId === "hero" && !isSs13PreviewHeroCatalogItem(item);
  });
}

function getCalculationParticipation(normalized, selectedItemEntries, firebirdProjection = null) {
  const appliedKeys = new Set();
  const entryByCategoryAndIndex = new Map(
    selectedItemEntries.map((entry) => [`${entry.item.categoryId}:${entry.selectionIndex}`, entry]),
  );
  const markApplied = (entry) => {
    if (entry) appliedKeys.add(`${entry.item.categoryId}:${entry.selectionIndex}`);
  };

  for (const entry of selectedItemEntries) {
    const { item } = entry;
    if (item.categoryId === "skills" || item.categoryId === "supports") continue;
    if (hasModeledStatContribution(getItemStats(item))) markApplied(entry);
  }

  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    const skillEntry = entryByCategoryAndIndex.get(`skills:${rowIndex}`);
    const row = getSkillRowContext(normalized, rowIndex);
    if (!row) continue;
    const { skill, level, externalMain } = row;
    const skillStats = externalMain ? {} : getSkillRuntimeStats(skill, level);
    const skillCalculationSupported = !externalMain
      && !isCalculationUnsupportedItem(skill)
      && hasModeledStatContribution(skillStats);

    if (!externalMain && skillEntry) {
      if (hasModeledStatContribution(skillStats)) markApplied(skillEntry);
    }

    for (let supportIndex = 0; supportIndex < 5; supportIndex += 1) {
      const supportEntry = entryByCategoryAndIndex.get(`supports:${rowIndex * 5 + supportIndex}`);
      if (!supportMatchesSkill(supportEntry?.item, skill)) continue;
      if (!skillCalculationSupported) continue;
      const supportLevel = getSupportLevel(normalized, rowIndex, supportIndex, level);
      if (getSupportDamageEffects(supportEntry.item, supportLevel).length) markApplied(supportEntry);
    }
  }

  for (const entry of selectedItemEntries.filter(({ item }) => item.categoryId === "gear")) {
    const { item, selectionIndex } = entry;
    if (isCalculationUnsupportedItem(item)) continue;
    const config = getGearInstanceConfiguration(normalized, item.id, selectionIndex);
    if (
      firebirdProjection?.active
      && firebirdProjection.itemId === item.id
      && firebirdProjection.selectionIndex === selectionIndex
      && firebirdProjection.entries.some(({ value }) => Number.isFinite(value) && value !== 0)
    ) {
      markApplied(entry);
    }
    const legendaryRolls = getLegendaryRolls(
      item,
      config.legendaryDraft,
      config.corrupted,
    );
    for (const roll of legendaryRolls) {
      const value = Number(config.rolls[roll.id] ?? roll.defaultValue);
      if (!Number.isFinite(value)) continue;
      if ((roll.stat === "moreDps" || Object.hasOwn(BASE_STATS, roll.stat)) && value !== 0) markApplied(entry);
    }

    if (hasModeledCraftContribution(item, config.crafts)) markApplied(entry);
  }

  return appliedKeys;
}

function getSupportCalculationInactiveReason(normalized, support, selectionIndex) {
  const row = getSkillRowContext(normalized, Math.floor(selectionIndex / 5));
  if (!row) return "no modeled compatible link";
  if (!supportMatchesSkill(support, row.skill)) return "incompatible-support";
  if (row.externalMain) return getExternalSkillUnsupportedReason(row.externalMain);
  if (isCalculationUnsupportedItem(row.skill)) return getCalculationUnsupportedReason(row.skill);
  const skillStats = getSkillRuntimeStats(row.skill, row.level);
  return Number.isFinite(Number(skillStats.dps))
    ? "no modeled compatible link"
    : getCalculationUnsupportedReason(row.skill);
}

function getPactProjectionStats(entry) {
  return entry?.modelingStatus === "candidate"
    ? parseCustomAffixes(entry.parserText)
    : {};
}

function projectionHasValueAuthority(projection) {
  return projection?.reference?.valueAuthority === true;
}

function mappingBlockerHandledByDomainRuntime(item, blocker) {
  const effect = { stat: blocker?.stat, operation: blocker?.operation };
  if (item?.categoryId === "gear" && isTlidbGearCraftCombatEffect(effect)) return true;
  if (!["skills", "supports"].includes(item?.categoryId)) return false;
  const stat = String(blocker?.stat ?? "");
  if (item?.categoryId === "skills" && isTlidbElixirMainSkillId(item.id) && [
    "affliction-effect",
    "skill-all-resistance",
    "skill-armor",
    "skill-critical-strike-rating",
    "skill-evasion",
    "skill-life-restoration",
    "skill-mana-restoration",
    "skill-movement-speed",
  ].includes(stat)) return true;
  return stat === "cast-time"
    || (item?.categoryId === "skills" && item?.type === "passive" && (
      stat === "sealed-mana"
      || /^skill-(?:aura-effect|life-regeneration|mana-regeneration|energy-shield-regeneration|evasion|max-energy-shield|movement-speed|armor|elemental-resistance)$/u.test(stat)
    ))
    || stat === "cooldown"
    || stat === "added-damage-effectiveness"
    || stat.includes("damage-coefficient")
    || stat.includes("damage-conversion")
    || stat.includes("damage-per-second")
    || /(?:^|-)damage(?:-|$)/u.test(stat)
    || /(?:attack|cast)-speed$/u.test(stat)
    || /cooldown-recovery-speed$/u.test(stat)
    || /projectile-quantity$/u.test(stat);
}

function talentEntryHasValueAuthority(entry) {
  return entry?.calculationValueAuthority === "tlidb-current-ss13-exact-direct-stat"
    && entry?.calculationStats
    && typeof entry.calculationStats === "object";
}

const RUNTIME_SKILL_SEAL_PATTERNS = Object.freeze({
  life: Object.freeze([
    /\bSealed Life\b/i,
    /\bLife Seal(?:ed)?\b/i,
    /(?:HP|생명(?:력)?)\s*봉인/u,
    /生命封印/u,
  ]),
  mana: Object.freeze([
    /\bSealed Mana\b/i,
    /\bMana Seal(?:ed)?\b/i,
    /(?:MP|마나)\s*봉인/u,
    /魔力封印/u,
  ]),
});

function getExactCurrentRuntimeSealStats(item) {
  if (item?.categoryId !== "skills" || item?.type !== "passive" || item?.sourceSeason !== "SS13") {
    return [];
  }

  const exactCurrentText = ["ko", "en", "cn"].flatMap((locale) => {
    const record = item.tlidbText?.[locale];
    if (record?.sourcePageVersion !== "SS13" || record?.activeBaselineSeason !== "SS13") return [];
    return ["summary", "detail"]
      .filter((field) => record.sourceFieldStatus?.[field] === "exact")
      .map((field) => record[field])
      .filter((value) => typeof value === "string" && value);
  }).join("\n");

  return Object.entries(RUNTIME_SKILL_SEAL_PATTERNS)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(exactCurrentText)))
    .map(([statKey]) => statKey);
}

function getConfiguredSkillSealReceipt(normalized, configuredSkillSlots) {
  const affectedStats = new Set();
  for (const slot of configuredSkillSlots) {
    if (Number(slot?.sealedLife ?? 0) > 0) affectedStats.add("life");
    if (Number(slot?.sealedMana ?? 0) > 0) affectedStats.add("mana");
  }
  if (Number(normalized.skillSeals?.life ?? 0) > 0) affectedStats.add("life");
  if (Number(normalized.skillSeals?.mana ?? 0) > 0) affectedStats.add("mana");

  return {
    affectedStats: ["life", "mana"].filter((statKey) => affectedStats.has(statKey)),
  };
}

function getCalculationProvenance(
  normalized,
  selectedItemEntries,
  talentProjection = null,
  pactProjection = null,
  divinityProjection = null,
  firebirdProjection = null,
  talentEffectProjection = null,
  pactEffectProjection = null,
  divinityEffectProjection = null,
  heroTraitEffectProjection = null,
  heroMemoryEffectProjection = null,
  elixirProjection = null,
) {
  const appliedKeys = getCalculationParticipation(
    normalized,
    selectedItemEntries,
    firebirdProjection,
  );
  const sources = [
    createProvenanceSource({
      id: "base:combat",
      label: "measured base combat constants",
      evidence: "measured",
    }),
    createProvenanceSource({
      id: "model:defensive-survivability",
      label: "defensive EHP and maximum-hit calculation model",
      evidence: "unsupported",
      applied: false,
      inactiveReason: "defensive-calculation-model-unavailable",
    }),
  ];
  const resolvedConditions = resolveConditionValues(normalized.conditions);
  const missingLife = Number(resolvedConditions.regain?.missingLife ?? 0);
  const missingShield = Number(resolvedConditions.regain?.missingShield ?? 0);
  const verifiedRegainEffects = (divinityEffectProjection?.readyEffects ?? []).filter(
    ({ calculationCapability, value }) => (
      calculationCapability === TLIDB_DIVINITY_REGAIN_CAPABILITY.id
      && Number(value) > 0
    ),
  );
  const hasLifeRegain = verifiedRegainEffects.some(
    ({ calculationCapabilityResource }) => calculationCapabilityResource === "life",
  );
  const hasShieldRegain = verifiedRegainEffects.some(
    ({ calculationCapabilityResource }) => calculationCapabilityResource === "shield",
  );
  const hasVerifiedRegain = hasLifeRegain || hasShieldRegain;
  const hasMissingRegainInput = missingLife > 0 || missingShield > 0;
  if (hasVerifiedRegain || hasMissingRegainInput) {
    const regainApplied = (hasLifeRegain && missingLife > 0)
      || (hasShieldRegain && missingShield > 0);
    sources.push(createProvenanceSource({
      id: "base:tlidb-regain",
      label: "TLIDB per-hit Regain formula",
      categoryId: "mechanics",
      sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.regain.sourceUrl,
      sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.regain.sourceRecordKey,
      receipt: {
        sourcePageSha256: TLIDB_HELP_CALCULATION_SOURCES.regain.sourcePageSha256,
        sourceFieldStatus: "exact",
        baseIntervalSeconds: TLIDB_HELP_CALCULATION_SOURCES.regain.baseIntervalSeconds,
        maximumPercent: TLIDB_HELP_CALCULATION_SOURCES.regain.maximumPercent,
      },
      evidence: "structured",
      applied: regainApplied,
      inactiveReason: regainApplied
        ? undefined
        : !hasVerifiedRegain
          ? "verified-regain-source-unavailable"
          : !hasMissingRegainInput
            ? "missing-resource-input-zero"
            : "regain-resource-input-not-matched",
    }));
  }
  sources.push(createProvenanceSource({
    id: "base:tlidb-regain-interval",
    label: "TLIDB Regain interval formula",
    categoryId: "mechanics",
    sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.regain.sourceUrl,
    sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.regain.sourceRecordKey,
    receipt: {
      sourcePageSha256: TLIDB_HELP_CALCULATION_SOURCES.regain.sourcePageSha256,
      sourceFieldStatus: "exact",
      baseIntervalSeconds: TLIDB_HELP_CALCULATION_SOURCES.regain.baseIntervalSeconds,
      intervalsAreSeparate: true,
    },
    evidence: "structured",
    applied: true,
  }));

  if (talentProjection?.active && talentProjection.reference) {
    const structuralReferenceVersion = talentProjection.reference.structuralReferenceVersion;
    const valueAuthority = (talentEffectProjection?.effects ?? []).length > 0;
    sources.push(
      createProvenanceSource({
        id: `reference:91tob:${talentProjection.reference.appVersion}:${structuralReferenceVersion}`,
        label: `${talentProjection.reference.bundleUrl} (${talentProjection.reference.runtimePath.join("/")})`,
        categoryId: "talents",
        evidence: valueAuthority ? "structured" : "unsupported",
        applied: valueAuthority,
        inactiveReason: valueAuthority ? undefined : "value-authority-unverified",
      }),
    );
  }

  if (pactProjection?.active && pactProjection.reference) {
    const structuralReferenceVersion = pactProjection.reference.structuralReferenceVersion;
    const valueAuthority = (pactEffectProjection?.accounting?.readyEffectCount ?? 0) > 0;
    sources.push(
      createProvenanceSource({
        id: `reference:91tob:pact:${pactProjection.reference.appVersion}:${structuralReferenceVersion}`,
        label: `${pactProjection.reference.bundleUrl} (${pactProjection.reference.runtimePath.join("/")})`,
        categoryId: "pact",
        evidence: valueAuthority ? "structured" : "unsupported",
        applied: valueAuthority,
        inactiveReason: valueAuthority ? undefined : "value-authority-unverified",
      }),
    );
  }

  if (divinityProjection?.active && divinityProjection.reference) {
    const structuralReferenceVersion = divinityProjection.reference.structuralReferenceVersion;
    const applied = (divinityEffectProjection?.readyEffects ?? []).length > 0;
    sources.push(
      createProvenanceSource({
        id: `reference:91tob:divinity:${divinityProjection.reference.appVersion}:${structuralReferenceVersion}`,
        label: `${divinityProjection.reference.bundleUrl} (${divinityProjection.reference.localModelPath})`,
        categoryId: "slates",
        evidence: "structured",
        applied,
        inactiveReason: applied ? undefined : "no-modeled-current-value-contribution",
      }),
    );
  }

  const skillEnergyUsage = getSkillEnergyUsage(normalized.skills);
  if (skillEnergyUsage.used > 0) {
    sources.push(
      createProvenanceSource({
        id: "input:skill-support-slot-energy",
        label: "unlocked support slot energy costs",
        categoryId: "skills",
        evidence: "unsupported",
        applied: false,
        inactiveReason: "value-authority-unverified",
      }),
    );
  }

  const configuredSkillSlots = [
    ...(normalized.skills?.active ?? []),
    ...(normalized.skills?.passive ?? []),
  ];
  const skillSealReceipt = getConfiguredSkillSealReceipt(normalized, configuredSkillSlots);
  if (skillSealReceipt.affectedStats.length) {
    sources.push(
      createProvenanceSource({
        id: "input:skill-seal-config",
        label: "skill seal configuration",
        categoryId: "skills",
        evidence: "unsupported",
        applied: false,
        inactiveReason: "value-authority-unverified",
        receipt: skillSealReceipt,
      }),
    );
  }

  if ((elixirProjection?.configuredSlotCount ?? 0) > 0) {
    const applied = (elixirProjection?.appliedEffectCount ?? 0) > 0;
    const structured = (elixirProjection?.supportedEffectCount ?? 0) > 0;
    sources.push(
      createProvenanceSource({
        id: "input:skill-elixir-config",
        label: "skill elixir configuration",
        categoryId: "skills",
        evidence: structured ? "structured" : "unsupported",
        applied,
        inactiveReason: applied
          ? undefined
          : !structured
            ? "value-authority-unverified"
            : elixirProjection?.status === "inactive"
              ? "elixir-skill-condition-inactive"
              : "elixir-skill-effect-calculation-unavailable",
        receipt: elixirProjection.receipt,
      }),
    );
    const ingredientSources = new Map();
    for (const effect of elixirProjection.effects ?? []) {
      if (effect.sourceId && effect.sourceLabel && !ingredientSources.has(effect.sourceId)) {
        ingredientSources.set(effect.sourceId, effect);
      }
    }
    for (const [sourceId, effect] of ingredientSources) {
      sources.push(createProvenanceSource({
        id: sourceId,
        label: effect.sourceLabel,
        categoryId: "skills",
        sourceUrl: effect.sourceUrl,
        sourceRecordKey: effect.sourceRecordKey,
        receipt: effect.receipt,
        evidence: "structured",
        applied: effect.active,
        inactiveReason: effect.active ? undefined : effect.inactiveReason,
      }));
    }
  }

  const hasUnmodeledSupportRule = configuredSkillSlots.some((slot) => (
    (slot?.supports ?? []).some((support) => support?.config && Object.keys(support.config).some(
      (key) => key !== "effectRollOverrides",
    ))
  ));
  if (hasUnmodeledSupportRule) {
    sources.push(
      createProvenanceSource({
        id: "input:skill-support-config",
        label: "support skill configuration",
        categoryId: "supports",
        evidence: "unsupported",
        applied: false,
        inactiveReason: "value-authority-unverified",
      }),
    );
  }

  if (hasActiveHeroSelection(normalized)) {
    const shieldChargeActive = resolveConditionValues(normalized.conditions)
      .playerStates?.shield_recharge_active === true;
    sources.push(
      createProvenanceSource({
        id: "base:tlidb-hero-level",
        label: `TLIDB hero level formulas at Lv.${normalized.heroLevel}`,
        categoryId: "hero",
        sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.characterBuild.sourceUrl,
        sourceRecordKey: "Character Build - Life/Mana/Evade/Resistance",
        evidence: "structured",
        applied: true,
      }),
      createProvenanceSource({
        id: "base:tlidb-movement-speed",
        label: "TLIDB base movement speed and non-additional percentage formula",
        categoryId: "hero",
        sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.movementSpeed.sourceUrl,
        sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.movementSpeed.sourceRecordKey,
        receipt: {
          sourcePageSha256: TLIDB_HELP_CALCULATION_SOURCES.movementSpeed.sourcePageSha256,
          sourceFieldStatus: "exact",
        },
        evidence: "structured",
        applied: true,
      }),
      createProvenanceSource({
        id: "base:tlidb-shield-charge",
        label: "TLIDB hero base Shield Charge",
        categoryId: "hero",
        sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.sourceUrl,
        sourceRecordKey: TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.sourceRecordKey,
        receipt: {
          sourcePageSha256: TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.sourcePageSha256,
          sourceFieldStatus: "exact",
          baseIntervalSeconds: TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.baseIntervalSeconds,
          basePercentPerSecond: TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.basePercentPerSecond,
        },
        evidence: "structured",
        applied: shieldChargeActive,
        inactiveReason: shieldChargeActive
          ? undefined
          : "shield-charge-condition-inactive",
      }),
    );
  }

  if ((normalized.hero?.traitSelections ?? []).length > 0) {
    if ((heroTraitEffectProjection?.selectedOptions ?? []).length > 0) {
      for (const option of heroTraitEffectProjection.selectedOptions) {
        const applied = option.readyEffectCount > 0;
        sources.push(createProvenanceSource({
          id: option.sourceItemId,
          label: option.sourceLabel || option.sourceItemId,
          categoryId: "hero",
          sourceUrl: option.sourceUrl,
          sourceRecordKey: option.sourceRecordKey,
          receipt: option.receipt,
          evidence: applied ? "structured" : "unsupported",
          applied,
          inactiveReason: applied
            ? undefined
            : "hero-trait-complex-or-conditional-effect-unmodeled",
        }));
      }
    } else {
      sources.push(
        createProvenanceSource({
          id: "input:hero-trait-config",
          label: "hero trait configuration",
          categoryId: "hero",
          evidence: "unsupported",
          applied: false,
          inactiveReason: heroTraitEffectProjection?.blockers?.[0]?.reason
            ?? "value-authority-unverified",
        }),
      );
    }
  }
  if ((normalized.hero?.memories ?? []).some(Boolean)) {
    const effectSources = new Map();
    for (const effect of heroMemoryEffectProjection?.readyEffects ?? []) {
      const sourceId = effect.flatCatalogItemId ?? effect.sourceItemId;
      if (sourceId && !effectSources.has(sourceId)) effectSources.set(sourceId, effect);
    }
    for (const [sourceId, effect] of effectSources) {
      const item = findItemById(sourceId);
      sources.push(createProvenanceSource({
        id: sourceId,
        label: getCalculationItemLabel(item, effect.sourceText || sourceId),
        categoryId: "heroMemory",
        sourceUrl: effect.sourceUrl,
        sourceRecordKey: effect.sourceRecordKey,
        receipt: {
          sourcePageSha256: effect.sourcePageSha256,
          sourceFieldStatus: "exact",
        },
        evidence: "structured",
        applied: true,
      }));
    }
    if (!effectSources.size) {
      sources.push(createProvenanceSource({
        id: "input:hero-memory-config",
        label: "hero memory configuration",
        categoryId: "heroMemory",
        evidence: "unsupported",
        applied: false,
        inactiveReason: heroMemoryEffectProjection?.blockers?.[0]?.reason
          ?? "value-authority-unverified",
      }));
    }
  }

  const externalMain = getExternalMainSkillOverride(null, normalized, "active", 0);
  if (externalMain?.skill) {
    const inactiveReason = getExternalSkillUnsupportedReason(externalMain);
    sources.push(
      createProvenanceSource({
        id: externalMain.skill.id,
        label: getCalculationItemLabel(externalMain.skill, externalMain.skill.id),
        categoryId: "skills",
        evidence: "unsupported",
        applied: false,
        inactiveReason,
      }),
    );
  }

  for (const { item, selectionIndex } of selectedItemEntries) {
    const profile = getItemCalcProfile(item);
    const tlidbAuthority = getTlidbCalculationAuthority(item);
    const applied = appliedKeys.has(`${item.categoryId}:${selectionIndex}`);
    const gearConfig = item.categoryId === "gear"
      ? getGearInstanceConfiguration(normalized, item.id, selectionIndex)
      : null;
    const hasSelectedCraftContribution =
      gearConfig && hasModeledCraftContribution(item, gearConfig.crafts);
    const hasFirebirdContribution = firebirdProjection?.active
      && firebirdProjection.itemId === item.id
      && firebirdProjection.selectionIndex === selectionIndex;
    sources.push(
      createProvenanceSource({
        id: item.id,
        label: getCalculationItemLabel(item, item.id),
        categoryId: item.categoryId,
        sourceUrl: tlidbAuthority?.sourceUrl,
        sourceRecordKey: tlidbAuthority?.sourceRecordKey,
        receipt: tlidbAuthority?.receipt,
        evidence:
          profile === "runtime" || hasSelectedCraftContribution || hasFirebirdContribution
            ? "structured"
            : profile === "parsedText"
              ? "inferred"
              : "unsupported",
        applied,
        inactiveReason: applied
          ? undefined
          : isCalculationUnsupportedItem(item)
            ? getCalculationUnsupportedReason(item)
          : item.categoryId === "supports"
            ? getSupportCalculationInactiveReason(normalized, item, selectionIndex)
            : item.categoryId === "gear"
              ? "no modeled gear contribution"
              : "no modeled calculation contribution",
      }),
    );
    const authorityBlockers = [
      ...(tlidbAuthority?.parserBlockers ?? []),
      ...(tlidbAuthority?.mappingBlockers ?? []).filter(
        (blocker) => !mappingBlockerHandledByDomainRuntime(item, blocker),
      ),
    ];
    for (const [blockerIndex, blocker] of authorityBlockers.entries()) {
      sources.push(createProvenanceSource({
        id: `${item.id}:tlidb-tooltip-blocker:${blockerIndex}`,
        label: `${getCalculationItemLabel(item, item.id)} TLIDB effect`,
        categoryId: item.categoryId,
        evidence: "unsupported",
        applied: false,
        sourceUrl: tlidbAuthority.sourceUrl,
        sourceRecordKey: tlidbAuthority.sourceRecordKey,
        receipt: {
          ...tlidbAuthority.receipt,
          sourceText: blocker.sourceText,
          blockerReason: blocker.reason,
        },
        inactiveReason: blocker.reason || "tlidb-tooltip-effect-unresolved",
      }));
    }
    if (item.categoryId === "gear" && !hasCompleteCurrentSs13GearCalculation(item.id)) {
      sources.push(
        createProvenanceSource({
          id: `${item.id}:calculation-coverage`,
          label: "gear calculation coverage",
          categoryId: "gear",
          evidence: "unsupported",
          applied: false,
          inactiveReason: "gear-calculation-coverage-incomplete",
        }),
      );
    }
  }

  const registeredSourceIds = new Set(sources.map(({ id }) => id));
  for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
    const runtimeSlot = getRuntimeSkillSlot(normalized, rowIndex);
    const modularizationProjection = projectTlidbModularizationCalculation({
      skillId: runtimeSlot?.skillId,
      config: runtimeSlot?.modularization,
      conditions: normalized.conditions,
    });
    for (const effect of modularizationProjection.effects) {
      if (!effect.sourceId || registeredSourceIds.has(effect.sourceId)) continue;
      const item = findItemById(effect.sourceId);
      sources.push(createProvenanceSource({
        id: effect.sourceId,
        label: getCalculationItemLabel(item, effect.sourceText || effect.sourceId),
        categoryId: item?.categoryId || "supports",
        sourceUrl: effect.sourceUrl,
        sourceRecordKey: effect.sourceRecordKey,
        receipt: {
          sourceKind: effect.sourceKind,
          sourceModuleOptionId: effect.sourceModuleOptionId,
          sourcePageSha256: effect.sourcePageSha256,
          sourceFieldStatus: "exact",
        },
        evidence: "structured",
        applied: true,
      }));
      registeredSourceIds.add(effect.sourceId);
    }
    for (const blocker of modularizationProjection.blockers) {
      if (!blocker.sourceId || registeredSourceIds.has(blocker.sourceId)) continue;
      const item = findItemById(blocker.sourceId);
      const ko = item?.tlidbText?.ko;
      sources.push(createProvenanceSource({
        id: blocker.sourceId,
        label: getCalculationItemLabel(item, blocker.sourceId),
        categoryId: item?.categoryId || "supports",
        sourceUrl: ko?.sourceUrl,
        sourceRecordKey: ko?.sourceRecordKey,
        receipt: {
          sourceKind: "modularization-option",
          sourceModuleOptionId: blocker.sourceModuleOptionId,
          sourcePageSha256: ko?.sourcePageSha256,
          sourceFieldStatus: ko?.sourceFieldStatus?.detail,
        },
        evidence: "unsupported",
        applied: false,
        inactiveReason: blocker.reason,
      }));
      registeredSourceIds.add(blocker.sourceId);
    }
  }

  for (const unsupported of firebirdProjection?.unsupported ?? []) {
    sources.push(
      createProvenanceSource({
        id: getFirebirdUnsupportedSourceId(unsupported.semanticTargetKey),
        label: unsupported.semanticTargetKey,
        categoryId: "gear",
        evidence: "unsupported",
        applied: false,
        inactiveReason: unsupported.reason,
      }),
    );
  }

  for (const entry of talentProjection?.entries ?? []) {
    const projectedEffects = (talentEffectProjection?.effects ?? []).filter(
      (effect) => effect.projectionEntryId === entry.id,
    );
    const projectedBlocker = (talentEffectProjection?.blockers ?? []).find(
      (blocker) => blocker.projectionEntryId === entry.id,
    );
    const applied = projectedEffects.length > 0 && !projectedBlocker;
    sources.push(
      createProvenanceSource({
        id: entry.id,
        label: entry.sourceLabel || entry.rawText || entry.id,
        categoryId: "talents",
        evidence: applied ? "structured" : "unsupported",
        applied,
        inactiveReason: applied
          ? undefined
          : projectedBlocker?.reason
            ?? entry.calculationAuthorityReason
            ?? "value-authority-unverified",
      }),
    );
  }
  for (const rule of talentProjection?.rules ?? []) {
    const applied = projectionHasValueAuthority(talentProjection) && rule.applied !== false;
    sources.push(
      createProvenanceSource({
        id: rule.id,
        label: rule.origin,
        categoryId: "talents",
        evidence: applied ? "structured" : "unsupported",
        applied,
        inactiveReason: applied ? undefined : "value-authority-unverified",
      }),
    );
  }

  for (const entry of pactProjection?.entries ?? []) {
    const projectedEffects = (pactEffectProjection?.effects ?? []).filter(
      (effect) => effect.projectionEntryId === entry.id && effect.calculationReady,
    );
    const projectedBlocker = (pactEffectProjection?.blockers ?? []).find(
      (blocker) => blocker.projectionEntryId === entry.id,
    );
    const applied = projectedEffects.length > 0 && !projectedBlocker;
    const sourceIdentity = getVerifiedPactProjectionSourceIdentity(
      pactEffectProjection,
      "entry",
      entry.id,
    );
    sources.push(
      createProvenanceSource({
        id: entry.id,
        label: entry.sourceLabel || entry.rawText || entry.id,
        categoryId: entry.categoryId,
        evidence: applied ? "structured" : "unsupported",
        applied,
        sourceItemId: sourceIdentity?.sourceItemId,
        sourceUrl: sourceIdentity?.sourceUrl,
        inactiveReason: applied
          ? undefined
          : projectedBlocker?.reason
            ?? (entry.modelingStatus === "candidate"
              ? "no modeled pact text contribution"
              : entry.modelingStatus),
      }),
    );
  }
  for (const rule of pactProjection?.rules ?? []) {
    const projectedBlocker = (pactEffectProjection?.blockers ?? []).find(
      (blocker) => blocker.ruleId === rule.id,
    );
    const applied = Boolean(rule.applied) && !projectedBlocker;
    const sourceIdentity = getVerifiedPactProjectionSourceIdentity(
      pactEffectProjection,
      "rule",
      rule.id,
    );
    sources.push(
      createProvenanceSource({
        id: rule.id,
        label: rule.origin,
        categoryId: rule.categoryId || "pact",
        evidence: applied ? "structured" : "unsupported",
        applied,
        sourceItemId: sourceIdentity?.sourceItemId,
        sourceUrl: sourceIdentity?.sourceUrl,
        inactiveReason: applied
          ? undefined
          : projectedBlocker?.reason ?? rule.inactiveReason ?? rule.status,
      }),
    );
  }

  for (const entry of divinityProjection?.entries ?? []) {
    const projectedEffects = (divinityEffectProjection?.readyEffects ?? []).filter(
      (effect) => effect.projectionEntryId === entry.id,
    );
    const projectedBlocker = (divinityEffectProjection?.blockers ?? []).find(
      (blocker) => blocker.projectionEntryId === entry.id,
    );
    const applied = projectedEffects.length > 0 && !projectedBlocker;
    sources.push(
      createProvenanceSource({
        id: entry.id,
        label: entry.sourceLabel || entry.rawText || entry.id,
        categoryId: "slates",
        evidence: applied ? "structured" : "unsupported",
        applied,
        sourceUrl: entry.sourceUrl,
        sourceRecordKey: entry.sourceRecordKey,
        receipt: entry.receipt,
        inactiveReason: applied ? undefined : projectedBlocker?.reason ?? entry.modelingStatus,
      }),
    );
  }
  for (const rule of divinityProjection?.rules ?? []) {
    sources.push(
      createProvenanceSource({
        id: rule.id,
        label: rule.sourceLabel || rule.rawText || rule.origin,
        categoryId: "slates",
        evidence: "unsupported",
        applied: false,
        sourceUrl: rule.sourceUrl,
        sourceRecordKey: rule.sourceRecordKey,
        receipt: rule.receipt,
        inactiveReason: rule.inactiveReason || rule.status,
      }),
    );
  }

  if (normalized.customAffixes.trim()) {
    const customStats = parseCustomAffixes(normalized.customAffixes);
    const applied = hasModeledStatContribution(customStats);
    sources.push(
      createProvenanceSource({
        id: "custom:affixes",
        label: "user custom affixes",
        evidence: "inferred",
        applied,
        inactiveReason: applied ? undefined : "no modeled custom affix contribution",
      }),
    );
  }

  const gearAffixText = getSelectedGearAffixText(normalized, selectedItemEntries);
  if (gearAffixText) {
    sources.push(
      createProvenanceSource({
        id: "custom:gear-affixes",
        label: "user gear affix overrides",
        categoryId: "gear",
        evidence: "unsupported",
        applied: false,
        inactiveReason: "gear-text-numeric-parsing-disabled",
      }),
    );
  }

  return summarizeCalculationProvenance(CURRENT_PATCH_SNAPSHOT, sources, normalized.patchSnapshot);
}

const rawStatKey = (statKey) => `flat:${statKey}`;
const tlidbIncreaseKey = (statKey) => `tlidb:increase:${statKey}`;
const tlidbMoreKey = (statKey) => `tlidb:more:${statKey}`;

function getFirebirdModifierChannelKey(entry) {
  if (entry.semanticTargetKey === "maxLifePercent") return tlidbIncreaseKey("life");
  if (entry.semanticTargetKey === "maxShieldPercent") return tlidbIncreaseKey("shield");
  return entry.calculationStatKey
    ? rawStatKey(entry.calculationStatKey)
    : `firebird:modifier:${entry.semanticTargetKey}`;
}

function getFirebirdUnsupportedChannelKey(entry) {
  return `firebird:unsupported:${entry.semanticTargetKey}`;
}

function getFirebirdEffectId(entry, selectionIndex) {
  return `${entry.id}:selection:${selectionIndex}`;
}

function getEffectSource(provenance, sourceId, fallback = {}) {
  const source = provenance.sources.find((candidate) => candidate.id === sourceId);
  return {
    sourceId,
    sourceLabel: source?.label || fallback.sourceLabel || sourceId,
    sourceItemId: source?.sourceItemId || fallback.sourceItemId || "",
    sourceIconUrl: fallback.sourceIconUrl || "",
    categoryId: source?.categoryId || fallback.categoryId || "",
    evidence: source?.evidence || fallback.evidence || "unsupported",
    sourceUrl: source?.sourceUrl || fallback.sourceUrl || "",
    sourceRecordKey: source?.sourceRecordKey || fallback.sourceRecordKey || "",
    receipt: source?.receipt || fallback.receipt,
    conditionRequirements: fallback.conditionRequirements,
  };
}

function applyTlidbElixirCalculationProjection(
  accumulator,
  projection,
  provenance,
  nextOrder,
) {
  if (!projection || projection.configuredSlotCount === 0) return;

  for (const [effectIndex, effect] of projection.effects.entries()) {
    if (tlidbEffectNeedsSkillRowRuntime(effect)) continue;
    const item = findItemById(effect.sourceId);
    const source = getEffectSource(provenance, effect.sourceId, {
      sourceLabel: effect.sourceLabel || getCalculationItemLabel(item, effect.sourceId),
      sourceIconUrl: item?.iconUrl,
      categoryId: "skills",
      evidence: "structured",
      sourceUrl: effect.sourceUrl,
      sourceRecordKey: effect.sourceRecordKey,
      receipt: effect.receipt,
    });
    accumulator.apply(createEffect({
      id: `${effect.sourceId}:elixir:${effectIndex}:${effect.stat}`,
      ...source,
      targetKey: effect.stat === "moreDps" ? "moreDpsMultiplier" : rawStatKey(effect.stat),
      operation: effect.operation,
      value: effect.value,
      applied: effect.active,
      inactiveReason: effect.active ? "" : effect.inactiveReason,
      order: nextOrder.value++,
      sourceText: effect.sourceText,
      unit: effect.unit,
    }));
  }

  for (const [blockerIndex, blocker] of projection.blockers.entries()) {
    const sourceId = blocker.sourceId || "input:skill-elixir-config";
    const item = findItemById(sourceId);
    const source = getEffectSource(provenance, sourceId, {
      sourceLabel: blocker.sourceText || getCalculationItemLabel(item, sourceId),
      sourceIconUrl: item?.iconUrl,
      categoryId: "skills",
      evidence: "unsupported",
    });
    accumulator.apply(createEffect({
      id: `${sourceId}:elixir-blocker:${blockerIndex}`,
      ...source,
      targetKey: "unmodeled",
      operation: "add",
      value: null,
      evidence: "unsupported",
      applied: false,
      inactiveReason: blocker.reason,
      order: nextOrder.value++,
      sourceText: blocker.sourceText,
      ingredientId: blocker.ingredientId,
    }));
  }
}

function applyFirebirdCalculationProjection(
  accumulator,
  firebirdProjection,
  provenance,
  nextOrder,
) {
  if (!firebirdProjection?.active) return;
  const item = findItemById(firebirdProjection.itemId);
  const source = getEffectSource(provenance, firebirdProjection.itemId, {
    sourceLabel: getCalculationItemLabel(item, firebirdProjection.itemId),
    sourceIconUrl: item?.iconUrl,
    categoryId: "gear",
    evidence: "structured",
  });

  for (const entry of firebirdProjection.entries) {
    const targetKey = getFirebirdModifierChannelKey(entry);
    if (targetKey.startsWith("firebird:modifier:")) {
      accumulator.initialize(targetKey, 0, {
        sourceId: firebirdProjection.itemId,
        evidence: "structured",
      });
    }
    accumulator.apply(createEffect({
      id: getFirebirdEffectId(entry, firebirdProjection.selectionIndex),
      ...source,
      targetKey,
      operation: "add",
      value: entry.value,
      order: nextOrder.value++,
      unit: entry.unit,
      valueOrigin: entry.valueOrigin,
      semanticTargetKey: entry.semanticTargetKey,
      sourceAlias: entry.sourceAlias,
      sourceRollAlias: entry.sourceRollAlias,
      sourceRecordKey: entry.sourceRecordKey,
      sourceModifierId: entry.sourceModifierId,
      rollId: entry.rollId,
      authorityStatus: entry.authorityStatus,
      slotId: entry.slotId,
      variant: entry.variant,
      requestedValue: entry.requestedValue,
      clamped: entry.clamped,
    }));
  }

  for (const entry of firebirdProjection.unsupported) {
    const targetKey = getFirebirdUnsupportedChannelKey(entry);
    const sourceId = getFirebirdUnsupportedSourceId(entry.semanticTargetKey);
    const unsupportedSource = getEffectSource(provenance, sourceId, {
      sourceLabel: entry.semanticTargetKey,
      categoryId: "gear",
      evidence: "unsupported",
    });
    accumulator.initialize(targetKey, 0, {
      sourceId,
      evidence: "unsupported",
    });
    accumulator.apply(createEffect({
      id: getFirebirdEffectId(entry, firebirdProjection.selectionIndex),
      ...unsupportedSource,
      targetKey,
      operation: "add",
      value: null,
      evidence: "unsupported",
      applied: false,
      inactiveReason: entry.reason,
      order: nextOrder.value++,
      unit: entry.unit,
      semanticTargetKey: entry.semanticTargetKey,
      sourceAlias: entry.sourceAlias,
      sourceRollAlias: entry.sourceRollAlias,
      sourceRecordKey: entry.sourceRecordKey,
      sourceModifierId: entry.sourceModifierId,
      authorityStatus: entry.authorityStatus,
      slotId: entry.slotId,
      variant: entry.variant,
      dependency: entry.dependency,
    }));
  }
}

function finalizeFirebirdCalculationProjection(firebirdProjection, snapshot) {
  if (!firebirdProjection?.active) return firebirdProjection;
  const entries = firebirdProjection.entries.map((entry) => Object.freeze({
    ...entry,
    effectId: getFirebirdEffectId(entry, firebirdProjection.selectionIndex),
    calculationChannelKey: getFirebirdModifierChannelKey(entry),
  }));
  const unsupported = firebirdProjection.unsupported.map((entry) => Object.freeze({
    ...entry,
    effectId: getFirebirdEffectId(entry, firebirdProjection.selectionIndex),
    calculationChannelKey: getFirebirdUnsupportedChannelKey(entry),
  }));
  const traces = Object.freeze(Object.fromEntries([
    ...entries.map((entry) => [
      entry.semanticTargetKey,
      snapshot.traces[entry.calculationChannelKey],
    ]),
    ...unsupported.map((entry) => {
      const trace = snapshot.traces[entry.calculationChannelKey];
      return [entry.semanticTargetKey, Object.freeze({
        ...trace,
        status: "unsupported",
        reason: entry.reason,
        baseValue: null,
        rawValue: null,
        finalValue: null,
      })];
    }),
  ]));

  return Object.freeze({
    ...firebirdProjection,
    entries: Object.freeze(entries),
    unsupported: Object.freeze(unsupported),
    traces,
  });
}

function applyStatRecord(accumulator, stats, source, nextOrder, phase, excludedKeys = new Set()) {
  for (const statKey of [...Object.keys(BASE_STATS), "critDamage"]) {
    if (excludedKeys.has(statKey)) continue;
    const value = Number(stats[statKey] ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;
    accumulator.apply(createEffect({
      id: `${source.sourceId}:${phase}:${statKey}`,
      ...source,
      targetKey: rawStatKey(statKey),
      operation: "add",
      value,
      order: nextOrder.value++,
    }));
  }

  const moreDps = Number(stats.moreDps ?? 0);
  if (Number.isFinite(moreDps) && moreDps !== 0) {
    accumulator.apply(createEffect({
      id: `${source.sourceId}:${phase}:moreDps`,
      ...source,
      targetKey: "moreDpsMultiplier",
      operation: "more",
      value: moreDps,
      order: nextOrder.value++,
    }));
  }
}

function applyConfiguredGearAndCustomEffects(
  accumulator,
  normalized,
  selectedItemEntries,
  provenance,
  nextOrder,
  craftSelections,
) {
  applyStatRecord(
    accumulator,
    parseCustomAffixes(normalized.customAffixes),
    getEffectSource(provenance, "custom:affixes", { evidence: "inferred" }),
    nextOrder,
    "custom",
  );
  for (const { item, selectionIndex } of selectedItemEntries.filter(({ item }) => item.categoryId === "gear")) {
    if (isCalculationUnsupportedItem(item)) continue;
    const config = getGearInstanceConfiguration(normalized, item.id, selectionIndex);
    const source = getEffectSource(provenance, item.id, {
      sourceLabel: getCalculationItemLabel(item, item.id),
      sourceIconUrl: item.iconUrl,
      categoryId: "gear",
      conditionRequirements: item.conditionRequirements,
    });
    const selectedAuthority = getSelectedGearAuthority(item, config);
    const legendaryRolls = getLegendaryRolls(item, config.legendaryDraft, config.corrupted)
      .filter((roll) => !selectedAuthority?.variantReceipts?.some((receipt) => roll.id.startsWith(`legendary:${receipt.slotId}:corroded:`)));
    for (const roll of legendaryRolls) {
      const value = Number(config.rolls[roll.id] ?? roll.defaultValue);
      if (!Number.isFinite(value) || value === 0) continue;
      if (roll.stat !== "moreDps" && !Object.hasOwn(BASE_STATS, roll.stat)) continue;
      accumulator.apply(createEffect({
        id: `${item.id}:slot:${selectionIndex}:roll:${roll.id}`,
        ...source,
        targetKey: roll.stat === "moreDps" ? "moreDpsMultiplier" : rawStatKey(roll.stat),
        operation: roll.stat === "moreDps" ? "more" : "add",
        value,
        order: nextOrder.value++,
      }));
    }
    const craft = craftSelections.get(selectionIndex);
    const craftResolution = resolveTlidbTooltipEffects(craft?.genericEffects ?? [], {
      conditions: normalized.conditions,
      rollValues: craft?.rollValues ?? {},
      stats: currentTlidbRuntimeStats(accumulator),
    });
    for (const [effectIndex, contribution] of craftResolution.applied.entries()) {
      const targetKey = contribution.operation === "increase"
        ? tlidbIncreaseKey(contribution.stat)
        : contribution.operation === "more"
          ? tlidbMoreKey(contribution.stat)
          : rawStatKey(contribution.stat);
      accumulator.apply(createEffect({
        id: `${item.id}:slot:${selectionIndex}:craft:${contribution.affixId ?? "unknown"}`
          + `:${contribution.tierId ?? "unknown"}`
          + `:${contribution.roll?.rollKey ?? "fixed"}:${effectIndex}:${contribution.stat}`,
        ...source,
        targetKey,
        operation: contribution.operation === "increase" ? "add" : contribution.operation,
        value: contribution.value,
        order: nextOrder.value++,
        sourceText: contribution.sourceText,
        sourceRecordKey: contribution.sourceRecordKey,
        sourceModifierId: contribution.sourceModifierId,
        rollId: contribution.roll?.rollKey,
      }));
    }
    for (const [blockerIndex, blocker] of [
      ...(craft?.blockers ?? []),
      ...craftResolution.excluded.map((effect) => ({
        reason: effect.inactiveReason,
        sourceText: effect.sourceText,
      })),
    ].entries()) {
      accumulator.apply(createEffect({
        id: `${item.id}:slot:${selectionIndex}:tlidb-craft-blocker:${blockerIndex}`,
        ...source,
        targetKey: "unmodeled",
        operation: "add",
        value: null,
        applied: false,
        inactiveReason: blocker.reason || "tlidb-craft-effect-unresolved",
        order: nextOrder.value++,
        sourceText: blocker.sourceText,
        sourceRecordKey: blocker.sourceRecordKey,
      }));
    }
  }
}

function buildFlatCalculation(
  normalized,
  selectedItemEntries,
  provenance,
  talentProjection = null,
  pactProjection = null,
  divinityProjection = null,
  firebirdProjection = null,
  talentEffectProjection = null,
  pactEffectProjection = null,
  divinityEffectProjection = null,
  heroTraitEffectProjection = null,
  heroMemoryEffectProjection = null,
  elixirProjection = null,
) {
  const accumulator = createPanelAccumulator({
    allowNonFiniteResults: true,
    conditionState: normalizeConditionState(normalized.conditions),
  });
  const nextOrder = { value: 1 };
  const craftSelections = resolveSelectedTlidbCrafts(normalized, selectedItemEntries);
  const gearRuntimeRecords = getTlidbGearRuntimeRecords(
    normalized,
    selectedItemEntries,
    craftSelections,
  );
  const craftExternalEffects = selectedItemEntries
    .filter(({ item }) => item.categoryId === "gear")
    .flatMap(({ item, selectionIndex }) => (
      craftSelections.get(selectionIndex)?.effects ?? []
    ).filter((effect) => !isTlidbGearCraftCombatEffect(effect)).map((effect) => ({
      ...effect,
      sourceId: item.id,
      sourceKind: "gear-craft",
    })));
  const craftExternalBlockers = selectedItemEntries
    .filter(({ item }) => item.categoryId === "gear")
    .flatMap(({ item, selectionIndex }) => (
      craftSelections.get(selectionIndex)?.blockers ?? []
    ).map((blocker) => ({
      ...blocker,
      sourceId: item.id,
      sourceKind: "gear-craft",
    })));
  const externalEffects = selectedTlidbExternalEffects(selectedItemEntries, [
    ...(talentEffectProjection?.effects ?? []),
    ...(pactEffectProjection?.effects ?? []).filter(({ calculationReady }) => calculationReady),
    ...(divinityEffectProjection?.readyEffects ?? []),
    ...(heroTraitEffectProjection?.readyEffects ?? []),
    ...(heroMemoryEffectProjection?.readyEffects ?? []),
    ...(elixirProjection?.effects ?? []).filter(({ active }) => active),
    ...craftExternalEffects,
    ...customSkillDamageEffects(normalized.customAffixes),
  ], normalized);
  const externalBlockers = selectedTlidbExternalBlockers(selectedItemEntries, [
    ...(talentEffectProjection?.blockers ?? []),
    ...(pactEffectProjection?.blockers ?? []),
    ...(divinityEffectProjection?.blockers ?? []),
    ...(heroTraitEffectProjection?.blockers ?? []),
    ...(heroMemoryEffectProjection?.blockers ?? []),
    ...craftExternalBlockers,
  ], normalized);
  const modularizationBuildProjection = projectTlidbBuildModularizationCalculation(
    Array.from({ length: 5 }, (_, rowIndex) => {
      const runtimeSlot = getRuntimeSkillSlot(normalized, rowIndex);
      return {
        rowIndex,
        skillId: runtimeSlot?.skillId,
        config: runtimeSlot?.modularization,
        conditions: normalized.conditions,
      };
    }),
  );
  const modularizationProjectionByRow = new Map(
    modularizationBuildProjection.rows.map(({ rowIndex, projection }) => [rowIndex, projection]),
  );
  const skillRows = [];

  for (const [statKey, value] of Object.entries({ ...BASE_STATS, attackSpeedIncrease: 0, castSpeedIncrease: 0 })) {
    accumulator.initialize(rawStatKey(statKey), value, {
      sourceId: "base:combat",
      evidence: "measured",
    });
    accumulator.initialize(tlidbIncreaseKey(statKey), 0, {
      sourceId: "base:combat",
      evidence: "measured",
    });
    accumulator.initialize(tlidbMoreKey(statKey), 1, {
      sourceId: "base:combat",
      evidence: "measured",
    });
  }
  accumulator.initialize(rawStatKey(TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT), 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize(rawStatKey(TLIDB_MANA_REGEN_PERCENT_PER_SECOND_STAT), 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize(rawStatKey(SHIELD_FROM_MAX_LIFE_PERCENT_STAT), 0, {
    sourceId: "base:combat",
    evidence: "structured",
  });
  accumulator.initialize(rawStatKey("critDamage"), 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize(tlidbIncreaseKey("critDamage"), 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize(tlidbMoreKey("critDamage"), 1, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize("moreDpsMultiplier", 1, { sourceId: "base:combat", evidence: "measured" });
  accumulator.initialize("linkedSkillDps", 0, { sourceId: "base:combat", evidence: "measured" });

  applyFirebirdCalculationProjection(
    accumulator,
    firebirdProjection,
    provenance,
    nextOrder,
  );

  for (const { item, selectionIndex } of selectedItemEntries) {
    if (item.categoryId === "skills" || item.categoryId === "supports") continue;
    if (
      firebirdProjection?.active
      && firebirdProjection.itemId === item.id
      && firebirdProjection.selectionIndex === selectionIndex
    ) continue;
    const tlidbAuthority = item.categoryId === "gear"
      ? getSelectedGearAuthority(item, getGearInstanceConfiguration(normalized, item.id, selectionIndex))
      : getTlidbCalculationAuthority(item);
    applyStatRecord(
      accumulator,
      item.categoryId === "gear" && tlidbAuthority ? tlidbAuthority.stats : getItemStats(item),
      getEffectSource(provenance, item.id, {
        sourceLabel: getCalculationItemLabel(item, item.id),
        sourceIconUrl: item.iconUrl,
        categoryId: item.categoryId,
        sourceUrl: tlidbAuthority?.sourceUrl,
        sourceRecordKey: tlidbAuthority?.sourceRecordKey,
        receipt: tlidbAuthority?.receipt,
        conditionRequirements: item.conditionRequirements,
      }),
      nextOrder,
      `item:${item.categoryId}:${selectionIndex}`,
    );
  }

  if (hasActiveHeroSelection(normalized)) {
    const heroSource = getEffectSource(provenance, "base:tlidb-hero-level", {
      categoryId: "hero",
      evidence: "structured",
      sourceUrl: TLIDB_HELP_CALCULATION_SOURCES.characterBuild.sourceUrl,
      sourceRecordKey: "Character Build - Life/Mana/Evade/Resistance",
    });
    for (const [statKey, value] of Object.entries(getTlidbHeroLevelBaseStats(normalized.heroLevel))) {
      if (value === 0) continue;
      accumulator.apply(createEffect({
        id: `base:tlidb-hero-level:${statKey}`,
        ...heroSource,
        targetKey: rawStatKey(statKey),
        operation: "add",
        value,
        order: nextOrder.value++,
      }));
    }
  }

  for (const { item, selectionIndex } of selectedItemEntries) {
    if (item.categoryId === "skills" || item.categoryId === "supports") continue;
    if (
      firebirdProjection?.active
      && firebirdProjection.itemId === item.id
      && firebirdProjection.selectionIndex === selectionIndex
    ) continue;
    const source = getEffectSource(provenance, item.id, {
      sourceLabel: getCalculationItemLabel(item, item.id),
      sourceIconUrl: item.iconUrl,
      categoryId: item.categoryId,
      conditionRequirements: item.conditionRequirements,
    });
    const config = item.categoryId === "gear"
      ? getGearInstanceConfiguration(normalized, item.id, selectionIndex)
      : null;
    const rollValues = config
      ? projectTlidbGearTooltipRollValues(
        item,
        config,
        getSelectedGearAuthority(item, config),
      )
      : {};
    applyTlidbTooltipRuntimeEffects(
      accumulator,
      item,
      source,
      nextOrder,
      normalized,
      { rollValues, authorityOverride: config ? getSelectedGearAuthority(item, config) : null },
    );
  }

  for (const entry of talentProjection?.entries ?? []) {
    if ((talentEffectProjection?.effects ?? []).some((effect) => (
      effect.projectionEntryId === entry.id && effect.replacesDirectStatAuthority
    ))) continue;
    if (talentEntryHasValueAuthority(entry)) {
      applyStatRecord(
        accumulator,
        entry.calculationStats,
        getEffectSource(provenance, entry.id, {
          sourceLabel: entry.sourceLabel || entry.rawText || entry.id,
          categoryId: "talents",
          evidence: "structured",
          conditionRequirements: entry.conditionRequirements,
        }),
        nextOrder,
        `talent:${entry.boardIndex}:${entry.origin}`,
      );
    }
  }

  applyProjectedTlidbRuntimeEffects(
    accumulator,
    talentEffectProjection,
    provenance,
    nextOrder,
    normalized,
    "talents",
  );

  if (projectionHasValueAuthority(pactProjection)) {
    for (const entry of pactProjection?.entries ?? []) {
      if ((pactEffectProjection?.accounting?.consumedProjectionEntryIds ?? []).includes(entry.id)) {
        continue;
      }
      applyStatRecord(
        accumulator,
        getPactProjectionStats(entry),
        getEffectSource(provenance, entry.id, {
          sourceLabel: entry.sourceLabel || entry.rawText || entry.id,
          categoryId: entry.categoryId,
          evidence: "structured",
          conditionRequirements: entry.conditionRequirements,
        }),
        nextOrder,
        `pact:${entry.origin}:${entry.locationKey}`,
      );
    }
  }

  applyProjectedTlidbRuntimeEffects(
    accumulator,
    pactEffectProjection,
    provenance,
    nextOrder,
    normalized,
    "pact",
  );

  for (const entry of divinityProjection?.entries ?? []) {
    if ((divinityEffectProjection?.suppressedDirectProjectionEntryIds ?? []).includes(entry.id)) {
      continue;
    }
    applyStatRecord(
      accumulator,
      entry.stats,
      getEffectSource(provenance, entry.id, {
        sourceLabel: entry.sourceLabel || entry.rawText || entry.id,
        categoryId: "slates",
        evidence: "structured",
        conditionRequirements: entry.conditionRequirements,
      }),
      nextOrder,
      `divinity:${entry.origin}:${entry.instanceId}:${entry.slotKey}`,
    );
  }

  applyProjectedTlidbRuntimeEffects(
    accumulator,
    divinityEffectProjection,
    provenance,
    nextOrder,
    normalized,
    "slates",
  );

  applyProjectedTlidbRuntimeEffects(
    accumulator,
    heroTraitEffectProjection,
    provenance,
    nextOrder,
    normalized,
    "hero",
  );

  applyProjectedTlidbRuntimeEffects(
    accumulator,
    heroMemoryEffectProjection,
    provenance,
    nextOrder,
    normalized,
    "heroMemory",
  );

  applyProjectedTlidbRuntimeEffects(
    accumulator,
    modularizationBuildProjection.owner,
    provenance,
    nextOrder,
    normalized,
    "supports",
  );

  applyTlidbElixirCalculationProjection(
    accumulator,
    elixirProjection,
    provenance,
    nextOrder,
  );

  applyConfiguredGearAndCustomEffects(
    accumulator,
    normalized,
    selectedItemEntries,
    provenance,
    nextOrder,
    craftSelections,
  );
  applyTlidbHelpAttributeEffects(accumulator, provenance, nextOrder);

  const passiveRows = applyTlidbPassiveSkillRuntime(
    accumulator,
    normalized,
    provenance,
    nextOrder,
    externalEffects,
    externalBlockers,
  );

  for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
    const row = getSkillRowContext(normalized, rowIndex);
    if (!row) continue;
    const runtimeStats = currentTlidbRuntimeStats(accumulator);
    const { skill, level: baseLevel, externalMain } = row;
    const level = getEffectiveSkillLevel(skill, baseLevel, runtimeStats);
    const externalInactiveReason = getExternalSkillUnsupportedReason(externalMain);
    const rowKey = `skillRowDps:${rowIndex}`;
    const supports = applyAllSkillLevelBonusToSupports(
      getTlidbSkillRowSupports(normalized, rowIndex, skill, baseLevel),
      runtimeStats,
    );
    const manaCost = externalMain
      ? null
      : evaluateTlidbActiveSkillManaCost({
        skill,
        level,
        supports,
      });
    const cooldown = externalMain
      ? null
      : evaluateTlidbActiveSkillCooldown({
        skill,
        level,
        supports,
        globalRecoveryIncreasePercent: runtimeStats.cooldownRecoverySpeedBonus,
      });
    const modularizationProjection = modularizationProjectionByRow.get(rowIndex)
      ?? projectTlidbModularizationCalculation({
        skillId: skill.id,
        config: getRuntimeSkillSlot(normalized, rowIndex)?.modularization,
        conditions: normalized.conditions,
      });
    if (!externalMain && isTlidbElixirMainSkillId(skill.id)) {
      skillRows.push({
        skillId: skill.id,
        rowIndex,
        ...(baseLevel !== level ? { baseLevel } : {}),
        level,
        linkedSupports: supports.filter((support) => support.compatible).length,
        dps: null,
        rawDps: null,
        expectedDps: null,
        damageStages: { totalDps: null, expectedTotalDps: null },
        ...(manaCost ? { manaCost } : {}),
        ...(cooldown ? { cooldown } : {}),
        hasRuntimeProfile: hasTlidbParsedCalculationAuthority(skill),
        calculationApplicable: false,
        calculationSupported: false,
        evidence: "structured",
        inactiveReason: "skill-damage-not-applicable",
      });
      continue;
    }
    const sourcedSkillLevel = level > 20 ? 20 : level;
    const skillRowExternalEffects = [
      ...externalEffectsForSkillRow(externalEffects, rowIndex),
      ...modularizationBuildProjection.owner.effects.filter(
        tlidbEffectNeedsSkillRowRuntime,
      ),
      ...modularizationProjection.effects.filter(({ scope }) => scope?.actor !== "owner"),
    ];
    const weaponLocalEffects = skillRowExternalEffects.filter(isTlidbWeaponLocalExternalEffect);
    const weaponLocalResolution = resolveTlidbTooltipEffects(weaponLocalEffects, {
      conditions: normalized.conditions,
      stats: currentTlidbRuntimeStats(accumulator),
    });
    const generalSkillRowExternalEffects = skillRowExternalEffects.filter(
      (effect) => !isTlidbWeaponLocalExternalEffect(effect),
    );
    const evaluation = externalMain ? null : evaluateTlidbBuildSkillRow({
      skill,
      level: sourcedSkillLevel,
      conditions: normalized.conditions,
      stats: currentTlidbRuntimeStats(accumulator),
      supports,
      gear: gearRuntimeRecords,
      externalEffects: generalSkillRowExternalEffects,
      weaponExternalEffects: weaponLocalResolution.applied,
      externalBlockers: [
        ...externalBlockersForSkillRow(externalBlockers, rowIndex),
        ...modularizationBuildProjection.owner.blockers.filter(({ skillDamageApplicability }) => (
          skillDamageApplicability === "affects-dps"
        )),
        ...modularizationProjection.blockers,
      ],
    });
    const skillCalculationSupported = !externalMain && evaluation?.complete === true;
    const inactiveReason = externalMain
      ? externalInactiveReason
      : evaluation?.blockers?.[0]?.reason
        ?? evaluation?.status
        ?? "skill-damage-input-unavailable";
    const skillSource = getEffectSource(provenance, skill.id, {
      sourceLabel: getCalculationItemLabel(skill, skill.id),
      sourceIconUrl: skill.iconUrl,
      categoryId: "skills",
      conditionRequirements: skill.conditionRequirements,
    });
    accumulator.initialize(rowKey, 0, { sourceId: skill.id, evidence: skillSource.evidence });
    accumulator.initialize(skillRowIncreaseKey(rowIndex), 0, { sourceId: "base:combat", evidence: "measured" });
    accumulator.initialize(skillRowMoreKey(rowIndex), 1, { sourceId: "base:combat", evidence: "measured" });
    applyTlidbSkillHelpEffects(
      accumulator,
      skill,
      skillSource,
      nextOrder,
      rowIndex,
      level,
      skillCalculationSupported,
    );
    const skillAuthority = getTlidbCalculationAuthority(skill, { level: sourcedSkillLevel });
    accumulator.apply(createEffect({
      id: `${skill.id}:row:${rowIndex}:${skillCalculationSupported ? "tlidb-dps" : inactiveReason}`,
      ...skillSource,
      targetKey: rowKey,
      operation: "add",
      value: skillCalculationSupported ? evaluation.dps : null,
      applied: skillCalculationSupported,
      inactiveReason: skillCalculationSupported ? "" : inactiveReason,
      order: nextOrder.value++,
      sourceUrl: skillAuthority?.sourceUrl,
      sourceRecordKey: skillAuthority?.sourceRecordKey,
    }));
    if (externalMain) {
      for (const support of supports.filter(({ compatible }) => compatible)) {
        const supportSource = getEffectSource(provenance, support.item.id, {
          sourceLabel: getCalculationItemLabel(support.item, support.item.id),
          sourceIconUrl: support.item.iconUrl,
          categoryId: "supports",
          evidence: "structured",
        });
        for (const [supportEffectIndex, supportEffect] of getSupportDamageEffects(
          support.item,
          support.level,
        ).entries()) {
          accumulator.apply(createEffect({
            id: `${support.item.id}:row:${rowIndex}:external-support:${supportEffectIndex}`,
            ...supportSource,
            targetKey: skillRowMoreKey(rowIndex),
            operation: "more",
            value: supportEffect.value,
            applied: false,
            inactiveReason,
            conditionRequirements: supportEffect.conditionRequirements,
            order: nextOrder.value++,
          }));
        }
      }
    }
    const linkedSourceEffects = new Map();
    for (const appliedEffect of evaluation?.applied ?? []) {
      const sourceId = appliedEffect.sourceId;
      if (!sourceId || sourceId === skill.id) continue;
      const externalInputIndex = Number(appliedEffect.externalInputIndex);
      const externalSource = Number.isInteger(externalInputIndex)
        ? skillRowExternalEffects[externalInputIndex]
        : externalEffects.find((effect) => (
          effect.sourceId === sourceId
          || effect.sourceItemId === sourceId
          || effect.flatCatalogItemId === sourceId
          || effect.projectionEntryId === sourceId
        ));
      const key = externalSource
        ? `${sourceId}\u0000${externalInputIndex}\u0000${appliedEffect.stat ?? externalSource.stat ?? ""}`
        : sourceId;
      if (!linkedSourceEffects.has(key)) {
        linkedSourceEffects.set(key, { sourceId, externalSource });
      }
    }
    for (const [linkedIndex, { sourceId, externalSource }] of [...linkedSourceEffects.values()].entries()) {
      const item = findItemById(sourceId);
      const source = getEffectSource(provenance, sourceId, {
        sourceLabel: externalSource?.sourceLabel || getCalculationItemLabel(item, sourceId),
        sourceIconUrl: item?.iconUrl,
        categoryId: item?.categoryId || externalSource?.sourceKind || "skills",
        evidence: "structured",
        sourceUrl: externalSource?.sourceUrl,
        sourceRecordKey: externalSource?.sourceRecordKey,
        receipt: externalSource?.receipt,
        conditionRequirements: externalSource?.conditionRequirements,
      });
      accumulator.apply(createEffect({
        id: `${skill.id}:row:${rowIndex}:authority-link:${sourceId}:${linkedIndex}`,
        ...source,
        targetKey: rowKey,
        operation: "add",
        value: 0,
        unit: "authority-link",
        requestedValue: externalSource?.selectedRoll,
        sourceRollAlias: externalSource?.unit,
        sourceText: externalSource?.sourceText,
        applied: skillCalculationSupported,
        inactiveReason: skillCalculationSupported ? "" : inactiveReason,
        order: nextOrder.value++,
      }));
    }
    for (const [blockerIndex, blocker] of (evaluation?.blockers ?? []).entries()) {
      const sourceId = blocker.sourceId || skill.id;
      const item = findItemById(sourceId);
      const source = getEffectSource(provenance, sourceId, {
        sourceLabel: getCalculationItemLabel(item, sourceId),
        sourceIconUrl: item?.iconUrl,
        categoryId: item?.categoryId || skill.categoryId,
        evidence: "unsupported",
      });
      accumulator.apply(createEffect({
        id: `${skill.id}:row:${rowIndex}:tlidb-blocker:${blockerIndex}`,
        ...source,
        targetKey: "unmodeled",
        operation: "add",
        value: null,
        applied: false,
        inactiveReason: blocker.reason || "skill-damage-input-unavailable",
        order: nextOrder.value++,
        sourceText: blocker.sourceText,
      }));
    }

    accumulator.derive(
      rowKey,
      [rowKey, skillRowIncreaseKey(rowIndex), skillRowMoreKey(rowIndex)],
      (inputs) => (
        inputs[rowKey]
        * (1 + inputs[skillRowIncreaseKey(rowIndex)] / 100)
        * inputs[skillRowMoreKey(rowIndex)]
      ),
      {
        allowInfinite: true,
        id: `skill-row:${rowIndex}:tlidb-tooltip-modifiers`,
        labelKey: "traceFormula",
        expression: (inputs) => (
          `${inputs[rowKey]} * (1 + ${inputs[skillRowIncreaseKey(rowIndex)]} / 100) * `
          + `${inputs[skillRowMoreKey(rowIndex)]}`
        ),
      },
    );

    accumulator.addFrom("linkedSkillDps", rowKey, {
      id: `skill-row:${rowIndex}:combine`,
      labelKey: "traceSkillRow",
      expression: (inputs, before) => `${before} + ${inputs[rowKey]}`,
    });
    const mainStatMultiplier = 1 + getTlidbMainStatAdditionalDamagePercent(
      skill,
      currentTlidbRuntimeStats(accumulator),
    ) / 100;
    const levelMultiplier = getTlidbSkillLevelAdditionalDamageMultiplier(level);
    const roundDamageStage = (value) => Number.isFinite(value)
      ? Math.round((value + Number.EPSILON) * 1e12) / 1e12
      : null;
    const baseDamageStages = evaluation?.damageStages;
    const totalAfterMainStatDps = Number.isFinite(baseDamageStages?.expectedTotalDps)
      ? roundDamageStage(baseDamageStages.expectedTotalDps * mainStatMultiplier)
      : null;
    const totalAfterOverlevelDps = Number.isFinite(totalAfterMainStatDps)
      ? roundDamageStage(totalAfterMainStatDps * levelMultiplier)
      : null;
    const damageStages = baseDamageStages ? {
      ...baseDamageStages,
      mainStatMultiplier,
      totalAfterMainStatDps,
      overlevelMultiplier: levelMultiplier,
      totalAfterOverlevelDps,
      totalDps: Number.isFinite(baseDamageStages.totalDps)
        ? roundDamageStage(baseDamageStages.totalDps * mainStatMultiplier * levelMultiplier)
        : null,
      expectedTotalDps: totalAfterOverlevelDps,
    } : {
      totalDps: null,
      expectedTotalDps: null,
    };
    const globalDamageMultiplier = mainStatMultiplier * levelMultiplier;
    const reaping = evaluation?.reaping ? {
      ...evaluation.reaping,
      baseDotDps: roundDamageStage(evaluation.reaping.baseDotDps * globalDamageMultiplier),
      damagePerEvent: roundDamageStage(evaluation.reaping.damagePerEvent * globalDamageMultiplier),
      dps: roundDamageStage(evaluation.reaping.dps * globalDamageMultiplier),
    } : null;
    skillRows.push({
      skillId: skill.id,
      rowIndex,
      ...(baseLevel !== level ? { baseLevel } : {}),
      level,
      linkedSupports: evaluation?.linkedSupports
        ?? supports.filter((support) => support.compatible).length,
      dps: skillCalculationSupported
        ? Math.round(evaluation.dps * mainStatMultiplier * levelMultiplier)
        : null,
      rawDps: skillCalculationSupported ? evaluation.rawDps : null,
      expectedDps: skillCalculationSupported ? evaluation.dps : null,
      damageStages,
      ...(manaCost ? { manaCost } : {}),
      ...(cooldown ? { cooldown } : {}),
      ...(modularizationProjection.accounting.selectedOptionCount > 0
        ? {
            modularization: {
              ...modularizationProjection.accounting,
              effects: modularizationProjection.effects,
              blockers: modularizationProjection.blockers,
            },
          }
        : {}),
      ...(evaluation ? {
        hit: evaluation.hit,
        dot: evaluation.dot,
        critical: evaluation.critical,
        luckyDamage: evaluation.luckyDamage,
        weaponCritical: evaluation.weaponCritical,
        doubleDamage: evaluation.doubleDamage,
        tripleDamage: evaluation.tripleDamage,
        spellBurst: evaluation.spellBurst,
        enemyArmor: evaluation.enemyArmor,
        enemyResistances: evaluation.enemyResistances,
        affliction: evaluation.affliction,
        reaping,
        applied: evaluation.applied,
        excluded: evaluation.excluded,
        blockers: evaluation.blockers,
      } : {}),
      hasRuntimeProfile: hasTlidbParsedCalculationAuthority(skill),
      calculationSupported: skillCalculationSupported,
      evidence: skillCalculationSupported ? "structured" : "unsupported",
      ...(!skillCalculationSupported ? { inactiveReason } : {}),
    });
  }
  finalizeTlidbStatModifiers(accumulator);

  const targetedSourceIds = new Set(accumulator.snapshot().effects.map((effect) => effect.sourceId));
  for (const [sourceIndex, source] of provenance.sources.entries()) {
    if (source.evidence !== "unsupported" && (source.applied || targetedSourceIds.has(source.id))) continue;
    const item = findItemById(source.id);
    accumulator.apply(createEffect({
      id: `${source.id}:unmodeled:${sourceIndex}`,
      sourceId: source.id,
      sourceLabel: source.label,
      sourceItemId: source.sourceItemId,
      sourceIconUrl: item?.iconUrl || "",
      categoryId: source.categoryId,
      sourceUrl: source.sourceUrl,
      targetKey: "unmodeled",
      operation: "add",
      value: null,
      evidence: source.evidence,
      applied: false,
      inactiveReason: source.inactiveReason || "unsupported-effect",
      order: nextOrder.value++,
    }));
  }

  const snapshot = accumulator.snapshot();
  return {
    accumulator,
    skillRows: Object.freeze(skillRows),
    passiveRows,
    craftSelections,
    flat: Object.fromEntries(
      Object.keys(BASE_STATS).map((statKey) => [statKey, snapshot.values[rawStatKey(statKey)]]),
    ),
  };
}

function finalizePanelCalculation(
  flatCalculation,
  hasActiveHero,
  { shieldChargeActive = false, regain = {} } = {},
) {
  const { accumulator } = flatCalculation;
  const publicKeys = Object.keys(BASE_STATS);
  const derivedPublicKeys = new Set([
    "dps",
    "speed",
    "crit",
    "damageBonus",
    "mainHandAttackSpeed",
    "offHandAttackSpeed",
    "attackSpeedBonus",
    "attackSpeedMore",
    "mainHandAttackCrit",
    "attackCritDamage",
    "barrierAbsorptionFromArmor",
    "physicalEhp",
    "fireEhp",
    "coldEhp",
    "lightningEhp",
    "erosionEhp",
    "physicalMaxHit",
    "fireMaxHit",
    "coldMaxHit",
    "lightningMaxHit",
    "erosionMaxHit",
    "movementSpeedMeters",
    "calculationPanelDamage",
    "lifeRegenPerSecond",
    "lifeRegainPerHit",
    "manaRegenPerSecond",
    "shieldRegenPerSecond",
    "shieldRegainPerHit",
    "shieldChargeIntervalSeconds",
  ]);
  const publicBaseValues = {
    crit: BASE_CRIT_CHANCE,
    mainHandAttackSpeed: BASE_ATTACK_SPEED,
    offHandAttackSpeed: BASE_ATTACK_SPEED,
    mainHandAttackCrit: BASE_CRIT_CHANCE,
    attackCritDamage: BASE_CRIT_DAMAGE,
    maxFireResist: TLIDB_DEFAULT_MAX_RESISTANCE,
    maxColdResist: TLIDB_DEFAULT_MAX_RESISTANCE,
    maxLightningResist: TLIDB_DEFAULT_MAX_RESISTANCE,
    maxErosionResist: TLIDB_DEFAULT_MAX_RESISTANCE,
  };

  accumulator.initialize("constant:attackSpeed", BASE_ATTACK_SPEED, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize("constant:critChance", BASE_CRIT_CHANCE, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize("constant:critDamage", BASE_CRIT_DAMAGE, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.initialize("context:activeHero", hasActiveHero ? 1 : 0, {
    sourceId: "build:hero-selection",
    evidence: "structured",
  });
  accumulator.initialize("context:shieldChargeActive", shieldChargeActive ? 1 : 0, {
    sourceId: "base:tlidb-shield-charge",
    evidence: "structured",
  });
  accumulator.initialize("context:missingLife", Math.max(0, Number(regain.missingLife) || 0), {
    sourceId: "input:regain",
    evidence: "structured",
  });
  accumulator.initialize("context:missingShield", Math.max(0, Number(regain.missingShield) || 0), {
    sourceId: "input:regain",
    evidence: "structured",
  });

  for (const statKey of publicKeys) {
    const inputKey = rawStatKey(statKey);
    accumulator.initialize(statKey, publicBaseValues[statKey] ?? BASE_STATS[statKey], {
      public: true,
      sourceId: statKey === "movementSpeedMeters" && hasActiveHero
        ? "base:tlidb-movement-speed"
        : UNSUPPORTED_DEFENSIVE_STAT_KEY_SET.has(statKey)
          ? "model:defensive-survivability"
          : "base:combat",
      evidence: statKey === "movementSpeedMeters" && hasActiveHero
        ? "structured"
        : UNSUPPORTED_DEFENSIVE_STAT_KEY_SET.has(statKey)
          ? "unsupported"
          : "measured",
    });
    if (MAX_RESISTANCE_STAT_KEYS.has(statKey)) {
      accumulator.derive(
        statKey,
        [inputKey],
        (inputs) => normalizeTlidbMaximumResistance(
          TLIDB_DEFAULT_MAX_RESISTANCE + inputs[inputKey],
        ),
        {
          public: true,
          allowInfinite: true,
          id: `${statKey}:maximum-resistance-cap`,
          labelKey: "traceFormula",
          expression: (inputs) => (
            `min(${TLIDB_ABSOLUTE_MAX_RESISTANCE}, max(0, `
            + `${TLIDB_DEFAULT_MAX_RESISTANCE} + ${inputs[inputKey]}))`
          ),
        },
      );
      continue;
    }
    if (derivedPublicKeys.has(statKey)) continue;
    accumulator.derive(statKey, [inputKey], (inputs) => inputs[inputKey], {
      public: true,
      allowInfinite: true,
      id: `${statKey}:raw-copy`,
      labelKey: "traceRawValue",
      expression: (inputs) => String(inputs[inputKey]),
    });
  }

  accumulator.derive(
    "barrierAbsorptionFromArmor",
    ["armor", rawStatKey("armorToBarrierAbsorptionPercent")],
    (inputs) => (
      inputs.armor * inputs[rawStatKey("armorToBarrierAbsorptionPercent")] / 100
    ),
    {
      public: true,
      id: "barrier-absorption:armor-percent",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `${inputs.armor} * ${inputs[rawStatKey("armorToBarrierAbsorptionPercent")]} / 100`
      ),
    },
  );
  accumulator.round("barrierAbsorptionFromArmor", 2, {
    allowInfinite: true,
    id: "barrier-absorption:armor-percent-round",
    labelKey: "traceRound",
  });
  accumulator.clamp("barrierAbsorptionFromArmor", 0, Number.POSITIVE_INFINITY, {
    allowInfinite: true,
    id: "barrier-absorption:armor-percent-clamp",
    labelKey: "traceClamp",
  });

  accumulator.derive(
    "lifeRegenPerSecond",
    [
      rawStatKey("lifeRegenPerSecond"),
      "life",
      rawStatKey(TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT),
      rawStatKey("lifeRegenerationRateBonus"),
    ],
    (inputs) => (
      (
        inputs[rawStatKey("lifeRegenPerSecond")]
        + inputs.life * inputs[rawStatKey(TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT)] / 100
      ) * (1 + inputs[rawStatKey("lifeRegenerationRateBonus")] / 100)
    ),
    {
      public: true,
      id: "life-regeneration:max-life-per-second",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `(${inputs[rawStatKey("lifeRegenPerSecond")]} + ${inputs.life} * `
        + `${inputs[rawStatKey(TLIDB_LIFE_REGEN_PERCENT_PER_SECOND_STAT)]} / 100) * `
        + `(1 + ${inputs[rawStatKey("lifeRegenerationRateBonus")]} / 100)`
      ),
    },
  );

  accumulator.derive(
    "manaRegenPerSecond",
    [
      rawStatKey("manaRegenPerSecond"),
      "mana",
      rawStatKey(TLIDB_MANA_REGEN_PERCENT_PER_SECOND_STAT),
    ],
    (inputs) => (
      inputs[rawStatKey("manaRegenPerSecond")]
      + inputs.mana * inputs[rawStatKey(TLIDB_MANA_REGEN_PERCENT_PER_SECOND_STAT)] / 100
    ),
    {
      public: true,
      id: "mana-regeneration:max-mana-per-second",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `${inputs[rawStatKey("manaRegenPerSecond")]} + ${inputs.mana} * `
        + `${inputs[rawStatKey(TLIDB_MANA_REGEN_PERCENT_PER_SECOND_STAT)]} / 100`
      ),
    },
  );

  accumulator.derive(
    "lifeRegainPerHit",
    ["context:missingLife", "life", rawStatKey("lifeRegainPercent")],
    (inputs) => getTlidbRegainPerHit(
      inputs["context:missingLife"],
      inputs.life,
      inputs[rawStatKey("lifeRegainPercent")],
    ),
    {
      public: true,
      id: "life-regain:missing-resource-per-hit",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `min(${inputs["context:missingLife"]}, ${inputs.life}) * `
        + `min(${TLIDB_HELP_CALCULATION_SOURCES.regain.maximumPercent}, `
        + `max(0, ${inputs[rawStatKey("lifeRegainPercent")]})) / 100`
      ),
    },
  );

  accumulator.derive(
    "shieldRegainPerHit",
    ["context:missingShield", "shield", rawStatKey("shieldRegainPercent")],
    (inputs) => getTlidbRegainPerHit(
      inputs["context:missingShield"],
      inputs.shield,
      inputs[rawStatKey("shieldRegainPercent")],
    ),
    {
      public: true,
      id: "shield-regain:missing-resource-per-hit",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `min(${inputs["context:missingShield"]}, ${inputs.shield}) * `
        + `min(${TLIDB_HELP_CALCULATION_SOURCES.regain.maximumPercent}, `
        + `max(0, ${inputs[rawStatKey("shieldRegainPercent")]})) / 100`
      ),
    },
  );

  for (const [statKey, traceId] of [
    ["lifeRegainIntervalSeconds", "life-regain:interval-seconds"],
    ["shieldRegainIntervalSeconds", "shield-regain:interval-seconds"],
  ]) {
    accumulator.derive(
      statKey,
      [tlidbMoreKey(statKey)],
      (inputs) => getTlidbRegainIntervalSeconds(
        (inputs[tlidbMoreKey(statKey)] - 1) * 100,
      ),
      {
        public: true,
        id: traceId,
        labelKey: "traceFormula",
        expression: (inputs) => (
          `${TLIDB_HELP_CALCULATION_SOURCES.regain.baseIntervalSeconds} * `
          + `${inputs[tlidbMoreKey(statKey)]}`
        ),
      },
    );
  }

  accumulator.derive(
    "shieldChargeIntervalSeconds",
    [
      rawStatKey("shieldChargeIntervalSeconds"),
      tlidbIncreaseKey("shieldChargeIntervalSeconds"),
      tlidbMoreKey("shieldChargeIntervalSeconds"),
    ],
    (inputs) => (
      (TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.baseIntervalSeconds
        + inputs[rawStatKey("shieldChargeIntervalSeconds")])
      * (1 + inputs[tlidbIncreaseKey("shieldChargeIntervalSeconds")] / 100)
      * inputs[tlidbMoreKey("shieldChargeIntervalSeconds")]
    ),
    {
      public: true,
      id: "shield-charge:interval-seconds",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `(${TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.baseIntervalSeconds} + `
        + `${inputs[rawStatKey("shieldChargeIntervalSeconds")]}) * `
        + `(1 + ${inputs[tlidbIncreaseKey("shieldChargeIntervalSeconds")]} / 100) * `
        + `${inputs[tlidbMoreKey("shieldChargeIntervalSeconds")]}`
      ),
    },
  );

  accumulator.derive(
    "shieldRegenPerSecond",
    [
      rawStatKey("shieldRegenPerSecond"),
      "shield",
      rawStatKey("shieldChargeSpeedBonus"),
      "context:activeHero",
      "context:shieldChargeActive",
    ],
    (inputs) => (
      inputs[rawStatKey("shieldRegenPerSecond")]
      + getTlidbShieldChargePerSecond(inputs.shield, {
        active: inputs["context:shieldChargeActive"] === 1,
        hasHero: inputs["context:activeHero"] === 1,
        chargeSpeedBonus: inputs[rawStatKey("shieldChargeSpeedBonus")],
      })
    ),
    {
      public: true,
      id: "shield-charge:max-shield-per-second",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `${inputs[rawStatKey("shieldRegenPerSecond")]} + ${inputs.shield} * `
        + `${inputs["context:activeHero"]} * ${inputs["context:shieldChargeActive"]} * `
        + `${TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.basePercentPerSecond} / 100 * `
        + `(1 + ${inputs[rawStatKey("shieldChargeSpeedBonus")]} / 100)`
      ),
    },
  );

  accumulator.initialize("attackSpeedMultiplier", 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.derive(
    "attackSpeedMultiplier",
    [rawStatKey("speed"), rawStatKey("attackSpeedIncrease")],
    (inputs) => 1 + (inputs[rawStatKey("speed")] + inputs[rawStatKey("attackSpeedIncrease")]) / 100,
    {
      id: "attack-speed:multiplier",
      labelKey: "traceAttackSpeedMultiplier",
      expression: (inputs) => `1 + (${inputs[rawStatKey("speed")]} + ${inputs[rawStatKey("attackSpeedIncrease")]}) / 100`,
    },
  );

  accumulator.derive(
    "crit",
    ["constant:critChance", rawStatKey("crit")],
    (inputs) => inputs["constant:critChance"] + inputs[rawStatKey("crit")],
    {
      public: true,
      id: "crit:base-plus",
      labelKey: "traceCritChance",
      expression: (inputs) =>
        `${inputs["constant:critChance"]} + ${inputs[rawStatKey("crit")]}`,
    },
  );
  accumulator.clamp("crit", 0, 100, {
    id: "crit:clamp",
    labelKey: "traceClamp",
  });

  accumulator.derive(
    "attackCritDamage",
    ["constant:critDamage", rawStatKey("critDamage")],
    (inputs) =>
      inputs["constant:critDamage"] + Math.max(0, inputs[rawStatKey("critDamage")]),
    {
      public: true,
      id: "crit-damage:total",
      labelKey: "traceCritDamage",
      expression: (inputs) =>
        `${inputs["constant:critDamage"]} + max(0, ${inputs[rawStatKey("critDamage")]})`,
    },
  );
  accumulator.initialize("critMultiplier", 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.derive(
    "critMultiplier",
    ["crit", "attackCritDamage"],
    (inputs) => 1 + (inputs.crit / 100) * (inputs.attackCritDamage / 100 - 1),
    {
      id: "crit:multiplier",
      labelKey: "traceCritMultiplier",
      expression: (inputs) =>
        `1 + (${inputs.crit} / 100) * (${inputs.attackCritDamage} / 100 - 1)`,
    },
  );

  accumulator.initialize("doubleDamageExpectedMultiplier", 1, {
    sourceId: "base:combat",
    evidence: "structured",
  });
  accumulator.derive(
    "doubleDamageExpectedMultiplier",
    [rawStatKey("doubleDamageChance")],
    (inputs) => 1 + Math.min(Math.max(inputs[rawStatKey("doubleDamageChance")], 0), 100) / 100,
    {
      id: "double-damage:expected-multiplier",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `1 + clamp(${inputs[rawStatKey("doubleDamageChance")]}, 0, 100) / 100`
      ),
    },
  );

  accumulator.derive(
    "dps",
    [
      rawStatKey("dps"),
      "linkedSkillDps",
      "moreDpsMultiplier",
      "doubleDamageExpectedMultiplier",
    ],
    (inputs) =>
      (
        inputs[rawStatKey("dps")] * inputs.doubleDamageExpectedMultiplier
        + inputs.linkedSkillDps
      ) * inputs.moreDpsMultiplier,
    {
      public: true,
      allowInfinite: true,
      id: "dps:formula",
      labelKey: "traceDpsFormula",
      expression: (inputs) =>
        `(${inputs[rawStatKey("dps")]} * ${inputs.doubleDamageExpectedMultiplier} + `
        + `${inputs.linkedSkillDps}) * ${inputs.moreDpsMultiplier}`,
    },
  );
  accumulator.round("dps", 0, {
    allowInfinite: true,
    id: "dps:round",
    labelKey: "traceRound",
  });
  accumulator.clamp("dps", 0, Number.POSITIVE_INFINITY, {
    allowInfinite: true,
    id: "dps:clamp",
    labelKey: "traceClamp",
  });

  accumulator.initialize("damageBonusScaled", 0, {
    sourceId: "base:combat",
    evidence: "measured",
  });
  accumulator.derive(
    "damageBonusScaled",
    ["moreDpsMultiplier"],
    (inputs) => (inputs.moreDpsMultiplier - 1) * 1000,
    {
      allowInfinite: true,
      id: "damage-bonus:scaled",
      labelKey: "traceDamageBonus",
      expression: (inputs) => `(${inputs.moreDpsMultiplier} - 1) * 1000`,
    },
  );
  accumulator.round("damageBonusScaled", 0, {
    allowInfinite: true,
    id: "damage-bonus:scaled-round",
    labelKey: "traceRound",
  });
  accumulator.derive(
    "damageBonus",
    ["damageBonusScaled"],
    (inputs) => inputs.damageBonusScaled / 10,
    {
      public: true,
      allowInfinite: true,
      id: "damage-bonus:formula",
      labelKey: "traceDamageBonus",
      expression: (inputs) => `${inputs.damageBonusScaled} / 10`,
    },
  );
  accumulator.clamp("damageBonus", 0, Number.POSITIVE_INFINITY, {
    allowInfinite: true,
    id: "damage-bonus:clamp",
    labelKey: "traceClamp",
  });

  for (const statKey of ["mainHandAttackSpeed", "offHandAttackSpeed"]) {
    accumulator.derive(
      statKey,
      ["constant:attackSpeed", "attackSpeedMultiplier"],
      (inputs) => inputs["constant:attackSpeed"] * inputs.attackSpeedMultiplier,
      {
        public: true,
        id: `${statKey}:formula`,
        labelKey: "traceAttackSpeed",
        expression: (inputs) =>
          `${inputs["constant:attackSpeed"]} * ${inputs.attackSpeedMultiplier}`,
      },
    );
    accumulator.round(statKey, 2, {
      allowInfinite: true,
      id: `${statKey}:round`,
      labelKey: "traceRound",
    });
    accumulator.clamp(statKey, 0, Number.POSITIVE_INFINITY, {
      allowInfinite: true,
      id: `${statKey}:clamp`,
      labelKey: "traceClamp",
    });
  }

  accumulator.derive(
    "speed",
    [rawStatKey("speed")],
    (inputs) => inputs[rawStatKey("speed")],
    { public: true, id: "speed:formula", labelKey: "traceRawValue" },
  );
  accumulator.clamp("speed", 0, Number.POSITIVE_INFINITY, {
    id: "speed:clamp",
    labelKey: "traceClamp",
  });
  accumulator.derive(
    "attackSpeedBonus",
    [rawStatKey("speed"), rawStatKey("attackSpeedIncrease")],
    (inputs) => inputs[rawStatKey("speed")] + inputs[rawStatKey("attackSpeedIncrease")],
    {
      public: true,
      id: "attack-speed-bonus:formula",
      labelKey: "traceAttackSpeedBonus",
      expression: (inputs) => `${inputs[rawStatKey("speed")]} + ${inputs[rawStatKey("attackSpeedIncrease")]}`,
    },
  );
  accumulator.clamp("attackSpeedBonus", 0, Number.POSITIVE_INFINITY, {
    id: "attack-speed-bonus:clamp",
    labelKey: "traceClamp",
  });
  accumulator.derive(
    "attackSpeedMore",
    [],
    () => 0,
    {
      public: true,
      id: "attack-speed-more:legacy",
      labelKey: "traceLegacyOverride",
      expression: "0",
    },
  );
  accumulator.derive(
    "mainHandAttackCrit",
    ["crit"],
    (inputs) => inputs.crit,
    {
      public: true,
      id: "main-hand-crit:formula",
      labelKey: "traceCritChance",
      expression: (inputs) => String(inputs.crit),
    },
  );

  accumulator.derive(
    "movementSpeedMeters",
    ["context:activeHero", rawStatKey("movementSpeedBonus")],
    (inputs) =>
      inputs["context:activeHero"]
        ? getTlidbMovementSpeedMeters(inputs[rawStatKey("movementSpeedBonus")])
        : 0,
    {
      public: true,
      id: "movement-speed:formula",
      labelKey: "traceMovementSpeed",
      expression: (inputs) =>
        inputs["context:activeHero"]
          ? `6.5 * (1 + ${inputs[rawStatKey("movementSpeedBonus")]} / 100)`
          : "0",
    },
  );
  accumulator.round("movementSpeedMeters", 2, {
    allowInfinite: true,
    id: "movement-speed:round",
    labelKey: "traceRound",
  });
  accumulator.clamp("movementSpeedMeters", 0, Number.POSITIVE_INFINITY, {
    allowInfinite: true,
    id: "movement-speed:clamp",
    labelKey: "traceClamp",
  });
  accumulator.derive(
    "calculationPanelDamage",
    ["dps"],
    (inputs) => inputs.dps,
    {
      public: true,
      allowInfinite: true,
      id: "panel-damage:formula",
      labelKey: "tracePanelDamage",
      expression: (inputs) => String(inputs.dps),
    },
  );

  const snapshot = accumulator.snapshot(publicKeys);
  return {
    ...snapshot,
    traces: Object.freeze(
      Object.fromEntries(publicKeys.map((statKey) => [statKey, snapshot.traces[statKey]])),
    ),
  };
}

function reconcileCalculationProvenance(
  provenance,
  effects,
  selectedItemEntries,
  talentProjection,
  pactProjection,
  divinityProjection,
  talentEffectProjection,
  pactEffectProjection,
  divinityEffectProjection,
  heroTraitEffectProjection,
  heroMemoryEffectProjection,
) {
  const appliedSourceIds = new Set(
    effects.filter(({ applied }) => applied).map(({ sourceId }) => sourceId),
  );
  const talentEntryIds = new Set((talentProjection?.entries ?? []).map(({ id }) => id));
  const pactEntryIds = new Set((pactProjection?.entries ?? []).map(({ id }) => id));
  const divinityEntryIds = new Set((divinityProjection?.entries ?? []).map(({ id }) => id));
  const heroTraitEntryIds = new Set(
    (heroTraitEffectProjection?.selectedOptions ?? []).map(({ sourceItemId }) => sourceItemId),
  );
  const trackedSourceIds = new Set([
    "custom:affixes",
    ...selectedItemEntries.map(({ item }) => item.id),
    ...(talentProjection?.rules ?? []).map(({ id }) => id),
    ...(pactProjection?.rules ?? []).map(({ id }) => id),
    ...(heroMemoryEffectProjection?.readyEffects ?? []).flatMap((effect) => [
      effect.flatCatalogItemId,
      effect.sourceItemId,
    ]).filter(Boolean),
    ...provenance.sources
      .filter(({ receipt }) => receipt?.sourceKind === "modularization-option")
      .map(({ id }) => id),
  ]);
  const projectionEffectEntries = [
    ...(talentEffectProjection?.effects ?? []),
    ...(pactEffectProjection?.effects ?? []).filter(({ calculationReady }) => calculationReady),
    ...(divinityEffectProjection?.readyEffects ?? []),
    ...(heroTraitEffectProjection?.readyEffects ?? []),
    ...(heroMemoryEffectProjection?.readyEffects ?? []),
  ];
  const projectionEntryApplied = (entryId) => projectionEffectEntries
    .filter(({ projectionEntryId }) => projectionEntryId === entryId)
    .some((effect) => [
      effect.sourceItemId,
      effect.flatCatalogItemId,
      effect.sourceId,
      effect.runtimeSourceId,
    ].some((id) => id && appliedSourceIds.has(id)));
  const anyProjectionEntryApplied = (ids) => [...ids].some(projectionEntryApplied);

  const sources = provenance.sources.map((source) => {
    let applied = null;
    let reference = false;
    if (trackedSourceIds.has(source.id)) {
      applied = appliedSourceIds.has(source.id);
    } else if (
      talentEntryIds.has(source.id)
      || pactEntryIds.has(source.id)
      || divinityEntryIds.has(source.id)
      || heroTraitEntryIds.has(source.id)
    ) {
      applied = projectionEntryApplied(source.id);
    } else if (source.id.startsWith("reference:91tob:pact:")) {
      reference = true;
      applied = anyProjectionEntryApplied(pactEntryIds);
    } else if (source.id.startsWith("reference:91tob:divinity:")) {
      reference = true;
      applied = anyProjectionEntryApplied(divinityEntryIds);
    } else if (source.id.startsWith("reference:91tob:")) {
      reference = true;
      applied = anyProjectionEntryApplied(talentEntryIds);
    }
    if (applied === null) return source;
    return createProvenanceSource({
      ...source,
      evidence: reference && !applied ? "unsupported" : source.evidence,
      applied,
      inactiveReason: applied
        ? undefined
        : source.inactiveReason || "no-modeled-current-value-contribution",
    });
  });

  return summarizeCalculationProvenance(
    provenance.patchSnapshot,
    sources,
    provenance.buildPatchSnapshot,
  );
}

function finalizeSkillRowContributions(skillRows, panelSnapshot) {
  const dpsSteps = panelSnapshot.traces?.dps?.steps ?? [];
  const linkedSkillStep = dpsSteps.find(({ id }) => (
    id === "linked-skill-dps:tlidb-tooltip-modifiers"
  ));
  const linkedBefore = Number(linkedSkillStep?.before);
  const linkedAfter = Number(linkedSkillStep?.after);
  const linkedSkillMultiplier = Number.isFinite(linkedBefore)
    && linkedBefore !== 0
    && Number.isFinite(linkedAfter)
    ? linkedAfter / linkedBefore
    : 1;
  const finalDpsStep = dpsSteps.find(({ id }) => id === "dps:formula");
  const moreDpsMultiplier = Number(finalDpsStep?.inputValues?.moreDpsMultiplier ?? 1);

  return skillRows.map((row) => {
    const rowStep = dpsSteps.find(({ id }) => (
      id === `skill-row:${row.rowIndex}:tlidb-tooltip-modifiers`
    ));
    const rowDps = Number(rowStep?.after);
    const calculatedFinalDpsRaw = row.calculationSupported === true
      && Number.isFinite(rowDps)
      && Number.isFinite(linkedSkillMultiplier)
      && Number.isFinite(moreDpsMultiplier)
      ? rowDps * linkedSkillMultiplier * moreDpsMultiplier
      : null;
    if (!Number.isFinite(calculatedFinalDpsRaw)) return row;
    const finalDpsRaw = Number.isFinite(calculatedFinalDpsRaw)
      ? Math.max(0, calculatedFinalDpsRaw)
      : null;
    const existingStageFinalDps = Number(row.damageStages?.expectedTotalDps);
    const displayedStageFinalDps = Number.isFinite(existingStageFinalDps)
      && Math.abs(existingStageFinalDps - finalDpsRaw) <= 1e-9
      ? existingStageFinalDps
      : finalDpsRaw;
    return {
      ...row,
      finalDpsRaw,
      finalDps: Number.isFinite(finalDpsRaw) ? Math.round(finalDpsRaw) : null,
      ...(row.damageStages && typeof row.damageStages === "object"
        ? {
          damageStages: {
            ...row.damageStages,
            expectedTotalDps: displayedStageFinalDps,
          },
        }
        : {}),
    };
  });
}

function failCloseUnsupportedSkillDps(panelSnapshot) {
  const dpsTrace = panelSnapshot.traces.dps;
  return Object.freeze({
    ...panelSnapshot,
    values: Object.freeze({
      ...panelSnapshot.values,
      dps: null,
    }),
    traces: Object.freeze({
      ...panelSnapshot.traces,
      dps: Object.freeze({
        ...dpsTrace,
        status: "unsupported",
        reason: "skill-row-calculation-unsupported",
        rawValue: null,
        finalValue: null,
      }),
    }),
  });
}

export function calculateBuild(build) {
  const normalizedBuild = normalizeBuild(build);
  const selectedItemEntries = getSelectedItemEntries(normalizedBuild);
  let normalized = withAutomaticEquipmentConditions(normalizedBuild, selectedItemEntries);
  const selectedItems = selectedItemEntries.map(({ item }) => item);
  const talentProjection = projectTalentBoardCalculation(TALENT_CALCULATION_MODEL, normalized.talents);
  const talentEffectProjection = adaptTlidbTalentProjectionEffects(
    talentProjection,
    CATALOG.talents,
  );
  const pactProjection = projectPactDestinyCalculation(PACT_CALCULATION_MODEL, normalized.pact);
  const pactEffectProjection = adaptTlidbPactProjectionEffects(
    pactProjection,
    PACT_CALCULATION_MODEL,
  );
  normalized = withSelectedEffectStatusDefaults(normalized, pactEffectProjection.effects);
  const divinityProjection = projectDivinityCalculation(normalized.divinity);
  const divinityEffectProjection = adaptTlidbDivinityProjectionEffects(
    divinityProjection,
    ACTIVE_DIVINITY_MODEL.calculationSourceCatalog,
  );
  const heroTraitEffectProjection = adaptTlidbHeroTraitProjectionEffects(
    normalized.hero,
    activeHeroTraitCalculationRuntime,
  );
  const heroMemoryEffectProjection = adaptTlidbHeroMemoryProjectionEffects(
    normalized.hero,
    activeHeroMemoryCalculationRuntime,
  );
  const elixirProjection = projectTlidbElixirCalculation(normalized);
  const pactOwnedItemIds = new Set([
    ...(pactProjection.entries ?? []),
    ...(pactProjection.rules ?? []),
  ].map(({ sourceItemId }) => sourceItemId).filter(Boolean));
  const calculationItemEntries = selectedItemEntries.filter(({ item }) => (
    !(talentProjection.active && item.categoryId === "talents")
    && !(divinityProjection.active && item.categoryId === "slates")
    && !(
      (item.categoryId === "spirits" || item.categoryId === "destiny")
      && pactOwnedItemIds.has(item.id)
    )
    && item.categoryId !== "heroMemory"
  ));
  const selectedFirebirdProjection = getSelectedFirebirdProjection(
    normalized,
    calculationItemEntries,
  );
  const provenance = getCalculationProvenance(
    normalized,
    calculationItemEntries,
    talentProjection,
    pactProjection,
    divinityProjection,
    selectedFirebirdProjection,
    talentEffectProjection,
    pactEffectProjection,
    divinityEffectProjection,
    heroTraitEffectProjection,
    heroMemoryEffectProjection,
    elixirProjection,
  );
  const flatCalculation = buildFlatCalculation(
    normalized,
    calculationItemEntries,
    provenance,
    talentProjection,
    pactProjection,
    divinityProjection,
    selectedFirebirdProjection,
    talentEffectProjection,
    pactEffectProjection,
    divinityEffectProjection,
    heroTraitEffectProjection,
    heroMemoryEffectProjection,
    elixirProjection,
  );
  const hasUnsupportedSkillRow = flatCalculation.skillRows.some(
    ({ calculationApplicable, calculationSupported }) => (
      calculationApplicable !== false && calculationSupported !== true
    ),
  );
  const calculationConditions = resolveConditionValues(normalized.conditions);
  const calculatedPanelSnapshot = finalizePanelCalculation(
    flatCalculation,
    hasActiveHeroSelection(normalized),
    {
      shieldChargeActive: calculationConditions.playerStates?.shield_recharge_active === true,
      regain: calculationConditions.regain,
    },
  );
  const panelSnapshot = hasUnsupportedSkillRow
    ? failCloseUnsupportedSkillDps(calculatedPanelSnapshot)
    : calculatedPanelSnapshot;
  const reconciledProvenance = reconcileCalculationProvenance(
    provenance,
    panelSnapshot.effects,
    calculationItemEntries,
    talentProjection,
    pactProjection,
    divinityProjection,
    talentEffectProjection,
    pactEffectProjection,
    divinityEffectProjection,
    heroTraitEffectProjection,
    heroMemoryEffectProjection,
  );
  const firebirdProjection = finalizeFirebirdCalculationProjection(
    selectedFirebirdProjection,
    flatCalculation.accumulator.snapshot(),
  );
  const summary = {
    ...Object.fromEntries(
      Object.keys(BASE_STATS).map((statKey) => [statKey, panelSnapshot.values[statKey]]),
    ),
    selectedCount: selectedItems.length,
  };
  const deltas = {
    ...flatCalculation.flat,
    dps: summary.dps,
  };
  const skillRows = finalizeSkillRowContributions(flatCalculation.skillRows, panelSnapshot);

  return {
    traceVersion: CALCULATION_TRACE_VERSION,
    effects: panelSnapshot.effects,
    traces: panelSnapshot.traces,
    summary,
    deltas,
    selectedItems,
    conditionState: normalized.conditions,
    skillRows,
    passiveRows: flatCalculation.passiveRows,
    provenance: reconciledProvenance,
    talentProjection,
    talentEffectProjection,
    pactProjection,
    pactEffectProjection,
    divinityProjection,
    divinityEffectProjection,
    heroTraitEffectProjection,
    heroMemoryEffectProjection,
    firebirdProjection,
    elixirProjection,
  };
}

function directTlidbStatEffect(effect) {
  return !effect.condition
    && !effect.conditionRequirements
    && !effect.per
    && !effect.roll
    && effect.value !== null
    && effect.value !== undefined
    && effect.value !== ""
    && Number.isFinite(Number(effect.value))
    && (effect.operation === "add" || effect.operation === "set");
}

function currentTlidbRuntimeStats(accumulator) {
  const values = accumulator.snapshot().values;
  return Object.fromEntries([...Object.keys(BASE_STATS), "critDamage", "attackSpeedIncrease", "castSpeedIncrease"].map((statKey) => {
    const base = Number(values[rawStatKey(statKey)] ?? 0);
    const increase = Number(values[tlidbIncreaseKey(statKey)] ?? 0);
    const more = Number(values[tlidbMoreKey(statKey)] ?? 1);
    const authoritativeBase = statKey === "shieldChargeIntervalSeconds"
      ? TLIDB_HELP_CALCULATION_SOURCES.shieldCharge.baseIntervalSeconds
      : 0;
    return [statKey, (authoritativeBase + base) * (1 + increase / 100) * more];
  }));
}

function applyTlidbHelpAttributeEffects(accumulator, provenance, nextOrder) {
  const source = getEffectSource(provenance, "model:tlidb-help-attributes", {
    sourceLabel: "TLIDB attribute formulas",
    categoryId: "hero",
    evidence: "structured",
    sourceRecordKey: "Character Build - Life/Mana/Energy Shield/Evade",
  });
  for (const effect of getTlidbAttributeDerivedEffects(currentTlidbRuntimeStats(accumulator))) {
    if (effect.value === 0) continue;
    accumulator.apply(createEffect({
      id: `model:tlidb-help-attributes:${effect.rule}`,
      ...source,
      targetKey: effect.operation === "increase"
        ? tlidbIncreaseKey(effect.stat)
        : rawStatKey(effect.stat),
      operation: effect.operation === "increase" ? "add" : effect.operation,
      value: effect.value,
      order: nextOrder.value++,
      sourceRecordKey: effect.rule,
    }));
  }
}

function applyTlidbSkillHelpEffects(
  accumulator,
  skill,
  source,
  nextOrder,
  rowIndex,
  level,
  calculationSupported,
) {
  const mainStatPercent = getTlidbMainStatAdditionalDamagePercent(
    skill,
    currentTlidbRuntimeStats(accumulator),
  );
  if (mainStatPercent !== 0) {
    accumulator.apply(createEffect({
      id: `${skill.id}:row:${rowIndex}:tlidb-help:main-stat-damage`,
      ...source,
      targetKey: skillRowMoreKey(rowIndex),
      operation: "more",
      value: mainStatPercent,
      applied: calculationSupported,
      inactiveReason: calculationSupported ? "" : "skill-damage-input-unavailable",
      order: nextOrder.value++,
      sourceRecordKey: "Help - Strength/Dexterity/Intelligence",
    }));
  }

  const levelMultiplier = getTlidbSkillLevelAdditionalDamageMultiplier(level);
  if (levelMultiplier !== 1) {
    accumulator.apply(createEffect({
      id: `${skill.id}:row:${rowIndex}:tlidb-help:overlevel-damage`,
      ...source,
      targetKey: skillRowMoreKey(rowIndex),
      operation: "more",
      value: (levelMultiplier - 1) * 100,
      applied: calculationSupported,
      inactiveReason: calculationSupported ? "" : "skill-damage-input-unavailable",
      order: nextOrder.value++,
      sourceRecordKey: "Help - Skill Level",
    }));
  }
}

function applyTlidbTooltipRuntimeEffects(
  accumulator,
  item,
  source,
  nextOrder,
  normalized,
  { level = 20, rollValues = {}, authorityOverride = null } = {},
) {
  const authority = authorityOverride ?? getTlidbCalculationAuthority(item, { level });
  if (!authority) return { applied: 0, excluded: 0 };
  const runtimeEffects = authority.effects.filter((effect) => !directTlidbStatEffect(effect));
  const resolution = resolveTlidbTooltipEffects(runtimeEffects, {
    conditions: normalized.conditions,
    rollValues,
    stats: currentTlidbRuntimeStats(accumulator),
  });
  for (const [effectIndex, effect] of resolution.applied.entries()) {
    const targetKey = effect.operation === "increase"
      ? tlidbIncreaseKey(effect.stat)
      : effect.operation === "more"
        ? tlidbMoreKey(effect.stat)
        : rawStatKey(effect.stat);
    accumulator.apply(createEffect({
      id: `${item.id}:tlidb-tooltip:${effectIndex}:${effect.stat}:${effect.operation}`,
      ...source,
      targetKey,
      operation: effect.operation === "increase" ? "add" : effect.operation,
      value: effect.value,
      order: nextOrder.value++,
      sourceText: effect.sourceText,
      sourceUrl: authority.sourceUrl,
      sourceRecordKey: authority.sourceRecordKey,
    }));
  }
  for (const [effectIndex, effect] of resolution.excluded.entries()) {
    accumulator.apply(createEffect({
      id: `${item.id}:tlidb-tooltip-excluded:${effectIndex}:${effect.stat ?? "unknown"}`,
      ...source,
      targetKey: "unmodeled",
      operation: "add",
      value: null,
      applied: false,
      inactiveReason: effect.inactiveReason,
      order: nextOrder.value++,
      sourceText: effect.sourceText,
      sourceUrl: authority.sourceUrl,
      sourceRecordKey: authority.sourceRecordKey,
    }));
  }
  return { applied: resolution.applied.length, excluded: resolution.excluded.length };
}

function applyProjectedTlidbRuntimeEffects(
  accumulator,
  projection,
  provenance,
  nextOrder,
  normalized,
  categoryId,
) {
  if (!projection) return;
  const calculationEffects = projection.readyEffects
    ?? (projection.effects ?? []).filter((effect) => effect.calculationReady !== false);
  const panelEffects = calculationEffects.filter(
    (effect) => !tlidbEffectNeedsSkillRowRuntime(effect),
  );
  const mapped = mapTlidbTooltipEffects(panelEffects);
  const resolution = resolveTlidbTooltipEffects(mapped.effects, {
    conditions: normalized.conditions,
    stats: currentTlidbRuntimeStats(accumulator),
    ...(categoryId === "pact" ? {
      context: { pact: projection.runtimeContext ?? {} },
    } : {}),
  });
  for (const [effectIndex, effect] of resolution.applied.entries()) {
    const sourceId = effect.sourceItemId
      ?? effect.flatCatalogItemId
      ?? effect.projectionEntryId
      ?? effect.sourceId
      ?? `${categoryId}:projection`;
    const source = getEffectSource(provenance, sourceId, {
      sourceLabel: effect.sourceText || sourceId,
      categoryId: effect.categoryId ?? categoryId,
      evidence: "structured",
      sourceUrl: effect.sourceUrl,
      sourceRecordKey: effect.sourceRecordKey,
    });
    const targetKey = effect.operation === "increase"
      ? tlidbIncreaseKey(effect.stat)
      : effect.operation === "more"
        ? tlidbMoreKey(effect.stat)
        : rawStatKey(effect.stat);
    accumulator.apply(createEffect({
      id: `${sourceId}:${categoryId}:projection:${effectIndex}:${effect.stat}`,
      ...source,
      targetKey,
      operation: effect.operation === "increase" ? "add" : effect.operation,
      value: effect.value,
      order: nextOrder.value++,
      sourceText: effect.sourceText,
      sourceUrl: effect.sourceUrl,
      sourceRecordKey: effect.sourceRecordKey,
    }));
  }
  const blockers = [
    ...(projection.blockers ?? []),
    ...mapped.blockers,
    ...resolution.excluded.map((effect) => ({
      reason: effect.inactiveReason,
      sourceText: effect.sourceText,
      sourceItemId: effect.sourceItemId,
    })),
  ];
  for (const [blockerIndex, blocker] of blockers.entries()) {
    const sourceId = blocker.sourceItemId
      ?? blocker.flatCatalogItemId
      ?? blocker.projectionEntryId
      ?? blocker.sourceId
      ?? `${categoryId}:projection`;
    const source = getEffectSource(provenance, sourceId, {
      sourceLabel: blocker.sourceText || sourceId,
      sourceItemId: blocker.flatCatalogItemId,
      categoryId: blocker.categoryId ?? categoryId,
      evidence: "unsupported",
      sourceUrl: blocker.sourceUrl,
    });
    accumulator.apply(createEffect({
      id: `${sourceId}:${categoryId}:projection-blocker:${blockerIndex}`,
      ...source,
      targetKey: "unmodeled",
      operation: "add",
      value: null,
      applied: false,
      inactiveReason: blocker.reason || "tlidb-projected-effect-unresolved",
      order: nextOrder.value++,
      sourceText: blocker.sourceText,
    }));
  }
}

function finalizeTlidbStatModifiers(accumulator) {
  for (const statKey of [...Object.keys(BASE_STATS), "critDamage"]) {
    const inputKey = rawStatKey(statKey);
    const increaseKey = tlidbIncreaseKey(statKey);
    const moreKey = tlidbMoreKey(statKey);
    if ([
      "lifeRegainIntervalSeconds",
      "shieldRegainIntervalSeconds",
      "shieldChargeIntervalSeconds",
    ].includes(statKey)) continue;
    if (statKey === "shield") {
      const lifeKey = rawStatKey("life");
      const percentKey = rawStatKey(SHIELD_FROM_MAX_LIFE_PERCENT_STAT);
      accumulator.derive(
        inputKey,
        [inputKey, lifeKey, percentKey],
        (inputs) => inputs[inputKey] + inputs[lifeKey] * inputs[percentKey] / 100,
        {
          allowInfinite: true,
          id: "shield:max-life-extra",
          labelKey: "traceFormula",
          expression: (inputs) => (
            `${inputs[inputKey]} + ${inputs[lifeKey]} * ${inputs[percentKey]} / 100`
          ),
        },
      );
    }
    accumulator.derive(
      inputKey,
      [inputKey, increaseKey, moreKey],
      (inputs) => inputs[inputKey] * (1 + inputs[increaseKey] / 100) * inputs[moreKey],
      {
        allowInfinite: true,
        id: `${statKey}:tlidb-tooltip-modifiers`,
        labelKey: "traceFormula",
        expression: (inputs) => (
          `${inputs[inputKey]} * (1 + ${inputs[increaseKey]} / 100) * ${inputs[moreKey]}`
        ),
      },
    );
  }

  accumulator.derive(
    "linkedSkillDps",
    ["linkedSkillDps", tlidbIncreaseKey("dps"), tlidbMoreKey("dps")],
    (inputs) => (
      inputs.linkedSkillDps
      * (1 + inputs[tlidbIncreaseKey("dps")] / 100)
      * inputs[tlidbMoreKey("dps")]
    ),
    {
      allowInfinite: true,
      id: "linked-skill-dps:tlidb-tooltip-modifiers",
      labelKey: "traceFormula",
      expression: (inputs) => (
        `${inputs.linkedSkillDps} * (1 + ${inputs[tlidbIncreaseKey("dps")]} / 100) * `
        + `${inputs[tlidbMoreKey("dps")]}`
      ),
    },
  );
}

function skillRowIncreaseKey(rowIndex) {
  return `skillRowTlidbIncrease:${rowIndex}`;
}

function skillRowMoreKey(rowIndex) {
  return `skillRowTlidbMore:${rowIndex}`;
}

function applyTlidbSkillRowTooltipEffects(
  accumulator,
  item,
  source,
  nextOrder,
  normalized,
  rowIndex,
  level,
  { compatible = true } = {},
) {
  const authority = getTlidbCalculationAuthority(item, { level });
  if (!authority) return { appliedDamageModifier: false };
  const rowKey = `skillRowDps:${rowIndex}`;
  const runtimeEffects = authority.effects.filter((effect) => !directTlidbStatEffect(effect));
  const resolution = resolveTlidbTooltipEffects(runtimeEffects, {
    conditions: normalized.conditions,
    stats: currentTlidbRuntimeStats(accumulator),
  });
  let appliedDamageModifier = false;
  let hasDamageModifier = false;
  for (const [effectIndex, effect] of resolution.applied.entries()) {
    let targetKey;
    let operation = effect.operation;
    if (effect.stat === "dps" && effect.operation === "increase") {
      hasDamageModifier = true;
      targetKey = skillRowIncreaseKey(rowIndex);
      operation = "add";
      appliedDamageModifier = compatible;
    } else if (effect.stat === "dps" && effect.operation === "more") {
      hasDamageModifier = true;
      targetKey = skillRowMoreKey(rowIndex);
      operation = "more";
      appliedDamageModifier = compatible;
    } else if (effect.stat === "dps") {
      targetKey = `skillRowDps:${rowIndex}`;
      appliedDamageModifier = compatible;
    } else if (effect.operation === "increase") {
      targetKey = tlidbIncreaseKey(effect.stat);
      operation = "add";
    } else if (effect.operation === "more") {
      targetKey = tlidbMoreKey(effect.stat);
    } else {
      targetKey = rawStatKey(effect.stat);
    }

    accumulator.apply(createEffect({
      id: `${item.id}:row:${rowIndex}:tlidb-tooltip:${effectIndex}:${effect.stat}`,
      ...source,
      targetKey,
      operation,
      value: effect.value,
      applied: compatible,
      inactiveReason: compatible ? "" : "incompatible-support",
      order: nextOrder.value++,
      sourceText: effect.sourceText,
      sourceUrl: authority.sourceUrl,
      sourceRecordKey: authority.sourceRecordKey,
    }));
  }
  for (const [effectIndex, effect] of resolution.excluded.entries()) {
    accumulator.apply(createEffect({
      id: `${item.id}:row:${rowIndex}:tlidb-tooltip-excluded:${effectIndex}:${effect.stat ?? "unknown"}`,
      ...source,
      targetKey: "unmodeled",
      operation: "add",
      value: null,
      applied: false,
      inactiveReason: effect.inactiveReason,
      order: nextOrder.value++,
      sourceText: effect.sourceText,
      sourceUrl: authority.sourceUrl,
      sourceRecordKey: authority.sourceRecordKey,
    }));
  }
  return { appliedDamageModifier, hasDamageModifier };
}

export function analyzeSkillRows(build) {
  return calculateBuild(build).skillRows;
}

export function previewItem(build, itemId) {
  const item = findItemById(itemId);
  if (!item) return undefined;

  const category = CATEGORY_DEFS.find((candidate) => candidate.id === item.categoryId);
  const normalized = normalizeBuild(build);
  const current = normalized.selections[item.categoryId] ?? [];
  const alreadySelected = current.includes(itemId);
  const nextIds = alreadySelected
    ? current.filter((selectedId) => selectedId !== itemId)
    : [...(category?.maxSelections === 1 ? [] : current), itemId];
  const nextBuild = {
    ...normalized,
    selections: {
      ...normalized.selections,
      [item.categoryId]: nextIds,
    },
  };
  const beforeCalculation = calculateBuild(normalized);
  const afterCalculation = calculateBuild(nextBuild);
  const before = beforeCalculation.summary;
  const after = afterCalculation.summary;
  const support = getItemPreviewCalculationSupport(
    alreadySelected ? beforeCalculation : afterCalculation,
    itemId,
  );

  return {
    item,
    alreadySelected,
    calculationSupported: support.supported,
    unsupportedReasons: support.reasons,
    delta: {
      dps: after.dps - before.dps,
      speed: after.speed - before.speed,
      crit: after.crit - before.crit,
      strength: after.strength - before.strength,
      dexterity: after.dexterity - before.dexterity,
      intelligence: after.intelligence - before.intelligence,
      life: after.life - before.life,
      mana: after.mana - before.mana,
      shield: after.shield - before.shield,
      energy: after.energy - before.energy,
      fireResist: after.fireResist - before.fireResist,
      coldResist: after.coldResist - before.coldResist,
      lightningResist: after.lightningResist - before.lightningResist,
      erosionResist: after.erosionResist - before.erosionResist,
    },
  };
}

export function getItemPreviewCalculationSupport(calculation, itemId) {
  const item = findItemById(itemId);
  const sources = (calculation?.provenance?.sources ?? []).filter((source) => (
    source.id === itemId || source.id.startsWith(`${itemId}:`)
  ));
  const effects = (calculation?.effects ?? []).filter((effect) => effect.sourceId === itemId);
  const records = [...sources, ...effects];
  const applied = records.some((record) => record.applied !== false);
  const excluded = records.filter((record) => record.applied === false);
  const reasons = [...new Set(excluded.map((record) => record.inactiveReason).filter(Boolean))];
  if (item?.calculationSupported === false) {
    reasons.unshift("item-calculation-coverage-incomplete");
  }
  if (!applied && !reasons.length) reasons.push("calculation-source-unavailable");
  return {
    supported: applied && excluded.length === 0 && item?.calculationSupported !== false,
    reasons: [...new Set(reasons)],
  };
}
