import { OFFICIAL_SS13_PATCH_NOTES } from "./data/officialSs13PatchNotes.generated.js";
import { TLIDB_KOREAN_TEXT_REPAIRS } from "./data/tlidbKoreanTextRepairs.js";

const NETHER_KING_CONTRACT = Object.freeze({
  itemId: "slates-tlidb-data-id-90000206",
  sourceDataId: "90000206",
  name: "레전드 중위 명왕 재능 포인트",
  mixedKoText: "你和召唤物拥有 攻击激进\n맹공 효과 +30 %",
  cnText: "你和召唤物拥有 攻击激进\n+30 % 攻击激进 效果",
  flatKoSha256: "cb4fbd049e85a9fa0489864c0e88ab49bc6d8639d0d2fa0d9260597ca61c69e9",
  flatCnSha256: "7a7d3b107e1e7f16d4233369c5cc9e4f5f228f6d88537e594022688f78b53aca",
  selectionEnSha256: "2290b64b0fe75c17ccdabfb07de17e7d64ef6a9f4b1316d47d9a28963af21418",
});

const SEARING_CRUSH_CONTRACT = Object.freeze({
  itemId: "skills-tlidb-com-cn-searing-crush",
  fields: Object.freeze(["summary", "detail"]),
  stableKey: "ItemBase/7264",
  sourceDataId: "7264",
  currentTlidbReceipts: Object.freeze({
    ko: Object.freeze({
      sourceUrl: "https://tlidb.com/ko/Searing_Crush",
      sourcePageSha256: "099ed538eb6513e02e0f73a0d9b965e1b6ed6567adcbff85b781bc2422e9fdef",
      sourcePageVersion: "SS13",
      name: "고온 압살",
      text: "메인 속성:\n힘, 지혜\n시전 속도\n2.4 초\n쿨타임\n10 초\n대미지 배율\n149%\nSimple\n释放该技能时向前冲锋，对冲锋经过的敌人造成 149% 基础伤害的공격물리伤害，并使自身造成的伤害额外提高。\nDetails\n고온 압살:\n기본 대미지 149% 만큼 공격물리 대미지를 입힌다.\n释放该技能时获得增益：额外 +50% 造成的伤害，持续 5 秒",
    }),
    en: Object.freeze({
      sourceUrl: "https://tlidb.com/en/Searing_Crush",
      sourcePageSha256: "a89bd2c331d4c22119425f3583a23b55613cd4e25c6f6f32ceb416ebeeaa865f",
      sourcePageVersion: "SS13",
      name: "Searing Crush",
      text: "Main Stat:\nStrength, Intelligence\nCast Speed\n2.4 s\nCooldown\n10 s\nEffectiveness of added damage\n149%\nSimple\n释放该技能时向前冲锋，对冲锋经过的敌人造成 149% 基础伤害的AttackPhysical伤害，并使自身造成的伤害额外提高。\nDetails\nSearing Crush:\nDeals Attack Physical Damage equal to 149% of Base Damage\n释放该技能时获得增益：额外 +50% 造成的伤害，持续 5 秒",
    }),
    cn: Object.freeze({
      sourceUrl: "https://tlidb.com/cn/Searing_Crush",
      sourcePageSha256: "2aeea330cbb220e68e8f36bab93dab64e2bcb9a6c4868140c464cd9c076b07f0",
      sourcePageVersion: "SS13",
      name: "高温碾压",
      text: "主属性：\n力量, 智慧\n施法速度\n2.4 秒\n冷却时间\n10 秒\n伤害倍率\n149%\nSimple\n释放该技能时向前冲锋，对冲锋经过的敌人造成 149% 基础伤害的攻击物理伤害，并使自身造成的伤害额外提高。\nDetails\n高温碾压：\n造成 149% 基础伤害的攻击物理伤害\n释放该技能时获得增益：额外 +50% 造成的伤害，持续 5 秒",
    }),
  }),
  officialPatchReceipt: Object.freeze({
    sourceKey: "k1549",
    sourcePageSha256: "7f87c8a234aebb0baa3de5e280c87ebb1aee5f81002e524c45d39c271e5b820c",
    extractedPayloadSha256: "a91e525d8e793c36b3c5a2fab3919cdacf7fec0d07c3fa2135cae8bb81800f5a",
    occurrenceOrdinal: 90,
    sectionKeys: Object.freeze(["k0002", "k1470", "k1505", "k1548"]),
    locales: Object.freeze({
      "zh-CN": "高温碾压：现在不再使周围 10 米内的敌人受到的伤害额外提高，而是使自身伤害额外提高",
      "zh-TW": "高溫碾壓：現在不再使周圍 10 米內的敵人受到的傷害額外提高，而是使自身傷害額外提高",
      ko: "고온 압살: 이제 주변 10미터 내 적이 받는 대미지를 별도 증가시키지 않고, 대신 자신의 대미지를 별도 증가시킵니다",
      en: "Searing Crush: No longer additionally increases damage taken by Nearby enemies within 10 meters; instead, additionally increases your own damage",
    }),
  }),
});

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function currentItemMatches(item, field) {
  const contract = SEARING_CRUSH_CONTRACT;
  return item?.id === contract.itemId
    && contract.fields.includes(field)
    && item?.tlidbStableKey === contract.stableKey
    && Object.entries(contract.currentTlidbReceipts).every(([locale, receipt]) => {
      const localized = item?.tlidbText?.[locale];
      const expectedStatus = locale === "cn" ? "exact" : "source-language-mixed";
      return localized?.sourceUrl === receipt.sourceUrl
        && localized?.sourcePageSha256 === receipt.sourcePageSha256
        && localized?.sourcePageVersion === receipt.sourcePageVersion
        && localized?.name === receipt.name
        && localized?.sourceFieldStatus?.name === "exact"
        && localized?.sourceFieldStatus?.[field] === expectedStatus
        && localized?.[field] === receipt.text
        && sameJson(localized?.sourceDataIds, [contract.sourceDataId]);
    });
}

function officialPatchMatches(dataset) {
  const receipt = SEARING_CRUSH_CONTRACT.officialPatchReceipt;
  const metadata = dataset?.metadata;
  const record = dataset?.records?.[receipt.sourceKey];
  const occurrence = record?.occurrences?.[0];
  return metadata?.sourceKind === "official-season-patch-notes"
    && metadata?.season === "SS13"
    && metadata?.state === "current-change-provenance"
    && metadata?.activeBaseline?.season === "SS13"
    && metadata?.verificationComplete === true
    && metadata?.sourcePageSha256 === receipt.sourcePageSha256
    && metadata?.extractedPayloadSha256 === receipt.extractedPayloadSha256
    && sameJson(record?.locales, receipt.locales)
    && record?.occurrences?.length === 1
    && occurrence?.ordinal === receipt.occurrenceOrdinal
    && occurrence?.key === receipt.sourceKey
    && occurrence?.tag === "li"
    && occurrence?.attribute === "data-i18n"
    && sameJson(occurrence?.sectionKeys, receipt.sectionKeys);
}

function netherKingItemMatches(item, field) {
  const contract = NETHER_KING_CONTRACT;
  if (item?.id !== contract.itemId || !["summary", "detail"].includes(field)) return false;
  if (item.tlidbText) {
    return ["ko", "cn"].every((locale) => {
      const source = item.tlidbText[locale];
      return source?.sourceUrl === `https://tlidb.com/${locale}/Divinity_Slate`
        && source?.sourcePageSha256 === (locale === "ko" ? contract.flatKoSha256 : contract.flatCnSha256)
        && source?.sourceRecordKey === `data-id:${contract.sourceDataId}:regular`
        && source?.sourceSeasonEvidence?.sourcePageVersion === "SS13"
        && sameJson(source?.sourceDataIds, [contract.sourceDataId])
        && source?.sourceFieldStatus?.[field] === (locale === "ko" ? "source-language-mixed" : "exact")
        && source?.[field] === (locale === "ko" ? contract.mixedKoText : contract.cnText)
        && (locale !== "ko" || source?.name === contract.name);
    });
  }
  return item.activeSeason === "SS13"
    && item.name === contract.name
    && item.text === "맹공 효과 +30 %"
    && item.calculationText === "你和召唤物拥有 攻击激进\n+30 % Attack Aggression Effect"
    && item.sourceDetailStatus === "source-language-mixed"
    && sameJson(item.sourceDataIds, [contract.sourceDataId])
    && item.receipt?.sourceUrl === "https://tlidb.com/en/Nether_King"
    && item.receipt?.sourceRecordKey === `data-talent-id:${contract.sourceDataId}`
    && item.receipt?.sourcePageVersion === "SS13"
    && item.receipt?.sourcePageSha256 === contract.selectionEnSha256;
}

function exactDisplayRepair(receipt) {
  return Object.freeze({
    text: receipt.locales.ko.text,
    sourceKind: "tlidb-identical-effect-korean-display",
    sourceUrl: receipt.locales.ko.sourceUrl,
    sourcePageSha256: receipt.locales.ko.sourcePageSha256,
    sourcePageVersion: receipt.sourcePageVersion,
    sourceDataId: receipt.sourceDataId,
    currentSeasonValueAuthority: false,
    complete: true,
    presentation: "replace",
  });
}

export function getCurrentKoreanGameTextSupplement(
  item,
  field,
  dataset = OFFICIAL_SS13_PATCH_NOTES,
) {
  const repairs = TLIDB_KOREAN_TEXT_REPAIRS;
  if (currentItemMatches(item, field)
    && repairs.searingCrush.locales.cn.text === SEARING_CRUSH_CONTRACT.currentTlidbReceipts.cn.text) {
    return exactDisplayRepair(repairs.searingCrush);
  }
  if (netherKingItemMatches(item, field)
    && repairs.netherKingAttackAggression.locales.cn.text === NETHER_KING_CONTRACT.cnText) {
    return exactDisplayRepair(repairs.netherKingAttackAggression);
  }
  if (
    currentItemMatches(item, field)
    && officialPatchMatches(dataset)
  ) {
    const receipt = SEARING_CRUSH_CONTRACT.officialPatchReceipt;
    return Object.freeze({
      text: receipt.locales.ko,
      sourceKind: "official-ss13-korean-patch-note",
      sourceUrl: dataset.metadata.sourceUrl,
      sourceKey: receipt.sourceKey,
      sourcePageSha256: receipt.sourcePageSha256,
      complete: false,
      presentation: "append",
    });
  }
  return null;
}

export const CURRENT_KOREAN_GAME_TEXT_SUPPLEMENT_CONTRACT = SEARING_CRUSH_CONTRACT;
export const CURRENT_KOREAN_GAME_TEXT_SUPPLEMENT_CONTRACTS = Object.freeze({
  searingCrush: SEARING_CRUSH_CONTRACT,
  netherKingAttackAggression: NETHER_KING_CONTRACT,
});
