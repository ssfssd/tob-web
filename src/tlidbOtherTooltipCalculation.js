const EXACT_DETAIL_STATUSES = new Set(["exact", "exact-structural"]);
const LOCALE_ORDER = Object.freeze(["ko", "en", "cn"]);

export const TLIDB_OTHER_TOOLTIP_CATEGORIES = Object.freeze([
  "hero",
  "heroMemory",
  "talents",
  "spirits",
  "slates",
  "destiny",
]);

const TARGET_CATEGORIES = new Set(TLIDB_OTHER_TOOLTIP_CATEGORIES);
const RANGE_PATTERN = /[+−-]?\d+(?:\.\d+)?\s*[–—~～〜]\s*[+−-]?\d+(?:\.\d+)?/u;
const NUMBER_PATTERN = /[+−-]?\d+(?:\.\d+)?/gu;
const SIGNED_SCALAR_SOURCE = String.raw`[+−-]\s*\d+(?:\.\d+)?`;
const RANGE_SEPARATOR_SOURCE = String.raw`[–—~～〜]`;
const BARE_RANGE_SOURCE = String.raw`[+−-]?\d+(?:\.\d+)?\s*${RANGE_SEPARATOR_SOURCE}\s*[+−-]?\d+(?:\.\d+)?`;
const DIRECT_VALUE_SOURCE = String.raw`(?:[+−-]?\s*\(\s*[+−-]?\d+(?:\.\d+)?\s*${RANGE_SEPARATOR_SOURCE}\s*[+−-]?\d+(?:\.\d+)?\s*\)|${BARE_RANGE_SOURCE}|${SIGNED_SCALAR_SOURCE})`;

const STAT_RULE_DEFINITIONS = Object.freeze([
  ["minionMaxLife", ["소환체 최대 HP", "소환체의 최대 HP", "Minion Max Life", "召唤物最大生命"]],
  ["maxLife", ["최대 HP", "HP", "Maximum Life", "Max Life", "最大生命"]],
  ["maxMana", ["최대 MP", "MP", "Maximum Mana", "Max Mana", "最大魔力"]],
  ["maxShield", ["최대 보호막", "보호막", "Maximum Energy Shield", "Max Energy Shield", "最大护盾"]],
  ["allAttributes", ["모든 속성", "All Attributes", "全属性"]],
  ["strength", ["힘", "Strength", "力量"]],
  ["dexterity", ["민첩", "Dexterity", "敏捷"]],
  ["intelligence", ["지혜", "Intelligence", "智慧"]],
  ["armorPenetration", ["소환체의 아머 대미지 감소 관통", "아머 대미지 감소 관통", "대미지 감소 수치의 관통", "Armor Penetration", "护甲减伤穿透"]],
  ["armor", ["아머 수치", "아머", "Armor", "护甲"]],
  ["evasion", ["회피 수치", "Evasion", "闪避"]],
  ["defense", ["방어 수치", "Defense", "防御"]],
  ["barrierRatio", ["장벽 방어막 비율", "Barrier Shield Ratio"]],
  ["attackBlockChance", ["공격 막기 확률", "Attack Block Chance", "攻击格挡率"]],
  ["spellBlockChance", ["주술 막기 확률", "Spell Block Chance", "法术格挡率"]],
  ["blockRatio", ["막기 비율", "Block Ratio"]],
  ["maxFireResistance", ["화염 최대 저항", "최대 화염 저항", "Maximum Fire Resistance", "火焰抗性上限"]],
  ["maxColdResistance", ["냉기 최대 저항", "최대 냉기 저항", "Maximum Cold Resistance", "冰冷抗性上限"]],
  ["maxLightningResistance", ["번개 최대 저항", "최대 번개 저항", "Maximum Lightning Resistance", "闪电抗性上限"]],
  ["maxErosionResistance", ["부식 최대 저항", "최대 부식 저항", "Maximum Erosion Resistance", "腐蚀抗性上限"]],
  ["maxElementalResistance", ["원소 저항 최대치", "최대 원소 저항", "Max Elemental Resistance"]],
  ["maximumFrostbiteRating", ["최대 빙결", "Maximum Frostbite Rating"]],
  ["elementalAndErosionResistancePenetration", ["원소와 부식 저항 관통", "Elemental and Erosion Resistance Penetration"]],
  ["elementalResistancePenetration", ["원소 저항 관통", "Elemental Resistance Penetration", "元素抗性穿透"]],
  ["fireResistancePenetration", ["Fire Resistance Penetration", "火焰抗性穿透"]],
  ["coldResistancePenetration", ["Cold Resistance Penetration", "冰冷抗性穿透"]],
  ["lightningResistancePenetration", ["Lightning Resistance Penetration", "闪电抗性穿透"]],
  ["erosionResistancePenetration", ["부식 저항 관통", "Erosion Resistance Penetration", "腐蚀抗性穿透"]],
  ["elementalResistance", ["원소 저항", "Elemental Resistance", "元素抗性"]],
  ["fireResistance", ["화염 저항", "Fire Resistance", "火焰抗性"]],
  ["coldResistance", ["냉기 저항", "Cold Resistance", "冰冷抗性"]],
  ["lightningResistance", ["번개 저항", "Lightning Resistance", "闪电抗性"]],
  ["erosionResistance", ["부식 저항", "Erosion Resistance", "腐蚀抗性"]],
  ["minionCriticalDamage", ["소환체 크리티컬 대미지", "Minion Critical Strike Damage", "召唤物暴击伤害"]],
  ["projectileCriticalRating", ["투사체 스킬 공격 크리티컬", "투사체 크리티컬", "Projectile Critical Rating"]],
  ["minionCriticalRating", ["소환체 크리티컬 수치", "소환체의 크리티컬", "Minion Critical Rating", "召唤物暴击值"]],
  ["attackCriticalRating", ["공격 크리티컬 수치", "Attack Critical Rating", "攻击暴击值"]],
  ["spellCriticalRating", ["주술 크리티컬 수치", "Spell Critical Rating", "法术暴击值"]],
  ["criticalDamage", ["크리티컬 대미지", "Critical Strike Damage", "暴击伤害"]],
  ["criticalDamageReduction", ["크리티컬 대미지 감면", "Critical Strike Damage Reduction"]],
  ["criticalRating", ["크리티컬 수치", "크리티컬", "Critical Rating", "暴击值"]],
  ["minionAttackAndCastSpeed", ["소환체 공격 및 시전 속도", "소환체의 공격 및 시전 속도", "Minion Attack and Cast Speed", "召唤物攻击与施法速度"]],
  ["attackAndCastSpeed", ["공격 및 시전 속도", "Attack and Cast Speed", "攻击与施法速度"]],
  ["attackSpeed", ["공격 속도", "Attack Speed", "攻击速度"]],
  ["castSpeed", ["시전 속도", "Cast Speed", "施法速度"]],
  ["movementSpeed", ["이동 속도", "Movement Speed", "移动速度"]],
  ["projectileSpeed", ["보초병 투사체 속도", "투사체 속도", "Projectile Speed", "投射物速度"]],
  ["spiritMagusCooldownRecoverySpeed", ["마령의 궁극 스킬 쿨타임 회복 속도", "마령의 쿨타임 회복 속도", "Spirit Magus Cooldown Recovery Speed"]],
  ["cooldownRecoverySpeed", ["함성 스킬 쿨타임 회복 속도", "쿨타임 회복 속도", "Cooldown Recovery Speed", "冷却回复速度"]],
  ["shieldRechargeSpeed", ["보호막 에너지 충전 속도", "보호막 충전 속도", "Energy Shield Charge Speed", "护盾充能速度"]],
  ["additionalEnergyShieldChargeInterval", ["보호막 에너지 충전 간격", "Additional Energy Shield Charge Interval"]],
  ["lifeRegainInterval", ["HP 반환 간격", "Life Regain Interval", "生命返还间隔"]],
  ["shieldRegainInterval", ["보호막 반환 간격", "Energy Shield Regain Interval", "护盾返还间隔"]],
  ["regainInterval", ["반환 간격", "Regain Interval", "返还间隔"]],
  ["lifeRegenerationRate", ["소환체의 HP 자연 회복 속도", "HP 자연 회복 속도", "Life Regeneration Rate", "生命自然回复速度"]],
  ["manaRegenerationRate", ["MP 자연 회복 속도", "Mana Regeneration Rate", "魔力自然回复速度"]],
  ["harvestRecoverySpeed", ["수확 회복 속도", "Reaping Recovery Speed"]],
  ["bondGainSpeed", ["유대 획득 속도", "Bond Gain Speed"]],
  ["infusionSpeed", ["주입 속도", "Infusion Speed"]],
  ["sentryCastFrequency", ["보초병 스킬 시전 빈도", "Sentry Skill Cast Frequency"]],
  ["magicBurstChargeSpeed", ["매직 버스트 충전 속도", "Magic Burst Charge Speed"]],
  ["minionUltimateSkillDamage", ["마령의 궁극 스킬 대미지 및 궁극 스킬 로 부여하는 상태이상 대미지", "Minion Ultimate Skill Damage"]],
  ["attackAndSpellFireDamage", ["공격 및 주술에 화염 대미지", "Fire Damage to Attacks and Spells"]],
  ["attackAndSpellColdDamage", ["공격 및 주술에 냉기 대미지", "Cold Damage to Attacks and Spells"]],
  ["attackAndSpellLightningDamage", ["공격 및 주술에 번개 대미지", "Lightning Damage to Attacks and Spells"]],
  ["selfAndMinionAttackAndSpellPhysicalDamage", ["자신과 소환체의 공격 및 주술에 물리 대미지"]],
  ["selfAndMinionAttackAndSpellFireDamage", ["자신과 소환체의 공격 및 주술에 화염 대미지"]],
  ["selfAndMinionAttackAndSpellColdDamage", ["자신과 소환체의 공격 및 주술에 냉기 대미지"]],
  ["selfAndMinionAttackAndSpellLightningDamage", ["자신과 소환체의 공격 및 주술에 번개 대미지"]],
  ["selfAndMinionAttackAndSpellErosionDamage", ["자신과 소환체의 공격 및 주술에 부식 대미지"]],
  ["minionFireDamage", ["소환체의 화염 대미지", "소환체 화염 대미지", "Minion Fire Damage", "召唤物火焰伤害"]],
  ["minionColdDamage", ["소환체의 냉기 대미지", "소환체 냉기 대미지", "Minion Cold Damage", "召唤物冰冷伤害"]],
  ["minionLightningDamage", ["소환체 번개 대미지", "Minion Lightning Damage", "召唤物闪电伤害"]],
  ["minionErosionDamage", ["소환체의 부식 대미지", "소환체 부식 대미지", "Minion Erosion Damage", "召唤物腐蚀伤害"]],
  ["minionPhysicalDamage", ["소환체의 물리 대미지", "소환체 물리 대미지", "Minion Physical Damage", "召唤物物理伤害"]],
  ["minionDamage", ["유대 보유 시 소환체 대미지", "최근 소환된 소환체의 대미지", "소환체 대미지", "마령 스킬 대미지", "Minion Damage", "召唤物伤害"]],
  ["damageTaken", ["받는 물리 대미지", "받는 대미지", "Damage Taken", "受到伤害"]],
  ["criticalDamageTaken", ["Critical Damage Taken"]],
  ["fireDamage", ["화염 지속 대미지", "화염 대미지", "Fire Damage", "火焰伤害"]],
  ["coldDamage", ["냉기 대미지", "Cold Damage", "冰冷伤害"]],
  ["lightningDamage", ["번개 대미지", "Lightning Damage", "闪电伤害"]],
  ["erosionDamage", ["부식 대미지", "Erosion Damage", "腐蚀伤害"]],
  ["physicalDamage", ["물리 대미지", "Physical Damage", "物理伤害"]],
  ["elementalDamage", ["원소 대미지", "Elemental Damage", "元素伤害"]],
  ["persistentDamage", ["지속 대미지", "Persistent Damage", "持续伤害"]],
  ["ailmentDamage", ["상태이상 대미지", "Ailment Damage", "异常伤害"]],
  ["attackDamage", ["공격 대미지", "Attack Damage", "攻击伤害"]],
  ["spellDamage", ["주술 대미지", "Spell Damage", "法术伤害"]],
  ["projectileDamage", ["투사체 대미지", "Projectile Damage", "投射物伤害"]],
  ["sentryDamage", ["보초병 대미지", "Sentry Damage"]],
  ["channelingDamage", ["채널링 스킬 대미지", "채널링 대미지", "Channeling Damage"]],
  ["meleeDamage", ["근접 대미지", "Melee Damage", "近战伤害"]],
  ["areaDamage", ["범위 대미지", "Area Damage", "范围伤害"]],
  ["groundDamage", ["지면 대미지", "Ground Damage"]],
  ["damage", ["최대 대미지", "적중 대미지", "무기 대미지", "대미지", "Damage", "伤害"]],
  ["damageReduction", ["대미지 완화", "Damage Mitigation", "伤害减免"]],
  ["terraSkillDuration", ["지면 스킬 지속 시간", "Terra Skill Duration", "地面技能持续时间"]],
  ["terraSkillArea", ["지면 스킬 범위", "Terra Skill Area", "地面技能范围"]],
  ["terraChargeRecoverySpeed", ["지면 에너지 회복 속도", "Terra Charge Recovery Speed", "地面蓄能 回复速度"]],
  ["skillArea", ["보초병 스킬 범위", "소환체 스킬 범위", "저주 스킬 범위", "함성 스킬 범위", "공격 스킬 범위", "스킬 범위", "Skill Area", "技能范围"]],
  ["skillEffectDuration", ["스킬 효과 지속 시간", "Skill Effect Duration", "技能效果持续时间"]],
  ["tenacityBlessingDuration", ["강건한 축복 지속 시간", "Tenacity Blessing Duration"]],
  ["agilityBlessingDuration", ["황홀한 축복 지속 시간", "Agility Blessing Duration"]],
  ["focusBlessingDuration", ["집요한 축복 지속 시간", "Focus Blessing Duration"]],
  ["maxTenacityBlessingStacks", ["강건한 축복 최대 중첩 수", "Max Tenacity Blessing Stacks"]],
  ["maxAgilityBlessingStacks", ["황홀한 축복 최대 중첩 수", "Max Agility Blessing Stacks"]],
  ["maxFocusBlessingStacks", ["집요한 축복 최대 중첩 수", "Max Focus Blessing Stacks"]],
  ["maxDeflectionStacks", ["편향 최대 중첩", "Max Deflection Stacks"]],
  ["maxBondStacks", ["유대 최대 중첩 수", "Max Bond Stacks"]],
  ["maxChannelingStacks", ["채널링 중첩 상한", "추가 최대 채널링 중첩수", "Max Channeling Stacks"]],
  ["minimumChannelingStacks", ["채널링 최소 중첩 수", "Minimum Channeling Stacks"]],
  ["harvestDuration", ["수확 시간", "Reaping Duration"]],
  ["sentryDuration", ["보초병 지속 시간", "Sentry Duration"]],
  ["projectileCount", ["투사체 수량", "Projectile Quantity", "投射物数量"]],
  ["maxProjectileCount", ["투사체 최대 수량", "Max Projectile Quantity"]],
  ["horizontalProjectilePenetrationCount", ["수평 투사체 관통 횟수", "Horizontal Projectile Penetrations"]],
  ["maxSentryCount", ["보초병 최대 수량", "한 번에 배치할 수 있는 보초병 수", "Max Sentry Quantity"]],
  ["maxSpiritMagusCount", ["마령 최대 수량", "Max Spirit Magus Quantity"]],
  ["skillCost", ["공격 스킬 소모", "스킬 소모", "Skill Cost", "技能消耗"]],
  ["physicalSkillLevel", ["물리 스킬 레벨", "Physical Skill Level"]],
  ["minionSummonSkillLevel", ["소환체 소환 스킬 레벨", "Minion Summon Skill Level"]],
  ["spiritMagusSkillLevel", ["마령 스킬 레벨", "Spirit Magus Skill Level"]],
  ["supportSkillLevel", ["보조 스킬 레벨", "Support Skill Level"]],
  ["passiveSkillLevel", ["패시브 스킬 레벨", "Passive Skill Level"]],
  ["auraEffect", ["오라 효과", "Aura Effect", "光环效果"]],
  ["receivedCurseEffect", ["받는 저주 효과", "Received Curse Effect", "Curse Effect against you"]],
  ["curseEffect", ["저주 효과", "Curse Effect", "诅咒效果"]],
  ["deepeningEffect", ["심화 효과", "Deepening Effect"]],
  ["wanderEffect", ["방황 효과", "Wander Effect"]],
  ["fightingWillEffect", ["전의 효과", "Fervor Effect"]],
  ["orderEffect", ["질서 효과", "Order Effect"]],
  ["chaosEffect", ["혼란 효과", "Chaos Effect"]],
  ["commandPerSecond", ["통솔 초당", "Command per second"]],
  ["spiritMagusInitialGrowth", ["마령의 최초 성장치", "initial Growth for Spirit Magi"]],
  ["spiritMagusCoreEffect", [
    "마령의 근원 효과",
    "Spirit Magus Source Effect",
    "Origin of Spirit Magus Effect",
  ]],
  ["elixirSkillEffect", ["영약 스킬 효과", "Elixir Skill Effect"]],
  ["receivedNumbedEffect", ["받는 마취 효과", "Received Numbed Effect", "Numbed Effect received"]],
  ["receivedSlowEffect", ["받는 감속 효과", "Received Slow Effect", "Slow Effect received"]],
  ["receivedParalysisEffect", ["받는 마비 효과", "Received Paralysis Effect", "Paralysis Effect received"]],
  ["receivedWeakenEffect", ["받는 약화 효과", "Received Weaken Effect", "Weaken Effect received"]],
  ["paralysisEffect", ["마취 효과", "Paralysis Effect"]],
  ["freezeEffect", ["빙결 효과", "Freeze Effect"]],
  ["aggravationChance", ["악화 확률", "Aggravation Chance"]],
  ["traumaChance", ["외상 확률", "Trauma Chance"]],
  ["igniteChance", ["점화 확률", "Ignite Chance"]],
  ["wiltChance", ["몰락 확률", "Wilt Chance"]],
  ["ailmentApplyChance", ["상태이상 확률", "Ailment Chance"]],
  ["lifeReturn", ["HP 반환", "Life Return"]],
  ["shieldReturn", ["보호막 반환", "Energy Shield Return"]],
  ["manaSealedCompensation", ["MP 봉인 보상", "Mana Seal Compensation"]],
  ["afflictionInflictedPerSecond", ["초당 시전 심화 수치"]],
  ["leadershipPerSecond", ["Leadership Per Second"]],
  ["fightingWill", ["전의", "Fervor Rating"]],
  ["order", ["질서", "Order"]],
  ["dropQuantity", ["엠버 드롭 수량", "나침반 드롭 수량", "장비 드롭 수량", "신력 휘석 드롭 수량", "최초의 불꽃 재료 드롭 수량", "드롭 수량", "Drop Quantity", "掉落数量"]],
]);

const POINT_PERCENT_STATS = new Set([
  "attackBlockChance",
  "spellBlockChance",
  "blockRatio",
  "criticalRating",
  "attackCriticalRating",
  "spellCriticalRating",
  "minionCriticalRating",
  "projectileCriticalRating",
  "elementalResistance",
  "fireResistance",
  "coldResistance",
  "lightningResistance",
  "erosionResistance",
  "maxFireResistance",
  "maxColdResistance",
  "maxLightningResistance",
  "maxErosionResistance",
  "maxElementalResistance",
  "elementalAndErosionResistancePenetration",
  "elementalResistancePenetration",
  "fireResistancePenetration",
  "coldResistancePenetration",
  "lightningResistancePenetration",
  "erosionResistancePenetration",
  "receivedCurseEffect",
  "receivedNumbedEffect",
  "receivedSlowEffect",
  "receivedParalysisEffect",
  "receivedWeakenEffect",
  "aggravationChance",
  "traumaChance",
  "igniteChance",
  "wiltChance",
  "ailmentApplyChance",
]);

export const TLIDB_OTHER_TOOLTIP_KOREAN_SOURCE_ALIASES = Object.freeze(
  STAT_RULE_DEFINITIONS
    .flatMap(([, labels]) => labels)
    .filter((label) => /[가-힣]/u.test(label)),
);

const STAT_BY_LABEL = new Map();
for (const [stat, labels] of STAT_RULE_DEFINITIONS) {
  for (const label of labels) STAT_BY_LABEL.set(label.toLocaleLowerCase("en-US"), stat);
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&").replace(/\s+/gu, "\\s*");
}

const LABEL_PATTERN = [...STAT_BY_LABEL.keys()]
  .sort((left, right) => right.length - left.length)
  .map(escapePattern)
  .join("|");

const LABEL_FIRST_SIGNED = new RegExp(
  `(?<label>${LABEL_PATTERN})(?:\\s*(?<before>추가|별도|증가|감소|additional|more|increased|reduced|额外|增加|降低))?\\s*(?<value>${DIRECT_VALUE_SOURCE})\\s*(?<percent>%)?(?:\\s*(?<flatUnit>포인트|개|회|레벨))?(?:\\s*(?<after>추가(?:된다)?|별도|증가|감소|additional|more|increased|reduced|额外|增加|降低))?`,
  "giu",
);
const LABEL_FIRST_UNSIGNED_OPERATION = new RegExp(
  `(?<label>${LABEL_PATTERN})(?:이|가)?\\s*(?<value>\\d+(?:\\.\\d+)?)\\s*(?:(?<percent>%)|(?<flatUnit>포인트|개|회|레벨))?\\s*(?<after>추가(?:된다)?|별도(?:다)?|증가(?:한다)?|감소(?:한다)?|additional|more|increased|reduced|额外|增加|降低)`,
  "giu",
);
const LABEL_FIRST_UNSIGNED_CONDITIONAL = new RegExp(
  `(?<label>${LABEL_PATTERN})(?:이|가)?\\s*(?<value>\\d+(?:\\.\\d+)?)\\s*(?:(?<percent>%)|(?<flatUnit>포인트|개|회|레벨))`,
  "giu",
);
const LABEL_SET_VALUE = new RegExp(
  `(?<label>${LABEL_PATTERN})(?:은|는|이|가|을|를)?\\s*(?<value>[+−-]?\\s*\\d+(?:\\.\\d+)?)\\s*(?<percent>%)?(?:\\s*(?:로|으로))?\\s*(?<after>설정|고정(?:된다)?|고정 보유|이다|다)`,
  "giu",
);
const VALUE_FIRST_SIGNED = new RegExp(
  `(?<value>${DIRECT_VALUE_SOURCE})\\s*(?<percent>%)?\\s*(?<label>${LABEL_PATTERN})`,
  "giu",
);

const STRUCTURAL_LINE_PATTERNS = Object.freeze([
  /^정령 개요$/u,
  /^(?:공격|생존|수집) 강화$/u,
  /^승급 보상$/u,
  /^드롭 수량 (?:증가|\+%)$/u,
  /^계약 점수 \d+ 필요$/u,
  /^장착 후 (?:하위|중위) 재능 포인트를 \d+개 바꾼다[.]?$/u,
  /^제거 시 추가 아이템을 소모해야 한다[.]?$/u,
  /^장착 완료:$/u,
  /^\d+\/\d+$/u,
]);

const ACTIVATION_HEADER_PATTERN = /^(?:계약 보드에 해당 천명이|해당 천명이 계약 보드에)\s*\d+개(?:가| 있는| 있을| 있으면)[^:。.]*?(?:활성화|효과)[^:。.]*[:.]?$/u;

function freezeResult(effects, blockers) {
  return Object.freeze({
    effects: Object.freeze(effects.map((effect) => Object.freeze({
      ...effect,
      ...(effect.roll ? { roll: Object.freeze({ ...effect.roll }) } : {}),
      ...(effect.condition && typeof effect.condition === "object"
        ? { condition: Object.freeze({ ...effect.condition }) }
        : {}),
      ...(effect.conditionMetadata ? { conditionMetadata: Object.freeze({
        ...effect.conditionMetadata,
        ...(effect.conditionMetadata.perTrigger
          ? { perTrigger: Object.freeze({ ...effect.conditionMetadata.perTrigger }) }
          : {}),
        ...(effect.conditionMetadata.threshold
          ? { threshold: Object.freeze({ ...effect.conditionMetadata.threshold }) }
          : {}),
        ...(effect.conditionMetadata.cap ? { cap: Object.freeze({ ...effect.conditionMetadata.cap }) } : {}),
      }) } : {}),
      ...(effect.conditionRequirements ? { conditionRequirements: Object.freeze(
        effect.conditionRequirements.map((requirement) => Object.freeze({ ...requirement })),
      ) } : {}),
      ...(effect.equipmentRequirements ? { equipmentRequirements: Object.freeze({
        ...effect.equipmentRequirements,
        ...(Array.isArray(effect.equipmentRequirements.weaponTags)
          ? { weaponTags: Object.freeze([...effect.equipmentRequirements.weaponTags]) }
          : {}),
      }) } : {}),
      ...(effect.per ? { per: Object.freeze({ ...effect.per }) } : {}),
    }))),
    blockers: Object.freeze(blockers.map((blocker) => Object.freeze({ ...blocker }))),
  });
}

function sourceTextForBlocker(item) {
  for (const localeKey of LOCALE_ORDER) {
    const detail = item?.tlidbText?.[localeKey]?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  }
  return typeof item?.detail === "string" ? item.detail.trim() : "";
}

function currentSs13Locale(record) {
  const evidence = record?.sourceSeasonEvidence;
  if (evidence?.verificationComplete !== true) return false;
  if (evidence?.actualSeason != null && Number(evidence.actualSeason) !== 13) return false;
  const declaredVersions = [
    record?.sourcePageVersion,
    evidence?.sourcePageVersion,
    record?.activeBaselineSeason,
    evidence?.activeBaselineSeason,
  ].filter((version) => typeof version === "string" && /^SS\d+(?:\.\d+)?$/u.test(version));
  if (declaredVersions.some((version) => version !== "SS13")) return false;
  return record?.sourcePageVersion === "SS13"
    || evidence?.sourcePageVersion === "SS13"
    || record?.activeBaselineSeason === "SS13"
    || evidence?.activeBaselineSeason === "SS13"
    || Number(evidence?.actualSeason) === 13;
}

function hasCompleteTlidbReceipt(record, localeKey) {
  return record?.sourceUrl?.startsWith(`https://tlidb.com/${localeKey}/`)
    && typeof record?.sourceRecordKey === "string"
    && record.sourceRecordKey.length > 0
    && /^[a-f0-9]{64}$/iu.test(record?.sourcePageSha256 ?? "");
}

function resolveExactLocale(item) {
  const locales = LOCALE_ORDER.map((localeKey) => ({
    localeKey,
    record: item?.tlidbText?.[localeKey],
  })).filter(({ record }) => record && typeof record === "object");
  const tlidbLocales = locales.filter(({ record, localeKey }) => (
    record?.sourceUrl?.startsWith(`https://tlidb.com/${localeKey}/`)
  ));
  const currentLocales = tlidbLocales.filter(({ record }) => currentSs13Locale(record));
  const exact = currentLocales.find(({ record, localeKey }) => (
    EXACT_DETAIL_STATUSES.has(record?.sourceFieldStatus?.detail)
    && typeof record?.detail === "string"
    && record.detail.trim().length > 0
    && hasCompleteTlidbReceipt(record, localeKey)
  ));
  if (exact) return { locale: exact.record, blocker: null };

  const sourceText = sourceTextForBlocker(item);
  if (!tlidbLocales.length) {
    return { locale: null, blocker: { sourceText, reason: "missing-tlidb-receipt" } };
  }
  if (!currentLocales.length) {
    return { locale: null, blocker: { sourceText, reason: "non-current-ss13-source" } };
  }
  if (currentLocales.every(({ record }) => !EXACT_DETAIL_STATUSES.has(record?.sourceFieldStatus?.detail))) {
    return { locale: null, blocker: { sourceText, reason: "inexact-detail" } };
  }
  if (currentLocales.every(({ record }) => typeof record?.detail !== "string" || !record.detail.trim())) {
    return { locale: null, blocker: { sourceText, reason: "missing-exact-detail" } };
  }
  return { locale: null, blocker: { sourceText, reason: "incomplete-source-receipt" } };
}

function numericValue(rawValue) {
  return Number(String(rawValue ?? "").replace(/\s+/gu, "").replace("−", "-"));
}

function parsedDirectValue(rawValue) {
  const text = String(rawValue ?? "").replace(/\s+/gu, "").replaceAll("−", "-");
  const parenthesizedRange = text.match(/^([+-]?)\(([+-]?\d+(?:\.\d+)?)[–—~～〜]([+-]?\d+(?:\.\d+)?)\)$/u);
  const bareRange = text.match(/^([+-]?\d+(?:\.\d+)?)[–—~～〜]([+-]?\d+(?:\.\d+)?)$/u);
  if (!parenthesizedRange && !bareRange) {
    const value = Number(text);
    return Number.isFinite(value) ? { value, roll: null } : null;
  }
  const outsideSign = parenthesizedRange?.[1] === "-" ? -1 : 1;
  const first = Number(parenthesizedRange?.[2] ?? bareRange?.[1]) * outsideSign;
  const second = Number(parenthesizedRange?.[3] ?? bareRange?.[2]) * outsideSign;
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return {
    value: null,
    roll: { min: Math.min(first, second), max: Math.max(first, second) },
  };
}

function markerOperation(marker, percent, stat, parsed) {
  const normalized = String(marker ?? "").toLocaleLowerCase("en-US");
  const decreasing = /감소|reduced|降低/u.test(normalized);
  const adjusted = decreasing
    ? {
        value: parsed.value == null ? null : -Math.abs(parsed.value),
        roll: parsed.roll
          ? { min: -Math.abs(parsed.roll.max), max: -Math.abs(parsed.roll.min) }
          : null,
      }
    : parsed;
  const operation = /설정|고정|fixed|set/u.test(normalized)
    ? "set"
    : /추가|별도|additional|more|额外/u.test(normalized) && percent
    ? "more"
    : !percent || POINT_PERCENT_STATS.has(stat)
      ? "add"
      : "increase";
  return { ...adjusted, operation };
}

function snakeStat(stat) {
  return String(stat ?? "").replace(/[A-Z]/gu, (letter) => `_${letter.toLocaleLowerCase("en-US")}`);
}

function statForLabel(label) {
  return STAT_BY_LABEL.get(String(label ?? "").replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US")) ?? null;
}

function conditionPrefix(line, firstEffectStart) {
  const prefix = line.slice(0, firstEffectStart).trim().replace(/[,;，；]\s*$/u, "").trim();
  if (!prefix) return "";
  if (/(?:경우|때마다|동안|보유 시|상태(?:일|인)|일 때|일 경우|적에게|들고 있을|최근|당|시)$|(?:경우|때마다|동안|보유 시|일 때|일 경우)[,，]?$/u.test(prefix)) {
    return prefix;
  }
  return "";
}

function addRecognizedSpan(spans, match, groupValue) {
  if (!match || groupValue == null) return;
  const relativeIndex = match[0].indexOf(groupValue);
  if (relativeIndex < 0) return;
  const start = (match.index ?? 0) + relativeIndex;
  spans.push([start, start + groupValue.length]);
}

function metadataCondition(line, conditionText, context, spans) {
  const condition = {};
  if (conditionText) condition.text = conditionText;
  if (context.pendingCondition && !condition.text) condition.text = context.pendingCondition;
  if (context.pendingCondition && condition.text && condition.text !== context.pendingCondition) {
    condition.text = `${context.pendingCondition}; ${condition.text}`;
  }
  if (context.section) condition.section = context.section;
  if (context.sectionText) condition.sectionText = context.sectionText;

  const perMatch = line.match(/(\d+(?:\.\d+)?)\s*(회|포인트|개|명|레벨)\s*(?:[^,，\d]{0,20})?(?:때마다|당)/u);
  if (perMatch) {
    const unit = {
      "회": "use",
      "포인트": "point",
      "개": "count",
      "명": "enemy",
      "레벨": "level",
    }[perMatch[2]];
    condition.perTrigger = { value: Number(perMatch[1]), unit };
    addRecognizedSpan(spans, perMatch, perMatch[1]);
  }

  const maxStacksMatch = line.match(/최대(?:치)?\s*\+?(\d+(?:\.\d+)?)\s*회\s*(?:중첩|까지)/u);
  if (maxStacksMatch) {
    condition.maxStacks = Number(maxStacksMatch[1]);
    addRecognizedSpan(spans, maxStacksMatch, maxStacksMatch[1]);
  }

  const durationMatch = line.match(/(\d+(?:\.\d+)?)\s*초(?:간)?\s*지속/u);
  if (durationMatch) {
    condition.durationSeconds = Number(durationMatch[1]);
    addRecognizedSpan(spans, durationMatch, durationMatch[1]);
  }

  const intervalMatch = line.match(/(?:간격\s*)?(\d+(?:\.\d+)?)\s*초(?:마다|\s*간격)/u);
  if (intervalMatch) {
    condition.intervalSeconds = Number(intervalMatch[1]);
    addRecognizedSpan(spans, intervalMatch, intervalMatch[1]);
  }

  const thresholdMatch = line.match(/(\d+(?:\.\d+)?)\s*(%)\s*(이상|이하|초과|미만)/u);
  if (thresholdMatch) {
    const comparator = {
      "이상": "atLeast",
      "이하": "atMost",
      "초과": "greaterThan",
      "미만": "lessThan",
    }[thresholdMatch[3]];
    condition.threshold = { value: Number(thresholdMatch[1]), unit: "percent", comparator };
    addRecognizedSpan(spans, thresholdMatch, thresholdMatch[1]);
  }

  const requiredCountMatch = String(context.pendingCondition ?? conditionText).match(/(\d+)\s*개(?:가| 있는| 있을| 있으면)/u);
  if (requiredCountMatch) condition.requiredCount = Number(requiredCountMatch[1]);

  const capMatch = line.match(/(?:최대치|최고|최대로)[^\d+−-]*([+−-]?\d+(?:\.\d+)?)\s*(%)?/u);
  if (capMatch && !maxStacksMatch) {
    condition.cap = {
      value: numericValue(capMatch[1]),
      unit: capMatch[2] ? "percent" : "flat",
    };
    addRecognizedSpan(spans, capMatch, capMatch[1]);
  }

  const divinityLimitMatch = line.match(/신격 유효 한도:\s*(\d+)/u);
  if (divinityLimitMatch) {
    condition.divinityEffectLimit = Number(divinityLimitMatch[1]);
    condition.text = [condition.text, divinityLimitMatch[0]].filter(Boolean).join(" / ");
    addRecognizedSpan(spans, divinityLimitMatch, divinityLimitMatch[1]);
  }

  return Object.keys(condition).length ? condition : null;
}

function conditionRequirement(condition) {
  const text = String(condition?.text ?? "");
  if (!text || condition?.maxStacks || condition?.perTrigger) return null;
  if (/(?:적 보스|보스가 있는|보스가 있을)/u.test(text)) {
    return {
      id: "enemy-is-boss",
      path: "enemy.isBoss",
      operator: "equals",
      expected: true,
    };
  }
  if (/최근[^,，]*(?:처치|죽인)/u.test(text)) {
    return {
      id: "recent-kill",
      path: "recent.killed",
      operator: "equals",
      expected: true,
    };
  }
  if (/최근[^,，]*(?:피격|대미지를 입)/u.test(text)) {
    return {
      id: "recently-hit",
      path: "recent.wasHit",
      operator: "equals",
      expected: true,
    };
  }
  if (/건강 상태/u.test(text)) {
    return {
      id: "healthy",
      path: "statuses.healthy",
      operator: "truthy",
      expected: true,
    };
  }
  if (/방패를 들고/u.test(text)) {
    return {
      id: "wielding-shield",
      path: "statuses.wielding_shield",
      operator: "truthy",
      expected: true,
    };
  }
  if (/듀얼/u.test(text)) {
    return {
      id: "dual-wielding",
      path: "statuses.dual_wielding",
      operator: "truthy",
      expected: true,
    };
  }
  if (/양손 무기를 들고/u.test(text)) {
    return {
      id: "wielding-two-handed-weapon",
      path: "statuses.wielding_two_handed_weapon",
      operator: "truthy",
      expected: true,
    };
  }
  if (/견고 보유 시/u.test(text)) {
    return {
      id: "steadfast-active",
      path: "buffs.steadfast",
      operator: "truthy",
      expected: true,
    };
  }
  return null;
}

function perDefinition(condition) {
  const text = String(condition?.text ?? "");
  const attribute = text.match(/^(힘|민첩|지혜)\s*(\d+(?:\.\d+)?)\s*포인트\s*당/u);
  if (attribute) {
    const pathKey = { "힘": "strength", "민첩": "dexterity", "지혜": "intelligence" }[attribute[1]];
    return { path: `heroStacks.${pathKey}`, divisor: Number(attribute[2]) };
  }
  const recentMana = text.match(/^최근 소모한 MP\s*(\d+(?:\.\d+)?)\s*당/u);
  if (recentMana) {
    return { path: "heroStacks.recent_mana_spent", divisor: Number(recentMana[1]) };
  }
  return null;
}

function effectConditionFields(condition) {
  if (!condition) return {};
  const sectionText = condition.sectionText ?? (condition.section === "promotion" ? "승급 보상" : "");
  const naturalText = [sectionText, condition.text].filter(Boolean).join("; ");
  const metadata = Object.fromEntries(Object.entries(condition).filter(([key]) => (
    !["text", "sectionText"].includes(key)
  )));
  const per = !condition.section ? perDefinition(condition) : null;
  if (per) {
    return {
      conditionText: naturalText,
      per,
      ...(Object.keys(metadata).length ? { conditionMetadata: metadata } : {}),
    };
  }
  const requirement = !condition.section ? conditionRequirement(condition) : null;
  if (requirement) {
    return {
      condition: { ...requirement, text: naturalText },
      conditionRequirements: [{ ...requirement }],
      ...(Object.keys(metadata).length ? { conditionMetadata: metadata } : {}),
    };
  }
  if (
    !naturalText
    && Object.keys(metadata).every((key) => (
      ["intervalSeconds", "cap"].includes(key)
    ))
  ) {
    return Object.keys(metadata).length ? { conditionMetadata: metadata } : {};
  }
  return {
    condition: naturalText || "조건 입력 필요",
    ...(Object.keys(metadata).length ? { conditionMetadata: metadata } : {}),
  };
}

function directMatches(line) {
  const matches = [];
  const occupied = [];
  const patterns = [
    LABEL_FIRST_SIGNED,
    LABEL_FIRST_UNSIGNED_OPERATION,
    LABEL_FIRST_UNSIGNED_CONDITIONAL,
    LABEL_SET_VALUE,
    VALUE_FIRST_SIGNED,
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (occupied.some(([left, right]) => start < right && end > left)) continue;
      if (pattern === LABEL_FIRST_UNSIGNED_CONDITIONAL) {
        const wholeLine = match[0].replace(/[.。]\s*$/u, "").trim()
          === line.replace(/[.。]\s*$/u, "").trim();
        if (!wholeLine && !conditionPrefix(line, start)) continue;
      }
      const stat = statForLabel(match.groups?.label);
      const parsed = parsedDirectValue(match.groups?.value);
      if (!stat || !parsed) continue;
      const percent = Boolean(match.groups?.percent);
      const marker = match.groups?.before ?? match.groups?.after ?? "";
      const modifier = pattern === LABEL_SET_VALUE
        ? { ...parsed, operation: "set" }
        : markerOperation(marker, percent, stat, parsed);
      matches.push({
        start,
        end,
        valueText: match.groups.value,
        valueStart: start + match[0].indexOf(match.groups.value),
        stat,
        value: modifier.value,
        ...(modifier.roll ? { roll: modifier.roll } : {}),
        unit: percent ? "percent" : "flat",
        operation: modifier.operation,
      });
      occupied.push([start, end]);
    }
  }
  return matches.sort((left, right) => left.start - right.start);
}

function resourceStat(label) {
  if (label === "HP" || label === "Life") return "life";
  if (label === "MP" || label === "Mana") return "mana";
  return "energyShield";
}

function specializedRecoveryEffects(line, spans) {
  const effects = [];
  const perSecond = line.match(/(?:^|[,，]\s*)초당\s*(HP|MP|보호막|Life|Mana|Energy Shield)\s*([+−-]?\d+(?:\.\d+)?)\s*(%)?\s*회복/u);
  if (perSecond) {
    const value = numericValue(perSecond[2]);
    effects.push({
      stat: `${resourceStat(perSecond[1])}Regeneration`,
      operation: "add",
      value,
      unit: perSecond[3] ? "percent_per_second" : "flat_per_second",
    });
    addRecognizedSpan(spans, perSecond, perSecond[2]);
  }

  const periodic = line.match(/(?:^|[,，]\s*)(\d+(?:\.\d+)?)\s*초당\s*(HP|MP|보호막)\s*([+−-]?\d+(?:\.\d+)?)\s*(%)?\s*회복/u);
  if (periodic) {
    const intervalSeconds = Number(periodic[1]);
    effects.push({
      stat: `${resourceStat(periodic[2])}Regeneration`,
      operation: "add",
      value: numericValue(periodic[3]) / intervalSeconds,
      unit: periodic[4] ? "percent_per_second" : "flat_per_second",
      localMetadata: { intervalSeconds },
    });
    addRecognizedSpan(spans, periodic, periodic[1]);
    addRecognizedSpan(spans, periodic, periodic[3]);
  }

  const eventRecovery = line.match(new RegExp(
    `(?:^|[,，]\\s*)(HP|MP|보호막)\\s*(?:와|과)?\\s*(보호막)?(?:을|를)?\\s*(${DIRECT_VALUE_SOURCE})\\s*(%)\\s*회복`,
    "u",
  ));
  if (eventRecovery && !perSecond && !periodic) {
    const parsed = parsedDirectValue(eventRecovery[3]);
    const onDefeat = /^처치 시[,，]/u.test(line);
    const resources = [eventRecovery[1], eventRecovery[2]].filter(Boolean);
    for (const resource of resources) {
      effects.push({
        stat: `${resourceStat(resource)}Recovery${onDefeat ? "OnDefeat" : ""}`,
        operation: "add",
        value: parsed?.value ?? null,
        ...(parsed?.roll ? { roll: { ...parsed.roll } } : {}),
        unit: "percent",
        ...(onDefeat ? {
          consumeBaseCondition: true,
          localMetadata: { trigger: "on_defeat" },
        } : {}),
      });
    }
    addRecognizedSpan(spans, eventRecovery, eventRecovery[3]);
  }

  return effects;
}

function specializedTripleDamageEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-giant"
    || locale?.sourceRecordKey !== "Kismet:_Giant"
  ) return [];
  const match = line.match(
    /^양손 무기를 들고 있을 경우,\s*공격 스킬 사용 시\s*\+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\))\s*%\s*확률로\s*(?<multiplier>3)배 대미지를 입힌다[.]?$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  addRecognizedSpan(spans, match, match.groups.multiplier);
  return [{
    stat: "attack_triple_damage_chance",
    operation: "add",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:attack_triple_damage_chance:${match.index ?? 0}`,
    unit: "percent",
    damageMultiplier: 3,
    equipmentRequirements: { weaponTags: ["twoHand"] },
  }];
}

function specializedScaleDifferentWeaponEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-scale"
    || locale?.sourceRecordKey !== "Kismet:_Scale"
  ) return [];
  const match = line.match(
    /^듀얼 일 경우 다른 유형의 무기를 1개 장착할 때마다 공격 대미지 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "attack_damage",
    operation: "increase",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:attack_damage:${match.index ?? 0}`,
    unit: "percent",
    conditionRequirements: [{
      id: "dual-wielding-different-weapon-types",
      label: "서로 다른 유형의 한손 무기 2개 장착",
      path: "statuses.dual_wielding_different_weapon_types",
      operator: "truthy",
      expected: true,
    }],
  }];
}

function specializedAshesEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-ashes"
    || locale?.sourceRecordKey !== "Kismet:_Ashes"
  ) return [];
  const damageMatch = line.match(
    /^점화 상태의 적에게 입히는 화염 대미지 별도 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (damageMatch?.groups) {
    const parsed = parsedDirectValue(damageMatch.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, damageMatch, damageMatch.groups.range);
    const conditionRequirement = {
      id: "enemy-ignited",
      label: "적이 점화 상태",
      path: "statuses.enemy_ignited",
      operator: "truthy",
      expected: true,
    };
    return [{
      stat: "fire_damage",
      operation: "more",
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:fire_damage:${line.indexOf("화염 대미지")}`,
      unit: "percent",
      condition: {
        ...conditionRequirement,
        text: "점화 상태의 적에게 입히는",
      },
      conditionRequirements: [conditionRequirement],
    }];
  }
  const chanceMatch = line.match(/^점화 확률 (?<value>-30) %$/u);
  if (!chanceMatch?.groups) return [];
  addRecognizedSpan(spans, chanceMatch, chanceMatch.groups.value);
  return [{
    stat: "ignite_chance",
    operation: "add",
    value: Number(chanceMatch.groups.value),
    unit: "percent",
  }];
}

function specializedVolcanoEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-volcano"
    || locale?.sourceRecordKey !== "Kismet:_Volcano"
  ) return [];
  const rangedDefinitions = [
    {
      pattern: /^점화 확률 (?<range>\(\s*-?\d+(?:\.\d+)?\s*[–—~～〜]\s*-?\d+(?:\.\d+)?\s*\)) %$/u,
      stat: "ignite_chance",
      operation: "add",
    },
    {
      pattern: /^점화 지속 시간 추가 (?<range>\(\s*-?\d+(?:\.\d+)?\s*[–—~～〜]\s*-?\d+(?:\.\d+)?\s*\)) %$/u,
      stat: "ignite_duration",
      operation: "more",
    },
  ];
  for (const definition of rangedDefinitions) {
    const match = line.match(definition.pattern);
    if (!match?.groups) continue;
    const parsed = parsedDirectValue(match.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, match, match.groups.range);
    return [{
      stat: definition.stat,
      operation: definition.operation,
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:${definition.stat}:0`,
      unit: "percent",
    }];
  }
  const limitMatch = line.match(/^점화 최대치 (?<value>\+1)$/u);
  if (!limitMatch?.groups) return [];
  addRecognizedSpan(spans, limitMatch, limitMatch.groups.value);
  return [{
    stat: "ignite_limit",
    operation: "add",
    value: Number(limitMatch.groups.value),
    unit: "count",
  }];
}

function specializedGuillotineEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-guillotine"
    || locale?.sourceRecordKey !== "Kismet:_Guillotine"
  ) return [];
  const definitions = [
    {
      pattern: /^슬래시 확률 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
      stat: "steep_strike_chance",
      operation: "add",
    },
    {
      pattern: /^슬래시 대미지가 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) % 추가된다[.]$/u,
      stat: "steep_strike_damage",
      operation: "more",
    },
  ];
  for (const definition of definitions) {
    const match = line.match(definition.pattern);
    if (!match?.groups) continue;
    const parsed = parsedDirectValue(match.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, match, match.groups.range);
    return [{
      stat: definition.stat,
      operation: definition.operation,
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:${definition.stat}:0`,
      unit: "percent",
    }];
  }
  return [];
}

function specializedWindChimeEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-wind-chime"
    || locale?.sourceRecordKey !== "Kismet:_Wind_Chime"
  ) return [];
  const match = line.match(
    /^마령의 강화 스킬 사용 확률 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) % [.]$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "spirit_magus_enhanced_skill_chance",
    operation: "add",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:spirit_magus_enhanced_skill_chance:0`,
    unit: "percent",
  }];
}

function specializedBouquetEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-bouquet"
    || locale?.sourceRecordKey !== "Kismet:_Bouquet"
  ) return [];
  const match = line.match(
    /^보유한 마령 1개당, 마령 대미지 추가 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "spirit_magus_damage_per_owned_magus",
    operation: "more",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:spirit_magus_damage_per_owned_magus:0`,
    unit: "percent",
    skillDamageApplicability: "configuration-only",
  }];
}

function specializedTigerRoarEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-tiger-roar"
    || locale?.sourceRecordKey !== "Kismet:_Tiger_Roar"
  ) return [];
  const intimidatedMatch = line.match(
    /^적중 시, (?<value>\+100) % 의 확률로 압도 를 부여한다[.]$/u,
  );
  if (intimidatedMatch?.groups) {
    addRecognizedSpan(spans, intimidatedMatch, intimidatedMatch.groups.value);
    return [{
      stat: "intimidated_on_hit_chance",
      operation: "add",
      value: Number(intimidatedMatch.groups.value),
      unit: "percent",
      skillDamageApplicability: "configuration-only",
    }];
  }
  const damageMatch = line.match(
    /^위중 상태 의 적에게 주는 대미지 별도 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (!damageMatch?.groups) return [];
  const parsed = parsedDirectValue(damageMatch.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, damageMatch, damageMatch.groups.range);
  return [{
    stat: "damage",
    operation: "more",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:damage:0`,
    unit: "percent",
    conditionRequirements: [{
      id: "enemy-low-life",
      label: "적이 위중 상태",
      path: "enemyStates.low_life",
      operator: "truthy",
      expected: true,
    }],
  }];
}

function specializedScorpionStingerEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-scorpion-stinger"
    || locale?.sourceRecordKey !== "Kismet:_Scorpion_Stinger"
  ) return [];
  const durationMatch = line.match(
    /^스킬 효과 지속 시간 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (durationMatch?.groups) {
    const parsed = parsedDirectValue(durationMatch.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, durationMatch, durationMatch.groups.range);
    return [{
      stat: "skill_effect_duration",
      operation: "increase",
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:skill_effect_duration:0`,
      unit: "percent",
      skillDamageApplicability: "configuration-only",
    }];
  }
  const recoveryMatch = line.match(
    /^최근 부여한 수확 (?<divisor>1)회당, 수확 회복 속도 (?<value>\+2) % , 최대 (?<maximum>20) %$/u,
  );
  if (!recoveryMatch?.groups) return [];
  addRecognizedSpan(spans, recoveryMatch, recoveryMatch.groups.divisor);
  addRecognizedSpan(spans, recoveryMatch, recoveryMatch.groups.value);
  addRecognizedSpan(spans, recoveryMatch, recoveryMatch.groups.maximum);
  return [{
    stat: "harvest_recovery_speed",
    operation: "increase",
    value: Number(recoveryMatch.groups.value),
    unit: "percent",
    per: {
      path: "recent.reapingCount",
      divisor: Number(recoveryMatch.groups.divisor),
      maxUnits: Number(recoveryMatch.groups.maximum) / Number(recoveryMatch.groups.value),
    },
  }];
}

function specializedRippleEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-ripple"
    || locale?.sourceRecordKey !== "Kismet:_Ripple"
  ) return [];
  const match = line.match(
    /^매직 버스트 활성화 시, 매직 버스트 (?<divisor>1)회당 스킬 범위 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.divisor);
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "skill_area",
    operation: "increase",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:skill_area:0`,
    unit: "percent",
    per: {
      path: "recent.spellBurstActivationCount",
      divisor: Number(match.groups.divisor),
    },
  }];
}

function specializedLionEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-lion"
    || locale?.sourceRecordKey !== "Kismet:_Lion"
  ) return [];
  const match = line.match(
    /^최근 시전한 함성 스킬 (?<divisor>1)회당, 함성 효과 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) % , 최대 (?<maximum>3) 회 중첩된다[.]$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.divisor);
  addRecognizedSpan(spans, match, match.groups.range);
  addRecognizedSpan(spans, match, match.groups.maximum);
  return [{
    stat: "warcry_effect",
    operation: "increase",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:warcry_effect:0`,
    unit: "percent",
    per: {
      path: "recent.warcrySkillUseCount",
      divisor: Number(match.groups.divisor),
      maxUnits: Number(match.groups.maximum),
    },
  }];
}

function specializedMouthOfSpringEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-mouth-of-the-spring"
    || locale?.sourceRecordKey !== "Kismet:_Mouth_of_the_Spring"
  ) return [];
  const speedMatch = line.match(
    /^매직 버스트 충전 속도 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) % [.]$/u,
  );
  if (speedMatch?.groups) {
    const parsed = parsedDirectValue(speedMatch.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, speedMatch, speedMatch.groups.range);
    return [{
      stat: "magic_burst_charge_speed",
      operation: "increase",
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:magic_burst_charge_speed:0`,
      unit: "percent",
    }];
  }
  const damageMatch = line.match(
    /^매직 버스트 충전 시, 받는 대미지 추가 (?<value>-5) %$/u,
  );
  if (!damageMatch?.groups) return [];
  addRecognizedSpan(spans, damageMatch, damageMatch.groups.value);
  return [{
    stat: "damage_taken_additional",
    operation: "add",
    value: Number(damageMatch.groups.value),
    unit: "percent",
    conditionRequirements: [{
      id: "spell-burst-charge-active",
      label: "매직 버스트 충전 활성",
      path: "statuses.spell_burst_charge_active",
      operator: "truthy",
      expected: true,
    }],
  }];
}

function specializedShieldEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-shield"
    || locale?.sourceRecordKey !== "Kismet:_Shield"
  ) return [];
  const conditionRequirements = [{
    id: "wielding-shield",
    label: "방패 장착",
    path: "statuses.wielding_shield",
    operator: "truthy",
    expected: true,
  }];
  const defenseMatch = line.match(
    /^방패를 들고 있을 경우, 방어 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (defenseMatch?.groups) {
    const parsed = parsedDirectValue(defenseMatch.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, defenseMatch, defenseMatch.groups.range);
    return [{
      stat: "defense_bonus_percent",
      operation: "increase",
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:defense_bonus_percent:0`,
      unit: "percent",
      conditionRequirements,
    }];
  }
  const speedMatch = line.match(
    /^방패를 들고 있을 경우, 이동 속도 \+(?<value>3) %$/u,
  );
  if (!speedMatch?.groups) return [];
  addRecognizedSpan(spans, speedMatch, speedMatch.groups.value);
  return [{
    stat: "movement_speed",
    operation: "increase",
    value: Number(speedMatch.groups.value),
    unit: "percent",
    conditionRequirements,
  }];
}

function specializedCreekEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-creek"
    || locale?.sourceRecordKey !== "Kismet:_Creek"
  ) return [];
  if (/^영약 스킬이 1초마다 충전 진행도를 1 획득한다[.]$/u.test(line)) {
    for (const numberMatch of line.matchAll(/\d+(?:\.\d+)?/gu)) {
      spans.push([numberMatch.index, numberMatch.index + numberMatch[0].length]);
    }
    return [{
      stat: "elixir_charge_progress_per_second",
      operation: "add",
      value: 1,
      unit: "flat",
    }];
  }
  const match = line.match(
    /^영약 스킬이 지속되는 동안 이동 속도 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "movement_speed",
    operation: "increase",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:movement_speed:0`,
    unit: "percent",
    conditionRequirements: [{
      id: "elixir-skill-active",
      label: "영약 스킬 지속 중",
      path: "playerStates.elixir_skill_active",
      operator: "truthy",
      expected: true,
    }],
  }];
}

function specializedEvilFlameEffects(item, locale, line, spans) {
  if (
    item?.id !== "destiny-dual-kismet-evil-flame"
    || locale?.sourceRecordKey !== "Dual_Kismet:_Evil_Flame"
    || line !== "저주 받은 적을 공격 또는 주술 처치 시 15% 확률로 폭발하여 반경 5미터 이내의 적에게 처치된 적의 최대 HP 250%의 트루 대미지를 입힌다."
  ) return [];
  for (const numberMatch of line.matchAll(/\d+(?:\.\d+)?/gu)) {
    spans.push([numberMatch.index, numberMatch.index + numberMatch[0].length]);
  }
  const common = { operation: "set", skillDamageApplicability: "configuration-only" };
  return [
    {
      ...common,
      stat: "cursed_enemy_kill_explosion_chance_percent",
      value: 15,
      unit: "percent",
    },
    {
      ...common,
      stat: "cursed_enemy_kill_explosion_radius_meters",
      value: 5,
      unit: "flat",
    },
    {
      ...common,
      stat: "cursed_enemy_kill_explosion_enemy_max_life_true_damage_percent",
      value: 250,
      unit: "percent",
    },
  ];
}

function specializedWarHammerEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-war-hammer"
    || locale?.sourceRecordKey !== "Kismet:_War_Hammer"
  ) return [];
  const match = line.match(
    /^철퇴를 들고 있을 경우, 파괴 에너지 축적 회복 속도 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "demolisher_charge_restoration_speed",
    operation: "increase",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:demolisher_charge_restoration_speed:0`,
    unit: "percent",
    conditionRequirements: [{
      id: "wielding-mace",
      label: "철퇴 장착",
      path: "statuses.wielding_mace",
      operator: "truthy",
      expected: true,
    }],
  }];
}

function specializedProstheticsEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-prosthetics"
    || locale?.sourceRecordKey !== "Kismet:_Prosthetics"
  ) return [];
  const definitions = [
    {
      pattern: /^스마트 웨폰 소환체 체격 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
      stat: "smart_weapon_minion_physique",
      operation: "increase",
    },
    {
      pattern: /^스마트 웨폰 소환체가 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) % 확률로 이중 대미지 부여$/u,
      stat: "smart_weapon_minion_double_damage_chance",
      operation: "add",
    },
  ];
  for (const definition of definitions) {
    const match = line.match(definition.pattern);
    if (!match?.groups) continue;
    const parsed = parsedDirectValue(match.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, match, match.groups.range);
    return [{
      stat: definition.stat,
      operation: definition.operation,
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:${definition.stat}:0`,
      unit: "percent",
      skillDamageApplicability: "configuration-only",
    }];
  }
  return [];
}

function specializedDoubleBladeEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-double-blade"
    || locale?.sourceRecordKey !== "Kismet:_Double_Blade"
  ) return [];
  const match = line.match(
    /^듀얼 시, 메인 무기 의 크리티컬 \+(?<critical>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) % , 서브 무기 에 물리 대미지가 (?<minimum>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) - (?<maximum>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) 포인트 추가된다[.]$/u,
  );
  if (!match?.groups) return [];
  const critical = parsedDirectValue(match.groups.critical);
  const minimum = parsedDirectValue(match.groups.minimum);
  const maximum = parsedDirectValue(match.groups.maximum);
  if (!critical?.roll || !minimum?.roll || !maximum?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.critical);
  addRecognizedSpan(spans, match, match.groups.minimum);
  addRecognizedSpan(spans, match, match.groups.maximum);
  const conditionRequirements = [{
    id: "dual-wielding",
    label: "듀얼 장착",
    path: "statuses.dual_wielding",
    operator: "truthy",
    expected: true,
  }];
  return [
    {
      stat: "main_hand_weapon_critical_strike_rating",
      operation: "increase",
      value: null,
      roll: critical.roll,
      rollKey: `${item.id}:${lineIndex}:main_hand_weapon_critical_strike_rating:0`,
      unit: "percent",
      weaponSlot: "main",
      skillDamageApplicability: "affects-dps",
      conditionRequirements,
    },
    {
      stat: "off_hand_weapon_physical_damage_min",
      operation: "add",
      value: null,
      roll: minimum.roll,
      rollKey: `${item.id}:${lineIndex}:off_hand_weapon_physical_damage_min:1`,
      unit: "flat",
      weaponSlot: "off",
      skillDamageApplicability: "affects-dps",
      conditionRequirements,
    },
    {
      stat: "off_hand_weapon_physical_damage_max",
      operation: "add",
      value: null,
      roll: maximum.roll,
      rollKey: `${item.id}:${lineIndex}:off_hand_weapon_physical_damage_max:2`,
      unit: "flat",
      weaponSlot: "off",
      skillDamageApplicability: "affects-dps",
      conditionRequirements,
    },
  ];
}

function specializedRedLeechCriticalEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-red-leech"
    || locale?.sourceRecordKey !== "Kismet:_Red_Leech"
  ) return [];
  const conditionRequirement = {
    id: "enemy-traumatized",
    label: "적이 외상 상태",
    path: "statuses.enemy_traumatized",
    operator: "truthy",
    expected: true,
  };
  const condition = {
    ...conditionRequirement,
    text: "외상 상태의 적에 대한",
  };
  const ratingMatch = line.match(
    /^외상 상태의 적에 대한 크리티컬 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\)) %$/u,
  );
  if (ratingMatch?.groups) {
    const parsed = parsedDirectValue(ratingMatch.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, ratingMatch, ratingMatch.groups.range);
    return [{
      stat: "critical_rating",
      operation: "add",
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:critical_rating:${line.indexOf("크리티컬")}`,
      unit: "percent",
      condition,
      conditionRequirements: [conditionRequirement],
    }];
  }
  const damageMatch = line.match(
    /^외상 상태의 적에 대한 크리티컬 대미지 (?<value>-20) %$/u,
  );
  if (!damageMatch?.groups) return [];
  addRecognizedSpan(spans, damageMatch, damageMatch.groups.value);
  return [{
    stat: "critical_damage",
    operation: "increase",
    value: Number(damageMatch.groups.value),
    unit: "percent",
    condition,
    conditionRequirements: [conditionRequirement],
  }];
}

function specializedGiantBearCriticalDamageEffects(item, locale, line, lineIndex, spans) {
  if (
    item?.id !== "destiny-kismet-giant-bear"
    || locale?.sourceRecordKey !== "Kismet:_Giant_Bear"
  ) return [];
  const match = line.match(
    /^강적 에게 근접전 공격 크리티컬 대미지 \+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\))\s*%\s*부여$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "melee_attack_critical_damage",
    operation: "increase",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:melee_attack_critical_damage:${match.index ?? 0}`,
    unit: "percent",
    conditionRequirements: [{
      id: "enemy-is-elite",
      path: "enemy.type",
      operator: "equals",
      expected: "elite",
    }],
  }];
}

function exactSentryConfigurationStat(item, locale, line, stat) {
  if (
    item?.id === "destiny-kismet-guard"
    && locale?.sourceRecordKey === "Kismet:_Guard"
  ) {
    if (
      stat === "sentry_cast_frequency"
      && line === "보초병 스킬 시전 빈도 추가 +(5–6) %"
    ) return stat;
    if (
      stat === "max_sentry_count"
      && line === "한 번에 배치할 수 있는 보초병 수 +1"
    ) return stat;
  }
  if (
    item?.id === "destiny-kismet-shadow-mage"
    && locale?.sourceRecordKey === "Kismet:_Shadow_Mage"
  ) {
    if (
      stat === "sentry_duration"
      && line === "보초병 지속 시간 +(40–50) %"
    ) return stat;
    if (
      stat === "cast_speed"
      && line === "배치한 보초병의 스킬 시전 속도 추가 +10 %"
    ) return "sentry_cast_speed";
  }
  return null;
}

function spiritOriginDualKismetDefinition(sourceRecordKey, sourceName, stat) {
  return {
    sourceRecordKey,
    lines: new Map([
      [`20레벨 ${sourceName}의 마령의 근원 효과 보유`, {
        stat,
        operation: "set",
        value: 20,
        unit: "level",
        skillDamageApplicability: "configuration-only",
      }],
      ["마령의 근원 효과 30% 증가", {
        stat: "spirit_magus_core_effect",
        operation: "increase",
        value: 30,
        unit: "percent",
      }],
    ]),
  };
}

function preciseFocusDualKismetDefinition(sourceRecordKey, sourceName, stat) {
  return {
    sourceRecordKey,
    lines: new Map([
      [`20레벨의 정밀 ${sourceName}의 주입 버프 획득`, {
        stat,
        operation: "set",
        value: 20,
        unit: "level",
        skillDamageApplicability: "configuration-only",
      }],
      ["주입의 버프 효과 +60%", {
        stat: "focus_buff_effect",
        operation: "increase",
        value: 60,
        unit: "percent",
      }],
    ]),
  };
}

const FIXED_DESTINY_EFFECT_DEFINITIONS = new Map([
  ["destiny-tlidb-ss13-350760", {
    sourceRecordKey: "Dual_Kismet:_Ribbon",
    lines: new Map([
      ["유대 최대 중첩 수 +1", {
        stat: "max_bond_stacks",
        operation: "add",
        value: 1,
        unit: "stacks",
        consumeBaseCondition: true,
        skillDamageApplicability: "configuration-only",
      }],
      ["유대 획득 속도 +50 %", {
        stat: "bond_gain_speed",
        operation: "increase",
        value: 50,
        unit: "percent",
        consumeBaseCondition: true,
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-hatch-out", {
    sourceRecordKey: "Dual_Kismet:_Hatch_Out",
    lines: new Map([
      ["보호막이 없을 경우 오라 스킬 레벨 -5, MP 봉인 보상 +30%", [
        {
          stat: "aura_skill_level",
          operation: "add",
          value: -5,
          unit: "level",
          conditionRequirements: [{
            id: "no-energy-shield",
            label: "보호막 없음",
            path: "playerResources.no_energy_shield",
            operator: "truthy",
            expected: true,
          }],
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "mana_sealed_compensation",
          operation: "add",
          value: 30,
          unit: "percent",
          conditionRequirements: [{
            id: "no-energy-shield",
            label: "보호막 없음",
            path: "playerResources.no_energy_shield",
            operator: "truthy",
            expected: true,
          }],
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
      ]],
    ]),
  }],
  ["destiny-dual-kismet-sky-piercer", {
    sourceRecordKey: "Dual_Kismet:_Sky_Piercer",
    lines: new Map([
      ["위치 이동 스킬 사용 후 5초 동안 공격 수평 투사체 속도 +20%, 공격 수평 투사체 대미지 별도 +15%", [
        {
          stat: "attack_horizontal_projectile_speed",
          operation: "increase",
          value: 20,
          unit: "percent",
          conditionRequirements: [{
            id: "recent-mobility-skill-use",
            label: "최근 위치 이동 스킬 사용",
            path: "recentFlags.has_used_mobility_skill_recently",
            operator: "truthy",
            expected: true,
          }],
          conditionMetadata: { durationSeconds: 5 },
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "attack_horizontal_projectile_damage",
          operation: "more",
          value: 15,
          unit: "percent",
          conditionRequirements: [{
            id: "recent-mobility-skill-use",
            label: "최근 위치 이동 스킬 사용",
            path: "recentFlags.has_used_mobility_skill_recently",
            operator: "truthy",
            expected: true,
          }],
          conditionMetadata: { durationSeconds: 5 },
          consumeBaseCondition: true,
          skillDamageApplicability: "affects-dps",
        },
      ]],
    ]),
  }],
  ["destiny-dual-kismet-star-chasing-arrow", {
    sourceRecordKey: "Dual_Kismet:_Star-Chasing_Arrow",
    lines: new Map([
      ["공격 수평 투사체 대미지 15% 별도 추가", {
        stat: "attack_horizontal_projectile_damage",
        operation: "more",
        value: 15,
        unit: "percent",
        scope: { actor: "self", skillTypes: ["attack"], skillTags: ["projectile", "horizontal"] },
        consumeBaseCondition: true,
        skillDamageApplicability: "affects-dps",
      }],
      ["최근 공격 수평 투사체가 원거리 적에게 대미지를 입힌 경우, 위치 이동 스킬은 공격 속도 추가 +5%", {
        stat: "mobility_skill_attack_speed",
        operation: "increase",
        value: 5,
        unit: "percent",
        scope: { actor: "self", skillTypes: ["attack"], skillTags: ["mobility"] },
        conditionRequirements: [{
          id: "recent-horizontal-projectile-hit-distant-enemy",
          label: "최근 공격 수평 투사체가 원거리 적에게 대미지 부여",
          path: "recentFlags.horizontal_projectile_hit_distant_enemy_recently",
          operator: "truthy",
          expected: true,
        }],
        consumeBaseCondition: true,
        skillDamageApplicability: "affects-dps",
      }],
    ]),
  }],
  ["destiny-dual-kismet-mighty-arrow", {
    sourceRecordKey: "Dual_Kismet:_Mighty_Arrow",
    lines: new Map([
      ["투사체 속도 추가 -25%, 투사체 지속 시간 -25%", [
        {
          stat: "projectile_speed",
          operation: "more",
          value: -25,
          unit: "percent",
          scope: { actor: "self", skillTypes: ["all"], skillTags: ["projectile"] },
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "projectile_duration",
          operation: "increase",
          value: -25,
          unit: "percent",
          scope: { actor: "self", skillTypes: ["all"], skillTags: ["projectile"] },
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
      ]],
      ["주변 적이 받는 공격 수평 사격 투사체 대미지 별도 +25%", {
        stat: "attack_horizontal_projectile_damage",
        operation: "more",
        value: 25,
        unit: "percent",
        scope: { actor: "self", skillTypes: ["attack"], skillTags: ["projectile", "horizontal"] },
        conditionRequirements: [{
          id: "nearby-enemy",
          label: "주변 적",
          path: "enemy.distanceBand",
          operator: "equals",
          expected: "nearby",
        }],
        consumeBaseCondition: true,
        skillDamageApplicability: "affects-dps",
      }],
    ]),
  }],
  ["destiny-kismet-tiger-27s-chain", {
    sourceRecordKey: "Kismet:_Tigers_Chain",
    lines: new Map([
      ["콤보 스타트 스킬 시전 시, 8 미터 내의 적을 역방향 넉백 시키며, 넉백 거리는 (1.5–2) 미터다.", [
        {
          stat: "combo_starter_reverse_knockback_radius",
          operation: "set",
          value: 8,
          unit: "meters",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "combo_starter_reverse_knockback_distance",
          operation: "set",
          value: null,
          roll: { min: 1.5, max: 2 },
          unit: "meters",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
      ]],
      ["해당 효과의 적용 반경은 스킬 범위의 보너스가 적용된다.", {
        stat: "combo_starter_reverse_knockback_radius_affected_by_skill_area",
        operation: "set",
        value: 1,
        unit: "boolean",
        consumeBaseCondition: true,
        skillDamageApplicability: "configuration-only",
      }],
      ["최근 콤보 피니시 스킬을 1회 시전할 때마다 넉백 거리 +8 % , 최대 중첩은 5 회다.", [
        {
          stat: "recent_combo_finisher_knockback_distance_per_stack",
          operation: "add",
          value: 8,
          unit: "percent",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "recent_combo_finisher_knockback_max_stacks",
          operation: "set",
          value: 5,
          unit: "stacks",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
      ]],
      ["콤보 스킬 대미지 별도 +(4–6) %", {
        stat: "combo_skill_damage",
        operation: "more",
        value: null,
        roll: { min: 4, max: 6 },
        unit: "percent",
        skillDamageApplicability: "affects-dps",
      }],
    ]),
  }],
  ["destiny-dual-kismet-banshee", {
    sourceRecordKey: "Dual_Kismet:_Banshee",
    lines: new Map([
      ["오멘 발동 후 수확 시간 추가 +15%, 2초간 지속한다.", {
        stat: "harvest_duration",
        operation: "more",
        value: 15,
        unit: "percent",
        conditionRequirements: [{
          id: "omen-triggered-within-two-seconds",
          path: "statuses.omen_triggered_within_2_seconds",
          operator: "truthy",
          expected: true,
        }],
        conditionMetadata: { durationSeconds: 2 },
        consumeBaseCondition: true,
        skillDamageApplicability: "affects-dps",
      }],
      ["오멘 발동 시 주변 3개의 비 강적 에게 오멘 을 3회 부여한다.", [
        {
          stat: "omen_trigger_nearby_non_elite_enemy_count",
          operation: "set",
          value: 3,
          unit: "flat",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "omen_infliction_stacks_per_enemy",
          operation: "set",
          value: 3,
          unit: "stacks",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
      ]],
    ]),
  }],
  ["destiny-dual-kismet-plague-source", {
    sourceRecordKey: "Dual_Kismet:_Plague_Source",
    lines: new Map([
      ["지속 대미지를 0.5초 동안 부여 후, 3 초 동안 지속 대미지 수확, 쿨타임 99 초", [
        {
          stat: "reaping_trigger_delay",
          operation: "set",
          value: 0.5,
          unit: "seconds",
          consumeBaseCondition: true,
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "reaping_duration",
          operation: "set",
          value: 3,
          unit: "seconds",
          scope: { actor: "self", skillTypes: ["all"], skillTags: ["persistent"] },
          consumeBaseCondition: true,
          skillDamageApplicability: "affects-dps",
        },
        {
          stat: "effect_cooldown",
          operation: "set",
          value: 99,
          unit: "seconds",
          scope: { actor: "self", skillTypes: ["all"], skillTags: ["persistent"] },
          consumeBaseCondition: true,
          skillDamageApplicability: "affects-dps",
        },
      ]],
    ]),
  }],
  ["destiny-kismet-star-trail", {
    sourceRecordKey: "Kismet:_Star_Trail",
    lines: new Map([
      ["계약 서브트리의 하위 숙명 효과가 +45 % 증가한다.", {
        stat: "pact_branch_micro_fate_effect",
        operation: "increase",
        value: 45,
        unit: "percent",
      }],
    ]),
  }],
  ["destiny-dual-kismet-hanging-bird", {
    sourceRecordKey: "Dual_Kismet:_Hanging_Bird",
    lines: new Map([
      ["편향을 최소 3회 보유 시 행운 대미지", {
        stat: "damage_lucky",
        operation: "set",
        value: 1,
        unit: "boolean",
        conditionRequirements: [{
          id: "minimum-deflection-stacks",
          label: "편향을 최소 3회 보유",
          path: "stacks.deflection",
          operator: "atLeast",
          expected: 3,
        }],
        consumeBaseCondition: true,
      }],
    ]),
  }],
  ["destiny-dual-kismet-shadow", {
    sourceRecordKey: "Dual_Kismet:_Shadow",
    lines: new Map([
      ["회피 수치 +2000", {
        stat: "evasion",
        operation: "add",
        value: 2000,
        unit: "flat",
        skillDamageApplicability: "configuration-only",
      }],
      ["대미지 면역 확률 -20%", {
        stat: "damage_immunity_chance",
        operation: "add",
        value: -20,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
      ["회피 후 이동 속도 +30%, 해당 효과는 10초 동안 0까지 점차 감소한다.", {
        stat: "movement_speed",
        operation: "increase",
        value: 30,
        unit: "percent",
        conditionRequirements: [{
          id: "evaded-recently",
          label: "회피 후",
          path: "recent.evaded",
          operator: "truthy",
          expected: true,
        }],
        conditionMetadata: { durationSeconds: 10 },
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-great-library", {
    sourceRecordKey: "Dual_Kismet:_Great_Library",
    lines: new Map([
      ["이름이 다른 천명을 한 개 장착할 때마다 대미지 2% 별도 추가(곱연산)", {
        stat: "damage",
        operation: "more",
        value: 2,
        unit: "percent",
        per: { path: "pact.distinctInstalledDestinyCount", divisor: 1 },
      }],
      ["이름이 다른 천명을 1개 장착할 때마다 자신이 받는 대미지 1% 감소(곱연산)", {
        stat: "distinct_destiny_damage_taken_reduction",
        operation: "add",
        value: 1,
        unit: "percent",
        per: { path: "pact.distinctInstalledDestinyCount", divisor: 1 },
        consumeBaseCondition: true,
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-mountain-god", {
    sourceRecordKey: "Dual_Kismet:_Mountain_God",
    lines: new Map([
      ["아머 수치의 2%가 장벽 흡수량에 추가", {
        stat: "armor_to_barrier_absorption_percent",
        operation: "add",
        value: 2,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-kismet-stone-bear", {
    sourceRecordKey: "Kismet:_Stone_Bear",
    lines: new Map([
      ["반환 시, 강건한 축복 을 1 회 획득한다.", {
        stat: "tenacity_blessing_stacks_gained_on_regain",
        operation: "set",
        value: 1,
        unit: "stacks",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-kismet-civet", {
    sourceRecordKey: "Kismet:_Civet",
    lines: new Map([
      ["이동 상태에서, 0.5 초당 황홀한 축복 1회 획득", [
        {
          stat: "agility_blessing_gain_interval",
          operation: "set",
          value: 0.5,
          unit: "seconds",
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "agility_blessing_stacks_gained_while_moving",
          operation: "set",
          value: 1,
          unit: "stacks",
          skillDamageApplicability: "configuration-only",
        },
      ]],
    ]),
  }],
  ["destiny-kismet-pale-fox", {
    sourceRecordKey: "Kismet:_Pale_Fox",
    lines: new Map([
      ["비 메인 스킬 사용 시, 집요한 축복 1 회 획득", {
        stat: "focus_blessing_stacks_gained_on_non_main_skill_use",
        operation: "set",
        value: 1,
        unit: "stacks",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-kismet-ice-soul", {
    sourceRecordKey: "Kismet:_Ice_Soul",
    lines: new Map([
      ["보초병 주변 적을 빙결 시킨다.", {
        stat: "sentry_freezes_nearby_enemies",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-kismet-deeproot", {
    sourceRecordKey: "Kismet:_Deeproot",
    lines: new Map([
      ["20레벨 정밀 재생 버프 획득", {
        stat: "precise_regeneration_buff_level",
        operation: "set",
        value: 20,
        unit: "level",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-sun-slash", {
    sourceRecordKey: "Dual_Kismet:_Sun_Slash",
    lines: new Map([
      ["빛나는 태양 획득", {
        stat: "blazing_sun",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-mammoth", {
    sourceRecordKey: "Dual_Kismet:_Mammoth",
    lines: new Map([
      ["적중 시, 20 레벨 부활의 함성 발동, 간격 3 초", [
        {
          stat: "resurrection_warcry_on_hit",
          operation: "set",
          value: 1,
          unit: "boolean",
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "resurrection_warcry_trigger_level",
          operation: "set",
          value: 20,
          unit: "level",
          skillDamageApplicability: "configuration-only",
        },
        {
          stat: "resurrection_warcry_trigger_interval",
          operation: "set",
          value: 3,
          unit: "seconds",
          skillDamageApplicability: "configuration-only",
        },
      ]],
    ]),
  }],
  ["destiny-dual-kismet-twin-cities", {
    sourceRecordKey: "Dual_Kismet:_Twin_Cities",
    lines: new Map([
      ["4초 간격으로 5초간 지속되는 12레벨 고통의 지연과 프로스트 쉴드를 교대로 획득한다.", [
        {
          stat: "alternating_delayed_pain_and_frost_shield",
          operation: "set",
          value: 1,
          unit: "boolean",
          skillDamageApplicability: "configuration-only",
          conditionMetadataExclusions: ["durationSeconds", "intervalSeconds"],
        },
        {
          stat: "delayed_pain_level",
          operation: "set",
          value: 12,
          unit: "level",
          skillDamageApplicability: "configuration-only",
          conditionMetadataExclusions: ["durationSeconds", "intervalSeconds"],
        },
        {
          stat: "frost_shield_level",
          operation: "set",
          value: 12,
          unit: "level",
          skillDamageApplicability: "configuration-only",
          conditionMetadataExclusions: ["durationSeconds", "intervalSeconds"],
        },
        {
          stat: "alternating_buff_interval",
          operation: "set",
          value: 4,
          unit: "seconds",
          skillDamageApplicability: "configuration-only",
          conditionMetadataExclusions: ["durationSeconds", "intervalSeconds"],
        },
        {
          stat: "alternating_buff_duration",
          operation: "set",
          value: 5,
          unit: "seconds",
          skillDamageApplicability: "configuration-only",
          conditionMetadataExclusions: ["durationSeconds", "intervalSeconds"],
        },
      ]],
    ]),
  }],
  ["destiny-dual-kismet-pointer", {
    sourceRecordKey: "Dual_Kismet:_Pointer",
    lines: new Map([
      ["편향 최대치 +1", {
        stat: "max_deflection",
        operation: "add",
        value: 1,
        unit: "flat",
        skillDamageApplicability: "configuration-only",
        conditionMetadataExclusions: ["cap"],
      }],
      ["편향 중첩 1회당 회피 수치 +8%", {
        stat: "evasion",
        operation: "increase",
        value: 8,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
        per: { path: "stacks.deflection", divisor: 1 },
        consumeBaseCondition: true,
      }],
    ]),
  }],
  ["destiny-dual-kismet-echidna", preciseFocusDualKismetDefinition(
    "Dual_Kismet:_Echidna",
    "서슬",
    "precise_acuteness_focus_buff_level",
  )],
  ["destiny-dual-kismet-viper", preciseFocusDualKismetDefinition(
    "Dual_Kismet:_Viper",
    "부식",
    "precise_corrosion_focus_buff_level",
  )],
  ["destiny-dual-kismet-mirror-cracks", {
    sourceRecordKey: "Dual_Kismet:_Mirror_Cracks",
    lines: new Map([
      ["실드 스킬 레벨 -3", {
        stat: "defensive_skill_level",
        operation: "add",
        value: -3,
        unit: "level",
        skillDamageApplicability: "configuration-only",
      }],
      ["실드 스킬 효과 +45%", {
        stat: "defensive_skill_effect",
        operation: "increase",
        value: 45,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-peerless", {
    sourceRecordKey: "Dual_Kismet:_Peerless",
    lines: new Map([
      ["콤보 피니시 스킬 시전 가능 횟수+1", {
        stat: "combo_finisher_charge",
        operation: "add",
        value: 1,
        unit: "flat",
        skillDamageApplicability: "configuration-only",
      }],
      ["콤보 시퀀스가 유지되고 초기화되지 않는 시간이 0.3 초로 고정된다.", {
        stat: "combo_sequence_reset_time",
        operation: "set",
        value: 0.3,
        unit: "seconds",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-rock-core", spiritOriginDualKismetDefinition(
    "Dual_Kismet:_Rock_Core",
    "반석의 영혼",
    "rock_magus_origin_effect_level",
  )],
  ["destiny-dual-kismet-fire-plume", spiritOriginDualKismetDefinition(
    "Dual_Kismet:_Fire_Plume",
    "화염의 영혼",
    "fire_magus_origin_effect_level",
  )],
  ["destiny-dual-kismet-thunder-branch", spiritOriginDualKismetDefinition(
    "Dual_Kismet:_Thunder_Branch",
    "번개의 영혼",
    "thunder_magus_origin_effect_level",
  )],
  ["destiny-dual-kismet-ice-flower", spiritOriginDualKismetDefinition(
    "Dual_Kismet:_Ice_Flower",
    "서리의 영혼",
    "frost_magus_origin_effect_level",
  )],
  ["destiny-dual-kismet-dark-moon", spiritOriginDualKismetDefinition(
    "Dual_Kismet:_Dark_Moon",
    "부패의 영혼",
    "erosion_magus_origin_effect_level",
  )],
  ["destiny-kismet-hawk", {
    sourceRecordKey: "Kismet:_Hawk",
    lines: new Map([
      ["실명 면역", {
        stat: "blind_immunity",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
      ["공격 투사체 스킬 사용 시, 주변 에 있는 적에게 실명 부여", {
        stat: "blind_nearby_enemies_on_attack_projectile_use",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-kismet-synthetic-heart", {
    sourceRecordKey: "Kismet:_Synthetic_Heart",
    lines: new Map([
      ["스마트 웨폰 최대 수량 +1", {
        stat: "max_synthetic_troop_quantity",
        operation: "add",
        value: 1,
        unit: "flat",
      }],
    ]),
  }],
  ["destiny-dual-kismet-resentful-maiden", {
    sourceRecordKey: "Dual_Kismet:_Resentful_Maiden",
    lines: new Map([
      ["부착 최대 수량 +1", {
        stat: "max_tangle_quantity",
        operation: "add",
        value: 1,
        unit: "flat",
      }],
      ["부착 지속 시간 +10%", {
        stat: "tangle_duration",
        operation: "increase",
        value: 10,
        unit: "percent",
      }],
    ]),
  }],
  ["destiny-dual-kismet-three-eyed-cat", {
    sourceRecordKey: "Dual_Kismet:_Three-Eyed_Cat",
    lines: new Map([
      ["MP 봉인 보상 -5%", {
        stat: "mana_sealed_compensation",
        operation: "increase",
        value: -5,
        unit: "percent",
      }],
      ["오라, 주입, 마령의 근원의 영향을 동시에 받을 경우 대미지 별도 +30%", {
        stat: "damage",
        operation: "more",
        value: 30,
        unit: "percent",
        conditionRequirements: [
          {
            path: "buffs.aura_focus_origin_of_spirit_magus",
            operator: "equals",
            expected: true,
          },
        ],
        consumeBaseCondition: true,
      }],
    ]),
  }],
  ["destiny-dual-kismet-two-headed-crow", {
    sourceRecordKey: "Dual_Kismet:_Two-Headed_Crow",
    lines: new Map([
      ["저주 1개를 추가로 부여할 수 있다.", {
        stat: "max_curses",
        operation: "add",
        value: 1,
        unit: "count",
      }],
    ]),
  }],
  ["destiny-dual-kismet-butterfly-in-a-bottle", {
    sourceRecordKey: "Dual_Kismet:_Butterfly_in_a_Bottle",
    lines: new Map([
      ["외상, 몰락, 점화 면역", {
        stat: "trauma_wilt_ignite_immunity",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-fish-in-a-cage", {
    sourceRecordKey: "Dual_Kismet:_Fish_in_a_Cage",
    lines: new Map([
      ["원소 상태 이상 면역", {
        stat: "elemental_ailment_immunity",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-bird-in-a-pond", {
    sourceRecordKey: "Dual_Kismet:_Bird_in_a_Pond",
    lines: new Map([
      ["제어류 상태 면역", {
        stat: "control_immunity",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
      }],
      ["방어 -25%", {
        stat: "defense_bonus_percent",
        operation: "increase",
        value: -25,
        unit: "percent",
      }],
    ]),
  }],
  ["destiny-dual-kismet-solid-rock", {
    sourceRecordKey: "Dual_Kismet:_Solid_Rock",
    lines: new Map([
      ["근접 스킬 사용 시 강직 을 1회 획득한다.", {
        stat: "gain_fortitude_on_melee_skill_use",
        operation: "set",
        value: 1,
        unit: "boolean",
        skillDamageApplicability: "configuration-only",
        consumeBaseCondition: true,
      }],
      ["강직 최대 중첩 수 +2", {
        stat: "max_fortitude_stacks",
        operation: "add",
        value: 2,
        unit: "flat",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-ghost-bee", {
    sourceRecordKey: "Dual_Kismet:_Ghost_Bee",
    lines: new Map([
      ["환영 정찰 범위 +50%", {
        stat: "shadow_tracking_area",
        operation: "increase",
        value: 50,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
      ["그림자 습격 스킬 범위 +50%", {
        stat: "shadow_strike_skill_area",
        operation: "increase",
        value: 50,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-spindle", {
    sourceRecordKey: "Dual_Kismet:_Spindle",
    lines: new Map([
      ["저주 스킬 범위 -50%", {
        stat: "curse_skill_area",
        operation: "increase",
        value: -50,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-spirit-orb", {
    sourceRecordKey: "Dual_Kismet:_Spirit_Orb",
    lines: new Map([
      ["정지 시, 0.5초당 공허 고스트 스피어 획득, 최대 5 회 중첩.", [
        {
          stat: "void_ghost_sphere_gain_interval",
          operation: "set",
          value: 0.5,
          unit: "seconds",
          conditionRequirements: [{
            id: "stationary",
            label: "정지",
            path: "statuses.moving",
            operator: "equals",
            expected: false,
          }],
          skillDamageApplicability: "configuration-only",
          consumeBaseCondition: true,
        },
        {
          stat: "max_void_ghost_sphere_stacks",
          operation: "set",
          value: 5,
          unit: "stacks",
          conditionRequirements: [{
            id: "stationary",
            label: "정지",
            path: "statuses.moving",
            operator: "equals",
            expected: false,
          }],
          skillDamageApplicability: "configuration-only",
          consumeBaseCondition: true,
        },
      ]],
    ]),
  }],
  ["destiny-dual-kismet-flash-flood", {
    sourceRecordKey: "Dual_Kismet:_Flash_Flood",
    lines: new Map([
      ["매직 버스트 최대치가 절반으로 감소", {
        stat: "skill_max_spell_burst",
        operation: "more",
        value: -50,
        unit: "percent",
      }],
      ["최근 매직 버스트 를 활성화할 때마다, 공격 및 시전 속도 추가 +8%, 최대 40%", {
        stat: "attack_and_cast_speed",
        operation: "more",
        value: 8,
        unit: "percent",
        per: {
          path: "recent.spellBurstActivationCount",
          divisor: 1,
          maxUnits: 5,
        },
        conditionMetadataExclusions: ["perTrigger", "cap"],
      }],
    ]),
  }],
  ["destiny-dual-kismet-god-27s-fall", {
    sourceRecordKey: "Dual_Kismet:_Gods_Fall",
    lines: new Map([
      ["전체 스킬 레벨 2 증가", {
        stat: "all_skill_levels",
        operation: "add",
        value: 2,
        unit: "level",
      }],
      ["스킬 시전 시 현재 HP 및 보호막 5% 상실", {
        stat: "current_life_and_shield_loss_on_skill_cast_percent",
        operation: "add",
        value: 5,
        unit: "percent",
        skillDamageApplicability: "configuration-only",
      }],
    ]),
  }],
  ["destiny-dual-kismet-wraith", {
    sourceRecordKey: "Dual_Kismet:_Wraith",
    lines: new Map([
      ["비 부식 대미지의 25%만큼 부식 대미지 추가", {
        stat: "skill_non_erosion_damage_as_erosion",
        operation: "add",
        value: 25,
        unit: "percent",
      }],
    ]),
  }],
]);

function specializedFixedDestinyEffects(item, locale, line, spans) {
  const definition = FIXED_DESTINY_EFFECT_DEFINITIONS.get(item?.id);
  if (!definition || locale?.sourceRecordKey !== definition.sourceRecordKey) return [];
  const effectOrEffects = definition.lines.get(line);
  if (!effectOrEffects) return [];
  for (const valueMatch of line.matchAll(/[+−-]?\d+(?:\.\d+)?/gu)) {
    addRecognizedSpan(spans, valueMatch, valueMatch[0]);
  }
  const effects = Array.isArray(effectOrEffects) ? effectOrEffects : [effectOrEffects];
  return effects.map((effect) => ({ ...effect }));
}

const DOUBLE_DAMAGE_DESTINY_RECORD_KEYS = new Map([
  ["destiny-micro-fate-double-damage-chance", "Micro_Fate:_Double_Damage_Chance"],
  ["destiny-medium-fate-double-damage-chance", "Medium_Fate:_Double_Damage_Chance"],
]);

const MULTISTRIKE_CHANCE_DESTINY_RECORD_KEYS = new Map([
  ["destiny-micro-fate-multistrike-chance", "Micro_Fate:_Multistrike_Chance"],
  ["destiny-medium-fate-multistrike-chance", "Medium_Fate:_Multistrike_Chance"],
  ["destiny-kismet-hound", "Kismet:_Hound"],
]);

const MULTISTRIKE_INCREMENT_DESTINY_RECORD_KEYS = new Map([
  ["destiny-micro-fate-multistrike-increment", "Micro_Fate:_Multistrike_Increment"],
  ["destiny-medium-fate-multistrike-increment", "Medium_Fate:_Multistrike_Increment"],
  ["destiny-kismet-hound", "Kismet:_Hound"],
]);

const MANA_BEFORE_LIFE_DESTINY_RECORD_KEYS = new Map([
  ["destiny-kismet-witch-cloak", "Kismet:_Witch_Cloak"],
]);

const AILMENT_DEFENSE_DESTINY_DEFINITIONS = new Map([
  ["destiny-micro-fate-deterioration-duration", {
    sourceRecordKey: "Micro_Fate:_Deterioration_Duration",
    lineRules: [{
      pattern: /^악화 지속 시간\s*\+(?<range>\(\s*[+-]?\d+(?:\.\d+)?\s*[–—~～〜]\s*[+-]?\d+(?:\.\d+)?\s*\))\s*%$/u,
      stat: "deterioration_duration",
    }],
  }],
  ["destiny-micro-fate-ignite-damage-mitigation", {
    sourceRecordKey: "Micro_Fate:_Ignite_Damage_Mitigation",
    lineRules: [
      {
        pattern: /^받는 점화 대미지 별도\s*(?<range>\(\s*[+-]?\d+(?:\.\d+)?\s*[–—~～〜]\s*[+-]?\d+(?:\.\d+)?\s*\))\s*%$/u,
        stat: "received_ignite_damage_additional",
      },
      {
        pattern: /^받는 점화 효과\s*(?<range>\(\s*[+-]?\d+(?:\.\d+)?\s*[–—~～〜]\s*[+-]?\d+(?:\.\d+)?\s*\))\s*%$/u,
        stat: "received_ignite_effect",
      },
    ],
  }],
  ["destiny-micro-fate-wilt-damage-mitigation", {
    sourceRecordKey: "Micro_Fate:_Wilt_Damage_Mitigation",
    lineRules: [{
      pattern: /^받는 몰락 대미지\s*(?<range>\(\s*[+-]?\d+(?:\.\d+)?\s*[–—~～〜]\s*[+-]?\d+(?:\.\d+)?\s*\))\s*%$/u,
      stat: "received_wilt_damage",
    }],
  }],
  ["destiny-micro-fate-trauma-damage-mitigation", {
    sourceRecordKey: "Micro_Fate:_Trauma_Damage_Mitigation",
    lineRules: [{
      pattern: /^받는 외상 대미지\s*(?<range>\(\s*[+-]?\d+(?:\.\d+)?\s*[–—~～〜]\s*[+-]?\d+(?:\.\d+)?\s*\))\s*%$/u,
      stat: "received_trauma_damage",
    }],
  }],
]);

function specializedMultistrikeChanceEffects(item, locale, line, lineIndex, spans) {
  const sourceRecordKey = MULTISTRIKE_CHANCE_DESTINY_RECORD_KEYS.get(item?.id);
  if (!sourceRecordKey || locale?.sourceRecordKey !== sourceRecordKey) return [];
  const match = line.match(
    /^연속 공격 확률\s*\+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\))\s*%$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "chance_to_multistrike",
    operation: "add",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:chance_to_multistrike:${match.index ?? 0}`,
    unit: "percent",
  }];
}

function specializedMultistrikeIncrementEffects(item, locale, line, lineIndex, spans) {
  const sourceRecordKey = MULTISTRIKE_INCREMENT_DESTINY_RECORD_KEYS.get(item?.id);
  if (!sourceRecordKey || locale?.sourceRecordKey !== sourceRecordKey) return [];
  const match = line.match(
    /^연속 공격 대미지\s*(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\))\s*%\s*씩 증가$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "multistrike_damage_increment",
    operation: "add",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:multistrike_damage_increment:${match.index ?? 0}`,
    unit: "percent",
  }];
}

function specializedManaBeforeLifeEffects(item, locale, line, lineIndex, spans) {
  const sourceRecordKey = MANA_BEFORE_LIFE_DESTINY_RECORD_KEYS.get(item?.id);
  if (!sourceRecordKey || locale?.sourceRecordKey !== sourceRecordKey) return [];
  const match = line.match(
    /^대미지\s*(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\))\s*%\s*가\s*MP를 먼저 차감$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat: "damage_taken_from_mana_before_life_percent",
    operation: "add",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:damage_taken_from_mana_before_life_percent:${match.index ?? 0}`,
    unit: "percent",
  }];
}

function specializedAilmentDefenseEffects(item, locale, line, lineIndex, spans) {
  const definition = AILMENT_DEFENSE_DESTINY_DEFINITIONS.get(item?.id);
  if (!definition || locale?.sourceRecordKey !== definition.sourceRecordKey) return [];
  for (const rule of definition.lineRules) {
    const match = line.match(rule.pattern);
    if (!match?.groups) continue;
    const parsed = parsedDirectValue(match.groups.range);
    if (!parsed?.roll) return [];
    addRecognizedSpan(spans, match, match.groups.range);
    return [{
      stat: rule.stat,
      operation: "add",
      value: null,
      roll: parsed.roll,
      rollKey: `${item.id}:${lineIndex}:${rule.stat}:${match.index ?? 0}`,
      unit: "percent",
    }];
  }
  return [];
}

function specializedDoubleDamageEffects(item, locale, line, lineIndex, spans) {
  const sourceRecordKey = DOUBLE_DAMAGE_DESTINY_RECORD_KEYS.get(item?.id);
  if (!sourceRecordKey || locale?.sourceRecordKey !== sourceRecordKey) return [];
  const match = line.match(
    /^(?<minion>소환체는\s*)?\+(?<range>\(\s*\d+(?:\.\d+)?\s*[–—~～〜]\s*\d+(?:\.\d+)?\s*\))\s*%\s*확률로\s*이중 대미지 부여[.]?$/u,
  );
  if (!match?.groups) return [];
  const parsed = parsedDirectValue(match.groups.range);
  if (!parsed?.roll) return [];
  const stat = match.groups.minion
    ? "minion_double_damage_chance"
    : "double_damage_chance";
  addRecognizedSpan(spans, match, match.groups.range);
  return [{
    stat,
    operation: "add",
    value: null,
    roll: parsed.roll,
    rollKey: `${item.id}:${lineIndex}:${stat}:${match.index ?? 0}`,
    unit: "percent",
  }];
}

function recognizedNumericSpans(line, spans) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*미터/u,
    /(\d+(?:\.\d+)?)\s*m(?:\s|$)/iu,
    /(\d+(?:\.\d+)?)\s*명/u,
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) addRecognizedSpan(spans, match, match[1]);
  }
}

function unknownNumbers(line, spans) {
  const unknown = [];
  NUMBER_PATTERN.lastIndex = 0;
  for (const match of line.matchAll(NUMBER_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!spans.some(([left, right]) => start < right && end > left)) unknown.push(match[0]);
  }
  return unknown;
}

function isStructuralLine(line) {
  return STRUCTURAL_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function blockerKey(blocker) {
  return `${blocker.reason}\u0000${blocker.sourceText}`;
}

function addBlocker(blockers, seen, sourceText, reason) {
  const blocker = { sourceText, reason };
  const key = blockerKey(blocker);
  if (seen.has(key)) return;
  seen.add(key);
  blockers.push(blocker);
}

function numericBlockerReason(line, parsedCount, ranged) {
  const partialPrefix = parsedCount ? "partially-parsed-" : "";
  if (/\$[+−-]?[a-z0-9_]+\$/iu.test(line)) return `${partialPrefix}source-placeholder-unresolved`;
  if (/전환|동일하게 적용|먼저 차감|전이/u.test(line)) return `${partialPrefix}conversion-runtime-required`;
  if (/중첩|(?:포인트|회|개|명|레벨)\s*(?:당|마다)|때마다/u.test(line)) {
    return `${partialPrefix}stacking-runtime-required`;
  }
  if (/확률|적중\s*시|처치\s*시|시전\s*시|획득\s*시|부여\s*시/u.test(line)) {
    return `${partialPrefix}trigger-runtime-required`;
  }
  if (/상실|소모(?:한다|로 전환)?/u.test(line)) return `${partialPrefix}resource-cost-runtime-required`;
  if (/고정|설정/u.test(line)) return `${partialPrefix}set-stat-unmapped`;
  if (ranged) return `${partialPrefix}unsupported-range-mechanic`;
  return parsedCount ? "partially-parsed-numeric-mechanic" : "unsupported-numeric-mechanic";
}

function localeName(locale) {
  return typeof locale?.name === "string" ? locale.name.trim() : "";
}

function spiritSection(line, currentSection) {
  if (/^(?:공격|생존|수집) 강화$/u.test(line)) return "base";
  if (line === "승급 보상") return "promotion";
  return currentSection;
}

export function parseTlidbOtherTooltipCalculation(item) {
  const categoryId = item?.categoryId;
  const sourceText = sourceTextForBlocker(item);
  if (!TARGET_CATEGORIES.has(categoryId)) {
    return freezeResult([], [{ sourceText, reason: "unsupported-category" }]);
  }
  if (item?.sourceConflict) {
    return freezeResult([], [{ sourceText, reason: "source-conflict" }]);
  }

  const resolved = resolveExactLocale(item);
  if (!resolved.locale) return freezeResult([], [resolved.blocker]);

  const locale = resolved.locale;
  const lines = locale.detail.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const effects = [];
  const blockers = [];
  const seenBlockers = new Set();
  let section = "";
  let sectionText = "";
  let pendingCondition = "";

  for (const [lineIndex, line] of lines.entries()) {
    const lineEffectStart = effects.length;
    if (categoryId === "spirits") {
      const nextSection = spiritSection(line, section);
      if (nextSection !== section || /^(?:공격|생존|수집) 강화$|^승급 보상$/u.test(line)) {
        sectionText = line;
      }
      section = nextSection;
    }
    if (ACTIVATION_HEADER_PATTERN.test(line)) {
      pendingCondition = line.replace(/[:.]$/u, "").trim();
      continue;
    }
    if (isStructuralLine(line) || (line === localeName(locale) && !/[+−-]?\d/u.test(line))) continue;
    if (categoryId === "spirits" && !/[+−-]?\d/u.test(line) && line.length <= 30 && !/[.。]/u.test(line)) {
      continue;
    }
    const spans = [];
    const specialized = specializedRecoveryEffects(line, spans);
    const fixedDestiny = specializedFixedDestinyEffects(item, locale, line, spans);
    const tripleDamage = specializedTripleDamageEffects(item, locale, line, lineIndex, spans);
    const scaleDifferentWeapon = specializedScaleDifferentWeaponEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const ashes = specializedAshesEffects(item, locale, line, lineIndex, spans);
    const volcano = specializedVolcanoEffects(item, locale, line, lineIndex, spans);
    const guillotine = specializedGuillotineEffects(item, locale, line, lineIndex, spans);
    const windChime = specializedWindChimeEffects(item, locale, line, lineIndex, spans);
    const bouquet = specializedBouquetEffects(item, locale, line, lineIndex, spans);
    const tigerRoar = specializedTigerRoarEffects(item, locale, line, lineIndex, spans);
    const scorpionStinger = specializedScorpionStingerEffects(item, locale, line, lineIndex, spans);
    const ripple = specializedRippleEffects(item, locale, line, lineIndex, spans);
    const lion = specializedLionEffects(item, locale, line, lineIndex, spans);
    const mouthOfSpring = specializedMouthOfSpringEffects(item, locale, line, lineIndex, spans);
    const shield = specializedShieldEffects(item, locale, line, lineIndex, spans);
    const creek = specializedCreekEffects(item, locale, line, lineIndex, spans);
    const evilFlame = specializedEvilFlameEffects(item, locale, line, spans);
    const warHammer = specializedWarHammerEffects(item, locale, line, lineIndex, spans);
    const prosthetics = specializedProstheticsEffects(item, locale, line, lineIndex, spans);
    const doubleBlade = specializedDoubleBladeEffects(item, locale, line, lineIndex, spans);
    const redLeechCritical = specializedRedLeechCriticalEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const giantBearCriticalDamage = specializedGiantBearCriticalDamageEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const multistrikeChance = specializedMultistrikeChanceEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const multistrikeIncrement = specializedMultistrikeIncrementEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const manaBeforeLife = specializedManaBeforeLifeEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const ailmentDefense = specializedAilmentDefenseEffects(
      item,
      locale,
      line,
      lineIndex,
      spans,
    );
    const doubleDamage = specializedDoubleDamageEffects(item, locale, line, lineIndex, spans);
    const direct = directMatches(line).filter((match) => !(
      (
        specialized.length
        && /회복/u.test(line)
        && ["maxLife", "maxMana", "maxShield"].includes(match.stat)
      )
      || fixedDestiny.length
      || (/먼저 차감/u.test(line) && match.stat === "damage")
      || (/^연속 공격 대미지/u.test(line) && match.stat === "attackDamage")
      || (/^받는 (?:점화|몰락|외상) 대미지/u.test(line) && match.stat === "damage")
      || (scaleDifferentWeapon.length && match.stat === "attackDamage")
      || (ashes.length && ["fireDamage", "igniteChance"].includes(match.stat))
      || (volcano.length && ["igniteChance", "igniteDuration", "igniteLimit"].includes(match.stat))
      || (bouquet.length && match.stat === "damage")
      || (tigerRoar.length && match.stat === "damage")
      || (scorpionStinger.length && ["skillEffectDuration", "harvestRecoverySpeed"].includes(match.stat))
      || (ripple.length && match.stat === "skillArea")
      || (mouthOfSpring.length && ["magicBurstChargeSpeed", "damageTaken"].includes(match.stat))
      || (shield.length && match.stat === "movementSpeed")
      || (creek.length && match.stat === "movementSpeed")
      || (doubleBlade.length && match.stat === "criticalRating")
      || (redLeechCritical.length && ["criticalRating", "criticalDamage"].includes(match.stat))
      || (giantBearCriticalDamage.length && match.stat === "criticalDamage")
    ));
    for (const match of direct) spans.push([match.valueStart, match.valueStart + match.valueText.length]);
    recognizedNumericSpans(line, spans);

    const firstEffectStart = Math.min(
      direct[0]?.start ?? Number.POSITIVE_INFINITY,
      specialized.length ? line.search(/초당|HP|MP|보호막/u) : Number.POSITIVE_INFINITY,
      fixedDestiny.length ? 0 : Number.POSITIVE_INFINITY,
      tripleDamage.length ? 0 : Number.POSITIVE_INFINITY,
      scaleDifferentWeapon.length ? 0 : Number.POSITIVE_INFINITY,
      ashes.length ? 0 : Number.POSITIVE_INFINITY,
      volcano.length ? 0 : Number.POSITIVE_INFINITY,
      guillotine.length ? 0 : Number.POSITIVE_INFINITY,
      windChime.length ? 0 : Number.POSITIVE_INFINITY,
      bouquet.length ? 0 : Number.POSITIVE_INFINITY,
      tigerRoar.length ? 0 : Number.POSITIVE_INFINITY,
      scorpionStinger.length ? 0 : Number.POSITIVE_INFINITY,
      ripple.length ? 0 : Number.POSITIVE_INFINITY,
      lion.length ? 0 : Number.POSITIVE_INFINITY,
      mouthOfSpring.length ? 0 : Number.POSITIVE_INFINITY,
      shield.length ? 0 : Number.POSITIVE_INFINITY,
      creek.length ? 0 : Number.POSITIVE_INFINITY,
      evilFlame.length ? 0 : Number.POSITIVE_INFINITY,
      warHammer.length ? 0 : Number.POSITIVE_INFINITY,
      prosthetics.length ? 0 : Number.POSITIVE_INFINITY,
      doubleBlade.length ? 0 : Number.POSITIVE_INFINITY,
      redLeechCritical.length ? 0 : Number.POSITIVE_INFINITY,
      giantBearCriticalDamage.length ? 0 : Number.POSITIVE_INFINITY,
      multistrikeChance.length ? 0 : Number.POSITIVE_INFINITY,
      multistrikeIncrement.length ? 0 : Number.POSITIVE_INFINITY,
      manaBeforeLife.length ? 0 : Number.POSITIVE_INFINITY,
      ailmentDefense.length ? 0 : Number.POSITIVE_INFINITY,
      doubleDamage.length ? 0 : Number.POSITIVE_INFINITY,
    );
    const prefix = Number.isFinite(firstEffectStart) ? conditionPrefix(line, firstEffectStart) : "";
    const baseCondition = metadataCondition(line, prefix, {
      pendingCondition,
      section: categoryId === "spirits" ? section : "",
      sectionText: categoryId === "spirits" ? sectionText : "",
    }, spans);

    for (const match of direct) {
      const stat = snakeStat(match.stat);
      const configurationStat = exactSentryConfigurationStat(item, locale, line, stat);
      const outputStat = configurationStat ?? stat;
      effects.push({
        stat: outputStat,
        operation: match.operation,
        value: match.value,
        ...(match.roll ? { roll: { ...match.roll } } : {}),
        ...(match.roll ? { rollKey: `${item.id}:${lineIndex}:${outputStat}:${match.start}` } : {}),
        unit: match.unit,
        ...(configurationStat
          ? { skillDamageApplicability: "configuration-only" }
          : {}),
        ...effectConditionFields(baseCondition),
        sourceText: line,
      });
    }
    for (const [specializedIndex, effect] of specialized.entries()) {
      const condition = {
        ...(effect.consumeBaseCondition ? {} : baseCondition ?? {}),
        ...(effect.localCondition ?? {}),
      };
      const conditionFields = effectConditionFields(Object.keys(condition).length ? condition : null);
      const conditionMetadata = {
        ...(conditionFields.conditionMetadata ?? {}),
        ...(effect.localMetadata ?? {}),
      };
      effects.push({
        stat: snakeStat(effect.stat),
        operation: effect.operation,
        value: effect.value,
        ...(effect.roll ? { roll: { ...effect.roll } } : {}),
        ...(effect.roll ? {
          rollKey: `${item.id}:${lineIndex}:${snakeStat(effect.stat)}:${specializedIndex}`,
        } : {}),
        unit: effect.unit,
        ...conditionFields,
        ...(Object.keys(conditionMetadata).length ? { conditionMetadata } : {}),
        sourceText: line,
      });
    }
    for (const effect of fixedDestiny) {
      const {
        consumeBaseCondition = false,
        conditionMetadataExclusions = [],
        ...output
      } = effect;
      const baseConditionFields = consumeBaseCondition ? {} : effectConditionFields(baseCondition);
      const conditionFields = conditionMetadataExclusions.length && baseConditionFields.conditionMetadata
        ? (() => {
          const { conditionMetadata, ...fields } = baseConditionFields;
          const filteredMetadata = Object.fromEntries(
            Object.entries(conditionMetadata).filter(([key]) => (
              !conditionMetadataExclusions.includes(key)
            )),
          );
          return {
            ...fields,
            ...(Object.keys(filteredMetadata).length ? { conditionMetadata: filteredMetadata } : {}),
          };
        })()
        : baseConditionFields;
      effects.push({
        ...output,
        ...conditionFields,
        sourceText: line,
      });
    }
    for (const effect of tripleDamage) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of scaleDifferentWeapon) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of ashes) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of volcano) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of guillotine) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of windChime) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of bouquet) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of tigerRoar) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of scorpionStinger) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of ripple) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of lion) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of mouthOfSpring) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of shield) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of creek) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of evilFlame) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of warHammer) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of prosthetics) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of doubleBlade) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of redLeechCritical) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of giantBearCriticalDamage) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of multistrikeChance) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of multistrikeIncrement) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of manaBeforeLife) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of ailmentDefense) {
      effects.push({ ...effect, sourceText: line });
    }
    for (const effect of doubleDamage) {
      effects.push({ ...effect, sourceText: line });
    }

    const parsedCount = direct.length
      + specialized.length
      + fixedDestiny.length
      + tripleDamage.length
      + scaleDifferentWeapon.length
      + ashes.length
      + volcano.length
      + guillotine.length
      + windChime.length
      + bouquet.length
      + tigerRoar.length
      + scorpionStinger.length
      + ripple.length
      + lion.length
      + mouthOfSpring.length
      + shield.length
      + creek.length
      + evilFlame.length
      + warHammer.length
      + prosthetics.length
      + doubleBlade.length
      + redLeechCritical.length
      + giantBearCriticalDamage.length
      + multistrikeChance.length
      + multistrikeIncrement.length
      + manaBeforeLife.length
      + ailmentDefense.length
      + doubleDamage.length;
    const unrecognized = unknownNumbers(line, spans);
    if ((RANGE_PATTERN.test(line) && !parsedCount) || unrecognized.length) {
      const reason = numericBlockerReason(line, parsedCount, RANGE_PATTERN.test(line));
      addBlocker(
        blockers,
        seenBlockers,
        line,
        reason,
      );
      if (parsedCount && reason.startsWith("partially-parsed-")) {
        for (const effect of effects.slice(lineEffectStart)) effect.condition = line;
      }
    } else if (!parsedCount && !isStructuralLine(line)) {
      addBlocker(blockers, seenBlockers, line, "unsupported-qualitative-mechanic");
    }
    if (parsedCount) pendingCondition = "";
  }

  if (!effects.length && !blockers.length) {
    addBlocker(blockers, seenBlockers, locale.detail.trim(), "no-calculable-tooltip-effect");
  }
  return freezeResult(effects, blockers);
}

function emptyCategoryAccounting() {
  return {
    totalRows: 0,
    parsedRows: 0,
    partialRows: 0,
    blockedRows: 0,
    accountedRows: 0,
    unaccountedRows: 0,
    effectCount: 0,
    blockerCount: 0,
  };
}

export function accountTlidbOtherTooltipCatalog(catalog) {
  const categories = Object.fromEntries(
    TLIDB_OTHER_TOOLTIP_CATEGORIES.map((categoryId) => [categoryId, emptyCategoryAccounting()]),
  );
  const blockerReasons = {};

  for (const categoryId of TLIDB_OTHER_TOOLTIP_CATEGORIES) {
    for (const item of catalog?.[categoryId] ?? []) {
      const result = parseTlidbOtherTooltipCalculation({ ...item, categoryId });
      const category = categories[categoryId];
      category.totalRows += 1;
      category.effectCount += result.effects.length;
      category.blockerCount += result.blockers.length;
      if (result.effects.length && result.blockers.length) category.partialRows += 1;
      else if (result.effects.length) category.parsedRows += 1;
      else if (result.blockers.length) category.blockedRows += 1;
      else category.unaccountedRows += 1;
      for (const blocker of result.blockers) {
        blockerReasons[blocker.reason] = (blockerReasons[blocker.reason] ?? 0) + 1;
      }
    }
    const category = categories[categoryId];
    category.accountedRows = category.parsedRows + category.partialRows + category.blockedRows;
  }

  const totals = Object.values(categories).reduce((summary, category) => ({
    totalRows: summary.totalRows + category.totalRows,
    parsedRows: summary.parsedRows + category.parsedRows,
    partialRows: summary.partialRows + category.partialRows,
    blockedRows: summary.blockedRows + category.blockedRows,
    accountedRows: summary.accountedRows + category.accountedRows,
    unaccountedRows: summary.unaccountedRows + category.unaccountedRows,
    effectCount: summary.effectCount + category.effectCount,
    blockerCount: summary.blockerCount + category.blockerCount,
  }), emptyCategoryAccounting());

  return Object.freeze({
    ...totals,
    categories: Object.freeze(Object.fromEntries(
      Object.entries(categories).map(([categoryId, category]) => [categoryId, Object.freeze({ ...category })]),
    )),
    blockerReasons: Object.freeze({ ...blockerReasons }),
  });
}
