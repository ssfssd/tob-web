import { getSelectedItems, normalizeBuild, inspectSelectedGearCrafts } from "./engine.js";
import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";
import { getSelectedGearAuthority } from "./selectedGearAuthority.js";
import { projectTlidbGearTooltipRollValues } from "./tlidbGearTooltipCalculation.js";
import { resolveTlidbTooltipEffects } from "./tlidbTooltipEffectRuntime.js";

// Generic crafting was removed for Legendary gear (XD SS6 crafting rework).
// A stored craft row does not identify an eligible special/dream-crafting route.
export function advisorGearAcquisitionBlocker(item, crafts) {
  return item?.rarity === "Legendary" && Object.keys(crafts ?? {}).length > 0
    ? "제작 방식·장비 적용 규칙 미검증: 레전드 장비의 추가 제작 옵션은 수치 근거만으로 획득 가능성을 확인할 수 없습니다."
    : null;
}

// This verifies only the selected tooltip/craft/corrosion configuration.
// It never promotes the whole item (crafting/corrosion/all variants) to complete.
export function inspectAdvisorCalculationSupport(build, calculation) {
  const normalized = normalizeBuild(build);
  const accounted = new Set(["model:defensive-survivability"]);
  const unresolvedGear = new Set();
  const receipts = [];
  const acquisitionBlockers = [];
  const entries = getSelectedItems(normalized).flatMap((item) => item.categoryId === "gear"
    ? normalized.gear.slots.flatMap((slot, selectionIndex) => slot?.itemId === item.id ? [{ item, selectionIndex }] : [])
    : [{ item }]);
  for (const { item, selectionIndex } of entries) {
    const slot = normalized.gear.slots[selectionIndex];
    const authority = item.categoryId === "gear" ? getSelectedGearAuthority(item, slot) : getTlidbCalculationAuthority(item);
    if (!authority) continue;
    if (item.categoryId === "gear") {
      const acquisitionReason = advisorGearAcquisitionBlocker(item, slot?.crafts);
      if (acquisitionReason) {
        unresolvedGear.add(item.id);
        acquisitionBlockers.push({ sourceId: item.id, reason: acquisitionReason });
        continue;
      }
      const craft = inspectSelectedGearCrafts(item, slot?.crafts);
      if (selectionIndex < 2 || !slot || slot.affixText?.trim()
        || !craft.complete || authority.blockers.length) { unresolvedGear.add(item.id); continue; }
      const rolls = projectTlidbGearTooltipRollValues(item, slot, authority);
      // Scoped offensive effects are resolved by the real skill-row evaluator below.
      const resolution = resolveTlidbTooltipEffects(authority.effects, {
        rollValues: rolls, conditions: normalized.conditions, stats: calculation.summary,
      });
      if (resolution.excluded.length) { unresolvedGear.add(item.id); continue; }
      if (authority.parsedEffects.some((effect) => effect.roll && (
        !Number.isFinite(rolls[effect.roll.key]) || rolls[effect.roll.key] < effect.roll.min
        || rolls[effect.roll.key] > effect.roll.max
      ))) { unresolvedGear.add(item.id); continue; }
      accounted.add(`${item.id}:calculation-coverage`);
      receipts.push({ itemId: item.id, selectionIndex,
        scope: authority.variantReceipts ? "selected-corroded-tooltip" : "selected-normal-tooltip-only",
        ...authority.receipt, variants: authority.variantReceipts ?? [],
        crafts: craft.trace.filter((entry) => entry.status !== "blocked") });
    }
    if (["skills", "supports"].includes(item.categoryId)) {
      for (const source of calculation.provenance?.sources ?? []) {
        if (!source.id.startsWith(`${item.id}:tlidb-tooltip-blocker:`)) continue;
        const effect = authority.parsedEffects.find((entry) => entry.sourceText === source.receipt?.sourceText);
        if (!["mana-cost", "mana-cost-multiplier"].includes(effect?.stat)) continue;
        const rows = (calculation.skillRows ?? []).filter((row) => row.manaCost?.receipts?.some((receipt) => receipt.sourceId === item.id));
        if (rows.length && rows.every((row) => row.manaCost.status === "complete")) accounted.add(source.id);
      }
    }
  }
  for (const id of unresolvedGear) accounted.delete(`${id}:calculation-coverage`);
  const sources = calculation.provenance?.sources ?? [];
  const blockers = [...acquisitionBlockers, ...sources.filter((source) => ["unsupported", "inferred"].includes(source.evidence) && !accounted.has(source.id))
    .map((source) => ({ sourceId: source.id, reason: source.inactiveReason || "unverified-source" }))];
  for (const effect of calculation.effects ?? []) {
    if (effect.applied !== false || accounted.has(effect.sourceId)) continue;
    if (effect.evidence === "unsupported" || effect.targetKey === "unmodeled") {
      blockers.push({ sourceId: effect.sourceId, reason: effect.inactiveReason || "unresolved-effect" });
    }
  }
  const rows = (calculation.skillRows ?? []).filter((row) => row.calculationApplicable !== false);
  const current = calculation.provenance?.summary?.patchMismatch === false;
  const supported = sources.length > 0 && current && blockers.length === 0;
  return { dps: supported && rows.length > 0 && rows.every((row) => row.calculationSupported === true)
      && Number.isFinite(calculation.summary?.dps),
    resources: supported, blockers, receipts,
    limitations: ["입력한 일반·제작 옵션과 침식 효과 중 근거와 계산이 확인된 조합만 비교합니다. 게임 확률은 미검증이며 기대비용은 사용자가 명시한 확률 가정으로만 계산합니다.", "유효 HP·최대 피격량은 미지원이며 이 순위에 포함되지 않습니다."] };
}
