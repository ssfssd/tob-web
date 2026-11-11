import { SS14_THEA_RULES as rules } from "./data/ss14TheaRules.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { getCatalogItems } from "./catalog.js";
import { theaState } from "./seasonTheaState.js";
import { boundBlessingStacks } from "./seasonBlessings.js";
import { parseTheaSpecial } from "./seasonTheaSpecials.js";

export const theaRulePin = () => rules.receiptSha256;
export const isThea = build => build?.hero?.branchId === "hero-tlidb-com-cn-wisdom-of-the-gods";
export const hasRevelation = build => isThea(build) && (build.hero.traitSelections ?? []).some(s => s.choiceIds?.some(id => id.includes("ui_yuenv062")
  && Number.isInteger(build.ss14Inputs?.heroTiers?.[id]?.tier) && build.ss14Inputs.heroTiers[id].tier >= 1 && build.ss14Inputs.heroTiers[id].tier <= 5));
export function revelationReplacement(build, boardIndex, treeSlug, sourceId) {
  return hasRevelation(build) && boardIndex === 3 ? rules.replacements.find(r => r.treeSlug === treeSlug && r.sourceId === sourceId) : null;
}
export const revelationPage = () => rules.pages.en;
export function revelationBoardOptions() {
  return [...new Set(rules.replacements.map(r => r.treeSlug))].map(slug => {
    const page = SS14_COMPONENTS.pages[`https://tlidb.com/ko/${slug}`];
    return { slug, name: page?.parsed?.name ?? page?.name ?? slug };
  });
}
export function revelationNodeOptions(build) {
  const slug = build.talents?.boards?.[3]?.treeSlug;
  const en = SS14_COMPONENTS.pages[`https://tlidb.com/en/${slug}`];
  const ko = SS14_COMPONENTS.pages[`https://tlidb.com/ko/${slug}`];
  return getCatalogItems("talents").flatMap(item => {
    const id = item.tlidbText?.en?.sourceRecordKey?.match(/^data-(?:talent-)?id:(\d+):(core|regular)$/u)?.[1];
    const entry = en?.parsed.entries.find(r => r.id === id);
    const rule = SS14_RULES.talents[slug]?.nodes[item.id.replace(/^talents-/u, "")];
    if (!entry || !rule) return [];
    const replacement = revelationReplacement(build, 3, slug, id);
    const translated = ko?.parsed.entries.find(r => r.id === id);
    const core = item.tags?.includes("coreTalent") === true;
    return [{ id: item.id, sourceId: id, name: replacement?.name ?? translated?.name ?? "한국어 원문 미제공",
      detail: replacement?.koDetail ?? translated?.detail ?? "한국어 원문 미제공", replacement,
      core, max: core ? 1 : rule.maxPoints, required: rule.requiredPoints }];
  }).sort((a, b) => a.required - b.required || a.sourceId.localeCompare(b.sourceId));
}

// Exact, source-bound replacement clauses. Unsupported clauses remain visible
// and block the whole-build total; the original node is never added as well.
export function parseRevelation(replacement, { build, multiplier, parseLines, options }) {
  const special = parseTheaSpecial(replacement, build, multiplier);
  if (special) return special;
  const result = { effects: [], blockers: [], conditions: [], inactive: [], mechanics: [] };
  const caps = theaState(build)?.caps ?? { Focus: 4, Agility: 4, Tenacity: 4 };
  const stacks = boundBlessingStacks(build);
  const condition = (key, label) => {
    const binding = build.ss14Inputs?.componentConditions?.[key];
    const value = binding?.sourcePageSha256 === rules.pages.en.sourcePageSha256 ? binding.value : "";
    result.conditions.push({ key, conditionGroup: `thea:${label}`, sourceText: label, sourcePageSha256: rules.pages.en.sourcePageSha256, kind: "boolean", max: 1, value });
    if (![0, 1].includes(value)) result.blockers.push({ sourceText: label, reason: "계시 재능의 전투 조건을 선택하세요." });
    return value;
  };
  for (const [i, raw] of replacement.detail.split("\n").entries()) {
    let line = raw.trim(); let m;
    if (!line || /^\(Max Active Divinity:/u.test(line)) continue;
    if ((m = line.match(/^\+1 to Max Focus Blessing Stacks while having at least (500) Intelligence$/u))) {
      if (!theaState(build)) result.blockers.push({ sourceText: raw, reason: "축복 상한 변경은 자동 은총 주기에서 계산하세요." });
      result.mechanics.push({ kind: "thea-cap-intelligence", threshold: Number(m[1]), bonus: multiplier, sourceText: raw }); continue;
    }
    if (line === "+1 Max Tenacity Blessing stacks at Full Life") {
      if (!theaState(build)) result.blockers.push({ sourceText: raw, reason: "축복 상한 변경은 자동 은총 주기에서 계산하세요." });
      const active = condition(`${options.path}:cap`, "최대 HP 상태");
      if (active === 1) result.mechanics.push({ kind: "thea-cap", blessing: "Tenacity", bonus: multiplier, sourceText: raw });
      continue;
    }
    // These modify control/defence only, not the rate or amount of hit damage.
    if (/^(Inflicts Frostbite when dealing Hit Cold Damage|Immune to Frostbite while having at least 10 stack\(s\) of Max Focus Blessing|\+\d+ % Frost-Seal Duration for each stack of Max Focus Blessing \. Stacks up to 18 time\(s\)|\+\d+ Max Frostbite Rating per stack of Max Focus Blessing \. Stacks up to 18 time\(s\)|\+\d+ % Skill Area for each stack of Tenacity Blessing \. Stacks up to 18 time\(s\))$/u.test(line)
      || ["When consuming Spell Burst, immediately starts Charging Energy Shield. Interval: 2 s", "Immediately starts Charging Energy Shield when Tangle casts a skill. Interval: 2 s"].includes(line)) {
      result.mechanics.push({ kind: "thea-utility", sourceText: raw }); continue;
    }
    const stack = line.match(/^(.*?) (?:for each|per) stack of (Max )?(Focus|Agility|Tenacity) Blessing(.*?)\. Stacks up to (\d+) time\(s\)$/u);
    let scale = 1;
    if (stack) {
      if (!stack[2] && !stacks) { result.blockers.push({ sourceText: raw, reason: "계시 재능의 축복 중첩을 확인하세요." }); continue; }
      line = `${stack[1]}${stack[4]}`.trim(); scale = Math.min(stack[2] ? caps[stack[3]] : stacks[stack[3]], Number(stack[5]));
    }
    line = line.replace("Elemental Resistance and Erosion Resistance", "Elemental and Erosion Resistance");
    const conditioned = line.match(/^(.*?) (while at Full Mana|against Frostbitten enemies)$/u);
    if (conditioned) {
      const value = condition(`${options.path}:revelation:${i}`, conditioned[2] === "while at Full Mana" ? "최대 MP 상태" : "대상이 빙결 상태");
      if (value !== 1) continue;
      line = conditioned[1];
    }
    const parsed = parseLines(line, multiplier, options);
    result.effects.push(...parsed.effects.map(e => ({ ...e, value: e.value * scale, sourceText: raw })));
    result.blockers.push(...parsed.blockers.map(b => ({ ...b, sourceText: raw })));
    result.conditions.push(...parsed.conditions); result.inactive.push(...parsed.inactive);
  }
  return result;
}
