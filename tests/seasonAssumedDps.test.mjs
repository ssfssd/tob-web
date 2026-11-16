import { matchingTrainingDummy, renderTrainingDummyPicker } from '../src/seasonTrainingDummy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ss14DpsDocument } from './fixtures/ss14DpsFixture.mjs';
import { editSeasonWorkspace as edit } from '../src/seasonWorkspace.js';
import { buildUptimeScenario, calculateEditorSeasonBuild as calc } from '../src/seasonAssumedDps.js';
import { calculateSeasonDps } from '../src/seasonDps.js';
import { parseSeasonComponentLines } from '../src/seasonComponents.js';

const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.0001,`${a} != ${b}`);
test('uptime cannot equip a shield, grant stacks or combine moving with standing still',()=>{
  const {targetBuild}=ss14DpsDocument();
  const conditions=['while holding a Shield','while moving','while standing still','Focus-blessing'].map((conditionGroup,i)=>({
    key:'test:'+i,kind:i===3?'count':'boolean',value:i===2?1:'',conditionGroup,sourcePageSha256:'a'.repeat(64)
  }));
  const {next}=buildUptimeScenario(targetBuild,{coupledSkills:{rows:[]},componentProjection:{rows:[{conditionControls:conditions}]}});
  assert.deepEqual(conditions.map(c=>next.ss14Inputs.componentConditions[c.key]?.value),[0,0,1,undefined]);
});
test('assumed DPS activates the selected curse once, without enemy stats or modifying either build',()=>{
  const doc=edit(ss14DpsDocument(),{kind:'skill-selection',rowIndex:1,value:'skills-tlidb-com-cn-biting-cold'});
  doc.targetBuild.ss14Inputs.dps.enemy={};
  delete doc.targetBuild.ss14Inputs.dps.skills[0].hitChance;
  const before=JSON.stringify(doc);
  const r=calc(doc.targetBuild,{sourceBuild:doc.sourceBuild});
  close(r.assumedDps.dps,1470.234375*1.39);
  assert.equal(r.fullDps.dps,null);
  assert.equal(JSON.stringify(doc),before);
  delete doc.targetBuild.ss14Inputs.dps.skills[0].repeatHits;
  assert.equal(calc(doc.targetBuild).assumedDps.dps,null,'a proc frequency is not an uptime');
});
test('cold and armor penetration affect the encounter only',()=>{
  const {targetBuild}=ss14DpsDocument();
  Object.assign(targetBuild.ss14Inputs.dps.enemy,{armor:30000,cold:40});
  const r=calc(targetBuild);
  r.componentProjection.effects.push(...parseSeasonComponentLines('+20 % Cold Penetration\n+10 % Armor DMG Mitigation Penetration').effects);
  close(calculateSeasonDps(targetBuild,r).dps,1470.234375*(1-.6*30000/57000+.1)*.8);
  close(calculateSeasonDps(targetBuild,{...r,beforeDefense:true}).dps,1470.234375);
  close(r.assumedDps.dps,1470.234375);
});
test('all four town dummy levels apply to encounter DPS in a single edit and preserve the source',()=>{
  const original=ss14DpsDocument();
  const before=JSON.stringify(original);
  for(const [level,armor,resistance] of [[40,7321,10],[60,12330,15],[75,18570,20],[85,27270,30]]){
    const doc=edit(original,{kind:'dummy-level',value:level});
    const enemy=doc.targetBuild.ss14Inputs.dps.enemy;
    assert.equal(matchingTrainingDummy(enemy)?.level,level);
    assert.equal(matchingTrainingDummy({...enemy,cold:resistance+1}),undefined);
    assert.match(renderTrainingDummyPicker(enemy),new RegExp('value="'+level+'" selected'));
    assert.deepEqual([enemy.armor,enemy.fire,enemy.cold,enemy.lightning,enemy.erosion],[armor,...Array(4).fill(resistance)]);
    const r=calc(doc.targetBuild);
    close(r.fullDps.dps,1470.234375*(1-.6*armor/(30000+.9*armor))*(1-resistance/100));
    close(r.assumedDps.dps,1470.234375);
    assert.deepEqual(doc.sourceBuild, original.sourceBuild);
  }
  assert.equal(JSON.stringify(original),before);
  assert.throws(()=>edit(original,{kind:'dummy-level',value:90}),/허수아비/u);
});
test('persistent skill uses full uptime and ignores target resistance only in the assumed scenario',()=>{
  let doc=edit(ss14DpsDocument(),{kind:'skill-selection',rowIndex:0,value:'skills-tlidb-com-cn-path-of-flames'});
  for(const [key,value] of Object.entries({'enemy:fire':40,'enemy:affliction':100,'0:useShare':100,'0:hitChance':0,'0:dotUptime':50,'0:additionalChannelStacks':0}))
    doc=edit(doc,{kind:'dps-input',key,value});
  doc=edit(doc,{kind:'offense-input',key:'0',value:500});
  const r=calc(doc.targetBuild);
  close(r.fullDps.dps,932*1.5*2*.5*.6);
  close(r.assumedDps.dps,932*1.5*2);
  const dot=r.assumedDps.uptimeDetails.find(row=>row.name.includes('지속 대미지'));
  assert.equal(dot.setting,'50%');
  assert.equal(dot.assumed,'100%');
  assert.match(dot.method,/지속 대미지 DPS에 유지율/u);
});
