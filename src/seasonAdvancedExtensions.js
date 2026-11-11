import { SS14_MODULE_AURAS } from "./data/ss14ModuleAuras.generated.js";
import { SS14_EXTENSION_NATIVE } from "./data/ss14ExtensionNative.generated.js";
import { theaState } from "./seasonTheaState.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";

// Conditions describe the selected combat scenario. They never replace a
// missing game coefficient with a user-entered damage multiplier.
export const ADVANCED_EXTENSION_FIELDS = {
  auraRange: { label: "오라 범위 안", kind: "boolean", max: 1 },
  nearby: { label: "대상이 소환체로부터 10m 이내", kind: "boolean", max: 1 },
  coldInfiltration: { label: "대상에게 냉기 침투 적용", kind: "boolean", max: 1 },
  fireInfiltration: { label: "대상에게 화염 침투 적용", kind: "boolean", max: 1 },
  lightningInfiltration: { label: "대상에게 번개 침투 적용", kind: "boolean", max: 1 },
  blurRating: { label: "현재 방황 수치", kind: "count", max: 100 },
  ominousCurse: { label: "대상에게 불길 저주 적용", kind: "boolean", max: 1 },
  omenElite: { label: "오멘 대상이 강적", kind: "boolean", max: 1 },
  omenMaxLife: { label: "오멘 대상의 최대 HP", kind: "scale", max: 1e15 },
  omenRemainingLife: { label: "오멘 도태 판정 때 일반 적의 남은 HP", kind: "scale", max: 1e15 },
  minionPresent: { label: "대미지를 이전할 소환체 존재", kind: "boolean", max: 1 },
};

export function advancedExtensionContext(build, row, prefix, fingerprint, control) {
  return {
    condition(key) {
      if (theaCombatEnabled(build) && key.endsWith("Infiltration")) return Number(Boolean(theaState(build)?.events?.[key]));
      const f = ADVANCED_EXTENSION_FIELDS[key];
      const n = control(row, `${prefix}:${key}`, f.label, f.kind, fingerprint, f.max);
      if (n === "") row.blockers.push({ reason: `${f.label} 조건을 선택하세요.` });
      return n;
    },
    effect(stat, value, operation = "add_percent") {
      const effect = { stat, value, operation, path: row.path, group: row.group, receipt: row.receipt };
      row.effects.push(effect); return effect;
    },
    mechanic(kind, values = {}) { (row.mechanics ??= []).push({ kind, ...values }); },
    infiltration(type, active) {
      // Thea Revelation and the module apply the same buff. Thea's own
      // projector supplies its effect when that runtime window is active.
      if (theaCombatEnabled(build)) active = Number(Boolean(theaState(build)?.events?.[`${type}Infiltration`]));
      if (active === 1) this.effect(`${type}_damage_taken`, SS14_EXTENSION_NATIVE.infiltration[type].moreTaken, "more").buffIdentity = `${type}-infiltration`;
      this.mechanic("infiltration", { type, active: active === 1, source: prefix });
    },
  };
}

export function advancedModuleLine(id, line, context, row) {
  const { effect, mechanic } = context;
  const aura = SS14_MODULE_AURAS.records[id];
  if (aura) {
    if (!/^Minions summoned by this skill grant a Lv\. 1 Precise:/u.test(line)) return false;
    const within = context.condition("auraRange");
    row.additionalReceipts = [aura.en, { ...aura, tableSha256: SS14_MODULE_AURAS.tableSha256 }];
    if (within !== 1) return true;
    const first = aura.maps[0][1], second = aura.maps[1]?.[1];
    const damage = { weapon_amp: "physical", flame_charge: "fire", electric_conversion: "lightning", erosion_amp: "erosion", cold_domain: "cold" }[id.replace("aura_overwrite_", "")];
    const add = (stat, value, operation = "add_percent") => {
      effect(stat, value, operation);
      (row.alliedMinionEffects ??= []).push({ stat, value, operation, receipt: aura.en });
    };
    if (damage) add(`${damage}_damage`, first, "more");
    else if (id === "aura_overwrite_tenacity" || id === "aura_overwrite_agility") {
      const stat = id.endsWith("tenacity") ? "armor" : "evasion";
      add(stat, first, "add"); add(stat, second, "more");
    } else if (id === "aura_overwrite_energy_barrier") { add("max_energy_shield", first, "add"); add("max_energy_shield", second, "more"); }
    else if (id === "aura_overwrite_elemental_resistance") {
      add("elemental_resistance", first); add("elemental_damage_taken", -14, "more"); add("elemental_ailment_avoidance", 15);
    } else if (id === "aura_overwrite_haste") add("movement_speed", first);
    return true;
  }
  const infiltration = id.match(/^protocol_(cold|fire|lightning)_penetration$/u);
  if (infiltration) {
    if (!line.startsWith(`Inflicts ${infiltration[1][0].toUpperCase() + infiltration[1].slice(1)} Infiltration when Minions`)) return false;
    context.infiltration(infiltration[1], context.condition(`${infiltration[1]}Infiltration`)); return true;
  }
  const local = (stat, value, operation = "add_percent") => (row.minionEffects ??= []).push({ stat, value, operation, receipt: row.receipt });
  if (id === "protocol_erosion_aggravate" && line === "+30% Deterioration Chance for Minions summoned by this skill") { local("deterioration_chance", 30); return true; }
  if (id === "protocol_ailment") {
    if (line === "When Minions summoned by this skill deal damage, +3% additional damage for every type of Ailment the enemy has (multiplies)") { mechanic("module-ailment-types", { more: 3 }); return true; }
    if (line === "Minions summoned by this skill grant +12% additional Ailment Damage to you and allies") { effect("ailment_damage", 12, "more"); (row.alliedMinionEffects ??= []).push({ stat: "ailment_damage", value: 12, operation: "more" }); return true; }
  }
  if (id === "protocol_block" && line === "+100% Attack and Spell Block Chance for Minions summoned by this skill. Minions taunt enemies when blocking") { local("block_chance", 100); mechanic("module-taunt-on-block"); return true; }
  if (id === "protocol_knockback" && line === "+100% Knockback Chance for Minions summoned by this skill. Inflicts Paralysis when knocking back enemies") { local("knockback_chance", 100); mechanic("module-paralysis-on-knockback"); return true; }
  if (id === "protocol_elemental" && line === "Adds 5% of Physical Damage as random Elemental Damage and +100% Elemental Ailment Chance for Minions summoned by this skill") { local("physical_as_random_elemental", 5); local("elemental_ailment_chance", 100); return true; }
  if (id === "source_condensation") {
    if (line === "For every +1 Max Frostbite Rating , +1 Max Frostbite Rating for Minions summoned by this skill") { mechanic("module-inherit-max-frostbite"); return true; }
    if (line === "Minions summoned by this skill grant +30 Max Frostbite Rating to the summoner") { effect("max_frostbite_rating", 30, "add"); return true; }
  }
  if (id === "source_meltdown" && line.startsWith("Enemies have a 20% chance to explode when defeated by an Attack or Spell of a Minion")) { mechanic("module-kill-explosion", { chance: .2, lifeMultiplier: 2.5, radius: 6 }); return true; }
  if (id === "source_breakpoint" && line === "When you or allies deal damage through Minions summoned by this skill, eliminates enemies with less than 18% Life") { mechanic("module-execute", { threshold: 18 }); return true; }
  if (id === "source_dimension_reduction" && line === "Minions summoned by this skill fix the Erosion Resistance of nearby enemies within 10m at 10") {
    if (context.condition("nearby") === 1) effect("enemy_erosion_resistance_fixed", 10, "set"); return true;
  }
  if (id === "source_overclock") {
    if (line === "+20% additional Cooldown Recovery Speed for Minions summoned by this skill") { local("cooldown_recovery_speed", 20, "more"); return true; }
    if (line === "Minions summoned by this skill grant +20% Cooldown Recovery Speed and +20% Injury Buffer to you and allies") {
      effect("cooldown_recovery_speed", 20); effect("injury_buffer", 20);
      (row.alliedMinionEffects ??= []).push({ stat: "cooldown_recovery_speed", value: 20, operation: "add_percent" }, { stat: "injury_buffer", value: 20, operation: "add_percent" }); return true;
    }
  }
  return false;
}

export function advancedElixirLine(line, scale, context) {
  const { effect, mechanic } = context;
  if (line === "Adds 15 % of Max Life to Energy Shield") { effect("max_life_as_energy_shield", 15 * scale); return true; }
  if (line === "Half of the damage taken bypasses Energy Shield") { effect("damage_bypasses_energy_shield", 50); return true; }
  if (line === "Has Blur") {
    const rating = context.condition("blurRating");
    if (rating !== "") { effect("blur_rating", rating, "set"); effect("blur_avoidance", rating * .25); }
    return true;
  }
  if (line === "While Blur is active, +20 % Defense") {
    if (context.condition("blurRating") > 0) for (const stat of ["armor", "evasion", "max_energy_shield"]) effect(stat, 20 * scale);
    return true;
  }
  if (line === "30.5 % Ill Omen Cumulative Efficiency while Blur is active") {
    const rating = context.condition("blurRating"), curse = context.condition("ominousCurse");
    if (curse === 1) {
      const elite = context.condition("omenElite"), maxLife = context.condition("omenMaxLife");
      const remainingLife = elite === 0 ? context.condition("omenRemainingLife") : 0;
      mechanic("ill-omen", { efficiency: rating > 0 ? 30.5 * scale : 0, curse: true, elite: elite === 1, maxLife, remainingLife });
    }
    return true;
  }
  if (line === "25 % chance for enemies to explode when defeated by Minions' Attacks or Spells, dealing True Damage equal to 250 % of their Max Life to enemies within a 6 m radius (not affected by the effects of Elixir Skills)") {
    mechanic("elixir-minion-kill-explosion", { chance: .25, lifeMultiplier: 2.5, radius: 6 }); return true;
  }
  if (line === "12 % of damage taken is transferred to a random Minion") {
    if (context.condition("minionPresent") === 1) effect("damage_transferred_to_minion", 12 * scale); return true;
  }
  if (line === "23.5 % Elemental Resistance Penetration for Spell Skills") { effect("spell_elemental_penetration", 23.5 * scale); return true; }
  if (line === "Inflicts all Infiltration Effects when a Spell Skill deals damage. Interval on each enemy: 1 s") {
    for (const type of ["cold", "fire", "lightning"]) context.infiltration(type, context.condition(`${type}Infiltration`));
    return true;
  }
  return false;
}
