// Shared grammar for an instantaneous combat snapshot. This module never
// invents proc frequency, uptime, a missing number, or a target's hit count.
const number = '[+-]?\\d+(?:\\.\\d+)?';
const trim = s => s.trim().replace(/\s*[.]$/u, '').trim();
const unitNames = new Map([
  ['Strength','힘'],['Dexterity','민첩'],['Intelligence','지혜'],['Max Mana','최대 MP'],
  ['Max Life','최대 HP'],['Armor','아머'],['Evasion','회피'],['Fervor Rating','열의 수치'],
  ['Blur Rating','흐릿한 그림자 수치'],['Focus Pts consumed by the supported skill','보조 대상이 소모한 집중 포인트'],
  ['Focus Pts gained by the supported skill recently','보조 대상이 최근 획득한 집중 포인트'],
  ['Ailment on enemies','대상의 상태 이상 종류 수'],['type of Ailment on enemy','대상의 상태 이상 종류 수'],
  ['type of crowd control effect the enemy has','대상의 제어 효과 종류 수'],
  ['stack of Wilt inflicted','대상의 몰락 중첩'],['stack of Ignite an enemy has','대상의 점화 중첩'],
  ['stack of Agility Blessing','황홀한 축복 중첩'],['stack of Tenacity Blessing','강건한 축복 중첩'],
  ['stack of Focus Blessing','집요한 축복 중첩'],['Jump','적중 전 점프 횟수'],
  ['Barrage wave','사격 파동 수'],['remaining fork','남은 분열 수'],['buff stack','현재 버프 중첩'],
  ['stack of buff','현재 버프 중첩'],['stack of buffs','현재 버프 중첩'],
  ['enemy affected','영향받는 적 수'],['Reap dealt','수확 횟수'],
  ['nearby Sentry within 10m','10m 안의 센트리 수'],['empty Support Skill slot this skill has','비어 있는 보조 칸 수'],
  ['Life consumed recently','최근 소모한 HP'],['Projectile Quantity','투사체 수'],['Split Quantity','분열 수'],
  ['Command','통솔 수치'],['Affliction','심화 수치'],['Frostbite Rating','대상의 빙결 수치'],
  ['Terra Charge','대지 에너지 중첩'],['stack of Terra Charge','대지 에너지 중첩'],
  ['Minion','소환체 수'],['Minions','소환체 수'],['Spirit Magus','마령 수'],['Synthetic Troop','인공 소환체 수'],
  ['critical strike landed by Minions recently','최근 소환체 크리티컬 횟수'],
  ['Summon Skill cast recently','최근 소환 스킬 시전 횟수'],['stack of Deflection','편향 중첩'],
  ['inactivated Tangle','비활성 부착 수'],['activated Tangle','활성 부착 수'],
]);

export function seasonCountCondition(predicate) {
  const match=trim(predicate).match(/^(?:per|for every|for each|for each type of)\s+(?:(\d+(?:\.\d+)?)\s+)?(.+)$/iu);
  if(!match)return null;
  const unit=match[2].replace(/^(?:point(?:s)? of) /u,'').replace(/ owned$/u,'');
  const label=unitNames.get(unit);
  if(!label || !(Number(match[1]??1)>0))return null;
  const amount=Number(match[1]??1);
  return {kind:'count',min:0,max:1000000000,integer:true,amount,unit,label,
    // Values are raw quantities, not already divided stack counts.
    count: value=>Math.floor(value/amount)};
}

export function seasonBooleanCondition(predicate) {
  const value=trim(predicate);
  // Only a predicate with no nested modifier/action clause may be selected.
  // Event callbacks, intervals and resource-consumption effects need models.
  if(!/^(?:while|when|if|against|at|to|for|from)\b/iu.test(value)
    || /[,;:\n]|\b(?:per|every|each|triggers?|gains?|grants?|restores?|deals?|inflicts?|stacks? up|interval|duration)\b/iu.test(value)
    || /\b(?:for|lasts?)\s+[\d.]+\s*s\b/iu.test(value))return null;
  const allowed=/^(?:(?:while|when|if) (?:you |having |the |an? |there |not |more |no |only |Life |Energy Shield |Armor |Evasion |Movement Speed |Spell |Attack |Pure Heart |Blur |Barrier |standing |moving|channeling|Dual Wielding|holding |equipped |Unarmed|at |taking )|(?:at|when at|when not at) (?:Full|Low|Max) |against |to .* enemies$|for enemies within )/iu.test(value);
  return allowed||value==='from Cursed enemies'?{kind:'boolean',min:0,max:1,integer:true,label:'조건 충족 여부',predicate:value}:null;
}

export function seasonConditionalExpression(text) {
  let expression=trim(text), cap=null, maxStacks=null;
  const stacks=expression.match(/(?:,?\s*(?:stacking|[.]?\s*Stacks) up to )\+?(\d+) (?:times?|time\(s\)|stacks?|stack\(s\))$/iu);
  if(stacks){maxStacks=Number(stacks[1]);expression=expression.slice(0,stacks.index).trim();}
  const capped=expression.match(new RegExp(`,?\\s+up to (${number})\\s*(%)?(?: additional [A-Za-z ]+)?$`,'u'));
  if(capped){cap={value:Number(capped[1]),percent:!!capped[2]};expression=expression.slice(0,capped.index).trim();}
  const multiplies=/\(multiplies\)/u.test(expression);
  expression=expression.replace(/\s*\(multiplies\)/gu,'');
  let predicate, inner;
  const suffix=expression.match(/^(.*?)\s+((?:per|for every|for each)\s+.+)$/iu);
  const prefix=expression.match(/^((?:For every|For each) .+?),\s*(.+)$/u);
  if(suffix){inner=suffix[1];predicate=suffix[2];}
  else if(prefix){inner=prefix[2];predicate=prefix[1];}
  let control=predicate?seasonCountCondition(predicate):null;
  if(!control && !predicate && !cap && !maxStacks && !multiplies) {
    const tail=expression.match(/^(.*?)\s+((?:while|when|if|against|at|to|for|from)\s+.+)$/u);
    const head=expression.match(/^((?:While|When|If|At) .+?),\s*(.+)$/u);
    if(tail){inner=tail[1];predicate=tail[2];}else if(head){inner=head[2];predicate=head[1];}
    control=predicate?seasonBooleanCondition(predicate):null;
  }
  if(!control||!inner)return null;
  if(maxStacks!==null)control={...control,max:maxStacks*control.amount,maxStacks};
  if(cap&&control.kind!=='count')return null;
  return {expression:inner.trim(),predicate,control,cap,multiplies};
}

export function scaleSeasonConditionalEffects(effects,model,value) {
  if(!Number.isInteger(value)||value<0||value>model.control.max)return null;
  const count=model.control.kind==='count'?model.control.count(value):value;
  if(!effects.length||effects.some(e=>!Number.isFinite(e.value)||e.condition||e.conditionText||e.conditionRequirements||e.per||e.target
    || !['add','add_percent','more','more_percent'].includes(e.operation)))return null;
  if(model.multiplies&&effects.some(e=>!['more','more_percent'].includes(e.operation)))return null;
  const output=effects.map(effect=>{
    let scaled=model.multiplies?((1+effect.value/100)**count-1)*100:effect.value*count;
    if(model.cap) {
      if(model.cap.percent!==(effect.unit==='percent')||Math.sign(effect.value)!==Math.sign(model.cap.value))return null;
      scaled=Math.sign(scaled)*Math.min(Math.abs(scaled),Math.abs(model.cap.value));
    }
    if(!Number.isFinite(scaled))return null;
    const {roll,...plain}=effect;
    return {...plain,value:scaled,conditionResolution:{input:value,units:count,per:effect.value,
      ...(model.cap?{cap:model.cap.value}:{}),multiplies:model.multiplies}};
  });
  return output.every(Boolean)?output:null;
}
