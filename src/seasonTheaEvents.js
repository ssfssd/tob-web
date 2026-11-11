// Only scenario inputs live in the document. Timers, successful consumption,
// and temporary modifiers are calculated and cannot be imported as state.
export const THEA_EVENT_FIELDS = {
  combatMode: { label: "상태 이상·연속 공격·복합 발동을 시간 순서로 계산", max: 1, boolean: true },
  igniteEnabled: { label: "주력 스킬의 점화 계산 사용", max: 1, boolean: true },
  igniteBaseMin: { label: "주력 스킬의 기본 점화 최소 대미지", max: 1000000000 },
  igniteBaseMax: { label: "주력 스킬의 기본 점화 최대 대미지", max: 1000000000 },
  igniteChance: { label: "계시 보너스 전 점화 확률 (%)", max: 1000 },
  igniteIncreased: { label: "추가 점화 대미지 증가 합계 (%)", max: 100000 },
  igniteDuration: { label: "점화 지속 시간 (초)", max: 120 },
  igniteLimit: { label: "계시 보너스 전 점화 최대 중첩", max: 20, integer: true },
  afflictionRate: { label: "계시 보너스 전 초당 심화 증가", max: 1000 },
  dotTriggerRate: { label: "지속 대미지에서 발생하는 축복 판정 횟수 / 초", max: 100 },
  scorchResistance: { label: "스코치의 모든 저항 감소 (%)", max: 30, choices: [20, 30] },
  numbedEnabled: { label: "주력 스킬의 마취 계산 사용", max: 1, boolean: true },
  numbedChance: { label: "계시 보너스 전 마취 확률 (%)", max: 100 },
  enemyLifeShield: { label: "대상의 최대 HP와 보호막 합계", max: 1000000000000000 },
  numbedThreshold: { label: "마취 1중첩에 필요한 최대 HP·보호막 비율 (%)", max: 100 },
  numbedDuration: { label: "마취 지속 시간 (초)", max: 120 },
  numbedLimit: { label: "마취 최대 중첩", max: 100, integer: true },
  numbedEffect: { label: "계시 보너스 전 마취 효과 증가 (%)", max: 10000 },
  ...Object.fromEntries([0, 1].flatMap(i => [
    [`elixir${i}Interval`, { label: `영약 ${i + 1} 사용 간격 (초)`, max: 1800 }],
    [`elixir${i}Start`, { label: `영약 ${i + 1} 첫 사용 시점 (초)`, max: 1800 }],
    [`elixir${i}Duration`, { label: `영약 ${i + 1} 최종 지속 시간 (초)`, max: 1800 }],
  ])),
  hitRate: { label: "대상에게 대미지를 주는 횟수 / 초", max: 100 },
  projectileRate: { label: "투사체 스킬 시전 횟수 / 초", max: 30 },
  attackRate: { label: "공격 스킬 시전 횟수 / 초", max: 30 },
  mobilityRate: { label: "이동 스킬 사용 횟수 / 초", max: 10 },
  multistrikeRate: { label: "최대 연속 공격 도달 횟수 / 초", max: 30 },
  regainRate: { label: "반환 발동 횟수 / 초", max: 30 },
  manaRate: { label: "초당 소모하는 최대 MP 비율 (%)", max: 1000 },
  warcryRate: { label: "함성 시전 횟수 / 초", max: 10 },
  warcryTargets: { label: "최소 대상 보너스를 포함한 함성 대상 수", max: 100, integer: true },
  meleeRate: { label: "근접 스킬 시전 횟수 / 초", max: 30 },
  takenRate: { label: "피격 횟수 / 초", max: 100 },
  burstRate: { label: "매직 버스트 소모 횟수 / 초", max: 30 },
  tangleRate: { label: "얽힘 스킬 시전 횟수 / 초", max: 30 },
  frostbitten: { label: "대상이 빙결 상태", max: 1, boolean: true },
  ignited: { label: "대상이 점화 상태", max: 1, boolean: true },
  numbed: { label: "대상이 마취 상태", max: 1, boolean: true },
  distant: { label: "대상이 원거리 판정", max: 1, boolean: true },
  distanceBonus: { label: "이동 거리에 따른 투사체 대미지 증가 (%)", max: 60 },
  ailments: { label: "대상의 원소 이상 종류 수", max: 3, integer: true },
  twoHanded: { label: "양손 무기 사용", max: 1, boolean: true },
  enemyLife: { label: "대상이 최대 HP 또는 낮은 HP 상태", max: 1, boolean: true },
  lucky: { label: "대미지 행운 보유", max: 1, boolean: true },
  recentFire: { label: "최근 화염 대미지를 줌", max: 1, boolean: true },
  recentLightning: { label: "최근 번개 대미지를 줌", max: 1, boolean: true },
  recentCold: { label: "최근 냉기 대미지를 줌", max: 1, boolean: true },
  jumps: { label: "추가 점프 횟수", max: 100, integer: true },
};
export const validTheaEventValue = (key, value) => {
  const field = THEA_EVENT_FIELDS[key];
  return Boolean(field) && Number.isFinite(value) && value >= 0 && value <= field.max
    && (!(field.integer || field.boolean) || Number.isInteger(value)) && (!field.choices || field.choices.includes(value));
};
export function validTheaEvents(value) {
  return value === undefined || value && typeof value === "object" && !Array.isArray(value)
    && Object.entries(value).every(([k, v]) => validTheaEventValue(k, v));
}

// Periodic event scenarios have an explicit phase: first event after one
// interval. Probability is rolled per event, never rounded into fractional
// blessing stacks. A fixed seed makes the numerical estimate reproducible.
export function createTheaEventRuntime(events, seed = 1, blessingDurations = { Focus: 10, Agility: 10, Tenacity: 10 }) {
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const clocks = events.filter(e => e.rate > 0).sort((a, b) => Number(Boolean(b.consume)) - Number(Boolean(a.consume))).map(e => ({ ...e, next: 1 / e.rate, ready: 0 }));
  const consumed = []; const regained = []; const windows = {};
  const totals = { gained: { Focus: 0, Agility: 0, Tenacity: 0 }, consumed: { Focus: 0, Agility: 0, Tenacity: 0 }, failedConsumption: 0 };
  const stateAt = time => ({ recentAgility: consumed.filter(t => t > time - 4 + 1e-8).length,
    recentRegains: regained.filter(t => t > time - 8 + 1e-8).length,
    veryLucky: Number((windows.veryLucky ?? 0) > time + 1e-8),
    multistrikeSpeed: Number((windows.multistrikeSpeed ?? 0) > time + 1e-8),
    coldInfiltration: Number((windows.coldInfiltration ?? 0) > time + 1e-8) });
  const trigger = (e, time, stacks, caps, expires) => {
    if ((e.ready ?? 0) > time + 1e-8 || e.chance !== undefined && random() >= e.chance) return false;
    if (e.regain && regained.at(-1) !== time) regained.push(time);
    if (e.consume) {
      if (stacks[e.blessing] < e.consume) { totals.failedConsumption++; return false; }
      stacks[e.blessing] -= e.consume; totals.consumed[e.blessing] += e.consume;
      if (!stacks[e.blessing]) expires[e.blessing] = Infinity;
      if (e.blessing === "Agility") consumed.push(time);
    }
    if (e.gain || e.fill) {
      const gain = e.fill ? caps[e.blessing] - stacks[e.blessing] : Math.min(e.gain, caps[e.blessing] - stacks[e.blessing]);
      stacks[e.blessing] += gain; totals.gained[e.blessing] += gain; expires[e.blessing] = time + blessingDurations[e.blessing];
    }
    if (e.window) windows[e.window] = time + e.duration;
    e.ready = time + (e.cooldown ?? 0);
    return true;
  };
  return {
    totals,
    trigger,
    next(time) { return Math.min(Infinity, ...clocks.map(c => c.next), ...consumed.map(t => t + 4).filter(t => t > time + 1e-8),
      ...regained.map(t => t + 8).filter(t => t > time + 1e-8), ...Object.values(windows).filter(t => t > time + 1e-8)); },
    state: stateAt,
    apply(time, stacks, caps, expires) {
      const outcomes = [];
      for (const e of clocks) {
        if (e.next > time + 1e-8) continue;
        e.next += 1 / e.rate;
        const cast = consumed => { if (e.castBonus) outcomes.push({ kind: e.castBonus, consumed, state: { stacks: { ...stacks }, caps: { ...caps }, events: stateAt(time) } }); };
        cast(trigger(e, time, stacks, caps, expires));
      }
      // Bound memory to windows still capable of affecting the result.
      while (consumed.length && consumed[0] <= time - 4 + 1e-8) consumed.shift();
      while (regained.length && regained[0] <= time - 8 + 1e-8) regained.shift();
      return outcomes;
    },
  };
}
