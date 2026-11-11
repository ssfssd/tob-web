import { SS14_THEA_COMBAT as rules } from "./data/ss14TheaCombat.generated.js";
import { bindTheaState } from "./seasonTheaState.js";
import { theaCombatInputBlockers } from "./seasonTheaCombatInputs.js";
import { SS14_EXTENSION_NATIVE } from "./data/ss14ExtensionNative.generated.js";
import { createOmenAccumulator } from "./seasonOmen.js";
import { netherSum, netherMore } from './seasonNetherRemaining.js';
import { netherDeterioration } from './seasonNetherDps.js';

const eps = 1e-8;
const damageKeys = ["manualDps", "spellBurstDps", "repeatDps", "heroDps", "specialDps", "dotDps", "minionDps", "igniteDps", "scorchDps", "dps"];
const sum = a => a.reduce((n, v) => n + v, 0);
function finishCombatRows(combat, seconds) {
  for (const row of combat.rows.values()) {
    row.dotDps += row.igniteDps + row.scorchDps;
    row.dps = row.manualDps + row.spellBurstDps + row.repeatDps + row.heroDps + row.specialDps + row.dotDps + row.minionDps;
    for (const key of damageKeys) row[key] /= seconds;
  }
  return sum([...combat.rows.values()].map(row => row.dps));
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
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
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const input = build.ss14Inputs.theaEvents;
  const netherEffects=report.componentProjection.effects;
  const bonus=stat=>netherSum(netherEffects,stat);
  const elixirs = (build.skills.elixirs ?? []).flatMap((s, i) => s?.skillId ? [{ i, interval: input[`elixir${i}Interval`], start: input[`elixir${i}Start`], duration: input[`elixir${i}Duration`] }] : []);
  let clock = 0;
  const elixirState = time => Object.fromEntries(elixirs.map(e => [`elixir${e.i}`, Number(time + eps >= e.start && (time - e.start + eps) % e.interval < e.duration)]));
  const nextElixir = time => Math.min(Infinity, ...elixirs.map(e => time + eps < e.start ? e.start : e.duration >= e.interval ? Infinity
    : Math.min(e.start + (Math.floor((time - e.start + eps) / e.interval) + 1) * e.interval,
      e.start + Math.floor((time - e.start + eps) / e.interval) * e.interval + e.duration > time + eps
        ? e.start + Math.floor((time - e.start + eps) / e.interval) * e.interval + e.duration : Infinity)));
  const enemy = build.ss14Inputs.dps.enemy;
  const config = build.ss14Inputs.dps.skills;
  const mechanics = report.componentProjection.rows.flatMap(r => r.mechanics ?? []);
  const has = kind => mechanics.some(m => m.kind === kind);
  const linked = mechanics.filter(m => m.kind === "thea-combat-event").map(e => ({ ...e }));
  const numbedConsume = { blessing: "Agility", consume: 3, cooldown: 1 };
  const ailments = createAilmentTimeline();
  const omen = createOmenAccumulator();
  const rows = new Map(report.fullDps.rows.map(r => [r.rowIndex, Object.fromEntries(damageKeys.map(k => [k, 0]))]));
  const queue = [], chains = new Map(), charge = new Map();
  const moduleBuffs = new Map(), wilts = [], deteriorations = [];
  const infiltrations = { cold: 0, fire: 0, lightning: 0 };
  let elixirInfiltrationReady = 0;
  const counts = { casts: 0, hits: 0, followupHits: 0, multistrikes: 0, spellBurst: 0, ignites: 0, scorches: 0, numbedInflicted: 0 };
  const blockers = new Set();
  let hasProjectileTie = false;
  let aggressionUntil = 0, affliction = enemy.affliction ?? 0, afflictionUntil = 0, nextDotTrigger = Infinity;
  let currentTenacity = 0, recentAgility = false;
  let numbedArea = 0, scorchArea = 0;
  const activeIgnites = () => ailments.active((input.igniteLimit ?? 1) + Number(has("thea-ignite-limit") && currentTenacity >= 10));
  const push = e => { if (Number.isFinite(e.at)) queue.push(e); };
  for (const row of report.fullDps.rows) {
    if (row.values.minionDps !== undefined) {
      if (row.moduleTimeline) for (let unit = 0; unit < config[row.rowIndex].minionCount; unit++) for (const [action, skill] of row.minionSkills.entries()) {
        const rate = config[row.rowIndex][`moduleRate${action}`];
        if (!skill.persistent && rate > 0) push({ at: 1 / rate, row: row.rowIndex, kind: "module", action, unit });
      }
      continue;
    }
    const b = config[row.rowIndex];
    for(const event of row.nether?.events??[])push({at:1/event.rate,row:row.rowIndex,kind:'nether',index:0,trigger:event});
    if (b.castRate > 0) push({ at: 1 / b.castRate, row: row.rowIndex, kind: "manual", index: 0 });
    if (b.repeatHits > 0) push({ at: 1 / b.repeatHits, row: row.rowIndex, kind: "repeat", index: 0 });
    charge.set(row.rowIndex, 0);
  }
  const rowAt = (state, row) => {
    const r = getReport(state).fullDps;
    if (!r.supported) r.blockers.forEach(s => blockers.add(s));
    return r.rows.find(r => r.rowIndex === row);
  };
  const values = () => ({ numbedEffect: ailments.numbedEffect(1 + ((input.numbedEffect ?? 0)+bonus('numbed_effect')) / 100 + (has("thea-numbed-effect") && recentAgility ? .5 : 0)) * rules.numbed.morePerStack,
    scorched: Number(activeIgnites().some(e => e.scorch)) });
  const weight = (a, b) => Math.max(0, Math.min(b, warmup + seconds) - Math.max(a, warmup));
  const inflictNumbed = (time, n) => { if (input.numbedEnabled !== 1 || n <= 0) return; n+=bonus('numbed_additional_stacks'); ailments.numb(time, n, input.numbedDuration, input.numbedLimit); counts.numbedInflicted += n; };
  const runTriggers = (key, time, ctx, predicate = () => true) => {
    let consumed = false;
    for (const e of linked.filter(e => e.inputKey === key && predicate(e))) consumed = ctx.runtime.trigger(e, time, ctx.stacks, ctx.caps, ctx.expires) || consumed;
    return consumed;
  };
  const recordDamage = (row, key, amount, time) => { if (time >= warmup && time < warmup + seconds) rows.get(row)[key] += amount; };
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
      recordDamage(0, "specialDps", result.damage, time);
    }
  };
  function moduleCast(event, time, ctx) {
    const b = config[event.row], key = `${event.row}:${event.unit}`;
    const rate = b[`moduleRate${event.action}`];
    push({ ...event, at: time + 1 / rate });
    if (random() >= b.minionUptime / 100) return;
    let row = rowAt(ctx.snapshot(), event.row), action = row?.minionSkills[event.action];
    if (!row?.supported || !action) return;
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
      // Burst Hammer has its own 64% shotgun falloff after the first hit.
      const hit = action.slug === "Burst_Hammer" ? action.perCast / (1 + Math.max(0, action.hitCount - 1) * .36) * (h ? .36 : 1)
        : action.perCast / action.hitCount;
      recordDamage(event.row, "minionDps", hit * hitMultiplier, time);
      const randomElement = action.randomElemental ? ["fire", "cold", "lightning"][Math.floor(random() * 3)] : null;
      for (const type of row.infiltrationTypes) if ((action.damageTypes.includes(type) || randomElement === type) && hit > 0) infiltrations[type] = time + SS14_EXTENSION_NATIVE.infiltration[type].duration;
      if (row.elementalProtocol) {
        const lightning = action.lightningRolls.reduce((sum, pool) => sum + (!pool.random || randomElement === "lightning" ? (pool.min + (pool.max - pool.min) * random()) * (pool.random ? 3 : 1) : 0), 0)
          * (random() < action.criticalChance ? action.criticalMultiplier : 1) * hitMultiplier;
        if (lightning > 0) {
          const extra = ailments.numbed() ? Math.floor(lightning / (input.enemyLifeShield * input.numbedThreshold / 100)) : 0;
          ailments.numb(time, 1 + extra, input.numbedDuration, input.numbedLimit, 1); counts.numbedInflicted += 1 + extra;
        }
      }
      if (action.slug === "Sin_of_the_Fallen") {
        if (wilts.length >= 30) { wilts.sort((a,b) => a.expires - b.expires); wilts.shift(); }
        wilts.push({ row: event.row, damage: row.wiltBase, expires: time + row.wiltDuration });
      }
      if (action.deterioration > 0 && random() < action.deteriorationChance && deteriorations.length < 99) {
        deteriorations.push({ row: event.row, at: time + action.deteriorationDelay, damage: action.deterioration / action.hitCount * hitMultiplier });
      }
    }
  }
  function resolveHit(event, time, ctx, state, row, hitMultiplier, ailmentWeight) {
    const b = config[event.row];
    counts.hits++;
    const hadIgnite = activeIgnites().length > 0, hadNumbed = ailments.numbed() > 0;
    const averageHit = b.hitChance > 0 ? row.values.averageHit / (b.hitChance / 100) : 0;
    recordDamage(event.row, event.kind === "burst" ? "spellBurstDps" : event.kind === "repeat" ? "repeatDps" : "manualDps", averageHit * hitMultiplier, time);
    if (row.combat.tags.includes("Spell") && averageHit > 0 && time + eps >= elixirInfiltrationReady
      && (build.skills.elixirs ?? []).some((s,i) => s?.skillId === "iridescent-butterfly-distillate" && elixirState(time)[`elixir${i}`])) {
      for (const type of Object.keys(infiltrations)) infiltrations[type] = time + SS14_EXTENSION_NATIVE.infiltration[type].duration;
      elixirInfiltrationReady = time + 1;
    }
    const lightning = row.pools.find(p => p.type === "lightning");
    let actualLightning = 0;
    if (lightning && input.numbedEnabled === 1) {
      const rolls = Array.from({ length: Math.abs(row.combat.luck) + 1 }, random);
      const roll = row.combat.luck >= 0 ? Math.max(...rolls) : Math.min(...rolls);
      const c = row.combat.critical;
      const crit = random() < c.effectiveCriticalChance / 100 ? c.criticalDamage / 100 * c.criticalOnlyMultiplier : 1;
      const d = random(), dbl = d < c.quadrupleDamageChance / 100 ? 4 : d < c.doubleDamageChance / 100 ? 2 : 1;
      actualLightning = (lightning.min + (lightning.max - lightning.min) * roll) * row.combat.attributeMultiplier * row.combat.takenMultiplier * crit * dbl * hitMultiplier;
    }
    runTriggers("hitRate", time, ctx, e => (!e.requiresIgnite || hadIgnite) && (!e.requiresNumbed || hadNumbed));
    if (has("thea-aggression")) aggressionUntil = time + rules.aggression.duration;
    // A newly inflicted ailment never modifies the hit which inflicted it.
    if (event.row === 0 && input.igniteEnabled === 1 && input.igniteBaseMax+bonus('base_ailment_damage_max') > 0) {
      const chance = input.igniteChance + bonus('damaging_ailment_chance') + (has("thea-ignite-chance") ? 3 * Math.min(18, state.stacks.Tenacity) : 0);
      if (random() < Math.min(1, chance / 100)) {
        const eligible = new Set(["damage", "elemental_damage", "fire_damage", "damage_over_time", "ailment_damage"]);
        for(const [tag,stat] of [['Slash-Strike','slash_strike'],['Demolisher','demolisher'],['Area','area'],['Projectile','projectile']])if(row.combat.tags.includes(tag))eligible.add(`${stat}_ailment_damage`);
        const modifiers = [...row.combat.effects.filter(e => eligible.has(e.stat)), ...row.combat.igniteSupportEffects];
        const inc = input.igniteIncreased + sum(modifiers.filter(e => e.operation === "add_percent").map(e => e.value));
        const more = modifiers.filter(e => e.operation === "more").reduce((n, e) => n * (1 + e.value / 100), 1);
        const baseMin=input.igniteBaseMin+bonus('base_ailment_damage_min'),baseMax=input.igniteBaseMax+bonus('base_ailment_damage_max');
        const damage = (baseMin + (baseMax - baseMin) * random()) * ailmentWeight * (1 + inc / 100) * more * row.combat.attributeMultiplier
          *netherMore(row.combat.effects,'enemy_dot_damage_taken')*netherMore(row.combat.effects,'enemy_all_damage_taken');
        const scorch = row.combat.elixirScorch || has("thea-scorch") && state.stacks.Tenacity >= 10;
        ailments.ignite({ damage, scorch, expires: time + input.igniteDuration, row: event.row });
        counts[scorch ? "scorches" : "ignites"]++;
        if (input.dotTriggerRate > 0 && !Number.isFinite(nextDotTrigger)) nextDotTrigger = time + 1 / input.dotTriggerRate;
      }
    }
    if (event.row === 0 && actualLightning > 0 && input.numbedEnabled === 1) {
      const extra = has("thea-numbed-consume") ? 1 : 0;
      if (has("thea-numbed-on-hit") || random() < input.numbedChance / 100) inflictNumbed(time, 1 + extra);
      const thresholdStacks = Math.floor(actualLightning / (input.enemyLifeShield * input.numbedThreshold / 100));
      if (hadNumbed && thresholdStacks > 0) inflictNumbed(time, thresholdStacks + extra);
      if (has("thea-numbed-consume") && ctx.runtime.trigger(numbedConsume, time, ctx.stacks, ctx.caps, ctx.expires)) inflictNumbed(time, 2 + extra);
    }
    const deterioration=mechanics.find(m=>m.kind==='nether-deterioration');
    const erosion=row.pools.find(p=>p.type==='erosion');
    if(deterioration&&erosion&&random()<deterioration.chance/100&&deteriorations.filter(d=>d.player).length<99) {
      const c=row.combat.critical;
      const crit=random()<c.effectiveCriticalChance/100?c.criticalDamage/100*c.criticalOnlyMultiplier:1;
      const d=random(),dbl=d<c.quadrupleDamageChance/100?4:d<c.doubleDamageChance/100?2:1;
      const rolls=Array.from({length:Math.abs(row.combat.luck)+1},random);
      const roll=row.combat.luck>=0?Math.max(...rolls):Math.min(...rolls);
      const hit=(erosion.min+(erosion.max-erosion.min)*roll)*row.combat.attributeMultiplier*row.combat.takenMultiplier*crit*dbl*hitMultiplier;
      deteriorations.push({row:event.row,player:true,at:time+1,damage:netherDeterioration(row.combat.effects,hit,100)});
    }
  }
  function followupHit(event, time, ctx) {
    const state = ctx.snapshot();
    Object.assign(state.events, event.castBonuses);
    const row = rowAt(state, event.row);
    if (!row?.supported) return;
    counts.followupHits++;
    resolveHit(event, time, ctx, state, row, event.hitMultiplier, event.ailmentWeight);
  }
  function cast(event, time, ctx) {
    const b = config[event.row];
    let state = ctx.snapshot(), row = rowAt(state, event.row);
    if (!row?.supported) return;
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
    const landed = event.kind === "repeat" || random() < b.hitChance / 100;
    counts.casts++; if (event.index > 0) counts.multistrikes++;
    if (event.kind === "burst") counts.spellBurst++;
    if (landed) {
      const castMultiplier = sequenceMultiplier * burstMultiplier;
      resolveHit(event, time, ctx, state, row, castMultiplier, 1);
      // Hit chance selects whether this observed single-projectile route connects.
      // Follow-up hits keep cast-only bonuses, but read target state on arrival.
      const route = row.shotgun;
      for (let i = 1; i < (route?.hits ?? 1); i++) {
        const at = time + route.delaysMs[i] / 1000;
        if (at >= warmup + seconds) break;
        const followup = { kind: event.kind, followup: true, castNumber: counts.casts, at, row: event.row,
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
    blockers, counts, rows,
    get hasProjectileTie() { return hasProjectileTie; },
    result() { return { numbedAverage: numbedArea / seconds, scorchUptime: 100 * scorchArea / seconds }; },
    state(time, stacks, events) { currentTenacity = stacks.Tenacity; recentAgility = events.recentAgility > 0; return { ...values(), ...elixirState(time), ...Object.fromEntries(Object.entries(infiltrations).map(([type,until]) => [`${type}Infiltration`, Number(until > time + eps || events[`${type}Infiltration`])])), attackAggression: Number(aggressionUntil > time + eps) }; },
    next() { return Math.min(Infinity, ...Object.values(infiltrations).filter(t => t > clock + eps), ...queue.map(e => e.at), ...wilts.map(e => e.expires), ...deteriorations.map(e => e.at), ailments.next(), aggressionUntil || Infinity, afflictionUntil || Infinity, nextDotTrigger, nextElixir(clock)); },
    expire(time) { clock = time; ailments.expire(time); for (let i = wilts.length - 1; i >= 0; i--) if (wilts[i].expires <= time + eps) wilts.splice(i, 1); if (aggressionUntil <= time + eps) aggressionUntil = 0; if (afflictionUntil <= time + eps) { afflictionUntil = 0; affliction = 0; } },
    advance(from, to, state) {
      currentTenacity = state.stacks.Tenacity; recentAgility = state.events.recentAgility > 0;
      const r = getReport({ ...state, events: { ...state.events, ...values() } });
      if (!r.fullDps.supported) r.fullDps.blockers.forEach(s => blockers.add(s));
      const delta = to - from, active = activeIgnites();
      const native = r.fullDps.rows.filter(row => row.combat?.hasDot);
      const minionDots = row => (row.ailmentDps ?? 0) + (row.minionSkills ?? []).filter(a => a.persistent).reduce((sum,a) => sum + a.dps, 0);
      const dotActive = active.length > 0 || wilts.length > 0 || r.fullDps.rows.some(row => minionDots(row) > 0) || native.some(r => r.combat.dotWithoutAffliction > 0);
      if (dotActive) afflictionUntil = to + rules.affliction.duration;
      const rate = afflictionUntil > from ? (input.afflictionRate ?? 0) + bonus('affliction_per_second') + (has("thea-affliction-gain") ? 10 * Math.min(18, state.stacks.Tenacity) : 0) : 0;
      const at = t => Math.min(100, affliction + rate * t);
      const integral = (a, b) => { const cap = rate > 0 ? clamp((100 - affliction) / rate, a, b) : b; return (affliction * (cap - a) + rate * (cap * cap - a * a) / 2) + 100 * (b - cap); };
      const fireTaken = r.componentProjection.effects.filter(e => e.stat === "fire_damage_taken").reduce((n,e) => n * (1 + e.value / 100), 1);
      const lo = Math.max(0, warmup - from), hi = Math.min(delta, warmup + seconds - from), w = Math.max(0, hi - lo);
      if (w) {
        numbedArea += ailments.numbed() * w; if (active.some(e => e.scorch)) scorchArea += w;
        const first = r.fullDps.rows.find(r => r.rowIndex === 0);
        const afflictionEffect = first?.combat?.afflictionEffect ?? 1;
        const afflictionWeight = w + integral(lo, hi) / 100 * afflictionEffect;
        for (const effect of active) {
          const resist = 1 - (enemy.fire - (active.some(e => e.scorch) ? input.scorchResistance : 0) - (first?.combat?.penetration.fire ?? 0)) / 100;
          const amount = effect.damage * resist * fireTaken * afflictionWeight;
          rows.get(effect.row)[effect.scorch ? "scorchDps" : "igniteDps"] += amount;
        }
        for (const row of native) {
          const amount = row.combat.dotWithoutAffliction * (w + integral(lo, hi) / 100 * row.combat.afflictionEffect);
          rows.get(row.rowIndex).dotDps += amount;
        }
        // Minion action rates are explicit final rates. Integrate their own
        // state DPS; never emit player hit/ailment/blessing events for them.
        for (const row of r.fullDps.rows) if (row.values.minionDps !== undefined) {
          const dots = minionDots(row), direct = row.moduleTimeline ? (row.explosionDps ?? 0) + (row.executeDps ?? 0) : row.values.minionDps - dots;
          rows.get(row.rowIndex).minionDps += direct * w + dots / (1 + (enemy.affliction ?? 0) / 100) * (w + integral(lo,hi) / 100);
        }
        for (const wilt of wilts) {
          const amount = wilt.damage * r.fullDps.rows.find(row => row.rowIndex === wilt.row).wiltTargetBase * (w + integral(lo,hi) / 100);
          rows.get(wilt.row).minionDps += amount;
        }
      }
      if (r.componentProjection.rows.some(row => row.mechanics?.some(m => m.kind === "ill-omen"))) {
        const first = r.fullDps.rows.find(row => row.rowIndex === 0);
        const resist = 1 - (enemy.fire - (active.some(e => e.scorch) ? input.scorchResistance : 0) - (first?.combat?.penetration.fire ?? 0)) / 100;
        const fixed = wilts.reduce((n,e) => n + e.damage * r.fullDps.rows.find(row => row.rowIndex === e.row).wiltTargetBase, 0)
          + r.fullDps.rows.reduce((n,row) => n + minionDots(row) / (1 + (enemy.affliction ?? 0) / 100), 0);
        const eligible = t => fixed * (t + integral(0,t) / 100) + active.reduce((n,e) => n + e.damage * resist * fireTaken * (t + integral(0,t) / 100 * (first?.combat?.afflictionEffect ?? 1)), 0)
          + native.reduce((n,row) => n + row.combat.dotWithoutAffliction * (t + integral(0,t) / 100 * row.combat.afflictionEffect), 0);
        omenDamage(eligible(delta), to, r, from, eligible);
      }
      affliction = at(delta);
      for (const row of r.fullDps.rows) if (row.combat?.eligibleBurst && row.combat.maxBurst > 0) charge.set(row.rowIndex, Math.min(1, charge.get(row.rowIndex) + delta * row.combat.burstChargeSpeed / 2));
    },
    apply(time, ctx) {
      currentTenacity = ctx.stacks.Tenacity; recentAgility = ctx.runtime.state(time).recentAgility > 0;
      const due = queue.filter(e => e.at <= time + eps); for (const e of due) queue.splice(queue.indexOf(e), 1);
      for (const event of deteriorations.filter(e => e.at <= time + eps)) { recordDamage(event.row, event.player?'specialDps':"minionDps", event.damage, time); omenDamage(event.damage, time, getReport(ctx.snapshot())); deteriorations.splice(deteriorations.indexOf(event), 1); }
      // Keep the order of one projectile's route. The client damage map does
      // not establish priority between projectiles from independent casts.
      const arrivals = due.filter(e => e.followup);
      const actions = due.filter(e => !e.followup);
      if (arrivals.length && (actions.length || arrivals.some(e => e.castNumber !== arrivals[0].castNumber))) hasProjectileTie = true;
      if (!newCastFirst) for (const e of arrivals) followupHit(e, time, ctx);
      for (const e of actions) {
        if(e.kind==='nether') {
          const row=rowAt(ctx.snapshot(),e.row);
          if(e.trigger.trigger==='burst') {
            if(charge.get(e.row)<1-eps){blockers.add('추방 자동 버스트 발동 시점에 충전이 부족합니다.');continue;}
            charge.set(e.row,0);runTriggers('burstRate',time,ctx);
          }
          for(let n=0;n<e.trigger.count;n++)cast({...e,kind:e.trigger.trigger==='burst'?'burst':'nether-hit',triggerMultiplier:e.trigger.multiplier},time,ctx);
          push({...e,at:e.at+1/e.trigger.rate});continue;
        }
        if (e.kind === "module") { moduleCast(e, time, ctx); continue; }
        if (e.kind === "multi" && chains.get(e.row) !== e.token) continue;
        if (e.kind === "manual") {
          const row = rowAt(ctx.snapshot(), e.row);
          if (!row?.nether?.automaticBurst && row?.combat?.eligibleBurst && row.combat.maxBurst > 0 && charge.get(e.row) >= 1 - eps) {
            charge.set(e.row, 0); runTriggers("burstRate", time, ctx);
            for (let i = 0; i <= row.combat.maxBurst; i++) cast({ ...e, kind: "burst" }, time, ctx);
          } else cast(e, time, ctx);
          push({ ...e, at: e.at + 1 / config[e.row].castRate });
        } else { cast(e, time, ctx); if (e.kind === "repeat") push({ ...e, at: e.at + 1 / config[e.row].repeatHits }); }
      }
      if (newCastFirst) {
        // Stable sort preserves route order for hits of the same projectile.
        for (const e of arrivals.sort((a, b) => b.castNumber - a.castNumber)) followupHit(e, time, ctx);
      }
      if (nextDotTrigger <= time + eps) {
        if (activeIgnites().length) { runTriggers("hitRate", time, ctx, e => e.requiresIgnite || e.requiresNumbed && ailments.numbed() > 0); nextDotTrigger += 1 / input.dotTriggerRate; }
        else nextDotTrigger = Infinity;
      }
    },
  };
}

export function calculateTheaCombatAverage(build, report, calculateState, simulate, options, priorBlockers) {
  const mechanics = report.componentProjection.rows.flatMap(r => r.mechanics ?? []);
  const blockers = [...priorBlockers, ...theaCombatInputBlockers(build, mechanics), ...report.fullDps.blockers];
  if (build.ss14Inputs.theaEvents.numbedEnabled !== 1 && mechanics.some(m => ["thea-numbed-on-hit", "thea-numbed-consume"].includes(m.kind))
    && report.fullDps.rows.some(r => r.pools?.some(p => p.type === "lightning" && p.max > 0))) blockers.push("선택한 계시가 번개 대미지로 마취를 부여합니다. 마취 계산을 켜고 대상 조건을 입력하세요.");
  if (report.componentProjection.rows.some(r => r.elixirState && r.elixirState.scale === "")) blockers.push("영약의 최종 효과 배율을 선택하세요.");
  if (build.ss14Inputs.theaEvents.igniteEnabled === 1 && !Number.isFinite(build.ss14Inputs.dps?.enemy?.fire)) blockers.push("점화·스코치가 적용될 적 화염 저항을 선택하세요.");
  if (report.fullDps.rows.some(r => r.values.heroDps > 0)) blockers.push("히어로 발동의 개별 시점 입력을 확인하세요.");
  // Replacing a skill clears its combat inputs. Report those blockers before estimating simulation work.
  if (!blockers.length) {
    const rates = report.fullDps.rows.reduce((n, r) => {
      const b = build.ss14Inputs.dps.skills[r.rowIndex];
      const modules = r.moduleTimeline ? (r.minionSkills ?? []).reduce((sum, a, i) => sum + (a.persistent ? 0 : b[`moduleRate${i}`] * (1 + a.hitCount)), 0) * b.minionCount : 0;
      const hits = r.shotgun?.hits ?? 1;
      const nether = (r.nether?.events ?? []).reduce((v, e) => v + e.rate * e.count * (1 + hits), 0);
      const casts = (b.castRate ?? 0) * (1 + (r.combat?.maxBurst ?? 0) + (b.multistrikeChance ?? 0) / 100);
      return n + modules + nether + (b.castRate ?? 0) + casts * hits + (b.repeatHits ?? 0);
    }, 0);
    if ((rates + options.events.reduce((n, e) => n + e.rate, 0) + (build.ss14Inputs.theaEvents.dotTriggerRate ?? 0)) * (options.seconds + options.warmup) * 128 > 2000000) blockers.push("복합 계산량이 한도를 넘었습니다. 측정 시간을 줄여 주세요.");
  }
  const cache = new Map();
  const getReport = state => {
    const key = JSON.stringify(state);
    if (!cache.has(key)) cache.set(key, calculateState(bindTheaState(structuredClone(build), state)));
    return cache.get(key);
  };
  const results = [], simulations = [], alternateTotals = [];
  let anyProjectileTie = false;
  let alternateAvailable = true;
  if (!blockers.length) for (let i = 0; i < 128; i++) {
    const combat = createTheaCombatTimeline(build, report, getReport, { ...options, seed: 173 + i * 104729 });
    const simulation = simulate({ ...options, seed: 127 + i * 104729, combat });
    if (combat.blockers.size) { blockers.push(...combat.blockers); break; }
    const baselineTotal = finishCombatRows(combat, options.seconds);
    if (combat.hasProjectileTie) {
      anyProjectileTie = true;
      const alternate = createTheaCombatTimeline(build, report, getReport, { ...options, seed: 173 + i * 104729, newCastFirst: true });
      simulate({ ...options, seed: 127 + i * 104729, combat: alternate });
      if (alternate.blockers.size) alternateAvailable = false;
      alternateTotals.push(finishCombatRows(alternate, options.seconds));
    } else alternateTotals.push(baselineTotal);
    results.push(combat); simulations.push(simulation);
  }
  const supported = !blockers.length && results.length === 128;
  const rows = report.fullDps.rows.map(r => ({ ...r, supported, values: { ...r.values, ...Object.fromEntries(damageKeys.map(key => [key, supported ? sum(results.map(v => v.rows.get(r.rowIndex)[key])) / 128 : null])) } }));
  const dps = supported ? sum(rows.map(r => r.values.dps)) : null;
  const totals = results.map(r => sum([...r.rows.values()].map(r => r.dps)));
  const standardError = supported ? Math.sqrt(sum(totals.map(v => (v - dps) ** 2)) / 127 / 128) : null;
  const uptime = supported ? sum(simulations.map(s => s.uptime)) / 128 : null;
  report.theaAverage = { supported, ...options, samples: 128, estimated: true, combat: true, dps, standardError, uptime,
    projectileTie: supported && anyProjectileTie ? { arrivalsFirstDps: dps, newCastFirstDps: alternateAvailable ? sum(alternateTotals) / results.length : null } : null,
    doubleUptime: supported ? sum(simulations.map(s => s.doubleUptime)) / 128 : null,
    numbedAverage: supported ? sum(results.map(r => r.result().numbedAverage)) / 128 : null,
    scorchUptime: supported ? sum(results.map(r => r.result().scorchUptime)) / 128 : null,
    counts: supported ? Object.fromEntries(Object.keys(results[0].counts).map(k => [k, sum(results.map(r => r.counts[k])) / 128])) : null,
    extraBlessings: supported ? Object.fromEntries(['gained', 'consumed'].map(kind => [kind,
      Object.fromEntries(Object.keys(options.caps).map(key => [key, sum(simulations.map(s => s.eventTotals[kind][key])) / 128]))])) : null,
    blockers: [...new Set(blockers)], receipt: rules.receiptSha256 };
  report.fullDps = { ...report.fullDps, supported, rows, dps, scope: "ss14-thea-joint-combat", blockers: [...new Set(blockers)],
    receipts: [...report.fullDps.receipts, ...Object.values(rules.pages)],
    limitation: "입력한 시전 간격으로 축복 소모·매직 버스트·연속 공격·점화·스코치·마취를 같은 시간표에서 128회 계산합니다. 점화는 높은 대미지 중첩부터 적용하며, 마취는 각 중첩의 만료와 번개 명중 임계값을 계산합니다. 표준오차는 모의 계산 평균의 안정성 지표이며 실전 오차 범위가 아닙니다. 아래 속성·크리티컬 상세는 전투 시작 상태입니다." };
  report.fullDpsSupported = supported; report.summary.dps = dps;
  return report;
}
