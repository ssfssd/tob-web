import { SS14_CARDS_EN } from './data/ss14Cards.en.generated.js';
import { SS14_CARDS } from './data/ss14Cards.generated.js';
import { resolveSeasonSkillLevel } from './seasonSkillLevels.js';
import { netherSum, netherRule } from './seasonNetherRemaining.js';
import { theaCombatEnabled } from './seasonTheaCombatInputs.js';
import { inspectSeasonSupport, checkSeasonSupportHost } from './seasonSupport.js';

export function netherCondition(row,build,key,label,max=1) {
  const conditionKey=`${row.path}:nether-${key}`,sourcePageSha256=row.receipt.sourcePageSha256;
  const binding=build.ss14Inputs?.componentConditions?.[conditionKey];
  const value=binding?.sourcePageSha256===sourcePageSha256?binding.value:undefined;
  const valid=Number.isInteger(value)&&value>=0&&value<=max;
  row.conditionControls.push({key:conditionKey,label,expression:label,sourceText:row.detail,sourcePageSha256,
    kind:max===1?'boolean':'count',max,conditionGroup:`nether-${key}`,value:valid?value:''});
  if(!valid){row.blockers.push({reason:`${label}: 값을 선택하세요.`});row.status='partial';}
  return valid?value:null;
}
const push=(row,stat,value,operation='add_percent',sourceText=row.detail)=>row.effects.push({stat,value,operation,
  unit:operation==='add'?'flat':'percent',path:row.path,group:row.group,receipt:row.receipt,sourceText});
const fail=(row,reason)=>{row.blockers.push({reason});row.status='partial';};
const resolveBuff=(slot,card)=>resolveSeasonSkillLevel({id:slot.skillId,categoryId:'skills',tlidbText:{en:{...card,sourcePageVersion:'SS14',sourceFieldStatus:{detail:'exact'}}}},slot.level??20);

export function applyNetherModifiers(rows,build,parseLines) {
  const originals=rows.flatMap(r=>r.effects),sources=stat=>rows.filter(r=>r.effects.some(e=>e.stat===stat));
  const amount=stat=>netherSum(originals,stat);
  const hasNether=rows.some(r=>r.netherTalentId||r.itemId?.startsWith('nether_'));
  const slots=[...(build.skills?.active??[]),...(build.skills?.passive??[])];
  const fear=rows.find(r=>r.mechanics?.some(m=>m.kind==='nether-fearless-double'));
  // Project actual selected SS14 buffs, retaining unresolved clauses on the row.
  for(const [index,slot] of slots.entries()) {
    const card=SS14_CARDS_EN.records[slot?.skillId];
    if(!card||!card.tags?.some(t=>['Aura','Warcry'].includes(t)))continue;
    const aura=card.tags.includes('Aura'),stat=aura?'aura_effect':'warcry_effect';
    const resolved=resolveBuff(slot,card);
    const row={path:`skills.netherBuff.${index}`,itemId:slot.skillId,group:'divinity',buffSkill:index,
      name:SS14_CARDS.records[slot.skillId]?.name??'한국어 원문 미제공',detail:SS14_CARDS.records[slot.skillId]?.koreanTextVerified?SS14_CARDS.records[slot.skillId].detail:'한국어 원문 미제공',receipt:card,
      effects:[],blockers:[...resolved.blockers],conditionControls:[],inactive:[],mechanics:[],status:resolved.blockers.length?'partial':'mapped'};
    rows.push(row);if(row.blockers.length)continue;
    const binding=build.ss14Inputs?.skills?.[index];
    if(binding?.itemId!==slot.skillId||binding.sourcePageSha256!==card.sourcePageSha256)fail(row,'선택 버프의 SS14 원문 연결을 다시 확인하세요.');
    if(slots.filter(s=>s?.skillId===slot.skillId).length>1)fail(row,'같은 오라·함성을 여러 칸에서 중복 적용할 수 없습니다.');
    const active=netherCondition(row,build,`buff-${index}`,`${row.name} 효과 적용 중 여부`);
    const supports=[];
    for(const [supportIndex,support] of (slot.supports??[]).entries()) {
      if(!support?.supportId)continue;
      const linked=inspectSeasonSupport(support,{rowIndex:index,supportIndex,isTarget:true,binding:build.ss14Inputs?.supports?.[`${index}:${supportIndex}`],build});
      for(const reason of linked.blockers)fail(row,reason);
      if(checkSeasonSupportHost(support.supportId,card,{values:{}},index)!==true)fail(row,'버프와 보조 스킬의 호환 조건을 확인하세요.');
      for(const effect of linked.effects) {
        if(!['mana-cost-multiplier','supported-skill-area','supported-skill-aura-effect','supported-skill-sealed-mana-compensation'].includes(effect.stat)
          || !Number.isFinite(effect.value) || effect.condition || effect.per || effect.target
          || !(['add','set'].includes(effect.operation) || effect.stat==='supported-skill-aura-effect' && effect.operation==='more')) fail(row,`이 버프에 연결되지 않은 보조 효과: ${effect.sourceText}`);
        else supports.push({...effect,receipt:linked.receipt});
      }
    }
    if(!active){row.inactive.push({reason:'버프 미적용 상태'});continue;}
    const supportAmount=stat=>supports.filter(e=>e.stat===stat&&e.operation!=='more').reduce((n,e)=>n+e.value,0);
    const supportMore=aura?supports.filter(e=>e.stat==='supported-skill-aura-effect'&&e.operation==='more').reduce((n,e)=>n*(1+e.value/100),1):1;
    const multiplier=(1+(amount(stat)+(aura?supportAmount('supported-skill-aura-effect'):0))/100)*supportMore;
    if(multiplier<0)fail(row,'오라·함성 효과 배율이 음수입니다.');
    const resolvedText=resolved.item.tlidbText.en.detail;
    const lines=resolvedText.split('\nDetails\n').at(-1).split('\n');
    const effectLines=lines.filter(l=>!/^Activates the Aura,|^Casts the skill and lets out a Warcry:|^Taunts Nearby enemies\.|^Weakens Nearby enemies\.|^Lasts/u.test(l));
    const stacks=aura?1:netherCondition(row,build,`warcry-enemies-${index}`,`${row.name} 영향을 받은 적 수`,8);
    for(let line of effectLines) {
      if(line.includes('Not affected by Aura Effects')) {fail(row,'오라 효과 제외 조항의 별도 계산 미지원');continue;}
      const per=line.match(/^([\d.]+) % additional (damage|Ailment Damage) dealt by (Slash-Strike|Demolisher) skills (?:for each|per) enemy affected, stacking up to 8 times$/u);
      if(per){push(row,`${per[3]==='Demolisher'?'demolisher':'slash_strike'}_${per[2]==='damage'?'damage':'ailment_damage'}`,Number(per[1])*stacks*multiplier,'more',line);continue;}
      const melee=line.match(/^\+([\d.]+) % (Critical Strike Rating for Melee Skills|additional Melee Skill Damage|Melee Attack Speed)$/u);
      if(melee){push(row,{'Critical Strike Rating for Melee Skills':'melee_critical_strike_rating','additional Melee Skill Damage':'melee_damage','Melee Attack Speed':'melee_attack_speed'}[melee[2]],Number(melee[1])*multiplier,melee[2].startsWith('additional')?'more':'add_percent',line);continue;}
      if(/^\+?[\d.]+ % additional Minion Damage per enemy affected\. Stacks up to 8 times$/u.test(line)) {
        push(row,'minion_damage',Number(line.match(/[\d.]+/u)[0])*stacks*multiplier,'more',line);continue;
      }
      const parsed=parseLines(line,1,{path:row.path,sourcePageSha256:card.sourcePageSha256,conditions:build.ss14Inputs?.componentConditions});
      row.effects.push(...parsed.effects.map(e=>({...e,value:e.value*multiplier,path:row.path,group:row.group,receipt:card,derivedFrom:sources(stat).map(r=>r.path)})));
      row.blockers.push(...parsed.blockers);row.conditionControls.push(...parsed.conditions);
    }
    if(fear&&card.sourceRecordKey==='Precise_Fearless')push(row,'double_damage_chance',5*multiplier);
    const sealed=Number(resolvedText.match(/^Sealed Mana\n([\d.]+)%/u)?.[1]);
    if(aura&&Number.isFinite(sealed)&&netherRule('Sealed_Mana_Compensation').body.includes('Initial Sealed Mana/(1+ Sealed Mana Compensation)')) {
      const compensation=amount('sealed_mana_compensation')+supportAmount('supported-skill-sealed-mana-compensation');
      const cost=supports.filter(e=>e.stat==='mana-cost-multiplier').reduce((n,e)=>n*e.value/100,1);
      if(compensation<=-100||cost<0)fail(row,'봉인 MP 보상·소모 배율 범위를 확인하세요.');
      else push(row,'sealed_mana_percent',sealed*cost/(1+compensation/100),'add');
      row.mechanics.push({kind:'nether-reservation',base:sealed,compensation,cost,receipt:netherRule('Sealed_Mana_Compensation'),supports:supports.map(e=>e.receipt)});
    }else if(aura)fail(row,'이 패시브의 봉인 MP 형식·계산 근거 미확인');
    row.status=row.blockers.length?'partial':'mapped';
  }
  if(!hasNether)return;
  // Player aura effect does not modify a module minion's independently cast aura.
  if(amount('aura_effect')&&rows.some(r=>r.itemId?.startsWith('aura_overwrite_')))
    for(const r of sources('aura_effect'))r.inactive.push({reason:'독립된 소환체가 시전한 오라는 플레이어 오라 효과의 대상이 아님'});
  for(const row of sources('spirit_magus_origin_effect')) {
    for(const slot of slots) {
      const card=SS14_CARDS_EN.records[slot?.skillId];if(!card?.tags?.includes('Spirit Magus'))continue;
      const active=netherCondition(row,build,'origin-active','마령을 소환하여 근원 효과 적용 중');
      if(!active)continue;
      const resolved=resolveBuff(slot,card);
      const m=resolved.item?.tlidbText.en.detail.match(/Gains Origin of Ice, restoring ([\d.]+) % of Max Life and Max Energy Shield per second to the summoner/u);
      if(resolved.blockers.length||!m){fail(row,'선택 마령의 근원 효과·레벨 해석 미지원');continue;}
      const same=rows.filter(r=>r.mechanics?.some(m=>m.kind==='nether-origin'));
      if(same.length)continue;
      const n=Number(m[1])*(1+amount('spirit_magus_origin_effect')/100);
      push(row,'life_regeneration_percent',n);push(row,'energy_shield_regeneration_percent',n);
      row.mechanics.push({kind:'nether-origin',receipt:card});
    }
  }
  for(const row of sources('frostbite_effect')) {
    const rating=netherCondition(row,build,'frostbite-rating','대상의 빙결 수치 (효과 배율 적용 전)',120);
    if(rating!==null&&!rows.some(r=>r.mechanics?.some(m=>m.kind==='nether-frostbite'))){
      push(row,'cold_damage_taken',rating*(1+amount('frostbite_effect')/100),'more');
      row.mechanics.push({kind:'nether-frostbite',rating,receipt:netherRule('Frostbite')});
    }
  }
  for(const row of sources('numbed_effect'))if(!theaCombatEnabled(build)) {
    const stacks=netherCondition(row,build,'numbed-stacks','대상에 이미 적용된 마취 중첩',10);
    if(stacks!==null&&!rows.some(r=>r.mechanics?.some(m=>m.kind==='nether-numbed-fixed'))){
      push(row,'lightning_damage_taken',5*stacks*(1+amount('numbed_effect')/100),'more');
      row.mechanics.push({kind:'nether-numbed-fixed',stacks,receipt:netherRule('Numbed')});
    }
  }
  const provision=rows.find(r=>r.mechanics?.some(m=>m.kind==='nether-provision'));
  if(provision&&rows.some(r=>r.elixirState?.enabled===1&&!r.restoration)
    &&netherCondition(provision,build,'provision-minions','계산할 모든 소환체가 영약 효과를 받음')===0)
    fail(provision,'일부 소환체에만 영약을 적용하는 범위별 계산은 아직 미지원입니다.');
  for(const row of rows.filter(r=>r.elixirState))if(amount('elixir_effect')&&row.elixirState.enabled===1) {
    if(provision&&!row.restoration) {
      for(const effect of row.effects) {
        if(effect.stat.startsWith('minion_'))continue;
        if(['damage','fire_damage','cold_damage','lightning_damage','attack_speed','cast_speed','max_life','projectile_speed','movement_speed'].includes(effect.stat))effect.stat=`minion_${effect.stat}`;
        else fail(row,'공양으로 옮기는 이 영약의 소환체 효과는 아직 연결되지 않았습니다.');
      }
      if(row.mechanics?.length)fail(row,'공양으로 옮기는 영약의 특수 발동·방어 효과는 소환체 모델 연결이 필요합니다.');
      if(!provision.effects.some(e=>e.stat==='minion_damage'))push(provision,'minion_damage',15,'more');
    }
  }
  for(const row of rows)for(const m of row.mechanics??[])if(m.kind==='ill-omen') {
    m.efficiency+=amount('ill_omen_efficiency');
    m.minimumStacks=rows.some(r=>r.mechanics?.some(m=>m.kind==='nether-omen-floor'))?4:0;
  }
  const curseRows=rows.filter(r=>r.mechanics?.some(m=>m.kind==='nether-curse'));
  if(curseRows.length>1)for(const row of curseRows) {
    const max=netherCondition(row,build,'curse-limit','대상에게 동시에 적용 가능한 저주 종류 수',10);
    if(max!==null&&max<new Set(curseRows.flatMap(r=>r.mechanics.filter(m=>m.kind==='nether-curse').map(m=>m.slug))).size)fail(row,'선택한 동시 저주가 저주 상한을 초과합니다.');
  }
  // In a fixed state, chance/rate bonuses need an explicit ailment model; do
  // not silently drop damaging ailments just because the main hit is cold.
  for(const row of rows.filter(r=>r.effects.some(e=>['base_ailment_damage_min','damaging_ailment_chance','deterioration_damage'].includes(e.stat)))) {
    if(row.effects.some(e=>e.stat==='deterioration_damage')) {
      const chance=netherCondition(row,build,'deterioration-chance','적중 시 악화 부여 확률 (%)',100);
      if(chance){row.mechanics??=[];row.mechanics.push({kind:'nether-deterioration',chance});if(!theaCombatEnabled(build))fail(row,'악화가 발생하면 전투 조건에서 복합 발동 계산을 켜세요.');}
      continue;
    }
    const enabled=netherCondition(row,build,'damaging-ailments','대미지형 상태 이상을 유발하는 전투');
    if(enabled===1) {
      if(!theaCombatEnabled(build))fail(row,'상태 이상이 발생하면 전투 조건에서 복합 발동 계산을 켜세요.');
      const igniteOnly=netherCondition(row,build,'ignite-only','점화·스코치만 유발하는 전투');
      if(igniteOnly===0)fail(row,'플레이어 외상·몰락의 상태 이상 기본 대미지와 확률 연결은 아직 미지원입니다.');
      if(build.ss14Inputs?.theaEvents?.igniteEnabled!==1)fail(row,'점화·스코치 계산을 켜고 기본 대미지와 확률을 선택하세요.');
    } else if(enabled===0&&build.ss14Inputs?.theaEvents?.igniteEnabled===1)fail(row,'상태 이상 없음 선택과 점화 계산 설정이 충돌합니다.');
  }
}
