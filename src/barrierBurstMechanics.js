const TAGS = Object.freeze({
  ko: Object.freeze(["힘", "지혜", "주술", "화염", "범위"]),
  en: Object.freeze(["Strength", "Intelligence", "Spell", "Fire", "Area"]),
  cn: Object.freeze(["力量", "智慧", "法术", "火焰", "范围"]),
});

const REGULAR_BARRIER_BURST_RECEIPTS = Object.freeze({
  ko: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Barrier_Burst",
    sourcePageSha256: "f11907fa9f8672514ce835b30056882b3bddc7c665d4ac074dfa865872b1f948",
    sourcePageVersion: "SS13",
    sourceRecordKey: "Barrier_Burst",
    name: "장벽 폭발",
    detail: "주변 적에게 장벽 수치의 일정 비율만큼 주술 화염 대미지를 입힌다.",
    tags: TAGS.ko,
  }),
  en: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Barrier_Burst",
    sourcePageSha256: "1707da4c2004f53c26d16d32a50d2ee50c4043624e23eec8d0d698e85bd42acc",
    sourcePageVersion: "SS13",
    sourceRecordKey: "Barrier_Burst",
    name: "Barrier Burst",
    detail: "Deals Spell Fire Damage equal to a certain ratio of Barrier to nearby enemies.",
    tags: TAGS.en,
  }),
  cn: Object.freeze({
    sourceUrl: "https://tlidb.com/cn/Barrier_Burst",
    sourcePageSha256: "2f0c89d4276e07b08f3738f7c604382a5223b6640fe7680976dedb6188ed277c",
    sourcePageVersion: "SS13",
    sourceRecordKey: "Barrier_Burst",
    name: "屏障爆裂",
    detail: "对周围敌人造成屏障值一定比例的法术火焰伤害。",
    tags: TAGS.cn,
  }),
});

const ADVANCED_BARRIER_BURST_RECEIPTS = Object.freeze({
  ko: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Hyperlink",
    sourcePageSha256: "4c1ec978df5e51544e34a5a7fead9c2155b5c5729d5d2a2e8b4936ed8f9f3071",
    sourcePageVersion: "SS13",
    sourceRecordKey: "Advanced_Barrier_Burst",
    name: "고급 장벽 폭발",
    detail: [
      "주변 적에게 남은 장벽의 400%만큼 주술 화염 대미지를 입힌 후 장벽 제거. 해당 대미지는 스킬 레벨에 따라 달라짐.",
      "해당 스킬의 이상 대미지 별도 -60%",
    ].join("\n"),
    tags: TAGS.ko,
  }),
  en: Object.freeze({
    sourceUrl: "https://tlidb.com/en/Hyperlink",
    sourcePageSha256: "258f93d82da816153da9cbae074b267b323e365ea6d1d93bed79199059688fe2",
    sourcePageVersion: "SS13",
    sourceRecordKey: "Advanced_Barrier_Burst",
    name: "Advanced Barrier Burst",
    detail: [
      "Deals Spell Fire Damage equal to 400% of the remaining Barrier to nearby enemies then removes the Barrier. This damage is affected by Skill Level",
      "-60% additional Ailment Damage for this skill",
    ].join("\n"),
    tags: TAGS.en,
  }),
  cn: Object.freeze({
    sourceUrl: "https://tlidb.com/cn/Hyperlink",
    sourcePageSha256: "6eac1a30a9b9d39dada97949c96560908c4c56dd030ef8a73415f11a08269791",
    sourcePageVersion: "SS13",
    sourceRecordKey: "Advanced_Barrier_Burst",
    name: "高级屏障爆裂",
    detail: [
      "对周围敌人造成等同于剩余屏障值 400% 的法术火焰伤害，随后移除屏障；该伤害受技能等级影响",
      "该技能额外 -60% 异常伤害",
    ].join("\n"),
    tags: TAGS.cn,
  }),
});

export const REGULAR_BARRIER_BURST_UNSUPPORTED_REASON =
  "current-skill-coefficient-unavailable";

export const REGULAR_BARRIER_BURST_MECHANIC = Object.freeze({
  id: "mechanic-barrier-burst-regular",
  sourceRecordKey: "Barrier_Burst",
  activeSeason: "SS13",
  catalogMembership: "gear-derived-external-skill",
  tlidbText: Object.freeze({
    ko: Object.freeze({
      name: REGULAR_BARRIER_BURST_RECEIPTS.ko.name,
      detail: REGULAR_BARRIER_BURST_RECEIPTS.ko.detail,
      tags: REGULAR_BARRIER_BURST_RECEIPTS.ko.tags,
      sourceUrl: "https://tlidb.com/ko/Barrier_Burst",
      sourceCheckedAt: "2026-07-17",
      receipt: REGULAR_BARRIER_BURST_RECEIPTS.ko,
    }),
    en: Object.freeze({
      name: REGULAR_BARRIER_BURST_RECEIPTS.en.name,
      detail: REGULAR_BARRIER_BURST_RECEIPTS.en.detail,
      tags: REGULAR_BARRIER_BURST_RECEIPTS.en.tags,
      sourceUrl: "https://tlidb.com/en/Barrier_Burst",
      sourceCheckedAt: "2026-07-17",
      receipt: REGULAR_BARRIER_BURST_RECEIPTS.en,
    }),
    cn: Object.freeze({
      name: REGULAR_BARRIER_BURST_RECEIPTS.cn.name,
      detail: REGULAR_BARRIER_BURST_RECEIPTS.cn.detail,
      tags: REGULAR_BARRIER_BURST_RECEIPTS.cn.tags,
      sourceUrl: "https://tlidb.com/cn/Barrier_Burst",
      sourceCheckedAt: "2026-07-17",
      receipt: REGULAR_BARRIER_BURST_RECEIPTS.cn,
    }),
  }),
  barrierDamagePercent: null,
  ailmentDamageAdditionalPercent: null,
  coefficientAuthority: "current-source-value-unavailable",
  calculationSupported: false,
  calculationApplied: false,
  calculationModelAuthority: "unverified",
  calculationUnsupportedReason: REGULAR_BARRIER_BURST_UNSUPPORTED_REASON,
  valueTransferFromAdvanced: "unverified-not-applied",
});

export const ADVANCED_BARRIER_BURST_MECHANIC = Object.freeze({
  id: "mechanic-advanced-barrier-burst",
  sourceRecordKey: "Advanced_Barrier_Burst",
  activeSeason: "SS13",
  catalogMembership: "tlidb-glossary-mechanic-only",
  tlidbText: Object.freeze({
    ko: Object.freeze({
      name: ADVANCED_BARRIER_BURST_RECEIPTS.ko.name,
      detail: ADVANCED_BARRIER_BURST_RECEIPTS.ko.detail,
      tags: ADVANCED_BARRIER_BURST_RECEIPTS.ko.tags,
      sourceUrl: ADVANCED_BARRIER_BURST_RECEIPTS.ko.sourceUrl,
      sourceCheckedAt: "2026-07-17",
      receipt: ADVANCED_BARRIER_BURST_RECEIPTS.ko,
    }),
    en: Object.freeze({
      name: ADVANCED_BARRIER_BURST_RECEIPTS.en.name,
      detail: ADVANCED_BARRIER_BURST_RECEIPTS.en.detail,
      tags: ADVANCED_BARRIER_BURST_RECEIPTS.en.tags,
      sourceUrl: ADVANCED_BARRIER_BURST_RECEIPTS.en.sourceUrl,
      sourceCheckedAt: "2026-07-17",
      receipt: ADVANCED_BARRIER_BURST_RECEIPTS.en,
    }),
    cn: Object.freeze({
      name: ADVANCED_BARRIER_BURST_RECEIPTS.cn.name,
      detail: ADVANCED_BARRIER_BURST_RECEIPTS.cn.detail,
      tags: ADVANCED_BARRIER_BURST_RECEIPTS.cn.tags,
      sourceUrl: ADVANCED_BARRIER_BURST_RECEIPTS.cn.sourceUrl,
      sourceCheckedAt: "2026-07-17",
      receipt: ADVANCED_BARRIER_BURST_RECEIPTS.cn,
    }),
  }),
  barrierDamagePercent: 400,
  ailmentDamageAdditionalPercent: -60,
  coefficientAuthority: "tlidb-current-ss13-exact-glossary",
  calculationSupported: false,
  calculationApplied: false,
  calculationModelAuthority: "mechanic-fields-only",
  calculationUnsupportedReason: "advanced-mechanic-not-selectable",
  valueTransferToRegular: "unverified-not-applied",
});

export const BARRIER_BURST_MECHANICS = Object.freeze([
  REGULAR_BARRIER_BURST_MECHANIC,
  ADVANCED_BARRIER_BURST_MECHANIC,
]);

export function getExactBarrierBurstMechanicLocale(record, locale) {
  const localized = record?.tlidbText?.[locale];
  const receipt = localized?.receipt;
  if (
    !localized
    || receipt?.sourcePageVersion !== "SS13"
    || receipt?.sourceRecordKey !== record?.sourceRecordKey
    || receipt?.sourceUrl !== `https://tlidb.com/${locale}/${receipt.sourceRecordKey === "Advanced_Barrier_Burst" ? "Hyperlink" : receipt.sourceRecordKey}`
    || localized?.sourceUrl !== receipt.sourceUrl
    || localized?.name !== receipt.name
    || localized?.detail !== receipt.detail
    || JSON.stringify(localized?.tags) !== JSON.stringify(receipt.tags)
  ) return null;
  return localized;
}
