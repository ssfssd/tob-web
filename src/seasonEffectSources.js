import { SEASON_GEAR_SLOT_LABELS } from "./seasonSelections.js";
import { SS14_CARDS } from "./data/ss14Cards.generated.js";
import { SS14_SUPPORTS } from "./data/ss14Supports.generated.js";

const groups = { hero: "히어로·추억", talents: "재능", talent: "재능", divinity: "신격", pact: "정령",
  gear: "장비", skills: "스킬", supports: "보조", elixirs: "영약", modularization: "모듈", blessings: "축복" };
const safe = text => typeof text === "string" && !/\p{Script=Han}/u.test(text) ? text : "";
const slotLabel = index => `${index < 5 ? index === 0 ? "주력" : "액티브" : "패시브"} ${index < 5 ? index + 1 : index - 4}`;
export function effectSourceLabel(path, group) {
  let match;
  if ((match = path?.match(/^gear\.slots\.(\d+)/u))) return SEASON_GEAR_SLOT_LABELS[Number(match[1])];
  if ((match = path?.match(/^skills\.rows\.(\d+)(?:\.supports\.(\d+))?/u)))
    return slotLabel(Number(match[1])) + (match[2] === undefined ? "" : ` · 보조 ${Number(match[2]) + 1}`);
  if ((match = path?.match(/^talents\.boards\.(\d+)/u))) return `재능 패널 ${Number(match[1]) + 1}`;
  if ((match = path?.match(/^pact\.slots\.(\d+)/u))) return `정령 ${Number(match[1]) + 1}`;
  if ((match = path?.match(/^hero\.memories\.(\d+)/u))) return `추억 ${Number(match[1]) + 1}`;
  return groups[group] ?? "선택 효과";
}

// These rows enumerate the selected calculation inputs, not all options on an
// item card. Direct-damage status is joined to the evaluator's actual trace by
// owner path AND source line. Equal-name rings and repeated supports stay apart.
export function seasonEffectSources(report) {
  const rows = [];
  const trace = (report.coupledSkills?.rows ?? []).flatMap(skill => (skill.trace ?? []).map(t => ({ ...t, rowIndex: skill.rowIndex })));
  const add = (source, effects = [], blockers = [], inactive = [], mechanics = []) => {
    const origin = effectSourceLabel(source.path, source.group);
    for (const [i, effect] of effects.entries()) {
      const applied = trace.filter(t => t.effectSource?.path === source.path && t.effectSource.sourceText === effect.sourceText
        && t.effectSource.stat === effect.stat);
      const valid = Number.isFinite(effect.value) && (!effect.roll || effect.value >= effect.roll.min && effect.value <= effect.roll.max);
      rows.push({ ...source, ...(effect.detail ? { detail: effect.detail, receipt: effect.receipt } : {}), origin, effect, key: `${source.path}:effect:${i}`, status: !valid ? "blocked" : applied.length ? "direct" : "selected",
        ...(!valid ? { reason: "선택 수치가 없거나 허용 범위를 벗어났습니다." } : {}),
        appliedTo: [...new Set(applied.map(t => slotLabel(t.rowIndex)))], value: valid ? effect.value : null });
    }
    for (const [i, effect] of inactive.entries()) rows.push({ ...source, origin, effect, key: `${source.path}:inactive:${i}`, status: "inactive", value: null });
    for (const [i, effect] of mechanics.entries()) rows.push({ ...source, origin, effect, key: `${source.path}:mechanic:${i}`, status: "mechanic", value: null });
    for (const [i, blocker] of blockers.entries()) rows.push({ ...source, origin, key: `${source.path}:blocked:${i}`, status: "blocked", value: null,
      reason: typeof blocker === "string" ? blocker : blocker.reason ?? "효과 또는 입력 확인 필요" });
  };
  for (const row of report.componentProjection?.rows ?? []) add(row, row.effects, row.blockers, row.inactive, row.mechanics);
  for (const component of report.components ?? []) {
    if (!["gear", "skills", "supports"].includes(component.category)) continue;
    const card = SS14_CARDS.records[component.id] ?? SS14_SUPPORTS.records[component.id];
    if (!component.calculations?.length) {
      const paths = component.paths?.filter(p => !p.startsWith("selections.")) ?? [];
      for (const path of paths.length ? paths : [component.paths?.[0] ?? component.id]) add({
        group: component.category, path, itemId: component.id, name: safe(component.name),
        detail: card?.koreanTextVerified ? safe(card.detail) : "", receipt: component.sourceReceipt,
      }, [], component.reasons?.length ? component.reasons : ["선택 효과의 계산 연결을 확인할 수 없습니다."]);
    }
    for (const entry of component.calculations ?? []) {
      const path = component.category === "gear" ? `gear.slots.${entry.slotIndex}`
        : `skills.rows.${entry.rowIndex}${component.category === "supports" ? `.supports.${entry.supportIndex}` : ""}`;
      const source = { group: component.category, path, itemId: component.id, name: safe(component.name),
        detail: card?.koreanTextVerified ? safe(card.detail) : "", receipt: entry.receipt };
      const effects = component.category === "gear" ? entry.rawEffects ?? [] : component.category === "supports" ? entry.effects ?? []
        : trace.filter(t => t.effectSource?.path === path);
      add(source, effects, component.category === "gear" ? entry.effectBlockers ?? entry.reasons : entry.blockers);
    }
  }
  return rows;
}
