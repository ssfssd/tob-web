import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultBuild } from '../src/engine.js';
import { prepareSeasonMigration } from '../src/seasonMigration.js';
import { createSeasonWorkspace, editSeasonWorkspace as edit, exportSeasonWorkspace as dump, importSeasonWorkspace as open } from '../src/seasonWorkspace.js';
import { encodeBuildCode, decodeBuildCode } from '../src/seasonBuildCode.js';
import { calculateSeasonBuild as calculate } from '../src/seasonBuild.js';
const id='gear-tlidb-com-cn-law-of-greed', auraId='skills-ss14-current-precise-spell-amplification';
const blank=()=>edit(createSeasonWorkspace(prepareSeasonMigration(createDefaultBuild())),{kind:'character-input',key:'intelligence',value:366});
const gear=(d,value=id,slotIndex=4)=>edit(d,{kind:'gear-selection',slotIndex,value});
const raw=(d,f)=>{const x=structuredClone(d);f(x.targetBuild);return x;};
const values=(d)=>calculate(d.targetBuild).character.values;
const fixture=()=>gear(blank());
const roll=(d)=>edit(d,{kind:'gear-roll',slotIndex:4,key:'tlidb-gear-tooltip:'+id+':1:max_mana',value:25});
const aura=(d,value)=>{const x=edit(d,{kind:'skill-selection',rowIndex:5,value:auraId});
return value===undefined?x:edit(x,{kind:'component-condition',key:'skills.netherBuff.5:nether-buff-5',value});};
test('verified ordinary slot seals 10%; free MP requires max-mana roll',()=>{
 const d=fixture();assert.equal(values(d).reservedManaPercent,10);assert.equal(values(d).unreservedMana,null);
 const r=values(roll(d));assert.equal(r.mana,838.125);assert.equal(r.unreservedMana,754.3125);
});
test('Aura on adds 50; explicitly off does not; unknown activation holds',()=>{
 assert.equal(values(aura(fixture(),1)).reservedManaPercent,60);
 assert.equal(values(aura(fixture(),0)).reservedManaPercent,10);
 assert.equal(values(aura(fixture())).reservedManaPercent,null);
});
test('stale unsupported corrosion, custom sources and invalid slots hold',()=>{
 for (const f of [
  b=>{b.gear.slots[4].corrupted=true;},
  b=>{b.ss14Inputs.gear[4].sourcePageSha256='0'.repeat(64);},
  b=>{b.customAffixes='+30 % Sealed Mana Compensation';},
  b=>{b.gear.slots[0]=b.gear.slots[4];b.gear.slots[4]=null;},
 ]) {const r=values(raw(fixture(),f));assert.equal(r.reservedManaPercent,null);assert.equal(r.unreservedMana,null);}
});
test('native open restores source binding and exact value; removal clears',async()=>{
 const d=roll(fixture());
 for(const x of [open(dump(d)),await decodeBuildCode(await encodeBuildCode(d))]){
  assert.equal(values(x).reservedManaPercent,10);assert.equal(values(x).unreservedMana,754.3125);
  assert.equal(values(gear(x,'')).reservedManaPercent,0);
 }
});
