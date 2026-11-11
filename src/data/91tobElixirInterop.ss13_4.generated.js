const sourceArtifacts = Object.freeze({
  activeSkills: Object.freeze({
    url: "https://91tob.com/.generated-runtime/datasets/skill-active.json",
    sha256: "f07a3b17bf357a91112b19e7958699e4c5d0be29d1a7f2f686e14c1adb293c42",
    bytes: 404087,
  }),
  elixirs: Object.freeze({
    url: "https://91tob.com/.generated-runtime/datasets/skill-elixir-catalog.json",
    sha256: "8f0c396f3220b0885d1d423e6041cb97b4c1912c297aa3050bc54e073e863b8e",
    bytes: 17043,
  }),
  clientBundle: Object.freeze({
    url: "https://91tob.com/assets/App-Bp8Ow0pk.js",
    sha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
    bytes: 2313502,
  }),
});

const bottleMappings = Object.freeze([
  Object.freeze({
    sourceSlotId: "active-slot-2",
    sourceSlotIndex: 2,
    localBottleId: "base",
    ingredientCapacity: 2,
  }),
  Object.freeze({
    sourceSlotId: "active-slot-3",
    sourceSlotIndex: 3,
    localBottleId: "special",
    ingredientCapacity: 1,
  }),
]);

const skills = Object.freeze([
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FLife_Tonic",
    sourceUrl: "https://tlidb.com/cn/Life_Tonic",
    localMainSkillId: "skills-tlidb-com-cn-life-tonic",
    localElixirSkillId: "life-tonic",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FMana_Tonic",
    sourceUrl: "https://tlidb.com/cn/Mana_Tonic",
    localMainSkillId: "skills-tlidb-com-cn-mana-tonic",
    localElixirSkillId: "mana-tonic",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FSwiftness_Dew",
    sourceUrl: "https://tlidb.com/cn/Swiftness_Dew",
    localMainSkillId: "skills-tlidb-com-cn-swiftness-dew",
    localElixirSkillId: "swiftness-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FThirst_Dew",
    sourceUrl: "https://tlidb.com/cn/Thirst_Dew",
    localMainSkillId: "skills-tlidb-com-cn-thirst-dew",
    localElixirSkillId: "thirst-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FResistance_Dew",
    sourceUrl: "https://tlidb.com/cn/Resistance_Dew",
    localMainSkillId: "skills-tlidb-com-cn-resistance-dew",
    localElixirSkillId: "resistance-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FSteadfast_Dew",
    sourceUrl: "https://tlidb.com/cn/Steadfast_Dew",
    localMainSkillId: "skills-tlidb-com-cn-steadfast-dew",
    localElixirSkillId: "steadfast-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FNimbleness_Dew",
    sourceUrl: "https://tlidb.com/cn/Nimbleness_Dew",
    localMainSkillId: "skills-tlidb-com-cn-nimbleness-dew",
    localElixirSkillId: "nimbleness-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FTenacity_Dew",
    sourceUrl: "https://tlidb.com/cn/Tenacity_Dew",
    localMainSkillId: "skills-tlidb-com-cn-tenacity-dew",
    localElixirSkillId: "tenacity-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FTortoise_Shell_Distillate",
    sourceUrl: "https://tlidb.com/cn/Tortoise_Shell_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-tortoise-shell-distillate",
    localElixirSkillId: "tortoise-shell-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FScorpion_Stinger_Distillate",
    sourceUrl: "https://tlidb.com/cn/Scorpion_Stinger_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-scorpion-stinger-distillate",
    localElixirSkillId: "scorpion-stinger-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FPutrid_Toad_Distillate",
    sourceUrl: "https://tlidb.com/cn/Putrid_Toad_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-putrid-toad-distillate",
    localElixirSkillId: "putrid-toad-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FSaltpeter_Mushroom_Distillate",
    sourceUrl: "https://tlidb.com/cn/Saltpeter_Mushroom_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-saltpeter-mushroom-distillate",
    localElixirSkillId: "saltpeter-mushroom-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FFire_Lizard_Distillate",
    sourceUrl: "https://tlidb.com/cn/Fire_Lizard_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-fire-lizard-distillate",
    localElixirSkillId: "fire-lizard-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FWhite_Rhino_Distillate",
    sourceUrl: "https://tlidb.com/cn/White_Rhino_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-white-rhino-distillate",
    localElixirSkillId: "white-rhino-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FThunder_Wood_Distillate",
    sourceUrl: "https://tlidb.com/cn/Thunder_Wood_Distillate",
    localMainSkillId: "skills-tlidb-com-cn-thunder-wood-distillate",
    localElixirSkillId: "thunder-wood-distillate",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FAgony_Dew",
    sourceUrl: "https://tlidb.com/cn/Agony_Dew",
    localMainSkillId: "skills-tlidb-ss13-7345",
    localElixirSkillId: "pain-dew",
  }),
  Object.freeze({
    sourceSkillId: "active:https%3A%2F%2Ftlidb.com%2Fcn%2FPrism_Butterfly_Distillate",
    sourceUrl: "https://tlidb.com/cn/Prism_Butterfly_Distillate",
    localMainSkillId: "skills-tlidb-ss13-7346",
    localElixirSkillId: "iridescent-butterfly-distillate",
  }),
]);

export const TOB91_ELIXIR_INTEROP_RECEIPT = Object.freeze({
  schemaVersion: 1,
  sourcePackageVersion: "SS13.4",
  sourcePackageGeneratedAt: "2026-08-12T04:29:41.328Z",
  sourceArtifacts,
  bottleMappings,
  skillAllowedSourceSlotIds: Object.freeze(["active-slot-2", "active-slot-3"]),
  skills,
  identitySha256: "6bc8ea60e45cb9954bd999e789d5802aff28660f2e55ac30514d4c0241acab18",
});
