import { findItemById } from './catalog.js';
import { boundBlessingStacks, blessingConditionValue } from './seasonBlessings.js';
import { seasonConditionalExpression, scaleSeasonConditionalEffects, seasonBooleanCondition } from './seasonEffectConditions.js';
import { MIND_INFUSION_TRIGGER_STATE } from './seasonGearEffects.js';
import { resolveMindInfusionMovement } from './seasonMindInfusion.js';
import { theaState } from './seasonTheaState.js';
import { fixedNumbedStacks } from './seasonTheaCombatInputs.js';

// Only instantaneous predicates with an exact meaning belong here. Cadence,
// capped stacks and per-stat scaling must stay in their own mechanic models.
const booleans = new Set(['while an Elixir Skill is active', 'if you have Blocked recently',
  'if you have used a Mobility Skill recently', 'while Barrier is active',
  'when there are no enemies nearby', 'while Reconjuring', 'while having Bond',
  'while moving', 'while channeling', 'while standing still', 'while having Fervor',
  'while Blur is active', 'when Pure Heart is active', 'when having Attack Aggression',
  'if you have dealt Cold Damage recently', 'if you have used a Channeled Skill recently',
  'if you have consumed more than 100 % Life recently', 'at Full Energy Shield', 'at Full Life']);
for (const predicate of ['at Max Bond stacks','to Blinded enemies','when Demolisher Charge is consumed','against Ignited enemies',
  'if you have defeated an enemy recently','if no enemies are defeated recently',"if enemies' Wilt stacks are less than 20",
  'when not at Full Mana','if more than 15000 Life has been consumed recently','for Numbed enemies','when taking Damage Over Time',
  'if you have cast an Elixir Skill recently','when having at least 100000 Evasion','when having at least 600 Intelligence',
  'when Movement Speed is not higher than 200 % of base','against Frostbitten enemies','for enemies within 12m',
  'if you have dealt a Critical Strike recently','when there are at least 1 enemies Nearby','when there are only 1 enemies nearby',
  'when an Elite is Nearby','against Cursed enemies','if you have used a Fire Skill recently','if you have used a Cold Skill recently',
  'while a Defensive Skill Effect is active','when Life is lower than 75 %','against Distant enemies','while Energy Shield is active',
  'against Legendary enemy units','to enemies with Elemental Ailments','When Armor is no lower than 50000','When Armor is no lower than 65000',
  'when no enemies are Nearby','while Energy Shield Charge is active','against Elites','if you have blocked a Spell recently',
  'if you have blocked an Attack recently','when Spell Block Chance is greater than 60 %','when Attack Block Chance is greater than 60 %',
  'against Numbed enemies','when Spell Burst is charging','when having at least 25000 Armor','if you have recently moved more than 10 m',
  'when the character is only affected by 1 Aura']) booleans.add(predicate);

function controlFor(condition) {
  if (condition?.type === 'equipped-slot-count' && condition.slot === 'ring'
    && condition.operator === 'equal' && Number.isInteger(condition.value))
    return { conditionGroup: `equipped-rings-${condition.value}`, kind: 'boolean', max: 1, rings: condition.value };
  if (condition?.type === 'resource-state' && condition.resource === 'energy_shield' && condition.state === 'not_full')
    return { conditionGroup: 'self-full-energy-shield', kind: 'boolean', max: 1, inverted: true };
  if (typeof condition !== 'string') return null;
  if (condition === MIND_INFUSION_TRIGGER_STATE)
    return {conditionGroup:condition,kind:'boolean',max:1,label:'이동으로 발동한 버프 적용 중',fixedScenarioOnly:true};
  if (condition==='to an enemy when they have at least 10 stack(s) of Numbed')
    return {conditionGroup:condition,kind:'boolean',max:1,label:'대상의 마취 10중첩 이상',numbedMinimum:10};
  if (condition==='against Frostbitten enemies')
    return {conditionGroup:condition,kind:'boolean',max:1,label:'대상이 빙결 상태'};
  const aliases={ 'when at Low Life':['self-low-life',false], 'when at Full Life':['at Full Life',false],
    'when Life is not full':['at Full Life',true], 'while Life is not full':['at Full Life',true],
    'when Blur is active':['while Blur is active',false], 'while Blur is not active':['while Blur is active',true],
    "when you don't have a Barrier":['while Barrier is active',true],
    'if no enemies are defeated recently':['if you have defeated an enemy recently',true],
    'when there are no enemies nearby':['nearby-enemy-present',true,'주변에 적 없음'],
    'when no enemies are Nearby':['nearby-enemy-present',true,'주변에 적 없음'],
    'when there are at least 1 enemies Nearby':['nearby-enemy-present',false,'주변에 적 한 명 이상'],
    'when there are only 1 enemies nearby':['nearby-enemy-alone',false,'주변에 적 한 명만 있음'] };
  if(aliases[condition]){
    const [conditionGroup,inverted,label]=aliases[condition];
    return {conditionGroup,inverted,kind:'boolean',max:1,...(label?{label}:{})};
  }
  const empty=condition.match(/^for each empty (Active|Passive) Skill Slot$/u);
  if(empty)return {conditionGroup:condition,kind:'count',max:empty[1]==='Active'?5:4,empty:empty[1].toLowerCase()};
  const level=condition.match(/^(?:per|for every) (\d+) level(?:s|\(s\))$/u);
  if(level&&+level[1]>0)return {conditionGroup:condition,kind:'count',max:100,levelStep:+level[1]};
  const group = condition === 'at Low Life' ? 'self-low-life'
    : ['when the Energy Shield is not low', 'at Low Energy Shield'].includes(condition) ? 'self-low-energy-shield'
    : condition === 'at Full Energy Shield' ? 'self-full-energy-shield' : condition;
  if (booleans.has(condition) || ['at Low Life', 'when the Energy Shield is not low', 'at Low Energy Shield'].includes(condition))
    return { conditionGroup: group, kind: 'boolean', max: 1, inverted: condition === 'when the Energy Shield is not low' };
  if (['while Dual Wielding', 'while holding a Shield', 'when holding a Shield', 'when Unarmed', 'when equipped with Boots'].includes(condition))
    return { conditionGroup: condition, kind: 'boolean', max: 1, equipment: condition };
  const blessing = condition.match(/^(?:per stack of|for every stack of) (Tenacity|Focus|Agility) Blessing(?: owned)?$/u);
  if (blessing) return { conditionGroup: `${blessing[1]}-blessing`, kind: 'count', max: 4 };
  if (/^while (Tenacity|Focus) Blessing is active$/u.test(condition))
    return { conditionGroup: condition, kind: 'boolean', max: 1 };
  return null;
}

// Talents and slabs can have the same equipment predicate as a gear affix.
// A theoretical combat state must still respect the equipped slots.
export function seasonEquippedPredicateValue(predicate, build) {
  const control = controlFor(predicate);
  return control?.equipment ? equipmentState(control, build) : undefined;
}

function equipmentState(control, build) {
  if(control.empty)return (build?.skills?.[control.empty]??[]).filter(s=>!s?.skillId).length;
  if(control.levelStep){const level=build?.hero?.level??build?.heroLevel;return Number.isInteger(level)&&level>=1&&level<=100?Math.floor(level/control.levelStep):undefined;}
  const slots = build?.gear?.slots ?? [];
  if (control.rings !== undefined) return Number([7, 8].filter(i => slots[i]?.itemId).length === control.rings);
  if (!control.equipment) return undefined;
  const weapon = i => findItemById(slots[i]?.itemId)?.tags?.includes('mainHand') === true;
  if (control.equipment === 'while Dual Wielding') return Number(weapon(0) && weapon(1));
  if (control.equipment === 'when Unarmed') return Number(!slots[0]?.itemId && !slots[1]?.itemId);
  if (control.equipment === 'when equipped with Boots') return Number(Boolean(slots[9]?.itemId));
  return Number(Boolean(slots[1]?.itemId) && !weapon(1) && findItemById(slots[1].itemId)?.tags?.includes('offHand'));
}

export function resolveSeasonGearConditions(effects, build, { path, sourcePageSha256 } = {}) {
  const resolved = [], conditions = [], inactive = [], blockers = [];
  const stacks = boundBlessingStacks(build);
  const combatState = build?.ss14Inputs?.theaEvents?.combatMode === 1 ? theaState(build) : undefined;
  const observedNumbed=fixedNumbedStacks(build);
  const elixirs=(build?.skills?.elixirs??[]).flatMap((slot,index)=>slot?.skillId?[index]:[]);
  const extensions=build?.ss14Inputs?.extensionInputs;
  const elixirValues=elixirs.map(index=>combatState?combatState.events?.[`elixir${index}`]:extensions?.[`elixir:${index}:active`]?.value);
  const elixirActive=elixirs.length&&(combatState||elixirs.some(index=>Number.isFinite(extensions?.[`elixir:${index}:uptime`]?.value)))
    && elixirValues.every(value=>value===0||value===1) ? Number(elixirValues.includes(1)) : undefined;
  for (const effect of effects) {
    if (!effect.condition) { resolved.push(effect); continue; }
    const candidate=seasonConditionalExpression(effect.sourceText??'');
    const conditionText=typeof effect.condition==='string'?effect.condition.trim().replace(/[.]$/u,'').toLowerCase():'';
    const sourceText=(effect.sourceText??'').trim().replace(/[.]$/u,'').toLowerCase();
    const model=candidate&&conditionText&&(candidate.predicate.toLowerCase()===conditionText
      || sourceText.endsWith(conditionText)&&conditionText.startsWith(candidate.predicate.toLowerCase()))?candidate:null;
    const control = controlFor(effect.condition) ?? (model ? {...model.control,conditionGroup:`snapshot:${path}:${effects.findIndex(e=>e.sourceText===effect.sourceText)}`} :
      typeof effect.condition==='string'&&seasonBooleanCondition(effect.condition) ? {...seasonBooleanCondition(effect.condition),conditionGroup:effect.condition}:null);
    if (!control) { resolved.push(effect); continue; }
    const sourceLineIndex = effects.findIndex(e => e.sourceText === effect.sourceText);
    const key = `${path}:${sourceLineIndex}`;
    const binding = build?.ss14Inputs?.componentConditions?.[key];
    const numbedMinimum=control.numbedMinimum ?? (['for numbed enemies','against numbed enemies'].includes(conditionText)?1:0);
    const timedNumbed = !!combatState && numbedMinimum>0;
    const boundNumbed = numbedMinimum>0 && (timedNumbed || observedNumbed!==undefined);
    const automatic = boundNumbed ? Number((timedNumbed ? combatState.events?.numbedStacks??0 : observedNumbed)>=numbedMinimum)
      : (control.conditionGroup==='while an Elixir Skill is active'?elixirActive:undefined)
        ?? equipmentState(control, build) ?? blessingConditionValue(control, stacks);
    const value = automatic ?? (binding?.sourcePageSha256 === sourcePageSha256 ? binding.value : undefined);
    const valid = Number.isInteger(value) && value >= 0 && value <= (control.kind === 'count' && automatic !== undefined ? 100 : control.max);
    if (!conditions.some(c => c.key === key)) conditions.push({ ...control, key, sourcePageSha256,
      sourceLineIndex, sourceText: effect.sourceText, value: valid ? value : '', automatic: automatic !== undefined,
      ...(numbedMinimum ? {timedNumbed,numbedMinimum,label:control.label??'대상이 마취 상태',
        ...(!timedNumbed&&boundNumbed ? {observedNumbed} : {})} : {}) });
    if (!valid) { blockers.push({ sourceText: effect.sourceText, reason: '장비 효과의 적용 조건을 선택하세요.' }); continue; }
    if (!value) { inactive.push({ sourceText: effect.sourceText, reason: boundNumbed ? '대상 마취 중첩이 옵션 조건을 충족하지 않습니다.' : '입력 조건 미충족' }); continue; }
    if (effect.condition === MIND_INFUSION_TRIGGER_STATE) {
      const movement=resolveMindInfusionMovement(effect,build,key,sourcePageSha256);
      conditions.push(...movement.conditions);
      resolved.push(...movement.effects);
      blockers.push(...movement.blockers);
      continue;
    }
    const { condition, conditionRequirements, ...plain } = effect;
    if (conditionRequirements?.length) { resolved.push(effect); continue; }
    if(model&&control.conditionGroup.startsWith('snapshot:')) {
      const scaled=scaleSeasonConditionalEffects([plain],model,value);
      if(!scaled){blockers.push({sourceText:effect.sourceText,reason:'조건 배율·상한 연산을 확인할 수 없습니다.'});continue;}
      resolved.push(...scaled);continue;
    }
    if (control.kind === 'count' && Number.isFinite(effect.value)) {
      const { roll, ...scaled } = plain;
      if (roll && (effect.value < roll.min || effect.value > roll.max)) {
        blockers.push({ sourceText: effect.sourceText, reason: '장비 선택 수치가 원문 범위를 벗어났습니다.' }); continue;
      }
      resolved.push({ ...scaled, value: effect.value * value,
        conditionResolution: { key, count: value, selectedValue: effect.value, sourcePageSha256, ...(roll ? { roll } : {}) } });
    } else resolved.push(plain);
  }
  return { effects: resolved, conditions, inactive, blockers };
}
