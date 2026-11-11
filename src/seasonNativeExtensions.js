import { SS14_EXTENSIONS } from "./data/ss14Extensions.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { captureSeasonConfiguration } from "./seasonConfiguration.js";
import { pinSeasonComponentReceipts } from "./seasonComponents.js";
import { rebindSeasonSkillInputs } from './seasonSkillInputs.js';

const korean = value => typeof value === "string" && /[가-힣]/u.test(value) && !/\p{Script=Han}/u.test(value) ? value : "한국어 원문 미제공";
export function nativeElixirOptions() {
  return SS14_EXTENSIONS.elixirs.map(o => ({ ...o, name: korean(SS14_EXTENSIONS.pages[`ko/${o.slug}`]?.parsed.name),
    iconUrl: SS14_EXTENSIONS.pages[`ko/${o.slug}`]?.parsed.iconUrl,
    detail: korean(SS14_EXTENSIONS.pages[`ko/${o.slug}`]?.parsed.detailMods.join("\n")) }));
}
export function nativeModuleOptions() {
  return SS14_EXTENSIONS.modules.filter(o => SS14_CARDS_EN.records[o.itemId]?.season === "SS14")
    .map(o => ({ ...o, name: korean(SS14_CARDS.records[o.itemId]?.name), detail: korean(SS14_CARDS.records[o.itemId]?.detail) }));
}
export function nativeModuleForItem(id) {
  const card=SS14_CARDS_EN.records[id];
  return nativeModuleOptions().find(o=>o.itemId===id || o.href===card?.sourceRecordKey
    && SS14_CARDS_EN.records[o.itemId]?.detail.replace(/\s+/gu,' ').trim()===card.detail.replace(/\s+/gu,' ').trim());
}
export function nativeModuleAffixes() {
  return SS14_EXTENSIONS.moduleOptions.map(o => {
    const card = SS14_EXTENSIONS.pages["ko/Hyperlink"].parsed.find(r => r.href === o.href);
    return { ...o, name: korean(card?.name), detail: korean(card?.detail) };
  });
}
function capture(target) {
  target.ss14Inputs.configurations ??= {};
  target.ss14Inputs.configurations.skills = captureSeasonConfiguration(target, "skills");
  target.ss14Inputs.componentReceipts = { ...target.ss14Inputs.componentReceipts, ...pinSeasonComponentReceipts(target, ["skills"]) };
}
export function clearNativeExtension(target, index) {
  const slot = target.skills?.active?.[index];
  if (slot) delete slot.modularization;
  const elixirIndex = target.skills.elixirs?.findIndex(s => nativeElixirOptions().find(o => o.id === s?.skillId)?.itemId === slot?.skillId) ?? -1;
  if (elixirIndex >= 0) target.skills.elixirs[elixirIndex] = null;
  for (const key of Object.keys(target.ss14Inputs.extensionInputs ?? {})) {
    if (key.startsWith(`module:${index}:`) || elixirIndex >= 0 && (key.startsWith(`elixir:${elixirIndex}:`) || key.startsWith(`ingredient:${elixirIndex}:`))) delete target.ss14Inputs.extensionInputs[key];
  }
  capture(target);
}
function host(target, index, id) {
  clearNativeExtension(target, index);
  const inputs = target.ss14Inputs;
  inputs.selectionMode = "isolated-v1";
  inputs.selections ??= { gear: {}, skills: {} };
  inputs.selections.skills[index] = id;
  inputs.skills ??= {};
  if (id) inputs.skills[index] = { itemId: id, sourcePageSha256: SS14_CARDS_EN.records[id].sourcePageSha256 };
  else delete inputs.skills[index];
  target.skillLevels[index] = id ? 20 : 0;
  target.skills.active[index] = { ...target.skills.active[index], skillId: id, level: id ? 20 : 0, supports: [], unlockedSupportCount: 0 };
  rebindSeasonSkillInputs(inputs, index, id);
  for (const group of ["supports", "supportSelections"]) for (const key of Object.keys(inputs[group] ?? {})) if (key.startsWith(`${index}:`)) delete inputs[group][key];
}
export function editNativeExtension(target, edit) {
  const i = edit.slotIndex;
  if (edit.kind === "elixir-selection") {
    if (![0, 1].includes(i)) throw new Error("영약 칸을 확인하세요.");
    const option = nativeElixirOptions().find(o => o.id === edit.value);
    if (edit.value && !option) throw new Error("SS14 영약을 선택하세요.");
    const current = target.skills?.elixirs?.[i]?.skillId;
    if ((current || "") === edit.value) return true;
    if (option && target.skills.elixirs?.some((s, j) => j !== i && s?.skillId === option.id)) throw new Error("같은 영약은 한 칸에만 선택하세요.");
    const oldIdentity = nativeElixirOptions().find(o => o.id === current);
    const oldHost = target.skills.active.findIndex(s => oldIdentity && s?.skillId === oldIdentity.itemId);
    const hostIndex = edit.rowIndex ?? (oldHost >= 0 ? oldHost : i + 1);
    if (!Number.isInteger(hostIndex) || hostIndex < 0 || hostIndex > 4) throw new Error("영약을 넣을 액티브 칸을 확인하세요.");
    host(target, hostIndex, option?.itemId ?? null);
    target.skills.elixirs ??= [];
    target.skills.elixirs[i] = option ? { bottleId: i === 0 ? "base" : "special", skillId: option.id, ingredientIds: [] } : null;
  } else if (edit.kind === "module-selection") {
    if (!Number.isInteger(i) || i < 0 || i > 4) throw new Error("모듈 액티브 칸을 확인하세요.");
    const option = nativeModuleOptions().find(o => o.id === edit.value);
    if (edit.value && !option) throw new Error("SS14 모듈을 선택하세요.");
    if ((target.skills.active[i]?.modularization?.modularizationSkillId || "") === edit.value) return true;
    host(target, i, option?.itemId ?? null);
    if (option) target.skills.active[i].modularization = { modularizationSkillId: option.id, moduleOptionIds: [] };
  } else if (edit.kind === "module-option") {
    const slot = target.skills.active[i], n = Number(edit.key);
    if (!slot?.modularization || !Number.isInteger(n) || n < 0 || n > 2) throw new Error("모듈 옵션 칸을 확인하세요.");
    if (edit.value && !nativeModuleAffixes().some(o => o.id === edit.value)) throw new Error("SS14 모듈 옵션을 선택하세요.");
    const ids = [...slot.modularization.moduleOptionIds];
    if (edit.value && ids.some((id, j) => j !== n && id === edit.value)) throw new Error("같은 모듈 옵션을 중복 선택할 수 없습니다.");
    ids[n] = edit.value || null;
    slot.modularization.moduleOptionIds = ids.filter(Boolean);
    for (const key of Object.keys(target.ss14Inputs.extensionInputs ?? {})) if (key.startsWith(`module:${i}:`)) delete target.ss14Inputs.extensionInputs[key];
  } else return false;
  capture(target);
  return true;
}
