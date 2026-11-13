import { TLIDB_GEAR_FLAVOR_RECEIPTS } from "./data/tlidbGearFlavorReceipts.ss13.generated.js";

const EXACT_DETAIL_STATUS = new Set(["exact", "exact-structural"]);
const DEFAULT_LOCALE_ORDER = Object.freeze(["en", "ko", "cn"]);
const NUMBER_SOURCE = String.raw`[+-]?\d+(?:\.\d+)?`;
const RANGE_SEPARATOR_SOURCE = String.raw`(?:-|–|—|~|～)`;
const VALUE_SOURCE = String.raw`(?:[+-]?\s*\(\s*[+-]?\d+(?:\.\d+)?\s*${RANGE_SEPARATOR_SOURCE}\s*[+-]?\d+(?:\.\d+)?\s*\)|[+-]?\s*\d+(?:\.\d+)?)`;

const DIRECT_VALUE_RE = new RegExp(
  String.raw`^(${VALUE_SOURCE})\s*(%)?\s*(?:to\s+)?(.+?)\s*\.?$`,
  "iu",
);
const POSTFIX_VALUE_RE = new RegExp(
  String.raw`^(.+?)\s+(${VALUE_SOURCE})\s*(%)?\s*\.?$`,
  "iu",
);
const BASE_DAMAGE_RE = new RegExp(
  String.raw`^(${NUMBER_SOURCE})\s*[-–—~]\s*(${NUMBER_SOURCE})\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage$`,
  "iu",
);
const ADDED_DAMAGE_RE = new RegExp(
  String.raw`^Adds\s+(${VALUE_SOURCE})\s*[-–—~]\s*(${VALUE_SOURCE})\s+(Physical|Fire|Cold|Lightning|Erosion|Elemental)\s+Damage(?:\s+to\s+(the gear|Spells|Attacks and Spells|Attacks|(?:the )?Main-Hand Weapon))?(.*)$`,
  "iu",
);
const ADDED_AILMENT_DAMAGE_RE = new RegExp(
  String.raw`^Adds\s+(${VALUE_SOURCE})\s*[-–—~]\s*(${VALUE_SOURCE})\s+Base\s+(Ignite|Wilt|Ailment)\s+Damage(.*)$`,
  "iu",
);
const ADDED_AS_DAMAGE_RE = new RegExp(
  String.raw`^Adds\s+(${VALUE_SOURCE})\s*%\s+of\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\s+(?:as|to)\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage(.*)$`,
  "iu",
);
const ADDED_MULTI_DAMAGE_RE = new RegExp(
  String.raw`^Adds\s+(${VALUE_SOURCE})\s*[-–—~]\s*(${VALUE_SOURCE})\s+((?:Physical|Fire|Cold|Lightning|Erosion|Elemental)(?:\s*,\s*(?:Physical|Fire|Cold|Lightning|Erosion|Elemental))*(?:\s*,?\s+and\s+(?:Physical|Fire|Cold|Lightning|Erosion|Elemental))?)\s+Damage\s+to\s+(the gear|Spells|Attacks and Spells|Attacks|(?:the )?Main-Hand Weapon)(.*)$`,
  "iu",
);
const ADDED_AS_MULTI_DAMAGE_RE = new RegExp(
  String.raw`^Adds\s+(${VALUE_SOURCE})\s*%\s+of\s+(Physical|Fire|Cold|Lightning|Erosion)\s+Damage\s+as\s+((?:Physical|Fire|Cold|Lightning|Erosion)(?:\s*,\s*(?:Physical|Fire|Cold|Lightning|Erosion))*(?:\s*,?\s+and\s+(?:Physical|Fire|Cold|Lightning|Erosion))?)(?:\s+Damage)?(.*)$`,
  "iu",
);
const CONVERSION_RE = new RegExp(
  String.raw`^(?:\[([^\]]+)\]\s*)?Converts\s+(${VALUE_SOURCE})\s*%\s+of\s+(.+?)\s+to\s+(.+?)(\s+(?:when|while|if|at|for|per|during|on|upon|with|after|before)\b.*)?$`,
  "iu",
);
const REGENERATION_RE = new RegExp(
  String.raw`^Regenerates\s+(${VALUE_SOURCE})\s*(%)?\s*(?:of\s+)?(Life|Mana|Energy Shield)\s+per second(.*)$`,
  "iu",
);
const RESTORE_RE = new RegExp(
  String.raw`^Restores\s+(${VALUE_SOURCE})\s*(%)?\s*(?:of\s+)?(?:Max\s+)?(Life|Mana|Energy Shield)(.*)$`,
  "iu",
);
const LOSE_RE = new RegExp(
  String.raw`^Loses\s+(${VALUE_SOURCE})\s*(%)?\s*(?:of\s+)?(?:Max\s+)?(Life|Mana|Energy Shield)(.*)$`,
  "iu",
);

function statEntry(aliases, stats, unit = null) {
  return Object.freeze({
    aliases: Object.freeze(Array.isArray(aliases) ? aliases : [aliases]),
    stats: Object.freeze(Array.isArray(stats) ? stats : [stats]),
    unit,
  });
}

const STAT_ENTRIES = Object.freeze([
  statEntry(
    ["max life, max mana, and max energy shield", "max life, max mana and max energy shield"],
    ["max_life", "max_mana", "max_energy_shield"],
  ),
  statEntry("max life and max energy shield", ["max_life", "max_energy_shield"]),
  statEntry("max life and max mana", ["max_life", "max_mana"]),
  statEntry("strength and intelligence", ["strength", "intelligence"]),
  statEntry("dexterity and intelligence", ["dexterity", "intelligence"]),
  statEntry("strength and dexterity", ["strength", "dexterity"]),
  statEntry("fire and cold resistance", ["fire_resistance", "cold_resistance"]),
  statEntry("cold and lightning resistance", ["cold_resistance", "lightning_resistance"]),
  statEntry("fire and lightning resistance", ["fire_resistance", "lightning_resistance"]),
  statEntry(["attack and cast speed", "공격 및 시전 속도"], ["attack_speed", "cast_speed"]),
  statEntry("minion attack and cast speed", ["minion_attack_speed", "minion_cast_speed"]),
  statEntry("attack and spell block chance", ["attack_block_chance", "spell_block_chance"]),
  statEntry("armor and evasion", ["armor", "evasion"]),
  statEntry("attack and spell critical strike rating", ["attack_critical_strike_rating", "spell_critical_strike_rating"]),
  statEntry("critical strike rating and critical strike damage", ["critical_strike_rating", "critical_strike_damage"]),
  statEntry("life regain and energy shield regain", ["life_regain", "energy_shield_regain"]),
  statEntry("life regain and shield regain", ["life_regain", "energy_shield_regain"]),
  statEntry("additional damage and minion damage", ["additional_damage", "additional_minion_damage"]),
  statEntry("mobility skill attack and cast speed", ["mobility_skill_attack_speed", "mobility_skill_cast_speed"]),
  statEntry("empower skill effect and elixir skill effect", ["empower_skill_effect", "elixir_skill_effect"]),
  statEntry("elemental and erosion damage", ["elemental_damage", "erosion_damage"]),
  statEntry("cold and erosion resistance", ["cold_resistance", "erosion_resistance"]),
  statEntry("max life", "max_life"),
  statEntry("maximum life", "max_life"),
  statEntry("최대 hp", "max_life"),
  statEntry("max mana", "max_mana"),
  statEntry("maximum mana", "max_mana"),
  statEntry("최대 mp", "max_mana"),
  statEntry("max energy shield", "max_energy_shield"),
  statEntry("최대 보호막", "max_energy_shield"),
  statEntry("gear energy shield", "gear_energy_shield"),
  statEntry("해당 장비 보호막", "gear_energy_shield"),
  statEntry("gear armor", "gear_armor"),
  statEntry("해당 장비 아머 수치", "gear_armor"),
  statEntry("gear evasion", "gear_evasion"),
  statEntry("해당 장비 회피 수치", "gear_evasion"),
  statEntry("armor", "armor"),
  statEntry("아머", "armor"),
  statEntry("evasion", "evasion"),
  statEntry("회피", "evasion"),
  statEntry("defense", "defense"),
  statEntry("strength", "strength"),
  statEntry("힘", "strength"),
  statEntry("dexterity", "dexterity"),
  statEntry("민첩", "dexterity"),
  statEntry("intelligence", "intelligence"),
  statEntry("지혜", "intelligence"),
  statEntry("all stats", "all_stats"),
  statEntry("모든 속성", "all_stats"),
  statEntry("elemental resistance", "elemental_resistance"),
  statEntry("원소 저항", "elemental_resistance"),
  statEntry("fire resistance", "fire_resistance"),
  statEntry("화염 저항", "fire_resistance"),
  statEntry("cold resistance", "cold_resistance"),
  statEntry("냉기 저항", "cold_resistance"),
  statEntry("lightning resistance", "lightning_resistance"),
  statEntry("번개 저항", "lightning_resistance"),
  statEntry("erosion resistance", "erosion_resistance"),
  statEntry("부식 저항", "erosion_resistance"),
  statEntry("max elemental resistance", "max_elemental_resistance"),
  statEntry("max fire resistance", "max_fire_resistance"),
  statEntry("max cold resistance", "max_cold_resistance"),
  statEntry("max lightning resistance", "max_lightning_resistance"),
  statEntry("max erosion resistance", "max_erosion_resistance"),
  statEntry("erosion resistance penetration", "erosion_resistance_penetration"),
  statEntry("movement speed", "movement_speed"),
  statEntry("이동 속도", "movement_speed"),
  statEntry("gear attack speed", "gear_attack_speed"),
  statEntry("해당 장비 공격 속도", "gear_attack_speed"),
  statEntry("main-hand weapon attack speed", "main_hand_weapon_attack_speed"),
  statEntry("attack speed", "attack_speed"),
  statEntry("공격 속도", "attack_speed"),
  statEntry("cast speed", "cast_speed"),
  statEntry("시전 속도", "cast_speed"),
  statEntry(["projectile speed", "투사체 속도"], "projectile_speed"),
  statEntry("focus speed", "focus_speed"),
  statEntry("cooldown recovery speed", "cooldown_recovery_speed"),
  statEntry("warcry cooldown recovery speed", "warcry_cooldown_recovery_speed"),
  statEntry("spell burst charge speed", "spell_burst_charge_speed"),
  statEntry("mana regeneration speed", "mana_regeneration_speed"),
  statEntry("life regeneration speed", "life_regeneration_speed"),
  statEntry("additional energy shield charge interval", "additional_energy_shield_charge_interval"),
  statEntry("additional regain interval", "additional_regain_interval"),
  statEntry("physical damage", "physical_damage"),
  statEntry("gear physical damage", "gear_physical_damage"),
  statEntry("gear elemental damage", "gear_elemental_damage"),
  statEntry("spell elemental damage", "spell_elemental_damage"),
  statEntry("spell fire damage", "spell_fire_damage"),
  statEntry("해당 장비 물리 대미지", "gear_physical_damage"),
  statEntry("spell damage", "spell_damage"),
  statEntry("attack damage", "attack_damage"),
  statEntry("fire damage", "fire_damage"),
  statEntry("cold damage", "cold_damage"),
  statEntry("lightning damage", "lightning_damage"),
  statEntry("erosion damage", "erosion_damage"),
  statEntry("elemental damage", "elemental_damage"),
  statEntry("projectile damage", "projectile_damage"),
  statEntry("minion damage", "minion_damage"),
  statEntry("melee damage", "melee_damage"),
  statEntry("damage over time", "damage_over_time"),
  statEntry("damage over time taken", "damage_over_time_taken"),
  statEntry("ignite damage taken", "ignite_damage_taken"),
  statEntry("hit fire damage taken", "hit_fire_damage_taken"),
  statEntry("damage", "damage"),
  statEntry("area damage", "area_damage"),
  statEntry("skill damage", "skill_damage"),
  statEntry("hit damage", "hit_damage"),
  statEntry("base damage", "base_damage"),
  statEntry("base damage for two-handed weapons", "two_handed_weapon_base_damage"),
  statEntry("base damage for off-hand weapons", "off_hand_weapon_base_damage"),
  statEntry("returning projectile damage", "returning_projectile_damage"),
  statEntry("sentry damage", "sentry_damage"),
  statEntry("synthetic troop minion damage", "synthetic_troop_minion_damage"),
  statEntry("spirit magus skill damage", "spirit_magus_skill_damage"),
  statEntry("thunder focus damage", "thunder_focus_damage"),
  statEntry("deterioration damage", "deterioration_damage"),
  statEntry("knockback distance", "knockback_distance"),
  statEntry("knockback chance", "knockback_chance"),
  statEntry("wilt chance", "wilt_chance"),
  statEntry("frostbite effect", "frostbite_effect"),
  statEntry("numbed effect", "numbed_effect"),
  statEntry("numbed duration", "numbed_duration"),
  statEntry("blur effect", "blur_effect"),
  statEntry("aura effect", "aura_effect"),
  statEntry("warcry effect", "warcry_effect"),
  statEntry("restoration effect", "restoration_effect"),
  statEntry("ignite damage", "ignite_damage"),
  statEntry("ailment damage enhancement", "ailment_damage_enhancement"),
  statEntry("additional physical damage", "additional_physical_damage"),
  statEntry("additional fire damage", "additional_fire_damage"),
  statEntry("additional cold damage", "additional_cold_damage"),
  statEntry("additional lightning damage", "additional_lightning_damage"),
  statEntry("additional erosion damage", "additional_erosion_damage"),
  statEntry("additional elemental damage", "additional_elemental_damage"),
  statEntry("additional spell damage", "additional_spell_damage"),
  statEntry("additional attack damage", "additional_attack_damage"),
  statEntry("additional minion damage", "additional_minion_damage"),
  statEntry("additional shadow damage", "additional_shadow_damage"),
  statEntry("additional channeled skill damage", "additional_channeled_skill_damage"),
  statEntry("additional damage taken", "additional_damage_taken"),
  statEntry("additional physical damage taken", "additional_physical_damage_taken"),
  statEntry("additional damage taken by nearby enemies", "nearby_enemy_additional_damage_taken"),
  statEntry("damage dealt by nearby enemies", "nearby_enemy_damage_dealt"),
  statEntry("damage dealt by horizontal projectiles", "horizontal_projectile_damage_dealt"),
  statEntry("melee physical damage", "melee_physical_damage"),
  statEntry("erosion area damage", "erosion_area_damage"),
  statEntry("sweep slash damage", "sweep_slash_damage"),
  statEntry("steep strike damage", "steep_strike_damage"),
  statEntry("physical damage reflection", "physical_damage_reflection"),
  statEntry("fire damage reflection", "fire_damage_reflection"),
  statEntry("cold damage reflection", "cold_damage_reflection"),
  statEntry("lightning damage reflection", "lightning_damage_reflection"),
  statEntry("critical strike rating", "critical_strike_rating"),
  statEntry("크리티컬 수치", "critical_strike_rating"),
  statEntry("attack critical strike rating for this gear", "gear_attack_critical_strike_rating"),
  statEntry("attack critical strike rating", "attack_critical_strike_rating"),
  statEntry("spell critical strike rating", "spell_critical_strike_rating"),
  statEntry("attack critical strike damage", "attack_critical_strike_damage"),
  statEntry("critical strike damage", "critical_strike_damage"),
  statEntry("minion critical strike damage", "minion_critical_strike_damage"),
  statEntry("skill area", "skill_area"),
  statEntry("fire skill area", "fire_skill_area"),
  statEntry("terra skill area", "terra_skill_area"),
  statEntry("slash-strike skill area", "slash_strike_skill_area"),
  statEntry("warcry area", "warcry_area"),
  statEntry("skill effect duration", "skill_effect_duration"),
  statEntry("deterioration duration", "deterioration_duration"),
  statEntry("fervor duration", "fervor_duration"),
  statEntry("reaping duration", "reaping_duration"),
  statEntry("wilt duration", "wilt_duration"),
  statEntry("blessing duration", "blessing_duration"),
  statEntry("agility blessing duration", "agility_blessing_duration"),
  statEntry("aiming skill duration", "aiming_skill_duration"),
  statEntry("minion duration", "minion_duration"),
  statEntry("minion max life", "minion_max_life"),
  statEntry("minion life regeneration per second", "minion_life_regeneration"),
  statEntry("armor effective rate for non-physical damage", "armor_effective_rate_for_non_physical_damage"),
  statEntry("attack block chance", "attack_block_chance"),
  statEntry("공격 막기 확률", "attack_block_chance"),
  statEntry("spell block chance", "spell_block_chance"),
  statEntry("주술 막기 확률", "spell_block_chance"),
  statEntry("block ratio", "block_ratio"),
  statEntry("attack and spell block", ["attack_block_chance", "spell_block_chance"]),
  statEntry("injury buffer", "injury_buffer"),
  statEntry("life regain", "life_regain"),
  statEntry("sealed mana compensation", "sealed_mana_compensation"),
  statEntry("energy shield charge speed", "energy_shield_charge_speed"),
  statEntry("energy shield regain", "energy_shield_regain"),
  statEntry("shield regain", "energy_shield_regain"),
  statEntry("focus buff effect", "focus_buff_effect"),
  statEntry("terra charge recovery speed", "terra_charge_recovery_speed"),
  statEntry("reaping recovery speed", "reaping_recovery_speed"),
  statEntry("critical strike damage mitigation", "critical_strike_damage_mitigation"),
  statEntry("armor dmg mitigation penetration", "armor_damage_mitigation_penetration"),
  statEntry("armor effective rate for non-physical dmg", "armor_effective_rate_for_non_physical_damage"),
  statEntry("lightning penetration", "lightning_penetration"),
  statEntry("cold penetration", "cold_penetration"),
  statEntry("fire penetration", "fire_penetration"),
  statEntry("chance to avoid damage", "chance_to_avoid_damage"),
  statEntry("chance to deal double damage", "chance_to_deal_double_damage"),
  statEntry("physique", "physique"),
  statEntry("physique for minions", "minion_physique"),
  statEntry("minion elemental resistance", "minion_elemental_resistance"),
  statEntry("spirit magi critical strike rating", "spirit_magi_critical_strike_rating"),
  statEntry("control effects received", "control_effects_received"),
  statEntry("barrage skill wave interval", "barrage_skill_wave_interval"),
  statEntry("slow effect received", "slow_effect_received"),
  statEntry("trauma damage", "trauma_damage"),
  statEntry("ill omen cumulative efficiency", "ill_omen_cumulative_efficiency"),
  statEntry("life regain interval", "life_regain_interval"),
  statEntry("tracking distance for sentries", "sentry_tracking_distance"),
  statEntry("chance to ignite targets", "chance_to_ignite"),
  statEntry("chance to inflict damaging ailments", "chance_to_inflict_damaging_ailments"),
  statEntry("chance to multistrike", "chance_to_multistrike"),
  statEntry("chance to inflict trauma", "chance_to_inflict_trauma"),
  statEntry("max frostbite rating", "max_frostbite_rating", "rating"),
  statEntry("max tenacity blessing stacks", "max_tenacity_blessing_stacks", "stacks"),
  statEntry("max agility blessing stacks", "max_agility_blessing_stacks", "stacks"),
  statEntry("max focus blessing stacks", "max_focus_blessing_stacks", "stacks"),
  statEntry("max spell burst", "max_spell_burst", "stacks"),
  statEntry("max charges", "max_charges", "charges"),
  statEntry("max restoration skill charges", "max_restoration_skill_charges", "charges"),
  statEntry("max tangle quantity", "max_tangle_quantity", "count"),
  statEntry("beams", "beam_count", "count"),
  statEntry("jumps", "jump_count", "count"),
  statEntry("jump(s)", "jump_count", "count"),
  statEntry("horizontal projectile penetration(s)", "horizontal_projectile_penetration", "count"),
  statEntry("projectile quantity", "projectile_quantity", "count"),
  statEntry("max sentry quantity", "max_sentry_quantity", "count"),
  statEntry("max summonable synthetic troops", "max_summonable_synthetic_troops", "count"),
  statEntry("ignite limit", "ignite_limit", "count"),
  statEntry("support skill level", "support_skill_level", "level"),
  statEntry("fire skill level", "fire_skill_level", "level"),
  ...['attack','physical','cold','erosion','aura','curse','restoration','spell projectile'].map(type=>
    statEntry(`${type} skill level`,`${type.replaceAll(' ','_')}_skill_level`,'level')),
  statEntry("lightning skill level", "lightning_skill_level", "level"),
  statEntry("active skill level", "active_skill_level", "level"),
  statEntry("spell skill level", "spell_skill_level", "level"),
  statEntry("attack projectile skill level", "attack_projectile_skill_level", "level"),
  statEntry("horizontal projectile skill level", "horizontal_projectile_skill_level", "level"),
  statEntry("minion skill level", "minion_skill_level", "level"),
  statEntry("mobility skill level", "mobility_skill_level", "level"),
  statEntry("focus skill level", "focus_skill_level", "level"),
  statEntry("empower skill level", "empower_skill_level", "level"),
  statEntry("defensive skill level", "defensive_skill_level", "level"),
  statEntry(["all skills' levels", "all skills' level", "all skill levels"], "all_skill_levels", "level"),
  statEntry("projectile skill level", "projectile_skill_level", "level"),
  statEntry("passive skill level", "passive_skill_level", "level"),
  statEntry("beam skill level", "beam_skill_level", "level"),
  statEntry("main skill level", "main_skill_level", "level"),
  statEntry("skill cost", "skill_cost"),
  statEntry("attack skill mana cost", "attack_skill_mana_cost"),
  statEntry("elixir skill effect", "elixir_skill_effect"),
  statEntry("intimidating effect", "intimidating_effect"),
  statEntry("affliction per second", "affliction_per_second"),
  statEntry("spirit magus ultimate damage and ailment damage dealt by ultimate", "spirit_magus_ultimate_damage"),
].map((entry) => Object.freeze({
  ...entry,
  aliases: Object.freeze(entry.aliases.map((alias) => alias.toLocaleLowerCase("en-US"))),
})));

const SORTED_STAT_ALIASES = Object.freeze(STAT_ENTRIES.flatMap((entry) => (
  entry.aliases.map((alias) => Object.freeze({ alias, entry }))
)).sort((left, right) => right.alias.length - left.alias.length));

export const TLIDB_GEAR_TOOLTIP_KOREAN_SOURCE_ALIASES = Object.freeze(
  STAT_ENTRIES
    .flatMap(({ aliases }) => aliases)
    .filter((alias) => /[가-힣]/u.test(alias)),
);

function normalizedText(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function slug(value) {
  return normalizedText(value)
    .toLocaleLowerCase("en-US")
    .replace(/[’']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

function detailLines(value) {
  return String(value ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function exactCurrentLocale(locale, season = "SS13") {
  return Boolean(
    ["SS13", "SS14"].includes(season) && locale?.sourcePageVersion === season
    && locale?.sourceSeasonEvidence?.verificationComplete === true
    && (season === "SS13" || locale.sourceSeasonEvidence.actualSeason === 14)
    && EXACT_DETAIL_STATUS.has(locale?.sourceFieldStatus?.detail)
    && typeof locale?.detail === "string"
  );
}

function localeOrder(requestedLocale) {
  return [...new Set([requestedLocale, ...DEFAULT_LOCALE_ORDER].filter(Boolean))];
}

function sourceLocale(item, requestedLocale, season) {
  if (exactCurrentLocale(item, season)) return item;
  for (const localeKey of localeOrder(requestedLocale)) {
    const locale = item?.tlidbText?.[localeKey];
    if (exactCurrentLocale(locale, season)) return locale;
  }
  return null;
}

function untrustedSourceLines(item, requestedLocale) {
  if (typeof item?.detail === "string") return detailLines(item.detail);
  for (const localeKey of localeOrder(requestedLocale)) {
    const localeLines = detailLines(item?.tlidbText?.[localeKey]?.detail);
    if (localeLines.length) return localeLines;
  }
  return [""];
}

function parsedValue(raw) {
  const text = normalizedText(raw).replace(/^([+-])\s+/u, "$1");
  const range = text.match(new RegExp(
    String.raw`^([+-]?)\(\s*(${NUMBER_SOURCE})\s*${RANGE_SEPARATOR_SOURCE}\s*(${NUMBER_SOURCE})\s*\)$`,
    "u",
  ));
  if (range) {
    const outsideSign = range[1] === "-" ? -1 : 1;
    const min = Number(range[2]) * outsideSign;
    const max = Number(range[3]) * outsideSign;
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { value: null, roll: { min, max } };
    }
    return null;
  }
  const value = Number(text);
  return Number.isFinite(value) ? { value } : null;
}

function effect(stat, operation, parsed, unit, sourceText, condition = "") {
  const result = {
    stat,
    operation,
    value: parsed.value,
    unit,
    sourceText,
  };
  const normalizedCondition = normalizedText(condition).replace(/[.]$/u, "");
  if (normalizedCondition) result.condition = conditionRequirement(normalizedCondition);
  if (parsed.roll) result.roll = { ...parsed.roll };
  return result;
}

function conditionRequirement(condition) {
  if (/^when the Energy Shield is not full$/iu.test(condition)) {
    return { type: "resource-state", resource: "energy_shield", state: "not_full" };
  }
  const ringCount = condition.match(/^If only\s+(\d+)\s+Ring is equipped$/iu);
  if (ringCount) {
    return {
      type: "equipped-slot-count",
      slot: "ring",
      operator: "equal",
      value: Number(ringCount[1]),
    };
  }
  const fervor = condition.match(/^for every\s+(?:(\d+)\s+)?point(?:s)? of Fervor Rating$/iu);
  if (fervor) {
    return {
      type: "per-stat",
      stat: "fervor_rating",
      amount: Number(fervor[1] ?? 1),
    };
  }
  return condition;
}

function combineCondition(prefix, suffix) {
  const parts = [prefix, suffix].map((part) => normalizedText(part).replace(/[,]$/u, "")).filter(Boolean);
  return parts.join("; ");
}

function matchedStatEntry(rawLabel) {
  const label = normalizedText(rawLabel).replace(/[.]$/u, "");
  const lower = label.toLocaleLowerCase("en-US");
  for (const { alias, entry } of SORTED_STAT_ALIASES) {
    if (lower === alias) return { entry, condition: "" };
    if (!lower.startsWith(`${alias} `)) continue;
    const condition = label.slice(alias.length).trim();
    if (/^(?:when|while|if|at|for\b|per\b|against|during|on\b|upon|with\b|after|before|by\b|to\b)/iu.test(condition)) {
      return { entry, condition };
    }
  }
  if (lower.startsWith("additional ")) {
    const nested = matchedStatEntry(label.slice("additional ".length));
    if (nested) {
      return {
        entry: {
          ...nested.entry,
          stats: nested.entry.stats.map((stat) => (
            stat.startsWith("additional_") ? stat : `additional_${stat}`
          )),
        },
        condition: nested.condition,
      };
    }
  }
  return null;
}

function directOperation(entry, unit) {
  if (entry.stats.some((stat) => stat.startsWith("additional_"))) return "more_percent";
  return unit === "percent" ? "add_percent" : "add";
}

function parseDirectModifier(line, sourceText, conditionPrefix = "") {
  const match = line.match(DIRECT_VALUE_RE);
  if (!match) return null;
  const parsed = parsedValue(match[1]);
  const matched = matchedStatEntry(match[3]);
  if (!parsed || !matched) return null;
  const unit = match[2] ? "percent" : (matched.entry.unit ?? "flat");
  const operation = directOperation(matched.entry, unit);
  const condition = combineCondition(conditionPrefix, matched.condition);
  return matched.entry.stats.map((stat) => effect(stat, operation, parsed, unit, sourceText, condition));
}

function parsePostfixModifier(line, sourceText) {
  const match = line.match(POSTFIX_VALUE_RE);
  if (!match) return null;
  const parsed = parsedValue(match[2]);
  const matched = matchedStatEntry(match[1]);
  if (!parsed || !matched || matched.condition) return null;
  const unit = match[3] ? "percent" : (matched.entry.unit ?? "flat");
  const operation = directOperation(matched.entry, unit);
  return matched.entry.stats.map((stat) => effect(stat, operation, parsed, unit, sourceText));
}

function parseConditionalDirectModifier(line, sourceText) {
  const match = line.match(/^((?:If|When|While|At|On|Upon|During|After|Before)\b[^,]+),\s*(.+)$/iu);
  if (!match) return null;
  return parseDirectModifier(match[2], sourceText, match[1]);
}

function parseScopedDirectModifier(line, sourceText) {
  let match = line.match(/^\[([^\]]+)\]\s+(.+)$/u);
  if (match) return parseDirectModifier(match[2], sourceText, `[${match[1]}]`);
  match = line.match(/^([^:]+):\s*(.+)$/u);
  if (match) return parseDirectModifier(match[2], sourceText, match[1]);
  return null;
}

function damageComponent(stat, operation, raw, sourceText, condition = "") {
  const parsed = parsedValue(raw);
  return parsed ? effect(stat, operation, parsed, "damage", sourceText, condition) : null;
}

function parseBaseDamage(line, sourceText) {
  const match = line.match(BASE_DAMAGE_RE);
  if (!match) return null;
  const damageType = match[3].toLocaleLowerCase("en-US");
  return [
    damageComponent(`gear_${damageType}_damage_min`, "set", match[1], sourceText),
    damageComponent(`gear_${damageType}_damage_max`, "set", match[2], sourceText),
  ].filter(Boolean);
}

function conditionSuffix(value) {
  const condition = normalizedText(value);
  return condition.replace(/^[.,]\s*/u, "").replace(/[.]$/u, "");
}

function parseAddedDamage(line, sourceText) {
  const match = line.match(ADDED_DAMAGE_RE);
  if (!match) return null;
  const damageType = match[3].toLocaleLowerCase("en-US");
  const targetPrefix = damageTargetPrefix(match[4] ?? "");
  const condition = conditionSuffix(match[5]);
  return [
    damageComponent(`${targetPrefix}_${damageType}_damage_min`, "add", match[1], sourceText, condition),
    damageComponent(`${targetPrefix}_${damageType}_damage_max`, "add", match[2], sourceText, condition),
  ].filter(Boolean);
}

function damageTargetPrefix(target) {
  const normalized = target.toLocaleLowerCase("en-US");
  if (normalized === "the gear") return "gear";
  if (normalized === "spells") return "spell";
  if (normalized === "attacks") return "attack";
  if (normalized === "attacks and spells") return "attack_and_spell";
  if (["main-hand weapon", "the main-hand weapon"].includes(normalized)) return "main_hand_weapon";
  return "added";
}

function parseAddedMultiDamage(line, sourceText) {
  const match = line.match(ADDED_MULTI_DAMAGE_RE);
  if (!match) return null;
  const damageTypes = match[3].match(/Physical|Fire|Cold|Lightning|Erosion|Elemental/giu) ?? [];
  if (damageTypes.length < 2) return null;
  const targetPrefix = damageTargetPrefix(match[4]);
  const condition = conditionSuffix(match[5]);
  return damageTypes.flatMap((damageType) => {
    const normalizedDamageType = damageType.toLocaleLowerCase("en-US");
    return [
      damageComponent(`${targetPrefix}_${normalizedDamageType}_damage_min`, "add", match[1], sourceText, condition),
      damageComponent(`${targetPrefix}_${normalizedDamageType}_damage_max`, "add", match[2], sourceText, condition),
    ].filter(Boolean);
  });
}

function parseAddedAilmentDamage(line, sourceText) {
  const match = line.match(ADDED_AILMENT_DAMAGE_RE);
  if (!match) return null;
  const damageType = match[3].toLocaleLowerCase("en-US");
  const condition = conditionSuffix(match[4]);
  return [
    damageComponent(`base_${damageType}_damage_min`, "add", match[1], sourceText, condition),
    damageComponent(`base_${damageType}_damage_max`, "add", match[2], sourceText, condition),
  ].filter(Boolean);
}

function parseAddedAsDamage(line, sourceText) {
  const match = line.match(ADDED_AS_DAMAGE_RE);
  if (!match) return null;
  const parsed = parsedValue(match[1]);
  if (!parsed) return null;
  const sourceDamage = match[2].toLocaleLowerCase("en-US");
  const targetDamage = match[3].toLocaleLowerCase("en-US");
  return [effect(
    `${sourceDamage}_damage_as_${targetDamage}_damage`,
    "gain_percent_of_source",
    parsed,
    "percent",
    sourceText,
    conditionSuffix(match[4]),
  )];
}

function parseAddedAsMultiDamage(line, sourceText) {
  const match = line.match(ADDED_AS_MULTI_DAMAGE_RE);
  if (!match) return null;
  const parsed = parsedValue(match[1]);
  if (!parsed) return null;
  const sourceDamage = match[2].toLocaleLowerCase("en-US");
  const targetTypes = match[3].match(/Physical|Fire|Cold|Lightning|Erosion/giu) ?? [];
  if (targetTypes.length < 2) return null;
  return targetTypes.map((targetType) => effect(
    `${sourceDamage}_damage_as_${targetType.toLocaleLowerCase("en-US")}_damage`,
    "gain_percent_of_source",
    parsed,
    "percent",
    sourceText,
    conditionSuffix(match[4]),
  ));
}

function parseBaseWeaponStat(line, sourceText) {
  let match = line.match(/^(\d+(?:\.\d+)?)\s+Critical Strike Rating$/iu);
  if (match) return [effect("critical_strike_rating", "set", { value: Number(match[1]) }, "rating", sourceText)];
  match = line.match(/^(\d+(?:\.\d+)?)\s+Attack Speed$/iu);
  if (match) return [effect("attack_speed", "set", { value: Number(match[1]) }, "rate_per_second", sourceText)];
  return null;
}

function parseRegeneration(line, sourceText) {
  const match = line.match(REGENERATION_RE);
  if (!match) return null;
  const parsed = parsedValue(match[1]);
  if (!parsed) return null;
  const resource = slug(match[3]);
  const unit = match[2] ? "percent_per_second" : "flat_per_second";
  return [effect(`${resource}_regeneration`, "add", parsed, unit, sourceText, conditionSuffix(match[4]))];
}

function parseScopedRegeneration(line, sourceText) {
  const match = line.match(new RegExp(
    String.raw`^While\s+(.+?),\s+Spirit Magi regenerate\s+(${VALUE_SOURCE})\s*(%)?\s+Life per second$`,
    "iu",
  ));
  if (!match) return null;
  const parsed = parsedValue(match[2]);
  if (!parsed) return null;
  return [effect(
    "spirit_magus_life_regeneration",
    "add",
    parsed,
    match[3] ? "percent_per_second" : "flat_per_second",
    sourceText,
    `while ${match[1]}`,
  )];
}

function parseRestoreOrLoss(line, sourceText) {
  const restore = line.match(RESTORE_RE);
  const loss = restore ? null : line.match(LOSE_RE);
  const match = restore ?? loss;
  if (!match) return null;
  const parsed = parsedValue(match[1]);
  if (!parsed) return null;
  const resource = slug(match[3]);
  const operation = restore ? "restore" : "lose";
  const unit = match[2] ? "percent_of_max" : "flat";
  return [effect(`${resource}_${operation}`, operation, parsed, unit, sourceText, conditionSuffix(match[4]))];
}

function parseConversion(line, sourceText) {
  const match = line.match(CONVERSION_RE);
  if (!match) return null;
  const parsed = parsedValue(match[2]);
  if (!parsed) return null;
  return [effect(
    `${slug(match[3])}_to_${slug(match[4])}`,
    "convert_percent",
    parsed,
    "percent",
    sourceText,
    combineCondition(match[1] ? `[${match[1]}]` : "", match[5]),
  )];
}

function parseBooleanOrFixedRule(line, sourceText) {
  let match = line.match(/^Movement Speed is fixed to\s+(\d+(?:\.\d+)?)\s*%\s+of the base value$/iu);
  if (match) {
    return [effect("movement_speed", "set_percent_of_base", { value: Number(match[1]) }, "percent", sourceText)];
  }
  match = line.match(/^(Fire|Cold|Lightning|Erosion) Resistance is fixed at\s+(\d+(?:\.\d+)?)\s*%$/iu);
  if (match) {
    return [effect(`${match[1].toLocaleLowerCase("en-US")}_resistance`, "set", { value: Number(match[2]) }, "percent", sourceText)];
  }
  match = line.match(/^Weapon Attack Speed is fixed at\s+(\d+(?:\.\d+)?)$/iu);
  if (match) return [effect("gear_attack_speed", "set", { value: Number(match[1]) }, "rate_per_second", sourceText)];
  match = line.match(/^The Critical Strike Rating is fixed at\s+(\d+(?:\.\d+)?)\s+for the Weapon$/iu);
  if (match) return [effect("critical_strike_rating", "set", { value: Number(match[1]) }, "rating", sourceText)];
  match = line.match(/^You can only equip\s+(\d+)\s+Vorax Gear$/iu);
  if (match) return [effect("max_vorax_gear_equipped", "set", { value: Number(match[1]) }, "count", sourceText)];
  match = line.match(/^You can only cast\s+(\d+)\s+Curses$/iu);
  if (match) return [effect("max_curses", "set", { value: Number(match[1]) }, "count", sourceText)];
  match = line.match(/^You can cast\s+(\d+)\s+additional Curses$/iu);
  if (match) return [effect("max_curses", "add", { value: Number(match[1]) }, "count", sourceText)];
  match = line.match(/^The number of Max Synthetic Troops In Map is fixed at\s+(\d+)$/iu);
  if (match) return [effect("max_synthetic_troops_in_map", "set", { value: Number(match[1]) }, "count", sourceText)];
  match = line.match(/^The skill cost is fixed at\s+(.+)$/iu);
  if (match) {
    const parsed = parsedValue(match[1]);
    if (parsed) return [effect("skill_cost", "set", parsed, "flat", sourceText)];
  }
  match = line.match(/^(.+?) Charge\s+'s Restoration Speed is set to\s+(.+?)\s*%\s+of the default value$/iu);
  if (match) {
    const parsed = parsedValue(match[2]);
    if (parsed) {
      return [effect(`${slug(match[1])}_charge_restoration_speed`, "set_percent_of_default", parsed, "percent", sourceText)];
    }
  }
  match = line.match(/^Enlarges Physique by\s+(.+?)\s*%$/iu);
  if (match) {
    const parsed = parsedValue(match[1]);
    if (parsed) return [effect("physique", "add_percent", parsed, "percent", sourceText)];
  }
  match = line.match(/^Immune to\s+(.+)$/iu);
  if (match) return [effect(`${slug(match[1])}_immunity`, "set", { value: true }, "boolean", sourceText)];
  match = line.match(/^(.+?)\s+are immune to\s+(.+)$/iu);
  if (match) return [effect(`${slug(match[1])}_${slug(match[2])}_immunity`, "set", { value: true }, "boolean", sourceText)];
  match = line.match(/^Block Lucky(?:\s+(when\b.+))?$/iu);
  if (match) return [effect("block_lucky", "set", { value: true }, "boolean", sourceText, match[1])];
  if (/^Lucky Critical Strike$/iu.test(line)) {
    return [effect("critical_strike_lucky", "set", { value: true }, "boolean", sourceText)];
  }
  if (/^Have Fervor$/iu.test(line)) return [effect("fervor", "set", { value: true }, "boolean", sourceText)];
  match = line.match(/^Cannot inflict\s+(.+)$/iu);
  if (match) return [effect(`can_inflict_${slug(match[1])}`, "set", { value: false }, "boolean", sourceText)];
  if (/^Critical Strikes cannot deal additional damage$/iu.test(line)) {
    return [effect("critical_strike_additional_damage_enabled", "set", { value: false }, "boolean", sourceText)];
  }
  if (/^The base main attribute no longer additionally increases damage$/iu.test(line)) {
    return [effect("base_main_attribute_damage_bonus_enabled", "set", { value: false }, "boolean", sourceText)];
  }
  return null;
}

function parseCompoundDirectModifiers(line, sourceText) {
  if (!line.includes(";")) return null;
  const parts = line.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const effects = [];
  for (const part of parts) {
    const parsed = parseDirectModifier(part, sourceText);
    if (!parsed?.length) return null;
    effects.push(...parsed);
  }
  return effects;
}

function parseMechanicalLine(line) {
  const sourceText = line;
  const parsers = [
    parseBaseDamage,
    parseAddedAilmentDamage,
    parseAddedMultiDamage,
    parseAddedDamage,
    parseAddedAsMultiDamage,
    parseAddedAsDamage,
    parseBaseWeaponStat,
    parseRegeneration,
    parseScopedRegeneration,
    parseRestoreOrLoss,
    parseConversion,
    parseBooleanOrFixedRule,
    parseConditionalDirectModifier,
    parseScopedDirectModifier,
    parseCompoundDirectModifiers,
    parseDirectModifier,
    parsePostfixModifier,
  ];
  for (const parser of parsers) {
    const effects = parser(line, sourceText);
    if (effects?.length) return { effects, blockers: [] };
  }
  return {
    effects: [],
    blockers: [{ sourceText, reason: blockerReason(line) }],
  };
}

// Syntax only. Callers must bind the original SS14 page receipt themselves.
// No catalog lookup, historical numeric value, or default roll is supplied.
export function parseTlidbNumericModifierLine(line) {
  return parseMechanicalLine(normalizedText(line));
}

function blockerReason(line) {
  if (/^<.*(?:Random|랜덤|무작위).*>$/iu.test(line)) return "randomized-effect-unresolved";
  if (/\b(?:supported by|supports? the main skill)\b/iu.test(line)) return "skill-support-runtime-required";
  if (/\b(?:triggers?|triggered)\b/iu.test(line)) return "trigger-runtime-required";
  if (/\b(?:stack|stacks|stacking|growth|command)\b/iu.test(line)) return "stacking-runtime-required";
  if (/\b(?:inflicts?|cursed?|curse|eliminate|barrier|reap|shadows?|blessing)\b/iu.test(line)) {
    return "legendary-runtime-mechanic";
  }
  if (/\d/u.test(line)) return "unsupported-numeric-mechanic";
  return "unsupported-nonnumeric-mechanic-or-flavor";
}

function result(effects, blockers, flavorLines = []) {
  return { effects, blockers, flavorLines };
}

function verifiedFlavorReceipt(item, locale) {
  const receipt = TLIDB_GEAR_FLAVOR_RECEIPTS.entriesByItemId?.[item?.id];
  if (
    !receipt
    || receipt.sourceUrl !== locale?.sourceUrl
    || receipt.catalogSourcePageSha256 !== locale?.sourcePageSha256
    || !Array.isArray(receipt.lines)
  ) return null;
  return receipt;
}

function flavorLineEvidence(sourceText, receipt) {
  return {
    sourceText,
    calculationApplicable: false,
    classification: "tlidb-flavor-text",
    evidence: {
      sourceUrl: receipt.sourceUrl,
      contentSha256: receipt.networkContentSha256,
      sourceHtmlClass: "fst-italic",
    },
  };
}

function rollIdentity(item, locale) {
  return String(
    item?.id
    ?? item?.tlidbStableKey
    ?? locale?.sourceRecordKey
    ?? locale?.sourcePageSha256
    ?? "anonymous-current-ss13-gear",
  );
}

function assignRollKeys(effects, identity, lineIndex) {
  return effects.map((parsedEffect) => {
    if (!parsedEffect.roll) return parsedEffect;
    return {
      ...parsedEffect,
      roll: {
        key: `tlidb-gear-tooltip:${identity}:${lineIndex}:${parsedEffect.stat}`,
        ...parsedEffect.roll,
      },
    };
  });
}

function parseExactTooltipText(sourceText, identity, flavorReceipt = null) {
  const effects = [];
  const blockers = [];
  const flavorLines = [];
  const verifiedFlavorLines = new Set(flavorReceipt?.lines ?? []);
  for (const [lineIndex, line] of detailLines(sourceText).entries()) {
    const parsed = parseMechanicalLine(line);
    if (verifiedFlavorLines.has(line) && (!flavorReceipt?.protectMechanicalLines || !parsed.effects.length)) {
      flavorLines.push(flavorLineEvidence(line, flavorReceipt));
      continue;
    }
    effects.push(...assignRollKeys(parsed.effects, identity, lineIndex));
    blockers.push(...parsed.blockers);
  }
  return result(effects, blockers, flavorLines);
}

function rollSignature(effect) {
  const minimum = Number(effect?.roll?.min);
  const maximum = Number(effect?.roll?.max);
  if (!effect?.stat || !effect?.operation || !Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return "";
  }
  return [effect.stat, effect.operation, effect.unit ?? "", minimum, maximum].join("\u0000");
}

function rollRangeSignature(range) {
  const minimum = Number(range?.min);
  const maximum = Number(range?.max);
  return Number.isFinite(minimum) && Number.isFinite(maximum)
    ? `${minimum}\u0000${maximum}`
    : "";
}

function exactLegendaryVariantForAuthority(variant, authority) {
  return Boolean(
    variant?.sourcePageVersion === "SS13"
    && variant?.sourceFieldStatus?.text === "exact"
    && variant?.sourceUrl === authority?.sourceUrl
    && variant?.sourcePageSha256 === authority?.receipt?.sourcePageSha256
    && typeof variant?.text === "string"
    && variant.text,
  );
}

export function projectTlidbGearTooltipRollValues(item, config = {}, authority = null) {
  const selectedRolls = config?.rolls && typeof config.rolls === "object" ? config.rolls : {};
  const projectedRolls = { ...selectedRolls };
  // Direct normal-tooltip inputs cannot stand in for a corroded variant.
  const hasCorrosion = Array.isArray(config.legendaryDraft?.corrodedSlotIds)
    ? config.legendaryDraft.corrodedSlotIds.length > 0 : config.corrupted === true;
  if (hasCorrosion) {
    for (const key of Object.keys(projectedRolls)) {
      if (key.startsWith(`tlidb-gear-tooltip:${item.id}:`)
        && (!authority?.variantReceipts || !authority.parsedEffects.some((effect) => effect.roll?.key === key))) delete projectedRolls[key];
    }
  }
  const targetEffectsBySignature = new Map();
  const targetEffectsByRange = new Map();
  for (const effect of authority?.parsedEffects ?? []) {
    const signature = rollSignature(effect);
    if (!signature) continue;
    const entries = targetEffectsBySignature.get(signature) ?? [];
    entries.push(effect);
    targetEffectsBySignature.set(signature, entries);
    const rangeSignature = rollRangeSignature(effect.roll);
    const rangeEntries = targetEffectsByRange.get(rangeSignature) ?? [];
    rangeEntries.push(effect);
    targetEffectsByRange.set(rangeSignature, rangeEntries);
  }
  if (!targetEffectsBySignature.size) return projectedRolls;

  const hasExplicitDraft = config?.legendaryDraft
    && typeof config.legendaryDraft === "object"
    && Array.isArray(config.legendaryDraft.corrodedSlotIds);
  const corrodedSlotIds = new Set(hasExplicitDraft ? config.legendaryDraft.corrodedSlotIds : []);

  for (const affix of item?.legendaryAffixes ?? []) {
    const variantName = corrodedSlotIds.has(affix.slotId)
      || (!hasExplicitDraft && config?.corrupted === true)
      ? "corroded"
      : "normal";
    const variant = affix?.[variantName];
    if (!exactLegendaryVariantForAuthority(variant, authority)) continue;
    const parsed = parseExactTooltipText(variant.text, item.id);
    const mappings = [];
    for (const parsedEffect of parsed.effects) {
      const signature = rollSignature(parsedEffect);
      const targets = signature ? targetEffectsBySignature.get(signature) ?? [] : [];
      if (targets.length !== 1) continue;
      const matchingRollDefs = (variant.rollDefs ?? []).filter((roll) => (
        Number(roll.min) === Number(parsedEffect.roll?.min)
        && Number(roll.max) === Number(parsedEffect.roll?.max)
      ));
      if (matchingRollDefs.length !== 1) continue;

      mappings.push({ roll: matchingRollDefs[0], target: targets[0] });
    }

    for (const roll of variant.rollDefs ?? []) {
      if (mappings.some((mapping) => mapping.roll.key === roll.key)) continue;
      const sameRangeDefs = variant.rollDefs.filter(
        (candidate) => rollRangeSignature(candidate) === rollRangeSignature(roll),
      );
      const targets = targetEffectsByRange.get(rollRangeSignature(roll)) ?? [];
      if (sameRangeDefs.length !== 1 || targets.length !== 1) continue;
      mappings.push({ roll, target: targets[0] });
    }

    for (const { roll, target } of mappings) {
      const displayRollKey = `legendary:${affix.slotId}:${variantName}:${roll.key}`;
      if (!Object.hasOwn(selectedRolls, displayRollKey)) continue;
      const targetRollKey = target.roll.key;
      if (Object.hasOwn(selectedRolls, targetRollKey)) continue;

      const selectedValue = Number(selectedRolls[displayRollKey]);
      if (
        !Number.isFinite(selectedValue)
        || selectedValue < Number(target.roll.min)
        || selectedValue > Number(target.roll.max)
      ) continue;
      projectedRolls[targetRollKey] = selectedValue;
    }
  }

  return projectedRolls;
}

export function parseTlidbGearTooltip(item, { locale = "en", season = "SS13", flavorReceipt = null } = {}) {
  const verifiedLocale = sourceLocale(item, locale, season);
  if (!verifiedLocale) {
    return result([], untrustedSourceLines(item, locale).map((sourceText) => ({
      sourceText,
      reason: season === "SS13" ? "source-not-exact-current-ss13" : "source-not-exact-requested-season",
    })));
  }

  const lines = detailLines(verifiedLocale.detail);
  if (item?.sourceKind === "divinity-slate" || (item?.categoryId && item.categoryId !== "gear")) {
    return result([], lines.map((sourceText) => ({
      sourceText,
      reason: "non-equipment-current-record",
    })));
  }

  const identity = rollIdentity(item, verifiedLocale);
  const seasonalFlavor = season === "SS14" && flavorReceipt?.sourceUrl === verifiedLocale.sourceUrl
    && flavorReceipt.sourcePageSha256 === verifiedLocale.sourcePageSha256
    && flavorReceipt.sourceHtmlClass === "fst-italic" && Array.isArray(flavorReceipt.lines)
    ? { ...flavorReceipt, networkContentSha256: flavorReceipt.sourcePageSha256, protectMechanicalLines: true } : null;
  return parseExactTooltipText(
    lines.join("\n"),
    identity,
    season === "SS13" ? verifiedFlavorReceipt(item, verifiedLocale) : seasonalFlavor,
  );
}

export const parseCurrentSs13GearTooltip = parseTlidbGearTooltip;
export const calculateTlidbGearTooltip = parseTlidbGearTooltip;
