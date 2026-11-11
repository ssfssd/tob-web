import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';

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
export function seasonDamageContext(build, index, id) {
  const stored = build?.ss14Inputs?.dps?.skills?.[index];
  const b = stored?.itemId === id && stored.sourcePageSha256 === SS14_CARDS_EN.records[id]?.sourcePageSha256 ? stored : {};
  const attack = SS14_CARDS_EN.records[id]?.tags?.includes('Attack');
  const weapon = attack ? seasonWeaponProfile(build) : null;
  const values = weapon?.enabled ? weapon.supported ? weapon.values : {} : b;
  const valid = key => Number.isFinite(values[key]) && values[key] >= 0 && values[key] <= 1e9;
  const context = {};
  if (attack && Object.keys(types).every(type => valid(`weapon${type}Min`) && valid(`weapon${type}Max`) && values[`weapon${type}Min`] <= values[`weapon${type}Max`])
    && Number.isFinite(values.weaponSpeed) && values.weaponSpeed > 0 && values.weaponSpeed <= 20) {
    context.weaponDamage = Object.fromEntries(Object.keys(types)
      .filter(type => !weapon?.enabled || type === 'physical' || values[`weapon${type}Max`] > 0)
      .map(type => [type, { min: values[`weapon${type}Min`], max: values[`weapon${type}Max`] }]));
    context.attackSpeed = values.weaponSpeed;
    context.attackTime = 1 / values.weaponSpeed;
  }
  if (Number.isFinite(b.addedLightningMin) && b.addedLightningMin >= 0 && Number.isFinite(b.addedLightningMax) && b.addedLightningMax <= 1e9 && b.addedLightningMin <= b.addedLightningMax)
    context.addedDamage = { lightning: { min: b.addedLightningMin, max: b.addedLightningMax } };
  return context;
}
