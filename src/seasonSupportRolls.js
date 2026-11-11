// A numeric range is a user choice, not permission to use its average or maximum.
export function resolveSeasonSupportRolls(item, rolls = {}) {
  const locale = item.tlidbText.en;
  const lines = locale.detail.split("\n"), simple = lines.indexOf("Simple"), details = lines.indexOf("Details");
  const controls = [], blockers = [], keys = new Map();
  const output = lines.map((line, lineIndex) => {
    if (simple >= 0 && details >= 0 && lineIndex > simple && lineIndex < details) return line;
    let ordinal = 0;
    return line.replace(/\(([+-]?\d+(?:\.\d+)?)\s*[–−-]\s*([+-]?\d+(?:\.\d+)?)\)/gu, (text, low, high) => {
      const min = Number(low), max = Number(high), identity = `${line}:${ordinal++}`;
      if (min > max) { blockers.push("보조 옵션 수치 범위를 확인할 수 없습니다."); return text; }
      const key = keys.get(identity) ?? `range-${keys.size}`;
      if (!keys.has(identity)) {
        keys.set(identity, key);
        controls.push({ key, min, max, value: rolls[key] ?? "", sourceText: line });
      }
      const value = rolls[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        blockers.push("보조 옵션 수치를 표시된 범위에서 선택하세요."); return text;
      }
      return String(value);
    });
  });
  if (Object.keys(rolls).some(key => !controls.some(c => c.key === key))) blockers.push("현재 보조에 없는 옵션 수치가 포함되어 있습니다. 옵션을 다시 선택하세요.");
  return { item: { ...item, tlidbText: { ...item.tlidbText, en: { ...locale, detail: output.join("\n") } } },
    controls, blockers: [...new Set(blockers)] };
}
