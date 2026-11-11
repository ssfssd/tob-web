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
const BING2 = "hero-tlidb-com-cn-creative-genius";
export const traitSlotCount = (id, level) => id === BING2 && [45,60,75].includes(Number(level)) ? 2 : 1;
export const traitSlots = value => Array.isArray(value) ? value : value ? [value] : [];
const canonicalTrait = (heroId, id) => SS14_COMPONENTS.heroIdentities.find(h=>h.catalogId===heroId)?.choices
  .find(c=>c.id===id || c.sourceId===id)?.recordKey ?? id;
export function buildTraitSlots(build, level) {
  const hero = build.hero;
  if (build.ss14Inputs?.heroSelection) return traitSlots(build.ss14Inputs.heroSelection.choices[level]);
  const options=seasonHeroTraitOptions(hero?.branchId);
  return (hero?.traitSelections ?? []).flatMap(s=>(s.choiceIds??[]).map(id=>canonicalTrait(hero.branchId,id))
    .filter(key=>Number(s.requiredLevel??options.find(o=>o.key===key)?.level)===Number(level)));
}
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
    && Object.entries(value.choices).every(([level, raw]) => {
      const keys=traitSlots(raw), used=keys.filter(Boolean), limit=traitSlotCount(value.heroId,level);
      return keys.length>0 && keys.length<=limit && used.length>0 && new Set(used).size===used.length
        && (!Array.isArray(raw) || limit===2) && keys.every(key=>key==="" || options.some(o=>String(o.level)===level && o.key===key)
          || key===EMPTY_TRAIT_MEMORY && ["45","60","75"].includes(level) && inputs.heroMemoryMode==="configured-v1");
    });
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
    traitSelections: Object.entries(selected.choices).sort(([a], [b]) => Number(a) - Number(b))
      .map(([level, raw]) => ({ requiredLevel: Number(level), choiceIds: traitSlots(raw).filter(k=>k && k!==EMPTY_TRAIT_MEMORY) }))
      .filter(s=>s.choiceIds.length) };
  build.selections = { ...build.selections, hero: [selected.heroId] };
  return build;
}

export function editSeasonHeroSelection(target, edit) {
  const inputs = target.ss14Inputs;
  const slot=edit.choiceIndex ?? 0;
  const previousChoice = buildTraitSlots(target,edit.key)[slot];
  const onlyConfirmsEmpty = edit.kind === "hero-choice"
    && (!previousChoice || previousChoice === EMPTY_TRAIT_MEMORY) && (!edit.value || edit.value === EMPTY_TRAIT_MEMORY);
  const heroId = edit.kind === "hero-selection" ? edit.value : inputs.heroSelection?.heroId ?? target.hero?.branchId;
  const options = seasonHeroTraitOptions(heroId);
  if (!inputs.heroSelection && heroId===BING2 && target.hero?.branchId===heroId && target.hero.traitSelections?.length) {
    const choices={};
    for(const s of target.hero.traitSelections) {
      for(const id of s.choiceIds ?? []) {
        const key=canonicalTrait(heroId,id), level=s.requiredLevel??options.find(o=>o.key===key)?.level;
        const keys=[...traitSlots(choices[level]),key];
        choices[level]=keys.length===1?key:keys;
        const binding=inputs.heroTiers?.[id] ?? (s.choiceTiers?.[id] ? {tier:s.choiceTiers[id],sourcePageSha256:options[0].sourcePageSha256} : null);
        if(binding){inputs.heroTiers??={};inputs.heroTiers[key]=binding;}
      }
    }
    inputs.heroSelection={heroId,choices,sourcePageSha256:options[0].sourcePageSha256};
    inputs.heroMemoryMode="configured-v1";
    if(!validSeasonHeroSelection(inputs)) throw new Error("기존 빈 특성의 단계 또는 출처를 확인하세요.");
  }
  if (edit.kind === "hero-selection") {
    if (!options.length) throw new Error("SS14 원문이 연결된 히어로를 선택하세요.");
    if(inputs.heroSelection?.heroId===heroId)return;
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
    const limit=traitSlotCount(heroId,edit.key), keys=[...traitSlots(inputs.heroSelection.choices[edit.key])];
    if(!Number.isInteger(slot)||slot<0||slot>=limit)throw new Error("해당 단계의 특성 칸을 확인하세요.");
    if(edit.value && keys.some((key,i)=>i!==slot && key===edit.value))throw new Error("다른 칸에 이미 선택한 특성입니다.");
    const old = keys[slot];
    if((old??"")===edit.value)return;
    if (old && inputs.heroTiers) delete inputs.heroTiers[old];
    while(keys.length<=slot)keys.push("");
    keys[slot]=edit.value;
    if (!keys.some(Boolean)) delete inputs.heroSelection.choices[edit.key];
    else inputs.heroSelection.choices[edit.key] = keys.length===1 ? keys[0] : keys;
  }
  if (!onlyConfirmsEmpty) delete inputs.heroCombat;
  inputs.componentReceipts ??= {};
  inputs.componentReceipts[options[0].sourceUrl] = options[0].sourcePageSha256;
}
