import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultBuild } from '../src/engine.js';
import { prepareSeasonMigration } from '../src/seasonMigration.js';
import { createSeasonWorkspace, editSeasonWorkspace as edit, exportSeasonWorkspace, importSeasonWorkspace } from '../src/seasonWorkspace.js';
import { calculateSeasonBuild as calculate } from '../src/seasonBuild.js';
import { netherTalentId } from '../src/seasonNether.js';
import { getSeasonSelectionOptions } from '../src/seasonSelections.js';
import { SS14_CARDS_EN } from '../src/data/ss14Cards.en.generated.js';
import { RUNTIME_CATALOG } from '../src/data/runtimeCatalog.generated.js';
import { createSkillRuntimeModel, getSkillEnergyUsage, updateUnlockedSupportCount } from '../src/skillRuntimeModel.js';
import { checkSeasonSupportHost, inspectSeasonSupport, seasonSupportItem } from '../src/seasonSupport.js';

function workspace(energyMax = 525) {
  const build = createDefaultBuild();
  build.skills.energyMax = energyMax;
  return createSeasonWorkspace(prepareSeasonMigration(build));
}
const report = doc => calculate(doc.targetBuild);
const restored = doc => importSeasonWorkspace(exportSeasonWorkspace(doc));
const close = (value, expected) => assert.ok(Number.isFinite(value) && Math.abs(value - expected) < 0.00001, `${value} != ${expected}`);

test('Judgment changes the original spell damage only when its own slate is on the line', () => {
  let doc = workspace();
  const original = structuredClone(doc.sourceBuild);
  const lastSlate = () => doc.targetBuild.divinity.boards.find(b => b.boardId === doc.targetBuild.divinity.activeBoardId).slateInventory.at(-1).instanceId;
  doc = edit(doc, { kind: 'slate-add', value: 'nether_judgment', key: '' });
  const judgment = lastSlate();
  for (const slot of [1, 2]) doc = edit(doc, { kind: 'slate-affix', key: judgment + '|slot_' + slot, value: netherTalentId('90000000') });
  doc = edit(doc, { kind: 'slate-add', value: 'six_gods', key: 'b_1' });
  const source = lastSlate();
  doc = edit(doc, { kind: 'slate-affix', key: source + '|slot_1', value: 'slates-divinity-talent-381' });
  doc = edit(doc, { kind: 'slate-add', value: 'starfire', key: 'b_1' });
  const copy = lastSlate();
  for (const [sourceY, copyY, direction, expected] of [[2, 3, 'up', 9], [2, 1, 'down', 9], [1, 2, 'up', 12.6]]) {
    let placed = edit(doc, { kind: 'slate-move', key: source, value: { x: 2, y: sourceY } });
    placed = edit(placed, { kind: 'slate-move', key: copy, value: { x: 2, y: copyY } });
    placed = edit(placed, { kind: 'slate-affix', key: copy + '|copy_direction', value: 'sparks_copy_' + direction });
    const rows = report(restored(placed)).componentProjection.rows.filter(r => r.effects.some(e => e.stat === 'spell_damage'));
    assert.equal(rows.length, 2);
    close(rows.find(r => !r.copiedFrom).effects.find(e => e.stat === 'spell_damage').value, expected);
    close(rows.find(r => r.copiedFrom === source).effects.find(e => e.stat === 'spell_damage').value, 9);
    assert.deepEqual(placed.sourceBuild, original);
  }
});

test('Fiend Crown reservation uses a valid roll once, and removing the crown restores the original mana', () => {
  let doc = edit(workspace(), { kind: 'character-input', key: 'intelligence', value: 100 });
  doc = edit(doc, { kind: 'skill-selection', rowIndex: 5, value: 'skills-ss14-current-precise-spell-amplification' });
  const condition = report(doc).componentProjection.rows.find(r => r.buffSkill === 5).conditionControls[0];
  doc = edit(doc, { kind: 'component-condition', key: condition.key, value: 1 });
  function check(doc, compensation) {
    const r = report(doc);
    const percent = 50 / (1 + compensation / 100);
    const buff = r.componentProjection.rows.find(row => row.buffSkill === 5);
    assert.equal(buff.mechanics.find(m => m.kind === 'nether-reservation').compensation, compensation);
    close(r.character.values.mana, 535);
    close(r.character.values.reservedManaPercent, percent);
    close(r.character.values.unreservedMana, 535 * (1 - percent / 100));
  }
  check(doc, 0);
  doc = edit(doc, { kind: 'gear-selection', slotIndex: 2, value: 'gear-tlidb-com-cn-fiend-crown' });
  check(doc, 0);
  const roll = report(doc).components.find(row => row.category === 'gear').calculations[0].controls.find(c => c.stat === 'sealed_mana_compensation');
  doc = edit(doc, { kind: 'gear-roll', slotIndex: 2, key: roll.key, value: 20 });
  check(restored(doc), 20);
  check(edit(doc, { kind: 'gear-selection', slotIndex: 2, value: '' }), 0);
  assert.equal(report(doc).fullDps.dps, null);
});

test('native and general support-slot editors enforce the same energy boundary', () => {
  const model = createSkillRuntimeModel(RUNTIME_CATALOG.datasets);
  const auras = getSeasonSelectionOptions('skills', 5).filter(r => SS14_CARDS_EN.records[r.id]?.tags?.includes('Aura')).slice(0, 4);
  assert.equal(auras.length, 4);
  for (const limit of [140, 190]) {
    let doc = workspace(limit);
    for (const [i, aura] of auras.entries()) {
      doc = edit(doc, { kind: 'skill-selection', rowIndex: i + 5, value: aura.id });
      doc = edit(doc, { kind: 'support-count', rowIndex: i + 5, value: 3 });
    }
    const input = { kind: 'support-count', rowIndex: 5, value: 4 };
    const general = updateUnlockedSupportCount(model, doc.targetBuild.skills, 'passive', 0, 4);
    assert.equal(getSkillEnergyUsage(doc.targetBuild.skills).used, 140);
    if (limit === 140) {
      const snapshot = exportSeasonWorkspace(doc);
      assert.throws(() => edit(doc, input), /에너지 한도 초과.*190\/140/u);
      assert.equal(exportSeasonWorkspace(doc), snapshot);
      assert.equal(general.status, 'energy-limit');
      assert.equal(getSkillEnergyUsage(general.state).used, 140);
      const existing = structuredClone(doc.targetBuild);
      existing.skills.passive[0].unlockedSupportCount = 4;
      const actual = calculate(existing);
      assert.equal(actual.fullDps.dps, null);
      assert.ok(actual.fullDps.blockers.some(r => r.includes('에너지 한도 초과')));
    } else {
      const atLimit = restored(edit(doc, input));
      assert.equal(getSkillEnergyUsage(atLimit.targetBuild.skills).used, 190);
      assert.equal(general.status, 'updated');
      assert.equal(getSkillEnergyUsage(general.state).used, 190);
      assert.ok(!report(atLimit).fullDps.blockers.some(r => r.includes('에너지 한도 초과')));
    }
  }
});

test('both activation media bind every tier and its roll endpoints without claiming trigger support', () => {
  const host = getSeasonSelectionOptions('skills', 0).find(r => SS14_CARDS_EN.records[r.id]?.tags?.includes('Defensive'));
  let base = edit(workspace(), { kind: 'skill-selection', rowIndex: 0, value: host.id });
  base = edit(base, { kind: 'support-count', rowIndex: 0, value: 1 });
  const slot = { rowIndex: 0, supportIndex: 0 };
  for (const name of ['perpetual-motion', 'spell-burst']) {
    const id = 'supports-ss14-current-activation-medium-' + name;
    let doc = edit(base, { kind: 'support-selection', ...slot, value: id });
    const support = d => report(d).components.find(c => c.id === id).calculations[0];
    for (const [tier, min, max] of [[3, -25, -15], [2, 7, 11], [1, 12, 19], [0, 20, 25]]) {
      doc = edit(doc, { kind: 'support-tier', ...slot, value: tier });
      const pick = support(doc);
      assert.equal(pick.tier, tier);
      assert.deepEqual(pick.controls.map(c => [c.min, c.max, c.value]), [[min, max, ''], [min, max, '']]);
      const change = key => ({ kind: 'support-roll', ...slot, key });
      assert.throws(() => edit(doc, { ...change(pick.controls[0].key), value: min - 1 }));
      assert.throws(() => edit(doc, { ...change(pick.controls[1].key), value: max + 1 }));
      doc = edit(doc, { ...change(pick.controls[0].key), value: min });
      doc = edit(doc, { ...change(pick.controls[1].key), value: max });
      const result = support(restored(doc));
      assert.deepEqual(result.controls.map(c => c.value), [min, max]);
      assert.ok(result.blockers.some(r => r.includes('효과 해석 미완료')));
      assert.deepEqual(result.effects, []);
    }
  }
});

test('Turmoil Burst rejects a minion spell while allowing an ordinary spell', () => {
  const id = 'supports-ss14-current-turmoil-burst';
  const card = seasonSupportItem(id).tlidbText.en;
  assert.match(card.detail, /Cannot support Minion Skills/u);
  const evaluation = { values: { baseDps: 100, averageHit: 100 } };
  const host = key => checkSeasonSupportHost(id, SS14_CARDS_EN.records['skills-tlidb-com-cn-' + key], evaluation, 0);
  assert.equal(host('summon-machine-guard'), false);
  assert.equal(host('ring-of-ice'), true);
  const actual = inspectSeasonSupport({ supportId: id, level: 20 }, { rowIndex: 0, supportIndex: 0 });
  assert.ok(actual.blockers.length);
  assert.deepEqual(actual.effects, []);
});
