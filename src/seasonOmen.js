// Only an independently evidenced first maximum-stack activation is admitted.
// The shipped values establish thresholds and damage, not the server-side
// reset policy. Crossing a second threshold is fail-closed rather than guessed.
export function createOmenAccumulator() {
  let progress = 0, triggered = false;
  return {
    add(damage, condition) {
      if (!condition?.curse || !(damage > 0) || !(condition.maxLife > 0)) return { damage: 0, unsupported: false };
      const threshold = condition.maxLife * (condition.elite ? .05 : .08) * (10-(condition.minimumStacks??0));
      const requiredDamage = (threshold - progress) / (1 + condition.efficiency / 100);
      progress += damage * (1 + condition.efficiency / 100);
      if (progress < threshold) return { damage: 0, unsupported: false };
      if (triggered) return { damage: 0, unsupported: true };
      progress -= threshold; triggered = true;
      return { damage: condition.elite ? condition.maxLife * .2 : condition.remainingLife, requiredDamage, unsupported: progress >= threshold };
    },
  };
}
