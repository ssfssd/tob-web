import { createDefaultBuild } from './engine.js';
import { prepareSeasonMigration } from './seasonMigration.js';
import { createSeasonWorkspace, editSeasonWorkspace } from './seasonWorkspace.js';
import { captureShelf } from './seasonShelf.js';
import { craftOptions, itemGearKind } from './seasonItemCraft.js';
import { getSeasonSelectionOptions } from './seasonSelections.js';

const emptyDocument = () => createSeasonWorkspace(prepareSeasonMigration(createDefaultBuild()));
export function createItemWorkshop(kind, index) {
  if (!['memory','gear'].includes(kind) || !Number.isInteger(index) || index < 0 || index >= (kind === 'memory' ? 3 : 10))
    throw Error('제작할 슬롯을 선택하세요.');
  return { type:'workshop', kind, index, category:'base', name:'', document:emptyDocument(), pending:new Map() };
}
export function editItemWorkshop(draft, doc, edit) {
  const index = draft.index;
  if (edit.kind === 'gear-selection') {
    if (edit.value && (!getSeasonSelectionOptions('gear', index).some(r => r.id === edit.value) || itemGearKind(edit.value) !== draft.category))
      throw Error('선택한 슬롯과 장비 종류를 확인하세요.');
    return editSeasonWorkspace(emptyDocument(), edit);
  }
  if (edit.kind === 'workshop-affix' || edit.kind === 'workshop-remove') {
    const entry = captureShelf(doc.targetBuild, 'gear', index);
    const option = craftOptions(entry.item.itemId).find(o => o.key === edit.value);
    if (!option) throw Error('이 장비에 적용할 수 있는 SS14 제작 옵션을 선택하세요.');
    const crafts = entry.item.crafts ??= {};
    const previous = crafts[option.affixId];
    if (previous) {
      const old = craftOptions(entry.item.itemId).find(o => o.affixId === previous.affixId && o.tierId === previous.tierId);
      if (old) for (const key of Object.keys(entry.craftRolls)) if (key.startsWith('craft:'+index+':'+old.modifierId+':')) delete entry.craftRolls[key];
    }
    if (edit.kind === 'workshop-remove') delete crafts[option.affixId];
    else {
      const count = Object.keys(crafts).filter(id => id.split(':')[1] === option.family).length;
      if (!previous && count >= 3) throw Error('접두 옵션과 접미 옵션은 각각 3개까지 선택할 수 있습니다.');
      crafts[option.affixId] = { affixId:option.affixId, tierId:option.tierId };
    }
    return editSeasonWorkspace(doc, { kind:'shelf-apply', slotIndex:index, value:entry });
  }
  return editSeasonWorkspace(doc, edit);
}
export function finishedWorkshopItem(draft) {
  const entry = captureShelf(draft.document.targetBuild, draft.kind, draft.index);
  if (draft.name.trim()) entry.name = draft.name.trim();
  return entry;
}
