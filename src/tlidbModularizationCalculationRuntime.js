import { CATALOG } from "./catalog.js";
import { getSupportConditionAuthority } from "./conditionAuthorityMappings.js";
import { diagnoseConditions, resolveConditionValues } from "./conditionModel.js";
import {
  TOB91_MODULARIZATION_INTEROP_RECEIPT,
} from "./data/91tobModularizationInterop.ss13_4.generated.js";

const KO_PAGE_SHA256 = "4c1ec978df5e51544e34a5a7fead9c2155b5c5729d5d2a2e8b4936ed8f9f3071";
const EN_PAGE_SHA256 = "258f93d82da816153da9cbae074b267b323e365ea6d1d93bed79199059688fe2";

function damageProfile(type, koType, enType) {
  const sourceModuleOptionId = `program_${type}_damage`;
  const sourceRecordKey = `href:Damage_Boost_Program%3A_${enType}`;
  return Object.freeze({
    sourceModuleOptionId,
    localSupportId: `supports-${sourceModuleOptionId.replaceAll("_", "-")}`,
    stat: `minion-${type}-damage`,
    operation: "more",
    value: 15,
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey,
        sourcePageSha256: KO_PAGE_SHA256,
        name: `대미지 증가 프로그램: ${koType}`,
        detail: `해당 스킬로 소환한 소환체 ${koType} 대미지 별도 +15%`,
      }),
      en: Object.freeze({
        sourceRecordKey,
        sourcePageSha256: EN_PAGE_SHA256,
        name: `Damage Boost Program: ${enType}`,
        detail: `+15% additional ${enType} Damage for Minions summoned by this skill`,
      }),
    }),
  });
}

function blessingPulseProfile(type, koBlessing, enBlessing) {
  const titleType = `${type[0].toUpperCase()}${type.slice(1)}`;
  const sourceModuleOptionId = `source_${type}_pulse`;
  const sourceRecordKey = `href:Source_Code%3A_${titleType}_Pulse`;
  return Object.freeze({
    sourceModuleOptionId,
    localSupportId: `supports-${sourceModuleOptionId.replaceAll("_", "-")}`,
    effects: Object.freeze([
      Object.freeze({
        stat: `minion-hit-${type}-blessing-grant-chance`,
        operation: "add",
        value: 50,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: `minion-hit-${type}-blessing-granted-stacks`,
        operation: "add",
        value: 1,
        unit: "stacks",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey,
        sourcePageSha256: KO_PAGE_SHA256,
        name: `소스 코드: ${koBlessing} 펄스`,
        detail: `해당 스킬로 소환한 소환체 적중 시, +50% 확률로 자신과 아군에게 ${koBlessing} 축복 1회 부여`,
      }),
      en: Object.freeze({
        sourceRecordKey,
        sourcePageSha256: EN_PAGE_SHA256,
        name: `Source Code: ${titleType} Pulse`,
        detail: `When Minions summoned by this skill hit, +50% chance to grant you and allies 1 stack of ${enBlessing} Blessing`,
      }),
    }),
  });
}

function infiltrationProtocolProfile(type, koType, koDetail) {
  const titleType = `${type[0].toUpperCase()}${type.slice(1)}`;
  const sourceModuleOptionId = `protocol_${type}_penetration`;
  return Object.freeze({
    sourceModuleOptionId,
    localSupportId: `supports-${sourceModuleOptionId.replaceAll("_", "-")}`,
    stat: `minion-inflicts-${type}-infiltration-on-${type}-damage`,
    operation: "set",
    value: 1,
    unit: "boolean",
    skillDamageApplicability: "configuration-only",
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: `href:${titleType}_Protocol`,
        sourcePageSha256: KO_PAGE_SHA256,
        name: `${koType} 프로토콜`,
        detail: koDetail,
      }),
      en: Object.freeze({
        sourceRecordKey: `href:${titleType}_Protocol`,
        sourcePageSha256: EN_PAGE_SHA256,
        name: `${titleType} Protocol`,
        detail: `Inflicts ${titleType} Infiltration when Minions summoned by this skill deal ${titleType} Damage`,
      }),
    }),
  });
}

function auraOverwriteProfile({
  sourceModuleOptionId,
  sourceRecordKey,
  statKey,
  koName,
  koAuraName,
  enName,
  enAuraName,
}) {
  return Object.freeze({
    sourceModuleOptionId,
    localSupportId: `supports-${sourceModuleOptionId.replaceAll("_", "-")}`,
    stat: `minion-granted-precise-${statKey}-level`,
    operation: "set",
    value: 1,
    unit: "level",
    skillDamageApplicability: "configuration-only",
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey,
        sourcePageSha256: KO_PAGE_SHA256,
        name: koName,
        detail: `해당 스킬로 소환한 소환체는 자신과 아군에게 1 레벨 정밀 ${koAuraName} 부여`,
      }),
      en: Object.freeze({
        sourceRecordKey,
        sourcePageSha256: EN_PAGE_SHA256,
        name: enName,
        detail: `Minions summoned by this skill grant a Lv. 1 Precise: ${enAuraName} to you and allies`,
      }),
    }),
  });
}

export const TLIDB_MODULARIZATION_CALCULATION_PROFILES = Object.freeze([
  damageProfile("physical", "물리", "Physical"),
  damageProfile("cold", "냉기", "Cold"),
  damageProfile("fire", "화염", "Fire"),
  damageProfile("lightning", "번개", "Lightning"),
  damageProfile("erosion", "부식", "Erosion"),
  Object.freeze({
    sourceModuleOptionId: "program_unstable",
    localSupportId: "supports-program-unstable",
    effects: Object.freeze([
      Object.freeze({ stat: "minion-minimum-damage", operation: "more", value: -20 }),
      Object.freeze({ stat: "minion-maximum-damage", operation: "more", value: 30 }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Transience_Program",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "변동 프로그램",
        detail: "해당 스킬로 소환한 소환체 최소 대미지 별도 -20%, 최대 대미지 별도 +30%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Transience_Program",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Transience Program",
        detail: "-20% additional min damage and +30% additional max damage for Minions summoned by this skill",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "program_crit",
    localSupportId: "supports-program-crit",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-critical-strike-rating",
        operation: "add",
        value: 100,
        unit: "percent",
      }),
      Object.freeze({
        stat: "minion-critical-strike-damage",
        operation: "add",
        value: 50,
        unit: "percent",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Critical_Strike_Program",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "크리티컬 프로그램",
        detail: "해당 스킬로 소환한 소환체 크리티컬 +100%, 크리티컬 대미지 +50%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Critical_Strike_Program",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Critical Strike Program",
        detail: "+100% Critical Strike Rating and +50% Critical Strike Damage for Minions summoned by this skill",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "program_frenzy",
    localSupportId: "supports-program-frenzy",
    stat: "minion-damage",
    operation: "more",
    value: 25,
    requiresConditionAuthority: true,
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Fury_Program",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "분노 프로그램",
        detail: "해당 스킬로 소환한 소환체가 위중 상태 시 대미지 별도 +25%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Fury_Program",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Fury Program",
        detail: "+25% additional damage when a Minion summoned by this skill is at Low Life",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "program_spell",
    localSupportId: "supports-program-spell",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-max-spell-burst",
        operation: "add",
        value: 1,
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "minion-spell-damage",
        operation: "more",
        value: 5,
        skillDamageApplicability: "affects-dps",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Spell_Program",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "주술 프로그램",
        detail: "해당 스킬로 소환한 소환체의 최대 매직 버스트 +1, 주술 대미지 별도 +5%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Spell_Program",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Spell Program",
        detail: "+1 Max Spell Burst and +5% additional Spell Damage for Minions summoned by this skill",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "program_savage",
    localSupportId: "supports-program-savage",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-melee-damage",
        operation: "more",
        value: 10,
        skillTags: Object.freeze(["melee"]),
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "minion-melee-skill-area",
        operation: "increase",
        value: 30,
        skillTags: Object.freeze(["melee"]),
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Fearless_Program",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "맹렬 프로그램",
        detail: "해당 스킬로 소환한 소환체의 근접전 대미지 별도 +10%, 근접전 스킬 범위 +30%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Fearless_Program",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Fearless Program",
        detail: "+10% additional Melee Damage and +30% Melee Skill Area for Minions summoned by this skill",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_area",
    localSupportId: "supports-protocol-area",
    effects: Object.freeze([
      Object.freeze({ stat: "minion-area-damage", operation: "more", value: 10 }),
      Object.freeze({
        stat: "skill_area",
        operation: "increase",
        value: 60,
        scopeActor: "owner",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Area_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "범위 프로토콜",
        detail: "해당 스킬로 소환한 소환체의 범위 대미지 별도 +10%\n해당 스킬로 소환한 소환체는 자신과 아군의 스킬 범위 +60%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Area_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Area Protocol",
        detail: "+10% additional Area Damage for Minions summoned by this skill\nMinions summoned by this skill grant +60% Skill Area to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_resistance",
    localSupportId: "supports-protocol-resistance",
    effects: Object.freeze([
      Object.freeze({ stat: "minion-elemental-damage", operation: "more", value: 12 }),
      Object.freeze({
        stat: "elemental_resistance",
        operation: "increase",
        value: 10,
        scopeActor: "owner",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Resistance_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "저항 프로토콜",
        detail: "해당 스킬로 소환한 소환체의 원소 대미지 별도 +12%\n해당 스킬로 소환한 소환체는 자신과 아군의 원소 저항 +10%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Resistance_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Resistance Protocol",
        detail: "+12% additional Elemental Damage for Minions summoned by this skill\nMinions summoned by this skill grant +10% Elemental Resistance to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_ailment",
    localSupportId: "supports-protocol-ailment",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-damage",
        operation: "more",
        valueFormula: Object.freeze({
          kind: "enemy-ailment-count-multiplicative",
          inputPath: "enemy.ailmentCount",
          percentPerType: 3,
        }),
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "minion-grants-self-and-allies-ailment-damage",
        operation: "more",
        value: 12,
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Ailment_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "이상 프로토콜",
        detail: "해당 스킬로 소환한 소환체가 대미지를 입힐 때, 적이 보유한 상태 이상 1개당 대미지 별도 +3% (곱연산)\n해당 스킬로 소환한 소환체가 자신과 아군의 상태이상 대미지 별도 +12%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Ailment_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Ailment Protocol",
        detail: "When Minions summoned by this skill deal damage, +3% additional damage for every type of Ailment the enemy has (multiplies)\nMinions summoned by this skill grant +12% additional Ailment Damage to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_life",
    localSupportId: "supports-protocol-life",
    effects: Object.freeze([
      Object.freeze({
        stat: "max_life",
        operation: "more",
        value: 10,
        scopeActor: "owner",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Life_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "HP 프로토콜",
        detail: "해당 스킬로 소환한 소환체는 자신과 아군에게 최대 HP 추가 +10%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Life_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Life Protocol",
        detail: "Minions summoned by this skill grant +10% additional Max Life to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_energy_shield",
    localSupportId: "supports-protocol-energy-shield",
    effects: Object.freeze([
      Object.freeze({
        stat: "max_energy_shield",
        operation: "more",
        value: 10,
        scopeActor: "owner",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Energy_Shield_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "보호막 프로토콜",
        detail: "해당 스킬로 소환한 소환체는 자신과 아군에게 최대 보호막 추가 +10%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Energy_Shield_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Energy Shield Protocol",
        detail: "Minions summoned by this skill grant +10% additional Max Energy Shield to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_haste",
    localSupportId: "supports-protocol-haste",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-attack-speed",
        operation: "add",
        value: 20,
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "minion-cast-speed",
        operation: "add",
        value: 20,
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "minion-movement-speed",
        operation: "increase",
        value: 20,
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "movement_speed",
        operation: "increase",
        value: 20,
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Haste_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "가속 프로토콜",
        detail: "해당 스킬로 소환한 소환체 공격, 시전 및 이동 속도 +20%\n해당 스킬로 소환한 소환체는 자신과 아군의 이동 속도 +20%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Haste_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Haste Protocol",
        detail: "+20% Attack, Cast, and Movement Speed for Minions summoned by this skill\nMinions summoned by this skill grant +20% Movement Speed to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_projectile",
    localSupportId: "supports-protocol-projectile",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-projectile-quantity",
        operation: "add",
        value: 2,
      }),
      Object.freeze({
        stat: "minion-horizontal-projectile-piercing-counter",
        operation: "add",
        value: 2,
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "projectile_speed",
        operation: "increase",
        value: 45,
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Projectile_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "투사 프로토콜",
        detail: "해당 스킬로 소환한 소환체의 투사체 수량 +2, 수평 사격 투사체 관통 횟수 +2\n해당 스킬로 소환한 소환체는 자신과 아군의 투사체 속도 +45%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Projectile_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Projectile Protocol",
        detail: "+2 Projectile Quantity and +2 Horizontal Projectile piercing counter for Minions summoned by this skill\nMinions summoned by this skill grant +45% Projectile Speed to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_block",
    localSupportId: "supports-protocol-block",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-attack-block-chance",
        operation: "add",
        value: 100,
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion-spell-block-chance",
        operation: "add",
        value: 100,
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion-taunt-on-block",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Block_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "막기 프로토콜",
        detail: "해당 스킬로 소환한 소환체 공격과 주술 막기 확률 +100%, 막기 시 적을 조롱한다.",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Block_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Block Protocol",
        detail: "+100% Attack and Spell Block Chance for Minions summoned by this skill. Minions taunt enemies when blocking",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_knockback",
    localSupportId: "supports-protocol-knockback",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-knockback-chance",
        operation: "add",
        value: 100,
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion-paralysis-on-knockback",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Knockback_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "넉백 프로토콜",
        detail: "해당 스킬이 소환하는 소환체의 넉백 확률 +100%, 넉백 시 마비 를 부여한다.",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Knockback_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Knockback Protocol",
        detail: "+100% Knockback Chance for Minions summoned by this skill. Inflicts Paralysis when knocking back enemies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_armor_break",
    localSupportId: "supports-protocol-armor-break",
    stat: "minion-armor-damage-mitigation-penetration",
    operation: "add",
    value: 12,
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Armor_Break_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "방어 관통 프로토콜",
        detail: "해당 스킬로 소환한 소환체의 대미지 감소 수치의 관통 +12%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Armor_Break_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Armor Break Protocol",
        detail: "+12% Armor DMG Mitigation Penetration for Minions summoned by this skill",
      }),
    }),
  }),
  infiltrationProtocolProfile(
    "cold",
    "냉기",
    "해당 스킬로 소환한 소환체가 냉기 대미지 부여 시, 냉기 침투 를 부여한다.",
  ),
  infiltrationProtocolProfile(
    "fire",
    "화염",
    "해당 스킬로 소환한 소환체가 화염 대미지를 입힐 때, 화염 침투 를 부여한다.",
  ),
  infiltrationProtocolProfile(
    "lightning",
    "번개",
    "해당 스킬로 소환한 소환체가 번개 대미지를 입힐 때, 번개 침투 를 부여한다.",
  ),
  Object.freeze({
    sourceModuleOptionId: "protocol_erosion_aggravate",
    localSupportId: "supports-protocol-erosion-aggravate",
    stat: "minion-deterioration-chance",
    operation: "add",
    value: 30,
    unit: "percent",
    skillDamageApplicability: "configuration-only",
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Erosion_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "부식 프로토콜",
        detail: "해당 스킬로 소환한 소환체의 악화 확률 +30%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Erosion_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Erosion Protocol",
        detail: "+30% Deterioration Chance for Minions summoned by this skill",
      }),
    }),
  }),
  blessingPulseProfile("tenacity", "강건한", "Tenacity"),
  blessingPulseProfile("agility", "황홀한", "Agility"),
  blessingPulseProfile("focus", "집요한", "Focus"),
  Object.freeze({
    sourceModuleOptionId: "source_meltdown",
    localSupportId: "supports-source-meltdown",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion_kill_explosion_chance_percent",
        operation: "add",
        value: 20,
        unit: "percent",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion_kill_explosion_enemy_max_life_damage_percent",
        operation: "add",
        value: 250,
        unit: "percent",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion_kill_explosion_radius_meters",
        operation: "add",
        value: 6,
        unit: "meters",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Meltdown",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "소스 코드: 멜트다운",
        detail: "해당 스킬로 소환한 소환체 공격 또는 주술로 적 처치 시 20% 확률로 폭발하여 반경 6 미터 내의 적에게 처치된 적의 최대 HP 250%만큼 트루 대미지를 입힌다.",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Meltdown",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Source Code: Meltdown",
        detail: "Enemies have a 20% chance to explode when defeated by an Attack or Spell of a Minion summoned by this skill, dealing True Damage equal to 250% of their Max Life to enemies within a 6m radius",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "source_overclock",
    localSupportId: "supports-source-overclock",
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-cooldown-recovery-speed",
        operation: "more",
        value: 20,
        unit: "percent",
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "cooldown_recovery_speed",
        operation: "increase",
        value: 20,
        unit: "percent",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "injury_buffer",
        operation: "add",
        value: 20,
        unit: "percent",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Overclock_Composition",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "소스 코드: 오버 클로킹 구조",
        detail: "해당 스킬로 소환한 소환체 쿨타임 회복 속도 추가 +20%\n해당 스킬로 소환한 소환체가 자신과 아군의 쿨타임 회복 속도 +20%, 대미지 완화 +20%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Overclock_Composition",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Source Code: Overclock Composition",
        detail: "+20% additional Cooldown Recovery Speed for Minions summoned by this skill\nMinions summoned by this skill grant +20% Cooldown Recovery Speed and +20% Injury Buffer to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "source_breakpoint",
    localSupportId: "supports-source-breakpoint",
    stat: "self-and-allies-culling-life-threshold-percent",
    operation: "set",
    value: 18,
    unit: "percent",
    skillDamageApplicability: "configuration-only",
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Breakpoint",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "소스 코드: 브레이크포인트",
        detail: "해당 스킬로 소환한 소환체는 자신과 아군이 대미지를 입힐 때 HP가 18% 미만인 적을 도태시키게 한다.",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Breakpoint",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Source Code: Breakpoint",
        detail: "When you or allies deal damage through Minions summoned by this skill, eliminates enemies with less than 18% Life",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "source_dimension_reduction",
    localSupportId: "supports-source-dimension-reduction",
    effects: Object.freeze([
      Object.freeze({
        stat: "nearby-enemy-erosion-resistance",
        operation: "set",
        value: 10,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "nearby-enemy-erosion-resistance-radius-meters",
        operation: "set",
        value: 10,
        unit: "meters",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Dimensional_Collapse",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "소스 코드: 차원 강등",
        detail: "해당 스킬로 소환한 소환체는 주변 10미터 내에 있는 적의 부식 저항을 10(으)로 고정한다.",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Dimensional_Collapse",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Source Code: Dimensional Collapse",
        detail: "Minions summoned by this skill fix the Erosion Resistance of nearby enemies within 10m at 10",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_recovery",
    localSupportId: "supports-protocol-recovery",
    effects: Object.freeze([
      Object.freeze({
        stat: "life_regeneration",
        operation: "add",
        value: 3,
        unit: "percent_max_per_second",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion-life-regain",
        operation: "increase",
        value: 10,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion-shield-regain",
        operation: "increase",
        value: 10,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Restoration_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "회복 프로토콜",
        detail: "해당 스킬로 소환한 소환체 HP 반환 및 보호막 반환 +10%\n해당 스킬로 소환한 소환체는 자신과 아군에게 1초마다 3% HP 자연 회복 부여",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Restoration_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Restoration Protocol",
        detail: "+10% Life Regain and Shield Regain for Minions summoned by this skill\nMinions summoned by this skill grant 3% Life Regeneration to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_agility",
    localSupportId: "supports-protocol-agility",
    effects: Object.freeze([
      Object.freeze({
        stat: "attack_and_cast_speed",
        operation: "increase",
        value: 30,
        scopeActor: "owner",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Agile_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "날렵 프로토콜",
        detail: "해당 스킬로 소환한 소환체는 자신과 아군의 공격 및 시전 속도 +30%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Agile_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Agile Protocol",
        detail: "Minions summoned by this skill grant +30% Attack and Cast Speed to you and allies",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "protocol_elemental",
    localSupportId: "supports-protocol-elemental",
    effects: Object.freeze([
      Object.freeze({
        stat: "skill-physical-damage-as-selected-random-elemental",
        operation: "add",
        value: 5,
        valueFormula: Object.freeze({
          kind: "selected-random-elemental-damage-type",
          inputPath: "config.elementalProtocolDamageType",
        }),
        skillDamageApplicability: "affects-dps",
      }),
      Object.freeze({
        stat: "minion-elemental-ailment-chance",
        operation: "add",
        value: 100,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Elemental_Protocol",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "원소 프로토콜",
        detail: "해당 스킬로 소환한 소환체에 물리 대미지 5%에 해당하는 랜덤 원소 대미지가 추가되며, 원소 이상 확률 +100%",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Elemental_Protocol",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Elemental Protocol",
        detail: "Adds 5% of Physical Damage as random Elemental Damage and +100% Elemental Ailment Chance for Minions summoned by this skill",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "source_condensation",
    localSupportId: "supports-source-condensation",
    effects: Object.freeze([
      Object.freeze({
        stat: "maximum_frostbite_rating",
        operation: "add",
        value: 30,
        unit: "rating",
        scopeActor: "owner",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "minion-max-frostbite-rating-per-owner-rating",
        operation: "set",
        value: 1,
        unit: "rating-per-rating",
        skillDamageApplicability: "configuration-only",
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Condensation",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "소스 코드: 냉각",
        detail: "빙결 최대치 +1당, 해당 스킬로 소환한 소환체 빙결 최대치 +1\n해당 스킬로 소환한 소환체가 소환자에게 빙결 최대치 +30 부여",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Condensation",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Source Code: Condensation",
        detail: "For every +1 Max Frostbite Rating , +1 Max Frostbite Rating for Minions summoned by this skill\nMinions summoned by this skill grant +30 Max Frostbite Rating to the summoner",
      }),
    }),
  }),
  Object.freeze({
    sourceModuleOptionId: "source_surge",
    localSupportId: "supports-source-surge",
    requiresConditionAuthority: true,
    effects: Object.freeze([
      Object.freeze({
        stat: "minion-movement-speed",
        operation: "increase",
        value: 500,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }),
      Object.freeze({
        stat: "lightning_damage",
        operation: "more",
        value: 20,
        unit: "percent",
        scopeActor: "owner",
        skillTags: Object.freeze(["lightning"]),
        requiresConditionAuthority: true,
      }),
    ]),
    locale: Object.freeze({
      ko: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Power_Surge",
        sourcePageSha256: KO_PAGE_SHA256,
        name: "소스 코드: 서지",
        detail: "해당 스킬로 소환한 소환체 이동 속도 +500%\n해당 스킬로 소환한 소환체가 최근 10 미터 이상 이동했을 경우, 자신과 아군의 번개 대미지 별도 +20% 부여",
      }),
      en: Object.freeze({
        sourceRecordKey: "href:Source_Code%3A_Power_Surge",
        sourcePageSha256: EN_PAGE_SHA256,
        name: "Source Code: Power Surge",
        detail: "+500% Movement Speed for Minions summoned by this skill\n+20% additional Lightning Damage to you and allies if Minions summoned by this skill have recently moved more than 10m",
      }),
    }),
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_weapon_amp",
    sourceRecordKey: "href:Aura_Overwrite%3A_Weapon_Amplification",
    statKey: "weapon-amplification",
    koName: "오라 커버: 무기 증폭",
    koAuraName: "무기 증폭",
    enName: "Aura Overwrite: Weapon Amplification",
    enAuraName: "Weapon Amplification",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_flame_charge",
    sourceRecordKey: "href:Aura_Overwrite%3A_Charged_Flames",
    statKey: "charged-flames",
    koName: "오라 커버: 화염 충전",
    koAuraName: "화염 에너지 충전",
    enName: "Aura Overwrite: Charged Flames",
    enAuraName: "Charged Flames",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_electric_conversion",
    sourceRecordKey: "href:Aura_Overwrite%3A_Electric_Conversion",
    statKey: "electric-conversion",
    koName: "오라 커버: 전기 에너지 전환",
    koAuraName: "전기 에너지 전환",
    enName: "Aura Overwrite: Electric Conversion",
    enAuraName: "Electric Conversion",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_erosion_amp",
    sourceRecordKey: "href:Aura_Overwrite%3A_Erosion_Amplification",
    statKey: "erosion-amplification",
    koName: "오라 커버: 부식 증폭",
    koAuraName: "부식 증폭",
    enName: "Aura Overwrite: Erosion Amplification",
    enAuraName: "Erosion Amplification",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_cold_domain",
    sourceRecordKey: "href:Aura_Overwrite%3A_Frigid_Domain",
    statKey: "frigid-domain",
    koName: "오라 커버: 혹한지대",
    koAuraName: "혹한지대",
    enName: "Aura Overwrite: Frigid Domain",
    enAuraName: "Frigid Domain",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_tenacity",
    sourceRecordKey: "href:Aura_Overwrite%3A_Steadfast",
    statKey: "steadfast",
    koName: "오라 커버: 견고",
    koAuraName: "견고",
    enName: "Aura Overwrite: Steadfast",
    enAuraName: "Steadfast",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_agility",
    sourceRecordKey: "href:Aura_Overwrite%3A_Nimbleness",
    statKey: "nimbleness",
    koName: "오라 커버: 민첩",
    koAuraName: "민첩",
    enName: "Aura Overwrite: Nimbleness",
    enAuraName: "Nimbleness",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_energy_barrier",
    sourceRecordKey: "href:Aura_Overwrite%3A_Energy_Fortress",
    statKey: "energy-fortress",
    koName: "오라 커버: 에너지 장벽",
    koAuraName: "에너지 장벽",
    enName: "Aura Overwrite: Energy Fortress",
    enAuraName: "Energy Fortress",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_elemental_resistance",
    sourceRecordKey: "href:Aura_Overwrite%3A_Elemental_Resistance",
    statKey: "elemental-resistance",
    koName: "오라 커버: 원소 저항",
    koAuraName: "원소 저항",
    enName: "Aura Overwrite: Elemental Resistance",
    enAuraName: "Elemental Resistance",
  }),
  auraOverwriteProfile({
    sourceModuleOptionId: "aura_overwrite_haste",
    sourceRecordKey: "href:Aura_Overwrite%3A_Swiftness",
    statKey: "swiftness",
    koName: "오라 커버: 질주",
    koAuraName: "질주",
    enName: "Aura Overwrite: Swiftness",
    enAuraName: "Swiftness",
  }),
]);

const PROFILE_BY_LOCAL_SUPPORT_ID = new Map(
  TLIDB_MODULARIZATION_CALCULATION_PROFILES.map((profile) => (
    [profile.localSupportId, profile]
  )),
);

export function hasTlidbModularizationCalculationAuthority(localSupportId) {
  return PROFILE_BY_LOCAL_SUPPORT_ID.has(String(localSupportId ?? ""));
}

const PROFILE_BY_SOURCE_ID = new Map(
  TLIDB_MODULARIZATION_CALCULATION_PROFILES.map((profile) => (
    [profile.sourceModuleOptionId, profile]
  )),
);

function sameReceipt(receipt) {
  return JSON.stringify(receipt) === JSON.stringify(TOB91_MODULARIZATION_INTEROP_RECEIPT);
}

function localeEvidenceMatches(record, expected) {
  const status = record?.sourceFieldStatus;
  return record?.sourceMethod === "tlidb-hyperlink-href"
    && record?.sourceRecordKey === expected.sourceRecordKey
    && record?.sourcePageSha256 === expected.sourcePageSha256
    && record?.name === expected.name
    && record?.summary === expected.detail
    && record?.detail === expected.detail
    && record?.activeBaselineSeason === "SS13"
    && record?.sourceSeasonEvidence?.verificationComplete === true
    && status?.name === "exact"
    && status?.summary === "exact"
    && status?.detail === "exact";
}

function profileAuthority(profile, catalog) {
  const item = catalog.supports.find(({ id }) => id === profile.localSupportId);
  if (!item) return null;
  if (
    !localeEvidenceMatches(item.tlidbText?.ko, profile.locale.ko)
    || !localeEvidenceMatches(item.tlidbText?.en, profile.locale.en)
  ) return null;
  const conditionAuthority = getSupportConditionAuthority(item);
  if (profile.requiresConditionAuthority && conditionAuthority.status !== "verified") return null;
  return {
    item,
    conditionRequirements: profile.requiresConditionAuthority
      ? conditionAuthority.rule.conditionRequirements
      : Object.freeze([]),
  };
}

function freezeResult(effects, blockers, accounting) {
  return Object.freeze({
    effects: Object.freeze(effects.map((effect) => Object.freeze({ ...effect }))),
    blockers: Object.freeze(blockers.map((blocker) => Object.freeze({ ...blocker }))),
    accounting: Object.freeze({ ...accounting }),
  });
}

function selectedIds(config) {
  return Array.isArray(config?.moduleOptionIds) ? config.moduleOptionIds : [];
}

function resolveProfileEffectValue(profileEffect, input) {
  if (!profileEffect.valueFormula) {
    return { stat: profileEffect.stat, value: profileEffect.value };
  }
  if (profileEffect.valueFormula.kind === "enemy-ailment-count-multiplicative") {
    const ailmentCount = resolveConditionValues(input.conditions).enemy?.ailmentCount;
    if (!Number.isInteger(ailmentCount) || ailmentCount < 0) {
      return {
        blocker: "modularization-option-input-required",
        inputPath: profileEffect.valueFormula.inputPath,
      };
    }
    const multiplier = (1 + profileEffect.valueFormula.percentPerType / 100) ** ailmentCount;
    return {
      stat: profileEffect.stat,
      value: Math.round((multiplier - 1) * 100 * 1e12) / 1e12,
    };
  }
  if (profileEffect.valueFormula.kind === "selected-random-elemental-damage-type") {
    const damageType = input.config?.elementalProtocolDamageType;
    if (!["fire", "cold", "lightning"].includes(damageType)) {
      return {
        blocker: "modularization-option-input-required",
        inputPath: profileEffect.valueFormula.inputPath,
      };
    }
    return {
      stat: `skill-physical-damage-as-${damageType}`,
      value: profileEffect.value,
    };
  }
  return { blocker: "modularization-option-value-formula-unavailable" };
}

export function projectTlidbModularizationCalculation(input = {}, authorityInput = {}) {
  const receipt = authorityInput.receipt ?? TOB91_MODULARIZATION_INTEROP_RECEIPT;
  const catalog = authorityInput.catalog ?? CATALOG;
  const optionIds = selectedIds(input.config);
  const emptyAccounting = {
    selectedOptionCount: optionIds.length,
    readyOptionCount: 0,
    activeEffectCount: 0,
    inactiveEffectCount: 0,
    blockerCount: 0,
    authorityCurrent: sameReceipt(receipt),
  };

  if (!sameReceipt(receipt)) {
    const blockers = [{
      reason: "modularization-calculation-authority-unavailable",
      affectsCompletion: true,
    }];
    return freezeResult([], blockers, { ...emptyAccounting, blockerCount: blockers.length });
  }
  if (!input.config) return freezeResult([], [], emptyAccounting);

  const skillMapping = receipt.skills.find(({ localMainSkillId }) => (
    localMainSkillId === input.skillId
  ));
  const uniqueOptionIds = new Set(optionIds);
  const validOptions = optionIds.every((sourceModuleOptionId) => receipt.options.some((option) => (
    option.sourceModuleOptionId === sourceModuleOptionId
  )));
  if (
    !skillMapping
    || input.config.modularizationSkillId !== skillMapping.sourceModularizationSkillId
    || optionIds.length > receipt.moduleOptionLimit
    || uniqueOptionIds.size !== optionIds.length
    || !validOptions
  ) {
    const blockers = [{
      reason: "modularization-calculation-config-invalid",
      sourceId: input.skillId ?? null,
      affectsCompletion: true,
    }];
    return freezeResult([], blockers, { ...emptyAccounting, blockerCount: blockers.length });
  }

  const effects = [];
  const blockers = [];
  let activeEffectCount = 0;
  let inactiveEffectCount = 0;
  let readyOptionCount = 0;

  for (const sourceModuleOptionId of optionIds) {
    const mapping = receipt.options.find((option) => (
      option.sourceModuleOptionId === sourceModuleOptionId
    ));
    const profile = PROFILE_BY_SOURCE_ID.get(sourceModuleOptionId);
    const authority = profile ? profileAuthority(profile, catalog) : null;
    if (!profile || !authority || mapping.localSupportId !== profile.localSupportId) {
      blockers.push({
        reason: profile
          ? "modularization-option-authority-unavailable"
          : "modularization-option-calculation-unavailable",
        sourceId: mapping.localSupportId,
        sourceModuleOptionId,
        affectsCompletion: true,
      });
      continue;
    }

    const { item, conditionRequirements } = authority;
    const profileEffects = Array.isArray(profile.effects) ? profile.effects : [profile];
    readyOptionCount += 1;
    for (const profileEffect of profileEffects) {
      const valueResolution = resolveProfileEffectValue(profileEffect, input);
      if (valueResolution.blocker) {
        blockers.push({
          reason: valueResolution.blocker,
          sourceId: item.id,
          sourceModuleOptionId,
          inputPath: valueResolution.inputPath ?? null,
          skillDamageApplicability: profileEffect.skillDamageApplicability ?? "affects-dps",
          sourceText: item.tlidbText.ko.detail,
          affectsCompletion: true,
        });
        continue;
      }
      const effectConditionRequirements = (
        profileEffect.requiresConditionAuthority
        || (!Array.isArray(profile.effects) && profile.requiresConditionAuthority)
      ) ? conditionRequirements : [];
      const diagnosis = diagnoseConditions(input.conditions, effectConditionRequirements);
      const active = effectConditionRequirements.length === 0 || diagnosis.unmet.length === 0;
      if (active) activeEffectCount += 1;
      else inactiveEffectCount += 1;
      effects.push({
        sourceId: item.id,
        sourceKind: "modularization-option",
        sourceUrl: item.tlidbText.ko.sourceUrl,
        sourceRecordKey: item.tlidbText.ko.sourceRecordKey,
        sourcePageSha256: item.tlidbText.ko.sourcePageSha256,
        sourceText: item.tlidbText.ko.detail,
        stat: valueResolution.stat,
        operation: profileEffect.operation,
        value: valueResolution.value,
        ...(profileEffect.unit ? { unit: profileEffect.unit } : {}),
        active,
        skillDamageApplicability: profileEffect.skillDamageApplicability ?? "affects-dps",
        scope: Object.freeze({
          actor: profileEffect.scopeActor ?? "minion",
          skillTypes: Object.freeze(profileEffect.skillTypes ?? ["all"]),
          skillTags: Object.freeze(profileEffect.skillTags ?? []),
        }),
        conditionRequirements: effectConditionRequirements,
        sourceModuleOptionId,
      });
    }
    for (const clause of profile.unsupportedClauses ?? []) {
      blockers.push({
        reason: "modularization-option-clause-calculation-unavailable",
        sourceId: item.id,
        sourceModuleOptionId,
        unsupportedClause: clause.id,
        skillDamageApplicability: clause.skillDamageApplicability,
        sourceText: item.tlidbText.ko.detail,
        affectsCompletion: true,
      });
    }
  }

  return freezeResult(effects, blockers, {
    ...emptyAccounting,
    readyOptionCount,
    activeEffectCount,
    inactiveEffectCount,
    blockerCount: blockers.length,
  });
}

export function projectTlidbBuildModularizationCalculation(rows = [], authorityInput = {}) {
  const projectedRows = (Array.isArray(rows) ? rows : []).map((row, rowIndex) => Object.freeze({
    rowIndex: row?.rowIndex ?? rowIndex,
    projection: projectTlidbModularizationCalculation(row, authorityInput),
  }));
  const ownerEffects = [];
  const ownerBlockers = [];
  const ownerEffectsByOption = new Map();
  for (const { rowIndex, projection } of projectedRows) {
    for (const effect of projection.effects.filter(({ scope }) => scope?.actor === "owner")) {
      const entries = ownerEffectsByOption.get(effect.sourceModuleOptionId) ?? [];
      entries.push({ rowIndex, effect });
      ownerEffectsByOption.set(effect.sourceModuleOptionId, entries);
    }
  }
  for (const [sourceModuleOptionId, entries] of ownerEffectsByOption) {
    const rowIndexes = new Set(entries.map(({ rowIndex }) => rowIndex));
    if (rowIndexes.size === 1) {
      ownerEffects.push(...entries.map(({ effect }) => effect));
      continue;
    }
    const [{ effect }] = entries;
    ownerBlockers.push({
      reason: "modularization-owner-effect-stacking-unverified",
      sourceId: effect.sourceId,
      sourceModuleOptionId,
      sourceText: effect.sourceText,
      sourceUrl: effect.sourceUrl,
      stat: effect.stat,
      operation: effect.operation,
      scope: effect.scope,
      skillDamageApplicability: effect.skillDamageApplicability,
      affectsCompletion: true,
    });
  }
  return Object.freeze({
    rows: Object.freeze(projectedRows),
    owner: Object.freeze({
      effects: Object.freeze(ownerEffects),
      blockers: Object.freeze(ownerBlockers),
    }),
  });
}
