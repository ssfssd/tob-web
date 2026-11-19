import {export91TobBuildDocument} from './build91tobInterop.js';
import {loadBuildImportValidationContext,validateBuildImportText} from './buildImportValidation.js';
import {normalizeBuild} from './engine.js';
import {validGameCriticalBinding} from './seasonGameData.js';
import {captureSeasonConfiguration,SEASON_CONFIGURATION_GROUPS} from './seasonConfiguration.js';
import {exportSeasonWorkspace} from './seasonWorkspace.js';

// These indexes and receipts duplicate the effective build fields or identify
// their SS14 source. Everything else must have an explicit exchange mapping.
const bindings=new Set(['schemaVersion','selections','selectionMode','configurations','supportSelections',
  'componentReceipts','ruleReceipts','offenseRuleReceipts']);
const receiptFields=new Set(['itemId','sourcePageSha256']);
const criticalFields=new Set([...receiptFields,'baseCriticalRating','gameDataReceipt']);
const populated=value=>value!==undefined && value!==null && (typeof value!=='object'||Object.keys(value).length>0);
const stable=value=>JSON.stringify(value,(_,entry)=>entry&&typeof entry==='object'&&!Array.isArray(entry)
  ? Object.fromEntries(Object.entries(entry).sort(([a],[b])=>a.localeCompare(b))) : entry);

function unsupportedInputs(build) {
  for (const [key,value] of Object.entries(build.ss14Inputs)) {
    if (bindings.has(key)||!populated(value)) continue;
    if (['gear','skills','supports'].includes(key) && Object.values(value).every(row=>
      Object.entries(row).every(([field,input])=>receiptFields.has(field)||!populated(input)))) continue;
    if (key==='offense' && Object.values(value).every(row=>row.gameDataReceipt&&validGameCriticalBinding(row)
      && Object.keys(row).every(field=>criticalFields.has(field)))) continue;
    return true;
  }
  return false;
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
  if (unsupportedInputs(current)) throw new Error('91TOB로 옮길 수 없는 SS14 입력이 있습니다. TOB JSON으로 저장하세요.');
  const context=await loadBuildImportValidationContext().catch(()=>null);
  if (!context) throw new Error('91TOB 파일을 확인할 데이터를 불러오지 못했습니다.');
  const build=normalizeBuild(current);
  const result=export91TobBuildDocument(build,context);
  if (!result.ok) throw new Error('91TOB 형식에 저장할 수 없는 구성이 있습니다. TOB JSON으로 저장하세요.');
  const text=JSON.stringify(result.document,null,2);
  const reopened=validateBuildImportText(text,context);
  if (!reopened.ok) throw new Error('91TOB 파일을 다시 읽는 검증에 실패했습니다.');
  const changed=SEASON_CONFIGURATION_GROUPS.filter(({id})=>comparableFields(build,id)!==comparableFields(reopened.build,id));
  if (changed.length) throw new Error(`다시 읽을 때 달라지는 구성이 있습니다. ${changed.map(row=>row.label).join(', ')}`);
  return text;
}
