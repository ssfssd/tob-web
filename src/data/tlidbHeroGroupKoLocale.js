export const TLIDB_HERO_GROUP_KO_SOURCE = Object.freeze({
  sourceUrl: "https://tlidb.com/ko/Hero",
  sourceMethod: "tlidb-current-page",
  sourceCheckedAt: "2026-07-17T01:45:51.168Z",
  sourcePageSha256: "f069855d752dca7c52b525bfc843c976f6cbb73a971d94e9c0b8def7142f522e",
  activeBaselineSeason: "SS13",
});

const currentKoreanHeroSource = Object.freeze({
  sourceUrl: TLIDB_HERO_GROUP_KO_SOURCE.sourceUrl,
  sourcePageSha256: TLIDB_HERO_GROUP_KO_SOURCE.sourcePageSha256,
});

export const TLIDB_HERO_GROUP_KO_LOCALE = Object.freeze({
  "狂人 雷恩": Object.freeze({
    name: "버서커 리한",
    ...currentKoreanHeroSource,
  }),
  "圣枪 卡里诺": Object.freeze({
    name: "디바인 샷 카리노",
    ...currentKoreanHeroSource,
  }),
  "猫眼 艾瑞卡": Object.freeze({
    name: "캣츠아이 에리카",
    ...currentKoreanHeroSource,
  }),
  "逃脱者 宾": Object.freeze({
    displayName: "TLIDB 표기 충돌 · 도망자 빈 / 도망자-빈",
    names: Object.freeze(["도망자 빈", "도망자-빈"]),
    status: "source-conflict",
    ...currentKoreanHeroSource,
  }),
  "冰焰 吉玛": Object.freeze({
    name: "빙염술사 젬마",
    ...currentKoreanHeroSource,
  }),
  "神谕者 希雅": Object.freeze({
    name: "사제 티아",
    ...currentKoreanHeroSource,
  }),
  "时空见证者 尤加": Object.freeze({
    name: "시공간의 증인 유가",
    ...currentKoreanHeroSource,
  }),
  "指挥官 莫托": Object.freeze({
    name: "지휘관 모토",
    ...currentKoreanHeroSource,
  }),
  "光曜 罗莎": Object.freeze({
    name: "라이트 브링어 로사",
    ...currentKoreanHeroSource,
  }),
  "遗世魔灵 伊瑞斯": Object.freeze({
    name: "속세를 떠난 마령 아이리스",
    ...currentKoreanHeroSource,
  }),
  "汐语 赛琳娜": Object.freeze({
    name: "파도의 숨결 셀레나",
    ...currentKoreanHeroSource,
  }),
  "药香师 赛琪": Object.freeze({
    name: "약사·세이지",
    ...currentKoreanHeroSource,
  }),
});
