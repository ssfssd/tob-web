export const ICE_LANCES_REBOUND_TEXT = "The supported skill's Projectiles can Jump off the ground\\nAfter Jumping off the ground, they can Jump toward enemies they have hit before\\nThe Shotgun Effect takes effect when dealing damage to the same enemy more than once";

// Ice Lances 225028, collision component 104998, repeatDmgDecPercent.
// The installed skill and SS14 card are independently checked in the timing audit.
const repeatHitPercent = 20;

// This is an observed single-projectile route, not a prediction of enemy geometry.
// Additional projectiles and unused jumps never imply additional target hits.
export function iceLancesShotgunPlan(mechanic, supports, maximumJumps) {
  const rebound = supports.flatMap(s => s.mechanics ?? []).find(m => m.kind === 'ice-lances-rebound');
  if (!rebound) return { hits: 1, multiplier: 1, weights: [1], blockers: [] };
  const blockers = [];
  const bounce = supports.flatMap(s => s.mechanics ?? []).find(m => m.kind === 'ice-lances-bounce');
  const firstJump = bounce?.jumpsBeforeHit ?? 0;
  const jumps = [firstJump, ...rebound.repeatJumps];
  if (!mechanic || mechanic.shotgunFalloff !== 1 - repeatHitPercent / 100) blockers.push('얼음 송곳 샷건 감쇠의 SS14 원문 연결 미확인');
  if (!Number.isInteger(maximumJumps) || rebound.hits > maximumJumps + 1
    || jumps.some((n, i) => !Number.isInteger(n) || n < 0 || n > maximumJumps || i > 0 && n <= jumps[i - 1]))
    blockers.push('반복 적중마다 누적 점프 횟수를 순서대로 선택하세요. 현재 구성의 최대 점프 수를 넘을 수 없습니다.');
  const repeatWeight = repeatHitPercent / 100;
  const weights = jumps.map((jump, i) => i === 0 ? 1 : repeatWeight * (1 + (bounce?.morePerJump ?? 0) / 100) ** (jump - firstJump));
  return { hits: rebound.hits, jumps, weights, repeatWeight, delaysMs: rebound.delaysMs, falloff: mechanic?.shotgunFalloff,
    multiplier: blockers.length ? null : weights.reduce((n, v) => n + v, 0), blockers,
    sourceUrl: rebound.sourceUrl, limitation: '단일 투사체의 관측한 동일 대상 적중 경로입니다. 지면을 거쳐 재적중하는 횟수와 누적 점프를 선택하며, 추가 투사체나 남은 점프를 자동 합산하지 않습니다.' };
}
