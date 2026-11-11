import { SS13_TALENT_DIRECT_STAT_AUTHORITY } from "./data/ss13TalentDirectStatAuthority.generated.js";

const AUTHORITY_ID = "tlidb-current-ss13-exact-direct-stat";

function freezeStats(stats) {
  return Object.freeze({ ...stats });
}

function freezeRecord(definition) {
  return Object.freeze({
    ...definition,
    lineStats: Object.freeze(Object.fromEntries(
      Object.entries(definition.lineStats).map(([line, stats]) => [line, freezeStats(stats)]),
    )),
  });
}

if (
  SS13_TALENT_DIRECT_STAT_AUTHORITY.schemaVersion !== 1
  || SS13_TALENT_DIRECT_STAT_AUTHORITY.targetSeason !== "SS13"
  || SS13_TALENT_DIRECT_STAT_AUTHORITY.authorityId !== AUTHORITY_ID
) {
  throw new Error("Current SS13 talent direct-stat authority dataset changed");
}

const DIRECT_STAT_RECORDS = Object.freeze(Object.fromEntries(
  Object.entries(SS13_TALENT_DIRECT_STAT_AUTHORITY.records).map(([itemId, definition]) => (
    [itemId, freezeRecord(definition)]
  )),
));

export const SS13_TALENT_VALUE_AUTHORITY_AUDIT = Object.freeze({
  flatCatalogTotal: 1102,
  treeHeadings: 31,
  effectItems: 1071,
  positionedNodes: 880,
  runtimeCoreTalents: 138,
  sourceOnlyEffectItems: 53,
  topologySelectableEffectItems: 1018,
  verifiedDirectStatItems: SS13_TALENT_DIRECT_STAT_AUTHORITY.recordCount,
  verifiedDirectStatLines: SS13_TALENT_DIRECT_STAT_AUTHORITY.lineCount,
  fullyVerifiedDirectStatItems: SS13_TALENT_DIRECT_STAT_AUTHORITY.fullySupportedRecordCount,
  partiallyVerifiedDirectStatItems: SS13_TALENT_DIRECT_STAT_AUTHORITY.partiallySupportedRecordCount,
  unsupportedSiblingLines: SS13_TALENT_DIRECT_STAT_AUTHORITY.unsupportedSiblingLineCount,
  unverifiedPositionedNodes: 880 - SS13_TALENT_DIRECT_STAT_AUTHORITY.recordCount,
  unverifiedRuntimeCoreTalents: 138,
  unverifiedSourceOnlyEffectItems: 53,
  authorityId: AUTHORITY_ID,
});

export function resolveCurrentSs13TalentValueAuthority(item) {
  const definition = DIRECT_STAT_RECORDS[item?.id];
  const ko = item?.tlidbText?.ko;
  const sourceDataIds = ko?.sourceDataIds
    ?? (ko?.sourceDataId == null ? [] : [ko.sourceDataId]);
  const expectedDataId = String(item?.id ?? "").replace(/^talents-/, "");
  if (
    !definition
    || item?.sourceConflict
    || definition.sourceDataId !== expectedDataId
    || ko?.sourceSeasonEvidence?.sourcePageVersion !== "SS13"
    || ko?.sourceSeasonEvidence?.verificationComplete !== true
    || ko?.sourceSeasonEvidence?.contentSha256 !== definition.sourcePageSha256
    || ko?.sourceFieldStatus?.detail !== "exact"
    || ko?.sourceMethod !== "tlidb-ss13-talent-tree-node-stable-id"
    || ko?.sourceUrl !== definition.sourceUrl
    || ko?.sourcePageSha256 !== definition.sourcePageSha256
    || ko?.sourceRecordKey !== definition.sourceRecordKey
    || !sourceDataIds.map(String).includes(expectedDataId)
    || ko?.detail !== definition.detail
  ) return null;

  return Object.freeze({
    authorityId: AUTHORITY_ID,
    itemId: item.id,
    sourceDataId: definition.sourceDataId,
    sourceRecordKey: definition.sourceRecordKey,
    sourceUrl: definition.sourceUrl,
    sourcePageSha256: definition.sourcePageSha256,
    exactDetail: definition.detail,
    lineStats: definition.lineStats,
  });
}

export function getCurrentSs13TalentValueAuthorityRecords() {
  return DIRECT_STAT_RECORDS;
}
