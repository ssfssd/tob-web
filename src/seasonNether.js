import { SS14_NETHER as data } from './data/ss14Nether.generated.js';
import { SS14_NETHER_BUFFS } from './data/ss14NetherBuffs.generated.js';
import { parseRemainingNether } from './seasonNetherRemaining.js';

const types = { nether_judgment:'Judgment', nether_contamination:'Contamination', nether_banishment:'Banishment' };
export const isSeasonNether = id => Object.hasOwn(types, id);
export const netherTalentId = id => `slates-ss14-nether-${id}`;
export const netherTalent = id => data.talents.find(t => t.id === String(id).replace('slates-ss14-nether-', ''));
export const netherPage = (locale='en', type) => data.pages[`${locale}/${type ? `Nether_Kings_Divinity_${types[type]}` : 'Nether_Kings_Divinity'}`];
export const netherReceipt = () => data.receiptSha256;
export const netherQualityOptions = [{id:'blue',name:'파란색'}, {id:'purple',name:'보라색'}, {id:'orange',name:'주황색'}, {id:'red',name:'빨간색'}];
const tiers = ['Micro Nether King Talent Node','Medium Nether King Talent Node','Legendary Medium Nether King Talent Node','Ultimate Nether King Talent Node'];
export function netherTalentOptions(label) {
  const quality = label?.startsWith('nether:') ? netherQualityOptions.findIndex(q=>q.id===label.slice(7)) : -1;
  return data.talents.filter(t => quality >= 0 ? tiers.indexOf(t.typeLabel) <= quality : label === tiers[3] && t.slateEligible)
    .map(t=>({id:netherTalentId(t.id),name:t.ko.name,detail:t.ko.detail}));
}
export const netherSlateOptions = () => Object.keys(types).map(id=>({id,name:netherPage('ko',id).card.name,cap:1}));
const groups = {nether_judgment:[1,4],nether_contamination:[2,5],nether_banishment:[6]};
export function netherLayouts(type) {
  return data.native.shapes.filter(s=>groups[type]?.includes(s.group) && !s.preview.length).map(s=>{
    const position=data.native.positions[s.position];
    const cells=s.cells.map(c=>({x:position[0]-1+c.offset[0], y:position[1]-1+c.offset[1],slot:c.slot}));
    const anchor={x:Math.min(...cells.map(c=>c.x)),y:Math.min(...cells.map(c=>c.y))};
    return {id:String(s.id),group:s.group,position:s.position,cells,anchor,shape:cells.map(c=>({x:c.x-anchor.x,y:c.y-anchor.y})),
      name:`${cells.length}칸 · 위치 ${position[0]}, ${position[1]}`};
  });
}
export function netherTemplate(slate, board) {
  const page=netherPage('en',slate.slateId), ko=netherPage('ko',slate.slateId);
  const layout=netherLayouts(slate.slateId).find(s=>s.id===slate.nether?.layout);
  const blockers=[];
  const actual=board.cells.filter(c=>c.slateInstanceId===slate.instanceId);
  if (!layout || slate.nether?.receipt !== netherReceipt() || actual.length!==layout.cells.length || layout.cells.some(p=>!actual.some(c=>c.x===p.x&&c.y===p.y)))
    blockers.push({reason:'명왕의 SS14 배치 자료와 저장 위치가 일치하지 않습니다.'});
  const placed=new Set(board.cells.map(c=>c.slateInstanceId));
  if (board.slateInventory.filter(s=>placed.has(s.instanceId)&&(isSeasonNether(s.slateId)||s.slateId.startsWith('hades_'))).length>1)
    blockers.push({reason:'명왕의 신격은 종류와 관계없이 하나만 장착할 수 있습니다.'});
  const controls=(layout?.cells??[]).map((c,index)=>({key:`${slate.instanceId}|slot_${c.slot}`,instanceId:slate.instanceId,slot:`slot_${c.slot}`,index,
    quality:slate.nether?.qualities?.[index],type:`nether:${slate.nether?.qualities?.[index]}`,value:slate.slotSelectionsByKey?.[`slot_${c.slot}`]?.valueId??''}));
  for(const c of controls) if(!netherQualityOptions.some(q=>q.id===c.quality)||c.value&&!netherTalentOptions(c.type).some(t=>t.id===c.value))
    blockers.push({reason:'명왕 소켓 색상에 허용된 재능을 선택하세요.'});
  if(Object.keys(slate.slotSelectionsByKey??{}).some(k=>!controls.some(c=>c.slot===k))) blockers.push({reason:'명왕 소켓 수와 저장 옵션이 일치하지 않습니다.'});
  return {slate,board,page,slug:`Nether_Kings_Divinity_${types[slate.slateId]}`,name:ko.card.name,detail:ko.card.detail,
    controls,blockers,cap:1,nether:true,layout,active:!blockers.length&&controls.length>0&&controls.every(c=>c.value)};
}

export function netherTopology(board, template, selections) {
  if (!template?.active) return {active:false,adjacent:[],line:[],others:[]};
  const own=template.layout.cells, others=[...new Set(board.cells.filter(c=>c.slateInstanceId!==template.slate.instanceId).map(c=>c.slateInstanceId))];
  const selectedIds=selections.map(s=>s.nativeId??netherTalent(s.selection.valueId)?.id).filter(Boolean);
  const diagonal=template.slate.slateId==='nether_contamination'&&selectedIds.includes('92000007');
  const adjacent=others.filter(id=>board.cells.filter(c=>c.slateInstanceId===id).some(c=>own.some(p=>diagonal?Math.max(Math.abs(c.x-p.x),Math.abs(c.y-p.y))===1:Math.abs(c.x-p.x)+Math.abs(c.y-p.y)===1)));
  // The installed shapes order the offspring by socket. Judgment links consecutive offspring.
  const lines=[]; const ordered=[...own].sort((a,b)=>a.slot-b.slot);
  for(let i=1;i<ordered.length;i++){
    const a=ordered[i-1],b=ordered[i]; if(a.x!==b.x&&a.y!==b.y) continue;
    const distance=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    for(let n=1;n<distance;n++) lines.push({x:a.x+Math.sign(b.x-a.x)*n,y:a.y+Math.sign(b.y-a.y)*n});
  }
  const line=others.filter(id=>board.cells.some(c=>c.slateInstanceId===id&&lines.some(p=>p.x===c.x&&p.y===c.y)));
  return {active:true,type:template.slate.slateId,owner:template.slate.instanceId,adjacent,line,others,lines,selectedIds,
    talents:selections.map(s=>({id:s.nativeId??netherTalent(s.selection.valueId)?.id,owner:s.slate.instanceId}))};
}

// Parse the current source text, never the historical Hades numeric registry.
// Every clause not consumed here remains an explicit unsupported effect.
export function parseNetherTalent(talent, {parseLines,build,path,topology={active:false},scale=1}={}) {
  const effects=[],blockers=[],conditions=[],inactive=[],mechanics=[];
  const sourcePageSha256=netherPage().sourcePageSha256, text=talent.detail;
  const add=(stat,value,operation='add_percent',sourceText=text)=>effects.push({stat,value:value*scale,operation,unit:operation==='add'?'flat':'percent',sourceText});
  const need=(key,label,max=1)=>{
    const conditionKey=`${path}:nether-${key}`, binding=build.ss14Inputs?.componentConditions?.[conditionKey];
    const value=binding?.sourcePageSha256===sourcePageSha256?binding.value:undefined;
    const valid=Number.isInteger(value)&&value>=0&&value<=max;
    conditions.push({key:conditionKey,expression:label,sourceText:talent.ko.detail,sourcePageSha256,kind:max===1?'boolean':'count',max,
      conditionGroup:`nether-${key}`,value:valid?value:''});
    if(!valid) blockers.push({reason:`${label}: 값을 선택하세요.`,sourceText:text});
    return valid?value:null;
  };
  const parse=t=>{const p=parseLines(t,1,{path,sourcePageSha256,conditions:build.ss14Inputs?.componentConditions});
    effects.push(...p.effects.map(e=>({...e,value:e.value*scale})));blockers.push(...p.blockers);conditions.push(...p.conditions);inactive.push(...p.inactive);};
  const count=topology.active ? topology.type==='nether_banishment' ? (/non-adjacent/u.test(text)?topology.others.length-topology.adjacent.length:topology.adjacent.length)
    :topology.type==='nether_judgment'?topology.line.length:0:0;
  if(parseRemainingNether(talent,{build,add,need,effects,blockers,mechanics,inactive})) {
    // Remaining mechanics retain their own conditions and SS14 receipts.
  } else if(talent.id==='banish10') {
    if(need('indomitable','불멸 준비 완료 또는 발동 중 여부')){add('damage',30,'more');add('minion_damage',30,'more');}
    mechanics.push({kind:'nether-temporary-life',lifePercent:100,duration:4,cooldown:20,sourceText:text});
  } else if(talent.id==='banish6') {
    const n=need('curses','대상에게 적용된 저주 수',20);if(n!==null)add('terra_damage',20*n,'more');
  } else if(talent.id==='banish1') {
    const active=need('paralyzed','대상 마비 여부'), effect=need('paralysis-effect','마비 효과 증가율',1000);
    if(active&&effect!==null)add('demolisher_damage',20*(1+effect/100),'more');
    mechanics.push({kind:'nether-apply-paralysis',radius:15,sourceText:text});
  } else if(talent.id.startsWith('banish')) {
    blockers.push({reason:'추방 고유 효과의 발동·대상 계산 미지원',sourceText:text});
  } else if (/^When (Contamination|Judgment) is active,.*(?:Projection Effect|Effect Increase Multiplier|diagonally adjacent)/u.test(text)) {
    mechanics.push({kind:'nether-topology',talentId:talent.id,scale});
  } else if (/^When (Banishment|Judgment) is active, for every/u.test(text)) {
    const applies=topology.type===`nether_${text.startsWith('When Banishment')?'banishment':'judgment'}`;
    if(applies&&count){const line=text.split('\n').at(-1).replace(' (multiplies)','');
      const normalized=line.replace('additional damage for you and your Minions','additional damage');
      if(text.includes('(multiplies)')) for(let n=0;n<count;n++)parse(normalized); else {const p=parseNetherTalent({...talent,id:'topology-value',detail:line},{parseLines,build,path,topology,scale:scale*count});effects.push(...p.effects);blockers.push(...p.blockers);}
    } else inactive.push({sourceText:text,reason:'명왕 종류·배치 조건 미충족'});
  } else if(/^\+\d+ % additional damage for you and your Minions/u.test(text)) {
    const state=text.includes('Cursed')?need('cursed','대상 저주 적용 여부'):1;
    if(state){const v=Number(text.match(/\d+/u)[0]);add('damage',v,'more');add('minion_damage',v,'more');}
  } else if(/^Adds .* to your and your Minions' Attacks and Spells$/u.test(text)) {
    const m=text.match(/^Adds (\d+) - (\d+) (\w+) Damage/u);
    for(const prefix of ['spell','attack','minion']) for(const [side,value] of [['min',Number(m[1])],['max',Number(m[2])]]) add(`${prefix}_${m[3].toLowerCase()}_damage_${side}`,value,'add');
  } else if(['90000206','90000207'].includes(talent.id)) {
    const attack=talent.id==='90000206',form=attack?'attack':'spell',page=SS14_NETHER_BUFFS.pages[`en/${attack?'Attack':'Spell'}_Aggression`];
    const match=page?.body.match(/^Additionally increases (?:Attack|Cast) Speed and (?:Attack|Spell) Damage by (\d+)%\. Increases (?:Movement Speed|Mobility Skill Cooldown Recovery Speed) by (\d+)%/u);
    if(!match||page.season!=='SS14')blockers.push({reason:'맹공·주술 과격의 SS14 기본 효과 근거 미확인',sourceText:text});
    else {
      add(`${form}_aggression_effect`,30);
      mechanics.push({kind:'nether-aggression',form,base:Number(match[1]),utility:Number(match[2]),source:page});
    }
  } else if(talent.id==='90000210') {add('attack_critical_strike_rating',80,'add');add('spell_critical_strike_rating',80,'add');}
  else if(talent.id==='90000123'){add('base_ailment_damage_min',10,'add');add('base_ailment_damage_max',10,'add');}
  else if(talent.id==='90000208'){add('ill_omen_efficiency',50);}
  else if(talent.id==='90000209'){add('damaging_ailment_chance',30);}
  else if(talent.id==='90000211'){add('frostbite_effect',30);}
  else if(talent.id==='90000213'){add('numbed_effect',30);add('numbed_additional_stacks',2,'add');}
  else if(talent.id==='90000214'){add('deterioration_damage',32);}
  else if(talent.id==='90000212'){if(need('recent-fire-hit','최근 화염 적중 여부'))add('affliction_effect',50);}
  else if(talent.id==='92100002'){if(need('proximity','근거리 대상 여부'))add('physical_damage',15,'more');}
  else if(talent.id==='92100003'){const n=need('spell-level-bonus','주술 스킬 추가 레벨',100);if(n!==null){add('spell_critical_strike_rating',5*Math.min(10,n),'add');add('spell_critical_strike_rating',10*Math.min(10,n));}}
  else if(talent.id==='92100004'){const n=need('sealed-life','봉인 HP 비율',100);if(n!==null)add('spell_damage',.14*n,'more');}
  else if(talent.id==='92100006'){add('critical_strike_rating',-20,'add');add('projectile_critical_hit_damage',16,'more');}
  else if(talent.id==='92100007'){const n=need('knockback','밀어내기 거리 증가율',1000);if(n!==null)add('projectile_damage',Math.min(14,Math.floor(n/6)),'more');}
  else if(talent.id==='92100012'){const n=need('minions','소환체 수',100);if(n!==null)add('minion_damage',2*Math.min(6,n),'more');add('minion_max_life',15);}
  else if(talent.id==='92100013'){const n=need('recent-noncrit','최근 비크리티컬 적중 중첩',4);if(n!==null)add('critical_strike_damage',20*n);}
  else if(talent.id==='92100015'){if(need('within-ten','대상 10m 이내 여부'))add('fire_damage_taken',14,'more');}
  else if(talent.id==='92100016'){add('max_lightning_damage',14,'more');}
  else if(talent.id==='92100017'){add('cold_critical_hit_damage',14,'more');}
  else if(talent.id==='92100018'){if(need('both-block-fifty','공격·주술 막기 모두 50% 이상 여부'))mechanics.push({kind:'nether-defensive-ailment-reduction',value:50,sourceText:text});}
  else if(talent.id==='92100019'){mechanics.push({kind:'damage-taken-conversion',from:'erosion',to:'random-elemental',percent:27,sourceText:text});}
  else if(talent.id==='92100020'){const n=need('recent-empower-defensive','최근 자극·실드 스킬 시전 수',4);if(n!==null)for(let i=0;i<n;i++)add('damage',3,'more');}
  else if(talent.id==='92100021'){const n=need('erosion-stacks','3초 이내 부식 적중 중첩',12);if(n!==null)add('erosion_damage',n,'more');}
  else if(/^\+1 (Physical|Cold|Fire|Lightning|Erosion|Minion) Skill Level/u.test(text)||talent.id==='92100014'){
    const tag=text.match(/^\+1 (\w+) Skill Level/u)?.[1]; add(tag?`${tag.toLowerCase()}_skill_levels`:'all_skill_levels',1,'add');
    if(talent.id==='92100011')add('minion_damage',4,'more');
  } else {
    const aliases={ 'Minion Critical Strike Rating':'minion_critical_strike_rating','Minion Critical Strike Damage':'minion_critical_strike_damage',
      'Minion Projectile Speed':'minion_projectile_speed','Skill Area':'skill_area','Minion Skill Area':'minion_skill_area',
      'Aura Effect':'aura_effect','Sealed Mana Compensation':'sealed_mana_compensation','Warcry Effect':'warcry_effect','Elixir Skill Effect':'elixir_effect',
      'Life Regain':'life_regain','Energy Shield Regain':'energy_shield_regain','Origin of Spirit Magus effect':'spirit_magus_origin_effect' };
    for(const line of text.split('\n')) {
      const m=line.match(/^\+(\d+) % (.+)$/u), stat=m&&aliases[m[2]];
      if(stat)add(stat,Number(m[1]),'add_percent',line);
      else if(line.includes('Elemental and Erosion Resistance Penetration')) {
        const minion=line.endsWith('for Minions'); const value=Number(line.match(/\d+/u)[0]);
        if(minion)for(const t of ['fire','cold','lightning','erosion'])add(`minion_${t}_penetration`,value,'add_percent',line);
        else {add('elemental_resistance_penetration',value,'add_percent',line);add('erosion_resistance_penetration',value,'add_percent',line);}
      } else if(line==='+11 % chance for Minions to deal Double Damage')add('minion_double_damage_chance',11,'add_percent',line);
      else if(/^Immune to/u.test(line)) {mechanics.push({kind:'nether-defensive-immunity',sourceText:line});}
      else parse(line);
    }
  }
  return {effects,blockers,conditions,inactive,mechanics};
}

// The status itself is unique. Effect bonuses add before the one base buff is
// applied, so multiple grants cannot multiply the base buff repeatedly.
export function applyNetherAggression(rows) {
  for(const form of ['attack','spell']) {
    const grants=rows.filter(r=>!r.blockers.length&&r.mechanics?.some(m=>m.kind==='nether-aggression'&&m.form===form));
    if(!grants.length)continue;
    const owner=grants[0],rule=owner.mechanics.find(m=>m.kind==='nether-aggression'&&m.form===form);
    if(form==='attack'&&rows.some(r=>r.mechanics?.some(m=>m.kind==='thea-aggression'))) {
      owner.blockers.push({reason:'명왕 맹공과 계시 맹공의 합산·유지율 연결 미지원'});owner.status='partial';continue;
    }
    const bonus=rows.flatMap(r=>r.effects).filter(e=>e.stat===`${form}_aggression_effect`).reduce((n,e)=>n+e.value,0);
    const effect=(stat,value,operation='more')=>owner.effects.push({stat,value,operation,unit:'percent',path:owner.path,group:owner.group,
      sourceText:owner.detail,receipt:{sourceUrl:rule.source.sourceUrl,sourcePageSha256:rule.source.sourcePageSha256,season:'SS14'},
      derivedFrom:grants.map(r=>r.path)});
    effect(`${form}_damage`,rule.base*(1+bonus/100));
    effect(form==='attack'?'attack_speed':'cast_speed',rule.base*(1+bonus/100));
    effect(`minion_${form}_damage`,rule.base*(1+bonus/100));
    effect(form==='attack'?'minion_attack_speed':'minion_cast_speed',rule.base*(1+bonus/100));
    effect(form==='attack'?'movement_speed':'mobility_cooldown_recovery_speed',rule.utility*(1+bonus/100),'add_percent');
  }
}

export function parseNetherBanishment(template, context) {
  const variant=template.slate.nether?.banishment;
  if(!Number.isInteger(variant)||variant<1||variant>10)return {effects:[],blockers:[{reason:'추방 고유 효과를 선택하세요.'}],conditions:[],inactive:[],mechanics:[]};
  return parseNetherTalent({id:`banish${variant}`,detail:data.banishmentRules[variant-1].detail,ko:{detail:template.name}},context);
}

export function netherJudgmentScale(topology, templateId) {
  if(!topology.active||topology.type!=='nether_judgment')return 1;
  // XD SS14 October 14 supplement supersedes the 70% in the general TLIDB guide.
  let increased=40;
  for(const {id,owner} of topology.talents){ const factor=owner===topology.owner && netherTalent(id)?.typeLabel===tiers[3] ? .7 : 1;
    if(id==='90000215')increased+=5*factor;
    if(id==='92300004'&&['corner_of_divinity','stars_fall'].includes(templateId))increased+=10*factor;
    if(id==='92300005'&&templateId==='six_gods')increased+=10*factor; }
  return 1+increased/100;
}

export function scaleNetherRow(row, factor) {
  if(row.effects.some(e=>e.operation==='set'||e.stat.endsWith('_skill_levels')&&!Number.isInteger(e.value*factor))
    ||row.mechanics?.some(m=>!['nether-topology','nether-aggression','nether-defensive-immunity'].includes(m.kind))) {
    row.effects=[];row.mechanics=[];row.blockers.push({reason:'명왕 증폭·투영 대상의 고정·레벨·특수 효과 환산 규칙을 확인하지 못했습니다.'});row.status='partial';return;
  }
  row.effects=row.effects.map(e=>({...e,value:e.value*factor,netherMultiplier:factor}));
}
