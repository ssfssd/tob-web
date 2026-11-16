import test from 'node:test';
import assert from 'node:assert/strict';
import {createItemWorkshop} from '../src/seasonItemWorkshop.js';
import {calculateEditorSeasonBuild} from '../src/seasonAssumedDps.js';
import {editSeasonWorkspace as edit, saveSeasonWorkspace, loadSeasonWorkspaces} from '../src/seasonWorkspace.js';
import {rankSeasonUpgrades,copySeasonUpgrade} from '../src/seasonUpgradeRanking.js';
import {captureShelf} from '../src/seasonShelf.js';

const necklace='gear-tlidb-com-cn-ownerless';
const speed='tlidb-gear-tooltip:'+necklace+':2:attack_speed';
const report=d=>calculateEditorSeasonBuild(d.targetBuild,{sourceBuild:d.sourceBuild});
function fixture(){
  let doc=createItemWorkshop('gear',4).document;
  function set(e){doc=edit(doc,e);}
  set({kind:'skill-selection',rowIndex:0,value:'skills-tlidb-com-cn-ice-lances'});
  for(const key of ['strength','dexterity','intelligence'])set({kind:'character-input',key,value:0});
  set({kind:'offense-input',key:'0',value:500});
  for(const [key,value] of Object.entries({'enemy:armor':30000/1.1,'enemy:cold':30,'0:useShare':100,'0:hitChance':100,'0:repeatHits':0}))set({kind:'dps-input',key,value});
  set({kind:'gear-selection',slotIndex:4,value:necklace});
  for(const [stat,value] of [['1:max_life',215],['2:attack_speed',11],['5:all_stats',16]])set({kind:'gear-roll',slotIndex:4,key:'tlidb-gear-tooltip:'+necklace+':'+stat,value});
  return doc;
}
test('단위 옵션 순위는 11→12% 직접 편집과 일치하고 같은 줄을 중복 추천하지 않는다',async()=>{
  const doc=fixture(),before=JSON.stringify(doc),base=report(doc);
  const result=await rankSeasonUpgrades(doc,base);
  const matches=result.rows.filter(r=>r.edits[0].key===speed);
  assert.equal(matches.length,1);
  const row=matches[0];
  assert.equal(row.detail,'11 → 12');
  assert.equal(row.value,report(edit(doc,{kind:'gear-roll',slotIndex:4,key:speed,value:12})).fullDps.dps);
  assert.ok(Math.abs(row.value/base.fullDps.dps-1.12/1.11)<1e-8);
  assert.equal(result.rows.filter(r=>r.label.includes('시전 속도')).length,1);
  assert.throws(()=>copySeasonUpgrade(doc,base,{...row,value:row.value+1}));
  assert.equal(JSON.stringify(doc),before);
});
test('장비 상위 20은 계산 가능한 상승분만 정렬하고 추천 사본을 독립적으로 저장·복원한다',async()=>{
  const doc=fixture(),base=report(doc),values=new Map();
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  saveSeasonWorkspace(storage,doc);
  const original=loadSeasonWorkspaces(storage).documents.find(v=>v.id===doc.id);
  const result=await rankSeasonUpgrades(doc,base,{mode:'gear',slot:'all'});
  assert.equal(result.rows.length,20);
  assert.ok(result.blocked>0);
  assert.ok(result.rows.every((r,i)=>r.delta>0&&(!i||r.delta<=result.rows[i-1].delta)));
  const row=result.rows[0],copy=copySeasonUpgrade(doc,base,row);
  assert.notEqual(copy.id,doc.id);
  saveSeasonWorkspace(storage,copy);
  const docs=loadSeasonWorkspaces(storage).documents;
  assert.deepEqual(docs.find(v=>v.id===doc.id),original);
  assert.equal(report(docs.find(v=>v.id===copy.id)).fullDps.dps,row.value);
  assert.deepEqual(doc.sourceBuild,copy.sourceBuild);
});
test('같은 장비라도 보관함의 12% 수치로 실제 교체하고 도감 상한으로 덮어쓰지 않는다',async()=>{
  const doc=fixture(),base=report(doc);
  const better=edit(doc,{kind:'gear-roll',slotIndex:4,key:speed,value:12});
  const item=captureShelf(better.targetBuild,'gear',4);
  const result=await rankSeasonUpgrades(doc,base,{mode:'gear',slot:'4',shelf:[item]});
  const row=result.rows.find(r=>r.edits[0].kind==='shelf-apply');
  assert.equal(row.value,report(better).fullDps.dps);
  assert.equal(report(copySeasonUpgrade(doc,base,row)).fullDps.dps,row.value);
});
test('전체 DPS 보류와 취소에는 추천이 나오지 않는다',async()=>{
  const empty=createItemWorkshop('gear',0).document;
  const blocked=await rankSeasonUpgrades(empty,report(empty));
  assert.ok(blocked.reasons.length);assert.equal(blocked.checked,0);
  const doc=fixture();
  assert.equal(await rankSeasonUpgrades(doc,report(doc),{active:()=>false}),null);
});
