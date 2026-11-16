import { createDefaultBuild } from "../../src/engine.js";
import { getCatalogItems } from "../../src/catalog.js";
import { createDivinityBoard, addSlateToInventory, placeSlate } from "../../src/divinityBoardModel.js";
import { createDivinitySlateInstance } from "../../src/divinitySlateModel.js";
import { createSeasonWorkspace, editSeasonWorkspace } from "../../src/seasonWorkspace.js";
import { prepareSeasonMigration } from "../../src/seasonMigration.js";

export function ss14DpsDocument(slateKeys = []) {
  const source = createDefaultBuild(); source.name = "SS14 아이스 링 DPS 검증";
  if (slateKeys.length) {
    const slots = Object.fromEntries(slateKeys.map((key, i) => {
      const item = getCatalogItems("slates").find(s => s.tlidbText?.en?.sourceRecordKey === `data-id:${key}`);
      if (!item) throw new Error(`missing-slate:${key}`);
      return [`slot_${i + 1}`, { valueType: "talent_affix", valueId: item.id }];
    }));
    let board = createDivinityBoard({ boardId: "dps-test-board" });
    board = addSlateToInventory(board, createDivinitySlateInstance({ instanceId: "dps-test-slate", templateId: "six_gods", slotSelectionsByKey: slots }));
    board = placeSlate(board, "dps-test-slate", { x: 0, y: 2 });
    source.divinity = { boards: [board], activeBoardId: board.boardId };
  }
  let doc = createSeasonWorkspace(prepareSeasonMigration(source));
  doc = editSeasonWorkspace(doc, { kind: "skill-selection", rowIndex: 0, value: "skills-tlidb-com-cn-ring-of-ice" });
  for (const [key, value] of Object.entries({ strength: 0, dexterity: 0, intelligence: 100 })) doc = editSeasonWorkspace(doc, { kind: "character-input", key, value });
  doc = editSeasonWorkspace(doc, { kind: "offense-input", key: "0", value: 500 });
  for (const [key, value] of Object.entries({ "enemy:armor": 0, "enemy:cold": 0, "0:useShare": 100, "0:hitChance": 100, "0:repeatHits": 0 }))
    doc = editSeasonWorkspace(doc, { kind: "dps-input", key, value });
  return doc;
}
