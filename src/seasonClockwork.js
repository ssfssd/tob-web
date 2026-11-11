// The hero's conversion is derived from selected effects, never a final-DPS input.
export function projectSeasonClockwork(projection, components) {
  const rows = projection.rows.filter(r => r.mechanics?.some(m => m.kind === 'clockwork-conversion'));
  if (!rows.length) return;
  const effects = [...projection.effects, ...components.filter(c => c.category === 'gear').flatMap(c => c.calculations ?? []).flatMap(c => c.rawEffects ?? [])];
  for (const row of rows) {
    const rule = row.mechanics.find(m => m.kind === 'clockwork-conversion');
    const bonuses = effects.filter(e => ['cooldown_recovery_speed', 'skill_effect_duration', 'skill_duration'].includes(e.stat));
    if (bonuses.some(e => e.operation !== 'add_percent' || !Number.isFinite(e.value) || e.condition || e.per || e.target)) {
      projection.globalBlockers.push('클락워크 코어에 전환되는 쿨타임·지속시간 보정의 연산을 확인해야 합니다.'); continue;
    }
    const value = Math.min(rule.cap, bonuses.reduce((sum, e) => sum + e.value, 0) * rule.ratio / 100);
    const effect = { stat: 'clockwork_damage', operation: 'more', value, path: row.path, group: 'hero', receipt: row.receipt, sourceText: row.detail };
    row.effects.push(effect); projection.effects.push(effect);
  }
}
