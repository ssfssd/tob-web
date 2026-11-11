function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const DIVINITY_BOARD_MASK = Object.freeze([
  Object.freeze([0, 0, 1, 1, 0, 0]),
  Object.freeze([0, 1, 1, 1, 1, 0]),
  Object.freeze([1, 1, 1, 1, 1, 1]),
  Object.freeze([1, 1, 1, 1, 1, 1]),
  Object.freeze([0, 1, 1, 1, 1, 0]),
  Object.freeze([0, 0, 1, 1, 0, 0]),
]);

const SOURCE_SHAPES = {
  a_1: [[0, 0], [0, 1], [1, 1], [1, 2]],
  a_2: [[0, 0], [1, 0], [2, 0], [2, 1]],
  a_3: [[0, 0], [0, 1], [0, 2], [1, 1]],
  a_4: [[0, 0], [0, 1], [1, 0], [1, 1]],
  b_1: [[0, 0]],
  b_2: [[0, 0], [1, 0]],
  c: [[0, 0], [0, 1], [1, 0]],
  d_1: [[0, 0]],
  d_2: [[0, 0]],
  e: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  f: [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [2, 2]],
  residence_of_stars: [[0, 2], [1, 0], [1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 1]],
  hades_judgment_a: [[0, 0], [0, 3], [3, 3]],
  hades_judgment_line: [[0, 0], [0, 3]],
  hades_infusion_complete: [[0, 0], [1, 0], [2, 0]],
  hades_infusion_broken: [[0, 0], [1, 0]],
  hades_banishment_a: [[0, 2], [1, 1], [2, 0]],
  hades_banishment_b: [[0, 0], [1, 1], [2, 2]],
  hades_banishment_c: [[0, 2], [1, 1], [2, 0]],
  hades_banishment_d: [[0, 0], [1, 1], [2, 2]],
  // Historical local shapes remain readable in saved boards, but are not offered
  // by the current template catalog below.
  hades_judgment_b: [[0, 0], [2, 0], [2, 2]],
  hades_judgment_c: [[0, 2], [2, 0], [2, 2]],
  hades_judgment_d: [[0, 0], [0, 2], [2, 0]],
  hades_contamination: [[0, 0], [1, 0], [2, 0]],
  hades_banishment: [[0, 2], [1, 1], [2, 0]],
};

export const HADES_DIVINITY_SLATE_IDS = deepFreeze([
  "hades_judgment",
  "hades_contamination",
  "hades_banishment",
]);

export const HADES_DIVINITY_SHAPE_METADATA = deepFreeze({
  sourceRole: "current-91tob-public-runtime-structure",
  structureStatus: "verified-public-runtime",
  structureAuthority: true,
  sourceUrl: "https://91tob.com/assets/App-Bp8Ow0pk.js",
  sourceLastModified: "Wed, 12 Aug 2026 04:30:20 GMT",
  sourceByteLength: 2313502,
  sourceSha256: "9020c96d3f01f207b3c4019a435590da911a01527866fdd168520dfd4f860e23",
  grid: { rows: 6, columns: 6 },
  shapes: {
    hades_judgment_a: {
      type: "judgment",
      offspringCellOffsets: SOURCE_SHAPES.hades_judgment_a,
      connectorCellOffsets: [[0, 1], [0, 2], [1, 3], [2, 3]],
      fixedAnchor: { x: 1, y: 1 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2", "imprint_3"],
      sourceVariantId: "L",
    },
    hades_judgment_line: {
      type: "judgment",
      offspringCellOffsets: SOURCE_SHAPES.hades_judgment_line,
      connectorCellOffsets: [[0, 1], [0, 2]],
      fixedAnchor: { x: 1, y: 1 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2"],
      sourceVariantId: "LINE",
    },
    hades_infusion_complete: {
      type: "contamination",
      offspringCellOffsets: SOURCE_SHAPES.hades_infusion_complete,
      defaultAnchor: { x: 1, y: 3 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2", "imprint_3"],
      sourceVariantId: "COMPLETE",
    },
    hades_infusion_broken: {
      type: "contamination",
      offspringCellOffsets: SOURCE_SHAPES.hades_infusion_broken,
      defaultAnchor: { x: 1, y: 3 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2"],
      sourceVariantId: "BROKEN",
    },
    hades_banishment_a: {
      type: "banishment",
      offspringCellOffsets: SOURCE_SHAPES.hades_banishment_a,
      effectCellOffsets: [[0, 3], [1, 2], [2, 1], [3, 0]],
      fixedAnchor: { x: 0, y: 0 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2", "imprint_3"],
      sourceVariantId: "A",
    },
    hades_banishment_b: {
      type: "banishment",
      offspringCellOffsets: SOURCE_SHAPES.hades_banishment_b,
      effectCellOffsets: [[3, 2], [2, 1], [1, 0], [0, -1]],
      fixedAnchor: { x: 0, y: 3 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2", "imprint_3"],
      sourceVariantId: "B",
    },
    hades_banishment_c: {
      type: "banishment",
      offspringCellOffsets: SOURCE_SHAPES.hades_banishment_c,
      effectCellOffsets: [[2, -1], [1, 0], [0, 1], [-1, 2]],
      fixedAnchor: { x: 3, y: 3 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2", "imprint_3"],
      sourceVariantId: "C",
    },
    hades_banishment_d: {
      type: "banishment",
      offspringCellOffsets: SOURCE_SHAPES.hades_banishment_d,
      effectCellOffsets: [[-1, 0], [0, 1], [1, 2], [2, 3]],
      fixedAnchor: { x: 3, y: 0 },
      activeImprintSlotKeys: ["imprint_1", "imprint_2", "imprint_3"],
      sourceVariantId: "D",
    },
  },
});

export const DIVINITY_SHAPES = Object.freeze(Object.fromEntries(
  Object.entries(SOURCE_SHAPES).map(([shapeId, cells]) => [
    shapeId,
    Object.freeze(cells.map(([x, y]) => Object.freeze({ x, y }))),
  ]),
));

function shapeKey(shape) {
  return normalizedShape(shape).map(({ x, y }) => `${x}:${y}`).join("|");
}

export function isCurrentHadesShapeInstance(instance) {
  return Boolean(
    HADES_DIVINITY_SLATE_IDS.includes(instance?.slateId)
    && HADES_DIVINITY_SHAPE_METADATA.shapes[instance?.shapeId]
    && shapeKey(instance?.shape) === shapeKey(DIVINITY_SHAPES[instance.shapeId]),
  );
}

export function isFixedOrientationSlateInstance(instance) {
  return instance?.slateId === "residence_of_stars" || isCurrentHadesShapeInstance(instance);
}

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function normalizedRotation(value) {
  return ((integer(value) % 4) + 4) % 4;
}

function normalizedShape(shape) {
  const source = Array.isArray(shape) && shape.length ? shape : [{ x: 0, y: 0 }];
  const points = source.map((point) => ({
    x: integer(point?.x),
    y: integer(point?.y),
  }));
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const unique = new Map(
    points.map((point) => {
      const normalized = { x: point.x - minX, y: point.y - minY };
      return [`${normalized.x}:${normalized.y}`, normalized];
    }),
  );
  return [...unique.values()].sort((left, right) => left.x - right.x || left.y - right.y);
}

function findInstance(board, instanceId) {
  return board.slateInventory.find((instance) => instance.instanceId === instanceId);
}

function withInventoryInstance(board, instanceId, update) {
  return {
    ...board,
    slateInventory: board.slateInventory.map((instance) =>
      instance.instanceId === instanceId ? update(instance) : instance,
    ),
  };
}

export function rotatedShape(shape, rotation = 0) {
  let points = normalizedShape(shape);
  for (let turn = 0; turn < normalizedRotation(rotation); turn += 1) {
    points = normalizedShape(points.map((point) => ({ x: point.y, y: -point.x })));
  }
  return points;
}

export function transformedShape(shape, rotation = 0, flippedH = false, flippedV = false) {
  let points = rotatedShape(shape, rotation);
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  if (flippedH) points = normalizedShape(points.map((point) => ({ x: point.x, y: maxY - point.y })));
  if (flippedV) points = normalizedShape(points.map((point) => ({ x: maxX - point.x, y: point.y })));
  return points;
}

export function createDivinityBoard({ boardId, width = 6, height = 6 } = {}) {
  const normalizedWidth = integer(width, 6);
  const normalizedHeight = integer(height, 6);
  if (!boardId || typeof boardId !== "string") throw new TypeError("boardId is required");
  if (normalizedWidth < 1 || normalizedHeight < 1) throw new RangeError("board dimensions must be positive");
  return {
    boardId,
    width: normalizedWidth,
    height: normalizedHeight,
    mask: normalizedWidth === 6 && normalizedHeight === 6
      ? DIVINITY_BOARD_MASK.map((row) => [...row])
      : Array.from({ length: normalizedWidth }, () => Array.from({ length: normalizedHeight }, () => 1)),
    cells: [],
    slateInventory: [],
  };
}

export function createSlateInstance({
  instanceId,
  slateId,
  shapeId = "b_1",
  shape,
  rotation = 0,
  flippedH = false,
  flippedV = false,
  affixIds = [],
  slotSelectionsByKey = {},
  hadesAuthorityConfig = null,
  nether = null,
  regularFamily,
  createdOrder = 0,
  anchor = null,
} = {}) {
  if (!instanceId || typeof instanceId !== "string") throw new TypeError("instanceId is required");
  if (!slateId || typeof slateId !== "string") throw new TypeError("slateId is required");
  const resolvedShape = normalizedShape(shape ?? DIVINITY_SHAPES[shapeId] ?? DIVINITY_SHAPES.b_1);
  const fixedOrientation = isFixedOrientationSlateInstance({ slateId, shapeId, shape: resolvedShape });
  return {
    instanceId,
    slateId,
    shapeId: typeof shapeId === "string" && DIVINITY_SHAPES[shapeId] ? shapeId : "custom",
    shape: resolvedShape,
    rotation: fixedOrientation ? 0 : normalizedRotation(rotation),
    flippedH: fixedOrientation ? false : Boolean(flippedH),
    flippedV: fixedOrientation ? false : Boolean(flippedV),
    affixIds: Array.isArray(affixIds) ? affixIds.filter((id) => typeof id === "string" && id) : [],
    slotSelectionsByKey: slotSelectionsByKey && typeof slotSelectionsByKey === "object"
      ? cloneJson(slotSelectionsByKey)
      : {},
    ...(nether && typeof nether === 'object' && !Array.isArray(nether) ? { nether: cloneJson(nether) } : {}),
      ...(slateId === 'six_gods' && typeof regularFamily === 'string' && regularFamily ? { regularFamily } : {}),
    ...(hadesAuthorityConfig
      && typeof hadesAuthorityConfig === "object"
      && !Array.isArray(hadesAuthorityConfig)
      && Object.keys(hadesAuthorityConfig).length
      ? { hadesAuthorityConfig: cloneJson(hadesAuthorityConfig) }
      : {}),
    createdOrder: integer(createdOrder),
    anchor: anchor && Number.isFinite(Number(anchor.x)) && Number.isFinite(Number(anchor.y))
      ? { x: integer(anchor.x), y: integer(anchor.y) }
      : null,
  };
}

export function addSlateToInventory(board, slateInstance) {
  const instance = createSlateInstance(slateInstance);
  if (findInstance(board, instance.instanceId)) {
    throw new RangeError(`Duplicate slate instanceId: ${instance.instanceId}`);
  }
  if (
    HADES_DIVINITY_SLATE_IDS.includes(instance.slateId)
    && board.slateInventory.some((stored) => HADES_DIVINITY_SLATE_IDS.includes(stored.slateId))
  ) {
    throw new RangeError("Only one Hades divinity slate can be added to a board");
  }
  return {
    ...board,
    slateInventory: [...board.slateInventory, instance],
  };
}

export function getPlacedCells(board, instanceId) {
  return board.cells
    .filter((cell) => cell.slateInstanceId === instanceId)
    .map((cell) => ({ ...cell }))
    .sort((left, right) => left.x - right.x || left.y - right.y);
}

export function canPlaceSlate(board, instanceId, anchor) {
  const instance = findInstance(board, instanceId);
  if (!instance) return false;
  const x = integer(anchor?.x, Number.NaN);
  const y = integer(anchor?.y, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const currentHadesShape = isCurrentHadesShapeInstance(instance)
    ? HADES_DIVINITY_SHAPE_METADATA.shapes[instance.shapeId]
    : null;
  if (
    currentHadesShape
    && HADES_DIVINITY_SLATE_IDS.includes(instance.slateId)
    && (
      instance.rotation !== 0
      || instance.flippedH
      || instance.flippedV
      || (currentHadesShape.fixedAnchor
        && (x !== currentHadesShape.fixedAnchor.x || y !== currentHadesShape.fixedAnchor.y))
    )
  ) return false;
  const occupied = new Set(
    board.cells
      .filter((cell) => cell.slateInstanceId !== instanceId)
      .map((cell) => `${cell.x}:${cell.y}`),
  );
  return transformedShape(
    instance.shape,
    instance.rotation,
    instance.flippedH,
    instance.flippedV,
  ).every((point) => {
    const cellX = x + point.x;
    const cellY = y + point.y;
    return (
      cellX >= 0 &&
      cellY >= 0 &&
      cellX < board.width &&
      cellY < board.height &&
      !occupied.has(`${cellX}:${cellY}`)
    );
  });
}

export function placeSlate(board, instanceId, anchor) {
  if (!findInstance(board, instanceId)) throw new RangeError(`Unknown slate instanceId: ${instanceId}`);
  if (!canPlaceSlate(board, instanceId, anchor)) {
    throw new RangeError(`Slate ${instanceId} cannot be placed at ${anchor?.x},${anchor?.y}`);
  }
  const instance = findInstance(board, instanceId);
  const normalizedAnchor = { x: integer(anchor.x), y: integer(anchor.y) };
  const cells = transformedShape(
    instance.shape,
    instance.rotation,
    instance.flippedH,
    instance.flippedV,
  ).map((point) => ({
    x: normalizedAnchor.x + point.x,
    y: normalizedAnchor.y + point.y,
    slateInstanceId: instanceId,
  }));
  const withoutPrevious = board.cells.filter((cell) => cell.slateInstanceId !== instanceId);
  return withInventoryInstance(
    { ...board, cells: [...withoutPrevious, ...cells] },
    instanceId,
    (current) => ({ ...current, anchor: normalizedAnchor }),
  );
}

export function moveSlate(board, instanceId, anchor) {
  return placeSlate(board, instanceId, anchor);
}

function clampAnchor(board, instance, anchor) {
  const shape = transformedShape(instance.shape, instance.rotation, instance.flippedH, instance.flippedV);
  const rows = Math.max(...shape.map((point) => point.x)) + 1;
  const columns = Math.max(...shape.map((point) => point.y)) + 1;
  return {
    x: Math.min(Math.max(integer(anchor?.x), 0), Math.max(board.width - rows, 0)),
    y: Math.min(Math.max(integer(anchor?.y), 0), Math.max(board.height - columns, 0)),
  };
}

function orientPlacedSlate(board, instanceId, update) {
  const instance = findInstance(board, instanceId);
  if (!instance) throw new RangeError(`Unknown slate instanceId: ${instanceId}`);
  if (isFixedOrientationSlateInstance(instance)) {
    throw new RangeError(`Slate shape ${instance.shapeId} uses a fixed orientation`);
  }
  const candidate = withInventoryInstance(board, instanceId, update);
  const oriented = findInstance(candidate, instanceId);
  if (!instance.anchor) return candidate;
  const anchor = clampAnchor(candidate, oriented, instance.anchor);
  if (!canPlaceSlate(candidate, instanceId, anchor)) {
    throw new RangeError(`Slate ${instanceId} cannot change orientation at ${anchor.x},${anchor.y}`);
  }
  return placeSlate(candidate, instanceId, anchor);
}

export function rotatePlacedSlate(board, instanceId, turns = 1) {
  return orientPlacedSlate(board, instanceId, (current) => ({
    ...current,
    rotation: normalizedRotation(current.rotation + integer(turns, 1)),
  }));
}

export function flipPlacedSlateHorizontal(board, instanceId) {
  return orientPlacedSlate(board, instanceId, (current) => ({ ...current, flippedH: !current.flippedH }));
}

export function flipPlacedSlateVertical(board, instanceId) {
  return orientPlacedSlate(board, instanceId, (current) => ({ ...current, flippedV: !current.flippedV }));
}

function orientationKey(instance) {
  return transformedShape(instance.shape, instance.rotation, instance.flippedH, instance.flippedV)
    .map(({ x, y }) => `${x},${y}`)
    .sort()
    .join("|");
}

function placementFitsMask(board, instanceId, anchor) {
  if (!canPlaceSlate(board, instanceId, anchor)) return false;
  const instance = findInstance(board, instanceId);
  return transformedShape(instance.shape, instance.rotation, instance.flippedH, instance.flippedV)
    .every(({ x, y }) => board.mask?.[anchor.x + x]?.[anchor.y + y] === 1);
}

export function autoPlaceSlate(board, instanceId) {
  const instance = findInstance(board, instanceId);
  if (!instance) throw new RangeError(`Unknown slate instanceId: ${instanceId}`);
  const orientations = [];
  const seen = new Set();
  const candidates = isFixedOrientationSlateInstance(instance)
    ? [{ rotation: 0, flippedH: false, flippedV: false }]
    : [
      { rotation: instance.rotation, flippedH: instance.flippedH, flippedV: instance.flippedV },
      ...Array.from({ length: 4 }, (_, rotation) => [false, true].flatMap((flippedH) => (
        [false, true].map((flippedV) => ({ rotation, flippedH, flippedV }))
      ))).flat(),
    ];
  for (const orientation of candidates) {
    const oriented = { ...instance, ...orientation };
    const key = orientationKey(oriented);
    if (!seen.has(key)) {
      seen.add(key);
      orientations.push(orientation);
    }
  }

  for (const maskOnly of [true, false]) {
    for (const orientation of orientations) {
      const candidate = withInventoryInstance(board, instanceId, (current) => ({ ...current, ...orientation }));
      for (let x = 0; x < candidate.width; x += 1) {
        for (let y = 0; y < candidate.height; y += 1) {
          const anchor = { x, y };
          const valid = maskOnly
            ? placementFitsMask(candidate, instanceId, anchor)
            : canPlaceSlate(candidate, instanceId, anchor);
          if (valid) return placeSlate(candidate, instanceId, anchor);
        }
      }
    }
  }
  throw new RangeError(`No placement available for slate ${instanceId}`);
}

export function unplaceSlate(board, instanceId) {
  if (!findInstance(board, instanceId)) throw new RangeError(`Unknown slate instanceId: ${instanceId}`);
  return withInventoryInstance(
    {
      ...board,
      cells: board.cells.filter((cell) => cell.slateInstanceId !== instanceId),
    },
    instanceId,
    (current) => ({ ...current, anchor: null }),
  );
}

export function deleteSlateInstance(board, instanceId) {
  return {
    ...board,
    cells: board.cells.filter((cell) => cell.slateInstanceId !== instanceId),
    slateInventory: board.slateInventory.filter((instance) => instance.instanceId !== instanceId),
  };
}

export function clearDivinityBoard(board) {
  return {
    ...board,
    cells: [],
    slateInventory: board.slateInventory.map((instance) => ({ ...instance, anchor: null })),
  };
}

export function exportDivinityBoard(board) {
  return JSON.stringify(board);
}

export function importDivinityBoard(serialized, knownSlateIds) {
  const input = typeof serialized === "string" ? JSON.parse(serialized) : cloneJson(serialized);
  let board = createDivinityBoard({
    boardId: input?.boardId,
    width: input?.width,
    height: input?.height,
  });
  for (const rawInstance of input?.slateInventory ?? []) {
    const instance = createSlateInstance(rawInstance);
    if (knownSlateIds instanceof Set && !knownSlateIds.has(instance.slateId)) {
      throw new RangeError(`Unknown slateId: ${instance.slateId}`);
    }
    board = addSlateToInventory(board, { ...instance, anchor: null });
    if (rawInstance?.anchor) board = placeSlate(board, instance.instanceId, rawInstance.anchor);
  }
  return board;
}
