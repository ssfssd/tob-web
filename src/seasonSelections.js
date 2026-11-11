import { CATALOG, GEAR_SLOT_KEYS, getGearFilterForSlot, getGearItemsForFilter, findItemById } from "./catalog.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { SS14_GEAR_EN } from "./data/ss14Gear.en.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { t } from "./i18n.js";
import { normalizeBuild } from "./engine.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";
import { SS14_CURRENT_IDENTITIES } from "./seasonCurrentDatabase.js";

Object.assign(SS14_GEAR_EN.records, Object.fromEntries(Object.entries(SS14_LOG_COMPLETION.records).filter(([, r]) => r.en.category === "gear").map(([id, r]) => [id, r.en])));
SS14_GEAR_EN.collected = Object.values(SS14_GEAR_EN.records).filter(r => r.status === 'collected-preview').length;
SS14_GEAR_EN.requested = Object.keys(SS14_GEAR_EN.records).length;

export const SEASON_GEAR_SLOT_LABELS = GEAR_SLOT_KEYS.map((key) => t("ko", key));
const cache = new Map();

export function getSeasonSelectionRecord(category, id) {
  const record = (category === "gear" ? SS14_GEAR_EN : SS14_CARDS_EN).records[id];
  const item = findItemById(id);
  return record?.status === "collected-preview" && record.season === "SS14"
    && record.sourceSeasonEvidence?.verificationComplete === true && record.sourceSeasonEvidence.actualSeason === 14
    && record.sourceRecordKey === item?.tlidbText?.en?.sourceRecordKey ? record : null;
}

export function getSeasonSelectionOptions(category, index) {
  if (!Number.isInteger(index) || index < 0 || index >= (category === "gear" ? 10 : 9)) return [];
  const key = `${category}:${index}`;
  if (cache.has(key)) return cache.get(key);
  const items = category === "gear" ? getGearItemsForFilter(getGearFilterForSlot(GEAR_SLOT_KEYS[index]))
    : category === "skills" ? CATALOG.skills.filter((item) => item.type === (index < 5 ? "active" : "passive") || index < 5 && (item.type === "Modularization Skill" || SS14_CARDS_EN.records[item.id]?.tags?.includes('Focus'))) : [];
  const additional = [...SS14_LOG_COMPLETION.identities, ...SS14_CURRENT_IDENTITIES].filter(item => item.categoryId === category
    && (category === "gear" ? item.slots?.includes(index) : SS14_CARDS_EN.records[item.id]?.tags?.includes('Focus') || (item.type === "passive" ? index >= 5 : index < 5)));
  const options = [...items, ...additional].filter((item) => getSeasonSelectionRecord(category, item.id)).map((item) => {
    const ko = SS14_CARDS.records[item.id];
    return { id: item.id, name: ko?.season === "SS14" && ko.koreanTextVerified ? ko.name : "한국어 이름 미제공", koreanTextVerified: Boolean(ko?.koreanTextVerified) };
  }).filter((row) => row.koreanTextVerified).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  cache.set(key, options);
  return options;
}

// These are explicit edits to a separate target document. Never mutate source,
// normalize it wholesale, or retain old gear modifiers on a replacement item.
export function applySeasonSelections(target, selections, levels, isolated = false) {
  if (isolated && Object.keys(selections?.gear ?? {}).length) {
    // Materialize other legacy-only instances before removing the old item-key
    // maps. Otherwise changing one ring could erase the other ring's inputs.
    const normalized = normalizeBuild(target);
    target.gear ??= { slots: [] };
    target.gear.slots ??= [];
    normalized.gear.slots.forEach((slot, index) => {
      if (!target.gear.slots[index] && slot) target.gear.slots[index] = structuredClone(slot);
    });
    for (const itemId of Object.values(selections?.gear ?? {}).filter(Boolean)) {
      for (const field of ["gearAffixes", "gearRolls", "gearCrafts", "gearCorruptions", "gearLegendaryDrafts"]) {
        if (target[field]) delete target[field][itemId];
      }
    }
  }
  for (const [key, itemId] of Object.entries(selections?.gear ?? {})) {
    const index = Number(key);
    target.selections ??= {};
    target.selections.gear ??= [];
    target.selections.gear[index] = itemId;
    target.selectionProjection ??= {};
    target.selectionProjection.gear = [...target.selections.gear];
    target.gear ??= { slots: [] };
    target.gear.slots ??= [];
    target.gear.slots[index] = itemId ? { itemId, instanceId: `ss14-gear-${index}`, rolls: {}, crafts: {},
      affixText: "", corrupted: false, legendaryDraft: null } : null;
  }
  for (const [key, itemId] of Object.entries(selections?.skills ?? {})) {
    const index = Number(key);
    target.selections ??= {};
    target.selections.skills ??= [];
    target.selections.skills[index] = itemId;
    target.selectionProjection ??= {};
    target.selectionProjection.skills = [...target.selections.skills];
    const category = index < 5 ? "active" : "passive";
    const slot = index < 5 ? index : index - 5;
    target.skills ??= { active: [], passive: [] };
    target.skills[category] ??= [];
    target.skills[category][slot] = { ...target.skills[category][slot], skillId: itemId, level: itemId ? levels[index] : 0 };
  }
  return target;
}
