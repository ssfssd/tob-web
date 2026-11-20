export function validSeasonGearEffects(gear) {
  return (gear.rawEffects ?? []).filter(e => Number.isFinite(e.value) && !e.condition && !e.conditionRequirements && !e.per && !e.target
    && (!e.roll || Number.isFinite(e.roll.min) && Number.isFinite(e.roll.max) && e.value >= e.roll.min && e.value <= e.roll.max));
}

// Native weapon properties stay on their own slot; they are never global spell bonuses.
export const SEASON_LOCAL_WEAPON_STATS = new Set(["weapon_critical_strike_rating", "weapon_attack_speed",
  "gear_elemental_damage", "gear_attack_speed", "gear_attack_critical_strike_rating",
  ...['physical', 'fire', 'cold', 'lightning', 'erosion'].flatMap(type => [`gear_${type}_damage`, `gear_${type}_damage_min`, `gear_${type}_damage_max`])]);
export const SEASON_SPELL_FLAT_STATS = new Set(["physical", "fire", "cold", "lightning", "erosion"].flatMap(type =>
  ["min", "max"].map(side => `spell_${type}_damage_${side}`)));
export const SEASON_GLOBAL_FLAT_STATS = new Set([...SEASON_SPELL_FLAT_STATS,...[...SEASON_SPELL_FLAT_STATS].map(s=>s.replace(/^spell_/u,'attack_'))]);
export const SEASON_GEAR_LEVEL_STATS = new Set(['all_skill_levels', 'support_skill_levels', 'main_skill_levels', 'active_skill_levels', 'passive_skill_levels',
  'spell_projectile_skill_levels', 'attack_projectile_skill_levels', 'horizontal_projectile_skill_levels', ...['physical','cold','fire','lightning','erosion','minion','spell','attack','beam','mobility','defensive','projectile','aura','curse','restoration','empower','focus'].map(t=>`${t}_skill_levels`)]);
const conversionTypes = ['physical', 'lightning', 'cold', 'fire', 'erosion'];
const outgoingConversions = new Map(conversionTypes.flatMap((source, index) =>
  conversionTypes.slice(index + 1).map(target => [`${source}_damage_to_${target}_damage`, {
    stat: `skill-${target}-damage-conversion`, sourceDependency: `${source} Damage`,
  }])));
// Player hit evaluation must not reject or inherit minion-owned modifiers.
// The separate minion evaluator still validates every selected minion effect.
export const SEASON_MINION_STATS = new Set(['minion_damage','minion_fire_damage','minion_lightning_damage',
  'minion_attack_speed','minion_cast_speed','minion_cold_penetration','minion_fire_penetration',
  'minion_lightning_penetration','minion_erosion_penetration','minion_armor_penetration',
  'minion_critical_strike_rating','minion_critical_strike_damage','minion_double_damage_chance',
  'minion_max_life','minion_projectile_speed','minion_movement_speed','minion_skill_area','minion_attack_damage','minion_spell_damage',
  'minion_physical_damage_as_erosion_damage','max_summonable_synthetic_troops',
  ...Array.from(outgoingConversions.keys(), key => `minion_${key}`),
  ...['physical','cold','fire','lightning','erosion'].flatMap(t=>['min','max'].map(s=>`minion_${t}_damage_${s}`))]);
// These are consumed by the SS14 character/offense engines from rawEffects.
// The legacy display mapper is not the authority for their SS14 support.
export const SEASON_GEAR_COST_STATS = new Set(['attack_skill_mana_cost','mana_cost_to_life_cost','spell_mana_cost_to_life_cost']);
export function isSeasonTargetDamageTaken(stat, type) {
  // Unqualified physical mitigation belongs to the player, even when a skill
  // or a summon still has a physical pool after outgoing conversion.
  return stat === `enemy_${type}_damage_taken` || type !== 'physical' && stat === `${type}_damage_taken`;
}

export function fixedSeasonErosionResistance(effects) {
  const overrides=effects.filter(e=>e.stat==='enemy_erosion_resistance_fixed');
  if(!overrides.length)return undefined;
  const value=overrides[0].value;
  return Number.isFinite(value)&&overrides.every(e=>e.operation==='set'&&e.value===value
    && !e.condition&&!e.conditionRequirements&&!e.per&&!e.target)?value:null;
}
export const SEASON_GEAR_NUMBED_STATS = new Set(['gear_numbed_additional_stacks','gear_numbed_critical_bonus']);
export const SEASON_GEAR_NUMBED_MODIFIERS = new Set(['numbed_duration','numbed_effect']);
export const SEASON_REAPING_STATS = new Set(['reaping_duration','reaping_recovery_speed']);
export const isObservedTerraGearEffect = effect=>effect.observedTerraCharge===true
  && ['max_terra_charges','terra_charge_restoration_speed'].includes(effect.stat);

export function seasonOutgoingDamageConversion(effect) {
  return effect.operation === 'convert_percent' ? outgoingConversions.get(effect.stat) : undefined;
}

export function seasonMinionDamageConversion(effect) {
  return effect.operation === 'convert_percent' && effect.stat.startsWith('minion_') ? outgoingConversions.get(effect.stat.slice(7)) : undefined;
}

export const SEASON_NATIVE_GEAR_STATS = new Set([...SEASON_GEAR_LEVEL_STATS,...SEASON_MINION_STATS,...SEASON_GEAR_COST_STATS,...SEASON_GEAR_NUMBED_STATS,...SEASON_REAPING_STATS,...outgoingConversions.keys(),'attack_elemental_damage',
  ...SEASON_GEAR_NUMBED_MODIFIERS,
  ...['', 'attack_', 'spell_', 'projectile_', ...['physical','cold','fire','lightning','erosion'].map(t=>`${t}_skill_`)]
    .flatMap(prefix=>['rating','damage','lucky','unlucky','very_lucky'].map(s=>`${prefix}critical_strike_${s}`)),
  'max_spell_burst','spell_burst_charge_speed','spell_burst_hit_damage',
  'damage_lucky','damage_unlucky','damage_very_lucky','erosion_resistance_penetration','elemental_resistance_penetration','melee_damage',
  'skill_damage','channeled_skill_damage','melee_physical_damage','erosion_area_damage',
  'damage','hit_damage','spell_damage','attack_damage','elemental_damage','physical_damage','fire_damage','cold_damage','lightning_damage','erosion_damage',
  'projectile_damage','area_damage','damage_over_time','attack_speed','cast_speed','fire_penetration','cold_penetration','lightning_penetration','max_lightning_damage',
  'armor_damage_mitigation_penetration','mind_infusion_movement_trigger',
  'max_vorax_gear_equipped',
  'max_focus_blessing_stacks','max_agility_blessing_stacks','max_tenacity_blessing_stacks',
  ...['fire','cold','lightning'].map(t=>`physical_damage_as_${t}`)]);
export const SEASON_DEFENSIVE_STATS = new Set(['max_life_as_energy_shield','damage_bypasses_energy_shield','damage_transferred_to_minion',
  'blur_rating','blur_avoidance','elemental_damage_taken','elemental_ailment_avoidance','max_frostbite_rating','injury_buffer',
  'max_life','max_mana','max_energy_shield','gear_armor','gear_evasion','gear_energy_shield','armor','evasion','movement_speed',
  'fire_resistance','cold_resistance','lightning_resistance','erosion_resistance','elemental_resistance','all_resistance','minion_elemental_resistance',
  'max_elemental_resistance','max_fire_resistance','max_cold_resistance','max_lightning_resistance','max_erosion_resistance',
  'damage_taken','physical_damage_taken','life_regeneration_flat','mana_regeneration_flat','life_regeneration_percent','mana_regeneration_percent',
  'life_regeneration_speed','mana_regeneration_speed','energy_shield_charge_speed','energy_shield_charge_interval','reaping_shield_charge',
  'attack_block_chance','spell_block_chance','block_chance','block_ratio','max_block_ratio','can_evade',
  'life_regain','energy_shield_regain','armor_effective_rate_for_non_physical_damage','chance_to_avoid_damage',
  'trauma_immunity','frostbite_immunity','ignite_immunity','wilt_immunity']);
for(const stat of SEASON_DEFENSIVE_STATS)SEASON_NATIVE_GEAR_STATS.add(stat);
const additional = new Set([...SEASON_DEFENSIVE_STATS,...SEASON_MINION_STATS,'skill_damage','channeled_skill_damage','melee_physical_damage','erosion_area_damage','damage','damage_taken','minion_damage','spell_damage','attack_damage','projectile_damage','elemental_damage','physical_damage','fire_damage','cold_damage','lightning_damage','erosion_damage','attack_speed','cast_speed','armor','evasion','max_life','max_mana','max_energy_shield']);
const slotLabels = new Set(["One-Handed", "Two-handed", "Two-Handed", "Hands", "Helmet", "Feet", "Chest", "Off-Hand", "Finger", "Neck", "Waist"]);
export const MIND_INFUSION_TRIGGER_STATE = "mind-infusion-movement-trigger-state";
const kinglyTerraLines = new Map([
  ['Max Terra Charge Stacks +2','max_terra_charges'],
  ["Terra Charge 's Restoration Speed is set to (240–300) % of the default value",'terra_charge_restoration_speed'],
  ['-2 % Movement Speed for every Terra Charge consumed recently. Stacks up to 10 time(s)','movement_speed'],
]);
const sunsetReapingLines = new Map([
  ['When Reaping , Energy Shield starts charging immediately','reaping_shield_charge'],
  ['When Reaping , Energy Shield starts charging immediately and cannot be interrupted within 2 s','reaping_shield_charge'],
  ['+(8–12) % Reaping Duration','reaping_duration'],
  ['+(13–18) % Reaping Duration','reaping_duration'],
]);

export function inactiveKinglyTerraOptions(parsed, record) {
  if (record.sourceRecordKey!=='Kingly_Armor' || record.season!=='SS14') return [];
  return [...parsed.blockers,...parsed.effects].flatMap(({sourceText})=>{
    const stat=kinglyTerraLines.get(sourceText);
    return stat ? [{stat,sourceText,reason:'이 빌드에서는 지면 에너지를 사용하지 않습니다.'}] : [];
  });
}

export function observedKinglyTerraOptions(parsed, record) {
  if (record.sourceRecordKey!=='Kingly_Armor' || record.season!=='SS14'
    || !record.sourceSeasonEvidence?.verificationComplete) return [];
  const cap=parsed.blockers.find(row=>row.sourceText==='Max Terra Charge Stacks +2' && row.reason==='stacking-runtime-required');
  if(cap){
    parsed.blockers=parsed.blockers.filter(row=>row!==cap);
    parsed.effects.push({stat:'max_terra_charges',operation:'add',value:2,unit:'flat',sourceText:cap.sourceText,observedTerraCharge:true});
  }
  for(const effect of parsed.effects.filter(row=>row.stat==='terra_charge_restoration_speed' && kinglyTerraLines.has(row.sourceText)))
    effect.observedTerraCharge=true;
  return parsed.effects.filter(row=>row.stat==='movement_speed' && kinglyTerraLines.has(row.sourceText))
    .map(({stat,sourceText})=>({stat,sourceText,reason:'관측한 시전 배분과 지속 대미지 가동률로 이동의 영향을 반영합니다.'}));
}

export function inactiveSunsetReapingOptions(parsed, record) {
  if (record.sourceRecordKey!=='Twilight_Vestment' || record.season!=='SS14') return [];
  return [...parsed.blockers,...parsed.effects].flatMap(({sourceText})=>{
    const stat=sunsetReapingLines.get(sourceText);
    return stat ? [{stat,sourceText,reason:'현재 빌드에는 수확을 발동하는 효과가 없습니다.'}] : [];
  });
}

export function inactiveIcePulseOptions(parsed, record, scope) {
  if (record.sourceRecordKey !== 'Ice_Pulse' || record.season !== 'SS14' || !scope) return [];
  // Installed modifier 51431051/51431050 changes skill-charge capacity (field 2006020).
  return [...parsed.blockers,...parsed.effects].flatMap(({sourceText,stat})=>{
    if (scope.noChargeSkill && stat==='max_charges' && sourceText==='+1 Max Charges')
      return [{stat,sourceText,reason:'충전 횟수가 적용되는 스킬이 장착되어 있지 않습니다.'}];
    if ((scope.noPotionOrMobility || scope.usesSelectedBuffState)
      && /^When defeating a Frostbitten enemy, - (20|25)\s*% current cooldown of potion and Mobility skills$/u.test(sourceText??''))
      return [{stat:'potion_mobility_cooldown_on_frostbite_kill',sourceText,reason:scope.noPotionOrMobility
        ? '물약·위치 이동 스킬이 장착되어 있지 않습니다.'
        : '현재 DPS는 선택한 간헐적 폭발 적용 상태를 사용합니다. 처치 시 쿨타임 감소로 버프 유지율을 계산하지 않습니다.'}];
    return [];
  });
}

function mindInfusionTriggerLines(blockers) {
  const names=["Dark Gate","Dazzling Bloom"];
  const choices=names.map(name=>blockers.map(b=>b.sourceText).filter(text=>
    text===`Triggers Lv. (10–20) ${name} when moving. Cooldown: 6 s`
    || text===`Triggers Lv. (15–30) ${name} when moving. Cooldown: 5 s`));
  return choices.every(lines=>lines.length===1) ? choices.map(([line])=>line) : null;
}
export function normalizeSeasonGearEffects(parsed, {sourceRecordKey,season}={}) {
  const spellConversion="Converts Spell Skills' Mana Cost to Life Cost";
  const convertedSpell = sourceRecordKey==='Ice_Pulse'&&parsed.blockers.find(b=>b.sourceText===spellConversion);
  const mindInfusion = sourceRecordKey==='Mind_Infusion';
  const triggers = mindInfusion ? mindInfusionTriggerLines(parsed.blockers) : null;
  const shieldOnReap = sourceRecordKey==='Twilight_Vestment' && season==='SS14'
    ? parsed.blockers.filter(b=>sunsetReapingLines.get(b.sourceText)==='reaping_shield_charge') : [];
  return { ...parsed,
    blockers: parsed.blockers.filter(b => !slotLabels.has(b.sourceText)
      && !(convertedSpell&&b.sourceText===spellConversion)
      && !triggers?.includes(b.sourceText)
      && !shieldOnReap.includes(b)
      && !(sourceRecordKey==='Oathkeeper'&&['No doubt, no fear, no self.','I go wherever my sword points.'].includes(b.sourceText))),
    effects: [...parsed.effects.flatMap(effect => {
      if (effect.stat==='armor_damage_mitigation_penetration' && effect.operation==='add_percent' && effect.condition==='for Minions') {
        const {condition,...scoped}=effect;
        return {...scoped,stat:'minion_armor_penetration'};
      }
      if (mindInfusion && effect.stat==='movement_speed' && effect.operation==='add_percent' && effect.condition==='for Nearby allies and you') {
        const {condition,...scoped}=effect;
        return scoped;
      }
      if (sourceRecordKey === 'Decayed_Mind' && effect.stat === 'physical_damage_as_erosion_damage'
        && effect.operation === 'gain_percent_of_source' && effect.condition === 'for Minions') {
        const {condition, ...scoped} = effect;
        return {...scoped, stat:'minion_physical_damage_as_erosion_damage'};
      }
      if(effect.stat==='additional_elemental_damage'&&effect.condition==='for Attack Skills'&&effect.operation==='more_percent'){
        const {condition,...scoped}=effect;
        return {...scoped,stat:'attack_elemental_damage',operation:'more'};
      }
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
    }),...shieldOnReap.map(({sourceText})=>({stat:'reaping_shield_charge',operation:'set',value:1,sourceText})),
      ...(convertedSpell?[{stat:'spell_mana_cost_to_life_cost',operation:'convert_percent',value:100,unit:'percent',sourceText:spellConversion}]:[]),
      ...(triggers?[{stat:'mind_infusion_movement_trigger',operation:'set',value:1,condition:MIND_INFUSION_TRIGGER_STATE,
        sourceText:triggers.join('\n')}]:[])] };
}
