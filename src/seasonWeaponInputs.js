import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { findItemById } from './catalog.js';

export const DUAL_WIELD_ATTACK_SOURCE = 'https://tlidb.com/en/Attack';

const types = { physical: "물리", fire: "화염", cold: "냉기", lightning: "번개", erosion: "부식" };
export const WEAPON_FIELDS = Object.fromEntries([
  ["weaponSpeed", { label: "보정 전 무기 초당 공격 횟수", min: .01, max: 20 }],
  ...Object.entries(types).flatMap(([type, label]) => ["Min", "Max"].map(side => [`weapon${type}${side}`, {
    label: `무기 자체 ${label} ${side === "Min" ? "최소" : "최대"} 대미지 (없으면 0)`, min: 0, max: 1e9,
  }])),
]);
export const ADDED_FIELDS = Object.fromEntries(["Min", "Max"].map(side => [`addedLightning${side}`, {
  label: `스킬 효과 적용 전 추가 번개 ${side === "Min" ? "최소" : "최대"} 대미지 (없으면 0)`, min: 0, max: 1e9,
}]));
export const ADDED_LIGHTNING_RANGE_ISSUE = '추가 번개 대미지의 최소·최대 값을 모두 확인하세요.';

// Absent input is optional. A partially entered or inverted range is unresolved.
export function manualAddedLightningRange(binding) {
  const min = binding?.addedLightningMin;
  const max = binding?.addedLightningMax;
  if (min === undefined && max === undefined) return undefined;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > ADDED_FIELDS.addedLightningMax.max || min > max) return null;
  return { min, max };
}

export function seasonDamageContext(build, index, id) {
  const stored = build?.ss14Inputs?.dps?.skills?.[index];
  const b = stored?.itemId === id && stored.sourcePageSha256 === SS14_CARDS_EN.records[id]?.sourcePageSha256 ? stored : {};
  const attack = SS14_CARDS_EN.records[id]?.tags?.includes('Attack');
  const weapon = attack ? seasonWeaponProfile(build) : null;
  const offhandTags = findItemById(build?.gear?.slots?.[1]?.itemId)?.tags;
  const card = SS14_CARDS_EN.records[id];
  const usesAlternation = card?.sourceRecordKey === 'Moon_Strike' || card?.sourceRecordKey === 'Blade_of_Glory'
    && /\nDetails\nBlade of Glory:\nDeals Attack Physical Damage equal to [\d.]+% of Base Damage$/u.test(card.detail);
  const canAlternate = weapon?.enabled && usesAlternation
    && card.sourceSeasonEvidence?.actualSeason === 14 && card.sourceSeasonEvidence.verificationComplete
    && offhandTags?.includes('mainHand') && !offhandTags.includes('twoHand');
  const hands = canAlternate ? [0,1].map(slotIndex => seasonWeaponProfile(build,slotIndex,{individual:true})) : [];
  const alternating = hands.length === 2 && hands.every(hand=>hand.supported);
  const values = alternating ? hands[0].values : weapon?.enabled ? weapon.supported ? weapon.values : {} : b;
  const valid = key => Number.isFinite(values[key]) && values[key] >= 0 && values[key] <= 1e9;
  const context = {};
  if (attack && Object.keys(types).every(type => valid(`weapon${type}Min`) && valid(`weapon${type}Max`) && values[`weapon${type}Min`] <= values[`weapon${type}Max`])
    && Number.isFinite(values.weaponSpeed) && values.weaponSpeed > 0 && values.weaponSpeed <= 20) {
    const weaponDamage = stats => Object.fromEntries(Object.keys(types)
      .filter(type => !weapon?.enabled || type === 'physical' || stats[`weapon${type}Max`] > 0)
      .map(type => [type, { min: stats[`weapon${type}Min`], max: stats[`weapon${type}Max`] }]));
    context.weaponDamage = weaponDamage(values);
    context.attackSpeed = alternating ? (hands[0].values.weaponSpeed+hands[1].values.weaponSpeed)/2 : values.weaponSpeed;
    context.attackTime = 1 / context.attackSpeed;
    if (alternating) context.weaponHands = hands.map(hand=>({ slotIndex:hand.slotIndex, weaponDamage:weaponDamage(hand.values),
      weaponSpeedBase:hand.weaponSpeedBase, weaponSpeed:hand.values.weaponSpeed,
      baseCriticalRating:hand.values.baseCriticalRating, receipts:hand.receipts }));
  }
  const lightning = manualAddedLightningRange(b);
  if (lightning) context.addedDamage = { lightning };
  return context;
}
