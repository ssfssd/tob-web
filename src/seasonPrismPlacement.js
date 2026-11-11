import { CATALOG } from "./catalog.js";
import { RUNTIME_CATALOG } from "./data/runtimeCatalog.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { SS14_PRISM_AREA } from "./data/ss14PrismArea.generated.js";
import { createTalentBoardModel, getTalentTreeGrid } from "./talentBoardModel.js";

let model;
// The existing editor supplies coordinates/identities ONLY. No old description,
// point value, affix value or calculationValueAuthority is read here.
export function inspectSeasonPrism(build, item, page) {
  const p = build.talents?.placedPrism; const board = build.talents?.boards?.[p?.boardIndex];
  const fail = reason => ({ supported: false, reason });
  if (!item || !board || !Number.isInteger(p.boardIndex) || !Number.isInteger(p.x) || !Number.isInteger(p.y)) return fail("프리즘 배치·보관함 연결을 확인하세요.");
  if (build.talents.placedInverseImage || board.placedPrism || board.placedInverseImage
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
  model ??= createTalentBoardModel(RUNTIME_CATALOG.datasets.talent_catalog, { talentItems: CATALOG.talents });
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
