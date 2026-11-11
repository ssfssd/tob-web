import { effectSourceLabel } from "./seasonEffectSources.js";
import { checkSeasonSupportHost } from "./seasonSupport.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";

export const SEASON_STAT_LABELS = {
  damage: "대미지", hit_damage: "적중 대미지", spell_damage: "주술 대미지", attack_damage: "공격 대미지",
  physical_damage: "물리 대미지", cold_damage: "냉기 대미지", fire_damage: "화염 대미지", lightning_damage: "번개 대미지",
  erosion_damage: "부식 대미지", elemental_damage: "원소 대미지", area_damage: "범위 대미지", projectile_damage: "투사체 대미지",
  spell_projectile_damage: "주술 투사체 대미지", damage_over_time: "지속 대미지", additional_cold_damage: "냉기 대미지",
  strength: "힘", dexterity: "민첩", intelligence: "지혜", all_stats: "모든 속성", all_attributes: "모든 속성",
  max_life: "최대 HP", max_mana: "최대 MP", max_energy_shield: "최대 보호막", armor: "아머", evasion: "회피",
  gear_armor: "장비 아머", gear_evasion: "장비 회피", gear_energy_shield: "장비 보호막",
  gear_physical_damage_min: "무기 최소 물리 대미지", gear_physical_damage_max: "무기 최대 물리 대미지",
  gear_physical_damage: "장비 물리 대미지", gear_attack_speed: "장비 공격 속도",
  gear_attack_critical_strike_rating: "장비 공격 크리티컬 수치",
  minion_damage: "소환체 대미지", minion_attack_speed: "소환체 공격 속도", minion_cast_speed: "소환체 시전 속도",
  minion_max_life: "소환체 최대 HP", minion_critical_strike_rating: "소환체 크리티컬 수치",
  minion_critical_strike_damage: "소환체 크리티컬 대미지", skill_area: "스킬 범위", projectile_quantity: "투사체 수량",
  cast_speed: "시전 속도", attack_speed: "공격 속도", movement_speed: "이동 속도", projectile_speed: "투사체 속도",
  cold_resistance: "냉기 저항", fire_resistance: "화염 저항", lightning_resistance: "번개 저항", erosion_resistance: "부식 저항",
  elemental_resistance: "원소 저항", all_resistance: "모든 저항", cooldown_recovery_speed: "쿨타임 회복 속도",
  skill_effect_duration: "스킬 효과 지속 시간", skill_duration: "스킬 지속 시간", life_regeneration_flat: "HP 자연 회복",
  life_regeneration_percent: "최대 HP 비례 자연 회복", mana_regeneration_flat: "MP 자연 회복", mana_regeneration_percent: "최대 MP 비례 자연 회복",
  critical_strike_rating: "크리티컬 수치", spell_critical_strike_rating: "주술 크리티컬 수치", attack_critical_strike_rating: "공격 크리티컬 수치",
  projectile_critical_strike_rating: "투사체 크리티컬 수치", weapon_critical_strike_rating: "무기 크리티컬 수치", weapon_attack_speed: "무기 공격 속도",
  critical_strike_damage: "크리티컬 대미지", spell_critical_strike_damage: "주술 크리티컬 대미지", attack_critical_strike_damage: "공격 크리티컬 대미지",
  projectile_critical_strike_damage: "투사체 크리티컬 대미지", double_damage_chance: "더블 대미지 확률",
  spell_double_damage_chance: "주술 더블 대미지 확률", attack_double_damage_chance: "공격 더블 대미지 확률",
  spell_projectile_skill_levels: "주술 투사체 스킬 레벨", all_skill_levels: "모든 스킬 레벨", jump_count: "점프 횟수",
  cold_penetration: "냉기 저항 관통", fire_penetration: "화염 저항 관통", lightning_penetration: "번개 저항 관통",
  elemental_resistance_penetration: "원소 저항 관통", erosion_resistance_penetration: "부식 저항 관통",
  spell_lightning_damage_min: "주술 최소 번개 대미지", spell_lightning_damage_max: "주술 최대 번개 대미지",
  max_life_as_energy_shield: "최대 HP 비례 보호막", max_spell_burst: "매직 버스트 최대치", spell_burst_charge_speed: "매직 버스트 충전 속도",
  damage_taken: "받는 대미지", physical_damage_taken: "받는 물리 대미지", block_chance: "막기 확률", block_ratio: "막기 비율",
  fire_damage_reflection: "화염 대미지 반사", cold_damage_reflection: "냉기 대미지 반사", lightning_damage_reflection: "번개 대미지 반사",
  blessing_duration: "축복 지속 시간", elemental_ailment_avoidance: "원소 이상 회피", clockwork_damage: "클락워크 코어 대미지",
  life_regeneration_speed: "HP 자연 회복 속도", mana_regeneration_speed: "MP 자연 회복 속도",
  energy_shield_charge_speed: "보호막 충전 속도", energy_shield_charge_interval: "보호막 충전 간격",
  attack_block_chance: "공격 막기 확률", spell_block_chance: "주술 막기 확률", max_block_ratio: "최대 막기 비율",
  elemental_damage_taken: "받는 원소 대미지", injury_buffer: "대미지 완충", max_frostbite_rating: "최대 빙결 수치",
  max_fire_resistance: "최대 화염 저항", max_cold_resistance: "최대 냉기 저항", max_lightning_resistance: "최대 번개 저항",
  max_erosion_resistance: "최대 부식 저항", max_elemental_resistance: "최대 원소 저항", max_all_resistance: "최대 모든 저항",
};

const supportLabels = {
  "supported-skill-damage": "보조 대상 스킬 대미지", "supported-skill-cast-speed": "보조 대상 시전 속도",
  "supported-skill-hit-damage": "보조 대상 적중 대미지",
  "supported-skill-attack-speed": "보조 대상 공격 속도", "supported-skill-cooldown-recovery-speed": "보조 대상 쿨타임 회복 속도",
  "supported-skill-projectile-quantity": "보조 대상 투사체 수", "mana-cost-multiplier": "보조 MP 소모 배율", "buff-duration": "버프 지속 시간",
  "supported-skill-area": "보조 대상 스킬 범위", "supported-skill-projectile-speed": "보조 대상 투사체 속도",
};
Object.assign(SEASON_STAT_LABELS,{aura_effect:'오라 효과',sealed_mana_compensation:'MP 봉인 보상',warcry_effect:'함성 효과',elixir_effect:'영약 스킬 효과',
  life_regain:'HP 반환',energy_shield_regain:'보호막 반환',minion_projectile_speed:'소환체 투사체 속도',minion_movement_speed:'소환체 이동 속도',minion_skill_area:'소환체 스킬 범위',
  minion_double_damage_chance:'소환체 더블 대미지 확률',armor_damage_mitigation_penetration:'아머 대미지 감면 관통',
  fire_damage_taken:'적이 받는 화염 대미지',affliction_effect:'심화 효과'});
Object.assign(SEASON_STAT_LABELS,{base_ailment_damage_min:'기본 이상 최소 대미지',base_ailment_damage_max:'기본 이상 최대 대미지',
  ill_omen_efficiency:'오멘 누적 효율',damaging_ailment_chance:'대미지형 상태 이상 확률',frostbite_effect:'빙결 효과',
  numbed_effect:'마취 효과',numbed_additional_stacks:'마취 추가 중첩',deterioration_damage:'악화 대미지'});
Object.assign(SEASON_STAT_LABELS,{terra_damage:'지면 스킬 대미지',demolisher_damage:'파괴 스킬 대미지'});
Object.assign(SEASON_STAT_LABELS,{attack_aggression_effect:'맹공 효과',spell_aggression_effect:'주술 과격 효과',
  minion_attack_damage:'소환체 공격 대미지',minion_spell_damage:'소환체 주술 대미지',mobility_cooldown_recovery_speed:'이동 스킬 쿨타임 회복 속도',
  projectile_critical_hit_damage:'투사체 크리티컬 적중 대미지',cold_critical_hit_damage:'크리티컬 적중 냉기 대미지',max_lightning_damage:'최대 번개 대미지'});
const addedDamageLabels = { physical: "물리", fire: "화염", cold: "냉기", lightning: "번개", erosion: "부식" };
for (const [type, label] of Object.entries(addedDamageLabels)) for (const side of ["min", "max"]) {
  supportLabels[`supported-skill-added-${type}-damage-${side}`] = `보조 대상 추가 ${label} 대미지 ${side === "min" ? "최소" : "최대"}`;
  SEASON_STAT_LABELS[`spell_${type}_damage_${side}`] = `주술 ${side === "min" ? "최소" : "최대"} ${label} 대미지`;
  SEASON_STAT_LABELS[`attack_${type}_damage_${side}`] = `공격 ${side === 'min'?'최소':'최대'} ${label} 대미지`;
  SEASON_STAT_LABELS[`minion_${type}_damage_${side}`] = `소환체 ${side === 'min'?'최소':'최대'} ${label} 대미지`;
  SEASON_STAT_LABELS[`${type}_skill_levels`] = `${label} 스킬 레벨`;
  SEASON_STAT_LABELS[`minion_${type}_penetration`] = `소환체 ${label} 관통`;
}
SEASON_STAT_LABELS.minion_skill_levels='소환체 소환 스킬 레벨';
Object.assign(SEASON_STAT_LABELS,{main_skill_levels:'메인 스킬 레벨',active_skill_levels:'액티브 스킬 레벨',passive_skill_levels:'패시브 스킬 레벨',
  spell_skill_levels:'주술 스킬 레벨',attack_skill_levels:'공격 스킬 레벨',beam_skill_levels:'빔 스킬 레벨',mobility_skill_levels:'이동 스킬 레벨',
  defensive_skill_levels:'방어 스킬 레벨',attack_projectile_skill_levels:'공격 투사체 스킬 레벨'});
SEASON_STAT_LABELS.spirit_magus_origin_effect='마령의 근원 효과';
Object.assign(SEASON_STAT_LABELS,{curse_effect:'저주 효과',max_curses:'동시 저주 상한'});
for(const [type,label] of Object.entries(addedDamageLabels))SEASON_STAT_LABELS[`enemy_${type}_damage_taken`]=`적이 받는 ${label} 대미지`;
Object.assign(SEASON_STAT_LABELS,{max_vorax_gear_equipped:'보락스 장비 장착 상한',
  max_focus_blessing_stacks:'집요한 축복 최대 중첩',max_agility_blessing_stacks:'황홀한 축복 최대 중첩',max_tenacity_blessing_stacks:'강건한 축복 최대 중첩',
  armor_effective_rate_for_non_physical_damage:'비물리 대미지 아머 유효 비율',chance_to_avoid_damage:'대미지 회피 확률',
  trauma_immunity:'외상 면역',frostbite_immunity:'빙결 면역',ignite_immunity:'점화 면역',wilt_immunity:'몰락 면역',
  projectile_skill_levels:'투사체 스킬 레벨',aura_skill_levels:'오라 스킬 레벨',curse_skill_levels:'저주 스킬 레벨',
  restoration_skill_levels:'회복 스킬 레벨',empower_skill_levels:'자극 스킬 레벨'});
SEASON_STAT_LABELS.minion_armor_penetration='소환체 아머 감면 관통';
Object.assign(SEASON_STAT_LABELS,{affliction_per_second:'초당 심화',enemy_hit_damage_taken:'적이 받는 적중 대미지',enemy_dot_damage_taken:'적이 받는 지속 대미지',
  enemy_all_damage_taken:'적이 받는 대미지',sealed_mana_percent:'봉인 MP 비율',energy_shield_regeneration_percent:'보호막 비례 자연 회복',
  cold_damage_taken:'적이 받는 냉기 대미지',lightning_damage_taken:'적이 받는 번개 대미지',
  shadow_strike_damage:'그림자 스킬 대미지',slash_strike_damage:'슬래시 스킬 대미지',tangle_damage:'부착 스킬 대미지',attack_horizontal_damage:'공격 수평 사격 대미지',
  melee_damage:'근접 스킬 대미지',melee_attack_speed:'근접 공격 속도',melee_critical_strike_rating:'근접 크리티컬 수치'});
Object.assign(SEASON_STAT_LABELS,{slash_strike_ailment_damage:'슬래시 상태 이상 대미지',demolisher_ailment_damage:'파괴 상태 이상 대미지',area_ailment_damage:'범위 상태 이상 대미지',projectile_ailment_damage:'투사체 상태 이상 대미지'});

const finite = Number.isFinite;
const round = n => finite(n) ? Math.round(n * 1e8) / 1e8 : null;
const validEffect = e => finite(e.value) && !e.condition && !e.conditionRequirements && !e.per && !e.target
  && (!e.roll || finite(e.roll.min) && finite(e.roll.max) && e.value >= e.roll.min && e.value <= e.roll.max);

// This is arithmetic over accepted SS14 options, not another DPS engine.
// Keep local weapon/armor properties apart; never add a percentage to a flat
// amount, or add independent "more" multipliers to each other.
export function calculateSeasonNumericStats(report) {
  const groups = new Map(); const excluded = [];
  const accept = (effect, owner) => {
    const stat = effect.stat, label = SEASON_STAT_LABELS[stat] ?? (owner.group === "supports" ? supportLabels[stat] : null);
    if (!label || !validEffect(effect) || !["add", "add_percent", "more", "more_percent", "set"].includes(effect.operation)) {
      excluded.push({ ...owner, stat, sourceText: effect.sourceText, reason: !label ? "옵션 합산 분류 미지원" : "조건·수치·연산 확인 필요" }); return;
    }
    const scope = stat === "buff-duration" || /^(?:gear_|weapon_)/u.test(stat) ? owner.path : owner.scope ?? "global";
    const key = `${scope}:${stat}`;
    const row = groups.get(key) ?? { key, stat, label, scope, scopeLabel: effectSourceLabel(scope), flat: null, increased: null, more: null, fixed: null,
      conflict: false, sources: [] };
    const operation = /^supported-skill-added-\w+-damage-(min|max)$/u.test(stat) && effect.operation === "set" ? "add" : effect.operation;
    if (stat === "mana-cost-multiplier" && operation === "set") row.more = (row.more ?? 1) * effect.value / 100;
    else if (operation === "add" && effect.unit !== "percent") row.flat = (row.flat ?? 0) + effect.value;
    else if (operation === "add_percent" || operation === "add") row.increased = (row.increased ?? 0) + effect.value;
    else if (["more", "more_percent"].includes(operation)) row.more = (row.more ?? 1) * (1 + effect.value / 100);
    else { if (row.fixed !== null && row.fixed !== effect.value) row.conflict = true; row.fixed = effect.value; }
    row.sources.push({ ...owner, value: effect.value, operation, unit: effect.unit,
      sourceText: effect.sourceText, receipt: effect.receipt ?? owner.receipt });
    groups.set(key, row);
  };
  const projection = report.componentProjection;
  for (const effect of projection.effects) {
    const owner = projection.rows.find(r => r.path === effect.path);
    accept(effect, { path: effect.path ?? effect.group ?? "blessings", group: effect.group,
      name: owner?.name ?? "", origin: effectSourceLabel(effect.path, effect.group) });
  }
  for (const component of report.components.filter(c => c.category === "gear")) {
    for (const entry of component.calculations ?? []) for (const effect of entry.rawEffects ?? []) {
      const path = `gear.slots.${entry.slotIndex}`;
      accept(effect, { path, name: component.name, origin: effectSourceLabel(path, "gear"), receipt: entry.receipt });
    }
  }
  for (const component of report.components.filter(c => c.category === "supports")) {
    for (const entry of component.calculations ?? []) {
      const host = report.components.find(c => c.category === "skills" && c.calculations?.some(e => e.rowIndex === entry.rowIndex));
      const hostEntry = host?.calculations.find(e => e.rowIndex === entry.rowIndex);
      const path = `skills.rows.${entry.rowIndex}.supports.${entry.supportIndex}`;
      const owner = { path, scope: `skills.rows.${entry.rowIndex}`, group: "supports", name: component.name,
        origin: effectSourceLabel(path, "supports"), receipt: entry.receipt };
      if (entry.blockers.length || !host || checkSeasonSupportHost(component.id, SS14_CARDS_EN.records[host.id], hostEntry, entry.rowIndex) !== true) {
        excluded.push({ ...owner, reason: "보조 수치·연결 스킬의 호환 조건 확인 필요" }); continue;
      }
      for (const effect of entry.effects ?? []) accept(effect, owner);
    }
  }
  const options = [...groups.values()].map(r => ({ ...r, flat: round(r.flat), increased: round(r.increased),
    more: round(r.more), fixed: r.conflict ? null : r.fixed }));
  const skills = report.components.filter(c => c.category === "skills").flatMap(component => (component.calculations ?? []).map(entry => {
    const direct = report.coupledSkills.rows.find(r => r.rowIndex === entry.rowIndex && r.id === component.id);
    const offense = report.offense.rows.find(r => r.rowIndex === entry.rowIndex && r.id === component.id);
    const pools = direct?.offenseBasis?.pools;
    const sum = side => pools?.length && pools.every(p => finite(p[side])) ? round(pools.reduce((n, p) => n + p[side], 0)) : null;
    return { id: component.id, name: component.name, rowIndex: entry.rowIndex, level: direct?.level ?? entry.level,
      values: { ...entry.values, minHit: sum("min"), maxHit: sum("max"), rate: direct?.offenseBasis?.rate ?? null,
        criticalRating: offense?.values.criticalRating ?? null, criticalChance: offense?.values.effectiveCriticalChance ?? null,
        criticalDamage: offense?.values.criticalDamage ?? null }, receipt: entry.receipt,
      blockers: [...new Set([...entry.blockers, ...(direct?.blockers ?? []), ...(offense?.blockers ?? [])])] };
  }));
  // Legacy catalog references intentionally retain their old status for source
  // comparison. The visible warning list must use the resolved current model,
  // not those generic migration disclaimers or missing flat-catalog aliases.
  const unresolved=report.fullDps ? [
    ...projection.rows.flatMap(row=>(row.blockers??[]).map(b=>({path:row.path,label:row.name,reason:b.reason}))),
    ...(report.character?.blockers??[]).map(reason=>({label:'캐릭터 수치',reason})),
    ...report.fullDps.blockers.map(reason=>({label:'전체 DPS',reason})),
  ] : report.blockers.filter(b=>b.path!=='season-rules');
  unresolved.push(...(projection.globalBlockers??[]).map(reason=>({reason})));
  return { options, skills, excluded, unresolved:[...new Map(unresolved.map(r=>[`${r.path??''}:${r.reason}`,r])).values()], scope: "confirmed-options-only" };
}
