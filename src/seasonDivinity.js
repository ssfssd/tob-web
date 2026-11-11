import { getCatalogItems } from "./catalog.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_MECHANICS } from "./data/ss14Mechanics.generated.js";
import { mechanicPage } from "./seasonMechanicInputs.js";
import { transformedShape } from "./divinityBoardModel.js";
import { SS14_CURRENT_DATABASE } from "./data/ss14CurrentDatabase.generated.js";
import { isSeasonNether, netherTemplate, netherTalent, netherTalentOptions } from './seasonNether.js';

const templates = { corner_of_divinity: "A_Corner_of_Divinity", stars_fall: "Fallen_Starlight", starfire: "Sparks_of_Moth_Fire",
  moth_fire: "When_Sparks_Set_the_Prairie_Ablaze", void_gap: "Space_Rift", residence_of_stars: "Residence_of_Stars", genealogy: "Pedigree_of_Gods" };
const safeKo = s => typeof s === "string" && /[가-힣]/u.test(s) && !/\p{Script=Han}/u.test(s) ? s : "한국어 원문 미제공";
const items = [...getCatalogItems("slates"), ...SS14_CURRENT_DATABASE.identities.filter(i=>i.categoryId==="slates")];
const entries = SS14_COMPONENTS.pages["https://tlidb.com/en/Divinity_Slate"].parsed.entries;
const koEntries = SS14_COMPONENTS.pages["https://tlidb.com/ko/Divinity_Slate"].parsed.entries;
export function seasonSlateEntry(id) {
  if (id?.startsWith('slates-ss14-nether-')) return netherTalent(id) ?? null;
  const item = items.find(i => i.id === id);
  const m = item?.tlidbText?.en?.sourceRecordKey?.match(/^data-id:(\d+):(regular|core)$/u);
  return m ? entries.find(e => e.id === m[1] && e.section === m[2]) : null;
}
const category = e => ["Micro Talent", "Medium Talent", "Legendary Medium Talent", "Ultimate Nether King Talent Node"].includes(e?.typeLabel) ? e.typeLabel : e?.section === "core" ? "Core Talent" : null;
const copyOptions = {
  starfire: ["sparks_copy_up", "sparks_copy_left", "sparks_copy_down", "sparks_copy_right"],
  void_gap: ["copy_left", "copy_right"],
};
const selectedCopy = slate => slate.slateId === "starfire" ? slate.slotSelectionsByKey?.effect?.valueId
  : ["copy_left", "copy_right"].find(k => slate.slotSelectionsByKey?.[k]?.valueId === k);
const selectionAllowed = (type, id) => copyOptions[type] ? copyOptions[type].includes(id) : allowed(type, seasonSlateEntry(id));
function allowed(label, entry) {
  const type = category(entry);
  if (label === "Regular Talent") return ["Micro Talent", "Medium Talent", "Legendary Medium Talent"].includes(type);
  if (label === "Micro Talent or Medium Talent") return ["Micro Talent", "Medium Talent"].includes(type);
  // Core level is not present in this source table. Do not infer it from an ID.
  return label === type;
}
export function seasonSlateOptions(label) {
  if (label?.startsWith('nether:')) return netherTalentOptions(label);
  if (copyOptions[label]) {
    const page = SS14_MECHANICS.pages[`ko/${templates[label]}`];
    const lines = page.body.split("\n").filter(line => !line.startsWith("(")).slice(0, copyOptions[label].length);
    return copyOptions[label].map((id, i) => ({ id, name: safeKo(page.title), detail: safeKo(lines[i]) }));
  }
  const result = items.flatMap(item => {
    const entry = seasonSlateEntry(item.id);
    const ko = netherTalent(entry?.id)?.ko ?? koEntries.find(e => e.id === entry?.id && e.section === entry?.section);
    return entry && allowed(label, entry) && ko ? [{ id: item.id, name: safeKo(ko.name), detail: safeKo(ko.detail) }] : [];
  });
  if (label === 'Ultimate Nether King Talent Node') for (const option of netherTalentOptions(label)) {
    if (!result.some(r=>seasonSlateEntry(r.id)?.id===netherTalent(option.id)?.id)) result.push(option);
  }
  return result;
}
export function seasonSlateTemplates(build, { requireBindings = true } = {}) {
  const board = build.divinity?.boards?.find(b => b.boardId === build.divinity.activeBoardId);
  const placed = new Set(board?.cells.map(c => c.slateInstanceId));
  return (board?.slateInventory ?? []).filter(s => placed.has(s.instanceId) && (templates[s.slateId] || s.slateId === "six_gods" || isSeasonNether(s.slateId))).map(slate => {
    if (isSeasonNether(slate.slateId)) return netherTemplate(slate, board);
    if (slate.slateId === "six_gods") {
      const page = SS14_COMPONENTS.pages["https://tlidb.com/en/Divinity_Slate"];
      const controls = Array.from({ length: 5 }, (_, index) => {
        const slot = `slot_${index + 1}`, value = slate.slotSelectionsByKey?.[slot]?.valueId ?? "";
        // Older hand-edited boards used this generic container for core talents.
        // Keep those choices editable; native imports start empty and require regular talents.
        const type = category(seasonSlateEntry(value)) === "Core Talent" ? "Core Talent" : "Regular Talent";
        return { key: `${slate.instanceId}|${slot}`, instanceId: slate.instanceId, slot, type, index, value };
      });
      const blockers = Object.entries(slate.slotSelectionsByKey ?? {}).some(([key, v]) => !controls.some(c => c.slot === key && selectionAllowed(c.type, v.valueId)))
        ? [{ reason: "일반 석판의 SS14 옵션 종류·슬롯을 확인하세요." }] : [];
      return { slate, board, slug: "Divinity_Slate", page, controls, name: "일반 신격 석판", detail: "", blockers, cap: null };
    }
    const slug = templates[slate.slateId]; const page = SS14_MECHANICS.pages[`en/${slug}`];
    const ko = SS14_MECHANICS.pages[`ko/${slug}`]; const bound = !requireBindings || mechanicPage(build, slug);
    const slotTypes = [...page.body.matchAll(/^<([^>]+)>$/gmu)].map(m => m[1]);
    const cap = Number(page.body.match(/Max Active Divinity Slates?: (\d+)/u)?.[1]) || null;
    const blockers = [];
    if (!bound) blockers.push({ reason: "SS14 특수 석판 원문 연결을 확인하세요." });
    if (cap && board.slateInventory.filter(s => placed.has(s.instanceId) && s.slateId === slate.slateId).length > cap) blockers.push({ reason: "SS14 특수 석판 활성 개수 상한을 초과했습니다." });
    const controls = slotTypes.map((type, index) => ({ key: `${slate.instanceId}|slot_${index + 1}`, instanceId: slate.instanceId,
      slot: `slot_${index + 1}`, type, index, value: slate.slotSelectionsByKey?.[`slot_${index + 1}`]?.valueId ?? "" }));
    if (copyOptions[slate.slateId]) controls.push({ key: `${slate.instanceId}|copy_direction`, instanceId: slate.instanceId, slot: "copy_direction", type: slate.slateId, index: 0, value: selectedCopy(slate) ?? "" });
    for (const c of controls) if (!c.value || !selectionAllowed(c.type, c.value)) blockers.push({ reason: `${c.index + 1}번째 석판 옵션을 SS14 허용 종류에서 선택하세요.` });
    const permitted = slotTypes.length ? controls.map(c => c.slot) : slate.slateId === "void_gap" ? ["copy_left", "copy_right"] : ["effect"];
    if (Object.keys(slate.slotSelectionsByKey ?? {}).some(key => !permitted.includes(key))) blockers.push({ reason: "특수 석판의 SS14 슬롯과 저장 옵션이 일치하지 않습니다." });
    if (slate.slateId === "void_gap" && ["copy_left", "copy_right"].filter(k => slate.slotSelectionsByKey?.[k]?.valueId === k).length > 1) blockers.push({ reason: "복제 방향을 하나만 선택하세요." });
    const binding = build.ss14Inputs?.slateSelections?.[slate.instanceId];
    if (binding && binding.sourcePageSha256 !== page.sourcePageSha256) blockers.push({ reason: "저장 석판 옵션의 SS14 원문이 변경되었습니다." });
    return { slate, board, slug, page, controls, name: safeKo(ko.title), detail: safeKo(ko.body), blockers, cap };
  });
}
export function applySeasonSlateSelections(build, selections) {
  for (const [instanceId, binding] of Object.entries(selections ?? {})) {
    const slate = build.divinity?.boards?.flatMap(b => b.slateInventory ?? []).find(s => s.instanceId === instanceId);
    if (!slate || slate.slateId !== binding.templateId) continue;
    slate.slotSelectionsByKey = Object.fromEntries(Object.entries(binding.slots).map(([key, id]) => key === "copy_direction"
      ? [slate.slateId === "starfire" ? "effect" : id, { valueType: slate.slateId === "starfire" ? "special_effect" : "copy_slot", valueId: id }]
      : [key, { valueType: "talent_affix", valueId: id }]));
    slate.affixIds = Object.entries(binding.slots).filter(([key]) => key !== "copy_direction").map(([, id]) => id);
  }
  return build;
}
export function validSeasonSlateSelections(build) {
  const selections = build.ss14Inputs?.slateSelections;
  if (selections === undefined) return true;
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) return false;
  return Object.entries(selections).every(([instanceId, binding]) => {
    const row = seasonSlateTemplates(build, { requireBindings: false }).find(r => r.slate.instanceId === instanceId);
    return row && binding && binding.templateId === row.slate.slateId && /^[a-f0-9]{64}$/u.test(binding.sourcePageSha256)
      && binding.slots && typeof binding.slots === "object" && !Array.isArray(binding.slots)
      && Object.entries(binding.slots).every(([slot, id]) => {
        const control = row.controls.find(c => c.slot === slot);
        return control && (control.type.startsWith('nether:') ? netherTalentOptions(control.type).some(t=>t.id===id) : selectionAllowed(control.type, id));
      });
  });
}

// Adjacency is derived from occupied cells. Multiple candidates, copy cycles,
// orientation-dependent choices and unknown core levels stay explicit blockers.
export function resolveSeasonSlates(build) {
  const board = build.divinity?.boards?.find(b => b.boardId === build.divinity.activeBoardId);
  // Legacy regular options already have individual component receipts. Only
  // newly bound regular boards need the extra slot-contract validation row.
  const special = seasonSlateTemplates(build).filter(r => r.slate.slateId !== "six_gods" || build.ss14Inputs?.slateSelections?.[r.slate.instanceId]);
  const placed = new Set(board?.cells.map(c => c.slateInstanceId));
  const slates = (board?.slateInventory ?? []).filter(s => placed.has(s.instanceId));
  const selections = [];
  const resolve = (slate, trail = []) => {
    const row = special.find(r => r.slate.instanceId === slate.instanceId);
    const own = Object.entries(slate.slotSelectionsByKey ?? {}).filter(([, s]) => !["special_effect", "copy_slot"].includes(s.valueType))
      .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })).map(([slot, selection]) => ({ slate, slot, selection }));
    if (!row || slate.slateId === "six_gods" || row.controls.some(c => !copyOptions[c.type])) return own;
    if (trail.includes(slate.instanceId)) { row.blockers.push({ reason: "서로를 복제하는 석판 순환은 계산하지 않습니다." }); return []; }
    const directions = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
    const adjacent = direction => [...new Set(board.cells.filter(c => c.slateInstanceId === slate.instanceId).flatMap(c => {
      const [dx, dy] = directions[direction];
      const other = board.cells.find(o => o.x === c.x + dx && o.y === c.y + dy && o.slateInstanceId !== slate.instanceId);
      return other ? [other.slateInstanceId] : [];
    }))];
    let sourceIds;
    if (slate.slateId === "starfire") {
      const direction = selectedCopy(slate)?.replace("sparks_copy_", "");
      if (!directions[direction]) return [];
      sourceIds = adjacent(direction);
      if (sourceIds.length > 1) { row.blockers.push({ reason: "한 방향에 복제 후보가 여러 개 있어 대상이 불명확합니다." }); return []; }
    } else if (slate.slateId === "void_gap") {
      const choice = selectedCopy(slate); if (!choice) return [];
      const shape = transformedShape(slate.shape, slate.rotation, slate.flippedH, slate.flippedV);
      const vertical = Math.max(...shape.map(p => p.y)) > Math.max(...shape.map(p => p.x));
      sourceIds = adjacent(vertical ? choice === "copy_left" ? "up" : "down" : choice === "copy_left" ? "left" : "right");
    } else if (["moth_fire", "residence_of_stars"].includes(slate.slateId)) sourceIds = [...new Set(Object.keys(directions).flatMap(adjacent))];
    else { row.blockers.push({ reason: "SS14 특수 석판 규칙 해석 미완료" }); return []; }
    return sourceIds.flatMap(id => {
      const source = slates.find(s => s.instanceId === id);
      const candidates = resolve(source, [...trail, slate.instanceId]);
      if (candidates.some(c => c.copiedFrom)) { row.blockers.push({ reason: "복제된 재능을 다시 복제하는 SS14 규칙의 근거가 필요합니다." }); return []; }
      const picked = slate.slateId === "residence_of_stars" ? candidates.filter(c => category(seasonSlateEntry(c.selection.valueId)) === "Medium Talent")
        : slate.slateId === "void_gap" ? candidates.filter(c => ["Medium Talent", "Legendary Medium Talent", "Ultimate Nether King Talent Node"].includes(category(seasonSlateEntry(c.selection.valueId))))
        : candidates.slice(-1).filter(c => category(seasonSlateEntry(c.selection.valueId)) !== "Core Talent");
      if (candidates.some(c => !category(seasonSlateEntry(c.selection.valueId)))) row.blockers.push({ reason: "복제 대상의 SS14 재능 종류 미확인" });
      return picked.map((c, i) => ({ ...c, slate, slot: `copy_${id}_${i}`, copiedFrom: id }));
    });
  };
  for (const slate of slates) selections.push(...resolve(slate));
  return { special, selections };
}
