import test from 'node:test';
import assert from 'node:assert/strict';
import {ss14DpsDocument} from './fixtures/ss14DpsFixture.mjs';
import {editSeasonWorkspace as edit, saveSeasonWorkspace, loadSeasonWorkspaces} from '../src/seasonWorkspace.js';
import {captureShelf} from '../src/seasonShelf.js';
import {calculateEditorSeasonBuild} from '../src/seasonAssumedDps.js';
import {previewSlotEdit} from '../src/seasonGearPicker.js';

const wand='gear-tlidb-com-cn-headless-cleric-wand', staff='gear-ss14-current-first-mans-scepter';
const equip=(slotIndex,value)=>({kind:'gear-selection',slotIndex,value});
const report=d=>calculateEditorSeasonBuild(d.targetBuild,{sourceBuild:d.sourceBuild});
const baseline=edit(ss14DpsDocument(),{kind:'skill-selection',rowIndex:0,value:'skills-tlidb-com-cn-ice-lances'});
const single=edit(baseline,equip(0,wand));
const dual=edit(single,equip(1,wand));
const control=edit(single,equip(0,staff));
const storedStaff=captureShelf(control.targetBuild,'gear',0);

for(const [name,swap] of [['도감',equip(0,staff)],['제작·보관함',{kind:'shelf-apply',slotIndex:0,value:storedStaff}]]){
  test(name+' 양손 무기의 미리보기와 저장 결과가 서브를 먼저 해제한 대조군과 같다',()=>{
    const original=JSON.stringify(dual);
    const preview=previewSlotEdit(dual,report(dual),swap);
    assert.equal(preview.offhandRemoved,true);
    assert.equal(preview.comparison.supported,true);
    assert.equal(JSON.stringify(dual),original);
    const after=edit(dual,swap);
    const expected=report(control).fullDps.dps;
    assert.ok(expected>0);
    assert.equal(preview.comparison.value,expected);
    assert.equal(after.targetBuild.gear.slots[0].itemId,staff);
    assert.equal(after.targetBuild.gear.slots[1],null);
    assert.equal(after.targetBuild.ss14Inputs.gear[1],undefined);
    assert.equal(report(after).fullDps.dps,expected);
    const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
    saveSeasonWorkspace(storage,after);
    const [restored]=loadSeasonWorkspaces(storage).documents;
    assert.equal(restored.targetBuild.gear.slots[1],null);
    assert.equal(report(restored).fullDps.dps,expected);
    assert.deepEqual(restored.sourceBuild,dual.sourceBuild);
    assert.equal(JSON.stringify(dual),original);
  });
}
test('한손 장착은 서브를 보존하고 양손 장착 뒤에는 서브를 다시 끼울 수 없다',()=>{
  const offhandOnly=edit(baseline,equip(1,wand));
  const main=edit(offhandOnly,equip(0,wand));
  assert.equal(main.targetBuild.gear.slots[1].itemId,wand);
  assert.equal(previewSlotEdit(offhandOnly,report(offhandOnly),equip(0,wand)).offhandRemoved,false);
  assert.throws(()=>edit(control,equip(1,wand)),/양손 무기/u);
  assert.throws(()=>edit(control,{kind:'shelf-apply',slotIndex:1,value:captureShelf(main.targetBuild,'gear',1)}),/양손 무기/u);
});
