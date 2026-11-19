import { SS14_THEA_COMBAT as rules } from "./data/ss14TheaCombat.generated.js";
import { bindTheaState } from "./seasonTheaState.js";
import { SS14_EXTENSION_NATIVE } from "./data/ss14ExtensionNative.generated.js";
import { createOmenAccumulator } from "./seasonOmen.js";
import { combatNumbedEnabled, hasTheaNativeDot, theaCombatInputBlockers, theaCombatInputValues, usesTheaDotTrigger } from "./seasonTheaCombatInputs.js";
import { netherSum, netherMore, SEASON_SKILL_AILMENT_TAGS } from './seasonNetherRemaining.js';
import { netherDeterioration } from './seasonNetherDps.js';
import { manualResourceBalance } from './seasonDps.js';
import { isSeasonTargetDamageTaken, validSeasonGearEffects } from './seasonGearEffects.js';
import { isNumbedBaseOverride } from './seasonNetherModifiers.js';

const eps = 1e-8;
const damageKeys = ["manualDps", "spellBurstDps", "repeatDps", "heroDps", "netherDps", "specialDps", "omenDps", "playerDeteriorationDps", "dotDps", "permafrostDps", "reapingDps", "igniteReapingDps", "minionDps", "minionDeteriorationDps", "igniteDps", "scorchDps", "dps"];
// These are portions of existing damage totals and are never added to DPS.
const contributionKeys = ["numbedHitDps", "numbedDotDps", "numbedReapingDps", "minionHitDps", "moduleIgniteDps"];
const recordedKeys = [...damageKeys, ...contributionKeys];
const sum = a => a.reduce((n, v) => n + v, 0);
function timelineRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function finishCombatRows(combat, seconds) {
  for (const row of combat.rows.values()) {
    row.dotDps += row.igniteDps + row.scorchDps;
    row.specialDps = row.omenDps + row.playerDeteriorationDps;
    row.dps = row.manualDps + row.spellBurstDps + row.repeatDps + row.heroDps + row.netherDps + row.specialDps + row.dotDps + row.permafrostDps + row.reapingDps + row.minionDps;
    for (const key of recordedKeys) row[key] /= seconds;
    if (row.minionDamageByType) {
      for (const type of Object.keys(row.minionDamageByType)) row.minionDamageByType[type] /= seconds;
    }
  }
  return sum([...combat.rows.values()].map(row => row.dps));
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function timedElixirs(build,input) {
  return (build.skills.elixirs??[]).flatMap((slot,i)=>slot?.skillId
    ? [{i,interval:input[`elixir${i}Interval`],start:input[`elixir${i}Start`],duration:input[`elixir${i}Duration`]}] : []);
}

function measureElixirUptime(elixir,{warmup,seconds}) {
  const {interval,start,duration}=elixir;
  const activeThrough=time=>{
    const elapsed=Math.max(0,time-start);
    const cycles=Math.floor(elapsed/interval);
    return cycles*Math.min(duration,interval)+Math.min(duration,elapsed-cycles*interval);
  };
  const activeSeconds=clamp(activeThrough(warmup+seconds)-activeThrough(warmup),0,seconds);
  return {...elixir,activeSeconds,uptime:100*activeSeconds/seconds};
}

export function createAilmentTimeline() {
  let ignites = [], numbed = [];
  return {
    ignite(effect) { ignites.push({ ...effect }); },
    numb(time, count, duration, limit, effect = null) { for (let i = 0; i < Math.min(count, limit); i++) numbed.push({ expires: time + duration, effect }); numbed = numbed.sort((a, b) => b.expires - a.expires).slice(0, limit); },
    expire(time) { ignites = ignites.filter(e => e.expires > time + eps); numbed = numbed.filter(e => e.expires > time + eps); },
    next() { return Math.min(Infinity, ...ignites.map(e => e.expires), ...numbed.map(e => e.expires)); },
    active(limit) { return [...ignites].sort((a, b) => b.damage - a.damage || b.expires - a.expires).slice(0, limit); },
    numbed() { return numbed.length; },
    numbedEffect(ownerEffect) { return sum(numbed.map(e => e.effect ?? ownerEffect)); },
  };
}

// The integration uses one clock for blessing consumption, actual casts and
// ailment lifetimes. Damage rolls are sampled only where a nonlinear threshold
// or highest-Ignite selection needs them; ordinary hit expectation stays exact.
export function createTheaCombatTimeline(build, report, getReport, { seconds, warmup, seed = 1, newCastFirst = false }) {
  const random = timelineRandom(seed);
  const input = theaCombatInputValues(build, report);
  const netherEffects=report.componentProjection.effects;
  const playerNumbedBase=netherEffects.find(isNumbedBaseOverride)?.value ?? rules.numbed.morePerStack;
  const bonus=stat=>netherSum(netherEffects,stat);
  const gear=report.components.filter(c=>c.category==='gear').flatMap(c=>c.calculations??[]);
  const gearEffects=gear.flatMap(e=>e.rawEffects??[]);
  const gearNumbedModifiers=gear.flatMap(validSeasonGearEffects)
    .filter(effect=>effect.operation==='add_percent' && effect.unit==='percent' && effect.value>=0);
  const playerNumbedDuration=input.numbedDuration*(1+netherSum(gearNumbedModifiers,'numbed_duration')/100);
  const gearNumbedEffect=netherSum(gearNumbedModifiers,'numbed_effect');
  const gearNumbedStacks=sum(gearEffects.filter(e=>e.stat==='gear_numbed_additional_stacks').map(e=>e.value));
  const gearNumbedCritical=sum(gearEffects.filter(e=>e.stat==='gear_numbed_critical_bonus').map(e=>e.value));
  const elixirs=timedElixirs(build,input);
  let clock = 0;
  const elixirState = time => Object.fromEntries(elixirs.map(e => [`elixir${e.i}`, Number(time + eps >= e.start && (time - e.start + eps) % e.interval < e.duration)]));
  const nextElixir = time => Math.min(Infinity, ...elixirs.map(e => time + eps < e.start ? e.start : e.duration >= e.interval ? Infinity
    : Math.min(e.start + (Math.floor((time - e.start + eps) / e.interval) + 1) * e.interval,
      e.start + Math.floor((time - e.start + eps) / e.interval) * e.interval + e.duration > time + eps
        ? e.start + Math.floor((time - e.start + eps) / e.interval) * e.interval + e.duration : Infinity)));
  const enemy = build.ss14Inputs.dps.enemy;
  const config = build.ss14Inputs.dps.skills;
  const numbedEnabled = combatNumbedEnabled(build, report);
  const mechanics = report.componentProjection.rows.flatMap(r => r.mechanics ?? []);
  const has = kind => mechanics.some(m => m.kind === kind);
  const linked = mechanics.filter(m => m.kind === "thea-combat-event").map(e => ({ ...e }));
  const manaRule = mechanics.find(m => m.kind === 'thea-mana-spend');
  const manaTrigger = manaRule && { ...manaRule };
  const maxMana = report.character?.values.mana;
  let spentMana = 0;
  let eventMana = 0;
  let eventCasts = 0;
  let leastCastMana = Infinity;
  const nativeDot = hasTheaNativeDot(report);
  const dotRate = usesTheaDotTrigger(build, linked, report) ? input.dotTriggerRate ?? 0 : 0;
  const end = warmup + seconds;
  const dotWindows = new Map(report.fullDps.rows.filter(row=>row.dotWindows).map(row=>[row.rowIndex,row.dotWindows]));
  const dotBoundaries = [...new Set([...dotWindows.values()].flat(2))].sort((a,b)=>a-b);
  const dotInEffect = (row,time) => !dotWindows.has(row.rowIndex)
    || dotWindows.get(row.rowIndex).some(([start,stop])=>time>=start && time<stop);
  const frostSources = new Map(report.fullDps.rows.filter(row=>row.combat?.frostSource && row.dotWindows?.length)
    .map(row=>[row.rowIndex,{source:row.combat.frostSource,end:Math.max(...row.dotWindows.map(([,stop])=>stop))}]));
  const reapingReadyAt = new Map();
  const reapedNativeRows = new Map();
  let reapingBoundary = false;
  const numbedConsume = { blessing: "Agility", consume: 3, cooldown: 1 };
  const ailments = createAilmentTimeline();
  const omen = createOmenAccumulator();
  const rows = new Map(report.fullDps.rows.map(r => [r.rowIndex, {
    ...Object.fromEntries(recordedKeys.map(k => [k, 0])),
    ...(r.minionSkills && {minionDamageByType:{}}),
  }]));
  function accumulateMinionTypes(rowIndex, byType, weight) {
    const totals = rows.get(rowIndex).minionDamageByType;
    if (!totals || !byType) return;
    for (const [type, damage] of Object.entries(byType)) totals[type] = (totals[type] ?? 0) + damage * weight;
  }
  const costs = new Map(report.fullDps.rows.filter(row => Number.isFinite(row.manualSummonRate)
    ? row.manualSummonRate === 0 || Number.isFinite(row.manaPerUse) && Number.isFinite(row.lifePerUse)
    : row.channelCost?.times || row.combat && !row.combat.tags.some(tag => ['Channeled', 'Channel'].includes(tag)))
    .map(row => [row.rowIndex, { mana: 0, life: 0 }]));
  const channelCosts = new Map(report.fullDps.rows.filter(row => row.channelCost)
    .map(row => [row.rowIndex, { possibleCharges: 0, mana: null, life: null, variable: false }]));
  const manaRecovery = new Map((report.character?.survival?.manaScenarios ?? []).map(row => [row.id, 0]));
  const queue = [], chains = new Map(), charge = new Map();
  const moduleBuffs = new Map(), moduleRandom = new Map(), wilts = [], deteriorations = [];
  const infiltrations = { cold: 0, fire: 0, lightning: 0 };
  let elixirInfiltrationReady = 0;
  const counts = { casts: 0, hits: 0, followupHits: 0, multistrikes: 0, spellBurst: 0, ignites: 0, scorches: 0, numbedInflicted: 0, reaps: 0 };
  const measuredCounts = { ...counts };
  const inMeasurement = time => time >= warmup && time < end;
  const count = (time, key, amount = 1) => {
    counts[key] += amount;
    if (inMeasurement(time)) measuredCounts[key] += amount;
  };
  const blockers = new Set();
  let hasProjectileTie = false;
  let hasFissureTie = false;
  let aggressionUntil = 0, affliction = enemy.affliction ?? 0, afflictionUntil = 0, gearNumbedUntil=0;
  // Native DoT uses the observed maintained rate, shared with Ignite ticks.
  let dotTriggerStart = 0, dotTriggerOccurrence = 1;
  let nextDotTrigger = nativeDot && dotRate > 0 ? 1 / dotRate : Infinity;
  let currentTenacity = 0, recentAgility = false;
  let numbedArea = 0, numbedEffectArea = 0, scorchArea = 0, igniteTime = 0, numbedTime = 0;
  let playerLightningHits = 0, playerNumbedHits = 0;
  const activeIgnites = () => ailments.active((input.igniteLimit ?? 1) + Number(has("thea-ignite-limit") && currentTenacity >= 10));
  const igniteTarget = (snapshot, active) => {
    const host = snapshot.fullDps.rows.find(row=>row.rowIndex===0)?.combat;
    const reduction = active.some(effect=>effect.scorch) ? input.scorchResistance : 0;
    const resistance = report.beforeDefense ? 1 : 1 - (enemy.fire - reduction - (host?.penetration.fire ?? 0)) / 100;
    const fireTaken = snapshot.componentProjection.effects.filter(e=>isSeasonTargetDamageTaken(e.stat,"fire"))
      .reduce((n,e)=>n*(1+e.value/100),1);
    return {multiplier:resistance*fireTaken,afflictionEffect:host?.afflictionEffect ?? 1};
  };
  const push = e => { if (Number.isFinite(e.at) && e.at < end - eps) queue.push(e); };
  // Compute the nth occurrence from the start, so repeated fractional intervals do not drift.
  const schedule = (event, rate) => {
    const occurrence = (event.occurrence ?? 0) + 1;
    if (rate > 0) push({ ...event, at: occurrence / rate, occurrence });
  };
  for (const row of report.fullDps.rows) {
    for (const at of row.channelCost?.times ?? []) push({at,row:row.rowIndex,kind:'channel-charge'});
    if (row.values.minionDps !== undefined) {
      schedule({row:row.rowIndex,kind:'summon'},row.manualSummonRate);
      if (row.moduleTimeline) for (let unit = 0; unit < config[row.rowIndex].minionCount; unit++) for (const [action, skill] of row.minionSkills.entries()) {
        const rate = config[row.rowIndex][`moduleRate${action}`];
        if (!skill.persistent) schedule({ row: row.rowIndex, kind: "module", action, unit }, rate);
      }
      continue;
    }
    const b = config[row.rowIndex];
    for(const event of row.nether?.events??[])schedule({row:row.rowIndex,kind:'nether',index:0,trigger:event},event.rate);
    schedule({ row: row.rowIndex, kind: "manual", index: 0 }, b.castRate);
    schedule({ row: row.rowIndex, kind: "repeat", index: 0 }, b.repeatHits);
    for (const [index,at] of (row.fissure?.times ?? []).entries()) {
      push({ at, row:row.rowIndex, kind:'fissure', followup:true, castNumber:-1-row.rowIndex*100-index,
        hitMultiplier:row.fissure.hitMultiplier, ailmentWeight:1 });
    }
    for (const at of row.reaping?.times ?? []) push({at,row:row.rowIndex,kind:"reaping"});
    charge.set(row.rowIndex, 0);
  }
  const rowAt = (state, row) => {
    const r = getReport(state).fullDps;
    if (!r.supported) r.blockers.forEach(s => blockers.add(s));
    return r.rows.find(r => r.rowIndex === row);
  };
  const values = () => ({ numbedStacks: ailments.numbed(), numbedEffect: ailments.numbedEffect(playerNumbedBase *
    (1 + ((input.numbedEffect ?? 0)+bonus('numbed_effect')+gearNumbedEffect) / 100 + (has("thea-numbed-effect") && recentAgility ? .5 : 0))
    * (gearNumbedUntil>clock+eps ? 1+gearNumbedCritical/100 : 1)),
    scorched: Number(activeIgnites().some(e => e.scorch)) });
  const weight = (a, b) => Math.max(0, Math.min(b, warmup + seconds) - Math.max(a, warmup));
  const inflictNumbed = (time, n) => { if (n <= 0) return; n+=bonus('numbed_additional_stacks')+gearNumbedStacks; ailments.numb(time, n, playerNumbedDuration, input.numbedLimit); count(time, 'numbedInflicted', n); };
  const runTriggers = (key, time, ctx, predicate = () => true) => {
    let consumed = false;
    for (const e of linked.filter(e => e.inputKey === key && predicate(e))) consumed = ctx.runtime.trigger(e, time, ctx.stacks, ctx.caps, ctx.expires) || consumed;
    return consumed;
  };
  const recordDamage = (row, key, amount, time) => { if (inMeasurement(time)) rows.get(row)[key] += amount; };
  const recordCastCost = (index, row, time, ctx, channelCharge = false) => {
    const separatelyObserved = !channelCharge && row?.channelCost?.times;
    if (manaTrigger) {
      const manaSpent = !channelCharge && (separatelyObserved || row?.channelCost?.rate === 0) ? 0 : row?.manaPerUse;
      if (!Number.isFinite(manaSpent) || !channelCharge && manaSpent > 0 && row.combat?.tags.some(tag => ['Channeled', 'Channel'].includes(tag)))
        blockers.add('스킬 시전 비용을 확인하거나 초당 MP 소모율을 입력하세요.');
      else {
        eventCasts++;
        leastCastMana = Math.min(leastCastMana, manaSpent);
        if (manaSpent > 0) {
          const currentMax = getReport(ctx.snapshot()).character?.values.mana;
          if (!(maxMana > 0) || currentMax !== maxMana) blockers.add('전투 중 최대 MP가 달라지는 경우 초당 MP 소모율을 입력하세요.');
          else eventMana += manaSpent;
        }
      }
    }
    if (separatelyObserved || !inMeasurement(time)) return;
    const cost = costs.get(index);
    if (cost && Number.isFinite(row?.manaPerUse) && Number.isFinite(row?.lifePerUse)) {
      cost.mana += row.manaPerUse;
      cost.life += row.lifePerUse;
    } else costs.delete(index);
  };
  const omenDamage = (amount, time, currentReport, from = time, cumulative = null) => {
    const condition = currentReport.componentProjection.rows.flatMap(r => r.mechanics ?? []).find(m => m.kind === "ill-omen");
    const result = omen.add(amount, condition);
    if (result.unsupported) blockers.add("오멘 최대 중첩 이후 초기화·재발동 순서는 설치 자료에서 확인되지 않았습니다. 반복 오멘 DPS는 미지원입니다.");
    if (result.damage) {
      if (cumulative) {
        let lo = 0, hi = time - from;
        for (let i = 0; i < 45; i++) { const mid = (lo + hi) / 2; if (cumulative(mid) < result.requiredDamage) lo = mid; else hi = mid; }
        time = from + hi;
      }
      recordDamage(0, "omenDps", result.damage, time);
    }
  };
  function moduleCast(event, time, ctx) {
    const b = config[event.row], key = `${event.row}:${event.unit}`;
    const rate = b[`moduleRate${event.action}`];
    schedule(event, rate);
    let row = rowAt(ctx.snapshot(), event.row), action = row?.minionSkills[event.action];
    if (!row?.supported || !action) return;
    if (!row.moduleHitEvents) {
      const weight = (b.minionUptime / 100) * (b.hitChance / 100);
      const damage = action.perCast * weight;
      recordDamage(event.row, 'minionDps', damage, time);
      recordDamage(event.row, 'minionHitDps', damage, time);
      if (inMeasurement(time)) accumulateMinionTypes(event.row, action.damagePerHitByType, action.weightedHits * weight);
      return;
    }
    // Module rolls cannot advance the player's random sequence.
    if (!moduleRandom.has(key)) moduleRandom.set(key, timelineRandom(seed ^ Math.imul(event.row * 8 + event.unit + 1, 0x9e3779b1)));
    const random = moduleRandom.get(key);
    if (random() >= b.minionUptime / 100) return;
    let castMultiplier = 1;
    if (action.slug === "Blitz_Strike") moduleBuffs.set(key, true);
    if (action.slug === "Burst_Hammer") {
      if (moduleBuffs.get(key)) { castMultiplier *= 2; moduleBuffs.delete(key); }
      if (ctx.runtime.trigger({ blessing: "Tenacity", consume: 1 }, time, ctx.stacks, ctx.caps, ctx.expires)) castMultiplier *= 1.3;
      row = rowAt(ctx.snapshot(), event.row); action = row.minionSkills[event.action];
    }
    for (let h = 0; h < action.hitCount; h++) {
      if (random() >= b.hitChance / 100) continue;
      let hitMultiplier = castMultiplier;
      if (action.slug === "Flickering_Shadow" && wilts.length) {
        if (wilts.some(w => Math.abs(w.expires - wilts[0].expires) > eps || w.damage !== wilts[0].damage)) blockers.add("라이언 환영이 서로 다른 몰락 중첩을 제거하는 우선순위는 설치 자료에서 확인되지 않았습니다.");
        wilts.shift(); hitMultiplier *= 1.75;
      }
      const randomElement = action.randomElemental ? ["fire", "cold", "lightning"][Math.floor(random() * 3)] : null;
      // The static pools include one third of each elemental outcome.
      const randomDelta = randomElement ? 3 * action.randomHit[randomElement] - sum(Object.values(action.randomHit)) : 0;
      const hitWeight = h > 0 ? action.additionalHitMultiplier ?? 1 : 1;
      const hit = (action.perCast / (action.damageHitCount ?? action.hitCount) + randomDelta) * hitWeight;
      recordDamage(event.row, "minionDps", hit * hitMultiplier, time);
      recordDamage(event.row, "minionHitDps", hit * hitMultiplier, time);
      if (inMeasurement(time)) {
        const weight = hitWeight * hitMultiplier;
        const hitScale = action.weightedHits / (action.damageHitCount ?? action.hitCount);
        accumulateMinionTypes(event.row, action.damagePerHitByType, hitScale * weight);
        if (randomElement) {
          for (const [element, byType] of Object.entries(action.randomHitByType))
            accumulateMinionTypes(event.row, byType, (element === randomElement ? 2 : -1) * weight);
        }
      }
      for (const type of row.infiltrationTypes) if ((action.damageTypes.includes(type) || action.randomDamageTypes?.[randomElement]?.includes(type)) && hit > 0) infiltrations[type] = time + SS14_EXTENSION_NATIVE.infiltration[type].duration;
      const hadNumbed = ailments.numbed() > 0;
      if (action.lightningRolls.length && (row.elementalProtocol || numbedEnabled && hadNumbed)) {
        const lightning = action.lightningRolls.reduce((sum, pool) => sum + (!pool.randomElement || randomElement === pool.randomElement ? (pool.min + (pool.max - pool.min) * random()) * (pool.randomElement ? 3 : 1) : 0), 0)
          * (random() < action.criticalChance ? action.criticalMultiplier : 1) * hitMultiplier * hitWeight;
        if (lightning > 0) {
          const extra = hadNumbed ? Math.floor(lightning / (input.enemyLifeShield * input.numbedThreshold / 100)) : 0;
          const stacks = Number(row.elementalProtocol) + extra;
          ailments.numb(time, stacks, input.numbedDuration, input.numbedLimit, rules.numbed.morePerStack);
          count(time, 'numbedInflicted', stacks);
        }
      }
      if (action.slug === "Sin_of_the_Fallen") {
        if (wilts.length >= 30) { wilts.sort((a,b) => a.expires - b.expires); wilts.shift(); }
        wilts.push({ row: event.row, damage: row.wiltBase, expires: time + row.wiltDuration });
      }
      const deterioration = action.deterioration;
      if (deterioration) {
        const erosion = deterioration.erosionHit.fixed + (randomElement ? 3 * deterioration.erosionHit[randomElement] : 0);
        if (erosion > 0 && random() < deterioration.chance && deteriorations.length < deterioration.limit)
          deteriorations.push({ row: event.row, at: time + deterioration.delay, damage: erosion * deterioration.portion * hitWeight * hitMultiplier });
      }
    }
  }
  function resolveHit(event, time, ctx, state, row, hitMultiplier, ailmentWeight) {
    count(time, 'hits');
    const hadIgnite = activeIgnites().length > 0, hadNumbed = ailments.numbed() > 0;
    const hitChance = config[event.row].hitChance;
    // Observed on-kill hits still land when the ordinary hit chance is zero.
    const averageHit = hitChance > 0 ? row.values.averageHit / (hitChance / 100) : row.combat.landedHit;
    const damageKey = event.trigger ? "netherDps" : event.kind === "burst" ? "spellBurstDps"
      : event.kind === "repeat" || event.kind === "fissure" ? "repeatDps" : "manualDps";
    recordDamage(event.row, damageKey, averageHit * hitMultiplier, time);
    if (row.combat.tags.includes("Spell") && averageHit > 0 && time + eps >= elixirInfiltrationReady
      && (build.skills.elixirs ?? []).some((s,i) => s?.skillId === "iridescent-butterfly-distillate" && elixirState(time)[`elixir${i}`])) {
      for (const type of Object.keys(infiltrations)) infiltrations[type] = time + SS14_EXTENSION_NATIVE.infiltration[type].duration;
      elixirInfiltrationReady = time + 1;
    }
    const lightning = row.pools.filter(p => p.type === "lightning");
    if (numbedEnabled && inMeasurement(time) && hitMultiplier > 0 && lightning.some(p=>p.max>0)) {
      playerLightningHits++;
      const bonus = row.combat.numbedHitBonus * hitMultiplier;
      if (bonus > 0) {
        playerNumbedHits++;
        recordDamage(event.row,'numbedHitDps',bonus,time);
      }
    }
    let actualLightning = 0, lightningCritical=false;
    const manualNumbed = input.numbedEnabled === 1;
    const canStartNumbed = row.numbedOnHit || manualNumbed && (event.row === 0 || has('thea-numbed-on-hit') || has('thea-numbed-consume'));
    if (lightning.length && numbedEnabled && (canStartNumbed || hadNumbed || gearNumbedCritical>0)) {
      if (lightning.filter(p => p.min !== p.max).length > 1) blockers.add("한 번의 적중에 포함된 여러 번개 대미지 범위의 굴림 방식은 미확인입니다.");
      const rolls = Array.from({ length: Math.abs(row.combat.luck) + 1 }, random);
      const roll = row.combat.luck >= 0 ? Math.max(...rolls) : Math.min(...rolls);
      const c = row.combat.critical;
      lightningCritical = random() < c.effectiveCriticalChance / 100;
      const crit = lightningCritical ? c.criticalDamage / 100 * c.criticalOnlyMultiplier : 1;
      const d = random(), dbl = d < c.quadrupleDamageChance / 100 ? 4 : d < c.doubleDamageChance / 100 ? 2 : 1;
      actualLightning = sum(lightning.map(p => p.min + (p.max - p.min) * roll)) * row.combat.attributeMultiplier * row.combat.takenMultiplier * crit * dbl * hitMultiplier;
    }
    runTriggers("hitRate", time, ctx, e => (!e.requiresIgnite || hadIgnite) && (!e.requiresNumbed || hadNumbed));
    if (has("thea-aggression")) aggressionUntil = time + rules.aggression.duration;
    // A newly inflicted ailment never modifies the hit which inflicted it.
    if (event.row === 0 && input.igniteEnabled === 1 && input.igniteBaseMax+bonus('base_ailment_damage_max') > 0) {
      const chance = input.igniteChance + bonus('damaging_ailment_chance') + (has("thea-ignite-chance") ? 3 * Math.min(18, state.stacks.Tenacity) : 0);
      if (random() < Math.min(1, chance / 100)) {
        const eligible = new Set(["damage", "elemental_damage", "fire_damage", "damage_over_time", "ailment_damage"]);
        for(const [stat,tag] of Object.entries(SEASON_SKILL_AILMENT_TAGS))if(row.combat.tags.includes(tag))eligible.add(stat);
        const modifiers = [...row.combat.effects.filter(e => eligible.has(e.stat)), ...row.combat.igniteSupportEffects];
        const inc = input.igniteIncreased + sum(modifiers.filter(e => e.operation === "add_percent").map(e => e.value));
        const more = modifiers.filter(e => e.operation === "more").reduce((n, e) => n * (1 + e.value / 100), 1);
        const baseMin=input.igniteBaseMin+bonus('base_ailment_damage_min'),baseMax=input.igniteBaseMax+bonus('base_ailment_damage_max');
        const damage = (baseMin + (baseMax - baseMin) * random()) * ailmentWeight * (1 + inc / 100) * more * row.combat.attributeMultiplier
          *netherMore(row.combat.effects,'enemy_dot_damage_taken')*netherMore(row.combat.effects,'enemy_all_damage_taken');
        const scorch = row.combat.elixirScorch || has("thea-scorch") && state.stacks.Tenacity >= 10;
        ailments.ignite({ damage, scorch, expires: time + input.igniteDuration, row: event.row });
        count(time, scorch ? "scorches" : "ignites");
        if (dotRate > 0 && !Number.isFinite(nextDotTrigger)) {
          dotTriggerStart = time;
          dotTriggerOccurrence = 1;
          nextDotTrigger = dotTriggerStart + dotTriggerOccurrence / dotRate;
        }
      }
    }
    if (actualLightning > 0) {
      const extra = manualNumbed && has("thea-numbed-consume") ? 1 : 0;
      const baseStacks = row.numbedOnHit || manualNumbed && (has("thea-numbed-on-hit") || event.row === 0 && random() < input.numbedChance / 100) ? 1+extra : 0;
      if (baseStacks) inflictNumbed(time, baseStacks);
      const thresholdStacks = Math.floor(actualLightning / (input.enemyLifeShield * input.numbedThreshold / 100));
      if (hadNumbed && thresholdStacks > 0) inflictNumbed(time, thresholdStacks + extra);
      const consumeStacks=extra && ctx.runtime.trigger(numbedConsume, time, ctx.stacks, ctx.caps, ctx.expires);
      if (consumeStacks) inflictNumbed(time, 2 + extra);
      if (gearNumbedStacks>0 && Number(baseStacks>0)+Number(hadNumbed&&thresholdStacks>0)+Number(Boolean(consumeStacks))>1)
        blockers.add('한 적중에 마취 부여 경로가 겹칠 때 썬더볼트 조종자의 추가 중첩 적용 횟수는 확인되지 않았습니다.');
      if (gearNumbedCritical>0 && lightningCritical) {
        if (gearNumbedUntil>time+eps) blockers.add('썬더볼트 조종자의 번개 크리티컬 효과가 겹칠 때 갱신·중첩 규칙은 확인되지 않았습니다.');
        gearNumbedUntil=time+2;
      }
    }
    const deterioration=mechanics.find(m=>m.kind==='nether-deterioration');
    const erosion=row.pools.filter(p=>p.type==='erosion');
    if(deterioration&&erosion.length&&random()<deterioration.chance/100&&deteriorations.length<99) {
      if(erosion.filter(p=>p.min!==p.max).length>1)blockers.add('한 번의 적중에 포함된 여러 침식 대미지 범위의 굴림 방식은 미확인입니다.');
      const c=row.combat.critical;
      const crit=random()<c.effectiveCriticalChance/100?c.criticalDamage/100*c.criticalOnlyMultiplier:1;
      const d=random(),dbl=d<c.quadrupleDamageChance/100?4:d<c.doubleDamageChance/100?2:1;
      const rolls=Array.from({length:Math.abs(row.combat.luck)+1},random);
      const roll=row.combat.luck>=0?Math.max(...rolls):Math.min(...rolls);
      const hit=sum(erosion.map(p=>p.min+(p.max-p.min)*roll))*row.combat.attributeMultiplier*row.combat.takenMultiplier*crit*dbl*hitMultiplier;
      deteriorations.push({row:event.row,player:true,at:time+1,damage:netherDeterioration(row.combat.effects,hit,100)});
    }
  }
  function followupHit(event, time, ctx) {
    const state = ctx.snapshot();
    Object.assign(state.events, event.castBonuses);
    const row = rowAt(state, event.row);
    if (!row?.supported) return;
    count(time, 'followupHits');
    resolveHit(event, time, ctx, state, row, event.hitMultiplier, event.ailmentWeight);
  }
  function cast(event, time, ctx) {
    const b = config[event.row];
    let state = ctx.snapshot(), row = rowAt(state, event.row);
    if (!row?.supported) return;
    if (event.kind === 'manual' || event.kind === 'multi' || event.activationCost)
      recordCastCost(event.row,event.activationCost ?? row,time,ctx);
    const attack = row.combat.tags.includes("Attack");
    const projectile = row.combat.tags.includes("Projectile");
    let attackBonus = false, projectileBonus = false;
    if (event.kind !== "repeat") {
      if (attack) attackBonus = runTriggers("attackRate", time, ctx);
      if (projectile) projectileBonus = runTriggers("projectileRate", time, ctx);
      state = ctx.snapshot();
      state.events = { ...state.events, attackBonus: Number(attackBonus), projectileBonus: Number(projectileBonus), multistrikeChance: b.multistrikeChance ?? 0 };
      row = rowAt(state, event.row);
    }
    if (!row?.supported) return;
    currentTenacity = ctx.stacks.Tenacity; recentAgility = ctx.runtime.state(time).recentAgility > 0;
    const sequenceMultiplier = 1 + event.index * ((b.multistrikeIncrement ?? 0) + (has("thea-multistrike") ? 16 : 0)) / 100;
    const burstMultiplier = (event.kind === "burst" ? row.combat.burstHitMore : 1)*(event.triggerMultiplier??1);
    const landed = row.pools.length > 0 && (event.kind === "repeat" || random() < b.hitChance / 100);
    count(time, 'casts');
    if (event.index > 0) count(time, 'multistrikes');
    if (event.kind === "burst") count(time, 'spellBurst');
    if (landed) {
      const castMultiplier = sequenceMultiplier * burstMultiplier;
      resolveHit(event, time, ctx, state, row, castMultiplier, 1);
      // Hit chance selects whether this observed single-projectile route connects.
      // Follow-up hits keep cast-only bonuses, but read target state on arrival.
      const route = row.shotgun;
      for (let i = 1; i < (route?.hits ?? 1); i++) {
        const at = time + route.delaysMs[i] / 1000;
        if (at >= warmup + seconds) break;
        const followup = { kind: event.kind, trigger: event.trigger, followup: true, castNumber: counts.casts, at, row: event.row,
          castBonuses: { attackBonus: Number(attackBonus), projectileBonus: Number(projectileBonus), multistrikeChance: b.multistrikeChance ?? 0 },
          hitMultiplier: castMultiplier * route.weights[i], ailmentWeight: route.repeatWeight };
        if (route.delaysMs[i] === 0) followupHit(followup, time, ctx);
        else push(followup);
      }
    }
    if (event.kind === "manual" && attack && b.multistrikeChance > 0) {
      if (row.combat.tags.some(t => ["Mobility", "Channeled", "Channel", "Sentry"].includes(t))) { blockers.add("이동·집중·센트리 스킬에는 연속 공격을 적용할 수 없습니다."); return; }
      let extra = Math.floor(b.multistrikeChance / 100) + Number(random() < b.multistrikeChance % 100 / 100);
      if (b.resourceAttacks > 0) extra = Math.min(extra, b.resourceAttacks - 1);
      if (b.movementAttacks > 0 && !(has("thea-multistrike") && recentAgility)) extra = Math.min(extra, b.movementAttacks - 1);
      if (extra > 0) {
        const speed = row.combat.rate * (1 + rules.multistrike.increasedSpeed / (100 + row.combat.increasedAttackSpeed));
        const interval = 1 / speed;
        if ((1 / row.combat.rate + extra * interval) * b.castRate > b.useShare / 100 + eps) blockers.add("연속 공격까지 포함한 시간이 배분한 시전 시간을 넘습니다. 시전 횟수를 낮추거나 중단 횟수를 선택하세요.");
        const token = (chains.get(event.row) ?? 0) + 1; chains.set(event.row, token);
        for (let index = 1; index <= extra; index++) push({ at: time + index * interval, row: event.row, kind: "multi", index, token, max: Math.ceil(b.multistrikeChance / 100) });
      }
    }
    if (event.kind === "multi" && event.index === event.max) runTriggers("multistrikeRate", time, ctx);
  }
  return {
    blockers, counts, measuredCounts, rows, costs, channelCosts, manaRecovery, playerNumbedDuration, reapedNativeRows,
    get hasProjectileTie() { return hasProjectileTie; },
    get hasFissureTie() { return hasFissureTie; },
    result() { return { numbedAverage: numbedArea / seconds, numbedEffectAverage: numbedEffectArea / seconds, scorchUptime: 100 * scorchArea / seconds,
      igniteUptime: 100 * igniteTime / seconds, numbedUptime: 100 * numbedTime / seconds,
      playerLightningHits, playerNumbedHits }; },
    state(time, stacks, events) { currentTenacity = stacks.Tenacity; recentAgility = events.recentAgility > 0; return { ...values(), ...elixirState(time), ...Object.fromEntries(Object.entries(infiltrations).map(([type,until]) => [`${type}Infiltration`, Number(until > time + eps || events[`${type}Infiltration`])])), attackAggression: Number(aggressionUntil > time + eps) }; },
    next() { return Math.min(Infinity, ...Object.values(infiltrations).filter(t => t > clock + eps), ...queue.map(e => e.at), ...wilts.map(e => e.expires), ...deteriorations.map(e => e.at), ailments.next(), gearNumbedUntil>clock+eps?gearNumbedUntil:Infinity, aggressionUntil || Infinity, afflictionUntil || Infinity, nextDotTrigger, nextElixir(clock), dotBoundaries.find(time=>time>clock) ?? Infinity); },
    expire(time) {
      reapingBoundary = [ailments.next(),afflictionUntil,aggressionUntil,gearNumbedUntil,nextElixir(clock),nextDotTrigger]
        .some(at=>Math.abs(at-time)<=eps);
      clock = time; ailments.expire(time);
      for (let i = wilts.length - 1; i >= 0; i--) if (wilts[i].expires <= time + eps) wilts.splice(i, 1);
      if (aggressionUntil <= time + eps) aggressionUntil = 0;
      if (afflictionUntil <= time + eps) { afflictionUntil = 0; affliction = 0; }
    },
    advance(from, to, state) {
      currentTenacity = state.stacks.Tenacity; recentAgility = state.events.recentAgility > 0;
      const ailmentState=values();
      const r = getReport({ ...state, events: { ...state.events, ...ailmentState } });
      if (!r.fullDps.supported) r.fullDps.blockers.forEach(s => blockers.add(s));
      const delta = to - from, active = activeIgnites();
      if (r.fullDps.rows.some(row => {
        const frost = frostSources.get(row.rowIndex);
        return frost && from < frost.end && row.combat?.frostSource !== frost.source;
      })) blockers.add('동토의 시전자 대미지가 바뀌는 시간표는 적용 시점이 미확인입니다.');
      const native = r.fullDps.rows.filter(row => (row.combat?.hasDot || row.combat?.frostSource) && dotInEffect(row,from));
      const minionDots = row => (row.ailmentDps ?? 0) + (row.minionSkills ?? []).filter(a => a.persistent).reduce((sum,a) => sum + a.dps, 0);
      const dotActive = active.length > 0 || wilts.length > 0 || r.fullDps.rows.some(row => minionDots(row) > 0)
        || native.some(row => row.combat.dotWithoutAffliction > 0 || row.combat.frostWithoutAffliction > 0);
      if (dotActive) afflictionUntil = to + rules.affliction.duration;
      const rate = afflictionUntil > from ? (input.afflictionRate ?? 0) + bonus('affliction_per_second') + (has("thea-affliction-gain") ? 10 * Math.min(18, state.stacks.Tenacity) : 0) : 0;
      const at = t => Math.min(100, affliction + rate * t);
      const integral = (a, b) => { const cap = rate > 0 ? clamp((100 - affliction) / rate, a, b) : b; return (affliction * (cap - a) + rate * (cap * cap - a * a) / 2) + 100 * (b - cap); };
      const ignite = active.length ? igniteTarget(r,active) : null;
      const lo = Math.max(0, warmup - from), hi = Math.min(delta, warmup + seconds - from), w = Math.max(0, hi - lo);
      if (w) {
        for (const row of r.fullDps.rows) {
          const channel = channelCosts.get(row.rowIndex);
          if (!channel) continue;
          channel.possibleCharges += (row.channelCost?.max ?? 0) * w;
          if (!Number.isFinite(row.manaPerUse) || !Number.isFinite(row.lifePerUse)) channel.variable = true;
          else if (channel.mana === null) Object.assign(channel, {mana: row.manaPerUse, life: row.lifePerUse});
          else if (channel.mana !== row.manaPerUse || channel.life !== row.lifePerUse) channel.variable = true;
        }
        const recovery = r.character?.survival?.manaScenarios ?? [];
        for (const [id, amount] of manaRecovery) {
          const rate = recovery.find(row => row.id === id)?.value;
          manaRecovery.set(id, Number.isFinite(amount) && Number.isFinite(rate) ? amount + rate * w : null);
        }
        if (active.length) igniteTime += w;
        if (ailments.numbed() > 0) {
          numbedTime += w;
          numbedEffectArea += ailmentState.numbedEffect * w;
        }
        numbedArea += ailments.numbed() * w; if (active.some(e => e.scorch)) scorchArea += w;
        for (const effect of active) {
          const amount = effect.damage * ignite.multiplier * (w + integral(lo, hi) / 100 * ignite.afflictionEffect);
          rows.get(effect.row)[effect.scorch ? "scorchDps" : "igniteDps"] += amount;
        }
        for (const row of native) {
          const weight = w + integral(lo, hi) / 100 * row.combat.afflictionEffect;
          rows.get(row.rowIndex).dotDps += row.combat.dotWithoutAffliction * weight;
          rows.get(row.rowIndex).numbedDotDps += (row.combat.numbedDotWithoutAffliction ?? 0) * weight;
          rows.get(row.rowIndex).permafrostDps += (row.combat.frostWithoutAffliction ?? 0) * weight;
        }
        // Minion action rates are explicit final rates. Integrate their own
        // state DPS; never emit player hit/ailment/blessing events for them.
        for (const row of r.fullDps.rows) if (row.values.minionDps !== undefined) {
          const dots = minionDots(row), direct = row.moduleTimeline ? (row.explosionDps ?? 0) + (row.executeDps ?? 0) : row.values.minionDps - dots;
          const dotTime = w + integral(lo,hi) / 100;
          const baseAffliction = 1 + (enemy.affliction ?? 0) / 100;
          const totals = rows.get(row.rowIndex);
          totals.minionDps += direct * w + dots / baseAffliction * dotTime;
          totals.moduleIgniteDps += (row.values.moduleIgniteDps ?? 0) / baseAffliction * dotTime;
          if (!row.moduleTimeline) totals.minionHitDps += row.values.minionHitDps * w;
          if (row.moduleTimeline) {
            for (const action of row.minionSkills) {
              if (action.persistent) accumulateMinionTypes(row.rowIndex, action.damageByType, dotTime / baseAffliction);
            }
          } else accumulateMinionTypes(row.rowIndex, row.minionDamageByType, w);
        }
        for (const wilt of wilts) {
          const amount = wilt.damage * r.fullDps.rows.find(row => row.rowIndex === wilt.row).wiltTargetBase * (w + integral(lo,hi) / 100);
          rows.get(wilt.row).minionDps += amount;
        }
      }
      if (r.componentProjection.rows.some(row => row.mechanics?.some(m => m.kind === "ill-omen"))) {
        const fixed = wilts.reduce((n,e) => n + e.damage * r.fullDps.rows.find(row => row.rowIndex === e.row).wiltTargetBase, 0)
          + r.fullDps.rows.reduce((n,row) => n + minionDots(row) / (1 + (enemy.affliction ?? 0) / 100), 0);
        const eligible = t => fixed * (t + integral(0,t) / 100) + active.reduce((n,e) => n + e.damage * ignite.multiplier * (t + integral(0,t) / 100 * ignite.afflictionEffect), 0)
          + native.reduce((n,row) => n + (row.combat.dotWithoutAffliction + (row.combat.frostWithoutAffliction ?? 0))
            * (t + integral(0,t) / 100 * row.combat.afflictionEffect), 0);
        omenDamage(eligible(delta), to, r, from, eligible);
      }
      affliction = at(delta);
      for (const row of r.fullDps.rows) if (row.combat?.eligibleBurst && row.combat.maxBurst > 0) charge.set(row.rowIndex, Math.min(1, charge.get(row.rowIndex) + delta * row.combat.burstChargeSpeed / 2));
    },
    apply(time, ctx) {
      eventMana = 0;
      eventCasts = 0;
      leastCastMana = Infinity;
      currentTenacity = ctx.stacks.Tenacity; recentAgility = ctx.runtime.state(time).recentAgility > 0;
      const due = queue.filter(e => e.at <= time + eps); for (const e of due) queue.splice(queue.indexOf(e), 1);
      const reaping = due.find(e=>e.kind==='reaping');
      if (reaping) {
        const sameTime = due.length > 1 || ctx.stateBoundary || reapingBoundary || dotBoundaries.some(at=>Math.abs(at-time)<=eps)
          || deteriorations.some(event=>event.player && Math.abs(event.at-time)<=eps);
        const snapshot = getReport(ctx.snapshot());
        const beam = snapshot.fullDps.rows.find(row=>row.rowIndex===reaping.row);
        if (sameTime) blockers.add('수확과 다른 효과가 동시에 적용될 때의 순서가 미확인입니다. 수확 성공 시각을 확인하세요.');
        else if (!beam?.reaping || !dotInEffect(beam,time) || !(beam.combat?.dotWithoutAffliction>0))
          blockers.add('부식 광선의 지속 대미지가 적용되는 구간 안에 수확 성공 시각을 입력하세요.');
        else if ((reapingReadyAt.get(reaping.row)??0)>time+eps)
          blockers.add('수확 성공 시각 사이의 간격이 수확 쿨타임보다 짧습니다.');
        else {
          reapingReadyAt.set(reaping.row,time+beam.reaping.cooldown);
          count(time,'reaps');
          for (const row of snapshot.fullDps.rows) {
            if (!row.combat || !dotInEffect(row,time)) continue;
            const activeDps = row.combat.dotWithoutAffliction + (row.combat.frostWithoutAffliction??0);
            const weight = (1+affliction/100*row.combat.afflictionEffect) * beam.reaping.duration;
            const amount = activeDps * weight;
            if (amount>0) {
              if (inMeasurement(time)) reapedNativeRows.set(row.rowIndex,(reapedNativeRows.get(row.rowIndex)??0)+1);
              recordDamage(row.rowIndex,'reapingDps',amount,time);
              recordDamage(row.rowIndex,'numbedReapingDps',(row.combat.numbedDotWithoutAffliction ?? 0) * weight,time);
            }
          }
          const active = activeIgnites();
          if (active.length) {
            const ignite = igniteTarget(snapshot,active);
            const multiplier = ignite.multiplier * (1+affliction/100*ignite.afflictionEffect) * beam.reaping.duration;
            for (const effect of active) {
              const amount = effect.damage * multiplier;
              recordDamage(effect.row,'reapingDps',amount,time);
              recordDamage(effect.row,'igniteReapingDps',amount,time);
            }
          }
        }
      }
      for (const event of deteriorations.filter(e => e.at <= time + eps)) {
        recordDamage(event.row, event.player ? 'playerDeteriorationDps' : 'minionDps', event.damage, time);
        if (!event.player) recordDamage(event.row, 'minionDeteriorationDps', event.damage, time);
        omenDamage(event.damage, time, getReport(ctx.snapshot()));
        deteriorations.splice(deteriorations.indexOf(event), 1);
      }
      // Keep the order of one projectile's route. The client damage map does
      // not establish priority between projectiles from independent casts.
      const arrivals = due.filter(e => e.followup);
      const actions = due.filter(e => !e.followup && e.kind !== 'reaping');
      if (arrivals.length && (actions.some(e=>e.kind!=='summon'&&e.kind!=='channel-charge') || arrivals.some(e => e.castNumber !== arrivals[0].castNumber))) {
        if (arrivals.some(e=>e.kind==='fissure')) hasFissureTie = true;
        else hasProjectileTie = true;
      }
      if (!newCastFirst) for (const e of arrivals) followupHit(e, time, ctx);
      for (const e of actions) {
        if (e.kind === 'channel-charge') {
          const snapshot = rowAt(ctx.snapshot(),e.row);
          if (!Number.isFinite(snapshot?.manaPerUse) || !Number.isFinite(snapshot?.lifePerUse))
            blockers.add('채널링 차감 시각의 MP·HP 비용을 확인할 수 없습니다.');
          else recordCastCost(e.row,snapshot,time,ctx,true);
          continue;
        }
        if (e.kind === 'summon') {
          const row = rowAt(ctx.snapshot(),e.row);
          recordCastCost(e.row,row,time,ctx);
          schedule(e,config[e.row].summonCastRate);
          continue;
        }
        if(e.kind==='nether') {
          const row=rowAt(ctx.snapshot(),e.row);
          if(e.trigger.trigger==='burst') {
            if(charge.get(e.row)<1-eps){blockers.add('추방 자동 버스트 발동 시점에 충전이 부족합니다.');continue;}
            charge.set(e.row,0);runTriggers('burstRate',time,ctx);
          }
          for(let n=0;n<e.trigger.count;n++)cast({...e,kind:e.trigger.trigger==='burst'?'burst':'nether-hit',triggerMultiplier:e.trigger.multiplier},time,ctx);
          schedule(e,e.trigger.rate);continue;
        }
        if (e.kind === "module") { moduleCast(e, time, ctx); continue; }
        if (e.kind === "multi" && chains.get(e.row) !== e.token) continue;
        if (e.kind === "manual") {
          const row = rowAt(ctx.snapshot(), e.row);
          if (!row?.nether?.automaticBurst && row?.combat?.eligibleBurst && row.combat.maxBurst > 0 && charge.get(e.row) >= 1 - eps) {
            charge.set(e.row, 0); runTriggers("burstRate", time, ctx);
            for (let i = 0; i <= row.combat.maxBurst; i++) cast({ ...e, kind: "burst", activationCost: i === 0 ? row : null }, time, ctx);
          } else cast(e, time, ctx);
          schedule(e,config[e.row].castRate);
        } else { cast(e, time, ctx); if (e.kind === "repeat") schedule(e,config[e.row].repeatHits); }
      }
      if (newCastFirst) {
        // Stable sort preserves route order for hits of the same projectile.
        for (const e of arrivals.sort((a, b) => b.castNumber - a.castNumber)) followupHit(e, time, ctx);
      }
      if (nextDotTrigger <= time + eps) {
        const burning = activeIgnites().some(effect => effect.damage > 0);
        const numbed = ailments.numbed() > 0;
        const activeDot = !burning && nativeDot && (!dotWindows.size || getReport(ctx.snapshot()).fullDps.rows
          .some(row=>(row.combat?.dotWithoutAffliction>0 || row.combat?.frostWithoutAffliction>0) && dotInEffect(row,time)));
        if (nextDotTrigger < end - eps && (burning || activeDot)) {
          runTriggers("hitRate", time, ctx, e => (e.requiresIgnite || e.requiresNumbed)
            && (!e.requiresIgnite || burning) && (!e.requiresNumbed || numbed));
        }
        nextDotTrigger = nativeDot || burning ? dotTriggerStart + ++dotTriggerOccurrence / dotRate : Infinity;
      }
      if (manaTrigger && eventMana > 0) {
        const threshold = maxMana * manaTrigger.threshold;
        spentMana += eventMana;
        if (spentMana + eps >= threshold) {
          if (spentMana + eps >= 2 * threshold || (manaTrigger.ready ?? 0) > time + eps) {
            blockers.add('0.3초 제한에 걸린 MP 소모의 처리 순서가 미확인입니다. 초당 MP 소모율을 입력하세요.');
          } else if (actions.some(e=>e.kind==='channel-charge') && (arrivals.length || reaping || actions.some(e=>e.kind!=='channel-charge'))) {
            blockers.add('채널링 MP 차감과 다른 행동이 동시에 발생해 축복 적용 순서를 확인할 수 없습니다. 차감 시각 또는 초당 MP 소모율을 확인하세요.');
          } else if (eventCasts > 1 && spentMana - leastCastMana + eps >= threshold) {
            // The largest proper prefix leaves the least expensive cast
            // last. If that prefix crosses the threshold, a later cast
            // could use the new blessing, so batch-at-end is insufficient.
            blockers.add('동시에 시전한 스킬 사이에 MP 소모 축복이 발동할 수 있습니다. 초당 MP 소모율을 입력하세요.');
          } else {
            spentMana = Math.max(0, spentMana - threshold);
            ctx.runtime.trigger(manaTrigger, time, ctx.stacks, ctx.caps, ctx.expires);
          }
        }
      }
    },
  };
}

export function calculateTheaCombatAverage(build, report, calculateState, simulate, options, priorBlockers) {
  const mechanics = report.componentProjection.rows.flatMap(r => r.mechanics ?? []);
  const blockers = [...priorBlockers, ...theaCombatInputBlockers(build, mechanics, report), ...report.fullDps.blockers];
  if (mechanics.some(m => m.kind === 'thea-mana-spend') && report.fullDps.rows.some(row => row.channelCost && !row.channelCost.times && row.channelCost.rate !== 0 && row.manaPerUse > 0))
    blockers.push('채널링의 MP 차감 시각을 확인할 수 없습니다. 초당 MP 소모율을 입력하세요.');
  if (build.ss14Inputs.theaEvents.numbedEnabled !== 1 && mechanics.some(m => ["thea-numbed-on-hit", "thea-numbed-consume"].includes(m.kind))
    && report.fullDps.rows.some(r => r.pools?.some(p => p.type === "lightning" && p.max > 0))) blockers.push("선택한 계시가 번개 대미지로 마취를 부여합니다. 마취 계산을 켜고 대상 조건을 입력하세요.");
  if (report.componentProjection.rows.some(r => r.elixirState && r.elixirState.scale === "")) blockers.push("영약의 최종 효과 배율을 선택하세요.");
  if (build.ss14Inputs.theaEvents.igniteEnabled === 1 && !Number.isFinite(build.ss14Inputs.dps?.enemy?.fire)) blockers.push("점화·스코치가 적용될 적 화염 저항을 선택하세요.");
  if (report.fullDps.rows.some(r => r.values.heroDps > 0)) blockers.push("히어로 발동의 개별 시점 입력을 확인하세요.");
  // Replacing a skill clears its combat inputs. Report those blockers before estimating simulation work.
  if (!blockers.length) {
    const rates = report.fullDps.rows.reduce((n, r) => {
      const b = build.ss14Inputs.dps.skills[r.rowIndex];
      const modules = r.moduleTimeline ? (r.minionSkills ?? []).reduce((sum, a, i) => sum + (a.persistent ? 0 : b[`moduleRate${i}`] * (1 + (r.moduleHitEvents ? a.hitCount : 0))), 0) * b.minionCount : 0;
      const hits = r.shotgun?.hits ?? 1;
      const nether = (r.nether?.events ?? []).reduce((v, e) => v + e.rate * e.count * (1 + hits), 0);
      const casts = (b.castRate ?? 0) * (1 + (r.combat?.maxBurst ?? 0) + (b.multistrikeChance ?? 0) / 100);
      const fissures = (r.fissure?.times?.length ?? 0) / (options.seconds + options.warmup);
      const harvests = (r.reaping?.times?.length ?? 0) / (options.seconds + options.warmup);
      const channelCharges = (r.channelCost?.times?.length ?? 0) / (options.seconds + options.warmup);
      return n + modules + nether + (r.manualSummonRate ?? 0) + (b.castRate ?? 0) + casts * hits + (b.repeatHits ?? 0) + fissures + harvests + channelCharges;
    }, 0);
    const dotRate = usesTheaDotTrigger(build, mechanics, report) ? build.ss14Inputs.theaEvents.dotTriggerRate ?? 0 : 0;
    if ((rates + options.events.reduce((n, e) => n + e.rate, 0) + dotRate) * (options.seconds + options.warmup) * 128 > 2000000) blockers.push("복합 계산량이 한도를 넘었습니다. 측정 시간을 줄여 주세요.");
  }
  const cache = new Map();
  const getReport = state => {
    const key = JSON.stringify(state);
    if (!cache.has(key)) cache.set(key, calculateState(bindTheaState(structuredClone(build), state)));
    return cache.get(key);
  };
  const results = [], simulations = [], alternateTotals = [];
  let anyProjectileTie = false;
  let anyFissureTie = false;
  let alternateAvailable = true;
  if (!blockers.length) for (let i = 0; i < 128; i++) {
    const combat = createTheaCombatTimeline(build, report, getReport, { ...options, seed: 173 + i * 104729 });
    const simulation = simulate({ ...options, seed: 127 + i * 104729, combat });
    if (combat.blockers.size) { blockers.push(...combat.blockers); break; }
    const baselineTotal = finishCombatRows(combat, options.seconds);
    if (combat.hasProjectileTie || combat.hasFissureTie) {
      anyProjectileTie ||= combat.hasProjectileTie;
      anyFissureTie ||= combat.hasFissureTie;
      const alternate = createTheaCombatTimeline(build, report, getReport, { ...options, seed: 173 + i * 104729, newCastFirst: true });
      simulate({ ...options, seed: 127 + i * 104729, combat: alternate });
      if (alternate.blockers.size) alternateAvailable = false;
      alternateTotals.push(finishCombatRows(alternate, options.seconds));
    } else alternateTotals.push(baselineTotal);
    results.push(combat); simulations.push(simulation);
  }
  const supported = !blockers.length && results.length === 128;
  const reapingEvents = supported ? sum(results.map(run=>run.measuredCounts.reaps)) : 0;
  const rows = report.fullDps.rows.map(r => {
    const usages = results.map(v => v.costs.get(r.rowIndex));
    const canMeasure = supported && usages.every(Boolean);
    const perSecond = type => canMeasure ? sum(usages.map(usage => usage[type])) / results.length / options.seconds : null;
    let channelUsage;
    if (supported && r.channelCost?.times) {
      channelUsage = {channelCost:{...r.channelCost,valid:canMeasure,observed:true}};
    } else if (supported && r.channelCost) {
      const samples = results.map(run => run.channelCosts.get(r.rowIndex));
      const [first] = samples, {rate} = r.channelCost;
      const max = sum(samples.map(s => s.possibleCharges)) / results.length / options.seconds;
      const variable = samples.some(s => s.variable || s.mana !== first.mana || s.life !== first.life);
      const valid = rate !== null && rate <= max + eps && (rate === 0 || first.mana !== null && !variable);
      channelUsage = {channelCost: {rate,max,valid,variable,observed: true},
        manualManaPerSecond: valid ? first.mana * rate : null,
        manualLifePerSecond: valid ? first.life * rate : null};
    }
    const values = { ...r.values, ...Object.fromEntries(recordedKeys.map(key => [key, supported ? sum(results.map(v => v.rows.get(r.rowIndex)[key])) / 128 : null])) };
    const activeWindowSeconds = r.dotWindows?.reduce((n,[start,stop])=>
      n+Math.max(0,Math.min(stop,options.warmup+options.seconds)-Math.max(start,options.warmup)),0);
    const permafrostBreakdown = supported && r.permafrostBreakdown && activeWindowSeconds > 0
      ? {...r.permafrostBreakdown, uptime:100*activeWindowSeconds/options.seconds, active:values.permafrostDps*options.seconds/activeWindowSeconds}
      : undefined;
    const nativeDotDps = supported && r.dotBreakdown && Number.isFinite(activeWindowSeconds)
      ? Math.max(0,values.dotDps-values.igniteDps-values.scorchDps) : null;
    const dotBreakdown = nativeDotDps === null ? undefined : {
      uptime:100*activeWindowSeconds/options.seconds, applied:nativeDotDps,
      active:activeWindowSeconds>0 ? nativeDotDps*options.seconds/activeWindowSeconds : null,
    };
    const timedReaping = reapingEvents && (r.combat?.hasDot || Object.hasOwn(r.values,'permafrostDps'))
      ? { events:reapingEvents/results.length,
        applied:sum(results.map(run=>run.reapedNativeRows.get(r.rowIndex)??0))/results.length }
      : null;
    const typeSamples = supported && r.minionSkills ? results.map(run => run.rows.get(r.rowIndex).minionDamageByType) : [];
    const types = new Set(typeSamples.flatMap(sample => Object.keys(sample ?? {})));
    const minionDamageByType = types.size ? Object.fromEntries([...types].map(type => [
      type, sum(typeSamples.map(sample => sample?.[type] ?? 0)) / results.length,
    ])) : undefined;
    return { ...r, minionDamageByType, manualManaPerSecond: perSecond('mana'), manualLifePerSecond: perSecond('life'),
      ...channelUsage, supported, values, dotBreakdown, permafrostBreakdown, ...(timedReaping&&{timedReaping}) };
  });
  const dps = supported ? sum(rows.map(r => r.values.dps)) : null;
  const totals = results.map(r => sum([...r.rows.values()].map(r => r.dps)));
  const standardError = supported ? Math.sqrt(sum(totals.map(v => (v - dps) ** 2)) / 127 / 128) : null;
  const uptime = supported ? sum(simulations.map(s => s.uptime)) / 128 : null;
  const recovery = (report.character?.survival?.manaScenarios ?? []).map(scenario => {
    const samples = results.map(run => run.manaRecovery.get(scenario.id));
    const value = supported && samples.every(Number.isFinite) ? sum(samples) / samples.length / options.seconds : null;
    return { ...scenario, value };
  });
  const averageCounts = key => supported ? Object.fromEntries(Object.keys(results[0][key])
    .map(k => [k, sum(results.map(r => r[key][k])) / results.length])) : null;
  const averageBlessings = key => supported ? Object.fromEntries(['gained', 'consumed'].map(kind => [kind,
    Object.fromEntries(Object.keys(options.caps).map(blessing => [blessing, sum(simulations.map(s => s[key][kind][blessing])) / results.length]))])) : null;
  const ailmentResults = supported ? results.map(r => r.result()) : [];
  const averageAilment = key => supported ? sum(ailmentResults.map(r => r[key])) / results.length : null;
  const lightningHits = averageAilment('playerLightningHits');
  report.theaAverage = { supported, ...options, samples: 128, estimated: true, combat: true, dps, standardError, uptime,
    projectileTie: supported && (anyProjectileTie || anyFissureTie) ? { arrivalsFirstDps: dps, newCastFirstDps: alternateAvailable ? sum(alternateTotals) / results.length : null } : null,
    ...(anyFissureTie && {fissureTie:true}),
    doubleUptime: supported ? sum(simulations.map(s => s.doubleUptime)) / 128 : null,
    numbedAverage: averageAilment('numbedAverage'),
    numbedEffectAverage: combatNumbedEnabled(build, report) ? averageAilment('numbedEffectAverage') : null,
    playerNumbedDuration: supported && combatNumbedEnabled(build, report) ? results[0].playerNumbedDuration : null,
    scorchUptime: averageAilment('scorchUptime'),
    igniteUptime: averageAilment('igniteUptime'),
    numbedUptime: averageAilment('numbedUptime'),
    elixirUptimes:supported?timedElixirs(build,theaCombatInputValues(build,report)).map(elixir=>measureElixirUptime(elixir,options)):[],
    playerNumbedHits: lightningHits > 0 ? { lightningHits, boostedHits:averageAilment('playerNumbedHits'), bonusDps:sum(rows.map(row=>row.values.numbedHitDps)) } : null,
    counts: averageCounts('counts'), measuredCounts: averageCounts('measuredCounts'),
    extraBlessings: averageBlessings('eventTotals'), measuredBlessings: averageBlessings('measuredEventTotals'),
    blockers: [...new Set(blockers)], receipt: rules.receiptSha256 };
  report.fullDps = { ...report.fullDps, supported, rows, dps, scope: "ss14-thea-joint-combat", blockers: [...new Set(blockers)],
    manualResources: manualResourceBalance(rows, recovery, build.ss14Inputs.dps?.skills),
    receipts: [...report.fullDps.receipts, ...Object.values(rules.pages)],
    limitation: "입력한 시전 간격으로 축복 소모·매직 버스트·연속 공격·점화·스코치·마취를 같은 시간표에서 128회 계산합니다. 점화는 높은 대미지 중첩부터 적용하며, 마취는 각 중첩의 만료와 번개 명중 임계값을 계산합니다. 표준오차는 모의 계산 평균의 안정성 지표이며 실전 오차 범위가 아닙니다. 아래 속성·크리티컬 상세는 전투 시작 상태입니다." };
  report.fullDpsSupported = supported; report.summary.dps = dps;
  return report;
}
