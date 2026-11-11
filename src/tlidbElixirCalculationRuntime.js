import { findItemById } from "./catalog.js";
import { resolveConditionValues } from "./conditionModel.js";
import { TOB91_ELIXIR_INTEROP_RECEIPT } from "./data/91tobElixirInterop.ss13_4.generated.js";
import { getTlidbCalculationAuthority } from "./tlidbCalculationAuthority.js";
import {
  TLIDB_LICORICE_INGREDIENT_AUTHORITY,
  getTlidbLicoriceIngredientAuthority,
} from "./tlidbLicoriceIngredientAuthority.js";

const ELIXIR_ACTIVE_CONDITION_PATH = "playerStates.elixir_skill_active";
const elixirSkillById = new Map(
  TOB91_ELIXIR_INTEROP_RECEIPT.skills.map((entry) => [entry.localElixirSkillId, entry]),
);
const elixirSkillByMainSkillId = new Map(
  TOB91_ELIXIR_INTEROP_RECEIPT.skills.map((entry) => [entry.localMainSkillId, entry]),
);
const ELIXIR_SKILL_ROW_STATS = new Set([
  "affliction-effect",
  "skill-critical-strike-rating",
  "skill-damage-over-time",
  "skill-elemental-resistance-penetration",
  "skill-hit-damage",
  "skill-physical-damage-as-cold",
  "skill-physical-damage-as-fire",
  "skill-physical-damage-as-lightning",
]);

const TLIDB_ELIXIR_EXACT_DIRECT_CLAUSE_PROFILES = Object.freeze({
  "skills-tlidb-com-cn-putrid-toad-distillate": Object.freeze({
    sourcePageSha256: "5308a731669b4aa9ea4bff817f7480e8c2bf263aed283cbbe51cd0b887ce6e06",
    clauses: Object.freeze([
      Object.freeze({
        parserSourceText: "While Blur is active, +20 % Defense",
        sourceText: "방황 상태에서 방어 +20 %",
        effects: Object.freeze([
          Object.freeze({ stat: "defenseBonusWhileBlurPercent", value: 20, unit: "percent" }),
        ]),
      }),
      Object.freeze({
        parserSourceText: "30.5 % Ill Omen Cumulative Efficiency while Blur is active",
        sourceText: "방황 상태에서 오멘 누적 효율 30.5 %",
        effects: Object.freeze([
          Object.freeze({
            stat: "illOmenCumulativeEfficiencyWhileBlurPercent",
            value: 30.5,
            unit: "percent",
          }),
        ]),
      }),
    ]),
  }),
  "skills-tlidb-com-cn-saltpeter-mushroom-distillate": Object.freeze({
    sourcePageSha256: "8a5df97c56ce4dfd2fb7db4365633bf225759543b7f68fb6c600caa005aa503e",
    clauses: Object.freeze([
      Object.freeze({
        parserSourceText: "25 % chance for enemies to explode when defeated by Minions' Attacks or Spells, dealing True Damage equal to 250 % of their Max Life to enemies within a 6 m radius (not affected by the effects of Elixir Skills)",
        sourceText: "소환체의 공격 또는 주술로 적 처치 시 25 % 확률로 폭발하여 반경 6 미터 내의 적에게 처치된 적의 최대 HP 250 % 만큼 트루 대미지를 입힌다. (영약 스킬 효과의 영향을 받지 않음)",
        effects: Object.freeze([
          Object.freeze({ stat: "minionKillExplosionChancePercent", value: 25, unit: "percent" }),
          Object.freeze({
            stat: "minionKillExplosionEnemyMaxLifeDamagePercent",
            value: 250,
            unit: "percent",
          }),
          Object.freeze({ stat: "minionKillExplosionRadiusMeters", value: 6, unit: "meters" }),
        ]),
      }),
      Object.freeze({
        parserSourceText: "12 % of damage taken is transferred to a random Minion",
        sourceText: "받는 대미지의 12 % 가 랜덤 소환체에게 전이 된다.",
        effects: Object.freeze([
          Object.freeze({
            stat: "damageTakenTransferredToRandomMinionPercent",
            value: 12,
            unit: "percent",
          }),
        ]),
      }),
    ]),
  }),
});

function isConfiguredElixir(slot) {
  return Boolean(slot?.skillId) || (slot?.ingredientIds ?? []).some(Boolean);
}

function currentElixirActive(conditions) {
  return resolveConditionValues(conditions).playerStates?.elixir_skill_active === true;
}

function licoriceSelected(build) {
  return build?.selections?.hero?.[0] === TLIDB_LICORICE_INGREDIENT_AUTHORITY.heroId
    || build?.hero?.branchId === TLIDB_LICORICE_INGREDIENT_AUTHORITY.heroId;
}

function ingredientBlocker(ingredient, reason = ingredient?.unsupportedReason, extra = {}) {
  return Object.freeze({
    sourceId: ingredient?.id ?? "input:skill-elixir-config",
    ingredientId: ingredient?.id ?? extra.ingredientId ?? null,
    reason,
    sourceText: ingredient?.koName ?? "",
    ...extra,
  });
}

function selectedHeroLevel(build) {
  const nestedLevel = Number(build?.hero?.level);
  if (Number.isFinite(nestedLevel)) return nestedLevel;
  const legacyLevel = Number(build?.heroLevel);
  return Number.isFinite(legacyLevel) ? legacyLevel : null;
}

function ingredientChoiceMatches(choiceId, ingredient) {
  return choiceId === ingredient.traitChoiceId || choiceId === ingredient.traitSelectionKey;
}

function ingredientTraitStageAvailable(build, ingredient) {
  if (ingredient.stageId === "licorice-note-lv1") return true;
  const requiredLevel = ingredient.stageId === "licorice-note-lv45"
    ? 45
    : ingredient.stageId === "licorice-note-lv75"
      ? 75
      : null;
  if (!requiredLevel || selectedHeroLevel(build) < requiredLevel) return false;

  const explicitBranchId = build?.hero?.branchId;
  if (!explicitBranchId) return ingredient.stageId === "licorice-note-lv45";
  if (explicitBranchId !== TLIDB_LICORICE_INGREDIENT_AUTHORITY.heroId) return false;
  return (build?.hero?.traitSelections ?? []).some(({ stageId, choiceIds }) => (
    stageId === ingredient.stageId
      && (ingredient.traitChoiceId
        ? choiceIds?.some((choiceId) => ingredientChoiceMatches(choiceId, ingredient))
        : (choiceIds?.length ?? 0) > 0)
  ));
}

function selectedIngredientTraitTier(build, ingredient) {
  if (!ingredient.tierProfiles) return 1;
  const selection = (build?.hero?.traitSelections ?? []).find(({ stageId, choiceIds }) => (
    stageId === ingredient.stageId
      && choiceIds?.some((choiceId) => ingredientChoiceMatches(choiceId, ingredient))
  ));
  if (!selection) return null;
  const selectedChoiceId = selection.choiceIds.find((choiceId) => (
    ingredientChoiceMatches(choiceId, ingredient)
  ));
  const tier = selection.choiceTiers?.[selectedChoiceId]
    ?? selection.choiceTiers?.[ingredient.traitChoiceId]
    ?? selection.choiceTiers?.[ingredient.traitSelectionKey]
    ?? 1;
  return Number.isInteger(tier) && tier >= 1 && tier <= ingredient.tierProfiles.length
    ? tier
    : null;
}

function tierIngredientEffects(ingredient, tier, active) {
  const profile = ingredient.tierProfiles?.[tier - 1];
  if (!profile) {
    return {
      effects: [],
      blockers: [ingredientBlocker(ingredient, "elixir-ingredient-trait-tier-unavailable", {
        traitTier: tier,
      })],
    };
  }
  const effects = profile.effects.map((effect) => Object.freeze({
    sourceId: ingredient.id,
    sourceLabel: ingredient.koName,
    sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
    sourceRecordKey: ingredient.sourceRecordKey,
    receipt: Object.freeze({
      sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
      sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
      traitTier: tier,
    }),
    ...effect,
    operation: "add",
    sourceText: profile.sourceText,
    active,
    ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
  }));
  return { effects, blockers: [] };
}

function directIngredientEffect(ingredient, active, stat, unit = "percent") {
  return {
    effects: [Object.freeze({
      sourceId: ingredient.id,
      sourceLabel: ingredient.koName,
      sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
      sourceRecordKey: ingredient.sourceRecordKey,
      receipt: Object.freeze({
        sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
        sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
      }),
      stat,
      operation: "add",
      value: ingredient.values[0],
      unit,
      sourceText: ingredient.sourceText,
      active,
      ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
    })],
    blockers: [],
  };
}

function projectIngredient(build, ingredientId, active) {
  const ingredient = getTlidbLicoriceIngredientAuthority(ingredientId);
  if (!ingredient) {
    return {
      effects: [],
      blockers: [ingredientBlocker(null, "elixir-ingredient-identity-unverified", { ingredientId })],
    };
  }
  if (!licoriceSelected(build)) {
    return {
      effects: [],
      blockers: [ingredientBlocker(ingredient, "elixir-ingredient-hero-trait-unavailable")],
    };
  }
  if (!["licorice-note-lv1", "licorice-note-lv45", "licorice-note-lv75"].includes(ingredient.stageId)) {
    return { effects: [], blockers: [ingredientBlocker(ingredient)] };
  }
  if (!ingredientTraitStageAvailable(build, ingredient)) {
    return {
      effects: [],
      blockers: [ingredientBlocker(ingredient, "elixir-ingredient-trait-stage-unavailable", {
        stageId: ingredient.stageId,
      })],
    };
  }
  if (build?.hero?.revivalMemory) {
    return {
      effects: [],
      blockers: [ingredientBlocker(ingredient, "elixir-ingredient-base-trait-level-authority-unavailable")],
    };
  }
  if (ingredient.tierProfiles) {
    const tier = selectedIngredientTraitTier(build, ingredient);
    return tier === null
      ? {
        effects: [],
        blockers: [ingredientBlocker(ingredient, "elixir-ingredient-trait-tier-unavailable")],
      }
      : tierIngredientEffects(ingredient, tier, active);
  }
  if (ingredient.id === "sharp-leaf-grass") {
    return {
      effects: [Object.freeze({
        sourceId: ingredient.id,
        sourceLabel: ingredient.koName,
        sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
        sourceRecordKey: ingredient.sourceRecordKey,
        receipt: Object.freeze({
          sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
          sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
        }),
        stat: "critical-hit-damage",
        operation: "more",
        value: ingredient.values[0],
        unit: "percent",
        sourceText: ingredient.sourceText,
        active,
        ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
      })],
      blockers: [],
    };
  }
  if (ingredient.id === "double-thorn-flower") {
    return {
      effects: [Object.freeze({
        sourceId: ingredient.id,
        sourceLabel: ingredient.koName,
        sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
        sourceRecordKey: ingredient.sourceRecordKey,
        receipt: Object.freeze({
          sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
          sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
        }),
        stat: "reaping-repeat-chance",
        operation: "add",
        value: ingredient.values[0],
        unit: "percent",
        sourceText: ingredient.sourceText,
        active,
        ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
      })],
      blockers: [],
    };
  }
  if (ingredient.id === "tenacious-moss") {
    return {
      effects: [Object.freeze({
        sourceId: ingredient.id,
        sourceLabel: ingredient.koName,
        sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
        sourceRecordKey: ingredient.sourceRecordKey,
        receipt: Object.freeze({
          sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
          sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
        }),
        stat: "damageTakenTransferredToRandomMinionPercent",
        operation: "add",
        value: ingredient.values[0],
        unit: "percent",
        sourceText: ingredient.sourceText,
        active,
        ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
      })],
      blockers: [],
    };
  }
  if (ingredient.id === "ghost-pistil") {
    return {
      effects: [Object.freeze({
        sourceId: ingredient.id,
        sourceLabel: ingredient.koName,
        sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
        sourceRecordKey: ingredient.sourceRecordKey,
        receipt: Object.freeze({
          sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
          sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
        }),
        stat: "damageTakenFromManaBeforeLifePercent",
        operation: "add",
        value: ingredient.values[0],
        unit: "percent",
        sourceText: ingredient.sourceText,
        active,
        ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
      })],
      blockers: [],
    };
  }
  if (ingredient.id === "chameleon-vine") {
    return directIngredientEffect(
      ingredient,
      active,
      "physicalDamageTakenConvertedToRandomElementPercent",
    );
  }
  if (ingredient.id === "pod-shell") {
    return directIngredientEffect(ingredient, active, "elixirChargeProgressOnCriticalStrike", "progress");
  }
  if (ingredient.id === "gladiolus-leaf") {
    return directIngredientEffect(ingredient, active, "elixirChargeProgressOnReaping", "progress");
  }
  if (ingredient.id === "tumbleweed-seed") {
    return directIngredientEffect(ingredient, active, "elixirChargeProgressPerSixMetersMoved", "progress");
  }
  if (ingredient.id !== "diffuse-spores") {
    return { effects: [], blockers: [ingredientBlocker(ingredient)] };
  }

  const distance = Number(resolveConditionValues(build?.conditions).enemy?.distance);
  const inRange = Number.isFinite(distance) && distance <= 15;
  const effectActive = active && inRange;
  const effect = Object.freeze({
    sourceId: ingredient.id,
    sourceLabel: ingredient.koName,
    sourceUrl: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourceUrl,
    sourceRecordKey: ingredient.sourceRecordKey,
    receipt: Object.freeze({
      sourcePageVersion: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageVersion,
      sourcePageSha256: TLIDB_LICORICE_INGREDIENT_AUTHORITY.sourcePageSha256,
    }),
    stat: "moreDps",
    operation: "more",
    value: ingredient.values[0],
    unit: "percent",
    sourceText: ingredient.sourceText,
    active: effectActive,
    ...(!active
      ? { inactiveReason: "elixir-skill-condition-inactive" }
      : !inRange
        ? { inactiveReason: "elixir-ingredient-enemy-range-inactive" }
        : {}),
  });
  const blockers = [ingredientBlocker(ingredient)];
  if (active && !inRange) {
    blockers.push(ingredientBlocker(ingredient, "elixir-ingredient-enemy-range-inactive", {
      enemyDistance: distance,
    }));
  }
  return { effects: [effect], blockers };
}

function sourceReceipt(authority) {
  return Object.freeze({
    ...authority.receipt,
    interopIdentitySha256: TOB91_ELIXIR_INTEROP_RECEIPT.identitySha256,
  });
}

function exactDirectClauseEffects(authority, mapping, base, item) {
  const profile = TLIDB_ELIXIR_EXACT_DIRECT_CLAUSE_PROFILES[mapping.localMainSkillId];
  const currentKorean = item?.tlidbText?.ko;
  if (
    !profile
    || authority.receipt?.sourcePageSha256 !== profile.sourcePageSha256
    || currentKorean?.sourcePageSha256 !== profile.sourcePageSha256
    || currentKorean?.sourcePageVersion !== "SS13"
    || currentKorean?.sourceFieldStatus?.detail !== "exact"
    || !profile.clauses.every(({ sourceText }) => currentKorean.detail.includes(sourceText))
  ) {
    return { effects: [], consumedParserSourceTexts: new Set() };
  }

  const parserSourceTexts = new Set(
    (authority.parserBlockers ?? []).map(({ sourceText }) => String(sourceText ?? "")),
  );
  if (!profile.clauses.every(({ parserSourceText }) => parserSourceTexts.has(parserSourceText))) {
    return { effects: [], consumedParserSourceTexts: new Set() };
  }

  return {
    effects: profile.clauses.flatMap((clause) => clause.effects.map((effect) => Object.freeze({
      ...base,
      ...effect,
      operation: "add",
      sourceText: clause.sourceText,
    }))),
    consumedParserSourceTexts: new Set(profile.clauses.map(({ parserSourceText }) => parserSourceText)),
  };
}

function directElixirEffects(authority, mapping, active, item) {
  const effects = [];
  const blockers = [];
  const base = {
    sourceId: mapping.localMainSkillId,
    sourceUrl: authority.sourceUrl,
    sourceRecordKey: authority.sourceRecordKey,
    receipt: sourceReceipt(authority),
    active,
    ...(!active ? { inactiveReason: "elixir-skill-condition-inactive" } : {}),
  };
  const exactDirectClauses = exactDirectClauseEffects(authority, mapping, base, item);
  effects.push(...exactDirectClauses.effects);

  for (const effect of authority.parsedEffects ?? []) {
    const skillRowStat = ELIXIR_SKILL_ROW_STATS.has(effect.stat) ? effect.stat : null;
    const panelStats = effect.stat === "skill-armor"
      ? ["armor"]
      : effect.stat === "skill-evasion"
        ? ["evasion"]
        : effect.stat === "skill-movement-speed"
          ? ["movementSpeedBonus"]
          : effect.stat === "skill-projectile-speed"
            ? ["projectileSpeedBonus"]
            : effect.stat === "skill-energy-shield-charge-speed"
              ? ["shieldChargeSpeedBonus"]
              : effect.stat === "skill-all-resistance"
                ? ["fireResist", "coldResist", "lightningResist", "erosionResist"]
                : effect.stat === "skill-max-elemental-resistance"
                  ? ["maxFireResist", "maxColdResist", "maxLightningResist"]
                  : effect.stat === "skill-max-life-to-energy-shield"
                    ? ["shieldFromMaxLifePercent"]
                    : [];
    const parsedValue = Number(effect.value);
    if (effect.operation !== "add" || !Number.isFinite(parsedValue)) continue;

    let restoration = null;
    if (["skill-life-restoration", "skill-mana-restoration"].includes(effect.stat)) {
      const durationSeconds = Number(effect.durationSeconds);
      if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
        restoration = {
          stat: effect.stat === "skill-life-restoration"
            ? "lifeRegenPercentPerSecond"
            : "manaRegenPercentPerSecond",
          value: parsedValue / durationSeconds,
          sourceValue: parsedValue,
          durationSeconds,
        };
      }
    }

    for (const stat of [...panelStats, ...(skillRowStat ? [skillRowStat] : [])]) {
      effects.push(Object.freeze({
        ...base,
        stat,
        operation: "add",
        value: parsedValue,
        unit: effect.unit || "flat",
        sourceText: effect.sourceText || "",
        ...(Number.isFinite(Number(effect.maximumValue))
          ? { maximumValue: Number(effect.maximumValue) }
          : {}),
        ...(skillRowStat ? {
          scope: Object.freeze({
            actor: "self",
            skillTypes: Object.freeze([
              effect.stat === "skill-elemental-resistance-penetration" ? "spell" : "all",
            ]),
          }),
        } : {}),
      }));
    }
    if (restoration) {
      effects.push(Object.freeze({
        ...base,
        ...restoration,
        operation: "add",
        unit: "percent_max_per_second",
        sourceText: effect.sourceText || "",
      }));
    }
  }

  const attackSpeed = (authority.parsedEffects ?? []).find((effect) => (
    effect.stat === "skill-attack-speed" && effect.operation === "add"
  ));
  const castSpeed = (authority.parsedEffects ?? []).find((effect) => (
    effect.stat === "skill-cast-speed" && effect.operation === "add"
  ));
  if (attackSpeed || castSpeed) {
    const attackValue = Number(attackSpeed?.value);
    const castValue = Number(castSpeed?.value);
    if (Number.isFinite(attackValue) && attackValue === castValue) {
      effects.push(Object.freeze({
        ...base,
        stat: "speed",
        operation: "add",
        value: attackValue,
        unit: attackSpeed.unit || castSpeed.unit || "percent",
        sourceText: attackSpeed.sourceText || castSpeed.sourceText || "",
      }));
    } else {
      blockers.push(Object.freeze({
        sourceId: mapping.localMainSkillId,
        reason: "elixir-speed-pair-incomplete",
        sourceText: [attackSpeed?.sourceText, castSpeed?.sourceText].filter(Boolean).join(" / "),
      }));
    }
  }

  return {
    effects,
    blockers,
    consumedParserSourceTexts: exactDirectClauses.consumedParserSourceTexts,
  };
}

function parserBlocker(blocker, mapping) {
  const sourceText = String(blocker?.sourceText ?? "");
  return Object.freeze({
    sourceId: mapping.localMainSkillId,
    reason: /Charging Progress|충전 진행도|充能进度/iu.test(sourceText)
      ? "elixir-charge-model-unavailable"
      : "elixir-effect-clause-unsupported",
    sourceText,
    originalReason: blocker?.reason || "",
  });
}

function blockedSlot(mapping, bottle, config, reason, details = {}) {
  return Object.freeze({
    bottleId: bottle.localBottleId,
    sourceSlotId: bottle.sourceSlotId,
    configuredSkillId: config?.skillId ?? null,
    mapping: mapping ?? null,
    effects: Object.freeze([]),
    blockers: Object.freeze([Object.freeze({ reason, ...details })]),
    status: "blocked",
  });
}

function projectSlot(build, bottle, index, active) {
  const config = build?.skills?.elixirs?.[index];
  if (!isConfiguredElixir(config)) return null;
  if (config?.bottleId !== bottle.localBottleId) {
    return blockedSlot(null, bottle, config, "elixir-bottle-mismatch", {
      configuredBottleId: config?.bottleId ?? null,
    });
  }

  const mapping = elixirSkillById.get(config.skillId);
  if (!mapping) return blockedSlot(null, bottle, config, "elixir-skill-identity-unverified");
  const activeSlotIndex = bottle.sourceSlotIndex - 1;
  const activeSlot = build?.skills?.active?.[activeSlotIndex];
  if (activeSlot?.skillId !== mapping.localMainSkillId) {
    return blockedSlot(mapping, bottle, config, "elixir-main-skill-mismatch", {
      expectedMainSkillId: mapping.localMainSkillId,
      configuredMainSkillId: activeSlot?.skillId ?? null,
    });
  }
  if ((activeSlot.supports ?? []).some((support) => Boolean(support?.supportId))) {
    return blockedSlot(mapping, bottle, config, "elixir-support-calculation-unavailable");
  }

  const item = findItemById(mapping.localMainSkillId);
  const authority = getTlidbCalculationAuthority(item, { level: activeSlot.level ?? 20 });
  if (!item || !authority || authority.receipt?.sourcePageVersion !== "SS13") {
    return blockedSlot(mapping, bottle, config, "elixir-current-value-authority-unavailable");
  }

  const direct = directElixirEffects(authority, mapping, active, item);
  const ingredientProjection = (config.ingredientIds ?? [])
    .filter(Boolean)
    .map((ingredientId) => projectIngredient(build, ingredientId, active));
  direct.effects.push(...ingredientProjection.flatMap(({ effects }) => effects));
  const blockers = [
    ...direct.blockers,
    ...(authority.parserBlockers ?? [])
      .filter(({ sourceText }) => !direct.consumedParserSourceTexts.has(String(sourceText ?? "")))
      .map((blocker) => parserBlocker(blocker, mapping)),
    ...ingredientProjection.flatMap(({ blockers: entries }) => entries),
  ];
  if (!direct.effects.length) {
    blockers.push(Object.freeze({
      sourceId: mapping.localMainSkillId,
      reason: "elixir-skill-effect-calculation-unavailable",
    }));
  }

  const status = direct.effects.length
    ? active
      ? blockers.length ? "partial" : "applied"
      : "inactive"
    : "blocked";
  return Object.freeze({
    bottleId: bottle.localBottleId,
    sourceSlotId: bottle.sourceSlotId,
    configuredSkillId: config.skillId,
    mapping,
    effects: Object.freeze(direct.effects),
    blockers: Object.freeze(blockers),
    status,
  });
}

export function isTlidbElixirMainSkillId(skillId) {
  return elixirSkillByMainSkillId.has(skillId);
}

export function projectTlidbElixirCalculation(build = {}) {
  const active = currentElixirActive(build.conditions);
  const slots = TOB91_ELIXIR_INTEROP_RECEIPT.bottleMappings
    .map((bottle, index) => projectSlot(build, bottle, index, active))
    .filter(Boolean);
  const effects = slots.flatMap((slot) => slot.effects);
  const blockers = slots.flatMap((slot) => slot.blockers);
  const configuredSlotCount = slots.length;
  const supportedEffectCount = effects.length;
  const appliedEffectCount = effects.filter((effect) => effect.active).length;
  const status = configuredSlotCount === 0
    ? "unconfigured"
    : slots.every((slot) => slot.status === "blocked")
      ? "blocked"
      : appliedEffectCount > 0
        ? blockers.length ? "partial" : "applied"
        : "inactive";

  return Object.freeze({
    status,
    conditionPath: ELIXIR_ACTIVE_CONDITION_PATH,
    conditionMet: active,
    configuredSlotCount,
    supportedEffectCount,
    appliedEffectCount,
    slots: Object.freeze(slots),
    effects: Object.freeze(effects),
    blockers: Object.freeze(blockers),
    receipt: Object.freeze({
      sourcePackageVersion: TOB91_ELIXIR_INTEROP_RECEIPT.sourcePackageVersion,
      identitySha256: TOB91_ELIXIR_INTEROP_RECEIPT.identitySha256,
    }),
  });
}
