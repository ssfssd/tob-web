// Native weapon properties stay on their own slot; they are never global spell bonuses.
export const SEASON_LOCAL_WEAPON_STATS = new Set(["weapon_critical_strike_rating", "weapon_attack_speed",
  "gear_elemental_damage", "gear_attack_speed", "gear_attack_critical_strike_rating",
  ...['physical', 'fire', 'cold', 'lightning', 'erosion'].flatMap(type => [`gear_${type}_damage`, `gear_${type}_damage_min`, `gear_${type}_damage_max`])]);
export const SEASON_SPELL_FLAT_STATS = new Set(["physical", "fire", "cold", "lightning", "erosion"].flatMap(type =>
  ["min", "max"].map(side => `spell_${type}_damage_${side}`)));
export const SEASON_GLOBAL_FLAT_STATS = new Set([...SEASON_SPELL_FLAT_STATS,...[...SEASON_SPELL_FLAT_STATS].map(s=>s.replace(/^spell_/u,'attack_'))]);
export const SEASON_GEAR_LEVEL_STATS = new Set(['all_skill_levels', 'main_skill_levels', 'active_skill_levels', 'passive_skill_levels',
  'spell_projectile_skill_levels', 'attack_projectile_skill_levels', 'horizontal_projectile_skill_levels', ...['physical','cold','fire','lightning','erosion','minion','spell','attack','beam','mobility','defensive','projectile','aura','curse','restoration','empower','focus'].map(t=>`${t}_skill_levels`)]);
// Player hit evaluation must not reject or inherit minion-owned modifiers.
// The separate minion evaluator still validates every selected minion effect.
export const SEASON_MINION_STATS = new Set(['minion_damage','minion_fire_damage','minion_lightning_damage',
  'minion_attack_speed','minion_cast_speed','minion_cold_penetration','minion_fire_penetration',
  'minion_lightning_penetration','minion_erosion_penetration','minion_armor_penetration',
  'minion_critical_strike_rating','minion_critical_strike_damage','minion_double_damage_chance',
  'minion_max_life','minion_projectile_speed','minion_movement_speed','minion_skill_area','minion_attack_damage','minion_spell_damage',
  ...['physical','cold','fire','lightning','erosion'].flatMap(t=>['min','max'].map(s=>`minion_${t}_damage_${s}`))]);
// These are consumed by the SS14 character/offense engines from rawEffects.
// The legacy display mapper is not the authority for their SS14 support.
export const SEASON_NATIVE_GEAR_STATS = new Set([...SEASON_GEAR_LEVEL_STATS,...SEASON_MINION_STATS,
  ...['', 'attack_', 'spell_', 'projectile_', ...['physical','cold','fire','lightning','erosion'].map(t=>`${t}_skill_`)]
    .flatMap(prefix=>['rating','damage','lucky','unlucky','very_lucky'].map(s=>`${prefix}critical_strike_${s}`)),
  'max_spell_burst','spell_burst_charge_speed','spell_burst_hit_damage',
  'damage_lucky','damage_unlucky','damage_very_lucky','erosion_resistance_penetration','melee_damage',
  'skill_damage','channeled_skill_damage','melee_physical_damage','erosion_area_damage',
  'damage','hit_damage','spell_damage','attack_damage','elemental_damage','physical_damage','fire_damage','cold_damage','lightning_damage','erosion_damage',
  'projectile_damage','area_damage','damage_over_time','attack_speed','cast_speed','fire_penetration','cold_penetration','lightning_penetration',
  'max_vorax_gear_equipped',
  'max_focus_blessing_stacks','max_agility_blessing_stacks','max_tenacity_blessing_stacks',
  ...['fire','cold','lightning'].map(t=>`physical_damage_as_${t}`)]);
export const SEASON_DEFENSIVE_STATS = new Set(['max_life_as_energy_shield','damage_bypasses_energy_shield','damage_transferred_to_minion',
  'blur_rating','blur_avoidance','elemental_damage_taken','elemental_ailment_avoidance','max_frostbite_rating','injury_buffer',
  'max_life','max_mana','max_energy_shield','gear_armor','gear_evasion','gear_energy_shield','armor','evasion','movement_speed',
  'fire_resistance','cold_resistance','lightning_resistance','erosion_resistance','elemental_resistance','all_resistance',
  'max_elemental_resistance','max_fire_resistance','max_cold_resistance','max_lightning_resistance','max_erosion_resistance',
  'damage_taken','physical_damage_taken','life_regeneration_flat','mana_regeneration_flat','life_regeneration_percent','mana_regeneration_percent',
  'life_regeneration_speed','mana_regeneration_speed','energy_shield_charge_speed','energy_shield_charge_interval',
  'attack_block_chance','spell_block_chance','block_chance','block_ratio','max_block_ratio','can_evade',
  'life_regain','energy_shield_regain','armor_effective_rate_for_non_physical_damage','chance_to_avoid_damage',
  'trauma_immunity','frostbite_immunity','ignite_immunity','wilt_immunity']);
for(const stat of SEASON_DEFENSIVE_STATS)SEASON_NATIVE_GEAR_STATS.add(stat);
const additional = new Set([...SEASON_DEFENSIVE_STATS,...SEASON_MINION_STATS,'skill_damage','channeled_skill_damage','melee_physical_damage','erosion_area_damage','damage','damage_taken','minion_damage','spell_damage','attack_damage','elemental_damage','physical_damage','fire_damage','cold_damage','lightning_damage','erosion_damage','attack_speed','cast_speed','armor','evasion','max_life','max_mana','max_energy_shield']);
const slotLabels = new Set(["One-Handed", "Two-handed", "Two-Handed", "Hands", "Helmet", "Feet", "Chest", "Off-Hand", "Finger", "Neck", "Waist"]);
export function normalizeSeasonGearEffects(parsed) {
  return { ...parsed,
    blockers: parsed.blockers.filter(b => !slotLabels.has(b.sourceText)),
    effects: parsed.effects.flatMap(effect => {
      if(effect.stat==='defense'&&['add_percent','more','more_percent'].includes(effect.operation))
        return ['armor','evasion','max_energy_shield'].map(stat=>({...effect,stat}));
      if (SEASON_GEAR_LEVEL_STATS.has(`${effect.stat}s`)) return {...effect,stat:`${effect.stat}s`};
      const addedAs=effect.stat.match(/^physical_damage_as_(fire|cold|lightning)_damage$/u);
      if(addedAs)return {...effect,stat:`physical_damage_as_${addedAs[1]}`,
        operation:effect.operation==='gain_percent_of_source'?'add_percent':effect.operation};
      const flat=effect.stat.match(/^attack_and_spell_(physical|fire|cold|lightning|erosion)_damage_(min|max)$/u);
      if(flat)return ['attack','spell'].map(prefix=>({...effect,stat:`${prefix}_${flat[1]}_damage_${flat[2]}`}));
      if(effect.stat.startsWith('additional_')&&additional.has(effect.stat.slice(11))&&effect.operation==='more_percent')return {...effect,stat:effect.stat.slice(11),operation:'more'};
      if(effect.stat==='chance_to_deal_double_damage')return {...effect,stat:'double_damage_chance'};
      if (effect.operation === "set" && effect.stat === "critical_strike_rating") return { ...effect, stat: "weapon_critical_strike_rating" };
      if (effect.operation === "set" && effect.stat === "attack_speed" && effect.unit === "rate_per_second") return { ...effect, stat: "weapon_attack_speed" };
      if (effect.stat === "additional_projectile_speed") return { ...effect, stat: "projectile_speed", operation: "more" };
      if (effect.stat === "additional_physical_damage_taken") return { ...effect, stat: "physical_damage_taken", operation: "more" };
      if (effect.stat === "life_regeneration") return { ...effect, stat: "life_regeneration_flat" };
      if (effect.stat === "mana_regeneration") return { ...effect, stat: "mana_regeneration_flat" };
      if (["additional_damage", "additional_damage_taken", "additional_minion_damage"].includes(effect.stat)
        && effect.operation === "more_percent") return { ...effect, stat: effect.stat.replace(/^additional_/u, ""), operation: "more" };
      return effect;
    }) };
}
