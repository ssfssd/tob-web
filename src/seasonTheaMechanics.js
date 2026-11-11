import { boundBlessingStacks } from "./seasonBlessings.js";
import { memoryTraitTier } from "./seasonMemories.js";
import { SEASON_HERO_COMBAT_FIELDS, validCombatValue } from "./seasonMechanicInputs.js";
import { theaState } from "./seasonTheaState.js";
import { theaRulePin, revelationBoardOptions } from "./seasonTheaRevelation.js";

// Fixed combat snapshots. Acquisition, cooldowns and automatic casting do not
// establish uptime; each active Boon instance is supplied explicitly.
export function parseSeasonTheaMechanics(text, { build, recordKey, parseLines }) {
  if (!recordKey?.startsWith("hero-trait:Wisdom_of_The_Gods:")) return null;
  const result = { effects: [], blockers: [], conditions: [], inactive: [], mechanics: [], heroControls: [] };
  const input = build.ss14Inputs?.heroCombat ?? {};
  const need = key => {
    if (!result.heroControls.includes(key)) result.heroControls.push(key);
    if (!validCombatValue(SEASON_HERO_COMBAT_FIELDS[key], input[key])) {
      result.blockers.push({ reason: `${SEASON_HERO_COMBAT_FIELDS[key].label} 미입력` }); return null;
    }
    return input[key];
  };
  const effect = (stat, value, sourceText, operation = "more") => result.effects.push({ stat, value, operation, sourceText });
  const mechanic = (kind, sourceText, values = {}) => result.mechanics.push({ kind, sourceText, ...values });
  const blessings = () => {
    const stacks = boundBlessingStacks(build);
    if (!stacks) result.blockers.push({ reason: "티아1의 현재 집요·황홀·강건 축복 중첩을 입력하세요." });
    return stacks;
  };
  const purity = (build.hero?.traitSelections ?? []).some(s => s.choiceIds?.some(id => id.includes("ui_yuenv061")
    && Number.isInteger(memoryTraitTier(build,75,build.ss14Inputs?.heroTiers?.[id]?.tier).tier)));
  const boon = () => {
    if (theaState(build)) return theaState(build).boons;
    const instances = [];
    for (const suffix of purity ? ["", "Second"] : [""]) for (const key of [`boonActive${suffix}`, `boonFocus${suffix}`, `boonAtMax${suffix}`]) {
      if (!result.heroControls.includes(key)) result.heroControls.push(key);
    }
    for (const suffix of purity ? ["", "Second"] : [""]) {
      const active = need(`boonActive${suffix}`);
      if (active === null) return null;
      if (!active) continue;
      const consumed = need(`boonFocus${suffix}`);
      const atMax = need(`boonAtMax${suffix}`);
      if (consumed === null || atMax === null) return null;
      if (consumed === 0 && atMax) { result.blockers.push({ reason: "집요한 축복을 소모하지 않은 은총은 최대 중첩 소모 상태일 수 없습니다." }); return null; }
      instances.push({ consumed, atMax });
    }
    return instances;
  };
  for (const line of String(text).split("\n").filter(Boolean)) {
    let m;
    if (line === "Gain a Divine Blessing every 2s in the following order: Focus Blessing - Agility Blessing - Tenacity Blessing") {
      blessings(); mechanic("thea-blessing-cycle", line, { interval: 2 });
    } else if (["Click the Trait Skill to cast God's Boon", "God's Boon : Consumes all Focus Blessings to grant self God's Boon . Cooldown: 15 s", "Automatically try to use God's Boon when Focus Blessing is at max stacks"].includes(line)) {
      mechanic("thea-boon-trigger", line);
    } else if ((m = line.match(/^\+([\d.]+) % additional damage if God's Boon consumes max stacks of Focus Blessing \. Lasts for 10 s$/u))) {
      const instances = boon();
      if (instances) effect("damage", Number(m[1]) * instances.reduce((n, b) => n + b.atMax, 0), line);
    } else if ((m = line.match(/^\+3 % additional damage for each Legendary Medium Talent allocated, up to (\d+)$/u))) {
      const count = need("legendaryMediumTalents");
      if (count !== null) effect("damage", 3 * Math.min(count, Number(m[1])), line);
    } else if ((m = line.match(/^[+]?([\d.]+) % additional damage for each stack of Focus Blessing that God's Boon consumes\. Lasts for 10 s\. Stacks up to (\d+) time\(s\)$/u))) {
      const instances = boon();
      if (instances) effect("damage", Number(m[1]) * instances.reduce((n, b) => n + Math.min(b.consumed, Number(m[2])), 0), line);
    } else if ((m = line.match(/^\+([\d.]+) % Double Damage Chance for each stack of Focus Blessing that God's Boon consumes\. Lasts for 10 s\. Stacks up to (\d+) time\(s\)$/u))) {
      const instances = boon();
      if (instances) effect("double_damage_chance", Number(m[1]) * instances.reduce((n, b) => n + Math.min(b.consumed, Number(m[2])), 0), line, "add_percent");
    } else if (line === "For every 1 % overflown Double Damage Chance, there is a 1 % chance to deal Quadruple Damage instead") {
      effect("double_damage_overflow_quadruple", 1, line, "set");
    } else if ((m = line.match(/^[+]?([\d.]+) % additional Defense per stack of Tenacity Blessing when the number of Tenacity Blessing stacks equals the number of Focus Blessing stacks$/u))) {
      const stacks = blessings();
      if (stacks && stacks.Tenacity === stacks.Focus) for (const stat of ["armor", "evasion", "max_energy_shield"]) effect(stat, Number(m[1]) * stacks.Tenacity, line);
    } else if ((m = line.match(/^灵动祝福 层数等于 聚能祝福 层数时，伤害 幸运 ，并且每有 1 层 灵动祝福 ， 额外 [+]?([\d.]+) % 最大伤害$/u))
      || (m = line.match(/^Deals Lucky Damage and [+]?([\d.]+) % additional Max Damage per stack of Agility Blessing when the number of Agility Blessing stacks equals the number of Focus Blessing stacks$/u))) {
      const stacks = blessings();
      if (stacks && stacks.Agility === stacks.Focus) {
        effect("damage_lucky", 1, line, "set"); effect("max_damage", Number(m[1]) * stacks.Agility, line);
      }
    } else if (line === "The biggest max stack bonus of Agility Blessing or Tenacity Blessing is also applied to the max stack bonus of Focus Blessing") {
      // Current stacks and consumed stacks remain explicit; this is not a cap solver.
      mechanic("thea-focus-cap-inheritance", line);
    } else if (/^[+-]?[\d.]+ % additional Cooldown Recovery Speed for God's Boon$/u.test(line)) {
      mechanic("thea-boon-cooldown", line, { more: Number(line.match(/^[+-]?[\d.]+/u)[0]) });
    } else if (line === "神赐 获得的增益可以额外叠加一次" || line === "Buffs gained from God's Boon can stack 1 additional time") {
      mechanic("thea-boon-extra-stack", line); boon();
    } else if (/^[+-][\d.]+ % Skill Effect Duration$/u.test(line)) {
      mechanic("thea-duration", line, { increased: Number(line.match(/^[+-]?[\d.]+/u)[0]) });
    } else if (line === "Artificial Moon:" || /^\+10 % Skill Area for each stack of Focus Blessing consumed by God's Boon \. Lasts for \+10 s\. Stacks up to 5 time\(s\)$/u.test(line)) {
      mechanic("thea-boon-area", line);
    } else if (line === "Replaces some Talents on the No. 4 activated Talent Panel (only supports panels belonging to the God of Might, Goddess of Knowledge, or Goddess of Hunting) with Blessing-related Talents") {
      const fourth = build.talents?.boards?.[3];
      if (fourth?.treeSlug && !revelationBoardOptions().some(r => r.slug === fourth.treeSlug)) {
        result.blockers.push({ sourceText: line, reason: "계시의 예언의 4번째 재능 보드는 지원하는 12개 보조 패널 중에서 선택하세요." });
      } else if (fourth?.treeSlug && build.ss14Inputs?.theaRulesReceipt !== theaRulePin()) {
        result.blockers.push({ sourceText: line, reason: "계시의 예언 4번째 재능 보드의 SS14 변환 근거를 다시 연결하세요." });
      } else mechanic("thea-revelation", line);
    } else if ((m = line.match(/^同时拥有 坚韧祝福 、 灵动祝福 和 聚能祝福 时，额外 \+([\d.]+) % 伤害$/u))) {
      const stacks = blessings();
      if (stacks && Object.values(stacks).every(n => n > 0)) effect("damage", Number(m[1]), line);
    } else {
      const parsed = parseLines(line, 1, { blessingStacks: boundBlessingStacks(build) });
      result.effects.push(...parsed.effects); result.blockers.push(...parsed.blockers);
    }
  }
  return result;
}
