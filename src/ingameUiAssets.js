// Original TLIDB images, matched by tree slug in the cached source pages.
// Presentation only: these images do not supply season values or game rules.
export const TALENT_TREE_ART = Object.freeze({
  God_of_Might: "TalentStr", The_Brave: "TalentStr01", Onslaughter: "TalentStrS02", Warlord: "TalentStrS03", Warrior: "TalentStrS04",
  Goddess_of_Hunting: "TalentAgi", Marksman: "TalentAgiS01", Bladerunner: "TalentAgiS02", Druid: "TalentAgiS03", Assassin: "TalentAgiS04",
  Goddess_of_Knowledge: "TalentInt", Magister: "TalentIntS01", Arcanist: "TalentIntS02", Elementalist: "TalentIntS03", Prophet: "TalentIntS04",
  God_of_War: "TalentSA", Shadowdancer: "TalentSA01", Ronin: "TalentSA02", Ranger: "TalentSAS03", Sentinel: "TalentSAS04",
  Goddess_of_Deception: "TalentAI", Shadowmaster: "TalentAI01", Psychic: "TalentAIS02", Warlock: "TalentAIS03", Lich: "TalentAIS04",
  God_of_Machines: "TalentSI", Machinist: "TalentSIS01", Steel_Vanguard: "TalentSIS02", Alchemist: "TalentSIS03", Artisan: "TalentSIS04",
});

export function talentTreeIcon(tree) {
  const name = TALENT_TREE_ART[tree?.slug];
  return name ? `/assets/ingame-ui/${name}.webp` : tree?.iconUrl || "";
}

// Decoded from the installed UI atlases. See assets/ingame-ui/game/provenance.json.
export const coreCardOrnament = `<img class="ingame-core-ornament" src="/assets/ingame-ui/game/core-ornament.png" alt="" aria-hidden="true">`;

export const skillOrbitOrnament = `<span class="ingame-skill-orbit-art" aria-hidden="true"></span>`;
