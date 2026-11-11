import { parseTlidbGearTooltip, projectTlidbGearTooltipRollValues } from "./tlidbGearTooltipCalculation.js";

const signature = (effect) => JSON.stringify([effect.stat, effect.operation, effect.unit,
  effect.condition ?? null, effect.conditionRequirements ?? null, effect.per ?? null, effect.target ?? null]);
const range = (effect) => effect.roll ? [effect.roll.min, effect.roll.max] : null;
const valueOf = (effect, values) => {
  if (!effect || effect.condition || effect.conditionRequirements || effect.per) return null;
  if (Number.isFinite(effect.value)) return effect.value;
  const value = values[effect.roll?.key];
  return typeof value === "number" && Number.isFinite(value) && value >= effect.roll.min && value <= effect.roll.max ? value : null;
};

// Compare card-local contributions, not final character stats. Preserve missing,
// ambiguous and changed rolls instead of importing the SS13 value into SS14.
export function compareSeasonGearEffects(item, slot, targetParsed, targetRollValues) {
  const source = parseTlidbGearTooltip(item);
  const korean = parseTlidbGearTooltip(item, { locale: "ko" });
  const sourceValues = projectTlidbGearTooltipRollValues(item, slot, { parsedEffects: source.effects });
  const keys = [...new Set([...source.effects, ...targetParsed.effects].map(signature))];
  return keys.map((key) => {
    const beforeMatches = source.effects.filter((effect) => signature(effect) === key);
    const afterMatches = targetParsed.effects.filter((effect) => signature(effect) === key);
    const before = beforeMatches.length === 1 ? beforeMatches[0] : null;
    const after = afterMatches.length === 1 ? afterMatches[0] : null;
    const local = before ? korean.effects.filter((effect) => signature(effect) === key
      && effect.value === before.value && JSON.stringify(range(effect)) === JSON.stringify(range(before))) : [];
    const label = local.length === 1 && /[가-힣]/u.test(local[0].sourceText) && !/\p{Script=Han}/u.test(local[0].sourceText)
      ? local[0].sourceText : "한국어 원문 미제공";
    const beforeValue = valueOf(before, sourceValues);
    const afterValue = valueOf(after, targetRollValues);
    const supported = beforeValue !== null && afterValue !== null;
    return { label, stat: before?.stat ?? after?.stat, unit: before?.unit ?? after?.unit,
      before: beforeValue, after: afterValue, delta: supported ? afterValue - beforeValue : null, supported,
      beforeRange: before ? range(before) : null, afterRange: after ? range(after) : null,
      reason: supported ? "" : !before || !after ? "동일 효과를 유일하게 연결할 수 없습니다."
        : before.condition || after.condition || before.per || after.per ? "조건부 효과는 카드 단독 비교에서 계산하지 않습니다."
          : "수치 선택이 없거나 시즌 간 원문·범위가 달라 선택값을 이전하지 않았습니다." };
  });
}
