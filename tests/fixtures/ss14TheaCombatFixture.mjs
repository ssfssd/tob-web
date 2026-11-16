import { ss14DpsDocument } from "./ss14DpsFixture.mjs";
import { editSeasonWorkspace as edit } from "../../src/seasonWorkspace.js";
import { seasonTheaOptions, THEA_SS14_ID } from "../../src/seasonHeroSelection.js";
export function theaCombatDocument(base = ss14DpsDocument()) {
  let d = edit(base, { kind: "skill-selection", rowIndex: 0, value: "skills-tlidb-com-cn-ice-lances" });
  d = edit(d, { kind: "hero-selection", value: THEA_SS14_ID });
  for (const token of ["011", "032", "062", "061"]) {
    const o = seasonTheaOptions().find(r => r.key.includes(`ui_yuenv${token}`));
    d = edit(d, { kind: "hero-choice", key: String(o.level), value: o.key });
    d = edit(d, { kind: "hero-tier", key: o.key, value: 1 });
  }
  d = edit(d, { kind: "game-critical-input", key: "0" });
  for (const [key, value] of Object.entries({ "0:useShare": 100, "0:hitChance": 100, "0:castRate": 1, "enemy:fire": 0, "enemy:affliction": 0 })) d = edit(d, { kind: "dps-input", key, value });
  d = edit(d, { kind: "thea-mode", value: 1 });
  d = edit(d, { kind: "thea-cycle-input", key: "seconds", value: 6 });
  for (const [key, value] of Object.entries({ combatMode: 1, igniteEnabled: 1, numbedEnabled: 0,
    igniteBaseMin: 100, igniteBaseMax: 100, igniteChance: 100, igniteIncreased: 0, igniteDuration: 4, igniteLimit: 1, afflictionRate: 0 })) d = edit(d, { kind: "thea-event", key, value });
  return d;
}
