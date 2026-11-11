import { t } from './i18n.js';

const compact = text => String(text ?? '').normalize('NFKC').toLowerCase()
  .replace(/[–—−~～]/gu, '-').replace(/[^\p{L}\p{N}.+%(){}_-]/gu, '');
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const NUMBER = '[+-]?\\d+(?:\\.\\d+)?';
const GROUPS = { base_affix: 'gearCraftGroupBase', craft_prefix: 'gearCraftGroupPrefix', craft_suffix: 'gearCraftGroupSuffix',
  corrosion_affix: 'gearCraftGroupCorrosion', dream_affix: 'gearCraftGroupDream', graft: 'gearCraftGroupGraft' };

function textDistance(a, b) {
  let row = Array.from({length:b.length + 1}, (_, index) => index);
  for (let i = 0; i < a.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < b.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (a[i] === b[j] ? 0 : 1)));
    row = next;
  }
  return row[b.length];
}

// Correct only a unique official Korean label on a spatially associated T row.
// Digits, signs, units and punctuation are copied unchanged from OCR.
function canonicalCraftRow(line, defs) {
  const prefix = line.match(/^(t\d+\+?(?:초급|진급|절대자))/u)?.[0];
  if (!prefix) return {line};
  const body = line.slice(prefix.length);
  const parts = body.split(/([+-]?\d+(?:\.\d+)?)/u);
  const candidates = new Map();
  for (const def of defs) {
    const expected = def.semantic.split(/\{\{[^}]+\}\}/u);
    if (expected.length * 2 - 1 !== parts.length) continue;
    let valid = true, distance = 0;
    for (let n = 0; n < expected.length; n++) {
      const actual = parts[n * 2], wanted = expected[n];
      if (actual === wanted) continue;
      if (actual.replace(/[가-힣]/gu, '') !== wanted.replace(/[가-힣]/gu, '')) {valid = false; break;}
      const length = (wanted.match(/[가-힣]/gu) ?? []).length;
      const delta = textDistance(actual, wanted);
      if (length < 6 || delta > (length >= 20 ? 3 : 1)) {valid = false; break;}
      distance += delta;
    }
    if (valid) candidates.set(def.semantic, {def, distance});
  }
  const matches = [...candidates.values()].sort((a,b) => a.distance-b.distance);
  if (!matches.length || (matches[1]?.distance === matches[0].distance)) return {line};
  const {def} = matches[0];
  let index = 1;
  return {line:prefix + def.semantic.replace(/\{\{[^}]+\}\}/gu, () => {
    const value = parts[index]; index += 2; return value;
  }), semantic:def.semantic};
}

function validRoll(value, roll) {
  const scale = 10 ** roll.precision;
  const scaled = value * scale;
  return Number.isFinite(value) && value >= roll.min && value <= roll.max
    && Number.isInteger(roll.precision) && roll.precision >= 0 && roll.precision <= 6
    && Number.isFinite(roll.step) && roll.step > 0
    && Math.abs(scaled - Math.round(scaled)) < 1e-7
    && Math.abs((value - roll.min) / roll.step - Math.round((value - roll.min) / roll.step)) < 1e-7;
}

function definitions(item, registry) {
  if (registry?.metadata?.targetSeason !== 13 || item.craftRuntimeSupport !== 'verified-current-tlidb') return [];
  return (item.craftAffixes ?? []).flatMap(affix => {
    const group = affix.affixId.startsWith('graft:') ? 'graft' : affix.affixId.split(':')[1];
    if (!GROUPS[group] || affix.selectionSupported === false) return [];
    return (affix.tierOptions ?? []).flatMap(tier => {
      const recordKey = registry.refs[tier.activeLocaleAliases?.tier];
      const record = registry.records[recordKey];
      const source = record?.ko;
      if (record?.status !== 'exact' || !source?.renderTemplate || /[\u3400-\u9fff]/u.test(source.text)) return [];
      const keys = [...source.renderTemplate.matchAll(/\{\{([^}]+)\}\}/gu)].map(match => match[1]);
      if (!keys.length || keys.length !== tier.rollDefs?.length || keys.some(key =>
        !tier.rollDefs.some(roll => roll.key === key) || registry.refs[tier.activeLocaleAliases?.rolls?.[key]] !== recordKey)) return [];
      const semantic = compact(source.renderTemplate);
      // A missing plus can be OCR's "4" (for example +5 becoming 45).
      // Require the sign when the authoritative one-roll line displays it.
      const signedNumber = keys.length === 1 && /\+\(/u.test(source.text) ? '\\+\\d+(?:\\.\\d+)?' : NUMBER;
      const pattern = semantic.split(/\{\{[^}]+\}\}/gu).map(escapeRegex)
        .join(`(${signedNumber})(?:\\((${NUMBER})-(${NUMBER})\\))?`);
      return [{ affixId: affix.affixId, tierId: tier.tierId, tierLabel: tier.tierLabel,
        groupLabel: t('ko', GROUPS[group]), source, keys, semantic, pattern, rollDefs: tier.rollDefs }];
    });
  });
}

// Each option is atomic: a multi-value line never applies a partial set of rolls.
export function getScreenshotCraftCandidates(passes, item, registry) {
  const defs = definitions(item, registry);
  if (!defs.length) return [];
  const groups = new Map();
  const taggedRows = new Map();
  const fixedLines = new Set(String(item.tlidbText?.ko?.summary ?? '').split('\n').map(compact));
  for (const text of passes) {
    for (const row of String(text).split(/\r?\n/u)) {
      if (/^T\d\+?\s+(?:초급|진급|절대자)\s*[:：.].*\d/u.test(row.trim()) && row.length <= 500) {
        const canonical = canonicalCraftRow(compact(row), defs);
        taggedRows.set(canonical.line, {text:row.trim(),semantic:canonical.semantic});
      }
    }
    const lines = String(text).split(/\r?\n/u)
      .map(line => compact(line.replace(/^\s*[후우수全]\s+/u, ''))).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      // A wrapped tooltip line can span up to three OCR lines. Full anchoring
      // prevents a suffix of a different modifier from becoming a new option.
      for (let span = 1; span <= 3 && index + span <= lines.length; span += 1) {
        if (span > 1 && lines.slice(index, index + span).some(line => /^t\d+\+?$/u.test(line))) continue;
        const line = canonicalCraftRow(lines.slice(index, index + span).join(''), defs).line;
        if (fixedLines.has(line)) continue;
        for (const def of defs) {
          const match = line.match(new RegExp(`^(?:t(\\d+\\+?))?(?:초급|진급|절대자)?${def.pattern}(?:t(\\d+\\+?))?$`, 'u'));
          if (!match) continue;
          const displayedTiers = [match[1], match.at(-1)].filter(Boolean);
          const rolls = {};
          let valid = true;
          def.keys.forEach((key, offset) => {
            const roll = def.rollDefs.find(roll => roll.key === key);
            const value = Number(match[2 + offset * 3]);
            const min = match[3 + offset * 3];
            const max = match[4 + offset * 3];
            if (!validRoll(value, roll) || (min !== undefined && (Number(min) !== roll.min || Number(max) !== roll.max))) valid = false;
            rolls[key] = value;
          });
          if (!valid) continue;
          const group = groups.get(def.semantic) ?? { label: def.source.text, observations: [] };
          group.observations.push({ def, rolls, displayedTiers, sourceText: line });
          groups.set(def.semantic, group);
        }
      }
    }
  }
  const candidates = [...groups.entries()].map(([semantic, group]) => {
    const observations = group.observations;
    const rollSets = [...new Set(observations.map(entry => JSON.stringify(entry.rolls)))];
    const explicitTiers = [...new Set(observations.flatMap(entry => entry.displayedTiers))];
    const choices = new Map();
    for (const { def, rolls } of observations) {
      if (explicitTiers.length && !explicitTiers.every(tier => def.tierLabel.toLowerCase() === `t${tier}`)) continue;
      choices.set(`${def.affixId}|${def.tierId}`, { affixId: def.affixId, tierId: def.tierId,
        tierLabel: def.tierLabel, groupLabel: def.groupLabel, rolls,
        rangeLabel: def.rollDefs.map(roll => `${roll.min} ~ ${roll.max}`).join(' / ') });
    }
    const first = observations[0];
    const label = first.def.source.renderTemplate.replace(/\{\{([^}]+)\}\}/gu, (_, key) => String(first.rolls[key]));
    const conflict = rollSets.length !== 1 || explicitTiers.length > 1 || choices.size === 0;
    return { kind: 'gear-craft', itemId: item.id, key: `craft:${semantic}`, label,
      sourceText: first.sourceText, status: conflict ? 'conflict' : 'recognized',
      choices: conflict ? [] : [...choices.values()], choiceIndex: choices.size === 1 ? 0 : -1,
      tierEvidence: explicitTiers.length ? '화면의 등급 표기와 대조' : 'SS13 수치 범위로 대조한 등급 후보',
      alternatives: rollSets.map(rolls => Object.values(JSON.parse(rolls)).join(' / ')) };
  });
  const matchedRows = new Set([...groups.values()].flatMap(group => group.observations.map(entry => entry.sourceText)));
  const resolvedPhysicalRows = new Set((passes.craftRows ?? []).filter(rows => rows.some(row =>
    matchedRows.has(canonicalCraftRow(compact(row), defs).line))).flatMap(rows =>
    rows.map(row => canonicalCraftRow(compact(row), defs).line)));
  for (const [sourceText, {text, semantic}] of taggedRows) {
    if (matchedRows.has(sourceText) || resolvedPhysicalRows.has(sourceText) || (semantic && groups.has(semantic))) continue;
    candidates.push({ kind: 'gear-craft', itemId: item.id, key: `unverified:${sourceText}`,
      label: `${text.match(/^T\d\+?/u)[0]} 옵션 · 원본 확인 필요`, sourceText,
      status: 'unsupported', choices: [], choiceIndex: -1, tierEvidence: '', alternatives: [],
      reason: '현재 SS13 옵션 데이터로 종류·등급·수치를 확인할 수 없어 적용 제외' });
  }
  return candidates;
}

export function resolveScreenshotCraftCandidate(candidate) {
  if (candidate.kind !== 'gear-craft') return candidate;
  const choice = candidate.choices?.[candidate.choiceIndex];
  return candidate.status === 'recognized' && choice ? { ...candidate, ...choice } : null;
}

export function applyScreenshotCraftValues(build, item, slotIndex, candidates, registry) {
  const slot = build.gear?.slots?.[slotIndex];
  if (slot?.itemId !== item.id) return build;
  const defs = definitions(item, registry);
  const valid = candidates.filter(candidate => candidate.kind === 'gear-craft' && candidate.itemId === item.id
    && candidate.status === 'recognized' && defs.some(def => def.affixId === candidate.affixId && def.tierId === candidate.tierId
      && Object.keys(candidate.rolls ?? {}).length === def.keys.length
      && def.rollDefs.every(roll => validRoll(candidate.rolls[roll.key], roll))));
  const crafts = { ...(slot.crafts ?? {}) };
  let changed = false;
  for (const candidate of valid) {
    if (valid.filter(other => other.affixId === candidate.affixId || other.key === candidate.key).length !== 1) continue;
    crafts[candidate.affixId] = { tierId: candidate.tierId, rolls: { ...candidate.rolls } };
    changed = true;
  }
  if (!changed) return build;
  const slots = [...build.gear.slots];
  slots[slotIndex] = { ...slot, crafts };
  // The compatibility map is a projection of the last configured instance.
  // A stale map is otherwise interpreted as a legacy edit during saving.
  const projected = slots.filter(slot => slot?.itemId === item.id && Object.hasOwn(slot, 'crafts')).at(-1)?.crafts;
  return { ...build, gear: { ...build.gear, slots }, gearCrafts: { ...build.gearCrafts, [item.id]: projected } };
}
