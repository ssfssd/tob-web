import { getSeasonSelectionRecord } from './seasonSelections.js';
import { parseTlidbGearTooltip } from './tlidbGearTooltipCalculation.js';
import { normalizeSeasonGearEffects } from './seasonGearEffects.js';
import { resolveSeasonGearConditions } from './seasonGearConditions.js';
import { inspectLogGear } from './seasonLogGear.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';

// Controls share the same resolver as the calculator. Effects stay on their
// equipment slot and are never added a second time through this projection.
export function seasonGearConditionRows(build) {
  return (build?.gear?.slots ?? []).flatMap((slot, index) => {
    const record = getSeasonSelectionRecord('gear', slot?.itemId), binding = build.ss14Inputs?.gear?.[index];
    if (!record || binding?.itemId !== slot.itemId || binding.sourcePageSha256 !== record.sourcePageSha256) return [];
    const path = `gear.slots.${index}.${slot.itemId}.conditions`;
    const parsed = binding.logGear ? inspectLogGear(slot.itemId, binding.logGear, build, index)
      : resolveSeasonGearConditions(normalizeSeasonGearEffects(parseTlidbGearTooltip({ id: slot.itemId, categoryId: 'gear',
        tlidbText: { en: { ...record, sourcePageVersion: 'SS14', sourceFieldStatus: { detail: 'exact' } } } },
        { season: 'SS14', flavorReceipt: record.flavorReceipt })).effects, build,
        { path, sourcePageSha256: record.sourcePageSha256 });
    const controls = parsed.conditionControls ?? parsed.conditions;
    if (!controls.length) return [];
    const ko = SS14_CARDS.records[slot.itemId];
    const safe = text => /[가-힣]/u.test(text ?? '') && !/\p{Script=Han}/u.test(text) ? text : '한국어 원문 미제공';
    const blockers = controls.filter(c => c.value === '').map(c => ({ sourceText: c.sourceText, reason: '장비 효과의 적용 조건을 선택하세요.' }));
    return [{ group: 'gear', path, itemId: slot.itemId, name: safe(ko?.name), detail: safe(ko?.detail),
      receipt: { season: 'SS14', sourceUrl: record.sourceUrl, sourcePageSha256: record.sourcePageSha256 },
      selectionCount: 1, effects: [], blockers, conditionControls: controls, inactive: parsed.inactive ?? [],
      status: blockers.length ? 'partial' : 'mapped' }];
  });
}
