import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultBuild } from "../src/engine.js";
import { createSeasonPlanner } from "../src/seasonPlanner.js";
import { renderSeasonPlanner } from "../src/seasonPlannerView.js";
import { editSeasonWorkspace, saveSeasonWorkspace, loadSeasonWorkspaces, exportSeasonWorkspace, importSeasonWorkspace } from "../src/seasonWorkspace.js";
import { seasonHeroOptions, seasonHeroTraitOptions } from "../src/seasonHeroSelection.js";
import { seasonMemoryOptions, seasonSpiritOptions, seasonTalentNodes } from "../src/seasonNativeSelections.js";
import { theaCombatDocument } from "./fixtures/ss14TheaCombatFixture.mjs";
import { seasonSlateTemplates, seasonSlateOptions } from "../src/seasonDivinity.js";

function store(original = createDefaultBuild()) {
  const values = new Map([["tob.currentBuild.v2", JSON.stringify(original)], ["tob.savedBuilds.v2", JSON.stringify([original])]]);
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)) };
}
test("빌드 파일 가져오기에서 닫은 창·늦은 읽기·잘못된 JSON은 저장 사본을 덮어쓰지 않는다", async () => {
  const fixture=theaCombatDocument(), storage=store(fixture.sourceBuild);
  saveSeasonWorkspace(storage,fixture);
  const planner=createSeasonPlanner(storage,fixture.sourceBuild);
  const original=[...storage.values];
  planner.state.overlay={type:"files"};
  await planner.readBuildFile({size:1,text:async()=> "{"});
  assert.match(planner.state.error,/JSON/u);
  assert.deepEqual([...storage.values],original);
  let resolve;
  const delayed={size:1,text:()=>new Promise(done=>{resolve=done;})};
  const first=planner.readBuildFile(delayed);
  planner.closeOverlay();
  resolve(exportSeasonWorkspace(fixture));
  await first;
  assert.deepEqual([...storage.values],original);
  planner.state.overlay={type:"files"};
  const second=planner.readBuildFile(delayed);
  await planner.readBuildFile({size:1,text:async()=>exportSeasonWorkspace(fixture)});
  const newId=planner.state.document.id;
  resolve(exportSeasonWorkspace(fixture));
  await second;
  assert.equal(planner.state.document.id,newId);
  assert.notEqual(newId,fixture.id);
  const documents=loadSeasonWorkspaces(storage).documents;
  assert.equal(documents.length,2);
  assert.deepEqual(documents.find(d=>d.id===fixture.id).targetBuild,fixture.targetBuild);
});
test("SS14 본체가 저장 사본을 직접 계산·편집·저장·복원하며 원본 바이트를 유지한다", () => {
  const fixture = theaCombatDocument(), storage = store(fixture.sourceBuild);
  const original = storage.getItem("tob.currentBuild.v2"), originals = storage.getItem("tob.savedBuilds.v2");
  saveSeasonWorkspace(storage, fixture);
  const planner = createSeasonPlanner(storage, fixture.sourceBuild);
  assert.equal(planner.state.report.fullDps.supported, true);
  const before = planner.state.report.fullDps.dps;
  planner.edit({ kind: "thea-event", key: "igniteBaseMin", value: 200 });
  planner.edit({ kind: "thea-event", key: "igniteBaseMax", value: 200 });
  planner.save();
  const after = planner.state.report.fullDps.dps;
  assert.ok(after > before);
  const reopened = createSeasonPlanner(storage, fixture.sourceBuild);
  assert.equal(reopened.state.report.fullDps.dps, after);
  assert.equal(reopened.state.document.id, planner.state.document.id);
  assert.equal(storage.getItem("tob.currentBuild.v2"), original);
  assert.equal(storage.getItem("tob.savedBuilds.v2"), originals);
  assert.deepEqual(importSeasonWorkspace(exportSeasonWorkspace(planner.state.document)).targetBuild.ss14Inputs, planner.state.document.targetBuild.ss14Inputs);
});
test("새 본체 진입은 저장소를 쓰지 않으며 스킬·장비·보조 선택은 SS14 문서에만 적용한다", () => {
  const storage = store(), before = [...storage.values];
  const p = createSeasonPlanner(storage, createDefaultBuild());
  assert.deepEqual([...storage.values], before);
  p.edit({ kind: "skill-selection", rowIndex: 0, value: "skills-tlidb-com-cn-ice-lances" });
  p.edit({ kind: "support-count", rowIndex: 0, value: 5 });
  p.edit({ kind: "skill-level", rowIndex: 0, value: 20 });
  p.edit({ kind: "gear-selection", slotIndex: 4, value: "gear-tlidb-com-cn-ownerless" });
  p.save();
  const saved = loadSeasonWorkspaces(storage).documents[0];
  assert.equal(saved.targetBuild.skills.active[0].unlockedSupportCount, 5);
  assert.equal(saved.targetBuild.skills.active[0].level, 20);
  assert.equal(saved.targetBuild.gear.slots[4].itemId, "gear-tlidb-com-cn-ownerless");
  assert.equal(saved.targetBuild.patchSnapshot.season, "SS14");
  for (const [key, value] of before) assert.equal(storage.getItem(key), value);
  assert.equal(p.state.report.fullDps.supported, false, "미입력 전투 조건을 임의로 0으로 채우지 않는다");
});
test("모든 SS14 히어로가 현행 페이지의 특성을 선택하며 추억은 다른 편집 후에도 보존된다", () => {
  const base = createSeasonPlanner(store(), createDefaultBuild()).state.document;
  for (const hero of seasonHeroOptions()) {
    let doc = editSeasonWorkspace(base, { kind: "hero-selection", value: hero.id });
    const trait = seasonHeroTraitOptions(hero.id).find(t => t.level === 45);
    if (trait) doc = editSeasonWorkspace(doc, { kind: "hero-choice", key: "45", value: trait.key });
    const memory = seasonMemoryOptions(0).bases[0];
    doc = editSeasonWorkspace(doc, { kind: "memory-selection", slotIndex: 0, value: memory.id });
    doc = editSeasonWorkspace(doc, { kind: "hero-level", value: 95 });
    const storage = store(); saveSeasonWorkspace(storage, doc);
    const restored = loadSeasonWorkspaces(storage).documents[0];
    assert.equal(restored.targetBuild.hero.branchId, hero.id);
    assert.equal(restored.targetBuild.hero.memories[0].baseAttributeId, memory.id);
    assert.equal(restored.targetBuild.heroLevel, 95);
    if (trait) assert.equal(restored.targetBuild.ss14Inputs.heroSelection.choices[45], trait.key);
  }
});
test("추억 미장착 확인은 빈 단계만 제외하고 재장착 시 원래 단계 입력을 요구한다", () => {
  const storage = store(), original = [...storage.values];
  const p = createSeasonPlanner(storage, createDefaultBuild());
  p.edit({kind:"hero-selection",value:"hero-tlidb-com-cn-creative-genius"});
  p.edit({kind:"hero-combat",key:"signal",value:1});
  assert.ok(p.state.report.fullDps.blockers.some(s => s.includes("45레벨 히어로 특성")));
  for (const key of ["45","60","75"]) p.edit({kind:"hero-choice",key,value:"no-memory"});
  assert.equal(p.state.document.targetBuild.ss14Inputs.heroCombat.signal,1);
  assert.ok(!p.state.report.fullDps.blockers.some(s => /(?:45|60|75)레벨 히어로 특성/u.test(s)));
  assert.equal(p.state.document.targetBuild.hero.traitSelections.length,1);
  const reopened = importSeasonWorkspace(exportSeasonWorkspace(p.state.document));
  assert.equal(reopened.targetBuild.ss14Inputs.heroSelection.choices[45],"no-memory");
  assert.throws(() => editSeasonWorkspace(reopened,{kind:"hero-choice",key:1,value:"no-memory"}));
  p.edit({kind:"memory-selection",slotIndex:0,value:seasonMemoryOptions(0).bases[0].id});
  assert.equal(p.state.document.targetBuild.ss14Inputs.heroSelection.choices[45],undefined);
  assert.ok(p.state.report.fullDps.blockers.some(s => s.includes("45레벨 히어로 특성")));
  assert.throws(() => editSeasonWorkspace(p.state.document,{kind:"hero-choice",key:45,value:"no-memory"}));
  for (const [key,value] of original) assert.equal(storage.getItem(key),value);
});
test("SS14 재능 상한과 정령 승급 표로 선택하고 저장한다", () => {
  const storage = store(), p = createSeasonPlanner(storage, createDefaultBuild());
  p.edit({ kind: "talent-board", slotIndex: 0, value: "Goddess_of_Knowledge" });
  const node = seasonTalentNodes("Goddess_of_Knowledge").find(n => n.required === 0);
  assert.ok(node);
  p.edit({ kind: "talent-node", slotIndex: 0, key: node.id, value: node.max });
  assert.throws(() => p.edit({ kind: "talent-node", slotIndex: 0, key: node.id, value: node.max + 1 }));
  const cores = seasonTalentNodes("Goddess_of_Knowledge").filter(n => n.core);
  assert.equal(cores.length, 6, "공통 Talent 색인에 있는 핵심 재능도 SS14 패널에서 선택할 수 있어야 함");
  assert.ok(cores.every(n => n.max === 1 && [12, 24].includes(n.required)));
  p.edit({ kind: "talent-node", slotIndex: 0, key: cores[0].id, value: 1 });
  const spirit = seasonSpiritOptions()[0]; assert.ok(spirit && /[가-힣]/u.test(spirit.name));
  p.edit({ kind: "spirit-selection", slotIndex: 0, value: spirit.id });
  p.edit({ kind: "spirit-level", slotIndex: 0, value: spirit.levels.at(-1) });
  p.save();
  assert.equal(p.state.document.targetBuild.talents.boards[0].nodePoints[node.id], node.max);
  assert.deepEqual(loadSeasonWorkspaces(storage).documents[0].targetBuild.talents.boards[0].coreTalentIds, [cores[0].id]);
  assert.equal(p.state.document.targetBuild.pact.slots[0].spirit.level, spirit.levels.at(-1));
});
test("SS14 본체 모든 메뉴와 선택 창이 동일 문서에서 렌더링된다", () => {
  const fixture = theaCombatDocument(), storage = store(fixture.sourceBuild);
  saveSeasonWorkspace(storage, fixture);
  const p = createSeasonPlanner(storage, fixture.sourceBuild);
  for (const section of ["hero", "skills", "gear", "talents", "divinity", "pact", "combat"]) {
    p.state.section = section;
    const html = renderSeasonPlanner(p.state);
    assert.match(html, /data-role="ss14-main-editor"/u);
    assert.doesNotMatch(html, /TLIDB SS13 원문|대상·연산·수치|91TOB 내보내기/u);
  }
  for (const type of ["hero", "traits", "skills", "gear", "memory", "talents", "pact", "saves", "files"]) {
    p.state.overlay = { type, index: 0 };
    assert.match(renderSeasonPlanner(p.state), /role="dialog"/u);
  }
});

test("본체 석판은 SS14 옵션을 배치·저장하며 해제한 옵션을 되살리지 않는다", () => {
  const storage = store(), p = createSeasonPlanner(storage, createDefaultBuild());
  p.edit({ kind: "slate-add", value: "corner_of_divinity", key: "b_1" });
  const row = seasonSlateTemplates(p.state.document.targetBuild, { requireBindings: false })[0];
  assert.equal(row.controls.length, 2);
  for (const c of row.controls) p.edit({ kind: "slate-affix", key: c.key, value: seasonSlateOptions(c.type)[0].id });
  p.save();
  assert.equal(loadSeasonWorkspaces(storage).documents[0].targetBuild.ss14Inputs.slateSelections[row.slate.instanceId].templateId, "corner_of_divinity");
  p.edit({ kind: "slate-remove", key: row.slate.instanceId });
  p.save();
  const target = loadSeasonWorkspaces(storage).documents[0].targetBuild;
  assert.equal(target.divinity.boards[0].cells.length, 0);
  assert.equal(target.ss14Inputs.slateSelections[row.slate.instanceId], undefined);
});

test("입력 오류와 동시 저장 충돌은 원본·SS14 저장본을 덮어쓰지 않는다", () => {
  const fixture = theaCombatDocument(), storage = store(fixture.sourceBuild);
  saveSeasonWorkspace(storage, fixture);
  const first = createSeasonPlanner(storage, fixture.sourceBuild), second = createSeasonPlanner(storage, fixture.sourceBuild);
  first.edit({ kind: "name", value: "먼저 저장" }); first.save();
  const saved = storage.getItem("tob.season-workspaces.v1");
  second.edit({ kind: "name", value: "충돌한 저장" });
  assert.throws(() => second.save(), /다른 탭/u);
  second.state.pending.set("bad-input", { kind: "skill-level", rowIndex: 0, value: 999 });
  assert.throws(() => second.flush());
  assert.equal(second.state.document.targetBuild.skills.active[0].level, 20);
  assert.equal(storage.getItem("tob.season-workspaces.v1"), saved);
});

test("이전 SS14 히어로 사본은 원본 추억을 되살리지 않고 다시 열린다", () => {
  const doc = theaCombatDocument();
  delete doc.targetBuild.ss14Inputs.heroMemoryMode;
  const sourceMemory = { instanceId: "preserved-source-memory", memoryTypeId: seasonMemoryOptions(0).flatCatalogId,
    baseAttributeId: seasonMemoryOptions(0).bases[0].id, enhancement: 1, fixedAffixIds: [], randomAffixIds: [], affixRolls: {} };
  doc.sourceBuild.hero.memories = [sourceMemory];
  doc.targetBuild.ss14Inputs.configurations.hero.fields.hero.memories = [sourceMemory];
  const imported = importSeasonWorkspace(exportSeasonWorkspace(doc));
  assert.deepEqual(imported.targetBuild.hero.memories, []);
  assert.deepEqual(imported.sourceBuild.hero.memories, [sourceMemory]);
  const edited = editSeasonWorkspace(imported, { kind: "memory-selection", slotIndex: 0, value: sourceMemory.baseAttributeId });
  assert.equal(edited.targetBuild.hero.memories[0].baseAttributeId, sourceMemory.baseAttributeId);
});
