import { THEA_EVENT_FIELDS, validTheaEventValue } from "./seasonTheaEvents.js";
import { theaState } from "./seasonTheaState.js";
import { SS14_THEA_EFFECTS } from "./data/ss14TheaEffects.generated.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";

export const theaEffectsPin = () => SS14_THEA_EFFECTS.receiptSha256;
// Interpret the source-bound replacement as one rule, rather than accepting
// fragments of a multi-line proc as unconditional modifiers.
export function parseTheaSpecial(replacement, build, multiplier) {
  const id = replacement.targetId;
  const supported = new Set(["22040201", "22070401", "22070101", "22070301", "13050201", "13070201", "13070401", "13070501",
    "32070101", "23050201", "23070101", "23070201", "23070301", "24040301", "24070101", "24070201", "24070301",
    "12070101", "12070201", "12070401", "31070401", "34050501", "11070201", "11040501", "11070301",
    "21050101", "21050401", "21050201", "21070101", "21070201", "21070301", "14050401", "14070301", "14070101",
    "33040501", "33060501", "33070301", "33070401", "33070501"]);
  if (!supported.has(id)) return null;
  const result = { effects: [], blockers: [], conditions: [], inactive: [], mechanics: [] };
  const sourceText = replacement.detail;
  const state = theaState(build);
  const stacks = state?.stacks ?? { Focus: 0, Agility: 0, Tenacity: 0 };
  const caps = state?.caps ?? { Focus: 4, Agility: 4, Tenacity: 4 };
  const transient = state?.events ?? {};
  const combat = theaCombatEnabled(build);
  const block = reason => result.blockers.push({ sourceText, reason });
  if (!state) block("추가 획득·소모와 계시 특수 효과는 자동 은총 계산을 선택하세요.");
  if (build.ss14Inputs?.theaEffectsReceipt !== theaEffectsPin()) block("계시 특수 효과의 SS14 근거를 다시 연결하세요.");
  const value = key => {
    result.mechanics.push({ kind: "thea-event-input", key });
    const v = build.ss14Inputs?.theaEvents?.[key];
    if (!validTheaEventValue(key, v)) { block(`${THEA_EVENT_FIELDS[key].label}: 값을 선택하세요. 미입력은 0이 아닙니다.`); return null; }
    return v;
  };
  const effect = (stat, n, operation = "add_percent") => result.effects.push({ stat, value: n * multiplier, operation,
    unit: operation === "add" ? "flat" : "percent", sourceText });
  const event = (key, data) => {
    if (combat && ["hitRate", "projectileRate", "attackRate", "multistrikeRate", "burstRate"].includes(key)) {
      result.mechanics.push({ kind: "thea-combat-event", inputKey: key, ...data, sourceText }); return;
    }
    const rate = value(key); if (rate !== null) result.mechanics.push({ kind: "thea-event", inputKey: key, rate, ...data, sourceText });
  };
  const utility = () => result.mechanics.push({ kind: "thea-utility", sourceText });
  const recent = (transient.recentAgility ?? 0) > 0;
  const selected = (build.skills?.active ?? []).filter(s => s?.skillId).map(s => SS14_CARDS_EN.records[s.skillId]);
  const attack = selected.some(s => s?.tags?.includes("Attack"));
  const fire = selected.some(s => s?.tags?.includes("Fire"));
  const lightning = selected.some(s => s?.tags?.includes("Lightning"));
  const attackOnly = () => {
    if (attack) block("이 계시 효과의 공격·연속 공격 계산은 아직 연결되지 않았습니다.");
    else result.inactive.push({ sourceText, reason: "선택한 주술에는 공격 전용 효과가 적용되지 않습니다." });
  };
  switch (id) {
    case "22040201":
      if (!combat) { attackOnly(); break; }
      result.mechanics.push({ kind: "thea-aggression" });
      if (attack && transient.attackAggression) { effect("attack_damage", recent ? 10 : 5, "more"); effect("attack_speed", recent ? 10 : 5, "more"); }
      break;
    case "22070401":
      if (!combat) { attackOnly(); break; }
      result.mechanics.push({ kind: "thea-multistrike", increment: 16, uninterruptible: recent });
      break;
    case "22070101": event("attackRate", { blessing: "Agility", consume: 1, castBonus: "attack" });
      if (!combat) attackOnly();
      else if (transient.attackBonus) effect("attack_damage", .9 * transient.multistrikeChance);
      break;
    case "22070301": event("mobilityRate", { blessing: "Agility", gain: 1 }); event("multistrikeRate", { blessing: "Agility", fill: true, window: "multistrikeSpeed", duration: 4 });
      if (transient.multistrikeSpeed) effect("attack_speed", 6, "more"); break;
    case "13050201": case "13070401": case "13070501":
      if (combat) { result.mechanics.push({ kind: { "13050201": "thea-ignite-chance", "13070401": "thea-scorch", "13070501": "thea-ignite-limit" }[id], value: id === "13050201" ? 3 * Math.min(18, stacks.Tenacity) : Number(stacks.Tenacity >= 10) }); break; }
      result.mechanics.push({ kind: "thea-fire-ailment", sourceText });
      if (fire) block("점화·스코치의 기본 대미지와 적용 횟수를 확인할 수 없습니다."); else utility(); break;
    case "13070201": {
      const ignited = combat ? 1 : value("ignited");
      if (ignited === 1) event("hitRate", { blessing: "Tenacity", gain: 1, cooldown: .1, requiresIgnite: combat });
      result.mechanics.push({ kind: "thea-affliction-gain", per: 10, sourceText });
      utility(); break;
    }
    case "32070101": { const rate = value("manaRate"); if (rate !== null) result.mechanics.push({ kind: "thea-event", rate: rate / 10, blessing: "Focus", gain: 1, cooldown: .3, sourceText }); utility(); break; }
    case "23050201": event("regainRate", { blessing: "Agility", gain: 1, regain: true }); utility(); break;
    case "23070101": case "23070201": {
      event("regainRate", { regain: true });
      const stat = id === "23070101" ? "attack_speed" : "cast_speed";
      effect(stat, 2 * Math.min(4, transient.recentRegains ?? 0), "more");
      effect(stat, 3 * Math.min(12, transient.recentAgility ?? 0)); break;
    }
    case "23070301": event("regainRate", { blessing: "Agility", consume: 1, regain: true }); utility(); break;
    case "24040301": if (value("lucky") === 1) { result.mechanics.push({ kind: "thea-event", rate: .25, blessing: "Agility", consume: 1, window: "veryLucky", duration: 4, sourceText }); if (transient.veryLucky) effect("damage_very_lucky", 1, "set"); else effect("damage_lucky", 1, "set"); } break;
    case "24070101": case "24070201":
      if (combat) { result.mechanics.push({ kind: id === "24070101" ? "thea-numbed-effect" : "thea-numbed-consume" }); break; }
      result.mechanics.push({ kind: "thea-lightning-ailment", sourceText }); if (lightning) block("마취 중첩의 대미지 임계값과 지속 시간 연결이 필요합니다."); else utility(); break;
    case "24070301":
      if (combat) { result.mechanics.push({ kind: "thea-numbed-on-hit" }); event("hitRate", { blessing: "Agility", gain: 1, requiresNumbed: true }); break; }
      result.mechanics.push({ kind: "thea-lightning-ailment", sourceText }); if (value("numbed") === 1) event("hitRate", { blessing: "Agility", gain: 1 }); if (lightning) block("마취로 증가하는 번개 대미지의 중첩 연결이 필요합니다."); else utility(); break;
    case "12070101": if (value("twoHanded") === 1) effect("strength", 1.5 * Math.min(18, stacks.Tenacity)); break;
    case "12070201": if (value("twoHanded") === 1) { effect("attack_speed", -10, "more"); effect("cast_speed", -10, "more"); effect("attack_double_damage_chance", 3 * Math.min(18, stacks.Tenacity)); } break;
    case "12070401": effect("strength", 12); if (selected[0]?.tags?.includes("STR") && !selected[0].tags.some(t => ["DEX", "INT"].includes(t))) effect("strength", 12); break;
    case "31070401": utility(); break; // Frail reduces enemy damage, not damage taken.
    case "34050501": if (value("frostbitten") === 1) { event("hitRate", { window: "coldInfiltration", duration: 10 }); effect("critical_strike_rating", 5 * Math.min(18, caps.Focus), "add"); if (transient.coldInfiltration) { effect("cold_damage_taken", SS14_THEA_EFFECTS.coldInfiltration.moreColdTaken, "more"); result.effects.at(-1).buffIdentity = "cold-infiltration"; } } break;
    case "11070201": if (stacks.Tenacity >= 10) effect("max_block_ratio", 5); break;
    case "11040501": utility(); break;
    case "11070301": { const targets = value("warcryTargets"); if (targets !== null) event("warcryRate", { blessing: "Tenacity", gain: targets }); break; }
    case "21050101": { const distant = value("distant"); const bonus = value("distanceBonus"); if (bonus !== null) effect("projectile_damage", bonus); if (distant === 1) event("hitRate", { blessing: "Agility", gain: 1 }); break; }
    case "21050401": event("takenRate", { blessing: "Agility", consume: 10, cooldown: 3 }); utility(); break;
    case "21050201": event("projectileRate", { blessing: "Agility", consume: 1, chance: .5, castBonus: "projectile" }); if (transient.projectileBonus) effect("projectile_critical_strike_rating", 140); break;
    case "21070101": utility(); break;
    case "21070201": { const jumps = value("jumps"); if (recent && jumps !== null) effect("projectile_speed", 32 * Math.min(4, jumps)); break; }
    case "21070301": if (recent) effect("projectile_armor_penetration", 12); break;
    case "14050401": utility(); break;
    case "14070301": event("meleeRate", { blessing: "Tenacity", gain: 1 }); utility(); break;
    case "14070101": if (value("enemyLife") === 1 && stacks.Tenacity >= 10) effect("damage", 60, "more"); break;
    case "33040501": { const ailments = value("ailments"); if (ailments > 0) { event("hitRate", { blessing: "Focus", gain: 1 }); effect("elemental_resistance_penetration", 3 * ailments); } break; }
    case "33060501": utility(); break;
    case "33070301": case "33070401": case "33070501": {
      const type = { "33070301": "Fire", "33070401": "Lightning", "33070501": "Cold" }[id];
      result.mechanics.push({ kind: "thea-skill-level", tag: type, value: multiplier });
      if (value(`recent${type}`) === 1) for (const other of ["Fire", "Lightning", "Cold"].filter(t => t !== type)) effect(`${other.toLowerCase()}_damage`, .6 * Math.min(18, caps.Focus), "more");
      break;
    }
  }
  return result;
}
