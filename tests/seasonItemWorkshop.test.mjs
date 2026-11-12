import test from 'node:test';
import assert from 'node:assert/strict';
import { createItemWorkshop, editItemWorkshop, finishedWorkshopItem } from '../src/seasonItemWorkshop.js';
import { craftOptions, itemGearKind } from '../src/seasonItemCraft.js';
import { seasonMemoryOptions } from '../src/seasonNativeSelections.js';
import { calculateSeasonBuild } from '../src/seasonBuild.js';
import { editSeasonWorkspace as edit, exportSeasonWorkspace, importSeasonWorkspace } from '../src/seasonWorkspace.js';
import { gearFilters } from '../src/seasonGearPicker.js';

const change = (draft, input) => { draft.document = editItemWorkshop(draft,draft.document,input); };
const roundTrip = doc => importSeasonWorkspace(exportSeasonWorkspace(doc));

test('일반 완드 제작 옵션과 선택 수치를 보관하고 반대쪽 무기 칸에 장착해 계산한다', () => {
  const draft=createItemWorkshop('gear',0), destination=createItemWorkshop('gear',1).document;
  const original=structuredClone(destination), id='gear-tlidb-com-cn-headless-cleric-wand';
  change(draft,{kind:'gear-selection',slotIndex:0,value:id});
  const option=craftOptions(id).find(o=>o.modifierId==='104320080');
  change(draft,{kind:'workshop-affix',value:option.key});
  const key='craft:0:104320080:1';
  change(draft,{kind:'extension-input',key,value:304});
  draft.name='시험 완드';
  const entry=finishedWorkshopItem(draft);
  assert.equal(entry.name,'시험 완드');
  assert.deepEqual(destination,original);
  const equipped=roundTrip(edit(destination,{kind:'shelf-apply',slotIndex:1,value:entry}));
  assert.deepEqual(equipped.sourceBuild,original.sourceBuild);
  assert.equal(equipped.targetBuild.ss14Inputs.extensionInputs['craft:1:104320080:1'].value,304);
  const report=calculateSeasonBuild(equipped.targetBuild);
  assert.deepEqual(report.componentProjection.effects.filter(e=>e.stat==='max_mana'&&e.path.includes('crafts')).map(e=>e.value),[304]);
  assert.ok(report.components.find(c=>c.id===id).calculations[0].rawEffects.some(e=>e.stat==='spell_damage'&&e.value===40));
  change(draft,{kind:'workshop-remove',value:option.key});
  assert.equal(finishedWorkshopItem(draft).craftRolls[key],undefined);
});

test('제작 목록과 레전드 목록이 겹치지 않고 레전드 고유 수치가 장착 후 유지된다', () => {
  const draft=createItemWorkshop('gear',2), id='gear-tlidb-com-cn-fiend-crown';
  assert.equal(itemGearKind(id),'legendary');
  assert.ok(!gearFilters(id).includes('제작'));
  assert.equal(itemGearKind('gear-tlidb-com-cn-headless-cleric-wand'),'base');
  assert.throws(()=>change(draft,{kind:'gear-selection',slotIndex:2,value:id}));
  draft.category='legendary';
  change(draft,{kind:'gear-selection',slotIndex:2,value:id});
  const controls=calculateSeasonBuild(draft.document.targetBuild).components.find(c=>c.id===id).calculations[0].controls;
  const c=controls.find(c=>c.stat==='sealed_mana_compensation');
  change(draft,{kind:'gear-roll',slotIndex:2,key:c.key,value:20});
  const entry=finishedWorkshopItem(draft), other=createItemWorkshop('gear',2).document;
  assert.deepEqual(craftOptions(id),[]);
  const equipped=roundTrip(edit(other,{kind:'shelf-apply',slotIndex:2,value:entry}));
  assert.equal(equipped.targetBuild.ss14Inputs.gear[2].rolls[c.key],20);
});

test('아이템별 옵션 목록이 없는 기본 장비도 SS14 카드의 정확한 장비 종류로 제작한다', () => {
  const id='gear-ss14-current-crude-wooden-sword', draft=createItemWorkshop('gear',0);
  const options=craftOptions(id);
  assert.ok(options.length && options.every(o=>o.slug==='Two-Handed_Sword'));
  change(draft,{kind:'gear-selection',slotIndex:0,value:id});
  change(draft,{kind:'workshop-affix',value:options[0].key});
  assert.throws(()=>change(draft,{kind:'workshop-affix',value:craftOptions('gear-tlidb-com-cn-headless-cleric-wand')[0].key}));
  const [row]=calculateSeasonBuild(roundTrip(draft.document).targetBuild).componentProjection.rows.filter(r=>r.path.includes('.crafts.'));
  assert.ok(row.receipt.sourceUrl.endsWith('/Two-Handed_Sword'));
  assert.equal(row.receipt.sourceRecordKey,options[0].modifierId);
});

test('추억은 독립적으로 제작하며 등급·강화·옵션을 같은 추억 칸에 장착한다', () => {
  const draft=createItemWorkshop('memory',1), other=createItemWorkshop('memory',1).document, options=seasonMemoryOptions(1);
  const apply=(kind,value,key)=>change(draft,{kind,slotIndex:1,value,key});
  apply('memory-selection',options.bases[0].id);
  apply('memory-quality',3);
  apply('memory-enhancement',15);
  const affix=options.affixes.find(r=>r.kind==='random');
  apply('memory-tier',affix.tierId,affix.groupId);
  const entry=finishedWorkshopItem(draft);
  assert.ok(!other.targetBuild.hero.memories[1]);
  assert.throws(()=>edit(other,{kind:'shelf-apply',slotIndex:0,value:entry}));
  const memory=roundTrip(edit(other,{kind:'shelf-apply',slotIndex:1,value:entry})).targetBuild.hero.memories[1];
  assert.equal(memory.enhancement,15);
  assert.equal(memory.ss14Quality,3);
  assert.equal(memory.affixRolls[affix.groupId].tierId,affix.tierId);
});
