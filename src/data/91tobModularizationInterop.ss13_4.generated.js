const sourceArtifacts = Object.freeze({
  modularization: Object.freeze({
    url: "https://91tob.com/.generated-runtime/datasets/skill-modularization-catalog.json",
    sha256: "275e3ccb905ca7acb6efd4044e6c1a0753253ffd2e2dc248173b53bcfea45062",
    bytes: 32898,
  }),
  clientBundle: Object.freeze({
    url: "https://91tob.com/assets/App-Bp8Ow0pk.js",
    sha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
    bytes: 2313502,
  }),
});

const sourceModularizationSkillIds = Object.freeze([
  "modularization_skill_goblin_elder",
  "modularization_skill_demon_second_general",
  "modularization_skill_dwarf_mecha",
  "modularization_skill_demon_mage",
  "modularization_skill_goblin_elemental_arch_elder",
  "modularization_skill_medium_ember_mecha",
  "modularization_skill_giant_ember_mecha",
  "modularization_skill_treant_arch_elder",
  "modularization_skill_ratling_assault_captain",
  "modularization_skill_chief_mechanic",
  "modularization_skill_ryan_phantom",
  "modularization_skill_blade_god",
  "modularization_skill_tyrant",
  "modularization_skill_igi_gale",
  "modularization_skill_sand_giant",
  "modularization_skill_heroic_archsage",
  "modularization_skill_calamity_winged_beast",
  "modularization_skill_punisher",
]);

const sourceModuleOptionIds = Object.freeze([
  "program_physical_damage",
  "program_cold_damage",
  "program_fire_damage",
  "program_lightning_damage",
  "program_erosion_damage",
  "program_crit",
  "program_unstable",
  "program_frenzy",
  "program_spell",
  "program_savage",
  "protocol_cold_penetration",
  "protocol_fire_penetration",
  "protocol_lightning_penetration",
  "protocol_erosion_aggravate",
  "protocol_armor_break",
  "protocol_life",
  "protocol_energy_shield",
  "protocol_haste",
  "protocol_projectile",
  "protocol_area",
  "protocol_resistance",
  "protocol_ailment",
  "protocol_block",
  "protocol_knockback",
  "protocol_recovery",
  "protocol_agility",
  "protocol_elemental",
  "aura_overwrite_weapon_amp",
  "aura_overwrite_flame_charge",
  "aura_overwrite_electric_conversion",
  "aura_overwrite_erosion_amp",
  "aura_overwrite_cold_domain",
  "aura_overwrite_tenacity",
  "aura_overwrite_agility",
  "aura_overwrite_energy_barrier",
  "aura_overwrite_elemental_resistance",
  "aura_overwrite_haste",
  "source_tenacity_pulse",
  "source_agility_pulse",
  "source_focus_pulse",
  "source_condensation",
  "source_meltdown",
  "source_surge",
  "source_breakpoint",
  "source_dimension_reduction",
  "source_overclock",
]);

function localId(prefix, sourceId) {
  return `${prefix}-${sourceId.toLowerCase().replaceAll("_", "-")}`;
}

const skills = Object.freeze(sourceModularizationSkillIds.map((sourceModularizationSkillId) => (
  Object.freeze({
    sourceSkillId: `active:modularization:${sourceModularizationSkillId}`,
    sourceModularizationSkillId,
    localMainSkillId: localId("skills", sourceModularizationSkillId),
  })
)));

const options = Object.freeze(sourceModuleOptionIds.map((sourceModuleOptionId) => Object.freeze({
  sourceModuleOptionId,
  localSupportId: localId("supports", sourceModuleOptionId),
})));

export const TOB91_MODULARIZATION_INTEROP_RECEIPT = Object.freeze({
  schemaVersion: 1,
  sourcePackageVersion: "SS13.4",
  sourcePackageGeneratedAt: "2026-08-12T04:29:41.328Z",
  sourceArtifacts,
  rootSkill: Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FModularization_Skill",
    sourceRuntimeId: "modularization",
    sourceName: "模组化",
    sourceUrl: "https://tlidb.com/cn/Modularization_Skill",
  }),
  moduleOptionLimit: 3,
  minimumSummonCount: 0,
  skills,
  options,
  identitySha256: "410ae4f48fe39b2fa5ae08f23a7b82ff8a2e5654dfc64bf33e5d77a0ad6560ec",
});
