import { matchScreenshotCatalogItems } from './screenshotImportSelection.js';
import { getSelectedGearAuthority } from './selectedGearAuthority.js';
import { projectTlidbGearTooltipRollValues } from './tlidbGearTooltipCalculation.js';
import { getScreenshotCraftCandidates, applyScreenshotCraftValues } from './screenshotCraftValues.js';

const compact = text => String(text ?? '').normalize('NFKC').toLowerCase()
  .replace(/[–—−~～]/gu, '-').replace(/[^\p{L}\p{N}.+%(){}_-]/gu, '');
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const number = '[+-]?\\d+(?:\\.\\d+)?';

function gearDefinitions(item) {
  return (item.legendaryAffixes ?? []).flatMap(affix => ['normal', 'corroded'].flatMap(variant => {
    const source = affix[variant];
    if (source?.sourcePageVersion !== 'SS13' || source.sourceLocale !== 'ko' || /[\u3400-\u9fff]/u.test(source.text)
      || source.sourceFieldStatus?.text !== 'exact'
      || !source.renderTemplate || !source.rollDefs?.length) return [];
    const keys = [...source.renderTemplate.matchAll(/\{\{([^}]+)\}\}/gu)].map(match => match[1]);
    // A fixed number without an authoritative roll definition is not editable.
    if (!keys.length || keys.some(key => !source.rollDefs.some(roll => roll.key === key))) return [];
    const parts = compact(source.renderTemplate).split(/\{\{[^}]+\}\}/gu);
    const pattern = parts.map(escapeRegex).join(`(${number})(?:\\((${number})-(${number})\\))?`);
    return [{ slotId: affix.slotId, variant, source, keys, pattern }];
  }));
}

export function getScreenshotValueCandidates(texts, items, names, registry = null) {
  const passes = (Array.isArray(texts) ? texts : [texts]).map(text => String(text ?? ''));
  Object.defineProperty(passes, 'craftRows', {value:Array.isArray(texts?.craftRows) ? texts.craftRows : []});
  const candidates = [];
  const gearNames = names.filter(candidate => candidate.categoryId === 'gear');
  const skillNames = names.filter(candidate => ['skills', 'supports'].includes(candidate.categoryId));
  const market = passes.some(text => /검색\s*조건|거래\s*검색|search\s*(?:criteria|filters)|trade\s*search|[<>=≤≥＝]+\s*[+\-]?\d/iu.test(text));
  const gearIds = matchScreenshotCatalogItems(passes, gearNames);
  for (const text of passes) {
    const normalized = compact(text);
    if (!market && gearIds.length === 1) {
      const item = items.find(item => item.id === gearIds[0]);
      for (const definition of item ? gearDefinitions(item) : []) {
        for (const match of normalized.matchAll(new RegExp(definition.pattern, 'gu'))) {
          const rolls = definition.keys.map((key, index) => {
            const roll = definition.source.rollDefs.find(roll => roll.key === key);
            const value = Number(match[1 + index * 3]);
            const displayedMin = match[2 + index * 3];
            const displayedMax = match[3 + index * 3];
            if (!Number.isFinite(value) || value < roll.min || value > roll.max
              || (displayedMin !== undefined && (Number(displayedMin) !== roll.min || Number(displayedMax) !== roll.max))) return null;
            return { kind: 'gear-roll', itemId: item.id, key: `legendary:${definition.slotId}:${definition.variant}:${key}`,
              slotId: definition.slotId, variant: definition.variant, value, min: roll.min, max: roll.max,
              label: definition.source.text, sourceText: match[0] };
          });
          if (rolls.every(Boolean)) candidates.push(...rolls);
        }
      }
    }
    // Bind a level to the nearest named skill header, never to a requirement,
    // star rank, another OCR pass, or an unrelated skill elsewhere on screen.
    for (const match of text.matchAll(/(?:[레래][벨멜]|\bLevel)\s*[:：]?\s*(\d{1,3})(?:\s*\+\s*(\d{1,2}))?(?![\d.+])/giu)) {
      if (/요구\s*조건|레벨\s*조건|required/iu.test(text.slice(Math.max(0, match.index - 15), match.index))) continue;
      const prefix = text.slice(Math.max(0, match.index - 100), match.index);
      const ids = matchScreenshotCatalogItems(prefix, skillNames);
      const value = Number(match[1]);
      if (ids.length !== 1 || value < 1 || value > 21) continue;
      candidates.push({ kind: 'skill-level', itemId: ids[0], key: 'level', value,
        bonus: Number(match[2] ?? 0), label: '기본 스킬 레벨', sourceText: match[0] });
    }
  }
  const groups = new Map();
  for (const candidate of candidates) {
    const groupKey = `${candidate.itemId}:${candidate.slotId ?? ''}:${candidate.key.split(':').at(-1)}`;
    const group = groups.get(groupKey) ?? [];
    if (!group.some(previous => previous.value === candidate.value && previous.key === candidate.key && previous.bonus === candidate.bonus)) group.push(candidate);
    groups.set(groupKey, group);
  }
  const values = [...groups.values()].map((group, index) => ({ ...group[0], id: `value-${index}`,
    status: group.length === 1 ? 'recognized' : 'conflict',
    alternatives: group.map(value => value.value),
  }));
  const gear = !market && gearIds.length === 1 ? items.find(item => item.id === gearIds[0]) : null;
  if (gear) values.push(...getScreenshotCraftCandidates(passes, gear, registry)
    .filter(craft => !candidates.some(candidate => candidate.kind === 'gear-roll' && compact(candidate.sourceText) === craft.sourceText))
    .map((candidate, index) => ({ ...candidate, id: `craft-${index}` })));
  return values;
}

export function applyScreenshotGearValues(build, item, slotIndex, candidates, registry = null) {
  build = applyScreenshotCraftValues(build, item, slotIndex, candidates, registry);
  const slot = build.gear?.slots?.[slotIndex];
  if (slot?.itemId !== item.id) return build;
  const definitions = gearDefinitions(item);
  const valid = candidates.filter(candidate => candidate.kind === 'gear-roll' && candidate.itemId === item.id
    && candidate.status === 'recognized' && definitions.some(definition => definition.slotId === candidate.slotId
      && definition.variant === candidate.variant && definition.source.rollDefs.some(roll =>
        candidate.key === `legendary:${definition.slotId}:${definition.variant}:${roll.key}`
        && Number.isFinite(candidate.value) && candidate.value >= roll.min && candidate.value <= roll.max)));
  if (!valid.length) return build;
  const rolls = { ...(slot.rolls ?? {}) };
  const corroded = new Set(slot.legendaryDraft?.corrodedSlotIds
    ?? (slot.corrupted ? (item.legendaryAffixes ?? []).map(affix => affix.slotId) : []));
  for (const candidate of valid) {
    rolls[candidate.key] = candidate.value;
    if (candidate.variant === 'corroded') corroded.add(candidate.slotId);
    else corroded.delete(candidate.slotId);
  }
  const nextSlot = { ...slot, rolls, legendaryDraft: { ...slot.legendaryDraft, corrodedSlotIds: [...corroded] } };
  const selectedRolls = Object.fromEntries(valid.map(candidate => [candidate.key, candidate.value]));
  // A previously typed calculation override must not silently win over the
  // newly selected screenshot value. Project only the selected modifiers.
  Object.assign(rolls, projectTlidbGearTooltipRollValues(item, { ...nextSlot, rolls: selectedRolls }, getSelectedGearAuthority(item, nextSlot)));
  const slots = [...build.gear.slots];
  slots[slotIndex] = nextSlot;
  const result = { ...build, gear: { ...build.gear, slots } };
  for (const [field, projection] of [['rolls', 'gearRolls'], ['legendaryDraft', 'gearLegendaryDrafts']]) {
    const last = slots.filter(slot => slot?.itemId === item.id && Object.hasOwn(slot, field)).at(-1);
    result[projection] = { ...build[projection], [item.id]: last[field] };
  }
  return result;
}
