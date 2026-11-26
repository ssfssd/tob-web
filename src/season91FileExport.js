import {export91TobBuildDocument} from './build91tobInterop.js';
import {loadBuildImportValidationContext,validateBuildImportText} from './buildImportValidation.js';
import {normalizeBuild} from './engine.js';
import {validGameCriticalBinding} from './seasonGameData.js';
import {captureSeasonConfiguration,SEASON_CONFIGURATION_GROUPS} from './seasonConfiguration.js';
import {exportSeasonWorkspace} from './seasonWorkspace.js';
import {season91SlateExportIssue} from './seasonDivinity.js';

// These indexes and receipts duplicate the effective build fields or identify
// their SS14 source. Everything else must have an explicit exchange mapping.
const bindings=new Set(['schemaVersion','selections','selectionMode','configurations','supportSelections',
  'componentReceipts','ruleReceipts','offenseRuleReceipts']);
const receiptFields=new Set(['itemId','sourcePageSha256']);
const criticalFields=new Set([...receiptFields,'baseCriticalRating','gameDataReceipt']);
const populated=value=>value!==undefined && value!==null && (typeof value!=='object'||Object.keys(value).length>0);
const stable=value=>JSON.stringify(value,(_,entry)=>entry&&typeof entry==='object'&&!Array.isArray(entry)
  ? Object.fromEntries(Object.entries(entry).sort(([a],[b])=>a.localeCompare(b))) : entry);

const inputLabels=new Map(Object.entries({
  dps:'대상 방어·스킬 조건',dpsRuleReceipts:'대상 방어·스킬 조건',
  offense:'크리티컬 입력',character:'기본 속성',blessings:'축복',
  componentConditions:'효과 조건',observedManaRecoveryBasis:'MP 회복 관측값',
  gear:'장비 옵션',skills:'스킬',supports:'보조 옵션',
  heroSelection:'히어로 특성',heroTiers:'히어로 특성',equippedTraitLevels:'히어로 특성',
  memoryBases:'추억',memoryRolls:'추억',destinyRolls:'숙명',slateSelections:'신격 석판',
  extensionInputs:'영약·모듈화',heroCombat:'히어로 전투 조건',bingBurstEvents:'빈 발동 기록',
  theaCycle:'티아 전투 조건',theaEvents:'티아 전투 조건',logReview:'게임 로그 가져오기 정보',
  blessingRuleReceipts:'축복',theaCombatReceipt:'티아 전투 조건',
  theaEffectsReceipt:'티아 특성',theaRulesReceipt:'티아 전투 조건',
}));
const documentLabels=new Map(Object.entries({
  character:'캐릭터 레벨',hero:'히어로·특성·추억',skills:'스킬·보조',gear:'장비',
  talents:'재능',divinity:'신격 석판',pact:'정령·숙명',pactspirits:'정령·숙명',
  combat:'전투 조건',conditions:'전투 조건',custom:'사용자 옵션',customAffixes:'사용자 옵션',
}));
function documentIssueLabels(issues) {
  return [...new Set(issues.map(({code,path})=>code==='91tob-main-skill-level-invalid'
    ? '스킬 레벨' : documentLabels.get(path?.split(/[.\[]/u)[0])).filter(Boolean))];
}

function unsupportedInputs(build) {
  const labels=new Set();
  let mechanicReceipt=false;
  for (const [key,value] of Object.entries(build.ss14Inputs)) {
    if (bindings.has(key)||!populated(value)) continue;
    if (['gear','skills','supports'].includes(key) && Object.values(value).every(row=>
      Object.entries(row).every(([field,input])=>receiptFields.has(field)||!populated(input)))) continue;
    if (key==='offense' && Object.values(value).every(row=>row.gameDataReceipt&&validGameCriticalBinding(row)
      && Object.keys(row).every(field=>criticalFields.has(field)))) continue;
    if(key==='mechanicReceipts')mechanicReceipt=true;
    else labels.add(inputLabels.get(key)??'추가 SS14 입력');
  }
  return !labels.size&&mechanicReceipt?['특수 효과']:[...labels];
}

function comparableFields(build,id) {
  const {fields}=captureSeasonConfiguration(build,id);
  if (id==='skills') {
    // Empty rows have no playable level. The two editors initialize them differently.
    const slots=[...fields.skills.active,...fields.skills.passive];
    slots.forEach(row=>{ if (!row.skillId) row.level=0; });
    fields.skillLevels=slots.map(row=>row.level);
  } else if (id==='talents') {
    fields.talents.boards=fields.talents.boards.map((board,index)=>{
      const {slotType,prismSlots=[],inverseImageSlots=[],...rest}=board;
      return {...rest,slotType:slotType??(index===0?'base':'sub'),prismSlots,inverseImageSlots};
    });
  } else if (id==='combat') {
    delete fields.calculation?.externalImportProvenance;
  }
  return stable(fields);
}

export async function createSeason91FileExport(document) {
  exportSeasonWorkspace(document);
  const current=document.targetBuild;
  const slateIssue=season91SlateExportIssue(current);
  if(slateIssue)throw new Error(slateIssue+' TOB JSON으로 저장하세요.');
  const inputs=unsupportedInputs(current);
  if (inputs.length) throw new Error(`91TOB로 옮길 수 없는 SS14 입력 · ${inputs.join(', ')}. TOB JSON으로 저장하세요.`);
  const context=await loadBuildImportValidationContext().catch(()=>null);
  if (!context) throw new Error('91TOB 파일을 확인할 데이터를 불러오지 못했습니다.');
  const build=normalizeBuild(current);
  const result=export91TobBuildDocument(build,context);
  if (!result.ok) {
    const labels=documentIssueLabels(result.issues);
    throw new Error(`91TOB 형식에 저장할 수 없는 구성${labels.length?` · ${labels.join(', ')}`:'이 있습니다'}. TOB JSON으로 저장하세요.`);
  }
  const text=JSON.stringify(result.document,null,2);
  const reopened=validateBuildImportText(text,context);
  if (!reopened.ok) {
    const labels=documentIssueLabels(reopened.issues);
    throw new Error(`91TOB 파일을 다시 읽는 검증에 실패했습니다.${labels.length?` 확인할 구성 · ${labels.join(', ')}.`:''} TOB JSON으로 저장하세요.`);
  }
  const changed=SEASON_CONFIGURATION_GROUPS.filter(({id})=>comparableFields(build,id)!==comparableFields(reopened.build,id));
  if (changed.length) throw new Error(`다시 읽을 때 달라지는 구성이 있습니다. ${changed.map(row=>row.label).join(', ')}`);
  return text;
}
