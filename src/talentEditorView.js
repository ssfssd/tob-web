import {
  addInverseImageToInventory,
  addPrismToInventory,
  addTalentNodePoint,
  deleteInverseImageFromInventory,
  deletePrismFromInventory,
  getAvailableTalentTrees,
  getPrismBaseAffixes,
  getPrismLegendaryAffixes,
  getTalentBoardNodeGrid,
  getTalentCoreGroups,
  getTalentCoreUnlockRequirement,
  moveInverseImage,
  movePrism,
  normalizeTalentBoardState,
  placeInverseImage,
  placePrism,
  removeTalentNodePoint,
  resetAllTalentBoards,
  resetTalentBoard,
  selectTalentTree,
  toggleCoreTalent,
  unplaceInverseImage,
  unplacePrism,
} from "./talentBoardModel.js";
import { presentGameText as presentDefaultGameText } from "./gameTextPresentation.js";
import { talentTreeIcon, coreCardOrnament } from "./ingameUiAssets.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validBoardIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < 4;
}

function activeBoardIndex(uiState) {
  const value = Number(uiState?.activeBoardIndex);
  return validBoardIndex(value) ? value : 0;
}

function boardLabel(boardIndex) {
  return boardIndex === 0 ? "기본 1" : `서브 ${boardIndex}`;
}

function defaultGameText(value, optional = false) {
  return presentDefaultGameText(value, { locale: "ko", optional });
}

const TALENT_EDITOR_UI_FALLBACK = {
  ko: {
    talentInverseMove: "역상 이동",
    talentPrismMove: "프리즘 이동",
    talentMoveCancel: "이동 취소",
    talentMoveHere: "여기로 이동",
    talentMoveUnavailable: "이 위치로 이동할 수 없음",
  },
  en: {
    talentInverseMove: "Move inverse image",
    talentPrismMove: "Move prism",
    talentMoveCancel: "Cancel move",
    talentMoveHere: "Move here",
    talentMoveUnavailable: "Cannot move here",
  },
};

function talentEditorUiText(uiState, key) {
  const translated = typeof uiState?.ui === "function" ? uiState.ui(key) : "";
  if (translated && translated !== key) return translated;
  const locale = uiState?.locale === "en" ? "en" : "ko";
  return TALENT_EDITOR_UI_FALLBACK[locale][key] ?? key;
}

function structuredTalentText(uiState, source, field, value, optional = false) {
  if (typeof uiState?.presentGameText !== "function" || !source?.flatItemId) {
    return defaultGameText(value, optional);
  }
  const presented = uiState.presentGameText({
    value,
    itemId: source.flatItemId,
    categoryId: "talents",
    sourceUrl: source.sourceUrl ?? "",
    field,
    optional,
  });
  return presented === undefined || presented === null
    ? defaultGameText(value, optional)
    : defaultGameText(String(presented), optional);
}

function runtimeTalentText(uiState, runtimeKind, runtimeId, value, optional = false) {
  if (typeof uiState?.presentGameText !== "function" || !runtimeId) {
    return defaultGameText(value, optional);
  }
  const presented = uiState.presentGameText({
    value,
    categoryId: "talents",
    sourceUrl: "https://tlidb.com/cn/Ethereal_Prism",
    field: runtimeKind === "prism-item" ? "name" : "detail",
    runtimeKind,
    runtimeId,
    optional,
  });
  return presented === undefined || presented === null
    ? defaultGameText(value, optional)
    : defaultGameText(String(presented), optional);
}

function treeSourceText(tree, uiState) {
  return structuredTalentText(uiState, tree, "name", tree?.name ?? tree?.slug ?? "");
}

function nodeSourceText(node, uiState) {
  return structuredTalentText(
    uiState,
    node,
    "summary",
    node?.rawAffix ?? node?.name ?? node?.flatItemId ?? node?.id ?? "",
  );
}

function previousColumnRequirement(runtime, node) {
  const required = Math.max(0, Number(node?.x) || 0) * 3;
  const invested = runtime.nodes
    .filter((candidate) => candidate.x < node.x)
    .reduce((total, candidate) => total + Math.max(0, Number(candidate.points) || 0), 0);
  return { required, invested, satisfied: invested >= required };
}

function image(source, className) {
  const url = source?.kind === "god" || source?.kind === "profession"
    ? talentTreeIcon(source)
    : source?.iconUrl || source?.localIconPath;
  return url
    ? `<img class="${className}" src="${escapeHtml(url)}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="${className} is-placeholder" data-role="talent-icon-fallback" aria-hidden="true" hidden>◇</span>`
    : `<span class="${className} is-placeholder" data-role="talent-icon-fallback" aria-hidden="true">◇</span>`;
}

function renderBoardTabs(model, state, selectedIndex, uiState) {
  return state.boards.map((board, boardIndex) => {
    const tree = model.treeBySlug.get(board.treeSlug);
    return `<button type="button" data-role="talent-board-tab"
      data-action="talent-board-activate" data-board-index="${boardIndex}"
      aria-selected="${boardIndex === selectedIndex}">
      ${tree ? image(tree, "talent-board-icon") : `<span class="talent-board-icon is-placeholder">+</span>`}
      <span>${boardLabel(boardIndex)}</span>
      ${tree ? `<small>${escapeHtml(treeSourceText(tree, uiState))}</small>` : ""}
    </button>`;
  }).join("");
}

function renderTreeSelect(model, state, boardIndex, uiState) {
  const board = state.boards[boardIndex];
  const expectedKind = boardIndex === 0 ? "god" : "profession";
  const options = getAvailableTalentTrees(model, state, boardIndex)
    .map((tree) => `<option value="${escapeHtml(tree.slug)}" data-tree-kind="${expectedKind}"
      ${tree.slug === board.treeSlug ? "selected" : ""}>${escapeHtml(treeSourceText(tree, uiState))}</option>`)
    .join("");
  return `<label class="talent-tree-select-label">트리 선택
    <select data-action="talent-tree-select" data-board-index="${boardIndex}">
      <option value="" ${board.treeSlug ? "" : "selected"}>선택 안 함</option>
      ${options}
    </select>
  </label>`;
}

function samePosition(left, right) {
  return Boolean(left && right && left.x === right.x && left.y === right.y);
}

function renderTalentNode(model, state, boardIndex, cell, uiState, runtime) {
  const node = cell.node;
  if (!node) {
    return `<article data-role="talent-node-cell" data-x="${cell.x}" data-y="${cell.y}" style="grid-column:${cell.x + 1};grid-row:${cell.y + 1}" aria-hidden="true"></article>`;
  }
  const nodeLabel = structuredTalentText(uiState, node, "name", node.name);
  const points = Number(node.points ?? 0);
  const prerequisite = node.prerequisite
    ? runtime.nodes.find((candidate) => !candidate.isReflected && samePosition(candidate, node.prerequisite))
    : null;
  const columnRequirement = previousColumnRequirement(runtime, node);
  const prismPlacement = placementFor(state, "prism");
  const inversePlacement = placementFor(state, "inverse");
  const prismPlacedHere = prismPlacement?.boardIndex === boardIndex && samePosition(prismPlacement, node);
  const inversePlacedHere = inversePlacement?.boardIndex === boardIndex && samePosition(inversePlacement, node);
  const selectedPrismInstanceId = state.prismInventory.some((item) => (
    item?.instanceId === uiState?.selectedPrismInstanceId
  )) ? uiState.selectedPrismInstanceId : null;
  const requestedInverseInstanceId = uiState?.selectedInverseInstanceId
    ?? uiState?.selectedInverseImageInstanceId;
  const selectedInverseInstanceId = state.inverseImageInventory.some((item) => (
    item?.instanceId === requestedInverseInstanceId
  )) ? requestedInverseInstanceId : null;
  const canPlacePrism = Boolean(selectedPrismInstanceId && !prismPlacement && (
    placePrism(model, state, boardIndex, selectedPrismInstanceId, node.runtimeNodeId).status === "placed"
  ));
  const prismMoveResult = selectedPrismInstanceId
    && prismPlacement?.instanceId === selectedPrismInstanceId
    && !prismPlacedHere
    ? movePrism(model, state, selectedPrismInstanceId, boardIndex, node.runtimeNodeId)
    : null;
  const canPlaceInverse = Boolean(selectedInverseInstanceId && !inversePlacement && (
    placeInverseImage(model, state, boardIndex, selectedInverseInstanceId, node.runtimeNodeId).status === "placed"
  ));
  const inverseMoveResult = selectedInverseInstanceId
    && inversePlacement?.instanceId === selectedInverseInstanceId
    && !inversePlacedHere
    ? moveInverseImage(model, state, selectedInverseInstanceId, boardIndex, node.runtimeNodeId)
    : null;
  const canAdd = addTalentNodePoint(model, state, boardIndex, node.runtimeNodeId).status === "added";
  const canRemove = removeTalentNodePoint(model, state, boardIndex, node.runtimeNodeId).status === "removed";
  const canUnplacePrism = prismPlacedHere
    && unplacePrism(model, state, prismPlacement.instanceId).status === "unplaced";
  const canUnplaceInverse = inversePlacedHere
    && unplaceInverseImage(model, state, inversePlacement.instanceId).status === "unplaced";
  const screenshotMatch = Boolean(
    uiState?.screenshotMatchItemId && node.flatItemId === uiState.screenshotMatchItemId,
  );
  const prerequisiteAttribute = prerequisite?.runtimeNodeId
    ? ` data-prerequisite-node-id="${escapeHtml(prerequisite.runtimeNodeId)}"`
    : "";
  return `<article class="${screenshotMatch ? "is-screenshot-match" : ""}" data-role="talent-node-cell" data-x="${cell.x}" data-y="${cell.y}"
    style="grid-column:${cell.x + 1};grid-row:${cell.y + 1}" data-allocated="${points > 0}" data-available="${canAdd || points > 0}"
    role="group" tabindex="0" aria-label="${escapeHtml(nodeLabel)}"
    data-action="talent-node-add" data-context-action="talent-node-remove"
    data-board-index="${boardIndex}" data-node-id="${escapeHtml(node.runtimeNodeId)}"
    data-reflected="${Boolean(node.isReflected)}"
    data-in-prism-area="${Boolean(node.isInPrismArea)}"${prerequisiteAttribute}>
    ${image(node, "talent-node-icon")}
    <span class="ingame-talent-rank" aria-hidden="true">${points}</span>
    <div class="ingame-talent-tooltip">
    <strong>${escapeHtml(nodeLabel)}</strong>
    <p>${escapeHtml(structuredTalentText(uiState, node, "detail", node.rawAffix))}</p>
    <span data-role="talent-node-points">${points}/${node.maxPoints}</span>
    ${prerequisite ? `<small data-role="talent-node-prerequisite">
      선행: ${escapeHtml(nodeSourceText(prerequisite, uiState))}
    </small>` : ""}
    <small data-role="talent-node-column-requirement" data-satisfied="${columnRequirement.satisfied}">
      이전 열 투자: ${columnRequirement.invested}/${columnRequirement.required}
    </small>
    ${node.isReflected ? `<small data-role="talent-node-reflected">반사된 재능</small>` : ""}
    ${node.inverseImageEffect !== null && node.inverseImageEffect !== undefined
    ? `<small data-role="talent-node-inverse-effect">역상 효과: ${escapeHtml(defaultGameText(node.inverseImageEffect))}</small>`
    : ""}
    ${prismPlacedHere ? `<small data-role="talent-node-prism-occupied">프리즘 배치됨</small>` : ""}
    ${node.isInPrismArea ? `<small data-role="talent-node-prism-area">프리즘 영향 범위</small>` : ""}
    ${inversePlacedHere ? `<small data-role="talent-node-inverse-occupied">역상 배치됨</small>` : ""}
    <div class="talent-node-actions">
      <button type="button" data-action="talent-node-remove" data-board-index="${boardIndex}"
        data-node-id="${escapeHtml(node.runtimeNodeId)}" aria-label="${escapeHtml(`${nodeLabel} 포인트 감소`)}"
        ${canRemove ? "" : "disabled"}>−</button>
      <button type="button" data-action="talent-node-add" data-board-index="${boardIndex}"
        data-node-id="${escapeHtml(node.runtimeNodeId)}" aria-label="${escapeHtml(`${nodeLabel} 포인트 증가`)}"
        ${canAdd ? "" : "disabled"}>+</button>
      ${canPlacePrism ? `<button type="button" data-action="talent-prism-place" data-board-index="${boardIndex}"
        data-node-id="${escapeHtml(node.runtimeNodeId)}" data-instance-id="${escapeHtml(selectedPrismInstanceId)}">프리즘 배치</button>` : ""}
      ${prismMoveResult ? `<button type="button" class="talent-move-target ${prismMoveResult.status === "moved" ? "is-valid" : "is-invalid"}"
        data-action="talent-prism-move" data-board-index="${boardIndex}"
        data-node-id="${escapeHtml(node.runtimeNodeId)}" data-instance-id="${escapeHtml(selectedPrismInstanceId)}"
        data-move-status="${escapeHtml(prismMoveResult.status)}">${escapeHtml(talentEditorUiText(
    uiState,
    prismMoveResult.status === "moved" ? "talentMoveHere" : "talentMoveUnavailable",
  ))}</button>` : ""}
      ${prismPlacedHere ? `<button type="button" data-action="talent-prism-unplace"
        data-instance-id="${escapeHtml(prismPlacement.instanceId)}" ${canUnplacePrism ? "" : "disabled"}>프리즘 배치 해제</button>` : ""}
      ${canPlaceInverse ? `<button type="button" data-action="talent-inverse-place" data-board-index="${boardIndex}"
        data-node-id="${escapeHtml(node.runtimeNodeId)}" data-instance-id="${escapeHtml(selectedInverseInstanceId)}">역상 배치</button>` : ""}
      ${inverseMoveResult ? `<button type="button" class="talent-move-target ${inverseMoveResult.status === "moved" ? "is-valid" : "is-invalid"}"
        data-action="talent-inverse-move" data-board-index="${boardIndex}"
        data-node-id="${escapeHtml(node.runtimeNodeId)}" data-instance-id="${escapeHtml(selectedInverseInstanceId)}"
        data-move-status="${escapeHtml(inverseMoveResult.status)}">${escapeHtml(talentEditorUiText(
    uiState,
    inverseMoveResult.status === "moved" ? "talentMoveHere" : "talentMoveUnavailable",
  ))}</button>` : ""}
      ${inversePlacedHere ? `<button type="button" data-action="talent-inverse-unplace"
        data-instance-id="${escapeHtml(inversePlacement.instanceId)}" ${canUnplaceInverse ? "" : "disabled"}>역상 배치 해제</button>` : ""}
    </div>
    </div>
  </article>`;
}

function renderTalentGrid(model, state, boardIndex, uiState) {
  const grid = getTalentBoardNodeGrid(model, state, boardIndex);
  const inverseOnBoard = state.placedInverseImage?.boardIndex === boardIndex;
  const links = grid.nodes.filter((node) => node.prerequisite).map((node) => {
    const before = node.prerequisite;
    return `<line x1="${before.x * 120 + 60}" y1="${before.y * 100 + 50}" x2="${node.x * 120 + 60}" y2="${node.y * 100 + 50}" data-active="${node.points > 0}"/>`;
  }).join("");
  return `${inverseOnBoard ? `<p data-role="talent-inverse-replace-notice">
    현재 보드의 역상을 먼저 배치 해제해야 다른 노드에 배치할 수 있습니다.
  </p>` : ""}<div class="talent-node-grid" data-role="talent-node-grid" data-width="7" data-height="5">
    <svg class="ingame-talent-links" viewBox="0 0 840 500" preserveAspectRatio="none" aria-hidden="true">${links}</svg>
    ${grid.cells.map((cell) => renderTalentNode(model, state, boardIndex, cell, uiState, grid)).join("")}
  </div>`;
}

function renderCoreTalents(model, state, boardIndex, uiState) {
  const board = state.boards[boardIndex];
  const groups = getTalentCoreGroups(model, state, boardIndex);
  const totalPoints = getTalentBoardNodeGrid(model, state, boardIndex).totalPoints;
  const activeGroupIndex = Math.max(0, Math.min(groups.length - 1, uiState.coreGroupIndex ?? 0));
  return `<section class="talent-core-section" data-role="talent-core-section">
    <h3>핵심 재능 <span>${board.coreTalentIds.length}/${groups.length}</span></h3>
    <nav class="ingame-core-pages" aria-label="핵심 재능 단계">${groups.map((_, index) => `<button type="button" data-action="ingame-core-page" data-group-index="${index}" aria-pressed="${index === activeGroupIndex}">핵심 선택 ${index + 1}</button>`).join("")}</nav>
    <div class="talent-core-list">
      ${groups.map((group, groupIndex) => {
        const required = getTalentCoreUnlockRequirement(boardIndex, groupIndex);
        const locked = totalPoints < required;
        return `<section data-role="talent-core-group" data-group-index="${groupIndex}" data-count="${group.length}" data-locked="${locked}" ${groupIndex === activeGroupIndex ? "" : "hidden"}>
          <h4>핵심 선택 ${groupIndex + 1}
            <small data-role="talent-core-unlock">해금: ${totalPoints}/${required}</small>
          </h4>
          ${group.map((core) => {
            const selected = board.coreTalentIds.includes(core.flatItemId);
            return `<button type="button" data-action="talent-core-toggle" data-board-index="${boardIndex}"
              data-core-talent-id="${escapeHtml(core.flatItemId)}" aria-pressed="${selected}" ${locked ? "disabled" : ""}>
              ${coreCardOrnament}<span class="ingame-core-icon-frame">${image(core, "talent-core-icon")}</span>
              <strong>${escapeHtml(structuredTalentText(uiState, core, "name", core.name))}</strong>
              <span>${escapeHtml(structuredTalentText(uiState, core, "detail", core.effect))}</span>
              <span class="ingame-core-select">${selected ? "선택 완료" : locked ? "해금 필요" : "선택"}</span>
            </button>`;
          }).join("")}
        </section>`;
      }).join("")}
    </div>
  </section>`;
}

function renderActiveBoard(model, state, boardIndex, uiState) {
  const board = state.boards[boardIndex];
  const tree = model.treeBySlug.get(board.treeSlug);
  const totalPoints = tree ? getTalentBoardNodeGrid(model, state, boardIndex).totalPoints : 0;
  return `<section class="talent-active-board" data-role="talent-active-board" data-board-index="${boardIndex}">
    <header>
      ${tree ? `<div class="ingame-tree-emblem" aria-hidden="true">${image(tree, "talent-tree-icon")}</div>` : ""}
      <h2>${boardLabel(boardIndex)}</h2>
      <span data-role="talent-board-total-points">${totalPoints}</span>
      ${renderTreeSelect(model, state, boardIndex, uiState)}
      <button type="button" data-action="talent-board-reset" data-board-index="${boardIndex}">보드 초기화</button>
    </header>
    ${tree ? `
      <div class="talent-tree-source">
        ${image(tree, "talent-tree-icon")}
        <strong>${escapeHtml(treeSourceText(tree, uiState))}</strong>
      </div>
      <p class="talent-board-help">노드를 눌러 투자하고 오른쪽 클릭으로 회수합니다. 노드의 + / − 버튼도 사용할 수 있습니다.</p>
      <div class="talent-grid-viewport" tabindex="0" aria-label="재능 보드 가로 스크롤"><div class="ingame-talent-thresholds" aria-label="열별 요구 포인트">${Array.from({ length: 7 }, (_, index) => `<span>${index * 3}</span>`).join("")}</div>${renderTalentGrid(model, state, boardIndex, uiState)}</div>
      <details class="ingame-core-drawer"><summary>핵심 재능 · ${board.coreTalentIds.length}개 선택</summary>${renderCoreTalents(model, state, boardIndex, uiState)}</details>
    ` : `<p data-role="talent-tree-empty">트리를 선택하세요.</p>`}
  </section>`;
}

function renderSourceOnlyTalents(model, uiState) {
  const items = model?.sourceOnlyTalentItems ?? [];
  const groups = new Map();
  for (const item of items) {
    const key = item.treeSlug || "SS13";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ item, kind: "node", stableIds: item.stableIds ?? [] });
  }
  for (const tree of model?.trees ?? []) {
    if (tree?.isSupported !== false || !tree.coreTalents?.length) continue;
    if (!groups.has(tree.slug)) groups.set(tree.slug, []);
    groups.get(tree.slug).push(...tree.coreTalents.map((item) => ({
      item,
      kind: "core",
      stableIds: [item.id].filter(Boolean),
    })));
  }
  if (!groups.size) return "";
  return `<section class="talent-source-only-section" data-role="talent-source-only-section">
    <h2>SS13 위치 미제공 재능</h2>
    <p>현재 출처에는 보드 위치 정보가 없어 목록으로만 표시됩니다. 위치가 확인되기 전까지 선택·계산에는 포함되지 않습니다.</p>
    ${[...groups.entries()].map(([treeSlug, group]) => `<section data-source-tree="${escapeHtml(treeSlug)}">
      <h3>${escapeHtml(sourceOnlyTreeLabel(treeSlug))} · 보드 위치/편집 미지원</h3>
      <div class="talent-source-only-list">
        ${group.map(({ item, kind, stableIds }) => `<article data-role="talent-source-only-item"
          data-source-kind="${escapeHtml(kind)}" data-stable-ids="${escapeHtml(stableIds.join(","))}">
          ${image(item, "talent-node-icon")}
          <strong>${escapeHtml(structuredTalentText(uiState, item, "name", item.name))}</strong>
          <p>${escapeHtml(structuredTalentText(
    uiState,
    item,
    "detail",
    item.detail ?? item.effect ?? item.summary,
  ))}</p>
        </article>`).join("")}
      </div>
    </section>`).join("")}
  </section>`;
}

function sourceOnlyTreeLabel(treeSlug) {
  return ({
    Talent: "출처 분류 미제공",
    God_of_Machines: "기계의 신",
    New_God: "새로운 신",
  })[treeSlug] ?? String(treeSlug || "SS13").replaceAll("_", " ");
}

function selectedOption(value, selected) {
  return value === selected ? "selected" : "";
}

function renderAffixOptions(affixes, selectedId, uiState) {
  return affixes.map((affix) => (
    `<option value="${escapeHtml(affix.modifierId)}" data-source-kind="prism-affix" ${selectedOption(affix.modifierId, selectedId)}>${escapeHtml(runtimeTalentText(uiState, "prism-modifier", affix.modifierId, affix.text))}</option>`
  )).join("");
}

function draftAffixValue(draft, field, legacyIndex) {
  return draft?.[field] ?? draft?.affixSlots?.[legacyIndex]?.modifierId ?? "";
}

function selectedAffixId(affixes, requestedId) {
  return affixes.some((affix) => affix.modifierId === requestedId)
    ? requestedId
    : affixes[0]?.modifierId ?? "";
}

export function synchronizeTalentPrismDraft(model, inputDraft = {}) {
  const draft = inputDraft && typeof inputDraft === "object" ? inputDraft : {};
  const requestedSlug = draft.prismItemSlug ?? draft.prismId ?? draft.prismSlug;
  const selectedPrism = model?.prismItemBySlug?.get(requestedSlug) ?? model?.prismItems?.[0];
  const rarityValues = selectedPrism?.supportedRarities ?? [];
  const rarity = rarityValues.includes(draft.rarity) ? draft.rarity : rarityValues[0] ?? "";
  const baseAffixes = getPrismBaseAffixes(model, selectedPrism?.slug);
  const legendaryAffixes = getPrismLegendaryAffixes(model, selectedPrism?.slug);
  const instanceId = String(draft.instanceId ?? "").trim();
  return {
    ...(instanceId ? { instanceId } : {}),
    prismItemSlug: selectedPrism?.slug ?? "",
    rarity,
    baseAffixModifierId: selectedAffixId(
      baseAffixes,
      draftAffixValue(draft, "baseAffixModifierId", 0),
    ),
    areaAffixModifierId: selectedAffixId(
      model?.areaAffixes ?? [],
      draftAffixValue(draft, "areaAffixModifierId", 1),
    ),
    rareRandomAffixModifierId: selectedAffixId(
      model?.rareGaugeAffixes ?? [],
      draftAffixValue(draft, "rareRandomAffixModifierId", 2),
    ),
    legendaryRandomAffixModifierId: rarity === "legendary"
      ? selectedAffixId(
        legendaryAffixes,
        draftAffixValue(draft, "legendaryRandomAffixModifierId", 3),
      )
      : "",
  };
}

function renderPrismAffixField(label, selectName, affixes, selectedId, uiState) {
  return `<fieldset data-role="talent-prism-affix-draft" data-affix-kind="${escapeHtml(selectName)}">
    <legend>${label}</legend>
    <select name="${escapeHtml(selectName)}" aria-label="${escapeHtml(label)}" required>
      ${renderAffixOptions(affixes, selectedId, uiState)}
    </select>
  </fieldset>`;
}

function renderPrismCreate(model, uiState) {
  const draft = synchronizeTalentPrismDraft(model, uiState?.prismDraft);
  const selectedPrism = model.prismItemBySlug.get(draft.prismItemSlug) ?? model.prismItems[0];
  const rarityValues = selectedPrism?.supportedRarities ?? [];
  const rarity = draft.rarity;
  const isLegendary = rarity === "legendary";
  const baseAffixes = getPrismBaseAffixes(model, selectedPrism?.slug);
  const legendaryAffixes = getPrismLegendaryAffixes(model, selectedPrism?.slug);
  return `<form class="talent-prism-create" data-action="talent-prism-create" data-slot-count="${isLegendary ? 4 : 3}">
    <h3>프리즘 추가</h3>
    <label>종류
      <select name="prismItemSlug" data-action="talent-prism-draft-change" required>
        ${model.prismItems.map((item) => (
          `<option value="${escapeHtml(item.slug)}" data-source-kind="prism" ${selectedOption(item.slug, selectedPrism?.slug)}>${escapeHtml(runtimeTalentText(uiState, "prism-item", item.slug, item.name))}</option>`
        )).join("")}
      </select>
    </label>
    <label>희귀도
      <select name="rarity" data-action="talent-prism-draft-change" required>
        ${rarityValues.map((value) => `<option value="${escapeHtml(value)}" ${selectedOption(value, rarity)}>${escapeHtml(prismRarityLabel(value))}</option>`).join("")}
      </select>
    </label>
    <div class="talent-prism-affix-draft">
      ${renderPrismAffixField(
    "기본 옵션",
    "baseAffixModifierId",
    baseAffixes,
    draft.baseAffixModifierId,
    uiState,
  )}
      ${renderPrismAffixField(
    "범위 옵션",
    "areaAffixModifierId",
    model.areaAffixes,
    draft.areaAffixModifierId,
    uiState,
  )}
      ${renderPrismAffixField(
    "레어 옵션",
    "rareRandomAffixModifierId",
    model.rareGaugeAffixes,
    draft.rareRandomAffixModifierId,
    uiState,
  )}
      ${isLegendary ? renderPrismAffixField(
    "레전드 옵션",
    "legendaryRandomAffixModifierId",
    legendaryAffixes,
    draft.legendaryRandomAffixModifierId,
    uiState,
  ) : ""}
    </div>
    <button type="submit">프리즘 추가</button>
  </form>`;
}

function placementFor(state, kind, instanceId = null) {
  const rootPlacement = kind === "prism" ? state.placedPrism : state.placedInverseImage;
  if (rootPlacement && (!instanceId || rootPlacement.instanceId === instanceId)) return rootPlacement;
  return null;
}

function placementSourceText(model, state, placement, uiState) {
  if (!placement) return "";
  const board = state.boards[placement.boardIndex];
  const tree = model.treeBySlug.get(board?.treeSlug);
  const node = model.nodeByFlatItemId.get(placement.nodeId) ?? model.nodeById.get(placement.nodeId);
  return [boardLabel(placement.boardIndex), treeSourceText(tree, uiState), nodeSourceText(node, uiState)]
    .filter(Boolean)
    .join(" · ");
}

function rollText(roll) {
  if (roll === null || roll === undefined || roll === "") return "";
  return typeof roll === "object" ? JSON.stringify(roll) : String(roll);
}

function prismRarityLabel(rarity) {
  return ({ rare: "레어", legendary: "레전드" })[rarity] ?? defaultGameText(rarity);
}

function prismAffixSlots(prism) {
  const current = [
    [prism.baseAffixModifierId, prism.baseAffixRoll],
    [prism.areaAffixModifierId, prism.areaAffixRoll],
    [prism.rareRandomAffixModifierId, prism.rareRandomAffixRoll],
    [prism.legendaryRandomAffixModifierId, prism.legendaryRandomAffixRoll],
  ].filter(([modifierId]) => modifierId);
  if (current.length) return current.map(([modifierId, roll]) => ({ modifierId, roll }));
  return (prism.affixSlots ?? []).filter(Boolean);
}

function renderPrismInventoryItem(model, state, prism, selectedInstanceId, uiState) {
  const definition = model.prismItemBySlug.get(
    prism.prismItemSlug ?? prism.prismId ?? prism.prismSlug,
  );
  const placement = placementFor(state, "prism", prism.instanceId);
  const selected = selectedInstanceId === prism.instanceId;
  const canUnplace = placement
    && unplacePrism(model, state, prism.instanceId).status === "unplaced";
  const focusLabel = placement
    ? talentEditorUiText(uiState, selected ? "talentMoveCancel" : "talentPrismMove")
    : selected ? "선택 해제" : "배치할 프리즘 선택";
  return `<article class="talent-prism-inventory-item" data-role="talent-prism-inventory-item"
    data-instance-id="${escapeHtml(prism.instanceId)}">
    <strong>${escapeHtml(runtimeTalentText(
    uiState,
    "prism-item",
    definition?.slug ?? prism.prismItemSlug ?? prism.prismId ?? prism.prismSlug,
    definition?.name ?? prism.prismItemName ?? prism.name,
  ))}</strong>
    <span>${escapeHtml(prismRarityLabel(prism.rarity))}</span>
    <ol>${prismAffixSlots(prism).map((slot) => {
      const affix = model.prismAffixById.get(slot.modifierId);
      return `<li data-role="talent-prism-inventory-affix">
        ${escapeHtml(runtimeTalentText(uiState, "prism-modifier", slot.modifierId, affix?.text ?? slot.modifierId))}
        ${rollText(slot.roll) ? `<small>수치 ${escapeHtml(defaultGameText(rollText(slot.roll)))}</small>` : ""}
      </li>`;
    }).join("")}</ol>
    <button type="button" data-action="talent-prism-focus" data-instance-id="${escapeHtml(prism.instanceId)}"
      aria-pressed="${selected}">${escapeHtml(focusLabel)}</button>
    ${placement ? `<p data-role="talent-prism-placement">${escapeHtml(placementSourceText(model, state, placement, uiState))}</p>` : ""}
    ${placement ? `<div class="talent-placement-actions">
      <button type="button" data-action="talent-prism-unplace" data-instance-id="${escapeHtml(prism.instanceId)}"
        ${canUnplace ? "" : "disabled"}>배치 해제</button>
    </div>` : ""}
    <button type="button" data-action="store-prism-inventory" data-instance-id="${escapeHtml(prism.instanceId)}">로컬 보관함에 저장</button>
    <button type="button" data-action="talent-prism-delete" data-instance-id="${escapeHtml(prism.instanceId)}">삭제</button>
  </article>`;
}

function renderPrismSection(model, state, uiState) {
  return `<section class="talent-prism-section" data-role="talent-prism-section">
    ${renderPrismCreate(model, uiState)}
    <div class="talent-prism-inventory">
      ${state.prismInventory.map((prism) => (
        renderPrismInventoryItem(model, state, prism, uiState?.selectedPrismInstanceId, uiState)
      )).join("")}
    </div>
  </section>`;
}

function renderInverseInventoryItem(model, state, inverseImage, selectedInstanceId, uiState) {
  const placement = placementFor(state, "inverse", inverseImage.instanceId);
  const selected = selectedInstanceId === inverseImage.instanceId;
  const canUnplace = placement
    && unplaceInverseImage(model, state, inverseImage.instanceId).status === "unplaced";
  const focusLabel = placement
    ? talentEditorUiText(uiState, selected ? "talentMoveCancel" : "talentInverseMove")
    : selected ? "선택 해제" : "배치할 역상 선택";
  return `<article class="talent-inverse-inventory-item" data-role="talent-inverse-inventory-item"
    data-instance-id="${escapeHtml(inverseImage.instanceId)}">
    <strong>${escapeHtml(defaultGameText(inverseImage.name ?? inverseImage.inverseImageId ?? inverseImage.instanceId))}</strong>
    <dl data-role="talent-inverse-effects">
      <div><dt>하위 재능 효과</dt><dd>${escapeHtml(defaultGameText(inverseImage.microTalentEffect))}</dd></div>
      <div><dt>중위 재능 효과</dt><dd>${escapeHtml(defaultGameText(inverseImage.mediumTalentEffect))}</dd></div>
      <div><dt>레전드 중위 재능 효과</dt><dd>${escapeHtml(defaultGameText(inverseImage.legendaryTalentEffect))}</dd></div>
    </dl>
    <button type="button" data-action="talent-inverse-focus" data-instance-id="${escapeHtml(inverseImage.instanceId)}"
      aria-pressed="${selected}">${escapeHtml(focusLabel)}</button>
    ${placement ? `<p data-role="talent-inverse-placement">${escapeHtml(placementSourceText(model, state, placement, uiState))}</p>` : ""}
    ${placement ? `<div class="talent-placement-actions">
      <button type="button" data-action="talent-inverse-unplace" data-instance-id="${escapeHtml(inverseImage.instanceId)}"
        ${canUnplace ? "" : "disabled"}>배치 해제</button>
    </div>` : ""}
    <button type="button" data-action="talent-inverse-delete" data-instance-id="${escapeHtml(inverseImage.instanceId)}">삭제</button>
  </article>`;
}

function renderInverseSection(model, state, uiState) {
  const draft = uiState?.inverseDraft ?? {};
  const selectedInverseInstanceId = uiState?.selectedInverseInstanceId
    ?? uiState?.selectedInverseImageInstanceId;
  return `<section class="talent-inverse-section" data-role="talent-inverse-section">
    <form class="talent-inverse-create" data-action="talent-inverse-create">
      <h3>역상 추가</h3>
      <label>역상 원문 이름 <input name="name" value="${escapeHtml(defaultGameText(draft.name ?? ""))}" required /></label>
      <label>하위 재능 효과
        <input type="number" name="microTalentEffect" value="${escapeHtml(draft.microTalentEffect ?? 0)}" min="-100" max="200" step="any" required />
      </label>
      <label>중위 재능 효과
        <input type="number" name="mediumTalentEffect" value="${escapeHtml(draft.mediumTalentEffect ?? 0)}" min="-100" max="100" step="any" required />
      </label>
      <label>레전드 중위 재능 효과
        <input type="number" name="legendaryTalentEffect" value="${escapeHtml(draft.legendaryTalentEffect ?? 0)}" min="-100" max="50" step="any" required />
      </label>
      <button type="submit">역상 추가</button>
    </form>
    <div class="talent-inverse-inventory">
      ${state.inverseImageInventory.map((item) => (
        renderInverseInventoryItem(model, state, item, selectedInverseInstanceId, uiState)
      )).join("")}
    </div>
  </section>`;
}

export function renderTalentEditor(model, inputState, uiState = {}) {
  const state = normalizeTalentBoardState(model, inputState);
  const selectedIndex = activeBoardIndex(uiState);
  return `<section class="talent-editor" data-talent-editor data-tree="${escapeHtml(state.boards[selectedIndex]?.treeSlug ?? "")}">
    <header class="talent-editor-header">
      <h1>재능 편집</h1>
      <button type="button" data-action="talent-board-reset-all">모든 보드 초기화</button>
      <nav class="talent-board-tabs" aria-label="재능 보드">
        ${renderBoardTabs(model, state, selectedIndex, uiState)}
      </nav>
    </header>
    ${uiState.screenshotMatchLabel
      ? `<p class="screenshot-editor-match" data-role="screenshot-editor-match">${escapeHtml(talentEditorUiText(uiState, "screenshotRecognizedEditorHint").replace("{name}", () => uiState.screenshotMatchLabel))}</p>`
      : ""}
    ${renderActiveBoard(model, state, selectedIndex, uiState)}
    <details class="talent-source-disclosure"><summary>위치 미제공 재능 원문 보기 · 선택·계산 미지원</summary>${renderSourceOnlyTalents(model, uiState)}</details>
    <details class="ingame-talent-accessory"><summary>프리즘 · 제작 및 배치</summary>${renderPrismSection(model, state, uiState)}</details>
    <details class="ingame-talent-accessory"><summary>역상 · 제작 및 배치</summary>${renderInverseSection(model, state, uiState)}</details>
  </section>`;
}

function readIndex(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readField(target, name) {
  const elements = target?.elements;
  const control = elements?.namedItem?.(name) ?? elements?.[name];
  return control?.value ?? "";
}

function readPrismDraftFields(target) {
  return {
    prismItemSlug: String(
      readField(target, "prismItemSlug") || readField(target, "prismId"),
    ).trim(),
    rarity: String(readField(target, "rarity")).trim(),
    baseAffixModifierId: String(readField(target, "baseAffixModifierId")).trim(),
    areaAffixModifierId: String(readField(target, "areaAffixModifierId")).trim(),
    rareRandomAffixModifierId: String(readField(target, "rareRandomAffixModifierId")).trim(),
    legendaryRandomAffixModifierId: String(
      readField(target, "legendaryRandomAffixModifierId"),
    ).trim(),
  };
}

function readPrismDraft(target) {
  const {
    prismItemSlug,
    rarity,
    baseAffixModifierId,
    areaAffixModifierId,
    rareRandomAffixModifierId,
    legendaryRandomAffixModifierId,
  } = readPrismDraftFields(target);
  if (!prismItemSlug || !rarity || !baseAffixModifierId || !areaAffixModifierId || !rareRandomAffixModifierId) {
    return null;
  }
  if (rarity === "legendary" && !legendaryRandomAffixModifierId) return null;
  const instanceId = String(readField(target, "instanceId")).trim();
  return {
    prismItemSlug,
    rarity,
    baseAffixModifierId,
    areaAffixModifierId,
    rareRandomAffixModifierId,
    legendaryRandomAffixModifierId: rarity === "legendary" ? legendaryRandomAffixModifierId : "",
    ...(instanceId ? { instanceId } : {}),
  };
}

function readInverseDraft(target) {
  const name = String(readField(target, "name")).trim();
  if (!name) return null;
  const effectFields = ["microTalentEffect", "mediumTalentEffect", "legendaryTalentEffect"];
  const effects = {};
  for (const field of effectFields) {
    const raw = readField(target, field);
    const value = raw === "" || raw === null || raw === undefined ? 0 : readNumber(raw);
    if (value === null) return null;
    effects[field] = value;
  }
  const instanceId = String(readField(target, "instanceId")).trim();
  return {
    name,
    ...effects,
    ...(instanceId ? { instanceId } : {}),
  };
}

function readPrismDraftChange(target) {
  const changedField = String(target?.name ?? target?.dataset?.draftField ?? "").trim();
  if (changedField !== "prismItemSlug" && changedField !== "rarity") return null;
  let form = target?.form ?? null;
  if (!form && typeof target?.closest === "function") form = target.closest("form");
  if (!form) return null;
  const draft = readPrismDraftFields(form);
  draft[changedField] = String(target?.value ?? "").trim();
  return { changedField, draft };
}

function readInstanceCommand(type, dataset, details = {}) {
  const instanceId = typeof dataset?.instanceId === "string" ? dataset.instanceId.trim() : "";
  return instanceId ? { type, instanceId, ...details } : null;
}

export function readTalentEditorCommand(target) {
  const dataset = target?.dataset;
  const type = dataset?.action;
  if (typeof type !== "string" || !type.startsWith("talent-")) return null;
  const boardIndex = readIndex(dataset.boardIndex);
  switch (type) {
    case "talent-board-reset-all":
      return { type };
    case "talent-board-activate":
    case "talent-board-reset":
      return boardIndex === null ? null : { type, boardIndex };
    case "talent-tree-select":
      return boardIndex === null ? null : { type, boardIndex, treeSlug: String(target.value ?? "") };
    case "talent-node-add":
    case "talent-node-remove": {
      const nodeId = typeof dataset.nodeId === "string" ? dataset.nodeId.trim() : "";
      return boardIndex === null || !nodeId ? null : { type, boardIndex, nodeId };
    }
    case "talent-core-toggle": {
      const coreTalentId = typeof dataset.coreTalentId === "string" ? dataset.coreTalentId.trim() : "";
      return boardIndex === null || !coreTalentId ? null : { type, boardIndex, coreTalentId };
    }
    case "talent-prism-draft-change": {
      const change = readPrismDraftChange(target);
      return change ? { type, ...change } : null;
    }
    case "talent-prism-create": {
      const draft = readPrismDraft(target);
      return draft ? { type, draft } : null;
    }
    case "talent-prism-place":
    case "talent-prism-move":
    case "talent-inverse-place":
    case "talent-inverse-move": {
      const nodeId = typeof dataset.nodeId === "string" ? dataset.nodeId.trim() : "";
      return boardIndex === null || !nodeId
        ? null
        : readInstanceCommand(type, dataset, { boardIndex, nodeId });
    }
    case "talent-prism-focus":
    case "talent-inverse-focus":
    case "talent-prism-unplace":
    case "talent-prism-delete":
    case "talent-inverse-unplace":
    case "talent-inverse-delete":
      return readInstanceCommand(type, dataset);
    case "talent-inverse-create": {
      const draft = readInverseDraft(target);
      return draft ? { type, draft } : null;
    }
    default:
      return null;
  }
}

export function readTalentEditorContextCommand(target) {
  const dataset = target?.dataset;
  if (dataset?.role !== "talent-node-cell" || dataset?.contextAction !== "talent-node-remove") {
    return null;
  }
  const boardIndex = readIndex(dataset.boardIndex);
  const nodeId = typeof dataset.nodeId === "string" ? dataset.nodeId.trim() : "";
  return boardIndex === null || !nodeId
    ? null
    : { type: "talent-node-remove", boardIndex, nodeId };
}

function nextInstanceId(state, prefix) {
  const used = new Set([
    ...state.prismInventory.map((item) => item?.instanceId),
    ...state.inverseImageInventory.map((item) => item?.instanceId),
  ].filter(Boolean));
  const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "item";
  let suffix = 1;
  while (used.has(`${safePrefix}-${suffix}`)) suffix += 1;
  return `${safePrefix}-${suffix}`;
}

export function reduceTalentEditorCommand(model, inputState, command) {
  const state = normalizeTalentBoardState(model, inputState);
  if (!command || typeof command.type !== "string") return state;
  switch (command.type) {
    case "talent-board-activate":
    case "talent-prism-draft-change":
    case "talent-prism-focus":
    case "talent-inverse-focus":
      return state;
    case "talent-tree-select":
      return command.treeSlug
        ? selectTalentTree(model, state, command.boardIndex, command.treeSlug).state
        : resetTalentBoard(model, state, command.boardIndex).state;
    case "talent-board-reset":
      return resetTalentBoard(model, state, command.boardIndex).state;
    case "talent-board-reset-all":
      return resetAllTalentBoards(model, state).state;
    case "talent-node-add":
      return addTalentNodePoint(model, state, command.boardIndex, command.nodeId).state;
    case "talent-node-remove":
      return removeTalentNodePoint(model, state, command.boardIndex, command.nodeId).state;
    case "talent-core-toggle":
      return toggleCoreTalent(model, state, command.boardIndex, command.coreTalentId).state;
    case "talent-prism-create": {
      const draft = command.draft ?? {};
      const instanceId = draft.instanceId
        || nextInstanceId(state, `talent-prism-${draft.prismItemSlug ?? draft.prismId ?? "item"}`);
      return addPrismToInventory(model, state, { ...draft, instanceId }).state;
    }
    case "talent-prism-place":
      return placePrism(model, state, command.boardIndex, command.instanceId, command.nodeId).state;
    case "talent-prism-move":
      return movePrism(model, state, command.instanceId, command.boardIndex, command.nodeId).state;
    case "talent-prism-unplace":
      return unplacePrism(model, state, command.instanceId).state;
    case "talent-prism-delete":
      return deletePrismFromInventory(state, command.instanceId).state;
    case "talent-inverse-create": {
      const draft = command.draft ?? {};
      const instanceId = draft.instanceId || nextInstanceId(state, `talent-inverse-${draft.name ?? "item"}`);
      return addInverseImageToInventory(state, { ...draft, instanceId }).state;
    }
    case "talent-inverse-place":
      return placeInverseImage(model, state, command.boardIndex, command.instanceId, command.nodeId).state;
    case "talent-inverse-move":
      return moveInverseImage(model, state, command.instanceId, command.boardIndex, command.nodeId).state;
    case "talent-inverse-unplace":
      return unplaceInverseImage(model, state, command.instanceId).state;
    case "talent-inverse-delete":
      return deleteInverseImageFromInventory(state, command.instanceId).state;
    default:
      return state;
  }
}

export function reduceTalentEditorCommandWithStatus(model, inputState, command) {
  const state = normalizeTalentBoardState(model, inputState);
  if (command?.type === "talent-prism-move") {
    return movePrism(model, state, command.instanceId, command.boardIndex, command.nodeId);
  }
  if (command?.type === "talent-inverse-move") {
    return moveInverseImage(model, state, command.instanceId, command.boardIndex, command.nodeId);
  }
  return {
    status: command?.type ? "applied" : "unchanged",
    state: reduceTalentEditorCommand(model, state, command),
  };
}
