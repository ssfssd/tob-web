import { itemFields } from "./gameLogSnapshot.js";

const instancePattern = /^\d+_[0-9a-f-]{20,}$/iu;
const eventPattern = /ItemChange@ (Add|Update|Delete) Id=(\d+_[0-9a-f-]{20,})(?: BagNum=\d+)? in PageId=(-?\d+) SlotId=(\d+)/iu;
const families = { "-1": "gear", "-6": "skills", "-4": "slates" };
const values = value => value && typeof value === "object" ? Object.values(value) : [];

// Instance IDs never leave this closure. Events and projected slots contain
// allowlisted numeric fields only, including when an event cannot be resolved.
export function createGameLogReplay(record, root) {
  const cache = new Map(), slots = new Map(), changes = [];
  let generation = 0, changeCount = 0, unknownCount = 0;
  const key = (page, index) => `${page}:${index}`;
  function observe(tree) {
    generation++;
    const pending = [tree];
    while (pending.length) {
      const node = pending.pop();
      if (!node || typeof node !== "object") continue;
      if (instancePattern.test(node.Id ?? "") && Number.isFinite(node.BaseId)
        && Number(node.Id.split("_")[0]) === node.BaseId) {
        cache.set(node.Id, { fields: itemFields(node), generation });
      }
      pending.push(...values(node).filter(v => v && typeof v === "object"));
    }
  }
  observe(root);
  for (const [field, page] of [["wearItems", -1], ["dressSkillItems", -6], ["dressingTalentBlocks", -4]]) {
    for (const row of values(root.bag?.[field])) {
      if (!Number.isInteger(row.Index) || row.PageId !== page || !Number.isFinite(row.Item?.BaseId)) continue;
      const slotKey = key(page, row.Index), previous = slots.get(slotKey);
      slots.set(slotKey, { page, index: row.Index, instance: instancePattern.test(row.Item.Id ?? "") ? row.Item.Id : null,
        fields: itemFields(row.Item), generation, duplicate: !!previous, sourceLine: record.source.startLine });
    }
  }
  function event(text, line) {
    if (!text.includes("ItemChange@")) return;
    const reset = text.match(/ItemChange@ Reset PageId=(-?\d+)\s*$/u);
    if (reset) {
      const page = Number(reset[1]);
      if (!families[page]) return;
      // ItemMgr.InitPageItemList clears this page, then emits Add for its items.
      // Keep tombstones for old slots so a partial reset never inherits equipment.
      for (const [slotKey, slot] of slots) if (slot.page === page)
        slots.set(slotKey, { page, index: slot.index, removed: true, sourceLine: line });
      changes.push({ action: "Reset", page, sourceLine: line, status: "reflected" });
      changeCount++;
      if (changes.length > 200) changes.shift();
      return;
    }
    const match = text.match(eventPattern);
    if (!match) { unknownCount++; return; }
    const [, action, instance, pageText, slotText] = match, page = Number(pageText), index = Number(slotText);
    if (!families[page]) return;
    changeCount++;
    const slotKey = key(page, index), prior = slots.get(slotKey);
    const detail = cache.get(instance);
    let status = "reflected";
    if (action === "Delete") {
      // An old instance can be removed after its replacement was added.
      if (prior?.instance && prior.instance !== instance) status = "superseded";
      else slots.set(slotKey, { page, index, removed: true, sourceLine: line });
    } else {
      for (const [otherKey, slot] of slots) if (otherKey !== slotKey && slot.page === page && slot.instance === instance)
        slots.set(otherKey, { page, index: slot.index, removed: true, sourceLine: line });
      const requiresFresh = action === "Update" && prior?.instance === instance
        && (!detail || detail.generation <= prior.generation);
      slots.set(slotKey, { page, index, instance, fields: detail?.fields, generation: detail?.generation ?? 0,
        freshAfter: requiresFresh ? generation : null, sourceLine: line });
    }
    changes.push({ action, page, index, sourceLine: line, status });
    if (changes.length > 200) changes.shift();
  }
  function finish() {
    const result = { ...record, loginSnapshot: record, gear: [], skills: [], slates: [], changes, changeCount, unknownChangeCount: unknownCount };
    for (const slot of slots.values()) {
      const detail = slot.instance ? cache.get(slot.instance) : null;
      const fields = detail?.fields ?? slot.fields;
      const unresolved = !slot.removed && (!fields || slot.freshAfter !== null && slot.freshAfter !== undefined
        && (!detail || detail.generation <= slot.freshAfter));
      result[families[slot.page]].push({ PageId: slot.page, Index: slot.index,
        ...(slot.removed ? { removed: true } : fields ?? { BaseId: Number(slot.instance?.split("_")[0]) }),
        ...(unresolved ? { unresolved: true } : {}),
        ...(slot.duplicate ? { duplicate: true } : {}),
        sourceLine: slot.sourceLine });
    }
    // Unknown event syntax affects the whole selected session, never another login.
    result.changedAfterSnapshot = unknownCount > 0;
    return result;
  }
  return { observe, event, finish, uncertain: () => { unknownCount++; } };
}
