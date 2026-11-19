import {exportSeasonWorkspace,importSeasonWorkspace} from './seasonWorkspace.js';

export const SEASON_DRAFT_KEY='tob.season-draft.v1';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// A separate recovery record never changes the named build or historical keys.
// Compare the last observed record before writing so another tab cannot be lost.
export function createSeasonDraft(storage,documents) {
  let observed, record, error='';
  try {
    observed=storage.getItem(SEASON_DRAFT_KEY);
    record=observed===null?null:JSON.parse(observed);
    if(record!==null){
      if(record.schemaVersion!==1||!Object.hasOwn(record,'baseline'))throw Error('invalid');
      exportSeasonWorkspace(record.document);
      if(record.baseline===null&&record.document.revision!==0)throw Error('invalid');
      if(record.baseline!==null)exportSeasonWorkspace(record.baseline);
      if(record.baseline && (record.document.id!==record.baseline.id
        ||record.document.revision!==record.baseline.revision
        ||!same(record.document.sourceBuild,record.baseline.sourceBuild)))throw Error('invalid');
    }
  } catch {error='임시 저장을 읽지 못했습니다. 저장 버튼으로 빌드를 보관하세요.';}
  let recovered=null, copied=false;
  try {if(!error&&record){
    const saved=documents.find(d=>d.id===record.document.id);
    if(!saved||!same(saved.targetBuild,record.document.targetBuild)||!same(saved.sourceBuild,record.document.sourceBuild)){
      if(same(saved??null,record.baseline))recovered=structuredClone(record.document);
      else {
        recovered=importSeasonWorkspace(exportSeasonWorkspace(record.document));
        recovered.targetBuild.name=recovered.targetBuild.name.slice(0,155)+' · 복구';
        copied=true;
      }
    }
  }} catch {error='미저장 변경을 복구하지 못했습니다. 임시 기록은 유지했습니다.';recovered=null;}
  function write(value){
    if(error)throw Error(error);
    let current;
    try {current=storage.getItem(SEASON_DRAFT_KEY);}
    catch {throw Error('임시 저장에 접근할 수 없습니다. 저장 버튼으로 빌드를 보관하세요.');}
    if(current!==observed)
      throw Error('다른 탭의 임시 저장을 유지했습니다. 저장 버튼으로 현재 빌드를 보관하세요.');
    const raw=JSON.stringify(value);
    if(raw===observed)return;
    try {storage.setItem(SEASON_DRAFT_KEY,raw);}
    catch {throw Error('임시 저장에 실패했습니다. 저장 버튼으로 빌드를 보관하세요.');}
    observed=raw;record=value;
  }
  return {
    recovered,copied,error,
    save(document,baseline){
      exportSeasonWorkspace(document);
      if(baseline)exportSeasonWorkspace(baseline);
      if((!baseline&&document.revision!==0)||(baseline&&(document.id!==baseline.id
        ||document.revision!==baseline.revision||!same(document.sourceBuild,baseline.sourceBuild))))
        throw Error('임시 저장 기준을 확인할 수 없습니다. 저장 버튼으로 빌드를 보관하세요.');
      write({schemaVersion:1,document,baseline:baseline??null});
    },
    clear(){if(error)throw Error(error);if(record)write(null);}
  };
}
