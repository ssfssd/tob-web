export const MOON_LUNAR_RING_ID = 'supports-ss14-current-moon-strike-lunar-ring-magnificent';
const lunarRingRange = /^When the supported skill casts a Steep Strike, there is a (\([\d–]+\)) % chance to launch a circular attack\. For every 150 Max Mana, \+1% to the trigger chance of this effect, up to \+\1 %$/u;

// A numeric range is a user choice, not permission to use its average or maximum.
export function resolveSeasonSupportRolls(item, rolls = {}) {
  const locale = item.tlidbText.en;
  const lines = locale.detail.split("\n"), simple = lines.indexOf("Simple"), details = lines.indexOf("Details");
  const controls = [], blockers = [], keys = new Map(), obsoleteKeys = new Set();
  const output = lines.map((line, lineIndex) => {
    if (simple >= 0 && details >= 0 && lineIndex > simple && lineIndex < details) return line;
    let ordinal = 0;
    // Both bounds use the same P1 in SS14 affix 603808704.
    const sharedRoll = item.id === MOON_LUNAR_RING_ID && lunarRingRange.test(line);
    return line.replace(/\(([+-]?\d+(?:\.\d+)?)\s*[–−-]\s*([+-]?\d+(?:\.\d+)?)\)/gu, (text, low, high) => {
      const index = ordinal++;
      const min = Number(low), max = Number(high), identity = `${line}:${sharedRoll ? 0 : index}`;
      if (min > max) { blockers.push("보조 옵션 수치 범위를 확인할 수 없습니다."); return text; }
      const key = keys.get(identity) ?? `range-${keys.size}`;
      if (!keys.has(identity)) {
        keys.set(identity, key);
        controls.push({ key, min, max, value: rolls[key] ?? "", sourceText: line });
      }
      if (sharedRoll && index === 1) obsoleteKeys.add(`range-${keys.size}`);
      const value = rolls[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        blockers.push("보조 옵션 수치를 표시된 범위에서 선택하세요."); return text;
      }
      return String(value);
    });
  });
  if (Object.keys(rolls).some(key => !obsoleteKeys.has(key) && !controls.some(c => c.key === key))) blockers.push("현재 보조에 없는 옵션 수치가 포함되어 있습니다. 옵션을 다시 선택하세요.");
  return { item: { ...item, tlidbText: { ...item.tlidbText, en: { ...locale, detail: output.join("\n") } } },
    controls, blockers: [...new Set(blockers)] };
}
