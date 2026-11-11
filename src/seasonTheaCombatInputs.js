import { THEA_EVENT_FIELDS, validTheaEventValue } from "./seasonTheaEvents.js";
import { SS14_THEA_COMBAT } from "./data/ss14TheaCombat.generated.js";
export const theaCombatPin = () => SS14_THEA_COMBAT.receiptSha256;
export const theaCombatEnabled = build => build?.ss14Inputs?.theaEvents?.combatMode === 1;
export const moduleElementalEnabled = build => (build.skills?.active ?? []).some(s => s?.modularization?.moduleOptionIds.includes("protocol_elemental"));
export function theaCombatKeys(build, mechanics = []) {
  if (!theaCombatEnabled(build)) return [];
  const keys = ["igniteEnabled", "numbedEnabled"];
  if (build.ss14Inputs.theaEvents.igniteEnabled === 1) keys.push("igniteBaseMin", "igniteBaseMax", "igniteChance", "igniteIncreased", "igniteDuration", "igniteLimit", "afflictionRate");
  if (build.ss14Inputs.theaEvents.igniteEnabled === 1 && mechanics.some(m => m.requiresIgnite || m.requiresNumbed)) keys.push("dotTriggerRate");
  if (mechanics.some(m => m.kind === "thea-scorch") || build.skills?.elixirs?.some(s => s?.skillId === "fire-lizard-distillate")) keys.push("scorchResistance");
  if (build.ss14Inputs.theaEvents.numbedEnabled === 1 || moduleElementalEnabled(build)) keys.push("numbedChance", "enemyLifeShield", "numbedThreshold", "numbedDuration", "numbedLimit", "numbedEffect");
  for (const [i, slot] of (build.skills?.elixirs ?? []).entries()) if (slot?.skillId) keys.push(`elixir${i}Interval`, `elixir${i}Start`, `elixir${i}Duration`);
  return keys;
}
export function theaCombatInputBlockers(build, mechanics, { beforeDefense = false } = {}) {
  const input = build.ss14Inputs.theaEvents;
  const blockers = theaCombatKeys(build, mechanics).filter(k => !(beforeDefense && k === 'scorchResistance') && !validTheaEventValue(k, input[k])).map(k => `${THEA_EVENT_FIELDS[k].label}: 프로그램에서 값을 선택하세요.`);
  if (build.ss14Inputs.theaCombatReceipt !== theaCombatPin()) blockers.push("복합 발동의 SS14 근거를 다시 연결하세요.");
  if (input.igniteEnabled === 1 && (!(input.igniteDuration > 0) || !(input.igniteLimit > 0) || input.igniteBaseMin > input.igniteBaseMax)) blockers.push("점화의 최소·최대 대미지, 지속 시간과 중첩 상한을 확인하세요.");
  if ((input.numbedEnabled === 1 || moduleElementalEnabled(build)) && (!(input.enemyLifeShield > 0) || !(input.numbedDuration > 0) || !(input.numbedLimit > 0) || input.numbedThreshold < 1)) blockers.push("마취는 대상 최대 HP·보호막, 양수 지속 시간·상한과 1% 이상의 임계값이 필요합니다.");
  if (input.hitRate !== undefined || input.projectileRate !== undefined) blockers.push("복합 발동은 스킬별 시전 횟수에서 적중을 계산합니다. 이전 추가 조건의 적중·투사체 시전 횟수는 비워 주세요.");
  for (const [i, slot] of (build.skills?.elixirs ?? []).entries()) if (slot?.skillId && (!(input[`elixir${i}Interval`] > 0) || !(input[`elixir${i}Duration`] > 0))) blockers.push(`영약 ${i + 1}의 사용 간격과 최종 지속 시간은 양수여야 합니다.`);
  return blockers;
}
