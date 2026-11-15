import test from 'node:test';
import assert from 'node:assert/strict';
import {createItemWorkshop} from '../src/seasonItemWorkshop.js';
import {createSeasonPlanner} from '../src/seasonPlanner.js';
import {saveSeasonWorkspace} from '../src/seasonWorkspace.js';
import {seasonTalentNodes,seasonSpiritOptions} from '../src/seasonNativeSelections.js';
import {renderSeasonPlanner} from '../src/seasonPlannerView.js';

function setup() {
  const doc=createItemWorkshop('memory',0).document;
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v))};
  saveSeasonWorkspace(storage,doc);
  return {planner:createSeasonPlanner(storage,doc.sourceBuild),values,storage};
}
test('재능 미리보기·취소는 저장값을 보존하고 여러 변경을 한 번에 적용·복원한다',()=>{
  const {planner:p,values,storage}=setup(),original=p.state.document,stored=[...values];
  const choose=()=>{
    p.openBoard('talents');
    p.edit({kind:'talent-board',slotIndex:0,value:'Goddess_of_Knowledge'});
    const node=seasonTalentNodes('Goddess_of_Knowledge').find(n=>!n.core&&n.required===0);
    p.edit({kind:'talent-node',slotIndex:0,key:node.id,value:1});
  };
  choose();
  assert.equal(p.state.document,original);
  assert.deepEqual([...values],stored);
  assert.match(renderSeasonPlanner(p.state),/미확정/);
  p.closeOverlay();
  assert.equal(p.workingDocument(),original);
  choose();
  const candidate=structuredClone(p.workingDocument().targetBuild);
  p.applyBoard();
  assert.deepEqual(p.state.document.targetBuild,candidate);
  p.save();
  const reopened=createSeasonPlanner(storage,original.sourceBuild);
  assert.deepEqual(reopened.state.document.targetBuild,candidate);
  assert.deepEqual(reopened.state.document.sourceBuild,original.sourceBuild);
  p.restore(false);
  assert.deepEqual(p.state.document.targetBuild,original.targetBuild);
});
test('정령 후보를 바꿨다가 원래 정령을 고르면 기존 레벨과 링이 유지된다',()=>{
  const {planner:p}=setup();
  const [a,b]=seasonSpiritOptions().filter(o=>o.levels.length>1);
  p.edit({kind:'spirit-selection',slotIndex:0,value:a.id});
  p.edit({kind:'spirit-level',slotIndex:0,value:a.levels.at(-1)});
  const original=p.state.document;
  p.openBoard('pact');
  const select=id=>p.click({target:{closest:s=>s==='[data-ss14-action]'?{dataset:{ss14Action:'pact-roster',index:'0',id}}:null}});
  select(b.id);
  assert.equal(p.workingDocument().targetBuild.pact.slots[0].spirit.spiritId,b.id);
  select(a.id);
  assert.equal(p.workingDocument(),original);
  p.applyBoard();
  assert.equal(p.state.document,original);
});
