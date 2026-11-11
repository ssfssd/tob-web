import { findItemById } from "./catalog.js";

// Display-only repairs for the audited support filters. Never rewrite the
// runtime tags: compatibility and filtering still use their original values.
const TAGS_WITH_SS13_ANCHORS = new Set([
  "激发", "连锁", "地面", "轰炸", "射线", "哨卫", "诅咒", "抛射",
  "法术", "连携", "防护", "智械", "光环",
]);
const QUALITY_NAME_TAGS = new Set(["华贵", "崇高"]);
const QUALITY_NAME_SOURCES = Object.freeze({
  华贵: "supports-tlidb-com-cn-shadow-shot-3a-eradicate-28magnificent-29",
  崇高: "supports-tlidb-com-cn-shadow-swamp-3a-overlapping-waves-28noble-29",
});

function verifiedSs13Locale(source, locale) {
  const evidence = source?.sourceSeasonEvidence;
  return source?.sourceUrl?.startsWith(`https://tlidb.com/${locale}/`)
    && (source.sourcePageVersion ?? evidence?.sourcePageVersion) === "SS13"
    && evidence?.actualSeason === 13 && evidence.verificationComplete === true
    && /^[a-f\d]{64}$/u.test(source.sourcePageSha256 ?? "");
}

function verifiedCardLocales(item) {
  const cn = item?.tlidbText?.cn;
  const ko = item?.tlidbText?.ko;
  if (!verifiedSs13Locale(cn, "cn") || !verifiedSs13Locale(ko, "ko")
    || cn.sourceUrl.replace("/cn/", "/ko/") !== ko.sourceUrl
    || !cn.sourceRecordKey || cn.sourceRecordKey !== ko.sourceRecordKey) return null;
  return { cn, ko };
}

function qualityName(locales, sourceTag) {
  if (!locales || locales.cn.sourceFieldStatus?.name !== "exact"
    || locales.ko.sourceFieldStatus?.name !== "exact"
    || !locales.cn.name?.endsWith(`（${sourceTag}）`)) return null;
  const text = locales.ko.name?.match(/\(([^()]+)\)$/u)?.[1];
  return text && /^\p{Script=Hangul}+$/u.test(text) ? text : null;
}

export function getSs13SupportFilterTag(item, sourceTag) {
  const locales = verifiedCardLocales(item);
  if (!locales) return null;
  const { cn, ko } = locales;

  if (TAGS_WITH_SS13_ANCHORS.has(sourceTag)) {
    if (cn.sourceFieldStatus?.tags !== "exact" || ko.sourceFieldStatus?.tags !== "exact"
      || !Array.isArray(cn.tags) || !Array.isArray(ko.tags) || cn.tags.length !== ko.tags.length
      || cn.tags.filter((tag) => tag === sourceTag).length !== 1) return null;
    // The runtime omits some tags (such as Support). Match the source token in
    // the original card, not its ordinal in that shortened runtime array.
    const text = ko.tags[cn.tags.indexOf(sourceTag)];
    return typeof text === "string" && /\p{Script=Hangul}/u.test(text) && !/\p{Script=Han}/u.test(text)
      ? text : null;
  }

  if (QUALITY_NAME_TAGS.has(sourceTag) && cn.sourceFieldStatus?.name === "exact"
    && ko.sourceFieldStatus?.name === "exact" && cn.name?.endsWith(`（${sourceTag}）`)) {
    // Magnificent/Noble are exact suffixes of the same SS13 card's name,
    // not tags on that card. Preserve the complete source name itself.
    const exact = qualityName(locales, sourceTag);
    if (exact) return exact;
    // Arrowstorm's Korean name omits the qualifier. Its Chinese card still
    // identifies the exact quality; read that quality's Korean name from a
    // verified SS13 card, without appending anything to Arrowstorm's name.
    if (typeof ko.name !== "string" || !ko.name || /[()（）]/u.test(ko.name)) return null;
    return qualityName(verifiedCardLocales(findItemById(QUALITY_NAME_SOURCES[sourceTag])), sourceTag);
  }
  return null;
}
