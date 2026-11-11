import { getSelectedGearAuthority } from "./selectedGearAuthority.js";

export function getGearTooltipRollControls(item, config = {}) {
  const authority = getSelectedGearAuthority(item, config);
  if (!authority || item.categoryId !== "gear" || authority.selectionBlockers?.length) return [];
  return [...new Map((authority.parsedEffects ?? []).filter((effect) => effect.roll).map((effect) => [effect.roll.key, effect])).values()].map((effect, index) => ({
    key: effect.roll.key, min: effect.roll.min, max: effect.roll.max,
    value: Number.isFinite(config.rolls?.[effect.roll.key]) ? config.rolls[effect.roll.key] : "",
    label: `원문 옵션 수치 ${index + 1}`, sourceUrl: authority.sourceUrl,
  }));
}
