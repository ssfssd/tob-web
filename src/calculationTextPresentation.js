import { findItemById } from "./catalog.js";
import { TLIDB_HELP } from "./data/tlidbHelp.generated.js";
import { TLIDB_SS13_SITE_SNAPSHOT } from "./data/tlidbSs13SiteSnapshot.generated.js";
import { presentGameText } from "./gameTextPresentation.js";

const UNAVAILABLE = "한국어 원문 미제공";

const CALCULATION_FUNCTION_LABELS = { min: "최솟값", max: "최댓값", clamp: "범위 제한" };

// App-owned formula display only; never evaluate or rewrite the stored expression.
// TLIDB prose and its original notation use the separate source-text path below.
export function presentCalculationExpression(value, locale = "ko") {
  if (typeof value !== "string" || locale !== "ko") return value;
  return value.replace(/(?<![\p{L}\p{N}_$.])(min|max|clamp)(?=\s*\()/gu,
    (name) => CALCULATION_FUNCTION_LABELS[name]);
}

// The title is on the Banishment row, not the separate Effect: Ill Omen row.
// Extracted from the unchanged ko/en Hyperlink HTML in this verified SS13 run.
// Title-only receipt: it does not authorize any effect or numeric replacement.
export const ILL_OMEN_TITLE_SS13_SOURCE = Object.freeze({
  scope: "display-title-only",
  season: 13,
  refreshRunId: "refresh-2026-07-16T09-35-57-544Z",
  sourceRecordKey: "href:Banishment%3A_Ill_Omen",
  deploymentFingerprint: Object.freeze({
    stdthemeVersion: "1784128431", headerScriptVersion: "1784128431", campaignDate: "20260609",
  }),
  locales: Object.freeze({
    ko: Object.freeze({
      sourceUrl: "https://tlidb.com/ko/Hyperlink",
      sourcePageSha256: "4c1ec978df5e51544e34a5a7fead9c2155b5c5729d5d2a2e8b4936ed8f9f3071",
      name: "추방: 오멘",
    }),
    en: Object.freeze({
      sourceUrl: "https://tlidb.com/en/Hyperlink",
      sourcePageSha256: "258f93d82da816153da9cbae074b267b323e365ea6d1d93bed79199059688fe2",
      name: "Banishment: Ill Omen",
    }),
  }),
});

export function getSs13IllOmenTitle(snapshot = TLIDB_SS13_SITE_SNAPSHOT) {
  const receipt = ILL_OMEN_TITLE_SS13_SOURCE;
  if (snapshot?.metadata?.targetSeason !== receipt.season
    || snapshot.metadata.verificationComplete !== true
    || snapshot.metadata.refreshRunId !== receipt.refreshRunId) return UNAVAILABLE;
  const sameDeployment = ["ko", "en"].every((locale) => {
    const root = snapshot.roots?.[locale];
    return root?.targetSeason === receipt.season && root.locale === locale
      && root.localeMatches === true && root.verificationComplete === true
      && Object.entries(receipt.deploymentFingerprint).every(([key, value]) => root.deploymentFingerprint?.[key] === value);
  });
  return sameDeployment ? receipt.locales.ko.name : UNAVAILABLE;
}

// Display vocabulary from the preserved SS13 help pages, not a new translation.
const TERM_SOURCES = {
  attackSpeed: ["Skill_Speed", "공격 속도"],
  castSpeed: ["Skill_Speed", "시전 속도"],
  critDamage: ["Critical_Strike", "크리티컬 대미지"],
  shieldCharge: ["Shield", "보호막 충전"],
  doubleDamage: ["Damage_Form", "이중 대미지"],
};

export function getSs13CalculationTerm(key) {
  const receipt = TERM_SOURCES[key];
  if (!receipt || TLIDB_HELP.metadata.season !== "SS13"
    || TLIDB_HELP.metadata.verificationComplete !== true) return UNAVAILABLE;
  const [slug, term] = receipt;
  const source = TLIDB_HELP.entries.find((entry) => entry.slug === slug)?.locales?.ko;
  return source?.status === "collected" && source.url === `https://tlidb.com/ko/${slug}`
    && source.sha256 && source.body.includes(term) ? term : UNAVAILABLE;
}

// Exact English/Korean line pairs on the same SS13 card. No numeric substitution
// in effect prose: an unmatched value must remain unavailable.
export const CALCULATION_SOURCE_LINE_RECEIPTS = Object.freeze([
  ["slates-tlidb-data-id-92100009", "+8 % additional Affliction effect", "심화 효과 추가 +8 %"],
  ["slates-tlidb-data-id-92100009", "+48 Affliction inflicted per second", "초당 시전 심화 수치 +48"],
  ["slates-tlidb-data-id-90000115", "+10 % Life Regain", "HP 반환 +10 %"],
  ["slates-tlidb-data-id-90000115", "+10 % Energy Shield Regain", "보호막 반환 +10 %"],
  ["slates-tlidb-data-id-90000116", "Regenerates 6 % Life per second", "1초당 HP 6 % 회복"],
  ["skills-tlidb-com-cn-charged-flames", "+35 % additional Fire Damage", "화염 대미지 추가 +35 %"],
  ["gear-tlidb-com-cn-blessing-pendant", "+25 % Max Energy Shield", "최대 보호막 +25 %"],
  ["gear-tlidb-com-cn-blessing-pendant", "-20 % additional Energy Shield Charge Interval", "보호막 에너지 충전 간격 추가 -20 %"],
  ["gear-tlidb-com-cn-double-rainbow", "+1 % All Stats", "모든 속성 +1 %"],
  ["gear-tlidb-com-cn-futile-tradeoff", "+1 % Max Life", "최대 HP +1 %"],
  ["gear-tlidb-com-cn-futile-tradeoff", "+1 % Max Energy Shield", "최대 보호막 +1 %"],
  ["gear-tlidb-com-cn-futile-tradeoff", "+1 % Max Mana", "최대 MP +1 %"],
  ["gear-tlidb-com-cn-chaotic-ending", "+8 % Max Life", "최대 HP +8 %"],
  ["gear-tlidb-com-cn-chaotic-ending", "+9 % Max Energy Shield", "최대 보호막 +9 %"],
  ["gear-tlidb-com-cn-folklore-of-locking-fingers", "+10 % Max Life and Max Energy Shield", "최대 HP와 최대 보호막 +10 %"],
  ["gear-tlidb-com-cn-iron-nest", "+40 % Armor", "아머 수치 +40 %"],
  ["gear-tlidb-com-cn-championed-spirit-ring", "+18 % Minion Damage", "소환체 대미지 +18 %"],
  ["gear-tlidb-com-cn-essence-spirit-ring", "+24 % Minion Damage", "소환체 대미지 +24 %"],
  ["slates-tlidb-data-id-90000009", "+15 % Critical Strike Damage", "크리티컬 대미지 +15 %"],
  ["slates-tlidb-data-id-90000011", "+6 % Attack and Cast Speed", "공격 및 시전 속도 +6 %"],
  ["slates-tlidb-data-id-90000013", "+18 % Skill Area", "스킬 범위 +18 %"],
  ["slates-tlidb-data-id-90000014", "+720 Armor", "아머 수치 +720"],
  ["slates-tlidb-data-id-90000015", "+720 Evasion", "회피 수치 +720"],
  ["slates-tlidb-data-id-90000016", "+7 % Cold Resistance", "냉기 저항 +7 %"],
  ["slates-tlidb-data-id-90000017", "+7 % Fire Resistance", "화염 저항 +7 %"],
  ["slates-tlidb-data-id-90000018", "+7 % Lightning Resistance", "번개 저항 +7 %"],
  ["slates-tlidb-data-id-90000019", "+7 % Erosion Resistance", "부식 저항 +7 %"],
  ["slates-tlidb-data-id-90000100", "+6 % Elemental and Erosion Resistance Penetration", "원소와 부식 저항 관통 +6 %"],
  ["slates-tlidb-data-id-90000101", "+6 % Armor DMG Mitigation Penetration", "아머 대미지 감소 관통 +6 %"],
  ["slates-tlidb-data-id-90000102", "+8 % chance to deal Double Damage", "+8 % 확률로 이중 대미지 부여"],
  ["slates-tlidb-data-id-90000106", "+6 % Movement Speed", "이동 속도 +6 %"],
  ["slates-tlidb-data-id-90000107", "+6 % Aura Effect", "오라 효과 +6 %"],
  ["slates-tlidb-data-id-90000108", "+6 % Sealed Mana Compensation", "MP 봉인 보상 +6 %"],
  ["slates-tlidb-data-id-90000111", "+30 Strength", "힘 +30"],
  ["slates-tlidb-data-id-90000112", "+30 Dexterity", "민첩 +30"],
  ["slates-tlidb-data-id-90000113", "+30 Intelligence", "지혜 +30"],
].map((receipt) => Object.freeze(receipt)));

const HEADER_RECEIPTS = [
  ["skills-tlidb-com-cn-charged-flames", "Sealed Mana", "MP 봉인"],
  ["supports-tlidb-com-cn-restrain", "Mana Cost Multiplier", "MP 소모 배율"],
];

function hasExactSs13Line(itemId, locale, line) {
  const source = findItemById(itemId)?.tlidbText?.[locale];
  const season = source?.sourceSeasonEvidence;
  return source?.sourceFieldStatus?.detail === "exact"
    && season?.verificationComplete === true && season.actualSeason === 13
    && (source.sourcePageVersion ?? season.sourcePageVersion) === "SS13"
    && source.sourceUrl?.startsWith(`https://tlidb.com/${locale}/`)
    && Boolean(source.sourcePageSha256)
    && typeof source.detail === "string"
    && source.detail.split(/\r?\n/u).includes(line);
}

function verifiedPair([itemId, english, korean]) {
  return hasExactSs13Line(itemId, "en", english) && hasExactSs13Line(itemId, "ko", korean);
}

export function presentCalculationSourceText(value, locale = "ko") {
  if (typeof value !== "string" || locale !== "ko" || !value.trim()) return value;
  if (value === ILL_OMEN_TITLE_SS13_SOURCE.locales.en.name) return getSs13IllOmenTitle();
  const receipt = CALCULATION_SOURCE_LINE_RECEIPTS.find(([, english]) => english === value);
  if (receipt && verifiedPair(receipt)) return receipt[2];
  for (const header of HEADER_RECEIPTS) {
    if (!value.startsWith(`${header[1]} `) || !verifiedPair(header)) continue;
    const numericText = value.slice(header[1].length + 1);
    // Translate only the verified header; retain the engine's numeric text verbatim.
    if (/^\d+(?:\.\d+)?%$/u.test(numericText)) return `${header[2]} ${numericText}`;
  }
  // Unmatched English still requires exact Korean source evidence.
  if (!/\p{Script=Hangul}/u.test(value)) return UNAVAILABLE;
  return presentGameText(value, { locale });
}
