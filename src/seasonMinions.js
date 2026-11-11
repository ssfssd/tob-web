import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { netherMore } from './seasonNetherRemaining.js';
import { mechanicPage } from "./seasonMechanicInputs.js";
import { checkSeasonSupportHost } from "./seasonSupport.js";
import { readSkillMainStats } from "./seasonOffense.js";
import { SS14_RULES } from "./data/ss14Rules.generated.js";

export const SEASON_MINION_FIELDS = {
  minionCount: { label: "해당 종류의 현재 소환체 수", min: 0, max: 6, integer: true },
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
export function seasonMinionProfile(id) {
  const card = SS14_CARDS_EN.records[id];
  if (card?.season !== "SS14" || card.status !== "collected-preview") return null;
  const detail = card.detail.split("Details\n")[1];
  if (card.sourceRecordKey === "Summon_Frost_Magus" && detail === "Summon Frost Magus:\nSummons 1 Frost Magus\nThis skill summons up to 1 Minions\n+1 Max Frostbite Rating for the Minions summoned by this skill for every +1 Max Frostbite Rating\nSpirit Magi become undefeatable\nWhen Spirit Magi become undefeatable, they gain Reconjuring\nOrigin of Spirit Magus :\nGains Origin of Ice, restoring 3.825 % of Max Life and Max Energy Shield per second to the summoner\nFrost Magus:\nBase Skill: Glacier Ripples.\nEmpower Skill: Frost Release.\nEnhanced Skill: Permafrost Cast.\nUltimate: Ice Earthshaker.") return {
    card, maximum: 1, kind: "spirit-magus", type: "cold", damageForm: "Spell", skills: [{ slug: "Glacier_Ripples", field: "minionBasicRate" },
      { slug: "Permafrost_Cast", field: "minionEnhancedRate" }, { slug: "Frost_Release", field: "minionEmpowerRate" }, { slug: "Ice_Earthshaker", field: "minionUltimateRate" }] };
  if (card.sourceRecordKey !== "Summon_Machine_Guard") return null;
  if (detail !== "Summon Machine Guard:\nSummons 1 Machine Guard\nThis skill summons up to 4 Minions\n0.5 % Skill Area for Minions summoned by this skill for every 1 Command") return null;
  return { card, maximum: 4, kind: "synthetic-troop", type: "physical", damageForm: "Attack", skills: [{ slug: "Overpower", field: "minionBasicRate" }, { slug: "Onslaught_Punch", field: "minionSpecialRate" }] };
}
export function calculateSeasonMinion(build, report, entry, profile, effects, validValue, enemyFields) {
  const rowIndex = entry.rowIndex; const input = build.ss14Inputs?.dps; const b = input?.skills?.[rowIndex];
  const blockers = []; const receipts = [profile.card];
  if (entry.level !== 20) blockers.push("소환체의 SS14 20레벨 원문만 연결되어 있습니다.");
  if (!b || b.itemId !== profile.card.itemId || b.sourcePageSha256 !== profile.card.sourcePageSha256) blockers.push("소환체 전투 입력과 SS14 스킬 원문 연결을 확인하세요.");
  for (const key of seasonMinionFieldKeys(profile)) if (!validValue(SEASON_MINION_FIELDS[key], b?.[key])) blockers.push(`${SEASON_MINION_FIELDS[key].label} 미입력`);
  if (b?.minionCount > profile.maximum) blockers.push("해당 SS14 스킬의 소환체 수량 상한을 초과했습니다.");
  if (!validValue({ min: 0, max: 100 }, b?.hitChance) || !validValue(enemyFields.armor, input?.enemy?.armor)) blockers.push("소환체 대상 적중률과 적 아머를 확인하세요.");
  if (b?.minionBaseMin > b?.minionBaseMax) blockers.push("소환체 기본 대미지의 최소값이 최대값보다 큽니다.");
  const summon = mechanicPage(build, "Summon"); const troop = mechanicPage(build, "Synthetic_Troop"); const magus = mechanicPage(build, "Spirit_Magus");
  if (!summon?.body.includes("Minions are completely independent of the player")
    || !troop?.body.includes("Every point of Command grants Synthetic Troop Minions +3%% additional damage")) blockers.push("SS14 소환체 개별 수치·통솔 공식 연결 미확인");
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
  let increase = 0; let more = 1; let armorPenetration = 0; let coldPenetration = 0;
  for (const e of effects.filter(e => e.stat.startsWith("minion_"))) {
    if (["minion_fire_damage", "minion_lightning_damage"].includes(e.stat) && ["add_percent", "more"].includes(e.operation)) {
      if (e.stat === `minion_${profile.type}_damage`) { if (e.operation === "add_percent") increase += e.value; else more *= 1 + e.value / 100; }
      continue;
    }
    if (e.stat === "minion_damage" && e.operation === "add_percent") increase += e.value;
    else if (e.stat === "minion_damage" && e.operation === "more") more *= 1 + e.value / 100;
    else if (e.stat === "minion_armor_penetration" && e.operation === "add_percent") armorPenetration += e.value;
    else if (e.stat === "minion_cold_penetration" && e.operation === "add_percent") coldPenetration += e.value;
    else if (!(e.operation === "add_percent" && ["minion_fire_penetration", "minion_lightning_penetration", "minion_erosion_penetration"].includes(e.stat))) blockers.push(`소환체 효과 미지원: ${e.sourceText ?? e.stat}`);
  }
  for (const support of report.components.filter(c => c.category === "supports")) for (const link of support.calculations ?? []) {
    if (link.rowIndex !== rowIndex) continue;
    if (checkSeasonSupportHost(support.id, profile.card, entry, rowIndex) !== true) blockers.push("SS14 소환 스킬과 보조의 호환 조건을 확인하세요.");
    for (const e of link.effects ?? []) {
      if (["minion-damage", "supported-skill-damage", `supported-skill-${profile.damageForm.toLowerCase()}-damage`, `supported-skill-${profile.type}-damage`, "supported-skill-hit-damage"].includes(e.stat)
        && !e.condition && !e.per && Number.isFinite(e.value)) {
        if (e.operation === "add") increase += e.value; else if (e.operation === "more") more *= 1 + e.value / 100;
        else blockers.push("소환체 보조의 대미지 연산 미지원");
      } else if (!["mana-cost-multiplier", "supported-skill-area", "minion-skill-area"].includes(e.stat)) blockers.push(`소환체 보조의 효과 미지원: ${e.sourceText ?? e.stat}`);
    }
  }
  const armor = input?.enemy?.armor; const armorMultiplier = 1 - Math.min(.8, armor / (.9 * armor + 30000)) * (profile.type === "physical" ? 1 : .6) + armorPenetration / 100;
  let stateMultiplier = 1 + Math.max(0, b?.command) * .03; let resistanceMultiplier = 1; let empowerMultiplier = 1;
  if (profile.kind === "spirit-magus") {
    if (!magus?.body.includes("+50%% additional damage") || !magus.body.includes("Only The Forsaken Iris - Growing Breeze")) blockers.push("SS14 소환체 성장·궁극기 공식 미확인");
    else receipts.push(magus);
    if (!validValue(enemyFields.cold, input?.enemy?.cold)) blockers.push("적 유효 냉기 저항을 입력하세요.");
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
    resistanceMultiplier = 1 - (input?.enemy?.cold - coldPenetration - 15 * b?.frostEmpowerActive) / 100;
  }
  const criticalMultiplier = 1 + Math.min(1, b?.minionCriticalRating / 10000) * .5;
  const taken = (profile.damageForm === "Spell" ? effects.filter(e => e.stat === "spell_damage_taken").reduce((n, e) => n * (1 + e.value / 100), 1) : 1)
    *netherMore(effects,'enemy_all_damage_taken')*netherMore(effects,'enemy_hit_damage_taken')*netherMore(effects,`${profile.type}_damage_taken`);
  const base = (b?.minionBaseMin + b?.minionBaseMax) / 2 * (1 + mainStatBonus) * (1 + increase / 100) * more * stateMultiplier * criticalMultiplier * armorMultiplier * resistanceMultiplier * taken * b?.hitChance / 100;
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
    values: { dps: blockers.length ? null : dps, minionDps: blockers.length ? null : dps, manualDps: 0, spellBurstDps: 0, repeatDps: 0, heroDps: 0, dotDps: 0 }, pools: [], mechanics: [] };
}
