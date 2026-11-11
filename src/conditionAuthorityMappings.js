function conditionRequirements(conditionToken) {
  return Object.freeze([
    Object.freeze({
      id: conditionToken,
      label: "",
      path: `statuses.${conditionToken}`,
      operator: "truthy",
      expected: true,
    }),
  ]);
}

function localeEvidence(sourceMethod, sourceRecordKey, sourcePageSha256, sourcePageVersion) {
  return Object.freeze({
    sourceMethod,
    sourceRecordKey,
    sourcePageSha256,
    ...(sourcePageVersion ? { sourcePageVersion } : {}),
  });
}

function rule(input) {
  return Object.freeze({
    ...input,
    runtimePath: Object.freeze([...input.runtimePath]),
    runtimeExpected: Object.freeze({ ...input.runtimeExpected }),
    tlidb: Object.freeze({
      ko: input.tlidb.ko,
      en: input.tlidb.en,
    }),
    conditionRequirements: input.conditionRequirements
      ? Object.freeze(input.conditionRequirements.map((requirement) => Object.freeze({
          ...requirement,
        })))
      : conditionRequirements(input.conditionToken),
  });
}

export const AUTHORITATIVE_SUPPORT_CONDITION_RULES = Object.freeze([
  rule({
    itemId: "supports-tlidb-com-cn-grudge",
    sourceUrl: "https://tlidb.com/cn/Grudge",
    effectMode: "primary",
    runtimePath: ["skill_support", 32, "effects", 0],
    runtimeEffectId: "damage_vs_cursed",
    runtimeConditionField: "mod_params.cond",
    runtimeExpected: { id: "damage_vs_cursed", mod_type: "dmg_pct" },
    conditionToken: "target_enemy_is_cursed",
    tlidb: {
      ko: localeEvidence("tlidb-current-page", "Grudge", "18efb273cc9ea68f7856c4b40932fce495054bcfaa1d07d29a363919ebfdef11", "SS13"),
      en: localeEvidence("tlidb-current-page", "Grudge", "a302ddf2e481ded20dfef59193bf3929312220d07c8e15faa2419a995e210777", "SS13"),
    },
  }),
  rule({
    itemId: "supports-tlidb-com-cn-hunting-tempo",
    sourceUrl: "https://tlidb.com/cn/Hunting_Tempo",
    effectMode: "primary",
    runtimePath: ["skill_support", 36, "effects", 1],
    runtimeEffectId: "hunting_tempo_extra_damage",
    runtimeConditionField: "mod_params.cond",
    runtimeExpected: { id: "hunting_tempo_extra_damage", mod_type: "dmg_pct" },
    conditionToken: "hunting_tempo_buff_active",
    tlidb: {
      ko: localeEvidence("tlidb-current-page", "Hunting_Tempo", "a3f85b853547d088b899447c192c27c6b0b2fcc492cfa02c139ea28df0afef24", "SS13"),
      en: localeEvidence("tlidb-current-page", "Hunting_Tempo", "9098d611945b4a91cd46c8965e34791fccd405e2eb732bb993e2482e36b49360", "SS13"),
    },
  }),
  rule({
    itemId: "supports-tlidb-com-cn-electric-overload",
    sourceUrl: "https://tlidb.com/cn/Electric_Overload",
    effectMode: "additional",
    valueOverride: 15,
    runtimePath: ["skill_support", 80, "effects", 2],
    runtimeEffectId: "electric_overload_buff_damage",
    runtimeConditionField: "mod_params.cond",
    runtimeExpected: { id: "electric_overload_buff_damage", mod_type: "dmg_pct" },
    conditionToken: "electric_overload_buff_active",
    tlidb: {
      ko: localeEvidence("tlidb-current-page", "Electric_Overload", "6d01b2ae5c2cbb0c78724aa3bbcc60235d174498aeacb9904a61ea76664f96b6", "SS13"),
      en: localeEvidence("tlidb-current-page", "Electric_Overload", "7bb6ee0edf950bf3d3a0fcbd874b3a9af6e7eb6dac159937a72950fe70b3376b", "SS13"),
    },
  }),
  rule({
    itemId: "supports-tlidb-com-cn-elemental-impact",
    sourceUrl: "https://tlidb.com/cn/Elemental_Impact",
    effectMode: "primary",
    runtimePath: ["skill_support", 81, "effects", 0],
    runtimeEffectId: "dual_element_bonus",
    runtimeConditionField: "mod_params.cond",
    runtimeExpected: { id: "dual_element_bonus", mod_type: "dmg_pct" },
    conditionToken: "elemental_impact_buff_active",
    tlidb: {
      ko: localeEvidence("tlidb-current-page", "Elemental_Impact", "c68265aae06ad9d8d1a71699531c150d08f6b8af9230e08075fbaa3e8cb0f55c", "SS13"),
      en: localeEvidence("tlidb-current-page", "Elemental_Impact", "e8c9205540638c8910dee47f6974db760fd71e0a283152012fbaab1dc6df358c", "SS13"),
    },
  }),
  rule({
    itemId: "supports-tlidb-com-cn-harvest-time",
    sourceUrl: "https://tlidb.com/cn/Harvest_Time",
    effectMode: "primary",
    runtimePath: ["skill_support", 92, "effects", 3],
    runtimeEffectId: "minion_tier_bonus",
    runtimeConditionField: "mod_params.cond",
    runtimeExpected: { id: "minion_tier_bonus", mod_type: "dmg_pct" },
    conditionToken: "harvest_time_tier3_activation_active",
    tlidb: {
      ko: localeEvidence("tlidb-current-page", "Harvest_Time", "fc6e9d2c63031c087f4323866b3b61828b36fe37a3572d184e77792f8b7f8db5", "SS13"),
      en: localeEvidence("tlidb-current-page", "Harvest_Time", "a9c2fb1d1586ac12deba5765d5acb02acf5da4d4631f853fbb51338dc3d1a0c4", "SS13"),
    },
  }),
  rule({
    itemId: "supports-program-frenzy",
    sourceUrl: "https://tlidb.com/cn/Modularization_Skill",
    effectMode: "primary",
    valueOverride: 25,
    runtimePath: ["skill_modularization_catalog", "programs", 7, "effects", 0],
    runtimeEffectId: "program_frenzy:conditional_damage_more",
    runtimeConditionField: "condition",
    runtimeExpected: { target: "minion", type: "conditional_damage_more", value: 25 },
    conditionToken: "minion_low_life",
    tlidb: {
      ko: localeEvidence("tlidb-hyperlink-href", "href:Fury_Program", "4c1ec978df5e51544e34a5a7fead9c2155b5c5729d5d2a2e8b4936ed8f9f3071"),
      en: localeEvidence("tlidb-hyperlink-href", "href:Fury_Program", "258f93d82da816153da9cbae074b267b323e365ea6d1d93bed79199059688fe2"),
    },
  }),
  rule({
    itemId: "supports-source-surge",
    sourceUrl: "https://tlidb.com/cn/Modularization_Skill",
    effectMode: "modularization",
    runtimePath: ["skill_modularization_catalog", "source_codes", 5, "effects", 1],
    runtimeEffectId: "source_surge:conditional_damage_more",
    runtimeConditionField: "condition",
    runtimeExpected: {
      target: "player",
      type: "damage_more",
      damage_type: "lightning",
      value: 20,
    },
    conditionToken: "minion_moved_10m_recently",
    conditionRequirements: [{
      id: "minion_moved_10m_recently",
      label: "",
      path: "recent.moveDistanceMeters",
      operator: "atLeast",
      expected: 10,
    }],
    tlidb: {
      ko: localeEvidence("tlidb-hyperlink-href", "href:Source_Code%3A_Power_Surge", "4c1ec978df5e51544e34a5a7fead9c2155b5c5729d5d2a2e8b4936ed8f9f3071"),
      en: localeEvidence("tlidb-hyperlink-href", "href:Source_Code%3A_Power_Surge", "258f93d82da816153da9cbae074b267b323e365ea6d1d93bed79199059688fe2"),
    },
  }),
]);

const RULE_BY_ITEM_ID = new Map(
  AUTHORITATIVE_SUPPORT_CONDITION_RULES.map((entry) => [entry.itemId, entry]),
);

function localeMatches(record, expected) {
  if (!record || !expected) return false;
  const status = record.sourceFieldStatus;
  return record.sourceMethod === expected.sourceMethod
    && record.sourceRecordKey === expected.sourceRecordKey
    && record.sourcePageSha256 === expected.sourcePageSha256
    && (!expected.sourcePageVersion || record.sourcePageVersion === expected.sourcePageVersion)
    && status?.name === "exact"
    && status?.summary === "exact"
    && status?.detail === "exact";
}

export function getAuthoritativeSupportConditionRule(item) {
  const authority = getSupportConditionAuthority(item);
  return authority.status === "verified" ? authority.rule : null;
}

export function getSupportConditionAuthority(item) {
  const entry = RULE_BY_ITEM_ID.get(item?.id);
  if (!entry) return { status: "unmapped", rule: null };
  const verified = item.sourceUrl === entry.sourceUrl
    && localeMatches(item.tlidbText?.ko, entry.tlidb.ko)
    && localeMatches(item.tlidbText?.en, entry.tlidb.en);
  return {
    status: verified ? "verified" : "evidence-mismatch",
    rule: entry,
  };
}
