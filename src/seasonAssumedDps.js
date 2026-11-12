import { calculateSeasonBuild } from './seasonBuild.js';
import { seasonDpsRulePins, seasonDpsSkillFieldKeys } from './seasonDps.js';
import { seasonMechanicPins } from './seasonMechanicInputs.js';
import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { seasonEquippedPredicateValue } from './seasonGearConditions.js';
import { describeUptime, uptimeFields } from './seasonUptimeDetails.js';

// Build an ephemeral comparison scenario. Never write assumptions to an editor
// document, its combat controls, storage, or its share code.
export function buildUptimeScenario(build, report) {
  const next = structuredClone(build);
  const input = next.ss14Inputs;
  const dps = input.dps ??= {version: 1, enemy: {}, skills: {}};
  // Neutral placeholders satisfy the shared schema. The scenario separately
  // bypasses mitigation multipliers, including penetration and fixed resistance.
  for (const key of ['armor','fire','cold','lightning','erosion']) dps.enemy[key] = 0;
  input.dpsRuleReceipts ??= seasonDpsRulePins();
  input.mechanicReceipts ??= seasonMechanicPins();
  const rows = report.coupledSkills.rows;
  const defaults = [];
  const skillUptimes = [];
  for (const {id,rowIndex,name} of rows) {
    const record = SS14_CARDS_EN.records[id];
    if (!record?.sourcePageSha256) continue;
    const binding = dps.skills[rowIndex] ??= {itemId:id, sourcePageSha256:record.sourcePageSha256};
    if (binding.itemId !== id || binding.sourcePageSha256 !== record.sourcePageSha256) continue;
    if (rows.length === 1 && binding.useShare === undefined) {
      binding.useShare = 100;
      defaults.push('단일 스킬 시전 배분 100%');
    }
    if (binding.hitChance === undefined) {
      binding.hitChance = 100;
      defaults.push('미입력 적중률 100%');
    }
    const entry = report.components.find(c => c.category === 'skills' && c.id === id)?.calculations?.find(c => c.rowIndex === rowIndex);
    const keys = seasonDpsSkillFieldKeys(entry,id,next);
    for (const field of Object.keys(uptimeFields)) {
      if (!keys.includes(field)) continue;
      skillUptimes.push({name, field, saved:binding[field]});
      binding[field] = 100;
    }
  }
  const groups = new Map();
  for (const row of report.componentProjection.rows) {
    for (const c of row.conditionControls ?? []) {
      if (c.kind !== 'boolean' || !c.sourcePageSha256) continue;
      const predicate = c.predicate ?? c.conditionGroup;
      const equipped = seasonEquippedPredicateValue(predicate,next);
      if (equipped !== undefined && !c.automatic) {
        (input.componentConditions ??= {})[c.key] = {value:equipped,sourcePageSha256:c.sourcePageSha256};
        continue;
      }
      const moving = predicate === 'while moving', standing = predicate === 'while standing still';
      const key = moving || standing ? 'movement-state' : predicate;
      const group = groups.get(key) ?? [];
      group.push(standing ? {...c,inverted:true} : c);
      groups.set(key, group);
    }
    for (const c of row.extensionControls ?? []) {
      if (!/^elixir:[01]:(active|uptime)$/u.test(c.key)) continue;
      (input.extensionInputs ??= {})[c.key] = {value:c.key.endsWith(':active') ? 1 : 100,
        sourcePageSha256:c.sourcePageSha256, sourceFingerprint:c.sourceFingerprint};
    }
    if (row.elixirState && input.theaEvents?.combatMode === 1) {
      // The simulator uses these windows only for active-state membership.
      // One uninterrupted window repeats with no gap; no casts are generated.
      const prefix = 'elixir'+row.elixirState.index;
      Object.assign(input.theaEvents,{[prefix+'Start']:0,[prefix+'Interval']:1800,[prefix+'Duration']:1800});
    }
    for (const key of row.heroControls ?? []) {
      if (key === 'signal' || input.theaCycle?.mode !== 'automatic' && ['boonActive','boonActiveSecond'].includes(key))
        (input.heroCombat ??= {})[key] = 1;
    }
  }
  for (const group of groups.values()) {
    // Honor equipment-derived predicates and the chosen side of an inverse
    // pair; never turn both "while X" and "while not X" on.
    const fixed = group.find(c => c.automatic && c.value !== '');
    const opposite = group.some(c => !!c.inverted !== !!group[0].inverted);
    const chosen = fixed ?? (opposite && group.find(c => c.value === 1));
    const state = chosen ? (chosen.inverted ? 1-chosen.value : chosen.value) : Number(group.some(c => !c.inverted));
    for (const c of group) if (!c.automatic) (input.componentConditions ??= {})[c.key] =
      {value:c.inverted ? 1-state : state, sourcePageSha256:c.sourcePageSha256};
  }
  return {next, defaults:[...new Set(defaults)], skillUptimes};
}

export function calculateEditorSeasonBuild(build, options = {}) {
  const report = calculateSeasonBuild(build, options);
  if (build.patchSnapshot?.season !== 'SS14' || !build.ss14Inputs || !report.coupledSkills.rows.length) return report;
  const {next, defaults, skillUptimes} = buildUptimeScenario(build,report);
  const scenario = calculateSeasonBuild(next, {...options, sourceBuild:options.sourceBuild ?? build, beforeDefense:true, includeAverage:false});
  const estimate = scenario.fullDps;
  report.assumedDps = {supported:estimate.supported, dps:estimate.dps, blockers:estimate.blockers, defaults,
    uptimeDetails:describeUptime(build,report,scenario,skillUptimes)};
  return report;
}
