import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";
import { parseTlidbGearTooltip } from "./tlidbGearTooltipCalculation.js";
import { mapTlidbTooltipEffects } from "./tlidbTooltipStatMapping.js";

const signature = (effect) => JSON.stringify([effect.stat, effect.operation, effect.unit,
  effect.roll ? [effect.roll.min, effect.roll.max] : effect.value, effect.condition ?? null]);

function variantEffects(item, variant) {
  const locale = item.tlidbText?.[variant?.sourceLocale];
  if (!locale || variant.sourcePageVersion !== "SS13" || variant.sourceFieldStatus?.text !== "exact"
    || locale.sourcePageVersion !== "SS13" || !locale.sourceSeasonEvidence?.verificationComplete
    || variant.sourceUrl !== locale.sourceUrl || variant.sourcePageSha256 !== locale.sourcePageSha256
    || !variant.sourceModifierId || !variant.sourceRecordKey) return null;
  const parsed = parseTlidbGearTooltip({ id: item.id, categoryId: "gear",
    tlidbText: { [variant.sourceLocale]: { ...locale, detail: variant.text } } }, { locale: variant.sourceLocale });
  return parsed.effects.length && !parsed.blockers.length ? parsed.effects : null;
}

// Replace only an exact, uniquely matched normal modifier. Never combine normal
// and corroded values or treat a missing variant as the original normal option.
export function getSelectedGearAuthority(item, config = {}) {
  const base = getTlidbCalculationAuthority(item);
  if (!base || item?.categoryId !== "gear") return base;
  const selected = Array.isArray(config.legendaryDraft?.corrodedSlotIds)
    ? config.legendaryDraft.corrodedSlotIds
    : config.corrupted ? (item.legendaryAffixes ?? []).map((entry) => entry.slotId) : [];
  if (!selected.length) return base;
  const parsedEffects = [...base.parsedEffects];
  const selectionBlockers = [];
  const variantReceipts = [];
  const used = new Set();
  for (const slotId of selected) {
    const affix = item.legendaryAffixes?.find((entry) => entry.slotId === slotId);
    const normal = variantEffects(item, affix?.normal);
    const corroded = variantEffects(item, affix?.corroded);
    const matches = normal?.map((effect) => parsedEffects.flatMap((target, index) =>
      target && signature(target) === signature(effect) && !used.has(index) ? [index] : []));
    if (!normal || !corroded || !matches?.every((indices) => indices.length === 1)
      || new Set(matches.flat()).size !== normal.length) {
      selectionBlockers.push({ sourceText: affix?.corroded?.text ?? slotId,
        reason: "selected-corrosion-authority-unavailable", skillDamageApplicability: "affects-dps" });
      continue;
    }
    const replacements = corroded.map((effect) => {
      if (!effect.roll) return { ...effect };
      const rolls = affix.corroded.rollDefs.filter((roll) => roll.min === effect.roll.min && roll.max === effect.roll.max);
      if (rolls.length !== 1) {
        selectionBlockers.push({ sourceText: effect.sourceText, reason: "selected-corrosion-roll-ambiguous", skillDamageApplicability: "affects-dps" });
        return effect;
      }
      return { ...effect, roll: { ...effect.roll, key: `legendary:${slotId}:corroded:${rolls[0].key}` } };
    });
    for (const index of matches.flat()) { used.add(index); parsedEffects[index] = null; }
    parsedEffects.push(...replacements);
    variantReceipts.push({ slotId, sourceUrl: affix.corroded.sourceUrl,
      sourcePageSha256: affix.corroded.sourcePageSha256, sourceRecordKey: affix.corroded.sourceRecordKey });
  }
  const selectedEffects = parsedEffects.filter(Boolean);
  const mapped = mapTlidbTooltipEffects(selectedEffects);
  const stats = {};
  for (const effect of mapped.effects) {
    if (effect.roll || effect.condition || effect.conditionRequirements || effect.per || !Number.isFinite(effect.value)) continue;
    if (effect.operation === "add") stats[effect.stat] = (stats[effect.stat] ?? 0) + effect.value;
    else if (effect.operation === "set") stats[effect.stat] = effect.value;
  }
  return { ...base, stats, parsedEffects: selectedEffects, effects: mapped.effects, variantReceipts,
    selectionBlockers, parserBlockers: [...base.parserBlockers, ...selectionBlockers],
    mappingBlockers: mapped.blockers, blockers: [...base.parserBlockers, ...selectionBlockers, ...mapped.blockers] };
}
