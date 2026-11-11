import {SS14_CARDS_EN} from './data/ss14Cards.en.generated.js';
import {SS14_CARDS} from './data/ss14Cards.generated.js';
import {SS14_DESTINY_RULES} from './data/ss14DestinyRules.generated.js';
import {resolveSeasonSkillLevel} from './seasonSkillLevels.js';
import {inspectSeasonSupport,checkSeasonSupportHost} from './seasonSupport.js';

export const SEASON_CURSE_STATS=new Set(['curse_effect','max_curses',
  'enemy_hit_damage_taken','enemy_dot_damage_taken','enemy_all_damage_taken',
  ...['physical','fire','cold','lightning','erosion'].map(t=>`enemy_${t}_damage_taken`)]);
const fail=(row,reason)=>{row.blockers.push({reason});row.status='partial';};
// This is the current target's selected curse state, not an uptime estimate.
export function applySeasonCurses(rows,build) {
  const slots=[...(build.skills?.active??[]),...(build.skills?.passive??[])];
  const global=rows.flatMap(r=>r.effects),rules=SS14_DESTINY_RULES.curse;
  const bonus=global.filter(e=>e.stat==='curse_effect');
  const amount=bonus.filter(e=>e.operation==='add_percent').reduce((n,e)=>n+e.value,0);
  const more=bonus.filter(e=>e.operation==='more').reduce((n,e)=>n*(1+e.value/100),1);
  for(const [index,slot] of slots.entries()) {
    const card=SS14_CARDS_EN.records[slot?.skillId];if(!card?.tags?.includes('Curse'))continue;
    const ko=SS14_CARDS.records[slot.skillId],path=`skills.curse.${index}`;
    const row={path,itemId:slot.skillId,group:'skills',buffSkill:index,name:ko?.name??'한국어 원문 미제공',
      detail:ko?.koreanTextVerified?ko.detail:'한국어 원문 미제공',receipt:card,effects:[],blockers:[],conditionControls:[],inactive:[],mechanics:[],status:'mapped'};
    rows.push(row);
    const pin=build.ss14Inputs?.skills?.[index];
    if(pin?.itemId!==slot.skillId||pin.sourcePageSha256!==card.sourcePageSha256){fail(row,'선택 저주의 SS14 원문 연결을 확인하세요.');continue;}
    if(!rules?.body.includes('Negative effect value = Base value x (1 + all non-additional bonus percentages)')){fail(row,'저주 효과 합산 규칙의 근거를 확인할 수 없습니다.');continue;}
    const key=`${path}:active`,binding=build.ss14Inputs?.componentConditions?.[key];
    const state=binding?.sourcePageSha256===card.sourcePageSha256?binding.value:undefined;
    row.conditionControls.push({key,conditionGroup:key,kind:'boolean',max:1,label:`${row.name} 대상에게 적용 중`,
      sourcePageSha256:card.sourcePageSha256,sourceText:card.detail,value:[0,1].includes(state)?state:''});
    if(![0,1].includes(state)){fail(row,'대상에게 저주가 적용되어 있는지 선택하세요.');continue;}
    const resolved=resolveSeasonSkillLevel({id:slot.skillId,categoryId:'skills',tlidbText:{en:{...card,sourcePageVersion:'SS14',sourceFieldStatus:{detail:'exact'}}}},slot.level??20);
    if(resolved.blockers.length){fail(row,'선택한 저주 레벨의 SS14 수치 미확보');continue;}
    let supportIncrease=0,supportMore=1;
    for(const [supportIndex,support] of (slot.supports??[]).entries()) {
      if(!support?.supportId)continue;
      const linked=inspectSeasonSupport(support,{rowIndex:index,supportIndex,isTarget:true,build,binding:build.ss14Inputs?.supports?.[`${index}:${supportIndex}`]});
      for(const reason of linked.blockers)fail(row,reason);
      if(checkSeasonSupportHost(support.supportId,card,{values:{}},index)!==true)fail(row,'저주와 보조의 호환 조건을 확인하세요.');
      for(const effect of linked.effects) {
        if(effect.stat==='supported-skill-curse-effect'&&effect.operation==='add')supportIncrease+=effect.value;
        else if(effect.stat==='supported-skill-curse-effect'&&effect.operation==='more')supportMore*=1+effect.value/100;
        else if(!['mana-cost-multiplier','supported-skill-area','supported-skill-duration','supported-skill-cooldown-recovery-speed'].includes(effect.stat))
          fail(row,`저주에 연결되지 않은 보조 효과: ${effect.sourceText}`);
      }
    }
    if(state===0){row.inactive.push({reason:'대상에게 적용하지 않은 저주'});continue;}
    if(bonus.some(e=>!['add_percent','more'].includes(e.operation)||!Number.isFinite(e.value)||e.condition||e.per))fail(row,'저주 효과 증가·추가 배율을 확인하세요.');
    const multiplier=(1+(amount+supportIncrease)/100)*more*supportMore;
    if(multiplier<0||!Number.isFinite(multiplier)){fail(row,'저주 효과 배율 범위를 확인하세요.');continue;}
    const text=resolved.item.tlidbText.en.detail.split('\nDetails\n').at(-1);
    for(const raw of text.split('\n').filter(Boolean)) {
      const line=raw.trim().replace(/[.]$/u,'');
      if(/^Casts (?:the|this) skill and Curses enemies within the target area$/u.test(line)||/^Lasts(?: for)? [\d.]+ s$/u.test(line))continue;
      const match=line.match(/^(?:Cursed enemies )?\+([\d.]+) % additional (Physical|Fire|Cold|Lightning|Erosion|Hit Damage|Damage Over Time)(?: Damage)? taken(?: by Cursed enemies)?$/u);
      if(match) {
        const type={'Hit Damage':'hit','Damage Over Time':'dot'}[match[2]]??match[2].toLowerCase();
        row.effects.push({stat:`enemy_${type}_damage_taken`,operation:'more',unit:'percent',value:Number(match[1])*multiplier,
          sourceText:raw,path,group:row.group,receipt:card,buffIdentity:`curse:${card.sourceRecordKey}`,conditionResolution:{key,state},ruleReceipt:rules});
      } else if(/^\+[\d.]+ % chance to (?:Wilt when you are hit by a Cursed enemy|be Ignited when you are hit by a Cursed enemy|be Traumatized when hit by a Cursed enemy)$/u.test(line)) {
        row.inactive.push({sourceText:raw,reason:'저주받은 적에게 피격될 때 플레이어에게 적용되는 상태 이상. 현재 대상의 받는 대미지에는 합산하지 않음.'});
      } else fail(row,`저주 효과 해석 미완료: ${raw}`);
    }
    row.mechanics.push({kind:'selected-curse',slug:card.sourceRecordKey,ruleReceipt:rules});
  }
  const active=rows.filter(r=>r.mechanics?.some(m=>['selected-curse','nether-curse'].includes(m.kind)));
  const identities=active.flatMap(r=>r.mechanics.filter(m=>['selected-curse','nether-curse'].includes(m.kind)).map(m=>m.slug));
  const limits=global.filter(e=>e.stat==='max_curses');
  const fixed=[...new Set(limits.filter(e=>e.operation==='set').map(e=>e.value))];
  const max=(fixed[0]??1)+limits.filter(e=>e.operation==='add').reduce((n,e)=>n+e.value,0);
  if(fixed.length>1||limits.some(e=>!['add','set'].includes(e.operation)||!Number.isInteger(e.value))||max<0)
    for(const row of active)fail(row,'동시 저주 상한의 수치·연산이 충돌합니다.');
  if(new Set(identities).size>max)for(const row of active)fail(row,`현재 동시 저주 상한 ${max}개를 초과했습니다. 실제 적용 중인 저주만 선택하세요.`);
  if(identities.length!==new Set(identities).size)for(const row of active)fail(row,'같은 저주가 여러 출처에서 활성화되었습니다. 실제 적용할 한 출처를 선택하세요.');
}
