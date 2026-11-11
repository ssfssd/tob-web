import { bindTheaState } from "./seasonTheaState.js";
import { isThea, theaRulePin } from "./seasonTheaRevelation.js";
import { seasonBlessingPins } from "./seasonBlessings.js";
import { SS14_THEA_RULES } from "./data/ss14TheaRules.generated.js";
import { createTheaEventRuntime, validTheaEvents } from "./seasonTheaEvents.js";
import { SS14_CARDS_EN } from "./data/ss14Cards.en.generated.js";
import { theaCombatEnabled } from "./seasonTheaCombatInputs.js";
import { calculateTheaCombatAverage } from "./seasonTheaCombat.js";

export function validTheaInputs(inputs) {
  if (inputs.theaCombatReceipt !== undefined && !/^[a-f0-9]{64}$/u.test(inputs.theaCombatReceipt)) return false;
  if (!validTheaEvents(inputs.theaEvents) || inputs.theaEffectsReceipt !== undefined && !/^[a-f0-9]{64}$/u.test(inputs.theaEffectsReceipt)) return false;
  if (inputs.theaRulesReceipt !== undefined && !/^[a-f0-9]{64}$/u.test(inputs.theaRulesReceipt)) return false;
  const v = inputs.theaCycle;
  return v === undefined || v && !Array.isArray(v) && Object.keys(v).every(k => ["seconds", "warmup", "mode"].includes(k))
    && ["snapshot", "automatic"].includes(v.mode) && Number.isFinite(v.seconds) && v.seconds >= 1 && v.seconds <= 1800
    && Number.isFinite(v.warmup) && v.warmup >= 0 && v.warmup <= 1800;
}

// Events carry complete blessing stacks and individual Boon lifetimes. The
// integrator averages final damage, never averages the correlated multipliers.
export function simulateTheaCycle({ seconds, warmup = 0, caps = { Focus: 4, Agility: 4, Tenacity: 4 }, cooldown = 15, duration = 10, maxBoons = 1, events = [], seed = 1,
  blessingDurations = { Focus: 10, Agility: 10, Tenacity: 10 }, combat = null }) {
  if (![seconds, warmup, cooldown, duration].every(Number.isFinite) || seconds <= 0 || seconds > 1800 || warmup < 0 || warmup > 1800
    || cooldown <= 0 || duration <= 0 || ![1, 2].includes(maxBoons)
    || !["Focus", "Agility", "Tenacity"].every(k => Number.isInteger(caps[k]) && caps[k] > 0 && caps[k] <= 100 && Number.isFinite(blessingDurations[k]) && blessingDurations[k] > 0)
    || events.some(e => !Number.isFinite(e.rate) || e.rate < 0 || e.rate > 1000
      || e.gain !== undefined && (!Number.isInteger(e.gain) || e.gain < 0)
      || e.consume !== undefined && (!Number.isInteger(e.consume) || e.consume < 1)
      || e.chance !== undefined && (!Number.isFinite(e.chance) || e.chance < 0 || e.chance > 1))) throw new Error("은총 주기 입력 범위를 확인하세요.");
  const keys = ["Focus", "Agility", "Tenacity"];
  const stacks = { Focus: 0, Agility: 0, Tenacity: 0 };
  const expires = { Focus: Infinity, Agility: Infinity, Tenacity: Infinity };
  let boons = []; let nextGrant = 2; let grantIndex = 0; let ready = 0; let time = 0;
  const segments = new Map(); const casts = []; const end = seconds + warmup;
  const runtime = createTheaEventRuntime(events, seed, blessingDurations); const castBonuses = [];
  const snapshot = () => ({ stacks: { ...stacks }, caps: { ...caps }, boons: boons.map(b => ({ consumed: b.consumed, atMax: 1 })),
    events: { ...runtime.state(time), ...(combat?.state(time, stacks, runtime.state(time)) ?? {}) } });
  let activeTime = 0; let doubleTime = 0;
  while (time < end) {
    const next = Math.min(end, nextGrant, runtime.next(time), combat?.next(time) ?? Infinity, ...Object.values(expires), ...boons.map(b => b.expires),
      stacks.Focus === caps.Focus && ready > time ? ready : Infinity);
    if (!(next > time)) throw new Error("은총 사건 시간이 진행되지 않습니다.");
    const weight = Math.max(0, next - Math.max(time, warmup));
    combat?.advance(time, next, snapshot());
    if (weight) {
      const state = { stacks: { ...stacks }, caps: { ...caps }, boons: boons.map(b => ({ consumed: b.consumed, atMax: 1 })) };
      if (events.length) state.events = runtime.state(time);
      if (!combat) { const key = JSON.stringify(state); const segment = segments.get(key) ?? { state, seconds: 0 };
        segment.seconds += weight; segments.set(key, segment); }
      if (boons.length) activeTime += weight;
      if (boons.length === 2) doubleTime += weight;
    }
    time = next;
    for (const key of keys) if (expires[key] <= time) { stacks[key] = 0; expires[key] = Infinity; }
    boons = boons.filter(b => b.expires > time);
    combat?.expire(time);
    if (nextGrant <= time) {
      const key = keys[grantIndex++ % 3]; stacks[key] = Math.min(caps[key], stacks[key] + 1);
      expires[key] = time + blessingDurations[key]; nextGrant += 2;
    }
    for (const bonus of runtime.apply(time, stacks, caps, expires)) if (time >= warmup && time < end) castBonuses.push({ ...bonus,
      state: { ...bonus.state, boons: boons.map(b => ({ consumed: b.consumed, atMax: 1 })) } });
    if (time < end) combat?.apply(time, { stacks, caps, expires, runtime, snapshot });
    if (stacks.Focus === caps.Focus && ready <= time) {
      boons.push({ consumed: stacks.Focus, expires: time + duration });
      boons = boons.slice(-maxBoons); stacks.Focus = 0; expires.Focus = Infinity;
      ready = time + cooldown; casts.push(time);
    }
  }
  return { seconds, warmup, cooldown, duration, caps, casts, castBonuses, eventTotals: runtime.totals, segments: [...segments.values()],
    uptime: 100 * activeTime / seconds, doubleUptime: 100 * doubleTime / seconds };
}

export function calculateTheaAverage(build, calculateState) {
  const cycle = build.ss14Inputs.theaCycle;
  const empty = { stacks: { Focus: 0, Agility: 0, Tenacity: 0 }, caps: { Focus: 4, Agility: 4, Tenacity: 4 }, boons: [] };
  const seed = bindTheaState(structuredClone(build), empty);
  const report = calculateState(seed);
  const blockers = [];
  if (!isThea(build) || !validTheaInputs(build.ss14Inputs)) blockers.push("자동 은총은 티아1의 유효한 전투 시간 설정이 필요합니다.");
  if (build.ss14Inputs.theaRulesReceipt !== theaRulePin()
    || Object.entries(seasonBlessingPins()).some(([url, hash]) => build.ss14Inputs.blessingRuleReceipts?.[url] !== hash)) blockers.push("자동 은총의 SS14 축복·변환 근거를 다시 연결하세요.");
  const mechanics = report.componentProjection.rows.flatMap(r => r.mechanics ?? []);
  const combat = theaCombatEnabled(build);
  for (const type of ["fire", "lightning"]) if (mechanics.some(m => m.kind === `thea-${type}-ailment`)
    && report.fullDps.rows.some(r => r.pools?.some(p => p.type === type && p.max > 0))) blockers.push("추가된 원소 대미지의 점화·마취 연결이 필요합니다.");
  if (!combat && mechanics.some(m => m.kind === "thea-affliction-gain") && report.fullDps.rows.some(r => r.values.dotDps > 0)) blockers.push("심화 증가량의 지속 대미지 시간표가 필요합니다.");
  if (!mechanics.some(m => m.kind === "thea-blessing-cycle")) blockers.push("티아1의 기본 특성과 단계를 선택하세요.");
  for (const row of report.componentProjection.rows) for (const blocker of row.blockers) blockers.push(`${row.name}: ${blocker.reason}`);
  blockers.push(...report.componentProjection.allocation.issues.map(r => r.reason));
  if (report.components.some(r => ["gear", "supports"].includes(r.category) && r.status !== "mapped"))
    blockers.push("미해석 장비·보조의 축복·쿨타임 변경 가능성이 있어 자동 은총을 확정할 수 없습니다.");
  const caps = { ...report.blessings.caps };
  blockers.push(...report.blessings.blockers);
  const events = mechanics.filter(m => m.kind === "thea-event");
  const samplesNeeded = events.some(e => e.chance !== undefined && e.chance < 1 && e.rate > 0) ? 128 : 1;
  if (events.reduce((n, e) => n + e.rate, 0) * (cycle.seconds + cycle.warmup) * samplesNeeded > 2000000) blockers.push("추가 발동 계산량이 한도를 넘었습니다. 측정·준비 시간을 줄여 계산하세요.");
  const projectileCast = events.some(e => e.castBonus === "projectile");
  const projectileRows = report.fullDps.rows.filter(r => SS14_CARDS_EN.records[r.id]?.tags?.includes("Projectile"));
  if (projectileCast && (projectileRows.length !== 1 || report.fullDps.rows.length !== 1)) blockers.push("투사체 소모 시전의 개별 적중 계산은 현재 투사체 주력 스킬 1개로 구성하세요.");
  if (projectileCast && report.fullDps.rows.some(r => r.values.burstExtraRate > 0 || r.values.repeatDps > 0 || r.values.heroDps > 0 || r.values.dotDps > 0)) blockers.push("투사체 소모 시전과 추가 발동의 공동 시간표가 필요합니다.");
  for (const m of mechanics) {
    if (m.kind === "thea-cap") caps[m.blessing] += m.bonus;
    if (m.kind === "thea-cap-intelligence") {
      const intelligence = report.character.values.intelligence;
      if (!Number.isFinite(intelligence)) blockers.push("집요한 축복 상한을 결정할 지혜 수치가 없습니다.");
      else if (intelligence >= m.threshold) caps.Focus += m.bonus;
    }
  }
  if (mechanics.some(m => m.kind === "thea-focus-cap-inheritance")) caps.Focus += Math.max(caps.Agility - 4, caps.Tenacity - 4);
  const cooldown = 15 / mechanics.filter(m => m.kind === "thea-boon-cooldown").reduce((n, m) => n * (1 + m.more / 100), 1);
  const duration = 10 * (1 + mechanics.filter(m => m.kind === "thea-duration").reduce((n, m) => n + m.increased, 0) / 100);
  const blessingDurations = Object.fromEntries(Object.keys(caps).map(key => [key, 10 * (1 + mechanics.filter(m => m.kind === "thea-blessing-duration" && m.blessing === key).reduce((n, m) => n + m.increased, 0) / 100)]));
  if (Object.values(caps).some(n => !Number.isInteger(n) || n < 1 || n > 100) || Object.values(blessingDurations).some(n => n <= 0)) blockers.push("축복 상한·지속 시간이 계산 범위를 벗어났습니다.");
  if (combat) return calculateTheaCombatAverage(build, report, calculateState, simulateTheaCycle,
    { ...cycle, caps, cooldown, duration, blessingDurations, events, maxBoons: mechanics.some(m => m.kind === "thea-boon-extra-stack") ? 2 : 1 }, blockers);
  // An observed elixir percentage is not its joint timeline with God's Boon.
  if (report.componentProjection.rows.some(r => r.elixirState)) blockers.push("자동 은총과 영약의 동시 활성 시간표는 아직 지원하지 않습니다.");
  let simulation = null; const cache = new Map(); const stateCache = new Map();
  const stateResult = state => {
    const key = JSON.stringify(state);
    if (!stateCache.has(key)) stateCache.set(key, calculateState(bindTheaState(structuredClone(build), state)).fullDps);
    return stateCache.get(key);
  };
  let projectileDps = 0;
  let sampleError = null;
  if (!blockers.length) {
    const samples = samplesNeeded;
    const runs = Array.from({ length: samples }, (_, i) => simulateTheaCycle({ ...cycle, caps, cooldown, duration, blessingDurations, events, seed: 127 + i * 104729,
      maxBoons: mechanics.some(m => m.kind === "thea-boon-extra-stack") ? 2 : 1 }));
    const combined = new Map();
    for (const run of runs) for (const segment of run.segments) {
      const key = JSON.stringify(segment.state); const part = combined.get(key) ?? { state: segment.state, seconds: 0 };
      part.seconds += segment.seconds / samples; combined.set(key, part);
    }
    simulation = { ...runs[0], segments: [...combined.values()], samples, estimated: samples > 1,
      uptime: runs.reduce((n, r) => n + r.uptime / samples, 0), doubleUptime: runs.reduce((n, r) => n + r.doubleUptime / samples, 0),
      castBonuses: undefined };
    for (const segment of simulation.segments) {
      const result = stateResult(segment.state);
      if (!result.supported) blockers.push(...result.blockers);
      cache.set(segment, result);
    }
    const sampleDps = runs.map(() => 0);
    for (const [runIndex, run] of runs.entries()) for (const bonus of run.castBonuses) {
      if (bonus.kind !== "projectile") { blockers.push("공격 스킬의 소모 시전 보너스 연결이 필요합니다."); continue; }
      const after = stateResult({ ...bonus.state, events: { ...bonus.state.events, projectileBonus: Number(bonus.consumed) } });
      if (!after.supported) { blockers.push(...after.blockers); continue; }
      // Applies to this successful consumption cast only, never to every hit
      // in the following four-second recent-consumption window.
      projectileDps += after.rows[0].values.averageHit / samples / cycle.seconds;
      sampleDps[runIndex] += after.rows[0].values.averageHit / cycle.seconds;
    }
    if (samples > 1 && projectileCast) sampleError = Math.sqrt(sampleDps.reduce((n, value) => n + (value - projectileDps) ** 2, 0) / (samples - 1) / samples);
  }
  const supported = !blockers.length && simulation !== null;
  if (!supported) blockers.push(...report.fullDps.blockers);
  const rows = report.fullDps.rows.map(row => ({ ...row, supported: supported && row.supported, values: { ...row.values } }));
  const damageKeys = ["manualDps", "spellBurstDps", "repeatDps", "heroDps", "dotDps", "minionDps", "dps"];
  for (const row of rows) for (const key of damageKeys) row.values[key] = supported ? simulation.segments.reduce((total, segment) => {
    const stateRow = cache.get(segment).rows.find(r => r.rowIndex === row.rowIndex && r.id === row.id);
    const value = stateRow?.values[key] ?? (key === "minionDps" ? 0 : NaN);
    return total + value * segment.seconds / cycle.seconds;
  }, 0) : null;
  if (supported && projectileCast) for (const key of ["manualDps", "dps"]) rows[0].values[key] = projectileDps;
  const dps = supported ? projectileCast ? projectileDps : simulation.segments.reduce((n, segment) => n + cache.get(segment).dps * segment.seconds / cycle.seconds, 0) : null;
  report.theaAverage = { supported, ...simulation, uptime: supported ? simulation.uptime : null, doubleUptime: supported ? simulation.doubleUptime : null,
    blockers: [...new Set(blockers)], dps, standardError: supported ? sampleError : null, receipt: theaRulePin() };
  // Keep the fixed-snapshot details separate; only the headline and damage
  // columns are integrated across time.
  report.fullDps = { ...report.fullDps, supported, rows, dps, blockers: [...new Set(blockers)], scope: "ss14-thea-cycle-full-dps",
    receipts: [...report.fullDps.receipts, SS14_THEA_RULES.pages.en],
    limitation: "축복·은총 없이 시작해 2초 간격의 기본 수급과 입력한 추가 발동을 합산합니다. 같은 시각에는 만료, 기본 수급, 소모, 추가 획득, 은총 순서로 처리합니다. 입력한 전투 조건과 발동 간격은 일정하게 유지합니다. 투사체 확률 소모는 입력한 시전 간격의 개별 적중을 반복 계산하고, 그 외에는 상태별 최종 DPS를 시간 평균합니다. 아래 속성·크리티컬 상세는 전투 시작 상태입니다." };
  report.fullDpsSupported = supported; report.summary.dps = dps;
  return report;
}
