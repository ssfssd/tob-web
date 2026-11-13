import test from 'node:test';
import assert from 'node:assert/strict';
import {getCurrentTlidbSupportCompatibility as compatibility} from '../src/tlidbSupportCompatibility.js';
import {parseTlidbNumericModifierLine as parse} from '../src/tlidbGearTooltipCalculation.js';
const item = detail => ({tlidbText:{en:{detail,sourceFieldStatus:{detail:'exact'},sourcePageVersion:'SS14',sourceSeasonEvidence:{expectedSeason:14,actualSeason:14,collectionAllowed:true,verificationComplete:true},sourceUrl:'https://tlidb.com/en/Test',sourceRecordKey:'Test',sourcePageSha256:'a'.repeat(64)}}});
test('generic allow list preserves OR groups',()=>{
 for(const text of ['Supports Spell, Attack and Aura Skills.','Supports Spell, Attack or Aura Skills.']) {
  const r=compatibility(item(text),{season:'SS14'});
  assert.deepEqual(r.requiredTagGroups,[['spell'],['attack'],['aura']]);
 }
});
test('unknown allow list is not accepted as exclusion-only permission',()=>{
 assert.equal(compatibility(item('Supports Unknown Skills. Cannot support Channeled Skills.'),{season:'SS14'}),null);
});
test('support skill level parser preserves numeric scope',()=>{
 const r=parse('+2 Support Skill Level');
 assert.ok(JSON.stringify(r).includes('support_skill_level'));
 assert.ok(JSON.stringify(r).includes('2'));
});
