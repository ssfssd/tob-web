import {
  CATALOG_METADATA,
  CATEGORY_DEFS,
  findItemById,
  getAllItems,
  getCatalogItems,
  getCategory,
  getGearFilterForSlot,
  getGearItemsForFilter,
} from "./catalog.js";
import {
  analyzeSkillRows,
  calculateBuild,
  createDefaultBuild,
  CURRENT_GEAR_CALCULATION_AUDIT,
  getItemPreviewCalculationSupport,
  normalizeBuild,
  previewItem,
  UNSUPPORTED_DEFENSIVE_STAT_KEYS,
} from "./engine.js";
import { getExactBarrierBurstMechanicLocale } from "./barrierBurstMechanics.js";
import { formatAppDateTime } from "./dateTimePresentation.js";
import { getIngameHeroArt } from "./ingameHeroArt.js";
import { createSeasonPlanner } from "./seasonPlanner.js";
import { pactPointStyle, renderPactConnections } from "./ingameLayout.js";
import { getGearLocaleText, renderGearLocaleText } from "./gearLocale.js";
import { loadGearLocaleRegistry } from "./activeGearLocaleData.js";
import { presentCustomAffixText, resolveCustomAffixText } from "./customAffixLocale.js";
import { getCurrentKoreanGameTextSupplement } from "./currentKoreanGameTextSupplement.js";
import { normalizeConditionState, resolveConditionValues } from "./conditionModel.js";
import {
  formatConditionDiagnostic,
  formatConditionEvidenceValue,
} from "./conditionPresentation.js";
import {
  TOB91_DEBUFF_DISPLAY_KEYS,
  TOB91_ENEMY_STATE_KEYS,
  TOB91_ETERNAL_STACK_KEYS,
  TOB91_PLAYER_RESOURCE_KEYS,
  TOB91_PLAYER_STATE_KEYS,
  TOB91_RECENT_FLAG_KEYS,
} from "./tob91CombatConditionSchema.js";
import {
  AUTHORITATIVE_SUPPORT_CONDITION_RULES,
  getSupportConditionAuthority,
} from "./conditionAuthorityMappings.js";
import { hasCurrentSs13SupportDamageAuthority } from "./ss13SkillCalculationAuthority.js";
import { hasTlidbParsedCalculationAuthority } from "./tlidbCalculationAuthority.js";
import {
  hasTlidbModularizationCalculationAuthority,
  projectTlidbModularizationCalculation,
} from "./tlidbModularizationCalculationRuntime.js";
import { accountTlidbOtherTooltipCatalog } from "./tlidbOtherTooltipCalculation.js";
import {
  changeHeroTraitBranch,
  findHeroTraitBranch,
  getHeroTraitStageView,
  normalizeHeroTraitState,
  updateHeroTraitChoice,
} from "./heroTraitModel.js";
import {
  loadTlidbHeroTraitCalculationRuntime,
  summarizeTlidbHeroTraitBranchSupport,
} from "./tlidbHeroTraitProjectionAdapter.js";
import {
  excludeSs13PreviewSkillRuntimeModel,
  isSs13PreviewCatalogItem,
  isSs13PreviewHeroCatalogItem,
} from "./heroSeasonScope.js";
import {
  getCompatibleGearSlotIndices,
  inferGearSlotIndex,
  inferUniqueGearSlotIndex,
} from "./gearSlotInference.js";
import {
  HERO_MEMORY_ENHANCEMENT_PROFILES,
  applyHeroMemoryValueModifier,
  createHeroMemoryInstance,
  getHeroMemoryEnhancementProfile,
  toggleHeroMemoryAffix,
  toggleHeroMemoryRevivalAffix,
  updateHeroMemoryAffixRoll,
  updateHeroMemoryAffixTier,
} from "./heroMemoryModel.js";
import { loadActiveHeroMemoryDataset } from "./activeHeroMemoryData.js";
import {
  diagnoseActiveHeroMemoryInstance as diagnoseHeroMemoryInstance,
  getActiveHeroMemoryPreview as getHeroMemoryPreview,
  getSelectableHeroMemoryEnhancementProfiles,
  normalizeActiveHeroMemoryInstance as normalizeHeroMemoryInstance,
  updateActiveHeroMemoryProperties as updateHeroMemoryProperties,
} from "./activeHeroMemoryModel.js";
import {
  createHeroMemoryRevivalSlotInstance,
  diagnoseHeroMemoryRevivalSlotInstance,
  getHeroMemoryRevivalSlotEffect,
  getHeroMemoryRevivalSlotTargetType,
  reconcileHeroMemoryRevivalSlot,
} from "./heroMemoryRevivalSlot.js";
import { DIVINITY_BOARD_MASK, createDivinityBoard } from "./divinityBoardModel.js";
import { ACTIVE_DIVINITY_MODEL } from "./activeDivinityData.js";
import { getDivinitySlateTemplate } from "./divinitySlateModel.js";
import { auditHadesSs13FullCalculationSupport } from "./hadesCalculationRuntime.js";
import {
  readDivinityEditorCommand,
  reduceDivinityEditorConfigTargets,
  reduceDivinityEditorCommand,
  renderDivinityEditor,
} from "./divinityEditorView.js";
import {
  SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES,
  findGearSlotDpsMarginal,
  findGearSlotUpgrades,
  findGlobalDpsMarginals,
  findSkillDpsMarginals,
} from "./optimization.js";
import { paginateItems, scrollSelectorPage, updateSelection } from "./plannerInteractions.js";
import { compareBuildVersions, diagnoseBuild, recommendInventoryUpgrades } from "./buildAdvisor.js";
import { loadAdvisorPreferences, renderBuildAdvisor } from "./buildAdvisorView.js";
import { loadSeasonResearchCopies, prepareSeasonMigration, reopenSeasonResearchCopy, saveSeasonResearchCopy } from "./seasonMigration.js";
import { createSeasonWorkspace, editSeasonWorkspace, loadSeasonWorkspaces, saveSeasonWorkspace, importSeasonWorkspace, exportSeasonWorkspace, prepareSeasonConfigurationTransfer, applySeasonConfigurationTransfer } from "./seasonWorkspace.js";
import { renderSeasonWorkspace } from "./seasonWorkspaceView.js";
import { filterSeasonSelection } from "./seasonSelectionSearch.js";
import { CURRENT_PLANNING_SEASON, currentSeasonSources, latestSeasonWorkspace } from "./currentSeason.js";
import { SEASON_CONFIGURATION_GROUPS } from "./seasonConfiguration.js";
import { getGearTooltipRollControls } from "./gearTooltipRollControls.js";
import { buildSeasonImpact } from "./seasonImpact.js";
import { saveSeasonComparison, loadSeasonComparison } from "./seasonCalculation.js";
import {
  applyScreenshotGearMatch,
  applyScreenshotSkillMatch,
  applyScreenshotSupportMatch,
  applyScreenshotTalentMatch,
  getScreenshotHeroMemoryTargets,
  getScreenshotTalentTargets,
  matchScreenshotCatalogItems,
} from "./screenshotImportSelection.js";
import { recognizeScreenshotText, cropScreenshotFile, normalizeScreenshotRegion } from "./screenshotRecognition.js";
import { getScreenshotValueCandidates, applyScreenshotGearValues } from "./screenshotValues.js";
import { resolveScreenshotCraftCandidate } from "./screenshotCraftValues.js";
import {
  createActiveSs13PactDestinyModel,
  diagnosePactDestinyState,
  getDestinyView,
  getPactDestinyCapacity,
  getPactRingSlotType,
  getPactSpiritRingSlotOrder,
  getPactSpiritView,
  normalizePactDestinyState,
  PACT_RING_SLOT_ORDER,
} from "./pactDestinyModel.js";
import {
  applyPactSourceNameFilter,
  createPactUndeterminedConfigDraft,
  readPactEditorCommand,
  reducePactEditorCommandWithStatus,
  renderPactEditor,
  resolvePactUndeterminedConfigLayout,
  updatePactUndeterminedConfigDraft,
} from "./pactEditorView.js";
import { createTalentBoardModel } from "./talentBoardModel.js";
import { skillOrbitOrnament, talentTreeIcon } from "./ingameUiAssets.js";
import { SS13_TALENT_VALUE_AUTHORITY_AUDIT } from "./ss13TalentValueAuthority.js";
import {
  readTalentEditorCommand,
  readTalentEditorContextCommand,
  reduceTalentEditorCommand,
  reduceTalentEditorCommandWithStatus,
  renderTalentEditor,
  synchronizeTalentPrismDraft,
} from "./talentEditorView.js";
import { loadActiveRuntimeDataset } from "./activeRuntimeData.js";
import { loadRuntimeDataset as loadStructuralRuntimeDataset } from "./runtimeData.js";
import {
  createActiveSkillRuntimeModel,
  getActiveSkillRuntimeEditorLocaleText,
} from "./activeSkillRuntimeModel.js";
import { TLIDB_TALENT_KO_LOCALE } from "./data/tlidbTalentKoLocale.generated.js";
import { TLIDB_DIVINITY_TEMPLATE_KO_LOCALE } from "./data/tlidbDivinityTemplateKoLocale.js";
import { HADES_KOREAN_PRESENTATION } from "./hadesKoreanPresentation.js";
import { SKILL_TAG_APP_UI_LABELS, TLIDB_SKILL_TAG_LOCALES } from "./data/tlidbSkillTagLocales.js";
import { getSs13SupportFilterTag } from "./skillFilterTextPresentation.js";
import { TLIDB_HERO_GROUP_KO_LOCALE } from "./data/tlidbHeroGroupKoLocale.js";
import { resolveTlidbHelpView } from "./tlidbHelpLibrary.js";
import {
  getRuntimeLocaleField,
  getRuntimeLocaleText,
  renderRuntimeLocaleText,
  resolveRuntimeLocaleRef,
  tlidbPageSlug,
} from "./runtimeLocale.js";
import {
  attachActiveRuntimeDatasetLocaleRefs as attachRuntimeDatasetLocaleRefs,
} from "./activeRuntimeLocaleData.js";
import {
  SKILL_DEFAULT_LEVEL,
  SKILL_MAX_LEVEL,
  SUPPORT_SLOT_ENERGY_COSTS,
  createDefaultSupportRuntimeConfig,
  createDefaultSkillState,
  filterSkillRuntimeRecords,
  findSkillRuntimeRecord,
  findSupportRuntimeRecord,
  getCompatibleSupportRuntimeRecords,
  getExternalMainSkillOverride,
  getHostIndependentSupportRuntimeRecords,
  getModularizationOptionRecords,
  getSkillEnergyUsage,
  getSkillSealUsage,
  normalizeSkillState,
  normalizeSupportRuntimeConfig,
  resolveSkillRuntimeDescription,
  updateMainSkill,
  updateMainSkillLevel,
  updateMainSkillModularizationElementalDamageType,
  updateMainSkillModularizationOption,
  updateMainSkillModularizationSummonCount,
  updateSkillSupport,
  updateSkillSupportConfig,
  updateSkillSupportLevel,
  updateSupportRuntimeConfigRoll,
  updateSupportRuntimeConfigSpecialLevel,
  updateSupportRuntimeConfigTier,
  updateUnlockedSupportCount,
} from "./skillRuntimeModel.js";
import {
  SUPPORTED_LOCALES,
  getLocalizedCategory,
  getLocalizedItem,
  getTlidbLocaleText,
  normalizeLocale,
  t,
  translateGameText,
  translateCommon,
} from "./i18n.js";
import {
  containsHanScript,
  presentGameText as presentSourceGameText,
} from "./gameTextPresentation.js";
import {
  TRACE_SOURCE_LABEL_AUTHORITY,
  presentTraceSourceLabel,
} from "./traceSourcePresentation.js";
import { getSs13CalculationTerm, presentCalculationExpression, presentCalculationSourceText } from "./calculationTextPresentation.js";
import {
  deleteSavedBuild,
  applyUnifiedInventoryRecord,
  applyGearInventoryRecord,
  createGearInventoryRecord,
  createHeroMemoryInventoryRecord,
  createUnifiedDivinitySlateInventoryRecord,
  createUnifiedPrismInventoryRecord,
  deleteGearInventoryRecord,
  deleteHeroMemoryInventoryRecord,
  deleteUnifiedInventoryRecord,
  exportBuild,
  loadGearInventory,
  loadHeroMemoryInventory,
  loadUnifiedInventory,
  recoverUnifiedInventory,
  loadCurrentBuild,
  loadSavedBuilds,
  persistCurrentBuild as persistBuildToStorage,
  getBuildStorageRevision,
  BuildStorageConflictError,
  BuildStorageUnavailableError,
  PactStorageInvariantError,
  saveGearInventoryRecord,
  saveHeroMemoryInventoryRecord,
  saveUnifiedInventoryRecord,
  runInventoryStorageMutation,
  InventoryStorageConflictError,
  InventoryStorageUnavailableError,
  saveBuildAs,
  saveBuildSnapshot,
  consumeStorageWarnings,
} from "./storage.js";
import {
  loadBuildImportValidationContext,
  validateBuildImportText,
} from "./buildImportValidation.js";
import { export91TobBuildDocument } from "./build91tobInterop.js";
import { getVerified91TobGearCorrosionLimit } from "./gear91tobInterop.js";
import { getTlidbLicoriceIngredientAuthority } from "./tlidbLicoriceIngredientAuthority.js";
import { isOfflineEdition, setPlannerHtml } from "./offlinePresentation.js";

const app = document.querySelector("#app");
const localStorage = (() => {
  try { return globalThis.localStorage ?? window.localStorage; }
  catch {
    // Settings can use defaults; build readers separately flag the inaccessible data.
    return {
      getItem() { return null; },
      setItem() { throw new BuildStorageUnavailableError("browser storage unavailable"); },
      removeItem() { throw new BuildStorageUnavailableError("browser storage unavailable"); },
    };
  }
})();
const LOCALE_KEY = "tob.locale.v1";
const SIDEBAR_COLLAPSED_KEY = "tob.sidebar.collapsed.v1";
const ALL_FILTER = "__all__";
const CATALOG_PAGE_SIZE = 120;
let buildImportRequestSequence = 0;

const GEAR_FILTERS = [
  "all",
  "mainHand",
  "offHand",
  "oneHand",
  "claw",
  "dagger",
  "oneHandSword",
  "oneHandMace",
  "oneHandAxe",
  "wand",
  "staff",
  "twoHand",
  "twoHandSword",
  "twoHandMace",
  "twoHandAxe",
  "bow",
  "crossbow",
  "cannon",
  "helmet",
  "bodyArmor",
  "gloves",
  "boots",
  "belt",
  "amulet",
  "ring",
];

const SKILL_RUNTIME_DATASET_IDS = [
  "skill_active",
  "skill_passive",
  "skill_support",
  "skill_activation_medium",
  "skill_magnificent_support",
  "skill_noble_support",
  "skill_modularization_catalog",
  "skill_elixir_catalog",
];

const LIVE_ACTIVE_RUNTIME_DATASET_IDS = new Set([
  ...SKILL_RUNTIME_DATASET_IDS,
  "hero_catalog",
  "hero_memory_catalog",
]);

function loadRuntimeDataset(datasetName) {
  return LIVE_ACTIVE_RUNTIME_DATASET_IDS.has(datasetName)
    ? loadActiveRuntimeDataset(datasetName)
    : loadStructuralRuntimeDataset(datasetName);
}

const SKILL_ACTIVE_TAG_ORDER = [
  "持续", "法术", "范围", "智慧", "攻击", "物理", "敏捷", "力量", "投射物", "召唤",
  "火焰", "近战", "直射", "激发", "闪电", "远程", "冰冷", "智械", "腐蚀", "模组",
  "灵药", "引导", "防护", "位移", "哨卫", "诅咒", "射线", "挥斩", "连锁", "破击",
  "地面", "基础技能", "强化技能", "战吼", "终极技能", "回复", "连携", "抛射", "影袭", "坠落", "轰炸",
];

const SKILL_PASSIVE_TAG_ORDER = [
  "范围", "光环", "法术", "贯注", "冰冷", "火焰", "闪电", "召唤", "攻击", "腐蚀", "魔灵", "物理", "投射物", "持续", "近战",
];

const STAT_SECTIONS = [
  {
    title: "overview",
    rows: [
      ["totalDps", "dps", ""],
      ["attackSpeed", "mainHandAttackSpeed", "decimal2"],
      ["critRate", "crit", "%"],
    ],
  },
  {
    title: "base",
    rows: [
      ["strength", "strength", ""],
      ["dexterity", "dexterity", ""],
      ["intelligence", "intelligence", ""],
      ["life", "life", ""],
      ["mana", "mana", ""],
      ["manaSealCompensation", "manaSealCompensation", "%"],
      ["auraEffect", "auraEffect", "%"],
      ["auraSkillLevelBonus", "auraSkillLevelBonus", ""],
      ["maxBondStacks", "maxBondStacks", ""],
      ["bondGainSpeedBonus", "bondGainSpeedBonus", "%"],
      ["reapingTriggerDelaySeconds", "reapingTriggerDelaySeconds", "seconds"],
      ["sealedMana", "sealedManaPercent", "%"],
      ["shield", "shield", ""],
      ["energy", "energy", "/525"],
    ],
  },
  {
    title: "resistances",
    rows: [
      ["fireResist", "fireResist", "%"],
      ["coldResist", "coldResist", "%"],
      ["lightningResist", "lightningResist", "%"],
      ["erosionResist", "erosionResist", "%"],
      ["maxFireResist", "maxFireResist", "%"],
      ["maxColdResist", "maxColdResist", "%"],
      ["maxLightningResist", "maxLightningResist", "%"],
      ["maxErosionResist", "maxErosionResist", "%"],
    ],
  },
  {
    title: "damage",
    rows: [
      ["damageBonus", "damageBonus", "%"],
      ["mainHandAttackSpeed", "mainHandAttackSpeed", "decimal2"],
      ["offHandAttackSpeed", "offHandAttackSpeed", "decimal2"],
      ["attackSpeedBonus", "attackSpeedBonus", "%"],
      ["attackSpeedMore", "attackSpeedMore", "%"],
      ["mainHandAttackCrit", "mainHandAttackCrit", "%"],
      ["attackCritDamage", "attackCritDamage", "%"],
      ["terraSkillDurationBonus", "terraSkillDurationBonus", "%"],
      ["terraSkillAreaBonus", "terraSkillAreaBonus", "%"],
      ["terraChargeRecoverySpeedBonus", "terraChargeRecoverySpeedBonus", "%"],
      ["skillAreaBonus", "skillAreaBonus", "%"],
      ["curseSkillAreaBonus", "curseSkillAreaBonus", "%"],
      ["shadowTrackingAreaBonus", "shadowTrackingAreaBonus", "%"],
      ["shadowStrikeSkillAreaBonus", "shadowStrikeSkillAreaBonus", "%"],
      ["projectileCount", "projectileCount", ""],
      ["projectileSpeedBonus", "projectileSpeedBonus", "%"],
      ["projectileDurationBonus", "projectileDurationBonus", "%"],
      ["attackHorizontalProjectileSpeedBonus", "attackHorizontalProjectileSpeedBonus", "%"],
    ],
  },
  {
    title: "survival",
    rows: [
      ["armor", "armor", ""],
      ["armorBonus", "armorBonus", "%"],
      ["armorToBarrierAbsorptionPercent", "armorToBarrierAbsorptionPercent", "%"],
      ["barrierAbsorptionFromArmor", "barrierAbsorptionFromArmor", "decimal2"],
      ["evasion", "evasion", ""],
      ["blockChance", "blockChance", "%"],
      ["attackBlockChance", "attackBlockChance", "%"],
      ["spellBlockChance", "spellBlockChance", "%"],
      ["blockRatio", "blockRatio", "%"],
      ["damageReduction", "damageReduction", "%"],
      ["damageImmunityChance", "damageImmunityChance", "%"],
      ["damageTakenAdditionalPercent", "damageTakenAdditionalPercent", "%"],
      [
        "distinctDestinyDamageTakenReductionPercent",
        "distinctDestinyDamageTakenReductionPercent",
        "%",
      ],
      ["defenseBonusPercent", "defenseBonusPercent", "%"],
      ["traumaImmunity", "traumaImmunity", "boolean"],
      ["wiltImmunity", "wiltImmunity", "boolean"],
      ["igniteImmunity", "igniteImmunity", "boolean"],
      ["elementalAilmentImmunity", "elementalAilmentImmunity", "boolean"],
      ["controlImmunity", "controlImmunity", "boolean"],
      ["gainFortitudeOnMeleeSkillUse", "gainFortitudeOnMeleeSkillUse", "boolean"],
      ["maxFortitudeStacksBonus", "maxFortitudeStacksBonus", ""],
      ["blindImmunity", "blindImmunity", "boolean"],
      [
        "blindNearbyEnemiesOnAttackProjectileUse",
        "blindNearbyEnemiesOnAttackProjectileUse",
        "boolean",
      ],
      ["sentryFreezesNearbyEnemies", "sentryFreezesNearbyEnemies", "boolean"],
      ["defenseBonusWhileBlurPercent", "defenseBonusWhileBlurPercent", "%"],
      ["damageTakenTransferredToRandomMinionPercent", "damageTakenTransferredToRandomMinionPercent", "%"],
      ["damageTakenFromManaBeforeLifePercent", "damageTakenFromManaBeforeLifePercent", "%"],
      ["physicalDamageTakenConvertedToRandomElementPercent", "physicalDamageTakenConvertedToRandomElementPercent", "%"],
      ["blockChanceAdditionalIncreasePercent", "blockChanceAdditionalIncreasePercent", "%"],
      ["blockedDamageTrueDamageTakenPercentPerSecond", "blockedDamageTrueDamageTakenPercentPerSecond", "%"],
      ["blockedDamageTrueDamageDurationSeconds", "blockedDamageTrueDamageDurationSeconds", ""],
      ["blockChanceAdditionalIncreasePercent", "blockChanceAdditionalIncreasePercent", "%"],
      ["blockedDamageTrueDamageTakenPercentPerSecond", "blockedDamageTrueDamageTakenPercentPerSecond", "%"],
      ["blockedDamageTrueDamageDurationSeconds", "blockedDamageTrueDamageDurationSeconds", ""],
    ],
  },
  {
    title: "lifeShieldMana",
    rows: [
      ["lifeRegenerationRateBonus", "lifeRegenerationRateBonus", "%"],
      ["lifeRegenPerSecond", "lifeRegenPerSecond", ""],
      ["lifeRecoveryOnDefeatPercent", "lifeRecoveryOnDefeatPercent", "%"],
      ["lifeRegainPercent", "lifeRegainPercent", "%"],
      ["lifeRegainPerHit", "lifeRegainPerHit", "decimal4"],
      ["lifeRegainIntervalSeconds", "lifeRegainIntervalSeconds", "decimal2"],
      ["shieldRegenPerSecond", "shieldRegenPerSecond", ""],
      ["shieldRecoveryOnDefeatPercent", "shieldRecoveryOnDefeatPercent", "%"],
      ["shieldRegainPercent", "shieldRegainPercent", "%"],
      ["shieldRegainPerHit", "shieldRegainPerHit", "decimal4"],
      ["shieldRegainIntervalSeconds", "shieldRegainIntervalSeconds", "decimal2"],
      ["shieldChargeSpeedBonus", "shieldChargeSpeedBonus", "%"],
      ["shieldChargeIntervalSeconds", "shieldChargeIntervalSeconds", "decimal2"],
      ["manaRegenPerSecond", "manaRegenPerSecond", ""],
    ],
  },
  {
    title: "ehp",
    rows: [
      ["physicalEhp", "physicalEhp", ""],
      ["fireEhp", "fireEhp", ""],
      ["coldEhp", "coldEhp", ""],
      ["lightningEhp", "lightningEhp", ""],
      ["erosionEhp", "erosionEhp", ""],
    ],
  },
  {
    title: "maxHitTaken",
    rows: [
      ["physicalMaxHit", "physicalMaxHit", ""],
      ["fireMaxHit", "fireMaxHit", ""],
      ["coldMaxHit", "coldMaxHit", ""],
      ["lightningMaxHit", "lightningMaxHit", ""],
      ["erosionMaxHit", "erosionMaxHit", ""],
    ],
  },
  {
    title: "other",
    rows: [
      ["illOmenCumulativeEfficiencyWhileBlurPercent", "illOmenCumulativeEfficiencyWhileBlurPercent", "%"],
      ["minionKillExplosionChancePercent", "minionKillExplosionChancePercent", "%"],
      ["minionKillExplosionEnemyMaxLifeDamagePercent", "minionKillExplosionEnemyMaxLifeDamagePercent", "%"],
      ["minionKillExplosionRadiusMeters", "minionKillExplosionRadiusMeters", ""],
      ["cursedEnemyKillExplosionChancePercent", "cursedEnemyKillExplosionChancePercent", "%"],
      [
        "cursedEnemyKillExplosionEnemyMaxLifeTrueDamagePercent",
        "cursedEnemyKillExplosionEnemyMaxLifeTrueDamagePercent",
        "%",
      ],
      ["cursedEnemyKillExplosionRadiusMeters", "cursedEnemyKillExplosionRadiusMeters", ""],
      ["cooldownRecoverySpeedBonus", "cooldownRecoverySpeedBonus", "%"],
      ["maximumFrostbiteRating", "maximumFrostbiteRating", ""],
      ["infusionSpeed", "infusionSpeed", "%"],
      ["curseEffect", "curseEffect", "%"],
      ["additionalCurseCapacity", "additionalCurseCapacity", ""],
      ["paralysisEffect", "paralysisEffect", "%"],
      ["receivedCurseEffect", "receivedCurseEffect", "%"],
      ["receivedNumbedEffect", "receivedNumbedEffect", "%"],
      ["receivedSlowEffect", "receivedSlowEffect", "%"],
      ["receivedParalysisEffect", "receivedParalysisEffect", "%"],
      ["receivedWeakenEffect", "receivedWeakenEffect", "%"],
      ["multistrikeChance", "multistrikeChance", "%"],
      ["multistrikeDamageIncrementPercent", "multistrikeDamageIncrementPercent", "%"],
      ["aggravationChance", "aggravationChance", "%"],
      ["igniteChance", "igniteChance", "%"],
      ["igniteDurationAdditionalPercent", "igniteDurationAdditionalPercent", "%"],
      ["igniteLimit", "igniteLimit", ""],
      ["steepStrikeChance", "steepStrikeChance", "%"],
      ["steepStrikeDamageAdditionalPercent", "steepStrikeDamageAdditionalPercent", "%"],
      ["aggravationDurationBonus", "aggravationDurationBonus", "%"],
      ["receivedIgniteDamageAdditionalPercent", "receivedIgniteDamageAdditionalPercent", "%"],
      ["receivedIgniteEffectPercent", "receivedIgniteEffectPercent", "%"],
      ["receivedWiltDamagePercent", "receivedWiltDamagePercent", "%"],
      ["receivedTraumaDamagePercent", "receivedTraumaDamagePercent", "%"],
      ["tenacityBlessingStacksGainedOnRegain", "tenacityBlessingStacksGainedOnRegain", ""],
      ["agilityBlessingGainIntervalSeconds", "agilityBlessingGainIntervalSeconds", "seconds"],
      ["agilityBlessingStacksGainedWhileMoving", "agilityBlessingStacksGainedWhileMoving", ""],
      [
        "focusBlessingStacksGainedOnNonMainSkillUse",
        "focusBlessingStacksGainedOnNonMainSkillUse",
        "",
      ],
      ["commandPerSecond", "commandPerSecond", ""],
      ["spiritMagusInitialGrowth", "spiritMagusInitialGrowth", ""],
      ["rockMagusOriginEffectLevel", "rockMagusOriginEffectLevel", ""],
      ["fireMagusOriginEffectLevel", "fireMagusOriginEffectLevel", ""],
      ["thunderMagusOriginEffectLevel", "thunderMagusOriginEffectLevel", ""],
      ["frostMagusOriginEffectLevel", "frostMagusOriginEffectLevel", ""],
      ["erosionMagusOriginEffectLevel", "erosionMagusOriginEffectLevel", ""],
      ["spiritMagusCoreEffect", "spiritMagusCoreEffect", "%"],
      ["preciseAcutenessFocusBuffLevel", "preciseAcutenessFocusBuffLevel", ""],
      ["preciseCorrosionFocusBuffLevel", "preciseCorrosionFocusBuffLevel", ""],
      ["preciseRegenerationBuffLevel", "preciseRegenerationBuffLevel", ""],
      ["focusBuffEffectBonus", "focusBuffEffectBonus", "%"],
      ["allSkillLevelBonus", "allSkillLevelBonus", ""],
      [
        "currentLifeAndShieldLossOnSkillCastPercent",
        "currentLifeAndShieldLossOnSkillCastPercent",
        "%",
      ],
      ["defensiveSkillLevelBonus", "defensiveSkillLevelBonus", ""],
      ["defensiveSkillEffectBonus", "defensiveSkillEffectBonus", "%"],
      ["comboFinisherChargeBonus", "comboFinisherChargeBonus", ""],
      ["comboSequenceResetTimeSeconds", "comboSequenceResetTimeSeconds", "seconds"],
      [
        "comboStarterReverseKnockbackRadiusMeters",
        "comboStarterReverseKnockbackRadiusMeters",
        "meters",
      ],
      [
        "comboStarterReverseKnockbackDistanceMeters",
        "comboStarterReverseKnockbackDistanceMeters",
        "meters",
      ],
      [
        "comboStarterReverseKnockbackAffectedBySkillArea",
        "comboStarterReverseKnockbackAffectedBySkillArea",
        "boolean",
      ],
      [
        "recentComboFinisherKnockbackDistancePerStackPercent",
        "recentComboFinisherKnockbackDistancePerStackPercent",
        "%",
      ],
      [
        "recentComboFinisherKnockbackMaxStacks",
        "recentComboFinisherKnockbackMaxStacks",
        "",
      ],
      [
        "omenTriggerNearbyNonEliteEnemyCount",
        "omenTriggerNearbyNonEliteEnemyCount",
        "",
      ],
      ["omenInflictionStacksPerEnemy", "omenInflictionStacksPerEnemy", ""],
      ["blazingSunActive", "blazingSunActive", "boolean"],
      ["resurrectionWarcryOnHitActive", "resurrectionWarcryOnHitActive", "boolean"],
      ["resurrectionWarcryTriggerLevel", "resurrectionWarcryTriggerLevel", ""],
      ["resurrectionWarcryTriggerIntervalSeconds", "resurrectionWarcryTriggerIntervalSeconds", "seconds"],
      [
        "alternatingDelayedPainAndFrostShieldActive",
        "alternatingDelayedPainAndFrostShieldActive",
        "boolean",
      ],
      ["delayedPainLevel", "delayedPainLevel", ""],
      ["frostShieldLevel", "frostShieldLevel", ""],
      ["alternatingBuffIntervalSeconds", "alternatingBuffIntervalSeconds", "seconds"],
      ["alternatingBuffDurationSeconds", "alternatingBuffDurationSeconds", "seconds"],
      ["maxDeflectionBonus", "maxDeflectionBonus", ""],
      ["voidGhostSphereGainIntervalSeconds", "voidGhostSphereGainIntervalSeconds", "seconds"],
      ["maxVoidGhostSphereStacks", "maxVoidGhostSphereStacks", ""],
      ["spiritMagusEnhancedSkillChance", "spiritMagusEnhancedSkillChance", "%"],
      [
        "spiritMagusDamagePerOwnedMagusAdditionalPercent",
        "spiritMagusDamagePerOwnedMagusAdditionalPercent",
        "%",
      ],
      ["intimidatedOnHitChance", "intimidatedOnHitChance", "%"],
      ["skillEffectDurationBonus", "skillEffectDurationBonus", "%"],
      ["warcryEffectBonus", "warcryEffectBonus", "%"],
      ["spellBurstChargeSpeedBonus", "spellBurstChargeSpeedBonus", "%"],
      ["demolisherChargeRestorationSpeedBonus", "demolisherChargeRestorationSpeedBonus", "%"],
      ["smartWeaponMinionPhysiqueBonus", "smartWeaponMinionPhysiqueBonus", "%"],
      ["smartWeaponMinionDoubleDamageChance", "smartWeaponMinionDoubleDamageChance", "%"],
      ["minionMaxLifeBonus", "minionMaxLifeBonus", "%"],
      ["spiritMagusCooldownRecoverySpeedBonus", "spiritMagusCooldownRecoverySpeedBonus", "%"],
      ["criticalDamageReduction", "criticalDamageReduction", "%"],
      ["maxSyntheticTroopQuantity", "maxSyntheticTroopQuantity", ""],
      ["maxTangleQuantity", "maxTangleQuantity", ""],
      ["tangleDurationBonus", "tangleDurationBonus", "%"],
      ["sentrySkillCastFrequencyAdditionalPercent", "sentrySkillCastFrequencyAdditionalPercent", "%"],
      ["sentryDurationBonus", "sentryDurationBonus", "%"],
      ["sentrySkillCastSpeedAdditionalPercent", "sentrySkillCastSpeedAdditionalPercent", "%"],
      ["maxSentryCount", "maxSentryCount", ""],
      ["elixirChargeProgressOnCriticalStrike", "elixirChargeProgressOnCriticalStrike", ""],
      ["elixirChargeProgressOnReaping", "elixirChargeProgressOnReaping", ""],
      ["elixirChargeProgressPerSixMetersMoved", "elixirChargeProgressPerSixMetersMoved", ""],
      ["elixirChargeProgressPerSecond", "elixirChargeProgressPerSecond", ""],
      ["overflowLifeRecoveryAppliedToShieldPercent", "overflowLifeRecoveryAppliedToShieldPercent", "%"],
      ["maximumShieldPerSelfAndMinionDamageStep", "maximumShieldPerSelfAndMinionDamageStep", ""],
      ["selfAndMinionDamageMorePerMaximumShieldStepPercent", "selfAndMinionDamageMorePerMaximumShieldStepPercent", "%"],
      ["selfAndMinionDamageMoreFromMaximumShieldCapPercent", "selfAndMinionDamageMoreFromMaximumShieldCapPercent", "%"],
      ["selfAndMinionKillExplosionChancePercent", "selfAndMinionKillExplosionChancePercent", "%"],
      ["selfAndMinionKillExplosionEnemyMaxLifeTrueDamagePercent", "selfAndMinionKillExplosionEnemyMaxLifeTrueDamagePercent", "%"],
      ["selfAndMinionKillExplosionRadiusMeters", "selfAndMinionKillExplosionRadiusMeters", ""],
      ["selfAndMinionDamageMorePercent", "selfAndMinionDamageMorePercent", "%"],
      ["overflowLifeRecoveryAppliedToShieldPercent", "overflowLifeRecoveryAppliedToShieldPercent", "%"],
      ["maximumShieldPerSelfAndMinionDamageStep", "maximumShieldPerSelfAndMinionDamageStep", ""],
      ["selfAndMinionDamageMorePerMaximumShieldStepPercent", "selfAndMinionDamageMorePerMaximumShieldStepPercent", "%"],
      ["selfAndMinionDamageMoreFromMaximumShieldCapPercent", "selfAndMinionDamageMoreFromMaximumShieldCapPercent", "%"],
      ["selfAndMinionKillExplosionChancePercent", "selfAndMinionKillExplosionChancePercent", "%"],
      ["selfAndMinionKillExplosionEnemyMaxLifeTrueDamagePercent", "selfAndMinionKillExplosionEnemyMaxLifeTrueDamagePercent", "%"],
      ["selfAndMinionKillExplosionRadiusMeters", "selfAndMinionKillExplosionRadiusMeters", ""],
      ["selfAndMinionDamageMorePercent", "selfAndMinionDamageMorePercent", "%"],
      ["movementSpeedBonus", "movementSpeedBonus", "%"],
      ["movementSpeedMeters", "movementSpeedMeters", "mps"],
      ["calculationPanelDamage", "calculationPanelDamage", ""],
    ],
  },
];

const STAT_ROWS = STAT_SECTIONS.flatMap((section) => section.rows);
const STAT_TAB_IDS = ["attributes", "calculation", "conditions", "analysis"];
const PLANNER_SECTION_DEFS = Object.freeze([
  { id: "hero", labelKey: "heroAndMemory", targetId: "planner-section-hero" },
  { id: "skills", labelKey: "skills", targetId: "planner-section-skills" },
  { id: "gear", labelKey: "gear", targetId: "planner-section-gear" },
  { id: "talents", labelKey: "talents", targetId: "planner-section-talents" },
  { id: "slates", labelKey: "slates", targetId: "planner-section-slates" },
  { id: "spirits", labelKey: "spiritsAndDestiny", targetId: "planner-section-spirits" },
  { id: "custom", labelKey: "customAffixes", targetId: "planner-section-custom" },
  { id: "research", labelKey: "research", targetId: "planner-section-research" },
]);
const UNSUPPORTED_DEFENSIVE_STAT_KEY_SET = new Set(UNSUPPORTED_DEFENSIVE_STAT_KEYS);
const DIVINITY_REGAIN_PUBLIC_STAT_KEYS = new Map([
  ["life_regain", new Set(["lifeRegainPercent", "lifeRegainPerHit"])],
  ["life_return", new Set(["lifeRegainPercent", "lifeRegainPerHit"])],
  ["energy_shield_regain", new Set(["shieldRegainPercent", "shieldRegainPerHit"])],
  ["shield_regain", new Set(["shieldRegainPercent", "shieldRegainPerHit"])],
  ["shield_return", new Set(["shieldRegainPercent", "shieldRegainPerHit"])],
  ["life_regain_interval", new Set(["lifeRegainIntervalSeconds"])],
  ["shield_regain_interval", new Set(["shieldRegainIntervalSeconds"])],
  ["regain_interval", new Set([
    "lifeRegainIntervalSeconds",
    "shieldRegainIntervalSeconds",
  ])],
]);

const EXTRA_STAT_DESCRIPTORS = new Map([
  ["speed", { suffix: "%", ko: "초당 대미지 계산용 공격 속도 입력값", en: "DPS attack-speed input" }],
  ["doubleDamageChance", { suffix: "%", ko: "이중 대미지 확률", en: "Double Damage chance" }],
  ["elementalAndErosionResistancePenetration", { suffix: "%", ko: "원소와 부식 저항 관통", en: "Elemental and Erosion Resistance Penetration" }],
  ["armorDamageMitigationPenetration", { suffix: "%", ko: "아머 대미지 감소 관통", en: "Armor Damage Mitigation Penetration" }],
  ["shieldFromMaxLifePercent", { suffix: "%", ko: "최대 HP 기반 보호막", en: "Energy Shield from Maximum Life" }],
  ["lifeRegenPercentPerSecond", { suffix: "%", ko: "최대 HP 비례 1초당 HP 회복", en: "Life regeneration per second (% max life)" }],
  ["manaRegenPercentPerSecond", { suffix: "%", ko: "최대 MP 비례 1초당 MP 회복", en: "Mana regeneration per second (% max mana)" }],
]);

const PUBLIC_STAT_DEPENDENCY_KEYS = Object.freeze({
  physicalEhp: ["life", "shield", "armor", "damageReduction"],
  physicalMaxHit: ["life", "shield", "armor", "damageReduction"],
  fireEhp: ["life", "shield", "fireResist", "damageReduction"],
  fireMaxHit: ["life", "shield", "fireResist", "damageReduction"],
  coldEhp: ["life", "shield", "coldResist", "damageReduction"],
  coldMaxHit: ["life", "shield", "coldResist", "damageReduction"],
  lightningEhp: ["life", "shield", "lightningResist", "damageReduction"],
  lightningMaxHit: ["life", "shield", "lightningResist", "damageReduction"],
  erosionEhp: ["life", "shield", "erosionResist", "damageReduction"],
  erosionMaxHit: ["life", "shield", "erosionResist", "damageReduction"],
});

function calculationCopy(ko, en) {
  return state.locale === "ko" ? ko : en;
}

function humanizeCalculationKey(value) {
  return String(value ?? "")
    .replace(/^flat:/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[:_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStatDescriptor(statKey) {
  const known = STAT_ROWS.find(([, key]) => key === statKey);
  if (known) return { label: ui(known[0]), suffix: known[2] };
  const extra = EXTRA_STAT_DESCRIPTORS.get(statKey);
  if (extra) return { label: calculationCopy(extra.ko, extra.en), suffix: extra.suffix };
  if (statKey === "castSpeedBonus") {
    return { label: calculationCopy(`${getSs13CalculationTerm("castSpeed")} 보너스`, "Cast Speed Bonus"), suffix: "%" };
  }
  if (statKey === "critDamage") {
    return { label: calculationCopy(getSs13CalculationTerm("critDamage"), "Critical Strike Damage"), suffix: "%" };
  }
  if (statKey === "attackSpeedIncrease" || statKey === "castSpeedIncrease") {
    const term = getSs13CalculationTerm(statKey === "attackSpeedIncrease" ? "attackSpeed" : "castSpeed");
    return { label: calculationCopy(`${term} 증가`, humanizeCalculationKey(statKey)), suffix: "%" };
  }
  return {
    label: humanizeCalculationKey(statKey) || calculationCopy("추가 계산값", "Additional calculation value"),
    suffix: "",
  };
}

function getCalculatedStatKeys(calc) {
  const keys = [];
  const seen = new Set();
  const addNumericKeys = (record, valueSelector = (value) => value) => {
    for (const [key, value] of Object.entries(record ?? {})) {
      if (key === "selectedCount" || seen.has(key)) continue;
      const numeric = valueSelector(value);
      if (typeof numeric !== "number") continue;
      seen.add(key);
      keys.push(key);
    }
  };
  addNumericKeys(calc?.summary);
  addNumericKeys(calc?.deltas);
  addNumericKeys(calc?.traces, (trace) => (
    trace?.status === "unsupported" ? 0 : trace?.finalValue
  ));
  return keys;
}

function getCalculatedStatSections(calc) {
  const available = new Set(getCalculatedStatKeys(calc));
  const used = new Set();
  const sections = STAT_SECTIONS.map((section) => ({
    title: section.title,
    rows: section.rows.filter(([, statKey]) => {
      if (!available.has(statKey) || used.has(statKey)) return false;
      used.add(statKey);
      return true;
    }),
  })).filter(({ rows }) => rows.length);
  const extraRows = [...available]
    .filter((statKey) => !used.has(statKey))
    .map((statKey) => {
      const descriptor = getStatDescriptor(statKey);
      return [null, statKey, descriptor.suffix, descriptor.label];
    });
  if (extraRows.length) {
    const otherSection = sections.find(({ title }) => title === "other");
    if (otherSection) otherSection.rows.push(...extraRows);
    else sections.push({ title: "other", rows: extraRows });
  }
  return sections;
}

const CONDITION_FIXED_FIELDS = [
  { section: "enemy", path: "enemy.type", label: "conditionEnemyType", type: "enemyType" },
  { section: "enemy", path: "enemy.isBoss", label: "conditionBoss", type: "boolean" },
  { section: "enemy", path: "enemy.level", label: "conditionEnemyLevel", type: "number", min: 1, max: 100, step: 1 },
  { section: "enemy", path: "enemy.armor", label: "armor", type: "number", min: 0, max: 1000000000, step: 1 },
  { section: "enemy", path: "enemy.affliction", label: "conditionAffliction", type: "number", min: 0, max: 100, step: 1 },
  { section: "enemy", path: "enemy.resistances.fire", label: "fireResist", type: "number", min: -100, max: 100, step: 1 },
  { section: "enemy", path: "enemy.resistances.cold", label: "coldResist", type: "number", min: -100, max: 100, step: 1 },
  { section: "enemy", path: "enemy.resistances.lightning", label: "lightningResist", type: "number", min: -100, max: 100, step: 1 },
  { section: "enemy", path: "enemy.resistances.erosion", label: "erosionResist", type: "number", min: -100, max: 100, step: 1 },
  { section: "enemy", path: "enemy.distance", label: "conditionDistance", type: "number", min: 0, max: 100, step: 0.1 },
  { section: "enemy", path: "enemy.distanceBand", label: "condition91TobEnemyDistanceBand", type: "enemyDistanceBand" },
  { section: "enemy", path: "enemy.witherStacks", label: "condition91TobWitherStacks", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "enemy", path: "enemy.paralysisStacks", label: "condition91TobParalysisStacks", type: "number", min: 0, max: 10, step: 1 },
  { section: "reaping", path: "reaping.durationSeconds", label: "conditionReapingDuration", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 0.1 },
  { section: "reaping", path: "reaping.eventsPerSecond", label: "conditionReapingEventsPerSecond", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 0.01 },
  { section: "regain", path: "regain.missingLife", label: "conditionMissingLife", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "regain", path: "regain.missingShield", label: "conditionMissingShield", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "recent", path: "recent.acted", label: "conditionRecentActed", type: "boolean" },
  { section: "recent", path: "recent.killed", label: "conditionRecentKilled", type: "boolean" },
  { section: "recent", path: "recent.wasHit", label: "conditionRecentHit", type: "boolean" },
  { section: "recent", path: "recent.consumed", label: "conditionRecentConsumed", type: "boolean" },
  { section: "recent", path: "recent.moved", label: "conditionRecentMoved", type: "boolean" },
  { section: "recent", path: "recent.usedWarcry", label: "conditionRecentUsedWarcry", type: "boolean" },
  { section: "recent", path: "recent.evaded", label: "conditionRecentEvaded", type: "boolean" },
  { section: "recent", path: "recent.moveDistanceMeters", label: "conditionRecentMoveDistance", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 0.1 },
  { section: "recent", path: "recent.killStack", label: "condition91TobRecentKillStack", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "recent", path: "recent.warcrySkillUseCount", label: "condition91TobRecentWarcryCount", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "recent", path: "recent.spellBurstActivationCount", label: "condition91TobRecentSpellBurstCount", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "recent", path: "recent.reapingCount", label: "conditionRecentReapingCount", type: "number", min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
  { section: "pact", path: "stacks.deflection", label: "conditionDeflectionStacks", type: "number", min: 0, max: 999, step: 1 },
  { section: "pact", path: "statuses.spell_burst_charge_active", label: "conditionSpellBurstChargeActive", type: "boolean" },
  { section: "pact", path: "statuses.wielding_shield", label: "conditionWieldingShield", type: "boolean" },
  { section: "pact", path: "statuses.wielding_mace", label: "conditionWieldingMace", type: "boolean" },
  { section: "pact", path: "statuses.dual_wielding", label: "conditionDualWielding", type: "boolean" },
  { section: "pact", path: "playerStates.elixir_skill_active", label: "conditionElixirSkillActive", type: "boolean" },
  { section: "shield", path: "playerStates.shield_recharge_active", label: "conditionShieldChargeActive", type: "boolean" },
  { section: "pact", path: "buffs.steadfast", label: "conditionSteadfastActive", type: "boolean" },
  {
    section: "pact",
    path: "statuses.omen_triggered_within_2_seconds",
    label: "conditionOmenTriggeredWithinTwoSeconds",
    type: "boolean",
  },
  {
    section: "pact",
    path: "buffs.aura_focus_origin_of_spirit_magus",
    label: "conditionAuraFocusOriginOfSpiritMagus",
    type: "boolean",
  },
];

const CONDITION_MAP_GROUPS = [
  { id: "charges", label: "conditionCharges", type: "number" },
  { id: "blessings", label: "conditionBlessings", type: "number" },
  { id: "heroStacks", label: "conditionHeroStacks", type: "number" },
  { id: "statuses", label: "conditionStatuses", type: "boolean" },
  { id: "buffs", label: "conditionBuffs", type: "boolean" },
  { id: "debuffs", label: "conditionDebuffs", type: "boolean" },
  { id: "recentFlags", label: "condition91TobRecentFlags", type: "boolean" },
  { id: "playerStates", label: "condition91TobPlayerStates", type: "boolean" },
  { id: "playerResources", label: "condition91TobPlayerResources", type: "boolean" },
  { id: "enemyStates", label: "condition91TobEnemyStates", type: "boolean" },
];

const BLOCKED_CONDITION_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const TOB91_ETERNAL_STACK_DISPLAY_INDEX = new Map(
  TOB91_ETERNAL_STACK_KEYS.map((key, index) => [key, index + 1]),
);
const TOB91_SAFE_CONDITION_DISPLAY = Object.freeze({
  recentFlags: {
    label: "condition91TobRecentFlagUnavailable",
    keys: TOB91_RECENT_FLAG_KEYS,
  },
  playerStates: {
    label: "condition91TobPlayerStateUnavailable",
    keys: TOB91_PLAYER_STATE_KEYS,
  },
  playerResources: {
    label: "condition91TobPlayerResourceUnavailable",
    keys: TOB91_PLAYER_RESOURCE_KEYS,
  },
  enemyStates: {
    label: "condition91TobEnemyStateUnavailable",
    keys: TOB91_ENEMY_STATE_KEYS,
  },
  debuffs: {
    label: "condition91TobDebuffUnavailable",
    keys: TOB91_DEBUFF_DISPLAY_KEYS,
  },
});

const CONDITION_MAP_KEY_LABELS = Object.freeze({
  heroStacks: Object.freeze({
    domination: "condition91TobEternalDomination",
    fervor: "condition91TobEternalFervor",
    guard: "condition91TobEternalGuard",
    nightmare: "condition91TobEternalNightmare",
    phantom: "condition91TobEternalPhantom",
    simulacrum: "condition91TobEternalSimulacrum",
  }),
  debuffs: Object.freeze({
    cursed: "condition91TobDebuffCursed",
    frostbite: "condition91TobDebuffFrostbite",
    frozen: "condition91TobDebuffFrozen",
    ignited: "condition91TobDebuffIgnited",
    paralyzed: "condition91TobDebuffParalyzed",
    blinded: "condition91TobDebuffBlinded",
    sluggish: "condition91TobDebuffSluggish",
    crippled: "condition91TobDebuffCrippled",
    knocked_back: "condition91TobDebuffKnockedBack",
    weakened: "condition91TobDebuffWeakened",
    damage_weakened: "condition91TobDebuffWeakened",
    intimidated: "condition91TobDebuffIntimidated",
    taunted: "condition91TobDebuffTaunted",
    marked: "condition91TobDebuffMarked",
    desecration: "condition91TobDebuffDesecration",
    trauma: "condition91TobDebuffTrauma",
    wither: "condition91TobDebuffWilt",
    shocked: "condition91TobDebuffShocked",
    scorched: "condition91TobDebuffScorched",
    at_max_affliction: "condition91TobDebuffMaxAffliction",
    aggravate_capped: "condition91TobDebuffMaxAffliction",
  }),
  recentFlags: Object.freeze({
    has_used_mobility_skill_recently: "condition91TobRecentMobilitySkillUsed",
    horizontal_projectile_hit_distant_enemy_recently: "conditionRecentHorizontalProjectileHitDistantEnemy",
    has_cast_curse_recently: "condition91TobRecentCurseSkillCast",
    has_crit_recently: "condition91TobRecentCriticalStrike",
    has_blocked_recently: "condition91TobRecentBlock",
    has_taken_damage_recently: "condition91TobRecentDamageTaken",
    has_not_been_hit_recently: "condition91TobRecentNotHit",
    is_moving: "condition91TobMoving",
    has_cast_sentry_skill_recently: "condition91TobRecentSentrySkillUsed",
    has_recently_summoned_minion: "condition91TobRecentSummonSkillCast",
    has_used_ground_skill_recently: "condition91TobRecentGroundSkillUsed",
    refund_recently: "condition91TobRecentRegain",
    recently_killed_withered_enemy: "condition91TobRecentWiltedEnemyKill",
  }),
  playerResources: Object.freeze({
    has_full_mana: "condition91TobNearMaxMana",
    has_low_mana: "condition91TobLowMana",
    low_energy_shield: "condition91TobLowShield",
    no_energy_shield: "condition91TobNoShield",
  }),
  playerStates: Object.freeze({
    life_low: "condition91TobPlayerLowLife",
    life_health: "condition91TobPlayerFullLife",
    channeling: "condition91TobPlayerChanneling",
    taking_dot: "condition91TobPlayerTakingDot",
    shield_recharge_active: "conditionShieldChargeActive",
    charge_support_buff_active: "condition91TobPlayerChargeSupportBuffActive",
    recovery_skill_active: "condition91TobPlayerRecoverySkillActive",
    elixir_skill_active: "conditionElixirSkillActive",
    spell_burst_charging: "conditionSpellBurstChargeActive",
    under_aura_infuse_spirit_source: "conditionAuraFocusOriginOfSpiritMagus",
    willpower_moving_grace_active: "condition91TobPlayerWillpowerMovingGraceActive",
    core_skill_triggered: "condition91TobCoreTerraSkillTriggered",
    standing_on_ground_skill: "condition91TobStandingOnGroundSkill",
  }),
  statuses: Object.freeze({
    moving: "condition91TobMoving",
    dual_wielding: "conditionDualWielding",
    dual_wielding_different_weapon_types: "conditionDualWieldingDifferentWeaponTypes",
    wielding_shield: "conditionWieldingShield",
    wielding_mace: "conditionWieldingMace",
    enemy_traumatized: "conditionEnemyTraumatized",
    enemy_ignited: "conditionEnemyIgnited",
  }),
  enemyStates: Object.freeze({
    low_life: "conditionEnemyLowLife",
    has_elites_nearby: "condition91TobEliteNearby",
  }),
});

function conditionMapKeyLabel(group, key) {
  const exactLabelKey = CONDITION_MAP_KEY_LABELS[group]?.[key];
  if (exactLabelKey) return ui(exactLabelKey);
  const eternalIndex = group === "heroStacks" ? TOB91_ETERNAL_STACK_DISPLAY_INDEX.get(key) : null;
  if (eternalIndex) return ui("condition91TobEternalStackUnavailable", { index: eternalIndex });
  const safeDisplay = TOB91_SAFE_CONDITION_DISPLAY[group];
  const safeIndex = safeDisplay?.keys.indexOf(key) ?? -1;
  return safeIndex >= 0 ? ui(safeDisplay.label, { index: safeIndex + 1 }) : key;
}

function compareConditionMapKeys(group, left, right) {
  const eternalLeft = group === "heroStacks" ? TOB91_ETERNAL_STACK_DISPLAY_INDEX.get(left) : null;
  const eternalRight = group === "heroStacks" ? TOB91_ETERNAL_STACK_DISPLAY_INDEX.get(right) : null;
  if (eternalLeft || eternalRight) return (eternalLeft ?? Number.MAX_SAFE_INTEGER) - (eternalRight ?? Number.MAX_SAFE_INTEGER);
  const safeKeys = TOB91_SAFE_CONDITION_DISPLAY[group]?.keys;
  const leftIndex = safeKeys?.indexOf(left) ?? -1;
  const rightIndex = safeKeys?.indexOf(right) ?? -1;
  if (leftIndex >= 0 || rightIndex >= 0) {
    return (leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER)
      - (rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER);
  }
  return left.localeCompare(right);
}

const GEAR_SLOT_KEYS = [
  "mainHand",
  "offHand",
  "helmet",
  "bodyArmor",
  "amulet",
  "gloves",
  "belt",
  "leftRing",
  "rightRing",
  "boots",
];

const GEAR_CATALOG_INDEX_BY_ID = new Map(
  getCatalogItems("gear").map((item, index) => [item.id, index]),
);

function slotKeyForGearIndex(index) {
  return GEAR_SLOT_KEYS[index] ?? "gear";
}

function loadLocale() {
  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_KEY));
  } catch {
    return "ko";
  }
}

function loadSidebarCollapsed() {
  try {
    const storedState = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return storedState === null || storedState === "on";
  } catch {
    return true;
  }
}

function loadNoticeVisible() {
  try { return localStorage.getItem("tob.notice.v1") !== "off"; }
  catch { return true; }
}

const state = {
  currentSeasonOpen: false,
  currentSeasonSection: "editor",
  advisorPreferences: loadAdvisorPreferences(localStorage),
  advisorDiagnosis: null,
  advisorComparison: null,
  advisorResult: null,
  advisorError: "",
  advisorBuildKey: "",
  advisorSeasonPreviewOpen: false,
  advisorWeightResearchOpen: false,
  advisorSavedSeasonComparison: loadSeasonComparison(localStorage),
  advisorSeasonResearch: loadSeasonResearchCopies(localStorage),
  advisorMigrationDraft: null,
  advisorSeasonWorkspaces: loadSeasonWorkspaces(localStorage),
  advisorWorkspace: null,
  advisorWorkspaceDirty: false,
  advisorWorkspaceInputStale: false,
  advisorWorkspaceFormValues: {},
  advisorWorkspaceImportText: "",
  advisorWorkspaceRecommendationMetric: null,
  advisorConfigurationDraft: null,
  view: "planner",
  plannerSection: "hero",
  activeSkillRow: 0,
  traitQuery: "",
  traitFilter: "all",
  screenshotImport: null,
  importReport: null,
  export91TobReport: null,
  isExporting91Tob: false,
  statTab: "attributes",
  conditionGroup: "enemy",
  expandedStatKey: null,
  statsDockOpen: false,
  showNotice: loadNoticeVisible(),
  sidebarCollapsed: loadSidebarCollapsed(),
  activeCategoryId: "gear",
  detailItemId: getAllItems()[0]?.id,
  query: "",
  catalogLimit: CATALOG_PAGE_SIZE,
  filter: ALL_FILTER,
  gearFilter: "all",
  locale: loadLocale(),
  build: loadCurrentBuild(),
  savedBuilds: loadSavedBuilds(),
  gearInventory: loadGearInventory(),
  heroMemoryInventory: loadHeroMemoryInventory(),
  unifiedInventory: loadUnifiedInventory(),
  inventoryTab: "gear",
  heroMemoryInventoryLabel: "",
  lastCalculation: null,
  lastCalculatedBuildKey: null,
  lastSkillRows: [],
  isStale: false,
  isCalculating: false,
  gearUpgradeResult: null,
  analysisGearUpgrade: null,
  analysisGearSlotMarginal: null,
  analysisMarginal: null,
  analysisSkillMarginal: null,
  gearLocaleRuntime: { status: "idle", registry: null, error: "" },
  runtimeLocaleRegistry: null,
  heroTraitRuntime: {
    status: "idle",
    model: null,
    previewModel: null,
    previewHeroes: [],
    supportByBranch: {},
    error: "",
  },
  heroTraitEditorUi: { activeStageLevel: 1 },
  heroMemoryRuntime: { status: "idle", dataset: null, error: "" },
  heroMemoryDraft: null,
  divinityRuntime: {
    status: "idle",
    divinityCatalog: null,
    hadesCatalog: null,
    sourceOnlyCatalog: null,
    sourceOnlySpecialSlateCatalog: null,
    metadata: null,
    error: "",
  },
  divinityEditorUi: {
    draftBoard: null,
    selectedInstanceId: null,
    exportedJson: "",
    error: "",
  },
  pactRuntime: { status: "idle", model: null, error: "" },
  pactEditorUi: {
    activeSlotIndex: 0,
    ringSlotId: "",
    undeterminedDraft: null,
    error: "",
    spiritSearch: "",
    destinySearch: "",
  },
  talentRuntime: { status: "idle", model: null, error: "" },
  talentEditorUi: {
    activeBoardIndex: 0,
    prismDraft: null,
    inverseDraft: null,
    selectedPrismInstanceId: null,
    selectedInverseInstanceId: null,
    screenshotMatchItemId: null,
    screenshotMatchLabel: "",
    error: "",
  },
  skillRuntime: { status: "idle", model: null, error: "" },
  skillPicker: null,
  skillDrafts: {},
  saveAsName: "",
  storageWarnings: consumeStorageWarnings(),
  buildSavePending: false,
  buildStorageNotice: "",
  notice: "",
  overlay: null,
  pendingSlot: null,
};

const seasonPlanner = createSeasonPlanner(localStorage, state.build, { sourceUnavailable: Boolean(getBuildStorageRevision(state.build)?.unreadable) });
let currentBuildRevision = getBuildStorageRevision(state.build);
let noticeTimer = 0;
let overlayOpenerToken = null;
let gearLocaleLoadPromise = null;
let pendingCustomAffixFocus = null;
let pendingCustomAffixAlternateFocus = null;
let heroTraitLoadPromise = null;
let heroMemoryLoadPromise = null;
let divinityLoadPromise = null;
let pactLoadPromise = null;
let talentLoadPromise = null;
let skillRuntimeLoadPromise = null;
let dataStatusLoadPromise = null;

function ui(key, params) {
  return t(state.locale, key, params);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function categoryText(category) {
  return getLocalizedCategory(category, state.locale);
}

function itemText(item) {
  return getLocalizedItem(item, state.locale);
}

function gameText(value) {
  return translateGameText(state.locale, value);
}

const GAME_PRESENTATION_INDEXES = new Map();
const DIVINITY_TEMPLATE_UI_TEXT = {
  six_gods: {
    nameKey: "divinitySlateGenericName",
    detailKey: "divinitySlateGenericDetail",
    classification: "app-structural-template",
  },
  last_gods_tear: {
    nameKey: "divinitySlateLegacyName",
    detailKey: "divinitySlateLegacyDetail",
    classification: "historical-save-restore-template",
  },
  hades_judgment: {
    name: HADES_KOREAN_PRESENTATION.templates.hades_judgment.name,
    detail: HADES_KOREAN_PRESENTATION.templates.hades_judgment.detail,
    nameByLocale: HADES_KOREAN_PRESENTATION.templates.hades_judgment.nameByLocale,
    detailByLocale: HADES_KOREAN_PRESENTATION.templates.hades_judgment.detailByLocale,
    classification: "official-ss13-patch-note",
  },
  hades_contamination: {
    name: HADES_KOREAN_PRESENTATION.templates.hades_contamination.name,
    detail: HADES_KOREAN_PRESENTATION.templates.hades_contamination.detail,
    nameByLocale: HADES_KOREAN_PRESENTATION.templates.hades_contamination.nameByLocale,
    detailByLocale: HADES_KOREAN_PRESENTATION.templates.hades_contamination.detailByLocale,
    classification: "official-ss13-patch-note",
  },
  hades_banishment: {
    name: HADES_KOREAN_PRESENTATION.templates.hades_banishment.name,
    detail: HADES_KOREAN_PRESENTATION.templates.hades_banishment.detail,
    nameByLocale: HADES_KOREAN_PRESENTATION.templates.hades_banishment.nameByLocale,
    detailByLocale: HADES_KOREAN_PRESENTATION.templates.hades_banishment.detailByLocale,
    classification: "official-ss13-patch-note",
  },
};

function presentationCatalogIndex(categoryId) {
  if (!categoryId) return null;
  if (GAME_PRESENTATION_INDEXES.has(categoryId)) return GAME_PRESENTATION_INDEXES.get(categoryId);
  const items = getCatalogItems(categoryId);
  const index = {
    byId: new Map(items.map((item) => [item.id, item])),
    byName: new Map(items.map((item) => [item.name, item])),
    bySlug: new Map(items.map((item) => [tlidbPageSlug(item.sourceUrl).toLowerCase(), item]).filter(([slug]) => slug)),
  };
  GAME_PRESENTATION_INDEXES.set(categoryId, index);
  return index;
}

function resolvePresentationItem({ itemId, categoryId, sourceUrl, sourceName }) {
  const direct = itemId ? findItemById(itemId) : null;
  if (direct) return direct;
  const index = presentationCatalogIndex(categoryId);
  if (!index) return null;
  if (sourceUrl) {
    const bySlug = index.bySlug.get(tlidbPageSlug(sourceUrl).toLowerCase());
    if (bySlug) return bySlug;
  }
  return sourceName ? index.byName.get(sourceName) ?? null : null;
}

function localizedFieldCandidates(field) {
  if (field === "name") return ["name"];
  if (["type", "slot", "rarity"].includes(field)) return [field];
  if (field === "summary") return ["summary", "detail"];
  if (field === "detail") return ["detail", "summary"];
  return [];
}

function derivedPactFieldAuthority(categoryId, field) {
  if (categoryId === "destiny" && ["affixText", "text"].includes(field)) {
    return ["summary", "detail"];
  }
  if (categoryId !== "spirits") return [];
  if (field === "overview") return ["summary", "detail"];
  if (
    /^rings\.[^.]+\.(?:name|effect|category)$/u.test(field)
    || /^mainAffix\.(?:name|effect|category)$/u.test(field)
    || /^levelAffixes\.\d+\.\d+$/u.test(field)
  ) return ["detail", "summary"];
  return [];
}

function exactTlidbLocaleField(localized, field, record = null) {
  if (!localized || typeof localized !== "object") return null;
  if (localized?.sourceFieldStatus?.[field] === "exact") return localized[field];
  const evidence = record?.raw?.localizationEvidence;
  const currentSource = evidence?.currentSources?.[state.locale];
  const explicitlyCheckedCurrentField = typeof currentSource === "string"
    && currentSource.length > 0
    && typeof evidence?.currentSourceCheckedAt === "string"
    && evidence.currentSourceCheckedAt.length > 0
    && currentSource === localized?.sourceUrl
    && evidence?.currentSourceCheckedAt === localized?.sourceCheckedAt
    && ["name", "detail", "tags"].includes(field);
  return explicitlyCheckedCurrentField ? localized[field] : null;
}

function localizedSourceUnavailable(optional = false) {
  if (optional) return "";
  return state.locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable";
}

function presentCatalogGameText(input = {}) {
  const {
    value,
    itemId,
    categoryId,
    sourceUrl,
    sourceName,
    field = "detail",
    optional = false,
    templateId,
    runtimeKind,
    runtimeId,
  } = input;
  if (runtimeKind) {
    const exactRuntimeText = state.locale === "ko"
      ? runtimeKind === "prism-item"
        ? TLIDB_TALENT_KO_LOCALE.prismItems?.[runtimeId]
        : runtimeKind === "prism-modifier"
          ? TLIDB_TALENT_KO_LOCALE.modifierTexts?.[runtimeId]
          : null
      : null;
    return exactRuntimeText
      ? presentSourceGameText(exactRuntimeText, { locale: state.locale, optional })
      : localizedSourceUnavailable(optional);
  }
  const item = resolvePresentationItem({ itemId, categoryId, sourceUrl, sourceName });
  if (item) {
    const localized = getTlidbLocaleText(item, state.locale);
    const supplement = state.locale === "ko" ? getCurrentKoreanGameTextSupplement(item, field) : null;
    if (supplement?.complete && supplement.presentation === "replace") {
      return presentSourceGameText(supplement.text, { locale: state.locale, optional });
    }
    const derivedAuthorityFields = derivedPactFieldAuthority(categoryId, field);
    if (derivedAuthorityFields.length) {
      const exactSourceAvailable = derivedAuthorityFields.some((candidateField) => {
        const exactValue = exactTlidbLocaleField(localized, candidateField);
        return exactValue !== null && exactValue !== undefined;
      });
      return exactSourceAvailable
        ? presentSourceGameText(value, { locale: state.locale, optional })
        : localizedSourceUnavailable(optional);
    }
    for (const candidateField of localizedFieldCandidates(field)) {
      const candidate = exactTlidbLocaleField(localized, candidateField);
      if (candidate !== undefined && candidate !== null && candidate !== "") {
        return presentSourceGameText(candidate, { locale: state.locale, optional });
      }
    }
    return localizedSourceUnavailable(optional);
  }
  if (templateId) {
    const templateLocale = TLIDB_DIVINITY_TEMPLATE_KO_LOCALE[templateId];
    const templateItem = templateLocale?.itemId ? findItemById(templateLocale.itemId) : null;
    const localized = templateItem ? getTlidbLocaleText(templateItem, state.locale) : null;
    for (const candidateField of localizedFieldCandidates(field)) {
      const candidate = exactTlidbLocaleField(localized, candidateField);
      if (candidate !== undefined && candidate !== null && candidate !== "") {
        return presentSourceGameText(candidate, { locale: state.locale, optional });
      }
    }
    if (templateLocale?.itemId) return localizedSourceUnavailable(optional);
    const templateText = DIVINITY_TEMPLATE_UI_TEXT[templateId];
    if (templateText) {
      const key = field === "name" ? templateText.nameKey : templateText.detailKey;
      if (key) return ui(key);
      const localeValues = field === "name"
        ? templateText.nameByLocale
        : templateText.detailByLocale;
      const localizedTemplateText = localeValues?.[state.locale];
      if (localizedTemplateText) {
        return presentSourceGameText(localizedTemplateText, { locale: state.locale, optional });
      }
      if (state.locale === "ko") {
        return field === "name" ? templateText.name : templateText.detail;
      }
    }
    return localizedSourceUnavailable(optional);
  }
  return localizedSourceUnavailable(optional);
}

function displayGameText(value, fallback = "") {
  const translated = gameText(value);
  return translated || fallback;
}

function scrubVisibleChinese(root) {
  if (!root || typeof document.createTreeWalker !== "function" || typeof NodeFilter === "undefined") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    if (containsHanScript(walker.currentNode.nodeValue)) textNodes.push(walker.currentNode);
  }
  for (const node of textNodes) {
    node.nodeValue = presentSourceGameText(node.nodeValue, { locale: state.locale });
  }
  if (typeof root.querySelectorAll !== "function") return;
  for (const element of root.querySelectorAll("[title], [aria-label], [aria-description], [aria-valuetext], [alt], [placeholder]")) {
    for (const attribute of ["title", "aria-label", "aria-description", "aria-valuetext", "alt", "placeholder"]) {
      const value = element.getAttribute(attribute);
      if (containsHanScript(value)) {
        element.setAttribute(attribute, presentSourceGameText(value, { locale: state.locale }));
      }
    }
  }
}

function runtimeLocaleField(record, field, fallback = "") {
  const value = state.runtimeLocaleRegistry && record?.localeRef
    ? getRuntimeLocaleField(state.runtimeLocaleRegistry, record.localeRef, state.locale, field, fallback)
    : fallback;
  return presentSourceGameText(value, { locale: state.locale });
}

function runtimeLocaleText(record, fallback = "") {
  const value = state.runtimeLocaleRegistry && record?.localeRef
    ? getRuntimeLocaleText(state.runtimeLocaleRegistry, record.localeRef, state.locale, fallback)
    : fallback;
  return presentSourceGameText(value, { locale: state.locale });
}

function renderLocalizedRuntimeText(record, values = {}, fallback = "") {
  const value = state.runtimeLocaleRegistry && record?.localeRef
    ? renderRuntimeLocaleText(
        state.runtimeLocaleRegistry,
        record.localeRef,
        state.locale,
        values,
        fallback,
      )
    : fallback;
  return presentSourceGameText(value, { locale: state.locale });
}

function gearCatalogPath(item, ...segments) {
  const itemIndex = GEAR_CATALOG_INDEX_BY_ID.get(item?.id);
  return Number.isInteger(itemIndex)
    ? `/catalog/gear/${itemIndex}/${segments.join("/")}`
    : "";
}

function gearBasePropertyPath(item, rollIndex) {
  const slug = tlidbPageSlug(item?.sourceUrl);
  return slug ? `base-property:${slug}:${rollIndex + 1}` : "";
}

function gearLocaleText(refOrPath, fallback = "") {
  const registry = state.gearLocaleRuntime.registry;
  const value = registry
    ? getGearLocaleText(registry, refOrPath, state.locale, fallback)
    : fallback;
  return presentSourceGameText(value, { locale: state.locale });
}

function preferredGearLocaleRef(...candidates) {
  const refs = candidates.filter(Boolean);
  const registry = state.gearLocaleRuntime.registry;
  return registry
    ? refs.find((ref) => resolveRuntimeLocaleRef(registry, ref)) ?? refs[0] ?? ""
    : refs[0] ?? "";
}

function gearTierLabel(tier) {
  if (tier?.tierLabel === "手工统计") return state.locale === "ko" ? "수동 설정" : "Manual";
  return presentSourceGameText(tier?.tierLabel ?? "", { locale: state.locale, optional: true });
}

function customAffixPresentation(value) {
  return resolveCustomAffixText(state.gearLocaleRuntime.registry, value, state.locale);
}

function customAffixDisplayText(value) {
  return presentCustomAffixText(state.gearLocaleRuntime.registry, value, state.locale);
}

function customAffixUnavailableText() {
  return state.locale === "ko" ? "한국어 원문 미제공" : "Localized source unavailable";
}

function customAffixEditorPresentation(value, placeholder) {
  const sourceValue = String(value ?? "");
  const resolved = customAffixPresentation(sourceValue);
  const unavailable = containsHanScript(sourceValue) && !resolved.complete;
  return {
    value: unavailable ? "" : resolved.text,
    placeholder: unavailable ? customAffixUnavailableText() : placeholder,
    complete: resolved.complete,
  };
}

function buildHasHanCustomAffixText(build = state.build) {
  return [
    build?.customAffixes,
    ...Object.values(build?.gearAffixes ?? {}),
    ...(build?.gear?.slots ?? []).map((slot) => slot?.affixText),
  ].some((value) => containsHanScript(value));
}

function isInteractiveFocusTarget(element) {
  const tagName = String(element?.tagName ?? "").toUpperCase();
  return /^(?:BUTTON|INPUT|SELECT|TEXTAREA)$/u.test(tagName)
    || element?.isContentEditable === true
    || (Number.isInteger(element?.tabIndex) && element.tabIndex >= 0);
}

function captureInteractiveFocus(element) {
  if (!isInteractiveFocusTarget(element)) return null;
  const id = String(element?.id ?? "");
  const dataset = Object.fromEntries(Object.entries(element?.dataset ?? {}));
  if (!id && !Object.keys(dataset).length) return null;
  let selectionStart;
  let selectionEnd;
  let selectionDirection;
  try {
    selectionStart = element.selectionStart;
    selectionEnd = element.selectionEnd;
    selectionDirection = element.selectionDirection;
  } catch {
    // Range and select controls do not expose text selection.
  }
  return {
    id,
    tagName: String(element.tagName ?? "").toLowerCase(),
    dataset,
    selectionStart,
    selectionEnd,
    selectionDirection,
  };
}

function restoreCapturedInteractiveFocus(snapshot) {
  if (!snapshot) return false;
  const candidates = snapshot.id
    ? [document.querySelector(`#${snapshot.id}`)].filter(Boolean)
    : [...document.querySelectorAll(snapshot.tagName)];
  const target = candidates.find((candidate) => Object.entries(snapshot.dataset).every(
    ([key, value]) => candidate.dataset?.[key] === value,
  ));
  if (!target) return false;
  target.focus();
  if (typeof target.setSelectionRange === "function" && Number.isInteger(snapshot.selectionStart)) {
    const valueLength = String(target.value ?? "").length;
    const start = Math.min(Math.max(snapshot.selectionStart, 0), valueLength);
    const end = Number.isInteger(snapshot.selectionEnd)
      ? Math.min(Math.max(snapshot.selectionEnd, start), valueLength)
      : start;
    target.setSelectionRange(start, end, snapshot.selectionDirection ?? "none");
  }
  return true;
}

function getRestorablePendingCustomAffixFocus(activeElement = document.activeElement) {
  if (!pendingCustomAffixFocus || pendingCustomAffixAlternateFocus) return null;
  if (activeElement?.id === pendingCustomAffixFocus.inputId) return pendingCustomAffixFocus;
  return isInteractiveFocusTarget(activeElement) ? null : pendingCustomAffixFocus;
}

function localizeCustomAffixInput(target, sourceValue) {
  const placeholder = target.id === "gearAffixEditor"
    ? ui("gearAffixPlaceholder")
    : ui("customAffixPlaceholder");
  const presentation = customAffixEditorPresentation(sourceValue, placeholder);
  const targetHasFocus = document.activeElement === target;
  const focusSnapshot = targetHasFocus
    ? {
        inputId: target.id,
        selectionStart: target.selectionStart,
        selectionEnd: target.selectionEnd,
        selectionDirection: target.selectionDirection,
      }
    : null;
  target.value = presentation.value;
  target.placeholder = presentation.placeholder;
  if (containsHanScript(sourceValue) && state.gearLocaleRuntime.status !== "ready") {
    pendingCustomAffixFocus = focusSnapshot;
    pendingCustomAffixAlternateFocus = null;
    void ensureGearLocaleRegistry();
  }
  return sourceValue;
}

function renderLocalizedGearText(refOrPath, values, fallback = "") {
  const registry = state.gearLocaleRuntime.registry;
  const value = registry
    ? renderGearLocaleText(registry, refOrPath, state.locale, values, fallback)
    : fallback;
  return presentSourceGameText(value, { locale: state.locale });
}

function ensureGearLocaleRegistry() {
  if (state.gearLocaleRuntime.status === "ready") {
    return Promise.resolve(state.gearLocaleRuntime.registry);
  }
  if (state.gearLocaleRuntime.status === "loading" && gearLocaleLoadPromise) {
    return gearLocaleLoadPromise;
  }

  state.gearLocaleRuntime = { status: "loading", registry: null, error: "" };
  gearLocaleLoadPromise = loadGearLocaleRegistry()
    .then((registry) => {
      const focusedElement = document.activeElement;
      const focusedInputId = focusedElement?.id ?? "";
      const pendingFocus = getRestorablePendingCustomAffixFocus(focusedElement);
      const alternateFocus = pendingCustomAffixAlternateFocus
        ?? (pendingFocus ? null : captureInteractiveFocus(focusedElement));
      const focusedSelectionStart = pendingFocus?.selectionStart ?? focusedElement?.selectionStart;
      const focusedSelectionEnd = pendingFocus?.selectionEnd ?? focusedElement?.selectionEnd;
      const focusedSelectionDirection = pendingFocus?.selectionDirection ?? focusedElement?.selectionDirection;
      const focusInputId = pendingFocus?.inputId ?? focusedInputId;
      pendingCustomAffixFocus = null;
      pendingCustomAffixAlternateFocus = null;
      const hadHanCustomAffixText = buildHasHanCustomAffixText();
      state.gearLocaleRuntime = { status: "ready", registry, error: "" };
      if (
        state.overlay?.type === "gear"
        || state.overlay?.type === "inventory"
        || hadHanCustomAffixText
      ) {
        render();
        if (restoreCapturedInteractiveFocus(alternateFocus)) {
          // Preserve the control the user moved to while locale data was loading.
        } else if (focusInputId === "gearAffixEditor" || focusInputId === "customAffixes") {
          restoreInputFocus(
            focusInputId,
            focusedSelectionStart,
            focusedSelectionEnd,
            focusedSelectionDirection,
          );
        } else if (state.overlay?.type === "gear" || state.overlay?.type === "inventory") {
          focusOverlayEntry();
        }
      }
      return registry;
    })
    .catch((error) => {
      const pendingFocus = getRestorablePendingCustomAffixFocus();
      const alternateFocus = pendingCustomAffixAlternateFocus
        ?? (pendingFocus ? null : captureInteractiveFocus(document.activeElement));
      pendingCustomAffixFocus = null;
      pendingCustomAffixAlternateFocus = null;
      state.gearLocaleRuntime = {
        status: "error",
        registry: null,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (
        state.overlay?.type === "gear"
        || state.overlay?.type === "inventory"
        || pendingFocus
        || alternateFocus
      ) {
        render();
        if (restoreCapturedInteractiveFocus(alternateFocus)) {
          // Preserve the user's current control even when locale loading fails.
        } else if (pendingFocus?.inputId) {
          restoreInputFocus(
            pendingFocus.inputId,
            pendingFocus.selectionStart,
            pendingFocus.selectionEnd,
            pendingFocus.selectionDirection,
          );
        }
      }
      return null;
    });

  return gearLocaleLoadPromise;
}

function renderItemIcon(item, className = "item-icon") {
  const iconUrl = item?.iconUrl;
  const safeClassName = escapeHtml(className);
  if (!iconUrl) {
    return `<span class="${safeClassName} item-icon-fallback" aria-hidden="true">◇</span>`;
  }
  return `<img class="${safeClassName}" src="${escapeHtml(iconUrl)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="${safeClassName} item-icon-fallback" aria-hidden="true" hidden>◇</span>`;
}

function formatNumber(value) {
  return new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US").format(Math.round(value));
}

function formatStat(value, suffix = "") {
  if (suffix === "/525") return `${formatNumber(value)}${suffix}`;
  if (suffix === "boolean") return Number(value) > 0 ? ui("statActive") : ui("statInactive");
  if (suffix === "decimal2") return Number(value).toFixed(2);
  if (suffix === "decimal4") {
    return new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
      maximumFractionDigits: 4,
    }).format(Number(value));
  }
  if (suffix === "multiplier") {
    const formatted = new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
      maximumFractionDigits: 4,
    }).format(Number(value));
    return `× ${formatted}`;
  }
  if (suffix === "mps") {
    return state.locale === "ko"
      ? `${Number(value).toFixed(2)} 미터/초`
      : `${Number(value).toFixed(2)} m/s`;
  }
  if (suffix === "meters") {
    const formatted = new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
      maximumFractionDigits: 2,
    }).format(Number(value));
    return state.locale === "ko" ? `${formatted}미터` : `${formatted}m`;
  }
  if (suffix === "seconds") {
    const formatted = new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
      maximumFractionDigits: 2,
    }).format(Number(value));
    return state.locale === "ko" ? `${formatted}초` : `${formatted}s`;
  }
  if (suffix === "%") return `${Number(value).toFixed(value % 1 === 0 ? 0 : 1)}%`;
  return formatNumber(value);
}

function getSelectionIds(categoryId) {
  return (state.build.selections[categoryId] ?? []).filter((itemId) => Boolean(findItemById(itemId)));
}

function getSlotItemIds(categoryId) {
  const maxSelections = getCategory(categoryId)?.maxSelections ?? 0;
  return (state.build.selections[categoryId] ?? []).slice(0, maxSelections);
}

function isSelected(itemId) {
  const item = findItemById(itemId);
  return item ? getSelectionIds(item.categoryId).includes(itemId) : false;
}

function isSelectedForCurrentSlot(itemId) {
  const item = findItemById(itemId);
  if (!item) return false;
  const target = state.pendingSlot?.categoryId === item.categoryId ? state.pendingSlot : null;
  return target ? getSlotItemIds(item.categoryId)[target.index] === itemId : isSelected(itemId);
}

function isItemCompatibleWithCurrentSlot(item) {
  const target = state.pendingSlot?.categoryId === item.categoryId ? state.pendingSlot : null;
  if (item.categoryId !== "gear" || !target) return true;

  const maxSelections = getCategory("gear")?.maxSelections ?? 0;
  if (target.index < 0 || target.index >= maxSelections) return false;
  const slotFilter = getGearFilterForSlot(slotKeyForGearIndex(target.index));
  return getGearItemsForFilter(slotFilter).some((candidate) => candidate.id === item.id);
}

function trimEmptySlots(itemIds) {
  let end = itemIds.length;
  while (end > 0 && !itemIds[end - 1]) end -= 1;
  return itemIds.slice(0, end);
}

function clampSkillLevel(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function showNotice(message) {
  state.notice = message;
  window.clearTimeout(noticeTimer);
  if (!message) return;

  noticeTimer = window.setTimeout(() => {
    if (state.notice !== message) return;
    state.notice = "";
    const toast = document.querySelector(".toast");
    toast?.remove();
    document.querySelector('.screenshot-status')?.remove();
  }, 2600);
}

function storageWarningMessage(code) {
  const keys = {
    "build-storage-unavailable": "storageReadFailed",
    "build-storage-recovery-write-failed": "storageRecoveryWriteFailed",
    "build-storage-recovery-pending": "storageRecoveryPending",
    "current-build-corrupt": "storageCurrentBuildCorrupt",
    "saved-builds-invalid-shape": "storageSavedBuildsInvalidShape",
    "saved-builds-corrupt": "storageSavedBuildsCorrupt",
    "gear-inventory-invalid-shape": "storageGearInventoryInvalidShape",
    "gear-inventory-corrupt": "storageGearInventoryCorrupt",
    "hero-memory-inventory-invalid-shape": "storageHeroMemoryInventoryInvalidShape",
    "hero-memory-inventory-corrupt": "storageHeroMemoryInventoryCorrupt",
    "unified-inventory-invalid-shape": "storageUnifiedInventoryInvalidShape",
    "unified-inventory-unsupported-version": "storageUnifiedInventoryUnsupportedVersion",
    "unified-inventory-record-invalid": "storageUnifiedInventoryRecordInvalid",
    "unified-inventory-corrupt": "storageUnifiedInventoryCorrupt",
  };
  return ui(keys[code] ?? "storageRecoveryWarning");
}

function renderStorageWarnings() {
  const messages = [...new Set(
    [...(state.storageWarnings ?? []).map(({ code }) => storageWarningMessage(code)), state.buildStorageNotice].filter(Boolean),
  )];
  if (!messages.length) return "";
  return `
    <section class="storage-warning-banner" data-role="storage-warnings" role="alert">
      <div>
        <strong>${ui("storageRecoveryTitle")}</strong>
        <ul>${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>
      </div>
      <button type="button" data-action="dismiss-storage-warnings" aria-label="${ui("close")}">×</button>
    </section>
  `;
}

function refreshBuildStorageNotice() {
  const container = document.querySelector('[data-role="storage-warning-container"]');
  if (container) container.innerHTML = renderStorageWarnings();
}

function buildStorageErrorMessage(error, { draft = false } = {}) {
  if (error instanceof PactStorageInvariantError) return ui("pactStorageInvalid");
  if (error instanceof BuildStorageConflictError) return ui("storageBuildConflict");
  if (error instanceof BuildStorageUnavailableError) return ui("storageReadFailed");
  return ui(draft ? "storageDraftUnsaved" : "storageWriteFailed");
}

function acknowledgeBuildStorage(build) {
  currentBuildRevision = getBuildStorageRevision(build);
  state.buildSavePending = false;
  state.buildStorageNotice = "";
  state.storageWarnings = state.storageWarnings.filter(({ code }) => !code.startsWith("build-storage-"));
  refreshBuildStorageNotice();
}

function persistCurrentBuild(nextBuild) {
  try {
    const persisted = persistBuildToStorage(nextBuild, { expectedRevision: currentBuildRevision });
    acknowledgeBuildStorage(persisted);
    return persisted;
  } catch (error) {
    if (error instanceof PactStorageInvariantError) throw error;
    // Editing must survive a failed write, including file export and a later retry.
    state.buildSavePending = true;
    state.buildStorageNotice = buildStorageErrorMessage(error, { draft: true });
    showNotice(state.buildStorageNotice);
    refreshBuildStorageNotice();
    return normalizeBuild(nextBuild);
  }
}

function persistSynchronizedBuild(nextBuild) {
  // Runtime normalization is an in-memory view. Only explicit edits/save may
  // replace a preserved season snapshot, even when its old IDs need adapting.
  return normalizeBuild(nextBuild);
}

function normalizeBuildWithSkillRuntime(nextBuild) {
  let normalized = normalizeBuild(nextBuild);
  const model = state.skillRuntime.model;
  if (state.skillRuntime.status === "ready" && model) {
    const skills = normalizeSkillState(model, normalized.skills ?? createDefaultSkillState(), { build: normalized });
    const compatibility = skillCompatibilitySelections(skills);
    normalized = normalizeBuild({
      ...normalized,
      skills,
      selections: {
        ...normalized.selections,
        skills: compatibility.skills,
        supports: compatibility.supports,
      },
    });
  }
  return normalizeCalculationSelectedSkill(normalized);
}

function calculationInputKey(build) {
  const { id, name, createdAt, updatedAt, ...calculationInput } = build ?? {};
  return JSON.stringify(calculationInput);
}

function getEquippedActiveSkillRows(build = state.build) {
  const equippedRowIndexes = new Set(
    (build?.skills?.active ?? []).flatMap((slot, rowIndex) => (slot?.skillId ? [rowIndex] : [])),
  );
  if (getExternalMainSkillOverride(null, build, "active", 0)?.skill) equippedRowIndexes.add(0);
  return analyzeSkillRows(build)
    .filter(({ rowIndex }) => equippedRowIndexes.has(rowIndex))
    .filter(({ calculationApplicable }) => calculationApplicable !== false)
    .sort((left, right) => left.rowIndex - right.rowIndex);
}

function normalizeCalculationSelectedSkill(build) {
  const rows = getEquippedActiveSkillRows(build);
  const selected = build?.calculation?.selectedSkill;
  const selectedRow = selected?.kind === "active" && Number.isInteger(selected.slotIndex)
    ? rows.find(({ rowIndex }) => rowIndex === selected.slotIndex)
    : null;
  const nextSelectedSkill = selectedRow
    ? { kind: "active", slotIndex: selectedRow.rowIndex }
    : rows[0]
      ? { kind: "active", slotIndex: rows[0].rowIndex }
      : null;
  if (
    (selected === null && nextSelectedSkill === null)
    || (
      selected?.kind === nextSelectedSkill?.kind
      && selected?.slotIndex === nextSelectedSkill?.slotIndex
    )
  ) return build;
  return {
    ...build,
    calculation: {
      ...(build.calculation ?? {}),
      selectedSkill: nextSelectedSkill,
    },
  };
}

function markCalculationStale() {
  const currentBuildKey = calculationInputKey(state.build);
  if (state.analysisGearUpgrade?.buildKey !== currentBuildKey) {
    state.analysisGearUpgrade = null;
  }
  if (state.analysisGearSlotMarginal?.buildKey !== currentBuildKey) {
    state.analysisGearSlotMarginal = null;
  }
  if (state.analysisMarginal?.buildKey !== currentBuildKey) {
    state.analysisMarginal = null;
  }
  if (state.analysisSkillMarginal?.buildKey !== currentBuildKey) {
    state.analysisSkillMarginal = null;
  }
  if (state.lastCalculation) {
    state.isStale = currentBuildKey !== state.lastCalculatedBuildKey;
  }
}

function currentSelectedCount() {
  return Object.values(state.build.selections ?? {}).reduce(
    (count, ids) => count + (Array.isArray(ids) ? ids.filter(Boolean).length : 0),
    0,
  );
}

function buildHasTalentBoardState(build = state.build) {
  return Boolean(
    build?.talents?.boards?.some((board) => (
      board?.treeSlug
      || Object.keys(board?.nodePoints ?? {}).length
      || Object.keys(board?.reflectedNodePoints ?? {}).length
      || board?.coreTalentIds?.length
    ))
    || build?.selections?.talents?.some(Boolean),
  );
}

function setBuild(nextBuild, notice = "") {
  try {
    state.build = persistCurrentBuild(normalizeBuildWithSkillRuntime(nextBuild));
  } catch (error) {
    showNotice(ui(error instanceof PactStorageInvariantError
      ? "pactStorageInvalid"
      : "storageWriteFailed"));
    render();
    return false;
  }
  markCalculationStale();
  showNotice(state.buildSavePending ? state.buildStorageNotice : notice);
  render();
  if (buildHasTalentBoardState()) void ensureTalentBoardModel();
  return true;
}

function synchronizeSelectedHeroTraits(model) {
  const selectedHeroId = state.build.selections.hero?.[0];
  const branch = findHeroTraitBranch(model, selectedHeroId);
  if (!branch) return;

  const hero = normalizeHeroTraitState(model, {
    ...(state.build.hero ?? {}),
    branchId: selectedHeroId,
    level: state.build.heroLevel ?? state.build.hero?.level ?? 90,
  });
  state.build = persistSynchronizedBuild(normalizeBuild({
    ...state.build,
    heroLevel: hero.level,
    hero,
    selections: {
      ...state.build.selections,
      hero: [branch.flatHeroId ?? selectedHeroId],
    },
  }));
  markCalculationStale();
}

function ensureHeroTraitModel() {
  if (state.heroTraitRuntime.status === "ready") {
    return Promise.resolve(state.heroTraitRuntime.model);
  }
  if (state.heroTraitRuntime.status === "loading" && heroTraitLoadPromise) {
    return heroTraitLoadPromise;
  }

  state.heroTraitRuntime = {
    status: "loading",
    model: null,
    previewModel: null,
    previewHeroes: [],
    supportByBranch: {},
    error: "",
  };
  if (state.overlay?.type === "hero") render();

  heroTraitLoadPromise = loadTlidbHeroTraitCalculationRuntime(getCatalogItems("hero"))
    .then((runtime) => {
      state.runtimeLocaleRegistry = runtime.registry;
      const model = runtime.model;
      const supportByBranch = Object.fromEntries(
        summarizeTlidbHeroTraitBranchSupport(runtime).map((summary) => [
          summary.branchId,
          summary,
        ]),
      );
      state.heroTraitRuntime = {
        status: "ready",
        model,
        previewModel: null,
        previewHeroes: [],
        supportByBranch,
        error: "",
      };
      synchronizeSelectedHeroTraits(model);
      if (state.overlay?.type === "hero" || state.build.selections.hero?.[0]) {
        render();
        if (state.overlay?.type === "hero") focusOverlayEntry();
      }
      return model;
    })
    .catch((error) => {
      state.heroTraitRuntime = {
        status: "error",
        model: null,
        previewModel: null,
        previewHeroes: [],
        supportByBranch: {},
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (state.overlay?.type === "hero") render();
      return null;
    });

  return heroTraitLoadPromise;
}

function selectHeroBranch(itemId) {
  const item = findItemById(itemId);
  const model = state.heroTraitRuntime.model;
  if (item?.categoryId !== "hero") return;
  if (!model) {
    showNotice(ui("heroTraitLoading"));
    render();
    void ensureHeroTraitModel().then((loadedModel) => {
      if (loadedModel) selectHeroBranch(itemId);
    });
    return;
  }

  const branch = findHeroTraitBranch(model, itemId);
  if (!branch) return;
  const level = Math.max(1, Math.min(100, Math.round(Number(state.build.heroLevel ?? 90))));
  const currentBranch = findHeroTraitBranch(model, state.build.hero?.branchId);
  const hero = currentBranch === branch
    ? normalizeHeroTraitState(model, { ...state.build.hero, branchId: itemId, level })
    : changeHeroTraitBranch(model, { ...(state.build.hero ?? {}), level }, itemId);
  const flatHeroId = branch.flatHeroId ?? itemId;

  state.detailItemId = flatHeroId;
  if (currentBranch !== branch) state.heroTraitEditorUi.activeStageLevel = 1;
  if (state.overlay?.type === "hero") state.overlay = { ...state.overlay, mode: "edit" };
  setBuild({
    ...state.build,
    heroLevel: hero.level,
    hero,
    selections: {
      ...state.build.selections,
      hero: [flatHeroId],
    },
  }, `${itemText(item).name} ${ui("addedSuffix")}`);
}

function resetSelectedHero() {
  const currentHero = state.build.hero ?? {};
  setBuild({
    ...state.build,
    heroLevel: 90,
    hero: {
      ...currentHero,
      branchId: null,
      level: 90,
      traitSelections: [],
    },
    selections: {
      ...state.build.selections,
      hero: [],
    },
  }, ui("heroTraitRemoved"));
}

function setHeroLevel(value) {
  const heroLevel = Math.max(1, Math.min(100, Math.round(Number(value) || 1)));
  const model = state.heroTraitRuntime.model;
  const selectedHeroId = state.build.selections.hero?.[0];
  const hero = model && selectedHeroId
    ? normalizeHeroTraitState(model, {
        ...(state.build.hero ?? {}),
        branchId: selectedHeroId,
        level: heroLevel,
      })
    : { ...(state.build.hero ?? {}), level: heroLevel };

  setBuild({ ...state.build, heroLevel, hero });
}

function selectHeroTraitChoice(stageId, groupId, choiceId) {
  const model = state.heroTraitRuntime.model;
  const selectedHeroId = state.build.selections.hero?.[0];
  if (!model || !selectedHeroId) return;

  const branch = findHeroTraitBranch(model, selectedHeroId);
  if (!branch) return;
  const hero = updateHeroTraitChoice(model, state.build.hero, { stageId, groupId, choiceId });
  setBuild({
    ...state.build,
    heroLevel: hero.level,
    hero,
    selections: {
      ...state.build.selections,
      hero: [branch.flatHeroId ?? selectedHeroId],
    },
  });
}

function heroMemoryTypeName(memoryTypeOrId) {
  const memoryTypeId = typeof memoryTypeOrId === "string" ? memoryTypeOrId : memoryTypeOrId?.slotId;
  const sourceName = typeof memoryTypeOrId === "string" ? "" : memoryTypeOrId?.memoryType;
  return runtimeLocaleField(memoryTypeOrId, "name", sourceName || memoryTypeId || ui("heroMemory"));
}

function heroMemoryStageLevel(memoryType) {
  const match = String(memoryType?.stageLevel ?? "").match(/\d+/u);
  return match ? Number.parseInt(match[0], 10) : "—";
}

function initializeHeroMemoryDraft(dataset) {
  const slotIndex = Number(state.pendingSlot?.index);
  if (!Number.isInteger(slotIndex)) return null;

  if (slotIndex === 3) {
    const memories = Array.from(
      { length: 3 },
      (_, index) => state.build.hero?.memories?.[index] ?? null,
    );
    const effects = memories
      .map((memory) => getHeroMemoryRevivalSlotEffect(memory, dataset))
      .filter(Boolean);
    if (effects.length !== 1) return null;
    const effect = effects[0];
    const memoryType = getHeroMemoryRevivalSlotTargetType(effect, dataset);
    if (!memoryType) return null;
    const memory = reconcileHeroMemoryRevivalSlot(
      memories,
      state.build.hero?.revivalMemory,
      dataset,
    ) ?? createHeroMemoryRevivalSlotInstance(
      effect,
      dataset,
      `memory-revival-base-trait-${Date.now()}`,
    );
    if (!memory) return null;
    state.heroMemoryDraft = {
      slotIndex,
      isRevivalExtraSlot: true,
      effect,
      memoryType,
      memory,
    };
    return memory;
  }

  const memoryType = dataset?.memoryTypes?.[slotIndex];
  if (!memoryType) return null;
  const existing = state.build.hero?.memories?.[slotIndex];
  const normalized = normalizeHeroMemoryInstance(existing, dataset);
  const memory = normalized?.memoryTypeId === memoryType.slotId
    ? normalized
    : createHeroMemoryInstance(memoryType.slotId, dataset, `memory-${memoryType.slotId}-${Date.now()}`);
  state.heroMemoryDraft = { slotIndex, isRevivalExtraSlot: false, memoryType, memory };
  return memory;
}

function ensureHeroMemoryDataset() {
  if (state.heroMemoryRuntime.status === "ready") {
    let initialized = false;
    if (!state.heroMemoryDraft || state.heroMemoryDraft.slotIndex !== Number(state.pendingSlot?.index)) {
      initializeHeroMemoryDraft(state.heroMemoryRuntime.dataset);
      initialized = true;
    }
    if (initialized && state.overlay?.type === "heroMemory") {
      render();
      focusOverlayEntry();
    }
    return Promise.resolve(state.heroMemoryRuntime.dataset);
  }
  if (state.heroMemoryRuntime.status === "loading" && heroMemoryLoadPromise) return heroMemoryLoadPromise;

  state.heroMemoryRuntime = { status: "loading", dataset: null, error: "" };
  if (state.overlay?.type === "heroMemory") render();

  heroMemoryLoadPromise = loadActiveHeroMemoryDataset()
    .then(({ dataset, registry }) => {
      state.runtimeLocaleRegistry = registry;
      state.heroMemoryRuntime = { status: "ready", dataset, error: "" };
      initializeHeroMemoryDraft(dataset);
      const hasStoredMemory = state.build.hero?.memories?.some((memory) => memory?.memoryTypeId)
        || Boolean(state.build.hero?.revivalMemory?.memoryTypeId);
      if (state.overlay?.type === "heroMemory" || state.overlay?.type === "inventory" || hasStoredMemory) {
        render();
        if (state.overlay?.type === "heroMemory") focusOverlayEntry();
      }
      return dataset;
    })
    .catch((error) => {
      state.heroMemoryRuntime = {
        status: "error",
        dataset: null,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (state.overlay?.type === "heroMemory" || state.overlay?.type === "inventory") render();
      return null;
    });

  return heroMemoryLoadPromise;
}

function updateHeroMemoryDraft(memory) {
  const dataset = state.heroMemoryRuntime.dataset;
  const normalized = normalizeHeroMemoryInstance(memory, dataset);
  if (!normalized || !state.heroMemoryDraft) return;
  state.heroMemoryDraft = { ...state.heroMemoryDraft, memory: normalized };
  render();
}

function setHeroMemoryAffixSelection(kind, slotIndex, affixId) {
  const dataset = state.heroMemoryRuntime.dataset;
  const current = state.heroMemoryDraft?.memory;
  if (!dataset || !current || !["fixed", "random"].includes(kind)) return;

  const field = kind === "fixed" ? "fixedAffixIds" : "randomAffixIds";
  const existingId = current[field]?.[slotIndex];
  let memory = current;
  if (existingId && existingId !== affixId) memory = toggleHeroMemoryAffix(memory, kind, existingId, dataset).memory;
  if (affixId && !memory[field].includes(affixId)) {
    const result = toggleHeroMemoryAffix(memory, kind, affixId, dataset);
    if (result.status === "limit") {
      showNotice(ui("heroMemoryAffixLimit"));
      render();
      return;
    }
    memory = result.memory;
  }
  updateHeroMemoryDraft(memory);
}

function saveHeroMemoryDraft() {
  const dataset = state.heroMemoryRuntime.dataset;
  const draft = state.heroMemoryDraft;
  if (!dataset || !draft) return;
  const diagnosis = draft.isRevivalExtraSlot
    ? diagnoseHeroMemoryRevivalSlotInstance(draft.memory, draft.effect, dataset)
    : diagnoseHeroMemoryInstance(draft.memory, dataset);
  if (!diagnosis.valid) {
    showNotice(ui("heroMemoryIncomplete"));
    render();
    return;
  }

  const memories = Array.from({ length: 3 }, (_, index) => state.build.hero?.memories?.[index] ?? null);
  const memoryType = draft.memoryType ?? dataset.memoryTypes?.[draft.slotIndex];
  if (draft.isRevivalExtraSlot) {
    if (!returnOverlayForNestedSelection()) state.overlay = null;
    state.pendingSlot = null;
    state.heroMemoryDraft = null;
    setBuild({
      ...state.build,
      hero: {
        ...(state.build.hero ?? {}),
        revivalMemory: {
          ...diagnosis.normalized,
          memoryTypeId: memoryType?.flatCatalogId ?? diagnosis.normalized.memoryTypeId,
        },
      },
    }, ui("heroMemorySaved"));
    return;
  }
  memories[draft.slotIndex] = {
    ...diagnosis.normalized,
    memoryTypeId: memoryType?.flatCatalogId ?? diagnosis.normalized.memoryTypeId,
  };
  if (diagnosis.normalized.revivalAffixId) {
    for (const [index, memory] of memories.entries()) {
      if (index === draft.slotIndex || !memory?.revivalAffixId) continue;
      const affixRolls = { ...(memory.affixRolls ?? {}) };
      delete affixRolls[memory.revivalAffixId];
      memories[index] = { ...memory, revivalAffixId: null, affixRolls };
    }
  }
  const heroMemorySelections = trimEmptySlots(memories.map((memory) => memory?.memoryTypeId ?? null));
  const revivalMemory = reconcileHeroMemoryRevivalSlot(
    memories,
    state.build.hero?.revivalMemory,
    dataset,
  );
  if (!returnOverlayForNestedSelection()) state.overlay = null;
  state.pendingSlot = null;
  state.heroMemoryDraft = null;
  setBuild({
    ...state.build,
    hero: { ...(state.build.hero ?? {}), memories, revivalMemory },
    selections: { ...state.build.selections, heroMemory: heroMemorySelections },
  }, ui("heroMemorySaved"));
}

function safeHeroMemoryInventoryLabel(value, fallback) {
  const label = String(value ?? "").trim();
  return label && !containsHanScript(label) ? label : fallback;
}

function refreshUnifiedInventory(records = null) {
  state.unifiedInventory = Array.isArray(records) ? records : loadUnifiedInventory();
  state.gearInventory = loadGearInventory();
  state.heroMemoryInventory = loadHeroMemoryInventory();
  const warnings = consumeStorageWarnings();
  if (warnings.length) state.storageWarnings = [...(state.storageWarnings ?? []), ...warnings];
}

let inventoryRecovery = null;
function recoverInventory() {
  if (inventoryRecovery) return inventoryRecovery;
  inventoryRecovery = recoverUnifiedInventory().then((records) => {
    const before = JSON.stringify([state.unifiedInventory, state.storageWarnings]);
    const inventoryScopes = ["unified-inventory", "gear-inventory", "hero-memory-inventory"];
    state.storageWarnings = state.storageWarnings.filter(({ scope }) => !inventoryScopes.includes(scope));
    refreshUnifiedInventory(records);
    if (before !== JSON.stringify([state.unifiedInventory, state.storageWarnings])
      && (!state.overlay || state.overlay.type === "inventory")) render();
  }).finally(() => { inventoryRecovery = null; });
  return inventoryRecovery;
}

function changeInventory(change, successMessage, onSuccess = null) {
  const failed = (error) => {
    state.storageWarnings.push(...consumeStorageWarnings());
    showNotice(ui(error instanceof InventoryStorageConflictError ? "inventoryStorageConflict"
      : error instanceof InventoryStorageUnavailableError ? "inventoryStorageReadFailed" : "inventoryStorageWriteFailed"));
    render();
  };
  try {
    const result = runInventoryStorageMutation(() => {
      change();
      refreshUnifiedInventory();
      onSuccess?.();
      showNotice(ui(successMessage));
      render();
    });
    return result?.catch ? result.catch(failed) : result;
  } catch (error) { return failed(error); }
}

function saveHeroMemoryDraftToInventory() {
  const dataset = state.heroMemoryRuntime.dataset;
  const draft = state.heroMemoryDraft;
  const memoryType = dataset?.memoryTypes?.[draft?.slotIndex];
  if (!dataset || !draft || !memoryType || draft.isRevivalExtraSlot) return;

  const diagnosis = diagnoseHeroMemoryInstance(draft.memory, dataset);
  if (!diagnosis.valid) {
    showNotice(ui("heroMemoryIncomplete"));
    render();
    return;
  }

  const label = safeHeroMemoryInventoryLabel(
    state.heroMemoryInventoryLabel,
    heroMemoryTypeName(memoryType),
  );
  const record = createHeroMemoryInventoryRecord({
    ...diagnosis.normalized,
    memoryTypeId: memoryType.flatCatalogId,
  }, label);
  return changeInventory(() => saveHeroMemoryInventoryRecord(record), "savedHeroMemoryToInventory", () => {
    state.heroMemoryInventoryLabel = "";
  });
}

function applyHeroMemoryInventoryRecord(record) {
  const dataset = state.heroMemoryRuntime.dataset;
  const normalized = normalizeHeroMemoryInstance(record?.memory, dataset);
  if (!dataset || !normalized) {
    showNotice(ui("heroMemoryInventoryUnavailable"));
    render();
    return;
  }

  const slotIndex = dataset.memoryTypes.findIndex(({ slotId }) => slotId === normalized.memoryTypeId);
  const memoryType = dataset.memoryTypes[slotIndex];
  const diagnosis = diagnoseHeroMemoryInstance(normalized, dataset);
  if (slotIndex < 0 || !memoryType || !diagnosis.valid) {
    showNotice(ui("heroMemoryInventoryUnavailable"));
    render();
    return;
  }

  const memories = Array.from(
    { length: 3 },
    (_, index) => state.build.hero?.memories?.[index] ?? null,
  );
  memories[slotIndex] = {
    ...diagnosis.normalized,
    instanceId: record.instanceId,
    memoryTypeId: memoryType.flatCatalogId,
  };
  const heroMemorySelections = trimEmptySlots(
    memories.map((memory) => memory?.memoryTypeId ?? null),
  );
  setBuild({
    ...state.build,
    hero: { ...(state.build.hero ?? {}), memories },
    selections: { ...state.build.selections, heroMemory: heroMemorySelections },
  }, ui("appliedHeroMemoryInventory"));
}

function removeHeroMemory(slotIndex) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 3) return;
  if (slotIndex === 3) {
    state.overlay = null;
    state.pendingSlot = null;
    state.heroMemoryDraft = null;
    setBuild({
      ...state.build,
      hero: { ...(state.build.hero ?? {}), revivalMemory: null },
    }, ui("heroMemoryRemoved"));
    return;
  }
  const memories = Array.from({ length: 3 }, (_, index) => state.build.hero?.memories?.[index] ?? null);
  memories[slotIndex] = null;
  const heroMemorySelections = trimEmptySlots(memories.map((memory) => memory?.memoryTypeId ?? null));
  const revivalMemory = reconcileHeroMemoryRevivalSlot(
    memories,
    state.build.hero?.revivalMemory,
    state.heroMemoryRuntime.dataset,
  );
  state.overlay = null;
  state.pendingSlot = null;
  state.heroMemoryDraft = null;
  setBuild({
    ...state.build,
    hero: { ...(state.build.hero ?? {}), memories, revivalMemory },
    selections: { ...state.build.selections, heroMemory: heroMemorySelections },
  }, ui("heroMemoryRemoved"));
}

function isEditableDivinityBoard(board) {
  return Boolean(
    board
      && typeof board.boardId === "string"
      && board.boardId
      && board.width === 6
      && board.height === 6
      && Array.isArray(board.mask)
      && board.mask.length === 6
      && board.mask.every((column) => Array.isArray(column) && column.length === 6)
      && Array.isArray(board.cells)
      && board.cells.every((cell) => (
        cell
          && Number.isInteger(cell.x)
          && Number.isInteger(cell.y)
          && typeof cell.slateInstanceId === "string"
      ))
      && Array.isArray(board.slateInventory),
  );
}

function currentDivinityBoard() {
  const divinity = state.build.divinity ?? { boards: [], activeBoardId: null };
  const active = divinity.boards?.find((board) => board?.boardId === divinity.activeBoardId);
  const stored = isEditableDivinityBoard(active)
    ? active
    : divinity.boards?.find(isEditableDivinityBoard);
  if (stored) return stored;
  if (!state.divinityEditorUi.draftBoard) {
    const boardIds = new Set((divinity.boards ?? []).map((board) => board?.boardId).filter(Boolean));
    let index = 1;
    while (boardIds.has(`divinity-board-${index}`)) index += 1;
    state.divinityEditorUi.draftBoard = createDivinityBoard({ boardId: `divinity-board-${index}` });
  }
  return state.divinityEditorUi.draftBoard;
}

function ensureDivinityRuntime() {
  if (state.divinityRuntime.status === "ready") return Promise.resolve(state.divinityRuntime);
  if (state.divinityRuntime.status === "loading" && divinityLoadPromise) return divinityLoadPromise;

  state.divinityRuntime = {
    status: "loading",
    divinityCatalog: null,
    hadesCatalog: null,
    sourceOnlyCatalog: null,
    sourceOnlySpecialSlateCatalog: null,
    metadata: null,
    error: "",
  };
  if (
    state.overlay?.type === "divinity"
      || (state.overlay?.type === "inventory" && state.inventoryTab === "divinitySlate")
  ) render();

  divinityLoadPromise = Promise.resolve(ACTIVE_DIVINITY_MODEL)
    .then((model) => {
      state.divinityRuntime = {
        status: "ready",
        divinityCatalog: model.selectionCatalog,
        hadesCatalog: model.hadesSelectionCatalog,
        sourceOnlyCatalog: model.sourceOnlyCatalog,
        sourceOnlySpecialSlateCatalog: model.sourceOnlySpecialSlateCatalog,
        metadata: model.metadata,
        error: "",
      };
      if (
        state.overlay?.type === "divinity"
          || (state.overlay?.type === "inventory" && state.inventoryTab === "divinitySlate")
      ) {
        render();
        if (state.overlay?.type === "divinity") focusOverlayEntry();
      }
      return state.divinityRuntime;
    })
    .catch((error) => {
      state.divinityRuntime = {
        status: "error",
        divinityCatalog: null,
        hadesCatalog: null,
        sourceOnlyCatalog: null,
        sourceOnlySpecialSlateCatalog: null,
        metadata: null,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (
        state.overlay?.type === "divinity"
          || (state.overlay?.type === "inventory" && state.inventoryTab === "divinitySlate")
      ) render();
      return null;
    });

  return divinityLoadPromise;
}

function persistDivinityBoard(board, previousBoardId, notice = "") {
  const divinity = state.build.divinity ?? { boards: [], activeBoardId: null };
  const boards = (divinity.boards ?? []).filter((candidate) => (
    candidate?.boardId !== previousBoardId && candidate?.boardId !== board.boardId
  ));
  state.divinityEditorUi = { ...state.divinityEditorUi, draftBoard: null };
  setBuild({
    ...state.build,
    divinity: {
      boards: [...boards, board],
      activeBoardId: board.boardId,
    },
  }, notice);
}

const DIVINITY_CLICK_ACTIONS = new Set([
  "divinity-template-add",
  "divinity-slate-delete",
  "divinity-slate-auto-place",
  "divinity-slate-rotate",
  "divinity-slate-flip-horizontal",
  "divinity-slate-flip-vertical",
  "divinity-slate-unplace",
  "divinity-board-reset",
  "divinity-json-export",
]);

const DIVINITY_CHANGE_ACTIONS = new Set([
  "divinity-god-set",
  "divinity-shape-set",
  "divinity-slot-set",
]);

const DIVINITY_SUBMIT_ACTIONS = new Set([
  "divinity-slate-move",
  "divinity-json-import",
]);

function applyDivinityEditorTarget(target, allowedActions) {
  const action = target?.dataset?.action;
  if (state.overlay?.type !== "divinity" || !allowedActions.has(action)) return false;
  const command = readDivinityEditorCommand(target);
  if (!command) return true;

  const board = currentDivinityBoard();
  const result = reduceDivinityEditorCommand({
    divinityCatalog: state.divinityRuntime.divinityCatalog ?? [],
    hadesCatalog: state.divinityRuntime.hadesCatalog ?? [],
  }, board, command);
  if (!result.ok) {
    state.divinityEditorUi = {
      ...state.divinityEditorUi,
      error: ui("divinityEditorApplyFailed"),
    };
    render();
    return true;
  }

  let selectedInstanceId = state.divinityEditorUi.selectedInstanceId;
  if (result.instanceId) selectedInstanceId = result.instanceId;
  else if (command.instanceId && command.type !== "divinity-slate-delete") {
    selectedInstanceId = command.instanceId;
  }
  if (
    command.type === "divinity-slate-delete"
      && selectedInstanceId === command.instanceId
  ) selectedInstanceId = null;
  if (["divinity-board-reset", "divinity-json-import"].includes(command.type)) {
    selectedInstanceId = null;
  }

  state.divinityEditorUi = {
    ...state.divinityEditorUi,
    selectedInstanceId,
    error: "",
    exportedJson: result.exportedJson ?? (
      command.type === "divinity-json-export" ? state.divinityEditorUi.exportedJson : ""
    ),
  };
  if (command.type === "divinity-json-export") {
    render();
    return true;
  }

  persistDivinityBoard(result.board, board.boardId);
  return true;
}

function selectDivinityEditorInstanceId(instanceId) {
  if (state.overlay?.type !== "divinity") return false;
  if (!instanceId || !currentDivinityBoard().slateInventory.some((instance) => instance.instanceId === instanceId)) {
    return false;
  }
  state.divinityEditorUi = { ...state.divinityEditorUi, selectedInstanceId: instanceId, error: "" };
  render();
  [...document.querySelectorAll('[data-role="divinity-board-cell"][data-instance-id]')]
    .find((cell) => cell.dataset.instanceId === instanceId)
    ?.focus({ preventScroll: true });
  return true;
}

function selectDivinityEditorInstance(target) {
  if (state.overlay?.type !== "divinity") return false;
  if (target?.closest?.("input, select, textarea, button, form, label")) return false;
  const instanceTarget = target?.closest?.(
    '[data-role="divinity-board-cell"][data-instance-id], [data-role="divinity-inventory-item"][data-instance-id]',
  );
  return selectDivinityEditorInstanceId(instanceTarget?.dataset?.instanceId);
}

function handleDivinityEditorKeydown(event) {
  if (state.overlay?.type !== "divinity" || event.altKey || event.ctrlKey || event.metaKey) return false;
  const tagName = String(event.target?.tagName ?? "").toLowerCase();
  if (event.target?.isContentEditable || ["input", "select", "textarea"].includes(tagName)) return false;

  const selectableCell = event.target?.closest?.(
    '[data-role="divinity-board-cell"][data-instance-id]',
  );
  if (selectableCell && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    return selectDivinityEditorInstanceId(selectableCell.dataset.instanceId);
  }

  const board = currentDivinityBoard();
  const instanceId = state.divinityEditorUi.selectedInstanceId;
  const instance = board.slateInventory.find((candidate) => candidate.instanceId === instanceId);
  if (!instance) return false;

  let target = null;
  const movement = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  }[event.key];
  if (movement && instance.anchor) {
    target = {
      dataset: {
        action: "divinity-slate-move",
        instanceId,
        x: String(instance.anchor.x + movement.x),
        y: String(instance.anchor.y + movement.y),
      },
    };
  } else if (event.key === "Delete") {
    target = { dataset: { action: "divinity-slate-delete", instanceId } };
  } else if (String(event.key).toLowerCase() === "r") {
    target = { dataset: { action: "divinity-slate-rotate", instanceId, turns: "1" } };
  }
  if (!target) return false;

  event.preventDefault();
  const actions = target.dataset.action === "divinity-slate-move"
    ? DIVINITY_SUBMIT_ACTIONS
    : DIVINITY_CLICK_ACTIONS;
  applyDivinityEditorTarget(target, actions);
  return true;
}

function currentPactEditorState(model = state.pactRuntime.model) {
  return normalizePactDestinyState(model, state.build.pact);
}

function pactSourceKey(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
    return `${url.hostname.toLowerCase()}:${slug.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  } catch {
    return String(sourceUrl ?? "").toLowerCase();
  }
}

function migrateLegacyPactState(model, input) {
  const spiritIds = new Set(model.spirits.map(({ id }) => id));
  const destinyIds = new Set(model.destinies.map(({ id }) => id));
  const spiritIdBySource = new Map(model.spirits.map((spirit) => [pactSourceKey(spirit.sourceUrl), spirit.id]));
  const destinyIdBySource = new Map(model.destinies.map((destiny) => [pactSourceKey(destiny.sourceUrl), destiny.id]));
  let changed = false;

  const migrateInstance = (instance, idField, currentIds, idBySource) => {
    const currentId = instance?.[idField];
    if (!instance || currentIds.has(currentId)) return instance ?? null;
    const sourceItem = findItemById(currentId);
    const sourceId = idBySource.get(pactSourceKey(sourceItem?.sourceUrl));
    if (!sourceId) return instance;
    changed = true;
    return { ...instance, [idField]: sourceId };
  };

  const migrateDestiny = (instance) => (
    migrateInstance(instance, "destinyId", destinyIds, destinyIdBySource)
  );
  const migrateUndetermined = (undetermined) => {
    if (!undetermined) return null;
    const migratedSlots = Array.isArray(undetermined.slots)
      ? undetermined.slots.map((slot) => {
        if (!slot || typeof slot !== "object") return slot;
        return {
          ...slot,
          ...(Object.hasOwn(slot, "installedDestiny")
            ? { installedDestiny: migrateDestiny(slot.installedDestiny) }
            : Object.hasOwn(slot, "destiny")
              ? { destiny: migrateDestiny(slot.destiny) }
              : {}),
        };
      })
      : undetermined.slots;
    return {
      ...undetermined,
      ...(Object.hasOwn(undetermined, "destiny")
        ? { destiny: migrateDestiny(undetermined.destiny) }
        : {}),
      ...(Object.hasOwn(undetermined, "slots") ? { slots: migratedSlots } : {}),
    };
  };
  const legacyUnassigned = input?.legacyUnassigned;
  const pact = {
    ...input,
    slots: (input?.slots ?? []).map((slot) => ({
      ...slot,
      spirit: migrateInstance(slot?.spirit, "spiritId", spiritIds, spiritIdBySource),
      rings: Object.fromEntries(Object.entries(slot?.rings ?? {}).map(([ringSlotId, ring]) => [
        ringSlotId,
        { ...ring, installedDestiny: migrateDestiny(ring?.installedDestiny) },
      ])),
      undeterminedFate: migrateUndetermined(slot?.undeterminedFate),
    })),
    ...(legacyUnassigned ? {
      legacyUnassigned: {
        smallSlots: (legacyUnassigned.smallSlots ?? []).map(migrateDestiny),
        mediumSlots: (legacyUnassigned.mediumSlots ?? []).map(migrateDestiny),
        undetermined: (legacyUnassigned.undetermined ?? []).map(migrateUndetermined),
      },
    } : {}),
  };
  return changed ? pact : input;
}

function ensurePactDestinyModel() {
  if (state.pactRuntime.status === "ready") {
    const diagnosis = diagnosePactDestinyState(state.pactRuntime.model, state.build.pact);
    if (diagnosis.issues.some(({ code }) => code === "pact-spirit-ring-slot-unavailable")) {
      state.pactRuntime = { status: "error", model: null, error: ui("pactStorageInvalid") };
      render();
      return Promise.resolve(null);
    }
    return Promise.resolve(state.pactRuntime.model);
  }
  if (state.pactRuntime.status === "loading" && pactLoadPromise) return pactLoadPromise;

  state.pactRuntime = { status: "loading", model: null, error: "" };
  if (state.overlay?.type === "pact") render();

  pactLoadPromise = Promise.all([
    loadRuntimeDataset("pactspirit_catalog"),
    loadRuntimeDataset("destiny_catalog"),
  ])
    .then(([pactDataset, destinyDataset]) => {
      const model = createActiveSs13PactDestinyModel(pactDataset, destinyDataset, {
        spirits: getCatalogItems("spirits"),
        destiny: getCatalogItems("destiny"),
      });
      const migratedPact = migrateLegacyPactState(model, state.build.pact);
      const pactDiagnosis = diagnosePactDestinyState(model, migratedPact);
      if (pactDiagnosis.issues.some(({ code }) => code === "pact-spirit-ring-slot-unavailable")) {
        throw new Error(ui("pactStorageInvalid"));
      }
      if (migratedPact !== state.build.pact) {
        state.build = persistSynchronizedBuild(
          normalizeBuild({ ...state.build, pact: migratedPact }),
          { pactModel: model },
        );
        markCalculationStale();
      }
      state.pactRuntime = { status: "ready", model, error: "" };
      const pactOverlayOpen = state.overlay?.type === "pact";
      if (pactOverlayOpen || !state.overlay) render();
      if (pactOverlayOpen) focusOverlayEntry();
      return model;
    })
    .catch((error) => {
      state.pactRuntime = {
        status: "error",
        model: null,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (state.overlay?.type === "pact") render();
      return null;
    });

  return pactLoadPromise;
}

function pactCapacityErrorMessage(result) {
  const slotLabel = result.slotType === "medium" ? "중위 숙명" : "하위 숙명";
  if (Number.isFinite(result.newCapacity)) {
    return `${slotLabel} 용량을 줄일 수 없습니다. 현재 사용 ${result.usage}개, 변경 후 용량 ${result.newCapacity}개입니다.`;
  }
  return `${slotLabel} 용량을 초과했습니다. 현재 사용 ${result.usage}개, 현재 용량 ${result.capacity}개입니다.`;
}

function persistPactEditorCommand(command, options = {}) {
  const model = state.pactRuntime.model;
  if (!model || !command) return null;
  const result = reducePactEditorCommandWithStatus(model, currentPactEditorState(model), command);
  if (result.status === "capacity-exceeded") {
    state.pactEditorUi = {
      ...state.pactEditorUi,
      error: pactCapacityErrorMessage(result),
    };
    render();
    return result;
  }
  if (result.status === "unchanged") {
    const legacyError = command.type === "pact-legacy-place"
      ? "이전 저장 항목을 배치하지 못했습니다. 정령, 빈 대상, 슬롯 종류와 용량을 확인하세요."
      : command.type === "pact-legacy-remove"
        ? "이전 저장 항목을 제거하지 못했습니다. 원래 배열 위치를 확인하세요."
        : "";
    state.pactEditorUi = {
      ...state.pactEditorUi,
      ...(options.closeUndeterminedDraft ? { undeterminedDraft: null } : {}),
      error: legacyError,
    };
    render();
    return result;
  }
  state.pactEditorUi = {
    ...state.pactEditorUi,
    ...(options.closeUndeterminedDraft ? { undeterminedDraft: null } : {}),
    error: "",
  };
  setBuild({ ...state.build, pact: result.state });
  return result;
}

const PACT_CLICK_ACTIONS = new Set([
  "pact-spirit-clear",
  "pact-ring-destiny-clear",
  "pact-undetermined-destiny-clear",
  "pact-undetermined-clear",
  "pact-legacy-remove",
]);

const PACT_CHANGE_ACTIONS = new Set([
  "pact-spirit-set",
  "pact-spirit-level",
  "pact-source-only-destiny-toggle",
  "pact-ring-destiny-set",
  "pact-undetermined-destiny-set",
  "pact-legacy-place",
]);

const PACT_ROLL_ACTIONS = new Set([
  "pact-ring-destiny-roll",
  "pact-undetermined-destiny-roll",
]);

function applyPactEditorTarget(target, allowedActions) {
  const action = target?.dataset?.action;
  if (state.overlay?.type !== "pact" || !allowedActions.has(action)) return false;
  persistPactEditorCommand(readPactEditorCommand(target));
  return true;
}

function applyPactSourceFilterTarget(target) {
  if (state.overlay?.type !== "pact" || target?.dataset?.action !== "pact-source-filter") {
    return false;
  }
  const sourceKind = target.dataset.sourceKind;
  const stateKey = sourceKind === "spirit"
    ? "spiritSearch"
    : sourceKind === "destiny" ? "destinySearch" : "";
  if (!stateKey) return false;
  state.pactEditorUi = {
    ...state.pactEditorUi,
    [stateKey]: String(target.value ?? ""),
  };
  return applyPactSourceNameFilter(target);
}

const PACT_UNDETERMINED_CONFIG_ACTIONS = new Set([
  "pact-undetermined-config-open",
  "pact-undetermined-config-adjust",
  "pact-undetermined-config-cancel",
  "pact-undetermined-config-confirm",
]);

function applyPactUndeterminedConfigTarget(target) {
  const action = target?.dataset?.action;
  if (state.overlay?.type !== "pact" || !PACT_UNDETERMINED_CONFIG_ACTIONS.has(action)) return false;

  const model = state.pactRuntime.model;
  if (!model) return true;

  if (action === "pact-undetermined-config-open") {
    state.pactEditorUi = {
      ...state.pactEditorUi,
      error: "",
      undeterminedDraft: createPactUndeterminedConfigDraft(
        model,
        currentPactEditorState(model),
        Number(target.dataset.spiritSlotIndex),
      ),
    };
    render();
    document.querySelector('[data-role="pact-undetermined-config-dialog"] button')?.focus();
    return true;
  }

  if (action === "pact-undetermined-config-adjust") {
    state.pactEditorUi = {
      ...state.pactEditorUi,
      error: "",
      undeterminedDraft: updatePactUndeterminedConfigDraft(
        state.pactEditorUi.undeterminedDraft,
        {
          slotType: target.dataset.slotType,
          delta: Number(target.dataset.delta),
        },
      ),
    };
    render();
    return true;
  }

  if (action === "pact-undetermined-config-cancel") {
    state.pactEditorUi = { ...state.pactEditorUi, undeterminedDraft: null, error: "" };
    render();
    return true;
  }

  const draft = state.pactEditorUi.undeterminedDraft;
  const layout = resolvePactUndeterminedConfigLayout(model, draft);
  if (!layout) return true;
  persistPactEditorCommand({
    type: "pact-undetermined-layout",
    spiritSlotIndex: draft.spiritSlotIndex,
    layoutId: layout.id,
  }, { closeUndeterminedDraft: true });
  return true;
}

function ensureTalentBoardModel() {
  if (state.talentRuntime.status === "ready") return Promise.resolve(state.talentRuntime.model);
  if (state.talentRuntime.status === "loading" && talentLoadPromise) return talentLoadPromise;

  state.talentRuntime = { status: "loading", model: null, error: "" };
  if (
    state.overlay?.type === "talentEditor"
      || (state.overlay?.type === "inventory" && state.inventoryTab === "prism")
  ) render();

  talentLoadPromise = loadRuntimeDataset("talent_catalog")
    .then((dataset) => {
      const model = createTalentBoardModel(dataset, { talentItems: getCatalogItems("talents") });
      const talents = reduceTalentEditorCommand(model, state.build.talents, null);
      state.build = persistSynchronizedBuild(normalizeBuild({ ...state.build, talents }));
      markCalculationStale();
      state.talentEditorUi = {
        ...state.talentEditorUi,
        prismDraft: synchronizeTalentPrismDraft(model, state.talentEditorUi.prismDraft),
        error: "",
      };
      state.talentRuntime = { status: "ready", model, error: "" };
      render();
      if (state.overlay?.type === "talentEditor") {
        focusOverlayEntry();
      }
      return model;
    })
    .catch((error) => {
      state.talentRuntime = {
        status: "error",
        model: null,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (
        state.overlay?.type === "talentEditor"
          || (state.overlay?.type === "inventory" && state.inventoryTab === "prism")
      ) render();
      return null;
    });

  return talentLoadPromise;
}

function applyTalentEditorCommand(command) {
  const model = state.talentRuntime.model;
  if (state.overlay?.type !== "talentEditor" || !model || !command) return false;

  if (command.type === "talent-board-activate") {
    state.talentEditorUi = { ...state.talentEditorUi, activeBoardIndex: command.boardIndex, error: "" };
    render();
    return true;
  }
  if (command.type === "talent-prism-draft-change") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      prismDraft: synchronizeTalentPrismDraft(model, command.draft),
      error: "",
    };
    render();
    return true;
  }
  if (command.type === "talent-prism-focus") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      selectedPrismInstanceId:
        state.talentEditorUi.selectedPrismInstanceId === command.instanceId ? null : command.instanceId,
      error: "",
    };
    render();
    return true;
  }
  if (command.type === "talent-inverse-focus") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      selectedInverseInstanceId:
        state.talentEditorUi.selectedInverseInstanceId === command.instanceId ? null : command.instanceId,
      error: "",
    };
    render();
    return true;
  }

  const result = reduceTalentEditorCommandWithStatus(model, state.build.talents, command);
  if (command.type === "talent-prism-move" && result.status !== "moved") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      error: ui("talentPrismMoveFailed"),
    };
    render();
    return true;
  }
  if (command.type === "talent-inverse-move" && result.status !== "moved") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      error: ui("talentInverseMoveFailed"),
    };
    render();
    return true;
  }
  const talents = result.state;
  const uiPatch = { error: "" };
  if (command.type === "talent-prism-create") {
    uiPatch.prismDraft = synchronizeTalentPrismDraft(model, {});
    uiPatch.selectedPrismInstanceId = talents.prismInventory[0]?.instanceId ?? null;
  }
  if (command.type === "talent-inverse-create") {
    uiPatch.inverseDraft = null;
    uiPatch.selectedInverseInstanceId = talents.inverseImageInventory[0]?.instanceId ?? null;
  }
  if (command.type === "talent-prism-place" || command.type === "talent-prism-move") {
    uiPatch.selectedPrismInstanceId = null;
  }
  if (command.type === "talent-inverse-place" || command.type === "talent-inverse-move") {
    uiPatch.selectedInverseInstanceId = null;
  }
  if (command.type === "talent-prism-delete" && state.talentEditorUi.selectedPrismInstanceId === command.instanceId) {
    uiPatch.selectedPrismInstanceId = null;
  }
  if (command.type === "talent-inverse-delete" && state.talentEditorUi.selectedInverseInstanceId === command.instanceId) {
    uiPatch.selectedInverseInstanceId = null;
  }
  if (command.type === "talent-board-reset-all") {
    uiPatch.activeBoardIndex = 0;
  }
  state.talentEditorUi = { ...state.talentEditorUi, ...uiPatch };
  setBuild({ ...state.build, talents });
  return true;
}

function applyTalentEditorTarget(target) {
  const action = target?.dataset?.action;
  if (state.overlay?.type !== "talentEditor" || typeof action !== "string" || !action.startsWith("talent-")) {
    return false;
  }
  const command = readTalentEditorCommand(target);
  if (!command) return false;
  return applyTalentEditorCommand(command);
}

function skillCompatibilitySelections(skills) {
  const slots = [...skills.active, ...skills.passive];
  return {
    skills: slots.map((slot) => slot.skillId),
    supports: slots.flatMap((slot) => slot.supports.map((support) => support?.supportId ?? null)),
  };
}

function skillRuntimeUpdateOptions() {
  return {
    build: state.build,
    heroIdentifier: state.build.hero?.branchId ?? state.build.selections?.hero?.[0] ?? "",
  };
}

function isSs13PreviewSkillRuntimeRecord(record) {
  return isSs13PreviewCatalogItem({ id: record?.flatItemId ?? record?.id });
}

function normalizeCurrentSkillRuntimeState(model, skills = state.build.skills) {
  return normalizeSkillState(
    excludeSs13PreviewSkillRuntimeModel(model),
    skills,
    skillRuntimeUpdateOptions(),
  );
}

function persistSkillRuntimeState(skills, notice = "") {
  const model = state.skillRuntime.model;
  if (!model) return;
  const normalized = normalizeCurrentSkillRuntimeState(model, skills);
  const compatibility = skillCompatibilitySelections(normalized);
  setBuild({
    ...state.build,
    skills: normalized,
    selections: {
      ...state.build.selections,
      skills: compatibility.skills,
      supports: compatibility.supports,
    },
  }, notice);
}

function synchronizeSkillRuntimeState(model) {
  const skills = normalizeCurrentSkillRuntimeState(model, state.build.skills ?? createDefaultSkillState());
  const compatibility = skillCompatibilitySelections(skills);
  state.build = persistSynchronizedBuild(normalizeBuildWithSkillRuntime({
    ...state.build,
    skills,
    selections: {
      ...state.build.selections,
      skills: compatibility.skills,
      supports: compatibility.supports,
    },
  }));
  markCalculationStale();
}

function ensureSkillRuntimeModel() {
  if (state.skillRuntime.status === "ready") return Promise.resolve(state.skillRuntime.model);
  if (state.skillRuntime.status === "loading" && skillRuntimeLoadPromise) return skillRuntimeLoadPromise;

  state.skillRuntime = { status: "loading", model: null, error: "" };
  if (state.overlay?.type === "skillEditor") render();

  skillRuntimeLoadPromise = Promise.all(SKILL_RUNTIME_DATASET_IDS.map((datasetId) => loadRuntimeDataset(datasetId)))
    .then(async (datasets) => {
      const runtimeDatasets = Object.fromEntries(
        SKILL_RUNTIME_DATASET_IDS.map((datasetId, index) => [datasetId, datasets[index]]),
      );
      const attachedElixir = await attachRuntimeDatasetLocaleRefs(
        "skill_elixir_catalog",
        runtimeDatasets.skill_elixir_catalog,
      );
      runtimeDatasets.skill_elixir_catalog = attachedElixir.dataset;
      state.runtimeLocaleRegistry = attachedElixir.registry;
      const model = createActiveSkillRuntimeModel(
        runtimeDatasets,
        { skills: getCatalogItems("skills"), supports: getCatalogItems("supports") },
      );
      state.skillRuntime = { status: "ready", model, error: "" };
      synchronizeSkillRuntimeState(model);
      if (state.overlay?.type === "skillEditor") {
        render();
        focusOverlayEntry();
      }
      return model;
    })
    .catch((error) => {
      state.skillRuntime = {
        status: "error",
        model: null,
        error: error instanceof Error ? error.message : String(error ?? ""),
      };
      if (state.overlay?.type === "skillEditor") render();
      return null;
    });

  return skillRuntimeLoadPromise;
}

function openSkillRuntimePicker(kind, rowIndex, supportIndex = null) {
  const model = state.skillRuntime.model;
  const skills = model ? normalizeCurrentSkillRuntimeState(model) : null;
  const collection = kind === "passive" ? "passive" : "active";
  const slot = skills?.[collection]?.[rowIndex];
  const equippedItemId = supportIndex === null
    ? slot?.skillId ?? null
    : slot?.supports?.[supportIndex]?.supportId ?? null;
  state.skillPicker = {
    kind,
    rowIndex,
    supportIndex,
    query: "",
    tags: [],
    expandedItemId: equippedItemId,
    catalogOpen: !equippedItemId,
    detailItemIds: [],
  };
  render();
  restoreInputFocus("skillRuntimeSearch");
  document.querySelector('.skill-runtime-row[data-picker-active="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function openSkillSummaryPicker(kind, rowIndex, supportIndex = null) {
  openOverlay("skillEditor");
  void ensureSkillRuntimeModel().then((model) => {
    if (!model || state.overlay?.type !== "skillEditor") return;
    openSkillRuntimePicker(kind, rowIndex, supportIndex);
  });
}

function selectSkillRuntimeMain(kind, rowIndex, skillId) {
  const model = state.skillRuntime.model;
  if (!model) return;
  const skills = updateMainSkill(
    model,
    state.build.skills,
    kind,
    rowIndex,
    skillId,
    skillRuntimeUpdateOptions(),
  );
  clearSkillRuntimeDrafts();
  state.skillPicker = null;
  persistSkillRuntimeState(skills);
}

function skillRuntimePickerEquippedId(skills, picker) {
  const collection = picker.kind === "passive" ? "passive" : "active";
  const slot = skills[collection]?.[picker.rowIndex];
  return picker.supportIndex === null
    ? slot?.skillId ?? null
    : slot?.supports?.[picker.supportIndex]?.supportId ?? null;
}

function skillRuntimeDraftKey(picker, itemId) {
  return `${picker.kind}:${picker.rowIndex}:${picker.supportIndex ?? "main"}:${itemId}`;
}

function skillRuntimePickerDraft(picker, itemId) {
  return state.skillDrafts[skillRuntimeDraftKey(picker, itemId)] ?? null;
}

function updateSkillRuntimePickerDraft(picker, itemId, updates) {
  const key = skillRuntimeDraftKey(picker, itemId);
  state.skillDrafts = {
    ...state.skillDrafts,
    [key]: { ...(state.skillDrafts[key] ?? {}), ...updates },
  };
}

function clearSkillRuntimeDrafts() {
  state.skillDrafts = {};
}

function skillRuntimePickerItemLevel(skills, picker, itemId) {
  const collection = picker.kind === "passive" ? "passive" : "active";
  const slot = skills[collection]?.[picker.rowIndex];
  if (picker.supportIndex === null && slot?.skillId === itemId) return slot.level;
  const support = slot?.supports?.[picker.supportIndex];
  if (support?.supportId === itemId) return support.level;
  return skillRuntimePickerDraft(picker, itemId)?.level ?? SKILL_DEFAULT_LEVEL;
}

function skillRuntimePickerItemConfig(skills, picker, support) {
  if (!support || picker.supportIndex === null) return undefined;
  const collection = picker.kind === "passive" ? "passive" : "active";
  const slot = skills[collection]?.[picker.rowIndex]?.supports?.[picker.supportIndex];
  if (slot?.supportId === support.id) {
    return normalizeSupportRuntimeConfig(slot.config, support)
      ?? createDefaultSupportRuntimeConfig(support);
  }
  return normalizeSupportRuntimeConfig(skillRuntimePickerDraft(picker, support.id)?.config, support)
    ?? createDefaultSupportRuntimeConfig(support);
}

function setSkillRuntimePickerConfig(itemId, config) {
  const picker = state.skillPicker;
  const model = state.skillRuntime.model;
  if (!picker || !model || picker.supportIndex === null) return;
  const support = findSupportRuntimeRecord(model, itemId);
  if (!support) return;
  const normalized = normalizeSupportRuntimeConfig(config, support);
  const skills = normalizeCurrentSkillRuntimeState(model);
  if (skillRuntimePickerEquippedId(skills, picker) === itemId) {
    persistSkillRuntimeState(updateSkillSupportConfig(
      model,
      skills,
      picker.kind,
      picker.rowIndex,
      picker.supportIndex,
      normalized,
      skillRuntimeUpdateOptions(),
    ));
    return;
  }
  updateSkillRuntimePickerDraft(picker, itemId, { config: normalized });
  render();
}

function transformSkillRuntimePickerConfig(itemId, transform) {
  const picker = state.skillPicker;
  const model = state.skillRuntime.model;
  if (!picker || !model || picker.supportIndex === null) return;
  const support = findSupportRuntimeRecord(model, itemId);
  if (!support) return;
  const skills = normalizeCurrentSkillRuntimeState(model);
  const current = skillRuntimePickerItemConfig(skills, picker, support);
  setSkillRuntimePickerConfig(itemId, transform(support, current));
}

function clampSkillRuntimeLevel(value) {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(1, Math.min(SKILL_MAX_LEVEL, number)) : SKILL_DEFAULT_LEVEL;
}

function setSkillRuntimePickerLevel(itemId, level) {
  const picker = state.skillPicker;
  const model = state.skillRuntime.model;
  if (!picker || !model || picker.expandedItemId !== itemId) return;
  const skills = normalizeCurrentSkillRuntimeState(model);
  const normalizedLevel = clampSkillRuntimeLevel(level);
  if (skillRuntimePickerEquippedId(skills, picker) === itemId) {
    const next = picker.supportIndex === null
      ? updateMainSkillLevel(
          model,
          skills,
          picker.kind,
          picker.rowIndex,
          normalizedLevel,
          skillRuntimeUpdateOptions(),
        )
      : updateSkillSupportLevel(
          model,
          skills,
          picker.kind,
          picker.rowIndex,
          picker.supportIndex,
          normalizedLevel,
          skillRuntimeUpdateOptions(),
        );
    persistSkillRuntimeState(next);
    return;
  }
  updateSkillRuntimePickerDraft(picker, itemId, { level: normalizedLevel });
  render();
}

function confirmSkillRuntimePickerItem(itemId) {
  const picker = state.skillPicker;
  const model = state.skillRuntime.model;
  if (!picker || !model || picker.expandedItemId !== itemId) return;
  const skills = normalizeCurrentSkillRuntimeState(model);
  const level = clampSkillRuntimeLevel(skillRuntimePickerItemLevel(skills, picker, itemId));
  if (picker.supportIndex === null) {
    let next = updateMainSkill(
      model,
      state.build.skills,
      picker.kind,
      picker.rowIndex,
      itemId,
      skillRuntimeUpdateOptions(),
    );
    next = updateMainSkillLevel(
      model,
      next,
      picker.kind,
      picker.rowIndex,
      level,
      skillRuntimeUpdateOptions(),
    );
    clearSkillRuntimeDrafts();
    persistSkillRuntimeState(next);
    return;
  }
  const result = updateSkillSupport(
    model,
    state.build.skills,
    picker.kind,
    picker.rowIndex,
    picker.supportIndex,
    itemId,
    skillRuntimePickerItemConfig(skills, picker, findSupportRuntimeRecord(model, itemId)),
    skillRuntimeUpdateOptions(),
  );
  if (result.status !== "updated") {
    if (result.status === "energy-limit") showNotice(ui("skillEnergyLimit"));
    else if (result.status === "locked") showNotice(ui("skillSupportLocked"));
    else showNotice(ui("skillSupportIncompatible"));
    render();
    return;
  }
  clearSkillRuntimeDrafts();
  persistSkillRuntimeState(updateSkillSupportLevel(
    model,
    result.state,
    picker.kind,
    picker.rowIndex,
    picker.supportIndex,
    level,
    skillRuntimeUpdateOptions(),
  ));
}

function selectSkillRuntimeSupport(kind, rowIndex, supportIndex, supportId) {
  const model = state.skillRuntime.model;
  if (!model) return;
  const result = updateSkillSupport(
    model,
    state.build.skills,
    kind,
    rowIndex,
    supportIndex,
    supportId,
    undefined,
    skillRuntimeUpdateOptions(),
  );
  if (result.status === "energy-limit") {
    showNotice(ui("skillEnergyLimit"));
    render();
    return;
  }
  if (result.status === "incompatible") {
    showNotice(ui("skillSupportIncompatible"));
    render();
    return;
  }
  if (result.status === "locked") {
    showNotice(ui("skillSupportLocked"));
    render();
    return;
  }
  clearSkillRuntimeDrafts();
  state.skillPicker = null;
  persistSkillRuntimeState(result.state);
}

function updateSkillRuntimeElixir(elixirIndex, updates) {
  const model = state.skillRuntime.model;
  if (!model || !Number.isInteger(elixirIndex)) return;
  const skills = normalizeCurrentSkillRuntimeState(model);
  const bottle = model.elixir.bottles[elixirIndex];
  if (!bottle) return;
  const current = skills.elixirs[elixirIndex] ?? {
    bottleId: bottle.id,
    skillId: null,
    ingredientIds: [],
  };
  const next = { ...current, ...updates, bottleId: bottle.id };
  skills.elixirs[elixirIndex] = next.skillId || next.ingredientIds?.some(Boolean) ? next : null;
  persistSkillRuntimeState(skills);
}

function updateSkillRuntimeElixirIngredient(elixirIndex, ingredientIndex, ingredientId) {
  const model = state.skillRuntime.model;
  if (!model) return;
  const skills = normalizeCurrentSkillRuntimeState(model);
  const bottle = model.elixir.bottles[elixirIndex];
  if (!bottle) return;
  const current = skills.elixirs[elixirIndex] ?? { bottleId: bottle.id, skillId: null, ingredientIds: [] };
  const ingredientIds = Array.from(
    { length: bottle.baseIngredientCapacity },
    (_, index) => current.ingredientIds?.[index] ?? null,
  );
  ingredientIds[ingredientIndex] = ingredientId || null;
  updateSkillRuntimeElixir(elixirIndex, { ...current, ingredientIds: ingredientIds.filter(Boolean) });
}

function restoreInputFocus(inputId, selectionStart, selectionEnd, selectionDirection) {
  const search = document.querySelector(`#${inputId}`);
  if (search) {
    search.focus();
    const valueLength = search.value.length;
    const start = Number.isInteger(selectionStart)
      ? Math.min(selectionStart, valueLength)
      : valueLength;
    const end = Number.isInteger(selectionEnd)
      ? Math.min(Math.max(selectionEnd, start), valueLength)
      : start;
    search.setSelectionRange(start, end, selectionDirection ?? "none");
  }
}

function focusStatTraceButton(statKey) {
  const button = [...document.querySelectorAll('[data-action="stat-trace"]')]
    .find((candidate) => candidate.dataset.statKey === statKey);
  if (!button) return;
  button.focus({ preventScroll: true });
  document.getElementById(`trace-${statKey}`)?.scrollIntoView({ block: "nearest" });
}

function focusOverlayEntry() {
  if (pendingCustomAffixFocus) return;
  if (state.overlay?.type === "saveAs") {
    const nameInput = document.querySelector("#saveAsName");
    if (nameInput) { nameInput.focus(); nameInput.select?.(); return; }
  }
  if (state.overlay?.type === "hero" && state.overlay.mode === "edit") {
    const stage = document.querySelector('[data-action="hero-stage-activate"][aria-pressed="true"]');
    if (stage) { stage.focus(); return; }
  }
  if (state.overlay?.type === "pact") {
    const slotIndex = state.pactEditorUi.activeSlotIndex;
    const ringSlotId = state.pactEditorUi.ringSlotId;
    const target = document.querySelector(ringSlotId === "undetermined"
      ? `[data-pact-slot-panel="${slotIndex}"] [data-action="pact-undetermined-config-open"]`
      : ringSlotId ? `[data-pact-slot-panel="${slotIndex}"] [data-ring-slot="${ringSlotId}"] select`
      : `[data-action="pact-slot-activate"][data-slot-index="${slotIndex}"]`);
    if (target) {
      target.focus();
      target.scrollIntoView?.({ block: "nearest" });
      return;
    }
  }
  const search = document.querySelector("#searchInput");
  if (search) {
    restoreInputFocus("searchInput");
    return;
  }

  document.querySelector('[role="dialog"] button, [role="dialog"] input, [role="dialog"] select')?.focus();
}

const OVERLAY_OPENER_DATASET_KEYS = Object.freeze([
  "action",
  "overlay",
  "category",
  "slotIndex",
  "ringSlotId",
  "stageLevel",
  "mode",
]);

function rememberOverlayOpener(element) {
  if (!element) return;
  overlayOpenerToken = {
    id: typeof element.id === "string" ? element.id : "",
    dataset: Object.fromEntries(OVERLAY_OPENER_DATASET_KEYS
      .filter((key) => element.dataset?.[key] !== undefined)
      .map((key) => [key, element.dataset[key]])),
  };
}

function restoreOverlayOpenerFocus() {
  const token = overlayOpenerToken;
  overlayOpenerToken = null;
  if (!token) return;
  const byId = token.id ? document.getElementById(token.id) : null;
  const target = byId ?? [...document.querySelectorAll("[data-action]")].find((candidate) => (
    Object.entries(token.dataset).every(([key, value]) => candidate.dataset?.[key] === value)
  ));
  const fileMenu = target?.closest?.(".build-file-menu");
  (fileMenu?.querySelector("summary") ?? target)?.focus({ preventScroll: true });
}

function trapOverlayFocus(event) {
  if (event.key !== "Tab" || !state.overlay) return false;
  const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
  if (!dialog) return false;
  const focusable = [...dialog.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden && (!element.getClientRects || element.getClientRects().length > 0));
  if (!focusable.length) {
    event.preventDefault();
    return true;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

function handleHeroSelectorScrollKey(event) {
  if (
    state.overlay?.type !== "hero"
    || state.overlay?.mode === "edit"
    || event.altKey
    || event.ctrlKey
    || event.metaKey
  ) return false;

  const direction = event.key === "PageDown" ? 1 : event.key === "PageUp" ? -1 : 0;
  if (!direction) return false;
  if (!scrollSelectorPage(document.querySelector(".hero-selector-layout"), direction)) return false;

  event.preventDefault();
  return true;
}

function returnOverlayForNestedSelection() {
  if (!state.overlay?.returnToOverlay) return false;
  state.overlay = { type: state.overlay.returnToOverlay };
  state.pendingSlot = null;
  state.query = "";
  return true;
}

function closeOverlay() {
  if (state.overlay?.type === "saveAs") state.saveAsName = "";
  if (state.overlay?.type === "heroMemory") {
    state.heroMemoryDraft = null;
    state.heroMemoryInventoryLabel = "";
  }
  if (state.overlay?.type === "talentEditor") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      screenshotMatchItemId: null,
      screenshotMatchLabel: "",
    };
  }
  if (state.overlay?.type === "pact") {
    state.pactEditorUi = {
      ...state.pactEditorUi,
      undeterminedDraft: null,
      error: "",
      spiritSearch: "",
      destinySearch: "",
    };
  }
  if (state.overlay?.type === "skillEditor") {
    state.skillPicker = null;
    clearSkillRuntimeDrafts();
  }
  const returnedToParent = returnOverlayForNestedSelection();
  if (!returnedToParent) {
    state.overlay = null;
    state.pendingSlot = null;
    state.query = "";
  }
  render();
  if (returnedToParent) focusOverlayEntry();
  else restoreOverlayOpenerFocus();
}

function requestBuildReplacement(command, data = {}) {
  state.overlay = { type: "confirmReplace", command, ...data };
  state.pendingSlot = null;
  render();
  focusOverlayEntry();
}

function shouldCloseOverlayAfterToggle(item, removing) {
  if (removing) return false;
  if (item.categoryId === "gear") return false;
  if (state.pendingSlot?.categoryId === item.categoryId) return true;
  return getCategory(item.categoryId)?.maxSelections === 1 && state.overlay?.type === item.categoryId;
}

function toggleItem(itemId) {
  const item = findItemById(itemId);
  if (!item) return;
  if (isSs13PreviewCatalogItem(item) && item.categoryId !== "hero") return;
  if (!isItemCompatibleWithCurrentSlot(item)) return;
  if (isGearReadOnlyItem(item) && !isSelectedForCurrentSlot(itemId)) {
    showNotice(gearReadOnlyCopy("selectionBlocked"));
    render();
    focusOverlayEntry();
    return;
  }
  if (item.categoryId === "hero") {
    if (isSelected(itemId)) resetSelectedHero();
    else selectHeroBranch(itemId);
    return;
  }
  const displayItem = itemText(item);
  const category = getCategory(item.categoryId);
  const current = getSelectionIds(item.categoryId);
  const target = state.pendingSlot?.categoryId === item.categoryId ? state.pendingSlot : null;
  const currentSlots = getSlotItemIds(item.categoryId);
  const removing = target ? currentSlots[target.index] === itemId : current.includes(itemId);
  let nextIds;

  if (target) {
    nextIds = Array.from({ length: category.maxSelections }, (_, index) => currentSlots[index] ?? null);
    if (item.categoryId !== "gear") {
      const duplicateIndex = nextIds.indexOf(itemId);
      if (duplicateIndex >= 0) nextIds[duplicateIndex] = null;
    }
    nextIds[target.index] = removing ? null : itemId;
    nextIds = trimEmptySlots(nextIds);
  } else {
    const selection = updateSelection(current, itemId, category.maxSelections);
    if (selection.status === "limit") {
      showNotice(ui("selectionLimitReached", { count: category.maxSelections }));
      render();
      focusOverlayEntry();
      return;
    }
    nextIds = selection.ids;
  }

  const nextBuild = {
    ...state.build,
    selections: {
      ...state.build.selections,
      [item.categoryId]: nextIds,
    },
  };

  state.detailItemId = itemId;
  if (shouldCloseOverlayAfterToggle(item, removing)) {
    if (!returnOverlayForNestedSelection()) {
      state.overlay = null;
      state.pendingSlot = null;
      state.query = "";
    }
  }
  setBuild(nextBuild, removing ? `${displayItem.name} ${ui("removedSuffix")}` : `${displayItem.name} ${ui("addedSuffix")}`);
  if (state.overlay) focusOverlayEntry();
}

function removeSlot(categoryId, slotIndex) {
  const category = getCategory(categoryId);
  const currentSlots = getSlotItemIds(categoryId);
  const item = findItemById(currentSlots[slotIndex]);
  if (!category || !item || !Number.isInteger(slotIndex)) return;

  const nextIds = Array.from({ length: category.maxSelections }, (_, index) => currentSlots[index] ?? null);
  nextIds[slotIndex] = null;
  state.pendingSlot = null;
  setBuild(
    {
      ...state.build,
      selections: {
        ...state.build.selections,
        [categoryId]: trimEmptySlots(nextIds),
      },
    },
    `${itemText(item).name} ${ui("removedSuffix")}`,
  );
}

function getVisibleItems(categoryId = state.activeCategoryId) {
  const catalogItems = categoryId === "gear"
    ? getGearItemsForFilter(state.gearFilter || "all")
    : getCatalogItems(categoryId);
  const items = catalogItems.filter((item) => !isSs13PreviewCatalogItem(item));
  const query = state.query.trim().toLowerCase();

  const matchedItems = items.filter((item) => {
    const displayItem = itemText(item);
    const haystack = [
      item.id,
      item.name,
      item.type,
      item.slot,
      item.rarity,
      item.summary,
      displayItem.name,
      displayItem.type,
      displayItem.slot,
      displayItem.rarity,
      displayItem.summary,
      ...(item.tags ?? []),
      ...(displayItem.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter =
      state.filter === ALL_FILTER ||
      item.tags?.includes(state.filter) ||
      item.type === state.filter ||
      item.talentPosition?.treeSlug === state.filter ||
      item.talentTree?.slug === state.filter;
    return matchesQuery && matchesFilter;
  });

  return paginateItems(matchedItems, state.catalogLimit);
}

function renderCatalogRows(page, category, emptyKey = "noCatalogData") {
  if (!page.items.length) return `<p class="empty editor-empty">${ui(emptyKey)}</p>`;

  const rows = page.items.map((item) => renderItemLine(item, category)).join("");
  if (!page.hasMore) return rows;

  return `
    ${rows}
    <div class="catalog-results-footer">
      <span>${ui("catalogShowing", { visible: page.items.length, total: page.total })}</span>
      <button data-action="show-more">${ui("showMore")}</button>
    </div>
  `;
}

function getFilters(categoryId) {
  const values = new Set([ALL_FILTER]);
  const items = categoryId === "gear"
    ? getGearItemsForFilter("all")
    : getCatalogItems(categoryId);
  items.filter((item) => !isSs13PreviewCatalogItem(item)).forEach((item) => {
    if (item.type) values.add(item.type);
    item.tags?.forEach((tag) => values.add(tag));
  });
  return [...values];
}

function getSelectedItemsFor(categoryId) {
  return getSlotItemIds(categoryId).map((itemId) => (itemId ? findItemById(itemId) : undefined));
}

function getSelectedItem(categoryId, index = 0) {
  return getSelectedItemsFor(categoryId)[index] ?? getSelectionIds(categoryId).map(findItemById).filter(Boolean)[index];
}

function getSelectedName(categoryId, index = 0) {
  const item = getSelectedItem(categoryId, index);
  return item ? itemText(item).name : "";
}

function isGearReadOnlyItem(item) {
  return item?.craftRuntimeSupport === "display-only"
    && item?.structureSupported === false
    && item?.selectionSupported === false
    && item?.calculationSupported === false;
}

function isGearSelectionOnlyItem(item) {
  return item?.craftRuntimeSupport === "verified-current-tlidb-selection-only"
    && item?.structureSupported === true
    && item?.selectionSupported === true
    && item?.calculationSupported === false;
}

function gearReadOnlyCopy(kind, selected = false) {
  const copy = {
    badge: ["정보 전용", "Information only"],
    summary: ["정보 전용 · 계산 미포함", "Information only · excluded from calculation"],
    selectionBlocked: ["구조가 검증되지 않아 새로 장착할 수 없습니다.", "Unverified structure cannot be newly equipped."],
    detail: selected
      ? ["구조 미검증 · 정보 전용 · 기존 저장 선택 유지 · 계산에 포함되지 않음", "Structure unverified · information only · saved selection preserved · excluded from calculation"]
      : ["구조 미검증 · 정보 전용 · 새로 장착할 수 없음 · 계산에 포함되지 않음", "Structure unverified · information only · cannot be newly equipped · excluded from calculation"],
  };
  return copy[kind]?.[state.locale === "ko" ? 0 : 1] ?? "";
}

function gearSelectionOnlyCopy(kind) {
  const copy = {
    badge: ["효과 일부 미지원", "Some effects unsupported"],
    summary: ["장착됨 · 일부 정확 수치만 계산", "Equipped · only exact values calculated"],
    detail: [
      "장착 가능 · 효과 편집 및 전체 계산 미지원 · TLIDB에서 정확히 확인된 고정 수치만 계산",
      "Can be equipped · effect editing and complete calculation unsupported · only fixed values verified by TLIDB are calculated",
    ],
  };
  return copy[kind]?.[state.locale === "ko" ? 0 : 1] ?? "";
}

function renderGearSourceCoverage(item) {
  const coverage = item?.craftRuntimeCoverage;
  if (isGearReadOnlyItem(item) || !coverage?.source || !coverage?.verified || !coverage?.omitted) {
    return "";
  }
  const params = {
    affixesVerified: coverage.verified.affixes,
    affixesSource: coverage.source.affixes,
    tiersVerified: coverage.verified.tiers,
    tiersSource: coverage.source.tiers,
    rollsVerified: coverage.verified.rolls,
    rollsSource: coverage.source.rolls,
    legendaryVerified: coverage.verified.legendaryVariants,
    legendarySource: coverage.source.legendaryVariants,
  };
  const hasOmittedCraftRows = Object.values(coverage.omitted)
    .some((count) => Number(count) > 0);

  return `
    <section class="gear-source-coverage" data-role="gear-source-coverage" aria-label="${escapeHtml(ui("gearSourceCoverageTitle"))}">
      <strong>${escapeHtml(ui("gearSourceCoverageTitle"))}</strong>
      <p>${escapeHtml(ui("gearSourceCoverageCounts", params))}</p>
      <small>${escapeHtml(ui(hasOmittedCraftRows ? "gearSourceCoverageExcluded" : "gearSourceCoverageComplete"))}</small>
    </section>
  `;
}

function getGearSlotIndex(itemId, build = state.build) {
  const pendingIndex = state.pendingSlot?.categoryId === "gear" ? Number(state.pendingSlot.index) : -1;
  if (Number.isInteger(pendingIndex) && build.selections?.gear?.[pendingIndex] === itemId) {
    return pendingIndex;
  }
  const selectedIndex = build.selections?.gear?.indexOf(itemId) ?? -1;
  if (selectedIndex >= 0) return selectedIndex;
  return state.pendingSlot?.categoryId === "gear" ? state.pendingSlot.index : inferGearSlotIndex(itemId);
}

function getRuntimeSkillDetailPlacement(itemId) {
  const model = state.skillRuntime.status === "ready" && state.skillRuntime.model
    ? excludeSs13PreviewSkillRuntimeModel(state.skillRuntime.model)
    : null;
  if (!model) return { status: "loading" };

  const activeRecord = model.active.find((record) => (
    record.id === itemId || record.flatItemId === itemId
  ));
  const passiveRecord = model.passive.find((record) => (
    record.id === itemId || record.flatItemId === itemId
  ));
  const record = activeRecord ?? passiveRecord;
  if (!record) return { status: "information-only" };

  const kind = activeRecord ? "active" : "passive";
  const skills = normalizeCurrentSkillRuntimeState(model);
  const equippedIndex = skills[kind].findIndex((slot) => slot.skillId === record.id);
  if (equippedIndex >= 0) {
    return { status: "equipped", kind, rowIndex: equippedIndex, record };
  }

  const pendingIndex = state.pendingSlot?.categoryId === "skills"
    ? Number(state.pendingSlot.index)
    : -1;
  const pendingKind = pendingIndex >= 5 ? "passive" : "active";
  const pendingRowIndex = pendingKind === "passive" ? pendingIndex - 5 : pendingIndex;
  if (
    pendingIndex >= 0
    && pendingKind === kind
    && Number.isInteger(pendingRowIndex)
    && skills[kind]?.[pendingRowIndex]
  ) {
    return { status: "available", kind, rowIndex: pendingRowIndex, record };
  }

  const emptyIndex = skills[kind].findIndex((slot) => !slot.skillId);
  return emptyIndex >= 0
    ? { status: "available", kind, rowIndex: emptyIndex, record }
    : { status: "full", kind, record };
}

function toggleRuntimeSkillFromDetail(itemId) {
  const item = findItemById(itemId);
  const model = state.skillRuntime.model;
  if (!item || !model) return;

  const placement = getRuntimeSkillDetailPlacement(itemId);
  if (placement.status === "full") {
    showNotice(ui("skillNoEmptySlot"));
    render();
    return;
  }
  if (placement.status !== "available" && placement.status !== "equipped") return;

  const removing = placement.status === "equipped";
  const skills = updateMainSkill(
    excludeSs13PreviewSkillRuntimeModel(model),
    state.build.skills,
    placement.kind,
    placement.rowIndex,
    removing ? null : placement.record.id,
    skillRuntimeUpdateOptions(),
  );
  persistSkillRuntimeState(
    skills,
    `${itemText(item).name} ${ui(removing ? "removedSuffix" : "addedSuffix")}`,
  );
}

function getMissingGearInstanceValue(build, itemId, compatibilityField, fallback) {
  const matchingInstanceCount = (build.gear?.slots ?? [])
    .filter((candidate) => candidate?.itemId === itemId).length;
  return matchingInstanceCount <= 1
    ? build[compatibilityField]?.[itemId] ?? fallback
    : fallback;
}

function getGearInstanceValue(itemId, slotField, compatibilityField, fallback, build = state.build) {
  const slotIndex = getGearSlotIndex(itemId, build);
  const slot = build.gear?.slots?.[slotIndex];
  if (slot?.itemId === itemId) {
    return Object.hasOwn(slot, slotField)
      ? slot[slotField]
      : getMissingGearInstanceValue(build, itemId, compatibilityField, fallback);
  }
  return build[compatibilityField]?.[itemId] ?? fallback;
}

function updateGearInstanceValue(build, itemId, slotField, compatibilityField, fallback, transform) {
  const slotIndex = getGearSlotIndex(itemId, build);
  const slot = build.gear?.slots?.[slotIndex];
  const current = slot?.itemId === itemId
    ? (Object.hasOwn(slot, slotField)
      ? slot[slotField]
      : getMissingGearInstanceValue(build, itemId, compatibilityField, fallback))
    : build[compatibilityField]?.[itemId] ?? fallback;
  const nextValue = transform(current);
  if (slot?.itemId !== itemId) {
    return {
      ...build,
      [compatibilityField]: {
        ...(build[compatibilityField] ?? {}),
        [itemId]: nextValue,
      },
    };
  }

  const slots = [...(build.gear?.slots ?? [])];
  slots[slotIndex] = { ...slot, [slotField]: nextValue };
  let projectedValue = nextValue;
  for (const candidate of slots) {
    if (candidate?.itemId === itemId && Object.hasOwn(candidate, slotField)) {
      projectedValue = candidate[slotField];
    }
  }
  return {
    ...build,
    gear: { ...build.gear, slots },
    [compatibilityField]: {
      ...(build[compatibilityField] ?? {}),
      [itemId]: projectedValue,
    },
  };
}

function getDetailItem(categoryId, items) {
  const focused = state.detailItemId ? findItemById(state.detailItemId) : undefined;
  if (focused?.categoryId === categoryId && items.some((item) => item.id === focused.id)) return focused;
  if (categoryId !== "gear") return getSelectedItem(categoryId) ?? items[0];
  const selected = getSelectedItem(categoryId);
  return selected && items.some((item) => item.id === selected.id) ? selected : items[0];
}

function previewItemForCurrentSlot(item) {
  const target = state.pendingSlot?.categoryId === item.categoryId ? state.pendingSlot : null;
  if (!target) return previewItem(state.build, item.id);

  const category = getCategory(item.categoryId);
  const currentSlots = getSlotItemIds(item.categoryId);
  const nextIds = Array.from({ length: category.maxSelections }, (_, index) => currentSlots[index] ?? null);
  if (item.categoryId !== "gear") {
    const duplicateIndex = nextIds.indexOf(item.id);
    if (duplicateIndex >= 0) nextIds[duplicateIndex] = null;
  }
  nextIds[target.index] = currentSlots[target.index] === item.id ? null : item.id;

  const beforeCalculation = calculateBuild(state.build);
  const nextBuild = {
    ...state.build,
    selections: {
      ...state.build.selections,
      [item.categoryId]: trimEmptySlots(nextIds),
    },
  };
  const afterCalculation = calculateBuild(nextBuild);
  const alreadySelected = currentSlots[target.index] === item.id;
  const support = getItemPreviewCalculationSupport(
    alreadySelected ? beforeCalculation : afterCalculation,
    item.id,
  );
  const before = beforeCalculation.summary;
  const after = afterCalculation.summary;

  return {
    item,
    alreadySelected,
    calculationSupported: support.supported,
    unsupportedReasons: support.reasons,
    delta: Object.fromEntries(STAT_ROWS.map(([, statKey]) => [statKey, after[statKey] - before[statKey]])),
  };
}

function getGearRollValue(item, roll) {
  const rolls = getGearInstanceValue(item.id, "rolls", "gearRolls", {});
  return Number(rolls?.[roll.id] ?? roll.defaultValue ?? roll.max ?? roll.min ?? 0);
}

function getGearLegendaryDraft(item) {
  const draft = getGearInstanceValue(item.id, "legendaryDraft", "gearLegendaryDrafts", null);
  return Array.isArray(draft?.corrodedSlotIds) ? draft : null;
}

function getGearCorrodedSlotIds(item) {
  const draft = getGearLegendaryDraft(item);
  if (draft) return new Set(draft.corrodedSlotIds);
  return getGearInstanceValue(item.id, "corrupted", "gearCorruptions", false)
    ? new Set((item.legendaryAffixes ?? []).map((affix) => affix.slotId))
    : new Set();
}

function getGearDisplayRolls(item) {
  if (!item.legendaryAffixes?.length) {
    return (item.rolls ?? []).map((roll, rollIndex) => ({
      ...roll,
      localePath: gearBasePropertyPath(item, rollIndex),
    }));
  }

  const corrodedSlotIds = getGearCorrodedSlotIds(item);
  return item.legendaryAffixes.flatMap((affix) => {
    const corroded = corrodedSlotIds.has(affix.slotId);
    const variantName = corroded ? "corroded" : "normal";
    const variant = corroded ? affix.corroded : affix.normal;
    return (variant?.rollDefs ?? []).map((rollDef) => ({
      id: `legendary:${affix.slotId}:${variantName}:${rollDef.key}`,
      label: variant.text,
      min: Number(rollDef.min),
      max: Number(rollDef.max),
      defaultValue: Number(rollDef.max),
      isPercent: String(variant.text ?? "").includes("%"),
      localePath: variant.activeLocaleAlias || "",
      localeRollDefs: variant.rollDefs,
      localeRollPrefix: `legendary:${affix.slotId}:${variantName}`,
    }));
  });
}

function getGearCraftConfig(item, affix) {
  const crafts = getGearInstanceValue(item.id, "crafts", "gearCrafts", {});
  return crafts?.[affix.affixId] ?? {};
}

function isGearCraftAffixActive(item, affix) {
  if (affix?.selectionSupported === false) return false;
  const crafts = getGearInstanceValue(item.id, "crafts", "gearCrafts", {});
  return Boolean(crafts && Object.hasOwn(crafts, affix.affixId));
}

function getGearCraftTier(affix, config = {}) {
  return affix.tierOptions?.find((tier) => tier.tierId === config.tierId) ?? affix.tierOptions?.[0];
}

function getGearCraftRollValue(item, affix, tier, roll) {
  const config = getGearCraftConfig(item, affix);
  return Number(config.rolls?.[roll.key] ?? roll.max ?? roll.min ?? 0);
}

const GEAR_CRAFT_GROUPS = Object.freeze([
  ["base", "gearCraftGroupBase"],
  ["prefix", "gearCraftGroupPrefix"],
  ["suffix", "gearCraftGroupSuffix"],
  ["corrosion", "gearCraftGroupCorrosion"],
  ["dream", "gearCraftGroupDream"],
  ["nightmare", "gearCraftGroupNightmare"],
  ["graft", "gearCraftGroupGraft"],
  ["other", "gearCraftGroupOther"],
]);

function gearCraftGroupKind(affix) {
  const affixId = String(affix?.affixId ?? "");
  if (affixId.startsWith("graft:")) return "graft";
  const sourceKind = affixId.split(":")[1] ?? "";
  return {
    base_affix: "base",
    craft_prefix: "prefix",
    craft_suffix: "suffix",
    corrosion_affix: "corrosion",
    dream_affix: "dream",
    nightmare_affix: "nightmare",
  }[sourceKind] ?? "other";
}

function groupGearCraftAffixes(item) {
  const grouped = new Map(GEAR_CRAFT_GROUPS.map(([kind]) => [kind, []]));
  (item.craftAffixes ?? []).forEach((affix, affixIndex) => {
    grouped.get(gearCraftGroupKind(affix)).push({ affix, affixIndex });
  });
  return GEAR_CRAFT_GROUPS
    .map(([kind, labelKey]) => ({ kind, labelKey, entries: grouped.get(kind) }))
    .filter(({ entries }) => entries.length > 0);
}

function renderGearRollEditor(item) {
  const rolls = getGearDisplayRolls(item);
  const tooltipRolls = getGearTooltipRollControls(item, {
    rolls: getGearInstanceValue(item.id, "rolls", "gearRolls", {}),
    corrupted: getGearInstanceValue(item.id, "corrupted", "gearCorruptions", false),
    legendaryDraft: getGearLegendaryDraft(item),
  });
  if (!rolls.length && !tooltipRolls.length) return "";

  return `
    <div class="gear-roll-editor">
      <span>${ui("gearRolls")}</span>
      ${tooltipRolls.length ? `<details><summary>계산용 원문 수치 입력</summary>
        <p>일반 옵션의 원문 범위를 직접 입력합니다. 직접 입력한 값이 기존 슬라이더보다 우선합니다. 미입력은 계산 미지원으로 남습니다. 아래 순서는 원문의 범위형 옵션 순서입니다.</p>
        <a href="${escapeHtml(tooltipRolls[0].sourceUrl)}" target="_blank" rel="noreferrer">TLIDB 원문 확인</a>
        ${tooltipRolls.map((roll) => `<label>${escapeHtml(roll.label)} (${roll.min} ~ ${roll.max})
          <input type="number" class="gear-tooltip-roll-input" min="${roll.min}" max="${roll.max}" step="any"
            value="${roll.value}" data-item="${escapeHtml(item.id)}" data-roll="${escapeHtml(roll.key)}" /></label>`).join("")}
      </details>` : ""}
      ${rolls
        .map((roll) => {
          const value = getGearRollValue(item, roll);
          const step = Number.isInteger(roll.min) && Number.isInteger(roll.max) ? 1 : 0.1;
          const values = roll.localeRollDefs
            ? Object.fromEntries(roll.localeRollDefs.map((rollDef) => [
                rollDef.key,
                getGearRollValue(item, {
                  ...rollDef,
                  id: `${roll.localeRollPrefix}:${rollDef.key}`,
                  defaultValue: Number(rollDef.max),
                }),
              ]))
            : { roll_1: value };
          const label = renderLocalizedGearText(
            roll.localePath,
            values,
            roll.label || ui("gearRolls"),
          );
          return `
            <label title="${escapeHtml(label)}">
              <small>${escapeHtml(label)}</small>
              <input class="gear-roll-input" type="range" min="${roll.min}" max="${roll.max}" step="${step}" value="${value}" data-item="${item.id}" data-roll="${roll.id}" />
              <b>${formatStat(value, roll.isPercent ? "%" : "")}</b>
            </label>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderGearCraftEditor(item) {
  if (item.craftRuntimeSupport === "display-only") {
    const limitation = state.locale === "ko"
      ? "제작 분류 미검증 · 표시·선택·저장만 지원"
      : "Craft category unverified · display, selection, and save only";
    return `<div class="gear-roll-editor gear-craft-editor"><span>${escapeHtml(limitation)}</span></div>`;
  }
  if (!item.craftAffixes?.length) return "";

  const activeCount = item.craftAffixes.filter((affix) => isGearCraftAffixActive(item, affix)).length;
  const craftGroups = groupGearCraftAffixes(item);

  return `
    <div class="gear-roll-editor gear-craft-editor">
      <span>${ui("craftAffixTiers")} · ${ui("craftAffixCount", { active: activeCount, total: item.craftAffixes.length })}</span>
      ${craftGroups
        .map(({ kind, labelKey, entries }, groupIndex) => {
          const groupActiveCount = entries.filter(({ affix }) => isGearCraftAffixActive(item, affix)).length;
          return `
          <details class="gear-craft-group" data-craft-kind="${kind}" data-group-active="${groupActiveCount}" data-group-total="${entries.length}" ${groupActiveCount > 0 || groupIndex === 0 ? "open" : ""}>
            <summary>
              <strong>${ui(labelKey)}</strong>
              <span>${ui("gearCraftGroupCount", { active: groupActiveCount, total: entries.length })}</span>
            </summary>
            <div class="gear-craft-group-list">
            ${entries.map(({ affix, affixIndex }) => {
          const active = isGearCraftAffixActive(item, affix);
          let affixLabel = gearLocaleText(
            preferredGearLocaleRef(
              affix.activeLocaleAliases?.affix ?? `craft-affix:${affix.affixId}`,
              gearCatalogPath(item, "craftAffixes", affixIndex, "affixName"),
            ),
            affix.affixName,
          );
          if (affix.selectionSupported === false || affix.calculationSupported === false) {
            return `
              <div class="craft-affix-row is-display-only" data-active="false" data-display-affix="${escapeHtml(affix.affixId)}" data-value-authority="${escapeHtml(affix.craftValueAuthority ?? "unverified")}">
                <header>
                  <small>${escapeHtml(affixLabel)}</small>
                  <span>${escapeHtml(ui("gearCraftValueAuthorityUnverified"))}</span>
                </header>
              </div>
            `;
          }
          const config = getGearCraftConfig(item, affix);
          const tier = getGearCraftTier(affix, config);
          if (!tier) return "";
          const tierIndex = affix.tierOptions.indexOf(tier);
          if (active) affixLabel = gearLocaleText(
            preferredGearLocaleRef(tier.activeLocaleAliases?.tier ?? `craft-tier:${tier.tierId}`,
              gearCatalogPath(item, "craftAffixes", affixIndex, "tierOptions", tierIndex, "text")),
            tier.text,
          );
          const tierValues = Object.fromEntries(
            tier.rollDefs.map((roll) => [roll.key, getGearCraftRollValue(item, affix, tier, roll)]),
          );
          return `
            <div class="craft-affix-row" data-active="${active}">
              <header>
                <small>${escapeHtml(affixLabel)}</small>
                <button type="button" class="gear-craft-toggle" data-action="toggle-gear-craft" data-item="${escapeHtml(item.id)}" data-affix="${escapeHtml(affix.affixId)}" aria-pressed="${active}" aria-label="${escapeHtml(`${ui(active ? "remove" : "apply")}: ${affixLabel}`)}">${ui(active ? "remove" : "apply")}</button>
              </header>
              <select class="gear-craft-tier" data-item="${escapeHtml(item.id)}" data-affix="${escapeHtml(affix.affixId)}" aria-label="${escapeHtml(`${affixLabel}: ${ui("craftAffixTiers")}`)}" ${active ? "" : "disabled"}>
                ${affix.tierOptions
                  .map(
                    (option, optionIndex) => {
                      const optionText = gearLocaleText(
                        preferredGearLocaleRef(
                          option.activeLocaleAliases?.tier ?? `craft-tier:${option.tierId}`,
                          gearCatalogPath(
                            item,
                            "craftAffixes",
                            affixIndex,
                            "tierOptions",
                            optionIndex,
                            "text",
                          ),
                        ),
                        option.text,
                      );
                      return `<option value="${escapeHtml(option.tierId)}" ${option.tierId === tier.tierId ? "selected" : ""}>${escapeHtml(`${gearTierLabel(option)} · ${optionText}`)}</option>`;
                    },
                  )
                  .join("")}
              </select>
              ${tier.rollDefs
                .map((roll, rollIndex) => {
                  const value = getGearCraftRollValue(item, affix, tier, roll);
                  const suffix = roll.unit === "m" ? "meters" : (roll.unit ?? (tier.text.includes("%") ? "%" : ""));
                  const tierPath = gearCatalogPath(
                    item,
                    "craftAffixes",
                    affixIndex,
                    "tierOptions",
                    tierIndex,
                  );
                  const tierText = gearLocaleText(
                    preferredGearLocaleRef(
                      tier.activeLocaleAliases?.tier ?? `craft-tier:${tier.tierId}`,
                      `${tierPath}/text`,
                    ),
                    tier.text,
                  );
                  const rollLabel = renderLocalizedGearText(
                    preferredGearLocaleRef(
                      tier.activeLocaleAliases?.rolls?.[roll.key]
                        ?? `craft-roll:${tier.tierId}:${roll.key}`,
                      `${tierPath}/rollDefs/${rollIndex}/label`,
                    ),
                    tierValues,
                    tier.text || roll.label,
                  );
                  return `
                    <label title="${escapeHtml(tierText)}">
                      <small>${escapeHtml(rollLabel)}</small>
                      <input class="gear-craft-roll-input" type="range" min="${roll.min}" max="${roll.max}" step="${roll.step || 1}" value="${value}" data-item="${escapeHtml(item.id)}" data-affix="${escapeHtml(affix.affixId)}" data-tier="${escapeHtml(tier.tierId)}" data-roll="${escapeHtml(roll.key)}" data-suffix="${suffix}" aria-label="${escapeHtml(`${affixLabel}: ${rollLabel}`)}" ${active ? "" : "disabled"} />
                      <b>${formatStat(value, suffix)}</b>
                    </label>
                  `;
                })
                .join("")}
            </div>
          `;
            }).join("")}
            </div>
          </details>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderLegendaryAffixEditor(item) {
  if (!item.legendaryAffixes?.length) return "";

  const corrodedSlotIds = getGearCorrodedSlotIds(item);
  const corrosionLimit = getVerified91TobGearCorrosionLimit(item.id);
  const corrosionLimitReached = corrosionLimit !== null && corrodedSlotIds.size >= corrosionLimit;
  return `
    <div class="legendary-affix-editor">
      ${corrosionLimit === null ? "" : `<p class="gear-corrosion-limit" data-corrosion-active="${corrodedSlotIds.size}" data-corrosion-limit="${corrosionLimit}">${ui("gearCorrosionLimit", { active: corrodedSlotIds.size, limit: corrosionLimit })}</p>`}
      <div class="legendary-affix-list">
        ${item.legendaryAffixes
          .map((affix, index) => {
            const corroded = corrodedSlotIds.has(affix.slotId);
            const variantName = corroded ? "corroded" : "normal";
            const variant = corroded ? affix.corroded : affix.normal;
            const fallback = variant?.text
              || `${ui(corroded ? "corrodedAffix" : "normalAffix")} ${index + 1}`;
            const label = variant?.activeLocaleAlias
              ? gearLocaleText(variant.activeLocaleAlias, fallback)
              : presentSourceGameText(fallback, { locale: state.locale });
            const disabled = !corroded && corrosionLimitReached;
            return `<label class="corrosion-toggle legendary-affix-row"><span title="${escapeHtml(label)}">${escapeHtml(label)}</span><input class="gear-corrosion-toggle" type="checkbox" data-item="${escapeHtml(item.id)}" data-affix-slot="${escapeHtml(affix.slotId)}" ${corroded ? "checked" : ""} ${disabled ? "disabled" : ""} /><b>${corroded ? ui("corroded") : ui("uncorroded")}</b></label>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderItemDetail(categoryId, items) {
  const category = getCategory(categoryId);
  const item = getDetailItem(categoryId, items);
  if (!item) return `<aside class="item-detail-panel empty">${ui("noDetailData")}</aside>`;

  const displayItem = itemText(item);
  const preview = state.pendingSlot?.categoryId === categoryId
    ? previewItemForCurrentSlot(item)
    : previewItem(state.build, item.id);
  const selected = isSelectedForCurrentSlot(item.id);
  const craftMode = categoryId === "gear" && state.overlay?.mode === "craft";
  const readOnlyGear = categoryId === "gear" && isGearReadOnlyItem(item);
  const selectionOnlyGear = categoryId === "gear" && isGearSelectionOnlyItem(item);
  const deltaRows = STAT_ROWS.map(([labelKey, statKey, suffix]) => [
    labelKey,
    preview?.delta?.[statKey] ?? 0,
    suffix,
  ]).filter(([, value]) => value !== 0);
  const previewUnsupported = preview?.calculationSupported === false;
  const gearCustomAffix = categoryId === "gear"
    ? customAffixEditorPresentation(
        getGearInstanceValue(item.id, "affixText", "gearAffixes", ""),
        ui("gearAffixPlaceholder"),
      )
    : null;
  const skillPlacement = categoryId === "skills"
    ? getRuntimeSkillDetailPlacement(item.id)
    : null;

  return `
    <aside class="item-detail-panel">
      <div class="detail-title">
        ${renderItemIcon(item, "detail-icon")}
        <div>
          <span>${escapeHtml(category ? categoryText(category).label : "")}</span>
          <h3>${escapeHtml(displayItem.name)}</h3>
          <p class="detail-meta">${escapeHtml([displayItem.rarity, displayItem.type].filter(Boolean).join(" · "))}</p>
        </div>
      </div>
      <p class="detail-copy">${escapeHtml(displayItem.detail || displayItem.summary || ui("noDetailData"))}</p>
      ${
        categoryId === "gear"
          ? readOnlyGear
            ? `<p class="gear-read-only-detail" data-role="gear-read-only-detail">${escapeHtml(gearReadOnlyCopy("detail", selected))}</p>`
            : selectionOnlyGear
              ? `
                ${renderGearSourceCoverage(item)}
                <p class="gear-selection-only-detail" data-role="gear-selection-only-detail">${escapeHtml(gearSelectionOnlyCopy("detail"))}</p>
                <button class="inventory-save-button" data-action="save-gear-inventory" data-item="${item.id}">
                  ${ui("saveGearToInventory")}
                </button>
              `
            : `
            <details class="gear-value-disclosure"><summary>${calculationCopy("옵션 수치 편집", "Edit item values")}</summary>
            <details class="gear-source-disclosure"><summary>${calculationCopy("출처·편집 가능 범위", "Source and editing coverage")}</summary>${renderGearSourceCoverage(item)}</details>
            ${renderLegendaryAffixEditor(item)}
            ${renderGearRollEditor(item)}
            <details class="gear-craft-disclosure"><summary>${calculationCopy("제작 옵션", "Crafting options")}</summary>${renderGearCraftEditor(item)}</details>
            <label class="gear-affix-editor">
              <span>${ui("gearAffixEditor")}</span>
              <textarea id="gearAffixEditor" data-item="${item.id}" placeholder="${escapeHtml(gearCustomAffix.placeholder)}">${escapeHtml(gearCustomAffix.value)}</textarea>
            </label>
            </details>
            <button class="inventory-save-button" data-action="save-gear-inventory" data-item="${item.id}">
              ${ui("saveGearToInventory")}
            </button>
          `
          : ""
      }
      <h4>${ui("statChange")}</h4>
      <dl class="detail-deltas ${previewUnsupported ? "is-unsupported" : ""}" data-calculation-support="${previewUnsupported ? "unsupported" : "supported"}">
        ${
          previewUnsupported
            ? `<div><dt>${ui("statChange")}</dt><dd>${ui("traceUnsupported")}</dd></div>`
          : deltaRows.length
            ? deltaRows
                .map(
                  ([labelKey, value, suffix]) => `
                    <div>
                      <dt>${ui(labelKey)}</dt>
                      <dd>${Number(value) > 0 ? "+" : ""}${formatStat(value, suffix)}</dd>
                    </div>
                  `,
                )
                .join("")
            : `<div><dt>${ui("statChange")}</dt><dd>0</dd></div>`
        }
      </dl>
      ${
        craftMode
          ? ""
          : readOnlyGear && !selected
            ? `<button class="detail-action" type="button" disabled>${escapeHtml(gearReadOnlyCopy("badge"))}</button>`
          : categoryId === "skills" && skillPlacement?.status === "loading"
            ? `<p class="detail-runtime-status">${ui("skillRuntimeLoading")}</p>`
            : categoryId === "skills" && skillPlacement?.status === "information-only"
              ? `<p class="detail-runtime-status is-partial">${ui("skillInformationOnly")}</p>`
              : categoryId === "skills" && skillPlacement?.status === "full"
                ? `<p class="detail-runtime-status is-partial">${ui("skillNoEmptySlot")}</p>`
                : categoryId === "skills"
                  ? `<button class="detail-action" data-action="skill-detail-runtime-toggle" data-item="${item.id}">
                      ${ui(skillPlacement?.status === "equipped" ? "removeFromBuild" : "addToBuild")}
                    </button>`
          : `<button class="detail-action" data-action="toggle" data-item="${item.id}">
              ${selected ? ui("removeFromBuild") : ui("addToBuild")}
            </button>`
      }
    </aside>
  `;
}

const SOURCE_NAV_ICON_GLYPHS = Object.freeze({
  home: "⌂",
  hexagon: "⬡",
  radar: "◎",
});

function sourceNavigationRows() {
  if (state.currentSeasonOpen) return [["editor", "계산 조건", "home"], ["dps", "전체 DPS", "radar"], ["compare", "빌드 비교", "hexagon"]];
  return [
    ["planner", ui("bdSimulator"), "home"],
    ["traits", ui("traitSupport"), "hexagon"],
    ["dps", ui("dpsInsight"), "radar"],
  ];
}

function renderSourceViewButtons(className) {
  return sourceNavigationRows()
    .map(
      ([id, label, icon]) => {
        const active = state.currentSeasonOpen ? id === (['dps', 'compare'].includes(state.currentSeasonSection) ? state.currentSeasonSection : 'editor') : id === state.view;
        return `
        <button type="button" class="${className} ${active ? "is-active" : ""}" data-action="${state.currentSeasonOpen ? "advisor-open-section" : "set-view"}" data-section="${id}" data-view="${id}" aria-label="${escapeHtml(label)}" ${active ? 'aria-current="page"' : ""}>
          <span class="menu-icon menu-icon-${icon}" aria-hidden="true">${SOURCE_NAV_ICON_GLYPHS[icon]}</span>
          <span>${label}</span>
        </button>
      `; },
    )
    .join("");
}

function renderPlannerSectionButtons(className, tabs = false) {
  return PLANNER_SECTION_DEFS.map((section) => `
    <button
      type="button"
      ${className ? `class="${className}"` : ""}
      data-action="jump-planner-section"
      data-section="${section.id}"
      aria-controls="${section.targetId}"
      ${tabs ? `id="planner-tab-${section.id}" role="tab" aria-selected="${state.plannerSection === section.id}" tabindex="${state.plannerSection === section.id ? 0 : -1}"` : ""}
    >${ui(section.labelKey)}</button>
  `).join("");
}

function renderSidebarSectionNavigation() {
  if (state.currentSeasonOpen) return `<nav class="source-section-menu" aria-label="SS14 편집 바로가기"><div class="source-section-actions">${[
    ["hero", "히어로"], ["skills", "스킬·장비"], ["character", "기본 속성"], ["combat", "전투 조건"], ["effects", "정령·효과"]
  ].map(([id, label]) => `<button type="button" class="source-section-item" data-action="advisor-open-section" data-section="${id}"${state.currentSeasonSection === id ? ' aria-current="location"' : ''}>${label}</button>`).join("")}</div></nav>`;
  return `
    <nav class="source-section-menu" aria-label="${ui("plannerSectionNavigation")}">
      <strong>${ui("plannerSectionNavigation")}</strong>
      <div class="source-section-actions">
        ${renderPlannerSectionButtons("source-section-item")}
      </div>
    </nav>
  `;
}

function renderSidebar() {

  return `
    <aside class="source-sidebar ${state.sidebarCollapsed ? "is-collapsed" : ""}">
      <div class="source-brand">
        <span class="brand-mark">◇</span>
        <strong>TOB</strong>
      </div>
      <button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${ui(state.sidebarCollapsed ? "expandSidebar" : "collapseSidebar")}">${state.sidebarCollapsed ? "›" : "‹"}</button>
      <nav class="source-menu" aria-label="${ui("navigation")}">
        ${renderSourceViewButtons("source-menu-item")}
      </nav>
      ${renderSidebarSectionNavigation()}
      <div class="source-footer">
        ${state.currentSeasonOpen ? `<div class="source-footer-links"><button type="button" data-action="open-help">도움말</button>
          <details><summary>자료·지원</summary><button type="button" data-action="open-data-status">SS14 자료</button></details></div>` : `
        <div class="source-footer-links">
          <button type="button" data-action="open-announcement">${ui("announcementOpen")}</button>
          <button type="button" data-action="open-data-status">${ui("dataStatus")}</button>
          <button type="button" data-action="open-help">${ui("help")}</button>
        </div>
        <label class="notice-toggle">
          <span>${ui("notice")}</span>
          <input type="checkbox" id="noticeToggle" aria-label="${ui("notice")}" ${state.showNotice ? "checked" : ""} />
        </label>
        `}
      </div>
    </aside>
  `;
}

function traitSupportRows() {
  const heroItems = getCatalogItems("hero").map((item) => ({ item, kind: "hero" }));
  const skillItems = getCatalogItems("skills").map((item) => ({ item, kind: "skills" }));
  const supportItems = getCatalogItems("supports").map((item) => ({ item, kind: "supports" }));
  const query = state.traitQuery.trim().toLowerCase();

  return [...heroItems, ...skillItems, ...supportItems].filter(({ item, kind }) => {
    if (state.traitFilter !== "all" && state.traitFilter !== kind) return false;
    if (!query) return true;
    const text = itemText(item);
    return `${text.name} ${text.type} ${getTlidbLocaleText(item, "en")?.name ?? ""}`.toLowerCase().includes(query);
  });
}

function traitSupportDisplayStatus(item) {
  const localeText = getTlidbLocaleText(item, state.locale);
  const fieldStatus = localeText?.sourceFieldStatus;
  const hasExactName = fieldStatus?.name === "exact";
  const hasExactDescription = fieldStatus?.detail === "exact" || fieldStatus?.summary === "exact";
  const supplement = state.locale === "ko" ? getCurrentKoreanGameTextSupplement(item, "detail") : null;
  if (hasExactName && supplement?.complete && supplement.presentation === "replace") {
    return { className: "is-good", label: ui("traitSupportSupplementedKoSource") };
  }
  if (hasExactName && hasExactDescription) {
    return {
      className: "is-good",
      label: state.locale === "ko" ? ui("traitSupportExactKoSource") : ui("traitSupportExactLocaleSource"),
    };
  }
  const hasMixedDescription = fieldStatus?.detail === "source-language-mixed"
    || fieldStatus?.summary === "source-language-mixed";
  if (hasExactName && hasMixedDescription) {
    return {
      className: "is-partial",
      label: ui("traitSupportPartialLocaleSource"),
    };
  }
  return {
    className: "is-partial",
    label: `${ui("traitSupportExactSourceUnavailable")} · ${ui("statusSourceText")}`,
  };
}

function traitSupportStructureSupported(item, kind) {
  return !isSs13PreviewCatalogItem(item)
    && (
      kind === "hero"
      || Boolean(item.skillProfile)
      || Boolean(item.supportProfile)
      || hasTlidbParsedCalculationAuthority(item)
    );
}

function traitSupportValueSupportLevel(item) {
  if (
    item.calculationValueAuthority === true
    || item.calculationValueAuthority === "tlidb-current-ss13"
  ) return "complete";
  if (hasCurrentSs13SupportDamageAuthority(item) || hasTlidbParsedCalculationAuthority(item)) {
    return "partial";
  }
  return "none";
}

function traitSupportCurrentlySelected(item) {
  return isSelected(item.id);
}

function traitSupportActuallyApplied(item, { valueSupported, selected }) {
  if (!valueSupported || !selected || state.isStale || !state.lastCalculation) return false;
  return state.lastCalculation.provenance?.sources?.some(
    (candidate) => candidate.id === item.id && candidate.applied === true,
  ) === true;
}

function traitSupportTruth(item, kind) {
  const valueSupportLevel = traitSupportValueSupportLevel(item);
  const valueSupported = valueSupportLevel !== "none";
  const selected = traitSupportCurrentlySelected(item);
  return {
    structureSupported: traitSupportStructureSupported(item, kind),
    valueSupportLevel,
    valueSupported,
    selected,
    applied: traitSupportActuallyApplied(item, { valueSupported, selected }),
  };
}

function traitSupportStructureStatus(supported) {
  return supported
    ? { className: "is-good", label: ui("traitSupportStructureSupported") }
    : { className: "is-partial", label: ui("traitSupportStructureUnsupported") };
}

function traitSupportValueStatus(level) {
  if (level === "complete") {
    return { className: "is-good", label: ui("traitSupportValueSupported") };
  }
  if (level === "partial") {
    return { className: "is-partial", label: ui("traitSupportValuePartiallySupported") };
  }
  return { className: "is-partial", label: ui("traitSupportValueUnsupported") };
}

function traitSupportSelectionStatus(selected) {
  return selected
    ? { className: "is-good", label: ui("traitSupportCurrentlySelected") }
    : { className: "is-partial", label: ui("traitSupportNotSelected") };
}

function traitSupportAppliedStatus(applied) {
  return applied
    ? { className: "is-good", label: ui("traitSupportActuallyApplied") }
    : { className: "is-partial", label: ui("traitSupportNotApplied") };
}

function traitSupportSummary(rows) {
  const summary = {
    structure: 0,
    value: 0,
    valueComplete: 0,
    valuePartial: 0,
    selected: 0,
    applied: 0,
    total: rows.length,
  };
  for (const { item, kind } of rows) {
    const truth = traitSupportTruth(item, kind);
    if (truth.structureSupported) summary.structure += 1;
    if (truth.valueSupported) {
      summary.value += 1;
      if (truth.valueSupportLevel === "complete") summary.valueComplete += 1;
      if (truth.valueSupportLevel === "partial") summary.valuePartial += 1;
    }
    if (truth.selected) summary.selected += 1;
    if (truth.applied) summary.applied += 1;
  }
  return summary;
}

function renderTraitSupportView() {
  const rows = traitSupportRows();
  const summary = traitSupportSummary(rows);
  const filters = [
    ["all", ui("supportFilterAll")],
    ["hero", ui("supportFilterHero")],
    ["skills", ui("supportFilterSkills")],
    ["supports", ui("supportFilterSupports")],
  ];

  return `
    <section class="planner-section support-table-section">
      <h2>${ui("traitSupport")}</h2>
      <p class="support-table-intro">${ui("traitSupportIntro")}</p>
      <ul class="trait-support-summary" data-role="trait-support-summary" data-total="${summary.total}">
        ${[
          ["structure", "traitSupportStructure", summary.structure, ""],
          ["value", "traitSupportValue", summary.value, ui("traitSupportValueSummary", {
            complete: summary.valueComplete,
            partial: summary.valuePartial,
          })],
          ["selected", "traitSupportSelected", summary.selected, ""],
          ["applied", "traitSupportApplied", summary.applied, ""],
        ].map(([axis, labelKey, count, detail]) => `<li data-role="trait-support-summary-axis" data-axis="${axis}" data-count="${count}" data-total="${summary.total}"${axis === "value" ? ` data-complete="${summary.valueComplete}" data-partial="${summary.valuePartial}"` : ""}>
          <span>${ui(labelKey)}${detail ? `<small> · ${detail}</small>` : ""}</span><strong>${count} / ${summary.total}</strong>
        </li>`).join("")}
      </ul>
      <div class="support-table-controls">
        <input id="traitSupportSearch" type="search" placeholder="${ui("searchPlaceholder")}" value="${escapeHtml(state.traitQuery)}" />
        ${filters
          .map(
            ([id, label]) =>
              `<button class="support-filter-chip ${state.traitFilter === id ? "is-active" : ""}" data-action="trait-filter" data-filter="${id}">${label}</button>`,
          )
          .join("")}
      </div>
      <div class="support-table-scroll" tabindex="0" aria-label="${ui("traitSupport")}">
      <table class="support-table">
        <thead>
          <tr>
            <th>${ui("traitSupportItem")}</th>
            <th>${ui("traitSupportDisplaySource")}</th>
            <th>${ui("traitSupportStructure")}</th>
            <th>${ui("traitSupportValue")}</th>
            <th>${ui("traitSupportSelected")}</th>
            <th>${ui("traitSupportApplied")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(({ item, kind }) => {
              const text = itemText(item);
              const displayStatus = traitSupportDisplayStatus(item);
              const truth = traitSupportTruth(item, kind);
              const structureStatus = traitSupportStructureStatus(truth.structureSupported);
              const valueStatus = traitSupportValueStatus(truth.valueSupportLevel);
              const selectionStatus = traitSupportSelectionStatus(truth.selected);
              const appliedStatus = traitSupportAppliedStatus(truth.applied);
              const kindLabel = kind === "hero"
                ? ui("supportFilterHero")
                : kind === "supports"
                  ? ui("supportFilterSupports")
                  : ui("supportFilterSkills");
              return `
                <tr>
                  <td>
                    <button class="support-item-link" data-action="support-open-item" data-item="${item.id}">
                      ${renderItemIcon(item, "support-table-icon")}
                      <span>
                        <strong>${escapeHtml(text.name)}</strong>
                        <small>${escapeHtml([kindLabel, text.type].filter(Boolean).join(" · "))}</small>
                      </span>
                    </button>
                  </td>
                  <td><span class="support-status ${displayStatus.className}">${displayStatus.label}</span></td>
                  <td><span class="support-status ${structureStatus.className}">${structureStatus.label}</span></td>
                  <td><span class="support-status ${valueStatus.className}">${valueStatus.label}</span></td>
                  <td><span class="support-status ${selectionStatus.className}">${selectionStatus.label}</span></td>
                  <td><span class="support-status ${appliedStatus.className}">${appliedStatus.label}</span></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
      </div>
    </section>
  `;
}

function renderDpsInsightView(calc) {
  const rows = calc ? state.lastSkillRows : [];
  const damageRows = rows.filter((row) => row.calculationApplicable !== false);
  const notApplicableRows = rows.filter((row) => row.calculationApplicable === false);
  const supportedRows = damageRows.filter((row) => row.calculationSupported === true);
  const unsupportedRows = damageRows.filter((row) => row.calculationSupported !== true);
  const totalRowDps = supportedRows.reduce((sum, row) => sum + row.dps, 0);
  const insightCalculationSupported = damageRows.length > 0 && unsupportedRows.length === 0;

  if (!calc) {
    return `
      <section class="planner-section dps-insight-section">
        <h2>${ui("dpsInsight")}</h2>
        <p class="support-table-intro">${ui("calculationEmpty")}</p>
        <button class="craft-button" data-action="set-view" data-view="planner">${ui("goSimulator")}</button>
      </section>
    `;
  }

  if (!rows.length) {
    return `
      <section class="planner-section dps-insight-section">
        <h2>${ui("dpsInsight")}</h2>
        ${renderCalculationStatus(calc)}
        <p class="support-table-intro">${ui("dpsInsightEmpty")}</p>
        <button class="craft-button" data-action="set-view" data-view="planner">${ui("goSimulator")}</button>
      </section>
    `;
  }

  return `
    <section class="planner-section dps-insight-section">
      <h2>${ui("dpsInsight")}</h2>
      ${renderCalculationStatus(calc)}
      <p class="support-table-intro">${ui("dpsInsightIntro")}</p>
      ${unsupportedRows.length ? `<p class="calculation-limit-notice" data-role="dps-insight-calculation-unsupported">${ui("dpsInsightUnsupportedRows", { count: unsupportedRows.length })}</p>` : ""}
      ${notApplicableRows.length ? `<p class="calculation-limit-notice" data-role="dps-insight-not-applicable">${ui("dpsInsightNotApplicableRows", { count: notApplicableRows.length })}</p>` : ""}
      <div class="dps-summary-cards">
        <div class="dps-summary-card" data-calculation-support="${insightCalculationSupported ? "supported" : damageRows.length ? "unsupported" : "not-applicable"}"><span>${ui("totalDps")}</span><strong>${insightCalculationSupported ? formatNumber(calc.summary.dps) : ui(damageRows.length ? "traceUnsupported" : "traceNotApplicable")}</strong></div>
        <div class="dps-summary-card" data-calculation-support="${insightCalculationSupported ? "supported" : damageRows.length ? "unsupported" : "not-applicable"}"><span>${ui("linkedSkillDpsTotal")}</span><strong>${insightCalculationSupported ? formatNumber(totalRowDps) : ui(damageRows.length ? "traceUnsupported" : "traceNotApplicable")}</strong></div>
        <div class="dps-summary-card" data-calculation-support="${insightCalculationSupported ? "supported" : damageRows.length ? "unsupported" : "not-applicable"}"><span>${ui("damageBonus")}</span><strong>${insightCalculationSupported ? `${calc.summary.damageBonus}%` : ui(damageRows.length ? "traceUnsupported" : "traceNotApplicable")}</strong></div>
        <div class="dps-summary-card" data-calculation-support="${insightCalculationSupported ? "supported" : damageRows.length ? "unsupported" : "not-applicable"}"><span>${ui("attackSpeedBonus")}</span><strong>${insightCalculationSupported ? `${calc.summary.attackSpeedBonus}%` : ui(damageRows.length ? "traceUnsupported" : "traceNotApplicable")}</strong></div>
      </div>
      <table class="support-table">
        <thead>
          <tr>
            <th>${ui("skills")}</th>
            <th>${ui("dpsRowLevel")}</th>
            <th>${ui("dpsRowSupports")}</th>
            <th>${ui("dpsRowDps")}</th>
            <th>${ui("dpsRowShare")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const skill = findItemById(row.skillId);
              const display = getSkillRowDisplay(row);
              const applicable = row.calculationApplicable !== false;
              const supported = applicable && row.calculationSupported === true;
              const share = supported && totalRowDps > 0
                ? Math.round((row.dps / totalRowDps) * 100)
                : 0;
              const identity = skill
                ? `<button class="support-item-link" data-action="support-open-item" data-item="${row.skillId}">
                    ${renderItemIcon(skill, "support-table-icon")}
                    <span><strong>${escapeHtml(display.name)}</strong><small>${supported ? ui("statusRuntime") : ui(applicable ? "dpsInsightUnsupportedStatus" : "dpsInsightNotApplicableStatus")}</small></span>
                  </button>`
                : `<div class="support-item-link is-static">
                    ${display.iconUrl ? `<img class="support-table-icon" src="${escapeHtml(display.iconUrl)}" alt="" loading="lazy" />` : ""}
                    <span><strong>${escapeHtml(display.name)}</strong><small>${ui("externalSkillCoefficientUnavailable")}</small></span>
                  </div>`;
              return `
                <tr>
                  <td>${identity}</td>
                  <td>${ui("levelValue", { value: row.level })}</td>
                  <td>${row.linkedSupports}</td>
                  <td data-calculation-support="${supported ? "supported" : applicable ? "unsupported" : "not-applicable"}">${supported ? formatNumber(row.dps) : ui(applicable ? "traceUnsupported" : "traceNotApplicable")}</td>
                  <td>
                    <div class="dps-share-bar"><i style="width:${share}%"></i></div>
                    ${supported ? `${share}%` : "—"}
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderHeader(calc) {
  return `
    <header class="planner-header">
      <div class="title-stack">
        <p>${ui("plannerSubtitle")}</p>
      </div>
      <div class="header-actions">
        <div class="header-primary-actions">
          <label class="build-chip">
            <input id="buildName" value="${escapeHtml(state.build.name)}" placeholder="${ui("buildName")}" aria-label="${ui("buildName")}" maxlength="60" />
            <small>${ui("selectedCount", { count: currentSelectedCount() })}</small>
          </label>
          <button data-action="save">${ui("save")}</button>
          <button data-action="open-overlay" data-overlay="saves">${ui("load")}</button>
        </div>
        <div class="header-local-tools">
          <details class="build-file-menu">
            <summary>${calculationCopy("빌드 파일", "Build files")}</summary>
            <div class="build-file-actions">
              <button data-action="open-save-as">${ui("saveAs")}</button>
              <button data-action="import">${ui("importBd")}</button>
              <button data-action="export">${ui("exportBd")}</button>
              <button class="header-screenshot-action" data-action="import-screenshot"${isOfflineEdition() ? ' disabled title="오프라인판에서는 이미지 문자 인식을 사용할 수 없습니다."' : ""}>${ui("importScreenshot")}</button>
              <button class="danger" data-action="reset">${ui("resetBd")}</button>
            </div>
          </details>
          <select id="localeSelect" aria-label="${ui("language")}">
            ${SUPPORTED_LOCALES.map((locale) => `<option value="${locale.id}" ${locale.id === state.locale ? "selected" : ""}>${locale.label}</option>`).join("")}
          </select>
        </div>
      </div>
      <input id="importInput" type="file" accept="application/json,.json" hidden />
      <input id="screenshotInput" type="file" accept="image/*" aria-label="${ui("importScreenshot")}" hidden />
    </header>
  `;
}

function renderPlannerSectionNavigation() {
  return `
    <nav class="quick-category-menu" aria-label="${ui("plannerSectionNavigation")}">
      <strong class="quick-category-title">${ui("plannerSectionNavigation")}</strong>
      <div class="quick-category-actions" role="tablist" aria-label="${ui("plannerSectionNavigation")}">
        ${renderPlannerSectionButtons("", true)}
      </div>
    </nav>
  `;
}

function jumpToPlannerSection(sectionId) {
  const section = PLANNER_SECTION_DEFS.find((candidate) => candidate.id === sectionId);
  if (!section) return;
  if (state.currentSeasonOpen || state.view !== "planner" || state.plannerSection !== sectionId) {
    state.currentSeasonOpen = false;
    state.view = "planner";
    state.plannerSection = sectionId;
    state.overlay = null;
    state.statsDockOpen = false;
    render();
  }
  const target = document.getElementById(section.targetId);
  if (!target) return;
  target.focus({ preventScroll: true });
  const planner = document.querySelector(".planner-main");
  if (planner) planner.scrollTop = 0;
  document.querySelector(".quick-category-menu")?.scrollIntoView({ block: "nearest" });
}

function plannerPanelAttributes(sectionId) {
  return `role="tabpanel" ${state.plannerSection === sectionId ? "" : "hidden"}`;
}

function handlePlannerTabKeydown(event) {
  const tab = event.target?.closest?.('[role="tab"][data-section]');
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return false;
  const index = PLANNER_SECTION_DEFS.findIndex(({ id }) => id === tab.dataset.section);
  if (index < 0) return false;
  event.preventDefault();
  const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? PLANNER_SECTION_DEFS.length - 1
    : (index + (event.key === "ArrowRight" ? 1 : -1) + PLANNER_SECTION_DEFS.length) % PLANNER_SECTION_DEFS.length;
  const next = PLANNER_SECTION_DEFS[nextIndex];
  jumpToPlannerSection(next.id);
  document.getElementById(`planner-tab-${next.id}`)?.focus();
  return true;
}

function renderMobileNavigation() {
  if (state.currentSeasonOpen) return `<nav class="mobile-source-navigation" aria-label="SS14 탐색"><div class="mobile-source-menu">${renderSourceViewButtons("mobile-source-menu-item")}</div>
    <details class="ingame-mobile-tools"><summary>도움말·자료</summary><button type="button" data-action="open-help">도움말</button><button type="button" data-action="open-data-status">SS14 자료</button></details></nav>`;
  return `
    <nav class="mobile-source-navigation" aria-label="${ui("navigation")}">
      <details class="ingame-mobile-tools"><summary>${calculationCopy("TOB 도구", "TOB tools")}</summary>
      <div class="mobile-source-menu">
        ${renderSourceViewButtons("mobile-source-menu-item")}
      </div>
      <details class="mobile-section-navigation">
        <summary>${ui("plannerSectionNavigation")}</summary>
        <div class="mobile-section-actions">
          ${renderPlannerSectionButtons("mobile-section-item")}
        </div>
      </details>
      <div class="mobile-source-tools">
        <button type="button" data-action="open-announcement">${ui("announcementOpen")}</button>
        <button type="button" data-action="open-data-status">${ui("dataStatus")}</button>
        <button type="button" data-action="open-help">${ui("help")}</button>
        <label class="mobile-notice-toggle">
          <span>${ui("notice")}</span>
          <input type="checkbox" id="mobileNoticeToggle" aria-label="${ui("notice")}" ${state.showNotice ? "checked" : ""} />
        </label>
      </div>
      </details>
    </nav>
  `;
}

function selectedHeroTraitStages() {
  const model = state.heroTraitRuntime.model;
  const selectedHeroId = state.build.selections.hero?.[0];
  if (!model || !selectedHeroId) return new Map();
  if (isSs13PreviewHeroCatalogItem(findItemById(selectedHeroId))) return new Map();

  const hero = normalizeHeroTraitState(model, {
    ...(state.build.hero ?? {}),
    branchId: selectedHeroId,
    level: state.build.heroLevel ?? state.build.hero?.level ?? 90,
  });
  return new Map(
    getHeroTraitStageView(model, hero).map((stage) => [stage.requiredLevel, stage]),
  );
}

function renderHeroTraitStageSummary(level, stage) {
  const selectedOptions = (stage?.selectionGroups ?? [])
    .map((group) => group.options.find((option) => option.id === group.selectedChoiceId))
    .filter(Boolean);

  return `
    <button
      class="hero-trait-stage-summary ${level === 1 ? "is-level-one" : ""} ${selectedOptions.length ? "is-filled" : ""} ${stage?.locked ? "is-locked" : ""}"
      data-action="open-overlay"
      data-overlay="hero"
      data-category="hero"
      data-slot-index="0"
      data-mode="edit"
      data-stage-level="${level}"
    >
      <small>${ui("levelValue", { value: level })}</small>
      ${
        selectedOptions.length
          ? `<span class="hero-trait-stage-names">${selectedOptions
              .map((option) => {
                const name = runtimeLocaleField(option, "name", option.name || option.id);
                const description = runtimeLocaleField(option, "description", option.description || "");
                const iconUrl = option.localIconPath || option.iconUrl;
                return `<strong${description ? ` title="${escapeHtml(description)}"` : ""}>${renderItemIcon({ iconUrl }, "hero-trait-stage-icon")}<span>${escapeHtml(name)}</span></strong>`;
              })
              .join("")}</span>`
          : ""
      }
    </button>
  `;
}

function renderHeroPanel() {
  const selectedHeroItem = getSelectedItem("hero");
  const selectedHero = selectedHeroItem ? itemText(selectedHeroItem).name : "";
  const selectedHeroIsPreview = isSs13PreviewHeroCatalogItem(selectedHeroItem);
  const selectedHeroId = state.build.selections.hero?.[0];
  const heroBranch = state.heroTraitRuntime.model
    ? findHeroTraitBranch(state.heroTraitRuntime.model, selectedHeroId ?? state.build.hero?.branchId)
    : null;
  const heroName = heroBranch
    ? runtimeLocaleField(heroBranch, "name", selectedHero)
    : selectedHero;
  const heroTitle = heroBranch
    ? runtimeLocaleField(heroBranch, "title", selectedHero)
    : selectedHero;
  const heroPortraitUrl = getIngameHeroArt(selectedHeroId)
    ?? heroBranch?.portraitUrl
    ?? heroBranch?.portraitLocalPath
    ?? selectedHeroItem?.iconUrl
    ?? "";
  const traitStages = selectedHeroTraitStages();
  const selectedMemories = Array.from(
    { length: 3 },
    (_, index) => state.build.hero?.memories?.[index] ?? null,
  );
  const revivalSlotEffects = selectedMemories
    .map((memory) => getHeroMemoryRevivalSlotEffect(memory, state.heroMemoryRuntime.dataset))
    .filter(Boolean);
  const revivalSlotEffect = revivalSlotEffects.length === 1 ? revivalSlotEffects[0] : null;
  const revivalMemoryType = getHeroMemoryRevivalSlotTargetType(
    revivalSlotEffect,
    state.heroMemoryRuntime.dataset,
  );
  const revivalMemory = revivalSlotEffect
    ? reconcileHeroMemoryRevivalSlot(
      selectedMemories,
      state.build.hero?.revivalMemory,
      state.heroMemoryRuntime.dataset,
    )
    : null;
  const revivalSlotIndex = revivalMemoryType
    ? state.heroMemoryRuntime.dataset?.memoryTypes?.findIndex(
      ({ slotId }) => slotId === revivalMemoryType.slotId,
    )
    : -1;

  return `
    <section id="planner-section-hero" class="planner-section hero-section" tabindex="-1" aria-labelledby="planner-section-hero-heading" ${plannerPanelAttributes("hero")}>
      <h2 id="planner-section-hero-heading">${ui("heroAndMemory")}</h2>
      <details class="ingame-calculation-note"><summary>${calculationCopy("계산 지원 범위", "Calculation coverage")}</summary>
      <p class="calculation-limit-notice" data-role="hero-calculation-unsupported" role="note">${calculationCopy("TLIDB SS13 원문에서 대상·연산·수치가 확인된 특성·추억 효과만 계산합니다 · 나머지는 원인별 미지원", "Only trait and memory effects with verified TLIDB SS13 targets, operations, and values are calculated · the rest remain unsupported by reason")}</p>
      </details>
      <div class="hero-memory-grid">
        <div class="hero-card-wrap">
          <div class="hero-card ${selectedHero ? "is-filled" : "is-empty"} ${selectedHeroIsPreview ? "is-season-preview" : ""}">
            ${
              heroPortraitUrl
                ? `<img class="hero-icon" src="${escapeHtml(heroPortraitUrl)}" alt="" loading="lazy" />`
                : ""
            }
            ${selectedHero ? `<span class="hero-card-copy">
              <strong>${escapeHtml(heroName)}</strong>
              ${selectedHero ? `<small>${escapeHtml(heroTitle || selectedHero)}</small>` : ""}
              ${selectedHeroIsPreview ? `<small class="hero-season-label">${ui("ss13HeroPreviewNotApplied")}</small>` : ""}
            </span>` : ""}
            <button class="hero-card-change" data-action="open-overlay" data-overlay="hero" data-category="hero" data-slot-index="0" data-mode="choose">${ui("chooseHero")}</button>
          ${
            selectedHeroItem
              ? `
                <div class="hero-level-stepper">
                  <button data-action="hero-level" data-delta="-1" aria-label="${ui("heroLevelDecrease")}">−</button>
                  <span>${ui("levelValue", { value: state.build.heroLevel ?? 90 })}</span>
                  <button data-action="hero-level" data-delta="1" aria-label="${ui("heroLevelIncrease")}">+</button>
                </div>
              `
              : ""
          }
          </div>
        </div>
        <div class="hero-stage-grid">
          ${renderHeroTraitStageSummary(1, traitStages.get(1))}
          ${[45, 60, 75]
            .map(
              (level, index) => {
                const memory = selectedMemories[index];
                const memoryType = state.heroMemoryRuntime.dataset?.memoryTypes?.[index];
                const legacyItem = memory?.memoryTypeId ? findItemById(memory.memoryTypeId) : null;
                const memoryIconItem = legacyItem ?? findItemById(memoryType?.flatCatalogId);
                const label = memory
                  ? memoryType
                    ? heroMemoryTypeName(memoryType)
                    : legacyItem
                      ? itemText(legacyItem).name
                      : ui("heroMemory")
                  : ui("heroMemory");
                return `
                <div class="hero-trait-stage-row ${revivalSlotIndex === index ? "has-revival-extra-slot" : ""}">
                  ${renderHeroTraitStageSummary(level, traitStages.get(level))}
                  <button class="memory-slot hero-stage-memory-button ${memory ? "is-filled" : ""}" data-action="open-overlay" data-overlay="heroMemory" data-category="heroMemory" data-slot-index="${index}">
                    ${memory ? renderItemIcon(memoryIconItem ?? {}, "memory-icon") : ""}
                    <span>${escapeHtml(label)}</span>
                    <small>${ui("levelValue", { value: level })}</small>
                    <b>${memory ? "✓" : "+"}</b>
                  </button>
                  ${revivalSlotIndex === index
                    ? `<button
                        class="memory-slot hero-stage-memory-button hero-memory-revival-extra-slot ${revivalMemory ? "is-filled" : ""}"
                        data-action="open-overlay"
                        data-overlay="heroMemory"
                        data-category="heroMemory"
                        data-slot-index="3"
                      >
                        <span>${ui("heroMemoryRevivalExtraSlot")}</span>
                        <small>${ui("heroMemoryRevivalExtraSlotHint", {
                          type: heroMemoryTypeName(revivalMemoryType),
                          modifier: revivalSlotEffect.valueModifierPercent,
                        })}</small>
                        <b>${revivalMemory ? "✓" : "+"}</b>
                      </button>`
                    : ""}
                </div>
              `;
              },
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function skillSupportConfigurationSummary(supportSlot) {
  if (!supportSlot) return "";
  const config = supportSlot.config && typeof supportSlot.config === "object" ? supportSlot.config : {};
  const parts = [ui("levelValue", { value: supportSlot.level ?? SKILL_DEFAULT_LEVEL })];
  for (const value of [config.specialTier, config.activationMediumTier]) {
    if (typeof value === "string" && value && !parts.includes(value)) parts.push(value);
  }
  for (const value of Object.values(config.activationMediumTierByClause ?? {})) {
    if (typeof value === "string" && value && !parts.includes(value)) parts.push(value);
  }
  if (Number.isFinite(Number(config.specialLevel))) {
    parts.push(ui("specialLevelValue", { value: Number(config.specialLevel) }));
  }
  const rollCount = Object.keys(config.effectRollOverrides ?? {}).length;
  if (rollCount) parts.push(ui("skillConfiguredValues", { count: rollCount }));
  return parts.join(" · ");
}

function renderExternalSkillEvidence(externalMain) {
  const skill = externalMain?.skill;
  if (!skill) return "";
  const display = skillRuntimeDisplay(skill);
  const localeText = getTlidbLocaleText(skill, state.locale) ?? {};
  const sourceItem = findItemById(externalMain.sourceItemId);
  const sourceName = sourceItem ? itemText(sourceItem).name : externalMain.sourceItemId;
  const detail = presentSourceGameText(exactTlidbLocaleField(localeText, "detail", skill) ?? "", {
    locale: state.locale,
    optional: true,
  });
  const exactTags = exactTlidbLocaleField(localeText, "tags", skill);
  const tags = Array.isArray(exactTags)
    ? exactTags
        .map((tag) => presentSourceGameText(tag, { locale: state.locale, optional: true }))
        .filter(Boolean)
        .join(" · ")
    : "";
  const evidence = skill.raw?.localizationEvidence;
  const coefficientUnavailable = evidence?.status === "current-coefficient-unavailable";
  const separateMechanics = (skill.raw?.separateMechanicRecords ?? []).map((record) => {
    const localized = getExactBarrierBurstMechanicLocale(record, state.locale);
    if (!localized) return "";
    const mechanicTags = localized.tags
      .map((tag) => presentSourceGameText(tag, { locale: state.locale, optional: true }))
      .filter(Boolean)
      .join(" · ");
    return `
      <article class="external-skill-separate-mechanic" data-role="external-skill-separate-mechanic">
        <header>
          <strong>${escapeHtml(localized.name)}</strong>
          <b>${calculationCopy("별도 공식 스킬 기록 · 일반 장벽 폭발 계수로 미적용", "Separate official skill record · not applied to regular Barrier Burst")}</b>
        </header>
        <p>${escapeHtml(localized.detail)}</p>
        ${mechanicTags ? `<small>${escapeHtml(mechanicTags)}</small>` : ""}
        <a href="${escapeHtml(localized.sourceUrl)}" target="_blank" rel="noopener noreferrer">${ui("externalSkillSourceLink")}</a>
      </article>
    `;
  }).join("");
  return `
    <section class="external-skill-evidence" data-skill-id="${escapeHtml(skill.id)}">
      <header>
        <div>
          <small>${ui("externalSkillSource")}</small>
          <strong>${escapeHtml(display.name)} · ${ui("levelValue", { value: externalMain.level })}</strong>
          <span>${ui("externalSkillDerivedFrom", { name: escapeHtml(sourceName) })}</span>
        </div>
        ${coefficientUnavailable ? `<b>${ui("externalSkillCoefficientUnavailable")}</b>` : ""}
      </header>
      ${coefficientUnavailable ? `<p class="external-skill-conflict">${ui("externalSkillCoefficientUnavailable")}</p>` : ""}
      ${detail ? `<p class="external-skill-description">${escapeHtml(detail)}</p>` : ""}
      ${tags ? `<p class="external-skill-tags"><span>${ui("externalSkillTags")}</span> ${escapeHtml(tags)}</p>` : ""}
      ${localeText.sourceUrl ? `<a href="${escapeHtml(localeText.sourceUrl)}" target="_blank" rel="noopener noreferrer">${ui("externalSkillSourceLink")}</a>` : ""}
      ${separateMechanics}
    </section>
  `;
}

function renderSkillRows() {
  const selectedSkills = getSelectedItemsFor("skills");
  const selectedSupports = getSelectedItemsFor("supports");
  const calculatedRows = state.isStale ? [] : state.lastSkillRows;
  const runtimeSkills = state.skillRuntime.model
    ? normalizeCurrentSkillRuntimeState(state.skillRuntime.model)
    : state.build.skills;
  const externalCore = getExternalMainSkillOverride(
    state.skillRuntime.model,
    state.build,
    "active",
    0,
  );
  const renderSkillRow = (rowIndex) => {
    const kind = rowIndex > 4 ? "passive" : "active";
    const runtimeRowIndex = rowIndex > 4 ? rowIndex - 5 : rowIndex;
    const runtimeSlot = runtimeSkills?.[kind]?.[runtimeRowIndex];
    const unlockedSupportCount = Number.isInteger(runtimeSlot?.unlockedSupportCount)
      ? runtimeSlot.unlockedSupportCount
      : kind === "active" ? 1 : 0;
    const externalMain = rowIndex === 0 && externalCore?.skill ? externalCore : null;
    const mainSkill = externalMain
      ? externalCore.skill
      : selectedSkills[rowIndex];
    const mainDisplay = skillRuntimeDisplay(mainSkill);
    const mainLevel = externalMain
      ? externalCore.level
      : runtimeSlot?.level ?? state.build.skillLevels?.[rowIndex] ?? SKILL_DEFAULT_LEVEL;
    const mainTitle = mainSkill
      ? `${mainDisplay.name} · ${ui("levelValue", { value: mainLevel })}`
      : ui("openSkill");
    const calculatedRow = kind === "passive"
      ? state.isStale
        ? null
        : state.lastCalculation?.passiveRows?.find((candidate) => candidate.rowIndex === rowIndex)
      : calculatedRows.find((candidate) => candidate.rowIndex === rowIndex);
    const calculationStatus = !mainSkill || !calculatedRow
      ? ""
      : kind === "passive"
        ? calculatedRow.sealCalculationSupported
          ? calculationCopy(
              `봉인 ${formatNumber(calculatedRow.sealedManaPercent)}%${calculatedRow.auraCalculationSupported ? ` · 효과 ${calculatedRow.auraEffectCount}개 반영` : " · 일부 효과 미지원"}`,
              `Sealed ${formatNumber(calculatedRow.sealedManaPercent)}%${calculatedRow.auraCalculationSupported ? ` · ${calculatedRow.auraEffectCount} effect(s) applied` : " · some effects unsupported"}`,
            )
          : calculationCopy("봉인 계산 미지원", "Seal calculation unsupported")
        : calculatedRow.calculationSupported
          ? calculationCopy(`계산됨 ${formatNumber(calculatedRow.dps)}`, `Calculated ${formatNumber(calculatedRow.dps)}`)
          : calculationCopy("미지원 입력 있음", "Unsupported input");
    const slotLabel = rowIndex === 0
      ? ui("skillCore")
      : kind === "active"
        ? ui("skillActiveNumber", { index: runtimeRowIndex + 1 })
        : ui("skillPassiveNumber", { index: runtimeRowIndex + 1 });
    const mainAriaLabel = `${slotLabel}: ${mainTitle}`;
    const mainActionAttributes = externalMain
      ? `data-action="open-overlay" data-overlay="skillEditor"`
      : `data-action="open-skill-summary-picker" data-kind="${kind}" data-row-index="${runtimeRowIndex}"`;

    return `
      <div class="skill-row ${rowIndex === 0 ? "primary" : ""} ${rowIndex > 4 ? "secondary" : ""}" data-row-index="${rowIndex}" id="skill-loadout-${rowIndex}" role="tabpanel" aria-labelledby="skill-loadout-tab-${rowIndex}" ${state.activeSkillRow === rowIndex ? "" : "hidden"}>
        <div class="skill-row-heading"><strong>${slotLabel}</strong>${calculationStatus ? `<small>${escapeHtml(calculationStatus)}</small>` : ""}</div>
        <div class="skill-summary-selection">
          <svg class="skill-link-lines" viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden="true"><path d="M300 270 L300 65 M300 270 L115 190 M300 270 L485 190 M300 270 L165 420 M300 270 L435 420" /><path class="skill-link-perimeter" d="M300 65 L485 190 L435 420 L165 420 L115 190 Z" /></svg>
          <div class="skill-summary-main">
            <button class="hex-slot ${mainSkill ? "is-filled" : ""} ${externalMain ? "is-external" : ""}" title="${escapeHtml(mainTitle)}" aria-label="${escapeHtml(mainAriaLabel)}" ${mainActionAttributes}>${mainSkill ? renderItemIcon({ iconUrl: mainDisplay.iconUrl }, "skill-icon") : "+"}</button>
            ${mainSkill ? `<span title="${escapeHtml(mainTitle)}"><strong>${escapeHtml(mainDisplay.name)}</strong><small>${ui("levelValue", { value: mainLevel })}${externalMain ? ` · ${ui("externalSkillCoefficientUnavailable")}` : ""}</small></span>` : `<span>${ui("openSkill")}</span>`}
          </div>
          <div class="skill-summary-supports">
            ${Array.from({ length: 5 }, (_, supportIndex) => {
              const support = selectedSupports[rowIndex * 5 + supportIndex];
              const supportSlot = runtimeSlot?.supports?.[supportIndex];
              const unlocked = supportIndex < unlockedSupportCount;
              if (!unlocked) return `<div class="support-slot is-locked" data-support-position="${supportIndex}" title="${ui("skillUnlockedSupports")}" aria-hidden="true">╱</div>`;
              const supportName = support ? itemText(support).name : ui("openSupport", { index: supportIndex + 1 });
              const supportSummary = skillSupportConfigurationSummary(supportSlot);
              const supportAriaLabel = `${slotLabel}: ${supportName}${support ? ` · ${supportSummary}` : ""}`;
              return `
                <div class="skill-summary-support-item" data-support-position="${supportIndex}">
                  <button class="support-slot ${support ? "is-filled" : ""}" title="${escapeHtml(support ? `${supportName} · ${supportSummary}` : supportName)}" aria-label="${escapeHtml(supportAriaLabel)}" data-action="open-skill-summary-picker" data-kind="${kind}" data-row-index="${runtimeRowIndex}" data-support-index="${supportIndex}">${support ? renderItemIcon(support, "support-icon") : "+"}${support ? `<span>${ui("levelValue", { value: supportSlot?.level ?? SKILL_DEFAULT_LEVEL })}</span>` : ""}</button>
                  ${support ? `<small title="${escapeHtml(supportName)}">${escapeHtml(supportName)}</small>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  };

  return `
    <section id="planner-section-skills" class="planner-section skill-section" tabindex="-1" aria-labelledby="planner-section-skills-heading" ${plannerPanelAttributes("skills")}>
      <div class="section-head"><h2 id="planner-section-skills-heading">${ui("skills")}</h2><button class="workspace-edit-button" data-action="open-overlay" data-overlay="skillEditor">${calculationCopy("연결·레벨 편집", "Edit links and levels")}</button></div>
      <p class="workspace-hint">${calculationCopy("왼쪽에서 스킬을 고르고 중앙의 스킬과 주변 보조 슬롯을 눌러 편집하세요.", "Choose a skill on the left, then edit the central skill and its surrounding supports.")}</p>
      <details class="ingame-calculation-note"><summary>${calculationCopy("계산 지원 범위", "Calculation coverage")}</summary>
      <p class="calculation-limit-notice" data-role="skill-calculation-unsupported" role="note">${calculationCopy("TLIDB SS13 원문과 도움말 공식으로 선택한 스킬 행을 계산합니다. 필요한 무기·롤·타격 수·중첩·조건이 없으면 해당 행에 미지원 입력으로 표시합니다.", "Selected skill rows use TLIDB SS13 text and Help formulas. Missing weapons, rolls, hit counts, stacks, or conditions are shown as unsupported inputs for that row.")}</p>
      </details>
      <div class="ingame-skills">
      <nav class="ingame-skill-rail" role="tablist" aria-label="${ui("skills")}" aria-orientation="vertical">
        ${Array.from({ length: 9 }, (_, rowIndex) => {
          const item = rowIndex === 0 && externalCore?.skill ? externalCore.skill : selectedSkills[rowIndex];
          const display = skillRuntimeDisplay(item);
          const slotLabel = rowIndex === 0 ? ui("skillCore") : rowIndex < 5 ? ui("skillActiveNumber", { index: rowIndex + 1 }) : ui("skillPassiveNumber", { index: rowIndex - 4 });
          return `<button type="button" id="skill-loadout-tab-${rowIndex}" role="tab" aria-selected="${state.activeSkillRow === rowIndex}" aria-controls="skill-loadout-${rowIndex}" tabindex="${state.activeSkillRow === rowIndex ? 0 : -1}" data-action="select-skill-row" data-row-index="${rowIndex}" aria-label="${escapeHtml(`${slotLabel}: ${item ? display.name : ui("openSkill")}`)}"><span class="ingame-rail-icon">${item ? renderItemIcon({ iconUrl: display.iconUrl }, "skill-icon") : "+"}</span><span>${escapeHtml(item ? display.name : slotLabel)}</span></button>`;
        }).join("")}
      </nav>
      <div class="skill-board">
        ${renderSkillRow(0)}
        <div class="skill-row-pairs is-active">
          ${[1, 2, 3, 4].map(renderSkillRow).join("")}
        </div>
        <div class="skill-row-pairs is-passive">
          ${[5, 6, 7, 8].map(renderSkillRow).join("")}
        </div>
      </div>
      </div>
    </section>
  `;
}

function renderGearPanel() {
  const selectedGear = getSelectedItemsFor("gear");
  const heroItem = getSelectedItem("hero");
  const heroBranch = state.heroTraitRuntime.model
    ? findHeroTraitBranch(state.heroTraitRuntime.model, heroItem?.id ?? state.build.hero?.branchId)
    : null;
  const portrait = getIngameHeroArt(heroItem?.id) || heroBranch?.portraitUrl || heroItem?.iconUrl || heroBranch?.portraitLocalPath;

  return `
    <section id="planner-section-gear" class="planner-section gear-section" tabindex="-1" aria-labelledby="planner-section-gear-heading" ${plannerPanelAttributes("gear")}>
      <h2 id="planner-section-gear-heading">${ui("gear")}</h2>
      <p class="workspace-hint">${calculationCopy("부위를 선택해 장비를 바꾸거나 옵션 수치와 침식을 편집하세요.", "Select a slot to change equipment, rolls, or corrosion.")}</p>
      <div class="gear-loadout">
        <div class="ingame-character">
          ${portrait ? renderItemIcon({ iconUrl: portrait }, "ingame-character-art") : `<div class="ingame-character-empty" aria-hidden="true">◇</div>`}
          <div class="ingame-character-name"><strong>${escapeHtml(heroItem ? itemText(heroItem).name : ui("chooseHero"))}</strong><span>${ui("levelValue", { value: state.build.heroLevel ?? 90 })}</span><button type="button" data-action="open-overlay" data-overlay="hero" data-category="hero" data-slot-index="0" data-mode="choose">${ui("chooseHero")}</button></div>
        </div>
        ${GEAR_SLOT_KEYS
          .map(
            (slot, index) => {
              const item = selectedGear[index];
              const name = item ? itemText(item).name : "";
              return `
              <button class="gear-slot ${item ? "is-filled" : ""} ${isGearReadOnlyItem(item) ? "is-read-only" : ""} ${isGearSelectionOnlyItem(item) ? "is-selection-only" : ""}" data-action="open-overlay" data-overlay="gear" data-category="gear" data-slot-index="${index}" data-slot="${slot}" title="${escapeHtml(`${ui(slot)}${name ? ` · ${name}` : ""}`)}">
                <span>${ui(slot)}</span>
                ${item ? `<strong>${escapeHtml(name)}</strong>` : ""}
                <b>${item?.iconUrl ? renderItemIcon(item, "slot-icon") : item ? "✓" : "+"}</b>
                ${isGearReadOnlyItem(item) ? `<small class="gear-read-only-summary" data-role="gear-read-only-summary">${escapeHtml(gearReadOnlyCopy("summary"))}</small>` : ""}
                ${isGearSelectionOnlyItem(item) ? `<small class="gear-selection-only-summary" data-role="gear-selection-only-summary">${escapeHtml(gearSelectionOnlyCopy("summary"))}</small>` : ""}
              </button>
            `;
            },
          )
          .join("")}
        <div class="gear-actions">
          <button class="craft-button" data-action="open-overlay" data-overlay="gear" data-mode="craft">${ui("craftNewItem")}</button>
          <button class="craft-button" data-action="open-overlay" data-overlay="inventory">${ui("inventory", { count: state.unifiedInventory.length })}</button>
        </div>
      </div>
    </section>
  `;
}

function renderTalentAndSlate() {
  const talentModel = state.talentRuntime.status === "ready" ? state.talentRuntime.model : null;
  const talentBoards = Array.from(
    { length: 4 },
    (_, boardIndex) => state.build.talents?.boards?.[boardIndex] ?? null,
  );
  const baseBoard = talentBoards[0];
  const baseTree = talentModel?.treeBySlug?.get(baseBoard?.treeSlug);
  const baseCoreTalents = (baseBoard?.coreTalentIds ?? [])
    .slice(0, 2)
    .map((coreTalentId) => (
      talentModel?.coreTalentByFlatItemId?.get(coreTalentId)
      ?? talentModel?.coreTalentById?.get(coreTalentId)
      ?? null
    ));
  const renderTalentSummaryNode = (boardIndex, item, slotLabel) => {
    const iconUrl = item?.kind === "god" || item?.kind === "profession"
      ? talentTreeIcon(item)
      : item?.iconUrl || item?.localIconPath || "";
    const label = item
            ? presentCatalogGameText({
          value: item.name,
          itemId: item.flatItemId,
          categoryId: "talents",
          sourceUrl: item.sourceUrl,
          field: "name",
        })
      : slotLabel;
    const accessibleLabel = item ? `${slotLabel}: ${label}` : slotLabel;
    return `
      <button class="talent-summary-node ${item ? "is-filled" : ""}"
        data-role="talent-board-summary" data-action="open-overlay"
        data-overlay="talentEditor" data-slot-index="${boardIndex}"
        aria-label="${escapeHtml(accessibleLabel)}" title="${escapeHtml(accessibleLabel)}">
        <span class="talent-summary-icon" aria-hidden="true">${
          iconUrl
            ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span hidden>◇</span>`
            : item ? "◇" : "+"
        }</span>
        <small class="talent-summary-slot-label">${escapeHtml(slotLabel)}</small>
        <strong class="talent-summary-name">${escapeHtml(item ? label : "선택하기")}</strong>
      </button>
    `;
  };
  const divinityBoard = currentDivinityBoard();
  const divinityInstanceById = new Map(
    (divinityBoard.slateInventory ?? []).map((instance) => [instance.instanceId, instance]),
  );
  const divinityCellByPosition = new Map(
    (divinityBoard.cells ?? []).map((cell) => [`${cell.x}:${cell.y}`, cell.slateInstanceId]),
  );
  const labeledSlateInstances = new Set();
  const expandIcon = `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6"></circle><path d="m13.5 13.5 4 4"></path></svg>`;

  return `
    <div class="two-column-sections">
      <section id="planner-section-talents" class="planner-section talent-section" tabindex="-1" aria-labelledby="planner-section-talents-heading" ${plannerPanelAttributes("talents")}>
        <div class="section-head">
          <h2 id="planner-section-talents-heading">${ui("talents")}</h2>
          <button class="section-expand" data-action="open-overlay" data-overlay="talentEditor" aria-label="${ui("expand")}">${expandIcon}</button>
        </div>
        <div class="talent-summary-topology" aria-label="${ui("talents")}">
          <div class="talent-summary-row is-base">
            ${renderTalentSummaryNode(0, baseTree, `${ui("talentTree")} 1`)}
            ${renderTalentSummaryNode(0, baseCoreTalents[0], `${ui("talentCore")} 1`)}
            ${renderTalentSummaryNode(0, baseCoreTalents[1], `${ui("talentCore")} 2`)}
          </div>
          ${[1, 2, 3].map((boardIndex) => `
            <div class="talent-summary-row is-sub">
              <span class="talent-summary-marker" aria-hidden="true">◇</span>
              ${renderTalentSummaryNode(
                boardIndex,
                talentModel?.treeBySlug?.get(talentBoards[boardIndex]?.treeSlug),
                `${ui("talentTree")} ${boardIndex + 1}`,
              )}
            </div>
          `).join("")}
        </div>
      </section>
      <section id="planner-section-slates" class="planner-section slate-section" tabindex="-1" aria-labelledby="planner-section-slates-heading" ${plannerPanelAttributes("slates")}>
        <div class="section-head">
          <h2 id="planner-section-slates-heading">${ui("slates")}</h2>
          <button class="section-expand" data-action="open-overlay" data-overlay="divinity" aria-label="${ui("expand")}">${expandIcon}</button>
        </div>
        <button class="slate-board divinity-summary-board ${divinityBoard.cells?.length ? "is-filled" : ""}"
          aria-label="${ui("openSlate")}" data-action="open-overlay" data-overlay="divinity">
          ${Array.from({ length: 36 }, (_, index) => {
            const x = index % 6;
            const y = Math.floor(index / 6);
            const instanceId = divinityCellByPosition.get(`${x}:${y}`);
            const instance = divinityInstanceById.get(instanceId);
            const template = instance ? getDivinitySlateTemplate(instance.slateId) : null;
            const showLabel = Boolean(instance && !labeledSlateInstances.has(instance.instanceId));
            if (showLabel) labeledSlateInstances.add(instance.instanceId);
            return `
              <span class="slate-cell ${instance ? "is-filled" : ""}"
                data-mask-active="${divinityBoard.mask?.[y]?.[x] ?? DIVINITY_BOARD_MASK[y][x]}"
                ${instanceId ? `data-instance-id="${escapeHtml(instanceId)}"` : ""}
                title="${escapeHtml(template ? presentCatalogGameText({
                  value: template.name,
                  categoryId: "slates",
                  templateId: template.id,
                  field: "name",
                }) : ui("openSlate"))}">
                ${showLabel ? `<small>${escapeHtml(presentCatalogGameText({
                  value: template?.shortName ?? template?.name ?? "",
                  categoryId: "slates",
                  templateId: template?.id,
                  field: "name",
                }))}</small>` : ""}
              </span>
            `;
          }).join("")}
        </button>
      </section>
    </div>
  `;
}

function renderSpiritDestiny() {
  const model = state.pactRuntime.status === "ready" ? state.pactRuntime.model : null;
  const pact = model ? currentPactEditorState(model) : state.build.pact;
  const slots = Array.isArray(pact?.slots) ? pact.slots : [];
  const fallbackView = (instance) => {
    const item = findItemById(instance?.spiritId ?? instance?.destinyId);
    return item ? {
      name: itemText(item).name,
      iconUrl: item.iconUrl,
      structureSupported: false,
    } : null;
  };
  const selectedSpirits = slots.map((slot) => (
    model ? getPactSpiritView(model, slot?.spirit) : fallbackView(slot?.spirit)
  ));
  const destinyView = (instance, slotType) => (
    model ? getDestinyView(model, instance, slotType) : fallbackView(instance)
  );
  const unresolvedLabel = (instance) => {
    const source = instance?.source;
    const candidates = typeof source === "string"
      ? [source, instance?.name, instance?.tooltip]
      : [
        source?.name,
        source?.title,
        source?.tooltip,
        source?.effect,
        source?.description,
        source?.text,
        instance?.name,
        instance?.tooltip,
      ];
    const sourceText = candidates.find((value) => (
      typeof value === "string" && value.trim() !== ""
    )) ?? "원문 표기 없음";
    return `[미검증] ${presentCatalogGameText({ value: sourceText, field: "detail" })}`;
  };
  const installedDestinies = slots.flatMap((slot) => [
    ...PACT_RING_SLOT_ORDER.map((ringSlotId) => ({
      slotType: getPactRingSlotType(ringSlotId),
      instance: slot?.rings?.[ringSlotId]?.installedDestiny ?? null,
    })),
    ...(Array.isArray(slot?.undeterminedFate?.slots) ? slot.undeterminedFate.slots : []).map((child) => ({
      slotType: child?.slotType,
      instance: child?.installedDestiny ?? child?.destiny ?? null,
    })),
  ]);
  for (const [slotType, field] of [["micro", "smallSlots"], ["medium", "mediumSlots"]]) {
    for (const instance of pact?.legacyUnassigned?.[field] ?? []) {
      installedDestinies.push({ slotType, instance });
    }
  }
  const legacyUndetermined = Array.isArray(pact?.legacyUnassigned?.undetermined)
    ? pact.legacyUnassigned.undetermined
    : [];
  for (const undetermined of legacyUndetermined) {
    for (const child of Array.isArray(undetermined?.slots) ? undetermined.slots : []) {
      installedDestinies.push({
        slotType: child?.slotType,
        instance: child?.installedDestiny ?? child?.destiny ?? null,
      });
    }
  }
  const smallDestinyCount = installedDestinies.filter(({ slotType, instance }) => (
    slotType === "micro" && instance
  )).length;
  const mediumDestinyCount = installedDestinies.filter(({ slotType, instance }) => (
    slotType === "medium" && instance
  )).length;
  const capacity = getPactDestinyCapacity(pact);
  const sourceOnlyDestinyNames = (pact?.sourceOnlyDestinyIds ?? []).map((destinyId) => {
    const record = model?.sourceOnlyDestinies?.find(({ id }) => id === destinyId);
    if (record) return presentCatalogGameText({
      value: record.name,
      categoryId: "destiny",
      sourceUrl: record.sourceUrl,
      itemId: record.catalogId || record.id,
      field: "name",
    });
    const item = findItemById(destinyId);
    return item ? itemText(item).name : "";
  }).filter(Boolean);
  return `
    <section id="planner-section-spirits" class="planner-section spirit-section" tabindex="-1" aria-labelledby="planner-section-spirits-heading" ${plannerPanelAttributes("spirits")}>
      <h2 id="planner-section-spirits-heading">${ui("spiritsAndDestiny")}</h2>
      <div class="ingame-pact-summary">${renderPactConnections()}
      ${Array.from({ length: 3 }, (_, index) => {
        const spirit = selectedSpirits[index];
        const slot = slots[index];
        const spiritInstance = slot?.spirit ?? null;
        const hasSpirit = Boolean(spiritInstance);
        const undeterminedSlots = Array.isArray(slot?.undeterminedFate?.slots) ? slot.undeterminedFate.slots : [];
        const spiritName = spirit?.name
          ? presentCatalogGameText({
              value: spirit.name,
              categoryId: "spirits",
              sourceUrl: spirit.sourceUrl,
                field: "name",
              })
            : (hasSpirit ? unresolvedLabel(spiritInstance) : ui("chooseSpirit"));
        return `
        <div class="spirit-row-wrap pact-summary-spirit ${hasSpirit ? "has-spirit" : "is-empty"}" data-pact-summary-slot="spirit-${index}">
          <button class="spirit-row ${hasSpirit ? "is-filled" : ""}" style="${pactPointStyle(index, -1)}" data-action="open-overlay" data-overlay="pact" data-slot-index="${index}" aria-label="${escapeHtml(ui("pactSpiritSlotLabel", { index: index + 1, name: spiritName }))}">
            ${spirit?.iconUrl ? `<img class="spirit-icon" src="${escapeHtml(spirit.iconUrl)}" alt="" loading="lazy" />` : `<span>${hasSpirit ? "✓" : "+"}</span>`}
            <small>정령 ${index + 1}${spirit?.level ? ` · 레벨 ${spirit.level}` : ""}</small><strong>${escapeHtml(spiritName)}</strong>
          </button>
          ${hasSpirit && spirit?.structureSupported !== false ? `
            <div class="pact-summary-rings">
              ${getPactSpiritRingSlotOrder(spirit).map((ringSlotId, ringIndex) => {
                const slotType = getPactRingSlotType(ringSlotId);
                const ringOrdinal = PACT_RING_SLOT_ORDER.filter((id) => getPactRingSlotType(id) === slotType).indexOf(ringSlotId) + 1;
                const instance = slot?.rings?.[ringSlotId]?.installedDestiny ?? null;
                const destiny = destinyView(instance, slotType);
                const hasDestiny = Boolean(instance);
                const destinyName = destiny?.name
                  ? presentCatalogGameText({
                      value: destiny.name,
                      categoryId: "destiny",
                      sourceUrl: destiny.sourceUrl,
                      field: "name",
                    })
                  : (hasDestiny ? unresolvedLabel(instance) : "+");
                return `
                  <button class="destiny-slot ${slotType === "micro" ? "small" : "medium"} ${hasDestiny ? "is-filled" : ""}"
                    style="${pactPointStyle(index, ringIndex)}" title="${escapeHtml(destinyName)}"
                    data-action="open-overlay" data-overlay="pact" data-slot-index="${index}" data-ring-slot-id="${ringSlotId}"
                    aria-label="${escapeHtml(ui("pactDestinySlotLabel", { index: index + 1, type: `${ui(slotType === "micro" ? "smallDestiny" : "mediumDestiny")} ${ringOrdinal}`, name: destinyName }))}"
                    data-pact-summary-slot="${escapeHtml(slot?.slotId ?? `slot${index + 1}`)}:${ringSlotId}">
                    <span>${slotType === "micro" ? "I" : "II"} · ${ringOrdinal}</span>
                    ${destiny?.iconUrl ? `<img class="destiny-icon" src="${escapeHtml(destiny.iconUrl)}" alt="" loading="lazy" />` : ""}
                    <strong>${escapeHtml(destinyName)}</strong>
                    ${destiny?.calculationSupported === false ? `
                      <small class="pact-source-support-badge" data-role="pact-summary-destiny-calculation-unsupported">계산 미지원</small>
                    ` : ""}
                  </button>
                `;
              }).join("")}
            </div>
            <button class="pact-summary-undetermined" data-action="open-overlay" data-overlay="pact"
              style="${pactPointStyle(index, 9)}" title="미정 숙명"
              data-slot-index="${index}" data-ring-slot-id="undetermined"
              aria-label="계약 슬롯 ${index + 1} 미정 숙명">
              <strong>미정 숙명 · ${slot?.undeterminedFate?.unresolved ? "미검증" : `${undeterminedSlots.length}개 슬롯`}</strong>
              <span>${undeterminedSlots.map((child) => {
                const instance = child?.installedDestiny ?? child?.destiny;
                const view = destinyView(instance, child?.slotType);
                return view ? presentCatalogGameText({ value: view.name, categoryId: "destiny", sourceUrl: view.sourceUrl, field: "name" })
                  : instance ? unresolvedLabel(instance) : "빈 슬롯";
              }).map(escapeHtml).join(" · ") || "슬롯 설정하기"}</span>
            </button>
          ` : hasSpirit && spirit?.structureSupported === false ? `
            <div class="pact-summary-source-only" data-role="pact-summary-source-only">
              <small class="pact-source-support-badge" data-role="pact-summary-spirit-structure-unsupported">구조·계산 미지원</small>
              <span>TLIDB SS13 한국어 원문만 표시합니다.</span>
            </div>
          ` : ""}
        </div>
      `;
      }).join("")}
      </div><div class="destiny-counts">
        <strong>${ui("smallDestiny")}: <b>${smallDestinyCount} / ${capacity.micro}</b></strong>
        <strong>${ui("mediumDestiny")}: <b>${mediumDestinyCount} / ${capacity.medium}</b></strong>
      </div>
      ${sourceOnlyDestinyNames.length ? `
        <div class="pact-summary-source-only-destinies" data-role="pact-summary-source-only-destinies">
          <strong>구조·계산 미지원 운명</strong>
          ${sourceOnlyDestinyNames.map((name) => `
            <span data-role="pact-summary-source-only-destiny">
              ${escapeHtml(name)}
              <small class="pact-source-support-badge" data-role="pact-summary-source-support-badge">구조·계산 미지원</small>
            </span>
          `).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function renderCustomAffixes() {
  const customAffix = customAffixEditorPresentation(
    state.build.customAffixes ?? "",
    ui("customAffixPlaceholder"),
  );
  return `
    <section id="planner-section-custom" class="planner-section custom-section" tabindex="-1" aria-labelledby="planner-section-custom-heading" ${plannerPanelAttributes("custom")}>
      <h2 id="planner-section-custom-heading">${ui("customAffixes")}</h2>
      <p class="workspace-input-help">${calculationCopy("직접 추가할 옵션을 한 줄씩 입력하고 입력 옵션 계산으로 결과를 확인하세요. 인식하지 못한 문구는 계산에 반영되지 않습니다.", "Enter one additional modifier per line, then calculate to check the result. Unrecognized text is not included in the calculation.")}</p>
      <label for="customAffixes">${ui("oneLineEach")}</label>
      <textarea id="customAffixes" placeholder="${escapeHtml(customAffix.placeholder)}">${escapeHtml(customAffix.value)}</textarea>
      <div class="workspace-input-actions">
        <button class="primary" data-action="custom-affixes-calculate">${calculationCopy("입력 옵션 계산", "Calculate with these modifiers")}</button>
        <button data-action="save">${calculationCopy("현재 빌드 저장", "Save current build")}</button>
      </div>
      <p class="workspace-input-help">${calculationCopy("입력 내용은 이 브라우저에 자동 보관됩니다. 저장 목록에 남기려면 현재 빌드 저장을 누르세요.", "Edits are kept in this browser. Save the current build to keep a snapshot in your saved builds.")}</p>
    </section>
  `;
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderResearchSourcePreview(sources) {
  const links = sources
    .map((source) => [source, safeHttpUrl(source)])
    .filter(([, href]) => href);
  const invalidCount = sources.length - links.length;
  return `
    ${links.length ? `<ul class="research-source-links">${links.map(([source, href]) => `<li><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a></li>`).join("")}</ul>` : ""}
    ${invalidCount ? `<p class="research-source-warning">${calculationCopy(`주소 형식 확인 필요 ${invalidCount}개 · 입력한 내용은 보존됩니다.`, `${invalidCount} entries need a valid URL · your text is preserved.`)}</p>` : ""}
  `;
}

function renderResearchPanel() {
  const research = state.build.research ?? { season: "", sources: [], notes: "" };
  const sources = Array.isArray(research.sources) ? research.sources : [];
  return `
    <section id="planner-section-research" class="planner-section custom-section research-section" tabindex="-1" aria-labelledby="planner-section-research-heading" ${plannerPanelAttributes("research")}>
      <h2 id="planner-section-research-heading">${ui("research")}</h2>
      <div class="research-record">
        <div class="research-record-season">
          <label for="researchSeason">${ui("researchSeason")}</label>
          <input id="researchSeason" value="${escapeHtml(research.season ?? "")}" />
        </div>
        <p class="workspace-input-help">${calculationCopy("시즌·출처·메모를 현재 빌드와 함께 기록합니다. 대상 시즌은 연구용 메모이며 계산 시즌을 바꾸지 않습니다.", "Keep the season, sources and notes with this build. The season label is a research note and does not change the calculation season.")}</p>
        <div class="research-record-fields">
          <div>
            <label for="researchSources">${ui("researchSources")}</label>
            <textarea id="researchSources" placeholder="https://tlidb.com/ko/">${escapeHtml(sources.join("\n"))}</textarea>
            <div id="researchSourcePreview">${renderResearchSourcePreview(sources)}</div>
          </div>
          <div>
            <label for="researchNotes">${ui("researchNotes")}</label>
            <textarea id="researchNotes" placeholder="${escapeHtml(ui("researchNotesPlaceholder"))}">${escapeHtml(research.notes ?? "")}</textarea>
          </div>
        </div>
        <div class="workspace-input-actions"><button class="primary" data-action="save">${calculationCopy("현재 빌드 저장", "Save current build")}</button></div>
        <p class="workspace-input-help">${calculationCopy("입력 내용은 이 브라우저에 자동 보관됩니다. 저장 목록에 남기려면 현재 빌드 저장을 누르세요.", "Edits are kept in this browser. Save the current build to keep a snapshot in your saved builds.")}</p>
      </div>
      ${renderBuildAdvisor({ records: state.unifiedInventory, savedBuilds: state.savedBuilds,
        preferences: state.advisorPreferences,
        showSeasonPreview: state.advisorSeasonPreviewOpen,
        showWeightResearch: state.advisorWeightResearchOpen,
        savedSeasonComparison: state.advisorSavedSeasonComparison,
        seasonResearch: { draft: state.advisorMigrationDraft, copies: state.advisorSeasonResearch.copies,
          storageError: state.advisorSeasonResearch.error,
          workspace: { documents: state.advisorSeasonWorkspaces.documents, error: state.advisorSeasonWorkspaces.error,
            document: state.advisorWorkspace, dirty: state.advisorWorkspaceDirty, inputStale: state.advisorWorkspaceInputStale,
            formValues: state.advisorWorkspaceFormValues, importText: state.advisorWorkspaceImportText,
            currentBuild: state.build, configurationDraft: state.advisorConfigurationDraft,
            recommendationMetric: state.advisorWorkspaceRecommendationMetric },
          stale: Boolean(state.advisorMigrationDraft && JSON.stringify(state.advisorMigrationDraft.sourceBuild) !== JSON.stringify(state.build)) },
        seasonImpact: state.advisorSeasonPreviewOpen && state.advisorPreferences.seasonImpactRequested ? buildSeasonImpact(state.build) : null,
        diagnosis: state.advisorBuildKey === JSON.stringify(normalizeBuild(state.build)) ? state.advisorDiagnosis : null,
        comparison: state.advisorBuildKey === JSON.stringify(normalizeBuild(state.build)) ? state.advisorComparison : null,
        result: state.advisorResult, error: state.advisorError,
        stale: state.advisorResult?.buildKey !== JSON.stringify(normalizeBuild(state.build)),
        itemName: (id) => findItemById(id) ? itemText(findItemById(id)).name : "장비 정보 미제공" })}
    </section>
  `;
}

function focusAdvisorResult(selector) {
  const target = document.querySelector(selector);
  target?.focus?.({ preventScroll: true });
  target?.scrollIntoView?.({ block: "center" });
}

function conditionPathSegments(path) {
  const segments = String(path ?? "").split(".").filter(Boolean);
  return segments.some((segment) => BLOCKED_CONDITION_KEYS.has(segment)) ? [] : segments;
}

function readConditionPath(record, path) {
  const segments = conditionPathSegments(path);
  if (!segments.length) return undefined;
  let current = record;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function hasConditionPath(record, path) {
  return readConditionPath(record, path) !== undefined;
}

function setConditionPath(record, path, value) {
  const segments = conditionPathSegments(path);
  let current = record;
  for (const segment of segments.slice(0, -1)) {
    if (!current[segment] || typeof current[segment] !== "object") current[segment] = {};
    current = current[segment];
  }
  if (segments.length) current[segments.at(-1)] = value;
}

function removeConditionPath(record, path) {
  const segments = conditionPathSegments(path);
  const parents = [];
  let current = record;
  for (const segment of segments.slice(0, -1)) {
    if (!current?.[segment] || typeof current[segment] !== "object") return;
    parents.push([current, segment]);
    current = current[segment];
  }
  if (!segments.length) return;
  delete current[segments.at(-1)];
  for (const [parent, key] of parents.reverse()) {
    if (Object.keys(parent[key]).length) break;
    delete parent[key];
  }
}

function persistConditionState(conditions, target) {
  state.build = persistCurrentBuild({
    ...state.build,
    conditions: normalizeConditionState(conditions),
  });
  markCalculationStale();
  refreshStatsDock(target);
}

function refreshStatsDock(target) {
  const statsDock = document.querySelector("#statsDock");
  if (!statsDock) return;
  const launcher = document.querySelector(".stats-dock-launcher");
  if (launcher) launcher.outerHTML = renderStatsDockLauncher(state.lastCalculation);
  const field = target?.closest?.(".condition-field, .condition-map-row");
  if (field) {
    // Keep native inputs and pending click targets mounted while committing a value.
    const conditions = normalizeConditionState(state.build.conditions);
    const resolved = resolveConditionValues(conditions);
    const { conditionPath: path, conditionGroup: group, conditionKey: key, conditionKind: kind } = target.dataset;
    const value = path ? readConditionPath(resolved, path) : resolved[group]?.[key];
    if (kind === "boolean") target.checked = Boolean(value);
    else target.value = value ?? "";
    field.classList.toggle("is-manual", true);
    const badge = field.querySelector(".condition-source");
    if (badge) badge.textContent = ui("conditionManual");
    if (!field.querySelector('[data-action="condition-clear"], [data-action="condition-map-clear"]')) {
      const row = field.querySelector(".condition-control-row") ?? field;
      row.insertAdjacentHTML("beforeend", path
        ? `<button type="button" data-action="condition-clear" data-condition-path="${escapeHtml(path)}">${ui("conditionUseAutomatic")}</button>`
        : `<button type="button" data-action="condition-map-clear" data-condition-group="${escapeHtml(group)}" data-condition-key="${escapeHtml(key)}">${ui(Object.hasOwn(conditions.automatic[group] ?? {}, key) ? "conditionUseAutomatic" : "conditionRemove")}</button>`);
    }
    if (statsDock.dataset) statsDock.dataset.calculationState = calculationStateName(state.lastCalculation);
    const status = document.querySelector("#statsDock .calculation-state");
    const statusHtml = renderCalculationStatus(state.lastCalculation);
    if (status) status.outerHTML = statusHtml;
    else document.querySelector("#statsDock .stat-tabs")?.insertAdjacentHTML("afterend", statusHtml);
    return;
  }
  const scrollTop = document.querySelector(`#stats-panel-${state.statTab}`)?.scrollTop ?? 0;
  statsDock.outerHTML = renderStatsDock(state.lastCalculation, { includeChrome: false });
  const panel = document.querySelector(`#stats-panel-${state.statTab}`);
  if (panel) panel.scrollTop = scrollTop;
  scrubVisibleChinese(document.querySelector("#statsDock"));
}

function setConditionOverride(path, value, target) {
  const conditions = normalizeConditionState(state.build.conditions);
  setConditionPath(conditions.overrides, path, value);
  persistConditionState(conditions, target);
}

function commitConditionControlTarget(target) {
  if (!target?.classList?.contains("condition-control")) return false;
  const path = target.dataset.conditionPath;
  const kind = target.dataset.conditionKind;
  const value = kind === "boolean"
    ? target.checked
    : kind === "number"
      ? Number(target.value)
      : target.value;
  const conditions = normalizeConditionState(state.build.conditions);
  const unchangedManualValue = path
    && hasConditionPath(conditions.overrides, path)
    && Object.is(readConditionPath(conditions.overrides, path), value);
  if (
    path
    && !unchangedManualValue
    && (kind !== "number" || Number.isFinite(value))
  ) setConditionOverride(path, value, target);
  return true;
}

function clearConditionOverride(path) {
  const conditions = normalizeConditionState(state.build.conditions);
  removeConditionPath(conditions.overrides, path);
  persistConditionState(conditions);
}

function getConditionMapGroup(group) {
  return CONDITION_MAP_GROUPS.find((candidate) => candidate.id === group);
}

function normalizeConditionMapKey(key) {
  const normalized = String(key ?? "").trim().slice(0, 80);
  return normalized && !BLOCKED_CONDITION_KEYS.has(normalized) ? normalized : "";
}

function setConditionMapOverride(group, key, value, target) {
  const config = getConditionMapGroup(group);
  const normalizedKey = normalizeConditionMapKey(key);
  if (!config || !normalizedKey) return;
  const conditions = normalizeConditionState(state.build.conditions);
  conditions.overrides[group] = {
    ...(conditions.overrides[group] ?? {}),
    [normalizedKey]: value,
  };
  persistConditionState(conditions, target);
}

function clearConditionMapOverride(group, key) {
  const config = getConditionMapGroup(group);
  const normalizedKey = normalizeConditionMapKey(key);
  if (!config || !normalizedKey) return;
  const conditions = normalizeConditionState(state.build.conditions);
  if (!conditions.overrides[group]) return;
  delete conditions.overrides[group][normalizedKey];
  if (!Object.keys(conditions.overrides[group]).length) delete conditions.overrides[group];
  persistConditionState(conditions);
}

function formatConditionValue(value, type) {
  if (type === "boolean") return value ? ui("conditionEnabled") : ui("conditionDisabled");
  if (type === "enemyType") return ui(`conditionEnemy${String(value).at(0).toUpperCase()}${String(value).slice(1)}`);
  if (type === "enemyDistanceBand") {
    return value ? ui(`condition91TobEnemyDistance${String(value).at(0).toUpperCase()}${String(value).slice(1)}`) : ui("conditionUnspecified");
  }
  return String(value ?? "");
}

function renderConditionControl(field, conditions, resolved) {
  const automaticValue = readConditionPath(conditions.automatic, field.path);
  const value = readConditionPath(resolved, field.path);
  const manual = hasConditionPath(conditions.overrides, field.path);
  const inputId = `condition-${field.path.replaceAll(".", "-")}`;
  const shared = `class="condition-control" id="${inputId}" data-condition-path="${field.path}" data-condition-kind="${field.type}"`;
  let control = "";

  if (field.type === "enemyType") {
    control = `
      <select ${shared}>
        ${["normal", "elite", "boss"]
          .map(
            (type) =>
              `<option value="${type}" ${value === type ? "selected" : ""}>${ui(`conditionEnemy${type.at(0).toUpperCase()}${type.slice(1)}`)}</option>`,
          )
          .join("")}
      </select>
    `;
  } else if (field.type === "enemyDistanceBand") {
    control = `
      <select ${shared}>
        ${["", "close", "nearby", "far"]
          .map((distance) => {
            const label = distance
              ? ui(`condition91TobEnemyDistance${distance.at(0).toUpperCase()}${distance.slice(1)}`)
              : ui("conditionUnspecified");
            return `<option value="${distance}" ${value === distance ? "selected" : ""}>${label}</option>`;
          })
          .join("")}
      </select>
    `;
  } else if (field.type === "boolean") {
    control = `<input ${shared} type="checkbox" ${value ? "checked" : ""} />`;
  } else {
    control = `<input ${shared} type="number" value="${escapeHtml(value)}" min="${field.min}" max="${field.max}" step="${field.step}" />`;
  }

  return `
    <div class="condition-field ${manual ? "is-manual" : ""}">
      <label for="${inputId}">${ui(field.label)}</label>
      <div class="condition-control-row">
        ${control}
        <span class="condition-source">${ui(manual ? "conditionManual" : "conditionAutomatic")}</span>
        ${manual ? `<button type="button" data-action="condition-clear" data-condition-path="${field.path}">${ui("conditionUseAutomatic")}</button>` : ""}
      </div>
      <small>${ui("conditionAutomaticValue", { value: escapeHtml(formatConditionValue(automaticValue, field.type)) })}</small>
    </div>
  `;
}

function getRelevantAuthoritativeConditionEntries(conditions) {
  const selectedSupportIds = new Set(
    (state.build.selections?.supports ?? []).filter((itemId) => typeof itemId === "string" && itemId),
  );
  const configuredStatuses = new Set([
    ...Object.keys(conditions.automatic.statuses ?? {}),
    ...Object.keys(conditions.overrides.statuses ?? {}),
  ]);

  return AUTHORITATIVE_SUPPORT_CONDITION_RULES.flatMap((rule) => {
    if (!selectedSupportIds.has(rule.itemId) && !configuredStatuses.has(rule.conditionToken)) return [];
    const item = findItemById(rule.itemId);
    if (!item || getSupportConditionAuthority(item).status !== "verified") return [];
    return [{ item, rule }];
  });
}

function renderAuthoritativeConditionSection(entries, conditions, resolved) {
  const rows = entries.map(({ item, rule }) => {
    const token = rule.conditionToken;
    const manual = Object.hasOwn(conditions.overrides.statuses ?? {}, token);
    const hasAutomatic = Object.hasOwn(conditions.automatic.statuses ?? {}, token);
    const value = resolved.statuses?.[token];
    const text = itemText(item);
    const sourceLabel = manual
      ? ui("conditionManual")
      : hasAutomatic
        ? ui("conditionAutomatic")
        : ui("conditionUnspecified");
    return `
      <div class="condition-map-row ${manual ? "is-manual" : ""}">
        <span class="condition-map-name">${escapeHtml(text.name)}</span>
        <input class="condition-map-control" type="checkbox" data-condition-group="statuses" data-condition-key="${escapeHtml(token)}" data-condition-kind="boolean" aria-label="${ui("conditionEffectSatisfied", { name: escapeHtml(text.name) })}" ${value ? "checked" : ""} />
        <span class="condition-source">${sourceLabel}</span>
        ${manual ? `<button type="button" data-action="condition-map-clear" data-condition-group="statuses" data-condition-key="${escapeHtml(token)}">${ui("conditionRemove")}</button>` : ""}
        ${text.summary ? `<small>${escapeHtml(text.summary)}</small>` : ""}
      </div>
    `;
  }).join("");

  return `
    <section class="condition-section condition-authority-section">
      <h3>${ui("conditionVerifiedEffects")}</h3>
      <p class="condition-intro">${ui("conditionVerifiedEffectsHint")}</p>
      ${rows || `<p class="condition-map-empty">${ui("conditionNoVerifiedEffects")}</p>`}
    </section>
  `;
}

function renderConditionMapGroup(config, conditions, resolved, hiddenKeys = new Set()) {
  const groupLabel = ui(config.label);
  const automaticValues = conditions.automatic[config.id] ?? {};
  const manualValues = conditions.overrides[config.id] ?? {};
  const resolvedValues = resolved[config.id] ?? {};
  const keys = [...new Set([...Object.keys(automaticValues), ...Object.keys(manualValues)])]
    .filter((key) => !hiddenKeys.has(key))
    .sort((left, right) => compareConditionMapKeys(config.id, left, right));

  const rows = keys
    .map((key) => {
      const manual = Object.prototype.hasOwnProperty.call(manualValues, key);
      const hasAutomatic = Object.prototype.hasOwnProperty.call(automaticValues, key);
      const value = resolvedValues[key];
      const automaticValue = automaticValues[key];
      const displayKey = conditionMapKeyLabel(config.id, key);
      const numberMaximum = config.id === "heroStacks" ? Number.MAX_SAFE_INTEGER : 999;
      const control =
        config.type === "boolean"
          ? `<input class="condition-map-control" type="checkbox" data-condition-group="${config.id}" data-condition-key="${escapeHtml(key)}" data-condition-kind="boolean" aria-label="${escapeHtml(displayKey)}" ${value ? "checked" : ""} />`
          : `<input class="condition-map-control" type="number" min="0" max="${numberMaximum}" step="1" value="${escapeHtml(value)}" data-condition-group="${config.id}" data-condition-key="${escapeHtml(key)}" data-condition-kind="number" aria-label="${escapeHtml(displayKey)}" />`;
      return `
        <div class="condition-map-row ${manual ? "is-manual" : ""}">
          <span class="condition-map-name">${escapeHtml(displayKey)}</span>
          ${control}
          <span class="condition-source">${ui(manual ? "conditionManual" : "conditionAutomatic")}</span>
          ${
            manual
              ? `<button type="button" data-action="condition-map-clear" data-condition-group="${config.id}" data-condition-key="${escapeHtml(key)}">${ui(hasAutomatic ? "conditionUseAutomatic" : "conditionRemove")}</button>`
              : ""
          }
          ${
            hasAutomatic
              ? `<small>${ui("conditionAutomaticValue", { value: escapeHtml(formatConditionValue(automaticValue, config.type)) })}</small>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  return `
    <details class="condition-map-group" open>
      <summary>${ui(config.label)} <span>${keys.length}</span></summary>
      ${rows || `<p class="condition-map-empty">${ui("conditionNoEntries")}</p>`}
      <div class="condition-add-row" data-condition-group="${config.id}">
        <input class="condition-new-key" type="text" maxlength="80" placeholder="${ui("conditionName")}" aria-label="${escapeHtml(ui("conditionNameForGroup", { group: groupLabel }))}" />
        ${
          config.type === "boolean"
            ? `<label class="condition-new-toggle"><input class="condition-new-value" type="checkbox" checked aria-label="${escapeHtml(ui("conditionValueForGroup", { group: groupLabel }))}" /> ${ui("conditionEnabled")}</label>`
            : `<input class="condition-new-value" type="number" min="0" max="${config.id === "heroStacks" ? Number.MAX_SAFE_INTEGER : 999}" step="1" value="0" placeholder="${ui("conditionValue")}" aria-label="${escapeHtml(ui("conditionValueForGroup", { group: groupLabel }))}" />`
        }
        <button type="button" data-action="condition-map-add" data-condition-group="${config.id}" data-condition-kind="${config.type}" aria-label="${escapeHtml(ui("conditionAddForGroup", { group: groupLabel }))}">${ui("conditionAdd")}</button>
      </div>
    </details>
  `;
}

function renderConditionGroupTabs() {
  const groups = [
    ["enemy", calculationCopy("적", "Enemy")],
    ["resources", calculationCopy("수확·반환", "Reaping / Regain")],
    ["combat", calculationCopy("전투 상태", "Combat states")],
    ["custom", calculationCopy("효과·추가 조건", "Effects / Custom")],
  ];
  return `<div class="condition-group-tabs" role="group" aria-label="${calculationCopy("전투 조건 분류", "Combat condition groups")}">
    ${groups.map(([id, label]) => `<button type="button" data-action="condition-group" data-group="${id}" aria-pressed="${state.conditionGroup === id}">${label}</button>`).join("")}
  </div>`;
}

function renderConditionEditor() {
  const conditions = normalizeConditionState(
    !state.isStale && state.lastCalculation?.conditionState
      ? state.lastCalculation.conditionState
      : state.build.conditions,
  );
  const resolved = resolveConditionValues(conditions);
  const authoritativeEntries = getRelevantAuthoritativeConditionEntries(conditions);
  const authoritativeStatusKeys = new Set(authoritativeEntries.map(({ rule }) => rule.conditionToken));
  const groupAttributes = (id) => `data-condition-section="${id}" ${state.conditionGroup === id ? "" : "hidden"}`;
  return `
    <div class="condition-editor">
      <p class="condition-intro">${calculationCopy("조건을 변경한 뒤 빌드 계산을 누르세요. 현재 빌드 저장으로 조건을 함께 보관할 수 있습니다.", "After changing conditions, calculate the build. Save the current build to keep these conditions with it.")}</p>
      <details class="condition-help"><summary>${calculationCopy("입력·계산 적용 안내", "About condition inputs and calculation")}</summary>
        <p class="condition-intro">${ui("conditionsIntro")}</p>
        <p class="calculation-limit-notice" data-role="condition-calculation-unsupported">${ui("conditionsCalculationLimited")}</p>
      </details>
      <section class="condition-section" ${groupAttributes("enemy")}>
        <h3>${ui("conditionEnemy")}</h3>
        ${CONDITION_FIXED_FIELDS.filter((field) => field.section === "enemy")
          .map((field) => renderConditionControl(field, conditions, resolved))
          .join("")}
      </section>
      <section class="condition-section" ${groupAttributes("resources")}>
        <h3>${ui("conditionReaping")}</h3>
        ${CONDITION_FIXED_FIELDS.filter((field) => field.section === "reaping")
          .map((field) => renderConditionControl(field, conditions, resolved))
          .join("")}
      </section>
      <section class="condition-section" ${groupAttributes("resources")}>
        <h3>${ui("conditionRegain")}</h3>
        <p class="condition-intro">${ui("conditionRegainHint")}</p>
        ${CONDITION_FIXED_FIELDS.filter((field) => field.section === "regain")
          .map((field) => renderConditionControl(field, conditions, resolved))
          .join("")}
      </section>
      <section class="condition-section" ${groupAttributes("combat")}>
        <h3>${ui("conditionRecent")}</h3>
        ${CONDITION_FIXED_FIELDS.filter((field) => field.section === "recent")
          .map((field) => renderConditionControl(field, conditions, resolved))
          .join("")}
      </section>
      <section class="condition-section" ${groupAttributes("combat")}>
        <h3>${ui("conditionShieldCharge")}</h3>
        <p class="condition-intro">${ui("conditionShieldChargeHint")}</p>
        ${CONDITION_FIXED_FIELDS.filter((field) => field.section === "shield")
          .map((field) => renderConditionControl(field, conditions, resolved))
          .join("")}
      </section>
      <section class="condition-section" ${groupAttributes("combat")}>
        <h3>${ui("conditionPact")}</h3>
        ${CONDITION_FIXED_FIELDS.filter((field) => field.section === "pact")
          .map((field) => renderConditionControl(field, conditions, resolved))
          .join("")}
      </section>
      <div ${groupAttributes("custom")}>${renderAuthoritativeConditionSection(authoritativeEntries, conditions, resolved)}</div>
      <section class="condition-section condition-map-section" ${groupAttributes("custom")}>
        <h3>${ui("conditionNamedConditions")}</h3>
        ${CONDITION_MAP_GROUPS.map((config) => renderConditionMapGroup(
          config,
          conditions,
          resolved,
          config.id === "statuses"
            ? authoritativeStatusKeys
            : config.id === "buffs"
              ? new Set(["steadfast", "aura_focus_origin_of_spirit_magus"])
            : config.id === "playerStates"
              ? new Set(["shield_recharge_active"])
              : new Set(),
        )).join("")}
      </section>
    </div>
  `;
}

function calculationStateName(calc) {
  if (state.isCalculating) return "calculating";
  if (!calc) return "empty";
  return state.isStale ? "stale" : "current";
}

function renderCalculationStatus(calc) {
  const calculationState = calculationStateName(calc);
  if (calculationState === "current") return "";
  const message = calculationState === "calculating"
    ? ui("calculatingBuild")
    : calculationState === "stale"
      ? ui("calculationStale")
      : `${ui("calculationEmpty")} ${ui("calculationEmptyHint")}`;
  return `<div class="calculation-state is-${calculationState}" role="status" aria-live="polite">${message}</div>`;
}

function renderCalculatedStatSections(calc) {
  return getCalculatedStatSections(calc).map(
    (section) => `
      <section class="calculation-stat-section" data-stat-section="${escapeHtml(section.title)}">
        <h3>${ui(section.title)}</h3>
        ${section.rows.map(([label, statKey, suffix, explicitLabel]) => renderStatRow(
          label,
          statKey,
          calc.summary?.[statKey] ?? calc.deltas?.[statKey] ?? calc.traces?.[statKey]?.finalValue ?? 0,
          suffix,
          calc,
          explicitLabel,
        )).join("")}
      </section>
    `,
  ).join("");
}

function renderCalculationInputSummary(calc) {
  const selectedCount = Number(calc.summary?.selectedCount ?? calc.selectedItems?.length ?? 0);
  return `
    <div class="calculation-input-summary">
      <span>${calculationCopy("계산 입력", "Calculation input")}</span>
      <strong>${ui("selectedCount", { count: selectedCount })}</strong>
    </div>
  `;
}

const HADES_CALCULATION_STATUS_COPY = Object.freeze({
  applied: ["계산 패널 반영", "Applied to calculation panel"],
  "partially-applied": ["일부 계산 패널 반영", "Partially applied to calculation panel"],
  "result-only": ["결과 표시 · 최종값 미연결", "Result shown · not linked to final values"],
  "rule-active": ["활성 규칙", "Active rule"],
  inactive: ["조건 미충족", "Condition inactive"],
  "input-required": ["입력 필요", "Input required"],
  "source-conflict": ["출처 충돌 · 분기", "Source conflict · branches"],
  scenario: ["시나리오", "Scenario"],
  unresolved: ["확인 필요", "Needs review"],
});

const HADES_SS13_CALCULATION_AUDIT = auditHadesSs13FullCalculationSupport();

const HADES_CALCULATION_INPUT_COPY = Object.freeze({
  roll: ["적용 수치", "Rolled value"],
  conditionActive: ["조건 충족 여부", "Condition state"],
  authorityActive: ["권위 활성 배치 상태", "Authority placement state"],
  distanceMeters: ["대상 거리", "Target distance"],
  stackCount: ["중첩 수", "Stack count"],
  recentCount: ["최근 횟수", "Recent count"],
  spellSkillLevelBonus: ["주술 스킬 레벨", "Spell skill level bonus"],
  sealedLifePercent: ["봉인된 HP 비율", "Sealed life percentage"],
  knockbackDistanceIncrease: ["넉백 거리 증가", "Knockback distance increase"],
  reapingEventsPerSecond: ["초당 수확 횟수", "Reaping events per second"],
  activeMinions: ["보유한 소환체 수", "Active minion count"],
  attackBlockChance: ["공격 막기 확률", "Attack block chance"],
  spellBlockChance: ["주술 막기 확률", "Spell block chance"],
  empowerDefensiveRecentCasts: ["최근 시전한 자극 또는 실드 스킬 횟수", "Recent empower/defensive casts"],
  erosionHitStacks: ["적중 시 부식 대미지 중첩 수", "Erosion hit stacks"],
  statueHasEmptySlot: ["신상의 빈 장착 슬롯 여부", "Empty statue equipment slot"],
  banishmentArchetype: ["추방 유형", "Banishment archetype"],
  banishmentActivationBranch: ["활성 조건 출처 분기", "Activation source branch"],
  banishmentConditionActive: ["추방 조건 충족 여부", "Banishment condition state"],
  banishmentSteepStrikeChance: ["슬래시 확률", "Steep Strike chance"],
  banishmentSpellBurstAtCap: [HADES_KOREAN_PRESENTATION.inputLabels.banishmentSpellBurstAtCap, "Spell Burst at cap"],
  banishmentEnemyElite: ["강적 여부", "Elite enemy state"],
  banishmentEnemyLifePercent: ["적 HP 비율", "Enemy life percentage"],
  banishmentCurseEffectCount: ["저주 효과 수", "Curse effect count"],
  banishmentProjectionStacks: [
    `${HADES_KOREAN_PRESENTATION.banishmentNames.projection} 중첩 수`,
    "Projection stacks",
  ],
  banishmentMinionAffectedByElixir: ["소환체 영약 적용 여부", "Minion affected by Elixir"],
  banishmentNearestSyntheticTroopMaxLife: [HADES_KOREAN_PRESENTATION.inputLabels.banishmentNearestSyntheticTroopMaxLife, "Nearest Synthetic Troop maximum life"],
  banishmentAdjacentSlateCount: ["인접 석판 배치 수", "Adjacent slate count"],
  banishmentNonAdjacentSlateCount: ["비인접 석판 배치 수", "Non-adjacent slate count"],
});

function normalizeHadesCalculationStatus(status) {
  if (status === "resolved") return "applied";
  if (status === "needs-input") return "input-required";
  return Object.hasOwn(HADES_CALCULATION_STATUS_COPY, status) ? status : "unresolved";
}

function hadesCalculationStatusLabel(status) {
  const copy = HADES_CALCULATION_STATUS_COPY[normalizeHadesCalculationStatus(status)];
  return state.locale === "ko" ? copy[0] : copy[1];
}

function hadesCalculationStatusClass(status) {
  return ["result-only", "unresolved"].includes(status) ? "scenario" : status;
}

function hadesCalculationInputLabel(inputKey) {
  const copy = HADES_CALCULATION_INPUT_COPY[inputKey]
    ?? ["추가 계산 조건", "Additional calculation condition"];
  return state.locale === "ko" ? copy[0] : copy[1];
}

function hadesFiniteNumber(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatHadesNumber(value) {
  return new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 6,
  }).format(Number(value));
}

const HADES_EFFECT_STAT_COPY = Object.freeze({
  damage: ["대미지", "Self damage"],
  minion_damage: ["소환체 대미지", "Minion damage"],
  minion_skill_level: ["소환체 소환 스킬 레벨", "Minion Skill Level"],
  minion_max_life: ["소환체 최대 HP", "Minion Maximum Life"],
  minion_attack_speed: ["소환체 공격 속도", "Minion Attack Speed"],
  minion_cast_speed: ["소환체 시전 속도", "Minion Cast Speed"],
  attack_and_cast_speed: ["공격 및 시전 속도", "Attack and Cast Speed"],
  double_damage_chance: ["이중 대미지 확률", "Double Damage chance"],
  elemental_and_erosion_resistance_penetration: ["원소와 부식 저항 관통", "Elemental and Erosion Resistance Penetration"],
  armor_damage_mitigation_penetration: ["아머 대미지 감소 관통", "Armor Damage Mitigation Penetration"],
  on_hit_damage: ["적중 대미지", "On-hit damage"],
  tangle_damage: ["부착 대미지", "Tangle damage"],
  terra_skill_damage: ["지면 스킬 대미지", "Terra Skill damage"],
  core_steep_strike_trigger_chance: ["핵심 슬래시 발동 확률", "Core Steep Strike trigger chance"],
  core_steep_strike_damage: ["핵심 슬래시 대미지", "Core Steep Strike damage"],
  core_steep_strike_skill_area: ["핵심 슬래시 스킬 범위", "Core Steep Strike Skill Area"],
  elixir_skill_effect: ["영약 스킬 효과", "Elixir Skill Effect"],
  attack_horizontal_projectile_damage: ["공격 수평 투사체 대미지", "Attack Horizontal Projectile damage"],
  damage_taken: ["받는 대미지", "Damage taken"],
  max_fire_resistance: ["화염 최대 저항", "Maximum Fire Resistance"],
  max_cold_resistance: ["냉기 최대 저항", "Maximum Cold Resistance"],
  max_lightning_resistance: ["번개 최대 저항", "Maximum Lightning Resistance"],
  movement_speed: ["이동 속도", "Movement Speed"],
});

function hadesEffectDisplayLabel(effect) {
  if (effect?.stat === "double_damage_chance") {
    return effect?.scope === "minions"
      ? calculationCopy("소환체 이중 대미지 확률", "Minion Double Damage chance")
      : calculationCopy("이중 대미지 확률", "Self Double Damage chance");
  }
  if (effect?.stat === "elemental_and_erosion_resistance_penetration") {
    return effect?.scope === "minions"
      ? calculationCopy("소환체의 원소 및 부식 저항 관통", "Minion Elemental and Erosion Resistance Penetration")
      : calculationCopy("원소와 부식 저항 관통", "Self Elemental and Erosion Resistance Penetration");
  }
  if (effect?.stat === "armor_damage_mitigation_penetration") {
    return effect?.scope === "minions"
      ? calculationCopy("소환체의 아머 대미지 감소 관통", "Minion Armor Damage Mitigation Penetration")
      : calculationCopy("아머 대미지 감소 관통", "Self Armor Damage Mitigation Penetration");
  }
  if (effect?.stat === "damage_taken" && effect?.scope === "from-proximity-enemies") {
    return calculationCopy("근거리 적에게서 받는 대미지", "Damage taken from Proximity enemies");
  }
  const copy = HADES_EFFECT_STAT_COPY[effect?.stat];
  if (copy) return state.locale === "ko" ? copy[0] : copy[1];
  if (effect?.scope === "minions") return calculationCopy("소환체", "Minions");
  if (effect?.scope === "self") return calculationCopy("자신", "Self");
  return calculationCopy("효과", "Effect");
}

function formatHadesCalculationValue(mechanic) {
  const stackCount = hadesFiniteNumber(mechanic?.stackCount);
  if (
    mechanic?.kind === "projection-stack-state"
    && stackCount !== null
    && typeof mechanic?.atCap === "boolean"
  ) {
    return calculationCopy(
      `${formatHadesNumber(stackCount)}중첩 · ${mechanic.atCap ? "최대치" : "최대치 아님"}`,
      `${formatHadesNumber(stackCount)} stack(s) · ${mechanic.atCap ? "at cap" : "below cap"}`,
    );
  }
  const statePrefix = mechanic?.inputResolved === true && typeof mechanic?.stateValue === "boolean"
    ? (mechanic.stateValue
      ? calculationCopy("활성", "Active")
      : calculationCopy("비활성", "Inactive"))
    : "";
  const value = hadesFiniteNumber(mechanic?.value ?? mechanic?.computedValue);
  if (value !== null) {
    const unit = String(mechanic?.unit ?? "");
    const signedValue = `${value > 0 ? "+" : ""}${formatHadesNumber(value)}`;
    const formatted = unit.includes("percent")
      ? `${signedValue}%`
      : unit === "level"
        ? ui("levelDelta", { value: signedValue })
        : signedValue;
    return statePrefix ? `${statePrefix} · ${formatted}` : formatted;
  }
  if (Array.isArray(mechanic?.effects) && mechanic.effects.length) {
    return mechanic.effects.map((effect) => {
      const effectValue = hadesFiniteNumber(effect.value);
      if (effectValue === null) return hadesCalculationStatusLabel(mechanic?.status);
      const unit = String(effect.unit ?? "");
      const signedValue = `${effectValue > 0 ? "+" : ""}${formatHadesNumber(effectValue)}`;
      const value = unit.includes("percent")
        ? `${signedValue}%`
        : unit === "level"
          ? ui("levelDelta", { value: signedValue })
          : signedValue;
      return `${hadesEffectDisplayLabel(effect)} ${value}`;
    }).join(" · ");
  }
  if (Array.isArray(mechanic?.branches) && mechanic.branches.length) {
    return calculationCopy(
      `${formatNumber(mechanic.branches.length)}개 결과 분기`,
      `${formatNumber(mechanic.branches.length)} outcome branches`,
    );
  }
  const multiplier = hadesFiniteNumber(mechanic?.multiplier);
  if (multiplier !== null) {
    return `×${formatHadesNumber(multiplier)}`;
  }
  if (statePrefix) return statePrefix;
  return hadesCalculationStatusLabel(mechanic?.status);
}

function formatHadesBranchValue(branch) {
  const direct = branch?.computedValue ?? branch?.value ?? branch?.percent;
  if (direct !== null && direct !== undefined && Number.isFinite(Number(direct))) {
    const value = Number(direct);
    const percent = branch?.percent !== undefined
      || branch?.valuePerStack !== undefined
      || String(branch?.unit ?? "").includes("percent");
    return `${value > 0 ? "+" : ""}${formatHadesNumber(value)}${percent ? "%" : ""}`;
  }
  if (Number.isFinite(Number(branch?.multiplier))) {
    return `×${formatHadesNumber(Number(branch.multiplier))}`;
  }
  if (typeof branch?.active === "boolean") {
    return branch.active
      ? calculationCopy("현재 활성", "Currently active")
      : calculationCopy("현재 비활성", "Currently inactive");
  }
  return calculationCopy("조건별 결과", "Conditional result");
}

function hadesElementLabel(value) {
  return ({
    erosion: calculationCopy("부식", "Erosion"),
    fire: calculationCopy("화염", "Fire"),
    cold: calculationCopy("냉기", "Cold"),
    lightning: calculationCopy("번개", "Lightning"),
  })[value] ?? String(value ?? "");
}

function hadesBranchSemanticLabel(branch, index) {
  const locales = Array.isArray(branch?.locales)
    ? branch.locales.map((locale) => String(locale).toUpperCase()).join("·")
    : "";
  const condition = ({
    "recent-critical-strike": calculationCopy("최근 크리티컬 발동", "Recent Critical Strike"),
    "recent-non-critical-strike": calculationCopy("최근 크리티컬 미발동", "Recent non-Critical Strike"),
  })[branch?.conditionEvent];
  if (condition) return locales ? `${locales} · ${condition}` : condition;
  if (branch?.from && branch?.to) {
    return calculationCopy(
      `${hadesElementLabel(branch.from)}→${hadesElementLabel(branch.to)} 전환`,
      `${hadesElementLabel(branch.from)}→${hadesElementLabel(branch.to)} conversion`,
    );
  }
  if (branch?.adjacent && branch?.nonAdjacent) {
    const exactly = branch.adjacent.comparator === "exactly"
      && branch.nonAdjacent.comparator === "exactly";
    return exactly
      ? calculationCopy("인접·비인접 각각 정확히 4개", "Exactly 4 adjacent and 4 non-adjacent")
      : calculationCopy("인접·비인접 각각 4개 이상", "At least 4 adjacent and 4 non-adjacent");
  }
  if (branch?.id === "hyperlink-mixed-locale-line") {
    return calculationCopy("연결 문구의 원문 언어 혼합", "Mixed-language Hyperlink line");
  }
  if (branch?.id === "nether-king-profile-omission") {
    return calculationCopy("권능 프로필 문구 누락", "Authority-profile omission");
  }
  return calculationCopy(`결과 ${index + 1}`, `Outcome ${index + 1}`);
}

function renderHadesBranchSummary(mechanic) {
  if (!Array.isArray(mechanic?.branches) || !mechanic.branches.length) return "";
  return `<small data-role="hades-result-branches">${mechanic.branches.map((branch, index) => {
    const label = hadesBranchSemanticLabel(branch, index);
    return `${escapeHtml(label)}: ${escapeHtml(formatHadesBranchValue(branch))}`;
  }).join(" · ")}</small>`;
}

function uniqueHadesInputBlockers(divinityProjection) {
  const seen = new Set();
  return (divinityProjection?.blockers ?? []).filter((blocker) => {
    if (blocker?.type !== "hades-input" || !blocker.inputKey) return false;
    const key = `${blocker.sourceInstanceId ?? blocker.instanceId ?? ""}\u0000${blocker.sourceSlotKey ?? blocker.slotKey ?? ""}\u0000${blocker.sourceItemId ?? ""}\u0000${blocker.inputKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hadesBlockersForMechanic(mechanic, blockers) {
  const sourceItemId = String(mechanic?.sourceItemId ?? "");
  const sourceInstanceId = mechanic?.sourceInstanceId ?? mechanic?.instanceId ?? null;
  const sourceSlotKey = mechanic?.sourceSlotKey ?? mechanic?.slotKey ?? null;
  const sameSelection = (blocker) => (
    blocker.sourceItemId === sourceItemId
    && (blocker.sourceInstanceId ?? blocker.instanceId ?? null) === sourceInstanceId
    && (blocker.sourceSlotKey ?? blocker.slotKey ?? null) === sourceSlotKey
  );
  if (sourceItemId.startsWith("hades-banishment-profile:")) {
    const requiredInputKeys = new Set(mechanic?.requiredInputKeys ?? []);
    if (!requiredInputKeys.size) return [];
    return blockers.filter((blocker) => (
      sameSelection(blocker) && requiredInputKeys.has(blocker.inputKey)
    ));
  }
  return blockers.filter(sameSelection);
}

function hadesPresentationStatus(mechanic, blockers, effects) {
  const status = normalizeHadesCalculationStatus(mechanic?.status);
  if (status === "source-conflict") return status;
  if (blockers.length) return "input-required";
  if (status !== "applied") return status;
  if (mechanic?.kind !== "calculated-effects") return "rule-active";
  const mechanicEffects = Array.isArray(mechanic.effects) ? mechanic.effects : [];
  if (mechanicEffects.length) {
    const readyCount = mechanicEffects.filter(({ calculationReady }) => calculationReady === true).length;
    if (readyCount === mechanicEffects.length) return "applied";
    if (readyCount > 0) return "partially-applied";
    return "result-only";
  }
  const sourceEffects = effects.filter(({ sourceItemId }) => sourceItemId === mechanic.sourceItemId);
  if (sourceEffects.some(({ calculationReady }) => calculationReady === true)) return "applied";
  return sourceEffects.length ? "result-only" : "rule-active";
}

function localizedHadesText(byLocale) {
  if (!byLocale || typeof byLocale !== "object") return "";
  const localeKey = state.locale === "ko" ? "ko" : "en";
  return String(byLocale[localeKey] ?? byLocale.en ?? "").trim();
}

function hadesMechanicSourceText(mechanic) {
  const localeKey = state.locale === "ko" ? "ko" : "en";
  const sourced = String(mechanic?.sourceTextByLocale?.[localeKey] ?? "").trim();
  const supplementConflict = String(
    mechanic?.sourceSupplementConflictTextByLocale?.[localeKey] ?? "",
  ).trim();
  const display = String(mechanic?.displayTextByLocale?.[localeKey] ?? "").trim();
  const status = mechanic?.sourceLocaleStatus?.[localeKey];
  if (sourced) {
    const sourceWithSupplementConflict = supplementConflict
      ? `${sourced} · ${calculationCopy("수치 충돌 원문", "Conflicting numeric source")}: ${supplementConflict}`
      : sourced;
    if (status === "source-conflict") {
      return `${sourceWithSupplementConflict} · ${calculationCopy("출처 문구 이상 · 계산 미적용", "Source text conflict · not applied")}`;
    }
    return sourceWithSupplementConflict;
  }
  if (["mixed-language-unavailable", "unavailable"].includes(status)) {
    return state.locale === "ko"
      ? "한국어 원문 일부 미제공"
      : "English source text unavailable (mixed-language source field)";
  }
  const fallback = display;
  if (!fallback) return "";
  if (state.locale === "ko") {
    return `${fallback} · 한국어 원문 일부 미제공`;
  }
  return fallback;
}

function hadesSourceLinkLabel(role) {
  const labels = {
    profile: ["TLIDB 프로필", "TLIDB profile"],
    "linked-detail": ["TLIDB 상세 효과", "TLIDB effect detail"],
    "numeric-authority": ["TLIDB 수치 근거", "TLIDB numeric source"],
    "conflict-line": ["TLIDB 충돌 문구", "TLIDB conflicting line"],
    "profile-omission": ["TLIDB 프로필 누락", "TLIDB profile omission"],
    "official-patch-notes": ["공식 SS13 패치 원문", "Official SS13 patch notes"],
    "official-patch-conflict": ["공식 SS13 패치 충돌 원문", "Conflicting official SS13 patch note"],
    source: ["TLIDB 근거", "TLIDB source"],
  };
  const copy = labels[role] ?? labels.source;
  return state.locale === "ko" ? copy[0] : copy[1];
}

function renderHadesSourceLinks(mechanic) {
  const localeKey = state.locale === "ko" ? "ko" : "en";
  const configured = Array.isArray(mechanic?.sourceLinks) && mechanic.sourceLinks.length
    ? mechanic.sourceLinks
    : [{
        role: "source",
        url: mechanic?.sourceUrl,
        urlByLocale: mechanic?.sourceUrlByLocale,
      }];
  const seen = new Set();
  return configured.map((sourceLink) => {
    const url = sourceLink?.urlByLocale?.[localeKey]
      ?? sourceLink?.urlByLocale?.en
      ?? sourceLink?.url;
    const role = sourceLink?.role ?? "source";
    const key = `${role}\u0000${url ?? ""}`;
    if (!/^https:\/\//u.test(String(url ?? "")) || seen.has(key)) return "";
    seen.add(key);
    return `<a data-role="hades-source-link" data-source-role="${escapeHtml(role)}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(hadesSourceLinkLabel(role))}</a>`;
  }).filter(Boolean).join(" ");
}

const HADES_DISPLAY_RECORD_BY_ITEM_ID = new Map(
  ACTIVE_DIVINITY_MODEL.hadesSelectionCatalog.map((record) => [record.id, record]),
);

function hadesSourceDisplay(sourceItemId, fallback = "") {
  const item = findItemById(sourceItemId);
  const display = item ? itemText(item) : null;
  const currentHades = HADES_DISPLAY_RECORD_BY_ITEM_ID.get(sourceItemId);
  const currentKoreanDetail = state.locale === "ko" ? currentHades?.text : "";
  const localizedFallback = presentCalculationSourceText(fallback, state.locale);
  return {
    label: display?.name || localizedFallback || calculationCopy("명왕 권능", "Nether King authority"),
    detail: display?.detail || currentKoreanDetail || localizedFallback || "",
  };
}

function hadesSelectionContextLabel(mechanic) {
  const typeLabel = ({
    judgment: calculationCopy("심판", "Judgment"),
    contamination: calculationCopy("인펙션", "Contamination"),
    banishment: calculationCopy("추방", "Banishment"),
  })[mechanic?.hadesType] ?? calculationCopy("명왕의 신격", "Nether King's Divinity");
  const withType = (label) => `${typeLabel} · ${label}`;
  const targetSlotKey = String(mechanic?.slotKey ?? "");
  const slotKey = String(mechanic?.sourceSlotKey ?? targetSlotKey);
  const projected = targetSlotKey.match(/^contamination:(fixed|imprint)_(\d+)$/u);
  if (projected) {
    const role = projected[1] === "fixed"
      ? calculationCopy("고정 옵션", "Fixed Talent")
      : calculationCopy("낙인 재능", "Brand Talent");
    return withType(calculationCopy(
      `인접 석판 투영 · ${role} ${projected[2]}`,
      `Adjacent-slate projection · ${role} ${projected[2]}`,
    ));
  }
  const direct = slotKey.match(/^(fixed|imprint)_(\d+)$/u);
  if (direct) {
    const role = direct[1] === "fixed"
      ? calculationCopy("고정 옵션", "Fixed Talent")
      : calculationCopy("낙인 재능", "Brand Talent");
    return withType(`${role} ${direct[2]}`);
  }
  if (slotKey === "banishment-profile" || String(mechanic?.sourceItemId ?? "").startsWith("hades-banishment-profile:")) {
    return calculationCopy("추방 · 권능", "Banishment authority");
  }
  return withType(calculationCopy("선택 효과", "Selected effect"));
}

function renderHadesCalculationProjection(calc) {
  const divinityProjection = calc?.divinityEffectProjection;
  const projection = divinityProjection?.hades;
  if (!projection?.active) return "";
  const mechanics = projection.mechanics ?? [];
  const accounting = projection.accounting ?? [];
  const effects = divinityProjection?.effects ?? [];
  const inputBlockers = uniqueHadesInputBlockers(divinityProjection);
  const accountedLines = accounting.reduce(
    (sum, record) => sum + Number(record.accountedLineCount ?? 0),
    0,
  );
  const renderedMechanics = mechanics.map((mechanic) => {
    const blockers = hadesBlockersForMechanic(mechanic, inputBlockers);
    return {
      mechanic,
      blockers,
      status: hadesPresentationStatus(mechanic, blockers, effects),
    };
  });
  const statusCounts = renderedMechanics.reduce((counts, { status }) => ({
    ...counts,
    [status]: (counts[status] ?? 0) + 1,
  }), {});
  const rows = renderedMechanics.map(({ mechanic, blockers, status }) => {
    const localizedProfileName = localizedHadesText(mechanic.displayNameByLocale);
    const display = hadesSourceDisplay(
      mechanic.sourceItemId,
      localizedProfileName || mechanic.label || mechanic.sourceText,
    );
    const profileRuleText = String(mechanic.sourceItemId ?? "").startsWith("hades-banishment-profile:")
      ? hadesMechanicSourceText(mechanic)
      : "";
    const detail = profileRuleText || display.detail;
    const detailRole = profileRuleText ? ' data-role="hades-profile-rule"' : "";
    const sourceLinks = renderHadesSourceLinks(mechanic);
    const missingInputs = blockers.map(({ inputKey }) => hadesCalculationInputLabel(inputKey));
    return `
      <div class="hades-calculation-row is-${escapeHtml(hadesCalculationStatusClass(status))}"
        data-hades-status="${escapeHtml(status)}"
        data-source-item-id="${escapeHtml(mechanic.sourceItemId ?? "")}">
        <span><strong>${escapeHtml(display.label)}</strong><small data-role="hades-selection-context">${escapeHtml(hadesSelectionContextLabel(mechanic))}</small>${detail && detail !== display.label ? `<small${detailRole}>${escapeHtml(detail)}</small>` : ""}${sourceLinks}${missingInputs.length ? `<small data-role="hades-required-input">${calculationCopy("필요 입력", "Required input")} · ${escapeHtml(missingInputs.join(" · "))}</small>` : ""}${renderHadesBranchSummary(mechanic)}</span>
        <b>${escapeHtml(formatHadesCalculationValue({ ...mechanic, status }))}</b>
        <em>${escapeHtml(hadesCalculationStatusLabel(status))}</em>
      </div>
    `;
  }).join("");
  const statusSummary = Object.keys(HADES_CALCULATION_STATUS_COPY)
    .filter((status) => statusCounts[status])
    .map((status) => `${hadesCalculationStatusLabel(status)} ${formatNumber(statusCounts[status])}`)
    .join(" · ");
  const blockerRows = inputBlockers.map((blocker) => {
    const profileMechanic = mechanics.find(({ sourceItemId }) => sourceItemId === blocker.sourceItemId);
    const display = hadesSourceDisplay(
      blocker.sourceItemId,
      localizedHadesText(profileMechanic?.displayNameByLocale) || blocker.sourceText,
    );
    return `<div class="hades-calculation-row is-input-required" data-hades-status="input-required">
      <span><strong>${escapeHtml(display.label)}</strong><small data-role="hades-selection-context">${escapeHtml(hadesSelectionContextLabel(blocker))}</small><small>${calculationCopy("필요 입력", "Required input")} · ${escapeHtml(hadesCalculationInputLabel(blocker.inputKey))}</small></span>
      <b>${hadesCalculationStatusLabel("input-required")}</b>
      <em>${hadesCalculationStatusLabel("input-required")}</em>
    </div>`;
  }).join("");
  const audit = HADES_SS13_CALCULATION_AUDIT;
  const talentAudit = audit.talents;
  const coverageCopy = audit.ruleRegistrationComplete
    ? calculationCopy(
      `현행 SS13 명왕 재능 ${formatNumber(talentAudit.registryRecordCount)}개·원문 ${formatNumber(talentAudit.accountedLineCount)}줄, 권능 기본 규칙 ${formatNumber(audit.baseAuthorityRuleCount)}개, 추방 프로필 ${formatNumber(audit.profileCount)}개·원문 ${formatNumber(audit.profileSourceLineCount)}줄이 계산 규칙에 대응합니다. 아래는 이번 빌드에서 선택·투영된 항목만 표시합니다.`,
      `${formatNumber(talentAudit.registryRecordCount)} current SS13 talents and ${formatNumber(talentAudit.accountedLineCount)} source lines, ${formatNumber(audit.baseAuthorityRuleCount)} base authority rules, and ${formatNumber(audit.profileCount)} Banishment profiles with ${formatNumber(audit.profileSourceLineCount)} source lines have calculation rules. Only entries selected or projected in this build are shown below.`,
    )
    : calculationCopy(
      `현행 SS13 명왕 재능 계산 규칙 점검이 완료되지 않았습니다.`,
      `The current SS13 talent calculation-rule audit is incomplete.`,
    );
  const profileSourceCopy = audit.profileSourceVerificationComplete
    ? calculationCopy(
      `추방 프로필 원문 ${formatNumber(audit.profileSourceReceiptCount)}줄은 현행 TLIDB 페이지 영수증과 대조되었습니다.`,
      `${formatNumber(audit.profileSourceReceiptCount)} Banishment profile source lines were matched to current TLIDB page receipts.`,
    )
    : calculationCopy(
      `추방 프로필 원문 출처 대조가 완료되지 않았습니다.`,
      `Banishment profile source verification is incomplete.`,
    );

  return `
    <section class="hades-calculation-projection" data-role="hades-calculation-projection">
      <header>
        <span>${calculationCopy("명왕의 신격 계산", "Nether King's Divinity calculation")}</span>
        <strong>${calculationCopy(
          `이번 계산 ${formatNumber(accounting.length)}개 · 원문 ${formatNumber(accountedLines)}줄`,
          `${formatNumber(accounting.length)} entries in this calculation · ${formatNumber(accountedLines)} source lines`,
        )}</strong>
      </header>
      <p data-role="hades-calculation-coverage" data-rule-registration-complete="${audit.ruleRegistrationComplete}" data-profile-source-verified="${audit.profileSourceVerificationComplete}" data-structure-verified="${audit.structureVerificationComplete}">${coverageCopy} ${profileSourceCopy}</p>
      <p>${calculationCopy(
        `배치 형상·연결선·고정 위치는 현행 91TOB 공개 보드 런타임과 직접 대조했습니다. 출처가 단일값을 정하지 않은 효과와 최종 계산 연결이 없는 효과는 각각 결과 분기와 결과 전용으로 표시합니다.${statusSummary ? ` 선택 결과 · ${statusSummary}` : ""}`,
        `Placement geometry, connector lines, and fixed positions were matched directly to the current public 91TOB board runtime. Effects without one sourced value and effects not linked to final calculations are shown as outcome branches and result-only entries.${statusSummary ? ` Selected results · ${statusSummary}` : ""}`,
      )}</p>
      <div class="hades-calculation-grid">${rows || `<p>${calculationCopy("표시할 선택 결과가 없습니다.", "No selected results to display.")}</p>`}</div>
      ${blockerRows ? `<details data-role="hades-input-required-summary" open>
        <summary>${calculationCopy(`추가 입력 필요 ${formatNumber(inputBlockers.length)}개`, `${formatNumber(inputBlockers.length)} required inputs`)}</summary>
        <div class="hades-calculation-grid">${blockerRows}</div>
        <button type="button" data-action="open-overlay" data-overlay="divinity">${calculationCopy("신격 입력 열기", "Open Divinity inputs")}</button>
      </details>` : ""}
    </section>
  `;
}

const FIREBIRD_CALCULATION_TARGET_COPY = Object.freeze({
  dexterity: ["민첩", "Dexterity"],
  maxLifePercent: ["최대 HP", "Maximum HP"],
  maxShieldPercent: ["최대 보호막", "Maximum shield"],
  fireResistancePercent: ["화염 저항", "Fire resistance"],
  coldResistancePercent: ["냉기 저항", "Cold resistance"],
  lightningResistancePercent: ["번개 저항", "Lightning resistance"],
  movementSpeedPercent: ["이동 속도", "Movement speed"],
  barrierShieldAdditionalPercent: ["장벽 방어막 비율(별도)", "Barrier shield ratio (additional)"],
  armorAdditionalPercent: ["아머 수치(추가)", "Armor value (additional)"],
  maxLifeAbsolute: ["최대 HP 최종 반영", "Final maximum HP"],
  maxShieldAbsolute: ["최대 보호막 최종 반영", "Final maximum shield"],
  barrierAmountAbsolute: ["장벽 방어막 최종 반영", "Final barrier shield"],
  barrierBurstTriggerCadence: ["장벽 폭발 발동 주기", "Barrier Burst trigger cadence"],
  barrierBurstCoefficient: ["장벽 폭발 계수", "Barrier Burst coefficient"],
});

function getFirebirdCalculationTargetLabel(targetKey) {
  const copy = FIREBIRD_CALCULATION_TARGET_COPY[targetKey];
  return copy ? (state.locale === "ko" ? copy[0] : copy[1]) : humanizeCalculationKey(targetKey);
}

function formatFirebirdCalculationValue(entry) {
  const value = Number(entry?.value);
  if (!Number.isFinite(value)) return ui("traceUnsupported");
  const sign = value > 0 ? "+" : "";
  const percent = ["percent", "percent-point", "additional-percent"].includes(entry.unit);
  return `${sign}${formatNumber(value)}${percent ? "%" : ""}`;
}

function renderFirebirdCalculationProjection(calc) {
  const projection = calc?.firebirdProjection;
  if (!projection?.active) return "";
  const plannerDefaults = projection.entries.filter(({ valueOrigin }) => valueOrigin === "planner-default");
  const fixedValues = projection.entries.filter(({ valueOrigin }) => valueOrigin !== "planner-default");
  const modifierRows = [...fixedValues, ...plannerDefaults].map((entry) => `
    <div class="firebird-calculation-row" data-value-origin="${escapeHtml(entry.valueOrigin)}">
      <span>${escapeHtml(getFirebirdCalculationTargetLabel(entry.semanticTargetKey))}</span>
      <strong>${escapeHtml(formatFirebirdCalculationValue(entry))}</strong>
      <small>${entry.valueOrigin === "planner-default"
        ? calculationCopy("플래너 기본값 · 실제 롤 미입력", "Planner default · actual roll not entered")
        : calculationCopy("TLIDB SS13 고정값", "Fixed TLIDB SS13 value")}</small>
    </div>
  `).join("");
  const unsupportedRows = projection.unsupported.map((entry) => `
    <div class="firebird-calculation-row is-unsupported">
      <span>${escapeHtml(getFirebirdCalculationTargetLabel(entry.semanticTargetKey))}</span>
      <strong>${ui("traceUnsupported")}</strong>
      <small>${ui(getTraceReasonKey({ inactiveReason: entry.reason, evidence: "unsupported" }))}</small>
    </div>
  `).join("");

  return `
    <section class="firebird-calculation-projection" data-role="firebird-calculation-projection">
      <header>
        <span>${calculationCopy("선택 장비 주변 계산", "Selected gear calculation")}</span>
        <strong>${calculationCopy("제련된 새", "Firebird")}</strong>
      </header>
      <p>${calculationCopy(
        "플래너 기본값은 실제 아이템 롤이 아닙니다. 장벽 폭발 계수와 발동 주기는 서로 다른 미지원 항목입니다.",
        "Planner defaults are not the item's actual rolls. The Barrier Burst coefficient and trigger cadence are separate unsupported inputs.",
      )}</p>
      <div class="firebird-calculation-grid">${modifierRows}</div>
      <details class="firebird-calculation-blockers" open>
        <summary><span>${calculationCopy("최종값 연결 미지원", "Unsupported final-value links")}</span><strong>${formatNumber(projection.unsupported.length)}</strong></summary>
        <div class="firebird-calculation-grid">${unsupportedRows}</div>
      </details>
    </section>
  `;
}

function renderAnalysisGearUpgradeResult(analysis) {
  if (!analysis?.result) return "";
  const { result, slotIndex } = analysis;
  const scopeCopy = ui("gearUpgradeScope", { slot: ui(slotKeyForGearIndex(slotIndex)) });
  const evaluated = Number(result.scope?.evaluatedCandidateCount ?? 0);
  const skipped = Number(result.scope?.skippedCandidateCount ?? 0);
  const candidates = result.status === "ready" ? result.candidates : [];

  return `
    <div class="analysis-gear-upgrade-result">
      <strong>${scopeCopy}</strong>
      <p class="analysis-gear-upgrade-scope"
        data-role="analysis-gear-upgrade-scope"
        data-evaluated-candidate-count="${evaluated}"
        data-skipped-candidate-count="${skipped}">${ui("gearUpgradeEvaluationScope", { evaluated, skipped })}</p>
      ${
        candidates.length
          ? `<div class="gear-upgrade-results">${candidates.map((candidate, index) => {
              const item = findItemById(candidate.itemId);
              const displayItem = item ? itemText(item) : { name: candidate.itemId };
              return `
                <article>
                  <div>
                    <strong>${escapeHtml(displayItem.name)}</strong>
                    <span>${ui("dpsGain", { value: formatNumber(candidate.deltaDps) })}</span>
                    <small>${ui("gearUpgradeEvidence", {
                      unsupported: candidate.unsupportedSourceCount,
                      inactive: candidate.inactiveSourceCount,
                    })}</small>
                  </div>
                  <button data-action="analysis-apply-gear-upgrade" data-candidate-index="${index}">${ui("apply")}</button>
                </article>
              `;
            }).join("")}</div><p class="gear-upgrade-footnote">${ui("gearUpgradeStoredConfig")}</p>`
          : `<p class="gear-upgrade-empty" data-role="analysis-gear-upgrade-unavailable">${ui(result.status === "calculation-coverage-incomplete" ? "gearUpgradeCalculationUnavailable" : "gearUpgradeNoImprovement")}</p>`
      }
    </div>
  `;
}

function formatMarginalProbeInput(candidate) {
  if (candidate.unit === "percentage-point") return ui("marginalInputPercentagePoint", { value: candidate.inputValue });
  if (candidate.unit === "percent") return ui("marginalInputPercent", { value: candidate.inputValue });
  return ui("marginalInputPoint", { value: candidate.inputValue });
}

function formatMarginalRelativePercent(value) {
  return new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 4,
  }).format(Number(value));
}

function renderDpsMarginalCandidateList(result, rowRole) {
  return `
    <div class="analysis-global-marginal-list" role="list">
      ${result.candidates.map((candidate, index) => `
        <article data-role="${rowRole}" data-rank="${index + 1}"
          data-probe-id="${escapeHtml(candidate.probeId)}" role="listitem">
          <b>${index + 1}</b>
          <span><strong>${ui(candidate.labelKey)}</strong><small>${formatMarginalProbeInput(candidate)}</small></span>
          <span><strong>${ui("dpsGain", { value: formatNumber(candidate.deltaDps) })}</strong><small>${candidate.relativeGainPercent === null
            ? ui("marginalRelativeUnavailable")
            : ui("marginalRelativeGain", { value: formatMarginalRelativePercent(candidate.relativeGainPercent) })}</small></span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderGlobalDpsMarginalResult(analysis) {
  if (!analysis?.result) return "";
  const { result } = analysis;
  const scope = result.scope;
  const scopeCopy = ui("marginalScope", {
    evaluated: scope.evaluatedProbeCount,
    skipped: scope.skippedProbeCount,
    improved: scope.improvementProbeCount,
  });
  if (result.status !== "ready") {
    const reasonKey = result.status === "no-skill"
      ? "marginalNoSkill"
      : result.status === "unevaluable"
        ? "marginalUnevaluable"
        : "marginalCalculationUnavailable";
    return `
      <div class="analysis-global-marginal-result is-unavailable" data-role="analysis-global-marginal-result"
        data-analysis-status="${escapeHtml(result.status)}"
        data-evaluated-probe-count="${scope.evaluatedProbeCount}"
        data-skipped-probe-count="${scope.skippedProbeCount}">
        <p class="analysis-global-marginal-scope">${scopeCopy}</p>
        <p class="calculation-limit-notice">${ui(reasonKey)}</p>
      </div>
    `;
  }

  return `
    <div class="analysis-global-marginal-result" data-role="analysis-global-marginal-result"
      data-analysis-status="ready"
      data-evaluated-probe-count="${scope.evaluatedProbeCount}"
      data-skipped-probe-count="${scope.skippedProbeCount}">
      <div class="analysis-global-marginal-summary">
        <strong>${ui("marginalResultTitle")}</strong>
        <span>${ui("marginalBaseline", { value: formatNumber(result.baseline.dps) })}</span>
      </div>
      <p class="analysis-global-marginal-scope">${scopeCopy}</p>
      ${renderDpsMarginalCandidateList(result, "analysis-global-marginal-row")}
    </div>
  `;
}

function renderGlobalDpsMarginals() {
  const hasResult = Boolean(state.analysisMarginal?.result);
  return `
    <section class="analysis-global-marginals" data-role="analysis-global-marginals">
      <div class="analysis-global-marginal-heading">
        <h3>${ui("marginalTitle")}</h3>
        <p>${ui("marginalIntro")}</p>
      </div>
      <button type="button" data-action="analysis-find-global-marginals">${ui(hasResult ? "marginalRefresh" : "marginalFind")}</button>
      ${renderGlobalDpsMarginalResult(state.analysisMarginal)}
    </section>
  `;
}

function renderSkillDpsMarginalResult(analysis) {
  if (!analysis?.result) return "";
  const { result, target } = analysis;
  const scope = result.scope;
  const row = state.lastSkillRows.find((candidate) => (
    candidate.rowIndex === target.rowIndex && candidate.skillId === target.skillId
  ));
  const display = getSkillRowDisplay(row ?? target);
  const level = row?.level ?? result.baseline.level;
  const scopeCopy = ui("marginalScope", {
    evaluated: scope.evaluatedProbeCount,
    skipped: scope.skippedProbeCount,
    improved: scope.improvementProbeCount,
  });
  const selectedSkill = `${escapeHtml(display.name)} · ${ui("levelValue", { value: level ?? "—" })}`;
  const resultAttributes = `data-analysis-status="${escapeHtml(result.status)}"
    data-evaluated-probe-count="${scope.evaluatedProbeCount}"
    data-skipped-probe-count="${scope.skippedProbeCount}"`;

  if (result.status !== "ready") {
    const reasonKey = result.status === "skill-not-found"
      ? "skillMarginalNotFound"
      : "skillMarginalCalculationUnavailable";
    return `
      <div class="analysis-global-marginal-result is-unavailable" data-role="analysis-skill-marginal-result"
        ${resultAttributes}>
        <div class="analysis-global-marginal-summary"><strong>${selectedSkill}</strong><span>${ui("traceUnsupported")}</span></div>
        <p class="analysis-global-marginal-scope">${scopeCopy}</p>
        <p class="calculation-limit-notice">${ui(reasonKey)}</p>
      </div>
    `;
  }

  return `
    <div class="analysis-global-marginal-result" data-role="analysis-skill-marginal-result"
      ${resultAttributes}>
      <div class="analysis-global-marginal-summary">
        <strong>${selectedSkill}</strong>
        <span>${ui("skillMarginalBaseline", { value: formatNumber(result.baseline.dps) })}</span>
      </div>
      <p class="analysis-global-marginal-scope">${scopeCopy}</p>
      ${renderDpsMarginalCandidateList(result, "analysis-skill-marginal-row")}
    </div>
  `;
}

function renderSkillDpsMarginals(rows) {
  const selectedTarget = state.analysisSkillMarginal?.target;
  return `
    <section class="analysis-skill-marginals" data-role="analysis-skill-marginals">
      <div class="analysis-global-marginal-heading">
        <h3>${ui("skillMarginalTitle")}</h3>
        <p>${ui("skillMarginalIntro")}</p>
      </div>
      ${rows.length ? `
        <div class="analysis-skill-marginal-targets" role="group" aria-label="${ui("skillMarginalSelectSkill")}">
          ${rows.map((row) => {
            const display = getSkillRowDisplay(row);
            const selected = selectedTarget?.rowIndex === row.rowIndex
              && selectedTarget?.skillId === row.skillId;
            return `
              <button type="button" class="${selected ? "is-active" : ""}"
                data-action="analysis-find-skill-marginals"
                data-row-index="${row.rowIndex}"
                data-skill-id="${escapeHtml(row.skillId)}"
                aria-pressed="${selected}">
                <span><strong>${escapeHtml(display.name)}</strong><small>${ui("levelValue", { value: row.level })}</small></span>
                <b>${ui(row.calculationSupported === true ? "skillMarginalCompare" : "traceUnsupported")}</b>
              </button>
            `;
          }).join("")}
        </div>
      ` : `<p class="empty">${ui("marginalNoSkill")}</p>`}
      ${renderSkillDpsMarginalResult(state.analysisSkillMarginal)}
    </section>
  `;
}

function renderAnalysisGearUpgrades() {
  const selectedSlotIndex = state.analysisGearUpgrade?.slotIndex ?? -1;
  return `
    <section class="analysis-gear-upgrades" data-role="analysis-gear-upgrades">
      <div class="analysis-gear-upgrade-heading">
        <h3>${ui("gearUpgradeTitle")}</h3>
        <p>${ui("gearUpgradeIntro")}</p>
      </div>
      <div class="analysis-gear-slot-list" role="group" aria-label="${ui("gearUpgradeSelectSlot")}">
        ${SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES.map((slotIndex) => `
          <button type="button"
            class="${slotIndex === selectedSlotIndex ? "is-active" : ""}"
            data-action="analysis-find-gear-upgrades"
            data-slot-index="${slotIndex}"
            aria-pressed="${slotIndex === selectedSlotIndex}">${ui(slotKeyForGearIndex(slotIndex))}</button>
        `).join("")}
      </div>
      ${renderAnalysisGearUpgradeResult(state.analysisGearUpgrade)}
    </section>
  `;
}

function renderAnalysisGearSlotMarginalResult(analysis) {
  if (!analysis?.result) return "";
  const { result, slotIndex } = analysis;
  const scope = result.scope;
  const item = scope.currentItemId ? findItemById(scope.currentItemId) : null;
  const displayItem = item ? itemText(item).name : ui("gearSlotMarginalEmptyItem");
  const resultAttributes = `data-analysis-status="${escapeHtml(result.status)}"
    data-evaluated-scenario-count="${scope.evaluatedScenarioCount}"
    data-skipped-scenario-count="${scope.skippedScenarioCount}"`;

  if (result.status !== "ready") {
    const reasonKey = result.status === "empty-slot"
      ? "gearSlotMarginalEmpty"
      : result.status === "no-skill"
        ? "marginalNoSkill"
        : result.status === "unevaluable"
          ? "marginalUnevaluable"
          : "gearSlotMarginalCalculationUnavailable";
    return `
      <div class="analysis-global-marginal-result is-unavailable"
        data-role="analysis-gear-slot-marginal-result" ${resultAttributes}>
        <div class="analysis-global-marginal-summary">
          <strong>${ui(slotKeyForGearIndex(slotIndex))}</strong>
          <span>${escapeHtml(displayItem)}</span>
        </div>
        <p class="analysis-global-marginal-scope">${ui("gearSlotMarginalScope", {
          evaluated: scope.evaluatedScenarioCount,
          skipped: scope.skippedScenarioCount,
        })}</p>
        <p class="calculation-limit-notice">${ui(reasonKey)}</p>
      </div>
    `;
  }

  return `
    <div class="analysis-global-marginal-result" data-role="analysis-gear-slot-marginal-result"
      ${resultAttributes}>
      <div class="analysis-global-marginal-summary">
        <strong>${ui(slotKeyForGearIndex(slotIndex))} · ${escapeHtml(displayItem)}</strong>
        <span>${ui("gearSlotMarginalBaseline", { value: formatNumber(result.baseline.dps) })}</span>
      </div>
      <p class="analysis-global-marginal-scope">${ui("gearSlotMarginalScope", {
        evaluated: scope.evaluatedScenarioCount,
        skipped: scope.skippedScenarioCount,
      })}</p>
      <article class="analysis-gear-slot-marginal-value">
        <span><strong>${ui("gearSlotMarginalContribution")}</strong><small>${ui("gearSlotMarginalWithout", { value: formatNumber(result.withoutItem.dps) })}</small></span>
        <span><strong>${result.deltaDps >= 0 ? "+" : ""}${formatNumber(result.deltaDps)}</strong><small>${result.relativeContributionPercent === null
          ? ui("marginalRelativeUnavailable")
          : ui("gearSlotMarginalRelative", { value: formatMarginalRelativePercent(result.relativeContributionPercent) })}</small></span>
      </article>
    </div>
  `;
}

function renderGearSlotDpsMarginals() {
  const selectedSlotIndex = state.analysisGearSlotMarginal?.slotIndex ?? -1;
  return `
    <section class="analysis-gear-slot-marginals" data-role="analysis-gear-slot-marginals">
      <div class="analysis-gear-upgrade-heading">
        <h3>${ui("gearSlotMarginalTitle")}</h3>
        <p>${ui("gearSlotMarginalIntro")}</p>
      </div>
      <div class="analysis-gear-slot-list" role="group" aria-label="${ui("gearSlotMarginalSelectSlot")}">
        ${SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES.map((slotIndex) => `
          <button type="button"
            class="${slotIndex === selectedSlotIndex ? "is-active" : ""}"
            data-action="analysis-find-gear-slot-marginal"
            data-slot-index="${slotIndex}"
            aria-pressed="${slotIndex === selectedSlotIndex}">${ui(slotKeyForGearIndex(slotIndex))}</button>
        `).join("")}
      </div>
      ${renderAnalysisGearSlotMarginalResult(state.analysisGearSlotMarginal)}
    </section>
  `;
}

function renderCalculationSkillEffect(effect, calculationSupported) {
  const inactive = effect.applied === false;
  const sourceText = effect.unit === "authority-link"
    && typeof effect.sourceText === "string"
    && effect.sourceText.trim()
      ? `<small class="calculation-skill-effect-source-text">${escapeHtml(presentCalculationSourceText(effect.sourceText, state.locale))}</small>`
      : "";
  return `
    <div class="calculation-skill-effect ${inactive ? "is-inactive" : "is-applied"}"
      data-effect-target="${escapeHtml(effect.targetKey ?? "")}">
      <span>${escapeHtml(getTraceSourceLabel(effect))}</span>
      ${sourceText}
      <small class="trace-evidence is-${escapeHtml(effect.evidence)}">${ui(TRACE_EVIDENCE_KEYS[effect.evidence] || "traceUnsupported")}</small>
      <strong>${calculationSupported ? formatEffectValue(effect, "") : ui("traceUnsupported")}</strong>
      ${renderEffectConditions(effect)}
      ${inactive ? `<small>${ui(getTraceReasonKey(effect))}</small>` : ""}
    </div>
  `;
}

function renderCalculationSkillEnemyArmor(row) {
  const armor = row?.enemyArmor;
  const penetration = Number.isFinite(armor?.penetration) ? armor.penetration : 0;
  if (
    !armor
    || !Number.isFinite(armor.value)
    || (armor.value <= 0 && penetration <= 0)
    || !Number.isFinite(row?.hit?.dps)
    || row.hit.dps <= 0
  ) return "";
  const sourceUrl = safeHttpUrl(armor.sourceUrl);
  const penetrationSourceUrl = penetration > 0
    ? safeHttpUrl(armor.penetrationSourceUrl)
    : "";
  const formatPercent = (value) => new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value));
  const physicalReduction = Number.isFinite(armor.penetratedPhysicalReductionPercent)
    ? armor.penetratedPhysicalReductionPercent
    : armor.physicalReductionPercent;
  const nonPhysicalReduction = Number.isFinite(armor.penetratedNonPhysicalReductionPercent)
    ? armor.penetratedNonPhysicalReductionPercent
    : armor.nonPhysicalReductionPercent;
  return `
    <div class="calculation-selected-skill-armor" data-role="calculation-skill-enemy-armor">
      <strong>${calculationCopy(`적 아머 ${formatNumber(armor.value)}`, `Enemy Armor ${formatNumber(armor.value)}`)}</strong>
      ${penetration > 0 ? `<span><strong>${calculationCopy("아머 대미지 감소 관통", "Armor Damage Mitigation Penetration")} ${formatPercent(penetration)}%</strong></span>` : ""}
      <span>${calculationCopy(
        `계산 후 물리 적중 감소 ${formatPercent(physicalReduction)}% · 비물리 적중 감소 ${formatPercent(nonPhysicalReduction)}%`,
        `Calculated Physical Hit reduction ${formatPercent(physicalReduction)}% · non-Physical Hit reduction ${formatPercent(nonPhysicalReduction)}%`,
      )}</span>
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 한국어 원문", "TLIDB source")}</a>` : ""}
      ${penetrationSourceUrl ? `<a href="${escapeHtml(penetrationSourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 관통 공식", "TLIDB Penetration formula")}</a>` : ""}
    </div>
  `;
}

function renderCalculationSkillEnemyResistances(row) {
  const resistances = row?.enemyResistances;
  if (!resistances || typeof resistances !== "object") return "";
  const labels = {
    fire: calculationCopy("화염", "Fire"),
    cold: calculationCopy("냉기", "Cold"),
    lightning: calculationCopy("번개", "Lightning"),
    erosion: calculationCopy("부식", "Erosion"),
  };
  const formatValue = (value) => new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value));
  const rows = Object.entries(labels).flatMap(([damageType, label]) => {
    const resistance = resistances[damageType];
    const penetration = Number.isFinite(resistance?.penetration) ? resistance.penetration : 0;
    if (
      !resistance
      || !Number.isFinite(resistance.value)
      || (resistance.value === 0 && penetration === 0)
    ) return [];
    const effectiveLabel = resistance.value === resistance.effectiveValue
      ? ""
      : calculationCopy(` · 유효 ${formatValue(resistance.effectiveValue)}%`, ` · effective ${formatValue(resistance.effectiveValue)}%`);
    const penetrationLabel = penetration > 0
      ? calculationCopy(
          ` · 관통 ${formatValue(penetration)}% · 계산 저항 ${formatValue(resistance.penetratedValue)}%`,
          ` · Penetration ${formatValue(penetration)}% · calculated Resistance ${formatValue(resistance.penetratedValue)}%`,
        )
      : "";
    return [`
      <span><strong>${label} ${calculationCopy("저항", "Resistance")} ${formatValue(resistance.value)}%${effectiveLabel}${penetrationLabel}</strong>
        ${calculationCopy("대미지 배율", "Damage multiplier")} ×${formatValue(resistance.damageMultiplier)}</span>
    `];
  });
  if (!rows.length) return "";
  const sourceUrl = safeHttpUrl(resistances.sourceUrl);
  const penetrationSourceUrl = safeHttpUrl(resistances.penetrationSourceUrl);
  return `
    <div class="calculation-selected-skill-resistance" data-role="calculation-skill-enemy-resistance">
      ${rows.join("")}
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 한국어 원문", "TLIDB source")}</a>` : ""}
      ${penetrationSourceUrl ? `<a href="${escapeHtml(penetrationSourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 관통 공식", "TLIDB Penetration formula")}</a>` : ""}
    </div>
  `;
}

function renderCalculationSkillAffliction(row) {
  const affliction = row?.affliction;
  if (!affliction || !Number.isFinite(affliction.rating)) return "";
  const formatValue = (value) => new Intl.NumberFormat(
    state.locale === "ko" ? "ko-KR" : "en-US",
    { maximumFractionDigits: 2 },
  ).format(Number(value));
  const sourceUrl = safeHttpUrl(affliction.sourceUrl);
  const effectParts = [];
  if (Number(affliction.effectIncrease) !== 0) {
    effectParts.push(calculationCopy(
      `심화 효과 ${Number(affliction.effectIncrease) > 0 ? "+" : ""}${formatValue(affliction.effectIncrease)}%`,
      `Affliction Effect ${Number(affliction.effectIncrease) > 0 ? "+" : ""}${formatValue(affliction.effectIncrease)}%`,
    ));
  }
  if (Number(affliction.effectMore) !== 1) {
    effectParts.push(calculationCopy(
      `심화 효과 추가 배율 ×${formatValue(affliction.effectMore)}`,
      `Additional Affliction Effect ×${formatValue(affliction.effectMore)}`,
    ));
  }
  if (Number(affliction.inflictedPerSecond) > 0) {
    effectParts.push(calculationCopy(
      `초당 심화 부여 ${formatValue(affliction.inflictedPerSecond)}`,
      `Affliction inflicted per second ${formatValue(affliction.inflictedPerSecond)}`,
    ));
  }
  return `
    <div class="calculation-selected-skill-affliction" data-role="calculation-skill-affliction">
      <span><strong>${calculationCopy("적 심화", "Enemy Affliction")} ${formatValue(affliction.rating)}</strong>
        ${calculationCopy("적용 심화", "Effective Affliction")} ${formatValue(affliction.effectiveRating)} ·
        ${calculationCopy("지속 대미지 배율", "DoT multiplier")} ×${formatValue(affliction.damageMultiplier)}</span>
      ${effectParts.length ? `<small>${effectParts.map(escapeHtml).join(" · ")}</small>` : ""}
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 심화 공식", "TLIDB Affliction formula")}</a>` : ""}
    </div>
  `;
}

function renderCalculationSkillReaping(row) {
  const reaping = row?.reaping;
  if (!reaping || !Number.isFinite(reaping.durationSeconds)) return "";
  const formatValue = (value) => new Intl.NumberFormat(
    state.locale === "ko" ? "ko-KR" : "en-US",
    { maximumFractionDigits: 2 },
  ).format(Number(value));
  const sourceUrl = safeHttpUrl(reaping.sourceUrl);
  const recoverySourceUrl = safeHttpUrl(reaping.recoveryFormulaSourceUrl);
  const hasRecoveryTime = Number.isFinite(reaping.baseRecoverySeconds)
    && Number.isFinite(reaping.effectiveRecoverySeconds);
  const recoverySpeedIncrease = Number(reaping.recoverySpeedIncrease);
  const recoverySpeedLabel = Number.isFinite(recoverySpeedIncrease)
    ? `${recoverySpeedIncrease >= 0 ? "+" : ""}${formatValue(recoverySpeedIncrease)}%`
    : null;
  const cadenceSourceLabel = reaping.cadenceSource === "recovery-time"
    ? calculationCopy("자동 계산", "Automatic")
    : calculationCopy("직접 입력", "Manual input");
  const hasRepeatChance = Number.isFinite(reaping.repeatChance)
    && Number.isFinite(reaping.expectedRepeatMultiplier);
  return `
    <div class="calculation-selected-skill-reaping" data-role="calculation-skill-reaping">
      <span><strong>${calculationCopy("기본 수확 시간", "Base Reaping Duration")} ${formatValue(reaping.durationSeconds)}${calculationCopy("초", "s")}</strong>
        ${calculationCopy("적용 수확 시간", "Effective Reaping Duration")} ${formatValue(reaping.effectiveDurationSeconds)}${calculationCopy("초", "s")} ·
        ${calculationCopy("초당 수확 횟수", "Reapings per second")} ${formatValue(reaping.eventsPerSecond)}</span>
      ${hasRecoveryTime ? `
        <small data-role="calculation-skill-reaping-recovery">
          ${calculationCopy("기본 수확 회복 시간", "Base Reaping Recovery Time")} ${formatValue(reaping.baseRecoverySeconds)}${calculationCopy("초", "s")} ·
          ${calculationCopy("적용 수확 회복 시간", "Effective Reaping Recovery Time")} ${formatValue(reaping.effectiveRecoverySeconds)}${calculationCopy("초", "s")}
          ${recoverySpeedLabel ? ` · ${calculationCopy("수확 회복 속도", "Reaping Recovery Speed")} ${recoverySpeedLabel}` : ""} ·
          ${cadenceSourceLabel}
          ${recoverySourceUrl ? ` · <a href="${escapeHtml(recoverySourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 회복 시간 공식", "TLIDB recovery-time formula")}</a>` : ""}
        </small>
      ` : ""}
      ${hasRepeatChance ? `
        <small data-role="calculation-skill-reaping-repeat">
          ${calculationCopy("2회 수확 확률", "Double Reaping chance")} ${formatValue(reaping.repeatChance)}% ·
          ${calculationCopy("기대 수확 배율", "Expected Reaping multiplier")} ×${formatValue(reaping.expectedRepeatMultiplier)}
        </small>
      ` : ""}
      <small>${calculationCopy("1회 트루 대미지", "True Damage per Reaping")} ${formatValue(reaping.damagePerEvent)} ·
        ${calculationCopy("수확 초당 대미지", "Reaping DPS")} ${formatValue(reaping.dps)}</small>
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${calculationCopy("TLIDB 수확 공식", "TLIDB Reaping formula")}</a>` : ""}
    </div>
  `;
}

function renderCalculationDamageStages(row, { finalOnly = false } = {}) {
  const stages = row?.damageStages;
  if (!stages || typeof stages !== "object") return "";
  const formatStageNumber = (value) => new Intl.NumberFormat(
    state.locale === "ko" ? "ko-KR" : "en-US",
    { maximumFractionDigits: 2 },
  ).format(Number(value));
  const damageValue = (value) => Number.isFinite(value)
    ? formatStageNumber(value)
    : ui("traceUnsupported");
  const stageRows = [
    ["base-hit", "damageStageBaseHit", damageValue(stages.baseHitAverage)],
    ["added-hit", "damageStageAddedHit", damageValue(stages.addedHitAverage)],
    ["hit-increase", "damageStageAfterIncrease", damageValue(stages.hitAfterIncrease)],
    ["hit-additional", "damageStageAfterAdditional", damageValue(stages.hitAfterAdditional)],
    ["hit-taken", "damageStageAfterTaken", damageValue(stages.hitAfterTaken)],
    ["hit-mitigation", "damageStageAfterMitigation", damageValue(stages.hitAfterMitigation)],
    ["action-rate", "damageStageActionRate", Number.isFinite(stages.hitRate)
      ? `${formatStageNumber(stages.hitRate)}/${calculationCopy("초", "s")}`
      : ui("traceUnsupported")],
    ["projectile-hits", "damageStageProjectileHits", Number.isFinite(stages.projectileHits)
      ? calculationCopy(`${formatStageNumber(stages.projectileHits)}회`, `${formatStageNumber(stages.projectileHits)}`)
      : ui("traceUnsupported")],
    ["hit-dps", "damageStageHitDps", damageValue(stages.hitDps)],
    ...(Number.isFinite(stages.hitAfterLuckyDps)
      ? [["lucky-damage", "damageStageAfterLuckyDamage", damageValue(stages.hitAfterLuckyDps)]]
      : []),
    ["critical", "damageStageAfterCritical", damageValue(stages.hitAfterCriticalDps)],
    ["double-damage", "damageStageAfterDoubleDamage", damageValue(stages.hitAfterDoubleDamageDps)],
    ["triple-damage", "damageStageAfterTripleDamage", damageValue(stages.hitAfterTripleDamageDps)],
    ["base-dot", "damageStageBaseDot", damageValue(stages.baseDotAverage)],
    ["dot-increase", "damageStageDotAfterIncrease", damageValue(stages.dotAfterIncrease)],
    ["dot-additional", "damageStageDotAfterAdditional", damageValue(stages.dotAfterAdditional)],
    ["dot-taken", "damageStageDotAfterTaken", damageValue(stages.dotAfterTaken)],
    ["dot-affliction", "damageStageDotAfterAffliction", damageValue(stages.dotAfterAffliction)],
    ["dot-mitigation", "damageStageDotAfterMitigation", damageValue(stages.dotAfterMitigation)],
    ["dot-instances", "damageStageDotInstances", Number.isFinite(stages.dotInstances)
      ? calculationCopy(`${formatStageNumber(stages.dotInstances)}개`, `${formatStageNumber(stages.dotInstances)}`)
      : ui("traceUnsupported")],
    ["dot-uptime", "damageStageDotUptime", Number.isFinite(stages.dotUptime)
      ? `${formatStageNumber(stages.dotUptime * 100)}%`
      : ui("traceUnsupported")],
    ["dot-dps", "damageStageDotDps", damageValue(stages.dotDps)],
    ["reaping-duration", "damageStageReapingDuration", Number.isFinite(stages.reapingEffectiveDurationSeconds)
      ? `${formatStageNumber(stages.reapingEffectiveDurationSeconds)}${calculationCopy("초", "s")}`
      : ui("traceUnsupported")],
    ["reaping-recovery", "damageStageReapingRecovery", Number.isFinite(stages.reapingEffectiveRecoverySeconds)
      && stages.reapingEffectiveRecoverySeconds > 0
      ? `${formatStageNumber(stages.reapingEffectiveRecoverySeconds)}${calculationCopy("초", "s")}`
      : ui("traceUnsupported")],
    ["reaping-damage-per-event", "damageStageReapingDamagePerEvent", damageValue(stages.reapingDamagePerEvent)],
    ["reaping-events-per-second", "damageStageReapingEventsPerSecond", Number.isFinite(stages.reapingEventsPerSecond)
      ? `${formatStageNumber(stages.reapingEventsPerSecond)}/${calculationCopy("초", "s")}`
      : ui("traceUnsupported")],
    ["reaping-dps", "damageStageReapingDps", damageValue(stages.reapingDps)],
    ["after-reaping", "damageStageAfterReaping", damageValue(stages.totalAfterReapingDps)],
    ["main-stat", "damageStageAfterMainStat", damageValue(stages.totalAfterMainStatDps)],
    ["overlevel", "damageStageAfterOverlevel", damageValue(stages.totalAfterOverlevelDps)],
    ["final-dps", "damageStageFinalDps", damageValue(stages.expectedTotalDps)],
  ];
  const visibleStageRows = finalOnly ? stageRows.slice(-1) : stageRows;
  return `
    <div class="calculation-damage-stages" data-role="calculation-damage-stages">
      <h4>${ui("calculationDamageStages")}</h4>
      <div class="calculation-damage-stage-grid">
        ${visibleStageRows.map(([key, labelKey, value]) => `
          <div class="calculation-damage-stage" data-damage-stage="${key}">
            <span>${ui(labelKey)}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderActiveSkillManaCost(row) {
  const manaCost = row?.manaCost;
  if (!manaCost || typeof manaCost !== "object") return "";
  const formatManaCost = (value) => new Intl.NumberFormat(
    state.locale === "ko" ? "ko-KR" : "en-US",
    { maximumFractionDigits: 12 },
  ).format(Number(value));
  const complete = manaCost.status === "complete"
    && Number.isFinite(manaCost.base)
    && Number.isFinite(manaCost.multiplierPercent)
    && Number.isFinite(manaCost.final);
  const sourceUrl = typeof manaCost.formulaSource?.sourceUrl === "string"
    ? manaCost.formulaSource.sourceUrl
    : "";
  return `
    <div class="calculation-skill-resource" data-role="active-skill-mana-cost"
      data-calculation-support="${complete ? "supported" : "unsupported"}">
      <span>${ui("activeSkillManaCost")}</span>
      <strong>${complete ? formatManaCost(manaCost.final) : ui("traceUnsupported")}</strong>
      <small>${complete
        ? ui("activeSkillManaCostFormula", {
          base: formatManaCost(manaCost.base),
          multiplier: formatManaCost(manaCost.multiplierPercent),
        })
        : ui("activeSkillManaCostUnsupported")}</small>
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${ui("activeSkillManaCostSource")}</a>` : ""}
    </div>
  `;
}

function renderActiveSkillCooldown(row) {
  const cooldown = row?.cooldown;
  if (!cooldown || typeof cooldown !== "object") return "";
  const formatCooldown = (value) => new Intl.NumberFormat(
    state.locale === "ko" ? "ko-KR" : "en-US",
    { maximumFractionDigits: 4 },
  ).format(Number(value));
  const complete = cooldown.status === "complete"
    && Number.isFinite(cooldown.baseSeconds)
    && Number.isFinite(cooldown.recoveryIncreasePercent)
    && Number.isFinite(cooldown.recoveryAdditionalMultiplier)
    && Number.isFinite(cooldown.effectiveSeconds);
  const sourceUrl = typeof cooldown.formulaSource?.sourceUrl === "string"
    ? cooldown.formulaSource.sourceUrl
    : "";
  return `
    <div class="calculation-skill-resource" data-role="active-skill-cooldown"
      data-calculation-support="${complete ? "supported" : "unsupported"}">
      <span>${ui("activeSkillCooldown")}</span>
      <strong>${complete
        ? `${formatCooldown(cooldown.effectiveSeconds)}${calculationCopy("초", "s")}`
        : ui("traceUnsupported")}</strong>
      <small>${complete
        ? ui("activeSkillCooldownFormula", {
          base: formatCooldown(cooldown.baseSeconds),
          effective: formatCooldown(cooldown.effectiveSeconds),
        })
        : ui("activeSkillCooldownUnsupported")}</small>
      ${complete ? `<small>${ui("activeSkillCooldownRecovery", {
        increase: formatCooldown(cooldown.recoveryIncreasePercent),
        additional: formatCooldown(cooldown.recoveryAdditionalMultiplier),
      })}</small>` : ""}
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${ui("activeSkillCooldownSource")}</a>` : ""}
    </div>
  `;
}

function renderCalculationSkillTarget(calc) {
  const rows = getEquippedActiveSkillRows();
  const selectedSkill = state.build.calculation?.selectedSkill;
  const currentRow = selectedSkill?.kind === "active"
    ? rows.find(({ rowIndex }) => rowIndex === selectedSkill.slotIndex)
    : null;
  const calculatedRow = currentRow && state.lastSkillRows.find((row) => (
    row.rowIndex === currentRow.rowIndex && row.skillId === currentRow.skillId
  ));
  // The picker follows the equipped build; result values belong to the last explicit calculation.
  const selectedRow = currentRow && (calculatedRow ?? {
    rowIndex: currentRow.rowIndex, skillId: currentRow.skillId, level: currentRow.level, calculationSupported: false,
  });

  if (!selectedRow) {
    return `
      <section class="calculation-skill-target" data-role="calculation-skill-target" data-snapshot-state="${state.isStale ? "stale" : "current"}">
        <label for="calculationSkillTarget">${ui("calculationSkillTarget")}</label>
        <select id="calculationSkillTarget" disabled>
          <option value="">${ui("calculationSkillTargetEmpty")}</option>
        </select>
        <p class="empty">${ui("calculationSkillTargetEmpty")}</p>
      </section>
    `;
  }

  const display = getSkillRowDisplay(selectedRow);
  const supported = selectedRow.calculationSupported === true;
  const finalDps = selectedRow.damageStages?.expectedTotalDps ?? selectedRow.dps;
  const rowKey = `skillRowDps:${selectedRow.rowIndex}`;
  const rowEffects = calculatedRow ? (calc.effects ?? []).filter(({ targetKey }) => targetKey === rowKey) : [];
  return `
    <section class="calculation-skill-target" data-role="calculation-skill-target"
      data-selected-slot-index="${selectedRow.rowIndex}"
      data-snapshot-state="${state.isStale ? "stale" : "current"}">
      <label for="calculationSkillTarget">${ui("calculationSkillTarget")}</label>
      <select id="calculationSkillTarget" aria-label="${ui("calculationSkillTarget")}">
        ${rows.map((row) => {
          const rowDisplay = getSkillRowDisplay(row);
          return `<option value="${row.rowIndex}" data-skill-slot-index="${row.rowIndex}" ${row.rowIndex === selectedRow.rowIndex ? "selected" : ""}>${escapeHtml(rowDisplay.name)} · ${ui("levelValue", { value: row.level })}</option>`;
        }).join("")}
      </select>
      <div class="calculation-selected-skill-summary" data-role="calculation-selected-skill-summary"
        data-calculation-support="${supported ? "supported" : "unsupported"}">
        <span><strong>${escapeHtml(display.name)}</strong><small>${ui("levelValue", { value: selectedRow.level })}</small></span>
        <b>${ui(supported ? "calculationSkillSupported" : "traceUnsupported")}</b>
      </div>
      <div class="calculation-selected-result" data-role="calculation-selected-result">
        <span>${ui("damageStageFinalDps")}</span>
        <strong>${supported && Number.isFinite(finalDps)
          ? new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", { maximumFractionDigits: 2 }).format(finalDps)
          : ui("traceUnsupported")}</strong>
      </div>
      ${renderActiveSkillManaCost(selectedRow)}
      ${renderActiveSkillCooldown(selectedRow)}
      ${supported ? renderCalculationSkillEnemyArmor(selectedRow) : ""}
      ${supported ? renderCalculationSkillEnemyResistances(selectedRow) : ""}
      ${supported ? renderCalculationSkillAffliction(selectedRow) : ""}
      ${supported ? renderCalculationSkillReaping(selectedRow) : ""}
      ${renderCalculationDamageStages(selectedRow, { finalOnly: !supported })}
      <div class="calculation-selected-skill-trace ${supported ? "" : "is-unsupported"}"
        data-role="calculation-selected-skill-trace" data-trace-key="${rowKey}"
        data-calculation-support="${supported ? "supported" : "unsupported"}">
        <h4>${ui("calculationSkillTrace")}</h4>
        ${supported
          ? renderCalculationTrace(calc, rowKey, "")
          : `<p class="calculation-limit-notice">${ui("traceUnsupported")}</p>`}
      </div>
      <div class="calculation-selected-skill-effects" data-role="calculation-selected-skill-effects">
        <h4>${ui("calculationSkillEffects")}</h4>
        ${rowEffects.length
          ? rowEffects.map((effect) => renderCalculationSkillEffect(effect, supported)).join("")
          : `<p class="empty">${ui("calculationSkillEffectsEmpty")}</p>`}
      </div>
    </section>
  `;
}

function renderStatTabContent(calc) {
  if (state.statTab === "conditions") {
    return renderConditionEditor();
  }

  if (!calc) {
    return `<p class="empty stat-empty">${ui("calculationEmptyHint")}</p>`;
  }

  if (state.statTab === "calculation") {
    return `
      ${renderCalculationSkillTarget(calc)}
      ${renderHadesCalculationProjection(calc)}
      ${renderFirebirdCalculationProjection(calc)}
      ${renderCalculationInputSummary(calc)}
      <div class="calculation-stat-tree">${renderCalculatedStatSections(calc)}</div>
      ${renderCalculationEvidence(calc)}
    `;
  }

  if (state.statTab === "analysis") {
    const rows = state.lastSkillRows;
    const damageRows = rows.filter((row) => row.calculationApplicable !== false);
    const supportedRows = damageRows.filter((row) => row.calculationSupported === true);
    const unsupportedCount = damageRows.length - supportedRows.length;
    const total = supportedRows.reduce((sum, row) => sum + row.dps, 0);
    const analysisRows = rows.length
      ? rows
          .map((row) => {
            const name = getSkillRowDisplay(row).name;
            const applicable = row.calculationApplicable !== false;
            const supported = applicable && row.calculationSupported === true;
            const share = supported && total > 0 ? Math.round((row.dps / total) * 100) : 0;
            return `
              <div class="stat-row" data-calculation-support="${supported ? "supported" : applicable ? "unsupported" : "not-applicable"}">
                <span>${escapeHtml(name)} · ${ui("levelValue", { value: row.level })}</span>
                <strong>${supported ? `${formatNumber(row.dps)} (${share}%)` : ui(applicable ? "traceUnsupported" : "traceNotApplicable")}</strong>
              </div>
            `;
          })
          .join("")
      : `<p class="empty stat-empty">${ui("dpsInsightEmpty")}</p>`;
    return `${unsupportedCount ? `<p class="calculation-limit-notice" data-role="analysis-calculation-unsupported">${ui("dpsInsightUnsupportedRows", { count: unsupportedCount })}</p>` : ""}${analysisRows}${renderGlobalDpsMarginals()}${renderSkillDpsMarginals(damageRows)}${renderGearSlotDpsMarginals()}${renderAnalysisGearUpgrades()}${renderCalculationEvidence(calc)}`;
  }

  return renderCalculatedStatSections(calc);
}

function renderProvenanceSource(source) {
  const inactive = source.applied === false;
  const category = CATEGORY_DEFS.find(({ id }) => id === source.categoryId);
  const reasonKey = getTraceReasonKey(source);
  const sourceLabel = escapeHtml(getTraceSourceLabel({
    sourceId: source.id,
    sourceItemId: source.sourceItemId,
    sourceLabel: source.label,
  }));
  const sourceUrl = safeHttpUrl(getTraceSourceUrl(source));
  return `
    <div class="calculation-source ${inactive ? "is-inactive" : "is-applied"}" data-source-id="${escapeHtml(source.id)}" role="listitem">
      ${sourceUrl
        ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${sourceLabel}</a>`
        : `<span>${sourceLabel}</span>`}
      ${category ? `<small>${escapeHtml(categoryText(category).label)}</small>` : ""}
      <small class="trace-evidence is-${escapeHtml(source.evidence)}">${ui(TRACE_EVIDENCE_KEYS[source.evidence] || "traceUnsupported")}</small>
      <strong>${inactive ? ui("traceInactive") : ui("adapted")}</strong>
      ${inactive ? `<small class="trace-reason">${ui(reasonKey)}</small>` : ""}
    </div>
  `;
}

function getEffectTargetLabel(effect) {
  if (FIREBIRD_CALCULATION_TARGET_COPY[effect.semanticTargetKey]) {
    return getFirebirdCalculationTargetLabel(effect.semanticTargetKey);
  }
  const targetKey = String(effect.targetKey ?? "");
  const flatKey = targetKey.replace(/^flat:/, "");
  if (targetKey.startsWith("flat:") || calcHasKnownStatKey(flatKey)) {
    return getStatDescriptor(flatKey).label;
  }
  if (/^tlidb:(increase|more):|^skillRowTlidb(Increase|More):/u.test(targetKey)) return getTraceValueDescriptor(targetKey).label;
  const skillRowMatch = targetKey.match(/^skillRowDps:(\d+)$/);
  if (skillRowMatch) return `${ui("linkedSkillDpsTotal")} #${Number(skillRowMatch[1]) + 1}`;
  const supportRowMatch = targetKey.match(/^skillRowSupportMultiplier:(\d+)$/);
  if (supportRowMatch) return `${ui("dpsRowSupports")} #${Number(supportRowMatch[1]) + 1}`;
  if (targetKey === "skillLevelTotal") return ui("skillLevel");
  if (targetKey === "moreDpsMultiplier") return ui("damageBonus");
  if (targetKey === "unmodeled") return ui("traceUnsupported");
  return humanizeCalculationKey(targetKey) || ui("traceUnsupported");
}

function calcHasKnownStatKey(statKey) {
  return STAT_ROWS.some(([, key]) => key === statKey) || EXTRA_STAT_DESCRIPTORS.has(statKey);
}

function getConditionDisplayLabel(diagnostic) {
  if (diagnostic.label) return diagnostic.label;
  const fixed = CONDITION_FIXED_FIELDS.find(({ path }) => path === diagnostic.path);
  if (fixed) return ui(fixed.label);
  const [prefix, name] = String(diagnostic.path ?? "").split(".", 2);
  const group = CONDITION_MAP_GROUPS.find(({ id }) => id === prefix);
  if (group) return `${ui(group.label)} · ${conditionMapKeyLabel(prefix, name)}`;
  return calculationCopy("계산 조건", "Calculation condition");
}

function renderEffectConditions(effect) {
  const evaluation = effect.conditionEvaluation;
  if (!evaluation) return "";
  const diagnostics = [
    ...(evaluation.active ?? []),
    ...(evaluation.unmet ?? []),
    ...(evaluation.unsupported ?? []).filter((entry) => !(evaluation.unmet ?? []).includes(entry)),
  ];
  if (!diagnostics.length) return "";
  return `
    <ul class="effect-condition-list">
      ${diagnostics.map((diagnostic) => `
        <li class="${diagnostic.satisfied ? "is-active" : "is-inactive"}">
          <span>${escapeHtml(getConditionDisplayLabel(diagnostic))}</span>
          <small>${escapeHtml(formatConditionDiagnostic(state.locale, diagnostic))}</small>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderEffectLedgerRow(effect) {
  const inactive = effect.applied === false;
  const reasonKey = getTraceReasonKey(effect);
  return `
    <div class="calculation-effect ${inactive ? "is-inactive" : "is-applied"}" role="listitem">
      <span class="calculation-effect-source">${escapeHtml(getTraceSourceLabel(effect))}</span>
      <small>${escapeHtml(getEffectTargetLabel(effect))}</small>
      <strong>${formatEffectValue(effect, "")}</strong>
      <small class="trace-evidence is-${escapeHtml(effect.evidence)}">${ui(TRACE_EVIDENCE_KEYS[effect.evidence] || "traceUnsupported")}</small>
      <small class="calculation-effect-state">${inactive ? ui(reasonKey) : ui("adapted")}</small>
      ${renderEffectConditions(effect)}
    </div>
  `;
}

function renderEvidenceGroup(title, entries, renderer, { open = false } = {}) {
  return `
    <details class="calculation-evidence-group" ${open ? "open" : ""}>
      <summary><span>${title}</span><strong>${formatNumber(entries.length)}</strong></summary>
      <div class="calculation-evidence-list" role="list">
        ${entries.length
          ? entries.map(renderer).join("")
          : `<p class="empty">${calculationCopy("해당 항목 없음", "No entries")}</p>`}
      </div>
    </details>
  `;
}

function formatPatchOverlayState(snapshot) {
  if (!snapshot?.overlayState) return undefined;
  if (snapshot.overlayState === "official-db-active") {
    return calculationCopy("공식 데이터 적용 중", "Official data active");
  }
  if (snapshot.overlayState === "announced-pre-release-overlay") {
    return calculationCopy("출시 전 데이터 적용", "Pre-release data applied");
  }
  return calculationCopy("미확인 데이터 상태", "Unverified data state");
}

function formatPatchCalculationBasis(snapshot) {
  const season = String(snapshot?.season ?? "").trim();
  return season ? `TLIDB ${season}` : "TLIDB";
}

function renderPatchSnapshot(snapshot, title) {
  const rows = [
    [calculationCopy("계산 기준", "Calculation basis"), formatPatchCalculationBasis(snapshot)],
    [calculationCopy("적용 시즌", "Active season"), snapshot?.season],
    [calculationCopy("기준 시즌", "Baseline season"), snapshot?.baselineSeason],
    [calculationCopy("시즌 데이터 출처", "Season data source"), snapshot?.overlaySeason],
    [calculationCopy("시즌 데이터 상태", "Season data state"), formatPatchOverlayState(snapshot)],
    [calculationCopy("시즌 데이터 적용 완료", "Season data application complete"), snapshot?.overlayApplicationComplete === undefined ? undefined : formatConditionEvidenceValue(state.locale, snapshot.overlayApplicationComplete)],
    [calculationCopy("구조 참고 버전", "Structural reference"), snapshot?.structuralReferenceVersion],
    [calculationCopy("데이터 생성 시각", "Data generated"), snapshot?.dataGeneratedAt],
  ].filter(([, value]) => value !== undefined && value !== "");
  return `
    <div class="calculation-patch-snapshot">
      <h4>${title}</h4>
      ${rows.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    </div>
  `;
}

function renderCalculationEvidence(calc) {
  const confidence = calc.provenance.summary.confidence;
  const confidenceKey =
    confidence === "verified"
      ? "evidenceVerified"
      : confidence === "mixed"
        ? "evidenceMixed"
        : "evidenceIncomplete";
  const unsupported = calc.provenance.summary.counts.unsupported;
  const inactive = calc.provenance.summary.inactiveSources;
  const patchMismatch = calc.provenance.summary.patchMismatch;
  const calculationSeason = calc.provenance.patchSnapshot.season;
  const sources = calc.provenance.sources ?? [];
  const appliedSources = sources.filter((source) => source.applied !== false);
  const inactiveSourceEntries = sources.filter((source) => source.applied === false);
  const effects = calc.effects ?? [];
  const appliedEffects = effects.filter((effect) => effect.applied !== false);
  const inactiveEffects = effects.filter((effect) => effect.applied === false);
  const counts = calc.provenance.summary.counts;

  return `
    <div class="calculation-evidence is-${confidence}" aria-label="${ui("calculationEvidence")}">
      <div class="calculation-evidence-summary">
        <span>${ui(confidenceKey)}</span>
        <small>${calculationCopy("전체 출처", "Total sources")} ${formatNumber(calc.provenance.summary.totalSources)}</small>
        <small>${ui("traceMeasured")} ${formatNumber(counts.measured)}</small>
        <small>${ui("traceStructured")} ${formatNumber(counts.structured)}</small>
        <small>${ui("traceInferred")} ${formatNumber(counts.inferred)}</small>
        <small>${ui("traceUnsupported")} ${formatNumber(counts.unsupported)}</small>
      </div>
      ${unsupported ? `<small>${ui("unsupportedEffects", { count: unsupported })}</small>` : ""}
      ${inactive ? `<small>${ui("inactiveSources", { count: inactive })}</small>` : ""}
      ${patchMismatch ? `<small>${ui("savedBuildPatchMismatch")}</small>` : ""}
      <small>${ui("calculationPatch", { season: escapeHtml(calculationSeason) })}</small>
      <div class="calculation-evidence-tree">
        ${renderEvidenceGroup(calculationCopy("적용 출처", "Applied sources"), appliedSources, renderProvenanceSource, { open: true })}
        ${renderEvidenceGroup(calculationCopy("미적용 출처", "Inactive sources"), inactiveSourceEntries, renderProvenanceSource)}
        ${renderEvidenceGroup(calculationCopy("적용 효과", "Applied effects"), appliedEffects, renderEffectLedgerRow)}
        ${renderEvidenceGroup(calculationCopy("제외 효과", "Excluded effects"), inactiveEffects, renderEffectLedgerRow)}
        <details class="calculation-evidence-group calculation-patch-group">
          <summary><span>${calculationCopy("계산 데이터 기준", "Calculation data snapshots")}</span><strong>${patchMismatch ? 2 : 1}</strong></summary>
          <div class="calculation-patch-grid">
            ${renderPatchSnapshot(calc.provenance.patchSnapshot, calculationCopy("현재 계산", "Current calculation"))}
            ${patchMismatch ? renderPatchSnapshot(calc.provenance.buildPatchSnapshot, calculationCopy("저장된 빌드", "Saved build")) : ""}
          </div>
        </details>
      </div>
    </div>
  `;
}

function renderStatsDockLauncher(calc) {
  const calculationState = calculationStateName(calc);
  const openLabel = calculationCopy("전체 계산 결과 열기", "Open full calculation results");
  const resultLabel = calculationCopy("계산 결과", "Calculation results");
  const confidence = calc?.provenance?.summary?.confidence;
  const confidenceKey = confidence === "verified"
    ? "evidenceVerified"
    : confidence === "mixed"
      ? "evidenceMixed"
      : "evidenceIncomplete";
  const dpsUnsupported = Boolean(calc && getPublicStatUnsupportedState(calc, "dps"));
  const statusLabel = calculationState === "calculating"
    ? ui("calculatingBuild")
    : calculationState === "stale"
      ? ui("calculationStale")
      : calc
        ? `${ui("totalDps")} ${dpsUnsupported ? ui("traceUnsupported") : formatNumber(calc.summary?.dps ?? 0)} · ${ui(confidenceKey)}`
        : ui("calculationEmpty");

  return `
    <button type="button" class="stats-dock-launcher" data-action="open-stats-dock" aria-controls="statsDock" aria-expanded="${state.statsDockOpen}" aria-label="${escapeHtml(`${openLabel}. ${statusLabel}`)}">
      <span class="stats-dock-launcher-copy">
        <small>${resultLabel}</small>
        <strong>${escapeHtml(statusLabel)}</strong>
      </span>
      <span class="stats-dock-launcher-action" aria-hidden="true">${openLabel}<b>↑</b></span>
    </button>
  `;
}

function renderStatsDock(calc, { includeChrome = true } = {}) {
  const tabs = STAT_TAB_IDS.map((id) => [id, ui(id)]);
  const calculationState = calculationStateName(calc);
  const closeLabel = calculationCopy("계산 결과 닫기", "Close calculation results");
  const resultLabel = calculationCopy("계산 결과", "Calculation results");

  return `
    ${includeChrome && state.statsDockOpen ? `<button type="button" class="stats-dock-backdrop" data-action="close-stats-dock" aria-label="${closeLabel}" tabindex="-1"></button>` : ""}
    ${includeChrome ? renderStatsDockLauncher(calc) : ""}
    <aside id="statsDock" class="stats-dock ${state.statsDockOpen ? "is-responsive-open" : ""} ${state.expandedStatKey ? "has-expanded-trace" : ""}" data-calculation-state="${calculationState}" aria-busy="${state.isCalculating}" aria-label="${resultLabel}">
      <header class="stats-dock-responsive-header">
        <strong>${resultLabel}</strong>
        <button type="button" class="stats-dock-responsive-close" data-action="close-stats-dock" aria-label="${closeLabel}">×</button>
      </header>
      <div class="stat-tabs" role="tablist">
        ${tabs
          .map(
            ([id, label]) => {
              const active = state.statTab === id;
              return `<button type="button" id="stats-tab-${id}" role="tab" class="${active ? "is-active" : ""}" data-action="stat-tab" data-tab="${id}" aria-selected="${active}" aria-controls="stats-panel-${id}" tabindex="${active ? 0 : -1}">${label}</button>`;
            },
          )
          .join("")}
      </div>
      ${renderCalculationStatus(calc)}
      ${state.statTab === "conditions" ? renderConditionGroupTabs() : ""}
      ${tabs
        .map(([id]) => {
          const active = state.statTab === id;
          return `<div class="stat-scroll" id="stats-panel-${id}" role="tabpanel" aria-labelledby="stats-tab-${id}" ${active ? "" : "hidden"}>${active ? renderStatTabContent(calc) : ""}</div>`;
        })
        .join("")}
      <div class="stats-dock-actions">
        <button class="calc-panel-button" data-action="calc-panel-damage" ${state.isCalculating ? "disabled" : ""}>${ui(state.isCalculating ? "calculatingBuild" : "calcPanelButton")}</button>
        <button class="stats-dock-save" data-action="save">${calculationCopy("현재 빌드 저장", "Save current build")}</button>
      </div>
    </aside>
  `;
}

function setResponsiveStatsDockOpen(open, { restoreFocus = false } = {}) {
  state.statsDockOpen = Boolean(open);
  render();
  if (state.statsDockOpen) {
    document.querySelector(".stats-dock-responsive-close")?.focus();
  } else if (restoreFocus) {
    document.querySelector('[data-action="open-stats-dock"]')?.focus();
  }
}

function activateStatTab(tabId, { focus = false } = {}) {
  if (!STAT_TAB_IDS.includes(tabId)) return;
  state.statTab = tabId;
  const visibleKeys = state.statTab === "calculation" || state.statTab === "attributes"
    ? new Set(getCalculatedStatKeys(state.lastCalculation))
    : new Set();
  if (!visibleKeys.has(state.expandedStatKey)) state.expandedStatKey = null;
  render();
  if (focus) document.querySelector(`#stats-tab-${tabId}`)?.focus();
}

function handleStatTabKeydown(event) {
  const currentTab = typeof event.target?.closest === "function"
    ? event.target.closest('[role="tab"][data-action="stat-tab"]')
    : null;
  if (!currentTab) return false;
  const currentIndex = STAT_TAB_IDS.indexOf(currentTab.dataset.tab);
  if (currentIndex < 0) return false;

  let nextIndex = currentIndex;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + STAT_TAB_IDS.length) % STAT_TAB_IDS.length;
  else if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % STAT_TAB_IDS.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = STAT_TAB_IDS.length - 1;
  else return false;

  event.preventDefault();
  activateStatTab(STAT_TAB_IDS[nextIndex], { focus: true });
  return true;
}

const TRACE_EVIDENCE_KEYS = {
  measured: "traceMeasured",
  structured: "traceStructured",
  inferred: "traceInferred",
  unsupported: "traceUnsupported",
};

const TRACE_REASON_KEYS = {
  "incompatible-support": "traceReasonIncompatibleSupport",
  "unsupported-effect": "traceReasonUnsupportedEffect",
  "invalid-value": "traceReasonInvalidValue",
  "unsupported-operation": "traceReasonUnsupportedOperation",
  "unmodeled-target": "traceReasonUnmodeledTarget",
  "inactive-condition": "traceReasonInactiveCondition",
  "source-conflict": "traceReasonSourceConflict",
  "current-skill-coefficient-unavailable": "externalSkillCoefficientUnavailable",
  "unverified-condition-authority": "traceReasonUnverifiedConditionAuthority",
  "value-authority-unverified": "traceReasonValueAuthorityUnverified",
  "gear-calculation-coverage-incomplete": "traceReasonGearCoverageIncomplete",
  "hero-level-curve-unavailable": "traceReasonHeroLevelCurveUnavailable",
  "defensive-calculation-model-unavailable": "traceReasonDefensiveCalculationUnavailable",
  "base-life-total-unavailable": "traceReasonBaseLifeTotalUnavailable",
  "base-shield-total-unavailable": "traceReasonBaseShieldTotalUnavailable",
  "base-barrier-amount-unavailable": "traceReasonBaseBarrierAmountUnavailable",
  "trigger-cadence-unavailable": "traceReasonTriggerCadenceUnavailable",
  "no-modeled-current-value-contribution": "traceReasonNoModeledContribution",
  "elixir-skill-condition-inactive": "traceReasonElixirInactive",
  "elixir-charge-model-unavailable": "traceReasonElixirChargeUnavailable",
  "elixir-ingredient-effect-calculation-unavailable": "traceReasonElixirIngredientUnavailable",
  "elixir-ingredient-additional-stack-state-unavailable": "traceReasonElixirIngredientAdditionalStack",
  "elixir-ingredient-enemy-range-inactive": "traceReasonElixirIngredientRange",
  "elixir-ingredient-hero-trait-unavailable": "traceReasonElixirIngredientHero",
  "elixir-ingredient-trait-stage-unavailable": "traceReasonElixirIngredientStage",
  "elixir-ingredient-trait-level-authority-unavailable": "traceReasonElixirIngredientTraitLevel",
  "elixir-ingredient-base-trait-level-authority-unavailable": "traceReasonElixirIngredientTraitLevel",
  "elixir-ingredient-trait-tier-unavailable": "traceReasonElixirIngredientTraitTier",
  "elixir-ingredient-trait-tier-unavailable": "traceReasonElixirIngredientTraitTier",
  "elixir-ingredient-critical-only-damage-unavailable": "traceReasonElixirIngredientCritical",
  "elixir-ingredient-reaping-repeat-unavailable": "traceReasonElixirIngredientReaping",
  "no-reaping-repeat-chance-not-applied": "traceReasonNoReapingRepeat",
  "multiple-reaping-repeat-chance-effects": "traceReasonElixirEffectUnavailable",
  "reaping-repeat-chance-effect-invalid": "traceReasonElixirEffectUnavailable",
  "elixir-ingredient-damage-transfer-unavailable": "traceReasonElixirIngredientDefense",
  "elixir-ingredient-mana-damage-deduction-unavailable": "traceReasonElixirIngredientDefense",
  "elixir-ingredient-damage-taken-conversion-unavailable": "traceReasonElixirIngredientDefense",
  "elixir-ingredient-charge-model-unavailable": "traceReasonElixirChargeUnavailable",
  "elixir-skill-effect-calculation-unavailable": "traceReasonElixirEffectUnavailable",
  "elixir-effect-clause-unsupported": "traceReasonElixirEffectUnavailable",
  "elixir-main-skill-mismatch": "traceReasonElixirEffectUnavailable",
  "elixir-skill-identity-unverified": "traceReasonElixirEffectUnavailable",
  "elixir-bottle-mismatch": "traceReasonElixirEffectUnavailable",
  "elixir-support-calculation-unavailable": "traceReasonElixirEffectUnavailable",
  "no modeled compatible link": "traceReasonNoModeledContribution",
  "no modeled gear contribution": "traceReasonNoModeledContribution",
  "no modeled calculation contribution": "traceReasonNoModeledContribution",
  "no modeled custom affix contribution": "traceReasonNoModeledContribution",
  "no modeled gear override contribution": "traceReasonNoModeledContribution",
};

function getTraceReasonKey(record) {
  return TRACE_REASON_KEYS[record?.inactiveReason]
    || (record?.evidence === "unsupported" ? "traceReasonUnsupportedEffect" : "traceReasonInactiveCondition");
}

const TRACE_SOURCE_KEYS = {
  "base:combat": "traceSourceBaseCombat",
  "base:hero-lv90": "traceSourceHeroBase",
  "base:tlidb-hero-level": "traceSourceHeroBase",
  "base:tlidb-movement-speed": "traceSourceMovementSpeedFormula",
  "base:tlidb-shield-charge": "traceSourceShieldChargeFormula",
  "base:tlidb-regain": "traceSourceRegainFormula",
  "base:tlidb-regain-interval": "traceSourceRegainIntervalFormula",
  "model:tlidb-help-attributes": "traceSourceAttributeFormulas",
  "model:defensive-survivability": "traceSourceDefensiveModel",
  "input:orphan-skill-levels": "traceSourceOrphanSkillLevels",
  "input:hero-trait-config": "traceSourceHeroTraitConfig",
  "input:hero-memory-config": "traceSourceHeroMemoryConfig",
  "patch-snapshot:mismatch": "traceSourcePatchMismatch",
  "input:skill-support-slot-energy": "traceSourceSkillSlotEnergy",
  "input:skill-seal-config": "traceSourceSkillSealConfig",
  "input:skill-elixir-config": "traceSourceSkillElixirConfig",
  "input:skill-support-config": "traceSourceSkillSupportConfig",
  "custom:affixes": "traceSourceCustomAffixes",
  "custom:gear-affixes": "traceSourceGearAffixes",
};

const TRACE_MULTIPLIER_LABELS = new Set([
  "traceSkillLevelMultiplier",
  "traceAttackSpeedMultiplier",
  "traceCritMultiplier",
]);

function getHeroTraitTraceOption(sourceId) {
  if (!String(sourceId ?? "").startsWith("hero-trait:")) return null;
  const model = state.heroTraitRuntime.model;
  if (!model) return null;
  const selectedHeroId = state.build.selections.hero?.[0] ?? state.build.hero?.branchId;
  const branch = findHeroTraitBranch(model, selectedHeroId);
  if (!branch) return null;
  for (const stage of branch.stages ?? []) {
    const option = (stage.options ?? []).find((candidate) => candidate.id === sourceId);
    if (option) return option;
  }
  return null;
}

function getTraceSourceUrl(source) {
  const originalUrl = source.sourceUrl ?? source.receipt?.sourceUrl ?? "";
  const koreanTlidbSource = getHeroTraitTraceOption(source.id)
    || source.id === "base:tlidb-hero-level"
    || source.id === "base:tlidb-movement-speed"
    || source.id === "base:tlidb-shield-charge"
    || source.id === "base:tlidb-regain"
    || source.id === "base:tlidb-regain-interval";
  if (state.locale !== "ko" || !koreanTlidbSource) return originalUrl;
  return String(originalUrl).replace("https://tlidb.com/en/", "https://tlidb.com/ko/");
}

function presentResolvedTraceSourceLabel(sourceLabel, authority) {
  return presentTraceSourceLabel({
    locale: state.locale,
    sourceLabel,
    unavailableLabel: ui("traceSourceNameUnavailable"),
    authority,
  });
}

function getTraceSourceLabel(effect) {
  const sourceId = String(effect.sourceId ?? "");
  if (sourceId.startsWith("reference:91tob:pact:")) {
    return presentResolvedTraceSourceLabel(
      ui("traceSourcePactStructureReference"),
      TRACE_SOURCE_LABEL_AUTHORITY.APP_I18N,
    );
  }
  if (sourceId.startsWith("reference:91tob:divinity:")) {
    return presentResolvedTraceSourceLabel(
      ui("traceSourceDivinityStructureReference"),
      TRACE_SOURCE_LABEL_AUTHORITY.APP_I18N,
    );
  }
  const heroTraitOption = getHeroTraitTraceOption(sourceId);
  if (heroTraitOption) {
    return presentResolvedTraceSourceLabel(
      runtimeLocaleField(heroTraitOption, "name", heroTraitOption.name || effect.sourceLabel),
      TRACE_SOURCE_LABEL_AUTHORITY.TLIDB_EXACT_LOCALE,
    );
  }
  const licoriceIngredient = getTlidbLicoriceIngredientAuthority(sourceId);
  if (licoriceIngredient) {
    return presentResolvedTraceSourceLabel(
      licoriceIngredient.koName,
      TRACE_SOURCE_LABEL_AUTHORITY.TLIDB_EXACT_LOCALE,
    );
  }
  const authorityItem = findItemById(effect.sourceItemId);
  if (authorityItem) {
    return presentResolvedTraceSourceLabel(
      itemText(authorityItem).name,
      TRACE_SOURCE_LABEL_AUTHORITY.CATALOG_LOCALIZED,
    );
  }
  const derivedItemSource = [
    {
      match: sourceId.match(/^(.*):calculation-coverage$/u),
      labelKey: "traceSourceGearCoverage",
    },
    {
      match: sourceId.match(/^(.*):tlidb-tooltip-blocker:\d+$/u),
      labelKey: "traceSourceTlidbEffectUnsupported",
    },
    {
      match: sourceId.match(/^(.*):unsupported:[^:]+$/u),
      labelKey: "traceSourceCalculationUnsupported",
    },
  ].find(({ match }) => match);
  if (derivedItemSource) {
    const sourceItem = findItemById(derivedItemSource.match[1]);
    if (sourceItem) {
      return presentResolvedTraceSourceLabel(
        `${itemText(sourceItem).name} · ${ui(derivedItemSource.labelKey)}`,
        TRACE_SOURCE_LABEL_AUTHORITY.CATALOG_LOCALIZED,
      );
    }
  }
  const sourceItemId = sourceId;
  const item = findItemById(sourceItemId);
  if (item) {
    return presentResolvedTraceSourceLabel(
      itemText(item).name,
      TRACE_SOURCE_LABEL_AUTHORITY.CATALOG_LOCALIZED,
    );
  }
  const runtimeSkill = getRuntimeSkillRecord(sourceId);
  if (runtimeSkill) {
    return presentResolvedTraceSourceLabel(
      skillRuntimeDisplay(runtimeSkill).name,
      TRACE_SOURCE_LABEL_AUTHORITY.RUNTIME_LOCALIZED,
    );
  }
  const sourceKey = TRACE_SOURCE_KEYS[sourceId];
  return presentResolvedTraceSourceLabel(
    sourceKey ? ui(sourceKey) : effect.sourceLabel,
    sourceKey
      ? TRACE_SOURCE_LABEL_AUTHORITY.APP_I18N
      : TRACE_SOURCE_LABEL_AUTHORITY.UNVERIFIED,
  );
}

function formatTraceStepValue(step, fallbackSuffix) {
  if (TRACE_MULTIPLIER_LABELS.has(step.labelKey)) {
    return formatStat(step.after, "multiplier");
  }
  if (step.id?.startsWith("damage-bonus:scaled")) return formatStat(step.after);
  if (["traceCritChance", "traceCritDamage", "traceDamageBonus", "traceAttackSpeedBonus"].includes(step.labelKey)) {
    return formatStat(step.after, "%");
  }
  if (step.labelKey === "traceAttackSpeed") return formatStat(step.after, "decimal2");
  if (step.labelKey === "traceMovementSpeed") return formatStat(step.after, "mps");
  return formatStat(step.after, fallbackSuffix);
}

function getPublicTraceExpression(step) {
  if (step.id === "damage-bonus:formula") return "";
  return step.expression || "";
}

function isPublicTraceStep(step, statKey) {
  if (step.kind === "effect" || step.labelKey === "traceRawValue") return false;
  if (step.id?.startsWith("damage-bonus:scaled")) return false;
  if (statKey === "damageBonus") {
    return step.id === "damage-bonus:formula" || step.id === "damage-bonus:clamp";
  }
  return true;
}

function getEffectSuffix(effect, fallbackSuffix) {
  const targetStatKey = effect.targetKey.replace(/^flat:/, "");
  return STAT_ROWS.find((row) => row[1] === targetStatKey)?.[2] ?? fallbackSuffix;
}

function formatTracePercent(value) {
  return `${String(Number(value))}%`;
}

function formatEffectValue(effect, fallbackSuffix) {
  if (effect.unit === "authority-link") {
    if (Number.isFinite(effect.requestedValue)) {
      const suffix = effect.sourceRollAlias === "percent" ? "%" : "";
      const sign = effect.requestedValue > 0 ? "+" : "";
      return `${sign}${formatNumber(effect.requestedValue)}${suffix} · ${ui("adapted")}`;
    }
    return effect.applied === false ? ui("traceUnsupported") : ui("adapted");
  }
  if (effect.value === null) return ui("traceUnsupported");
  if (effect.operation === "more") {
    const sign = effect.value >= 0 ? "+" : "-";
    return `${sign}${formatTracePercent(Math.abs(effect.value))}`;
  }
  const suffix = getEffectSuffix(effect, fallbackSuffix);
  if (effect.operation === "set") return `= ${formatStat(effect.value, suffix)}`;
  return `${effect.value >= 0 ? "+" : "-"}${formatStat(Math.abs(effect.value), suffix)}`;
}

function renderTraceEffect(effect, inactive = false, suffix = "") {
  const reasonKey = getTraceReasonKey(effect);
  const exactSourceText = typeof effect.sourceText === "string"
    && effect.sourceText.trim()
      ? `<small class="trace-source-text">${escapeHtml(presentCalculationSourceText(effect.sourceText, state.locale))}</small>`
      : "";
  return `
    <div class="trace-effect ${inactive ? "is-inactive" : ""}">
      <span class="trace-source-icon" aria-hidden="true">
        ${effect.sourceIconUrl ? `<img src="${escapeHtml(effect.sourceIconUrl)}" alt="" />` : ""}
      </span>
      <span class="trace-source-name">${escapeHtml(getTraceSourceLabel(effect))}</span>
      ${exactSourceText}
      <strong>${formatEffectValue(effect, suffix)}</strong>
      <small class="trace-evidence is-${escapeHtml(effect.evidence)}">${ui(TRACE_EVIDENCE_KEYS[effect.evidence] || "traceUnsupported")}</small>
      ${inactive ? `<small class="trace-reason">${ui(reasonKey)}</small>` : ""}
    </div>
  `;
}

function buildEffectExpression(trace, effects, fallbackSuffix) {
  const parts = [formatStat(trace.baseValue, fallbackSuffix)];
  for (const effect of effects) {
    if (effect.operation === "more") {
      const operator = effect.value >= 0 ? "+" : "-";
      parts.push(`× (1 ${operator} ${formatTracePercent(Math.abs(effect.value))})`);
    }
    else if (effect.operation === "set") parts.push(`→ ${formatStat(effect.value, getEffectSuffix(effect, fallbackSuffix))}`);
    else parts.push(`${effect.value >= 0 ? "+" : "-"} ${formatStat(Math.abs(effect.value), getEffectSuffix(effect, fallbackSuffix))}`);
  }
  return parts.join(" ");
}

function getTraceValueDescriptor(key, fallbackSuffix = "") {
  const valueKey = String(key ?? "");
  const flatKey = valueKey.replace(/^flat:/, "");
  if (valueKey === "flat:critDamage") return { label: ui("attackCritDamage"), suffix: "%" };
  if (valueKey.startsWith("flat:") || calcHasKnownStatKey(flatKey)) return getStatDescriptor(flatKey);
  const tlidbModifierMatch = valueKey.match(/^tlidb:(increase|more):(.+)$/);
  if (tlidbModifierMatch) {
    const [, operation, statKey] = tlidbModifierMatch;
    const statLabel = getStatDescriptor(statKey).label;
    if (operation === "increase") {
      return {
        label: calculationCopy(`${statLabel} 증가`, `Increased ${statLabel}`),
        suffix: "%",
      };
    }
    return {
      label: calculationCopy(`${statLabel} 추가 증가 배율`, `More ${statLabel} multiplier`),
      suffix: "multiplier",
    };
  }
  const labels = {
    minimum: calculationCopy("최솟값", "Minimum"),
    maximum: calculationCopy("최댓값", "Maximum"),
    digits: calculationCopy("소수 자릿수", "Decimal digits"),
    linkedSkillDps: ui("linkedSkillDpsTotal"),
    skillLevelTotal: ui("skillLevel"),
    skillLevelMultiplier: ui("traceSkillLevelMultiplier"),
    attackSpeedMultiplier: ui("traceAttackSpeedMultiplier"),
    critMultiplier: ui("traceCritMultiplier"),
    moreDpsMultiplier: ui("damageBonus"),
    damageBonusScaled: ui("damageBonus"),
    crit: ui("critRate"),
    attackCritDamage: ui("attackCritDamage"),
    "context:selectedCount": calculationCopy("선택 항목 수", "Selected items"),
    "context:missingLife": ui("conditionMissingLife"),
    "context:missingShield": ui("conditionMissingShield"),
    "context:activeHero": calculationCopy(`${ui("hero")} 선택 상태`, "Hero selection state"),
    "context:shieldChargeActive": calculationCopy(`${getSs13CalculationTerm("shieldCharge")} 상태`, "Shield Charge state"),
    doubleDamageExpectedMultiplier: calculationCopy(`${getSs13CalculationTerm("doubleDamage")} 기대 배율`, "Double Damage expected multiplier"),
    totalPool: ui("traceTotalPool"),
  };
  if (labels[valueKey]) {
    const multiplier = valueKey.endsWith("Multiplier");
    return { label: labels[valueKey], suffix: multiplier ? "multiplier" : fallbackSuffix };
  }
  if (valueKey.startsWith("constant:")) {
    const constantKey = valueKey.slice("constant:".length);
    const constantLabels = {
      attackSpeed: ui("attackSpeed"),
      critChance: ui("critRate"),
      critDamage: ui("attackCritDamage"),
    };
    return { label: constantLabels[constantKey] || humanizeCalculationKey(constantKey), suffix: fallbackSuffix };
  }
  const skillRowMatch = valueKey.match(/^skillRowDps:(\d+)$/);
  if (skillRowMatch) return { label: `${ui("linkedSkillDpsTotal")} #${Number(skillRowMatch[1]) + 1}`, suffix: "" };
  const supportRowMatch = valueKey.match(/^skillRowSupportMultiplier:(\d+)$/);
  if (supportRowMatch) return { label: `${ui("dpsRowSupports")} #${Number(supportRowMatch[1]) + 1}`, suffix: "multiplier" };
  const skillModifierMatch = valueKey.match(/^skillRowTlidb(Increase|More):(\d+)$/u);
  if (skillModifierMatch) {
    const label = `${ui("linkedSkillDpsTotal")} #${Number(skillModifierMatch[2]) + 1}`;
    return skillModifierMatch[1] === "Increase"
      ? { label: calculationCopy(`${label} 증가`, `Increased ${label}`), suffix: "%" }
      : { label: calculationCopy(`${label} 추가 증가 배율`, `More ${label} multiplier`), suffix: "multiplier" };
  }
  return {
    label: humanizeCalculationKey(valueKey) || calculationCopy("계산값", "Calculation value"),
    suffix: fallbackSuffix,
  };
}

function formatDetailedTraceValue(value, suffix = "") {
  if (suffix) return formatStat(value, suffix);
  return new Intl.NumberFormat(state.locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 6,
  }).format(Number(value));
}

function renderCompleteTraceStep(step, index, effectById, fallbackSuffix) {
  const effect = step.effectId ? effectById.get(step.effectId) : null;
  const label = effect
    ? getTraceSourceLabel(effect)
    : step.labelKey
      ? ui(step.labelKey)
      : ui("traceFormula");
  const values = [];
  if (typeof step.before === "number") {
    values.push([calculationCopy("이전 값", "Before"), step.before, fallbackSuffix]);
  }
  if (typeof step.operand === "number") {
    values.push([calculationCopy("연산값", "Operand"), step.operand, effect ? getEffectSuffix(effect, fallbackSuffix) : fallbackSuffix]);
  }
  for (const [key, value] of Object.entries(step.inputValues ?? {})) {
    if (typeof value !== "number") continue;
    const descriptor = getTraceValueDescriptor(key, "");
    values.push([descriptor.label, value, descriptor.suffix]);
  }
  if (typeof step.after === "number") {
    values.push([calculationCopy("결과", "Result"), step.after, fallbackSuffix]);
  }
  const kindLabels = {
    effect: calculationCopy("효과 적용", "Effect"),
    formula: calculationCopy("계산식", "Formula"),
    clamp: calculationCopy("범위 제한", "Range limit"),
    round: calculationCopy("표시 반올림", "Display rounding"),
  };
  return `
    <li class="trace-complete-step">
      <div class="trace-complete-step-heading">
        <span>${index + 1}. ${escapeHtml(label)}</span>
        <small>${kindLabels[step.kind] || ui("traceFormula")}</small>
      </div>
      ${step.expression ? `<code>${escapeHtml(presentCalculationExpression(step.expression, state.locale))}</code>` : ""}
      <dl>
        ${values.map(([valueLabel, value, suffix]) => `<div><dt>${escapeHtml(valueLabel)}</dt><dd>${formatDetailedTraceValue(value, suffix)}</dd></div>`).join("")}
      </dl>
    </li>
  `;
}

function renderCompleteTraceSteps(trace, effectById, suffix) {
  return `
    <details class="trace-complete-steps">
      <summary><span>${calculationCopy("전체 계산 단계", "All calculation steps")}</span><strong>${formatNumber(trace.steps.length)}</strong></summary>
      <ol>${trace.steps.map((step, index) => renderCompleteTraceStep(step, index, effectById, suffix)).join("")}</ol>
    </details>
  `;
}

function renderInlineTraceSection(section, title, content, emptyCopy, className = "") {
  return `
    <section class="trace-section ${className}" data-trace-section="${section}">
      <div class="trace-subheading">${title}</div>
      ${content || `<p class="trace-empty">${emptyCopy}</p>`}
    </section>
  `;
}

function getPublicStatUnsupportedState(calc, statKey) {
  const trace = calc?.traces?.[statKey];
  if (UNSUPPORTED_DEFENSIVE_STAT_KEY_SET.has(statKey) && trace?.baseEvidence === "unsupported") {
    return {
      sourceId: trace.baseSourceId,
      reasonKey: "traceReasonDefensiveCalculationUnavailable",
    };
  }

  const blockedRegain = calc?.divinityEffectProjection?.blockers?.find((blocker) => {
    const unsupportedRegain = blocker.reason === "divinity-regain-source-not-authorized"
      || blocker.reason === "divinity-regain-interval-source-not-authorized"
      || blocker.reason === "current-ss13-divinity-calculation-authority-unavailable"
      || (blocker.affectedStats?.length ?? 0) > 0;
    return unsupportedRegain
      && [blocker.stat, ...(blocker.affectedStats ?? [])].some((blockedStat) => (
        DIVINITY_REGAIN_PUBLIC_STAT_KEYS.get(blockedStat)?.has(statKey)
      ));
  });
  if (blockedRegain) {
    return {
      sourceId: blockedRegain.sourceItemId ?? trace?.baseSourceId,
      reasonKey: "traceReasonDivinityRegainSourceUnavailable",
    };
  }

  const statDependencies = PUBLIC_STAT_DEPENDENCY_KEYS[statKey] ?? [statKey];
  const globalUnknownSourceIds = new Set([
    "input:hero-trait-config",
    "input:hero-memory-config",
    "input:skill-elixir-config",
    "input:skill-support-config",
  ]);
  const sourceTargetStats = {
    "input:skill-support-slot-energy": ["energy"],
    "input:skill-seal-config": ["life", "mana"],
  };
  const unsupportedConfiguration = calc?.provenance?.sources?.find((source) => {
    if (source.applied !== false || source.inactiveReason !== "value-authority-unverified") return false;
    if (globalUnknownSourceIds.has(source.id)) return true;
    if (source.id.startsWith("reference:91tob:") && ["talents", "pact"].includes(source.categoryId)) {
      return true;
    }
    const receiptTargetStats = source.id === "input:skill-seal-config"
      && Array.isArray(source.receipt?.affectedStats)
      ? source.receipt.affectedStats
      : null;
    return (receiptTargetStats ?? sourceTargetStats[source.id] ?? []).some((targetStat) => (
      statDependencies.includes(targetStat)
    ));
  });
  if (unsupportedConfiguration) {
    return {
      sourceId: unsupportedConfiguration.id,
      reasonKey: "traceReasonValueAuthorityUnverified",
    };
  }

  const unsupportedTargetKeys = new Set(statDependencies.flatMap((targetStat) => [
    targetStat,
    `flat:${targetStat}`,
  ]));
  const unsupportedTargetEffect = (calc?.effects ?? []).find((effect) => (
    effect.applied === false
    && unsupportedTargetKeys.has(effect.targetKey)
    && ["unsupported", "unverified"].includes(effect.evidence)
  ));
  if (unsupportedTargetEffect) {
    return {
      sourceId: unsupportedTargetEffect.sourceId,
      reasonKey: getTraceReasonKey(unsupportedTargetEffect),
    };
  }

  if (["dps", "calculationPanelDamage"].includes(statKey)) {
    const rowEffects = (calc?.effects ?? []).filter(({ targetKey }) => /^skillRowDps:\d+$/.test(targetKey));
    const unsupported = rowEffects.find(({ applied }) => applied === false);
    if (unsupported) {
      return {
        sourceId: unsupported.sourceId,
        reasonKey: getTraceReasonKey(unsupported),
      };
    }
  }

  const unmodeledGearBasePatterns = {
    armor: [/\bGear Armor\b/i, /该装备护甲值/u, /해당 장비 아머 수치/u],
    evasion: [/\bgear Evasion\b/i, /该装备闪避值/u, /해당 장비 회피 수치/u],
    shield: [/\bGear Energy Shield\b/i, /该装备护盾值/u, /해당 장비 보호막 수치/u],
  };
  const damageOutputRuntimePatterns = [
    /\b(?:[A-Za-z][A-Za-z'-]*\s+){0,3}Skill Level\b/i,
    /\bMain Skill(?:'s)?\s+(?:is\s+)?supported\b/i,
    /\bPenetration(?:\(s\))?\b/i,
    /\bCooldown(?: Recovery Speed|:)\b/i,
    /\b(?:Spell Burst|Demolisher|Terra) Charge\b/i,
    /\bReaping\b/i,
    /\bFocus Speed\b/i,
    /\b(?:Ignite|Wilt|Trauma|Frostbite|Electrocute|Numb(?:ed)?)\b/i,
    /\bAilment Damage(?: Enhancement)?\b/i,
    /\bDamaging Ailments\b/i,
    /\bMultistrikes?\b/i,
    /\bMax Spell Burst\b/i,
    /\bSentry Quantity\b/i,
    /\bProjectile Quantity\b/i,
    /\bReplaces? the Main Skill\b/i,
    /\bTriggers?(?: the)? Main Skill\b/i,
  ];
  const energyShieldSustainPatterns = [
    /\bEnergy Shield Charge\b/i,
    /\bEnergy Shield Regain\b/i,
  ];
  const unmodeledGearRelatedResultPatterns = {
    shieldRegenPerSecond: energyShieldSustainPatterns,
    ...Object.fromEntries([
      "physicalEhp",
      "fireEhp",
      "coldEhp",
      "lightningEhp",
      "erosionEhp",
    ].map((key) => [key, energyShieldSustainPatterns])),
  };
  const unmodeledGearStatPatterns = {
    armor: [/\b(?:Gear )?Armor\b/i, /\bDefense\b/i],
    armorBonus: [/\b(?:Gear )?Armor\b/i, /\bDefense\b/i],
    evasion: [/\b(?:Gear )?Evasion\b/i, /\bDefense\b/i],
    shield: [/\b(?:Max(?:imum)? )?Energy Shield\b/i, /\bDefense\b/i],
    strength: [/\bStrength\b/i, /\bAll Stats\b/i],
    dexterity: [/\bDexterity\b/i, /\bAll Stats\b/i],
    intelligence: [/\bIntelligence\b/i, /\bAll Stats\b/i],
    life: [/\bMax(?:imum)? Life\b/i],
    mana: [/\bMax(?:imum)? Mana\b/i],
    manaSealCompensation: [/\b(?:Mana Seal|Sealed Mana)\b/i],
    auraEffect: [/\bAura Effect\b/i],
    fireResist: [/\b(?:Elemental|All)\b[^\n]*\bResistance\b/i, /\bFire\b[^\n]*\bResistance\b/i],
    coldResist: [/\b(?:Elemental|All)\b[^\n]*\bResistance\b/i, /\bCold\b[^\n]*\bResistance\b/i],
    lightningResist: [/\b(?:Elemental|All)\b[^\n]*\bResistance\b/i, /\bLightning\b[^\n]*\bResistance\b/i],
    erosionResist: [/\b(?:All|Erosion)\b[^\n]*\bResistance\b/i],
    damageBonus: [/\bDamage\b/i],
    mainHandAttackSpeed: [/\bAttack\b[^\n]*\bSpeed\b/i],
    offHandAttackSpeed: [/\bAttack\b[^\n]*\bSpeed\b/i],
    attackSpeedBonus: [/\bAttack\b[^\n]*\bSpeed\b/i],
    attackSpeedMore: [/\bAttack\b[^\n]*\bSpeed\b/i],
    speed: [/\bAttack\b[^\n]*\bSpeed\b/i],
    crit: [/\bCritical Strike (?:Chance|Rating)\b/i],
    mainHandAttackCrit: [/\bCritical Strike (?:Chance|Rating)\b/i],
    attackCritDamage: [/\bCritical Strike Damage\b/i],
    skillAreaBonus: [/\b(?:Skill )?Area\b/i],
    projectileCount: [/\bProjectile Quantity\b/i],
    blockChance: [/\bBlock (?:Chance|Ratio)\b/i, /\b(?:Attack|Spell) Block\b/i],
    damageReduction: [
      /\bDamage Reduction\b/i,
      /\bInjury Buffer\b/i,
      /\bDamage Taken\b/i,
      /\bchance to avoid damage\b/i,
      /\bCritical Strike Damage Mitigation\b/i,
    ],
    lifeRegenPerSecond: [
      /\bLife Regeneration\b/i,
      /\bRegenerates?\b[^\n]*\bLife\b/i,
      /\bRestores?\b[^\n]*\bLife\b/i,
    ],
    lifeRegainPercent: [/\bLife Regain\b/i, /\bLife Return\b/i],
    lifeRegainPerHit: [/\bLife Regain\b/i, /\bLife Return\b/i],
    shieldRegenPerSecond: [
      /\bEnergy Shield Regeneration\b/i,
      /\bRegenerates?\b[^\n]*\bEnergy Shield\b/i,
      /\bRestores?\b[^\n]*\bEnergy Shield\b/i,
    ],
    shieldRegainPercent: [/\b(?:Energy )?Shield Regain\b/i, /\bShield Return\b/i],
    shieldRegainPerHit: [/\b(?:Energy )?Shield Regain\b/i, /\bShield Return\b/i],
    manaRegenPerSecond: [
      /\bMana Regeneration\b/i,
      /\bRegenerates?\b[^\n]*\bMana\b/i,
      /\bRestores?\b[^\n]*\bMana\b/i,
    ],
    movementSpeedBonus: [/\bMovement Speed\b/i],
    movementSpeedMeters: [/\bMovement Speed\b/i],
    dps: [
      /\bDamage\b/i,
      /\b(?:Attack|Cast) Speed\b/i,
      /\bCritical Strike\b/i,
      ...damageOutputRuntimePatterns,
    ],
    calculationPanelDamage: [
      /\bDamage\b/i,
      /\b(?:Attack|Cast) Speed\b/i,
      /\bCritical Strike\b/i,
      ...damageOutputRuntimePatterns,
    ],
  };
  const patternKeys = PUBLIC_STAT_DEPENDENCY_KEYS[statKey] ?? [statKey];
  const gearPatterns = patternKeys.flatMap((key) => [
    ...(unmodeledGearBasePatterns[key] ?? []),
    ...(unmodeledGearStatPatterns[key] ?? []),
  ]).concat(unmodeledGearRelatedResultPatterns[statKey] ?? []);
  const checksResistance = patternKeys.some((key) => key.endsWith("Resist"));
  const checksDamageReduction = patternKeys.includes("damageReduction");
  const checksDamageOutput = ["dps", "calculationPanelDamage"].includes(statKey);
  if (gearPatterns.length) {
    const unsupportedGear = (calc?.selectedItems ?? []).find((item) => {
      if (item.categoryId !== "gear") return false;
      const firebirdResolvedTargetByStat = {
        dexterity: "dexterity",
        life: "maxLifePercent",
        shield: "maxShieldPercent",
        fireResist: "fireResistancePercent",
        coldResist: "coldResistancePercent",
        lightningResist: "lightningResistancePercent",
        movementSpeedBonus: "movementSpeedPercent",
        movementSpeedMeters: "movementSpeedPercent",
        armorBonus: "armorAdditionalPercent",
      };
      const firebirdResolvedTarget = firebirdResolvedTargetByStat[statKey];
      if (
        firebirdResolvedTarget
        && calc?.firebirdProjection?.active
        && item.id === calc.firebirdProjection.itemId
        && calc.firebirdProjection.entries?.some(({ semanticTargetKey, effectId }) => (
          semanticTargetKey === firebirdResolvedTarget
          && calc.effects?.some(({ id, applied }) => id === effectId && applied !== false)
        ))
      ) return false;
      const sourceText = [
        item.tlidbText?.en?.summary,
        item.tlidbText?.en?.detail,
        item.tlidbText?.ko?.summary,
        item.summary,
        item.detail,
      ].filter(Boolean).join("\n");
      const modifierLines = sourceText.split(/\r?\n/).filter((line) => /\d/.test(line));
      const lineMentionsStat = (line) => {
        if (!gearPatterns.some((pattern) => pattern.test(line))) return false;
        if (checksResistance && /\b(?:Enemies?|Targets?|Penetration)\b/i.test(line)) return false;
        const enemyDamageTaken = (
          /\bDamage Taken\b[^\n]*\b(?:by|for)\b[^\n]*\b(?:Enemies?|Targets?)\b/i.test(line)
          || /\bDamage Taken\b[^\n]*\bthe (?:Enemy|Target)\b/i.test(line)
          || /\b(?:Affliction|Intimidated)\b[^\n]*\bDamage Taken\b/i.test(line)
        );
        if (checksDamageReduction && enemyDamageTaken) return false;
        const minionOnlyRecovery = (
          /\bMinions?\b/i.test(line)
          && /\b(?:Regeneration|Regain|Restores?)\b/i.test(line)
          && !/\b(?:applied to you|your)\b/i.test(line)
        );
        if (minionOnlyRecovery) return false;
        if (statKey === "damageBonus" && /\b(?:Damage Taken|Damage Reduction|Damage Mitigation|Injury Buffer)\b/i.test(line)) {
          return false;
        }
        if (checksDamageOutput && (
          (/\bDamage Taken\b/i.test(line) && !enemyDamageTaken)
          || /\b(?:Damage Reduction|Damage Mitigation|Injury Buffer|chance to avoid damage)\b/i.test(line)
          || /\bchance to avoid\b[^\n]*\bAilments?\b/i.test(line)
          || /\bImmune to\b[^\n]*\b(?:Ignite|Wilt|Trauma|Frostbite|Electrocute|Numb(?:ed)?|Ailments?)\b/i.test(line)
          || /\b(?:You suffer|You receive|on yourself)\b[^\n]*\b(?:Ignite|Wilt|Trauma|Ailment)\b/i.test(line)
          || /\b(?:Ignite|Wilt|Trauma|Ailment)\b[^\n]*\bon yourself\b/i.test(line)
        )) return false;
        return true;
      };
      const relevantModifierLines = modifierLines.filter(lineMentionsStat);
      if (!relevantModifierLines.length) return false;
      const resolvedTargetKeys = new Set(statDependencies.flatMap((targetStat) => [
        targetStat,
        `flat:${targetStat}`,
        `tlidb:increase:${targetStat}`,
        `tlidb:more:${targetStat}`,
      ]));
      const resolvedSourceTexts = new Set((calc.effects ?? [])
        .filter((effect) => (
          effect.sourceId === item.id
          && effect.applied !== false
          && resolvedTargetKeys.has(effect.targetKey)
          && typeof effect.sourceText === "string"
        ))
        .map((effect) => effect.sourceText.trim()));
      if (relevantModifierLines.every((line) => resolvedSourceTexts.has(line.trim()))) return false;
      const coverageIncomplete = calc.provenance?.sources?.some((source) => (
        source.id === `${item.id}:calculation-coverage`
        && source.applied === false
      ));
      return coverageIncomplete;
    });
    if (unsupportedGear) {
      return {
        sourceId: `${unsupportedGear.id}:calculation-coverage`,
        reasonKey: "traceReasonGearCoverageIncomplete",
      };
    }
  }

  if (["life", "mana"].includes(statKey)) {
    const heroCurve = calc?.provenance?.sources?.find(({ id, applied, inactiveReason }) => (
      id === "base:hero-lv90"
      && applied === false
      && inactiveReason === "hero-level-curve-unavailable"
    ));
    if (heroCurve) {
      return {
        sourceId: heroCurve.id,
        reasonKey: "traceReasonHeroLevelCurveUnavailable",
      };
    }
  }

  const firebirdTargetKey = statKey === "life"
    ? "maxLifeAbsolute"
    : statKey === "shield"
      ? "maxShieldAbsolute"
      : "";
  const firebirdUnsupported = firebirdTargetKey
    ? calc?.firebirdProjection?.unsupported?.find(
      ({ semanticTargetKey }) => semanticTargetKey === firebirdTargetKey,
    )
    : null;
  if (firebirdUnsupported) {
    return {
      sourceId: `${calc.firebirdProjection.itemId}:unsupported:${firebirdTargetKey}`,
      reasonKey: getTraceReasonKey({
        inactiveReason: firebirdUnsupported.reason,
        evidence: "unsupported",
      }),
    };
  }
  return null;
}

function renderCalculationTrace(calc, statKey, suffix) {
  const trace = calc.traces?.[statKey];
  if (!trace) return "";
  const unsupportedState = getPublicStatUnsupportedState(calc, statKey);
  if (unsupportedState) {
    const baseSource = getTraceSourceLabel({
      sourceId: unsupportedState.sourceId,
      sourceLabel: unsupportedState.sourceId,
    });
    return `
      <div class="stat-trace is-unsupported" id="trace-${escapeHtml(statKey)}" data-calculation-support="unsupported" aria-label="${ui("calculationTrace")}">
        <div class="trace-heading"><span>${ui("calculationTrace")}</span><strong>${ui("traceUnsupported")}</strong></div>
        <div class="trace-base" data-trace-section="base"><span>${ui("traceBase")}<small>${escapeHtml(baseSource)}</small></span><strong>${ui("traceUnsupported")}</strong><small>${ui("traceUnsupported")}</small></div>
        ${renderInlineTraceSection("applied", ui("traceAppliedEffects"), "", ui("traceNoAppliedEffects"), "is-applied")}
        ${renderInlineTraceSection("steps", ui("traceCalculationSteps"), "", ui("traceNoCalculationSteps"), "is-steps")}
        ${renderInlineTraceSection("inactive", ui("traceInactiveEffects"), `<p class="trace-reason">${ui(unsupportedState.reasonKey)}</p>`, ui("traceNoInactiveEffects"), "is-inactive")}
        <div class="trace-final" data-trace-section="final"><span><b>${ui("traceFinal")}</b></span><strong>= ${ui("traceUnsupported")}</strong></div>
      </div>
    `;
  }
  const effectById = new Map((calc.effects ?? []).map((effect) => [effect.id, effect]));
  const applied = trace.effectIds.map((id) => effectById.get(id)).filter(Boolean).sort((a, b) => a.order - b.order);
  const excluded = trace.excludedEffectIds.map((id) => effectById.get(id)).filter(Boolean).sort((a, b) => a.order - b.order);
  const formulaSteps = trace.steps.filter((step) => isPublicTraceStep(step, statKey));
  const expression =
    statKey === "damageBonus"
      ? ""
      : [...formulaSteps].reverse().map(getPublicTraceExpression).find(Boolean) ||
        buildEffectExpression(trace, applied, suffix);
  const baseSource = getTraceSourceLabel({ sourceId: trace.baseSourceId, sourceLabel: trace.baseSourceId });
  const appliedContent = applied.map((effect) => renderTraceEffect(effect, false, suffix)).join("");
  const formulaContent = formulaSteps.map((step) => {
    const stepExpression = getPublicTraceExpression(step);
    return `<div class="trace-formula"><span>${ui(step.labelKey)}${stepExpression ? `<small class="trace-formula-expression">${escapeHtml(presentCalculationExpression(stepExpression, state.locale))}</small>` : ""}</span><strong>${formatTraceStepValue(step, suffix)}</strong></div>`;
  }).join("");
  const stepContent = `${formulaContent}${trace.steps.length ? renderCompleteTraceSteps(trace, effectById, suffix) : ""}`;
  const inactiveContent = excluded.map((effect) => renderTraceEffect(effect, true, suffix)).join("");

  return `
    <div class="stat-trace" id="trace-${escapeHtml(statKey)}" data-calculation-support="supported" aria-label="${ui("calculationTrace")}">
      <div class="trace-heading"><span>${ui("calculationTrace")}</span><strong>${formatStat(trace.finalValue, suffix)}</strong></div>
      <div class="trace-base" data-trace-section="base"><span>${ui("traceBase")}<small>${escapeHtml(baseSource)}</small></span><strong>${formatStat(trace.baseValue, suffix)}</strong><small>${ui(TRACE_EVIDENCE_KEYS[trace.baseEvidence] || "traceUnsupported")}</small></div>
      ${renderInlineTraceSection("applied", ui("traceAppliedEffects"), appliedContent, ui("traceNoAppliedEffects"), "is-applied")}
      ${renderInlineTraceSection("steps", ui("traceCalculationSteps"), stepContent, ui("traceNoCalculationSteps"), "is-steps")}
      ${renderInlineTraceSection("inactive", ui("traceInactiveEffects"), inactiveContent, ui("traceNoInactiveEffects"), "is-inactive")}
      <div class="trace-raw-value"><span>${ui("traceRawValue")}</span><strong>${formatStat(trace.rawValue, suffix)}</strong></div>
      <div class="trace-final" data-trace-section="final"><span><b>${ui("traceFinal")}</b>${expression ? `<small>${escapeHtml(presentCalculationExpression(expression, state.locale))}</small>` : ""}</span><strong>= ${formatStat(trace.finalValue, suffix)}</strong></div>
    </div>
  `;
}

function renderStatRow(labelKey, statKey, value, suffix, calc, explicitLabel = "") {
  const trace = calc.traces?.[statKey];
  const expanded = Boolean(trace && state.expandedStatKey === statKey);
  const displayLabel = explicitLabel || ui(labelKey);
  const unsupportedState = getPublicStatUnsupportedState(calc, statKey);
  if (!trace) {
    return `<div class="stat-row"><span>${escapeHtml(displayLabel)}</span><strong>${formatStat(value, suffix)}</strong></div>`;
  }

  return `
    <div class="stat-entry ${expanded ? "is-expanded" : ""}">
      <button type="button" class="stat-row has-trace ${unsupportedState ? "is-unsupported" : ""}" data-action="stat-trace" data-stat-key="${escapeHtml(statKey)}" data-calculation-support="${unsupportedState ? "unsupported" : "supported"}" data-trace-contract="five-sections" aria-expanded="${expanded}" aria-controls="trace-${escapeHtml(statKey)}">
        <span>${escapeHtml(displayLabel)}</span>
        <strong>${unsupportedState ? ui("traceUnsupported") : formatStat(value, suffix)} <i class="stat-trace-chevron" aria-hidden="true">⌄</i></strong>
      </button>
      ${expanded ? renderCalculationTrace(calc, statKey, suffix) : ""}
    </div>
  `;
}

function renderGearUpgradePanel() {
  const slotIndex = state.pendingSlot?.categoryId === "gear" ? state.pendingSlot.index : -1;
  if (!SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES.includes(slotIndex)) return "";

  const result = state.gearUpgradeResult;
  const slotLabel = ui(slotKeyForGearIndex(slotIndex));
  const scopeCopy = ui("gearUpgradeScope", { slot: slotLabel });

  if (!result) {
    return `
      <section class="gear-upgrade-panel">
        <div>
          <h3>${ui("gearUpgradeTitle")}</h3>
          <p>${ui("gearUpgradeIntro")}</p>
          <small>${scopeCopy}</small>
        </div>
        <button data-action="find-gear-upgrades">${ui("gearUpgradeFind")}</button>
      </section>
    `;
  }

  const candidates = result.status === "ready" ? result.candidates : [];
  return `
    <section class="gear-upgrade-panel is-expanded">
      <div class="gear-upgrade-heading">
        <div>
          <h3>${ui("gearUpgradeTitle")}</h3>
          <small>${scopeCopy}</small>
        </div>
        <button data-action="find-gear-upgrades">${ui("gearUpgradeRefresh")}</button>
      </div>
      ${
        candidates.length
          ? `<div class="gear-upgrade-results">${candidates
              .map((candidate, index) => {
                const item = findItemById(candidate.itemId);
                const displayItem = item ? itemText(item) : { name: candidate.itemId };
                return `
                  <article>
                    <div>
                      <strong>${escapeHtml(displayItem.name)}</strong>
                      <span>${ui("dpsGain", { value: formatNumber(candidate.deltaDps) })}</span>
                      <small>${ui("gearUpgradeEvidence", {
                        unsupported: candidate.unsupportedSourceCount,
                        inactive: candidate.inactiveSourceCount,
                      })}</small>
                    </div>
                    <button data-action="apply-gear-upgrade" data-candidate-index="${index}">${ui("apply")}</button>
                  </article>
                `;
              })
              .join("")}</div><p class="gear-upgrade-footnote">${ui("gearUpgradeStoredConfig")}</p>`
          : `<p class="gear-upgrade-empty" data-role="gear-upgrade-unavailable">${ui(result.status === "calculation-coverage-incomplete" ? "gearUpgradeCalculationUnavailable" : "gearUpgradeNoImprovement")}</p>`
      }
    </section>
  `;
}

function renderGearEditor() {
  const category = getCategory("gear");
  const page = getVisibleItems("gear");
  const items = page.items;
  const visibleFilters = GEAR_FILTERS;
  const craftMode = state.overlay?.mode === "craft";
  const hasSlot = !craftMode && Number.isInteger(state.pendingSlot?.index) && state.pendingSlot?.categoryId === "gear";
  const gear = getSelectedItemsFor("gear");

  const heroArt = getIngameHeroArt(getSelectedItem("hero")?.id);

  return `
    <div class="editor-backdrop" data-action="close-overlay"></div>
    <section class="equipment-editor${craftMode ? " is-craft" : ""}" role="dialog" aria-modal="true" aria-label="${craftMode ? ui("craftNewItem") : ui("gearEditor")}">
      ${craftMode ? "" : `<div class="ingame-equipment-world" aria-hidden="true"></div><div class="ingame-equipment-paperdoll" aria-hidden="true">${heroArt ? `<img src="${escapeHtml(heroArt)}" alt="" />` : ""}</div>`}
      <div class="editor-title">
        <h2>${craftMode ? ui("craftNewItem") : ui("gearEditor")}</h2>
        <button data-action="close-overlay" aria-label="${ui("close")}">×</button>
      </div>
      ${hasSlot ? `<nav class="equipment-slots" aria-label="${calculationCopy("장비 부위", "Equipment slots")}">
        ${GEAR_SLOT_KEYS.map((slot, index) => `<button type="button" data-action="open-overlay" data-overlay="gear" data-category="gear" data-slot-index="${index}" data-slot="${slot}" aria-pressed="${state.pendingSlot.index === index}" title="${escapeHtml(gear[index] ? itemText(gear[index]).name : ui(slot))}">${gear[index] ? renderItemIcon(gear[index], "equipment-slot-icon") : `<span aria-hidden="true">+</span>`}<span>${ui(slot)}</span></button>`).join("")}
      </nav>` : ""}
      ${craftMode ? "" : `<details class="gear-upgrade-disclosure" ${state.gearUpgradeResult ? "open" : ""}><summary>${calculationCopy("교체 후보 비교", "Compare upgrades")}</summary>${renderGearUpgradePanel()}</details>`}
      <div class="equipment-layout ${hasSlot ? "is-slot-scoped" : ""}">
        ${hasSlot ? "" : `<nav class="equipment-cats" aria-label="${ui("gear")}">
          ${visibleFilters
            .map((filter) => {
              const active =
                filter === (state.gearFilter || "all") ||
                (filter === ALL_FILTER && (state.gearFilter || "all") === "all")
                  ? "is-active"
                  : "";
              const label = filter === ALL_FILTER ? ui("all") : translateCommon(state.locale, filter);
              return `<button class="${active}" data-action="gear-filter" data-filter="${filter}">${label}</button>`;
            })
            .join("")}
        </nav>`}
        <div class="equipment-list">
          ${hasSlot ? `<strong class="equipment-list-heading">${ui(GEAR_SLOT_KEYS[state.pendingSlot.index])} · ${calculationCopy("교체할 장비", "Replacement items")}</strong>` : ""}
          <div class="search-line">
            <input type="search" id="searchInput" value="${escapeHtml(state.query)}" placeholder="${ui("searchPlaceholder")}" aria-label="${ui("searchPlaceholder")}" autocomplete="off" />
            <span>⌕</span>
          </div>
          ${renderCatalogRows(page, category)}
        </div>
        ${renderItemDetail("gear", items)}
      </div>
    </section>
  `;
}

function renderHeroCatalogRows(page, category) {
  if (!page.items.length) return `<p class="empty editor-empty">${ui("noHeroData")}</p>`;
  const disabled = state.heroTraitRuntime.status === "ready" ? "" : "disabled";
  const groupedItems = new Map();
  page.items.forEach((item) => {
    const groupName = item.name || item.id;
    if (!groupedItems.has(groupName)) groupedItems.set(groupName, []);
    groupedItems.get(groupName).push(item);
  });

  return `
    ${[...groupedItems.entries()]
      .map(([groupName, items]) => {
        const displayGroupName = state.locale === "ko"
          ? TLIDB_HERO_GROUP_KO_LOCALE[groupName]?.displayName
            ?? TLIDB_HERO_GROUP_KO_LOCALE[groupName]?.name
            ?? "한국어 원문 미제공"
          : "Localized source unavailable";
        return `
        <section class="hero-branch-group">
          <h3>${escapeHtml(displayGroupName)}</h3>
          <div class="hero-branch-cards">
            ${items.map((item) => {
              const displayItem = itemText(item);
              const selected = isSelected(item.id);
              const support = state.heroTraitRuntime.supportByBranch?.[item.id];
              const supportStatus = support?.status ?? "unavailable";
              const supportLabel = ui(
                supportStatus === "partial"
                  ? "heroTraitSupportPartial"
                  : supportStatus === "structural-only"
                    ? "heroTraitSupportStructuralOnly"
                    : "heroTraitSupportUnavailable",
              );
              return `
                <article class="editor-item hero-branch-item ${selected ? "is-selected" : ""}">
                  <button class="item-summary" data-action="hero-select" data-item="${escapeHtml(item.id)}" ${disabled}>
                    ${renderItemIcon(item)}
                    <span class="hero-branch-copy">
                      <strong>${escapeHtml(displayItem.name)}</strong>
                      <small>${escapeHtml(displayItem.summary || displayItem.type || category?.id || "")}</small>
                      <span class="hero-branch-support is-${escapeHtml(supportStatus)}" data-role="hero-branch-support" data-support-status="${escapeHtml(supportStatus)}">${escapeHtml(supportLabel)}</span>
                    </span>
                  </button>
                  <button class="item-toggle" data-action="hero-select" data-item="${escapeHtml(item.id)}" aria-label="${escapeHtml(displayItem.name)}" ${disabled}>${selected ? "✓" : "+"}</button>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
      })
      .join("")}
    ${
      page.hasMore
        ? `
          <div class="catalog-results-footer">
            <span>${ui("catalogShowing", { visible: page.items.length, total: page.total })}</span>
            <button data-action="show-more">${ui("showMore")}</button>
          </div>
        `
        : ""
    }
  `;
}

function previewHeroLocaleText(preview, field) {
  return preview?.[field]?.[state.locale]
    ?? preview?.[field]?.ko
    ?? preview?.[field]?.en
    ?? "";
}

function renderSs13HeroPreview() {
  const previewHeroes = state.heroTraitRuntime.previewHeroes ?? [];
  if (!previewHeroes.length) return "";

  return `
    <section class="hero-season-preview" aria-label="${ui("ss13HeroPreview")}">
      <header>
        <div>
          <h3>${ui("ss13HeroPreview")}</h3>
          <p>${ui("ss13HeroPreviewNotApplied")}</p>
        </div>
        <span>SS13</span>
      </header>
      <div class="hero-season-preview-list">
        ${previewHeroes.map((preview) => `
          <article class="hero-season-preview-card" aria-disabled="true">
            ${preview.iconUrl ? `<img src="${escapeHtml(preview.iconUrl)}" alt="" loading="lazy" />` : ""}
            <div>
              <strong>${escapeHtml(previewHeroLocaleText(preview, "name"))}</strong>
              <small>${escapeHtml(previewHeroLocaleText(preview, "description"))}</small>
              <a href="${escapeHtml(preview.sourceUrl)}" target="_blank" rel="noreferrer">${ui("ss13HeroPreviewSource")}</a>
            </div>
            <b>${escapeHtml(previewHeroLocaleText(preview, "title"))}</b>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderHeroTraitOption(stage, group, option) {
  const selected = group.selectedChoiceId === option.id;
  const disabled = stage.locked || group.selectionMode === "fixed";
  const iconUrl = option.localIconPath || option.iconUrl;

  return `
    <button
      class="hero-trait-option ${selected ? "is-selected" : ""}"
      data-action="hero-trait-choice"
      data-stage="${escapeHtml(stage.id)}"
      data-group="${escapeHtml(group.id)}"
      data-choice="${escapeHtml(option.id)}"
      aria-pressed="${selected}"
      ${disabled ? "disabled" : ""}
    >
      ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" />` : ""}
      <span>
        <strong>${escapeHtml(runtimeLocaleField(option, "name", option.name || option.id))}</strong>
        <small>${escapeHtml(runtimeLocaleField(option, "description", option.description || ui("noDetailData")))}</small>
      </span>
    </button>
  `;
}

function renderHeroTraitWorkspace() {
  if (state.heroTraitRuntime.status === "idle" || state.heroTraitRuntime.status === "loading") {
    return `
      <section class="hero-trait-status" role="status">
        <span class="hero-trait-spinner" aria-hidden="true"></span>
        <strong>${ui("heroTraitLoading")}</strong>
      </section>
    `;
  }

  if (state.heroTraitRuntime.status === "error") {
    return `
      <section class="hero-trait-status is-error" role="alert">
        <strong>${ui("heroTraitLoadFailed")}</strong>
        <button data-action="hero-trait-retry">${ui("heroTraitRetry")}</button>
      </section>
    `;
  }

  const model = state.heroTraitRuntime.model;
  const selectedHeroId = state.build.selections.hero?.[0];
  if (isSs13PreviewHeroCatalogItem(findItemById(selectedHeroId))) {
    return `
      <section class="hero-trait-status is-season-preview">
        <strong>${ui("ss13HeroPreview")}</strong>
        <p>${ui("ss13HeroPreviewNotApplied")}</p>
        <button data-action="hero-choose">${ui("chooseHeroTrait")}</button>
      </section>
    `;
  }
  const branch = findHeroTraitBranch(model, selectedHeroId ?? state.build.hero?.branchId);
  if (!branch) {
    return `
      <section class="hero-trait-status">
        <strong>${ui("heroTraitChooseBranch")}</strong>
      </section>
    `;
  }

  const hero = normalizeHeroTraitState(model, {
    ...(state.build.hero ?? {}),
    branchId: selectedHeroId ?? branch.rawId,
    level: state.build.heroLevel ?? state.build.hero?.level ?? 90,
  });
  const stages = getHeroTraitStageView(model, hero);
  const activeStageLevel = stages.some((stage) => stage.requiredLevel === state.heroTraitEditorUi.activeStageLevel)
    ? state.heroTraitEditorUi.activeStageLevel : stages[0]?.requiredLevel;
  const flatHero = branch.flatHeroId ? findItemById(branch.flatHeroId) : null;
  const branchTitle = runtimeLocaleField(branch, "title", branch.title || branch.name);
  const branchHeroName = runtimeLocaleField(branch, "name", branch.name);
  const branchName = branchTitle || (flatHero ? itemText(flatHero).name : branchHeroName);

  return `
    <section class="hero-trait-workspace" aria-label="${ui("heroTraitSubtree")}">
      <header class="hero-trait-header">
        <div>
          ${flatHero ? renderItemIcon(flatHero, "hero-trait-portrait") : ""}
          <span>
            <small>${escapeHtml(branchHeroName)}</small>
            <strong>${escapeHtml(branchName)}</strong>
          </span>
        </div>
        <div class="hero-trait-header-actions">
          <div class="hero-level-stepper">
            <button data-action="hero-level" data-delta="-1" aria-label="${ui("heroLevelDecrease")}">−</button>
            <span>${ui("levelValue", { value: hero.level })}</span>
            <button data-action="hero-level" data-delta="1" aria-label="${ui("heroLevelIncrease")}">+</button>
          </div>
          <button class="hero-trait-remove" data-action="hero-remove">${ui("heroTraitRemove")}</button>
        </div>
      </header>
      <p class="calculation-limit-notice" data-role="hero-calculation-unsupported" role="note">${calculationCopy("TLIDB SS13 원문에서 대상·연산·수치가 확인된 특성·추억 효과만 계산합니다 · 나머지는 원인별 미지원", "Only trait and memory effects with verified TLIDB SS13 targets, operations, and values are calculated · the rest remain unsupported by reason")}</p>
      <nav class="hero-stage-tabs" aria-label="${calculationCopy("특성 레벨 선택", "Trait level")}">
        ${stages.map((stage) => `<button data-action="hero-stage-activate" data-stage-level="${stage.requiredLevel}" aria-pressed="${stage.requiredLevel === activeStageLevel}">${ui("levelValue", { value: stage.requiredLevel })}${stage.locked ? ` · ${ui("heroTraitLocked")}` : ""}</button>`).join("")}
      </nav>
      <div class="hero-trait-stages">
        ${stages
          .map(
            (stage) => `
              <article class="hero-trait-stage ${stage.locked ? "is-locked" : ""}" aria-disabled="${stage.locked}" data-hero-stage-panel="${stage.requiredLevel}" ${stage.requiredLevel === activeStageLevel ? "" : "hidden"}>
                <header>
                  <strong>${ui("levelValue", { value: stage.requiredLevel })}</strong>
                  ${stage.locked ? `<span>🔒 ${ui("heroTraitLocked")}</span>` : ""}
                </header>
                <div class="hero-trait-groups">
                  ${stage.selectionGroups
                    .map(
                      (group, groupIndex) => `
                        <section class="hero-trait-group" role="group" aria-label="${escapeHtml(ui("heroTraitGroup", { index: groupIndex + 1 }))}">
                          <p>${group.selectionMode === "fixed" ? ui("heroTraitFixed") : ui("heroTraitChoice")}</p>
                          <div class="hero-trait-options">
                            ${group.options.map((option) => renderHeroTraitOption(stage, group, option)).join("")}
                          </div>
                        </section>
                      `,
                    )
                    .join("")}
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHeroModal() {
  const category = getCategory("hero");
  const page = getVisibleItems("hero");
  const editing = state.overlay?.mode === "edit";
  const chooserReady = state.heroTraitRuntime.status === "ready";

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal hero-modal ${editing ? "is-editing" : "is-choosing"}" role="dialog" aria-modal="true" aria-label="${editing ? ui("heroTraitSubtree") : ui("chooseHeroTrait")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <div class="hero-modal-heading">
        <h2>${editing ? ui("heroTraitSubtree") : ui("chooseHeroTrait")}</h2>
        ${editing ? `<button class="hero-change-button" data-action="hero-choose">${ui("chooseHeroTrait")}</button>` : ""}
      </div>
      ${
        editing
          ? renderHeroTraitWorkspace()
          : chooserReady
            ? `
              <p class="hero-choose-intro">${ui("heroTraitChooseBranch")}</p>
              <p class="hero-support-legend" role="note">${ui("heroTraitSupportLegend")}</p>
              <div class="hero-selector-layout">
                <div class="hero-branch-column">
                  <div class="search-line">
                    <input type="search" id="searchInput" value="${escapeHtml(state.query)}" placeholder="${ui("searchPlaceholder")}" aria-label="${ui("searchPlaceholder")}" autocomplete="off" />
                    <span>⌕</span>
                  </div>
                  <div class="selector-list">
                    ${renderHeroCatalogRows(page, category)}
                    ${renderSs13HeroPreview()}
                  </div>
                </div>
              </div>
            `
            : renderHeroTraitWorkspace()
      }
    </section>
  `;
}

function heroMemoryRevivalAffixes(dataset) {
  const sections = dataset?.revivalCatalog?.sections ?? {};
  return [
    ...(sections.revivalAffixGroups ?? []),
    ...(sections.moonPhaseAffixGroups ?? []),
  ];
}

function findHeroMemoryAffix(memoryType, dataset, affixId) {
  return [
    ...(memoryType?.fixedAffixGroups ?? []),
    ...(memoryType?.randomAffixGroups ?? []),
    ...heroMemoryRevivalAffixes(dataset),
  ].find((affix) => affix.id === affixId);
}

function renderHeroMemoryAffixSelects(kind, memoryType, memory, limit, dataset) {
  const field = kind === "fixed" ? "fixedAffixIds" : "randomAffixIds";
  const affixes = kind === "fixed" ? memoryType.fixedAffixGroups : memoryType.randomAffixGroups;
  const selectedIds = new Set(memory[field]);
  const placeholder = ui(kind === "fixed" ? "heroMemoryChooseFixed" : "heroMemoryChooseRandom");

  return Array.from({ length: limit }, (_, slotIndex) => {
    const selectedId = memory[field][slotIndex] ?? "";
    return `
      <label class="hero-memory-select-field">
        <span>${ui(kind === "fixed" ? "heroMemoryFixedSlot" : "heroMemoryRandomSlot", { index: slotIndex + 1 })}</span>
        <select class="hero-memory-affix-select" data-kind="${kind}" data-slot-index="${slotIndex}">
          <option value="">${placeholder}</option>
          ${affixes.map((affix) => {
            const disabled = selectedIds.has(affix.id) && selectedId !== affix.id;
            let label = runtimeLocaleText(affix, affix.previewText || affix.id);
            if (kind === "random"
              && Number.isFinite(Number(memory.valueModifierPercent))
              && !disabled) {
              label = applyHeroMemoryValueModifier(label, memory.valueModifierPercent);
            }
            return `<option value="${escapeHtml(affix.id)}" ${selectedId === affix.id ? "selected" : ""} ${disabled ? "disabled" : ""}>${escapeHtml(label)}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }).join("");
}

function renderHeroMemoryAffixConfig(affixId, kind, memoryType, memory, dataset) {
  const affix = findHeroMemoryAffix(memoryType, dataset, affixId);
  const config = memory.affixRolls?.[affixId];
  const tier = affix?.tierOptions?.find((candidate) => candidate.tierId === config?.tierId)
    ?? affix?.tierOptions?.[0];
  if (!affix || !tier) return "";
  const modifiedPreview = kind === "random" && Number.isFinite(Number(memory.valueModifierPercent))
    ? getHeroMemoryPreview(memory, dataset).affixes.find((candidate) => candidate.id === affixId)?.text
    : "";
  const renderedTierText = modifiedPreview
    || renderLocalizedRuntimeText(tier, config?.rolls, tier.text);

  return `
    <article class="hero-memory-affix-config" data-affix-id="${escapeHtml(affixId)}">
      <header>
        <span>${ui(`heroMemory${kind.at(0).toUpperCase()}${kind.slice(1)}`)}</span>
        <strong>${escapeHtml(runtimeLocaleText(affix, affix.previewText || affix.id))}</strong>
      </header>
      <label>
        <span>${ui("heroMemoryTier")}</span>
        <select class="hero-memory-affix-tier" data-affix="${escapeHtml(affixId)}">
          ${(affix.tierOptions ?? []).map((option) => `<option value="${escapeHtml(option.tierId)}" ${option.tierId === tier.tierId ? "selected" : ""}>T${option.tierIndex} · ${escapeHtml(runtimeLocaleText(option, option.text))}</option>`).join("")}
        </select>
      </label>
      <p class="hero-memory-affix-rendered">${escapeHtml(renderedTierText)}</p>
      ${(tier.rollDefs ?? []).map((roll) => {
        const value = config?.rolls?.[roll.key] ?? roll.max;
        return `
          <label class="hero-memory-roll-field">
            <span>${escapeHtml(ui("heroMemoryRoll"))}</span>
            <input
              class="hero-memory-roll-input"
              type="range"
              min="${escapeHtml(roll.min)}"
              max="${escapeHtml(roll.max)}"
              step="${escapeHtml(roll.step)}"
              value="${escapeHtml(value)}"
              data-affix="${escapeHtml(affixId)}"
              data-tier="${escapeHtml(tier.tierId)}"
              data-roll="${escapeHtml(roll.key)}"
            />
            <output>${escapeHtml(value)}</output>
          </label>
        `;
      }).join("")}
    </article>
  `;
}

function sumHeroMemoryCoverage(typeReports, section, field) {
  return typeReports.reduce((total, report) => total + Number(report?.[section]?.[field] ?? 0), 0);
}

function renderHeroMemoryCoverage(memoryType, report) {
  const typeReports = Array.isArray(report?.typeReports) ? report.typeReports : [];
  const current = typeReports.find(({ runtimeId }) => runtimeId === memoryType?.runtimeSlotId)
    ?? typeReports.find(({ runtimeId }) => runtimeId === memoryType?.slotId);
  if (!current) return "";

  const totals = {
    baseDirect: sumHeroMemoryCoverage(typeReports, "base", "exactKoEnhancementValues"),
    baseSemantic: sumHeroMemoryCoverage(typeReports, "base", "semanticTemplateKoEnhancementValues"),
    baseSource: sumHeroMemoryCoverage(typeReports, "base", "sourceEnhancementValues"),
    fixedGroupsDirect: sumHeroMemoryCoverage(typeReports, "fixed", "exactKoGroups"),
    fixedGroupsSemantic: sumHeroMemoryCoverage(typeReports, "fixed", "semanticTemplateKoGroups"),
    fixedGroupsSource: sumHeroMemoryCoverage(typeReports, "fixed", "sourceGroups"),
    fixedTiersDirect: sumHeroMemoryCoverage(typeReports, "fixed", "exactKoTiers"),
    fixedTiersSemantic: sumHeroMemoryCoverage(typeReports, "fixed", "semanticTemplateKoTiers"),
    fixedTiersSource: sumHeroMemoryCoverage(typeReports, "fixed", "sourceTiers"),
    randomGroupsDirect: sumHeroMemoryCoverage(typeReports, "random", "exactKoGroups"),
    randomGroupsSemantic: sumHeroMemoryCoverage(typeReports, "random", "semanticTemplateKoGroups"),
    randomGroupsSource: sumHeroMemoryCoverage(typeReports, "random", "sourceGroups"),
    randomTiersDirect: sumHeroMemoryCoverage(typeReports, "random", "exactKoTiers"),
    randomTiersSemantic: sumHeroMemoryCoverage(typeReports, "random", "semanticTemplateKoTiers"),
    randomTiersSource: sumHeroMemoryCoverage(typeReports, "random", "sourceTiers"),
  };

  return `
    <section class="hero-memory-coverage" data-role="hero-memory-coverage">
      <header>
        <strong>${ui("heroMemoryCoverageTitle")}</strong>
        <span>${ui("heroMemoryCoverageStatus")}</span>
      </header>
      <div class="hero-memory-coverage-grid">
        <span>${ui("heroMemoryCoverageGlobalBase", {
          display: totals.baseDirect + totals.baseSemantic,
          direct: totals.baseDirect,
          semantic: totals.baseSemantic,
          total: totals.baseSource,
        })}</span>
        <span>${ui("heroMemoryCoverageGlobalFixed", {
          groupsDisplay: totals.fixedGroupsDirect + totals.fixedGroupsSemantic,
          groupsDirect: totals.fixedGroupsDirect,
          groupsSemantic: totals.fixedGroupsSemantic,
          groupsTotal: totals.fixedGroupsSource,
          tiersDisplay: totals.fixedTiersDirect + totals.fixedTiersSemantic,
          tiersDirect: totals.fixedTiersDirect,
          tiersSemantic: totals.fixedTiersSemantic,
          tiersTotal: totals.fixedTiersSource,
        })}</span>
        <span>${ui("heroMemoryCoverageGlobalRandom", {
          groupsDisplay: totals.randomGroupsDirect + totals.randomGroupsSemantic,
          groupsDirect: totals.randomGroupsDirect,
          groupsSemantic: totals.randomGroupsSemantic,
          groupsTotal: totals.randomGroupsSource,
          tiersDisplay: totals.randomTiersDirect + totals.randomTiersSemantic,
          tiersDirect: totals.randomTiersDirect,
          tiersSemantic: totals.randomTiersSemantic,
          tiersTotal: totals.randomTiersSource,
        })}</span>
        <span>${ui("heroMemoryCoverageCurrentBase", {
          display: current.base.selectableEnhancementValues,
          direct: current.base.exactKoEnhancementValues,
          semantic: current.base.semanticTemplateKoEnhancementValues,
          total: current.base.sourceEnhancementValues,
        })}</span>
        <span>${ui("heroMemoryCoverageCurrentFixed", {
          groupsDisplay: current.fixed.selectableGroups,
          groupsDirect: current.fixed.exactKoGroups,
          groupsSemantic: current.fixed.semanticTemplateKoGroups,
          groupsTotal: current.fixed.sourceGroups,
          tiersDisplay: current.fixed.selectableTiers,
          tiersDirect: current.fixed.exactKoTiers,
          tiersSemantic: current.fixed.semanticTemplateKoTiers,
          tiersTotal: current.fixed.sourceTiers,
        })}</span>
        <span>${ui("heroMemoryCoverageCurrentRandom", {
          groupsDisplay: current.random.selectableGroups,
          groupsDirect: current.random.exactKoGroups,
          groupsSemantic: current.random.semanticTemplateKoGroups,
          groupsTotal: current.random.sourceGroups,
          tiersDisplay: current.random.selectableTiers,
          tiersDirect: current.random.exactKoTiers,
          tiersSemantic: current.random.semanticTemplateKoTiers,
          tiersTotal: current.random.sourceTiers,
        })}</span>
      </div>
      <p>${ui("heroMemoryCoverageUnavailable", {
        numericUnverified: report?.numericAuthority?.semanticTemplateUnverifiedRefs ?? 0,
        selectionWeightConflicts: report?.numericAuthority?.selectionWeightConflictRefs ?? 0,
      })}</p>
    </section>
  `;
}

function renderHeroMemoryEditor() {
  if (state.heroMemoryRuntime.status === "idle" || state.heroMemoryRuntime.status === "loading") {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="hero-memory-editor hero-memory-status" role="dialog" aria-modal="true" aria-label="${ui("heroMemoryBuilder")}">
        <span class="hero-trait-spinner" aria-hidden="true"></span>
        <strong>${ui("heroMemoryLoading")}</strong>
      </section>
    `;
  }
  if (state.heroMemoryRuntime.status === "error") {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="hero-memory-editor hero-memory-status is-error" role="dialog" aria-modal="true" aria-label="${ui("heroMemoryBuilder")}">
        <strong>${ui("heroMemoryLoadFailed")}</strong>
        <button data-action="hero-memory-retry">${ui("heroTraitRetry")}</button>
        <button data-action="close-overlay">${ui("cancel")}</button>
      </section>
    `;
  }

  const dataset = state.heroMemoryRuntime.dataset;
  const draft = state.heroMemoryDraft;
  const memoryType = draft?.memoryType ?? dataset?.memoryTypes?.[draft?.slotIndex];
  const memory = normalizeHeroMemoryInstance(draft?.memory, dataset);
  if (!memoryType || !memory) return "";

  const isRevivalExtraSlot = draft.isRevivalExtraSlot === true;
  const qualityRank = { magic: 1, rare: 2, excellent: 3, supreme: 4 };
  const maximumQualityRank = isRevivalExtraSlot
    ? qualityRank[draft.effect?.maxQuality] ?? 0
    : Number.POSITIVE_INFINITY;
  const profile = getHeroMemoryEnhancementProfile(memory.enhancement);
  const selectableEnhancementLevels = new Set(
    getSelectableHeroMemoryEnhancementProfiles(memoryType, memory.baseAttributeId)
      .filter((candidate) => (qualityRank[candidate.qualityId] ?? 0) <= maximumQualityRank)
      .map(({ enhancement }) => enhancement),
  );
  const diagnosis = isRevivalExtraSlot
    ? diagnoseHeroMemoryRevivalSlotInstance(memory, draft.effect, dataset)
    : diagnoseHeroMemoryInstance(memory, dataset);
  const preview = getHeroMemoryPreview(memory, dataset);
  const memoryCatalogItem = findItemById(memoryType.flatCatalogId ?? memory.memoryTypeId);
  const revivalAffixes = heroMemoryRevivalAffixes(dataset);
  const otherRevivalSlotIndex = isRevivalExtraSlot ? -1 : (state.build.hero?.memories ?? []).findIndex((candidate, index) => (
    index !== draft.slotIndex && Boolean(candidate?.revivalAffixId)
  ));
  const selectedConfigs = [
    ...memory.fixedAffixIds.map((affixId) => [affixId, "fixed"]),
    ...memory.randomAffixIds.map((affixId) => [affixId, "random"]),
    ...(!isRevivalExtraSlot && memory.revivalAffixId ? [[memory.revivalAffixId, "revival"]] : []),
  ];
  const hasSavedMemory = isRevivalExtraSlot
    ? Boolean(state.build.hero?.revivalMemory)
    : Boolean(state.build.hero?.memories?.[draft.slotIndex]);
  const localizedBasePreview = (basePreview) => basePreview.baseAttributeText
    ? isRevivalExtraSlot || memory.profitLoss
      ? basePreview.baseAttributeText
      : renderLocalizedRuntimeText(
        { localeRef: basePreview.baseAttributeLocaleRef },
        {},
        basePreview.baseAttributeText,
      )
    : "";
  const basePreviewText = localizedBasePreview(preview);

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="hero-memory-editor" role="dialog" aria-modal="true" aria-label="${ui("heroMemoryBuilder")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <header class="hero-memory-editor-title">
        ${renderItemIcon(memoryCatalogItem ?? {}, "hero-memory-type-icon")}
        <div>
          <small>${ui("heroMemoryBuilder")}</small>
          <h2>${escapeHtml(heroMemoryTypeName(memoryType))}</h2>
        </div>
        <span>${escapeHtml(isRevivalExtraSlot ? ui("heroMemoryRevivalExtraSlot") : ui("levelValue", { value: heroMemoryStageLevel(memoryType) }))}</span>
      </header>
      ${draft.screenshotMatchLabel
        ? `<p class="screenshot-editor-match" data-role="screenshot-editor-match">${escapeHtml(ui("screenshotRecognizedEditorHint", { name: draft.screenshotMatchLabel }))}</p>`
        : ""}
      <p class="calculation-limit-notice" data-role="hero-memory-calculation-unsupported" role="note">${calculationCopy("TLIDB SS13 원문에서 대상·연산·수치가 확인된 추억 효과만 계산합니다 · 나머지는 원인별 미지원", "Only memory effects with verified TLIDB SS13 targets, operations, and values are calculated · the rest remain unsupported by reason")}</p>
      ${isRevivalExtraSlot
        ? `<p class="hero-memory-revival-extra-hint">${ui("heroMemoryRevivalExtraEditorHint", { modifier: draft.effect.valueModifierPercent })}</p>`
        : ""}
      <details class="hero-memory-coverage-disclosure">
        <summary>${calculationCopy("데이터 출처·한국어 표시 범위", "Data sources and locale coverage")}</summary>
        ${renderHeroMemoryCoverage(memoryType, dataset.activeHeroMemoryReport)}
      </details>
      <div class="hero-memory-editor-body">
        <div class="hero-memory-form">
          <section>
            <h3>${ui("heroMemoryBaseAttribute")}</h3>
            <select id="heroMemoryBaseAttribute" aria-label="${ui("heroMemoryBaseAttribute")}">
              <option value="">${ui("heroMemoryChooseBase")}</option>
              ${(memoryType.baseAttributeGroups ?? []).map((base) => {
                const available = (base.enhancementValues ?? []).some(
                  ({ enhancementLevel }) => enhancementLevel === memory.enhancement,
                );
                const label = localizedBasePreview(getHeroMemoryPreview({ ...memory, baseAttributeId: base.id }, dataset))
                  || runtimeLocaleText(base, base.previewText || base.id);
                return `<option value="${escapeHtml(base.id)}" ${base.id === memory.baseAttributeId ? "selected" : ""} ${available ? "" : "disabled"}>${escapeHtml(label)}</option>`;
              }).join("")}
            </select>
          </section>
          <section>
            <div class="hero-memory-section-heading">
              <h3>${ui("heroMemoryEnhancement")}</h3>
              <span>${ui("heroMemoryEnhancementCurrent", { enhancement: memory.enhancement, trait: memory.traitLevelBonus })}</span>
            </div>
            <div class="hero-memory-quality-row">
              <strong>${ui(`heroMemoryQuality${profile.qualityId.at(0).toUpperCase()}${profile.qualityId.slice(1)}`)}</strong>
              <select id="heroMemoryEnhancementRange" aria-label="${ui("heroMemoryEnhancement")}">
                ${HERO_MEMORY_ENHANCEMENT_PROFILES.map((candidate, index) => `<option value="${index}" ${candidate.enhancement === profile.enhancement ? "selected" : ""} ${selectableEnhancementLevels.has(candidate.enhancement) ? "" : "disabled"}>${candidate.enhancement}</option>`).join("")}
              </select>
            </div>
            <div class="hero-memory-enhancement-presets">
              ${HERO_MEMORY_ENHANCEMENT_PROFILES.map((candidate) => `<button class="${candidate.enhancement === profile.enhancement ? "is-active" : ""}" data-action="hero-memory-enhancement" data-enhancement="${candidate.enhancement}" ${selectableEnhancementLevels.has(candidate.enhancement) ? "" : "disabled"}>${candidate.enhancement}</button>`).join("")}
            </div>
            ${isRevivalExtraSlot
              ? ""
              : `<label class="hero-memory-profit-loss">
                  <input id="heroMemoryProfitLoss" type="checkbox" ${memory.profitLoss ? "checked" : ""} />
                  <span><strong>${ui("heroMemoryProfitLoss")}</strong><small>${ui("heroMemoryProfitLossHint")}</small></span>
                </label>`}
          </section>
          ${isRevivalExtraSlot
            ? ""
            : `<section>
                <h3>${ui("heroMemoryRevival")}</h3>
                <select id="heroMemoryRevivalAffix" aria-label="${ui("heroMemoryRevival")}">
                  <option value="">${ui("heroMemoryChooseRevival")}</option>
                  ${revivalAffixes.map((affix) => `<option value="${escapeHtml(affix.id)}" ${affix.id === memory.revivalAffixId ? "selected" : ""}>${escapeHtml(runtimeLocaleText(affix, affix.previewText || affix.id))}</option>`).join("")}
                </select>
                ${otherRevivalSlotIndex >= 0
                  ? `<p class="hero-memory-revival-hint">${ui("heroMemoryRevivalExclusiveHint", { slot: otherRevivalSlotIndex + 1 })}</p>`
                  : ""}
              </section>`}
          <section>
            <div class="hero-memory-section-heading"><h3>${ui("heroMemoryFixedCount", { count: memory.fixedAffixIds.length, limit: profile.affixLimit })}</h3></div>
            <div class="hero-memory-affix-selects">${renderHeroMemoryAffixSelects("fixed", memoryType, memory, profile.affixLimit, dataset)}</div>
          </section>
          <section>
            <div class="hero-memory-section-heading"><h3>${ui("heroMemoryRandomCount", { count: memory.randomAffixIds.length, limit: profile.affixLimit })}</h3></div>
            <div class="hero-memory-affix-selects">${renderHeroMemoryAffixSelects("random", memoryType, memory, profile.affixLimit, dataset)}</div>
          </section>
          ${selectedConfigs.length ? `<section class="hero-memory-rolls"><h3>${ui("heroMemoryTierAndRoll")}</h3>${selectedConfigs.map(([affixId, kind]) => renderHeroMemoryAffixConfig(affixId, kind, memoryType, memory, dataset)).join("")}</section>` : ""}
        </div>
        <aside class="hero-memory-preview">
          <div>
            <small>${escapeHtml(heroMemoryTypeName(memoryType))}</small>
            <strong>${ui("heroMemoryEnhancementLabel", { enhancement: memory.enhancement })}</strong>
            <span>${ui("heroMemoryTraitLabel", { trait: memory.traitLevelBonus })}</span>
          </div>
          ${basePreviewText ? `<p>${escapeHtml(basePreviewText)}</p>` : `<p class="is-empty">${ui("heroMemoryPreviewEmpty")}</p>`}
          ${preview.affixes.map((affix) => `<p>${escapeHtml(isRevivalExtraSlot && affix.kind === "random" ? affix.text : renderLocalizedRuntimeText(affix, affix.rolls, affix.text))}</p>`).join("")}
          <footer class="${diagnosis.valid ? "is-valid" : "is-incomplete"}">
            ${diagnosis.valid ? ui("heroMemoryReady") : ui("heroMemoryMissing", { count: diagnosis.issues.length })}
          </footer>
        </aside>
      </div>
      ${isRevivalExtraSlot
        ? ""
        : `<details class="hero-memory-inventory-disclosure">
          <summary>${calculationCopy("추억 보관함에 따로 저장", "Save a separate inventory copy")}</summary>
          <section class="hero-memory-inventory-save">
            <label>
              <span>${ui("heroMemoryInventoryName")}</span>
              <input id="heroMemoryInventoryLabel" value="${escapeHtml(state.heroMemoryInventoryLabel)}" placeholder="${escapeHtml(ui("heroMemoryInventoryNamePlaceholder"))}" autocomplete="off" />
            </label>
            <button data-action="save-hero-memory-inventory" ${diagnosis.valid ? "" : "disabled"}>${ui("heroMemoryInventorySave")}</button>
          </section></details>`}
      <footer class="hero-memory-editor-actions">
        ${hasSavedMemory ? `<button class="danger" data-action="hero-memory-remove">${ui("heroMemoryRemove")}</button>` : ""}
        <button data-action="close-overlay">${ui("cancel")}</button>
        <button class="primary" data-action="hero-memory-save" ${diagnosis.valid ? "" : "disabled"}>${ui("heroMemorySave")}</button>
      </footer>
    </section>
  `;
}

function skillRuntimeDisplay(record) {
  const flatItem = record?.id ? findItemById(record.id) : null;
  const localizedRecord = getTlidbLocaleText(record, state.locale);
  return {
    name: presentSourceGameText(flatItem
      ? itemText(flatItem).name
      : exactTlidbLocaleField(localizedRecord, "name", record) ?? gameText(record?.name), { locale: state.locale }),
    iconUrl: flatItem?.iconUrl || record?.localIconPath || record?.iconUrl || "",
  };
}

function getRuntimeSkillRecord(skillId, rowIndex = 0) {
  const runtimeRecord = findSkillRuntimeRecord(state.skillRuntime.model, skillId);
  if (runtimeRecord) return runtimeRecord;
  const externalMain = getExternalMainSkillOverride(
    state.skillRuntime.model,
    state.build,
    "active",
    rowIndex,
  );
  return externalMain?.skill?.id === skillId ? externalMain.skill : null;
}

function getSkillRowDisplay(row) {
  const item = findItemById(row?.skillId);
  if (item) return { ...itemText(item), iconUrl: item.iconUrl || "" };
  const runtimeRecord = getRuntimeSkillRecord(row?.skillId, row?.rowIndex ?? 0);
  if (runtimeRecord) return skillRuntimeDisplay(runtimeRecord);
  return {
    name: calculationCopy("미검증 스킬", "Unverified skill"),
    iconUrl: "",
  };
}

function skillRuntimeSourceTags(record) {
  if (Array.isArray(record?.tagsCn) && record.tagsCn.length) return record.tagsCn;
  if (Array.isArray(record?.displayTags) && record.displayTags.length) return record.displayTags;
  return Array.isArray(record?.tags) ? record.tags : [];
}

function skillRuntimeTagEntries(record) {
  const sourceTags = skillRuntimeSourceTags(record);
  const flatItemId = record?.flatItemId ?? record?.id;
  const flatItem = flatItemId ? findItemById(flatItemId) : null;
  const exactSourceLocale = flatItem?.tlidbText?.cn;
  const sourceAnchors = exactSourceLocale?.sourceFieldStatus?.tags === "exact"
    && String(exactSourceLocale.sourceUrl ?? "").startsWith("https://tlidb.com/cn/")
    && Array.isArray(exactSourceLocale.tags)
    ? exactSourceLocale.tags
    : Array.isArray(flatItem?.tags) ? flatItem.tags : [];
  const localized = getTlidbLocaleText(record, state.locale);
  const localizedTags = localized?.sourceFieldStatus?.tags === "exact"
    && Array.isArray(localized.tags)
    ? localized.tags
    : [];

  return sourceTags.map((sourceTag, ordinal) => {
    const sourceAnchor = sourceAnchors[ordinal];
    const localizedTag = localizedTags[ordinal];
    const sourceAnchorMatches = typeof sourceTag === "string"
      && typeof sourceAnchor === "string"
      && sourceAnchor.trim() === sourceTag.trim();
    const exactTag = sourceAnchorMatches
      && typeof localizedTag === "string" && localizedTag
      ? localizedTag
      : state.locale === "ko" ? getSs13SupportFilterTag(flatItem, sourceTag) : null;
    return {
      sourceTag,
      exactTag,
      displayTag: exactTag ?? sourceTag,
    };
  });
}

function skillRuntimeVisibleTags(record) {
  const localized = getTlidbLocaleText(record, state.locale);
  if (localized?.sourceFieldStatus?.tags === "exact" && Array.isArray(localized.tags)) {
    return localized.tags
      .map((tag) => presentSourceGameText(tag, { locale: state.locale }))
      .filter(Boolean);
  }
  return skillRuntimeSourceTags(record)
    .map((tag) => presentSourceGameText(tag, { locale: state.locale }))
    .filter(Boolean);
}

function skillRuntimeTagDisplayNames(records) {
  const exactNamesBySource = new Map();
  for (const record of records) {
    for (const { sourceTag, exactTag } of skillRuntimeTagEntries(record)) {
      if (!exactTag) continue;
      const exactNames = exactNamesBySource.get(sourceTag) ?? new Set();
      exactNames.add(exactTag);
      exactNamesBySource.set(sourceTag, exactNames);
    }
  }

  return new Map(
    [...exactNamesBySource.entries()]
      .filter(([, exactNames]) => exactNames.size === 1)
      .map(([sourceTag, exactNames]) => [sourceTag, [...exactNames][0]]),
  );
}

function skillRuntimeTagCounts(records, preferredOrder = []) {
  const counts = new Map();
  for (const record of records) {
    const recordTags = record.tagsCn?.length ? record.tagsCn : record.tags ?? [];
    for (const tag of recordTags) {
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const order = new Map(preferredOrder.map((tag, index) => [tag, index]));
  return [...counts.entries()].sort((left, right) => (
    right[1] - left[1]
    || (order.get(left[0]) ?? Number.MAX_SAFE_INTEGER) - (order.get(right[0]) ?? Number.MAX_SAFE_INTEGER)
    || left[0].localeCompare(right[0])
  ));
}

function skillRuntimeTagDisplayName(sourceTag, inferredName) {
  const exact = TLIDB_SKILL_TAG_LOCALES[sourceTag]?.[state.locale];
  const appUi = SKILL_TAG_APP_UI_LABELS[sourceTag]?.[state.locale];
  return exact
    ?? appUi
    ?? inferredName
    ?? presentSourceGameText(sourceTag, { locale: state.locale });
}

function skillRuntimeControlRange(control, tier, activation) {
  const source = activation
    ? control.activation_medium_tier_range_presets
    : control.tier_range_presets;
  const range = source?.[tier];
  if (!Array.isArray(range) || range.length < 2) return [Number(control.min), Number(control.max)];
  return [Math.min(Number(range[0]), Number(range[1])), Math.max(Number(range[0]), Number(range[1]))];
}

function skillRuntimeControlValue(control, config, tier, activation) {
  const stored = Number(config?.effectRollOverrides?.[control.storage_key]);
  if (Number.isFinite(stored)) return stored;
  const range = skillRuntimeControlRange(control, tier, activation);
  const step = Number(control.step) || 0.1;
  const places = String(step).split(".")[1]?.length ?? 0;
  return Number(((range[0] + range[1]) / 2).toFixed(places));
}

function skillRuntimeEditorLocaleText(field, tier, fallback) {
  return getActiveSkillRuntimeEditorLocaleText(field, state.locale, tier) || gameText(fallback);
}

function renderSkillRuntimeControl(record, control, config, tier, activation) {
  const range = skillRuntimeControlRange(control, tier, activation);
  const value = skillRuntimeControlValue(control, config, tier, activation);
  return `
    <label class="skill-runtime-config-roll">
      <span>${escapeHtml(skillRuntimeEditorLocaleText(control, tier, control.label))}</span>
      <input type="range" min="${range[0]}" max="${range[1]}" step="${control.step}" value="${value}" class="skill-runtime-config-roll-input" data-item="${escapeHtml(record.id)}" data-control="${escapeHtml(control.storage_key)}" />
      <output>${value}</output>
    </label>
  `;
}

function renderSkillRuntimeSupportConfig(record, config) {
  const editor = record?.editorConfig;
  if (!editor || editor.kind === "basic_support") return "";
  if (editor.kind === "exclusive_support") {
    const selectedTier = config?.specialTier ?? editor.default_tier;
    const specialLevel = config?.specialLevel ?? editor.default_level;
    return `
      <section class="skill-runtime-support-config">
        <p class="calculation-limit-notice" data-role="support-config-calculation-unsupported" role="note">${calculationCopy("숫자 롤은 TLIDB 효과 변수와 정확히 매칭될 때 계산됩니다. 특수 등급·활성화 규칙이 미해결이면 미지원 입력으로 남습니다.", "Numeric rolls calculate when they match an exact TLIDB effect variable. Unresolved special tiers or activation rules remain unsupported inputs.")}</p>
        <label><span>${ui("skillSpecialTier")}</span><select class="skill-runtime-config-tier" data-item="${escapeHtml(record.id)}">${editor.tier_options.map((tier) => `<option value="${tier}" ${tier === selectedTier ? "selected" : ""}>${tier}</option>`).join("")}</select></label>
        <label><span>${ui("skillSpecialLevel")}</span><select class="skill-runtime-config-special-level" data-item="${escapeHtml(record.id)}">${editor.level_options.map((level) => `<option value="${level}" ${level === specialLevel ? "selected" : ""}>${level}</option>`).join("")}</select></label>
        ${editor.numeric_controls.map((control) => renderSkillRuntimeControl(record, control, config, selectedTier, false)).join("")}
      </section>
    `;
  }
  return `
    <section class="skill-runtime-support-config">
      <p class="calculation-limit-notice" data-role="support-config-calculation-unsupported" role="note">${calculationCopy("숫자 롤은 TLIDB 효과 변수와 정확히 매칭될 때 계산됩니다. 특수 등급·활성화 규칙이 미해결이면 미지원 입력으로 남습니다.", "Numeric rolls calculate when they match an exact TLIDB effect variable. Unresolved special tiers or activation rules remain unsupported inputs.")}</p>
      ${editor.clauses.map((clause) => {
        const selectedTier = config?.activationMediumTierByClause?.[clause.effect_id]
          ?? config?.activationMediumTier
          ?? clause.tier_options[0]
          ?? editor.default_tier;
        const description = skillRuntimeEditorLocaleText(
          clause,
          selectedTier,
          clause.tier_descriptions?.[selectedTier] ?? clause.description,
        );
        const controls = editor.numeric_controls.filter((control) => control.effect_id === clause.effect_id);
        return `
          <div class="skill-runtime-config-clause">
            ${clause.tier_options.length ? `<label><span>${ui("skillActivationTier")}</span><select class="skill-runtime-config-tier" data-item="${escapeHtml(record.id)}" data-effect="${escapeHtml(clause.effect_id)}">${clause.tier_options.map((tier) => `<option value="${tier}" ${tier === selectedTier ? "selected" : ""}>${tier}</option>`).join("")}</select></label>` : ""}
            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
            ${controls.map((control) => renderSkillRuntimeControl(record, control, config, selectedTier, true)).join("")}
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderHostIndependentSupportSettings(model) {
  const records = getHostIndependentSupportRuntimeRecords(model);
  if (!records.length) return "";
  return `
    <details class="skill-runtime-independent-settings" data-role="skill-independent-support-settings" open>
      <summary>${ui("skillIndependentSupportSettings")} <small>${records.length}</small></summary>
      <p>${ui("skillIndependentSupportSettingsHint")}</p>
      <div class="skill-runtime-independent-grid">
        ${records.map((record) => {
          const display = skillRuntimeDisplay(record);
          const fields = [
            ...(record.editorConfig?.clauses ?? []),
            ...(record.editorConfig?.numeric_controls ?? []),
          ];
          return `
            <article class="skill-runtime-independent-config" data-independent-support="${escapeHtml(record.id)}">
              <header>
                ${display.iconUrl ? `<img src="${escapeHtml(display.iconUrl)}" alt="" loading="lazy" />` : ""}
                <div><strong>${escapeHtml(display.name || record.id)}</strong><small data-role="independent-support-connection-unverified">${ui("skillIndependentSupportConnectionUnverified")}</small></div>
              </header>
              <p class="calculation-limit-notice" data-role="support-config-calculation-unsupported" role="note">${ui("skillIndependentSupportReadOnly")}</p>
              ${fields.map((field) => {
                const sourceText = getActiveSkillRuntimeEditorLocaleText(field, state.locale);
                const tierStructure = record.editorConfig?.tier_options ?? [];
                return `<dl>
                  <div>
                    <dt>${ui("statusSourceText")}</dt>
                    <dd>${escapeHtml(sourceText)}</dd>
                  </div>
                  ${tierStructure.length ? `<div data-role="independent-support-tier-structure-unverified"><dt>${ui("skillIndependentSupportTierStructure")}</dt><dd>${escapeHtml(tierStructure.join(" · "))} · ${ui("skillIndependentSupportTierValuesUnverified")}</dd></div>` : ""}
                </dl>`;
              }).join("")}
              ${record.url ? `<a href="${escapeHtml(record.url.replace("/cn/", `/${state.locale}/`))}" target="_blank" rel="noreferrer">${ui("skillIndependentSupportSourceLink")}</a>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </details>
  `;
}

function renderSkillRuntimePickerCard(record, model, skills, picker, isSupport) {
  const display = skillRuntimeDisplay(record);
  const expanded = picker.expandedItemId === record.id;
  const equipped = skillRuntimePickerEquippedId(skills, picker) === record.id;
  const level = skillRuntimePickerItemLevel(skills, picker, record.id);
  const localizedRecord = getTlidbLocaleText(record, state.locale);
  const tags = skillRuntimeVisibleTags(record).join(" · ");
  const localizedDescription = presentSourceGameText(
    exactTlidbLocaleField(localizedRecord, "detail", record)
      || exactTlidbLocaleField(localizedRecord, "summary", record)
      || "",
    { locale: state.locale, optional: true },
  );
  const description = localizedDescription || resolveSkillRuntimeDescription(record, level);
  const config = isSupport ? skillRuntimePickerItemConfig(skills, picker, record) : undefined;
  const showDetails = !isSupport || picker.detailItemIds.includes(record.id);
  const requiredSlot = isSupport && Number.isInteger(record.requiredSlot)
    ? `<small class="skill-runtime-required-slot">${ui("skillRequiredSupportSlot", { index: record.requiredSlot })}</small>`
    : "";
  const calculationSupport = record.calculationSupported === false
    ? `<small class="skill-runtime-calculation-unsupported">${calculationCopy("계산 미지원 · 표시·선택·저장만 지원", "Calculation unsupported · display, selection, and save only")}</small>`
    : "";
  return `
    <article class="skill-runtime-result ${expanded ? "is-expanded" : ""} ${equipped ? "is-equipped" : ""}">
      <button class="skill-runtime-result-summary" data-action="skill-runtime-card-toggle" data-item="${escapeHtml(record.id)}" aria-expanded="${expanded}">
        ${renderItemIcon({ iconUrl: display.iconUrl }, "skill-runtime-card-icon")}
        <div><strong>${escapeHtml(display.name || record.id)}</strong><small>${escapeHtml(tags)}</small></div>
        <b>${expanded ? "−" : "+"}</b>
      </button>
      ${expanded ? `
        <div class="skill-runtime-result-detail">
          <header class="ingame-skill-detail-title">${renderItemIcon({ iconUrl: display.iconUrl }, "skill-runtime-card-icon")}<div><strong>${escapeHtml(display.name)}</strong><small>${escapeHtml(tags)}</small></div></header>
          ${requiredSlot}
          ${calculationSupport}
          ${isSupport ? renderSkillRuntimeSupportConfig(record, config) : ""}
          ${isSupport ? `<button class="skill-runtime-show-details" data-action="skill-runtime-support-details" data-item="${escapeHtml(record.id)}">${ui(showDetails ? "skillHideDetails" : "skillShowDetails")}</button>` : ""}
          ${showDetails && description ? `<p>${escapeHtml(localizedDescription ? description : gameText(description))}</p>` : ""}
          <label class="skill-runtime-card-level">
            <span>${ui("skillLevel")}</span>
            <button data-action="skill-runtime-card-level" data-item="${escapeHtml(record.id)}" data-delta="-1" aria-label="${ui("skillLevelDecrease")}">−</button>
            <input class="skill-runtime-card-level-input" data-item="${escapeHtml(record.id)}" inputmode="numeric" value="${level}" aria-label="${ui("skillLevel")}" />
            <button data-action="skill-runtime-card-level" data-item="${escapeHtml(record.id)}" data-delta="1" aria-label="${ui("skillLevelIncrease")}">+</button>
          </label>
          <button class="${equipped ? "danger" : "primary"}" data-action="${equipped ? "skill-runtime-card-remove" : "skill-runtime-card-confirm"}" data-item="${escapeHtml(record.id)}">${ui(equipped ? "remove" : "skillConfirm")}</button>
          ${equipped ? `<button class="ingame-skill-replace" data-action="skill-picker-catalog">교체</button>` : ""}
        </div>
      ` : ""}
    </article>
  `;
}

function renderSkillRuntimePreviewCard(record) {
  const display = {
    name: gameText(record?.name || record?.id || ""),
    iconUrl: record?.localIconPath || record?.iconUrl || "",
  };
  const tags = skillRuntimeVisibleTags(record).join(" · ");
  return `
    <article class="skill-runtime-result is-season-preview" aria-disabled="true">
      <div class="skill-runtime-result-summary">
        ${renderItemIcon({ iconUrl: display.iconUrl }, "skill-runtime-card-icon")}
        <div><strong>${escapeHtml(display.name || record.id)}</strong><small>${escapeHtml(tags)}</small></div>
        <b>SS13</b>
      </div>
    </article>
  `;
}

function normalizeForMatch(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힯㐀-鿿]+/g, "");
}

function mergeSkillRuntimeLocaleSearch(candidates, sourceMatches, query) {
  const needle = normalizeForMatch(query);
  if (!needle) return candidates;
  const sourceMatchIds = new Set(sourceMatches.map((record) => record.id));
  return candidates.filter((record) => {
    if (sourceMatchIds.has(record.id)) return true;
    const localeValues = SUPPORTED_LOCALES.flatMap((locale) => {
      const text = getTlidbLocaleText(record, locale.id);
      return text ? [text.name, text.summary, text.detail, ...(text.tags ?? [])] : [];
    });
    return normalizeForMatch(localeValues.join(" ")).includes(needle);
  });
}

function renderSkillRuntimePicker(model, skills) {
  const picker = state.skillPicker;
  if (!picker) return "";
  const collection = picker.kind === "passive" ? "passive" : "active";
  const slot = skills[collection]?.[picker.rowIndex];
  const isSupport = picker.supportIndex !== null;
  const rowLabel = collection === "active"
    ? picker.rowIndex === 0 ? ui("skillCore") : ui("skillActiveNumber", { index: picker.rowIndex + 1 })
    : ui("skillPassiveNumber", { index: picker.rowIndex + 1 });
  const targetLabel = ui(isSupport ? "skillPickerTargetSupport" : "skillPickerTargetMain", {
    slot: rowLabel,
    index: picker.supportIndex + 1,
  });
  const externalMain = getExternalMainSkillOverride(
    model,
    state.build,
    collection,
    picker.rowIndex,
  );
  const supportHostSkillId = externalMain?.skill?.id ?? slot?.skillId ?? null;
  const hasSupportHost = !isSupport || Boolean(supportHostSkillId);
  const activeModel = excludeSs13PreviewSkillRuntimeModel(model);
  const heroIdentifier = skillRuntimeUpdateOptions().heroIdentifier;
  const recordOptions = {
    query: picker.query,
    tags: picker.tags,
    equippedSupports: slot?.supports,
    currentSupportIndex: picker.supportIndex,
    heroIdentifier,
  };
  const allRecordOptions = { ...recordOptions, query: "" };
  const sourceMatchedRecords = isSupport && hasSupportHost
    ? getCompatibleSupportRuntimeRecords(activeModel, supportHostSkillId, picker.supportIndex + 1, recordOptions)
    : isSupport
      ? []
      : filterSkillRuntimeRecords(activeModel, collection, recordOptions);
  const records = mergeSkillRuntimeLocaleSearch(
    isSupport && hasSupportHost
      ? getCompatibleSupportRuntimeRecords(activeModel, supportHostSkillId, picker.supportIndex + 1, allRecordOptions)
      : isSupport
        ? []
        : filterSkillRuntimeRecords(activeModel, collection, allRecordOptions),
    sourceMatchedRecords,
    picker.query,
  );
  const previewSourceMatches = isSupport && hasSupportHost
    ? getCompatibleSupportRuntimeRecords(model, supportHostSkillId, picker.supportIndex + 1, recordOptions)
    : isSupport
      ? []
      : filterSkillRuntimeRecords(model, collection, recordOptions);
  const previewRecords = mergeSkillRuntimeLocaleSearch(
    isSupport && hasSupportHost
      ? getCompatibleSupportRuntimeRecords(model, supportHostSkillId, picker.supportIndex + 1, allRecordOptions)
      : isSupport
        ? []
        : filterSkillRuntimeRecords(model, collection, allRecordOptions),
    previewSourceMatches,
    picker.query,
  ).filter(isSs13PreviewSkillRuntimeRecord);
  const tagSource = isSupport && hasSupportHost
    ? getCompatibleSupportRuntimeRecords(activeModel, supportHostSkillId, picker.supportIndex + 1, {
        equippedSupports: slot?.supports,
        currentSupportIndex: picker.supportIndex,
        heroIdentifier,
      })
    : isSupport
      ? []
      : filterSkillRuntimeRecords(activeModel, collection, { heroIdentifier });
  const preferredTagOrder = isSupport
    ? []
    : collection === "active"
      ? SKILL_ACTIVE_TAG_ORDER
      : SKILL_PASSIVE_TAG_ORDER;
  const tags = skillRuntimeTagCounts(tagSource, preferredTagOrder).slice(0, 48);
  const tagDisplayNames = skillRuntimeTagDisplayNames(tagSource);

  return `
    <aside class="skill-runtime-picker ${picker.catalogOpen === false && picker.expandedItemId ? "is-inspecting" : "is-browsing"}" aria-label="${ui(isSupport ? "skillSupportSelector" : "skillMainSelector")}">
      <header>
        <div><small>${ui(isSupport ? "skillCompatibleSupports" : collection === "active" ? "skillActive" : "skillPassive")}</small><strong data-role="skill-picker-target">${escapeHtml(targetLabel)}</strong></div>
        <button data-action="skill-picker-close" aria-label="${ui("close")}">×</button>
      </header>
      <input id="skillRuntimeSearch" type="search" value="${escapeHtml(picker.query)}" placeholder="${ui("searchPlaceholder")}" autocomplete="off" />
      <div class="skill-runtime-tag-filters">
        <button class="${picker.tags.length ? "" : "is-active"}" data-action="skill-picker-tags-clear">${ui("all")} <small>${tagSource.length}</small></button>
        ${tags.map(([tag, count]) => `<button class="${picker.tags.includes(tag) ? "is-active" : ""}" data-action="skill-picker-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(skillRuntimeTagDisplayName(tag, tagDisplayNames.get(tag)))} <small>${count}</small></button>`).join("")}
      </div>
      <div class="skill-runtime-results">
        ${!hasSupportHost
          ? `<p class="empty">${ui("skillSupportNeedsMain")}</p>`
          : records.length
            ? records.map((record) => renderSkillRuntimePickerCard(record, model, skills, picker, isSupport)).join("")
            : `<p class="empty">${ui(isSupport ? "skillNoCompatibleSupports" : "noCatalogData")}</p>`}
        ${previewRecords.length ? `
          <section class="skill-runtime-preview-results" aria-label="${ui("ss13HeroPreview")}">
            <header><strong>${ui("ss13HeroPreview")}</strong><small>${ui("ss13HeroPreviewNotApplied")}</small></header>
            ${previewRecords.map(renderSkillRuntimePreviewCard).join("")}
          </section>
        ` : ""}
      </div>
    </aside>
  `;
}

function renderSkillRuntimeElixirCalculationStatus(skills) {
  const configured = (skills.elixirs ?? []).some((elixir) => (
    Boolean(elixir?.skillId) || (elixir?.ingredientIds ?? []).some(Boolean)
  ));
  if (!configured) {
    return `<p class="calculation-limit-notice" data-role="elixir-calculation-status" data-status="empty" role="note">${ui("skillElixirCalculationEmpty")}</p>`;
  }
  const projection = state.isStale ? null : state.lastCalculation?.elixirProjection;
  if (!projection) {
    return `<p class="calculation-limit-notice" data-role="elixir-calculation-status" data-status="pending" role="note">${ui("skillElixirCalculationPending")}</p>`;
  }
  if (projection.status === "inactive") {
    return `<p class="calculation-limit-notice" data-role="elixir-calculation-status" data-status="inactive" role="note">${ui("skillElixirCalculationInactive", { supported: projection.supportedEffectCount })}</p>`;
  }
  if (projection.appliedEffectCount > 0) {
    return `<p class="calculation-limit-notice" data-role="elixir-calculation-status" data-status="${escapeHtml(projection.status)}" role="note">${ui("skillElixirCalculationApplied", { applied: projection.appliedEffectCount, blocked: projection.blockers.length })}</p>`;
  }
  return `<p class="calculation-limit-notice" data-role="elixir-calculation-status" data-status="blocked" role="note">${ui("skillElixirCalculationBlocked")}</p>`;
}

function renderSkillRuntimeElixirIngredientField(model, elixir, elixirIndex, bottle, ingredientIndex) {
  const ingredients = model.elixir.ingredients.filter((ingredient) => (
    ingredient.allowedBottleIds.includes(bottle.id)
  ));
  const selectedId = elixir?.ingredientIds?.[ingredientIndex] ?? null;
  const selected = ingredients.find(({ id }) => id === selectedId);
  return `<label>
    <span>${ui("skillElixirIngredient", { index: ingredientIndex + 1 })}</span>
    <select class="skill-elixir-ingredient" data-elixir-index="${elixirIndex}" data-ingredient-index="${ingredientIndex}">
      <option value="">${ui("skillElixirChooseIngredient")}</option>
      ${ingredients.map((ingredient) => `<option value="${escapeHtml(ingredient.id)}" ${ingredient.id === selectedId ? "selected" : ""}>${escapeHtml(runtimeLocaleField(ingredient, "name", ingredient.displayName || ingredient.id))}</option>`).join("")}
    </select>
    ${selected ? `<small data-role="skill-elixir-ingredient-detail">${escapeHtml(runtimeLocaleText(selected, selected.displayName || selected.id))}</small>` : ""}
  </label>`;
}

function renderSkillRuntimeElixirs(model, skills) {
  const elixirActive = resolveConditionValues(state.build.conditions)
    .playerStates?.elixir_skill_active === true;
  return `
    <section class="skill-runtime-elixirs">
      <h3>${ui("skillElixirs")}</h3>
      <label class="skill-elixir-active-toggle">
        <input class="skill-elixir-active-condition" type="checkbox" ${elixirActive ? "checked" : ""} />
        <span><strong>${ui("skillElixirActiveCondition")}</strong><small>${ui("skillElixirActiveConditionHint")}</small></span>
      </label>
      ${renderSkillRuntimeElixirCalculationStatus(skills)}
      <div>
        ${model.elixir.bottles.map((bottle, elixirIndex) => {
          const elixir = skills.elixirs?.[elixirIndex];
          const sourceSlotIndex = Number(String(bottle.slotId ?? "").split("-").at(-1));
          return `
            <article>
              <header><strong>${escapeHtml(runtimeLocaleField(bottle, "name", bottle.displayName || bottle.id))}</strong><small>${ui("skillActiveSlotNumber", { index: Number.isInteger(sourceSlotIndex) ? sourceSlotIndex : elixirIndex + 1 })}</small></header>
              <label><span>${ui("skillElixirSkill")}</span><select class="skill-elixir-skill" data-elixir-index="${elixirIndex}"><option value="">${ui("skillElixirChooseSkill")}</option>${model.elixir.skills.map((skill) => `<option value="${escapeHtml(skill.id)}" ${skill.id === elixir?.skillId ? "selected" : ""}>${escapeHtml(runtimeLocaleField(skill, "name", skill.name || skill.id))}</option>`).join("")}</select></label>
              ${Array.from({ length: bottle.baseIngredientCapacity }, (_, ingredientIndex) => (
                renderSkillRuntimeElixirIngredientField(
                  model,
                  elixir,
                  elixirIndex,
                  bottle,
                  ingredientIndex,
                )
              )).join("")}
              ${elixir ? `<button data-action="skill-elixir-clear" data-elixir-index="${elixirIndex}">${ui("skillElixirClear")}</button>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function modularizationOptionGroup(record) {
  const sourceId = String(record?.raw?.id ?? "");
  if (sourceId.startsWith("program_")) return "program";
  if (sourceId.startsWith("protocol_")) return "protocol";
  if (sourceId.startsWith("aura_overwrite_")) return "aura";
  return "source";
}

function renderSkillRuntimeModularizationConfig(model, slot, kind, rowIndex) {
  const config = slot?.modularization;
  if (!config) return "";
  const calculation = projectTlidbModularizationCalculation({
    skillId: slot.skillId,
    config,
    conditions: state.build.conditions,
  });
  const calculationStatus = calculation.accounting;
  const options = getModularizationOptionRecords(model);
  const optionGroups = [
    ["program", ui("skillModularizationProgram")],
    ["protocol", ui("skillModularizationProtocol")],
    ["aura", ui("skillModularizationAuraOverwrite")],
    ["source", ui("skillModularizationSourceCode")],
  ];
  const selectedIds = config.moduleOptionIds ?? [];
  const calculationEffectDetails = selectedIds.map((sourceModuleOptionId) => {
    const effects = calculation.effects.filter((effect) => (
      effect.sourceModuleOptionId === sourceModuleOptionId
    ));
    if (!effects.length) return null;
    const option = options.find((record) => record.raw.id === sourceModuleOptionId);
    return {
      sourceModuleOptionId,
      name: option ? skillRuntimeDisplay(option).name : sourceModuleOptionId,
      sourceText: effects[0].sourceText,
      active: effects.every((effect) => effect.active),
    };
  }).filter(Boolean);
  const frenzySelected = selectedIds.includes("program_frenzy");
  const frenzyActive = Boolean(
    resolveConditionValues(state.build.conditions).statuses.minion_low_life,
  );
  const surgeSelected = selectedIds.includes("source_surge");
  const surgeDistance = resolveConditionValues(
    state.build.conditions,
  ).recent.moveDistanceMeters;
  const ailmentProtocolSelected = selectedIds.includes("protocol_ailment");
  const elementalProtocolSelected = selectedIds.includes("protocol_elemental");
  const enemyAilmentCount = resolveConditionValues(
    state.build.conditions,
  ).enemy.ailmentCount;
  return `
    <section class="skill-runtime-modularization" data-role="skill-modularization-config">
      <header>
        <strong>${ui("skillModularizationConfig")}</strong>
        <span>${ui("skillModularizationHint")}</span>
      </header>
      <div class="skill-runtime-modularization-fields">
        ${Array.from({ length: 3 }, (_, optionIndex) => {
          const currentId = selectedIds[optionIndex] ?? "";
          return `
            <label>
              <span>${ui("skillModularizationBenefit", { index: optionIndex + 1 })}</span>
              <select class="skill-modularization-option" data-kind="${kind}" data-row-index="${rowIndex}" data-option-index="${optionIndex}" aria-label="${escapeHtml(ui("skillModularizationBenefit", { index: optionIndex + 1 }))}">
                <option value="">${ui("skillModularizationUnselected")}</option>
                ${optionGroups.map(([groupId, groupLabel]) => `
                  <optgroup label="${escapeHtml(groupLabel)}">
                    ${options.filter((record) => modularizationOptionGroup(record) === groupId).map((record) => {
                      const sourceId = record.raw.id;
                      const selectedElsewhere = selectedIds.some((id, index) => (
                        index !== optionIndex && id === sourceId
                      ));
                      return `<option value="${escapeHtml(sourceId)}" ${sourceId === currentId ? "selected" : ""} ${selectedElsewhere ? "disabled" : ""}>${escapeHtml(skillRuntimeDisplay(record).name)}</option>`;
                    }).join("")}
                  </optgroup>
                `).join("")}
              </select>
            </label>
          `;
        }).join("")}
        <label>
          <span>${ui("skillModularizationSummonCount")}</span>
          <input class="skill-modularization-summon-count" data-kind="${kind}" data-row-index="${rowIndex}" type="number" min="0" step="1" value="${Object.hasOwn(config, "summonCount") ? escapeHtml(config.summonCount) : ""}" placeholder="${escapeHtml(ui("skillModularizationSummonDefault"))}" aria-label="${escapeHtml(ui("skillModularizationSummonCount"))}" />
        </label>
        ${frenzySelected ? `
          <label class="skill-modularization-condition-field">
            <span>${ui("skillModularizationFrenzyCondition")}</span>
            <input class="skill-modularization-condition" type="checkbox" ${frenzyActive ? "checked" : ""} aria-label="${escapeHtml(ui("skillModularizationFrenzyCondition"))}" />
            <small>${ui("skillModularizationFrenzyConditionHint")}</small>
          </label>
        ` : ""}
        ${surgeSelected ? `
          <label class="skill-modularization-condition-field">
            <span>${ui("skillModularizationSurgeDistance")}</span>
            <input class="skill-modularization-surge-distance" type="number" min="0" step="0.1" value="${escapeHtml(surgeDistance)}" aria-label="${escapeHtml(ui("skillModularizationSurgeDistance"))}" />
            <small>${ui("skillModularizationSurgeDistanceHint")}</small>
          </label>
        ` : ""}
        ${ailmentProtocolSelected ? `
          <label class="skill-modularization-condition-field">
            <span>${ui("skillModularizationAilmentCount")}</span>
            <input class="skill-modularization-ailment-count" type="number" min="0" step="1" value="${Number.isInteger(enemyAilmentCount) ? escapeHtml(enemyAilmentCount) : ""}" placeholder="${escapeHtml(ui("skillModularizationInputRequired"))}" aria-label="${escapeHtml(ui("skillModularizationAilmentCount"))}" />
            <small>${ui("skillModularizationAilmentCountHint")}</small>
          </label>
        ` : ""}
        ${elementalProtocolSelected ? `
          <label class="skill-modularization-condition-field">
            <span>${ui("skillModularizationElementalDamageType")}</span>
            <select class="skill-modularization-elemental-damage-type" data-kind="${kind}" data-row-index="${rowIndex}" aria-label="${escapeHtml(ui("skillModularizationElementalDamageType"))}">
              <option value="">${ui("skillModularizationInputRequired")}</option>
              ${[
                ["fire", ui("skillModularizationElementFire")],
                ["cold", ui("skillModularizationElementCold")],
                ["lightning", ui("skillModularizationElementLightning")],
              ].map(([value, label]) => `<option value="${value}" ${config.elementalProtocolDamageType === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
            <small>${ui("skillModularizationElementalDamageTypeHint")}</small>
          </label>
        ` : ""}
      </div>
      <p data-role="skill-modularization-calculation-status">${ui("skillModularizationCalculationStatus", {
        ready: calculationStatus.readyOptionCount,
        selected: calculationStatus.selectedOptionCount,
        active: calculationStatus.activeEffectCount,
        inactive: calculationStatus.inactiveEffectCount,
        blocked: calculationStatus.blockerCount,
      })}</p>
      ${calculationEffectDetails.length ? `
        <div class="skill-modularization-effect-list" data-role="skill-modularization-effect-list">
          <strong>${ui("skillModularizationEffectList")}</strong>
          <ul>
            ${calculationEffectDetails.map((effect) => `
              <li data-active="${effect.active}">
                <div>
                  <span>${escapeHtml(effect.name)}</span>
                  <small>${ui(effect.active
                    ? "skillModularizationEffectActive"
                    : "skillModularizationEffectInactive")}</small>
                </div>
                <p>${escapeHtml(effect.sourceText).replaceAll("\n", "<br />")}</p>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}
      <p>${ui("skillModularizationCalculationNotice")}</p>
    </section>
  `;
}

function renderSkillRuntimeSpiritHost(model, slot, skill) {
  if (skill?.irisSpiritActive === true) {
    return `
      <section class="skill-runtime-spirit-host is-direct" data-role="iris-spirit-direct-active">
        <strong>${ui("skillSpiritDirectActive")}</strong>
        <span>${ui("skillSpiritDirectActiveHint")}</span>
      </section>
    `;
  }
  if (!slot?.spiritHost?.skillId) return "";
  const host = findSkillRuntimeRecord(model, slot.spiritHost.skillId);
  if (!host) return "";
  const display = skillRuntimeDisplay(host);
  return `
    <section class="skill-runtime-spirit-host ${slot.spiritHost.shared ? "is-shared" : ""}" data-role="iris-spirit-host" data-host-skill-id="${escapeHtml(host.id)}">
      <strong>${ui("skillSpiritHost")}</strong>
      <span>${escapeHtml(display.name)}</span>
      <small>${ui(slot.spiritHost.shared ? "skillSpiritHostSharedHint" : "skillSpiritHostHint")}</small>
    </section>
  `;
}

function renderSkillEditor() {
  if (state.skillRuntime.status === "idle" || state.skillRuntime.status === "loading") {
    return `<div class="modal-backdrop" data-action="close-overlay"></div><section class="skill-editor-modal skill-runtime-status" role="dialog" aria-modal="true" aria-label="${ui("skillEditor")}"><span class="hero-trait-spinner" aria-hidden="true"></span><strong>${ui("skillRuntimeLoading")}</strong></section>`;
  }
  if (state.skillRuntime.status === "error") {
    return `<div class="modal-backdrop" data-action="close-overlay"></div><section class="skill-editor-modal skill-runtime-status is-error" role="dialog" aria-modal="true" aria-label="${ui("skillEditor")}"><strong>${ui("skillRuntimeLoadFailed")}</strong><button data-action="skill-runtime-retry">${ui("heroTraitRetry")}</button><button data-action="close-overlay">${ui("cancel")}</button></section>`;
  }

  const model = state.skillRuntime.model;
  const skills = normalizeCurrentSkillRuntimeState(model);
  const energy = getSkillEnergyUsage(skills);
  const seals = getSkillSealUsage(model, skills);
  const calculatedSealedMana = state.isStale
    ? null
    : state.lastCalculation?.summary?.sealedManaPercent;
  const rows = [
    ...skills.active.map((slot, rowIndex) => ({ kind: "active", rowIndex, slot, label: rowIndex === 0 ? ui("skillCore") : ui("skillActiveNumber", { index: rowIndex + 1 }) })),
    ...skills.passive.map((slot, rowIndex) => ({ kind: "passive", rowIndex, slot, label: ui("skillPassiveNumber", { index: rowIndex + 1 }) })),
  ];

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="skill-editor-modal skill-runtime-editor" role="dialog" aria-modal="true" aria-label="${ui("skillEditor")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <header class="skill-runtime-title"><div><h2>${ui("skillEditor")}</h2><p>${ui("skillEditorHint")}</p></div><div class="skill-energy ${energy.over ? "is-over" : ""}"><small>${ui("skillEnergy")}</small><strong>${energy.used}/${energy.maximum}</strong><span>${ui("skillEnergyRemaining", { value: energy.remaining })}</span></div></header>
      <div class="skill-runtime-layout ${state.skillPicker ? "has-picker" : ""}">
        <nav class="ingame-editor-skill-rail" aria-label="편집할 스킬">
          ${rows.map(({ kind, rowIndex, slot, label }, index) => {
            const source = getExternalMainSkillOverride(model, state.build, kind, rowIndex)?.skill ?? findSkillRuntimeRecord(model, slot.skillId);
            const display = skillRuntimeDisplay(source);
            const activeIndex = state.skillPicker ? state.skillPicker.rowIndex + (state.skillPicker.kind === "passive" ? 5 : 0) : state.activeSkillRow;
            return `<button type="button" data-action="skill-editor-row" data-row-index="${index}" aria-pressed="${index === activeIndex}" aria-label="${escapeHtml(`${label} 편집`)}">${source ? renderItemIcon({ iconUrl: display.iconUrl }, "skill-runtime-icon") : "+"}<span>${escapeHtml(source ? display.name : label)}</span></button>`;
          }).join("")}
        </nav>
        <div class="skill-runtime-content">
          <div class="skill-runtime-costs"><span>${ui("skillMain")}</span>${SUPPORT_SLOT_ENERGY_COSTS.map((cost) => `<span>+${cost}</span>`).join("")}<span>${ui("skillUnlockedSupports")}</span></div>
          <div class="skill-runtime-rows">
            ${rows.map(({ kind, rowIndex, slot, label }, index) => {
              const externalMain = getExternalMainSkillOverride(model, state.build, kind, rowIndex);
              const skill = externalMain?.skill ?? findSkillRuntimeRecord(model, slot.skillId);
              const display = skillRuntimeDisplay(skill);
              const mainLevel = externalMain?.level ?? slot.level;
              const mainLabel = skill
                ? `${display.name} · ${ui("levelValue", { value: mainLevel })}`
                : label;
              const mainAriaLabel = `${label}: ${skill ? mainLabel : ui("openSkill")}`;
              const pickerActive = state.skillPicker?.kind === kind && state.skillPicker?.rowIndex === rowIndex;
              const activeIndex = state.skillPicker ? state.skillPicker.rowIndex + (state.skillPicker.kind === "passive" ? 5 : 0) : state.activeSkillRow;
              const mainControl = externalMain
                ? `<div class="skill-runtime-main is-filled is-external" title="${escapeHtml(mainLabel)}" aria-label="${escapeHtml(mainAriaLabel)}">${renderItemIcon({ iconUrl: display.iconUrl }, "skill-runtime-icon")}<small>${escapeHtml(mainLabel)}</small></div>`
                : `<button class="skill-runtime-main ${skill ? "is-filled" : ""}" data-action="skill-runtime-main-picker" data-kind="${kind}" data-row-index="${rowIndex}" aria-pressed="${pickerActive && state.skillPicker.supportIndex === null}" title="${escapeHtml(display.name || ui("openSkill"))}" aria-label="${escapeHtml(mainAriaLabel)}">${skill ? renderItemIcon({ iconUrl: display.iconUrl }, "skill-runtime-icon") : "+"}<small>${escapeHtml(mainLabel)}</small></button>`;
              return `
                <article class="skill-runtime-row" data-kind="${kind}" data-row-index="${rowIndex}" data-picker-active="${pickerActive}" ${index === activeIndex ? "" : "hidden"}>
                  ${skillOrbitOrnament}
                  <svg class="skill-link-lines" viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden="true"><path class="skill-link-perimeter" d="M300 40 L60 170 L60 430 L300 560 L540 430 L540 170 Z"/></svg>
                  <strong class="skill-runtime-row-label">${escapeHtml(label)}</strong>
                  ${mainControl}
                  ${slot.supports.map((supportSlot, supportIndex) => {
                    const support = findSupportRuntimeRecord(model, supportSlot?.supportId);
                    const supportDisplay = skillRuntimeDisplay(support);
                    const supportSummary = skillSupportConfigurationSummary(supportSlot);
                    const unlocked = supportIndex < slot.unlockedSupportCount;
                    if (!unlocked) return `<div class="skill-runtime-support-wrap" data-support-position="${supportIndex}"><span class="skill-runtime-support is-locked" aria-hidden="true">╱</span></div>`;
                    const supportName = support ? supportDisplay.name : ui("openSupport", { index: supportIndex + 1 });
                    const supportAriaLabel = `${label}: ${supportName}${support ? ` · ${supportSummary}` : ""}`;
                    return `<div class="skill-runtime-support-wrap" data-support-position="${supportIndex}"><button class="skill-runtime-support ${support ? "is-filled" : ""}" data-action="skill-runtime-support-picker" data-kind="${kind}" data-row-index="${rowIndex}" data-support-index="${supportIndex}" aria-pressed="${pickerActive && state.skillPicker.supportIndex === supportIndex}" title="${escapeHtml(support ? `${supportDisplay.name} · ${supportSummary}` : supportName)}" aria-label="${escapeHtml(supportAriaLabel)}">${support ? renderItemIcon({ iconUrl: supportDisplay.iconUrl }, "skill-runtime-icon") : "+"}${support ? `<span>${escapeHtml(supportSummary)}</span><small>${escapeHtml(supportDisplay.name)}</small>` : ""}</button>${support ? `<button class="skill-runtime-remove-support" data-action="skill-runtime-support-remove" data-kind="${kind}" data-row-index="${rowIndex}" data-support-index="${supportIndex}" aria-label="${escapeHtml(ui("removeItem", { name: supportDisplay.name }))}">×</button>` : ""}</div>`;
                  }).join("")}
                  <div class="skill-runtime-unlock"><button data-action="skill-runtime-unlock" data-kind="${kind}" data-row-index="${rowIndex}" data-delta="-1" ${slot.unlockedSupportCount <= (kind === "passive" ? 0 : 1) ? "disabled" : ""} aria-label="${escapeHtml(`${label}: ${ui("skillUnlockDecrease")}`)}">−</button><strong>${slot.unlockedSupportCount}/5</strong><button data-action="skill-runtime-unlock" data-kind="${kind}" data-row-index="${rowIndex}" data-delta="1" ${slot.unlockedSupportCount >= 5 ? "disabled" : ""} aria-label="${escapeHtml(`${label}: ${ui("skillUnlockIncrease")}`)}">+</button></div>
                  ${slot.skillId && !externalMain ? `<button class="skill-runtime-remove-main" data-action="skill-runtime-main-remove" data-kind="${kind}" data-row-index="${rowIndex}" aria-label="${escapeHtml(ui("removeItem", { name: display.name }))}">×</button>` : ""}
                  ${renderSkillRuntimeSpiritHost(model, slot, skill)}
                  ${renderSkillRuntimeModularizationConfig(model, slot, kind, rowIndex)}
                </article>
              `;
            }).join("")}
          </div>
          <details class="ingame-skill-extra"><summary>${calculationCopy("영약 · 추가 설정 · 스킬 출처", "Elixirs, additional settings and skill sources")}</summary>${renderExternalSkillEvidence(getExternalMainSkillOverride(model, state.build, "active", 0))}${renderSkillRuntimeElixirs(model, skills)}${renderHostIndependentSupportSettings(model)}</details>
        </div>
        ${renderSkillRuntimePicker(model, skills)}
      </div>
      <footer class="skill-editor-footer skill-runtime-footer"><p class="calculation-limit-notice" data-role="seal-calculation-status" role="note">${calculationCopy("봉인된 MP는 SS13 원문과 보정 공식을 계산 패널에 반영합니다. 봉인된 HP 전환과 미해석 조건은 미지원으로 표시합니다.", "Sealed Mana uses the SS13 source values and compensation formula in the calculation panel. Life conversion and unresolved conditions remain unsupported.")}</p><div><span>${ui("sealedLife")}</span><strong>${seals.sealedLifePercent.toFixed(2)}%</strong></div><div><span>${ui("sealedMana")}</span><strong>${Number.isFinite(calculatedSealedMana) ? Number(calculatedSealedMana).toFixed(2) : seals.sealedManaPercent.toFixed(2)}%</strong></div><button data-action="skill-reset">${ui("skillReset")}</button></footer>
    </section>
  `;
}

function renderSelectorOverlay(type) {
  const categoryId = type === "supports" ? "supports" : type;
  const category = getCategory(categoryId);
  const title = category ? categoryText(category).label : ui(type);
  const page = category ? getVisibleItems(categoryId) : paginateItems([], state.catalogLimit);
  const items = page.items;

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${escapeHtml(title)}</h2>
      <div class="search-line">
        <input type="search" id="searchInput" value="${escapeHtml(state.query)}" placeholder="${ui("searchPlaceholder")}" aria-label="${ui("searchPlaceholder")}" autocomplete="off" />
        <span>⌕</span>
      </div>
      <div class="selector-layout">
        <div class="selector-list">
          ${renderCatalogRows(page, category)}
        </div>
        ${renderItemDetail(categoryId, items)}
      </div>
    </section>
  `;
}

function renderSavesOverlay() {
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal saves-modal" role="dialog" aria-modal="true" aria-label="${ui("savedBuilds")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("savedBuilds")}</h2>
      <p class="saved-build-help">${ui("savedBuildStorageHint")}</p>
      <div class="saved-build-current">
        <span>${ui("compareCurrentBuild")}</span>
        <strong>${escapeHtml(state.build.name || ui("untitledBuild"))}</strong>
      </div>
      <div class="saved-build-tools">
        <button type="button" data-action="save">${calculationCopy("현재 빌드 저장", "Save current build")}</button>
        <button type="button" data-action="open-save-as">${ui("saveAs")}</button>
        <button type="button" data-action="import">${ui("importBd")}</button>
        <button type="button" data-action="export">${ui("exportBd")}</button>
      </div>
      <p class="saved-build-help">${ui("savedBuildActionHint")}</p>
      ${renderSavedBuildList()}
    </section>
  `;
}

const IMPORT_SECTION_LABEL_KEYS = Object.freeze({
  character: "importSectionCharacter",
  hero: "importSectionHero",
  pactspirits: "importSectionPactSpirits",
  skills: "skills",
  gear: "gear",
  talents: "talents",
  divinity: "slates",
  pact: "spiritsAndDestiny",
  conditions: "importSectionConditions",
  selections: "importSectionSelections",
  research: "research",
  calculation: "calculation",
  custom: "customAffixes",
  customAffixes: "customAffixes",
  patchSnapshot: "importSectionPatch",
  updatedAt: "importSectionMetadata",
  schemaVersion: "importSectionFormat",
  validationContext: "importSectionValidation",
  document: "importSectionDocument",
  build: "importSectionBuild",
});

function importSectionLabel(section) {
  const root = String(section ?? "document").split(".")[0].split("[")[0] || "document";
  return ui(IMPORT_SECTION_LABEL_KEYS[root] ?? "importSectionDocument");
}

function importIssueMessage(issue) {
  const code = String(issue?.code ?? "");
  const section = importSectionLabel(issue?.path);
  if (code === "validation-context-unavailable") return ui("importIssueValidationUnavailable");
  if (code.includes("unsupported")) return ui("importIssueUnsupportedSection", { section });
  return ui("importIssueInvalidSection", { section });
}

function renderImportReportOverlay() {
  const report = state.importReport;
  if (!report) return "";
  const mappedSections = [...new Set(report.mappedSections ?? [])];
  const preservedSections = [...new Set(report.preservedSections ?? [])];
  const issueMessages = [...new Set((report.issues ?? []).map(importIssueMessage))];
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal import-report-modal" role="dialog" aria-modal="true" aria-label="${ui("importReportTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("importReportTitle")}</h2>
      <div class="import-report-body" role="region" aria-label="${ui("importReportTitle")}" tabindex="0">
      <p class="import-report-status ${report.ok ? "is-success" : "is-error"}" role="status" aria-live="${report.ok ? "polite" : "assertive"}">${ui(report.messageKey)}</p>
      ${report.ok && mappedSections.length ? `
        <section>
          <h3>${ui("importMappedSections")}</h3>
          <ul>${mappedSections.map((section) => `<li>${escapeHtml(importSectionLabel(section))}</li>`).join("")}</ul>
        </section>
      ` : ""}
      ${report.ok && preservedSections.length ? `
        <section>
          <h3>${ui("importPreservedSections")}</h3>
          <ul>${preservedSections.map((section) => `<li>${escapeHtml(importSectionLabel(section))}</li>`).join("")}</ul>
        </section>
      ` : ""}
      ${report.ok && report.sourceFormat === "91tob-bd_document_v1" ? `<p class="import-report-hint">${ui("import91TobAppliedScopeHint")}</p>` : ""}
      ${!report.ok ? `
        <section>
          <h3>${ui("importBlockedSections")}</h3>
          ${issueMessages.length
            ? `<ul>${issueMessages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>`
            : `<p>${ui("importIssueUnknown")}</p>`}
        </section>
        <p class="import-report-hint">${ui("importCurrentBuildUnchanged")}</p>
      ` : ""}
      </div>
    </section>
  `;
}

function export91TobIssueMessage(issue) {
  const code = String(issue?.code ?? "");
  const section = importSectionLabel(issue?.path);
  if (code === "validation-context-unavailable") return ui("export91TobValidationUnavailable");
  if (code.includes("unsupported")) return ui("export91TobIssueUnsupported", { section });
  return ui("export91TobIssueInvalid", { section });
}

function render91TobExportReportOverlay() {
  const report = state.export91TobReport;
  if (!report) return "";
  const exportedSections = [...new Set(report.exportedSections ?? [])];
  const issueMessages = [...new Set((report.issues ?? []).map(export91TobIssueMessage))];
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal import-report-modal" role="dialog" aria-modal="true" aria-label="${ui("export91TobReportTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("export91TobReportTitle")}</h2>
      <div class="import-report-body" role="region" aria-label="${ui("export91TobReportTitle")}" tabindex="0">
      <p class="import-report-status ${report.ok ? "is-success" : "is-error"}" role="status" aria-live="${report.ok ? "polite" : "assertive"}">${ui(report.messageKey)}</p>
      ${report.ok && exportedSections.length ? `
        <section>
          <h3>${ui("export91TobExportedSections")}</h3>
          <ul>${exportedSections.map((section) => `<li>${escapeHtml(importSectionLabel(section))}</li>`).join("")}</ul>
        </section>
        <p class="import-report-hint">${ui("export91TobScopeHint")}</p>
      ` : ""}
      ${!report.ok ? `
        <section>
          <h3>${ui("export91TobBlockedSections")}</h3>
          ${issueMessages.length
            ? `<ul>${issueMessages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>`
            : `<p>${ui("export91TobIssueUnknown")}</p>`}
        </section>
        <p class="import-report-hint">${ui("export91TobNotDownloaded")}</p>
      ` : ""}
      </div>
    </section>
  `;
}

function comparisonStatValue(calc, statKey) {
  return calc.summary?.[statKey]
    ?? calc.deltas?.[statKey]
    ?? calc.traces?.[statKey]?.finalValue
    ?? 0;
}

function renderBuildCompareOverlay() {
  const saved = state.savedBuilds.find((build) => build.id === state.overlay?.buildId);
  if (!saved) return renderSavesOverlay();
  const currentCalc = calculateBuild(state.build);
  const savedCalc = calculateBuild(saved);
  const patchMismatch = currentCalc.provenance.summary.patchMismatch
    || savedCalc.provenance.summary.patchMismatch;
  const savedResearch = saved.research ?? { season: "", sources: [], notes: "" };
  const savedResearchLinks = (Array.isArray(savedResearch.sources) ? savedResearch.sources : [])
    .map((source) => [source, safeHttpUrl(source)])
    .filter(([, href]) => href);
  const hasSavedResearch = Boolean(
    savedResearch.season || savedResearch.notes || savedResearchLinks.length,
  );
  const seen = new Set();
  const rows = [currentCalc, savedCalc]
    .flatMap((calc) => getCalculatedStatSections(calc).flatMap(({ rows: sectionRows }) => sectionRows))
    .filter(([, statKey]) => {
      if (seen.has(statKey)) return false;
      seen.add(statKey);
      return true;
    });
  const changedOnly = state.overlay?.changedOnly === true;
  const visibleRows = rows.filter(([, statKey]) => !changedOnly
    || patchMismatch
    || getPublicStatUnsupportedState(currentCalc, statKey)
    || getPublicStatUnsupportedState(savedCalc, statKey)
    || comparisonStatValue(currentCalc, statKey) !== comparisonStatValue(savedCalc, statKey));

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal build-compare-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(ui("compareBuildTitle"))}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("compareBuildTitle")}</h2>
      <div class="build-compare-targets">
        <div><span>${ui("compareCurrentBuild")}</span><strong>${escapeHtml(state.build.name || ui("untitledBuild"))}</strong></div>
        <div><span>${ui("compareSavedBuild")}</span><strong>${escapeHtml(saved.name || ui("untitledBuild"))}</strong></div>
      </div>
      <div class="build-compare-tools">
        <button type="button" data-action="compare-back">${ui("compareBackToList")}</button>
        <div role="group" aria-label="${ui("compareFilterLabel")}">
          <button type="button" data-action="compare-filter" data-filter="all" aria-pressed="${!changedOnly}">${ui("compareAllStats")}</button>
          <button type="button" data-action="compare-filter" data-filter="changed" aria-pressed="${changedOnly}">${ui("compareChangedStats")}</button>
        </div>
      </div>
      <p class="build-compare-hint">${ui("compareDirectionHint")}${changedOnly ? ` ${ui("compareUnsupportedHint")}` : ""}</p>
      ${patchMismatch ? `<p class="calculation-limit-notice" data-role="compare-patch-mismatch" role="alert">${ui("savedBuildPatchMismatch")}</p>` : ""}
      <div class="build-compare-rows">
      <div class="build-compare-heading">
        <span>${ui("compareStat")}</span>
        <strong>${ui("compareCurrentBuild")}</strong>
        <strong>${ui("compareSavedBuild")}</strong>
        <strong>${ui("compareDifference")}</strong>
      </div>
        ${visibleRows.map(([labelKey, statKey, suffix, explicitLabel]) => {
          const currentUnsupported = getPublicStatUnsupportedState(currentCalc, statKey);
          const savedUnsupported = getPublicStatUnsupportedState(savedCalc, statKey);
          const currentValue = comparisonStatValue(currentCalc, statKey);
          const savedValue = comparisonStatValue(savedCalc, statKey);
          const difference = savedValue - currentValue;
          const unsupported = patchMismatch || currentUnsupported || savedUnsupported;
          return `
            <div class="build-compare-row ${unsupported ? "is-unsupported" : ""}" data-compare-stat="${escapeHtml(statKey)}" data-calculation-support="${unsupported ? "unsupported" : "supported"}">
               <span>${escapeHtml(explicitLabel ?? (labelKey ? ui(labelKey) : getStatDescriptor(statKey).label))}</span>
              <strong><small class="build-compare-value-label">${ui("compareCurrentBuild")}</small>${patchMismatch || currentUnsupported ? ui("traceUnsupported") : formatStat(currentValue, suffix)}</strong>
              <strong><small class="build-compare-value-label">${ui("compareSavedBuild")}</small>${patchMismatch || savedUnsupported ? ui("traceUnsupported") : formatStat(savedValue, suffix)}</strong>
              <strong><small class="build-compare-value-label">${ui("compareDifference")}</small>${unsupported ? ui("traceUnsupported") : `${difference > 0 ? "+" : ""}${formatStat(difference, suffix)}`}</strong>
            </div>
          `;
        }).join("")}
        ${visibleRows.length ? "" : `<p class="empty">${ui("compareNoChanges")}</p>`}
      </div>
      ${hasSavedResearch ? `
        <section class="build-compare-research" data-role="compare-saved-research" aria-label="${escapeHtml(ui("research"))}">
          <h3>${ui("research")}</h3>
          ${savedResearch.season ? `<p>${escapeHtml(savedResearch.season)}</p>` : ""}
          ${savedResearchLinks.length ? `<ul class="research-source-links">${savedResearchLinks.map(([source, href]) => `<li><a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a></li>`).join("")}</ul>` : ""}
          ${savedResearch.notes ? `<p>${escapeHtml(savedResearch.notes)}</p>` : ""}
        </section>
      ` : ""}
    </section>
  `;
}

function renderSaveAsOverlay() {
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal compact-info-modal save-as-modal" role="dialog" aria-modal="true" aria-label="${ui("saveAsTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("saveAsTitle")}</h2>
      <p>${ui("saveAsHint")}</p>
      <label class="save-as-name-field" for="saveAsName">
        <span>${ui("saveAsName")}</span>
        <input id="saveAsName" value="${escapeHtml(state.saveAsName)}" maxlength="60" autocomplete="off" />
      </label>
      <footer class="compact-info-actions">
        <button type="button" data-action="close-overlay">${ui("cancel")}</button>
        <button type="button" class="primary" data-action="confirm-save-as">${ui("saveAs")}</button>
      </footer>
    </section>
  `;
}

function hasExactKoreanName(item) {
  const record = getTlidbLocaleText(item, "ko");
  return record?.sourceFieldStatus?.name === "exact"
    && typeof record.name === "string"
    && record.name.trim().length > 0
    && !containsHanScript(record.name);
}

function exactKoreanNameCoverage(categoryIds) {
  const items = categoryIds.flatMap((categoryId) => getCatalogItems(categoryId));
  const exact = items.filter(hasExactKoreanName).length;
  return { exact, total: items.length };
}

function runtimeStatusText(runtime, readyText) {
  if (runtime?.status === "ready") return readyText;
  if (runtime?.status === "error") return ui("dataStatusLoadFailed");
  return ui("dataStatusLoading");
}

function renderDataStatusRow(title, localeText, calculationText) {
  return `
    <article class="data-status-row">
      <h3>${escapeHtml(title)}</h3>
      <dl>
        <div><dt>${ui("dataStatusLocale")}</dt><dd>${escapeHtml(localeText)}</dd></div>
        <div><dt>${ui("dataStatusCalculation")}</dt><dd>${escapeHtml(calculationText)}</dd></div>
      </dl>
    </article>
  `;
}

function renderAnnouncementOverlay() {
  const entries = [
    ["announcementHeroTitle", "announcementHeroBody"],
    ["announcementHelpTitle", "announcementHelpBody"],
    ["announcementInteropTitle", "announcementInteropBody"],
  ];

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal compact-info-modal announcement-modal" data-role="announcement-overlay" role="dialog" aria-modal="true" aria-label="${ui("announcementTitle", { season: CATALOG_METADATA.activeSeason })}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <header class="announcement-modal-header">
        <strong>${ui("announcementCurrentBadge")}</strong>
        <h2>${ui("announcementTitle", { season: CATALOG_METADATA.activeSeason })}</h2>
        <p>${ui("announcementIntro")}</p>
      </header>
      <section class="announcement-history" aria-labelledby="announcement-history-title">
        <h3 id="announcement-history-title">${ui("announcementRecentTitle")}</h3>
        <ol>
          ${entries.map(([titleKey, bodyKey]) => `
            <li class="announcement-entry">
              <time datetime="2026-08-14">${ui("announcementDate")}</time>
              <div><strong>${ui(titleKey)}</strong><p>${ui(bodyKey)}</p></div>
            </li>
          `).join("")}
        </ol>
      </section>
      <p class="announcement-unsupported-note" role="note">${ui("announcementUnsupportedNote")}</p>
      <footer class="compact-info-actions">
        <button type="button" data-action="close-overlay">${ui("close")}</button>
        <button type="button" class="primary" data-action="open-data-status">${ui("announcementDataStatusAction")}</button>
      </footer>
    </section>
  `;
}

function dataStatusRuntimeSettled() {
  return [
    state.gearLocaleRuntime,
    state.heroTraitRuntime,
    state.heroMemoryRuntime,
    state.divinityRuntime,
    state.pactRuntime,
    state.talentRuntime,
    state.skillRuntime,
  ].every(({ status }) => status === "ready" || status === "error");
}

function renderDataStatusOverlay() {
  if (state.currentSeasonOpen) return `<div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal compact-info-modal" role="dialog" aria-modal="true" aria-label="SS14 자료·지원 범위">
      <button class="modal-close" data-action="close-overlay" aria-label="닫기">×</button><h2>SS14 자료·지원 범위</h2>
      <p>현재 빌드의 계산 가능 여부와 필요한 입력은 전체 DPS에서 확인할 수 있습니다.</p>
      <details><summary>데이터 수집 내역</summary><ul>${currentSeasonSources.map(row => `<li>${escapeHtml(row.label)}: ${row.collected}/${row.requested}개 · ${escapeHtml(formatAppDateTime(row.generatedAt))}</li>`).join("")}</ul>
      <p>자료 수집 개수와 계산 지원 범위는 다릅니다.</p></details>
      <a href="https://torchlight.xd.com/ss14pn/?lang=ko" target="_blank" rel="noreferrer">XD SS14 패치노트</a> · <a href="https://tlidb.com/ko/" target="_blank" rel="noreferrer">TLIDB 시즌 자료</a>
    </section>`;
  const allItems = getAllItems();
  const allExactKoreanNames = allItems.filter(hasExactKoreanName).length;
  const flatFinalization = CATALOG_METADATA.ss13FlatFinalization;
  const flatBlockers = flatFinalization.koreanLocaleBlockers ?? [];
  const mixedFieldCount = flatBlockers.reduce(
    (count, blocker) => count + (Array.isArray(blocker.fields) ? blocker.fields.length : 0),
    0,
  );
  const mixedItemCount = new Set(flatBlockers.map(({ itemId }) => itemId).filter(Boolean)).size;

  const heroLocale = exactKoreanNameCoverage(["hero"]);
  const memoryLocale = exactKoreanNameCoverage(["heroMemory"]);
  const skillLocale = exactKoreanNameCoverage(["skills", "supports"]);
  const talentLocale = exactKoreanNameCoverage(["talents"]);
  const divinityLocale = exactKoreanNameCoverage(["slates"]);
  const pactLocale = exactKoreanNameCoverage(["spirits", "destiny"]);

  const gearItems = getGearItemsForFilter("all");
  const gearItemIds = new Set(gearItems.map(({ id }) => id));
  const gearLocale = {
    exact: gearItems.filter(hasExactKoreanName).length,
    total: gearItems.length,
  };
  const gearStructuredCount = gearItems.filter((item) => (
    item.craftRuntimeSupport !== "display-only"
  )).length;
  const gearCalculationItems = CURRENT_GEAR_CALCULATION_AUDIT.items.filter(
    ({ itemId }) => gearItemIds.has(itemId),
  );
  const gearCalculationSummary = {
    ...CURRENT_GEAR_CALCULATION_AUDIT.summary,
    total: gearCalculationItems.length,
    complete: gearCalculationItems.filter(({ supportLevel }) => supportLevel === "complete").length,
    partial: gearCalculationItems.filter(({ supportLevel }) => supportLevel === "partial").length,
    unsupported: gearCalculationItems.filter(({ supportLevel }) => (
      supportLevel === "unsupported"
    )).length,
  };
  const skillItems = [...getCatalogItems("skills"), ...getCatalogItems("supports")];
  const parsedAuthoritySkills = getCatalogItems("skills").filter(
    hasTlidbParsedCalculationAuthority,
  ).length;
  const supportItems = getCatalogItems("supports");
  const standardAuthoritySupports = supportItems.filter(
    hasTlidbParsedCalculationAuthority,
  ).length;
  const modularizationAuthoritySupports = supportItems.filter((item) => (
    !hasTlidbParsedCalculationAuthority(item)
    && hasTlidbModularizationCalculationAuthority(item.id)
  )).length;
  const parsedAuthoritySupports = standardAuthoritySupports + modularizationAuthoritySupports;
  const parsedAuthorityCount = parsedAuthoritySkills + parsedAuthoritySupports;
  const skillCompleteCount = 0;
  const skillPartialCount = parsedAuthorityCount;
  const skillUnsupportedCount = skillItems.length - skillCompleteCount - skillPartialCount;
  const skillSettingRecords = state.skillRuntime.model?.allSupports ?? [];
  const skillSettingFieldCount = (record) => (
    (record?.editorConfig?.clauses?.length ?? 0)
    + (record?.editorConfig?.numeric_controls?.length ?? 0)
  );
  const skillSettingFields = skillSettingRecords.reduce(
    (count, record) => count + skillSettingFieldCount(record),
    0,
  );
  const skillReadOnlyFields = state.skillRuntime.status === "ready"
    ? getHostIndependentSupportRuntimeRecords(state.skillRuntime.model).reduce(
      (count, record) => count + skillSettingFieldCount(record),
      0,
    )
    : 0;
  const gearCraftRuntime = state.gearLocaleRuntime.registry?.metadata?.craftRuntime;
  const nightmareDisplayCount = gearCraftRuntime?.displayedNightmareAffixes ?? 0;
  const nightmareSourceCount = gearCraftRuntime?.isolatedAffixDirectValueAuthorityUnverified ?? 0;
  const memoryReport = state.heroMemoryRuntime.dataset?.activeHeroMemoryReport;
  const divinitySourceOnlyCount = state.divinityRuntime.sourceOnlyCatalog?.length ?? 0;
  const divinityMappedCount = ACTIVE_DIVINITY_MODEL.metadata.counts.mappedStructuralItems;
  const pactAuthority = state.pactRuntime.model?.activeAuthority;
  const pactValueAuthority = pactAuthority?.valueAuthority;
  const otherTooltipAudit = accountTlidbOtherTooltipCatalog({
    talents: getCatalogItems("talents"),
    slates: getCatalogItems("slates"),
    spirits: getCatalogItems("spirits"),
    destiny: getCatalogItems("destiny"),
  });
  const talentTooltipAudit = otherTooltipAudit.categories.talents;
  const divinityTooltipAudit = otherTooltipAudit.categories.slates;
  const spiritTooltipAudit = otherTooltipAudit.categories.spirits;
  const destinyTooltipAudit = otherTooltipAudit.categories.destiny;

  const rows = [
    renderDataStatusRow(
      ui("hero"),
      ui("dataStatusExactKoNames", {
        exact: formatNumber(heroLocale.exact),
        total: formatNumber(heroLocale.total),
      }),
      runtimeStatusText(
        state.heroTraitRuntime,
        ui("dataStatusHeroCalculation"),
      ),
    ),
    renderDataStatusRow(
      ui("heroMemory"),
      state.heroMemoryRuntime.status === "ready"
        ? ui("dataStatusHeroMemoryLocale", {
            display: formatNumber(
              (memoryReport?.localeRefs?.directExactKoreanRefs ?? 0)
              + (memoryReport?.localeRefs?.semanticTemplateKoreanRefs ?? 0),
            ),
            direct: formatNumber(memoryReport?.localeRefs?.directExactKoreanRefs ?? memoryLocale.exact),
            semantic: formatNumber(memoryReport?.localeRefs?.semanticTemplateKoreanRefs ?? 0),
            total: formatNumber(memoryReport?.localeRefs?.total ?? memoryLocale.total),
            unavailable: formatNumber(memoryReport?.localeRefs?.koreanUnavailableRefs ?? 0),
          })
        : runtimeStatusText(state.heroMemoryRuntime, ""),
      runtimeStatusText(
        state.heroMemoryRuntime,
        ui("dataStatusHeroMemoryCalculation", {
          currentConflicts: formatNumber(
            memoryReport?.sourceConflictAudit?.currentSourceConflictCount ?? 0,
          ),
          supersededMarkers: formatNumber(
            memoryReport?.sourceConflictAudit?.supersededFlatConflictMarkerCount ?? 0,
          ),
          numericUnverified: formatNumber(
            memoryReport?.numericAuthority?.semanticTemplateUnverifiedRefs ?? 0,
          ),
          calculationConflicts: formatNumber(
            memoryReport?.numericAuthority?.directTextCalculationConflictRefs ?? 0,
          ),
          selectionWeightConflicts: formatNumber(
            memoryReport?.numericAuthority?.selectionWeightConflictRefs ?? 0,
          ),
        }),
      ),
    ),
    renderDataStatusRow(
      ui("skills"),
      state.skillRuntime.status === "ready"
        ? ui("dataStatusSkillLocale", {
            exact: formatNumber(skillLocale.exact),
            total: formatNumber(skillLocale.total),
            fields: formatNumber(skillSettingFields),
            linked: formatNumber(skillSettingFields - skillReadOnlyFields),
            readOnly: formatNumber(skillReadOnlyFields),
          })
        : ui("dataStatusExactKoNames", {
            exact: formatNumber(skillLocale.exact),
            total: formatNumber(skillLocale.total),
          }),
      runtimeStatusText(
        state.skillRuntime,
        ui("dataStatusSkillCalculation", {
          profileSupported: formatNumber(parsedAuthorityCount),
          profileSkills: formatNumber(parsedAuthoritySkills),
          standardSupports: formatNumber(standardAuthoritySupports),
          modularizationSupports: formatNumber(modularizationAuthoritySupports),
          partial: formatNumber(skillPartialCount),
          complete: formatNumber(skillCompleteCount),
          unsupported: formatNumber(skillUnsupportedCount),
          total: formatNumber(skillItems.length),
        }),
      ),
    ),
    renderDataStatusRow(
      ui("gear"),
      state.gearLocaleRuntime.status === "ready"
        ? ui("dataStatusGearLocale", {
            exact: formatNumber(gearLocale.exact),
            total: formatNumber(gearLocale.total),
            nightmareDisplay: formatNumber(nightmareDisplayCount),
            nightmareTotal: formatNumber(nightmareSourceCount),
          })
        : ui("dataStatusExactKoNames", {
            exact: formatNumber(gearLocale.exact),
            total: formatNumber(gearLocale.total),
          }),
      runtimeStatusText(
        state.gearLocaleRuntime,
        ui("dataStatusGearCalculation", {
          structured: formatNumber(gearStructuredCount),
          partial: formatNumber(gearCalculationSummary.partial),
          complete: formatNumber(gearCalculationSummary.complete),
          unsupported: formatNumber(gearCalculationSummary.unsupported),
          fields: formatNumber(gearCalculationSummary.authorizedFields),
          craftFields: formatNumber(gearCalculationSummary.authorizedCraftFields),
          legendaryFields: formatNumber(gearCalculationSummary.authorizedLegendaryFields),
          total: formatNumber(gearCalculationSummary.total),
        }),
      ),
    ),
    renderDataStatusRow(
      ui("talents"),
      ui("dataStatusExactKoNames", {
        exact: formatNumber(talentLocale.exact),
        total: formatNumber(talentLocale.total),
      }),
      runtimeStatusText(
        state.talentRuntime,
        ui("dataStatusTalentCalculation", {
          supported: formatNumber(
            SS13_TALENT_VALUE_AUTHORITY_AUDIT.verifiedDirectStatItems,
          ),
          selectable: formatNumber(
            SS13_TALENT_VALUE_AUTHORITY_AUDIT.topologySelectableEffectItems,
          ),
          treeHeadings: formatNumber(SS13_TALENT_VALUE_AUTHORITY_AUDIT.treeHeadings),
          nodes: formatNumber(SS13_TALENT_VALUE_AUTHORITY_AUDIT.positionedNodes),
          cores: formatNumber(SS13_TALENT_VALUE_AUTHORITY_AUDIT.runtimeCoreTalents),
          sourceOnly: formatNumber(SS13_TALENT_VALUE_AUTHORITY_AUDIT.sourceOnlyEffectItems),
          total: formatNumber(SS13_TALENT_VALUE_AUTHORITY_AUDIT.flatCatalogTotal),
          unverifiedNodes: formatNumber(
            SS13_TALENT_VALUE_AUTHORITY_AUDIT.unverifiedPositionedNodes,
          ),
          unverifiedCores: formatNumber(
            SS13_TALENT_VALUE_AUTHORITY_AUDIT.unverifiedRuntimeCoreTalents,
          ),
          parsed: formatNumber(talentTooltipAudit.parsedRows),
          partial: formatNumber(talentTooltipAudit.partialRows),
          blocked: formatNumber(talentTooltipAudit.blockedRows),
          effects: formatNumber(talentTooltipAudit.effectCount),
        }),
      ),
    ),
    renderDataStatusRow(
      ui("divinity"),
      ui("dataStatusExactKoNames", {
        exact: formatNumber(divinityLocale.exact),
        total: formatNumber(divinityLocale.total),
      }),
      runtimeStatusText(
        state.divinityRuntime,
        ui("dataStatusDivinityCalculation", {
          unsupported: formatNumber(divinitySourceOnlyCount),
          mapped: formatNumber(divinityMappedCount),
          total: formatNumber(divinityLocale.total),
          parsed: formatNumber(divinityTooltipAudit.parsedRows),
          partial: formatNumber(divinityTooltipAudit.partialRows),
          blocked: formatNumber(divinityTooltipAudit.blockedRows),
          effects: formatNumber(divinityTooltipAudit.effectCount),
        }),
      ),
    ),
    renderDataStatusRow(
      ui("pact"),
      ui("dataStatusExactKoNames", {
        exact: formatNumber(pactLocale.exact),
        total: formatNumber(pactLocale.total),
      }),
      runtimeStatusText(
        state.pactRuntime,
        ui("dataStatusPactCalculation", {
          structuredSpirits: formatNumber(pactAuthority?.structuredSpirits ?? 0),
          spiritTotal: formatNumber(pactValueAuthority?.denominator?.spirits ?? 0),
          structuredDestinies: formatNumber(pactAuthority?.structuredDestinies ?? 0),
          destinyTotal: formatNumber(pactValueAuthority?.denominator?.destinies ?? 0),
          spiritParsed: formatNumber(spiritTooltipAudit.parsedRows),
          spiritPartial: formatNumber(spiritTooltipAudit.partialRows),
          spiritBlocked: formatNumber(spiritTooltipAudit.blockedRows),
          destinyParsed: formatNumber(destinyTooltipAudit.parsedRows),
          destinyPartial: formatNumber(destinyTooltipAudit.partialRows),
          destinyBlocked: formatNumber(destinyTooltipAudit.blockedRows),
        }),
      ),
    ),
  ];

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal compact-info-modal data-status-modal" data-role="data-status-overlay" role="dialog" aria-modal="true" aria-label="${ui("dataStatusTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <header>
        <h2>${ui("dataStatusTitle")}</h2>
        <strong>${ui("dataStatusCurrentSeason", { season: CATALOG_METADATA.activeSeason })}</strong>
        <p>${ui("dataStatusIncompleteNotice")}</p>
      </header>
      <section class="flat-locale-status">
        <h3>${ui("dataStatusFlatCatalog")}</h3>
        <p>${ui("dataStatusFlatLocale", {
          exact: formatNumber(allExactKoreanNames),
          total: formatNumber(allItems.length),
          mixedItems: formatNumber(mixedItemCount),
          mixedFields: formatNumber(mixedFieldCount),
        })}</p>
      </section>
      <section class="flat-locale-status" data-build-interop-status="partial">
        <h3>${ui("dataStatusBuildInterop")}</h3>
        <p>${ui("dataStatusBuildInteropPartial")}</p>
      </section>
      <div class="data-status-grid" ${dataStatusRuntimeSettled() ? 'data-role="data-status-runtime-ready"' : ""}>
        ${rows.join("")}
      </div>
    </section>
  `;
}

function renderHelpOverlay() {
  if (state.currentSeasonOpen) return `<div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal compact-info-modal" role="dialog" aria-modal="true" aria-label="SS14 빌드 도움말">
      <button class="modal-close" data-action="close-overlay" aria-label="닫기">×</button><h2>SS14 빌드 도움말</h2>
      <ol><li>계산 조건에서 스킬·장비·특성과 전투 조건을 선택하세요.</li><li>입력을 바꾼 뒤 다시 계산하면 전체 DPS가 갱신됩니다. 미지원이면 필요한 입력·효과 목록을 확인하세요.</li><li>변경 저장으로 보관하고, 입력 복원으로 마지막 저장 상태를 불러옵니다.</li></ol>
      <p>원래 빌드는 별도로 보존됩니다. 계산 내역과 출처는 세부 수치·계산 근거에서 확인하세요.</p>
    </section>`;
  const tlidbHelpCount = resolveTlidbHelpView({ locale: state.locale }).totalCount;
  const topics = [
    ["helpSelectTitle", "helpSelectBody"],
    ["helpEditTitle", "helpEditBody"],
    ["helpInteropTitle", "helpInteropBody"],
    ["helpSaveTitle", "helpSaveBody"],
    ["helpCalculateTitle", "helpCalculateBody"],
    ["helpLocaleTitle", "helpLocaleBody"],
    ["helpResetTitle", "helpResetBody"],
  ];
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal compact-info-modal help-modal" data-role="help-overlay" role="dialog" aria-modal="true" aria-label="${ui("helpTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("helpTitle")}</h2>
      <p>${ui("helpIntro")}</p>
      <ol class="help-steps">
        ${topics.map(([titleKey, bodyKey]) => `
          <li class="help-topic"><strong>${ui(titleKey)}</strong><span>${ui(bodyKey)}</span></li>
        `).join("")}
      </ol>
      <p class="help-unsupported-note" role="note">${ui("helpUnsupportedNote")}</p>
      <p class="help-local-note">${ui("helpLocalNote")}</p>
      <button type="button" class="primary" data-action="open-tlidb-help">${ui("tlidbHelpOpen", { count: tlidbHelpCount })}</button>
    </section>
  `;
}

function renderTlidbHelpOverlay() {
  const view = resolveTlidbHelpView({
    locale: state.locale,
    query: state.overlay?.query,
    selectedId: state.overlay?.selectedId,
    scope: state.overlay?.scope,
  });
  const selected = view.selected;
  const titleKey = view.scope === "history" ? "tlidbHelpHistoryTitle" : "tlidbHelpTitle";
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal tlidb-help-modal" data-role="tlidb-help-overlay" role="dialog" aria-modal="true" aria-label="${ui(titleKey)}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <header class="tlidb-help-header">
        <button type="button" data-action="open-help">${ui("tlidbHelpBack")}</button>
        <div>
          <h2>${ui(titleKey)}</h2>
          <p>${ui("tlidbHelpTotal", { count: view.totalCount })}</p>
          <div role="group" aria-label="${ui("tlidbHelpScope")}">
            <button type="button" data-action="set-tlidb-help-scope" data-scope="current" aria-pressed="${view.scope === "current"}">${ui("tlidbHelpCurrent")}</button>
            <button type="button" data-action="set-tlidb-help-scope" data-scope="history" aria-pressed="${view.scope === "history"}">${ui("tlidbHelpHistoryTitle")}</button>
          </div>
          ${view.scope === "history" ? `<p role="note">${ui("tlidbHelpHistoryNotice")}</p>` : ""}
        </div>
      </header>
      <div class="tlidb-help-search">
        <input id="tlidbHelpSearch" type="search" value="${escapeHtml(state.overlay?.query ?? "")}" placeholder="${ui("tlidbHelpSearch")}" aria-label="${ui("tlidbHelpSearch")}" autocomplete="off" />
        <span role="status">${ui(view.resultCount === 1 ? "tlidbHelpResultOne" : "tlidbHelpResults", { count: view.resultCount })}</span>
      </div>
      <div class="tlidb-help-browser">
        <nav class="tlidb-help-list" aria-label="${ui("tlidbHelpList")}">
          ${view.entries.length
            ? view.entries.map((entry) => `<button type="button" data-action="select-tlidb-help" data-help-id="${escapeHtml(entry.id)}" ${entry.id === selected?.id ? 'aria-current="true"' : ""}>${escapeHtml(presentSourceGameText(entry.title, { locale: state.locale }))}</button>`).join("")
            : `<p class="tlidb-help-empty" role="status">${ui("tlidbHelpEmpty")}</p>`}
        </nav>
        ${selected ? `
          <article class="tlidb-help-detail" data-help-id="${escapeHtml(selected.id)}">
            <h3>${escapeHtml(presentSourceGameText(selected.title, { locale: state.locale }))}</h3>
            <div>${escapeHtml(presentSourceGameText(selected.body, { locale: state.locale }))}</div>
            <a href="${escapeHtml(selected.sourceUrl)}" target="_blank" rel="noreferrer">${ui("tlidbHelpSource")}</a>
          </article>
        ` : ""}
      </div>
    </section>
  `;
}

function ensureDataStatusRuntime() {
  if (dataStatusLoadPromise) return dataStatusLoadPromise;
  dataStatusLoadPromise = Promise.allSettled([
    ensureGearLocaleRegistry(),
    ensureHeroTraitModel(),
    ensureHeroMemoryDataset(),
    ensureDivinityRuntime(),
    ensurePactDestinyModel(),
    ensureTalentBoardModel(),
    ensureSkillRuntimeModel(),
  ]).finally(() => {
    dataStatusLoadPromise = null;
    if (state.overlay?.type === "dataStatus") render();
  });
  return dataStatusLoadPromise;
}

function getInventoryGearConfiguration(item, record) {
  const crafts = record?.gearCrafts && typeof record.gearCrafts === "object" ? record.gearCrafts : {};
  const activeCrafts = (item.craftAffixes ?? [])
    .map((affix, affixIndex) => ({ affix, affixIndex, config: crafts[affix.affixId] }))
    .filter(({ affix }) => Object.hasOwn(crafts, affix.affixId));
  const storedCorrodedSlots = record?.gearLegendaryDraft?.corrodedSlotIds;
  const corrodedSlotIds = Array.isArray(storedCorrodedSlots)
    ? new Set(storedCorrodedSlots)
    : new Set(
        record?.gearCorrupted
          ? (item.legendaryAffixes ?? []).map((affix) => affix.slotId)
          : [],
      );
  return {
    activeCrafts,
    corrodedSlotIds,
    corrupted: Boolean(record?.gearCorrupted || corrodedSlotIds.size),
  };
}

function renderInventoryGearConfiguration(item, record, configuration) {
  const craftRows = configuration.activeCrafts.flatMap(({ affix, affixIndex, config }) => {
    const tier = getGearCraftTier(affix, config);
    if (!tier) return [];
    const tierIndex = affix.tierOptions.indexOf(tier);
    const tierPath = gearCatalogPath(item, "craftAffixes", affixIndex, "tierOptions", tierIndex);
    const affixLabel = gearLocaleText(
      preferredGearLocaleRef(
        tier.activeLocaleAliases?.tier ?? `craft-tier:${tier.tierId}`,
        `${tierPath}/text`,
      ),
      tier.text,
    );
    const values = Object.fromEntries(
      (tier.rollDefs ?? []).map((roll) => [
        roll.key,
        Number(config?.rolls?.[roll.key] ?? roll.max ?? roll.min ?? 0),
      ]),
    );
    const exactLines = (tier.rollDefs ?? []).map((roll, rollIndex) => renderLocalizedGearText(
      preferredGearLocaleRef(
        tier.activeLocaleAliases?.rolls?.[roll.key]
          ?? `craft-roll:${tier.tierId}:${roll.key}`,
        `${tierPath}/rollDefs/${rollIndex}/label`,
      ),
      values,
      tier.text || roll.label,
    ));
    return [`
      <li>
        <strong>${escapeHtml(affixLabel)}</strong>
        <span>${escapeHtml(`${gearTierLabel(tier)} · ${[...new Set(exactLines)].join(" · ")}`)}</span>
      </li>
    `];
  });

  const legendaryRows = (item.legendaryAffixes ?? []).map((affix) => {
    const corroded = configuration.corrodedSlotIds.has(affix.slotId);
    const variantName = corroded ? "corroded" : "normal";
    const variant = corroded ? affix.corroded : affix.normal;
    const exactText = variant?.activeLocaleAlias
      ? gearLocaleText(variant.activeLocaleAlias, variant?.text ?? "")
      : presentSourceGameText(variant?.text ?? "", { locale: state.locale });
    if (!exactText) return "";
    return `<li><strong>${ui(corroded ? "corroded" : "uncorroded")}</strong><span>${escapeHtml(exactText)}</span></li>`;
  }).filter(Boolean);

  const customAffix = customAffixDisplayText(record?.gearAffix ?? "").trim();
  return `
    <details class="inventory-record-details">
      <summary>${ui("gearConfigurationDetails")}</summary>
      ${
        craftRows.length
          ? `<h4>${ui("craftAffixTiers")}</h4><ul>${craftRows.join("")}</ul>`
          : ""
      }
      ${
        legendaryRows.length
          ? `<h4>${ui("corrosionState")}</h4><ul>${legendaryRows.join("")}</ul>`
          : ""
      }
      ${
        customAffix
          ? `<h4>${ui("gearAffixEditor")}</h4><pre>${escapeHtml(customAffix)}</pre>`
          : ""
      }
      ${
        !craftRows.length && !legendaryRows.length && !customAffix
          ? `<p>${ui("noStoredGearConfiguration")}</p>`
          : ""
      }
    </details>
  `;
}

function renderGearInventoryRecords() {
  const records = state.gearInventory.filter((record) => {
    const item = findItemById(record.itemId);
    if (!item) return false;
    const text = itemText(item);
    const query = state.query.trim().toLowerCase();
    const haystack = [text.name, text.type, text.rarity, record.label, ui(slotKeyForGearIndex(record.slotIndex))]
      .join(" ")
      .toLowerCase();
    return !query || haystack.includes(query);
  });

  return records.length
    ? records
        .map((record) => {
          const item = findItemById(record.itemId);
          const text = itemText(item);
          const configuration = getInventoryGearConfiguration(item, record);
          return `
            <article class="inventory-record" data-record="${escapeHtml(record.id)}">
              ${renderItemIcon(item)}
              <div>
                <strong>${escapeHtml(text.name)}</strong>
                <small>${ui("originalSlot")}: ${ui(slotKeyForGearIndex(record.slotIndex))}</small>
                <small>${ui("craftAffixCount", { active: configuration.activeCrafts.length, total: item.craftAffixes?.length ?? 0 })} · ${ui("corrosionState")}: ${ui(configuration.corrupted ? "corroded" : "uncorroded")}</small>
                <span>${formatAppDateTime(record.updatedAt, state.locale)}</span>
              </div>
              <button data-action="apply-gear-inventory" data-record="${record.id}">${ui("equipToOriginalSlot")}</button>
              <button class="danger" data-action="delete-gear-inventory" data-record="${record.id}">${ui("delete")}</button>
              ${renderInventoryGearConfiguration(item, record, configuration)}
            </article>
          `;
        })
        .join("")
    : `<p class="empty">${ui("noGearInventory")}</p>`;
}

function getHeroMemoryInventoryEntry(record) {
  const dataset = state.heroMemoryRuntime.dataset;
  const memory = normalizeHeroMemoryInstance(record?.memory, dataset);
  const slotIndex = memory
    ? dataset?.memoryTypes?.findIndex(({ slotId }) => slotId === memory.memoryTypeId)
    : -1;
  const memoryType = slotIndex >= 0 ? dataset.memoryTypes[slotIndex] : null;
  const diagnosis = memory ? diagnoseHeroMemoryInstance(memory, dataset) : null;
  const fallbackLabel = memoryType
    ? heroMemoryTypeName(memoryType)
    : ui("heroMemoryInventoryUnavailable");
  return {
    record,
    memory,
    memoryType,
    slotIndex,
    diagnosis,
    label: safeHeroMemoryInventoryLabel(record?.label, fallbackLabel),
    valid: Boolean(memoryType && diagnosis?.valid),
  };
}

function renderHeroMemoryInventoryDetails(entry) {
  if (!entry.valid) return "";
  const preview = getHeroMemoryPreview(entry.memory, state.heroMemoryRuntime.dataset);
  const baseText = preview.baseAttributeText
    ? renderLocalizedRuntimeText(
        { localeRef: preview.baseAttributeLocaleRef },
        {},
        preview.baseAttributeText,
      )
    : "";
  const affixRows = preview.affixes.map((affix) => (
    renderLocalizedRuntimeText(affix, affix.rolls, affix.text)
  ));
  const rows = [baseText, ...affixRows].filter(Boolean);
  return `
    <details class="inventory-record-details hero-memory-inventory-details">
      <summary>${ui("heroMemoryInventoryDetails")}</summary>
      ${
        rows.length
          ? `<ul>${rows.map((text) => `<li><span>${escapeHtml(text)}</span></li>`).join("")}</ul>`
          : `<p>${ui("heroMemoryPreviewEmpty")}</p>`
      }
    </details>
  `;
}

function renderHeroMemoryInventoryRecords() {
  if (state.heroMemoryRuntime.status === "idle" || state.heroMemoryRuntime.status === "loading") {
    return `<p class="empty">${ui("heroMemoryLoading")}</p>`;
  }
  if (state.heroMemoryRuntime.status === "error") {
    return `<p class="empty">${ui("heroMemoryLoadFailed")}</p>`;
  }

  const query = state.query.trim().toLowerCase();
  const entries = state.heroMemoryInventory
    .map(getHeroMemoryInventoryEntry)
    .filter((entry) => {
      const typeName = entry.memoryType ? heroMemoryTypeName(entry.memoryType) : "";
      const haystack = [entry.label, typeName, entry.memory?.enhancement]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });

  return entries.length
    ? entries.map((entry) => {
        const item = entry.memoryType?.flatCatalogId
          ? findItemById(entry.memoryType.flatCatalogId)
          : null;
        return `
          <article class="inventory-record hero-memory-inventory-record" data-record="${escapeHtml(entry.record.id)}">
            ${item ? renderItemIcon(item) : `<span class="hero-memory-inventory-icon" aria-hidden="true">◇</span>`}
            <div>
              <strong>${escapeHtml(entry.label)}</strong>
              <small>${escapeHtml(entry.memoryType ? heroMemoryTypeName(entry.memoryType) : ui("heroMemoryInventoryUnavailable"))}</small>
              ${entry.valid ? `<small>${ui("heroMemoryInventorySlot", { level: heroMemoryStageLevel(entry.memoryType) })} · ${ui("heroMemoryEnhancementLabel", { enhancement: entry.memory.enhancement })}</small>` : ""}
              <span>${formatAppDateTime(entry.record.updatedAt, state.locale)}</span>
            </div>
            ${entry.valid ? `<button data-action="apply-hero-memory-inventory" data-record="${escapeHtml(entry.record.id)}">${ui("applyHeroMemoryInventory")}</button>` : `<button disabled>${ui("heroMemoryInventoryUnavailable")}</button>`}
            <button class="danger" data-action="delete-hero-memory-inventory" data-record="${escapeHtml(entry.record.id)}">${ui("delete")}</button>
            ${renderHeroMemoryInventoryDetails(entry)}
          </article>
        `;
      }).join("")
    : `<p class="empty">${ui("noHeroMemoryInventory")}</p>`;
}

function unifiedInventoryRecords(kind) {
  return state.unifiedInventory.filter((record) => record.kind === kind);
}

function storedInventoryTimestamp(record) {
  const timestamp = new Date(record?.updatedAt ?? "");
  return Number.isNaN(timestamp.getTime())
    ? ui("inventoryTimestampUnavailable")
    : formatAppDateTime(timestamp, state.locale);
}

function divinitySlateInventoryName(record) {
  const slate = record?.data?.slate;
  const template = getDivinitySlateTemplate(slate?.slateId);
  const sourceName = template
    ? presentCatalogGameText({
        value: template.name,
        templateId: template.id,
        field: "name",
      })
    : ui("inventoryDataUnavailable");
  return safeHeroMemoryInventoryLabel(record?.label, sourceName);
}

function renderDivinitySlateInventoryRecords() {
  const query = state.query.trim().toLowerCase();
  const records = unifiedInventoryRecords("divinitySlate").filter((record) => {
    const slate = record?.data?.slate;
    const haystack = [divinitySlateInventoryName(record), slate?.rotation, slate?.affixIds?.length]
      .join(" ")
      .toLowerCase();
    return !query || haystack.includes(query);
  });

  return records.length
    ? records.map((record) => {
        const slate = record.data.slate;
        const selectedSettingCount = (slate.affixIds?.length ?? 0)
          + Object.values(slate.slotSelectionsByKey ?? {}).filter(Boolean).length;
        const transforms = [
          ui("inventoryRotation", { degrees: Number(slate.rotation ?? 0) * 90 }),
          slate.flippedH ? ui("inventoryHorizontalFlip") : "",
          slate.flippedV ? ui("inventoryVerticalFlip") : "",
        ].filter(Boolean).join(" · ");
        return `
          <article class="inventory-record divinity-slate-inventory-record" data-record="${escapeHtml(record.id)}" data-kind="divinitySlate">
            <span class="unified-inventory-kind-icon is-slate" aria-hidden="true">◆</span>
            <div>
              <strong>${escapeHtml(divinitySlateInventoryName(record))}</strong>
              <small>${escapeHtml(transforms)}</small>
              <small>${ui("inventorySelectedSettingCount", { count: selectedSettingCount })}</small>
              <span>${escapeHtml(storedInventoryTimestamp(record))}</span>
            </div>
            <button data-action="apply-unified-inventory" data-record="${escapeHtml(record.id)}" data-kind="divinitySlate">${ui("applyDivinitySlateInventory")}</button>
            <button class="danger" data-action="delete-unified-inventory" data-record="${escapeHtml(record.id)}" data-kind="divinitySlate">${ui("delete")}</button>
          </article>
        `;
      }).join("")
    : `<p class="empty">${ui("noDivinitySlateInventory")}</p>`;
}

function prismInventoryAffixSlots(prism) {
  const fields = [
    [prism?.baseAffixModifierId, prism?.baseAffixRoll],
    [prism?.areaAffixModifierId, prism?.areaAffixRoll],
    [prism?.rareRandomAffixModifierId, prism?.rareRandomAffixRoll],
    [prism?.legendaryRandomAffixModifierId, prism?.legendaryRandomAffixRoll],
  ].filter(([modifierId]) => modifierId);
  return fields.length
    ? fields.map(([modifierId, roll]) => ({ modifierId, roll }))
    : (prism?.affixSlots ?? []).filter((slot) => slot?.modifierId);
}

function inventoryRollValue(roll) {
  if (roll === null || roll === undefined || roll === "") return "";
  if (["string", "number"].includes(typeof roll)) return String(roll);
  if (Array.isArray(roll)) return roll.map(inventoryRollValue).filter(Boolean).join("/");
  if (typeof roll === "object") {
    return Object.values(roll).map(inventoryRollValue).filter(Boolean).join("/");
  }
  return "";
}

function prismInventoryEntry(record) {
  const model = state.talentRuntime.model;
  const prism = record?.data?.prism;
  const slug = prism?.prismItemSlug ?? prism?.prismId ?? prism?.prismSlug;
  const definition = model?.prismItemBySlug?.get(slug);
  const sourceName = presentCatalogGameText({
    value: definition?.name ?? prism?.prismItemName ?? prism?.name ?? "",
    runtimeKind: "prism-item",
    runtimeId: definition?.slug ?? slug,
  });
  const label = safeHeroMemoryInventoryLabel(record?.label, sourceName);
  const affixes = prismInventoryAffixSlots(prism).map((slot) => {
    const definitionAffix = model?.prismAffixById?.get(slot.modifierId);
    return {
      text: presentCatalogGameText({
        value: definitionAffix?.text ?? "",
        runtimeKind: "prism-modifier",
        runtimeId: slot.modifierId,
      }),
      roll: inventoryRollValue(slot.roll),
    };
  });
  return { record, label, affixes };
}

function renderPrismInventoryRecords() {
  if (state.talentRuntime.status === "idle" || state.talentRuntime.status === "loading") {
    return `<p class="empty">${ui("talentDataLoading")}</p>`;
  }
  if (state.talentRuntime.status === "error" || !state.talentRuntime.model) {
    return `<p class="empty">${ui("talentDataLoadFailed")}</p>`;
  }

  const query = state.query.trim().toLowerCase();
  const entries = unifiedInventoryRecords("prism")
    .map(prismInventoryEntry)
    .filter((entry) => {
      const haystack = [entry.label, ...entry.affixes.map(({ text }) => text)].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });

  return entries.length
    ? entries.map((entry) => `
        <article class="inventory-record prism-inventory-record" data-record="${escapeHtml(entry.record.id)}" data-kind="prism">
          <span class="unified-inventory-kind-icon is-prism" aria-hidden="true">◈</span>
          <div>
            <strong>${escapeHtml(entry.label)}</strong>
            <small>${ui("inventoryAffixCount", { count: entry.affixes.length })}</small>
            <span>${escapeHtml(storedInventoryTimestamp(entry.record))}</span>
          </div>
          <button data-action="apply-unified-inventory" data-record="${escapeHtml(entry.record.id)}" data-kind="prism">${ui("applyPrismInventory")}</button>
          <button class="danger" data-action="delete-unified-inventory" data-record="${escapeHtml(entry.record.id)}" data-kind="prism">${ui("delete")}</button>
          <details class="inventory-record-details prism-inventory-details">
            <summary>${ui("prismInventoryDetails")}</summary>
            ${entry.affixes.length
              ? `<ul>${entry.affixes.map((affix) => `<li><span>${escapeHtml(affix.text)}</span>${affix.roll ? `<small>${ui("inventoryRoll", { value: affix.roll })}</small>` : ""}</li>`).join("")}</ul>`
              : `<p>${ui("noStoredPrismAffixes")}</p>`}
          </details>
        </article>
      `).join("")
    : `<p class="empty">${ui("noPrismInventory")}</p>`;
}

function storeDivinitySlateInventory(instanceId) {
  const unlabeled = createUnifiedDivinitySlateInventoryRecord(state.build, instanceId);
  if (!unlabeled) {
    showNotice(ui("inventoryDataUnavailable"));
    render();
    return;
  }
  const record = { ...unlabeled, label: divinitySlateInventoryName(unlabeled) };
  return changeInventory(() => saveUnifiedInventoryRecord(record), "savedDivinitySlateToInventory");
}

function storePrismInventory(instanceId) {
  const unlabeled = createUnifiedPrismInventoryRecord(state.build, instanceId);
  if (!unlabeled) {
    showNotice(ui("inventoryDataUnavailable"));
    render();
    return;
  }
  const record = { ...unlabeled, label: prismInventoryEntry(unlabeled).label };
  return changeInventory(() => saveUnifiedInventoryRecord(record), "savedPrismToInventory");
}

function applyUnifiedInventorySelection(record) {
  if (!record) return;
  const nextBuild = applyUnifiedInventoryRecord(state.build, record);
  if (record.kind === "divinitySlate") {
    setBuild(nextBuild, ui("appliedDivinitySlateInventory"));
    state.divinityEditorUi = {
      ...state.divinityEditorUi,
      draftBoard: null,
      selectedInstanceId: record.instanceId,
      error: "",
    };
    openOverlay("divinity");
    return;
  }
  if (record.kind === "prism") {
    setBuild(nextBuild, ui("appliedPrismInventory"));
    state.talentEditorUi = {
      ...state.talentEditorUi,
      selectedPrismInstanceId: record.instanceId,
      error: "",
    };
    openOverlay("talentEditor");
  }
}

function renderInventoryOverlay() {
  const tabs = [
    { id: "gear", label: "inventoryGearTab" },
    { id: "heroMemory", label: "inventoryHeroMemoryTab" },
    { id: "divinitySlate", label: "inventoryDivinitySlateTab" },
    { id: "prism", label: "inventoryPrismTab" },
  ];
  const selectedTab = tabs.some(({ id }) => id === state.inventoryTab)
    ? state.inventoryTab
    : "gear";
  const counts = Object.fromEntries(tabs.map(({ id }) => [id, unifiedInventoryRecords(id).length]));
  const hints = {
    gear: "gearInventoryHint",
    heroMemory: "heroMemoryInventoryHint",
    divinitySlate: "divinitySlateInventoryHint",
    prism: "prismInventoryHint",
  };
  const records = {
    gear: renderGearInventoryRecords,
    heroMemory: renderHeroMemoryInventoryRecords,
    divinitySlate: renderDivinitySlateInventoryRecords,
    prism: renderPrismInventoryRecords,
  };

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal inventory-modal" role="dialog" aria-modal="true" aria-label="${ui("localInventory")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("localInventory")}</h2>
      <div class="inventory-tabs" role="tablist" aria-label="${ui("localInventory")}">
        ${tabs.map(({ id, label }) => `<button data-action="inventory-tab" data-tab="${id}" class="${selectedTab === id ? "is-active" : ""}" role="tab" aria-selected="${selectedTab === id}">${ui(label, { count: counts[id] })}</button>`).join("")}
      </div>
      <p>${ui(hints[selectedTab])}</p>
      <div class="search-line">
        <input type="search" id="searchInput" value="${escapeHtml(state.query)}" placeholder="${ui("searchPlaceholder")}" aria-label="${ui("searchPlaceholder")}" autocomplete="off" />
        <span>⌕</span>
      </div>
      <div class="inventory-records">
        ${records[selectedTab]()}
      </div>
    </section>
  `;
}

function renderConfirmReplaceOverlay() {
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal confirm-modal" role="dialog" aria-modal="true" aria-label="${ui("confirmReplaceTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${ui("confirmReplaceTitle")}</h2>
      <p class="confirm-copy">${ui("confirmResetMessage")}</p>
      <footer class="confirm-actions">
        <button data-action="close-overlay">${ui("cancel")}</button>
        <button class="danger" data-action="confirm-replace">${ui("resetBd")}</button>
      </footer>
    </section>
  `;
}

function renderItemLine(item, category) {
  const displayItem = itemText(item);
  const skillPlacement = category?.id === "skills"
    ? getRuntimeSkillDetailPlacement(item.id)
    : null;
  const selected = skillPlacement
    ? skillPlacement.status === "equipped"
    : isSelectedForCurrentSlot(item.id);
  const craftMode = category?.id === "gear" && state.overlay?.mode === "craft";
  const readOnlyGear = category?.id === "gear" && isGearReadOnlyItem(item);
  const selectionOnlyGear = category?.id === "gear" && isGearSelectionOnlyItem(item);
  const toggleControl = readOnlyGear
    ? `<button class="item-toggle is-disabled" data-action="focus-detail" data-item="${item.id}" aria-label="${escapeHtml(`${displayItem.name}: ${gearReadOnlyCopy("badge")}`)}">·</button>`
    : craftMode
    ? `<button class="item-toggle" data-action="focus-detail" data-item="${item.id}" aria-label="${escapeHtml(ui("openItemDetail", { name: displayItem.name }))}">›</button>`
    : skillPlacement && ["loading", "information-only", "full"].includes(skillPlacement.status)
      ? `<span class="item-toggle is-disabled" aria-hidden="true">·</span>`
      : skillPlacement
        ? `<button class="item-toggle" data-action="skill-detail-runtime-toggle" data-item="${item.id}" aria-label="${escapeHtml(ui(selected ? "removeItem" : "addItem", { name: displayItem.name }))}">${selected ? "−" : "+"}</button>`
        : `<button class="item-toggle" data-action="toggle" data-item="${item.id}" aria-label="${escapeHtml(ui(selected ? "removeItem" : "addItem", { name: displayItem.name }))}">${selected ? "−" : "+"}</button>`;

  return `
    <article class="editor-item ${selected ? "is-selected" : ""} ${readOnlyGear ? "is-read-only" : ""} ${selectionOnlyGear ? "is-selection-only" : ""}">
      <button class="item-summary" data-action="focus-detail" data-item="${item.id}">
        ${renderItemIcon(item)}
        <strong>${escapeHtml(displayItem.name)}</strong>
        <small ${readOnlyGear ? 'class="gear-read-only-badge" data-role="gear-read-only-badge"' : selectionOnlyGear ? 'class="gear-selection-only-badge" data-role="gear-selection-only-badge"' : ""}>${escapeHtml(readOnlyGear ? `${displayItem.rarity ?? category?.id ?? ""} · ${gearReadOnlyCopy("badge")}` : selectionOnlyGear ? `${displayItem.rarity ?? category?.id ?? ""} · ${gearSelectionOnlyCopy("badge")}` : displayItem.rarity ?? category?.id ?? "")}</small>
      </button>
      ${toggleControl}
    </article>
  `;
}

const SCREENSHOT_MATCH_CATEGORIES = Object.freeze([
  "gear",
  "skills",
  "supports",
  "talents",
  "heroMemory",
]);
const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.onload = resolve;
    script.onerror = () => reject(new Error("tesseract load failed"));
    document.head.appendChild(script);
  });
  return window.Tesseract;
}

function screenshotMatchCandidates() {
  return SCREENSHOT_MATCH_CATEGORIES.flatMap((categoryId) => (
    getCatalogItems(categoryId).map((item) => ({
      itemId: item.id,
      categoryId,
      names: [
        itemText(item).name,
        getTlidbLocaleText(item, "ko")?.name,
        getTlidbLocaleText(item, "en")?.name,
        getTlidbLocaleText(item, "cn")?.name,
        item.name,
      ],
    }))
  ));
}

async function importFromScreenshot(file, region = null) {
  const previous = state.screenshotImport;
  if (previous?.previewUrl && previous.file !== file) URL.revokeObjectURL(previous.previewUrl);
  const previewUrl = previous?.file === file ? previous.previewUrl
    : typeof Blob !== 'undefined' && file instanceof Blob ? URL.createObjectURL(file) : null;
  const report = { status: "loading", fileName: file.name, file, previewUrl, region,
    matchIds: [], categoryId: null, values: [], selectedValueIds: [] };
  state.screenshotImport = report;
  state.overlay = { type: "screenshot" };
  render();

  let worker = null;
  try {
    const tesseract = await loadTesseract();
    worker = await tesseract.createWorker(["kor", "eng", "chi_sim"]);
    const image = region ? await cropScreenshotFile(file, region) : file;
    const texts = await recognizeScreenshotText(worker, image, { detail: Boolean(region) });
    const candidates = screenshotMatchCandidates();
    const matchIds = matchScreenshotCatalogItems(texts, candidates);
    const matchedCategories = new Set(matchIds.map((itemId) => findItemById(itemId)?.categoryId));
    const runtimeLoads = [];
    if (matchedCategories.has("gear")) runtimeLoads.push(ensureGearLocaleRegistry());
    if (["skills", "supports"].some((categoryId) => matchedCategories.has(categoryId))) {
      runtimeLoads.push(ensureSkillRuntimeModel());
    }
    if (matchedCategories.has("talents")) runtimeLoads.push(ensureTalentBoardModel());
    if (matchedCategories.has("heroMemory")) runtimeLoads.push(ensureHeroMemoryDataset());
    await Promise.all(runtimeLoads);
    if (state.screenshotImport === report) {
      const values = getScreenshotValueCandidates(texts, matchIds.map(findItemById).filter(Boolean), candidates, state.gearLocaleRuntime.registry);
      Object.assign(report, { status: "done", matchIds, values });
    }
  } catch {
    if (state.screenshotImport === report) report.status = "error";
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Recognition has already resolved; worker cleanup errors do not alter its result.
      }
    }
  }
  if (state.screenshotImport === report) render();
}

function selectedScreenshotValues(itemId) {
  const report = state.screenshotImport;
  return (report?.values ?? []).filter(value => value.itemId === itemId
    && value.status === 'recognized' && report.selectedValueIds.includes(value.id))
    .map(resolveScreenshotCraftCandidate).filter(Boolean);
}

function renderScreenshotCraftValue(value, report) {
  const choice = resolveScreenshotCraftCandidate(value);
  return `<div class="screenshot-craft-value">
    ${value.choices.length > 1 ? `<label>옵션 종류·등급 확인
      <select data-screenshot-craft-choice="${value.id}" aria-label="${escapeHtml(value.label)} 종류·등급">
        <option value="" ${value.choiceIndex < 0 ? 'selected' : ''}>후보 ${value.choices.length}개 · 화면과 대조해 선택</option>
        ${value.choices.map((option, index) => `<option value="${index}" ${value.choiceIndex === index ? 'selected' : ''}>${escapeHtml(`${option.groupLabel} · ${option.tierLabel} · 범위 ${option.rangeLabel}`)}</option>`).join('')}
      </select></label>` : ''}
    <button type="button" class="screenshot-value" role="checkbox" aria-checked="${report.selectedValueIds.includes(value.id)}"
      data-action="toggle-screenshot-value" data-value-id="${value.id}" ${choice ? '' : 'disabled'}>
      <strong>${escapeHtml(value.label)}</strong>
      ${choice ? `<span>${escapeHtml(`${choice.groupLabel} · ${choice.tierLabel}`)}</span><small>${escapeHtml(value.tierEvidence)} · 허용 범위 ${escapeHtml(choice.rangeLabel)}</small>`
        : `<small>${value.status === 'unsupported' ? escapeHtml(value.reason) : value.status === 'conflict' ? '인식값 또는 등급 충돌 · 적용 제외' : '위에서 옵션 종류·등급을 확인하세요.'}</small>`}
    </button>
  </div>`;
}

function renderScreenshotCrop(report) {
  if (!report?.previewUrl) return '';
  const region = report.region;
  return `<details class="screenshot-crop" ${report.cropOpen ? 'open' : ''}>
    <summary>작은 글자가 빠졌나요? 툴팁 영역 선택</summary>
    <p>이름과 수치가 함께 보이도록 이미지 위를 드래그하세요. 아래 비율 입력으로도 영역을 지정할 수 있습니다.</p>
    <div class="screenshot-crop-surface" data-role="screenshot-crop-surface">
      <img src="${escapeHtml(report.previewUrl)}" alt="가져온 게임 스크린샷" draggable="false" />
      ${region ? `<span class="screenshot-crop-box" style="left:${region.x * 100}%;top:${region.y * 100}%;width:${region.width * 100}%;height:${region.height * 100}%"></span>` : ''}
    </div>
    <div class="screenshot-crop-fields">${[['x', '왼쪽'], ['y', '위쪽'], ['width', '너비'], ['height', '높이']].map(([key, label]) => `<label>${label} (%)<input type="number" min="0" max="100" step="0.1" data-screenshot-region="${key}" aria-label="인식 영역 ${label} 비율" value="${Math.round((region?.[key] ?? (key === 'width' || key === 'height' ? 1 : 0)) * 1000) / 10}" /></label>`).join('')}</div>
    <button data-action="recognize-screenshot-region" ${report.status === 'loading' ? 'disabled' : ''}>선택 영역 다시 인식</button>
    <button data-action="recognize-screenshot-full" ${report.status === 'loading' ? 'disabled' : ''}>전체 이미지 다시 인식</button>
  </details>`;
}

function renderScreenshotValues(item, report) {
  if (!['gear', 'skills', 'supports'].includes(item.categoryId)) return '';
  const values = (report?.values ?? []).filter(value => value.itemId === item.id);
  if (!values.length) return '<p class="screenshot-value-hint">확인 가능한 수치가 없습니다. 이름과 옵션이 보이는 툴팁 영역을 선택하거나 적용 후 편집하세요.</p>';
  return `<fieldset class="screenshot-values"><legend>함께 적용할 수치 선택</legend>
    <p>선택한 값만 아래 슬롯에 적용합니다. 제작 옵션은 종류·등급·수치를 함께 적용합니다. 등급 표기가 없는 화면은 SS13 범위로 대조한 후보를 표시합니다.</p>
    ${values.map(value => value.kind === 'gear-craft' ? renderScreenshotCraftValue(value, report) : `<button type="button" class="screenshot-value" role="checkbox"
      aria-checked="${report.selectedValueIds.includes(value.id)}" data-action="toggle-screenshot-value" data-value-id="${value.id}"
      ${value.status === 'conflict' ? 'disabled' : ''}>
      <span>${escapeHtml(value.label)}</span><strong>${value.status === 'conflict' ? `인식값 충돌: ${value.alternatives.join(' / ')} · 적용 제외` : `${value.value}${value.kind === 'skill-level' ? ' 레벨' : ''}`}</strong>
      ${value.variant ? `<small>${value.variant === 'corroded' ? '침식 수치' : '일반 옵션'} · 허용 범위 ${value.min} ~ ${value.max}</small>` : ''}
      ${value.bonus ? `<small>화면의 추가 레벨 +${value.bonus} · 기본 레벨만 적용하며 추가 레벨은 빌드 효과로 계산합니다.</small>` : ''}
    </button>`).join('')}</fieldset>`;
}

function applyScreenshotBuild(nextBuild, notice, actionTarget) {
  const scrollTop = document.querySelector(".screenshot-body")?.scrollTop ?? 0;
  setBuild(nextBuild, notice);
  const body = document.querySelector(".screenshot-body");
  if (body) body.scrollTop = scrollTop;
  const target = [...document.querySelectorAll(".screenshot-apply")].find((button) => (
    Object.entries(actionTarget.dataset).every(([key, value]) => button.dataset[key] === value)
  ));
  target?.focus({ preventScroll: true });
}

function renderScreenshotOverlay() {
  const report = state.screenshotImport;
  const items = (report?.matchIds ?? [])
    .map((itemId) => findItemById(itemId))
    .filter((item) => SCREENSHOT_MATCH_CATEGORIES.includes(item?.categoryId));
  const screenshotTitle = ui("screenshotResultTitle");
  const selectedCategory = items.some((item) => item.categoryId === report?.categoryId)
    ? report.categoryId
    : items[0]?.categoryId;
  const slotContents = (label, currentId) => {
    const currentItem = findItemById(currentId);
    const currentName = currentItem ? itemText(currentItem).name : ui("screenshotEmptySlot");
    return `<strong>${escapeHtml(label)}</strong><small>${escapeHtml(ui("screenshotCurrentSlot", { name: currentName }))}</small>`;
  };

  const renderGearApplyControls = (item, displayItem) => {
    const uniqueSlotIndex = inferUniqueGearSlotIndex(item.id);
    const slotIndices = uniqueSlotIndex >= 0
      ? [uniqueSlotIndex]
      : getCompatibleGearSlotIndices(item.id);
    return slotIndices.length
      ? slotIndices.map((slotIndex) => {
          const slotLabel = ui(slotKeyForGearIndex(slotIndex));
          const currentId = state.build.selections.gear[slotIndex];
          return `<button class="screenshot-apply" data-action="apply-screenshot-match" data-item="${escapeHtml(item.id)}" data-slot-index="${slotIndex}" aria-pressed="${currentId === item.id}" aria-label="${escapeHtml(ui("screenshotApplyToSlot", { name: displayItem.name, slot: slotLabel }))}">${slotContents(ui("screenshotApplySlot", { slot: slotLabel }), currentId)}</button>`;
        }).join("")
      : `<button class="screenshot-apply" type="button" disabled title="${escapeHtml(ui("screenshotTargetRequired"))}">${ui("screenshotTargetRequired")}</button>`;
  };

  const renderSkillApplyControls = (item) => {
    const model = state.skillRuntime.status === "ready" && state.skillRuntime.model
      ? excludeSs13PreviewSkillRuntimeModel(state.skillRuntime.model)
      : null;
    const activeRecord = model?.active.find((record) => (
      record.id === item.id || record.flatItemId === item.id
    ));
    const passiveRecord = model?.passive.find((record) => (
      record.id === item.id || record.flatItemId === item.id
    ));
    if (!model || (!activeRecord && !passiveRecord)) {
      return `<span class="screenshot-recognition-only">${escapeHtml(ui("screenshotCategoryUnsupported"))}</span>`;
    }
    const kind = activeRecord ? "active" : "passive";
    const slotCount = kind === "active" ? 5 : 4;
    const availableRows = Array.from({ length: slotCount }, (_, rowIndex) => rowIndex)
      .filter((rowIndex) => !getExternalMainSkillOverride(model, state.build, kind, rowIndex));
    if (!availableRows.length) {
      return `<button class="screenshot-apply" type="button" disabled>${escapeHtml(ui("screenshotTargetRequired"))}</button>`;
    }
    return availableRows.map((rowIndex) => {
      const slotLabel = ui(kind === "active" ? "skillActiveNumber" : "skillPassiveNumber", {
        index: rowIndex + 1,
      });
      const currentId = state.build.skills[kind][rowIndex]?.skillId;
      return `<button class="screenshot-apply" data-action="apply-screenshot-skill" data-item="${escapeHtml(item.id)}" data-kind="${kind}" data-row-index="${rowIndex}" aria-pressed="${currentId === item.id}" aria-label="${escapeHtml(ui("screenshotApplyToSkillSlot", { name: itemText(item).name, slot: slotLabel }))}">${slotContents(ui("screenshotApplySkillSlot", { slot: slotLabel }), currentId)}</button>`;
    }).join("");
  };

  const renderSupportApplyControls = (item) => {
    const model = state.skillRuntime.status === "ready" && state.skillRuntime.model
      ? excludeSs13PreviewSkillRuntimeModel(state.skillRuntime.model)
      : null;
    const support = model?.allSupports.find((record) => (
      record.id === item.id || record.flatItemId === item.id
    ));
    if (!model || !support) {
      return `<span class="screenshot-recognition-only">${escapeHtml(ui("screenshotCategoryUnsupported"))}</span>`;
    }
    const skills = normalizeCurrentSkillRuntimeState(model);
    const targets = ["active", "passive"].flatMap((kind) => (
      skills[kind].flatMap((slot, rowIndex) => {
        const externalMain = getExternalMainSkillOverride(model, state.build, kind, rowIndex);
        const hostSkillId = externalMain?.skill?.id ?? slot.skillId;
        if (!hostSkillId) return [];
        return Array.from({ length: slot.unlockedSupportCount }, (_, supportIndex) => {
          const compatible = getCompatibleSupportRuntimeRecords(model, hostSkillId, supportIndex + 1, {
            equippedSupports: slot.supports,
            currentSupportIndex: supportIndex,
            heroIdentifier: skillRuntimeUpdateOptions().heroIdentifier,
          }).some((record) => record.id === support.id);
          return compatible ? { kind, rowIndex, supportIndex } : null;
        }).filter(Boolean);
      })
    ));
    if (!targets.length) {
      return `<span class="screenshot-recognition-only">${escapeHtml(ui("screenshotSupportTargetUnavailable"))}</span>`;
    }
    return targets.map(({ kind, rowIndex, supportIndex }) => {
      const hostLabel = ui(kind === "active" ? "skillActiveNumber" : "skillPassiveNumber", {
        index: rowIndex + 1,
      });
      const slotLabel = ui("screenshotSupportSlot", { host: hostLabel, index: supportIndex + 1 });
      const currentId = skills[kind][rowIndex].supports[supportIndex]?.supportId;
      return `<button class="screenshot-apply" data-action="apply-screenshot-support" data-item="${escapeHtml(item.id)}" data-kind="${kind}" data-row-index="${rowIndex}" data-support-index="${supportIndex}" aria-pressed="${currentId === item.id}" aria-label="${escapeHtml(ui("screenshotApplyToSkillSlot", { name: itemText(item).name, slot: slotLabel }))}">${slotContents(ui("screenshotApplySkillSlot", { slot: slotLabel }), currentId)}</button>`;
    }).join("");
  };

  const renderTalentApplyControls = (item) => {
    const model = state.talentRuntime.status === "ready" ? state.talentRuntime.model : null;
    const targets = model ? getScreenshotTalentTargets(model, state.build, item) : [];
    if (!targets.length) {
      return `<span class="screenshot-recognition-only">${escapeHtml(ui("screenshotTargetRequired"))}</span>`;
    }
    return targets.map(({ boardIndex }) => {
      const board = boardIndex === 0
        ? ui("screenshotTalentBoardBase")
        : ui("screenshotTalentBoardSub", { index: boardIndex });
      return `<button class="screenshot-apply" data-action="configure-screenshot-talent" data-item="${escapeHtml(item.id)}" data-board-index="${boardIndex}">${escapeHtml(ui("screenshotConfigureTalent", { board }))}</button>`;
    }).join("");
  };

  const renderHeroMemoryApplyControls = (item) => {
    const dataset = state.heroMemoryRuntime.status === "ready"
      ? state.heroMemoryRuntime.dataset
      : null;
    const targets = dataset ? getScreenshotHeroMemoryTargets(dataset, item.id) : [];
    if (!targets.length) {
      return `<span class="screenshot-recognition-only">${escapeHtml(ui("screenshotTargetRequired"))}</span>`;
    }
    return targets.map(({ slotIndex }) => (
      `<button class="screenshot-apply" data-action="configure-screenshot-memory" data-item="${escapeHtml(item.id)}" data-slot-index="${slotIndex}">${escapeHtml(ui("screenshotConfigureMemory", { level: [45, 60, 75][slotIndex] }))}</button>`
    )).join("");
  };

  const renderScreenshotItem = (item) => {
    const displayItem = itemText(item);
    const applyControls = item.categoryId === "gear"
      ? renderGearApplyControls(item, displayItem)
      : item.categoryId === "skills"
        ? renderSkillApplyControls(item)
        : item.categoryId === "supports"
          ? renderSupportApplyControls(item)
          : item.categoryId === "talents"
            ? renderTalentApplyControls(item)
            : item.categoryId === "heroMemory"
              ? renderHeroMemoryApplyControls(item)
              : `<span class="screenshot-recognition-only">${escapeHtml(ui("screenshotDetailRequired"))}</span>`;
    return `
      <article class="editor-item screenshot-match" data-item="${escapeHtml(item.id)}">
        <div class="item-summary">
          ${renderItemIcon(item)}
          <strong>${escapeHtml(displayItem.name)}</strong>
          <small>${escapeHtml(categoryText(getCategory(item.categoryId)).label)}</small>
        </div>
        ${renderScreenshotValues(item, report)}
        <div class="screenshot-apply-options">${applyControls}</div>
      </article>
    `;
  };

  const renderScreenshotGroups = () => SCREENSHOT_MATCH_CATEGORIES.map((categoryId) => {
    const categoryItems = items.filter((item) => item.categoryId === categoryId);
    if (!categoryItems.length) return "";
    return `
      <section class="screenshot-group" id="screenshot-panel-${categoryId}" role="tabpanel" aria-labelledby="screenshot-tab-${categoryId}" data-role="screenshot-group" data-category="${categoryId}" ${categoryId === selectedCategory ? "" : "hidden"}>
        <h3>${escapeHtml(categoryText(getCategory(categoryId)).label)}</h3>
        ${categoryItems.map(renderScreenshotItem).join("")}
      </section>
    `;
  }).join("");

  let body = "";
  if (!report || report.status === "loading") {
    body = `<p class="empty">${ui("screenshotRecognizing")}</p>`;
  } else if (report.status === "error") {
    body = `<p class="empty">${ui("screenshotFailed")}</p>`;
  } else if (!items.length) {
    body = `<p class="empty">${ui("screenshotNoMatches")}</p>`;
  } else {
    body = `
      <div class="screenshot-matches">
        ${renderScreenshotGroups()}
      </div>
    `;
  }

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="select-modal screenshot-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(screenshotTitle)}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      <h2>${escapeHtml(screenshotTitle)}</h2>
      <p class="screenshot-file">${escapeHtml(report?.fileName ?? "")}${report?.status === "done" ? ` · ${ui("screenshotMatchedCount", { count: items.length })}` : ""}</p>
      ${items.length ? `<div class="screenshot-tabs" role="tablist" aria-label="${ui("screenshotCategories")}">${SCREENSHOT_MATCH_CATEGORIES.map((categoryId) => {
        const count = items.filter((item) => item.categoryId === categoryId).length;
        return `<button id="screenshot-tab-${categoryId}" role="tab" aria-controls="screenshot-panel-${categoryId}" aria-selected="${categoryId === selectedCategory}" data-action="screenshot-category" data-category="${categoryId}" ${count ? "" : "disabled"}>${escapeHtml(categoryText(getCategory(categoryId)).label)} <span>${count}</span></button>`;
      }).join("")}</div>` : ""}
      <div class="screenshot-body" role="region" aria-label="${escapeHtml(screenshotTitle)}" tabindex="0">
        ${renderScreenshotCrop(report)}
        ${items.length ? `<p class="support-table-intro">${ui("screenshotHint")}</p><p class="support-table-intro">${ui("screenshotReadOnlyHint")}</p>` : ""}
        ${body}
      </div>
      ${state.notice ? `<p class="screenshot-status" role="status" aria-live="polite">${escapeHtml(state.notice)}</p>` : ''}
      <div class="screenshot-footer">
        <button data-action="import-screenshot" ${report?.status === "loading" ? "disabled" : ""}>${ui("screenshotChooseAgain")}</button>
        <button data-action="close-overlay">${ui("screenshotBackToBuild")}</button>
        <button data-action="save">${ui("screenshotSaveBuild")}</button>
      </div>
    </section>
  `;
}

function renderSavedBuildList() {
  if (!state.savedBuilds.length) {
    return `<p class="empty">${ui("noSavedBuilds")}</p>`;
  }

  return `
    <div class="saved-list">
      ${state.savedBuilds
        .map(
          (build) => `
            <div class="saved-row">
              <div class="saved-build-summary">
                <strong>${escapeHtml(build.name || ui("untitledBuild"))}</strong>
                <small>${formatAppDateTime(build.updatedAt, state.locale)}</small>
                ${build.id === state.build.id ? `<small class="saved-build-current-badge">${ui("savedBuildEditing")}</small>` : ""}
              </div>
              <div class="saved-row-actions">
              <button data-action="load-saved" data-build="${escapeHtml(build.id)}" aria-label="${escapeHtml(ui("loadNamedBuild", { name: build.name }))}">${ui("load")}</button>
              <button data-action="compare-saved" data-build="${escapeHtml(build.id)}" aria-label="${escapeHtml(ui("compareNamedBuild", { name: build.name }))}">${ui("compare")}</button>
              <button data-action="delete-saved" data-build="${escapeHtml(build.id)}" aria-label="${escapeHtml(ui("deleteNamedBuild", { name: build.name }))}">${ui("delete")}</button>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderPactOverlay() {
  const runtime = state.pactRuntime;
  if (runtime.status === "idle" || runtime.status === "loading") {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="pact-editor-modal pact-editor-status" role="dialog" aria-modal="true" aria-label="계약 편집">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
        <div class="loading-spinner" aria-hidden="true"></div>
        <strong>계약 데이터를 불러오는 중입니다.</strong>
      </section>
    `;
  }

  if (runtime.status === "error" || !runtime.model) {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="pact-editor-modal pact-editor-status" role="dialog" aria-modal="true" aria-label="계약 편집">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
        <strong>계약 데이터를 불러오지 못했습니다.</strong>
        <button type="button" data-action="pact-editor-retry">다시 시도</button>
      </section>
    `;
  }

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="pact-editor-modal" role="dialog" aria-modal="true" aria-label="계약 편집">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      ${state.pactEditorUi.error ? `<p class="pact-editor-error" data-role="pact-editor-error" role="alert">${escapeHtml(state.pactEditorUi.error)}</p>` : ""}
      ${renderPactEditor(runtime.model, currentPactEditorState(runtime.model), {
        ...state.pactEditorUi,
        presentGameText: presentCatalogGameText,
      })}
    </section>
  `;
}

function renderDivinityOverlay() {
  const runtime = state.divinityRuntime;
  if (runtime.status === "idle" || runtime.status === "loading") {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="divinity-editor-modal divinity-editor-status" role="dialog" aria-modal="true" aria-label="${ui("divinityEditorTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
        <div class="loading-spinner" aria-hidden="true"></div>
        <strong>${ui("divinityEditorLoading")}</strong>
      </section>
    `;
  }

  if (runtime.status === "error" || !runtime.divinityCatalog || !runtime.hadesCatalog) {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="divinity-editor-modal divinity-editor-status" role="dialog" aria-modal="true" aria-label="${ui("divinityEditorTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
        <strong>${ui("divinityEditorLoadFailed")}</strong>
        <button type="button" data-action="divinity-editor-retry">다시 시도</button>
      </section>
    `;
  }

  const board = currentDivinityBoard();
  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="divinity-editor-modal" role="dialog" aria-modal="true" aria-label="${ui("divinityEditorTitle")}">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      ${state.divinityEditorUi.error ? `<p class="divinity-editor-error" role="alert">${escapeHtml(state.divinityEditorUi.error)}</p>` : ""}
      ${renderDivinityEditor({
        board,
        divinityCatalog: runtime.divinityCatalog,
        hadesCatalog: runtime.hadesCatalog,
        sourceOnlyCatalog: runtime.sourceOnlyCatalog ?? [],
        sourceOnlySpecialSlateCatalog: runtime.sourceOnlySpecialSlateCatalog ?? [],
        uiState: state.divinityEditorUi,
        locale: state.locale,
        presentGameText: presentCatalogGameText,
      })}
      <footer class="divinity-editor-footer">
        <button type="button" data-action="divinity-editor-save">저장</button>
        <button type="button" data-action="close-overlay">닫기</button>
      </footer>
    </section>
  `;
}

function renderTalentOverlay() {
  const runtime = state.talentRuntime;
  if (runtime.status === "idle" || runtime.status === "loading") {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="talent-editor-modal talent-editor-status" role="dialog" aria-modal="true" aria-label="재능 편집">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
        <div class="loading-spinner" aria-hidden="true"></div>
        <strong>재능 데이터를 불러오는 중입니다.</strong>
      </section>
    `;
  }

  if (runtime.status === "error" || !runtime.model) {
    return `
      <div class="modal-backdrop" data-action="close-overlay"></div>
      <section class="talent-editor-modal talent-editor-status" role="dialog" aria-modal="true" aria-label="재능 편집">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
        <strong>재능 데이터를 불러오지 못했습니다.</strong>
        <button type="button" data-action="talent-editor-retry">다시 시도</button>
      </section>
    `;
  }

  return `
    <div class="modal-backdrop" data-action="close-overlay"></div>
    <section class="talent-editor-modal" role="dialog" aria-modal="true" aria-label="재능 편집">
      <button class="modal-close" data-action="close-overlay" aria-label="${ui("close")}">×</button>
      ${state.talentEditorUi.error ? `<p class="talent-editor-error" role="alert">${escapeHtml(state.talentEditorUi.error)}</p>` : ""}
      ${renderTalentEditor(runtime.model, state.build.talents, {
        ...state.talentEditorUi,
        locale: state.locale,
        ui,
        presentGameText: presentCatalogGameText,
      })}
    </section>
  `;
}

function renderOverlay() {
  if (!state.overlay) return "";
  if (state.overlay.type === "confirmReplace") return renderConfirmReplaceOverlay();
  if (state.overlay.type === "gear") return renderGearEditor();
  if (state.overlay.type === "inventory") return renderInventoryOverlay();
  if (state.overlay.type === "hero") return renderHeroModal();
  if (state.overlay.type === "heroMemory") return renderHeroMemoryEditor();
  if (state.overlay.type === "divinity") return renderDivinityOverlay();
  if (state.overlay.type === "pact") return renderPactOverlay();
  if (state.overlay.type === "talentEditor") return renderTalentOverlay();
  if (state.overlay.type === "skillEditor") return renderSkillEditor();
  if (state.overlay.type === "saves") return renderSavesOverlay();
  if (state.overlay.type === "importReport") return renderImportReportOverlay();
  if (state.overlay.type === "export91TobReport") return render91TobExportReportOverlay();
  if (state.overlay.type === "compare") return renderBuildCompareOverlay();
  if (state.overlay.type === "saveAs") return renderSaveAsOverlay();
  if (state.overlay.type === "announcement") return renderAnnouncementOverlay();
  if (state.overlay.type === "dataStatus") return renderDataStatusOverlay();
  if (state.overlay.type === "help") return renderHelpOverlay();
  if (state.overlay.type === "tlidbHelp") return renderTlidbHelpOverlay();
  if (state.overlay.type === "screenshot") return renderScreenshotOverlay();
  return renderSelectorOverlay(state.overlay.type);
}

function renderCurrentSeason() {
  return `<section class="build-advisor current-season" aria-label="SS14 계산" tabindex="-1">
    <h1>SS14 계산</h1>
    ${state.advisorError ? `<p role="alert">${escapeHtml(state.advisorError)}</p>` : ""}
    ${renderSeasonWorkspace({ documents: state.advisorSeasonWorkspaces.documents,
      error: state.advisorSeasonWorkspaces.error, document: state.advisorWorkspace,
      dirty: state.advisorWorkspaceDirty, inputStale: state.advisorWorkspaceInputStale,
      formValues: state.advisorWorkspaceFormValues, importText: state.advisorWorkspaceImportText,
      currentBuild: state.build, configurationDraft: state.advisorConfigurationDraft,
      recommendationMetric: state.advisorWorkspaceRecommendationMetric })}
    <details data-role="season-new-build"${state.advisorWorkspace ? "" : " open"}><summary>현재 빌드로 계산 시작</summary>
      <p>편집 중인 빌드: <strong>${escapeHtml(state.build.name)}</strong></p>
      <button type="button" data-action="advisor-start-current-season">이 빌드로 SS14 계산 사본 만들기</button>
    </details>
  </section>`;
}

function render() {
  if (seasonPlanner.active) { seasonPlanner.render(app); return; }
  const calc = state.lastCalculation;
  const plannerScroll = document.querySelector(".planner-main")?.scrollTop ?? 0;
  const skillEditorScroll = document.querySelector(".skill-runtime-content")?.scrollTop ?? 0;
  const editorScroll = [".talent-editor-modal", ".talent-grid-viewport", ".pact-editor-modal", ".ingame-pact-inspector", ".skill-runtime-layout", ".skill-runtime-results", ".skill-runtime-result-detail", ".hero-trait-stages", ".hero-memory-editor-body", ".hero-memory-form", ".hero-memory-preview"].map((selector) => {
    const element = document.querySelector(selector);
    return { selector, top: element?.scrollTop ?? 0, left: element?.scrollLeft ?? 0 };
  });
  const openDisclosures = [".build-file-menu", ".gear-value-disclosure", ".gear-source-disclosure", ".gear-craft-disclosure", ".pact-search-disclosure", ".talent-source-disclosure", ".ingame-core-drawer", ".ingame-talent-accessory:has(.talent-prism-section)", ".ingame-talent-accessory:has(.talent-inverse-section)", ".ingame-skill-extra", ".hero-memory-coverage-disclosure", ".hero-memory-inventory-disclosure"]
    .filter((selector) => document.querySelector(selector)?.open);
  const seasonDisclosures = [...(document.querySelectorAll?.('.season-workspace details[data-role][open]') ?? [])].map(element => element.dataset.role);
  setPlannerHtml(app, `
    <div class="app-shell ${state.currentSeasonOpen ? "is-current-season" : ""} ${state.view === "planner" && !state.currentSeasonOpen ? "has-dock" : ""} ${state.sidebarCollapsed ? "sidebar-collapsed" : ""}">
      ${
        state.showNotice && !state.currentSeasonOpen
          ? `
            <div class="announcement">
              <b>${state.currentSeasonOpen ? "SS14 빌드 연구 · 부분 계산" : "이전 시즌 빌드 · SS13 계산 엔진"}</b>
              <span>${state.currentSeasonOpen ? "SS14 원문이 확인된 항목만 계산하고, 원래 빌드는 그대로 보존합니다." : ui("announcement")}</span>
              <button type="button" data-action="open-announcement">${ui("announcementOpen")}</button>
            </div>
          `
          : ""
      }
      <div data-role="storage-warning-container">${renderStorageWarnings()}</div>
      ${renderSidebar()}
      ${renderMobileNavigation()}
      <main class="planner-main">
        <div class="planner-canvas">
          <nav class="season-navigation" aria-label="빌드 편집과 계산">
            <button type="button" data-action="open-ss14-main">SS14 빌드 편집</button>
            <span>이전 시즌 보존 빌드</span>
          </nav>
          ${
            state.currentSeasonOpen ? renderCurrentSeason() : state.view === "traits"
              ? renderTraitSupportView()
              : state.view === "dps"
                ? renderDpsInsightView(calc)
                : `
                  ${renderHeader(calc)}
                  ${renderPlannerSectionNavigation()}
                  ${renderHeroPanel()}
                  ${renderSkillRows()}
                  ${renderGearPanel()}
                  ${renderTalentAndSlate()}
                  ${renderSpiritDestiny()}
                  ${renderCustomAffixes()}
                  ${renderResearchPanel()}
                `
          }
        </div>
      </main>
      ${state.view === "planner" && !state.currentSeasonOpen ? renderStatsDock(calc) : ""}
      ${renderOverlay()}
      ${state.notice && state.overlay?.type !== 'screenshot' ? `<div class="toast" role="status" aria-live="polite">${escapeHtml(state.notice)}</div>` : ""}
    </div>
  `);
  scrubVisibleChinese(app);
  const planner = document.querySelector(".planner-main");
  if (planner) planner.scrollTop = plannerScroll;
  const skillContent = document.querySelector(".skill-runtime-content");
  if (skillContent) skillContent.scrollTop = skillEditorScroll;
  for (const { selector, top, left } of editorScroll) {
    const element = document.querySelector(selector);
    if (element) { element.scrollTop = top; element.scrollLeft = left; }
  }
  for (const selector of openDisclosures) {
    const disclosure = document.querySelector(selector);
    if (disclosure) disclosure.open = true;
  }
  for (const role of seasonDisclosures) {
    const disclosure = document.querySelector(`.season-workspace details[data-role="${role}"]`);
    if (disclosure) disclosure.open = true;
  }
}

function calculateCurrentBuild() {
  if (state.isCalculating) return;
  state.build = persistCurrentBuild(normalizeBuildWithSkillRuntime(state.build));
  state.isCalculating = true;
  render();
  try {
    const nextCalculation = calculateBuild(state.build);
    const nextSkillRows = analyzeSkillRows(state.build);
    state.lastCalculation = nextCalculation;
    state.lastCalculatedBuildKey = calculationInputKey(state.build);
    state.lastSkillRows = nextSkillRows;
    state.isStale = false;
    state.statTab = "calculation";
    const visibleKeys = new Set(getCalculatedStatKeys(nextCalculation));
    if (!visibleKeys.has(state.expandedStatKey)) state.expandedStatKey = null;
    const panelUnsupported = getPublicStatUnsupportedState(nextCalculation, "calculationPanelDamage");
    showNotice(panelUnsupported
      ? ui("calcPanelUnsupported")
      : ui("calcPanelDone", { value: formatNumber(nextCalculation.summary.calculationPanelDamage) }));
  } finally {
    state.isCalculating = false;
    render();
  }
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  try {
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function requirePactStorageModel() {
  const model = await ensurePactDestinyModel();
  if (model) return model;
  showNotice(state.pactRuntime.error === ui("pactStorageInvalid")
    ? ui("pactStorageInvalid")
    : ui("pactStorageUnavailable"));
  render();
  return null;
}

async function exportCurrentBuildDocument() {
  const pactModel = await requirePactStorageModel();
  if (!pactModel) return;
  try {
    download(
      `${state.build.name || "tob-build"}.json`,
      exportBuild(state.build, { pactModel }),
    );
    showNotice(ui("exportedBuild"));
  } catch (error) {
    showNotice(ui(error instanceof PactStorageInvariantError
      ? "pactStorageInvalid"
      : "buildExportFailed"));
  }
  render();
}

async function saveCurrentBuildSnapshot() {
  const pactModel = await requirePactStorageModel();
  if (!pactModel) return;
  try {
    state.savedBuilds = saveBuildSnapshot(state.build, { pactModel, expectedRevision: currentBuildRevision });
    state.build = state.savedBuilds[0];
    acknowledgeBuildStorage(state.build);
    showNotice(ui("savedCurrentBuild"));
  } catch (error) {
    showNotice(buildStorageErrorMessage(error));
  }
  render();
}

async function exportCurrentBuildFor91Tob() {
  if (state.isExporting91Tob) return;
  state.isExporting91Tob = true;
  showNotice(ui("export91TobPreparing"));
  render();
  try {
    const pactModel = await requirePactStorageModel();
    if (!pactModel) return;
    const validationContext = await loadBuildImportValidationContext().catch(() => null);
    const result = validationContext
      ? export91TobBuildDocument(state.build, validationContext)
      : {
          ok: false,
          reason: "context-unavailable",
          issues: [{ code: "validation-context-unavailable", path: "validationContext" }],
          exportedSections: [],
        };
    if (result.ok) {
      try {
        download(
          `${state.build.name || "tob-build"}-91tob.json`,
          JSON.stringify(result.document, null, 2),
        );
      } catch {
        state.export91TobReport = {
          ok: false,
          messageKey: "export91TobDownloadFailed",
          exportedSections: [],
          issues: [],
        };
        state.overlay = { type: "export91TobReport" };
        showNotice(ui("export91TobDownloadFailed"));
        return;
      }
      state.export91TobReport = {
        ok: true,
        messageKey: "exported91Tob",
        exportedSections: result.exportedSections,
        issues: [],
      };
      showNotice(ui("exported91Tob"));
    } else {
      const messageKey = result.reason === "context-unavailable"
        ? "export91TobValidationUnavailable"
        : result.reason === "91tob-export-unsupported"
          ? "export91TobUnsupported"
          : "export91TobInvalid";
      state.export91TobReport = {
        ok: false,
        messageKey,
        exportedSections: [],
        issues: result.issues ?? [],
      };
      showNotice(ui(messageKey));
    }
    state.overlay = { type: "export91TobReport" };
  } catch {
    state.export91TobReport = {
      ok: false,
      messageKey: "export91TobInvalid",
      exportedSections: [],
      issues: [],
    };
    state.overlay = { type: "export91TobReport" };
    showNotice(ui("export91TobInvalid"));
  } finally {
    state.isExporting91Tob = false;
    render();
    focusOverlayEntry();
  }
}

function categoryIdForOverlay(type) {
  if (type === "inventory") return "";
  return getCategory(type) ? type : "";
}

function openOverlay(type, slotTarget = null) {
  const slotIndex = Number(slotTarget?.slotIndex);
  const categoryId = slotTarget?.categoryId || categoryIdForOverlay(type);
  const returnToOverlay =
    state.overlay?.type === "skillEditor" && (type === "skills" || type === "supports") ? "skillEditor" : "";
  const nextOverlay = { type, ...(slotTarget?.mode ? { mode: slotTarget.mode } : {}) };
  state.overlay = returnToOverlay
    ? { type, returnToOverlay: "skillEditor" }
    : slotTarget?.returnToOverlay
      ? { type, returnToOverlay: slotTarget.returnToOverlay }
      : nextOverlay;
  state.query = slotTarget?.query || "";
  state.catalogLimit = CATALOG_PAGE_SIZE;
  state.filter = slotTarget?.filter || ALL_FILTER;
  if (type === "gear") {
    state.gearFilter = Number.isInteger(slotIndex) ? getGearFilterForSlot(slotKeyForGearIndex(slotIndex)) : "all";
  }
  state.pendingSlot =
    categoryId && Number.isInteger(slotIndex)
      ? {
          categoryId,
          index: slotIndex,
        }
      : null;
  if (type === "gear") state.gearUpgradeResult = null;
  if (type === "inventory") {
    refreshUnifiedInventory();
    void recoverInventory();
    state.inventoryTab = "gear";
  }
  if (type === "heroMemory") {
    state.heroMemoryDraft = null;
    state.heroMemoryInventoryLabel = "";
  }
  if (type === "hero") {
    const level = Number(slotTarget?.stageLevel);
    state.heroTraitEditorUi.activeStageLevel = [1, 45, 60, 75].includes(level) ? level : 1;
  }
  if (type === "pact") {
    state.pactEditorUi = {
      ...state.pactEditorUi,
      activeSlotIndex: Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < 3 ? slotIndex : 0,
      ringSlotId: [...PACT_RING_SLOT_ORDER, "undetermined"].includes(slotTarget?.ringSlotId) ? slotTarget.ringSlotId : "",
      undeterminedDraft: null,
      error: "",
      spiritSearch: "",
      destinySearch: "",
    };
  }
  if (type === "skillEditor") {
    state.skillPicker = null;
    clearSkillRuntimeDrafts();
  }
  if (type === "divinity") {
    state.divinityEditorUi = { ...state.divinityEditorUi, error: "" };
  }
  if (type === "talentEditor") {
    state.talentEditorUi = {
      ...state.talentEditorUi,
      activeBoardIndex: Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < 4
        ? slotIndex
        : state.talentEditorUi.activeBoardIndex,
      error: "",
    };
  }
  render();
  focusOverlayEntry();
  if (
    type === "gear"
      || (type === "inventory" && unifiedInventoryRecords("gear").length)
  ) void ensureGearLocaleRegistry();
  if (type === "hero") void ensureHeroTraitModel();
  if (type === "heroMemory") void ensureHeroMemoryDataset();
  if (type === "divinity") void ensureDivinityRuntime();
  if (type === "pact") void ensurePactDestinyModel();
  if (type === "talentEditor") void ensureTalentBoardModel();
  if (type === "skillEditor") void ensureSkillRuntimeModel();
  if (type === "skills") {
    void ensureSkillRuntimeModel().then(() => {
      if (state.overlay?.type === "skills") render();
    });
  }
}

function openSaveAsOverlay() {
  const sourceName = state.build.name?.trim() || ui("untitledBuild");
  state.saveAsName = ui("saveAsDefaultName", { name: sourceName });
  state.overlay = { type: "saveAs" };
  render();
  focusOverlayEntry();
}

async function saveCurrentBuildAs() {
  const pactModel = await requirePactStorageModel();
  if (!pactModel) return;
  const original = state.build;
  let result;
  try {
    result = saveBuildAs(original, state.saveAsName, { pactModel, expectedRevision: currentBuildRevision });
  } catch (error) {
    showNotice(buildStorageErrorMessage(error));
    render();
    return;
  }
  state.build = result.build;
  acknowledgeBuildStorage(state.build);
  state.savedBuilds = result.savedBuilds;
  state.saveAsName = "";
  state.overlay = null;
  markCalculationStale();
  showNotice(ui("savedBuildAs", { name: result.build.name }));
  render();
}

async function configureScreenshotTalent(itemId, boardIndex) {
  const item = findItemById(itemId);
  const model = await ensureTalentBoardModel();
  const result = item?.categoryId === "talents" && model
    ? applyScreenshotTalentMatch(state.build, model, item, boardIndex)
    : { status: "target-slot-unavailable", build: state.build };
  if (result.status !== "applied") {
    showNotice(ui("screenshotTargetRequired"));
    render();
    return;
  }

  setBuild(result.build);
  state.talentEditorUi = {
    ...state.talentEditorUi,
    activeBoardIndex: boardIndex,
    screenshotMatchItemId: item.id,
    screenshotMatchLabel: itemText(item).name,
    error: "",
  };
  openOverlay("talentEditor", { slotIndex: boardIndex, returnToOverlay: "screenshot" });
}

async function configureScreenshotHeroMemory(itemId, slotIndex) {
  const item = findItemById(itemId);
  const dataset = await ensureHeroMemoryDataset();
  const target = item?.categoryId === "heroMemory"
    ? getScreenshotHeroMemoryTargets(dataset, item.id)
      .find((candidate) => candidate.slotIndex === slotIndex)
    : null;
  if (!target) {
    showNotice(ui("screenshotTargetRequired"));
    render();
    return;
  }

  openOverlay("heroMemory", {
    categoryId: "heroMemory",
    slotIndex,
    returnToOverlay: "screenshot",
  });
  await ensureHeroMemoryDataset();
  const draft = state.heroMemoryDraft;
  if (!draft || draft.slotIndex !== slotIndex) {
    showNotice(ui("screenshotTargetRequired"));
    closeOverlay();
    return;
  }

  let memory = draft.memory;
  if (target.kind === "revival-affix" && memory.revivalAffixId !== target.affixId) {
    const result = toggleHeroMemoryRevivalAffix(memory, target.affixId, dataset);
    if (!["added", "replaced"].includes(result.status)) {
      showNotice(ui("screenshotTargetRequired"));
      closeOverlay();
      return;
    }
    memory = result.memory;
  }
  state.heroMemoryDraft = {
    ...draft,
    memory,
    screenshotMatchItemId: item.id,
    screenshotMatchLabel: itemText(item).name,
  };
  render();
  focusOverlayEntry();
}

function handleAction(target) {
  const actionTarget = target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  const itemId = actionTarget.dataset.item;
  const buildId = actionTarget.dataset.build;

  if (action === "advisor-open-section") {
    state.currentSeasonSection = actionTarget.dataset.section;
    if (!state.currentSeasonOpen) { state.currentSeasonOpen = true; render(); }
    for (const button of document.querySelectorAll('[data-action="advisor-open-section"]')) {
      const primary = button.classList.contains('source-menu-item') || button.classList.contains('mobile-source-menu-item');
      const active = button.dataset.section === (primary && !['dps', 'compare'].includes(state.currentSeasonSection) ? 'editor' : state.currentSeasonSection);
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', primary ? 'page' : 'location');
      else button.removeAttribute('aria-current');
    }
    const selectors = { editor: '.season-editor-groups', dps: '.season-results', compare: '[data-role="season-advisor"]',
      hero: '[data-role="season-hero-selection"]', skills: '[data-role="season-selection-editor"]',
      character: '[data-role="season-character-editor"]', combat: '[data-role="season-dps-input"]', effects: '[data-role="season-effects-editor"]' };
    const section = document.querySelector(selectors[actionTarget.dataset.section] || '.season-editor-groups');
    if (section) {
      if (section.tagName === "DETAILS") section.open = true;
      const focusTarget = section.querySelector?.('summary') || section;
      focusTarget.setAttribute?.('tabindex', '-1');
      focusTarget.focus?.({ preventScroll: true });
      section.scrollIntoView?.({ block: "start" });
    }
    return;
  }

  if (["open-current-season", "open-preserved-build"].includes(action)) {
    state.currentSeasonOpen = action === "open-current-season";
    if (!state.currentSeasonOpen) state.view = "planner";
    state.overlay = null;
    state.statsDockOpen = false;
    render();
    const planner = document.querySelector(".planner-main");
    if (planner) planner.scrollTop = 0;
    return;
  }

  // Actions belonging to the preserved editor always use its own season view.
  // Shared navigation/help and SS14 workspace actions leave the active view intact.
  if (!action.startsWith("advisor-") && !["toggle-sidebar", "open-announcement", "open-data-status", "open-help", "close-overlay", "dismiss-storage-warnings"].includes(action)) {
    state.currentSeasonOpen = false;
  }

  if (action === "advisor-toggle-season-preview") {
    state.currentSeasonOpen = false;
    state.advisorSeasonPreviewOpen = !state.advisorSeasonPreviewOpen;
    render();
    focusAdvisorResult(state.advisorSeasonPreviewOpen ? "#advisor-season-preview" : '[data-action="advisor-toggle-season-preview"]');
    return;
  }

  if (action.startsWith("advisor-")) {
    state.advisorError = "";
    const nextAdvisorBuildKey = JSON.stringify(normalizeBuild(state.build));
    if (state.advisorBuildKey !== nextAdvisorBuildKey) {
      state.advisorDiagnosis = null;
      state.advisorComparison = null;
    }
    state.advisorBuildKey = nextAdvisorBuildKey;
    try {
      if (action === "advisor-start-current-season") {
        if (state.advisorWorkspaceDirty || state.advisorWorkspaceInputStale) throw new Error("저장하지 않은 SS14 입력이 있습니다. 먼저 변경 저장 또는 저장한 입력 복원을 선택하세요.");
        state.advisorWorkspace = saveSeasonWorkspace(localStorage, createSeasonWorkspace(prepareSeasonMigration(state.build)));
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        state.advisorWorkspaceFormValues = {};
        state.advisorConfigurationDraft = null;
        state.advisorWorkspaceRecommendationMetric = null;
        showNotice("원래 빌드와 저장 목록을 보존하고 SS14 사본을 저장했습니다.");
      }
      if (action === "advisor-conditions") {
        state.statTab = "conditions";
        state.statsDockOpen = true;
      }
      if (action === "advisor-evidence") {
        state.lastCalculation = calculateBuild(state.build);
        state.lastSkillRows = analyzeSkillRows(state.build);
        state.lastCalculatedBuildKey = calculationInputKey(state.build);
        state.isStale = false;
        state.statTab = "calculation";
        state.statsDockOpen = true;
      }
      if (action === "advisor-diagnose") state.advisorDiagnosis = diagnoseBuild(state.build, calculateBuild(state.build), {
        isUnsupported: (calculation, key) => Boolean(getPublicStatUnsupportedState(calculation, key))
          || (key === "sealedManaPercent" && Boolean(getPublicStatUnsupportedState(calculation, "manaSealCompensation"))),
      });
      if (action === "advisor-toggle-weight-research") state.advisorWeightResearchOpen = !state.advisorWeightResearchOpen;
      if (action === "advisor-weight-calculate") {
        const number = (id) => { const value = document.getElementById(id)?.value?.trim(); return value ? Number(value) : ""; };
        state.advisorPreferences.weightResearch = { categoryId: document.getElementById("upgradeWeightCategory")?.value, targetId: document.getElementById("upgradeWeightTarget")?.value,
          itemLevel: number("upgradeWeightLevel"), attemptCost: number("upgradeWeightCost") };
        state.advisorPreferences.weightResearchRequested = true;
        localStorage.setItem("tob.advisor.v1", JSON.stringify(state.advisorPreferences));
      }
      if (action === "advisor-season-impact") {
        state.advisorPreferences.seasonImpactRequested = true;
        localStorage.setItem("tob.advisor.v1", JSON.stringify(state.advisorPreferences));
      }
      if (action === "advisor-save-season") {
        state.advisorSavedSeasonComparison = saveSeasonComparison(localStorage, state.build, buildSeasonImpact(state.build).skillComparison);
        showNotice("현재 빌드를 바꾸지 않고 시즌 비교 결과를 저장했습니다.");
      }
      if (action === "advisor-prepare-migration") state.advisorMigrationDraft = prepareSeasonMigration(state.build);
      if (action === "advisor-create-workspace") {
        if (state.advisorWorkspaceDirty || state.advisorWorkspaceInputStale) throw new Error("저장하지 않은 SS14 입력이 있습니다. 먼저 변경 저장 또는 저장한 입력 복원을 선택하세요.");
        if (!state.advisorMigrationDraft) throw new Error("먼저 SS14 이전 검토를 준비하세요.");
        if (!state.advisorMigrationDraft.saved && JSON.stringify(state.advisorMigrationDraft.sourceBuild) !== JSON.stringify(state.build)) throw new Error("원본 입력이 바뀌었습니다. 이전 검토를 다시 준비하세요.");
        state.advisorWorkspace = saveSeasonWorkspace(localStorage, createSeasonWorkspace(state.advisorMigrationDraft));
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        state.advisorWorkspaceDirty = false;
        state.advisorWorkspaceInputStale = false;
        state.advisorWorkspaceFormValues = {};
        showNotice("SS13 원본을 보존하고 별도 SS14 편집 문서를 저장했습니다. 전체 계산 미지원 항목을 확인하세요.");
      }
      if (["advisor-open-workspace", "advisor-reset-workspace"].includes(action)) {
        if (state.advisorWorkspaceDirty || state.advisorWorkspaceInputStale) {
          // Discard is explicit only through the restore button. Opening another
          // document cannot silently erase an in-memory edit.
          if (action !== "advisor-reset-workspace") throw new Error("저장하지 않은 SS14 입력이 있습니다. 먼저 변경 저장 또는 저장한 입력 복원을 선택하세요.");
        }
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        if (state.advisorSeasonWorkspaces.error) throw new Error(state.advisorSeasonWorkspaces.error);
        const id = action === "advisor-reset-workspace" ? state.advisorWorkspace?.id : actionTarget.dataset.copy;
        const stored = state.advisorSeasonWorkspaces.documents.find((row) => row.id === id);
        if (!stored) throw new Error("저장된 SS14 문서를 찾지 못했습니다.");
        state.advisorWorkspace = structuredClone(stored);
        state.advisorWorkspaceDirty = false;
        state.advisorWorkspaceInputStale = false;
        state.advisorWorkspaceFormValues = {};
      }
      if (action === "advisor-import-workspace") {
        if (state.advisorWorkspaceDirty || state.advisorWorkspaceInputStale) throw new Error("저장하지 않은 SS14 입력이 있습니다. 먼저 변경 저장 또는 저장한 입력 복원을 선택하세요.");
        const imported = importSeasonWorkspace(state.advisorWorkspaceImportText);
        state.advisorWorkspace = saveSeasonWorkspace(localStorage, imported);
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        state.advisorWorkspaceDirty = false;
        state.advisorWorkspaceInputStale = false;
        state.advisorWorkspaceFormValues = {};
        state.advisorWorkspaceImportText = "";
      }
      if (action === "advisor-select-workspace-item") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하거나 저장한 입력을 복원하세요.");
        const category = actionTarget.dataset.category;
        const index = Number(actionTarget.dataset.index);
        const input = document.getElementById(`season-choice-${category}-${index}`);
        if (!input || !["gear", "skills"].includes(category)) throw new Error("교체할 SS14 항목을 선택하세요.");
        state.advisorWorkspace = editSeasonWorkspace(state.advisorWorkspace, {
          kind: category === "gear" ? "gear-selection" : "skill-selection", slotIndex: index, rowIndex: index, value: input.value,
        });
        state.advisorWorkspaceDirty = true;
        state.advisorWorkspaceFormValues = {};
      }
      if (["advisor-review-configuration", "advisor-review-all-configurations"].includes(action)) {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하세요.");
        const groups = action === "advisor-review-all-configurations" ? SEASON_CONFIGURATION_GROUPS.map((row) => row.id)
          : [...document.querySelectorAll("[data-season-transfer-group]:checked")].map((input) => input.dataset.seasonTransferGroup);
        state.advisorConfigurationDraft = prepareSeasonConfigurationTransfer(state.advisorWorkspace, state.build, groups);
      }
      if (action === "advisor-apply-configuration") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하세요.");
        state.advisorWorkspace = applySeasonConfigurationTransfer(state.advisorWorkspace, state.build, state.advisorConfigurationDraft);
        state.advisorWorkspaceDirty = true;
        state.advisorWorkspaceFormValues = {};
        state.advisorConfigurationDraft = null;
      }
      if (action === "advisor-cancel-configuration") state.advisorConfigurationDraft = null;
      if (action === "advisor-copy-workspace-candidate") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하세요.");
        const copy = importSeasonWorkspace(exportSeasonWorkspace(state.advisorWorkspace));
        const named = editSeasonWorkspace(copy, { kind: "name", value: `${copy.targetBuild.name.slice(0, 150)} · 후보` });
        saveSeasonWorkspace(localStorage, named);
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        showNotice("원본과 현재 문서를 바꾸지 않고 SS14 후보 사본을 저장했습니다.");
      }
      if (action === "advisor-recommend-workspaces") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하세요.");
        const metric = document.getElementById("seasonAdvisorMetric")?.value;
        if (!["life", "mana", "shield", "lifeRegenerationGranted", "shieldRechargePerSecond", "directDps", "expectedHitDps", "elixirAverageDps"].includes(metric)) throw new Error("비교할 SS14 지표를 선택하세요.");
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        if (state.advisorSeasonWorkspaces.error) throw new Error(state.advisorSeasonWorkspaces.error);
        state.advisorWorkspaceRecommendationMetric = metric;
      }
      if (action === "advisor-select-workspace-support") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하세요.");
        const rowIndex = Number(actionTarget.dataset.row);
        const supportIndex = Number(actionTarget.dataset.support);
        const input = document.getElementById(`season-support-${rowIndex}-${supportIndex}`);
        if (!input) throw new Error("적용할 SS14 보조를 선택하세요.");
        state.advisorWorkspace = editSeasonWorkspace(state.advisorWorkspace, { kind: "support-selection", rowIndex, supportIndex, value: input.value });
        state.advisorWorkspaceDirty = true;
        state.advisorWorkspaceFormValues = {};
      }
      if (action === "advisor-create-thea-workspace") {
        if (state.advisorWorkspaceDirty || state.advisorWorkspaceInputStale) throw new Error("현재 문서의 변경을 먼저 저장하거나 복원하세요.");
        let copy = importSeasonWorkspace(exportSeasonWorkspace(state.advisorWorkspace));
        copy = editSeasonWorkspace(copy, { kind: "hero-selection", value: "hero-tlidb-com-cn-wisdom-of-the-gods" });
        copy = editSeasonWorkspace(copy, { kind: "skill-selection", rowIndex: 0, value: "skills-tlidb-com-cn-ice-lances" });
        copy = editSeasonWorkspace(copy, { kind: "game-critical-input", key: "0" });
        copy = editSeasonWorkspace(copy, { kind: "name", value: "SS14 티아1 · 얼음 송곳" });
        state.advisorWorkspace = saveSeasonWorkspace(localStorage, copy);
        state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
        state.advisorWorkspaceDirty = false;
        state.advisorWorkspaceFormValues = {};
        showNotice("원본과 기존 사본을 보존하고 티아1·얼음 송곳 SS14 사본을 저장했습니다.");
      }
      if (action === "advisor-select-hero-choice") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 수치를 먼저 재계산하거나 복원하세요.");
        const level = actionTarget.dataset.level;
        const input = document.getElementById(`season-hero-choice-${level}`);
        if (!input) throw new Error("선택할 특성을 확인하세요.");
        state.advisorWorkspace = editSeasonWorkspace(state.advisorWorkspace, { kind: "hero-choice", key: level, value: input.value });
        state.advisorWorkspaceDirty = true;
        state.advisorWorkspaceFormValues = {};
      }
      if (action === "advisor-select-thea-board") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 수치를 먼저 재계산하거나 저장하세요.");
        const input = document.getElementById("season-thea-board");
        if (!input) throw new Error("계시의 예언 4번째 보드를 선택하세요.");
        state.advisorWorkspace = editSeasonWorkspace(state.advisorWorkspace, { kind: "thea-board", value: input.value });
        state.advisorWorkspaceDirty = true;
        state.advisorWorkspaceFormValues = {};
      }
      if (action === "advisor-apply-game-critical") {
        if (state.advisorWorkspaceInputStale) throw new Error("입력 중인 SS14 수치를 먼저 재계산하거나 저장한 입력을 복원하세요.");
        state.advisorWorkspace = editSeasonWorkspace(state.advisorWorkspace, { kind: "game-critical-input", key: actionTarget.dataset.row });
        state.advisorWorkspaceDirty = true;
        state.advisorWorkspaceFormValues = {};
      }
      if (["advisor-update-workspace", "advisor-save-workspace"].includes(action)) {
        let edited = state.advisorWorkspace;
        for (const input of document.querySelectorAll("[data-season-edit]")) {
          const kind = input.dataset.seasonEdit;
          edited = editSeasonWorkspace(edited, { kind, rowIndex: Number(input.dataset.row), supportIndex: Number(input.dataset.support), slotIndex: Number(input.dataset.slot),
            key: input.dataset.key ?? input.dataset.choice ?? input.dataset.roll, value: ["name", "slate-affix"].includes(kind) ? input.value : input.value.trim() === "" ? "" : Number(input.value) });
        }
        const saved = action === "advisor-save-workspace";
        state.advisorWorkspace = saved ? saveSeasonWorkspace(localStorage, edited) : edited;
        state.advisorWorkspaceDirty = !saved;
        state.advisorWorkspaceInputStale = false;
        state.advisorWorkspaceFormValues = {};
        if (saved) state.advisorSeasonWorkspaces = loadSeasonWorkspaces(localStorage);
      }
      if (action === "advisor-cancel-migration") state.advisorMigrationDraft = null;
      if (action === "advisor-save-migration") {
        state.advisorSeasonResearch = saveSeasonResearchCopy(localStorage, state.advisorMigrationDraft, state.build);
        state.advisorMigrationDraft = reopenSeasonResearchCopy(state.advisorSeasonResearch.copies.find((copy) => copy.id === state.advisorMigrationDraft.id));
        showNotice("원본 SS13 빌드를 유지하고 SS14 이전 검토 사본을 별도로 저장했습니다.");
      }
      if (action === "advisor-open-migration") {
        state.advisorSeasonResearch = loadSeasonResearchCopies(localStorage);
        if (state.advisorSeasonResearch.error) throw new Error(state.advisorSeasonResearch.error);
        state.advisorMigrationDraft = reopenSeasonResearchCopy(state.advisorSeasonResearch.copies.find((copy) => copy.id === actionTarget.dataset.copy));
      }
      if (action === "advisor-compare") {
        const saved = state.savedBuilds.find((build) => build.id === state.advisorPreferences.compareId);
        if (!saved) throw new Error("비교할 저장 빌드를 선택하세요.");
        state.advisorComparison = compareBuildVersions(state.build, saved, { isUnsupported: getPublicStatUnsupportedState });
      }
      if (action === "advisor-recommend") {
        state.advisorResult = recommendInventoryUpgrades(state.build, state.unifiedInventory, state.advisorPreferences);
      }
      if (action === "advisor-save-candidate") {
        const result = state.advisorResult;
        const candidate = result?.ranked.find((item) => item.id === actionTarget.dataset.candidate);
        if (!candidate || result.buildKey !== JSON.stringify(normalizeBuild(state.build))) throw new Error("현재 빌드로 후보를 다시 평가하세요.");
        const candidateLabel = candidate.configuration?.craftCount || candidate.configuration?.corrosionCount ? "제작·침식 강화 후보" : "강화 후보";
        saveBuildAs(candidate.nextBuild, `${state.build.name || "빌드"} · ${candidateLabel}`, { makeCurrent: false, originalBuild: state.build });
        state.savedBuilds = loadSavedBuilds();
        showNotice("현재 빌드를 바꾸지 않고 후보 사본을 저장했습니다.");
      }
    } catch (error) { state.advisorError = error.message; }
    render();
    if (action === "advisor-conditions") document.querySelector("#stats-tab-conditions")?.focus();
    if (action === "advisor-evidence") document.querySelector("#stats-tab-calculation")?.focus();
    if (action === "advisor-diagnose") focusAdvisorResult('[data-role="advisor-diagnostics"]');
    if (action === "advisor-toggle-weight-research") focusAdvisorResult('[data-action="advisor-toggle-weight-research"]');
    if (action === "advisor-weight-calculate") focusAdvisorResult('[data-role="upgrade-weight-result"]');
    if (["advisor-recommend-workspaces", "advisor-copy-workspace-candidate"].includes(action)) focusAdvisorResult('[data-role="season-advisor-result"]');
    if (["advisor-recommend", "advisor-save-candidate"].includes(action)) focusAdvisorResult('[data-role="advisor-recommendation"]');
    if (action === "advisor-season-impact") focusAdvisorResult('[data-role="advisor-season-impact"]');
    if (action === "advisor-save-season") focusAdvisorResult('[data-role="saved-season-comparison"] > summary');
    if (["advisor-prepare-migration", "advisor-open-migration", "advisor-save-migration"].includes(action)) focusAdvisorResult('[data-role="season-build-review"]');
    if (action === "advisor-cancel-migration") focusAdvisorResult('[data-action="advisor-prepare-migration"]');
    if (["advisor-create-workspace", "advisor-open-workspace", "advisor-update-workspace", "advisor-save-workspace", "advisor-reset-workspace", "advisor-select-workspace-item", "advisor-import-workspace", "advisor-select-workspace-support", "advisor-apply-configuration"].includes(action)) focusAdvisorResult('[data-role="season-workspace-editor"]');
    if (["advisor-review-configuration", "advisor-review-all-configurations"].includes(action)) focusAdvisorResult('[data-role="season-configuration-preview"]');
    return;
  }

  if (!state.overlay && [
    "open-overlay",
    "open-save-as",
    "open-announcement",
    "open-data-status",
    "open-help",
    "support-open-item",
    "reset",
    "import",
    "export-91tob",
    "import-screenshot",
  ].includes(action)) {
    rememberOverlayOpener(actionTarget);
  }

  if (action === "jump-planner-section") {
    jumpToPlannerSection(actionTarget.dataset.section);
    return;
  }

  if (action === "open-stats-dock" || action === "focus-stats") {
    setResponsiveStatsDockOpen(true);
    return;
  }
  if (action === "close-stats-dock") {
    setResponsiveStatsDockOpen(false, { restoreFocus: true });
    return;
  }

  if (action === "dismiss-storage-warnings") {
    state.storageWarnings = [];
    state.buildStorageNotice = "";
    render();
  }
  if (action === "open-save-as") openSaveAsOverlay();
  if (action === "confirm-save-as") void saveCurrentBuildAs();
  if (action === "open-announcement") {
    state.overlay = { type: "announcement" };
    render();
    focusOverlayEntry();
  }
  if (action === "open-data-status") {
    state.overlay = { type: "dataStatus" };
    render();
    focusOverlayEntry();
    if (!state.currentSeasonOpen) void ensureDataStatusRuntime();
  }
  if (action === "open-help") {
    state.overlay = { type: "help" };
    render();
    focusOverlayEntry();
  }
  if (action === "open-tlidb-help") {
    state.overlay = { type: "tlidbHelp", scope: "current", query: "", selectedId: "" };
    render();
    focusOverlayEntry();
  }
  if (action === "set-tlidb-help-scope" && state.overlay?.type === "tlidbHelp") {
    state.overlay = {
      ...state.overlay,
      scope: actionTarget.dataset.scope === "history" ? "history" : "current",
      query: "",
      selectedId: "",
    };
    render();
    focusOverlayEntry();
  }
  if (action === "select-tlidb-help" && state.overlay?.type === "tlidbHelp") {
    state.overlay = { ...state.overlay, selectedId: actionTarget.dataset.helpId ?? "" };
    render();
  }

  if (action === "divinity-instance-select") {
    selectDivinityEditorInstanceId(actionTarget.dataset.instanceId);
    return;
  }

  if (applyDivinityEditorTarget(actionTarget, DIVINITY_CLICK_ACTIONS)) return;
  if (action === "pact-slot-activate" && state.overlay?.type === "pact") {
    const slotIndex = Number(actionTarget.dataset.slotIndex);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= 3) return;
    state.pactEditorUi = { ...state.pactEditorUi, activeSlotIndex: slotIndex, ringSlotId: "", error: "" };
    render();
    focusOverlayEntry();
    return;
  }
  if (action === "pact-ring-activate" && state.overlay?.type === "pact") {
    const slotIndex = Number(actionTarget.dataset.slotIndex);
    const ringSlotId = actionTarget.dataset.ringSlotId;
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 2
      || ![...PACT_RING_SLOT_ORDER, "undetermined"].includes(ringSlotId)) return;
    state.pactEditorUi = { ...state.pactEditorUi, activeSlotIndex: slotIndex, ringSlotId, error: "" };
    render();
    focusOverlayEntry();
    return;
  }
  if (applyPactUndeterminedConfigTarget(actionTarget)) return;
  if (applyPactEditorTarget(actionTarget, PACT_CLICK_ACTIONS)) return;
  if (applyTalentEditorTarget(actionTarget)) return;

  if (action === "set-view") {
    state.currentSeasonOpen = false;
    state.view = actionTarget.dataset.view;
    state.overlay = null;
    state.statsDockOpen = false;
    render();
  }
  if (action === "toggle-sidebar") {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state.sidebarCollapsed ? "on" : "off");
    render();
    document.querySelector('[data-action="toggle-sidebar"]')?.focus();
  }
  if (action === "trait-filter") {
    state.traitFilter = actionTarget.dataset.filter;
    render();
  }
  if (action === "support-open-item" && itemId) {
    const item = findItemById(itemId);
    if (item) {
      state.view = "planner";
      state.detailItemId = itemId;
      openOverlay(item.categoryId, {
        categoryId: item.categoryId,
        ...(item.categoryId === "skills" ? { query: itemText(item).name } : {}),
      });
    }
  }
  if (action === "stat-tab") {
    activateStatTab(actionTarget.dataset.tab, { focus: true });
  }
  if (action === "analysis-find-gear-upgrades") {
    const slotIndex = Number(actionTarget.dataset.slotIndex);
    if (SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES.includes(slotIndex)) {
      state.analysisGearUpgrade = {
        slotIndex,
        buildKey: calculationInputKey(state.build),
        result: findGearSlotUpgrades(state.build, slotIndex),
      };
      render();
    }
  }
  if (action === "analysis-find-gear-slot-marginal") {
    const slotIndex = Number(actionTarget.dataset.slotIndex);
    if (SUPPORTED_GEAR_UPGRADE_SLOT_INDEXES.includes(slotIndex)) {
      state.analysisGearSlotMarginal = {
        slotIndex,
        buildKey: calculationInputKey(state.build),
        result: findGearSlotDpsMarginal(state.build, slotIndex),
      };
      render();
    }
  }
  if (action === "analysis-find-global-marginals") {
    state.analysisMarginal = {
      buildKey: calculationInputKey(state.build),
      result: findGlobalDpsMarginals(state.build),
    };
    render();
  }
  if (action === "analysis-find-skill-marginals") {
    const target = {
      rowIndex: Number(actionTarget.dataset.rowIndex),
      skillId: actionTarget.dataset.skillId ?? "",
    };
    state.analysisSkillMarginal = {
      target,
      buildKey: calculationInputKey(state.build),
      result: findSkillDpsMarginals(state.build, target),
    };
    render();
  }
  if (action === "analysis-apply-gear-upgrade") {
    const candidateIndex = Number(actionTarget.dataset.candidateIndex);
    const candidate = state.analysisGearUpgrade?.result?.candidates?.[candidateIndex];
    if (candidate) {
      state.analysisGearUpgrade = null;
      setBuild(candidate.nextBuild, ui("gearUpgradeApplied"));
    }
  }
  if (action === "stat-trace") {
    const statKey = actionTarget.dataset.statKey;
    const statScrollTop = document.querySelector(".stat-scroll")?.scrollTop ?? 0;
    const collapsing = state.expandedStatKey === statKey;
    state.expandedStatKey = state.expandedStatKey === statKey ? null : statKey;
    render();
    const nextStatScroll = document.querySelector(".stat-scroll");
    if (collapsing && nextStatScroll) nextStatScroll.scrollTop = statScrollTop;
    focusStatTraceButton(statKey);
  }
  if (action === "condition-clear") {
    clearConditionOverride(actionTarget.dataset.conditionPath);
  }
  if (action === "condition-group") {
    const group = actionTarget.dataset.group;
    if (!["enemy", "resources", "combat", "custom"].includes(group)) return;
    state.conditionGroup = group;
    refreshStatsDock();
    const panel = document.querySelector("#stats-panel-conditions");
    if (panel) panel.scrollTop = 0;
    document.querySelector(`.condition-group-tabs [data-group="${group}"]`)?.focus();
  }
  if (action === "condition-map-clear") {
    clearConditionMapOverride(actionTarget.dataset.conditionGroup, actionTarget.dataset.conditionKey);
  }
  if (action === "condition-map-add") {
    const group = actionTarget.dataset.conditionGroup;
    const kind = actionTarget.dataset.conditionKind;
    const row = actionTarget.closest(".condition-add-row");
    const key = row?.querySelector(".condition-new-key")?.value;
    const valueInput = row?.querySelector(".condition-new-value");
    const value = kind === "boolean" ? valueInput?.checked : Number(valueInput?.value);
    if (key && (kind !== "number" || Number.isFinite(value))) setConditionMapOverride(group, key, value);
  }
  if (action === "hero-level") {
    const delta = Number(actionTarget.dataset.delta);
    const heroLevel = Math.max(1, Math.min(100, Math.round(Number(state.build.heroLevel ?? 90) + delta)));
    setHeroLevel(heroLevel);
  }
  if (action === "hero-select" && itemId) {
    selectHeroBranch(itemId);
  }
  if (action === "hero-choose") {
    state.overlay = { type: "hero", mode: "choose" };
    state.query = "";
    state.catalogLimit = CATALOG_PAGE_SIZE;
    render();
    focusOverlayEntry();
  }
  if (action === "hero-remove") {
    resetSelectedHero();
  }
  if (action === "hero-trait-choice") {
    selectHeroTraitChoice(
      actionTarget.dataset.stage,
      actionTarget.dataset.group,
      actionTarget.dataset.choice,
    );
  }
  if (action === "hero-stage-activate") {
    const level = Number(actionTarget.dataset.stageLevel);
    if (![1, 45, 60, 75].includes(level)) return;
    state.heroTraitEditorUi.activeStageLevel = level;
    render();
    const stages = document.querySelector(".hero-trait-stages");
    if (stages) stages.scrollTop = 0;
    focusOverlayEntry();
  }
  if (action === "hero-trait-retry") {
    state.heroTraitRuntime = {
      status: "idle",
      model: null,
      previewModel: null,
      previewHeroes: [],
      supportByBranch: {},
      error: "",
    };
    heroTraitLoadPromise = null;
    void ensureHeroTraitModel();
  }
  if (action === "hero-memory-retry") {
    state.heroMemoryRuntime = { status: "idle", dataset: null, error: "" };
    state.heroMemoryDraft = null;
    heroMemoryLoadPromise = null;
    void ensureHeroMemoryDataset();
  }
  if (action === "divinity-editor-retry") {
    state.divinityRuntime = {
      status: "idle",
      divinityCatalog: null,
      hadesCatalog: null,
      sourceOnlyCatalog: null,
      sourceOnlySpecialSlateCatalog: null,
      metadata: null,
      error: "",
    };
    divinityLoadPromise = null;
    void ensureDivinityRuntime();
  }
  if (action === "divinity-editor-save" && state.overlay?.type === "divinity") {
    const board = currentDivinityBoard();
    const pendingResult = reduceDivinityEditorConfigTargets({
      divinityCatalog: state.divinityRuntime.divinityCatalog ?? [],
      hadesCatalog: state.divinityRuntime.hadesCatalog ?? [],
    }, board, document.querySelectorAll(
      '.divinity-editor-modal [data-command-type="divinity-slot-config-set"]',
    ));
    if (!pendingResult.ok) {
      state.divinityEditorUi = {
        ...state.divinityEditorUi,
        error: "입력한 명왕 계산 조건을 저장하지 못했습니다.",
      };
      render();
      return;
    }
    persistDivinityBoard(pendingResult.board, board.boardId, ui("divinityEditorSaved"));
  }
  if (action === "pact-editor-retry") {
    state.pactRuntime = { status: "idle", model: null, error: "" };
    pactLoadPromise = null;
    void ensurePactDestinyModel();
  }
  if (action === "talent-editor-retry") {
    state.talentRuntime = { status: "idle", model: null, error: "" };
    talentLoadPromise = null;
    void ensureTalentBoardModel();
  }
  if (action === "hero-memory-enhancement") {
    const enhancement = Number(actionTarget.dataset.enhancement);
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    if (dataset && memory && Number.isFinite(enhancement)) {
      updateHeroMemoryDraft(updateHeroMemoryProperties(memory, { enhancement }, dataset));
    }
  }
  if (action === "hero-memory-save") saveHeroMemoryDraft();
  if (action === "save-hero-memory-inventory") return saveHeroMemoryDraftToInventory();
  if (action === "hero-memory-remove") removeHeroMemory(state.heroMemoryDraft?.slotIndex);
  if (action === "store-divinity-slate-inventory") {
    return storeDivinitySlateInventory(actionTarget.dataset.instanceId);
  }
  if (action === "store-prism-inventory") {
    return storePrismInventory(actionTarget.dataset.instanceId);
  }
  if (action === "calc-panel-damage" || action === "custom-affixes-calculate") {
    if (action === "custom-affixes-calculate") state.statsDockOpen = true;
    calculateCurrentBuild();
    if (action === "custom-affixes-calculate") document.querySelector("#stats-tab-calculation")?.focus();
  }
  if (action === "open-skill-summary-picker") {
    const supportIndex = actionTarget.dataset.supportIndex;
    openSkillSummaryPicker(
      actionTarget.dataset.kind,
      Number(actionTarget.dataset.rowIndex),
      supportIndex === undefined ? null : Number(supportIndex),
    );
  }
  if (action === "select-skill-row") {
    const rowIndex = Number(actionTarget.dataset.rowIndex);
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 8) return;
    state.activeSkillRow = rowIndex;
    render();
    document.getElementById(`skill-loadout-tab-${rowIndex}`)?.focus({ preventScroll: true });
  }
  if (action === "open-overlay") {
    openOverlay(actionTarget.dataset.overlay, {
      categoryId: actionTarget.dataset.category,
      slotIndex: actionTarget.dataset.slotIndex,
      ringSlotId: actionTarget.dataset.ringSlotId,
      stageLevel: actionTarget.dataset.stageLevel,
      filter: actionTarget.dataset.filter,
      mode: actionTarget.dataset.mode,
    });
  }
  if (action === "compare-saved" && buildId) {
    const saved = state.savedBuilds.find((build) => build.id === buildId);
    if (saved) {
      state.overlay = { type: "compare", buildId };
      render();
      focusOverlayEntry();
    }
  }
  if (action === "compare-back" && state.overlay?.type === "compare") {
    state.overlay = { type: "saves" };
    render();
    focusOverlayEntry();
  }
  if (action === "compare-filter" && state.overlay?.type === "compare") {
    state.overlay.changedOnly = actionTarget.dataset.filter === "changed";
    render();
    document.querySelector(`[data-action="compare-filter"][data-filter="${state.overlay.changedOnly ? "changed" : "all"}"]`)?.focus({ preventScroll: true });
  }
  if (action === "screenshot-category" && state.overlay?.type === "screenshot") {
    const categoryId = actionTarget.dataset.category;
    if (SCREENSHOT_MATCH_CATEGORIES.includes(categoryId)) {
      state.screenshotImport.categoryId = categoryId;
      render();
      document.querySelector(`#screenshot-tab-${categoryId}`)?.focus({ preventScroll: true });
    }
  }
  if (action === 'toggle-screenshot-value' && state.overlay?.type === 'screenshot') {
    const report = state.screenshotImport;
    const value = report?.values.find(value => value.id === actionTarget.dataset.valueId && value.status === 'recognized');
    if (value && resolveScreenshotCraftCandidate(value)) {
      report.selectedValueIds = report.selectedValueIds.includes(value.id)
        ? report.selectedValueIds.filter(id => id !== value.id) : [...report.selectedValueIds, value.id];
      actionTarget.setAttribute?.('aria-checked', String(report.selectedValueIds.includes(value.id)));
    }
  }
  if (['recognize-screenshot-region', 'recognize-screenshot-full'].includes(action) && state.screenshotImport?.status !== 'loading') {
    const report = state.screenshotImport;
    const region = action === 'recognize-screenshot-region' ? normalizeScreenshotRegion(report?.region ?? { x: 0, y: 0, width: 1, height: 1 }) : null;
    if (report?.file && (action === 'recognize-screenshot-full' || region)) void importFromScreenshot(report.file, region);
    else if (report?.file) {
      report.cropOpen = true;
      showNotice('인식 영역의 너비와 높이를 2% 이상으로 지정하세요.');
      render();
    }
  }
  if (action === "apply-screenshot-match" && itemId) {
    const item = findItemById(itemId);
    const slotIndex = Number(actionTarget.dataset.slotIndex);
    if (item?.categoryId === "gear") {
      const result = applyScreenshotGearMatch(state.build, item.id, slotIndex);
      if (result.status === "applied") {
        result.build = applyScreenshotGearValues(result.build, item, slotIndex, selectedScreenshotValues(item.id), state.gearLocaleRuntime.registry);
        applyScreenshotBuild(result.build, ui("screenshotAppliedToSlot", {
          name: itemText(item).name,
          slot: ui(slotKeyForGearIndex(slotIndex)),
        }), actionTarget);
      } else {
        showNotice(ui("screenshotTargetRequired"));
        render();
      }
    }
  }
  if (action === "apply-screenshot-skill" && itemId) {
    const item = findItemById(itemId);
    const model = state.skillRuntime.status === "ready" && state.skillRuntime.model
      ? excludeSs13PreviewSkillRuntimeModel(state.skillRuntime.model)
      : null;
    const kind = actionTarget.dataset.kind;
    const rowIndex = Number(actionTarget.dataset.rowIndex);
    const result = item?.categoryId === "skills" && model
      ? applyScreenshotSkillMatch(state.build, model, item.id, kind, rowIndex, selectedScreenshotValues(item.id).find(value => value.kind === 'skill-level')?.value ?? null)
      : { status: "skill-runtime-unavailable", build: state.build };
    if (result.status === "applied") {
      const slotLabel = ui(kind === "active" ? "skillActiveNumber" : "skillPassiveNumber", {
        index: rowIndex + 1,
      });
      applyScreenshotBuild(result.build, ui("screenshotAppliedToSkillSlot", {
        name: itemText(item).name,
        slot: slotLabel,
      }), actionTarget);
    } else {
      showNotice(ui("screenshotTargetRequired"));
      render();
    }
  }
  if (action === "apply-screenshot-support" && itemId) {
    const item = findItemById(itemId);
    const model = state.skillRuntime.status === "ready" && state.skillRuntime.model
      ? excludeSs13PreviewSkillRuntimeModel(state.skillRuntime.model)
      : null;
    const kind = actionTarget.dataset.kind;
    const rowIndex = Number(actionTarget.dataset.rowIndex);
    const supportIndex = Number(actionTarget.dataset.supportIndex);
    const result = item?.categoryId === "supports" && model
      ? applyScreenshotSupportMatch(
          state.build,
          model,
          item.id,
          kind,
          rowIndex,
          supportIndex,
          selectedScreenshotValues(item.id).find(value => value.kind === 'skill-level')?.value ?? null,
        )
      : { status: "support-runtime-unavailable", build: state.build };
    if (result.status === "applied") {
      const hostLabel = ui(kind === "active" ? "skillActiveNumber" : "skillPassiveNumber", {
        index: rowIndex + 1,
      });
      const slotLabel = ui("screenshotSupportSlot", { host: hostLabel, index: supportIndex + 1 });
      applyScreenshotBuild(result.build, ui("screenshotAppliedToSkillSlot", {
        name: itemText(item).name,
        slot: slotLabel,
      }), actionTarget);
    } else {
      showNotice(ui("screenshotSupportTargetUnavailable"));
      render();
    }
  }
  if (action === "configure-screenshot-talent" && itemId) {
    void configureScreenshotTalent(itemId, Number(actionTarget.dataset.boardIndex));
  }
  if (action === "configure-screenshot-memory" && itemId) {
    void configureScreenshotHeroMemory(itemId, Number(actionTarget.dataset.slotIndex));
  }
  if (
    action === "inventory-tab"
      && ["gear", "heroMemory", "divinitySlate", "prism"].includes(actionTarget.dataset.tab)
  ) {
    state.inventoryTab = actionTarget.dataset.tab;
    state.query = "";
    render();
    focusOverlayEntry();
    if (state.inventoryTab === "gear" && unifiedInventoryRecords("gear").length) {
      void ensureGearLocaleRegistry();
    }
    if (state.inventoryTab === "heroMemory") void ensureHeroMemoryDataset();
    if (state.inventoryTab === "divinitySlate") void ensureDivinityRuntime();
    if (state.inventoryTab === "prism") void ensureTalentBoardModel();
  }
  if (action === "close-overlay") {
    closeOverlay();
  }
  if (action === "find-gear-upgrades" && state.pendingSlot?.categoryId === "gear") {
    state.gearUpgradeResult = findGearSlotUpgrades(state.build, state.pendingSlot.index);
    render();
    document.querySelector('[data-action="find-gear-upgrades"]')?.focus();
  }
  if (action === "apply-gear-upgrade") {
    const candidateIndex = Number(actionTarget.dataset.candidateIndex);
    const candidate = state.gearUpgradeResult?.candidates?.[candidateIndex];
    if (candidate) {
      state.gearUpgradeResult = null;
      setBuild(candidate.nextBuild, ui("gearUpgradeApplied"));
    }
  }
  if (action === "gear-filter") {
    state.gearFilter = actionTarget.dataset.filter;
    state.catalogLimit = CATALOG_PAGE_SIZE;
    render();
    document.querySelector(`.equipment-cats button[data-filter="${state.gearFilter}"]`)?.focus();
  }
  if (action === "show-more") {
    state.catalogLimit += CATALOG_PAGE_SIZE;
    render();
    document.querySelector('[data-action="show-more"]')?.focus();
  }
  if (action === "focus-detail" && itemId) {
    state.detailItemId = itemId;
    render();
  }
  if (action === "skill-detail-runtime-toggle" && itemId) {
    toggleRuntimeSkillFromDetail(itemId);
  }
  if (action === "toggle" && itemId) toggleItem(itemId);
  if (action === "remove-slot") {
    removeSlot(actionTarget.dataset.category, Number(actionTarget.dataset.slotIndex));
  }
  if (action === "save-gear-inventory" && itemId) {
    const item = findItemById(itemId);
    if (item) {
      const slotIndex = getGearSlotIndex(itemId);
      const record = createGearInventoryRecord(state.build, itemId, slotIndex, itemText(item).name);
      return changeInventory(() => saveGearInventoryRecord(record), "savedGearToInventory");
    }
  }
  if (action === "toggle-gear-craft" && itemId) {
    const item = findItemById(itemId);
    const affix = item?.craftAffixes?.find((candidate) => candidate.affixId === actionTarget.dataset.affix);
    const tier = affix?.tierOptions?.[0];
    if (item && affix && affix.selectionSupported !== false && tier) {
      setBuild(updateGearInstanceValue(
        state.build,
        item.id,
        "crafts",
        "gearCrafts",
        {},
        (current) => {
          const itemCrafts = { ...(current ?? {}) };
          if (Object.hasOwn(itemCrafts, affix.affixId)) delete itemCrafts[affix.affixId];
          else {
            itemCrafts[affix.affixId] = {
              tierId: tier.tierId,
              rolls: Object.fromEntries((tier.rollDefs ?? []).map((roll) => [roll.key, roll.max])),
            };
          }
          return itemCrafts;
        },
      ));
    }
  }
  if (action === "apply-gear-inventory") {
    const record = state.gearInventory.find((candidate) => candidate.id === actionTarget.dataset.record);
    if (record) setBuild(applyGearInventoryRecord(state.build, record), ui("equippedInventoryRecord"));
  }
  if (action === "delete-gear-inventory") {
    return changeInventory(() => deleteGearInventoryRecord(actionTarget.dataset.record), "deletedInventoryRecord");
  }
  if (action === "apply-hero-memory-inventory") {
    const record = state.heroMemoryInventory.find(
      (candidate) => candidate.id === actionTarget.dataset.record,
    );
    if (record) applyHeroMemoryInventoryRecord(record);
  }
  if (action === "delete-hero-memory-inventory") {
    return changeInventory(() => deleteHeroMemoryInventoryRecord(actionTarget.dataset.record), "deletedHeroMemoryInventory");
  }
  if (action === "apply-unified-inventory") {
    const record = state.unifiedInventory.find((candidate) => (
      candidate.id === actionTarget.dataset.record
        && candidate.kind === actionTarget.dataset.kind
    ));
    applyUnifiedInventorySelection(record);
  }
  if (action === "delete-unified-inventory") {
    return changeInventory(() => deleteUnifiedInventoryRecord(
      actionTarget.dataset.record,
      actionTarget.dataset.kind,
    ), "deletedInventoryRecord");
  }
  if (action === "skill-runtime-retry") {
    state.skillRuntime = { status: "idle", model: null, error: "" };
    state.skillPicker = null;
    skillRuntimeLoadPromise = null;
    void ensureSkillRuntimeModel();
  }
  if (action === "skill-runtime-main-picker") {
    openSkillRuntimePicker(actionTarget.dataset.kind, Number(actionTarget.dataset.rowIndex));
  }
  if (action === "skill-editor-row") {
    const rowIndex = Number(actionTarget.dataset.rowIndex);
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex > 8) return;
    state.activeSkillRow = rowIndex;
    state.skillPicker = null;
    render();
    document.querySelector(`[data-action="skill-editor-row"][data-row-index="${rowIndex}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (action === "skill-runtime-support-picker") {
    openSkillRuntimePicker(
      actionTarget.dataset.kind,
      Number(actionTarget.dataset.rowIndex),
      Number(actionTarget.dataset.supportIndex),
    );
  }
  if (action === "skill-picker-close") {
    state.skillPicker = null;
    render();
  }
  if (action === "skill-picker-catalog" && state.skillPicker) {
    state.skillPicker = { ...state.skillPicker, catalogOpen: true };
    render();
    restoreInputFocus("skillRuntimeSearch");
  }
  if (action === "ingame-core-page" && state.overlay?.type === "talentEditor") {
    const groupIndex = Number(actionTarget.dataset.groupIndex);
    if (Number.isInteger(groupIndex) && groupIndex >= 0 && groupIndex < 2) {
      state.talentEditorUi = { ...state.talentEditorUi, coreGroupIndex: groupIndex };
      render();
    }
  }
  if (action === "skill-picker-tags-clear" && state.skillPicker) {
    state.skillPicker = { ...state.skillPicker, tags: [] };
    render();
  }
  if (action === "skill-picker-tag") {
    const tag = actionTarget.dataset.tag;
    const tags = new Set(state.skillPicker?.tags ?? []);
    if (tags.has(tag)) tags.delete(tag);
    else tags.add(tag);
    if (state.skillPicker) state.skillPicker = { ...state.skillPicker, tags: [...tags] };
    render();
  }
  if (action === "skill-runtime-card-toggle" && itemId && state.skillPicker) {
    const model = state.skillRuntime.model;
    if (model) {
      const collapse = state.skillPicker.expandedItemId === itemId;
      state.skillPicker = {
        ...state.skillPicker,
        expandedItemId: collapse ? null : itemId,
      };
      render();
    }
  }
  if (action === "skill-runtime-support-details" && itemId && state.skillPicker) {
    const details = new Set(state.skillPicker.detailItemIds ?? []);
    if (details.has(itemId)) details.delete(itemId);
    else details.add(itemId);
    state.skillPicker = { ...state.skillPicker, detailItemIds: [...details] };
    render();
  }
  if (action === "skill-runtime-card-level" && itemId && state.skillPicker) {
    const model = state.skillRuntime.model;
    if (model) {
      const skills = normalizeCurrentSkillRuntimeState(model);
      setSkillRuntimePickerLevel(
        itemId,
        skillRuntimePickerItemLevel(skills, state.skillPicker, itemId) + Number(actionTarget.dataset.delta),
      );
    }
  }
  if (action === "skill-runtime-card-confirm" && itemId) confirmSkillRuntimePickerItem(itemId);
  if (action === "skill-runtime-card-remove" && itemId && state.skillPicker) {
    const model = state.skillRuntime.model;
    const picker = state.skillPicker;
    if (model) {
      if (picker.supportIndex === null) {
        clearSkillRuntimeDrafts();
        state.skillPicker = { ...picker, expandedItemId: null };
        persistSkillRuntimeState(updateMainSkill(
          model,
          state.build.skills,
          picker.kind,
          picker.rowIndex,
          null,
          skillRuntimeUpdateOptions(),
        ));
      } else {
        const result = updateSkillSupport(
          model,
          state.build.skills,
          picker.kind,
          picker.rowIndex,
          picker.supportIndex,
          null,
          undefined,
          skillRuntimeUpdateOptions(),
        );
        clearSkillRuntimeDrafts();
        state.skillPicker = { ...picker, expandedItemId: null };
        persistSkillRuntimeState(result.state);
      }
    }
  }
  if (action === "skill-runtime-main-remove") {
    selectSkillRuntimeMain(actionTarget.dataset.kind, Number(actionTarget.dataset.rowIndex), null);
  }
  if (action === "skill-runtime-support-remove") {
    selectSkillRuntimeSupport(
      actionTarget.dataset.kind,
      Number(actionTarget.dataset.rowIndex),
      Number(actionTarget.dataset.supportIndex),
      null,
    );
  }
  if (action === "skill-runtime-unlock") {
    const model = state.skillRuntime.model;
    const kind = actionTarget.dataset.kind;
    const rowIndex = Number(actionTarget.dataset.rowIndex);
    const collection = kind === "passive" ? "passive" : "active";
    if (model) {
      const skills = normalizeCurrentSkillRuntimeState(model);
      const current = skills[collection]?.[rowIndex]?.unlockedSupportCount ?? 0;
      const result = updateUnlockedSupportCount(
        model,
        skills,
        kind,
        rowIndex,
        current + Number(actionTarget.dataset.delta),
        skillRuntimeUpdateOptions(),
      );
      if (result.status === "energy-limit") showNotice(ui("skillEnergyLimit"));
      persistSkillRuntimeState(result.state);
    }
  }
  if (action === "skill-elixir-clear") {
    const model = state.skillRuntime.model;
    const elixirIndex = Number(actionTarget.dataset.elixirIndex);
    if (model) {
      const skills = normalizeCurrentSkillRuntimeState(model);
      skills.elixirs[elixirIndex] = null;
      persistSkillRuntimeState(skills);
    }
  }
  if (action === "skill-level") {
    const index = Number(actionTarget.dataset.index);
    const delta = Number(actionTarget.dataset.delta);
    const skillLevels = [...(state.build.skillLevels ?? [])];
    skillLevels[index] = clampSkillLevel((skillLevels[index] ?? 0) + delta);
    setBuild({ ...state.build, skillLevels });
  }
  if (action === "skill-seal") {
    const key = actionTarget.dataset.key;
    const delta = Number(actionTarget.dataset.delta);
    if (key === "life" || key === "mana") {
      const skillSeals = {
        ...(state.build.skillSeals ?? { life: 0, mana: 0 }),
        [key]: Math.max(0, Math.round(Number(state.build.skillSeals?.[key] ?? 0) + delta)),
      };
      setBuild({ ...state.build, skillSeals });
    }
  }
  if (action === "skill-reset") {
    state.skillPicker = null;
    clearSkillRuntimeDrafts();
    if (state.skillRuntime.model) persistSkillRuntimeState(createDefaultSkillState());
    else setBuild({ ...state.build, skillLevels: [], skillSeals: { life: 0, mana: 0 } });
  }
  if (action === "save") {
    void saveCurrentBuildSnapshot();
  }
  if (action === "export") {
    void exportCurrentBuildDocument();
  }
  if (action === "export-91tob") void exportCurrentBuildFor91Tob();
  if (action === "import") document.querySelector("#importInput").click();
  if (action === "import-screenshot") document.querySelector("#screenshotInput").click();
  if (action === "reset") requestBuildReplacement("reset");
  if (action === "confirm-replace") {
    const request = state.overlay;
    state.overlay = null;
    if (request?.command === "reset") {
      setBuild(createDefaultBuild(state.locale), ui("resetBuild"));
    }
  }
  if (action === "load-saved" && buildId) {
    const saved = state.savedBuilds.find((build) => build.id === buildId);
    if (saved) {
      state.overlay = null;
      state.pendingSlot = null;
      state.query = "";
      setBuild(saved, `${saved.name} ${ui("loadedSuffix")}`);
      const restoreLoadButtonFocus = () => {
        document.querySelector('[data-action="open-overlay"][data-overlay="saves"]')
          ?.focus({ preventScroll: true });
      };
      restoreLoadButtonFocus();
      if (buildHasTalentBoardState()) {
        void ensureTalentBoardModel().then(restoreLoadButtonFocus);
      }
    }
  }
  if (action === "delete-saved" && buildId) {
    state.savedBuilds = deleteSavedBuild(buildId);
    showNotice(ui("deletedSavedBuild"));
    render();
  }
}

app.addEventListener("focusin", (event) => {
  if (!pendingCustomAffixFocus || event.target?.id === pendingCustomAffixFocus.inputId) return;
  const snapshot = captureInteractiveFocus(event.target);
  if (snapshot) pendingCustomAffixAlternateFocus = snapshot;
});

app.addEventListener("focusout", (event) => {
  if (seasonPlanner.active) { seasonPlanner.blur(event); return; }
  commitConditionControlTarget(event.target);
});

app.addEventListener("click", (event) => {
  const action = event.target.closest?.("[data-action]")?.dataset.action;
  if (action === "open-ss14-main") { seasonPlanner.active = true; seasonPlanner.render(app); return; }
  if (seasonPlanner.active) {
    if (["open-preserved-build", "open-current-season"].includes(action)) {
      try { if (seasonPlanner.state.dirty || seasonPlanner.state.pending.size) seasonPlanner.save(); }
      catch (error) { seasonPlanner.state.error = error.message; seasonPlanner.render(app); return; }
      seasonPlanner.active = false;
      initializeLegacyRuntime();
    } else { seasonPlanner.click(event); return; }
  }
  const fileMenu = document.querySelector(".build-file-menu[open]");
  if (fileMenu && (event.target.closest("[data-action]") || !event.target.closest(".build-file-menu"))) {
    fileMenu.open = false;
  }
  if (!event.target.closest("[data-action]") && selectDivinityEditorInstance(event.target)) return;
  return handleAction(event.target);
});

let screenshotDrag = null;
app.addEventListener('pointerdown', event => {
  const surface = event.target.closest?.('[data-role="screenshot-crop-surface"]');
  if (!surface || state.screenshotImport?.status === 'loading') return;
  const rect = surface.getBoundingClientRect();
  screenshotDrag = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, surface };
  surface.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});
app.addEventListener('pointerup', event => {
  if (!screenshotDrag) return;
  const { x, y, surface } = screenshotDrag;
  screenshotDrag = null;
  const rect = surface.getBoundingClientRect();
  const endX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const endY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  const region = normalizeScreenshotRegion({ x: Math.min(x, endX), y: Math.min(y, endY), width: Math.abs(endX - x), height: Math.abs(endY - y) });
  if (region && state.screenshotImport) {
    state.screenshotImport.region = region;
    state.screenshotImport.cropOpen = true;
    const scrollTop = document.querySelector('.screenshot-body')?.scrollTop ?? 0;
    render();
    const body = document.querySelector('.screenshot-body');
    if (body) body.scrollTop = scrollTop;
  }
});
app.addEventListener('pointercancel', () => { screenshotDrag = null; });

app.addEventListener("input", (event) => {
  if (seasonPlanner.active) { seasonPlanner.input(event); return; }
  if (event.target.dataset?.seasonFilter) {
    const id = event.target.dataset.seasonFilter;
    const select = document.getElementById(id);
    if (!select) return;
    const count = filterSeasonSelection(select, event.target.value);
    const status = document.querySelector(`[data-season-filter-status="${id}"]`);
    if (status) {
      status.hidden = !event.target.value.trim();
      status.textContent = count ? `검색 결과 ${count}개 · 현재 선택은 유지됩니다.` : "검색 결과가 없습니다. 검색어를 지우면 전체 목록이 표시됩니다.";
    }
    return;
  }
  const regionKey = event.target.dataset?.screenshotRegion;
  if (['x', 'y', 'width', 'height'].includes(regionKey) && state.screenshotImport) {
    const region = { x: 0, y: 0, width: 1, height: 1, ...state.screenshotImport.region };
    region[regionKey] = event.target.value === '' ? NaN : Number(event.target.value) / 100;
    state.screenshotImport.region = region;
    const surface = document.querySelector('[data-role="screenshot-crop-surface"]');
    const selection = normalizeScreenshotRegion(region);
    if (surface && selection) {
      let box = surface.querySelector('.screenshot-crop-box');
      if (!box) {
        box = document.createElement('span');
        box.className = 'screenshot-crop-box';
        surface.append(box);
      }
      Object.assign(box.style, { left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` });
    }
    return;
  }
  if (event.target.id === "seasonWorkspaceImport") {
    state.advisorWorkspaceImportText = event.target.value;
    return;
  }
  if (event.target.dataset?.seasonEdit) {
    const field = event.target.dataset;
    const key = field.key ? `${field.seasonEdit}:${field.key}` : field.seasonEdit === "name" ? "name" : field.seasonEdit === "skill-level"
      ? `skill-level:${field.row}` : field.seasonEdit === "support-level" ? `support-level:${field.row}:${field.support}` : field.seasonEdit === "hero-tier" ? `hero-tier:${field.choice}` : `gear-roll:${field.slot}:${field.roll}`;
    state.advisorWorkspaceFormValues[key] = event.target.value;
    state.advisorWorkspaceInputStale = true;
    const status = document.querySelector('[data-role="season-workspace-status"]');
    if (status) status.textContent = "입력이 바뀌었습니다. 다시 계산해야 합니다.";
    const result = document.querySelector('[data-role="season-workspace-result"]');
    if (result) result.hidden = true;
    const staleResult = document.querySelector('[data-role="season-result-stale"]');
    if (staleResult) staleResult.hidden = false;
    const recommendation = document.querySelector('[data-role="season-advisor-result"]');
    if (recommendation) recommendation.hidden = true;
    for (const button of document.querySelectorAll('[data-action="advisor-copy-workspace-candidate"], [data-action="advisor-recommend-workspaces"]')) button.disabled = true;
    return;
  }
  if (event.target.id === "upgradeWeightCategory") {
    const number = (id) => { const value = document.getElementById(id)?.value?.trim(); return value ? Number(value) : ""; };
    state.advisorPreferences.weightResearch = { categoryId: event.target.value, targetId: "",
      itemLevel: number("upgradeWeightLevel"), attemptCost: number("upgradeWeightCost") };
    state.advisorPreferences.weightResearchRequested = false;
    try { localStorage.setItem("tob.advisor.v1", JSON.stringify(state.advisorPreferences)); }
    catch { state.advisorError = "설정을 저장하지 못했습니다. 저장 공간을 확인하세요."; }
    render();
    focusAdvisorResult("#upgradeWeightCategory");
    return;
  }
  if (["upgradeWeightTarget", "upgradeWeightLevel", "upgradeWeightCost"].includes(event.target.id)) {
    const result = document.querySelector('[data-role="upgrade-weight-result"]');
    if (result) result.textContent = "입력이 바뀌었습니다. 원문 가중치로 다시 계산하세요.";
    return;
  }
  if (event.target.id?.startsWith("advisor") || event.target.dataset?.advisorPrice !== undefined
    || event.target.dataset?.advisorOwned !== undefined || event.target.dataset?.advisorCost !== undefined) {
    const target = event.target;
    const preferences = state.advisorPreferences;
    if (target.id === "advisorBudget") preferences.budget = target.value.trim() === "" ? null : Number(target.value);
    if (target.id === "advisorCurrency") preferences.currency = target.value.slice(0, 30);
    if (target.id === "advisorSlot") preferences.slotIndex = Number(target.value);
    if (target.id === "advisorCompareBuild") preferences.compareId = target.value;
    const recordId = target.dataset?.advisorPrice ?? target.dataset?.advisorOwned ?? target.dataset?.advisorCost;
    if (recordId !== undefined) {
      const previous = Object.hasOwn(preferences.quotes, recordId) ? preferences.quotes[recordId] : { owned: true, price: "" };
      const costField = target.dataset?.costField;
      const costChange = target.dataset.advisorCost !== undefined && ["mode", "kind", "confirmed", "successPercent", "basePrice", "materialPrice"].includes(costField)
        ? { costScenario: { ...previous.costScenario, [costField]: costField === "confirmed" ? target.checked
          : ["mode", "kind"].includes(costField) ? target.value : target.value.trim() === "" ? "" : Number(target.value) }, updatedAt: new Date().toISOString() } : null;
      preferences.quotes = { ...preferences.quotes, [recordId]: { ...previous, ...(costChange ??
        (target.dataset.advisorOwned !== undefined ? { owned: target.checked } : {
          price: target.value.trim() === "" ? "" : Number(target.value), updatedAt: new Date().toISOString() })) } };
    }
    state.advisorResult = null;
    state.advisorComparison = null;
    const resultNode = document.querySelector('[data-role="advisor-recommendation"]');
    if (resultNode) resultNode.textContent = "조건이 바뀌었습니다. 후보를 다시 평가하세요.";
    try { localStorage.setItem("tob.advisor.v1", JSON.stringify(preferences)); }
    catch { state.advisorError = "설정을 저장하지 못했습니다. 저장 공간을 확인하세요."; }
    return;
  }
  if (applyPactSourceFilterTarget(event.target)) return;
  // Keep the native input and focus intact until the whole number is committed.
  if (PACT_ROLL_ACTIONS.has(event.target?.dataset?.action)) return;

  if (event.target.classList.contains("skill-modularization-ailment-count")) {
    if (event.target.value === "") {
      clearConditionOverride("enemy.ailmentCount");
      render();
      return;
    }
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value >= 0) {
      setConditionOverride("enemy.ailmentCount", value);
      render();
    }
    return;
  }

  if (event.target.classList.contains("skill-modularization-surge-distance")) {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value >= 0) {
      setConditionOverride("recent.moveDistanceMeters", value);
      render();
    }
    return;
  }

  if (event.target.classList.contains("skill-modularization-summon-count")) {
    const model = state.skillRuntime.model;
    const value = event.target.value === "" ? "" : Number(event.target.value);
    if (model && (value === "" || Number.isFinite(value))) {
      persistSkillRuntimeState(updateMainSkillModularizationSummonCount(
        model,
        state.build.skills,
        event.target.dataset.kind,
        Number(event.target.dataset.rowIndex),
        value,
        skillRuntimeUpdateOptions(),
      ));
    }
    return;
  }

  if (event.target.classList.contains("skill-runtime-config-roll-input")) {
    transformSkillRuntimePickerConfig(event.target.dataset.item, (support, config) => (
      updateSupportRuntimeConfigRoll(support, config, event.target.dataset.control, event.target.value)
    ));
    return;
  }

  if (event.target.classList.contains("hero-memory-roll-input")) {
    // Keep the range element alive throughout a drag; commit the draft on change.
    const output = event.target.closest?.("label")?.querySelector("output");
    if (output) output.textContent = event.target.value;
    return;
  }

  if (event.target.id === "skillRuntimeSearch" && state.skillPicker) {
    state.skillPicker = {
      ...state.skillPicker,
      query: event.target.value,
    };
    render();
    restoreInputFocus("skillRuntimeSearch");
    return;
  }

  if (event.target.id === "buildName") {
    state.build = persistCurrentBuild({ ...state.build, name: event.target.value });
  }

  if (event.target.id === "saveAsName") {
    state.saveAsName = event.target.value;
  }

  if (event.target.id === "heroMemoryInventoryLabel") {
    state.heroMemoryInventoryLabel = event.target.value;
  }

  if (event.target.id === "searchInput") {
    state.query = event.target.value;
    state.catalogLimit = CATALOG_PAGE_SIZE;
    render();
    restoreInputFocus("searchInput");
  }

  if (event.target.id === "traitSupportSearch") {
    state.traitQuery = event.target.value;
    render();
    restoreInputFocus("traitSupportSearch");
  }

  if (event.target.id === "tlidbHelpSearch" && state.overlay?.type === "tlidbHelp") {
    state.overlay = {
      ...state.overlay,
      query: event.target.value,
      selectedId: "",
    };
    render();
    restoreInputFocus("tlidbHelpSearch");
  }

  if (event.target.id === "customAffixes") {
    const sourceValue = event.target.value;
    const storedValue = localizeCustomAffixInput(event.target, sourceValue);
    state.build = persistCurrentBuild({ ...state.build, customAffixes: storedValue });
    markCalculationStale();
    refreshStatsDock();
  }

  if (["researchSeason", "researchSources", "researchNotes"].includes(event.target.id)) {
    const current = state.build.research ?? { season: "", sources: [], notes: "" };
    const research = {
      ...current,
      ...(event.target.id === "researchSeason" ? { season: event.target.value } : {}),
      ...(event.target.id === "researchSources" ? {
        sources: event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      } : {}),
      ...(event.target.id === "researchNotes" ? { notes: event.target.value } : {}),
    };
    state.build = persistCurrentBuild({ ...state.build, research });
    // Preserve the native textarea, including a trailing newline and IME composition.
    if (event.target.id === "researchSources") {
      const preview = document.querySelector("#researchSourcePreview");
      if (preview) preview.innerHTML = renderResearchSourcePreview(research.sources);
    }
    return;
  }

  if (event.target.id === "gearAffixEditor") {
    const itemId = event.target.dataset.item;
    if (itemId) {
      const sourceValue = event.target.value;
      const storedValue = localizeCustomAffixInput(event.target, sourceValue);
      state.build = persistCurrentBuild(updateGearInstanceValue(
        state.build,
        itemId,
        "affixText",
        "gearAffixes",
        "",
        () => storedValue,
      ));
      markCalculationStale();
      refreshStatsDock();
    }
  }

  if (event.target.classList.contains("gear-roll-input") || event.target.classList.contains("gear-tooltip-roll-input")) {
    const itemId = event.target.dataset.item;
    const rollId = event.target.dataset.roll;
    const value = Number(event.target.value);
    if (itemId && rollId && Number.isFinite(value)) {
      state.build = persistCurrentBuild(updateGearInstanceValue(
        state.build,
        itemId,
        "rolls",
        "gearRolls",
        {},
        (current) => {
          const next = { ...(current ?? {}) };
          if (event.target.value === "") delete next[rollId];
          else next[rollId] = value;
          return next;
        },
      ));
      const valueLabel = event.target.nextElementSibling;
      if (valueLabel) valueLabel.textContent = formatStat(value, "");
      markCalculationStale();
      refreshStatsDock();
    }
  }

  if (event.target.classList.contains("gear-craft-roll-input")) {
    const itemId = event.target.dataset.item;
    const affixId = event.target.dataset.affix;
    const tierId = event.target.dataset.tier;
    const rollKey = event.target.dataset.roll;
    const value = Number(event.target.value);
    const item = itemId ? findItemById(itemId) : null;
    const affix = item?.craftAffixes?.find((candidate) => candidate.affixId === affixId);
    const itemCrafts = itemId
      ? getGearInstanceValue(itemId, "crafts", "gearCrafts", {})
      : null;
    if (
      itemId
      && affixId
      && tierId
      && rollKey
      && Number.isFinite(value)
      && affix?.selectionSupported !== false
      && itemCrafts
      && Object.hasOwn(itemCrafts, affixId)
    ) {
      state.build = persistCurrentBuild(updateGearInstanceValue(
        state.build,
        itemId,
        "crafts",
        "gearCrafts",
        {},
        (current) => ({
          ...(current ?? {}),
          [affixId]: {
            tierId,
            rolls: {
              ...(current?.[affixId]?.rolls ?? {}),
              [rollKey]: value,
            },
          },
        }),
      ));
      const valueLabel = event.target.nextElementSibling;
      if (valueLabel) valueLabel.textContent = formatStat(value, event.target.dataset.suffix ?? "");
      markCalculationStale();
      refreshStatsDock();
    }
  }
});

app.addEventListener("change", async (event) => {
  if (seasonPlanner.active) { seasonPlanner.change(event); return; }
  if (event.target.dataset?.screenshotCraftChoice && state.overlay?.type === 'screenshot') {
    const report = state.screenshotImport;
    const value = report.values.find(value => value.id === event.target.dataset.screenshotCraftChoice && value.kind === 'gear-craft');
    if (value) {
      const index = event.target.value === '' ? -1 : Number(event.target.value);
      value.choiceIndex = Number.isInteger(index) && value.choices[index] ? index : -1;
      report.selectedValueIds = report.selectedValueIds.filter(id => id !== value.id);
      const scrollTop = document.querySelector('.screenshot-body')?.scrollTop ?? 0;
      render();
      const body = document.querySelector('.screenshot-body');
      if (body) body.scrollTop = scrollTop;
      document.querySelector(`[data-screenshot-craft-choice="${value.id}"]`)?.focus({ preventScroll: true });
    }
    return;
  }
  if (applyDivinityEditorTarget(event.target, DIVINITY_CHANGE_ACTIONS)) return;
  if (applyPactEditorTarget(event.target, PACT_CHANGE_ACTIONS)) return;
  if (applyPactEditorTarget(event.target, PACT_ROLL_ACTIONS)) return;
  if (applyTalentEditorTarget(event.target)) return;

  if (event.target.id === "calculationSkillTarget") {
    const slotIndex = event.target.value === "" ? null : Number(event.target.value);
    const row = Number.isInteger(slotIndex)
      ? getEquippedActiveSkillRows().find((candidate) => candidate.rowIndex === slotIndex)
      : null;
    if (row && state.build.calculation?.selectedSkill?.slotIndex !== row.rowIndex) {
      state.statTab = "calculation";
      setBuild({
        ...state.build,
        calculation: {
          ...(state.build.calculation ?? {}),
          selectedSkill: { kind: "active", slotIndex: row.rowIndex },
        },
      });
    }
    return;
  }

  if (event.target.classList.contains("skill-runtime-config-tier")) {
    transformSkillRuntimePickerConfig(event.target.dataset.item, (support, config) => (
      updateSupportRuntimeConfigTier(
        support,
        config,
        event.target.value,
        event.target.dataset.effect || null,
      )
    ));
    return;
  }

  if (event.target.classList.contains("skill-runtime-config-special-level")) {
    transformSkillRuntimePickerConfig(event.target.dataset.item, (support, config) => (
      updateSupportRuntimeConfigSpecialLevel(support, config, event.target.value)
    ));
    return;
  }

  if (event.target.classList.contains("skill-runtime-card-level-input")) {
    setSkillRuntimePickerLevel(event.target.dataset.item, event.target.value);
    return;
  }

  if (event.target.classList.contains("skill-modularization-option")) {
    const model = state.skillRuntime.model;
    if (model) persistSkillRuntimeState(updateMainSkillModularizationOption(
      model,
      state.build.skills,
      event.target.dataset.kind,
      Number(event.target.dataset.rowIndex),
      Number(event.target.dataset.optionIndex),
      event.target.value,
      skillRuntimeUpdateOptions(),
    ));
    return;
  }

  if (event.target.classList.contains("skill-modularization-elemental-damage-type")) {
    const model = state.skillRuntime.model;
    if (model) persistSkillRuntimeState(updateMainSkillModularizationElementalDamageType(
      model,
      state.build.skills,
      event.target.dataset.kind,
      Number(event.target.dataset.rowIndex),
      event.target.value,
      skillRuntimeUpdateOptions(),
    ));
    return;
  }

  if (event.target.classList.contains("skill-elixir-active-condition")) {
    setConditionMapOverride(
      "playerStates",
      "elixir_skill_active",
      event.target.checked,
    );
    return;
  }

  if (event.target.classList.contains("skill-elixir-skill")) {
    updateSkillRuntimeElixir(
      Number(event.target.dataset.elixirIndex),
      { skillId: event.target.value || null },
    );
    return;
  }

  if (event.target.classList.contains("skill-elixir-ingredient")) {
    updateSkillRuntimeElixirIngredient(
      Number(event.target.dataset.elixirIndex),
      Number(event.target.dataset.ingredientIndex),
      event.target.value,
    );
    return;
  }

  if (event.target.id === "heroMemoryBaseAttribute") {
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    if (dataset && memory) updateHeroMemoryDraft(updateHeroMemoryProperties(
      memory,
      { baseAttributeId: event.target.value || null },
      dataset,
    ));
    return;
  }

  if (event.target.id === "heroMemoryEnhancementRange") {
    const profile = HERO_MEMORY_ENHANCEMENT_PROFILES[Number(event.target.value)];
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    if (profile && dataset && memory) {
      updateHeroMemoryDraft(updateHeroMemoryProperties(memory, { enhancement: profile.enhancement }, dataset));
    }
    return;
  }

  if (event.target.id === "heroMemoryProfitLoss") {
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    if (dataset && memory) updateHeroMemoryDraft(updateHeroMemoryProperties(
      memory,
      { profitLoss: event.target.checked },
      dataset,
    ));
    return;
  }

  if (event.target.id === "heroMemoryRevivalAffix") {
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    if (dataset && memory) {
      let nextMemory = memory;
      if (!event.target.value && memory.revivalAffixId) {
        nextMemory = toggleHeroMemoryRevivalAffix(memory, memory.revivalAffixId, dataset).memory;
      } else if (event.target.value) {
        nextMemory = toggleHeroMemoryRevivalAffix(memory, event.target.value, dataset).memory;
      }
      updateHeroMemoryDraft(nextMemory);
    }
    return;
  }

  if (event.target.classList.contains("hero-memory-affix-select")) {
    setHeroMemoryAffixSelection(
      event.target.dataset.kind,
      Number(event.target.dataset.slotIndex),
      event.target.value,
    );
    return;
  }

  if (event.target.classList.contains("hero-memory-affix-tier")) {
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    if (dataset && memory) updateHeroMemoryDraft(updateHeroMemoryAffixTier(
      memory,
      event.target.dataset.affix,
      event.target.value,
      dataset,
    ));
    return;
  }

  if (event.target.classList.contains("hero-memory-roll-input")) {
    const dataset = state.heroMemoryRuntime.dataset;
    const memory = state.heroMemoryDraft?.memory;
    const value = Number(event.target.value);
    if (dataset && memory && Number.isFinite(value)) updateHeroMemoryDraft(updateHeroMemoryAffixRoll(
      memory,
      event.target.dataset.affix,
      event.target.dataset.tier,
      event.target.dataset.roll,
      value,
      dataset,
    ));
    const { affix, tier, roll } = event.target.dataset;
    const range = [...document.querySelectorAll(".hero-memory-roll-input")].find((input) => (
      input.dataset.affix === affix && input.dataset.tier === tier && input.dataset.roll === roll
    ));
    range?.focus({ preventScroll: true });
    return;
  }

  if (event.target.classList.contains("skill-modularization-condition")) {
    setConditionOverride("statuses.minion_low_life", event.target.checked);
    render();
    return;
  }

  if (commitConditionControlTarget(event.target)) return;

  if (event.target.classList.contains("condition-map-control")) {
    const group = event.target.dataset.conditionGroup;
    const key = event.target.dataset.conditionKey;
    const kind = event.target.dataset.conditionKind;
    const value = kind === "boolean" ? event.target.checked : Number(event.target.value);
    if (group && key && (kind !== "number" || Number.isFinite(value))) setConditionMapOverride(group, key, value, event.target);
  }

  if (event.target.id === "noticeToggle" || event.target.id === "mobileNoticeToggle") {
    state.showNotice = event.target.checked;
    localStorage.setItem("tob.notice.v1", state.showNotice ? "on" : "off");
    render();
  }

  if (event.target.id === "screenshotInput") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await importFromScreenshot(file);
  }

  if (event.target.classList.contains("gear-corrosion-toggle")) {
    const itemId = event.target.dataset.item;
    const affixSlotId = event.target.dataset.affixSlot;
    const item = findItemById(itemId);
    if (item && affixSlotId && !isGearSelectionOnlyItem(item)) {
      const corrodedSlotIds = getGearCorrodedSlotIds(item);
      const corrosionLimit = getVerified91TobGearCorrosionLimit(item.id);
      if (
        event.target.checked
        && !corrodedSlotIds.has(affixSlotId)
        && corrosionLimit !== null
        && corrodedSlotIds.size >= corrosionLimit
      ) {
        showNotice(ui("gearCorrosionLimitReached", { limit: corrosionLimit }));
        render();
        return;
      }
      if (event.target.checked) corrodedSlotIds.add(affixSlotId);
      else corrodedSlotIds.delete(affixSlotId);
      const legendaryDraft = {
        ...(getGearLegendaryDraft(item) ?? {}),
        corrodedSlotIds: [...corrodedSlotIds],
      };
      let nextBuild = updateGearInstanceValue(
        state.build,
        itemId,
        "legendaryDraft",
        "gearLegendaryDrafts",
        null,
        () => legendaryDraft,
      );
      nextBuild = updateGearInstanceValue(
        nextBuild,
        itemId,
        "corrupted",
        "gearCorruptions",
        false,
        () => corrodedSlotIds.size > 0,
      );
      setBuild(nextBuild);
    }
  }

  if (event.target.classList.contains("gear-craft-tier")) {
    const item = findItemById(event.target.dataset.item);
    const affix = item?.craftAffixes?.find((candidate) => candidate.affixId === event.target.dataset.affix);
    const tier = affix?.tierOptions?.find((candidate) => candidate.tierId === event.target.value);
    const itemCrafts = item
      ? getGearInstanceValue(item.id, "crafts", "gearCrafts", {})
      : null;
    if (
      item
      && affix
      && affix.selectionSupported !== false
      && tier
      && itemCrafts
      && Object.hasOwn(itemCrafts, affix.affixId)
    ) {
      setBuild(updateGearInstanceValue(
        state.build,
        item.id,
        "crafts",
        "gearCrafts",
        {},
        (current) => ({
          ...(current ?? {}),
          [affix.affixId]: {
            tierId: tier.tierId,
            rolls: Object.fromEntries((tier.rollDefs ?? []).map((roll) => [roll.key, roll.max])),
          },
        }),
      ));
    }
  }

  if (event.target.id === "localeSelect") {
    state.locale = normalizeLocale(event.target.value);
    window.localStorage.setItem(LOCALE_KEY, state.locale);
    render();
  }

  if (event.target.id === "importInput") {
    const file = event.target.files?.[0];
    if (!file) return;
    const requestSequence = ++buildImportRequestSequence;
    try {
      const text = await file.text();
      if (requestSequence !== buildImportRequestSequence) return;
      const validationContext = await loadBuildImportValidationContext().catch(() => null);
      if (requestSequence !== buildImportRequestSequence) return;
      const result = validationContext
        ? validateBuildImportText(text, validationContext)
        : { ok: false, reason: "context-unavailable" };
      if (requestSequence !== buildImportRequestSequence) return;
      if (result.ok) {
        const externalImport = result.sourceFormat === "91tob-bd_document_v1";
        const messageKey = externalImport ? "imported91TobVerifiedSubset" : "importedBuild";
        setBuild(
          result.build,
          ui("importedBuild"),
        );
        state.importReport = externalImport
          ? {
              ok: true,
              messageKey,
              sourceFormat: result.sourceFormat,
              mappedSections: result.mappedSections ?? [],
              preservedSections: result.preservedSections ?? [],
              issues: [],
            }
          : null;
        if (state.importReport) {
          state.overlay = { type: "importReport" };
          render();
        }
      } else {
        const messageKey = result.reason === "context-unavailable"
          ? "importValidationUnavailable"
          : result.reason === "external-format-unsupported"
            ? "import91TobUnsupportedContent"
            : result.reason === "external-format-invalid"
              ? "import91TobInvalid"
              : result.reason === "unsupported-external-schema-version"
                ? "import91TobUnsupportedVersion"
            : result.reason === "unsupported-schema-version"
              ? "importUnsupportedVersion"
              : result.reason === "invalid-json"
                ? "importFailed"
                : "importValidationFailed";
        state.importReport = {
          ok: false,
          messageKey,
          sourceFormat: null,
          mappedSections: [],
          preservedSections: [],
          issues: result.issues ?? [],
        };
        state.overlay = { type: "importReport" };
        showNotice(ui(messageKey));
        render();
      }
    } catch {
      if (requestSequence !== buildImportRequestSequence) return;
      state.importReport = {
        ok: false,
        messageKey: "importFailed",
        sourceFormat: null,
        mappedSections: [],
        preservedSections: [],
        issues: [],
      };
      state.overlay = { type: "importReport" };
      showNotice(ui("importFailed"));
      render();
    } finally {
      event.target.value = "";
    }
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  if (DIVINITY_SUBMIT_ACTIONS.has(form.dataset.action)) {
    event.preventDefault();
    applyDivinityEditorTarget(form, DIVINITY_SUBMIT_ACTIONS);
    return;
  }
  if (applyTalentEditorTarget(form)) event.preventDefault();
});

app.addEventListener("contextmenu", (event) => {
  if (state.overlay?.type !== "talentEditor" || !state.talentRuntime.model) return;
  const cell = event.target.closest('[data-role="talent-node-cell"][data-context-action="talent-node-remove"]');
  const command = readTalentEditorContextCommand(cell);
  if (!command) return;
  event.preventDefault();
  applyTalentEditorCommand(command);
});

window.addEventListener("storage", (event) => {
  if (seasonPlanner.active) {
    if (event.key === "tob.season-workspaces.v1" || event.key === null) {
      seasonPlanner.state.notice = "다른 탭에서 저장 내용이 변경되었습니다. 불러오기에서 확인하세요.";
      if (!seasonPlanner.state.pending.size) seasonPlanner.render(app);
    }
    return;
  }
  const inventoryChange = ["tob.inventory.v1", "tob.gearInventory.v1", "tob.heroMemoryInventory.v1", "tob.inventoryTransaction.v1"].includes(event.key);
  if (inventoryChange || event.key === null) {
    refreshUnifiedInventory();
    void recoverInventory();
    // Preserve an open editor's draft and focus. The inventory itself updates immediately.
    if (!state.overlay || state.overlay.type === "inventory") render();
    if (inventoryChange) return;
  }
  if (event.key !== null && !["tob.currentBuild.v2", "tob.savedBuilds.v2"].includes(event.key)) return;
  const build = loadCurrentBuild();
  const revision = getBuildStorageRevision(build);
  if (revision?.unreadable || revision?.recoveryPending) {
    state.storageWarnings.push(...consumeStorageWarnings());
    refreshBuildStorageNotice();
    return;
  }
  if (revision?.current !== currentBuildRevision?.current) {
    if (state.buildSavePending || state.overlay) {
      state.buildStorageNotice = ui("storageBuildConflict");
      refreshBuildStorageNotice();
      return;
    }
    state.build = normalizeBuildWithSkillRuntime(build);
    currentBuildRevision = revision;
    state.buildStorageNotice = "";
    markCalculationStale();
  }
  state.savedBuilds = loadSavedBuilds();
  state.storageWarnings.push(...consumeStorageWarnings());
  render();
});

window.addEventListener("keydown", (event) => {
  if (seasonPlanner.active) { seasonPlanner.keydown(event); return; }
  if (event.key === "Enter" && !event.isComposing && state.overlay?.type === "skillEditor"
    && event.target?.classList?.contains("skill-runtime-card-level-input")) {
    event.preventDefault();
    setSkillRuntimePickerLevel(event.target.dataset.item, event.target.value);
    return;
  }
  if (event.key === "Enter" && !event.isComposing && state.overlay?.type === "pact"
    && PACT_ROLL_ACTIONS.has(event.target?.dataset?.action)) {
    event.preventDefault();
    applyPactEditorTarget(event.target, PACT_ROLL_ACTIONS);
    return;
  }
  const skillTab = event.target?.closest?.('[data-action="select-skill-row"]');
  if (skillTab && ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const current = Number(skillTab.dataset.rowIndex);
    state.activeSkillRow = event.key === "Home" ? 0 : event.key === "End" ? 8 : (current + (event.key === "ArrowDown" ? 1 : 8)) % 9;
    render();
    document.getElementById(`skill-loadout-tab-${state.activeSkillRow}`)?.focus({ preventScroll: true });
    return;
  }
  if (event.key === "Enter" && !event.isComposing && event.target?.id === "saveAsName" && state.overlay?.type === "saveAs") {
    event.preventDefault();
    void saveCurrentBuildAs();
    return;
  }
  if (trapOverlayFocus(event)) return;
  if (handlePlannerTabKeydown(event)) return;
  if (handleHeroSelectorScrollKey(event)) return;
  if (handleStatTabKeydown(event)) return;
  if (handleDivinityEditorKeydown(event)) return;
  if (event.key === "Escape" && state.overlay) {
    event.preventDefault();
    closeOverlay();
    return;
  }
  if (event.key === "Escape" && state.statsDockOpen) {
    event.preventDefault();
    setResponsiveStatsDockOpen(false, { restoreFocus: true });
    return;
  }
  if (event.key === "Escape") {
    const fileMenu = document.querySelector(".build-file-menu[open]");
    if (fileMenu) {
      fileMenu.open = false;
      fileMenu.querySelector("summary")?.focus();
    }
  }
});

state.advisorWorkspace = latestSeasonWorkspace(state.advisorSeasonWorkspaces.documents, state.build);
render();
function initializeLegacyRuntime() {
void recoverInventory();
if (buildHasHanCustomAffixText()) {
  void ensureGearLocaleRegistry();
}
if (state.build.selections.hero?.[0] || state.build.hero?.branchId) {
  void ensureHeroTraitModel();
}
if (state.build.hero?.memories?.some((memory) => memory?.memoryTypeId)) {
  void ensureHeroMemoryDataset();
}
if (state.build.pact?.slots?.some((slot) => slot?.spirit)) {
  void ensurePactDestinyModel();
}
if (buildHasTalentBoardState()) {
  void ensureTalentBoardModel();
}
void ensureSkillRuntimeModel();
}
