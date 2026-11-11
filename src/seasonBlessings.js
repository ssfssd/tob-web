import { SS14_BLESSING_RULES } from "./data/ss14BlessingRules.generated.js";
import { theaState } from "./seasonTheaState.js";

export const SEASON_BLESSINGS = ["Focus", "Agility", "Tenacity"];
const pageFor = (key, locale = "en", data = SS14_BLESSING_RULES) => data.pages[`${locale}/${key}_Blessing`];
export const blessingLabel = (key) => pageFor(key, "ko")?.body.match(/^([^\n]+?축복)/u)?.[1] ?? "한국어 원문 미제공";
export const validBlessingCount = (value) => Number.isInteger(value) && value >= 0 && value <= 100;
export const SEASON_BLESSING_CAP_STATS = new Set(SEASON_BLESSINGS.map(key=>`max_${key.toLowerCase()}_blessing_stacks`));
export const seasonBlessingPins = () => Object.fromEntries(SEASON_BLESSINGS.map((key) => {
  const p = pageFor(key); return [p.sourceUrl, p.sourcePageSha256];
}));
export function boundBlessingStacks(build, data = SS14_BLESSING_RULES) {
  if (theaState(build)) return theaState(build).stacks;
  const values = build?.ss14Inputs?.blessings;
  return values && SEASON_BLESSINGS.every((key) => {
    const p = pageFor(key, "en", data);
    return validBlessingCount(values[key]) && p?.season === "SS14" && /^[a-f0-9]{64}$/u.test(p.sourcePageSha256)
      && build.ss14Inputs.blessingRuleReceipts?.[p.sourceUrl] === p.sourcePageSha256;
  }) ? values : null;
}
export function blessingConditionValue(control, stacks) {
  if (!stacks) return undefined;
  if (control?.conditionGroup === "all-blessings-active") return Number(SEASON_BLESSINGS.every((key) => stacks[key] > 0));
  const count = control?.conditionGroup?.match(/^(Focus|Agility|Tenacity)-blessing$/u);
  if (count) return stacks[count[1]];
  const active = control?.conditionGroup?.match(/^while (Focus|Tenacity) Blessing is active$/u);
  return active ? Number(stacks[active[1]] > 0) : undefined;
}

// Explicit instantaneous stacks, not automatic generation, uptime or a cap
// solver. The source says Tenacity multiplies; never substitute -4*n percent.
export function projectSeasonBlessings(build, projection, components, data = SS14_BLESSING_RULES) {
  const enabled = build?.ss14Inputs?.blessings !== undefined || Boolean(theaState(build));
  const rows = SEASON_BLESSINGS.map((key) => ({ key, name: blessingLabel(key), count: build?.ss14Inputs?.blessings?.[key] ?? "",
    source: pageFor(key, "en", data), detail: pageFor(key, "ko", data)?.body.split("\n")[0] ?? "한국어 원문 미제공" }));
  const blockers = []; const effects = [];
  const stacks = boundBlessingStacks(build, data);
  const capEffects=[...(projection.effects??[]),...components.filter(c=>c.category==='gear').flatMap(c=>c.calculations??[]).flatMap(c=>c.rawEffects??[])];
  const caps=Object.fromEntries(SEASON_BLESSINGS.map(key=>[key,4]));
  for(const effect of capEffects.filter(e=>SEASON_BLESSING_CAP_STATS.has(e.stat))) {
    if(effect.operation!=='add'||!Number.isInteger(effect.value)||effect.condition||effect.per||effect.target||effect.conditionRequirements)
      blockers.push('축복 최대 중첩 변경의 조건·수치를 확인하세요.');
    else caps[SEASON_BLESSINGS.find(key=>`max_${key.toLowerCase()}_blessing_stacks`===effect.stat)]+=effect.value;
  }
  for(const row of rows){row.max=caps[row.key];if(row.max<0||row.max>100)blockers.push('축복 최대 중첩이 계산 범위를 벗어났습니다.');}
  if (enabled && !stacks) blockers.push("축복 3종의 실제 중첩 수와 SS14 원문 연결을 모두 확인하세요. 미입력은 0이 아닙니다.");
  if(enabled&&stacks&&!theaState(build)&&SEASON_BLESSINGS.some(key=>stacks[key]>caps[key]))blockers.push('입력한 축복 중첩이 선택 장비·재능으로 가능한 상한을 초과합니다.');
  const expected = {
    Focus: "Every stack of Focus Blessing grants +5% additional damage. Initial max stacks: 4",
    Agility: "Every stack of Agility Blessing grants +4% Attack and Cast Speed and +2% additional damage. Initial max stacks: 4",
    Tenacity: "Every stack of Tenacity Blessing grants an additional 4% damage reduction (multiplies). Initial max stacks: 4.",
  };
  if (enabled && rows.some((r) => r.source?.body.split("\n")[0] !== expected[r.key])) blockers.push("축복 기본 효과 원문이 변경되어 계산을 중단했습니다.");
  const unresolved = projection.rows.flatMap((r) => r.blockers.map((b) => b.sourceText ?? ""));
  if (enabled && unresolved.some((s) => /Blessing/iu.test(s) && /base effect|Blessing Effect|convert|instead|replac|reduces? Max/iu.test(s))) {
    blockers.push("선택 구성에 축복 효과·변환 규칙이 있어 기본 축복 계산을 적용하지 않습니다.");
  }
  if (enabled && components.some((r) => r.category === "gear" && r.status !== "mapped")) {
    blockers.push("미해석 장비의 축복 변경 가능성을 확인할 수 없습니다. 장비 원문 수치를 먼저 연결하세요.");
  }
  if (enabled && stacks && !blockers.length) {
    const add = (key, stat, operation, value) => effects.push({ stat, operation, value, unit: "percent",
      sourceText: expected[key], path: `blessings.${key}`, group: "blessings", receipt: pageFor(key, "en", data) });
    if (stacks.Focus) add("Focus", "damage", "more", 5 * stacks.Focus);
    if (stacks.Agility) {
      add("Agility", "damage", "more", 2 * stacks.Agility);
      add("Agility", "attack_speed", "add_percent", 4 * stacks.Agility);
      add("Agility", "cast_speed", "add_percent", 4 * stacks.Agility);
    }
    for (let i = 0; i < stacks.Tenacity; i++) add("Tenacity", "damage_taken", "more", -4);
  }
  return { enabled, rows, caps, effects, blockers, supported: enabled && !blockers.length,
    damageMultiplier: enabled && stacks && !blockers.length ? (1 + .05 * stacks.Focus) * (1 + .02 * stacks.Agility) : null,
    speedIncrease: enabled && stacks && !blockers.length ? 4 * stacks.Agility : null,
    damageTakenMultiplier: enabled && stacks && !blockers.length ? .96 ** stacks.Tenacity : null,
    limitation: "선택한 현재 중첩의 효과입니다. 집요·황홀은 각 축복 안에서 합산하고 강건은 중첩별 곱연산합니다. 장비·재능의 상한을 검증하며 자동 전투는 별도의 은총 주기 설정을 사용합니다." };
}
