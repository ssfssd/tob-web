import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { SS14_GEAR_EN } from "./data/ss14Gear.en.generated.js";
import { SS14_SUPPORTS_EN } from "./data/ss14Supports.en.generated.js";

// Product season and the preserved SS13 calculation engine are separate.
export const CURRENT_PLANNING_SEASON = "SS14";
export const currentSeasonSources = [
  ["스킬", SS14_CARDS_EN], ["장비", SS14_GEAR_EN], ["보조", SS14_SUPPORTS_EN],
].map(([label, data]) => ({ label, generatedAt: data.generatedAt,
  collected: Object.values(data.records).filter(row => row.status === "collected-preview"
    && row.season === CURRENT_PLANNING_SEASON && row.sourceSeasonEvidence?.verificationComplete
    && row.sourceSeasonEvidence.actualSeason === 14).length,
  requested: data.requested,
}));

export function latestSeasonWorkspace(documents, sourceBuild) {
  return documents.filter(row => row.sourceBuild.id === sourceBuild.id)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
}
