import { OFFICIAL_SS13_PATCH_NOTES } from "./data/officialSs13PatchNotes.generated.js";
import { TLIDB_NETHER_KING_TALENTS_SS13 } from "./data/tlidbNetherKingTalents.ss13.generated.js";

const UNAVAILABLE_KO = "한국어 원문 미제공";
const HAN_SCRIPT_PATTERN = /\p{Script=Han}/u;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

const metadata = OFFICIAL_SS13_PATCH_NOTES?.metadata;
const sourceVerified = metadata?.sourceKind === "official-season-patch-notes"
  && metadata?.season === "SS13"
  && metadata?.activeBaseline?.season === "SS13"
  && metadata?.verificationComplete === true;

const tlidbBanishmentReceipt = TLIDB_NETHER_KING_TALENTS_SS13?.banishmentProfileReceipts;
const tlidbBanishmentVerified = tlidbBanishmentReceipt?.metadata?.activeSeason === "SS13"
  && tlidbBanishmentReceipt?.metadata?.verificationComplete === true
  && tlidbBanishmentReceipt?.metadata?.localePolicy
    === "Exact current TLIDB locale text only; no inferred translations";

function localeRecordText(sourceKey, locale) {
  const unavailable = locale === "ko" ? UNAVAILABLE_KO : "Source text unavailable";
  if (!sourceVerified) return unavailable;
  const value = OFFICIAL_SS13_PATCH_NOTES.records?.[sourceKey]?.locales?.[locale];
  return typeof value === "string" && value.trim() ? value : unavailable;
}

function recordText(sourceKey) {
  return localeRecordText(sourceKey, "ko");
}

function exactFragment(sourceKey, fragment) {
  const value = recordText(sourceKey);
  return value.includes(fragment) ? fragment : UNAVAILABLE_KO;
}

function exactLocaleFragment(sourceKey, locale, fragment) {
  const value = localeRecordText(sourceKey, locale);
  const unavailable = locale === "ko" ? UNAVAILABLE_KO : "Source text unavailable";
  return value.includes(fragment) ? fragment : unavailable;
}

function localizedRecord(sourceKey) {
  return {
    ko: localeRecordText(sourceKey, "ko"),
    en: localeRecordText(sourceKey, "en"),
  };
}

function currentTlidbInputLabel(profileId, mechanicIndex, fragment) {
  if (!tlidbBanishmentVerified) return null;
  const profile = tlidbBanishmentReceipt.profiles.find(({ id }) => id === profileId);
  const locale = profile?.mechanics
    ?.find((mechanic) => mechanic.mechanicIndex === mechanicIndex)
    ?.locales?.ko;
  const sourceText = typeof locale?.sourceText === "string" ? locale.sourceText : "";
  if (
    !sourceText.includes(fragment)
    || HAN_SCRIPT_PATTERN.test(sourceText)
    || locale?.sourceMethod !== "tlidb-current-ss13-hyperlink-detail-line"
    || !String(locale?.sourceUrl ?? "").startsWith("https://tlidb.com/ko/")
  ) return null;
  return {
    value: fragment,
    sourceKind: "tlidb-current-ko",
    sourceUrl: locale.sourceUrl,
    sourceRecordUrl: locale.sourceRecordUrl,
    sourceRecordKey: locale.sourceRecordKey,
    sourcePageSha256: locale.sourcePageSha256,
    sourceText,
  };
}

function officialInputLabel(sourceKey, fragment) {
  const value = exactFragment(sourceKey, fragment);
  return {
    value,
    sourceKind: value === UNAVAILABLE_KO ? "unavailable" : "official-ss13-ko-supplement",
    sourceUrl: metadata?.sourceUrl ?? null,
    sourcePageSha256: metadata?.sourcePageSha256 ?? null,
    sourceKey,
    sourceText: recordText(sourceKey),
  };
}

function preferredInputLabel({ profileId, mechanicIndex, tlidbFragment, sourceKey, officialFragment }) {
  return currentTlidbInputLabel(profileId, mechanicIndex, tlidbFragment)
    ?? officialInputLabel(sourceKey, officialFragment);
}

function quotedTitle(sourceKey, locale = "ko") {
  const value = localeRecordText(sourceKey, locale);
  const match = value.match(/^(?:「|“|")(.+)(?:」|”|")$/u);
  return match?.[1] ?? (locale === "ko" ? UNAVAILABLE_KO : "Source text unavailable");
}

function officialLocaleSupplement(sourceKey) {
  const record = OFFICIAL_SS13_PATCH_NOTES.records?.[sourceKey];
  const ko = typeof record?.locales?.ko === "string" ? record.locales.ko.trim() : "";
  const en = typeof record?.locales?.en === "string" ? record.locales.en.trim() : "";
  const verified = sourceVerified && Boolean(ko) && Boolean(en);
  return {
    verified,
    sourceKey,
    sourceKind: metadata?.sourceKind ?? null,
    sourceUrl: metadata?.sourceUrl ?? null,
    sourcePageSha256: metadata?.sourcePageSha256 ?? null,
    sourceTextByLocale: verified ? { ko, en } : { ko: UNAVAILABLE_KO, en: "Source text unavailable" },
  };
}

function officialLocaleSupplementWithConflicts(sourceKey, conflictSourceKeys) {
  return {
    ...officialLocaleSupplement(sourceKey),
    conflicts: conflictSourceKeys.map(officialLocaleSupplement),
  };
}

const INPUT_LABEL_SOURCES = {
  banishmentParalyzedEnemy: preferredInputLabel({
    profileId: "demolisher",
    mechanicIndex: 1,
    tlidbFragment: "마비 된 적",
    sourceKey: "k0230",
    officialFragment: "마비 상태의 적",
  }),
  banishmentMobilityAttackUsed: preferredInputLabel({
    profileId: "shadow_strike",
    mechanicIndex: 0,
    tlidbFragment: "위치 이동 공격 스킬 시전 후",
    sourceKey: "k0234",
    officialFragment: "위치 이동 공격 스킬 사용 후",
  }),
  banishmentSpellBurstAtCap: preferredInputLabel({
    profileId: "spell_burst",
    mechanicIndex: 1,
    tlidbFragment: "매직 버스트 충전이 최대에 도달",
    sourceKey: "k0238",
    officialFragment: "매직 버스트 충전이 최대에 도달",
  }),
  banishmentDealingDamageOverTime: preferredInputLabel({
    profileId: "ill_omen",
    mechanicIndex: 1,
    tlidbFragment: "지속 대미지 부여 시",
    sourceKey: "k0241",
    officialFragment: "지속 대미지를 가할 때",
  }),
  banishmentNearestSyntheticTroopMaxLife: preferredInputLabel({
    profileId: "tangle",
    mechanicIndex: 1,
    tlidbFragment: "거리상 최근인 스마트 웨폰소환체 1개의 최대 HP",
    sourceKey: "k0255",
    officialFragment: "거리상 최근인 스마트 웨폰소환체 1개의 최대 HP",
  }),
  banishmentLethalHit: preferredInputLabel({
    profileId: "indomitable",
    mechanicIndex: 0,
    tlidbFragment: "치명적 일격을 받을 때",
    sourceKey: "k0257",
    officialFragment: "치명적 일격을 받을 시",
  }),
};

const BANISHMENT_NAME_SOURCE_KEYS = Object.freeze({
  demolisher: "k0229",
  steep_strike: "k0231",
  shadow_strike: "k0233",
  spell_burst: "k0236",
  ill_omen: "k0239",
  quagmire: "k0243",
  projection: "k0245",
  provision: "k0249",
  tangle: "k0253",
  indomitable: "k0256",
});

const BANISHMENT_NAMES_BY_LOCALE = Object.fromEntries(
  Object.entries(BANISHMENT_NAME_SOURCE_KEYS).map(([id, sourceKey]) => [
    id,
    { ko: quotedTitle(sourceKey, "ko"), en: quotedTitle(sourceKey, "en") },
  ]),
);

export const HADES_KOREAN_PRESENTATION = deepFreeze({
  source: {
    verified: sourceVerified,
    sourceKind: metadata?.sourceKind ?? null,
    sourceUrl: metadata?.sourceUrl ?? null,
    sourcePageSha256: metadata?.sourcePageSha256 ?? null,
  },
  templates: {
    hades_judgment: {
      name: recordText("k0224"),
      detail: recordText("k0225"),
      completeShape: recordText("k0224"),
      incompleteShape: exactFragment("k0213", "명왕의 불완전한 신격: 심판"),
      nameByLocale: localizedRecord("k0224"),
      detailByLocale: localizedRecord("k0225"),
      shapeLabelsByLocale: {
        ko: {
          hades_judgment_a: recordText("k0224"),
          hades_judgment_line: exactFragment("k0213", "명왕의 불완전한 신격: 심판"),
        },
        en: {
          hades_judgment_a: localeRecordText("k0224", "en"),
          hades_judgment_line: exactLocaleFragment(
            "k0213",
            "en",
            "Nether King's Broken Divinity: Judgment",
          ),
        },
      },
      sourceKeys: ["k0213", "k0224", "k0225"],
    },
    hades_contamination: {
      name: recordText("k0226"),
      detail: recordText("k0227"),
      completeShape: recordText("k0226"),
      incompleteShape: exactFragment("k0213", "명왕의 불완전한 신격: 인펙션"),
      nameByLocale: localizedRecord("k0226"),
      detailByLocale: localizedRecord("k0227"),
      shapeLabelsByLocale: {
        ko: {
          hades_infusion_complete: recordText("k0226"),
          hades_infusion_broken: exactFragment("k0213", "명왕의 불완전한 신격: 인펙션"),
        },
        en: {
          hades_infusion_complete: localeRecordText("k0226", "en"),
          hades_infusion_broken: exactLocaleFragment(
            "k0213",
            "en",
            "Nether King's Broken Divinity: Contamination",
          ),
        },
      },
      sourceKeys: ["k0213", "k0226", "k0227"],
    },
    hades_banishment: {
      name: recordText("k0228"),
      detail: recordText("k0214"),
      nameByLocale: localizedRecord("k0228"),
      detailByLocale: localizedRecord("k0214"),
      shapeLabelsByLocale: {
        ko: {
          hades_banishment_a: "왼쪽 위",
          hades_banishment_b: "오른쪽 위",
          hades_banishment_c: "오른쪽 아래",
          hades_banishment_d: "왼쪽 아래",
        },
        en: {
          hades_banishment_a: "Top left",
          hades_banishment_b: "Top right",
          hades_banishment_c: "Bottom right",
          hades_banishment_d: "Bottom left",
        },
      },
      sourceKeys: ["k0214", "k0228"],
    },
  },
  banishmentNames: Object.fromEntries(
    Object.entries(BANISHMENT_NAMES_BY_LOCALE).map(([id, locales]) => [id, locales.ko]),
  ),
  banishmentNamesByLocale: BANISHMENT_NAMES_BY_LOCALE,
  inputLabels: {
    banishmentParalyzedEnemy: INPUT_LABEL_SOURCES.banishmentParalyzedEnemy.value,
    banishmentMobilityAttackUsed: INPUT_LABEL_SOURCES.banishmentMobilityAttackUsed.value,
    banishmentSpellBurstAtCap: INPUT_LABEL_SOURCES.banishmentSpellBurstAtCap.value,
    banishmentDealingDamageOverTime: INPUT_LABEL_SOURCES.banishmentDealingDamageOverTime.value,
    banishmentNearestSyntheticTroopMaxLife:
      INPUT_LABEL_SOURCES.banishmentNearestSyntheticTroopMaxLife.value,
    banishmentLethalHit: INPUT_LABEL_SOURCES.banishmentLethalHit.value,
  },
  inputLabelSources: INPUT_LABEL_SOURCES,
  banishmentMechanics: {
    steep_strike: [
      officialLocaleSupplement("k0232"),
      officialLocaleSupplement("k0232"),
    ],
    spell_burst: [
      officialLocaleSupplement("k0237"),
      officialLocaleSupplement("k0238"),
      officialLocaleSupplement("k1501"),
    ],
    tangle: [
      officialLocaleSupplement("k0254"),
      officialLocaleSupplementWithConflicts("k0255", ["k1502"]),
    ],
  },
});
