import { SS14_MECHANICS } from "./data/ss14Mechanics.generated.js";
import { createDivinityBoard, createSlateInstance, addSlateToInventory, autoPlaceSlate, moveSlate, rotatePlacedSlate, deleteSlateInstance, placeSlate, canPlaceSlate, transformedShape, DIVINITY_SHAPES } from "./divinityBoardModel.js";
import { SS14_LOG_SLATES } from './data/ss14LogSlates.generated.js';
import { captureSeasonConfiguration } from "./seasonConfiguration.js";
import { pinSeasonComponentReceipts } from "./seasonComponents.js";
import { seasonMechanicPins } from "./seasonMechanicInputs.js";
import { isSeasonNether, netherSlateOptions, netherLayouts, netherReceipt, netherQualityOptions, netherTalentOptions } from './seasonNether.js';

const types = { corner_of_divinity: "A_Corner_of_Divinity", stars_fall: "Fallen_Starlight", starfire: "Sparks_of_Moth_Fire",
  moth_fire: "When_Sparks_Set_the_Prairie_Ablaze", void_gap: "Space_Rift", residence_of_stars: "Residence_of_Stars", genealogy: "Pedigree_of_Gods" };
export function nativeSlateOptions() {
  return [...netherSlateOptions(), {id:'six_gods',name:'일반 신격 석판',cap:null}, ...Object.entries(types).flatMap(([id, slug]) => {
    const en = SS14_MECHANICS.pages[`en/${slug}`], ko = SS14_MECHANICS.pages[`ko/${slug}`];
    if (en?.season !== "SS14" || ko?.season !== "SS14" || !/[가-힣]/u.test(ko.title) || /\p{Script=Han}/u.test(ko.title)) return [];
    return [{ id, name: ko.title, cap: Number(en.body.match(/Max Active Divinity Slates?: (\d+)/u)?.[1]) || null }];
  })];
}
const installedTypes = {starfire:1001, stars_fall:1003, corner_of_divinity:1005, void_gap:1009, genealogy:1010, residence_of_stars:1011, moth_fire:1012};
export function nativeSlateShapes(templateId) {
  // Retain the explicit historical geometry API for saved fixtures/documents.
  if (!templateId) return Object.entries(DIVINITY_SHAPES).filter(([id]) => /^[ab]_[1-4]$/u.test(id)).map(([id, shape]) => ({id, shape}));
  const ids = templateId === 'six_gods' ? [1010,1020,1030,1040,1050,1060] : SS14_LOG_SLATES.specialShapes[installedTypes[templateId]] ?? [];
  return ids.map(id => {
    const source = SS14_LOG_SLATES.shapes[id], minX = Math.min(...source.cells.map(c=>c[0])), minY = Math.min(...source.cells.map(c=>c[1]));
    return {id:String(id), shape:source.cells.map(([x,y])=>({x:x-minX,y:y-minY})), fixed:source.fixed};
  });
}
export function nativeSlateDraft(type, shapeId, rotation = 0) {
  const shape = nativeSlateShapes(type).find(s=>s.id===shapeId);
  if (!shape) throw new Error('석판 종류에 맞는 모양을 선택하세요.');
  return createSlateInstance({instanceId:'slate-preview',slateId:type,shapeId:'custom',shape:shape.shape,rotation:shape.fixed?0:rotation});
}
export function canPlaceNativeSlate(board, slate, anchor) {
  if (!Number.isInteger(anchor?.x) || !Number.isInteger(anchor?.y)) return false;
  const candidate = {...board,slateInventory:[...board.slateInventory.filter(s=>s.instanceId!==slate.instanceId),slate]};
  return canPlaceSlate(candidate,slate.instanceId,anchor) && transformedShape(slate.shape,slate.rotation,slate.flippedH,slate.flippedV)
    .every(p=>board.mask?.[anchor.y+p.y]?.[anchor.x+p.x]===1);
}
function placeNativeSlate(board, slate, anchor) {
  if (!canPlaceNativeSlate(board,slate,anchor)) throw new Error('다른 석판과 겹치거나 보드 밖입니다. 빈 위치를 선택하세요.');
  return placeSlate(board,slate.instanceId,anchor);
}
export function editNativeDivinity(target, edit) {
  if (!["slate-add", "slate-remove", "slate-shape", "slate-rotate", "slate-move", "slate-x", "slate-y", "nether-layout", "nether-quality", "nether-banishment"].includes(edit.kind)) return false;
  target.divinity ??= { boards: [] };
  let board = target.divinity.boards.find(b => b.boardId === target.divinity.activeBoardId);
  if (!board) {
    if (edit.kind !== "slate-add") throw new Error("신격 패널을 선택하세요.");
    board = createDivinityBoard({ boardId: "ss14-divinity" });
    target.divinity.boards.push(board); target.divinity.activeBoardId = board.boardId;
  }
  if (edit.kind === "slate-add") {
    const option = nativeSlateOptions().find(o => o.id === edit.value), shape = [...nativeSlateShapes(edit.value),...nativeSlateShapes()].find(o => o.id === edit.key);
    if (!option || !shape && !isSeasonNether(option.id)) throw new Error("SS14 석판과 배치 모양을 선택하세요.");
    const placed = new Set(board.cells.map(c => c.slateInstanceId));
    if (option.cap && board.slateInventory.filter(s => s.slateId === option.id && placed.has(s.instanceId)).length >= option.cap) throw new Error("SS14 석판 활성 개수 상한에 도달했습니다.");
    if(isSeasonNether(option.id)) {
      if(board.slateInventory.some(s=>isSeasonNether(s.slateId)||s.slateId.startsWith('hades_')))throw new Error('명왕의 신격은 하나만 추가할 수 있습니다.');
      let next;
      for(const layout of netherLayouts(option.id).filter(l=>!edit.layout||l.id===edit.layout)){
        const slate=createSlateInstance({instanceId:globalThis.crypto.randomUUID(),slateId:option.id,shape:layout.shape,
          nether:{layout:layout.id,receipt:netherReceipt(),qualities:layout.cells.map(()=> 'blue')}});
        if(edit.anchor && (edit.anchor.x!==layout.anchor.x||edit.anchor.y!==layout.anchor.y))continue;
        try {next=placeNativeSlate(addSlateToInventory(board,slate),slate,layout.anchor);break;} catch { /* Try the next source-backed position. */ }
      }
      if(!next)throw new Error('명왕을 배치할 수 있는 위치를 비워 주세요.');board=next;
    } else {
      const slate = createSlateInstance({ instanceId: globalThis.crypto.randomUUID(), slateId: option.id, shapeId: shape.id, shape:shape.shape, rotation:shape.fixed?0:edit.rotation??0 });
      const candidate=addSlateToInventory(board, slate);
      board = edit.anchor ? placeNativeSlate(candidate,slate,edit.anchor) : autoPlaceSlate(candidate, slate.instanceId);
    }
  } else {
    const slate = board.slateInventory.find(s => s.instanceId === edit.key);
    if (!slate) throw new Error("배치한 석판을 찾을 수 없습니다.");
    if (edit.kind === "slate-remove") {
      board = deleteSlateInstance(board, edit.key);
      if (target.ss14Inputs.slateSelections) delete target.ss14Inputs.slateSelections[edit.key];
    } else if(edit.kind==='nether-layout') {
      const layout=netherLayouts(slate.slateId).find(l=>l.id===edit.value);
      if(!layout)throw new Error('현재 자료에 있는 명왕 배치를 선택하세요.');
      if(layout.cells.length!==slate.shape.length&&Object.keys(slate.slotSelectionsByKey??{}).length)throw new Error('소켓 수를 바꾸려면 장착된 명왕 옵션을 먼저 해제하세요.');
      const replacement=createSlateInstance({...slate,shape:layout.shape,nether:{...slate.nether,layout:layout.id,qualities:layout.cells.map((_,i)=>slate.nether.qualities[i]??'blue')}});
      board=placeSlate(addSlateToInventory(deleteSlateInstance(board,slate.instanceId),replacement),slate.instanceId,layout.anchor);
    } else if(edit.kind==='nether-quality') {
      const slot=edit.slotIndex??edit.slot;
      if(!isSeasonNether(slate.slateId)||!netherQualityOptions.some(q=>q.id===edit.value)||!Number.isInteger(slot)||!slate.nether.qualities[slot])throw new Error('명왕 소켓 색상을 확인하세요.');
      const chosen=slate.slotSelectionsByKey?.[`slot_${slot+1}`]?.valueId;
      if(chosen&&!netherTalentOptions(`nether:${edit.value}`).some(t=>t.id===chosen))throw new Error('장착 재능을 해제한 뒤 소켓 색상을 바꾸세요.');
      slate.nether.qualities[slot]=edit.value;
    } else if(edit.kind==='nether-banishment') {
      if(slate.slateId!=='nether_banishment'||!Number.isInteger(Number(edit.value))||Number(edit.value)<1||Number(edit.value)>10)throw new Error('추방 효과를 선택하세요.');
      slate.nether.banishment=Number(edit.value);
    } else if(isSeasonNether(slate.slateId)) throw new Error('명왕은 배치 선택에서 허용된 위치를 선택하세요.');
    else if (edit.kind === 'slate-shape') {
      const shape=nativeSlateShapes(slate.slateId).find(s=>s.id===edit.value);
      if(!shape)throw new Error('석판 종류에 맞는 모양을 선택하세요.');
      const replacement=createSlateInstance({...slate,shapeId:'custom',shape:shape.shape,rotation:shape.fixed?0:edit.rotation??0,flippedH:false,flippedV:false});
      const candidate={...board,slateInventory:board.slateInventory.map(s=>s.instanceId===slate.instanceId?replacement:s)};
      board=placeNativeSlate(candidate,replacement,edit.anchor??slate.anchor);
    }
    else if (edit.kind === "slate-move") board = placeNativeSlate(board,slate,edit.value);
    else if (edit.kind === "slate-rotate") {
      try {
        const next=rotatePlacedSlate(board, edit.key), rotated=next.slateInventory.find(s=>s.instanceId===edit.key);
        board=placeNativeSlate(next,rotated,rotated.anchor);
      } catch { throw new Error('이 위치에서는 회전할 수 없습니다. 빈 곳으로 옮기거나 고정 모양을 확인하세요.'); }
    }
    else {
      if (!Number.isInteger(edit.value) || !slate.anchor) throw new Error("배치 좌표를 확인하세요.");
      board = moveSlate(board, edit.key, { ...slate.anchor, [edit.kind === "slate-x" ? "x" : "y"]: edit.value });
    }
  }
  target.divinity.boards = target.divinity.boards.map(b => b.boardId === board.boardId ? board : b);
  target.ss14Inputs.configurations ??= {};
  target.ss14Inputs.configurations.divinity = captureSeasonConfiguration(target, "divinity");
  target.ss14Inputs.mechanicReceipts = seasonMechanicPins();
  target.ss14Inputs.componentReceipts = { ...target.ss14Inputs.componentReceipts, ...pinSeasonComponentReceipts(target, ["divinity"]) };
  return true;
}
