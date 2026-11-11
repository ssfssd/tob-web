// Source-bound partial survival outputs. Competing help pages are scenarios,
// never silently selected as the game's final rule.
const finite = (v) => typeof v === "number" && Number.isFinite(v);
const rounded = (v) => finite(v) ? Math.round(v * 1e8) / 1e8 : null;
const clamp = (v, max) => Math.max(0, Math.min(max, v));

export function calculateSeasonSurvival({ safe, input, effects, life, mana, shield, evasion, data }) {
  const text = data.pages["en/Character_Build"]?.body ?? "";
  const blockText = (data.pages["en/Block"]?.body ?? "").replaceAll("%%", "%");
  const reasons = [];
  const number = (body, re) => { const m = body.match(re); return m ? Number(m[1]) : null; };
  const sum = (...stats) => effects.filter((e) => stats.includes(e.stat) && ["add", "add_percent"].includes(e.operation))
    .reduce((n, e) => n + e.value, 0);
  const scale = (stat, base) => !safe || !finite(base) ? null : base
    * (1 + sum(stat) / 100) * effects.filter((e) => e.stat === stat && e.operation === "more")
      .reduce((n, e) => n * (1 + e.value / 100), 1);
  const nonnegative = (n) => finite(n) && n >= 0 ? rounded(n) : null;
  const gain = (resource, maximum) => {
    const percent = sum(`${resource}_regeneration_percent`);
    return safe && (!percent || finite(maximum))
      ? sum(`${resource}_regeneration_flat`, `${resource}_regeneration`) + (percent ? maximum * percent / 100 : 0) : null;
  };
  const lifeGranted = scale("life_regeneration_speed", gain("life", life));
  const manaGranted = scale("mana_regeneration_speed", gain("mana", mana));
  const flatMana = number(text, /Heroes regenerate ([\d.]+) Mana per second by default/u);
  const percentMana = number(text, /Heroes regenerate ([\d.]+)% Mana per second by default/u);
  const manaScenarios = [
    { label: "기본 고정 회복 해석", value: finite(flatMana) && finite(gain("mana", mana)) ? scale("mana_regeneration_speed", flatMana + gain("mana", mana)) : null },
    { label: "기본 비율 회복 해석", value: finite(percentMana) && finite(mana) && finite(gain("mana", mana)) ? scale("mana_regeneration_speed", mana * percentMana / 100 + gain("mana", mana)) : null },
  ].map((r) => ({ ...r, value: nonnegative(r.value) }));
  reasons.push("MP 기본 자연 회복의 고정값과 비율값이 함께 기재되어 있습니다. 합산 여부를 확정하지 않고 두 해석을 분리합니다.");
  const chargePercent = number(text, /Heroes have ([\d.]+)% Energy Shield Charge per second by default/u);
  const chargeDelay = number(text, /base Charge Interval is ([\d.]+) seconds/u);
  const recharge = scale("energy_shield_charge_speed", finite(chargePercent) && finite(shield) ? shield * chargePercent / 100 : null);
  const interval = scale("energy_shield_charge_interval", chargeDelay);
  const accuracy = input.enemyAccuracy;
  const evadeFormula = text.includes("Evasion Rate =1-1.15x attacker's Accuracy/(attacker's Accuracy +0.5x defender's Evasion^0.75)");
  const evadeMax = number(text, /maximum Evasion rate is ([\d.]+)%/u);
  const spellPenalty = number(text, /For Spell Damage, Evasion drops by additional ([\d.]+)%/u);
  const cannotEvade = effects.some((e) => e.stat === "can_evade" && e.operation === "set" && e.value === 0);
  const evasionChance = safe && cannotEvade ? 0 : safe && evadeFormula && finite(evadeMax) && finite(evasion)
    && finite(accuracy) && accuracy > 0 && accuracy <= 1000000
    ? clamp((1 - 1.15 * accuracy / (accuracy + .5 * evasion ** .75)) * 100, evadeMax) : null;
  if (evasionChance === null) reasons.push("회피 확률에는 양수인 대상 명중 수치와 확인된 회피 공식이 필요합니다.");
  const chanceMax = number(text, /maximum Block Chance of ([\d.]+)%/u);
  const blockChanceRule = text.includes("Heroes start with 0 Block Chance") && blockText.includes("Players have 0% Block Chance")
    && chanceMax === number(blockText, /maximum Block Chance of ([\d.]+)%/u);
  const ratioSet = effects.some((e) => e.stat === "block_ratio" && e.operation === "set" && e.value === 0);
  const characterBase = number(text, /start with a Block Ratio of ([\d.]+)%/u);
  const characterMax = number(text, /Block Ratio of [\d.]+% by default, which can be increased up to ([\d.]+)%/u);
  const specificBase = number(blockText, /default Block Ratio is ([\d.]+)%/u);
  const specificMax = number(blockText, /maximum Block Ratio is ([\d.]+)% by default/u);
  const specificHardMax = number(blockText, /by default, up to ([\d.]+)%/u);
  const blockScenarios = [
    { label: "캐릭터 도움말", value: safe && finite(characterBase) && finite(characterMax) ? clamp(characterBase + sum("block_ratio"), characterMax) : null },
    { label: "막기 도움말", value: safe && [specificBase, specificMax, specificHardMax].every(finite)
      ? clamp(specificBase + sum("block_ratio"), clamp(specificMax + sum("max_block_ratio"), specificHardMax)) : null },
  ].map((r) => ({ ...r, value: safe && ratioSet ? 0 : rounded(r.value) }));
  const blockAgreement = blockScenarios.every((r) => finite(r.value)) && blockScenarios[0].value === blockScenarios[1].value;
  if (!blockAgreement) reasons.push("막기 비율 원문 충돌: 캐릭터 도움말과 막기 도움말의 기본값·상한이 다릅니다. 적용 비율은 미지원입니다.");
  const reductionCap = number(text, /maximum Damage Mitigation for each source of additional damage reduction is ([\d.]+)%/u);
  const taken = effects.filter((e) => e.stat === "damage_taken");
  const takenSupported = safe && finite(reductionCap) && text.includes("Damage reduction from different sources multiplies independently")
    && taken.every((e) => e.operation === "more" && finite(e.value));
  const damageTakenMultiplier = takenSupported ? taken.reduce((n, e) => n * (1 + Math.max(-reductionCap, e.value) / 100), 1) : null;
  const elementalTaken = effects.filter(e => e.stat === "elemental_damage_taken");
  const elementalTakenSupported = takenSupported && elementalTaken.every(e => e.operation === "more" && finite(e.value));
  if (!takenSupported) reasons.push("받는 대미지 배율은 원문으로 확인된 독립 추가 배율만 지원합니다.");
  return {
    values: { lifeRegenerationGranted: nonnegative(lifeGranted), manaRegenerationGranted: nonnegative(manaGranted),
      shieldRegenerationGranted:nonnegative(gain('energy_shield',shield)),
      shieldBypassPercent: safe ? clamp(sum("damage_bypasses_energy_shield"), 100) : null,
      minionTransferPercent: safe ? clamp(sum("damage_transferred_to_minion"), 100) : null,
      blurAvoidancePercent: safe ? clamp(sum("blur_avoidance"), 100) : null,
      elementalAilmentAvoidancePercent: safe ? clamp(sum("elemental_ailment_avoidance"), 100) : null,
      injuryBufferPercent: safe ? sum("injury_buffer") : null,
      cooldownRecoveryBonus: safe ? sum("cooldown_recovery_speed") : null,
      frostbiteMaximumBonus: safe ? sum("max_frostbite_rating") : null,
      elementalDamageTakenMultiplier: elementalTakenSupported ? rounded(elementalTaken.reduce((n,e) => n * (1 + Math.max(-reductionCap, e.value) / 100), damageTakenMultiplier)) : null,
      manaRegeneration: null, shieldRechargePerSecond: nonnegative(recharge), shieldRechargeDelay: shield > 0 ? nonnegative(interval) : null,
      evadeChance: rounded(evasionChance), spellEvadeChance: finite(evasionChance) && finite(spellPenalty) ? rounded(evasionChance * (1 - spellPenalty / 100)) : null,
      attackBlockChance: safe && blockChanceRule ? rounded(clamp(sum("attack_block_chance", "block_chance"), chanceMax)) : null,
      spellBlockChance: safe && blockChanceRule ? rounded(clamp(sum("spell_block_chance", "block_chance"), chanceMax)) : null,
      blockRatio: blockAgreement ? blockScenarios[0].value : null, damageTakenMultiplier: rounded(damageTakenMultiplier) },
    manaScenarios, blockScenarios, reasons,
    limitation: "자연 회복 증가분은 확인된 옵션만의 기여도입니다. 보호막 충전은 대미지를 받지 않아 충전이 시작된 뒤의 속도이며 실제 유지율은 계산하지 않습니다. 회피·막기는 명중 대미지 기준, 받는 대미지 배율은 아머·저항·회피·막기를 합친 최종 감면율이 아닙니다.",
  };
}
