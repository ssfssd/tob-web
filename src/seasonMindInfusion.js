import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { resolveSeasonSkillLevel } from './seasonSkillLevels.js';

const darkGate = 'skills-tlidb-com-cn-dark-gate';
const darkGateLine = 'Casts the skill and teleports all Minions to the character';
const darkGateBonus = /^\+?([\d.]+) % additional Minion Damage while the skill lasts$/u;
const mindInfusion = 'gear-tlidb-com-cn-mind-infusion';
const triggerLevelSuffix = (min,max) => `:dark-gate-level:${min}-${max}`;

function resolveDarkGate(level) {
  const card = SS14_CARDS_EN.records[darkGate];
  if (card?.season !== 'SS14' || card.sourceRecordKey !== 'Dark_Gate') return null;
  const item = {id:darkGate,categoryId:'skills',tlidbText:{en:{...card,sourcePageVersion:'SS14'}}};
  const resolved = resolveSeasonSkillLevel(item,level);
  if (resolved.blockers.length || !resolved.receipt) return null;
  const lines = resolved.item.tlidbText.en.detail.split('\nDetails\n').at(-1).split('\n');
  const match = darkGateBonus.exec(lines[3] ?? '');
  if (lines.length!==5 || lines[0]!==darkGateLine || lines[1]!=='Casts the skill and gains Euphoria:'
    || !/^Gains [\d.]+ Command$/u.test(lines[2]) || !match || !Number.isFinite(Number(match[1]))
    || lines[4]!=='+20 % Minion Movement Speed while the skill lasts') return null;
  return {value:Number(match[1]),receipt:resolved.receipt,sourceText:lines[3]};
}

export function hasObservedDarkGate(build) {
  const gear = build?.ss14Inputs?.gear?.[9];
  if (gear?.itemId !== mindInfusion || build.gear?.slots?.[9]?.itemId!==mindInfusion || gear.logGear) return false;
  const [min,max] = gear.corrosion?.selected?.includes('51441861') ? [15,30] : [10,20];
  const suffix = triggerLevelSuffix(min,max);
  const states = build.ss14Inputs.componentConditions ?? {};
  return Object.entries(states).some(([key,binding])=>{
    if (!key.startsWith(`gear.slots.9.${mindInfusion}.conditions:`) || !key.endsWith(suffix)
      || binding.sourcePageSha256!==gear.sourcePageSha256 || binding.value<min || binding.value>max) return false;
    const owner=states[key.slice(0,-suffix.length)];
    return owner?.sourcePageSha256===gear.sourcePageSha256 && owner.value===1;
  });
}

export function resolveMindInfusionMovement(effect, build, key, sourcePageSha256) {
  const conditions=[], effects=[], blockers=[];
  const lines=effect.sourceText.split('\n');
  const range=lines[0].match(/^Triggers Lv\. \((\d+)–(\d+)\) Dark Gate when moving\. Cooldown: (?:5|6) s$/u);
  if (!range) return {conditions,effects,blockers:[{sourceText:effect.sourceText,reason:'어둠의 문 발동 레벨 범위를 확인하세요.'}]};
  const add = (suffix, label, kind, options, sourceText) => {
    const conditionKey=key+suffix;
    const binding=build?.ss14Inputs?.componentConditions?.[conditionKey];
    const value=binding?.sourcePageSha256===sourcePageSha256 ? binding.value : '';
    conditions.push({key:conditionKey,conditionGroup:conditionKey,label,kind,...options,value,sourceText,sourcePageSha256,fixedScenarioOnly:true});
    return value;
  };
  const issue=(reason,sourceText=lines[0])=>blockers.push({reason,sourceText});
  const min=Number(range[1]), max=Number(range[2]);
  const level=add(triggerLevelSuffix(min,max),`어둠의 문 발동 레벨 (${min}–${max}, 미적용 0)`,'count',{min,max,allowZero:true},lines[0]);
  if (level!==0) {
    if (!Number.isInteger(level) || level<min || level>max) issue('어둠의 문 발동 레벨을 입력하세요.');
    else {
      const bonus=resolveDarkGate(level);
      if (!bonus) issue('어둠의 문 SS14 레벨별 효과 원문 미확인');
      else effects.push({stat:'minion_damage',operation:'more',unit:'percent',...bonus});
    }
  }
  const slots=[...(build?.skills?.active??[]),...(build?.skills?.passive??[])];
  if (slots.some(slot=>SS14_CARDS_EN.records[slot?.skillId]?.tags?.includes('Spirit Magus'))) {
    const bloom=add(':dazzling-bloom-active','눈부신 꽃 적용 중','boolean',{max:1},lines[1]);
    if (bloom==='') issue('눈부신 꽃 적용 여부를 선택하세요.',lines[1]);
    if (bloom===1) issue('눈부신 꽃의 대상 희귀도별 SS14 대미지 배율 미확인',lines[1]);
  }
  return {conditions,effects,blockers};
}
