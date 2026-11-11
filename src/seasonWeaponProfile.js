import { findItemById } from './catalog.js';
import { getSeasonSelectionRecord } from './seasonSelections.js';
import { parseTlidbGearTooltip } from './tlidbGearTooltipCalculation.js';
import { normalizeSeasonGearEffects, SEASON_LOCAL_WEAPON_STATS } from './seasonGearEffects.js';
import { inspectLogGear } from './seasonLogGear.js';
import { resolveSeasonGearConditions } from './seasonGearConditions.js';

const finite = Number.isFinite;
const intrinsic = e => e.operation === 'set' && /^(?:[\d.]+ - [\d.]+ Physical Damage|[\d.]+ Critical Strike Rating|[\d.]+ Attack Speed)$/u.test(e.sourceText);

// Derived on every calculation, never persisted over the original or over the
// user's encounter inputs. Old manual-only documents keep their existing path.
export function seasonWeaponProfile(build, slotIndex = 0) {
  const slots = build?.gear?.slots ?? [];
  const enabled = build?.patchSnapshot?.season === 'SS14' && Boolean(slots[0]?.itemId || slots[1]?.itemId
    || Object.hasOwn(build?.ss14Inputs?.selections?.gear ?? {}, 0));
  const result = { enabled, supported: false, slotIndex, itemId: slots[slotIndex]?.itemId, values: {}, blockers: [], receipts: [] };
  if (!enabled) return result;
  const fail = reason => { result.blockers.push(reason); return result; };
  const slot = slots[slotIndex], record = getSeasonSelectionRecord('gear', slot?.itemId);
  const binding = build.ss14Inputs?.gear?.[slotIndex];
  if (!slot?.itemId) return fail('공격에 사용할 메인 무기를 선택하세요. 이전 무기 수치를 재사용하지 않습니다.');
  if (!record || binding?.itemId !== slot.itemId || binding.sourcePageSha256 !== record.sourcePageSha256)
    return fail('선택 무기의 SS14 기본 수치 근거를 확인할 수 없습니다.');
  result.receipts.push({ season: 'SS14', sourceUrl: record.sourceUrl, sourcePageSha256: record.sourcePageSha256 });
  if (slot.corrupted || slot.affixText?.trim() || Object.keys(slot.crafts ?? {}).length || slot.legendaryDraft?.corrodedSlotIds?.length)
    return fail('무기의 제작 등 추가 변경을 SS14 수치로 확인해야 합니다.');
  const parsed = normalizeSeasonGearEffects(parseTlidbGearTooltip({ id: slot.itemId, categoryId: 'gear', tlidbText: { en: {
    ...record, sourcePageVersion: 'SS14', sourceFieldStatus: { detail: 'exact' },
  } } }, { season: 'SS14', flavorReceipt: record.flavorReceipt }));
  let effects = parsed.effects.map(e => ({ ...e, value: e.roll
    ? finite(binding.rolls?.[e.roll.key]) && binding.rolls[e.roll.key] >= e.roll.min && binding.rolls[e.roll.key] <= e.roll.max
      ? binding.rolls[e.roll.key] : null : e.value }));
  if (binding.logGear) {
    const log = inspectLogGear(slot.itemId, binding.logGear, build, slotIndex);
    if (log.status !== 'mapped') return fail('로그의 무기 옵션 수치·근거를 모두 확인해야 합니다.');
    // The log option table omits the card's intrinsic weapon stats. Add only
    // those base lines, never the card's default affixes over logged affixes.
    const loggedBase = log.rawEffects.filter(intrinsic);
    effects = [...parsed.effects.filter(e => intrinsic(e) && !loggedBase.some(b => b.stat === e.stat)), ...log.rawEffects];
    result.receipts.push(log.receipt);
  } else {
    const conditional = resolveSeasonGearConditions(effects, build, {
      path: `gear.slots.${slotIndex}.${slot.itemId}.conditions`, sourcePageSha256: record.sourcePageSha256 });
    if (conditional.blockers.some(b => effects.some(e => e.sourceText === b.sourceText && SEASON_LOCAL_WEAPON_STATS.has(e.stat))))
      return fail('무기 자체 옵션의 적용 조건을 선택하세요.');
    effects = conditional.effects;
  }
  const local = effects.filter(e => SEASON_LOCAL_WEAPON_STATS.has(e.stat));
  if (local.some(e => !finite(e.value) || e.condition || e.conditionRequirements || e.target || e.per))
    return fail('무기 자체 옵션 수치를 선택하세요. 범위의 최솟값이나 최댓값을 임의로 적용하지 않습니다.');
  const scalar = (baseStat, modifierStat, label, maximum) => {
    const bases = local.filter(e => e.stat === baseStat && intrinsic(e));
    const modifiers = local.filter(e => e.stat === modifierStat && !intrinsic(e));
    const fixed = local.filter(e => e.stat === baseStat && !intrinsic(e) && e.operation === 'set')
      .concat(modifiers.filter(e => e.operation === 'set'));
    if (bases.length !== 1 || fixed.length > 1 || modifiers.some(e => !['set', 'add', 'add_percent', 'more', 'more_percent'].includes(e.operation))) {
      result.blockers.push(`무기 ${label}의 기본값·연산을 확인할 수 없습니다.`); return null;
    }
    const value = fixed.length ? fixed[0].value : (bases[0].value + modifiers.filter(e => e.operation === 'add').reduce((n, e) => n + e.value, 0))
      * (1 + modifiers.filter(e => e.operation === 'add_percent').reduce((n, e) => n + e.value, 0) / 100)
      * modifiers.filter(e => ['more', 'more_percent'].includes(e.operation)).reduce((n, e) => n * (1 + e.value / 100), 1);
    if (!finite(value) || value < 0 || value > maximum) { result.blockers.push(`무기 ${label}의 계산 범위를 확인하세요.`); return null; }
    return value;
  };
  const damage = (type, side) => {
    const stat = `gear_${type}_damage_${side}`;
    const bases = local.filter(e => e.stat === stat && e.operation === 'set');
    const flat = local.filter(e => e.stat === stat && e.operation === 'add');
    const modifiers = local.filter(e => e.stat === `gear_${type}_damage` || ['fire', 'cold', 'lightning'].includes(type) && e.stat === 'gear_elemental_damage');
    if ((type === 'physical' ? bases.length !== 1 : bases.length > 1) || local.some(e => e.stat === stat && !['set', 'add'].includes(e.operation))
      || modifiers.some(e => !['add_percent', 'more', 'more_percent'].includes(e.operation))) {
      result.blockers.push('무기 기본 대미지 또는 자체 보정 연산을 확인할 수 없습니다.'); return null;
    }
    return ((bases[0]?.value ?? 0) + flat.reduce((n, e) => n + e.value, 0))
      * (1 + modifiers.filter(e => e.operation === 'add_percent').reduce((n, e) => n + e.value, 0) / 100)
      * modifiers.filter(e => ['more', 'more_percent'].includes(e.operation)).reduce((n, e) => n * (1 + e.value / 100), 1);
  };
  result.values = { weaponSpeed: scalar('weapon_attack_speed', 'gear_attack_speed', '공격 속도', 20),
    baseCriticalRating: scalar('weapon_critical_strike_rating', 'gear_attack_critical_strike_rating', '크리티컬 수치', 100000) };
  for (const type of ['physical', 'fire', 'cold', 'lightning', 'erosion']) for (const side of ['Min', 'Max']) result.values[`weapon${type}${side}`] = damage(type, side.toLowerCase());
  if (result.values.weaponSpeed === 0 || ['physical', 'fire', 'cold', 'lightning', 'erosion'].some(type =>
    result.values[`weapon${type}Min`] > result.values[`weapon${type}Max`]
    || ['Min', 'Max'].some(side => { const value = result.values[`weapon${type}${side}`]; return !finite(value) || value < 0 || value > 1e9; })))
    result.blockers.push('무기 대미지·공격 속도의 유효 범위를 확인하세요.');
  if (slotIndex === 0 && slots[1]?.itemId) {
    const offhand = findItemById(slots[1].itemId);
    if (offhand?.tags?.includes('mainHand')) result.blockers.push('쌍수의 무기별 적중·크리티컬 결합은 아직 미지원입니다. 무기 평균값으로 대체하지 않습니다.');
    else if (!offhand?.tags?.includes('offHand')) result.blockers.push('서브 무기 칸의 무기·방패 구분을 확인할 수 없습니다.');
    if (findItemById(slot.itemId)?.tags?.includes('twoHand')) result.blockers.push('양손 무기와 서브 무기를 동시에 사용할 수 없습니다.');
  }
  result.blockers = [...new Set(result.blockers)];
  result.supported = result.blockers.length === 0;
  return result;
}
