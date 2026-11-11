const tlidb = (value, sourceUrl, evidence) => Object.freeze({
  value,
  sourceKind: "tlidb-current-ko",
  sourceUrl,
  evidence,
});

const HERO_MEMORY_QUALITY_TLIDB_ABSENCE = Object.freeze({
  status: "current-tlidb-exact-ko-unavailable",
  semanticField: "hero-memory-quality-label",
  dataset: "tlidbRuntimeLocales.ss13",
  sourcePageVersion: "SS13",
  locale: "ko",
  sourcePath: "Hero_Memories",
  sourceUrl: "https://tlidb.com/ko/Hero_Memories",
  sourcePageSha256: "7a57c3adf29f274bd5138b9e820dad58bd538d044bda9f81ac18082ed45c023e",
  recordKind: "memory-modifier",
  recordCount: 906,
  searchedFields: Object.freeze([
    "text",
    "renderTemplate",
    "tier",
    "requiredLevel",
    "weight",
    "source",
  ]),
});

const community = (value, sources, tlidbAbsence) => Object.freeze({
  value,
  sourceKind: "korean-torchlight-community",
  sources: Object.freeze(sources.map((source) => Object.freeze(source))),
  tlidbAbsence,
});

// Display terminology only. The public 91TOB client establishes the input's
// meaning, not its server-side formula, time window, or a universal stack cap.
export const RECENT_KILL_STACK_TERMINOLOGY_SOURCE = Object.freeze({
  checkedAt: "2026-10-15T00:16:32.270Z",
  scope: "display-label-only",
  calculationAuthority: false,
  original91Tob: Object.freeze({
    sourceUrl: "https://91tob.com/assets/App-CznzSy98.js",
    sha256: "79ef6687b1c370674ddce3db2b335b93cba9fd091cef5f778a6d7e59a5c6cc14",
    field: "player.recent.recent_kill_stack",
    label: "最近击败敌人层数",
    controlType: "number",
    numberStep: 1,
    zeroHint: "填 0 表示自动",
    positiveHint: "当前配置 ${ut(y,0)} 层",
    exportsPositiveValuesOnly: true,
  }),
  ko: Object.freeze({
    sourceUrl: "https://tlidb.com/ko/Soul_Candle",
    sha256: "4e4887bb8df1afbbfbf3e6f9eb64d4520e1c2106a5629f6b5f9f33e4183cdeeb",
    text: "최근 처치한 적 1명당, 대미지, 스킬 범위 및 이동 속도 +1 % , 최대 20회",
    countTerminology: "채널링 최소 중첩 수 +1",
  }),
  cn: Object.freeze({
    sourceUrl: "https://tlidb.com/cn/Soul_Candle",
    sha256: "467d17de3502a7c73c860f4b9da1e22eb24146efe55b16406e8f993b9a7724a7",
    text: "最近每击败 1 个敌人， +1 % 伤害、技能范围和移动速度，上限 20 层",
  }),
  // Older community wording corroborates the concept, not current values.
  communityReferences: Object.freeze([
    "https://gall.dcinside.com/mgallery/board/view/?id=torchlightinfinite&no=44369",
    "https://game.naver.com/lounge/Torchlight_Infinite/board/detail/4036229",
  ]),
});

export const KOREAN_GAME_TERMINOLOGY = Object.freeze({
  recentDefeatedEnemy: tlidb(
    "최근 처치한 적",
    RECENT_KILL_STACK_TERMINOLOGY_SOURCE.ko.sourceUrl,
    RECENT_KILL_STACK_TERMINOLOGY_SOURCE.ko.text,
  ),
  stackCount: tlidb(
    "중첩 수",
    RECENT_KILL_STACK_TERMINOLOGY_SOURCE.ko.sourceUrl,
    RECENT_KILL_STACK_TERMINOLOGY_SOURCE.ko.countTerminology,
  ),
  spiritMagus: tlidb(
    "마령",
    "https://tlidb.com/ko/Spirit_Magus",
    "마령을 소환하는 스킬",
  ),
  summonRockSpiritMagus: tlidb(
    "반석의 영혼 소환",
    "https://tlidb.com/ko/Summon_Rock_Magus",
    "반석의 영혼 소환",
  ),
  summonFireSpiritMagus: tlidb(
    "화염의 영혼 소환",
    "https://tlidb.com/ko/Summon_Fire_Magus",
    "화염의 영혼 소환",
  ),
  summonThunderSpiritMagus: tlidb(
    "번개의 영혼 소환",
    "https://tlidb.com/ko/Summon_Thunder_Magus",
    "번개의 영혼 소환",
  ),
  summonFrostSpiritMagus: tlidb(
    "서리의 영혼 소환",
    "https://tlidb.com/ko/Summon_Frost_Magus",
    "서리의 영혼 소환",
  ),
  summonErosionSpiritMagus: tlidb(
    "부패의 영혼 소환",
    "https://tlidb.com/ko/Summon_Erosion_Magus",
    "부패의 영혼 소환",
  ),
  rockMagusOriginEffect: tlidb(
    "반석의 영혼의 마령의 근원 효과",
    "https://tlidb.com/ko/Dual_Kismet%3A_Rock_Core",
    "20레벨 반석의 영혼의 마령의 근원 효과 보유",
  ),
  fireMagusOriginEffect: tlidb(
    "화염의 영혼의 마령의 근원 효과",
    "https://tlidb.com/ko/Dual_Kismet%3A_Fire_Plume",
    "20레벨 화염의 영혼의 마령의 근원 효과 보유",
  ),
  thunderMagusOriginEffect: tlidb(
    "번개의 영혼의 마령의 근원 효과",
    "https://tlidb.com/ko/Dual_Kismet%3A_Thunder_Branch",
    "20레벨 번개의 영혼의 마령의 근원 효과 보유",
  ),
  frostMagusOriginEffect: tlidb(
    "서리의 영혼의 마령의 근원 효과",
    "https://tlidb.com/ko/Dual_Kismet%3A_Ice_Flower",
    "20레벨 서리의 영혼의 마령의 근원 효과 보유",
  ),
  erosionMagusOriginEffect: tlidb(
    "부패의 영혼의 마령의 근원 효과",
    "https://tlidb.com/ko/Dual_Kismet%3A_Dark_Moon",
    "20레벨 부패의 영혼의 마령의 근원 효과 보유",
  ),
  dualKismetDarkMoon: tlidb(
    "이중 천명: 검은달",
    "https://tlidb.com/ko/Dual_Kismet%3A_Dark_Moon",
    "이중 천명: 검은달",
  ),
  gearCorrosion: tlidb(
    "침식",
    "https://tlidb.com/ko/Corrosion",
    "침식 기능은 메인 스토리 진행도에 따라 잠금 해제되며",
  ),
  gearCorrosionEffect: tlidb(
    "침식 효과",
    "https://tlidb.com/ko/Corrosion",
    "침식 유형이 흑화 침식일 경우, 다음의 침식 효과가 추가로 나타날 수 있습니다.",
  ),
  gearGraftAffixGroup: tlidb(
    "봉합 옵션",
    "https://tlidb.com/ko/Graft",
    "봉합을 통해 블러드 러스트 장비에 옵션을 추가할 수 있습니다.",
  ),
  divinitySlate: tlidb(
    "신격의 석판",
    "https://tlidb.com/ko/Divinity_Slate",
    "레전드 신격의 석판",
  ),
  gearRarityRare: tlidb(
    "레어",
    "https://tlidb.com/ko/Basic_Rules",
    "장비의 희귀도는 노멀(화이트), 매직(블루), 레어(퍼플), 엘리트(핑크), 레전드(골드), 절대자 레전드(레드)로 나뉩니다.",
  ),
  gearRarityLegendary: tlidb(
    "레전드",
    "https://tlidb.com/ko/Basic_Rules",
    "장비의 희귀도는 노멀(화이트), 매직(블루), 레어(퍼플), 엘리트(핑크), 레전드(골드), 절대자 레전드(레드)로 나뉩니다.",
  ),
  legendaryAffix: tlidb(
    "레전드 옵션",
    "https://tlidb.com/ko/Basic_Rules",
    "장비의 옵션은 기본 옵션, 랜덤 옵션, 레전드 옵션으로 나뉩니다.",
  ),
  legendaryMediumTalent: tlidb(
    "레전드 중위 재능",
    "https://tlidb.com/ko/Ethereal_Prism",
    "범위 내의 모든 레전드 중위 재능 추가 획득",
  ),
  divinityImprintTalent: tlidb(
    "낙인 재능",
    "https://tlidb.com/ko/Basic_Rules",
    "신격의 석판 낙인을 통해 석판에 낙인 재능 포인트를 추가할 수 있습니다.",
  ),
  chargeSupportBuffActive: tlidb(
    "차징",
    "https://tlidb.com/ko/Charge",
    "보조 대상 스킬 시전 시 버프를 획득한다.",
  ),
  eternalSimulacrum: tlidb(
    "영원의 클론",
    "https://tlidb.com/ko/Eternity",
    "매직 몬스터 처치 시, +(10–20)%의 확률로 영원의 클론 1회 획득",
  ),
  tripleDamage: tlidb(
    "3배 대미지",
    "https://tlidb.com/ko/Kismet%3A_Giant",
    "확률로 3배 대미지를 입힌다.",
  ),
  heroMemoryWaxAndWane: tlidb(
    "영고성쇠",
    "https://tlidb.com/ko/Memory_Revival",
    "영고성쇠: 기본 속성 수치 증가",
  ),
  heroMemory: tlidb(
    "히어로 추억",
    "https://tlidb.com/ko/Memory_Upgrade",
    "히어로 추억의 특성 레벨 및 옵션 속성이 증가합니다.",
  ),
  heroMemoryQualityMagic: tlidb(
    "매직",
    "https://tlidb.com/ko/Steadfast_Dew",
    "노멀/매직/레어/적 보스",
  ),
  heroMemoryQualityRare: tlidb(
    "레어",
    "https://tlidb.com/ko/Memory_Revival",
    "레어 등급 이하의 추억",
  ),
  heroMemoryQualityExcellent: tlidb(
    "엘리트",
    "https://tlidb.com/ko/Memory_Revival",
    "엘리트 등급 이하의 근원 추억을 장착할 수 있다.",
  ),
  heroMemoryQualitySupreme: community("절대자", [
    {
      url: "https://gall.dcinside.com/mgallery/board/view/?id=torchlightinfinite&no=63545",
      evidence: "절대자 히어로추억",
    },
  ], HERO_MEMORY_QUALITY_TLIDB_ABSENCE),
  heroMemoryRevivalAffix: tlidb(
    "부활 옵션",
    "https://tlidb.com/ko/Memory_Revival",
    "부활 옵션 /36",
  ),
  heroMemoryFixedAffix: tlidb(
    "고유 옵션",
    "https://tlidb.com/ko/Hero_Memories",
    "Fixed Affix와 같은 행의 requiredLevel: 고유 옵션",
  ),
  heroMemoryRandomAffix: tlidb(
    "랜덤 옵션",
    "https://tlidb.com/ko/Memory_Upgrade",
    "추억의 랜덤 옵션",
  ),
});

export function koreanGameTerm(key) {
  return KOREAN_GAME_TERMINOLOGY[key]?.value ?? "한국어 원문 미제공";
}
