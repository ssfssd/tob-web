import { TLIDB_SS13_SKILL_VALUE_AUTHORITY } from "./data/tlidbSs13SkillValueAuthority.generated.js";
import { TLIDB_SS13_SKILL_LEVEL_MECHANIC } from "./data/tlidbSkillLevelMechanic.ss13.js";
import { applySs13SkillCalculationAuthority } from "./ss13SkillCalculationAuthority.js";

const AUTHORITY = "tlidb-current-ss13-profile-values";
const LOCALES = Object.freeze(["ko", "en", "cn"]);

function sameStringList(left, right) {
  const a = [...(left ?? [])].map(String).sort();
  const b = [...(right ?? [])].map(String).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function receiptMatches(record, receipt, locale) {
  return Boolean(
    record?.sourceUrl === receipt?.sourceUrl
    && record?.sourceUrl?.startsWith(`https://tlidb.com/${locale}/`)
    && record?.sourcePageSha256 === receipt?.sourcePageSha256
    && record?.sourcePageVersion === "SS13"
    && receipt?.sourcePageVersion === "SS13"
    && record?.sourceRecordKey === receipt?.sourceRecordKey
    && record?.sourceSeasonEvidence?.verificationComplete === true
    && record?.sourceSeasonEvidence?.actualSeason === 13
    && sameStringList(record?.sourceDataIds, receipt?.sourceDataIds)
  );
}

function entryMatchesItem(entry, category, item) {
  return Boolean(
    entry?.category === category
    && entry?.authority === AUTHORITY
    && entry?.profileField === (category === "skills" ? "skillProfile" : "supportProfile")
    && LOCALES.every((locale) => receiptMatches(
      item?.tlidbText?.[locale],
      entry?.evidence?.localeReceipts?.[locale],
      locale,
    ))
  );
}

function withoutValueAuthority(item) {
  if (!Object.hasOwn(item ?? {}, "calculationValueAuthority")
    && !Object.hasOwn(item ?? {}, "calculationValueEvidence")
    && !Object.hasOwn(item ?? {}, "calculationModelAuthority")
    && !Object.hasOwn(item ?? {}, "calculationCoverage")
    && !Object.hasOwn(item ?? {}, "calculationUnsupportedEffects")
    && !Object.hasOwn(item ?? {}, "profileValueAuthority")
    && !Object.hasOwn(item ?? {}, "profileValueEvidence")) return item;
  const {
    calculationValueAuthority: _calculationValueAuthority,
    calculationValueEvidence: _calculationValueEvidence,
    calculationModelAuthority: _calculationModelAuthority,
    calculationCoverage: _calculationCoverage,
    calculationUnsupportedEffects: _calculationUnsupportedEffects,
    profileValueAuthority: _profileValueAuthority,
    profileValueEvidence: _profileValueEvidence,
    ...rest
  } = item;
  return rest;
}

export function applySs13SkillValueAuthority(category, item) {
  if (category !== "skills" && category !== "supports") return item;
  const clean = withoutValueAuthority(item);
  const entry = TLIDB_SS13_SKILL_VALUE_AUTHORITY.entries?.[item?.id];
  if (!entryMatchesItem(entry, category, clean)) return clean;
  const profiled = {
    ...clean,
    [entry.profileField]: entry.profile,
    profileValueAuthority: AUTHORITY,
    profileValueEvidence: entry.evidence,
    calculationModelAuthority: "unverified",
  };
  return applySs13SkillCalculationAuthority(category, profiled, entry);
}

function profileFailures(entry) {
  const failures = [];
  const valuesByLevel = entry?.profile?.coefficientByLevel ?? entry?.profile?.moreDamageByLevel ?? {};
  const levels = Object.keys(valuesByLevel);
  if (levels.length !== 40 || levels.some((level) => Number(level) < 1 || Number(level) > 40)) {
    failures.push("value-level-range-not-1-through-40");
  }
  if (entry?.category === "skills") {
    if (!(Number(entry.profile?.castTime) > 0)) failures.push("skill-cast-time-invalid");
    if (Object.hasOwn(entry.profile ?? {}, "manaCost")) failures.push("unapplied-stale-skill-field-present");
    const values = Array.from({ length: 40 }, (_, index) => Number(valuesByLevel[index + 1]));
    if (values.some((value, index) => index > 0 && value < values[index - 1])) {
      failures.push("skill-coefficient-unexpected-level-drop");
    }
    const sourceLevelCounts = entry?.evidence?.sourceLevelCounts ?? {};
    const directCounts = LOCALES.map((locale) => Number(sourceLevelCounts[locale]));
    const sourceLevelCount = Number(entry?.evidence?.sourceLevelCount);
    if (
      directCounts.some((count) => count !== 20 && count !== 40)
      || sourceLevelCount !== Math.min(...directCounts)
      || Number(entry?.evidence?.effectiveLevelCount) !== 40
    ) {
      failures.push("skill-source-level-range-evidence-invalid");
    }
    if (sourceLevelCount === 20) {
      if (
        entry?.evidence?.levelExtensionMethod
          !== "tlidb-current-ss13-base-damage-cap-at-20"
        || entry?.evidence?.sourceMethod
          !== "tlidb-current-ss13-level-table-current-card-and-skill-level-cap"
        || JSON.stringify(entry?.evidence?.skillLevelMechanicReceipt)
          !== JSON.stringify(TLIDB_SS13_SKILL_LEVEL_MECHANIC)
        || Array.from({ length: 20 }, (_, index) => index + 21).some((level) => (
          Number(valuesByLevel[level]) !== Number(valuesByLevel[20])
        ))
      ) failures.push("skill-level-cap-evidence-invalid");
    } else if (
      sourceLevelCount === 40
      && (
        entry?.evidence?.levelExtensionMethod !== null
        || entry?.evidence?.skillLevelMechanicReceipt !== null
        || entry?.evidence?.sourceMethod !== "tlidb-current-ss13-level-table-and-current-card"
      )
    ) {
      failures.push("skill-direct-level-table-evidence-invalid");
    }
  } else if (entry?.category === "supports") {
    if ((entry.profile?.compatibleTags?.length ?? 0) !== 1) failures.push("support-compatible-tag-count-invalid");
    if ((entry.profile?.excludedTags?.length ?? 0) !== 0) failures.push("support-unverified-exclusion-present");
    if ((entry.profile?.oneOfTags?.length ?? 0) !== 0) failures.push("support-unverified-one-of-present");
    if (Object.hasOwn(entry.profile ?? {}, "manaCostMultiplier")) failures.push("unapplied-stale-support-field-present");
  }
  return failures;
}

export function auditSs13SkillValueAuthorityArtifact(
  artifact = TLIDB_SS13_SKILL_VALUE_AUTHORITY,
  flatCatalog,
) {
  const failures = [];
  if (artifact?.schemaVersion !== 1) failures.push("authority-schema-invalid");
  if (artifact?.activeSeason !== "SS13") failures.push("authority-season-invalid");
  if (artifact?.authority !== AUTHORITY) failures.push("authority-name-invalid");
  const entries = Object.entries(artifact?.entries ?? {});
  let authoritativeSkills = 0;
  let authoritativeSupports = 0;
  for (const [itemId, entry] of entries) {
    const item = flatCatalog?.catalog?.[entry.category]?.find((candidate) => candidate.id === itemId);
    if (!item) {
      failures.push(`authority-item-missing:${itemId}`);
      continue;
    }
    if (!entryMatchesItem(entry, entry.category, item)) failures.push(`authority-receipt-mismatch:${itemId}`);
    if (entry?.evidence?.calculationApplied !== false
      || entry?.evidence?.calculationModelAuthority !== "unverified") {
      failures.push(`calculation-fail-close-evidence-invalid:${itemId}`);
    }
    for (const failure of profileFailures(entry)) failures.push(`${failure}:${itemId}`);
    if (entry.category === "skills") authoritativeSkills += 1;
    else if (entry.category === "supports") authoritativeSupports += 1;
    else failures.push(`authority-category-invalid:${itemId}`);
  }
  if (authoritativeSkills !== artifact?.report?.authoritativeSkills) {
    failures.push("authority-skill-count-mismatch");
  }
  if (authoritativeSupports !== artifact?.report?.authoritativeSupports) {
    failures.push("authority-support-count-mismatch");
  }
  const blockedTotal = Number(artifact?.report?.blockedSkills ?? 0)
    + Number(artifact?.report?.blockedSupports ?? 0);
  const blockerCountTotal = Object.values(artifact?.report?.blockerCounts ?? {})
    .reduce((sum, value) => sum + Number(value || 0), 0);
  if (blockedTotal !== blockerCountTotal) failures.push("authority-blocker-count-mismatch");
  const artifactIntegrityVerified = failures.length === 0;
  const coverageComplete = artifactIntegrityVerified && blockedTotal === 0;
  return Object.freeze({
    schemaVersion: 1,
    activeSeason: "SS13",
    authoritativeSkills,
    authoritativeSupports,
    blockedSkills: artifact?.report?.blockedSkills ?? 0,
    blockedSupports: artifact?.report?.blockedSupports ?? 0,
    blockerCounts: Object.freeze({ ...(artifact?.report?.blockerCounts ?? {}) }),
    inheritedValueConflictCount: artifact?.report?.inheritedValueConflictCount ?? 0,
    failures: Object.freeze(failures),
    artifactIntegrityVerified,
    coverageComplete,
    verificationComplete: coverageComplete,
  });
}

export { TLIDB_SS13_SKILL_VALUE_AUTHORITY };
