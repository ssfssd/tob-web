import { THEA_EVENT_FIELDS, validTheaEventValue } from "./seasonTheaEvents.js";
import { SS14_THEA_COMBAT } from "./data/ss14TheaCombat.generated.js";
export const theaCombatPin = () => SS14_THEA_COMBAT.receiptSha256;
export const theaCombatEnabled = build => build?.ss14Inputs?.theaEvents?.combatMode === 1;
export const NUMBED_DOT_WINDOW_REQUIRED = '마취가 변하는 전투에서는 번개 지속 대미지의 적용 구간을 입력하세요.';
export const REVELATION_NUMBED_REQUIRED = '선택한 계시가 번개 대미지로 마취를 부여합니다. 마취 계산을 켜고 대상 조건을 입력하세요.';
export const VARIABLE_DOT_WINDOW_REQUIRED = '전투 효과로 지속 대미지가 변합니다. 해당 스킬의 적용 구간을 입력하세요.';
export const BLESSING_DOT_WINDOW_REQUIRED = '지속 대미지로 축복이 발동할 수 있습니다. 해당 스킬의 적용 구간을 입력하세요.';
export function fixedNumbedStacks(build) {
  const stacks=build?.ss14Inputs?.dps?.enemy?.numbedStacks;
  return !theaCombatEnabled(build)&&Number.isInteger(stacks)&&stacks>=0&&stacks<=SS14_THEA_COMBAT.numbed.maxStacks
    ? stacks : undefined;
}
export const moduleElementalEnabled = build => (build.skills?.active ?? []).some(s => s?.modularization?.moduleOptionIds.includes("protocol_elemental"));
export const hasNumbedSupport = report => Boolean(report?.fullDps?.rows?.some(row => row.numbedOnHit));
export const combatNumbedEnabled = (build, report) => build.ss14Inputs?.theaEvents?.numbedEnabled === 1
  || moduleElementalEnabled(build) || hasNumbedSupport(report);
export function theaCombatInputValues(build, report, useNumbedDefaults=hasNumbedSupport(report)) {
  const input = build.ss14Inputs.theaEvents ?? {};
  const defaults = input.igniteEnabled !== 1 ? { afflictionRate: 0 } : {};
  if (!useNumbedDefaults) return { ...defaults, ...input };
  const { duration, maxStacks, thresholdPercent } = SS14_THEA_COMBAT.numbed;
  return { ...defaults, numbedDuration: duration, numbedLimit: maxStacks, numbedThreshold: thresholdPercent, numbedEffect: 0, ...input };
}
export const hasTheaNativeDot = report => report?.fullDps?.rows.some(row => row.combat?.dotWithoutAffliction > 0 || row.combat?.frostWithoutAffliction > 0) ?? false;
export function usesTheaDotTrigger(build, mechanics, report, numbed=combatNumbedEnabled(build, report)) {
  const input = build.ss14Inputs.theaEvents;
  const ignite = input.igniteEnabled === 1;
  return (ignite || hasTheaNativeDot(report))
    && mechanics.some(m => m.requiresIgnite && ignite || m.requiresNumbed && numbed);
}
export function theaCombatKeys(build, mechanics = [], report) {
  if (!theaCombatEnabled(build)) return [];
  const keys = ["igniteEnabled", "numbedEnabled"];
  const ignite = build.ss14Inputs.theaEvents.igniteEnabled === 1;
  if (ignite) keys.push("igniteBaseMin", "igniteBaseMax", "igniteChance", "igniteIncreased", "igniteDuration", "igniteLimit");
  const hasPersistentDamage = report?.fullDps?.rows.some(row =>
    row.combat?.hasDot || row.combat?.frostSource || row.elementalProtocol
    || row.minionSkills?.some(skill => skill.persistent || skill.slug === "Sin_of_the_Fallen"));
  if (ignite || hasPersistentDamage) keys.push("afflictionRate");
  if (usesTheaDotTrigger(build, mechanics, report)) keys.push("dotTriggerRate");
  if (mechanics.some(m => m.kind === "thea-scorch") || build.skills?.elixirs?.some(s => s?.skillId === "fire-lizard-distillate")) keys.push("scorchResistance");
  if (build.ss14Inputs.theaEvents.numbedEnabled === 1) keys.push("numbedChance");
  if (combatNumbedEnabled(build, report)) keys.push("enemyLifeShield", "numbedThreshold", "numbedDuration", "numbedLimit", "numbedEffect");
  for (const [i, slot] of (build.skills?.elixirs ?? []).entries()) if (slot?.skillId) keys.push(`elixir${i}Interval`, `elixir${i}Start`, `elixir${i}Duration`);
  return keys;
}
export function theaCombatInputBlockers(build, mechanics, report) {
  const input = theaCombatInputValues(build, report);
  const blockers = theaCombatKeys(build, mechanics, report).filter(k => !(report?.beforeDefense && k === 'scorchResistance')
    && (!validTheaEventValue(k, input[k]) || /^elixir[01](?:Interval|Duration)$/u.test(k) && input[k]===0))
    .map(k => `${THEA_EVENT_FIELDS[k].label}: 프로그램에서 값을 선택하세요.`);
  if (build.ss14Inputs.theaCombatReceipt !== theaCombatPin()) blockers.push("복합 발동의 SS14 근거를 다시 연결하세요.");
  if (input.igniteEnabled === 1 && (!(input.igniteDuration > 0) || !(input.igniteLimit > 0) || input.igniteBaseMin > input.igniteBaseMax)) blockers.push("점화의 최소·최대 대미지, 지속 시간과 중첩 상한을 확인하세요.");
  if (combatNumbedEnabled(build, report) && (!(input.enemyLifeShield > 0) || !(input.numbedDuration > 0) || !(input.numbedLimit > 0) || input.numbedThreshold < 1)) blockers.push("마취는 대상 최대 HP·보호막, 양수 지속 시간·상한과 1% 이상의 임계값이 필요합니다.");
  if (input.hitRate !== undefined || input.projectileRate !== undefined) blockers.push("복합 발동은 스킬별 시전 횟수에서 적중을 계산합니다. 이전 추가 조건의 적중·투사체 시전 횟수는 비워 주세요.");
  return blockers;
}
