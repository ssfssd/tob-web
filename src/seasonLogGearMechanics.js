import { boundBlessingStacks } from "./seasonBlessings.js";

// These rules consume exact SS14 option text after its native arguments have
// been bound. Unknown lines remain blockers in the ordinary tooltip parser.
export function resolveLogGearMechanics(parsed, text, build) {
  const handled = new Set(), effects = [], mechanics = [], blockers = [];
  const add = (stat, value, operation, sourceText, unit = "percent") => effects.push({ stat, value, operation, sourceText, unit });
  for (const line of text.split("\n")) {
    let m;
    if ((m = line.match(/^\+([\d.]+) Spell Projectile Skill Level$/u))) {
      add("spell_projectile_skill_levels", +m[1], "add", line, "level"); handled.add(line);
    } else if ((m = line.match(/^\+([\d.]+)% additional Spell Projectile Damage for each Spell Projectile generated recently\. Stacks up to (\d+) times$/u))) {
      handled.add(line);
      const count = build?.ss14Inputs?.dps?.skills?.[0]?.recentSpellProjectiles;
      if (!Number.isInteger(count) || count < 0) blockers.push("최근 생성한 주술 투사체 수를 전투 조건에서 선택하세요.");
      else add("spell_projectile_damage", +m[1] * Math.min(+m[2], count), "more", line);
    } else if ((m = line.match(/^\+([\d.]+)% chance (?:to gain 1 stack of Tenacity Blessing on taking Damage|for Non-Critical Strikes to grant 1 stack of Focus Blessing)$/u))) {
      handled.add(line);
      mechanics.push({ kind: "blessing-generation", chance: +m[1], sourceText: line });
      if (!boundBlessingStacks(build)) blockers.push("장비로 획득하는 축복의 현재 중첩을 전투 조건에서 선택하세요.");
    } else if ((m = line.match(/^\+([\d.]+)% chance to avoid Elemental Ailments$/u))) {
      handled.add(line); add("elemental_ailment_avoidance", +m[1], "add_percent", line);
    }
  }
  for (const e of parsed.effects) {
    if (handled.has(e.sourceText)) continue;
    let effect = { ...e };
    const per = typeof e.condition === 'string' && e.condition.match(/^(?:per|for every) \+?(\d+) level(?:s|\(s\))$/u);
    if (per) {
      const level = build?.hero?.level ?? build?.heroLevel;
      if (!Number.isInteger(level) || level < 1) blockers.push("장비의 레벨 비례 효과에 사용할 캐릭터 레벨을 선택하세요.");
      else { effect.value *= Math.floor(level / +per[1]); delete effect.condition; }
    }
    if (e.condition === "when Focus Blessing reaches max stacks") {
      const stacks = boundBlessingStacks(build);
      if (!stacks) blockers.push("집요한 축복의 현재 중첩을 전투 조건에서 선택하세요.");
      else { effect.value *= Number(stacks.Focus === 4); delete effect.condition; }
    }
    if (e.stat === "critical_strike_rating" && e.operation === "set") effect.stat = "weapon_critical_strike_rating";
    if (e.stat === "attack_speed" && e.operation === "set") effect.stat = "weapon_attack_speed";
    if (e.stat === "additional_projectile_speed") { effect.stat = "projectile_speed"; effect.operation = "more"; }
    if (e.stat === "additional_physical_damage_taken") { effect.stat = "physical_damage_taken"; effect.operation = "more"; }
    if (e.stat === "life_regeneration") effect.stat = "life_regeneration_flat";
    effects.push(effect);
  }
  return { effects, mechanics, blockers: [...parsed.blockers.filter(b => !handled.has(b.sourceText)), ...blockers.map(reason => ({ reason }))] };
}

export const logMechanicStats = new Set(["weapon_critical_strike_rating", "weapon_attack_speed", "spell_lightning_damage_min", "spell_lightning_damage_max",
  "spell_projectile_skill_levels", "spell_projectile_damage", "all_skill_levels", "jump_count", "blessing_duration",
  "fire_damage_reflection", "cold_damage_reflection", "lightning_damage_reflection", "physical_damage_taken", "life_regeneration_flat", "elemental_ailment_avoidance"]);
