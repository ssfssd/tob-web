import { findItemById } from "./catalog.js";
import { parseSeasonSkillMechanics, VOLTAIC_RIPPLE_ID } from "./seasonSkillMechanics.js";
import { evaluateTlidbSkillDamage } from "./tlidbSkillDamageRuntime.js";
import { seasonActionRateCap } from './seasonCalculation.js';
import { checkSeasonSupportHost, LUNAR_ECLIPSE_ID, recentDamageConflict } from "./seasonSupport.js";
import { iceLancesShotgunPlan } from './seasonIceLancesShotgun.js';
import { ADDED_LIGHTNING_RANGE_ISSUE, manualAddedLightningRange, seasonDamageContext } from "./seasonWeaponInputs.js";
import { SEASON_LOCAL_WEAPON_STATS, SEASON_GLOBAL_FLAT_STATS, SEASON_GEAR_LEVEL_STATS, SEASON_GEAR_COST_STATS, SEASON_GEAR_NUMBED_STATS, SEASON_GEAR_NUMBED_MODIFIERS, SEASON_DEFENSIVE_STATS, SEASON_MINION_STATS, SEASON_REAPING_STATS, seasonOutgoingDamageConversion } from "./seasonGearEffects.js";
import { SEASON_BLESSING_CAP_STATS } from './seasonBlessings.js';
import { seasonWeaponRestrictionIssue } from './seasonWeaponRestrictions.js';
import { isObservedTerraGearEffect } from './seasonGearEffects.js';
import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { readPeriodicBurstUptime } from './seasonSkillInputs.js';

// This is deliberately a direct-card projection, not a character model. Every
// gear effect must be either consumed or explicitly disclosed outside its scope.
const outsideScope = new Set([...SEASON_LOCAL_WEAPON_STATS, ...SEASON_GLOBAL_FLAT_STATS, ...SEASON_GEAR_LEVEL_STATS, ...SEASON_GEAR_COST_STATS, ...SEASON_GEAR_NUMBED_STATS, ...SEASON_GEAR_NUMBED_MODIFIERS, ...SEASON_DEFENSIVE_STATS, ...SEASON_MINION_STATS, ...SEASON_BLESSING_CAP_STATS, 'max_vorax_gear_equipped', "strength", "dexterity", "intelligence", "all_stats", "all_attributes",
  "weapon_critical_strike_rating", "weapon_attack_speed", "spell_lightning_damage_min", "spell_lightning_damage_max",
  "spell_projectile_skill_levels", "all_skill_levels", "jump_count", "blessing_duration", "physical_damage_taken", "life_regeneration_flat", "elemental_ailment_avoidance", "cooldown_recovery_speed", "skill_effect_duration", "skill_duration",
  "max_life", "max_mana", "max_energy_shield", "gear_energy_shield", "gear_armor", "gear_evasion", "sealed_mana_compensation",
  "armor", "evasion", "movement_speed", "projectile_speed", "fire_resistance", "cold_resistance",
  "lightning_resistance", "erosion_resistance", "elemental_resistance", "all_resistance",
  "critical_strike_rating", "spell_critical_strike_rating", "attack_critical_strike_rating",
  "critical_strike_damage", "spell_critical_strike_damage", "attack_critical_strike_damage",
  "projectile_critical_strike_rating", "projectile_critical_strike_damage",
  "double_damage_chance", "attack_double_damage_chance", "spell_double_damage_chance",
  "critical_strike_lucky", "critical_strike_unlucky", "critical_strike_very_lucky",
  "damage_lucky", "damage_unlucky", "damage_very_lucky", "max_spell_burst", "spell_burst_charge_speed", "spell_burst_hit_damage",
  "fire_penetration", "cold_penetration", "lightning_penetration", "erosion_resistance_penetration",
  "elemental_resistance_penetration", "spell_elemental_penetration", "armor_damage_mitigation_penetration", "projectile_armor_penetration", "cold_damage_taken", "spell_damage_taken", "affliction_effect"]);
const damageStats = { damage: "skill-damage", hit_damage: "skill-hit-damage", spell_damage: "skill-spell-damage", attack_damage: "skill-attack-damage",
  elemental_damage: "skill-elemental-damage", attack_elemental_damage: "skill-elemental-damage", physical_damage: "skill-physical-damage", fire_damage: "skill-fire-damage",
  cold_damage: "skill-cold-damage", lightning_damage: "skill-lightning-damage", erosion_damage: "skill-erosion-damage",
  additional_cold_damage: "skill-cold-damage",
  cast_speed: "skill-cast-speed", attack_speed: "skill-attack-speed", area_damage: "skill-area-damage",
  projectile_damage: "skill-projectile-damage", min_damage: "skill-minimum-damage", max_damage: "skill-maximum-damage", damage_over_time: "skill-damage-over-time" };
for (const stat of SEASON_REAPING_STATS) damageStats[stat] = stat.replaceAll("_", "-");
damageStats.spell_projectile_damage = "skill-projectile-damage";
damageStats.clockwork_damage = "skill-damage";
damageStats.terra_damage = 'skill-damage';
damageStats.demolisher_damage = 'skill-damage';
damageStats.shadow_strike_damage='skill-damage';
damageStats.slash_strike_damage='skill-damage';
damageStats.tangle_damage='skill-damage';
damageStats.attack_horizontal_damage='skill-damage';
damageStats.melee_damage='skill-damage';
damageStats.melee_attack_speed='skill-attack-speed';
damageStats.skill_damage='skill-damage';
damageStats.channeled_skill_damage='skill-damage';
damageStats.melee_physical_damage='skill-physical-damage';
damageStats.erosion_area_damage='skill-erosion-damage';
damageStats.max_lightning_damage = 'skill-maximum-lightning-damage';
for (const type of ["fire", "cold", "lightning"]) damageStats[`physical_damage_as_${type}`] = `skill-physical-damage-as-${type}`;

export const seasonDpsSpecialStat = stat => outsideScope.has(stat) && /lucky|penetration|spell_burst/u.test(stat)
  && !stat.startsWith("critical_") && !SEASON_MINION_STATS.has(stat);
export const seasonDirectDamageStat = stat => Object.hasOwn(damageStats, stat);

export function calculateSeasonCoupledSkills(components, skills, componentProjection = { effects: [], rows: [] }, build = {}, {mana:maxMana,sealedMana} = {}) {
  const gear = components.filter((row) => row.category === "gear").flatMap((row) =>
    (row.calculations ?? []).map(entry => ({ ...entry, itemId: row.id })));
  const blockers = [...(componentProjection.globalBlockers ?? [])];
  const effects = [];
  const omitted = [];
  const componentReceipts = [];
  const recentDamageStates=components.filter(c=>c.category==='supports').flatMap(c=>c.calculations??[])
    .flatMap(row=>row.mechanics??[]).filter(m=>m.kind==='recent-nonphysical-damage-types');
  if(new Set(recentDamageStates.map(m=>m.types.join(','))).size>1)blockers.push(recentDamageConflict);
  const periodicBursts=components.filter(c=>c.category==='supports').flatMap(({id,calculations})=>(calculations??[]).flatMap(linked=>
    (linked.mechanics??[]).filter(m=>m.kind==='periodic-burst').map(mechanic=>({id,linked,mechanic}))));
  if (periodicBursts.length) {
    const uptime=readPeriodicBurstUptime(build.ss14Inputs?.dps);
    if (![0,100].includes(uptime)) blockers.push('간헐적 폭발의 현재 적용 여부를 선택하세요.');
    else if (uptime===100 && periodicBursts.length>1) blockers.push('간헐적 폭발을 여러 칸에 장착한 경우의 버프 중첩은 확인되지 않았습니다.');
    else if (uptime===100) {
      const [{id,linked,mechanic}]=periodicBursts;
      for (const stat of ['skill-attack-speed','skill-cast-speed']) effects.push({ stat, operation:'add', unit:'percent',
        value:mechanic.value, sourceText:mechanic.sourceText, effectSource:{path:`skills.rows.${linked.rowIndex}.supports.${linked.supportIndex}`,
          itemId:id,sourceText:mechanic.sourceText,stat} });
    }
  }
  let blackHoleBuffSeen = false;
  for (const row of components.filter(c => c.category === "skills")) for (const entry of row.calculations ?? []) {
    const euphoria = entry.mechanics?.find(m => m.kind === "black-hole-euphoria");
    if (!euphoria) continue;
    if (blackHoleBuffSeen) { blockers.push("중복 블랙홀 버프의 합산 규칙 미확인"); continue; }
    blackHoleBuffSeen = true;
    const state = build.ss14Inputs?.dps?.skills?.[entry.rowIndex]?.euphoria;
    const affliction = build.ss14Inputs?.dps?.enemy?.affliction;
    if (![0, 1].includes(state) || !Number.isFinite(affliction)) blockers.push("블랙홀의 버프 적용 여부와 대상 심화를 확인하세요.");
    else effects.push({ stat: "skill-damage-over-time", operation: "more", value: euphoria.per * Math.floor(affliction / 10) * state, unit: "percent", sourceText: euphoria.sourceText });
  }
  const componentSources=new Map(componentProjection.rows.map(row=>[row.path,row]));
  for (const effect of componentProjection.effects) {
    const conversion = seasonOutgoingDamageConversion(effect);
    const source=componentSources.get(effect.path);
    const effectSource={path:effect.path,itemId:source?.itemId,name:source?.name,sourceText:effect.sourceText,stat:effect.stat};
    if (conversion && Number.isFinite(effect.value) && !effect.condition && !effect.conditionRequirements && !effect.per && !effect.target) {
      effects.push({ ...effect, ...conversion, operation: 'set', optionalConversionSource: true,
        effectSource });
      componentReceipts.push(effect.receipt);
    } else if (damageStats[effect.stat] && ["add_percent", "more"].includes(effect.operation)) {
      effects.push({ ...effect, effectSource,
        stat: damageStats[effect.stat], operation: effect.operation === "add_percent" ? "add" : "more" });
      componentReceipts.push(effect.receipt);
    } else omitted.push({ path: effect.path, stat: effect.stat, sourceText: effect.sourceText, reason: "outside-direct-damage-scope" });
  }
  for (const row of componentProjection.rows.filter((row) => row.blockers.length)) omitted.push({
    path: row.path, reason: "component-effect-unresolved", blockers: row.blockers });
  for (const entry of gear) {
    if (entry.status !== "mapped") { blockers.push("선택 장비의 SS14 효과·수치 연결이 미완료입니다."); continue; }
    for (const effect of entry.rawEffects ?? []) {
      const conversion = seasonOutgoingDamageConversion(effect);
      if (/^(fire|cold|lightning)_damage_reflection$/u.test(effect.stat)) {
        if (build.ss14Inputs?.dps?.skills?.[0]?.incomingHits !== 0) blockers.push("반사 피격 횟수를 선택하세요. 현재 반사 없는 전투 조건(0회)에서 전체 DPS를 계산합니다.");
        else omitted.push({ slotIndex: entry.slotIndex, stat: effect.stat, sourceText: effect.sourceText, reason: "explicit-no-incoming-hits" });
      } else if (effect.condition || effect.conditionRequirements || effect.per || effect.target) {
        blockers.push("조건·대상·누적 효과의 결합 계산은 미지원입니다.");
      } else if (conversion) {
        if (!Number.isFinite(effect.value)) {
          blockers.push(`장비 옵션 수치를 입력하세요: ${effect.sourceText ?? effect.stat}`);
          continue;
        }
        effects.push({ ...effect, ...conversion, operation: 'set', optionalConversionSource: true,
          effectSource: { path: `gear.slots.${entry.slotIndex}`, itemId: entry.itemId, sourceText: effect.sourceText, stat: effect.stat } });
      } else if (outsideScope.has(effect.stat)||isObservedTerraGearEffect(effect)) {
        omitted.push({ slotIndex: entry.slotIndex, stat: effect.stat, sourceText: effect.sourceText, reason: "outside-direct-damage-scope" });
      } else if (damageStats[effect.stat] && effect.roll && !Number.isFinite(effect.value)) {
        blockers.push(`장비 옵션 수치를 입력하세요: ${effect.sourceText ?? effect.stat}`);
      } else if (damageStats[effect.stat] && (["add_percent", "more"].includes(effect.operation)
        || effect.stat === "additional_cold_damage" && effect.operation === "more_percent")) {
        effects.push({ ...effect, effectSource: { path: `gear.slots.${entry.slotIndex}`, itemId: entry.itemId, sourceText: effect.sourceText, stat: effect.stat },
          stat: damageStats[effect.stat], operation: effect.operation === "add_percent" ? "add" : "more" });
      } else {
        blockers.push("선택 장비에 직접 대미지 결합에서 지원하지 않는 효과가 있습니다.");
      }
    }
  }
  // A missing catalog ID has no calculations; it must not disappear as zero.
  if (components.some((row) => row.category === "gear" && !row.calculations?.length)) blockers.push("선택 장비의 항목 연결을 확인할 수 없습니다.");
  const elixirs = new Set(componentProjection.rows.filter(r => r.elixirState && r.receipt).map(r => r.itemId));
  const rows = components.filter((row) => row.category === "skills" && !elixirs.has(row.id)).flatMap((row) => (row.calculations ?? []).filter(entry => !entry.mechanics?.some(m => m.kind === "utility-skill")).map((entry) => {
    const reasons = [...blockers, ...entry.blockers];
    const record = skills.records?.[row.id];
    const skillInput = build.ss14Inputs?.dps?.skills?.[entry.rowIndex];
    if (skillInput?.itemId === row.id && skillInput.sourcePageSha256 === record?.sourcePageSha256
      && manualAddedLightningRange(skillInput) === null) reasons.push(ADDED_LIGHTNING_RANGE_ISSUE);
    const weaponIssue=seasonWeaponRestrictionIssue(build,record);
    if(weaponIssue)reasons.push(`${row.name}: ${weaponIssue}`);
    const item = findItemById(row.id);
    const supportEffects = [];
    const supportReceipts = [];
    for (const support of components.filter((part) => part.category === "supports")) {
      if (!support.calculations?.length) { reasons.push("보조의 적용 스킬 연결 미확인"); continue; }
      for (const linked of support.calculations.filter((part) => part.rowIndex === entry.rowIndex)) {
        reasons.push(...linked.blockers);
        if (checkSeasonSupportHost(support.id, record, entry, entry.rowIndex) !== true) reasons.push("선택 스킬과 SS14 보조의 호환 조건을 확인할 수 없습니다.");
        supportEffects.push(...linked.effects.map(effect => ({ ...effect, effectSource: {
          path: `skills.rows.${linked.rowIndex}.supports.${linked.supportIndex}`, itemId: support.id, sourceText: effect.sourceText, stat: effect.stat,
        } })));
        if (linked.receipt) supportReceipts.push(linked.receipt);
      }
    }
    const linkedSupports = components.filter(c => c.category === "supports").flatMap(c => c.calculations ?? []).filter(c => c.rowIndex === entry.rowIndex);
    let permafrost = linkedSupports.flatMap(c=>c.mechanics??[]).find(m=>m.kind==='ice-lances-permafrost');
    const moonRainbow = linkedSupports.flatMap(c=>c.mechanics??[]).find(m=>m.kind==='moon-rainbow');
    const lunarRing = linkedSupports.flatMap(c=>c.mechanics??[]).find(m=>m.kind==='moon-lunar-ring');
    const lunarEclipse = linkedSupports.flatMap(c=>c.mechanics??[]).find(m=>m.kind==='moon-lunar-eclipse');
    const waxAndWane = linkedSupports.flatMap(c=>c.mechanics??[]).find(m=>m.kind==='moon-wax-and-wane');
    const numbedSupport = linkedSupports.some(c => c.mechanics?.some(m => m.kind === "support-numbed-on-hit"));
    const voltageTurmoil=linkedSupports.some(c=>c.mechanics?.some(m=>m.kind==='voltage-turmoil'));
    const voltageJolt=linkedSupports.some(c=>c.mechanics?.some(m=>m.kind==='voltage-jolt'));
    const voltageAfterwave=linkedSupports.some(c=>c.mechanics?.some(m=>m.kind==='voltage-afterwave'));
    const terraChargeMaximum=row.id===VOLTAIC_RIPPLE_ID
      ? 1+gear.filter(g=>g.status==='mapped').flatMap(g=>g.rawEffects??[])
        .reduce((sum,e)=>sum+(isObservedTerraGearEffect(e)&&e.stat==='max_terra_charges'&&e.operation==='add'&&Number.isInteger(e.value)?e.value:0),0) : 1;
    const jumpControls = linkedSupports.flatMap(c => c.conditionControls ?? []).filter(c => c.key === "jumpsBeforeHit" || c.key === 'sameTargetHits' || c.key.startsWith('repeatJump-'));
    let maximumJumps;
    if (jumpControls.length) {
      const baseJumps = entry.mechanics?.find(m => m.kind === "ice-lances-projectile")?.jumps;
      const jumpEffects = [...gear.flatMap(c => c.rawEffects ?? []), ...componentProjection.effects].filter(e => e.stat === "jump_count");
      const known = Number.isInteger(baseJumps) && jumpEffects.every(e => e.operation === "add" && Number.isInteger(e.value)
        && !e.condition && !e.conditionRequirements && !e.per && !e.target);
      const extra = linkedSupports.flatMap(c => c.mechanics ?? []).filter(m => m.kind === "projectile-jumps").reduce((n,m) => n + m.value, 0);
      const maximum = known ? Math.max(0, baseJumps + extra + jumpEffects.reduce((n,e) => n + e.value, 0)) : 0;
      maximumJumps = known ? maximum : undefined;
      for (const control of jumpControls) {
        control.max = control.key === 'sameTargetHits' ? maximum + 1 : maximum;
        if (!known || Number.isFinite(control.value) && control.value > control.max)
          reasons.push("적중 전 점프 횟수가 현재 스킬·장비·보조에서 가능한 점프 수를 초과합니다.");
      }
    }
    const shotgun = iceLancesShotgunPlan(entry.mechanics?.find(m => m.kind === 'ice-lances-projectile'), linkedSupports, maximumJumps);
    reasons.push(...shotgun.blockers);
    const observedReaping = entry.mechanics?.find(m => m.kind === "wilting-beam-reaping");
    const beamCount = observedReaping?.baseBeams
      ? observedReaping.baseBeams + linkedSupports.flatMap(c=>c.mechanics??[])
        .filter(m=>m.kind==="wilting-extra-beam").reduce((sum,m)=>sum+m.value,0)
      : null;
    if (!beamCount && supportEffects.some(e=>e.perWiltingBeam))
      reasons.push("수확 회복 속도에 적용할 부식 광선 수를 확인할 수 없습니다.");
    let evaluation = null;
    let weaponHands = null;
    let moonStrike = null;
    let evaluatedEffects = [];
    if (!reasons.length && record?.season === "SS14" && record.sourceRecordKey === item?.tlidbText?.en?.sourceRecordKey) {
      const parsed = parseSeasonSkillMechanics({ id: row.id, categoryId: "skills", tlidbText: { en: {
        ...record, sourcePageVersion: "SS14", sourceFieldStatus: { detail: "exact" },
      } } }, { season: "SS14", level: entry.level, combat: build.ss14Inputs?.dps?.skills?.[entry.rowIndex] ?? {}, affliction: build.ss14Inputs?.dps?.enemy?.affliction, voltageTurmoil, terraChargeMaximum, maxMana, moonRainbow });
      moonStrike = parsed.mechanics.find(m=>m.kind==='moon-strike-forms');
      if (moonStrike && waxAndWane) moonStrike={...moonStrike,waxAndWane};
      if (moonStrike && moonStrike.manaBonus===null) reasons.push('문 스트라이크의 최대 MP를 확인하세요.');
      if (moonStrike && lunarRing && moonStrike.manaBonus!==null) {
        const manaBonus=Math.min(lunarRing.baseChance,Math.floor(maxMana/150));
        const slashChance=lunarRing.baseChance+manaBonus;
        const castChance=moonStrike.slashChance*slashChance/100;
        // Installed action 248347 selects one of two reactions with the same damage payload.
        const damageShare=moonStrike.slash*castChance/(100*moonStrike.averageCoefficient);
        moonStrike={...moonStrike,lunarRing:{...lunarRing,manaBonus,slashChance,castChance,damageShare}};
      }
      if (moonStrike && lunarEclipse) {
        if (!Number.isFinite(sealedMana) || sealedMana<0) reasons.push('월식에 적용할 MP 봉인량을 확인하세요.');
        else {
          const bonus = Math.min(lunarEclipse.maxBonus,Math.floor(sealedMana/100));
          moonStrike={...moonStrike,lunarEclipse:{sealedMana,bonus,fixedBonus:lunarEclipse.fixedBonus,sourceUrl:lunarEclipse.sourceUrl}};
          supportEffects.push({stat:'supported-skill-damage',operation:'more',unit:'percent',value:bonus,sourceText:lunarEclipse.sourceText,
            effectSource:{path:`skills.rows.${entry.rowIndex}.supports.4`,itemId:LUNAR_ECLIPSE_ID,stat:'supported-skill-damage'}});
        }
      }
      if (moonStrike && effects.some(e=>e.effectSource?.stat==='slash_strike_damage'))
        reasons.push('문 스트라이크의 슬래시 전용 대미지 배율은 형태별 적용을 확인해야 합니다.');
      const tags = new Set((record.tags ?? []).map((tag) => tag.toLowerCase()));
      const core = build.skills?.active?.[entry.rowIndex]?.supports?.some(s => s?.supportId === "supports-ss14-clockwork-core");
      const applicableEffects = (tags,{observedReaping=false,core=false,moonStrike=false}={}) => effects.filter((effect) =>
        (observedReaping || !SEASON_REAPING_STATS.has(effect.effectSource?.stat))
        && !(effect.stat === "skill-attack-damage" && tags.has("spell") && !tags.has("attack"))
        && !(effect.effectSource?.stat==='attack_elemental_damage'&&!tags.has('attack'))
        && !(effect.stat === 'skill-projectile-damage' && !tags.has('projectile'))
        && !(effect.stat === 'skill-area-damage' && !tags.has('area'))
        && !(effect.effectSource?.stat === "clockwork_damage" && !core)
        && !(effect.effectSource?.stat === "spell_projectile_damage" && (!tags.has("spell") || !tags.has("projectile")))
        && !(effect.effectSource?.stat === 'terra_damage' && !tags.has('terra'))
        && !(effect.effectSource?.stat === 'demolisher_damage' && !tags.has('demolisher'))
        && !(effect.effectSource?.stat === 'shadow_strike_damage' && !tags.has('shadow strike'))
        && !(effect.effectSource?.stat === 'slash_strike_damage' && !tags.has('slash-strike'))
        && !(effect.effectSource?.stat === 'tangle_damage' && !tags.has('tangle'))
        && !(effect.effectSource?.stat === 'attack_horizontal_damage' && (!tags.has('attack') || !tags.has('horizontal')))
        && !(['melee_damage','melee_attack_speed'].includes(effect.effectSource?.stat) && !tags.has('melee'))
        && !(effect.effectSource?.stat === 'melee_physical_damage' && !tags.has('melee'))
        && !(effect.effectSource?.stat === 'erosion_area_damage' && !tags.has('area'))
        && !(effect.effectSource?.stat === 'channeled_skill_damage' && !tags.has('channeled'))
        && !(effect.stat === "skill-spell-damage" && tags.has("attack") && !tags.has("spell") && !moonStrike)
        && !(effect.stat === "skill-attack-speed" && !tags.has("attack")) && !(effect.stat === "skill-cast-speed" && !tags.has("spell")))
        .map(effect=>moonStrike&&effect.stat==='skill-spell-damage'?{...effect,stat:'skill-damage'}:effect);
      const applicable=applicableEffects(tags,{observedReaping,core,moonStrike});
      if(permafrost){
        const frost=SS14_CARDS_EN.records['skills-tlidb-com-cn-frost-terra'];
        const frostTags=new Set(frost?.tags.map(tag=>tag.toLowerCase()));
        const selectedCharge=build.ss14Inputs?.dps?.skills?.[entry.rowIndex]?.permafrostCharge;
        if(frost?.sourceSeasonEvidence?.actualSeason===14 && frost.sourceSeasonEvidence.verificationComplete
          && frost.detail.includes('Main Stat:\nIntelligence\n') && record.detail.includes('Main Stat:\nIntelligence\n')
          && [0,1].includes(selectedCharge)){
          const frostEffects=[{stat:'persistent-cold-damage-per-second',operation:'set',value:permafrost.baseColdDps,unit:'flat'},
            {stat:'skill-damage',operation:'more',value:permafrost.damagePerCharge*selectedCharge,unit:'percent'},
            ...applicableEffects(frostTags)];
          const applied=evaluateTlidbSkillDamage({effects:frostEffects,level:permafrost.level,includeDamagePools:true,
            context:{damageTags:[...frostTags],target:'self',damageConversion:'ss14',verifiedDotOnly:true}});
          if(applied.complete && applied.dot.pools?.length)permafrost={...permafrost,charge:selectedCharge,dotPools:applied.dot.pools};
        }
      }
      evaluatedEffects = [...parsed.effects.map(effect => ({ ...effect, effectSource: {
        path: `skills.rows.${entry.rowIndex}`, itemId: row.id, sourceText: effect.sourceText, stat: effect.stat,
      } })), ...applicable, ...supportEffects.map(e=>e.perWiltingBeam ? {...e,value:e.value*beamCount} : e)];
      const context = seasonDamageContext(build, entry.rowIndex, row.id);
      context.actionRateCap = seasonActionRateCap('SS14');
      context.damageConversion = 'ss14';
      context.verifiedDotOnly = entry.damageCapabilities?.dot===true && entry.damageCapabilities.hit===false;
      context.persistentActionCadence = true;
      context.ignoreInapplicableCooldown = true;
      context.missingAddedDamageEffectiveness = parsed.missingAddedDamageEffectiveness;
      if (observedReaping) context.reapingEventsPerSecond = 0;
      if (row.id === "skills-tlidb-com-cn-ice-lances") context.projectiles = { base: 1, hitCount: 1 };
      if (tags.has("spell") || tags.has('attack')) {
        const added = [...gear.flatMap(e => e.rawEffects ?? []),...componentProjection.effects];
        for (const type of ["physical", "fire", "cold", "lightning", "erosion"]) {
          const sum = side => added.filter(e => e.stat === `${tags.has('spell')?'spell':'attack'}_${type}_damage_${side}` && e.operation === "add").reduce((n, e) => n + e.value, 0);
          if (sum("min") || sum("max")) context.addedDamage = { ...(typeof context.addedDamage === "object" ? context.addedDamage : {}),
            [type]: { min: (context.addedDamage?.[type]?.min ?? 0) + sum("min"), max: (context.addedDamage?.[type]?.max ?? 0) + sum("max") } };
        }
      }
      const {weaponHands: candidateHands,...combatContext} = context;
      const evaluate = (weaponDamage,inputEffects=evaluatedEffects) => evaluateTlidbSkillDamage({ effects:inputEffects, level: entry.level, includeDamagePools: true, includeHitStagesByType: true,
        context: { addedDamage: 0, criticalStrikeRating: 0, criticalStrikeDamage: 100,
          enemyArmor: 0, enemyResistances: {}, damageTags: [...tags], target: "self", ...combatContext, weaponDamage } });
      evaluation = evaluate(context.weaponDamage);
      if (candidateHands) {
        const rotations = candidateHands.map((hand,index)=>{
          const result = index===0 ? evaluation : evaluate(hand.weaponDamage);
          const hitTypes = new Set(result.hit.pools?.filter(pool=>pool.max>0).map(pool=>pool.type));
          const inapplicable = result.excluded.filter(e=>e.affectsCompletion && e.reason==='damage-modifier-target-unavailable' && (
            /^(?:supported-)?skill-(?:maximum-)?(?:fire|cold|lightning|physical|erosion)-damage$/u.test(e.stat)
              && !hitTypes.has(e.stat.split('-').at(-2))
            || /^(?:supported-)?skill-elemental-damage$/u.test(e.stat) && !['fire','cold','lightning'].some(type=>hitTypes.has(type))));
          if (!hitTypes.size || !inapplicable.length) return result;
          const skipped = new Set(inapplicable.map(e=>e.inputIndex));
          const indices = evaluatedEffects.map((_,i)=>i).filter(i=>!skipped.has(i));
          const reduced = evaluate(hand.weaponDamage,indices.map(i=>evaluatedEffects[i]));
          const restore = e=>({...e,inputIndex:indices[e.inputIndex]});
          return {...reduced,excluded:reduced.excluded.map(restore),applied:reduced.applied.map(restore)};
        });
        evaluation = rotations[0];
        if (rotations.every(e=>e.complete && e.hit.projectileHits===1 && e.dot.dps===0
          && !e.reaping && !e.spellBurst && !e.luckyDamage && !e.doubleDamage && !e.tripleDamage
          && !e.critical?.conditionalDamageMultiplier && (e.actionRate??e.hit.rate)===(evaluation.actionRate??evaluation.hit.rate))) {
          weaponHands = rotations.map((e,i)=>({slotIndex:i, baseCriticalRating:candidateHands[i].baseCriticalRating,
            receipts:candidateHands[i].receipts, hitDps:e.hit.dps, pools:e.hit.pools, excluded:e.excluded,
            conversionTrace:e.applied.filter(effect=>['conversion','gained-as-extra'].includes(effect.stage))
              .map(effect=>({...effect,effectSource:evaluatedEffects[effect.inputIndex]?.effectSource??null}))}));
        } else reasons.push('쌍수 교대 공격의 두 무기 적중·공격 속도를 확인할 수 없습니다.');
      }
      // A verified cold-only pool cannot benefit from a fire/lightning-only
      // increase. Do not confuse that inapplicability with an unknown pool or
      // discard a failed conversion/added-damage calculation.
      const unmatched = evaluation.excluded.filter(e => e.affectsCompletion);
      const pools = [...(evaluation.hit.pools ?? []), ...(evaluation.dot.pools ?? [])];
      if (!candidateHands && pools.length && unmatched.length && unmatched.every(e => e.reason === "damage-modifier-target-unavailable"
        && (/^(?:supported-)?skill-(?:maximum-)?(fire|cold|lightning|physical|erosion)-damage$/u.test(e.stat)
          && !pools.some(p => p.type === e.stat.split("-").at(-2))
          || e.stat === "skill-damage-over-time" && !evaluation.dot.pools?.length))) {
        const excluded = new Set(unmatched.map(e => e.inputIndex));
        omitted.push(...unmatched.map(e => ({ rowIndex: entry.rowIndex, stat: e.stat, sourceText: e.sourceText, reason: "verified-damage-type-absent" })));
        evaluatedEffects = evaluatedEffects.filter((_, index) => !excluded.has(index));
        evaluation = evaluate(context.weaponDamage);
      }
      const required = evaluation.excluded.filter(effect => effect.affectsCompletion);
      const isMissingEffectiveness = effect => effect.reason === 'added-damage-effectiveness-unavailable';
      if (required.some(isMissingEffectiveness)) {
        reasons.push('이 레벨의 추가 대미지 효율을 확인할 수 없습니다.');
      }
      if (parsed.blockers.length || !evaluation.complete && (!required.length || required.some(effect => !isMissingEffectiveness(effect))))
        reasons.push("SS14 스킬·장비 직접 효과 결합 해석 미완료");
    }
    const supported = !reasons.length && Number.isFinite(evaluation?.totalDps);
    const alternatingHitDps = weaponHands && (weaponHands[0].hitDps+weaponHands[1].hitDps)/2;
    const channelLimits = observedReaping ? evaluatedEffects.filter(e => /channeled-stacks/u.test(e.stat)) : [];
    const baseChannelStacks = channelLimits.length === 1 && channelLimits[0].stat === "max-channeled-stacks"
      && channelLimits[0].operation === "set" && Number.isInteger(channelLimits[0].value) && channelLimits[0].value > 0
      ? channelLimits[0].value : null;
    return { id: row.id, rowIndex: entry.rowIndex, level: entry.level, name: row.name, supported, shotgun, numbedSupport, voltageJolt, voltageAfterwave, terraChargeMaximum, permafrost,
      values: { dps: supported ? alternatingHitDps??evaluation.totalDps : null, unmodifiedDps: Number.isFinite(entry.values.baseDps) ? entry.values.baseDps : null },
      igniteSupportEffects: supportEffects.filter(e => ['supported-skill-damage', 'supported-skill-fire-damage',
        'supported-skill-elemental-damage', 'supported-skill-ailment-damage', 'supported-skill-damage-over-time'].includes(e.stat))
        .map(e => e.operation === 'add' && e.unit === 'percent' ? { ...e, operation: 'add_percent' } : e),
      damageStages: supported && !weaponHands ? evaluation.damageStages : null,
      offenseBasis: supported ? { hitDps: alternatingHitDps??evaluation.hit.dps, dotDps: evaluation.dot.dps, weaponHands, moonStrike,
        pools: weaponHands ? weaponHands.flatMap(hand=>hand.pools.map(pool=>({...pool,weaponSlot:hand.slotIndex}))) : evaluation.hit.pools,
        dotPools: evaluation.dot.pools, rate: evaluation.actionRate ?? evaluation.hit.rate, projectileHits: evaluation.hit.projectileHits,
        excluded: (weaponHands?.flatMap(hand=>hand.excluded)??evaluation.excluded).map(effect=>({...effect,effectSource:evaluatedEffects[effect.inputIndex]?.effectSource??null})),
        nativeSpellBurst: evaluation.spellBurst,
        reaping: observedReaping && evaluation.reaping ? { ...evaluation.reaping, baseChannelStacks, beamCount } : null,
        otherExpectation: Boolean(evaluation.luckyDamage || evaluation.doubleDamage || evaluation.tripleDamage
          || evaluation.reaping && (!observedReaping || evaluation.reaping.repeatChance !== undefined)
          || evaluation.critical?.conditionalDamageMultiplier),
        criticalEffects: evaluatedEffects.filter((e) => /critical/iu.test(e.stat)) } : null,
      blockers: [...new Set(reasons)], receipts: [entry.receipt, ...gear.map((entry) => entry.receipt), ...supportReceipts, ...componentReceipts].filter(Boolean),
      trace: supported && !weaponHands ? evaluation.applied.map(effect => ({ ...effect,
        effectSource: evaluatedEffects[effect.inputIndex]?.effectSource ?? null })) : [] };
  }));
  return { scope: "ss14-selected-components-direct-effects-only", rows, omitted,
    limitations: ["선택 스킬·연결 보조·장비와 히어로·재능·신격·정령 중 확인된 대미지·속도 효과와 직접 확인한 일부 조건만 결합한 부분 결과입니다. 전체 빌드 DPS가 아닙니다.",
      `구성 효과 ${componentProjection.effects.length}개 해석 · 미완료 구성 ${componentProjection.rows.filter((row) => row.blockers.length).length}개. 속성 파생·나머지 조건·특수 효과·크리티컬·적 방어는 포함하지 않습니다. 아래 구성별 내역에서 제외 사유를 확인하세요.`] };
}
