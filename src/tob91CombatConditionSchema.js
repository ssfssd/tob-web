export const TOB91_ETERNAL_STACK_KEYS = Object.freeze([
  "domination",
  "fervor",
  "guard",
  "nightmare",
  "phantom",
  "simulacrum",
]);

export const TOB91_RECENT_COUNT_KEYS = Object.freeze([
  "recent_kill_stack",
  "recent_warcry_skill_use",
  "spell_burst_activated_recently",
]);

export const TOB91_RECENT_FLAG_KEYS = Object.freeze([
  "has_used_mobility_skill_recently",
  "has_cast_curse_recently",
  "has_crit_recently",
  "has_blocked_recently",
  "has_taken_damage_recently",
  "has_not_been_hit_recently",
  "is_moving",
  "has_cast_sentry_skill_recently",
  "has_recently_summoned_minion",
  "has_used_ground_skill_recently",
  "refund_recently",
  "recently_killed_withered_enemy",
]);

export const TOB91_PLAYER_STATE_KEYS = Object.freeze([
  "life_low",
  "life_health",
  "channeling",
  "taking_dot",
  "shield_recharge_active",
  "charge_support_buff_active",
  "recovery_skill_active",
  "elixir_skill_active",
  "spell_burst_charging",
  "under_aura_infuse_spirit_source",
  "willpower_moving_grace_active",
  "core_skill_triggered",
  "standing_on_ground_skill",
]);

export const TOB91_PLAYER_RESOURCE_KEYS = Object.freeze([
  "has_full_mana",
  "has_low_mana",
  "low_energy_shield",
  "no_energy_shield",
]);

export const TOB91_ENEMY_STATE_KEYS = Object.freeze(["low_life", "has_elites_nearby"]);

export const TOB91_ACTIVE_DEBUFF_KEYS = Object.freeze([
  "cursed",
  "numbed",
  "blinded",
  "sluggish",
  "crippled",
  "knocked_back",
  "weakened",
  "damage_weakened",
  "intimidated",
  "taunted",
  "marked",
]);

export const TOB91_BOOLEAN_DEBUFF_KEYS = Object.freeze([
  "ignited",
  "has_desecration",
  "has_trauma",
  "has_wither",
  "shocked",
  "scorched",
  "at_max_affliction",
  "aggravate_capped",
]);

export const TOB91_DEBUFF_BOOLEAN_PATHS = Object.freeze([
  ["cursed", "active", "cursed"],
  ["frostbite", "can_inflict", "frostbite"],
  ["frostbite", "is_frozen", "frozen"],
  ["ignited", null, "ignited"],
  ["numbed", "active", "paralyzed"],
  ["blinded", "active", "blinded"],
  ["sluggish", "active", "sluggish"],
  ["crippled", "active", "crippled"],
  ["knocked_back", "active", "knocked_back"],
  ["weakened", "active", "weakened"],
  ["damage_weakened", "active", "damage_weakened"],
  ["intimidated", "active", "intimidated"],
  ["taunted", "active", "taunted"],
  ["marked", "active", "marked"],
  ["has_desecration", null, "desecration"],
  ["has_trauma", null, "trauma"],
  ["has_wither", null, "wither"],
  ["shocked", null, "shocked"],
  ["scorched", null, "scorched"],
  ["at_max_affliction", null, "at_max_affliction"],
  ["aggravate_capped", null, "aggravate_capped"],
]);

export const TOB91_DEBUFF_DISPLAY_KEYS = Object.freeze(
  TOB91_DEBUFF_BOOLEAN_PATHS.map(([, , targetKey]) => targetKey),
);

export const TOB91_ENEMY_DISTANCE_BANDS = Object.freeze(["close", "nearby", "far"]);
