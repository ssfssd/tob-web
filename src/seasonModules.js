import { SS14_MODULE_CARDS as DATA } from "./data/ss14ModuleCards.generated.js";
import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { readSkillMainStats } from "./seasonOffense.js";
import { checkSeasonSupportHost } from "./seasonSupport.js";
import { SS14_EXTENSION_RULES } from "./data/ss14ExtensionRules.generated.js";
import { theaState } from "./seasonTheaState.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";
import { netherMore } from './seasonNetherRemaining.js';

const actionState = (slug, description = "버프 적용") => ({ label: `${DATA.koActions.records[slug].name} ${description} (0 또는 1)`, min: 0, max: 1, integer: true });
const actionFields = { High_Court_Covenant: "moduleHighCourt", Divine_Judgment: "moduleDivineJudgment", Searing_Crush: "moduleSearingCrush", Impaling_Thrust: "moduleImpalingThrust" };

export const MODULE_FIELDS = {
  moduleRate0: { label: "소환체 첫 번째 스킬의 최종 시전 횟수 / 초 (지속 대미지는 활성 비율 0~1)", min: 0, max: 100 },
  moduleRate1: { label: "소환체 두 번째 스킬의 최종 시전 횟수 / 초 (지속 대미지는 활성 비율 0~1)", min: 0, max: 100 },
  moduleHits0: { label: "첫 번째 스킬의 시전당 대상 적중 수", min: 0, max: 100 },
  moduleHits1: { label: "두 번째 스킬의 시전당 대상 적중 수", min: 0, max: 100 },
  moduleFirebird: { label: `${DATA.koActions.records.Firebird.name} 버프 중첩`, min: 0, max: 8, integer: true },
  moduleHighCourt: actionState("High_Court_Covenant"),
  moduleDivineJudgment: actionState("Divine_Judgment"),
  moduleSearingCrush: actionState("Searing_Crush"),
  moduleImpalingThrust: actionState("Impaling_Thrust"),
  moduleProfane: { label: `${SS14_EXTENSION_RULES.pages["ko/Profane"].title} 보유 (0 또는 1)`, min: 0, max: 1, integer: true },
  moduleSkillAreaBonus: { label: "소환체 최종 스킬 범위 보너스 (%)", min: 0, max: 10000 },
  moduleProjectileSpeedBonus: { label: "소환체 최종 투사체 속도 보너스 (%)", min: 0, max: 10000 },
  moduleSteepStrike: { label: "소환자의 강타 확률 (%)", min: 0, max: 10000 },
  moduleLowLife: { label: "소환체가 낮은 HP (0 또는 1)", min: 0, max: 1, integer: true },
  moduleSplitHits: { label: "전체 적중 중 분열 후 투사체의 적중 수 / 시전", min: 0, max: 100 },
  moduleAilmentTypes: { label: "대상에게 적용된 상태 이상 종류 수", min: 0, max: 7, integer: true },
  moduleIgniteBaseMin: { label: "소환체 기본 점화 최소 대미지 (부여된 기본값이 없으면 0)", min: 0, max: 1e12 },
  moduleIgniteBaseMax: { label: "소환체 기본 점화 최대 대미지", min: 0, max: 1e12 },
  moduleIgniteStacks: { label: "대상에게 실제 적용되는 소환체 점화 중첩", min: 0, max: 20, integer: true },
  moduleIgniteUptime: { label: "소환체 점화의 최종 유지율 (%)", min: 0, max: 100 },
  moduleFrostbiteBonus: { label: "모듈 부여 전 소환자의 빙결 최대치 보너스", min: 0, max: 10000 },
  moduleKillRate: { label: "소환체 공격·주술로 처치하는 주변 적 수 / 초", min: 0, max: 100 },
  moduleKilledLife: { label: "처치하는 주변 적의 최대 HP", min: 0, max: 1e15 },
  moduleExplosionHits: { label: "폭발 대상이 6m 범위 안 (0 또는 1)", min: 0, max: 1, integer: true },
  moduleExecuteRate: { label: "소환체가 HP 18% 미만 적을 타격하는 횟수 / 초", min: 0, max: 100 },
  moduleExecuteLife: { label: "처형 직전 대상의 남은 HP", min: 0, max: 1e15 },
  moduleExecuteMaxLife: { label: "처형 대상의 최대 HP", min: 0, max: 1e15 },
};
export function seasonModuleProfile(id) {
  const card = DATA.en.records[id];
  if (card?.season !== "SS14" || !card.sourceSeasonEvidence?.verificationComplete) return null;
  return { card, maximum: Number(card.detail.match(/summons up to (\d+) Minions/u)?.[1]),
    actions: DATA.actions[id].map(slug => DATA.enActions.records[slug]),
    conversion: card.detail.match(/Converts (\d+) % of Physical Damage dealt by Minions summoned by this skill to (\w+) Damage/u) };
}
export function seasonModuleFieldKeys(profile, options = [], build) {
  return ["useShare", "hitChance", "minionCount", "minionUptime", "minionBaseMin", "minionBaseMax", "minionCriticalRating",
    ...profile.actions.flatMap((_, i) => [`moduleRate${i}`, `moduleHits${i}`]),
    ...(profile.actions.some(a => a.itemId === "Firebird") ? ["moduleFirebird"] : []),
    ...profile.actions.flatMap(a => actionFields[a.itemId] ? [actionFields[a.itemId]] : []),
    ...(profile.actions.some(a => a.itemId === "Gravelshot") ? ["moduleSplitHits"] : []),
    ...(profile.card.detail.includes("gain Profane on hit") ? ["moduleProfane"] : []),
    ...(profile.card.detail.includes("for every +5 % Skill Area") ? ["moduleSkillAreaBonus"] : []),
    ...(profile.card.detail.includes("45 % of the Projectile Speed bonus") ? ["moduleProjectileSpeedBonus"] : []),
    ...(profile.card.detail.includes("Steep Strike chance") ? ["moduleSteepStrike"] : []),
    ...(options.includes("program_frenzy") ? ["moduleLowLife"] : []),
    ...(options.includes("protocol_ailment") ? ["moduleAilmentTypes"] : []),
    ...(options.includes("protocol_elemental") ? ["moduleIgniteBaseMin", "moduleIgniteBaseMax", "moduleIgniteStacks", "moduleIgniteUptime"] : []),
    ...(options.includes("source_condensation") ? ["moduleFrostbiteBonus"] : []),
    ...(options.includes("source_meltdown") || build?.skills?.elixirs?.some(s => s?.skillId === "saltpeter-mushroom-distillate") ? ["moduleKillRate", "moduleKilledLife", "moduleExplosionHits"] : []),
    ...(options.includes("source_breakpoint") ? ["moduleExecuteRate", "moduleExecuteLife", "moduleExecuteMaxLife"] : [])];
}
export function moduleOptionEffects(text, parseLines) {
  // Scope stays on the minion. A shared increase must never leak into the
  // player's damage or get multiplied by the number of summoned creatures.
  const special = text.match(/^\+(\d+)% Critical Strike Rating and \+(\d+)% Critical Strike Damage$/u);
  if (special) return { effects: [{ stat: "critical_strike_rating", operation: "add_percent", value: Number(special[1]) },
    { stat: "critical_strike_damage", operation: "add_percent", value: Number(special[2]) }], blockers: [] };
  if (text === "-20% additional min damage and +30% additional max damage") return { effects: [
    { stat: "min_damage", operation: "more", value: -20 }, { stat: "max_damage", operation: "more", value: 30 }], blockers: [] };
  if (text === "+10% additional Melee Damage and +30% Melee Skill Area") return { effects: [
    { stat: "melee_damage", operation: "more", value: 10 }, { stat: "melee_skill_area", operation: "add_percent", value: 30 }], blockers: [] };
  if (text === "+20% Attack, Cast, and Movement Speed") return { effects: ["attack_speed", "cast_speed", "movement_speed"].map(stat => ({ stat, operation: "add_percent", value: 20 })), blockers: [] };
  if (text === "+2 Projectile Quantity and +2 Horizontal Projectile piercing counter") return { effects: ["projectile_quantity", "projectile_pierce"].map(stat => ({ stat, operation: "add_percent", value: 2 })), blockers: [] };
  if (text === "+10% Life Regain and Shield Regain") return { effects: ["life_regain", "shield_regain"].map(stat => ({ stat, operation: "add_percent", value: 10 })), blockers: [] };
  return parseLines(text);
}
export function calculateSeasonModule(build, report, entry, profile, effects, valid, enemyFields) {
  const index = entry.rowIndex, input = build.ss14Inputs?.dps, b = input?.skills?.[index], reasons = [];
  const row = { id: profile.card.itemId, rowIndex: index, supported: false, blockers: reasons, receipts: [profile.card, ...profile.actions], pools: [], mechanics: [],
    values: { dps: null, minionDps: null, manualDps: 0, spellBurstDps: 0, repeatDps: 0, heroDps: 0, dotDps: 0 } };
  const config = build.skills.active[index].modularization;
  const requiredFields = seasonModuleFieldKeys(profile, config?.moduleOptionIds, build);
  const state = field => requiredFields.includes(field) ? b?.[field] : 0;
  const projected = report.componentProjection.rows.filter(r => r.path.startsWith(`skills.active.${index}.modularization.`));
  const active = projected.flatMap(r => r.extensionControls ?? []).find(c => c.key === `module:${index}:active`)?.value;
  if (!config || !projected.length || active === "" || active === undefined) reasons.push("모듈 구성과 소환체 존재 여부를 선택하세요.");
  if (entry.level !== 20 || b?.itemId !== profile.card.itemId || b?.sourcePageSha256 !== profile.card.sourcePageSha256) reasons.push("모듈의 SS14 20레벨 전투 입력을 확인하세요.");
  if (active === 0 && !reasons.length) {
    if (b.minionCount > 0) reasons.push("소환체 없음 선택과 현재 소환체 수가 서로 다릅니다.");
    else { row.supported = true; row.values.dps = 0; row.values.minionDps = 0; }
    return row;
  }
  for (const key of requiredFields) {
    const definition = MODULE_FIELDS[key] ?? { min: 0, max: key === "minionCount" ? profile.maximum : key === "minionCriticalRating" ? 100000 : ["useShare", "hitChance", "minionUptime"].includes(key) ? 100 : 1e12, integer: key === "minionCount" };
    if (!valid(definition, b?.[key])) reasons.push(`${definition.label ?? { minionCount: "소환체 수", minionUptime: "소환체 공격 유지율", minionBaseMin: "소환체 기본 최소 대미지", minionBaseMax: "소환체 기본 최대 대미지", minionCriticalRating: "소환체 기본 크리티컬", useShare: "소환 시전 시간 배분", hitChance: "대상 적중률" }[key]} 미입력`);
  }
  if (b?.minionBaseMin > b?.minionBaseMax) reasons.push("소환체 기본 대미지의 최소·최대 범위를 확인하세요.");
  if (active === 1 && b?.minionCount === 0) reasons.push("소환체 존재 선택과 소환체 수 0이 서로 다릅니다.");
  let main = 0;
  const mainStats = readSkillMainStats(profile.card);
  if (!mainStats) reasons.push("모듈 소환 스킬의 SS14 주 속성 원문을 확인할 수 없습니다.");
  for (const stat of mainStats ?? []) {
    const rule = SS14_RULES.pages[`en/${stat}`], value = report.character.values[stat.toLowerCase()];
    const rate = rule?.body.match(new RegExp(`Every point of ${stat} additionally increases the damage of skills that have ${stat} as a main stat by ([\\d.]+)%`))?.[1];
    if (!rate || !Number.isFinite(value) || !rule.body.includes("the damage of Minions summoned by the skill") || build.ss14Inputs?.ruleReceipts?.[rule.sourceUrl] !== rule.sourcePageSha256) reasons.push("모듈 소환 스킬의 SS14 주 속성 수치·공식을 확인하세요.");
    else { main += value * Number(rate) / 100; row.receipts.push(rule); }
  }
  const local = projected.flatMap(r => r.minionEffects ?? []);
  const minionEffects = [...effects.filter(e => e.stat.startsWith("minion_")).map(e => ({ ...e, stat: e.stat.replace(/^minion_/u, "") })), ...local,
    ...report.componentProjection.rows.flatMap(r => r.alliedMinionEffects ?? [])];
  // Final cast/hit inputs already include speed, extra projectiles and reach.
  // Regain belongs to survival and does not multiply fixed outgoing damage.
  const allowed = /^(?:damage|damage_over_time|(?:physical|fire|cold|lightning|erosion|elemental|area|melee|spell|attack|projectile|min|max)_damage|critical_strike_rating|critical_strike_damage|armor_penetration|armor_damage_mitigation_penetration|(?:fire|cold|lightning|erosion)_penetration|(?:attack|cast|movement|projectile)_speed|(?:melee_)?skill_area|projectile_quantity|projectile_pierce|life_regain|shield_regain)$/u;
  const ancillary = new Set(["armor", "evasion", "max_energy_shield", "elemental_resistance", "elemental_damage_taken", "elemental_ailment_avoidance", "block_chance", "knockback_chance", "elemental_ailment_chance", "cooldown_recovery_speed", "injury_buffer", "deterioration_chance", "physical_as_random_elemental", "ailment_damage"]);
  for (const e of minionEffects) if (!allowed.test(e.stat) && !ancillary.has(e.stat) || !["add", "add_percent", "more"].includes(e.operation)
    || e.stat === "critical_strike_damage" && e.operation !== "add_percent") reasons.push(`소환체 효과 계산 미지원: ${e.sourceText ?? e.stat}`);
  for (const support of report.components.filter(c => c.category === "supports")) for (const link of support.calculations ?? []) if (link.rowIndex === index) {
    if (checkSeasonSupportHost(support.id, profile.card, entry, index) !== true) reasons.push("모듈 소환 스킬과 보조의 SS14 호환 조건을 확인하세요.");
    for (const e of link.effects ?? []) {
      if (["minion-damage", "supported-skill-damage", "supported-skill-hit-damage"].includes(e.stat) && !e.condition && !e.per && ["add", "more"].includes(e.operation)) minionEffects.push({ ...e, stat: "damage", operation: e.operation === "add" ? "add_percent" : e.operation });
      else if (!["mana-cost-multiplier", "supported-skill-area", "minion-skill-area"].includes(e.stat)) reasons.push(`모듈 보조 효과 미지원: ${e.sourceText ?? e.stat}`);
    }
  }
  // These host lines affect geometry or the final action frequencies supplied
  // by the user. Extra damage mechanics must be explicitly implemented below.
  const hostLines = profile.card.detail.split("Details\n")[1].split("\n").slice(3).filter(line => line !== "<Random Module-Related Affix>");
  let hostMore = 1;
  for (const line of hostLines) {
    if (/^Converts 100 % of Physical Damage/u.test(line) || /^0\.5 % Skill Area/u.test(line) || /^\+1 Horizontal Projectile Penetration/u.test(line) || /^\+1 to Barrage Skill Total Waves/u.test(line) || /^\+2 to Parabolic Projectile Split Quantity/u.test(line) || /^\+3 % Attack Speed for every Critical Strike/u.test(line)) continue;
    if (line === "+1 % additional damage for Minions summoned by this skill for every 5 Strength the summoner has") hostMore *= 1 + Math.floor(report.character.values.strength / 5) / 100;
    else if (line === "+2 % additional damage for every +5 % Skill Area of Minions summoned by this skill") hostMore *= 1 + .02 * Math.floor(b?.moduleSkillAreaBonus / 5);
    else if (line === "+1 % additional damage for Minions summoned by this skill for every +1 % Steep Strike chance the summoner has") hostMore *= 1 + b?.moduleSteepStrike / 100;
    else if (line === "+1 % Projectile Speed for Minions summoned by this skill for every +1 % Projectile Speed") continue;
    else if (line === "45 % of the Projectile Speed bonus of Minions summoned by this skill is also applied to the additional bonus for Projectile Damage") minionEffects.push({ stat: "projectile_damage", operation: "more", value: .45 * b?.moduleProjectileSpeedBonus });
    else if (line === "Minions summoned by this skill gain Profane on hit. Interval: 1s") {
      const rule = SS14_EXTENSION_RULES.pages["en/Profane"];
      if (!rule.body.startsWith("Additionally increases Wilt and Deterioration Duration by 7%. Additionally increases Erosion Damage by 7% for 10s")) reasons.push("사악의 SS14 공식 원문이 변경되었습니다.");
      else { row.receipts.push(rule); minionEffects.push({ stat: "erosion_damage", operation: "more", value: 7 * b?.moduleProfane }); }
    }
    else reasons.push(`모듈 고유 효과 계산 미지원: ${line}`);
  }
  if (config?.moduleOptionIds.includes("program_frenzy")) minionEffects.push({ stat: "damage", operation: "more", value: 25 * b?.moduleLowLife });
  if (config?.moduleOptionIds.includes("protocol_ailment")) hostMore *= 1.03 ** b?.moduleAilmentTypes;
  row.minionUtility = minionEffects.filter(e => ancillary.has(e.stat));
  row.utilityMechanics = projected.flatMap(r => r.mechanics ?? []).filter(m => ["module-taunt-on-block", "module-paralysis-on-knockback"].includes(m.kind));
  if (config?.moduleOptionIds.includes("source_condensation")) row.minionUtility.push({ stat: "max_frostbite_rating", operation: "add", value: b?.moduleFrostbiteBonus + 30 });
  if (state("moduleSearingCrush")) minionEffects.push({ stat: "damage", operation: "more", value: 50 });
  if (state("moduleImpalingThrust")) minionEffects.push({ stat: "area_damage", operation: "more", value: 40 });
  const criticalIncrease = minionEffects.filter(e => e.stat === "critical_strike_rating" && e.operation === "add_percent").reduce((n, e) => n + e.value, 0);
  const criticalMore = minionEffects.filter(e => e.stat === "critical_strike_rating" && e.operation === "more").reduce((n, e) => n * (1 + e.value / 100), 1);
  const criticalDamage = minionEffects.filter(e => e.stat === "critical_strike_damage").reduce((n, e) => n + e.value / 100, .5 + .75 * state("moduleHighCourt"));
  const crit = 1 + Math.min(1, (b?.minionCriticalRating + 300 * state("moduleHighCourt")) * (1 + criticalIncrease / 100) * criticalMore / 10000) * criticalDamage;
  const range = ["min", "max"].map((side, i) => b?.[i ? "minionBaseMax" : "minionBaseMin"]
    * (1 + minionEffects.filter(e => e.stat === `${side}_damage` && e.operation === "add_percent").reduce((n, e) => n + e.value, 0) / 100)
    * minionEffects.filter(e => e.stat === `${side}_damage` && e.operation === "more").reduce((n, e) => n * (1 + e.value / 100), 1)
    * (i === 1 && state("moduleDivineJudgment") ? 1.6 : 1));
  if (range[0] > range[1]) reasons.push("보정된 소환체 최소·최대 대미지 범위를 확인하세요.");
  const average = (range[0] + (range[1] - range[0]) * (state("moduleDivineJudgment") ? 2 / 3 : .5)) * (1 + main) * hostMore;
  row.infiltrationTypes = (config?.moduleOptionIds ?? []).flatMap(id => id.match(/^protocol_(cold|fire|lightning)_penetration$/u)?.[1] ?? []);
  row.elementalProtocol = config?.moduleOptionIds.includes("protocol_elemental");
  row.moduleTimeline = row.elementalProtocol || profile.actions.some(a => ["Blitz_Strike", "Flickering_Shadow"].includes(a.itemId)) || minionEffects.some(e => e.stat === "deterioration_chance") || theaCombatEnabled(build) && row.infiltrationTypes.length > 0;
  if (row.moduleTimeline && (!theaCombatEnabled(build) || build.ss14Inputs?.theaCycle?.mode !== "automatic")) reasons.push("소환체의 축복 소모·몰락·악화는 전투 조건에서 자동 은총과 복합 발동 계산을 켜세요.");
  const wiltEffects = minionEffects.filter(e => ["damage", "erosion_damage", "damage_over_time", "ailment_damage"].includes(e.stat));
  row.wiltBase = 5 * (1 + main) * hostMore * (1 + wiltEffects.filter(e => e.operation === "add_percent").reduce((n,e) => n + e.value, 0) / 100)
    * wiltEffects.filter(e => e.operation === "more").reduce((n,e) => n * (1 + e.value / 100), 1);
  row.wiltDuration = 1.5 * (state("moduleProfane") ? 1.07 : 1);
  const fixedErosion = effects.find(e => e.stat === "enemy_erosion_resistance_fixed")?.value;
  row.wiltTargetBase = (report.beforeDefense ? 1 : 1 - ((fixedErosion ?? input?.enemy?.erosion) - (theaState(build)?.events?.scorched ? build.ss14Inputs.theaEvents.scorchResistance : 0) - minionEffects.filter(e => e.stat === "erosion_penetration").reduce((n,e) => n + e.value, 0)) / 100)
    * effects.filter(e => e.stat === "erosion_damage_taken").reduce((n,e) => n * (1 + e.value / 100), 1);
  row.wiltTargetMultiplier = row.wiltTargetBase * (1 + (input?.enemy?.affliction ?? 0) / 100);
  row.minionSkills = profile.actions.map((action, n) => {
    const detail = action.detail.split("Details\n")[1], lines = detail.split("\n").slice(1);
    const match = lines.shift()?.match(/^Deals (Attack|Spell|Persistent) (Physical|Fire|Cold|Lightning|Erosion) Damage equal to ([\d.]+)% of Base Damage$/u);
    if (!match) { reasons.push(`소환체 스킬 계수 미확인: ${action.name}`); return { slug: action.itemId, dps: null }; }
    let multiplier = 1, type = match[2].toLowerCase(), hitCount = b?.[`moduleHits${n}`];
    if (row.moduleTimeline && !Number.isInteger(hitCount)) reasons.push("시간 순서 계산의 소환체 적중 수는 정수로 선택하세요.");
    const shotgun = detail.match(/This skill's Shotgun Effect falloff coefficient is (\d+)%/u);
    if (shotgun) {
      const rule = SS14_EXTENSION_RULES.pages["en/Shotgun_Effect"];
      if (!rule?.body.includes("The first effect hit deals 100% damage") || !rule.body.includes("subsequent on hit damage is 36%")) reasons.push("산탄 효과의 SS14 감쇠 공식을 확인하세요.");
      else row.receipts.push(rule);
      if (!Number.isInteger(hitCount)) reasons.push("산탄 효과의 시전당 대상 적중 수는 정수로 입력하세요.");
      hitCount = hitCount > 0 ? 1 + (hitCount - 1) * (1 - Number(shotgun[1]) / 100) : 0;
    }
    const pools = [{ type, portion: 1 }];
    if (profile.conversion && type === "physical") pools.splice(0, 1, { type: profile.conversion[2].toLowerCase(), portion: 1 });
    if (type === "physical") for (const e of minionEffects.filter(e => e.stat === "physical_as_random_elemental")) {
      for (const type of ["fire", "cold", "lightning"]) pools.push({ type, portion: e.value / 300, random: true });
    }
    for (const line of lines) {
      if (action.itemId === "Frostclaw" && line === "Converts 99 % of the skill's Cold Damage to Fire Damage") pools.splice(0, 1, { type: "cold", portion: .01 }, { type: "fire", portion: .99 });
      else if (action.itemId === "Firebird" && /^(Projectiles fired by this skill will return|For every enemy hit by the Projectiles fired by this skill, gains 1 stack of a buff: Adds 10 % of Cold Damage as Fire Damage\. Stacks up to 8 time\(s\)\. Lasts for 4s)/u.test(line)) continue;
      else if (action.itemId === "Groundslam" && line === "Gains a buff when casting this skill: -25% additional damage dealt by enemies within 10m nearby. Lasts for 5 s") continue;
      else if (action.itemId === "High_Court_Covenant" && line === "Gains a buff when casting this skill: +300 Critical Strike Rating and +75% Critical Strike Damage for 4 s") continue;
      else if (action.itemId === "Divine_Judgment" && line === "Gains a buff when casting this skill: Lucky Damage and +60% additional Max Damage for 4 s") continue;
      else if (action.itemId === "Impaling_Thrust" && line === "Gains a buff when casting this skill: +60% Skill Area and +40% additional Area Damage for 4 s") continue;
      else if (action.itemId === "Searing_Crush" && line === "Gains a buff when casting this skill: +50% additional damage dealt. Lasts 5 s") continue;
      else if (action.itemId === "Rootsurge" && ["+100 % chance for this skill to inflict Slow on hit", "The Projectiles fired by this skill are not affected by Projectile Quantity bonuses.", "The Projectiles fired by this skill cannot return."].includes(line)) continue;
      else if (["Thunderfall", "Spikeburst"].includes(action.itemId) && (line === shotgun?.[0] || ["The lightning bolts caused by this skill can hit the same enemy.", "Projectiles from this skill always Penetrate", "The Projectiles fired by this skill are not affected by Projectile Quantity bonuses.", "The Projectiles fired by this skill can hit the same enemy."].includes(line))) continue;
      else if (action.itemId === "Gravelshot" && line === "The skill's Projectiles' effect after splitting -50 % additional damage") {
        if (b?.moduleSplitHits > hitCount) reasons.push("분열 후 적중 수가 전체 적중 수보다 많습니다.");
        else hitCount -= b?.moduleSplitHits * .5;
      }
      else if (action.itemId === "Blitz_Strike" && line === "+100% additional damage for the next Burst Hammer cast after casting this skill") continue;
      else if (action.itemId === "Burst_Hammer" && ["If the summoner has Tenacity Blessing stacks when casting this skill, consumes 1 stack of Tenacity Blessing to make this cast deal +30 % additional damage", "The pummel and explosion caused by this skill can hit the same enemy.", shotgun?.[0]].includes(line)) continue;
      else if (action.itemId === "Flickering_Shadow" && ["Removes 1 stack of Wilt and +75 % additional damage for this skill when hitting a Wilted enemy", "This skill cannot inflict Wilt"].includes(line)) continue;
      else if (action.itemId === "Sin_of_the_Fallen" && line === "+100 % Wilt Chance for this skill and adds 5 - 5 Base Wilt Damage") continue;
      else reasons.push(`소환체 스킬의 조건 계산 미지원: ${action.name} · ${line}`);
    }
    // Added-as uses the original cold pool before conversion.
    if (type === "cold" && profile.actions.some(a => a.itemId === "Firebird")) pools.push({ type: "fire", portion: .1 * b?.moduleFirebird });
    if (match[1] === "Persistent" && b?.[`moduleRate${n}`] > 1) reasons.push("지속 대미지의 활성 비율은 0~1로 입력하세요.");
    if (match[1] === "Persistent" && !valid(enemyFields.affliction, input?.enemy?.affliction)) reasons.push("소환체 지속 대미지의 대상 심화 수치를 입력하세요.");
    const combatState = theaState(build)?.events ?? {};
    let erosionHit = 0;
    const lightningRolls = [];
    const perHit = pools.reduce((total, pool) => {
      const stats = new Set(["damage", `${pool.type}_damage`, ...action.tags.map(t => `${t.toLowerCase()}_damage`)]);
      // A tag denotes skill identity, not damage type after conversion.
      for (const damageType of ["physical", "fire", "cold", "lightning", "erosion"]) if (damageType !== pool.type && damageType !== type) stats.delete(`${damageType}_damage`);
      if (["fire", "cold", "lightning"].includes(pool.type) || ["fire", "cold", "lightning"].includes(type)) stats.add("elemental_damage");
      const relevant = minionEffects.filter(e => stats.has(e.stat));
      const inc = relevant.filter(e => e.operation === "add_percent").reduce((n, e) => n + e.value, 0);
      const more = relevant.filter(e => e.operation === "more").reduce((n, e) => n * (1 + e.value / 100), 1);
      const armorPen = minionEffects.filter(e => ["armor_penetration", "armor_damage_mitigation_penetration"].includes(e.stat)).reduce((n, e) => n + e.value, 0);
      const resPen = minionEffects.filter(e => e.stat === `${pool.type}_penetration`).reduce((n, e) => n + e.value, 0);
      if (!valid(enemyFields.armor, input?.enemy?.armor)) reasons.push("모듈 대상 적 아머 미입력");
      if (pool.type !== "physical" && !valid(enemyFields[pool.type], input?.enemy?.[pool.type])) reasons.push(`모듈 대상 ${pool.type} 저항 미입력`);
      const armor = report.beforeDefense || match[1] === "Persistent" ? 1 : 1 - Math.min(.8, input?.enemy?.armor / (.9 * input?.enemy?.armor + 30000)) * (pool.type === "physical" ? 1 : .6) + armorPen / 100;
      const scorch = combatState.scorched ? build.ss14Inputs.theaEvents.scorchResistance : 0;
      const fixed = effects.find(e => e.stat === "enemy_erosion_resistance_fixed");
      const resistance = pool.type === "erosion" && fixed ? fixed.value : input?.enemy?.[pool.type];
      const res = report.beforeDefense || pool.type === "physical" ? 1 : 1 - (resistance - scorch - resPen) / 100;
      const targetEffects = effects.filter(e => e.stat === `${pool.type}_damage_taken` || e.stat === "spell_damage_taken" && match[1] === "Spell");
      if (targetEffects.some(e => e.operation !== "more" || !Number.isFinite(e.value))) reasons.push("소환체 대상의 받는 대미지 연산을 확인하세요.");
      const taken = targetEffects.reduce((n, e) => n * (1 + e.value / 100), 1) * (pool.type === "lightning" ? 1 + (combatState.numbedEffect ?? 0) / 100 : 1)
        *netherMore(effects,'enemy_all_damage_taken')*netherMore(effects,match[1]==='Persistent'?'enemy_dot_damage_taken':'enemy_hit_damage_taken');
      const damage = average * Number(match[3]) / 100 * pool.portion * (1 + inc / 100) * more * armor * res * taken * (match[1] === "Persistent" ? 1 + input.enemy.affliction / 100 : crit);
      if (pool.type === "erosion") erosionHit += damage;
      if (pool.type === "lightning") lightningRolls.push({ random: Boolean(pool.random),
        min: average > 0 ? damage / average / crit * range[0] * (1 + main) * hostMore : 0,
        max: average > 0 ? damage / average / crit * range[1] * (1 + main) * hostMore : 0 });
      return total + damage;
    }, 0);
    const dps = perHit * multiplier * b?.[`moduleRate${n}`] * hitCount * b?.minionCount * b?.minionUptime / 100 * (match[1] === "Persistent" ? 1 : b?.hitChance / 100);
    return { slug: action.itemId, name: DATA.koActions.records[action.itemId].name, coefficient: Number(match[3]), dps,
      perCast: perHit * multiplier * hitCount, hitCount: b?.[`moduleHits${n}`], persistent: match[1] === "Persistent", damageTypes: pools.filter(p => p.portion > 0 && !p.random).map(p => p.type),
      randomElemental: pools.some(p => p.random), lightningRolls, criticalChance: Math.min(1, (b?.minionCriticalRating + 300 * state("moduleHighCourt")) * (1 + criticalIncrease / 100) * criticalMore / 10000), criticalMultiplier: 1 + criticalDamage,
      deterioration: erosionHit * hitCount * .6, deteriorationChance: Math.min(1, minionEffects.filter(e => e.stat === "deterioration_chance").reduce((sum,e) => sum + e.value / 100, 0)),
      deteriorationDelay: state("moduleProfane") ? 1.07 : 1 };
  });
  let dps = row.minionSkills.reduce((sum, action) => sum + action.dps, 0);
  if (config?.moduleOptionIds.includes("protocol_elemental")) {
    if (b.moduleIgniteBaseMin > b.moduleIgniteBaseMax) reasons.push("소환체 기본 점화의 최소·최대 값을 확인하세요.");
    if (b.moduleIgniteStacks > 0 && (b.moduleIgniteBaseMax === 0 || b.hitChance === 0 || b.minionCount === 0)) reasons.push("기본 점화 대미지와 실제 소환체 적중 없이 점화 중첩을 적용할 수 없습니다.");
    if (!valid(enemyFields.fire, input?.enemy?.fire) || !valid(enemyFields.affliction, input?.enemy?.affliction)) reasons.push("소환체 점화의 대상 화염 저항·심화 수치를 선택하세요.");
    const eligible = minionEffects.filter(e => ["damage", "fire_damage", "elemental_damage", "damage_over_time", "ailment_damage"].includes(e.stat));
    const increase = eligible.filter(e => e.operation === "add_percent").reduce((n,e) => n + e.value, 0);
    const more = eligible.filter(e => e.operation === "more").reduce((n,e) => n * (1 + e.value / 100), 1);
    const penetration = minionEffects.filter(e => e.stat === "fire_penetration").reduce((n,e) => n + e.value, 0);
    const taken = effects.filter(e => e.stat === "fire_damage_taken").reduce((n,e) => n * (1 + e.value / 100), 1)*netherMore(effects,'enemy_all_damage_taken')*netherMore(effects,'enemy_dot_damage_taken');
    row.ailmentDps = (b.moduleIgniteBaseMin + b.moduleIgniteBaseMax) / 2 * (1 + main) * hostMore * (1 + increase / 100) * more
      * (report.beforeDefense ? 1 : 1 - (input.enemy.fire - penetration) / 100) * taken * (1 + input.enemy.affliction / 100) * b.moduleIgniteStacks * b.moduleIgniteUptime / 100;
    // These are observed final target stacks, not stacks per creature. Never
    // multiply them by count or accuracy a second time.
    dps += row.ailmentDps;
  }
  if (config?.moduleOptionIds.includes("source_meltdown")) {
    row.explosionDps = b.moduleKillRate * b.moduleKilledLife * .2 * 2.5 * b.moduleExplosionHits;
    dps += row.explosionDps;
  }
  const elixirExplosion = report.componentProjection.rows.flatMap(r => r.mechanics ?? []).filter(m => m.kind === "elixir-minion-kill-explosion");
  for (const m of elixirExplosion) {
    const contribution = b.moduleKillRate * b.moduleKilledLife * m.chance * m.lifeMultiplier * b.moduleExplosionHits;
    row.explosionDps = (row.explosionDps ?? 0) + contribution; dps += contribution;
  }
  if (config?.moduleOptionIds.includes("source_breakpoint")) {
    if (b.moduleExecuteRate > 0 && (!(b.moduleExecuteLife < b.moduleExecuteMaxLife * .18) || b.moduleExecuteMaxLife <= 0)) reasons.push("처형 대상의 남은 HP가 최대 HP의 18% 미만이어야 합니다.");
    const hits = profile.actions.reduce((sum, _, i) => sum + b[`moduleRate${i}`] * b[`moduleHits${i}`], 0) * b.minionCount * b.minionUptime / 100 * b.hitChance / 100;
    if (b.moduleExecuteRate > hits) reasons.push("처형 횟수는 소환체의 실제 적중 횟수를 넘을 수 없습니다.");
    row.executeDps = b.moduleExecuteRate * b.moduleExecuteLife;
    dps += row.executeDps;
  }
  if (!Number.isFinite(dps) || dps < 0) reasons.push("모듈 소환체 대미지·횟수 입력을 확인하세요.");
  row.blockers = [...new Set(reasons)]; row.supported = !reasons.length;
  if (row.supported) row.values.dps = row.values.minionDps = dps;
  return row;
}
