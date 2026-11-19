import { calculateSeasonBuild } from './seasonBuild.js';
import { seasonDpsRulePins, seasonDpsSkillFieldKeys } from './seasonDps.js';
import { seasonMechanicPins } from './seasonMechanicInputs.js';
import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { seasonEquippedPredicateValue } from './seasonGearConditions.js';
import { exclusiveResourceStates, nearbyEnemyConditionValue, nearbyEnemyGroups, nearbyEnemyState } from './seasonEffectConditions.js';
import { describeUptime, uptimeFields } from './seasonUptimeDetails.js';
import { isPersistentModuleAction, seasonModuleProfile } from './seasonModules.js';
import { seasonSkillCalculationLevel } from './seasonSkillLevels.js';
import { excludedSeasonHitRoutes } from './seasonEffectSources.js';

export const ASSUMED_DPS_IGNORED_DEFENSE_FIELDS = ['armor','fire','cold','lightning','erosion'];

// Build an ephemeral comparison scenario. Never write assumptions to an editor
// document, its combat controls, storage, or its share code.
export function buildUptimeScenario(build, report) {
  const next = structuredClone(build);
  const input = next.ss14Inputs;
  // A measured recovery rate belongs to the observed encounter, not the
  // independent 100% uptime scenario.
  if(input.character)delete input.character.observedManaRecovery;
  const dps = input.dps ??= {version: 1, enemy: {}, skills: {}};
  // Neutral placeholders satisfy the shared schema. The scenario separately
  // bypasses mitigation multipliers, including penetration and fixed resistance.
  for (const key of ASSUMED_DPS_IGNORED_DEFENSE_FIELDS) dps.enemy[key] = 0;
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
      const peers = field === 'dotUptime' ? rows.filter(other => other.id === id && other.rowIndex !== rowIndex) : [];
      const excludedDuplicate = peers.length > 0 && binding[field] === 0;
      const exclusive = binding[field] > 0 && peers.some(other => build.ss14Inputs.dps?.skills[other.rowIndex]?.dotUptime > 0);
      const assumed = excludedDuplicate || exclusive ? binding[field] : 100;
      skillUptimes.push({name, rowIndex, field, saved:binding[field], assumed, exclusive, duplicate:peers.length>0});
      binding[field] = assumed;
    }
    if (keys.includes('dotUptime') && binding.dotUptime === 100 && keys.includes('reapingOverlap')) {
      skillUptimes.push({name,rowIndex,field:'reapingOverlap',saved:binding.reapingOverlap,assumed:100});
      binding.reapingOverlap = 100;
    }
    for (const [index,action] of (seasonModuleProfile(id)?.actions ?? []).entries()) {
      if (!isPersistentModuleAction(action)) continue;
      const field = `moduleRate${index}`;
      skillUptimes.push({name,rowIndex,actionIndex:index,field:'moduleDotUptime',saved:binding[field] === undefined ? undefined : binding[field]*100,assumed:100});
      binding[field] = 1;
    }
  }
  const groups = new Map();
  for (const row of report.componentProjection.rows) {
    for (const c of row.conditionControls ?? []) {
      if (c.kind !== 'boolean' || !c.sourcePageSha256 || c.fixedScenarioOnly) continue;
      // Aura activation changes which skills reserve mana. It is a loadout choice.
      if (row.isAura && c.conditionGroup === `nether-buff-${row.buffSkill}`) continue;
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
  const resourceStates = new Map();
  for (const [pairIndex,[low,full]] of exclusiveResourceStates.entries()) {
    if (!groups.has(low) || !groups.has(full)) continue;
    const controls = [low,full].flatMap(key => groups.get(key).map(c => ({ ...c, state: key })));
    const effectValue = (c, state) => Number((c.state === state) !== !!c.inverted);
    const score = state => controls.reduce((n,c) => n + (c.value === 0 || c.value === 1
      ? Number(effectValue(c,state) === c.value) * (c.automatic ? 4 : 1) : 0), 0);
    const [chosen] = [full,low,null].map(state => ({state, score:score(state)})).sort((a,b) => b.score-a.score);
    for (const key of [low,full]) resourceStates.set(key,Number(key===chosen.state));
    const subject=pairIndex===0?'HP':'보호막';
    defaults.push(`${subject} ${chosen.state===full?'가득 참':chosen.state===low?'낮음':'보통'}`);
  }
  const nearbyControls=nearbyEnemyGroups.flatMap(key=>groups.get(key)??[]);
  if(nearbyControls.length){
    const score = count => nearbyControls.filter(c=>c.value===nearbyEnemyConditionValue(c,count)).length;
    const enabled = count => new Set(nearbyControls.filter(c=>nearbyEnemyConditionValue(c,count)).map(c=>`${c.conditionGroup}:${!!c.inverted}`)).size;
    const count=[1,0,2].sort((a,b)=>score(b)-score(a)||enabled(b)-enabled(a))[0];
    for(const key of nearbyEnemyGroups)resourceStates.set(key,nearbyEnemyState(key,count));
    defaults.push(`주변 적 ${count===2?'2명 이상':`${count}명`}`);
  }
  for (const [key,group] of groups) {
    // Honor equipment-derived predicates and the chosen side of an inverse
    // pair; never turn both "while X" and "while not X" on.
    const fixed = group.find(c => c.automatic && c.value !== '');
    const opposite = group.some(c => !!c.inverted !== !!group[0].inverted);
    const chosen = fixed ?? (opposite && group.find(c => c.value === 1));
    const state = resourceStates.get(key) ?? (chosen ? (chosen.inverted ? 1-chosen.value : chosen.value) : Number(group.some(c => !c.inverted)));
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
  const {mana, reservedManaPercent, sealedManaCompensation, unreservedMana} = scenario.character.values;
  report.assumedDps = {supported:estimate.supported, dps:estimate.dps, blockers:estimate.blockers, scope:estimate.scope, defaults,
    dotWindowIssues:estimate.dotWindowIssues, dotUptimeOverflow:estimate.dotUptimeOverflow,
    dotExclusiveUnconfirmed:estimate.dotExclusiveUnconfirmed, reapingOverlapOverflow:estimate.reapingOverlapOverflow,
    manaReservation:{mana,reservedManaPercent,sealedManaCompensation,unreservedMana},
    manaReservations:scenario.character.manaReservations,
    manualResources:estimate.manualResources,
    measuredResources:scenario.theaAverage?.supported===true,
    elixirUptime:scenario.elixirUptime,
    fixedNumbed:scenario.componentProjection.fixedNumbed,
    numbed:scenario.theaAverage?.numbedEffectAverage == null ? null : {
      uptime:scenario.theaAverage.numbedUptime, stacks:scenario.theaAverage.numbedAverage,
      effect:scenario.theaAverage.numbedEffectAverage, duration:scenario.theaAverage.playerNumbedDuration,
      playerHits:scenario.theaAverage.playerNumbedHits,
    },
    rows:estimate.rows.map(({id,rowIndex,supported,values,conversionTrace,manaPerUse,lifePerUse,manualManaPerSecond,manualLifePerSecond,reaping,fissure,dotBreakdown,pools,takenMultiplier,weaponHands})=>{
      const direct=scenario.coupledSkills.rows.find(row=>row.rowIndex===rowIndex);
      const offense=scenario.offense.rows.find(row=>row.rowIndex===rowIndex);
      return {id,rowIndex,supported,values,weaponHands,useRate:direct?.offenseBasis?.rate,
        conversionTrace:conversionTrace??direct?.trace,
        detail:{damageStages:direct?.damageStages, hasHitPools:direct?.offenseBasis?.pools?.some(p=>p.min||p.max),
          critical:offense?.values, pools, takenMultiplier, skillLevel:seasonSkillCalculationLevel(scenario,rowIndex),
          excludedHitRoutes:excludedSeasonHitRoutes(direct)},
        manaPerUse,lifePerUse,manualManaPerSecond,manualLifePerSecond,...(reaping&&{reaping}),...(fissure&&{fissure}),...(dotBreakdown&&!scenario.theaAverage&&{dotBreakdown})};
    }),
    uptimeDetails:describeUptime(build,report,scenario,skillUptimes)};
  return report;
}
