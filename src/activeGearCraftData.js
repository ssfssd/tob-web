import { containsHanScript } from "./gameTextPresentation.js";

const CATEGORY_SOURCE_PREFIX = "category:";
const EQUIPMENT_SOURCE_PREFIX = "equipment:";
const STABLE_AFFIX_PREFIX = "craft-affix:";
const STABLE_TIER_PREFIX = "craft-tier:";
const STABLE_ROLL_PREFIX = "craft-roll:";
const LOCALIZED_NIGHTMARE_STATUS = "localized-current-tlidb-template";

const EXPECTED_CURRENT_GEAR = 458;
const EXPECTED_VERIFIED_CRAFT_ASSIGNMENTS = 442;
const EXPECTED_VERIFIED_LEGENDARY_ONLY_ASSIGNMENTS = 7;
const EXPECTED_VERIFIED_ASSIGNMENTS = 451;
const EXPECTED_CATEGORY_ASSIGNMENTS = 432;
const EXPECTED_GRAFT_ASSIGNMENTS = 10;

const EXPECTED_REMOVED_ASSIGNMENT_IDS = Object.freeze([
  "gear-poster-xd-cn-r-ss13pn-lang-zh-cn-ch-2-sub-3",
]);

const EXPECTED_UNASSIGNED_IDS = Object.freeze([
  "gear-tlidb-ss13-1001",
  "gear-tlidb-ss13-1003",
  "gear-tlidb-ss13-1005",
  "gear-tlidb-ss13-1009",
  "gear-tlidb-ss13-1010",
  "gear-tlidb-ss13-1011",
  "gear-tlidb-ss13-1012",
  "gear-tlidb-ss13-111412",
  "gear-tlidb-ss13-112145",
  "gear-tlidb-ss13-112170",
  "gear-tlidb-ss13-112171",
  "gear-tlidb-ss13-112172",
  "gear-tlidb-ss13-112260",
  "gear-tlidb-ss13-112443",
  "gear-tlidb-ss13-113286",
  "gear-tlidb-ss13-113343",
]);

const EXPECTED_LEGENDARY_ONLY_IDS = Object.freeze([
  "gear-tlidb-ss13-113286",
  "gear-tlidb-ss13-111412",
  "gear-tlidb-ss13-112170",
  "gear-tlidb-ss13-112171",
  "gear-tlidb-ss13-112172",
  "gear-tlidb-ss13-112260",
  "gear-tlidb-ss13-112443",
]);

const EXPECTED_ROUTED_SPECIAL_SLATE_IDS = Object.freeze([
  "gear-tlidb-ss13-1001",
  "gear-tlidb-ss13-1003",
  "gear-tlidb-ss13-1005",
  "gear-tlidb-ss13-1009",
  "gear-tlidb-ss13-1010",
  "gear-tlidb-ss13-1011",
  "gear-tlidb-ss13-1012",
]);

const EXPECTED_SELECTION_ONLY_IDS = Object.freeze([
  "gear-tlidb-ss13-112145",
  "gear-tlidb-ss13-113343",
]);

const EXPECTED_DISPLAY_ONLY_IDS = Object.freeze([]);

const EXPECTED_SOURCE_AUDIT = Object.freeze({
  sourceAffixes: 5555,
  verifiedAffixes: 2857,
  isolatedAffixAliasUnavailable: 946,
  isolatedAffixLocaleUnavailable: 0,
  isolatedAffixDirectValueAuthorityUnverified: 1140,
  displayedNightmareAffixes: 1140,
  isolatedAffixDangling: 71,
  isolatedAffixesWithoutVerifiedTier: 541,
  sourceTiers: 16561,
  verifiedTiers: 10390,
  isolatedTierAliasUnavailable: 392,
  isolatedTierLocaleUnavailable: 0,
  isolatedTierDangling: 9,
  isolatedTierTextMismatch: 315,
  isolatedTierRollStructureMismatch: 1526,
  sourceRolls: 16898,
  verifiedRolls: 11981,
  isolatedRollAliasUnavailable: 0,
  isolatedRollLocaleUnavailable: 0,
  isolatedRollDangling: 0,
  sourceLegendaryVariants: 2918,
  verifiedLegendaryLocaleAliases: 2767,
  verifiedLegendaryDirectVariants: 69,
  verifiedLegendaryVariants: 2836,
  unavailableLegendaryLocaleAliases: 151,
  unavailableLegendaryVariants: 82,
});

export class ActiveGearCraftError extends Error {
  constructor(code, path, detail = "") {
    super(`${code} at ${path}${detail ? `: ${detail}` : ""}`);
    this.name = "ActiveGearCraftError";
    this.code = code;
    this.path = path;
  }
}

function fail(code, path, detail) {
  throw new ActiveGearCraftError(code, path, detail);
}

function requireObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("object-required", path);
  }
  return value;
}

function requireArray(value, path) {
  if (!Array.isArray(value)) fail("array-required", path);
  return value;
}

function requireCount(actual, expected, path) {
  if (actual !== expected) fail("count-mismatch", path, `${actual} != ${expected}`);
}

function exactList(values) {
  return [...values].sort().join("\n");
}

function requireExactIds(actual, expected, path) {
  if (exactList(actual) !== exactList(expected)) {
    fail("identity-mismatch", path, `${actual.length} != ${expected.length}`);
  }
}

function normalizeSourceText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u2013\u2014\u2212]/gu, "-")
    .replace(/\s+/gu, "")
    .replace(/\uFF0C/gu, ",");
}

function templateRollKeys(value) {
  return [...String(value ?? "").matchAll(/\{\{(roll_\d+)\}\}/gu)].map((match) => match[1]);
}

function exactRecordForRef(registry, ref) {
  const recordKey = registry.refs?.[ref];
  const record = recordKey ? registry.records?.[recordKey] : undefined;
  if (
    !recordKey
    || record?.status !== "exact"
    || typeof record.cn?.text !== "string"
    || !record.cn.text
    || typeof record.ko?.text !== "string"
    || !record.ko.text
    || containsHanScript(record.ko.text)
  ) return null;
  return { recordKey, record };
}

function localizedNightmareRecordForRef(registry, ref) {
  const recordKey = registry.refs?.[ref];
  const record = recordKey ? registry.records?.[recordKey] : undefined;
  if (
    !recordKey
    || record?.status !== LOCALIZED_NIGHTMARE_STATUS
    || typeof record.cn?.text !== "string"
    || !record.cn.text
    || typeof record.ko?.text !== "string"
    || !record.ko.text
    || containsHanScript(record.ko.text)
  ) return null;
  return { recordKey, record };
}

function sourceAffixes(overlay, sourceKey) {
  if (sourceKey.startsWith(CATEGORY_SOURCE_PREFIX)) {
    return overlay.affixesByCategory?.[sourceKey.slice(CATEGORY_SOURCE_PREFIX.length)];
  }
  if (sourceKey.startsWith(EQUIPMENT_SOURCE_PREFIX)) {
    return overlay.affixesByEquipmentUrl?.[sourceKey.slice(EQUIPMENT_SOURCE_PREFIX.length)];
  }
  return undefined;
}

function normalizedTlidbPath(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "tlidb.com") return "";
    return decodeURIComponent(url.pathname.replace(/^\/(?:cn|ko|en)\//u, "/"));
  } catch {
    return "";
  }
}

function directCurrentLegendaryAuthority(item, variant) {
  const receipt = item.sourceEvidence?.ss13Gear?.localeReceipts?.ko;
  const locale = item.tlidbText?.ko;
  const modifierId = String(variant?.sourceModifierId ?? "");
  if (
    !variant
    || variant.sourceTrack !== "tlidb-ss13-live"
    || variant.sourceLocale !== "ko"
    || variant.sourcePageVersion !== "SS13"
    || variant.sourceMethod !== "tlidb-data-modifier-id"
    || !modifierId
    || variant.sourceRecordKey !== `${tlidbPageKey(variant.sourceUrl)}#modifier:${modifierId}`
    || variant.sourceFieldStatus?.text !== "exact"
    || typeof variant.text !== "string"
    || !variant.text
    || containsHanScript(variant.text)
    || ![
      "exact-tlidb-current-card-icon-path-and-base-link",
      "exact-tlidb-current-ss13-card-and-legendary-rows",
    ].includes(item.sourceEvidence?.ss13Gear?.method)
    || receipt?.sourceUrl !== variant.sourceUrl
    || receipt?.sourcePageSha256 !== variant.sourcePageSha256
    || receipt?.sourcePageVersion !== "SS13"
    || receipt?.sourceSeasonEvidence?.actualSeason !== 13
    || receipt?.sourceSeasonEvidence?.verificationComplete !== true
    || locale?.sourceUrl !== receipt.sourceUrl
    || locale?.sourcePageSha256 !== receipt.sourcePageSha256
    || locale?.sourcePageVersion !== "SS13"
    || locale?.sourceSeasonEvidence?.actualSeason !== 13
    || locale?.sourceSeasonEvidence?.verificationComplete !== true
  ) return null;
  return Object.freeze({
    status: "exact-direct-current-tlidb-modifier-id",
    sourceRecordKey: variant.sourceRecordKey,
    sourceModifierId: modifierId,
    sourceUrl: variant.sourceUrl,
    sourcePageSha256: variant.sourcePageSha256,
  });
}

function hasExactCurrentGearSelectionIdentity(item) {
  const receipt = item?.sourceEvidence?.ss13Gear?.localeReceipts?.ko;
  const locale = item?.tlidbText?.ko;
  return item?.sourceKind === "equipment"
    && typeof item.gearSlot === "string"
    && item.gearSlot.length > 0
    && item.appTags?.includes(`gear-slot:${item.gearSlot}`)
    && /^ItemGold\/\d+$/u.test(item.tlidbStableKey ?? "")
    && /^ItemBase\/\d+$/u.test(item.baseEvidence?.stableKey ?? "")
    && item.sourceEvidence?.ss13Gear?.baseStableKey === item.baseEvidence.stableKey
    && item.sourceEvidence?.ss13Gear?.stableKeys?.includes(item.tlidbStableKey)
    && item.sourceEvidence?.ss13Gear?.method === "exact-tlidb-current-card-icon-path-and-base-link"
    && locale?.sourceFieldStatus?.name === "exact"
    && locale?.sourceFieldStatus?.summary === "exact"
    && locale?.sourceFieldStatus?.detail === "exact"
    && locale?.sourcePageVersion === "SS13"
    && locale?.sourceSeasonEvidence?.actualSeason === 13
    && locale?.sourceSeasonEvidence?.verificationComplete === true
    && receipt?.sourceUrl === locale.sourceUrl
    && receipt?.sourcePageSha256 === locale.sourcePageSha256
    && receipt?.sourcePageVersion === "SS13"
    && receipt?.sourceSeasonEvidence?.actualSeason === 13
    && receipt?.sourceSeasonEvidence?.verificationComplete === true
    && typeof locale.name === "string"
    && locale.name.length > 0
    && !containsHanScript(locale.name)
    && typeof locale.detail === "string"
    && locale.detail.length > 0
    && !containsHanScript(locale.detail);
}

function isVerifiedDivinitySlateRoute(item) {
  const receipt = item?.sourceEvidence?.ss13Gear?.localeReceipts?.ko;
  const locale = item?.tlidbText?.ko;
  return item?.sourceKind === "divinity-slate"
    && item.gearSlot === null
    && item.appTags?.includes("divinity-slate")
    && /^ItemGold\/\d+$/u.test(item.tlidbStableKey ?? "")
    && locale?.sourceFieldStatus?.name === "exact"
    && locale?.sourceFieldStatus?.detail === "exact"
    && locale?.sourcePageVersion === "SS13"
    && locale?.sourceSeasonEvidence?.actualSeason === 13
    && locale?.sourceSeasonEvidence?.verificationComplete === true
    && receipt?.sourceUrl === locale.sourceUrl
    && receipt?.sourcePageSha256 === locale.sourcePageSha256
    && !containsHanScript(locale.name ?? "")
    && !containsHanScript(locale.detail ?? "");
}

function tlidbPageKey(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "tlidb.com") return "";
    return decodeURIComponent(url.pathname.replace(/^\/(?:cn|ko|en)\//u, ""));
  } catch {
    return "";
  }
}

function categoryCandidates(item, sourceCategoryIds) {
  const candidates = new Set();
  for (const affix of item.craftAffixes ?? []) {
    const affixId = String(affix?.affixId ?? "");
    const separator = affixId.indexOf(":");
    const candidate = separator > 0 ? affixId.slice(0, separator) : "";
    if (sourceCategoryIds.has(candidate)) candidates.add(candidate);
  }
  return candidates;
}

function verifyAssignment(item, sourceKey, sourceCategoryIds) {
  if (sourceKey.startsWith(CATEGORY_SOURCE_PREFIX)) {
    const categoryId = sourceKey.slice(CATEGORY_SOURCE_PREFIX.length);
    const candidates = categoryCandidates(item, sourceCategoryIds);
    if (candidates.size !== 1 || !candidates.has(categoryId)) {
      fail("category-assignment-evidence-mismatch", item.id, sourceKey);
    }
    return "category";
  }
  if (sourceKey.startsWith(EQUIPMENT_SOURCE_PREFIX)) {
    const sourceUrl = sourceKey.slice(EQUIPMENT_SOURCE_PREFIX.length);
    if (
      !normalizedTlidbPath(item.sourceUrl)
      || normalizedTlidbPath(item.sourceUrl) !== normalizedTlidbPath(sourceUrl)
    ) {
      fail("equipment-assignment-evidence-mismatch", item.id, sourceKey);
    }
    return "graft";
  }
  fail("unknown-assignment-source", item.id, sourceKey);
}

function createSourceAudit() {
  return {
    sourceAffixes: 0,
    verifiedAffixes: 0,
    isolatedAffixAliasUnavailable: 0,
    isolatedAffixLocaleUnavailable: 0,
    isolatedAffixDirectValueAuthorityUnverified: 0,
    displayedNightmareAffixes: 0,
    isolatedAffixDangling: 0,
    isolatedAffixesWithoutVerifiedTier: 0,
    sourceTiers: 0,
    verifiedTiers: 0,
    isolatedTierAliasUnavailable: 0,
    isolatedTierLocaleUnavailable: 0,
    isolatedTierDangling: 0,
    isolatedTierTextMismatch: 0,
    isolatedTierRollStructureMismatch: 0,
    sourceRolls: 0,
    verifiedRolls: 0,
    isolatedRollAliasUnavailable: 0,
    isolatedRollLocaleUnavailable: 0,
    isolatedRollDangling: 0,
  };
}

function classifyUnavailableAlias(registry, ref, prefix, audit) {
  const recordKey = registry.refs?.[ref];
  const record = recordKey ? registry.records?.[recordKey] : undefined;
  const isolatedByCurrentSource = registry.metadata?.sourceLimitations
    ?.unresolvedCurrentSourceRefs?.refLookup?.[ref] === true;
  const directValueAuthorityUnverifiedStatus = registry.metadata?.sourceLimitations
    ?.nightmareDirectValueAuthorityUnverified?.recordStatus;
  if (isolatedByCurrentSource) audit[`isolated${prefix}Dangling`] += 1;
  else if (!recordKey) audit[`isolated${prefix}AliasUnavailable`] += 1;
  else if (!record) audit[`isolated${prefix}Dangling`] += 1;
  else if (
    prefix === "Affix"
    && typeof directValueAuthorityUnverifiedStatus === "string"
    && record.status === directValueAuthorityUnverifiedStatus
  ) audit.isolatedAffixDirectValueAuthorityUnverified += 1;
  else audit[`isolated${prefix}LocaleUnavailable`] += 1;
}

function verifiedTier(tier, registry, audit) {
  const rollDefs = requireArray(tier.rollDefs, `${tier.tierId}.rollDefs`);
  const tierRef = `${STABLE_TIER_PREFIX}${tier.tierId}`;
  const current = exactRecordForRef(registry, tierRef);
  if (!current) {
    classifyUnavailableAlias(registry, tierRef, "Tier", audit);
    return null;
  }
  if (normalizeSourceText(tier.text) !== normalizeSourceText(current.record.cn.text)) {
    audit.isolatedTierTextMismatch += 1;
    return null;
  }

  const rollKeys = rollDefs.map(({ key }) => key);
  const cnTemplateKeys = templateRollKeys(current.record.cn.renderTemplate);
  const koTemplateKeys = templateRollKeys(current.record.ko.renderTemplate);
  if (exactList(rollKeys) !== exactList(cnTemplateKeys) || exactList(rollKeys) !== exactList(koTemplateKeys)) {
    audit.isolatedTierRollStructureMismatch += 1;
    return null;
  }

  for (const roll of rollDefs) {
    const rollRef = `${STABLE_ROLL_PREFIX}${tier.tierId}:${roll.key}`;
    const rollRecord = exactRecordForRef(registry, rollRef);
    if (!rollRecord) {
      classifyUnavailableAlias(registry, rollRef, "Roll", audit);
      return null;
    }
    if (rollRecord.recordKey !== current.recordKey) {
      audit.isolatedTierRollStructureMismatch += 1;
      return null;
    }
  }

  audit.verifiedTiers += 1;
  audit.verifiedRolls += rollDefs.length;
  return {
    ...tier,
    activeLocaleAliases: Object.freeze({
      tier: tierRef,
      rolls: Object.freeze(Object.fromEntries(
        rollDefs.map((roll) => [roll.key, `${STABLE_ROLL_PREFIX}${tier.tierId}:${roll.key}`]),
      )),
    }),
  };
}

function verifiedAffix(affix, registry, audit) {
  const affixRef = `${STABLE_AFFIX_PREFIX}${affix.affixId}`;
  if (!exactRecordForRef(registry, affixRef)) {
    classifyUnavailableAlias(registry, affixRef, "Affix", audit);
    return null;
  }
  const tierOptions = requireArray(affix.tierOptions, `${affix.affixId}.tierOptions`)
    .map((tier) => verifiedTier(tier, registry, audit))
    .filter(Boolean);
  if (tierOptions.length === 0) {
    audit.isolatedAffixesWithoutVerifiedTier += 1;
    return null;
  }
  audit.verifiedAffixes += 1;
  return {
    ...affix,
    tierOptions,
    activeLocaleAliases: Object.freeze({ affix: affixRef }),
  };
}

function localizedNightmareTier(tier, registry) {
  const rollDefs = requireArray(tier.rollDefs, `${tier.tierId}.rollDefs`);
  const tierRef = `${STABLE_TIER_PREFIX}${tier.tierId}`;
  const current = localizedNightmareRecordForRef(registry, tierRef);
  if (!current) return null;
  if (normalizeSourceText(tier.text) !== normalizeSourceText(current.record.cn.text)) return null;

  const rollKeys = rollDefs.map(({ key }) => key);
  const cnTemplateKeys = templateRollKeys(current.record.cn.renderTemplate);
  const koTemplateKeys = templateRollKeys(current.record.ko.renderTemplate);
  if (exactList(rollKeys) !== exactList(cnTemplateKeys) || exactList(rollKeys) !== exactList(koTemplateKeys)) {
    return null;
  }
  for (const roll of rollDefs) {
    const rollRef = `${STABLE_ROLL_PREFIX}${tier.tierId}:${roll.key}`;
    const rollRecord = localizedNightmareRecordForRef(registry, rollRef);
    if (!rollRecord || rollRecord.recordKey !== current.recordKey) return null;
  }

  return {
    ...tier,
    activeLocaleAliases: Object.freeze({
      tier: tierRef,
      rolls: Object.freeze(Object.fromEntries(
        rollDefs.map((roll) => [roll.key, `${STABLE_ROLL_PREFIX}${tier.tierId}:${roll.key}`]),
      )),
    }),
  };
}

function localizedNightmareAffix(affix, registry, audit) {
  const affixRef = `${STABLE_AFFIX_PREFIX}${affix.affixId}`;
  if (!localizedNightmareRecordForRef(registry, affixRef)) return null;
  const sourceTiers = requireArray(affix.tierOptions, `${affix.affixId}.tierOptions`);
  const tierOptions = sourceTiers.map((tier) => localizedNightmareTier(tier, registry));
  if (tierOptions.some((tier) => !tier)) return null;

  audit.displayedNightmareAffixes += 1;
  return {
    ...affix,
    tierOptions,
    activeLocaleAliases: Object.freeze({ affix: affixRef }),
    localeDisplaySupported: true,
    craftValueAuthority: "unverified-current-tlidb-template",
    selectionSupported: false,
    calculationSupported: false,
  };
}

function verifiedSourceArrays(overlay, registry, audit) {
  const arrays = new Map();
  const sourceKeys = [
    ...Object.keys(requireObject(overlay.affixesByCategory, "overlay.affixesByCategory"))
      .map((key) => `${CATEGORY_SOURCE_PREFIX}${key}`),
    ...Object.keys(requireObject(overlay.affixesByEquipmentUrl, "overlay.affixesByEquipmentUrl"))
      .map((key) => `${EQUIPMENT_SOURCE_PREFIX}${key}`),
  ];
  for (const sourceKey of sourceKeys) {
    const source = requireArray(sourceAffixes(overlay, sourceKey), sourceKey);
    let sourceTiers = 0;
    let sourceRolls = 0;
    audit.sourceAffixes += source.length;
    for (const affix of source) {
      const tiers = requireArray(affix.tierOptions, `${affix.affixId}.tierOptions`);
      sourceTiers += tiers.length;
      audit.sourceTiers += tiers.length;
      const affixRolls = tiers.reduce(
        (count, tier) => count + requireArray(tier.rollDefs, `${tier.tierId}.rollDefs`).length,
        0,
      );
      sourceRolls += affixRolls;
      audit.sourceRolls += affixRolls;
    }
    const verified = [];
    const localizedDisplayOnly = [];
    for (const affix of source) {
      const exact = verifiedAffix(affix, registry, audit);
      if (exact) {
        verified.push(exact);
        continue;
      }
      const localized = localizedNightmareAffix(affix, registry, audit);
      if (localized) localizedDisplayOnly.push(localized);
    }
    if (!verified.length) fail("verified-source-array-empty", sourceKey);
    const verifiedTiers = verified.reduce(
      (count, affix) => count + affix.tierOptions.length,
      0,
    );
    const verifiedRolls = verified.reduce((count, affix) => (
      count + affix.tierOptions.reduce(
        (tierCount, tier) => tierCount + tier.rollDefs.length,
        0,
      )
    ), 0);
    arrays.set(sourceKey, Object.freeze({
      // Keep the pre-existing value-editable order stable. Display-only Nightmare
      // templates follow it so name-based legacy lookups cannot select an
      // unverified row ahead of the verified craft row with the same label.
      affixes: Object.freeze([...verified, ...localizedDisplayOnly]),
      source: Object.freeze({
        affixes: source.length,
        tiers: sourceTiers,
        rolls: sourceRolls,
      }),
      verified: Object.freeze({
        affixes: verified.length,
        tiers: verifiedTiers,
        rolls: verifiedRolls,
      }),
    }));
  }
  return arrays;
}

function stableLegendaryRefsByModifierId(registry) {
  const refsByModifierId = new Map();
  for (const [ref, recordKey] of Object.entries(registry.refs ?? {})) {
    if (!ref.startsWith("legendary:")) continue;
    const record = registry.records?.[recordKey];
    if (record?.status !== "exact" || !record.sourceModifierId) continue;
    const modifierId = String(record.sourceModifierId);
    if (!refsByModifierId.has(modifierId)) refsByModifierId.set(modifierId, []);
    refsByModifierId.get(modifierId).push({ ref, record });
  }
  return refsByModifierId;
}

function annotateLegendaryLocaleAliases(gear, registry) {
  const refsByModifierId = stableLegendaryRefsByModifierId(registry);
  const coverageByItemId = new Map();
  let sourceLegendaryVariants = 0;
  let verifiedLegendaryLocaleAliases = 0;
  let verifiedLegendaryDirectVariants = 0;
  let unavailableLegendaryLocaleAliases = 0;
  let unavailableLegendaryVariants = 0;
  const nextGear = gear.map((item) => {
    let itemSourceVariants = 0;
    let itemVerifiedVariants = 0;
    const legendaryAffixes = item.legendaryAffixes?.map((affix) => ({
      ...affix,
      ...Object.fromEntries(["normal", "corroded"].map((variantName) => {
        const variant = affix[variantName];
        if (!variant) return [variantName, variant];
        itemSourceVariants += 1;
        sourceLegendaryVariants += 1;
        const candidates = (refsByModifierId.get(String(variant.sourceModifierId ?? "")) ?? [])
          .filter(({ record }) => (
            normalizeSourceText(record.ko?.text) === normalizeSourceText(variant.text)
              && !containsHanScript(record.ko?.text ?? "")
          ));
        const slotSuffix = `:${affix.slotId}:${variantName}`;
        const slotCandidates = candidates.filter(({ ref }) => ref.endsWith(slotSuffix));
        const match = slotCandidates.length === 1
          ? slotCandidates[0]
          : candidates.length === 1
            ? candidates[0]
            : null;
        if (!match) {
          unavailableLegendaryLocaleAliases += 1;
          const directAuthority = directCurrentLegendaryAuthority(item, variant);
          if (!directAuthority) {
            unavailableLegendaryVariants += 1;
            return [variantName, {
              ...variant,
              activeLocaleAlias: "",
              activeDirectSourceAuthority: null,
            }];
          }
          itemVerifiedVariants += 1;
          verifiedLegendaryDirectVariants += 1;
          return [variantName, {
            ...variant,
            activeLocaleAlias: "",
            activeDirectSourceAuthority: directAuthority,
          }];
        }
        itemVerifiedVariants += 1;
        verifiedLegendaryLocaleAliases += 1;
        return [variantName, {
          ...variant,
          activeLocaleAlias: match.ref,
          activeDirectSourceAuthority: null,
        }];
      })),
    }));
    coverageByItemId.set(item.id, Object.freeze({
      source: itemSourceVariants,
      verified: itemVerifiedVariants,
    }));
    return { ...item, legendaryAffixes };
  });
  return {
    gear: nextGear,
    coverageByItemId,
    counts: {
      sourceLegendaryVariants,
      verifiedLegendaryLocaleAliases,
      verifiedLegendaryDirectVariants,
      verifiedLegendaryVariants:
        verifiedLegendaryLocaleAliases + verifiedLegendaryDirectVariants,
      unavailableLegendaryLocaleAliases,
      unavailableLegendaryVariants,
    },
  };
}

function itemRuntimeCoverage(craftCoverage, legendaryCoverage) {
  const source = Object.freeze({
    ...craftCoverage.source,
    legendaryVariants: legendaryCoverage?.source ?? 0,
  });
  const verified = Object.freeze({
    ...craftCoverage.verified,
    legendaryVariants: legendaryCoverage?.verified ?? 0,
  });
  const omitted = Object.freeze(Object.fromEntries(
    Object.keys(source).map((key) => [key, source[key] - verified[key]]),
  ));
  return Object.freeze({
    source,
    verified,
    omitted,
    complete: Object.values(omitted).every((count) => count === 0),
  });
}

export function applyCurrentSs13GearCraftData({ catalog, catalogMetadata, overlay, registry } = {}) {
  requireObject(catalog, "catalog");
  requireObject(overlay, "overlay");
  requireObject(registry, "registry");
  if (catalogMetadata?.version !== "SS13") fail("catalog-season-mismatch", "catalogMetadata.version");
  if (registry.metadata?.targetSeason !== 13) fail("locale-season-mismatch", "registry.metadata.targetSeason");
  if (overlay.schemaVersion !== 1) fail("overlay-schema-mismatch", "overlay.schemaVersion");
  if (overlay.metadata?.runtimeManifestVersion !== "SS13.2") {
    fail("structural-reference-version-mismatch", "overlay.metadata.runtimeManifestVersion");
  }

  const gear = requireArray(catalog.gear, "catalog.gear");
  requireCount(gear.length, EXPECTED_CURRENT_GEAR, "catalog.gear");
  requireCount(new Set(gear.map(({ id }) => id)).size, gear.length, "catalog.gear.ids");
  const itemAssignments = requireObject(overlay.itemAssignments, "overlay.itemAssignments");
  const currentIds = new Set(gear.map(({ id }) => id));
  const removedAssignmentIds = Object.keys(itemAssignments).filter((id) => !currentIds.has(id));
  requireExactIds(removedAssignmentIds, EXPECTED_REMOVED_ASSIGNMENT_IDS, "removedAssignmentIds");

  const unassignedIds = gear.filter(({ id }) => !Object.hasOwn(itemAssignments, id)).map(({ id }) => id);
  requireExactIds(unassignedIds, EXPECTED_UNASSIGNED_IDS, "unassignedIds");

  const audit = createSourceAudit();
  const sourceArrays = verifiedSourceArrays(overlay, registry, audit);
  const sourceCategoryIds = new Set(Object.keys(overlay.affixesByCategory));
  let categoryAssignments = 0;
  let graftAssignments = 0;
  const legendaryOnlyIds = [];
  const selectionOnlyIds = [];
  const routedSpecialSlateIds = [];
  const displayOnlyIds = [];
  const legendary = annotateLegendaryLocaleAliases(gear, registry);
  Object.assign(audit, legendary.counts);
  const nextGear = legendary.gear.map((item) => {
    const sourceKey = itemAssignments[item.id];
    if (!sourceKey) {
      const legendaryCoverage = legendary.coverageByItemId.get(item.id);
      if (isVerifiedDivinitySlateRoute(item)) {
        routedSpecialSlateIds.push(item.id);
        return {
          ...item,
          craftAffixes: [],
          craftRuntimeSupport: "verified-current-tlidb-divinity-route",
          craftRuntimeLimitation: "not-an-equipment-item",
          productRoute: "divinity",
          structureSupported: true,
          selectionSupported: false,
          calculationSupported: false,
          displayOnly: false,
        };
      }
      if (
        legendaryCoverage?.source > 0
        && legendaryCoverage.verified === legendaryCoverage.source
      ) {
        legendaryOnlyIds.push(item.id);
        return {
          ...item,
          craftAffixes: [],
          craftRuntimeSupport: "verified-current-tlidb-legendary-only",
          craftRuntimeLimitation: "current-tlidb-ss13-craft-category-unavailable",
          craftRuntimeCoverage: itemRuntimeCoverage({
            source: Object.freeze({ affixes: 0, tiers: 0, rolls: 0 }),
            verified: Object.freeze({ affixes: 0, tiers: 0, rolls: 0 }),
          }, legendaryCoverage),
          structureSupported: true,
          selectionSupported: true,
          calculationSupported: true,
          displayOnly: false,
        };
      }
      if (
        hasExactCurrentGearSelectionIdentity(item)
        && legendaryCoverage?.source > 0
        && legendaryCoverage.verified > 0
        && legendaryCoverage.verified < legendaryCoverage.source
      ) {
        selectionOnlyIds.push(item.id);
        return {
          ...item,
          craftAffixes: [],
          craftRuntimeSupport: "verified-current-tlidb-selection-only",
          craftRuntimeLimitation: "current-tlidb-ss13-legendary-value-authority-incomplete",
          craftRuntimeCoverage: itemRuntimeCoverage({
            source: Object.freeze({ affixes: 0, tiers: 0, rolls: 0 }),
            verified: Object.freeze({ affixes: 0, tiers: 0, rolls: 0 }),
          }, legendaryCoverage),
          structureSupported: true,
          selectionSupported: true,
          calculationSupported: false,
          displayOnly: false,
        };
      }
      displayOnlyIds.push(item.id);
      return {
        ...item,
        craftAffixes: [],
        craftRuntimeSupport: "display-only",
        craftRuntimeLimitation: "current-tlidb-ss13-craft-category-unverified",
        structureSupported: false,
        selectionSupported: false,
        calculationSupported: false,
        displayOnly: true,
      };
    }
    const assignmentKind = verifyAssignment(item, sourceKey, sourceCategoryIds);
    if (assignmentKind === "category") categoryAssignments += 1;
    else graftAssignments += 1;
    const craftSource = sourceArrays.get(sourceKey);
    if (!craftSource) fail("verified-source-array-missing", item.id, sourceKey);
    return {
      ...item,
      craftAffixes: craftSource.affixes,
      craftRuntimeSupport: "verified-current-tlidb",
      craftRuntimeSourceKey: sourceKey,
      craftRuntimeCoverage: itemRuntimeCoverage(
        craftSource,
        legendary.coverageByItemId.get(item.id),
      ),
    };
  });

  requireExactIds(legendaryOnlyIds, EXPECTED_LEGENDARY_ONLY_IDS, "legendaryOnlyIds");
  requireExactIds(selectionOnlyIds, EXPECTED_SELECTION_ONLY_IDS, "selectionOnlyIds");
  requireExactIds(
    routedSpecialSlateIds,
    EXPECTED_ROUTED_SPECIAL_SLATE_IDS,
    "routedSpecialSlateIds",
  );
  requireExactIds(displayOnlyIds, EXPECTED_DISPLAY_ONLY_IDS, "displayOnlyIds");
  const craftAssignments = categoryAssignments + graftAssignments;
  const assignments = craftAssignments + legendaryOnlyIds.length + selectionOnlyIds.length;
  requireCount(craftAssignments, EXPECTED_VERIFIED_CRAFT_ASSIGNMENTS, "verifiedCraftAssignments");
  requireCount(legendaryOnlyIds.length, EXPECTED_VERIFIED_LEGENDARY_ONLY_ASSIGNMENTS, "verifiedLegendaryOnlyAssignments");
  requireCount(assignments, EXPECTED_VERIFIED_ASSIGNMENTS, "verifiedAssignments");
  requireCount(categoryAssignments, EXPECTED_CATEGORY_ASSIGNMENTS, "categoryAssignments");
  requireCount(graftAssignments, EXPECTED_GRAFT_ASSIGNMENTS, "graftAssignments");
  for (const [key, expected] of Object.entries(EXPECTED_SOURCE_AUDIT)) {
    requireCount(audit[key], expected, `sourceAudit.${key}`);
  }

  const verification = Object.freeze({
    activeSeason: "SS13",
    sourceAuthority: "tlidb-current-ss13-exact-stable-locale-aliases",
    structuralReferenceVersion: overlay.metadata?.runtimeManifestVersion,
    structuralReferenceIsAuthority: false,
    currentGear: gear.length,
    assignments,
    craftAssignments,
    categoryAssignments,
    graftAssignments,
    legendaryOnlyAssignments: legendaryOnlyIds.length,
    legendaryOnlyItemIds: Object.freeze([...legendaryOnlyIds]),
    selectionOnlyAssignments: selectionOnlyIds.length,
    selectionOnlyItemIds: Object.freeze([...selectionOnlyIds]),
    calculationUnsupportedAssignments: selectionOnlyIds.length,
    routedSpecialSlateItems: routedSpecialSlateIds.length,
    routedSpecialSlateItemIds: Object.freeze([...routedSpecialSlateIds]),
    unassignedItems: unassignedIds.length,
    unassignedItemIds: Object.freeze([...unassignedIds]),
    displayOnlyItems: displayOnlyIds.length,
    displayOnlyItemIds: Object.freeze([...displayOnlyIds]),
    removedAssignments: removedAssignmentIds.length,
    removedAssignmentIds: Object.freeze([...removedAssignmentIds]),
    sourceArrays: sourceArrays.size,
    ...audit,
    complete: false,
    sourceLimitations: Object.freeze([
      "7 current TLIDB SS13 divinity-slate records are excluded from equipment and routed to the verified divinity editor",
      "2 current TLIDB SS13 legendary gear records are selectable and saveable, but incomplete stable modifier identity keeps their unverified effects out of editing and calculation",
      "removed, dangling, and current-text-mismatched SS13.2 craft rows are isolated; 1140 localized Nightmare affixes are displayed with current TLIDB Korean semantic templates but remain excluded from selection and calculation because direct roll-value authority is unverified",
      "82 current legendary structural rows have no exact modifier identity; their exact flat Korean source is preserved without inferred value authority",
    ]),
  });

  return {
    catalog: { ...catalog, gear: nextGear },
    verification,
  };
}
