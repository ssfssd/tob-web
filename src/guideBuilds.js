import { createDefaultBuild, normalizeBuild } from "./engine.js";

const DCINSIDE_129847_ID = "dcinside-129847";
const SS12_BING2_BARRIER_RESEARCH_ID = "ss12-bing2-barrier-research";
const PRIVATE_BING2_RESEARCH_BUILD_ID = "research-ss12-bing2-barrier";
const LEGACY_PRIVATE_RESEARCH_NAMES = new Map([
  ["SS12 Bing 2 Barrier Burst Research", "SS13 Bing 2 Barrier Burst Research"],
  ["SS12 빈2 장벽 폭발 연구", "SS13 빈2 장벽 폭발 연구"],
]);
const LEGACY_PRIVATE_RESEARCH_NOTES = new Map([
  [
    "Private SS12+ Bing 2 Barrier Burst research. Community performance reports are not measured TOB results.",
    "Private SS13 Bing 2 Barrier Burst research. Historical community performance reports are not measured TOB results.",
  ],
  [
    "개인용 SS12+ 빈2 장벽 폭발 연구. 커뮤니티 성능 제보는 TOB 실측값이 아님.",
    "개인용 SS13 빈2 장벽 폭발 연구. 과거 커뮤니티 성능 제보는 TOB 실측값이 아님.",
  ],
]);
const LEGACY_FIREBIRD_SOURCE = "https://tlidb.com/cn/Necklace_of_Firebird";
const CURRENT_FIREBIRD_SOURCE = "https://tlidb.com/ko/Necklace_of_Firebird";
const CREATIVE_GENIUS_HERO_ID = "hero-tlidb-com-cn-creative-genius";
const CREATIVE_GENIUS_DEFAULT_TRAIT_SELECTIONS = Object.freeze([
  Object.freeze({
    stageId: "creative-genius-lv1",
    choiceIds: Object.freeze([
      "hero-trait:Creative_Genius:1:0:%E5%88%9B%E6%83%B3%E9%AC%BC%E6%89%8D",
    ]),
  }),
  Object.freeze({
    stageId: "creative-genius-lv45",
    choiceIds: Object.freeze([
      "hero-trait:Creative_Genius:45:0:%E7%81%B5%E6%84%9F%E7%8B%82%E6%BD%AE",
      "hero-trait:Creative_Genius:45:1:%E8%B6%85%E9%9F%B3%E9%80%9F%E5%8D%8F%E8%AE%AE",
    ]),
  }),
  Object.freeze({
    stageId: "creative-genius-lv60",
    choiceIds: Object.freeze([
      "hero-trait:Creative_Genius:60:0:%E6%80%9D%E7%BB%B4%E9%A2%86%E5%9F%9F",
      "hero-trait:Creative_Genius:60:2:%E5%A6%99%E6%89%8B%E5%B7%A7%E5%BE%97%E5%AE%9A%E5%BE%8B",
    ]),
  }),
  Object.freeze({
    stageId: "creative-genius-lv75",
    choiceIds: Object.freeze([
      "hero-trait:Creative_Genius:75:0:%E6%80%9D%E6%83%B3%E9%A3%8E%E6%9A%B4",
      "hero-trait:Creative_Genius:75:2:%E5%A4%9A%E5%85%83%E8%80%A6%E5%90%88%E6%96%B9%E7%A8%8B",
    ]),
  }),
]);

function createCreativeGeniusDefaultTraitSelections() {
  return CREATIVE_GENIUS_DEFAULT_TRAIT_SELECTIONS.map(({ stageId, choiceIds }) => ({
    stageId,
    choiceIds: [...choiceIds],
  }));
}

export function migratePrivateBing2ResearchBuild(build) {
  if (!build || build.id !== PRIVATE_BING2_RESEARCH_BUILD_ID) return build;

  const research = build.research && typeof build.research === "object" ? build.research : {};
  const name = LEGACY_PRIVATE_RESEARCH_NAMES.get(build.name) ?? build.name;
  const season = research.season === "SS12+" ? "SS13" : research.season;
  const notes = LEGACY_PRIVATE_RESEARCH_NOTES.get(research.notes) ?? research.notes;
  const sources = Array.isArray(research.sources)
    ? research.sources.map((source) => (
      source === LEGACY_FIREBIRD_SOURCE ? CURRENT_FIREBIRD_SOURCE : source
    ))
    : research.sources;
  const changed = name !== build.name
    || season !== research.season
    || notes !== research.notes
    || (Array.isArray(sources) && sources.some((source, index) => source !== research.sources[index]));
  if (!changed) return build;

  return {
    ...build,
    name,
    research: {
      ...research,
      season,
      sources,
      notes,
    },
  };
}

export const GUIDE_BUILD_PRESETS = [
  {
    id: DCINSIDE_129847_ID,
    labelKo: "DC 129847 적용",
    labelEn: "Apply DC 129847",
  },
];

export function createGuideBuild(guideId, locale = "ko") {
  if (guideId === SS12_BING2_BARRIER_RESEARCH_ID) {
    const build = createDefaultBuild(locale);
    build.id = PRIVATE_BING2_RESEARCH_BUILD_ID;
    build.name = locale === "en" ? "SS13 Bing 2 Barrier Burst Research" : "SS13 빈2 장벽 폭발 연구";
    build.heroLevel = 100;
    build.hero = {
      ...build.hero,
      branchId: CREATIVE_GENIUS_HERO_ID,
      level: 100,
      traitSelections: createCreativeGeniusDefaultTraitSelections(),
    };
    build.selections.hero = [CREATIVE_GENIUS_HERO_ID];
    build.selections.gear = [null, null, null, null, "gear-tlidb-com-cn-necklace-of-firebird"];
    build.research = {
      season: "SS13",
      sources: [
        "https://gall.dcinside.com/mgallery/board/view/?id=torchlightinfinite&no=124128",
        "https://gall.dcinside.com/mgallery/board/view/?id=torchlightinfinite&no=124429",
        "https://www.reddit.com/r/TorchlightInfinite/comments/1sukev0/cost_efficient_build/",
        "https://www.reddit.com/r/TorchlightInfinite/comments/1tdn3z3/bing_2/",
        "https://www.reddit.com/r/TorchlightInfinite/comments/1tnhmyt/can_anyone_share_their_bing_2_firebird_builds/",
        CURRENT_FIREBIRD_SOURCE,
      ],
      notes:
        locale === "en"
          ? "Private SS13 Bing 2 Barrier Burst research. Historical community performance reports are not measured TOB results."
          : "개인용 SS13 빈2 장벽 폭발 연구. 과거 커뮤니티 성능 제보는 TOB 실측값이 아님.",
    };
    return normalizeBuild(build);
  }

  if (guideId !== DCINSIDE_129847_ID) return null;

  const build = createDefaultBuild(locale);
  build.id = "guide-dcinside-129847";
  build.name =
    locale === "en"
      ? "DC 129847 Thea Burning World"
      : "DC 129847 티아1 타오르는세계 화저스태킹";
  build.selections.gear = [
    "gear-tlidb-com-cn-wretched-wand",
    "gear-tlidb-com-cn-headless-cleric-wand",
    "gear-tlidb-com-cn-mask-of-infernal-iron",
    "gear-tlidb-com-cn-flaming-evil",
    "gear-tlidb-com-cn-vorax-limb-3a-neck",
    "gear-tlidb-com-cn-israfel-27s-laws",
    "gear-tlidb-com-cn-eternity",
    "gear-tlidb-com-cn-torched-flame-ring",
    "gear-tlidb-com-cn-perishing-inferno-flame-ring",
    "gear-tlidb-com-cn-ranger-27s-dirty-boots",
  ];
  build.selections.skills = [
    "skills-tlidb-com-cn-summon-fire-magus",
    "skills-tlidb-com-cn-summon-frost-magus",
    "skills-tlidb-com-cn-summon-thunder-magus",
    "skills-tlidb-com-cn-summon-rock-magus",
    "skills-tlidb-com-cn-summon-erosion-magus",
  ];
  build.selections.supports = [
    "supports-tlidb-com-cn-summon-fire-magus-3a-fire-ward-28magnificent-29",
    "supports-tlidb-com-cn-friend-of-spirit-magi",
    "supports-tlidb-com-cn-precise-3a-protection-field",
    "supports-tlidb-com-cn-precise-3a-superpower",
    "supports-tlidb-com-cn-refracted-prism",
  ];
  build.selections.hero = ["hero-tlidb-com-cn-wisdom-of-the-gods"];
  build.selections.heroMemory = ["heroMemory-tlidb-com-cn-memory-of-origin"];
  build.selections.talents = [
    "talents-13001400",
    "talents-13070500",
    "talents-13030400",
    "talents-20070400",
    "talents-21001200",
    "talents-63001100",
    "talents-63060200",
    "talents-50002300",
    "talents-20060400",
    "talents-22001100",
    "talents-13060100",
    "talents-13060300",
  ];
  build.selections.spirits = ["spirits-tlidb-com-cn-firewing"];
  build.selections.slates = [
    "slates-divinity-talent-123",
    "slates-divinity-talent-208",
    "slates-divinity-talent-949",
    "slates-divinity-talent-686",
  ];
  build.selections.destiny = [
    "destiny-dual-kismet-fire-in-the-stone",
    "destiny-kismet-mercury-bottle",
    "destiny-medium-fate-origin-of-spirit-magus",
    "destiny-dual-kismet-ice-flower",
  ];
  build.skillLevels = [20, 20, 20, 20, 20];
  build.skillSeals = { life: 0, mana: 100 };
  build.customAffixes = "+90 fire resist\n+50% damage\n+35% cast speed\n+30% crit\n+50000 energy";
  build.gearCorruptions = {
    "gear-tlidb-com-cn-mask-of-infernal-iron": true,
  };

  return normalizeBuild(build);
}
