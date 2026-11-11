const sourceArtifacts = Object.freeze({
  packageManifest: Object.freeze({
    url: "https://91tob.com/.generated-runtime/package-manifest.json",
    lastModified: "Wed, 12 Aug 2026 04:29:41 GMT",
    sha256: "8b1fc85cc2ebc7d886713bfac3711a5ef91f7b817808f8129436d8505e25c35e",
    bytes: 4361,
  }),
  destinyCatalog: Object.freeze({
    url: "https://91tob.com/.generated-runtime/datasets/destiny-catalog.json",
    lastModified: "Wed, 12 Aug 2026 04:29:41 GMT",
    sha256: "1fc2192f3359031023f8b3f7b2fe60605ab76aad0da09a87457314531246d8e6",
    bytes: 98644,
  }),
  clientBundle: Object.freeze({
    url: "https://91tob.com/assets/App-Bp8Ow0pk.js",
    lastModified: "Wed, 12 Aug 2026 04:30:20 GMT",
    sha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
    bytes: 2313502,
  }),
});

const supportedDestinyIds = Object.freeze(["dual_kismet_banshee","dual_kismet_bird_in_a_pond","dual_kismet_bitterbond","dual_kismet_bounded_holy_maiden","dual_kismet_butterfly_in_a_bottle","dual_kismet_dark_moon","dual_kismet_echidna","dual_kismet_evil_flame","dual_kismet_fire_in_the_stone","dual_kismet_fire_plume","dual_kismet_fish_in_a_cage","dual_kismet_flash_flood","dual_kismet_ghost_bee","dual_kismet_god_27s_fall","dual_kismet_great_library","dual_kismet_hanging_bird","dual_kismet_hatch_out","dual_kismet_headless","dual_kismet_heartless","dual_kismet_hot_ice","dual_kismet_hunter_27s_hand","dual_kismet_ice_flower","dual_kismet_iron_wall","dual_kismet_mammoth","dual_kismet_mechanical_tree","dual_kismet_mighty_arrow","dual_kismet_mirror_cracks","dual_kismet_mountain_god","dual_kismet_peerless","dual_kismet_perched_river","dual_kismet_plague_source","dual_kismet_pointer","dual_kismet_prophet","dual_kismet_queen_ant","dual_kismet_resentful_maiden","dual_kismet_rock_core","dual_kismet_shackles","dual_kismet_shadow","dual_kismet_sky_piercer","dual_kismet_solid_rock","dual_kismet_spindle","dual_kismet_spirit_orb","dual_kismet_star_chasing_arrow","dual_kismet_sun_slash","dual_kismet_three_eyed_cat","dual_kismet_thunder_branch","dual_kismet_twin_cities","dual_kismet_two_headed_crow","dual_kismet_unholy_grail","dual_kismet_viper","dual_kismet_witch_27s_cauldron","dual_kismet_wraith","kismet_ascetic","kismet_ashes","kismet_black_square","kismet_bouquet","kismet_civet","kismet_creek","kismet_deeproot","kismet_double_blade","kismet_fisherman","kismet_fluffy_ball","kismet_giant","kismet_giant_bear","kismet_green_shoot","kismet_guard","kismet_guillotine","kismet_hawk","kismet_hound","kismet_hunter","kismet_ice_soul","kismet_leader","kismet_lion","kismet_longevity_tree","kismet_mercury_bottle","kismet_mouth_of_the_spring","kismet_pale_fox","kismet_prosthetics","kismet_red_leech","kismet_ripple","kismet_sacred_crest","kismet_scale","kismet_scorpion_stinger","kismet_shadow_mage","kismet_shield","kismet_spades","kismet_spider_fluid","kismet_star_trail","kismet_stone_bear","kismet_synthetic_heart","kismet_tiger_27s_chain","kismet_tiger_roar","kismet_volcano","kismet_war_hammer","kismet_wind_chime","kismet_witch_cloak","medium_fate_affliction_effect","medium_fate_armor","medium_fate_attack_block_chance","medium_fate_attack_cast_speed","medium_fate_attack_damage","medium_fate_aura_effect","medium_fate_block_ratio","medium_fate_cold_resistance","medium_fate_command","medium_fate_critical_strike_damage","medium_fate_critical_strike_rating","medium_fate_curse_effect","medium_fate_dexterity","medium_fate_double_damage_chance","medium_fate_energy_shield","medium_fate_energy_shield_charge_speed","medium_fate_energy_shield_restored_on_defeat","medium_fate_erosion_resistance","medium_fate_evade","medium_fate_fire_resistance","medium_fate_focus_speed","medium_fate_growth","medium_fate_intelligence","medium_fate_life_regeneration","medium_fate_life_restored_on_defeat","medium_fate_lightning_resistance","medium_fate_mana_25","medium_fate_max_cold_resistance","medium_fate_max_erosion_resistance","medium_fate_max_fire_resistance","medium_fate_max_lightning_resistance","medium_fate_movement_speed","medium_fate_multistrike_chance","medium_fate_multistrike_increment","medium_fate_numbed_effect","medium_fate_origin_of_spirit_magus","medium_fate_reaping_duration","medium_fate_seal_compensation","medium_fate_spell_block_chance","medium_fate_spell_damage","medium_fate_strength","micro_fate_affliction_effect","micro_fate_armor","micro_fate_attack_block_chance","micro_fate_attack_cast_speed","micro_fate_attack_damage","micro_fate_aura_effect","micro_fate_block_ratio","micro_fate_cold_resistance","micro_fate_command","micro_fate_critical_strike_damage","micro_fate_critical_strike_rating","micro_fate_curse_effect","micro_fate_deterioration_chance","micro_fate_deterioration_duration","micro_fate_dexterity","micro_fate_double_damage_chance","micro_fate_energy_shield","micro_fate_energy_shield_charge_speed","micro_fate_energy_shield_restored_on_defeat","micro_fate_erosion_resistance","micro_fate_evade","micro_fate_fire_resistance","micro_fate_focus_speed","micro_fate_growth","micro_fate_ignite_damage_mitigation","micro_fate_intelligence","micro_fate_life_regeneration","micro_fate_life_restored_on_defeat","micro_fate_lightning_resistance","micro_fate_mana_25","micro_fate_max_cold_resistance","micro_fate_max_erosion_resistance","micro_fate_max_fire_resistance","micro_fate_max_lightning_resistance","micro_fate_movement_speed","micro_fate_multistrike_chance","micro_fate_multistrike_increment","micro_fate_numbed_effect","micro_fate_numbed_effect_mitigation","micro_fate_origin_of_spirit_magus","micro_fate_paralysis_effect_mitigation","micro_fate_reaping_duration","micro_fate_seal_compensation","micro_fate_slow_effect_mitigation","micro_fate_spell_block_chance","micro_fate_spell_damage","micro_fate_strength","micro_fate_trauma_damage_mitigation","micro_fate_weaken_effect_mitigation","micro_fate_wilt_damage_mitigation"]);

const undeterminedFate = Object.freeze({
  destiny: Object.freeze({
    id: "undetermined_fate",
    name: "未定宿命",
    destinyType: "undetermined_fate",
    slotType: "undetermined",
    resolvedAffixText: "",
  }),
  maximumChildSlots: 5,
  catalogLayouts: Object.freeze([
    Object.freeze({ id: "micro_1", label: "1个小型槽位", slots: Object.freeze(["micro"]) }),
    Object.freeze({ id: "medium_1", label: "1个中型槽位", slots: Object.freeze(["medium"]) }),
    Object.freeze({ id: "micro_2", label: "2个小型槽位", slots: Object.freeze(["micro", "micro"]) }),
    Object.freeze({ id: "micro_medium", label: "1个小型 + 1个中型槽位", slots: Object.freeze(["micro", "medium"]) }),
    Object.freeze({ id: "medium_2", label: "2个中型槽位", slots: Object.freeze(["medium", "medium"]) }),
    Object.freeze({ id: "micro_3", label: "3个小型槽位", slots: Object.freeze(["micro", "micro", "micro"]) }),
    Object.freeze({ id: "micro_2_medium", label: "2个小型 + 1个中型槽位", slots: Object.freeze(["micro", "micro", "medium"]) }),
    Object.freeze({ id: "micro_medium_2", label: "1个小型 + 2个中型槽位", slots: Object.freeze(["micro", "medium", "medium"]) }),
    Object.freeze({ id: "medium_3", label: "3个中型槽位", slots: Object.freeze(["medium", "medium", "medium"]) }),
  ]),
  layouts: Object.freeze([
    Object.freeze({ id: "micro_1", slots: Object.freeze(["micro"]) }),
    Object.freeze({ id: "medium_1", slots: Object.freeze(["medium"]) }),
    Object.freeze({ id: "micro_2", slots: Object.freeze(["micro", "micro"]) }),
    Object.freeze({ id: "micro_medium", slots: Object.freeze(["micro", "medium"]) }),
    Object.freeze({ id: "medium_2", slots: Object.freeze(["medium", "medium"]) }),
    Object.freeze({ id: "micro_3", slots: Object.freeze(["micro", "micro", "micro"]) }),
    Object.freeze({ id: "micro_2_medium", slots: Object.freeze(["micro", "micro", "medium"]) }),
    Object.freeze({ id: "micro_medium_2", slots: Object.freeze(["micro", "medium", "medium"]) }),
    Object.freeze({ id: "medium_3", slots: Object.freeze(["medium", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m0_d4", slots: Object.freeze(["medium", "medium", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m1_d3", slots: Object.freeze(["micro", "medium", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m2_d2", slots: Object.freeze(["micro", "micro", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m3_d1", slots: Object.freeze(["micro", "micro", "micro", "medium"]) }),
    Object.freeze({ id: "generated_m4_d0", slots: Object.freeze(["micro", "micro", "micro", "micro"]) }),
    Object.freeze({ id: "generated_m0_d5", slots: Object.freeze(["medium", "medium", "medium", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m1_d4", slots: Object.freeze(["micro", "medium", "medium", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m2_d3", slots: Object.freeze(["micro", "micro", "medium", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m3_d2", slots: Object.freeze(["micro", "micro", "micro", "medium", "medium"]) }),
    Object.freeze({ id: "generated_m4_d1", slots: Object.freeze(["micro", "micro", "micro", "micro", "medium"]) }),
    Object.freeze({ id: "generated_m5_d0", slots: Object.freeze(["micro", "micro", "micro", "micro", "micro"]) }),
  ]),
});

const unsupportedDestinyIds = Object.freeze({
  removedFromCurrentSs13Ids: Object.freeze([
    "dual_kismet_destiny_27s_betrayal",
    "dual_kismet_pendulum",
  ]),
  rollStructureMismatchIds: Object.freeze([
    "kismet_growth_ring",
    "kismet_screw",
  ]),
});

export const TOB91_DESTINY_INTEROP_RECEIPT = Object.freeze({
  schemaVersion: 1,
  sourcePackageVersion: "SS13.4",
  sourcePackageGeneratedAt: "2026-08-12T04:29:41.328Z",
  sourceArtifacts,
  catalogVersion: "frontend_destiny_catalog_v1",
  catalogFingerprint: "f546843c38589018f1a33b92649b1da2e405e31c",
  sourceIdentityFnv1a64: "d824b5398faecbde",
  sourceIdentityJsonLength: 27966,
  slotOrder: Object.freeze(["slot1", "slot2", "slot3"]),
  ringOrder: Object.freeze([
    "innerRing1",
    "innerRing2",
    "midRing1",
    "innerRing3",
    "innerRing4",
    "midRing2",
    "innerRing5",
    "innerRing6",
    "midRing3",
  ]),
  supportedDestinyIds,
  undeterminedFate,
  unsupportedDestinyIds,
  identitySha256: "ee2f9f54c0f501e172db9ee0390ba432e163d684ff6451b74978307899078abb",
});
