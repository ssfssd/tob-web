import { SS14_DPS_RULES } from "./data/ss14DpsRules.generated.js";
import { logReviewRows } from "./seasonLogReview.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { bingRecovery } from "./seasonBingRecovery.js";
import { SEASON_LOCAL_WEAPON_STATS, SEASON_GLOBAL_FLAT_STATS, SEASON_GEAR_LEVEL_STATS, SEASON_DEFENSIVE_STATS } from "./seasonGearEffects.js";
import { SS14_GEAR_EN } from './data/ss14Gear.en.generated.js';
import { SEASON_BLESSING_CAP_STATS } from './seasonBlessings.js';
import { SEASON_CURSE_STATS } from './seasonCurseEffects.js';
import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { seasonDirectDamageStat, seasonDpsSpecialStat } from "./seasonCoupledCalculation.js";
import { findItemById } from "./catalog.js";
import { mechanicPage, seasonMechanicPins } from "./seasonMechanicInputs.js";
import { SEASON_MINION_FIELDS, seasonMinionFieldKeys, seasonMinionProfile, calculateSeasonMinion } from "./seasonMinions.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";
import { theaState } from "./seasonTheaState.js";
import { WEAPON_FIELDS, ADDED_FIELDS, seasonDamageContext } from "./seasonWeaponInputs.js";
import { seasonWeaponProfile } from './seasonWeaponProfile.js';
import { MODULE_FIELDS, seasonModuleProfile, seasonModuleFieldKeys, calculateSeasonModule } from "./seasonModules.js";
import { checkSeasonSupportHost } from "./seasonSupport.js";
import { NETHER_CONSUMED_STATS, netherMore, netherAfflictionEffect } from './seasonNetherRemaining.js';
import { netherCorePlan } from './seasonNetherDps.js';

const finite = Number.isFinite;
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const hash = v => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const round = v => finite(v) ? Math.round(v * 1e5) / 1e5 : null;
export const SEASON_DPS_ENEMY_FIELDS = {
  armor: { label: "적 아머", min: 0, max: 10000000 },
  fire: { label: "적 유효 화염 저항 (%)", min: -200, max: 90 },
  cold: { label: "적 유효 냉기 저항 (%)", min: -200, max: 90 },
  lightning: { label: "적 유효 번개 저항 (%)", min: -200, max: 90 },
  erosion: { label: "적 유효 부식 저항 (%)", min: -200, max: 90 },
  affliction: { label: "적 심화 수치", min: 0, max: 100 },
};
export const SEASON_DPS_SKILL_FIELDS = {
  ...WEAPON_FIELDS, ...ADDED_FIELDS,
  ...SEASON_MINION_FIELDS,
  ...MODULE_FIELDS,
  useShare: { label: "시전 시간 배분 (%)", min: 0, max: 100 },
  hitChance: { label: "대상 적중률 (%)", min: 0, max: 100 },
  castRate: { label: "복합 계산의 일반 시전 횟수 / 초", min: 0, max: 100 },
  multistrikeChance: { label: "연속 공격 확률 (%)", min: 0, max: 1000 },
  multistrikeIncrement: { label: "계시 보너스 전 연속 공격 대미지 증가량 (%)", min: 0, max: 1000 },
  resourceAttacks: { label: "자원이 허용하는 연속 공격 수 (0은 제한 없음)", min: 0, max: 100, integer: true },
  movementAttacks: { label: "이동·다른 행동 전 연속 공격 수 (0은 중단 없음)", min: 0, max: 100, integer: true },
  repeatHits: { label: "처치 재발동의 대상 적중 횟수 (초당)", min: 0, max: 1000 },
  dotUptime: { label: "지속 대미지 유지율 (%)", min: 0, max: 100 },
  additionalChannelStacks: { label: "기본값보다 추가된 최대 집중 중첩", min: 0, max: 100, integer: true },
  terraCharges: { label: "이번 시전에 소모한 대지 충전", min: 0, max: 1, integer: true },
  euphoria: { label: "해당 스킬의 버프 적용 여부 (0 또는 1)", min: 0, max: 1, integer: true },
  swampMoved: { label: "현재 늪이 이동 보너스를 보유함 (0 또는 1)", min: 0, max: 1, integer: true },
  recentSpellProjectiles: { label: "최근 생성한 주술 투사체 수", min: 0, max: 10000, integer: true },
  periodicBurstUptime: { label: "간헐적 폭발 현재 상태", min: 0, max: 100, choices: [[0, "미적용"], [100, "적용"]] },
  incomingHits: { label: "반사를 유발하는 피격 횟수 / 초", min: 0, max: 1000 },
  coreTriggerRate: { label: "코어 전체 주술 발동 횟수 / 초", min: 0, max: 1000 },
  coreUptime: { label: "클락워크 코어 유지율 (%)", min: 0, max: 100 },
  chainActive: { label: "계산 대상에 노예의 사슬 적용", min: 0, max: 1, integer: true, choices: [[0, "미적용"], [1, "적용"]] },
  extraHits: { label: "대지 이동으로 실제 적중한 추가 폭발 (초당)", min: 0, max: 1000 },
};
const validValue = (field, value) => field && typeof value === "number" && finite(value) && value >= field.min && value <= field.max && (!field.integer || Number.isInteger(value)) && (!field.choices || field.choices.some(([v]) => v === value));
export function seasonDpsSkillFieldKeys(entry, id, build) {
  if (seasonModuleProfile(id)) return seasonModuleFieldKeys(seasonModuleProfile(id), build?.skills?.active?.find(s => s?.skillId === id)?.modularization?.moduleOptionIds, build);
  if (seasonMinionProfile(id)) return ["useShare", "hitChance", ...seasonMinionFieldKeys(seasonMinionProfile(id))];
  const keys = ["useShare", "hitChance"];
  const index = build?.skills?.active?.findIndex(s => s?.skillId === id);
  if (index === 0) {
    if (build?.gear?.slots?.some(s => s?.itemId === "gear-ss14-on-the-sublime")) keys.push("recentSpellProjectiles");
    if (build?.gear?.slots?.some(s => s?.itemId === "gear-tlidb-com-cn-glorious-journey")) keys.push("incomingHits");
    if (build?.skills?.active?.[0]?.supports?.some(s => s?.supportId === "supports-ss14-clockwork-core")) keys.push("coreTriggerRate", "coreUptime", "chainActive");
    if (build?.skills?.active?.some(s => s?.supports?.some(s => s?.supportId === "supports-tlidb-com-cn-periodic-burst"))) keys.push("periodicBurstUptime");
  }
  if (SS14_CARDS_EN.records[id]?.tags?.includes("Attack") && !seasonWeaponProfile(build).enabled) keys.push(...Object.keys(WEAPON_FIELDS));
  if (theaCombatEnabled(build)) {
    keys.push("castRate", ...Object.keys(ADDED_FIELDS));
    if (SS14_CARDS_EN.records[id]?.tags?.includes("Attack")) keys.push("multistrikeChance", "multistrikeIncrement", "resourceAttacks", "movementAttacks");
  }
  if (entry?.mechanics?.some(m => m.kind === "ice-ring-on-kill")) keys.push("repeatHits");
  if (/Persistent [A-Za-z]+ [Dd]amage/u.test(SS14_CARDS_EN.records[id]?.detail ?? "")) keys.push("dotUptime");
  keys.push(...(entry?.mechanics ?? []).map(m => m.field).filter(Boolean));
  return [...new Set(keys)];
}
export const seasonDpsRulePins = () => Object.fromEntries(Object.values(SS14_DPS_RULES.pages).filter(p => p.locale === "en").map(p => [p.sourceUrl, p.sourcePageSha256]));

export function validSeasonDpsInputs(inputs) {
  if (inputs.dps !== undefined) {
    const d = inputs.dps;
    if (!object(d) || d.version !== 1 || Object.keys(d).some(k => !["version", "enemy", "skills"].includes(k))
      || !object(d.enemy) || !object(d.skills) || !Object.entries(d.enemy).every(([k, v]) => validValue(SEASON_DPS_ENEMY_FIELDS[k], v))) return false;
    for (const [key, b] of Object.entries(d.skills)) {
      if (!/^[0-8]$/u.test(key) || !object(b) || typeof b.itemId !== "string" || !hash(b.sourcePageSha256)
        || !Object.entries(b).every(([k, v]) => ["itemId", "sourcePageSha256"].includes(k) || validValue(SEASON_DPS_SKILL_FIELDS[k], v))) return false;
    }
  }
  return inputs.dpsRuleReceipts === undefined || object(inputs.dpsRuleReceipts)
    && Object.entries(inputs.dpsRuleReceipts).every(([url, value]) => Object.hasOwn(seasonDpsRulePins(), url) && hash(value));
}

export function editSeasonDpsInput(target, key, value) {
  const [slot, field] = String(key).split(":");
  const enemy = slot === "enemy";
  const definition = (enemy ? SEASON_DPS_ENEMY_FIELDS : SEASON_DPS_SKILL_FIELDS)[field];
  if (!definition || value !== "" && !validValue(definition, value) || !enemy && !/^[0-8]$/u.test(slot)) throw new Error("DPS 입력의 항목과 표시 범위를 확인하세요.");
  const inputs = target.ss14Inputs;
  if (value === "" && inputs.dps === undefined) return;
  inputs.dps ??= { version: 1, enemy: {}, skills: {} };
  let binding = inputs.dps.enemy;
  if (!enemy) {
    const index = Number(slot); const skill = index < 5 ? target.skills.active[index] : target.skills.passive[index - 5];
    const record = SS14_CARDS_EN.records[skill?.skillId];
    if (record?.season !== "SS14" || record.status !== "collected-preview") throw new Error("SS14 원문이 연결된 스킬을 먼저 선택하세요.");
    const old = inputs.dps.skills[slot];
    binding = old?.itemId === skill.skillId && old.sourcePageSha256 === record.sourcePageSha256 ? old
      : { itemId: skill.skillId, sourcePageSha256: record.sourcePageSha256 };
    inputs.dps.skills[slot] = binding;
  }
  if (value === "") delete binding[field]; else binding[field] = value;
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

function coverage(build, report, effects) {
  const blockers = [...(report.componentProjection.globalBlockers ?? [])];
  if(report.character?.values.reservedManaPercent>100)blockers.push('선택한 패시브의 MP 봉인 합이 100%를 초과합니다.');
  const nether=report.componentProjection.rows.some(r=>r.netherTalentId||r.itemId?.startsWith('nether_'));
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
      if (row.status !== "mapped" && !(row.category === "skills" && (seasonMinionProfile(row.id) || seasonModuleProfile(row.id)))) blockers.push(`${row.label} · ${row.name}: ${row.reasons.join(" · ")}`);
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
  if (build.customAffixes?.trim() || Object.keys(build.calculation ?? {}).some(k => k !== "selectedSkill") || Object.keys(build.conditions ?? {}).length)
    blockers.push("원본 사용자 옵션·계산 설정·전투 조건의 SS14 전체 연결이 필요합니다.");
  if (build.hero?.revivalMemory) blockers.push("부활 추억의 전체 공격 효과 연결이 필요합니다.");
  for (const effect of effects) {
    if(SEASON_BLESSING_CAP_STATS.has(effect.stat))continue; // validated by projectSeasonBlessings
    if(effect.stat==='max_vorax_gear_equipped') {
      const count=(build.gear?.slots??[]).filter(s=>SS14_GEAR_EN.records[s?.itemId]?.detail?.includes('You can only equip 1 Vorax Gear')).length;
      if(effect.operation!=='set'||effect.value!==1||count>1)blockers.push('보락스 장비는 동시에 1개만 장착할 수 있습니다.');
      continue;
    }
    if (separatelyHandledGear.has(effect.stat) || SEASON_LOCAL_WEAPON_STATS.has(effect.stat) || SEASON_GLOBAL_FLAT_STATS.has(effect.stat)
      || /^(?:physical|cold|fire|lightning|erosion|minion)_skill_levels$/u.test(effect.stat)
      || /^attack_(?:physical|cold|fire|lightning|erosion)_damage_(?:min|max)$/u.test(effect.stat)) continue;
    if (/^(fire|cold|lightning)_damage_reflection$/u.test(effect.stat) && build.ss14Inputs?.dps?.skills?.[0]?.incomingHits === 0) continue;
    if (effect.condition || effect.conditionRequirements || effect.per || effect.target || !finite(effect.value) && typeof effect.value !== "boolean") {
      blockers.push(effect.roll && !finite(effect.value)
        ? `장비 옵션 수치를 입력하세요: ${effect.sourceText ?? effect.stat}`
        : `조건·대상·수치 미확인: ${effect.sourceText ?? effect.stat}`); continue;
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
  const effects = [...report.componentProjection.effects, ...report.components.filter(c => c.category === "gear")
    .flatMap(c => c.calculations ?? []).flatMap(c => c.rawEffects ?? [])];
  const blockers = coverage(build, report, effects);
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
  const lucky = stat => {
    const rows = special.filter(e => e.stat === stat);
    if (rows.some(e => e.operation !== "set" || ![1, true].includes(e.value))) blockers.push("대미지 행운·불운 효과 값 미확인");
    rows.forEach(e => consumed.add(e)); return rows.length > 0;
  };
  const veryLucky = lucky("damage_very_lucky"); const normalLucky = lucky("damage_lucky"); const unlucky = lucky("damage_unlucky");
  const luck = (veryLucky ? 2 : normalLucky ? 1 : 0) - (unlucky ? 1 : 0);
  if ((normalLucky || veryLucky || unlucky) && !body(rules, "Lucky").includes("cancel into Lucky")) blockers.push("SS14 대미지 행운·불운 상쇄 공식 미확인");
  for (const e of special) if (!consumed.has(e)) blockers.push(`계산되지 않은 특수 효과: ${e.sourceText ?? e.stat}`);
  let totalShare = 0; let burstUsers = 0;
  const rows = report.coupledSkills.rows.map(direct => {
    const reasons = [...direct.blockers];
    const record = SS14_CARDS_EN.records[direct.id];
    const entry = report.components.filter(c => c.category === "skills").flatMap(c => c.calculations ?? []).find(c => c.rowIndex === direct.rowIndex);
    const offense = report.offense.rows.find(r => r.rowIndex === direct.rowIndex);
    const b = input?.skills?.[direct.rowIndex];
    if (b && ["Min", "Max"].some(s => b[`addedLightning${s}`] !== undefined)
      && !(finite(b.addedLightningMin) && finite(b.addedLightningMax) && b.addedLightningMin <= b.addedLightningMax)) reasons.push("추가 번개 대미지의 최소·최대 값을 모두 확인하세요.");
    const basis = direct.offenseBasis;
    const module = seasonModuleProfile(direct.id);
    if (module) {
      totalShare += b?.useShare ?? 0;
      return calculateSeasonModule(build, report, { ...entry, rowIndex: direct.rowIndex, level: entry?.level ?? build.skills.active[direct.rowIndex].level }, module, effects, validValue, SEASON_DPS_ENEMY_FIELDS);
    }
    const minion = seasonMinionProfile(direct.id);
    if (minion) {
      totalShare += b?.useShare ?? 0;
      const result = calculateSeasonMinion(build, report, entry, minion, effects, validValue, SEASON_DPS_ENEMY_FIELDS);
      if (!validValue(SEASON_DPS_SKILL_FIELDS.useShare, b?.useShare)) { result.supported = false; result.values.dps = null; result.blockers.push("소환 스킬 시전 시간 배분을 입력하세요."); }
      return result;
    }
    if (!b || b.itemId !== direct.id || b.sourcePageSha256 !== record?.sourcePageSha256) reasons.push("이 스킬의 SS14 전투 입력을 다시 확인하세요.");
    for (const key of ["useShare", "hitChance"]) if (!validValue(SEASON_DPS_SKILL_FIELDS[key], b?.[key])) reasons.push(`${SEASON_DPS_SKILL_FIELDS[key].label} 미입력`);
    totalShare += b?.useShare ?? 0;
    if (!offense?.supported) reasons.push(...(offense?.blockers ?? ["속성·크리티컬 계산 미지원"]));
    const hasHit = Boolean(basis?.pools?.length); const hasDot = Boolean(basis?.dotPools?.length);
    if ((direct.supported || !direct.blockers.length)
      && (!hasHit && !hasDot || basis?.projectileHits !== 1 || !finite(basis?.rate) || hasHit && basis.rate <= 0))
      reasons.push("명중·지속 대미지 유형 또는 시전 빈도 분리 미완료");
    if (basis?.nativeSpellBurst) reasons.push("스킬·보조에서 부여한 매직 버스트의 적용 범위 분리 미완료");
    const observedDotExclusion = e => hasDot && (["cast-time", "cooldown"].includes(e.stat) && e.reason === "no-hit-cadence-not-applied"
      || ["damage-over-time-effect-duration", "frost-terra-duration", "swamp-terra-duration", "persistent-cold-duration", "persistent-erosion-duration", "skill-duration", "supported-skill-duration", "effect-stacks", "max-channeled-stacks"].includes(e.stat) && e.reason === "non-offensive-dps-effect"
      || e.stat === "skill-movement-speed" || e.stat === "added-damage-effectiveness" && e.reason === "added-damage-hit-target-unavailable");
    for (const e of basis?.excluded ?? []) if (!["mana-cost", "mana-cost-multiplier", "skill-area", "supported-skill-area"].includes(e.stat) && !observedDotExclusion(e)
      && !(e.reason === 'cadence-speed-kind-not-selected' && !e.affectsCompletion)
      && !(e.reason === 'skill-has-no-cooldown' && !e.affectsCompletion)
      && !(e.stat === "cast-time" && e.reason === "context-action-time-used" && finite(seasonDamageContext(build, direct.rowIndex, direct.id).attackSpeed)))
      reasons.push(`스킬·보조의 미적용 효과: ${e.sourceText || e.stat}`);
    if (direct.rowIndex >= 5) reasons.push("패시브 스킬의 전체 효과 연결 미완료");
    const types = new Set([...(basis?.pools ?? []), ...(basis?.dotPools ?? [])].map(p => p.type));
    for (const key of [...(hasHit ? ["armor"] : []), ...[...types].filter(t => t !== "physical")])
      if (!validValue(SEASON_DPS_ENEMY_FIELDS[key], input?.enemy?.[key])) reasons.push(`${SEASON_DPS_ENEMY_FIELDS[key]?.label ?? key} 미입력`);
    const iceRing = entry?.mechanics?.find(m => m.kind === "ice-ring-on-kill");
    if (iceRing && !validValue(SEASON_DPS_SKILL_FIELDS.repeatHits, b?.repeatHits)) reasons.push("아이스링 처치 재발동의 대상 적중 횟수를 확인하세요. 단일 보스에서 재발동이 없으면 0입니다.");
    if (!iceRing && (b?.repeatHits ?? 0) !== 0) reasons.push("처치 재발동 입력은 아이스링에만 적용할 수 있습니다.");
    const tags = record?.tags ?? [];
    const core = build.skills?.active?.[direct.rowIndex]?.supports?.[1]?.supportId === "supports-ss14-clockwork-core";
    const clockworkHero = heroMechanics.some(m => m.kind === 'clockwork-main-only');
    if (clockworkHero && direct.rowIndex === 0 && !core) reasons.push('최후의 존재의 메인 스킬 두 번째 보조 칸에 클락워크 코어를 선택하세요.');
    const eligibleBurst = !core && !(clockworkHero && direct.rowIndex !== 0) && hasHit && tags.includes("Spell") && !tags.some(t => ["Summon", "Sentry", "Channeled", "Channel", "Trigger", "Combo"].includes(t)) && !(entry?.values?.cooldown > 0);
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
    if (luck !== 0 && (basis?.pools ?? []).filter(p => p.min !== p.max).length > 1) reasons.push("대미지 행운의 여러 대미지 범위 합산 분포 미확인");
    const armor = input?.enemy?.armor;
    const reduction = Math.min(.8, armor / (.9 * armor + 30000));
    const pools = (basis?.pools ?? []).map(p => {
      const projectilePen = tags.includes("Projectile") ? effects.filter(e => e.stat === "projectile_armor_penetration").reduce((n, e) => n + e.value, 0) : 0;
      const armorMultiplier = report.beforeDefense ? 1 : 1 - reduction * (p.type === "physical" ? 1 : .6) + (armorPenetration + projectilePen) / 100;
      const fixedResistance = p.type === "erosion" ? effects.find(e => e.stat === "enemy_erosion_resistance_fixed")?.value : undefined;
      const spellPen = tags.includes("Spell") && ["fire", "cold", "lightning"].includes(p.type) ? simple("spell_elemental_penetration", "add_percent") : 0;
      const resistanceMultiplier = report.beforeDefense || p.type === "physical" ? 1 : 1 - ((fixedResistance ?? input?.enemy?.[p.type]) - (combatState.scorched ? build.ss14Inputs.theaEvents.scorchResistance : 0) - penetration[p.type] - spellPen) / 100;
      const coldTaken = effects.filter(e => e.stat === `enemy_${p.type}_damage_taken` || p.type!=='physical'&&e.stat === `${p.type}_damage_taken`).reduce((n, e) => n * (1 + e.value / 100), 1);
      const numbed = p.type === "lightning" ? 1 + (combatState.numbedEffect ?? 0) / 100 : 1;
      return { ...p, multiplier: armorMultiplier * resistanceMultiplier * coldTaken * numbed,
        min: p.min * armorMultiplier * resistanceMultiplier * coldTaken * numbed, max: p.max * armorMultiplier * resistanceMultiplier * coldTaken * numbed };
    });
    const min = pools.reduce((n, p) => n + p.min, 0); const max = pools.reduce((n, p) => n + p.max, 0);
    const coldCrit=effects.filter(e=>e.stat==='cold_critical_hit_damage');
    if(coldCrit.some(e=>e.operation!=='more'||!finite(e.value)||e.value<0))reasons.push('냉기 크리티컬 적중 추가 배율 미확인');
    const chance=(offense?.values.effectiveCriticalChance??0)/100, critDamage=(offense?.values.criticalDamage??150)/100*(offense?.values.criticalOnlyMultiplier??1);
    const coldCritRatio=(1+chance*(critDamage*coldCrit.reduce((n,e)=>n*(1+e.value/100),1)-1))/(1+chance*(critDamage-1));
    const mean = pools.reduce((n,p)=>n+(p.min+(p.max-p.min)*(luck>=0?(luck+1)/(luck+2):1/3))*(p.type==='cold'?coldCritRatio:1),0);
    const criticalMultiplier = offense?.values.hitMultiplier ?? offense?.values.expectedDps / offense?.values.attributedDps;
    const taken = tags.includes("Spell") ? effects.filter(e => e.stat === "spell_damage_taken") : [];
    if (taken.some(e => e.operation !== "more" || !finite(e.value) || e.value < -100)) reasons.push("받는 주술 대미지 연산 미확인");
    const takenMultiplier = taken.reduce((n, e) => n * (1 + e.value / 100), 1)*netherMore(effects,'enemy_hit_damage_taken')*netherMore(effects,'enemy_all_damage_taken');
    const landedHit = mean * offense?.values.attributeMultiplier * criticalMultiplier * takenMultiplier;
    const hit = landedHit * b?.hitChance / 100;
    const autoNetherBurst=direct.rowIndex===0&&heroMechanics.some(m=>m.kind==='nether-core-trigger'&&m.trigger==='burst'&&m.rate>0);
    if(autoNetherBurst){burstActivationRate=0;burstExtraRate=0;}
    const manualDps = hit * shotgun.multiplier * Math.max(0, manualRate - burstActivationRate);
    // The activating manual cast also receives Spell Burst-only damage.
    const burstDps = hit * shotgun.multiplier * (burstActivationRate + burstExtraRate) * burstHitMore;
    const repeatDps = landedHit * (iceRing ? b?.repeatHits : 0);
    const heroDps = hit * shotgun.multiplier * heroRate * burstHitMore;
    let dotDps = 0;
    if (hasDot) {
      const form = mechanicPage(build, "Damage_Form"); const afflictionPage = mechanicPage(build, "Amplified_Damage_Over_Time");
      if (!form?.body.includes("The following mechanics will not affect Damage Over Time: Accuracy and Evasion, Armor, Critical Strike")
        || !afflictionPage?.body.includes("Each point of Affliction increases Damage Over Time")) reasons.push("SS14 지속 대미지·심화 공식 근거가 없거나 변경되었습니다.");
      if (!validValue(SEASON_DPS_SKILL_FIELDS.dotUptime, b?.dotUptime) || !validValue(SEASON_DPS_ENEMY_FIELDS.affliction, input?.enemy?.affliction)) reasons.push("지속 대미지 유지율과 적 심화 수치를 입력하세요.");
      const afflictionEffects = effects.filter(e => e.stat === "affliction_effect");
      if (afflictionEffects.some(e => !['add_percent','more'].includes(e.operation) || !finite(e.value))) reasons.push("심화 효과의 연산 미지원");
      const afflictionMultiplier = 1 + input?.enemy?.affliction / 100 * netherAfflictionEffect(effects);
      dotDps = basis.dotPools.reduce((n, p) => {
        const fixed = p.type === "erosion" ? effects.find(e => e.stat === "enemy_erosion_resistance_fixed")?.value : undefined;
        const spellPen = tags.includes("Spell") && ["fire", "cold", "lightning"].includes(p.type) ? simple("spell_elemental_penetration", "add_percent") : 0;
        const taken = effects.filter(e => e.stat === `enemy_${p.type}_damage_taken` || p.type!=='physical'&&e.stat === `${p.type}_damage_taken`).reduce((n,e) => n * (1 + e.value / 100), 1);
        return n + (p.min + p.max) / 2 * taken * (report.beforeDefense || p.type === "physical" ? 1 : 1 - ((fixed ?? input.enemy[p.type]) - (combatState.scorched ? build.ss14Inputs.theaEvents.scorchResistance : 0) - penetration[p.type] - spellPen) / 100)
          * (p.type === "lightning" ? 1 + (combatState.numbedEffect ?? 0) / 100 : 1);
      }, 0)
        * offense?.values.attributeMultiplier * afflictionMultiplier * b?.dotUptime / 100*netherMore(effects,'enemy_dot_damage_taken')*netherMore(effects,'enemy_all_damage_taken');
    }
    const extraDps = entry?.mechanics?.some(m => m.kind === "swamp-move") ? landedHit * b?.extraHits : 0;
    const nether=netherCorePlan(heroMechanics,{rowIndex:direct.rowIndex,tags,eligibleBurst,maxBurst,burstChargeSpeed:burstSpeed*burstMore,
      hit:hit*shotgun.multiplier*(autoNetherBurst?burstHitMore:1),dotDps,combat,manualRate,cardDetail:record?.detail??''});
    reasons.push(...nether.blockers);
    const dps = manualDps + burstDps + repeatDps + heroDps + dotDps + extraDps + nether.dps;
    if (!reasons.length && (!finite(dps) || dps < 0)) reasons.push("전체 DPS를 산출할 입력이 부족하거나 계산 범위를 벗어났습니다.");
    return { id: direct.id, rowIndex: direct.rowIndex, supported: reasons.length === 0, blockers: [...new Set(reasons)],
      values: { dps: reasons.length ? null : round(dps), averageHit: reasons.length ? null : round(hit),
        manualDps: reasons.length ? null : round(manualDps), spellBurstDps: reasons.length ? null : round(burstDps),
        repeatDps: reasons.length ? null : round(repeatDps + extraDps), heroDps: reasons.length ? null : round(heroDps), dotDps: reasons.length ? null : round(dotDps), netherDps:reasons.length?null:round(nether.dps), manualRate: round(manualRate), burstActivationRate: round(burstActivationRate), burstExtraRate: round(burstExtraRate) },
      nether, shotgun,
      pools, mechanics: entry?.mechanics ?? [],
      combat: combat ? { tags, rate: basis?.rate, increasedAttackSpeed: evaluationAttackSpeed(direct.trace), luck,
        elixirScorch: report.componentProjection.rows.some(r => r.mechanics?.some(m => m.kind === "elixir-scorch")),
        attributeMultiplier: offense?.values.attributeMultiplier, critical: offense?.values, takenMultiplier, penetration,
        burstHitMore, maxBurst, burstChargeSpeed: burstSpeed * burstMore, eligibleBurst, hasDot,
        dotWithoutAffliction: hasDot ? dotDps / (1 + (input.enemy.affliction ?? 0) / 100 * netherAfflictionEffect(effects)) : 0,
        afflictionEffect: netherAfflictionEffect(effects),
        igniteSupportEffects: direct.igniteSupportEffects, effects } : undefined };
  });
  if (totalShare > 100 + 1e-8) blockers.push("스킬 시전 시간 배분의 합이 100%를 초과합니다. 동시 최대 DPS를 합산하지 않습니다.");
  if (burstUsers > 1) blockers.push("여러 스킬이 공유하는 매직 버스트 충전·발동 순서 미확인");
  for (const id of new Set(rows.filter(r => seasonMinionProfile(r.id)).map(r => r.id))) {
    if (rows.filter(r => r.id === id).reduce((n, r) => n + (input?.skills?.[r.rowIndex]?.minionCount ?? 0), 0) > seasonMinionProfile(id).maximum)
      blockers.push("같은 종류의 소환체가 여러 스킬 칸에서 수량 상한을 초과해 중복 합산됩니다.");
  }
  blockers.push(...rows.flatMap(r => r.blockers));
  const unique = [...new Set(blockers)];
  const supported = rows.length > 0 && unique.length === 0;
  return { supported, scope: "ss14-fixed-scenario-full-dps", dps: supported ? round(rows.reduce((n, r) => n + r.values.dps, 0)) : null,
    rows, blockers: unique, heroMechanics, burstRecovery, receipts: [...Object.values(rules.pages).filter(p => p.locale === "en"), ...rows.flatMap(r => r.receipts ?? []),
      ...["Damage_Form", "Amplified_Damage_Over_Time", "Whimsy", "Whimsy_Signal", "Whimsy_Explosion", "Ingenuity_Overload"].map(slug => mechanicPage(build, slug)).filter(Boolean)],
    limitation: "입력한 적 1명·시전 시간 배분·적중률·현재 효과 상태에서 선택된 공격을 합산합니다. 자원 지속 가능성이나 실전 유지율은 자동 예측하지 않습니다. 적중률·발동 횟수·지속 대미지 유지율은 관측값이며, 미해석 효과가 남으면 전체 DPS를 표시하지 않습니다." };
}

function evaluationAttackSpeed(trace = []) {
  return trace.filter(e => e.stat === "skill-attack-speed" && ["add", "add_percent"].includes(e.operation)).reduce((n, e) => n + (e.resolvedValue ?? e.value ?? 0), 0);
}
