import { SS14_NETHER_REMAINING as data } from './data/ss14NetherRemaining.generated.js';
import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';

export const netherRule = slug => data.pages[`en/${slug}`];
export const netherSum = (effects,stat) => effects.filter(e=>e.stat===stat&&['add','add_percent'].includes(e.operation)).reduce((n,e)=>n+e.value,0);
export const netherMore = (effects,stat) => effects.filter(e=>e.stat===stat&&e.operation==='more').reduce((n,e)=>n*(1+e.value/100),1);
export const netherAfflictionEffect = effects => (1+netherSum(effects,'affliction_effect')/100)*netherMore(effects,'affliction_effect');

// All counts describe the selected enemy/state, not guessed uptime.
export function parseRemainingNether(t,{build,add,need,effects,blockers,mechanics,inactive}) {
  const own=(kind,values={})=>mechanics.push({kind,...values,sourceText:t.detail});
  const trigger=(kind,rate,multiplier=1)=>own('nether-core-trigger',{trigger:kind,rate,multiplier});
  switch(t.id) {
    case '90000114':
      if(need('target-no-shield','대상 에너지 쉴드가 없는 상태'))add('damage',8,'more');
      else blockers.push({reason:'HP·에너지 쉴드에 걸친 추가 HP 대미지 분배 계산은 미지원입니다.'});
      return true;
    case '90000202': case '90000203': {
      const slug=t.id==='90000202'?'Timid':'Entangled_Pain',p=netherRule(slug),text=p?.progression.rows.find(r=>Number(r[0])===1)?.at(-1);
      const amount=Number(text?.match(/\+(\d+) % additional (?:Hit Damage|Damage Over Time) taken/u)?.[1]);
      const active=need(`curse-${slug}`,`${data.pages[`ko/${slug}`].card.name} 적용 중 여부`);
      if(!Number.isFinite(amount))blockers.push({reason:'발동 저주의 SS14 1레벨 수치를 확인할 수 없습니다.'});
      if(active) {
        const bonus=need('curse-increase','저주 효과 증가율',1000);
        if(bonus!==null){add(slug==='Timid'?'enemy_hit_damage_taken':'enemy_dot_damage_taken',amount*(1+bonus/100),'more');
          effects.at(-1).buffIdentity=`nether-curse-${slug}`;effects.at(-1).receipt=p;}
        own('nether-curse',{slug,duration:5,cooldown:.2});
      } else if(active===0)inactive.push({reason:'발동 저주 미적용 상태'});
      return true;
    }
    case '92100001':
      own('nether-fearless-double',{baseChance:5});return true;
    case '92100005': {
      if(build.skills?.active?.some(s=>['Attack','Horizontal'].every(t=>SS14_CARDS_EN.records[s?.skillId]?.tags?.includes(t)))){
        const hit=need('return-hit','귀환 투사체의 대상 재적중률 (%)',100);
        if(hit!==null)own('nether-return',{chance:.14,hitChance:hit/100});
      }else inactive.push({reason:'선택한 공격 수평 사격 스킬이 없음'});
      return true;
    }
    case '92100008': {
      const stacks=need('omen-stacks','대상의 현재 오멘 중첩',10);
      if(stacks===1)add('enemy_all_damage_taken',2,'more');
      else if(stacks>1)blockers.push({reason:'오멘의 추가 받는 대미지가 여러 중첩에서 합산되는 규칙을 확인하지 못했습니다.'});
      return true;
    }
    case '92100009':add('affliction_effect',8,'more');add('affliction_per_second',48,'add');return true;
    case '92100010': {
      const rate=need('reap-pulse','작열 웨이브의 실제 발동 횟수 / 100초',50);
      if(rate)own('nether-scorching-pulse',{rate:rate/100,level:1,chance:.2,cooldown:2});
      else if(rate===0)inactive.push({reason:'수확에 의한 작열 웨이브 발동 없음'});
      return true;
    }
    case 'banish2': {
      const rate=need('steep-core','코어 슬래시 실제 발동 횟수 / 100초',1000);
      if(rate){trigger('steep',rate/100,1.7);own('nether-trigger-area',{increase:70});}
      return true;
    }
    case 'banish3': {
      const active=need('recent-attack-mobility','4초 이내 공격 이동 스킬 사용 여부');
      if(active)add('shadow_strike_damage',12);
      const rate=need('shadow-mobility','공격 이동 스킬 시전 횟수 / 100초',1000);
      if(rate)trigger('shadow',2*rate/100);
      return true;
    }
    case 'banish4': {
      add('spell_burst_hit_damage',28,'more');
      const rate=need('burst-core','충전 상한으로 코어 주술이 발동한 횟수 / 100초',1000);
      if(rate)trigger('burst',rate/100);
      return true;
    }
    case 'banish5': {
      const active=need('omen-nearby-elite','15m 이내 엘리트 대상 여부');
      if(active)own('nether-omen-floor',{stacks:4});
      const execute=need('omen-execute','지속 대미지로 대상이 처형 범위에 진입함');
      if(execute)blockers.push({reason:'추방 안내의 처형 20%·자원 소모 3%와 효과 원문의 10%·1%가 충돌합니다. 처형 포함 계산은 미검증입니다.'});
      else if(execute===0)inactive.push({reason:'처형이 발생하지 않는 대상 조건'});
      return true;
    }
    case 'banish7': {
      const stacks=need('projection-stacks','4초 이내 명왕 투사 중첩',5);
      if(stacks!==null){add('attack_horizontal_damage',18*stacks,'more');
        if(need('proximity','근거리 대상 여부'))add('damage_taken',6*stacks,'more');
        own('nether-horizontal-penetration',{active:stacks===5});}
      return true;
    }
    case 'banish8':add('elixir_effect',100);own('nether-provision');return true;
    case 'banish9': {
      const life=need('tangle-minion-life','가장 가까운 인조 소환체의 최대 HP (40 단위)',1000);
      if(life!==null)add('tangle_damage',life,'more');
      if(life>0)blockers.push({reason:'추방 속박의 소환체 부착·주기 발동·교체 시간표는 아직 미지원입니다.'});
      own('nether-tangle-target',{target:'minion'});return true;
    }
    default:return false;
  }
}

export const NETHER_CONSUMED_STATS=new Set(['affliction_per_second','enemy_hit_damage_taken','enemy_dot_damage_taken','enemy_all_damage_taken',
  'aura_effect','sealed_mana_compensation','warcry_effect','elixir_effect','spirit_magus_origin_effect',
  'base_ailment_damage_min','base_ailment_damage_max','ill_omen_efficiency','damaging_ailment_chance',
  'frostbite_effect','numbed_effect','numbed_additional_stacks','deterioration_damage',
  'slash_strike_ailment_damage','demolisher_ailment_damage','area_ailment_damage','projectile_ailment_damage']);
