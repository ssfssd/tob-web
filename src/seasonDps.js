import { SS14_DPS_RULES } from "./data/ss14DpsRules.generated.js";
import { logReviewRows } from "./seasonLogReview.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { bingRecovery } from "./seasonBingRecovery.js";
import { SEASON_LOCAL_WEAPON_STATS, SEASON_GLOBAL_FLAT_STATS, SEASON_GEAR_LEVEL_STATS, SEASON_GEAR_COST_STATS, SEASON_GEAR_NUMBED_STATS, SEASON_GEAR_NUMBED_MODIFIERS, SEASON_DEFENSIVE_STATS, fixedSeasonErosionResistance, isSeasonTargetDamageTaken, seasonMinionDamageConversion, seasonOutgoingDamageConversion } from "./seasonGearEffects.js";
import { SS14_GEAR_EN } from './data/ss14Gear.en.generated.js';
import { SEASON_BLESSING_CAP_STATS } from './seasonBlessings.js';
import { SEASON_CURSE_STATS } from './seasonCurseEffects.js';
import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { seasonDirectDamageStat, seasonDpsSpecialStat } from "./seasonCoupledCalculation.js";
import { findItemById } from "./catalog.js";
import { mechanicPage, seasonMechanicPins } from "./seasonMechanicInputs.js";
import { SEASON_MINION_FIELDS, seasonMinionFieldKeys, seasonMinionProfile, seasonSyntheticTroopMapCap, seasonObservedCommandSlot, calculateSeasonMinion } from "./seasonMinions.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";
import { theaState } from "./seasonTheaState.js";
import { WEAPON_FIELDS, ADDED_FIELDS, manualAddedLightningRange, seasonDamageContext } from "./seasonWeaponInputs.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { MODULE_FIELDS, seasonModuleProfile, seasonModuleFieldKeys, calculateSeasonModule, isPersistentModuleAction } from "./seasonModules.js";
import { checkSeasonSupportHost, validLunarEclipseLink, ICE_PERMAFROST_ID, MOON_LUNAR_RING_ID, MOON_WAX_AND_WANE_ID, VOLTAGE_TURMOIL_ID, VOLTAGE_AFTERWAVE_ID } from "./seasonSupport.js";
import { MOON_STRIKE_ID, voltageAverageFields, VOLTAGE_AFTERWAVE_CHARGES } from "./seasonSkillMechanics.js";
import { NETHER_CONSUMED_STATS, SEASON_SKILL_AILMENT_TAGS, netherMore, netherAfflictionEffect } from './seasonNetherRemaining.js';
import { netherCorePlan } from './seasonNetherDps.js';
import { FIXED_NUMBED_FIELD, isNumbedBaseOverride } from './seasonNetherModifiers.js';
import { seasonSupportManaMultiplier } from './seasonSkillLevels.js';
import { isObservedTerraGearEffect } from "./seasonGearEffects.js";
import { PERIODIC_BURST_INPUT, readPeriodicBurstUptime, writePeriodicBurstUptime } from './seasonSkillInputs.js';

const finite = Number.isFinite;
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const hash = v => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const round = v => finite(v) ? Math.round(v * 1e5) / 1e5 : null;
const wiltingBeamId = "skills-tlidb-com-cn-wilting-beam";
export function seasonNumbedDamageRows(scope, values) {
  const prefix=scope==='ss14-thea-joint-combat'?'numbed':'fixedNumbed';
  return [['번개 적중','HitDps'],['번개 지속 대미지','DotDps'],['번개 수확','ReapingDps'],['소환체 번개 대미지','MinionDps']]
    .flatMap(([label,key])=>finite(values[prefix+key])&&values[prefix+key]>0?[[label,values[prefix+key]]]:[]);
}
export const FROST_TERRA_ID = "skills-tlidb-com-cn-frost-terra";
export function frostTerraUptimeField(slot) {
  if (slot?.skillId === FROST_TERRA_ID) return "dotUptime";
  if (slot?.supports?.[4]?.supportId === ICE_PERMAFROST_ID) return "permafrostUptime";
  return null;
}
const voltageAverageKey = (build,index) => build?.skills?.active?.[index]?.supports?.[4]?.supportId===VOLTAGE_TURMOIL_ID
  ? 'voltageTurmoilAverage' : 'voltageAverage';
export const SEASON_DPS_ENEMY_FIELDS = {
  armor: { label: "적 아머", min: 0, max: 10000000 },
  fire: { label: "적 유효 화염 저항 (%)", min: -200, max: 90 },
  cold: { label: "적 유효 냉기 저항 (%)", min: -200, max: 90 },
  lightning: { label: "적 유효 번개 저항 (%)", min: -200, max: 90 },
  erosion: { label: "적 유효 부식 저항 (%)", min: -200, max: 90 },
  affliction: { label: "적 심화 수치", min: 0, max: 100 },
  numbedStacks: FIXED_NUMBED_FIELD,
};
export function seasonDpsEnemyFieldDefinition(build, key) {
  const field = SEASON_DPS_ENEMY_FIELDS[key];
  if (key === 'affliction' && theaCombatEnabled(build) && build.ss14Inputs.theaCycle?.mode === 'automatic')
    return { ...field, label: '전투 시작 시 적 심화 수치' };
  return field;
}
export const SEASON_DPS_SKILL_FIELDS = {
  ...WEAPON_FIELDS, ...ADDED_FIELDS,
  ...SEASON_MINION_FIELDS,
  ...MODULE_FIELDS,
  useShare: { label: "시전 시간 배분 (%)", min: 0, max: 100 },
  hitChance: { label: "대상 적중률 (%)", min: 0, max: 100 },
  castRate: { label: "초당 일반 시전 횟수", min: 0, max: 100 },
  summonCastRate: { label: "초당 직접 소환 횟수", min: 0, max: 100 },
  moonBaseManaCost: { label: "문 스트라이크 보정 전 MP 소모량", min: 0, max: 1000000,
    hint: "현재 최대 MP에 해당하는 값입니다. 보조·장비의 소모 배율은 계산에서 따로 적용합니다." },
  observedFinalManaCost: { label: '관측한 1회 MP 소모', min:0, max:1000000 },
  observedFinalLifeCost: { label: '관측한 1회 HP 소모', min:0, max:1000000 },
  moonRingHitChance: { label: '문링 환형 공격 적중률 (%)', min:0, max:100,
    hint:'비워두면 대상 적중률을 사용합니다.' },
  moonNormalMainShare: { label: '일반 공격의 메인 무기 관측 비중 (%)', min:0, max:100 },
  moonBurstMainShare: { label: '매직 버스트의 메인 무기 관측 비중 (%)', min:0, max:100,
    hint:'버스트를 연 첫 공격과 추가 공격을 모두 포함합니다.' },
  multistrikeChance: { label: "연속 공격 확률 (%)", min: 0, max: 1000 },
  multistrikeIncrement: { label: "계시 보너스 전 연속 공격 대미지 증가량 (%)", min: 0, max: 1000 },
  resourceAttacks: { label: "자원이 허용하는 연속 공격 수 (0은 제한 없음)", min: 0, max: 100, integer: true },
  movementAttacks: { label: "이동·다른 행동 전 연속 공격 수 (0은 중단 없음)", min: 0, max: 100, integer: true },
  repeatHits: { label: "처치 재발동의 대상 적중 횟수 (초당)", min: 0, max: 1000 },
  dotUptime: { label: "지속 대미지 유지율 (%)", min: 0, max: 100 },
  permafrostUptime: { label: '동토 지속 대미지 유지율 (%)', min:0, max:100,
    hint:'전체 전투에서 동토가 대상에게 대미지를 준 시간의 비율입니다. 직접 시전한 지면과 겹친 시간은 대미지가 적용된 쪽에만 넣으세요.' },
  permafrostCharge: { label: '동토 발동 시 소모한 지면 에너지 축적', min:0, max:1, integer:true,
    choices:[[0,'0회'],[1,'1회']] },
  reapingMode: { label: "수확 계산 방식", min: 0, max: 1, integer: true, defaultValue: 0,
    choices: [[0, "관측값 입력"], [1, "한 대상 연속 채널링"]] },
  reapingRate: { label: "대상 수확 성공 횟수 (초당)", min: 0, max: 1000 },
  reapingTimes: { label: "대상 수확 성공 시각 (초)", times: true,
    hint: "준비 시간부터 센 시각을 입력하세요. 수확에 성공한 적이 없으면 ‘없음’을 입력하세요." },
  channelCostRate: { label: "채널링 비용 차감 횟수 (초당)", min: 0, max: 30 },
  channelCostTimes: { label: "채널링 비용 차감 시각 (초)", times: true,
    hint: "준비 시작을 0초로 두고 실제 차감 시각을 쉼표로 입력하세요. 입력하면 초당 횟수 대신 사용합니다. 차감이 없으면 ‘없음’을 입력하세요." },
  reapingOverlap: { label: "수확 시 이 지속 대미지 적용 비율 (%)", min: 0, max: 100 },
  dotWindows: { label: "지속 대미지 적용 구간 (초)", windows: true,
    hint: "준비 시간부터 센 구간을 0-2, 4-6처럼 입력하세요. 적용 구간이 없으면 ‘없음’을 입력하세요." },
  dotExclusive: { label: "겹친 시간은 대미지가 적용된 한 칸에만 배정", min: 0, max: 1, integer: true, choices: [[0, "미확인"], [1, "확인"]] },
  additionalChannelStacks: { label: "기본값보다 추가된 최대 집중 중첩", min: 0, max: 100, integer: true },
  terraCharges: { label: "이번 시전에 소모한 대지 충전", min: 0, max: VOLTAGE_AFTERWAVE_CHARGES, integer: true },
  afterwaveOverlap: { label: "잔파 고리의 지속 대미지 적용", min:0, max:1, integer:true,
    choices:[[0,'한 번만 적용'],[1,'동시에 따로 적용']],
    hint:'기본 또는 추가 고리에서 대미지가 적용된 시간을 지속 대미지 유지율에 입력하세요.' },
  ...voltageAverageFields,
  euphoria: { label: "해당 스킬의 버프 적용 여부 (0 또는 1)", min: 0, max: 1, integer: true },
  swampMoved: { label: "현재 늪이 이동 보너스를 보유함 (0 또는 1)", min: 0, max: 1, integer: true },
  recentSpellProjectiles: { label: "최근 생성한 주술 투사체 수", min: 0, max: 10000, integer: true },
  periodicBurstUptime: { label: "간헐적 폭발 현재 상태", shared: true, min: 0, max: 100, choices: [[0, "미적용"], [100, "적용"]] },
  incomingHits: { label: "반사를 유발하는 피격 횟수 / 초", min: 0, max: 1000 },
  coreTriggerRate: { label: "코어 전체 주술 발동 횟수 / 초", min: 0, max: 1000 },
  coreUptime: { label: "클락워크 코어 유지율 (%)", min: 0, max: 100 },
  chainActive: { label: "계산 대상에 노예의 사슬 적용", min: 0, max: 1, integer: true, choices: [[0, "미적용"], [1, "적용"]] },
  extraHits: { label: "대지 이동으로 실제 적중한 추가 폭발 (초당)", min: 0, max: 1000 },
  fissureHits: { label: "균열 후속 적중 횟수 (초당)", min: 0, max: 30 },
  fissureTimes: { label: "균열 후속 적중 시각 (초)", times: true },
};

export const observedSkillCostFields=['observedFinalManaCost','observedFinalLifeCost'];
const validObservedSkillCostBasis=value=>typeof value==='string'&&value.length>0&&value.length<=8192;

const buildSkillInputKeys = new Set([
  'itemId', 'sourcePageSha256', ...Object.keys(WEAPON_FIELDS), ...Object.keys(ADDED_FIELDS),
  'moonBaseManaCost', 'multistrikeChance', 'multistrikeIncrement', 'additionalChannelStacks',
  'minionBaseMin', 'minionBaseMax', 'minionCriticalRating', 'moduleIgniteBaseMin', 'moduleIgniteBaseMax',
  'moduleSkillAreaBonus', 'moduleProjectileSpeedBonus', 'moduleSteepStrike', 'moduleFrostbiteBonus',
]);
const skillConditionKeys = binding => Object.keys(binding).filter(key => !buildSkillInputKeys.has(key));

export function hasSeasonDpsConditionOverrides(dps) {
  return !!dps && (Object.keys(dps.enemy).length > 0
    || readPeriodicBurstUptime(dps)!==undefined
    || Object.values(dps.skills).some(binding => skillConditionKeys(binding).length > 0));
}

export function clearSeasonDpsConditionOverrides(dps) {
  if (!dps) return;
  dps.enemy = {};
  writePeriodicBurstUptime(dps,'');
  for (const binding of Object.values(dps.skills)) {
    for (const key of skillConditionKeys(binding)) delete binding[key];
  }
}

export function seasonDpsSkillFieldDefinition(id,key,terraChargeMaximum=1) {
  const definition=SEASON_DPS_SKILL_FIELDS[key];
  if(key==='terraCharges')return {...definition,max:terraChargeMaximum};
  const rate=/^moduleRate([01])$/u.exec(key);
  if (rate && isPersistentModuleAction(seasonModuleProfile(id)?.actions[Number(rate[1])]))
    return {...definition,label:'대상에게 모듈 지속 대미지가 적용되는 비율 (0~1)',max:1};
  return definition;
}
function dotWindowRanges(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) return null;
  if (value.trim() === '없음') return [];
  const parts = value.split(',');
  if (parts.length > 100) return null;
  const ranges = [];
  for (const line of parts) {
    const match = /^\s*(\d+(?:\.\d{1,3})?)\s*-\s*(\d+(?:\.\d{1,3})?)\s*$/u.exec(line);
    if (!match || +match[1] >= +match[2] || +match[2] > 3600) return null;
    ranges.push([+match[1], +match[2]]);
  }
  return ranges.sort((a,b)=>a[0]-b[0]);
}
function continuousDotWindows(value) {
  const ranges = dotWindowRanges(value);
  if (!ranges) return null;
  const merged = [];
  for (const [start, stop] of ranges) {
    const previous = merged.at(-1);
    // Touching ranges in one slot have no intervening inactive time.
    if (previous?.[1] === start) previous[1] = stop;
    else merged.push([start, stop]);
  }
  return merged;
}
export function seasonDotWindowAssignment(build, conflict, winner) {
  if (!conflict?.slots.includes(winner)) return null;
  const loser = conflict.slots.find(slot => slot !== winner);
  const ranges = dotWindowRanges(build.ss14Inputs.dps?.skills?.[loser]?.dotWindows);
  if (!ranges) return null;
  const {start,stop} = conflict;
  const remaining = ranges.flatMap(([from,to]) => to <= start || from >= stop ? [[from,to]]
    : [[from,Math.min(to,start)],[Math.max(from,stop),to]].filter(([a,b])=>a<b));
  const value = remaining.length ? remaining.map(range=>range.join('-')).join(', ') : '없음';
  return dotWindowRanges(value) ? {kind:'dps-input',key:`${loser}:dotWindows`,value} : null;
}
function observedTimeList(value) {
  if (typeof value !== 'string' || value.length > 4096) return null;
  if (value.trim() === '없음') return [];
  const entries = value.split(',');
  if (entries.length > 100 || entries.some(entry => !/^\s*\d+(?:\.\d{1,3})?\s*$/u.test(entry))) return null;
  const times = entries.map(Number);
  if (times.some(time => time <= 0 || time >= 3600) || new Set(times).size !== times.length) return null;
  return times.sort((a,b)=>a-b);
}
const timedFissure = build => theaCombatEnabled(build) && build?.ss14Inputs?.theaCycle?.mode === 'automatic';
const validValue = (field, value) => field && (field.windows ? !!dotWindowRanges(value) : field.times ? !!observedTimeList(value)
  : typeof value === "number" && finite(value) && value >= field.min && value <= field.max && (!field.integer || Number.isInteger(value)) && (!field.choices || field.choices.some(([v]) => v === value)));
export function seasonDpsSkillFieldKeys(entry, id, build) {
  const slots = build?.skills?.active;
  const index = entry?.rowIndex ?? slots?.findIndex(s => s?.skillId === id);
  const module = seasonModuleProfile(id), minion = seasonMinionProfile(id);
  if (module || minion) {
    const owner = seasonObservedCommandSlot(build);
    const fields = module ? seasonModuleFieldKeys(module, slots?.[index]?.modularization?.moduleOptionIds, build, build?.ss14Inputs?.dps?.skills?.[index])
      : ["useShare", "hitChance", ...seasonMinionFieldKeys(minion)].filter(key=>key!=="command" || owner<0 || index===owner);
    if (build?.ss14Inputs?.dps?.skills?.[index]?.useShare > 0) fields.push('summonCastRate');
    return module && owner>=0 && index===owner ? [...fields,"command"] : fields;
  }
  const reapingOnly = entry?.damageCapabilities?.dot && !entry.damageCapabilities.hit
    && entry.mechanics?.some(m => m.kind === "wilting-beam-reaping");
  const keys = ["useShare", ...(reapingOnly ? [] : ["hitChance"])];
  if (index === 0) {
    if (build?.gear?.slots?.some(s => s?.itemId === "gear-ss14-on-the-sublime")) keys.push("recentSpellProjectiles");
    if (build?.gear?.slots?.some(s => s?.itemId === "gear-tlidb-com-cn-glorious-journey")) keys.push("incomingHits");
    if (build?.skills?.active?.[0]?.supports?.some(s => s?.supportId === "supports-ss14-clockwork-core")) keys.push("coreTriggerRate", "coreUptime", "chainActive");
  }
  if (SS14_CARDS_EN.records[id]?.tags?.includes("Attack") && !seasonWeaponProfile(build).enabled) keys.push(...Object.keys(WEAPON_FIELDS));
  if (id===MOON_STRIKE_ID && !validLunarEclipseLink(build,index,4)) keys.push('moonBaseManaCost');
  if (id===MOON_STRIKE_ID && slots?.[index]?.supports?.[2]?.supportId===MOON_LUNAR_RING_ID) keys.push('moonRingHitChance');
  if (slots?.[index]?.supports?.[4]?.supportId===ICE_PERMAFROST_ID) {
    const binding = build.ss14Inputs?.dps?.skills?.[index];
    const timed = timedFissure(build);
    keys.push(timed ? 'dotWindows' : 'permafrostUptime');
    if(timed ? dotWindowRanges(binding?.dotWindows)?.length : binding?.permafrostUptime>0) {
      keys.push('permafrostCharge');
      if (!timed && slots.some((slot, i) => slot?.skillId === wiltingBeamId
        && build.ss14Inputs?.dps?.skills?.[i]?.reapingRate > 0)) keys.push('reapingOverlap');
    }
  }
  if (id===MOON_STRIKE_ID && slots?.[index]?.supports?.[4]?.supportId===MOON_WAX_AND_WANE_ID) {
    const hands=seasonDamageContext(build,index,id).weaponHands;
    if (hands?.length===2 && (hands[0].baseCriticalRating!==hands[1].baseCriticalRating
      || JSON.stringify(hands[0].weaponDamage)!==JSON.stringify(hands[1].weaponDamage)))
      keys.push('moonNormalMainShare','moonBurstMainShare');
  }
  const complexCombat = theaCombatEnabled(build);
  if (complexCombat) {
    keys.push("castRate");
    if (SS14_CARDS_EN.records[id]?.tags?.includes("Attack")) keys.push("multistrikeChance", "multistrikeIncrement", "resourceAttacks", "movementAttacks");
  }
  if (complexCombat || manualAddedLightningRange(build?.ss14Inputs?.dps?.skills?.[index]) !== undefined)
    keys.push(...Object.keys(ADDED_FIELDS));
  if (entry?.mechanics?.some(m => m.kind === "ice-ring-on-kill")) keys.push("repeatHits");
  if (entry?.damageCapabilities?.dot || /Persistent [A-Za-z]+ [Dd]amage/u.test(SS14_CARDS_EN.records[id]?.detail ?? "")) {
    keys.push("dotUptime");
    const bindings = build?.ss14Inputs?.dps?.skills;
    if (id !== wiltingBeamId && !timedFissure(build) && slots?.some((slot, i) => slot?.skillId === wiltingBeamId && bindings?.[i]?.reapingRate > 0))
      keys.push("reapingOverlap");
    if (theaCombatEnabled(build) && build?.ss14Inputs?.theaCycle?.mode === "automatic") keys.push("dotWindows");
    if (id !== FROST_TERRA_ID && build?.ss14Inputs?.theaCycle?.mode !== "automatic" && bindings?.[index]?.dotUptime > 0
      && slots?.some((slot, i) => i !== index && slot?.skillId === id && bindings[i]?.dotUptime > 0)) keys.push("dotExclusive");
  }
  const frostField = frostTerraUptimeField(slots?.[index]);
  const bindings = build?.ss14Inputs?.dps?.skills;
  if (frostField && keys.includes(frostField) && build?.ss14Inputs?.theaCycle?.mode !== "automatic"
    && bindings?.[index]?.[frostField] > 0 && slots.some((slot, i) => {
      const field = frostTerraUptimeField(slot);
      return i !== index && field && bindings[i]?.[field] > 0;
    })) keys.push("dotExclusive");
  keys.push(...(entry?.mechanics ?? []).map(m => m.kind === 'groundshaker-fissure' && timedFissure(build) ? 'fissureTimes'
    : m.kind==='voltage-observed-average' ? voltageAverageKey(build,index) : m.field).filter(Boolean));
  if(slots?.[index]?.supports?.[4]?.supportId===VOLTAGE_AFTERWAVE_ID
    && build?.ss14Inputs?.dps?.skills?.[index]?.terraCharges>=VOLTAGE_AFTERWAVE_CHARGES) keys.push('afterwaveOverlap');
  if (reapingOnly) {
    const rateIndex = keys.indexOf("reapingRate");
    const continuous = build?.ss14Inputs?.dps?.skills?.[index]?.reapingMode === 1;
    if (timedFissure(build)) keys.splice(rateIndex,1,"reapingTimes");
    else keys.splice(rateIndex, continuous ? 1 : 0, "reapingMode");
  }
  if ((build?.ss14Inputs?.theaCycle?.mode !== "automatic" || theaCombatEnabled(build))
    && build?.ss14Inputs?.dps?.skills?.[index]?.useShare !== 0
    && SS14_CARDS_EN.records[id]?.tags?.some(tag=>tag==='Channeled'||tag==='Channel')) {
    keys.push("channelCostRate");
    if (timedFissure(build)) keys.push("channelCostTimes");
  }
  return [...new Set(keys)];
}
export const seasonDpsRulePins = () => Object.fromEntries(Object.values(SS14_DPS_RULES.pages).filter(p => p.locale === "en").map(p => [p.sourceUrl, p.sourcePageSha256]));

export function validSeasonDpsInputs(inputs) {
  if (inputs.dps !== undefined) {
    const d = inputs.dps;
    if (!object(d) || d.version !== 1 || Object.keys(d).some(k => !["version", "enemy", "skills", "periodicBurstUptime"].includes(k))
      || Object.hasOwn(d,'periodicBurstUptime') && !validValue(SEASON_DPS_SKILL_FIELDS.periodicBurstUptime,d.periodicBurstUptime)
      || !object(d.enemy) || !object(d.skills) || !Object.entries(d.enemy).every(([k, v]) => validValue(SEASON_DPS_ENEMY_FIELDS[k], v))) return false;
    for (const [key, b] of Object.entries(d.skills)) {
      if (!/^[0-8]$/u.test(key) || !object(b) || typeof b.itemId !== "string" || !hash(b.sourcePageSha256)
        || !Object.entries(b).every(([k, v]) => ["itemId", "sourcePageSha256"].includes(k)
          || (k==='observedSkillCostBasis' ? validObservedSkillCostBasis(v) : validValue(SEASON_DPS_SKILL_FIELDS[k], v)))
        || observedSkillCostFields.some(field=>Object.hasOwn(b,field))!==Object.hasOwn(b,'observedSkillCostBasis')) return false;
    }
  }
  return inputs.dpsRuleReceipts === undefined || object(inputs.dpsRuleReceipts)
    && Object.entries(inputs.dpsRuleReceipts).every(([url, value]) => Object.hasOwn(seasonDpsRulePins(), url) && hash(value));
}

export function editSeasonDpsInput(target, key, value) {
  const [slot, field] = String(key).split(":");
  const enemy = slot === "enemy";
  const definition = (enemy ? SEASON_DPS_ENEMY_FIELDS : SEASON_DPS_SKILL_FIELDS)[field];
  if (!definition || value !== "" && !validValue(definition, value) || !enemy && !/^[0-8]$/u.test(slot)
    || !enemy && field==='periodicBurstUptime' && key!==PERIODIC_BURST_INPUT) throw new Error("DPS 입력의 항목과 표시 범위를 확인하세요.");
  const inputs = target.ss14Inputs;
  if (value === "" && inputs.dps === undefined) return;
  inputs.dps ??= { version: 1, enemy: {}, skills: {} };
  let binding = inputs.dps.enemy;
  const periodicBurst=key===PERIODIC_BURST_INPUT;
  if (periodicBurst) writePeriodicBurstUptime(inputs.dps,value);
  else if (!enemy) {
    const index = Number(slot); const skill = index < 5 ? target.skills.active[index] : target.skills.passive[index - 5];
    const record = SS14_CARDS_EN.records[skill?.skillId];
    if (record?.season !== "SS14" || record.status !== "collected-preview") throw new Error("SS14 원문이 연결된 스킬을 먼저 선택하세요.");
    const old = inputs.dps.skills[slot];
    binding = old?.itemId === skill.skillId && old.sourcePageSha256 === record.sourcePageSha256 ? old
      : { itemId: skill.skillId, sourcePageSha256: record.sourcePageSha256 };
    inputs.dps.skills[slot] = binding;
    if ((field === 'dotUptime' || field === 'permafrostUptime') && binding[field] !== (value === '' ? undefined : value)) {
      // The confirmation applies to the allocation across these slots.
      const slots = [...target.skills.active, ...target.skills.passive];
      for (const [row, peer] of Object.entries(inputs.dps.skills)) {
        const slot = slots[Number(row)];
        if (slot?.skillId === peer.itemId && (frostTerraUptimeField(skill) && frostTerraUptimeField(slot)
          || field === 'dotUptime' && slot.skillId === skill.skillId)) delete peer.dotExclusive;
      }
    }
  }
  if (!periodicBurst) {
    if (value === "") delete binding[field];
    else if (definition.windows) binding[field] = dotWindowRanges(value).map(range=>range.join('-')).join(', ') || '없음';
    else if (definition.times) binding[field] = observedTimeList(value).join(', ') || '없음';
    else binding[field] = value;
  }
  inputs.dpsRuleReceipts = seasonDpsRulePins();
  inputs.mechanicReceipts = seasonMechanicPins();
}

// Only these independent defensive effects are irrelevant to a fixed, observed
// attack scenario. Unknown effects are never presumed to be defensive.
const defensive = new Set(["max_life_as_energy_shield", "damage_bypasses_energy_shield", "damage_transferred_to_minion", "blur_rating", "blur_avoidance", "elemental_damage_taken", "elemental_ailment_avoidance", "max_frostbite_rating", "cooldown_recovery_speed", "injury_buffer", "max_life", "max_mana", "max_energy_shield", "gear_armor", "gear_evasion", "gear_energy_shield",
  "armor", "evasion", "movement_speed", "projectile_speed", "fire_resistance", "cold_resistance", "lightning_resistance", "erosion_resistance",
  "elemental_resistance", "all_resistance", "max_elemental_resistance", "max_fire_resistance", "max_cold_resistance", "max_lightning_resistance", "max_erosion_resistance",
  "damage_taken", "life_regeneration_flat", "mana_regeneration_flat", "life_regeneration_percent", "mana_regeneration_percent",
  "life_regeneration_speed", "mana_regeneration_speed", "energy_shield_charge_speed", "energy_shield_charge_interval", "attack_block_chance", "spell_block_chance", "block_chance", "block_ratio", "max_block_ratio", "can_evade"]);
const attributes = new Set(["strength", "dexterity", "intelligence", "all_stats", "all_attributes"]);
for(const stat of SEASON_DEFENSIVE_STATS)defensive.add(stat);
const separatelyHandledGear = new Set([...SEASON_GEAR_LEVEL_STATS, "weapon_critical_strike_rating", "weapon_attack_speed", "spell_lightning_damage_min", "spell_lightning_damage_max",
  "spell_projectile_skill_levels", "all_skill_levels", "jump_count", "blessing_duration", "physical_damage_taken"]);
const minionOnly = new Set(["minion_damage", "minion_fire_damage", "minion_lightning_damage", "minion_attack_speed", "minion_cast_speed", "minion_cold_penetration", "minion_fire_penetration", "minion_lightning_penetration", "minion_erosion_penetration", "minion_armor_penetration"]);
const critical = /^(?:(?:attack|spell|projectile|(?:fire|cold|lightning|erosion|physical)_skill)_)?critical_strike_(rating|damage|lucky|unlucky|very_lucky)$/u;
const double = /^(?:(?:attack|spell)_)?double_damage_chance$/u;
const body = (rules, name) => rules.pages[`en/${name}`]?.body ?? "";

export function manualResourceBalance(rows, scenarios, skills) {
  const active=rows.filter(row=>row.rowIndex<5&&(skills?.[row.rowIndex]?.useShare!==0||row.channelCost?.times?.length));
  if(!active.length)return null;
  const shareTotal=active.reduce((total,row)=>total+(skills?.[row.rowIndex]?.useShare??0),0);
  const shareOverflow=shareTotal>100+1e-8;
  const unresolved=active.filter(row=>!finite(row.manualManaPerSecond)||!finite(row.manualLifePerSecond));
  const sum=key=>round(active.reduce((total,row)=>total+row[key],0));
  const canSum=!shareOverflow&&!unresolved.length;
  const mana=canSum?sum('manualManaPerSecond'):null;
  const channels=active.flatMap(row=>row.channelCost ? [{rowIndex:row.rowIndex,...row.channelCost}] : []);
  const recovery=scenarios.map(({id,label,value})=>({id,label,value,balance:finite(mana)&&finite(value)?round(value-mana):null}));
  const observed=recovery.find(row=>row.id==='observed'&&finite(row.balance));
  const compared=observed?[observed]:recovery;
  const resolved=compared.length>0&&compared.every(row=>finite(row.balance));
  const manaStatus=resolved&&mana>0
    ? (compared.every(row=>row.balance<0)?'deficit':compared.some(row=>row.balance<0)?'mixed':'enough') : null;
  return {
    manaPerSecond:mana,
    lifePerSecond:canSum?sum('manualLifePerSecond'):null,
    ...(shareOverflow?{shareOverflow:shareTotal}:{}),
    unresolvedRows:unresolved.map(row=>row.rowIndex),
    ...(channels.length ? {channels} : {}),
    recovery,manaStatus,
  };
}

function additionalSkillCostFactor(effect) {
  return effect.operation==='more_percent' && effect.unit==='percent' && finite(effect.value) && effect.value>=-100
    && !effect.condition && !effect.conditionRequirements && !effect.per && !effect.target
    ? 1+effect.value/100 : null;
}

function isFlatSkillCostReduction(effect) {
  return effect.stat==='skill_cost' && effect.operation==='add' && effect.unit==='flat'
    && Number.isInteger(effect.value) && effect.value<=0 && effect.receipt?.season==='SS14'
    && !effect.condition && !effect.conditionRequirements && !effect.per && !effect.target;
}

function manualSkillCost(build, report, entry, rowIndex, tags, effects) {
  let base = entry?.values?.manaCost;
  if (entry?.bindingChanged) return null;
  const supports=report.components.filter(c=>c.category==='supports').flatMap(c=>c.calculations??[]).filter(c=>c.rowIndex===rowIndex);
  const slot=build.skills?.active?.[rowIndex];
  const equipped=(slot?.supports??[]).filter(c=>c?.supportId).length;
  if (supports.length!==equipped) return null;
  const fixedSupportMultiplier=seasonSupportManaMultiplier(effects);
  let costMultiplier=1, noMana=false, hasCostMultiplier=false;
  const factors=[];
  const applyCostMultiplier=factor=>{
    costMultiplier*=factor;
    hasCostMultiplier||=factor!==1;
    factors.push(factor);
  };
  const conversions=[];
  for (const support of supports) {
    const supportId=slot.supports[support.supportIndex]?.supportId;
    if(support.supportIndex>=slot.unlockedSupportCount
      || slot.supports.filter(entry=>entry?.supportId===supportId).length!==1
      || checkSeasonSupportHost(supportId,SS14_CARDS_EN.records[slot.skillId],entry,rowIndex)!==true) return null;
    if(support.castCost?.noMana&&validLunarEclipseLink(build,rowIndex,support.supportIndex))noMana=true;
    if(support.blockers.length){
      const verified=support.castCost;
      if(!finite(verified?.multiplier)||verified.multiplier<0)return null;
      applyCostMultiplier((fixedSupportMultiplier ?? verified.multiplier)/100);
      if(verified.convertsToLife)conversions.push(100);
      continue;
    }
    const multipliers=support.effects.filter(e=>e.stat==='mana-cost-multiplier');
    const [multiplier]=multipliers;
    if (multipliers.length!==1 || multiplier.operation!=='set' || multiplier.unit!=='percent'
      || multiplier.condition || multiplier.conditionRequirements || multiplier.per || multiplier.target || !finite(multiplier.value) || multiplier.value<0) return null;
    applyCostMultiplier((fixedSupportMultiplier ?? multiplier.value)/100);
    const conversion=support.effects.find(e=>e.stat==='supported-skill-mana-cost-to-life');
    if (conversion) {
      if (conversion.operation!=='set' || conversion.unit!=='percent' || conversion.value!==100 || conversion.condition
        || conversion.conditionRequirements || conversion.per || conversion.target) return null;
      conversions.push(conversion.value);
    }
  }
  let increased=0,flatReduction=0;
  for(const effect of effects){
    if(effect.stat==='additional_skill_cost'){
      const factor=additionalSkillCostFactor(effect);
      if(factor===null)return {reason:'스킬 소모 추가 옵션의 적용 조건을 확인하세요.'};
      applyCostMultiplier(factor);
      continue;
    }
    if(isFlatSkillCostReduction(effect)) flatReduction+=effect.value;
    if(!SEASON_GEAR_COST_STATS.has(effect.stat))continue;
    if(effect.stat==='attack_skill_mana_cost'&&!tags.includes('Attack')||effect.stat==='spell_mana_cost_to_life_cost'&&!tags.includes('Spell'))continue;
    if(effect.condition||effect.conditionRequirements||effect.per||effect.target||effect.unit!=='percent'||!finite(effect.value))return {reason:'시전 비용에 적용할 장비 옵션을 확인하세요.'};
    if(effect.stat==='attack_skill_mana_cost'&&effect.operation==='add_percent')increased+=effect.value;
    else if(effect.operation==='convert_percent'&&effect.value>=0)conversions.push(effect.value);
    else return {reason:'시전 비용에 적용할 장비 옵션을 확인하세요.'};
  }
  if(noMana) return conversions.some(value=>value>0)?{reason:'월식과 MP 소모 전환을 함께 적용할 때의 HP 비용은 확인되지 않았습니다.'}
    : {mana:0,life:0};
  const binding = build.ss14Inputs?.dps?.skills?.[rowIndex];
  if (entry?.itemId===MOON_STRIKE_ID && binding?.itemId===entry.itemId
    && binding.sourcePageSha256===entry.receipt?.sourcePageSha256
    && validValue(SEASON_DPS_SKILL_FIELDS.moonBaseManaCost,binding.moonBaseManaCost)) base=binding.moonBaseManaCost;
  if (!finite(base) || base < 0) return null;
  // The installed Cost Conversion and Ice Pulse effects write the same
  // skill-cost field (2010060). Skill_cost permits life cost above 100%.
  const ratio=conversions.reduce((total,value)=>total+value,0)/100;
  if (base>0 && flatReduction!==0 && (hasCostMultiplier || increased!==0 || ratio>0)) {
    const basis=JSON.stringify([entry.itemId,entry.level,base,supports.map(s=>[s.supportIndex,slot.supports[s.supportIndex].supportId,s.level]),
      factors,flatReduction,increased,conversions]);
    const stale=binding?.observedSkillCostBasis!==undefined&&binding.observedSkillCostBasis!==basis;
    if(!stale&&binding&&binding.itemId===slot?.skillId&&binding.sourcePageSha256===SS14_CARDS_EN.records[slot?.skillId]?.sourcePageSha256&&binding.observedSkillCostBasis===basis
      && observedSkillCostFields.every(field=>validValue(SEASON_DPS_SKILL_FIELDS[field],binding[field])))
      return {mana:binding.observedFinalManaCost,life:binding.observedFinalLifeCost,observation:{basis,status:'applied'}};
    return {observation:{basis,status:stale?'stale':'missing'},reason:stale
      ? '스킬 소모에 영향을 주는 구성이 바뀌었습니다. 현재 1회 MP·HP 소모를 다시 입력하세요.'
      : '고정 스킬 소모 감소와 소모량 배율·HP 전환의 적용 순서가 미확인입니다.'};
  }
  const cost=Math.max(0,base+flatReduction)*costMultiplier*Math.max(0,1+increased/100);
  return { mana:cost*Math.max(0,1-ratio), life:cost*ratio };
}

function manualCastCostIssues(report, cost, skillName) {
  if (!cost) return [];
  if (cost.reason) return [cost.reason];
  const issues = [];
  const { life, unreservedMana } = report.character?.values ?? {};
  if (finite(unreservedMana) && cost.mana > unreservedMana + 1e-8)
    issues.push(`${skillName} 시전 MP 부족 (필요 ${round(cost.mana)} / 사용 가능 ${round(unreservedMana)})`);
  if (cost.life > 0 && finite(life) && cost.life > life + 1e-8)
    issues.push(`${skillName} 시전 HP 부족 (필요 ${round(cost.life)} / 최대 ${round(life)})`);
  return issues;
}

function verifyRules(build, rules, blockers) {
  for (const page of Object.values(rules.pages).filter(p => p.locale === "en")) {
    if (page.season !== "SS14" || !hash(page.sourcePageSha256) || build.ss14Inputs?.dpsRuleReceipts?.[page.sourceUrl] !== page.sourcePageSha256)
      blockers.push("SS14 DPS 공식 원문 연결이 없거나 변경되었습니다. 전투 입력을 확인하고 다시 계산하세요.");
  }
  if (!body(rules, "Armor").includes("Monster Armor/(0.9 x Monster Armor + 30000)")
    || !/60%+ of the damage reduction/u.test(body(rules, "Armor")) || !/80%+/u.test(body(rules, "Armor"))
    || !body(rules, "Resistance_Penetration").includes("defender's effective Resistance")
    || !body(rules, "Armor_DMG_Mitigation_Penetration").includes("negative value")) blockers.push("SS14 적 방어·관통 공식이 계산 모델과 일치하지 않습니다.");
}

function coverage(build, report, effects, gearEffects) {
  const blockers = [...(report.componentProjection.globalBlockers ?? [])];
  if(report.character?.values.reservedManaPercent>100)blockers.push('선택한 스킬의 MP 봉인 합이 100%를 초과합니다.');
  const nether=report.componentProjection.rows.some(r=>r.netherTalentId||r.itemId?.startsWith('nether_'));
  const inactiveAuras=new Set(report.componentProjection.rows.filter(buff=>buff.inactiveAura).map(buff=>buff.buffSkill));
  for (const row of report.componentProjection.rows) blockers.push(...row.blockers.map(b => `${row.name}: ${b.reason}`));
  blockers.push(...report.componentProjection.allocation.issues.map(b => b.reason));
  for (const row of report.components) {
    if (row.category === "skills" && row.calculations?.every(e => e.mechanics?.some(m => m.kind === "utility-skill"))) {
      for (const entry of row.calculations) for (const support of report.components.filter(c => c.category === "supports"))
        for (const linked of support.calculations?.filter(e => e.rowIndex === entry.rowIndex) ?? [])
          if (checkSeasonSupportHost(support.id, SS14_CARDS_EN.records[row.id], entry, entry.rowIndex) !== true) blockers.push("보조 스킬과 회복·이동 스킬의 호환 조건을 확인하세요.");
      continue;
    }
    if (row.category === "skills" && report.componentProjection.rows.some(r => r.elixirState && r.receipt && (r.itemId === row.id || row.paths.length && row.paths.every(p => p === `${r.path}.skillId`)))) {
      const slots = build.skills.active.filter(s => s?.skillId === row.id);
      if (slots.some(s => s.supports?.some(s => s?.supportId))) blockers.push("영약에 연결한 보조의 사용 시간·효과 변경을 확인해야 합니다.");
      continue;
    }
    if (row.category === "talentTrees" && row.paths.length && row.paths.every(path => {
      const match = path.match(/^talents\.boards\.(\d+)\.treeSlug$/u);
      const board = match && build.talents?.boards?.[Number(match[1])];
      const rule = board && SS14_RULES.talents[board.treeSlug];
      return board?.treeSlug === row.id && rule?.sourcePageSha256 === SS14_COMPONENTS.pages[rule?.sourceUrl]?.sourcePageSha256
        && Boolean(rule) && !report.componentProjection.allocation.issues.some(issue => issue.path.startsWith(`talents.boards.${match[1]}`));
    })) continue;
    if (row.category === "slates" && row.id === "six_gods" && row.paths.every(p => /^divinity\.boards\.\d+\.cells\.\d+\.slateId$/u.test(p))) continue;
    // Structured spirit/trait IDs are not catalog IDs. Their exact selected
    // path or trait control is resolved and source-bound by the projector.
    const projected = report.componentProjection.rows.some(p => p.receipt && (p.itemId === row.id
      || p.control?.choiceId === row.id || row.paths.some(path => path === p.path || path.startsWith(`${p.path}.`))));
    if (projected && !["skills", "gear", "supports"].includes(row.category)) continue;
    if (!findItemById(row.id)) { blockers.push(`${row.label}: 선택 ID를 찾지 못했습니다.`); continue; }
    if (["skills", "gear", "supports"].includes(row.category)) {
      if (row.status !== "mapped" && !(row.category === "skills" && (seasonMinionProfile(row.id) || seasonModuleProfile(row.id)))) {
        let reasons=row.reasons;
        if(row.category==='supports'&&inactiveAuras.size&&row.calculations?.some(entry=>entry.levelUnavailable)){
          reasons=[...new Set(row.calculations.filter(entry=>!(entry.levelUnavailable&&inactiveAuras.has(entry.rowIndex))).flatMap(entry=>entry.blockers))];
          if(!reasons.length)continue;
        }
        blockers.push(`${row.label} · ${row.name}: ${reasons.join(" · ")}`);
      }
    } else if (!report.componentProjection.rows.some(p => p.itemId === row.id)
      && !(["hero", "heroTraits"].includes(row.category) && report.componentProjection.rows.some(p => p.group === "hero"))
      && !(row.category === "talentTrees" && report.componentProjection.allocation.checks.some(p => p.path.startsWith("talents.")))) {
      blockers.push(`${row.label} · ${row.name}: 선택 항목과 계산 효과의 연결을 확인하지 못했습니다.`);
    }
  }
  // A placed special/empty slate must not disappear because it has no affix row.
  const board = build.divinity?.boards?.find(b => b.boardId === build.divinity.activeBoardId);
  for (const id of new Set((board?.cells ?? []).map(c => c.slateInstanceId))) {
    const slate = board.slateInventory?.find(s => s.instanceId === id);
    const verifiedSpecial = report.componentProjection.rows.find(r => r.itemId === slate?.slateId && r.slateControls && r.path.endsWith(`.${id}`));
    if (!verifiedSpecial && (!slate || slate.slateId !== "six_gods" || !Object.keys(slate.slotSelectionsByKey ?? {}).length))
      blockers.push("배치된 특수 석판 또는 옵션 없는 석판의 전체 공격 효과를 확인하지 못했습니다.");
  }
  // The legacy selectedSkill field is a UI selection, never a damage modifier.
  if (Object.keys(build.calculation ?? {}).some(k => k !== "selectedSkill") || Object.keys(build.conditions ?? {}).length)
    blockers.push("원본 계산 설정·전투 조건의 SS14 전체 연결이 필요합니다.");
  if (build.hero?.revivalMemory) blockers.push("부활 추억의 전체 공격 효과 연결이 필요합니다.");
  const gearNumbedModifiers=new Set(gearEffects.filter(effect=>SEASON_GEAR_NUMBED_MODIFIERS.has(effect.stat)));
  const fixedNumbed=report.componentProjection.fixedNumbed;
  const legacyNumbed=report.componentProjection.rows.some(row=>row.conditionControls.some(c=>c.conditionGroup==='nether-numbed-stacks'));
  // The ordinary Numbed debuff affects only lightning. Only waive the
  // timeline requirement when every damage row has verified non-lightning
  // pools and there is no independent minion or module damage to resolve.
  const rows=report.coupledSkills.rows;
  const noLightning=gearNumbedModifiers.size>0 && rows.length>0 && rows.every(row=>
    row.supported && row.offenseBasis && !seasonModuleProfile(row.id) && !seasonMinionProfile(row.id)
    && [row.offenseBasis.pools,row.offenseBasis.dotPools].every(pools=>
      pools?.every(pool=>pool.type!=='lightning'||pool.max===0)));
  for (const effect of effects) {
    if (isNumbedBaseOverride(effect)) {
      const mayDealLightning=rows.some(row=>seasonModuleProfile(row.id)||seasonMinionProfile(row.id)
        || [row.offenseBasis?.pools,row.offenseBasis?.dotPools].some(pools=>pools?.some(pool=>pool.type==='lightning'&&pool.max>0)));
      if (mayDealLightning&&!fixedNumbed&&!legacyNumbed&&!theaCombatEnabled(build))
        blockers.push(`${FIXED_NUMBED_FIELD.label}을 입력하세요. 마취가 없으면 0을 입력하세요.`);
      continue;
    }
    if(SEASON_GEAR_COST_STATS.has(effect.stat))continue; // evaluated against each skill's tags and resource budget
    if(effect.stat==='additional_skill_cost' && additionalSkillCostFactor(effect)!==null)continue;
    if(isFlatSkillCostReduction(effect))continue;
    if(SEASON_GEAR_NUMBED_STATS.has(effect.stat)) {
      if(!finite(effect.value)||effect.value<effect.roll?.min||effect.value>effect.roll?.max
        || effect.stat==='gear_numbed_additional_stacks'&&!Number.isInteger(effect.value))
        blockers.push(`장비 옵션 수치를 입력하세요: ${effect.sourceText}`);
      if(!theaCombatEnabled(build)||!theaState(build))blockers.push('썬더볼트 조종자의 마취 효과는 티아1 자동 은총의 복합 발동에서 계산합니다.');
      continue;
    }
    if(gearNumbedModifiers.has(effect)){
      if(effect.roll&&!finite(effect.value))blockers.push(`장비 옵션 수치를 입력하세요: ${effect.sourceText}`);
      else if(effect.operation!=='add_percent'||effect.unit!=='percent'||!finite(effect.value)||effect.value<0
        || effect.condition||effect.conditionRequirements||effect.per||effect.target)
        blockers.push(`마취 장비 효과의 연산을 확인할 수 없습니다: ${effect.sourceText}`);
      if(!fixedNumbed&&!noLightning&&!legacyNumbed&&!theaCombatEnabled(build))
        blockers.push(`${FIXED_NUMBED_FIELD.label}을 입력하세요. 마취가 없으면 0을 입력하세요.`);
      else if(!noLightning&&theaCombatEnabled(build)&&!theaState(build))
        blockers.push('장비의 마취 지속·효과 보너스는 티아1 자동 은총의 복합 발동에서 계산합니다.');
      continue;
    }
    if(SEASON_BLESSING_CAP_STATS.has(effect.stat))continue; // validated by projectSeasonBlessings
    if(effect.stat==='max_vorax_gear_equipped') {
      const count=(build.gear?.slots??[]).filter(s=>SS14_GEAR_EN.records[s?.itemId]?.detail?.includes('You can only equip 1 Vorax Gear')).length;
      if(effect.operation!=='set'||effect.value!==1||count>1)blockers.push('보락스 장비는 동시에 1개만 장착할 수 있습니다.');
      continue;
    }
    if (seasonSupportManaMultiplier([effect]) !== undefined || separatelyHandledGear.has(effect.stat) || SEASON_LOCAL_WEAPON_STATS.has(effect.stat) || SEASON_GLOBAL_FLAT_STATS.has(effect.stat)
      || /^(?:physical|cold|fire|lightning|erosion|minion)_skill_levels$/u.test(effect.stat)
      || /^attack_(?:physical|cold|fire|lightning|erosion)_damage_(?:min|max)$/u.test(effect.stat)) continue;
    if (/^(fire|cold|lightning)_damage_reflection$/u.test(effect.stat) && build.ss14Inputs?.dps?.skills?.[0]?.incomingHits === 0) continue;
    if (effect.condition || effect.conditionRequirements || effect.per || effect.target || !finite(effect.value) && typeof effect.value !== "boolean") {
      blockers.push(effect.roll && !finite(effect.value)
        ? `장비 옵션 수치를 입력하세요: ${effect.sourceText ?? effect.stat}`
        : `조건·대상·수치 미확인: ${effect.sourceText ?? effect.stat}`); continue;
    }
    if(isObservedTerraGearEffect(effect))continue;
    if (Object.hasOwn(SEASON_SKILL_AILMENT_TAGS, effect.stat)) {
      if (!finite(effect.value) || !['add_percent','more'].includes(effect.operation) || effect.operation === 'more' && effect.value < -100)
        blockers.push(`스킬 상태 이상 대미지 연산 미지원: ${effect.sourceText ?? effect.stat}`);
      continue;
    }
    if (effect.stat==='demolisher_charge_recovery_speed' && effect.operation==='add_percent' && finite(effect.value)) continue;
    const minionConversion = seasonMinionDamageConversion(effect);
    if (effect.stat === 'minion_physical_damage_as_erosion_damage' || effect.stat === 'max_summonable_synthetic_troops') {
      const cap = effect.stat === 'max_summonable_synthetic_troops';
      const valid = cap ? effect.operation === 'add' && Number.isInteger(effect.value) && effect.value > 0
        : effect.operation === 'gain_percent_of_source' && effect.value >= 0;
      if (!valid) blockers.push(`소환체 옵션 수치를 확인하세요: ${effect.sourceText ?? effect.stat}`);
      if (report.components.some(row => row.category === 'skills' && !seasonModuleProfile(row.id)
        && !seasonMinionProfile(row.id) && SS14_CARDS_EN.records[row.id]?.tags?.includes('Summon')))
        blockers.push('이 소환 스킬의 추가 대미지·소환 상한 계산은 미지원입니다.');
      continue;
    }
    if (seasonOutgoingDamageConversion(effect) || minionConversion) {
      if (!(finite(effect.value) && effect.value >= 0 && effect.value <= 100))
        blockers.push(`대미지 전환 수치를 확인하세요: ${effect.sourceText ?? effect.stat}`);
      if (minionConversion && report.components.some(row => row.category === 'skills' && !seasonModuleProfile(row.id)
        && !seasonMinionProfile(row.id) && SS14_CARDS_EN.records[row.id]?.tags?.includes('Summon')))
        blockers.push('소환체의 대미지 유형 전환 계산은 미지원입니다.');
      continue;
    }
    if (!(nether&&NETHER_CONSUMED_STATS.has(effect.stat)) && !SEASON_CURSE_STATS.has(effect.stat) && !['aura_effect','warcry_effect','sealed_mana_compensation','sealed_mana_percent','energy_shield_regeneration_percent','melee_critical_strike_rating'].includes(effect.stat) && !seasonDirectDamageStat(effect.stat) && !seasonDpsSpecialStat(effect.stat) && !attributes.has(effect.stat)
      && !defensive.has(effect.stat) && !minionOnly.has(effect.stat) && !/^minion_(?:critical_strike_(?:rating|damage)|double_damage_chance|max_life|projectile_speed|movement_speed|skill_area|(?:physical|cold|fire|lightning|erosion)_damage_(?:min|max))$/u.test(effect.stat)
      && !['skill_area','life_regain','energy_shield_regain','attack_aggression_effect','spell_aggression_effect','mobility_cooldown_recovery_speed',
        'minion_attack_damage','minion_spell_damage','projectile_critical_hit_damage','cold_critical_hit_damage'].includes(effect.stat)
      && !critical.test(effect.stat) && !double.test(effect.stat) && !["critical_hit_damage", "double_damage_overflow_quadruple", "cold_damage_taken", "fire_damage_taken", "lightning_damage_taken", "spell_damage_taken", "affliction_effect", "ailment_damage", "spell_elemental_penetration", "enemy_erosion_resistance_fixed"].includes(effect.stat))
      blockers.push(`전체 공격 계산에 연결되지 않은 효과: ${effect.sourceText ?? effect.stat}`);
    if (seasonDirectDamageStat(effect.stat) && !["add_percent", "more"].includes(effect.operation)
      && !(effect.stat === "additional_cold_damage" && effect.operation === "more_percent"))
      blockers.push(`공격 효과 연산 미지원: ${effect.sourceText ?? effect.stat}`);
    if (attributes.has(effect.stat) && !["add", "add_percent", "more", "set"].includes(effect.operation))
      blockers.push(`속성 효과 연산 미지원: ${effect.sourceText ?? effect.stat}`);
  }
  const replacement = SS14_CARDS.records["gear-tlidb-com-cn-necklace-of-firebird"];
  const replacementLine = replacement?.koreanTextVerified && replacement.season === "SS14"
    ? replacement.detail?.split("\n").find(line => line === "메인 스킬을 20레벨 장벽 폭발 로 교체합니다.") : null;
  if (replacementLine && report.components.some(c => c.id === replacement.itemId)
    && build.skills?.active?.[0]?.skillId !== "skills-tlidb-com-cn-barrier-burst")
    blockers.unshift(`${replacement.name}: 주력 스킬은 일반 장벽 폭발로 교체됩니다. 다른 주력 스킬의 대미지를 대신 합산하지 않습니다.`);
  if(report.components.some(c=>c.id===replacement?.itemId) || ['active-barrier-burst-firebird','skills-tlidb-com-cn-barrier-burst'].includes(build.skills?.active?.[0]?.skillId))
    blockers.push('일반 장벽 폭발: SS14 장벽 계수와 장벽량을 읽는 시점 미확인. 고급 장벽 폭발의 400%는 적용하지 않습니다.');
  return blockers;
}

export function calculateSeasonDps(build, report, { rules = SS14_DPS_RULES } = {}) {
  const combat = theaCombatEnabled(build);
  const combatState = theaState(build)?.events ?? {};
  const input = build.ss14Inputs?.dps;
  const gearEffects = report.components.filter(c => c.category === "gear")
    .flatMap(c => (c.calculations ?? []).flatMap(entry => (entry.rawEffects ?? []).map(effect =>
      seasonMinionDamageConversion(effect) || effect.stat === 'minion_physical_damage_as_erosion_damage'
        ? { ...effect, path:`gear.slots.${entry.slotIndex}`, itemId:c.id, receipt:entry.receipt, effectSource:{name:c.name} }
        : effect)));
  const effects = [...report.componentProjection.effects, ...gearEffects];
  const blockers = coverage(build, report, effects, gearEffects);
  const fixedErosion=fixedSeasonErosionResistance(effects);
  if(fixedErosion===null)blockers.push('대상 부식 저항 고정 효과의 수치 또는 적용 우선순위를 확인할 수 없습니다.');
  blockers.push(...logReviewRows(build).filter(r => !r.confirmed).map(r => `로그에 없는 ${r.label} 구성을 편집한 뒤 확인하세요.`));
  if (build.patchSnapshot?.season !== "SS14") blockers.push("SS14 별도 편집 문서에서 계산하세요.");
  if (!validSeasonDpsInputs(build.ss14Inputs ?? {})) blockers.push("DPS 입력 문서의 형식 또는 범위가 올바르지 않습니다.");
  verifyRules(build, rules, blockers);
  if (!report.coupledSkills.rows.length) blockers.push("전체 DPS를 계산할 주력 스킬을 선택하세요.");
  const consumed = new Set();
  const special = effects.filter(e => seasonDpsSpecialStat(e.stat));
  const heroMechanics = report.componentProjection.rows.flatMap(r => r.mechanics ?? []);
  const recoveryRule=heroMechanics.find(m=>m.kind==='burst-essence');
  const burstRecovery=bingRecovery(recoveryRule && {...recoveryRule,cap:heroMechanics.find(m=>m.kind==='essence-cycle'&&m.cap)?.cap}, build.ss14Inputs?.bingBurstEvents);
  const overload = heroMechanics.find(m => m.kind === "ingenuity-overload");
  const hero = build.ss14Inputs?.heroCombat;
  const simple = (stat, operation, fallback = 0) => {
    const rows = special.filter(e => e.stat === stat);
    if (rows.some(e => e.operation !== operation || !finite(e.value))) { blockers.push(`특수 효과 연산 미지원: ${stat}`); return fallback; }
    rows.forEach(e => consumed.add(e));
    return rows.reduce((sum, e) => sum + e.value, fallback);
  };
  const maxBurst = simple("max_spell_burst", "add");
  let burstSpeed = 1; let burstMore = 1; let burstHitMore = 1;
  for (const e of special.filter(e => ["spell_burst_charge_speed", "spell_burst_hit_damage"].includes(e.stat))) {
    if (!finite(e.value) || e.value < -100) { blockers.push("매직 버스트 수치 범위 미확인"); continue; }
    if (e.stat === "spell_burst_hit_damage" && e.operation === "more") burstHitMore *= 1 + e.value / 100;
    else if (e.stat === "spell_burst_charge_speed" && e.operation === "add_percent") burstSpeed += e.value / 100;
    else if (e.stat === "spell_burst_charge_speed" && e.operation === "more") burstMore *= 1 + e.value / 100;
    else { blockers.push("매직 버스트 효과 연산 미지원"); continue; }
    consumed.add(e);
  }
  if (!Number.isInteger(maxBurst) || maxBurst < 0 || maxBurst > 100 || burstSpeed < 0) blockers.push("매직 버스트 중첩·충전 속도 범위 미확인");
  if (maxBurst > 0 && (!body(rules, "Spell_Burst").includes("fully charged within 2s")
    || !body(rules, "Spell_Burst").includes("activates the Spell Burst is considered a skill cast by Spell Burst"))) blockers.push("SS14 매직 버스트 충전·발동 시전 공식 미확인");
  const penetration = { physical: 0, fire: simple("fire_penetration", "add_percent"), cold: simple("cold_penetration", "add_percent"),
    lightning: simple("lightning_penetration", "add_percent"), erosion: simple("erosion_resistance_penetration", "add_percent") };
  const elemental = simple("elemental_resistance_penetration", "add_percent");
  for (const key of ["fire", "cold", "lightning"]) penetration[key] += elemental;
  const armorPenetration = simple("armor_damage_mitigation_penetration", "add_percent");
  const projectileArmorPenetration = simple('projectile_armor_penetration','add_percent');
  const spellElementalPenetration = simple('spell_elemental_penetration','add_percent');
  const lucky = stat => {
    const rows = special.filter(e => e.stat === stat);
    if (rows.some(e => e.operation !== "set" || ![1, true].includes(e.value))) blockers.push("대미지 행운·불운 효과 값 미확인");
    rows.forEach(e => consumed.add(e)); return rows.length > 0;
  };
  const veryLucky = lucky("damage_very_lucky"); const normalLucky = lucky("damage_lucky"); const unlucky = lucky("damage_unlucky");
  const luck = (veryLucky ? 2 : normalLucky ? 1 : 0) - (unlucky ? 1 : 0);
  if ((normalLucky || veryLucky || unlucky) && !body(rules, "Lucky").includes("cancel into Lucky")) blockers.push("SS14 대미지 행운·불운 상쇄 공식 미확인");
  for (const e of special) if (!consumed.has(e)) blockers.push(`계산되지 않은 특수 효과: ${e.sourceText ?? e.stat}`);
  let burstUsers = 0;
  const syntheticTroopMapCap = seasonSyntheticTroopMapCap(report);
  const commandSlot = seasonObservedCommandSlot(build);
  let sharedCommand = null;
  if (commandSlot >= 0) {
    const slot = commandSlot < 5 ? build.skills.active[commandSlot] : build.skills.passive[commandSlot-5];
    const record = SS14_CARDS_EN.records[slot?.skillId], binding = input?.skills?.[commandSlot];
    const receipt = mechanicPage(build,"Synthetic_Troop");
    const verified = receipt?.body.includes("Every point of Command grants Synthetic Troop Minions +3%% additional damage");
    const bound = binding?.itemId===record?.itemId && binding?.sourcePageSha256===record?.sourcePageSha256
      && validValue(SEASON_MINION_FIELDS.command,binding?.command);
    if (!verified) blockers.push("스마트 웨폰 통솔의 SS14 원문 미확인");
    if (!bound) blockers.push("스마트 웨폰에 적용할 현재 통솔 수치를 입력하세요.");
    sharedCommand = {rowIndex:commandSlot,value:bound && verified ? binding.command : NaN,receipt};
  }
  const castCostVerified = body(rules,'Character_Build').includes("Skills cannot be cast when they cost more than the character's current Mana");
  const beams = report.coupledSkills.rows.filter(row => row.id === wiltingBeamId);
  const reaper = beams.length === 1 ? beams[0] : null;
  const reapBinding = reaper ? input?.skills?.[reaper.rowIndex] : null;
  const reapBasis = reaper?.offenseBasis;
  const reap = reapBasis?.reaping;
  const channelPage = beams.length ? mechanicPage(build, "Channeled") : null;
  const channelRate = channelPage?.body.includes("gain 1 channeled stack whenever you use a skill")
    && channelPage.body.includes("When the current number of channeled stacks is 0")
    && reap?.baseChannelStacks > 0 && reapBasis.rate > 0 ? reapBasis.rate / reap.baseChannelStacks : null;
  const continuousReap = reapBinding?.reapingMode === 1;
  const channelReapReady = channelRate > 0 && reap.effectiveRecoverySeconds > 0
    && channelRate * reap.effectiveRecoverySeconds <= 1 + 1e-8;
  const timedReaping = timedFissure(build);
  const reapRate = timedReaping ? 0 : continuousReap ? (channelReapReady ? channelRate : 0) : reapBinding?.reapingRate;
  const usesReapingTimes = timedReaping && beams.some(row=>observedTimeList(input?.skills?.[row.rowIndex]?.reapingTimes)?.length);
  const reapDuration = reap?.effectiveDurationSeconds;
  const reapAllocations = new Map();
  const dotAllocations = new Map();
  const automaticCycle=build.ss14Inputs?.theaCycle?.mode==='automatic';
  const rows = report.coupledSkills.rows.map(direct => {
    const reasons = [...direct.blockers];
    const record = SS14_CARDS_EN.records[direct.id];
    const entry = report.components.filter(c => c.category === "skills").flatMap(c => c.calculations ?? []).find(c => c.rowIndex === direct.rowIndex);
    const offense = report.offense.rows.find(r => r.rowIndex === direct.rowIndex);
    const b = input?.skills?.[direct.rowIndex];
    const skillName=SS14_CARDS.records[direct.id]?.name??'선택 스킬';
    const basis = direct.offenseBasis;
    const alternating = Boolean(basis?.weaponHands);
    if (alternating && combat) reasons.push('쌍수 교대 공격은 복합 발동의 무기별 적중 순서까지 계산하지 못합니다.');
    const module = seasonModuleProfile(direct.id);
    const minion = seasonMinionProfile(direct.id);
    if (direct.numbedSupport && (module || minion)) blockers.push("소환체에 연결한 마취 보조의 발동 계산은 미지원입니다.");
    if (module || minion) {
      const result = module
        ? calculateSeasonModule(build, report, { ...entry, rowIndex: direct.rowIndex, level: entry?.level ?? build.skills.active[direct.rowIndex].level }, module, effects, validValue, SEASON_DPS_ENEMY_FIELDS, syntheticTroopMapCap, sharedCommand)
        : calculateSeasonMinion(build, report, entry, minion, effects, validValue, SEASON_DPS_ENEMY_FIELDS, syntheticTroopMapCap, sharedCommand);
      if (!validValue(SEASON_DPS_SKILL_FIELDS.useShare, b?.useShare)) result.blockers.push("소환 스킬 시전 시간 배분을 입력하세요.");
      if (direct.rowIndex < 5) {
        const cost = castCostVerified ? manualSkillCost(build, report, entry, direct.rowIndex, record?.tags ?? [], effects) : null;
        result.manaPerUse = round(cost?.mana);
        result.lifePerUse = round(cost?.life);
        if(cost?.observation)result.castCostObservation=cost.observation;
        const observedRate = validValue(SEASON_DPS_SKILL_FIELDS.summonCastRate,b?.summonCastRate) ? b.summonCastRate : null;
        result.manualSummonRate = b?.useShare === 0 ? 0 : observedRate;
        if (b?.useShare > 0 && observedRate !== 0) {
          if (cost) result.blockers.push(...manualCastCostIssues(report, cost, skillName));
          else result.blockers.push(`${skillName} 수동 소환의 시전 비용을 확인하세요.`);
        }
        const rate = result.manualSummonRate;
        result.manualManaPerSecond = rate === 0 ? 0 : finite(rate) ? round(cost?.mana * rate) : null;
        result.manualLifePerSecond = rate === 0 ? 0 : finite(rate) ? round(cost?.life * rate) : null;
      }
      if (result.blockers.length) {
        result.supported = false;
        result.values.dps = result.values.minionDps = result.values.minionHitDps = null;
      }
      const bonus=report.componentProjection.fixedNumbed?.bonus ?? 0;
      result.values.fixedNumbedMinionDps=result.supported
        ? (result.minionDamageByType?.lightning ?? 0) * bonus / (100 + bonus) : null;
      return result;
    }
    const validBinding=record?.season==='SS14'&&b?.itemId===direct.id&&b.sourcePageSha256===record.sourcePageSha256;
    if (!validBinding) reasons.push("이 스킬의 SS14 전투 입력을 다시 확인하세요.");
    const observedReaping = entry?.mechanics?.some(m => m.kind === "wilting-beam-reaping");
    const hasHit = Boolean(basis?.pools?.length); const hasDot = Boolean(basis?.dotPools?.length);
    const frost = direct.permafrost;
    const timed = timedFissure(build);
    const dotWindows = timed && (hasDot || frost) ? continuousDotWindows(b?.dotWindows) : null;
    const frostUptime = frost && timed ? (dotWindows?.length ? 100 : 0) : b?.permafrostUptime;
    const frostActive = frost && frostUptime>0;
    if(!automaticCycle&&validBinding&&(hasDot||frost)){
      // Manual and triggered Frost Terra use the same target damage state 10200.
      const addSlot=(id,field)=>{
        const uptime=validValue(SEASON_DPS_SKILL_FIELDS[field],b[field])?b[field]:null;
        const slots=dotAllocations.get(id)??[];
        slots.push({rowIndex:direct.rowIndex,itemId:direct.id,field,uptime,confirmed:b.dotExclusive===1});
        dotAllocations.set(id,slots);
      };
      if(hasDot)addSlot(direct.id,'dotUptime');
      if(frost)addSlot(FROST_TERRA_ID,'permafrostUptime');
    }
    if (entry?.mechanics?.some(m=>m.kind==='voltage-observed-average')){
      const key=voltageAverageKey(build,direct.rowIndex), definition=SEASON_DPS_SKILL_FIELDS[key];
      if (!validValue(definition,b?.[key])) reasons.push(`${definition.label} 미입력`);
    }
    if(b?.terraCharges>direct.terraChargeMaximum && entry?.mechanics?.some(m=>m.field==='terraCharges'))
      reasons.push(`이번 시전에 소모한 대지 충전의 상한은 ${direct.terraChargeMaximum}입니다.`);
    if(direct.voltageAfterwave&&b?.terraCharges>=VOLTAGE_AFTERWAVE_CHARGES){
      if(b.afterwaveOverlap===1)reasons.push('잔파 고리의 지속 대미지 적용이 겹칠 때의 배율은 확인되지 않았습니다.');
      else if(b.afterwaveOverlap!==0)reasons.push('잔파 고리의 지속 대미지 적용 방식을 선택하세요.');
    }
    if (direct.voltageJolt && combat) reasons.push('혼비백산의 수확 시점과 마취 부여 순서는 복합 발동에서 확인되지 않았습니다.');
    else if (direct.voltageJolt && !report.componentProjection.fixedNumbed)
      reasons.push(`혼비백산의 마취: ${FIXED_NUMBED_FIELD.label}을 입력하세요. 마취가 없으면 0을 입력하세요.`);
    const dotUptime = dotWindows ? (dotWindows.length ? 100 : 0) : b?.dotUptime;
    for (const key of observedReaping && !hasHit ? ["useShare"] : ["useShare", "hitChance"])
      if (!validValue(SEASON_DPS_SKILL_FIELDS[key], b?.[key])) reasons.push(`${SEASON_DPS_SKILL_FIELDS[key].label} 미입력`);
    if (!offense?.supported) reasons.push(...(offense?.blockers ?? ["속성·크리티컬 계산 미지원"]));
    const numbedOnHit = direct.numbedSupport && Boolean(basis?.pools?.some(p => p.type === "lightning" && p.max > 0));
    if (numbedOnHit && !combat && !report.componentProjection.fixedNumbed)
      reasons.push(`고압전기의 마취: ${FIXED_NUMBED_FIELD.label}을 입력하세요. 마취가 없으면 0을 입력하세요.`);
    else if (numbedOnHit && combat && build.ss14Inputs?.theaCycle?.mode !== "automatic")
      reasons.push("고압전기의 마취는 티아1 자동 은총의 복합 발동에서 계산합니다.");
    if ((direct.supported || !direct.blockers.length)
      && (!hasHit && !hasDot || basis?.projectileHits !== 1 || !finite(basis?.rate) || hasHit && basis.rate <= 0))
      reasons.push("명중·지속 대미지 유형 또는 시전 빈도 분리 미완료");
    if (basis?.nativeSpellBurst) reasons.push("스킬·보조에서 부여한 매직 버스트의 적용 범위 분리 미완료");
    const observedDotExclusion = e => hasDot && (["cast-time", "cooldown"].includes(e.stat) && e.reason === "no-hit-cadence-not-applied"
      || ["damage-over-time-effect-duration", "frost-terra-duration", "swamp-terra-duration", "persistent-cold-duration", "persistent-erosion-duration", "skill-duration", "supported-skill-duration", "effect-stacks", "max-channeled-stacks"].includes(e.stat) && e.reason === "non-offensive-dps-effect"
      || e.stat === "skill-movement-speed" || e.stat === "added-damage-effectiveness" && e.reason === "added-damage-hit-target-unavailable");
    for (const e of basis?.excluded ?? []) if (!["mana-cost", "mana-cost-multiplier", "supported-skill-mana-cost-to-life", "skill-area", "supported-skill-area"].includes(e.stat) && !observedDotExclusion(e)
      && !(e.reason === 'cadence-speed-kind-not-selected' && !e.affectsCompletion)
      && !(['gear-conversion-source-absent','ss14-hit-conversion-source-absent','ss14-hit-gain-source-absent','no-hit-damage-not-applied'].includes(e.reason) && !e.affectsCompletion)
      && !(e.reason==='damage-modifier-target-unavailable' && !e.affectsCompletion
        && /^supported-skill-(?:physical|lightning|cold|fire|erosion)-damage$/u.test(e.stat))
      && !(e.reason === 'skill-has-no-cooldown' && !e.affectsCompletion)
      && !(e.stat === "cast-time" && e.reason === "context-action-time-used" && finite(seasonDamageContext(build, direct.rowIndex, direct.id).attackSpeed)))
      reasons.push(`스킬·보조의 미적용 효과: ${e.sourceText || e.stat}`);
    if (direct.rowIndex >= 5) reasons.push("패시브 스킬의 전체 효과 연결 미완료");
    const hitPools = (basis?.pools ?? []).filter(p=>p.max>0);
    const dotPools = (basis?.dotPools ?? []).filter(p=>p.max>0);
    const types = new Set([...hitPools,...dotPools,...(frostActive?frost.dotPools??[]:[])].map(p=>p.type));
    for (const key of [...(hasHit ? ["armor"] : []), ...[...types].filter(t => t !== "physical" && (t!=='erosion'||!finite(fixedErosion)))])
      if (!validValue(SEASON_DPS_ENEMY_FIELDS[key], input?.enemy?.[key])) reasons.push(`${SEASON_DPS_ENEMY_FIELDS[key]?.label ?? key} 미입력`);
    const iceRing = entry?.mechanics?.find(m => m.kind === "ice-ring-on-kill");
    if (iceRing && !validValue(SEASON_DPS_SKILL_FIELDS.repeatHits, b?.repeatHits)) reasons.push("아이스링 처치 재발동의 대상 적중 횟수를 확인하세요. 단일 보스에서 재발동이 없으면 0입니다.");
    if (!iceRing && (b?.repeatHits ?? 0) !== 0) reasons.push("처치 재발동 입력은 아이스링에만 적용할 수 있습니다.");
    const reaping = basis?.reaping;
    const automaticReap = b?.reapingMode === 1;
    const reapTimes = timedReaping && observedReaping ? observedTimeList(b?.reapingTimes) ?? (b?.reapingRate === 0 ? [] : null) : null;
    const reapingRate = timedReaping && observedReaping
      ? reapTimes?.filter(at=>at>=build.ss14Inputs.theaCycle.warmup).length / build.ss14Inputs.theaCycle.seconds
      : automaticReap ? reapRate : b?.reapingRate;
    if (observedReaping) {
      const rules = mechanicPage(build, "Damage_Over_Time_Reaping");
      if (!rules?.body.includes("then deal an equal amount of True Damage.")
        || !rules.body.includes("Reaping only applies to Damage Over Time you deal."))
        reasons.push("SS14 수확 공식 원문을 확인할 수 없습니다.");
      if (timedReaping) {
        const label = SEASON_DPS_SKILL_FIELDS.reapingTimes.label;
        const end = build.ss14Inputs.theaCycle.warmup + build.ss14Inputs.theaCycle.seconds;
        if (!reapTimes) reasons.push(`${label} 미입력`);
        else if (reapTimes.some(at=>at>=end-1e-8)) reasons.push(`${label}은 측정 종료 전이어야 합니다.`);
        else if (reapTimes.length && (beams.length !== 1 || b?.useShare === 0 || dotUptime === 0 || !(reaping?.effectiveRecoverySeconds>0)))
          reasons.push(`${label}은 사용할 수 있는 부식 광선 한 칸에만 입력하세요.`);
      } else if (automaticReap) {
        const mode = SEASON_DPS_SKILL_FIELDS.reapingMode.label;
        if (report.coupledSkills.rows.length !== 1 || b.useShare !== 100 || b.dotUptime !== 100)
          reasons.push(`${mode}: 연속 채널링은 부식 광선만 사용하고 시전 배분·지속 대미지 유지율이 모두 100%인 경우에 계산합니다.`);
        else if (basis && !channelReapReady)
          reasons.push(`${mode}: 채널링 회차가 수확 쿨타임을 충족하는지 확인할 수 없습니다. 관측값 입력을 선택하세요.`);
      } else if (!validValue(SEASON_DPS_SKILL_FIELDS.reapingRate, reapingRate))
        reasons.push(`${SEASON_DPS_SKILL_FIELDS.reapingRate.label} 미입력`);
      if (!timedReaping && reapingRate > 0) {
        if (reaping && (!(reaping.effectiveRecoverySeconds > 0) || reapingRate * reaping.effectiveRecoverySeconds > 1 + 1e-8))
          reasons.push(`${SEASON_DPS_SKILL_FIELDS.reapingRate.label} 입력값이 수확 쿨타임 상한을 초과합니다.`);
        if (!automaticReap && channelRate > 0 && reapingRate > channelRate * b.useShare / 100 + 1e-8)
          reasons.push(`${SEASON_DPS_SKILL_FIELDS.reapingRate.label} 입력값이 채널링 중첩 상한을 초과합니다.`);
        if (b?.dotUptime === 0 || b?.useShare === 0)
          reasons.push("부식 광선이 적용되지 않은 상태에는 수확 성공 횟수를 입력할 수 없습니다.");
        if (combat || build.ss14Inputs?.theaCycle?.mode === "automatic" || beams.length !== 1
          || heroMechanics.some(m => m.kind === "nether-core-trigger" || m.kind === "elixir-scorch"))
          reasons.push("자동 발동이나 여러 부식 광선의 수확 순서를 함께 계산하는 구성은 미지원입니다.");
      }
    } else if ((reapingRate ?? 0) !== 0 || automaticReap) reasons.push("수확 성공 횟수 입력은 부식 광선에만 적용할 수 있습니다.");
    if (usesReapingTimes && hasDot && !dotWindows && b?.dotUptime !== 0)
      reasons.push(`수확: ${SEASON_DPS_SKILL_FIELDS.dotWindows.label} 미입력`);
    const tags = record?.tags ?? [];
    const core = build.skills?.active?.[direct.rowIndex]?.supports?.[1]?.supportId === "supports-ss14-clockwork-core";
    const clockworkHero = heroMechanics.some(m => m.kind === 'clockwork-main-only');
    if (clockworkHero && direct.rowIndex === 0 && !core) reasons.push('최후의 존재의 메인 스킬 두 번째 보조 칸에 클락워크 코어를 선택하세요.');
    const waxAndWane = basis?.moonStrike?.waxAndWane;
    const lunarRing = basis?.moonStrike?.lunarRing;
    const ringHitChance = b?.moonRingHitChance ?? b?.hitChance;
    const hitChance = lunarRing ? b?.hitChance*(1-lunarRing.damageShare)+ringHitChance*lunarRing.damageShare : b?.hitChance;
    if (lunarRing && combat && ringHitChance!==b?.hitChance)
      reasons.push('복합 발동에서는 문링 환형 공격과 다른 공격에 같은 적중률을 적용해야 합니다.');
    const eligibleBurst = !core && !(clockworkHero && direct.rowIndex !== 0) && hasHit && (tags.includes("Spell") || Boolean(waxAndWane))
      && !tags.some(t => ["Summon", "Sentry", "Channeled", "Channel", "Trigger", "Combo"].includes(t)) && !(entry?.values?.cooldown > 0);
    const possibleManualRate = basis?.rate * (b?.useShare / 100);
    let manualRate = possibleManualRate;
    if (core) {
      if (direct.rowIndex !== 0 || build.hero?.branchId !== "hero-ss14-the-ultimate-one"
        || !heroMechanics.some(m => m.kind === "clockwork-main-only")) reasons.push("클락워크 코어를 최후의 존재 히어로의 메인 스킬 두 번째 보조 칸에 연결하세요.");
      for (const key of ["coreTriggerRate", "coreUptime", "chainActive"]) if (!validValue(SEASON_DPS_SKILL_FIELDS[key], b?.[key])) reasons.push(`${SEASON_DPS_SKILL_FIELDS[key].label} 미입력`);
      if (b?.chainActive === 1) reasons.push("노예의 사슬의 대상 간 대미지 전이 계산은 미지원입니다. 미적용 상태에서는 코어 DPS를 계산합니다.");
      manualRate = b?.coreTriggerRate * b?.coreUptime / 100;
    }
    const theaEvents = report.componentProjection.rows.flatMap(r => r.mechanics ?? []).filter(m => m.kind === "thea-event");
    const observedHits = theaEvents.some(m => m.inputKey === "hitRate")
      || build.ss14Inputs?.theaCycle?.mode === "automatic" && build.ss14Inputs?.theaEvents?.hitRate !== undefined;
    const shotgun = direct.shotgun ?? { hits: 1, multiplier: 1 };
    if (shotgun.hits > 1 && combat && shotgun.delaysMs.some((ms, i, delays) =>
      !Number.isInteger(ms) || ms < 0 || i > 0 && ms < delays[i - 1]))
      reasons.push('지면 반사 위치에 따라 비행 시간이 달라집니다. 반사 보조에서 첫 적중부터 각 후속 적중까지 걸린 시간(ms)을 순서대로 입력하세요.');
    if (shotgun.hits > 1 && observedHits && !combat)
      reasons.push('반복 적중과 축복 수급을 함께 계산하려면 티아 전투 조건에서 복합 발동을 선택하세요.');
    if (observedHits && !combat) {
      const rate = build.ss14Inputs?.theaEvents?.hitRate;
      if (direct.id !== "skills-tlidb-com-cn-ice-lances" || report.coupledSkills.rows.length !== 1 || maxBurst > 0 || hasDot)
        reasons.push("적중 빈도와 축복의 공동 계산은 추가 발동 없는 얼음 송곳 1개 구성에서 지원합니다.");
      if (rate > possibleManualRate * b?.hitChance / 100 + 1e-8) reasons.push("축복 적중 횟수가 입력한 시전 배분·적중률로 가능한 횟수를 초과합니다.");
      manualRate = b?.hitChance > 0 ? rate / (b.hitChance / 100) : 0;
      if (theaEvents.some(m => m.castBonus === "projectile") && (b?.hitChance !== 100 || Math.abs(rate - build.ss14Inputs.theaEvents.projectileRate) > 1e-8))
        reasons.push("투사체 소모와 적중 수급을 함께 계산할 때 적중률 100%와 같은 시전·적중 빈도를 선택하세요.");
    }
    if (combat) {
      if (!validValue(SEASON_DPS_SKILL_FIELDS.castRate, b?.castRate)) reasons.push("복합 계산의 스킬별 일반 시전 횟수를 선택하세요.");
      else manualRate = b.castRate;
      if (manualRate > possibleManualRate + 1e-8) reasons.push("일반 시전 횟수가 시전 배분·속도로 가능한 횟수를 초과합니다.");
      if (tags.includes("Attack")) for (const key of ["multistrikeChance", "multistrikeIncrement", "resourceAttacks", "movementAttacks"])
        if (!validValue(SEASON_DPS_SKILL_FIELDS[key], b?.[key])) reasons.push(`${SEASON_DPS_SKILL_FIELDS[key].label} 미입력`);
    }
    if (tags.includes("Projectile") && report.componentProjection.rows.some(r => r.mechanics?.some(m => m.kind === "thea-event" && m.castBonus === "projectile"))
      && build.ss14Inputs?.theaEvents?.projectileRate > manualRate + 1e-8) reasons.push("입력한 투사체 시전 횟수가 시전 시간 배분·시전 속도로 가능한 횟수를 초과합니다.");
    let burstActivationRate = 0; let burstExtraRate = 0;
    if (maxBurst > 0 && eligibleBurst && manualRate > 0) {
      burstUsers++;
      const chargeTime = burstSpeed * burstMore > 0 ? 2 / (burstSpeed * burstMore) : Infinity;
      burstActivationRate = manualRate / Math.max(1, Math.ceil(chargeTime * manualRate - 1e-10));
      burstExtraRate = burstActivationRate * maxBurst;
    }
    let heroRate = 0;
    if (overload && (hero?.overloads ?? 0) > 0) {
      if (direct.rowIndex === 0) {
        if (!eligibleBurst || maxBurst <= 0) reasons.push("창의 오버로드의 주력 스킬은 매직 버스트를 활성화할 수 있어야 합니다.");
        heroRate = hero.overloads * (1 + maxBurst * overload.burstMultiplier);
      }
      if (eligibleBurst) {
        if (!finite(hero.burstActivations) || hero.burstActivations < 0 || hero.burstActivations > manualRate)
          reasons.push("일반 매직 버스트 발동 횟수는 일반 시전 횟수를 초과할 수 없습니다.");
        burstActivationRate = hero.burstActivations;
        burstExtraRate = burstActivationRate * maxBurst;
      }
    }
    // Unknown correlation among different damage rolls cannot be made uniform.
    const hitDistributions = basis?.weaponHands?.map(hand=>hand.pools) ?? [basis?.pools ?? []];
    if (luck !== 0 && hitDistributions.some(pools=>pools.filter(p => p.min !== p.max).length > 1)) reasons.push("대미지 행운의 여러 대미지 범위 합산 분포 미확인");
    const armor = input?.enemy?.armor;
    const reduction = Math.min(.8, armor / (.9 * armor + 30000));
    const projectilePen = tags.includes('Projectile') ? projectileArmorPenetration : 0;
    const resistanceBreakdown = type => {
      if(report.beforeDefense||type==='physical')return null;
      const fixed = type==='erosion' && finite(fixedErosion) ? fixedErosion : undefined;
      const base = fixed??input?.enemy?.[type];
      const spell = tags.includes('Spell')&&['fire','cold','lightning'].includes(type)?spellElementalPenetration:0;
      const scorch = combatState.scorched ? build.ss14Inputs.theaEvents.scorchResistance : 0;
      return {base,fixed:fixed!==undefined,penetration:penetration[type],spell,scorch,effective:base-scorch-penetration[type]-spell};
    };
    const pools = hitPools.map(p => {
      const armorReduction = reduction*(p.type==='physical'?1:.6);
      const armorMultiplier = report.beforeDefense ? 1 : 1 - armorReduction + (armorPenetration + projectilePen) / 100;
      const resistance=resistanceBreakdown(p.type);
      const resistanceMultiplier = resistance ? 1-resistance.effective/100 : 1;
      const typeTaken = effects.filter(e => isSeasonTargetDamageTaken(e.stat, p.type)).reduce((n, e) => n * (1 + e.value / 100), 1);
      const numbed = p.type === "lightning" ? 1 + (combatState.numbedEffect ?? 0) / 100 : 1;
      return { ...p, armorMultiplier, resistanceMultiplier, receivedMultiplier: typeTaken * numbed,
        ...(!report.beforeDefense&&{defense:{armor,armorReduction,armorPenetration,projectilePen,resistance}}),
        multiplier: armorMultiplier * resistanceMultiplier * typeTaken * numbed,
        min: p.min * armorMultiplier * resistanceMultiplier * typeTaken * numbed, max: p.max * armorMultiplier * resistanceMultiplier * typeTaken * numbed };
    });
    const min = pools.reduce((n, p) => n + p.min, 0); const max = pools.reduce((n, p) => n + p.max, 0);
    const coldCrit=effects.filter(e=>e.stat==='cold_critical_hit_damage');
    if(coldCrit.some(e=>e.operation!=='more'||!finite(e.value)||e.value<0))reasons.push('냉기 크리티컬 적중 추가 배율 미확인');
    const critDamage=(offense?.values.criticalDamage??150)/100*(offense?.values.criticalOnlyMultiplier??1);
    const coldMore=coldCrit.reduce((n,e)=>n*(1+e.value/100),1);
    const coldCritRatio=percent=>{
      const chance=(percent??0)/100;
      return (1+chance*(critDamage*coldMore-1))/(1+chance*(critDamage-1));
    };
    const meanPool = p => p.min+(p.max-p.min)*(luck>=0?(luck+1)/(luck+2):1/3);
    const meanHit = (parts,crit) => parts.reduce((n,p)=>n+meanPool(p)*(p.type==='cold'?coldCritRatio(crit?.effectiveCriticalChance):1),0);
    const mean = meanHit(pools,offense?.values);
    const criticalMultiplier = offense?.values.hitMultiplier ?? offense?.values.expectedDps / offense?.values.attributedDps;
    const taken = tags.includes("Spell") ? effects.filter(e => e.stat === "spell_damage_taken") : [];
    if (taken.some(e => e.operation !== "more" || !finite(e.value) || e.value < -100)) reasons.push("받는 주술 대미지 연산 미확인");
    const takenMultiplier = taken.reduce((n, e) => n * (1 + e.value / 100), 1)*netherMore(effects,'enemy_hit_damage_taken')*netherMore(effects,'enemy_all_damage_taken');
    const attributeAndTaken = offense?.values.attributeMultiplier * takenMultiplier;
    const weaponHands = offense?.values.weaponHands?.map(hand=>{
      const handPools=pools.filter(p=>p.weaponSlot===hand.slotIndex);
      const multiplier=hand.hitMultiplier*attributeAndTaken;
      const {weaponSpeedBase,weaponSpeed,conversionTrace}=basis.weaponHands[hand.slotIndex];
      return {...hand,weaponSpeedBase,weaponSpeed,landedHit:meanHit(handPools,hand)*multiplier,
        landedLightning:meanHit(handPools.filter(p=>p.type==='lightning'),hand)*multiplier,
        conversionTrace};
    });
    const landedHit = weaponHands ? weaponHands.reduce((sum,hand)=>sum+hand.landedHit,0)/2
      : mean * offense?.values.attributeMultiplier * criticalMultiplier * takenMultiplier;
    const hit = observedReaping && !hasHit ? 0 : landedHit * hitChance / 100;
    const autoNetherBurst=direct.rowIndex===0&&heroMechanics.some(m=>m.kind==='nether-core-trigger'&&m.trigger==='burst'&&m.rate>0);
    if(autoNetherBurst){burstActivationRate=0;burstExtraRate=0;}
    if (waxAndWane && (heroRate>0 || autoNetherBurst || overload && hero?.overloads>0 && eligibleBurst))
      reasons.push('달의 운동과 히어로 자동 발동의 매직 버스트 적용 범위를 확인해야 합니다.');
    const ordinaryRate = Math.max(0,manualRate-burstActivationRate);
    const burstRate = burstActivationRate+burstExtraRate;
    let waxWeaponShares;
    if (waxAndWane && burstActivationRate>0 && weaponHands?.length===2) {
      const [main,off] = weaponHands;
      if (Math.abs(main.landedHit-off.landedHit)>1e-8 || Math.abs(main.landedLightning-off.landedLightning)>1e-8) {
        const required=[['moonNormalMainShare',ordinaryRate],['moonBurstMainShare',burstRate]];
        for (const [field,rate] of required) if (rate>0 && !validValue(SEASON_DPS_SKILL_FIELDS[field],b?.[field]))
          reasons.push(`${SEASON_DPS_SKILL_FIELDS[field].label} 미입력`);
        waxWeaponShares={normal:(b?.moonNormalMainShare??0)/100,burst:(b?.moonBurstMainShare??0)/100};
      }
    }
    const weaponShareValue = (field,share) => weaponHands[0][field]*share+weaponHands[1][field]*(1-share);
    const ordinaryHit = waxWeaponShares ? weaponShareValue('landedHit',waxWeaponShares.normal) * hitChance/100 : hit;
    const burstHit = waxWeaponShares ? weaponShareValue('landedHit',waxWeaponShares.burst) * hitChance/100 : hit;
    const waxBurstMultiplier = 1+(waxAndWane?.burstBonus??0)/100;
    const manualDps = ordinaryHit * shotgun.multiplier * ordinaryRate;
    // The activating manual cast also receives Spell Burst-only damage.
    const burstDps = burstHit * shotgun.multiplier * burstRate * burstHitMore * waxBurstMultiplier;
    const repeatDps = landedHit * (iceRing ? b?.repeatHits : 0);
    const heroDps = hit * shotgun.multiplier * heroRate * burstHitMore;
    let dotDps = 0, lightningDotDps = 0, lightningReapingDps = 0, frostDps = 0, frostActiveDps = 0;
    const fixedNumbedBonus = report.componentProjection.fixedNumbed?.bonus ?? 0;
    const affliction=input?.enemy?.affliction??0;
    const afflictionMultiplier = 1 + affliction / 100 * netherAfflictionEffect(effects);
    const dotDefense = parts => ({affliction,afflictionMultiplier,resistances:[...new Set(parts.map(p=>p.type))]
      .flatMap(type=>{const resistance=resistanceBreakdown(type);return resistance?[{type,...resistance}]:[];})});
    let dotBreakdown;
    let reapingDps = 0, appliedReapingOverlap;
    if ((hasDot || entry?.damageCapabilities?.dot) && !validValue(SEASON_DPS_SKILL_FIELDS.dotUptime, dotUptime))
      reasons.push(`${SEASON_DPS_SKILL_FIELDS.dotUptime.label} 미입력`);
    if (hasDot || entry?.damageCapabilities?.dot || frostActive) {
      if (!validValue(SEASON_DPS_ENEMY_FIELDS.affliction, input?.enemy?.affliction)) reasons.push(`${SEASON_DPS_ENEMY_FIELDS.affliction.label} 미입력`);
    }
    if (hasDot || frostActive) {
      const form = mechanicPage(build, "Damage_Form"); const afflictionPage = mechanicPage(build, "Amplified_Damage_Over_Time");
      if (!form?.body.includes("The following mechanics will not affect Damage Over Time: Accuracy and Evasion, Armor, Critical Strike")
        || !afflictionPage?.body.includes("Each point of Affliction increases Damage Over Time")) reasons.push("SS14 지속 대미지·심화 공식 근거가 없거나 변경되었습니다.");
      const afflictionEffects = effects.filter(e => e.stat === "affliction_effect");
      if (afflictionEffects.some(e => !['add_percent','more'].includes(e.operation) || !finite(e.value))) reasons.push("심화 효과의 연산 미지원");
      const receivedMore = netherMore(effects,'enemy_dot_damage_taken') * netherMore(effects,'enemy_all_damage_taken');
      const mitigateDot = p => {
        const resistance=resistanceBreakdown(p.type);
        const taken = effects.filter(e => isSeasonTargetDamageTaken(e.stat, p.type)).reduce((n,e) => n * (1 + e.value / 100), 1);
        const part=(p.min + p.max) / 2 * taken * (resistance?1-resistance.effective/100:1)
          * (p.type === "lightning" ? 1 + (combatState.numbedEffect ?? 0) / 100 : 1);
        return part * offense?.values.attributeMultiplier * afflictionMultiplier * receivedMore;
      };
      if (frostActive) {
        frostActiveDps=(frost.dotPools??[]).reduce((sum,p)=>sum+mitigateDot(p),0);
        frostDps=frostActiveDps*frostUptime/100;
      }
      const activeDotDps=dotPools.reduce((sum,p)=>sum+mitigateDot(p),0);
      const activeLightningDotDps=dotPools.filter(p=>p.type==='lightning').reduce((sum,p)=>sum+mitigateDot(p),0);
      if(hasDot){
        dotDps = activeDotDps * dotUptime / 100;
        lightningDotDps = activeLightningDotDps * dotUptime / 100;
        dotBreakdown = { active: round(activeDotDps), uptime: dotUptime };
      }
      const reapedUptime = frostActive ? frostUptime : b?.dotUptime;
      if ((hasDot || frostActive) && reapRate > 0 && finite(reapDuration) && reapedUptime > 0) {
        const overlap = observedReaping ? 100 : b.reapingOverlap ?? (reapedUptime === 100 ? 100 : undefined);
        const field = SEASON_DPS_SKILL_FIELDS.reapingOverlap;
        const issue=!validValue(field,overlap)?'missing':reapedUptime===100&&overlap!==100?'requires-full-uptime':null;
        if(validBinding){
          // The triggered and manual ground share the reapable damage state.
          const id=frostActive?FROST_TERRA_ID:direct.id;
          const slots=reapAllocations.get(id)??[];
          slots.push({rowIndex:direct.rowIndex,itemId:direct.id,overlap,issue});
          reapAllocations.set(id,slots);
        }
        if (issue==='missing') reasons.push(`${field.label} 미입력`);
        else if (issue==='requires-full-uptime')
          reasons.push(`${field.label} 입력값은 유지율 100%일 때 100%여야 합니다.`);
        else {
          appliedReapingOverlap = overlap;
          const reapWeight = reapDuration * reapRate * overlap / 100;
          reapingDps = (frostActive ? frostActiveDps : activeDotDps) * reapWeight;
          if (!frostActive) lightningReapingDps = activeLightningDotDps * reapWeight;
        }
      }
    }
    const fissure = entry?.mechanics?.find(m => m.kind==='groundshaker-fissure');
    let fissureResult;
    if (fissure) {
      let hits = b?.fissureHits;
      const recovery = effects.filter(e=>e.stat==='demolisher_charge_recovery_speed' && e.operation==='add_percent').reduce((total,e)=>total+e.value,0);
      const interval = fissure.interval/(1+recovery/100);
      const max = Math.min(manualRate,1/interval);
      let times;
      if (timedFissure(build)) {
        const {seconds,warmup} = build.ss14Inputs.theaCycle;
        const label = SEASON_DPS_SKILL_FIELDS.fissureTimes.label;
        times = observedTimeList(b?.fissureTimes) ?? (hits === 0 ? [] : null);
        if (!times) reasons.push(`${label} 미입력`);
        else if (times.some(time=>time>=seconds+warmup-1e-8)) reasons.push(`${label}은 측정 종료 전이어야 합니다.`);
        else if (times.some((time,i)=>time*manualRate+1e-8<i+1)) reasons.push(`${label}에 해당하는 일반 시전 횟수가 부족합니다.`);
        else if (times.length && (b?.multistrikeChance > 0 || report.componentProjection.rows.some(row=>
          row.mechanics?.some(m=>m.kind==='thea-combat-event' && m.castBonus==='attack'))))
          reasons.push('균열을 만든 시점의 연속 공격 배율 또는 공격 발동 효과가 필요한 경우에는 균열 후속 적중을 계산할 수 없습니다.');
        hits = times?.filter(time=>time>=warmup).length / seconds;
      } else if (!validValue(SEASON_DPS_SKILL_FIELDS.fissureHits,hits)) reasons.push(`${SEASON_DPS_SKILL_FIELDS.fissureHits.label} 미입력`);
      else if (hits>0 && (combat || build.ss14Inputs?.theaCycle?.mode==='automatic'))
        reasons.push('자동 은총과 균열 후속 적중을 함께 계산하려면 티아 전투 조건에서 복합 발동을 선택하세요.');
      else if (!finite(interval) || interval<=0 || hits>max+1e-8)
        reasons.push(`${SEASON_DPS_SKILL_FIELDS.fissureHits.label} 입력값이 시전·파괴 충전 상한을 초과합니다.`);
      fissureResult={interval,max,hits,hitMultiplier:fissure.hitMultiplier,...(times&&{times})};
    }
    const extraDps = (entry?.mechanics?.some(m => m.kind === "swamp-move") ? landedHit * b?.extraHits : 0)
      + (fissureResult && !timedFissure(build) ? landedHit*fissureResult.hitMultiplier*fissureResult.hits : 0);
    const nether=netherCorePlan(heroMechanics,{rowIndex:direct.rowIndex,tags,eligibleBurst,maxBurst,burstChargeSpeed:burstSpeed*burstMore,
      hit:hit*shotgun.multiplier*(autoNetherBurst?burstHitMore:1),dotDps,combat,manualRate,cardDetail:record?.detail??''});
    reasons.push(...nether.blockers);
    const cost=core||!castCostVerified ? null : manualSkillCost(build,report,entry,direct.rowIndex,tags,effects);
    const channeled=tags.includes("Channeled")||tags.includes("Channel");
    const chargeTimes = channeled && timed ? observedTimeList(b?.channelCostTimes) : null;
    const requiresManualUse=manualRate>0 || hasDot&&dotUptime>0&&b?.useShare>0 || chargeTimes?.length>0;
    if (requiresManualUse) reasons.push(...manualCastCostIssues(report,cost,skillName));
    else if (b?.useShare>0&&cost?.reason) reasons.push(cost.reason);
    if (chargeTimes?.length && !cost) reasons.push(`${skillName} 채널링 차감에 적용할 시전 비용을 확인하세요.`);
    const cycle = build.ss14Inputs?.theaCycle;
    const measuredChargeRate = chargeTimes ? chargeTimes.filter(time=>time>=cycle.warmup).length / cycle.seconds : null;
    if (chargeTimes?.some(time=>time>=cycle.warmup+cycle.seconds-1e-8))
      reasons.push(`${SEASON_DPS_SKILL_FIELDS.channelCostTimes.label}은 측정 종료 전이어야 합니다.`);
    const channelCost=channeled && (combat || build.ss14Inputs?.theaCycle?.mode !== "automatic")
      && cost && !cost.reason && (chargeTimes || (cost.mana>0 || cost.life>0) && finite(possibleManualRate) && possibleManualRate>0)
      ? {rate:measuredChargeRate??b?.channelCostRate??null,max:possibleManualRate,
        ...(chargeTimes && {times:chargeTimes}),
        valid:!!chargeTimes || validValue(SEASON_DPS_SKILL_FIELDS.channelCostRate,b?.channelCostRate) && b.channelCostRate<=possibleManualRate+1e-8}
      : null;
    const resourceRate=channeled ? (channelCost?.valid ? channelCost.rate : null) : manualRate;
    const zeroCost=cost?.mana===0 && cost.life===0;
    const rateKnown=cost&&!cost.reason&&(zeroCost||finite(resourceRate));
    const dps = manualDps + burstDps + repeatDps + heroDps + dotDps + reapingDps + extraDps + nether.dps + frostDps;
    if (!reasons.length && (!finite(dps) || dps < 0)) reasons.push("전체 DPS를 산출할 입력이 부족하거나 계산 범위를 벗어났습니다.");
    const permafrostHitDps=frost && !reasons.length && !blockers.length && !combat && build.ss14Inputs?.theaCycle?.mode!=='automatic'
      ? round(manualDps+burstDps+repeatDps+heroDps) : null;
    if (frost) {
      if (timed && !dotWindows) reasons.push(`동토: ${SEASON_DPS_SKILL_FIELDS.dotWindows.label} 미입력`);
      if (!timed && frostActive && (combat || build.ss14Inputs?.theaCycle?.mode==='automatic'))
        reasons.push('자동 은총에서 동토의 적용 구간을 계산하려면 복합 계산을 켜세요.');
      if (!timed && !validValue(SEASON_DPS_SKILL_FIELDS.permafrostUptime,frostUptime))
        reasons.push(`${SEASON_DPS_SKILL_FIELDS.permafrostUptime.label} 미입력`);
      if (frostActive) {
        if (!validValue(SEASON_DPS_SKILL_FIELDS.permafrostCharge,b?.permafrostCharge))
          reasons.push(`${SEASON_DPS_SKILL_FIELDS.permafrostCharge.label} 미입력`);
        else if (!frost.dotPools?.length) reasons.push('동토에 적용되는 지속 대미지 효과를 확인할 수 없습니다.');
      }
    }
    // These hit paths scale the same landed hit. Isolate the multiplier on
    // lightning left after conversion without toggling any threshold effects.
    const lightningShare = weaponHands ? weaponHands.reduce((sum,hand)=>sum+hand.landedLightning,0)/(2*landedHit)
      : pools.filter(p=>p.type==='lightning').reduce((sum,p)=>sum+meanPool(p),0)/mean;
    const lightningHitDps = waxWeaponShares
      ? (weaponShareValue('landedLightning',waxWeaponShares.normal)*ordinaryRate
        + weaponShareValue('landedLightning',waxWeaponShares.burst)*burstRate*burstHitMore*waxBurstMultiplier)*hitChance/100
      : lightningShare>0?(manualDps+burstDps+repeatDps+heroDps+extraDps)*lightningShare:0;
    const fixedNumbedShare = fixedNumbedBonus>0 ? fixedNumbedBonus/(100+fixedNumbedBonus) : 0;
    const observedNumbedEffect = combatState.numbedEffect ?? 0;
    const observedNumbedShare = observedNumbedEffect>0 ? observedNumbedEffect/(100+observedNumbedEffect) : 0;
    return { id: direct.id, rowIndex: direct.rowIndex, supported: reasons.length === 0, blockers: [...new Set(reasons)], numbedOnHit,
      values: { dps: reasons.length ? null : round(dps), averageHit: reasons.length ? null : round(hit),
        ...(frost&&{permafrostDps:reasons.length?null:round(frostDps)}),
        averageLandedHit: reasons.length || !pools.length ? null : round(landedHit),
        fixedNumbedHitDps: reasons.length ? null : round(lightningHitDps * fixedNumbedShare),
        fixedNumbedDotDps: reasons.length ? null : round(lightningDotDps * fixedNumbedShare),
        fixedNumbedReapingDps: reasons.length ? null : round(lightningReapingDps * fixedNumbedShare),
        manualDps: reasons.length ? null : round(manualDps), spellBurstDps: reasons.length ? null : round(burstDps),
        repeatDps: reasons.length ? null : round(repeatDps + extraDps), heroDps: reasons.length ? null : round(heroDps), dotDps: reasons.length ? null : round(dotDps), reapingDps: reasons.length ? null : round(reapingDps), netherDps:reasons.length?null:round(nether.dps), manualRate: round(manualRate), burstActivationRate: round(burstActivationRate), burstExtraRate: round(burstExtraRate) },
      nether, shotgun, takenMultiplier, manaPerUse:round(cost?.mana), lifePerUse:round(cost?.life),
      ...(cost?.observation&&{castCostObservation:cost.observation}),
      fixedNumbedPerCast:reasons.length ? null : round(lightningShare>0 ? hit*lightningShare*fixedNumbedShare : 0),
      ...(finite(permafrostHitDps) && {permafrostHitDps}),
      ...(!reasons.length && frostActive && {permafrostBreakdown:{active:round(frostActiveDps),uptime:frostUptime,charge:frost.charge}}),
      ...(dotBreakdown && !reasons.length && {dotBreakdown}),
      ...(!reasons.length&&dotBreakdown&&{dotDefense:dotDefense(dotPools)}),
      ...(!reasons.length&&frostActive&&{frostDefense:dotDefense(frost.dotPools??[])}),
      ...(!reasons.length && appliedReapingOverlap !== undefined && {reapingOverlap:appliedReapingOverlap}),
      ...(dotWindows && {dotWindows}),
      ...(fissureResult && {fissure:fissureResult}),
      ...(!reasons.length && pools.length && !weaponHands && { hitBreakdown:{
        mitigatedMean:round((min+max)/2*takenMultiplier),
        rollMean:round(pools.reduce((sum,pool)=>sum+meanPool(pool),0)*takenMultiplier),
        attributeMultiplier:offense?.values.attributeMultiplier,
        hitChance,
      }}),
      ...(observedReaping && reaping && { reaping: {
        duration: reaping.effectiveDurationSeconds, cooldown: reaping.effectiveRecoverySeconds, rate: reapingRate,
        ...(reapTimes && {times:reapTimes}),
        ...(reaping.beamCount>1 && {beamCount:reaping.beamCount}),
      } }),
      ...(channelCost && {channelCost}),
      ...(basis?.moonStrike && {moonStrike:{...basis.moonStrike,waxWeaponShares,
        ...(lunarRing && {lunarRing:{...lunarRing,hitChance:ringHitChance}})}}),
      ...(!reasons.length && weaponHands && {weaponHands}),
      manualManaPerSecond:zeroCost?0:rateKnown?round(cost.mana*resourceRate):null,
      manualLifePerSecond:zeroCost?0:rateKnown?round(cost.life*resourceRate):null,
      pools, mechanics: entry?.mechanics ?? [],
      combat: combat ? { tags, rate: basis?.rate, increasedAttackSpeed: evaluationAttackSpeed(direct.trace), luck,
        elixirScorch: report.componentProjection.rows.some(r => r.mechanics?.some(m => m.kind === "elixir-scorch")),
        attributeMultiplier: offense?.values.attributeMultiplier, critical: offense?.values, landedHit, takenMultiplier, penetration,
        numbedHitBonus: observedNumbedShare>0
          ? pools.filter(p=>p.type==='lightning').reduce((n,p)=>n+meanPool(p),0) * offense?.values.attributeMultiplier
            * criticalMultiplier * takenMultiplier * observedNumbedShare : 0,
        burstHitMore, maxBurst, burstChargeSpeed: burstSpeed * burstMore, eligibleBurst, hasDot,
        dotWithoutAffliction: hasDot ? dotDps / afflictionMultiplier : 0,
        numbedDotWithoutAffliction: lightningDotDps * observedNumbedShare / afflictionMultiplier,
        frostWithoutAffliction: frostActiveDps / afflictionMultiplier,
        ...(frostActive && { frostSource: JSON.stringify([frost.dotPools, offense?.values.attributeMultiplier]) }),
        afflictionEffect: netherAfflictionEffect(effects),
        igniteSupportEffects: direct.igniteSupportEffects, effects } : undefined };
  });
  const manualResources=manualResourceBalance(rows,report.character?.survival?.manaScenarios??[],input?.skills);
  const reapingAllocationGroups=[...reapAllocations].filter(([,slots])=>slots.length>1).map(([id,slots])=>{
    const total=slots.reduce((sum,slot)=>sum+(slot.issue?0:slot.overlap),0);
    return {id,slots,total,overflow:total>100+1e-8};
  });
  const reapingOverlapOverflow=reapingAllocationGroups.filter(group=>group.overflow).flatMap(group=>group.slots
    .filter(slot=>!slot.issue&&slot.overlap>0).map(slot=>slot.rowIndex));
  if (reapingOverlapOverflow.length)
    blockers.push("같은 지속 스킬의 수확 겹침 비율 합계가 100%를 초과합니다.");
  if (manualResources?.shareOverflow) blockers.push('스킬 시전 시간 배분의 합이 100%를 초과합니다. 조건에서 각 스킬의 배분을 확인하세요.');
  if (burstUsers > 1) blockers.push("여러 스킬이 공유하는 매직 버스트 충전·발동 순서 미확인");
  const persistentGroups = new Map();
  const dotUptimeOverflow = [], dotExclusiveUnconfirmed = [];
  const dotAllocationGroups = [];
  const dotUptimeFields = {};
  const dotWindowIssues = new Map();
  const dotWindowConflicts = [];
  const dotWindowBounds = [];
  const addWindowIssue = (reason, indices) => {
    blockers.push(reason);
    dotWindowIssues.set(reason,[...new Set([...(dotWindowIssues.get(reason)??[]),...indices])].sort((a,b)=>a-b));
  };
  if (automaticCycle) {
    const addPersistentRow=(id,row)=>{
      const group=persistentGroups.get(id)??[];
      group.push(row);
      persistentGroups.set(id,group);
    };
    for(const row of rows.filter(row=>row.supported)){
      if(row.combat?.hasDot ? row.dotWindows ? row.dotWindows.length : input?.skills?.[row.rowIndex]?.dotUptime>0 : row.values.dotDps>0)
        addPersistentRow(row.id,row);
      if(row.permafrostBreakdown)addPersistentRow(FROST_TERRA_ID,row);
    }
    for (const [id,group] of persistentGroups) {
      if (group.length < 2 && !group[0].dotWindows) continue;
      if (!combat) {
        blockers.push("자동 은총에서 동일 지속 스킬의 중첩 구간을 계산하려면 복합 계산을 켜세요.");
        continue;
      }
      const missing = group.filter(row=>!row.dotWindows).map(row=>row.rowIndex);
      if (missing.length) {
        addWindowIssue("동일 지속 스킬의 적용 구간을 각 칸에 입력하세요.",missing);
        continue;
      }
      const end = build.ss14Inputs.theaCycle.warmup + build.ss14Inputs.theaCycle.seconds;
      const windows = group.flatMap(row=>row.dotWindows.map(([start,stop])=>({start,stop,index:row.rowIndex}))).sort((a,b)=>a.start-b.start);
      const invalid = new Set();
      let furthest, conflict;
      for (const window of windows) {
        if (window.stop>end+1e-8) {
          invalid.add(window.index);
          dotWindowBounds.push({id,rowIndex:window.index,start:window.start,stop:window.stop,end});
        }
        if (furthest && window.start<furthest.stop) {
          invalid.add(window.index);
          invalid.add(furthest.index);
          if (!conflict && furthest.index !== window.index && window.stop <= end + 1e-8 && furthest.stop <= end + 1e-8)
            conflict = {id,start:window.start,stop:Math.min(window.stop,furthest.stop),slots:[furthest.index,window.index].sort((a,b)=>a-b)};
        }
        if (!furthest || window.stop>furthest.stop) furthest=window;
      }
      if (invalid.size) {
        if (conflict) dotWindowConflicts.push(conflict);
        const scope=group.length===1?'지속 대미지':'동일 지속 스킬의';
        addWindowIssue(`${scope} 적용 구간은 겹치지 않게 측정 종료 시각 안에서 입력하세요.`,invalid);
        continue;
      }
    }
  }
  for (const [id,slots] of dotAllocations) {
    if(slots.length<2)continue;
    const applied=slots.filter(slot=>slot.uptime>0);
    const total=applied.reduce((sum,{uptime})=>sum+uptime,0);
    const overflow=total>100+1e-8;
    dotAllocationGroups.push({id,total,slots,overflow});
    if (overflow) {
      for (const {rowIndex,field} of applied) {
        dotUptimeOverflow.push(rowIndex);
        dotUptimeFields[rowIndex] = field;
      }
      blockers.push("동일 지속 스킬의 중첩 구간을 한 번씩만 센 유지율 합계가 100%를 초과합니다.");
    } else if (applied.length>1 && applied.some(slot=>!slot.confirmed)) {
      dotExclusiveUnconfirmed.push(...applied.filter(slot=>!slot.confirmed).map(({rowIndex})=>rowIndex));
      blockers.push("동일 지속 스킬의 중첩 시간을 대미지가 적용된 한 칸에만 배정한 뒤 슬롯별 유지율 배정을 확인하세요.");
    }
  }
  for (const id of new Set(rows.filter(r => Number.isInteger(r.minionMaximum)).map(r => r.id))) {
    const group = rows.filter(r => r.id === id && Number.isInteger(r.minionMaximum));
    const maximum = Math.max(...group.map(row => row.minionMaximum));
    if (group.length > 1 && group.reduce((n, r) => n + (input?.skills?.[r.rowIndex]?.minionCount ?? 0), 0) > maximum)
      blockers.push("같은 종류의 소환체가 여러 스킬 칸에서 수량 상한을 초과해 중복 합산됩니다.");
  }
  const syntheticRows = rows.filter(r=>r.syntheticTroop && Number.isInteger(r.minionMaximum));
  if (new Set(syntheticRows.map(r=>r.id)).size > 1
    && syntheticRows.reduce((count,r)=>count+(input?.skills?.[r.rowIndex]?.minionCount??0),0)>syntheticTroopMapCap)
    blockers.push(`스마트 웨폰 소환체 수 합계가 맵 상한(${syntheticTroopMapCap}기)을 초과했습니다.`);
  blockers.push(...rows.flatMap(r => r.blockers));
  const unique = [...new Set(blockers)];
  const supported = rows.length > 0 && unique.length === 0;
  return { supported, scope: "ss14-fixed-scenario-full-dps", dps: supported ? round(rows.reduce((n, r) => n + r.values.dps, 0)) : null,
    rows, blockers: unique, heroMechanics, burstRecovery, observedCommandRow:sharedCommand?.rowIndex,
    ...(!report.beforeDefense&&finite(fixedErosion)&&{fixedErosionResistance:fixedErosion}),
    ...(reapingOverlapOverflow.length && { reapingOverlapOverflow }),
    ...(reapingAllocationGroups.length && { reapingAllocationGroups }),
    ...(dotUptimeOverflow.length && { dotUptimeOverflow, dotUptimeFields }),
    ...(dotExclusiveUnconfirmed.length && { dotExclusiveUnconfirmed }),
    ...(dotAllocationGroups.length && { dotAllocationGroups }),
    ...(dotWindowIssues.size && { dotWindowIssues:Object.fromEntries(dotWindowIssues) }),
    ...(dotWindowConflicts.length && { dotWindowConflicts }),
    ...(dotWindowBounds.length && { dotWindowBounds }),
    manualResources,
    receipts: [...Object.values(rules.pages).filter(p => p.locale === "en"), ...rows.flatMap(r => r.receipts ?? []),
      ...(sharedCommand?.receipt ? [sharedCommand.receipt] : []),
      ...(channelPage ? [channelPage] : []),
      ...["Damage_Form", "Amplified_Damage_Over_Time", "Whimsy", "Whimsy_Signal", "Whimsy_Explosion", "Ingenuity_Overload",
        ...(rows.some(row => row.mechanics?.some(m => m.kind === "wilting-beam-reaping")) ? ["Damage_Over_Time_Reaping"] : [])].map(slug => mechanicPage(build, slug)).filter(Boolean)],
    limitation: "입력한 적 1명·시전 시간 배분·적중률·현재 효과 상태에서 선택된 공격을 합산합니다. 자원 지속 가능성이나 실전 유지율은 자동 예측하지 않습니다. 적중률·발동 횟수·지속 대미지 유지율은 관측값이며, 미해석 효과가 남으면 전체 DPS를 표시하지 않습니다." };
}

function evaluationAttackSpeed(trace = []) {
  return trace.filter(e => e.stat === "skill-attack-speed" && ["add", "add_percent"].includes(e.operation)).reduce((n, e) => n + (e.resolvedValue ?? e.value ?? 0), 0);
}
