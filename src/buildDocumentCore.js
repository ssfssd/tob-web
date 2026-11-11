import { projectDivinitySlateCalculationIds } from "./divinitySlateModel.js";
import {
  PACT_RING_SLOT_ORDER,
  PACT_SPIRIT_SLOT_IDS,
  PACT_TOPOLOGY_VERSION,
} from "./pactDestinyModel.js";
import { deriveTalentFlatItemIds } from "./talentBoardModel.js";
import { TALENT_CALCULATION_MODEL } from "./talentCalculationRuntime.js";
import { normalizeHeroMemoryTypeId } from "./heroMemoryIdentity.js";

// Kept as the internal schema implementation. Public normalization goes through
// buildDocument.js so compatibility projections cannot overwrite surviving instances.
export const BUILD_DOCUMENT_SCHEMA_VERSION = 1;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJson(value, fallback = null) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (Array.isArray(value)) return value.map((entry) => cloneJson(entry));
  if (!isPlainObject(value)) return fallback;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && typeof entry !== "function" && typeof entry !== "symbol")
      .map(([key, entry]) => [key, cloneJson(entry)]),
  );
}

function stringOrNull(value) {
  return typeof value === "string" && value ? value : null;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function fixedSlots(input, length, normalizeEntry) {
  return Array.from({ length }, (_, index) => normalizeEntry(input?.[index], index));
}

function normalizeResearch(input) {
  return {
    season: typeof input?.season === "string" ? input.season.trim() : "",
    sources: Array.isArray(input?.sources)
      ? input.sources.filter((source) => typeof source === "string" && source.trim()).map((source) => source.trim())
      : [],
    notes: typeof input?.notes === "string" ? input.notes : "",
  };
}

function normalizeSelections(input) {
  if (!isPlainObject(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, entries]) => Array.isArray(entries))
      .map(([categoryId, entries]) => [
        categoryId,
        categoryId === "heroMemory"
          ? entries.map((entry) => normalizeHeroMemoryTypeId(entry))
          : cloneJson(entries, []),
      ]),
  );
}

function normalizeLegacySupport(supportId) {
  const normalizedId = stringOrNull(supportId);
  return normalizedId ? { supportId: normalizedId, level: 0 } : null;
}

function legacySkillSlot(selections, levels, index, role) {
  return normalizeSkillSlot({
    skillId: stringOrNull(selections?.skills?.[index]),
    level: finiteNumber(levels?.[index]),
    supports: fixedSlots(
      selections?.supports?.slice(index * 5, index * 5 + 5),
      5,
      normalizeLegacySupport,
    ),
  }, role);
}

function legacyMemory(memoryTypeId, index) {
  const normalizedId = normalizeHeroMemoryTypeId(stringOrNull(memoryTypeId));
  return normalizedId
    ? {
        instanceId: `legacy-memory-${index}`,
        memoryTypeId: normalizedId,
        baseAttributeId: null,
        enhancement: 0,
        profitLoss: false,
        revivalAffixId: null,
        fixedAffixIds: [],
        randomAffixIds: [],
      }
    : null;
}

function legacyGearSlot(input, index) {
  const itemId = stringOrNull(input?.selections?.gear?.[index]);
  if (!itemId) return null;
  return {
    instanceId: `legacy-gear-${index}`,
    itemId,
    affixText: typeof input?.gearAffixes?.[itemId] === "string" ? input.gearAffixes[itemId] : "",
    rolls: cloneJson(input?.gearRolls?.[itemId], {}),
    crafts: cloneJson(input?.gearCrafts?.[itemId], {}),
    corrupted: Boolean(input?.gearCorruptions?.[itemId]),
    legendaryDraft: normalizeLegendaryDraft(input?.gearLegendaryDrafts?.[itemId]),
  };
}

function legacyTalentBoards(talentIds) {
  return Array.from({ length: 4 }, (_, index) => ({
    ...emptyTalentBoard(),
    selectedNodeIds: Array.isArray(talentIds)
      ? talentIds.slice(index * 3, index * 3 + 3).filter((itemId) => typeof itemId === "string" && itemId)
      : [],
  }));
}

function legacyDivinityBoards(slateIds) {
  if (!Array.isArray(slateIds) || !slateIds.some(Boolean)) return [];
  return [
    {
      boardId: "legacy-divinity-0",
      width: 6,
      height: 6,
      cells: fixedSlots(slateIds, 36, (slateId) => {
        const normalizedId = stringOrNull(slateId);
        return normalizedId ? { slateId: normalizedId, rotation: 0 } : null;
      }),
    },
  ];
}

function legacyPact(selections) {
  return normalizeCurrentPact({
    spirits: fixedSlots(selections?.spirits, 3, (spiritId, index) => {
      const normalizedId = stringOrNull(spiritId);
      return normalizedId ? { instanceId: `legacy-spirit-${index}`, spiritId: normalizedId } : null;
    }),
    destiny: {
      smallSlots: fixedSlots(selections?.destiny, 9, (destinyId, index) => {
        const normalizedId = stringOrNull(destinyId);
        return normalizedId ? { instanceId: `legacy-destiny-small-${index}`, destinyId: normalizedId } : null;
      }),
      mediumSlots: fixedSlots(selections?.destiny?.slice(9), 4, (destinyId, index) => {
        const normalizedId = stringOrNull(destinyId);
        return normalizedId ? { instanceId: `legacy-destiny-medium-${index}`, destinyId: normalizedId } : null;
      }),
      undetermined: Array(5).fill(null),
    },
  });
}

function normalizeSupport(input) {
  if (typeof input === "string") return input ? { supportId: input, level: 0 } : null;
  if (!isPlainObject(input)) return null;
  const normalized = {
    supportId: stringOrNull(input.supportId),
    level: finiteNumber(input.level),
  };
  if (isPlainObject(input.config)) normalized.config = cloneJson(input.config, {});
  return normalized;
}

function normalizeUnlockedSupportCount(input, role, supports) {
  const minimum = role === "active" ? 1 : 0;
  const lastSupportIndex = supports.findLastIndex(Boolean);
  const inferred = Math.max(minimum, lastSupportIndex + 1);
  const explicit = Number(input);
  if (input === null || input === undefined || input === "" || !Number.isFinite(explicit)) return inferred;
  return Math.max(minimum, Math.min(5, Math.trunc(explicit)));
}

function normalizeSkillSlot(input, role) {
  if (typeof input === "string") return { ...emptySkillSlot(role), skillId: stringOrNull(input) };
  if (!isPlainObject(input)) return emptySkillSlot(role);
  const supports = fixedSlots(input.supports, 5, normalizeSupport);
  const unlockedSupportCount = normalizeUnlockedSupportCount(input.unlockedSupportCount, role, supports);
  const modularizationInput = isPlainObject(input.modularization) ? input.modularization : null;
  const moduleOptionIds = Array.isArray(modularizationInput?.moduleOptionIds)
    ? modularizationInput.moduleOptionIds.map(stringOrNull).filter(Boolean).slice(0, 3)
    : [];
  const elementalProtocolDamageType = ["fire", "cold", "lightning"].includes(
    modularizationInput?.elementalProtocolDamageType,
  ) ? modularizationInput.elementalProtocolDamageType : null;
  const modularization = modularizationInput
    ? {
        modularizationSkillId: stringOrNull(modularizationInput.modularizationSkillId),
        moduleOptionIds,
        ...(modularizationInput.summonCount !== undefined
          ? { summonCount: Math.max(0, finiteNumber(modularizationInput.summonCount)) }
          : {}),
        ...(moduleOptionIds.includes("protocol_elemental") && elementalProtocolDamageType
          ? { elementalProtocolDamageType }
          : {}),
      }
    : null;
  const spiritHost = role === "active" && isPlainObject(input.spiritHost)
    ? {
        skillId: stringOrNull(input.spiritHost.skillId),
        shared: input.spiritHost.shared === true,
      }
    : null;
  return {
    skillId: stringOrNull(input.skillId),
    level: finiteNumber(input.level),
    unlockedSupportCount,
    supports: supports.map((support, index) => (index < unlockedSupportCount ? support : null)),
    sealedLife: finiteNumber(input.sealedLife),
    sealedMana: finiteNumber(input.sealedMana),
    ...(modularization?.modularizationSkillId ? { modularization } : {}),
    ...(spiritHost?.skillId ? { spiritHost } : {}),
  };
}

function normalizeElixir(input) {
  if (!isPlainObject(input)) return null;
  return {
    bottleId: stringOrNull(input.bottleId),
    skillId: stringOrNull(input.skillId),
    level: finiteNumber(input.level),
    ingredientIds: Array.isArray(input.ingredientIds)
      ? input.ingredientIds.map(stringOrNull)
      : [],
    supports: Array.isArray(input.supports) ? input.supports.map(normalizeSupport) : [],
    sealedLife: finiteNumber(input.sealedLife),
    sealedMana: finiteNumber(input.sealedMana),
  };
}

function normalizeInstance(input) {
  return isPlainObject(input) ? cloneJson(input, {}) : null;
}

function normalizeHeroTraitSelection(input) {
  const selection = cloneJson(input, null);
  if (!isPlainObject(selection) || !Object.hasOwn(selection, "choiceTiers")) return selection;

  const selectedChoiceIds = new Set(
    (Array.isArray(selection.choiceIds) ? selection.choiceIds : [])
      .filter((choiceId) => typeof choiceId === "string" && choiceId),
  );
  const choiceTiers = isPlainObject(selection.choiceTiers)
    ? Object.fromEntries(Object.entries(selection.choiceTiers).filter(([choiceId, tier]) => (
        selectedChoiceIds.has(choiceId) && Number.isInteger(tier)
      )))
    : {};
  if (Object.keys(choiceTiers).length > 0) selection.choiceTiers = choiceTiers;
  else delete selection.choiceTiers;
  return selection;
}

function normalizeCurrentHero(input) {
  const revivalMemory = normalizeInstance(input?.revivalMemory);
  return {
    branchId: stringOrNull(input?.branchId),
    level: Math.max(1, Math.min(100, Math.round(finiteNumber(input?.level, 90)))),
    traitSelections: Array.isArray(input?.traitSelections)
      ? input.traitSelections.map(normalizeHeroTraitSelection)
      : [],
    memories: Array.isArray(input?.memories) ? input.memories.map((memory) => {
      const normalized = normalizeInstance(memory);
      return normalized
        ? { ...normalized, memoryTypeId: normalizeHeroMemoryTypeId(normalized.memoryTypeId) }
        : null;
    }) : [],
    revivalMemory: revivalMemory
      ? {
          ...revivalMemory,
          memoryTypeId: normalizeHeroMemoryTypeId(revivalMemory.memoryTypeId),
        }
      : null,
  };
}

function normalizeCurrentSkills(input) {
  const sourceElixirs = Array.isArray(input?.elixirs) ? [...input.elixirs] : [input?.elixir, null];
  if (!sourceElixirs[0] && input?.elixir) sourceElixirs[0] = input.elixir;
  const elixirs = fixedSlots(sourceElixirs, 2, normalizeElixir);
  return {
    active: fixedSlots(input?.active, 5, (slot) => normalizeSkillSlot(slot, "active")),
    passive: fixedSlots(input?.passive, 4, (slot) => normalizeSkillSlot(slot, "passive")),
    energyMax: Math.max(0, finiteNumber(input?.energyMax, 525)),
    elixir: elixirs[0],
    elixirs,
  };
}

function normalizeCurrentGear(input) {
  return {
    slots: fixedSlots(input?.slots, 10, normalizeInstance),
    inventory: Array.isArray(input?.inventory) ? input.inventory.map(normalizeInstance).filter(Boolean) : [],
  };
}

function normalizeLegendaryDraft(input) {
  if (!isPlainObject(input)) return null;
  return {
    ...cloneJson(input, {}),
    corrodedSlotIds: Array.isArray(input.corrodedSlotIds)
      ? [...new Set(input.corrodedSlotIds.filter((slotId) => typeof slotId === "string" && slotId))]
      : [],
  };
}

function normalizeLegendaryDraftMap(input) {
  if (!isPlainObject(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .map(([itemId, draft]) => [itemId, normalizeLegendaryDraft(draft)])
      .filter(([itemId, draft]) => typeof itemId === "string" && itemId && draft),
  );
}

function normalizeCurrentTalents(input) {
  return {
    boards: fixedSlots(input?.boards, 4, (board) =>
      isPlainObject(board) ? cloneJson(board, emptyTalentBoard()) : emptyTalentBoard(),
    ),
    prismInventory: Array.isArray(input?.prismInventory)
      ? input.prismInventory.map(normalizeInstance).filter(Boolean)
      : [],
    inverseImageInventory: Array.isArray(input?.inverseImageInventory)
      ? input.inverseImageInventory.map(normalizeInstance).filter(Boolean)
      : [],
    ...(Object.hasOwn(input ?? {}, "placedPrism")
      ? { placedPrism: normalizeInstance(input?.placedPrism) }
      : {}),
    ...(Object.hasOwn(input ?? {}, "placedInverseImage")
      ? { placedInverseImage: normalizeInstance(input?.placedInverseImage) }
      : {}),
  };
}

function normalizeCurrentDivinity(input) {
  return {
    boards: Array.isArray(input?.boards) ? input.boards.map(normalizeInstance).filter(Boolean) : [],
    activeBoardId: stringOrNull(input?.activeBoardId),
  };
}

function emptyPactSlot(slotId) {
  return {
    slotId,
    spirit: null,
    rings: Object.fromEntries(PACT_RING_SLOT_ORDER.map((ringSlotId) => [
      ringSlotId,
      { installedDestiny: null },
    ])),
    undeterminedFate: null,
  };
}

function normalizePactSlot(input, slotId) {
  const fallback = emptyPactSlot(slotId);
  const source = isPlainObject(input) ? input : {};
  const originalSpirit = stringOrNull(source.pactspiritSlug)
    ? {
        instanceId: `pact-spirit-${slotId}-${source.pactspiritSlug}`,
        spiritId: source.pactspiritSlug,
        level: finiteNumber(source.level, 1),
      }
    : null;
  return {
    slotId,
    spirit: normalizeInstance(source.spirit ?? originalSpirit),
    rings: Object.fromEntries(PACT_RING_SLOT_ORDER.map((ringSlotId) => {
      const ring = source.rings?.[ringSlotId];
      return [ringSlotId, {
        installedDestiny: normalizeInstance(ring?.installedDestiny ?? ring?.destiny),
      }];
    })),
    undeterminedFate: normalizeInstance(source.undeterminedFate),
  };
}

function normalizeLegacyPactUnassigned(input) {
  const normalized = {
    smallSlots: fixedSlots(input?.smallSlots, 9, normalizeInstance),
    mediumSlots: fixedSlots(input?.mediumSlots, 4, normalizeInstance),
    undetermined: fixedSlots(input?.undetermined, 5, normalizeInstance),
  };
  return Object.values(normalized).some((entries) => entries.some(Boolean)) ? normalized : null;
}

function normalizeCurrentPact(input) {
  const hasCanonicalSlots = Array.isArray(input?.slots) || isPlainObject(input?.slots);
  const slots = PACT_SPIRIT_SLOT_IDS.map((slotId, slotIndex) => {
    if (hasCanonicalSlots) {
      const source = Array.isArray(input.slots)
        ? input.slots.find((slot) => slot?.slotId === slotId) ?? input.slots[slotIndex]
        : input.slots[slotId];
      return normalizePactSlot(source, slotId);
    }
    const slot = emptyPactSlot(slotId);
    slot.spirit = normalizeInstance(input?.spirits?.[slotIndex]);
    return slot;
  });
  const legacyUnassigned = normalizeLegacyPactUnassigned(
    hasCanonicalSlots ? input?.legacyUnassigned : input?.destiny,
  );
  const sourceOnlyDestinyIds = Array.isArray(input?.sourceOnlyDestinyIds)
    ? [...new Set(input.sourceOnlyDestinyIds.filter((id) => typeof id === "string" && id))]
    : [];
  return {
    topologyVersion: PACT_TOPOLOGY_VERSION,
    slots,
    ...(legacyUnassigned ? { legacyUnassigned } : {}),
    ...(sourceOnlyDestinyIds.length ? { sourceOnlyDestinyIds } : {}),
  };
}

function selectedOrExisting(derived, existing) {
  if (derived.some(Boolean)) return derived;
  return Array.isArray(existing) ? cloneJson(existing, []) : derived;
}

function trimTrailingEmptySelections(entries) {
  let end = entries.length;
  while (end > 0 && !entries[end - 1]) end -= 1;
  return entries.slice(0, end);
}

function deriveTalentBoardSelections(board) {
  const points = isPlainObject(board?.nodePoints) ? board.nodePoints : {};
  const nodeIds = [...new Set([
    ...(Array.isArray(board?.selectedNodeIds) ? board.selectedNodeIds : []),
    ...Object.keys(points),
  ].map(stringOrNull).filter(Boolean))];
  const selectedNodes = nodeIds.flatMap((nodeId) => (
    Array.from({ length: Math.max(1, Math.trunc(finiteNumber(points[nodeId], 1))) }, () => nodeId)
  ));
  const coreTalents = Array.isArray(board?.coreTalentIds)
    ? board.coreTalentIds.map(stringOrNull).filter(Boolean)
    : [];
  return [...selectedNodes, ...coreTalents];
}

function derivePactDestinySelections(pact) {
  const canonicalIds = [];
  for (const slot of Array.isArray(pact?.slots) ? pact.slots : []) {
    for (const ringSlotId of PACT_RING_SLOT_ORDER) {
      canonicalIds.push(slot?.rings?.[ringSlotId]?.installedDestiny?.destinyId ?? null);
    }
    const children = Array.isArray(slot?.undeterminedFate?.slots)
      ? slot.undeterminedFate.slots
      : [];
    for (const child of children) {
      canonicalIds.push(child?.installedDestiny?.destinyId ?? child?.destiny?.destinyId ?? null);
    }
  }
  if (canonicalIds.some(Boolean)) return trimTrailingEmptySelections(canonicalIds);

  const legacyIds = [];
  for (const field of ["smallSlots", "mediumSlots"]) {
    const destinies = Array.isArray(pact?.legacyUnassigned?.[field])
      ? pact.legacyUnassigned[field]
      : [];
    for (const destiny of destinies) {
      legacyIds.push(destiny?.destinyId ?? null);
    }
  }
  const legacyUndetermined = Array.isArray(pact?.legacyUnassigned?.undetermined)
    ? pact.legacyUnassigned.undetermined
    : [];
  for (const undetermined of legacyUndetermined) {
    const children = Array.isArray(undetermined?.slots) ? undetermined.slots : [];
    for (const child of children) {
      legacyIds.push(child?.installedDestiny?.destinyId ?? child?.destiny?.destinyId ?? null);
    }
  }
  return trimTrailingEmptySelections(legacyIds);
}

function deriveCompatibilitySelections(existing, document) {
  const selections = normalizeSelections(existing);
  const skillSlots = [...document.skills.active, ...document.skills.passive];
  const activeDivinityBoard =
    document.divinity.boards.find((board) => board.boardId === document.divinity.activeBoardId) ??
    document.divinity.boards[0];
  const hasSlateInventory = Array.isArray(activeDivinityBoard?.slateInventory);
  const projectedSlateIds = hasSlateInventory
    ? projectDivinitySlateCalculationIds(activeDivinityBoard)
    : trimTrailingEmptySelections(
        Array.isArray(activeDivinityBoard?.cells)
          ? activeDivinityBoard.cells.map((cell) => cell?.slateId ?? null)
          : [],
      );
  const projectedRuntimeTalentIds = deriveTalentFlatItemIds(
    TALENT_CALCULATION_MODEL,
    document.talents,
  );
  const projectedTalentIds = projectedRuntimeTalentIds.length
    ? projectedRuntimeTalentIds
    : document.talents.boards.flatMap(deriveTalentBoardSelections);

  return {
    ...selections,
    hero: selectedOrExisting([document.hero.branchId], selections.hero),
    heroMemory: selectedOrExisting(
      trimTrailingEmptySelections(
        document.hero.memories.map((memory) => memory?.memoryTypeId ?? null),
      ),
      selections.heroMemory,
    ),
    skills: selectedOrExisting(skillSlots.map((slot) => slot.skillId), selections.skills),
    supports: selectedOrExisting(
      skillSlots.flatMap((slot) => fixedSlots(slot.supports, 5, (support) => support?.supportId ?? null)),
      selections.supports,
    ),
    gear: selectedOrExisting(
      trimTrailingEmptySelections(document.gear.slots.map((slot) => slot?.itemId ?? null)),
      selections.gear,
    ),
    talents: selectedOrExisting(
      projectedTalentIds,
      selections.talents,
    ),
    slates: hasSlateInventory
      ? projectedSlateIds
      : selectedOrExisting(projectedSlateIds, selections.slates),
    spirits: selectedOrExisting(
      trimTrailingEmptySelections(document.pact.slots.map((slot) => slot?.spirit?.spiritId ?? null)),
      selections.spirits,
    ),
    destiny: selectedOrExisting(
      derivePactDestinySelections(document.pact),
      selections.destiny,
    ),
  };
}

const NESTED_SELECTION_CATEGORIES = ["gear", "talents", "slates", "spirits", "destiny"];

function sameSelectionEntries(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function selectionChangedSinceProjection(input, derived, categoryId) {
  const incoming = input?.selections?.[categoryId];
  if (!Array.isArray(incoming)) return false;
  const projected = input?.selectionProjection?.[categoryId];
  if (Array.isArray(projected)) return !sameSelectionEntries(incoming, projected);
  return incoming.some(Boolean) && !derived?.[categoryId]?.some(Boolean);
}

function reconcileInstanceSlots(slots, selectedIds, idField, instancePrefix) {
  const source = Array.isArray(slots) ? slots : [];
  // Reserve unchanged placements before filling earlier slots with duplicates.
  // Otherwise an earlier new copy can steal an instance still equipped later.
  const reserved = new Set(source.flatMap((entry, index) => (
    entry?.[idField] && entry[idField] === stringOrNull(selectedIds?.[index]) ? [index] : []
  )));
  const used = new Set();
  return Array.from({ length: source.length }, (_, index) => {
    const selectedId = stringOrNull(selectedIds?.[index]);
    if (!selectedId) return null;

    let sourceIndex = source[index]?.[idField] === selectedId && !used.has(index) ? index : -1;
    if (sourceIndex < 0) {
      sourceIndex = source.findIndex(
        (entry, candidateIndex) => entry?.[idField] === selectedId
          && !used.has(candidateIndex) && !reserved.has(candidateIndex),
      );
    }
    if (sourceIndex >= 0) {
      used.add(sourceIndex);
      return source[sourceIndex];
    }
    return {
      instanceId: `${instancePrefix}-${index}-${selectedId}`,
      [idField]: selectedId,
    };
  });
}

function reconcileTalentSelections(talents, selectedIds) {
  const ids = Array.isArray(selectedIds) ? selectedIds.map(stringOrNull).filter(Boolean) : [];
  const remaining = [...ids];
  const boards = talents.boards.map((board) => ({
    ...board,
    selectedNodeIds: (Array.isArray(board.selectedNodeIds) ? board.selectedNodeIds : []).filter((nodeId) => {
      const desiredIndex = remaining.indexOf(nodeId);
      if (desiredIndex < 0) return false;
      remaining.splice(desiredIndex, 1);
      return true;
    }),
  }));
  let targetBoardIndex = boards.findLastIndex((board) => board.selectedNodeIds.length > 0);
  for (const nodeId of remaining) {
    const startIndex = Math.max(0, targetBoardIndex);
    let boardIndex = boards.findIndex(
      (board, index) => index >= startIndex && board.selectedNodeIds.length < 3,
    );
    if (boardIndex < 0) boardIndex = boards.findIndex((board) => board.selectedNodeIds.length < 3);
    if (boardIndex < 0) break;
    boards[boardIndex] = {
      ...boards[boardIndex],
      selectedNodeIds: [...boards[boardIndex].selectedNodeIds, nodeId],
    };
    targetBoardIndex = boardIndex;
  }
  return {
    ...talents,
    boards,
  };
}

function slateIdForCell(board, cell) {
  if (cell?.slateId) return cell.slateId;
  return board?.slateInventory?.find((slate) => slate?.instanceId === cell?.slateInstanceId)?.slateId ?? null;
}

function reconcileDivinitySelections(divinity, selectedIds) {
  const ids = Array.isArray(selectedIds) ? selectedIds.map(stringOrNull) : [];
  if (!divinity.boards.length) {
    const boards = legacyDivinityBoards(ids);
    return { boards, activeBoardId: boards[0]?.boardId ?? null };
  }

  const activeIndex = Math.max(
    0,
    divinity.boards.findIndex((board) => board.boardId === divinity.activeBoardId),
  );
  const activeBoard = divinity.boards[activeIndex];
  if (Array.isArray(activeBoard.slateInventory)) return divinity;
  const used = new Set();
  const cells = ids.map((slateId, index) => {
    if (!slateId) return null;
    let cellIndex = slateIdForCell(activeBoard, activeBoard.cells?.[index]) === slateId && !used.has(index)
      ? index
      : -1;
    if (cellIndex < 0) {
      cellIndex = activeBoard.cells?.findIndex(
        (cell, candidateIndex) => slateIdForCell(activeBoard, cell) === slateId && !used.has(candidateIndex),
      ) ?? -1;
    }
    if (cellIndex >= 0) {
      used.add(cellIndex);
      return activeBoard.cells[cellIndex];
    }
    return { slateId, rotation: 0 };
  });
  const boards = [...divinity.boards];
  boards[activeIndex] = { ...activeBoard, cells };
  return { ...divinity, boards };
}

function reconcilePactSelections(pact, selections, changedCategories) {
  let slots = pact.slots;
  let legacyUnassigned = pact.legacyUnassigned;
  if (changedCategories.has("spirits")) {
    const spirits = reconcileInstanceSlots(
      slots.map((slot) => slot.spirit),
      selections.spirits,
      "spiritId",
      "compat-spirit",
    );
    slots = slots.map((slot, index) => {
      const spirit = spirits[index];
      if (slot.spirit?.spiritId === spirit?.spiritId) return { ...slot, spirit };
      return { ...emptyPactSlot(slot.slotId), spirit };
    });
  }
  if (changedCategories.has("destiny") && !selections.destiny?.some(Boolean)) {
    slots = slots.map((slot) => ({
      ...emptyPactSlot(slot.slotId),
      spirit: slot.spirit,
    }));
    legacyUnassigned = undefined;
  } else if (changedCategories.has("destiny") && !derivePactDestinySelections(pact).some(Boolean)) {
    const existing = legacyUnassigned ?? {
      smallSlots: Array(9).fill(null),
      mediumSlots: Array(4).fill(null),
      undetermined: Array(5).fill(null),
    };
    legacyUnassigned = {
      ...existing,
      smallSlots: reconcileInstanceSlots(
        existing.smallSlots,
        selections.destiny?.slice(0, 9),
        "destinyId",
        "compat-destiny-small",
      ),
      mediumSlots: reconcileInstanceSlots(
        existing.mediumSlots,
        selections.destiny?.slice(9, 13),
        "destinyId",
        "compat-destiny-medium",
      ),
    };
  }
  const next = { ...pact, slots };
  if (legacyUnassigned) next.legacyUnassigned = legacyUnassigned;
  else delete next.legacyUnassigned;
  return next;
}

function reconcileNestedSelections(input, document) {
  const derived = deriveCompatibilitySelections({}, document);
  const changedCategories = new Set(
    NESTED_SELECTION_CATEGORIES.filter((categoryId) =>
      selectionChangedSinceProjection(input, derived, categoryId),
    ),
  );
  if (!changedCategories.size) return document;

  const selections = normalizeSelections(input?.selections);
  return {
    ...document,
    gear: changedCategories.has("gear")
      ? {
          ...document.gear,
          slots: reconcileInstanceSlots(document.gear.slots, selections.gear, "itemId", "compat-gear"),
        }
      : document.gear,
    talents: changedCategories.has("talents")
      ? reconcileTalentSelections(document.talents, selections.talents)
      : document.talents,
    divinity: changedCategories.has("slates")
      ? reconcileDivinitySelections(document.divinity, selections.slates)
      : document.divinity,
    pact: reconcilePactSelections(document.pact, selections, changedCategories),
  };
}

function deriveGearCompatibility(existing, slots, field, fallback) {
  const result = isPlainObject(existing) ? cloneJson(existing, {}) : {};
  for (const slot of slots) {
    if (!slot?.itemId || slot[field] === undefined) continue;
    result[slot.itemId] = cloneJson(slot[field], fallback);
  }
  return result;
}

function sameJsonValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((entry, index) => sameJsonValue(entry, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index] && sameJsonValue(left[key], right[key]),
    );
}

function reconcileGearCompatibility(input, gear) {
  const compatibilityFields = [
    ["gearAffixes", "affixText", ""],
    ["gearRolls", "rolls", {}],
    ["gearCrafts", "crafts", {}],
    ["gearCorruptions", "corrupted", false],
  ];
  let slots = gear.slots;

  for (const [mapField, slotField, fallback] of compatibilityFields) {
    const incoming = input?.[mapField];
    if (!isPlainObject(incoming)) continue;
    const projected = deriveGearCompatibility({}, slots, slotField, fallback);
    slots = slots.map((slot) => {
      if (!slot?.itemId || !Object.hasOwn(incoming, slot.itemId)) return slot;
      const value = cloneJson(incoming[slot.itemId], fallback);
      if (sameJsonValue(value, projected[slot.itemId])) return slot;
      return { ...slot, [slotField]: value };
    });
  }

  const incomingLegendaryDrafts = normalizeLegendaryDraftMap(input?.gearLegendaryDrafts);
  if (Object.keys(incomingLegendaryDrafts).length) {
    const projectedLegendaryDrafts = deriveLegendaryDraftCompatibility({}, slots);
    slots = slots.map((slot) => {
      if (!slot?.itemId || !Object.hasOwn(incomingLegendaryDrafts, slot.itemId)) return slot;
      const value = incomingLegendaryDrafts[slot.itemId];
      if (sameJsonValue(value, projectedLegendaryDrafts[slot.itemId])) return slot;
      return { ...slot, legendaryDraft: normalizeLegendaryDraft(value) };
    });
  }

  return { ...gear, slots };
}

function deriveLegendaryDraftCompatibility(existing, slots) {
  const result = {};
  for (const slot of slots) {
    if (!slot?.itemId || !slot.legendaryDraft) continue;
    const draft = normalizeLegendaryDraft(slot.legendaryDraft);
    if (draft) result[slot.itemId] = draft;
  }
  return { ...result, ...normalizeLegendaryDraftMap(existing) };
}

function emptySkillSlot(role) {
  return {
    skillId: null,
    level: 0,
    unlockedSupportCount: role === "active" ? 1 : 0,
    supports: Array(5).fill(null),
    sealedLife: 0,
    sealedMana: 0,
  };
}

function emptyTalentBoard() {
  return {
    boardId: null,
    treeSlug: null,
    nodePoints: {},
    reflectedNodePoints: {},
    selectedNodeIds: [],
    coreTalentIds: [],
    prismSlots: [],
    inverseImageSlots: [],
  };
}

export function createBuildDocument(locale = "ko") {
  const now = new Date().toISOString();
  return {
    schemaVersion: BUILD_DOCUMENT_SCHEMA_VERSION,
    id: `build-${Date.now()}`,
    name: locale === "en" ? "New Build" : "새 빌드",
    updatedAt: now,
    patchSnapshot: {},
    customAffixes: "",
    research: { season: "", sources: [], notes: "" },
    heroLevel: 90,
    skillLevels: [],
    skillSeals: { life: 0, mana: 0 },
    gearAffixes: {},
    gearRolls: {},
    gearCrafts: {},
    gearCorruptions: {},
    gearLegendaryDrafts: {},
    selections: {},
    selectionProjection: {},
    hero: {
      branchId: null,
      level: 90,
      traitSelections: [],
      memories: [],
      revivalMemory: null,
    },
    skills: {
      active: Array.from({ length: 5 }, () => emptySkillSlot("active")),
      passive: Array.from({ length: 4 }, () => emptySkillSlot("passive")),
      energyMax: 525,
      elixir: null,
      elixirs: [null, null],
    },
    gear: {
      slots: Array(10).fill(null),
      inventory: [],
    },
    talents: {
      boards: Array.from({ length: 4 }, emptyTalentBoard),
      prismInventory: [],
      inverseImageInventory: [],
      placedPrism: null,
      placedInverseImage: null,
    },
    divinity: {
      boards: [],
      activeBoardId: null,
    },
    pact: {
      topologyVersion: PACT_TOPOLOGY_VERSION,
      slots: PACT_SPIRIT_SLOT_IDS.map(emptyPactSlot),
    },
    conditions: {},
    calculation: {},
  };
}

function normalizeLegacyBuildDocument(input) {
  const fallback = createBuildDocument();
  const selections = normalizeSelections(input?.selections);
  const heroLevel = Math.max(1, Math.min(100, Math.round(finiteNumber(input?.heroLevel, 90))));
  const skillLevels = Array.isArray(input?.skillLevels)
    ? input.skillLevels.slice(0, 9).map((level) => finiteNumber(level))
    : [];

  return {
    ...fallback,
    id: typeof input?.id === "string" && input.id ? input.id : fallback.id,
    name: typeof input?.name === "string" && input.name.trim() ? input.name.trim() : fallback.name,
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : fallback.updatedAt,
    patchSnapshot: cloneJson(input?.patchSnapshot, {}),
    customAffixes: typeof input?.customAffixes === "string" ? input.customAffixes : "",
    research: normalizeResearch(input?.research),
    heroLevel,
    skillLevels,
    skillSeals: {
      life: finiteNumber(input?.skillSeals?.life),
      mana: finiteNumber(input?.skillSeals?.mana),
    },
    gearAffixes: cloneJson(input?.gearAffixes, {}),
    gearRolls: cloneJson(input?.gearRolls, {}),
    gearCrafts: cloneJson(input?.gearCrafts, {}),
    gearCorruptions: cloneJson(input?.gearCorruptions, {}),
    gearLegendaryDrafts: normalizeLegendaryDraftMap(input?.gearLegendaryDrafts),
    selections,
    selectionProjection: cloneJson(selections, {}),
    hero: {
      branchId: stringOrNull(selections.hero?.[0]),
      level: heroLevel,
      traitSelections: [],
      memories: Array.isArray(selections.heroMemory)
        ? selections.heroMemory.map(legacyMemory)
        : [],
      revivalMemory: null,
    },
    skills: {
      active: Array.from({ length: 5 }, (_, index) => legacySkillSlot(selections, skillLevels, index, "active")),
      passive: Array.from({ length: 4 }, (_, index) => legacySkillSlot(selections, skillLevels, index + 5, "passive")),
      energyMax: 525,
      elixir: null,
      elixirs: [null, null],
    },
    gear: {
      slots: Array.from({ length: 10 }, (_, index) => legacyGearSlot(input, index)),
      inventory: [],
    },
    talents: {
      boards: legacyTalentBoards(selections.talents),
      prismInventory: [],
      inverseImageInventory: [],
      placedPrism: null,
      placedInverseImage: null,
    },
    divinity: {
      boards: legacyDivinityBoards(selections.slates),
      activeBoardId: selections.slates?.some(Boolean) ? "legacy-divinity-0" : null,
    },
    pact: legacyPact(selections),
    conditions: {},
    calculation: {},
  };
}

function normalizeCurrentBuildDocument(input) {
  const fallback = createBuildDocument();
  const hero = normalizeCurrentHero(input?.hero);
  const skills = normalizeCurrentSkills(input?.skills);
  const initialNestedDocument = {
    hero,
    skills,
    gear: normalizeCurrentGear(input?.gear),
    talents: normalizeCurrentTalents(input?.talents),
    divinity: normalizeCurrentDivinity(input?.divinity),
    pact: normalizeCurrentPact(input?.pact),
  };
  const reconciledNestedDocument = reconcileNestedSelections(input, initialNestedDocument);
  const nestedDocument = {
    ...reconciledNestedDocument,
    gear: reconcileGearCompatibility(input, reconciledNestedDocument.gear),
  };
  const { gear, talents, divinity, pact } = nestedDocument;
  const skillSlots = [...skills.active, ...skills.passive];
  const skillLevels = skillSlots.map((slot) => slot.level);
  const sealedLife = skillSlots.reduce((total, slot) => total + slot.sealedLife, 0);
  const sealedMana = skillSlots.reduce((total, slot) => total + slot.sealedMana, 0);

  const selections = deriveCompatibilitySelections(input?.selections, nestedDocument);

  return {
    ...fallback,
    schemaVersion: BUILD_DOCUMENT_SCHEMA_VERSION,
    id: typeof input?.id === "string" && input.id ? input.id : fallback.id,
    name: typeof input?.name === "string" && input.name.trim() ? input.name.trim() : fallback.name,
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : fallback.updatedAt,
    patchSnapshot: cloneJson(input?.patchSnapshot, {}),
    customAffixes: typeof input?.customAffixes === "string" ? input.customAffixes : "",
    research: normalizeResearch(input?.research),
    heroLevel: hero.level,
    skillLevels: skillLevels.some(Boolean)
      ? skillLevels
      : Array.isArray(input?.skillLevels)
        ? cloneJson(input.skillLevels, [])
        : skillLevels,
    skillSeals:
      sealedLife || sealedMana
        ? { life: sealedLife, mana: sealedMana }
        : {
            life: finiteNumber(input?.skillSeals?.life),
            mana: finiteNumber(input?.skillSeals?.mana),
          },
    gearAffixes: deriveGearCompatibility(input?.gearAffixes, gear.slots, "affixText", ""),
    gearRolls: deriveGearCompatibility(input?.gearRolls, gear.slots, "rolls", {}),
    gearCrafts: deriveGearCompatibility(input?.gearCrafts, gear.slots, "crafts", {}),
    gearCorruptions: deriveGearCompatibility(input?.gearCorruptions, gear.slots, "corrupted", false),
    gearLegendaryDrafts: deriveLegendaryDraftCompatibility(input?.gearLegendaryDrafts, gear.slots),
    selections,
    selectionProjection: cloneJson(selections, {}),
    ...nestedDocument,
    conditions: isPlainObject(input?.conditions) ? cloneJson(input.conditions, {}) : {},
    calculation: isPlainObject(input?.calculation) ? cloneJson(input.calculation, {}) : {},
  };
}

export function normalizeBuildDocument(input) {
  const version = Number(input?.schemaVersion);
  if (Number.isFinite(version) && version > BUILD_DOCUMENT_SCHEMA_VERSION) {
    throw new RangeError(`Unsupported BD schema version: ${version}`);
  }
  return version === BUILD_DOCUMENT_SCHEMA_VERSION
    ? normalizeCurrentBuildDocument(input)
    : normalizeLegacyBuildDocument(input);
}

export function cloneBuildDocument(input) {
  return normalizeBuildDocument(input);
}

export function serializeBuildDocument(input) {
  return JSON.stringify(normalizeBuildDocument(input), null, 2);
}

export function deserializeBuildDocument(text) {
  return normalizeBuildDocument(JSON.parse(text));
}
