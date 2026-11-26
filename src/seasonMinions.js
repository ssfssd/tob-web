import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { netherMore } from './seasonNetherRemaining.js';
import { mechanicPage } from "./seasonMechanicInputs.js";
import { checkSeasonSupportHost, MANIACAL_ARMY_ID } from "./seasonSupport.js";
import { readSkillMainStats } from "./seasonOffense.js";
import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { SS14_THEA_EFFECTS } from "./data/ss14TheaEffects.generated.js";
import { SEASON_GEAR_LEVEL_STATS, fixedSeasonErosionResistance, isSeasonTargetDamageTaken, seasonMinionDamageConversion } from './seasonGearEffects.js';
import { evaluateTlidbSkillDamage } from './tlidbSkillDamageRuntime.js';
import { resolveSeasonSkillLevel, seasonOverlevelDamageMultiplier } from './seasonSkillLevels.js';
import { hasObservedDarkGate } from './seasonMindInfusion.js';
import { theaState } from './seasonTheaState.js';

export const SEASON_MINION_FIELDS = {
  minionCount: { label: "해당 종류의 현재 소환체 수", min: 0, max: 8, integer: true },
  minionUptime: { label: "소환체 공격 유지율 (%)", min: 0, max: 100 },
  minionBaseMin: { label: "소환체 보정 전 기본 최소 대미지", min: 0, max: 1e12 },
  minionBaseMax: { label: "소환체 보정 전 기본 최대 대미지", min: 0, max: 1e12 },
  minionCriticalRating: { label: "소환체 기본 크리티컬 수치", min: 0, max: 100000 },
  command: { label: "현재 통솔 수치", min: -100, max: 100 },
  minionBasicRate: { label: "소환체 한 마리의 기본 스킬 시전 횟수 (초당)", min: 0, max: 1000 },
  minionSpecialRate: { label: "소환체 한 마리의 돌진 스킬 시전 횟수 (초당)", min: 0, max: 1000 },
  minionEnhancedRate: { label: "소환체 한 마리의 강화 스킬 시전 횟수 (초당)", min: 0, max: 1000 },
  minionEmpowerRate: { label: "소환체 한 마리의 버프 스킬 시전 횟수 (초당)", min: 0, max: 1000 },
  minionUltimateRate: { label: "소환체 한 마리의 궁극기 시전 횟수 (초당)", min: 0, max: 1000 },
  growth: { label: "현재 성장치", min: 100, max: 1000 },
  enemyFrostbite: { label: "대상의 현재 빙결 수치", min: 0, max: 100000 },
  frostEmpowerActive: { label: "프리징 릴리즈 지속 중 (0 또는 1)", min: 0, max: 1, integer: true },
  ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`frostEmpower${i + 1}`, { label: `프리징 릴리즈 버프 ${i + 1}의 남은 사용 횟수 (없으면 0)`, min: 0, max: 5, integer: true }])),
};
const common = ["minionCount", "minionUptime", "minionBaseMin", "minionBaseMax", "minionCriticalRating", "minionBasicRate"];
export const seasonMinionFieldKeys = profile => [...common, ...(profile.kind === "synthetic-troop" ? ["command", "minionSpecialRate"]
  : ["minionEnhancedRate", "minionEmpowerRate", "minionUltimateRate", "growth", "enemyFrostbite", "frostEmpowerActive", ...Array.from({ length: 5 }, (_, i) => `frostEmpower${i + 1}`)])];
export function seasonObservedCommandSlot(build) {
  const slots = [...(build?.skills?.active ?? []), ...(build?.skills?.passive ?? [])];
  const synthetic = slot => SS14_CARDS_EN.records[slot?.skillId]?.tags?.includes("Synthetic Troop");
  const army = slots.findIndex(slot=>synthetic(slot) && slot.supports?.some(s=>s?.supportId===MANIACAL_ARMY_ID));
  const darkGate = hasObservedDarkGate(build);
  if (army<0 && !darkGate) return -1;
  const guard = slots.findIndex(slot=>seasonMinionProfile(slot?.skillId)?.kind==="synthetic-troop");
  return guard >= 0 ? guard : army >= 0 ? army : slots.findIndex(synthetic);
}
export const seasonCommandDamageMultiplier = command => 1 + Math.max(0, command) * .03;
export function seasonMinionProfile(id, cards = SS14_CARDS_EN) {
  const card = cards.records[id];
  if (card?.season !== "SS14" || card.status !== "collected-preview") return null;
  const detail = card.detail.split("Details\n")[1];
  if (card.sourceRecordKey === "Summon_Frost_Magus" && detail === "Summon Frost Magus:\nSummons 1 Frost Magus\nThis skill summons up to 1 Minions\n+1 Max Frostbite Rating for the Minions summoned by this skill for every +1 Max Frostbite Rating\nSpirit Magi become undefeatable\nWhen Spirit Magi become undefeatable, they gain Reconjuring\nOrigin of Spirit Magus :\nGains Origin of Ice, restoring 3.825 % of Max Life and Max Energy Shield per second to the summoner\nFrost Magus:\nBase Skill: Glacier Ripples.\nEmpower Skill: Frost Release.\nEnhanced Skill: Permafrost Cast.\nUltimate: Ice Earthshaker.") return {
    card, kind: "spirit-magus", type: "cold", damageForm: "Spell", skills: [{ slug: "Glacier_Ripples", field: "minionBasicRate" },
      { slug: "Permafrost_Cast", field: "minionEnhancedRate" }, { slug: "Frost_Release", field: "minionEmpowerRate" }, { slug: "Ice_Earthshaker", field: "minionUltimateRate" }] };
  if (card.sourceRecordKey !== "Summon_Machine_Guard") return null;
  if (detail !== "Summon Machine Guard:\nSummons 1 Machine Guard\nThis skill summons up to 4 Minions\n0.5 % Skill Area for Minions summoned by this skill for every 1 Command") return null;
  return { card, kind: "synthetic-troop", type: "physical", damageForm: "Attack", skills: [{ slug: "Overpower", field: "minionBasicRate" }, { slug: "Onslaught_Punch", field: "minionSpecialRate" }] };
}
export function inspectSeasonMinionLevel(profile, level) {
  const {card} = profile;
  const item = { id:card.itemId, categoryId:'skills', tlidbText:{en:{...card,sourcePageVersion:'SS14'}} };
  const resolved = resolveSeasonSkillLevel(item, level);
  if (resolved.blockers.length || !resolved.receipt) return null;
  const body = resolved.item.tlidbText.en.detail.split("\nDetails\n").at(-1);
  const count = body.match(/^This skill summons up to (\d+) Minions$/mu);
  const slotCap = Number(count?.[1]);
  // The level rows change the cap or the separate Origin recovery, not the summon attack descriptions.
  const variable = profile.kind === 'synthetic-troop' ? /^This skill summons up to \d+ Minions$/mu
    : /^Gains Origin of Ice, restoring [\d.]+ % of Max Life and Max Energy Shield per second to the summoner$/mu;
  const baseline = card.detail.split("\nDetails\n").at(-1);
  if (!Number.isInteger(slotCap) || slotCap < 1 || !variable.test(body)
    || body.replace(variable,'') !== baseline.replace(variable,'')) return null;
  return { slotCap, receipt:resolved.receipt };
}
const syntheticTroopMapMaximum = 6;
export function seasonSyntheticTroopMapCap(report) {
  const capLinks = report.components.filter(row=>row.category==="supports").flatMap(row=>
    (row.calculations ?? []).filter(link=>!link.blockers.length &&
      link.mechanics?.some(m=>m.kind==="synthetic-troop-map-cap-halved")).map(link=>({id:row.id,link})));
  if (!capLinks.length) return syntheticTroopMapMaximum;
  const hosts = new Map(report.components.filter(row=>row.category==="skills").flatMap(row=>
    (row.calculations ?? []).map(entry=>[entry.rowIndex,{entry,record:SS14_CARDS_EN.records[row.id]}])));
  const halved = capLinks.some(({id,link})=>{
    const host = hosts.get(link.rowIndex);
    return host?.record?.tags?.includes("Synthetic Troop") && checkSeasonSupportHost(id,host.record,host.entry,link.rowIndex) === true;
  });
  return halved ? Math.max(1,Math.ceil(syntheticTroopMapMaximum/2)) : syntheticTroopMapMaximum;
}
export function seasonMinionMaximum(effects, slotCap, mapCap) {
  const bonus = effects.reduce((sum, effect) => sum +
    (effect.stat === 'max_summonable_synthetic_troops' && effect.operation === 'add'
      && Number.isInteger(effect.value) && effect.value > 0 ? effect.value : 0), 0);
  return Math.min(mapCap, slotCap + bonus);
}
export function calculateSeasonMinion(build, report, entry, profile, effects, validValue, enemyFields, mapCap, sharedCommand) {
  const rowIndex = entry.rowIndex; const input = build.ss14Inputs?.dps; const b = input?.skills?.[rowIndex];
  const blockers = []; const receipts = [profile.card];
  const levelProfile = entry.minionLevel;
  const minionMaximum = !levelProfile ? null : profile.kind === 'synthetic-troop'
    ? seasonMinionMaximum(effects, levelProfile.slotCap, mapCap) : levelProfile.slotCap;
  if (!levelProfile) blockers.push("선택한 소환 스킬 레벨의 SS14 원문을 확인하세요.");
  else receipts.push(levelProfile.receipt);
  const growth = SS14_THEA_EFFECTS.levelGrowth;
  const overlevel = entry.level > growth.baseCap;
  if (overlevel) receipts.push({ season:'SS14', ...growth });
  if (!b || b.itemId !== profile.card.itemId || b.sourcePageSha256 !== profile.card.sourcePageSha256) blockers.push("소환체 전투 입력과 SS14 스킬 원문 연결을 확인하세요.");
  for (const key of seasonMinionFieldKeys(profile))
    if (!(key==="command" && sharedCommand) && !validValue(SEASON_MINION_FIELDS[key], b?.[key])) blockers.push(`${SEASON_MINION_FIELDS[key].label} 미입력`);
  if (minionMaximum !== null && b?.minionCount > minionMaximum)
    blockers.push(`해당 SS14 스킬의 소환체 수량 상한(${minionMaximum}기)을 초과했습니다.`);
  if (!validValue({ min: 0, max: 100 }, b?.hitChance) || !validValue(enemyFields.armor, input?.enemy?.armor)) blockers.push("소환체 대상 적중률과 적 아머를 확인하세요.");
  if (b?.minionBaseMin > b?.minionBaseMax) blockers.push("소환체 기본 대미지의 최소값이 최대값보다 큽니다.");
  const summon = mechanicPage(build, "Summon"); const troop = mechanicPage(build, "Synthetic_Troop"); const magus = mechanicPage(build, "Spirit_Magus");
  if (!summon?.body.includes("Minions are completely independent of the player")
    || !summon.body.includes("The skill's Max Summonable Minions cannot exceed the Max Minions In Map.")
    || !troop?.body.includes(`The max number of Synthetic Troop Minions in a map is ${syntheticTroopMapMaximum}.`)
    || !troop.body.includes("Every point of Command grants Synthetic Troop Minions +3%% additional damage")) blockers.push("SS14 소환체 수량·통솔 공식 연결 미확인");
  receipts.push(...[summon, troop].filter(Boolean));
  // SS14 explicitly makes the summoning skill's main-stat bonus an exception
  // to minion stat independence. Ordinary player damage bonuses still do not apply.
  let mainStatBonus = 0;
  const mainStats = readSkillMainStats(profile.card);
  if (!mainStats) blockers.push("SS14 소환 스킬의 주 속성 원문 미확인");
  for (const stat of mainStats ?? []) {
    const rule = SS14_RULES.pages[`en/${stat}`];
    const rate = rule?.body.match(new RegExp(`Every point of ${stat} additionally increases the damage of skills that have ${stat} as a main stat by ([\\d.]+)%`))?.[1];
    const value = report.character.values[stat.toLowerCase()];
    if (!rate || !Number.isFinite(value) || !rule.body.includes("the damage of Minions summoned by the skill")
      || build.ss14Inputs?.ruleReceipts?.[rule.sourceUrl] !== rule.sourcePageSha256) blockers.push("SS14 소환 스킬 주 속성 수치·공식 미확인");
    else { mainStatBonus += value * Number(rate) / 100; receipts.push(rule); }
  }
  let increase = 0; let more = 1; let armorPenetration = 0; let criticalDamageBonus = .5;
  const penetration = { fire: 0, cold: 0, lightning: 0, erosion: 0 };
  const damageEffects = [{ stat: 'cast-time', operation: 'set', value: 1 },
    { stat: `spell-${profile.type}-damage-min`, operation: 'set', value: b?.minionBaseMin },
    { stat: `spell-${profile.type}-damage-max`, operation: 'set', value: b?.minionBaseMax }];
  const addTyped = (type, effect) => damageEffects.push({ ...effect, stat: `skill-${type}-damage`,
    operation: effect.operation === 'add_percent' ? 'add' : effect.operation, nonBlockingWhenDamageTypeUnavailable: true });
  for (const e of effects.filter(e => e.stat.startsWith("minion_") && !SEASON_GEAR_LEVEL_STATS.has(e.stat))) {
    if (e.receipt) receipts.push(e.receipt);
    if (e.stat === 'minion_elemental_resistance' && e.operation === 'add_percent') continue;
    const conversion = seasonMinionDamageConversion(e);
    const typed = e.stat.match(/^minion_(physical|cold|lightning|fire|erosion)_damage$/u);
    const extra = e.stat === 'minion_physical_damage_as_erosion_damage' && e.operation === 'gain_percent_of_source';
    if (conversion || extra) {
      const source=report.componentProjection.rows.find(row=>row.path===e.path);
      const effectSource={ path: e.path, itemId: e.itemId, name: source?.name ?? e.effectSource?.name,
        stat:e.stat,sourceText:e.sourceText };
      if (conversion) damageEffects.push({ ...e, ...conversion, operation: 'set', optionalConversionSource: true, effectSource });
      else if (profile.type === 'physical') damageEffects.push({ ...e, stat: 'skill-physical-damage-as-erosion', operation: 'add', effectSource });
      continue;
    }
    if (typed && ["add_percent", "more"].includes(e.operation)) {
      addTyped(typed[1], e);
      continue;
    }
    if (e.stat === "minion_damage" && e.operation === "add_percent") increase += e.value;
    else if (e.stat === "minion_damage" && e.operation === "more") more *= 1 + e.value / 100;
    else if (e.stat === "minion_armor_penetration" && e.operation === "add_percent") armorPenetration += e.value;
    else if (e.stat === "minion_critical_strike_damage" && e.operation === "add_percent") criticalDamageBonus += e.value / 100;
    else if (e.operation === 'add_percent' && /^minion_(fire|cold|lightning|erosion)_penetration$/u.test(e.stat)) penetration[e.stat.split('_')[1]] += e.value;
    else blockers.push(`소환체 효과 미지원: ${e.sourceText ?? e.stat}`);
  }
  for (const support of report.components.filter(c => c.category === "supports")) for (const link of support.calculations ?? []) {
    if (link.rowIndex !== rowIndex) continue;
    if (checkSeasonSupportHost(support.id, profile.card, entry, rowIndex) !== true) blockers.push("SS14 소환 스킬과 보조의 호환 조건을 확인하세요.");
    if (link.receipt) receipts.push(link.receipt);
    if (link.progressionReceipt) receipts.push(link.progressionReceipt);
    for (const e of link.effects ?? []) {
      const typed = e.stat.match(/^supported-skill-(physical|cold|lightning|fire|erosion)-damage$/u);
      if (typed && ['add','more'].includes(e.operation) && !e.condition && !e.per && Number.isFinite(e.value)) addTyped(typed[1], e);
      else if (["minion-damage", "supported-skill-damage", `supported-skill-${profile.damageForm.toLowerCase()}-damage`, "supported-skill-hit-damage"].includes(e.stat)
        && !e.condition && !e.per && Number.isFinite(e.value)) {
        if (e.operation === "add") increase += e.value; else if (e.operation === "more") more *= 1 + e.value / 100;
        else blockers.push("소환체 보조의 대미지 연산 미지원");
      } else if (!["mana-cost-multiplier", "supported-skill-area", "minion-skill-area"].includes(e.stat)) blockers.push(`소환체 보조의 효과 미지원: ${e.sourceText ?? e.stat}`);
    }
  }
  const armor = input?.enemy?.armor;
  const command = sharedCommand ? sharedCommand.value : b?.command;
  let stateMultiplier = seasonCommandDamageMultiplier(command); let empowerMultiplier = 1;
  if (profile.kind === "spirit-magus") {
    if (!magus?.body.includes("+50%% additional damage") || !magus.body.includes("Only The Forsaken Iris - Growing Breeze")) blockers.push("SS14 소환체 성장·궁극기 공식 미확인");
    else receipts.push(magus);
    if (b?.minionUltimateRate > 0 && !/growing-breeze/u.test(build.hero?.branchId ?? "")) blockers.push("소환체 궁극기는 해당 히어로의 만개 상태에서만 사용할 수 있습니다.");
    if (b?.growth < 200 && b?.minionEnhancedRate > 0) blockers.push("성장 2단계 이전의 강화 스킬 사용 근거가 없습니다.");
    const release = mechanicPage(build, "Frost_Release");
    const bonus = Number(release?.body.match(/other non-Channeled Skills deal \+([\d.]+) % additional Hit Damage/u)?.[1]);
    const decrement = Number(release?.body.match(/-([\d.]+) % to this damage bonus after casting another skill/u)?.[1]);
    if (!Number.isFinite(bonus) || !Number.isFinite(decrement) || !release?.body.includes("+15 % Cold Resistance Penetration while this skill lasts")) blockers.push("SS14 프리징 릴리즈 버프 원문 미확인");
    for (let i = 1; i <= 5; i++) {
      const remaining = b?.[`frostEmpower${i}`];
      if (remaining > 0) {
        if (b.frostEmpowerActive !== 1) blockers.push("프리징 릴리즈 잔여 버프와 지속 여부가 충돌합니다.");
        empowerMultiplier *= 1 + (bonus - decrement * (5 - remaining)) / 100;
      }
    }
    stateMultiplier = b?.growth >= 500 ? 1.5 : 1;
    penetration.cold += 15 * b?.frostEmpowerActive;
  }
  const criticalMultiplier = 1 + Math.min(1, b?.minionCriticalRating / 10000) * criticalDamageBonus;
  const taken = (profile.damageForm === "Spell" ? effects.filter(e => e.stat === "spell_damage_taken").reduce((n, e) => n * (1 + e.value / 100), 1) : 1)
    * netherMore(effects,'enemy_all_damage_taken') * netherMore(effects,'enemy_hit_damage_taken');
  damageEffects.push({ stat: 'skill-damage', operation: 'add', value: increase });
  const damage = evaluateTlidbSkillDamage({ effects: damageEffects, includeDamagePools: true, context: { damageConversion: 'ss14', target: 'minion' } });
  if (!damage.complete) blockers.push("소환체 기본 대미지 또는 전환 수치를 확인하세요.");
  const conversionTrace = damage.applied.filter(e => e.stage === 'conversion' || e.stage === 'gained-as-extra')
    .map(e => ({ ...e, effectSource: damageEffects[e.inputIndex]?.effectSource }));
  const fixedErosion=fixedSeasonErosionResistance(effects);
  const targetState=theaState(build)?.events;
  const scorch=targetState?.scorched ? build.ss14Inputs.theaEvents?.scorchResistance : 0;
  const pools = damage.hit.pools.map(pool => {
    const { type, min, max } = pool;
    const resistance=type==='erosion'?fixedErosion??input?.enemy?.erosion:input?.enemy?.[type];
    if (type !== 'physical' && !validValue(enemyFields[type], resistance)) blockers.push(`${enemyFields[type].label} 미입력`);
    const armorReduction=Math.min(.8,armor/(.9*armor+30000))*(type==='physical'?1:.6);
    const targetResistance=report.beforeDefense||type==='physical'?null:{
      base:resistance,fixed:type==='erosion'&&fixedErosion!=null,penetration:penetration[type],scorch,
      effective:resistance-scorch-penetration[type],
    };
    const armorMultiplier=report.beforeDefense?1:1-armorReduction+armorPenetration/100;
    const resistanceMultiplier=targetResistance?1-targetResistance.effective/100:1;
    const numbed=type==='lightning' ? 1 + (targetState?.numbedEffect ?? 0)/100 : 1;
    const received = effects.filter(e => isSeasonTargetDamageTaken(e.stat, type));
    if (received.some(e => e.operation !== 'more' || !Number.isFinite(e.value))) blockers.push("소환체 대상의 받는 대미지 연산을 확인하세요.");
    const takenMultiplier = received.reduce((n, e) => n * (1 + e.value / 100), 1);
    const multiplier = armorMultiplier * resistanceMultiplier * takenMultiplier * numbed;
    return { type, min: min * multiplier, max: max * multiplier, armorMultiplier, resistanceMultiplier,
      ...(!report.beforeDefense&&{defense:{armor,armorReduction,armorPenetration,resistance:targetResistance}}) };
  });
  const levelMultiplier = overlevel ? seasonOverlevelDamageMultiplier(entry.level) : 1;
  const poolMeanSum = pools.reduce((total, pool) => total + (pool.min + pool.max) / 2, 0);
  const base = poolMeanSum
    * (1 + mainStatBonus) * more * stateMultiplier * criticalMultiplier * taken * b?.hitChance / 100 * levelMultiplier;
  const skills = profile.skills.map(skill => {
    const page = mechanicPage(build, skill.slug);
    const coefficient = page?.body.match(new RegExp(`Deals ${profile.damageForm} ${profile.type === "cold" ? "Cold" : "Physical"} Damage equal to ([\\d.]+)% (?:of )?Base Damage\\.?$`, "mu"))?.[1];
    if (!coefficient) blockers.push("SS14 소환체 자체 공격의 계수 원문 연결 미확인");
    if (page) receipts.push(page);
    const enhanced = skill.slug === "Permafrost_Cast" && b?.growth >= 300 ? 1 + Math.floor(b.enemyFrostbite / 3) / 100 : 1;
    const buff = profile.kind === "spirit-magus" && skill.slug !== "Frost_Release" ? empowerMultiplier : 1;
    const dps = base * Number(coefficient) / 100 * b?.[skill.field] * b?.minionCount * b?.minionUptime / 100 * enhanced * buff;
    return { slug: skill.slug, coefficient: Number(coefficient), dps };
  });
  const dps = skills.reduce((n, s) => n + s.dps, 0);
  if (!Number.isFinite(dps) || dps < 0) blockers.push("소환체 DPS 산출 입력을 확인하세요.");
  return { id: profile.card.itemId, rowIndex, supported: !blockers.length, blockers: [...new Set(blockers)], receipts, minionSkills: skills,
    minionMaximum, minionLevel:entry.level, minionLevelMultiplier:levelMultiplier, syntheticTroop:profile.kind==='synthetic-troop',
    values: { dps: blockers.length ? null : dps, minionDps: blockers.length ? null : dps, minionHitDps: blockers.length ? null : dps, manualDps: 0, spellBurstDps: 0, repeatDps: 0, heroDps: 0, dotDps: 0 },
    pools: [], minionPools: blockers.length ? [] : pools,
    minionDamageByType: !blockers.length && poolMeanSum > 0 ? Object.fromEntries(
      pools.map(({ type, min, max }) => [type, ((min + max) / 2) / poolMeanSum * dps])) : undefined,
    conversionTrace, mechanics: [] };
}
