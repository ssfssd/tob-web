import { resolveSeasonSkillLevel } from "./seasonSkillLevels.js";
import { SS14_LOG_COMPLETION } from "./data/ss14LogCompletion.generated.js";

export function inspectSeasonUtilitySkill(item, level) {
  const record = item.tlidbText.en;
  if (record.sourceRecordKey === "Supreme_Descent" && record.season === "SS14"
    && record.detail === SS14_LOG_COMPLETION.records[item.id]?.en?.detail
    && record.detail.includes("Cooldown cannot be reduced below 0.2 s")
    && record.detail.includes("Teleports you and Clockwork Core to the target location.")) {
    return { values: { cooldown: 3.3, castTime: 1 }, blockers: [],
      mechanics: [{ kind: "utility-skill", utility: "supreme-descent", minimumCooldown: 0.2, charges: false, links: 4 }] };
  }
  if (record.sourceRecordKey !== "Compound_Tonic") return null;
  const resolved = resolveSeasonSkillLevel(item, level);
  if (resolved.blockers.length) return null;
  const text = resolved.item.tlidbText.en.detail;
  const restoration = text.match(/Restores ([\d.]+) % Max Life within ([\d.]+) s\nRestores ([\d.]+) Mana in ([\d.]+) s/u);
  if (!restoration || !text.includes("This skill's Restoration Effect and Duration are also affected by Elixir Effect and Duration")) return null;
  return { values: {}, blockers: [], progressionReceipt: resolved.receipt,
    mechanics: [{ kind: "utility-skill", utility: "restoration", lifePercent: +restoration[1], lifeDuration: +restoration[2], mana: +restoration[3], manaDuration: +restoration[4] }] };
}
