import { getCatalogItems } from "./catalog.js";
import { SS14_LOG_SLATES } from "./data/ss14LogSlates.generated.js";
import { createDivinityBoard, createSlateInstance, addSlateToInventory, placeSlate } from "./divinityBoardModel.js";
import { seasonSlateEntry, seasonSlateTemplates, seasonSlateOptions } from "./seasonDivinity.js";
import { logGroupComplete } from "./gameLogSnapshot.js";

const special = { 1001: "starfire", 1003: "stars_fall", 1005: "corner_of_divinity", 1009: "void_gap",
  1010: "genealogy", 1011: "residence_of_stars", 1012: "moth_fire" };
const normalIds = new Set([260000, 260100, 260200, 260300, 260400, 260500].flatMap(n => [1, 2, 3, 4, 5, 6].map(v => n + v)));
const nativeOptions = new Map();
for (const item of getCatalogItems("slates")) {
  const entry = seasonSlateEntry(item.id);
  if (entry) nativeOptions.set(Number(entry.id), [...(nativeOptions.get(Number(entry.id)) ?? []), item.id]);
}
const fail = reason => { throw new Error(reason); };
const int = n => Number.isSafeInteger(n) && n >= 0;

export function logSlateCells(item) {
  const shape = SS14_LOG_SLATES.shapes[item.ShapeId];
  if (!shape) fail("설치 자료에 없는 석판 모양입니다.");
  // ItemMgr's explicit missing-Direction default is zero; never try rotations
  // until a piece happens to fit. Both observed position encodings are accepted.
  const direction = item.Direction ?? 0;
  if (!int(direction) || direction > 3 || shape.fixed && direction !== 0) fail("석판 회전 값이 모양 규칙과 일치하지 않습니다.");
  const pos = SS14_LOG_SLATES.positions[item.Index] ?? [Math.floor(item.Index / 10), item.Index % 10];
  if (!pos.every(n => Number.isInteger(n) && n >= 1 && n <= 6)) fail("석판 기준 위치를 확인할 수 없습니다.");
  return shape.cells.map(point => {
    let [x, y] = point;
    for (let i = 0; i < direction; i++) [x, y] = [-y, x];
    return { x: pos[0] - 1 + x, y: pos[1] - 1 + y };
  });
}

function optionIds(item) {
  const base = item.baseTalents ?? [], slots = item.talentSlots ?? [], legacy = item.enchantTalents ?? [];
  if (![base, slots, legacy].every(Array.isArray) || [base, slots, legacy].some(x => x.length > 8)) fail("석판 옵션 목록의 길이를 확인하세요.");
  const enchant = legacy.length > slots.length ? legacy : slots.map(s => s.talentId);
  const ids = [...base, ...enchant];
  if (!ids.every(int)) fail("석판 옵션 ID가 누락되거나 잘못되었습니다.");
  while (ids.at(-1) === 0) ids.pop();
  return ids;
}

function buildBoard(items, boardId) {
  let board = createDivinityBoard({ boardId });
  const bindings = {}, rows = [], reasons = [];
  if (!Array.isArray(items) || items.length > 48) fail("석판 보드 기록의 크기를 확인하세요.");
  for (const [i, item] of items.entries()) {
    if (item.removed) continue;
    const label = `석판 ${i + 1}`;
    try {
      if (item.PageId !== -4 || !int(item.Index) || item.unresolved || item.duplicate || item.invalidSlate) fail("석판 상세 또는 슬롯 기록이 불완전합니다.");
      const templateId = item.UniqueItmId > 0 ? special[item.UniqueItmId] : normalIds.has(item.BaseId) ? "six_gods" : null;
      if (!templateId) fail("SS14에 연결되지 않은 석판 종류입니다.");
      if (item.devilBlockAttrId || item.growCount || item.EnhanceId || item.CustomEnhancedTimes) fail("석판 성장·강화 효과의 SS14 연결이 필요합니다.");
      if (templateId === "six_gods" ? !(item.ShapeId >= 1000 && item.ShapeId < 2000)
        : !SS14_LOG_SLATES.specialShapes[item.UniqueItmId]?.includes(item.ShapeId)) fail("석판 종류와 기록된 모양이 일치하지 않습니다.");
      const cells = logSlateCells(item), anchor = { x: Math.min(...cells.map(c => c.x)), y: Math.min(...cells.map(c => c.y)) };
      const instanceId = `log-slate-${i + 1}`;
      const slate = createSlateInstance({ instanceId, slateId: templateId, shapeId: "custom",
        shape: cells.map(c => ({ x: c.x - anchor.x, y: c.y - anchor.y })), createdOrder: i });
      let candidate;
      try { candidate = placeSlate(addSlateToInventory(board, slate), instanceId, anchor); }
      catch { fail("석판이 허용 칸 밖에 있거나 다른 석판과 겹칩니다."); }
      const row = seasonSlateTemplates({ divinity: { activeBoardId: boardId, boards: [candidate] } }, { requireBindings: false }).find(r => r.slate.instanceId === instanceId);
      const ids = optionIds(item), slots = {}, controls = row.controls.filter(c => c.slot !== "copy_direction");
      if (ids.length > controls.length) fail("기록된 옵션 수가 SS14 석판 슬롯 수를 초과했습니다.");
      for (const [n, id] of ids.entries()) {
        if (id === 0) continue;
        const hits = (nativeOptions.get(id) ?? []).filter(value => seasonSlateOptions(controls[n].type).some(o => o.id === value));
        if (hits.length !== 1) fail(`${n + 1}번째 옵션의 SS14 ID·허용 종류를 확인할 수 없습니다.`);
        slots[controls[n].slot] = hits[0];
      }
      if (templateId !== "six_gods" && controls.some(c => !slots[c.slot])) fail("특수 석판의 옵션 기록이 빠져 있습니다.");
      const influence = item.InfluenceId ?? 0;
      // Exact installed locale IDs agree with the SS14 copy descriptions.
      if (templateId === "starfire") {
        const direction = SS14_LOG_SLATES.copyDirections[influence];
        if (!direction?.startsWith("sparks_copy_")) fail("복제 방향 기록을 확인할 수 없습니다.");
        slots.copy_direction = direction;
      } else if (templateId === "void_gap") {
        const direction = SS14_LOG_SLATES.copyDirections[influence];
        if (!["copy_left", "copy_right"].includes(direction)) fail("복제 방향 기록을 확인할 수 없습니다.");
        slots.copy_direction = direction;
      } else if (influence !== 0 && influence !== ({ moth_fire: 9001, residence_of_stars: 8001 }[templateId])) fail("석판 추가 효과의 SS14 연결을 확인할 수 없습니다.");
      bindings[instanceId] = { templateId, sourcePageSha256: row.page.sourcePageSha256, slots };
      board = candidate;
      rows.push({ name: row.name, index: item.Index, cells, options: Object.entries(slots).map(([key, id]) => {
        const control = row.controls.find(c => c.slot === key), option = seasonSlateOptions(control.type).find(o => o.id === id);
        return { slot: key, id, detail: option.detail };
      }) });
    } catch (error) { reasons.push(`${label}: ${error.message}`); }
  }
  // Validate caps against the final board, not a partially built prefix.
  for (const row of seasonSlateTemplates({ divinity: { activeBoardId: boardId, boards: [board] } }, { requireBindings: false })) {
    if (row.cap && board.slateInventory.filter(s => s.slateId === row.slate.slateId).length > row.cap) reasons.push(`${row.name}: SS14 활성 개수 상한을 초과했습니다.`);
  }
  return { board, bindings, rows, reasons: [...new Set(reasons)] };
}

export function previewLogSlates(record) {
  if (!record.slatesObserved && !(record.slates?.length || record.changes?.some(c => c.page === -4))) return null;
  const result = buildBoard(record.slates ?? [], "ss14-log-divinity");
  if (!record.slatesObserved || record.slatesMalformed || !logGroupComplete(record, "slates") || record.parseErrors || record.changedAfterSnapshot)
    result.reasons.unshift("석판 보드 전체 기록이 불완전합니다. 완전한 로그인 기록을 선택하세요.");
  return { ...result, record: { slates: structuredClone(record.slates ?? []), slatesObserved: record.slatesObserved,
    slatesMalformed: record.slatesMalformed, verdict: record.verdict, groupCompleteness: record.groupCompleteness,
    parseErrors: record.parseErrors, changedAfterSnapshot: record.changedAfterSnapshot },
    selected: !result.reasons.length, blocked: !!result.reasons.length,
    empty: !record.slates?.some(s => !s.removed) };
}

export function applyLogSlates(target, preview) {
  preview = previewLogSlates(preview.record);
  if (!preview) fail("석판 보드 기록이 없습니다.");
  if (preview.blocked || preview.reasons.length) fail("석판 보드의 미확인 기록을 먼저 확인하세요.");
  const id = target.divinity?.activeBoardId || preview.board.boardId;
  const board = structuredClone(preview.board); board.boardId = id;
  const priorIds = new Set(target.divinity?.boards?.find(b => b.boardId === id)?.slateInventory.map(s => s.instanceId) ?? []);
  target.divinity = { ...target.divinity, activeBoardId: id,
    boards: [...(target.divinity?.boards ?? []).filter(b => b.boardId !== id), board] };
  target.selections = { ...target.selections, slates: [] };
  target.selectionProjection = { ...target.selectionProjection, slates: [] };
  target.ss14Inputs.slateSelections = Object.fromEntries(Object.entries(target.ss14Inputs.slateSelections ?? {}).filter(([key]) => !priorIds.has(key)));
  for (const slate of board.slateInventory) {
    const oldId = slate.instanceId, newId = globalThis.crypto.randomUUID();
    slate.instanceId = newId;
    for (const cell of board.cells) if (cell.slateInstanceId === oldId) cell.slateInstanceId = newId;
    target.ss14Inputs.slateSelections[newId] = structuredClone(preview.bindings[oldId]);
  }
}
