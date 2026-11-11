const sourceArtifacts = Object.freeze({
  clientBundle: Object.freeze({
    url: "https://91tob.com/assets/App-Bp8Ow0pk.js",
    sha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
    bytes: 2313502,
  }),
});

function catalogId(role, sourceUrl) {
  return `${role}:${encodeURIComponent(sourceUrl)}`;
}

const hosts = Object.freeze({
  fire: Object.freeze({
    sourceName: "召唤火焰之灵",
    sourceUrl: "https://tlidb.com/cn/Summon_Fire_Magus",
    localPassiveSkillId: "skills-tlidb-com-cn-summon-fire-magus",
  }),
  cold: Object.freeze({
    sourceName: "召唤寒冰之灵",
    sourceUrl: "https://tlidb.com/cn/Summon_Frost_Magus",
    localPassiveSkillId: "skills-tlidb-com-cn-summon-frost-magus",
  }),
  lightning: Object.freeze({
    sourceName: "召唤雷霆之灵",
    sourceUrl: "https://tlidb.com/cn/Summon_Thunder_Magus",
    localPassiveSkillId: "skills-tlidb-com-cn-summon-thunder-magus",
  }),
  physical: Object.freeze({
    sourceName: "召唤磐石之灵",
    sourceUrl: "https://tlidb.com/cn/Summon_Rock_Magus",
    localPassiveSkillId: "skills-tlidb-com-cn-summon-rock-magus",
  }),
  erosion: Object.freeze({
    sourceName: "召唤腐化之灵",
    sourceUrl: "https://tlidb.com/cn/Summon_Erosion_Magus",
    localPassiveSkillId: "skills-tlidb-com-cn-summon-erosion-magus",
  }),
});

const mappingSpecs = Object.freeze([
  ["烈焰挥舞", "https://tlidb.com/cn/Blazing_Dance", "skills-tlidb-com-cn-blazing-dance", "fire"],
  ["烈焰飞旋", "https://tlidb.com/cn/Blazing_Spin", "skills-tlidb-com-cn-blazing-spin", "fire"],
  ["烈焰暴燃", "https://tlidb.com/cn/Blazing_Incineration", "skills-tlidb-com-cn-blazing-incineration", "fire"],
  ["熔火升腾", "https://tlidb.com/cn/Molten_Rising", "skills-tlidb-com-cn-molten-rising", "fire"],
  ["冰川涟漪", "https://tlidb.com/cn/Glacier_Ripples", "skills-tlidb-com-cn-glacier-ripples", "cold"],
  ["寒潮缓释", "https://tlidb.com/cn/Frost_Release", "skills-tlidb-com-cn-frost-release", "cold"],
  ["冰浇雪铸", "https://tlidb.com/cn/Permafrost_Cast", "skills-tlidb-com-cn-permafrost-cast", "cold"],
  ["撼地冰暴", "https://tlidb.com/cn/Ice_Earthshaker", "skills-tlidb-com-cn-ice-earthshaker", "cold"],
  ["闪电流星", "https://tlidb.com/cn/Lightning_Star", "skills-tlidb-com-cn-lightning-star", "lightning"],
  ["雷云激荡", "https://tlidb.com/cn/Thundercloud_Surge", "skills-tlidb-com-cn-thundercloud-surge", "lightning"],
  ["雷光飞矢", "https://tlidb.com/cn/Thunderlight_Arrow", "skills-tlidb-com-cn-thunderlight-arrow", "lightning"],
  ["雷驰电涌", "https://tlidb.com/cn/Lightning_Surge", "skills-tlidb-com-cn-lightning-surge", "lightning"],
  ["裂石打击", "https://tlidb.com/cn/Shattered_Stone", "skills-tlidb-com-cn-shattered-stone", "physical"],
  ["聚石碎金", "https://tlidb.com/cn/Gold_Rush", "skills-tlidb-com-cn-gold-rush", "physical"],
  ["乱石横飞", "https://tlidb.com/cn/Rock_Blast", "skills-tlidb-com-cn-rock-blast", "physical"],
  ["群峰压顶", "https://tlidb.com/cn/Towering_Mountains", "skills-tlidb-com-cn-towering-mountains", "physical"],
  ["零落成泥", "https://tlidb.com/cn/Scattered_Mud", "skills-tlidb-com-cn-scattered-mud", "erosion"],
  ["凋敝奉还", "https://tlidb.com/cn/Withering_Payback", "skills-tlidb-com-cn-withering-payback", "erosion"],
  ["哀草丛生", "https://tlidb.com/cn/Bleak_Grass", "skills-tlidb-com-cn-bleak-grass", "erosion"],
  ["荆天棘地", "https://tlidb.com/cn/World_of_Thorns", "skills-tlidb-com-cn-world-of-thorns", "erosion"],
]);

const mappings = Object.freeze(mappingSpecs.map(([sourceActiveName, sourceActiveUrl, localActiveSkillId, hostKey]) => {
  const host = hosts[hostKey];
  return Object.freeze({
    sourceActiveSkillId: catalogId("active", sourceActiveUrl),
    sourceActiveName,
    sourceActiveUrl,
    localActiveSkillId,
    sourceSpiritHostSkillId: catalogId("passive", host.sourceUrl),
    sourceSpiritHostName: host.sourceName,
    sourceSpiritHostUrl: host.sourceUrl,
    localSpiritHostSkillId: host.localPassiveSkillId,
  });
}));

const directActiveSkills = Object.freeze(Object.values(hosts).map((host) => {
  const sourcePassiveSkillId = catalogId("passive", host.sourceUrl);
  return Object.freeze({
    sourceSkillId: `${sourcePassiveSkillId}:watchful-breeze-active`,
    sourceName: host.sourceName,
    sourceUrl: host.sourceUrl,
    localPassiveSkillId: host.localPassiveSkillId,
    localActiveSkillId: `${host.localPassiveSkillId}:iris-spirit-active`,
  });
}));

export const TOB91_IRIS_SPIRIT_INTEROP_RECEIPT = Object.freeze({
  schemaVersion: 1,
  sourcePackageVersion: "SS13.4",
  sourcePackageGeneratedAt: "2026-08-12T04:29:41.328Z",
  sourceArtifacts,
  heroIdentifiers: Object.freeze({
    growingBreeze: Object.freeze([
      "growing-breeze",
      "hero-tlidb-com-cn-growing-breeze",
    ]),
    vigilantBreeze: Object.freeze([
      "vigilant-breeze",
      "hero-tlidb-com-cn-vigilant-breeze",
    ]),
  }),
  mappings,
  directActiveSkills,
  identitySha256: "573df26c4b10885dbd61176744c3e36459438caa7ed9d28b1df51b897843bafa",
});
