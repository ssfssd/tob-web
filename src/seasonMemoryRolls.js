// Ranges belong to the current table row, never to an old roll index alone.
export function memoryRange(fragment) {
  const m = String(fragment).match(/^([+]?)[(](-?\d+(?:\.\d+)?)[–](-?\d+(?:\.\d+)?)[)]$/u);
  return m && Number(m[2]) <= Number(m[3]) ? { min: Number(m[2]), max: Number(m[3]), positive: m[1] === "+" } : null;
}
export const validMemoryRollValue = (control, value) => typeof value === "number" && Number.isFinite(value)
  && value >= control.min && value <= control.max;

export function bindMemoryRolls({ row, ko, page, memory, index, id, tierId, kind, bindings = {} }) {
  const controls = [];
  const fragments = row.rollFragments ?? [];
  const tokens = [...(row.renderTemplate ?? "").matchAll(/\{\{roll_(\d+)\}\}/gu)].map((m) => Number(m[1]));
  // A changed/ambiguous template must not silently change which number is used.
  if (tokens.length !== fragments.length || tokens.some((n, i) => n !== i + 1)) return { controls, reason: "추억 범위 원문 구조 미검증" };
  let complete = true;
  const values = fragments.map((fragment, i) => {
    const range = memoryRange(fragment);
    if (!range) { if (/[()]/u.test(fragment)) complete = false; return fragment; }
    const key = `hero.memories.${index}.${kind}.${id}:roll_${i + 1}`;
    const identity = { instanceId: memory.instanceId, affixId: id, tierId, modifierId: Number(row.id), sourcePageSha256: page.sourcePageSha256 };
    const b = bindings[key];
    const bound = b && Object.entries(identity).every(([k, v]) => b[k] === v) && validMemoryRollValue(range, b.value);
    controls.push({ key, ...identity, ...range, index, kind, value: bound ? b.value : "" });
    if (!bound) complete = false;
    return bound ? `${range.positive && b.value >= 0 ? "+" : ""}${b.value}` : fragment;
  });
  const render = (r) => r.renderTemplate.replace(/\{\{roll_(\d+)\}\}/gu, (_, n) => values[Number(n) - 1]);
  const sameKoRanges = ko?.rollFragments?.length === fragments.length && ko.rollFragments.every((f, i) => f === fragments[i]);
  return { controls, reason: complete ? "" : "SS14 추억 범위 선택값을 현재 원문 범위에서 직접 확인하세요.",
    text: complete ? render(row) : row.text, koText: complete && sameKoRanges ? render(ko) : ko?.text };
}
