import { CATALOG } from "./catalog.js";
import { RUNTIME_CATALOG } from "./data/runtimeCatalog.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_PRISM_AREA } from "./data/ss14PrismArea.generated.js";
import { createTalentBoardModel, getTalentTreeGrid, getPrismBaseAffixes, getPrismLegendaryAffixes,
  addPrismToInventory, placePrism, movePrism, unplacePrism } from "./talentBoardModel.js";
import { SS14_EXTENSIONS } from "./data/ss14Extensions.generated.js";
import { TLIDB_TALENT_KO_LOCALE } from "./data/tlidbTalentKoLocale.generated.js";

let model;
export function talentModel() {
  return model ??= createTalentBoardModel(RUNTIME_CATALOG.datasets.talent_catalog, { talentItems: CATALOG.talents });
}
const prismPage = locale => SS14_EXTENSIONS.pages[locale+"/Ethereal_Prism"];
let catalog;
function prismCatalog() {
  if (catalog) return catalog;
  const en=prismPage("en"), ko=prismPage("ko");
  const choices=new Map();
  const items=[];
  if (en?.season==="SS14" && ko?.season==="SS14") {
    const lines=ko.parsed.body.split("\n"), enLines=en.parsed.body.split("\n");
    for (const item of talentModel().prismItems) {
      const name=TLIDB_TALENT_KO_LOCALE.prismItems[item.slug];
      if(name && lines.some(l=>l.startsWith(name+" ")) && enLines.some(l=>l.startsWith(item.slug.replaceAll("_"," ")+" "))) items.push({...item,name});
    }
    const unique=(rows,id)=>new Set(rows.filter(r=>r.id===id).map(r=>r.text));
    for(const row of ko.parsed.modifiers) {
      if (unique(ko.parsed.modifiers,row.id).size===1 && unique(en.parsed.modifiers,row.id).size===1 && /[가-힣]/u.test(row.text) && !/\p{Script=Han}/u.test(row.text))
        choices.set(row.id,{id:row.id,name:row.text});
    }
  }
  return catalog={items,choices};
}
export function seasonPrismChoices(slug,rarity) {
  const {items,choices}=prismCatalog(), m=talentModel();
  const item=items.find(i=>i.slug===slug);
  const options=rows=>rows.map(r=>choices.get(r.modifierId)).filter(Boolean);
  return {items,item,base:item?options(getPrismBaseAffixes(m,slug)):[],area:options(m.areaAffixes),
    rare:options(m.rareGaugeAffixes),legendary:item&&rarity==="legendary"?options(getPrismLegendaryAffixes(m,slug)):[]};
}
const fields={base:"baseAffixModifierId",area:"areaAffixModifierId",rare:"rareRandomAffixModifierId",legendary:"legendaryRandomAffixModifierId"};
export function editSeasonPrism(build,edit) {
  const talents=build.talents, index=edit.slotIndex, itemId=edit.key, placed=talents?.placedPrism;
  if (!talents || !Number.isInteger(index) || index<1 || index>3 || !talents.boards?.[index]?.treeSlug)
    throw Error("전문 재능 패널을 선택하세요.");
  const m=talentModel();
  if(edit.kind==="prism-create") {
    const draft=edit.value, options=seasonPrismChoices(draft?.slug,draft?.rarity);
    if(!options.item?.supportedRarities.includes(draft.rarity)) throw Error("프리즘 종류와 희귀도를 선택하세요.");
    const item={instanceId:itemId,name:options.item.name,prismItemName:options.item.name,prismItemSlug:draft.slug,rarity:draft.rarity};
    for(const [key,field] of Object.entries(fields)) {
      if(key==="legendary"&&draft.rarity!=="legendary") continue;
      if(!options[key].some(o=>o.id===draft[key])) throw Error("SS14 프리즘 옵션을 선택하세요.");
      item[field]=draft[key];
    }
    const result=addPrismToInventory(m,talents,item);
    if(result.status!=="created") throw Error("프리즘을 보관할 수 없습니다.");
    talents.prismInventory=[{...result.item,prismItemName:item.name},...(talents.prismInventory??[])];
    return;
  }
  if ((talents.boards??[]).some(b=>b?.placedPrism || b?.prismSlots?.some(Boolean) || b?.placedInverseImage || b?.inverseImageSlots?.some(Boolean)))
    throw Error("기존 보드 단위의 배치 정보를 먼저 확인하세요.");
  if(edit.kind==="prism-remove" && (placed?.instanceId!==itemId || placed?.boardIndex!==index))
    throw Error("이 패널에 배치한 프리즘을 선택하세요.");
  if(edit.kind==="prism-place" && (placed && placed.instanceId!==itemId)) throw Error("기존 프리즘을 먼저 해제하세요.");
  const result=edit.kind==="prism-remove"?unplacePrism(m,talents,itemId):placed?movePrism(m,talents,itemId,index,edit.value):placePrism(m,talents,index,itemId,edit.value);
  if(!["unplaced","placed","moved"].includes(result.status)) throw Error(({
    "required-by-dependent":"프리즘을 선행 조건으로 쓰는 재능을 먼저 회수하세요.",
    "node-assigned":"포인트를 회수한 뒤 배치하세요.", "inverse-image-on-board":"이 패널의 역상을 먼저 해제하세요."
  })[result.status]??"배치할 프리즘과 재능 칸을 확인하세요.");
  talents.placedPrism=result.state.placedPrism;
}
// The existing editor supplies coordinates/identities ONLY. No old description,
// point value, affix value or calculationValueAuthority is read here.
export function inspectSeasonPrism(build, item, page) {
  const p = build.talents?.placedPrism; const board = build.talents?.boards?.[p?.boardIndex];
  const fail = reason => ({ supported: false, reason });
  if (!item || !board || !Number.isInteger(p.boardIndex) || !Number.isInteger(p.x) || !Number.isInteger(p.y)) return fail("프리즘 배치·보관함 연결을 확인하세요.");
  if (build.talents.placedInverseImage?.boardIndex === p.boardIndex || board.placedPrism || board.placedInverseImage
    || (board.prismSlots ?? []).some(Boolean) || (board.inverseImageSlots ?? []).some(Boolean)
    || Object.values(board.reflectedNodePoints ?? {}).some(Boolean)) return fail("역상·추가 변환과 함께 배치한 프리즘 계산은 미지원입니다.");
  if (item.rarity !== "rare" || item.legendaryRandomAffixModifierId || item.baseAffixModifierId !== "1204200001")
    return fail("현재 연결 범위는 랜덤 옵션 효과 증폭 기본 옵션의 희귀 프리즘입니다. 변이·핵심 변환·레전드 옵션은 미지원입니다.");
  if (Object.keys(item).some(k => /(?:Effect|Multiplier|rolls)$/u.test(k))) return fail("별도 강화·변경 수치가 있는 프리즘은 현재 연결 범위 밖입니다.");
  const unique = id => {
    const matches = [...new Map(page.parsed.modifiers.filter(r => r.id === id).map(r => [r.text, r])).values()];
    return matches.length === 1 ? matches[0] : null;
  };
  const base = unique(item.baseAffixModifierId)?.text.match(/^[+](\d+) % to the effects of Random Affixes on this Prism$/u);
  const area = unique(item.areaAffixModifierId);
  const rare = unique(item.rareRandomAffixModifierId);
  const effect = rare?.text.match(/^All Micro Talent within the area also gain: ([^\n]+)$/u);
  if (!base || area?.text !== "The area of effect expands to 3x3 Rectangle" || !effect
    || SS14_PRISM_AREA.season !== "SS14" || !SS14_PRISM_AREA.body.includes("The Prism is located in the 2nd row, 2nd column within this Effect Area."))
    return fail("현재 검증 범위는 3×3 중앙 배치와 하위 재능의 단일 직접 수치 옵션입니다.");
  talentModel();
  if (model.prismItemBySlug.get(item.prismItemSlug)?.baseAffixModifierId !== item.baseAffixModifierId) return fail("프리즘 종류와 기본 옵션의 연결을 확인하세요.");
  const grid = getTalentTreeGrid(model, board.treeSlug);
  const placed = grid.cells.find(c => c.x === p.x && c.y === p.y)?.node;
  const current = SS14_COMPONENTS.pages[`https://tlidb.com/en/${board.treeSlug}`];
  if (!placed || !current) return fail("배치 칸 또는 SS14 재능 패널을 찾지 못했습니다.");
  const cells = grid.cells.filter(c => Math.abs(c.x - p.x) <= 1 && Math.abs(c.y - p.y) <= 1);
  const affected = [];
  for (const [id, points] of Object.entries(board.nodePoints ?? {}).filter(([, n]) => n > 0)) {
    const cell = grid.cells.find(c => c.node?.flatItemId === id);
    const entries = current.parsed.entries.filter(e => e.id === cell?.node?.dataId);
    if (!cell || !entries.length || !Number.isInteger(points) || points < 1) return fail("선택 재능의 현재 ID와 편집기 좌표를 하나로 확인하지 못했습니다.");
    if (id !== placed.flatItemId && cells.includes(cell) && cell.node.nodeType === "micro") {
      if (!entries.every(e => e.name === "Micro Talent")) return fail("현재 원문의 재능 종류와 편집기 종류가 다릅니다.");
      affected.push({ id, points, x: cell.x, y: cell.y });
    }
  }
  return { supported: true, boardIndex: p.boardIndex, suppressedNodeId: placed.flatItemId, affected,
    effectText: effect[1], multiplier: (1 + Number(base[1]) / 100) * affected.reduce((n, a) => n + a.points, 0),
    areaReceipt: SS14_PRISM_AREA, coordinates: cells.map(({ x, y }) => ({ x, y })),
    fingerprint: JSON.stringify({ item, placement: p, board, areaHash: SS14_PRISM_AREA.sourcePageSha256, treeHash: current.sourcePageSha256,
      geometry: grid.cells.filter(c => c.node).map(c => [c.x, c.y, c.node.flatItemId, c.node.nodeType]) }) };
}
