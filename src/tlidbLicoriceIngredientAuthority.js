const SOURCE = Object.freeze({
  sourceUrl: "https://tlidb.com/ko/Licorice_Note",
  sourceRecordKey: "Licorice_Note",
  sourcePageSha256: "51715c51c51af33f87cc30eb4d48cb6f74e5d992c1d607c1c39515cda430c57d",
  sourcePageVersion: "SS13",
});

const SPECIAL_TRAIT_SELECTION_KEY = "hero-trait:Licorice_Note:75:1:%E5%A4%8D%E8%B0%83%E7%94%98%E8%8D%89%E9%85%8A";

function ingredient(entry) {
  return Object.freeze({
    ...entry,
    values: entry.values ? Object.freeze([...entry.values]) : undefined,
    tierProfiles: entry.tierProfiles
      ? Object.freeze(entry.tierProfiles.map((profile) => Object.freeze({
        ...profile,
        effects: Object.freeze(profile.effects.map((effect) => Object.freeze({ ...effect }))),
      })))
      : undefined,
    sourceRecordKey: `elixir-ingredient:Licorice_Note:${entry.traitAlt}`,
  });
}

function specialTierProfile(sourceText, effects) {
  return { sourceText, effects };
}

const ingredients = Object.freeze([
  ingredient({
    id: "sharp-leaf-grass",
    koName: "샤프 리프 그래스",
    stageId: "licorice-note-lv1",
    traitAlt: "UISage001:0:0",
    effectClass: "critical-only-damage",
    values: [10, 11, 12, 13, 14],
    sourceText: "해당 스킬이 추가 기본 효과 획득: 자신과 소환체가 크리티컬 발동 시 대미지 별도 +10 %",
    calculationSupport: "base-level-critical-hit",
  }),
  ingredient({
    id: "double-thorn-flower",
    koName: "트윈 스파이크 블룸",
    stageId: "licorice-note-lv1",
    traitAlt: "UISage001:0:1",
    effectClass: "reaping-repeat-chance",
    values: [10, 11, 12, 13, 14],
    sourceText: "해당 스킬이 추가 기본 효과 획득: 수확 시 +10 % 확률로 2회 수확 한다.",
    calculationSupport: "base-level-reaping-repeat-chance",
  }),
  ingredient({
    id: "diffuse-spores",
    koName: "디퓨징 포자",
    stageId: "licorice-note-lv1",
    traitAlt: "UISage001:0:2",
    effectClass: "nearby-enemy-damage-taken",
    values: [6, 7, 8, 9, 10],
    sourceText: "해당 스킬이 추가 기본 효과 획득: 해당 스킬 시전 시 15미터 안에 있는 적이 받는 대미지 별도 +6 % , 최대 2회 중첩, 8초간 지속한다.",
    calculationSupport: "one-guaranteed-stack",
    unsupportedReason: "elixir-ingredient-additional-stack-state-unavailable",
  }),
  ingredient({
    id: "tenacious-moss",
    koName: "터프 이끼",
    stageId: "licorice-note-lv1",
    traitAlt: "UISage001:1:0",
    effectClass: "damage-transfer-to-minion",
    values: [6, 7, 8, 9, 10],
    sourceText: "해당 스킬은 추가 기본 효과 획득: 받는 대미지의 6 % 가 랜덤 소환체에게 전이 된다.",
    calculationSupport: "base-level-random-minion-transfer-rate",
  }),
  ingredient({
    id: "ghost-pistil",
    koName: "유령 꽃술",
    stageId: "licorice-note-lv1",
    traitAlt: "UISage001:1:1",
    effectClass: "damage-deducted-from-mana",
    values: [6, 7, 8, 9, 10],
    sourceText: "해당 스킬이 추가 기본 효과 획득: 대미지의 6 % 를 MP로 우선 차감한다.",
    calculationSupport: "base-level-mana-before-life",
  }),
  ingredient({
    id: "chameleon-vine",
    koName: "카멜레온 넝쿨",
    stageId: "licorice-note-lv1",
    traitAlt: "UISage001:1:2",
    effectClass: "physical-damage-taken-conversion",
    values: [6, 7, 8, 9, 10],
    sourceText: "해당 스킬이 추가 기본 효과 획득: 받은 물리 대미지의 6 % 를 랜덤 원소 대미지로 전환한다.",
    calculationSupport: "base-level-physical-damage-taken-conversion-rate",
  }),
  ingredient({
    id: "pod-shell",
    koName: "협과 껍질",
    stageId: "licorice-note-lv45",
    traitAlt: "UISage011:0:0",
    effectClass: "critical-charge-progress",
    values: [3, 4, 5, 5, 6],
    sourceText: "크리티컬 시 해당 스킬은 충전 진행도를 ( 3 / 4 / 5 / 5 / 6 ) 획득한다. 0.5 초 간격(영약 스킬 효과의 영향을 받지 않음)",
    calculationSupport: "base-level-charge-progress-on-critical",
  }),
  ingredient({
    id: "gladiolus-leaf",
    koName: "글라디올러스 잎",
    stageId: "licorice-note-lv45",
    traitAlt: "UISage011:0:1",
    effectClass: "reaping-charge-progress",
    values: [3, 4, 5, 5, 6],
    sourceText: "수확 부여 시 해당 스킬은 충전 진행도를 ( 3 / 4 / 5 / 5 / 6 ) 획득한다. 0.5 초 간격(영약 스킬 효과의 영향을 받지 않음)",
    calculationSupport: "base-level-charge-progress-on-reaping",
  }),
  ingredient({
    id: "tumbleweed-seed",
    koName: "텀블위드 씨앗",
    stageId: "licorice-note-lv45",
    traitAlt: "UISage011:0:2",
    effectClass: "movement-charge-progress",
    values: [2, 3, 4, 4, 5],
    sourceText: "6 미터 이동할 때마다 해당 스킬은 충전 진행도를 ( 2 / 3 / 4 / 4 / 5 ) 획득한다. 0.5 초 간격(영약 스킬 효과의 영향을 받지 않음)",
    calculationSupport: "base-level-charge-progress-per-six-meters",
  }),
  ingredient({
    id: "fairy-tears",
    koName: "요정의 눈물",
    stageId: "licorice-note-lv75",
    traitChoiceId: "licorice-note-uisage032",
    traitSelectionKey: SPECIAL_TRAIT_SELECTION_KEY,
    traitAlt: "UISage032:0:0",
    effectClass: "overflow-life-to-shield-and-shield-scaled-damage",
    calculationSupport: "selected-trait-tier-direct-statistics",
    tierProfiles: [
      specialTierProfile(
        "해당 스킬이 추가 기본 효과 획득: 과잉 HP 회복의 80 % 가 보호막 회복에 적용되지만 보호막 충전 및 반환이 불가하다. 현재 보유한 최대 보호막 400 포인트당 자신과 소환체 대미지 별도 +1 % , 최대치 +40 % (영약 스킬 효과의 영향을 받지 않음)",
        [
          { stat: "overflowLifeRecoveryAppliedToShieldPercent", value: 80, unit: "percent" },
          { stat: "maximumShieldPerSelfAndMinionDamageStep", value: 400, unit: "flat" },
          { stat: "selfAndMinionDamageMorePerMaximumShieldStepPercent", value: 1, unit: "percent" },
          { stat: "selfAndMinionDamageMoreFromMaximumShieldCapPercent", value: 40, unit: "percent" },
        ],
      ),
      specialTierProfile(
        "해당 스킬이 추가 기본 효과 획득: 과잉 HP 회복의 90 % 가 보호막 회복에 적용되지만 보호막 충전 및 반환이 불가하다. 현재 보유한 최대 보호막 400 포인트당 자신과 소환체 대미지 별도 1.2 % , 최대치 +48 % (영약 스킬 효과의 영향을 받지 않음)",
        [
          { stat: "overflowLifeRecoveryAppliedToShieldPercent", value: 90, unit: "percent" },
          { stat: "maximumShieldPerSelfAndMinionDamageStep", value: 400, unit: "flat" },
          { stat: "selfAndMinionDamageMorePerMaximumShieldStepPercent", value: 1.2, unit: "percent" },
          { stat: "selfAndMinionDamageMoreFromMaximumShieldCapPercent", value: 48, unit: "percent" },
        ],
      ),
      specialTierProfile(
        "해당 스킬이 추가 기본 효과 획득: 과잉 HP 회복의 100 % 가 보호막 회복에 적용되지만 보호막 충전 및 반환이 불가하다. 현재 보유한 최대 보호막 400 포인트당 자신과 소환체 대미지 별도 1.4 % , 최대치 +56 % (영약 스킬 효과의 영향을 받지 않음)",
        [
          { stat: "overflowLifeRecoveryAppliedToShieldPercent", value: 100, unit: "percent" },
          { stat: "maximumShieldPerSelfAndMinionDamageStep", value: 400, unit: "flat" },
          { stat: "selfAndMinionDamageMorePerMaximumShieldStepPercent", value: 1.4, unit: "percent" },
          { stat: "selfAndMinionDamageMoreFromMaximumShieldCapPercent", value: 56, unit: "percent" },
        ],
      ),
      specialTierProfile(
        "해당 스킬이 추가 기본 효과 획득: 과잉 HP 회복의 110 % 가 보호막 회복에 적용되지만 보호막 충전 및 반환이 불가하다. 현재 보유한 최대 보호막 400 포인트당 자신과 소환체 대미지 별도 1.6 % , 최대치 +62 % (영약 스킬 효과의 영향을 받지 않음)",
        [
          { stat: "overflowLifeRecoveryAppliedToShieldPercent", value: 110, unit: "percent" },
          { stat: "maximumShieldPerSelfAndMinionDamageStep", value: 400, unit: "flat" },
          { stat: "selfAndMinionDamageMorePerMaximumShieldStepPercent", value: 1.6, unit: "percent" },
          { stat: "selfAndMinionDamageMoreFromMaximumShieldCapPercent", value: 62, unit: "percent" },
        ],
      ),
      specialTierProfile(
        "해당 스킬이 추가 기본 효과 획득: 과잉 HP 회복의 120 % 가 보호막 회복에 적용되지만 보호막 충전 및 반환이 불가하다. 현재 보유한 최대 보호막 400 포인트당 자신과 소환체 대미지 별도 1.8 % , 최대치 +70 % (영약 스킬 효과의 영향을 받지 않음)",
        [
          { stat: "overflowLifeRecoveryAppliedToShieldPercent", value: 120, unit: "percent" },
          { stat: "maximumShieldPerSelfAndMinionDamageStep", value: 400, unit: "flat" },
          { stat: "selfAndMinionDamageMorePerMaximumShieldStepPercent", value: 1.8, unit: "percent" },
          { stat: "selfAndMinionDamageMoreFromMaximumShieldCapPercent", value: 70, unit: "percent" },
        ],
      ),
    ],
  }),
  ingredient({
    id: "thunder-dragon-scale",
    koName: "뇌룡의 비늘",
    stageId: "licorice-note-lv75",
    traitChoiceId: "licorice-note-uisage032",
    traitSelectionKey: SPECIAL_TRAIT_SELECTION_KEY,
    traitAlt: "UISage032:0:1",
    effectClass: "kill-explosion-and-damage",
    calculationSupport: "selected-trait-tier-direct-statistics",
    tierProfiles: [0, 5, 10, 15, 20].map((damage, index) => specialTierProfile(
      index === 0
        ? "해당 스킬이 추가 기본 효과 획득: 자신과 소환체의 공격 또는 주술로 적 처치 시 30 % 확률로 폭발하여 반경 6 미터 내의 적에게 처치된 적의 최대 HP 250 % 만큼 트루 대미지를 입힌다.(영약 스킬 효과의 영향을 받지 않음)"
        : `해당 스킬이 추가 기본 효과 획득: 자신과 소환체의 공격 또는 주술로 적 처치 시 30 % 확률로 폭발하여 반경 6 미터 내의 적에게 처치된 적의 최대 HP 250 % 만큼 트루 대미지를 입힌다. 자신과 소환체의 대미지 별도 + ${damage} % (영약 스킬 효과의 영향을 받지 않음)`,
      [
        { stat: "selfAndMinionKillExplosionChancePercent", value: 30, unit: "percent" },
        {
          stat: "selfAndMinionKillExplosionEnemyMaxLifeTrueDamagePercent",
          value: 250,
          unit: "percent",
        },
        { stat: "selfAndMinionKillExplosionRadiusMeters", value: 6, unit: "meters" },
        ...(damage > 0
          ? [{ stat: "selfAndMinionDamageMorePercent", value: damage, unit: "percent" }]
          : []),
      ],
    )),
  }),
  ingredient({
    id: "gargoyle-horn",
    koName: "가고일의 뿔",
    stageId: "licorice-note-lv75",
    traitChoiceId: "licorice-note-uisage032",
    traitSelectionKey: SPECIAL_TRAIT_SELECTION_KEY,
    traitAlt: "UISage032:0:2",
    effectClass: "block-chance-and-self-damage",
    calculationSupport: "selected-trait-tier-direct-statistics",
    tierProfiles: [
      [70, 6],
      [90, 4.5],
      [110, 3],
      [130, 1.5],
      [150, 0],
    ].map(([blockChance, selfDamage]) => specialTierProfile(
      `해당 스킬이 추가 기본 효과 획득: 막기 확률이 ${blockChance} % 추가로 증가하지만, 막기 성공 후 초당 감면된 대미지의 ${selfDamage} % 에 해당하는 트루 대미지를 받으며, 4초간 지속한다. (영약 스킬 효과의 영향을 받지 않음)`,
      [
        { stat: "blockChanceAdditionalIncreasePercent", value: blockChance, unit: "percent" },
        {
          stat: "blockedDamageTrueDamageTakenPercentPerSecond",
          value: selfDamage,
          unit: "percent_per_second",
        },
        { stat: "blockedDamageTrueDamageDurationSeconds", value: 4, unit: "seconds" },
      ],
    )),
  }),
]);

const ingredientById = new Map(ingredients.map((entry) => [entry.id, entry]));

export const TLIDB_LICORICE_INGREDIENT_AUTHORITY = Object.freeze({
  ...SOURCE,
  heroId: "hero-tlidb-com-cn-licorice-note",
  ingredients,
});

export function getTlidbLicoriceIngredientAuthority(ingredientId) {
  return ingredientById.get(ingredientId) ?? null;
}
