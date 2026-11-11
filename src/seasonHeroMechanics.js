import { mechanicPage, SEASON_HERO_COMBAT_FIELDS, validCombatValue } from "./seasonMechanicInputs.js";
import { parseSeasonTheaMechanics } from "./seasonTheaMechanics.js";

// Resource recovery and free activations are not multiplied into an already
// observed activation rate. This is a fixed-state model, not an AI scheduler.
export function parseSeasonHeroMechanics(text, { build, recordKey, parseLines }) {
  if (recordKey?.startsWith("hero-trait:The_Ultimate_One:")) {
    const result = { effects: [], blockers: [], conditions: [], inactive: [], mechanics: [], heroControls: [] };
    for (const line of text.split("\n").filter(Boolean)) {
      let m;
      if ((m = line.match(/^([\d.]+) % of bonuses to Cooldown Recovery Speed or Skill Effect Duration also apply to Clockwork Core 's additional damage, up to ([\d.]+) %$/u))) {
        result.mechanics.push({ kind: "clockwork-conversion", ratio: +m[1], cap: +m[2] });
      } else if (line === "Non-Main Skills cannot be tangled or trigger Spell Burst"
        || line === "Tanglable Main Active Spell Skills are supported by Clockwork Core , replacing the support skill in the second support skill slot of that skill") {
        result.mechanics.push({ kind: "clockwork-main-only", sourceText: line });
      } else if (line === "Spacetime Conqueror") {
        result.mechanics.push({ kind: "spacetime-conqueror", sourceText: line });
        result.effects.push({ stat: "movement_speed", operation: "add_percent", value: -15, sourceText: line });
      }
      else if (line === "Artificial Moon:") continue;
      else if (line === "+1 to Max Tangle Quantity for every +1 to Max Sentry Quantity") result.mechanics.push({ kind: "clockwork-sentry-tangles", sourceText: line });
      else if ((m = line.match(/^\+([\d.]+) % additional Clockwork Core Damage for every \+1 to Max Sentry Quantity$/u))) {
        result.heroControls.push("coreExtraSentries");
        const value = build.ss14Inputs?.heroCombat?.coreExtraSentries;
        if (!Number.isInteger(value) || value < 0) result.blockers.push({ reason: "추가 최대 센트리 수를 선택하세요." });
        else result.effects.push({ stat: "clockwork_damage", operation: "more", value: value * +m[1], sourceText: line });
      } else {
        const parsed = parseLines(line); result.effects.push(...parsed.effects); result.blockers.push(...parsed.blockers);
      }
    }
    return result;
  }
  const thea = parseSeasonTheaMechanics(text, { build, recordKey, parseLines });
  if (thea) return thea;
  if (!recordKey?.startsWith("hero-trait:Creative_Genius:")) return null;
  const result = { effects: [], blockers: [], conditions: [], inactive: [], mechanics: [], heroControls: [] };
  const input = build.ss14Inputs?.heroCombat ?? {};
  const need = key => {
    if (!result.heroControls.includes(key)) result.heroControls.push(key);
    if (!validCombatValue(SEASON_HERO_COMBAT_FIELDS[key], input[key])) {
      result.blockers.push({ reason: `${SEASON_HERO_COMBAT_FIELDS[key].label} 미입력` }); return null;
    }
    return input[key];
  };
  const rule = (slug, expression) => {
    const page = mechanicPage(build, slug);
    const match = page?.body.match(expression);
    if (!match) result.blockers.push({ reason: "SS14 히어로 발동 공식 원문이 없거나 변경되었습니다." });
    return match;
  };
  const effect = (stat, value, sourceText, operation = "more") => result.effects.push({ stat, value, operation, sourceText });
  for (const line of String(text).split("\n").filter(Boolean)) {
    let match;
    if (line === "Gains 2 Inspiration Machines that can be powered by Whimsy Essence and Ingenuity Essence respectively. Starts with 0 Whimsy Essence and Ingenuity Essence with an upper limit of 100. Restores 20 Whimsy Essence per second"
      || line === "When Whimsy Essence reaches 100, dealing Spell Damage to an enemy causes Inspiration Machines to use a Whimsy Explosion , inflicting Whimsy Signal on affected enemies") {
      result.mechanics.push({ kind: "essence-cycle", ...(line.startsWith("Gains 2")?{cap:100}:{}), sourceText: line });
      if (line.startsWith("When")) {
        const signal = need("signal"); const r = rule("Whimsy_Signal", /^\+([\d.]+)% additional Spell Damage taken for 5s$/u);
        rule("Whimsy_Explosion", /consuming 100 Whimsy Essence while restoring 25 Ingenuity Essence/u);
        if (signal !== null && r) effect("spell_damage_taken", Number(r[1]) * signal, line);
      }
    } else if (line === "When Ingenuity Essence reaches 100, clicking the Trait Skill causes Inspiration Machines to use Ingenuity Overload") {
      need("overloads"); if (input.overloads > 0) need("burstActivations");
      const r = rule("Ingenuity_Overload", /Triggers your Main Skill once immediately .*\+([\d.]+)% additional Max Spell Burst .*immediately charges it to the max\. Consumes 100 Ingenuity Essence/u);
      if (r) result.mechanics.push({ kind: "ingenuity-overload", burstMultiplier: 1 + Number(r[1]) / 100, sourceText: line });
    } else if (line === "Bing's ingenious ideas allow him to possess more Traits. In addition to Base Traits, an additional Trait can be selected at each level threshold.") {
      result.mechanics.push({ kind: "extra-trait-choice", sourceText: line });
    } else if ((match = line.match(/^Instantly restores (\d+) Whimsy Essence when activating Spell Burst , and restores (\d+) additional Whimsy Essence for every (\d+) stacks of Spell Burst Charge consumed\. Interval: 1s$/u))) {
      result.mechanics.push({ kind: "burst-essence", base: Number(match[1]), perGroup: Number(match[2]), group: Number(match[3]), intervalMs:1000, sourceText: line });
    } else if ((match = line.match(/^Instantly restores (\d+) Ingenuity Essence after entering a stage or reviving$/u))) {
      result.mechanics.push({ kind: "initial-essence", value: Number(match[1]), sourceText: line });
    } else if ((match = line.match(/^Whimsy Explosion spawns an energy field\. Gains 1 stack of Whimsy for every 0\.5s staying in the energy field\. Stacks up to (\d+) time\(s\)$/u))) {
      const stacks = need("whimsy"); const r = rule("Whimsy", /^\+([\d.]+)% additional Spell Damage \(multiplies\) for 10s$/u);
      if (stacks > Number(match[1])) result.blockers.push({ reason: "기발 중첩이 선택 특성 단계의 상한을 초과합니다." });
      else if (stacks !== null && r) effect("spell_damage", 100 * ((1 + Number(r[1]) / 100) ** stacks - 1), line);
    } else if ((match = line.match(/^\+([\d.]+) % Movement Speed when casting Ingenuity Overload \. The bonus falls off to 0 within 4s$/u))) {
      result.mechanics.push({ kind: "movement-decay", maximum: Number(match[1]), duration: 4, sourceText: line });
    } else if ((match = line.match(/^Ingenuity Overload has a (\d+) % chance to not consume Ingenuity Essence$/u))) {
      result.mechanics.push({ kind: "free-overload", chance: Number(match[1]), sourceText: line });
    } else if ((match = line.match(/^After a 1s delay, Whimsy Explosion creates an additional Energy Explosion that eliminates enemies with less than ([\d.]+) % Life within 12m$/u))) {
      result.mechanics.push({ kind: "execute", threshold: Number(match[1]), delay: 1, radius: 12, sourceText: line });
    } else if ((match = line.match(/^Restores ([\d.]+) additional Whimsy Essence for each enemy affected by Whimsy Signal defeated$/u))) {
      result.mechanics.push({ kind: "kill-essence", value: Number(match[1]), sourceText: line });
    } else if ((match = line.match(/^For every 2 Empower or Defensive Skill\(s\) affecting you, \+1 Max Spell Burst \. Stacks up to (\d+) time\(s\)$/u))) {
      const count = need("empowers");
      if (count !== null) effect("max_spell_burst", Math.min(Number(match[1]), Math.floor(count / 2)), line, "add");
    } else if ((match = line.match(/^\+([\d.]+) % Empower(?: and Defensive)? Skill(?: Effect)? Duration$/u))) {
      result.mechanics.push({ kind: "empower-duration", increase: Number(match[1]), sourceText: line });
    } else if (line === "Artificial Moon:" || line === "+1 to Non-Base Hero Trait Level") {
      result.mechanics.push({ kind: "trait-level", sourceText: line });
    } else {
      const parsed = parseLines(line);
      result.effects.push(...parsed.effects); result.blockers.push(...parsed.blockers);
    }
  }
  return result;
}
