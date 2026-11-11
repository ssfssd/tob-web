import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_YOUGA } from "./data/ss14Youga.generated.js";

export const YOUGA_SS14_ID = "hero-ss14-the-ultimate-one";
if (!SS14_COMPONENTS.heroIdentities.some(i => i.catalogId === YOUGA_SS14_ID)) {
  SS14_COMPONENTS.heroIdentities.push({ id: "The_Ultimate_One", catalogId: YOUGA_SS14_ID, sourcePath: "The_Ultimate_One", choices: [] });
  for (const locale of ["en", "ko"]) {
    const p = SS14_YOUGA.pages[`${locale}/The_Ultimate_One`];
    SS14_COMPONENTS.pages[p.sourceUrl] = { ...p, status: "collected-preview", locale, category: "hero", slug: "The_Ultimate_One" };
  }
}

export const THEA_SS14_ID = "hero-tlidb-com-cn-wisdom-of-the-gods";
// TLIDB Basic Rules: an unlocked additional trait slot needs its corresponding memory.
export const EMPTY_TRAIT_MEMORY = "no-memory";
export const traitMemorySlot = level => [45, 60, 75].indexOf(Number(level));
export function canMarkTraitMemoryEmpty(build, level) {
  const index = traitMemorySlot(level);
  return index >= 0 && !build.hero?.memories?.[index];
}
const safeKo = text => typeof text === "string" && /[가-힣]/u.test(text) && !/\p{Script=Han}/u.test(text) ? text : "한국어 원문 미제공";
export function seasonHeroOptions(data = SS14_COMPONENTS) {
  return data.heroIdentities.flatMap(identity => {
    const page = data.pages[`https://tlidb.com/en/${identity.sourcePath}`];
    const ko = data.pages[`https://tlidb.com/ko/${identity.sourcePath}`];
    if (page?.season !== "SS14" || page.sourceSeasonEvidence?.actualSeason !== 14 || !page.sourceSeasonEvidence.verificationComplete
      || ko?.season !== "SS14" || ko.sourceSeasonEvidence?.actualSeason !== 14 || !ko.sourceSeasonEvidence.verificationComplete) return [];
    return [{ id: identity.catalogId, name: safeKo(ko.parsed.page.name), title: safeKo(ko.parsed.page.title),
      description: safeKo(ko.parsed.page.overview), sourcePath: identity.sourcePath, sourceUrl: page.sourceUrl, sourcePageSha256: page.sourcePageSha256 }];
  });
}
export function seasonHeroTraitOptions(heroId, data = SS14_COMPONENTS) {
  const path = data.heroIdentities.find(row => row.catalogId === heroId)?.sourcePath;
  const page = data.pages[`https://tlidb.com/en/${path}`];
  const ko = data.pages[`https://tlidb.com/ko/${path}`];
  if (!seasonHeroOptions(data).some(row => row.id === heroId)) return [];
  return page.parsed.traits.map(trait => ({ key: trait.key, level: trait.requiredLevel,
    name: safeKo(ko?.parsed.traits.find(t => t.key === trait.key)?.name),
    description: safeKo(ko?.parsed.traits.find(t => t.key === trait.key)?.description), iconUrl: trait.iconUrl,
    sourceUrl: page.sourceUrl, sourcePageSha256: page.sourcePageSha256 }));
}
export function seasonTheaOptions(data = SS14_COMPONENTS) { return seasonHeroTraitOptions(THEA_SS14_ID, data); }
export function validSeasonHeroSelection(inputs) {
  if (inputs.heroMemoryMode !== undefined && inputs.heroMemoryMode !== "configured-v1") return false;
  const value = inputs.heroSelection;
  if (value === undefined) return true;
  const options = seasonHeroTraitOptions(value?.heroId);
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every(k => ["heroId", "choices", "sourcePageSha256"].includes(k))
    && options.length > 0 && value.sourcePageSha256 === options[0]?.sourcePageSha256
    && value.choices !== null && typeof value.choices === "object" && !Array.isArray(value.choices)
    && Object.entries(value.choices).every(([level, key]) => options.some(o => String(o.level) === level && o.key === key)
      || key === EMPTY_TRAIT_MEMORY && ["45", "60", "75"].includes(level) && inputs.heroMemoryMode === "configured-v1");
}
export function applySeasonHeroSelection(build, inputs) {
  if (!inputs.heroSelection) return build;
  if (!validSeasonHeroSelection(inputs)) throw new Error("SS14 히어로 선택의 원문 연결을 확인하세요.");
  const selected = inputs.heroSelection;
  // Older hero-selection documents intentionally omitted source memories.
  // Preserve that interpretation until an explicit SS14 hero configuration
  // owns the memories; otherwise reopening an old copy would resurrect them.
  if (inputs.heroMemoryMode !== "configured-v1") build.hero = { ...build.hero, memories: [], revivalMemory: null };
  build.hero = { ...build.hero, branchId: selected.heroId,
    traitSelections: Object.entries(selected.choices).filter(([, key]) => key !== EMPTY_TRAIT_MEMORY).sort(([a], [b]) => Number(a) - Number(b))
      .map(([level, key]) => ({ requiredLevel: Number(level), choiceIds: [key] })) };
  build.selections = { ...build.selections, hero: [selected.heroId] };
  return build;
}

export function editSeasonHeroSelection(target, edit) {
  const inputs = target.ss14Inputs;
  const previousChoice = inputs.heroSelection?.choices?.[edit.key];
  const onlyConfirmsEmpty = edit.kind === "hero-choice"
    && (!previousChoice || previousChoice === EMPTY_TRAIT_MEMORY) && (!edit.value || edit.value === EMPTY_TRAIT_MEMORY);
  const options = seasonHeroTraitOptions(edit.kind === "hero-selection" ? edit.value : inputs.heroSelection?.heroId);
  if (edit.kind === "hero-selection") {
    if (!options.length) throw new Error("SS14 원문이 연결된 히어로를 선택하세요.");
    target.hero = { ...target.hero, memories: [], revivalMemory: null };
    inputs.heroMemoryMode = "configured-v1";
    inputs.heroSelection = { heroId: edit.value, choices: {}, sourcePageSha256: options[0].sourcePageSha256 };
    // The single base trait follows the hero identity; its tier stays unknown.
    const base = options.filter(o => o.level === 1);
    if (base.length === 1) inputs.heroSelection.choices[1] = base[0].key;
    delete inputs.heroTiers; delete inputs.memoryBases; delete inputs.memoryRolls;
    for (const key of ["theaCycle", "theaEvents", "theaRulesReceipt", "theaEffectsReceipt", "theaCombatReceipt"]) delete inputs[key];
  } else {
    const emptySlot = edit.value === EMPTY_TRAIT_MEMORY && traitMemorySlot(edit.key) >= 0;
    if (emptySlot && !canMarkTraitMemoryEmpty(target, edit.key)) throw new Error("해당 단계의 추억을 먼저 해제하세요.");
    if (!inputs.heroSelection || ![1, 45, 60, 75].includes(Number(edit.key))
      || edit.value !== "" && !emptySlot && !options.some(o => o.key === edit.value && String(o.level) === String(edit.key))) throw new Error("해당 레벨의 SS14 특성을 선택하세요.");
    if (emptySlot) inputs.heroMemoryMode = "configured-v1";
    const old = inputs.heroSelection.choices[edit.key];
    if (old && inputs.heroTiers) delete inputs.heroTiers[old];
    if (edit.value === "") delete inputs.heroSelection.choices[edit.key];
    else inputs.heroSelection.choices[edit.key] = edit.value;
  }
  if (!onlyConfirmsEmpty) delete inputs.heroCombat;
  inputs.componentReceipts ??= {};
  inputs.componentReceipts[options[0].sourceUrl] = options[0].sourcePageSha256;
}
