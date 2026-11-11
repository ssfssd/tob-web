export const SS13_PREVIEW_HERO_FLAT_ID = "hero-poster-xd-cn-r-ss13pn-lang-zh-cn-ch-3-sub-20";
export const SS13_PREVIEW_HERO_BRANCH_ID = "dance-with-the-deep-sea";
export const SS13_PREVIEW_FLAT_IDS = Object.freeze({
  gear: "gear-poster-xd-cn-r-ss13pn-lang-zh-cn-ch-2-sub-3",
  skills: "skills-torchlight-xd-cn-ss13pn-lang-zh-cn-ch-3-sub-24",
  supports: "supports-torchlight-xd-cn-ss13pn-lang-zh-cn-ch-3-sub-24",
  hero: SS13_PREVIEW_HERO_FLAT_ID,
});

export const SS13_ACTIVE_HERO_SOURCE_URLS_BY_SOURCE_PATH = Object.freeze({
  Anger: "https://tlidb.com/cn/Anger",
  Seething_Silhouette: "https://tlidb.com/cn/Seething_Silhouette",
  Ranger_of_Glory: "https://tlidb.com/cn/Ranger_of_Glory",
  Lethal_Flash: "https://tlidb.com/cn/Lethal_Flash",
  Zealot_of_War: "https://tlidb.com/cn/Zealot_of_War",
  Wind_Stalker: "https://tlidb.com/cn/Wind_Stalker",
  Lightning_Shadow: "https://tlidb.com/cn/Lightning_Shadow",
  "Vendetta's_Sting": "https://tlidb.com/cn/Vendettas_Sting",
  Blast_Nova: "https://tlidb.com/cn/Blast_Nova",
  Creative_Genius: "https://tlidb.com/cn/Creative_Genius",
  Flame_of_Pleasure: "https://tlidb.com/cn/Flame_of_Pleasure",
  Frostbitten_Heart: "https://tlidb.com/cn/Frostbitten_Heart",
  "Ice-Fire_Fusion": "https://tlidb.com/cn/Ice-Fire_Fusion",
  Wisdom_of_The_Gods: "https://tlidb.com/cn/Wisdom_of_The_Gods",
  Incarnation_of_the_Gods: "https://tlidb.com/cn/Incarnation_of_the_Gods",
  Blasphemer: "https://tlidb.com/cn/Blasphemer",
  Spacetime_Illusion: "https://tlidb.com/cn/Spacetime_Illusion",
  Spacetime_Elapse: "https://tlidb.com/cn/Spacetime_Elapse",
  Order_Calling: "https://tlidb.com/cn/Order_Calling",
  Charge_Calling: "https://tlidb.com/cn/Charge_Calling",
  High_Court_Chariot: "https://tlidb.com/cn/High_Court_Chariot",
  Unsullied_Blade: "https://tlidb.com/cn/Unsullied_Blade",
  Growing_Breeze: "https://tlidb.com/cn/Growing_Breeze",
  Vigilant_Breeze: "https://tlidb.com/cn/Vigilant_Breeze",
  Sing_with_the_Tide: "https://tlidb.com/cn/Sing_with_the_Tide",
  Licorice_Note: "https://tlidb.com/cn/Licorice_Note",
});

const SS13_PREVIEW_FLAT_ID_SET = new Set(Object.values(SS13_PREVIEW_FLAT_IDS));
const SS13_ACTIVE_HERO_SOURCE_PATH_SET = new Set(
  Object.keys(SS13_ACTIVE_HERO_SOURCE_URLS_BY_SOURCE_PATH),
);
const EMPTY_PREVIEW_HEROES = Object.freeze([]);

function fail(code, path) {
  throw new Error(`${code}: ${path}`);
}

function sourceIdentity(value) {
  if (typeof value !== "string" || !value) return "";
  let source = value;
  try {
    const url = new URL(value);
    source = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    source = value;
  }
  try {
    source = decodeURIComponent(source);
  } catch {
    return "";
  }
  return source.toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

const SS13_ACTIVE_HERO_SOURCE_PATH_BY_IDENTITY = new Map(
  Object.keys(SS13_ACTIVE_HERO_SOURCE_URLS_BY_SOURCE_PATH)
    .map((sourcePath) => [sourceIdentity(sourcePath), sourcePath]),
);

export function isSs13PreviewHeroCatalogItem(item) {
  return item?.id === SS13_PREVIEW_HERO_FLAT_ID;
}

export function isSs13PreviewCatalogItem(item) {
  return SS13_PREVIEW_FLAT_ID_SET.has(item?.id);
}

function isActiveSkillRuntimeRecord(record) {
  return !isSs13PreviewCatalogItem({ id: record?.flatItemId ?? record?.id });
}

export function excludeSs13PreviewSkillRuntimeModel(model) {
  const supports = Object.fromEntries(
    Object.entries(model?.supports ?? {}).map(([kind, records]) => [
      kind,
      (Array.isArray(records) ? records : []).filter(isActiveSkillRuntimeRecord),
    ]),
  );

  return {
    ...model,
    active: (Array.isArray(model?.active) ? model.active : []).filter(isActiveSkillRuntimeRecord),
    passive: (Array.isArray(model?.passive) ? model.passive : []).filter(isActiveSkillRuntimeRecord),
    supports,
    allSupports: (Array.isArray(model?.allSupports) ? model.allSupports : [])
      .filter(isActiveSkillRuntimeRecord),
  };
}

function verifyAndSelectActiveBranches(heroCatalog) {
  const branches = Array.isArray(heroCatalog?.heroes) ? heroCatalog.heroes : [];
  const activeBranches = branches.filter(({ sourcePath }) => (
    SS13_ACTIVE_HERO_SOURCE_PATH_SET.has(sourcePath)
  ));
  const inactiveBranches = branches.filter(({ sourcePath }) => (
    !SS13_ACTIVE_HERO_SOURCE_PATH_SET.has(sourcePath)
  ));

  if (activeBranches.length !== SS13_ACTIVE_HERO_SOURCE_PATH_SET.size) {
    fail("hero-season-ss13-active-branch-count", activeBranches.length);
  }
  if (inactiveBranches.length > 1 || (inactiveBranches.length === 1 && (
    inactiveBranches[0]?.id !== SS13_PREVIEW_HERO_BRANCH_ID
    || inactiveBranches[0]?.sourcePath !== "poster_ss13pn_ch_3_sub_20"
  ))) {
    fail("hero-season-ss13-patch-only-branch", SS13_PREVIEW_HERO_BRANCH_ID);
  }

  for (const [sourcePath, sourceUrl] of Object.entries(
    SS13_ACTIVE_HERO_SOURCE_URLS_BY_SOURCE_PATH,
  )) {
    const matches = activeBranches.filter((branch) => branch?.sourcePath === sourcePath);
    if (matches.length !== 1) fail("hero-season-ss13-active-source-path", sourcePath);
    if (matches[0].sourceUrl !== sourceUrl) fail("hero-season-ss13-active-source", sourcePath);
  }

  return activeBranches;
}

function verifyAndSelectActiveFlatHeroes(flatHeroes) {
  const sourceFlatHeroes = Array.isArray(flatHeroes) ? flatHeroes : [];
  const previewFlatHeroes = sourceFlatHeroes.filter(isSs13PreviewHeroCatalogItem);
  const activeFlatHeroes = sourceFlatHeroes.filter((item) => !isSs13PreviewHeroCatalogItem(item));

  if (previewFlatHeroes.length > 1) {
    fail("hero-season-ss13-patch-only-flat", SS13_PREVIEW_HERO_FLAT_ID);
  }
  if (activeFlatHeroes.length !== SS13_ACTIVE_HERO_SOURCE_PATH_SET.size) {
    fail("hero-season-ss13-flat-count", activeFlatHeroes.length);
  }

  const seenSourcePaths = new Set();
  for (const flatHero of activeFlatHeroes) {
    if (!flatHero?.sourceUrl?.startsWith("https://tlidb.com/cn/")) {
      fail("hero-season-ss13-flat-source", flatHero?.id ?? "unknown");
    }
    const sourcePath = SS13_ACTIVE_HERO_SOURCE_PATH_BY_IDENTITY.get(
      sourceIdentity(flatHero.sourceUrl),
    );
    if (!sourcePath || seenSourcePaths.has(sourcePath)) {
      fail("hero-season-ss13-flat-source-path", flatHero?.id ?? "unknown");
    }
    seenSourcePaths.add(sourcePath);
  }
  if (seenSourcePaths.size !== SS13_ACTIVE_HERO_SOURCE_PATH_SET.size) {
    fail("hero-season-ss13-flat-source-path-count", seenSourcePaths.size);
  }

  return activeFlatHeroes;
}

export function partitionHeroCatalogBySeason(heroCatalog, flatHeroes = []) {
  const activeBranches = verifyAndSelectActiveBranches(heroCatalog);
  const activeFlatHeroes = verifyAndSelectActiveFlatHeroes(flatHeroes);

  return {
    activeHeroCatalog: {
      ...heroCatalog,
      heroes: activeBranches,
    },
    activeFlatHeroes,
    previewHeroes: EMPTY_PREVIEW_HEROES,
  };
}
