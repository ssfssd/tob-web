import { SS14_RULES } from "./data/ss14Rules.generated.js";
import { SS14_COMPONENTS } from "./data/ss14Components.generated.js";
import { transformedShape } from "./divinityBoardModel.js";

// Validate the saved geometry as supplied. This does not certify SS14 template
// shapes or paths whose season-specific topology has not been published.
export function inspectSeasonAllocation(build, { rules = SS14_RULES, components = SS14_COMPONENTS } = {}) {
  const issues = []; const checks = [];
  const issue = (path, reason) => issues.push({ path, reason });
  for (const [index, board] of (build?.talents?.boards ?? []).entries()) {
    const path = `talents.boards.${index}`;
    const selected = Object.entries(board.nodePoints ?? {}).filter(([, n]) => n !== 0);
    const cores = board.coreTalentIds ?? [];
    if (!selected.length && !cores.length) continue;
    const authority = rules.talents[board.treeSlug];
    const countBefore = issues.length;
    if (!authority) { issue(path, "선택 재능 패널의 SS14 포인트 규칙 미확보"); continue; }
    if (authority.sourcePageSha256 !== components.pages[authority.sourceUrl]?.sourcePageSha256) {
      issue(path, "재능 수치와 배치 규칙의 SS14 원문이 다릅니다. 최신 원문 연결을 확인하세요.");
    }
    const nodes = selected.map(([id, points]) => ({ id, points, rule: authority.nodes[id.replace(/^talents-/u, "")] }));
    for (const node of nodes) if (!node.rule || !Number.isInteger(node.points) || node.points < 1 || node.points > node.rule.maxPoints) {
      issue(path, "재능 포인트가 SS14 원문의 노드 상한을 벗어났거나 노드가 없습니다.");
    }
    let available = 0;
    for (const required of [...new Set(nodes.filter((n) => n.rule).map((n) => n.rule.requiredPoints))].sort((a, b) => a - b)) {
      const group = nodes.filter((n) => n.rule?.requiredPoints === required);
      if (available < required) issue(path, `재능 해금에 필요한 이전 포인트 ${required}개가 부족합니다.`);
      else available += group.reduce((sum, n) => sum + (Number.isInteger(n.points) && n.points > 0 && n.points <= n.rule.maxPoints ? n.points : 0), 0);
    }
    if (new Set(cores).size !== cores.length) issue(path, "같은 핵심 재능이 중복 선택되었습니다.");
    for (const id of cores) {
      const rule = authority.nodes[id.replace(/^talents-/u, "")];
      if (!rule || available < rule.requiredPoints) issue(path, "핵심 재능의 SS14 해금 포인트가 부족하거나 규칙이 없습니다.");
    }
    checks.push({ path, label: `재능 패널 ${index + 1}`, status: countBefore === issues.length ? "passed" : "invalid", receipt: authority });
  }
  const boards = build?.divinity?.boards ?? [];
  const active = build?.divinity?.activeBoardId;
  const matching = boards.filter((b) => b.boardId === active);
  if (active && matching.length !== 1) issue("divinity", "활성 석판 판을 하나로 확인할 수 없습니다.");
  for (const board of matching) {
    const before = issues.length; const cells = board.cells ?? []; const inventory = board.slateInventory ?? [];
    if (!Number.isInteger(board.width) || !Number.isInteger(board.height) || board.width < 1 || board.height < 1
      || !Array.isArray(board.mask) || board.mask.length !== board.width
      || board.mask.some((column) => !Array.isArray(column) || column.length !== board.height || column.some((v) => v !== 0 && v !== 1))) {
      issue("divinity", "석판 판의 크기와 허용 칸 정보를 확인할 수 없습니다.");
    }
    const ids = inventory.map((s) => s.instanceId);
    if (new Set(ids).size !== ids.length) issue("divinity", "석판 보관함의 식별자가 중복되었습니다.");
    const positions = new Set();
    for (const cell of cells) {
      const key = `${cell.x}:${cell.y}`;
      if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0
        || cell.x >= board.width || cell.y >= board.height || board.mask?.[cell.x]?.[cell.y] !== 1) issue("divinity", "석판이 판의 허용 칸 밖에 배치되었습니다.");
      if (positions.has(key)) issue("divinity", "석판 배치 칸이 겹칩니다.");
      positions.add(key);
      if (!ids.includes(cell.slateInstanceId)) issue("divinity", "배치 칸에 연결된 석판이 보관함에 없습니다.");
    }
    for (const id of new Set(cells.map((c) => c.slateInstanceId))) {
      const slate = inventory.find((s) => s.instanceId === id);
      if (!slate) continue;
      if (!Array.isArray(slate.shape) || !slate.shape.length || slate.shape.some((p) => !Number.isInteger(p.x) || !Number.isInteger(p.y))
        || new Set(slate.shape.map((p) => `${p.x}:${p.y}`)).size !== slate.shape.length
        || !Number.isInteger(slate.anchor?.x) || !Number.isInteger(slate.anchor?.y)
        || !Number.isInteger(slate.rotation) || slate.rotation < 0 || slate.rotation > 3) { issue("divinity", "석판 모양·회전·기준 위치를 확인할 수 없습니다."); continue; }
      const expected = transformedShape(slate.shape, slate.rotation, slate.flippedH, slate.flippedV)
        .map((p) => `${p.x + slate.anchor.x}:${p.y + slate.anchor.y}`).sort();
      const actual = cells.filter((c) => c.slateInstanceId === id).map((c) => `${c.x}:${c.y}`).sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) issue("divinity", "저장된 석판 모양과 실제 배치 칸이 일치하지 않습니다.");
    }
    if (cells.length) checks.push({ path: "divinity", label: "활성 석판 배치", status: before === issues.length ? "passed" : "invalid" });
  }
  return { issues, checks, valid: issues.length === 0,
    limitation: "재능의 원문 포인트 상한·해금과 석판 문서의 겹침·범위·모양을 검사합니다. SS14 전체 경로·특수 배치 규칙 검증은 별도입니다." };
}
