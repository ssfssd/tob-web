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

// These IDs retain their original catalog identity. Match the images to the
// SS14 Korean and English cards before overriding an older catalog URL.
const ss14GearIconNames = Object.freeze({
  'gear-tlidb-ss13-112260': 'Helmet_Epic_336',
  'gear-tlidb-ss13-112170': 'Armor_Epic_451',
  'gear-tlidb-ss13-112172': 'Armor_Epic_452',
  'gear-tlidb-ss13-112171': 'Armor_Epic_450',
  'gear-tlidb-ss13-113286': 'Amulet_Epic_334',
  'gear-tlidb-ss13-113343': 'Belt_Epic_227',
  'gear-tlidb-ss13-112443': 'Shoes_Epic_433',
});

export function seasonGearCardIcon(id) {
  if (id === 'gear-tlidb-ss13-111412') return 'assets/tlidb-icons/f346669d2b6e27b5590e3cfd.webp';
  const name = Object.hasOwn(ss14GearIconNames,id) ? ss14GearIconNames[id] : null;
  return name ? `https://cdn.tlidb.com/UIV2/Common/Icon/UI/Textures/EquipCommon/NoAtlas_112_160/Icon_Equip_${name}_112.webp` : '';
}
