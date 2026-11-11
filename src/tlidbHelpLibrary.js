import { TLIDB_HELP } from "./data/tlidbHelp.generated.js";
import { TLIDB_HELP_KO_TITLES } from "./data/tlidbHelpKoTitles.js";
import { TLIDB_HELP_HISTORY } from "./data/tlidbHelpHistory.js";
import { containsHanScript } from "./gameTextPresentation.js";

// The Gear navigation card (TextTable_GameFunc|value|Func_FilterType_Type1)
// was collected as help prose. Exclude only its verified SS13 prefix, not
// untranslated explanatory paragraphs. Live structure inspected 2026-10-14.
const GEAR_NAVIGATION_PREFIX = "Helmet:\nSTR Helmet\nDEX Helmet\nINT Helmet\n\nChest Armor:\nSTR Chest Armor\nDEX Chest Armor\nINT Chest Armor\n\nGloves:\nSTR Gloves\nDEX Gloves\nINT Gloves\n\nBoots:\nSTR Boots\nDEX Boots\nINT Boots\n\nOne-handed:\nClaw\nDagger\nOne-Handed Sword\nOne-Handed Hammer\nOne-Handed Axe\nWand\nRod\nScepter\nCane\nPistol\n\nTwo-handed:\nTwo-Handed Sword\nTwo-Handed Hammer\nTwo-Handed Axe\nTin Staff\nCudgel\nBow\nCrossbow\nMusket\nFire Canon\n\nShield:\nSTR Shield\nDEX Shield\nINT Shield\n\nTrinket:\nNecklace\nRing\nBelt\nSpirit Ring\n\nHero:\nHero Memories\nDivinity Slate\n\nDestiny\nEthereal Prism\n\nVorax:\nVorax Limb: Head\nVorax Limb: Chest\nVorax Limb: Hands\nVorax Limb: Legs\nVorax Aberrant Limb: Legs\nVorax Limb: Neck\nVorax Limb: Digits\nVorax Aberrant Limb: Digits\nVorax Limb: Waist\nVorax Aberrant Limb: Waist\n\n";
const GEAR_NAVIGATION_RECEIPTS = {
  "tlidb-help-123-57f64bf97158": {
    url: "https://tlidb.com/ko/Craft",
    sha256: "b5db4bbabf8d210d8212fdd4edc913005258d566c89fc8d01d76355e8923d7c0",
    inspectedPageSha256: "139abc3b3310093d08dd023122c377e1da6c5c1bcca9432b2741d0130370bd32",
  },
  "tlidb-help-194-a8c05b3c45c4": {
    url: "https://tlidb.com/ko/Legendary_Gear",
    sha256: "7a564c6a2f6381b9bc422d4065ebae6498d6f9311b7f52d1f9e83de2dce4bf42",
    inspectedPageSha256: "c929d43aa4ce8054a7a87d4cd0b6f4bb6043504822ab850684465f2137eff4f9",
  },
};

// Display-only historical supplement. Never feed launch-season prose into
// SS13 calculation authority or replace the collected source bodies.
export const DIVINITY_HISTORY_KO_SOURCE = Object.freeze({
  entryId: "tlidb-help-196-a2003a31a209",
  entryUrl: "https://tlidb.com/ko/Divinity_Slate",
  entrySha256: "1f91af7d41755c32452e81ef9aeba3304f257a3ba1607f86d2b0ca4ac066cca3",
  sourceUrl: "https://tlidb.com/ko/Cube_Season",
  inspectedAt: "2026-10-15",
  sourceSha256: "2318341a7ebf40ab262da34f1e22a1abcc6f98bb364bdb846a5b9201d7152255",
  scope: "historical-display-only",
  englishLines: Object.freeze([
    "In the new season's adventure, Hunters have the opportunity to obtain a unique item called Divinity Slate.",
    "Each Divinity Slate is associated with a deity and can hold up to 2 random Talent Affixes from the corresponding god.",
    "The new god offers Hunters a fresh Talent Panel, the Statue of The New God. Unlike previous Talent Panels, Hunters can combine and place multiple Divinity Slates on the Statue of The New God to gain potent buffs. This feature enables Hunters to bridge the gap between divine Talents and utilize the power of the six gods more flexibly.",
  ]),
  koreanParagraphs: Object.freeze([
    "모험을 통해 신규 아이템인 '신격의 석판'을 획득하실 수 있습니다. 석판별로 상응되는 신이 있으며, 해당 신의 재능 옵션을 최대 2개까지 보유할 수 있습니다.",
    "신규 시즌에는 새로운 재능 보드인 새로운 신의 조각상이 추가되었습니다. 새로운 신의 조각상에 여러개의 신격의 석판을 배치하여 더욱 강력한 버프를 획득할 수 있습니다. 이를 통해 더 자유롭게 여섯 신의 능력을 사용할 수 있을 것입니다.",
  ]),
});

export function partitionTlidbHelpBody(entry, locale = "ko") {
  const source = entry?.locales?.[locale];
  const body = String(source?.body ?? "");
  const history = TLIDB_HELP_HISTORY[entry?.id];
  const suffix = history ? `\n\n${history.body}` : "";
  if (!history || source?.status !== "collected"
    || source.url !== `https://tlidb.com/${locale}/${history.slug}`
    || source.sha256 !== history.pageSha256[locale] || !body.endsWith(suffix)) {
    return { currentBody: body, historyBody: "" };
  }
  return { currentBody: body.slice(0, -suffix.length), historyBody: history.body };
}

export function getKoreanHelpBody(entry, scope = "current") {
  const source = entry?.locales?.ko;
  const partition = partitionTlidbHelpBody(entry);
  let body = scope === "history" ? partition.historyBody : partition.currentBody;
  if (scope === "history" && !body) return "";
  const receipt = GEAR_NAVIGATION_RECEIPTS[entry?.id];
  if (receipt && source.url === receipt.url && source.sha256 === receipt.sha256
    && body.startsWith(GEAR_NAVIGATION_PREFIX)) {
    body = body.slice(GEAR_NAVIGATION_PREFIX.length);
  }
  // This is the verified table heading, not an untranslated game rule.
  if (scope !== "history" && partition.historyBody && entry?.id === DIVINITY_HISTORY_KO_SOURCE.entryId
    && body.startsWith("Drop Source\n")) body = body.slice("Drop Source\n".length);
  const history = DIVINITY_HISTORY_KO_SOURCE;
  if (scope === "history" && entry?.id === history.entryId && source?.url === history.entryUrl
    && source.sha256 === history.entrySha256
    && history.englishLines.every((line) => body.split(/\r?\n/u).includes(line))) {
    body += `\n\n과거 시즌 소개 — 2023년 큐브 시즌\n아래는 당시 소개문의 한국어 원문입니다. 현재 SS13 규칙의 근거로 사용하지 않습니다.\n\n${history.koreanParagraphs.join("\n\n")}\n\n출처: ${history.sourceUrl}`;
  }
  // The collected SS13 prose escapes percent signs. Decode only the current
  // display copy; keep the source bodies and historical material unchanged.
  return koreanHelpBody(scope === "current" ? body.replaceAll("%%", "%") : body);
}


function normalizeHelpLocale(locale) {
  return locale === "en" ? "en" : "ko";
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function koreanHelpBody(body) {
  let omitted = false;
  const lines = String(body ?? "").split(/\r\n|\r|\n/u);
  const safeLines = lines.filter((line) => {
    if (/^\s*id:\s*\d+\s*$/u.test(line)) return false;
    // Keep the collected Korean sentences and formulas verbatim. English-only
    // paragraphs and scraped page IDs are not Korean source text to translate.
    const foreignOnly = /[A-Za-z]/u.test(line)
      && !/\p{Script=Hangul}/u.test(line)
      && !/^(?:HP|MP|SS\d+)$/u.test(line.trim());
    if (!containsHanScript(line) && !foreignOnly) return true;
    omitted = true;
    return false;
  });
  if (safeLines.length === lines.length) return body;
  const safeBody = safeLines.join("\n").replace(/\n{3,}/gu, "\n\n").trim();
  if (!omitted) return safeBody || "한국어 원문 미제공";
  return safeBody
    ? `${safeBody}\n\n한국어 원문 일부 미제공`
    : "한국어 원문 미제공";
}

function localizedHelpEntry(entry, locale, scope) {
  const localized = entry?.locales?.[locale];
  if (localized?.status !== "collected") return null;
  const partition = partitionTlidbHelpBody(entry, locale);
  if (scope === "history" && !partition.historyBody) return null;
  return Object.freeze({
    id: entry.id,
    ordinal: entry.ordinal,
    title: locale === "ko" ? TLIDB_HELP_KO_TITLES[entry.id] ?? localized.title : localized.title,
    body: locale === "ko" ? getKoreanHelpBody(entry, scope)
      : scope === "history" ? partition.historyBody : partition.currentBody,
    sourceUrl: localized.url,
  });
}

export function resolveTlidbHelpView({ locale = "ko", query = "", selectedId = "", scope = "current" } = {}) {
  const normalizedLocale = normalizeHelpLocale(locale);
  const normalizedScope = scope === "history" ? "history" : "current";
  const normalizedQuery = normalizeSearchText(query);
  const allEntries = TLIDB_HELP.entries
    .map((entry) => localizedHelpEntry(entry, normalizedLocale, normalizedScope))
    .filter(Boolean);
  const entries = normalizedQuery
    ? allEntries.filter((entry) => normalizeSearchText(`${entry.title}\n${entry.body}`).includes(normalizedQuery))
    : allEntries;
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;

  return Object.freeze({
    locale: normalizedLocale,
    scope: normalizedScope,
    totalCount: allEntries.length,
    resultCount: entries.length,
    entries: Object.freeze(entries),
    selected,
  });
}
