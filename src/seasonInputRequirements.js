// Group repeated calculation diagnostics by the place where the user can act.
// Keep every original diagnostic; grouping never changes calculation support.
import { SEASON_DPS_ENEMY_FIELDS, SEASON_DPS_SKILL_FIELDS } from './seasonDps.js';
import { SEASON_HERO_COMBAT_FIELDS } from './seasonMechanicInputs.js';
import { SEASON_GEAR_SLOT_LABELS } from './seasonSelections.js';
const routes = [
  { id: 'shotgun', label: '보조 스킬·반복 적중 조건', section: 'skills', pattern: /같은 적에 적중|반복 적중마다 누적 점프|적중 전 점프 횟수|후속 적중까지 걸린 시간/u },
  { id: "gear", label: "장비 옵션 수치", section: "gear", pattern: /장비 옵션 수치를 입력/u },
  { id: "log-review", label: "로그에 없는 구성 확인", section: "combat", role: "season-dps-input", pattern: /로그에 없는/u },
  { id: "traits", label: "히어로 특성·단계", type: "traits", pattern: /특성.*(?:선택|단계)|기본 특성/u },
  { id: "slates", label: "석판 옵션", section: "divinity", pattern: /신성의 일각|추락하는 별빛|석판.*옵션/u },
  { id: "attributes", label: "캐릭터 기본 수치", section: "combat", role: "season-character-input", pattern: /주 속성 수치|기본 힘|기본 민첩|기본 지혜/u },
  { id: "elixirs", label: "영약 조건", section: "skills", type: "extensions", role: "native-extension-conditions", pattern: /영약|재료|방황|불길 저주|오멘/u },
  { id: "modules", label: "모듈·소환체 조건", section: "skills", type: "extensions", role: "native-extension-conditions", pattern: /모듈|소환체|오라 범위|처형 대상/u },
  { id: "combat", label: "스킬·대상 전투 조건", section: "combat", role: "season-dps-input", pattern: /전투 입력|시전 시간 배분|대상 적중률|적 아머|유효.*저항|DPS 공식|전체 DPS(?:를)? 산출/u },
];
export function inputDestinations(report,reason) {
  const links=[];
  const add=(section,label,edit,key,extra={})=>links.push({section,label,edit,key,...extra});
  for(const c of report?.components??[])for(const row of c.category==='gear'?c.calculations??[]:[]){
    const control=row.controls?.find(v=>v.sourceText&&reason.includes(v.sourceText)&&(v.value==null||v.value===''));
    if(control)add('gear',SEASON_GEAR_SLOT_LABELS[row.slotIndex]+' 옵션 입력','gear-roll',control.key,{index:row.slotIndex});
  }
  if(links.length)return links;
  if(/기본 크리티컬 수치를 직접 입력/u.test(reason))
    for(const row of report?.offense?.rows??[])if(Number.isInteger(row.rowIndex)&&row.blockers?.some(t=>reason.includes(t)||t.includes(reason)))add('combat','스킬 '+(row.rowIndex+1)+' 크리티컬 입력','offense-input',String(row.rowIndex));
  if(links.length)return links;
  if(/공식 원문|미확인|해석 미완료|주력 스킬은 일반 장벽 폭발/u.test(reason))return [];
  for(const row of report?.componentProjection?.rows??[]){
    if(row.name && reason.includes(row.name)&&reason.includes('기본 옵션 수치')&&row.memoryControl)
      add('hero',row.name+' 수치 입력','memory-base',String(row.memoryControl.key),{type:'memory',index:Number(row.memoryControl.key)});
    for(const key of row.heroControls??[])if(reason.includes(SEASON_HERO_COMBAT_FIELDS[key]?.label))add('combat','발동 조건 입력','hero-combat',key);
    for(const c of row.conditionControls??[])if(c.label && reason.includes(c.label))add('combat','효과 조건 입력','component-condition',c.key);
  }
  for(const [key,def] of Object.entries(SEASON_DPS_ENEMY_FIELDS))if(reason.includes(def.label))add('combat','대상 조건 입력','dps-input','enemy:'+key);
  for(const row of report?.fullDps?.rows??[])for(const [key,def] of Object.entries(SEASON_DPS_SKILL_FIELDS))
    if(Number.isInteger(row.rowIndex)&&reason.includes(def.label)&&row.blockers?.some(t=>reason.includes(t)))add('combat','스킬 '+(row.rowIndex+1)+' 조건 입력','dps-input',row.rowIndex+':'+key);
  if(links.length)return links.filter((l,i)=>links.findIndex(v=>v.key===l.key&&v.index===l.index)===i);
  if(/주력 스킬을 선택/.test(reason))return [{section:'skills',index:0,label:'주력 스킬 선택'}];
  if(/기본 크리티컬.*입력/.test(reason))return [{section:'combat',role:'native-critical-input',label:'기본 크리티컬 입력'}];
  const route=routes.find(r=>r.pattern.test(reason));
  if(route&&/입력|선택|확인하세요/.test(reason))return [{...route}];
  return [];
}
export function seasonInputRequirements(report) {
  const groups = new Map();
  for (const diagnostic of new Set(report?.fullDps?.blockers ?? [])) {
    const route = routes.find(r => r.pattern.test(diagnostic)) ?? { id: "effects", label: "효과·조건 확인", section: "combat" };
    if (!groups.has(route.id)) groups.set(route.id, { ...route, diagnostics: [] });
    groups.get(route.id).diagnostics.push(diagnostic);
  }
  return [...groups.values()];
}
