import { theaState } from "./seasonTheaState.js";
import { THEA_EVENT_FIELDS, validTheaEventValue } from "./seasonTheaEvents.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";

export function parseTheaBlessingSources(text, build, multiplier, parseLines, options) {
  if (!theaState(build) || !/Blessing|祝福/u.test(text)) return null;
  const mechanics = []; const remaining = []; const blockers = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s*\(Max Active Divinity: \d+\)$/u, "").trim(); let m;
    if ((m = line.match(/^([+-]\d+) % (Focus|Agility|Tenacity) Blessing Duration$/u))) {
      mechanics.push({ kind: "thea-blessing-duration", blessing: m[2], increased: Number(m[1]) * multiplier });
    } else if ((m = line.match(/^([+-]\d+) to Max (Focus|Agility|Tenacity) Blessing Stacks$/u))) {
      mechanics.push({ kind: "thea-cap", blessing: m[2], bonus: Number(m[1]) * multiplier });
    } else if (["消耗法术迸发时，获得 1 层 聚能祝福", "纠缠释放技能时，获得 1 层 聚能祝福", "Gains 1 stack of Focus Blessing when consuming Spell Burst", "Gains 1 stack of Focus Blessing when Tangle casts a skill"].includes(line)) {
      const key = /法术迸发|Spell Burst/u.test(line) ? "burstRate" : "tangleRate";
      if (key === "burstRate" && theaCombatEnabled(build)) {
        mechanics.push({ kind: "thea-combat-event", inputKey: key, blessing: "Focus", gain: multiplier, sourceText: raw }); continue;
      }
      mechanics.push({ kind: "thea-event-input", key });
      const rate = build.ss14Inputs?.theaEvents?.[key];
      if (!validTheaEventValue(key, rate)) blockers.push({ sourceText: raw, reason: `${THEA_EVENT_FIELDS[key].label}을 선택하세요.` });
      else mechanics.push({ kind: "thea-event", rate, blessing: "Focus", gain: multiplier, sourceText: raw });
    } else remaining.push(line.replace(/when having (Focus|Agility|Tenacity) Blessing$/u, "while $1 Blessing is active"));
  }
  if (!mechanics.length && remaining.join("\n") === text) return null;
  const parsed = parseLines(remaining.join("\n"), multiplier, options);
  return { ...parsed, mechanics, blockers: [...parsed.blockers, ...blockers] };
}
